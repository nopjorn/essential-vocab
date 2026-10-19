'use strict';
// Short-story library and reader.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- reading (short stories) ---------- */
// stories/<level>.js: each file pushes { id, level, emoji, title, titleTh, en: [paragraphs], th: [paragraphs], q: [{ q, o: [3], a }] }
// onto window.STORIES. Loaded on first use so app start stays fast; the service worker still caches them offline.
const STORY_FILES = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
let STORIES = null;
const STORY_COUNT = 105;
function loadStories() {
  if (STORIES) return Promise.resolve(STORIES);
  window.STORIES = [];
  const one = (f) => new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'stories/' + f + '.js?v=' + APP_VERSION;
    sc.onload = sc.onerror = res;
    document.head.appendChild(sc);
  });
  return Promise.all(STORY_FILES.map(one)).then(() => (STORIES = window.STORIES.sort((a, b) => a.id - b.id)));
}
// collocations.js: window.COLLOC = { headword: [[phrase, thai], ...] } — lazy-loaded like stories.
let COLLOC = window.COLLOC || null;
function loadColloc() {
  if (COLLOC) return Promise.resolve(COLLOC);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'collocations.js?v=' + APP_VERSION;
    sc.onload = () => res((COLLOC = window.COLLOC || {}));
    sc.onerror = () => res((COLLOC = {}));
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
// pairs.js: window.CONFUSE (confusable words) + window.MINPAIRS (sound pairs) — lazy-loaded.
let CONFUSE = window.CONFUSE || null, MINPAIRS = window.MINPAIRS || [], MINPAIRS_TIP = window.MINPAIRS_TIP || {};
function loadPairs() {
  if (CONFUSE) return Promise.resolve(CONFUSE);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'pairs.js?v=' + APP_VERSION;
    const done = () => { CONFUSE = window.CONFUSE || []; MINPAIRS = window.MINPAIRS || []; MINPAIRS_TIP = window.MINPAIRS_TIP || {}; res(CONFUSE); };
    sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  });
}
// families.js: window.FAMILIES = [{ f: [[word, pos, thai], ...], q: [[sentence ___, answer, thai], ...] }] — lazy-loaded.
let FAMILIES = window.FAMILIES || null, FAMILY_OF = null;
function loadFamilies() {
  if (FAMILIES) return Promise.resolve(FAMILIES);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'families.js?v=' + APP_VERSION;
    const done = () => { FAMILIES = window.FAMILIES || []; res(FAMILIES); };
    sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  });
}
// The family a list word belongs to (or undefined).
function familyOf(word) {
  if (!FAMILY_OF) { FAMILY_OF = new Map(); FAMILIES.forEach((f) => f.f.forEach(([w]) => FAMILY_OF.set(w, f))); }
  return FAMILY_OF.get(word.toLowerCase());
}
const WORD_BY = new Proxy({}, { get: (_, k) => { if (!WORD_INDEX) lookupWord('a'); return WORD_INDEX.get(String(k).toLowerCase()); } });
let WORD_INDEX = null;
// Find the word-list entry for a token in a story, trying simple English endings.
function lookupWord(tok) {
  if (!WORD_INDEX) { WORD_INDEX = new Map(); W.forEach((w) => { const k = w.w.toLowerCase(); if (!/\s/.test(k) && !WORD_INDEX.has(k)) WORD_INDEX.set(k, w); }); }
  const t = tok.toLowerCase().replace(/[’']s$/, '');
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
function storyHTML(text) {
  return esc(text).replace(/[A-Za-z][A-Za-z’']*/g, (tok) => {
    const w = lookupWord(tok);
    return w ? `<span class="rw ${status(w)}" data-i="${w.idx}">${tok}</span>` : tok;
  });
}
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
    view.innerHTML = '<p class="center muted" style="margin-top:40px">กำลังโหลดเรื่องสั้น…</p>';
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
      <div class="st-meta"><span>${LV_LABEL[st.level]} · ${RLV_TH[st.level]}</span><span>⏱ ${inf.mins} นาที</span><span>📝 ${inf.words} คำ</span><span>${inf.known ? `🧠 รู้แล้ว ${inf.known}%` : `✨ คำใหม่ ${inf.fresh.length}`}</span></div>
    </div>
    <div class="st-tools">
      <button class="tool" id="rAll"><span>▶️</span>ฟังทั้งเรื่อง</button>
      <button class="tool" id="rTh"><span>🇹🇭</span>คำแปล</button>
      <button class="tool" id="rEar"><span>🎧</span>ฟังอย่างเดียว</button>
      <button class="tool" id="rFont"><span>Aa</span>ขนาดตัวอักษร</button>
      <button class="tool" id="rSlow" aria-pressed="false"><span>🐢</span>อ่านช้า</button>
      <button class="tool" id="rShadow"><span>🗣️</span>พูดตาม</button>
    </div>
    <article class="card-box story" id="rText" style="--st-font:${font()}px">
      ${st.en.map((para, k) => `<div class="st-para" data-k="${k}"><p class="st-p" lang="en">${storyHTML(para)}</p>
        <div class="st-row"><button class="st-say" data-para="${k}" aria-label="ฟังย่อหน้านี้">🔊</button><button class="st-thbtn" data-th="${k}">แปลย่อหน้านี้</button></div>
        <p class="st-th" hidden>${esc(st.th[k] || '')}</p></div>`).join('')}
      <div class="st-legend small muted">แตะคำที่ขีดเส้นใต้เพื่อดูความหมาย · <span class="rw learning">กำลังเรียน</span> <span class="rw mastered">จำได้แล้ว</span></div>
    </article>
    ${inf.fresh.length ? `<div class="h2">✨ คำใหม่ในเรื่องนี้ <span class="small muted">${inf.fresh.length} คำ</span></div>
      <div class="card-box"><div class="chips st-words">${[...inf.fresh].sort((a, b) => LEVELS.indexOf(b.g) - LEVELS.indexOf(a.g)).slice(0, 16).map((w) => `<button class="chip" data-wi="${w.idx}">${esc(w.w)}</button>`).join('')}</div>
      <p class="small muted" style="margin:10px 2px 0">แตะคำเพื่อดูความหมาย แล้วกด ⭐ ติดดาวไว้ทบทวนทีหลังได้</p></div>` : ''}
    <div class="h2">❓ คำถามท้ายเรื่อง</div>
    ${st.q.map((q, k) => `<div class="card-box st-q"><div class="st-qn">ข้อ ${k + 1}/${st.q.length}</div><b>${esc(q.q)}</b>
      <div class="options" style="margin-top:10px" data-q="${k}">${q.o.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
    <div id="rDone"></div>`;
  const paras = [...view.querySelectorAll('.st-para')];
  const stop = () => { token++; playing = -1; paras.forEach((p) => p.classList.remove('playing')); $('#rAll').innerHTML = '<span>▶️</span>ฟังทั้งเรื่อง'; if (window.speechSynthesis) speechSynthesis.cancel(); };
  // Read paragraph k, highlight it, then continue with the next one when `chain` is set.
  const play = (k, chain) => {
    const my = ++token;
    paras.forEach((p, j) => p.classList.toggle('playing', j === k));
    playing = k;
    $('#rAll').innerHTML = chain ? '<span>⏸</span>หยุดฟัง' : '<span>▶️</span>ฟังทั้งเรื่อง';
    if (chain) paras[k].scrollIntoView({ behavior: 'smooth', block: 'center' });
    const u = speak(st.en[k], { slow });
    const next = () => { if (my !== token || current !== 'read') return; if (chain && k + 1 < paras.length) play(k + 1, true); else stop(); };
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
  $('#rAll').onclick = () => (playing >= 0 && $('#rAll').textContent.includes('หยุด') ? stop() : play(0, true));
  const onScroll = () => { const max = view.scrollHeight - view.clientHeight; const bar = $('#rProg'); if (bar) bar.style.width = (max > 0 ? Math.min(100, (100 * view.scrollTop) / max) : 100) + '%'; };
  view.addEventListener('scroll', onScroll, { passive: true });
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
    const ob = e.target.closest('.opt'), box = ob && ob.closest('[data-q]');
    if (!ob || !box || box.dataset.done) return;
    const k = +box.dataset.q, ok = +ob.dataset.j === st.q[k].a;
    box.dataset.done = '1';
    box.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.j === st.q[k].a) o.classList.add('correct'); });
    if (!ok) ob.classList.add('wrong');
    sfx(ok ? 'ok' : 'bad'); markActive();
    if (ok) addXP(5);
    answers[k] = ok;
    if (answers.filter((x) => x != null).length === st.q.length) {
      const right = answers.filter(Boolean).length, all = st.q.length;
      const first = !S.read[st.id];
      S.read[st.id] = today();
      const prev = S.readScore[st.id];
      if (!prev || right > prev[0]) S.readScore[st.id] = [right, all];
      save();
      if (right === all) confetti();
      const nextSt = nextStory();
      const done = STORIES.filter((x) => S.read[x.id]).length;
      $('#rDone').innerHTML = `<div class="card-box center pop st-done">
        <div class="result-emoji">${right === all ? '🏆' : right ? '📖' : '💪'}</div>
        <div class="h2" style="margin:4px 0">ตอบถูก ${right}/${all}</div>
        <div class="muted small">${first ? 'อ่านจบเรื่องใหม่! ' : ''}ห้องสมุดของคุณ ${done}/${STORIES.length} เรื่อง</div>
        <div class="st-stars">${Array.from({ length: all }, (_, i) => `<span class="${i < right ? 'on' : ''}">★</span>`).join('')}</div>
        ${nextSt ? `<button class="btn primary block" id="rNext">${nextSt.emoji || '📖'} เรื่องถัดไป: ${esc(nextSt.title)}</button>` : '<p>อ่านครบทุกเรื่องแล้ว เก่งมาก! 🎉</p>'}
        <button class="btn ghost block" id="rLib" style="margin-top:8px">กลับห้องสมุด</button></div>`;
      if (nextSt) $('#rNext').onclick = () => go('read', nextSt.id);
      $('#rLib').onclick = () => go('read');
      $('#rDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  cleanup = () => { view.onclick = null; view.removeEventListener('scroll', onScroll); token++; if (window.speechSynthesis) speechSynthesis.cancel(); };
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
    ${pick ? `<button class="st-pick lv-${pick.level}" data-id="${pick.id}">
      <div class="st-pick-tag">แนะนำให้อ่านต่อ</div>
      <div class="row" style="gap:14px;align-items:center"><div class="st-pick-emoji">${pick.emoji || '📖'}</div>
      <div class="grow"><div class="st-pick-t">${esc(pick.title)}</div><div class="st-pick-s">${esc(pick.titleTh)}</div>
      <div class="st-pick-m">${LV_LABEL[pick.level]} · ⏱ ${pi.mins} นาที · ${pi.known ? `🧠 รู้แล้ว ${pi.known}%` : `📝 ${pi.words} คำ`}</div></div><span class="st-pick-go">▶</span></div></button>` : '<div class="card-box center">🎉 อ่านครบทุกเรื่องแล้ว อ่านซ้ำเพื่อทบทวนได้เลย</div>'}
    <div class="chips" id="rf" style="margin:14px 0 6px">${[['all', 'ทั้งหมด'], ...RLEVELS.filter((lv) => counts[lv].length).map((lv) => [lv, LV_LABEL[lv]]), ['unread', 'ยังไม่อ่าน']].map(([v, t]) => `<button class="chip${readFilter === v ? ' on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>
    <div id="rList"></div>`;
  const paint = () => {
    view.querySelectorAll('#rf .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === readFilter));
    const lvs = RLEVELS.includes(readFilter) ? [readFilter] : RLEVELS;
    $('#rList').innerHTML = lvs.map((lv) => {
      const list = counts[lv].filter((st) => readFilter !== 'unread' || !S.read[st.id]);
      if (!list.length) return '';
      return `<div class="h2 lib-lv">${lvBadge(lv)} ${RLV_TH[lv]}</div>${list.map((st) => { const inf = storyInfo(st); return `<button class="st-card${S.read[st.id] ? ' read' : ''}" data-id="${st.id}">
        <span class="st-tile lv-${st.level}">${st.emoji || '📖'}</span>
        <span class="grow"><b>${esc(st.title)}</b><span class="small muted st-th2">${esc(st.titleTh)}</span>
        <span class="st-sub">⏱ ${inf.mins} นาที · ${!inf.fresh.length ? '🧠 รู้ทุกคำแล้ว' : inf.known ? `🧠 รู้แล้ว ${inf.known}%` : `📝 ${inf.words} คำ`}</span></span>${scoreTag(st) || '<span class="muted">›</span>'}</button>`; }).join('')}`;
    }).join('') || '<p class="center muted">อ่านครบทุกเรื่องในหมวดนี้แล้ว 🎉</p>';
  };
  paint();
  $('#rBack').onclick = () => go('games');
  view.onclick = (e) => {
    const c = e.target.closest('#rf .chip'); if (c) { readFilter = c.dataset.v; return paint(); }
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
function shadowStory(st, slowStart) {
  const list = storySentences(st);
  let i = 0, tok = 0, auto = false, slow = !!slowStart, hide = false, showTh = false, timer = null;
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
      <button class="tool" id="shHide" aria-pressed="false"><span>🙈</span>ซ่อนข้อความ</button>
    </div>
    <button class="hint-btn" id="shThBtn">🇹🇭 ดูคำแปลย่อหน้านี้</button>
    <p class="small muted" style="margin:14px 2px">💡 Shadowing: ฟังประโยค แล้วพูดตามทันทีให้จังหวะ น้ำเสียง และการเน้นคำเหมือนต้นฉบับมากที่สุด ไม่ต้องเข้าใจทุกคำก็ได้ ลองซ่อนข้อความเมื่อคล่องแล้ว</p>`;
  const bar = $('#shBar');
  const setBar = (ms) => { bar.style.transition = 'none'; bar.style.width = '0'; if (ms) { void bar.offsetWidth; bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; } };
  const halt = () => { tok++; clearTimeout(timer); setBar(0); if (window.speechSynthesis) speechSynthesis.cancel(); };
  const setAuto = (on) => { auto = on; $('#shPlay').innerHTML = on ? '<span>⏸</span>หยุด' : '<span>▶️</span>เริ่ม'; };
  const show = () => {
    const c = list[i];
    $('#shN').textContent = `ประโยค ${i + 1}/${list.length}`;
    $('#shProg').style.width = ((i + 1) / list.length) * 100 + '%';
    $('#shEn').textContent = c.en; $('#shEn').classList.toggle('hid', hide);
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
    const t0 = Date.now(), c = list[i];
    const pause = () => {
      if (my !== tok || current !== 'read') return;
      const said = Date.now() - t0, est = c.en.split(/\s+/).length * 380 / (slow ? 0.62 : 1);
      const gap = Math.min(14000, Math.max(1500, Math.max(said, est) * 1.15 + 600));
      $('#shState').textContent = '🗣️ ตาคุณ พูดตามเลย!';
      setBar(gap);
      timer = setTimeout(() => {
        if (my !== tok) return;
        setBar(0);
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
  $('#shPrev').onclick = () => move(-1);
  $('#shNext').onclick = () => move(1);
  $('#shRep').onclick = () => { halt(); run(); };
  $('#shSlow').onclick = () => { slow = !slow; $('#shSlow').classList.toggle('on', slow); $('#shSlow').setAttribute('aria-pressed', slow); };
  $('#shHide').onclick = () => { hide = !hide; $('#shHide').classList.toggle('on', hide); $('#shHide').setAttribute('aria-pressed', hide); $('#shEn').classList.toggle('hid', hide); };
  $('#shEn').onclick = () => { if (hide) $('#shEn').classList.toggle('hid'); };
  $('#shThBtn').onclick = () => { showTh = !showTh; $('#shTh').hidden = !showTh; $('#shThBtn').textContent = showTh ? '🇹🇭 ซ่อนคำแปล' : '🇹🇭 ดูคำแปลย่อหน้านี้'; };
  show();
  cleanup = () => { halt(); };
}
