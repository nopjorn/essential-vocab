'use strict';
// Phrase books (1.212.0): one engine for small lazy-loaded lists of words or phrases outside the word list.
// Each book = data file rows [category, English, Thai, example sentence, Thai example, note], a reference page (REF_PAGES key = book id,
// renderBook(id)) and a skill game with the same id (qBook in data/app/play.js, own SRS in S.lex).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- phrase books ---------- */
// file, window key, icon, page title, game question modes (en: English → Thai, th: Thai → English, note: English → the note), noteEn = the note is
// English shown next to the phrase (a full form) else a Thai tip line,
// ear = in the listening game `pbear` (the English is spoken, so not for abbreviations),
// whether the English is read aloud by itself (abbreviations are spelt oddly by speech engines: the example is read instead), categories.
const PB = {
  abbr: {
    file: 'data/phrasebook/abbr.js', key: 'ABBR', icon: '🔤', title: 'ตัวย่อที่ใช้ในงาน', modes: ['en', 'th', 'note'], noteEn: true, sayEn: false,
    intro: 'ตัวย่อที่เจอในอีเมล แชต และการประชุม · แต่ละตัวมีคำเต็ม ความหมาย และประโยคตัวอย่าง · แตะเพื่อฟังประโยค · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ตัวย่อนี้แปลว่าอะไร', th: 'ตัวย่อไหนตรงกับความหมายนี้', note: 'ตัวย่อนี้ย่อมาจากอะไร' },
    cats: { mail: ['📧', 'อีเมล'], meet: ['🗓️', 'ประชุม'], hr: ['🧑‍💼', 'งานบุคคล / การลา'], biz: ['📈', 'ธุรกิจ'], tech: ['💻', 'ไอที'], chat: ['💬', 'แชต'] },
    same: [['TBD', 'TBC'], ['EOD', 'COB'], ['e.g.', 'i.e.'], ['UI', 'UX'], ['B2B', 'B2C'], ['Re:', 'Fwd:'], ['cc', 'bcc']],
  },
  chat: {
    file: 'data/phrasebook/chat.js', key: 'CHAT', icon: '💬', title: 'ภาษาพูด / แชต', modes: ['en', 'th'], sayEn: true, ear: true,
    intro: 'ประโยคสั้นที่เจ้าของภาษาพูดและแชตกันทุกวัน แต่ตำราไม่ค่อยสอน · มีบทสนทนาตัวอย่างและ 💡 บอกว่าใช้ตอนไหน · แตะเพื่อฟัง · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ประโยคนี้หมายความว่าอะไร', th: 'จะพูดแบบนี้เป็นภาษาอังกฤษว่าอะไร' },
    cats: { react: ['😮', 'ตอบรับ / แสดงความรู้สึก'], plan: ['📅', 'ชวน / นัด / ปฏิเสธ'], thanks: ['🙏', 'ขอบคุณ / ขอโทษ'], feel: ['😮‍💨', 'บอกสภาพตัวเอง'], talk: ['🗣️', 'คำเชื่อมเวลาคุย'], slang: ['😎', 'คำพูดติดปาก'] },
    // phrases close enough in meaning that they never appear together as options
    same: [['No worries.', 'It\'s all good.', 'Don\'t mention it.', 'I\'m good.', 'no big deal'], ['I\'m down.', 'Count me in.', 'I\'m in.'], ['I\'m beat.', 'It\'s been a long day.', 'I\'m swamped.'],
      ['What\'s up?', 'How\'s it going?', 'What are you up to?', 'Long time no see!'], ['See you around.', 'Catch you later.', 'Take care!'], ['Thanks a ton.', 'Cheers!', 'You\'re a lifesaver.', 'I owe you one.'],
      ['No way!', 'You\'re kidding!'], ['Same here.', 'Tell me about it.', 'I bet.'], ['I\'ll pass.', 'Can I take a rain check?', 'I\'m not feeling it.', 'I can\'t be bothered.'],
      ['Fair enough.', 'That makes sense.'], ['kinda', 'a bit of a'], ['ASAP-ish', 'sevenish'], ['It\'s on me.', 'Let\'s split the bill.'], ['Not gonna lie', 'To be fair', 'I mean', 'Between you and me'],
      ['I\'m so over it.', 'I can\'t be bothered.'], ['Anyway', 'By the way', 'Speaking of which']],
  },
  thai: {
    file: 'data/phrasebook/thaitalk.js', key: 'THAITALK', icon: '🇹🇭', title: 'เล่าเรื่องไทยเป็นอังกฤษ', modes: ['th', 'th', 'en'], sayEn: false, ear: true,
    intro: 'คำและประโยคไว้อธิบายอาหาร วัด เทศกาล และธรรมเนียมไทยให้เพื่อนต่างชาติฟัง · ประโยคตัวอย่างพูดตามได้เลย · 💡 บอกคำที่มักใช้ผิด · แตะเพื่อฟัง · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'คำนี้หมายถึงอะไรในภาษาไทย', th: 'อธิบายให้ฝรั่งฟังว่าอะไร' },
    cats: { food: ['🍜', 'อาหารและการสั่ง'], temple: ['🛕', 'วัดและศาสนา'], fest: ['🎉', 'เทศกาล'], custom: ['🙏', 'ธรรมเนียมไทย'], daily: ['🛵', 'ชีวิตประจำวัน'], place: ['🏝️', 'สถานที่เที่ยว'] },
    same: [['shrine', 'spirit house', 'offering'], ['make merit', 'give alms', 'offering'], ['take off your shoes', 'don\'t touch the head'], ['not spicy', 'less sweet'], ['mango sticky rice', 'sticky rice'], ['countryside', 'rice field']],
  },
  doctor: {
    file: 'data/phrasebook/doctor.js', key: 'DOCTOR', icon: '🩺', title: 'คุยกับหมอ / ร้านยา', modes: ['en', 'th'], sayEn: true, ear: true,
    intro: 'ประโยคที่ใช้ตอนไม่สบาย: บอกอาการ ติดต่อโรงพยาบาล ฟังหมอ ซื้อยา และเหตุฉุกเฉิน · มีบทสนทนาตัวอย่างและ 💡 คำที่ใช้ต่อได้ · ศัพท์โรคและยาอยู่ในชุดคำ 🩺 สุขภาพ · แตะเพื่อฟัง',
    ask: { en: 'ประโยคนี้หมายความว่าอะไร', th: 'จะพูดกับหมอ / เภสัชกรว่าอะไร' },
    cats: { symptom: ['🤒', 'บอกอาการ'], clinic: ['🏥', 'ที่โรงพยาบาล / คลินิก'], doctor: ['👩‍⚕️', 'หมอพูด / ถาม'], pharmacy: ['💊', 'ร้านยา'], emergency: ['🚑', 'ฉุกเฉิน'], health: ['🥗', 'สุขภาพทั่วไป'] },
    same: [['I feel sick.', 'I threw up twice.'], ['I\'m trying to lose weight.', 'I\'m on a diet.'], ['I\'m feeling much better.', 'Get well soon!'], ['It\'s an emergency.', 'Call an ambulance!'],
      ['Can I see a doctor today?', 'I\'d like to make an appointment.'], ['How often should I take it?', 'Take one tablet three times a day.'], ['He can\'t breathe.', 'Take a deep breath.']],
  },
  itcol: {
    file: 'data/phrasebook/itcol.js', key: 'ITCOL', icon: '🧑‍💻', title: 'คำคู่ไอที', modes: ['fill', 'fill', 'en', 'th'], fill: true, sayEn: false,
    intro: 'คำที่ใช้คู่กันในงานซอฟต์แวร์ เช่น fix a bug (ไม่ใช่ repair) · run the tests · deploy to production · ส่วนที่ทำตัวหนาคือคำที่มักใช้ผิด · ✗ คือคำที่ไม่ไปด้วยกัน · แตะเพื่อฟังประโยค · ＋ เก็บเข้าชุดของฉัน',
    ask: { fill: 'เลือกคำที่ใช้คู่กันในงานไอที', en: 'คำคู่นี้หมายความว่าอะไร', th: 'พูดเป็นอังกฤษว่าอะไร' },
    cats: { code: ['⌨️', 'เขียนโค้ด'], git: ['🌿', 'Git / รีวิวโค้ด'], bug: ['🐞', 'บั๊กและทิกเก็ต'], ops: ['🚀', 'ดีพลอย / เซิร์ฟเวอร์'], team: ['👥', 'ทำงานเป็นทีม'], term: ['🧩', 'คำศัพท์คู่'] },
    same: [['run the tests', 'run a query'], ['raise a ticket', 'file a bug report', 'pick up a ticket'], ['take down a server', 'the server went down'], ['ship a feature', 'go live', 'deploy to production']],
  },
  sayit: {
    file: 'data/phrasebook/saywrong.js', key: 'SAYWRONG', icon: '🗣️', title: 'คำที่มักออกเสียงผิด', modes: ['say', 'say', 'en'], say: true, sayEn: true,
    intro: 'คำที่คนไทยมักอ่านผิด ทั้งศัพท์ไอที (cache, suite, query) และคำทั่วไป (receipt, salmon, Wednesday) · คำอ่านภาษาไทยเป็นแค่ตัวช่วยคร่าวๆ ฟังเสียงจริงด้วยการแตะ · 💡 บอกเสียงที่ต้องระวัง',
    ask: { say: 'คำนี้อ่านว่าอะไร', en: 'คำนี้หมายความว่าอะไร' },
    cats: { tech: ['💻', 'ศัพท์ไอที'], work: ['💼', 'ที่ทำงาน'], daily: ['🏠', 'ชีวิตประจำวัน'] },
    same: [['determine', 'determined'], ['debt', 'doubt']],
  },
  devtalk: {
    file: 'data/phrasebook/devtalk.js', key: 'DEVTALK', icon: '👩‍💻', title: 'ภาษาทีมนักพัฒนา', modes: ['en', 'th'], sayEn: true, ear: true,
    intro: 'ประโยคที่ใช้รีวิวโค้ด สแตนด์อัป แชตทีม รับมือระบบล่ม และวางแผนงาน · เขียนให้สุภาพแบบที่ทีมต่างชาติใช้กันจริง · 💡 บอกวิธีใช้ · แตะเพื่อฟัง · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ประโยคนี้หมายความว่าอะไร', th: 'พูดในทีมเป็นอังกฤษว่าอะไร' },
    cats: { review: ['🔍', 'รีวิวโค้ด'], standup: ['🧍', 'สแตนด์อัป'], chat: ['💬', 'แชตในทีม'], incident: ['🚨', 'ระบบมีปัญหา'], plan: ['🗂️', 'วางแผนงาน'] },
    same: [['Nit:', 'Non-blocking:'], ['This looks good to me.', 'Done, thanks!', 'Good point.'], ['I\'ll look into it.', 'I\'m on it.', 'We\'re investigating.'], ['Could we …?', 'What do you think about …?'],
      ['I\'m still working on …', 'It\'s taking longer than expected.'], ['Do you have a minute?', 'Quick question:'], ['Let\'s hop on a call.', 'Let\'s take this offline.'], ['It\'s been fixed.', 'That did the trick.']],
  },
  interview: {
    file: 'data/phrasebook/interview.js', key: 'INTERVIEW', icon: '🎤', title: 'สัมภาษณ์งานสายเทค', modes: ['en', 'th'], sayEn: true, ear: true,
    intro: 'ประโยคสำหรับสัมภาษณ์งานสายไอที: แนะนำตัว เล่าโปรเจกต์ ตอบโจทย์เทคนิค ตอบแบบ STAR ถามกลับ และคุยข้อเสนองาน · 💡 บอกวิธีตอบให้ดูดี · แตะเพื่อฟัง · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ประโยคนี้หมายความว่าอะไร', th: 'พูดตอนสัมภาษณ์เป็นอังกฤษว่าอะไร' },
    cats: { intro: ['👋', 'แนะนำตัว'], project: ['📁', 'เล่าโปรเจกต์'], tech: ['🧠', 'โจทย์เทคนิค'], behavior: ['⭐', 'คำถามพฤติกรรม (STAR)'], ask: ['❓', 'ถามกลับ'], offer: ['🤝', 'เงินเดือน / ข้อเสนอ'] },
    same: [['Let me make sure I understand the question.', 'Can I ask a clarifying question?'], ['Let me walk you through my approach.', 'My first idea is …', 'I would start by …'], ['I\'m open to discussion.', 'Could I have a few days to think it over?'],
      ['I specialize in …', 'I have … years of experience in …'], ['The situation was …', 'Tell me about a time when …'], ['What I did was …', 'I was responsible for …']],
  },
  meeting: {
    file: 'data/phrasebook/meetingtalk.js', key: 'MEETINGTALK', icon: '🗓️', title: 'พูดในประชุม', modes: ['en', 'th'], sayEn: true, ear: true,
    intro: 'ประโยคสำหรับออกความเห็น เห็นด้วย ไม่เห็นด้วยแบบสุภาพ ขอแทรก ถามให้ชัด ดำเนินการประชุม และนำเสนองาน · 💡 บอกว่าใช้ตอนไหน · แตะเพื่อฟัง · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ประโยคนี้หมายความว่าอะไร', th: 'พูดในประชุมเป็นอังกฤษว่าอะไร' },
    cats: { opinion: ['💡', 'ออกความเห็น'], agree: ['👍', 'เห็นด้วย'], disagree: ['🤔', 'ไม่เห็นด้วยแบบสุภาพ'], turn: ['✋', 'ขอพูด / ส่งต่อ'], clear: ['🔍', 'ถามให้ชัด'], run: ['🧭', 'ดำเนินการประชุม'], present: ['📊', 'นำเสนองาน'] },
    same: [['In my view, …', 'The way I see it, …', 'From a technical point of view, …'], ['I completely agree.', 'I\'m on the same page.', 'That\'s a good point.'], ['I\'m not sure I agree.', 'I have a different view.', 'I see your point, but …'],
      ['Can I jump in here?', 'Sorry to interrupt, but …', 'If I may add something, …'], ['Could you say that again?', 'What do you mean by …?', 'Just to be clear, …', 'So what you\'re saying is …'],
      ['Let\'s move on to the next item.', 'Let\'s park that for now.'], ['To sum up, …', 'The key takeaway is …'], ['I\'d suggest …', 'Have we considered …?']],
  },
};
const PB_DATA = {};
// fill books (1.223.0): rows [cat, phrase with [part], Thai, example with [part] as used, Thai example, 'wrong|wrong|wrong', tip];
// the game's 'fill' mode blanks the part in the example. en / ex are kept without brackets; key / ans = the parts, exBr = the bracketed example.
const pbInner = (s) => ((s.match(/\[([^\]]+)\]/) || [])[1] || '');
const pbPlain = (s) => s.replace(/[[\]]/g, '');
const loadBook = (id) => loadData(PB[id].file, PB[id].key).then((rows) => {
  if (!PB_DATA[id] && rows.length) {
    PB_DATA[id] = PB[id].say // say books (1.224.0): [cat, word, Thai, example, Thai, 'right reading|wrong|wrong|wrong', tip]
      ? rows.map(([cat, en, th, ex, exTh, reads, tip]) => { const x = reads.split('|'); return { cat, en, th, ex, exTh, read: x[0], wrong: x.slice(1), note: tip || '' }; })
      : PB[id].fill
      ? rows.map(([cat, en, th, ex, exTh, wrong, tip]) => ({ cat, en: pbPlain(en), key: pbInner(en), enBr: en, th, ex: pbPlain(ex), exBr: ex, ans: pbInner(ex), exTh, wrong: wrong.split('|'), note: tip || '' }))
      : rows.map(([cat, en, th, ex, exTh, note]) => ({ cat, en, th, ex, exTh, note: note || '' }));
  }
  return PB_DATA[id] || [];
});
const pbItems = (id) => PB_DATA[id].map((r) => ({ idx: -1, w: r.en, t: r.th, p: '', g: '', _pb: r, _book: id, _q: [r.ex, r.en, '', r.th] }));
// the question for one item: mode, prompt, the right option and 3 others from the same book (same category first, no repeated text)
function pbQuestion(id, r, mode) {
  const b = PB[id], m = mode || pick(b.modes);
  if (m === 'say') return { m, field: 'read', right: r.read, opts: shuffle([r.read, ...r.wrong]), prompt: r.en };
  if (m === 'fill') return { m, field: 'ans', right: r.ans, opts: shuffle([r.ans, ...r.wrong]), prompt: r.exBr.replace(/\[[^\]]+\]/, '___') };
  const field = m === 'en' ? 'th' : m === 'th' ? 'en' : 'note';
  const near0 = new Set((b.same || []).filter((g) => g.includes(r.en)).flat());
  const right = r[field], rows = PB_DATA[id].filter((x) => x !== r && x[field] && x[field] !== right && !near0.has(x.en));
  const near = shuffle(rows.filter((x) => x.cat === r.cat)), far = shuffle(rows.filter((x) => x.cat !== r.cat));
  const others = [];
  for (const x of [...near.slice(0, 2), ...far, ...near.slice(2)]) { if (others.length < 3 && !others.includes(x[field])) others.push(x[field]); }
  return { m, field, right, opts: shuffle([right, ...others]), prompt: m === 'th' ? r.th : r.en };
}
// Listening game `pbear` (1.220.0): hear the English of every `ear` book (or one book, from its page), pick the Thai meaning.
const pbEarIds = () => Object.keys(PB).filter((id) => PB[id].ear);
let pbEarOnly = null; // a book id set by its page's 🎧 button, used once by the next round
const pbEarLoad = () => Promise.all(pbEarIds().map(loadBook));
function pbEarItems() {
  const ids = pbEarOnly && PB[pbEarOnly] ? [pbEarOnly] : pbEarIds();
  pbEarOnly = null;
  return ids.filter((id) => PB_DATA[id]).flatMap((id) => pbItems(id).map((w) => ({ ...w, _ear: true })));
}
// Word sheet box (1.221.0): phrases of the spoken books (ear) whose English uses this word in any form (lxIndex in js/lexis2.js).
let PB_OF = null;
function phrasesOf(word) {
  if (!PB_OF) {
    const rows = pbEarIds().flatMap((id) => (PB_DATA[id] || []).map((r) => ({ r, id })));
    PB_OF = lxIndex(rows, (x) => x.r.en);
  }
  return PB_OF.get(word.toLowerCase()) || [];
}
function pbBox(el, w) {
  pbEarLoad().then(() => {
    const box = el.querySelector('#pbBox'), list = phrasesOf(w.w);
    if (!box || !list.length) return;
    box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>📚 ใช้ในวลี</b> (แตะเพื่อฟัง · ＋ เก็บเข้าชุด)</div>${list.slice(0, 5).map(({ r, id }) => `<div class="bc-item"><button class="col-row" data-say="${esc(r.en)}"><b lang="en" style="font-weight:500">${PB[id].icon} ${esc(r.en)}</b><span>${esc(r.th)}</span></button><button class="bc-add" data-pb="${id}" data-pi="${PB_DATA[id].indexOf(r)}" aria-label="เก็บ ${esc(r.en)} เข้าชุดของฉัน">＋</button></div>`).join('')}`;
    box.onclick = (e) => {
      const a = e.target.closest('[data-pb]'); if (a) { pickDeck([], [pbOwn(PB_DATA[a.dataset.pb][+a.dataset.pi], a.dataset.pb)]); return; }
      const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say);
    };
  }).catch(() => {});
}
// the phrase with its tested part in bold (fill books)
const pbEnHTML = (r) => (r.enBr ? esc(r.enBr).replace(/\[([^\]]+)\]/, '<b>$1</b>') : esc(r.en));
// extra line: the right reading and the wrong ones (say books) or the wrong partners (fill books)
const pbExtra = (r) => (r.read ? `🔈 อ่านว่า <b>${esc(r.read)}</b> · ✗ ${r.wrong.map(esc).join(', ')}` : r.wrong ? `✗ <span lang="en">${r.wrong.map(esc).join(', ')}</span>` : '');
// Speak-along game `pbsay` (1.230.0): say the English of every `ear` book; checked by speech recognition, or self-checked without it.
// The words to say: the phrase without its … gap or end colon (Could we …? → Could we).
const pbSayText = (r) => r.en.replace(/\s*…\s*/g, ' ').replace(/[:,]\s*$/, '').replace(/\s+([?.!])/g, '$1').trim();
function pbSayItems() {
  const ids = pbEarOnly && PB[pbEarOnly] ? [pbEarOnly] : pbEarIds();
  pbEarOnly = null;
  return ids.filter((id) => PB_DATA[id]).flatMap((id) => pbItems(id).map((w) => ({ ...w, _say: true })));
}
const pbOwn = (r, id) => ({ w: r.en, t: PB[id].noteEn && r.note ? `${r.th} (${r.note})` : r.th, e: r.ex, et: r.exTh });
// the note: English beside the phrase (noteEn) or a 💡 Thai tip line
const pbNoteIn = (r, id) => (PB[id].noteEn && r.note ? ` <span class="small muted" lang="en">${esc(r.note)}</span>` : '');
const pbTip = (r, id) => (!PB[id].noteEn && r.note ? `<small class="muted">💡 ${esc(r.note)}</small>` : '');
// the example with the phrase in bold (any case, without its end mark)
function pbMark(r) {
  const k = r.en.replace(/[.!?]$/, ''), i = r.ex.toLowerCase().indexOf(k.toLowerCase());
  return i < 0 ? esc(r.ex) : esc(r.ex.slice(0, i)) + '<b>' + esc(r.ex.slice(i, i + k.length)) + '</b>' + esc(r.ex.slice(i + k.length));
}
const pbSay = (r, id) => (PB[id].sayEn ? r.en : r.ex);
const pbCat = {}; // book id → selected category chip
function renderBook(id) {
  const b = PB[id];
  if (!PB_DATA[id]) { withLoading(loadBook(id)).then(() => renderBook(id)); return; }
  const rows = PB_DATA[id], cats = Object.keys(b.cats).filter((c) => rows.some((r) => r.cat === c));
  $('#title').textContent = b.title;
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="pbBack">‹ กลับ</button><div class="grow"></div>${b.ear ? '<button class="btn" id="pbEar">🎧 ฝึกฟัง</button><button class="btn" id="pbTalk">🎙️ พูดตาม</button>' : ''}<button class="btn primary" id="pbPlay">${b.icon} เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${rows.length} รายการ · ${b.intro}</p>
    <div class="chips scroll" id="pbCats"><button class="chip" data-c="all">ทั้งหมด</button>${cats.map((c) => `<button class="chip" data-c="${c}">${b.cats[c][0]} ${b.cats[c][1]}</button>`).join('')}</div>
    <div class="row" style="margin:6px 4px 8px"><div class="grow"></div><button class="btn ghost" id="pbAll">＋ เก็บทั้งหมวดเข้าชุดของฉัน</button></div>
    <div class="pair-list" id="pbList"></div>`;
  const cur = () => pbCat[id] || 'all';
  const shown = () => rows.filter((r) => cur() === 'all' || r.cat === cur());
  const paint = () => {
    view.querySelectorAll('#pbCats .chip').forEach((c) => { const on = c.dataset.c === cur(); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    $('#pbList').innerHTML = cats.filter((c) => cur() === 'all' || c === cur()).map((c) => `<div class="card-box pair-card"><div class="pair-h"><b>${b.cats[c][0]} ${b.cats[c][1]}</b> <span class="small muted">${rows.filter((r) => r.cat === c).length}</span></div>
      ${rows.filter((r) => r.cat === c).map((r) => `<div class="bc-item pb-item"><button class="pair-ex" data-say="${esc(pbSay(r, id))}"><span><b lang="en">${r.enBr ? `<span style="font-weight:500">${pbEnHTML(r)}</span>` : esc(r.en)}</b>${pbNoteIn(r, id)} = ${esc(r.th)}</span><span lang="en">${esc(r.ex)}</span><small class="muted">${esc(r.exTh)}${r.wrong ? ` · ${pbExtra(r)}` : ''}</small>${pbTip(r, id)}</button><button class="bc-add" data-add="${rows.indexOf(r)}" aria-label="เก็บ ${esc(r.en)} เข้าชุดของฉัน">＋</button></div>`).join('')}</div>`).join('');
  };
  paint();
  $('#pbCats').onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) { pbCat[id] = c.dataset.c; paint(); } };
  $('#pbBack').onclick = () => go('ref');
  $('#pbPlay').onclick = () => startGame(id);
  if (b.ear) $('#pbEar').onclick = () => { pbEarOnly = id; startGame('pbear'); };
  if (b.ear) $('#pbTalk').onclick = () => { pbEarOnly = id; startGame('pbsay'); };
  $('#pbAll').onclick = () => pickDeck([], shown().map((r) => pbOwn(r, id)));
  $('#pbList').onclick = (e) => {
    const a = e.target.closest('[data-add]'); if (a) { pickDeck([], [pbOwn(rows[+a.dataset.add], id)]); return; }
    const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say);
  };
}

/* ---------- role play (1.232.0) ---------- */
// data/phrasebook/roleplay.js scenes {id, icon, title, who, you, steps: [[their line, Thai, best reply, [2 wrong], Thai of reply, why]]}.
// Game `rplay` (qRplay in data/app/play.js): one item per step, a scene's steps stay together (SET_GAMES → setOrder); the chat so far is shown
// as bubbles. Page renderRoleplay() (REF_PAGES 'rplay') reads every scene and starts one (rpOnly = that scene for the next round).
let ROLEPLAY = null, rpOnly = null;
const loadRoleplay = () => loadData('data/phrasebook/roleplay.js', 'ROLEPLAY').then((rows) => { if (!ROLEPLAY && rows.length) ROLEPLAY = rows; return ROLEPLAY || []; });
function rpItems() {
  const ds = rpOnly ? ROLEPLAY.filter((d) => d.id === rpOnly) : ROLEPLAY;
  rpOnly = null;
  return ds.flatMap((d) => d.steps.map(([them, themTh, right, wrong, th, why], k) => ({
    idx: -1, w: right, t: th, p: '', g: '', _rp: { d, k, them, themTh, right, wrong, th, why }, _set: { d, k }, _q: [them, right, '', th] })));
}
// the chat bubbles of steps before k (and step k's reply when `upto`)
const rpLog = (d, k, upto) => d.steps.slice(0, upto ? k + 1 : k).map((s) => `<div class="rp-b" lang="en">${esc(s[0])}</div><div class="rp-b rp-me" lang="en">${esc(s[2])}</div>`).join('');
function renderRoleplay() {
  if (!ROLEPLAY) { withLoading(loadRoleplay()).then(renderRoleplay); return; }
  $('#title').textContent = 'บทบาทสมมติ';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="rpBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="rpPlay">🎭 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${ROLEPLAY.length} สถานการณ์ คุยโต้ตอบทีละประโยคจนจบเรื่อง: หาหมอ ร้านยา พาเพื่อนกินข้าว สแตนด์อัป สัมภาษณ์งาน ประชุม โทรหาไอที โรงแรม · แตะบรรทัดเพื่อฟัง · ▶️ เล่นเฉพาะเรื่องนั้น</p>
    <div class="pair-list" id="rpList">${ROLEPLAY.map((d) => `<div class="card-box pair-card"><div class="pair-h"><b>${d.icon} ${esc(d.title)}</b> <span class="small muted">คุณ = ${esc(d.you)} · คุยกับ ${esc(d.who)}</span><div class="grow"></div><button class="btn" data-rp="${d.id}" aria-label="เล่นเรื่อง ${esc(d.title)}">▶️</button></div>
      <div class="rp-log">${d.steps.map((s) => `<button class="rp-b" lang="en" data-say="${esc(s[0])}">${esc(s[0])}</button><button class="rp-b rp-me" lang="en" data-say="${esc(s[2])}">${esc(s[2])}<small class="muted">${esc(s[4])}</small></button>`).join('')}</div></div>`).join('')}</div>`;
  $('#rpBack').onclick = () => go('ref');
  $('#rpPlay').onclick = () => startGame('rplay');
  $('#rpList').onclick = (e) => {
    const p = e.target.closest('[data-rp]'); if (p) { rpOnly = p.dataset.rp; startGame('rplay'); return; }
    const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say);
  };
}
