// Word chain (1.167.0): every next word starts with the last letter, the three options share that letter (pick by meaning),
// a wrong pick or the clock ends the run, dead-end letters jump to a fresh word, best / runs / links merge by max.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const pickRight = (page) => page.evaluate(() => { const s = runChain.state(); document.querySelectorAll('.ch-opts .opt')[s.opts.indexOf(s.answer)].click(); });

test('chain: options share the letter, right picks link on, a wrong pick ends with the record line', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] }, chain: { best: 3, runs: 1, links: 3 } });
  await page.evaluate(() => go('fun'));
  await page.click('[data-fun="chain"]');
  await page.click('#chGo');
  for (let k = 0; k < 4; k++) {
    await page.locator('.ch-opts .opt:not([disabled])').first().waitFor();
    const s = await page.evaluate(() => runChain.state());
    expect(s.opts).toHaveLength(3);
    expect(new Set(s.opts.map((w) => w[0])).size).toBe(1); // one letter for all three
    expect(s.answer[0]).toBe(s.cur.at(-1)); // the chain rule
    expect(s.opts).toContain(s.answer);
    await expect(page.locator('.ch-q .th')).toHaveText(await page.evaluate((w) => W.find((x) => x.w === w).t, s.answer));
    await pickRight(page);
    await expect.poll(() => page.evaluate(() => runChain.state().n)).toBe(k + 1);
  }
  await page.locator('.ch-opts .opt:not([disabled])').first().waitFor();
  await page.evaluate(() => { const s = runChain.state(); document.querySelectorAll('.ch-opts .opt')[s.opts.findIndex((w) => w !== s.answer)].click(); });
  await expect(page.locator('#reveal')).toContainText('คำที่ต่อได้คือ');
  await expect(page.locator('.h2')).toContainText('ต่อได้ 4 คำ');
  await expect(page.locator('.res-best.new')).toContainText('เดิม 3 คำ');
  await expect(page.locator('.ch-all .chip')).toHaveCount(5); // the start word + 4 links
  const st = await page.evaluate(() => S.chain);
  expect(st).toEqual({ best: 4, runs: 2, links: 7 });
  expect(errors).toEqual([]);
});

test('chain: running out of time ends the run; a dead-end letter jumps to a fresh word', async ({ page }) => {
  await page.clock.install();
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } });
  await page.evaluate(() => { go('chain'); });
  await page.click('#chGo');
  await page.locator('.ch-opts .opt').first().waitFor();
  await page.clock.fastForward(10500);
  await expect(page.locator('#reveal')).toContainText('หมดเวลา');
  await page.clock.fastForward(2000);
  await expect(page.locator('.h2')).toContainText('ต่อได้ 0 คำ');
  // a word ending in a letter no list word starts with: the chain carries on from a fresh word
  await page.click('#chAgain').catch(() => {});
  await page.evaluate(() => runChain('box'));
  await page.locator('.ch-opts .opt').first().waitFor();
  const s = await page.evaluate(() => runChain.state());
  expect(s.jumps).toBe(1);
  expect(s.cur).not.toBe('box');
  expect(s.answer[0]).toBe(s.cur.at(-1));
  await expect(page.locator('.ch-note')).toContainText('ไม่มีคำขึ้นต้นด้วย X');
  expect(errors).toEqual([]);
});

test('chain state merges by max and cleans odd values', async ({ page }) => {
  const errors = await openApp(page, { chain: { best: 5, runs: 9, links: 40 } });
  const m = await page.evaluate(() => { mergeBackup({ chain: { best: 8, runs: 2, links: 'x' } }); return { s: S.chain, bad: cleanChain({ best: -1, runs: 2.7 }) }; });
  expect(m.s).toEqual({ best: 8, runs: 9, links: 40 });
  expect(m.bad).toEqual({ best: 0, runs: 2, links: 0 });
  expect(errors).toEqual([]);
});
