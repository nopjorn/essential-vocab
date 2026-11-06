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

const d = (n) => { const t = new Date(Date.now() - n * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

test("today's pick for someone who has never played: the easy one first", async ({ page }) => {
  const errors = await openApp(page, {});
  await page.evaluate(() => go('games'));
  await expect(page.locator('#gPick [data-pick]')).toHaveAttribute('data-pick', 'en2th');
  await expect(page.locator('#gPick')).toContainText('เริ่มจากเกมง่ายๆ');
  expect(errors).toEqual([]);
});

test("today's pick: a game with a reason, cycles with 🔄, starts the game and remembers the day; glast merges newest", async ({ page }) => {
  // wrong answers lately → review; then the most stale skill; 🔄 steps through the list
  const gplay = { me: { en2th: 9, listen: 4, spell: 3, speak: 2, wform: 1, colloc: 1, survival: 1, review: 1 } };
  const errors = await openApp(page, { gplay, glast: { en2th: d(0), listen: d(6), spell: d(1), speak: d(2), wform: d(1), colloc: d(1), review: d(9) },
    miss: { [d(1)]: { apple: 1, house: 1, water: 2, tree: 1, cat: 1 } }, prog: { apple: { b: 0, i: 0, e: 2.5, d: 0, s: 2, c: 0, x: 2 } }, settings: { gameHide: ['minpair'] } });
  await page.evaluate(() => go('games'));
  const picks = await page.evaluate(() => gamePicks());
  expect(picks[0][0]).toBe('review');
  expect(picks[0][1]).toContain('5 คำ');
  expect(picks[1]).toEqual(['listen', 'ไม่ได้ฝึกฟังและเสียงมา 6 วันแล้ว']);
  expect(picks.map((p) => p[0])).not.toContain('minpair'); // hidden
  expect(new Set(picks.map((p) => p[0])).size).toBe(picks.length);
  await expect(page.locator('#gPick')).toHaveClass(/sk-mean/);
  await page.click('#gPickNext');
  await expect(page.locator('#gPick [data-pick]')).toHaveAttribute('data-pick', 'listen');
  await expect(page.locator('#gPick')).toHaveClass(/sk-hear/);
  await expect(page.locator('#gPickNext')).toBeFocused();
  await page.click('#gPick [data-pick]');
  await expect(page.locator('.quiz, #quit').first()).toBeVisible();
  expect(await page.evaluate(() => S.glast.listen)).toBe(await page.evaluate(() => today()));
  // merge keeps the newer day per game and skips odd values
  const m = await page.evaluate((old) => { mergeBackup({ glast: { listen: old, wform: '2999-01-01', bad: 5, x: 'nope' } }); return S.glast; }, d(30));
  expect(m.listen).toBe(await page.evaluate(() => today()));
  expect(m.wform).toBe('2999-01-01');
  expect(m.bad).toBeUndefined();
  expect(m.x).toBeUndefined();
  expect(errors).toEqual([]);
});

test('the other play pages sit right under the pick: a sideways strip on a phone (fades while there is more), one row on an iPad', async ({ page }) => {
  const errors = await openApp(page, {});
  await page.evaluate(() => go('games'));
  const r = await page.evaluate(() => {
    const g = view.querySelector('.short-grid'), pick = view.querySelector('#gPick'), first = view.querySelector('.game-grid');
    return { after: !!(pick.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING), before: !!(first.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_PRECEDING),
      ids: [...g.querySelectorAll('.short-tile')].map((b) => b.id || b.dataset.go), scrolls: g.scrollWidth > g.clientWidth, top: g.getBoundingClientRect().top < innerHeight };
  });
  expect(r.after).toBe(true);
  expect(r.before).toBe(true);
  expect(r.ids).toEqual(['fun', 'toRiddle', 'toWs', 'toMap', 'toDuel', 'toRead', 'toRef']);
  expect(r.scrolls).toBe(true);
  expect(r.top).toBe(true); // seen without scrolling the page
  await expect(page.locator('.short-grid')).not.toHaveClass(/at-end/);
  await page.evaluate(() => { view.querySelector('.short-grid').scrollLeft = 9999; });
  await expect(page.locator('.short-grid')).toHaveClass(/at-end/);
  await page.click('#toRef');
  await expect(page.locator('#title')).toHaveText('คลังความรู้');
  // iPad: one row of 7, no sideways scroll
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.evaluate(() => go('games'));
  const ipad = await page.evaluate(() => { const g = view.querySelector('.short-grid'); return { scrolls: g.scrollWidth > g.clientWidth, rows: new Set([...g.children].map((c) => Math.round(c.getBoundingClientRect().top))).size }; });
  expect(ipad).toEqual({ scrolls: false, rows: 1 });
  expect(errors).toEqual([]);
});
