// TOEIC plan on the home exam card + TOEIC listening in ฟังทบทวน (1.197.0).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

test('exam goal named TOEIC: today plan with parts, a mock in the last weeks, ticks after playing', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], exam: { date: inDays(10), name: 'สอบ TOEIC' } } });
  await page.evaluate(() => go('home'));
  const plan = page.locator('.toeic-plan');
  await expect(plan).toContainText('โค้งสุดท้าย');
  await expect(plan.locator('[data-tplan="toeicMock"]')).toHaveCount(1);
  await expect(plan.locator('.tp-item')).toHaveCount(4);
  const first = await plan.locator('.tp-item').nth(1).getAttribute('data-tplan');
  await plan.locator(`[data-tplan="${first}"]`).click();
  await expect(page.locator('.opt').first()).toBeVisible();
  await page.evaluate(() => go('home'));
  await expect(page.locator(`.toeic-plan [data-tplan="${first}"]`)).toHaveClass(/done/);
  // far away: 2 parts, no mock; a goal not about TOEIC: no plan
  await page.evaluate((d) => { S.settings.exam = { date: d, name: 'TOEIC' }; go('home'); }, inDays(90));
  await expect(page.locator('.toeic-plan')).toContainText('ปูพื้นฐาน');
  await expect(page.locator('.toeic-plan .tp-item')).toHaveCount(2);
  await page.evaluate((d) => { S.settings.exam = { date: d, name: 'IELTS' }; go('home'); }, inDays(30));
  await expect(page.locator('.exam-card')).toBeVisible();
  await expect(page.locator('.toeic-plan')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('ฟังทบทวน: TOEIC conversations play back to back with the Thai summary between', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('ear'));
  await page.locator('#earToeic').click();
  await expect(page.locator('.te-box')).toBeVisible();
  const st = await page.evaluate(() => playToeicEar.state());
  expect(st.n).toBe(6);
  const lines = await page.evaluate((id) => [...P34[3], ...P34[4]].find((d) => d.id === id).lines.map((l) => l[1]), st.ids[0]);
  await expect.poll(() => page.evaluate((n) => window.__said.slice(-n), lines.length)).toEqual(lines);
  await expect(page.locator('#teTh')).toContainText('🇹🇭');
  await page.locator('#teText').click();
  await page.locator('#teNext').click();
  await expect(page.locator('#tePos')).toHaveText('2/6');
  await expect(page.locator('#teLine')).not.toHaveText('🎧 …');
  await page.locator('#tePlay').click();
  expect((await page.evaluate(() => playToeicEar.state())).paused).toBe(true);
  await page.locator('#topBack').click(); // the in-page ‹ row is replaced by the top bar's back button
  await expect(page.locator('#earToeic')).toBeVisible();
  expect(errors).toEqual([]);
});
