'use strict';
// Optional Supabase sync, login, leaderboard and Web Push.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- cloud sync (Supabase, optional) ---------- */
// Signs in with a 6-digit email code (works inside the home-screen app, unlike magic links, which
// open Safari). Progress is one JSON row per user in table `progress`, protected by row-level
// security. Sync = pull → mergeBackup() (keeps whichever side is further ahead) → push.
const SYNC = Object.assign({ url: '', anonKey: '', requireLogin: false, vapidPublicKey: '', leaderboard: true }, window.SYNC_CONFIG || {});
const syncOn = () => !!(SYNC.url && SYNC.anonKey);
const AUTH_KEY = 'o3k.auth';
let auth = null;
try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { /* ignore */ }
const setAuth = (a) => { auth = a; try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } };
let syncState = { busy: false, last: 0, error: '', remoteAt: -1, pushed: '' };

async function sbFetch(path, opts = {}, retry = true) {
  const headers = { apikey: SYNC.anonKey, 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (auth && auth.access_token && !opts.noAuth) headers.Authorization = 'Bearer ' + auth.access_token;
  const res = await fetch(SYNC.url.replace(/\/$/, '') + path, { ...opts, headers });
  if (res.status === 401 && retry && auth && auth.refresh_token && !opts.noAuth) {
    if (await refreshAuth()) return sbFetch(path, opts, false);
  }
  return res;
}
async function refreshAuth() {
  try {
    const r = await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', noAuth: true, body: JSON.stringify({ refresh_token: auth.refresh_token }) }, false);
    // Only a refused token ends the login; a server hiccup (5xx, no network) keeps it so the next try can still work.
    if (!r.ok) { if (r.status === 400 || r.status === 401 || r.status === 403) setAuth(null); return false; }
    const j = await r.json(); setAuth({ ...auth, ...j }); return true;
  } catch (e) { return false; }
}
async function sendCode(email) {
  // create_user:false → only people already invited in the Supabase dashboard can sign in.
  const r = await sbFetch('/auth/v1/otp', { method: 'POST', noAuth: true, body: JSON.stringify({ email, create_user: false }) });
  if (!r.ok) throw new Error(r.status === 422 || r.status === 400 ? 'อีเมลนี้ยังไม่ได้รับเชิญ' : 'ส่งรหัสไม่สำเร็จ (' + r.status + ')');
}
async function verifyCode(email, token) {
  const r = await sbFetch('/auth/v1/verify', { method: 'POST', noAuth: true, body: JSON.stringify({ type: 'email', email, token }) });
  if (!r.ok) throw new Error('รหัสไม่ถูกต้องหรือหมดอายุ');
  const j = await r.json();
  setAuth({ access_token: j.access_token, refresh_token: j.refresh_token, user: { id: j.user.id, email: j.user.email } });
}
let pushTimer = null, pulling = false;
// While the app is in use, changes go to the cloud at most once per PUSH_EVERY ms (the first change starts the clock; later ones
// ride along). Leaving the app syncs at once (boot.js). Before 1.106.1 every answer re-uploaded the whole state ~4 s later.
const PUSH_EVERY = 30000;
function schedulePush() {
  if (!syncOn() || !auth || pulling || pushTimer) return;
  pushTimer = setTimeout(() => syncNow(), PUSH_EVERY);
}
const pushNow = () => { clearTimeout(pushTimer); pushTimer = null; return syncNow(); };
// What the cloud row held after our last round: its updated_at (ms) and the exact state text we sent. A round that finds the row
// untouched (same updated_at) downloads nothing, and one with nothing new to say uploads nothing.
async function syncNow(manual, overwrite) {
  if (!syncOn() || !auth || syncState.busy) return false;
  syncState.busy = true; syncState.error = '';
  clearTimeout(pushTimer); pushTimer = null;
  try {
    const uid = auth.user.id, q = encodeURIComponent(uid);
    const r = await sbFetch(`/rest/v1/progress?select=updated_at&user_id=eq.${q}`);
    if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ (' + r.status + ')');
    const head = (await r.json())[0], remoteAt = head && head.updated_at ? Date.parse(head.updated_at) : 0;
    let pulled = false;
    if (!overwrite && head && remoteAt !== syncState.remoteAt) { // someone else (or an older session) wrote: fetch and merge it
      const d = await sbFetch(`/rest/v1/progress?select=data&user_id=eq.${q}`);
      if (!d.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ (' + d.status + ')');
      const row = (await d.json())[0];
      if (row && row.data) { pulling = true; try { mergeBackup(row.data); } finally { pulling = false; } pulled = true; }
    }
    flushSave(); // the merge (or the last answers) must be in S before it is compared and sent
    const dataStr = JSON.stringify(S);
    if (overwrite || !head || dataStr !== syncState.pushed) {
      const at = new Date().toISOString();
      const w = await sbFetch('/rest/v1/progress', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: `{"user_id":${JSON.stringify(uid)},"data":${dataStr},"updated_at":${JSON.stringify(at)}}`,
      });
      if (!w.ok) throw new Error('บันทึกขึ้นคลาวด์ไม่สำเร็จ (' + w.status + ')');
      syncState.remoteAt = Date.parse(at); syncState.pushed = dataStr;
    } else if (pulled) syncState.remoteAt = remoteAt;
    syncState.last = Date.now();
    if (SYNC.leaderboard) pushBoard().catch(() => {});
    if (manual) toast('☁️ ซิงก์เรียบร้อย');
    return true;
  } catch (e) {
    syncState.error = e.message || 'ซิงก์ไม่สำเร็จ';
    if (manual) toast('⚠️ ' + syncState.error);
    return false;
  } finally { syncState.busy = false; }
}
// Friends leaderboard: one public-to-members row per user (see SYNC-SETUP.md for the table).
// Everyone in the group sees this name, so without a nickname it is a neutral label, not the start of the email address (1.106.1).
const boardDefault = () => 'ผู้เรียน ' + ((auth && auth.user && auth.user.id) || '').replace(/-/g, '').slice(0, 4);
const boardName = () => S.nick || boardDefault();
async function pushBoard() {
  const sn = S.snap[today()] || [0, 0, 0, 0];
  await sbFetch('/rest/v1/leaderboard', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: auth.user.id, name: boardName(), xp: S.xp || 0, week: mondayKey(), week_xp: S.xpWeek[mondayKey()] || 0,
      streak: streakNow(), mastered: sn[3], updated_at: new Date().toISOString() }),
  });
}
async function loadBoard() {
  const r = await sbFetch(`/rest/v1/leaderboard?select=user_id,name,week,week_xp,xp,streak,mastered&order=xp.desc&limit=50`);
  if (!r.ok) throw new Error(r.status);
  const wk = mondayKey();
  return (await r.json()).map((x) => ({ ...x, week_xp: x.week === wk ? x.week_xp : 0 })).sort((a, b) => b.week_xp - a.week_xp || b.xp - a.xp);
}
function boardSection() {
  if (!syncOn() || !auth || !SYNC.leaderboard) return '';
  setTimeout(async () => {
    const el = $('#board'); if (!el) return;
    try {
      const rows = await loadBoard();
      el.innerHTML = rows.length < 2 ? '<p class="small muted" style="margin:0">ยังมีแค่คุณคนเดียว เชิญเพื่อนผ่าน Supabase (Authentication → Users) แล้วมาแข่งกัน!</p>'
        : rows.map((x, k) => `<div class="lb-row ${x.user_id === auth.user.id ? 'me' : ''}"><span class="lb-n">${['🥇', '🥈', '🥉'][k] || k + 1}</span>
          <span class="grow"><b>${esc(x.name || 'ไม่มีชื่อ')}</b><br><span class="small muted">🔥 ${x.streak} · 🟢 ${x.mastered} คำ · รวม ${x.xp} XP</span></span><b>${x.week_xp} XP</b></div>`).join('');
    } catch (e) { el.innerHTML = '<p class="small muted" style="margin:0">โหลดอันดับไม่สำเร็จ (ตั้งค่าตาราง leaderboard แล้วหรือยัง?)</p>'; }
  }, 0);
  return `<div class="h2">🏆 อันดับเพื่อนสัปดาห์นี้</div><div class="card-box" id="board"><p class="small muted" style="margin:0">กำลังโหลด…</p></div>`;
}

// Web Push (iOS 16.4+ home-screen app): the subscription is stored in Supabase and a scheduled
// Edge Function (supabase/functions/daily-reminder) sends the daily reminder.
const canPush = () => syncOn() && !!SYNC.vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64u = (s) => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };
async function pushSub() { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
async function savePushSub(sub) {
  const j = sub.toJSON();
  const r = await sbFetch('/rest/v1/push_subs', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ endpoint: j.endpoint, user_id: auth.user.id, sub: j, remind: S.remind, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error('บันทึกการแจ้งเตือนไม่สำเร็จ (' + r.status + ')');
}
async function enablePush() {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(SYNC.vapidPublicKey) });
  await savePushSub(sub);
}
async function disablePush() {
  const sub = await pushSub(); if (!sub) return;
  await sbFetch('/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(sub.endpoint), { method: 'DELETE' }).catch(() => {});
  await sub.unsubscribe();
}

// Login screen (also used as the lock screen when requireLogin is on).
function renderLogin(locked) {
  document.body.classList.toggle('locked', !!locked);
  view.innerHTML = `<div class="card-box center pop" style="margin-top:20px">
      <div class="result-emoji">☁️</div>
      <div class="h2">${locked ? 'เข้าสู่ระบบเพื่อใช้งาน' : 'เข้าสู่ระบบเพื่อซิงก์'}</div>
      <p class="small muted">ใช้อีเมลที่ได้รับเชิญ แอปจะส่งรหัส 6 หลักไปทางอีเมล</p>
      <form id="lf" autocomplete="on">
        <input class="spell-input" id="em" type="email" inputmode="email" autocomplete="email" placeholder="อีเมล" value="${esc((auth && auth.user && auth.user.email) || '')}">
        <button class="btn primary block" style="margin-top:10px" id="lsend">ส่งรหัสไปที่อีเมล</button>
      </form>
      <form id="cf" hidden>
        <input class="spell-input" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="รหัสจากอีเมล">
        <button class="btn primary block" style="margin-top:10px">ยืนยัน</button>
      </form>
      <p class="small" id="lmsg" style="min-height:1.5em"></p>
      ${locked ? '' : '<button class="btn ghost block" id="lback">‹ กลับ</button>'}
    </div>`;
  const msg = (t) => ($('#lmsg').textContent = t);
  let email = '';
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); email = $('#em').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return msg('กรอกอีเมลให้ถูกต้องก่อนนะ');
    msg('กำลังส่งรหัส…');
    try { await sendCode(email); $('#cf').hidden = false; $('#code').focus(); msg('ส่งรหัสแล้ว เช็คอีเมล (รวมถึงในโฟลเดอร์สแปม)'); } catch (err) { msg('⚠️ ' + err.message); }
  };
  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); msg('กำลังตรวจรหัส…');
    try {
      await verifyCode(email, $('#code').value.trim());
      document.body.classList.remove('locked');
      msg('เข้าสู่ระบบแล้ว กำลังซิงก์…');
      await syncNow(true);
      go(locked ? (['home', 'feed', 'cards'].includes(S.settings.start) ? S.settings.start : 'home') : 'settings');
    } catch (err) { msg('⚠️ ' + err.message); }
  };
  if (!locked) $('#lback').onclick = () => go('settings');
}
const mustLogin = () => syncOn() && SYNC.requireLogin && !auth;
