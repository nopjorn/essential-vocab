// 💼 TOEIC hub (1.211.0): one page with today's plan, the mock, Part 1–7 accuracy, work-English games and pages, the TOEIC /
// business word lists; a game started here comes back here; reached from the games chip, stats card, home exam card and search.
const { test, expect } = require('@playwright/test');
const { openApp, playRound } = require('./helpers');

const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

test('hub without an exam: plan, parts with accuracy, work English, word lists; a part played here returns here', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] },
    lex: { 'toeic5:a': { s: 10, c: 9, d: Date.now() + 864e5 }, 'toeic5:b': { s: 10, c: 9, d: Date.now() - 1000 } } });
  await page.evaluate(() => go('toeic'));
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  await expect(page.locator('#thExam')).toBeVisible();
  await expect(page.locator('.th-plan .toeic-plan')).toContainText('ปูพื้นฐาน');
  await expect(page.locator('.th-parts').first().locator('.th-part')).toHaveCount(4);
  await expect(page.locator('.th-parts').nth(1).locator('.th-part')).toHaveCount(3);
  const p5 = page.locator('[data-thg="toeic5"]');
  await expect(p5).toContainText('แม่น 90%');
  await expect(p5).toContainText('ทวน 1');
  await expect(p5).toHaveClass(/good/);
  await expect(page.locator('.th-games [data-game="wphr"]')).toHaveCount(1);
  await expect(page.locator('.th-refs .ref-tile')).toHaveCount(3);
  await expect(page.locator('.th-wl')).toHaveCount(2);
  // play Part 5 from the hub: the result's back button lands on the hub again
  await p5.click();
  await playRound(page, 'toeic5');
  await page.locator('#back').click();
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  // a game started from the games menu still goes back to the games menu
  await page.evaluate(() => go('games'));
  await page.evaluate(() => startGame('toeic5'));
  await playRound(page, 'toeic5');
  await page.locator('#back').click();
  await expect(page.locator('#title')).toHaveText('เกมฝึกศัพท์');
  expect(errors).toEqual([]);
});

test('TOEIC words: study the group in flashcards, add it to the daily plan', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => go('toeic'));
  await page.locator('[data-thadd="TOE"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toContain('TOE');
  await expect(page.locator('.th-wl.lv-TOE .th-on')).toBeVisible();
  await page.locator('[data-thw="TOE"]').click();
  const word = await page.locator('.fc .word').first().textContent();
  expect(await page.evaluate((t) => W.find((w) => w.w === t.trim()).g, word)).toBe('TOE');
  expect(errors).toEqual([]);
});

test('with a TOEIC exam: countdown + its plan; the ways in: games chip, stats card, home exam card, search', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], exam: { date: inDays(10), name: 'สอบ TOEIC' } },
    lex: { 'toeic2:a': { s: 4, c: 3, d: Date.now() + 864e5 } } });
  await page.evaluate(() => go('toeic'));
  await expect(page.locator('.th-count b')).toHaveText('10');
  await expect(page.locator('.th-plan')).toContainText('โค้งสุดท้าย');
  await page.locator('#topBack').click();
  await expect(page.locator('#title')).toHaveText('เกมฝึกศัพท์');
  // games menu chip → banner
  await page.locator('#gSkill [data-skill="toeic"]').click();
  await page.locator('#toToeic').click();
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  // home exam card
  await page.evaluate(() => go('home'));
  await page.locator('[data-go-toeic]').click();
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  await page.locator('#topBack').click();
  await expect(page.locator('#title')).toHaveText('ศัพท์ต้องรู้');
  // stats card
  await page.evaluate(() => go('stats'));
  await page.locator('#toeicHub').click();
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  // search
  expect(await page.evaluate(() => gsSearch('ศูนย์ toeic').pages.some((p) => p.ic === '💼'))).toBe(true);
  await page.evaluate(() => openSearch());
  await page.locator('#gsq').fill('ศูนย์ TOEIC');
  await page.locator('.gs-row', { hasText: 'ศูนย์ TOEIC' }).first().click();
  await expect(page.locator('#title')).toHaveText('ศูนย์ TOEIC');
  expect(errors).toEqual([]);
});

test('no exam yet: the button opens settings with the exam row found', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('toeic'));
  await page.locator('#thExam').click();
  await expect(page.locator('#setQ')).toHaveValue('วันสอบ');
  await expect(page.locator('#examDate')).toBeVisible();
  await expect(page.locator('#examName')).toHaveValue('สอบ TOEIC');
  expect(errors).toEqual([]);
});
