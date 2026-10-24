'use strict';

// App version shown in the UI. Bump it (and VERSION in sw.js) on every push.
const APP_VERSION = '1.89.0';

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
// WORDS rows (data/words/<level>.js): [word, pos, level, ipa, thai, example, thai example, topic id, 5 if Oxford 5000-only]
// g = study group: A1–B2 are Oxford 3000; B2x and C1 are the extra Oxford 5000 words.
// Topics (what a word row's topic id means). Pick lists show them grouped: a group id (TOPIC_GROUPS) selects every topic inside it.
const TOPICS = [
  ['people', '👪', 'คนและครอบครัว'], ['anatomy', '🫀', 'ร่างกายและอวัยวะ'], ['health', '🏥', 'สุขภาพและการแพทย์'], ['food', '🍜', 'อาหารและเครื่องดื่ม'],
  ['home', '🏠', 'บ้านและของใช้'], ['clothes', '👕', 'เสื้อผ้าและการแต่งตัว'],
  ['animal', '🐾', 'สัตว์'], ['plant', '🌳', 'พืชและการเกษตร'], ['weather', '⛅', 'อากาศ ภูมิประเทศ สิ่งแวดล้อม'],
  ['places', '📍', 'สถานที่และทิศทาง'], ['transport', '🚗', 'การเดินทางและยานพาหนะ'],
  ['job', '💼', 'งานและอาชีพ'], ['money', '💰', 'เงิน ธุรกิจ การซื้อขาย'],
  ['edu', '🎓', 'การศึกษา'], ['sci', '🔬', 'วิทยาศาสตร์'], ['tech', '💻', 'เทคโนโลยี'],
  ['comm', '💬', 'สื่อสารและภาษา'], ['arts', '🎭', 'ศิลปะและบันเทิง'], ['sport', '⚽', 'กีฬาและงานอดิเรก'],
  ['gov', '🏛️', 'การเมือง การปกครอง การทหาร'], ['law', '⚖️', 'กฎหมายและอาชญากรรม'], ['social', '🌏', 'สังคม วัฒนธรรม ศาสนา'],
  ['clock', '⏰', 'เวลาและความถี่'], ['num', '🔢', 'ตัวเลข'], ['qty', '📏', 'ปริมาณ ขนาด การวัด'],
  ['emo', '😊', 'อารมณ์และความรู้สึก'], ['mind', '🧠', 'ความคิดและการรับรู้'], ['char', '🌟', 'นิสัยและบุคลิก'],
  ['move', '🤸', 'การเคลื่อนไหวและการสัมผัส'], ['make', '🛠️', 'การสร้าง เปลี่ยนแปลง ทำลาย'], ['act', '🏃', 'การกระทำและกระบวนการ'],
  ['look', '👀', 'ลักษณะภายนอก สี เสียง'], ['value', '⭐', 'คุณภาพ คุณค่า ความสำคัญ'], ['degree', '📊', 'ระดับ ความแน่นอน คำขยาย'],
  ['grammar', '🔗', 'คำไวยากรณ์ (the, of, and…)'],
];
const TOPIC_GROUPS = [
  ['body', '💪', 'ร่างกายและสุขภาพ', ['anatomy', 'health']], ['nature', '🌿', 'ธรรมชาติ สัตว์ อากาศ', ['animal', 'plant', 'weather']],
  ['travel', '✈️', 'สถานที่และการเดินทาง', ['places', 'transport']], ['work', '💼', 'งาน เงิน การซื้อขาย', ['job', 'money']],
  ['study', '🔬', 'การศึกษา วิทยาศาสตร์ เทคโนโลยี', ['edu', 'sci', 'tech']], ['media', '🎬', 'สื่อสาร ศิลปะ กีฬา', ['comm', 'arts', 'sport']],
  ['society', '🏛️', 'สังคม การเมือง กฎหมาย', ['gov', 'law', 'social']], ['time', '⏰', 'เวลา ตัวเลข ปริมาณ', ['clock', 'num', 'qty']],
  ['feelings', '💭', 'อารมณ์ ความคิด นิสัย', ['emo', 'mind', 'char']], ['actions', '🏃', 'คำกริยาทั่วไป', ['move', 'make', 'act']],
  ['describe', '🎨', 'คำบรรยายลักษณะ', ['look', 'value', 'degree']],
];
const TOPIC_PARENT = {};
TOPIC_GROUPS.forEach(([g, , , kids]) => kids.forEach((k) => { TOPIC_PARENT[k] = g; }));
// A saved/selected topic (a topic or a whole group) matches a word's topic id.
const topicMatch = (sel, tp) => sel === tp || TOPIC_PARENT[tp] === sel;
// <option>s for a topic <select>: ungrouped topics as they are, big groups as an <optgroup> with a "whole group" row first.
// count(sel) adds the number of words in brackets.
function topicOptions(sel, count) {
  const n = (id) => (count ? ` (${count(id)})` : '');
  const opt = (id, label) => `<option value="${id}" ${sel === id ? 'selected' : ''}>${label}${n(id)}</option>`;
  const seen = new Set(), out = [];
  TOPICS.forEach(([id]) => {
    const g = TOPIC_PARENT[id];
    if (!g) { out.push(opt(id, TOPIC_LABEL[id])); return; }
    if (seen.has(g)) return;
    seen.add(g);
    const [, ic, th, kids] = TOPIC_GROUPS.find((x) => x[0] === g);
    out.push(`<optgroup label="${ic} ${th}">${opt(g, `${ic} ทั้งหมวด ${th}`)}${kids.map((k) => opt(k, `\u00a0\u00a0${TOPIC_LABEL[k]}`)).join('')}</optgroup>`);
  });
  return out.join('');
}
// Topics that were split in 1.57 / 1.58 (old id -> new ids): stickers already earned carry over to every new topic.
const TOPIC_SPLIT = Object.fromEntries(TOPIC_GROUPS.map(([g, , , kids]) => [g, kids]));
// Moves stickers earned on a retired topic id to its new topics (the group ids are not topics any more). Safe to run again.
function topicMigrate(r) {
  for (const [old, ids] of Object.entries(TOPIC_SPLIT)) {
    if (!r.stk || !(old in r.stk)) continue;
    ids.forEach((id) => { r.stk[id] = Math.max(r.stk[id] || 0, r.stk[old] || 0); });
    delete r.stk[old];
  }
  return r;
}
const TOPIC_LABEL = Object.fromEntries([...TOPICS, ...TOPIC_GROUPS].map(([id, ic, th]) => [id, `${ic} ${th}`]));
const W = window.WORDS.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  .map(([w, p, l, i, t, e, et, tp, ...more], idx) => ({ idx, w, p, l, i, t, e, et, g: more.includes(5) ? (l === 'B2' ? 'B2x' : 'C1') : l, tp: tp || '', xe: more.find(Array.isArray) || [] }));
// Goal tags (data/tags.js): hand-picked words for travel, work, exams …; a word may have several.
const TAGS = window.TAGS || [];
const TAG_LABEL = Object.fromEntries(TAGS.map((t) => [t.id, `${t.icon} ${t.th}`]));
const TAGS_OF = new Map();
TAGS.forEach((t) => t.w.forEach((x) => { if (!TAGS_OF.has(x)) TAGS_OF.set(x, []); TAGS_OF.get(x).push(t.id); }));
const tagsOf = (w) => TAGS_OF.get(w.w) || [];
const hasTag = (w, id) => tagsOf(w).includes(id);
// New words follow the chosen topic (settings.topic) and goal tag (settings.goal); empty = any.
const inTopic = (w) => (!S.settings.topic || topicMatch(S.settings.topic, w.tp)) && (!S.settings.goal || hasTag(w, S.settings.goal));
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
// Random id for this install (never in backups): per-device counters are kept apart so syncing can add them up.
const DEV = (() => {
  try { let id = localStorage.getItem('o3k.dev'); if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('o3k.dev', id); } return id; } catch (e) { return 'local'; }
})();
// 1.52.0 kept one flat { game: n } map: it becomes this device's bucket.
const gplayFix = (g) => (g && Object.values(g).some((v) => typeof v === 'number') ? { [DEV]: g } : g || {});
const gamePlays = (id) => Object.values(S.gplay).reduce((n, dev) => n + ((dev && dev[id]) || 0), 0);
// My word sets (js/decks.js). Everything read from storage, a backup or the cloud goes through cleanDecks()/cleanDprog().
const DECK_MAX = { decks: 200, words: 500, name: 40, word: 40, icon: 8, tomb: 90 * 86400000 };
const isNum = (n) => typeof n === 'number' && isFinite(n);
function cleanDecks(a) {
  const byId = new Map();
  for (const x of Array.isArray(a) ? a : []) {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(x.id)) continue;
    const del = x.del === true, seen = new Set(), words = [];
    if (!del) for (const w of Array.isArray(x.words) ? x.words : []) {
      if (typeof w === 'string' && w && w.length <= DECK_MAX.word && !seen.has(w) && words.length < DECK_MAX.words) { seen.add(w); words.push(w); }
    }
    const d = { id: x.id, name: typeof x.name === 'string' ? x.name.slice(0, DECK_MAX.name) : '', icon: typeof x.icon === 'string' && x.icon ? x.icon.slice(0, DECK_MAX.icon) : '📚',
      words, at: isNum(x.at) ? x.at : 0, used: isNum(x.used) ? x.used : 0 };
    if (del) d.del = true;
    if (isNum(x.rst) && x.rst > 0) d.rst = x.rst; // when the set's progress was last restarted
    const o = byId.get(d.id);
    if (!o || d.at > o.at) byId.set(d.id, d);
  }
  const all = [...byId.values()].sort((p, q) => q.at - p.at), live = all.filter((d) => !d.del).slice(0, DECK_MAX.decks);
  return all.filter((d) => d.del).slice(0, DECK_MAX.decks).concat(live);
}
function cleanDprog(o, live) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const [id, m] of Object.entries(o)) {
    if (!live.has(id) || !m || typeof m !== 'object' || Array.isArray(m)) continue;
    const mm = {};
    for (const [w, p] of Object.entries(m)) {
      if (!p || typeof p !== 'object' || !isNum(p.b)) continue;
      const e = { b: p.b };
      for (const k of ['i', 'e', 'd', 's', 'c', 'x']) if (isNum(p[k])) e[k] = p[k];
      mm[w] = e;
    }
    out[id] = mm;
  }
  return out;
}
function sanitizeDecks(r) {
  r.decks = cleanDecks(r.decks).filter((d) => !d.del || Date.now() - d.at <= DECK_MAX.tomb);
  r.dprog = cleanDprog(r.dprog, new Set(r.decks.filter((d) => !d.del).map((d) => d.id)));
  return r;
}
const defaults = () => ({
  prog: {},            // word -> { b: box, d: due ms, s: seen, c: correct, x: wrong }
  settings: { levels: ['A1'], topic: '', goal: '', newPerDay: 20, minutes: 0, scheduler: 'fsrs', retention: 0.9, autoSpeak: true, rate: 0.9, slowRepeat: true, accent: 'en-US', front: 'en', order: 'shuffle', sfx: true, haptic: true, topicTint: true, animPage: true, animAnswer: true, confetti: true, badge: true, start: 'home', rFont: 1, voice: '', theme: 'auto', palette: 'violet', icon: 'purple', wotd: { lv: [], st: [], tp: [] }, gentle: true, weekGoal: 0, frame: '', nextGames: [], gamePin: [], gameHide: [], riddleLv: ['A1', 'A2'] },
  daily: { date: '', fresh: 0, reviews: 0 },
  streak: { last: '', count: 0 },
  best: {},            // game -> best score
  hist: {},            // 'YYYY-MM-DD' -> cards/answers that day
  backupAt: 0,         // ms of the last backup export
  backupSnooze: '',    // date the backup reminder was dismissed
  star: {},            // word -> 1 for starred words
  freeze: 0,           // streak freezes in stock (max MAX_FREEZE)
  ach: {},             // achievement id -> date unlocked
  lex: {},             // skill-game item key -> { b, i, e, d, s, c, x } like prog: wrong items come back on schedule (1.65)
  spc: { t: 0, n: 0 }, // time spent on graded cards: seconds, count (rolling) → seconds per card (1.63)
  mascot: { equip: { head: '', face: '', body: '' }, at: 0 }, // น้องคำ outfit (1.67)
  owned: [],           // item ids won early from the daily box (1.67)
  box: { date: '', got: '' }, // today's mystery box
  evt: {},             // 'eventId-year' -> { r, n, pass, at } seasonal event quiz results (1.72)
  wnew: { key: '', n: 0 }, // new words started this week (1.62)
  readyAt: {},         // story level -> best 'known words' threshold reached (90/95) (1.62)
  repair: null,        // streak repair offer {count, at, base, need, done} (1.61)
  quest: { date: '', q: [], bonus: false }, // today's 3 quests (1.61)
  wq: { key: '', id: '', c: {}, done: false }, // this week's quest (1.61)
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
  ltest: {},           // level -> best level-test result { r, n, at } (1.63)
  mtest: {},           // 'YYYY-MM' -> { r: right, n: questions, at: ms } best monthly-test score
  riddle: { d: '', g: [], over: false, win: false }, // daily word riddle: today's guesses
  lvmap: {},           // topic id -> string of stars (0–3) per level-map stage
  gacc: { a: 0.7, n: 0 }, // rolling accuracy (a) of multiple-choice game answers (n answers) → automatic game difficulty
  duel: {},            // challenge code -> [right, questions, seconds, played at ms] best result per code (latest 30)
  riddleStat: { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], last: '' }, // riddle totals; dist[i] = solved in i+1 tries
  placedAt: '',        // date the placement test was taken/dismissed
  xpWeek: {},          // Monday key -> XP earned that week (friends leaderboard)
  nick: '',            // name shown on the friends leaderboard
  stk: {},             // topic id -> sticker tier reached (1 bronze … 4 diamond)
  wotdPick: null,      // {day, key, w}: today's word of the day (kept steady even as progress changes)
  seenVer: null,       // app version whose "what's new" prompt was shown (device-local, not merged from backups)
  gplay: {},           // device id -> { game id -> rounds started } (summed for the games menu "เล่นบ่อย" row)
  settingsAt: 0,       // ms when settings/homeCfg last changed on any device: the newest copy wins when syncing
  homeCfg: null,       // home layout [{id, on, w: 'full'|'half'}] in display order; null = default (see HOME_BLOCKS)
  decks: [],           // my word sets [{id, name, icon, words: [list words], at: last edit ms, used: last used ms, del: true = deleted}]
  dprog: {},           // deck id -> { word -> { b, i, e, d, s, c, x } } progress of each set (same shape as prog; kept apart from prog)
});
let S = load();
// Users from before 1.8.0 get XP for the work they already did.
if (S.xp == null) S.xp = Object.values(S.prog).reduce((a, p) => a + (p.s || 0) + (p.c || 0), 0);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = defaults(), s = JSON.parse(raw);
      const r = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
      r.gplay = gplayFix(r.gplay);
      // A missing/odd riddle record (older backup, sync from another device) must never break the home screen.
      if (!r.mascot || typeof r.mascot !== 'object' || !r.mascot.equip || typeof r.mascot.equip !== 'object') r.mascot = d.mascot;
      if (!Array.isArray(r.owned)) r.owned = [];
      if (!r.evt || typeof r.evt !== 'object' || Array.isArray(r.evt)) r.evt = {};
      if (!r.box || typeof r.box !== 'object') r.box = d.box;
      if (!r.riddle || typeof r.riddle !== 'object' || !Array.isArray(r.riddle.g)) r.riddle = d.riddle;
      if (!r.riddleStat || typeof r.riddleStat !== 'object') r.riddleStat = d.riddleStat;
      else r.riddleStat = { ...d.riddleStat, ...r.riddleStat, dist: (Array.isArray(r.riddleStat.dist) ? r.riddleStat.dist : []).concat([0, 0, 0, 0, 0, 0]).slice(0, 6) };
      return topicMigrate(sanitizeDecks(r));
    }
  } catch (e) { /* storage unavailable: start fresh */ }
  return defaults();
}
// Settings that are shared across devices: everything in settings + the home layout, except the voice
// (voice ids differ between devices). save() stamps settingsAt when this changes.
const settingsSig = () => JSON.stringify([{ ...S.settings, voice: '' }, S.homeCfg]);
let setSig = null; // baseline taken at the end of boot (boot.js) and after adopting synced settings
// save() is called after every answer, so the heavy part (medal / sticker / snapshot checks and stringifying all of S)
// is batched: it runs once ~300 ms after the last save(), and right away when the app is hidden or closed (1.73).
// flushSave() does it now (backup export, tests).
let saveTimer = 0, saveDirty = false;
function save() {
  const sig = settingsSig();
  if (setSig !== null && sig !== setSig) S.settingsAt = Date.now();
  setSig = sig;
  saveDirty = true;
  if (!saveTimer) saveTimer = setTimeout(flushSave, 300);
  if (typeof schedulePush === 'function') schedulePush();
  if (typeof updateBadge === 'function') updateBadge();
}
function flushSave() {
  clearTimeout(saveTimer); saveTimer = 0;
  if (!saveDirty) return;
  saveDirty = false;
  if (typeof checkAch === 'function') checkAch(); // may call save() again (new medal): that one flushes in another 300 ms
  if (typeof takeSnap === 'function') takeSnap();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
addEventListener('pagehide', flushSave);

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
  flushSave();
  const name = `essential-vocab-backup-${today()}.json`;
  const file = new File([JSON.stringify({ ...S, backupAt: Date.now() })], name, { type: 'application/json' });
  if (await saveFile(file, 'ศัพท์ต้องรู้ backup')) { S.backupAt = Date.now(); save(); toast('สำรองข้อมูลแล้ว ✅'); }
}

const needsBackup = () => Object.keys(S.prog).length >= 10
  && Date.now() - (S.backupAt || 0) > BACKUP_EVERY * DAY && S.backupSnooze !== today()
  && !(typeof syncOn === 'function' && syncOn() && auth); // signed-in cloud sync is the backup

// Merge a backup into the current state, keeping whichever side is further along for each word.
const progAhead = (a, b) => (a.b - b.b) || ((a.s || 0) - (b.s || 0)) || ((a.d || 0) - (b.d || 0));
// My word sets: per set the newer edit (`at`) wins, deleted sets stay as tombstones for 90 days so a deletion also reaches
// other devices and old backups; progress is merged per word like prog, and only for sets that still exist.
function mergeDecks(d) {
  const before = JSON.stringify([S.decks, S.dprog]), now = Date.now();
  const theirDecks = cleanDecks(d.decks);
  const loc = new Map(S.decks.map((x) => [x.id, x.rst || 0])), inc = new Map(theirDecks.map((x) => [x.id, x.rst || 0]));
  const map = new Map(S.decks.map((x) => [x.id, x]));
  for (const t of theirDecks) {
    const m = map.get(t.id);
    if (!m) map.set(t.id, t);
    else if (t.at > m.at) map.set(t.id, { ...t, used: Math.max(t.used, m.used) });
    else if (t.used > m.used) m.used = t.used;
  }
  for (const [id, x] of map) { const r = Math.max(loc.get(id) || 0, inc.get(id) || 0); if (r) x.rst = r; }
  S.decks = cleanDecks([...map.values()]).filter((x) => !x.del || now - x.at <= DECK_MAX.tomb);
  // In place: a study session in progress keeps its reference to S.dprog[id].
  const live = new Set(S.decks.filter((x) => !x.del).map((x) => x.id));
  for (const id of Object.keys(S.dprog)) if (!live.has(id)) delete S.dprog[id];
  // "Start this set again" bumps rst: progress from an older start (cloud copy, old backup) must not flow back in,
  // and a device still on the older start is wiped when the newer one arrives.
  const theirs = cleanDprog(d.dprog, live);
  for (const id of live) {
    const lr = loc.get(id) || 0, ir = inc.get(id) || 0;
    if (ir > lr && S.dprog[id]) for (const k of Object.keys(S.dprog[id])) delete S.dprog[id][k];
    if (ir < lr || !theirs[id]) continue;
    const cur = S.dprog[id] || (S.dprog[id] = {});
    for (const [w, p] of Object.entries(theirs[id])) if (!cur[w] || progAhead(p, cur[w]) > 0) cur[w] = p;
  }
  if (typeof current !== 'undefined' && current === 'decks' && before !== JSON.stringify([S.decks, S.dprog]) && !view.querySelector('#dkBack')) setTimeout(() => go('decks'), 0);
}
function mergeBackup(d) {
  const ahead = progAhead;
  let added = 0, updated = 0;
  const fresh = Object.keys(S.prog).length === 0;
  for (const [w, p] of Object.entries(d.prog || {})) {
    if (!p || typeof p.b !== 'number') continue;
    const cur = S.prog[w];
    if (!cur) { S.prog[w] = p; added++; }
    else if (ahead(p, cur) > 0) { S.prog[w] = p; updated++; }
  }
  for (const [k, p] of Object.entries(d.lex || {})) {
    if (!p || typeof p.b !== 'number' || typeof p.d !== 'number') continue;
    if (!S.lex[k] || progAhead(p, S.lex[k]) > 0) S.lex[k] = p;
  }
  for (const [k, v] of Object.entries(d.hist || {})) S.hist[k] = Math.max(S.hist[k] || 0, v);
  for (const [k, v] of Object.entries(d.best || {})) S.best[k] = Math.max(S.best[k] || 0, v);
  for (const [dev, m] of Object.entries(gplayFix(d.gplay))) {
    const mine = S.gplay[dev] || (S.gplay[dev] = {});
    for (const [k, v] of Object.entries(m || {})) mine[k] = Math.max(mine[k] || 0, v);
  }
  if (d.streak && ((d.streak.last || '') > (S.streak.last || '') || (d.streak.last === S.streak.last && d.streak.count > S.streak.count))) S.streak = d.streak;
  if (d.daily && d.daily.date === S.daily.date) {
    S.daily.fresh = Math.max(S.daily.fresh, d.daily.fresh || 0);
    S.daily.reviews = Math.max(S.daily.reviews, d.daily.reviews || 0);
  } else if (d.daily && d.daily.date > S.daily.date) S.daily = d.daily;
  // Settings: the copy changed most recently wins (a fresh device takes the backup's); the voice stays per device.
  if (d.settings && ((fresh && !S.settingsAt) || (d.settingsAt || 0) > (S.settingsAt || 0))) {
    S.settings = { ...defaults().settings, ...d.settings, voice: S.settings.voice || '' };
    if (Array.isArray(d.homeCfg) || d.homeCfg === null) S.homeCfg = d.homeCfg;
    S.settingsAt = Math.max(S.settingsAt || 0, d.settingsAt || 0);
    setSig = settingsSig();
    if (typeof applyTheme === 'function') { applyTheme(); applyIcon(); }
    if (typeof current !== 'undefined' && current === 'settings') setTimeout(() => go(current), 0);
  }
  S.backupAt = Math.max(S.backupAt || 0, d.backupAt || 0);
  Object.assign(S.star, d.star || {});
  for (const [k, v] of Object.entries(d.ach || {})) if (!S.ach[k]) S.ach[k] = v;
  if (d.mascot && d.mascot.equip && (d.mascot.at || 0) > (S.mascot.at || 0)) S.mascot = d.mascot;
  if (Array.isArray(d.owned)) S.owned = [...new Set([...S.owned, ...d.owned.filter((x) => typeof x === 'string')])];
  for (const [k, v] of Object.entries(d.evt || {})) if (v && v.n) { const m = S.evt[k]; S.evt[k] = !m ? v : { ...(v.r > m.r ? v : m), pass: !!(m.pass || v.pass) }; }
  if (d.box && d.box.date && d.box.date > (S.box.date || '')) S.box = d.box;
  if (d.wnew && d.wnew.key) {
    if (d.wnew.key > (S.wnew.key || '')) S.wnew = d.wnew; else if (d.wnew.key === S.wnew.key) S.wnew.n = Math.max(S.wnew.n, d.wnew.n || 0);
  }
  for (const [k, v] of Object.entries(d.readyAt || {})) S.readyAt[k] = Math.max(S.readyAt[k] || 0, v);
  if (d.repair && d.repair.at && (!S.repair || d.repair.at > S.repair.at)) S.repair = d.repair;
  if (d.wq && d.wq.key) {
    if (d.wq.key > (S.wq.key || '')) S.wq = d.wq;
    else if (d.wq.key === S.wq.key) {
      S.wq.done = S.wq.done || !!d.wq.done; S.wq.c = S.wq.c || {};
      for (const [k, v] of Object.entries(d.wq.c || {})) S.wq.c[k] = Math.max(S.wq.c[k] || 0, v);
    }
  }
  for (const [k, v] of Object.entries(d.counts || {})) S.counts[k] = Math.max(S.counts[k] || 0, v);
  S.freeze = Math.max(S.freeze || 0, d.freeze || 0);
  if (d.spc && d.spc.n > (S.spc.n || 0)) S.spc = { t: +d.spc.t || 0, n: +d.spc.n || 0 };
  if ((d.weekSeen || '') > (S.weekSeen || '')) S.weekSeen = d.weekSeen;
  if ((d.monthSeen || '') > (S.monthSeen || '')) S.monthSeen = d.monthSeen;
  S.xp = Math.max(S.xp || 0, d.xp || 0);
  if (d.chistFrom && (!S.chistFrom || d.chistFrom < S.chistFrom)) S.chistFrom = d.chistFrom;
  for (const [k, v] of Object.entries(d.note || {})) if (!S.note[k]) S.note[k] = v;
  for (const [k, v] of Object.entries(d.miss || {})) S.miss[k] = { ...v, ...(S.miss[k] || {}) };
  if (d.placedAt && !S.placedAt) S.placedAt = d.placedAt;
  for (const [k, v] of Object.entries(d.xpWeek || {})) S.xpWeek[k] = Math.max(S.xpWeek[k] || 0, v);
  if (d.nick && !S.nick) S.nick = d.nick;
  if (Array.isArray(d.homeCfg) && !S.homeCfg) S.homeCfg = d.homeCfg; // older backups without settingsAt
  for (const [k, v] of Object.entries(d.read || {})) if (!S.read[k]) S.read[k] = v;
  for (const [k, v] of Object.entries(d.stk || {})) S.stk[k] = Math.max(S.stk[k] || 0, v);
  for (const [k, v] of Object.entries(d.readScore || {})) if (!S.readScore[k] || v[0] > S.readScore[k][0]) S.readScore[k] = v;
  if (d.riddle && (d.riddle.d > S.riddle.d || (d.riddle.d === S.riddle.d && (d.riddle.g || []).length > S.riddle.g.length))) S.riddle = { d: d.riddle.d, g: d.riddle.g || [], over: !!d.riddle.over, win: !!d.riddle.win, lv: d.riddle.lv || ['A1', 'A2'] };
  if (d.riddleStat && d.riddleStat.played > S.riddleStat.played) S.riddleStat = { ...S.riddleStat, ...d.riddleStat, dist: (d.riddleStat.dist || []).concat([0, 0, 0, 0, 0, 0]).slice(0, 6) };
  for (const [k, v] of Object.entries(d.ltest || {})) if (v && v.n && (!S.ltest[k] || v.r / v.n > S.ltest[k].r / S.ltest[k].n)) S.ltest[k] = v;
  for (const [k, v] of Object.entries(d.lvmap || {})) {
    const a = String(S.lvmap[k] || ''), b = String(v || '').replace(/[^0-3]/g, '');
    S.lvmap[k] = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Math.max(+a[i] || 0, +b[i] || 0)).join('');
  }
  if (d.gacc && d.gacc.n > (S.gacc.n || 0)) S.gacc = { a: +d.gacc.a || 0.7, n: d.gacc.n | 0 };
  for (const [k, v] of Object.entries(d.duel || {})) if (Array.isArray(v) && (!Array.isArray(S.duel[k]) || v[0] > S.duel[k][0] || (v[0] === S.duel[k][0] && v[2] < S.duel[k][2]))) S.duel[k] = v;
  S.duel = Object.fromEntries(Object.entries(S.duel).sort((a, b) => b[1][3] - a[1][3]).slice(0, 30));
  for (const [k, v] of Object.entries(d.mtest || {})) if (!S.mtest[k] || v.r / v.n > S.mtest[k].r / S.mtest[k].n) S.mtest[k] = v;
  for (const [k, v] of Object.entries(d.chist || {})) S.chist[k] = Math.max(S.chist[k] || 0, v);
  for (const [k, v] of Object.entries(d.snap || {})) S.snap[k] = (S.snap[k] || [0, 0, 0, 0]).map((x, i) => Math.max(x, v[i] || 0));
  mergeDecks(d);
  topicMigrate(S);
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
// Streak repair (1.61): a streak of 3+ days that broke can be repaired within 48 h of coming back by doing
// 2x today's goal in cards/answers (S.hist). S.repair = {count: lost streak, at: ms, base: activity already counted, need, done}.
const REPAIR_MS = 48 * 3600 * 1000;
function repairInfo() {
  const r = S.repair;
  if (!r || r.done || !r.at || Date.now() - r.at > REPAIR_MS) return null;
  const from = new Date(r.at).toLocaleDateString('en-CA');
  let n = 0; for (const k of Object.keys(S.hist)) if (k >= from) n += S.hist[k];
  return { r, n: Math.max(0, n - (r.base || 0)), left: REPAIR_MS - (Date.now() - r.at) };
}
function repairCheck() {
  const i = repairInfo();
  if (!i || i.n < i.r.need) return;
  i.r.done = true;
  S.streak.count += i.r.count;
  S.counts.repairs = (S.counts.repairs || 0) + 1;
  setTimeout(() => { confetti(); toast(`🔥 ซ่อมสตรีคสำเร็จ! กลับมาเป็น ${S.streak.count} วัน`); }, 900);
  updateStreak();
}
function markActive() {
  rollDay();
  const t = today();
  S.hist[t] = (S.hist[t] || 0) + 1;
  // secret medals (1.61): time-of-day / date based
  const now = new Date(), hr = now.getHours();
  if (hr === 5) S.counts.early = 1;
  if (hr < 3) S.counts.owl = 1;
  if (now.getMonth() === 0 && now.getDate() === 1) S.counts.newyear = 1;
  if (S.streak.last === t) return repairCheck();
  const missed = S.streak.last ? dayDiff(t, S.streak.last) - 1 : Infinity;
  if (missed === 0) S.streak.count++;
  else if (S.streak.count && missed <= S.freeze) {
    // 🧊 Streak freezes cover the missed days.
    S.freeze -= missed; S.streak.count++;
    setTimeout(() => toast(`🧊 ใช้ตัวกันสตรีค ${missed} อัน สตรีคไม่ขาด!`), 400);
  } else {
    const lost = S.streak.count;
    S.streak.count = 1;
    if (missed >= 30 && missed !== Infinity) S.counts.comeback = 1;
    if (lost >= 3) {
      S.repair = { count: lost, at: Date.now(), base: S.hist[t], need: Math.max(20, 2 * newGoal()), done: false };
      setTimeout(() => toast(`💔 สตรีค ${lost} วันขาดไป แต่ซ่อมได้ภายใน 48 ชม.! ดูที่หน้าแรก`), 1500);
    }
  }
  S.streak.last = t;
  setTimeout(() => streakFlash(S.streak.count), 500);
  if (S.streak.count % 7 === 0 && S.freeze < MAX_FREEZE) {
    S.freeze++;
    setTimeout(() => toast('🧊 ได้ตัวกันสตรีคเพิ่ม 1 อัน (เรียนต่อเนื่องครบ 7 วัน)'), 1500);
  }
  updateStreak();
  repairCheck();
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
// 1.61: three daily quests (easy / medium / hard, picked per day) + one weekly quest.
// ev(n, type, d) returns the new progress for an event; types: card, answer, round, match, story, leech.
const QTIER = [{ icon: '🟢', name: 'ง่าย', xp: 10 }, { icon: '🟡', name: 'กลาง', xp: 15 }, { icon: '🔴', name: 'ท้าทาย', xp: 25 }];
const QSET_XP = 40, WQ_XP = 100;
const QUESTS = [
  { id: 'cards15', tier: 0, text: 'ทำแฟลชการ์ด 15 ใบ', target: 15, ev: (n, t) => (t === 'card' ? n + 1 : n) },
  { id: 'match', tier: 0, text: 'จับคู่ด่วนให้จบ โดยผิดไม่เกิน 2 ครั้ง', target: 1, game: 'match', ev: (n, t, d) => (t === 'match' && d.mistakes <= 2 ? n + 1 : n) },
  { id: 'feed', tier: 0, text: 'ไถศัพท์ ตอบถูก 15 ข้อ', target: 15, go: 'feed', ev: (n, t, d) => (t === 'answer' && d.game === 'feed' && d.ok ? n + 1 : n) },
  { id: 'story', tier: 0, text: 'อ่านเรื่องสั้นให้จบ 1 เรื่อง', target: 1, go: 'read', ev: (n, t) => (t === 'story' ? n + 1 : n) },
  { id: 'cards', tier: 1, text: 'ทำแฟลชการ์ดให้ครบ 30 ใบ', target: 30, ev: (n, t) => (t === 'card' ? n + 1 : n) },
  { id: 'fresh', tier: 1, text: 'เรียนคำใหม่ให้ครบเป้าวันนี้', target: () => newGoal(), ev: (n, t) => (t === 'card' ? S.daily.fresh : n) },
  { id: 'cloze', tier: 1, text: 'เติมคำในประโยค ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'cloze', ev: (n, t, d) => (t === 'round' && d.game === 'cloze' && d.correct >= 8 ? n + 1 : n) },
  { id: 'listen', tier: 1, text: 'ฟังแล้วตอบ ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'listen', ev: (n, t, d) => (t === 'round' && d.game === 'listen' && d.correct >= 8 ? n + 1 : n) },
  { id: 'th2en', tier: 1, text: 'ทายคำศัพท์ ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'th2en', ev: (n, t, d) => (t === 'round' && d.game === 'th2en' && d.correct >= 8 ? n + 1 : n) },
  { id: 'spell', tier: 1, text: 'สะกดคำถูกรวม 10 คำ', target: 10, game: 'spell', ev: (n, t, d) => (t === 'answer' && d.game === 'spell' && d.ok ? n + 1 : n) },
  { id: 'combo', tier: 2, text: 'ทำคอมโบ x6 ในเกมไหนก็ได้', target: 1, game: 'en2th', ev: (n, t, d) => (t === 'round' && d.bestCombo >= 6 ? n + 1 : n) },
  { id: 'speak', tier: 2, text: 'พูดตามถูกรวม 10 คำ', target: 10, game: 'speak', needs: () => canListen, ev: (n, t, d) => (t === 'answer' && d.game === 'speak' && d.ok ? n + 1 : n) },
  { id: 'leech3', tier: 2, text: 'ปราบคำดื้อ: ตอบคำดื้อถูก 3 ครั้ง', target: 3, go: 'cards', needs: () => W.filter(isLeech).length >= 3, ev: (n, t) => (t === 'leech' ? n + 1 : n) },
  { id: 'skill', tier: 2, text: 'เกมฝึกทักษะ (ไวยากรณ์ ศัพท์เชื่อมโยง ฯลฯ) ถูก 8 ข้อขึ้นไปในรอบเดียว', target: 1, game: 'syn', ev: (n, t, d) => (t === 'round' && SKILL_GAMES.includes(d.game) && d.correct >= 8 ? n + 1 : n) },
  { id: 'perfect', tier: 2, text: 'เล่นเกมไหนก็ได้ ให้ถูกเต็ม 10/10', target: 1, game: 'th2en', ev: (n, t, d) => (t === 'round' && d.perfect ? n + 1 : n) },
];
const dayHash = (str) => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function pickQuests(t) {
  return [0, 1, 2].map((tier) => {
    const list = QUESTS.filter((q) => q.tier === tier && (!q.needs || q.needs()));
    return list[dayHash(t + tier) % list.length].id;
  });
}
// Today's three quests as [{def, st}] (st = {id, n, done} stored in S.quest.q); a new day, or the pre-1.61 shape, draws a fresh set.
function questDefs() {
  const t = today();
  if (S.quest.date !== t || !Array.isArray(S.quest.q) || S.quest.q.length !== 3 || S.quest.q.some((x) => !x || !QUESTS.some((q) => q.id === x.id))) {
    S.quest = { date: t, q: pickQuests(t).map((id) => ({ id, n: 0, done: false })), bonus: false };
  }
  return S.quest.q.map((st) => ({ def: QUESTS.find((q) => q.id === st.id), st }));
}
const questTarget = (q) => (typeof q.target === 'function' ? q.target() : q.target);

// Weekly quest: counters in S.wq.c, or `calc` reads the state directly.
const WQUESTS = [
  { id: 'days5', text: 'เล่นให้ครบ 5 วันในสัปดาห์นี้', target: 5, go: 'cards', calc: () => Object.keys(S.hist).filter((k) => k >= mondayKey() && S.hist[k] > 0).length },
  { id: 'read3', text: 'อ่านเรื่องสั้นให้ครบ 3 เรื่องในสัปดาห์นี้', target: 3, go: 'read', calc: () => Object.values(S.read).filter((d) => d >= mondayKey()).length },
  { id: 'sets3', text: 'ทำภารกิจประจำวันครบทั้ง 3 ข้อ 3 วัน', target: 3, go: 'cards', c: 'sets' },
  { id: 'leech10', text: 'ปราบคำดื้อ: ตอบคำดื้อถูกรวม 10 ครั้ง', target: 10, go: 'cards', c: 'leech', needs: () => W.filter(isLeech).length >= 3 },
  { id: 'skill5', text: 'เล่นเกมฝึกทักษะให้ครบ 5 รอบ', target: 5, go: 'games', c: 'skill' },
  { id: 'xp300', text: 'เก็บ XP ให้ได้ 300 ในสัปดาห์นี้', target: 300, go: 'cards', calc: () => S.xpWeek[mondayKey()] || 0 },
];
function weekQuest() {
  const k = mondayKey();
  if (!S.wq || typeof S.wq !== 'object' || S.wq.key !== k || !WQUESTS.some((q) => q.id === S.wq.id)) {
    const list = WQUESTS.filter((q) => !q.needs || q.needs());
    S.wq = { key: k, id: list[dayHash(k) % list.length].id, c: {}, done: false };
  }
  const def = WQUESTS.find((q) => q.id === S.wq.id);
  return { def, st: S.wq, n: Math.min(def.target, def.calc ? def.calc() : (S.wq.c || {})[def.c] || 0) };
}
function questEvent(type, d = {}) {
  const list = questDefs(), fin = [];
  for (const { def, st } of list) {
    if (st.done) continue;
    st.n = def.ev(st.n, type, d);
    if (st.n >= questTarget(def)) {
      st.done = true; fin.push(def);
      S.counts.quests = (S.counts.quests || 0) + 1;
      addXP(QTIER[def.tier].xp);
    }
  }
  const wq = weekQuest(); S.wq.c = S.wq.c || {};
  if (type === 'leech') { S.wq.c.leech = (S.wq.c.leech || 0) + 1; S.counts.leechWins = (S.counts.leechWins || 0) + 1; }
  if (type === 'round' && SKILL_GAMES.includes(d.game)) S.wq.c.skill = (S.wq.c.skill || 0) + 1;
  let bonus = false;
  if (!S.quest.bonus && list.every((x) => x.st.done)) {
    S.quest.bonus = bonus = true;
    S.counts.qsets = (S.counts.qsets || 0) + 1;
    S.wq.c.sets = (S.wq.c.sets || 0) + 1;
    addXP(QSET_XP);
    if (S.counts.qsets % 3 === 0 && S.freeze < MAX_FREEZE) S.freeze++;
  }
  let wdone = false;
  if (!S.wq.done && weekQuest().n >= wq.def.target) {
    S.wq.done = wdone = true;
    S.counts.wquests = (S.counts.wquests || 0) + 1;
    addXP(WQ_XP);
    if (S.freeze < MAX_FREEZE) S.freeze++;
  }
  if (wdone) setTimeout(() => { confetti(); toast(`🗓️ ภารกิจสัปดาห์สำเร็จ! +${WQ_XP} XP และ 🧊`); }, 1300);
  else if (bonus) setTimeout(() => { confetti(); toast(`🎁 ครบทั้ง 3 ภารกิจ! โบนัส +${QSET_XP} XP${S.counts.qsets % 3 === 0 ? ' และ 🧊' : ''}`); }, 700);
  else if (fin.length) setTimeout(() => toast(`🎯 ภารกิจสำเร็จ +${QTIER[fin[0].tier].xp} XP · ${questDefs().filter((x) => x.st.done).length}/3`), 700);
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
  if (after > before) setTimeout(() => levelUpScreen(after, before), 400);
  updateStreak();
  if (n > 0) xpFly(n);
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
  { id: 'read10', icon: '📖', name: 'หนอนหนังสือ', desc: 'อ่านเรื่องสั้นครบ 10 เรื่อง', ok: (s) => s.read >= 10 },
  { id: 'read50', icon: '📚', name: 'นักอ่านตัวยง', desc: 'อ่านเรื่องสั้นครบ 50 เรื่อง', ok: (s) => s.read >= 50 },
  { id: 'readall', icon: '🏛️', name: 'ห้องสมุดเดินได้', desc: 'อ่านเรื่องสั้นครบทุกเรื่อง', ok: (s) => typeof STORY_COUNT !== 'undefined' && s.read >= STORY_COUNT },
  { id: 'boss1', icon: '👾', name: 'นักล่าบอส', desc: 'ปราบบอสคำดื้อในไถศัพท์ 1 ตัว', ok: (s) => s.bosses >= 1 },
  { id: 'boss10', icon: '🗡️', name: 'ฆาตกรคำดื้อ', desc: 'ปราบบอสคำดื้อ 10 ตัว', ok: (s) => s.bosses >= 10 },
  { id: 'leech25', icon: '🐢', name: 'ใจเย็นสู้', desc: 'ตอบคำดื้อถูกรวม 25 ครั้ง', ok: (s) => s.leechWins >= 25 },
  { id: 'allgames', icon: '🎮', name: 'เล่นครบทุกเกม', desc: 'ลองเล่นเกมครบทุกแบบ', ok: (s) => s.allGames },
  { id: 'mtest', icon: '📝', name: 'เต็มร้อยประจำเดือน', desc: 'แบบทดสอบประจำเดือนได้เต็ม', ok: (s) => s.mtestFull },
  { id: 'combo30', icon: '🔥', name: 'คอมโบ 30', desc: 'ตอบถูกติดกัน 30 ข้อ', ok: (s) => s.maxCombo >= 30 },
  { id: 'notes20', icon: '✍️', name: 'นักจดวิธีจำ', desc: 'เขียนวิธีจำ 20 คำ', ok: (s) => s.notes >= 20 },
  { id: 'qsets10', icon: '🎁', name: 'ครบชุดภารกิจ', desc: 'ทำครบ 3 ภารกิจประจำวัน 10 วัน', ok: (s) => s.qsets >= 10 },
  { id: 'wq4', icon: '🗓️', name: 'สัปดาห์สำเร็จ', desc: 'ทำภารกิจประจำสัปดาห์สำเร็จ 4 ครั้ง', ok: (s) => s.wquests >= 4 },
  { id: 'repair', icon: '🩹', name: 'ซ่อมสตรีค', desc: 'ซ่อมสตรีคที่ขาดสำเร็จ', ok: (s) => s.repairs >= 1 },
  { id: 'evt1', icon: '🏷️', name: 'นักสะสมเทศกาล', desc: 'ผ่านควิซกิจกรรมเทศกาล 1 ครั้ง', ok: (s) => s.events >= 1 },
  { id: 'evt4', icon: '🎊', name: 'ครบทุกเทศกาล', desc: 'ผ่านควิซกิจกรรมครบทั้ง 4 เทศกาล (ฮาโลวีน สงกรานต์ ลอยกระทง ปีใหม่)', ok: (s) => s.events >= 4 },
  { id: 'early', icon: '🌅', name: 'นกที่ตื่นเช้า', desc: 'เรียนตอนตี 5', secret: true, ok: (s) => s.early },
  { id: 'owl', icon: '🦉', name: 'นกฮูกยามดึก', desc: 'เรียนหลังเที่ยงคืนถึงตีสาม', secret: true, ok: (s) => s.owl },
  { id: 'newyear', icon: '🎆', name: 'เริ่มปีด้วยศัพท์', desc: 'เรียนในวันปีใหม่ 1 มกราคม', secret: true, ok: (s) => s.newyear },
  { id: 'comeback', icon: '🦋', name: 'กลับมาอีกครั้ง', desc: 'กลับมาเรียนหลังหายไปเกิน 30 วัน', secret: true, ok: (s) => s.comeback },
  ...LEVELS.map((l) => ({ id: 'lt' + l, icon: '🎓', name: `ผ่านทดสอบ ${LV_LABEL[l]}`, desc: `ผ่านแบบทดสอบจบระดับ ${LV_LABEL[l]} (ตั้งแต่ 80%)`, ok: (s) => s.lt[l] })),
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
    read: Object.keys(S.read).length, bosses: S.counts.bosses || 0, leechWins: S.counts.leechWins || 0, maxCombo: S.counts.maxCombo || 0,
    notes: Object.keys(S.note).length, qsets: S.counts.qsets || 0, wquests: S.counts.wquests || 0, repairs: S.counts.repairs || 0,
    early: S.counts.early, owl: S.counts.owl, newyear: S.counts.newyear, comeback: S.counts.comeback,
    allGames: typeof GAMES !== 'undefined' && Object.keys(GAMES).every((g) => gamePlays(g) > 0 || (!canListen && /^speak/.test(g))),
    lt: Object.fromEntries(LEVELS.map((l) => [l, ((m) => !!(m && m.n && m.r / m.n >= 0.8))(S.ltest[l])])),
    events: new Set(Object.entries(S.evt).filter(([, v]) => v && v.pass).map(([k]) => k.replace(/-\d+$/, ''))).size,
    mtestFull: Object.values(S.mtest).some((m) => m && m.n && m.r === m.n),
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
  haptic(kind);
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

/* ---------- feedback: haptics, floating XP, streak + level-up screens ---------- */
// Haptics: iOS Safari has no navigator.vibrate, but iOS 18+ gives a light tick whenever an <input type="checkbox" switch>
// is toggled, so a hidden one is clicked from the answer handler (needs a user gesture). Android uses navigator.vibrate.
// right = one tick, wrong = two, win = three. Switch: settings.haptic.
let hapInput = null;
function haptic(kind) {
  if (S.settings.haptic === false) return;
  const ticks = { ok: 1, bad: 2, win: 3 }[kind] || 1;
  try {
    if (navigator.vibrate && navigator.userActivation && navigator.userActivation.isActive) navigator.vibrate(kind === 'bad' ? [25, 50, 25] : kind === 'win' ? [20, 40, 20, 40, 40] : 15);
    if (!hapInput) {
      const l = document.createElement('label');
      l.className = 'hap'; l.setAttribute('aria-hidden', 'true');
      l.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-label="สั่นตอบรับ">';
      document.body.appendChild(l); hapInput = l.firstChild;
    }
    for (let k = 0; k < ticks; k++) setTimeout(() => hapInput.click(), k * 90);
  } catch (e) { /* no haptics here */ }
}
// "+N XP" flies from the last tap to the Lv. chip at the top, which then gives a small bump.
let lastTap = { x: 0, y: 0, t: 0 }, xpFlyAt = 0;
document.addEventListener('pointerdown', (e) => { lastTap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
function xpFly(n) {
  if (S.settings.animAnswer === false || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const chip = $('#streak'), now = Date.now();
  if (!chip || !chip.animate || now - xpFlyAt < 120) return;
  xpFlyAt = now;
  const to = chip.getBoundingClientRect(), tap = now - lastTap.t < 4000;
  const x = tap ? lastTap.x : innerWidth / 2, y = tap ? lastTap.y : innerHeight * 0.6;
  const el = document.createElement('div');
  el.className = 'xp-fly'; el.textContent = '+' + n + ' XP'; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const at = (px, py, sc) => `translate(${px}px, ${py}px) translate(-50%, -50%) scale(${sc})`;
  const end = () => { el.remove(); chip.classList.add('bump'); setTimeout(() => chip.classList.remove('bump'), 320); };
  const a = el.animate([{ transform: at(x, y, .6), opacity: 0 }, { transform: at(x, y - 30, 1.1), opacity: 1, offset: .22 },
    { transform: at(to.left + to.width / 2, to.top + to.height / 2, .7), opacity: .25 }], { duration: 800, easing: 'cubic-bezier(.5,0,.3,1)' });
  a.onfinish = end;
  setTimeout(() => el.isConnected && end(), 1500);
}
// First activity of the day: 🔥 pops and the streak number counts up. Never blocks taps (pointer-events: none).
function streakFlash(count) {
  if (confettiOff() || !count) return;
  const el = document.createElement('div');
  el.className = 'celebrate streak-flash'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="cel-card"><div class="cel-fire" aria-hidden="true">🔥</div><div class="cel-num">${count > 1 ? count - 1 : 1}</div>
    <div class="cel-t">${count > 1 ? 'วันติดต่อกัน!' : 'เริ่มสตรีควันแรกแล้ว!'}</div></div>`;
  document.body.appendChild(el);
  const num = el.querySelector('.cel-num');
  if (count > 1) setTimeout(() => { num.textContent = count; num.classList.add('up'); }, 650);
  setTimeout(() => el.classList.add('out'), 2000);
  setTimeout(() => el.remove(), 2400);
}
// Level-up: full screen with what was unlocked (level medals) and the XP to the next level. Tap or the button closes it.
function levelUpScreen(L, before = L - 1) {
  confetti();
  if (confettiOff()) { toast(`⬆️ เลเวลอัป! ตอนนี้ Lv.${L}`); return; }
  document.querySelectorAll('.lvlup').forEach((x) => x.remove());
  const medals = ACH.filter((a) => /^lvl/.test(a.id)).filter((a) => { try { return a.ok({ level: L }) && !a.ok({ level: L - 1 }); } catch (e) { return false; } });
  const newItems = typeof ITEMS !== 'undefined' ? ITEMS.filter((x) => x.lv > before && x.lv <= L) : [];
  const el = document.createElement('div');
  el.className = 'celebrate lvlup'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'เลเวลอัป');
  el.innerHTML = `<div class="cel-card"><div class="cel-badge" aria-hidden="true">Lv.<b>${L}</b></div><div class="h2">เลเวลอัป!</div>
    <p>เก่งมาก! ตอนนี้ถึง Lv.${L} แล้ว</p>
    ${medals.length ? `<div class="cel-unlock">🏅 ปลดล็อกเหรียญ ${medals.map((a) => `${a.icon} ${esc(a.name)}`).join(' · ')}</div>` : ''}
    ${newItems.length ? `<div class="cel-unlock">🎁 ปลดล็อกของใหม่ ${newItems.map((x) => `${x.ic} ${esc(x.name)}`).join(' · ')} (ดูที่ น้องคำ)</div>` : ''}
    <p class="small muted">อีก ${(levelStart(L + 1) - S.xp).toLocaleString()} XP ถึง Lv.${L + 1}</p>
    <button class="btn primary block" data-close>ไปต่อ</button></div>`;
  const close = () => { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 250); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  // Mid-session (cards, games, feed) it must not swallow taps: it floats, ignores pointers and leaves by itself sooner.
  const soft = ['cards', 'games', 'feed'].includes(view.dataset.route);
  if (soft) el.classList.add('soft');
  const t = setTimeout(close, soft ? 2800 : 5000);
  el.onclick = close;
  document.addEventListener('keydown', esc_);
  document.body.appendChild(el);
  const b = el.querySelector('[data-close]'); if (b) b.focus({ preventScroll: true });
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

// SRS functions take the progress table as the last parameter (default = the main S.prog). My word sets pass their own
// S.dprog[id] table; never swap S.prog or keep a "current set" global.
function status(w, map = S.prog) {
  const p = map[w.w];
  if (!p) return 'new';
  return p.b >= MASTERED ? 'mastered' : 'learning';
}
const pool = () => W.filter((w) => S.settings.levels.includes(w.g));
// Reviews come from every word already learned (any level); only new words are limited to settings.levels (pool()).
const dueList = (list = W, map = S.prog) => {
  const now = Date.now();
  return list.filter((w) => map[w.w] && map[w.w].d <= now).sort((a, b) => map[a.w].d - map[b.w].d);
};

/* ---------- daily goal in minutes (1.63) ---------- */
// grade() measures the seconds between consecutive graded cards (gaps over a minute = a pause, ignored). With
// settings.minutes (10/15/20/30) the new-words goal is worked out from that budget: minutes ÷ seconds per card =
// cards for today, minus the reviews (done + still due), divided by what a new card costs (it comes back 2–3 times).
const NEW_COST = 2.5, SPC_DEFAULT = 9;
let gradeAt = 0;
function timeCard() {
  const now = Date.now(), dt = (now - gradeAt) / 1000;
  gradeAt = now;
  if (dt < 1 || dt > 60) return;
  S.spc.t += dt; S.spc.n++;
  if (S.spc.n > 600) { S.spc.t /= 2; S.spc.n = Math.round(S.spc.n / 2); }
}
const secPerCard = () => (S.spc.n >= 30 ? Math.min(30, Math.max(3, S.spc.t / S.spc.n)) : SPC_DEFAULT);
// New words to learn today: the fixed setting, or — with a minutes goal — what fits the time left over from reviews.
function newGoal() {
  const m = S.settings.minutes | 0;
  if (!m) return S.settings.newPerDay;
  rollDay();
  // fixed at the first look of the day (per minutes setting) so repeats within a session don't shrink the goal as you go
  if (!S.daily.ng || S.daily.ng.m !== m) {
    const cards = m * 60 / secPerCard(), reviews = S.daily.reviews + dueList().length;
    S.daily.ng = { m, v: Math.max(0, Math.min(100, Math.floor((cards - reviews) / NEW_COST))) };
  }
  return S.daily.ng.v;
}

/* ---------- gentle comeback (1.60) ---------- */
// A big pile of overdue cards (> BACKLOG_PAUSE) pauses new words and is served BACKLOG_CAP a day, most overdue first,
// so coming back after a break never starts with a 200-card wall. Off with settings.gentle === false.
// New words started this week, for the adjustable weekly goal (settings.weekGoal, 0 = off).
function wnewAdd() {
  const k = mondayKey();
  if (!S.wnew || S.wnew.key !== k) S.wnew = { key: k, n: 0 };
  S.wnew.n++;
  const g = S.settings.weekGoal | 0;
  if (g && S.wnew.n === g) setTimeout(() => { confetti(); toast(`🎯 ครบเป้าคำใหม่ประจำสัปดาห์ ${g} คำแล้ว เก่งมาก!`); }, 600);
}
const wnewNow = () => (S.wnew && S.wnew.key === mondayKey() ? S.wnew.n : 0);
const BACKLOG_CAP = 50, BACKLOG_PAUSE = 60;
function backlogPlan() {
  rollDay();
  const due = dueList().length, on = S.settings.gentle !== false && due > BACKLOG_PAUSE;
  const capLeft = on ? Math.max(0, BACKLOG_CAP - S.daily.reviews) : due;
  return { on, due, show: Math.min(due, capLeft) };
}
// Whole days since the last day with any activity before today (null = never played).
function daysAway() {
  const t = today(), last = Object.keys(S.hist).filter((k) => k < t && S.hist[k] > 0).sort().pop() || S.streak.last;
  return last ? dayDiff(t, last) : null;
}

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
// Theme: 'auto' follows the system; 'light'/'dark'/'black' (pure-black OLED) override it. Palette = accent colours (violet is the :root default).
// Both are mirrored to localStorage (o3k.theme / o3k.palette) for the early script in index.html.
const PALETTES = [['violet', 'ม่วง', '#6c5ce7', '#fd79a8'], ['ocean', 'ฟ้าทะเล', '#0a6fc2', '#5bc8e0'], ['mint', 'มิ้นต์', '#007a61', '#5fd0cf'],
  ['orange', 'ส้ม', '#c0540a', '#f58a8f'], ['sakura', 'ชมพูซากุระ', '#c03a78', '#f7b3cc'], ['mono', 'โมโนโครม', '#3d3d46', '#a0a0ac'],
  ['gold', 'ทอง (ปลดล็อก Lv.10)', '#9a6b00', '#f0c24a'], ['galaxy', 'กาแล็กซี (ปลดล็อก Lv.20)', '#4b2fa5', '#c07fd8']];
function applyTheme() {
  const root = document.documentElement, t = S.settings.theme || 'auto';
  let pal = S.settings.palette || 'violet'; if (!PALETTES.some((p) => p[0] === pal) || (typeof paletteOpen === 'function' && !paletteOpen(pal))) pal = 'violet';
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  if (pal === 'violet') delete root.dataset.palette; else root.dataset.palette = pal;
  try { localStorage.setItem('o3k.theme', t); localStorage.setItem('o3k.palette', pal); } catch (e) { /* ignore */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue('--primary').trim() || '#6c5ce7';
}
applyTheme();
// App icon: the home-screen icon is copied by iOS when "Add to Home Screen" is used, so this only swaps the
// <link rel="apple-touch-icon"> (+ settings page preview). A change needs the icon to be re-added (backup first).
const ICONS = [['purple', 'ม่วง'], ['dark', 'มืด'], ['black', 'ดำสนิท'], ['light', 'ขาว'], ['ocean', 'ฟ้าทะเล'], ['sakura', 'ชมพู']];
const iconSrc = (id) => id === 'purple' ? 'icons/apple-touch-icon.png' : `icons/apple-touch-icon-${id}.png`;
function applyIcon() {
  const id = ICONS.some((x) => x[0] === S.settings.icon) ? S.settings.icon : 'purple';
  const l = document.querySelector('link[rel="apple-touch-icon"]'); if (l) l.href = iconSrc(id);
}
applyIcon();
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
// iOS Safari quirks: speak() right after cancel() of a running utterance is dropped silently (so wait a beat),
// a paused engine stays mute until resume(), and an utterance nobody references can be garbage-collected
// before it ends (no onend → a chained dialogue stops), hence `curUtt`.
let curUtt = null;
function say(u, wait) {
  curUtt = u;
  const go = () => { if (u !== curUtt) return; if (speechSynthesis.paused) speechSynthesis.resume(); speechSynthesis.speak(u); };
  if (wait) setTimeout(go, 80); else go();
  return u;
}
function speak(text, opt) {
  if (!window.speechSynthesis) return;
  const busy = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  let slow = opt && opt.slow;
  if (slow == null) slow = S.settings.slowRepeat !== false && lastSaid.text === text && Date.now() - lastSaid.at < SLOW_AGAIN && !lastSaid.slow;
  lastSaid = { text, at: Date.now(), slow: !!slow };
  const u = new SpeechSynthesisUtterance(text);
  const lang = S.settings.accent;
  u.lang = lang; u.rate = slow ? slowRate() : S.settings.rate;
  const chosen = S.settings.voice && voices.find((x) => x.voiceURI === S.settings.voice);
  if (chosen) { try { u.voice = chosen; u.lang = chosen.lang; } catch (e) { /* voice went away */ } return say(u, busy); }
  const v = voices.find((v) => v.lang === lang && /Samantha|Daniel|Karen|Ava|Siri/i.test(v.name)) || voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith('en'));
  if (v) u.voice = v;
  return say(u, busy);
}

/* ---------- spaced repetition ---------- */
// Adaptive intervals (SM-2 style): each word keeps its own interval `i` (days) and ease `e`.
// `b` (box) is derived from `i` so "จำได้แล้ว" (b >= MASTERED, i.e. i >= 16 days) works as before.
// Words saved before 1.10.0 have no i/e and start from INTERVALS[b] with the default ease.
// grade: 0 again, 1 hard, 2 good, 3 easy
const EASE0 = 2.5, EASE_MIN = 1.3, EASE_MAX = 2.8, MAX_IVL = 365;
const boxOf = (i) => { let b = 0; while (b + 1 < INTERVALS.length && INTERVALS[b + 1] <= i) b++; return b; };
const ivlOf = (p) => (p ? (p.i != null ? p.i : INTERVALS[p.b]) : 0);
function schedSM2(p, g) {
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

/* ---------- FSRS-5 scheduler (1.66) ---------- */
// The open-source FSRS algorithm (default parameters): each card keeps stability `st` (days until recall drops to 90%),
// difficulty `df` (1–10) and the time of the last review `lr`. The next interval is the day when recall falls to the
// retention the learner wants (settings.retention, default 90%). Cards saved before have no st/df: fsState() derives
// them from the old interval `i` and ease `e`, so backups and sync from older versions keep working.
// Switch back to the old SM-2 style with settings.scheduler = 'sm2'. Grades: 0 again, 1 hard, 2 good, 3 easy.
const FSRS_W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const FS_FACTOR = 19 / 81, FS_DECAY = -0.5;
const fsClamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fsRetr = (t, s) => Math.pow(1 + FS_FACTOR * t / s, FS_DECAY);
const fsIvl = (s, r) => s / FS_FACTOR * (Math.pow(r, 1 / FS_DECAY) - 1);
const fsD0 = (G) => fsClamp(FSRS_W[4] - Math.exp(FSRS_W[5] * (G - 1)) + 1, 1, 10);
const fsOn = () => S.settings.scheduler !== 'sm2';
const retention = () => fsClamp(+S.settings.retention || 0.9, 0.7, 0.97);
// Current memory state of a stored card: { s, d, t } (t = days since the last review).
function fsState(p) {
  const i0 = ivlOf(p), now = Date.now();
  const s = p.st || Math.max(0.4, i0 || 1);
  const d = p.df || fsClamp(5 + (EASE0 - (p.e || EASE0)) * 3.75, 1, 10);
  const last = p.lr || (p.d ? p.d - i0 * DAY + 3600000 : now);
  return { s, d, t: Math.max(0, (now - last) / DAY) };
}
function schedFSRS(p, g) {
  const w = FSRS_W, G = g + 1, e = p && p.e ? p.e : EASE0;
  let s, d;
  if (!p || (p.s || 0) === 0) { s = w[G - 1]; d = fsD0(G); }
  else {
    const o = fsState(p), r = fsRetr(o.t, o.s);
    d = o.d + (-w[6] * (G - 3)) * (10 - o.d) / 9;
    d = fsClamp(w[7] * fsD0(4) + (1 - w[7]) * d, 1, 10);
    if (o.t < 1) s = o.s * Math.exp(w[17] * (G - 3 + w[18])); // another look on the same day
    else if (G === 1) s = Math.min(o.s, w[11] * Math.pow(o.d, -w[12]) * (Math.pow(o.s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r)));
    else s = o.s * (1 + Math.exp(w[8]) * (11 - o.d) * Math.pow(o.s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * (G === 2 ? w[15] : 1) * (G === 4 ? w[16] : 1));
    if (G >= 3) s = Math.max(s, o.s);
  }
  s = fsClamp(s, 0.1, MAX_IVL * 2);
  const i = g === 0 ? 0 : fsClamp(Math.round(fsIvl(s, retention())), 1, MAX_IVL);
  return { i, e, b: boxOf(i), st: Math.round(s * 100) / 100, df: Math.round(d * 100) / 100, lr: Date.now() };
}
const sched = (p, g) => (fsOn() ? schedFSRS(p, g) : schedSM2(p, g));
// The FSRS fields of a sched() result, to store next to b/i/e/d (empty with the old scheduler).
const fsFields = (n) => (n.st != null ? { st: n.st, df: n.df, lr: n.lr } : {});
// Due time for an interval of `i` days. From 3 days up the gap is shifted by a random ±5% (3–6 days), ±8% (7–20) or
// ±10% (21+) so words learned together don't all come due on the same day (1.68). `i` itself stays exact (button labels).
const fuzzOf = (i) => (i < 3 ? 0 : i < 7 ? 0.05 : i < 21 ? 0.08 : 0.1);
const dueAt = (i) => (i === 0 ? Date.now() : Date.now() + i * DAY * (1 + (Math.random() * 2 - 1) * fuzzOf(i)) - 3600000);
function daysLabel(i) {
  if (i === 0) return '< 1 นาที';
  if (i < 30) return i + ' วัน';
  if (i < 365) return Math.round(i / 30) + ' เดือน';
  return '1 ปี';
}
// Leeches ("คำดื้อ"): forgotten again and again.
const LEECH = 4;
const leechIn = (w, map) => !!(map[w.w] && (map[w.w].x || 0) >= LEECH);
const isLeech = (w) => leechIn(w, S.prog); // one argument on purpose: W.filter(isLeech) passes the index as a 2nd argument
function logMiss(w) {
  const t = today();
  (S.miss[t] = S.miss[t] || {})[w.w] = (S.miss[t][w.w] || 0) + 1;
  for (const k of Object.keys(S.miss)) if (dayDiff(t, k) > 21) delete S.miss[k];
}
// With another table (a word set) the daily new/review counts and the missed-word log are left alone: they belong to the main list.
function grade(w, g, map = S.prog) {
  const main = map === S.prog;
  timeCard();
  markActive();
  const p = map[w.w];
  const leechHit = main && p && (p.x || 0) >= LEECH && g >= 2;
  if (!main) { /* a set: only effort counts (XP, streak, history, quests) */ }
  else if (!p) {
    S.daily.fresh++; wnewAdd();
    if (S.daily.fresh === newGoal()) setTimeout(() => { confetti(); toast('🎯 ครบเป้าคำใหม่วันนี้แล้ว เก่งมาก!'); }, 300);
  } else S.daily.reviews++;
  const n = sched(p, g);
  map[w.w] = {
    b: n.b, i: n.i, e: n.e,
    d: dueAt(n.i),
    ...fsFields(n),
    s: (p ? p.s : 0) + 1,
    c: (p ? p.c : 0) + (g > 0 ? 1 : 0),
    x: (p ? p.x || 0 : 0) + (g === 0 ? 1 : 0),
  };
  if (g === 0) {
    if (main) logMiss(w);
    if (map[w.w].x === LEECH && !S.note[w.w]) setTimeout(() => toast(`🐢 "${w.w}" ลืมบ่อยแล้ว ลองเขียนวิธีจำดูนะ`), 600);
  }
  addXP(g === 0 ? 1 : 2);
  S.chist[today()] = (S.chist[today()] || 0) + 1;
  if (leechHit) questEvent('leech');
  questEvent('card');
}
// Skill games (phrasal verbs, idioms, confusable pairs, ...) have no word of their own, so each question gets a key
// (game + short hash of its text) in S.lex and is scheduled like a word: wrong → back tomorrow-ish, right → longer gaps.
function lexKey(game, w) {
  const src = [w.w, w.t, w._q ? w._q[0] : ''].join('|');
  let h = 5381; for (let k = 0; k < src.length; k++) h = ((h << 5) + h + src.charCodeAt(k)) >>> 0;
  return game + ':' + h.toString(36);
}
function lexGrade(key, ok) {
  const p = S.lex[key], n = sched(p, ok ? 2 : 0);
  S.lex[key] = { b: n.b, i: n.i, e: n.e, d: dueAt(n.i), ...fsFields(n), s: (p ? p.s : 0) + 1, c: (p ? p.c : 0) + (ok ? 1 : 0), x: (p ? p.x : 0) + (ok ? 0 : 1) };
}
// Pick `n` questions: those due for review first (at most 7, oldest first), then ones never asked, then the rest.
function lexPick(game, src, n) {
  const now = Date.now(), at = (w) => S.lex[lexKey(game, w)];
  const due = src.filter((w) => at(w) && at(w).d <= now).sort((a, b) => at(a).d - at(b).d).slice(0, 7);
  const rest = shuffle(src.filter((w) => !due.includes(w)));
  const fresh = rest.filter((w) => !at(w)), seen = rest.filter((w) => at(w));
  return shuffle(due.concat(fresh, seen).slice(0, n));
}
function lexStats(game) {
  const now = Date.now(); let seen = 0, solid = 0, due = 0;
  for (const [k, p] of Object.entries(S.lex)) {
    if (!k.startsWith(game + ':')) continue;
    seen++; if (p.i >= 7) solid++; if (p.d <= now) due++;
  }
  return { seen, solid, due };
}

// Lighter update from games: a right answer seeds/advances a little, a wrong one sends it back for review.
function gameResult(w, ok, map = S.prog) {
  markActive();
  const p = map[w.w];
  const leechHit = ok && map === S.prog && p && (p.x || 0) >= LEECH;
  if (!p && map === S.prog) wnewAdd();
  if (ok) {
    if (!p) map[w.w] = { b: 1, i: 1, e: EASE0, d: dueAt(1), s: 1, c: 1, x: 0 };
    else { p.c++; p.s++; }
  } else {
    map[w.w] = { ...(p || {}), ...fsFields(sched(p, 0)), b: 0, i: 0, e: Math.max(EASE_MIN, ((p && p.e) || EASE0) - 0.2), d: Date.now(), s: (p ? p.s : 0) + 1, c: p ? p.c : 0, x: (p ? p.x || 0 : 0) + 1 };
    if (map === S.prog) logMiss(w);
  }
  if (leechHit) questEvent('leech'); else save();
}

// "I already know this": jump straight to a long interval so it stops appearing as new.
function markKnown(w, map = S.prog) {
  markActive();
  map[w.w] = { b: MASTERED, i: INTERVALS[MASTERED], e: EASE0 + 0.2, d: dueAt(INTERVALS[MASTERED]), s: 1, c: 1, x: 0 };
  save();
}
function markForReview(w, map = S.prog) {
  const p = map[w.w];
  map[w.w] = { ...(p || {}), b: 0, i: 0, d: Date.now(), s: p ? p.s : 0, c: p ? p.c : 0, x: p ? p.x || 0 : 0 };
  save();
}

/* ---------- router ---------- */
let current = 'home';
let cleanup = null;
const TITLES = { wsearch: 'ค้นหาคำในตาราง', map: 'แผนที่ด่าน', duel: 'ท้าดวลเพื่อน', event: 'กิจกรรมเทศกาล', mascot: 'น้องคำ', year: 'สรุปปีของฉัน', ltest: 'ทดสอบจบระดับ', mtest: 'แบบทดสอบประจำเดือน', home: 'ศัพท์ต้องรู้', cards: 'แฟลชการ์ด', games: 'เกมฝึกศัพท์', list: 'คำศัพท์', settings: 'ตั้งค่า', guide: 'คู่มือการใช้งาน', homeset: 'จัดเรียงหน้าแรก', wotdset: 'ตั้งค่าคำประจำวัน', feed: 'ไถศัพท์', stats: 'สถิติ', login: 'เข้าสู่ระบบ', read: 'อ่านเรื่องสั้น', placement: 'วัดระดับ', changelog: 'ประวัติการอัปเดต', riddle: 'ปริศนาศัพท์', decks: 'ชุดของฉัน' };
function go(tab, ...args) {
  if (typeof mustLogin === 'function' && mustLogin() && tab !== 'login') return go('login', true);
  if (cleanup) { cleanup(); cleanup = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  const prev = current;
  current = tab;
  view.classList.remove('feed-mode');
  view.dataset.route = tab; // CSS uses this for wide (iPad/landscape) layouts
  // the sets page sits under the word list: on a phone the "คำศัพท์" tab stays lit, on the iPad rail its own item does
  const wide = matchMedia('(min-width: 700px)').matches;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab || (tab === 'decks' && !wide && b.dataset.tab === 'list')));
  $('#title').textContent = TITLES[tab] || 'ศัพท์ต้องรู้';
  view.scrollTop = 0;
  ({ home: renderHome, cards: renderCards, games: renderGames, list: renderList, settings: renderSettings, guide: renderGuide, homeset: renderHomeSet, wotdset: renderWotdSet, feed: renderFeed, stats: renderStats, login: renderLogin, read: renderRead, placement: renderPlacement, changelog: renderChangelog, mtest: renderMonthTest, ltest: renderLevelTest, year: renderYear, mascot: renderMascot, event: renderEvent, riddle: renderRiddle, duel: renderDuel, map: renderMap, wsearch: renderWSearch, decks: renderDecks }[tab])(...args);
  updateStreak();
  const a = TAB_ORDER.indexOf(prev), b = TAB_ORDER.indexOf(tab);
  animView(a < 0 || b < 0 || a === b ? 'vin' : b > a ? 'vin-l' : 'vin-r');
}
// Page animation: tabs slide in from the side they sit on, sub pages push in / pop back, the rest fades.
const TAB_ORDER = ['home', 'cards', 'games', 'stats', 'list', 'settings'];
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
view.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go, g.dataset.year); });
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
const REF_PAGES = { pairs: () => renderPairs(), fams: () => renderFamilies(), syn: () => renderSyn(), affix: () => renderAffix(), phrasal: () => renderPhrasal(), idiom: () => renderIdioms(), sit: () => renderSit(), irr: () => renderIrregular(), dprep: () => renderDepPrep(), mis: () => renderMistakes(), gpat: () => renderGramPat() };
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (!b.dataset.ref) return go(b.dataset.tab);
  go('games'); REF_PAGES[b.dataset.ref]();
  document.querySelectorAll('.tabbar button').forEach((x) => x.classList.toggle('active', x === b));
});
