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

/* ---------- dependent prepositions ---------- */
// data/depprep.js rows: [head + preposition, level, thai, example with the preposition in [brackets], thai example, other prepositions that are also fine]
let DEPPREP = null, DP_OF = null;
// Prepositions offered as wrong options (never one that is listed, or marked as fine, for the same head).
const DP_POOL = ['in', 'on', 'at', 'of', 'to', 'for', 'with', 'about', 'from', 'by', 'into'];
const loadDepPrep = () => loadData('data/depprep.js', 'DEPPREP').then((rows) => {
  if (!DEPPREP) {
    DEPPREP = rows.map(([ph, lv, th, ex, exTh, ok]) => {
      const [head, prep] = ph.split(' ');
      return { ph, head, prep, lv, th, ex, exTh, ok: ok || [], plain: ex.replace(/[[\]]/g, '') };
    });
    DP_OF = new Map();
    DEPPREP.forEach((r) => { if (!DP_OF.has(r.head)) DP_OF.set(r.head, []); DP_OF.get(r.head).push(r); });
  }
  return DEPPREP;
});
const dpOf = (word) => (DP_OF && DP_OF.get(word.toLowerCase())) || [];
const dpHTML = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<mark>$1</mark>');
const dpBlank = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<span class="blank">_____</span>');
// Three prepositions that don't fit: none of those listed (or marked fine) for this head.
function dpDistractors(r) {
  const fine = new Set([r.prep, ...r.ok, ...dpOf(r.head).flatMap((x) => [x.prep, ...x.ok])]);
  return shuffle(DP_POOL.filter((p) => !fine.has(p))).slice(0, 3);
}
const dpRows = (list, hi) => list.map((r) => `<button class="col-row${r.ph === hi ? ' on' : ''}" data-col="${esc(r.plain)}"><b>${esc(r.head)} <mark>${esc(r.prep)}</mark></b><span>${esc(r.th)}</span></button>`).join('');
function dpBox(el, w) {
  loadDepPrep().then(() => {
    const box = el.querySelector('#dpBox'), list = dpOf(w.w);
    if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🔗 บุพบทที่ตามหลังคำนี้</b> (แตะเพื่อฟังประโยค)</div>${dpRows(list)}`;
  });
}

let dpQuery = '', dpGroup = 'all';
function renderDepPrep() {
  if (!DEPPREP) { withLoading(loadDepPrep()).then(renderDepPrep); return; }
  $('#title').textContent = 'บุพบทที่ตามหลังคำ';
  view.scrollTop = 0;
  const preps = [...new Set(DEPPREP.map((r) => r.prep))].sort((a, b) => DEPPREP.filter((r) => r.prep === b).length - DEPPREP.filter((r) => r.prep === a).length);
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="dpBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="dpPlay">🔗 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${DEPPREP.length} คู่ที่คำหนึ่งต้องตามด้วยบุพบทตัวเดิมเสมอ เช่น interested <b>in</b>, depend <b>on</b> (บุพบทไม่ตรงกับที่แปลตรงตัวจากไทย จึงต้องจำเป็นคู่) · แตะแถวเพื่อฟังประโยค</p>
    <input class="search" id="dpq" type="search" placeholder="ค้นหา เช่น depend หรือ เห็นด้วย" value="${esc(dpQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาบุพบทที่ตามหลังคำ">
    <div class="chips" id="dpGroup" style="margin:10px 0"><button class="chip" data-g="all">ทั้งหมด</button>${preps.map((p) => `<button class="chip" data-g="${p}">${p}</button>`).join('')}</div>
    <div class="pair-list" id="dpList"></div>`;
  const paint = () => {
    const q = dpQuery.trim().toLowerCase();
    view.querySelectorAll('#dpGroup .chip').forEach((c) => { const on = c.dataset.g === dpGroup; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    const list = DEPPREP.filter((r) => (dpGroup === 'all' || r.prep === dpGroup) && (!q || r.ph.includes(q) || r.th.includes(q)));
    const groups = [...new Set(list.map((r) => r.prep))].sort((a, b) => list.filter((r) => r.prep === b).length - list.filter((r) => r.prep === a).length);
    $('#dpList').innerHTML = groups.length ? groups.map((p) => `<div class="card-box pair-card"><div class="pair-h"><b>… ${esc(p)}</b> <span class="small muted">${list.filter((r) => r.prep === p).length} คำ</span></div>
      ${list.filter((r) => r.prep === p).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span><b lang="en">${esc(r.head)} <mark>${esc(r.prep)}</mark></b> <span class="lvl-mini">${r.lv}</span> = ${esc(r.th)}</span><span lang="en">${dpHTML(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`).join('')}</div>`).join('')
      : '<p class="muted center">ไม่พบคำนี้</p>';
  };
  paint();
  $('#dpq').oninput = (e) => { dpQuery = e.target.value; paint(); };
  $('#dpGroup').onclick = (e) => { const c = e.target.closest('[data-g]'); if (c) { dpGroup = c.dataset.g; paint(); } };
  $('#dpBack').onclick = () => go('games');
  $('#dpPlay').onclick = () => startGame('dprep');
  $('#dpList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}
const dpItems = () => DEPPREP.map((r) => ({ idx: -1, w: r.ph, t: r.th, p: '', g: '', _dp: r, _q: [r.ex.replace(/\[[^\]]+\]/, '___'), r.prep, '', r.th] }));
