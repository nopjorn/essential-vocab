// Original practice data (lazy-loaded by loadFamilies()).
// FAMILIES: word families (one root, different parts of speech).
// f = [[word, part of speech, Thai], ...] · q = [[sentence with ___, answer (one of f), Thai translation], ...]
// Every sentence must accept only its answer among the family's words. A word belongs to one family only.
window.FAMILIES = [
  { f: [['decide', 'v', 'ตัดสินใจ'], ['decision', 'n', 'การตัดสินใจ'], ['decisive', 'adj', 'เด็ดขาด, ชี้ขาด'], ['decisively', 'adv', 'อย่างเด็ดขาด']], q: [
    ['It was a hard ___, but I think we chose well.', 'decision', 'เป็นการตัดสินใจที่ยาก แต่ฉันคิดว่าเราเลือกถูกแล้ว'],
    ['You have until Friday to ___.', 'decide', 'คุณมีเวลาตัดสินใจถึงวันศุกร์'],
  ] },
  { f: [['succeed', 'v', 'ประสบความสำเร็จ'], ['success', 'n', 'ความสำเร็จ'], ['successful', 'adj', 'ประสบความสำเร็จ'], ['successfully', 'adv', 'อย่างสำเร็จ']], q: [
    ['The party was a big ___.', 'success', 'งานปาร์ตี้ประสบความสำเร็จอย่างมาก'],
    ['She ___ finished her first marathon.', 'successfully', 'เธอวิ่งมาราธอนครั้งแรกจบได้สำเร็จ'],
  ] },
  { f: [['beauty', 'n', 'ความสวยงาม'], ['beautiful', 'adj', 'สวย'], ['beautifully', 'adv', 'อย่างสวยงาม']], q: [
    ['She sings ___.', 'beautifully', 'เธอร้องเพลงได้ไพเราะ'],
  ] },
  { f: [['care', 'n/v', 'ความใส่ใจ, ใส่ใจ'], ['careful', 'adj', 'ระมัดระวัง'], ['carefully', 'adv', 'อย่างระมัดระวัง'], ['careless', 'adj', 'สะเพร่า']], q: [
    ['Drive ___ when the road is wet.', 'carefully', 'ขับรถระวังๆ ตอนถนนเปียก'],
    ['I made a ___ mistake and lost two points.', 'careless', 'ฉันพลาดเพราะความสะเพร่าจนเสียไปสองคะแนน'],
  ] },
  { f: [['happy', 'adj', 'มีความสุข'], ['happiness', 'n', 'ความสุข'], ['happily', 'adv', 'อย่างมีความสุข']], q: [
    ['Money cannot buy ___.', 'happiness', 'เงินซื้อความสุขไม่ได้'],
  ] },
  { f: [['danger', 'n', 'อันตราย'], ['dangerous', 'adj', 'อันตราย (คุณศัพท์)'], ['dangerously', 'adv', 'อย่างอันตราย'], ['endanger', 'v', 'ทำให้ตกอยู่ในอันตราย']], q: [
    ['Swimming here is ___ because of the strong waves.', 'dangerous', 'ว่ายน้ำตรงนี้อันตรายเพราะคลื่นแรง'],
  ] },
  { f: [['differ', 'v', 'แตกต่าง'], ['difference', 'n', 'ความแตกต่าง'], ['different', 'adj', 'ต่างกัน'], ['differently', 'adv', 'อย่างแตกต่าง']], q: [
    ['Can you see the ___ between these two photos?', 'difference', 'เห็นความแตกต่างระหว่างสองรูปนี้ไหม'],
  ] },
  { f: [['educate', 'v', 'ให้การศึกษา'], ['education', 'n', 'การศึกษา'], ['educational', 'adj', 'เกี่ยวกับการศึกษา, ให้ความรู้']], q: [
    ['All parents want a good ___ for their children.', 'education', 'พ่อแม่ทุกคนอยากให้ลูกได้รับการศึกษาที่ดี'],
    ['This is an ___ game that teaches maths.', 'educational', 'นี่เป็นเกมเพื่อการศึกษาที่สอนคณิตศาสตร์'],
  ] },
  { f: [['employ', 'v', 'จ้างงาน'], ['employment', 'n', 'การจ้างงาน'], ['employer', 'n', 'นายจ้าง'], ['employee', 'n', 'ลูกจ้าง, พนักงาน']], q: [
    ['The new factory will ___ two hundred people.', 'employ', 'โรงงานใหม่จะจ้างคนสองร้อยคน'],
    ['My ___ pays my salary at the end of every month.', 'employer', 'นายจ้างจ่ายเงินเดือนฉันทุกสิ้นเดือน'],
  ] },
  { f: [['friend', 'n', 'เพื่อน'], ['friendly', 'adj', 'เป็นมิตร'], ['friendship', 'n', 'มิตรภาพ']], q: [
    ['The staff at the hotel were very ___.', 'friendly', 'พนักงานที่โรงแรมเป็นมิตรมาก'],
    ['Their ___ has lasted for fifty years.', 'friendship', 'มิตรภาพของพวกเขายืนยาวมาห้าสิบปีแล้ว'],
  ] },
  { f: [['help', 'v/n', 'ช่วย, ความช่วยเหลือ'], ['helpful', 'adj', 'มีประโยชน์, ช่วยได้มาก'], ['helpless', 'adj', 'ช่วยตัวเองไม่ได้'], ['helpfully', 'adv', 'อย่างช่วยเหลือ']], q: [
    ['Thanks, your advice was really ___.', 'helpful', 'ขอบคุณนะ คำแนะนำของคุณช่วยได้มากจริงๆ'],
  ] },
  { f: [['imagine', 'v', 'จินตนาการ'], ['imagination', 'n', 'จินตนาการ (คำนาม)'], ['imaginary', 'adj', 'ไม่มีจริง, ในจินตนาการ'], ['imaginative', 'adj', 'มีจินตนาการสูง']], q: [
    ['Children often have a wonderful ___.', 'imagination', 'เด็กๆ มักมีจินตนาการที่ยอดเยี่ยม'],
    ['My little sister has an ___ friend called Bob.', 'imaginary', 'น้องสาวฉันมีเพื่อนในจินตนาการชื่อบ็อบ'],
  ] },
  { f: [['inform', 'v', 'แจ้งให้ทราบ'], ['information', 'n', 'ข้อมูล'], ['informative', 'adj', 'ให้ข้อมูลดี']], q: [
    ['Can you give me some ___ about the tour?', 'information', 'ขอข้อมูลเกี่ยวกับทัวร์หน่อยได้ไหม'],
    ['Please ___ us if you change your address.', 'inform', 'กรุณาแจ้งเราถ้าคุณเปลี่ยนที่อยู่'],
  ] },
  { f: [['invent', 'v', 'ประดิษฐ์'], ['invention', 'n', 'สิ่งประดิษฐ์'], ['inventor', 'n', 'นักประดิษฐ์'], ['inventive', 'adj', 'มีความคิดสร้างสรรค์']], q: [
    ['The telephone was an important ___.', 'invention', 'โทรศัพท์เป็นสิ่งประดิษฐ์ที่สำคัญ'],
  ] },
  { f: [['comfort', 'n/v', 'ความสบาย, ปลอบใจ'], ['comfortable', 'adj', 'สบาย'], ['comfortably', 'adv', 'อย่างสบาย']], q: [
    ['This sofa is very ___.', 'comfortable', 'โซฟาตัวนี้นั่งสบายมาก'],
  ] },
  { f: [['create', 'v', 'สร้างสรรค์'], ['creation', 'n', 'สิ่งที่สร้างขึ้น, การสร้าง'], ['creative', 'adj', 'มีความคิดสร้างสรรค์'], ['creativity', 'n', 'ความคิดสร้างสรรค์']], q: [
    ['She is a very ___ designer.', 'creative', 'เธอเป็นนักออกแบบที่มีความคิดสร้างสรรค์มาก'],
  ] },
  { f: [['develop', 'v', 'พัฒนา'], ['development', 'n', 'การพัฒนา'], ['developer', 'n', 'นักพัฒนา']], q: [
    ['The city has seen a lot of ___ in recent years.', 'development', 'เมืองนี้มีการพัฒนามากในช่วงหลายปีที่ผ่านมา'],
  ] },
  { f: [['economy', 'n', 'เศรษฐกิจ'], ['economic', 'adj', 'ทางเศรษฐกิจ'], ['economical', 'adj', 'ประหยัด'], ['economist', 'n', 'นักเศรษฐศาสตร์']], q: [
    ['A small car is more ___ to run.', 'economical', 'รถคันเล็กใช้งานประหยัดกว่า'],
    ['The country is facing serious ___ problems.', 'economic', 'ประเทศกำลังเผชิญปัญหาทางเศรษฐกิจที่ร้ายแรง'],
  ] },
  { f: [['history', 'n', 'ประวัติศาสตร์'], ['historical', 'adj', 'เกี่ยวกับประวัติศาสตร์'], ['historian', 'n', 'นักประวัติศาสตร์']], q: [
    ['She is reading a ___ novel set in the 1800s.', 'historical', 'เธอกำลังอ่านนิยายอิงประวัติศาสตร์ที่เกิดในช่วงคริสต์ศตวรรษที่ 19'],
  ] },
  { f: [['nation', 'n', 'ชาติ, ประเทศ'], ['national', 'adj', 'ระดับชาติ'], ['nationality', 'n', 'สัญชาติ'], ['nationally', 'adv', 'ทั่วประเทศ']], q: [
    ['What is your ___? – I\'m Thai.', 'nationality', 'คุณสัญชาติอะไร – ฉันเป็นคนไทย'],
  ] },
  { f: [['nature', 'n', 'ธรรมชาติ'], ['natural', 'adj', 'ตามธรรมชาติ'], ['naturally', 'adv', 'โดยธรรมชาติ']], q: [
    ['Her hair is ___ curly.', 'naturally', 'ผมของเธอหยิกโดยธรรมชาติ'],
  ] },
  { f: [['power', 'n', 'พลัง, อำนาจ'], ['powerful', 'adj', 'ทรงพลัง'], ['powerless', 'adj', 'ไร้อำนาจ']], q: [
    ['This is a very ___ computer.', 'powerful', 'นี่เป็นคอมพิวเตอร์ที่แรงมาก'],
  ] },
  { f: [['science', 'n', 'วิทยาศาสตร์'], ['scientific', 'adj', 'ทางวิทยาศาสตร์'], ['scientist', 'n', 'นักวิทยาศาสตร์'], ['scientifically', 'adv', 'ในทางวิทยาศาสตร์']], q: [
    ['Marie Curie was a famous ___.', 'scientist', 'มารี คูรี เป็นนักวิทยาศาสตร์ที่มีชื่อเสียง'],
  ] },
  { f: [['strong', 'adj', 'แข็งแรง'], ['strength', 'n', 'ความแข็งแรง, จุดแข็ง'], ['strengthen', 'v', 'ทำให้แข็งแรงขึ้น'], ['strongly', 'adv', 'อย่างหนักแน่น']], q: [
    ['Swimming can ___ your back muscles.', 'strengthen', 'การว่ายน้ำช่วยให้กล้ามเนื้อหลังแข็งแรงขึ้น'],
    ['I ___ believe that everyone deserves a second chance.', 'strongly', 'ฉันเชื่ออย่างแรงกล้าว่าทุกคนควรได้รับโอกาสครั้งที่สอง'],
  ] },
  { f: [['long', 'adj', 'ยาว'], ['length', 'n', 'ความยาว'], ['lengthen', 'v', 'ทำให้ยาวขึ้น']], q: [
    ['What is the ___ of the bridge?', 'length', 'สะพานนี้ยาวเท่าไร'],
  ] },
  { f: [['wide', 'adj', 'กว้าง'], ['width', 'n', 'ความกว้าง'], ['widen', 'v', 'ขยายให้กว้าง'], ['widely', 'adv', 'อย่างกว้างขวาง']], q: [
    ['They plan to ___ the road next year.', 'widen', 'พวกเขาวางแผนจะขยายถนนปีหน้า'],
    ['English is ___ used in business.', 'widely', 'ภาษาอังกฤษใช้กันอย่างแพร่หลายในธุรกิจ'],
  ] },
  { f: [['deep', 'adj', 'ลึก'], ['depth', 'n', 'ความลึก'], ['deepen', 'v', 'ทำให้ลึกขึ้น'], ['deeply', 'adv', 'อย่างลึกซึ้ง']], q: [
    ['The ___ of the lake is about thirty metres.', 'depth', 'ทะเลสาบลึกประมาณสามสิบเมตร'],
  ] },
  { f: [['high', 'adj', 'สูง'], ['height', 'n', 'ความสูง'], ['highly', 'adv', 'อย่างมาก, ในระดับสูง']], q: [
    ['She is ___ respected by her team.', 'highly', 'เธอได้รับความเคารพอย่างมากจากทีม'],
    ['What is your ___? – About 165 centimetres.', 'height', 'คุณสูงเท่าไร – ประมาณ 165 เซนติเมตร'],
  ] },
  { f: [['weigh', 'v', 'ชั่งน้ำหนัก, หนัก'], ['weight', 'n', 'น้ำหนัก'], ['overweight', 'adj', 'น้ำหนักเกิน']], q: [
    ['How much does your suitcase ___?', 'weigh', 'กระเป๋าเดินทางของคุณหนักเท่าไร'],
  ] },
  { f: [['die', 'v', 'ตาย'], ['death', 'n', 'ความตาย'], ['dead', 'adj', 'ตายแล้ว'], ['deadly', 'adj', 'ร้ายแรงถึงตาย']], q: [
    ['The ___ of his dog made him very sad.', 'death', 'การตายของหมาทำให้เขาเศร้ามาก'],
    ['Some snakes carry a ___ poison.', 'deadly', 'งูบางชนิดมีพิษร้ายแรงถึงตาย'],
  ] },
  { f: [['live', 'v', 'อาศัย, มีชีวิต'], ['life', 'n', 'ชีวิต'], ['alive', 'adj', 'ยังมีชีวิตอยู่'], ['lively', 'adj', 'มีชีวิตชีวา']], q: [
    ['Is the fish still ___?', 'alive', 'ปลายังมีชีวิตอยู่ไหม'],
    ['The market is very ___ in the evening.', 'lively', 'ตลาดคึกคักมากตอนเย็น'],
  ] },
  { f: [['believe', 'v', 'เชื่อ'], ['belief', 'n', 'ความเชื่อ'], ['believable', 'adj', 'น่าเชื่อถือ']], q: [
    ['It is a common ___ that cats have nine lives.', 'belief', 'เป็นความเชื่อทั่วไปว่าแมวมีเก้าชีวิต'],
  ] },
  { f: [['prove', 'v', 'พิสูจน์'], ['proof', 'n', 'หลักฐาน'], ['proven', 'adj', 'ได้รับการพิสูจน์แล้ว']], q: [
    ['Do you have any ___ that he took the money?', 'proof', 'คุณมีหลักฐานไหมว่าเขาเอาเงินไป'],
  ] },
  { f: [['know', 'v', 'รู้'], ['knowledge', 'n', 'ความรู้'], ['knowledgeable', 'adj', 'รอบรู้']], q: [
    ['She has a good ___ of Thai history.', 'knowledge', 'เธอมีความรู้ดีเรื่องประวัติศาสตร์ไทย'],
  ] },
  { f: [['think', 'v', 'คิด'], ['thought', 'n', 'ความคิด'], ['thoughtful', 'adj', 'มีน้ำใจ, คิดถึงผู้อื่น'], ['thoughtfully', 'adv', 'อย่างครุ่นคิด']], q: [
    ['It was very ___ of you to bring flowers.', 'thoughtful', 'คุณมีน้ำใจมากที่เอาดอกไม้มาให้'],
  ] },
  { f: [['speak', 'v', 'พูด'], ['speech', 'n', 'สุนทรพจน์, คำพูด'], ['speaker', 'n', 'ผู้พูด, ลำโพง'], ['spoken', 'adj', 'ที่พูด, ภาษาพูด']], q: [
    ['The prime minister gave a ___ on TV.', 'speech', 'นายกรัฐมนตรีกล่าวสุนทรพจน์ทางทีวี'],
  ] },
  { f: [['sell', 'v', 'ขาย'], ['sale', 'n', 'การขาย'], ['seller', 'n', 'ผู้ขาย']], q: [
    ['Sorry, this painting is not for ___.', 'sale', 'ขอโทษ ภาพวาดนี้ไม่ได้มีไว้ขาย'],
  ] },
  { f: [['pay', 'v', 'จ่าย'], ['payment', 'n', 'การชำระเงิน'], ['paid', 'adj', 'ได้รับค่าจ้าง, จ่ายแล้ว']], q: [
    ['We accept ___ by card or cash.', 'payment', 'เรารับชำระเงินด้วยบัตรหรือเงินสด'],
  ] },
  { f: [['enjoy', 'v', 'สนุกกับ'], ['enjoyment', 'n', 'ความเพลิดเพลิน'], ['enjoyable', 'adj', 'สนุก, น่าเพลิดเพลิน']], q: [
    ['We had a very ___ evening.', 'enjoyable', 'เรามีค่ำคืนที่สนุกมาก'],
  ] },
  { f: [['agree', 'v', 'เห็นด้วย, ตกลง'], ['agreement', 'n', 'ข้อตกลง'], ['agreeable', 'adj', 'น่าพอใจ']], q: [
    ['The two companies signed an ___.', 'agreement', 'สองบริษัทเซ็นข้อตกลงกัน'],
  ] },
  { f: [['appear', 'v', 'ปรากฏ, ดูเหมือน'], ['appearance', 'n', 'รูปลักษณ์, การปรากฏตัว'], ['apparent', 'adj', 'ชัดเจน, เห็นได้ชัด'], ['apparently', 'adv', 'ได้ยินมาว่า, ดูเหมือน']], q: [
    ['The shop has ___ closed down.', 'apparently', 'ได้ยินมาว่าร้านนั้นปิดกิจการไปแล้ว'],
    ['Don\'t judge people by their ___.', 'appearance', 'อย่าตัดสินคนจากรูปลักษณ์'],
  ] },
  { f: [['attract', 'v', 'ดึงดูด'], ['attraction', 'n', 'สถานที่ท่องเที่ยว, แรงดึงดูด'], ['attractive', 'adj', 'น่าดึงดูด']], q: [
    ['The Grand Palace is a popular tourist ___.', 'attraction', 'พระบรมมหาราชวังเป็นสถานที่ท่องเที่ยวยอดนิยม'],
  ] },
  { f: [['compete', 'v', 'แข่งขัน'], ['competition', 'n', 'การแข่งขัน'], ['competitive', 'adj', 'ชอบแข่งขัน, มีการแข่งขันสูง'], ['competitor', 'n', 'คู่แข่ง']], q: [
    ['She won first prize in a singing ___.', 'competition', 'เธอได้รางวัลที่หนึ่งในการแข่งขันร้องเพลง'],
    ['Twenty teams will ___ in the final round.', 'compete', 'ยี่สิบทีมจะแข่งขันกันในรอบสุดท้าย'],
  ] },
  { f: [['connect', 'v', 'เชื่อมต่อ'], ['connection', 'n', 'การเชื่อมต่อ, ความเกี่ยวข้อง'], ['connected', 'adj', 'เชื่อมต่อแล้ว']], q: [
    ['The internet ___ is very slow today.', 'connection', 'วันนี้อินเทอร์เน็ตช้ามาก'],
  ] },
  { f: [['describe', 'v', 'บรรยาย'], ['description', 'n', 'คำบรรยาย'], ['descriptive', 'adj', 'เชิงพรรณนา']], q: [
    ['Can you give the police a ___ of the man?', 'description', 'คุณบอกลักษณะของผู้ชายคนนั้นให้ตำรวจได้ไหม'],
  ] },
  { f: [['destroy', 'v', 'ทำลาย'], ['destruction', 'n', 'ความเสียหาย, การทำลาย'], ['destructive', 'adj', 'ทำลายล้าง']], q: [
    ['The storm caused terrible ___.', 'destruction', 'พายุสร้างความเสียหายอย่างหนัก'],
  ] },
  { f: [['direct', 'adj/v', 'ตรง, กำกับ'], ['direction', 'n', 'ทิศทาง'], ['directly', 'adv', 'โดยตรง'], ['director', 'n', 'ผู้กำกับ, ผู้อำนวยการ']], q: [
    ['In which ___ is the station?', 'direction', 'สถานีอยู่ทางไหน'],
    ['This bus goes ___ to the airport.', 'directly', 'รถบัสคันนี้ไปสนามบินโดยตรง'],
  ] },
  { f: [['excite', 'v', 'ทำให้ตื่นเต้น'], ['excitement', 'n', 'ความตื่นเต้น'], ['excited', 'adj', '(คน) ตื่นเต้น'], ['exciting', 'adj', '(สิ่ง) น่าตื่นเต้น']], q: [
    ['The kids were too ___ to sleep.', 'excited', 'เด็กๆ ตื่นเต้นจนนอนไม่หลับ'],
    ['I couldn\'t hide my ___ when I got the job.', 'excitement', 'ฉันซ่อนความตื่นเต้นไม่อยู่ตอนได้งาน'],
  ] },
  { f: [['fame', 'n', 'ชื่อเสียง'], ['famous', 'adj', 'มีชื่อเสียง'], ['famously', 'adv', 'อย่างเป็นที่รู้กันดี']], q: [
    ['Chiang Mai is ___ for its night markets.', 'famous', 'เชียงใหม่ขึ้นชื่อเรื่องตลาดกลางคืน'],
  ] },
  { f: [['fortune', 'n', 'โชค, ทรัพย์สมบัติ'], ['fortunate', 'adj', 'โชคดี'], ['fortunately', 'adv', 'โชคดีที่']], q: [
    ['We were ___ to find a hotel room so late.', 'fortunate', 'เราโชคดีที่หาห้องพักได้ทั้งที่ดึกขนาดนั้น'],
  ] },
  { f: [['grow', 'v', 'เติบโต, ปลูก'], ['growth', 'n', 'การเติบโต'], ['grown', 'adj', 'โตแล้ว']], q: [
    ['The company has seen fast ___ this year.', 'growth', 'ปีนี้บริษัทเติบโตอย่างรวดเร็ว'],
  ] },
  { f: [['health', 'n', 'สุขภาพ'], ['healthy', 'adj', 'มีสุขภาพดี, ดีต่อสุขภาพ'], ['healthily', 'adv', 'อย่างถูกสุขลักษณะ']], q: [
    ['Try to eat more ___ food.', 'healthy', 'พยายามกินอาหารที่ดีต่อสุขภาพให้มากขึ้น'],
    ['Smoking is bad for your ___.', 'health', 'การสูบบุหรี่ไม่ดีต่อสุขภาพ'],
  ] },
  { f: [['hope', 'v/n', 'หวัง, ความหวัง'], ['hopeful', 'adj', 'มีความหวัง'], ['hopeless', 'adj', 'สิ้นหวัง, แย่มาก'], ['hopefully', 'adv', 'หวังว่า']], q: [
    ['We are ___ that the weather will improve.', 'hopeful', 'เรามีความหวังว่าอากาศจะดีขึ้น'],
    ['I\'m ___ at maths. I can\'t even add up!', 'hopeless', 'ฉันแย่มากเรื่องคณิตศาสตร์ บวกเลขยังไม่ได้เลย'],
  ] },
  { f: [['improve', 'v', 'ปรับปรุง, ดีขึ้น'], ['improvement', 'n', 'การพัฒนาขึ้น']], q: [
    ['There has been a big ___ in your writing.', 'improvement', 'งานเขียนของคุณพัฒนาขึ้นมาก'],
  ] },
  { f: [['lose', 'v', 'ทำหาย, แพ้'], ['loss', 'n', 'การสูญเสีย, ขาดทุน'], ['lost', 'adj', 'หลงทาง, หายไป'], ['loser', 'n', 'ผู้แพ้']], q: [
    ['The shop made a ___ of two million baht.', 'loss', 'ร้านขาดทุนสองล้านบาท'],
    ['Excuse me, I\'m ___. Where is the museum?', 'lost', 'ขอโทษค่ะ ฉันหลงทาง พิพิธภัณฑ์อยู่ที่ไหน'],
  ] },
  { f: [['marry', 'v', 'แต่งงานกับ'], ['marriage', 'n', 'การแต่งงาน, ชีวิตคู่'], ['married', 'adj', 'แต่งงานแล้ว']], q: [
    ['Are you ___ or single?', 'married', 'คุณแต่งงานแล้วหรือยังโสด'],
  ] },
  { f: [['memory', 'n', 'ความจำ, ความทรงจำ'], ['memorize', 'v', 'ท่องจำ'], ['memorable', 'adj', 'น่าจดจำ']], q: [
    ['It was a ___ trip that I\'ll never forget.', 'memorable', 'เป็นทริปที่น่าจดจำซึ่งฉันจะไม่มีวันลืม'],
    ['Actors have to ___ a lot of lines.', 'memorize', 'นักแสดงต้องท่องบทเยอะมาก'],
  ] },
  { f: [['music', 'n', 'ดนตรี'], ['musical', 'adj', 'เกี่ยวกับดนตรี'], ['musician', 'n', 'นักดนตรี']], q: [
    ['Her father is a famous jazz ___.', 'musician', 'พ่อของเธอเป็นนักดนตรีแจ๊สที่มีชื่อเสียง'],
  ] },
  { f: [['occasion', 'n', 'โอกาส, งาน'], ['occasional', 'adj', 'เป็นครั้งคราว'], ['occasionally', 'adv', 'บางครั้ง']], q: [
    ['I ___ eat fast food, but not often.', 'occasionally', 'ฉันกินฟาสต์ฟู้ดบ้างเป็นครั้งคราว แต่ไม่บ่อย'],
  ] },
  { f: [['operate', 'v', 'ผ่าตัด, ควบคุมเครื่อง'], ['operation', 'n', 'การผ่าตัด, การดำเนินงาน'], ['operator', 'n', 'ผู้ควบคุม, พนักงานรับสาย']], q: [
    ['He needs an ___ on his knee.', 'operation', 'เขาต้องผ่าตัดเข่า'],
  ] },
  { f: [['pollute', 'v', 'ทำให้เป็นมลพิษ'], ['pollution', 'n', 'มลพิษ'], ['polluted', 'adj', 'เป็นมลพิษ']], q: [
    ['Air ___ is a big problem in many cities.', 'pollution', 'มลพิษทางอากาศเป็นปัญหาใหญ่ในหลายเมือง'],
  ] },
  { f: [['possible', 'adj', 'เป็นไปได้'], ['possibility', 'n', 'ความเป็นไปได้'], ['possibly', 'adv', 'อาจจะ']], q: [
    ['Is there any ___ of rain tomorrow?', 'possibility', 'พรุ่งนี้มีโอกาสที่ฝนจะตกไหม'],
  ] },
  { f: [['prefer', 'v', 'ชอบมากกว่า'], ['preference', 'n', 'ความชอบ'], ['preferable', 'adj', 'ดีกว่า, น่าเลือกกว่า']], q: [
    ['Do you have a ___ for tea or coffee?', 'preference', 'คุณชอบชาหรือกาแฟมากกว่ากัน'],
  ] },
  { f: [['produce', 'v', 'ผลิต'], ['product', 'n', 'ผลิตภัณฑ์'], ['production', 'n', 'การผลิต'], ['productive', 'adj', 'ได้งานมาก, มีประสิทธิภาพ']], q: [
    ['We had a very ___ meeting and finished everything.', 'productive', 'เราประชุมได้งานมากและทำทุกอย่างเสร็จ'],
    ['Our factory can ___ five hundred cars a day.', 'produce', 'โรงงานของเราผลิตรถได้วันละห้าร้อยคัน'],
  ] },
  { f: [['protect', 'v', 'ปกป้อง'], ['protection', 'n', 'การป้องกัน'], ['protective', 'adj', 'ปกป้อง, หวงแหน']], q: [
    ['Wear sunglasses for ___ from the sun.', 'protection', 'ใส่แว่นกันแดดเพื่อป้องกันแสงแดด'],
  ] },
  { f: [['reason', 'n', 'เหตุผล'], ['reasonable', 'adj', 'สมเหตุสมผล, (ราคา) ไม่แพง'], ['reasonably', 'adv', 'ค่อนข้าง, อย่างมีเหตุผล']], q: [
    ['The prices at this restaurant are very ___.', 'reasonable', 'ราคาที่ร้านนี้สมเหตุสมผลมาก'],
  ] },
  { f: [['rely', 'v', 'พึ่งพา'], ['reliable', 'adj', 'เชื่อถือได้'], ['reliability', 'n', 'ความน่าเชื่อถือ']], q: [
    ['My old car is still very ___.', 'reliable', 'รถเก่าของฉันยังเชื่อถือได้มาก'],
    ['You can ___ on me.', 'rely', 'พึ่งฉันได้เลย'],
  ] },
  { f: [['respond', 'v', 'ตอบกลับ'], ['response', 'n', 'การตอบรับ'], ['responsive', 'adj', 'ตอบสนองดี']], q: [
    ['Please ___ to this email by Monday.', 'respond', 'กรุณาตอบกลับอีเมลนี้ภายในวันจันทร์'],
  ] },
  { f: [['responsible', 'adj', 'รับผิดชอบ'], ['responsibility', 'n', 'ความรับผิดชอบ'], ['responsibly', 'adv', 'อย่างมีความรับผิดชอบ']], q: [
    ['Taking care of a pet is a big ___.', 'responsibility', 'การเลี้ยงสัตว์เป็นความรับผิดชอบที่ใหญ่'],
  ] },
  { f: [['safe', 'adj', 'ปลอดภัย'], ['safety', 'n', 'ความปลอดภัย'], ['safely', 'adv', 'อย่างปลอดภัย']], q: [
    ['For your own ___, always wear a helmet.', 'safety', 'เพื่อความปลอดภัยของคุณเอง ใส่หมวกกันน็อกเสมอ'],
    ['The plane landed ___.', 'safely', 'เครื่องบินลงจอดอย่างปลอดภัย'],
  ] },
  { f: [['secure', 'adj/v', 'ปลอดภัย, มั่นคง'], ['security', 'n', 'การรักษาความปลอดภัย'], ['securely', 'adv', 'อย่างแน่นหนา']], q: [
    ['Airport ___ checks every bag.', 'security', 'เจ้าหน้าที่รักษาความปลอดภัยที่สนามบินตรวจทุกกระเป๋า'],
  ] },
  { f: [['silent', 'adj', 'เงียบ'], ['silence', 'n', 'ความเงียบ'], ['silently', 'adv', 'อย่างเงียบๆ']], q: [
    ['There was a long ___ after he spoke.', 'silence', 'หลังจากเขาพูดจบ ทุกอย่างเงียบไปนาน'],
  ] },
  { f: [['simple', 'adj', 'ง่าย, เรียบง่าย'], ['simplicity', 'n', 'ความเรียบง่าย'], ['simplify', 'v', 'ทำให้ง่ายขึ้น'], ['simply', 'adv', 'เพียงแค่, อย่างง่ายๆ']], q: [
    ['Can you ___ these instructions for the children?', 'simplify', 'ช่วยทำคำอธิบายให้ง่ายขึ้นสำหรับเด็กๆ ได้ไหม'],
  ] },
  { f: [['society', 'n', 'สังคม'], ['social', 'adj', 'ทางสังคม'], ['socially', 'adv', 'ในทางสังคม']], q: [
    ['She spends hours on ___ media every day.', 'social', 'เธอใช้เวลาหลายชั่วโมงบนโซเชียลมีเดียทุกวัน'],
  ] },
  { f: [['survive', 'v', 'รอดชีวิต'], ['survival', 'n', 'การอยู่รอด'], ['survivor', 'n', 'ผู้รอดชีวิต']], q: [
    ['There was only one ___ of the plane crash.', 'survivor', 'มีผู้รอดชีวิตจากเครื่องบินตกเพียงคนเดียว'],
  ] },
  { f: [['tradition', 'n', 'ประเพณี'], ['traditional', 'adj', 'ดั้งเดิม, ตามประเพณี'], ['traditionally', 'adv', 'ตามธรรมเนียม']], q: [
    ['We wore ___ Thai clothes at the festival.', 'traditional', 'เราใส่ชุดไทยในงานเทศกาล'],
  ] },
  { f: [['use', 'v/n', 'ใช้, การใช้'], ['useful', 'adj', 'มีประโยชน์'], ['useless', 'adj', 'ไร้ประโยชน์'], ['user', 'n', 'ผู้ใช้']], q: [
    ['This map is ___. It\'s twenty years old!', 'useless', 'แผนที่นี้ใช้ไม่ได้แล้ว มันอายุยี่สิบปี'],
  ] },
  { f: [['value', 'n', 'คุณค่า, มูลค่า'], ['valuable', 'adj', 'มีค่า'], ['invaluable', 'adj', 'มีค่ามหาศาล']], q: [
    ['Keep your ___ things in the hotel safe.', 'valuable', 'เก็บของมีค่าไว้ในตู้เซฟของโรงแรม'],
  ] },
  { f: [['violent', 'adj', 'รุนแรง'], ['violence', 'n', 'ความรุนแรง'], ['violently', 'adv', 'อย่างรุนแรง']], q: [
    ['The film has too much ___ for children.', 'violence', 'หนังเรื่องนี้มีความรุนแรงมากเกินไปสำหรับเด็ก'],
  ] },
  { f: [['warm', 'adj', 'อบอุ่น'], ['warmth', 'n', 'ความอบอุ่น'], ['warmly', 'adv', 'อย่างอบอุ่น']], q: [
    ['They welcomed us ___.', 'warmly', 'พวกเขาต้อนรับเราอย่างอบอุ่น'],
  ] },
  { f: [['wise', 'adj', 'ฉลาด, มีปัญญา'], ['wisdom', 'n', 'ปัญญา'], ['wisely', 'adv', 'อย่างชาญฉลาด']], q: [
    ['My grandmother is full of ___.', 'wisdom', 'คุณยายของฉันเปี่ยมไปด้วยปัญญา'],
  ] },
  { f: [['young', 'adj', 'อายุน้อย'], ['youth', 'n', 'วัยหนุ่มสาว'], ['youthful', 'adj', 'ดูอ่อนวัย']], q: [
    ['In his ___, he was a very fast runner.', 'youth', 'สมัยหนุ่มๆ เขาเป็นนักวิ่งที่เร็วมาก'],
  ] },
  { f: [['free', 'adj', 'อิสระ, ฟรี'], ['freedom', 'n', 'อิสรภาพ'], ['freely', 'adv', 'อย่างอิสระ']], q: [
    ['Everyone wants ___ of speech.', 'freedom', 'ทุกคนต้องการเสรีภาพในการพูด'],
  ] },
  { f: [['true', 'adj', 'จริง'], ['truth', 'n', 'ความจริง'], ['truly', 'adv', 'อย่างแท้จริง'], ['truthful', 'adj', 'ซื่อสัตย์, พูดความจริง']], q: [
    ['Please tell me the ___.', 'truth', 'บอกความจริงฉันมาเถอะ'],
  ] },
  { f: [['anger', 'n', 'ความโกรธ'], ['angry', 'adj', 'โกรธ'], ['angrily', 'adv', 'อย่างโกรธ']], q: [
    ['He shouted ___ at the other driver.', 'angrily', 'เขาตะโกนใส่คนขับอีกคันอย่างโมโห'],
  ] },
  { f: [['able', 'adj', 'สามารถ'], ['ability', 'n', 'ความสามารถ'], ['enable', 'v', 'ทำให้สามารถ']], q: [
    ['She has the ___ to learn languages quickly.', 'ability', 'เธอมีความสามารถเรียนภาษาได้เร็ว'],
    ['This app will ___ you to pay with your phone.', 'enable', 'แอปนี้จะช่วยให้คุณจ่ายเงินด้วยโทรศัพท์ได้'],
  ] },
  { f: [['accept', 'v', 'ยอมรับ'], ['acceptance', 'n', 'การยอมรับ'], ['acceptable', 'adj', 'ยอมรับได้']], q: [
    ['Being late every day is not ___.', 'acceptable', 'การมาสายทุกวันเป็นเรื่องที่ยอมรับไม่ได้'],
  ] },
  { f: [['achieve', 'v', 'บรรลุ'], ['achievement', 'n', 'ความสำเร็จ, ผลงาน'], ['achievable', 'adj', 'ทำให้สำเร็จได้']], q: [
    ['Winning the gold medal was a great ___.', 'achievement', 'การได้เหรียญทองเป็นความสำเร็จที่ยิ่งใหญ่'],
  ] },
  { f: [['act', 'v', 'ทำ, แสดง'], ['action', 'n', 'การกระทำ'], ['active', 'adj', 'กระฉับกระเฉง'], ['actively', 'adv', 'อย่างแข็งขัน']], q: [
    ['My grandmother is still very ___ at eighty.', 'active', 'คุณยายของฉันยังกระฉับกระเฉงมากตอนอายุแปดสิบ'],
    ['We need to take ___ now, before it\'s too late.', 'action', 'เราต้องลงมือทำตอนนี้ ก่อนจะสายเกินไป'],
  ] },
  { f: [['add', 'v', 'เพิ่ม'], ['addition', 'n', 'การเพิ่ม, การบวก'], ['additional', 'adj', 'เพิ่มเติม']], q: [
    ['There is an ___ charge for breakfast.', 'additional', 'มีค่าบริการเพิ่มเติมสำหรับอาหารเช้า'],
  ] },
  { f: [['admire', 'v', 'ชื่นชม'], ['admiration', 'n', 'ความชื่นชม'], ['admirable', 'adj', 'น่าชื่นชม']], q: [
    ['I have great ___ for nurses.', 'admiration', 'ฉันชื่นชมพยาบาลมาก'],
  ] },
  { f: [['advertise', 'v', 'โฆษณา'], ['advertisement', 'n', 'โฆษณา (ชิ้นหนึ่ง)'], ['advertising', 'n', 'ธุรกิจโฆษณา']], q: [
    ['I saw an ___ for this job online.', 'advertisement', 'ฉันเห็นประกาศรับสมัครงานนี้ทางออนไลน์'],
  ] },
  { f: [['advise', 'v', 'แนะนำ'], ['advice', 'n', 'คำแนะนำ'], ['adviser', 'n', 'ที่ปรึกษา'], ['advisable', 'adj', 'ควรทำ']], q: [
    ['Can you give me some ___?', 'advice', 'ขอคำแนะนำหน่อยได้ไหม'],
    ['I would ___ you to book early.', 'advise', 'ฉันแนะนำให้คุณจองแต่เนิ่นๆ'],
  ] },
  { f: [['announce', 'v', 'ประกาศ'], ['announcement', 'n', 'ประกาศ (คำนาม)'], ['announcer', 'n', 'ผู้ประกาศ']], q: [
    ['Please listen to the following ___.', 'announcement', 'กรุณาฟังประกาศต่อไปนี้'],
  ] },
  { f: [['apply', 'v', 'สมัคร'], ['application', 'n', 'ใบสมัคร, การสมัคร'], ['applicant', 'n', 'ผู้สมัคร']], q: [
    ['Fill in the ___ form online.', 'application', 'กรอกใบสมัครทางออนไลน์'],
    ['Each ___ will have a short interview.', 'applicant', 'ผู้สมัครแต่ละคนจะได้สัมภาษณ์สั้นๆ'],
  ] },
  { f: [['argue', 'v', 'เถียง'], ['argument', 'n', 'การทะเลาะ, ข้อโต้แย้ง'], ['arguably', 'adv', 'อาจพูดได้ว่า']], q: [
    ['They had an ___ about money.', 'argument', 'พวกเขาทะเลาะกันเรื่องเงิน'],
  ] },
  { f: [['assist', 'v', 'ช่วยเหลือ'], ['assistance', 'n', 'ความช่วยเหลือ'], ['assistant', 'n', 'ผู้ช่วย']], q: [
    ['Do you need any ___ with your bags?', 'assistance', 'ต้องการให้ช่วยถือกระเป๋าไหม'],
  ] },
  { f: [['bore', 'v', 'ทำให้เบื่อ'], ['boredom', 'n', 'ความเบื่อ'], ['bored', 'adj', '(คน) เบื่อ'], ['boring', 'adj', '(สิ่ง) น่าเบื่อ']], q: [
    ['I nearly died of ___ in that meeting.', 'boredom', 'ฉันแทบจะเบื่อตายในการประชุมนั้น'],
  ] },
  { f: [['breathe', 'v', 'หายใจ'], ['breath', 'n', 'ลมหายใจ'], ['breathless', 'adj', 'หอบ, หายใจไม่ทัน']], q: [
    ['Take a deep ___ and relax.', 'breath', 'หายใจเข้าลึกๆ แล้วผ่อนคลาย'],
    ['It\'s hard to ___ in this smoke.', 'breathe', 'หายใจลำบากในควันแบบนี้'],
  ] },
  { f: [['calm', 'adj', 'สงบ'], ['calmly', 'adv', 'อย่างสงบ'], ['calmness', 'n', 'ความสงบ']], q: [
    ['She spoke ___ even though she was afraid.', 'calmly', 'เธอพูดอย่างใจเย็นทั้งที่กลัว'],
  ] },
  { f: [['celebrate', 'v', 'ฉลอง'], ['celebration', 'n', 'งานฉลอง'], ['celebratory', 'adj', 'เพื่อการฉลอง']], q: [
    ['Let\'s go out tonight to ___ your new job!', 'celebrate', 'คืนนี้ออกไปฉลองงานใหม่ของเธอกัน'],
  ] },
  { f: [['certain', 'adj', 'แน่ใจ'], ['certainty', 'n', 'ความแน่นอน'], ['certainly', 'adv', 'แน่นอน']], q: [
    ['I will ___ come to your party.', 'certainly', 'ฉันไปงานปาร์ตี้ของเธอแน่นอน'],
  ] },
  { f: [['clear', 'adj', 'ชัดเจน'], ['clarity', 'n', 'ความชัดเจน'], ['clarify', 'v', 'ทำให้ชัดเจน, อธิบายเพิ่ม'], ['clearly', 'adv', 'อย่างชัดเจน']], q: [
    ['Could you ___ what you mean?', 'clarify', 'ช่วยอธิบายให้ชัดขึ้นได้ไหมว่าหมายถึงอะไร'],
    ['Please speak ___. I can\'t hear you.', 'clearly', 'กรุณาพูดให้ชัดๆ ฉันไม่ได้ยิน'],
  ] },
  { f: [['collect', 'v', 'สะสม, เก็บ'], ['collection', 'n', 'ของสะสม'], ['collector', 'n', 'นักสะสม']], q: [
    ['He has a large stamp ___.', 'collection', 'เขามีแสตมป์สะสมจำนวนมาก'],
  ] },
  { f: [['communicate', 'v', 'สื่อสาร'], ['communication', 'n', 'การสื่อสาร'], ['communicative', 'adj', 'ช่างพูดคุย, เน้นการสื่อสาร']], q: [
    ['Good ___ is important in a team.', 'communication', 'การสื่อสารที่ดีสำคัญในทีม'],
  ] },
  { f: [['compare', 'v', 'เปรียบเทียบ'], ['comparison', 'n', 'การเปรียบเทียบ'], ['comparative', 'adj', 'เชิงเปรียบเทียบ']], q: [
    ['In ___ with last year, sales are up.', 'comparison', 'เมื่อเทียบกับปีที่แล้ว ยอดขายเพิ่มขึ้น'],
  ] },
  { f: [['complete', 'adj/v', 'สมบูรณ์, ทำให้เสร็จ'], ['completion', 'n', 'การเสร็จสิ้น'], ['completely', 'adv', 'โดยสิ้นเชิง']], q: [
    ['I ___ forgot about the meeting.', 'completely', 'ฉันลืมเรื่องประชุมไปเลยสนิท'],
  ] },
  { f: [['confident', 'adj', 'มั่นใจ'], ['confidence', 'n', 'ความมั่นใจ'], ['confidently', 'adv', 'อย่างมั่นใจ']], q: [
    ['She answered all the questions ___.', 'confidently', 'เธอตอบทุกคำถามอย่างมั่นใจ'],
    ['Practice will give you more ___.', 'confidence', 'การฝึกจะทำให้คุณมั่นใจขึ้น'],
  ] },
  { f: [['confuse', 'v', 'ทำให้สับสน'], ['confusion', 'n', 'ความสับสน'], ['confused', 'adj', '(คน) สับสน'], ['confusing', 'adj', '(สิ่ง) ชวนสับสน']], q: [
    ['These instructions are really ___.', 'confusing', 'คำอธิบายนี้ชวนสับสนจริงๆ'],
  ] },
  { f: [['consider', 'v', 'พิจารณา'], ['consideration', 'n', 'การพิจารณา'], ['considerable', 'adj', 'มากพอสมควร'], ['considerate', 'adj', 'เกรงใจผู้อื่น']], q: [
    ['It was ___ of you to call before visiting.', 'considerate', 'คุณช่างเกรงใจที่โทรมาก่อนแวะมา'],
    ['The new road cost a ___ amount of money.', 'considerable', 'ถนนใหม่ใช้เงินไปจำนวนมาก'],
  ] },
  { f: [['continue', 'v', 'ทำต่อ'], ['continuous', 'adj', 'ต่อเนื่อง'], ['continuously', 'adv', 'อย่างต่อเนื่อง']], q: [
    ['It rained ___ for three days.', 'continuously', 'ฝนตกต่อเนื่องสามวัน'],
  ] },
  { f: [['culture', 'n', 'วัฒนธรรม'], ['cultural', 'adj', 'ทางวัฒนธรรม'], ['culturally', 'adv', 'ในทางวัฒนธรรม']], q: [
    ['Songkran is an important ___ festival.', 'cultural', 'สงกรานต์เป็นเทศกาลทางวัฒนธรรมที่สำคัญ'],
  ] },
  { f: [['curious', 'adj', 'อยากรู้อยากเห็น'], ['curiosity', 'n', 'ความอยากรู้'], ['curiously', 'adv', 'อย่างสงสัย']], q: [
    ['Cats are known for their ___.', 'curiosity', 'แมวขึ้นชื่อเรื่องความอยากรู้อยากเห็น'],
  ] },
  { f: [['defend', 'v', 'ปกป้อง'], ['defence', 'n', 'การป้องกัน'], ['defensive', 'adj', 'ตั้งรับ, ป้องกันตัว']], q: [
    ['The army is ready to ___ the country.', 'defend', 'กองทัพพร้อมปกป้องประเทศ'],
  ] },
  { f: [['depend', 'v', 'ขึ้นอยู่กับ, พึ่งพา'], ['dependent', 'adj', 'ต้องพึ่งพา'], ['dependence', 'n', 'การพึ่งพา'], ['dependable', 'adj', 'ไว้ใจได้']], q: [
    ['Young children are ___ on their parents.', 'dependent', 'เด็กเล็กต้องพึ่งพาพ่อแม่'],
  ] },
  { f: [['emotion', 'n', 'อารมณ์'], ['emotional', 'adj', 'ซาบซึ้ง, อ่อนไหว'], ['emotionally', 'adv', 'ทางอารมณ์']], q: [
    ['He got very ___ during his wedding speech.', 'emotional', 'เขาซาบซึ้งมากตอนกล่าวในงานแต่ง'],
  ] },
  { f: [['energy', 'n', 'พลังงาน'], ['energetic', 'adj', 'กระตือรือร้น, มีพลัง']], q: [
    ['The kids are so ___ in the morning.', 'energetic', 'เด็กๆ มีพลังเหลือเฟือตอนเช้า'],
  ] },
  { f: [['environment', 'n', 'สิ่งแวดล้อม'], ['environmental', 'adj', 'ด้านสิ่งแวดล้อม'], ['environmentally', 'adv', 'ในด้านสิ่งแวดล้อม']], q: [
    ['Plastic bags cause serious ___ problems.', 'environmental', 'ถุงพลาสติกก่อปัญหาสิ่งแวดล้อมร้ายแรง'],
  ] },
  { f: [['equal', 'adj', 'เท่ากัน'], ['equality', 'n', 'ความเท่าเทียม'], ['equally', 'adv', 'อย่างเท่าๆ กัน']], q: [
    ['Divide the cake ___ between the four of you.', 'equally', 'แบ่งเค้กให้เท่ากันสี่คน'],
  ] },
  { f: [['exist', 'v', 'มีอยู่'], ['existence', 'n', 'การมีอยู่'], ['existing', 'adj', 'ที่มีอยู่แล้ว']], q: [
    ['Do you believe in the ___ of ghosts?', 'existence', 'คุณเชื่อว่ามีผีอยู่จริงไหม'],
  ] },
  { f: [['fail', 'v', 'ล้มเหลว, สอบตก'], ['failure', 'n', 'ความล้มเหลว'], ['failed', 'adj', 'ที่ล้มเหลว']], q: [
    ['The plan was a complete ___.', 'failure', 'แผนนี้ล้มเหลวโดยสิ้นเชิง'],
  ] },
  { f: [['finance', 'n', 'การเงิน'], ['financial', 'adj', 'ทางการเงิน'], ['financially', 'adv', 'ในทางการเงิน']], q: [
    ['The company is in ___ trouble.', 'financial', 'บริษัทกำลังมีปัญหาทางการเงิน'],
  ] },
  { f: [['fly', 'v', 'บิน'], ['flight', 'n', 'เที่ยวบิน'], ['flyer', 'n', 'ผู้โดยสารเครื่องบิน, ใบปลิว']], q: [
    ['Our ___ to Tokyo leaves at nine.', 'flight', 'เที่ยวบินไปโตเกียวของเราออกตอนเก้าโมง'],
  ] },
  { f: [['govern', 'v', 'ปกครอง'], ['government', 'n', 'รัฐบาล'], ['governor', 'n', 'ผู้ว่าการ']], q: [
    ['The ___ announced new tax rules today.', 'government', 'รัฐบาลประกาศกฎภาษีใหม่วันนี้'],
  ] },
  { f: [['hate', 'v', 'เกลียด'], ['hatred', 'n', 'ความเกลียดชัง'], ['hateful', 'adj', 'น่าเกลียดชัง']], q: [
    ['He looked at the man with pure ___.', 'hatred', 'เขามองชายคนนั้นด้วยความเกลียดชัง'],
  ] },
  { f: [['hungry', 'adj', 'หิว'], ['hunger', 'n', 'ความหิว'], ['hungrily', 'adv', 'อย่างหิวโหย']], q: [
    ['The dog ate its dinner ___.', 'hungrily', 'หมากินข้าวเย็นอย่างหิวโหย'],
  ] },
  { f: [['important', 'adj', 'สำคัญ'], ['importance', 'n', 'ความสำคัญ'], ['importantly', 'adv', 'ที่สำคัญ']], q: [
    ['Never forget the ___ of sleep.', 'importance', 'อย่าลืมความสำคัญของการนอน'],
  ] },
  { f: [['independent', 'adj', 'เป็นอิสระ'], ['independence', 'n', 'อิสรภาพ, เอกราช'], ['independently', 'adv', 'อย่างอิสระ']], q: [
    ['She moved out at eighteen because she wanted ___.', 'independence', 'เธอย้ายออกตอนสิบแปดเพราะอยากมีอิสระ'],
  ] },
  { f: [['industry', 'n', 'อุตสาหกรรม'], ['industrial', 'adj', 'ทางอุตสาหกรรม']], q: [
    ['This is an ___ area with many factories.', 'industrial', 'นี่เป็นเขตอุตสาหกรรมที่มีโรงงานมากมาย'],
  ] },
  { f: [['intelligent', 'adj', 'ฉลาด'], ['intelligence', 'n', 'ความฉลาด'], ['intelligently', 'adv', 'อย่างฉลาด']], q: [
    ['Dolphins show great ___.', 'intelligence', 'โลมาแสดงให้เห็นถึงความฉลาดมาก'],
  ] },
  { f: [['introduce', 'v', 'แนะนำ (ให้รู้จัก)'], ['introduction', 'n', 'การแนะนำ, บทนำ'], ['introductory', 'adj', 'เบื้องต้น']], q: [
    ['Let me ___ myself. I\'m Nok.', 'introduce', 'ขอแนะนำตัวนะคะ ฉันชื่อนก'],
  ] },
  { f: [['invite', 'v', 'เชิญ'], ['invitation', 'n', 'คำเชิญ, การ์ดเชิญ'], ['inviting', 'adj', 'น่าดึงดูด, ชวนให้ลอง']], q: [
    ['Thanks for the ___ to your wedding.', 'invitation', 'ขอบคุณสำหรับการ์ดเชิญงานแต่งนะ'],
  ] },
  { f: [['kind', 'adj', 'ใจดี'], ['kindness', 'n', 'ความใจดี'], ['kindly', 'adv', 'อย่างใจดี, กรุณา']], q: [
    ['Thank you for your ___.', 'kindness', 'ขอบคุณสำหรับน้ำใจของคุณ'],
  ] },
  { f: [['luck', 'n', 'โชค'], ['lucky', 'adj', 'โชคดี'], ['luckily', 'adv', 'โชคดีที่']], q: [
    ['Good ___ in your exam!', 'luck', 'ขอให้โชคดีในการสอบนะ'],
  ] },
  { f: [['manage', 'v', 'จัดการ, บริหาร'], ['management', 'n', 'การบริหาร, ฝ่ายบริหาร'], ['manager', 'n', 'ผู้จัดการ'], ['manageable', 'adj', 'พอจัดการได้']], q: [
    ['I\'d like to speak to the ___, please.', 'manager', 'ขอคุยกับผู้จัดการหน่อยค่ะ'],
  ] },
  { f: [['mean', 'v', 'หมายถึง'], ['meaning', 'n', 'ความหมาย'], ['meaningful', 'adj', 'มีความหมาย'], ['meaningless', 'adj', 'ไร้ความหมาย']], q: [
    ['What is the ___ of this word?', 'meaning', 'คำนี้มีความหมายว่าอะไร'],
  ] },
  { f: [['modern', 'adj', 'ทันสมัย'], ['modernize', 'v', 'ปรับให้ทันสมัย'], ['modernization', 'n', 'การปรับให้ทันสมัย']], q: [
    ['The hotel plans to ___ all its rooms.', 'modernize', 'โรงแรมวางแผนปรับปรุงทุกห้องให้ทันสมัย'],
  ] },
  { f: [['necessary', 'adj', 'จำเป็น'], ['necessity', 'n', 'สิ่งจำเป็น'], ['necessarily', 'adv', 'เสมอไป, จำเป็นต้อง']], q: [
    ['Expensive things are not ___ better.', 'necessarily', 'ของแพงไม่จำเป็นต้องดีกว่าเสมอไป'],
  ] },
  { f: [['obey', 'v', 'เชื่อฟัง'], ['obedience', 'n', 'การเชื่อฟัง'], ['obedient', 'adj', 'ว่าง่าย, เชื่อฟัง']], q: [
    ['Our dog is very ___.', 'obedient', 'หมาของเราเชื่อฟังมาก'],
  ] },
  { f: [['offend', 'v', 'ทำให้ขุ่นเคือง'], ['offence', 'n', 'ความผิด, การล่วงเกิน'], ['offensive', 'adj', 'หยาบคาย, ไม่สุภาพ']], q: [
    ['I\'m sorry. I didn\'t mean to ___ you.', 'offend', 'ขอโทษนะ ฉันไม่ได้ตั้งใจทำให้คุณขุ่นเคือง'],
  ] },
  { f: [['organize', 'v', 'จัด, จัดระเบียบ'], ['organization', 'n', 'องค์กร'], ['organizer', 'n', 'ผู้จัดงาน'], ['organized', 'adj', 'มีระเบียบ']], q: [
    ['She works for a charity ___.', 'organization', 'เธอทำงานให้องค์กรการกุศล'],
    ['My desk is never very ___.', 'organized', 'โต๊ะของฉันไม่เคยเป็นระเบียบเลย'],
  ] },
  { f: [['patient', 'adj', 'อดทน'], ['patience', 'n', 'ความอดทน'], ['patiently', 'adv', 'อย่างอดทน']], q: [
    ['Teaching small kids needs a lot of ___.', 'patience', 'การสอนเด็กเล็กต้องใช้ความอดทนมาก'],
  ] },
  { f: [['perfect', 'adj', 'สมบูรณ์แบบ'], ['perfection', 'n', 'ความสมบูรณ์แบบ'], ['perfectly', 'adv', 'อย่างสมบูรณ์แบบ']], q: [
    ['The dress fits you ___.', 'perfectly', 'ชุดนี้พอดีกับคุณเป๊ะเลย'],
  ] },
  { f: [['permit', 'v', 'อนุญาต'], ['permission', 'n', 'การอนุญาต']], q: [
    ['You need ___ to park here.', 'permission', 'ต้องได้รับอนุญาตก่อนจอดรถที่นี่'],
  ] },
  { f: [['persuade', 'v', 'โน้มน้าว'], ['persuasion', 'n', 'การโน้มน้าว'], ['persuasive', 'adj', 'โน้มน้าวใจเก่ง']], q: [
    ['She gave a very ___ speech.', 'persuasive', 'เธอกล่าวสุนทรพจน์ได้น่าโน้มน้าวมาก'],
  ] },
  { f: [['please', 'v', 'ทำให้พอใจ'], ['pleasure', 'n', 'ความยินดี'], ['pleasant', 'adj', 'น่ารื่นรมย์'], ['pleased', 'adj', 'พอใจ, ยินดี']], q: [
    ['It\'s a ___ to meet you.', 'pleasure', 'ยินดีที่ได้รู้จัก'],
    ['We had a ___ walk by the river.', 'pleasant', 'เราเดินเล่นริมแม่น้ำอย่างเพลิดเพลิน'],
  ] },
  { f: [['poor', 'adj', 'ยากจน'], ['poverty', 'n', 'ความยากจน'], ['poorly', 'adv', 'ได้ไม่ดี']], q: [
    ['Many families still live in ___.', 'poverty', 'หลายครอบครัวยังอยู่ในความยากจน'],
  ] },
  { f: [['popular', 'adj', 'เป็นที่นิยม'], ['popularity', 'n', 'ความนิยม']], q: [
    ['The band\'s ___ grew quickly after the show.', 'popularity', 'วงดนตรีโด่งดังขึ้นอย่างรวดเร็วหลังการแสดง'],
  ] },
  { f: [['prepare', 'v', 'เตรียม'], ['preparation', 'n', 'การเตรียมตัว'], ['prepared', 'adj', 'พร้อม']], q: [
    ['A wedding needs months of ___.', 'preparation', 'งานแต่งต้องเตรียมการหลายเดือน'],
  ] },
  { f: [['proud', 'adj', 'ภูมิใจ'], ['pride', 'n', 'ความภาคภูมิใจ'], ['proudly', 'adv', 'อย่างภาคภูมิใจ']], q: [
    ['She showed us her medal ___.', 'proudly', 'เธออวดเหรียญให้เราดูอย่างภาคภูมิใจ'],
  ] },
  { f: [['qualify', 'v', 'มีคุณสมบัติ, ผ่านเข้ารอบ'], ['qualification', 'n', 'วุฒิ, คุณสมบัติ'], ['qualified', 'adj', 'มีคุณวุฒิ']], q: [
    ['She is a fully ___ nurse.', 'qualified', 'เธอเป็นพยาบาลที่มีคุณวุฒิครบถ้วน'],
  ] },
  { f: [['real', 'adj', 'จริง'], ['reality', 'n', 'ความเป็นจริง'], ['realize', 'v', 'ตระหนัก, รู้ตัว'], ['really', 'adv', 'จริงๆ']], q: [
    ['I didn\'t ___ it was so late.', 'realize', 'ฉันไม่รู้ตัวเลยว่าดึกขนาดนี้แล้ว'],
  ] },
  { f: [['recognize', 'v', 'จำได้'], ['recognition', 'n', 'การยอมรับ, การจำได้'], ['recognizable', 'adj', 'จำได้ง่าย']], q: [
    ['I didn\'t ___ you with short hair!', 'recognize', 'ฉันจำเธอไม่ได้เลยตอนผมสั้น'],
  ] },
  { f: [['reduce', 'v', 'ลด'], ['reduction', 'n', 'การลดลง'], ['reduced', 'adj', 'ลดลง, ลดราคา']], q: [
    ['There is a ten per cent ___ on all shoes.', 'reduction', 'รองเท้าทุกคู่ลดราคาสิบเปอร์เซ็นต์'],
  ] },
  { f: [['relax', 'v', 'ผ่อนคลาย'], ['relaxation', 'n', 'การพักผ่อน'], ['relaxed', 'adj', '(คน) สบายใจ'], ['relaxing', 'adj', '(สิ่ง) ทำให้ผ่อนคลาย']], q: [
    ['Yoga is good for ___.', 'relaxation', 'โยคะดีต่อการผ่อนคลาย'],
    ['A hot bath is very ___.', 'relaxing', 'การแช่น้ำอุ่นช่วยให้ผ่อนคลายมาก'],
  ] },
  { f: [['religion', 'n', 'ศาสนา'], ['religious', 'adj', 'เกี่ยวกับศาสนา, เคร่งศาสนา']], q: [
    ['My grandparents are very ___.', 'religious', 'ปู่ย่าของฉันเคร่งศาสนามาก'],
  ] },
  { f: [['repeat', 'v', 'ทำซ้ำ'], ['repetition', 'n', 'การทำซ้ำ'], ['repeatedly', 'adv', 'ซ้ำแล้วซ้ำเล่า'], ['repetitive', 'adj', 'ซ้ำซาก']], q: [
    ['I\'ve told you ___ not to do that!', 'repeatedly', 'ฉันบอกเธอซ้ำแล้วซ้ำเล่าว่าอย่าทำแบบนั้น'],
  ] },
  { f: [['sad', 'adj', 'เศร้า'], ['sadness', 'n', 'ความเศร้า'], ['sadly', 'adv', 'น่าเสียดายที่, อย่างเศร้า']], q: [
    ['There was great ___ when the old cinema closed.', 'sadness', 'ทุกคนเศร้ามากตอนโรงหนังเก่าปิดตัว'],
  ] },
  { f: [['satisfy', 'v', 'ทำให้พอใจ'], ['satisfaction', 'n', 'ความพึงพอใจ'], ['satisfied', 'adj', '(คน) พอใจ'], ['satisfactory', 'adj', 'เป็นที่น่าพอใจ']], q: [
    ['Customer ___ is our top goal.', 'satisfaction', 'ความพึงพอใจของลูกค้าคือเป้าหมายสูงสุดของเรา'],
  ] },
  { f: [['sense', 'n', 'ความรู้สึก, สามัญสำนึก'], ['sensible', 'adj', 'มีเหตุผล, รอบคอบ'], ['sensitive', 'adj', 'อ่อนไหว, แพ้ง่าย']], q: [
    ['My teeth are ___ to cold drinks.', 'sensitive', 'ฟันของฉันเสียวเวลาดื่มเครื่องดื่มเย็น'],
    ['Wearing a coat in this weather is ___.', 'sensible', 'การใส่เสื้อโค้ตในอากาศแบบนี้เป็นความคิดที่ดี'],
  ] },
  { f: [['serious', 'adj', 'จริงจัง, ร้ายแรง'], ['seriously', 'adv', 'อย่างจริงจัง'], ['seriousness', 'n', 'ความจริงจัง']], q: [
    ['You should take your health ___.', 'seriously', 'คุณควรใส่ใจสุขภาพอย่างจริงจัง'],
  ] },
  { f: [['short', 'adj', 'สั้น'], ['shortage', 'n', 'การขาดแคลน'], ['shorten', 'v', 'ทำให้สั้นลง'], ['shortly', 'adv', 'ในไม่ช้า']], q: [
    ['The doctor will see you ___.', 'shortly', 'คุณหมอจะตรวจคุณในอีกไม่ช้า'],
    ['There is a ___ of water during the dry season.', 'shortage', 'หน้าแล้งมีการขาดแคลนน้ำ'],
  ] },
  { f: [['sick', 'adj', 'ป่วย'], ['sickness', 'n', 'ความเจ็บป่วย, อาการคลื่นไส้']], q: [
    ['Some people suffer from travel ___ on boats.', 'sickness', 'บางคนมีอาการเมาเรือ'],
  ] },
  { f: [['skill', 'n', 'ทักษะ'], ['skilful', 'adj', 'ชำนาญ'], ['skilfully', 'adv', 'อย่างชำนาญ']], q: [
    ['Reading is an important ___ for every child.', 'skill', 'การอ่านเป็นทักษะสำคัญสำหรับเด็กทุกคน'],
  ] },
  { f: [['sleep', 'v/n', 'นอน, การนอน'], ['sleepy', 'adj', 'ง่วง'], ['asleep', 'adj', 'หลับอยู่']], q: [
    ['I always feel ___ after lunch.', 'sleepy', 'ฉันง่วงทุกทีหลังกินข้าวเที่ยง'],
    ['Be quiet! The baby is ___.', 'asleep', 'เงียบๆ หน่อย ลูกหลับอยู่'],
  ] },
  { f: [['strange', 'adj', 'แปลก'], ['stranger', 'n', 'คนแปลกหน้า'], ['strangely', 'adv', 'อย่างแปลกๆ']], q: [
    ['A ___ asked me for directions.', 'stranger', 'คนแปลกหน้าถามทางฉัน'],
  ] },
  { f: [['suspect', 'v/n', 'สงสัย, ผู้ต้องสงสัย'], ['suspicion', 'n', 'ความสงสัย'], ['suspicious', 'adj', 'น่าสงสัย']], q: [
    ['The police think his story is ___.', 'suspicious', 'ตำรวจคิดว่าเรื่องที่เขาเล่ามีพิรุธ'],
  ] },
  { f: [['sympathy', 'n', 'ความเห็นใจ'], ['sympathetic', 'adj', 'เห็นอกเห็นใจ'], ['sympathize', 'v', 'เห็นใจ']], q: [
    ['My boss was very ___ when my father was ill.', 'sympathetic', 'เจ้านายเห็นใจมากตอนพ่อฉันป่วย'],
  ] },
  { f: [['tolerate', 'v', 'ทน'], ['tolerance', 'n', 'ความอดกลั้น'], ['tolerant', 'adj', 'ใจกว้าง, อดทนต่อ']], q: [
    ['I can\'t ___ this noise any longer.', 'tolerate', 'ฉันทนเสียงนี้ต่อไปไม่ไหวแล้ว'],
  ] },
  { f: [['vary', 'v', 'แตกต่างกันไป'], ['variety', 'n', 'ความหลากหลาย'], ['various', 'adj', 'หลากหลาย'], ['variable', 'adj', 'ไม่คงที่']], q: [
    ['The shop sells a wide ___ of fruit.', 'variety', 'ร้านนี้ขายผลไม้หลากหลายชนิด'],
    ['Prices ___ from shop to shop.', 'vary', 'ราคาแตกต่างกันไปในแต่ละร้าน'],
  ] },
  { f: [['weak', 'adj', 'อ่อนแอ'], ['weakness', 'n', 'จุดอ่อน'], ['weaken', 'v', 'ทำให้อ่อนแอ']], q: [
    ['Chocolate is my biggest ___.', 'weakness', 'ช็อกโกแลตคือจุดอ่อนที่สุดของฉัน'],
  ] },
  { f: [['write', 'v', 'เขียน'], ['writer', 'n', 'นักเขียน'], ['written', 'adj', 'เป็นลายลักษณ์อักษร']], q: [
    ['Please give your answer in ___ form.', 'written', 'กรุณาตอบเป็นลายลักษณ์อักษร'],
  ] },
  { f: [['fear', 'n/v', 'ความกลัว, กลัว'], ['fearful', 'adj', 'หวาดกลัว'], ['fearless', 'adj', 'ไม่กลัวอะไร']], q: [
    ['The ___ firefighter ran into the burning house.', 'fearless', 'นักดับเพลิงผู้ไม่หวั่นเกรงวิ่งเข้าไปในบ้านที่ไฟไหม้'],
  ] },
  { f: [['peace', 'n', 'สันติภาพ, ความสงบ'], ['peaceful', 'adj', 'สงบ'], ['peacefully', 'adv', 'อย่างสงบ']], q: [
    ['The baby is sleeping ___.', 'peacefully', 'ทารกกำลังหลับอย่างสงบ'],
  ] },
  { f: [['wonder', 'v/n', 'สงสัย, สิ่งมหัศจรรย์'], ['wonderful', 'adj', 'ยอดเยี่ยม'], ['wonderfully', 'adv', 'อย่างยอดเยี่ยม']], q: [
    ['We had a ___ holiday in Krabi.', 'wonderful', 'เราไปเที่ยวกระบี่กันอย่างยอดเยี่ยม'],
  ] },
  { f: [['tire', 'v', 'ทำให้เหนื่อย'], ['tired', 'adj', '(คน) เหนื่อย'], ['tiring', 'adj', '(สิ่ง) ทำให้เหนื่อย']], q: [
    ['Moving house is very ___.', 'tiring', 'การย้ายบ้านเหนื่อยมาก'],
  ] },
  { f: [['worry', 'v/n', 'กังวล, ความกังวล'], ['worried', 'adj', '(คน) กังวล'], ['worrying', 'adj', '(สิ่ง) น่ากังวล']], q: [
    ['Mum is ___ because my brother isn\'t home yet.', 'worried', 'แม่กังวลเพราะพี่ชายยังไม่กลับบ้าน'],
  ] },
  { f: [['surprise', 'n/v', 'ความประหลาดใจ, ทำให้แปลกใจ'], ['surprised', 'adj', '(คน) ประหลาดใจ'], ['surprising', 'adj', '(สิ่ง) น่าประหลาดใจ'], ['surprisingly', 'adv', 'อย่างน่าประหลาดใจ']], q: [
    ['The test was ___ easy.', 'surprisingly', 'ข้อสอบง่ายอย่างน่าประหลาดใจ'],
  ] },
  { f: [['embarrass', 'v', 'ทำให้อาย'], ['embarrassed', 'adj', '(คน) อาย'], ['embarrassing', 'adj', '(สิ่ง) น่าอาย'], ['embarrassment', 'n', 'ความอับอาย']], q: [
    ['I fell over in front of everyone. It was so ___!', 'embarrassing', 'ฉันล้มต่อหน้าทุกคน น่าอายสุดๆ'],
  ] },
  { f: [['disappoint', 'v', 'ทำให้ผิดหวัง'], ['disappointed', 'adj', '(คน) ผิดหวัง'], ['disappointing', 'adj', '(สิ่ง) น่าผิดหวัง'], ['disappointment', 'n', 'ความผิดหวัง']], q: [
    ['She was ___ with her exam results.', 'disappointed', 'เธอผิดหวังกับผลสอบ'],
  ] },
  { f: [['amaze', 'v', 'ทำให้ทึ่ง'], ['amazed', 'adj', '(คน) ทึ่ง'], ['amazing', 'adj', '(สิ่ง) น่าทึ่ง'], ['amazingly', 'adv', 'อย่างน่าทึ่ง']], q: [
    ['The view from the top was ___.', 'amazing', 'วิวจากข้างบนสวยน่าทึ่งมาก'],
  ] },
  { f: [['interest', 'n/v', 'ความสนใจ'], ['interested', 'adj', '(คน) สนใจ'], ['interesting', 'adj', '(สิ่ง) น่าสนใจ']], q: [
    ['Are you ___ in joining our club?', 'interested', 'คุณสนใจเข้าชมรมของเราไหม'],
  ] },
  { f: [['frighten', 'v', 'ทำให้กลัว'], ['frightened', 'adj', '(คน) กลัว'], ['frightening', 'adj', '(สิ่ง) น่ากลัว']], q: [
    ['The film was so ___ that I closed my eyes.', 'frightening', 'หนังน่ากลัวมากจนฉันต้องหลับตา'],
  ] },
  { f: [['shock', 'n/v', 'ความตกใจ'], ['shocked', 'adj', '(คน) ตกใจ'], ['shocking', 'adj', '(สิ่ง) น่าตกใจ']], q: [
    ['We were ___ to hear the news.', 'shocked', 'เราตกใจเมื่อได้ยินข่าว'],
  ] },
  { f: [['annoy', 'v', 'ทำให้รำคาญ'], ['annoyed', 'adj', '(คน) รำคาญ'], ['annoying', 'adj', '(สิ่ง) น่ารำคาญ']], q: [
    ['That noise is really ___.', 'annoying', 'เสียงนั่นน่ารำคาญจริงๆ'],
  ] },
  { f: [['depress', 'v', 'ทำให้หดหู่'], ['depressed', 'adj', '(คน) หดหู่'], ['depressing', 'adj', '(สิ่ง) ชวนหดหู่'], ['depression', 'n', 'ภาวะซึมเศร้า']], q: [
    ['Rainy Mondays are so ___.', 'depressing', 'วันจันทร์ที่ฝนตกช่างชวนหดหู่'],
  ] },
  { f: [['similar', 'adj', 'คล้ายกัน'], ['similarity', 'n', 'ความคล้ายคลึง'], ['similarly', 'adv', 'ในทำนองเดียวกัน']], q: [
    ['There is a strong ___ between the two sisters.', 'similarity', 'สองพี่น้องหน้าตาคล้ายกันมาก'],
  ] },
  { f: [['personal', 'adj', 'ส่วนตัว'], ['personality', 'n', 'บุคลิกภาพ'], ['personally', 'adv', 'โดยส่วนตัว']], q: [
    ['She has a really warm ___.', 'personality', 'เธอมีบุคลิกที่อบอุ่นมาก'],
  ] },
  { f: [['efficient', 'adj', 'มีประสิทธิภาพ'], ['efficiency', 'n', 'ประสิทธิภาพ'], ['efficiently', 'adv', 'อย่างมีประสิทธิภาพ']], q: [
    ['This new machine works very ___.', 'efficiently', 'เครื่องใหม่นี้ทำงานได้อย่างมีประสิทธิภาพมาก'],
  ] },
  { f: [['accurate', 'adj', 'แม่นยำ'], ['accuracy', 'n', 'ความแม่นยำ'], ['accurately', 'adv', 'อย่างแม่นยำ']], q: [
    ['The ___ of the weather forecast has improved.', 'accuracy', 'ความแม่นยำของพยากรณ์อากาศดีขึ้น'],
  ] },
  { f: [['private', 'adj', 'ส่วนตัว, เอกชน'], ['privacy', 'n', 'ความเป็นส่วนตัว'], ['privately', 'adv', 'เป็นการส่วนตัว']], q: [
    ['Please respect my ___.', 'privacy', 'กรุณาเคารพความเป็นส่วนตัวของฉัน'],
  ] },
  { f: [['public', 'adj/n', 'สาธารณะ'], ['publicity', 'n', 'การประชาสัมพันธ์'], ['publicly', 'adv', 'ต่อหน้าสาธารณะ']], q: [
    ['He ___ said sorry on live TV.', 'publicly', 'เขาขอโทษต่อสาธารณะทางทีวีสด'],
  ] },
  { f: [['origin', 'n', 'ต้นกำเนิด'], ['original', 'adj', 'ดั้งเดิม, แปลกใหม่'], ['originally', 'adv', 'แต่เดิม'], ['originate', 'v', 'มีต้นกำเนิด']], q: [
    ['My family ___ came from China.', 'originally', 'แต่เดิมครอบครัวฉันมาจากจีน'],
  ] },
  { f: [['centre', 'n', 'ศูนย์กลาง'], ['central', 'adj', 'ใจกลาง'], ['centrally', 'adv', 'ตรงกลาง']], q: [
    ['The hotel is in ___ Bangkok, near the shops.', 'central', 'โรงแรมอยู่ใจกลางกรุงเทพฯ ใกล้ร้านค้า'],
  ] },
  { f: [['tour', 'n/v', 'ทัวร์, เที่ยว'], ['tourist', 'n', 'นักท่องเที่ยว'], ['tourism', 'n', 'การท่องเที่ยว']], q: [
    ['The island depends on ___ for most of its income.', 'tourism', 'เกาะนี้มีรายได้ส่วนใหญ่จากการท่องเที่ยว'],
  ] },
  { f: [['photograph', 'n', 'รูปถ่าย'], ['photographer', 'n', 'ช่างภาพ'], ['photography', 'n', 'การถ่ายภาพ'], ['photographic', 'adj', 'เกี่ยวกับการถ่ายภาพ']], q: [
    ['We hired a ___ for our wedding.', 'photographer', 'เราจ้างช่างภาพมาถ่ายงานแต่ง'],
  ] },
  { f: [['art', 'n', 'ศิลปะ'], ['artist', 'n', 'ศิลปิน'], ['artistic', 'adj', 'มีหัวศิลปะ']], q: [
    ['Her son is very ___ and loves painting.', 'artistic', 'ลูกชายเธอมีหัวศิลปะมากและชอบวาดภาพ'],
  ] },
  { f: [['politics', 'n', 'การเมือง'], ['political', 'adj', 'ทางการเมือง'], ['politician', 'n', 'นักการเมือง']], q: [
    ['He wants to become a ___ one day.', 'politician', 'เขาอยากเป็นนักการเมืองสักวัน'],
  ] },
  { f: [['crime', 'n', 'อาชญากรรม'], ['criminal', 'n/adj', 'อาชญากร'], ['criminally', 'adv', 'ทางอาญา']], q: [
    ['The police caught the ___ at the airport.', 'criminal', 'ตำรวจจับอาชญากรได้ที่สนามบิน'],
  ] },
  { f: [['medicine', 'n', 'ยา, การแพทย์'], ['medical', 'adj', 'ทางการแพทย์'], ['medically', 'adv', 'ในทางการแพทย์']], q: [
    ['She is studying at ___ school to become a doctor.', 'medical', 'เธอเรียนแพทย์เพื่อจะเป็นหมอ'],
  ] },
  { f: [['nerve', 'n', 'เส้นประสาท, ความกล้า'], ['nervous', 'adj', 'ประหม่า'], ['nervously', 'adv', 'อย่างประหม่า'], ['nervousness', 'n', 'ความประหม่า']], q: [
    ['I always feel ___ before a job interview.', 'nervous', 'ฉันประหม่าทุกครั้งก่อนสัมภาษณ์งาน'],
  ] },
  { f: [['honest', 'adj', 'ซื่อสัตย์'], ['honesty', 'n', 'ความซื่อสัตย์'], ['honestly', 'adv', 'พูดตามตรง']], q: [
    ['I believe ___ is the best policy.', 'honesty', 'ฉันเชื่อว่าความซื่อสัตย์เป็นนโยบายที่ดีที่สุด'],
  ] },
  { f: [['fit', 'adj/v', 'ฟิต, พอดี'], ['fitness', 'n', 'ความฟิต, สมรรถภาพ']], q: [
    ['She goes to a ___ class three times a week.', 'fitness', 'เธอไปคลาสออกกำลังกายสัปดาห์ละสามครั้ง'],
  ] },
  { f: [['clean', 'adj/v', 'สะอาด, ทำความสะอาด'], ['cleaner', 'n', 'พนักงานทำความสะอาด, น้ำยาทำความสะอาด'], ['cleanliness', 'n', 'ความสะอาด']], q: [
    ['The hotel is famous for its ___.', 'cleanliness', 'โรงแรมนี้ขึ้นชื่อเรื่องความสะอาด'],
  ] },
  { f: [['dark', 'adj', 'มืด'], ['darkness', 'n', 'ความมืด'], ['darken', 'v', 'ทำให้มืดลง']], q: [
    ['The room was in complete ___.', 'darkness', 'ห้องมืดสนิท'],
  ] },
  { f: [['bright', 'adj', 'สว่าง, สดใส'], ['brightly', 'adv', 'อย่างสว่างไสว'], ['brightness', 'n', 'ความสว่าง'], ['brighten', 'v', 'ทำให้สดใสขึ้น']], q: [
    ['The sun was shining ___.', 'brightly', 'แดดส่องจ้า'],
  ] },
  { f: [['loud', 'adj', 'ดัง'], ['loudly', 'adv', 'อย่างเสียงดัง'], ['loudness', 'n', 'ความดัง']], q: [
    ['Please don\'t talk so ___ in the library.', 'loudly', 'กรุณาอย่าพูดเสียงดังในห้องสมุด'],
  ] },
  { f: [['easy', 'adj', 'ง่าย'], ['easily', 'adv', 'อย่างง่ายดาย'], ['ease', 'n', 'ความง่าย, ความสบาย']], q: [
    ['She won the race ___.', 'easily', 'เธอชนะการแข่งขันได้อย่างง่ายดาย'],
  ] },
  { f: [['heavy', 'adj', 'หนัก'], ['heavily', 'adv', 'อย่างหนัก']], q: [
    ['It rained ___ all night.', 'heavily', 'ฝนตกหนักทั้งคืน'],
  ] },
  { f: [['quick', 'adj', 'เร็ว'], ['quickly', 'adv', 'อย่างรวดเร็ว']], q: [
    ['Come ___! The bus is leaving!', 'quickly', 'มาเร็ว รถบัสจะออกแล้ว'],
  ] },
  { f: [['rude', 'adj', 'หยาบคาย'], ['rudely', 'adv', 'อย่างหยาบคาย'], ['rudeness', 'n', 'ความหยาบคาย']], q: [
    ['I\'m sorry for my ___ yesterday.', 'rudeness', 'ขอโทษสำหรับความหยาบคายเมื่อวานนะ'],
  ] },
  { f: [['polite', 'adj', 'สุภาพ'], ['politely', 'adv', 'อย่างสุภาพ'], ['politeness', 'n', 'ความสุภาพ']], q: [
    ['He asked ___ if he could sit down.', 'politely', 'เขาถามอย่างสุภาพว่านั่งได้ไหม'],
  ] },
  { f: [['generous', 'adj', 'ใจกว้าง'], ['generosity', 'n', 'ความใจกว้าง'], ['generously', 'adv', 'อย่างใจกว้าง']], q: [
    ['Thank you for your ___.', 'generosity', 'ขอบคุณที่ใจกว้างนะ'],
  ] },
  { f: [['brave', 'adj', 'กล้าหาญ'], ['bravery', 'n', 'ความกล้าหาญ'], ['bravely', 'adv', 'อย่างกล้าหาญ']], q: [
    ['The soldier received a medal for ___.', 'bravery', 'ทหารได้รับเหรียญจากความกล้าหาญ'],
  ] },
  { f: [['lazy', 'adj', 'ขี้เกียจ'], ['laziness', 'n', 'ความขี้เกียจ'], ['lazily', 'adv', 'อย่างเกียจคร้าน']], q: [
    ['The cat lay ___ in the sun.', 'lazily', 'แมวนอนเอกเขนกอยู่กลางแดด'],
  ] },
  { f: [['ill', 'adj', 'ป่วย'], ['illness', 'n', 'ความเจ็บป่วย']], q: [
    ['He missed a month of school because of ___.', 'illness', 'เขาขาดเรียนไปหนึ่งเดือนเพราะป่วย'],
  ] },
  { f: [['lonely', 'adj', 'เหงา'], ['loneliness', 'n', 'ความเหงา'], ['alone', 'adj/adv', 'ตามลำพัง']], q: [
    ['Many old people suffer from ___.', 'loneliness', 'ผู้สูงอายุหลายคนทุกข์ทรมานจากความเหงา'],
  ] },
  { f: [['dirt', 'n', 'สิ่งสกปรก, ฝุ่นดิน'], ['dirty', 'adj', 'สกปรก']], q: [
    ['Take off your ___ shoes before you come in.', 'dirty', 'ถอดรองเท้าสกปรกก่อนเข้ามานะ'],
  ] },
  { f: [['noise', 'n', 'เสียงดัง'], ['noisy', 'adj', 'เสียงดัง, อึกทึก'], ['noisily', 'adv', 'อย่างเสียงดัง']], q: [
    ['Our neighbours are very ___ at night.', 'noisy', 'เพื่อนบ้านเราเสียงดังมากตอนกลางคืน'],
  ] },
  { f: [['rain', 'n/v', 'ฝน, ฝนตก'], ['rainy', 'adj', 'ฝนตกชุก']], q: [
    ['The ___ season starts in May.', 'rainy', 'ฤดูฝนเริ่มเดือนพฤษภาคม'],
  ] },
  { f: [['sun', 'n', 'ดวงอาทิตย์'], ['sunny', 'adj', 'แดดจ้า']], q: [
    ['It\'s a lovely ___ day.', 'sunny', 'วันนี้แดดดีน่าออกไปเที่ยว'],
  ] },
  { f: [['fog', 'n', 'หมอก'], ['foggy', 'adj', 'มีหมอกลง']], q: [
    ['Drive slowly. It\'s very ___ this morning.', 'foggy', 'ขับช้าๆ นะ เช้านี้หมอกลงจัด'],
  ] },
  { f: [['taste', 'n/v', 'รสชาติ, ชิม'], ['tasty', 'adj', 'อร่อย'], ['tasteless', 'adj', 'จืดชืด']], q: [
    ['This soup is really ___!', 'tasty', 'ซุปนี้อร่อยจริงๆ'],
  ] },
  { f: [['salt', 'n', 'เกลือ'], ['salty', 'adj', 'เค็ม']], q: [
    ['These chips are too ___.', 'salty', 'มันฝรั่งทอดนี้เค็มเกินไป'],
  ] },
  { f: [['addict', 'n', 'ผู้ติด (ยา, เกม)'], ['addicted', 'adj', 'ติด, เสพติด'], ['addiction', 'n', 'การเสพติด'], ['addictive', 'adj', 'ทำให้ติด']], q: [
    ['This game is really ___. I can\'t stop playing!', 'addictive', 'เกมนี้ติดงอมแงม เลิกเล่นไม่ได้เลย'],
  ] },
  { f: [['access', 'n/v', 'การเข้าถึง'], ['accessible', 'adj', 'เข้าถึงได้']], q: [
    ['The museum is ___ to wheelchair users.', 'accessible', 'พิพิธภัณฑ์นี้รถเข็นเข้าได้'],
  ] },
  { f: [['occupy', 'v', 'ครอบครอง, ใช้พื้นที่'], ['occupation', 'n', 'อาชีพ'], ['occupied', 'adj', 'มีคนใช้อยู่, ไม่ว่าง']], q: [
    ['Please write your name and ___ on the form.', 'occupation', 'กรุณาเขียนชื่อและอาชีพลงในแบบฟอร์ม'],
    ['Sorry, this seat is ___.', 'occupied', 'ขอโทษค่ะ ที่นั่งนี้มีคนนั่งแล้ว'],
  ] },
  { f: [['observe', 'v', 'สังเกต'], ['observation', 'n', 'การสังเกต'], ['observant', 'adj', 'ช่างสังเกต']], q: [
    ['Detectives must be very ___.', 'observant', 'นักสืบต้องช่างสังเกตมาก'],
  ] },
  { f: [['inspire', 'v', 'สร้างแรงบันดาลใจ'], ['inspiration', 'n', 'แรงบันดาลใจ'], ['inspiring', 'adj', 'สร้างแรงบันดาลใจ']], q: [
    ['Her story is a real ___ to young women.', 'inspiration', 'เรื่องราวของเธอเป็นแรงบันดาลใจให้ผู้หญิงรุ่นใหม่'],
  ] },
  { f: [['motive', 'n', 'แรงจูงใจ (ในการก่อเหตุ)'], ['motivate', 'v', 'จูงใจ'], ['motivation', 'n', 'แรงจูงใจ'], ['motivated', 'adj', 'มีแรงจูงใจ']], q: [
    ['Good teachers know how to ___ their students.', 'motivate', 'ครูที่ดีรู้วิธีจูงใจนักเรียน'],
  ] },
  { f: [['predict', 'v', 'ทำนาย'], ['prediction', 'n', 'การทำนาย'], ['predictable', 'adj', 'คาดเดาได้']], q: [
    ['The ending of the film was very ___.', 'predictable', 'ตอนจบของหนังเดาง่ายมาก'],
  ] },
  { f: [['vision', 'n', 'การมองเห็น, วิสัยทัศน์'], ['visible', 'adj', 'มองเห็นได้'], ['visual', 'adj', 'ทางการมองเห็น'], ['visibility', 'n', 'ทัศนวิสัย']], q: [
    ['The mountain is ___ from my window.', 'visible', 'มองเห็นภูเขาได้จากหน้าต่างห้องฉัน'],
  ] },
  { f: [['flex', 'v', 'งอ (กล้ามเนื้อ)'], ['flexible', 'adj', 'ยืดหยุ่น'], ['flexibility', 'n', 'ความยืดหยุ่น']], q: [
    ['My working hours are quite ___.', 'flexible', 'เวลาทำงานของฉันค่อนข้างยืดหยุ่น'],
  ] },
  { f: [['attend', 'v', 'เข้าร่วม'], ['attendance', 'n', 'การเข้าเรียน, การมาร่วม'], ['attendee', 'n', 'ผู้เข้าร่วม']], q: [
    ['More than 300 people will ___ the conference.', 'attend', 'จะมีคนมาร่วมงานประชุมมากกว่า 300 คน'],
  ] },
  { f: [['behave', 'v', 'ประพฤติ'], ['behaviour', 'n', 'พฤติกรรม']], q: [
    ['The children\'s ___ was excellent today.', 'behaviour', 'วันนี้เด็กๆ ประพฤติตัวดีมาก'],
  ] },
  { f: [['choose', 'v', 'เลือก'], ['choice', 'n', 'ตัวเลือก, การเลือก'], ['choosy', 'adj', 'เลือกมาก, จู้จี้']], q: [
    ['You have no ___. You must go.', 'choice', 'เธอไม่มีทางเลือก ต้องไปแล้ว'],
  ] },
  { f: [['explain', 'v', 'อธิบาย'], ['explanation', 'n', 'คำอธิบาย']], q: [
    ['Is there any ___ for the delay?', 'explanation', 'มีคำอธิบายไหมว่าทำไมล่าช้า'],
  ] },
  { f: [['suggest', 'v', 'แนะนำ, เสนอ'], ['suggestion', 'n', 'ข้อเสนอแนะ']], q: [
    ['Can I make a ___? Let\'s take a taxi.', 'suggestion', 'ขอเสนออะไรหน่อยได้ไหม นั่งแท็กซี่กันเถอะ'],
  ] },
  { f: [['solve', 'v', 'แก้ (ปัญหา)'], ['solution', 'n', 'ทางแก้']], q: [
    ['We need to find a ___ quickly.', 'solution', 'เราต้องหาทางแก้โดยเร็ว'],
  ] },
  { f: [['arrive', 'v', 'มาถึง'], ['arrival', 'n', 'การมาถึง']], q: [
    ['Please wait in the ___ hall.', 'arrival', 'กรุณารอที่โถงผู้โดยสารขาเข้า'],
  ] },
  { f: [['refuse', 'v', 'ปฏิเสธ'], ['refusal', 'n', 'การปฏิเสธ']], q: [
    ['I can\'t ___ such a kind offer.', 'refuse', 'ฉันปฏิเสธข้อเสนอที่ใจดีขนาดนี้ไม่ได้'],
  ] },
  { f: [['deliver', 'v', 'ส่ง (ของ)'], ['delivery', 'n', 'การจัดส่ง']], q: [
    ['Is ___ free if I order online?', 'delivery', 'ถ้าสั่งออนไลน์ส่งฟรีไหม'],
  ] },
  { f: [['discover', 'v', 'ค้นพบ'], ['discovery', 'n', 'การค้นพบ']], q: [
    ['Scientists made an exciting ___ in the cave.', 'discovery', 'นักวิทยาศาสตร์ค้นพบสิ่งที่น่าตื่นเต้นในถ้ำ'],
  ] },
  { f: [['recover', 'v', 'ฟื้นตัว'], ['recovery', 'n', 'การฟื้นตัว']], q: [
    ['We wish you a quick ___.', 'recovery', 'ขอให้หายเร็วๆ นะ'],
  ] },
  { f: [['mix', 'v', 'ผสม'], ['mixture', 'n', 'ส่วนผสม'], ['mixed', 'adj', 'ผสม, ปนกัน']], q: [
    ['Pour the ___ into a baking dish.', 'mixture', 'เทส่วนผสมลงในถาดอบ'],
  ] },
  { f: [['absorb', 'v', 'ดูดซับ'], ['absorption', 'n', 'การดูดซับ'], ['absorbent', 'adj', 'ซึมซับได้ดี']], q: [
    ['Use an ___ cloth to wipe up the spill.', 'absorbent', 'ใช้ผ้าที่ซับน้ำได้ดีเช็ดน้ำที่หก'],
    ['Plants take in water through a process called ___.', 'absorption', 'พืชรับน้ำผ่านกระบวนการที่เรียกว่าการดูดซึม'],
  ] },
  { f: [['accommodate', 'v', 'รองรับ, จัดที่พัก'], ['accommodation', 'n', 'ที่พัก']], q: [
    ['The hall can ___ five hundred people.', 'accommodate', 'ห้องโถงนี้รองรับคนได้ห้าร้อยคน'],
    ['We booked our ___ online.', 'accommodation', 'เราจองที่พักทางออนไลน์'],
  ] },
  { f: [['adequate', 'adj', 'เพียงพอ'], ['adequately', 'adv', 'อย่างเพียงพอ'], ['inadequate', 'adj', 'ไม่เพียงพอ']], q: [
    ['The staff were not ___ trained.', 'adequately', 'พนักงานได้รับการฝึกไม่เพียงพอ'],
  ] },
  { f: [['agriculture', 'n', 'การเกษตร'], ['agricultural', 'adj', 'เกี่ยวกับการเกษตร']], q: [
    ['Rice is a major ___ product.', 'agricultural', 'ข้าวเป็นผลิตภัณฑ์เกษตรสำคัญ'],
    ['Modern ___ uses a lot of machines.', 'agriculture', 'การเกษตรสมัยใหม่ใช้เครื่องจักรมาก'],
  ] },
  { f: [['anticipate', 'v', 'คาดการณ์'], ['anticipation', 'n', 'ความคาดหวัง'], ['unanticipated', 'adj', 'ที่คาดไม่ถึง']], q: [
    ['We waited in ___ for the results.', 'anticipation', 'เรารอผลด้วยความคาดหวัง'],
    ['We did not ___ so many guests.', 'anticipate', 'เราไม่ได้คาดว่าจะมีแขกมากขนาดนั้น'],
  ] },
  { f: [['anxious', 'adj', 'กังวล'], ['anxiety', 'n', 'ความวิตกกังวล'], ['anxiously', 'adv', 'อย่างกังวล']], q: [
    ['She felt ___ before the exam.', 'anxious', 'เธอรู้สึกกังวลก่อนสอบ'],
    ['He waited ___ by the phone.', 'anxiously', 'เขารออย่างกระวนกระวายข้างโทรศัพท์'],
  ] },
  { f: [['apologize', 'v', 'ขอโทษ'], ['apology', 'n', 'คำขอโทษ'], ['apologetic', 'adj', 'ที่รู้สึกผิด']], q: [
    ['I must ___ for being late.', 'apologize', 'ฉันต้องขอโทษที่มาสาย'],
    ['Please accept my ___.', 'apology', 'ขอให้รับคำขอโทษของฉัน'],
  ] },
  { f: [['appropriate', 'adj', 'เหมาะสม'], ['appropriately', 'adv', 'อย่างเหมาะสม'], ['inappropriate', 'adj', 'ไม่เหมาะสม']], q: [
    ['Wear ___ clothes for the interview.', 'appropriate', 'แต่งตัวให้เหมาะสมสำหรับการสัมภาษณ์'],
    ['She was ___ dressed for the cold.', 'appropriately', 'เธอแต่งตัวได้เหมาะกับอากาศหนาว'],
    ['That joke was ___ for a funeral.', 'inappropriate', 'มุกนั้นไม่เหมาะกับงานศพ'],
  ] },
  { f: [['assume', 'v', 'สันนิษฐาน'], ['assumption', 'n', 'ข้อสันนิษฐาน']], q: [
    ['Don\'t ___ that everyone agrees.', 'assume', 'อย่าคิดไปเองว่าทุกคนเห็นด้วย'],
    ['That is a dangerous ___.', 'assumption', 'นั่นเป็นข้อสันนิษฐานที่อันตราย'],
  ] },
  { f: [['attach', 'v', 'แนบ, ติด'], ['attachment', 'n', 'ไฟล์แนบ, ความผูกพัน']], q: [
    ['Please ___ your photo to the form.', 'attach', 'กรุณาแนบรูปถ่ายกับแบบฟอร์ม'],
    ['I could not open the ___ in your email.', 'attachment', 'ฉันเปิดไฟล์แนบในอีเมลของคุณไม่ได้'],
  ] },
  { f: [['aware', 'adj', 'ตระหนัก'], ['awareness', 'n', 'ความตระหนักรู้']], q: [
    ['Are you ___ of the risks?', 'aware', 'คุณตระหนักถึงความเสี่ยงไหม'],
    ['The campaign raises ___ about health.', 'awareness', 'แคมเปญนี้สร้างความตระหนักเรื่องสุขภาพ'],
  ] },
  { f: [['benefit', 'n', 'ประโยชน์'], ['beneficial', 'adj', 'เป็นประโยชน์'], ['beneficiary', 'n', 'ผู้ได้รับประโยชน์']], q: [
    ['Exercise is ___ to your health.', 'beneficial', 'การออกกำลังกายเป็นประโยชน์ต่อสุขภาพ'],
    ['The ___ of the will inherits the house.', 'beneficiary', 'ผู้รับพินัยกรรมได้รับบ้านเป็นมรดก'],
  ] },
  { f: [['biology', 'n', 'ชีววิทยา'], ['biological', 'adj', 'ทางชีววิทยา'], ['biologist', 'n', 'นักชีววิทยา']], q: [
    ['She is a famous marine ___.', 'biologist', 'เธอเป็นนักชีววิทยาทางทะเลที่มีชื่อเสียง'],
    ['I studied ___ at school.', 'biology', 'ฉันเรียนวิชาชีววิทยาที่โรงเรียน'],
    ['They study ___ clocks in animals.', 'biological', 'พวกเขาศึกษานาฬิกาชีวภาพในสัตว์'],
  ] },
  { f: [['broad', 'adj', 'กว้าง'], ['broaden', 'v', 'ทำให้กว้างขึ้น'], ['broadly', 'adv', 'โดยกว้างๆ']], q: [
    ['Travel can ___ your mind.', 'broaden', 'การเดินทางทำให้ใจกว้างขึ้นได้'],
    ['The two plans are ___ similar.', 'broadly', 'แผนทั้งสองคล้ายกันโดยรวม'],
  ] },
  { f: [['calculate', 'v', 'คำนวณ'], ['calculation', 'n', 'การคำนวณ'], ['calculator', 'n', 'เครื่องคิดเลข']], q: [
    ['Use a ___ to check the sum.', 'calculator', 'ใช้เครื่องคิดเลขตรวจผลรวม'],
    ['Can you ___ the total cost?', 'calculate', 'คุณคิดค่าใช้จ่ายรวมได้ไหม'],
    ['I made a mistake in my ___.', 'calculation', 'ฉันคำนวณผิดพลาด'],
  ] },
  { f: [['capable', 'adj', 'มีความสามารถ'], ['capability', 'n', 'ความสามารถ'], ['incapable', 'adj', 'ไม่สามารถ']], q: [
    ['She is ___ of running a marathon.', 'capable', 'เธอสามารถวิ่งมาราธอนได้'],
    ['The phone has a powerful camera ___.', 'capability', 'โทรศัพท์นี้มีความสามารถของกล้องที่ทรงพลัง'],
  ] },
  { f: [['caution', 'n', 'ความระมัดระวัง'], ['cautious', 'adj', 'ระมัดระวัง'], ['cautiously', 'adv', 'อย่างระมัดระวัง']], q: [
    ['He is ___ about spending money.', 'cautious', 'เขาระมัดระวังเรื่องการใช้เงิน'],
    ['She stepped ___ onto the ice.', 'cautiously', 'เธอก้าวอย่างระมัดระวังลงบนน้ำแข็ง'],
    ['Proceed with ___.', 'caution', 'ดำเนินการด้วยความระมัดระวัง'],
  ] },
  { f: [['chaos', 'n', 'ความวุ่นวาย'], ['chaotic', 'adj', 'วุ่นวาย']], q: [
    ['The city was in ___ after the storm.', 'chaos', 'เมืองวุ่นวายหลังพายุ'],
    ['Rush hour is ___ here.', 'chaotic', 'ชั่วโมงเร่งด่วนที่นี่วุ่นวายมาก'],
  ] },
  { f: [['characteristic', 'n', 'ลักษณะเฉพาะ'], ['characterize', 'v', 'แสดงลักษณะเฉพาะ'], ['characteristically', 'adv', 'เป็นลักษณะเฉพาะ']], q: [
    ['Kindness is her best ___.', 'characteristic', 'ความใจดีคือลักษณะเด่นของเธอ'],
  ] },
  { f: [['circulate', 'v', 'หมุนเวียน'], ['circulation', 'n', 'การหมุนเวียน'], ['circular', 'adj', 'เป็นวงกลม']], q: [
    ['Poor ___ makes my hands cold.', 'circulation', 'การไหลเวียนเลือดไม่ดีทำให้มือฉันเย็น'],
    ['We sat at a ___ table.', 'circular', 'เรานั่งที่โต๊ะกลม'],
  ] },
  { f: [['citizen', 'n', 'พลเมือง'], ['citizenship', 'n', 'สัญชาติ'], ['civic', 'adj', 'ที่เกี่ยวกับพลเมือง']], q: [
    ['He applied for British ___.', 'citizenship', 'เขาสมัครขอสัญชาติอังกฤษ'],
    ['Every ___ has the right to vote.', 'citizen', 'พลเมืองทุกคนมีสิทธิ์ลงคะแนนเสียง'],
  ] },
  { f: [['classify', 'v', 'จัดประเภท'], ['classification', 'n', 'การจัดประเภท'], ['classified', 'adj', 'ที่เป็นความลับ']], q: [
    ['Scientists ___ animals into groups.', 'classify', 'นักวิทยาศาสตร์จัดสัตว์เป็นกลุ่ม'],
    ['This document is ___.', 'classified', 'เอกสารนี้เป็นความลับ'],
  ] },
  { f: [['collaborate', 'v', 'ร่วมมือ'], ['collaboration', 'n', 'ความร่วมมือ'], ['collaborative', 'adj', 'ซึ่งร่วมมือกัน']], q: [
    ['The two firms agreed to ___.', 'collaborate', 'สองบริษัทตกลงร่วมมือกัน'],
    ['The book was a ___ project.', 'collaborative', 'หนังสือเล่มนี้เป็นโครงการที่ทำร่วมกัน'],
  ] },
  { f: [['commerce', 'n', 'การพาณิชย์'], ['commercial', 'adj', 'ทางการค้า'], ['commercially', 'adv', 'ในเชิงการค้า']], q: [
    ['The film was a ___ success.', 'commercial', 'ภาพยนตร์ประสบความสำเร็จทางการค้า'],
    ['This drug is now ___ available.', 'commercially', 'ยานี้มีวางขายแล้ว'],
  ] },
  { f: [['compensate', 'v', 'ชดเชย'], ['compensation', 'n', 'ค่าชดเชย']], q: [
    ['The firm will ___ you for the delay.', 'compensate', 'บริษัทจะชดเชยความล่าช้าให้คุณ'],
    ['He received ___ for his injury.', 'compensation', 'เขาได้รับค่าชดเชยจากการบาดเจ็บ'],
  ] },
  { f: [['competent', 'adj', 'มีความสามารถ'], ['competence', 'n', 'ความสามารถ'], ['incompetent', 'adj', 'ไร้ความสามารถ']], q: [
    ['His ___ in maths is clear.', 'competence', 'ความเชี่ยวชาญด้านคณิตศาสตร์ของเขาเห็นได้ชัด'],
  ] },
  { f: [['complex', 'adj', 'ซับซ้อน'], ['complexity', 'n', 'ความซับซ้อน']], q: [
    ['The rules are very ___.', 'complex', 'กฎซับซ้อนมาก'],
    ['Nobody understood the ___ of the problem.', 'complexity', 'ไม่มีใครเข้าใจความซับซ้อนของปัญหา'],
  ] },
  { f: [['comply', 'v', 'ปฏิบัติตาม'], ['compliance', 'n', 'การปฏิบัติตามกฎ'], ['compliant', 'adj', 'ที่ปฏิบัติตาม']], q: [
    ['All drivers must ___ with the law.', 'comply', 'คนขับทุกคนต้องปฏิบัติตามกฎหมาย'],
    ['The factory is in full ___ with safety rules.', 'compliance', 'โรงงานปฏิบัติตามกฎความปลอดภัยครบถ้วน'],
  ] },
  { f: [['conserve', 'v', 'อนุรักษ์'], ['conservation', 'n', 'การอนุรักษ์'], ['conservative', 'adj', 'อนุรักษ์นิยม']], q: [
    ['We must ___ water in the dry season.', 'conserve', 'เราต้องประหยัดน้ำในหน้าแล้ง'],
    ['She has a ___ view on art.', 'conservative', 'เธอมีมุมมองอนุรักษ์นิยมเรื่องศิลปะ'],
  ] },
  { f: [['consistent', 'adj', 'สม่ำเสมอ'], ['consistently', 'adv', 'อย่างสม่ำเสมอ'], ['consistency', 'n', 'ความสม่ำเสมอ']], q: [
    ['Her grades are ___ high.', 'consistently', 'เกรดของเธอสูงอย่างสม่ำเสมอ'],
    ['Good ___ is the key to learning.', 'consistency', 'ความสม่ำเสมอเป็นหัวใจของการเรียนรู้'],
  ] },
  { f: [['consume', 'v', 'บริโภค'], ['consumption', 'n', 'การบริโภค'], ['consumer', 'n', 'ผู้บริโภค']], q: [
    ['Cars ___ a lot of fuel.', 'consume', 'รถยนต์ใช้เชื้อเพลิงมาก'],
    ['Today\'s ___ wants low prices.', 'consumer', 'ผู้บริโภคสมัยนี้ต้องการราคาถูก'],
    ['Sugar ___ has risen.', 'consumption', 'การบริโภคน้ำตาลเพิ่มขึ้น'],
  ] },
  { f: [['contribute', 'v', 'มีส่วนร่วม'], ['contribution', 'n', 'การมีส่วนร่วม'], ['contributor', 'n', 'ผู้ร่วมสมทบ']], q: [
    ['Everyone should ___ to the project.', 'contribute', 'ทุกคนควรมีส่วนร่วมกับโครงการ'],
    ['Thank you for your ___.', 'contribution', 'ขอบคุณสำหรับการมีส่วนร่วมของคุณ'],
  ] },
  { f: [['controversy', 'n', 'ข้อถกเถียง'], ['controversial', 'adj', 'ที่เป็นที่ถกเถียง']], q: [
    ['The new law caused a lot of ___.', 'controversy', 'กฎหมายใหม่ก่อให้เกิดข้อถกเถียงมาก'],
    ['It is a ___ topic.', 'controversial', 'เป็นหัวข้อที่ถกเถียงกันมาก'],
  ] },
  { f: [['convenient', 'adj', 'สะดวก'], ['convenience', 'n', 'ความสะดวก'], ['conveniently', 'adv', 'อย่างสะดวก']], q: [
    ['The hotel is ___ located near the station.', 'conveniently', 'โรงแรมตั้งอยู่ใกล้สถานีอย่างสะดวก'],
    ['Is Friday ___ for you?', 'convenient', 'วันศุกร์สะดวกสำหรับคุณไหม'],
    ['I bought it for ___.', 'convenience', 'ฉันซื้อเพื่อความสะดวก'],
  ] },
  { f: [['convince', 'v', 'ทำให้เชื่อ'], ['convincing', 'adj', 'น่าเชื่อถือ'], ['convinced', 'adj', 'มั่นใจ']], q: [
    ['I could not ___ him to stay.', 'convince', 'ฉันโน้มน้าวให้เขาอยู่ไม่ได้'],
    ['Her argument was ___.', 'convincing', 'ข้อโต้แย้งของเธอน่าเชื่อ'],
    ['I am ___ that he is right.', 'convinced', 'ฉันมั่นใจว่าเขาถูก'],
  ] },
  { f: [['cooperate', 'v', 'ร่วมมือ'], ['cooperation', 'n', 'ความร่วมมือ'], ['cooperative', 'adj', 'ให้ความร่วมมือ']], q: [
    ['Please ___ with the police.', 'cooperate', 'กรุณาร่วมมือกับตำรวจ'],
    ['Thanks for your ___.', 'cooperation', 'ขอบคุณสำหรับความร่วมมือ'],
    ['The witness was very ___.', 'cooperative', 'พยานให้ความร่วมมือเป็นอย่างดี'],
  ] },
  { f: [['coordinate', 'v', 'ประสานงาน'], ['coordination', 'n', 'การประสานงาน'], ['coordinator', 'n', 'ผู้ประสานงาน']], q: [
    ['She will ___ the event.', 'coordinate', 'เธอจะประสานงานการจัดงาน'],
    ['Good ___ saves time.', 'coordination', 'การประสานงานที่ดีช่วยประหยัดเวลา'],
    ['The ___ called everyone.', 'coordinator', 'ผู้ประสานงานโทรหาทุกคน'],
  ] },
  { f: [['corrupt', 'adj', 'ทุจริต'], ['corruption', 'n', 'การทุจริต']], q: [
    ['The mayor was ___.', 'corrupt', 'นายกเทศมนตรีทุจริต'],
    ['The government is fighting ___.', 'corruption', 'รัฐบาลกำลังต่อสู้กับการทุจริต'],
  ] },
  { f: [['credit', 'n', 'เครดิต, ความดี'], ['credible', 'adj', 'น่าเชื่อถือ'], ['credibility', 'n', 'ความน่าเชื่อถือ']], q: [
    ['The witness was not ___.', 'credible', 'พยานไม่น่าเชื่อถือ'],
    ['The scandal damaged his ___.', 'credibility', 'เรื่องอื้อฉาวทำลายความน่าเชื่อถือของเขา'],
  ] },
  { f: [['critic', 'n', 'นักวิจารณ์'], ['critique', 'n', 'บทวิจารณ์'], ['critical', 'adj', 'สำคัญยิ่ง, วิพากษ์'], ['critically', 'adv', 'อย่างวิพากษ์']], q: [
    ['The film ___ praised it.', 'critic', 'นักวิจารณ์ภาพยนตร์ชื่นชมมัน'],
    ['Water is ___ for life.', 'critical', 'น้ำสำคัญยิ่งต่อชีวิต'],
    ['Think ___ about the news.', 'critically', 'คิดวิเคราะห์ข่าวอย่างมีวิจารณญาณ'],
  ] },
  { f: [['cultivate', 'v', 'เพาะปลูก, บ่มเพาะ'], ['cultivation', 'n', 'การเพาะปลูก']], q: [
    ['Farmers ___ rice here.', 'cultivate', 'ชาวนาปลูกข้าวที่นี่'],
    ['The land is under ___.', 'cultivation', 'ที่ดินนี้ใช้เพาะปลูกอยู่'],
  ] },
  { f: [['dedicate', 'v', 'อุทิศ'], ['dedication', 'n', 'ความทุ่มเท'], ['dedicated', 'adj', 'ทุ่มเท']], q: [
    ['She ___ her life to teaching.', 'dedicated', 'เธออุทิศชีวิตให้การสอน'],
    ['Thanks for your hard work and ___.', 'dedication', 'ขอบคุณสำหรับความขยันและความทุ่มเท'],
  ] },
  { f: [['democracy', 'n', 'ประชาธิปไตย'], ['democratic', 'adj', 'เป็นประชาธิปไตย'], ['democratically', 'adv', 'อย่างเป็นประชาธิปไตย']], q: [
    ['The leader was ___ elected.', 'democratically', 'ผู้นำได้รับเลือกตามระบอบประชาธิปไตย'],
    ['It is a ___ country.', 'democratic', 'เป็นประเทศประชาธิปไตย'],
  ] },
  { f: [['deteriorate', 'v', 'เสื่อมลง'], ['deterioration', 'n', 'ความเสื่อมลง']], q: [
    ['His health began to ___.', 'deteriorate', 'สุขภาพของเขาเริ่มทรุดลง'],
    ['There was a rapid ___ in the weather.', 'deterioration', 'อากาศแย่ลงอย่างรวดเร็ว'],
  ] },
  { f: [['diagnose', 'v', 'วินิจฉัย'], ['diagnosis', 'n', 'การวินิจฉัย']], q: [
    ['Early ___ saves lives.', 'diagnosis', 'การวินิจฉัยเร็วช่วยชีวิตคน'],
  ] },
  { f: [['dignity', 'n', 'ศักดิ์ศรี'], ['dignified', 'adj', 'สง่างาม']], q: [
    ['He left with ___.', 'dignity', 'เขาจากไปอย่างมีศักดิ์ศรี'],
    ['She gave a ___ reply.', 'dignified', 'เธอตอบอย่างสง่างาม'],
  ] },
  { f: [['disaster', 'n', 'ภัยพิบัติ'], ['disastrous', 'adj', 'เลวร้าย'], ['disastrously', 'adv', 'อย่างเลวร้าย']], q: [
    ['The flood was a natural ___.', 'disaster', 'น้ำท่วมเป็นภัยธรรมชาติ'],
    ['It was a ___ mistake.', 'disastrous', 'เป็นความผิดพลาดที่เลวร้าย'],
  ] },
  { f: [['discriminate', 'v', 'เลือกปฏิบัติ'], ['discrimination', 'n', 'การเลือกปฏิบัติ']], q: [
    ['It is illegal to ___ against workers.', 'discriminate', 'การเลือกปฏิบัติต่อลูกจ้างผิดกฎหมาย'],
    ['Age ___ is unfair.', 'discrimination', 'การเลือกปฏิบัติเรื่องอายุไม่เป็นธรรม'],
  ] },
  { f: [['disrupt', 'v', 'ขัดขวาง'], ['disruption', 'n', 'การหยุดชะงัก'], ['disruptive', 'adj', 'ที่ก่อกวน']], q: [
    ['Snow can ___ trains.', 'disrupt', 'หิมะอาจทำให้รถไฟเดินทางติดขัด'],
    ['The strike caused ___ to flights.', 'disruption', 'การหยุดงานทำให้เที่ยวบินติดขัด'],
  ] },
  { f: [['distinct', 'adj', 'ชัดเจน'], ['distinction', 'n', 'ความแตกต่าง'], ['distinctive', 'adj', 'มีเอกลักษณ์'], ['distinguish', 'v', 'แยกแยะ']], q: [
    ['Can you ___ the twins?', 'distinguish', 'คุณแยกแฝดสองคนออกไหม'],
    ['There is a clear ___ between them.', 'distinction', 'มีความแตกต่างชัดเจนระหว่างสองสิ่งนี้'],
  ] },
  { f: [['diverse', 'adj', 'หลากหลาย'], ['diversity', 'n', 'ความหลากหลาย'], ['diversify', 'v', 'ทำให้หลากหลาย']], q: [
    ['We value cultural ___.', 'diversity', 'เราให้คุณค่ากับความหลากหลายทางวัฒนธรรม'],
    ['The class is very ___.', 'diverse', 'ชั้นเรียนนี้หลากหลายมาก'],
  ] },
  { f: [['dominate', 'v', 'ครอบงำ'], ['dominant', 'adj', 'เด่น'], ['dominance', 'n', 'ความเหนือกว่า']], q: [
    ['Big firms ___ the market.', 'dominate', 'บริษัทใหญ่ครองตลาด'],
    ['Spanish is the ___ language here.', 'dominant', 'ภาษาสเปนเป็นภาษาหลักที่นี่'],
  ] },
  { f: [['donate', 'v', 'บริจาค'], ['donation', 'n', 'เงินบริจาค'], ['donor', 'n', 'ผู้บริจาค']], q: [
    ['Please ___ blood if you can.', 'donate', 'กรุณาบริจาคเลือดถ้าทำได้'],
    ['Every ___ helps.', 'donation', 'เงินบริจาคทุกบาทช่วยได้'],
    ['She is a regular blood ___.', 'donor', 'เธอเป็นผู้บริจาคเลือดประจำ'],
  ] },
  { f: [['effect', 'n', 'ผล'], ['effective', 'adj', 'มีประสิทธิภาพ'], ['effectively', 'adv', 'อย่างมีประสิทธิภาพ'], ['effectiveness', 'n', 'ประสิทธิผล']], q: [
    ['This medicine is very ___.', 'effective', 'ยานี้ได้ผลมาก'],
    ['She used her time ___.', 'effectively', 'เธอใช้เวลาอย่างมีประสิทธิภาพ'],
  ] },
  { f: [['elect', 'v', 'เลือกตั้ง'], ['election', 'n', 'การเลือกตั้ง'], ['electoral', 'adj', 'เกี่ยวกับการเลือกตั้ง'], ['elected', 'adj', 'ที่ได้รับเลือก']], q: [
    ['The ___ is next month.', 'election', 'การเลือกตั้งจะมีเดือนหน้า'],
    ['They will ___ a new leader.', 'elect', 'พวกเขาจะเลือกผู้นำคนใหม่'],
  ] },
  { f: [['eligible', 'adj', 'มีสิทธิ์'], ['eligibility', 'n', 'คุณสมบัติที่มีสิทธิ์']], q: [
    ['You are ___ to vote at eighteen.', 'eligible', 'คุณมีสิทธิ์ลงคะแนนเมื่ออายุสิบแปด'],
    ['Check your ___ before applying.', 'eligibility', 'ตรวจสอบคุณสมบัติก่อนสมัคร'],
  ] },
  { f: [['emerge', 'v', 'โผล่ออกมา'], ['emergence', 'n', 'การเกิดขึ้น'], ['emerging', 'adj', 'ที่กำลังเกิดขึ้น']], q: [
    ['The sun began to ___ from the clouds.', 'emerge', 'ดวงอาทิตย์เริ่มโผล่ออกจากเมฆ'],
    ['The ___ of new technology changed work.', 'emergence', 'การเกิดขึ้นของเทคโนโลยีใหม่เปลี่ยนการทำงาน'],
  ] },
  { f: [['encourage', 'v', 'ให้กำลังใจ'], ['encouragement', 'n', 'กำลังใจ'], ['encouraging', 'adj', 'ที่ให้กำลังใจ']], q: [
    ['Teachers ___ students to read.', 'encourage', 'ครูส่งเสริมให้นักเรียนอ่าน'],
    ['Thanks for your ___.', 'encouragement', 'ขอบคุณสำหรับกำลังใจ'],
    ['The results are ___.', 'encouraging', 'ผลลัพธ์น่าชื่นใจ'],
  ] },
  { f: [['engage', 'v', 'ดึงดูด, ร่วม'], ['engagement', 'n', 'การหมั้น, การมีส่วนร่วม'], ['engaging', 'adj', 'น่าสนใจ']], q: [
    ['They announced their ___.', 'engagement', 'พวกเขาประกาศหมั้น'],
    ['She is an ___ speaker.', 'engaging', 'เธอเป็นผู้พูดที่น่าสนใจ'],
  ] },
  { f: [['enrich', 'v', 'ทำให้อุดมสมบูรณ์'], ['enrichment', 'n', 'การเพิ่มพูน']], q: [
    ['Reading will ___ your vocabulary.', 'enrich', 'การอ่านจะเพิ่มพูนคำศัพท์ของคุณ'],
    ['Cultural ___ matters for kids.', 'enrichment', 'การเสริมประสบการณ์ทางวัฒนธรรมสำคัญสำหรับเด็ก'],
  ] },
  { f: [['enthusiasm', 'n', 'ความกระตือรือร้น'], ['enthusiastic', 'adj', 'กระตือรือร้น'], ['enthusiast', 'n', 'ผู้คลั่งไคล้']], q: [
    ['He showed great ___.', 'enthusiasm', 'เขาแสดงความกระตือรือร้นอย่างมาก'],
    ['The fans were ___.', 'enthusiastic', 'แฟนๆ กระตือรือร้น'],
    ['She is a football ___.', 'enthusiast', 'เธอเป็นแฟนบอลตัวยง'],
  ] },
  { f: [['essence', 'n', 'สาระสำคัญ'], ['essential', 'adj', 'จำเป็น'], ['essentially', 'adv', 'โดยแก่นแท้']], q: [
    ['Water is ___ for life.', 'essential', 'น้ำจำเป็นต่อชีวิต'],
    ['That is the ___ of the plan.', 'essence', 'นั่นคือสาระสำคัญของแผน'],
  ] },
  { f: [['establish', 'v', 'ก่อตั้ง'], ['establishment', 'n', 'การก่อตั้ง, สถาบัน'], ['established', 'adj', 'ที่ก่อตั้งมานาน']], q: [
    ['They ___ the company in 1990.', 'established', 'พวกเขาก่อตั้งบริษัทในปี 1990'],
    ['The ___ of the school took years.', 'establishment', 'การก่อตั้งโรงเรียนใช้เวลาหลายปี'],
  ] },
  { f: [['evaluate', 'v', 'ประเมิน'], ['evaluation', 'n', 'การประเมิน']], q: [
    ['Teachers ___ each essay.', 'evaluate', 'ครูประเมินเรียงความทุกเรื่อง'],
    ['The ___ takes two weeks.', 'evaluation', 'การประเมินใช้เวลาสองสัปดาห์'],
  ] },
  { f: [['evolve', 'v', 'วิวัฒนาการ'], ['evolution', 'n', 'วิวัฒนาการ'], ['evolutionary', 'adj', 'เกี่ยวกับวิวัฒนาการ']], q: [
    ['Species ___ over millions of years.', 'evolve', 'สิ่งมีชีวิตวิวัฒนาการตลอดหลายล้านปี'],
    ['Darwin explained ___.', 'evolution', 'ดาร์วินอธิบายเรื่องวิวัฒนาการ'],
  ] },
  { f: [['exaggerate', 'v', 'พูดเกินจริง'], ['exaggeration', 'n', 'การพูดเกินจริง'], ['exaggerated', 'adj', 'เกินจริง']], q: [
    ['Don\'t ___ the problem.', 'exaggerate', 'อย่าพูดเกินจริงเรื่องปัญหา'],
    ['That\'s a bit of an ___.', 'exaggeration', 'นั่นดูเกินจริงไปหน่อย'],
  ] },
  { f: [['exclude', 'v', 'ไม่รวม'], ['exclusion', 'n', 'การกีดกัน'], ['exclusive', 'adj', 'เฉพาะกลุ่ม'], ['exclusively', 'adv', 'เฉพาะ']], q: [
    ['The price does ___ tax.', 'exclude', 'ราคานี้ไม่รวมภาษี'],
    ['It is an ___ club.', 'exclusive', 'เป็นสโมสรเฉพาะสมาชิก'],
    ['The room is ___ for staff.', 'exclusively', 'ห้องนี้ใช้เฉพาะพนักงาน'],
  ] },
  { f: [['execute', 'v', 'ดำเนินการ, ประหาร'], ['execution', 'n', 'การดำเนินการ'], ['executive', 'n', 'ผู้บริหาร']], q: [
    ['She is a senior ___.', 'executive', 'เธอเป็นผู้บริหารระดับสูง'],
    ['The ___ of the plan failed.', 'execution', 'การลงมือทำตามแผนล้มเหลว'],
  ] },
  { f: [['expand', 'v', 'ขยาย'], ['expansion', 'n', 'การขยายตัว'], ['expansive', 'adj', 'กว้างขวาง']], q: [
    ['The firm plans to ___ overseas.', 'expand', 'บริษัทวางแผนขยายไปต่างประเทศ'],
    ['The ___ of the city continues.', 'expansion', 'การขยายตัวของเมืองยังดำเนินต่อไป'],
  ] },
  { f: [['explicit', 'adj', 'ชัดเจน, ตรงไปตรงมา'], ['explicitly', 'adv', 'อย่างชัดเจน']], q: [
    ['The rules are ___ about this.', 'explicit', 'กฎระบุเรื่องนี้ไว้ชัดเจน'],
    ['He ___ said no.', 'explicitly', 'เขาปฏิเสธอย่างชัดเจน'],
  ] },
  { f: [['exploit', 'v', 'ฉวยประโยชน์, ใช้ประโยชน์'], ['exploitation', 'n', 'การเอาเปรียบ']], q: [
    ['Some firms ___ their workers.', 'exploit', 'บางบริษัทเอาเปรียบคนงาน'],
    ['Child ___ is illegal.', 'exploitation', 'การเอาเปรียบเด็กผิดกฎหมาย'],
  ] },
  { f: [['explode', 'v', 'ระเบิด'], ['explosion', 'n', 'การระเบิด'], ['explosive', 'adj', 'ที่ระเบิดได้']], q: [
    ['We heard a loud ___.', 'explosion', 'เราได้ยินเสียงระเบิดดัง'],
    ['The bomb may ___.', 'explode', 'ระเบิดลูกนี้อาจระเบิด'],
    ['Gas is highly ___.', 'explosive', 'แก๊สระเบิดง่ายมาก'],
  ] },
  { f: [['extend', 'v', 'ขยาย, ต่อเวลา'], ['extension', 'n', 'การต่อเวลา'], ['extensive', 'adj', 'กว้างขวาง'], ['extensively', 'adv', 'อย่างกว้างขวาง']], q: [
    ['Can we ___ the deadline?', 'extend', 'เราขยายกำหนดส่งได้ไหม'],
    ['She has travelled ___.', 'extensively', 'เธอเดินทางมาอย่างกว้างขวาง'],
  ] },
  { f: [['found', 'v', 'ก่อตั้ง'], ['founder', 'n', 'ผู้ก่อตั้ง'], ['foundation', 'n', 'รากฐาน, มูลนิธิ']], q: [
    ['He is the ___ of the firm.', 'founder', 'เขาเป็นผู้ก่อตั้งบริษัท'],
    ['Trust is the ___ of friendship.', 'foundation', 'ความไว้ใจคือรากฐานของมิตรภาพ'],
  ] },
  { f: [['frustrate', 'v', 'ทำให้หงุดหงิด'], ['frustration', 'n', 'ความหงุดหงิด'], ['frustrated', 'adj', 'หงุดหงิด'], ['frustrating', 'adj', 'น่าหงุดหงิด']], q: [
    ['I feel ___ with my progress.', 'frustrated', 'ฉันหงุดหงิดกับความคืบหน้า'],
    ['Waiting is ___.', 'frustrating', 'การรอน่าหงุดหงิด'],
    ['He shouted in ___.', 'frustration', 'เขาตะโกนด้วยความหงุดหงิด'],
  ] },
  { f: [['function', 'n', 'หน้าที่'], ['functional', 'adj', 'ใช้งานได้'], ['functionality', 'n', 'ฟังก์ชัน']], q: [
    ['The design is simple and ___.', 'functional', 'การออกแบบเรียบง่ายและใช้งานได้จริง'],
    ['What is the ___ of this button?', 'function', 'ปุ่มนี้มีหน้าที่อะไร'],
  ] },
  { f: [['genetic', 'adj', 'ทางพันธุกรรม'], ['genetics', 'n', 'พันธุศาสตร์'], ['genetically', 'adv', 'ทางพันธุกรรม']], q: [
    ['Eye colour is ___.', 'genetic', 'สีตาเป็นเรื่องพันธุกรรม'],
    ['She studies ___ at university.', 'genetics', 'เธอเรียนพันธุศาสตร์ที่มหาวิทยาลัย'],
  ] },
  { f: [['guide', 'v', 'นำทาง'], ['guidance', 'n', 'คำแนะนำ'], ['guideline', 'n', 'แนวทางปฏิบัติ']], q: [
    ['Teachers give students ___.', 'guidance', 'ครูให้คำแนะนำแก่นักเรียน'],
  ] },
  { f: [['humble', 'adj', 'ถ่อมตัว'], ['humbly', 'adv', 'อย่างถ่อมตัว'], ['humility', 'n', 'ความถ่อมตน']], q: [
    ['Despite his fame, he stayed ___.', 'humble', 'แม้มีชื่อเสียง เขายังถ่อมตัว'],
    ['She accepted the prize with ___.', 'humility', 'เธอรับรางวัลด้วยความถ่อมตน'],
  ] },
  { f: [['identify', 'v', 'ระบุ'], ['identification', 'n', 'การระบุตัวตน'], ['identity', 'n', 'เอกลักษณ์'], ['identical', 'adj', 'เหมือนกัน']], q: [
    ['Please show some ___.', 'identification', 'กรุณาแสดงบัตรประจำตัว'],
    ['Can you ___ the man in the photo?', 'identify', 'คุณระบุตัวชายในรูปได้ไหม'],
    ['The twins look ___.', 'identical', 'แฝดสองคนดูเหมือนกัน'],
  ] },
  { f: [['ideology', 'n', 'อุดมการณ์'], ['ideological', 'adj', 'ทางอุดมการณ์']], q: [
    ['It was an ___ dispute.', 'ideological', 'เป็นข้อพิพาททางอุดมการณ์'],
  ] },
  { f: [['ignore', 'v', 'เพิกเฉย'], ['ignorance', 'n', 'ความไม่รู้'], ['ignorant', 'adj', 'ไม่รู้']], q: [
    ['Don\'t ___ the warning.', 'ignore', 'อย่าเพิกเฉยต่อคำเตือน'],
    ['He acted out of ___.', 'ignorance', 'เขาทำไปเพราะความไม่รู้'],
    ['She was ___ of the law.', 'ignorant', 'เธอไม่รู้เรื่องกฎหมาย'],
  ] },
  { f: [['inflate', 'v', 'พองตัว'], ['inflation', 'n', 'เงินเฟ้อ']], q: [
    ['Please ___ the tyre.', 'inflate', 'กรุณาสูบลมยาง'],
  ] },
  { f: [['influence', 'n', 'อิทธิพล'], ['influential', 'adj', 'มีอิทธิพล']], q: [
    ['She is a very ___ writer.', 'influential', 'เธอเป็นนักเขียนที่มีอิทธิพลมาก'],
    ['Parents have a big ___ on children.', 'influence', 'พ่อแม่มีอิทธิพลต่อลูกมาก'],
  ] },
  { f: [['innovate', 'v', 'สร้างนวัตกรรม'], ['innovation', 'n', 'นวัตกรรม'], ['innovative', 'adj', 'เป็นนวัตกรรม'], ['innovator', 'n', 'นักประดิษฐ์']], q: [
    ['Companies must ___ to survive.', 'innovate', 'บริษัทต้องสร้างสิ่งใหม่เพื่อให้อยู่รอด'],
    ['It is an ___ design.', 'innovative', 'เป็นการออกแบบที่เป็นนวัตกรรม'],
    ['Technology drives ___.', 'innovation', 'เทคโนโลยีขับเคลื่อนนวัตกรรม'],
  ] },
  { f: [['institute', 'n', 'สถาบัน'], ['institution', 'n', 'สถาบัน'], ['institutional', 'adj', 'เชิงสถาบัน']], q: [
    ['The bank is a financial ___.', 'institution', 'ธนาคารเป็นสถาบันการเงิน'],
  ] },
  { f: [['integrate', 'v', 'ผสมผสาน'], ['integration', 'n', 'การผสมผสาน'], ['integrated', 'adj', 'ที่ผสมผสาน'], ['integral', 'adj', 'สำคัญที่ขาดไม่ได้']], q: [
    ['Music is an ___ part of the festival.', 'integral', 'ดนตรีเป็นส่วนสำคัญของเทศกาล'],
    ['Immigrants ___ into society.', 'integrate', 'ผู้อพยพผสมกลมกลืนเข้ากับสังคม'],
    ['Social ___ takes time.', 'integration', 'การผสมผสานทางสังคมใช้เวลา'],
  ] },
  { f: [['intense', 'adj', 'รุนแรง'], ['intensity', 'n', 'ความเข้มข้น'], ['intensify', 'v', 'ทวีความรุนแรง'], ['intensive', 'adj', 'เข้มข้น']], q: [
    ['The heat was ___.', 'intense', 'ความร้อนรุนแรงมาก'],
    ['The storm will ___ tonight.', 'intensify', 'พายุจะรุนแรงขึ้นคืนนี้'],
  ] },
  { f: [['interfere', 'v', 'แทรกแซง'], ['interference', 'n', 'การแทรกแซง']], q: [
    ['Don\'t ___ in my business.', 'interfere', 'อย่ามายุ่งเรื่องของฉัน'],
    ['The radio picks up ___.', 'interference', 'วิทยุจับสัญญาณรบกวน'],
  ] },
  { f: [['interpret', 'v', 'ตีความ'], ['interpretation', 'n', 'การตีความ'], ['interpreter', 'n', 'ล่าม']], q: [
    ['She works as an ___.', 'interpreter', 'เธอทำงานเป็นล่าม'],
    ['How do you ___ this poem?', 'interpret', 'คุณตีความบทกวีนี้อย่างไร'],
  ] },
  { f: [['invade', 'v', 'รุกราน'], ['invasion', 'n', 'การรุกราน'], ['invader', 'n', 'ผู้รุกราน']], q: [
    ['The army will ___ the island.', 'invade', 'กองทัพจะบุกเกาะ'],
  ] },
  { f: [['invest', 'v', 'ลงทุน'], ['investment', 'n', 'การลงทุน'], ['investor', 'n', 'นักลงทุน']], q: [
    ['She decided to ___ in property.', 'invest', 'เธอตัดสินใจลงทุนในอสังหาริมทรัพย์'],
    ['Education is a good ___.', 'investment', 'การศึกษาเป็นการลงทุนที่ดี'],
    ['The ___ lost money.', 'investor', 'นักลงทุนขาดทุน'],
  ] },
  { f: [['investigate', 'v', 'สอบสวน'], ['investigation', 'n', 'การสอบสวน'], ['investigator', 'n', 'ผู้สืบสวน']], q: [
    ['Police will ___ the crime.', 'investigate', 'ตำรวจจะสอบสวนคดี'],
    ['A private ___ was hired.', 'investigator', 'มีการจ้างนักสืบเอกชน'],
    ['The ___ continues.', 'investigation', 'การสอบสวนยังดำเนินต่อไป'],
  ] },
  { f: [['isolate', 'v', 'แยกตัว'], ['isolation', 'n', 'การแยกตัว'], ['isolated', 'adj', 'ห่างไกล']], q: [
    ['Patients must ___ at home.', 'isolate', 'ผู้ป่วยต้องแยกตัวอยู่บ้าน'],
    ['He lives in complete ___.', 'isolation', 'เขาอาศัยอยู่โดดเดี่ยวโดยสิ้นเชิง'],
    ['It\'s an ___ village.', 'isolated', 'เป็นหมู่บ้านห่างไกล'],
  ] },
  { f: [['justify', 'v', 'แสดงเหตุผล'], ['justification', 'n', 'เหตุผลรองรับ'], ['justified', 'adj', 'สมเหตุสมผล']], q: [
    ['How can you ___ the cost?', 'justify', 'คุณจะอธิบายความสมเหตุสมผลของค่าใช้จ่ายได้อย่างไร'],
    ['There is no ___ for such anger.', 'justification', 'ไม่มีเหตุผลรองรับความโกรธเช่นนี้'],
  ] },
  { f: [['legal', 'adj', 'ถูกกฎหมาย'], ['legally', 'adv', 'ตามกฎหมาย'], ['legislation', 'n', 'กฎหมาย'], ['legitimate', 'adj', 'ชอบธรรม'], ['illegal', 'adj', 'ผิดกฎหมาย']], q: [
    ['New ___ will be passed.', 'legislation', 'จะมีการผ่านกฎหมายใหม่'],
  ] },
  { f: [['liberal', 'adj', 'เสรีนิยม'], ['liberty', 'n', 'เสรีภาพ'], ['liberate', 'v', 'ปลดปล่อย'], ['liberation', 'n', 'การปลดปล่อย']], q: [
    ['They fight for ___.', 'liberty', 'พวกเขาต่อสู้เพื่อเสรีภาพ'],
    ['The army came to ___ the town.', 'liberate', 'กองทัพมาปลดปล่อยเมือง'],
  ] },
  { f: [['maintain', 'v', 'บำรุงรักษา'], ['maintenance', 'n', 'การบำรุงรักษา']], q: [
    ['We ___ the equipment weekly.', 'maintain', 'เราบำรุงรักษาอุปกรณ์ทุกสัปดาห์'],
    ['Road ___ is costly.', 'maintenance', 'การซ่อมบำรุงถนนมีราคาแพง'],
  ] },
  { f: [['manipulate', 'v', 'บงการ, ควบคุม'], ['manipulation', 'n', 'การบงการ'], ['manipulative', 'adj', 'ที่ชอบบงการ']], q: [
    ['Don\'t let him ___ you.', 'manipulate', 'อย่าให้เขาบงการคุณ'],
    ['Media ___ is dangerous.', 'manipulation', 'การชักใยสื่ออันตราย'],
  ] },
  { f: [['mature', 'adj', 'เป็นผู้ใหญ่'], ['maturity', 'n', 'วุฒิภาวะ'], ['immature', 'adj', 'ไม่โต']], q: [
    ['He showed great ___.', 'maturity', 'เขาแสดงวุฒิภาวะอย่างมาก'],
  ] },
  { f: [['mechanic', 'n', 'ช่างเครื่อง'], ['mechanical', 'adj', 'ทางกลไก'], ['mechanism', 'n', 'กลไก']], q: [
    ['The ___ fixed my car.', 'mechanic', 'ช่างซ่อมรถของฉัน'],
    ['This is a ___ problem.', 'mechanical', 'เป็นปัญหาทางกลไก'],
    ['A strange ___ opens the door.', 'mechanism', 'กลไกแปลกๆ เปิดประตู'],
  ] },
  { f: [['migrate', 'v', 'อพยพ'], ['migration', 'n', 'การย้ายถิ่น'], ['migrant', 'n', 'ผู้ย้ายถิ่น']], q: [
    ['Birds ___ south in winter.', 'migrate', 'นกอพยพไปทางใต้ในหน้าหนาว'],
    ['Seasonal ___ is common.', 'migration', 'การย้ายถิ่นตามฤดูกาลเป็นเรื่องปกติ'],
    ['Many ___ workers came.', 'migrant', 'แรงงานย้ายถิ่นจำนวนมากมา'],
  ] },
  { f: [['minimal', 'adj', 'น้อยที่สุด'], ['minimize', 'v', 'ลดให้น้อยที่สุด'], ['minimum', 'n', 'ขั้นต่ำ']], q: [
    ['We try to ___ waste.', 'minimize', 'เราพยายามลดของเสียให้น้อยที่สุด'],
    ['The damage was ___.', 'minimal', 'ความเสียหายน้อยมาก'],
    ['The ___ age is eighteen.', 'minimum', 'อายุขั้นต่ำคือสิบแปดปี'],
  ] },
  { f: [['mobile', 'adj', 'เคลื่อนที่ได้'], ['mobility', 'n', 'ความคล่องตัว'], ['mobilize', 'v', 'ระดมพล']], q: [
    ['The patient has limited ___.', 'mobility', 'ผู้ป่วยเคลื่อนไหวได้จำกัด'],
    ['The group tried to ___ support.', 'mobilize', 'กลุ่มพยายามระดมการสนับสนุน'],
  ] },
  { f: [['moral', 'adj', 'ทางศีลธรรม'], ['morality', 'n', 'ศีลธรรม'], ['morally', 'adv', 'ในด้านศีลธรรม']], q: [
    ['It is ___ wrong to lie.', 'morally', 'การโกหกผิดในเชิงศีลธรรม'],
    ['They argued about ___.', 'morality', 'พวกเขาเถียงกันเรื่องศีลธรรม'],
  ] },
  { f: [['negotiate', 'v', 'เจรจา'], ['negotiation', 'n', 'การเจรจา'], ['negotiator', 'n', 'ผู้เจรจา']], q: [
    ['They will ___ a new contract.', 'negotiate', 'พวกเขาจะเจรจาสัญญาใหม่'],
    ['He is a skilled ___.', 'negotiator', 'เขาเป็นนักเจรจาฝีมือดี'],
  ] },
  { f: [['nutrition', 'n', 'โภชนาการ'], ['nutritious', 'adj', 'มีคุณค่าทางอาหาร'], ['nutrient', 'n', 'สารอาหาร'], ['nutritional', 'adj', 'ทางโภชนาการ']], q: [
    ['Proper ___ is vital for growing children.', 'nutrition', 'โภชนาการที่เหมาะสมสำคัญมากสำหรับเด็กที่กำลังโต'],
  ] },
  { f: [['object', 'v', 'คัดค้าน'], ['objection', 'n', 'ข้อคัดค้าน'], ['objective', 'n', 'วัตถุประสงค์']], q: [
    ['Does anyone ___ to the plan?', 'object', 'มีใครคัดค้านแผนไหม'],
    ['The ___ of the game is to win.', 'objective', 'วัตถุประสงค์ของเกมคือชนะ'],
    ['I have no ___.', 'objection', 'ฉันไม่มีข้อคัดค้าน'],
  ] },
  { f: [['oblige', 'v', 'บังคับ'], ['obligation', 'n', 'ภาระหน้าที่'], ['obligatory', 'adj', 'บังคับ']], q: [
    ['I felt under no ___.', 'obligation', 'ฉันไม่รู้สึกว่ามีพันธะ'],
    ['Attendance is ___.', 'obligatory', 'การเข้าร่วมเป็นข้อบังคับ'],
  ] },
  { f: [['obsess', 'v', 'หมกมุ่น'], ['obsession', 'n', 'ความหมกมุ่น'], ['obsessive', 'adj', 'หมกมุ่น']], q: [
    ['He has an ___ with cleaning.', 'obsession', 'เขาหมกมุ่นกับการทำความสะอาด'],
  ] },
  { f: [['optimist', 'n', 'คนมองโลกในแง่ดี'], ['optimism', 'n', 'การมองโลกในแง่ดี'], ['optimistic', 'adj', 'มองในแง่ดี']], q: [
    ['I am ___ about the future.', 'optimistic', 'ฉันมองอนาคตในแง่ดี'],
    ['She faced it with ___.', 'optimism', 'เธอเผชิญมันด้วยความมองโลกในแง่ดี'],
  ] },
  { f: [['participate', 'v', 'มีส่วนร่วม'], ['participation', 'n', 'การมีส่วนร่วม'], ['participant', 'n', 'ผู้เข้าร่วม']], q: [
    ['Everyone can ___ in the game.', 'participate', 'ทุกคนเข้าร่วมเกมได้'],
    ['Each ___ gets a prize.', 'participant', 'ผู้เข้าร่วมทุกคนได้รางวัล'],
  ] },
  { f: [['partner', 'n', 'หุ้นส่วน'], ['partnership', 'n', 'ห้างหุ้นส่วน']], q: [
    ['He started a ___ with his friend.', 'partnership', 'เขาตั้งห้างหุ้นส่วนกับเพื่อน'],
    ['She is my business ___.', 'partner', 'เธอเป็นหุ้นส่วนทางธุรกิจของฉัน'],
  ] },
  { f: [['perceive', 'v', 'รับรู้'], ['perception', 'n', 'การรับรู้'], ['perceptive', 'adj', 'เฉียบแหลม']], q: [
    ['How do you ___ the problem?', 'perceive', 'คุณมองปัญหานี้อย่างไร'],
    ['Public ___ is changing.', 'perception', 'การรับรู้ของสาธารณชนกำลังเปลี่ยน'],
  ] },
  { f: [['persist', 'v', 'ยืนหยัด'], ['persistent', 'adj', 'ต่อเนื่อง, ดื้อดึง'], ['persistence', 'n', 'ความมุ่งมั่น'], ['persistently', 'adv', 'อย่างต่อเนื่อง']], q: [
    ['Rain will ___ all week.', 'persist', 'ฝนจะตกต่อเนื่องทั้งสัปดาห์'],
    ['Success needs ___.', 'persistence', 'ความสำเร็จต้องอาศัยความอดทนมุ่งมั่น'],
    ['I have a ___ cough.', 'persistent', 'ฉันไอไม่หายสักที'],
  ] },
  { f: [['philosophy', 'n', 'ปรัชญา'], ['philosopher', 'n', 'นักปรัชญา'], ['philosophical', 'adj', 'เชิงปรัชญา']], q: [
    ['He studied ___.', 'philosophy', 'เขาเรียนปรัชญา'],
    ['Plato was a Greek ___.', 'philosopher', 'เพลโตเป็นนักปรัชญากรีก'],
  ] },
  { f: [['physical', 'adj', 'ทางร่างกาย'], ['physician', 'n', 'แพทย์'], ['physics', 'n', 'ฟิสิกส์'], ['physicist', 'n', 'นักฟิสิกส์']], q: [
    ['A ___ explained the theory.', 'physicist', 'นักฟิสิกส์อธิบายทฤษฎี'],
    ['She studies ___.', 'physics', 'เธอเรียนฟิสิกส์'],
  ] },
  { f: [['potential', 'adj', 'เป็นไปได้'], ['potentially', 'adv', 'อาจจะ']], q: [
    ['Everyone has the ___ to learn.', 'potential', 'ทุกคนมีศักยภาพในการเรียนรู้'],
    ['It is ___ dangerous.', 'potentially', 'มันอาจเป็นอันตราย'],
  ] },
  { f: [['prejudice', 'n', 'อคติ'], ['prejudiced', 'adj', 'มีอคติ']], q: [
    ['He has no ___ against anyone.', 'prejudice', 'เขาไม่มีอคติต่อใคร'],
    ['Don\'t be so ___.', 'prejudiced', 'อย่าเป็นคนมีอคติ'],
  ] },
  { f: [['preserve', 'v', 'รักษา'], ['preservation', 'n', 'การรักษา'], ['preservative', 'n', 'สารกันเสีย']], q: [
    ['Salt can ___ meat.', 'preserve', 'เกลือช่วยถนอมเนื้อ'],
    ['Wildlife ___ is important.', 'preservation', 'การอนุรักษ์สัตว์ป่าสำคัญ'],
  ] },
  { f: [['prevent', 'v', 'ป้องกัน'], ['prevention', 'n', 'การป้องกัน'], ['preventive', 'adj', 'เชิงป้องกัน']], q: [
    ['Exercise can ___ illness.', 'prevent', 'การออกกำลังกายป้องกันโรคได้'],
  ] },
  { f: [['profit', 'n', 'กำไร'], ['profitable', 'adj', 'ทำกำไร'], ['profitability', 'n', 'ความสามารถในการทำกำไร']], q: [
    ['The shop made a small ___.', 'profit', 'ร้านได้กำไรเล็กน้อย'],
    ['It is a ___ business.', 'profitable', 'เป็นธุรกิจที่ทำกำไร'],
  ] },
  { f: [['prohibit', 'v', 'ห้าม'], ['prohibition', 'n', 'การห้าม']], q: [
    ['There is a ___ on alcohol.', 'prohibition', 'มีการห้ามแอลกอฮอล์'],
  ] },
  { f: [['prominent', 'adj', 'โดดเด่น'], ['prominence', 'n', 'ความโดดเด่น'], ['prominently', 'adv', 'อย่างเด่นชัด']], q: [
    ['She is a ___ lawyer.', 'prominent', 'เธอเป็นทนายความที่มีชื่อเสียง'],
    ['The sign was ___ displayed.', 'prominently', 'ป้ายถูกติดไว้อย่างเด่นชัด'],
  ] },
  { f: [['promote', 'v', 'ส่งเสริม'], ['promotion', 'n', 'การเลื่อนตำแหน่ง'], ['promotional', 'adj', 'เพื่อการส่งเสริม']], q: [
    ['The ad aims to ___ tourism.', 'promote', 'โฆษณานี้มุ่งส่งเสริมการท่องเที่ยว'],
    ['He got a ___ at work.', 'promotion', 'เขาได้เลื่อนตำแหน่งที่ทำงาน'],
  ] },
  { f: [['propose', 'v', 'เสนอ'], ['proposal', 'n', 'ข้อเสนอ'], ['proposition', 'n', 'ข้อเสนอ']], q: [
    ['I\'d like to ___ a toast.', 'propose', 'ฉันขอเสนอให้ดื่มอวยพร'],
    ['The board rejected the ___.', 'proposal', 'คณะกรรมการปฏิเสธข้อเสนอ'],
  ] },
  { f: [['provoke', 'v', 'ยั่วยุ'], ['provocation', 'n', 'การยั่วยุ'], ['provocative', 'adj', 'ที่ยั่วยุ']], q: [
    ['Don\'t ___ the dog.', 'provoke', 'อย่ายั่วสุนัข'],
    ['It was a ___ remark.', 'provocative', 'เป็นคำพูดที่ยั่วยุ'],
  ] },
  { f: [['psychology', 'n', 'จิตวิทยา'], ['psychological', 'adj', 'ทางจิตวิทยา'], ['psychologist', 'n', 'นักจิตวิทยา'], ['psychiatric', 'adj', 'ทางจิตเวช']], q: [
    ['She wants to be a ___.', 'psychologist', 'เธออยากเป็นนักจิตวิทยา'],
    ['He studies child ___.', 'psychology', 'เขาศึกษาจิตวิทยาเด็ก'],
  ] },
  { f: [['rational', 'adj', 'มีเหตุผล'], ['rationally', 'adv', 'อย่างมีเหตุผล'], ['irrational', 'adj', 'ไร้เหตุผล']], q: [
    ['Think ___ before you decide.', 'rationally', 'คิดอย่างมีเหตุผลก่อนตัดสินใจ'],
  ] },
  { f: [['realization', 'n', 'การตระหนักรู้'], ['realistic', 'adj', 'สมจริง'], ['realism', 'n', 'สัจนิยม']], q: [
    ['Be ___ about your goals.', 'realistic', 'จงตั้งเป้าหมายอย่างสมเหตุสมผล'],
  ] },
  { f: [['recruit', 'v', 'สรรหา'], ['recruitment', 'n', 'การรับสมัครงาน'], ['recruiter', 'n', 'ผู้สรรหา']], q: [
    ['We need to ___ more staff.', 'recruit', 'เราต้องรับพนักงานเพิ่ม'],
  ] },
  { f: [['reform', 'v', 'ปฏิรูป'], ['reformer', 'n', 'ผู้ปฏิรูป']], q: [
    ['The tax system needs ___.', 'reform', 'ระบบภาษีต้องปฏิรูป'],
    ['The ___ changed the school system.', 'reformer', 'นักปฏิรูปเปลี่ยนระบบโรงเรียน'],
  ] },
  { f: [['regulate', 'v', 'ควบคุม'], ['regulation', 'n', 'กฎระเบียบ'], ['regulator', 'n', 'ผู้กำกับดูแล'], ['regulatory', 'adj', 'ที่กำกับดูแล']], q: [
    ['The ___ fined the bank.', 'regulator', 'หน่วยกำกับดูแลปรับธนาคาร'],
  ] },
  { f: [['reinforce', 'v', 'เสริมกำลัง'], ['reinforcement', 'n', 'การเสริมกำลัง']], q: [
    ['Steel will ___ the wall.', 'reinforce', 'เหล็กจะเสริมกำแพงให้แข็งแรง'],
  ] },
  { f: [['relevant', 'adj', 'เกี่ยวข้อง'], ['relevance', 'n', 'ความเกี่ยวข้อง'], ['irrelevant', 'adj', 'ไม่เกี่ยวข้อง']], q: [
    ['Your answer is not ___.', 'relevant', 'คำตอบของคุณไม่เกี่ยวข้อง'],
    ['The ___ of the study is clear.', 'relevance', 'ความเกี่ยวข้องของงานศึกษาชัดเจน'],
  ] },
  { f: [['reluctant', 'adj', 'ไม่เต็มใจ'], ['reluctance', 'n', 'ความไม่เต็มใจ'], ['reluctantly', 'adv', 'อย่างไม่เต็มใจ']], q: [
    ['He was ___ to speak.', 'reluctant', 'เขาไม่เต็มใจพูด'],
    ['She agreed ___.', 'reluctantly', 'เธอตกลงอย่างไม่เต็มใจ'],
  ] },
  { f: [['represent', 'v', 'เป็นตัวแทน'], ['representation', 'n', 'การเป็นตัวแทน'], ['representative', 'n', 'ตัวแทน']], q: [
    ['Who will ___ the school?', 'represent', 'ใครจะเป็นตัวแทนโรงเรียน'],
    ['A sales ___ called me.', 'representative', 'ตัวแทนฝ่ายขายโทรหาฉัน'],
  ] },
  { f: [['reproduce', 'v', 'สืบพันธุ์, ทำซ้ำ'], ['reproduction', 'n', 'การสืบพันธุ์'], ['reproductive', 'adj', 'เกี่ยวกับการสืบพันธุ์']], q: [
    ['Rabbits ___ quickly.', 'reproduce', 'กระต่ายสืบพันธุ์เร็ว'],
    ['The painting is a ___.', 'reproduction', 'ภาพวาดนี้เป็นของจำลอง'],
  ] },
  { f: [['reside', 'v', 'พำนัก'], ['residence', 'n', 'ที่พักอาศัย'], ['resident', 'n', 'ผู้อยู่อาศัย'], ['residential', 'adj', 'เกี่ยวกับที่อยู่อาศัย']], q: [
    ['It is a quiet ___ area.', 'residential', 'เป็นย่านที่อยู่อาศัยที่เงียบสงบ'],
  ] },
  { f: [['resist', 'v', 'ต่อต้าน'], ['resistance', 'n', 'การต่อต้าน'], ['resistant', 'adj', 'ทนทาน']], q: [
    ['I can\'t ___ chocolate.', 'resist', 'ฉันอดช็อกโกแลตไม่ได้'],
    ['The plan met strong ___.', 'resistance', 'แผนนี้ถูกต่อต้านอย่างหนัก'],
    ['The material is water-___.', 'resistant', 'วัสดุนี้กันน้ำได้'],
  ] },
  { f: [['resolve', 'v', 'แก้ไข, ตัดสินใจ'], ['resolution', 'n', 'การแก้ไข, มติ']], q: [
    ['We must ___ this problem.', 'resolve', 'เราต้องแก้ปัญหานี้'],
    ['The ___ was passed.', 'resolution', 'มติได้รับการผ่าน'],
  ] },
  { f: [['restrict', 'v', 'จำกัด'], ['restriction', 'n', 'ข้อจำกัด'], ['restrictive', 'adj', 'เข้มงวด'], ['restricted', 'adj', 'ถูกจำกัด']], q: [
    ['Access is ___ to staff.', 'restricted', 'การเข้าถึงจำกัดเฉพาะพนักงาน'],
  ] },
  { f: [['retire', 'v', 'เกษียณ'], ['retirement', 'n', 'การเกษียณ'], ['retired', 'adj', 'เกษียณแล้ว']], q: [
    ['He will ___ next year.', 'retire', 'เขาจะเกษียณปีหน้า'],
    ['She enjoys her ___.', 'retirement', 'เธอเพลิดเพลินกับชีวิตหลังเกษียณ'],
    ['My father is ___.', 'retired', 'พ่อของฉันเกษียณแล้ว'],
  ] },
  { f: [['reveal', 'v', 'เปิดเผย'], ['revelation', 'n', 'การเปิดเผย']], q: [
    ['The test will ___ the truth.', 'reveal', 'การทดสอบจะเปิดเผยความจริง'],
    ['The report was a ___.', 'revelation', 'รายงานนี้เป็นการเปิดเผยที่น่าตกใจ'],
  ] },
  { f: [['revolution', 'n', 'การปฏิวัติ'], ['revolutionary', 'adj', 'ปฏิวัติ'], ['revolutionize', 'v', 'ปฏิวัติ']], q: [
    ['The phone was a ___ invention.', 'revolutionary', 'โทรศัพท์เป็นสิ่งประดิษฐ์ที่ปฏิวัติวงการ'],
    ['The ___ began in 1789.', 'revolution', 'การปฏิวัติเริ่มในปี 1789'],
  ] },
  { f: [['ridiculous', 'adj', 'น่าขัน'], ['ridicule', 'n', 'การเยาะเย้ย']], q: [
    ['They faced public ___.', 'ridicule', 'พวกเขาเผชิญการเยาะเย้ยของสาธารณชน'],
    ['That\'s a ___ idea.', 'ridiculous', 'นั่นเป็นความคิดที่ไร้สาระ'],
  ] },
  { f: [['scholar', 'n', 'นักวิชาการ'], ['scholarship', 'n', 'ทุนการศึกษา'], ['scholarly', 'adj', 'เชิงวิชาการ']], q: [
    ['She won a ___ to study abroad.', 'scholarship', 'เธอได้ทุนเรียนต่อต่างประเทศ'],
    ['He is a respected ___.', 'scholar', 'เขาเป็นนักวิชาการที่ได้รับความเคารพ'],
  ] },
  { f: [['significant', 'adj', 'สำคัญ'], ['significance', 'n', 'ความสำคัญ'], ['significantly', 'adv', 'อย่างมีนัยสำคัญ'], ['signify', 'v', 'หมายถึง']], q: [
    ['Prices fell ___.', 'significantly', 'ราคาลดลงอย่างมีนัยสำคัญ'],
    ['This is a ___ discovery.', 'significant', 'นี่เป็นการค้นพบที่สำคัญ'],
  ] },
  { f: [['simulate', 'v', 'จำลอง'], ['simulation', 'n', 'การจำลอง'], ['simulator', 'n', 'เครื่องจำลอง']], q: [
    ['Pilots train on a flight ___.', 'simulator', 'นักบินฝึกกับเครื่องจำลองการบิน'],
    ['The ___ showed the result.', 'simulation', 'การจำลองแสดงผล'],
  ] },
  { f: [['solid', 'adj', 'แข็ง, มั่นคง'], ['solidarity', 'n', 'ความเป็นหนึ่งเดียว'], ['solidify', 'v', 'แข็งตัว']], q: [
    ['Water becomes ___ as ice.', 'solid', 'น้ำกลายเป็นของแข็งเมื่อเป็นน้ำแข็ง'],
    ['They showed ___ with workers.', 'solidarity', 'พวกเขาแสดงความเป็นปึกแผ่นกับคนงาน'],
  ] },
  { f: [['specialize', 'v', 'เชี่ยวชาญเฉพาะ'], ['specialist', 'n', 'ผู้เชี่ยวชาญ'], ['speciality', 'n', 'ความเชี่ยวชาญ'], ['specialized', 'adj', 'เฉพาะทาง']], q: [
    ['She is a heart ___.', 'specialist', 'เธอเป็นผู้เชี่ยวชาญด้านหัวใจ'],
    ['It needs ___ training.', 'specialized', 'ต้องการการฝึกเฉพาะทาง'],
  ] },
  { f: [['speculate', 'v', 'คาดเดา'], ['speculation', 'n', 'การคาดเดา'], ['speculative', 'adj', 'เป็นการเก็งกำไร']], q: [
    ['I won\'t ___ about the cause.', 'speculate', 'ฉันจะไม่คาดเดาถึงสาเหตุ'],
    ['There is much ___ about the result.', 'speculation', 'มีการคาดเดามากมายเกี่ยวกับผล'],
  ] },
  { f: [['stable', 'adj', 'มั่นคง'], ['stability', 'n', 'ความมั่นคง'], ['stabilize', 'v', 'ทำให้มั่นคง'], ['unstable', 'adj', 'ไม่มั่นคง']], q: [
    ['The ladder is not ___.', 'stable', 'บันไดไม่มั่นคง'],
    ['Political ___ matters.', 'stability', 'เสถียรภาพทางการเมืองสำคัญ'],
  ] },
  { f: [['statistic', 'n', 'สถิติ(ตัวเลข)'], ['statistics', 'n', 'สถิติ'], ['statistical', 'adj', 'เชิงสถิติ'], ['statistically', 'adv', 'ทางสถิติ']], q: [
    ['The ___ look good.', 'statistics', 'ตัวเลขสถิติดูดี'],
    ['It is a ___ fact.', 'statistical', 'เป็นข้อเท็จจริงเชิงสถิติ'],
  ] },
  { f: [['strategy', 'n', 'กลยุทธ์'], ['strategic', 'adj', 'เชิงกลยุทธ์'], ['strategically', 'adv', 'อย่างมีกลยุทธ์']], q: [
    ['We need a new ___.', 'strategy', 'เราต้องการกลยุทธ์ใหม่'],
    ['The base is ___ placed.', 'strategically', 'ฐานทัพตั้งในจุดยุทธศาสตร์'],
  ] },
  { f: [['structure', 'n', 'โครงสร้าง'], ['structural', 'adj', 'เชิงโครงสร้าง'], ['structured', 'adj', 'มีโครงสร้าง']], q: [
    ['The ___ of the bridge is strong.', 'structure', 'โครงสร้างของสะพานแข็งแรง'],
    ['There was ___ damage to the building.', 'structural', 'อาคารเสียหายที่โครงสร้าง'],
  ] },
  { f: [['subscribe', 'v', 'สมัครสมาชิก'], ['subscription', 'n', 'การสมัครสมาชิก'], ['subscriber', 'n', 'สมาชิก']], q: [
    ['Please ___ to our channel.', 'subscribe', 'กรุณากดติดตามช่องของเรา'],
    ['A yearly ___ costs 500 baht.', 'subscription', 'สมาชิกรายปีราคา 500 บาท'],
  ] },
  { f: [['substitute', 'v', 'แทนที่'], ['substitution', 'n', 'การแทนที่']], q: [
    ['You can ___ honey for sugar.', 'substitute', 'คุณใช้น้ำผึ้งแทนน้ำตาลได้'],
    ['The ___ of one player changed the game.', 'substitution', 'การเปลี่ยนตัวผู้เล่นเปลี่ยนเกม'],
  ] },
  { f: [['succession', 'n', 'ความต่อเนื่อง'], ['successive', 'adj', 'ติดต่อกัน'], ['successor', 'n', 'ผู้สืบทอด']], q: [
    ['He won three ___ games.', 'successive', 'เขาชนะสามเกมติดต่อกัน'],
    ['She is the ___ to the manager.', 'successor', 'เธอเป็นผู้สืบทอดตำแหน่งผู้จัดการ'],
  ] },
  { f: [['suffer', 'v', 'ทนทุกข์'], ['suffering', 'n', 'ความทุกข์ทรมาน']], q: [
    ['Many people ___ from stress.', 'suffer', 'หลายคนทุกข์จากความเครียด'],
    ['War causes great ___.', 'suffering', 'สงครามก่อให้เกิดความทุกข์ทรมานอย่างมาก'],
  ] },
  { f: [['sufficient', 'adj', 'เพียงพอ'], ['sufficiently', 'adv', 'เพียงพอ'], ['insufficient', 'adj', 'ไม่เพียงพอ']], q: [
    ['Is the room ___ large?', 'sufficiently', 'ห้องใหญ่พอไหม'],
  ] },
  { f: [['suppress', 'v', 'ปราบปราม'], ['suppression', 'n', 'การปราบปราม']], q: [
    ['The army tried to ___ the protest.', 'suppress', 'กองทัพพยายามปราบการประท้วง'],
    ['The ___ of free speech is wrong.', 'suppression', 'การปิดกั้นเสรีภาพการพูดเป็นสิ่งผิด'],
  ] },
  { f: [['sustain', 'v', 'รักษาไว้'], ['sustainable', 'adj', 'ยั่งยืน'], ['sustainability', 'n', 'ความยั่งยืน']], q: [
    ['The farm uses ___ methods.', 'sustainable', 'ฟาร์มใช้วิธีที่ยั่งยืน'],
    ['Food can ___ life.', 'sustain', 'อาหารหล่อเลี้ยงชีวิตได้'],
    ['We care about ___.', 'sustainability', 'เราใส่ใจเรื่องความยั่งยืน'],
  ] },
  { f: [['technique', 'n', 'เทคนิค'], ['technical', 'adj', 'ทางเทคนิค'], ['technician', 'n', 'ช่างเทคนิค'], ['technological', 'adj', 'ทางเทคโนโลยี']], q: [
    ['He is a lab ___.', 'technician', 'เขาเป็นช่างเทคนิคห้องแล็บ'],
  ] },
  { f: [['transform', 'v', 'เปลี่ยนแปลง'], ['transformation', 'n', 'การเปลี่ยนแปลง']], q: [
    ['Technology can ___ lives.', 'transform', 'เทคโนโลยีเปลี่ยนชีวิตได้'],
    ['The ___ was amazing.', 'transformation', 'การเปลี่ยนแปลงน่าทึ่ง'],
  ] },
  { f: [['transmit', 'v', 'ส่งผ่าน'], ['transmission', 'n', 'การส่งผ่าน'], ['transmitter', 'n', 'เครื่องส่ง']], q: [
    ['Mosquitoes ___ the disease.', 'transmit', 'ยุงแพร่เชื้อโรค'],
    ['The ___ was clear.', 'transmission', 'การส่งสัญญาณชัดเจน'],
  ] },
  { f: [['transparent', 'adj', 'โปร่งใส'], ['transparency', 'n', 'ความโปร่งใส']], q: [
    ['Glass is ___.', 'transparent', 'แก้วโปร่งใส'],
    ['We demand more ___.', 'transparency', 'เราเรียกร้องความโปร่งใสมากขึ้น'],
  ] },
  { f: [['tremendous', 'adj', 'มหาศาล'], ['tremendously', 'adv', 'อย่างมาก']], q: [
    ['She made a ___ effort.', 'tremendous', 'เธอพยายามอย่างมหาศาล'],
    ['I enjoyed it ___.', 'tremendously', 'ฉันสนุกกับมันมาก'],
  ] },
  { f: [['unify', 'v', 'รวมเป็นหนึ่ง'], ['unity', 'n', 'ความเป็นเอกภาพ'], ['unification', 'n', 'การรวมเป็นหนึ่ง'], ['unified', 'adj', 'ที่เป็นหนึ่งเดียว']], q: [
    ['The goal is to ___ the country.', 'unify', 'เป้าหมายคือรวมประเทศเป็นหนึ่ง'],
    ['We need ___ now.', 'unity', 'ตอนนี้เราต้องการความสามัคคี'],
  ] },
  { f: [['utilize', 'v', 'ใช้ประโยชน์'], ['utility', 'n', 'สาธารณูปโภค, ประโยชน์'], ['utilization', 'n', 'การใช้ประโยชน์']], q: [
    ['The bills include the ___ costs.', 'utility', 'ใบแจ้งหนี้รวมค่าสาธารณูปโภค'],
    ['We ___ all our resources.', 'utilize', 'เราใช้ทรัพยากรทุกอย่างให้เป็นประโยชน์'],
  ] },
  { f: [['variation', 'n', 'ความแปรผัน'], ['varied', 'adj', 'หลากหลาย']], q: [
    ['He has a ___ diet.', 'varied', 'เขากินอาหารหลากหลาย'],
  ] },
  { f: [['verify', 'v', 'ตรวจสอบ'], ['verification', 'n', 'การตรวจสอบ']], q: [
    ['Please ___ your email.', 'verify', 'กรุณายืนยันอีเมลของคุณ'],
    ['The ___ takes a day.', 'verification', 'การตรวจสอบใช้เวลาหนึ่งวัน'],
  ] },
  { f: [['violate', 'v', 'ฝ่าฝืน'], ['violation', 'n', 'การละเมิด']], q: [
    ['Drivers who ___ the law pay fines.', 'violate', 'คนขับที่ฝ่าฝืนกฎหมายถูกปรับ'],
  ] },
  { f: [['visibly', 'adv', 'เห็นได้ชัด'], ['invisible', 'adj', 'มองไม่เห็น']], q: [
    ['She was ___ upset.', 'visibly', 'เธอเสียใจอย่างเห็นได้ชัด'],
    ['Air is ___.', 'invisible', 'อากาศมองไม่เห็น'],
  ] },
  { f: [['volunteer', 'n', 'อาสาสมัคร'], ['voluntary', 'adj', 'โดยสมัครใจ'], ['voluntarily', 'adv', 'โดยสมัครใจ']], q: [
    ['He left the job ___.', 'voluntarily', 'เขาลาออกจากงานโดยสมัครใจ'],
    ['She works as a ___ at the shelter.', 'volunteer', 'เธอเป็นอาสาสมัครที่ศูนย์พักพิง'],
  ] },
  { f: [['vulnerable', 'adj', 'เปราะบาง'], ['vulnerability', 'n', 'ความเปราะบาง']], q: [
    ['Old people are more ___.', 'vulnerable', 'ผู้สูงอายุเปราะบางกว่า'],
    ['Hackers target the ___.', 'vulnerability', 'แฮกเกอร์เล็งไปที่จุดอ่อน'],
  ] },
  { f: [['welfare', 'n', 'สวัสดิการ'], ['well-being', 'n', 'ความเป็นอยู่ที่ดี']], q: [
    ['Exercise improves mental ___.', 'well-being', 'การออกกำลังกายทำให้สุขภาพจิตดีขึ้น'],
    ['Child ___ is a priority.', 'welfare', 'สวัสดิการเด็กเป็นเรื่องสำคัญ'],
  ] },
];
