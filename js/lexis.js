'use strict';
// Extra vocabulary knowledge: phrasal verbs, synonyms/antonyms, word parts (prefixes/suffixes), idioms and situations.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- lazy data files ---------- */
// loadData('data/phrasal.js', 'PHRASAL') → Promise of window.PHRASAL ([] if the file fails to load).
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
// data/phrasal.js rows: [phrasal, level, thai, example with [verb] and [particles], thai example]
let PHRASAL = null, PV_BY_VERB = null;
const loadPhrasal = () => loadData('data/phrasal.js', 'PHRASAL').then((rows) => {
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
  if (!PHRASAL) { withLoading(loadPhrasal()).then(renderPhrasal); return; }
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
  loadAffix().then(() => {
    const box = el.querySelector('#afBox'), hit = AFFIX_OF.get(w.w.toLowerCase());
    if (box && hit) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧱 ส่วนประกอบคำ</b></div>
      <div class="tip-box" style="margin-top:0"><b>${affixHTML(hit.a, hit.w)}</b> = <b>${affixLabel(hit.a)}</b> (${esc(hit.a.th)}) + ${esc(affixStem(hit.a, hit.w))}</div>
      <div class="small muted" style="margin:10px 0 6px">คำอื่นที่มี ${affixLabel(hit.a)} (แตะเพื่อฟัง)</div>${affixRows(hit.a, hit.w)}`;
  });
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
  loadIdioms().then(() => {
    const box = el.querySelector('#idBox'), list = idiomsOf(w.w);
    if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🎭 สำนวน</b> (แตะเพื่อฟัง)</div>${idRows(list.slice(0, 8))}`;
  });
}

/* ---------- idioms ---------- */
// data/idioms.js rows: [idiom, level, thai, example with the idiom as used in [brackets], thai example, meaning group?]
let IDIOMS = null, ID_OF = null;
// Words of an idiom that don't link it to the word sheet (too common to be its key word).
const ID_SKIP = new Set("a an the of in on at to for with by up out off and or as than like from into over under is be it its one you your my his her their our someone something that this all every has no not".split(' '));
const loadIdioms = () => loadData('data/idioms.js', 'IDIOMS').then((rows) => {
  if (!IDIOMS) {
    IDIOMS = rows.map(([id, lv, th, ex, exTh, grp]) => ({ id, lv, th, ex, exTh, grp: grp || '', plain: ex.replace(/[[\]]/g, '') }));
    ID_OF = new Map();
    IDIOMS.forEach((r) => new Set(r.id.toLowerCase().replace(/'s\b/g, '').match(/[a-z]+/g)).forEach((t) => {
      if (ID_SKIP.has(t) || !WORD_BY[t]) return;
      if (!ID_OF.has(t)) ID_OF.set(t, []);
      ID_OF.get(t).push(r);
    }));
  }
  return IDIOMS;
});
const idiomsOf = (word) => (ID_OF && ID_OF.get(word.toLowerCase())) || [];
// Example with the idiom highlighted / blanked out.
const idHTML = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<mark>$1</mark>');
const idBlank = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<span class="blank">_____</span>');
// Three other idioms, never one from the same meaning group (so only one option fits).
const idDistractors = (r) => shuffle(IDIOMS.filter((x) => x !== r && (!r.grp || x.grp !== r.grp))).slice(0, 3);
const idRows = (list, hi) => list.map((r) => `<button class="col-row${r.id === hi ? ' on' : ''}" data-col="${esc(r.id)}"><b>${esc(r.id)}</b><span>${esc(r.th)}</span></button>`).join('');

let idQuery = '';
function renderIdioms() {
  if (!IDIOMS) { withLoading(loadIdioms()).then(renderIdioms); return; }
  $('#title').textContent = 'สำนวน';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="idBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="idPlay">🎭 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${IDIOMS.length} สำนวน · กลุ่มคำที่แปลตรงตัวไม่ได้ ต้องจำทั้งก้อน เช่น piece of cake = ง่ายมาก · แตะประโยคเพื่อฟัง</p>
    <input class="search" id="idq" type="search" placeholder="ค้นหา เช่น ice หรือ ง่าย" value="${esc(idQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาสำนวน">
    <div class="pair-list" id="idList"></div>`;
  const paint = () => {
    const q = idQuery.trim().toLowerCase();
    const list = q ? IDIOMS.filter((r) => r.id.includes(q) || r.th.includes(q)) : IDIOMS;
    const lvs = ['A1', 'A2', 'B1', 'B2', 'C1'].filter((l) => list.some((r) => r.lv === l));
    $('#idList').innerHTML = lvs.length ? lvs.map((l) => `<div class="card-box pair-card"><div class="pair-h"><b>${l}</b> <span class="small muted">${list.filter((r) => r.lv === l).length} สำนวน</span></div>
      ${list.filter((r) => r.lv === l).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span><b lang="en">${esc(r.id)}</b> = ${esc(r.th)}</span><span lang="en">${idHTML(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`).join('')}</div>`).join('')
      : '<p class="muted center">ไม่พบสำนวนนี้</p>';
  };
  paint();
  $('#idq').oninput = (e) => { idQuery = e.target.value; paint(); };
  $('#idBack').onclick = () => go('games');
  $('#idPlay').onclick = () => startGame('idiom');
  $('#idList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

/* ---------- situations ---------- */
// data/situations.js: [{ id, icon, th, en, tip, w: [[phrase, thai]], d: [[speaker, english, thai]] }]
let SIT = null;
const loadSit = () => loadData('data/situations.js', 'SITUATIONS').then((rows) => (SIT = rows));
// Item for the reply game: line k of a dialogue (k >= 1), answered after seeing line k − 1.
const sitItems = () => SIT.flatMap((st) => st.d.slice(1).map((l, k) => ({ st, k: k + 1 })));
// Three lines from other situations' dialogues as wrong replies.
const sitDistractors = (st) => shuffle(SIT.filter((x) => x !== st).flatMap((x) => x.d.slice(1).map((l) => l[1]))).slice(0, 3);

let sitPlayTok = 0;
function renderSit(id) {
  if (!SIT) { withLoading(loadSit()).then(() => renderSit(id)); return; }
  sitPlayTok++;
  const st = id && SIT.find((x) => x.id === id);
  view.scrollTop = 0;
  if (!st) {
    $('#title').textContent = 'ศัพท์ตามสถานการณ์';
    view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="sitBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="sitPlay">🗨️ เล่นเกม</button></div>
      <p class="small muted" style="margin:0 4px 10px">${SIT.length} สถานการณ์ที่เจอบ่อย แต่ละเรื่องมีคำ/วลีสำคัญและบทสนทนาสั้นๆ ให้ฟังและพูดตาม</p>
      <div class="sit-grid" id="sitList">${SIT.map((x) => `<button class="sit-tile" data-sit="${x.id}"><span class="sit-ic">${x.icon}</span><b>${esc(x.th)}</b><small class="muted" lang="en">${esc(x.en)}</small></button>`).join('')}</div>`;
    $('#sitBack').onclick = () => go('games');
    $('#sitPlay').onclick = () => startGame('sit');
    $('#sitList').onclick = (e) => { const b = e.target.closest('[data-sit]'); if (b) renderSit(b.dataset.sit); };
    return;
  }
  $('#title').textContent = `${st.icon} ${st.th}`;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="sitBack">‹ สถานการณ์</button><div class="grow"></div><button class="btn primary" id="sitAll">▶️ ฟังบทสนทนา</button></div>
    <div class="card-box"><div class="h2" style="margin:0 0 2px">${st.icon} ${esc(st.th)}</div><div class="small muted" lang="en">${esc(st.en)}</div>
      <div class="tip-box">💡 ${esc(st.tip)}</div></div>
    <div class="card-box"><div class="small muted" style="margin-bottom:8px"><b>🔑 คำและวลีสำคัญ</b> (แตะเพื่อฟัง)</div>
      ${st.w.map(([en, th]) => `<button class="col-row" data-col="${esc(en)}"><b lang="en">${esc(en)}</b><span>${esc(th)}</span></button>`).join('')}</div>
    <div class="card-box"><div class="small muted" style="margin-bottom:4px"><b>🗨️ บทสนทนา</b> (แตะประโยคเพื่อฟัง)</div>
      <div id="sitDlg">${st.d.map(([who, en, th], k) => `<button class="dlg-line${k % 2 ? ' alt' : ''}" data-k="${k}"><small class="muted">${esc(who)}</small><span lang="en">${esc(en)}</span><small class="muted">${esc(th)}</small></button>`).join('')}</div></div>`;
  $('#sitBack').onclick = () => renderSit();
  view.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => speak(b.dataset.col)));
  const lines = [...view.querySelectorAll('.dlg-line')];
  const on = (k) => lines.forEach((b, j) => b.classList.toggle('on', j === k));
  $('#sitDlg').onclick = (e) => { const b = e.target.closest('.dlg-line'); if (b) { sitPlayTok++; on(+b.dataset.k); speak(st.d[+b.dataset.k][1]); } };
  // Whole dialogue: one line after another (a new tap, another page or leaving stops it).
  $('#sitAll').onclick = () => {
    const tok = ++sitPlayTok;
    const step = (k) => {
      if (tok !== sitPlayTok || !document.body.contains(lines[0]) || k >= st.d.length) { if (tok === sitPlayTok) on(-1); return; }
      on(k);
      const u = speak(st.d[k][1]);
      if (u) { u.onend = () => setTimeout(() => step(k + 1), 400); u.onerror = () => { if (tok === sitPlayTok) on(-1); }; } else on(-1);
    };
    step(0);
  };
}

/* ---------- synonyms & antonyms ---------- */
// data/synonyms.js: [{ th, s: [near-synonyms], a: [antonyms], tip }]; a word may be in several groups.
let SYN = null, SYN_OF = null;
const loadSyn = () => loadData('data/synonyms.js', 'SYNONYMS').then((rows) => {
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
  if (!SYN) { withLoading(loadSyn()).then(renderSyn); return; }
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

/* ---------- word parts (prefixes / suffixes) ---------- */
// data/affixes.js: [{ x, k: 'p'|'s', th, note, ex: [[word, thai], ...] }]
let AFFIX = null, AFFIX_OF = null;
const loadAffix = () => loadData('data/affixes.js', 'AFFIXES').then((rows) => {
  if (!AFFIX) {
    AFFIX = rows; AFFIX_OF = new Map();
    AFFIX.forEach((a) => a.ex.forEach(([w, th]) => AFFIX_OF.set(w, { a, w, th })));
  }
  return AFFIX;
});
const affixLabel = (a) => (a.k === 'p' ? a.x + '-' : '-' + a.x);
const affixStem = (a, w) => (a.k === 'p' ? w.slice(a.x.length) : w.slice(0, -a.x.length));
const affixJoin = (a, stem) => (a.k === 'p' ? a.x + stem : stem + a.x);
// Word split into base + highlighted affix, e.g. un|happy.
const affixHTML = (a, w) => (a.k === 'p' ? `<mark>${esc(a.x)}</mark>${esc(affixStem(a, w))}` : `${esc(affixStem(a, w))}<mark>${esc(a.x)}</mark>`);
// Affixes of the same kind that do not make a real word with this base (so only one answer fits).
function affixDistractors(a, w) {
  const stem = affixStem(a, w);
  const real = (x) => AFFIX_OF.has(x) || WORD_BY[x];
  return shuffle(AFFIX.filter((b) => b.k === a.k && b.x !== a.x && !real(affixJoin(b, stem)))).slice(0, 3);
}
const affixRows = (a, hi) => a.ex.map(([w, th]) => `<button class="col-row${w === hi ? ' on' : ''}" data-col="${esc(w)}"><b>${affixHTML(a, w)}</b><span>${esc(th)}</span></button>`).join('');

let affixQuery = '';
function renderAffix() {
  if (!AFFIX) { withLoading(loadAffix()).then(renderAffix); return; }
  $('#title').textContent = 'อุปสรรค–ปัจจัย';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="afBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="afPlay">🧱 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">รู้ความหมายของส่วนหน้า (prefix) และส่วนท้ายคำ (suffix) แล้วเดาความหมายคำใหม่ได้เอง เช่น un- (ไม่) + happy = ไม่มีความสุข · แตะคำเพื่อฟัง</p>
    <input class="search" id="afq" type="search" placeholder="ค้นหา เช่น un หรือ ful หรือ ไม่" value="${esc(affixQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาอุปสรรคและปัจจัย">
    <div id="afList"></div>`;
  const paint = () => {
    const q = affixQuery.trim().toLowerCase().replace(/-/g, '');
    const hit = (a) => !q || a.x.includes(q) || a.th.includes(q) || a.ex.some(([w, th]) => w.includes(q) || th.includes(q));
    const part = (k, h) => { const list = AFFIX.filter((a) => a.k === k && hit(a)); return list.length ? `<div class="h2">${h}</div><div class="pair-list">${list.map((a) => `<div class="card-box pair-card"><div class="pair-h"><b class="af-x">${affixLabel(a)}</b> <span>= ${esc(a.th)}</span></div>
      ${a.note ? `<div class="small muted" style="margin:4px 0 6px">${esc(a.note)}</div>` : ''}${affixRows(a)}</div>`).join('')}</div>` : ''; };
    const html = part('p', '⬅️ อุปสรรค (prefix) — เติมหน้าคำ') + part('s', '➡️ ปัจจัย (suffix) — เติมท้ายคำ');
    $('#afList').innerHTML = html || '<p class="muted center">ไม่พบ</p>';
  };
  paint();
  $('#afq').oninput = (e) => { affixQuery = e.target.value; paint(); };
  $('#afBack').onclick = () => go('games');
  $('#afPlay').onclick = () => startGame('affix');
  $('#afList').onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
}
