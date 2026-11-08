// Work email / chat phrases (1.199.0): reference page (category chips, tap to speak) and game `wphr` in both question modes.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('the phrase page lists every phrase, filters by category and speaks a tapped one', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toWp').click();
  await expect(page.locator('#wpList .pair-ex').first()).toBeVisible();
  const n = await page.evaluate(() => WORKPHR.length);
  await expect(page.locator('#wpList .pair-ex')).toHaveCount(n);
  await page.locator('#wpCats [data-c="close"]').click();
  await expect(page.locator('#wpList .pair-card')).toHaveCount(1);
  await expect(page.locator('#wpList')).toContainText('look forward to');
  await page.locator('#wpList .pair-ex').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
  await page.locator('#wpPlay').click();
  await expect(page.locator('.options .opt')).toHaveCount(4);
  expect(errors).toEqual([]);
});

for (const mode of ['fill', 'pick']) {
  test(`wphr game, ${mode} mode: right answer, then wrong answer, Thai tip shown and graded`, async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(async (m) => { await loadWorkPhr(); wpMode = m; startGame('wphr'); }, mode);
    const view = page.locator('#view');
    await expect(view.locator('.q-prompt')).toContainText(mode === 'fill' ? 'เติมคำ' : 'เลือกประโยค');
    const right = () => page.evaluate((m) => { const r = playQuiz.cur._wp; return m === 'fill' ? r.key : r.plain; }, mode);
    if (mode === 'fill') { await view.locator('#wpHint').click(); await expect(view.locator('#wpTh')).toBeVisible(); }
    const a = await right(), r = await page.evaluate(() => playQuiz.cur._wp);
    await view.locator('.opt').filter({ hasText: new RegExp(`^${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
    await expect(view.locator('#reveal mark')).toHaveText(r.key);
    await expect(view.locator('#reveal')).toContainText(r.tip);
    expect(await page.evaluate(() => window.__said.at(-1))).toBe(r.plain);
    await view.locator('#nextQ').click();
    const b = await right();
    await view.locator('.opt').filter({ hasNotText: b }).first().click();
    await expect(view.locator('.opt.wrong')).toHaveCount(1);
    await expect(view.locator('.opt.correct')).toHaveText(b);
    await page.evaluate(() => flushSave());
    const st = await readState(page);
    const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('wphr:'));
    expect(keys.length).toBe(2);
    expect(keys.some(([, p]) => p.x === 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
