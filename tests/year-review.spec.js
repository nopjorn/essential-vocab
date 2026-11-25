// Year in review (1.259.0): slides from the activity log (time, % right, favourite game, time of day), the mastered column of the
// daily snapshots, the TOEIC mock, and "since you started" wording for a learner who began during the year.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

// 20 days from 10 Oct 2025, 30 answers a day (10 flashcards); most answers at 20:00, the morning ones all right.
const seed = () => {
  S.hist = {}; S.chist = {}; S.act = {}; S.snap = {}; S.read = {}; S.ach = {}; S.xpWeek = {};
  const h = Array(24).fill(0), hj = Array(24).fill(0), hr = Array(24).fill(0);
  h[20] = 25; hj[20] = 25; hr[20] = 15; h[7] = 5; hj[7] = 5; hr[7] = 5;
  for (let i = 0; i < 20; i++) {
    const k = ymd(new Date(2025, 9, 10 + i));
    S.hist[k] = 30; S.chist[k] = 10;
    S.act[k] = { card: [10, 300, 10, 8], game: [20, 600, 20, 18], x: { g: { cloze: [15, 400, 15, 14], spell: [5, 200, 5, 4], tower: [99, 1, 0, 0] }, h: [...h], hj: [...hj], hr: [...hr] } };
  }
  S.snap['2025-10-10'] = [5, 0, 5, 0]; S.snap['2025-10-29'] = [120, 10, 150, 12];
  S.mock = [{ t: Date.parse('2025-10-20T10:00:00'), L: 200, R: 250, p: {} }, { t: Date.parse('2025-10-28T10:00:00'), L: 260, R: 280, p: {} }, { t: Date.parse('2024-06-01T10:00:00'), L: 400, R: 400, p: {} }];
};

test('year in review: time, % right, mastered, favourite game, time of day, mock; "since you started" for a new learner', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 744 });
  const errors = await openApp(page, { placedAt: '2025-10-10' });
  const s = await page.evaluate((src) => { eval(src)(); const st = yearStats(2025); return { st, slides: yearSlides(st) }; }, `(${seed})`);
  expect(s.st).toMatchObject({ fresh: true, first: '2025-10-10', span: 83, days: 20, mins: 300, actDays: 20, timeFrom: null, acc: 87, learned: 150, mastered: 12 });
  expect(s.st.fav).toEqual([['cloze', 300], ['spell', 100]]); // not the fun-zone tower (not a game in GAMES)
  expect(s.st.busy.t).toBe('ค่ำ 18–21 น.');
  expect(s.st.sharp.t).toBe('เช้า 06–09 น.');
  expect(s.st.mock).toEqual({ n: 2, best: 540, first: 450, last: 540 }); // the 2024 mock is left out
  const line = (e) => s.slides.find((x) => x.e === e);
  expect(line('🎊').line).toContain('ตั้งแต่เริ่มเรียนเมื่อ 10 ต.ค. 68');
  expect(line('📅').line).toContain('จาก 83 วันนับตั้งแต่เริ่ม');
  expect(line('⏱️').big).toBe('5 ชม.');
  expect(line('⏱️').line).toContain('เฉลี่ยวันละ 15 นาที');
  expect(line('✍️').line).toContain('ตอบถูก 87%');
  expect(line('🌱').line).toBe('คำที่เริ่มเรียนไปแล้ว');
  expect(line('🏆').big).toBe('12 คำ');
  expect(line('🕗').line).toContain('ตอบแม่นที่สุดช่วงเช้า (100%)');
  expect(line('🏁').line).toContain('ครั้งแรก 450 → ล่าสุด 540');

  // every slide fits a 320 px window, the share button is on the last one
  await page.evaluate(() => go('year', 2025));
  const seen = [];
  for (;;) {
    const r = await page.evaluate(() => {
      const big = document.querySelector('.year-big');
      const out = [...document.querySelectorAll('.year-slide *')].some((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 0.5 || b.left < -0.5); });
      return { big: big.textContent, fits: big.scrollWidth <= big.clientWidth + 1, out, next: !!document.getElementById('yNext'), share: !!document.getElementById('yShare') };
    });
    seen.push(r.big);
    expect(r.fits, `"${r.big}" is wider than its slide`).toBe(true);
    expect(r.out, `slide "${r.big}" has something off the screen`).toBe(false);
    if (!r.next) { expect(r.share).toBe(true); break; }
    await page.click('#yNext');
  }
  expect(seen).toEqual(expect.arrayContaining(['5 ชม.', 'เติมคำในประโยค', 'ค่ำ 18–21 น.', '540/990', '12 คำ', '+150']));

  // the time log started later than the first study day: the slide says from when it counts
  let t = await page.evaluate(() => { S.hist['2025-10-05'] = 4; const st = yearStats(2025); return { st, slides: yearSlides(st) }; });
  expect(t.st).toMatchObject({ fresh: true, first: '2025-10-05', timeFrom: '2025-10-10', days: 21 });
  expect(t.slides.find((x) => x.e === '⏱️').line).toContain('เริ่มนับเมื่อ 10 ต.ค. 68');

  // studied the year before too: "this year" wording, gains counted from the last snapshot before 1 January
  t = await page.evaluate(() => {
    S.hist['2024-12-30'] = 5; S.snap['2024-12-30'] = [0, 0, 3, 1]; S.xpWeek = { '2025-10-13': 40 }; S.xp = 100;
    const st = yearStats(2025); return { st, slides: yearSlides(st) };
  });
  expect(t.st).toMatchObject({ fresh: false, span: null, learned: 147, mastered: 11 });
  expect(t.slides.find((x) => x.e === '🎊').line).toContain('ในปีนี้');
  expect(t.slides.find((x) => x.e === '🌱').line).toBe('คำใหม่ที่เริ่มเรียนในปีนี้');
  expect(t.slides.find((x) => x.e === '🏆').line).toContain('ที่จำได้แล้วในปีนี้');
  expect(t.slides.find((x) => x.e === '📅').line).not.toContain('นับตั้งแต่เริ่ม');
  expect(t.slides.find((x) => x.e === '🚀').line).toContain('(ปีนี้ +40 XP)');

  // a light year: no activity log, no mock, few answers → those slides are simply left out
  t = await page.evaluate(() => { S.act = {}; S.mock = []; S.snap = {}; const st = yearStats(2025); return yearSlides(st).map((x) => x.e); });
  expect(t).toEqual(['🎊', '📅', '✍️', '⚡', '🚀']);
  expect(errors).toEqual([]);
});
