// TOEIC Part 4 style talks (1.187.0): original short announcements, messages and talks by one speaker, each with 3 questions, written for this app.
// Same shape as data/toeicp3.js ({id, kind (P34_KIND), lines: [[speaker, text]], th, q}); all lines of a talk have one speaker.
// Lazy-loaded by loadP34(4) in js/lexis2.js; game `toeic4` (qP34 in data/play.js). A test checks the shape.
window.TOEICP4 = [
  { id: 'storeclose', kind: 'announce',
    lines: [
      ['W', 'Attention, shoppers. The store will be closing in fifteen minutes. Please bring your final purchases to the checkout.'],
      ['W', 'Tomorrow we begin our three-day summer sale, with up to forty percent off all outdoor furniture.'],
      ['W', 'Members of our rewards club can enter one hour early, at eight a.m. Thank you for shopping with us.'],
    ],
    th: 'ประกาศในร้าน: ร้านจะปิดในสิบห้านาที พรุ่งนี้เริ่มลดราคาหน้าร้อนสามวัน เฟอร์นิเจอร์กลางแจ้งลดสูงสุด 40% สมาชิกเข้าได้ก่อนหนึ่งชั่วโมงตอนแปดโมง',
    q: [
      ['Where is the announcement being made?', ['In a store', 'At an airport', 'In a hotel', 'At a train station'], 0, 'shoppers, purchases, checkout = ในร้านค้า'],
      ['What will start tomorrow?', ['A sale', 'A renovation', 'A cooking class', 'A new delivery service'], 0, 'Tomorrow we begin our three-day summer sale = พรุ่งนี้เริ่มลดราคาหน้าร้อนสามวัน'],
      ['What can rewards club members do?', ['Enter the store early', 'Get free delivery', 'Receive a gift card', 'Park for free'], 0, 'Members of our rewards club can enter one hour early = สมาชิกเข้าร้านได้ก่อนหนึ่งชั่วโมง'],
    ] },
  { id: 'voicedentist', kind: 'voicemail',
    lines: [
      ['M', 'Hello, this message is for Ms. Ruiz. This is Ben calling from Smile Dental Clinic.'],
      ['M', 'I\'m calling to remind you about your appointment with Dr. Lee tomorrow at two thirty.'],
      ['M', 'Please arrive ten minutes early, as we need you to update your contact form. If you need to change the time, call us back at 555-0142. Thank you.'],
    ],
    th: 'ข้อความจากคลินิกทันตกรรม เตือนคุณรุยซ์ว่ามีนัดกับหมอลีพรุ่งนี้บ่ายสองโมงครึ่ง ให้มาก่อนสิบนาทีเพื่อแก้ไขแบบฟอร์มข้อมูลติดต่อ ถ้าจะเปลี่ยนเวลาให้โทรกลับ',
    q: [
      ['Why is the speaker calling?', ['To remind the listener about an appointment', 'To cancel an appointment', 'To offer a job', 'To ask for a payment'], 0, 'I\'m calling to remind you about your appointment = โทรมาเตือนเรื่องนัด'],
      ['Why should the listener arrive early?', ['To update a form', 'To meet a new dentist', 'To pay a bill', 'To find parking'], 0, 'we need you to update your contact form = ต้องแก้ไขแบบฟอร์มข้อมูลติดต่อ'],
      ['What should the listener do to change the time?', ['Call the clinic', 'Send an email', 'Visit the website', 'Speak to Dr. Lee'], 0, 'If you need to change the time, call us back at 555-0142 = ถ้าจะเปลี่ยนเวลาให้โทรกลับไปที่คลินิก'],
    ] },
  { id: 'tourboat', kind: 'tour',
    lines: [
      ['M', 'Welcome aboard the River Star, everyone. My name is Tom, and I\'ll be your guide this afternoon.'],
      ['M', 'Our cruise will last about ninety minutes. We\'ll pass the old customs house and the royal palace, and we\'ll stop at the flower market for twenty minutes.'],
      ['M', 'Drinks are available from the bar on the lower deck. And please remember to keep your bags with you when we leave the boat at the market.'],
    ],
    th: 'ไกด์ทัวร์ล่องเรือแนะนำตัว ทัวร์ใช้เวลาราวเก้าสิบนาที ผ่านศุลกากรเก่ากับพระราชวัง แวะตลาดดอกไม้ยี่สิบนาที มีเครื่องดื่มที่บาร์ชั้นล่าง ให้ถือกระเป๋าไปด้วยตอนลงเรือที่ตลาด',
    q: [
      ['Who is the speaker?', ['A tour guide', 'A ship captain', 'A market seller', 'A museum guard'], 0, 'I\'ll be your guide this afternoon = ผู้พูดเป็นไกด์'],
      ['How long will the group stay at the flower market?', ['Twenty minutes', 'Ninety minutes', 'One hour', 'Ten minutes'], 0, 'stop at the flower market for twenty minutes (90 นาที คือทั้งทัวร์)'],
      ['What are listeners asked to do at the market?', ['Take their bags with them', 'Buy some flowers', 'Stay on the boat', 'Meet at the bar'], 0, 'keep your bags with you when we leave the boat at the market = ให้ถือกระเป๋าไปด้วยตอนลงเรือที่ตลาด'],
    ] },
  { id: 'trafficnews', kind: 'radio',
    lines: [
      ['W', 'This is Radio Metro with your eight o\'clock traffic report.'],
      ['W', 'Drivers heading downtown should avoid Bridge Street this morning. One lane is closed because of road repairs, and traffic is moving very slowly.'],
      ['W', 'The work is expected to finish by noon. Until then, we suggest taking the river road instead. Next, we\'ll have the weather with Sam.'],
    ],
    th: 'รายงานจราจรแปดโมงเช้า ถนนบริดจ์ปิดหนึ่งเลนเพราะซ่อมถนน รถเคลื่อนช้ามาก คาดว่าซ่อมเสร็จเที่ยง แนะนำให้ใช้ถนนเลียบแม่น้ำแทน ต่อไปเป็นพยากรณ์อากาศ',
    q: [
      ['What is the report mainly about?', ['Road repairs', 'A sports event', 'A new bridge', 'Bad weather'], 0, 'One lane is closed because of road repairs = ปิดหนึ่งเลนเพราะซ่อมถนน'],
      ['What does the speaker suggest?', ['Using a different road', 'Taking the subway', 'Leaving home later', 'Driving slowly'], 0, 'we suggest taking the river road instead = แนะนำให้ใช้ถนนเลียบแม่น้ำแทน'],
      ['What will listeners hear next?', ['A weather report', 'An interview', 'Some music', 'A news summary'], 0, 'Next, we\'ll have the weather with Sam = ต่อไปเป็นพยากรณ์อากาศ'],
    ] },
  { id: 'welcome', kind: 'meeting',
    lines: [
      ['M', 'Good morning, everyone, and welcome to your first day at Orion Software.'],
      ['M', 'This morning you\'ll get your laptops and set up your email accounts with our IT team. After lunch, each of you will meet the manager of your department.'],
      ['M', 'Before we start, please take a look at the employee handbook in your welcome pack. It explains our policies on working from home and holidays.'],
    ],
    th: 'ต้อนรับพนักงานใหม่วันแรก ช่วงเช้ารับแล็ปท็อปและตั้งค่าอีเมลกับทีมไอที บ่ายพบผู้จัดการแผนก ก่อนเริ่มให้ดูคู่มือพนักงานในชุดต้อนรับ ซึ่งมีนโยบายทำงานจากบ้านและวันหยุด',
    q: [
      ['Who are the listeners?', ['New employees', 'Software customers', 'IT technicians', 'Department managers'], 0, 'welcome to your first day = พนักงานใหม่'],
      ['What will happen after lunch?', ['Listeners will meet their managers.', 'Listeners will receive laptops.', 'There will be a tour of the building.', 'There will be a test.'], 0, 'After lunch, each of you will meet the manager of your department (แล็ปท็อปคือช่วงเช้า)'],
      ['What does the handbook explain?', ['Working from home and holidays', 'How to use the laptops', 'Where to eat lunch', 'How to find the office'], 0, 'It explains our policies on working from home and holidays = คู่มืออธิบายนโยบายทำงานจากบ้านและวันหยุด'],
    ] },
  { id: 'gymad', kind: 'ad',
    lines: [
      ['W', 'Want to get fit this year? Come to Peak Fitness, the city\'s newest gym, now open on Harbor Avenue.'],
      ['W', 'We have over a hundred machines, a twenty-five-meter pool, and classes from yoga to boxing every day.'],
      ['W', 'Sign up before the end of the month and pay no joining fee. Plus, your first personal training session is free. Visit peakfitness dot com to book a tour.'],
    ],
    th: 'โฆษณายิมใหม่พีคฟิตเนสที่ถนนฮาร์เบอร์ มีเครื่องออกกำลังกายกว่าร้อยเครื่อง สระยาว 25 เมตร คลาสทุกวัน สมัครภายในสิ้นเดือนไม่เสียค่าแรกเข้า และเทรนเนอร์ส่วนตัวครั้งแรกฟรี',
    q: [
      ['What is being advertised?', ['A fitness center', 'A swimming school', 'A sports shop', 'A health food store'], 0, 'Peak Fitness, the city\'s newest gym = พีคฟิตเนส ยิมใหม่ล่าสุดของเมือง'],
      ['What is offered to people who join this month?', ['No joining fee', 'A free month', 'A free towel', 'Half-price classes'], 0, 'Sign up before the end of the month and pay no joining fee = สมัครภายในสิ้นเดือนไม่เสียค่าแรกเข้า'],
      ['How can listeners book a tour?', ['Through a website', 'By phone', 'At the front desk', 'By email'], 0, 'Visit peakfitness dot com to book a tour = จองทัวร์ได้ทางเว็บไซต์'],
    ] },
  { id: 'teammeeting', kind: 'meeting',
    lines: [
      ['W', 'OK, let\'s get started. I have some good news. Our new mobile app was downloaded more than fifty thousand times in its first week.'],
      ['W', 'However, a lot of users have reported that the app is slow to load photos. Fixing that is our top priority this month.'],
      ['W', 'Jin\'s team will work on the problem, and I\'d like everyone else to read the user comments and send me any other issues by Wednesday.'],
    ],
    th: 'ประชุมทีม: แอปใหม่ถูกดาวน์โหลดกว่าห้าหมื่นครั้งในสัปดาห์แรก แต่ผู้ใช้บอกว่าโหลดรูปช้า แก้เรื่องนี้เป็นงานสำคัญที่สุดของเดือน ทีมของจินจะแก้ คนอื่นให้อ่านความเห็นผู้ใช้และส่งปัญหาอื่นภายในวันพุธ',
    q: [
      ['What good news does the speaker share?', ['An app has been downloaded many times.', 'The team will get a bonus.', 'A new manager has been hired.', 'A project finished early.'], 0, 'downloaded more than fifty thousand times in its first week = แอปถูกดาวน์โหลดกว่าห้าหมื่นครั้งในสัปดาห์แรก'],
      ['What problem do users report?', ['Photos load slowly.', 'The app costs too much.', 'The app is hard to find.', 'Messages are not sent.'], 0, 'the app is slow to load photos = แอปโหลดรูปช้า'],
      ['What are most listeners asked to do?', ['Read user comments', 'Fix the app', 'Call some customers', 'Prepare a presentation'], 0, 'everyone else to read the user comments (ทีมของจินเป็นคนแก้แอป)'],
    ] },
  { id: 'museumtalk', kind: 'tour',
    lines: [
      ['W', 'Welcome to the City History Museum. Before we begin the tour, a few reminders.'],
      ['W', 'You\'re welcome to take photos, but please don\'t use a flash, as it can damage the old paintings.'],
      ['W', 'Our tour ends in the gift shop, where you can show your ticket to get ten percent off. Now, if you\'ll follow me, we\'ll start in the hall of maps.'],
    ],
    th: 'ไกด์พิพิธภัณฑ์แจ้งก่อนเริ่มทัวร์ ถ่ายรูปได้แต่ห้ามใช้แฟลชเพราะทำให้ภาพเขียนเก่าเสียหาย ทัวร์จบที่ร้านของที่ระลึก แสดงตั๋วลด 10% เริ่มที่ห้องแผนที่',
    q: [
      ['Where most likely are the listeners?', ['At a museum', 'In a library', 'At a photo studio', 'In a map shop'], 0, 'Welcome to the City History Museum = ยินดีต้อนรับสู่พิพิธภัณฑ์'],
      ['Why should listeners not use a flash?', ['It can damage the paintings.', 'It disturbs other visitors.', 'It is against the law.', 'The rooms are too dark.'], 0, 'it can damage the old paintings = แฟลชทำให้ภาพเขียนเก่าเสียหาย'],
      ['How can listeners get a discount?', ['By showing their ticket', 'By joining a club', 'By buying two items', 'By paying in cash'], 0, 'show your ticket to get ten percent off = แสดงตั๋วรับส่วนลด 10%'],
    ] },
  { id: 'voicesupplier', kind: 'voicemail',
    lines: [
      ['W', 'Hi, Mr. Wong. This is Nina Park from Green Leaf Paper. I\'m calling about the order you placed on Monday for five hundred boxes of printer paper.'],
      ['W', 'Unfortunately, we only have three hundred boxes in our warehouse right now. We can send those tomorrow and the rest next Tuesday.'],
      ['W', 'If that doesn\'t work for you, please let me know by the end of today. I\'m really sorry for the trouble.'],
    ],
    th: 'คุณนีน่าจากบริษัทกระดาษโทรแจ้งคุณหว่องว่าสั่งกระดาษห้าร้อยกล่อง แต่คลังมีแค่สามร้อย ส่งพรุ่งนี้ได้สามร้อย ที่เหลือวันอังคารหน้า ถ้าไม่สะดวกให้แจ้งภายในวันนี้',
    q: [
      ['What is the purpose of the message?', ['To explain a problem with an order', 'To offer a new product', 'To confirm a payment', 'To schedule a meeting'], 0, 'we only have three hundred boxes = มีปัญหากับคำสั่งซื้อ'],
      ['How many boxes will be sent tomorrow?', ['Three hundred', 'Five hundred', 'Two hundred', 'One hundred'], 0, 'We can send those (three hundred boxes) tomorrow = ส่งสามร้อยกล่องได้พรุ่งนี้'],
      ['What does the speaker ask Mr. Wong to do?', ['Respond by the end of the day', 'Visit the warehouse', 'Pay in advance', 'Order a different paper'], 0, 'please let me know by the end of today = ให้แจ้งกลับภายในวันนี้'],
    ] },
  { id: 'awardnight', kind: 'meeting',
    lines: [
      ['M', 'Good evening, and thank you all for coming to this year\'s Local Business Awards.'],
      ['M', 'Tonight\'s first award goes to a company that has created more than a hundred jobs in our town in just two years. Please welcome Sara Chen, founder of Bright Path Delivery.'],
      ['M', 'Sara started the company with just one van. Today it has forty vehicles, and they all run on electricity.'],
    ],
    th: 'พิธีมอบรางวัลธุรกิจท้องถิ่น รางวัลแรกให้บริษัทที่สร้างงานกว่าร้อยตำแหน่งในสองปี คือคุณซาร่า เฉิน ผู้ก่อตั้งไบรท์พาธเดลิเวอรี เริ่มจากรถตู้คันเดียว ตอนนี้มีรถไฟฟ้าสี่สิบคัน',
    q: [
      ['What event is taking place?', ['An awards ceremony', 'A job fair', 'A car show', 'A company opening'], 0, 'this year\'s Local Business Awards = งานมอบรางวัลธุรกิจท้องถิ่นประจำปี'],
      ['Why is Sara Chen\'s company receiving an award?', ['It has created many jobs.', 'It has the fastest delivery.', 'It sold many vans.', 'It opened a new office.'], 0, 'has created more than a hundred jobs in our town = สร้างงานในเมืองกว่าร้อยตำแหน่ง'],
      ['What does the speaker say about the company\'s vehicles?', ['They are electric.', 'They are new.', 'They are rented.', 'They are very large.'], 0, 'they all run on electricity = รถไฟฟ้า'],
    ] },
];
