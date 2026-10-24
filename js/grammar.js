'use strict';
// Grammar reference pages and their games: irregular verbs (1.80+).
// Classic script sharing globals with app.js (load order: index.html). Data files are lazy-loaded with loadData().

/* ---------- irregular verbs ---------- */
// data/irregular.js rows: [V1, V2, V3, thai]; V2 / V3 may hold two forms ("was / were").
let IRREG = null, IRR_FORM = null, IRR_BY = null;
// Forms that are also everyday words with another meaning (a wound, the ground): tapping them in a story keeps the plain word.
const IRR_SKIP = new Set(['wound', 'ground', 'bound']);
const loadIrregular = () => loadData('data/irregular.js', 'IRREGULAR').then((rows) => {
  if (!IRREG) {
    IRREG = rows.map(([v1, v2, v3, th]) => ({ v1, v2, v3, th, a2: v2.split(' / '), a3: v3.split(' / '),
      pat: v1 === v2 && v2 === v3 ? 'same' : v2 === v3 ? 'v23' : v1 === v3 ? 'v13' : 'diff' }));
    IRR_BY = new Map(IRREG.map((r) => [r.v1, r]));
    IRR_FORM = new Map();
    IRREG.forEach((r) => [...r.a2, ...r.a3].forEach((f) => { if (f !== r.v1 && !IRR_BY.has(f) && !IRR_SKIP.has(f) && !IRR_FORM.has(f)) IRR_FORM.set(f, r); }));
    storyInfoCache.clear(); // stories counted before this loaded didn't know went / found / left
  }
  return IRREG;
});
const irrSay = (r) => [r.v1, ...r.a2, ...r.a3].join(', ');
const irrHTML = (r) => `<b lang="en">${esc(r.v1)}</b> <span class="muted">→</span> <b lang="en">${esc(r.v2)}</b> <span class="muted">→</span> <b lang="en">${esc(r.v3)}</b>`;
const IRR_PAT = { all: 'ทั้งหมด', diff: 'ต่างกันทั้ง 3', v23: 'ช่อง 2 = ช่อง 3', v13: 'ช่อง 1 = ช่อง 3', same: 'เหมือนกันทั้ง 3' };
const IRR_TIP = {
  same: 'เหมือนกันทั้ง 3 ช่อง ไม่เปลี่ยนรูปเลย จำง่ายที่สุด',
  v23: 'ช่อง 2 กับช่อง 3 เหมือนกัน จำรูปเดียวใช้ได้ทั้งอดีตและหลัง have / has',
  v13: 'ช่อง 3 กลับมาเหมือนช่อง 1 มีแค่ช่อง 2 ที่เปลี่ยน',
  diff: 'เปลี่ยนต่างกันทั้ง 3 ช่อง ต้องจำทีละคำ',
};
// The word sheet of a verb in the list shows its three forms.
function irregBox(el, w) {
  loadIrregular().then(() => {
    const box = el.querySelector('#irBox'), r = IRR_BY.get(w.w);
    if (box && r) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>⏪ กริยาไม่ปกติ</b> (ช่อง 1 → 2 → 3 · แตะเพื่อฟัง)</div>
      <button class="col-row" data-col="${esc(irrSay(r))}"><span>${irrHTML(r)}</span></button>`;
  });
}

let irrQuery = '', irrPat = 'all';
function renderIrregular() {
  if (!IRREG) { withLoading(loadIrregular()).then(renderIrregular); return; }
  $('#title').textContent = 'กริยาไม่ปกติ';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="irBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="irPlay">⏪ เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${IRREG.length} คำ · ช่อง 1 (รูปปกติ) → ช่อง 2 (อดีต) → ช่อง 3 (ใช้หลัง have / has หรือ passive) · แตะแถวเพื่อฟัง · ในเรื่องอ่าน แตะ went / found / left ก็เปิดคำกริยาตัวนี้ให้</p>
    <input class="search" id="irq" type="search" placeholder="ค้นหา เช่น go หรือ went หรือ ไป" value="${esc(irrQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหากริยาไม่ปกติ">
    <div class="chips" id="irPat" style="margin:10px 0">${Object.entries(IRR_PAT).map(([k, t]) => `<button class="chip" data-p="${k}" aria-pressed="${irrPat === k}">${t}</button>`).join('')}</div>
    <div class="pair-list" id="irList"></div>`;
  const paint = () => {
    const q = irrQuery.trim().toLowerCase();
    const list = IRREG.filter((r) => (irrPat === 'all' || r.pat === irrPat) && (!q || [r.v1, r.v2, r.v3].some((x) => x.includes(q)) || r.th.includes(q)));
    view.querySelectorAll('#irPat .chip').forEach((c) => { const on = c.dataset.p === irrPat; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    $('#irList').innerHTML = list.length ? `<div class="card-box pair-card">${list.map((r) => `<button class="col-row" data-col="${esc(irrSay(r))}"><span>${irrHTML(r)}</span><span>${esc(r.th)}</span></button>`).join('')}</div>`
      : '<p class="muted center">ไม่พบกริยานี้</p>';
  };
  paint();
  $('#irq').oninput = (e) => { irrQuery = e.target.value; paint(); };
  $('#irPat').onclick = (e) => { const c = e.target.closest('[data-p]'); if (c) { irrPat = c.dataset.p; paint(); } };
  $('#irBack').onclick = () => go('games');
  $('#irPlay').onclick = () => startGame('irreg');
  $('#irList').onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
}
// Game items: one question for V2 and one for V3, or a single one when both are the same form.
const irregItems = () => IRREG.flatMap((r) => (r.v2 === r.v3 ? [[r, 'b', r.v2]] : [[r, 'v2', r.v2], [r, 'v3', r.v3]]))
  .map(([r, k, right]) => ({ idx: -1, w: right, t: r.th, p: '', g: '', _ir: r, _k: k, _q: [irrSay(r), right, '', `${r.v1} → ${r.v2} → ${r.v3}`] }));
// Three wrong forms: the other form of the same verb, the base form, an invented regular form (goed), then forms of other verbs.
function irregOpts(r, k, right) {
  const ed = r.v1.replace(/e$/, '') + 'ed', en = r.v1.replace(/e$/, '') + 'en';
  const other = k === 'v2' ? r.v3 : k === 'v3' ? r.v2 : '';
  const near = IRREG.filter((x) => x !== r);
  const fill = shuffle(near).flatMap((x) => [x.a2[0], x.a3[0]]);
  const out = [];
  for (const c of [...shuffle([other, r.v1, ed, en]), ...fill]) if (c && c !== right && !out.includes(c)) { out.push(c); if (out.length === 3) break; }
  return out;
}
