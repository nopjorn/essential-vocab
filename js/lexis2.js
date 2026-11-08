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
  $('#rtBack').onclick = () => go('ref');
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
  $('#ukBack').onclick = () => go('ref');
  $('#ukList').onclick = (e) => { const b = e.target.closest('[data-uk]'); if (b) speakBoth(b.dataset.uk, b.dataset.us); };
}

/* ---------- work email & chat phrases (1.199.0) ---------- */
// data/workphr.js rows: [cat, phrase with the [key part], Thai, [3 wrong key parts], Thai tip]. Game `wphr` (qWphr in data/play.js), page renderWorkPhr().
const WP_CAT = { open: ['👋', 'เปิดอีเมล'], ask: ['🙏', 'ขอร้อง / สอบถาม'], follow: ['⏰', 'ติดตามงาน'], attach: ['📎', 'แนบไฟล์ / ส่งข้อมูล'], meet: ['🗓️', 'นัดประชุม'],
  opinion: ['💭', 'แสดงความเห็น'], sorry: ['🙇', 'แจ้งปัญหา / ขอโทษ'], thanks: ['💐', 'ขอบคุณ'], close: ['✍️', 'ปิดอีเมล'], chat: ['💬', 'แชตงาน'] };
let WORKPHR = null;
const loadWorkPhr = () => loadData('data/workphr.js', 'WORKPHR').then((rows) => {
  if (!WORKPHR && rows.length) WORKPHR = rows.map(([cat, en, th, wrong, tip]) => ({ cat, en, th, wrong, tip, key: en.match(/\[([^\]]+)\]/)[1], plain: en.replace(/[[\]]/g, '') }));
  return WORKPHR || [];
});
const wpHTML = (r, fill) => esc(r.en).replace(/\[([^\]]+)\]/, (m, k) => (fill == null ? `<mark>${k}</mark>` : fill));
const wpItems = () => WORKPHR.map((r) => ({ idx: -1, w: r.key, t: r.th, p: '', g: '', _wp: r, _q: [r.en.replace(/\[[^\]]+\]/, '___'), r.key, '', r.th] }));
// Three phrases from other categories (their meaning cannot be the asked one).
const wpOthers = (r) => shuffle(WORKPHR.filter((x) => x.cat !== r.cat)).slice(0, 3);
let wpCat = 'all';
let wpMode = null; // tests force 'fill' / 'pick'; null = either at random
function renderWorkPhr() {
  if (!WORKPHR) { withLoading(loadWorkPhr()).then(renderWorkPhr); return; }
  $('#title').textContent = 'สำนวนอีเมล / แชตงาน';
  view.scrollTop = 0;
  const cats = Object.keys(WP_CAT).filter((c) => WORKPHR.some((r) => r.cat === c));
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="wpBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="wpPlay">📧 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${WORKPHR.length} ประโยคพร้อมใช้ในอีเมลและแชตที่ทำงาน · ส่วนที่ไฮไลต์คือคำที่คนไทยมักใช้ผิด · แตะประโยคเพื่อฟัง</p>
    <div class="chips scroll" id="wpCats"><button class="chip" data-c="all">ทั้งหมด</button>${cats.map((c) => `<button class="chip" data-c="${c}">${WP_CAT[c][0]} ${WP_CAT[c][1]}</button>`).join('')}</div>
    <div class="pair-list" id="wpList"></div>`;
  const paint = () => {
    view.querySelectorAll('#wpCats .chip').forEach((c) => { const on = c.dataset.c === wpCat; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    $('#wpList').innerHTML = cats.filter((c) => wpCat === 'all' || c === wpCat).map((c) => `<div class="card-box pair-card"><div class="pair-h"><b>${WP_CAT[c][0]} ${WP_CAT[c][1]}</b></div>
      ${WORKPHR.filter((r) => r.cat === c).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span lang="en">${wpHTML(r)}</span><span>${esc(r.th)}</span><small class="muted">💡 ${esc(r.tip)}</small></button>`).join('')}</div>`).join('');
  };
  paint();
  $('#wpCats').onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) { wpCat = c.dataset.c; paint(); } };
  $('#wpBack').onclick = () => go('ref');
  $('#wpPlay').onclick = () => startGame('wphr');
  $('#wpList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

/* ---------- real-life texts (1.113) ---------- */
// data/realtext.js rows: [kind, Thai situation, text with ___, answer, [3 wrong words], Thai translation, list word?]. Game `real` (qReal in data/play.js).
let REALTEXT = null;
const RT_KIND = {
  sign: { icon: '🚧', name: 'ป้าย' }, announce: { icon: '📢', name: 'ประกาศ' }, menu: { icon: '🍽️', name: 'เมนู' },
  bill: { icon: '🧾', name: 'ใบเสร็จ / ใบแจ้งหนี้' }, label: { icon: '🏷️', name: 'ฉลาก' }, notice: { icon: '📋', name: 'ข้อความแจ้ง' }, plan: { icon: '🕒', name: 'ตาราง / ตั๋ว' },
};
const loadRealText = () => loadData('data/realtext.js', 'REALTEXT').then((rows) => {
  if (!REALTEXT) REALTEXT = rows.map(([kind, sit, text, right, wrong, th, lemma]) => ({ kind, sit, text, right, wrong, th, key: (lemma || right).toLowerCase() }));
  return REALTEXT;
});
const rtPlain = (r) => r.text.replace(/\n/g, ' ').replace('___', r.right);
/* ---------- TOEIC Part 5 (1.183.0) ---------- */
// data/toeicp5.js rows: [type, sentence with ___, answer, [3 wrong], Thai, tip]. Game `toeic5` (qP5 in data/play.js), own SRS in S.lex.
let TOEICP5 = null;
const P5_TYPE = { form: ['🔤', 'รูปคำ'], vocab: ['💡', 'ความหมาย'], gram: ['📐', 'ไวยากรณ์'] };
const loadP5 = () => loadData('data/toeicp5.js', 'TOEICP5').then((rows) => {
  if (!TOEICP5) TOEICP5 = rows.map(([type, text, right, wrong, th, tip]) => ({ type, text, right, wrong, th, tip }));
  return TOEICP5;
});
/* ---------- TOEIC Part 7 (1.184.0) ---------- */
// data/toeicp7.js: [{id, kind, title, text, th, q: [[question, [4 options], answer index, Thai]]}]. Game `toeic7` (qP7): one item per question,
// a round keeps the questions of one text together (p7Order); each question has its own SRS card in S.lex.
let TOEICP7 = null;
const P7_KIND = { email: ['📧', 'อีเมล'], notice: ['📌', 'ประกาศ'], ad: ['📣', 'โฆษณา'], memo: ['🗒️', 'บันทึกภายใน'], chat: ['💬', 'แชต'],
  invoice: ['🧾', 'ใบแจ้งหนี้'], schedule: ['🗓️', 'กำหนดการ'], article: ['📰', 'ข่าว'], review: ['⭐', 'รีวิว'] };
const loadP7 = () => loadData('data/toeicp7.js', 'TOEICP7').then((rows) => { if (!TOEICP7) TOEICP7 = rows; return TOEICP7; });
const p7Items = () => TOEICP7.flatMap((d) => d.q.map(([q, opts, a, th], k) => ({ idx: -1, w: opts[a], t: q, p: '', g: '', _p7: { d, k, q, opts, a, th }, _set: { d, k }, _q: [q, opts[a], '', th] })));
// A round = whole texts: the texts of the picked questions (due ones first, as lexPick chose them), each with all its questions
// in order, until there are at least `n` questions (a text is never cut in half). Items carry `_set = {d, k}` (Parts 3, 4, 6, 7).
function setOrder(picked, src, n = 10) {
  const ids = [...new Set(picked.map((w) => w._set.d.id))], out = [];
  for (const id of ids) {
    if (out.length >= n) break;
    out.push(...src.filter((w) => w._set.d.id === id).sort((x, y) => x._set.k - y._set.k));
  }
  return out;
}
const p7Order = setOrder;
const SET_GAMES = ['toeic3', 'toeic4', 'toeic6', 'toeic7'];
/* ---------- TOEIC Part 6 (1.185.0) ---------- */
// data/toeicp6.js: [{id, kind, title, text with [1]–[4], th, q: [[[4 options], answer index, Thai]]}]. Game `toeic6` (qP6): one item per blank,
// earlier blanks are shown filled in, the questions of a text stay together (setOrder); own SRS in S.lex.
let TOEICP6 = null;
const loadP6 = () => loadData('data/toeicp6.js', 'TOEICP6').then((rows) => { if (!TOEICP6) TOEICP6 = rows; return TOEICP6; });
const p6Items = () => TOEICP6.flatMap((d) => d.q.map(([opts, a, th], k) => {
  const r = { d, k, opts, a, th };
  return { idx: -1, w: opts[a], t: d.id + ' ' + (k + 1), p: '', g: '', _p6: r, _set: r, _q: [d.title + ' [' + (k + 1) + ']', opts[a], '', th] };
}));
/* ---------- TOEIC listening helpers (1.186.0) ---------- */
// tvPlay(lines, o) speaks [[voice, text], …] one after another: voice 0 = the learner's voice/accent, 1 = the other accent
// (US ↔ UK), 2 = Australian, like the mixed accents of the real test. o.on(k) before each line, o.done() at the end,
// o.slow, o.gap (ms between lines), o.el = stop once this element has left the page. A new tvPlay / tvStop() cancels the old one.
let tvTok = 0;
const tvAlt = () => (/GB/i.test(S.settings.accent || '') ? 'en-US' : 'en-GB');
function tvPlay(lines, o = {}) {
  const tok = ++tvTok;
  const step = (k) => {
    if (tok !== tvTok || (o.el && !document.body.contains(o.el))) return;
    if (k >= lines.length) { if (o.done) o.done(); return; }
    if (o.on) o.on(k);
    const [v, text] = lines[k], opt = { slow: !!o.slow };
    if (v === 1) opt.lang = tvAlt(); else if (v === 2) opt.lang = 'en-AU';
    const u = speak(text, opt);
    const nxt = () => setTimeout(() => step(k + 1), o.gap != null ? o.gap : 450);
    if (u) { u.onend = nxt; u.onerror = () => { if (tok === tvTok && o.done) o.done(); }; } else if (o.done) o.done();
  };
  step(0);
}
function tvStop() { tvTok++; if (window.speechSynthesis) speechSynthesis.cancel(); }
/* ---------- TOEIC Part 1 (1.189.0) ---------- */
// data/toeicp1.js rows: [emoji scene, Thai place, [4 statements], answer index, Thai, tip]. Game `toeic1` (qP1): the "photo" is an emoji scene,
// (A)–(D) are spoken, text hidden until 📝 or the answer; own SRS in S.lex.
let TOEICP1 = null;
const loadP1 = () => loadData('data/toeicp1.js', 'TOEICP1').then((rows) => {
  if (!TOEICP1) TOEICP1 = rows.map(([scene, place, opts, a, th, tip]) => ({ scene, place, opts, a, right: opts[a], th, tip }));
  return TOEICP1;
});
const p1Items = () => TOEICP1.map((r) => ({ idx: -1, w: r.right, t: r.scene, p: '', g: '', _p1: r, _q: [r.scene + ' ' + r.place, r.right, '', r.th] }));
/* ---------- TOEIC Part 2 (1.186.0) ---------- */
// data/toeicp2.js rows: [type, question, right, [2 wrong], Thai, tip]. Game `toeic2` (qP2): question + (A) (B) (C) are spoken, text hidden
// until 📝 or the answer; own SRS in S.lex.
let TOEICP2 = null;
const P2_TYPE = { wh: ['❓', 'คำถาม Wh-'], yn: ['✅', 'คำถาม Yes/No'], choice: ['🔀', 'คำถามให้เลือก'], request: ['🙏', 'ขอร้อง ชวน เสนอ'],
  statement: ['💬', 'ประโยคบอกเล่า'], neg: ['🔁', 'คำถามปฏิเสธ/หางคำถาม'] };
const loadP2 = () => loadData('data/toeicp2.js', 'TOEICP2').then((rows) => {
  if (!TOEICP2) TOEICP2 = rows.map(([type, q, right, wrong, th, tip]) => ({ type, q, right, wrong, th, tip }));
  return TOEICP2;
});
const p2Items = () => TOEICP2.map((r) => ({ idx: -1, w: r.right, t: r.q, p: '', g: '', _p2: r, _q: [r.q, r.right, '', r.th] }));
/* ---------- TOEIC Parts 3 + 4 (1.187.0) ---------- */
// data/toeicp3.js (conversations) / data/toeicp4.js (talks): [{id, kind, lines: [[speaker, text]], th, q: [[question, [4 options], answer, Thai]]}].
// Games `toeic3` / `toeic4` (qP34): the audio plays on a text's first question, the questions and options are read on screen like the test,
// questions of one recording stay together (setOrder); own SRS in S.lex.
const P34 = { 3: null, 4: null };
const P34_KIND = { office: ['🏢', 'ที่ทำงาน'], phone: ['📞', 'โทรศัพท์'], shop: ['🛍️', 'ร้านค้า'], hotel: ['🏨', 'โรงแรม'], restaurant: ['🍽️', 'ร้านอาหาร'],
  travel: ['✈️', 'การเดินทาง'], announce: ['📢', 'ประกาศ'], voicemail: ['📱', 'ข้อความเสียง'], tour: ['🧭', 'นำเที่ยว'], radio: ['📻', 'วิทยุ'],
  meeting: ['🎤', 'ประชุม / กล่าวในงาน'], ad: ['📣', 'โฆษณา'] };
const P34_WHO = { M: ['👨', 'Man'], W: ['👩', 'Woman'], M2: ['🧔', 'Man 2'], W2: ['👱‍♀️', 'Woman 2'] };
const loadP34 = (n) => loadData(`data/toeicp${n}.js`, 'TOEICP' + n).then((rows) => { if (!P34[n]) P34[n] = rows; return P34[n]; });
const p34Items = (n) => P34[n].flatMap((d) => d.q.map(([q, opts, a, th], k) => {
  const r = { d, k, q, opts, a, th, part: n };
  return { idx: -1, w: opts[a], t: q, p: '', g: '', _p34: r, _set: r, _q: [q, opts[a], '', th] };
}));
// voices: speakers in order of appearance (0 = the learner's voice, 1 = the other accent, 2 = Australian); a talk's one speaker alternates by id.
function p34Lines(d) {
  const who = [...new Set(d.lines.map(([s]) => s))], solo = who.length === 1 ? d.id.length % 2 : 0;
  return d.lines.map(([s, text]) => [(who.indexOf(s) + solo) % 3, text]);
}
/* ---------- TOEIC mock test (1.194.0) ---------- */
// game `toeicMock`: 30 questions in test order — Part 1 ×3, Part 2 ×5, one Part 3 conversation, one Part 4 talk, Part 5 ×6, one Part 6
// text, two Part 7 texts — due/new questions first (lexPick per part). Answers go to each part's own S.lex keys; 36 s a question
// like the real test (200 in 2 h). The result gives a rough listening / reading score (5–495 each, NOT an ETS score), saved in S.mock.
const MOCK_SEC = 36;
const mockLoad = () => Promise.all([loadP1(), loadP2(), loadP34(3), loadP34(4), loadP5(), loadP6(), loadP7()]);
const mockReady = () => !!(TOEICP1 && TOEICP2 && P34[3] && P34[4] && TOEICP5 && TOEICP6 && TOEICP7);
function mockItems() {
  const tag = (g, list) => list.map((w) => Object.assign({}, w, { _part: g }));
  const one = (g, src, n) => tag(g, lexPick(g, src, n));
  const set = (g, src, n) => tag(g, setOrder(lexPick(g, src, 12), src, n));
  return [...one('toeic1', p1Items(), 3), ...one('toeic2', p2Items(), 5), ...set('toeic3', p34Items(3), 1), ...set('toeic4', p34Items(4), 1),
    ...one('toeic5', p5Items(), 6), ...set('toeic6', p6Items(), 1), ...set('toeic7', p7Items(), 4)];
}
// section score from the share right: 5 + 490 × share, to the nearest 5 (the scale of the real test, nothing more)
const mockScale = (ok, n) => (n ? Math.round((5 + 490 * ok / n) / 5) * 5 : 5);
function mockScore(p) {
  const sum = (ids) => ids.reduce((a, g) => [a[0] + ((p[g] || [0, 0])[0]), a[1] + ((p[g] || [0, 0])[1])], [0, 0]);
  const l = sum(['toeic1', 'toeic2', 'toeic3', 'toeic4']), r = sum(['toeic5', 'toeic6', 'toeic7']);
  return { L: mockScale(l[0], l[1]), R: mockScale(r[0], r[1]), l, r };
}
const p5Plain = (r) => r.text.replace('___', r.right);
const p5Items = () => TOEICP5.map((r) => ({ idx: -1, w: r.right, t: r.th, p: '', g: '', _p5: r, _q: [r.text, r.right, '', r.th] }));
const rtItems = () => REALTEXT.map((r) => ({ idx: -1, w: r.key, t: r.th, p: '', g: '', _rt: r, _q: [r.text.replace(/\n/g, ' '), r.right, '', r.th] }));

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
