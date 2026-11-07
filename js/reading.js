'use strict';
// Short-story library and reader.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- reading (short stories) ---------- */
// data/stories/<level>.js: each file pushes { id, level, emoji, title, titleTh, en: [paragraphs], th: [paragraphs], q: [{ q, o: [3], a }] }
// onto window.STORIES. Loaded on first use so app start stays fast; the service worker still caches them offline.
const STORY_FILES = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'real']; // 'real' (1.103) = dialogues and emails, `kind` on each story
const KIND_LABEL = { dialogue: '💬 บทสนทนา', email: '✉️ อีเมล' };
let STORIES = null, storyFail = false;
const STORY_COUNT = 115;
function loadStories() {
  if (STORIES) return Promise.resolve(STORIES);
  window.STORIES = [];
  const one = (f) => new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/stories/' + f + '.js?v=' + APP_VERSION;
    sc.onload = res;
    sc.onerror = () => { storyFail = true; loadFailed('data/stories/' + f + '.js'); res(); };
    document.head.appendChild(sc);
  });
  storyFail = false;
  return Promise.all(STORY_FILES.map(one)).then(() => loadIrregular()).then(() => {
    const out = window.STORIES.sort((a, b) => a.id - b.id);
    if (!storyFail) STORIES = out; // 1.123: a partial load (offline) is used now but not kept, so the next visit tries again
    return out;
  });
}
// data/collocations.js: window.COLLOC = { headword: [[phrase, thai], ...] } — lazy-loaded like stories.
let COLLOC = window.COLLOC || null;
function loadColloc() {
  if (COLLOC) return Promise.resolve(COLLOC);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/collocations.js?v=' + APP_VERSION;
    sc.onload = () => res((COLLOC = window.COLLOC || {}));
    sc.onerror = () => { loadFailed('data/collocations.js'); ON_ONLINE.push(() => { if (COLLOC && !Object.keys(COLLOC).length) COLLOC = null; }); res((COLLOC = {})); }; // 1.123: loads again once online
    document.head.appendChild(sc);
  });
}
// A collocation question for a headword: one of its phrases with the word blanked, plus 4 options.
function collocQ(w) {
  const stem = w.w.length > 3 ? w.w.replace(/[ey]$/, '') : w.w;
  const re = new RegExp(`\\b${w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*|\\b${stem.replace(/[^a-z-]/gi, '')}\\w*`, 'i');
  const list = COLLOC[w.w].filter(([en]) => re.test(en));
  const [phrase, th] = pick(list.length ? list : COLLOC[w.w]);
  const hit = phrase.match(re);
  const shown = hit ? phrase.replace(hit[0], '\u0000') : phrase;
  const others = shuffle(Object.keys(COLLOC).filter((k) => k !== w.w && (!hit || !re.test(k)))).filter((k) => { const x = WORD_BY[k]; return x && x.p.split('/')[0] === w.p.split('/')[0]; }).slice(0, 3);
  while (others.length < 3) { const k = pick(Object.keys(COLLOC)); if (k !== w.w && !others.includes(k)) others.push(k); }
  return { phrase, th, shown, opts: shuffle([w.w, ...others]) };
}
// data/pairs.js: window.CONFUSE (confusable words) + window.MINPAIRS (sound pairs) — lazy-loaded.
let CONFUSE = window.CONFUSE || null, MINPAIRS = window.MINPAIRS || [], MINPAIRS_TIP = window.MINPAIRS_TIP || {};
function loadPairs() {
  if (CONFUSE) return Promise.resolve(CONFUSE);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/pairs.js?v=' + APP_VERSION;
    const done = () => { CONFUSE = window.CONFUSE || []; MINPAIRS = window.MINPAIRS || []; MINPAIRS_TIP = window.MINPAIRS_TIP || {}; res(CONFUSE); };
    sc.onload = done; sc.onerror = () => { loadFailed('data/pairs.js'); ON_ONLINE.push(() => { if (CONFUSE && !CONFUSE.length) CONFUSE = null; }); done(); };
    document.head.appendChild(sc);
  });
}
// data/families.js: window.FAMILIES = [{ f: [[word, pos, thai], ...], q: [[sentence ___, answer, thai], ...] }] — lazy-loaded.
let FAMILIES = window.FAMILIES || null, FAMILY_OF = null;
function loadFamilies() {
  if (FAMILIES) return Promise.resolve(FAMILIES);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/families.js?v=' + APP_VERSION;
    const done = () => { FAMILIES = window.FAMILIES || []; res(FAMILIES); };
    sc.onload = done; sc.onerror = () => { loadFailed('data/families.js'); ON_ONLINE.push(() => { if (FAMILIES && !FAMILIES.length) { FAMILIES = null; FAMILY_OF = null; } }); done(); };
    document.head.appendChild(sc);
  });
}
// The family a list word belongs to (or undefined).
function familyOf(word) {
  if (!FAMILIES) return undefined;
  if (!FAMILY_OF) { FAMILY_OF = new Map(); FAMILIES.forEach((f) => f.f.forEach(([w]) => FAMILY_OF.set(w, f))); }
  return FAMILY_OF.get(word.toLowerCase());
}
const WORD_BY = new Proxy({}, { get: (_, k) => { if (!WORD_INDEX) lookupWord('a'); return WORD_INDEX.get(String(k).toLowerCase()); } });
let WORD_INDEX = null;
// Find the word-list entry for a token in a story, trying simple English endings.
function lookupWord(tok) {
  if (!WORD_INDEX) { WORD_INDEX = new Map(); W.forEach((w) => { const k = w.w.toLowerCase(); if (!/\s/.test(k) && !WORD_INDEX.has(k)) WORD_INDEX.set(k, w); }); }
  const t = tok.toLowerCase().replace(/[’']s$/, '');
  const irr = IRR_FORM && IRR_FORM.get(t); // went / found / left → go / find / leave
  if (irr && WORD_INDEX.has(irr.v1)) return WORD_INDEX.get(irr.v1);
  const tries = [t];
  if (t.endsWith('ies')) tries.push(t.slice(0, -3) + 'y');
  if (t.endsWith('es')) tries.push(t.slice(0, -2));
  if (t.endsWith('s')) tries.push(t.slice(0, -1));
  if (t.endsWith('ied')) tries.push(t.slice(0, -3) + 'y');
  if (t.endsWith('ed')) tries.push(t.slice(0, -2), t.slice(0, -1), t.slice(0, -3));
  if (t.endsWith('ing')) tries.push(t.slice(0, -3), t.slice(0, -3) + 'e', t.slice(0, -4));
  if (t.endsWith('er')) tries.push(t.slice(0, -2), t.slice(0, -1));
  if (t.endsWith('est')) tries.push(t.slice(0, -3), t.slice(0, -2));
  if (t.endsWith('ly')) tries.push(t.slice(0, -2));
  for (const x of tries) if (WORD_INDEX.has(x)) return WORD_INDEX.get(x);
  return null;
}
// Highlights the spoken word of a story paragraph with the CSS Custom Highlight API (el = the paragraph, start/len = the speech boundary); hlWord(null) clears it.
function hlWord(el, start, len) {
  if (!(window.CSS && CSS.highlights && window.Highlight)) return;
  CSS.highlights.delete('speaking');
  if (!el || start == null) return;
  const text = el.textContent;
  const end = start + (len || (text.slice(start).match(/^[A-Za-z0-9’']+/) || [''])[0].length || 1);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let pos = 0, n, sNode, sOff = 0, eNode, eOff = 0;
  while ((n = tw.nextNode())) {
    const L = n.nodeValue.length;
    if (!sNode && start < pos + L) { sNode = n; sOff = start - pos; }
    if (sNode && end <= pos + L) { eNode = n; eOff = end - pos; break; }
    pos += L;
  }
  if (!sNode || !eNode) return;
  const range = document.createRange();
  range.setStart(sNode, sOff); range.setEnd(eNode, eOff);
  CSS.highlights.set('speaking', new Highlight(range));
}
function storyHTML(text) {
  return esc(text).replace(/[A-Za-z][A-Za-z’']*/g, (tok) => {
    const w = lookupWord(tok);
    return w ? `<span class="rw ${status(w)}" data-i="${w.idx}">${tok}</span>` : tok;
  });
}
// Words too common to point at a paragraph (🔎 ดูในเรื่อง)
const STOP_EN = new Set('the and was were what who why how when where which did does that this with for from they them their there then than she her his him had has have not but are you your our its into about after before because would could should will can only very just also some what\'s'.split(' '));
const RLEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RLV_TH = { A1: 'ง่ายมาก', A2: 'ง่าย', B1: 'ปานกลาง', B2: 'ท้าทาย', C1: 'ขั้นสูง', C2: 'ระดับเชี่ยวชาญ' };
const FONT_SIZES = [16, 18, 21];
let readFilter = 'all';
// Per-story numbers for the list and the header: length, minutes, list words, unknown list words.
const storyInfoCache = new Map();
function storyInfo(st) {
  if (!storyInfoCache.has(st.id)) {
    const toks = st.en.join(' ').match(/[A-Za-z][A-Za-z’']*/g) || [];
    const seen = new Map();
    toks.forEach((t) => { const w = lookupWord(t); if (w) seen.set(w.idx, w); });
    storyInfoCache.set(st.id, { words: toks.length, mins: Math.max(1, Math.round(toks.length / 110)), list: [...seen.values()] });
  }
  const inf = storyInfoCache.get(st.id);
  const fresh = inf.list.filter((w) => status(w) === 'new');
  return { ...inf, fresh, known: inf.list.length ? Math.round(100 * (1 - fresh.length / inf.list.length)) : 100 };
}
// The suggested story: first unread one at the highest level the user studies (else the lowest unread).
function nextStory() {
  const lv = S.settings.levels.map((g) => (g === 'B2x' ? 'B2' : g)).filter((g) => RLEVELS.includes(g)).sort().pop() || 'A1';
  return STORIES.find((st) => st.level === lv && !S.read[st.id]) || STORIES.find((st) => !S.read[st.id]) || null;
}
const scoreTag = (st) => {
  const sc = S.readScore[st.id];
  if (!S.read[st.id]) return '';
  return sc ? `<span class="st-score ${sc[0] === sc[1] ? 'full' : ''}">${sc[0] === sc[1] ? '★' : '✓'} ${sc[0]}/${sc[1]}</span>` : '<span class="st-score full">✓</span>';
};
function renderRead(id) {
  if (!STORIES) {
    view.innerHTML = SKELETON;
    loadStories().then(() => { if (current === 'read') renderRead(id); });
    return;
  }
  if (!STORIES.length) { view.innerHTML = '<p class="center muted">โหลดเรื่องสั้นไม่สำเร็จ ลองต่อเน็ตแล้วเปิดใหม่นะ</p>'; return; }
  if (id == null) return renderLibrary();
  const st = STORIES.find((x) => x.id === id);
  if (!st) return go('read');
  $('#title').textContent = 'อ่านเรื่องสั้น';
  const inf = storyInfo(st);
  let showTh = false, playing = -1, token = 0, slow = false;
  const answers = [];
  const font = () => FONT_SIZES[S.settings.rFont != null ? S.settings.rFont : 1];
  view.innerHTML = `<div class="read-bar"><div class="read-prog" id="rProg"></div></div>
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="rBack">‹ ห้องสมุด</button></div>
    <div class="st-hero lv-${st.level}">
      <div class="st-emoji">${st.emoji || '📖'}</div>
      <div class="st-h1">${esc(st.title)}</div><div class="st-h2">${esc(st.titleTh)}</div>
      <div class="st-meta">${st.kind ? `<span>${KIND_LABEL[st.kind]}</span>` : ''}<span>${LV_LABEL[st.level]} · ${RLV_TH[st.level]}</span><span>⏱ ${inf.mins} นาที</span><span>📝 ${inf.words} คำ</span><span>${inf.known ? `🧠 รู้แล้ว ${inf.known}%` : `✨ คำใหม่ ${inf.fresh.length}`}</span></div>
    </div>
    <div class="st-tools">
      <button class="tool" id="rAll"><span>▶️</span>ฟังทั้งเรื่อง</button>
      <button class="tool" id="rTh"><span>🇹🇭</span>คำแปล</button>
      <button class="tool" id="rEar"><span>🎧</span>ฟังอย่างเดียว</button>
      <button class="tool" id="rFont"><span>Aa</span>ขนาดตัวอักษร</button>
      <button class="tool" id="rSlow" aria-pressed="false"><span>🐢</span>อ่านช้า</button>
      <button class="tool" id="rShadow"><span>🗣️</span>พูดตาม</button>
      <button class="tool" id="rBook"><span>📖</span>โหมดหนังสือ</button>
    </div>
    <article class="card-box story lv-${st.level}${st.kind ? ' k-' + st.kind : ''}" id="rText" style="--st-font:${font()}px">
      ${st.en.map((para, k) => `<div class="st-para" data-k="${k}"><p class="st-p" lang="en">${storyHTML(para)}</p>
        <div class="st-row"><button class="st-say" data-para="${k}" aria-label="ฟังย่อหน้านี้">🔊</button><button class="st-thbtn" data-th="${k}">แปลย่อหน้านี้</button></div>
        <p class="st-th" hidden>${esc(st.th[k] || '')}</p></div>`).join('')}
      <div class="st-legend small muted">แตะคำที่ขีดเส้นใต้เพื่อดูความหมาย · <span class="rw learning">กำลังเรียน</span> <span class="rw mastered">จำได้แล้ว</span></div>
    </article>
    ${inf.fresh.length ? `<div class="h2">✨ คำใหม่ในเรื่องนี้ <span class="small muted">${inf.fresh.length} คำ</span></div>
      <div class="card-box"><div class="chips st-words">${[...inf.fresh].sort((a, b) => LEVELS.indexOf(b.g) - LEVELS.indexOf(a.g)).slice(0, 16).map((w) => `<button class="chip" data-wi="${w.idx}">${esc(w.w)}</button>`).join('')}</div>
      <p class="small muted" style="margin:10px 2px 0">แตะคำเพื่อดูความหมาย แล้วกด ⭐ ติดดาวไว้ทบทวนทีหลังได้</p></div>` : ''}
    <div class="st-qhead"><div class="h2">❓ คำถามท้ายเรื่อง <span class="small muted">${st.q.length} ข้อ</span></div>
      <div class="st-qdots" id="rDots" aria-hidden="true">${st.q.map((_, k) => `<i data-d="${k}"></i>`).join('')}</div></div>
    ${st.q.map((q, k) => `<div class="card-box st-q" data-qk="${k}"><div class="st-qtop"><span class="st-qn">ข้อ ${k + 1}</span><span class="st-qof">จาก ${st.q.length}</span></div><b class="st-qq" lang="en">${esc(q.q)}</b>
      <div class="options" style="margin-top:10px" data-q="${k}">${q.o.map((o, j) => `<button class="opt" data-j="${j}" lang="en">${esc(o)}</button>`).join('')}</div>
      <div class="st-qfoot" hidden><span class="st-qres"></span><button class="st-find" data-find="${k}">🔎 ดูในเรื่อง</button></div></div>`).join('')}
    <div id="rDone"></div>`;
  const paras = [...view.querySelectorAll('.st-para')];
  const stop = () => { token++; playing = -1; hlWord(null); paras.forEach((p) => p.classList.remove('playing')); $('#rAll').innerHTML = '<span>▶️</span>ฟังทั้งเรื่อง'; if (window.speechSynthesis) speechSynthesis.cancel(); };
  // Read paragraph k, highlight it, then continue with the next one when `chain` is set.
  const play = (k, chain) => {
    const my = ++token;
    paras.forEach((p, j) => p.classList.toggle('playing', j === k));
    playing = k;
    $('#rAll').innerHTML = chain ? '<span>⏸</span>หยุดฟัง' : '<span>▶️</span>ฟังทั้งเรื่อง';
    if (chain) paras[k].scrollIntoView({ behavior: 'smooth', block: 'center' });
    const u = speak(st.en[k], { slow });
    // Word-by-word highlight while a paragraph is read (voices that send no word boundaries keep the whole-paragraph highlight)
    if (u) u.onboundary = (ev) => { if (my === token && (!ev.name || ev.name === 'word')) hlWord(paras[k].querySelector('.st-p'), ev.charIndex, ev.charLength); };
    const next = () => { if (my !== token || current !== 'read') return; hlWord(null); if (chain && k + 1 < paras.length) play(k + 1, true); else stop(); };
    if (u) { u.onend = next; u.onerror = () => { if (my === token) stop(); }; } else stop();
  };
  $('#rBack').onclick = () => go('read');
  $('#rTh').onclick = () => {
    showTh = !showTh;
    view.querySelectorAll('.st-th').forEach((x) => (x.hidden = !showTh));
    view.querySelectorAll('.st-thbtn').forEach((x) => (x.textContent = showTh ? 'ซ่อนคำแปล' : 'แปลย่อหน้านี้'));
    $('#rTh').classList.toggle('on', showTh);
  };
  // Listening mode: text is blurred until tapped, so the story is understood by ear first.
  const ear = (on) => {
    $('#rText').classList.toggle('ear', on); $('#rEar').classList.toggle('on', on);
    paras.forEach((p) => p.classList.remove('shown'));
    if (on) toast('ฟังก่อนแล้วตอบคำถาม แตะย่อหน้าเพื่อดูข้อความ 🎧');
  };
  $('#rEar').onclick = () => ear(!$('#rText').classList.contains('ear'));
  $('#rFont').onclick = () => { S.settings.rFont = ((S.settings.rFont != null ? S.settings.rFont : 1) + 1) % FONT_SIZES.length; save(); $('#rText').style.setProperty('--st-font', font() + 'px'); };
  $('#rSlow').onclick = () => { slow = !slow; $('#rSlow').classList.toggle('on', slow); $('#rSlow').setAttribute('aria-pressed', slow); toast(slow ? 'อ่านออกเสียงช้าลง 🐢' : 'กลับมาอ่านความเร็วปกติ'); };
  $('#rShadow').onclick = () => { cleanup(); cleanup = null; shadowStory(st, slow); };
  $('#rBook').onclick = () => { stop(); openBook(st, { done: () => { const q = view.querySelector('.st-q'); if (q) q.scrollIntoView({ block: 'start' }); } }); };
  $('#rAll').onclick = () => (playing >= 0 && $('#rAll').textContent.includes('หยุด') ? stop() : play(0, true));
  const onScroll = () => { const max = view.scrollHeight - view.clientHeight; const bar = $('#rProg'); if (bar) bar.style.width = (max > 0 ? Math.min(100, (100 * view.scrollTop) / max) : 100) + '%'; };
  view.addEventListener('scroll', onScroll, { passive: true });
  // 🔎 the paragraph that shares the most content words with the question + its answer
  const findInStory = (k) => {
    const q = st.q[k], toks = (q.q + ' ' + q.o[q.a]).toLowerCase().match(/[a-z][a-z']{2,}/g) || [];
    const keys = toks.filter((t) => !STOP_EN.has(t));
    let best = 0, bestN = -1;
    st.en.forEach((p, j) => {
      const low = p.toLowerCase();
      const n = keys.reduce((a, t) => a + (low.includes(t) ? (t.length > 5 ? 2 : 1) : 0), 0);
      if (n > bestN) { bestN = n; best = j; }
    });
    if (/last sentence|the ending|final scene/i.test(q.q)) best = paras.length - 1;
    const el = paras[best]; if (!el) return;
    if ($('#rText').classList.contains('ear')) el.classList.add('shown');
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const retry = () => {
    answers.length = 0;
    view.querySelectorAll('.st-q').forEach((c) => {
      c.classList.remove('ok', 'bad');
      c.querySelector('[data-q]').removeAttribute('data-done');
      c.querySelectorAll('.opt').forEach((o) => o.classList.remove('correct', 'wrong'));
      c.querySelector('.st-qfoot').hidden = true;
    });
    view.querySelectorAll('#rDots i').forEach((d) => (d.className = ''));
    $('#rDone').innerHTML = '';
    const first = view.querySelector('.st-qhead'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  view.onclick = (e) => {
    const pb = e.target.closest('[data-para]'); if (pb) return play(+pb.dataset.para, false);
    const hid = e.target.closest('.ear .st-para:not(.shown) .st-p'); if (hid) { hid.closest('.st-para').classList.add('shown'); return; }
    const tb = e.target.closest('[data-th]');
    if (tb) { const th = tb.closest('.st-para').querySelector('.st-th'); th.hidden = !th.hidden; tb.textContent = th.hidden ? 'แปลย่อหน้านี้' : 'ซ่อนคำแปล'; return; }
    const rw = e.target.closest('.rw[data-i], [data-wi]');
    if (rw) {
      const w = W[+(rw.dataset.i || rw.dataset.wi)]; speak(w.w);
      return openSheet(w, () => { view.querySelectorAll(`.rw[data-i="${w.idx}"]`).forEach((x) => (x.className = 'rw ' + status(w))); });
    }
    const fb = e.target.closest('[data-find]'); if (fb) return findInStory(+fb.dataset.find);
    if (e.target.closest('#rRetry')) return retry();
    const ob = e.target.closest('.opt'), box = ob && ob.closest('[data-q]');
    if (!ob || !box || box.dataset.done) return;
    const k = +box.dataset.q, ok = +ob.dataset.j === st.q[k].a;
    box.dataset.done = '1';
    box.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.j === st.q[k].a) o.classList.add('correct'); });
    if (!ok) ob.classList.add('wrong');
    const card = box.closest('.st-q');
    card.classList.add(ok ? 'ok' : 'bad');
    const foot = card.querySelector('.st-qfoot'); foot.hidden = false;
    foot.querySelector('.st-qres').textContent = ok ? '✓ ถูกต้อง' : '✗ ยังไม่ถูก';
    const dot = view.querySelector(`#rDots [data-d="${k}"]`); if (dot) dot.className = ok ? 'ok' : 'bad';
    sfx(ok ? 'ok' : 'bad'); markActive(!!ok);
    if (ok) addXP(5);
    answers[k] = ok;
    if (answers.filter((x) => x != null).length === st.q.length) {
      const right = answers.filter(Boolean).length, all = st.q.length;
      const first = !S.read[st.id];
      S.read[st.id] = today();
      const prev = S.readScore[st.id];
      if (storyBetter(prev, [right, all])) S.readScore[st.id] = [right, all];
      questEvent('story');
      if (right === all) confetti();
      const nextSt = nextStory();
      const done = STORIES.filter((x) => S.read[x.id]).length;
      $('#rDone').innerHTML = `<div class="card-box center pop st-done">
        <div class="st-ring" style="--p:${Math.round((100 * right) / all)}"><span>${right === all ? '🏆' : right ? '📖' : '💪'}</span></div>
        <div class="h2" style="margin:4px 0">ตอบถูก ${right}/${all}</div>
        <div class="small muted">${right === all ? 'เข้าใจทั้งเรื่องเลย เยี่ยมมาก!' : right / all >= 0.6 ? 'เข้าใจเรื่องได้ดี ลองกด 🔎 ดูข้อที่พลาดนะ' : 'ลองอ่านอีกรอบแล้วตอบใหม่ได้เลย'}</div>
        <div class="muted small">${first ? 'อ่านจบเรื่องใหม่! ' : ''}ห้องสมุดของคุณ ${done}/${STORIES.length} เรื่อง</div>
        <div class="st-stars">${Array.from({ length: all }, (_, i) => `<span class="${i < right ? 'on' : ''}">★</span>`).join('')}</div>
        ${nextSt ? `<button class="btn primary block" id="rNext">${nextSt.emoji || '📖'} เรื่องถัดไป: ${esc(nextSt.title)}</button>` : '<p>อ่านครบทุกเรื่องแล้ว เก่งมาก! 🎉</p>'}
        <div class="st-done-acts">${right < all ? '<button class="btn ghost" id="rRetry">🔁 ตอบใหม่</button>' : ''}<button class="btn ghost" id="rLib">กลับห้องสมุด</button></div></div>`;
      if (nextSt) $('#rNext').onclick = () => go('read', nextSt.id);
      $('#rLib').onclick = () => go('read');
      $('#rDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  cleanup = () => { closeBook(); view.onclick = null; view.removeEventListener('scroll', onScroll); token++; if (window.speechSynthesis) speechSynthesis.cancel(); };
}
// "Ready to read" (1.62): share of the words in each level's stories you already know (storyInfo().known, averaged).
// 90% = ready, 95% = reads smoothly; crossing a threshold the first time is celebrated once (S.readyAt, per level).
function readyStats() {
  return RLEVELS.map((lv) => {
    const list = STORIES.filter((st) => st.level === lv);
    if (!list.length) return null;
    const pct = Math.round(list.reduce((a, st) => a + storyInfo(st).known, 0) / list.length);
    return { lv, pct, n: list.length };
  }).filter(Boolean);
}
function readyCheck(rs) {
  const hit = [];
  for (const r of rs) {
    const t = r.pct >= 95 ? 95 : r.pct >= 90 ? 90 : 0;
    if (t > (S.readyAt[r.lv] || 0)) { S.readyAt[r.lv] = t; hit.push(`${LV_LABEL[r.lv]} (${t}%+)`); }
  }
  if (hit.length) { save(); setTimeout(() => { confetti(); toast(`📖 พร้อมอ่านเรื่องสั้นระดับ ${hit.join(', ')} แล้ว!`); }, 500); }
}
function readyBox() {
  if (!STORIES || !STORIES.length) return '';
  const rs = readyStats(); readyCheck(rs);
  const best = [...rs].reverse().find((r) => r.pct >= 90);
  // levels already started + the next one to aim for; the rest fold away (1.134)
  const next = rs.find((r) => r.pct < 90);
  const shown = rs.filter((r) => r.pct > 0 || r === next), rest = rs.filter((r) => !shown.includes(r));
  const rows = (list) => list.map((r) => `<div class="small" style="margin-top:8px">${LV_LABEL[r.lv]} <span class="muted">· รู้ ${r.pct}% ${r.pct >= 95 ? '· อ่านลื่น ✨' : r.pct >= 90 ? '· พร้อมอ่าน ✅' : ''}</span></div>
      <div class="bar lv-${r.lv}" style="margin-top:3px"><div class="l" style="width:${r.pct}%"></div></div>`).join('');
  return `<div class="card-box ready-box"><b>📖 พร้อมอ่านระดับไหนแล้ว?</b>
    <div class="small" style="margin-top:4px">${best ? `คุณรู้คำศัพท์ ${best.pct}% ในเรื่องสั้นระดับ ${LV_LABEL[best.lv]} → <b>พร้อมอ่าน ${LV_LABEL[best.lv]}</b> 🎉` : 'เรียนคำศัพท์เพิ่ม แล้วระดับที่พร้อมอ่านจะขึ้นที่นี่ (เกณฑ์ 90%)'}</div>
    ${rows(shown)}${rest.length ? `<details class="lv-more"><summary>ระดับถัดไป (${rest.map((r) => LV_LABEL[r.lv]).join(' · ')})</summary>${rows(rest)}</details>` : ''}</div>`;
}
function renderLibrary() {
  const done = STORIES.filter((st) => S.read[st.id]).length;
  const pick = nextStory();
  const pi = pick && storyInfo(pick);
  const counts = Object.fromEntries(RLEVELS.map((lv) => [lv, STORIES.filter((st) => st.level === lv)]));
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="rBack">‹ เกม</button></div>
    <div class="card-box lib-head">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="h2" style="margin:0">📚 ห้องสมุดเรื่องสั้น</div>
        <div class="small muted">อ่านแล้ว ${done} จาก ${STORIES.length} เรื่อง</div></div><div class="lib-pct">${Math.round((100 * done) / STORIES.length)}%</div></div>
      <div class="lib-bars">${RLEVELS.map((lv) => { const n = counts[lv].length, r = counts[lv].filter((st) => S.read[st.id]).length; return n ? `<div class="lib-bar"><div class="lib-fill lv-${lv}" style="width:${(100 * r) / n}%"></div><span>${LV_LABEL[lv]} ${r}/${n}</span></div>` : ''; }).join('')}</div>
    </div>
    ${readyBox()}
    <button class="card-box guide-link" id="toMine"><span>📰</span><div class="grow"><b>อ่านบทความของฉัน</b><div class="small muted">วางข่าวหรือบทความภาษาอังกฤษ ดูว่ารู้กี่ % แล้วเก็บคำใหม่</div></div><span class="muted">›</span></button>
    ${pick ? `<button class="st-pick lv-${pick.level}" data-id="${pick.id}">
      <div class="st-pick-tag">แนะนำให้อ่านต่อ</div>
      <div class="row" style="gap:14px;align-items:center"><div class="st-pick-emoji">${pick.emoji || '📖'}</div>
      <div class="grow"><div class="st-pick-t">${esc(pick.title)}</div><div class="st-pick-s">${esc(pick.titleTh)}</div>
      <div class="st-pick-m">${LV_LABEL[pick.level]} · ⏱ ${pi.mins} นาที · ${pi.known ? `🧠 รู้แล้ว ${pi.known}%` : `📝 ${pi.words} คำ`}</div></div><span class="st-pick-go">▶</span></div></button>` : '<div class="card-box center">🎉 อ่านครบทุกเรื่องแล้ว อ่านซ้ำเพื่อทบทวนได้เลย</div>'}
    <div class="chips" id="rf" style="margin:14px 0 6px">${[['all', 'ทั้งหมด'], ...RLEVELS.filter((lv) => counts[lv].length).map((lv) => [lv, LV_LABEL[lv]]), ['unread', 'ยังไม่อ่าน'], ['dialogue', KIND_LABEL.dialogue], ['email', KIND_LABEL.email]].map(([v, t]) => `<button class="chip${readFilter === v ? ' on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>
    <div id="rList"></div>`;
  const paint = () => {
    view.querySelectorAll('#rf .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === readFilter));
    const lvs = RLEVELS.includes(readFilter) ? [readFilter] : RLEVELS;
    $('#rList').innerHTML = lvs.map((lv) => {
      const list = counts[lv].filter((st) => (readFilter !== 'unread' || !S.read[st.id]) && (!KIND_LABEL[readFilter] || st.kind === readFilter));
      if (!list.length) return '';
      return `<div class="h2 lib-lv">${lvBadge(lv)} ${RLV_TH[lv]}</div>${list.map((st) => { const inf = storyInfo(st); return `<button class="st-card lv-${st.level}${S.read[st.id] ? ' read' : ''}" data-id="${st.id}">
        <span class="st-tile lv-${st.level}">${st.emoji || '📖'}</span>
        <span class="grow"><b>${esc(st.title)}</b><span class="small muted st-th2">${esc(st.titleTh)}</span>
        <span class="st-sub">${st.kind ? KIND_LABEL[st.kind] + ' · ' : ''}⏱ ${inf.mins} นาที · ❓ ${st.q.length} ข้อ · ${!inf.fresh.length ? '🧠 รู้ทุกคำแล้ว' : inf.known ? `🧠 รู้แล้ว ${inf.known}%` : `📝 ${inf.words} คำ`}</span></span>${scoreTag(st) || '<span class="muted">›</span>'}</button>`; }).join('')}`;
    }).join('') || '<p class="center muted">อ่านครบทุกเรื่องในหมวดนี้แล้ว 🎉</p>';
  };
  paint();
  $('#rBack').onclick = () => go('games');
  view.onclick = (e) => {
    const c = e.target.closest('#rf .chip'); if (c) { readFilter = c.dataset.v; return paint(); }
    if (e.target.closest('#toMine')) { view.onclick = null; return go('mine', 'read'); }
    const b = e.target.closest('[data-id]'); if (b) { view.onclick = null; go('read', +b.dataset.id); }
  };
  cleanup = () => { view.onclick = null; };
}

/* ---------- shadowing (listen to one sentence, repeat it aloud in the pause, go on) ---------- */
function storySentences(st) {
  const out = [];
  st.en.forEach((para, k) => (para.match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) || [para]).forEach((x) => { x = x.trim(); if (x) out.push({ en: x, k }); }));
  return out;
}
// Recording your own voice while shadowing (1.108): the mic is opened only for the pause after each sentence (so the phone's
// speaker volume comes back for the next one), each take is kept in memory for this session and can be played right after the
// original to compare. Needs MediaRecorder; without it the button is not shown.
const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
function shadowStory(st, slowStart) {
  const list = storySentences(st);
  let i = 0, tok = 0, auto = false, slow = !!slowStart, hide = false, showTh = false, timer = null;
  let recOn = false, take = null; const clips = new Map(); // take = { rec, stream, k, chunks, at }
  $('#title').textContent = 'ฝึกพูดตาม';
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="shBack">‹ กลับไปที่เรื่อง</button></div>
    <div class="card-box sh-box">
      <div class="sh-top"><span class="small muted">${st.emoji || '📖'} ${esc(st.title)}</span><b class="small" id="shN"></b></div>
      <div class="sh-prog"><i id="shProg"></i></div>
      <p class="sh-en" lang="en" id="shEn" aria-live="polite"></p>
      <p class="sh-th" id="shTh" hidden></p>
      <div class="sh-state" id="shState" aria-live="polite">แตะ ▶️ เริ่ม แล้วพูดตามในช่วงที่แถบสีวิ่ง</div>
      <div class="sh-timer"><i id="shBar"></i></div>
    </div>
    <div class="st-tools sh-ctl">
      <button class="tool" id="shPrev" aria-label="ประโยคก่อนหน้า"><span>⏮</span>ก่อนหน้า</button>
      <button class="tool" id="shPlay"><span>▶️</span>เริ่ม</button>
      <button class="tool" id="shNext" aria-label="ประโยคถัดไป"><span>⏭</span>ถัดไป</button>
      <button class="tool" id="shRep"><span>🔁</span>ฟังซ้ำ</button>
      <button class="tool ${slow ? 'on' : ''}" id="shSlow" aria-pressed="${slow}"><span>🐢</span>ช้า</button>
      ${canRecord() ? '<button class="tool" id="shRec" aria-pressed="false"><span>🎙️</span>อัดเสียงฉัน</button><button class="tool" id="shCmp" disabled><span>🎧</span>เทียบเสียง</button>' : ''}
      <button class="tool" id="shHide" aria-pressed="false"><span>🙈</span>ซ่อนข้อความ</button>
    </div>
    <button class="hint-btn" id="shThBtn">🇹🇭 ดูคำแปลย่อหน้านี้</button>
    <p class="small muted" style="margin:14px 2px">💡 Shadowing: ฟังประโยค แล้วพูดตามทันทีให้จังหวะ น้ำเสียง และการเน้นคำเหมือนต้นฉบับมากที่สุด ไม่ต้องเข้าใจทุกคำก็ได้ ลองซ่อนข้อความเมื่อคล่องแล้ว</p>`;
  const bar = $('#shBar');
  const setBar = (ms) => { bar.style.transition = 'none'; bar.style.width = '0'; if (ms) { void bar.offsetWidth; bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; } };
  // one take = the pause after one sentence; stopTake() keeps it (when it is longer than half a second) under that sentence
  const startTake = async (k) => {
    if (!recOn || take) return;
    const mine = {};
    take = mine;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (take !== mine) { stream.getTracks().forEach((t) => t.stop()); return; } // the pause ended while the mic was opening
      const rec = new MediaRecorder(stream);
      Object.assign(mine, { rec, stream, k, chunks: [], at: Date.now() });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) mine.chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (Date.now() - mine.at > 500 && mine.chunks.length) {
          if (clips.has(k)) URL.revokeObjectURL(clips.get(k));
          clips.set(k, URL.createObjectURL(new Blob(mine.chunks, { type: rec.mimeType || 'audio/mp4' })));
          const cmp = $('#shCmp'); if (cmp && k === i) cmp.disabled = false;
        }
      };
      rec.start();
      $('#shState').textContent = '🎙️ ตาคุณ กำลังอัดเสียง…';
    } catch (e) {
      take = null; recOn = false;
      const b = $('#shRec'); if (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
      toast('เปิดไมค์ไม่ได้ ลองอนุญาตการใช้ไมค์ในตั้งค่า iPhone ดูนะ');
    }
  };
  const stopTake = () => { const t = take; take = null; if (t && t.rec && t.rec.state !== 'inactive') { try { t.rec.stop(); } catch (e) { /* ignore */ } } else if (t && t.stream) t.stream.getTracks().forEach((x) => x.stop()); };
  const halt = () => { tok++; clearTimeout(timer); stopTake(); setBar(0); if (window.speechSynthesis) speechSynthesis.cancel(); };
  const setAuto = (on) => { auto = on; $('#shPlay').innerHTML = on ? '<span>⏸</span>หยุด' : '<span>▶️</span>เริ่ม'; };
  const show = () => {
    const c = list[i];
    $('#shN').textContent = `ประโยค ${i + 1}/${list.length}`;
    $('#shProg').style.width = ((i + 1) / list.length) * 100 + '%';
    $('#shEn').textContent = c.en; $('#shEn').classList.toggle('hid', hide);
    if ($('#shCmp')) $('#shCmp').disabled = !clips.has(i);
    $('#shTh').textContent = st.th[c.k] || ''; $('#shTh').hidden = !showTh;
  };
  const finish = () => {
    setAuto(false);
    $('#shState').innerHTML = '🎉 พูดตามครบทั้งเรื่องแล้ว เก่งมาก!';
    markActive(); addXP(Math.min(20, list.length)); save(); sfx('ok');
  };
  // Say sentence i; then leave a pause about as long as the sentence (+ a little) for the learner to repeat it.
  const run = () => {
    const my = ++tok; clearTimeout(timer); show(); setBar(0);
    $('#shState').textContent = '🔊 ฟัง…';
    const t0 = Date.now(), c = list[i], idx = i;
    const pause = () => {
      if (my !== tok || current !== 'read') return;
      const said = Date.now() - t0, est = c.en.split(/\s+/).length * 380 / (slow ? 0.62 : 1);
      const gap = Math.min(14000, Math.max(1500, Math.max(said, est) * 1.15 + 600));
      $('#shState').textContent = '🗣️ ตาคุณ พูดตามเลย!';
      setBar(gap);
      startTake(idx);
      timer = setTimeout(() => {
        if (my !== tok) return;
        stopTake(); setBar(0);
        if (!auto) { $('#shState').textContent = 'แตะ 🔁 ฟังซ้ำ หรือ ⏭ ไปประโยคถัดไป'; return; }
        if (i + 1 < list.length) { i++; run(); } else finish();
      }, gap);
    };
    const u = speak(c.en, { slow });
    if (u) { u.onend = pause; u.onerror = () => { if (my === tok) pause(); }; } else pause();
  };
  const move = (d) => { halt(); i = Math.max(0, Math.min(list.length - 1, i + d)); run(); };
  $('#shBack').onclick = () => go('read', st.id);
  $('#shPlay').onclick = () => { if (auto) { setAuto(false); halt(); $('#shState').textContent = 'หยุดไว้ แตะ ▶️ เพื่อเล่นต่อ'; } else { setAuto(true); run(); } };
  if ($('#shRec')) {
    $('#shRec').onclick = () => { recOn = !recOn; $('#shRec').classList.toggle('on', recOn); $('#shRec').setAttribute('aria-pressed', recOn); if (!recOn) stopTake(); };
    // original first, then your take
    $('#shCmp').onclick = () => {
      const c = list[i], url = clips.get(i); if (!url) return;
      halt(); setAuto(false);
      const my = tok;
      $('#shState').textContent = '🔊 เสียงต้นฉบับ…';
      const mine = () => {
        if (my !== tok) return;
        $('#shState').textContent = '🎙️ เสียงของคุณ…';
        const a = new Audio(url); a.onended = () => { if (my === tok) $('#shState').textContent = 'แตะ 🎧 เพื่อเทียบอีกครั้ง หรือ 🔁 ฟังซ้ำ'; };
        const pr = a.play(); if (pr && pr.catch) pr.catch(() => toast('เล่นเสียงที่อัดไม่ได้'));
      };
      const u = speak(c.en, { slow });
      if (u) { u.onend = mine; u.onerror = mine; } else mine();
    };
  }
  $('#shPrev').onclick = () => move(-1);
  $('#shNext').onclick = () => move(1);
  $('#shRep').onclick = () => { halt(); run(); };
  $('#shSlow').onclick = () => { slow = !slow; $('#shSlow').classList.toggle('on', slow); $('#shSlow').setAttribute('aria-pressed', slow); };
  $('#shHide').onclick = () => { hide = !hide; $('#shHide').classList.toggle('on', hide); $('#shHide').setAttribute('aria-pressed', hide); $('#shEn').classList.toggle('hid', hide); };
  $('#shEn').onclick = () => { if (hide) $('#shEn').classList.toggle('hid'); };
  $('#shThBtn').onclick = () => { showTh = !showTh; $('#shTh').hidden = !showTh; $('#shThBtn').textContent = showTh ? '🇹🇭 ซ่อนคำแปล' : '🇹🇭 ดูคำแปลย่อหน้านี้'; };
  show();
  cleanup = () => { halt(); clips.forEach((u) => URL.revokeObjectURL(u)); clips.clear(); };
}

/* ---------- book mode (1.137) ---------- */
// 📖 A full-screen, paginated reader made for an iPad held like a book: CSS columns cut the story into pages
// (two side by side when the screen is wide and in landscape), tap the left/right edge, swipe or use the arrow keys
// to turn a page, tap a list word for its sheet. 🖍️ highlighter: an Apple Pencil always highlights the list words it
// passes over (a finger does too while 🖍️ is on); the marked words go to a set with pickDeck().
let bookEl = null;
// Per-device book memory (1.143, localStorage o3k.book): paper colour, where each story was left, highlighted words per story.
const BOOK_KEY = 'o3k.book', BOOK_THEMES = [['paper', '📄', 'กระดาษขาว'], ['sepia', '📜', 'ซีเปีย'], ['gray', '🌫️', 'เทา'], ['night', '🌙', 'กลางคืน']];
function bookMem() { try { const v = JSON.parse(localStorage.getItem(BOOK_KEY) || '{}'); return v && typeof v === 'object' ? { t: v.t, pos: v.pos || {}, hl: v.hl || {} } : { pos: {}, hl: {} }; } catch (e) { return { pos: {}, hl: {} }; } }
function bookKeep(fn) { const m = bookMem(); fn(m); try { localStorage.setItem(BOOK_KEY, JSON.stringify(m)); } catch (e) { /* private mode */ } }
function closeBook() {
  if (!bookEl) return;
  const b = bookEl; bookEl = null;
  if (b._off) b._off();
  b.remove();
}
function openBook(st, opt = {}) {
  closeBook();
  let page = 0, pages = 1, spread = 1, th = false, pen = false;
  const mem = bookMem();
  let theme = BOOK_THEMES.some(([id]) => id === mem.t) ? mem.t : 'paper';
  let resume = typeof mem.pos[st.id] === 'number' && mem.pos[st.id] > 0 && mem.pos[st.id] < 1 ? mem.pos[st.id] : 0; // fraction of the story
  const marked = new Map(); // word idx -> word
  const font = () => FONT_SIZES[S.settings.rFont != null ? S.settings.rFont : 1];
  const el = document.createElement('div');
  el.className = 'book t-' + theme;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'โหมดหนังสือ: ' + st.title);
  el.innerHTML = `<div class="bk-top">
      <button class="icon-btn" id="bkClose" aria-label="ปิดโหมดหนังสือ">✕</button>
      <div class="bk-title grow">${esc(st.title)}</div>
      <button class="bk-tool" id="bkTh" aria-pressed="false" aria-label="คำแปลภาษาไทย">🇹🇭</button>
      <button class="bk-tool" id="bkFont" aria-label="ขนาดตัวอักษร">Aa</button>
      <button class="bk-tool" id="bkTheme" aria-label="สีกระดาษ"></button>
      <button class="bk-tool" id="bkPen" aria-pressed="false" aria-label="ปากกาไฮไลต์">🖍️</button>
    </div>
    <div class="bk-vp" id="bkVp"><div class="bk-flow" id="bkFlow" style="--st-font:${font()}px">
      <div class="bk-head"><div class="bk-emoji">${st.emoji || '📖'}</div><h2 lang="en">${esc(st.title)}</h2><div class="bk-sub">${esc(st.titleTh)} · ${LV_LABEL[st.level]}</div></div>
      ${st.en.map((p, k) => `<p class="bk-p" lang="en">${storyHTML(p)}</p><p class="bk-th" hidden>${esc(st.th[k] || '')}</p>`).join('')}
      <div class="bk-end"><div class="bk-emoji">🏁</div><b>จบเรื่อง</b><button class="btn primary" id="bkDone">❓ ไปทำคำถามท้ายเรื่อง</button></div>
    </div></div>
    <div class="bk-foot">
      <button class="bk-turn" id="bkPrev" aria-label="หน้าก่อน">‹</button>
      <div class="grow center"><div class="bk-bar"><i id="bkBar"></i></div><span class="small muted" id="bkNum"></span></div>
      <button class="bk-mark" id="bkMark" hidden></button><button class="bk-turn bk-clr" id="bkClr" hidden aria-label="ลบไฮไลต์ทั้งหมด">✕</button>
      <button class="bk-turn" id="bkNext" aria-label="หน้าถัดไป">›</button>
    </div>`;
  document.body.appendChild(el);
  bookEl = el;
  const vp = el.querySelector('#bkVp'), flow = el.querySelector('#bkFlow');
  const layout = () => {
    const at = resume != null ? resume : pages > 1 ? page / pages : 0; // resume holds until the reader turns a page (fonts may re-lay the pages first)
    const w = vp.clientWidth, gap = 56;
    spread = w >= 900 && innerWidth > innerHeight ? 2 : 1;
    const col = (w - gap * (spread - 1)) / spread;
    flow.style.width = w + 'px'; flow.style.columnWidth = col + 'px'; flow.style.columnGap = gap + 'px';
    flow.style.transform = 'none';
    const cols = Math.max(1, Math.round((flow.scrollWidth + gap) / (col + gap)));
    pages = Math.max(1, Math.ceil(cols / spread));
    el.classList.toggle('spread', spread === 2);
    turn(Math.min(pages - 1, Math.floor(at * pages + 1e-6)), true);
  };
  const turn = (n, quiet) => {
    n = Math.max(0, Math.min(pages - 1, n));
    if (n === page && !quiet) { if (n === pages - 1) toast('หน้าสุดท้ายแล้ว'); return; }
    page = n;
    flow.style.transform = `translateX(${-page * (vp.clientWidth + 56)}px)`;
    el.querySelector('#bkNum').textContent = `หน้า ${page + 1}/${pages}`;
    el.querySelector('#bkBar').style.width = (100 * (page + 1)) / pages + '%';
    el.querySelector('#bkPrev').disabled = page === 0;
    el.querySelector('#bkNext').disabled = page === pages - 1;
    if (!quiet) {
      markActive(); resume = null;
      const f = page === pages - 1 ? 0 : (page + 0.5) / pages; // the middle of the page; finished = the first page next time
      bookKeep((m) => { if (f) m.pos[st.id] = +f.toFixed(4); else delete m.pos[st.id]; });
    }
  };
  const showMarked = () => {
    const b = el.querySelector('#bkMark');
    b.hidden = !marked.size; el.querySelector('#bkClr').hidden = !marked.size;
    b.textContent = `🖍️ ${marked.size} คำ → เก็บเข้าชุด`;
  };
  const keepMarks = () => bookKeep((m) => { const l = [...marked.values()].map((w) => w.w); if (l.length) m.hl[st.id] = l; else delete m.hl[st.id]; });
  const mark = (rw, quiet) => {
    const w = W[+rw.dataset.i];
    if (!w || marked.has(w.idx)) return;
    marked.set(w.idx, w);
    flow.querySelectorAll(`.rw[data-i="${w.idx}"]`).forEach((x) => x.classList.add('hl'));
    showMarked();
    if (!quiet) keepMarks();
  };
  // highlights kept from last time (by spelling, so a re-sorted word list still finds them)
  (mem.hl[st.id] || []).forEach((s) => { const w = W.find((x) => x.w === s); const rw = w && flow.querySelector(`.rw[data-i="${w.idx}"]`); if (rw) mark(rw, true); });
  const themeBtn = () => { const t = BOOK_THEMES.find(([id]) => id === theme); const b = el.querySelector('#bkTheme'); b.textContent = t[1]; b.setAttribute('aria-label', 'สีกระดาษ: ' + t[2]); };
  themeBtn();
  el.querySelector('#bkTheme').onclick = () => {
    const k = (BOOK_THEMES.findIndex(([id]) => id === theme) + 1) % BOOK_THEMES.length;
    el.classList.remove('t-' + theme); theme = BOOK_THEMES[k][0]; el.classList.add('t-' + theme);
    themeBtn(); bookKeep((m) => { m.t = theme; }); toast(BOOK_THEMES[k][1] + ' ' + BOOK_THEMES[k][2]);
  };
  el.querySelector('#bkClr').onclick = () => {
    marked.clear(); flow.querySelectorAll('.rw.hl').forEach((x) => x.classList.remove('hl')); showMarked(); keepMarks(); toast('ลบไฮไลต์แล้ว');
  };
  // gestures on the page: pen (or finger with 🖍️) = highlight, a sideways swipe = turn, a tap on the outer thirds = turn
  let g = null;
  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) { g = null; return; } // the end-of-story button is a plain button
    const hl = e.pointerType === 'pen' || pen;
    g = { x: e.clientX, y: e.clientY, hl, id: e.pointerId, moved: false };
    if (hl) { try { vp.setPointerCapture(e.pointerId); } catch (err) {} const rw = e.target.closest('.rw[data-i]'); if (rw) mark(rw); }
  });
  vp.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 8) g.moved = true;
    if (g.hl) { const t = document.elementFromPoint(e.clientX, e.clientY); const rw = t && t.closest && t.closest('.bk-flow .rw[data-i]'); if (rw) mark(rw); }
  });
  vp.addEventListener('pointerup', (e) => {
    if (!g || e.pointerId !== g.id) return;
    const d = g; g = null;
    if (d.hl) { if (d.moved || e.target.closest('.rw[data-i]')) vp._skip = true; return; } // a pen tap on plain text still turns the page
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { vp._skip = true; turn(page + (dx < 0 ? 1 : -1)); }
  });
  vp.addEventListener('pointercancel', () => { g = null; });
  vp.addEventListener('click', (e) => {
    if (vp._skip) { vp._skip = false; return; }
    if (e.target.closest('#bkDone')) { closeBook(); if (opt.done) opt.done(); return; }
    const rw = e.target.closest('.rw[data-i]');
    if (rw) { const w = W[+rw.dataset.i]; speak(w.w); return openSheet(w, () => flow.querySelectorAll(`.rw[data-i="${w.idx}"]`).forEach((x) => (x.className = 'rw ' + status(w) + (marked.has(w.idx) ? ' hl' : '')))); }
    const r = vp.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (x < 0.3) turn(page - 1); else if (x > 0.7) turn(page + 1);
  });
  el.querySelector('#bkPrev').onclick = () => turn(page - 1);
  el.querySelector('#bkNext').onclick = () => turn(page + 1);
  el.querySelector('#bkClose').onclick = () => closeBook();
  el.querySelector('#bkTh').onclick = (e) => {
    resume = null; th = !th; e.currentTarget.setAttribute('aria-pressed', th); e.currentTarget.classList.toggle('on', th);
    flow.querySelectorAll('.bk-th').forEach((x) => (x.hidden = !th)); layout();
  };
  el.querySelector('#bkFont').onclick = () => {
    S.settings.rFont = ((S.settings.rFont != null ? S.settings.rFont : 1) + 1) % FONT_SIZES.length; save(); resume = null;
    flow.style.setProperty('--st-font', font() + 'px');
    const rt = document.getElementById('rText'); if (rt) rt.style.setProperty('--st-font', font() + 'px');
    layout();
  };
  el.querySelector('#bkPen').onclick = (e) => {
    pen = !pen; e.currentTarget.setAttribute('aria-pressed', pen); e.currentTarget.classList.toggle('on', pen);
    el.classList.toggle('pen', pen);
    toast(pen ? '🖍️ ลากนิ้วผ่านคำที่ขีดเส้นใต้เพื่อไฮไลต์ (Apple Pencil ไฮไลต์ได้เสมอ)' : 'ปิดปากกาไฮไลต์แล้ว แตะ/ปัดเพื่อพลิกหน้า');
  };
  el.querySelector('#bkMark').onclick = () => pickDeck([...marked.values()].map((w) => w.w));
  const key = (e) => {
    if (document.querySelector('.sheet-wrap')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); e.stopPropagation(); turn(page + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); e.stopPropagation(); turn(page - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeBook(); }
  };
  document.addEventListener('keydown', key, true);
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (bookEl === el) layout(); }, 120); };
  addEventListener('resize', onResize);
  el._off = () => { document.removeEventListener('keydown', key, true); removeEventListener('resize', onResize); };
  openBook.state = () => ({ page, pages, spread, theme, marked: [...marked.values()].map((w) => w.w) }); // read by tests
  requestAnimationFrame(layout);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { if (bookEl === el) layout(); });
}
