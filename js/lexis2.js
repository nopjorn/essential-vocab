'use strict';
// Word roots and UK ↔ US differences (1.104): reference pages, word-sheet boxes and the roots game data.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- word roots ---------- */
// data/roots.js rows: [root (variants with /), Thai meaning, group, origin note, [example words from the word list]].
let ROOT = null;
const loadRoots = () => loadData('data/roots.js', 'ROOTS').then((rows) => {
  if (!ROOT) ROOT = rows.map(([x, th, grp, note, ex]) => ({ x, th, grp, note, ex: ex.filter((w) => WORD_BY[w]), vs: x.split('/') }));
  return ROOT;
});
const rootVariant = (r, w) => r.vs.find((v) => w.toLowerCase().includes(v));
// The word with the root part in bold.
function rootHTML(r, w) {
  const v = rootVariant(r, w); if (!v) return esc(w);
  const i = w.toLowerCase().indexOf(v);
  return `${esc(w.slice(0, i))}<b class="af-w">${esc(w.slice(i, i + v.length))}</b>${esc(w.slice(i + v.length))}`;
}
const rootRows = (r, hi) => r.ex.map((w) => `<button class="col-row${w === hi ? ' on' : ''}" data-col="${esc(w)}"><b lang="en">${rootHTML(r, w)}</b><span>${esc(WORD_BY[w].t)}</span></button>`).join('');
// Game items: one question per (root, word); `t` carries the root so the result list and the review schedule tell two roots of one word apart.
const rootItems = () => ROOT.flatMap((r) => r.ex.filter((w) => rootVariant(r, w)).map((w) => ({
  idx: -1, w, t: `${WORD_BY[w].t} · ${r.x} = ${r.th}`, p: '', g: '', _rt: r, _q: [w, '', '', `${WORD_BY[w].t} · ${r.x} = ${r.th}`],
})));
// Three wrong meanings, never from the same group (spect / vis are both "see").
const rootDistractors = (r) => shuffle(ROOT.filter((b) => b.grp !== r.grp)).slice(0, 3);
let rootQuery = '';
function renderRoots() {
  if (!ROOT) { withLoading(loadRoots()).then(renderRoots); return; }
  $('#title').textContent = 'รากศัพท์';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="rtBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="rtPlay">🌱 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${ROOT.length} รากศัพท์ที่เจอบ่อยในคำระดับสูง รู้ราก = เดาความหมายคำใหม่ได้ เช่น <b>spect</b> = มอง → inspect, spectator, perspective</p>
    <input class="search" id="rtq" type="search" placeholder="ค้นหา เช่น spect หรือ มอง" value="${esc(rootQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหารากศัพท์">
    <div class="pair-list" id="rtList" style="margin-top:10px"></div>`;
  const paint = () => {
    const q = rootQuery.trim().toLowerCase();
    const list = ROOT.filter((r) => !q || r.x.includes(q) || r.th.includes(q) || r.ex.some((w) => w.includes(q)));
    $('#rtList').innerHTML = list.length ? list.map((r) => `<div class="card-box pair-card"><div class="row" style="align-items:baseline"><b class="af-word" lang="en">${esc(r.x)}</b><span class="grow"></span><b>${esc(r.th)}</b></div>
      <div class="small muted" style="margin:2px 0 6px">${esc(r.note)}</div>${rootRows(r)}</div>`).join('')
      : emptyArt({ kind: 'search', title: 'ไม่พบรากศัพท์นี้', sub: 'ลองพิมพ์ให้สั้นลง', sm: true });
  };
  paint();
  $('#rtq').oninput = (e) => { rootQuery = e.target.value; paint(); };
  $('#rtBack').onclick = () => go('games');
  $('#rtPlay').onclick = () => startGame('root');
  $('#rtList').onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
}

/* ---------- UK ↔ US ---------- */
// data/ukus.js rows: [British, American, Thai, kind 'w' (word) | 's' (spelling)].
let UKUS_LIST = null, UKUS_OF = null;
const loadUkUs = () => loadData('data/ukus.js', 'UKUS').then((rows) => {
  if (!UKUS_LIST) {
    UKUS_LIST = rows; UKUS_OF = new Map();
    rows.forEach((r) => [r[0], r[1]].forEach((w) => { const k = w.toLowerCase(); if (!UKUS_OF.has(k)) UKUS_OF.set(k, []); UKUS_OF.get(k).push(r); }));
  }
  return UKUS_LIST;
});
const ukusOf = (word) => (UKUS_OF && UKUS_OF.get(word.toLowerCase())) || [];
// Hear the British word, then the American one, each in its own accent whatever the setting says.
function speakBoth(uk, us) {
  const u = speak(uk, { slow: false, lang: 'en-GB' });
  const second = () => setTimeout(() => speak(us, { slow: false, lang: 'en-US' }), 350);
  if (u) { u.onend = second; u.onerror = second; }
}
const ukusRow = (r) => `<button class="col-row" data-uk="${esc(r[0])}" data-us="${esc(r[1])}"><span lang="en">🇬🇧 <b>${esc(r[0])}</b> ↔ 🇺🇸 <b>${esc(r[1])}</b></span><span>${esc(r[2])}</span></button>`;
let ukusKind = 'all', ukusQuery = '';
function renderUkUs() {
  if (!UKUS_LIST) { withLoading(loadUkUs()).then(renderUkUs); return; }
  $('#title').textContent = 'อังกฤษ–อเมริกัน';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="ukBack">‹ กลับ</button></div>
    <p class="small muted" style="margin:0 4px 10px">${UKUS_LIST.length} คู่ที่อังกฤษ 🇬🇧 กับอเมริกัน 🇺🇸 ใช้ต่างกัน แตะแถวเพื่อฟังเทียบสองสำเนียง (เสียงอังกฤษก่อน แล้วอเมริกัน) · ใช้ได้ทั้งสองแบบ แค่เลือกให้สม่ำเสมอ</p>
    <input class="search" id="ukq" type="search" placeholder="ค้นหา เช่น lift หรือ ลิฟต์" value="${esc(ukusQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาคำอังกฤษ–อเมริกัน">
    <div class="chips" id="ukKind" style="margin:10px 0">${[['all', 'ทั้งหมด'], ['w', '🗣️ คำศัพท์'], ['s', '✏️ การสะกด']].map(([k, t]) => `<button class="chip" data-k="${k}" aria-pressed="${ukusKind === k}">${t}</button>`).join('')}</div>
    <div class="pair-list" id="ukList"></div>`;
  const paint = () => {
    const q = ukusQuery.trim().toLowerCase();
    view.querySelectorAll('#ukKind .chip').forEach((c) => { const on = c.dataset.k === ukusKind; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    const list = UKUS_LIST.filter((r) => (ukusKind === 'all' || r[3] === ukusKind) && (!q || r[0].includes(q) || r[1].includes(q) || r[2].includes(q)));
    $('#ukList').innerHTML = list.length ? `<div class="card-box pair-card">${list.map(ukusRow).join('')}</div>` : emptyArt({ kind: 'search', title: 'ไม่พบคำนี้', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#ukq').oninput = (e) => { ukusQuery = e.target.value; paint(); };
  $('#ukKind').onclick = (e) => { const c = e.target.closest('[data-k]'); if (c) { ukusKind = c.dataset.k; paint(); } };
  $('#ukBack').onclick = () => go('games');
  $('#ukList').onclick = (e) => { const b = e.target.closest('[data-uk]'); if (b) speakBoth(b.dataset.uk, b.dataset.us); };
}

/* ---------- word sheet boxes ---------- */
function lexis2Boxes(el, w) {
  loadUkUs().then(() => {
    const box = el.querySelector('#ukBox'), list = ukusOf(w.w);
    if (box && list.length) {
      box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🇬🇧↔🇺🇸 อังกฤษ–อเมริกัน</b> (แตะเพื่อฟังเทียบ)</div>${list.map(ukusRow).join('')}`;
      box.onclick = (e) => { const b = e.target.closest('[data-uk]'); if (b) speakBoth(b.dataset.uk, b.dataset.us); };
    }
  });
  loadRoots().then(() => {
    const box = el.querySelector('#rtBox'), hits = ROOT.filter((r) => r.ex.includes(w.w) && rootVariant(r, w.w));
    if (box && hits.length) {
      box.innerHTML = hits.map((r) => `<div class="small muted" style="margin:12px 0 6px"><b>🌱 รากศัพท์</b> (แตะเพื่อฟัง)</div>
        <div class="tip-box" style="margin-top:0"><b class="af-word" lang="en">${rootHTML(r, w.w)}</b> · <b>${esc(rootVariant(r, w.w))}</b> = ${esc(r.th)}<div class="small muted">${esc(r.note)}</div></div>
        <div class="small muted" style="margin:10px 0 6px">คำอื่นที่มี ${esc(r.x)}</div>${rootRows({ ...r, ex: r.ex.filter((x) => x !== w.w).slice(0, 6) })}`).join('');
      box.onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
    }
  });
}
