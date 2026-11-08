// Business collocations (1.200.0): reference page (group chips, tap to speak) and game `bizcol` (also on the 💼 TOEIC chip).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('the collocation page lists every pair, filters by group and speaks a tapped one', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toBc').click();
  await expect(page.locator('#bcList .pair-ex').first()).toBeVisible();
  const n = await page.evaluate(() => BIZCOL.length);
  await expect(page.locator('#bcList .pair-ex')).toHaveCount(n);
  await page.locator('#bcGrps [data-g="p"]').click();
  await expect(page.locator('#bcList .pair-card')).toHaveCount(1);
  await expect(page.locator('#bcList')).toContainText('on schedule');
  await page.locator('#bcList .pair-ex').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
  await page.locator('#bcPlay').click();
  await expect(page.locator('.options .opt')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('bizcol game from the TOEIC chip: hint, right answer shows the collocation, wrong answer is graded', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('#gSkill [data-skill="toeic"]').click();
  await page.locator('[data-game="bizcol"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p5-s .blank')).toHaveCount(1);
  await view.locator('#bcHint').click();
  await expect(view.locator('#bcTh')).toBeVisible();
  const r = await page.evaluate(() => playQuiz.cur._bc);
  await view.locator(`.opt[data-o="${r.ans}"]`).click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('.bc-col')).toContainText(r.th);
  expect(await page.evaluate(() => window.__said.at(-1))).toBe(r.full);
  await view.locator('#nextQ').click();
  const r2 = await page.evaluate(() => playQuiz.cur._bc);
  await view.locator(`.opt[data-o="${r2.wrong[0]}"]`).click();
  await expect(view.locator('.opt.wrong')).toHaveCount(1);
  await expect(view.locator('.opt.correct')).toHaveText(r2.ans);
  await page.evaluate(() => flushSave());
  const keys = Object.entries((await readState(page)).lex).filter(([k]) => k.startsWith('bizcol:'));
  expect(keys.length).toBe(2);
  expect(keys.some(([, p]) => p.x === 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('word sheet (1.201.0): business collocations and work phrases that use the word, any form', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => openSheet(WORD_BY.deadline));
  await expect(page.locator('#bcBox')).toContainText('meet a deadline');
  await page.locator('#bcBox .col-row').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.at(-1))).toContain('deadline');
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  await page.evaluate(() => openSheet(WORD_BY.raise)); // "raised" in the sentence, [raise] concerns in the collocation
  await expect(page.locator('#bcBox')).toContainText('raise concerns');
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  await page.evaluate(() => openSheet(WORD_BY.attach)); // key "find attached" → attach
  await expect(page.locator('#wpBox')).toContainText('find attached');
  expect(await page.evaluate(() => [bizcolOf('the').length, workPhrOf('you').length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test('keep collocations in ชุดของฉัน (1.202.0): ＋ on the page, all shown, word sheet and the game reveal', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toBc').click();
  await page.locator('#bcList [data-add]').first().click();
  await page.locator('.sheet-wrap.open [data-pd="new"]').click();
  let st = await readState(page);
  expect(st.decks).toHaveLength(1);
  expect(st.decks[0].own[0]).toMatchObject({ w: 'meet a deadline', t: 'ทันกำหนดส่ง' });
  expect(st.decks[0].own[0].e).toContain('meet the deadline');
  // the whole "preposition" group into the same set; the one already there is not doubled
  await page.locator('#bcGrps [data-g="p"]').click();
  await page.locator('#bcAll').click();
  const id = st.decks[0].id;
  await page.locator(`.sheet-wrap.open [data-pd="${id}"]`).click();
  st = await readState(page);
  const n = await page.evaluate(() => BIZCOL.filter((r) => r.g === 'p').length);
  expect(st.decks[0].own).toHaveLength(1 + n);
  // set already has them all → disabled
  await page.locator('#bcAll').click();
  await expect(page.locator(`.sheet-wrap.open [data-pd="${id}"]`)).toBeDisabled();
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  // studying the set shows the collocation as a card
  await page.evaluate((id) => go('decks', id), id);
  await expect(page.locator('#dkList')).toContainText('meet a deadline');
  // word sheet ＋
  await page.evaluate(() => openSheet(WORD_BY.order));
  await page.locator('#bcBox [data-add]').first().click();
  await expect(page.locator('.sheet-wrap.open .pick-decks')).toBeVisible();
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  // game reveal
  await page.evaluate(() => startGame('bizcol'));
  const r = await page.evaluate(() => playQuiz.cur._bc);
  await page.locator(`.opt[data-o="${r.ans}"]`).click();
  await page.locator('#bcKeep').click();
  await expect(page.locator('.sheet-wrap.open')).toContainText(r.plain);
  expect(errors).toEqual([]);
});
