'use strict';
// Word search (route `wsearch`): a 10×10 grid hiding 8 words of one topic, Thai meanings as clues.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- word search ---------- */
// Difficulty = directions words may run in: easy → ↓; normal adds ↘ ↗; hard adds the reverse of all four.
// Select by dragging across the letters or by tapping the first and the last letter; a line that spells a hidden word (either way round) counts.
const WS_N = 10, WS_WORDS = 8;
const WS_DIRS = { easy: [[0, 1], [1, 0]], normal: [[0, 1], [1, 0], [1, 1], [-1, 1]], hard: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] }; // [row step, column step]
const WS_DIFF = [['easy', 'ง่าย (→ ↓)'], ['normal', 'กลาง (+ ↘ ↗)'], ['hard', 'ยาก (ทุกทิศ)']];
const wsOpt = { topic: '', diff: 'normal' };
let wsGame = null; // the grid being played: { grid, words: [{w, r, c, dr, dc, found, hint}], t0 }

// Builds a grid; returns { grid, words } or null when fewer than 6 words fit (the caller tries again with other words).
function wsBuild(words, diff, rnd = Math.random) {
  const dirs = WS_DIRS[diff] || WS_DIRS.normal;
  const grid = Array.from({ length: WS_N }, () => Array(WS_N).fill(''));
  const placed = [];
  for (const w of [...words].sort((a, b) => b.w.length - a.w.length)) {
    const s = w.w.toLowerCase();
    let ok = false;
    for (let tries = 0; tries < 300 && !ok; tries++) {
      const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)];
      const r = Math.floor(rnd() * WS_N), c = Math.floor(rnd() * WS_N);
      const er = r + dr * (s.length - 1), ec = c + dc * (s.length - 1);
      if (er < 0 || er >= WS_N || ec < 0 || ec >= WS_N) continue;
      let fits = true;
      for (let k = 0; k < s.length && fits; k++) { const ch = grid[r + dr * k][c + dc * k]; if (ch && ch !== s[k]) fits = false; }
      if (!fits) continue;
      for (let k = 0; k < s.length; k++) grid[r + dr * k][c + dc * k] = s[k];
      placed.push({ w, r, c, dr, dc, found: false, hint: false }); ok = true;
    }
  }
  if (placed.length < 6) return null;
  // filler: half from the hidden words' own letters so wrong guesses look plausible
  const own = placed.map((p) => p.w.w.toLowerCase()).join(''), abc = 'abcdefghijklmnopqrstuvwxyz';
  for (let r = 0; r < WS_N; r++) for (let c = 0; c < WS_N; c++) if (!grid[r][c]) grid[r][c] = rnd() < 0.5 ? own[Math.floor(rnd() * own.length)] : abc[Math.floor(rnd() * 26)];
  return { grid, words: placed };
}
// 8 words of a topic ('' = any): single words of 4–9 letters, none inside another; the user's levels first, all levels if there are too few.
function wsPick(topic) {
  const ok = (w) => /^[a-z]{4,9}$/i.test(w.w) && (!topic || w.tp === topic);
  let pool = W.filter((w) => ok(w) && S.settings.levels.includes(w.g));
  if (new Set(pool.map((w) => w.w.toLowerCase())).size < 14) pool = W.filter(ok);
  const out = [];
  for (const w of shuffle(pool)) {
    const s = w.w.toLowerCase();
    if (out.some((o) => { const t = o.w.toLowerCase(); return t.includes(s) || s.includes(t); })) continue;
    out.push(w);
    if (out.length >= WS_WORDS) break;
  }
  return out;
}
const wsTopicsWithWords = () => TOPICS.filter(([id]) => W.filter((w) => w.tp === id && /^[a-z]{4,9}$/i.test(w.w)).length >= 12);

function renderWSearch() {
  if (cleanup) { cleanup(); cleanup = null; }
  const topics = wsTopicsWithWords();
  if (wsOpt.topic && !topics.some(([id]) => id === wsOpt.topic)) wsOpt.topic = '';
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="wsBack">‹ กลับ</button></div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">🔎</div><div class="h2" style="margin:2px 0">ค้นหาคำในตาราง</div>
      <p class="small muted">หาคำอังกฤษ ${WS_WORDS} คำที่ซ่อนในตาราง โดยดูคำแปลไทยเป็นคำใบ้ · ลากนิ้วผ่านตัวอักษร หรือแตะตัวแรกแล้วแตะตัวสุดท้าย</p></div>
    <div class="card-box"><b>หมวด</b>
      <select class="sel block-sel" id="wsTopic" style="margin:8px 0 12px" aria-label="หมวดคำศัพท์"><option value="">🎲 สุ่มทุกหมวด</option>${topics.map(([id]) => `<option value="${id}" ${wsOpt.topic === id ? 'selected' : ''}>${TOPIC_LABEL[id]}</option>`).join('')}</select>
      <b>ความยาก</b><div class="chips" id="wsDiff" style="margin:8px 0 12px">${WS_DIFF.map(([k, t]) => `<button class="chip${wsOpt.diff === k ? ' on' : ''}" data-d="${k}">${t}</button>`).join('')}</div>
      <button class="btn primary block" id="wsGo">เริ่มเล่น</button></div>`;
  $('#wsBack').onclick = () => go('games');
  $('#wsTopic').onchange = (e) => { wsOpt.topic = e.target.value; };
  $('#wsDiff').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) { wsOpt.diff = b.dataset.d; renderWSearch(); } };
  $('#wsGo').onclick = () => playWSearch();
}

function playWSearch() {
  if (cleanup) { cleanup(); cleanup = null; }
  let built = null;
  for (let tries = 0; tries < 30 && !built; tries++) {
    const words = wsPick(wsOpt.topic || pick(wsTopicsWithWords())[0]);
    if (words.length >= 7) built = wsBuild(words, wsOpt.diff);
  }
  if (!built) { toast('สร้างตารางไม่สำเร็จ ลองใหม่อีกครั้งนะ'); return renderWSearch(); }
  wsGame = { ...built, t0: Date.now(), over: false };
  const G = wsGame;
  let anchor = null, end = null, dragging = false, hue = 0;
  const line = (a, b) => { // cells from a to b if they lie on a row, column or diagonal, else null
    const dr = b[0] - a[0], dc = b[1] - a[1], n = Math.max(Math.abs(dr), Math.abs(dc));
    if (!n || (dr && dc && Math.abs(dr) !== Math.abs(dc))) return null;
    return Array.from({ length: n + 1 }, (_, k) => [a[0] + Math.sign(dr) * k, a[1] + Math.sign(dc) * k]);
  };
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y), c = el && el.closest('.ws-c'); return c ? [+c.dataset.r, +c.dataset.c] : null; };
  const el = (r, c) => view.querySelector(`.ws-c[data-r="${r}"][data-c="${c}"]`);
  $('#title').textContent = 'ค้นหาคำในตาราง';

  function paintPreview() {
    view.querySelectorAll('.ws-c.sel, .ws-c.anchor').forEach((x) => x.classList.remove('sel', 'anchor'));
    if (anchor) el(anchor[0], anchor[1]).classList.add('anchor');
    const l = anchor && end && line(anchor, end);
    if (l) l.forEach(([r, c]) => el(r, c).classList.add('sel'));
  }
  function paintList() {
    view.querySelector('#wsList').innerHTML = G.words.map((p, k) => `<li class="${p.found ? 'found' : ''}" style="--h:${p.hueAt != null ? p.hueAt : 0}">
      <span class="ws-th">${esc(thFirst(p.w.t))} <span class="pos">${esc(p.w.p)}</span></span>
      <span class="ws-en" lang="en">${p.found ? esc(p.w.w) : [...p.w.w].map((ch, k) => (p.hint && k === 0 ? ch : '_')).join(' ')}</span></li>`).join('');
    const left = G.words.filter((p) => !p.found).length;
    view.querySelector('#wsLeft').textContent = `เหลือ ${left} คำ`;
    view.querySelector('#wsProg').style.width = (G.words.length - left) / G.words.length * 100 + '%';
  }
  function markFound(p) {
    p.found = true; p.hueAt = (hue += 47) % 360;
    for (let k = 0; k < p.w.w.length; k++) { const e = el(p.r + p.dr * k, p.c + p.dc * k); e.classList.add('f'); e.style.setProperty('--h', p.hueAt); }
    sfx('ok'); speak(p.w.w); addXP(3);
    paintList();
    if (G.words.every((x) => x.found)) setTimeout(() => finish(false), 700);
  }
  function submit(a, b) {
    const l = line(a, b);
    anchor = end = null;
    if (!l) { paintPreview(); return; }
    const str = l.map(([r, c]) => G.grid[r][c]).join('');
    const hit = G.words.find((p) => !p.found && (p.w.w.toLowerCase() === str || [...p.w.w.toLowerCase()].reverse().join('') === str));
    if (hit) {
      // a line that spells the word elsewhere (filler matching by chance) counts too: move the word's cells to this line
      const fwd = hit.w.w.toLowerCase() === str, f = fwd ? l[0] : l[l.length - 1];
      hit.r = f[0]; hit.c = f[1]; hit.dr = Math.sign(fwd ? b[0] - a[0] : a[0] - b[0]); hit.dc = Math.sign(fwd ? b[1] - a[1] : a[1] - b[1]);
      paintPreview(); markFound(hit);
    } else {
      sfx('bad');
      l.forEach(([r, c]) => { const e = el(r, c); e.classList.add('no'); setTimeout(() => e.classList.remove('no'), 400); });
      paintPreview();
    }
  }
  function onDown(e) {
    const c = cellAt(e.clientX, e.clientY); if (!c || G.over) return;
    e.preventDefault();
    if (anchor && !(anchor[0] === c[0] && anchor[1] === c[1]) && line(anchor, c)) { submit(anchor, c); return; } // second tap
    if (anchor && anchor[0] === c[0] && anchor[1] === c[1]) { anchor = end = null; paintPreview(); return; } // tap the same letter again: cancel
    anchor = c; end = null; dragging = true; paintPreview();
  }
  function onMove(e) {
    if (!dragging) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c && line(anchor, c) && !(c[0] === anchor[0] && c[1] === anchor[1])) { end = c; paintPreview(); }
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    if (anchor && end) submit(anchor, end); // a plain tap leaves the first letter marked
  }
  const hintOne = () => {
    const p = G.words.find((x) => !x.found && !x.hint); if (!p) return;
    p.hint = true; paintList();
    const e = el(p.r, p.c); e.classList.add('hint'); setTimeout(() => e.classList.remove('hint'), 2500);
  };
  function finish(gaveUp) {
    G.over = true;
    const secs = Math.max(1, Math.round((Date.now() - G.t0) / 1000));
    let right = 0;
    G.words.forEach((p) => { const ok = p.found; if (ok) right++; gameResult(p.w, ok); });
    if (gaveUp) G.words.filter((p) => !p.found).forEach((p) => { for (let k = 0; k < p.w.w.length; k++) el(p.r + p.dr * k, p.c + p.dc * k).classList.add('rev'); });
    S.counts.wsearch = (S.counts.wsearch || 0) + (gaveUp ? 0 : 1);
    questEvent('round', { game: 'wsearch', correct: right, bestCombo: 0, perfect: right === G.words.length && !G.words.some((p) => p.hint) });
    if (!gaveUp) { addXP(10); confetti(); }
    updateStreak();
    const box = document.createElement('div');
    box.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${gaveUp ? '📚' : right === G.words.length ? '🏆' : '🎉'}</div>
        <div class="h2" style="margin:2px 0">${gaveUp ? `เจอ ${right}/${G.words.length} คำ` : `เจอครบ ${G.words.length} คำ!`}</div>
        <p class="small muted">${gaveUp ? 'คำที่ยังไม่เจอเข้าไปอยู่ในการทบทวนแล้ว' : `ใช้เวลา ${secs} วินาที${G.words.some((p) => p.hint) ? ' · ใช้คำใบ้ ' + G.words.filter((p) => p.hint).length + ' คำ' : ''}`}</p></div>
      <button class="btn primary block" id="wsAgain">เล่นอีกตาราง</button><div style="height:10px"></div><button class="btn block" id="wsMenu">เปลี่ยนหมวด / ความยาก</button>`;
    view.querySelector('#wsBar').replaceWith(box);
    $('#wsAgain').onclick = () => playWSearch();
    $('#wsMenu').onclick = () => renderWSearch();
    view.querySelector('.ws-wrap').scrollIntoView({ block: 'start' });
  }

  view.innerHTML = `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <div class="progress"><div id="wsProg" style="width:0%"></div></div>
      <span class="small" id="wsLeft"></span></div>
    <div class="ws-wrap">
      <div class="ws-grid" id="wsGrid" role="group" aria-label="ตารางตัวอักษร ${WS_N} คูณ ${WS_N}" lang="en">${G.grid.map((row, r) => row.map((ch, c) => `<button type="button" class="ws-c" tabindex="-1" data-r="${r}" data-c="${c}" aria-label="${ch}">${ch}</button>`).join('')).join('')}</div>
      <div class="ws-side"><ul class="ws-list" id="wsList"></ul>
        <div id="wsBar" class="row" style="margin-top:10px;gap:8px"><button class="btn grow" id="wsHint">💡 ใบ้ 1 คำ</button><button class="btn grow" id="wsGive">เฉลย</button></div></div>
    </div>`;
  const grid = $('#wsGrid');
  grid.addEventListener('pointerdown', onDown);
  grid.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  grid.addEventListener('contextmenu', (e) => e.preventDefault());
  cleanup = () => { window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); wsGame = null; };
  $('#quit').onclick = () => renderWSearch();
  $('#wsHint').onclick = () => { if (!G.over) hintOne(); };
  $('#wsGive').onclick = () => { if (!G.over) finish(true); };
  paintList();
}
