// Games menu polish (1.156.x): skill colours, today's pick, the other play pages up top, the compact source bar, tile badges.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('skill colours: every tile and group heading carries its skill, the icon sits on a tinted tile of that hue', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], gamePin: ['speak'] } });
  await page.evaluate(() => go('games'));
  const r = await page.evaluate(() => {
    const tiles = [...view.querySelectorAll('.game-tile')];
    const bg = (sel) => getComputedStyle(view.querySelector(sel)).backgroundColor;
    return {
      bad: tiles.filter((t) => !t.className.includes(`sk-${SKILL_OF[t.dataset.game]}`)).map((t) => t.dataset.game),
      heads: [...view.querySelectorAll('.games-sec.fold')].map((h) => [h.dataset.fold, h.classList.contains(`sk-${h.dataset.fold}`)]),
      hear: bg('.sk-hear .gi'), say: bg('[data-game="speak"] .gi'), // the pinned tile is coloured too
      bar: getComputedStyle(view.querySelector('.games-sec.sk-hear'), '::before').backgroundColor,
    };
  });
  expect(r.bad).toEqual([]);
  expect(r.heads.length).toBe(7);
  expect(r.heads.every(([, ok]) => ok)).toBe(true);
  expect(r.hear).not.toBe(r.say);
  expect(r.hear).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(r.bar).not.toMatch(/rgba\(0, 0, 0, 0\)/);
  expect(errors).toEqual([]);
});
