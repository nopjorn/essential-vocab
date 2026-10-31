// 1.115+: fun zone - hub, coins, power-ups, coin shop, endless tower, new secret medals.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const base = { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } };

// Answer the funAsk() question on screen right (or wrong).
async function funAnswer(page, ok) {
  await expect(page.locator('.q-prompt')).toBeVisible();
  const k = await page.evaluate((ok) => { const i = funAsk.opts.indexOf(funAsk.cur); return ok ? i : [...document.querySelectorAll('.opt')].map((o) => +o.dataset.k).find((x) => x !== i && !document.querySelector(`.opt[data-k="${x}"]`).disabled); }, ok);
  await page.locator(`.opt[data-k="${k}"]`).click();
  await page.waitForTimeout(ok ? 750 : 1600);
}

test('fun hub: tiles open their pages, home card and games menu link to it', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => go('home'));
  await expect(page.locator('.fun-card')).toBeVisible();
  await page.locator('.fun-card').click();
  await expect(page.locator('.fun-tile[data-fun="tower"]')).toBeVisible();
  const ids = await page.locator('.fun-tile').evaluateAll((els) => els.map((e) => e.dataset.fun));
  expect(ids[0]).toBe('tower');
  expect(ids.at(-1)).toBe('shop');
  await page.locator('.fun-tile[data-fun="shop"]').click();
  await expect(page.locator('.shop-row').first()).toBeVisible();
  await page.evaluate(() => go('games'));
  await expect(page.locator('#view [data-go="fun"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('coins: per-device buckets, merge keeps the larger numbers, shop buys an item once, bad data is cleaned', async ({ page }) => {
  const errors = await openApp(page, { ...base, coin: { other: [100, 20], bad: 'x', neg: [-5, 'a'] } });
  expect(await page.evaluate(() => coinBal())).toBe(80);
  await page.evaluate(() => addCoins(50));
  expect(await page.evaluate(() => coinBal())).toBe(130);
  await page.evaluate(() => mergeBackup({ coin: { other: [90, 40], dev2: [10, 0] } }));
  expect(await page.evaluate(() => coinBal())).toBe(100 - 40 + 50 + 10);
  await page.evaluate(() => go('coinshop'));
  await page.locator('[data-buy="acc:flower"]').click();
  expect(await page.evaluate(() => [coinBal(), S.owned.includes('acc:flower'), itemOpen('acc:flower')])).toEqual([40, true, true]);
  await expect(page.locator('[data-buy="acc:flower"]')).toHaveCount(0);
  await expect(page.locator('[data-buy="acc:tophat"]')).toBeDisabled(); // 150 > 40
  expect(await page.evaluate(() => spendCoins(999))).toBe(false);
  const st = await readState(page);
  expect(Object.keys(st.coin).sort()).toEqual(expect.arrayContaining(['other', 'dev2']));
  expect(st.coin.bad).toBeUndefined();
  // the wardrobe shows the price hint for coin items and draws them
  await page.evaluate(() => go('mascot'));
  await expect(page.locator('#view')).toContainText('🪙 150 ที่ร้านค้า');
  expect(await page.evaluate(() => ['tophat', 'flower', 'wizard'].every((h) => mascotSvg({ equip: { head: h } }).length > mascotSvg({}).length + 100) && mascotSvg({ equip: { body: 'scarf' } }).length > mascotSvg({}).length + 100)).toBe(true);
  expect(errors).toEqual([]);
});

test('tower: right answers clear floors (+coins), wrong ones cost hearts, a run ends at 0 hearts; boss floor saves a checkpoint', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => go('tower'));
  await page.locator('#twGo').click();
  for (let k = 0; k < 6; k++) await funAnswer(page, true); // floors 1 and 2
  await expect.poll(() => page.evaluate(() => S.tower.best)).toBe(2);
  expect(await page.evaluate(() => coinBal())).toBe(2);
  for (let k = 0; k < 3; k++) await funAnswer(page, false);
  await expect(page.locator('#twAgain')).toBeVisible();
  await expect(page.locator('#view')).toContainText('ไปถึงชั้น 3');
  expect(await page.evaluate(() => [S.tower.runs, S.tower.cp])).toEqual([1, 0]);
  // start at floor 10 (boss: 5 questions) via a checkpoint-less shortcut
  await page.evaluate(() => { S.tower.best = 9; runTower(10); });
  for (let k = 0; k < 5; k++) await funAnswer(page, true);
  await expect.poll(() => page.evaluate(() => S.tower.cp)).toBe(10);
  await expect(page.locator('.tw-banner')).toContainText('ชั้น 11');
  await page.locator('#twQuit').click().catch(() => {});
  await page.evaluate(() => go('tower'));
  await expect(page.locator('[data-start="11"]')).toBeVisible();
  expect(await page.evaluate(() => twPool(11).every((w) => w.g === 'A2') && twPool(70).every((w) => /^(B2|B2x|C1)$/.test(w.g)))).toBe(true);
  expect(await page.evaluate(() => { mergeBackup({ tower: { best: 40, cp: 33, runs: 1 } }); return S.tower; })).toEqual({ best: 40, cp: 30, runs: 2 });
  expect(errors).toEqual([]);
});

test('power-ups: 50:50 hides two wrong options, skip counts as right without touching the card, heart refills', async ({ page }) => {
  const errors = await openApp(page, { ...base, coin: { x: [100, 0] } });
  await page.evaluate(() => runTower(1));
  await expect(page.locator('.q-prompt')).toBeVisible();
  await page.locator('[data-pw="fifty"]').click();
  await expect(page.locator('.opt.gone')).toHaveCount(2);
  expect(await page.evaluate(() => coinBal())).toBe(95);
  await funAnswer(page, false); // lose a heart: the heart power-up shows on the next question
  await expect(page.locator('[data-pw="heart"]')).toBeVisible();
  await page.locator('[data-pw="heart"]').click();
  await expect(page.locator('#twH')).toHaveText('❤️❤️❤️');
  const before = await page.evaluate(() => [funAsk.cur.w, JSON.stringify(S.prog[funAsk.cur.w] || null)]);
  await page.locator('[data-pw="skip"]').click();
  await page.waitForTimeout(800);
  expect(await page.evaluate((w) => JSON.stringify(S.prog[w] || null), before[0])).toBe(before[1]); // skipping never touches the card
  expect(await page.evaluate(() => coinBal())).toBe(100 - 5 - 15 - 8);
  expect(await page.evaluate(() => S.counts.pw)).toBe(3);
  expect(errors).toEqual([]);
});

test('secret medals: new ones exist, are hidden until earned, and unlock from their counters', async ({ page }) => {
  const errors = await openApp(page, { ...base, tower: { best: 100, cp: 100, runs: 3 }, counts: { quests: 0, speak: 0, perfect: 0, maxCoin: 600, buys: 5 }, best: { timeAttack: 31 } });
  await page.evaluate(() => { save(); flushSave(); });
  const got = await page.evaluate(() => ['tower10', 'tower50', 'sTower', 'sRich', 'sShop', 'sSpeed'].filter((id) => S.ach[id]));
  expect(got).toEqual(['tower10', 'tower50', 'sTower', 'sRich', 'sShop', 'sSpeed']);
  expect(await page.evaluate(() => ACH.filter((a) => a.secret).length)).toBeGreaterThanOrEqual(9);
  expect(errors).toEqual([]);
});
