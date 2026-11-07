// Weekly boss (1.166.0): built from the learner's weakest words, 100 HP vs 3 hearts, crits on a streak, weekly rewards, merge.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const card = (x, c = 2) => ({ b: 1, i: 1, e: 2.5, d: Date.now(), s: 5, c, x, t: Date.now() });
const right = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.opt')]; o[funAsk.opts.indexOf(funAsk.cur)].click(); });
const wrong = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.opt')]; o[funAsk.opts.findIndex((x) => x !== funAsk.cur)].click(); });

test('too few learned words: the boss does not come out yet', async ({ page }) => {
  const errors = await openApp(page, { prog: { apple: card(0), house: card(0) } });
  await page.evaluate(() => go('wboss'));
  await expect(page.locator('#view')).toContainText('ยังไม่ออกมา');
  expect(errors).toEqual([]);
});

test('the boss words: misses in the last 21 days ×3, then leeches, filled up with the weakest learned words', async ({ page }) => {
  const day = new Date().toISOString().slice(0, 10);
  const prog = {}; ['apple', 'house', 'water', 'tree', 'book', 'chair', 'table', 'window'].forEach((w, k) => { prog[w] = card(k % 3); });
  prog.window = card(6); // a leech
  const errors = await openApp(page, { prog, miss: { [day]: { tree: 4, book: 1 } } });
  const ws = await page.evaluate(() => wbWords().map((w) => w.w));
  expect(ws.slice(0, 3)).toEqual(['tree', 'window', 'book']); // misses ×3 first, then the leech
  expect(ws.length).toBe(6); // only words answered wrong at least once (6 here, enough for a boss)
  expect(ws).not.toContain('apple');
  // fewer than 6 answered wrong: the weakest learned words fill in after them
  const fill = await page.evaluate(() => { S.miss = {}; Object.values(S.prog).forEach((p) => { p.x = 0; }); S.prog.chair.x = 2; return wbWords().map((w) => w.w); });
  expect(fill[0]).toBe('chair');
  expect(fill.length).toBe(8);
  await page.evaluate(() => go('fun'));
  await expect(page.locator('[data-fun="wboss"]')).toBeVisible();
  await page.click('[data-fun="wboss"]');
  await expect(page.locator('.wb-words .chip')).toHaveCount(8); // the page shows the boss words of now (the fill-in case above)
  expect(errors).toEqual([]);
});

test('battle: hits and crits, a wrong answer costs a heart and brings the word back, a win pays once a week', async ({ page }) => {
  const prog = {}; ['apple', 'house', 'water', 'tree', 'book', 'chair', 'table', 'window'].forEach((w) => { prog[w] = card(2); });
  const errors = await openApp(page, { prog });
  const coins0 = await page.evaluate(() => { go('wboss'); return coinBal(); });
  await page.click('#wbGo');
  await page.locator('.opt').first().waitFor();
  const missed = await page.evaluate(() => funAsk.cur.w);
  await wrong(page);
  await expect.poll(() => page.evaluate(() => runWboss.state().hearts)).toBe(2);
  expect((await page.evaluate(() => runWboss.state())).queue.slice(0, 3)).toContain(missed);
  const hp = [];
  for (let k = 0; k < 6; k++) {
    await page.locator('.opt:not([disabled])').first().waitFor();
    await right(page);
    await expect.poll(() => page.evaluate(() => runWboss.state().hp)).toBeLessThan(hp.length ? hp.at(-1) : 100);
    hp.push(await page.evaluate(() => runWboss.state().hp));
  }
  expect(hp).toEqual([88, 76, 56, 36, 16, 0]); // 12, 12, then 20s from the third in a row
  await expect(page.locator('#wbAgain')).toBeVisible();
  await expect(page.locator('#view')).toContainText('ปราบ');
  const s = await page.evaluate(() => ({ wb: S.wboss, coins: coinBal(), k: mondayKey() }));
  expect(s.wb).toMatchObject({ k: s.k, win: true, tries: 1, low: 0, wins: 1 });
  expect(s.coins - coins0).toBe(40);
  // a second win the same week: fewer coins, the weeks-won count stays
  await page.click('#wbAgain');
  for (let k = 0; k < 6; k++) { await page.locator('.opt:not([disabled])').first().waitFor(); await right(page); await expect.poll(() => page.evaluate(() => runWboss.state().hp)).toBe([88, 76, 56, 36, 16, 0][k]); }
  await expect(page.locator('#wbAgain')).toBeVisible();
  const s2 = await page.evaluate(() => ({ wb: S.wboss, coins: coinBal() }));
  expect(s2.wb).toMatchObject({ tries: 2, wins: 1 });
  expect(s2.coins - s.coins).toBe(10);
  expect(errors).toEqual([]);
});

test('three wrong answers lose; quitting keeps the try; merge keeps the newer week and joins the same week', async ({ page }) => {
  const prog = {}; ['apple', 'house', 'water', 'tree', 'book', 'chair'].forEach((w) => { prog[w] = card(1); });
  const errors = await openApp(page, { prog });
  await page.evaluate(() => go('wboss'));
  await page.click('#wbGo');
  for (let k = 0; k < 3; k++) { await page.locator('.opt:not([disabled])').first().waitFor(); await wrong(page); await page.waitForTimeout(50); await expect.poll(() => page.evaluate(() => runWboss.state().hearts)).toBe(2 - k); }
  await expect(page.locator('#view')).toContainText('หัวใจหมดแล้ว');
  expect(await page.evaluate(() => S.wboss)).toMatchObject({ win: false, tries: 1, low: 100 });
  const m = await page.evaluate(() => {
    const k = S.wboss.k;
    mergeBackup({ wboss: { k, win: true, tries: 4, low: 20, wins: 3 } });
    const same = { ...S.wboss };
    mergeBackup({ wboss: { k: '2020-01-06', win: true, tries: 9, low: 0, wins: 1 } }); // an older week: ignored except wins
    const old = { ...S.wboss };
    return { same, old, bad: cleanWboss({ k: 'x', wins: 2 }), bad2: cleanWboss({ k: '2026-11-02', low: -5, tries: 'a' }) };
  });
  expect(m.same).toMatchObject({ win: true, tries: 4, low: 20, wins: 3 });
  expect(m.old).toEqual(m.same);
  expect(m.bad).toEqual({ k: '', win: false, tries: 0, low: 100, wins: 2 });
  expect(m.bad2).toMatchObject({ low: 100, tries: 0 });
  expect(errors).toEqual([]);
});
