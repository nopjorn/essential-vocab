'use strict';
// Seasonal events (1.72): Halloween, Songkran, Loy Krathong, New Year. Each has ~10 original words, a short original
// story, a 5-question quiz and a limited-edition sticker + mascot item earned for passing (kept for good).
// Words/story/examples are original (not from any dictionary). Classic script sharing globals with app.js.

/* ---------- data ---------- */
// from/to = 'MM-DD' (the window may wrap over the new year); words = [word, pos, thai, example, thaiExample]
const EVENTS = [
  { id: 'halloween', name: 'ฮาโลวีน', ic: '🎃', from: '10-24', to: '10-31', item: 'evt:pumpkin',
    title: 'The Pumpkin Lantern', titleTh: 'โคมฟักทอง',
    story: [['On Halloween night, Mina wore a witch costume and carried a small lantern.', 'คืนฮาโลวีน มีนาใส่ชุดแม่มดและถือโคมใบเล็ก'], ['The street looked spooky, but the neighbours smiled and gave out candy.', 'ถนนดูน่าขนลุก แต่เพื่อนบ้านยิ้มและแจกขนม'], ['“Trick or treat!” she said at the haunted house at the end of the road.', '“ลูกอมหรือโดนแกล้ง!” เธอพูดที่บ้านผีสิงปลายถนน'], ['A friendly ghost opened the door. It was only her uncle in a white sheet.', 'ผีใจดีเปิดประตู ที่จริงเป็นลุงของเธอห่มผ้าขาวเฉยๆ'], ['They laughed, and Mina put a big pumpkin by the window.', 'ทุกคนหัวเราะ และมีนาวางฟักทองลูกใหญ่ไว้ริมหน้าต่าง']],
    words: [['pumpkin', 'n', 'ฟักทอง', 'We carved a face into the pumpkin.', 'เราแกะสลักหน้าลงบนฟักทอง'], ['costume', 'n', 'ชุดแฟนซี', 'Her costume was a tiny dragon.', 'ชุดแฟนซีของเธอเป็นมังกรตัวจิ๋ว'], ['ghost', 'n', 'ผี', 'The ghost in the story was very shy.', 'ผีในเรื่องขี้อายมาก'], ['candy', 'n', 'ลูกอม ขนมหวาน', 'He saved his candy for the weekend.', 'เขาเก็บลูกอมไว้กินวันหยุด'], ['spooky', 'adj', 'น่าขนลุก', 'The old forest felt spooky at night.', 'ป่าเก่ารู้สึกน่าขนลุกตอนกลางคืน'], ['haunted', 'adj', 'ที่มีผีสิง', 'They say the old hotel is haunted.', 'เขาว่ากันว่าโรงแรมเก่าหลังนั้นมีผีสิง'], ['witch', 'n', 'แม่มด', 'A witch flew past the moon on a broom.', 'แม่มดขี่ไม้กวาดบินผ่านดวงจันทร์'], ['lantern', 'n', 'โคมไฟ', 'She hung a lantern outside the door.', 'เธอแขวนโคมไฟไว้นอกประตู'], ['trick', 'n', 'อุบาย การเล่นตลก', 'The trick made everyone laugh.', 'การเล่นตลกนั้นทำให้ทุกคนหัวเราะ'], ['treat', 'n', 'ของอร่อยที่ให้เป็นรางวัล', 'Ice cream is my favourite treat.', 'ไอศกรีมคือของโปรดที่ฉันชอบ']] },
  { id: 'songkran', name: 'สงกรานต์', ic: '💦', from: '04-10', to: '04-16', item: 'evt:garland',
    title: 'Water for Grandma', titleTh: 'น้ำของคุณยาย',
    story: [['It was the hottest week of the year, and Songkran had begun.', 'เป็นสัปดาห์ที่ร้อนที่สุดของปี และสงกรานต์เริ่มแล้ว'], ['Kids filled their buckets and splashed each other in the street.', 'เด็กๆ ตักน้ำใส่ถังแล้วสาดกันกลางถนน'], ['Nan got soaked from head to toe and could not stop laughing.', 'แนนเปียกตั้งแต่หัวจรดเท้าและหัวเราะไม่หยุด'], ['In the morning, she took a small bowl of water to her grandmother.', 'ตอนเช้า เธอถือขันน้ำใบเล็กไปหาคุณยาย'], ['She poured the water gently over her grandmother’s hands and asked for a blessing.', 'เธอรดน้ำลงบนมือคุณยายเบาๆ และขอพร'], ['“Be happy and stay healthy,” said her grandmother with a warm smile.', '“ขอให้มีความสุขและแข็งแรงนะ” คุณยายพูดด้วยรอยยิ้มอบอุ่น']],
    words: [['splash', 'v', 'สาดน้ำ กระเด็น', 'The children splash water at the festival.', 'เด็กๆ สาดน้ำกันในงานเทศกาล'], ['pour', 'v', 'เท รด', 'Please pour some water into the cup.', 'ช่วยเทน้ำใส่แก้วหน่อย'], ['soaked', 'adj', 'เปียกโชก', 'My shoes were soaked after the rain.', 'รองเท้าฉันเปียกโชกหลังฝนตก'], ['bucket', 'n', 'ถัง', 'He carried a bucket of water to the garden.', 'เขาหิ้วถังน้ำไปที่สวน'], ['blessing', 'n', 'พร การอวยพร', 'She asked her teacher for a blessing.', 'เธอขอพรจากครู'], ['elder', 'n', 'ผู้ใหญ่ ผู้อาวุโส', 'We greet the elders in our village first.', 'เราทักทายผู้ใหญ่ในหมู่บ้านก่อน'], ['temple', 'n', 'วัด', 'They visit the temple every New Year.', 'พวกเขาไปวัดทุกปีใหม่'], ['celebrate', 'v', 'ฉลอง', 'We celebrate with food and music.', 'เราฉลองด้วยอาหารและดนตรี'], ['traditional', 'adj', 'ตามประเพณี', 'She wore a traditional Thai dress.', 'เธอสวมชุดไทยตามประเพณี'], ['refresh', 'v', 'ทำให้สดชื่น', 'A cold shower will refresh you.', 'อาบน้ำเย็นจะทำให้คุณสดชื่น']] },
  { id: 'loy', name: 'ลอยกระทง', ic: '🪷', from: '11-05', to: '11-30', item: 'evt:lotus',
    title: 'The Little Boat of Light', titleTh: 'เรือน้อยแห่งแสง',
    story: [['On the night of the full moon, the river was quiet and silver.', 'ในคืนพระจันทร์เต็มดวง แม่น้ำเงียบสงบเป็นสีเงิน'], ['Pim made a small boat from banana leaves and a pink lotus flower.', 'พิมทำเรือลำเล็กจากใบตองและดอกบัวสีชมพู'], ['She lit a candle and made a wish for her family.', 'เธอจุดเทียนและขอพรให้ครอบครัว'], ['Then she let the boat float gently down the river.', 'จากนั้นเธอปล่อยเรือล่องลงแม่น้ำเบาๆ'], ['The flame glowed brighter as it moved away from the shore.', 'เปลวไฟยิ่งส่องสว่างขึ้นเมื่อลอยห่างจากฝั่ง'], ['“Thank you, river,” she whispered, feeling calm and grateful.', '“ขอบคุณนะแม่น้ำ” เธอกระซิบ รู้สึกสงบและซาบซึ้ง']],
    words: [['float', 'v', 'ลอย', 'Leaves float on the pond.', 'ใบไม้ลอยอยู่บนสระ'], ['candle', 'n', 'เทียน', 'Light a candle when the power goes out.', 'จุดเทียนเมื่อไฟดับ'], ['river', 'n', 'แม่น้ำ', 'The river runs past our school.', 'แม่น้ำไหลผ่านโรงเรียนของเรา'], ['wish', 'n', 'คำอธิษฐาน ความปรารถนา', 'Her only wish was to see the sea.', 'ความปรารถนาเดียวของเธอคือได้เห็นทะเล'], ['lotus', 'n', 'ดอกบัว', 'A lotus opens its petals at sunrise.', 'ดอกบัวบานกลีบตอนพระอาทิตย์ขึ้น'], ['flame', 'n', 'เปลวไฟ', 'The flame moved in the wind.', 'เปลวไฟไหวตามลม'], ['glow', 'v', 'เรืองแสง ส่องสว่างอ่อนๆ', 'The lamps glow in the dark.', 'โคมไฟส่องสว่างอ่อนๆ ในความมืด'], ['grateful', 'adj', 'รู้สึกขอบคุณ', 'I am grateful for your help.', 'ฉันรู้สึกขอบคุณที่คุณช่วย'], ['gently', 'adv', 'อย่างนุ่มนวล เบาๆ', 'Put the baby down gently.', 'วางเด็กลงเบาๆ'], ['shore', 'n', 'ฝั่ง ชายฝั่ง', 'We walked along the shore at sunset.', 'เราเดินเลียบชายฝั่งตอนพระอาทิตย์ตก']] },
  { id: 'newyear', name: 'ปีใหม่', ic: '🎆', from: '12-26', to: '01-03', item: 'evt:party',
    title: 'Ten, Nine, Eight…', titleTh: 'สิบ เก้า แปด…',
    story: [['At midnight, the whole city waited for the countdown.', 'ตอนเที่ยงคืน ทั้งเมืองรอการนับถอยหลัง'], ['Ben held his sister’s hand and looked up at the sky.', 'เบนจับมือน้องสาวและมองขึ้นฟ้า'], ['“Three, two, one!” Fireworks lit up the dark in red, gold and blue.', '“สาม สอง หนึ่ง!” ดอกไม้ไฟสาดแสงสีแดง ทอง และน้ำเงินกลางความมืด'], ['Everyone began to cheer and hug each other.', 'ทุกคนเริ่มส่งเสียงเชียร์และกอดกัน'], ['On the way home, Ben told his sister his New Year resolution: read one book every month.', 'ระหว่างทางกลับบ้าน เบนบอกน้องถึงเป้าหมายปีใหม่ของเขา คืออ่านหนังสือเดือนละเล่ม'], ['“It is a fresh start,” she said, “and a good memory too.”', '“นี่คือการเริ่มต้นใหม่” น้องพูด “และเป็นความทรงจำดีๆ ด้วย”']],
    words: [['countdown', 'n', 'การนับถอยหลัง', 'The countdown started at ten.', 'การนับถอยหลังเริ่มที่สิบ'], ['resolution', 'n', 'ความตั้งใจ (ปีใหม่)', 'My resolution is to sleep earlier.', 'ความตั้งใจของฉันคือนอนให้เร็วขึ้น'], ['fireworks', 'n', 'ดอกไม้ไฟ', 'We watched the fireworks from the bridge.', 'เราดูดอกไม้ไฟจากบนสะพาน'], ['midnight', 'n', 'เที่ยงคืน', 'The shop closes at midnight.', 'ร้านปิดตอนเที่ยงคืน'], ['cheer', 'v', 'ส่งเสียงเชียร์', 'The crowd began to cheer for the team.', 'ฝูงชนเริ่มส่งเสียงเชียร์ทีม'], ['fresh', 'adj', 'ใหม่ สดใหม่', 'Let us make a fresh start.', 'มาเริ่มต้นใหม่กันเถอะ'], ['memory', 'n', 'ความทรงจำ', 'That trip is my best memory.', 'ทริปนั้นคือความทรงจำที่ดีที่สุดของฉัน'], ['goal', 'n', 'เป้าหมาย', 'Her goal is to run ten kilometres.', 'เป้าหมายของเธอคือวิ่งสิบกิโลเมตร'], ['hug', 'v', 'กอด', 'He gave his mother a big hug.', 'เขากอดแม่แน่นๆ'], ['wish', 'v', 'ขออวยพร ปรารถนา', 'I wish you a happy year.', 'ขอให้คุณมีปีที่มีความสุข']] },
];
const EVENT_PASS = 3, EVENT_N = 5;

/* ---------- logic ---------- */
// The event whose window contains `date` ('YYYY-MM-DD'), handling windows that wrap over the new year.
function eventOn(date = today()) {
  const md = date.slice(5);
  return EVENTS.find((e) => (e.from <= e.to ? md >= e.from && md <= e.to : md >= e.from || md <= e.to)) || null;
}
// A window belongs to the year it started in (the new-year window of 26 Dec 2026–3 Jan 2027 is "2026").
function eventYear(e, date = today()) {
  const y = +date.slice(0, 4);
  return e.from > e.to && date.slice(5) <= e.to ? y - 1 : y;
}
const eventKey = (e, date = today()) => `${e.id}-${eventYear(e, date)}`;

/* ---------- pages ---------- */
function eventCard() {
  const e = eventOn(); if (!e) return '';
  const done = S.evt[eventKey(e)] && S.evt[eventKey(e)].pass;
  return `<button class="card-box guide-link event-card" data-go="event" data-year="${e.id}"><span>${e.ic}</span><div class="grow"><b>กิจกรรม${e.name}</b>
    <div class="small muted">${done ? 'ได้สติกเกอร์รุ่นพิเศษแล้ว ✅ แตะเพื่อดูอีกครั้ง' : '10 คำพิเศษ + เรื่องสั้น + ควิซ ได้สติกเกอร์และของแต่งตัวน้องคำรุ่นจำกัด'}</div></div><span class="muted">›</span></button>`;
}
function renderEvent(id) {
  const e = EVENTS.find((x) => x.id === id) || eventOn();
  if (!e) { view.innerHTML = `<div class="card-box">${emptyArt({ kind: 'sleep', title: 'ตอนนี้ยังไม่มีกิจกรรมเทศกาล', sub: 'ไว้รอเทศกาลหน้านะคะ', btn: 'กลับหน้าแรก', go: 'home' })}</div>`; return; }
  const key = eventKey(e), rec = S.evt[key], item = ITEMS.find((x) => x.id === e.item);
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="eBack">‹ กลับ</button></div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${e.ic}</div><div class="h2" style="margin:2px 0">กิจกรรม${e.name} ${eventYear(e) + 543}</div>
      <p class="small muted">ทำควิซผ่าน ${EVENT_PASS}/${EVENT_N} ข้อ รับ 🏷️ สติกเกอร์${e.name}รุ่นจำกัด และ ${item.ic} ${item.name} สำหรับน้องคำ (เก็บไว้ตลอด)</p>
      ${rec && rec.pass ? `<div class="small" style="margin-top:6px">🏷️ ได้สติกเกอร์แล้ว · คะแนนดีที่สุด ${rec.r}/${rec.n}</div>` : ''}</div>
    <div class="h2">📖 ${esc(e.title)} <span class="small muted">${esc(e.titleTh)}</span></div>
    <div class="card-box">${e.story.map(([en, th]) => `<p style="margin:0 0 10px"><span lang="en">${esc(en)}</span> <button class="icon-btn" data-say="${esc(en)}" aria-label="ฟัง">🔊</button><br><span class="small muted">${esc(th)}</span></p>`).join('')}</div>
    <div class="h2">🔤 คำศัพท์ประจำเทศกาล</div>
    <div class="card-box">${e.words.map(([w, p, t, ex, exTh]) => `<div class="wrow evt-w"><div class="grow"><b lang="en">${esc(w)}</b> <span class="small muted">${esc(p)}</span> · ${esc(t)}
      <div class="small" lang="en">${esc(ex)}</div><div class="small muted">${esc(exTh)}</div></div><button class="icon-btn" data-say="${esc(w)}" aria-label="ฟัง ${esc(w)}">🔊</button></div>`).join('')}</div>
    <button class="btn primary block" id="eQuiz" style="margin:14px 0">📝 ทำควิซ ${EVENT_N} ข้อ</button>`;
  $('#eBack').onclick = () => go('home');
  view.querySelectorAll('[data-say]').forEach((b) => { b.onclick = () => speak(b.dataset.say); });
  $('#eQuiz').onclick = () => runEventQuiz(e);
}
function runEventQuiz(e) {
  const items = shuffle(e.words).slice(0, EVENT_N); let i = 0, right = 0;
  const q = () => {
    if (i >= items.length) return finish();
    const w = items[i], opts = shuffle([w, ...shuffle(e.words.filter((x) => x !== w)).slice(0, 3)]);
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="eQuit" aria-label="ออก">✕</button><div class="progress"><div style="width:${i / items.length * 100}%"></div></div><span class="small muted">${i + 1}/${items.length}</span></div>
      <div class="card-box q-prompt pop"><div class="word" lang="en">${esc(w[0])}</div><div class="pos">${esc(w[1])}</div></div>
      <div class="options">${opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(o[2])}</button>`).join('')}</div>`;
    $('#eQuit').onclick = () => renderEvent(e.id);
    speak(w[0]);
    let answered = false;
    view.querySelector('.options').onclick = (ev) => {
      const b = ev.target.closest('.opt'); if (!b || answered) return; answered = true;
      const ok = opts[+b.dataset.k] === w;
      view.querySelectorAll('.opt').forEach((o) => { if (opts[+o.dataset.k] === w) o.classList.add('correct'); });
      if (ok) { right++; addXP(2); } else b.classList.add('wrong');
      markActive(); sfx(ok ? 'ok' : 'bad');
      setTimeout(() => { i++; q(); }, ok ? 600 : 1300);
    };
  };
  const finish = () => {
    const key = eventKey(e), prev = S.evt[key], pass = right >= EVENT_PASS, first = pass && !(prev && prev.pass);
    if (!prev || right > prev.r || (pass && !prev.pass)) S.evt[key] = { r: right, n: EVENT_N, pass: pass || !!(prev && prev.pass), at: Date.now() };
    if (first) { if (!S.owned.includes(e.item)) S.owned.push(e.item); addXP(30); confetti(); }
    save();
    const item = ITEMS.find((x) => x.id === e.item);
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${pass ? '🏆' : '💪'}</div><div class="h2" style="margin:4px 0">${right}/${EVENT_N}</div>
      <p class="small muted">${pass ? (first ? `🏷️ ได้สติกเกอร์${e.name}รุ่นจำกัด และ ${item.ic} ${item.name} สำหรับน้องคำแล้ว! (+30 XP) ไปแต่งตัวให้น้องที่หน้าน้องคำ` : 'ผ่านอีกครั้ง เก่งมาก!') : `ต้องได้ ${EVENT_PASS} ข้อขึ้นไปถึงจะผ่าน อ่านเรื่องและคำศัพท์อีกรอบแล้วลองใหม่นะ`}</p>
      <button class="btn primary block" id="eAgain">${pass ? 'ทำอีกครั้ง' : 'ลองใหม่'}</button>
      ${pass ? '<button class="btn block" data-go="mascot" style="margin-top:8px">🫧 ไปแต่งตัวน้องคำ</button>' : ''}
      <button class="btn ghost block" id="eBack2" style="margin-top:8px">กลับไปอ่านเรื่อง</button></div>`;
    $('#eAgain').onclick = () => runEventQuiz(e);
    $('#eBack2').onclick = () => renderEvent(e.id);
  };
  q();
}
