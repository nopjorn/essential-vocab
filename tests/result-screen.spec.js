// Result screen (1.163.0): stat tiles, the record line (new / how far off), skill tint, 🔊 on each word to review.
const { test, expect } = require('@playwright/test');
const { openApp, playRound } = require('./helpers');

test('a round ends with three stat tiles and how far the record is; the words to review have a speaker button', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', best: { en2th: 999 } });
  await page.evaluate(() => { gameSource = 'level'; startGame('en2th'); });
  await playRound(page, 'en2th'); // right, wrong, right … = 5 / 10
  const view = page.locator('#view');
  await expect(view.locator('.res-top')).toHaveClass(/sk-mean/);
  await expect(view.locator('.res-stats > div')).toHaveCount(3);
  await expect(view.locator('.res-stats > div').first()).toContainText('/10');
  await expect(view.locator('.res-stats > div').first()).toContainText('ตอบถูก');
  const score = await page.evaluate(() => S.best.en2th === 999 && +document.querySelectorAll('.res-stats b')[2].textContent.replace(/\D/g, '')); // read after the count-up below
  await expect.poll(() => page.evaluate(() => { const sc = +document.querySelectorAll('.res-stats b')[2].textContent.replace(/\D/g, ''); const gap = +document.querySelector('.res-best b').textContent; return sc + gap; })).toBe(1000);
  expect(score).not.toBe(false);
  await expect(view.locator('.res-best')).not.toHaveClass(/new/);
  // words to review: count, hint and a 🔊 per row that speaks the word (the star still toggles)
  const n = await view.locator('.wrong-list .wl').count();
  expect(n).toBeGreaterThan(0);
  await expect(view.locator('.wl-n')).toHaveText(String(n));
  await expect(view.locator('.wrong-list .wl-say')).toHaveCount(n);
  const word = (await view.locator('.wrong-list .wl b').first().textContent()).trim();
  await view.locator('.wrong-list .wl-say').first().click();
  expect(await page.evaluate(() => window.__said.at(-1))).toBe(word);
  expect(await page.evaluate((w) => !!S.star[w], word)).toBe(false);
  expect(errors).toEqual([]);
});

// en2th shows the English word: answer every question right through the option that carries its index
async function allRight(page) {
  const view = page.locator('#view');
  for (let n = 0; n < 12 && !(await view.locator('.result-emoji').count()); n++) {
    await view.locator('.q-prompt .word').waitFor();
    const idx = await page.evaluate(() => W.find((w) => w.w === document.querySelector('.q-prompt .word').textContent.trim()).idx);
    await view.locator(`.opt[data-i="${idx}"]`).click();
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click().catch(() => {});
    await expect.poll(async () => (await view.locator('.result-emoji').count()) || !(await view.locator('.opt.correct').count())).toBeTruthy();
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  return page.evaluate(() => S.best.en2th);
}

test('a new record says so and shows the old one; the first one just says new; a near miss says almost', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', best: { en2th: 10 } });
  const view = page.locator('#view');
  await page.evaluate(() => { gameSource = 'level'; startGame('en2th'); });
  const got = await allRight(page);
  await expect(view.locator('.res-best.new')).toContainText('สถิติใหม่!');
  await expect(view.locator('.res-best.new')).toContainText('เดิม 10 แต้ม');
  // first round of a game: nothing old to show
  await page.evaluate(() => { delete S.best.en2th; startGame('en2th'); });
  expect(await allRight(page)).toBe(got);
  await expect(view.locator('.res-best.new')).toHaveText('🏅 สถิติใหม่!');
  // a near miss: the same perfect round against a record 3 points higher
  await page.evaluate((b) => { S.best.en2th = b + 3; startGame('en2th'); }, got);
  await allRight(page);
  await expect(view.locator('.res-best')).toContainText(`😮 เกือบแล้ว! ขาดอีก 4 แต้ม`);
  expect(errors).toEqual([]);
});

test('survival uses the same record line', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', best: { survival: 50 } });
  const view = page.locator('#view');
  await page.evaluate(() => startGame('survival'));
  for (let k = 0; k < 60 && !(await view.locator('.result-emoji').count()); k++) { // any answers until the hearts run out
    await expect(view.locator('.opt, .result-emoji').first()).toBeVisible();
    if (await view.locator('.result-emoji').count()) break;
    await view.locator('.opt').nth(k % 4).click();
    await expect(view.locator('#reveal')).not.toBeEmpty();
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click();
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  const right = await page.evaluate(() => +(document.querySelector('.h2').textContent.match(/\d+/) || [0])[0]);
  await expect(view.locator('.res-best')).toContainText(`ขาดอีก ${50 - right + 1} ข้อ จะทำลายสถิติ`);
  expect(errors).toEqual([]);
});
