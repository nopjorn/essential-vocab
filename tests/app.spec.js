// Screens, word sheet and the flashcard session.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const ROUTES = ['home', 'cards', 'feed', 'games', 'list', 'stats', 'settings', 'guide', 'homeset', 'wotdset', 'read', 'placement', 'changelog', 'mtest', 'riddle', 'decks'];

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

test('update banner appears, can be dismissed, and reloads', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => showUpdate());
  await page.evaluate(() => showUpdate());
  const bar = page.locator('#updBar');
  await expect(bar).toHaveCount(1);
  await expect(bar).toContainText('มีเวอร์ชันใหม่พร้อมใช้งาน');
  await bar.locator('[data-upd=x]').click();
  await expect(bar).toHaveCount(0);
  await page.evaluate(() => showUpdate());
  await Promise.all([page.waitForEvent('load'), page.locator('#updBar [data-upd=go]').click()]);
  expect(errors).toEqual([]);
});

test("what's new bar after an update opens the changelog; settings links to it", async ({ page }) => {
  const errors = await openApp(page, { seenVer: '1.0.0', prog: { a: { b: 1, i: 1, e: 2.5, d: 0, s: 1, c: 1, x: 0 } } });
  const bar = page.locator('#newBar');
  await expect(bar).toContainText('ดูมีอะไรใหม่');
  await bar.locator('[data-new=go]').click();
  await expect(page.locator('#view')).toContainText('เวอร์ชันนี้');
  await expect(page.locator('#view .cl-row').first()).toBeVisible();
  await page.locator('#topBack').click();
  await page.evaluate(() => go('settings'));
  await page.locator('#clBtn').click();
  await expect(page.locator('#view .cl-row').nth(5)).toBeVisible();
  expect((await readState(page)).seenVer).toBe(await page.evaluate(() => APP_VERSION));
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
  // the sheet must sit above the full-screen view (really clickable, not covered)
  await page.locator('.sheet [data-act=star]').click();
  await page.locator('.sheet [data-act=review]').click();
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

test('quest card hides once done, unless the setting keeps it', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { todayQuest(); S.quest.done = true; go('home'); });
  await expect(page.locator('.card-box.quest')).toHaveCount(0);
  await page.evaluate(() => { S.settings.questShowDone = true; go('home'); });
  await expect(page.locator('.card-box.quest')).toContainText('สำเร็จแล้ว');
  await page.evaluate(() => { S.quest.done = false; go('home'); });
  await expect(page.locator('#questGo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('word of the day: full screen view, random, back, star, details, close', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.locator('#wotd [data-full]').click();
  const wf = page.locator('.wf');
  await expect(wf).toBeVisible();
  // auto-speak: off → word → word + example → off
  await expect(wf.locator('[data-auto]')).toHaveText('🔇');
  await wf.locator('[data-auto]').click();
  await expect(wf.locator('[data-auto]')).toHaveText('🔊 คำ');
  await page.evaluate(() => { window.__said.length = 0; });
  await wf.locator('[data-next]').click();
  let spoken = (await wf.locator('.wf-word').innerText()).replace('🔊', '').trim();
  await expect.poll(() => page.evaluate(() => window.__said.slice())).toEqual([spoken]);
  await wf.locator('[data-auto]').click();
  await expect(wf.locator('[data-auto]')).toHaveText('🔊 +ประโยค');
  expect(await page.evaluate(() => S.settings.wfAuto)).toBe(2);
  await page.evaluate(() => { window.__said.length = 0; });
  await wf.locator('[data-next]').click();
  spoken = (await wf.locator('.wf-word').innerText()).replace('🔊', '').trim();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBe(2);
  const said = await page.evaluate(() => window.__said.slice());
  expect(said[0]).toBe(spoken);
  expect(await wf.locator('.example').first().innerText()).toContain(said[1].split(' ')[0]);
  await wf.locator('[data-auto]').click();
  await expect(wf.locator('[data-auto]')).toHaveText('🔇');
  await wf.locator('[data-back]').click();
  await wf.locator('[data-back]').click();
  const first = await wf.locator('.wf-word').innerText();
  await expect(wf.locator('[data-back]')).toBeDisabled();
  await wf.locator('[data-next]').click();
  expect(await wf.locator('.wf-word').innerText()).not.toBe(first);
  await expect(wf.locator('.example').first()).toBeVisible();
  await wf.locator('[data-say]').click();
  await wf.locator('[data-star]').click();
  await expect(wf.locator('[data-star]')).toContainText('ติดดาวแล้ว');
  await wf.locator('[data-back]').click();
  expect(await wf.locator('.wf-word').innerText()).toBe(first);
  await expect(wf.locator('[data-review]')).toBeVisible();
  await wf.locator('[data-review]').click();
  await wf.locator('[data-known]').click();
  await expect(wf.locator('a.oxl')).toBeVisible();
  await wf.locator('[data-note]').first().click();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.locator('.sheet [data-act=save]').click();
  await wf.locator('[data-x]').click();
  await expect(page.locator('.wf')).toHaveCount(0);
  await expect(page.locator('#wotd')).toBeVisible();
  expect(errors).toEqual([]);
});

test('word of the day: 🎲 button and filters (level + status + topic)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const before = await page.locator('#wotd .wotd-word').innerText();
  await page.locator('#wotd [data-rand]').click();
  await expect(page.locator('#wotd')).toBeVisible();
  expect(await page.locator('#wotd .wotd-word').innerText()).not.toBe(before);
  // Filter: A2 words that are leeches -> the pick must be one of them.
  const ok = await page.evaluate(() => {
    const a2 = W.filter((w) => w.g === 'A2').slice(0, 5);
    a2.forEach((w) => { S.prog[w.w] = { b: 0, i: 1, e: 2.5, d: Date.now(), s: 5, c: 0, x: 5 }; });
    S.settings.wotd = { lv: ['A2'], st: ['leech'], tp: [] }; S.wotdPick = null; save();
    const w = wotd(); return a2.includes(w) && wotdPool().length === 5;
  });
  expect(ok).toBe(true);
  await page.evaluate(() => go('settings'));
  await page.locator('#wotdSetBtn').click();
  await page.locator('#wSt .chip[data-v="leech"]').click();
  await page.locator('#wSt .chip[data-v="mastered"]').click();
  await expect(page.locator('#wCount')).toContainText('ไม่มีคำตรงเงื่อนไข');
  await page.locator('#wReset').click();
  await expect(page.locator('#wCount')).toContainText('ตรงเงื่อนไข');
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
  await page.evaluate(() => { S.prog[W[0].w] = { b: 5, i: 35, e: 2.5, d: Date.now() + 86400000 * 30, s: 3, c: 3, x: 0 }; save(); go('cards'); });
  await page.locator('[data-ns="mastered"]').click();
  await expect(page.locator('#fc')).toBeVisible();
  await page.evaluate(() => go('cards'));
  await expect(page.locator('[data-ns="read"]')).toHaveCount(0);
  await page.locator('[data-ns="feed"]').click();
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'feed');
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
  await page.locator('details[data-g="look"] > summary').click();
  await page.locator('#homeSetBtn').click();
  await expect(page.locator('#hcfg')).toBeVisible();
  await page.locator('.hc-row[data-id="wotd"] [data-act="tog"]').evaluate((el) => el.click());
  await page.locator('.hc-row[data-id="riddle"] [data-act="tog"]').evaluate((el) => el.click());
  await page.locator('.hc-row[data-id="prog"] [data-act="up"]').click();
  await page.locator('.hc-row[data-id="prog"] [data-act="up"]').click();
  await page.locator('.hc-row[data-id="prog"] [data-act="up"]').click(); // hidden blocks still take a slot
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
  await page.evaluate(() => go('homeset'));
  await page.locator('#hcReset').click();
  expect(await page.evaluate(() => S.homeCfg)).toBeNull();
  expect(errors).toEqual([]);
});

test('app icon badge shows the number of due cards', async ({ page }) => {
  await page.addInitScript(() => {
    window.__badge = [];
    navigator.setAppBadge = (n) => { window.__badge.push(n); return Promise.resolve(); };
    navigator.clearAppBadge = () => { window.__badge.push(0); return Promise.resolve(); };
  });
  const errors = await openApp(page, { prog: { cat: { b: 1, i: 1, e: 2.5, d: 1, s: 1, c: 1, x: 0 }, dog: { b: 1, i: 1, e: 2.5, d: 1, s: 1, c: 1, x: 0 } } });
  await expect.poll(() => page.evaluate(() => window.__badge.at(-1))).toBe(2);
  await page.evaluate(() => go('settings'));
  await page.locator('#badge').evaluate((el) => el.click());
  await expect.poll(() => page.evaluate(() => window.__badge.at(-1))).toBe(0);
  expect(errors).toEqual([]);
});

test('UI polish: top-bar back + level chip, collapsible settings, game source picker, dismissible banners', async ({ page }) => {
  const errors = await openApp(page);
  // home: install tip can be dismissed and stays dismissed
  await expect(page.locator('#installTip')).toBeVisible();
  await page.locator('#installTip [data-inst]').click();
  await expect(page.locator('#installTip')).toHaveCount(0);
  await page.evaluate(() => go('home'));
  await expect(page.locator('#installTip')).toHaveCount(0);
  // level chip opens the stats page; the top-bar back button returns
  await page.locator('#streak').click();
  await expect(page.locator('#title')).toHaveText('สถิติ');
  await expect(page.locator('#topBack')).toBeVisible();
  await page.locator('#topBack').click();
  await expect(page.locator('#topBack')).toBeHidden();
  // settings groups collapse/expand
  await page.evaluate(() => go('settings'));
  const sound = page.locator('details[data-g="sound"]');
  await expect(sound).not.toHaveAttribute('open', '');
  await sound.locator('summary').click();
  await expect(sound.locator('#test')).toBeVisible();
  // games: source picker is collapsed until tapped, picking closes it
  await page.evaluate(() => go('games'));
  await expect(page.locator('#src')).toBeHidden();
  await page.locator('#srcBtn').click();
  await page.locator('#src .chip[data-s="all"]').click();
  await expect(page.locator('#src')).toBeHidden();
  await expect(page.locator('#srcBtn')).toContainText('ทุกระดับ');
  expect(errors).toEqual([]);
});

test('UI polish 2: sheet action bar, session title counter, empty forecast', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#view [data-go="cards"]')).toBeVisible();
  await page.locator('#view [data-go="cards"]').click();
  await expect(page.locator('#stage')).toBeVisible();
  await page.evaluate(() => startGame('en2th'));
  await expect(page.locator('#title')).toContainText('1/10');
  await page.evaluate(() => go('list'));
  await page.locator('.wrow').first().click();
  const star = page.locator('.sheet-acts [data-act="star"]');
  await expect(star).toContainText('ติดดาว');
  await star.click();
  await expect(star).toContainText('เอาดาวออก');
  await expect(page.locator('.sheet .st-pill')).toBeVisible();
  await expect(page.locator('.sheet .oxl')).toBeInViewport();
  // action bar sits flush with the bottom of the sheet; the body scrolls on its own
  const geo = await page.evaluate(() => { const s = document.querySelector('.sheet').getBoundingClientRect(), a = document.querySelector('.sheet-acts').getBoundingClientRect(), b = document.querySelector('.sheet-body'); return { gap: Math.round(s.bottom - a.bottom), scrolls: getComputedStyle(b).overflowY === 'auto' }; });
  expect(geo.gap).toBeLessThanOrEqual(1);
  expect(geo.scrolls).toBe(true);
  expect(errors).toEqual([]);
});

test('flashcards done screen shows the extra games picked in settings', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('settings'));
  await page.locator('#nextGames .chip[data-v="match"]').click();
  await page.locator('#nextGames .chip[data-v="spell"]').click();
  await page.locator('#nextGames .chip[data-v="spell"]').click(); // tap again = off
  await page.locator('#nextGames .chip[data-v="cloze"]').click();
  expect(await page.evaluate(() => S.settings.nextGames)).toEqual(['cloze', 'match']);
  await page.evaluate(() => {
    const now = Date.now();
    W.slice(0, 30).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: now + 86400000, s: 1, c: 1, x: 0 }; });
    S.daily.fresh = S.settings.newPerDay; save(); go('cards');
  });
  await expect(page.locator('[data-ns="g:spell"]')).toHaveCount(0);
  await expect(page.locator('[data-ns="g:cloze"]')).toBeVisible();
  await page.locator('[data-ns="g:match"]').click();
  await expect(page.locator('.match-grid')).toBeVisible();
  expect(errors).toEqual([]);
});
