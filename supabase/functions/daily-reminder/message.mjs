// Builds the push text for the daily reminder. Plain ESM with no dependencies, so the Edge Function (Deno) and the
// Playwright tests (Node) use the same code. `d` is the user's synced app state (progress row).
export const BACKLOG_CAP = 50, BACKLOG_PAUSE = 60;
const TITLE = 'ศัพท์ต้องรู้ 📚';
const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// kind 'main' = the reminder at the user's chosen hour; 'late' = a second one at 21:00 local, only when a streak
// of 3+ days has no 🧊 and nothing was studied today. Returns null when nothing should be sent.
export function buildMessage(d, date, kind, now = Date.now()) {
  d = d || {};
  if (d.hist?.[date]) return null; // already studied today
  const streak = d.streak?.count ?? 0, freeze = d.freeze ?? 0;
  const dueEntries = Object.entries(d.prog ?? {}).filter(([, p]) => p && p.d <= now).sort((a, b) => a[1].d - b[1].d);
  const due = dueEntries.length;
  if (kind === 'late') {
    // streak.last must be yesterday: the streak is only at risk when today is still open
    if (streak < 3 || freeze > 0) return null;
    return { title: TITLE, body: `🔥 สตรีค ${streak} วันกำลังจะขาด! ทำแค่ 5 ใบก็รักษาไว้ได้`, due, url: '' };
  }
  const gentle = d.settings?.gentle !== false, k = hash(date + (d.nick ?? '')) % 3;
  const tail = streak ? ` · รักษาสตรีค 🔥 ${streak} วันไว้นะ` : '';
  let body;
  if (gentle && due > BACKLOG_PAUSE) body = `มีการ์ดรอทวน ${due} ใบ วันนี้ทวนแค่ ${BACKLOG_CAP} ใบก็พอ ไม่ต้องรีบนะ 💛`;
  else if (!due) body = streak ? `มาเรียนคำใหม่สักนิดนะ · รักษาสตรีค 🔥 ${streak} วันไว้` : 'มาเรียนคำใหม่สักนิดนะ ✨';
  else if (k === 1) body = `ใช้เวลาแค่ ~${Math.max(1, Math.ceil(due / 4))} นาที ก็ทบทวน ${due} ใบได้ครบ ⏱️${tail}`;
  else if (k === 2) body = `ทบทวนคำ “${dueEntries[0][0]}” ได้ไหม? ยังมีการ์ดรออีก ${due} ใบ ✨`;
  else body = `วันนี้มีการ์ดรอทบทวน ${due} ใบ${tail}`;
  return { title: TITLE, body, due, url: '' };
}
