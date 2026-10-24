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

/* ---------- mistakes Thai learners make ---------- */
// data/mistakes.js rows: [category, correct sentence, wrong sentence, Thai tip, Thai meaning]
let MISTAKES = null;
const MIS_CAT = { prep: 'บุพบทที่ไม่ต้องมีหรือผิด', noun: 'นามนับได้ นับไม่ได้ พหูพจน์', article: 'a / an / the', verb: 'รูปกริยาและรูปแบบหลังกริยา', be: 'ลืมกริยา be', word: 'เลือกคำผิด', order: 'ลำดับคำ' };
const loadMistakes = () => loadData('data/mistakes.js', 'MISTAKES').then((rows) => {
  if (!MISTAKES) MISTAKES = rows.map(([cat, ok, no, tip, th]) => ({ cat, ok, no, tip, th }));
  return MISTAKES;
});
let misQuery = '', misCat = 'all';
function renderMistakes() {
  if (!MISTAKES) { withLoading(loadMistakes()).then(renderMistakes); return; }
  $('#title').textContent = 'ข้อผิดที่พบบ่อย';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="misBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="misPlay">🩹 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${MISTAKES.length} ข้อที่คนไทยมักพลาดเพราะนึกตามภาษาไทย เช่น discuss <s>about</s>, <s>advices</s>, <s>I tired</s> · ❌ = ผิด ✅ = ถูก แตะแถวเพื่อฟังประโยคที่ถูก</p>
    <input class="search" id="misq" type="search" placeholder="ค้นหา เช่น discuss หรือ พหูพจน์" value="${esc(misQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาข้อผิดที่พบบ่อย">
    <div class="chips" id="misCat" style="margin:10px 0"><button class="chip" data-c="all">ทั้งหมด</button>${Object.entries(MIS_CAT).map(([k, t]) => `<button class="chip" data-c="${k}">${t}</button>`).join('')}</div>
    <div class="pair-list" id="misList"></div>`;
  const paint = () => {
    const q = misQuery.trim().toLowerCase();
    view.querySelectorAll('#misCat .chip').forEach((c) => { const on = c.dataset.c === misCat; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    const list = MISTAKES.filter((r) => (misCat === 'all' || r.cat === misCat) && (!q || (r.ok + ' ' + r.no).toLowerCase().includes(q) || (r.tip + r.th).includes(q)));
    const cats = Object.keys(MIS_CAT).filter((c) => list.some((r) => r.cat === c));
    $('#misList').innerHTML = cats.length ? cats.map((c) => `<div class="card-box pair-card"><div class="pair-h"><b>${MIS_CAT[c]}</b> <span class="small muted">${list.filter((r) => r.cat === c).length} ข้อ</span></div>
      ${list.filter((r) => r.cat === c).map((r) => `<button class="pair-ex" data-say="${esc(r.ok)}"><span lang="en">❌ <s>${esc(r.no)}</s></span><span lang="en">✅ <b>${esc(r.ok)}</b></span><small class="muted">💡 ${esc(r.tip)}</small></button>`).join('')}</div>`).join('')
      : '<p class="muted center">ไม่พบข้อนี้</p>';
  };
  paint();
  $('#misq').oninput = (e) => { misQuery = e.target.value; paint(); };
  $('#misCat').onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) { misCat = c.dataset.c; paint(); } };
  $('#misBack').onclick = () => go('games');
  $('#misPlay').onclick = () => startGame('thaierr');
  $('#misList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}
const misItems = () => MISTAKES.map((r) => ({ idx: -1, w: r.ok, t: r.th, p: '', g: '', _mis: r, _q: [r.ok, '', '', r.th] }));

/* ---------- grammar tied to words ---------- */
// data/grampat.js rows: [kind, word, thai, frame with ___, right form, [2 wrong forms], thai sentence, how to count]; kind "both" rows are reference only.
let GRAMPAT = null, GP_OF = null;
const GP_KIND = {
  u: { icon: '🧺', title: 'นามนับไม่ได้ [U]', note: 'ไม่เติม s · ไม่มี a / an · ใช้กับ much / some / a lot of และกริยาเอกพจน์ (is) · จะนับให้ใช้ “a piece of …” คนไทยมักเติม s ผิด' },
  ing: { icon: '🔁', title: 'ตามด้วยกริยา + ing', note: 'กริยากลุ่มนี้ตามด้วย V-ing เท่านั้น เช่น enjoy swimming (ไม่ใช่ enjoy to swim)' },
  to: { icon: '➡️', title: 'ตามด้วย to + กริยา', note: 'กริยากลุ่มนี้ตามด้วย to + V เช่น want to go, decide to stay (ไม่ใช่ want going)' },
  bare: { icon: '✂️', title: 'ตามด้วยกริยาช่อง 1 (ไม่มี to)', note: 'let / make / can / should / must / would rather / had better + กริยาช่อง 1 ไม่มี to เช่น let me go' },
  both: { icon: '↔️', title: 'ได้ทั้ง -ing และ to แต่ความหมายต่างกัน', note: 'ความหมายเปลี่ยนตามรูปที่ตามหลัง ต้องดูบริบท (ไม่มีในเกม เพราะต้องรู้บริบทเต็มประโยค)' },
};
const loadGramPat = () => loadData('data/grampat.js', 'GRAMPAT').then((rows) => {
  if (!GRAMPAT) {
    GRAMPAT = rows.map(([kind, head, th, frame, right, wrong, exTh, count]) => ({ kind, head, th, frame, right, wrong, exTh, count: count || '',
      sheetKey: (['be', "can't", 'had', 'would'].includes(head.split(' ')[0]) ? head.split(' ')[1] : head.split(' ')[0]).toLowerCase() }));
    GP_OF = new Map();
    GRAMPAT.forEach((r) => { if (!GP_OF.has(r.sheetKey)) GP_OF.set(r.sheetKey, []); GP_OF.get(r.sheetKey).push(r); });
  }
  return GRAMPAT;
});
const gpOf = (word) => (GP_OF && GP_OF.get(word.toLowerCase())) || [];
const gpFilled = (r) => esc(r.frame).replace('___', `<mark>${esc(r.right)}</mark>`);
const gpPlain = (r) => r.frame.replace('___', r.right);
function gpRow(r) {
  if (r.kind === 'both') return `<div class="pair-ex" style="cursor:default"><span><b lang="en">${esc(r.head)}</b> = ${esc(r.th)}</span><span lang="en">${esc(r.frame)}</span><small class="muted">${esc(r.exTh)}</small></div>`;
  return `<button class="pair-ex" data-say="${esc(gpPlain(r))}"><span><b lang="en">${esc(r.head)}</b> = ${esc(r.th)}${r.count ? ` · นับว่า <i lang="en">${esc(r.count)}</i>` : ''}</span><span lang="en">${gpFilled(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`;
}
// The word sheet of a noun / verb with a rule shows it.
function gpBox(el, w) {
  loadGramPat().then(() => {
    const box = el.querySelector('#gpBox'), list = gpOf(w.w).filter((r) => r.kind !== 'both' || r.head === w.w.toLowerCase());
    if (!box || !list.length) return;
    const kinds = [...new Set(list.map((r) => r.kind))];
    box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>📐 ไวยากรณ์ของคำนี้</b> (แตะเพื่อฟังประโยค)</div>`
      + kinds.map((k) => `<div class="tip-box" style="margin:0 0 6px"><b>${GP_KIND[k].icon} ${GP_KIND[k].title}</b><div class="small muted">${GP_KIND[k].note}</div></div>${list.filter((r) => r.kind === k).map(gpRow).join('')}`).join('');
  });
}
let gpQuery = '', gpKind = 'all';
function renderGramPat() {
  if (!GRAMPAT) { withLoading(loadGramPat()).then(renderGramPat); return; }
  $('#title').textContent = 'ไวยากรณ์ที่ผูกกับคำ';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="gpBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="gpPlay">📐 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${GRAMPAT.length} คำที่มีกฎติดตัว: นามที่นับไม่ได้ (advice, news) และกริยาที่ต้องตามด้วย -ing หรือ to หรือกริยาช่อง 1 · รู้กฎก่อนใช้ จะไม่พลาดเรื่อง s กับรูปกริยา · แตะแถวเพื่อฟังประโยค</p>
    <input class="search" id="gpq" type="search" placeholder="ค้นหา เช่น advice หรือ enjoy หรือ ข่าว" value="${esc(gpQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาไวยากรณ์ที่ผูกกับคำ">
    <div class="chips" id="gpKind" style="margin:10px 0"><button class="chip" data-k="all">ทั้งหมด</button>${Object.entries(GP_KIND).map(([k, g]) => `<button class="chip" data-k="${k}">${g.icon} ${g.title}</button>`).join('')}</div>
    <div class="pair-list" id="gpList"></div>`;
  const paint = () => {
    const q = gpQuery.trim().toLowerCase();
    view.querySelectorAll('#gpKind .chip').forEach((c) => { const on = c.dataset.k === gpKind; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    const list = GRAMPAT.filter((r) => (gpKind === 'all' || r.kind === gpKind) && (!q || r.head.includes(q) || r.th.includes(q) || r.right.toLowerCase().includes(q)));
    const kinds = Object.keys(GP_KIND).filter((k) => list.some((r) => r.kind === k));
    $('#gpList').innerHTML = kinds.length ? kinds.map((k) => `<div class="card-box pair-card"><div class="pair-h"><b>${GP_KIND[k].icon} ${GP_KIND[k].title}</b> <span class="small muted">${list.filter((r) => r.kind === k).length} คำ</span></div>
      <div class="tip-box">${GP_KIND[k].note}</div>${list.filter((r) => r.kind === k).map(gpRow).join('')}</div>`).join('')
      : '<p class="muted center">ไม่พบคำนี้</p>';
  };
  paint();
  $('#gpq').oninput = (e) => { gpQuery = e.target.value; paint(); };
  $('#gpKind').onclick = (e) => { const c = e.target.closest('[data-k]'); if (c) { gpKind = c.dataset.k; paint(); } };
  $('#gpBack').onclick = () => go('games');
  $('#gpPlay').onclick = () => startGame('gpat');
  $('#gpList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}
const gpItems = () => GRAMPAT.filter((r) => r.kind !== 'both').map((r) => ({ idx: -1, w: r.head, t: r.th, p: '', g: '', _gp: r, _q: [r.frame, r.right, '', r.th] }));

/* ---------- reading IPA ---------- */
// The sound chart uses the same IPA as the word list (US style: ɑː ɔː ɜː, əʊ, er for "air"). Every example is a list word that has the symbol (a test checks).
// [symbol, Thai approximation, [example words], tip for Thai speakers]
const IPA_GROUPS = [
  ['🔣 เครื่องหมายพิเศษ', 'ˈ ˌ ː ที่เห็นในวงเล็บทุกคำ', [
    ['ˈ', 'เน้นเสียงหนัก', ['about', 'apple', 'father'], 'อยู่ก่อนพยางค์ที่เน้นหนักที่สุด เช่น /əˈbaʊt/ เน้นที่ -bout'],
    ['ˌ', 'เน้นเสียงรอง', ['afternoon', 'goodbye', 'information'], 'คำยาวมักมีเน้นรองด้วย เช่น /ˌæftərˈnuːn/ (เน้นรองที่ af- เน้นหนักที่ -noon)'],
    ['ː', 'ออกเสียงยาว', ['beach', 'school', 'also'], 'ตัวที่มี ː ต้องลากเสียงให้ยาวกว่าตัวสั้น (sheep ยาว ship สั้น)'],
  ]],
  ['🅰️ สระเดี่ยว', 'แยกสั้น–ยาวให้ชัด คนไทยมักอ่านเป็นสระเดียวกัน', [
    ['iː', 'อี ยาว', ['beach', 'agree', 'between'], 'ยิ้มกว้างและลากยาว ต่างจาก ɪ ที่สั้นและผ่อนกว่า'],
    ['ɪ', 'อิ สั้น (คล้ายระหว่าง อิ-เอะ)', ['big', 'sit', 'ticket'], 'ผ่อนปากไม่ต้องยิ้มกว้าง ลิ้นต่ำกว่า iː เล็กน้อย'],
    ['e', 'เอะ', ['bed', 'ten', 'friend'], 'ปากเปิดครึ่งหนึ่ง คล้ายเอะในภาษาไทย'],
    ['æ', 'แอ (อ้าปากกว้าง)', ['cat', 'apple', 'bad'], 'อ้าปากกว้างกว่า e แล้วเสียงแบน ๆ แบบ “แอ” ไม่ใช่ “เอ”'],
    ['ʌ', 'อะ (สั้น ๆ จากลำคอ)', ['cup', 'bus', 'love'], 'คล้ายอะแต่ไม่อ้าปากมาก ต่างจาก ɑː ที่ยาว'],
    ['ɑː', 'อา ยาว', ['arm', 'art', 'father'], 'อ้าปากกว้างและลากยาว หลังสระมักตามด้วยเสียง r แบบอเมริกัน'],
    ['ɔː', 'ออ ยาว', ['all', 'also', 'across'], 'ปากห่อกลมและลากยาว'],
    ['ʊ', 'อุ สั้น', ['book', 'good', 'put'], 'ริมฝีปากห่อน้อย ๆ สั้นกว่า uː'],
    ['uː', 'อู ยาว', ['afternoon', 'bathroom', 'school'], 'ห่อปากให้กลมและลากยาว'],
    ['ə', 'เออ แผ่วมาก (ชวา)', ['about', 'again', 'ago'], 'เสียงในพยางค์ที่ไม่เน้น ออกเบา ๆ รีบผ่าน พบบ่อยที่สุดในภาษาอังกฤษ'],
    ['ɜː', 'เออ ยาว (ม้วนลิ้นแบบ r)', ['bird', 'early', 'dirty'], 'ทำเสียงเออ แล้วม้วนลิ้นขึ้นเล็กน้อยโดยไม่แตะเพดาน'],
  ]],
  ['🅱️ สระประสม', 'เลื่อนจากเสียงแรกไปเสียงที่สอง', [
    ['eɪ', 'เอ-อิ', ['age', 'always', 'amazing'], 'ออกเสียงเอ แล้วเลื่อนไปอิ ไม่ใช่เอเฉยๆ'],
    ['aɪ', 'อาย', ['advice', 'arrive', 'bicycle'], 'อ้าปากแล้วค่อยหุบ คล้าย “ไอ” ในภาษาไทย'],
    ['ɔɪ', 'ออย', ['boy', 'enjoy', 'join'], 'ออแล้วเลื่อนเป็นอิ'],
    ['əʊ', 'โอ (เลื่อนไปอุ)', ['ago', 'below', 'boat'], 'อ่านเป็นโอ แล้วห่อปากท้ายเสียง'],
    ['aʊ', 'อาว', ['about', 'around', 'brown'], 'อ้าปากแล้วห่อ ต่างจาก “อ๊า” ตรงห่อท้ายเสียง'],
    ['ɪr', 'เอียร์', ['beer', 'career', 'dear'], 'เสียงอิตามด้วย r ม้วนลิ้น'],
    ['er', 'แอร์ (เอ + r)', ['chair', 'airport', 'care'], 'เสียงเอตามด้วย r ม้วนลิ้น ไม่ต้องออกเสียง “แอร์” เป็นคำไทย'],
    ['ʊr', 'อัวร์', ['during', 'poor', 'sure'], 'เสียงอุตามด้วย r ม้วนลิ้น'],
  ]],
  ['🔤 พยัญชนะที่คนไทยมักพลาด', 'เสียงที่ภาษาไทยไม่มีหรือใช้ต่างกัน', [
    ['θ', 'ลิ้นแตะฟัน ไม่มีเสียงสั่น', ['think', 'bathroom', 'birthday'], 'วางปลายลิ้นระหว่างฟันแล้วเป่าลมเบา ๆ ไม่ใช่ “ท” หรือ “ซ” ไทย'],
    ['ð', 'ลิ้นแตะฟัน มีเสียงสั่น', ['this', 'mother', 'another'], 'ตำแหน่งเดียวกับ θ แต่ให้เส้นเสียงสั่น คล้าย “ด” ที่ลิ้นยื่น'],
    ['ʃ', 'ช เบา ๆ (ปากห่อ)', ['she', 'shop', 'fish'], 'เสียงฟู่ “ช” ไม่ใช่ “ซ”'],
    ['ʒ', 'เสียงสั่นของ ʃ', ['usually', 'television', 'vision'], 'ตำแหน่งเดียวกับ ʃ แต่มีเสียงสั่น คล้าย “ฌ”'],
    ['tʃ', 'ช (กระแทก)', ['beach', 'chair', 'change'], 'ท้ายคำต้องออกเสียงด้วย ไม่ใช่ตัดทิ้ง (beach ไม่ใช่ “บี”)'],
    ['dʒ', 'จ (มีเสียงสั่น)', ['age', 'change', 'college'], 'เหมือน j ใน jump · ท้ายคำก็ต้องออกเสียง'],
    ['v', 'ฟัน–ริมฝีปากล่างมีเสียงสั่น', ['arrive', 'believe', 'very'], 'ไม่ใช่ “ว” ไทย: ฟันบนแตะริมฝีปากล่างแล้วให้เสียงสั่น'],
    ['z', 'ซ (มีเสียงสั่น)', ['always', 'easy', 'zero'], 'ซที่ให้คอสั่น ท้ายคำเช่น -s ที่ออกเสียง z ต้องไม่ทิ้ง'],
    ['r', 'ม้วนลิ้น ไม่แตะเพดาน', ['arm', 'birthday', 'ear'], 'ไม่รัวเหมือน ร ไทย: ม้วนลิ้นไปด้านหลังเฉย ๆ'],
    ['l', 'ลิ้นแตะเหงือกบน', ['all', 'early', 'also'], 'ท้ายคำ (all, call) ให้ลิ้นแตะเหงือกค้างไว้ ไม่เปลี่ยนเป็น “น”'],
    ['ŋ', 'ง (ท้ายคำ)', ['angry', 'sing', 'long'], 'เสียง ng เสียงเดียว ไม่ต้องออก “ก” ตามหลัง (sing ไม่ใช่ “ซิงก์”)'],
    ['w', 'ว (ห่อปาก)', ['between', 'always', 'we'], 'ห่อปากกลม ๆ ก่อนเริ่มเสียง ต่างจาก v'],
    ['j', 'ย', ['you', 'yes', 'euro'], 'เหมือน ย ในภาษาไทย (ไม่ใช่ j ในตัวอักษรอังกฤษ)'],
  ]],
];
function renderIpa() {
  $('#title').textContent = 'ตารางเสียง IPA';
  view.scrollTop = 0;
  const wordBtn = (x) => { const w = WORD_BY[x]; return `<button class="ipa-w" data-say="${esc(x)}" lang="en"><b>${esc(x)}</b> <span class="muted">${w ? esc(w.i) : ''}</span></button>`; };
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="ipBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="ipPlay">🔡 เล่นเกมอ่าน IPA</button></div>
    <p class="small muted" style="margin:0 4px 10px">IPA คือสัญลักษณ์ที่บอกวิธีออกเสียง อยู่ในวงเล็บเฉียงทุกคำ เช่น /ˈæpl/ · เรียนตารางนี้แล้วเปิดพจนานุกรมก็อ่านคำใหม่ได้เอง · แตะคำเพื่อฟัง · อยากฝึกหูแยกเสียงคล้าย ship / sheep ไปที่ 👂 ฝึกหูแยกเสียง</p>
    ${IPA_GROUPS.map(([title, note, rows]) => `<div class="card-box pair-card"><div class="pair-h"><b>${title}</b></div><div class="small muted" style="margin-bottom:6px">${note}</div>
      ${rows.map(([sym, th, ex, tip]) => `<div class="ipa-row"><div class="ipa-sym" lang="en">/${esc(sym)}/</div><div class="grow"><b>${esc(th)}</b><div class="small muted">${esc(tip)}</div><div class="ipa-ex">${ex.map(wordBtn).join('')}</div></div></div>`).join('')}</div>`).join('')}
    <button class="btn block" id="ipMin" style="margin-top:10px">👂 ฝึกหูแยกเสียงคล้าย</button>`;
  $('#ipBack').onclick = () => go('games');
  $('#ipPlay').onclick = () => startGame('ipa');
  $('#ipMin').onclick = () => startGame('minpair');
  view.onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}
// Wrong spellings for the IPA game: words that start and end alike and have a different sound (never a homophone).
function ipaDistractors(w) {
  const a = w.w.toLowerCase();
  const score = (x) => {
    const b = x.w.toLowerCase();
    let c = 0; while (c < a.length && a[c] === b[c]) c++;
    let e = 0; while (e < a.length && e < b.length && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
    return c * 2 + e - Math.abs(a.length - b.length);
  };
  const near = W.filter((x) => x !== w && x.i && x.i !== w.i && !/\s/.test(x.w)).map((x) => [score(x), x]).sort((p, q) => q[0] - p[0]).slice(0, 14).map((p) => p[1]);
  return shuffle(near).slice(0, 3);
}
