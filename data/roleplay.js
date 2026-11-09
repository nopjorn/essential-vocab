// Role-play conversations (1.232.0, lazy-loaded by loadRoleplay() in js/phrasebook.js). All original.
// Scene: {id, icon, title (Thai), who (the other person, Thai), you (your role, Thai), steps: [[their line, Thai, your best reply, [2 wrong replies], Thai of the reply, why (Thai)]]}
// Wrong replies: one that does not answer what was said, and one that is rude or unnatural. The game keeps a scene's steps together (SET_GAMES).
window.ROLEPLAY = [
{ id: 'doctor', icon: '🩺', title: 'ไปหาหมอเพราะไข้หวัด', who: 'หมอ', you: 'ผู้ป่วย', steps: [
  ['Good morning. What seems to be the problem?', 'สวัสดีครับ เป็นอะไรมาครับ', 'I have a sore throat and a fever.', ['I\'m fine, thank you.', 'Give me medicine.'], 'เจ็บคอและมีไข้ค่ะ', 'หมอถามอาการ ให้บอกอาการ · I\'m fine ตอบผิดคำถาม · Give me medicine ฟังเหมือนสั่ง'],
  ['How long have you had it?', 'เป็นมานานแค่ไหนแล้ว', 'Since Monday, so about three days.', ['Very long.', 'I had it yesterday at the office.'], 'ตั้งแต่วันจันทร์ ประมาณสามวัน', 'ตอบระยะเวลาให้ชัด since + วัน หรือ for + ระยะเวลา'],
  ['Are you allergic to any medicine?', 'แพ้ยาอะไรไหม', 'Yes, I\'m allergic to penicillin.', ['Yes, I like medicine.', 'No problem.'], 'แพ้เพนิซิลลินค่ะ', 'บอกชื่อยาที่แพ้เสมอ'],
  ['Let me check your temperature. It\'s 38.5. I\'ll give you something for the fever.', 'ขอวัดไข้หน่อย 38.5 องศา จะให้ยาลดไข้นะ', 'How often should I take it?', ['How much is the hospital?', 'Why is it 38.5?'], 'ต้องกินบ่อยแค่ไหนคะ', 'ถามวิธีกินยาก่อนออกจากห้องตรวจ'],
  ['Every six hours, after meals. Come back if it gets worse.', 'ทุกหกชั่วโมงหลังอาหาร ถ้าแย่ลงให้กลับมา', 'I will. Thank you, doctor.', ['OK, bye bye.', 'Can I go to work tonight and drink?'], 'จะทำตามนั้นค่ะ ขอบคุณค่ะคุณหมอ', 'ขอบคุณหมอแบบสุภาพ'],
] },
{ id: 'pharmacy', icon: '💊', title: 'ซื้อยาที่ร้านขายยา', who: 'เภสัชกร', you: 'ลูกค้า', steps: [
  ['Hi, how can I help you?', 'สวัสดีค่ะ ให้ช่วยอะไรคะ', 'Do you have something for a stomachache?', ['I want one stomach.', 'Yes, I can help you.'], 'มียาแก้ปวดท้องไหมคะ', 'something for + อาการ = ยาสำหรับอาการนั้น'],
  ['Is it a sharp pain or more like bloating?', 'ปวดแปลบหรือท้องอืด', 'It\'s more like bloating after meals.', ['Yes.', 'I don\'t eat bloating.'], 'ออกแนวท้องอืดหลังกินข้าวค่ะ', 'คำถามแบบให้เลือก ห้ามตอบแค่ Yes'],
  ['Try this. Take two tablets after eating.', 'ลองตัวนี้ กินสองเม็ดหลังอาหาร', 'Does it have any side effects?', ['Does it taste good?', 'Two is too many, give me one.'], 'มีผลข้างเคียงไหมคะ', 'ถามผลข้างเคียงเป็นนิสัยที่ดี'],
  ['It may make you a little sleepy.', 'อาจทำให้ง่วงนิดหน่อย', 'OK. Can I take it before I drive?', ['I am sleepy now.', 'Then I don\'t want it, bye.'], 'เข้าใจค่ะ กินก่อนขับรถได้ไหม', 'ถามต่อเรื่องที่เกี่ยวกับผลข้างเคียง'],
  ['Better not. Take it when you get home.', 'ไม่ควร กินตอนถึงบ้านดีกว่า', 'Got it. How much is it?', ['Why not?', 'I will drive slowly then.'], 'เข้าใจแล้ว ราคาเท่าไรคะ', 'รับคำแนะนำแล้วไปเรื่องจ่ายเงิน'],
] },
{ id: 'host', icon: '🍜', title: 'พาเพื่อนต่างชาติกินอาหารไทย', who: 'เพื่อนร่วมงานต่างชาติ', you: 'เจ้าบ้าน', steps: [
  ['Everything looks great! What do you recommend?', 'ดูน่ากินหมดเลย แนะนำอะไรดี', 'Try the stir-fried basil with pork. It\'s a Thai favorite.', ['I recommend you.', 'Everything. Eat everything.'], 'ลองผัดกะเพราหมูสิ เป็นเมนูโปรดของคนไทย', 'แนะนำพร้อมเหตุผลสั้นๆ'],
  ['Is it spicy? I can\'t eat very spicy food.', 'เผ็ดไหม กินเผ็ดมากไม่ได้', 'It can be. I\'ll ask them to make it mild.', ['Thai people eat spicy every day.', 'Spicy is good for you.'], 'อาจเผ็ด เดี๋ยวบอกให้ทำเผ็ดน้อย', 'mild = เผ็ดน้อย · ตอบให้แขกสบายใจ'],
  ['And what\'s this sticky rice?', 'แล้วข้าวเหนียวนี่คืออะไร', 'It\'s a type of rice that sticks together. We eat it with our hands.', ['It\'s sticky rice.', 'You don\'t know rice?'], 'เป็นข้าวชนิดที่ติดกัน เรากินด้วยมือ', 'อธิบายให้คนไม่รู้จักเข้าใจ ไม่ใช่พูดชื่อซ้ำ'],
  ['This is delicious! Let me pay for dinner.', 'อร่อยมาก ขอเลี้ยงมื้อนี้นะ', 'No, no, it\'s on me. You\'re my guest.', ['OK, thank you, pay.', 'Give me the money.'], 'ไม่เป็นไร มื้อนี้ฉันเลี้ยง คุณเป็นแขก', 'it\'s on me = ฉันเลี้ยง'],
  ['That\'s very kind. Next time, it\'s my treat.', 'ใจดีมาก ครั้งหน้าฉันเลี้ยงนะ', 'Deal! I\'ll hold you to that.', ['No, next time I pay again.', 'What is treat?'], 'ตกลง! จำไว้นะ', 'hold you to that = จะทวงสัญญานะ (พูดเล่น)'],
] },
{ id: 'standup', icon: '🧍', title: 'สแตนด์อัปตอนเช้า', who: 'หัวหน้าทีม', you: 'นักพัฒนา', steps: [
  ['Morning! What did you work on yesterday?', 'อรุณสวัสดิ์ เมื่อวานทำอะไรไป', 'Yesterday I worked on the login page.', ['I worked very hard.', 'Yesterday was Tuesday.'], 'เมื่อวานทำหน้าล็อกอิน', 'บอกงานที่ทำ ไม่ใช่ความรู้สึก'],
  ['Nice. What\'s the plan for today?', 'ดี วันนี้มีแผนอะไร', 'Today I\'m going to add the password reset.', ['Today is Wednesday.', 'Same as always.'], 'วันนี้จะเพิ่มระบบรีเซ็ตรหัสผ่าน', 'บอกงานวันนี้ให้ชัด'],
  ['Any blockers?', 'มีอะไรติดไหม', 'Yes, I\'m blocked on the email design.', ['Blockers are bad.', 'I don\'t like blockers.'], 'มี ติดรอดีไซน์อีเมลอยู่', 'blocker = สิ่งที่ทำให้ทำต่อไม่ได้'],
  ['Okay, I\'ll ask the designer. Anything else?', 'โอเค เดี๋ยวถามดีไซเนอร์ให้ มีอะไรอีกไหม', 'Could someone review my PR today?', ['No, you can go.', 'Why didn\'t you ask before?'], 'มีใครช่วยรีวิว PR วันนี้ได้ไหม', 'ใช้โอกาสขอความช่วยเหลือ'],
  ['I can take a look after lunch.', 'หลังเที่ยงจะช่วยดูให้', 'Great, thanks! I\'ll send you the link.', ['After lunch is too late.', 'OK, eat well.'], 'เยี่ยม ขอบคุณ เดี๋ยวส่งลิงก์ให้', 'ขอบคุณแล้วบอกขั้นต่อไป'],
] },
{ id: 'interview', icon: '🎤', title: 'สัมภาษณ์งานรอบแรก', who: 'ผู้สัมภาษณ์', you: 'ผู้สมัคร', steps: [
  ['Thanks for coming in. Could you tell me about yourself?', 'ขอบคุณที่มา แนะนำตัวหน่อยได้ไหม', 'Sure. I\'m a backend developer with five years of experience.', ['I was born in 1995 in a small town.', 'Everything is on my CV.'], 'ได้ครับ ผมเป็นนักพัฒนาฝั่งหลังบ้าน มีประสบการณ์ห้าปี', 'เริ่มจากงานตอนนี้ ไม่ต้องเล่าตั้งแต่เกิด'],
  ['What project are you most proud of?', 'ภูมิใจกับโปรเจกต์ไหนที่สุด', 'I\'m proud of a payment system I built that cut errors by half.', ['All my projects are good.', 'I don\'t know, many.'], 'ภูมิใจกับระบบชำระเงินที่ทำ ลดข้อผิดพลาดได้ครึ่งหนึ่ง', 'มีตัวเลขผลลัพธ์จะน่าเชื่อ'],
  ['What was the hardest part?', 'ส่วนไหนยากที่สุด', 'The main challenge was moving old data without downtime.', ['Nothing was hard for me.', 'My boss was hard.'], 'ความท้าทายหลักคือย้ายข้อมูลเก่าโดยไม่ปิดระบบ', 'เล่าปัญหาจริงที่เป็นเรื่องงาน'],
  ['Why do you want to leave your current job?', 'ทำไมอยากออกจากงานปัจจุบัน', 'I\'m looking for a role where I can work on larger systems.', ['My boss is terrible.', 'The salary is bad and the food is bad.'], 'อยากหางานที่ได้ทำระบบใหญ่ขึ้น', 'ตอบแบบมองไปข้างหน้า ไม่บ่นที่เก่า'],
  ['Great. Do you have any questions for us?', 'ดีมาก มีคำถามอะไรอยากถามไหม', 'Yes. What does success look like in the first six months?', ['No, nothing.', 'When do I get a pay rise?'], 'มีครับ ใน 6 เดือนแรก แบบไหนถือว่าทำได้ดี', 'ควรมีคำถามเตรียมไว้เสมอ'],
] },
{ id: 'meeting', icon: '🗓️', title: 'ไม่เห็นด้วยในที่ประชุม', who: 'ผู้จัดการโปรเจกต์', you: 'วิศวกร', steps: [
  ['I think we can launch the new app next Monday.', 'คิดว่าเราเปิดแอปใหม่ได้วันจันทร์หน้า', 'Can I jump in here? I have a concern.', ['No, that is wrong.', 'Monday is a good day.'], 'ขอแทรกหน่อยได้ไหม ผมมีเรื่องกังวล', 'ขอพูดก่อนแย้ง สุภาพกว่าบอกว่าผิด'],
  ['Sure, go ahead.', 'ได้ เชิญเลย', 'My concern is that the payment part isn\'t fully tested.', ['You never listen to engineers.', 'I want to go home early Monday.'], 'ที่กังวลคือส่วนชำระเงินยังเทสต์ไม่ครบ', 'พูดถึงความเสี่ยง ไม่โจมตีคน'],
  ['But the client really wants it on Monday.', 'แต่ลูกค้าอยากได้วันจันทร์จริงๆ', 'I see your point, but a payment bug could cost much more.', ['The client is stupid.', 'OK, whatever.'], 'เข้าใจครับ แต่ถ้าบั๊กชำระเงินจะเสียหายมากกว่า', 'ยอมรับก่อนแย้ง'],
  ['So what do you suggest?', 'แล้วเสนออะไร', 'I\'d suggest we launch without payments and add them on Thursday.', ['I don\'t know, you decide.', 'Let\'s not launch at all.'], 'เสนอว่าเปิดก่อนโดยยังไม่มีชำระเงิน แล้วเพิ่มวันพฤหัส', 'แย้งแล้วต้องเสนอทางออก'],
  ['That could work. Let\'s check with the client.', 'น่าจะได้ ลองเช็กกับลูกค้า', 'Great. I\'ll send a short summary after the meeting.', ['I told you so.', 'Finally.'], 'เยี่ยม เดี๋ยวส่งสรุปสั้นๆ หลังประชุม', 'ปิดด้วยงานต่อไปที่ชัดเจน'],
] },
{ id: 'itsupport', icon: '🖥️', title: 'โทรแจ้งไอทีว่าเข้าระบบไม่ได้', who: 'เจ้าหน้าที่ไอที', you: 'พนักงาน', steps: [
  ['IT support, how can I help?', 'ไอทีซัพพอร์ต ให้ช่วยอะไรครับ', 'Hi, I can\'t log in to my email.', ['Hi, I am fine.', 'My computer is very old.'], 'สวัสดีค่ะ เข้าอีเมลไม่ได้ค่ะ', 'บอกปัญหาตั้งแต่ประโยคแรก'],
  ['Do you see an error message?', 'มีข้อความแจ้งข้อผิดพลาดไหม', 'Yes, it says my password has expired.', ['Yes, I see.', 'Messages are in my inbox.'], 'มี ขึ้นว่ารหัสผ่านหมดอายุ', 'บอกข้อความที่เห็นให้ตรง'],
  ['No problem. I\'ll send a reset link to your phone.', 'ไม่เป็นปัญหา เดี๋ยวส่งลิงก์รีเซ็ตไปที่มือถือ', 'Thanks. Which number do you have for me?', ['I don\'t have a phone.', 'Send it to everybody.'], 'ขอบคุณค่ะ มีเบอร์ไหนของฉันอยู่', 'ยืนยันข้อมูลให้ถูกก่อน'],
  ['The one ending in 4521.', 'เบอร์ที่ลงท้าย 4521', 'That\'s right. I got the link.', ['What is 4521?', 'I like that number.'], 'ถูกต้องค่ะ ได้ลิงก์แล้ว', 'บอกผลให้เจ้าหน้าที่รู้'],
  ['Great. Is there anything else I can help with?', 'มีอะไรให้ช่วยอีกไหม', 'No, that\'s all. Thanks for your help!', ['No. Bye.', 'Yes, can you fix my car?'], 'ไม่มีแล้วค่ะ ขอบคุณที่ช่วยนะคะ', 'ปิดสายอย่างสุภาพ'],
] },
{ id: 'hotel', icon: '🏨', title: 'ห้องพักมีปัญหา', who: 'พนักงานต้อนรับ', you: 'แขก', steps: [
  ['Front desk, how may I help you?', 'แผนกต้อนรับ ให้ช่วยอะไรคะ', 'Hi, the air conditioner in my room isn\'t working.', ['Hi, this is my room.', 'Your hotel is bad.'], 'สวัสดีครับ แอร์ในห้องไม่ทำงาน', 'บอกปัญหาตรงๆ แต่สุภาพ'],
  ['I\'m sorry about that. What\'s your room number?', 'ขออภัยค่ะ ห้องหมายเลขอะไรคะ', 'It\'s room 512.', ['It\'s a big room.', 'I forgot, sorry, bye.'], 'ห้อง 512 ครับ', 'ตอบสิ่งที่ถูกถาม'],
  ['I\'ll send someone up in ten minutes.', 'จะส่งคนขึ้นไปภายในสิบนาที', 'Thank you. Could you also bring two more towels?', ['Ten minutes is too long!', 'Why ten?'], 'ขอบคุณครับ ช่วยเอาผ้าเช็ดตัวมาเพิ่มสองผืนได้ไหม', 'ใช้โอกาสขอเพิ่มอย่างสุภาพ'],
  ['Of course. Is there anything else?', 'ได้ค่ะ มีอะไรอีกไหมคะ', 'What time is breakfast tomorrow?', ['Yes, everything.', 'Breakfast is good.'], 'พรุ่งนี้อาหารเช้ากี่โมงครับ', 'ถามคำถามให้ครบประโยค'],
  ['From 6:30 to 10:00 on the second floor.', 'หกโมงครึ่งถึงสิบโมง ที่ชั้นสอง', 'Perfect. Thanks for your help.', ['Too early for me.', 'Second floor is far.'], 'เยี่ยมเลย ขอบคุณที่ช่วยครับ', 'ปิดการสนทนาด้วยคำขอบคุณ'],
] },
];
