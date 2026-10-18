// Screens, word sheet and the flashcard session.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const ROUTES = ['home', 'cards', 'feed', 'games', 'list', 'stats', 'settings', 'guide', 'read', 'placement'];

test('every screen renders without errors and shows the version', async ({ page }) => {
  const errors = await openApp(page);
  const version = await page.evaluate(() => APP_VERSION);
  await expect(page.locator('#view')).toContainText(version);
  for (const r of ROUTES) {
    await page.evaluate((r) => go(r), r);
    await expect(page.locator('#view'), r).not.toBeEmpty();
  }
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#view')).toContainText(version);
  expect(errors).toEqual([]);
});

test('word sheet shows the word family and collocations', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'decide')));
  const sheet = page.locator('.sheet');
  await expect(sheet.locator('#famBox')).toContainText('decision');
  await expect(sheet.locator('#famBox .col-row.on')).toContainText('decide');
  await sheet.locator('#famBox [data-col="decisive"]').click();
  expect(await page.evaluate(() => window.__said.at(-1))).toBe('decisive');
  // A word without a family gets no family box.
  await page.mouse.click(5, 5);
  await expect(page.locator('.sheet-wrap')).toHaveCount(0);
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'cat')));
  await expect(page.locator('.sheet .sheet-word')).toContainText('cat');
  await page.waitForTimeout(300);
  await expect(page.locator('#famBox')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('word family browser filters and plays', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('games'));
  await page.locator('#toFams').click();
  await expect(page.locator('#famList .pair-card').first()).toBeVisible();
  await page.locator('#fq').fill('decis');
  await expect(page.locator('#famList .pair-card')).toHaveCount(1);
  await page.locator('#fq').fill('zzzz');
  await expect(page.locator('#famList')).toContainText('ไม่พบ');
  await page.locator('#fPlay').click();
  await expect(page.locator('.opt').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('flashcards: flip, grade, undo, progress is saved', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('cards'));
  for (const g of [2, 0, 3, 1]) {
    await page.locator('#fc').click();
    await expect(page.locator('#grade')).toBeVisible();
    await page.locator(`#grade [data-g="${g}"]`).click();
  }
  let st = await readState(page);
  const n = Object.keys(st.prog).length;
  expect(n).toBeGreaterThanOrEqual(3);
  await page.locator('#undo').click();
  await expect(page.locator('#undo')).toBeVisible();
  st = await readState(page);
  expect(Object.keys(st.prog).length).toBeLessThanOrEqual(n);
  await page.reload();
  st = await readState(page);
  expect(Object.keys(st.prog).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('feed: special cards, boss, timer, fever, summary and double-tap like', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => {
    const a1 = W.filter((w) => w.g === 'A1');
    a1.slice(0, 40).forEach((w) => (S.prog[w.w] = { b: 2, i: 3, e: 2.5, d: Date.now() + 5 * DAY, s: 3, c: 2, x: 0 }));
    S.prog[a1[50].w] = { b: 0, i: 0, e: 1.5, d: Date.now() + 5 * DAY, s: 8, c: 2, x: 5 }; // leech → boss
    save();
    go('feed');
  });
  // Double-tap the first card (not a button) = like.
  const first = page.locator('.fcard[data-n="0"] .f-word');
  await first.click(); await first.click();
  expect(await page.evaluate(() => Object.keys(S.star).length)).toBe(1);
  await expect(page.locator('.fcard[data-n="0"] [data-heart]')).toContainText('❤️');

  const types = new Set();
  let fever = false, timed = false;
  for (let i = 0; i < 42; i++) {
    const card = page.locator(`.fcard[data-n="${i}"]`);
    await expect(card).toHaveCount(1);
    await page.evaluate((i) => { const f = document.querySelector('#feed'); f.scrollTop = document.querySelector(`.fcard[data-n="${i}"]`).offsetTop; }, i);
    await page.waitForTimeout(200);
    const type = await card.getAttribute('data-type');
    types.add(type);
    if (type === 'sum') await expect(card).toContainText('สรุปช่วงนี้');
    if (await card.locator('.f-timer.run').count()) timed = true;
    if (!(await card.locator('.opt').count())) continue;
    const ok = type === 'boss' || ![3, 10, 38].includes(i);
    const at = await card.locator('.opt').evaluateAll((els, ok) => {
      const right = els[0].closest('.fcard')._right;
      return els.findIndex((e) => (e.dataset.o === right) === ok);
    }, ok);
    await card.locator('.opt').nth(at).click();
    await expect(card.locator('.f-reveal')).not.toBeEmpty();
    await expect(card.locator('.opt.correct')).toHaveCount(1);
    if (!ok) await expect(card.locator('.opt.wrong')).toHaveCount(1);
    if (await card.locator('[data-hint]').count()) { await card.locator('[data-hint]').click(); await expect(card.locator('.thx').first()).toBeVisible(); }
    if (await page.locator('#feed.fever').count()) fever = true;
  }
  for (const t of ['learn', 'fam', 'colloc', 'conf', 'story', 'sum', 'boss']) expect([...types], t).toContain(t);
  expect(timed).toBe(true);
  expect(fever).toBe(true);
  // The story card links to the full story.
  const read = page.locator('.fcard [data-read]').first();
  await read.scrollIntoViewIfNeeded();
  await read.click();
  await expect(page.locator('#rProg')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('home: word of the day, no guide button; flashcards hub when today is done', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await expect(page.locator('#guideBtn')).toHaveCount(0);
  await expect(page.locator('#wotd')).toBeVisible();
  await page.locator('#wotd').click();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.mouse.click(5, 5);
  // Learn a few words, then nothing is due and the daily goal is spent.
  await page.evaluate(() => {
    const now = Date.now();
    W.slice(0, 30).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: now + 86400000, s: 1, c: 1, x: 0 }; });
    S.daily.fresh = S.settings.newPerDay; save(); go('cards');
  });
  await expect(page.locator('#view')).toContainText('วันนี้ทำครบแล้ว');
  await page.locator('[data-ns="ahead"]').click();
  await expect(page.locator('#fc')).toBeVisible();
  await page.evaluate(() => go('cards'));
  await page.locator('[data-ns="read"]').click();
  await expect(page.locator('#view')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test('home layout: hide, reorder and resize blocks from settings', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const ids = () => page.locator('#view .hb').evaluateAll((els) => els.map((e) => e.dataset.hb));
  expect(await ids()).toEqual(expect.arrayContaining(['hero', 'feed', 'play', 'quest', 'wotd', 'prog']));
  // feed + play are a half-width pair by default
  const feed = await page.locator('[data-hb="feed"]').boundingBox();
  const play = await page.locator('[data-hb="play"]').boundingBox();
  expect(Math.abs(feed.y - play.y)).toBeLessThan(2);
  await page.evaluate(() => go('settings'));
  await page.locator('.hc-row[data-id="wotd"] [data-act="tog"]').evaluate((el) => el.click());
  await page.locator('.hc-row[data-id="prog"] [data-act="up"]').click();
  await page.locator('.hc-row[data-id="prog"] [data-act="up"]').click();
  await page.locator('.hc-row[data-id="quest"] [data-act="w"][data-v="half"]').click();
  await page.locator('.hc-row[data-id="level"] [data-act="tog"]').evaluate((el) => el.click());
  await page.evaluate(() => go('home'));
  const after = await ids();
  expect(after).not.toContain('wotd');
  expect(after).toContain('level');
  expect(after.indexOf('prog')).toBeLessThan(after.indexOf('quest'));
  // quest (half) is followed by the half-width level card, so they share a row
  const q = await page.locator('[data-hb="quest"]').boundingBox();
  const l = await page.locator('[data-hb="level"]').boundingBox();
  expect(Math.abs(q.y - l.y)).toBeLessThan(2);
  // a lone half block stretches to the full row
  await page.evaluate(() => { S.homeCfg = HOME_BLOCKS.map((b) => ({ id: b.id, on: b.id === 'hero', w: 'half' })); save(); go('home'); });
  expect(await page.locator('[data-hb="hero"]').evaluate((e) => e.classList.contains('hw-full'))).toBe(true);
  // reset restores the defaults
  await page.evaluate(() => go('settings'));
  await page.locator('#hcReset').click();
  expect(await page.evaluate(() => S.homeCfg)).toBeNull();
  expect(errors).toEqual([]);
});
