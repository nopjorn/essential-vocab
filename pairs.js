// Original practice data (lazy-loaded by loadPairs()).
// CONFUSE: word pairs Thai learners often mix up. q = [sentence with ___, right, wrong, Thai translation]
// MINPAIRS: sounds Thai speakers find hard to tell apart. [word A, Thai A, word B, Thai B, sound group]
window.CONFUSE = [
  { a: 'borrow', b: 'lend', tip: 'borrow = ยืม "มาจาก" คนอื่น (เราได้ของ) · lend = ให้ยืม "ไปให้" คนอื่น (เราเสียของ)', q: [
    ['Can I ___ your pen for a minute?', 'borrow', 'lend', 'ขอยืมปากกาหน่อยได้ไหม'],
    ['Could you ___ me some money until Friday?', 'lend', 'borrow', 'ให้ฉันยืมเงินหน่อยได้ไหม ถึงวันศุกร์'],
    ['My brother ___ me his car last weekend.', 'lent', 'borrowed', 'พี่ชายให้ฉันยืมรถเมื่อสุดสัปดาห์ก่อน'],
  ] },
  { a: 'say', b: 'tell', tip: 'tell ต้องตามด้วย "คน" เสมอ (tell me, tell her) · say ไม่ต้องมีคน หรือใช้ say to someone', q: [
    ['Please ___ me the truth.', 'tell', 'say', 'บอกความจริงฉันมาเถอะ'],
    ['What did she ___ about the plan?', 'say', 'tell', 'เธอพูดอะไรเกี่ยวกับแผนนี้'],
    ['He ___ us a funny story about his dog.', 'told', 'said', 'เขาเล่าเรื่องตลกเกี่ยวกับหมาของเขาให้เราฟัง'],
  ] },
  { a: 'hear', b: 'listen', tip: 'hear = ได้ยิน (เสียงเข้าหูเอง) · listen (to) = ตั้งใจฟัง', q: [
    ['I can ___ a strange noise outside.', 'hear', 'listen', 'ฉันได้ยินเสียงแปลกๆ ข้างนอก'],
    ['I like to ___ to music while I cook.', 'listen', 'hear', 'ฉันชอบฟังเพลงตอนทำอาหาร'],
    ['Are you ___ to me? This is important.', 'listening', 'hearing', 'ฟังฉันอยู่หรือเปล่า เรื่องนี้สำคัญนะ'],
  ] },
  { a: 'see', b: 'watch', tip: 'see = เห็น (ไม่ได้ตั้งใจ) · watch = ดูอย่างตั้งใจ เช่น ดูทีวี ดูฟุตบอล ดูสิ่งที่เคลื่อนไหว', q: [
    ['We ___ a football match on TV last night.', 'watched', 'saw', 'เมื่อคืนเราดูฟุตบอลทางทีวี'],
    ['Did you ___ my keys anywhere?', 'see', 'watch', 'เห็นกุญแจของฉันที่ไหนบ้างไหม'],
    ['The children ___ the birds for an hour.', 'watched', 'saw', 'เด็กๆ เฝ้าดูนกอยู่หนึ่งชั่วโมง'],
  ] },
  { a: 'bored', b: 'boring', tip: '-ed = ความรู้สึกของคน (ฉันเบื่อ) · -ing = สิ่งที่ทำให้รู้สึกแบบนั้น (หนังน่าเบื่อ)', q: [
    ['The film was so ___ that I fell asleep.', 'boring', 'bored', 'หนังน่าเบื่อมากจนฉันหลับไป'],
    ["I'm ___. Let's go out and do something.", 'bored', 'boring', 'ฉันเบื่อแล้ว ออกไปทำอะไรกันเถอะ'],
    ['The students looked ___ during the long talk.', 'bored', 'boring', 'นักเรียนดูเบื่อระหว่างการบรรยายที่ยาวนาน'],
  ] },
  { a: 'interested', b: 'interesting', tip: '-ed = คนที่รู้สึกสนใจ · -ing = สิ่งที่น่าสนใจ', q: [
    ["I'm very ___ in Japanese history.", 'interested', 'interesting', 'ฉันสนใจประวัติศาสตร์ญี่ปุ่นมาก'],
    ['That was an ___ question.', 'interesting', 'interested', 'นั่นเป็นคำถามที่น่าสนใจ'],
    ['She read an ___ article about sleep.', 'interesting', 'interested', 'เธออ่านบทความที่น่าสนใจเรื่องการนอน'],
  ] },
  { a: 'excited', b: 'exciting', tip: '-ed = คนที่ตื่นเต้น · -ing = สิ่งที่น่าตื่นเต้น', q: [
    ['The kids are ___ about the trip tomorrow.', 'excited', 'exciting', 'เด็กๆ ตื่นเต้นกับทริปพรุ่งนี้'],
    ['It was an ___ game until the last minute.', 'exciting', 'excited', 'เป็นเกมที่น่าตื่นเต้นจนนาทีสุดท้าย'],
    ['Moving to a new city is ___ but a little scary.', 'exciting', 'excited', 'การย้ายไปเมืองใหม่น่าตื่นเต้นแต่ก็น่ากลัวนิดหน่อย'],
  ] },
  { a: 'lose', b: 'miss', tip: 'lose = ทำหาย หรือแพ้ · miss = พลาด (รถ เที่ยวบิน โอกาส) หรือคิดถึง', q: [
    ['Hurry up or we will ___ the bus.', 'miss', 'lose', 'เร็วเข้า ไม่งั้นเราจะตกรถเมล์'],
    ["Don't ___ your ticket. You need it to get out.", 'lose', 'miss', 'อย่าทำตั๋วหาย ต้องใช้ตอนออก'],
    ['I really ___ my family when I travel.', 'miss', 'lose', 'ฉันคิดถึงครอบครัวมากเวลาเดินทาง'],
  ] },
  { a: 'lose', b: 'loose', tip: 'lose (ลูซ) = ทำหาย/แพ้ เป็นกริยา · loose (ลูส) = หลวม ไม่แน่น เป็นคำคุณศัพท์', q: [
    ['These trousers are too ___. I need a belt.', 'loose', 'lose', 'กางเกงตัวนี้หลวมไป ต้องใช้เข็มขัด'],
    ['If we ___ this game, we are out.', 'lose', 'loose', 'ถ้าเราแพ้เกมนี้ เราตกรอบ'],
    ['One of the screws is ___.', 'loose', 'lose', 'มีน็อตตัวหนึ่งหลวม'],
  ] },
  { a: 'make', b: 'do', tip: 'make = สร้าง/ทำให้เกิดสิ่งใหม่ (make a cake, a mistake, a decision) · do = ทำกิจกรรม งาน หน้าที่ (do homework, do the dishes)', q: [
    ['I always ___ my homework after dinner.', 'do', 'make', 'ฉันทำการบ้านหลังมื้อเย็นเสมอ'],
    ['Everyone ___ mistakes when they learn.', 'makes', 'does', 'ทุกคนทำผิดพลาดตอนเรียนรู้'],
    ['Can you ___ me a favour?', 'do', 'make', 'ช่วยอะไรฉันหน่อยได้ไหม'],
  ] },
  { a: 'bring', b: 'take', tip: 'bring = นำ "มา" ที่ที่ผู้พูดอยู่ · take = นำ "ไป" ที่อื่น', q: [
    ['Please ___ your laptop when you come to my house.', 'bring', 'take', 'มาบ้านฉันช่วยเอาแล็ปท็อปมาด้วยนะ'],
    ["Don't forget to ___ an umbrella when you go out.", 'take', 'bring', 'ออกไปข้างนอกอย่าลืมเอาร่มไปด้วย'],
    ['Can you ___ these letters to the post office?', 'take', 'bring', 'ช่วยเอาจดหมายพวกนี้ไปไปรษณีย์ได้ไหม'],
  ] },
  { a: 'win', b: 'beat', tip: 'win + การแข่งขัน/รางวัล (win a game, win a prize) · beat + คู่แข่ง (beat a team, beat me)', q: [
    ['Our team ___ the final 3–1.', 'won', 'beat', 'ทีมเราชนะนัดชิง 3–1'],
    ['She ___ me at chess again.', 'beat', 'won', 'เธอเล่นหมากรุกชนะฉันอีกแล้ว'],
    ['He hopes to ___ a gold medal.', 'win', 'beat', 'เขาหวังจะได้เหรียญทอง'],
  ] },
  { a: 'remember', b: 'remind', tip: 'remember = จำได้ นึกได้เอง · remind = เตือนให้ (คนอื่น) นึกถึง', q: [
    ['Can you ___ me to call Mum later?', 'remind', 'remember', 'ช่วยเตือนให้ฉันโทรหาแม่ทีหลังได้ไหม'],
    ['I can\'t ___ where I parked the car.', 'remember', 'remind', 'ฉันจำไม่ได้ว่าจอดรถไว้ที่ไหน'],
    ['This song ___ me of my school days.', 'reminds', 'remembers', 'เพลงนี้ทำให้ฉันนึกถึงสมัยเรียน'],
  ] },
  { a: 'fun', b: 'funny', tip: 'fun = สนุก (กิจกรรม) · funny = ตลก ทำให้หัวเราะ', q: [
    ['The party was really ___. We danced all night.', 'fun', 'funny', 'ปาร์ตี้สนุกมาก เราเต้นกันทั้งคืน'],
    ['He told a ___ joke and everyone laughed.', 'funny', 'fun', 'เขาเล่ามุกตลกและทุกคนก็หัวเราะ'],
    ['Learning to surf is hard but ___.', 'fun', 'funny', 'การหัดโต้คลื่นยากแต่สนุก'],
  ] },
  { a: 'actually', b: 'currently', tip: 'actually = ที่จริงแล้ว (ไม่ได้แปลว่า "ปัจจุบัน") · currently = ปัจจุบันนี้ ตอนนี้', q: [
    ['She is ___ working in Singapore.', 'currently', 'actually', 'ตอนนี้เธอทำงานอยู่ที่สิงคโปร์'],
    ['I thought he was French, but he is ___ Swiss.', 'actually', 'currently', 'ฉันคิดว่าเขาเป็นคนฝรั่งเศส แต่ที่จริงเขาเป็นคนสวิส'],
    ['The shop is ___ closed for repairs.', 'currently', 'actually', 'ร้านปิดซ่อมแซมอยู่ในขณะนี้'],
  ] },
  { a: 'sensible', b: 'sensitive', tip: 'sensible = มีเหตุผล รอบคอบ · sensitive = อ่อนไหว แพ้ง่าย รู้สึกไว', q: [
    ['It was ___ to bring a jacket. It got cold.', 'sensible', 'sensitive', 'การเอาแจ็กเก็ตมาด้วยเป็นความคิดที่ดี อากาศเย็นลง'],
    ['My skin is very ___ to the sun.', 'sensitive', 'sensible', 'ผิวของฉันแพ้แดดง่ายมาก'],
    ['He is ___ and easily hurt by comments.', 'sensitive', 'sensible', 'เขาอ่อนไหวและเสียใจง่ายกับคำวิจารณ์'],
  ] },
  { a: 'alone', b: 'lonely', tip: 'alone = อยู่คนเดียว (ไม่ได้แปลว่าเศร้า) · lonely = เหงา รู้สึกโดดเดี่ยว', q: [
    ['She lives ___ but she has many friends.', 'alone', 'lonely', 'เธออยู่คนเดียว แต่มีเพื่อนเยอะ'],
    ['He felt ___ in the big city at first.', 'lonely', 'alone', 'ตอนแรกเขารู้สึกเหงาในเมืองใหญ่'],
    ['I like to walk ___ in the morning to think.', 'alone', 'lonely', 'ฉันชอบเดินคนเดียวตอนเช้าเพื่อคิดอะไรเรื่อยเปื่อย'],
  ] },
  { a: 'travel', b: 'trip', tip: 'travel = การเดินทาง (ทั่วไป/กริยา) · trip = ทริป การเดินทางครั้งหนึ่ง ไปแล้วกลับ', q: [
    ['How was your ___ to Chiang Mai?', 'trip', 'travel', 'ทริปเชียงใหม่เป็นยังไงบ้าง'],
    ['I love to ___ by train.', 'travel', 'trip', 'ฉันชอบเดินทางโดยรถไฟ'],
    ['We are planning a short ___ to the beach.', 'trip', 'travel', 'เรากำลังวางแผนไปทะเลสั้นๆ'],
  ] },
  { a: 'job', b: 'work', tip: 'job = ตำแหน่งงาน นับได้ (a job) · work = งาน การทำงาน นับไม่ได้ (ไม่ใช้ a work)', q: [
    ['She got a new ___ at a bank.', 'job', 'work', 'เธอได้งานใหม่ที่ธนาคาร'],
    ['I have a lot of ___ to finish today.', 'work', 'job', 'วันนี้ฉันมีงานต้องทำให้เสร็จเยอะ'],
    ['He goes to ___ by bike.', 'work', 'job', 'เขาปั่นจักรยานไปทำงาน'],
  ] },
  { a: 'ago', b: 'before', tip: 'ago = ก่อนหน้านี้ นับจากตอนนี้ (two days ago) · before = ก่อน (เหตุการณ์อื่น) หรือ "เคย" (I have been here before)', q: [
    ['I met him three years ___.', 'ago', 'before', 'ฉันเจอเขาเมื่อสามปีก่อน'],
    ['Wash your hands ___ you eat.', 'before', 'ago', 'ล้างมือก่อนกินข้าว'],
    ["I'm sure I have seen this film ___.", 'before', 'ago', 'ฉันแน่ใจว่าเคยดูหนังเรื่องนี้มาก่อน'],
  ] },
  { a: 'during', b: 'while', tip: 'during + คำนาม (during the meeting) · while + ประโยค (while I was cooking)', q: [
    ['Please turn off your phone ___ the film.', 'during', 'while', 'กรุณาปิดโทรศัพท์ระหว่างฉายหนัง'],
    ['Someone called ___ I was in the shower.', 'while', 'during', 'มีคนโทรมาตอนฉันอาบน้ำอยู่'],
    ['It rained ___ the night.', 'during', 'while', 'ฝนตกในช่วงกลางคืน'],
  ] },
  { a: 'for', b: 'since', tip: 'for + ระยะเวลา (for two years) · since + จุดเริ่มต้น (since 2020, since Monday)', q: [
    ["I've lived here ___ 2019.", 'since', 'for', 'ฉันอยู่ที่นี่ตั้งแต่ปี 2019'],
    ["We've been waiting ___ forty minutes.", 'for', 'since', 'เรารอมาสี่สิบนาทีแล้ว'],
    ["She hasn't eaten ___ this morning.", 'since', 'for', 'เธอยังไม่ได้กินอะไรเลยตั้งแต่เมื่อเช้า'],
  ] },
  { a: 'already', b: 'yet', tip: 'already = แล้ว (เร็วกว่าที่คิด) ใช้ในประโยคบอกเล่า · yet = ยัง/แล้วหรือยัง ใช้ในประโยคปฏิเสธและคำถาม ไว้ท้ายประโยค', q: [
    ["I've ___ finished my report.", 'already', 'yet', 'ฉันเขียนรายงานเสร็จแล้ว'],
    ['Have you booked the hotel ___?', 'yet', 'already', 'จองโรงแรมแล้วหรือยัง'],
    ["The bus hasn't arrived ___.", 'yet', 'already', 'รถเมล์ยังไม่มาเลย'],
  ] },
  { a: 'few', b: 'a few', tip: 'a few = มีอยู่บ้าง (มุมบวก) · few = มีน้อยมากจนแทบไม่มี (มุมลบ)', q: [
    ['I have ___ friends here, so I am never bored.', 'a few', 'few', 'ฉันมีเพื่อนที่นี่อยู่บ้าง เลยไม่เคยเบื่อ'],
    ['Very ___ people came, so the room felt empty.', 'few', 'a few', 'คนมาน้อยมาก ห้องเลยดูโล่ง'],
    ['Wait ___ minutes. I\'m nearly ready.', 'a few', 'few', 'รอสักไม่กี่นาที ใกล้เสร็จแล้ว'],
  ] },
  { a: 'number', b: 'amount', tip: 'number of + สิ่งที่นับได้ (a number of people) · amount of + สิ่งที่นับไม่ได้ (an amount of money)', q: [
    ['A large ___ of people joined the run.', 'number', 'amount', 'มีคนจำนวนมากเข้าร่วมวิ่ง'],
    ['That is a huge ___ of sugar for one cake.', 'amount', 'number', 'น้ำตาลเยอะมากสำหรับเค้กก้อนเดียว'],
    ['The ___ of cars on the road keeps growing.', 'number', 'amount', 'จำนวนรถบนถนนเพิ่มขึ้นเรื่อยๆ'],
  ] },
  { a: 'between', b: 'among', tip: 'between = ระหว่างสองสิ่ง (หรือสิ่งที่แยกชัด) · among = ท่ามกลางกลุ่ม', q: [
    ['The bank is ___ the café and the cinema.', 'between', 'among', 'ธนาคารอยู่ระหว่างร้านกาแฟกับโรงหนัง'],
    ['I found my old photo ___ these papers.', 'among', 'between', 'ฉันเจอรูปเก่าอยู่ท่ามกลางกองกระดาษพวกนี้'],
    ["Don't eat ___ meals if you want to lose weight.", 'between', 'among', 'ถ้าอยากลดน้ำหนักอย่ากินจุบจิบระหว่างมื้อ'],
  ] },
  { a: 'advice', b: 'advise', tip: 'advice (แอดไวส์) = คำแนะนำ เป็นคำนาม นับไม่ได้ · advise (แอดไวซ์) = แนะนำ เป็นกริยา', q: [
    ['Can I give you some ___?', 'advice', 'advise', 'ขอให้คำแนะนำหน่อยได้ไหม'],
    ['The doctor ___ me to rest for a week.', 'advised', 'advice', 'หมอแนะนำให้ฉันพักหนึ่งสัปดาห์'],
    ['Thanks for your ___. It really helped.', 'advice', 'advise', 'ขอบคุณสำหรับคำแนะนำ ช่วยได้มากจริงๆ'],
  ] },
  { a: 'rise', b: 'raise', tip: 'rise = ขึ้นเอง (ไม่มีกรรม) · raise = ยกขึ้น/เพิ่ม (ต้องมีกรรม เช่น raise your hand)', q: [
    ['The sun ___ in the east.', 'rises', 'raises', 'ดวงอาทิตย์ขึ้นทางทิศตะวันออก'],
    ['___ your hand if you have a question.', 'Raise', 'Rise', 'ยกมือถ้ามีคำถาม'],
    ['Prices ___ again this month.', 'rose', 'raised', 'เดือนนี้ราคาขึ้นอีกแล้ว'],
  ] },
  { a: 'hope', b: 'wish', tip: 'hope = หวังสิ่งที่เป็นไปได้ · wish = อยากให้เป็น (ซึ่งตอนนี้ไม่เป็นจริง) มักตามด้วยอดีตกาล', q: [
    ['I ___ you feel better soon.', 'hope', 'wish', 'หวังว่าเธอจะหายเร็วๆ นะ'],
    ['I ___ I had more free time.', 'wish', 'hope', 'อยากมีเวลาว่างมากกว่านี้จัง'],
    ['We ___ it will be sunny for the wedding.', 'hope', 'wish', 'เราหวังว่าวันแต่งงานแดดจะดี'],
  ] },
  { a: 'embarrassed', b: 'ashamed', tip: 'embarrassed = อาย ขายหน้า (เรื่องน่าอายเล็กๆ) · ashamed = ละอายใจ (ทำเรื่องผิด)', q: [
    ['I was ___ when I called my teacher "Mum".', 'embarrassed', 'ashamed', 'ฉันอายมากตอนเผลอเรียกครูว่า "แม่"'],
    ['He felt ___ of lying to his best friend.', 'ashamed', 'embarrassed', 'เขาละอายใจที่โกหกเพื่อนสนิท'],
    ['She went red and looked ___ after she fell over.', 'embarrassed', 'ashamed', 'เธอหน้าแดงและดูอายหลังจากหกล้ม'],
  ] },
  { a: 'high', b: 'tall', tip: 'tall = สูง (คน ต้นไม้ ตึก ที่สูงชะลูด) · high = สูงจากพื้น หรือระดับสูง (ภูเขา ชั้นวาง ราคา)', q: [
    ['My brother is very ___ — almost two metres.', 'tall', 'high', 'พี่ชายฉันสูงมาก เกือบสองเมตร'],
    ['The prices here are too ___.', 'high', 'tall', 'ราคาที่นี่สูงเกินไป'],
    ['The plane was flying very ___.', 'high', 'tall', 'เครื่องบินบินสูงมาก'],
  ] },
  { a: 'cook', b: 'cooker', tip: 'cook = คนทำอาหาร (หรือกริยา "ทำอาหาร") · cooker = เตา (เครื่องครัว)', q: [
    ['My dad is a great ___. His curry is the best.', 'cook', 'cooker', 'พ่อฉันทำอาหารเก่งมาก แกงของพ่ออร่อยที่สุด'],
    ['Turn off the ___ before you leave.', 'cooker', 'cook', 'ปิดเตาก่อนออกไปนะ'],
    ['The restaurant needs a new ___ in the kitchen. The old one left.', 'cook', 'cooker', 'ร้านต้องการพ่อครัวคนใหม่ คนเก่าลาออกไปแล้ว'],
  ] },
  { a: 'receipt', b: 'recipe', tip: 'receipt (รีซีท) = ใบเสร็จ · recipe (เรสซิพี) = สูตรอาหาร', q: [
    ['Keep the ___ in case you want to return it.', 'receipt', 'recipe', 'เก็บใบเสร็จไว้เผื่ออยากคืนของ'],
    ['This ___ needs two eggs and some flour.', 'recipe', 'receipt', 'สูตรนี้ใช้ไข่สองฟองและแป้งนิดหน่อย'],
    ['Can I have a ___, please? I need it for work.', 'receipt', 'recipe', 'ขอใบเสร็จด้วยค่ะ ต้องใช้เบิกที่ทำงาน'],
  ] },
  { a: 'quiet', b: 'quite', tip: 'quiet (ไคว-เอิท) = เงียบ · quite (ไควท์) = ค่อนข้าง', q: [
    ['Please be ___. The baby is sleeping.', 'quiet', 'quite', 'เงียบๆ หน่อย ลูกกำลังหลับ'],
    ['The test was ___ easy.', 'quite', 'quiet', 'ข้อสอบค่อนข้างง่าย'],
    ['I like this café because it is ___.', 'quiet', 'quite', 'ฉันชอบร้านกาแฟนี้เพราะมันเงียบ'],
  ] },
  { a: 'desert', b: 'dessert', tip: 'desert (เดส-เสิร์ท) = ทะเลทราย · dessert (ดิ-เซิร์ท) = ของหวาน (ตัว s สองตัว เหมือนอยากกินสองที่)', q: [
    ['What would you like for ___? Ice cream?', 'dessert', 'desert', 'ของหวานรับอะไรดี ไอศกรีมไหม'],
    ['Very little rain falls in the ___.', 'desert', 'dessert', 'ทะเลทรายมีฝนตกน้อยมาก'],
    ['Mango sticky rice is my favourite ___.', 'dessert', 'desert', 'ข้าวเหนียวมะม่วงเป็นของหวานที่ฉันชอบที่สุด'],
  ] },
  { a: 'accept', b: 'except', tip: 'accept = ยอมรับ รับ (กริยา) · except = ยกเว้น', q: [
    ['Everyone came ___ Tom. He was sick.', 'except', 'accept', 'ทุกคนมา ยกเว้นทอม เขาป่วย'],
    ['Do you ___ credit cards?', 'accept', 'except', 'รับบัตรเครดิตไหม'],
    ['She ___ the job offer right away.', 'accepted', 'excepted', 'เธอตอบรับข้อเสนองานทันที'],
  ] },
  { a: 'price', b: 'prize', tip: 'price (ไพรซ์ เสียง ส) = ราคา · prize (ไพรซ์ เสียง ซ ก้อง) = รางวัล', q: [
    ['What is the ___ of this bag?', 'price', 'prize', 'กระเป๋าใบนี้ราคาเท่าไร'],
    ['She won first ___ in the drawing contest.', 'prize', 'price', 'เธอได้รางวัลที่หนึ่งในการประกวดวาดภาพ'],
    ['Oil ___ went up again.', 'prices', 'prizes', 'ราคาน้ำมันขึ้นอีกแล้ว'],
  ] },
  { a: 'cloth', b: 'clothes', tip: 'cloth = ผ้า (ผืนผ้า เศษผ้า) · clothes = เสื้อผ้า (ใส่ได้)', q: [
    ['I need to buy some new ___ for work.', 'clothes', 'cloth', 'ฉันต้องซื้อเสื้อผ้าใหม่ไว้ใส่ไปทำงาน'],
    ['Clean the table with a wet ___.', 'cloth', 'clothes', 'เช็ดโต๊ะด้วยผ้าเปียก'],
    ['Take off your wet ___ and have a hot shower.', 'clothes', 'cloth', 'ถอดเสื้อผ้าเปียกออกแล้วอาบน้ำอุ่นซะ'],
  ] },
  { a: 'though', b: 'through', tip: 'though (โธว) = แม้ว่า · through (ธรู) = ผ่าน ทะลุ', q: [
    ['We walked ___ the park to get home.', 'through', 'though', 'เราเดินผ่านสวนสาธารณะกลับบ้าน'],
    ['___ it was raining, they played outside.', 'Though', 'Through', 'แม้ฝนจะตก พวกเขาก็ยังเล่นข้างนอก'],
    ['The train goes ___ a long tunnel.', 'through', 'though', 'รถไฟวิ่งผ่านอุโมงค์ยาว'],
  ] },
  { a: 'rob', b: 'steal', tip: 'steal + สิ่งของ (steal a phone) · rob + คนหรือสถานที่ (rob a bank, rob someone)', q: [
    ['Someone ___ my bike last night.', 'stole', 'robbed', 'มีคนขโมยจักรยานฉันเมื่อคืน'],
    ['Two men ___ a jewellery shop in town.', 'robbed', 'stole', 'ชายสองคนปล้นร้านเพชรในเมือง'],
    ['He was ___ on his way home.', 'robbed', 'stolen', 'เขาโดนปล้นระหว่างทางกลับบ้าน'],
  ] },
  { a: 'put on', b: 'wear', tip: 'put on = สวม (การกระทำตอนใส่) · wear = ใส่อยู่ (สภาพ)', q: [
    ['___ your coat. It\'s cold outside.', 'Put on', 'Wear', 'ใส่เสื้อโค้ทซะ ข้างนอกหนาว'],
    ['She usually ___ glasses for reading.', 'wears', 'puts on', 'เธอมักใส่แว่นตอนอ่านหนังสือ'],
    ['He was ___ a blue shirt at the party.', 'wearing', 'putting on', 'เขาใส่เสื้อเชิ้ตสีฟ้าในงานปาร์ตี้'],
  ] },
  { a: 'house', b: 'home', tip: 'house = ตัวบ้าน (อาคาร) · home = บ้านที่เราอยู่ (ความรู้สึก) และใช้ go home ไม่มี to', q: [
    ["I'm tired. Let's go ___.", 'home', 'house', 'เหนื่อยแล้ว กลับบ้านกันเถอะ'],
    ['They built a big ___ near the river.', 'house', 'home', 'พวกเขาสร้างบ้านหลังใหญ่ใกล้แม่น้ำ'],
    ['Make yourself at ___.', 'home', 'house', 'ทำตัวตามสบายเหมือนอยู่บ้านนะ'],
  ] },
  { a: 'fell', b: 'felt', tip: 'fell = ล้ม/ตก (อดีตของ fall) · felt = รู้สึก (อดีตของ feel)', q: [
    ['She ___ off her bike and hurt her knee.', 'fell', 'felt', 'เธอตกจักรยานจนเจ็บเข่า'],
    ['I ___ happy when I saw the result.', 'felt', 'fell', 'ฉันรู้สึกดีใจเมื่อเห็นผล'],
    ['He ___ asleep on the sofa.', 'fell', 'felt', 'เขาหลับไปบนโซฟา'],
  ] },
  { a: 'kitchen', b: 'chicken', tip: 'kitchen (คิท-ชิน) = ห้องครัว · chicken (ชิค-คิน) = ไก่', q: [
    ['Mum is cooking in the ___.', 'kitchen', 'chicken', 'แม่กำลังทำอาหารอยู่ในครัว'],
    ['I ordered fried ___ with rice.', 'chicken', 'kitchen', 'ฉันสั่งไก่ทอดกับข้าว'],
    ['Our ___ is small, but it has a big window.', 'kitchen', 'chicken', 'ห้องครัวเราเล็ก แต่มีหน้าต่างบานใหญ่'],
  ] },
];

window.MINPAIRS_TIP = {
  i: 'เสียง /ɪ/ สั้นแบบ "อิ" กับ /iː/ ยาวแบบ "อี"',
  ae: 'เสียง /æ/ อ้าปากกว้างแบบ "แอ" กับ /e/ แบบ "เอะ"',
  o: 'เสียง /ɒ/ สั้นแบบ "อ็อ" กับ /əʊ/ แบบ "โอว"',
  lr: 'L แตะลิ้นที่ปุ่มเหงือก · R ม้วนลิ้นไม่แตะ',
  fv: 'F ไม่ก้อง (ฟ) · V ก้อง ฟันบนแตะริมฝีปากล่างแล้วสั่น',
  th: 'TH เอาลิ้นแตะฟันบน ไม่ใช่ ท/ส/ต',
  sh: 'SH เสียงลมแบบ "ช" ยาว · CH เสียง "ช" สั้นมีแรงระเบิด',
  end: 'เสียงท้ายคำต่างกัน คนไทยมักไม่ออกเสียงท้าย',
  voice: 'ท้ายคำแบบก้อง (d, b, g, z) ทำให้สระยาวขึ้น · แบบไม่ก้อง (t, p, k, s) สระสั้นและห้วน',
  cl: 'พยัญชนะควบกล้ำ ต้องออกเสียงทั้งสองตัว',
};
window.MINPAIRS = [
  ['ship', 'เรือ', 'sheep', 'แกะ', 'i'], ['live', 'อาศัยอยู่', 'leave', 'ออกไป', 'i'], ['sit', 'นั่ง', 'seat', 'ที่นั่ง', 'i'],
  ['fill', 'เติมให้เต็ม', 'feel', 'รู้สึก', 'i'], ['hit', 'ตี', 'heat', 'ความร้อน', 'i'], ['chip', 'ชิ้นเล็ก/มันฝรั่งทอด', 'cheap', 'ถูก (ราคา)', 'i'],
  ['fit', 'พอดี', 'feet', 'เท้า (พหูพจน์)', 'i'], ['slip', 'ลื่น', 'sleep', 'นอนหลับ', 'i'], ['rich', 'รวย', 'reach', 'ไปถึง/เอื้อม', 'i'],
  ['still', 'ยังคง', 'steal', 'ขโมย', 'i'], ['bit', 'นิดหน่อย', 'beat', 'ตี/ชนะ', 'i'], ['hill', 'เนินเขา', 'heel', 'ส้นเท้า', 'i'],
  ['bad', 'แย่', 'bed', 'เตียง', 'ae'], ['man', 'ผู้ชาย', 'men', 'ผู้ชาย (พหูพจน์)', 'ae'], ['sad', 'เศร้า', 'said', 'พูด (อดีต)', 'ae'],
  ['pan', 'กระทะ', 'pen', 'ปากกา', 'ae'], ['had', 'มี (อดีต)', 'head', 'ศีรษะ', 'ae'], ['sat', 'นั่ง (อดีต)', 'set', 'ชุด/ตั้ง', 'ae'],
  ['bag', 'กระเป๋า', 'beg', 'ขอร้อง', 'ae'], ['band', 'วงดนตรี', 'bend', 'งอ', 'ae'],
  ['not', 'ไม่', 'note', 'บันทึก', 'o'], ['hop', 'กระโดด', 'hope', 'หวัง', 'o'], ['got', 'ได้ (อดีต)', 'goat', 'แพะ', 'o'],
  ['cost', 'ราคา', 'coast', 'ชายฝั่ง', 'o'], ['rod', 'แท่ง/คันเบ็ด', 'road', 'ถนน', 'o'], ['want', 'ต้องการ', "won't", 'จะไม่', 'o'],
  ['light', 'แสง/เบา', 'right', 'ถูกต้อง/ขวา', 'lr'], ['long', 'ยาว', 'wrong', 'ผิด', 'lr'], ['lead', 'นำ', 'read', 'อ่าน', 'lr'],
  ['glass', 'แก้ว', 'grass', 'หญ้า', 'lr'], ['fly', 'บิน', 'fry', 'ทอด', 'lr'], ['collect', 'สะสม', 'correct', 'ถูกต้อง', 'lr'],
  ['lock', 'ล็อก', 'rock', 'หิน', 'lr'], ['play', 'เล่น', 'pray', 'สวดมนต์', 'lr'], ['low', 'ต่ำ', 'row', 'แถว', 'lr'],
  ['cloud', 'เมฆ', 'crowd', 'ฝูงชน', 'lr'], ['alive', 'มีชีวิต', 'arrive', 'มาถึง', 'lr'], ['load', 'บรรทุก', 'road', 'ถนน', 'lr'],
  ['fan', 'พัดลม', 'van', 'รถตู้', 'fv'], ['fast', 'เร็ว', 'vast', 'กว้างใหญ่', 'fv'], ['few', 'น้อย', 'view', 'วิว', 'fv'],
  ['fine', 'สบายดี', 'vine', 'เถาองุ่น', 'fv'], ['safe', 'ปลอดภัย', 'save', 'ประหยัด/ช่วยชีวิต', 'fv'], ['belief', 'ความเชื่อ', 'believe', 'เชื่อ', 'fv'],
  ['proof', 'หลักฐาน', 'prove', 'พิสูจน์', 'fv'], ['ferry', 'เรือข้ามฟาก', 'very', 'มาก', 'fv'],
  ['think', 'คิด', 'sink', 'อ่างล้างจาน/จม', 'th'], ['thank', 'ขอบคุณ', 'tank', 'ถังน้ำ/รถถัง', 'th'], ['three', 'สาม', 'tree', 'ต้นไม้', 'th'],
  ['thin', 'ผอม/บาง', 'tin', 'กระป๋อง', 'th'], ['path', 'ทางเดิน', 'pass', 'ผ่าน', 'th'], ['mouth', 'ปาก', 'mouse', 'หนู', 'th'],
  ['faith', 'ศรัทธา', 'face', 'ใบหน้า', 'th'], ['worth', 'คุ้มค่า', 'worse', 'แย่กว่า', 'th'], ['they', 'พวกเขา', 'day', 'วัน', 'th'],
  ['ship', 'เรือ', 'chip', 'ชิ้นเล็ก/มันฝรั่งทอด', 'sh'], ['share', 'แบ่งปัน', 'chair', 'เก้าอี้', 'sh'], ['shoes', 'รองเท้า', 'choose', 'เลือก', 'sh'],
  ['wash', 'ล้าง', 'watch', 'ดู/นาฬิกา', 'sh'], ['cash', 'เงินสด', 'catch', 'จับ', 'sh'], ['sheep', 'แกะ', 'cheap', 'ถูก (ราคา)', 'sh'],
  ['like', 'ชอบ', 'light', 'แสง', 'end'], ['life', 'ชีวิต', 'like', 'ชอบ', 'end'], ['bike', 'จักรยาน', 'bite', 'กัด', 'end'],
  ['time', 'เวลา', 'type', 'ประเภท/พิมพ์', 'end'], ['map', 'แผนที่', 'mat', 'เสื่อ', 'end'], ['cup', 'ถ้วย', 'cut', 'ตัด', 'end'],
  ['nine', 'เก้า', 'night', 'กลางคืน', 'end'], ['wife', 'ภรรยา', 'white', 'สีขาว', 'end'], ['card', 'การ์ด', 'cart', 'รถเข็น', 'end'],
  ['bat', 'ค้างคาว/ไม้ตี', 'bad', 'แย่', 'voice'], ['cap', 'หมวกแก๊ป', 'cab', 'แท็กซี่', 'voice'], ['back', 'หลัง/กลับ', 'bag', 'กระเป๋า', 'voice'],
  ['bet', 'พนัน', 'bed', 'เตียง', 'voice'], ['right', 'ถูกต้อง', 'ride', 'ขี่', 'voice'], ['white', 'สีขาว', 'wide', 'กว้าง', 'voice'],
  ['coat', 'เสื้อโค้ท', 'code', 'รหัส', 'voice'], ['seat', 'ที่นั่ง', 'seed', 'เมล็ด', 'voice'], ['rice', 'ข้าว', 'rise', 'ขึ้น', 'voice'],
  ['price', 'ราคา', 'prize', 'รางวัล', 'voice'], ['bus', 'รถเมล์', 'buzz', 'เสียงหึ่ง', 'voice'], ['peace', 'สันติภาพ', 'peas', 'ถั่วลันเตา', 'voice'],
  ['lock', 'ล็อก', 'log', 'ท่อนไม้', 'voice'], ['place', 'สถานที่', 'plays', 'เล่น (s)', 'voice'],
  ['play', 'เล่น', 'pay', 'จ่าย', 'cl'], ['bread', 'ขนมปัง', 'bed', 'เตียง', 'cl'], ['glass', 'แก้ว', 'gas', 'แก๊ส', 'cl'],
  ['black', 'สีดำ', 'back', 'หลัง/กลับ', 'cl'], ['stay', 'พัก', 'say', 'พูด', 'cl'], ['sport', 'กีฬา', 'spot', 'จุด', 'cl'],
  ['train', 'รถไฟ', 'rain', 'ฝน', 'cl'], ['bring', 'นำมา', 'ring', 'แหวน/โทร', 'cl'], ['clean', 'สะอาด', 'keen', 'กระตือรือร้น', 'cl'],
];
