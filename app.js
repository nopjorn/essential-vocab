'use strict';

// App version shown in the UI. Bump it (and VERSION in sw.js) on every push.
const APP_VERSION = '1.3.0';

/* ---------- data ---------- */
// WORDS rows: [word, pos, level, ipa, thai, example, thai example, 5 if Oxford 5000-only]
// g = study group: A1–B2 are Oxford 3000; B2x and C1 are the extra Oxford 5000 words.
const W = window.WORDS.map(([w, p, l, i, t, e, et, s], idx) => ({ idx, w, p, l, i, t, e, et, g: s === 5 ? (l === 'B2' ? 'B2x' : 'C1') : l }));
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'B2x', 'C1'];
const LEVELS_3000 = ['A1', 'A2', 'B1', 'B2'];
const LEVELS_5000 = ['B2x', 'C1'];
const LV_LABEL = { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', B2x: 'B2+', C1: 'C1' };
const lvNames = (ls) => ls.map((l) => LV_LABEL[l]).join(', ');
const DAY = 86400000;
// Review intervals (days) for each box. Box >= MASTERED counts as "จำได้แล้ว".
const INTERVALS = [0, 1, 3, 7, 16, 35, 80, 180];
const MASTERED = 4;

/* ---------- storage ---------- */
const KEY = 'oxford3000.v1';
const defaults = () => ({
  prog: {},            // word -> { b: box, d: due ms, s: seen, c: correct, x: wrong }
  settings: { levels: ['A1'], newPerDay: 20, autoSpeak: true, rate: 0.9, accent: 'en-US', front: 'en', order: 'shuffle', sfx: true },
  daily: { date: '', fresh: 0, reviews: 0 },
  streak: { last: '', count: 0 },
  best: {},            // game -> best score
  hist: {},            // 'YYYY-MM-DD' -> cards/answers that day
});
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = defaults(), s = JSON.parse(raw);
      return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
    }
  } catch (e) { /* storage unavailable: start fresh */ }
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

const today = () => new Date().toLocaleDateString('en-CA');
function rollDay() {
  if (S.daily.date !== today()) S.daily = { date: today(), fresh: 0, reviews: 0 };
}
function markActive() {
  rollDay();
  const t = today();
  S.hist[t] = (S.hist[t] || 0) + 1;
  if (S.streak.last === t) return;
  const y = new Date(Date.now() - DAY).toLocaleDateString('en-CA');
  S.streak.count = S.streak.last === y ? S.streak.count + 1 : 1;
  S.streak.last = t;
}
function streakNow() {
  const y = new Date(Date.now() - DAY).toLocaleDateString('en-CA');
  return (S.streak.last === today() || S.streak.last === y) ? S.streak.count : 0;
}

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.random() * a.length | 0];
const view = $('#view');
const lvBadge = (g) => `<span class="lv ${g}">${LV_LABEL[g]}</span>`;
const thFirst = (t) => t.split(/[;,]/)[0].trim();
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Example sentence with the word (and simple inflections like -s/-ed/-ing) highlighted.
function hlExample(w) {
  const m = new RegExp('(^|[^A-Za-z])(' + reEsc(w.w) + '[a-z]*)', 'i').exec(w.e);
  if (!m) return esc(w.e);
  const at = m.index + m[1].length;
  return esc(w.e.slice(0, at)) + '<mark>' + esc(m[2]) + '</mark>' + esc(w.e.slice(at + m[2].length));
}
// Words whose example sentence contains the exact word, usable for fill-in-the-blank.
const clozeRe = (w) => new RegExp('(^|[^A-Za-z])' + reEsc(w.w) + '(?![A-Za-z])', 'i');
const hasCloze = (w) => clozeRe(w).test(w.e);
const exampleBox = (w) => `<div class="example"><div class="en">${hlExample(w)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(w.et)}</div></div>`;

// Tiny sound effects with Web Audio (no files needed).
let actx;
function sfx(kind) {
  if (!S.settings.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], bad: [220, 160], win: [523, 659, 784, 1047] }[kind];
    notes.forEach((f, k) => {
      const o = actx.createOscillator(), g = actx.createGain();
      const t0 = actx.currentTime + k * 0.09;
      o.type = kind === 'bad' ? 'square' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.05 : 0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + 0.18);
    });
  } catch (e) { /* audio unavailable */ }
}
function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const bits = ['🎉', '⭐', '✨', '💜', '🎊', '🔥'];
  for (let k = 0; k < 36; k++) {
    const b = document.createElement('span');
    b.textContent = pick(bits);
    b.style.left = Math.random() * 100 + 'vw';
    b.style.animationDelay = Math.random() * 0.6 + 's';
    b.style.fontSize = 16 + Math.random() * 18 + 'px';
    box.appendChild(b);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
  sfx('win');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function status(w) {
  const p = S.prog[w.w];
  if (!p) return 'new';
  return p.b >= MASTERED ? 'mastered' : 'learning';
}
const pool = () => W.filter((w) => S.settings.levels.includes(w.g));
const dueList = (list = pool()) => {
  const now = Date.now();
  return list.filter((w) => S.prog[w.w] && S.prog[w.w].d <= now).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d);
};

/* ---------- speech (iOS needs a user gesture before the first utterance) ---------- */
let voices = [];
function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = S.settings.accent;
  u.lang = lang; u.rate = S.settings.rate;
  const v = voices.find((v) => v.lang === lang && /Samantha|Daniel|Karen|Ava|Siri/i.test(v.name)) || voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

/* ---------- spaced repetition ---------- */
// grade: 0 again, 1 hard, 2 good, 3 easy
function nextBox(p, grade) {
  const b = p ? p.b : 0;
  if (grade === 0) return 0;
  if (grade === 1) return Math.max(1, b);
  if (grade === 2) return Math.min(b + 1, INTERVALS.length - 1);
  return Math.min(b + 2, INTERVALS.length - 1);
}
function intervalLabel(box) {
  if (box === 0) return '< 1 นาที';
  const d = INTERVALS[box];
  if (d < 30) return d + ' วัน';
  return Math.round(d / 30) + ' เดือน';
}
function grade(w, g) {
  markActive();
  const p = S.prog[w.w];
  if (!p) {
    S.daily.fresh++;
    if (S.daily.fresh === S.settings.newPerDay) setTimeout(() => { confetti(); toast('🎯 ครบเป้าคำใหม่วันนี้แล้ว เก่งมาก!'); }, 300);
  } else S.daily.reviews++;
  const b = nextBox(p, g);
  S.prog[w.w] = {
    b,
    d: b === 0 ? Date.now() : Date.now() + INTERVALS[b] * DAY - 3600000,
    s: (p ? p.s : 0) + 1,
    c: (p ? p.c : 0) + (g > 0 ? 1 : 0),
    x: (p ? p.x || 0 : 0) + (g === 0 ? 1 : 0),
  };
  save();
}
// Lighter update from games: a right answer seeds/advances a little, a wrong one sends it back for review.
function gameResult(w, ok) {
  markActive();
  const p = S.prog[w.w];
  if (ok) {
    if (!p) S.prog[w.w] = { b: 1, d: Date.now() + DAY, s: 1, c: 1, x: 0 };
    else { p.c++; p.s++; }
  } else {
    S.prog[w.w] = { b: 0, d: Date.now(), s: (p ? p.s : 0) + 1, c: p ? p.c : 0, x: (p ? p.x || 0 : 0) + 1 };
  }
  save();
}

// "I already know this": jump straight to a long interval so it stops appearing as new.
function markKnown(w) {
  markActive();
  S.prog[w.w] = { b: MASTERED, d: Date.now() + INTERVALS[MASTERED] * DAY, s: 1, c: 1, x: 0 };
  save();
}
function markForReview(w) {
  const p = S.prog[w.w];
  S.prog[w.w] = { b: 0, d: Date.now(), s: p ? p.s : 0, c: p ? p.c : 0, x: p ? p.x || 0 : 0 };
  save();
}

/* ---------- router ---------- */
let current = 'home';
let cleanup = null;
const TITLES = { home: 'Oxford 3000', cards: 'แฟลชการ์ด', games: 'เกมฝึกศัพท์', list: 'คำศัพท์', settings: 'ตั้งค่า' };
function go(tab, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  current = tab;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#title').textContent = TITLES[tab] || 'Oxford 3000';
  view.scrollTop = 0;
  ({ home: renderHome, cards: renderCards, games: renderGames, list: renderList, settings: renderSettings }[tab])(...args);
  updateStreak();
}
function updateStreak() { $('#streak').textContent = '🔥 ' + streakNow(); }
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (b) go(b.dataset.tab);
});

/* ---------- home ---------- */
function renderHome() {
  rollDay();
  const p = pool();
  const due = dueList(p).length;
  const newLeft = Math.max(0, S.settings.newPerDay - S.daily.fresh);
  const unseen = p.filter((w) => !S.prog[w.w]).length;
  const todo = due + Math.min(newLeft, unseen);
  const doneToday = S.daily.fresh + S.daily.reviews;
  const goal = S.settings.newPerDay;
  const totalLearned = W.filter((w) => S.prog[w.w]).length;
  const totalMastered = W.filter((w) => status(w) === 'mastered').length;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

  const lvRow = (l) => {
    const ws = W.filter((w) => w.g === l);
    const learned = ws.filter((w) => S.prog[w.w]).length;
    const mastered = ws.filter((w) => status(w) === 'mastered').length;
    return `<div class="lvl-row">${lvBadge(l)}
      <div class="grow"><div class="bar"><div class="l" style="width:${learned / ws.length * 100}%"></div><div class="m" style="width:${mastered / ws.length * 100}%"></div></div>
      <div class="small muted" style="margin-top:4px">เรียนแล้ว ${learned} · จำได้ ${mastered} / ${ws.length}</div></div></div>`;
  };
  const lvRows = `<div class="small muted" style="margin-top:8px"><b>Oxford 3000</b></div>${LEVELS_3000.map(lvRow).join('')}
    <div class="small muted" style="margin-top:12px"><b>Oxford 5000</b> (คำเพิ่มเติม)</div>${LEVELS_5000.map(lvRow).join('')}`;

  view.innerHTML = `
    <div class="hero pop">
      <div class="small" style="opacity:.9">${greeting()}</div>
      <div class="big" style="margin-top:6px">${todo}</div>
      <div>การ์ดที่รอวันนี้ (${lvNames(S.settings.levels)})</div>
      <div class="stats">
        <div class="stat"><b>${due}</b><span>ต้องทบทวน</span></div>
        <div class="stat"><b>${Math.min(newLeft, unseen)}</b><span>คำใหม่</span></div>
        <div class="stat"><b>${doneToday}</b><span>ทำแล้ววันนี้</span></div>
      </div>
      <button class="btn" id="startBtn">${todo ? '▶︎ เริ่มเรียนเลย' : '🎉 วันนี้ครบแล้ว! เรียนเพิ่ม'}</button>
      <div class="goal-bar"><div style="width:${Math.min(100, S.daily.fresh / goal * 100)}%"></div></div>
      <div class="small" style="margin-top:4px;opacity:.9">เป้าคำใหม่วันนี้ ${S.daily.fresh}/${goal}</div>
    </div>

    ${standalone ? '' : `<div class="card-box install-tip small">
      📲 <b>ติดตั้งเป็นแอปบน iPhone:</b> เปิดหน้านี้ใน Safari → กดปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศร) → <b>เพิ่มไปยังหน้าจอโฮม</b> จะได้ใช้งานเต็มจอและออฟไลน์ได้</div>`}

    <div class="h2">7 วันที่ผ่านมา</div>
    <div class="card-box week">${weekChart()}</div>

    <div class="h2">เล่นเกมด่วน</div>
    <div class="game-grid">
      ${gameTile('cloze')}${gameTile('match')}
    </div>

    <div class="h2">ความคืบหน้า</div>
    <div class="card-box">
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <b>ทั้งหมด ${W.length} คำ</b><span class="small muted">เรียนแล้ว ${totalLearned} · จำได้ ${totalMastered}</span>
      </div>
      ${lvRows}
      <div class="small muted" style="margin-top:8px">🟣 เรียนแล้ว &nbsp; 🟢 จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div>
    </div>
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#startBtn').onclick = () => go('cards', !todo);
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
}
function weekChart() {
  const names = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(Date.now() - k * DAY);
    const key = d.toLocaleDateString('en-CA');
    days.push({ n: S.hist[key] || 0, label: k === 0 ? 'วันนี้' : names[d.getDay()] });
  }
  const max = Math.max(10, ...days.map((d) => d.n));
  return days.map((d) => `<div class="wk"><div class="wk-n">${d.n || ''}</div><div class="wk-bar"><div style="height:${d.n / max * 100}%"></div></div><div class="wk-l">${d.label}</div></div>`).join('');
}
function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'อรุณสวัสดิ์ ☀️' : h < 17 ? 'สวัสดีตอนบ่าย 🌤️' : 'สวัสดีตอนเย็น 🌙';
  const s = streakNow();
  return s ? `${g} เรียนต่อเนื่อง ${s} วันแล้ว เก่งมาก!` : `${g} มาเริ่มกันเลย!`;
}

/* ---------- flashcards ---------- */
function buildQueue(extra) {
  rollDay();
  const p = pool();
  const due = dueList(p).slice(0, 200);
  let fresh = p.filter((w) => !S.prog[w.w]);
  if (S.settings.order === 'shuffle') fresh = shuffle(fresh);
  const n = extra ? 10 : Math.max(0, S.settings.newPerDay - S.daily.fresh);
  fresh = fresh.slice(0, n);
  // Mix new cards in among reviews so a session doesn't end with only new words.
  const q = [];
  const step = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : 0;
  let di = 0;
  fresh.forEach((w) => { q.push(...due.slice(di, di + step)); di += step; q.push(w); });
  q.push(...due.slice(di));
  if (!q.length && extra) {
    // Nothing new left: practise learned words that are closest to being due.
    return p.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, 20);
  }
  return q;
}

function renderCards(extra) {
  const queue = buildQueue(extra);
  const total = queue.length;
  let done = 0, stats = { again: 0, ok: 0 };
  if (!total) {
    view.innerHTML = `<div class="card-box center pop" style="margin-top:30px">
      <div class="result-emoji">🎉</div><div class="h2">ไม่มีการ์ดค้างแล้ว!</div>
      <p class="muted">ทบทวนครบทุกใบสำหรับระดับ ${lvNames(S.settings.levels)}</p>
      <button class="btn primary block" id="more">เรียนคำใหม่เพิ่มอีก 10 คำ</button>
      <div style="height:10px"></div><button class="btn block" id="toGame">ไปเล่นเกม 🎮</button></div>`;
    $('#more').onclick = () => go('cards', true);
    $('#toGame').onclick = () => go('games');
    return;
  }

  view.innerHTML = `
    <div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <div class="progress"><div id="pbar" style="width:0"></div></div>
      <span class="small muted" id="pcount"></span>
      <button class="icon-btn" id="undo" aria-label="ย้อนกลับ" style="visibility:hidden">↩︎</button>
    </div>
    <div class="stage" id="stage"></div>
    <div class="grade" id="grade"></div>`;
  $('#quit').onclick = () => go('home');

  let card = null, flipped = false;
  const gradeBox = $('#grade');
  // Undo stack: snapshots taken before each answer so a mis-tap can be reverted.
  const history = [];
  $('#undo').onclick = () => {
    const h = history.pop(); if (!h) return;
    if (h.prev) S.prog[h.w] = h.prev; else delete S.prog[h.w];
    S.daily = h.daily; save();
    queue.splice(0, queue.length, ...h.queue);
    done = h.done; stats = h.stats;
    show();
  };

  function show() {
    if (!queue.length) return finish();
    card = queue[0]; flipped = false;
    $('#pbar').style.width = (done / total * 100) + '%';
    $('#pcount').textContent = `${done}/${total}`;
    const p = S.prog[card.w];
    const isNew = !p;
    const enFront = S.settings.front === 'en';
    const enFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span></div>
      <div class="word">${esc(card.w)}</div><div class="ipa">${esc(card.i)}</div>
      <button class="speak" data-say aria-label="ฟังเสียง">🔊</button>`;
    const thFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span></div>
      <div class="th">${esc(card.t)}</div>`;
    const backExtra = exampleBox(card) + `<a class="link" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูความหมาย/ตัวอย่างใน Oxford ↗</a>`;
    $('#stage').innerHTML = `
      <div class="fc" id="fc">
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div>
        <div class="fc-inner">
          <div class="face front">${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}แตะเพื่อพลิก · ปัดซ้าย/ขวา</div></div>
          <div class="face back">${enFront ? `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span></div>
            <div class="th">${esc(card.t)}</div><div class="ipa" style="margin-top:8px">${esc(card.w)} ${esc(card.i)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>${backExtra}`
            : enFace + backExtra}</div>
        </div>
      </div>`;
    gradeBox.innerHTML = [
      ['g-again', 'ลืม', 0], ['g-hard', 'ยาก', 1], ['g-good', 'จำได้', 2], ['g-easy', 'ง่าย', 3],
    ].map(([c, t, g]) => `<button class="btn ${c}" data-g="${g}">${t}<small>${intervalLabel(nextBox(p, g))}</small></button>`).join('');
    gradeBox.style.visibility = 'hidden';
    $('#undo').style.visibility = history.length ? 'visible' : 'hidden';
    if (enFront && S.settings.autoSpeak) speak(card.w);
    bindCard();
  }

  function flip() {
    flipped = !flipped;
    $('#fc').classList.toggle('flip', flipped);
    if (flipped) {
      gradeBox.style.visibility = 'visible';
      if (S.settings.front !== 'en' && S.settings.autoSpeak) speak(card.w);
    }
  }

  function snapshot() {
    history.push({ w: card.w, prev: S.prog[card.w] && { ...S.prog[card.w] }, daily: { ...S.daily }, queue: queue.slice(), done, stats: { ...stats } });
    if (history.length > 30) history.shift();
  }
  function answer(g) {
    snapshot();
    grade(card, g);
    queue.shift();
    if (g === 0) {
      stats.again++;
      queue.splice(Math.min(queue.length, 3 + (Math.random() * 3 | 0)), 0, card);
    } else { stats.ok++; done++; }
    show();
  }

  function bindCard() {
    const fc = $('#fc');
    let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
    const tl = $('.swipe-tag.l', fc), tr = $('.swipe-tag.r', fc);
    fc.addEventListener('click', (e) => {
      if (e.target.closest('[data-say]')) { e.stopPropagation(); speak(card.w); return; }
      if (e.target.closest('[data-sayex]')) { e.stopPropagation(); speak(card.e); return; }
      if (e.target.closest('[data-know]')) {
        e.stopPropagation(); snapshot(); markKnown(card);
        queue.shift(); stats.ok++; done++; toast('ข้าม "' + card.w + '" แล้ว 👍'); show(); return;
      }
      if (e.target.closest('a')) return;
      if (!moved) flip();
    });
    fc.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; dragging = true; moved = false;
      fc.style.transition = 'none';
    }, { passive: true });
    fc.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0]; dx = t.clientX - sx;
      if (Math.abs(dx) < Math.abs(t.clientY - sy)) return;
      if (Math.abs(dx) > 8) moved = true;
      fc.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
      tl.style.opacity = Math.min(1, Math.max(0, -dx / 100));
      tr.style.opacity = Math.min(1, Math.max(0, dx / 100));
    }, { passive: true });
    fc.addEventListener('touchend', () => {
      dragging = false;
      fc.style.transition = '';
      if (Math.abs(dx) > 100) {
        fc.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx / 10}deg)`;
        setTimeout(() => answer(dx > 0 ? 2 : 0), 180);
      } else {
        fc.style.transform = ''; tl.style.opacity = 0; tr.style.opacity = 0;
        setTimeout(() => (moved = false), 50);
      }
    });
  }

  gradeBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]'); if (b) answer(+b.dataset.g);
  });

  function finish() {
    updateStreak();
    confetti();
    view.innerHTML = `<div class="card-box center pop" style="margin-top:30px">
      <div class="result-emoji">🏆</div><div class="h2">จบรอบแล้ว เก่งมาก!</div>
      <p>ทบทวน ${total} ใบ · กด "ลืม" ${stats.again} ครั้ง</p>
      <p class="muted small">คำที่ลืมจะกลับมาให้ทบทวนอีกเร็วๆ นี้</p>
      <button class="btn primary block" id="more">เรียนคำใหม่เพิ่มอีก 10 คำ</button>
      <div style="height:10px"></div><button class="btn block" id="home">กลับหน้าแรก</button></div>`;
    $('#more').onclick = () => go('cards', true);
    $('#home').onclick = () => go('home');
  }

  show();
}

/* ---------- games ---------- */
const GAMES = {
  en2th: { icon: '🇬🇧', name: 'ทายความหมาย', desc: 'ดูคำอังกฤษ เลือกคำแปลไทย' },
  th2en: { icon: '🇹🇭', name: 'ทายคำศัพท์', desc: 'ดูคำไทย เลือกคำอังกฤษ' },
  listen: { icon: '🎧', name: 'ฟังแล้วตอบ', desc: 'ฟังเสียง เลือกความหมาย' },
  spell: { icon: '⌨️', name: 'สะกดคำ', desc: 'ดูคำแปล พิมพ์คำอังกฤษ' },
  cloze: { icon: '📝', name: 'เติมคำในประโยค', desc: 'เลือกคำที่หายไปจากประโยค' },
  match: { icon: '🧩', name: 'จับคู่ด่วน', desc: 'จับคู่คำกับคำแปลแข่งเวลา' },
  review: { icon: '🔁', name: 'คำที่ผิดบ่อย', desc: 'ฝึกคำที่เคยตอบผิด' },
};
function gameTile(id) {
  const g = GAMES[id];
  const best = S.best[id] != null ? `<span>🏅 สถิติ: ${S.best[id]}</span>` : '';
  return `<button class="game-tile" data-game="${id}"><div class="gi">${g.icon}</div><b>${g.name}</b><span>${g.desc}</span>${best}</button>`;
}
let gameSource = 'level';
function renderGames() {
  view.innerHTML = `
    <div class="card-box">
      <div class="small muted" style="margin-bottom:8px">ใช้คำศัพท์จาก</div>
      <div class="chips" id="src">
        <button class="chip" data-s="level">ระดับที่เลือก (${lvNames(S.settings.levels)})</button>
        <button class="chip" data-s="learned">คำที่เรียนแล้ว</button>
        <button class="chip" data-s="all">ทุกระดับ</button>
      </div>
    </div>
    <div class="game-grid">${Object.keys(GAMES).map(gameTile).join('')}</div>`;
  const paint = () => view.querySelectorAll('#src .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === gameSource));
  paint();
  $('#src').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { gameSource = c.dataset.s; paint(); } };
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
}

function gamePool(id) {
  if (id === 'review') {
    return W.filter((w) => S.prog[w.w] && (S.prog[w.w].x || 0) > 0)
      .sort((a, b) => (S.prog[b.w].x - S.prog[a.w].x) || (S.prog[a.w].b - S.prog[b.w].b)).slice(0, 40);
  }
  let list = gameSource === 'learned' ? W.filter((w) => S.prog[w.w]) : gameSource === 'all' ? W : pool();
  if (id === 'cloze') list = list.filter(hasCloze);
  return list;
}

function distractors(w, n, field) {
  const key = (x) => (field === 't' ? thFirst(x.t) : x.w.toLowerCase());
  const used = new Set([key(w)]);
  const out = [];
  const pos = w.p.split('/')[0];
  const tiers = [
    shuffle(W.filter((x) => x.g === w.g && x.p.split('/')[0] === pos)),
    shuffle(W.filter((x) => x.p.split('/')[0] === pos)),
    shuffle(W),
  ];
  for (const tier of tiers) {
    for (const x of tier) {
      if (out.length >= n) return out;
      const k = key(x);
      if (used.has(k) || x.t === w.t) continue;
      used.add(k); out.push(x);
    }
  }
  return out;
}

function startGame(id) {
  const src = gamePool(id);
  const min = id === 'match' ? 6 : 4;
  if (src.length < min) {
    toast(id === 'review' ? 'ยังไม่มีคำที่ตอบผิด เก่งมาก! 👍' : 'คำศัพท์ยังน้อยไป ลองเลือก "ระดับที่เลือก" ก่อนนะ');
    if (current !== 'games') go('games');
    return;
  }
  if (cleanup) { cleanup(); cleanup = null; }
  if (id === 'match') return playMatch(src);
  playQuiz(id === 'review' ? pick(['en2th', 'th2en', 'listen']) : id, src, id);
}

function playQuiz(mode, src, gameId) {
  const ROUND = 10;
  const items = shuffle(src).slice(0, ROUND);
  let i = 0, score = 0, combo = 0, bestCombo = 0;
  const wrong = [];
  $('#title').textContent = GAMES[gameId].name;

  function header() {
    return `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <div class="progress"><div style="width:${i / items.length * 100}%"></div></div>
      <span class="small"><b>${score}</b> แต้ม</span></div>`;
  }

  function q() {
    if (i >= items.length) return result();
    const w = items[i];
    const m = gameId === 'review' ? pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'spell', 'cloze'] : ['en2th', 'th2en', 'listen', 'spell']) : mode;
    if (m === 'spell') return qSpell(w);
    const toTh = m !== 'th2en' && m !== 'cloze';
    const opts = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w')]);
    let prompt;
    if (m === 'en2th') prompt = `<div class="word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
    else if (m === 'th2en') prompt = `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
    else if (m === 'cloze') {
      const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
      prompt = `<div class="cloze">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="clozeHint">💡 ดูคำแปลประโยค</button><div class="thx" id="clozeTh" hidden>${esc(w.et)}</div>`;
    }
    else prompt = `<button class="speak" data-say style="width:96px;height:96px;font-size:44px;margin:0">🔊</button><div class="muted small" style="margin-top:10px">แตะเพื่อฟังอีกครั้ง</div>`;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>${prompt}</div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(toTh ? o.t : o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    if (m === 'en2th' || m === 'listen') speak(w.w);
    const say = view.querySelector('[data-say]'); if (say) say.onclick = () => speak(w.w);
    const hb = $('#clozeHint'); if (hb) hb.onclick = () => { $('#clozeTh').hidden = false; hb.remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ <b>${esc(w.w)}</b> = ${esc(w.t)}`)
        + (m === 'cloze' || !ok ? exampleBox(w) : '')
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(w.e);
      $('#nextQ').onclick = next;
      if (m === 'cloze') speak(w.e); else if (m === 'th2en') speak(w.w);
      if (ok && m !== 'cloze') setTimeout(() => { if (items[i] === w) next(); }, 1000);
    };
  }

  function qSpell(w) {
    const hint = w.w[0] + w.w.slice(1).replace(/[a-zA-Z]/g, '_');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>
        <div style="margin-top:12px;font-size:22px;letter-spacing:4px;font-weight:700" id="hint">${esc(hint)}</div>
      </div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำภาษาอังกฤษ">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    const inp = $('#si');
    inp.focus();
    let tries = 0, answered = false;
    const norm = (s) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = w.w; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! ${esc(w.i)}` : `❌ คำตอบคือ <b>${esc(w.w)}</b> ${esc(w.i)}`)
        + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      if (norm(inp.value) === norm(w.w)) return done(tries === 0);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false);
      $('#reveal').textContent = 'ยังไม่ถูก ลองอีกครั้ง 💪';
      $('#hint').textContent = w.w.slice(0, 2) + w.w.slice(2).replace(/[a-zA-Z]/g, '_');
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
  }

  function mark(w, ok) {
    gameResult(w, ok);
    sfx(ok ? 'ok' : 'bad');
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); score += 10 + Math.min(combo - 1, 5) * 2; }
    else { combo = 0; wrong.push(w); }
  }
  function next() { i++; q(); }

  function result() {
    const prev = S.best[gameId];
    const isBest = prev == null || score > prev;
    if (isBest) { S.best[gameId] = score; save(); }
    const correct = items.length - wrong.length;
    if (correct >= 8) confetti();
    const emoji = correct === items.length ? '🏆' : correct >= 7 ? '🎉' : correct >= 4 ? '💪' : '📚';
    view.innerHTML = `<div class="card-box center pop">
        <div class="result-emoji">${emoji}</div>
        <div class="h2">${score} แต้ม ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>ถูก ${correct}/${items.length} · คอมโบสูงสุด ${bestCombo}</p>
      </div>
      ${wrong.length ? `<div class="card-box wrong-list"><b>คำที่ควรทบทวน</b> <span class="small muted">(ใส่ในแฟลชการ์ดให้แล้ว)</span>
        ${wrong.map((w) => `<div class="wl"><span><b>${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted">${esc(w.t)}</span></div>`).join('')}</div>` : ''}
      <button class="btn primary block" id="again">เล่นอีกรอบ</button>
      <div style="height:10px"></div><button class="btn block" id="back">เลือกเกมอื่น</button>`;
    $('#again').onclick = () => startGame(gameId);
    $('#back').onclick = () => go('games');
    updateStreak();
  }

  q();
}

function playMatch(src) {
  const PAIRS = 6, ROUNDS = 3;
  let round = 0, mistakes = 0, start = Date.now(), timer;
  $('#title').textContent = GAMES.match.name;
  const used = new Set();

  function deal() {
    if (round >= ROUNDS) return result();
    const words = [];
    const seenTh = new Set();
    for (const w of shuffle(src)) {
      if (used.has(w.w) || seenTh.has(thFirst(w.t))) continue;
      words.push(w); seenTh.add(thFirst(w.t)); used.add(w.w);
      if (words.length === PAIRS) break;
    }
    const en = shuffle(words), th = shuffle(words);
    let left = PAIRS, sel = null;
    view.innerHTML = `<div class="session-top">
        <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
        <div class="progress"><div style="width:${round / ROUNDS * 100}%"></div></div>
        <span class="small" id="clock">0.0s</span></div>
      <p class="center muted small">รอบ ${round + 1}/${ROUNDS} · แตะคำอังกฤษแล้วแตะคำแปลที่ตรงกัน</p>
      <div class="match-grid">
        ${en.map((w, k) => `<button class="tile" data-k="en" data-i="${w.idx}" style="grid-column:1;grid-row:${k + 1}">${esc(w.w)}</button>`).join('')}
        ${th.map((w, k) => `<button class="tile th" data-k="th" data-i="${w.idx}" style="grid-column:2;grid-row:${k + 1}">${esc(thFirst(w.t))}</button>`).join('')}
      </div>`;
    $('#quit').onclick = () => go('games');
    view.querySelector('.match-grid').onclick = (e) => {
      const t = e.target.closest('.tile'); if (!t || t.classList.contains('done')) return;
      if (t.dataset.k === 'en') speak(W[+t.dataset.i].w);
      if (!sel || sel.dataset.k === t.dataset.k) {
        if (sel) sel.classList.remove('sel');
        sel = t; t.classList.add('sel'); return;
      }
      const a = sel, b = t; sel = null; a.classList.remove('sel');
      if (a.dataset.i === b.dataset.i) {
        a.classList.add('done'); b.classList.add('done');
        gameResult(W[+a.dataset.i], true); sfx('ok');
        if (--left === 0) { round++; setTimeout(deal, 350); }
      } else {
        mistakes++; sfx('bad');
        [a, b].forEach((x) => { x.classList.remove('no'); void x.offsetWidth; x.classList.add('no'); });
        const enTile = a.dataset.k === 'en' ? a : b;
        gameResult(W[+enTile.dataset.i], false);
      }
    };
  }
  timer = setInterval(() => { const c = $('#clock'); if (c) c.textContent = ((Date.now() - start) / 1000).toFixed(1) + 's'; }, 100);
  cleanup = () => clearInterval(timer);

  function result() {
    clearInterval(timer);
    const secs = (Date.now() - start) / 1000 + mistakes * 3;
    const score = Math.max(0, Math.round(1000 - secs * 10));
    const prev = S.best.match;
    const isBest = prev == null || score > prev;
    if (isBest) { S.best.match = score; save(); }
    if (isBest || mistakes === 0) confetti();
    view.innerHTML = `<div class="card-box center pop">
        <div class="result-emoji">⚡</div>
        <div class="h2">${score} แต้ม ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>เวลา ${((Date.now() - start) / 1000).toFixed(1)} วินาที · ผิด ${mistakes} ครั้ง (+3 วิ/ครั้ง)</p>
      </div>
      <button class="btn primary block" id="again">เล่นอีกรอบ</button>
      <div style="height:10px"></div><button class="btn block" id="back">เลือกเกมอื่น</button>`;
    $('#again').onclick = () => startGame('match');
    $('#back').onclick = () => go('games');
    updateStreak();
  }
  deal();
}

/* ---------- word list ---------- */
let listFilter = { q: '', lv: 'all', st: 'all' };
function renderList() {
  view.innerHTML = `
    <input class="search" id="q" type="search" placeholder="🔍 ค้นหาคำอังกฤษหรือคำแปลไทย" value="${esc(listFilter.q)}" autocapitalize="none" autocorrect="off">
    <div class="chips" id="lv" style="margin-bottom:8px">
      ${['all', ...LEVELS].map((l) => `<button class="chip" data-v="${l}">${l === 'all' ? 'ทุกระดับ' : LV_LABEL[l]}</button>`).join('')}
    </div>
    <div class="chips" id="st" style="margin-bottom:6px">
      ${[['all', 'ทั้งหมด'], ['new', 'ยังไม่เรียน'], ['learning', '🟡 กำลังเรียน'], ['mastered', '🟢 จำได้แล้ว']].map(([v, t]) => `<button class="chip" data-v="${v}">${t}</button>`).join('')}
    </div>
    <div class="small muted" id="cnt" style="margin:6px 4px"></div>
    <div class="card-box" style="padding:4px 14px" id="rows"></div>
    <div id="sentinel" style="height:1px"></div>`;
  const paint = () => {
    view.querySelectorAll('#lv .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === listFilter.lv));
    view.querySelectorAll('#st .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === listFilter.st));
  };
  let items = [], shown = 0;
  const rows = $('#rows');
  const more = () => {
    const chunk = items.slice(shown, shown + 80);
    rows.insertAdjacentHTML('beforeend', chunk.map((w) => `<div class="wrow" data-i="${w.idx}">
      <span class="dot ${status(w)}"></span>
      <div class="grow"><div><span class="w">${esc(w.w)}</span> <span class="pos">${esc(w.p)}</span></div><div class="t">${esc(w.t)}</div></div>
      ${lvBadge(w.g)}</div>`).join(''));
    shown += chunk.length;
  };
  const apply = () => {
    const q = listFilter.q.trim().toLowerCase();
    items = W.filter((w) => (listFilter.lv === 'all' || w.g === listFilter.lv)
      && (listFilter.st === 'all' || status(w) === listFilter.st)
      && (!q || w.w.toLowerCase().includes(q) || w.t.includes(q)));
    if (q) items.sort((a, b) => (b.w.toLowerCase().startsWith(q)) - (a.w.toLowerCase().startsWith(q)));
    rows.innerHTML = ''; shown = 0; more();
    if (!items.length) rows.innerHTML = '<p class="center muted">ไม่พบคำศัพท์</p>';
    $('#cnt').textContent = `${items.length} คำ · แตะคำเพื่อดูตัวอย่างประโยค`;
    paint();
  };
  $('#q').oninput = (e) => { listFilter.q = e.target.value; apply(); };
  $('#lv').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.lv = c.dataset.v; apply(); } };
  $('#st').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.st = c.dataset.v; apply(); } };
  rows.onclick = (e) => {
    const r = e.target.closest('.wrow'); if (!r) return;
    const w = W[+r.dataset.i];
    speak(w.w);
    openSheet(w, () => { r.querySelector('.dot').className = 'dot ' + status(w); });
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < items.length) more(); }, { root: view, rootMargin: '400px' });
  io.observe($('#sentinel'));
  cleanup = () => io.disconnect();
  apply();
}

/* ---------- word detail sheet ---------- */
function openSheet(w, onChange) {
  const st = status(w);
  const stLabel = { new: 'ยังไม่เรียน', learning: '🟡 กำลังเรียน', mastered: '🟢 จำได้แล้ว' }[st];
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(w.w)}">
      <div class="grab"></div>
      <div class="row" style="justify-content:space-between">${lvBadge(w.g)}<span class="small muted">${stLabel}</span></div>
      <div class="sheet-word">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
      <div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
      <div class="th" style="font-size:22px;margin:10px 0">${esc(w.t)}</div>
      ${exampleBox(w)}
      <div class="row" style="margin-top:14px">
        <button class="btn grow" data-act="review">🔁 ทบทวนวันนี้</button>
        <button class="btn grow" data-act="known">✓ รู้แล้ว</button>
      </div>
      <a class="link" style="display:block;text-align:center;margin-top:12px" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูใน Oxford Dictionary ↗</a>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    if (e.target.closest('[data-say]')) return speak(w.w);
    if (e.target.closest('[data-sayex]')) return speak(w.e);
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'known') { markKnown(w); toast('ทำเครื่องหมายว่ารู้แล้ว 👍'); }
    else { markForReview(w); toast('เพิ่มเข้ารายการทบทวนแล้ว 🔁'); }
    if (onChange) onChange();
    close();
  };
}

/* ---------- settings ---------- */
function renderSettings() {
  const st = S.settings;
  const lvChip = (l) => `<button class="chip" data-v="${l}">${LV_LABEL[l]} · ${W.filter((w) => w.g === l).length} คำ</button>`;
  view.innerHTML = `
    <div class="h2">ระดับคำศัพท์ที่เรียน</div>
    <div class="card-box">
      <div class="small muted" style="margin-bottom:8px"><b>Oxford 3000</b> · คำหลักที่ต้องรู้</div>
      <div class="chips" id="lvls">${LEVELS_3000.map(lvChip).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px"><b>Oxford 5000</b> · คำเพิ่มเติมระดับสูง</div>
      <div class="chips" id="lvls5">${LEVELS_5000.map(lvChip).join('')}</div>
      <p class="small muted" style="margin-bottom:0">A1–A2 = พื้นฐาน, B1–B2 = ระดับกลาง, B2+ และ C1 = ระดับสูง (เลือกได้หลายระดับ)</p>
    </div>

    <div class="h2">การเรียน</div>
    <div class="card-box">
      <div class="set-row"><span>คำใหม่ต่อวัน</span>
        <select class="sel" id="npd">${[5, 10, 15, 20, 30, 50, 100].map((n) => `<option ${n === st.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row"><span>ลำดับคำใหม่</span>
        <select class="sel" id="ord"><option value="shuffle" ${st.order === 'shuffle' ? 'selected' : ''}>สุ่ม</option><option value="alpha" ${st.order === 'alpha' ? 'selected' : ''}>เรียงตามตัวอักษร</option></select></div>
      <div class="set-row"><span>ด้านหน้าการ์ด</span>
        <select class="sel" id="front"><option value="en" ${st.front === 'en' ? 'selected' : ''}>อังกฤษ → ไทย</option><option value="th" ${st.front === 'th' ? 'selected' : ''}>ไทย → อังกฤษ</option></select></div>
    </div>

    <div class="h2">เสียง</div>
    <div class="card-box">
      <div class="set-row"><span>อ่านออกเสียงอัตโนมัติ</span>
        <label class="switch"><input type="checkbox" id="auto" ${st.autoSpeak ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>เสียงเอฟเฟกต์ในเกม</span>
        <label class="switch"><input type="checkbox" id="sfx" ${st.sfx ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>สำเนียง</span>
        <select class="sel" id="acc"><option value="en-US" ${st.accent === 'en-US' ? 'selected' : ''}>🇺🇸 อเมริกัน</option><option value="en-GB" ${st.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 อังกฤษ</option></select></div>
      <div class="set-row"><span>ความเร็วเสียง</span>
        <select class="sel" id="rate">${[[0.7, 'ช้า'], [0.9, 'ปกติ'], [1.05, 'เร็ว']].map(([v, t]) => `<option value="${v}" ${v === st.rate ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <button class="btn block" id="test" style="margin-top:8px">🔊 ทดสอบเสียง</button>
    </div>

    <div class="h2">สำรองข้อมูล</div>
    <div class="card-box">
      <p class="small muted" style="margin-top:0">ความคืบหน้าเก็บไว้ในเครื่องนี้เท่านั้น แนะนำให้สำรองเป็นระยะ (เช่น ก่อนล้างข้อมูล Safari)</p>
      <div class="row"><button class="btn grow" id="exp">📤 ส่งออก</button><button class="btn grow" id="imp">📥 นำเข้า</button></div>
      <input type="file" id="file" accept=".json,application/json" hidden>
      <div style="height:10px"></div>
      <button class="btn danger block" id="reset">ล้างความคืบหน้าทั้งหมด</button>
    </div>
    <p class="center small muted">รายการคำ: Oxford 3000 + 5000 (${W.length} คำ) · คำแปลไทยสำหรับช่วยจำ<br>เวอร์ชัน ${APP_VERSION}</p>`;

  const paint = () => view.querySelectorAll('#lvls .chip, #lvls5 .chip').forEach((c) => c.classList.toggle('on', st.levels.includes(c.dataset.v)));
  paint();
  $('#lvls').onclick = $('#lvls5').onclick = (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    const v = c.dataset.v;
    if (st.levels.includes(v)) { if (st.levels.length > 1) st.levels = st.levels.filter((x) => x !== v); else toast('ต้องเลือกอย่างน้อย 1 ระดับ'); }
    else st.levels = LEVELS.filter((l) => l === v || st.levels.includes(l));
    save(); paint();
  };
  $('#npd').onchange = (e) => { st.newPerDay = +e.target.value; save(); };
  $('#ord').onchange = (e) => { st.order = e.target.value; save(); };
  $('#front').onchange = (e) => { st.front = e.target.value; save(); };
  $('#auto').onchange = (e) => { st.autoSpeak = e.target.checked; save(); };
  $('#sfx').onchange = (e) => { st.sfx = e.target.checked; save(); sfx('ok'); };
  $('#acc').onchange = (e) => { st.accent = e.target.value; save(); speak('Hello! Nice to meet you.'); };
  $('#rate').onchange = (e) => { st.rate = +e.target.value; save(); speak('vocabulary'); };
  $('#test').onclick = () => speak('Hello! Let\'s learn English together.');

  $('#exp').onclick = async () => {
    const data = JSON.stringify(S);
    const name = `oxford3000-backup-${today()}.json`;
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Oxford 3000 backup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || typeof d.prog !== 'object') throw new Error('bad file');
      const base = defaults();
      S = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
      save(); toast('นำเข้าข้อมูลเรียบร้อย ✅'); go('home');
    } catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
  };
  $('#reset').onclick = () => {
    if (!confirm('ล้างความคืบหน้าทั้งหมดใช่ไหม? (ย้อนกลับไม่ได้)')) return;
    const settings = S.settings;
    S = defaults(); S.settings = settings; save(); toast('ล้างข้อมูลแล้ว'); go('home');
  };
}

/* ---------- boot ---------- */
go('home');
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Refresh counts when returning to the app after a while (e.g. next day).
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'home') renderHome(); });
