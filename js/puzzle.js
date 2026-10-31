'use strict';
// Daily puzzles (1.119, single player; route `puzzle`, tab 'cw' | 'lad'). The same two puzzles for everyone on the same day
// (seeded from the date, A1–A2 words):
//  · mini crossword: up to 6 crossing words in a grid of at most 9×9, Thai meanings as clues (makeCrossword(day));
//  · word ladder: change one letter at a time, every step a 4-letter list word, from a start word to a target 3–5 steps away (makeLadder(day)).
// Each solved puzzle: +15 coins +10 XP; both solved (no giving up) = the day counts for the puzzle streak + a foil card (js/collect.js).
// State: S.puz = { d, cw: [solved word indexes], rv: ['r,c' revealed cells], lad: [steps], ladDone, ladGave, streak, best, last, n }
// (cleanPuz()/mergePuz() in app.js). Classic script sharing globals with app.js.

const PUZ_CW_N = 6, PUZ_MAX = 9, PUZ_COINS = 15, PUZ_XP = 10, PUZ_HINT = 3;
// Small seeded random generator (same sequence for the same text on every device).
function puzRng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rngShuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const puzUnique = (re, lv) => { const seen = new Set(); return W.filter((w) => (!lv || lv.includes(w.g)) && re.test(w.w) && !seen.has(w.w) && seen.add(w.w)); };

/* ---------- crossword ---------- */
let PUZ_CW_POOL = null;
const puzCwPool = () => PUZ_CW_POOL || (PUZ_CW_POOL = puzUnique(/^[a-z]{3,7}$/, ['A1', 'A2']));
const cwCache = {};
function makeCrossword(day) {
  if (cwCache[day]) return cwCache[day];
  const rnd = puzRng('cw' + day), cands = rngShuffle(puzCwPool(), rnd);
  const cells = new Map(), placed = [], key = (r, c) => r + ',' + c;
  let r0 = 0, r1 = 0, c0 = 0, c1 = 0;
  const place = (w, r, c, d) => {
    for (let i = 0; i < w.w.length; i++) {
      const rr = r + i * d, cc = c + i * (1 - d), k = key(rr, cc), cell = cells.get(k) || { ch: w.w[i], dirs: [] };
      cell.dirs.push(d); cells.set(k, cell);
      r0 = Math.min(r0, rr); r1 = Math.max(r1, rr); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc);
    }
    placed.push({ w, r, c, d });
  };
  // number of crossings when the word fits there, -1 when it does not
  const fits = (s, r, c, d) => {
    const dr = d, dc = 1 - d, n = s.length;
    if (cells.has(key(r - dr, c - dc)) || cells.has(key(r + n * dr, c + n * dc))) return -1;
    if (Math.max(r1, r + (n - 1) * dr) - Math.min(r0, r) + 1 > PUZ_MAX || Math.max(c1, c + (n - 1) * dc) - Math.min(c0, c) + 1 > PUZ_MAX) return -1;
    let cross = 0;
    for (let i = 0; i < n; i++) {
      const rr = r + i * dr, cc = c + i * dc, cell = cells.get(key(rr, cc));
      if (cell) { if (cell.ch !== s[i] || cell.dirs.includes(d)) return -1; cross++; }
      else if (cells.has(key(rr + dc, cc + dr)) || cells.has(key(rr - dc, cc - dr))) return -1;
    }
    return cross;
  };
  place(cands.find((w) => w.w.length >= 5), 0, 0, 0);
  for (const w of cands) {
    if (placed.length >= PUZ_CW_N) break;
    if (placed.some((x) => x.w.w === w.w)) continue;
    let best = null;
    for (const [k, cell] of cells) {
      if (cell.dirs.length > 1) continue;
      const [r, c] = k.split(',').map(Number), d = cell.dirs[0] === 0 ? 1 : 0;
      for (let i = 0; i < w.w.length; i++) {
        if (w.w[i] !== cell.ch) continue;
        const sr = r - i * d, sc = c - i * (1 - d), x = fits(w.w, sr, sc, d);
        if (x > 0 && (!best || x > best.x)) best = { x, r: sr, c: sc, d };
      }
    }
    if (best) place(w, best.r, best.c, best.d);
  }
  // shift to 0,0 and number the clues like a printed crossword (row by row)
  const words = placed.map((p) => ({ w: p.w, r: p.r - r0, c: p.c - c0, d: p.d }));
  const starts = [...new Set(words.map((x) => x.r * 100 + x.c))].sort((a, b) => a - b);
  words.forEach((x) => { x.n = starts.indexOf(x.r * 100 + x.c) + 1; });
  const grid = Array.from({ length: r1 - r0 + 1 }, () => Array(c1 - c0 + 1).fill(''));
  words.forEach((x) => { for (let i = 0; i < x.w.w.length; i++) grid[x.r + i * x.d][x.c + i * (1 - x.d)] = x.w.w[i]; });
  return (cwCache[day] = { words, grid, rows: grid.length, cols: grid[0].length });
}
const cwCells = (x) => Array.from({ length: x.w.w.length }, (_, i) => [x.r + i * x.d, x.c + i * (1 - x.d)]);

/* ---------- word ladder ---------- */
let LAD = null;
function ladGraph() {
  if (LAD) return LAD;
  const words = puzUnique(/^[a-z]{4}$/).map((w) => w.w), set = new Set(words), buckets = new Map();
  for (const w of words) for (let i = 0; i < 4; i++) { const k = w.slice(0, i) + '_' + w.slice(i + 1); (buckets.get(k) || buckets.set(k, []).get(k)).push(w); }
  const nb = (w) => { const out = new Set(); for (let i = 0; i < 4; i++) for (const x of buckets.get(w.slice(0, i) + '_' + w.slice(i + 1)) || []) if (x !== w) out.add(x); return [...out]; };
  return (LAD = { set, nb });
}
function ladBfs(from) {
  const g = ladGraph(), par = new Map([[from, null]]), dist = new Map([[from, 0]]), q = [from];
  for (let k = 0; k < q.length; k++) for (const x of g.nb(q[k])) if (!par.has(x)) { par.set(x, q[k]); dist.set(x, dist.get(q[k]) + 1); q.push(x); }
  return { par, dist };
}
const ladPath = (bfs, to) => { const p = []; for (let x = to; x != null; x = bfs.par.get(x)) p.unshift(x); return p; };
const ladDiff = (a, b) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;
const ladCache = {};
function makeLadder(day) {
  if (ladCache[day]) return ladCache[day];
  const rnd = puzRng('lad' + day), easy = new Set(puzUnique(/^[a-z]{4}$/, ['A1', 'A2']).map((w) => w.w));
  for (const from of rngShuffle([...easy].sort(), rnd)) {
    const bfs = ladBfs(from), targets = [...easy].sort().filter((w) => { const d = bfs.dist.get(w); return d >= 3 && d <= 5; });
    if (targets.length) { const to = targets[Math.floor(rnd() * targets.length)]; return (ladCache[day] = { from, to, path: ladPath(bfs, to) }); }
  }
  return null;
}
const wordOf = (s) => W.find((w) => w.w === s);

/* ---------- state ---------- */
function puzToday() {
  const t = today();
  if (S.puz.d !== t) S.puz = { ...S.puz, d: t, cw: [], rv: [], lad: [], ladDone: false, ladGave: false };
  return S.puz;
}
const cwDone = (p = puzToday()) => p.cw.length >= makeCrossword(p.d).words.length;
function puzSolved(which) {
  const p = puzToday();
  addCoins(PUZ_COINS); addXP(PUZ_XP); sfx('win');
  if (cwDone(p) && p.ladDone && !p.ladGave) {
    const y = ymd(new Date(Date.now() - DAY));
    p.streak = p.last === y ? p.streak + 1 : p.last === p.d ? p.streak : 1;
    p.best = Math.max(p.best, p.streak); p.last = p.d; p.n++;
    const f = typeof foilGive === 'function' ? foilGive() : null;
    confetti('burst');
    setTimeout(() => toast(`🧩 ครบทั้ง 2 ปริศนาวันนี้! 🔥 ต่อเนื่อง ${p.streak} วัน${f ? ` · ได้การ์ดฟอยล์ ✨ ${f}` : ''}`), 500);
  } else { confetti(); toast(`${which === 'cw' ? '✏️ ครอสเวิร์ด' : '🪜 บันไดคำ'} สำเร็จ! +🪙 ${PUZ_COINS}`); }
  save();
}

/* ---------- page ---------- */
let puzTab = 'cw', cwSel = 0;
function renderPuzzle(tab) {
  if (tab === 'cw' || tab === 'lad') puzTab = tab;
  const p = puzToday();
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="pzBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="seg" role="tablist" style="margin-bottom:12px"><button role="tab" data-tab="cw" class="${puzTab === 'cw' ? 'on' : ''}" aria-selected="${puzTab === 'cw'}">✏️ ครอสเวิร์ด${cwDone(p) ? ' ✅' : ''}</button><button role="tab" data-tab="lad" class="${puzTab === 'lad' ? 'on' : ''}" aria-selected="${puzTab === 'lad'}">🪜 บันไดคำ${p.ladDone ? (p.ladGave ? ' 🏳️' : ' ✅') : ''}</button></div>
    <div id="pzBody"></div>
    <p class="small muted center" style="margin:12px 4px">🔥 ทำครบทั้ง 2 ปริศนาต่อเนื่อง ${p.streak && (p.last === p.d || p.last === ymd(new Date(Date.now() - DAY))) ? p.streak : 0} วัน · สูงสุด ${p.best} วัน · ปริศนาใหม่ทุกวัน (ทุกคนได้โจทย์เดียวกัน)</p>`;
  $('#pzBack').onclick = () => go('fun');
  view.querySelector('.seg').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) renderPuzzle(b.dataset.tab); };
  if (puzTab === 'cw') renderCw(); else renderLad();
}

function renderCw() {
  const p = puzToday(), cw = makeCrossword(p.d), solved = new Set(p.cw), rv = new Set(p.rv);
  const known = new Set(); cw.words.forEach((x, i) => { if (solved.has(i)) cwCells(x).forEach(([r, c]) => known.add(r + ',' + c)); });
  if (solved.has(cwSel) || !cw.words[cwSel]) { const n = cw.words.findIndex((_, i) => !solved.has(i)); cwSel = n < 0 ? 0 : n; }
  const sel = cw.words[cwSel], selCells = new Set(cwCells(sel).map(([r, c]) => r + ',' + c));
  const num = {}; cw.words.forEach((x) => { num[x.r + ',' + x.c] = x.n; });
  const grid = cw.grid.map((row, r) => row.map((ch, c) => {
    const k = r + ',' + c;
    if (!ch) return '<i class="cw-x"></i>';
    const show = known.has(k) || rv.has(k);
    return `<button class="cw-c${selCells.has(k) && !cwDone(p) ? ' sel' : ''}${known.has(k) ? ' ok' : ''}" data-cell="${k}" aria-label="ช่อง ${num[k] ? 'ข้อ ' + num[k] : ''} ${show ? ch : 'ว่าง'}">${num[k] ? `<small>${num[k]}</small>` : ''}<span lang="en">${show ? ch.toUpperCase() : ''}</span></button>`;
  }).join('')).join('');
  const clue = (x, i) => `<button class="cw-clue${i === cwSel && !cwDone(p) ? ' on' : ''}${solved.has(i) ? ' ok' : ''}" data-clue="${i}"><b>${x.n}</b> <span class="grow">${esc(thFirst(x.w.t))} <span class="small muted">(${esc(x.w.p)} · ${x.w.w.length} ตัว)</span></span>${solved.has(i) ? `<span lang="en" class="small">✅ ${esc(x.w.w)}</span>` : ''}</button>`;
  const list = (d) => cw.words.map((x, i) => [x, i]).filter(([x]) => x.d === d).sort((a, b) => a[0].n - b[0].n).map(([x, i]) => clue(x, i)).join('');
  const pattern = cwCells(sel).map(([r, c]) => (known.has(r + ',' + c) || rv.has(r + ',' + c) ? cw.grid[r][c].toUpperCase() : '_')).join(' ');
  $('#pzBody').innerHTML = `<div class="card-box cw-wrap"><div class="cw-grid" style="--cols:${cw.cols}">${grid}</div></div>
    ${cwDone(p) ? `<div class="card-box center"><b>🎉 ครอสเวิร์ดวันนี้เสร็จแล้ว</b>${p.ladDone ? '' : '<div class="small muted" style="margin-top:4px">ไปต่อที่ 🪜 บันไดคำ เพื่อนับวันต่อเนื่อง</div>'}</div>`
      : `<div class="card-box"><div class="small muted">ข้อ ${sel.n} ${sel.d ? 'แนวตั้ง ↓' : 'แนวนอน →'} · ${esc(thFirst(sel.w.t))}</div><div class="cw-pat" lang="en" aria-label="ตัวอักษรที่รู้แล้ว">${pattern}</div>
      <form id="cwForm" class="row" style="gap:8px"><input id="cwIn" class="search grow" lang="en" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="${sel.w.w.length}" placeholder="พิมพ์คำ ${sel.w.w.length} ตัวอักษร" aria-label="คำตอบข้อ ${sel.n}"><button class="btn primary" type="submit">ตอบ</button></form>
      <button class="pw-btn" id="cwHint" style="margin-top:8px" ${coinBal() < PUZ_HINT ? 'disabled' : ''}>💡 เปิด 1 ตัวอักษร <small>🪙${PUZ_HINT}</small></button></div>`}
    <div class="card-box"><div class="small muted"><b>แนวนอน →</b></div>${list(0)}<div class="small muted" style="margin-top:8px"><b>แนวตั้ง ↓</b></div>${list(1)}</div>`;
  const body = $('#pzBody');
  body.onclick = (e) => {
    const c = e.target.closest('[data-clue]'), cell = e.target.closest('[data-cell]');
    if (c && !solved.has(+c.dataset.clue)) { cwSel = +c.dataset.clue; renderCw(); const i = $('#cwIn'); if (i) i.focus(); }
    else if (cell) {
      const hits = cw.words.map((x, i) => i).filter((i) => !solved.has(i) && cwCells(cw.words[i]).some(([r, cc]) => r + ',' + cc === cell.dataset.cell));
      if (hits.length) { cwSel = hits.includes(cwSel) && hits.length > 1 ? hits.find((i) => i !== cwSel) : hits[0]; renderCw(); }
    }
  };
  const form = $('#cwForm');
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const v = $('#cwIn').value.trim().toLowerCase();
    if (!v) return;
    if (v === sel.w.w) {
      p.cw.push(cwSel); markActive(); save(); speak(sel.w.w);
      if (cwDone(p)) puzSolved('cw'); else sfx('ok');
      renderPuzzle();
    } else { sfx('bad'); toast(v.length !== sel.w.w.length ? `ต้องมี ${sel.w.w.length} ตัวอักษร` : 'ยังไม่ใช่ ลองใหม่นะ'); $('#cwIn').select(); }
  };
  const hint = $('#cwHint');
  if (hint) hint.onclick = () => {
    const hidden = cwCells(sel).map(([r, c]) => r + ',' + c).filter((k) => !known.has(k) && !rv.has(k));
    if (hidden.length <= 1) return toast('เหลือตัวเดียวแล้ว ลองเดาดูนะ 💪');
    if (!spendCoins(PUZ_HINT)) return;
    p.rv.push(hidden[0]); save(); renderCw();
  };
}

function renderLad() {
  const p = puzToday(), L = makeLadder(p.d), g = ladGraph(), cur = p.lad.length ? p.lad[p.lad.length - 1] : L.from;
  const step = (s, cls = '') => { const w = wordOf(s); return `<div class="lad-step ${cls}"><b lang="en">${esc(s.toUpperCase())}</b><span class="small muted">${w ? esc(thFirst(w.t)) : ''}</span></div>`; };
  const shortest = L.path.length - 1;
  $('#pzBody').innerHTML = `<div class="card-box"><p class="small muted" style="margin:0 0 8px">เปลี่ยนทีละ 1 ตัวอักษร ทุกขั้นต้องเป็นคำในลิสต์ จาก <b lang="en">${L.from.toUpperCase()}</b> ไปให้ถึง <b lang="en">${L.to.toUpperCase()}</b> (สั้นสุด ${shortest} ขั้น)</p>
    <div class="lad">${step(L.from, 'start')}${p.lad.map((s) => step(s, s === L.to ? 'goal ok' : '')).join('')}
    ${p.ladDone ? '' : `<form id="ladForm" class="row lad-form" style="gap:8px"><input id="ladIn" class="search grow" lang="en" maxlength="4" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="คำถัดไป (4 ตัว)" aria-label="คำถัดไป"><button class="btn primary" type="submit">ใส่</button></form>
    ${step(L.to, 'goal')}`}</div>
    ${p.ladDone ? `<div class="center" style="margin-top:10px"><b>${p.ladGave ? `🏳️ เฉลย: ${L.path.map((s) => s.toUpperCase()).join(' → ')}` : `🎉 ถึงแล้วใน ${p.lad.length} ขั้น${p.lad.length === shortest ? ' · สั้นสุดเลย! 💯' : ''}`}</b></div>`
      : `<div class="pw-row"><button class="pw-btn" id="ladHint" ${coinBal() < PUZ_HINT ? 'disabled' : ''}>💡 คำใบ้ <small>🪙${PUZ_HINT}</small></button>${p.lad.length ? '<button class="pw-btn" id="ladUndo">↩️ ลบคำล่าสุด</button>' : ''}<button class="pw-btn" id="ladGive">🏳️ ยอมแพ้</button></div><div class="small center" id="ladTip" aria-live="polite"></div>`}</div>`;
  const form = $('#ladForm');
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const v = $('#ladIn').value.trim().toLowerCase();
    if (!v) return;
    const bad = v.length !== 4 ? 'ต้องเป็นคำ 4 ตัวอักษร' : !ladDiff(cur, v) ? `ต้องต่างจาก ${cur.toUpperCase()} แค่ 1 ตัวอักษร` : !g.set.has(v) ? 'ไม่มีคำนี้ในลิสต์ของแอป' : v === L.from || p.lad.includes(v) ? 'ใช้คำนี้ไปแล้ว' : '';
    if (bad) { sfx('bad'); toast(bad); $('#ladIn').select(); return; }
    p.lad.push(v); markActive(); speak(v);
    if (v === L.to) { p.ladDone = true; puzSolved('lad'); } else { sfx('ok'); save(); }
    renderPuzzle();
    const i = $('#ladIn'); if (i) i.focus();
  };
  const hint = $('#ladHint');
  if (hint) hint.onclick = () => {
    if (!spendCoins(PUZ_HINT)) return;
    const path = ladPath(ladBfs(L.to), cur).reverse(), next = path[1], w = next && wordOf(next), pos = next ? [...cur].findIndex((c, i) => c !== next[i]) : -1;
    $('#ladTip').innerHTML = next ? `💡 เปลี่ยนตัวที่ ${pos + 1} (${esc(cur[pos].toUpperCase())}) → คำที่แปลว่า “${esc(w ? thFirst(w.t) : '')}”` : '';
    hint.disabled = true;
  };
  const undo = $('#ladUndo');
  if (undo) undo.onclick = () => { p.lad.pop(); save(); renderLad(); };
  const give = $('#ladGive');
  if (give) give.onclick = () => { p.ladDone = true; p.ladGave = true; markActive(); save(); renderPuzzle(); };
}
function puzStatus() { const p = puzToday(), n = (cwDone(p) ? 1 : 0) + (p.ladDone ? 1 : 0); return n === 2 ? 'วันนี้ครบแล้ว ✅' : `วันนี้ ${n}/2 ปริศนา`; }
FUN_TILES.push({ id: 'puzzle', o: 20, home: true, ic: '🧩', name: 'ปริศนาประจำวัน', sub: () => `✏️ ครอสเวิร์ด + 🪜 บันไดคำ · ${puzStatus()}`, go: () => go('puzzle') });
