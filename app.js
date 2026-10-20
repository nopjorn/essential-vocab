'use strict';

// App version shown in the UI. Bump it (and VERSION in sw.js) on every push.
const APP_VERSION = '1.42.0';

// iOS home-screen apps (black-translucent status bar) often launch with innerHeight/100dvh
// short by the status-bar height, so the tab bar floats above the bottom edge until the
// next resize. In standalone mode use the full screen height when it is only slightly larger.
function fixAppHeight() {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let h = window.innerHeight;
  if (standalone && screen.width && screen.height) {
    const portrait = window.innerWidth < window.innerHeight + 120;
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const fullW = portrait ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
    if (Math.abs(window.innerWidth - fullW) < 2 && full > h && full - h <= 100) h = full;
  }
  document.documentElement.style.setProperty('--app-h', h + 'px');
}
fixAppHeight();
['resize', 'orientationchange', 'pageshow'].forEach(e => window.addEventListener(e, () => { fixAppHeight(); setTimeout(fixAppHeight, 300); }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) fixAppHeight(); });

/* ---------- data ---------- */
// WORDS rows (words/<level>.js): [word, pos, level, ipa, thai, example, thai example, topic id, 5 if Oxford 5000-only]
// g = study group: A1–B2 are Oxford 3000; B2x and C1 are the extra Oxford 5000 words.
const TOPICS = [
  ['people', '👪', 'คนและครอบครัว'], ['body', '💪', 'ร่างกายและสุขภาพ'], ['food', '🍜', 'อาหารและเครื่องดื่ม'],
  ['home', '🏠', 'บ้านและของใช้'], ['clothes', '👕', 'เสื้อผ้าและการแต่งตัว'], ['nature', '🌿', 'ธรรมชาติ สัตว์ อากาศ'],
  ['travel', '✈️', 'สถานที่และการเดินทาง'], ['work', '💼', 'งาน เงิน การซื้อขาย'], ['study', '🔬', 'การศึกษา วิทยาศาสตร์ เทคโนโลยี'],
  ['media', '🎬', 'สื่อสาร ศิลปะ กีฬา งานอดิเรก'], ['society', '🏛️', 'สังคม การเมือง กฎหมาย'], ['time', '⏰', 'เวลา ตัวเลข ปริมาณ'],
  ['feelings', '💭', 'อารมณ์ ความคิด นิสัย'], ['actions', '🏃', 'คำกริยาทั่วไป'], ['describe', '🎨', 'คำบรรยายลักษณะ'],
  ['grammar', '🔗', 'คำไวยากรณ์ (the, of, and…)'],
];
const TOPIC_LABEL = Object.fromEntries(TOPICS.map(([id, ic, th]) => [id, `${ic} ${th}`]));
const W = window.WORDS.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  .map(([w, p, l, i, t, e, et, tp, ...more], idx) => ({ idx, w, p, l, i, t, e, et, g: more.includes(5) ? (l === 'B2' ? 'B2x' : 'C1') : l, tp: tp || '', xe: more.find(Array.isArray) || [] }));
const inTopic = (w) => !S.settings.topic || w.tp === S.settings.topic;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'B2x', 'C1'];
const LEVELS_3000 = ['A1', 'A2', 'B1', 'B2'];
const LEVELS_5000 = ['B2x', 'C1'];
const LV_LABEL = { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', B2x: 'B2+', C1: 'C1', C2: 'C2' };
const lvNames = (ls) => ls.map((l) => LV_LABEL[l]).join(', ');
const DAY = 86400000;
// Review intervals (days) for each box. Box >= MASTERED counts as "จำได้แล้ว".
const INTERVALS = [0, 1, 3, 7, 16, 35, 80, 180];
const MASTERED = 4;

/* ---------- storage ---------- */
const KEY = 'oxford3000.v1';
const defaults = () => ({
  prog: {},            // word -> { b: box, d: due ms, s: seen, c: correct, x: wrong }
  settings: { levels: ['A1'], topic: '', newPerDay: 20, autoSpeak: true, rate: 0.9, slowRepeat: true, accent: 'en-US', front: 'en', order: 'shuffle', sfx: true, animPage: true, animAnswer: true, confetti: true, badge: true, start: 'home', rFont: 1, voice: '', theme: 'auto', wotd: { lv: [], st: [], tp: [] }, nextGames: [] },
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
  mtest: {},           // 'YYYY-MM' -> { r: right, n: questions, at: ms } best monthly-test score
  placedAt: '',        // date the placement test was taken/dismissed
  xpWeek: {},          // Monday key -> XP earned that week (friends leaderboard)
  nick: '',            // name shown on the friends leaderboard
  stk: {},             // topic id -> sticker tier reached (1 bronze … 4 diamond)
  wotdPick: null,      // {day, key, w}: today's word of the day (kept steady even as progress changes)
  seenVer: null,       // app version whose "what's new" prompt was shown (device-local, not merged from backups)
  homeCfg: null,       // home layout [{id, on, w: 'full'|'half'}] in display order; null = default (see HOME_BLOCKS)
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
  if (typeof updateBadge === 'function') updateBadge();
}

/* ---------- backup ---------- */
const BACKUP_EVERY = 7; // days before the home screen nags about a backup

// Share sheet when the device can share files (iOS), else a download. Resolves false if the user cancelled.
async function saveFile(file, title) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}
async function exportBackup() {
  const name = `essential-vocab-backup-${today()}.json`;
  const file = new File([JSON.stringify({ ...S, backupAt: Date.now() })], name, { type: 'application/json' });
  if (await saveFile(file, 'ศัพท์ต้องรู้ backup')) { S.backupAt = Date.now(); save(); toast('สำรองข้อมูลแล้ว ✅'); }
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
  if (Array.isArray(d.homeCfg) && !S.homeCfg) S.homeCfg = d.homeCfg;
  for (const [k, v] of Object.entries(d.read || {})) if (!S.read[k]) S.read[k] = v;
  for (const [k, v] of Object.entries(d.stk || {})) S.stk[k] = Math.max(S.stk[k] || 0, v);
  for (const [k, v] of Object.entries(d.readScore || {})) if (!S.readScore[k] || v[0] > S.readScore[k][0]) S.readScore[k] = v;
  for (const [k, v] of Object.entries(d.mtest || {})) if (!S.mtest[k] || v.r / v.n > S.mtest[k].r / S.mtest[k].n) S.mtest[k] = v;
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
  checkStickers();
  const got = ACH.filter((a) => !S.ach[a.id] && a.ok(s));
  if (!got.length) return;
  got.forEach((a) => (S.ach[a.id] = today()));
  setTimeout(() => { confetti(); toast(`🏅 ได้เหรียญ "${got[0].icon} ${got[0].name}"${got.length > 1 ? ` และอีก ${got.length - 1} เหรียญ` : ''}`); }, 1100);
}

/* ---------- sticker book ---------- */
// One sticker per topic, upgraded as the topic's words are learned/mastered.
const STK_TIERS = [
  { icon: '🥉', name: 'บรอนซ์', desc: 'เรียนแล้ว 20% ของคำชุด 3000 ในหมวด', need: (t) => [t.l3, Math.ceil(t.n3 * 0.2), 'เรียนแล้ว'] },
  { icon: '🥈', name: 'เงิน', desc: 'จำได้แล้ว 30% ของคำชุด 3000 ในหมวด', need: (t) => [t.m3, Math.ceil(t.n3 * 0.3), 'จำได้แล้ว'] },
  { icon: '🥇', name: 'ทอง', desc: 'จำได้แล้ว 70% ของคำชุด 3000 ในหมวด', need: (t) => [t.m3, Math.ceil(t.n3 * 0.7), 'จำได้แล้ว'] },
  { icon: '💎', name: 'เพชร', desc: 'จำได้แล้ว 70% ของทุกคำในหมวด (รวมชุด 5000)', need: (t) => [t.mAll, Math.ceil(t.nAll * 0.7), 'จำได้แล้ว (ทุกคำ)'] },
];
let TOPIC_WORDS = null;
function topicStat(id) {
  if (!TOPIC_WORDS) { TOPIC_WORDS = {}; W.forEach((w) => { if (w.tp) (TOPIC_WORDS[w.tp] = TOPIC_WORDS[w.tp] || []).push(w); }); }
  const t = { n3: 0, l3: 0, m3: 0, nAll: 0, mAll: 0 };
  for (const w of TOPIC_WORDS[id] || []) {
    const p = S.prog[w.w], m = p && p.b >= MASTERED, in3 = LEVELS_3000.includes(w.g);
    t.nAll++; if (m) t.mAll++;
    if (in3) { t.n3++; if (p) t.l3++; if (m) t.m3++; }
  }
  return t;
}
const tierOf = (t) => { let k = 0; while (k < STK_TIERS.length && t.n3 && (() => { const [h, n] = STK_TIERS[k].need(t); return h >= n; })()) k++; return k; };
function checkStickers() {
  if (!S.stk) S.stk = {};
  const up = [];
  TOPICS.forEach(([id]) => { const k = tierOf(topicStat(id)); if (k > (S.stk[id] || 0)) { S.stk[id] = k; up.push([id, k]); } });
  if (!up.length) return;
  const [id, k] = up[0];
  setTimeout(() => { confetti(); toast(`📒 ได้สติกเกอร์ ${STK_TIERS[k - 1].icon} ${STK_TIERS[k - 1].name} หมวด ${TOPIC_LABEL[id]}${up.length > 1 ? ` และอีก ${up.length - 1} อัน` : ''}`); }, 1600);
}
function stickerBook() {
  const n = TOPICS.reduce((a, [id]) => a + (S.stk[id] || 0), 0);
  return `<div class="h2">📒 สมุดสติกเกอร์ <span class="small muted">${n}/${TOPICS.length * STK_TIERS.length}</span></div>
    <div class="card-box"><div class="stk-grid" id="stk">${TOPICS.map(([id, ic, th]) => {
      const t = topicStat(id), k = tierOf(t), nx = STK_TIERS[k];
      const pct = nx ? (() => { const [h, need] = nx.need(t); return Math.min(100, h / Math.max(1, need) * 100); })() : 100;
      return `<button class="stk t${k}" data-stk="${id}"><span class="stk-ic">${ic}</span>${k ? `<span class="stk-tier">${STK_TIERS[k - 1].icon}</span>` : ''}<small>${esc(th)}</small><span class="stk-bar"><span style="width:${pct}%"></span></span></button>`;
    }).join('')}</div><div id="stkInfo" class="small muted" style="margin-top:10px">แตะสติกเกอร์เพื่อดูว่าต้องทำอีกเท่าไร · 🥉 → 🥈 → 🥇 → 💎</div></div>`;
}
function bindStickers() {
  const g = $('#stk'); if (!g) return;
  g.onclick = (e) => {
    const b = e.target.closest('[data-stk]'); if (!b) return;
    const id = b.dataset.stk, t = topicStat(id), k = tierOf(t);
    g.querySelectorAll('.stk').forEach((x) => x.classList.toggle('sel', x === b));
    $('#stkInfo').innerHTML = `<div class="stk-info"><b>${TOPIC_LABEL[id]}</b> <span class="muted">· ${t.n3} คำในชุด 3000 · ${t.nAll} คำทั้งหมด</span>
      ${STK_TIERS.map((tr, j) => { const [h, need, lab] = tr.need(t); return `<div class="stk-row ${j < k ? 'done' : ''}">${j < k ? '✅' : tr.icon} <b>${tr.name}</b> <span class="muted">${lab} ${Math.min(h, need)}/${need}</span></div>`; }).join('')}
      <button class="btn primary block" id="stkPlay" style="margin-top:10px">🎮 ฝึกหมวดนี้ในเกม</button></div>`;
    $('#stkPlay').onclick = () => { gameSource = 'topic'; gameTopic = id; go('games'); };
  };
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
// Example boxes: the main sentence (used by the games) plus extra sentences for the word's
// other meanings (`w.xe`, optional trailing [[en, th], ...] field of a word row), one box each.
const exParts = (w) => [[w.e, w.et], ...w.xe];
const exampleBox = (w) => exParts(w).map(([e, et]) => `<div class="example"><div class="en" lang="en">${hlExample({ ...w, e })} <button class="say-ex" data-sayex="${esc(e)}" aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(et)}</div></div>`).join('');
// Each 🔊 in the example boxes reads its own sentence.
const bindSayEx = (root, text) => root.querySelectorAll('[data-sayex]').forEach(b => { b.onclick = () => speak(b.dataset.sayex || text); });

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
  if (confettiOff()) { sfx('win'); return; }
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
// Settings-style rows (<div class="set-row"><span>label</span> … control): give unlabelled controls the row text as their name.
function labelRows(root) {
  root.querySelectorAll('.set-row').forEach((r) => {
    const t = r.firstElementChild, c = r.querySelector('input, select');
    if (t && c && t !== c && !c.getAttribute('aria-label')) c.setAttribute('aria-label', t.textContent.replace(/\s+/g, ' ').trim());
  });
}
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

/* ---------- app icon badge (cards due today) ---------- */
// Needs the Badging API (iOS 16.4+ home-screen app, with notification permission). Re-counted after progress
// changes and when the app goes to the background; the daily push also sets it (sw.js) while the app is closed.
let badgeTimer = null;
function updateBadge() {
  if (!navigator.setAppBadge) return;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    try {
      const n = S.settings.badge === false ? 0 : dueList().length;
      (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    } catch (e) { /* unsupported */ }
  }, 800);
}

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
// Animation switches (settings → หน้าตา), each on its own: animPage → page slides (html.no-vt),
// animAnswer → bounce/shake on answers (html.no-ans), confetti. 1.39.1 had one `anim` switch for all three.
if (S.settings.anim === false) { S.settings.animPage = S.settings.animAnswer = S.settings.confetti = false; }
delete S.settings.anim;
function applyAnim() {
  document.documentElement.classList.toggle('no-vt', S.settings.animPage === false);
  document.documentElement.classList.toggle('no-ans', S.settings.animAnswer === false);
}
applyAnim();
const confettiOff = () => S.settings.confetti === false || matchMedia('(prefers-reduced-motion: reduce)').matches;
// Slow speech: speak(text, { slow: true }) (🐢 buttons), or tapping 🔊 again for the same text within
// SLOW_AGAIN ms plays it slower (alternating), unless settings.slowRepeat is false.
const SLOW_AGAIN = 8000;
let lastSaid = { text: '', at: 0, slow: false };
const slowRate = () => Math.max(0.45, Math.round(S.settings.rate * 0.62 * 100) / 100);
function speak(text, opt) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  let slow = opt && opt.slow;
  if (slow == null) slow = S.settings.slowRepeat !== false && lastSaid.text === text && Date.now() - lastSaid.at < SLOW_AGAIN && !lastSaid.slow;
  lastSaid = { text, at: Date.now(), slow: !!slow };
  const u = new SpeechSynthesisUtterance(text);
  const lang = S.settings.accent;
  u.lang = lang; u.rate = slow ? slowRate() : S.settings.rate;
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
const TITLES = { mtest: 'แบบทดสอบประจำเดือน', home: 'ศัพท์ต้องรู้', cards: 'แฟลชการ์ด', games: 'เกมฝึกศัพท์', list: 'คำศัพท์', settings: 'ตั้งค่า', guide: 'คู่มือการใช้งาน', homeset: 'จัดเรียงหน้าแรก', wotdset: 'ตั้งค่าคำประจำวัน', feed: 'ไถศัพท์', stats: 'สถิติ', login: 'เข้าสู่ระบบ', read: 'อ่านเรื่องสั้น', placement: 'วัดระดับ', changelog: 'ประวัติการอัปเดต' };
function go(tab, ...args) {
  if (typeof mustLogin === 'function' && mustLogin() && tab !== 'login') return go('login', true);
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  const prev = current;
  current = tab;
  view.classList.remove('feed-mode');
  view.dataset.route = tab; // CSS uses this for wide (iPad/landscape) layouts
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#title').textContent = TITLES[tab] || 'ศัพท์ต้องรู้';
  view.scrollTop = 0;
  ({ home: renderHome, cards: renderCards, games: renderGames, list: renderList, settings: renderSettings, guide: renderGuide, homeset: renderHomeSet, wotdset: renderWotdSet, feed: renderFeed, stats: renderStats, login: renderLogin, read: renderRead, placement: renderPlacement, changelog: renderChangelog, mtest: renderMonthTest }[tab])(...args);
  updateStreak();
  const a = TAB_ORDER.indexOf(prev), b = TAB_ORDER.indexOf(tab);
  animView(a < 0 || b < 0 || a === b ? 'vin' : b > a ? 'vin-l' : 'vin-r');
}
// Page animation: tabs slide in from the side they sit on, sub pages push in / pop back, the rest fades.
const TAB_ORDER = ['home', 'cards', 'games', 'list', 'settings'];
const VIEW_ANIMS = ['vin', 'vin-l', 'vin-r', 'vin-push', 'vin-pop'];
function animView(cls) {
  view.classList.remove(...VIEW_ANIMS); void view.offsetWidth; view.classList.add(cls);
}
// While a lazy data file loads, show a skeleton instead of a frozen screen (only if it takes > 150 ms
// and nothing else has replaced the page meanwhile). withLoading(loadPairs()).then(renderPairs)
const SKELETON = '<div class="skel" aria-busy="true" aria-label="กำลังโหลด"><i></i><i></i><i></i><i></i></div>';
function withLoading(p) {
  const was = view.firstElementChild;
  const t = setTimeout(() => { if (view.firstElementChild === was) { view.innerHTML = SKELETON; animView('vin'); } }, 150);
  return p.then((v) => { clearTimeout(t); return v; });
}
function updateStreak() {
  const el = $('#streak'), L = levelOf(S.xp);
  el.textContent = '🔥 ' + streakNow() + (S.freeze ? ' · 🧊' + S.freeze : '') + ' · Lv.' + L;
  el.style.setProperty('--xp', Math.min(100, Math.max(0, ((S.xp || 0) - levelStart(L)) / (50 * L) * 100)) + '%'); // progress to the next level
}
view.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
// 🐢 buttons (data-slow = the text) replay slowly on any screen.
document.addEventListener('click', (e) => { const b = e.target.closest('[data-slow]'); if (b) speak(b.dataset.slow, { slow: true }); });
const slowBtn = (text, label = 'ฟังช้า') => `<button class="slow-btn" data-slow="${esc(text)}" aria-label="ฟังช้าๆ">🐢 ${label}</button>`;
$('#streak').addEventListener('click', () => { if (current !== 'stats') go('stats', 'home'); });
// Sub pages carry their own "‹ กลับ" button (id ending in Back); mirror it in the top bar and hide the in-page one.
// Gaining a back button = a sub page opened (push); losing it = went back (pop).
new MutationObserver(() => {
  const had = document.body.classList.contains('has-back'), has = !!view.querySelector('[id$="Back"]');
  document.body.classList.toggle('has-back', has);
  if (has !== had) animView(has ? 'vin-push' : 'vin-pop');
}).observe(view, { childList: true });
$('#topBack').addEventListener('click', () => { const b = view.querySelector('[id$="Back"]'); if (b) b.click(); });
// iPad sidebar extras: reference pages live under the games screen, so open games first (their ‹ กลับ returns there).
const REF_PAGES = { pairs: () => renderPairs(), fams: () => renderFamilies(), syn: () => renderSyn(), affix: () => renderAffix(), phrasal: () => renderPhrasal() };
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (!b.dataset.ref) return go(b.dataset.tab);
  go('games'); REF_PAGES[b.dataset.ref]();
  document.querySelectorAll('.tabbar button').forEach((x) => x.classList.toggle('active', x === b));
});
