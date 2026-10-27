'use strict';
// In-app manual loader + changelog (the manual itself: data/guide.js, lazy-loaded).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- guide ---------- */
// The manual itself lives in data/guide.js and is loaded the first time the guide page opens.
let guideOn = false;
function loadGuide() {
  if (guideOn) return Promise.resolve(true);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/guide.js?v=' + APP_VERSION;
    sc.onload = () => { guideOn = true; res(true); };
    sc.onerror = () => { sc.remove(); res(false); };
    document.head.appendChild(sc);
  });
}
function renderGuide(from) {
  if (guideOn) return renderGuideBody(from);
  withLoading(loadGuide()).then((ok) => {
    if (current !== 'guide') return;
    if (ok) return renderGuideBody(from);
    view.innerHTML = `<div class="card-box">${emptyArt({ kind: 'empty', title: 'โหลดคู่มือไม่สำเร็จ', sub: 'ต้องต่ออินเทอร์เน็ตสักครั้งเพื่อโหลดคู่มือ แล้วลองใหม่นะคะ', btn: 'กลับหน้าแรก', go: 'home' })}</div>`;
  });
}

let CHANGELOG = null;
function loadChangelog() {
  if (CHANGELOG) return Promise.resolve(CHANGELOG);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/changelog.js?v=' + APP_VERSION;
    const done = () => { CHANGELOG = window.CHANGELOG || []; res(CHANGELOG); };
    sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  });
}
const verNum = (v) => String(v || '0').split('.').reduce((a, x) => a * 1000 + (+x || 0), 0);
const thaiDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
function renderChangelog(from) {
  const back = from || 'settings';
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="clBack">‹ กลับ</button></div><div id="clBody" class="center muted" style="padding:24px">กำลังโหลด…</div>`;
  $('#clBack').onclick = () => go(back);
  loadChangelog().then((list) => {
    if (current !== 'changelog') return;
    const body = $('#clBody');
    body.className = '';
    body.removeAttribute('style');
    if (!list.length) list = [[APP_VERSION, 'โหลดประวัติไม่สำเร็จ ลองใหม่ตอนต่อเน็ตนะ', '']];
    const days = [];
    list.forEach((r) => {
      const k = r[2] || '';
      let g = days[days.length - 1];
      if (!g || g.d !== k) days.push(g = { d: k, rows: [] });
      g.rows.push(r);
    });
    let pick = 'all';
    const draw = () => {
      const shown = pick === 'all' ? days : days.filter((g) => g.d === pick);
      body.innerHTML = `<div class="cl-filter"><label for="clPick" class="small muted">แสดง</label>
        <select class="sel" id="clPick"><option value="all">ทั้งหมด (${list.length} อัปเดต · ${days.length} วัน)</option>${days.map((g) => `<option value="${esc(g.d)}"${g.d === pick ? ' selected' : ''}>${g.d ? thaiDate(g.d) : 'ไม่ระบุวัน'} (${g.rows.length})</option>`).join('')}</select></div>`
        + shown.map((g) => `<div class="cl-day"><span>${g.d ? thaiDate(g.d) : 'ไม่ระบุวัน'}</span><span class="cl-n">${g.rows.length} อัปเดต</span></div>`
          + g.rows.map(([v, t]) => `<div class="card-box cl-row${v === list[0][0] ? ' cl-new' : ''}"><div class="cl-v">${esc(v)}${v === APP_VERSION ? ' <span class="cl-tag">เวอร์ชันนี้</span>' : ''}</div><div class="cl-t">${esc(t)}</div></div>`).join('')).join('')
        + `<p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
      $('#clPick').onchange = (e) => { pick = e.target.value; draw(); };
    };
    draw();
  });
}
// After an update: once per version, offer a look at what changed (silent for brand-new installs).
function whatsNew() {
  if (S.seenVer === APP_VERSION) return;
  const first = S.seenVer == null && !Object.keys(S.prog).length;
  const older = S.seenVer == null || verNum(S.seenVer) < verNum(APP_VERSION);
  S.seenVer = APP_VERSION; save();
  if (first || !older || document.getElementById('updBar')) return;
  const b = document.createElement('div');
  b.id = 'newBar'; b.className = 'upd-bar'; b.setAttribute('role', 'status');
  b.innerHTML = `<span>🎉 อัปเดตเป็น ${APP_VERSION} แล้ว</span><button class="btn primary" data-new="go">ดูมีอะไรใหม่</button><button class="upd-x" data-new="x" aria-label="ปิด">✕</button>`;
  b.onclick = (e) => {
    const a = e.target.dataset.new;
    if (a === 'go') { b.remove(); go('changelog', current === 'changelog' ? 'settings' : current); }
    else if (a === 'x') b.remove();
  };
  document.body.appendChild(b);
}
