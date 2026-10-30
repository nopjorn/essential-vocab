'use strict';
// Speech-recognition matching, the games menu, every game and quick play.
// Classic script sharing globals with app.js (load order: index.html).

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
  confuse: { icon: '🤔', name: 'คำที่มักสับสน', desc: 'เลือกให้ถูก เช่น borrow / lend' },
  minpair: { icon: '👂', name: 'ฝึกหูแยกเสียง', desc: 'ฟังแล้วเลือก ship หรือ sheep' },
  wform: { icon: '🧬', name: 'เปลี่ยนรูปคำ', desc: 'เลือกรูปคำให้เข้ากับประโยค เช่น decide → decision' },
  phrasal: { icon: '🧩', name: 'Phrasal verbs', desc: 'เติมคำเล็กๆ ให้ครบ เช่น give ___ = เลิก' },
  syn: { icon: '≈', name: 'คำเหมือน–ตรงข้าม', desc: 'big ≈ large, big ↔ small เลือกให้ถูก' },
  root: { icon: '🌱', name: 'รากศัพท์', desc: 'ส่วนที่ไฮไลต์ในคำ เช่น spect = มอง เลือกความหมายให้ถูก' },
  affix: { icon: '🧱', name: 'เติมหน้า–ท้ายคำ', desc: 'un-, -ful, -less … เลือกให้ได้ความหมาย' },
  idiom: { icon: '🎭', name: 'สำนวน', desc: 'piece of cake = ? เลือกความหมายหรือสำนวนให้ถูก' },
  sit: { icon: '🗨️', name: 'ตอบให้เข้าสถานการณ์', desc: 'เลือกประโยคถัดไปในบทสนทนา' },
  guess: { icon: '🕵️', name: 'เดาความหมายจากบริบท', desc: 'อ่านประโยคจริง เดาความหมายของคำใหม่ก่อนดูเฉลย' },
  dictW: { icon: '🔠', name: 'พิมพ์คำที่ได้ยิน', desc: 'ฟังคำเดี่ยวแล้วพิมพ์ทั้งคำ ไม่มีคำแปลช่วย' },
  compose: { icon: '🖊️', name: 'แต่งประโยคเอง', desc: 'แต่งประโยคด้วยคำนี้ แล้วเทียบกับตัวอย่างของแอป เก็บประโยคไว้ในโน้ต' },
  dictS: { icon: '📜', name: 'พิมพ์ประโยคที่ได้ยิน', desc: 'ฟังประโยคแล้วพิมพ์ให้ครบ ตรวจทีละคำ' },
  ipa: { icon: '🔡', name: 'อ่าน IPA', desc: 'ดูวิธีออกเสียง /ˈæpl/ แล้วเลือกคำที่ถูก' },
  gpat: { icon: '📐', name: 'เลือกรูปที่ถูก (ไวยากรณ์ผูกกับคำ)', desc: 'some advice / enjoy swimming / let me go เลือกรูปให้ถูก' },
  thaierr: { icon: '🩹', name: 'ประโยคไหนถูก', desc: 'ข้อผิดที่คนไทยพบบ่อย เช่น discuss about, advices' },
  dprep: { icon: '🔗', name: 'บุพบทที่ตามหลังคำ', desc: 'interested ___ sports เลือก in / on / at ให้ถูก' },
  irreg: { icon: '⏪', name: 'กริยาไม่ปกติ', desc: 'go → went → gone เลือกกริยาช่อง 2–3 ให้ถูก' },
  num: { icon: '🔢', name: 'ฟังตัวเลข ราคา เวลา', desc: 'ฟัง fifteen / fifty, $12.50, 7:45, 3 May แล้วเลือกให้ถูก' },
  emoji: { icon: '🖼️', name: 'ทายจากภาพอีโมจิ', desc: 'ดูอีโมจิ เลือกคำอังกฤษที่ตรงกับภาพ' },
  emojiRun: { icon: '♾️', name: 'อีโมจิไม่จำกัด', desc: 'เล่นไปเรื่อยๆ ดูว่าถูกติดต่อกันได้กี่ข้อ' },
  hangman: { icon: '🔡', name: 'ทายตัวอักษร (แฮงแมน)', desc: 'ดูคำแปล แตะเดาตัวอักษรของคำ พลาดได้ 6 ครั้ง' },
  anagram: { icon: '🔠', name: 'เรียงตัวอักษร', desc: 'แตะตัวอักษรที่สลับไว้ให้เป็นคำอังกฤษ' },
  survival: { icon: '❤️', name: 'โหมดเอาตัวรอด', desc: 'หัวใจ 3 ดวง คำยากขึ้นเรื่อยๆ ตอบผิดเสียหัวใจ' },
  timeAttack: { icon: '⏱️', name: 'จับเวลา 60 วินาที', desc: 'ตอบให้ได้มากที่สุดใน 1 นาที เล่นซ้ำทำสถิติใหม่' },
  review: { icon: '🔁', name: 'คำที่ผิดบ่อย', desc: 'ฝึกคำที่เคยตอบผิด' },
};
// The level-map stage round (js/map.js) is a game too but not a menu tile: non-enumerable, so every GAMES listing skips it.
Object.defineProperty(GAMES, 'stage', { value: { icon: '🗺️', name: 'แผนที่ด่าน', desc: '' }, enumerable: false });
// Games whose data is lazy-loaded (stories / collocations) or built from sentences instead of the word pool.
const STORY_GAMES = ['sCloze', 'sOrder'];
// Games built from data/pairs.js (confusable words, minimal pairs): not tied to the word list or its schedule.
const PAIR_GAMES = ['confuse', 'minpair'];
// Skill games with their own items (idx -1): practice only, no flashcard scheduling.
// Generated skill games: the questions are made up on the spot, so they are not scheduled (no S.lex keys).
const GEN_GAMES = ['num'];
const SKILL_GAMES = [...PAIR_GAMES, 'wform', 'phrasal', 'syn', 'affix', 'root', 'idiom', 'sit', 'irreg', 'dprep', 'thaierr', 'gpat', ...GEN_GAMES];
// The games menu groups every game by the skill it trains (1.106): chips filter, and "all" lists them under these headings.
// Every game id is in exactly one group (a test checks).
const GAME_SKILLS = [
  ['hear', '👂', 'ฟังและเสียง', ['listen', 'minpair', 'num', 'dict', 'dictW', 'dictS', 'ipa']],
  ['say', '🗣️', 'พูด', ['speak', 'speakS']],
  ['mean', '📖', 'ความหมาย', ['en2th', 'th2en', 'match', 'emoji', 'guess', 'syn', 'confuse', 'review']],
  ['write', '✍️', 'สะกดและเขียน', ['spell', 'hangman', 'anagram', 'cloze', 'sCloze', 'order', 'sOrder', 'compose']],
  ['gram', '📐', 'ไวยากรณ์และรูปคำ', ['wform', 'affix', 'root', 'gpat', 'thaierr', 'dprep', 'irreg']],
  ['phrase', '🧩', 'วลีและสำนวน', ['colloc', 'phrasal', 'idiom', 'sit']],
  ['chal', '🎉', 'ท้าทาย', ['survival', 'timeAttack', 'emojiRun']],
];
let gameSkill = 'all'; // chip selected in the games menu: 'all' or a GAME_SKILLS id
function gameTile(id) {
  const g = GAMES[id];
  const best = S.best[id] != null ? `<span>🏅 สถิติ: ${S.best[id]}</span>` : '';
  return `<button class="game-tile" data-game="${id}"><div class="gi">${g.icon}</div><b>${g.name}</b><span>${g.desc}</span>${best}</button>`;
}
let gameSource = 'level';
let gameTopic = 'food';
let gameGoal = 'travel';
let gameDecks = [];     // ids of the word sets picked when gameSource is 'deck' (one = updates that set's progress, several = practice only)
let customWords = [];   // words for a one-off round, e.g. from the weekly summary
let gameSrcOpen = false;
let gameEdit = false;   // games menu in "จัดเกม" mode (pin / hide / reorder pins)
const gamePins = () => (S.settings.gamePin || []).filter((id) => GAMES[id]);
const gameHidden = () => new Set((S.settings.gameHide || []).filter((id) => GAMES[id]));
// Most played games that aren't pinned or hidden (at least 2 rounds), for the "เล่นบ่อย" row.
function frequentGames() {
  const skip = new Set([...gamePins(), ...gameHidden()]);
  return Object.keys(GAMES).filter((id) => !skip.has(id) && gamePlays(id) >= 2)
    .sort((a, b) => gamePlays(b) - gamePlays(a)).slice(0, 4);
}
function gameEditor() {
  const pins = gamePins(), hid = gameHidden();
  const row = (id, extra) => `<div class="gedit-row" data-id="${id}"><span class="grow">${GAMES[id].icon} ${GAMES[id].name}</span>${extra}</div>`;
  return `<div class="card-box">
      ${pins.length ? `<div class="small muted" style="margin-bottom:6px"><b>📌 เกมโปรด</b> เรียงลำดับได้</div>
      ${pins.map((id, k) => row(id, `<button class="icon-btn" data-up ${k ? '' : 'disabled'} aria-label="เลื่อนขึ้น">⬆️</button><button class="icon-btn" data-down ${k < pins.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">⬇️</button>`)).join('')}<div style="height:10px"></div>` : ''}
      <div class="small muted" style="margin-bottom:6px"><b>🎮 เกมทั้งหมด</b> 📌 = ปักไว้ด้านบน · 🙈 = ซ่อน</div>
      ${Object.keys(GAMES).map((id) => row(id, `<button class="icon-btn${pins.includes(id) ? ' on' : ''}" data-pin aria-pressed="${pins.includes(id)}" aria-label="ปักหมุด ${GAMES[id].name}">📌</button><button class="icon-btn${hid.has(id) ? ' on' : ''}" data-hide aria-pressed="${hid.has(id)}" aria-label="ซ่อน ${GAMES[id].name}">🙈</button>`)).join('')}
    </div>`;
}
function bindGameEditor() {
  view.querySelectorAll('.gedit-row button').forEach((b) => (b.onclick = () => {
    const id = b.closest('.gedit-row').dataset.id, st = S.settings;
    let pins = gamePins(), hide = [...gameHidden()];
    if (b.hasAttribute('data-pin')) {
      pins = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id];
      hide = hide.filter((x) => x !== id);
    } else if (b.hasAttribute('data-hide')) {
      hide = hide.includes(id) ? hide.filter((x) => x !== id) : [...hide, id];
      pins = pins.filter((x) => x !== id);
    } else {
      const k = pins.indexOf(id), j = k + (b.hasAttribute('data-up') ? -1 : 1);
      if (j < 0 || j >= pins.length) return;
      [pins[k], pins[j]] = [pins[j], pins[k]];
    }
    st.gamePin = pins; st.gameHide = hide; save();
    const top = view.scrollTop; renderGames(); view.scrollTop = top;
  }));
}
// Pinned games, then the most played ones, above the rest of the games menu.
function gameSections() {
  const pins = gamePins(), freq = frequentGames();
  const sec = (title, ids) => `<div class="small muted games-sec"><b>${title}</b></div><div class="game-grid">${ids.map(gameTile).join('')}</div>`;
  return (pins.length ? sec('📌 เกมโปรด', pins) : '') + (freq.length ? sec('🕘 เล่นบ่อย', freq) : '');
}
// "ความยากเกมตัวเลือก" text for the games menu and result screen.
function diffLabel() {
  const d = gameDiff(), auto = !S.settings.gdiff || S.settings.gdiff === 'auto';
  return '⭐'.repeat(d) + ' ' + ['ปกติ', 'ตัวเลือกลวงคล้ายขึ้น', 'ตัวเลือกคล้ายขึ้น + จับเวลาข้อละ 12 วินาที'][d - 1] + (auto ? ` · อัตโนมัติ (แม่น ${Math.round(((S.gacc || {}).a || 0.7) * 100)}%)` : ' · ตั้งเอง');
}
// Games not pinned or hidden, as the "all games" list: chips by skill + the tiles (grouped under headings when "all").
function gameList() {
  const skip = new Set([...gamePins(), ...gameHidden()]);
  const groups = GAME_SKILLS.map(([id, ic, name, ids]) => [id, ic, name, ids.filter((g) => GAMES[g] && !skip.has(g))]).filter((g) => g[3].length);
  if (gameSkill !== 'all' && !groups.some((g) => g[0] === gameSkill)) gameSkill = 'all';
  const n = groups.reduce((a, g) => a + g[3].length, 0);
  const chips = [['all', '🎮', 'ทั้งหมด', n], ...groups.map((g) => [g[0], g[1], g[2], g[3].length])]
    .map(([id, ic, name, c]) => `<button class="chip${gameSkill === id ? ' on' : ''}" data-skill="${id}" aria-pressed="${gameSkill === id}">${ic} ${name} <small>${c}</small></button>`).join('');
  const shown = gameSkill === 'all' ? groups : groups.filter((g) => g[0] === gameSkill);
  const body = shown.map(([, ic, name, ids]) => (gameSkill === 'all' ? `<div class="small muted games-sec"><b>${ic} ${name}</b></div>` : '') + `<div class="game-grid">${ids.map(gameTile).join('')}</div>`).join('');
  return `<div class="chips skill-chips" id="gSkill" role="group" aria-label="กรองเกมตามทักษะ">${chips}</div>${body}`;
}
function renderGames() {
  if (gameSource === 'custom') gameSource = 'level';
  gameDecks = gameDecks.filter((id) => deckById(id)); // a set deleted meanwhile (also by another device) drops out
  if (gameSource === 'deck' && !gameDecks.length) gameSource = 'level';
  const decks = liveDecks();
  const srcName = { level: `ระดับที่เลือก (${lvNames(S.settings.levels)})`, learned: 'คำที่เรียนแล้ว', all: 'ทุกระดับ', mastered: '🟢 คำที่จำได้แล้ว', star: '⭐ คำติดดาว', leech: '🐢 คำดื้อ', topic: '📂 ตามหมวด', goal: '🎯 ตามเป้าหมาย', deck: gameDecks.length === 1 ? `📚 ${esc(deckById(gameDecks[0]).name || 'ชุดไม่มีชื่อ')}` : `📚 ${gameDecks.length} ชุด (โหมดซ้อม)` }[gameSource] || '';
  view.innerHTML = `
    <div class="card-box">
      <button class="src-btn" id="srcBtn" aria-expanded="${gameSrcOpen}"><span class="small muted">คำจาก:</span><b>${srcName}</b><i>▾</i></button>
      <div class="chips" id="src" ${gameSrcOpen ? '' : 'hidden'}>
        <button class="chip" data-s="level">ระดับที่เลือก (${lvNames(S.settings.levels)})</button>
        <button class="chip" data-s="learned">คำที่เรียนแล้ว</button>
        <button class="chip" data-s="all">ทุกระดับ</button>
        <button class="chip" data-s="mastered">🟢 คำที่จำได้แล้ว (${masteredWords().length})</button>
        <button class="chip" data-s="star">⭐ คำติดดาว (${Object.keys(S.star).length})</button>
        <button class="chip" data-s="leech">🐢 คำดื้อ (${W.filter(isLeech).length})</button>
        <button class="chip" data-s="topic">📂 ตามหมวด</button>
        <button class="chip" data-s="goal">🎯 ตามเป้าหมาย</button>
        ${decks.length ? `<button class="chip" data-s="deck">📚 ชุดของฉัน (${decks.length})</button>` : ''}
      </div>
      ${gameSource === 'deck' ? `<div class="chips" id="gDecks" style="margin-top:10px">${decks.map((d) => `<button class="chip ${gameDecks.includes(d.id) ? 'on' : ''}" data-d="${d.id}" aria-pressed="${gameDecks.includes(d.id)}">${esc(d.icon)} ${esc(d.name || 'ชุดไม่มีชื่อ')} · ${deckWords(d).length}</button>`).join('')}</div>
        <div class="small muted" style="margin-top:8px">${gameDecks.length === 1 ? 'เล่นชุดเดียว: ผลของเกมอัปเดตความคืบหน้าของชุดนั้น (สถิติหลักไม่เปลี่ยน)' : '🏋️ โหมดซ้อม (เลือกหลายชุด): ไม่นับความคืบหน้าของชุด แต่ยังได้ XP และสตรีค'}</div>` : ''}
      ${gameSource === 'topic' ? `<select class="sel block-sel" id="gTopic" style="margin-top:10px">${topicOptions(gameTopic, (id) => W.filter((w) => topicMatch(id, w.tp)).length)}</select>` : ''}
      ${gameSource === 'goal' ? `<select class="sel block-sel" id="gGoal" style="margin-top:10px" aria-label="เป้าหมาย">${TAGS.map((t) => `<option value="${t.id}" ${gameGoal === t.id ? 'selected' : ''}>${TAG_LABEL[t.id]} (${t.w.length})</option>`).join('')}</select>` : ''}
      <div class="small muted" id="gDiff" style="margin-top:8px">🎚️ ความยากเกมตัวเลือก: <b>${diffLabel()}</b> · <a href="#" id="gDiffSet">ปรับในตั้งค่า</a></div>
      ${gameSource === 'mastered' ? '<div class="small muted" style="margin-top:8px">เช็คว่ายังจำได้จริงไหม คำที่ตอบผิดจะกลับไปอยู่ในแฟลชการ์ดให้ทบทวนอีกครั้ง</div>' : ''}
    </div>
    ${gameEdit ? '' : gameSections()}
    <button class="card-box guide-link" id="toRiddle"><span>🔤</span><div class="grow"><b>ปริศนาศัพท์ประจำวัน</b><div class="small muted">ทายคำ 5 ตัวอักษรใน 6 ครั้ง · คำใหม่ทุกวัน${riddleToday().over ? ' · ทำแล้ววันนี้ ✅' : ''}</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toWs"><span>🔎</span><div class="grow"><b>ค้นหาคำในตาราง</b><div class="small muted">หาคำที่ซ่อนในตาราง 10×10 โดยดูคำแปลไทยเป็นคำใบ้ · เลือกหมวดได้</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toMap"><span>🗺️</span><div class="grow"><b>แผนที่ด่าน</b><div class="small muted">เดินทางผ่านด่านของแต่ละหมวด ด่านละ 8 ข้อ ได้ ★ 1–3 · ผ่าน ${stageTotals()} ด่าน</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toDuel"><span>⚔️</span><div class="grow"><b>ท้าดวลเพื่อน</b><div class="small muted">ข้อสอบ ${DUEL_N} ข้อจากรหัสสั้นๆ ส่งรหัสให้เพื่อนเล่นชุดเดียวกันแล้วเทียบคะแนน</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toRead"><span>📖</span><div class="grow"><b>อ่านเรื่องสั้น</b><div class="small muted">${STORY_COUNT} เรื่อง · อ่านแล้ว ${Object.keys(S.read).length} · แตะคำเพื่อดูความหมาย</div></div><span class="muted">›</span></button>
    <div class="card-box ref-box"><div class="small muted"><b>📚 คลังความรู้</b> อ่านแล้วกดเล่นเกมของแต่ละหัวข้อได้</div>
      <div class="ref-grid">
        <button class="ref-tile" id="toPairs"><span>🤔</span>คู่คำสับสน</button>
        <button class="ref-tile" id="toFams"><span>🧬</span>ครอบครัวคำ</button>
        <button class="ref-tile" id="toSyn"><span>≈</span>คำเหมือน–ตรงข้าม</button>
        <button class="ref-tile" id="toAf"><span>🧱</span>prefix / suffix</button>
        <button class="ref-tile" id="toRt"><span>🌱</span>รากศัพท์</button>
        <button class="ref-tile" id="toUk"><span>🇬🇧</span>อังกฤษ–อเมริกัน</button>
        <button class="ref-tile" id="toPV"><span>🧩</span>Phrasal verbs</button>
        <button class="ref-tile" id="toId"><span>🎭</span>สำนวน</button>
        <button class="ref-tile" id="toSit"><span>🗨️</span>ศัพท์ตามสถานการณ์</button>
        <button class="ref-tile" id="toIrr"><span>⏪</span>กริยาไม่ปกติ</button>
        <button class="ref-tile" id="toDp"><span>🔗</span>บุพบทที่ตามหลังคำ</button>
        <button class="ref-tile" id="toMis"><span>🩹</span>ข้อผิดที่พบบ่อย</button>
        <button class="ref-tile" id="toGp"><span>📐</span>ไวยากรณ์ผูกกับคำ</button>
        <button class="ref-tile" id="toIpa"><span>🔡</span>ตารางเสียง IPA</button>
      </div></div>
    <div class="row games-head"><b class="grow">${gameEdit ? '✏️ จัดหน้าเกม' : (gamePins().length ? '🎮 เกมอื่นๆ' : '🎮 เกมทั้งหมด')}</b><button class="btn${gameEdit ? ' primary' : ''}" id="gEdit">${gameEdit ? '✓ เสร็จ' : '✏️ จัดเกม'}</button></div>
    ${gameEdit ? gameEditor() : `${gameList()}
    ${gameHidden().size ? `<details class="card-box hidden-games"><summary class="small muted">🙈 เกมที่ซ่อนไว้ (${gameHidden().size})</summary><div class="game-grid" style="margin-top:10px">${[...gameHidden()].map(gameTile).join('')}</div></details>` : ''}`}`;
  if ($('#gSkill')) $('#gSkill').onclick = (e) => {
    const c = e.target.closest('[data-skill]'); if (!c) return;
    gameSkill = c.dataset.skill;
    const top = view.scrollTop; renderGames(); view.scrollTop = top;
    const on = $('#gSkill .chip.on'); if (on) { on.focus({ preventScroll: true }); $('#gSkill').scrollLeft = on.offsetLeft - ($('#gSkill').clientWidth - on.offsetWidth) / 2; } // the re-render reset the chip row: keep the chosen chip in view
  };
  $('#gEdit').onclick = () => { gameEdit = !gameEdit; renderGames(); if (gameEdit) $('#gEdit').scrollIntoView({ block: 'start' }); };
  if (gameEdit) bindGameEditor();
  $('#toRead').onclick = () => go('read');
  $('#toRiddle').onclick = () => go('riddle');
  $('#gDiffSet').onclick = (e) => { e.preventDefault(); go('settings'); };
  $('#toDuel').onclick = () => go('duel');
  $('#toMap').onclick = () => go('map');
  $('#toWs').onclick = () => go('wsearch');
  $('#toId').onclick = () => renderIdioms();
  $('#toSit').onclick = () => renderSit();
  $('#toIrr').onclick = () => renderIrregular();
  $('#toDp').onclick = () => renderDepPrep();
  $('#toMis').onclick = () => renderMistakes();
  $('#toGp').onclick = () => renderGramPat();
  $('#toIpa').onclick = () => renderIpa();
  $('#toPairs').onclick = () => renderPairs();
  $('#toFams').onclick = () => renderFamilies();
  $('#toPV').onclick = () => renderPhrasal();
  $('#toSyn').onclick = () => renderSyn();
  $('#toAf').onclick = () => renderAffix();
  $('#toRt').onclick = () => renderRoots();
  $('#toUk').onclick = () => renderUkUs();
  const paint = () => view.querySelectorAll('#src .chip').forEach((c) => c.classList.toggle('on', c.dataset.s === gameSource));
  paint();
  if ($('#gTopic')) $('#gTopic').onchange = (e) => { gameTopic = e.target.value; };
  if ($('#gGoal')) $('#gGoal').onchange = (e) => { gameGoal = e.target.value; };
  if ($('#gDecks')) $('#gDecks').onclick = (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const id = b.dataset.d;
    if (gameDecks.includes(id)) { if (gameDecks.length > 1) gameDecks = gameDecks.filter((x) => x !== id); } else gameDecks = [...gameDecks, id];
    const top = view.scrollTop; renderGames(); view.scrollTop = top;
  };
  $('#srcBtn').onclick = () => { gameSrcOpen = !gameSrcOpen; renderGames(); };
  $('#src').onclick = (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    gameSource = c.dataset.s; gameSrcOpen = false;
    if (gameSource === 'deck' && !gameDecks.length) gameDecks = [liveDecks()[0].id];
    renderGames();
  };
  view.querySelectorAll('[data-game]').forEach((b) => (b.onclick = () => startGame(b.dataset.game)));
}

// Browse the confusable pairs with their Thai tips and example sentences.
function renderPairs() {
  if (!CONFUSE) { withLoading(loadPairs()).then(renderPairs); return; }
  $('#title').textContent = 'คำที่มักสับสน';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="pBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="pPlay">🤔 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 12px">${CONFUSE.length} คู่ที่คนไทยใช้สลับกันบ่อย แตะประโยคเพื่อฟังเสียง</p>
    <div class="pair-list">${CONFUSE.map((c) => `<div class="card-box pair-card"><div class="pair-h"><b>${esc(c.a)}</b> <span class="muted">vs</span> <b>${esc(c.b)}</b></div>
      <div class="tip-box">💡 ${esc(c.tip)}</div>
      ${c.q.map(([sn, r, , th]) => { const f = sn.replace('___', r); return `<button class="pair-ex" data-say="${esc(f)}"><span>${esc(sn).replace('___', `<mark>${esc(r)}</mark>`)}</span><small class="muted">${esc(th)}</small></button>`; }).join('')}</div>`).join('')}</div>`;
  $('#pBack').onclick = () => go('games');
  $('#pPlay').onclick = () => startGame('confuse');
  view.querySelector('.pair-list').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

// Browse word families (one card per root), with a search box.
let famQuery = '';
function renderFamilies() {
  if (!FAMILIES) { withLoading(loadFamilies()).then(renderFamilies); return; }
  $('#title').textContent = 'ครอบครัวคำ';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="fBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="fPlay">🧬 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${FAMILIES.length} ครอบครัว · คำจากรากเดียวกันที่เปลี่ยนหน้าที่ในประโยค (n = นาม, v = กริยา, adj = คุณศัพท์, adv = กริยาวิเศษณ์) แตะคำหรือประโยคเพื่อฟังเสียง</p>
    <input class="search" id="fq" type="search" placeholder="ค้นหาคำ เช่น decide" value="${esc(famQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false">
    <div class="pair-list" id="famList"></div>`;
  const paint = () => {
    const q = famQuery.trim().toLowerCase();
    const list = q ? FAMILIES.filter((f) => f.f.some(([w, , th]) => w.includes(q) || th.includes(q))) : FAMILIES;
    $('#famList').innerHTML = list.length ? list.map((f) => `<div class="card-box pair-card">${famRows(f)}
      ${f.q.map(([sn, a, th]) => `<button class="pair-ex" data-say="${esc(sn.replace('___', a))}"><span>${esc(sn).replace('___', `<mark>${esc(a)}</mark>`)}</span><small class="muted">${esc(th)}</small></button>`).join('')}</div>`).join('')
      : emptyArt({ kind: 'search', title: 'ไม่พบคำนี้ในครอบครัวคำ', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#fq').oninput = (e) => { famQuery = e.target.value; paint(); };
  $('#fBack').onclick = () => go('games');
  $('#fPlay').onclick = () => startGame('wform');
  $('#famList').onclick = (e) => { const b = e.target.closest('[data-say],[data-col]'); if (b) speak(b.dataset.say || b.dataset.col); };
}
// One tappable row per family member: word + part of speech, Thai on the right. `hi` = word to highlight.
const famRows = (f, hi) => f.f.map(([w, p, th]) => `<button class="col-row${w === hi ? ' on' : ''}" data-col="${esc(w)}"><b>${esc(w)} <span class="pos">${esc(p)}</span></b><span>${esc(th)}</span></button>`).join('');

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
  if (id === 'confuse') return CONFUSE.flatMap((c) => c.q.map((q) => ({ idx: -1, w: `${c.a} / ${c.b}`, t: '', p: '', g: '', _c: c, _q: q })));
  if (id === 'wform') return FAMILIES.flatMap((f) => f.q.map(([sn, a, th]) => ({ idx: -1, w: a, t: '', p: '', g: '', _f: f, _q: [sn, a, '', th] })));
  if (id === 'phrasal') return PHRASAL.map((r) => ({ idx: -1, w: r.pv, t: r.th, p: '', g: '', _pv: r, _q: [r.plain.replace(r.part, '___'), r.part, '', r.th] }));
  if (id === 'syn') return synItems().map((it) => ({ idx: -1, w: it.t, t: it.g.th, p: '', g: '', _syn: it, _q: ['___', it.t, '', it.g.th] }));
  if (id === 'affix') return AFFIX.flatMap((a) => a.ex.filter(([w]) => affixDistractors(a, w).length === 3).map(([w, th]) => ({ idx: -1, w, t: th, p: '', g: '', _af: a, _q: ['___', w, '', th] })));
  if (id === 'idiom') return IDIOMS.map((r) => ({ idx: -1, w: r.id, t: r.th, p: '', g: '', _id: r, _q: [r.plain, '', '', r.th] }));
  if (id === 'root') return rootItems();
  if (id === 'irreg') return irregItems();
  if (id === 'dprep') return dpItems();
  if (id === 'thaierr') return misItems();
  if (id === 'gpat') return gpItems();
  if (id === 'num') return numItems();
  if (id === 'sit') return sitItems().map(({ st, k }) => ({ idx: -1, w: st.d[k][1], t: st.d[k][2], p: '', g: '', _sit: st, _k: k, _q: [st.d[k][1], '', '', st.d[k][2]] }));
  if (id === 'minpair') return MINPAIRS.map((m) => ({ idx: -1, w: `${m[0]} / ${m[2]}`, t: `${m[1]} / ${m[3]}`, p: '', g: '', _m: m }));
  if (id === 'review') {
    return W.filter((w) => S.prog[w.w] && (S.prog[w.w].x || 0) > 0)
      .sort((a, b) => (S.prog[b.w].x - S.prog[a.w].x) || (S.prog[a.w].b - S.prog[b.w].b)).slice(0, 40);
  }
  let list = gameSource === 'learned' ? W.filter((w) => S.prog[w.w])
    : gameSource === 'mastered' ? masteredWords()
    : gameSource === 'star' ? W.filter(isStar)
    : gameSource === 'leech' ? W.filter(isLeech)
    : gameSource === 'custom' ? customWords
    : gameSource === 'topic' ? W.filter((w) => topicMatch(gameTopic, w.tp))
    : gameSource === 'goal' ? W.filter((w) => hasTag(w, gameGoal))
    : gameSource === 'deck' ? [...new Map(gameDecks.map(deckById).filter(Boolean).flatMap((d) => deckWords(d)).map((w) => [w.idx, w])).values()]
    : gameSource === 'all' ? W : pool();
  if (id === 'cloze' || id === 'dict') list = list.filter(hasCloze);
  if (id === 'order') list = list.filter((w) => { const n = w.e.split(/\s+/).length; return n >= 4 && n <= 12; });
  if (id === 'colloc') list = list.filter((w) => COLLOC && COLLOC[w.w]);
  if (id === 'emoji' || id === 'emojiRun') list = list.filter((w) => EMOJI && EMOJI[w.w]);
  if (id === 'guess') { list = list.filter(hasCloze); const fresh = list.filter((w) => !S.prog[w.w]); if (fresh.length >= 10) list = fresh; } // words you haven't met yet
  if (id === 'dictW') list = list.filter((w) => !/\s/.test(w.w) && w.w.length >= 3);
  if (id === 'dictS') list = list.filter((w) => { const n = dictTokens(w.e).length; return n >= 3 && n <= 12; });
  if (id === 'ipa') list = list.filter((w) => w.i && w.i.length >= 4 && !/\s/.test(w.w));
  if (id === 'hangman' || id === 'anagram') list = list.filter((w) => /^[a-z]{4,12}$/i.test(w.w)); // single words: letters only
  return list;
}

/* ---------- automatic difficulty ---------- */
// Level 1 = normal, 2 = look-alike wrong options, 3 = look-alike options + 12 s per question (15 s for sentences).
// settings.gdiff: 'auto' (default, from the rolling accuracy S.gacc of multiple-choice answers) or a fixed '1' | '2' | '3'.
function gameDiff() {
  const g = S.settings.gdiff;
  if (g && g !== 'auto') return +g || 1;
  const { a, n } = S.gacc || { a: 0.7, n: 0 };
  return n < 15 ? 1 : a >= 0.92 ? 3 : a >= 0.8 ? 2 : 1;
}
function gameAcc(ok) {
  const g = S.gacc && typeof S.gacc === 'object' ? S.gacc : (S.gacc = { a: 0.7, n: 0 });
  g.a = g.a * 0.92 + (ok ? 0.08 : 0); g.n++;
}
// How alike two English words look: shared start, shared ending and similar length.
function simScore(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  let k = 0; while (k < 4 && a[k] && a[k] === b[k]) k++;
  let e = 0; while (e < 3 && a[a.length - 1 - e] && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  return k * 2 + e + Math.max(0, 3 - Math.abs(a.length - b.length));
}
// Harder wrong options: English ones that look like the answer, Thai ones from the same topic and part of speech.
// Two words that share any Thai meaning (beside / alongside = ข้างๆ) must not be offered together: both would be right.
const meaningSet = (x) => new Set(x.t.split(/[;,]/).map((m) => m.trim()).filter(Boolean));
function sharesMeaning(a, b) { const m = meaningSet(a); for (const k of meaningSet(b)) if (m.has(k)) return true; return false; }
function hardDistractors(w, n, field) {
  const pos = w.p.split('/')[0];
  const key = (x) => (field === 't' ? thFirst(x.t) : x.w.toLowerCase());
  const score = (x) => (field === 't' ? (x.tp === w.tp ? 3 : 0) + (x.g === w.g ? 1 : 0) : simScore(w.w, x.w) + (x.g === w.g ? 1 : 0))
    + (x.p.split('/')[0] === pos ? 2 : 0) + Math.random() * 2;
  const used = new Set([key(w)]), out = [];
  for (const x of W.filter((x) => x !== w && x.t !== w.t).map((x) => [score(x), x]).sort((a, b) => b[0] - a[0])) {
    const k = key(x[1]);
    if (used.has(k) || sharesMeaning(w, x[1])) continue;
    used.add(k); out.push(x[1]);
    if (out.length >= n) break;
  }
  return out;
}

// Dictation checking: sentence → lowercase words without punctuation (’ counts as '), and a word-by-word alignment (longest common subsequence).
const dictTokens = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function dictDiff(target, typed) {
  const n = target.length, m = typed.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let a = n - 1; a >= 0; a--) for (let b = m - 1; b >= 0; b--) L[a][b] = target[a] === typed[b] ? L[a + 1][b + 1] + 1 : Math.max(L[a + 1][b], L[a][b + 1]);
  const marks = target.map((t) => ({ t, ok: false })), used = new Set();
  let a = 0, b = 0;
  while (a < n && b < m) {
    if (target[a] === typed[b]) { marks[a].ok = true; used.add(b); a++; b++; }
    else if (L[a + 1][b] >= L[a][b + 1]) a++;
    else b++;
  }
  return { marks, hit: marks.filter((x) => x.ok).length, extra: typed.filter((_, k) => !used.has(k)) };
}

function distractors(w, n, field, hard) {
  if (hard) return hardDistractors(w, n, field);
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
      if (used.has(k) || x.t === w.t || sharesMeaning(w, x)) continue;
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
  if (STORY_GAMES.includes(id) && !STORIES) { withLoading(loadStories()).then(() => startGame(id)); return; }
  if ((id === 'emoji' || id === 'emojiRun') && !EMOJI) { withLoading(loadEmoji()).then(() => startGame(id)); return; }
  if (id === 'colloc' && !COLLOC) { withLoading(loadColloc()).then(() => startGame(id)); return; }
  if (PAIR_GAMES.includes(id) && !CONFUSE) { withLoading(loadPairs()).then(() => startGame(id)); return; }
  if (id === 'wform' && !FAMILIES) { withLoading(loadFamilies()).then(() => startGame(id)); return; }
  if (id === 'phrasal' && !PHRASAL) { withLoading(loadPhrasal()).then(() => startGame(id)); return; }
  if (id === 'syn' && !SYN) { withLoading(loadSyn()).then(() => startGame(id)); return; }
  if (id === 'root' && !ROOT) { withLoading(loadRoots()).then(() => startGame(id)); return; }
  if (id === 'affix' && !AFFIX) { withLoading(loadAffix()).then(() => startGame(id)); return; }
  if (id === 'idiom' && !IDIOMS) { withLoading(loadIdioms()).then(() => startGame(id)); return; }
  if (id === 'gpat' && !GRAMPAT) { withLoading(loadGramPat()).then(() => startGame(id)); return; }
  if (id === 'thaierr' && !MISTAKES) { withLoading(loadMistakes()).then(() => startGame(id)); return; }
  if (id === 'dprep' && !DEPPREP) { withLoading(loadDepPrep()).then(() => startGame(id)); return; }
  if (id === 'irreg' && !IRREG) { withLoading(loadIrregular()).then(() => startGame(id)); return; }
  if (id === 'sit' && !SIT) { withLoading(loadSit()).then(() => startGame(id)); return; }
  if (STORY_GAMES.includes(id) && !Object.keys(S.read).length) { toast('อ่านเรื่องสั้นให้จบอย่างน้อย 1 เรื่องก่อนนะ 📖'); if (current !== 'games') go('games'); return; }
  if (gameSource === 'deck' && current !== 'games') gameSource = 'level'; // a set source is only for games started from the menu
  gameDecks = gameDecks.filter((x) => deckById(x));
  if (gameSource === 'deck' && !gameDecks.length) gameSource = 'level';
  const src = gamePool(id);
  const min = id === 'match' ? 6 : 4;
  // Games that draw on the word source (not review, story or skill games) can run on a set's own progress.
  const usesPool = id !== 'review' && !STORY_GAMES.includes(id) && !SKILL_GAMES.includes(id);
  const deckRun = gameSource === 'deck' && usesPool ? (gameDecks.length === 1 ? { map: deckMap(gameDecks[0]) } : { practice: true }) : {};
  if (src.length < min) {
    const why = { cloze: ' (เกมนี้ใช้เฉพาะคำที่มีประโยคตัวอย่างให้เติม)', dict: ' (เกมนี้ใช้เฉพาะคำที่มีประโยคตัวอย่าง)', order: ' (เกมนี้ใช้ประโยคตัวอย่างที่ยาว 4–12 คำ)', colloc: ' (เกมนี้ใช้เฉพาะคำที่มีวลีที่ใช้คู่กัน)', emoji: ' (เกมนี้ใช้เฉพาะคำที่มีภาพอีโมจิ)', emojiRun: ' (เกมนี้ใช้เฉพาะคำที่มีภาพอีโมจิ)' }[id] || '';
    toast(gameSource === 'deck' && usesPool ? `ชุดที่เลือกมีคำสำหรับเกมนี้ไม่ถึง ${min} คำ${why} ลองเพิ่มคำในชุดหรือเลือกหลายชุดนะ`
      : id === 'emoji' || id === 'emojiRun' ? 'คำที่มีภาพอีโมจิยังน้อยไป ลองเลือกแหล่งคำเป็น "ทุกระดับ" ดูนะ'
      : id === 'review' ? 'ยังไม่มีคำที่ตอบผิด เก่งมาก! 👍'
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
  const mine = S.gplay[DEV] || (S.gplay[DEV] = {});
  mine[id] = (mine[id] || 0) + 1; save();
  if (id === 'match') return playMatch(src, deckRun);
  playQuiz(id === 'review' ? pick(['en2th', 'th2en', 'listen']) : id === 'emojiRun' ? 'emoji' : id === 'survival' || id === 'timeAttack' ? 'en2th' : id, src, id, deckRun);
}

// The game engine (playQuiz / playMatch) lives in data/play.js. Until it has loaded these stubs load it and call the real
// functions, which replace them as globals (idle prefetch in boot.js makes that wait rare).
let playOn = false;
function loadPlay() {
  if (playOn) return Promise.resolve(true);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/play.js?v=' + APP_VERSION;
    sc.onload = () => { playOn = true; res(true); };
    sc.onerror = () => { sc.remove(); res(false); };
    document.head.appendChild(sc);
  });
}
function playStub(fn, args) {
  withLoading(loadPlay()).then((ok) => {
    if (ok) return window[fn](...args);
    toast('โหลดเกมไม่สำเร็จ ต้องต่ออินเทอร์เน็ตสักครั้งนะ');
    go('games');
  });
}
function playQuiz(...a) { playStub('playQuiz', a); }
function playMatch(...a) { playStub('playMatch', a); }

/* ---------- quick play ---------- */
// One tap from home: a random multiple-choice game on words the user has started (or their levels).
function quickPlay() {
  gameSource = W.filter((w) => S.prog[w.w] && S.settings.levels.includes(w.g)).length >= 10 ? 'learned' : 'level';
  let id = pick(['en2th', 'th2en', 'listen', 'cloze']);
  if (gamePool(id).length < 4) id = 'en2th';
  startGame(id);
}
