'use strict';

// App version shown in the UI. Bump it (and VERSION in sw.js) on every push.
const APP_VERSION = '1.14.1';

/* ---------- data ---------- */
// WORDS rows: [word, pos, level, ipa, thai, example, thai example, 5 if Oxford 5000-only]
// g = study group: A1–B2 are Oxford 3000; B2x and C1 are the extra Oxford 5000 words.
// Topic per word: topics.js holds one letter per WORDS row ('a' = TOPICS[0], …).
const TOPICS = [
  ['people', '👪', 'คนและครอบครัว'], ['body', '💪', 'ร่างกายและสุขภาพ'], ['food', '🍜', 'อาหารและเครื่องดื่ม'],
  ['home', '🏠', 'บ้านและของใช้'], ['clothes', '👕', 'เสื้อผ้าและการแต่งตัว'], ['nature', '🌿', 'ธรรมชาติ สัตว์ อากาศ'],
  ['travel', '✈️', 'สถานที่และการเดินทาง'], ['work', '💼', 'งาน เงิน การซื้อขาย'], ['study', '🔬', 'การศึกษา วิทยาศาสตร์ เทคโนโลยี'],
  ['media', '🎬', 'สื่อสาร ศิลปะ กีฬา งานอดิเรก'], ['society', '🏛️', 'สังคม การเมือง กฎหมาย'], ['time', '⏰', 'เวลา ตัวเลข ปริมาณ'],
  ['feelings', '💭', 'อารมณ์ ความคิด นิสัย'], ['actions', '🏃', 'คำกริยาทั่วไป'], ['describe', '🎨', 'คำบรรยายลักษณะ'],
  ['grammar', '🔗', 'คำไวยากรณ์ (the, of, and…)'],
];
const TOPIC_LABEL = Object.fromEntries(TOPICS.map(([id, ic, th]) => [id, `${ic} ${th}`]));
const W = window.WORDS.map(([w, p, l, i, t, e, et, s], idx) => {
  const tc = (window.TOPIC_CODES || '').charCodeAt(idx) - 97;
  return { idx, w, p, l, i, t, e, et, g: s === 5 ? (l === 'B2' ? 'B2x' : 'C1') : l, tp: TOPICS[tc] ? TOPICS[tc][0] : '' };
});
const inTopic = (w) => !S.settings.topic || w.tp === S.settings.topic;
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
  settings: { levels: ['A1'], topic: '', newPerDay: 20, autoSpeak: true, rate: 0.9, accent: 'en-US', front: 'en', order: 'shuffle', sfx: true, start: 'home', rFont: 1, voice: '', theme: 'auto' },
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
  chist: {},           // 'YYYY-MM-DD' -> flashcards graded that day (hist minus this = game/feed answers)
  snap: {},            // 'YYYY-MM-DD' -> [learned 3000, mastered 3000, learned all, mastered all]
  chistFrom: '',       // first day chist was recorded; earlier hist can't be split into cards/games
  note: {},            // word -> the user's own memory hook
  miss: {},            // 'YYYY-MM-DD' -> { word: times wrong that day } (last 21 days)
  weekSeen: '',        // Monday key of the last weekly summary the user dismissed
  monthSeen: '',       // 'YYYY-MM' of the month whose summary card was dismissed
  read: {},            // story id -> date finished
  readScore: {},       // story id -> [best right answers, questions]
  placedAt: '',        // date the placement test was taken/dismissed
  xpWeek: {},          // Monday key -> XP earned that week (friends leaderboard)
  nick: '',            // name shown on the friends leaderboard
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
  if (typeof takeSnap === 'function') takeSnap();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  if (typeof schedulePush === 'function') schedulePush();
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
  && Date.now() - (S.backupAt || 0) > BACKUP_EVERY * DAY && S.backupSnooze !== today()
  && !(typeof syncOn === 'function' && syncOn() && auth); // signed-in cloud sync is the backup

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
  if ((d.weekSeen || '') > (S.weekSeen || '')) S.weekSeen = d.weekSeen;
  if ((d.monthSeen || '') > (S.monthSeen || '')) S.monthSeen = d.monthSeen;
  S.xp = Math.max(S.xp || 0, d.xp || 0);
  if (d.chistFrom && (!S.chistFrom || d.chistFrom < S.chistFrom)) S.chistFrom = d.chistFrom;
  for (const [k, v] of Object.entries(d.note || {})) if (!S.note[k]) S.note[k] = v;
  for (const [k, v] of Object.entries(d.miss || {})) S.miss[k] = { ...v, ...(S.miss[k] || {}) };
  if (d.placedAt && !S.placedAt) S.placedAt = d.placedAt;
  for (const [k, v] of Object.entries(d.xpWeek || {})) S.xpWeek[k] = Math.max(S.xpWeek[k] || 0, v);
  if (d.nick && !S.nick) S.nick = d.nick;
  for (const [k, v] of Object.entries(d.read || {})) if (!S.read[k]) S.read[k] = v;
  for (const [k, v] of Object.entries(d.readScore || {})) if (!S.readScore[k] || v[0] > S.readScore[k][0]) S.readScore[k] = v;
  for (const [k, v] of Object.entries(d.chist || {})) S.chist[k] = Math.max(S.chist[k] || 0, v);
  for (const [k, v] of Object.entries(d.snap || {})) S.snap[k] = (S.snap[k] || [0, 0, 0, 0]).map((x, i) => Math.max(x, v[i] || 0));
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
  if (typeof mondayKey === 'function') { const k = mondayKey(); S.xpWeek[k] = (S.xpWeek[k] || 0) + n; }
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
function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; if (typeof fillVoices === 'function') fillVoices(); }
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
// English voices for the settings picker: Premium/Enhanced (downloaded Siri-quality) voices first.
const voiceRank = (v) => (/premium/i.test(v.name) ? 0 : /enhanced|siri/i.test(v.name) ? 1 : 2);
const FLAG = { 'en-US': '🇺🇸', 'en-GB': '🇬🇧', 'en-AU': '🇦🇺', 'en-IE': '🇮🇪', 'en-IN': '🇮🇳', 'en-ZA': '🇿🇦', 'en-NZ': '🇳🇿', 'en-SG': '🇸🇬' };
function englishVoices() {
  return voices.filter((v) => /^en[-_]/i.test(v.lang)).map((v) => ({ v, lang: v.lang.replace('_', '-') }))
    .sort((a, b) => voiceRank(a.v) - voiceRank(b.v) || a.lang.localeCompare(b.lang) || a.v.name.localeCompare(b.v.name));
}
function fillVoices() {
  const sel = document.getElementById('voice'); if (!sel) return;
  const list = englishVoices();
  sel.innerHTML = `<option value="">✨ อัตโนมัติ (ตามสำเนียง)</option>` + list.map(({ v, lang }) =>
    `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.settings.voice ? 'selected' : ''}>${FLAG[lang] || '🌐'} ${esc(v.name)}${voiceRank(v) < 2 ? ' ⭐' : ''}</option>`).join('');
  const n = document.getElementById('voiceN'); if (n) n.textContent = list.length ? `มี ${list.length} เสียง · ⭐ = เสียงคุณภาพสูง` : 'ยังโหลดรายชื่อเสียงไม่ได้ ลองเปิดหน้านี้ใหม่';
}
// Theme: 'auto' follows the system; 'light'/'dark' override it (also mirrored to o3k.theme for the early script in index.html).
function applyTheme() {
  const t = S.settings.theme || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('o3k.theme', t); } catch (e) { /* ignore */ }
}
applyTheme();
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = S.settings.accent;
  u.lang = lang; u.rate = S.settings.rate;
  const chosen = S.settings.voice && voices.find((x) => x.voiceURI === S.settings.voice);
  if (chosen) { try { u.voice = chosen; u.lang = chosen.lang; } catch (e) { /* voice went away */ } speechSynthesis.speak(u); return u; }
  const v = voices.find((v) => v.lang === lang && /Samantha|Daniel|Karen|Ava|Siri/i.test(v.name)) || voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  return u;
}

/* ---------- spaced repetition ---------- */
// Adaptive intervals (SM-2 style): each word keeps its own interval `i` (days) and ease `e`.
// `b` (box) is derived from `i` so "จำได้แล้ว" (b >= MASTERED, i.e. i >= 16 days) works as before.
// Words saved before 1.10.0 have no i/e and start from INTERVALS[b] with the default ease.
// grade: 0 again, 1 hard, 2 good, 3 easy
const EASE0 = 2.5, EASE_MIN = 1.3, EASE_MAX = 2.8, MAX_IVL = 365;
const boxOf = (i) => { let b = 0; while (b + 1 < INTERVALS.length && INTERVALS[b + 1] <= i) b++; return b; };
const ivlOf = (p) => (p ? (p.i != null ? p.i : INTERVALS[p.b]) : 0);
function sched(p, g) {
  const i0 = ivlOf(p), e0 = p && p.e ? p.e : EASE0;
  // Remembered after a long gap: credit part of the extra time.
  const late = p && p.d ? Math.max(0, (Date.now() - p.d) / DAY) : 0;
  const base = i0 + Math.min(late, i0);
  let i, e = e0;
  if (g === 0) { i = 0; e = Math.max(EASE_MIN, e0 - 0.2); }
  else if (g === 1) { i = i0 ? Math.max(1, Math.round(i0 * 1.2)) : 1; e = Math.max(EASE_MIN, e0 - 0.15); }
  else if (g === 2) i = i0 ? Math.max(i0 + 1, Math.round(base * e0)) : 1;
  else { i = i0 ? Math.max(i0 + 2, Math.round(base * e0 * 1.3)) : 3; e = Math.min(EASE_MAX, e0 + 0.15); }
  i = Math.min(MAX_IVL, i);
  return { i, e: Math.round(e * 100) / 100, b: boxOf(i) };
}
const dueAt = (i) => (i === 0 ? Date.now() : Date.now() + i * DAY - 3600000);
function daysLabel(i) {
  if (i === 0) return '< 1 นาที';
  if (i < 30) return i + ' วัน';
  if (i < 365) return Math.round(i / 30) + ' เดือน';
  return '1 ปี';
}
// Leeches ("คำดื้อ"): forgotten again and again.
const LEECH = 4;
const isLeech = (w) => !!(S.prog[w.w] && (S.prog[w.w].x || 0) >= LEECH);
function logMiss(w) {
  const t = today();
  (S.miss[t] = S.miss[t] || {})[w.w] = (S.miss[t][w.w] || 0) + 1;
  for (const k of Object.keys(S.miss)) if (dayDiff(t, k) > 21) delete S.miss[k];
}
function grade(w, g) {
  markActive();
  const p = S.prog[w.w];
  if (!p) {
    S.daily.fresh++;
    if (S.daily.fresh === S.settings.newPerDay) setTimeout(() => { confetti(); toast('🎯 ครบเป้าคำใหม่วันนี้แล้ว เก่งมาก!'); }, 300);
  } else S.daily.reviews++;
  const n = sched(p, g);
  S.prog[w.w] = {
    b: n.b, i: n.i, e: n.e,
    d: dueAt(n.i),
    s: (p ? p.s : 0) + 1,
    c: (p ? p.c : 0) + (g > 0 ? 1 : 0),
    x: (p ? p.x || 0 : 0) + (g === 0 ? 1 : 0),
  };
  if (g === 0) {
    logMiss(w);
    if (S.prog[w.w].x === LEECH && !S.note[w.w]) setTimeout(() => toast(`🐢 "${w.w}" ลืมบ่อยแล้ว ลองเขียนวิธีจำดูนะ`), 600);
  }
  addXP(g === 0 ? 1 : 2);
  S.chist[today()] = (S.chist[today()] || 0) + 1;
  questEvent('card');
}
// Lighter update from games: a right answer seeds/advances a little, a wrong one sends it back for review.
function gameResult(w, ok) {
  markActive();
  const p = S.prog[w.w];
  if (ok) {
    if (!p) S.prog[w.w] = { b: 1, i: 1, e: EASE0, d: dueAt(1), s: 1, c: 1, x: 0 };
    else { p.c++; p.s++; }
  } else {
    S.prog[w.w] = { ...(p || {}), b: 0, i: 0, e: Math.max(EASE_MIN, ((p && p.e) || EASE0) - 0.2), d: Date.now(), s: (p ? p.s : 0) + 1, c: p ? p.c : 0, x: (p ? p.x || 0 : 0) + 1 };
    logMiss(w);
  }
  save();
}

// "I already know this": jump straight to a long interval so it stops appearing as new.
function markKnown(w) {
  markActive();
  S.prog[w.w] = { b: MASTERED, i: INTERVALS[MASTERED], e: EASE0 + 0.2, d: dueAt(INTERVALS[MASTERED]), s: 1, c: 1, x: 0 };
  save();
}
function markForReview(w) {
  const p = S.prog[w.w];
  S.prog[w.w] = { ...(p || {}), b: 0, i: 0, d: Date.now(), s: p ? p.s : 0, c: p ? p.c : 0, x: p ? p.x || 0 : 0 };
  save();
}

/* ---------- router ---------- */
let current = 'home';
let cleanup = null;
const TITLES = { home: 'ศัพท์ต้องรู้', cards: 'แฟลชการ์ด', games: 'เกมฝึกศัพท์', list: 'คำศัพท์', settings: 'ตั้งค่า', guide: 'คู่มือการใช้งาน', feed: 'ไถศัพท์', stats: 'สถิติ', login: 'เข้าสู่ระบบ', read: 'อ่านเรื่องสั้น', placement: 'วัดระดับ' };
function go(tab, ...args) {
  if (typeof mustLogin === 'function' && mustLogin() && tab !== 'login') return go('login', true);
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  current = tab;
  view.classList.remove('feed-mode');
  view.dataset.route = tab; // CSS uses this for wide (iPad/landscape) layouts
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#title').textContent = TITLES[tab] || 'ศัพท์ต้องรู้';
  view.scrollTop = 0;
  ({ home: renderHome, cards: renderCards, games: renderGames, list: renderList, settings: renderSettings, guide: renderGuide, feed: renderFeed, stats: renderStats, login: renderLogin, read: renderRead, placement: renderPlacement }[tab])(...args);
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
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

  const lastBackup = S.backupAt ? Math.floor((Date.now() - S.backupAt) / DAY) : null;
  view.innerHTML = `
    ${needsBackup() ? `<div class="card-box backup-nag">
      <div><b>💾 ถึงเวลาสำรองข้อมูลแล้ว</b><div class="small muted">${lastBackup === null ? 'ยังไม่เคยสำรองเลย' : `สำรองล่าสุด ${lastBackup} วันก่อน`} · กันความคืบหน้าหายตอนลบแอปหรือเปลี่ยนเครื่อง</div></div>
      <div class="row" style="margin-top:10px"><button class="btn primary grow" id="bkNow">📤 สำรองเลย</button><button class="btn" id="bkLater">ไว้ทีหลัง</button></div>
    </div>` : ''}
    ${!S.placedAt && Object.keys(S.prog).length < 50 ? `<div class="card-box place-card" id="placeCard">
      <b>🎯 รู้ศัพท์อยู่แล้วบ้างไหม?</b><div class="small muted" style="margin-top:4px">ทำแบบทดสอบวัดระดับ 3–5 นาที แล้วข้ามคำที่รู้แล้ว ไม่ต้องเรียน cat, house ทีละใบ</div>
      <div class="row" style="margin-top:10px"><button class="btn primary grow" data-pl="go">วัดระดับ</button><button class="btn" data-pl="no">ไม่ต้อง</button></div></div>` : ''}
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
      📲 <b>ติดตั้งเป็นแอปบน iPhone/iPad:</b> เปิดหน้านี้ใน Safari → กดปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศร) → <b>เพิ่มไปยังหน้าจอโฮม</b> จะได้ใช้งานเต็มจอและออฟไลน์ได้</div>`}

    <div class="quick">
      <button class="quick-btn feed-btn" id="qFeed"><span>📱</span><b>ไถศัพท์</b><small>ปัดขึ้นเรื่อยๆ เหมือนไถฟีด</small></button>
      <button class="quick-btn" id="qPlay"><span>⚡</span><b>เล่นด่วน</b><small>เกมสุ่ม 10 ข้อ ~1 นาที</small></button>
    </div>

    ${new Date().getDate() <= 7 && S.monthSeen !== monthKey() && monthStats(1).total ? `<div class="card-box week-card" id="monthCard"><b>📅 สรุปเดือน${monthName(monthKey(1))}</b>${monthBox(1, true)}</div>` : ''}
    ${S.weekSeen !== mondayKey() && weekStats(1).total ? `<div class="card-box week-card" id="weekCard"><b>📊 สรุปสัปดาห์ที่แล้ว</b>${weekBox(1, true)}</div>` : ''}
    ${questCard()}

    <button class="card-box prog-card" id="statsBtn">
      <div class="row" style="justify-content:space-between"><b>📈 ความคืบหน้า</b><span class="small muted">ดูสถิติ ›</span></div>
      ${[['ชุด 3000 คำ', in3000().size, (w) => in3000().has(w.w)], ['ครบ 5000 คำ', W.length, () => true]].map(([name, n, f]) => {
        const l = W.filter((w) => f(w) && S.prog[w.w]).length, m = W.filter((w) => f(w) && status(w) === 'mastered').length;
        return `<div class="small" style="margin-top:10px">${name} <span class="muted">· จำได้ ${m.toLocaleString()} · เรียนแล้ว ${l.toLocaleString()} / ${n.toLocaleString()}</span></div>
          <div class="bar" style="margin-top:4px"><div class="l" style="width:${l / n * 100}%"></div><div class="m" style="width:${m / n * 100}%"></div></div>`;
      }).join('')}
      <div class="small muted" style="margin-top:10px">⭐ Lv.${levelOf(S.xp)} · 🏅 ${ACH.filter((x) => S.ach[x.id]).length}/${ACH.length} เหรียญ · 🟣 เรียนแล้ว 🟢 จำได้แล้ว</div>
    </button>

    <button class="card-box guide-link" id="guideBtn"><span>📘</span><div class="grow"><b>คู่มือการใช้งาน & ทริก</b><div class="small muted">ลืมว่าใช้ยังไง หรืออยากจำศัพท์ให้ได้เร็วขึ้น อ่านตรงนี้</div></div><span class="muted">›</span></button>
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#startBtn').onclick = () => go('cards', !todo);
  $('#guideBtn').onclick = () => go('guide', 'home');
  $('#qFeed').onclick = () => go('feed');
  $('#statsBtn').onclick = () => go('stats', 'home');
  $('#qPlay').onclick = quickPlay;
  const mc = $('#monthCard');
  if (mc) mc.onclick = (e) => { if (e.target.closest('[data-mo]')) { S.monthSeen = monthKey(); save(); mc.remove(); } };
  const wc = $('#weekCard');
  if (wc) wc.onclick = (e) => {
    const b = e.target.closest('[data-wk]'); if (!b) return;
    S.weekSeen = mondayKey(); save();
    if (b.dataset.wk === 'drill') drillWeek(1); else wc.remove();
  };
  if ($('#bkNow')) {
    $('#bkNow').onclick = async () => { await exportBackup(); renderHome(); };
    $('#bkLater').onclick = () => { S.backupSnooze = today(); save(); renderHome(); };
  }
  const qg = $('#questGo');
  if (qg) qg.onclick = () => { const q = todayQuest(); if (q.game) startGame(q.game); else go('cards'); };
  const pc = $('#placeCard');
  if (pc) pc.onclick = (e) => {
    const b = e.target.closest('[data-pl]'); if (!b) return;
    if (b.dataset.pl === 'go') go('placement'); else { S.placedAt = today(); save(); pc.remove(); }
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
  let fresh = p.filter((w) => !S.prog[w.w] && inTopic(w));
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
    if (re && g > 1) return daysLabel(g === 3 ? 3 : 1);
    return daysLabel(sched(p, g).i);
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
    const backExtra = noteBox(card) + exampleBox(card) + `<a class="link" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูความหมายเพิ่มใน Oxford Learner's Dictionaries ↗</a>`;
    $('#stage').innerHTML = `
      <div class="fc" id="fc">
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div>
        <div class="fc-inner">
          <div class="face front">${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}${isLeech(card) ? '🐢 คำดื้อ · ' : ''}แตะเพื่อพลิก · ปัดซ้าย/ขวา</div></div>
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
      const i = g === 3 ? 3 : 1;
      S.prog[card.w] = { ...S.prog[card.w], b: boxOf(i), i, d: dueAt(i), s: S.prog[card.w].s + 1, c: S.prog[card.w].c + 1 };
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
      if (e.target.closest('[data-note]')) {
        e.stopPropagation();
        editNote(card, () => { const nb = fc.querySelector('[data-note]'); if (nb) nb.outerHTML = noteBox(card); });
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
// Sentence version: enough of the sentence's words were heard (in any order).
function sentenceMatch(heard, sentence) {
  const want = normSpoken(sentence).split(' ').filter(Boolean);
  const got = new Set(normSpoken(heard).split(' '));
  return want.length > 0 && want.filter((x) => got.has(x)).length / want.length >= 0.7;
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
  dict: { icon: '✍️', name: 'ฟังประโยคแล้วเขียน', desc: 'ฟังประโยค พิมพ์คำที่หายไป' },
  speakS: { icon: '🗣️', name: 'พูดทั้งประโยค', desc: 'อ่านประโยคตัวอย่างออกเสียง' },
  order: { icon: '🔀', name: 'เรียงประโยค', desc: 'แตะคำเรียงให้เป็นประโยคตัวอย่าง' },
  colloc: { icon: '🔗', name: 'คำคู่กัน', desc: 'เลือกคำที่ใช้คู่กัน เช่น ___ a decision' },
  sCloze: { icon: '📖', name: 'เติมคำจากเรื่อง', desc: 'ประโยคจากเรื่องสั้นที่อ่านแล้ว' },
  sOrder: { icon: '🧱', name: 'เรียงประโยคจากเรื่อง', desc: 'ต่อประโยคจากเรื่องที่อ่านแล้ว' },
  review: { icon: '🔁', name: 'คำที่ผิดบ่อย', desc: 'ฝึกคำที่เคยตอบผิด' },
};
// Games whose data is lazy-loaded (stories / collocations) or built from sentences instead of the word pool.
const STORY_GAMES = ['sCloze', 'sOrder'];
function gameTile(id) {
  const g = GAMES[id];
  const best = S.best[id] != null ? `<span>🏅 สถิติ: ${S.best[id]}</span>` : '';
  return `<button class="game-tile" data-game="${id}"><div class="gi">${g.icon}</div><b>${g.name}</b><span>${g.desc}</span>${best}</button>`;
}
let gameSource = 'level';
let gameTopic = 'food';
let customWords = [];   // words for a one-off round, e.g. from the weekly summary
function renderGames() {
  if (gameSource === 'custom') gameSource = 'level';
  view.innerHTML = `
    <div class="card-box">
      <div class="small muted" style="margin-bottom:8px">ใช้คำศัพท์จาก</div>
      <div class="chips" id="src">
        <button class="chip" data-s="level">ระดับที่เลือก (${lvNames(S.settings.levels)})</button>
        <button class="chip" data-s="learned">คำที่เรียนแล้ว</button>
        <button class="chip" data-s="all">ทุกระดับ</button>
        <button class="chip" data-s="mastered">🟢 คำที่จำได้แล้ว (${masteredWords().length})</button>
        <button class="chip" data-s="star">⭐ คำติดดาว (${Object.keys(S.star).length})</button>
        <button class="chip" data-s="leech">🐢 คำดื้อ (${W.filter(isLeech).length})</button>
        <button class="chip" data-s="topic">📂 ตามหมวด</button>
      </div>
      ${gameSource === 'topic' ? `<select class="sel block-sel" id="gTopic" style="margin-top:10px">${TOPICS.map(([id]) => `<option value="${id}" ${gameTopic === id ? 'selected' : ''}>${TOPIC_LABEL[id]} (${W.filter((w) => w.tp === id).length})</option>`).join('')}</select>` : ''}
      ${gameSource === 'mastered' ? '<div class="small muted" style="margin-top:8px">เช็คว่ายังจำได้จริงไหม คำที่ตอบผิดจะกลับไปอยู่ในแฟลชการ์ดให้ทบทวนอีกครั้ง</div>' : ''}
    </div>
    <button class="card-box guide-link" id="toRead"><span>📖</span><div class="grow"><b>อ่านเรื่องสั้น</b><div class="small muted">${STORY_COUNT} เรื่อง · อ่านแล้ว ${Object.keys(S.read).length} · แตะคำเพื่อดูความหมาย</div></div><span class="muted">›</span></button>
    <div class="game-grid">${Object.keys(GAMES).map(gameTile).join('')}</div>`;
  $('#toRead').onclick = () => go('read');
  const paint = () => view.querySelectorAll('#src .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === gameSource));
  paint();
  if ($('#gTopic')) $('#gTopic').onchange = (e) => { gameTopic = e.target.value; };
  $('#src').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { gameSource = c.dataset.s; renderGames(); } };
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
}

const masteredWords = () => W.filter((w) => S.prog[w.w] && S.prog[w.w].b >= MASTERED);

// Sentences from the stories the user has finished: one item per sentence, carried by a list word in it.
function storyItems(id) {
  if (!STORIES) return [];
  const out = [];
  STORIES.filter((st) => S.read[st.id]).forEach((st) => {
    const toks = st.en.join(' ').match(/[A-Za-z][A-Za-z’']*/g) || [];
    const pool = [...new Set(toks.filter((t) => t.length >= 3 && lookupWord(t)))];
    st.en.forEach((para) => (para.match(/[^.!?]+[.!?]+["')]?/g) || []).forEach((raw) => {
      const sent = raw.trim(), words = sent.split(/\s+/);
      if (words.length < 5 || words.length > (id === 'sOrder' ? 12 : 22) || /["“”]/.test(sent) && id === 'sOrder') return;
      const cands = (sent.match(/[A-Za-z][A-Za-z’']*/g) || []).filter((t) => t.length >= 4).map((t) => ({ t, w: lookupWord(t) })).filter((x) => x.w);
      if (!cands.length) return;
      const best = cands.sort((a, b) => LEVELS.indexOf(b.w.g) - LEVELS.indexOf(a.w.g) || b.t.length - a.t.length)[0];
      const others = shuffle(pool.filter((t) => { const w = lookupWord(t); return w && w !== best.w && t.toLowerCase() !== best.t.toLowerCase(); })).slice(0, 3);
      if (id === 'sCloze' && others.length < 3) return;
      out.push({ ...best.w, _s: sent, _tok: best.t, _opts: others, _st: st.title });
    }));
  });
  return out;
}
function gamePool(id) {
  if (STORY_GAMES.includes(id)) return storyItems(id);
  if (id === 'review') {
    return W.filter((w) => S.prog[w.w] && (S.prog[w.w].x || 0) > 0)
      .sort((a, b) => (S.prog[b.w].x - S.prog[a.w].x) || (S.prog[a.w].b - S.prog[b.w].b)).slice(0, 40);
  }
  let list = gameSource === 'learned' ? W.filter((w) => S.prog[w.w])
    : gameSource === 'mastered' ? masteredWords()
    : gameSource === 'star' ? W.filter(isStar)
    : gameSource === 'leech' ? W.filter(isLeech)
    : gameSource === 'custom' ? customWords
    : gameSource === 'topic' ? W.filter((w) => w.tp === gameTopic)
    : gameSource === 'all' ? W : pool();
  if (id === 'cloze' || id === 'dict') list = list.filter(hasCloze);
  if (id === 'order') list = list.filter((w) => { const n = w.e.split(/\s+/).length; return n >= 4 && n <= 12; });
  if (id === 'colloc') list = list.filter((w) => COLLOC && COLLOC[w.w]);
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
  if ((id === 'speak' || id === 'speakS') && !canListen) {
    toast('เบราว์เซอร์นี้ยังไม่รองรับการฟังเสียงพูด ลองเปิดใน Safari ดูนะ');
    if (current !== 'games') go('games');
    return;
  }
  if (STORY_GAMES.includes(id) && !STORIES) { loadStories().then(() => startGame(id)); return; }
  if (id === 'colloc' && !COLLOC) { loadColloc().then(() => startGame(id)); return; }
  if (STORY_GAMES.includes(id) && !Object.keys(S.read).length) { toast('อ่านเรื่องสั้นให้จบอย่างน้อย 1 เรื่องก่อนนะ 📖'); if (current !== 'games') go('games'); return; }
  const src = gamePool(id);
  const min = id === 'match' ? 6 : 4;
  if (src.length < min) {
    toast(id === 'review' ? 'ยังไม่มีคำที่ตอบผิด เก่งมาก! 👍'
      : gameSource === 'mastered' ? `ต้องมีคำที่จำได้แล้วอย่างน้อย ${min} คำก่อนนะ`
      : gameSource === 'star' ? `ติดดาวคำอย่างน้อย ${min} คำก่อนนะ (กด ☆ บนการ์ดหรือในหน้าคำศัพท์)`
      : gameSource === 'leech' ? `ยังมีคำดื้อไม่ถึง ${min} คำ เก่งมาก! 🐢`
      : 'คำศัพท์ยังน้อยไป ลองเลือก "ระดับที่เลือก" ก่อนนะ');
    if (current !== 'games') go('games');
    return;
  }
  if (cleanup) { cleanup(); cleanup = null; }
  // Games can start from home/stats too: switch the route so the layout (and active tab) match.
  current = 'games'; view.classList.remove('feed-mode'); view.dataset.route = 'games'; view.scrollTop = 0;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'games'));
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
    if (m === 'speakS') return qSpeak(w, true);
    if (m === 'dict') return qDict(w);
    if (m === 'order') return qOrder(w, w.e, w.et);
    if (m === 'sOrder') return qOrder(w, w._s, '', w._st);
    if (m === 'sCloze') return qSCloze(w);
    if (m === 'colloc') return qColloc(w);
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

  function qSpeak(w, sentence) {
    const target = sentence ? w.e : w.w;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        ${sentence ? `<div class="cloze">${hlExample(w)}</div><div class="thx" style="margin-top:6px">${esc(w.et)}</div>`
          : `<div class="word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="muted" style="margin-top:6px">${esc(w.t)}</div>`}
        <button class="hint-btn" data-say>🔊 ฟังตัวอย่าง</button></div>
      <div class="center"><button class="mic" id="mic" aria-label="กดแล้วพูด">🎤</button></div>
      <div class="center small muted" id="heard">แตะไมค์แล้วพูด${sentence ? 'ทั้งประโยค' : 'คำนี้'}</div>
      <button class="btn block" id="skip" style="margin-top:12px">ข้าม / เฉลย</button>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    view.querySelector('[data-say]').onclick = () => speak(target);
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
      if (!ok) speak(target);
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
        if (alts.some((a) => (sentence ? sentenceMatch(a, w.e) : spokenMatch(a, w.w)))) return done(true);
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
    speak(target);
  }

  // Dictation: hear the example sentence, type the missing word.
  function qDict(w) {
    const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <button class="speak" data-say style="width:76px;height:76px;font-size:34px;margin:0">🔊</button>
        <div class="cloze" style="margin-top:12px">${esc(blank).replace('\u0000', '<span class="blank" id="hint">_____</span>')}</div>
        <button class="hint-btn" id="dHint">💡 ดูคำแปลประโยค</button><div class="thx" id="dTh" hidden>${esc(w.et)}</div></div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำที่ได้ยิน">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    view.querySelector('[data-say]').onclick = () => speak(w.e);
    $('#dHint').onclick = () => { $('#dTh').hidden = false; $('#dHint').remove(); };
    const inp = $('#si');
    let tries = 0, answered = false;
    const norm = (x) => x.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const answerWord = (w.e.match(clozeRe(w)) || ['', '', w.w])[0].replace(/^[^A-Za-z]/, '');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = answerWord; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ คำตอบคือ <b>${esc(answerWord)}</b> (${esc(w.t)})`)
        + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      const sayEx = view.querySelector('[data-sayex]'); if (sayEx) sayEx.onclick = () => speak(w.e);
      $('#nextQ').onclick = next;
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      if (norm(inp.value) === norm(answerWord) || norm(inp.value) === norm(w.w)) return done(tries === 0);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false);
      $('#reveal').textContent = 'ยังไม่ถูก ฟังอีกครั้งนะ 💪';
      $('#hint').textContent = answerWord[0] + answerWord.slice(1).replace(/[a-zA-Z]/g, '_');
      speak(w.e);
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    setTimeout(() => speak(w.e), 200);
  }

  // Tap the shuffled words in order to rebuild the sentence (word examples or story sentences).
  function qOrder(w, sent, th, from) {
    const toks = sent.trim().split(/\s+/);
    let order = shuffle(toks.map((t, k) => k));
    for (let n = 0; n < 5 && order.every((x, k) => x === k); n++) order = shuffle(order);
    const picked = [];
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        ${th ? `<div class="ord-th">${esc(th)}</div>` : `<div class="small muted">จากเรื่อง <b>${esc(from)}</b></div>`}
        <button class="hint-btn" id="oSay">🔊 ฟังประโยค (ตัวช่วย)</button></div>
      <div class="ord-ans" id="oAns"><span class="muted small">แตะคำด้านล่างเรียงตามลำดับ</span></div>
      <div class="ord-pool" id="oPool">${order.map((k) => `<button class="ord-chip" data-k="${k}">${esc(toks[k])}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" id="oClear">↺ เริ่มใหม่</button><button class="btn grow" id="oGive">ไม่รู้ / เฉลย</button></div>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false, heard = false;
    $('#oSay').onclick = () => { heard = true; speak(sent); };
    const paint = () => {
      $('#oAns').innerHTML = picked.length ? picked.map((k, j) => `<button class="ord-chip on" data-j="${j}">${esc(toks[k])}</button>`).join('') : '<span class="muted small">แตะคำด้านล่างเรียงตามลำดับ</span>';
      view.querySelectorAll('#oPool .ord-chip').forEach((b) => (b.disabled = picked.includes(+b.dataset.k)));
    };
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      $('#oAns').classList.add(ok ? 'ok' : 'no');
      $('#oAns').innerHTML = `<span class="ord-full">${esc(sent)}</span>`;
      $('#oPool').innerHTML = '';
      $('#reveal').innerHTML = (ok ? '✅ ถูกต้อง!' : '❌ ประโยคที่ถูกคือด้านบน') + (th ? '' : ` <span class="small muted">· ${esc(w.w)} = ${esc(w.t)}</span>`)
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(sent);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 2200);
    };
    $('#oPool').onclick = (e) => {
      const b = e.target.closest('.ord-chip'); if (!b || answered || b.disabled) return;
      picked.push(+b.dataset.k); paint();
      if (picked.length === toks.length) done(picked.map((k) => toks[k]).join(' ') === toks.join(' ') && !heard);
    };
    $('#oAns').onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b || answered) return; picked.splice(+b.dataset.j, 1); paint(); };
    $('#oClear').onclick = () => { if (!answered) { picked.length = 0; paint(); } };
    $('#oGive').onclick = () => { if (!answered) done(false); };
  }

  // Story cloze: the hardest list word of a story sentence is blanked; options are other words from that story.
  function qSCloze(w) {
    const re = new RegExp(`\\b${w._tok.replace(/[’']/g, "[’']")}\\b`);
    const blank = w._s.replace(re, '\u0000');
    const opts = shuffle([w._tok, ...w._opts]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop"><div class="small muted">จากเรื่อง <b>${esc(w._st)}</b></div>
        <div class="cloze" style="margin-top:8px">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === w._tok;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === w._tok) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(w._tok)}</b> (${esc(w.w)} = ${esc(w.t)})
        <div class="example"><div class="en">${esc(w._s)}</div></div><button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(w._s);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 2200);
    };
  }

  // Collocations: "___ a decision" + Thai meaning → pick the headword.
  function qColloc(w) {
    const stem = w.w.length > 3 ? w.w.replace(/[ey]$/, '') : w.w;
    const re = new RegExp(`\\b${w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*|\\b${stem.replace(/[^a-z-]/gi, '')}\\w*`, 'i');
    const list = COLLOC[w.w].filter(([en]) => re.test(en));
    const [phrase, th] = pick(list.length ? list : COLLOC[w.w]);
    const hit = phrase.match(re);
    const shown = hit ? phrase.replace(hit[0], '\u0000') : phrase;
    const others = shuffle(Object.keys(COLLOC).filter((k) => k !== w.w && (!hit || !re.test(k)))).filter((k) => { const x = WORD_BY[k]; return x && x.p.split('/')[0] === w.p.split('/')[0]; }).slice(0, 3);
    while (others.length < 3) { const k = pick(Object.keys(COLLOC)); if (k !== w.w && !others.includes(k)) others.push(k); }
    const opts = shuffle([w.w, ...others]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="cloze">${esc(shown).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <div class="muted" style="margin-top:6px">${esc(th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === w.w;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === w.w) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(phrase)}</b> = ${esc(th)}
        <div class="small muted" style="margin-top:6px">คำคู่กันอื่นของ ${esc(w.w)}: ${COLLOC[w.w].filter((x) => x[0] !== phrase).map((x) => esc(x[0])).join(' · ') || '–'}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(phrase);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1600);
    };
  }

  function mark(w, ok) {
    // A missed pronunciation or word order doesn't mean the meaning was forgotten, so it doesn't reset the card.
    const spk = gameId === 'speak' || gameId === 'speakS';
    const soft = spk || gameId === 'order' || gameId === 'sOrder';
    if (soft && !ok) markActive(); else gameResult(w, ok);
    if (spk && ok) S.counts.speak = (S.counts.speak || 0) + 1;
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
      ${wrong.length ? `<div class="card-box wrong-list"><b>${gameId.startsWith('speak') ? 'คำที่ควรฝึกออกเสียง' : 'คำที่ควรทบทวน'}</b> <span class="small muted">${gameId.startsWith('speak') ? '(แตะคำเพื่อฟังเสียง)' : '(ใส่ในแฟลชการ์ดให้แล้ว)'} · กด ☆ เพื่อติดดาว</span>
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
      const fresh = shuffle(p.filter((w) => !S.prog[w.w] && !seen.has(w.w) && inTopic(w)))[0];
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
        <div class="f-th">${esc(w.t)}</div>${S.note[w.w] ? noteBox(w) : ''}${exampleBox(w)}
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
      + (ok ? '' : noteBox(w) + exampleBox(w) + '<div class="small muted" style="margin-top:8px">ใส่ในแฟลชการ์ดให้แล้ว · ปัดขึ้นเพื่อไปต่อ ↑</div>');
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
    const nb = e.target.closest('[data-note]');
    if (nb) return editNote(w, () => { nb.outerHTML = noteBox(w); });
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

/* ---------- reading (short stories) ---------- */
// stories.js: window.STORIES = [{ id, level, title, titleTh, en: [paragraphs], th: [paragraphs], q: [{ q, o: [3], a }] }]
// Loaded on first use (≈100 KB) so app start stays fast; the service worker still caches it offline.
let STORIES = window.STORIES || null;
const STORY_COUNT = 100;
function loadStories() {
  if (STORIES) return Promise.resolve(STORIES);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'stories.js?v=' + APP_VERSION;
    sc.onload = () => res((STORIES = window.STORIES || []));
    sc.onerror = () => res((STORIES = []));
    document.head.appendChild(sc);
  });
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
const RLEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const RLV_TH = { A1: 'ง่ายมาก', A2: 'ง่าย', B1: 'ปานกลาง', B2: 'ท้าทาย', C1: 'ขั้นสูง' };
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
  let showTh = false, playing = -1, token = 0;
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
    </div>
    <article class="card-box story" id="rText" style="--st-font:${font()}px">
      ${st.en.map((para, k) => `<div class="st-para" data-k="${k}"><p class="st-p">${storyHTML(para)}</p>
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
    const u = speak(st.en[k]);
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

/* ---------- word list ---------- */
let listFilter = { q: '', lv: 'all', st: 'all', tp: '' };
function renderList() {
  view.innerHTML = `
    <input class="search" id="q" type="search" placeholder="🔍 ค้นหาคำอังกฤษหรือคำแปลไทย" value="${esc(listFilter.q)}" autocapitalize="none" autocorrect="off">
    <div class="chips" id="lv" style="margin-bottom:8px">
      ${['all', ...LEVELS].map((l) => `<button class="chip" data-v="${l}">${l === 'all' ? 'ทุกระดับ' : LV_LABEL[l]}</button>`).join('')}
    </div>
    <div class="chips" id="st" style="margin-bottom:6px">
      ${[['all', 'ทั้งหมด'], ['new', 'ยังไม่เรียน'], ['learning', '🟡 กำลังเรียน'], ['mastered', '🟢 จำได้แล้ว'], ['star', '⭐ ติดดาว'], ['leech', '🐢 คำดื้อ'], ['note', '💡 มีวิธีจำ']].map(([v, t]) => `<button class="chip" data-v="${v}">${t}</button>`).join('')}
    </div>
    <select class="sel block-sel" id="tpSel"><option value="">📂 ทุกหมวด</option>${TOPICS.map(([id]) => `<option value="${id}" ${listFilter.tp === id ? 'selected' : ''}>${TOPIC_LABEL[id]}</option>`).join('')}</select>
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
      <span class="star-mark">${isLeech(w) ? '🐢' : ''}${isStar(w) ? '⭐' : ''}</span>${lvBadge(w.g)}</div>`).join(''));
    shown += chunk.length;
  };
  const apply = () => {
    const q = listFilter.q.trim().toLowerCase();
    items = W.filter((w) => (listFilter.lv === 'all' || w.g === listFilter.lv) && (!listFilter.tp || w.tp === listFilter.tp)
      && (listFilter.st === 'all' || (listFilter.st === 'star' ? isStar(w) : listFilter.st === 'leech' ? isLeech(w) : listFilter.st === 'note' ? !!S.note[w.w] : status(w) === listFilter.st))
      && (!q || w.w.toLowerCase().includes(q) || w.t.includes(q)));
    if (q) items.sort((a, b) => (b.w.toLowerCase().startsWith(q)) - (a.w.toLowerCase().startsWith(q)));
    rows.innerHTML = ''; shown = 0; more();
    if (!items.length) rows.innerHTML = '<p class="center muted">ไม่พบคำศัพท์</p>';
    $('#cnt').textContent = `${items.length} คำ · แตะคำเพื่อดูตัวอย่างประโยค`;
    paint();
  };
  $('#q').oninput = (e) => { listFilter.q = e.target.value; apply(); };
  $('#tpSel').onchange = (e) => { listFilter.tp = e.target.value; apply(); };
  $('#lv').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.lv = c.dataset.v; apply(); } };
  $('#st').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.st = c.dataset.v; apply(); } };
  rows.onclick = (e) => {
    const r = e.target.closest('.wrow'); if (!r) return;
    const w = W[+r.dataset.i];
    speak(w.w);
    openSheet(w, () => { r.querySelector('.dot').className = 'dot ' + status(w); r.querySelector('.star-mark').textContent = (isLeech(w) ? '🐢' : '') + (isStar(w) ? '⭐' : ''); });
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < items.length) more(); }, { root: view, rootMargin: '400px' });
  io.observe($('#sentinel'));
  cleanup = () => io.disconnect();
  apply();
}

/* ---------- memory notes ---------- */
// Card/sheet snippet: the user's own memory hook, or a prompt to write one for leeches.
function noteBox(w) {
  if (S.note[w.w]) return `<button class="note-box" data-note>💡 <b>วิธีจำของฉัน:</b> ${esc(S.note[w.w])} <span class="muted">✏️</span></button>`;
  return isLeech(w) ? '<button class="note-box empty" data-note>🐢 คำนี้ลืมบ่อย แตะเพื่อเขียนวิธีจำของตัวเอง</button>'
    : '<button class="note-add" data-note>✏️ เขียนวิธีจำ</button>';
}
function editNote(w, onDone) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="วิธีจำ ${esc(w.w)}">
      <div class="grab"></div>
      <div class="h2" style="margin:8px 0 4px">💡 วิธีจำ "${esc(w.w)}"</div>
      <div class="muted small">${esc(w.t)}</div>
      <textarea class="note-in" id="noteIn" maxlength="200" placeholder="เช่น เสียงคล้ายคำไทย, แต่งประโยคตลกๆ, นึกภาพ…">${esc(S.note[w.w] || '')}</textarea>
      <div class="small muted">ตัวอย่าง: abandon = "อะ-แบน-ดอน" ทิ้งรถไว้จนยางแบน 🚗</div>
      <div class="row" style="margin-top:12px">${S.note[w.w] ? '<button class="btn grow" data-act="del">ลบ</button>' : ''}<button class="btn primary grow" data-act="save">บันทึก</button></div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); if (onDone) onDone(); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    const act = e.target.closest('[data-act]'); if (!act) return;
    const v = $('#noteIn', el).value.trim();
    if (act.dataset.act === 'del' || !v) delete S.note[w.w]; else S.note[w.w] = v;
    save(); toast(S.note[w.w] ? 'บันทึกวิธีจำแล้ว 💡' : 'ลบวิธีจำแล้ว'); close();
  };
}

/* ---------- word detail sheet ---------- */
function openSheet(w, onChange) {
  const st = status(w);
  const stLabel = { new: 'ยังไม่เรียน', learning: '🟡 กำลังเรียน', mastered: '🟢 จำได้แล้ว' }[st] + (isLeech(w) ? ' · 🐢 คำดื้อ' : '');
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(w.w)}">
      <div class="grab"></div>
      <div class="row" style="justify-content:space-between">${lvBadge(w.g)}<span class="small muted">${stLabel}</span></div>
      <div class="sheet-word">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
      <div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span>${w.tp ? ` · ${TOPIC_LABEL[w.tp]}` : ''}</div>
      <div class="th" style="font-size:22px;margin:10px 0">${esc(w.t)}</div>
      ${noteBox(w)}${exampleBox(w)}<div class="colloc" id="colBox"></div>
      <button class="btn block" data-act="star" style="margin-top:14px">${isStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาวคำนี้'}</button>
      <div class="row" style="margin-top:10px">
        <button class="btn grow" data-act="review">🔁 ทบทวนวันนี้</button>
        <button class="btn grow" data-act="known">✓ รู้แล้ว</button>
      </div>
      <a class="link" style="display:block;text-align:center;margin-top:12px" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">ดูใน Oxford Learner's Dictionaries ↗</a>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  loadColloc().then((c) => {
    const box = el.querySelector('#colBox'), list = c[w.w];
    if (box && list) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🔗 คำที่มักใช้คู่กัน</b> (แตะเพื่อฟัง)</div>
      ${list.map(([en, th]) => `<button class="col-row" data-col="${esc(en)}"><b>${esc(en)}</b><span>${esc(th)}</span></button>`).join('')}`;
  });
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    const col = e.target.closest('[data-col]'); if (col) return speak(col.dataset.col);
    if (e.target.closest('[data-say]')) return speak(w.w);
    if (e.target.closest('[data-sayex]')) return speak(w.e);
    if (e.target.closest('[data-note]')) { close(); return editNote(w, onChange); }
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

// Weekly summary. Weeks run Monday–Sunday; `off` = 0 for this week, 1 for last week, …
function mondayKey(off = 0) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - off * 7);
  return d.toLocaleDateString('en-CA');
}
function weekStats(off) {
  const mon = mondayKey(off), days = [];
  for (let k = 0; k < 7; k++) { const d = new Date(Date.parse(mon + 'T12:00:00') + k * DAY).toLocaleDateString('en-CA'); if (d <= today()) days.push(d); }
  const end = days[days.length - 1];
  const snapAt = (key) => { const ks = Object.keys(S.snap).filter((k) => k <= key).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const before = new Date(Date.parse(mon + 'T12:00:00') - DAY).toLocaleDateString('en-CA');
  const a = snapAt(before) || (Object.keys(S.snap).sort()[0] >= mon ? [0, 0, 0, 0] : null), b = snapAt(end);
  const missed = {};
  days.forEach((d) => Object.entries(S.miss[d] || {}).forEach(([w, n]) => (missed[w] = (missed[w] || 0) + n)));
  const top = Object.entries(missed).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([w, n]) => ({ w: W.find((x) => x.w === w), n })).filter((x) => x.w);
  return {
    mon, days: days.length,
    active: days.filter((d) => S.hist[d]).length,
    total: days.reduce((t, d) => t + (S.hist[d] || 0), 0),
    learned: a && b ? b[2] - a[2] : null, mastered: a && b ? b[3] - a[3] : null,
    top,
  };
}
function weekBox(off, withActions) {
  const w = weekStats(off), prev = weekStats(off + 1);
  const diff = prev.total ? Math.round((w.total - prev.total) / prev.total * 100) : null;
  const range = `${thDate(Date.parse(w.mon + 'T12:00:00'))} – ${off ? thDate(Date.parse(w.mon + 'T12:00:00') + 6 * DAY) : 'วันนี้'}`;
  return `<div class="small muted">${range}</div>
    <div class="tiles" style="margin:10px 0 6px">
      <div class="tile-s"><b>${w.active}<small>/${w.days}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${w.total}</b><span>การ์ด+ข้อเกม</span></div>
      <div class="tile-s"><b>${w.learned == null ? '–' : '+' + w.learned}</b><span>คำใหม่</span></div>
      <div class="tile-s"><b>${w.mastered == null ? '–' : (w.mastered >= 0 ? '+' : '') + w.mastered}</b><span>จำได้เพิ่ม</span></div>
    </div>
    ${diff == null ? '' : `<div class="small">${diff >= 0 ? '📈' : '📉'} ทำ${diff >= 0 ? 'มากกว่า' : 'น้อยกว่า'}สัปดาห์ก่อน ${Math.abs(diff)}%</div>`}
    ${w.top.length ? `<div class="small" style="margin-top:8px"><b>คำที่ผิดบ่อย:</b> ${w.top.map((x) => `${esc(x.w.w)} <span class="muted">(${x.n})</span>`).join(', ')}</div>` : ''}
    ${withActions ? `<div class="row" style="margin-top:12px">${w.top.length >= 4 ? `<button class="btn primary grow" data-wk="drill" data-off="${off}">🎯 ฝึกคำที่ผิดบ่อย</button>` : ''}<button class="btn grow" data-wk="close">ปิด</button></div>` : ''}`;
}
// Monthly summary: same idea as the weekly one, per calendar month ('YYYY-MM').
const monthKey = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - off); return d.toLocaleDateString('en-CA').slice(0, 7); };
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const monthName = (key) => `${TH_MONTH[+key.slice(5) - 1]} ${+key.slice(0, 4) + 543}`;
function monthStats(off) {
  const key = monthKey(off), days = [];
  for (let d = new Date(key + '-01T12:00:00'); d.toLocaleDateString('en-CA').startsWith(key); d = new Date(d.getTime() + DAY)) {
    const k = d.toLocaleDateString('en-CA'); if (k <= today()) days.push(k);
  }
  const snapAt = (k) => { const ks = Object.keys(S.snap).filter((x) => x <= k).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const first = key + '-01', before = new Date(Date.parse(first + 'T12:00:00') - DAY).toLocaleDateString('en-CA');
  const a = snapAt(before) || (Object.keys(S.snap).sort()[0] >= first ? [0, 0, 0, 0] : null), b = days.length ? snapAt(days[days.length - 1]) : null;
  const best = days.reduce((m, d) => ((S.hist[d] || 0) > m.n ? { d, n: S.hist[d] } : m), { d: '', n: 0 });
  let streak = 0, run = 0;
  days.forEach((d) => { run = S.hist[d] ? run + 1 : 0; streak = Math.max(streak, run); });
  return {
    key, days: days.length,
    active: days.filter((d) => S.hist[d]).length,
    total: days.reduce((t, d) => t + (S.hist[d] || 0), 0),
    learned: a && b ? b[2] - a[2] : null, mastered: a && b ? b[3] - a[3] : null,
    stories: Object.values(S.read).filter((d) => String(d).startsWith(key)).length,
    best, streak,
  };
}
function monthBox(off, withClose) {
  const m = monthStats(off), prev = monthStats(off + 1);
  const diff = prev.total ? Math.round((m.total - prev.total) / prev.total * 100) : null;
  const vs = (x, y) => (x == null || y == null || !prev.total ? '' : `<em class="${x >= y ? 'up' : 'down'}">${x >= y ? '▲' : '▼'} ${Math.abs(x - y)}</em>`);
  return `<div class="small muted">${monthName(m.key)}${off ? '' : ' (ถึงวันนี้)'}</div>
    <div class="tiles mo-tiles" style="margin:10px 0 6px">
      <div class="tile-s"><b>${m.active}<small>/${m.days}</small></b><span>วันที่เล่น ${vs(m.active, prev.active)}</span></div>
      <div class="tile-s"><b>${m.total}</b><span>การ์ด+ข้อเกม</span></div>
      <div class="tile-s"><b>${m.learned == null ? '–' : '+' + m.learned}</b><span>คำใหม่ ${vs(m.learned, prev.learned)}</span></div>
      <div class="tile-s"><b>${m.mastered == null ? '–' : (m.mastered >= 0 ? '+' : '') + m.mastered}</b><span>จำได้เพิ่ม ${vs(m.mastered, prev.mastered)}</span></div>
      <div class="tile-s"><b>${m.stories}</b><span>เรื่องสั้นที่อ่าน</span></div>
      <div class="tile-s"><b>${m.streak}</b><span>ติดต่อกันนานสุด (วัน)</span></div>
    </div>
    ${m.best.n ? `<div class="small">🏅 วันที่ขยันที่สุด: ${thDate(Date.parse(m.best.d + 'T12:00:00'))} (${m.best.n} ข้อ)</div>` : ''}
    ${diff == null ? '' : `<div class="small">${diff >= 0 ? '📈' : '📉'} ทำ${diff >= 0 ? 'มากกว่า' : 'น้อยกว่า'}เดือนก่อน ${Math.abs(diff)}%</div>`}
    ${withClose ? '<button class="btn block" data-mo="close" style="margin-top:12px">ปิด</button>' : ''}`;
}
function drillWeek(off) {
  customWords = weekStats(off).top.map((x) => x.w);
  gameSource = 'custom';
  startGame(pick(['en2th', 'th2en', 'listen']));
}

/* ---------- placement test ---------- */
// Samples unseen words level by level (8 per level, multiple choice + "ไม่รู้"), stops after a level
// scores below 6/8, then offers to mark the unseen words of well-known levels as known. Those words
// get spread-out review dates, so any that weren't really known get caught at their first review.
const PT_N = 8, PT_PASS = 6;
function renderPlacement() {
  const levels = LEVELS.filter((l) => GROUP[l].some((w) => !S.prog[w.w]));
  const res = {};           // level -> correct count
  let li = 0, qi = 0, items = [];
  const start = () => {
    view.innerHTML = `<div class="card-box center pop" style="margin-top:10px">
      <div class="result-emoji">🎯</div><div class="h2">แบบทดสอบวัดระดับ</div>
      <p>ตอบคำแปลของคำที่สุ่มมาจากแต่ละระดับ ระดับละ ${PT_N} ข้อ ราว 3–5 นาที</p>
      <p class="small muted">ไม่รู้ให้กด "ไม่รู้" อย่าเดา ผลจะได้แม่น · ทดสอบเฉพาะคำที่ยังไม่เคยเรียน</p>
      <button class="btn primary block" id="ptGo">เริ่มเลย</button>
      <div style="height:10px"></div><button class="btn block" id="ptBack">ไว้ทีหลัง</button></div>`;
    $('#ptGo').onclick = () => level();
    $('#ptBack').onclick = () => go('home');
  };
  const level = () => {
    if (li >= levels.length) return result();
    const lv = levels[li];
    items = shuffle(GROUP[lv].filter((w) => !S.prog[w.w])).slice(0, PT_N);
    qi = 0; res[lv] = 0; q();
  };
  const q = () => {
    if (qi >= items.length) {
      const lv = levels[li];
      if (res[lv] / items.length < PT_PASS / PT_N) return result();
      li++; return level();
    }
    const w = items[qi], lv = levels[li];
    const opts = shuffle([w, ...distractors(w, 3, 't')]);
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="quit" aria-label="ออก">✕</button>
        <div class="progress"><div style="width:${(li * PT_N + qi) / (levels.length * PT_N) * 100}%"></div></div>
        <span class="small">${lvBadge(lv)}</span></div>
      <div class="card-box q-prompt pop"><div class="word">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(o.t)}</button>`).join('')}
        <button class="opt idk" data-i="-1">🤷 ไม่รู้</button></div>`;
    $('#quit').onclick = () => go('home');
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b) return;
      if (+b.dataset.i === w.idx) res[lv]++;
      qi++; q();
    };
  };
  const result = () => {
    // Levels answered at ≥ 6/8 count as known; the level where the test stopped is shown but not applied.
    const rows = Object.entries(res).map(([lv, c]) => {
      const n = GROUP[lv].filter((w) => !S.prog[w.w]).length;
      return { lv, c, pct: c / PT_N, n, on: c >= PT_PASS };
    });
    const est = rows.reduce((a, r) => a + Math.round(r.n * r.pct), 0);
    const paint = () => {
      const pick = rows.filter((r) => r.on), skip = pick.reduce((a, r) => a + r.n, 0);
      view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">📋</div>
          <div class="h2">ผลวัดระดับ</div><p>น่าจะรู้แล้วราว <b>${est.toLocaleString()}</b> คำจากคำที่ยังไม่เคยเรียน</p></div>
        <div class="card-box">${rows.map((r) => `<label class="pt-row"><input type="checkbox" data-lv="${r.lv}" ${r.on ? 'checked' : ''} ${r.c < PT_PASS - 1 ? 'disabled' : ''}>
            ${lvBadge(r.lv)}<span class="grow">ถูก ${r.c}/${PT_N}<div class="bar" style="margin-top:4px"><div class="m" style="width:${r.pct * 100}%"></div></div></span>
            <span class="small muted">${r.n} คำ</span></label>`).join('')}
          <p class="small muted" style="margin-bottom:0">ติ๊กระดับที่จะข้าม คำที่ข้ามจะถูกนับว่า "รู้แล้ว" และทยอยกลับมาให้ทบทวนใน 1–4 สัปดาห์ ถ้าจริงๆ ไม่รู้ ก็กด "ลืม" ตอนนั้นได้</p></div>
        ${skip ? `<button class="btn primary block" id="ptApply">ข้าม ${skip.toLocaleString()} คำ</button><div style="height:10px"></div>` : ''}
        <button class="btn block" id="ptDone">${skip ? 'ไม่ข้าม เรียนตามปกติ' : 'กลับหน้าแรก'}</button>`;
      view.querySelectorAll('[data-lv]').forEach((cb) => (cb.onchange = () => { rows.find((r) => r.lv === cb.dataset.lv).on = cb.checked; paint(); }));
      const ap = $('#ptApply');
      if (ap) ap.onclick = () => {
        const words = pick.flatMap((r) => GROUP[r.lv].filter((w) => !S.prog[w.w]));
        words.forEach((w) => {
          const i = INTERVALS[MASTERED];
          // Spread first reviews over 7–30 days so they don't all land on one day.
          S.prog[w.w] = { b: MASTERED, i, e: EASE0, d: Date.now() + (7 + Math.random() * 23) * DAY, s: 1, c: 1, x: 0 };
        });
        // If every level being studied was skipped, move on to the first level that wasn't.
        const skipped = pick.map((r) => r.lv);
        let moved = '';
        if (S.settings.levels.every((l) => skipped.includes(l))) {
          const nextLv = LEVELS.find((l) => !skipped.includes(l) && GROUP[l].some((w) => !S.prog[w.w]));
          if (nextLv) { S.settings.levels = [nextLv]; moved = ` · เปลี่ยนไปเรียนระดับ ${LV_LABEL[nextLv]}`; }
        }
        S.placedAt = today(); markActive(); save(); confetti();
        toast(`ข้าม ${words.length.toLocaleString()} คำแล้ว 🎉${moved}`);
        go('home');
      };
      $('#ptDone').onclick = () => { S.placedAt = S.placedAt || today(); save(); go('home'); };
    };
    paint();
  };
  start();
}

/* ---------- stats & projections ---------- */
// Function (not a const) so save() can call takeSnap() at any point during startup.
function in3000() { return in3000.set || (in3000.set = new Set(W.filter((w) => LEVELS_3000.includes(w.g)).map((w) => w.w))); }
// Daily snapshot of how many words are learned/mastered, for the trend chart.
function takeSnap() {
  let l3 = 0, m3 = 0, la = 0, ma = 0;
  for (const [w, p] of Object.entries(S.prog)) {
    const m = p.b >= MASTERED;
    la++; if (m) ma++;
    if (in3000().has(w)) { l3++; if (m) m3++; }
  }
  S.snap[today()] = [l3, m3, la, ma];
}
const dayKey = (k) => new Date(Date.now() - k * DAY).toLocaleDateString('en-CA'); // k days ago
const thDate = (ms) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
const durTxt = (d) => (d < 45 ? `${Math.round(d)} วัน` : d < 365 * 1.5 ? `${Math.round(d / 30)} เดือน` : `${(d / 365).toFixed(1)} ปี`);

// Habits over the last 28 days (or since the first day played, if sooner).
function habits() {
  const firstDay = Object.keys(S.hist).sort()[0];
  const since = firstDay ? dayDiff(today(), firstDay) + 1 : 0;
  const span = Math.max(1, Math.min(28, since));
  let active = 0, cards = 0, games = 0;
  for (let k = 0; k < span; k++) {
    const key = dayKey(k), all = S.hist[key] || 0, c = Math.min(all, S.chist[key] || 0);
    if (all) active++;
    cards += c; games += all - c;
  }
  const progs = Object.values(S.prog);
  const seen = progs.reduce((a, p) => a + (p.s || 0), 0), ok = progs.reduce((a, p) => a + (p.c || 0), 0);
  return { span, active, ratio: since ? active / span : 0, cards, games, acc: seen ? Math.min(1, ok / seen) : 0, since };
}

// Words newly learned per calendar day: measured from snapshots when there are ≥7 days of them,
// otherwise estimated from the daily goal × how often the user plays.
function learnRate(h) {
  const keys = Object.keys(S.snap).sort();
  const old = keys.find((k) => dayDiff(today(), k) <= 28);
  if (old && dayDiff(today(), old) >= 7) {
    const r = (S.snap[today()][2] - S.snap[old][2]) / dayDiff(today(), old);
    if (r > 0) return { rate: r, measured: true };
  }
  return { rate: S.settings.newPerDay * h.ratio, measured: false };
}

// Days until every word in a set is "จำได้แล้ว": time to meet the remaining words, plus the time the
// last ones need to climb boxes 1→4 (1+3+7 = 11 days if always remembered, longer with lapses and
// skipped days).
function etaDays(total, learned, rate, h) {
  if (learned >= total && rate <= 0) return 0;
  if (rate <= 0) return null;
  const lag = 11 / Math.max(0.5, h.acc || 0.8) / Math.max(0.2, h.ratio || 1);
  return (total - learned) / rate + lag;
}

function renderStats(from) {
  takeSnap();
  const h = habits();
  const { rate, measured } = learnRate(h);
  const snap = S.snap[today()];
  const W_ = Math.max(280, view.clientWidth - 68);
  const sets = [
    { name: 'ชุด 3000 คำ', total: in3000().size, l: snap[0], m: snap[1] },
    { name: 'ครบทั้ง 5000 คำ', total: W.length, l: snap[2], m: snap[3] },
  ];
  const etaCard = (st) => {
    const d = etaDays(st.total, st.l, rate, h);
    const pl = st.l / st.total * 100, pm = st.m / st.total * 100;
    const when = st.m >= st.total ? '🎉 จำได้ครบแล้ว!'
      : d == null ? 'เริ่มเล่นสักสองสามวัน แล้วแอปจะคาดการณ์ให้'
      : `คาดว่าจำได้ครบราว <b>${thDate(Date.now() + d * DAY)}</b> <span class="muted">(อีก ~${durTxt(d)})</span>`;
    return `<div class="card-box">
      <div class="row" style="justify-content:space-between"><b>${st.name}</b><span class="small muted">${st.total.toLocaleString()} คำ</span></div>
      <div class="bar eta-bar" style="margin:10px 0 6px"><div class="l" style="width:${pl}%"></div><div class="m" style="width:${pm}%"></div></div>
      <div class="small muted"><span class="key m"></span>จำได้แล้ว ${st.m.toLocaleString()} (${pm.toFixed(0)}%) &nbsp; <span class="key l"></span>เรียนแล้ว ${st.l.toLocaleString()} (${pl.toFixed(0)}%)</div>
      <div style="margin-top:10px">${when}</div></div>`;
  };
  const opts = [10, 20, 30, 50];
  if (!opts.includes(S.settings.newPerDay)) opts.push(S.settings.newPerDay), opts.sort((a, b) => a - b);
  const ratio = h.ratio || 1;
  const whatIf = opts.map((n) => {
    const r = n === S.settings.newPerDay && rate > 0 ? rate : n * ratio; // current setting: same rate as the cards above
    const e3 = etaDays(in3000().size, snap[0], r, { ...h, ratio }), e5 = etaDays(W.length, snap[2], r, { ...h, ratio });
    const cell = (e, m, t) => (m >= t ? '✓ ครบแล้ว' : `${durTxt(e)}`);
    return `<tr class="${n === S.settings.newPerDay ? 'cur' : ''}"><td>${n}${n === S.settings.newPerDay ? ' (ตอนนี้)' : ''}</td><td>${cell(e3, snap[1], in3000().size)}</td><td>${cell(e5, snap[3], W.length)}</td><td>~${n * 5}</td></tr>`;
  }).join('');

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

  view.innerHTML = `
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="sBack">‹ กลับ</button></div>
    ${levelCard()}
    <div class="h2">ความคืบหน้าแต่ละระดับ</div>
    <div class="card-box">${lvRows}
      <div class="small muted" style="margin-top:8px">🟣 เรียนแล้ว &nbsp; 🟢 จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div></div>
    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}</div>
    <div class="h2">นิสัยการเล่น <span class="small muted">${h.span} วันล่าสุด</span></div>
    <div class="tiles">
      <div class="tile-s"><b>${h.active}<small>/${h.span}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.cards / h.active) : 0}</b><span>แฟลชการ์ด/วัน</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.games / h.active) : 0}</b><span>ข้อเกม/วัน</span></div>
      <div class="tile-s"><b>${Math.round(h.acc * 100)}<small>%</small></b><span>ตอบถูก</span></div>
    </div>
    <div class="card-box"><div class="small muted" style="margin-bottom:6px">กิจกรรมต่อวัน (แตะแท่งเพื่อดูตัวเลข)</div>${activityChart(W_)}</div>

    ${boardSection()}
    <div class="h2">สรุปรายสัปดาห์</div>
    <div class="card-box"><b>สัปดาห์นี้</b>${weekBox(0)}</div>
    <div class="card-box"><b>สัปดาห์ที่แล้ว</b>${weekBox(1)}</div>
    <div class="h2">สรุปรายเดือน</div>
    <div class="card-box"><b>เดือนนี้</b>${monthBox(0)}</div>
    ${monthStats(1).total ? `<div class="card-box"><b>เดือนที่แล้ว</b>${monthBox(1)}</div>` : ''}

    <div class="h2">แนวโน้มคำศัพท์</div>
    <div class="card-box">${trendChart(W_)}</div>

    <div class="h2">คาดการณ์ว่าจะจำได้ครบเมื่อไร</div>
    ${rate > 0 ? `<p class="small muted" style="margin:-4px 4px 10px">คิดจากที่เรียนคำใหม่ได้ราว <b>${rate.toFixed(1)} คำ/วัน</b>${measured ? ' (วัดจากความคืบหน้าจริง)' : ` (ประมาณจากเป้า ${S.settings.newPerDay} คำ × เล่น ${h.active}/${h.span} วัน)`} และความแม่นยำ ${Math.round(h.acc * 100)}%</p>` : ''}
    ${sets.map(etaCard).join('')}

    <div class="h2">ถ้าปรับจำนวนคำใหม่ต่อวัน</div>
    <div class="card-box">
      <table class="g-table whatif"><tr><th>คำใหม่/วัน</th><th>ครบ 3000</th><th>ครบ 5000</th><th>ทบทวน/วัน</th></tr>${whatIf}</table>
      <div class="small muted" style="margin-top:8px">คิดจากความถี่ที่เล่นตอนนี้ (${h.active}/${h.span} วัน)${h.ratio < 1 && h.since ? ' ถ้าเล่นทุกวันจะเร็วขึ้นอีก' : ''} · การ์ดทบทวนต่อวันเป็นค่าประมาณเมื่อเรียนไปได้สักระยะ</div>
    </div>
    <p class="small muted center">เป็นการคาดการณ์คร่าวๆ จะแม่นขึ้นเรื่อยๆ เมื่อเล่นไปนานขึ้น</p>
    <div class="h2">🏅 เหรียญรางวัล <span class="small muted">${ACH.filter((a) => S.ach[a.id]).length}/${ACH.length}</span></div>
    <div class="card-box ach-grid" id="ach">${ACH.map((a) => `<button class="ach ${S.ach[a.id] ? 'on' : ''}" data-ach="${a.id}"><span>${a.icon}</span><small>${a.name}</small></button>`).join('')}</div>`;
  $('#sBack').onclick = () => go(from || 'home');
  $('#ach').onclick = (e) => {
    const b = e.target.closest('[data-ach]'); if (!b) return;
    const a = ACH.find((x) => x.id === b.dataset.ach);
    toast(`${a.icon} ${a.name}: ${a.desc}${S.ach[a.id] ? ' ✅' : ' 🔒'}`);
  };
  bindChartTips();
}

// Stacked bars: flashcards (bottom) + game/feed answers (top); days before 1.9.0 have no split.
function activityChart(Wd) {
  const H = 130, top = 8, bot = 22, n = 28, gap = 3;
  const bw = (Wd - gap * (n - 1)) / n;
  const days = Array.from({ length: n }, (_, i) => {
    const k = n - 1 - i, key = dayKey(k), all = S.hist[key] || 0;
    const known = key in S.chist || all === 0 || key >= S.chistFrom;
    const c = Math.min(all, S.chist[key] || 0);
    return { key, all, c: known ? c : 0, g: known ? all - c : 0, u: known ? 0 : all };
  });
  const max = Math.max(10, ...days.map((d) => d.all));
  const y = (v) => (H - bot - top) * v / max;
  const hasU = days.some((d) => d.u);
  const bars = days.map((d, i) => {
    const x = i * (bw + gap); let base = H - bot, out = '';
    const seg = (v, cls) => {
      if (!v) return; const hh = Math.max(2, y(v));
      const last = base - hh;
      out += `<rect class="${cls}" x="${x}" y="${last}" width="${bw}" height="${hh - (out ? 2 : 0)}" rx="2"/>`;
      base = last;
    };
    seg(d.c, 's-card'); seg(d.u, 's-unk'); seg(d.g, 's-game');
    const lab = d.all ? `${thDate(Date.parse(d.key + 'T12:00:00'))}: การ์ด ${d.c} · เกม ${d.g}${d.u ? ` · ไม่แยกประเภท ${d.u}` : ''}` : `${thDate(Date.parse(d.key + 'T12:00:00'))}: ไม่ได้เล่น`;
    return `${out}<rect class="hit" data-tip="${lab}" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}"/>`;
  }).join('');
  const ticks = [0, 7, 14, 21, 27].map((i) => `<text class="ax" x="${i * (bw + gap) + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 27 ? 'วันนี้' : `${27 - i} วันก่อน`}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="กิจกรรมต่อวัน 28 วัน">
    <line class="base" x1="0" x2="${Wd}" y1="${H - bot}" y2="${H - bot}"/>${bars}${ticks}</svg><div class="tip" hidden></div></div>
    <div class="legend"><span><i class="s-card"></i>แฟลชการ์ด</span><span><i class="s-game"></i>เกม + ไถศัพท์</span>${hasU ? '<span><i class="s-unk"></i>ก่อนเริ่มแยกประเภท</span>' : ''}</div>`;
}

// Lines: words learned and words mastered (all levels), from daily snapshots.
function trendChart(Wd) {
  const keys = Object.keys(S.snap).sort();
  if (keys.length < 2) {
    return `<div class="small muted">📊 แอปเริ่มเก็บข้อมูลแนวโน้มตั้งแต่วันนี้ เล่นต่ออีกวันสองวันแล้วกราฟเส้นจะขึ้นตรงนี้</div>
      <div style="margin-top:8px">ตอนนี้: เรียนแล้ว <b>${S.snap[today()][2]}</b> คำ · จำได้แล้ว <b>${S.snap[today()][3]}</b> คำ</div>`;
  }
  const H = 150, top = 14, bot = 22, left = 4, right = 64;
  const t0 = Date.parse(keys[0] + 'T12:00:00'), t1 = Date.parse(keys[keys.length - 1] + 'T12:00:00');
  const span = Math.max(DAY, t1 - t0);
  const max = Math.max(10, ...keys.map((k) => S.snap[k][2])) * 1.1;
  const px = (k) => left + (Wd - left - right) * (Date.parse(k + 'T12:00:00') - t0) / span;
  const py = (v) => H - bot - (H - bot - top) * v / max;
  const line = (i, cls) => `<polyline class="${cls}" points="${keys.map((k) => `${px(k).toFixed(1)},${py(S.snap[k][i]).toFixed(1)}`).join(' ')}"/>`;
  const last = keys[keys.length - 1], L = S.snap[last];
  const endLab = (v, cls, txt, dy) => `<circle class="${cls}" cx="${px(last)}" cy="${py(v)}" r="4"/><text class="lab" x="${px(last) + 8}" y="${py(v) + dy}">${txt} ${v}</text>`;
  const dl = Math.abs(py(L[2]) - py(L[3])) < 14 ? [-4, 12] : [4, 4];
  const hits = keys.map((k, i) => {
    const x0 = i ? (px(keys[i - 1]) + px(k)) / 2 : 0, x1 = i < keys.length - 1 ? (px(k) + px(keys[i + 1])) / 2 : Wd;
    return `<rect class="hit" data-x="${px(k)}" data-tip="${thDate(Date.parse(k + 'T12:00:00'))}: เรียนแล้ว ${S.snap[k][2]} · จำได้ ${S.snap[k][3]}" x="${x0}" y="0" width="${x1 - x0}" height="${H}"/>`;
  }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="แนวโน้มจำนวนคำที่เรียนแล้วและจำได้แล้ว">
    <line class="base" x1="0" x2="${Wd - right}" y1="${H - bot}" y2="${H - bot}"/>
    ${line(2, 'ln-l')}${line(3, 'ln-m')}${endLab(L[2], 'dot-l', 'เรียน', dl[0])}${endLab(L[3], 'dot-m', 'จำได้', dl[1])}
    <text class="ax" x="${left}" y="${H - 6}">${thDate(t0)}</text><text class="ax" x="${Wd - right}" y="${H - 6}" text-anchor="end">วันนี้</text>
    <line class="xhair" x1="0" x2="0" y1="${top}" y2="${H - bot}" visibility="hidden"/>${hits}</svg><div class="tip" hidden></div></div>
    <div class="legend"><span><i class="s-card"></i>เรียนแล้ว</span><span><i class="s-master"></i>จำได้แล้ว</span></div>`;
}

// Tap/hover on a chart shows the hovered mark's numbers in a small tooltip.
function bindChartTips() {
  view.querySelectorAll('.chart').forEach((ch) => {
    const tip = ch.querySelector('.tip'), xh = ch.querySelector('.xhair'), svg = ch.querySelector('svg');
    const show = (e) => {
      const r = e.target.closest('.hit'); if (!r) return;
      tip.textContent = r.dataset.tip; tip.hidden = false;
      const box = ch.getBoundingClientRect(), rb = r.getBoundingClientRect();
      const cx = rb.left + rb.width / 2 - box.left;
      tip.style.left = Math.min(Math.max(cx, 80), box.width - 80) + 'px';
      if (xh && r.dataset.x) { xh.setAttribute('x1', r.dataset.x); xh.setAttribute('x2', r.dataset.x); xh.setAttribute('visibility', 'visible'); }
    };
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (xh) xh.setAttribute('visibility', 'hidden'); });
  });
}

/* ---------- cloud sync (Supabase, optional) ---------- */
// Signs in with a 6-digit email code (works inside the home-screen app, unlike magic links, which
// open Safari). Progress is one JSON row per user in table `progress`, protected by row-level
// security. Sync = pull → mergeBackup() (keeps whichever side is further ahead) → push.
const SYNC = Object.assign({ url: '', anonKey: '', requireLogin: false, vapidPublicKey: '', leaderboard: true }, window.SYNC_CONFIG || {});
const syncOn = () => !!(SYNC.url && SYNC.anonKey);
const AUTH_KEY = 'o3k.auth';
let auth = null;
try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { /* ignore */ }
const setAuth = (a) => { auth = a; try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } };
let syncState = { busy: false, last: 0, error: '' };

async function sbFetch(path, opts = {}, retry = true) {
  const headers = { apikey: SYNC.anonKey, 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (auth && auth.access_token && !opts.noAuth) headers.Authorization = 'Bearer ' + auth.access_token;
  const res = await fetch(SYNC.url.replace(/\/$/, '') + path, { ...opts, headers });
  if (res.status === 401 && retry && auth && auth.refresh_token && !opts.noAuth) {
    if (await refreshAuth()) return sbFetch(path, opts, false);
  }
  return res;
}
async function refreshAuth() {
  try {
    const r = await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', noAuth: true, body: JSON.stringify({ refresh_token: auth.refresh_token }) }, false);
    if (!r.ok) { setAuth(null); return false; }
    const j = await r.json(); setAuth({ ...auth, ...j }); return true;
  } catch (e) { return false; }
}
async function sendCode(email) {
  // create_user:false → only people already invited in the Supabase dashboard can sign in.
  const r = await sbFetch('/auth/v1/otp', { method: 'POST', noAuth: true, body: JSON.stringify({ email, create_user: false }) });
  if (!r.ok) throw new Error(r.status === 422 || r.status === 400 ? 'อีเมลนี้ยังไม่ได้รับเชิญ' : 'ส่งรหัสไม่สำเร็จ (' + r.status + ')');
}
async function verifyCode(email, token) {
  const r = await sbFetch('/auth/v1/verify', { method: 'POST', noAuth: true, body: JSON.stringify({ type: 'email', email, token }) });
  if (!r.ok) throw new Error('รหัสไม่ถูกต้องหรือหมดอายุ');
  const j = await r.json();
  setAuth({ access_token: j.access_token, refresh_token: j.refresh_token, user: { id: j.user.id, email: j.user.email } });
}
let pushTimer = null, pulling = false;
function schedulePush() {
  if (!syncOn() || !auth || pulling) return;
  clearTimeout(pushTimer); pushTimer = setTimeout(() => syncNow(), 4000);
}
async function syncNow(manual) {
  if (!syncOn() || !auth || syncState.busy) return false;
  syncState.busy = true; syncState.error = '';
  try {
    const uid = auth.user.id;
    const r = await sbFetch(`/rest/v1/progress?select=data&user_id=eq.${encodeURIComponent(uid)}`);
    if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ (' + r.status + ')');
    const rows = await r.json();
    if (rows[0] && rows[0].data) { pulling = true; try { mergeBackup(rows[0].data); } finally { pulling = false; } }
    const w = await sbFetch('/rest/v1/progress', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: uid, data: S, updated_at: new Date().toISOString() }),
    });
    if (!w.ok) throw new Error('บันทึกขึ้นคลาวด์ไม่สำเร็จ (' + w.status + ')');
    syncState.last = Date.now();
    if (SYNC.leaderboard) pushBoard().catch(() => {});
    if (manual) toast('☁️ ซิงก์เรียบร้อย');
    return true;
  } catch (e) {
    syncState.error = e.message || 'ซิงก์ไม่สำเร็จ';
    if (manual) toast('⚠️ ' + syncState.error);
    return false;
  } finally { syncState.busy = false; }
}
// Friends leaderboard: one public-to-members row per user (see SYNC-SETUP.md for the table).
const boardName = () => S.nick || ((auth && auth.user && auth.user.email) || '').split('@')[0];
async function pushBoard() {
  const sn = S.snap[today()] || [0, 0, 0, 0];
  await sbFetch('/rest/v1/leaderboard', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: auth.user.id, name: boardName(), xp: S.xp || 0, week: mondayKey(), week_xp: S.xpWeek[mondayKey()] || 0,
      streak: streakNow(), mastered: sn[3], updated_at: new Date().toISOString() }),
  });
}
async function loadBoard() {
  const r = await sbFetch(`/rest/v1/leaderboard?select=user_id,name,week,week_xp,xp,streak,mastered&order=xp.desc&limit=50`);
  if (!r.ok) throw new Error(r.status);
  const wk = mondayKey();
  return (await r.json()).map((x) => ({ ...x, week_xp: x.week === wk ? x.week_xp : 0 })).sort((a, b) => b.week_xp - a.week_xp || b.xp - a.xp);
}
function boardSection() {
  if (!syncOn() || !auth || !SYNC.leaderboard) return '';
  setTimeout(async () => {
    const el = $('#board'); if (!el) return;
    try {
      const rows = await loadBoard();
      el.innerHTML = rows.length < 2 ? '<p class="small muted" style="margin:0">ยังมีแค่คุณคนเดียว เชิญเพื่อนผ่าน Supabase (Authentication → Users) แล้วมาแข่งกัน!</p>'
        : rows.map((x, k) => `<div class="lb-row ${x.user_id === auth.user.id ? 'me' : ''}"><span class="lb-n">${['🥇', '🥈', '🥉'][k] || k + 1}</span>
          <span class="grow"><b>${esc(x.name || 'ไม่มีชื่อ')}</b><br><span class="small muted">🔥 ${x.streak} · 🟢 ${x.mastered} คำ · รวม ${x.xp} XP</span></span><b>${x.week_xp} XP</b></div>`).join('');
    } catch (e) { el.innerHTML = '<p class="small muted" style="margin:0">โหลดอันดับไม่สำเร็จ (ตั้งค่าตาราง leaderboard แล้วหรือยัง?)</p>'; }
  }, 0);
  return `<div class="h2">🏆 อันดับเพื่อนสัปดาห์นี้</div><div class="card-box" id="board"><p class="small muted" style="margin:0">กำลังโหลด…</p></div>`;
}

// Web Push (iOS 16.4+ home-screen app): the subscription is stored in Supabase and a scheduled
// Edge Function (supabase/functions/daily-reminder) sends the daily reminder.
const canPush = () => syncOn() && !!SYNC.vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64u = (s) => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };
async function pushSub() { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
async function savePushSub(sub) {
  const j = sub.toJSON();
  const r = await sbFetch('/rest/v1/push_subs', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ endpoint: j.endpoint, user_id: auth.user.id, sub: j, remind: S.remind, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error('บันทึกการแจ้งเตือนไม่สำเร็จ (' + r.status + ')');
}
async function enablePush() {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(SYNC.vapidPublicKey) });
  await savePushSub(sub);
}
async function disablePush() {
  const sub = await pushSub(); if (!sub) return;
  await sbFetch('/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(sub.endpoint), { method: 'DELETE' }).catch(() => {});
  await sub.unsubscribe();
}

// Login screen (also used as the lock screen when requireLogin is on).
function renderLogin(locked) {
  document.body.classList.toggle('locked', !!locked);
  view.innerHTML = `<div class="card-box center pop" style="margin-top:20px">
      <div class="result-emoji">☁️</div>
      <div class="h2">${locked ? 'เข้าสู่ระบบเพื่อใช้งาน' : 'เข้าสู่ระบบเพื่อซิงก์'}</div>
      <p class="small muted">ใช้อีเมลที่ได้รับเชิญ แอปจะส่งรหัส 6 หลักไปทางอีเมล</p>
      <form id="lf" autocomplete="on">
        <input class="spell-input" id="em" type="email" inputmode="email" autocomplete="email" placeholder="อีเมล" value="${esc((auth && auth.user && auth.user.email) || '')}">
        <button class="btn primary block" style="margin-top:10px" id="lsend">ส่งรหัสไปที่อีเมล</button>
      </form>
      <form id="cf" hidden>
        <input class="spell-input" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="รหัสจากอีเมล">
        <button class="btn primary block" style="margin-top:10px">ยืนยัน</button>
      </form>
      <p class="small" id="lmsg" style="min-height:1.5em"></p>
      ${locked ? '' : '<button class="btn ghost block" id="lback">‹ กลับ</button>'}
    </div>`;
  const msg = (t) => ($('#lmsg').textContent = t);
  let email = '';
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); email = $('#em').value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return msg('กรอกอีเมลให้ถูกต้องก่อนนะ');
    msg('กำลังส่งรหัส…');
    try { await sendCode(email); $('#cf').hidden = false; $('#code').focus(); msg('ส่งรหัสแล้ว เช็คอีเมล (รวมถึงในโฟลเดอร์สแปม)'); } catch (err) { msg('⚠️ ' + err.message); }
  };
  $('#cf').onsubmit = async (e) => {
    e.preventDefault(); msg('กำลังตรวจรหัส…');
    try {
      await verifyCode(email, $('#code').value.trim());
      document.body.classList.remove('locked');
      msg('เข้าสู่ระบบแล้ว กำลังซิงก์…');
      await syncNow(true);
      go(locked ? (['home', 'feed', 'cards'].includes(S.settings.start) ? S.settings.start : 'home') : 'settings');
    } catch (err) { msg('⚠️ ' + err.message); }
  };
  if (!locked) $('#lback').onclick = () => go('settings');
}
const mustLogin = () => syncOn() && SYNC.requireLogin && !auth;

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
  ['📱', 'ใช้บน iPhone / iPad และแนวนอน', `
    <ul>
      <li>ใช้ได้ทั้ง iPhone และ iPad ติดตั้งแบบเดียวกัน (Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม) หมุนจอได้ทั้งแนวตั้งและแนวนอน</li>
      <li><b>iPad / แนวนอน:</b> เมนูย้ายไปอยู่แถบด้านซ้าย หน้าแรก เกม คำศัพท์ และห้องสมุดเรื่องสั้นจะแสดงหลายคอลัมน์</li>
      <li><b>iPhone แนวนอน:</b> แฟลชการ์ดอยู่ซ้าย ปุ่มให้คะแนนอยู่ขวา · เกมและไถศัพท์ คำถามอยู่ซ้าย ตัวเลือกอยู่ขวา ไม่ต้องเลื่อนจอ</li>
      <li>⚠️ ความคืบหน้าเก็บแยกในแต่ละเครื่อง ถ้าใช้ทั้ง iPhone และ iPad ให้เปิด <b>☁️ ซิงก์</b> หรือ <b>สำรองข้อมูล</b> จากเครื่องหนึ่งแล้ว <b>นำเข้า</b> ในอีกเครื่อง</li>
    </ul>`],
  ['🎯', 'แบบทดสอบวัดระดับ', `
    <ul>
      <li>หน้าแรก (สำหรับคนเพิ่งเริ่ม) หรือ ⚙️ ตั้งค่า → <b>🎯 แบบทดสอบวัดระดับ</b></li>
      <li>ตอบคำแปลระดับละ 8 ข้อ เริ่มจาก A1 ขึ้นไปเรื่อยๆ ไม่รู้ให้กด "ไม่รู้" อย่าเดา</li>
      <li>ระดับที่ตอบถูก 6/8 ขึ้นไป เลือกข้ามได้ คำในระดับนั้นจะนับว่ารู้แล้ว และทยอยกลับมาให้ทบทวนใน 1–4 สัปดาห์ ถ้าไม่รู้จริงก็กด "ลืม" ตอนนั้น</li>
      <li>ช่วยประหยัดเวลาไม่ต้องเรียนคำง่ายๆ ที่รู้อยู่แล้วทีละใบ</li>
    </ul>`],
  ['🃏', 'แฟลชการ์ดและ 4 ปุ่ม', `
    <p>แตะการ์ดเพื่อพลิกดูคำแปล แล้วกดปุ่มตามที่นึกออกจริงๆ</p>
    <ul>
      <li><b>ลืม</b> — นึกไม่ออกเลย การ์ดจะกลับมาอีกในรอบนี้ และเริ่มนับใหม่</li>
      <li><b>ยาก</b> — นึกออกแต่ช้า/ไม่แน่ใจ ระยะทบทวนเท่าเดิม (คำใหม่จะ "วนอีกรอบ" ในรอบนี้)</li>
      <li><b>จำได้</b> — นึกออก ระยะทบทวนยาวขึ้น 1 ขั้น</li>
      <li><b>ง่าย</b> — รู้ทันที ยาวขึ้น 2 ขั้น</li>
    </ul>
    <p><b>ทางลัด:</b> ปัดการ์ดไปขวา = จำได้, ปัดไปซ้าย = ลืม</p>
    <p><b>ระยะทบทวนปรับตามแต่ละคำ</b> คำที่กด "ง่าย" บ่อยจะเว้นห่างเร็วขึ้น คำที่ลืมบ่อยจะกลับมาถี่ขึ้น (ตัวเลขใต้ปุ่มบอกว่าจะเจอคำนี้อีกเมื่อไร) คำที่ระยะทบทวนถึง 16 วันขึ้นไปจะนับว่า <b>🟢 จำได้แล้ว</b></p>
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
  ['📈', 'สถิติและการคาดการณ์', `
    <p>หน้าแรก → แตะการ์ด <b>📈 ความคืบหน้า</b> (มีเลเวล, ความคืบหน้าแต่ละระดับ, การ์ดที่ต้องทบทวน 7 วันข้างหน้า, เหรียญรางวัล รวมอยู่ในหน้านี้)</p>
    <ul>
      <li><b>นิสัยการเล่น</b> — 28 วันล่าสุดเล่นกี่วัน แฟลชการ์ดและเกมเฉลี่ยวันละกี่ข้อ ตอบถูกกี่ %</li>
      <li><b>กราฟกิจกรรมต่อวัน</b> — แท่งสีม่วงคือแฟลชการ์ด สีชมพูคือเกมกับไถศัพท์ แตะแท่งเพื่อดูตัวเลข</li>
      <li><b>กราฟแนวโน้ม</b> — จำนวนคำที่เรียนแล้วและจำได้แล้วในแต่ละวัน (เริ่มเก็บตั้งแต่เวอร์ชัน 1.9.0)</li>
      <li><b>คาดการณ์</b> — วันที่น่าจะจำได้ครบชุด 3000 คำ และครบ 5000 คำ คิดจากความเร็วที่เรียนคำใหม่ ความถี่ที่เล่น และความแม่นยำ</li>
      <li><b>สรุปรายเดือน</b> — เดือนนี้กับเดือนที่แล้ว: เล่นกี่วัน, คำใหม่, จำได้เพิ่ม, เรื่องสั้นที่อ่าน, ติดต่อกันนานสุด และวันที่ขยันที่สุด (▲▼ = เทียบกับเดือนก่อน) · 7 วันแรกของเดือนจะมีการ์ดสรุปเดือนที่แล้วในหน้าแรก</li>
      <li><b>สรุปรายสัปดาห์</b> — สัปดาห์นี้กับสัปดาห์ที่แล้ว: เล่นกี่วัน, คำใหม่, จำได้เพิ่ม, คำที่ผิดบ่อย ทุกวันจันทร์จะมีการ์ดสรุปสัปดาห์ที่แล้วในหน้าแรก พร้อมปุ่มฝึกคำที่ผิดบ่อย</li>
      <li><b>ถ้าปรับจำนวนคำใหม่ต่อวัน</b> — ตารางเทียบว่าตั้ง 10/20/30/50 คำต่อวันจะจบเร็วขึ้นแค่ไหน และต้องทบทวนวันละประมาณเท่าไร</li>
    </ul>
    <p>ตัวเลขเป็นการประมาณ ยิ่งเล่นนาน ยิ่งแม่นขึ้น</p>`],
  ['🔁', 'เล่นหลายรอบในวันเดียว', `
    <ul>
      <li>ถ้ายังมีการ์ดค้าง เข้ามากี่ครั้งก็จะได้ทำต่อจากที่ค้างไว้</li>
      <li>ทำครบแล้ว กด <b>"เรียนคำใหม่เพิ่มอีก 10 คำ"</b> ได้เรื่อยๆ</li>
      <li>แอปจะไม่ให้ทวนคำที่ยังไม่ถึงกำหนดซ้ำ เพราะการเว้นระยะให้ลืมนิดหน่อยก่อนทวนช่วยให้จำได้นานกว่า อยากฝึกเพิ่มให้ไปเล่น <b>🎮 เกม</b> แทน</li>
    </ul>`],
  ['🐢', 'คำดื้อ และวิธีจำของฉัน', `
    <ul>
      <li>คำที่กด "ลืม" หรือตอบผิดรวม 4 ครั้งขึ้นไป จะกลายเป็น <b>🐢 คำดื้อ</b></li>
      <li>เจอคำดื้อ แตะ "เขียนวิธีจำ" บนการ์ดด้านหลัง แล้วจดวิธีจำของตัวเอง เช่น เสียงคล้ายคำไทย หรือประโยคตลกๆ ครั้งต่อไปจะโชว์ให้เห็นทุกครั้ง</li>
      <li>เขียนวิธีจำให้คำไหนก็ได้ ไม่ต้องเป็นคำดื้อ (แตะ ✏️ เขียนวิธีจำ ในการ์ดหรือในหน้ารายละเอียดคำ)</li>
      <li>ฝึกเฉพาะคำดื้อ: 🎮 เกม → เลือกแหล่งคำ <b>🐢 คำดื้อ</b> · ดูรายชื่อ: 📖 คำศัพท์ → ตัวกรอง 🐢 คำดื้อ</li>
    </ul>`],
  ['🎮', 'เกมทั้ง 14 แบบ', `
    <ul>
      <li><b>🇬🇧 ทายความหมาย / 🇹🇭 ทายคำศัพท์</b> — เลือกคำแปลที่ถูก</li>
      <li><b>🎧 ฟังแล้วตอบ</b> — ฝึกหู ฟังเสียงแล้วเลือกความหมาย</li>
      <li><b>⌨️ สะกดคำ</b> — พิมพ์คำอังกฤษเอง จำได้ลึกที่สุด</li>
      <li><b>📝 เติมคำในประโยค</b> — ฝึกใช้คำในบริบท</li>
      <li><b>🧩 จับคู่ด่วน</b> — แข่งกับเวลา เล่นสนุกตอนว่าง</li>
      <li><b>🎤 พูดตาม</b> — กดไมค์แล้วพูดคำนั้น ลองได้ 3 ครั้ง (ต้องอนุญาตไมโครโฟน) พูดไม่ผ่านไม่ทำให้การ์ดถูกรีเซ็ต</li>
      <li><b>🔁 คำที่ผิดบ่อย</b> — รวมคำที่เคยตอบผิดมาฝึกซ้ำ</li>
      <li><b>✍️ ฟังประโยคแล้วเขียน</b> — ฟังประโยคตัวอย่าง แล้วพิมพ์คำที่หายไป ฝึกหูกับการสะกดพร้อมกัน</li>
      <li><b>🗣️ พูดทั้งประโยค</b> — อ่านประโยคตัวอย่างออกเสียง ผ่านเมื่อพูดถูกราว 70% ของคำในประโยค</li>
      <li><b>🔀 เรียงประโยค</b> — ดูคำแปลไทย แล้วแตะคำที่สลับกันให้เรียงเป็นประโยค (แตะคำในกล่องบนเพื่อเอาออก) · กด 🔊 ฟังประโยคเป็นตัวช่วยได้ แต่ข้อนั้นจะไม่นับว่าถูก · เรียงผิดไม่ทำให้การ์ดถูกรีเซ็ต</li>
      <li><b>🔗 คำคู่กัน</b> — เช่น "___ a decision = ตัดสินใจ" เลือกคำที่ใช้คู่กันให้ถูก (make) ช่วยให้พูดได้เป็นธรรมชาติ</li>
      <li><b>📖 เติมคำจากเรื่อง / 🧱 เรียงประโยคจากเรื่อง</b> — ใช้ประโยคจากเรื่องสั้นที่อ่านจบแล้ว ยิ่งอ่านมาก ยิ่งมีข้อให้เล่นมาก</li>
    </ul>
    <p><b>เลือกแหล่งคำ</b> ด้านบนหน้าเกมได้: ระดับที่เลือก, คำที่เรียนแล้ว, ทุกระดับ, 🟢 คำที่จำได้แล้ว (เช็คว่ายังจำได้จริง คำที่ตอบผิดจะกลับไปให้ทบทวนในแฟลชการ์ด), ⭐ คำติดดาว, 🐢 คำดื้อ และ 📂 ตามหมวด</p>
    <p>หน้าสรุปผลแตะคำที่ตอบผิดเพื่อฟังเสียง หรือแตะ ⭐ เพื่อติดดาวไว้ฝึกต่อ</p>`],
  ['📂', 'เรียนตามหมวด', `
    <ul>
      <li>คำศัพท์ทุกคำถูกจัดเป็น 16 หมวด เช่น 🍜 อาหาร, ✈️ การเดินทาง, 💼 งานและเงิน, 💭 อารมณ์</li>
      <li>⚙️ ตั้งค่า → <b>คำใหม่จากหมวด</b> เลือกหมวดที่สนใจ คำใหม่ในแฟลชการ์ดและไถศัพท์จะมาจากหมวดนั้นก่อน (คำที่ถึงวันทบทวนยังมาตามปกติ)</li>
      <li>🎮 เกม → แหล่งคำ <b>📂 ตามหมวด</b> เล่นเกมเฉพาะหมวด · 📖 คำศัพท์ → เลือกหมวดเพื่อดูรายการ</li>
    </ul>`],
  ['📖', 'อ่านเรื่องสั้น', `
    <ul>
      <li>🎮 เกม → <b>📖 อ่านเรื่องสั้น</b> เปิด 📚 ห้องสมุด มี 100 เรื่อง 5 ระดับ (A1 ง่ายมาก, A2 ง่าย, B1 ปานกลาง, B2 ท้าทาย, C1 ขั้นสูง)</li>
      <li>การ์ดใหญ่ด้านบน = <b>เรื่องแนะนำ</b> (เรื่องที่ยังไม่อ่านในระดับที่เรากำลังเรียน) · กรองตามระดับหรือ "ยังไม่อ่าน" ได้ · แต่ละเรื่องบอกเวลาอ่านและ % คำที่รู้แล้ว</li>
      <li>คำที่อยู่ในรายการคำศัพท์จะขีดเส้นใต้ แตะเพื่อดูความหมาย ฟังเสียง ติดดาว หรือเพิ่มเข้าทบทวน · <span class="rw learning">สีเหลือง</span> = กำลังเรียน <span class="rw mastered">สีเขียว</span> = จำได้แล้ว</li>
      <li><b>▶️ ฟังทั้งเรื่อง</b> จะไฮไลต์ย่อหน้าที่กำลังอ่านให้ตามไปพร้อมกัน (กดอีกครั้งเพื่อหยุด) · 🔊 ใต้ย่อหน้า = ฟังเฉพาะย่อหน้านั้น</li>
      <li><b>🇹🇭 คำแปล</b> เปิดคำแปลทั้งเรื่อง หรือกด "แปลย่อหน้านี้" ทีละย่อหน้า (ลองอ่านเองก่อนค่อยดู) · <b>Aa</b> เปลี่ยนขนาดตัวอักษร (จำค่าไว้ให้)</li>
      <li><b>🎧 ฟังอย่างเดียว</b> — ข้อความจะเบลอไว้ กด ▶️ ฟังทั้งเรื่องแล้วลองตอบคำถามจากที่ได้ยิน ฟังไม่ทันแตะย่อหน้าเพื่อเปิดดูทีละย่อหน้า (ฝึก listening ได้ดีมาก)</li>
      <li>ท้ายเรื่องมี <b>✨ คำใหม่ในเรื่องนี้</b> แตะเพื่อดูความหมายแล้วกด ⭐ ติดดาวไว้ทบทวน</li>
      <li>ตอบคำถามท้ายเรื่อง ข้อละ 5 XP · ห้องสมุดจะเก็บคะแนนที่ดีที่สุดของแต่ละเรื่อง (★ = ถูกหมด)</li>
    </ul>`],
  ['📖', 'รายการคำศัพท์', `
    <ul>
      <li>หน้ารายละเอียดคำ (แตะคำไหนก็ได้) มี <b>🔗 คำที่มักใช้คู่กัน</b> สำหรับคำที่ใช้บ่อย ราว 900 คำ เช่น make → make a decision, make a mistake · แตะเพื่อฟังเสียง</li>
      <li>ค้นหาคำ อังกฤษหรือไทยก็ได้ และกรองตามสถานะ (ยังไม่เรียน / กำลังเรียน / จำได้แล้ว / ⭐ ติดดาว) และตามระดับ</li>
      <li>แตะคำเพื่อดูรายละเอียด ฟังเสียง และประโยคตัวอย่าง</li>
      <li>ในหน้ารายละเอียด: <b>⭐ ติดดาว</b>, <b>🔁 ทบทวนวันนี้</b> (ดึงคำมาให้ทวนทันที), <b>✓ รู้แล้ว</b> (ข้ามคำที่รู้อยู่แล้ว)</li>
    </ul>`],
  ['🎨', 'เสียงอ่านและธีม', `
    <ul>
      <li>⚙️ ตั้งค่า → <b>เสียงอ่าน</b> เลือกเสียงเองได้ (⭐ = เสียงคุณภาพสูง) เลือกแล้วจะได้ยินตัวอย่างทันที · "อัตโนมัติ" = เลือกตามสำเนียงที่ตั้งไว้</li>
      <li>อยากได้เสียงที่ชัดเหมือนคนจริง: iPhone/iPad → การตั้งค่า → การช่วยการเข้าถึง → เนื้อหาที่ถูกพูด → เสียง → อังกฤษ → ดาวน์โหลดเสียงแบบ <b>ขั้นสูง (Enhanced)</b> หรือ <b>พรีเมียม</b> แล้วปิดเปิดแอปใหม่ เสียงนั้นจะขึ้นในรายการ</li>
      <li>⚙️ ตั้งค่า → <b>หน้าตา</b> เลือกธีม 🌓 ตามเครื่อง / ☀️ สว่าง / 🌙 มืด</li>
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
  ['☁️', 'ซิงก์ข้อมูลอัตโนมัติ', `
    <ul>
      <li>ถ้าตั้งค่า Supabase แล้ว (ขั้นตอนในไฟล์ SYNC-SETUP.md บน GitHub): ⚙️ ตั้งค่า → ☁️ ซิงก์ข้อมูล → <b>เข้าสู่ระบบ</b> ด้วยอีเมลที่ได้รับเชิญ แล้วใส่รหัส 6 หลักจากอีเมล</li>
      <li>หลังเข้าสู่ระบบ ความคืบหน้าซิงก์ขึ้นคลาวด์เองทุกครั้งที่เล่นและตอนเปิดแอป ใช้หลายเครื่องได้ ลบแอปแล้วเข้าสู่ระบบใหม่ ข้อมูลกลับมาครบ</li>
      <li>ถ้าเปิดโหมดล็อก (requireLogin) คนที่ไม่ได้รับเชิญจะเข้าใช้แอปไม่ได้</li>
      <li>ยังกด 📤 ส่งออกไฟล์สำรองได้เหมือนเดิม เผื่อไว้อีกชั้น</li>
      <li><b>🏆 อันดับเพื่อน</b> — เห็น XP สัปดาห์นี้ สตรีค และคำที่จำได้ของคนที่ได้รับเชิญ ในหน้าสถิติ ตั้งชื่อที่แสดงได้ในหน้าตั้งค่า</li>
      <li><b>🔔 แจ้งเตือนรายวัน</b> — ⚙️ ตั้งค่า → ☁️ ซิงก์ → แจ้งเตือนรายวัน → เปิด เตือนตามเวลาที่ตั้งไว้ เฉพาะวันที่ยังไม่ได้เล่น (ต้องตั้งค่าเพิ่มตาม SYNC-SETUP.md ข้อ 7 และใช้ได้กับแอปบนหน้าจอโฮม iOS 16.4 ขึ้นไป)</li>
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
      <p class="small muted">A1–A2 = พื้นฐาน, B1–B2 = ระดับกลาง, B2+ และ C1 = ระดับสูง (เลือกได้หลายระดับ)</p>
      <div class="set-row" style="border-top:1px solid var(--border);padding-top:12px"><span>คำใหม่จากหมวด</span>
        <select class="sel" id="topic"><option value="">📚 ทุกหมวด</option>${TOPICS.map(([id]) => `<option value="${id}" ${st.topic === id ? 'selected' : ''}>${TOPIC_LABEL[id]}</option>`).join('')}</select></div>
      <p class="small muted" style="margin-bottom:0">เลือกหมวดแล้ว คำใหม่ในแฟลชการ์ดและไถศัพท์จะมาจากหมวดนั้น ส่วนคำที่ถึงวันทบทวนยังมาตามปกติ</p>
    </div>

    <div class="h2">การเรียน</div>
    <div class="card-box">
      <div class="set-row"><span>คำใหม่ต่อวัน</span>
        <select class="sel" id="npd">${[5, 10, 15, 20, 30, 50, 100].map((n) => `<option ${n === st.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row"><span>ลำดับคำใหม่</span>
        <select class="sel" id="ord"><option value="shuffle" ${st.order === 'shuffle' ? 'selected' : ''}>สุ่ม</option><option value="alpha" ${st.order === 'alpha' ? 'selected' : ''}>เรียงตามตัวอักษร</option></select></div>
      <button class="btn block" id="toPlace" style="margin:4px 0 8px">🎯 แบบทดสอบวัดระดับ (ข้ามคำที่รู้แล้ว)</button>
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

    <div class="h2">หน้าตา</div>
    <div class="card-box">
      <div class="set-row"><span>ธีม</span>
        <div class="seg" id="theme">${[['auto', '🌓 ตามเครื่อง'], ['light', '☀️ สว่าง'], ['dark', '🌙 มืด']].map(([v, t]) => `<button class="${(st.theme || 'auto') === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
    </div>

    <div class="h2">เสียง</div>
    <div class="card-box">
      <div class="set-row"><span>เสียงอ่าน</span><select class="sel" id="voice" style="max-width:62%"></select></div>
      <div class="small muted" id="voiceN" style="margin:-4px 0 6px"></div>
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

    <div class="h2">☁️ ซิงก์ข้อมูลอัตโนมัติ</div>
    <div class="card-box">${!syncOn()
      ? '<p class="small muted" style="margin:0">ยังไม่ได้เปิดใช้ ต้องตั้งค่า Supabase ในไฟล์ <code>config.js</code> ก่อน (ดูขั้นตอนใน SYNC-SETUP.md ใน GitHub) จากนั้นความคืบหน้าจะซิงก์ขึ้นคลาวด์เอง ลบแอปหรือเปลี่ยนเครื่องก็ไม่หาย</p>'
      : auth ? `<p class="small" style="margin-top:0">เข้าสู่ระบบเป็น <b>${esc(auth.user.email)}</b><br><span class="muted">ซิงก์ล่าสุด: ${syncState.last ? new Date(syncState.last).toLocaleTimeString('th-TH', { timeStyle: 'short' }) : 'ยังไม่ได้ซิงก์ในรอบนี้'}${syncState.error ? ' · ⚠️ ' + esc(syncState.error) : ''}</span></p>
        ${SYNC.leaderboard ? `<div class="set-row"><span>ชื่อในอันดับเพื่อน</span><input class="sel" id="nick" maxlength="20" style="width:140px" value="${esc(boardName())}"></div>` : ''}
        ${canPush() ? '<div class="set-row"><span>🔔 แจ้งเตือนรายวัน</span><button class="btn" id="pushBtn" style="padding:8px 14px">…</button></div><p class="small muted" id="pushNote" style="margin-top:0">เตือนตามเวลาที่ตั้งไว้ด้านบน เฉพาะวันที่ยังไม่ได้เล่น (iPhone ต้องเปิดจากไอคอนบนหน้าจอโฮม iOS 16.4 ขึ้นไป)</p>' : ''}
        <div class="row"><button class="btn grow" id="syncNow">🔄 ซิงก์ตอนนี้</button><button class="btn grow" id="logout">ออกจากระบบ</button></div>`
      : '<p class="small muted" style="margin-top:0">เข้าสู่ระบบด้วยอีเมลที่ได้รับเชิญ แล้วความคืบหน้าจะซิงก์ขึ้นคลาวด์อัตโนมัติ ใช้ได้หลายเครื่อง</p><button class="btn primary block" id="login">เข้าสู่ระบบ</button>'}
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
  $('#toPlace').onclick = () => go('placement');
  $('#topic').onchange = (e) => { st.topic = e.target.value; save(); };
  $('#start').onchange = (e) => { st.start = e.target.value; save(); };
  $('#front').onchange = (e) => { st.front = e.target.value; save(); };
  $('#auto').onchange = (e) => { st.autoSpeak = e.target.checked; save(); };
  $('#sfx').onchange = (e) => { st.sfx = e.target.checked; save(); sfx('ok'); };
  $('#acc').onchange = (e) => { st.accent = e.target.value; save(); speak('Hello! Nice to meet you.'); };
  $('#rate').onchange = (e) => { st.rate = +e.target.value; save(); speak('vocabulary'); };
  $('#test').onclick = () => speak('Hello! Let\'s learn English together.');
  fillVoices();
  $('#voice').onchange = (e) => { st.voice = e.target.value; save(); speak('Hello! This is how I sound when I read your words.'); };
  $('#theme').onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    st.theme = b.dataset.v; save(); applyTheme();
    view.querySelectorAll('#theme button').forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#remind').onchange = (e) => {
    S.remind = e.target.value; save(); $('#remindAdd').href = `reminders/${S.remind}.ics`;
    if (canPush() && auth) pushSub().then((sub) => sub && savePushSub(sub)).catch(() => {});
  };

  if ($('#login')) $('#login').onclick = () => go('login');
  if ($('#nick')) $('#nick').onchange = (e) => { S.nick = e.target.value.trim().slice(0, 20); save(); };
  const pb = $('#pushBtn');
  if (pb) {
    const paintPush = async () => { pb.textContent = (await pushSub()) && Notification.permission === 'granted' ? 'ปิด' : 'เปิด'; };
    paintPush();
    pb.onclick = async () => {
      pb.disabled = true;
      try {
        if (pb.textContent === 'ปิด') { await disablePush(); toast('ปิดการแจ้งเตือนแล้ว'); } else { await enablePush(); toast('🔔 เปิดการแจ้งเตือนแล้ว'); }
      } catch (err) { toast('⚠️ ' + (err.message || err)); }
      pb.disabled = false; paintPush();
    };
  }
  if ($('#syncNow')) $('#syncNow').onclick = async () => { await syncNow(true); renderSettings(); };
  if ($('#logout')) $('#logout').onclick = () => {
    if (!confirm('ออกจากระบบ? ข้อมูลในเครื่องนี้ยังอยู่ แต่จะไม่ซิงก์จนกว่าจะเข้าสู่ระบบใหม่')) return;
    setAuth(null); toast('ออกจากระบบแล้ว'); go(mustLogin() ? 'login' : 'settings');
  };
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
if (!S.chistFrom) S.chistFrom = today();
go(['home', 'feed', 'cards'].includes(S.settings.start) ? S.settings.start : 'home');
// Ask the browser not to evict our localStorage under storage pressure / inactivity.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (syncOn() && auth) syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
document.addEventListener('visibilitychange', () => {
  if (!syncOn() || !auth) return;
  if (document.hidden) { clearTimeout(pushTimer); syncNow(); } else syncNow().then((ok) => { if (ok && current === 'home') renderHome(); });
});
// Refresh counts when returning to the app after a while (e.g. next day).
document.addEventListener('visibilitychange', () => { if (!document.hidden && current === 'home') renderHome(); });
