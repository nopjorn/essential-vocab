'use strict';
// Extra vocabulary knowledge: phrasal verbs, synonyms/antonyms and word parts (prefixes/suffixes).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- lazy data files ---------- */
// loadData('phrasal.js', 'PHRASAL') → Promise of window.PHRASAL ([] if the file fails to load).
const DATA_P = {};
function loadData(file, key) {
  if (!DATA_P[key]) {
    DATA_P[key] = window[key] ? Promise.resolve(window[key]) : new Promise((res) => {
      const sc = document.createElement('script');
      sc.src = file + '?v=' + APP_VERSION;
      const done = () => res(window[key] || []);
      sc.onload = done; sc.onerror = done;
      document.head.appendChild(sc);
    });
  }
  return DATA_P[key];
}
const isVerb = (w) => w.p.split('/').includes('v');

/* ---------- phrasal verbs ---------- */
// phrasal.js rows: [phrasal, level, thai, example with [verb] and [particles], thai example]
let PHRASAL = null, PV_BY_VERB = null;
const loadPhrasal = () => loadData('phrasal.js', 'PHRASAL').then((rows) => {
  if (!PHRASAL) {
    PHRASAL = rows.map(([pv, lv, th, ex, exTh]) => {
      const sp = pv.split(' ');
      return { pv, lv, th, ex, exTh, verb: sp[0], part: sp.slice(1).join(' '), plain: ex.replace(/[[\]]/g, '') };
    });
    PV_BY_VERB = new Map();
    PHRASAL.forEach((r) => { if (!PV_BY_VERB.has(r.verb)) PV_BY_VERB.set(r.verb, []); PV_BY_VERB.get(r.verb).push(r); });
  }
  return PHRASAL;
});
const phrasalOf = (word) => (PV_BY_VERB && PV_BY_VERB.get(word.toLowerCase())) || [];
// Example with the phrasal verb highlighted (both bracket groups).
const pvHTML = (r) => esc(r.ex).replace(/\[([^\]]+)\]/g, '<mark>$1</mark>');
// Three particles that do not make another phrasal verb with the same verb (so only one answer fits).
function pvDistractors(r) {
  const n = r.part.split(' ').length, taken = new Set(phrasalOf(r.verb).map((x) => x.part));
  const pool = [...new Set(PHRASAL.map((x) => x.part))].filter((p) => p.split(' ').length === n && !taken.has(p));
  return shuffle(pool).slice(0, 3);
}
const pvRows = (list, hi) => list.map((r) => `<button class="col-row${r.pv === hi ? ' on' : ''}" data-col="${esc(r.pv)}"><b>${esc(r.pv)}</b><span>${esc(r.th)}</span></button>`).join('');

let pvQuery = '';
function renderPhrasal() {
  if (!PHRASAL) { loadPhrasal().then(renderPhrasal); return; }
  $('#title').textContent = 'Phrasal verbs';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="pvBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="pvPlay">🧩 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${PHRASAL.length} คำ · กริยา + คำเล็กๆ (up, out, off …) ที่รวมกันแล้วได้ความหมายใหม่ เช่น give (ให้) → give up (เลิก) · แตะประโยคเพื่อฟัง</p>
    <input class="search" id="pvq" type="search" placeholder="ค้นหา เช่น look หรือ เลิก" value="${esc(pvQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหา phrasal verb">
    <div class="pair-list" id="pvList"></div>`;
  const paint = () => {
    const q = pvQuery.trim().toLowerCase();
    const list = q ? PHRASAL.filter((r) => r.pv.includes(q) || r.th.includes(q)) : PHRASAL;
    const verbs = [...new Set(list.map((r) => r.verb))].sort();
    $('#pvList').innerHTML = verbs.length ? verbs.map((v) => `<div class="card-box pair-card"><div class="pair-h"><b>${esc(v)}</b> <span class="small muted">${esc(WORD_BY[v] ? thFirst(WORD_BY[v].t) : '')}</span></div>
      ${list.filter((r) => r.verb === v).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span><b>${esc(r.pv)}</b> <span class="lvl-mini">${r.lv}</span> = ${esc(r.th)}</span><span>${pvHTML(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`).join('')}</div>`).join('')
      : '<p class="muted center">ไม่พบ phrasal verb นี้</p>';
  };
  paint();
  $('#pvq').oninput = (e) => { pvQuery = e.target.value; paint(); };
  $('#pvBack').onclick = () => go('games');
  $('#pvPlay').onclick = () => startGame('phrasal');
  $('#pvList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

/* ---------- word sheet extras ---------- */
// Fills the phrasal-verb and synonym boxes of the word sheet (el) for word w.
function lexisBoxes(el, w) {
  loadSyn().then(() => {
    const box = el.querySelector('#synBox'), gs = synGroups(w.w);
    if (box && gs.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>≈ คำเหมือน–คำตรงข้าม</b> (แตะเพื่อฟัง)</div>${gs.map((g) => synCard(g, w.w.toLowerCase())).join('')}`;
  });
  if (isVerb(w)) {
    loadPhrasal().then(() => {
      const box = el.querySelector('#pvBox'), list = phrasalOf(w.w);
      if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧩 Phrasal verbs</b> (แตะเพื่อฟัง)</div>${pvRows(list)}`;
    });
  }
}

/* ---------- synonyms & antonyms ---------- */
// synonyms.js: [{ th, s: [near-synonyms], a: [antonyms], tip }]; a word may be in several groups.
let SYN = null, SYN_OF = null;
const loadSyn = () => loadData('synonyms.js', 'SYNONYMS').then((rows) => {
  if (!SYN) {
    SYN = rows; SYN_OF = new Map();
    SYN.forEach((g) => g.s.forEach((x) => { if (!SYN_OF.has(x)) SYN_OF.set(x, []); SYN_OF.get(x).push(g); }));
  }
  return SYN;
});
const synGroups = (word) => (SYN_OF && SYN_OF.get(word.toLowerCase())) || [];
// Every listed synonym / antonym of a word over all its groups, plus words that list it as their antonym.
function synRel(word) {
  const gs = synGroups(word), syn = new Set(), ant = new Set();
  gs.forEach((g) => { g.s.forEach((x) => syn.add(x)); g.a.forEach((x) => ant.add(x)); });
  SYN.forEach((g) => { if (g.a.includes(word)) g.s.forEach((x) => ant.add(x)); });
  syn.delete(word);
  return { syn, ant };
}
// One question per (group, word): kind 's' = pick the near-synonym, 'a' = pick the opposite.
function synItems() {
  const out = [];
  SYN.forEach((g) => g.s.forEach((t) => {
    if (g.s.length >= 2) out.push({ g, t, kind: 's' });
    if (g.a.length) out.push({ g, t, kind: 'a' });
  }));
  return out;
}
// Options for a synonym/antonym question: the answer, one "trap" from the other relation, the rest unrelated.
function synQuestion(it) {
  const { syn, ant } = synRel(it.t);
  const answer = pick(it.kind === 's' ? it.g.s.filter((x) => x !== it.t) : it.g.a);
  const trapPool = [...(it.kind === 's' ? ant : syn)];
  const opts = [answer];
  if (trapPool.length) opts.push(pick(trapPool));
  const bad = new Set([it.t, ...(it.kind === 's' ? syn : ant)]);
  const all = shuffle([...new Set(SYN.flatMap((g) => g.s))]);
  for (const x of all) { if (opts.length >= 4) break; if (!bad.has(x) && !opts.includes(x)) opts.push(x); }
  return { answer, opts: shuffle(opts) };
}
const synChips = (list) => list.map((x) => `<button class="chip" data-col="${esc(x)}">${esc(x)}</button>`).join('');
const synCard = (g, hi) => `<div class="syn-g"><div class="small muted"><b>${esc(g.th)}</b></div>
  <div class="chips">${g.s.map((x) => `<button class="chip${x === hi ? ' on' : ''}" data-col="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  ${g.a.length ? `<div class="small muted" style="margin-top:6px">↔ ตรงข้าม</div><div class="chips">${synChips(g.a)}</div>` : ''}
  <div class="tip-box">💡 ${esc(g.tip)}</div></div>`;

let synQuery = '';
function renderSyn() {
  if (!SYN) { loadSyn().then(renderSyn); return; }
  $('#title').textContent = 'คำเหมือน–คำตรงข้าม';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="synBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="synPlay">≈ เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${SYN.length} กลุ่มคำความหมายใกล้เคียง พร้อมคำตรงข้ามและวิธีเลือกใช้ · แตะคำเพื่อฟัง</p>
    <input class="search" id="synq" type="search" placeholder="ค้นหา เช่น big หรือ ใหญ่" value="${esc(synQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาคำเหมือน">
    <div class="pair-list" id="synList"></div>`;
  const paint = () => {
    const q = synQuery.trim().toLowerCase();
    const list = q ? SYN.filter((g) => g.th.includes(q) || g.s.some((x) => x.includes(q)) || g.a.some((x) => x.includes(q))) : SYN;
    $('#synList').innerHTML = list.length ? list.map((g) => `<div class="card-box pair-card">${synCard(g)}</div>`).join('') : '<p class="muted center">ไม่พบคำนี้</p>';
  };
  paint();
  $('#synq').oninput = (e) => { synQuery = e.target.value; paint(); };
  $('#synBack').onclick = () => go('games');
  $('#synPlay').onclick = () => startGame('syn');
  $('#synList').onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
}
