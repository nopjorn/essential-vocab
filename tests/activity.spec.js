// Activity by kind (1.158.0): every answer is logged under what was being used (S.act: day → kind → [answers, seconds]),
// survives reload / merges from a backup, and the stats page draws it as stacked bars + the "ใช้เวลากับอะไรบ้าง" box.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('answers are logged by kind with a rough time, kept on reload, cleaned and merged from a backup', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const act = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    go('cards'); grade(w('apple'), 2);
    go('feed'); gameResult(w('house'), true);
    go('games'); actGame = 'phrasal'; markActive();
    actGame = 'en2th'; markActive();
    go('tower'); markActive();
    go('mtest'); markActive();
    flushSave();
    return S.act[today()];
  });
  expect(Object.keys(act).sort()).toEqual(['card', 'feed', 'fun', 'game', 'other', 'skill', 'x']);
  for (const [k, v] of Object.entries(act)) { if (k === 'x') continue; expect(v[0]).toBe(1); expect(v[1]).toBeGreaterThan(0); }
  expect(act.card.slice(2)).toEqual([1, 1]);   // graded "จำได้" = judged + right
  expect(act.feed.slice(2)).toEqual([1, 1]);
  expect(act.other.slice(2)).toEqual([0, 0]);  // markActive() without ok = not judged
  expect(Object.keys(act.x.g).sort()).toEqual(['cards', 'en2th', 'feed', 'mtest', 'phrasal', 'tower']);
  expect(act.x.h.reduce((a, b) => a + b, 0)).toBe(6);
  expect(act.x.ss[0]).toBe(1);
  expect((await readState(page)).act).toBeTruthy();
  const merged = await page.evaluate(() => {
    const t = today();
    mergeBackup({ act: { [t]: { card: [5, 100], read: [2, 30], bogus: [1, 1], x: { g: { cafe: [4, 50, 4, 3], '<x>': [1, 1] }, e: { speak: 9, hack: 3 }, h: [1, 2], on: 600 } }, '2020-01-01': { game: [3, 40] }, bad: { card: [1, 1] }, '2020-01-02': 'x' } });
    return S.act;
  });
  const t = await page.evaluate(() => today());
  expect(merged[t].card).toEqual([5, 100, 1, 1]);
  expect(merged[t].read).toEqual([2, 30, 0, 0]);
  expect(merged[t].x.g.cafe).toEqual([4, 50, 4, 3]);
  expect(merged[t].x.g['<x>']).toBeUndefined();
  expect(merged[t].x.e.speak).toBe(9);
  expect(merged[t].x.e.hack).toBeUndefined();
  expect(merged[t].x.h.length).toBe(24); // an odd hour list is dropped, ours stays
  expect(merged[t].x.on).toBe(600);
  expect(merged[t].bogus).toBeUndefined();
  expect(merged['2020-01-01'].game).toEqual([3, 40, 0, 0]);
  expect(merged.bad).toBeUndefined();
  const loaded = await page.evaluate(() => { flushSave(); const d = JSON.parse(localStorage.getItem('oxford3000.v1')); d.act = { '2026-01-01': { card: ['x', 1], feed: [2, 9] }, junk: 5 }; localStorage.setItem('oxford3000.v1', JSON.stringify(d)); return load().act; });
  expect(loaded).toEqual({ '2026-01-01': { feed: [2, 9, 0, 0] } });
  expect(errors).toEqual([]);
});

test('stats page: stacked bars by kind, minutes switch and the breakdown box', async ({ page }) => {
  const key = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const errors = await openApp(page, {
    placedAt: '2026-01-01', chistFrom: key(20),
    hist: { [key(0)]: 30, [key(1)]: 12, [key(25)]: 9 }, chist: { [key(1)]: 4 },
    act: { [key(0)]: { card: [10, 300, 10, 8], feed: [8, 200, 8, 6], skill: [6, 240], fun: [6, 600],
      x: { g: { cards: [10, 300, 10, 8], feed: [8, 200, 8, 6], phrasal: [6, 240], tower: [6, 600] }, h: Array.from({ length: 24 }, (_, i) => (i === 20 ? 25 : i === 7 ? 5 : 0)), e: { speak: 12, sheet: 3, open: 2 }, ss: [3, 900], on: 2400 } } },
  });
  await page.evaluate(() => go('stats'));
  const host = page.locator('[data-chart="act"]');
  for (const id of ['card', 'feed', 'skill', 'fun', 'unk']) await expect(host.locator(`rect.a-${id}`).first()).toBeAttached();
  await expect(host.locator('.legend')).toContainText('โซนสนุก');
  await expect(host.locator('.legend')).toContainText('ยังไม่แยกประเภท');
  const tip = await host.locator('rect.hit').last().getAttribute('data-tip');
  expect(tip).toContain('30 ข้อ');
  expect(tip).toContain('สนุก 6');
  await host.locator('[data-am="sec"]').click();
  await expect(host.locator('[data-am="sec"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(host.locator('rect.a-unk')).toHaveCount(0);
  expect(await host.locator('rect.hit').last().getAttribute('data-tip')).toContain('≈ 22 นาที');
  const box = page.locator('#actBox');
  await expect(box).toContainText('30 ข้อ');
  await expect(box.locator('.act-rows').first().locator('.act-row')).toHaveCount(4);
  await expect(box.locator('.act-row').first()).toContainText('โซนสนุก'); // most time first
  await expect(box.locator('.act-row', { hasText: 'แฟลชการ์ด' }).first()).toContainText('ถูก 80%');
  await expect(box).toContainText('78%');            // 14 right of 18 judged
  await expect(box).toContainText('40 นาที');         // app open
  await expect(box).toContainText('เยอะสุด 20:00–21:00');
  await expect(box).toContainText('หอคอย');           // per game / page
  await expect(box.locator('.act-ev > div')).toHaveCount(3);
  await box.locator('.mb-b').nth(20).click();
  await expect(page.locator('#toast')).toContainText('20:00–21:00 · 25 ข้อ');
  await expect(page.locator('.today-act')).toContainText('78%');
  await box.locator('[data-as="28"]').click();
  await expect(box.locator('[data-as="28"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('stats page with no logged kinds yet shows the empty note', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { S.act = {}; go('stats'); });
  await expect(page.locator('#actBox')).toContainText('เริ่มเก็บรายละเอียด');
  expect(errors).toEqual([]);
});

test('1.160.0 stats: week compare, records, memory buckets, near mastery, repeated misses, game speed and gains, reading, time goal', async ({ page }) => {
  const key = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const act = {}, hist = {};
  for (let k = 0; k < 14; k++) {
    const good = k < 7; // this week 90 %, the week before 60 %
    act[key(k)] = { card: [10, 300, 10, good ? 9 : 6], x: { g: { en2th: [10, 50, 10, good ? 9 : 6] }, ss: [1, 600 + k] } };
    hist[key(k)] = 10;
  }
  hist[key(30)] = 99;
  const DAY = 864e5;
  const errors = await openApp(page, {
    placedAt: '2026-01-01', hist, act, counts: { maxCombo: 21 }, xpWeek: { '2026-01-05': 500 },
    prog: { apple: { b: 3, i: 10, e: 2.5, d: Date.now() + 2 * DAY, s: 3, c: 3, x: 0 }, house: { b: 5, i: 120, e: 2.5, d: Date.now() + 99 * DAY, s: 6, c: 6, x: 0 }, cat: { b: 1, i: 1, e: 2.5, d: Date.now(), s: 1, c: 1, x: 0 } },
    miss: { [key(1)]: { apple: 2, dog: 1, red: 1, cat: 1 }, [key(3)]: { apple: 1, dog: 2, book: 1 } },
    settings: { levels: ['A1'], timeGoal: 10 },
  });
  await page.evaluate(() => go('stats'));
  const cmp = page.locator('.cmp-grid');
  await expect(cmp).toContainText('70');            // answers this week
  await expect(cmp.locator('.cmp.up')).toContainText('30 จุด'); // 90 % vs 60 %
  const rec = page.locator('.rec-grid');
  await expect(rec).toContainText('99 ข้อ');
  await expect(rec).toContainText('21 ข้อติด');
  await expect(rec).toContainText('500 XP');
  const mem = page.locator('#memBox');
  await expect(mem.locator('.legend')).toContainText('ระยะยาว 1');
  await expect(mem.locator('[data-wsi]')).toHaveCount(1);
  await mem.locator('[data-wsi]').click();
  await expect(page.locator('.sheet-word')).toContainText('apple');
  await page.keyboard.press('Escape');
  const weak = page.locator('#weak');
  await expect(weak).toContainText('ผิดซ้ำหลายวัน');
  await expect(weak.locator('[data-weak="rep"]')).toContainText('2 คำ');
  const box = page.locator('#actBox');
  await expect(box).toContainText('5 วิ/ข้อ');
  await expect(box.locator('.up-list')).toContainText('▲ 30 จุด');
  // time goal ring: 10 min goal, today 5 min practised
  await expect(page.locator('.tg-ring')).toContainText('50%');
  await page.locator('[data-tg="0"]').click();
  await expect(page.locator('.tg-ring')).toHaveCount(0);
  expect(await page.evaluate(() => S.settings.timeGoal)).toBe(0);
  // reading by level once the stories have loaded
  await page.evaluate(async () => { await loadStories(); const st = STORIES.find((x) => x.level === 'A1'); S.read[st.id] = today(); S.readScore[st.id] = [4, 5]; go('stats'); });
  await expect(page.locator('#readyHost')).toContainText('เรื่องสั้นที่อ่านแล้ว');
  await expect(page.locator('#readyHost')).toContainText('80%');
  expect(errors).toEqual([]);
});

test('1.161.0 stats: hardest words, accuracy by level, growth, 30-day forecast and the CSV export', async ({ page }) => {
  const key = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const DAY = 864e5;
  const errors = await openApp(page, {
    placedAt: '2026-01-01', settings: { levels: ['A1'] },
    hist: { [key(0)]: 12, [key(1)]: 5 }, chist: { [key(0)]: 4 },
    act: { [key(0)]: { card: [4, 60, 4, 3], game: [8, 120, 8, 6], x: { g: { en2th: [8, 120, 8, 6] }, e: { speak: 3 }, ss: [2, 300], on: 900 } } },
    snap: { [key(1)]: [10, 2, 10, 2], [key(2)]: [4, 1, 4, 1] },
    prog: { apple: { b: 0, i: 0, e: 2.5, d: Date.now(), s: 8, c: 2, x: 6 }, house: { b: 1, i: 1, e: 2.5, d: Date.now() + 20 * DAY, s: 4, c: 2, x: 2 }, cat: { b: 2, i: 3, e: 2.5, d: Date.now() + 3 * DAY, s: 3, c: 3, x: 0 } },
  });
  await page.evaluate(() => { S.xpWeek[mondayKey()] = 250; go('stats'); });
  const hard = page.locator('#hardBox');
  await expect(hard.locator('.hard-row')).toHaveCount(2);
  await expect(hard.locator('.hard-row').first()).toContainText('ผิด 6 ครั้ง · ถูก 25%');
  await expect(page.locator('.h2', { hasText: 'ความแม่นแยกตามระดับ' })).toBeVisible();
  const grow = page.locator('#growBox');
  await expect(grow).toContainText('รวม 6 คำ');
  await expect(grow).toContainText('สัปดาห์นี้ 250 XP');
  await page.locator('.f30 summary').click();
  await expect(page.locator('.f30 .mb-b')).toHaveCount(30);
  await page.locator('#statCsv').click();
  const rows = await page.evaluate(() => exportStats.last);
  expect(rows[0][0]).toBe('date');
  const last = rows[rows.length - 1], col = (n) => last[rows[0].indexOf(n)];
  expect(col('answers')).toBe(12);
  expect(col('flashcards')).toBe(4);
  expect(col('minutes')).toBe(3);
  expect(col('right')).toBe(9);
  expect(col('speak_count')).toBe(3);
  expect(col('top_games')).toBe('en2th:8');
  await hard.locator('#hardGo').click();
  await expect(page.locator('.options .opt').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('1.216.0 day page: a tap on a bar opens that day in detail, ‹ › step days, back returns to stats', async ({ page }) => {
  const key = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const errors = await openApp(page, {
    placedAt: '2026-01-01', hist: { [key(1)]: 34, [key(2)]: 7 }, chist: { [key(1)]: 10 },
    act: { [key(1)]: { card: [10, 300, 10, 8], skill: [6, 240, 6, 3], fun: [6, 600],
      x: { g: { cards: [10, 300, 10, 8], phrasal: [6, 240, 6, 3], tower: [6, 600, 0, 0] }, h: Array.from({ length: 24 }, (_, i) => (i === 20 ? 20 : i === 7 ? 2 : 0)), e: { speak: 5 }, ss: [2, 800], on: 1800 } } },
    snap: { [key(3)]: [10, 2, 10, 2], [key(1)]: [25, 6, 25, 6] },
  });
  await page.evaluate(() => go('stats'));
  await page.locator('[data-chart="act"] rect.hit').nth(26).click();
  await expect(page.locator('#title')).toHaveText('กิจกรรมรายวัน');
  await expect(page.locator('.day-head')).toContainText('เมื่อวาน');
  const tiles = page.locator('.day-tiles');
  await expect(tiles).toContainText('34');     // answers
  await expect(tiles).toContainText('≈ 19 นาที');
  await expect(tiles).toContainText('69%');    // 11 right of 16 judged
  await expect(tiles).toContainText('+15');    // new words
  await expect(tiles).toContainText('+4');     // mastered
  await expect(page.locator('.act-row').first()).toContainText('โซนสนุก');
  await expect(page.getByText('อีก 12 ข้อยังไม่แยกประเภท')).toBeVisible();
  await expect(page.locator('.act-ev')).toContainText('5');
  await page.locator('.day-hours .mb-b').nth(20).click();
  await expect(page.locator('#toast')).toContainText('20:00–21:00 · 20 ข้อ');
  await page.locator('#dayPrev').click();
  await expect(page.locator('.day-head')).toContainText('2 วันก่อน');
  await expect(page.getByText('ก่อนเวอร์ชัน 1.158.0')).toBeVisible();
  await page.locator('#dayNext').click();
  await page.locator('#dayNext').click();
  await expect(page.locator('.day-head')).toContainText('วันนี้');
  await expect(page.locator('#dayNext')).toBeDisabled();
  await page.locator('#topBack').click();
  expect(await page.evaluate(() => current)).toBe('stats');
  expect(errors).toEqual([]);
});
