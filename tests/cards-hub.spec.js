// Flashcard tab start screen and the pages around a session (1.169 on).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
const due = (k) => ({ b: 2, i: 3, e: 2.5, d: Date.now() - (k + 1) * 3600e3, s: 3, c: 2, x: 0 });
const DUE = ['apple', 'house', 'water', 'bread', 'dog'];
const state = () => ({ placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 5 }, prog: Object.fromEntries(DUE.map((w, k) => [w, due(k)])) });

test('1.169: the flashcard tab opens a start screen with today\'s numbers and study modes', async ({ page }) => {
  const errors = await openApp(page, state());
  await page.click('#tabbar > button[data-tab="cards"]');
  await expect(page.locator('#hubStart')).toContainText('10 ใบ');
  await expect(page.locator('.ch-stats')).toContainText('ทบทวน');
  await expect(page.locator('[data-hub="short"]')).toBeVisible();
  // ▶︎ starts today's session; ✕ comes back to the start screen
  await page.click('#hubStart');
  await expect(page.locator('#fc')).toBeVisible();
  await expect(page.locator('#pcount')).toHaveText('0/10');
  await page.click('#quit');
  await expect(page.locator('#hubStart')).toBeVisible();
  // reviews only / new words only
  await page.click('[data-hub="rev"]');
  await expect(page.locator('#pcount')).toHaveText('0/5');
  expect(DUE).toContain(await page.locator('#fc .word').first().textContent());
  await page.click('#quit');
  await page.click('[data-hub="new"]');
  await expect(page.locator('#pcount')).toHaveText('0/5');
  expect(DUE).not.toContain(await page.locator('#fc .word').first().textContent());
  // other ways in still start right away and ✕ goes home
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#fc')).toBeVisible();
  await page.click('#quit');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'home');
  expect(errors).toEqual([]);
});

test('1.169: with nothing left today the tab shows the done page', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 0 }, prog: { apple: { ...due(0), d: Date.now() + 3 * DAY } } });
  await page.click('#tabbar > button[data-tab="cards"]');
  await expect(page.locator('#view')).toContainText('วันนี้ทำครบแล้ว');
  expect(errors).toEqual([]);
});
