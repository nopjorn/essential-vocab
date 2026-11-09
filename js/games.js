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
  root: { icon: '🌱', name: 'รากศัพท์', desc: 'เช่น spect = มอง เลือกความหมายของรากศัพท์' },
  affix: { icon: '🧱', name: 'เติมหน้า–ท้ายคำ', desc: 'un-, -ful, -less … เลือกให้ได้ความหมาย' },
  idiom: { icon: '🎭', name: 'สำนวน', desc: 'piece of cake = ? เลือกความหมายหรือสำนวนให้ถูก' },
  sit: { icon: '🗨️', name: 'ตอบให้เข้าสถานการณ์', desc: 'เลือกประโยคถัดไปในบทสนทนา' },
  guess: { icon: '🕵️', name: 'เดาความหมายจากบริบท', desc: 'อ่านประโยคจริง เดาความหมายคำใหม่ก่อนดูเฉลย' },
  dictW: { icon: '🔠', name: 'พิมพ์คำที่ได้ยิน', desc: 'ฟังคำเดี่ยวแล้วพิมพ์ทั้งคำ ไม่มีคำแปลช่วย' },
  hand: { icon: '✏️', name: 'เขียนด้วยมือ', desc: 'ดูคำแปล เขียนด้วยนิ้วหรือ Apple Pencil' },
  compose: { icon: '🖊️', name: 'แต่งประโยคเอง', desc: 'แต่งประโยคเอง เทียบตัวอย่าง เก็บไว้ในโน้ต' },
  dictS: { icon: '📜', name: 'พิมพ์ประโยคที่ได้ยิน', desc: 'ฟังประโยคแล้วพิมพ์ให้ครบ ตรวจทีละคำ' },
  ipa: { icon: '🔡', name: 'อ่าน IPA', desc: 'ดูวิธีออกเสียง /ˈæpl/ แล้วเลือกคำที่ถูก' },
  wpdict: { icon: '🎧', name: 'ฟังพิมพ์สำนวนงาน', desc: 'ฟังประโยคงานแล้วพิมพ์คำที่หายไป' },
  email: { icon: '✉️', name: 'ประกอบอีเมล', desc: 'เลือกทีละส่วนให้เป็นอีเมลที่สุภาพ' },
  regi: { icon: '🎩', name: 'ทางการหรือกันเอง', desc: 'เลือกประโยคให้เหมาะกับคนที่คุยด้วย' },
  chat: { icon: '💬', name: 'ภาษาพูด / แชต', desc: 'No worries, I’m down แปลว่าอะไร' },
  thai: { icon: '🇹🇭', name: 'เล่าเรื่องไทย', desc: 'ส้มตำ ทำบุญ เกรงใจ พูดเป็นอังกฤษว่าอะไร' },
  doctor: { icon: '🩺', name: 'คุยกับหมอ', desc: 'บอกอาการ ฟังหมอ ซื้อยาเป็นอังกฤษ' },
  pbsay: { icon: '🎙️', name: 'พูดตามวลี', desc: 'ฟังแล้วพูดตาม แอปฟังและตรวจให้' },
  pbear: { icon: '👂', name: 'ฟังวลี', desc: 'ฟังภาษาพูด คุยกับหมอ เรื่องไทย แล้วเลือกความหมาย' },
  itcol: { icon: '🧑‍💻', name: 'คำคู่ไอที', desc: 'fix a bug ไม่ใช่ repair a bug' },
  sayit: { icon: '🗣️', name: 'คำที่มักออกเสียงผิด', desc: 'cache, suite, receipt อ่านว่าอะไร' },
  devtalk: { icon: '👩‍💻', name: 'ภาษาทีมนักพัฒนา', desc: 'รีวิวโค้ด สแตนด์อัป แชตทีม' },
  interview: { icon: '🎤', name: 'สัมภาษณ์งานสายเทค', desc: 'แนะนำตัว เล่าโปรเจกต์ ตอบแบบ STAR' },
  meeting: { icon: '🗓️', name: 'พูดในประชุม', desc: 'ออกความเห็น ขอแทรก แย้งอย่างสุภาพ' },
  abbr: { icon: '🔤', name: 'ตัวย่อในงาน', desc: 'ASAP, FYI, EOD แปลว่าอะไร' },
  bizcol: { icon: '🤝', name: 'คำคู่ธุรกิจ', desc: 'meet a deadline ไม่ใช่ make' },
  wphr: { icon: '📧', name: 'สำนวนอีเมลงาน', desc: 'ประโยคอีเมลและแชตที่ทำงาน' },
  real: { icon: '🪧', name: 'ข้อความจริง', desc: 'ป้าย ประกาศ เมนู ใบเสร็จ ฉลาก เลือกคำที่หายไป' },
  toeicMock: { icon: '🏁', name: 'ข้อสอบ TOEIC จำลอง', desc: '30 ข้อครบ 7 พาร์ต จับเวลา ดูคะแนนคร่าวๆ' },
  toeic1: { icon: '📷', name: 'TOEIC Part 1', desc: 'ดูภาพ ฟังประโยค เลือกข้อที่ตรงภาพ' },
  toeic2: { icon: '🎧', name: 'TOEIC Part 2', desc: 'ฟังคำถาม เลือกคำตอบที่เหมาะ A B C' },
  toeic3: { icon: '🗣️', name: 'TOEIC Part 3', desc: 'ฟังบทสนทนาที่ทำงาน แล้วตอบคำถาม' },
  toeic4: { icon: '📢', name: 'TOEIC Part 4', desc: 'ฟังประกาศ ข้อความเสียง แล้วตอบคำถาม' },
  toeic6: { icon: '📝', name: 'TOEIC Part 6', desc: 'เติมคำและประโยคในอีเมล ประกาศ' },
  toeic7: { icon: '📧', name: 'TOEIC Part 7', desc: 'อ่านอีเมล ประกาศ แชต แล้วตอบคำถาม' },
  toeic5: { icon: '💼', name: 'TOEIC Part 5', desc: 'เติมคำในประโยคงาน แบบข้อสอบ TOEIC' },
  gpat: { icon: '📐', name: 'เลือกรูปที่ถูก (ไวยากรณ์ผูกกับคำ)', desc: 'some advice / enjoy swimming เลือกให้ถูก' },
  thaierr: { icon: '🩹', name: 'ประโยคไหนถูก', desc: 'ข้อผิดที่คนไทยพบบ่อย เช่น discuss about, advices' },
  dprep: { icon: '🔗', name: 'บุพบทที่ตามหลังคำ', desc: 'interested ___ sports เลือก in / on / at ให้ถูก' },
  irreg: { icon: '⏪', name: 'กริยาไม่ปกติ', desc: 'go → went → gone เลือกกริยาช่อง 2–3 ให้ถูก' },
  num: { icon: '🔢', name: 'ฟังตัวเลข ราคา เวลา', desc: 'ฟัง fifteen / fifty, $12.50, 7:45 เลือกให้ถูก' },
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
const SKILL_GAMES = [...PAIR_GAMES, 'wform', 'phrasal', 'syn', 'affix', 'root', 'idiom', 'sit', 'irreg', 'dprep', 'thaierr', 'gpat', 'real', 'wphr', 'bizcol', 'regi', 'email', 'wpdict', 'pbear', 'pbsay', 'abbr', 'meeting', 'interview', 'devtalk', 'sayit', 'itcol', 'doctor', 'thai', 'chat', 'toeic1', 'toeic2', 'toeic3', 'toeic4', 'toeic5', 'toeic6', 'toeic7', 'toeicMock', ...GEN_GAMES];
// The games menu groups every game by the skill it trains (1.106): chips filter, and "all" lists them under these headings.
// Every game id is in exactly one group (a test checks).
const GAME_SKILLS = [
  ['hear', '👂', 'ฟังและเสียง', ['listen', 'minpair', 'num', 'dict', 'dictW', 'dictS', 'ipa', 'toeic1', 'toeic2', 'toeic3', 'toeic4', 'wpdict', 'pbear']],
  ['say', '🗣️', 'พูด', ['speak', 'speakS', 'pbsay']],
  ['mean', '📖', 'ความหมาย', ['en2th', 'th2en', 'match', 'emoji', 'guess', 'syn', 'confuse', 'review', 'toeic7']],
  ['write', '✍️', 'สะกดและเขียน', ['spell', 'hand', 'hangman', 'anagram', 'cloze', 'sCloze', 'order', 'sOrder', 'compose']],
  ['gram', '📐', 'ไวยากรณ์และรูปคำ', ['wform', 'affix', 'root', 'gpat', 'thaierr', 'dprep', 'irreg', 'toeic5', 'toeic6']],
  ['phrase', '🧩', 'วลีและสำนวน', ['colloc', 'phrasal', 'idiom', 'sit', 'real', 'wphr', 'bizcol', 'regi', 'email', 'abbr', 'chat', 'thai', 'doctor', 'itcol', 'sayit', 'devtalk', 'interview', 'meeting']],
  ['chal', '🎉', 'ท้าทาย', ['survival', 'timeAttack', 'emojiRun', 'toeicMock']],
];
let gameSkill = 'all'; // chip selected in the games menu: 'all', 'toeic' or a GAME_SKILLS id
const TOEIC_GAMES = ['toeicMock', 'toeic1', 'toeic2', 'toeic3', 'toeic4', 'toeic5', 'toeic6', 'toeic7']; // the 7 parts + mock, in part order (missing ids are skipped)
const TOEIC_CHIP = [...TOEIC_GAMES, 'bizcol']; // the 💼 TOEIC chip: the parts, then practice games for them
// Game id → its skill group id: the tile and its group heading share the skill's colour (1.156.0, CSS `.sk-<id>` → `--sk`).
const SKILL_OF = Object.fromEntries(GAME_SKILLS.flatMap(([sk, , , ids]) => ids.map((id) => [id, sk])));
// Tile badges (1.157.3): the best score is labelled "สถิติ"; once 3+ different games have been played, the ones never tried say "ใหม่".
let gameNewOn = false; // set by renderGames()
const gameTried = (id) => gamePlays(id) > 0 || !!S.glast[id];
function gameTile(id) {
  const g = GAMES[id];
  const best = S.best[id] != null ? `<span class="gb"><i>สถิติ</i> 🏅 ${S.best[id]}</span>` : '';
  const isNew = gameNewOn && !gameTried(id) ? ' <span class="gnew">ใหม่</span>' : '';
  return `<button class="game-tile sk-${SKILL_OF[id] || 'mean'}" data-game="${id}"><div class="gi" aria-hidden="true">${g.icon}</div><div class="gt"><b>${g.name}${isNew}</b><span class="gd">${g.desc}</span></div>${best}</button>`;
}
// Games menu look (1.127): 'list' = one slim row per game (default), 'card' = the big two-column tiles.
const gameView = () => (S.settings.gameView === 'card' ? 'card' : 'list');
const gridCls = () => `game-grid${gameView() === 'list' ? ' list' : ''}`;
const gameFolded = () => new Set(S.settings.gameFold || []); // skill groups folded shut under "ทั้งหมด"
// The reference pages (route 'ref'): [REF_PAGES key in app.js, button id, icon, name].
const REF_LIST = [['pairs', 'toPairs', '🤔', 'คู่คำสับสน'], ['fams', 'toFams', '🧬', 'ครอบครัวคำ'], ['syn', 'toSyn', '≈', 'คำเหมือน–ตรงข้าม'], ['affix', 'toAf', '🧱', 'prefix / suffix'],
  ['roots', 'toRt', '🌱', 'รากศัพท์'], ['ukus', 'toUk', '🇬🇧', 'อังกฤษ–อเมริกัน'], ['phrasal', 'toPV', '🧩', 'Phrasal verbs'], ['idiom', 'toId', '🎭', 'สำนวน'], ['wphr', 'toWp', '📧', 'สำนวนอีเมล / แชตงาน'], ['bizcol', 'toBc', '🤝', 'Collocation ธุรกิจ'], ['abbr', 'toAb', '🔤', 'ตัวย่อในงาน'], ['meeting', 'toMt', '🗓️', 'พูดในประชุม'], ['interview', 'toIv', '🎤', 'สัมภาษณ์งานสายเทค'], ['devtalk', 'toDv', '👩‍💻', 'ภาษาทีมนักพัฒนา'], ['sayit', 'toSy', '🗣️', 'คำที่มักออกเสียงผิด'], ['itcol', 'toIc', '🧑‍💻', 'คำคู่ไอที'], ['doctor', 'toDr', '🩺', 'คุยกับหมอ / ร้านยา'], ['thai', 'toTh', '🇹🇭', 'เล่าเรื่องไทยเป็นอังกฤษ'], ['chat', 'toCh', '💬', 'ภาษาพูด / แชต'], ['regi', 'toRg', '🎩', 'ทางการ ↔ เป็นกันเอง'],
  ['sit', 'toSit', '🗨️', 'ศัพท์ตามสถานการณ์'], ['irr', 'toIrr', '⏪', 'กริยาไม่ปกติ'], ['dprep', 'toDp', '🔗', 'บุพบทที่ตามหลังคำ'], ['mis', 'toMis', '🩹', 'ข้อผิดที่พบบ่อย'],
  ['gpat', 'toGp', '📐', 'ไวยากรณ์ผูกกับคำ'], ['ipa', 'toIpa', '🔡', 'ตารางเสียง IPA']];
function renderRef() {
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="refBack" data-depth="1">‹ กลับ</button></div>
    <p class="small muted" style="margin:0 4px 12px">${REF_LIST.length} หัวข้อ อ่านแล้วกดเล่นเกมของแต่ละหัวข้อได้ · ใช้ได้แม้ออฟไลน์</p>
    <div class="ref-grid">${REF_LIST.map(([k, id, ic, name]) => `<button class="ref-tile" id="${id}" data-r="${k}"><span>${ic}</span>${name}</button>`).join('')}</div>`;
  $('#refBack').onclick = () => go('games');
  view.querySelector('.ref-grid').onclick = (e) => { const b = e.target.closest('[data-r]'); if (b) REF_PAGES[b.dataset.r](); };
}
// The other play pages + the reference library (1.157.1: a strip near the top, sideways scroll on a phone, one row on wider screens;
// it used to sit under all 41 games where few found it).
function gameShortcuts() {
  const t = (attr, ic, name, meta) => `<button class="short-tile" ${attr}><span class="si">${ic}</span><b>${name}</b><small>${meta}</small></button>`;
  return `<div class="small muted games-sec short-h"><b>🎪 เล่นแบบอื่น</b></div><div class="short-grid" role="group" aria-label="เล่นแบบอื่น">
      ${t('data-go="fun"', '🎪', 'โซนสนุก', `🪙 ${coinBal()}`)}
      ${t('id="toRiddle"', '🔤', 'ปริศนาศัพท์', riddleToday().over ? 'ทำแล้ว ✅' : 'คำใหม่วันนี้')}
      ${t('id="toWs"', '🔎', 'ค้นหาคำ', 'ตาราง 10×10')}
      ${t('id="toMap"', '🗺️', 'แผนที่ด่าน', `ผ่าน ${stageTotals()}`)}
      ${t('id="toDuel"', '⚔️', 'ท้าดวลเพื่อน', `${DUEL_N} ข้อ`)}
      ${t('id="toRead"', '📖', 'เรื่องสั้น', `อ่านแล้ว ${Object.keys(S.read).length}/${STORY_COUNT}`)}
      ${t('id="toRef"', '📚', 'คลังความรู้', `${REF_LIST.length} หัวข้อ`)}
    </div>`;
}
// A sideways-scrolling row fades out at its right edge while there is more to see (CSS); `.at-end` drops the fade (1.157.1).
function edgeFade(el) {
  if (!el) return;
  const f = () => el.classList.toggle('at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  el.addEventListener('scroll', f, { passive: true });
  requestAnimationFrame(f); // measured after the page is drawn, never mid-script
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
  const sec = (title, ids) => `<div class="small muted games-sec"><b>${title}</b></div><div class="${gridCls()}">${ids.map(gameTile).join('')}</div>`;
  return (pins.length ? sec('📌 เกมโปรด', pins) : '') + (freq.length ? sec('🕘 เล่นบ่อย', freq) : '');
}
// Today's pick (1.157.0): a short list of [game id, reason], best first; 🔄 steps through it (gamePickN). Words answered wrong
// lately → the review game; then a skill not practised for 3+ days (or never) → its most played game; then games never tried
// (in a daily order); then the games played longest ago. Hidden games and ones that can't start here are left out.
let gamePickN = 0;
function gamePicks() {
  const day = today(), hid = gameHidden();
  const ok = (id) => GAMES[id] && !hid.has(id) && id !== 'review' && !((id === 'speak' || id === 'speakS') && !canListen) && !(STORY_GAMES.includes(id) && !Object.keys(S.read).length);
  const out = [], seen = new Set(), add = (id, why) => { if (!seen.has(id)) { seen.add(id); out.push([id, why]); } };
  const all = Object.keys(GAMES).filter(ok), played = all.filter((id) => gamePlays(id) || S.glast[id]);
  if (!played.length) add('en2th', 'เริ่มจากเกมง่ายๆ: ดูคำอังกฤษแล้วเลือกคำแปล');
  const missed = new Set(); for (const [d, m] of Object.entries(S.miss || {})) if (dayDiff(day, d) <= 3) Object.keys(m || {}).forEach((w) => missed.add(w));
  if (missed.size >= 5 && !hid.has('review') && S.glast.review !== day) add('review', `ช่วงนี้ตอบผิดไป ${missed.size} คำ มาเก็บคำพวกนี้กัน`);
  GAME_SKILLS.filter(([sk]) => sk !== 'chal').map(([, , name, ids]) => {
    const games = ids.filter(ok), last = games.map((g) => S.glast[g]).filter(Boolean).sort().pop();
    const plays = games.reduce((n, g) => n + gamePlays(g), 0);
    return { name, games, days: last ? dayDiff(day, last) : plays ? -1 : Infinity }; // played before dates were kept: unknown, not stale
  }).filter((x) => x.games.length && x.days >= 3).sort((a, b) => b.days - a.days).forEach((x) => {
    const id = x.games.slice().sort((a, b) => gamePlays(b) - gamePlays(a))[0];
    add(id, x.days === Infinity ? `ยังไม่เคยฝึก${x.name}เลย` : `ไม่ได้ฝึก${x.name}มา ${x.days} วันแล้ว`);
  });
  let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const never = all.filter((id) => !played.includes(id));
  never.map((id, k) => [id, (h + k * 2654435761) >>> 0 & 1023]).sort((a, b) => a[1] - b[1]).forEach(([id]) => add(id, 'ยังไม่เคยลองเกมนี้ ✨'));
  played.filter((id) => S.glast[id] && S.glast[id] < day).sort((a, b) => (S.glast[a] < S.glast[b] ? -1 : 1))
    .forEach((id) => { const n = dayDiff(day, S.glast[id]); add(id, n === 1 ? 'เล่นล่าสุดเมื่อวาน' : `เล่นล่าสุดเมื่อ ${n} วันก่อน`); });
  if (!out.length) add(all.includes('en2th') ? 'en2th' : all[0], 'วันนี้เล่นครบทุกแบบแล้ว เก่งมาก! เล่นอีกรอบไหม');
  return out.filter(([id]) => id);
}
const PLAY_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';
function gamePickCard() {
  const list = gamePicks(); if (!list.length) return '';
  const [id, why] = list[gamePickN % list.length], g = GAMES[id];
  return `<div class="card-box gpick sk-${SKILL_OF[id] || 'mean'}" id="gPick">
      <button class="gpick-go" data-pick="${id}"><span class="gi" aria-hidden="true">${g.icon}</span><span class="gt"><small>✨ แนะนำวันนี้</small><b>${g.name}</b><span class="gw">${why}</span></span><span class="gpick-play">${PLAY_SVG}</span></button>
      ${list.length > 1 ? `<button class="icon-btn gpick-next" id="gPickNext" aria-label="แนะนำเกมอื่น" title="แนะนำเกมอื่น">🔄</button>` : ''}
    </div>`;
}
function bindGamePick() {
  const box = $('#gPick'); if (!box) return;
  box.querySelector('[data-pick]').onclick = (e) => startGame(e.currentTarget.dataset.pick);
  const nx = $('#gPickNext');
  if (nx) nx.onclick = () => { gamePickN++; box.outerHTML = gamePickCard(); bindGamePick(); const b = $('#gPickNext'); if (b) b.focus({ preventScroll: true }); };
}
// "ความยากเกมตัวเลือก" text for the games menu and result screen.
function diffLabel() {
  const d = gameDiff(), auto = !S.settings.gdiff || S.settings.gdiff === 'auto';
  return '⭐'.repeat(d) + ' ' + ['ปกติ', 'ตัวเลือกลวงคล้ายขึ้น', 'ตัวเลือกคล้ายขึ้น + จับเวลาข้อละ 12 วินาที'][d - 1] + (auto ? ` · อัตโนมัติ (แม่น ${Math.round(((S.gacc || {}).a || 0.7) * 100)}%)` : ' · ตั้งเอง');
}
// Short form for the games menu's 🎚️ pill (1.157.2): stars + a word + the accuracy (auto) or "ตั้งเอง"; the full text is its label.
function diffShort() {
  const d = gameDiff(), auto = !S.settings.gdiff || S.settings.gdiff === 'auto';
  return '⭐'.repeat(d) + ' ' + ['ปกติ', 'ยากขึ้น', 'ยาก + จับเวลา'][d - 1] + (auto ? ` · แม่น ${Math.round(((S.gacc || {}).a || 0.7) * 100)}%` : ' · ตั้งเอง');
}
// Games not pinned or hidden, as the "all games" list: chips by skill + the tiles (grouped under headings when "all").
// 🌱 simple mode (1.232.0): a short list of core games; "show all" opens the full menu until the app is reopened (gameAllNow).
let gameAllNow = false;
const gameSimple = () => simpleOn() && !gameAllNow;
function simpleGameList() {
  const hid = gameHidden(), ids = SIMPLE_GAMES.filter((g) => GAMES[g] && !hid.has(g));
  const n = Object.keys(GAMES).length;
  return `<div class="${gridCls()}">${ids.map(gameTile).join('')}</div>
    <button class="card-box guide-link" id="gAll"><span>🎮</span><div class="grow"><b>แสดงเกมทั้งหมด (${n} เกม)</b><div class="small muted">🌱 โหมดเรียบง่ายแสดงแค่ ${ids.length} เกมหลัก · ปิดโหมดได้ที่ ⚙️ ตั้งค่า → หน้าตา</div></div></button>`;
}
function gameList() {
  const skip = new Set([...gamePins(), ...gameHidden()]);
  const groups = GAME_SKILLS.map(([id, ic, name, ids]) => [id, ic, name, ids.filter((g) => GAMES[g] && !skip.has(g))]).filter((g) => g[3].length);
  // 💼 TOEIC chip (1.188.0): every TOEIC Part game in part order, whatever skill group it sits in.
  const toeic = ['toeic', '💼', 'TOEIC', TOEIC_CHIP.filter((g) => GAMES[g] && !skip.has(g))];
  if (gameSkill !== 'all' && !(gameSkill === 'toeic' ? toeic[3].length : groups.some((g) => g[0] === gameSkill))) gameSkill = 'all';
  const n = groups.reduce((a, g) => a + g[3].length, 0);
  const chips = [['all', '🎮', 'ทั้งหมด', n], ...(toeic[3].length ? [toeic] : []).map((g) => [g[0], g[1], g[2], g[3].length]), ...groups.map((g) => [g[0], g[1], g[2], g[3].length])]
    .map(([id, ic, name, c]) => `<button class="chip${gameSkill === id ? ' on' : ''}" data-skill="${id}" aria-pressed="${gameSkill === id}">${ic} ${name} <small>${c}</small></button>`).join('');
  const shown = gameSkill === 'all' ? groups : gameSkill === 'toeic' ? [toeic] : groups.filter((g) => g[0] === gameSkill);
  const fold = gameFolded(), all = gameSkill === 'all';
  const body = shown.map(([id, ic, name, ids]) => {
    const shut = all && fold.has(id);
    const head = all ? `<button class="small muted games-sec fold sk-${id}" data-fold="${id}" aria-expanded="${!shut}"><b>${ic} ${name}</b><small>${ids.length}</small><i aria-hidden="true">▾</i></button>` : '';
    return head + (shut ? '' : `<div class="${gridCls()}">${ids.map(gameTile).join('')}</div>`);
  }).join('');
  const hub = gameSkill === 'toeic' ? '<button class="card-box guide-link th-link" id="toToeic"><span>💼</span><div class="grow"><b>เปิดศูนย์ TOEIC</b><div class="small muted">แผนวันนี้ ข้อสอบจำลอง ความแม่นแต่ละพาร์ต และศัพท์ TOEIC ในหน้าเดียว</div></div><span class="muted">›</span></button>' : '';
  return `<div class="chips skill-chips" id="gSkill" role="group" aria-label="กรองเกมตามทักษะ">${chips}</div>${hub}${body}`;
}
function renderGames() {
  if (gameSource === 'custom') gameSource = 'level';
  gameDecks = gameDecks.filter((id) => deckById(id)); // a set deleted meanwhile (also by another device) drops out
  if (gameSource === 'deck' && !gameDecks.length) gameSource = 'level';
  const decks = liveDecks();
  gameNewOn = Object.keys(GAMES).filter(gameTried).length >= 3;
  const srcName = { level: `ระดับ ${lvNames(S.settings.levels)}`, learned: 'คำที่เรียนแล้ว', all: 'ทุกระดับ', mastered: '🟢 คำที่จำได้แล้ว', star: '⭐ คำติดดาว', leech: '🐢 คำดื้อ', topic: '📂 ตามหมวด', goal: '🎯 ตามเป้าหมาย', deck: gameDecks.length === 1 ? `📚 ${esc(deckById(gameDecks[0]).name || 'ชุดไม่มีชื่อ')}` : `📚 ${gameDecks.length} ชุด (โหมดซ้อม)` }[gameSource] || '';
  view.innerHTML = `
    <div class="card-box src-box">
      <div class="src-row">
        <button class="src-btn src-pill" id="srcBtn" aria-expanded="${gameSrcOpen}"><span class="small muted">📚 คำจาก</span><b>${srcName}</b><i aria-hidden="true">▾</i></button>
        <button class="src-pill diff-pill" id="gDiffSet" aria-label="ความยากเกมตัวเลือก: ${diffLabel()} · แตะเพื่อปรับในตั้งค่า"><span id="gDiff">🎚️ ${diffShort()}</span><i aria-hidden="true">›</i></button>
      </div>
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
      ${gameSource === 'mastered' ? '<div class="small muted" style="margin-top:8px">เช็คว่ายังจำได้จริงไหม คำที่ตอบผิดจะกลับไปอยู่ในแฟลชการ์ดให้ทบทวนอีกครั้ง</div>' : ''}
    </div>
    ${gameEdit ? '' : gamePickCard() + (gameSimple() ? '' : gameShortcuts() + gameSections())}
    <div class="row games-head"><b class="grow">${gameEdit ? '✏️ จัดหน้าเกม' : (gamePins().length ? '🎮 เกมอื่นๆ' : '🎮 เกมทั้งหมด')}</b>${gameEdit ? '' : `<div class="seg gview-seg" id="gView" role="group" aria-label="รูปแบบรายการเกม">${[['list', '☰', 'รายการ'], ['card', '🔲', 'การ์ด']].map(([v, ic, t]) => `<button data-gv="${v}" class="${gameView() === v ? 'on' : ''}" aria-pressed="${gameView() === v}" aria-label="ดูแบบ${t}"><span aria-hidden="true">${ic}</span><span class="gv-t"> ${t}</span></button>`).join('')}</div>`}<button class="btn${gameEdit ? ' primary' : ''}" id="gEdit">${gameEdit ? '✓ เสร็จ' : '✏️ จัดเกม'}</button></div>
    ${gameEdit ? gameEditor() : gameSimple() ? simpleGameList() : `${gameList()}
    ${gameHidden().size ? `<details class="card-box hidden-games"><summary class="small muted">🙈 เกมที่ซ่อนไว้ (${gameHidden().size})</summary><div class="${gridCls()}" style="margin-top:10px">${[...gameHidden()].map(gameTile).join('')}</div></details>` : ''}`}`;
  if ($('#gSkill')) $('#gSkill').onclick = (e) => {
    const c = e.target.closest('[data-skill]'); if (!c) return;
    gameSkill = c.dataset.skill;
    const top = view.scrollTop; renderGames(); view.scrollTop = top;
    const on = $('#gSkill .chip.on'); if (on) { on.focus({ preventScroll: true }); $('#gSkill').scrollLeft = on.offsetLeft - ($('#gSkill').clientWidth - on.offsetWidth) / 2; } // the re-render reset the chip row: keep the chosen chip in view
  };
  $('#gEdit').onclick = () => { gameEdit = !gameEdit; renderGames(); if (gameEdit) $('#gEdit').scrollIntoView({ block: 'start' }); };
  if (gameEdit) bindGameEditor();
  if (!gameEdit) {
    bindGamePick();
    edgeFade(view.querySelector('.short-grid')); edgeFade($('#gSkill'));
    const to = (sel, r) => { const el = $(sel); if (el) el.onclick = () => go(r); }; // the strip is not there in simple mode
    to('#toRead', 'read'); to('#toRiddle', 'riddle'); to('#toDuel', 'duel'); to('#toMap', 'map'); to('#toWs', 'wsearch'); to('#toRef', 'ref');
    if ($('#gAll')) $('#gAll').onclick = () => { gameAllNow = true; renderGames(); };
    if ($('#toToeic')) $('#toToeic').onclick = () => go('toeic', 'games');
    $('#gView').onclick = (e) => {
      const b = e.target.closest('[data-gv]'); if (!b || b.dataset.gv === gameView()) return;
      S.settings.gameView = b.dataset.gv; save(); const top = view.scrollTop; renderGames(); view.scrollTop = top;
      view.querySelector(`[data-gv="${b.dataset.gv}"]`).focus({ preventScroll: true });
    };
    view.querySelectorAll('[data-fold]').forEach((b) => (b.onclick = () => {
      const f = gameFolded(), id = b.dataset.fold;
      if (f.has(id)) f.delete(id); else f.add(id);
      S.settings.gameFold = [...f]; save();
      const top = view.scrollTop; renderGames(); view.scrollTop = top;
      const nb = view.querySelector(`[data-fold="${id}"]`); if (nb) nb.focus({ preventScroll: true });
    }));
  }
  $('#gDiffSet').onclick = () => { // straight to the setting: settings search filled in (1.157.2)
    go('settings');
    const q = $('#setQ'); if (!q) return;
    q.value = 'ความยากเกม'; q.oninput();
    const row = $('#gdiff'); if (row) row.scrollIntoView({ block: 'center' });
  };
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
  $('#pBack').onclick = () => go('ref');
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
  $('#fBack').onclick = () => go('ref');
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
  if (id === 'real') return rtItems();
  if (id === 'wphr') return wpItems();
  if (id === 'bizcol') return bcItems();
  if (id === 'regi') return rgItems();
  if (PB[id]) return pbItems(id);
  if (id === 'pbear') return pbEarItems();
  if (id === 'pbsay') return pbSayItems();
  if (id === 'email') return emItems();
  if (id === 'wpdict') return wpItems();
  if (id === 'toeic5') return p5Items();
  if (id === 'toeic7') return p7Items();
  if (id === 'toeic6') return p6Items();
  if (id === 'toeic2') return p2Items();
  if (id === 'toeic1') return p1Items();
  if (id === 'toeicMock') return mockItems();
  if (id === 'toeic3') return p34Items(3);
  if (id === 'toeic4') return p34Items(4);
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
    : gameSource === 'deck' ? [...new Map(gameDecks.map(deckById).filter(Boolean).flatMap((d) => deckWords(d)).filter((w) => !w.own).map((w) => [w.idx, w])).values()]
    : gameSource === 'all' ? W : pool();
  if (id === 'cloze' || id === 'dict') list = list.filter(hasCloze);
  if (id === 'order') list = list.filter((w) => { const n = w.e.split(/\s+/).length; return n >= 4 && n <= 12; });
  if (id === 'colloc') list = list.filter((w) => COLLOC && COLLOC[w.w]);
  if (id === 'emoji' || id === 'emojiRun') list = list.filter((w) => EMOJI && EMOJI[w.w]);
  if (id === 'guess') { list = list.filter(hasCloze); const fresh = list.filter((w) => !S.prog[w.w]); if (fresh.length >= 10) list = fresh; } // words you haven't met yet
  if (id === 'dictW') list = list.filter((w) => !/\s/.test(w.w) && w.w.length >= 3);
  if (id === 'dictS') list = list.filter((w) => { const n = dictTokens(w.e).length; return n >= 3 && n <= 12; });
  if (id === 'ipa') list = list.filter((w) => w.i && w.i.length >= 4 && !/\s/.test(w.w));
  if (id === 'hand') list = list.filter((w) => /^[a-z][a-z' -]{0,15}$/i.test(w.w)); // fits one line of the writing pad
  if (id === 'hangman' || id === 'anagram') list = list.filter((w) => /^[a-z]{4,12}$/i.test(w.w)); // single words: letters only
  return list;
}

/* ---------- round panel ---------- */
// "รอบนี้" panel beside ไถศัพท์ (1.217.0) and the quiz games (1.219.0) on an iPad in landscape (CSS shows it from 1100×700).
// settings.feedSide 'right' | 'left' | 'off' places it; settings.optSide moves the answers. Both can be switched from the panel.
const RP_MQ = matchMedia('(min-width: 1100px) and (min-height: 700px) and (orientation: landscape)');
const rpClock = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)); return t >= 3600 ? `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const rpAside = (id) => (S.settings.feedSide === 'off' ? '' : `<aside class="side-stats fs-panel${S.settings.feedSide === 'left' ? ' fs-left' : ''}" id="${id}" aria-label="สถิติรอบนี้"></aside>`);
// o = { title, ok, bad, of (questions in the round, or 0), t0, pts: [value, label], combo, best, rows: [[label, value]], log: [true/false], miss: [words] }
// 1.219.1 look: a ring with the % right beside right / wrong / questions, then small tiles, the last answers and the missed words;
// the answers-side button sits at the bottom of the panel.
function rpHtml(o) {
  const n = o.ok + o.bad, acc = n ? Math.round(o.ok / n * 100) : null, ms = Date.now() - o.t0, left = S.settings.feedSide === 'left', oLeft = S.settings.optSide === 'left';
  const log = o.log.slice(-20), miss = [...new Set(o.miss.filter((w) => w && w.idx >= 0 && W[w.idx] === w))];
  const tile = (v, t, cls = '') => `<div class="rp-t"><b${cls ? ` class="${cls}"` : ''}>${v}</b><span>${t}</span></div>`;
  return `<div class="fs-top"><span>${esc(o.title || 'รอบนี้')}</span><button class="fs-swap" data-fsswap aria-label="ย้ายแผงไปฝั่ง${left ? 'ขวา' : 'ซ้าย'}">${left ? 'ไปขวา ›' : '‹ ไปซ้าย'}</button></div>
    <div class="rp-head">
      <div class="rp-ring" style="--p:${acc || 0}" role="img" aria-label="${acc == null ? 'ยังไม่ได้ตอบ' : `ตอบถูก ${acc}%`}"><b>${acc == null ? '–' : acc + '<small>%</small>'}</b><span>ถูก</span></div>
      <div class="rp-cnt">
        <div><span>✅ ถูก</span><b>${o.ok}</b></div>
        <div><span>❌ ผิด</span><b class="fs-bad">${o.bad}</b></div>
        <div><span>${o.of ? 'ข้อที่' : 'ทั้งหมด'}</span><b>${n}${o.of ? `<small>/${o.of}</small>` : ''}</b></div>
      </div>
    </div>
    <div class="rp-tiles">
      ${tile(rpClock(ms), '⏱️ เวลา', 'rp-clock" data-t0="' + o.t0)}
      ${tile(n ? Math.round(ms / 1000 / n) : '–', 'วินาที/ข้อ')}
      ${tile((o.combo ? '🔥' : '') + o.combo + `<small> / ${o.best}</small>`, 'คอมโบ / สูงสุด')}
      ${tile(o.pts[0], o.pts[1])}
      ${(o.rows || []).map(([t, v]) => tile(v, t)).join('')}
    </div>
    ${log.length ? `<div class="ss-h">ล่าสุด</div><div class="fs-dots" role="img" aria-label="ถูก ${log.filter(Boolean).length} จาก ${log.length} ข้อล่าสุด">${log.map((ok) => `<i class="${ok ? 'ok' : 'bad'}"></i>`).join('')}</div>` : ''}
    ${miss.length ? `<div class="ss-h">คำที่ผิด (แตะเพื่อดู)</div><div class="fs-miss">${miss.slice(-12).reverse().map((w) => `<button class="chip" data-fsw="${w.idx}" lang="en">${esc(w.w)}</button>`).join('')}</div>` : ''}
    <button class="fs-swap fs-opt" data-optswap aria-label="ย้ายตัวเลือกคำตอบไปฝั่ง${oLeft ? 'ขวา' : 'ซ้าย'}">🎮 ย้ายคำตอบไป${oLeft ? 'ขวา' : 'ซ้าย'}</button>`;
}
// Clicks inside a panel: move it, move the answers, open a missed word. redraw() rebuilds the panel's content.
function rpClick(e, el, redraw) {
  if (e.target.closest('[data-fsswap]')) {
    S.settings.feedSide = S.settings.feedSide === 'left' ? 'right' : 'left'; save();
    el.classList.toggle('fs-left', S.settings.feedSide === 'left'); return redraw();
  }
  if (e.target.closest('[data-optswap]')) {
    S.settings.optSide = S.settings.optSide === 'left' ? 'right' : 'left'; save(); applyThumbs(); return redraw();
  }
  const b = e.target.closest('[data-fsw]'); if (b && W[+b.dataset.fsw]) openSheet(W[+b.dataset.fsw]);
}
// The clock in any open panel ticks every second.
setInterval(() => { if (!RP_MQ.matches) return; view.querySelectorAll('.rp-clock').forEach((c) => { c.textContent = rpClock(Date.now() - +c.dataset.t0); }); }, 1000);

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
  if (id === 'wpdict' && !WORKPHR) { withLoading(loadWorkPhr()).then(() => startGame(id)); return; }
  if (id === 'email' && !EMAILS) { withLoading(loadEmails()).then(() => startGame(id)); return; }
  if ((id === 'pbear' || id === 'pbsay') && pbEarIds().some((b) => !PB_DATA[b])) { withLoading(pbEarLoad()).then(() => startGame(id)); return; }
  if (PB[id] && !PB_DATA[id]) { withLoading(loadBook(id)).then(() => startGame(id)); return; }
  if (id === 'regi' && !REGISTER) { withLoading(loadRegister()).then(() => startGame(id)); return; }
  if (id === 'bizcol' && !BIZCOL) { withLoading(loadBizCol()).then(() => startGame(id)); return; }
  if (id === 'wphr' && !WORKPHR) { withLoading(loadWorkPhr()).then(() => startGame(id)); return; }
  if (id === 'real' && !REALTEXT) { withLoading(loadRealText()).then(() => startGame(id)); return; }
  if (id === 'toeic7' && !TOEICP7) { withLoading(loadP7()).then(() => startGame(id)); return; }
  if ((id === 'toeic3' || id === 'toeic4') && !P34[id.slice(-1)]) { withLoading(loadP34(+id.slice(-1))).then(() => startGame(id)); return; }
  if (id === 'toeicMock' && !mockReady()) { withLoading(mockLoad()).then(() => startGame(id)); return; }
  if (id === 'toeic1' && !TOEICP1) { withLoading(loadP1()).then(() => startGame(id)); return; }
  if (id === 'toeic2' && !TOEICP2) { withLoading(loadP2()).then(() => startGame(id)); return; }
  if (id === 'toeic6' && !TOEICP6) { withLoading(loadP6()).then(() => startGame(id)); return; }
  if (id === 'toeic5' && !TOEICP5) { withLoading(loadP5()).then(() => startGame(id)); return; }
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
  mine[id] = (mine[id] || 0) + 1; S.glast[id] = today(); actGame = id; actEvent('round'); save();
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
