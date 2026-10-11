'use strict';

// App version shown in the UI. Bump it (and VERSION in sw.js) on every push.
const APP_VERSION = '1.8.2';

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
  settings: { levels: ['A1'], newPerDay: 20, autoSpeak: true, rate: 0.9, accent: 'en-US', front: 'en', order: 'shuffle', sfx: true, start: 'home' },
  daily: { date: '', fresh: 0, reviews: 0 },
  streak: { last: '', count: 0 },
  best: {},            // game -> best score
  hist: {},            // 'YYYY-MM-DD' -> cards/answers that day
  backupAt: 0,         // ms of the last backup export
  backupSnooze: '',    // date the backup reminder was dismissed
  star: {},            // word -> 1 for starred words
  freeze: 0,           // streak freezes in stock (max MAX_FREEZE)
  ach: {},             // achievement id -> date unlocked
  quest: { date: '', n: 0, done: false },
  counts: { quests: 0, speak: 0, perfect: 0 },
  remind: '2000',      // daily reminder time for the calendar file (HHMM)
  xp: null,            // experience points; null = not yet seeded from existing progress
});
let S = load();
// Users from before 1.8.0 get XP for the work they already did.
if (S.xp == null) S.xp = Object.values(S.prog).reduce((a, p) => a + (p.s || 0) + (p.c || 0), 0);

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
  if (typeof checkAch === 'function') checkAch();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

/* ---------- backup ---------- */
const BACKUP_EVERY = 7; // days before the home screen nags about a backup

async function exportBackup() {
  const name = `essential-vocab-backup-${today()}.json`;
  const done = () => { S.backupAt = Date.now(); save(); toast('สำรองข้อมูลแล้ว ✅'); };
  const file = new File([JSON.stringify({ ...S, backupAt: Date.now() })], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'ศัพท์ต้องรู้ backup' }); return done(); } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  done();
}

const needsBackup = () => Object.keys(S.prog).length >= 10
  && Date.now() - (S.backupAt || 0) > BACKUP_EVERY * DAY && S.backupSnooze !== today();

// Merge a backup into the current state, keeping whichever side is further along for each word.
function mergeBackup(d) {
  const ahead = (a, b) => (a.b - b.b) || ((a.s || 0) - (b.s || 0)) || ((a.d || 0) - (b.d || 0));
  let added = 0, updated = 0;
  const fresh = Object.keys(S.prog).length === 0;
  for (const [w, p] of Object.entries(d.prog || {})) {
    if (!p || typeof p.b !== 'number') continue;
    const cur = S.prog[w];
    if (!cur) { S.prog[w] = p; added++; }
    else if (ahead(p, cur) > 0) { S.prog[w] = p; updated++; }
  }
  for (const [k, v] of Object.entries(d.hist || {})) S.hist[k] = Math.max(S.hist[k] || 0, v);
  for (const [k, v] of Object.entries(d.best || {})) S.best[k] = Math.max(S.best[k] || 0, v);
  if (d.streak && ((d.streak.last || '') > (S.streak.last || '') || (d.streak.last === S.streak.last && d.streak.count > S.streak.count))) S.streak = d.streak;
  if (d.daily && d.daily.date === S.daily.date) {
    S.daily.fresh = Math.max(S.daily.fresh, d.daily.fresh || 0);
    S.daily.reviews = Math.max(S.daily.reviews, d.daily.reviews || 0);
  } else if (d.daily && d.daily.date > S.daily.date) S.daily = d.daily;
  if (fresh && d.settings) S.settings = { ...defaults().settings, ...d.settings };
  S.backupAt = Math.max(S.backupAt || 0, d.backupAt || 0);
  Object.assign(S.star, d.star || {});
  for (const [k, v] of Object.entries(d.ach || {})) if (!S.ach[k]) S.ach[k] = v;
  for (const [k, v] of Object.entries(d.counts || {})) S.counts[k] = Math.max(S.counts[k] || 0, v);
  S.freeze = Math.max(S.freeze || 0, d.freeze || 0);
  S.xp = Math.max(S.xp || 0, d.xp || 0);
  save();
  return { added, updated };
}

const today = () => new Date().toLocaleDateString('en-CA');
function rollDay() {
  if (S.daily.date !== today()) S.daily = { date: today(), fresh: 0, reviews: 0 };
}
// Whole days between two 'YYYY-MM-DD' strings (a - b).
const dayDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / DAY);
const MAX_FREEZE = 2;
function markActive() {
  rollDay();
  const t = today();
  S.hist[t] = (S.hist[t] || 0) + 1;
  if (S.streak.last === t) return;
  const missed = S.streak.last ? dayDiff(t, S.streak.last) - 1 : Infinity;
  if (missed === 0) S.streak.count++;
  else if (S.streak.count && missed <= S.freeze) {
    // 🧊 Streak freezes cover the missed days.
    S.freeze -= missed; S.streak.count++;
    setTimeout(() => toast(`🧊 ใช้ตัวกันสตรีค ${missed} อัน สตรีคไม่ขาด!`), 400);
  } else S.streak.count = 1;
  S.streak.last = t;
  if (S.streak.count % 7 === 0 && S.freeze < MAX_FREEZE) {
    S.freeze++;
    setTimeout(() => toast('🧊 ได้ตัวกันสตรีคเพิ่ม 1 อัน (เรียนต่อเนื่องครบ 7 วัน)'), 1500);
  }
  updateStreak();
}
function streakNow() {
  if (!S.streak.last) return 0;
  const missed = dayDiff(today(), S.streak.last) - 1;
  return missed <= 0 || missed <= S.freeze ? S.streak.count : 0;
}

/* ---------- stars ---------- */
const isStar = (w) => !!S.star[w.w];
function toggleStar(w) {
  if (S.star[w.w]) delete S.star[w.w]; else S.star[w.w] = 1;
  save();
  toast(isStar(w) ? `⭐ ติดดาว "${w.w}" แล้ว` : `เอาดาวออกจาก "${w.w}" แล้ว`);
  return isStar(w);
}
const starIcon = (w) => (isStar(w) ? '⭐' : '☆');

/* ---------- daily quest ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SR;
const QUESTS = [
  { id: 'cards', text: 'ทำแฟลชการ์ดให้ครบ 30 ใบ', target: 30 },
  { id: 'fresh', text: 'เรียนคำใหม่ให้ครบเป้าวันนี้', target: () => S.settings.newPerDay },
  { id: 'cloze', text: 'เติมคำในประโยค ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'cloze' },
  { id: 'listen', text: 'ฟังแล้วตอบ ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'listen' },
  { id: 'th2en', text: 'ทายคำศัพท์ ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'th2en' },
  { id: 'spell', text: 'สะกดคำถูกรวม 10 คำ', target: 10, game: 'spell' },
  { id: 'match', text: 'จับคู่ด่วนให้จบ โดยผิดไม่เกิน 2 ครั้ง', target: 1, game: 'match' },
  { id: 'combo', text: 'ทำคอมโบ x6 ในเกมไหนก็ได้', target: 1, game: 'en2th' },
  { id: 'speak', text: 'พูดตามถูกรวม 10 คำ', target: 10, game: 'speak', needs: () => canListen },
];
function todayQuest() {
  const t = today();
  if (S.quest.date !== t) S.quest = { date: t, n: 0, done: false };
  const list = QUESTS.filter((q) => !q.needs || q.needs());
  let h = 7; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
const questTarget = (q) => (typeof q.target === 'function' ? q.target() : q.target);
function questEvent(type, d = {}) {
  const q = todayQuest();
  if (S.quest.done) return save();
  if (type === 'card' && q.id === 'cards') S.quest.n++;
  if (type === 'card' && q.id === 'fresh') S.quest.n = S.daily.fresh;
  if (type === 'answer' && d.ok && d.game === q.id && (q.id === 'spell' || q.id === 'speak')) S.quest.n++;
  if (type === 'round' && d.game === q.id && d.correct >= 8) S.quest.n++;
  if (type === 'round' && q.id === 'combo' && d.bestCombo >= 6) S.quest.n++;
  if (type === 'match' && q.id === 'match' && d.mistakes <= 2) S.quest.n++;
  if (S.quest.n >= questTarget(q)) {
    S.quest.done = true;
    S.counts.quests = (S.counts.quests || 0) + 1;
    setTimeout(() => { confetti(); toast('🎯 ภารกิจวันนี้สำเร็จ! เก่งมาก'); }, 700);
  }
  save();
}

/* ---------- XP & levels ---------- */
// Level L starts at 25·L·(L−1) XP: Lv1 0, Lv2 50, Lv3 150, Lv4 300, Lv5 500 …
const levelOf = (xp) => Math.floor((1 + Math.sqrt(1 + (4 * (xp || 0)) / 25)) / 2);
const levelStart = (L) => 25 * L * (L - 1);
function addXP(n) {
  if (!n) return;
  const before = levelOf(S.xp);
  S.xp = (S.xp || 0) + n;
  const after = levelOf(S.xp);
  if (after > before) setTimeout(() => { confetti(); toast(`⬆️ เลเวลอัป! ตอนนี้ Lv.${after}`); }, 400);
  updateStreak();
}
const comboXP = (combo) => 2 + Math.min(combo - 1, 5); // 2 XP per right answer, up to +5 for a combo

/* ---------- achievements ---------- */
const ACH = [
  { id: 'first', icon: '🌱', name: 'ก้าวแรก', desc: 'เรียนคำแรก', ok: (s) => s.learned >= 1 },
  { id: 'l100', icon: '📗', name: 'ร้อยคำแรก', desc: 'เรียนครบ 100 คำ', ok: (s) => s.learned >= 100 },
  { id: 'l500', icon: '📘', name: 'ห้าร้อยคำ', desc: 'เรียนครบ 500 คำ', ok: (s) => s.learned >= 500 },
  { id: 'l1000', icon: '📙', name: 'พันคำ', desc: 'เรียนครบ 1,000 คำ', ok: (s) => s.learned >= 1000 },
  { id: 'l3000', icon: '📚', name: 'สามพันคำ', desc: 'เรียนครบ 3,000 คำ', ok: (s) => s.learned >= 3000 },
  { id: 'm10', icon: '🟢', name: 'จำได้แล้ว', desc: 'จำได้แล้ว 10 คำ', ok: (s) => s.mastered >= 10 },
  { id: 'm100', icon: '🧠', name: 'สมองไว', desc: 'จำได้แล้ว 100 คำ', ok: (s) => s.mastered >= 100 },
  { id: 'm500', icon: '💎', name: 'คลังศัพท์', desc: 'จำได้แล้ว 500 คำ', ok: (s) => s.mastered >= 500 },
  { id: 'm1000', icon: '👑', name: 'เจ้าแห่งศัพท์', desc: 'จำได้แล้ว 1,000 คำ', ok: (s) => s.mastered >= 1000 },
  { id: 's3', icon: '🔥', name: 'อุ่นเครื่อง', desc: 'เรียนต่อเนื่อง 3 วัน', ok: (s) => s.streak >= 3 },
  { id: 's7', icon: '⚡', name: 'ครบสัปดาห์', desc: 'เรียนต่อเนื่อง 7 วัน', ok: (s) => s.streak >= 7 },
  { id: 's30', icon: '🌟', name: 'ครบเดือน', desc: 'เรียนต่อเนื่อง 30 วัน', ok: (s) => s.streak >= 30 },
  { id: 's100', icon: '🏆', name: 'ร้อยวัน', desc: 'เรียนต่อเนื่อง 100 วัน', ok: (s) => s.streak >= 100 },
  { id: 'perfect', icon: '💯', name: 'เต็มสิบ', desc: 'ตอบถูก 10/10 ในเกม', ok: (s) => s.perfect >= 1 },
  { id: 'q7', icon: '🎯', name: 'นักล่าภารกิจ', desc: 'ทำภารกิจรายวันสำเร็จ 7 ครั้ง', ok: (s) => s.quests >= 7 },
  { id: 'lvl5', icon: '⭐', name: 'เลเวล 5', desc: 'สะสม XP จนถึง Lv.5', ok: (s) => s.level >= 5 },
  { id: 'lvl10', icon: '🌠', name: 'เลเวล 10', desc: 'สะสม XP จนถึง Lv.10', ok: (s) => s.level >= 10 },
  { id: 'speak50', icon: '🎤', name: 'นักพูด', desc: 'พูดตามถูก 50 คำ', ok: (s) => s.speak >= 50 },
  ...LEVELS.map((l) => ({ id: 'lv' + l, icon: '🎓', name: `จบ ${LV_LABEL[l]}`, desc: `เรียนครบทุกคำในระดับ ${LV_LABEL[l]}`, ok: (s) => s.lv[l] })),
];
const GROUP = Object.fromEntries(LEVELS.map((l) => [l, W.filter((w) => w.g === l)]));
function checkAch() {
  const progs = Object.values(S.prog);
  const s = {
    learned: progs.length,
    mastered: progs.filter((p) => p.b >= MASTERED).length,
    streak: S.streak.count, perfect: S.counts.perfect || 0, quests: S.counts.quests || 0, speak: S.counts.speak || 0, level: levelOf(S.xp),
    lv: Object.fromEntries(LEVELS.map((l) => [l, GROUP[l].every((w) => S.prog[w.w])])),
  };
  const got = ACH.filter((a) => !S.ach[a.id] && a.ok(s));
  if (!got.length) return;
  got.forEach((a) => (S.ach[a.id] = today()));
  setTimeout(() => { confetti(); toast(`🏅 ได้เหรียญ "${got[0].icon} ${got[0].name}"${got.length > 1 ? ` และอีก ${got.length - 1} เหรียญ` : ''}`); }, 1100);
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
  addXP(g === 0 ? 1 : 2);
  questEvent('card');
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
const TITLES = { home: 'ศัพท์ต้องรู้', cards: 'แฟลชการ์ด', games: 'เกมฝึกศัพท์', list: 'คำศัพท์', settings: 'ตั้งค่า', guide: 'คู่มือการใช้งาน', feed: 'ไถศัพท์' };
function go(tab, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  current = tab;
  view.classList.remove('feed-mode');
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#title').textContent = TITLES[tab] || 'ศัพท์ต้องรู้';
  view.scrollTop = 0;
  ({ home: renderHome, cards: renderCards, games: renderGames, list: renderList, settings: renderSettings, guide: renderGuide, feed: renderFeed }[tab])(...args);
  updateStreak();
}
function updateStreak() { $('#streak').textContent = '🔥 ' + streakNow() + (S.freeze ? ' · 🧊' + S.freeze : '') + ' · Lv.' + levelOf(S.xp); }
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
  const lvRows = `<div class="small muted" style="margin-top:8px"><b>ชุด 3000 คำ</b> (คำหลัก)</div>${LEVELS_3000.map(lvRow).join('')}
    <div class="small muted" style="margin-top:12px"><b>ชุด 5000 คำ</b> (คำเพิ่มเติม)</div>${LEVELS_5000.map(lvRow).join('')}`;

  const lastBackup = S.backupAt ? Math.floor((Date.now() - S.backupAt) / DAY) : null;
  view.innerHTML = `
    ${needsBackup() ? `<div class="card-box backup-nag">
      <div><b>💾 ถึงเวลาสำรองข้อมูลแล้ว</b><div class="small muted">${lastBackup === null ? 'ยังไม่เคยสำรองเลย' : `สำรองล่าสุด ${lastBackup} วันก่อน`} · กันความคืบหน้าหายตอนลบแอปหรือเปลี่ยนเครื่อง</div></div>
      <div class="row" style="margin-top:10px"><button class="btn primary grow" id="bkNow">📤 สำรองเลย</button><button class="btn" id="bkLater">ไว้ทีหลัง</button></div>
    </div>` : ''}
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

    <div class="quick">
      <button class="quick-btn feed-btn" id="qFeed"><span>📱</span><b>ไถศัพท์</b><small>ปัดขึ้นเรื่อยๆ เหมือนไถฟีด</small></button>
      <button class="quick-btn" id="qPlay"><span>⚡</span><b>เล่นด่วน</b><small>เกมสุ่ม 10 ข้อ ~1 นาที</small></button>
    </div>
    ${levelCard()}

    ${questCard()}

    <div class="h2">7 วันที่ผ่านมา</div>
    <div class="card-box week">${weekChart()}</div>

    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}</div>

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

    <button class="card-box guide-link" id="guideBtn"><span>📘</span><div class="grow"><b>คู่มือการใช้งาน & ทริก</b><div class="small muted">ลืมว่าใช้ยังไง หรืออยากจำศัพท์ให้ได้เร็วขึ้น อ่านตรงนี้</div></div><span class="muted">›</span></button>

    <div class="h2">🏅 เหรียญรางวัล <span class="small muted">${ACH.filter((a) => S.ach[a.id]).length}/${ACH.length}</span></div>
    <div class="card-box ach-grid" id="ach">${ACH.map((a) => `<button class="ach ${S.ach[a.id] ? 'on' : ''}" data-ach="${a.id}"><span>${a.icon}</span><small>${a.name}</small></button>`).join('')}</div>
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#startBtn').onclick = () => go('cards', !todo);
  $('#guideBtn').onclick = () => go('guide', 'home');
  $('#qFeed').onclick = () => go('feed');
  $('#qPlay').onclick = quickPlay;
  if ($('#bkNow')) {
    $('#bkNow').onclick = async () => { await exportBackup(); renderHome(); };
    $('#bkLater').onclick = () => { S.backupSnooze = today(); save(); renderHome(); };
  }
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
  const qg = $('#questGo');
  if (qg) qg.onclick = () => { const q = todayQuest(); if (q.game) startGame(q.game); else go('cards'); };
  $('#ach').onclick = (e) => {
    const b = e.target.closest('[data-ach]'); if (!b) return;
    const a = ACH.find((x) => x.id === b.dataset.ach);
    toast(`${a.icon} ${a.name}: ${a.desc}${S.ach[a.id] ? ' ✅' : ' 🔒'}`);
  };
}
function levelCard() {
  const L = levelOf(S.xp), a = levelStart(L), b = levelStart(L + 1);
  return `<div class="card-box lvl-card"><div class="lvl-num">Lv.${L}</div>
    <div class="grow"><div class="row" style="justify-content:space-between"><b>คะแนนประสบการณ์</b><span class="small muted">${S.xp - a}/${b - a} XP</span></div>
    <div class="bar" style="margin-top:6px"><div class="l" style="width:${(S.xp - a) / (b - a) * 100}%"></div></div>
    <div class="small muted" style="margin-top:4px">ตอบถูกติดกันได้ XP เพิ่ม · อีก ${b - S.xp} XP ถึง Lv.${L + 1}</div></div></div>`;
}
function questCard() {
  const q = todayQuest(), target = questTarget(q), n = Math.min(S.quest.n, target);
  return `<div class="card-box quest">
    <div class="row" style="justify-content:space-between"><b>🎯 ภารกิจวันนี้</b><span class="small muted">${S.quest.done ? 'สำเร็จแล้ว ✅' : `${n}/${target}`}</span></div>
    <div style="margin:6px 0 10px">${q.text}</div>
    <div class="qbar"><div style="width:${S.quest.done ? 100 : n / target * 100}%"></div></div>
    ${S.quest.done ? '' : '<button class="btn block" id="questGo" style="margin-top:12px">ไปทำภารกิจ →</button>'}
  </div>`;
}
// Cards coming due in each of the next 7 days (selected levels), so the daily load is predictable.
function forecastChart() {
  const names = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, k) => ({ n: 0, label: k === 0 ? 'วันนี้' : k === 1 ? 'พรุ่งนี้' : names[(start.getDay() + k) % 7] }));
  for (const w of pool()) {
    const pr = S.prog[w.w]; if (!pr) continue;
    const k = Math.max(0, Math.floor((pr.d - start.getTime()) / DAY));
    if (k < 7) days[k].n++;
  }
  const max = Math.max(10, ...days.map((d) => d.n));
  const total = days.reduce((a, d) => a + d.n, 0);
  const tip = total / 7 > 80 ? '<div class="small" style="margin-top:8px">⚠️ งานทบทวนเยอะแล้ว ลองลดจำนวนคำใหม่ต่อวันในตั้งค่า</div>' : '';
  return `<div class="week">${days.map((d) => `<div class="wk"><div class="wk-n">${d.n || ''}</div><div class="wk-bar fc-bar"><div style="height:${d.n / max * 100}%"></div></div><div class="wk-l">${d.label}</div></div>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">รวม ${total} ใบ · ยังไม่รวมคำใหม่วันละ ${S.settings.newPerDay} คำ</div>${tip}`;
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
  // Words marked "ยาก" while new: shown again later this session before they're scheduled for tomorrow.
  let relearn = new Set();
  const gradeLabel = (p, g) => {
    const re = relearn.has(card.w);
    if ((!p || re) && g === 1) return 'วนอีกรอบ';
    if (re && g > 1) return intervalLabel(g === 3 ? 2 : 1);
    return intervalLabel(nextBox(p, g));
  };
  $('#undo').onclick = () => {
    const h = history.pop(); if (!h) return;
    if (h.prev) S.prog[h.w] = h.prev; else delete S.prog[h.w];
    S.daily = h.daily; relearn = new Set(h.relearn); save();
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
    const star = `<button class="star-btn" data-star aria-label="ติดดาว">${starIcon(card)}</button>`;
    const enFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="word">${esc(card.w)}</div><div class="ipa">${esc(card.i)}</div>
      <button class="speak" data-say aria-label="ฟังเสียง">🔊</button>`;
    const thFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="th">${esc(card.t)}</div>`;
    const backExtra = exampleBox(card) + `<a class="link" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูความหมายเพิ่มใน Oxford Learner's Dictionaries ↗</a>`;
    $('#stage').innerHTML = `
      <div class="fc" id="fc">
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div>
        <div class="fc-inner">
          <div class="face front">${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}แตะเพื่อพลิก · ปัดซ้าย/ขวา</div></div>
          <div class="face back">${enFront ? `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
            <div class="th">${esc(card.t)}</div><div class="ipa" style="margin-top:8px">${esc(card.w)} ${esc(card.i)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>${backExtra}`
            : enFace + backExtra}</div>
        </div>
      </div>`;
    gradeBox.innerHTML = [
      ['g-again', 'ลืม', 0], ['g-hard', 'ยาก', 1], ['g-good', 'จำได้', 2], ['g-easy', 'ง่าย', 3],
    ].map(([c, t, g]) => `<button class="btn ${c}" data-g="${g}">${t}<small>${gradeLabel(p, g)}</small></button>`).join('');
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
    history.push({ w: card.w, prev: S.prog[card.w] && { ...S.prog[card.w] }, daily: { ...S.daily }, queue: queue.slice(), done, stats: { ...stats }, relearn: [...relearn] });
    if (history.length > 30) history.shift();
  }
  const requeue = (min) => queue.splice(Math.min(queue.length, min + (Math.random() * 3 | 0)), 0, card);
  function answer(g) {
    snapshot();
    const isNew = !S.prog[card.w], re = relearn.has(card.w);
    queue.shift();
    if (re && g >= 2) {
      // Second look at a "hard" new word: keep it at 1 day, or 3 days if it now feels easy.
      relearn.delete(card.w);
      markActive(); S.daily.reviews++;
      const b = g === 3 ? 2 : 1;
      S.prog[card.w] = { ...S.prog[card.w], b, d: Date.now() + INTERVALS[b] * DAY - 3600000, s: S.prog[card.w].s + 1, c: S.prog[card.w].c + 1 };
      questEvent('card');
      stats.ok++; done++;
    } else {
      grade(card, g);
      if (g === 0) { relearn.delete(card.w); stats.again++; requeue(3); }
      else if (g === 1 && (isNew || re)) { relearn.add(card.w); requeue(4); }
      else { stats.ok++; done++; }
    }
    show();
  }

  function bindCard() {
    const fc = $('#fc');
    let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
    const tl = $('.swipe-tag.l', fc), tr = $('.swipe-tag.r', fc);
    fc.addEventListener('click', (e) => {
      if (e.target.closest('[data-say]')) { e.stopPropagation(); speak(card.w); return; }
      if (e.target.closest('[data-sayex]')) { e.stopPropagation(); speak(card.e); return; }
      if (e.target.closest('[data-star]')) {
        e.stopPropagation(); toggleStar(card);
        fc.querySelectorAll('[data-star]').forEach((b) => (b.textContent = starIcon(card)));
        return;
      }
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

/* ---------- speech recognition matching ---------- */
const NUM_WORDS = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const TENS = { 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred', 1000: 'thousand', 1000000: 'million' };
const normSpoken = (s) => s.toLowerCase()
  .replace(/\d+/g, (n) => NUM_WORDS[+n] || TENS[+n] || n)
  .replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
// True if what was heard contains the target word (or one of its variants like "a, an").
function spokenMatch(heard, word) {
  const h = ' ' + normSpoken(heard) + ' ';
  return word.split(/\s*[,/]\s*/).some((v) => {
    const t = normSpoken(v);
    return t && (h.includes(' ' + t + ' ') || h.replace(/ /g, '').includes(t.replace(/ /g, '')) || (t === 'ok' && h.includes(' okay ')));
  });
}

/* ---------- games ---------- */
const GAMES = {
  en2th: { icon: '🇬🇧', name: 'ทายความหมาย', desc: 'ดูคำอังกฤษ เลือกคำแปลไทย' },
  th2en: { icon: '🇹🇭', name: 'ทายคำศัพท์', desc: 'ดูคำไทย เลือกคำอังกฤษ' },
  listen: { icon: '🎧', name: 'ฟังแล้วตอบ', desc: 'ฟังเสียง เลือกความหมาย' },
  spell: { icon: '⌨️', name: 'สะกดคำ', desc: 'ดูคำแปล พิมพ์คำอังกฤษ' },
  cloze: { icon: '📝', name: 'เติมคำในประโยค', desc: 'เลือกคำที่หายไปจากประโยค' },
  match: { icon: '🧩', name: 'จับคู่ด่วน', desc: 'จับคู่คำกับคำแปลแข่งเวลา' },
  speak: { icon: '🎤', name: 'พูดตาม', desc: 'ดูคำแล้วพูดออกเสียง' },
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
        <button class="chip" data-s="mastered">🟢 คำที่จำได้แล้ว (${masteredWords().length})</button>
        <button class="chip" data-s="star">⭐ คำติดดาว (${Object.keys(S.star).length})</button>
      </div>
      ${gameSource === 'mastered' ? '<div class="small muted" style="margin-top:8px">เช็คว่ายังจำได้จริงไหม คำที่ตอบผิดจะกลับไปอยู่ในแฟลชการ์ดให้ทบทวนอีกครั้ง</div>' : ''}
    </div>
    <div class="game-grid">${Object.keys(GAMES).map(gameTile).join('')}</div>`;
  const paint = () => view.querySelectorAll('#src .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === gameSource));
  paint();
  $('#src').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { gameSource = c.dataset.s; renderGames(); } };
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
}

const masteredWords = () => W.filter((w) => S.prog[w.w] && S.prog[w.w].b >= MASTERED);

function gamePool(id) {
  if (id === 'review') {
    return W.filter((w) => S.prog[w.w] && (S.prog[w.w].x || 0) > 0)
      .sort((a, b) => (S.prog[b.w].x - S.prog[a.w].x) || (S.prog[a.w].b - S.prog[b.w].b)).slice(0, 40);
  }
  let list = gameSource === 'learned' ? W.filter((w) => S.prog[w.w])
    : gameSource === 'mastered' ? masteredWords()
    : gameSource === 'star' ? W.filter(isStar)
    : gameSource === 'all' ? W : pool();
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
  if (id === 'speak' && !canListen) {
    toast('เบราว์เซอร์นี้ยังไม่รองรับการฟังเสียงพูด ลองเปิดใน Safari ดูนะ');
    if (current !== 'games') go('games');
    return;
  }
  const src = gamePool(id);
  const min = id === 'match' ? 6 : 4;
  if (src.length < min) {
    toast(id === 'review' ? 'ยังไม่มีคำที่ตอบผิด เก่งมาก! 👍'
      : gameSource === 'mastered' ? `ต้องมีคำที่จำได้แล้วอย่างน้อย ${min} คำก่อนนะ`
      : gameSource === 'star' ? `ติดดาวคำอย่างน้อย ${min} คำก่อนนะ (กด ☆ บนการ์ดหรือในหน้าคำศัพท์)`
      : 'คำศัพท์ยังน้อยไป ลองเลือก "ระดับที่เลือก" ก่อนนะ');
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
    if (m === 'speak') return qSpeak(w);
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
      const sayEx = view.querySelector('[data-sayex]'); // only present when the example is shown
      if (sayEx) sayEx.onclick = () => speak(w.e);
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

  function qSpeak(w) {
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="muted" style="margin-top:6px">${esc(w.t)}</div>
        <button class="hint-btn" data-say>🔊 ฟังตัวอย่าง</button></div>
      <div class="center"><button class="mic" id="mic" aria-label="กดแล้วพูด">🎤</button></div>
      <div class="center small muted" id="heard">แตะไมค์แล้วพูดคำนี้</div>
      <button class="btn block" id="skip" style="margin-top:12px">ข้าม / เฉลย</button>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    view.querySelector('[data-say]').onclick = () => speak(w.w);
    const mic = $('#mic'), heard = $('#heard');
    let tries = 0, answered = false, rec = null;
    cleanup = () => { if (rec) try { rec.abort(); } catch (e) { /* ignore */ } };
    const done = (ok) => {
      answered = true; cleanup();
      mark(w, ok);
      mic.disabled = true;
      $('#skip').remove();
      $('#reveal').innerHTML = (ok ? `✅ ออกเสียงถูกแล้ว! <b>${esc(w.w)}</b>` : `👂 ลองฟังแล้วพูดตามอีกครั้งนะ <b>${esc(w.w)}</b> ${esc(w.i)}`)
        + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(w.e);
      $('#nextQ').onclick = () => { cleanup = null; next(); };
      if (!ok) speak(w.w);
      else setTimeout(() => { if (items[i] === w) { cleanup = null; next(); } }, 1300);
    };
    mic.onclick = () => {
      if (answered) return;
      if (rec) { rec.stop(); return; }
      if (window.speechSynthesis) speechSynthesis.cancel();
      rec = new SR();
      rec.lang = S.settings.accent; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
      mic.classList.add('on'); heard.textContent = 'กำลังฟัง... พูดได้เลย';
      rec.onresult = (e) => {
        const alts = Array.from(e.results[0]).map((a) => a.transcript);
        if (alts.some((a) => spokenMatch(a, w.w))) return done(true);
        tries++;
        heard.innerHTML = `ได้ยินว่า "<b>${esc(alts[0] || '')}</b>" ลองอีกครั้งนะ 💪 (${tries}/3)`;
        mic.classList.remove('no'); void mic.offsetWidth; mic.classList.add('no');
        if (tries >= 3) done(false);
      };
      rec.onerror = (e) => {
        heard.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์/การรู้จำเสียง ลองเปิดในตั้งค่า iPhone ดูนะ'
          : 'ไม่ได้ยินเสียง แตะไมค์แล้วลองอีกครั้งนะ';
      };
      rec.onend = () => { rec = null; mic.classList.remove('on'); };
      try { rec.start(); } catch (err) { rec = null; mic.classList.remove('on'); heard.textContent = 'เปิดไมค์ไม่ได้ ลองอีกครั้งนะ'; }
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    speak(w.w);
  }

  function mark(w, ok) {
    // A missed pronunciation doesn't mean the meaning was forgotten, so it doesn't reset the card.
    if (gameId === 'speak' && !ok) markActive(); else gameResult(w, ok);
    if (gameId === 'speak' && ok) S.counts.speak = (S.counts.speak || 0) + 1;
    questEvent('answer', { game: gameId, ok });
    sfx(ok ? 'ok' : 'bad');
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); score += 10 + Math.min(combo - 1, 5) * 2; addXP(comboXP(combo)); }
    else { combo = 0; wrong.push(w); }
  }
  function next() { i++; q(); }

  function result() {
    const prev = S.best[gameId];
    const isBest = prev == null || score > prev;
    if (isBest) { S.best[gameId] = score; save(); }
    const correct = items.length - wrong.length;
    if (correct === items.length && items.length >= 10) S.counts.perfect = (S.counts.perfect || 0) + 1;
    questEvent('round', { game: gameId, correct, bestCombo });
    if (correct >= 8) confetti();
    const emoji = correct === items.length ? '🏆' : correct >= 7 ? '🎉' : correct >= 4 ? '💪' : '📚';
    view.innerHTML = `<div class="card-box center pop">
        <div class="result-emoji">${emoji}</div>
        <div class="h2">${score} แต้ม ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>ถูก ${correct}/${items.length} · คอมโบสูงสุด ${bestCombo}</p>
      </div>
      ${wrong.length ? `<div class="card-box wrong-list"><b>${gameId === 'speak' ? 'คำที่ควรฝึกออกเสียง' : 'คำที่ควรทบทวน'}</b> <span class="small muted">${gameId === 'speak' ? '(แตะคำเพื่อฟังเสียง)' : '(ใส่ในแฟลชการ์ดให้แล้ว)'} · กด ☆ เพื่อติดดาว</span>
        ${wrong.map((w) => `<div class="wl" data-i="${w.idx}"><span><b>${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span><button class="star-btn" data-star>${starIcon(w)}</button></div>`).join('')}</div>` : ''}
      <button class="btn primary block" id="again">เล่นอีกรอบ</button>
      <div style="height:10px"></div><button class="btn block" id="back">เลือกเกมอื่น</button>`;
    $('#again').onclick = () => startGame(gameId);
    $('#back').onclick = () => go('games');
    const wl = view.querySelector('.wrong-list');
    if (wl) wl.onclick = (e) => {
      const row = e.target.closest('.wl'); if (!row) return;
      const w = W[+row.dataset.i];
      const sb = e.target.closest('[data-star]');
      if (sb) { toggleStar(w); sb.textContent = starIcon(w); } else speak(w.w);
    };
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
    addXP(mistakes <= 2 ? 12 : 6);
    questEvent('match', { mistakes });
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

/* ---------- quick play ---------- */
// One tap from home: a random multiple-choice game on words the user has started (or their levels).
function quickPlay() {
  gameSource = W.filter((w) => S.prog[w.w] && S.settings.levels.includes(w.g)).length >= 10 ? 'learned' : 'level';
  let id = pick(['en2th', 'th2en', 'listen', 'cloze']);
  if (gamePool(id).length < 4) id = 'en2th';
  startGame(id);
}

/* ---------- feed (ไถศัพท์) ---------- */
// Endless TikTok-style feed: one card per screen, swipe up for the next. Due words come first, then
// new words (a "learn" card followed by a quiz on it a few cards later) up to the daily goal, then
// practice on learned words. Answers use gameResult() like the games.
function renderFeed() {
  view.classList.add('feed-mode');
  view.innerHTML = `<div class="feed-hud"><span id="fCombo" class="combo"></span><span class="small" id="fXp"></span></div><div class="feed" id="feed"></div>`;
  const feed = $('#feed');
  const seen = new Set();
  const later = [];            // { at: card number, w } quizzes on words just introduced
  const cards = [];            // card number -> { w, type, el, done, speakOnShow }
  let n = 0, combo = 0, newDealt = 0, newDone = 0, activeN = -1;
  const hud = () => {
    const L = levelOf(S.xp);
    $('#fXp').textContent = `Lv.${L} · ${S.xp - levelStart(L)}/${levelStart(L + 1) - levelStart(L)} XP`;
    $('#fCombo').textContent = combo >= 2 ? `🔥 คอมโบ x${combo}` : '';
  };
  hud();

  function chooseWord() {
    if (later.length && later[0].at <= n) return [later.shift().w, 'quiz'];
    const p = pool();
    const due = dueList(p).find((w) => !seen.has(w.w));
    if (due) return [due, 'quiz'];
    if (S.daily.fresh + (newDealt - newDone) < S.settings.newPerDay) {
      const fresh = shuffle(p.filter((w) => !S.prog[w.w] && !seen.has(w.w)))[0];
      if (fresh) return [fresh, 'learn'];
    }
    // Practice: lower boxes first, with some randomness.
    let learned = p.filter((w) => S.prog[w.w] && !seen.has(w.w));
    if (!learned.length) learned = W.filter((w) => S.prog[w.w] && !seen.has(w.w));
    if (learned.length) {
      learned.sort((a, b) => S.prog[a.w].b - S.prog[b.w].b);
      return [pick(learned.slice(0, 30)), 'quiz'];
    }
    // Nothing learned and today's new words used up (or everything seen): keep going anyway.
    const rest = p.filter((w) => !seen.has(w.w));
    if (!rest.length) seen.clear();
    const w = pick(rest.length ? rest : p);
    return [w, S.prog[w.w] ? 'quiz' : 'learn'];
  }

  const heart = (w) => `<button class="f-act" data-heart aria-label="ติดดาว">${isStar(w) ? '❤️' : '🤍'}<small>ชอบ</small></button>`;
  function addCard() {
    const [w, kind] = chooseWord();
    seen.add(w.w);
    const k = n++;
    let type = kind, body;
    if (kind === 'learn') {
      newDealt++;
      later.push({ at: k + 3, w });
      body = `<div class="f-tag">✨ คำใหม่</div>
        <div class="f-word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="f-th">${esc(w.t)}</div>${exampleBox(w)}
        <div class="small muted" style="margin-top:14px">จำไว้นะ อีกเดี๋ยวจะมีคำถามคำนี้ 😉</div>`;
    } else {
      type = pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'tf', 'cloze'] : ['en2th', 'th2en', 'listen', 'tf']);
      let prompt, opts;
      if (type === 'tf') {
        const real = Math.random() < 0.5;
        const shown = real ? w : distractors(w, 1, 't')[0];
        cards[k] = { tfReal: real };
        prompt = `<div class="f-tag">✅ ใช่หรือไม่?</div><div class="f-word">${esc(w.w)}</div><div class="muted">แปลว่า</div><div class="f-th">${esc(thFirst(shown.t))}</div>`;
        opts = `<div class="options tf"><button class="opt" data-tf="1">⭕ ใช่</button><button class="opt" data-tf="0">❌ ไม่ใช่</button></div>`;
      } else {
        const toTh = type !== 'th2en' && type !== 'cloze';
        const list = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w')]);
        if (type === 'en2th') prompt = `<div class="f-tag">🇬🇧 แปลว่าอะไร?</div><div class="f-word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
        else if (type === 'th2en') prompt = `<div class="f-tag">🇹🇭 ภาษาอังกฤษคือ?</div><div class="f-th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
        else if (type === 'listen') prompt = `<div class="f-tag">🎧 ฟังแล้วตอบ</div><button class="speak f-listen" data-say>🔊</button><div class="small muted">แตะเพื่อฟังอีกครั้ง</div>`;
        else {
          const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
          prompt = `<div class="f-tag">📝 เติมคำในประโยค</div><div class="cloze">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div><div class="thx">${esc(w.et)}</div>`;
        }
        opts = `<div class="options">${list.map((o) => `<button class="opt" data-i="${o.idx}">${esc(toTh ? o.t : o.w)}</button>`).join('')}</div>`;
      }
      body = `${prompt}${opts}<div class="reveal f-reveal"></div>`;
    }
    const el = document.createElement('section');
    el.className = 'fcard';
    el.dataset.n = k;
    el.innerHTML = `<div class="f-in">${lvBadge(w.g)}<div class="f-body">${body}</div></div>
      <div class="f-side">${heart(w)}<button class="f-act" data-say aria-label="ฟังเสียง">🔊<small>ฟัง</small></button></div>`;
    cards[k] = { ...(cards[k] || {}), w, type, el, done: kind === 'learn' };
    feed.appendChild(el);
    io.observe(el);
  }

  function answer(k, ok, btn) {
    const c = cards[k]; if (c.done) return;
    c.done = true;
    const w = c.w;
    if (!S.prog[w.w]) { S.daily.fresh++; newDone++; }
    gameResult(w, ok);
    sfx(ok ? 'ok' : 'bad');
    if (ok) { combo++; addXP(comboXP(combo)); } else combo = 0;
    if (combo === 6) questEvent('round', { game: 'feed', correct: 0, bestCombo: combo });
    questEvent('answer', { game: 'feed', ok });
    hud();
    if (c.type === 'tf') {
      c.el.querySelectorAll('[data-tf]').forEach((o) => { if (+o.dataset.tf === (c.tfReal ? 1 : 0)) o.classList.add('correct'); });
    } else {
      c.el.querySelectorAll('[data-i]').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
    }
    if (!ok && btn) btn.classList.add('wrong');
    const rv = c.el.querySelector('.f-reveal');
    rv.innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ <b>${esc(w.w)}</b> = ${esc(w.t)}`)
      + (ok ? '' : exampleBox(w) + '<div class="small muted" style="margin-top:8px">ใส่ในแฟลชการ์ดให้แล้ว · ปัดขึ้นเพื่อไปต่อ ↑</div>');
    if (c.type === 'th2en' || c.type === 'cloze' || !ok) speak(w.w);
    if (ok) setTimeout(() => { if (activeN === k) scrollToCard(k + 1); }, 900);
  }

  function scrollToCard(k) {
    if (!cards[k]) addCard();
    feed.scrollTo({ top: cards[k].el.offsetTop, behavior: 'smooth' });
  }

  feed.addEventListener('click', (e) => {
    const el = e.target.closest('.fcard'); if (!el) return;
    const k = +el.dataset.n, c = cards[k], w = c.w;
    if (e.target.closest('[data-heart]')) {
      toggleStar(w);
      e.target.closest('[data-heart]').innerHTML = `${isStar(w) ? '❤️' : '🤍'}<small>ชอบ</small>`;
      if (isStar(w)) toast('⭐ ติดดาวแล้ว ไปเล่นในเกมได้ที่ "คำติดดาว"');
      return;
    }
    if (e.target.closest('[data-sayex]')) return speak(w.e);
    if (e.target.closest('[data-say]')) return speak(w.w);
    const tf = e.target.closest('[data-tf]');
    if (tf) return answer(k, (tf.dataset.tf === '1') === c.tfReal, tf);
    const o = e.target.closest('[data-i]');
    if (o) answer(k, +o.dataset.i === w.idx, o);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const k = +en.target.dataset.n;
      if (k === activeN) return;
      activeN = k;
      const c = cards[k];
      if (S.settings.autoSpeak && (c.type === 'learn' || (!c.done && ['en2th', 'listen', 'tf'].includes(c.type)))) speak(c.w.w);
      while (n - k < 4) addCard();
    });
  }, { root: feed, threshold: 0.6 });
  cleanup = () => io.disconnect();
  for (let k = 0; k < 4; k++) addCard();
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
      ${[['all', 'ทั้งหมด'], ['new', 'ยังไม่เรียน'], ['learning', '🟡 กำลังเรียน'], ['mastered', '🟢 จำได้แล้ว'], ['star', '⭐ ติดดาว']].map(([v, t]) => `<button class="chip" data-v="${v}">${t}</button>`).join('')}
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
      <span class="star-mark">${isStar(w) ? '⭐' : ''}</span>${lvBadge(w.g)}</div>`).join(''));
    shown += chunk.length;
  };
  const apply = () => {
    const q = listFilter.q.trim().toLowerCase();
    items = W.filter((w) => (listFilter.lv === 'all' || w.g === listFilter.lv)
      && (listFilter.st === 'all' || (listFilter.st === 'star' ? isStar(w) : status(w) === listFilter.st))
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
    openSheet(w, () => { r.querySelector('.dot').className = 'dot ' + status(w); r.querySelector('.star-mark').textContent = isStar(w) ? '⭐' : ''; });
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
      <button class="btn block" data-act="star" style="margin-top:14px">${isStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาวคำนี้'}</button>
      <div class="row" style="margin-top:10px">
        <button class="btn grow" data-act="review">🔁 ทบทวนวันนี้</button>
        <button class="btn grow" data-act="known">✓ รู้แล้ว</button>
      </div>
      <a class="link" style="display:block;text-align:center;margin-top:12px" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูใน Oxford Learner's Dictionaries ↗</a>
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
    if (act.dataset.act === 'star') {
      act.textContent = toggleStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาวคำนี้';
      if (onChange) onChange();
      return;
    }
    if (act.dataset.act === 'known') { markKnown(w); toast('ทำเครื่องหมายว่ารู้แล้ว 👍'); }
    else { markForReview(w); toast('เพิ่มเข้ารายการทบทวนแล้ว 🔁'); }
    if (onChange) onChange();
    close();
  };
}

/* ---------- guide ---------- */
// In-app user manual. Plain content; keep it in sync when features change.
const GUIDE = [
  ['🚀', 'เริ่มต้นใช้งาน', `
    <ol>
      <li>เปิดแอปใน <b>Safari</b> → กดปุ่ม <b>แชร์</b> → <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วใช้จากไอคอนนั้นเสมอ (ข้อมูลใน Safari กับในไอคอนแยกกัน)</li>
      <li>ไปที่ <b>⚙️ ตั้งค่า</b> เลือกระดับคำที่จะเรียน (แนะนำเริ่มที่ A1) และจำนวนคำใหม่ต่อวัน</li>
      <li>กลับมาหน้าแรก กด <b>▶︎ เริ่มเรียนเลย</b></li>
      <li>ตั้ง <b>การเตือนในปฏิทิน</b> (ในตั้งค่า) ให้เตือนทุกวันตามเวลาที่สะดวก</li>
      <li>เรียนไปสักพักแล้ว <b>สำรองข้อมูล</b> เก็บไว้ใน iCloud Drive</li>
    </ol>`],
  ['🃏', 'แฟลชการ์ดและ 4 ปุ่ม', `
    <p>แตะการ์ดเพื่อพลิกดูคำแปล แล้วกดปุ่มตามที่นึกออกจริงๆ</p>
    <ul>
      <li><b>ลืม</b> — นึกไม่ออกเลย การ์ดจะกลับมาอีกในรอบนี้ และเริ่มนับใหม่</li>
      <li><b>ยาก</b> — นึกออกแต่ช้า/ไม่แน่ใจ ระยะทบทวนเท่าเดิม (คำใหม่จะ "วนอีกรอบ" ในรอบนี้)</li>
      <li><b>จำได้</b> — นึกออก ระยะทบทวนยาวขึ้น 1 ขั้น</li>
      <li><b>ง่าย</b> — รู้ทันที ยาวขึ้น 2 ขั้น</li>
    </ul>
    <p><b>ทางลัด:</b> ปัดการ์ดไปขวา = จำได้, ปัดไปซ้าย = ลืม</p>
    <p>ระยะทบทวนคือ 1 → 3 → 7 → 16 → 35 → 80 → 180 วัน คำที่ผ่านถึงขั้น 16 วันขึ้นไปจะนับว่า <b>🟢 จำได้แล้ว</b></p>
    <p>กดผิด? กด <b>↩︎</b> มุมขวาบนเพื่อย้อนการ์ดใบล่าสุด · แตะ ⭐ บนการ์ดเพื่อติดดาวคำที่อยากฝึกเพิ่ม</p>`],
  ['📱', 'ไถศัพท์ และเล่นด่วน', `
    <p><b>📱 ไถศัพท์</b> (แท็บด้านล่าง หรือปุ่มสีชมพูในหน้าแรก) — ปัดขึ้นทีละคำเหมือนไถ TikTok ไม่มีวันจบ เหมาะกับช่วงว่างสั้นๆ</p>
    <ul>
      <li>แอปเอาคำที่ <b>ถึงวันทบทวน</b> มาก่อน แล้วค่อยแทรก <b>✨ คำใหม่</b> (นับรวมกับเป้าคำใหม่ต่อวัน) ที่เหลือเป็นการฝึกคำที่เรียนแล้ว</li>
      <li>เจอคำใหม่ อ่านแล้วปัดผ่านไป อีก 3 ใบจะมีคำถามคำนั้นให้ตอบ</li>
      <li>คำถามมีหลายแบบ: แปลความหมาย, ทายคำอังกฤษ, ฟังเสียง, ใช่หรือไม่, เติมคำในประโยค</li>
      <li>ตอบถูกแล้วจะเลื่อนไปใบถัดไปเอง ตอบผิดจะมีเฉลยและประโยคตัวอย่าง แล้วคำนั้นจะไปอยู่ในแฟลชการ์ดให้ทบทวน</li>
      <li>แตะ <b>🤍 ชอบ</b> เพื่อติดดาวคำนั้น · <b>🔊 ฟัง</b> เพื่อฟังเสียงอีกครั้ง</li>
    </ul>
    <p><b>⚡ เล่นด่วน</b> (หน้าแรก) — แตะครั้งเดียว แอปสุ่มเกมให้ 10 ข้อ ใช้คำที่เรียนแล้ว จบในราว 1 นาที</p>
    <p>อยากให้เปิดแอปแล้วเข้าไถศัพท์ทันที: ⚙️ ตั้งค่า → <b>เปิดแอปแล้วไปที่</b> → 📱 ไถศัพท์</p>`],
  ['⭐', 'XP และเลเวล', `
    <ul>
      <li>ได้ XP ทุกครั้งที่ทำแฟลชการ์ด (2 XP, กด "ลืม" ได้ 1 XP) ตอบถูกในเกม/ไถศัพท์ (2 XP)</li>
      <li><b>ตอบถูกติดกัน</b> ได้โบนัสคอมโบเพิ่มสูงสุด +5 XP ต่อข้อ · จับคู่ด่วนจบรอบได้ 6–12 XP</li>
      <li>เลเวลดูได้ที่มุมขวาบน (Lv.) และการ์ดเลเวลในหน้าแรก ยิ่งเลเวลสูง ต้องใช้ XP มากขึ้น</li>
    </ul>`],
  ['🔁', 'เล่นหลายรอบในวันเดียว', `
    <ul>
      <li>ถ้ายังมีการ์ดค้าง เข้ามากี่ครั้งก็จะได้ทำต่อจากที่ค้างไว้</li>
      <li>ทำครบแล้ว กด <b>"เรียนคำใหม่เพิ่มอีก 10 คำ"</b> ได้เรื่อยๆ</li>
      <li>แอปจะไม่ให้ทวนคำที่ยังไม่ถึงกำหนดซ้ำ เพราะการเว้นระยะให้ลืมนิดหน่อยก่อนทวนช่วยให้จำได้นานกว่า อยากฝึกเพิ่มให้ไปเล่น <b>🎮 เกม</b> แทน</li>
    </ul>`],
  ['🎮', 'เกมทั้ง 8 แบบ', `
    <ul>
      <li><b>🇬🇧 ทายความหมาย / 🇹🇭 ทายคำศัพท์</b> — เลือกคำแปลที่ถูก</li>
      <li><b>🎧 ฟังแล้วตอบ</b> — ฝึกหู ฟังเสียงแล้วเลือกความหมาย</li>
      <li><b>⌨️ สะกดคำ</b> — พิมพ์คำอังกฤษเอง จำได้ลึกที่สุด</li>
      <li><b>📝 เติมคำในประโยค</b> — ฝึกใช้คำในบริบท</li>
      <li><b>🧩 จับคู่ด่วน</b> — แข่งกับเวลา เล่นสนุกตอนว่าง</li>
      <li><b>🎤 พูดตาม</b> — กดไมค์แล้วพูดคำนั้น ลองได้ 3 ครั้ง (ต้องอนุญาตไมโครโฟน) พูดไม่ผ่านไม่ทำให้การ์ดถูกรีเซ็ต</li>
      <li><b>🔁 คำที่ผิดบ่อย</b> — รวมคำที่เคยตอบผิดมาฝึกซ้ำ</li>
    </ul>
    <p><b>เลือกแหล่งคำ</b> ด้านบนหน้าเกมได้: ระดับที่เลือก, คำที่เรียนแล้ว, ทุกระดับ, 🟢 คำที่จำได้แล้ว (เช็คว่ายังจำได้จริง คำที่ตอบผิดจะกลับไปให้ทบทวนในแฟลชการ์ด) และ ⭐ คำติดดาว</p>
    <p>หน้าสรุปผลแตะคำที่ตอบผิดเพื่อฟังเสียง หรือแตะ ⭐ เพื่อติดดาวไว้ฝึกต่อ</p>`],
  ['📖', 'รายการคำศัพท์', `
    <ul>
      <li>ค้นหาคำ อังกฤษหรือไทยก็ได้ และกรองตามสถานะ (ยังไม่เรียน / กำลังเรียน / จำได้แล้ว / ⭐ ติดดาว) และตามระดับ</li>
      <li>แตะคำเพื่อดูรายละเอียด ฟังเสียง และประโยคตัวอย่าง</li>
      <li>ในหน้ารายละเอียด: <b>⭐ ติดดาว</b>, <b>🔁 ทบทวนวันนี้</b> (ดึงคำมาให้ทวนทันที), <b>✓ รู้แล้ว</b> (ข้ามคำที่รู้อยู่แล้ว)</li>
    </ul>`],
  ['🔥', 'สตรีค ภารกิจ และเหรียญ', `
    <ul>
      <li><b>🔥 สตรีค</b> — จำนวนวันที่เรียนต่อเนื่อง (มุมขวาบน)</li>
      <li><b>🧊 ตัวกันสตรีคขาด</b> — ได้ 1 อันทุกครั้งที่เรียนครบ 7 วันติด เก็บได้สูงสุด 2 อัน ถ้าวันไหนลืมเรียน จะถูกใช้อัตโนมัติ สตรีคไม่ขาด</li>
      <li><b>🎯 ภารกิจรายวัน</b> — เปลี่ยนทุกวัน ทำสำเร็จแล้วได้นับเหรียญนักล่าภารกิจ</li>
      <li><b>🏅 เหรียญรางวัล</b> — แตะดูเงื่อนไขได้ในหน้าแรก</li>
      <li><b>📅 กราฟ 7 วันข้างหน้า</b> — บอกว่าจะมีการ์ดทบทวนวันละเท่าไร ถ้าขึ้นเตือนว่าเยอะเกิน ให้ลดคำใหม่ต่อวันลง</li>
    </ul>`],
  ['💾', 'สำรองและกู้คืนข้อมูล', `
    <p>ความคืบหน้าเก็บอยู่ในเครื่องนี้เท่านั้น <b>ถ้าลบไอคอนแอป ข้อมูลจะหาย</b></p>
    <ul>
      <li><b>สำรอง:</b> ตั้งค่า → 📤 ส่งออก → เลือก "บันทึกไปยังไฟล์" → iCloud Drive (แอปจะเตือนทุก 7 วัน)</li>
      <li><b>กู้คืน:</b> ตั้งค่า → 📥 นำเข้า → เลือก <b>ไฟล์ล่าสุด</b> ไฟล์เดียวพอ</li>
      <li>การนำเข้าเป็นแบบ <b>รวมข้อมูล</b> คำไหนในเครื่องก้าวหน้ากว่าไฟล์ จะเก็บของในเครื่องไว้ ไม่ต้องกลัวทับ</li>
      <li>ย้ายเครื่องใหม่: ส่งออกจากเครื่องเก่า → นำเข้าในเครื่องใหม่</li>
    </ul>`],
  ['🔄', 'อัปเดตแอป', `
    <ul>
      <li>ปิดแอป (ปัดขึ้นออกจากหน้าสลับแอป) แล้วเปิดใหม่ตอนต่อเน็ต แอปจะโหลดเวอร์ชันใหม่เอง อาจต้องทำ 2 รอบ</li>
      <li>เช็คเวอร์ชันได้ที่ท้ายหน้าแรกหรือหน้าตั้งค่า (ตอนนี้ ${APP_VERSION})</li>
      <li><b>ไม่ต้อง</b> ลบไอคอนแล้วเพิ่มใหม่ เพราะจะทำให้ข้อมูลหาย</li>
    </ul>`],
  ['💡', 'ทริกให้จำได้เร็วและได้ผลที่สุด', `
    <ol>
      <li><b>ทำการ์ดทบทวนให้หมดทุกวัน</b> สำคัญที่สุด วันละ 15 นาทีทุกวัน ดีกว่า 2 ชั่วโมงแล้วหยุด 3 วัน</li>
      <li><b>คำใหม่ 20–30 คำ/วัน</b> กำลังดี การ์ดทบทวนต่อวันจะประมาณ 4–6 เท่าของคำใหม่
        <table class="g-table"><tr><th>คำใหม่/วัน</th><th>จบ 3000 คำ</th><th>เวลา/วัน</th></tr>
        <tr><td>20</td><td>~5 เดือน</td><td>15–20 นาที</td></tr>
        <tr><td>30</td><td>~3.5 เดือน</td><td>25–30 นาที</td></tr>
        <tr><td>50</td><td>~2 เดือน</td><td>45+ นาที</td></tr></table></li>
      <li><b>กดปุ่มตามจริง</b> อย่ากด "ง่าย" ทั้งที่ลังเล ไม่งั้นคำจะหายไปนานแล้วกลับมาลืม</li>
      <li><b>ฟังและพูดออกเสียงทุกคำ</b> ใช้ทั้งตาและหู จำได้ดีกว่าอ่านเฉยๆ</li>
      <li><b>อ่านประโยคตัวอย่าง</b> แล้วลองแต่งประโยคของตัวเองในหัว</li>
      <li><b>ติด ⭐ คำที่ลืมบ่อย</b> แล้วเล่นเกมจาก "คำติดดาว" ตอนรอรถหรือว่างๆ</li>
      <li><b>เรียงตามระดับ</b> จบ A1 ก่อนค่อยเพิ่ม A2 คำระดับต้นใช้บ่อยกว่า เห็นผลเร็ว</li>
      <li><b>สลับด้านการ์ดเป็น ไทย → อังกฤษ</b> (ในตั้งค่า) เมื่อคล่องแล้ว จะฝึกการนึกคำเพื่อใช้พูด/เขียนจริง</li>
      <li><b>เล่น ⌨️ สะกดคำ และ 🎤 พูดตาม</b> บ่อยๆ สองเกมนี้ต้องนึกเอง ไม่ใช่แค่เลือก จึงจำได้ลึกที่สุด</li>
      <li><b>ถ้าการ์ดค้างเยอะ</b> (เช่นหายไปหลายวัน) ตั้งคำใหม่ต่อวันเป็น 5 ชั่วคราว จนเคลียร์การ์ดค้างหมดก่อน</li>
      <li><b>ว่างเมื่อไรเปิด 📱 ไถศัพท์ แทนโซเชียล</b> ย้ายไอคอนแอปไว้หน้าแรกของ iPhone ตรงที่เคยวาง TikTok นิ้วจะเคยชินเอง</li>
    </ol>
    <div class="g-plan"><b>📲 ให้ iPhone เตือนตอนเปิด TikTok</b><br>
      แอป <b>คำสั่งลัด (Shortcuts)</b> → แท็บ <b>ระบบอัตโนมัติ</b> → <b>+</b> → <b>แอป</b> → เลือก TikTok → ติ๊ก <b>ถูกเปิด</b> → <b>เรียกใช้ทันที</b> → เพิ่มคำสั่ง <b>แสดงการแจ้งเตือน</b> พิมพ์ข้อความ เช่น "ไถศัพท์ 5 นาทีก่อนไหม? 📚"<br>
      ทุกครั้งที่เปิด TikTok จะมีการแจ้งเตือนขึ้นมาเตือนใจ</div>
    <div class="g-plan"><b>📅 ตัวอย่างตารางต่อวัน</b><br>
      เช้า 15 นาที: แฟลชการ์ดให้หมด<br>
      ช่วงว่างระหว่างวัน: 📱 ไถศัพท์ หรือ ⚡ เล่นด่วน แทนเปิดโซเชียล<br>
      เย็น 5–10 นาที: เกม 1–2 รอบ จากคำที่จำได้แล้ว หรือคำติดดาว<br>
      ทุกสัปดาห์: สำรองข้อมูล 1 ครั้ง</div>`],
  ['❓', 'ปัญหาที่พบบ่อย', `
    <ul>
      <li><b>ไม่มีเสียง:</b> ลองกด 🔊 ทดสอบเสียงในตั้งค่า, เพิ่มเสียง iPhone, และเสียงเอฟเฟกต์จะเงียบถ้าเปิดโหมดปิดเสียง</li>
      <li><b>เกมพูดตามใช้ไม่ได้:</b> บางครั้ง iPhone ไม่รองรับการฟังเสียงในแอปบนหน้าจอโฮม ลองเปิดผ่าน Safari แทน</li>
      <li><b>ความคืบหน้าหาย:</b> ตรวจว่าเปิดจากไอคอนเดิม (ไม่ใช่ Safari) ถ้าหายจริง นำเข้าไฟล์สำรองล่าสุด</li>
      <li><b>ไม่เห็นฟีเจอร์ใหม่:</b> ปิดแอปแล้วเปิดใหม่ตอนต่อเน็ต แล้วเช็คเลขเวอร์ชัน</li>
    </ul>`],
];
function renderGuide(from) {
  const back = from || 'home';
  view.innerHTML = `
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="gBack">‹ กลับ</button></div>
    <p class="small muted" style="margin:0 4px 12px">แตะหัวข้อเพื่อเปิดอ่าน</p>
    <div class="guide">${GUIDE.map(([icon, title, body], i) => `<details class="card-box"${i === GUIDE.length - 2 ? ' open' : ''}>
      <summary><span>${icon}</span><b>${title}</b></summary><div class="g-body">${body}</div></details>`).join('')}</div>
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#gBack').onclick = () => go(back);
}

/* ---------- settings ---------- */
// Pre-built calendar files in reminders/ (see README): one per time.
const REMIND_TIMES = ['0600', '0700', '0800', '0900', '1200', '1700', '1800', '1900', '2000', '2100', '2200'];
function renderSettings() {
  const st = S.settings;
  const lvChip = (l) => `<button class="chip" data-v="${l}">${LV_LABEL[l]} · ${W.filter((w) => w.g === l).length} คำ</button>`;
  view.innerHTML = `
    <button class="card-box guide-link" id="guideBtn" style="margin-top:4px"><span>📘</span><div class="grow"><b>คู่มือการใช้งาน & ทริก</b><div class="small muted">วิธีใช้ทุกส่วนของแอป และวิธีจำศัพท์ให้ได้ผลที่สุด</div></div><span class="muted">›</span></button>
    <div class="h2">ระดับคำศัพท์ที่เรียน</div>
    <div class="card-box">
      <div class="small muted" style="margin-bottom:8px"><b>ชุด 3000 คำ</b> · คำหลักที่ต้องรู้</div>
      <div class="chips" id="lvls">${LEVELS_3000.map(lvChip).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px"><b>ชุด 5000 คำ</b> · คำเพิ่มเติมระดับสูง</div>
      <div class="chips" id="lvls5">${LEVELS_5000.map(lvChip).join('')}</div>
      <p class="small muted" style="margin-bottom:0">A1–A2 = พื้นฐาน, B1–B2 = ระดับกลาง, B2+ และ C1 = ระดับสูง (เลือกได้หลายระดับ)</p>
    </div>

    <div class="h2">การเรียน</div>
    <div class="card-box">
      <div class="set-row"><span>คำใหม่ต่อวัน</span>
        <select class="sel" id="npd">${[5, 10, 15, 20, 30, 50, 100].map((n) => `<option ${n === st.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row"><span>ลำดับคำใหม่</span>
        <select class="sel" id="ord"><option value="shuffle" ${st.order === 'shuffle' ? 'selected' : ''}>สุ่ม</option><option value="alpha" ${st.order === 'alpha' ? 'selected' : ''}>เรียงตามตัวอักษร</option></select></div>
      <div class="set-row"><span>เปิดแอปแล้วไปที่</span>
        <select class="sel" id="start"><option value="home" ${st.start === 'home' ? 'selected' : ''}>🏠 หน้าแรก</option><option value="feed" ${st.start === 'feed' ? 'selected' : ''}>📱 ไถศัพท์</option><option value="cards" ${st.start === 'cards' ? 'selected' : ''}>🃏 แฟลชการ์ด</option></select></div>
      <div class="set-row"><span>ด้านหน้าการ์ด</span>
        <select class="sel" id="front"><option value="en" ${st.front === 'en' ? 'selected' : ''}>อังกฤษ → ไทย</option><option value="th" ${st.front === 'th' ? 'selected' : ''}>ไทย → อังกฤษ</option></select></div>
    </div>

    <div class="h2">เตือนให้มาเรียนทุกวัน</div>
    <div class="card-box">
      <div class="set-row"><span>เวลาเตือน</span>
        <select class="sel" id="remind">${REMIND_TIMES.map((t) => `<option value="${t}" ${t === S.remind ? 'selected' : ''}>${t.slice(0, 2)}:${t.slice(2)} น.</option>`).join('')}</select></div>
      <a class="btn block" id="remindAdd" href="reminders/${S.remind}.ics" target="_blank" rel="noopener" style="margin-top:8px;text-decoration:none">📅 เพิ่มการเตือนลงปฏิทิน</a>
      <p class="small muted" style="margin-bottom:0">จะเปิดหน้าปฏิทินของ iPhone ให้กด "เพิ่มทั้งหมด" ปฏิทินจะเตือนทุกวันตามเวลานี้ แตะการแจ้งเตือนแล้วกดลิงก์เพื่อเปิดแอป (ถ้าเปลี่ยนเวลา ให้ลบนัดเดิมในปฏิทินก่อน)</p>
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
      <p class="small muted" style="margin-top:0">ความคืบหน้าเก็บไว้ในเครื่องนี้เท่านั้น ถ้าลบไอคอนแอปออกจากหน้าจอโฮม ข้อมูลจะหายด้วย แนะนำให้สำรองเก็บไว้ใน iCloud Drive (แอปจะเตือนทุก ${BACKUP_EVERY} วัน)</p>
      <p class="small" style="margin-top:0"><b>สำรองล่าสุด:</b> ${S.backupAt ? new Date(S.backupAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : 'ยังไม่เคยสำรอง'}<br><span class="muted" id="persist"></span></p>
      <div class="row"><button class="btn grow" id="exp">📤 ส่งออก</button><button class="btn grow" id="imp">📥 นำเข้า</button></div>
      <input type="file" id="file" accept=".json,application/json" hidden>
      <p class="small muted" style="margin-bottom:0">นำเข้าแบบรวมข้อมูล: คำไหนในเครื่องนี้ก้าวหน้ากว่าไฟล์สำรอง จะเก็บของเครื่องนี้ไว้</p>
      <div style="height:10px"></div>
      <button class="btn danger block" id="reset">ล้างความคืบหน้าทั้งหมด</button>
    </div>
    <p class="center small muted">${W.length} คำ · คำแปลไทยและประโยคตัวอย่างเขียนขึ้นเองสำหรับช่วยจำ<br>รายการคำและระดับ CEFR อ้างอิงจากรายการ Oxford 3000™ และ Oxford 5000™ ซึ่งเป็นเครื่องหมายการค้าของ Oxford University Press<br>แอปนี้ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Oxford University Press<br>เวอร์ชัน ${APP_VERSION}</p>`;

  const paint = () => view.querySelectorAll('#lvls .chip, #lvls5 .chip').forEach((c) => c.classList.toggle('on', st.levels.includes(c.dataset.v)));
  paint();
  $('#lvls').onclick = $('#lvls5').onclick = (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    const v = c.dataset.v;
    if (st.levels.includes(v)) { if (st.levels.length > 1) st.levels = st.levels.filter((x) => x !== v); else toast('ต้องเลือกอย่างน้อย 1 ระดับ'); }
    else st.levels = LEVELS.filter((l) => l === v || st.levels.includes(l));
    save(); paint();
  };
  $('#guideBtn').onclick = () => go('guide', 'settings');
  $('#npd').onchange = (e) => { st.newPerDay = +e.target.value; save(); };
  $('#ord').onchange = (e) => { st.order = e.target.value; save(); };
  $('#start').onchange = (e) => { st.start = e.target.value; save(); };
  $('#front').onchange = (e) => { st.front = e.target.value; save(); };
  $('#auto').onchange = (e) => { st.autoSpeak = e.target.checked; save(); };
  $('#sfx').onchange = (e) => { st.sfx = e.target.checked; save(); sfx('ok'); };
  $('#acc').onchange = (e) => { st.accent = e.target.value; save(); speak('Hello! Nice to meet you.'); };
  $('#rate').onchange = (e) => { st.rate = +e.target.value; save(); speak('vocabulary'); };
  $('#test').onclick = () => speak('Hello! Let\'s learn English together.');
  $('#remind').onchange = (e) => { S.remind = e.target.value; save(); $('#remindAdd').href = `reminders/${S.remind}.ics`; };

  $('#exp').onclick = async () => { await exportBackup(); renderSettings(); };
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((ok) => { const el = $('#persist'); if (el) el.textContent = ok ? '🔒 เครื่องเก็บข้อมูลแบบถาวรแล้ว' : ''; }).catch(() => {});
  }
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || typeof d.prog !== 'object') throw new Error('bad file');
      const { added, updated } = mergeBackup(d);
      toast(`นำเข้าแล้ว ✅ เพิ่ม ${added} คำ · อัปเดต ${updated} คำ`); go('home');
    } catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
  };
  $('#reset').onclick = () => {
    if (!confirm('ล้างความคืบหน้าทั้งหมดใช่ไหม? (ย้อนกลับไม่ได้)')) return;
    const settings = S.settings;
    S = defaults(); S.settings = settings; save(); toast('ล้างข้อมูลแล้ว'); go('home');
  };
}

/* ---------- boot ---------- */
go(['home', 'feed', 'cards'].includes(S.settings.start) ? S.settings.start : 'home');
// Ask the browser not to evict our localStorage under storage pressure / inactivity.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Refresh counts when returning to the app after a while (e.g. next day).
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'home') renderHome(); });
