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
// Fills the phrasal-verb box of the word sheet (el) for word w.
function lexisBoxes(el, w) {
  if (isVerb(w)) {
    loadPhrasal().then(() => {
      const box = el.querySelector('#pvBox'), list = phrasalOf(w.w);
      if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧩 Phrasal verbs</b> (แตะเพื่อฟัง)</div>${pvRows(list)}`;
    });
  }
}
