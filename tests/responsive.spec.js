// Main screens fit every target size (iPhone portrait/landscape, iPad mini/Air/Pro both ways): no sideways scroll.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const SIZES = [[440, 956], [956, 440], [834, 1210], [1210, 834], [1032, 1376], [1376, 1032], [1440, 900], [1920, 1080]];
const ROUTES = ['home', 'cards', 'feed', 'games', 'list', 'stats', 'settings', 'guide', 'homeset', 'wotdset', 'read', 'decks'];

for (const [w, h] of SIZES) {
  test(`no horizontal overflow at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page, { placedAt: '2026-01-01', decks: [{ id: 'd1', name: 'ท่องเที่ยว', icon: '✈️', words: ['airport', 'hotel', 'ticket', 'taxi', 'visa'], at: 1, used: 1 }, { id: 'd2', name: 'ทำงาน', icon: '💼', words: ['boss'], at: 1, used: 2 }] });
    const screens = [...ROUTES.map((r) => [r, `go('${r}')`]), ['families', 'renderFamilies()'], ['pairs', 'renderPairs()'], ['wform', "startGame('wform')"],
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
