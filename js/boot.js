'use strict';
// Start-up: first route, service worker, sync and badge. Loaded last.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- boot ---------- */
if (!S.chistFrom) S.chistFrom = today();
actEvent('open');
go(['home', 'feed', 'cards'].includes(S.settings.start) ? S.settings.start : 'home');
// Ask the browser not to evict our localStorage under storage pressure / inactivity.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
// New-version banner: sw.js skips waiting, so when a new worker takes over a page that already had one,
// this page is still running the old code -> offer a reload. Also re-check for a new sw.js regularly.
function showUpdate() {
  if ($('#updBar')) return;
  const b = document.createElement('div');
  b.id = 'updBar'; b.className = 'upd-bar'; b.setAttribute('role', 'status');
  b.innerHTML = '<span>มีเวอร์ชันใหม่พร้อมใช้งาน</span><button class="btn primary" data-upd="go">โหลดใหม่</button><button class="upd-x" data-upd="x" aria-label="ปิด">✕</button>';
  b.onclick = (e) => {
    const a = e.target.dataset.upd;
    if (a === 'go') location.reload();
    else if (a === 'x') b.remove();
  };
  document.body.appendChild(b);
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 15 * 60 * 1000);
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW) showUpdate(); });
}
setTimeout(whatsNew, 600);
netBadge(); // 📴 in the top bar when the app starts offline (1.148)
onboard(); // first-run welcome (js/onboard.js), only on a brand-new device
if (loadRescued) setTimeout(() => toast('⚠️ อ่านข้อมูลเดิมในเครื่องไม่ได้ เก็บสำเนาไว้ให้แล้ว (ถ้าเปิดซิงก์ไว้ ข้อมูลจากคลาวด์จะกลับมา) · ติดต่อผู้ดูแลก่อนล้างข้อมูลแอปนะคะ'), 1500);
setTimeout(() => loadEmoji().catch(() => {}), 900); // so the picture is ready on the first flashcard / word sheet
if (syncOn() && auth) syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
document.addEventListener('visibilitychange', () => {
  if (!syncOn() || !auth) return;
  if (document.hidden) pushNow(); else syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
});
// Refresh counts when returning to the app after a while (e.g. next day).
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.settings.palAuto) applyTheme(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'home') renderHome(); });
if (S.settings.palAuto) applyTheme(); // app.js ran before scene.js existed
document.addEventListener('visibilitychange', updateBadge);
updateBadge();
/* ---------- keyboard shortcuts (computer / iPad keyboard) ---------- */
// 1–9 = answer choices (or the flashcard grade buttons once flipped), Space/Enter = flip the card or go to the next question.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || view.classList.contains('feed-mode')) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (document.querySelector('.sheet-wrap.open')) return;
  const on = (el) => el && !el.disabled && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  const own = !e.target.closest || !e.target.closest('button, a') || e.target.closest('.opt, [data-g]');
  if (/^[1-9]$/.test(e.key)) {
    const opts = [...view.querySelectorAll('.options .opt')].filter(on);
    const pick = (opts.length ? opts : [...view.querySelectorAll('.grade [data-g]')].filter(on))[+e.key - 1];
    if (pick) { e.preventDefault(); pick.click(); }
  } else if ((e.key === ' ' || e.key === 'Enter') && own) {
    const nx = document.getElementById('nextQ'), fc = document.getElementById('fc');
    if (on(nx)) { e.preventDefault(); nx.click(); } else if (on(fc)) { e.preventDefault(); fc.click(); }
  } else if (KEY_GRADE[e.key] != null && own) {
    // arrows grade a flashcard once its buttons show: ← ลืม (like a left swipe) · ↓ ยาก · → จำได้ (right swipe) · ↑ ง่าย
    const b = view.querySelector(`.grade [data-g="${KEY_GRADE[e.key]}"]`);
    if (on(b)) { e.preventDefault(); b.click(); }
  }
});
/* ---------- more keyboard shortcuts (1.138) ---------- */
// Esc = close the sheet on top, else the ✕ of a session, else ‹ back · ⌘[ or ⌥← = back · ⌥1–6 = the six main tabs · ? = this list.
// Full-screen layers with their own keys (search, book, word of the day, celebrations, share picker) are left alone.
const KEY_GRADE = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, ArrowUp: 3 };
const KEY_TABS = ['home', 'cards', 'games', 'stats', 'list', 'settings'];
const KEY_LIST = [
  ['ทุกหน้า', [['?', 'เปิดรายการคีย์ลัดนี้'], ['/ หรือ ⌘K', 'ค้นหาทั้งแอป'], ['Esc', 'ปิดแผ่นที่เปิดอยู่ / ออกจากรอบ / ย้อนกลับ'], ['⌘[ หรือ ⌥←', 'ย้อนกลับ'], ['⌥1 – ⌥6', 'หน้าแรก · แฟลชการ์ด · เกม · สถิติ · คำศัพท์ · ตั้งค่า']]],
  ['แฟลชการ์ด', [['Space / Enter', 'พลิกการ์ด'], ['1 – 4', 'ลืม · ยาก · จำได้ · ง่าย'], ['← ↓ → ↑', 'ลืม · ยาก · จำได้ · ง่าย']]],
  ['เกม', [['1 – 9', 'เลือกคำตอบ'], ['Enter', 'ข้อถัดไป']]],
  ['📖 โหมดหนังสือ', [['→ / Space', 'หน้าถัดไป'], ['← / ⇧Space', 'หน้าก่อน'], ['Esc', 'ปิดโหมดหนังสือ']]],
];
function showKeys() {
  if (document.querySelector('.keys-sheet')) return;
  const el = document.createElement('div');
  el.className = 'sheet-wrap keys-sheet';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="คีย์ลัด"><div class="grab"></div><div class="sheet-body">
    <b class="h2" style="display:block;margin:0 0 6px">⌨️ คีย์ลัด</b>
    <p class="small muted" style="margin:0 0 10px">ใช้กับ iPad ที่ต่อคีย์บอร์ด หรือคอมพิวเตอร์ · ตอนพิมพ์ในช่องคำตอบ คีย์ลัดจะไม่ทำงาน</p>
    ${KEY_LIST.map(([h, rows]) => `<div class="keys-h">${h}</div><div class="keys">${rows.map(([k, t]) => `<div class="keys-r"><kbd>${k}</kbd><span>${t}</span></div>`).join('')}</div>`).join('')}
    <button class="btn block" data-close style="margin-top:12px">ปิด</button></div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); };
  el.onclick = (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); };
}
function keyBack() {
  const b = document.getElementById('topBack');
  if (document.body.classList.contains('has-back') && b) { b.click(); return true; }
  return false;
}
document.addEventListener('keydown', (e) => {
  if (e.repeat || e.isComposing) return;
  const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
  if (document.querySelector('.book, .wf, .celebrate, .share-pick, [aria-modal="true"]')) return;
  if (e.key === 'Escape') {
    const sh = [...document.querySelectorAll('.sheet-wrap')].pop();
    if (sh) { e.preventDefault(); sh.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; } // their backdrop tap closes them
    if (typing) { e.target.blur(); return; }
    const q = document.getElementById('quit');
    if (q && q.offsetParent !== null) { e.preventDefault(); q.click(); return; }
    if (keyBack()) e.preventDefault();
    return;
  }
  if (typing || document.querySelector('.sheet-wrap')) return;
  if ((e.metaKey && e.key === '[') || (e.altKey && !e.metaKey && e.key === 'ArrowLeft')) { if (keyBack()) e.preventDefault(); return; }
  const tab = e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-6]$/.test(e.code) ? KEY_TABS[+e.code.slice(5) - 1] : null;
  if (tab) { e.preventDefault(); go(tab); return; }
  if (e.key === '?' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); showKeys(); }
});
window.BOOT_MS = Math.round(performance.now()); // time from navigation start to the first screen (settings → ⏱ วัดความเร็ว)
setSig = settingsSig(); // after boot-time migrations: only real changes from here on stamp settingsAt
// Fetch the game engine (data/play.js) once the first screen is up, so the first game doesn't wait for it (1.101).
(window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => loadPlay(), { timeout: 4000 });
mascotWelcome(); // น้องคำ wakes up when you return after a few days (1.102)
