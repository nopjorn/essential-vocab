'use strict';
// Start-up: first route, service worker, sync and badge. Loaded last.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- boot ---------- */
if (!S.chistFrom) S.chistFrom = today();
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
if (syncOn() && auth) syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
document.addEventListener('visibilitychange', () => {
  if (!syncOn() || !auth) return;
  if (document.hidden) { clearTimeout(pushTimer); syncNow(); } else syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
});
// Refresh counts when returning to the app after a while (e.g. next day).
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'home') renderHome(); });
document.addEventListener('visibilitychange', updateBadge);
updateBadge();
window.BOOT_MS = Math.round(performance.now()); // time from navigation start to the first screen (settings → ⏱ วัดความเร็ว)
setSig = settingsSig(); // after boot-time migrations: only real changes from here on stamp settingsAt
