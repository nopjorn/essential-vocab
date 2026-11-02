// Main screens fit every target size (iPhone portrait/landscape, iPad mini/Air/Pro both ways, iPad mini Split View / Slide Over): no sideways scroll.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const SIZES = [[440, 956], [956, 440], [834, 1210], [1210, 834], [1032, 1376], [1376, 1032], [1440, 900], [1920, 1080],
  // iPad mini (8.3") both ways, and the widths it gets in Split View / Slide Over (1.136)
  [744, 1133], [1133, 744], [372, 1133], [320, 1133], [566, 744], [320, 744],
  // free-size windows (iPadOS windowing, 1.145): squat, narrow-tall and in-between sizes around every layout breakpoint
  [600, 480], [700, 500], [900, 600], [1000, 640], [520, 900], [760, 640], [1100, 700], [1099, 699]];
const ROUTES = ['home', 'cards', 'feed', 'games', 'list', 'stats', 'settings', 'guide', 'homeset', 'wotdset', 'read', 'decks', 'ref', 'print', 'mine'];

for (const [w, h] of SIZES) {
  test(`no horizontal overflow at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page, { placedAt: '2026-01-01', decks: [{ id: 'd1', name: 'ท่องเที่ยว', icon: '✈️', words: ['airport', 'hotel', 'ticket', 'taxi', 'visa'], at: 1, used: 1 }, { id: 'd2', name: 'ทำงาน', icon: '💼', words: ['boss'], at: 1, used: 2 }] });
    const screens = [...ROUTES.map((r) => [r, `go('${r}')`]), ['families', 'renderFamilies()'], ['adventure', 'renderAdventure()'], ['fun', "go('fun')"], ['tower', "go('tower')"], ['tower run', 'runTower(1)'], ['coin shop', "go('coinshop')"], ['crossword', "go('puzzle', 'cw')"], ['ladder', "go('puzzle', 'lad')"], ['album', "go('album')"], ['garden', "go('garden')"], ['cases', "go('cases')"], ['case', "loadCases().then(() => runCase('cake'))"], ['cafe', "go('cafe')"], ['cafe day', "loadEmoji().then(() => runCafe())"], ['room', "go('room')"], ['paths', "go('paths')"], ['path', "loadPaths().then(() => runPath('trip'))"], ['pic', "go('pic')"], ['build', 'runBuild()'], ['real game', "startGame('real')"], ['pairs', 'renderPairs()'], ['wform', "startGame('wform')"], ['hand game', "startGame('hand')"],
      ['deck edit', 'renderDeckEdit()'], ['idioms', 'renderIdioms()'], ['irregular', 'renderIrregular()'], ['dep prep', 'renderDepPrep()'], ['mistakes', 'renderMistakes()'], ['gram pat', 'renderGramPat()'], ['ipa chart', 'renderIpa()'], ['situations', 'renderSit()'], ['situation', "renderSit('restaurant')"], ['sit game', "startGame('sit')"],
      ['deck page', "go('decks', 'd1')"], ['games with sets', "gameSource = 'deck'; gameDecks = ['d1', 'd2']; go('games')"], ['set study', "go('cards', { deck: 'd1' })"], ['set game', "gameDecks = ['d1']; startGame('en2th')"]];
    for (const [name, js] of screens) {
      await page.evaluate(js);
      await page.waitForTimeout(150);
      const over = await page.evaluate(() => {
        const v = document.querySelector('#view');
        return { doc: document.documentElement.scrollWidth - innerWidth, view: v.scrollWidth - v.clientWidth };
      });
      expect(over.doc, `${name}: page wider than the screen`).toBeLessThanOrEqual(1);
      expect(over.view, `${name}: #view scrolls sideways`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });
}

// iPad Slide Over / narrow Split View (1.136): the bottom tab labels must not run into each other.
for (const [w, h] of [[320, 744], [372, 1133]]) {
  test(`tab labels apart at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page);
    const boxes = await page.evaluate(() => [...document.querySelectorAll('#tabbar > button > span:last-child')].map((s) => {
      const r = s.getBoundingClientRect();
      return { l: r.left, r: r.right, fits: s.scrollWidth <= s.clientWidth + 1 };
    }));
    expect(boxes.length).toBe(6);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].l, `label ${i} runs into the one before`).toBeGreaterThanOrEqual(boxes[i - 1].r + 3);
    expect(boxes.every((b) => b.fits), 'a label is cut off').toBe(true);
    expect(errors).toEqual([]);
  });
}

// Free-size windows (1.145): a squat narrow window (600×480) splits sessions like a phone in landscape and hides the tab bar;
// a short window (900×600) fits the six matching rows without scrolling.
test('squat window 600×480: flashcard grades beside the card, quiz answers beside the question, all on screen', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 480 });
  const errors = await openApp(page);
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#fc')).toBeVisible();
  const st = await page.locator('#stage').boundingBox(), g = await page.locator('#grade [data-g="3"]').boundingBox();
  expect(g.x + g.width).toBeLessThanOrEqual(st.x + 1);
  expect(await page.locator('#grade').evaluate((x) => getComputedStyle(x).visibility)).toBe('visible');
  await expect(page.locator('#tabbar')).toBeHidden();
  await page.evaluate(() => startGame('en2th'));
  await expect(page.locator('.options .opt').first()).toBeVisible();
  const q = await page.locator('.q-prompt').boundingBox();
  for (let k = 0; k < 4; k++) { const o = await page.locator('.options .opt').nth(k).boundingBox(); expect(o.x).toBeGreaterThanOrEqual(q.x + q.width - 1); expect(o.y + o.height).toBeLessThanOrEqual(480); }
  await page.evaluate(() => go('home'));
  await expect(page.locator('#tabbar')).toBeVisible(); // outside a session the tab bar is back
  expect(errors).toEqual([]);
});

test('short window 900×600: the six matching rows fit without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  const errors = await openApp(page);
  await page.evaluate(() => startGame('match'));
  await expect(page.locator('.match-grid .tile')).toHaveCount(12);
  const last = await page.locator('.match-grid .tile').last().boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(600);
  expect(errors).toEqual([]);
});
