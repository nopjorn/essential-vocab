// Fun features from 1.78: survival and time attack (1.78), challenge a friend (1.79), spelling games (1.80),
// auto difficulty (1.81), level map (1.82), word search (1.83), emoji on the word page (1.84).
const { test, expect } = require('@playwright/test');
const { openApp, readState, answer } = require('./helpers');

// `answer` learns where the right option sits from the first click, so that first answer may be either: report what happened.
async function play(page, ok, round) {
  expect(await answer(page, ok, round)).toBe(true);
  const reveal = page.locator('#view #reveal');
  await expect(reveal).not.toBeEmpty();
  return (await reveal.textContent()).includes('✅');
}

test('survival: 3 hearts, wrong answers end the run, level climbs every 5 questions, record kept', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; gameSource = 'all'; startGame('survival'); });
  const view = page.locator('#view'), round = {};
  const level = () => view.locator('.q-prompt').first().textContent();
  expect(await level()).toContain('A1');
  await expect(view.locator('#runStat')).toContainText('❤️❤️❤️');
  let rights = 0, lost = 0;
  const probe = await play(page, true, round); // first click is a probe
  if (probe) rights++; else lost++;
  while (rights < 6) {
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click();
    else await expect.poll(() => view.locator('#nextQ').count()).toBe(0);
    await expect(view.locator('.opt').first()).toBeVisible();
    if (rights + lost === 5) expect(await level()).toContain('A2');
    if (await play(page, true, round)) rights++;
  }
  await expect(view.locator('#runStat')).toContainText(`✅ ${rights}`);
  await expect(view.locator('#runStat')).toContainText('🖤'.repeat(lost) || '❤️');
  // now lose every remaining heart
  while (!(await view.locator('.result-emoji').count())) {
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click();
    await expect(view.locator('.opt, .result-emoji').first()).toBeVisible();
    if (await view.locator('.result-emoji').count()) break;
    await play(page, false, round);
    if ((await view.locator('#reveal').textContent()).includes('หัวใจหมดแล้ว')) { await view.locator('#nextQ').click(); break; }
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText(`รอดมาได้ ${rights} ข้อ`);
  expect((await readState(page)).best.survival).toBe(rights);
  expect(errors).toEqual([]);
});

test('survival: leaving early with ✕ shows the result; zero answers go back to the menu', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; startGame('survival'); });
  const view = page.locator('#view');
  await view.locator('#quit').click();
  await expect(view.locator('.game-tile').first()).toBeVisible();
  await page.evaluate(() => startGame('survival'));
  await answer(page, true, {});
  await view.locator('#quit').click();
  await expect(view.locator('.result-emoji')).toBeVisible();
  expect(errors).toEqual([]);
});

test('time attack: 60 s countdown ends the round, score = right answers, record kept', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; startGame('timeAttack'); });
  const view = page.locator('#view'), round = {};
  await expect(view.locator('#tLeft')).toBeVisible();
  let rights = 0;
  const step = async (ok) => {
    if (await play(page, ok, round)) rights++;
    await expect.poll(() => view.locator('#nextQ').count(), { timeout: 5000 }).toBe(0); // moves on by itself
    await expect(view.locator('.opt').first()).toBeVisible();
  };
  await step(true);
  for (let n = 0; n < 3; n++) await step(true);
  await step(false); // a wrong answer costs nothing but time
  await expect(view.locator('#runStat')).toContainText(`✅ ${rights}`);
  await page.evaluate(() => { const o = Date.now; Date.now = () => o() + 61000; }); // the minute is up
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText(`ตอบถูก ${rights} ข้อใน 60 วินาที`);
  expect((await readState(page)).best.timeAttack).toBe(rights);
  await view.locator('#again').click();
  await expect(view.locator('#tLeft')).toHaveText('60');
  expect(errors).toEqual([]);
});
