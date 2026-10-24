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
  affix: { icon: '🧱', name: 'เติมหน้า–ท้ายคำ', desc: 'un-, -ful, -less … เลือกให้ได้ความหมาย' },
  idiom: { icon: '🎭', name: 'สำนวน', desc: 'piece of cake = ? เลือกความหมายหรือสำนวนให้ถูก' },
  sit: { icon: '🗨️', name: 'ตอบให้เข้าสถานการณ์', desc: 'เลือกประโยคถัดไปในบทสนทนา' },
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
const SKILL_GAMES = [...PAIR_GAMES, 'wform', 'phrasal', 'syn', 'affix', 'idiom', 'sit', 'irreg', ...GEN_GAMES];
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
    <button class="card-box guide-link" id="toMap"><span>🗺️</span><div class="grow"><b>แผนที่ด่าน</b><div class="small muted">เดินทางผ่านด่านของแต่ละหมวด ด่านละ 8 ข้อ ได้ ★ 1–3 · ผ่าน ${stageTotals()} ด่าน</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toDuel"><span>⚔️</span><div class="grow"><b>ท้าดวลเพื่อน</b><div class="small muted">ข้อสอบ ${DUEL_N} ข้อจากรหัสสั้นๆ ส่งรหัสให้เพื่อนเล่นชุดเดียวกันแล้วเทียบคะแนน</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="toRead"><span>📖</span><div class="grow"><b>อ่านเรื่องสั้น</b><div class="small muted">${STORY_COUNT} เรื่อง · อ่านแล้ว ${Object.keys(S.read).length} · แตะคำเพื่อดูความหมาย</div></div><span class="muted">›</span></button>
    <div class="card-box ref-box"><div class="small muted"><b>📚 คลังความรู้</b> อ่านแล้วกดเล่นเกมของแต่ละหัวข้อได้</div>
      <div class="ref-grid">
        <button class="ref-tile" id="toPairs"><span>🤔</span>คู่คำสับสน</button>
        <button class="ref-tile" id="toFams"><span>🧬</span>ครอบครัวคำ</button>
        <button class="ref-tile" id="toSyn"><span>≈</span>คำเหมือน–ตรงข้าม</button>
        <button class="ref-tile" id="toAf"><span>🧱</span>prefix / suffix</button>
        <button class="ref-tile" id="toPV"><span>🧩</span>Phrasal verbs</button>
        <button class="ref-tile" id="toId"><span>🎭</span>สำนวน</button>
        <button class="ref-tile" id="toSit"><span>🗨️</span>ศัพท์ตามสถานการณ์</button>
        <button class="ref-tile" id="toIrr"><span>⏪</span>กริยาไม่ปกติ</button>
      </div></div>
    <div class="row games-head"><b class="grow">${gameEdit ? '✏️ จัดหน้าเกม' : (gamePins().length ? '🎮 เกมอื่นๆ' : '🎮 เกมทั้งหมด')}</b><button class="btn${gameEdit ? ' primary' : ''}" id="gEdit">${gameEdit ? '✓ เสร็จ' : '✏️ จัดเกม'}</button></div>
    ${gameEdit ? gameEditor() : `<div class="game-grid">${Object.keys(GAMES).filter((id) => !gameHidden().has(id) && !gamePins().includes(id)).map(gameTile).join('')}</div>
    ${gameHidden().size ? `<details class="card-box hidden-games"><summary class="small muted">🙈 เกมที่ซ่อนไว้ (${gameHidden().size})</summary><div class="game-grid" style="margin-top:10px">${[...gameHidden()].map(gameTile).join('')}</div></details>` : ''}`}`;
  $('#gEdit').onclick = () => { gameEdit = !gameEdit; renderGames(); if (gameEdit) $('#gEdit').scrollIntoView({ block: 'start' }); };
  if (gameEdit) bindGameEditor();
  $('#toRead').onclick = () => go('read');
  $('#toRiddle').onclick = () => go('riddle');
  $('#gDiffSet').onclick = (e) => { e.preventDefault(); go('settings'); };
  $('#toDuel').onclick = () => go('duel');
  $('#toMap').onclick = () => go('map');
  $('#toId').onclick = () => renderIdioms();
  $('#toSit').onclick = () => renderSit();
  $('#toIrr').onclick = () => renderIrregular();
  $('#toPairs').onclick = () => renderPairs();
  $('#toFams').onclick = () => renderFamilies();
  $('#toPV').onclick = () => renderPhrasal();
  $('#toSyn').onclick = () => renderSyn();
  $('#toAf').onclick = () => renderAffix();
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
      : '<p class="muted center">ไม่พบคำนี้ในครอบครัวคำ</p>';
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
  if (id === 'irreg') return irregItems();
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
function hardDistractors(w, n, field) {
  const pos = w.p.split('/')[0];
  const key = (x) => (field === 't' ? thFirst(x.t) : x.w.toLowerCase());
  const score = (x) => (field === 't' ? (x.tp === w.tp ? 3 : 0) + (x.g === w.g ? 1 : 0) : simScore(w.w, x.w) + (x.g === w.g ? 1 : 0))
    + (x.p.split('/')[0] === pos ? 2 : 0) + Math.random() * 2;
  const used = new Set([key(w)]), out = [];
  for (const x of W.filter((x) => x !== w && x.t !== w.t).map((x) => [score(x), x]).sort((a, b) => b[0] - a[0])) {
    const k = key(x[1]);
    if (used.has(k)) continue;
    used.add(k); out.push(x[1]);
    if (out.length >= n) break;
  }
  return out;
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
  if (STORY_GAMES.includes(id) && !STORIES) { withLoading(loadStories()).then(() => startGame(id)); return; }
  if ((id === 'emoji' || id === 'emojiRun') && !EMOJI) { withLoading(loadEmoji()).then(() => startGame(id)); return; }
  if (id === 'colloc' && !COLLOC) { withLoading(loadColloc()).then(() => startGame(id)); return; }
  if (PAIR_GAMES.includes(id) && !CONFUSE) { withLoading(loadPairs()).then(() => startGame(id)); return; }
  if (id === 'wform' && !FAMILIES) { withLoading(loadFamilies()).then(() => startGame(id)); return; }
  if (id === 'phrasal' && !PHRASAL) { withLoading(loadPhrasal()).then(() => startGame(id)); return; }
  if (id === 'syn' && !SYN) { withLoading(loadSyn()).then(() => startGame(id)); return; }
  if (id === 'affix' && !AFFIX) { withLoading(loadAffix()).then(() => startGame(id)); return; }
  if (id === 'idiom' && !IDIOMS) { withLoading(loadIdioms()).then(() => startGame(id)); return; }
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

// deckRun: {} = main progress, { map } = one set's progress table, { practice: true } = several sets (no progress written).
function playQuiz(mode, src, gameId, deckRun = {}, stage = null) {
  const ROUND = 10;
  // Endless run (emojiRun): no round limit, wrong answers only reset the streak; the player ends it themselves.
  // Survival (3 hearts, words climb from A1 to C1) and time attack (60 s) are endless runs too.
  const SURV = gameId === 'survival', TIMED = gameId === 'timeAttack', EMOJI_RUN = gameId === 'emojiRun';
  const ENDLESS = EMOJI_RUN || SURV || TIMED;
  // Level-map stage (js/map.js): the stage's words, each asked once in a mix of games; ends on the stars screen.
  const STAGE = gameId === 'stage';
  const GNAME = STAGE ? stage.title : GAMES[gameId].name;
  const leave = () => (STAGE ? go('map', stage.topic) : go('games'));
  let lastMode = '';
  const stagePick = (w) => {
    const ok = ['en2th', 'th2en', 'listen'];
    if (hasCloze(w)) ok.push('cloze');
    if (/^[a-z]{4,12}$/i.test(w.w)) ok.push('anagram');
    return (lastMode = pick(ok.filter((x) => x !== lastMode)));
  };
  const TIME_LIMIT = 60;
  const items = SURV ? [] : SKILL_GAMES.includes(gameId) && !GEN_GAMES.includes(gameId) ? lexPick(gameId, src, ROUND) : shuffle(src).slice(0, ENDLESS || STAGE ? src.length : ROUND);
  let i = 0, score = 0, combo = 0, bestCombo = 0, asked = 0, hearts = 3, reach = 0, finished = false, timeLeft = TIME_LIMIT;
  const wrong = [];
  $('#title').textContent = GNAME;

  // Top-right status of an endless run (rebuilt after every answer).
  const runStat = () => (SURV ? `${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)} · ✅ <b>${asked - wrong.length}</b>`
    : TIMED ? `⏱ <b id="tLeft">${Math.ceil(timeLeft)}</b> · ✅ <b>${asked - wrong.length}</b>`
    : `🔥 <b>${combo}</b> · 🏅 ${Math.max(S.best[gameId] || 0, bestCombo)}`);
  function header() {
    if (ENDLESS) {
      $('#title').textContent = `${GNAME} · ข้อ ${i + 1}`;
      const bar = TIMED ? timeLeft / TIME_LIMIT * 100 : SURV ? asked % 5 * 20 : combo % 10 * 10;
      return `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="จบรอบ">✕</button>
      <div class="progress"><div id="tBar" style="width:${bar}%"></div></div>
      <span class="small" id="runStat">${runStat()}</span></div>`;
    }
    if (i < items.length) $('#title').textContent = `${GNAME} · ${i + 1}/${items.length}`;
    return `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <div class="progress"><div style="width:${i / items.length * 100}%"></div></div>
      <span class="small"><b>${score}</b> แต้ม</span></div>`;
  }

  const quit = () => (ENDLESS && asked ? result() : leave());
  // Survival: the level climbs every 5 questions (A1 → C1); falls back to the nearest level the word source has.
  function survivalPick() {
    const want = Math.min(LEVELS.length - 1, Math.floor(i / 5));
    const recent = new Set(items.slice(-15));
    for (let d = 0; d < LEVELS.length; d++) {
      for (const l of d ? [want - d, want + d] : [want]) {
        const c = src.filter((x) => x.g === LEVELS[l] && !recent.has(x));
        if (c.length) return pick(c);
      }
    }
    return pick(src);
  }
  if (TIMED) {
    const t0 = Date.now();
    const tick = setInterval(() => {
      timeLeft = Math.max(0, TIME_LIMIT - (Date.now() - t0) / 1000);
      const l = $('#tLeft'), b = $('#tBar');
      if (l) l.textContent = Math.ceil(timeLeft);
      if (b) b.style.width = timeLeft / TIME_LIMIT * 100 + '%';
      if (timeLeft <= 0) result();
    }, 100);
    cleanup = () => clearInterval(tick);
  }
  function q() {
    if (finished) return;
    if (ENDLESS && i >= items.length) items.push(...(SURV ? [survivalPick()] : shuffle(src).filter((x) => x !== items[items.length - 1])));
    if (i >= items.length) return result();
    const w = items[i];
    reach = Math.max(reach, LEVELS.indexOf(w.g));
    const m = STAGE ? stagePick(w) : SURV ? pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'cloze'] : ['en2th', 'th2en', 'listen'])
      : TIMED ? pick(['en2th', 'th2en'])
      : gameId === 'review' ? pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'spell', 'cloze'] : ['en2th', 'th2en', 'listen', 'spell']) : mode;
    if (m === 'spell') return qSpell(w);
    if (m === 'hangman') return qHangman(w);
    if (m === 'anagram') return qAnagram(w);
    if (m === 'speak') return qSpeak(w);
    if (m === 'speakS') return qSpeak(w, true);
    if (m === 'dict') return qDict(w);
    if (m === 'order') return qOrder(w, w.e, w.et);
    if (m === 'sOrder') return qOrder(w, w._s, '', w._st);
    if (m === 'sCloze') return qSCloze(w);
    if (m === 'colloc') return qColloc(w);
    if (m === 'emoji') return qEmoji(w);
    if (m === 'confuse') return qConfuse(w);
    if (m === 'minpair') return qMinpair(w);
    if (m === 'wform') return qWform(w);
    if (m === 'phrasal') return qPhrasal(w);
    if (m === 'syn') return qSyn(w);
    if (m === 'affix') return qAffix(w);
    if (m === 'idiom') return qIdiom(w);
    if (m === 'sit') return qSit(w);
    if (m === 'num') return qNum(w);
    if (m === 'irreg') return qIrreg(w);
    const toTh = m !== 'th2en' && m !== 'cloze';
    const diff = gameDiff();
    const opts = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w', diff >= 2)]);
    const limit = diff >= 3 && !ENDLESS ? (m === 'cloze' ? 15 : 12) : 0; // seconds per question
    let prompt;
    if (m === 'en2th') prompt = `<div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
    else if (m === 'th2en') prompt = `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
    else if (m === 'cloze') {
      const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
      prompt = `<div class="cloze" lang="en">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="clozeHint">💡 ดูคำแปลประโยค</button><div class="thx" id="clozeTh" hidden>${esc(w.et)}</div>`;
    }
    else prompt = `<button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button><div class="muted small" style="margin-top:10px">แตะเพื่อฟังอีกครั้ง</div>${slowBtn(w.w)}`;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>${prompt}${limit ? `<div class="q-timer" aria-hidden="true"><i style="--t:${limit}s"></i></div>` : ''}</div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(toTh ? o.t : o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = quit;
    if ((m === 'en2th' || m === 'listen') && !TIMED) speak(w.w);
    const say = view.querySelector('[data-say]'); if (say) say.onclick = () => speak(w.w);
    const hb = $('#clozeHint'); if (hb) hb.onclick = () => { $('#clozeTh').hidden = false; hb.remove(); };
    let answered = false, tm = null;
    // b = the tapped option, or null when the time ran out
    const choose = (b) => {
      if (answered) return;
      answered = true; clearTimeout(tm);
      const ok = !!b && +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (b && !ok) b.classList.add('wrong');
      gameAcc(ok);
      mark(w, ok);
      if (ENDLESS) $('#runStat').innerHTML = runStat();
      const out = SURV && hearts <= 0;
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `${b ? '❌' : '⏰ หมดเวลา'} <b>${esc(w.w)}</b> = ${esc(w.t)}`)
        + (!TIMED && (m === 'cloze' || !ok) ? hookBox(w) + exampleBox(w) : '')
        + (out ? '<div class="center" style="margin-top:8px">💔 หัวใจหมดแล้ว</div>' : '')
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">${out ? 'ดูผล →' : 'ถัดไป →'}</button>`;
      bindSayEx(view, w.e); // buttons only present when the example is shown
      $('#nextQ').onclick = next;
      if (!TIMED) { if (m === 'cloze') speak(w.e); else if (m === 'th2en') speak(w.w); }
      if (TIMED) setTimeout(() => { if (items[i] === w) next(); }, ok ? 350 : 1200);
      else if (ok && m !== 'cloze') setTimeout(() => { if (items[i] === w) next(); }, 1000);
    };
    view.querySelector('.options').onclick = (e) => { const b = e.target.closest('.opt'); if (b) choose(b); };
    if (limit) {
      tm = setTimeout(() => { if (current === 'games') choose(null); }, limit * 1000);
      cleanup = () => clearTimeout(tm);
    }
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
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const inp = $('#si');
    inp.focus();
    let tries = 0, answered = false;
    const norm = (s) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = w.w; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! ${esc(w.i)}` : `❌ คำตอบคือ <b>${esc(w.w)}</b> ${esc(w.i)}`)
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
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

  // Hangman: Thai meaning + blanks (first letter shown), tap letters; 6 misses lose. Right = solved with at most 3 misses.
  function qHangman(w) {
    const word = w.w.toLowerCase(), LIVES = 6;
    const guessed = new Set([word[0]]), misses = [];
    let answered = false;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>
        <div class="hg-word" id="hgWord" lang="en" role="img"></div>
        <div class="hg-lives" id="hgLives"></div></div>
      <div class="hg-kb" id="hgKb">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div class="hg-kr">${[...r].map((c) => `<button class="hg-k" data-l="${c}" lang="en">${c}</button>`).join('')}</div>`).join('')}</div>
      <button class="btn block" id="hgGive" style="margin-top:12px">ไม่รู้ / เฉลย</button>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const solved = () => [...word].every((c) => guessed.has(c));
    const paint = (reveal) => {
      $('#hgWord').innerHTML = [...word].map((c) => `<span class="hg-c${reveal && !guessed.has(c) ? ' miss' : ''}">${guessed.has(c) || reveal ? c : ''}</span>`).join('');
      $('#hgWord').setAttribute('aria-label', [...word].map((c) => (guessed.has(c) || reveal ? c : 'ว่าง')).join(' '));
      $('#hgLives').innerHTML = '❤️'.repeat(LIVES - misses.length) + '🖤'.repeat(misses.length)
        + (misses.length ? ` <span class="small muted" lang="en">${misses.join(' ').toUpperCase()}</span>` : '');
      view.querySelectorAll('.hg-k').forEach((b) => {
        const l = b.dataset.l;
        b.disabled = answered || guessed.has(l) || misses.includes(l);
        b.classList.toggle('hit', guessed.has(l)); b.classList.toggle('miss', misses.includes(l));
      });
    };
    const stop = () => document.removeEventListener('keydown', onKey);
    const done = (win) => {
      answered = true; stop(); cleanup = null;
      const ok = win && misses.length <= 3;
      mark(w, ok);
      paint(true);
      $('#reveal').innerHTML = (win ? (ok ? '✅ เก่งมาก!' : '👍 แก้ได้ แต่พลาดหลายครั้ง ยังไม่นับว่าแม่น') : '❌ คำตอบคือ') + ` <b lang="en">${esc(w.w)}</b> ${esc(w.i)}`
        + (ok ? '' : hookBox(w)) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      $('#hgGive').remove();
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    const press = (l) => {
      if (answered || guessed.has(l) || misses.includes(l)) return;
      if (word.includes(l)) { guessed.add(l); sfx('ok'); } else { misses.push(l); sfx('bad'); }
      paint();
      if (solved()) done(true); else if (misses.length >= LIVES) done(false);
    };
    function onKey(e) { if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[a-zA-Z]$/.test(e.key) && current === 'games') press(e.key.toLowerCase()); }
    document.addEventListener('keydown', onKey);
    cleanup = stop;
    $('#hgKb').onclick = (e) => { const b = e.target.closest('.hg-k'); if (b) press(b.dataset.l); };
    $('#hgGive').onclick = () => { if (!answered) done(false); };
    paint();
  }

  // Anagram: tap the shuffled letters in order to spell the word; one wrong try is forgiven.
  function qAnagram(w) {
    const letters = [...w.w.toLowerCase()];
    let order = shuffle(letters.map((_, k) => k));
    for (let n = 0; n < 8 && (order.every((x, k) => x === k) || order.map((k) => letters[k]).join('') === w.w.toLowerCase()); n++) order = shuffle(order);
    const picked = [];
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)} · ${letters.length} ตัวอักษร</div></div>
      <div class="ord-ans" id="oAns" lang="en"></div>
      <div class="ord-pool" id="oPool" lang="en">${order.map((k) => `<button class="ord-chip" data-k="${k}">${esc(letters[k])}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" id="oClear">↺ เริ่มใหม่</button><button class="btn grow" id="oGive">ไม่รู้ / เฉลย</button></div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false, tries = 0;
    const paint = () => {
      $('#oAns').innerHTML = picked.length ? picked.map((k, j) => `<button class="ord-chip on" data-j="${j}">${esc(letters[k])}</button>`).join('') : '<span class="muted small">แตะตัวอักษรด้านล่างเรียงเป็นคำ</span>';
      view.querySelectorAll('#oPool .ord-chip').forEach((b) => (b.disabled = picked.includes(+b.dataset.k)));
    };
    const done = (ok, solvedLate) => {
      answered = true;
      mark(w, ok);
      $('#oAns').classList.add(ok || solvedLate ? 'ok' : 'no');
      $('#oAns').innerHTML = `<span class="ord-full">${esc(w.w)}</span>`;
      $('#oPool').innerHTML = '';
      $('#reveal').innerHTML = (ok ? '✅ ถูกต้อง!' : solvedLate ? '👍 เรียงได้แล้ว แต่ต้องลองสองครั้ง ยังไม่นับว่าแม่น' : '❌ คำตอบคือด้านบน') + ` ${esc(w.i)}` + (ok ? '' : hookBox(w)) + exampleBox(w)
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    $('#oPool').onclick = (e) => {
      const b = e.target.closest('.ord-chip'); if (!b || answered || b.disabled) return;
      picked.push(+b.dataset.k); paint();
      if (picked.length < letters.length) return;
      if (picked.map((k) => letters[k]).join('') === letters.join('')) return done(tries === 0, tries > 0);
      tries++;
      if (tries >= 2) return done(false);
      $('#oAns').classList.remove('no'); void $('#oAns').offsetWidth; $('#oAns').classList.add('no');
      $('#reveal').textContent = 'ยังไม่ถูก ลองเรียงใหม่อีกครั้ง 💪';
      setTimeout(() => { if (!answered) { picked.length = 0; $('#oAns').classList.remove('no'); paint(); } }, 600);
    };
    $('#oAns').onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b || answered) return; picked.splice(+b.dataset.j, 1); paint(); };
    $('#oClear').onclick = () => { if (!answered) { picked.length = 0; paint(); } };
    $('#oGive').onclick = () => { if (!answered) done(false); };
    paint();
  }

  function qSpeak(w, sentence) {
    const target = sentence ? w.e : w.w;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        ${sentence ? `<div class="cloze" lang="en">${hlExample(w)}</div><div class="thx" style="margin-top:6px">${esc(w.et)}</div>`
          : `<div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="muted" style="margin-top:6px">${esc(w.t)}</div>`}
        <button class="hint-btn" data-say>🔊 ฟังตัวอย่าง</button></div>
      <div class="center"><button class="mic" id="mic" aria-label="กดแล้วพูด">🎤</button></div>
      <div class="center small muted" id="heard">แตะไมค์แล้วพูด${sentence ? 'ทั้งประโยค' : 'คำนี้'}</div>
      <button class="btn block" id="skip" style="margin-top:12px">ข้าม / เฉลย</button>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
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
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
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
        <button class="speak" data-say aria-label="ฟังประโยค" style="width:76px;height:76px;font-size:34px;margin:0">🔊</button>
        <div>${slowBtn(w.e)}</div>
        <div class="cloze" lang="en" style="margin-top:12px">${esc(blank).replace('\u0000', '<span class="blank" id="hint">_____</span>')}</div>
        <button class="hint-btn" id="dHint">💡 ดูคำแปลประโยค</button><div class="thx" id="dTh" hidden>${esc(w.et)}</div></div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำที่ได้ยิน">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
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
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
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
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
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
        <div class="cloze" lang="en" style="margin-top:8px">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === w._tok;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === w._tok) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(w._tok)}</b> (${esc(w.w)} = ${esc(w.t)})
        <div class="example"><div class="en" lang="en">${esc(w._s)}</div></div><button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(w._s);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 2200);
    };
  }

  // Collocations: "___ a decision" + Thai meaning → pick the headword.
  function qColloc(w) {
    const { phrase, th, shown, opts } = collocQ(w);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="cloze" lang="en">${esc(shown).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <div class="muted" style="margin-top:6px">${esc(th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
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

  // Confusable words: pick the right one of a pair in a sentence, then see the Thai tip.
  function qConfuse(w) {
    const c = w._c, [sent, right, bad, th] = w._q;
    const opts = shuffle([right, bad]);
    const full = sent.replace('___', right);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop"><div class="small muted">${esc(c.a)} หรือ ${esc(c.b)}?</div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(sent).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="cHint">💡 ดูคำแปลประโยค</button><div class="thx" id="cTh" hidden>${esc(th)}</div></div>
      <div class="options two">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#cHint').onclick = () => { $('#cTh').hidden = false; $('#cHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}
        <div class="example"><div class="en" lang="en">${esc(full)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(th)}</div></div>
        <div class="tip-box">💡 ${esc(c.tip)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(full);
      $('#nextQ').onclick = next;
      speak(full);
    };
  }

  // Word forms: pick the family member that fits the sentence, then see the whole family.
  function qWform(w) {
    const f = w._f, [sent, right, , th] = w._q;
    const opts = shuffle([right, ...shuffle(f.f.map((x) => x[0]).filter((x) => x !== right)).slice(0, 3)]);
    const full = sent.replace('___', right);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop"><div class="small muted">เลือกรูปคำที่เข้ากับประโยค</div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(sent).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="fHint">💡 ดูคำแปลประโยค</button><div class="thx" id="fTh" hidden>${esc(th)}</div></div>
      <div class="options${opts.length === 2 ? ' two' : ''}">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#fHint').onclick = () => { $('#fTh').hidden = false; $('#fHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}
        <div class="example"><div class="en" lang="en">${esc(full)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(th)}</div></div>
        <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧬 ครอบครัวคำ</b> (แตะเพื่อฟัง)</div>${famRows(f, right)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(full);
      view.querySelector('.fam-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(full);
    };
  }

  // Phrasal verbs: the verb stays, pick the particle(s) that give the Thai meaning shown.
  function qPhrasal(w) {
    const r = w._pv, right = r.part;
    const opts = shuffle([right, ...pvDistractors(r)]);
    let k = 0;
    const shown = esc(r.ex).replace(/\[([^\]]+)\]/g, (all, x) => (k++ ? '<span class="blank">_____</span>' : `<b>${x}</b>`));
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เติมให้ได้ความหมาย</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(r.th)}”</div>
        <div class="cloze" lang="en" style="margin-top:8px">${shown}</div>
        <button class="hint-btn" id="pvHint">💡 ดูคำแปลประโยค</button><div class="thx" id="pvTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#pvHint').onclick = () => { $('#pvTh').hidden = false; $('#pvHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      const same = phrasalOf(r.verb);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <b>${esc(r.pv)}</b>`}
        <div class="example"><div class="en" lang="en">${pvHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div></div>
        ${same.length > 1 ? `<div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧩 ${esc(r.verb)} + …</b> (แตะเพื่อฟัง)</div>${pvRows(same, r.pv)}</div>` : ''}
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.plain);
      const fb = view.querySelector('.fam-box'); if (fb) fb.onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(r.plain);
    };
  }

  // Synonyms / antonyms: pick the word closest in meaning (≈) or the opposite (↔).
  function qSyn(w) {
    const it = w._syn, { answer, opts } = synQuestion(it);
    const ask = it.kind === 's' ? 'คำไหนความหมาย<b>ใกล้เคียง</b>ที่สุด' : 'คำไหนมีความหมาย<b>ตรงข้าม</b>';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${ask}</div>
        <div class="word" lang="en" style="margin-top:6px">${it.kind === 's' ? '≈' : '↔'} ${esc(it.t)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
        <div class="muted">${esc(it.g.th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(it.t);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === answer;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === answer) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำตอบคือ <b>${esc(answer)}</b>`}
        <div class="card-box syn-box">${synCard(it.g, it.t)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('.syn-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(answer);
    };
  }

  // Word parts: the base word is shown, pick the prefix/suffix that gives the Thai meaning.
  function qAffix(w) {
    const a = w._af, stem = affixStem(a, w.w), right = affixLabel(a);
    const opts = shuffle([a, ...affixDistractors(a, w.w)]).map(affixLabel);
    const blank = '<span class="blank">___</span>';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เติม${a.k === 'p' ? 'หน้า' : 'ท้าย'}คำให้ได้ความหมาย</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(w.t)}”</div>
        <div class="word" lang="en" style="margin-top:8px">${a.k === 'p' ? blank + esc(stem) : esc(stem) + blank}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <b>${esc(w.w)}</b>`}
        <div class="tip-box"><b class="af-word">${affixHTML(a, w.w)}</b> · <b>${right}</b> = ${esc(a.th)}${a.note ? `<div class="small muted">${esc(a.note)}</div>` : ''}</div>
        <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧱 คำอื่นที่มี ${right}</b> (แตะเพื่อฟัง)</div>${affixRows(a, w.w)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('.fam-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(w.w);
    };
  }

  // Picture guess: one emoji, pick the English word it shows (distractors are other emoji words, so every option is a picture word).
  function qEmoji(w) {
    const used = new Set([w.w]);
    const others = shuffle(W.filter((x) => EMOJI[x.w] && !used.has(x.w) && used.add(x.w))).slice(0, 3);
    const opts = shuffle([w, ...others]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div class="small muted" style="margin-top:6px">อีโมจินี้คือคำอะไร</div>
        <div class="emoji-big" role="img" aria-label="ภาพอีโมจิ">${EMOJI[w.w]}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-i="${o.idx}">${esc(o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = quit;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      if (ENDLESS) $('#runStat').innerHTML = `🔥 <b>${combo}</b> · 🏅 ${Math.max(S.best[gameId] || 0, bestCombo)}`;
      $('#reveal').innerHTML = `${ok ? (ENDLESS && combo >= 2 ? `✅ ติดต่อกัน ${combo} ข้อ! 🔥` : '✅ ถูกต้อง!') : (ENDLESS && bestCombo > 0 ? '❌ สตรีคจบที่ ' + bestCombo + ' · เริ่มนับใหม่' : '❌')} ${EMOJI[w.w]} <b lang="en">${esc(w.w)}</b> = ${esc(w.t)}`
        + (ok ? '' : hookBox(w) + exampleBox(w))
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
    };
  }

  // Idioms: either see the idiom in a sentence and pick its Thai meaning, or see the meaning and pick the idiom.
  function qIdiom(w) {
    const r = w._id, byMeaning = Math.random() < 0.5;
    const right = byMeaning ? r.th : r.id;
    const opts = shuffle([r, ...idDistractors(r)]).map((x) => (byMeaning ? x.th : x.id));
    const prompt = byMeaning
      ? `<div class="small muted">สำนวนนี้หมายถึงอะไร</div><div class="cloze" lang="en" style="margin-top:8px">${idHTML(r)} <button class="say-ex" data-say aria-label="ฟังประโยค">🔊</button></div>`
      : `<div class="small muted">เลือกสำนวนที่มีความหมายว่า</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(r.th)}”</div>
        <div class="cloze" lang="en" style="margin-top:8px">${idBlank(r)}</div>`;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${prompt}
        <button class="hint-btn" id="idHint">💡 ดูคำแปลประโยค</button><div class="thx" id="idTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}"${byMeaning ? '' : ' lang="en"'}>${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#idHint').onclick = () => { $('#idTh').hidden = false; $('#idHint').remove(); };
    const say = view.querySelector('.q-prompt [data-say]'); if (say) say.onclick = () => speak(r.plain);
    if (byMeaning) speak(r.plain);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.id)}</b> = ${esc(r.th)}
        <div class="example"><div class="en" lang="en">${idHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.plain);
      $('#nextQ').onclick = next;
      speak(r.plain);
    };
  }

  // Situations: see one line of a dialogue and pick the line that comes next (wrong options come from other situations).
  function qSit(w) {
    const st = w._sit, [whoA, prevEn, prevTh] = st.d[w._k - 1], [whoB, right, rightTh] = st.d[w._k];
    const opts = shuffle([right, ...sitDistractors(st)]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${st.icon} ${esc(st.th)} · ประโยคถัดไปควรเป็นข้อไหน</div>
        <div class="dlg-line q" style="margin-top:8px"><small class="muted">${esc(whoA)}</small><span lang="en">${esc(prevEn)} <button class="say-ex" data-say aria-label="ฟังประโยค">🔊</button></span></div>
        <button class="hint-btn" id="sitHint">💡 ดูคำแปล</button><div class="thx" id="sitTh" hidden>${esc(prevTh)}</div>
        <div class="small muted" style="margin-top:8px">${esc(whoB)}:</div></div>
      <div class="options">${opts.map((o) => `<button class="opt sit-opt" data-o="${esc(o)}" lang="en">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#sitHint').onclick = () => { $('#sitTh').hidden = false; $('#sitHint').remove(); };
    view.querySelector('.q-prompt [data-say]').onclick = () => speak(prevEn);
    speak(prevEn);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ประโยคที่เข้ากับบทสนทนาคือ'}
        <div class="example"><div class="en" lang="en">${esc(right)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(rightTh)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(right);
      $('#nextQ').onclick = next;
      speak(right);
    };
  }

  // Irregular verbs: see the base form and pick its past (V2) or past participle (V3).
  function qIrreg(w) {
    const r = w._ir, k = w._k, right = w.w;
    const opts = shuffle([right, ...irregOpts(r, k, right)]);
    const label = k === 'v2' ? 'ช่อง 2 · อดีตกาล (Yesterday, I ___)' : k === 'v3' ? 'ช่อง 3 · ใช้หลัง have / has (I have ___)' : 'ช่อง 2 และช่อง 3 · รูปเดียวกัน';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="word" lang="en">${esc(r.v1)}</div><div class="th" style="margin:2px 0 6px">${esc(r.th)}</div>
        <div class="pos">${label}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(right)}</b>
        <div class="example"><div class="en" lang="en">${irrHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังเสียง">🔊</button></div><div class="thx">${IRR_TIP[r.pat]}${r.v1 === 'be' ? ' · be เปลี่ยนตามประธาน: I was / he was / we were' : ''}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(irrSay(r));
      $('#nextQ').onclick = next;
      speak(irrSay(r));
    };
  }

  // Numbers: hear a number, price, time, date or phone number and pick the digits that were said.
  function qNum(w) {
    const n = w._num, opts = shuffle([n.right, ...n.opts]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop"><span class="pos">${NUM_KINDS[n.kind]}</span><div style="height:8px"></div>
        <button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button>
        <div class="muted small" style="margin-top:10px">ได้ยินเป็นอะไร? แตะเพื่อฟังอีกครั้ง</div>${slowBtn(n.say)}</div>
      <div class="options two">${opts.map((o) => `<button class="opt mp" data-o="${esc(o)}"><b>${esc(o)}</b></button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(n.say);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === n.right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === n.right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b>${esc(n.right)}</b>
        <div class="example"><div class="en" lang="en">${esc(n.say)} <button class="say-ex" data-sayex aria-label="ฟังอีกครั้ง">🔊</button></div><div class="thx">${NUM_TIPS[n.kind]}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(n.say);
      $('#nextQ').onclick = next;
      speak(n.say);
    };
    setTimeout(() => { if (items[i] === w && !answered) speak(n.say); }, 200);
  }

  // Minimal pairs: hear one word of a pair (ship / sheep) and pick which one it was.
  function qMinpair(w) {
    const [a, aTh, b, bTh, cat] = w._m;
    const target = Math.random() < 0.5 ? a : b;
    const ipa = (x) => { const e = WORD_BY[x]; return e && e.i ? ` <span class="muted">${esc(e.i)}</span>` : ''; };
    view.innerHTML = `${header()}
      <div class="card-box q-prompt pop">
        <button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button>
        <div class="muted small" style="margin-top:10px">ได้ยินคำไหน? แตะเพื่อฟังอีกครั้ง</div>${slowBtn(target)}</div>
      <div class="options two">${[[a, aTh], [b, bTh]].map(([x, t]) => `<button class="opt mp" data-o="${esc(x)}"><b>${esc(x)}</b><small>${esc(t)}</small></button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(target);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const bt = e.target.closest('.opt'); if (!bt || answered) return;
      answered = true;
      const ok = bt.dataset.o === target;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === target) o.classList.add('correct'); });
      if (!ok) bt.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} ที่ได้ยินคือ <b>${esc(target)}</b>
        <div class="example"><div class="en" lang="en"><b>${esc(a)}</b>${ipa(a)} · <b>${esc(b)}</b>${ipa(b)}</div><div class="thx">${esc(MINPAIRS_TIP[cat] || '')}</div></div>
        <button class="btn block" id="mpCmp" style="margin-top:10px">🔁 ฟังเทียบ ${esc(a)} → ${esc(b)}</button>
        <button class="btn primary block" id="nextQ" style="margin-top:10px">ถัดไป →</button>`;
      $('#mpCmp').onclick = () => { const u = speak(a); if (u) u.onend = () => setTimeout(() => { if (items[i] === w) speak(b); }, 250); };
      $('#nextQ').onclick = next;
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1600);
    };
    setTimeout(() => speak(target), 200);
  }

  function mark(w, ok) {
    // A missed pronunciation or word order doesn't mean the meaning was forgotten, so it doesn't reset the card.
    const spk = gameId === 'speak' || gameId === 'speakS';
    const soft = spk || gameId === 'order' || gameId === 'sOrder';
    asked++;
    if (w.idx < 0 && SKILL_GAMES.includes(gameId) && !GEN_GAMES.includes(gameId)) lexGrade(lexKey(gameId, w), ok);
    if (w.idx < 0 || (soft && !ok) || deckRun.practice) markActive(); else gameResult(w, ok, deckRun.map);
    if (spk && ok) S.counts.speak = (S.counts.speak || 0) + 1;
    questEvent('answer', { game: gameId, ok });
    sfx(ok ? 'ok' : 'bad');
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); S.counts.maxCombo = Math.max(S.counts.maxCombo || 0, combo); score += 10 + Math.min(combo - 1, 5) * 2; addXP(comboXP(combo)); }
    else { combo = 0; wrong.push(w); if (SURV) hearts--; }
  }
  function next() { if (SURV && hearts <= 0) return result(); i++; q(); }

  function result() {
    if (finished) return;
    finished = true;
    if (cleanup) { cleanup(); cleanup = null; }
    const done = STAGE ? stageDone(stage.topic, stage.k, items.length - wrong.length, items.length) : null;
    const prev = S.best[gameId];
    const right_ = asked - wrong.length;
    // endless emoji run: the record is the longest run of right answers; survival / time attack: how many were right
    const mark_ = SURV || TIMED ? right_ : ENDLESS ? bestCombo : score;
    const isBest = !STAGE && (prev == null || mark_ > prev) && (mark_ > 0 || !ENDLESS);
    if (isBest) { S.best[gameId] = mark_; save(); }
    const total = ENDLESS ? asked : items.length;
    const correct = total - wrong.length;
    if (!ENDLESS && correct === items.length && items.length >= 10) S.counts.perfect = (S.counts.perfect || 0) + 1;
    questEvent('round', { game: gameId, correct, bestCombo, perfect: !ENDLESS && correct === items.length && items.length >= 10 });
    if (STAGE ? done.stars >= 2 : SURV || TIMED ? right_ >= 20 : ENDLESS ? bestCombo >= 10 : correct >= 8) confetti();
    const emoji = STAGE ? (done.stars === 3 ? '🏆' : done.stars ? '🎉' : '💪') : SURV || TIMED ? (right_ >= 30 ? '🏆' : right_ >= 15 ? '🎉' : '💪') : ENDLESS ? (bestCombo >= 20 ? '🏆' : bestCombo >= 10 ? '🎉' : '💪') : correct === items.length ? '🏆' : correct >= 7 ? '🎉' : correct >= 4 ? '💪' : '📚';
    view.innerHTML = `<div class="card-box center pop">
        <div class="result-emoji">${emoji}</div>
        ${STAGE ? `<div class="h2" aria-label="${done.stars} ดาว">${starRow(done.stars)}</div>
        <p>${done.stars ? (done.first ? 'ผ่านด่านแล้ว! ปลดล็อกด่านต่อไป 🔓' : 'ผ่านด่านแล้ว') : `ยังไม่ผ่าน ต้องถูกอย่างน้อย ${needFor(items.length)} ข้อ ลองใหม่นะ`} · ถูก ${correct}/${items.length}</p>`
        : SURV ? `<div class="h2">❤️ รอดมาได้ ${right_} ข้อ ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>ไปถึงคำระดับ ${LV_LABEL[LEVELS[reach]]} · คอมโบสูงสุด ${bestCombo}${isBest ? '' : ` · สถิติเดิม ${prev}`}</p>`
        : TIMED ? `<div class="h2">⏱️ ตอบถูก ${right_} ข้อใน ${TIME_LIMIT} วินาที ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>ตอบไป ${asked} ข้อ · คอมโบสูงสุด ${bestCombo}${isBest ? '' : ` · สถิติเดิม ${prev}`}</p>`
        : ENDLESS ? `<div class="h2">🔥 ถูกติดต่อกันสูงสุด ${bestCombo} ข้อ ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>เล่นไป ${total} ข้อ · ถูก ${correct} · ${score} แต้ม${isBest ? '' : ` · สถิติเดิม ${prev}`}</p>`
        : `<div class="h2">${score} แต้ม ${isBest ? '· สถิติใหม่! 🏅' : ''}</div>
        <p>ถูก ${correct}/${items.length} · คอมโบสูงสุด ${bestCombo}</p>`}
        ${['en2th', 'th2en', 'listen', 'cloze'].includes(gameId) ? `<p class="small muted">🎚️ ความยากตอนนี้ ${diffLabel()}</p>` : ''}
      </div>
      ${wrong.length ? `<div class="card-box wrong-list"><b>${gameId.startsWith('speak') ? 'คำที่ควรฝึกออกเสียง' : 'คำที่ควรทบทวน'}</b> <span class="small muted">${gameId.startsWith('speak') ? '(แตะคำเพื่อฟังเสียง)' : SKILL_GAMES.includes(gameId) ? '(แตะเพื่อฟังเสียง)' : deckRun.practice ? '(โหมดซ้อม) · กด ☆ เพื่อติดดาว' : deckRun.map ? '(ใส่ในการทบทวนของชุดให้แล้ว) · กด ☆ เพื่อติดดาว' : '(ใส่ในแฟลชการ์ดให้แล้ว) · กด ☆ เพื่อติดดาว'}</span>
        ${[...new Set(wrong)].map((w) => w.idx < 0 ? `<div class="wl" data-i="-1" data-say="${esc(w._q ? w._q[0].replace('___', w._q[1]) : w._m[0] + ', ' + w._m[2])}"><span><b>${esc(w.w)}</b></span><span class="muted grow" style="text-align:right">${esc(w._q ? w._q[3] : w.t)}</span></div>`
          : `<div class="wl" data-i="${w.idx}"><span><b>${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span><button class="star-btn" data-star>${starIcon(w)}</button></div>`).join('')}</div>` : ''}
      ${STAGE && done.hasNext ? '<button class="btn primary block" id="stNext">ด่านต่อไป →</button><div style="height:10px"></div>' : ''}
      <button class="btn ${STAGE && done.hasNext ? '' : 'primary '}block" id="again">${STAGE ? 'เล่นด่านนี้อีกครั้ง' : 'เล่นอีกรอบ'}</button>
      <div style="height:10px"></div><button class="btn block" id="back">${STAGE ? '🗺️ กลับแผนที่' : 'เลือกเกมอื่น'}</button>`;
    $('#again').onclick = () => (STAGE ? startStage(stage.topic, stage.k) : startGame(gameId));
    $('#back').onclick = leave;
    if ($('#stNext')) $('#stNext').onclick = () => startStage(stage.topic, stage.k + 1);
    const wl = view.querySelector('.wrong-list');
    if (wl) wl.onclick = (e) => {
      const row = e.target.closest('.wl'); if (!row) return;
      const w = W[+row.dataset.i];
      if (!w) return speak(row.dataset.say || '');
      const sb = e.target.closest('[data-star]');
      if (sb) { toggleStar(w); sb.textContent = starIcon(w); } else speak(w.w);
    };
    updateStreak();
  }

  q();
}

function playMatch(src, deckRun = {}) {
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
        if (deckRun.practice) markActive(); else gameResult(W[+a.dataset.i], true, deckRun.map);
        sfx('ok');
        if (--left === 0) { round++; setTimeout(deal, 350); }
      } else {
        mistakes++; sfx('bad');
        [a, b].forEach((x) => { x.classList.remove('no'); void x.offsetWidth; x.classList.add('no'); });
        const enTile = a.dataset.k === 'en' ? a : b;
        if (deckRun.practice) markActive(); else gameResult(W[+enTile.dataset.i], false, deckRun.map);
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
