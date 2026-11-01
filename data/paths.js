// Choose-your-path stories (1.122): short original stories in easy English where the reader picks what happens next.
// Loaded lazily by loadPaths() in js/paths.js. window.PATHS = [{ id, emoji, level, title, start, nodes: { id: { en, th, ch: [[en, th, next]] }
//   | { en, th, end: 'good'|'ok'|'bad', name: Thai ending name } } }]. Every `next` must be a node of the same story (a test checks).
window.PATHS = [
  {
    id: 'trip', emoji: '🚆', level: 'A2', title: 'ทริปเชียงใหม่', start: 'a',
    nodes: {
      a: { en: 'You arrive at the train station early in the morning. Your train to Chiang Mai leaves at 8:00. It is 7:30 now, and you are very hungry.', th: 'คุณมาถึงสถานีรถไฟแต่เช้า รถไฟไปเชียงใหม่ออก 8 โมง ตอนนี้ 7 โมงครึ่ง และคุณหิวมาก',
        ch: [['Buy breakfast at a small shop.', 'ซื้ออาหารเช้าที่ร้านเล็กๆ', 'b'], ['Go to the platform and wait.', 'ไปรอที่ชานชาลา', 'c']] },
      b: { en: 'The shop is busy. A kind woman says, "Take my place. I am not in a hurry." You buy rice and an egg. Now it is 7:55!', th: 'ร้านคนเยอะ ผู้หญิงใจดีคนหนึ่งบอกว่า “ไปก่อนเลย ฉันไม่รีบ” คุณซื้อข้าวกับไข่ ตอนนี้ 7.55 แล้ว!',
        ch: [['Run to the train.', 'วิ่งไปขึ้นรถไฟ', 'd'], ['Thank the woman first.', 'ขอบคุณผู้หญิงคนนั้นก่อน', 'e']] },
      c: { en: 'On the platform, an old man cannot carry his heavy bag up the steps of the train.', th: 'ที่ชานชาลา มีคุณลุงคนหนึ่งยกกระเป๋าหนักขึ้นบันไดรถไฟไม่ไหว',
        ch: [['Help him with the bag.', 'ช่วยยกกระเป๋า', 'f'], ['Get on the train quickly to find a good seat.', 'รีบขึ้นรถไฟหาที่นั่งดีๆ', 'g']] },
      d: { en: 'You jump on the train just before the doors close. You eat your breakfast and watch the green hills. What a great start!', th: 'คุณกระโดดขึ้นรถไฟก่อนประตูปิดพอดี กินข้าวเช้าแล้วดูภูเขาเขียวๆ เริ่มต้นได้ดีมาก!', end: 'ok', name: 'ทันรถไฟพอดี' },
      e: { en: 'You turn around and say thank you. The woman smiles. But when you reach the platform, the train is leaving without you.', th: 'คุณหันกลับไปขอบคุณ ผู้หญิงยิ้มให้ แต่พอถึงชานชาลา รถไฟกำลังออกไปโดยไม่มีคุณ', end: 'bad', name: 'ตกรถไฟ (แต่ใจดี)' },
      f: { en: 'You help the old man. He is very happy. "I own a guest house in Chiang Mai," he says. "Please stay with us for free!"', th: 'คุณช่วยคุณลุง เขาดีใจมาก “ลุงมีเกสต์เฮาส์ที่เชียงใหม่ มาพักฟรีได้เลยนะ!”', end: 'good', name: 'ได้ที่พักฟรี' },
      g: { en: 'You find a seat by the window. Later, you see the old man standing near the door, tired and sad. You feel a little bad.', th: 'คุณได้ที่นั่งริมหน้าต่าง ต่อมาเห็นคุณลุงยืนอยู่ใกล้ประตู ดูเหนื่อยและเศร้า คุณรู้สึกผิดนิดๆ', end: 'bad', name: 'ที่นั่งดีแต่ใจไม่ดี' },
    },
  },
  {
    id: 'puppy', emoji: '🐶', level: 'A2', title: 'ลูกหมาหลงทาง', start: 'a',
    nodes: {
      a: { en: 'On your way home from school, you find a small puppy under a tree. It is wet and looks lost. It has a red collar.', th: 'ระหว่างทางกลับจากโรงเรียน คุณเจอลูกหมาตัวเล็กใต้ต้นไม้ มันเปียกและดูหลงทาง ใส่ปลอกคอสีแดง',
        ch: [['Look at the collar.', 'ดูที่ปลอกคอ', 'b'], ['Take the puppy home.', 'พาลูกหมากลับบ้าน', 'c']] },
      b: { en: 'There is a phone number on the collar and a name: "Lucky".', th: 'บนปลอกคอมีเบอร์โทรและชื่อ “ลัคกี้”',
        ch: [['Call the number.', 'โทรไปที่เบอร์นั้น', 'd'], ['Ask the people in the shop nearby.', 'ถามคนในร้านใกล้ๆ', 'e']] },
      c: { en: 'At home, you give the puppy some water and a towel. Your mother asks, "Whose dog is this?"', th: 'ที่บ้าน คุณให้น้ำและผ้าเช็ดตัวลูกหมา แม่ถามว่า “หมาของใครน่ะ?”',
        ch: [['Say: "I want to keep it!"', 'บอกว่า “อยากเลี้ยงเอง!”', 'f'], ['Look for the owner online together.', 'ช่วยกันหาเจ้าของในอินเทอร์เน็ต', 'g']] },
      d: { en: 'A girl answers. She is crying with happiness. Ten minutes later, she runs to you and hugs Lucky. "Thank you so much!"', th: 'เด็กผู้หญิงคนหนึ่งรับสาย เธอร้องไห้ด้วยความดีใจ สิบนาทีต่อมาเธอวิ่งมากอดลัคกี้ “ขอบคุณมากๆ เลย!”', end: 'good', name: 'ลัคกี้ได้กลับบ้าน' },
      e: { en: 'The shop owner knows the dog. "That is Lucky from the blue house!" You walk there, and the family thanks you with a cake.', th: 'เจ้าของร้านรู้จักหมาตัวนี้ “นั่นลัคกี้บ้านสีฟ้า!” คุณเดินไปส่ง ครอบครัวนั้นขอบคุณด้วยเค้ก', end: 'good', name: 'ได้เค้กเป็นรางวัล' },
      f: { en: 'Your mother says, "Someone is probably looking for it." The next day, you see "LOST DOG" posters everywhere. You feel sorry.', th: 'แม่บอกว่า “คงมีคนกำลังตามหาอยู่นะ” วันต่อมาคุณเห็นป้าย “หมาหาย” ทั่วซอย คุณรู้สึกเสียใจ', end: 'bad', name: 'ป้ายหมาหายทั่วซอย' },
      g: { en: 'You find a post: "Lost puppy, red collar!" You send a message, and the owner comes the same evening.', th: 'คุณเจอโพสต์ “ลูกหมาหาย ปลอกคอสีแดง!” จึงส่งข้อความไป เจ้าของมารับตอนเย็นวันนั้นเลย', end: 'ok', name: 'เจอเจ้าของทางออนไลน์' },
    },
  },
  {
    id: 'job', emoji: '💼', level: 'B1', title: 'สัมภาษณ์งานวันแรก', start: 'a',
    nodes: {
      a: { en: 'Today is your job interview at a big company. You wake up and look at the clock. It is already 8:15, and the interview starts at 9:00.', th: 'วันนี้คุณมีสัมภาษณ์งานที่บริษัทใหญ่ ตื่นมาดูนาฬิกา 8.15 แล้ว และสัมภาษณ์เริ่ม 9 โมง',
        ch: [['Take a taxi.', 'นั่งแท็กซี่', 'b'], ['Take the subway.', 'นั่งรถไฟฟ้าใต้ดิน', 'c']] },
      b: { en: 'The traffic is terrible. The taxi does not move for ten minutes. It is 8:45.', th: 'รถติดมาก แท็กซี่ไม่ขยับเลยสิบนาที ตอนนี้ 8.45',
        ch: [['Call the company and explain.', 'โทรไปอธิบายกับบริษัท', 'd'], ['Get out and run.', 'ลงจากรถแล้ววิ่ง', 'e']] },
      c: { en: 'The subway is fast. You arrive at 8:50. In the lift, a man asks, "Are you here for the interview? What do you think of our new app?"', th: 'รถไฟใต้ดินเร็ว คุณถึง 8.50 ในลิฟต์มีผู้ชายถามว่า “มาสัมภาษณ์ใช่ไหม คิดยังไงกับแอปใหม่ของเรา?”',
        ch: [['Give an honest and polite opinion.', 'ให้ความเห็นตรงๆ อย่างสุภาพ', 'f'], ['Say it is perfect, just to be nice.', 'บอกว่าดีเลิศ เพื่อเอาใจ', 'g']] },
      d: { en: 'The manager says, "Thank you for calling. We can wait twenty minutes." You arrive calm and the interview goes well.', th: 'ผู้จัดการบอกว่า “ขอบคุณที่โทรมา เรารอได้ 20 นาที” คุณไปถึงอย่างใจเย็นและสัมภาษณ์ผ่านไปด้วยดี', end: 'good', name: 'โทรบอกก่อน คนชื่นชม' },
      e: { en: 'You run for fifteen minutes and arrive hot and tired. You are on time, but you cannot think clearly in the interview.', th: 'คุณวิ่ง 15 นาที ไปถึงแบบร้อนและเหนื่อย ทันเวลาแต่คิดอะไรไม่ค่อยออกตอนสัมภาษณ์', end: 'ok', name: 'ทันแต่เหนื่อยหอบ' },
      f: { en: 'You say the app is useful but the menu is confusing. The man smiles. He is the boss. "That is exactly what we need. You are hired!"', th: 'คุณบอกว่าแอปมีประโยชน์แต่เมนูงง ผู้ชายยิ้ม เขาคือเจ้านาย “นั่นแหละที่เราต้องการ คุณได้งานแล้ว!”', end: 'good', name: 'ได้งานในลิฟต์' },
      g: { en: 'The man looks disappointed. Later you learn he is the boss, and he wanted someone with real ideas.', th: 'ผู้ชายดูผิดหวัง ต่อมาคุณรู้ว่าเขาคือเจ้านาย และเขาอยากได้คนที่มีความคิดของตัวเอง', end: 'bad', name: 'เอาใจผิดจังหวะ' },
    },
  },
];
