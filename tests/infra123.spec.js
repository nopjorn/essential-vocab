// 1.123: offline loading, text size, the app's own keyboard, put words into a set from anywhere + share a set.
const { test, expect } = require('@playwright/test');
const { openApp, playRound } = require('./helpers');

const base = { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } };

test('offline: a data file that fails to load is announced and loads again on the next try', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.route('**/data/idioms.js*', (r) => r.abort());
  const first = await page.evaluate(() => loadData('data/idioms.js', 'IDIOMS').then((x) => x.length));
  expect(first).toBe(0);
  await expect(page.locator('#toast')).toContainText('โหลดข้อมูลส่วนนี้ไม่สำเร็จ');
  await page.unroute('**/data/idioms.js*');
  const second = await page.evaluate(() => loadData('data/idioms.js', 'IDIOMS').then((x) => x.length));
  expect(second).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('offline: stories that fail are not kept, so the library loads them later', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.route('**/data/stories/b1.js*', (r) => r.abort());
  const n1 = await page.evaluate(() => loadStories().then((s) => [s.length, STORIES === null]));
  expect(n1[1]).toBe(true);
  await page.unroute('**/data/stories/b1.js*');
  const n2 = await page.evaluate(() => { window.STORIES = []; return loadStories().then((s) => s.length); });
  expect(n2).toBe(await page.evaluate(() => STORY_COUNT));
  expect(errors).toEqual([]);
});

test('text size: settings switch zooms the pages; no sideways scroll on a phone at the largest size', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const errors = await openApp(page, base);
  await page.evaluate(() => go('settings'));
  await page.locator('details[data-g="look"] > summary').click();
  await page.locator('#fsz [data-v="xl"]').click();
  expect(await page.evaluate(() => [S.settings.fsz, getComputedStyle(document.documentElement).getPropertyValue('--uz').trim()])).toEqual(['xl', '1.3']);
  for (const r of ['home', 'games', 'cards', 'fun', 'stats', 'list', 'settings', 'read', 'decks', 'tower', 'puzzle', 'cafe', 'room']) {
    await page.evaluate((r) => go(r), r);
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => { const v = document.querySelector('#view'); return Math.max(document.documentElement.scrollWidth - innerWidth, v.scrollWidth - v.clientWidth); });
    expect(over, r).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('app keyboard: crossword typed with the on-screen keys and with a real keyboard; spelling game gets the pad too', async ({ page }) => {
  const errors = await openApp(page, { ...base, settings: { levels: ['A1', 'A2'], appKbd: 'on' } });
  await page.evaluate(() => { window.fqList = () => []; go('puzzle', 'cw'); });
  await expect(page.locator('.app-kb')).toBeVisible();
  expect(await page.locator('#cwIn').evaluate((e) => [e.readOnly, e.getAttribute('inputmode')])).toEqual([true, 'none']);
  const w1 = await page.evaluate(() => makeCrossword(today()).words[cwSel].w.w);
  await page.locator('.kb-k[data-k="z"]').click();
  await page.locator('.kb-k[data-k="del"]').click();
  for (const c of w1) await page.locator(`.kb-k[data-k="${c}"]`).click();
  await page.locator('.kb-ok').click();
  await expect.poll(() => page.evaluate(() => S.puz.cw.length)).toBe(1);
  const w2 = await page.evaluate(() => makeCrossword(today()).words[cwSel].w.w);
  await page.keyboard.type(w2);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => S.puz.cw.length)).toBe(2);
  await page.evaluate(() => startGame('spell'));
  await expect(page.locator('.app-kb')).toBeVisible();
  await page.locator('.kb-k[data-k="a"]').click();
  expect(await page.locator('#si').inputValue()).toBe('a');
  // off: the phone keyboard as before
  await page.evaluate(() => { S.settings.appKbd = 'off'; startGame('spell'); });
  await expect(page.locator('.app-kb')).toHaveCount(0);
  expect(await page.locator('#si').evaluate((e) => e.readOnly)).toBe(false);
  expect(errors).toEqual([]);
});

test('put into a set: from the word sheet (new set and existing), from wrong answers of a game; share a set as text', async ({ page }) => {
  const errors = await openApp(page, { ...base, decks: [{ id: 'd1', name: 'ท่องเที่ยว', icon: '✈️', words: ['airport'], at: 1, used: 1 }] });
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'hotel')));
  await page.locator('.sheet-wrap [data-act="deck"]').click();
  await page.locator('[data-pd="d1"]').click();
  expect(await page.evaluate(() => deckById('d1').words)).toEqual(['airport', 'hotel']);
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'hotel')));
  await page.locator('.sheet-wrap [data-act="deck"]').click();
  await expect(page.locator('[data-pd="d1"]')).toBeDisabled(); // already in it
  await page.locator('[data-pd="new"]').click();
  expect(await page.evaluate(() => liveDecks().length)).toBe(2);
  // wrong answers of a game → a set
  await page.evaluate(() => { gameSource = 'level'; startGame('en2th'); });
  await playRound(page, 'en2th');
  await page.locator('#wrongDeck').click();
  await page.locator('[data-pd="d1"]').click();
  expect(await page.evaluate(() => deckById('d1').words.length)).toBeGreaterThan(2);
  // share
  await page.evaluate(() => { navigator.share = undefined; go('decks', 'd1'); });
  await page.locator('#dkShare').click();
  const text = await page.evaluate(() => shareDeck.last);
  expect(text).toContain('airport, hotel');
  expect(text).toContain('วางลิสต์');
  expect(await page.evaluate((t) => matchWords(t.split('\n')[1]).ok.length >= 2, text)).toBe(true);
  expect(errors).toEqual([]);
});
