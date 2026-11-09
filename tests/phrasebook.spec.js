// Phrase books (1.212.0+, js/phrasebook.js): each book has a reference page and a game with its id (qBook in data/play.js).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const BOOKS = [['itcol', 'toIc'], ['doctor', 'toDr'], ['thai', 'toTh'], ['chat', 'toCh'], ['abbr', 'toAb']];

for (const [id, btn] of BOOKS) {
  test(`${id}: the page lists every row by category, speaks, keeps a row in a set and starts the game`, async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => go('ref'));
    await page.locator('#' + btn).click();
    await expect(page.locator('#pbList .pb-item').first()).toBeVisible();
    const n = await page.evaluate((id) => PB_DATA[id].length, id);
    await expect(page.locator('#pbList .pb-item')).toHaveCount(n);
    // a category chip narrows the list
    const cat = await page.evaluate((id) => PB_DATA[id][0].cat, id);
    await page.locator(`#pbCats [data-c="${cat}"]`).click();
    const nc = await page.evaluate(([id, cat]) => PB_DATA[id].filter((r) => r.cat === cat).length, [id, cat]);
    await expect(page.locator('#pbList .pb-item')).toHaveCount(nc);
    await page.locator('#pbList [data-say]').first().click();
    await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
    // ＋ keeps it as a word of my own in a new set
    await page.locator('#pbList [data-add]').first().click();
    await page.locator('.sheet-wrap.open [data-pd="new"]').click();
    const first = await page.evaluate((id) => PB_DATA[id].filter((r) => r.cat === PB_DATA[id][0].cat)[0].en, id);
    await expect.poll(() => page.evaluate(() => (S.decks.at(-1).own || []).map((o) => o.w))).toEqual([first]);
    await expect(page.locator('.sheet-wrap.open')).toHaveCount(0);
    await page.locator('#pbPlay').click();
    await expect(page.locator('.options .opt')).toHaveCount(4);
    expect(errors).toEqual([]);
  });

  test(`${id} game: every question mode has 4 distinct options, right and wrong answers are scheduled`, async ({ page }) => {
    const errors = await openApp(page);
    const ok = await page.evaluate(async (id) => {
      await loadBook(id);
      const en = new Set(PB_DATA[id].map((r) => r.en));
      if (!(PB[id].same || []).flat().every((x) => en.has(x))) return 'a `same` entry is not in the book';
      return PB[id].modes.every((m) => PB_DATA[id].every((r) => { const q = pbQuestion(id, r, m); return q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.includes(q.right); }));
    }, id);
    expect(ok).toBe(true);
    await page.evaluate((id) => startGame(id), id);
    const view = page.locator('#view');
    await expect(view.locator('.options .opt')).toHaveCount(4);
    let q = await page.evaluate(() => pbQuestion.last);
    await view.locator('.opt').filter({ hasText: q.right }).first().click();
    await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
    await expect(view.locator('.pb-ex')).toBeVisible();
    await view.locator('#nextQ').click();
    q = await page.evaluate(() => pbQuestion.last);
    await view.locator('.opt').filter({ hasNotText: q.right }).first().click();
    await expect(view.locator('#reveal')).toContainText('ยังไม่ถูก');
    await page.evaluate(() => flushSave());
    const keys = Object.entries((await readState(page)).lex).filter(([k]) => k.startsWith(id + ':'));
    expect(keys.length).toBe(2);
    expect(keys.some(([, p]) => p.x === 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('pbear (1.220): hear a phrase from the listening books, pick the Thai; a book page starts it for that book only', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => startGame('pbear'));
  const view = page.locator('#view');
  await expect(view.locator('.options .opt')).toHaveCount(4);
  const cur = await page.evaluate(() => ({ en: playQuiz.cur._pb.en, ear: PB[playQuiz.cur._book].ear, q: pbQuestion.last }));
  expect(cur.ear).toBe(true);
  await expect(view.locator('#pbTxt')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__said.at(-1))).toBe(cur.en);
  await view.locator('#pbHint').click();
  await expect(view.locator('#pbTxt')).toHaveText(cur.en);
  await view.locator('.opt').filter({ hasText: cur.q.right }).first().click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await view.locator('#nextQ').click();
  const q2 = await page.evaluate(() => pbQuestion.last);
  await view.locator('.opt').filter({ hasNotText: q2.right }).first().click();
  await expect(view.locator('#reveal')).toContainText('ยังไม่ถูก');
  expect(await page.evaluate(() => Object.keys(S.lex).filter((k) => k.startsWith('pbear:')).length)).toBe(2);
  // abbreviations are never in it; the doctor page's 🎧 button plays doctor phrases only
  expect(await page.evaluate(() => pbEarIds().includes('abbr'))).toBe(false);
  await page.evaluate(() => { go('ref'); REF_PAGES.doctor(); });
  await page.locator('#pbEar').click();
  await expect(view.locator('.options .opt')).toHaveCount(4);
  expect(await page.evaluate(() => playQuiz.cur._book)).toBe('doctor');
  expect(errors).toEqual([]);
});

test('word sheet (1.221): a 📚 box lists phrases from the spoken books that use the word, speaks and keeps one', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => openSheet(WORD_BY.throat)); // "I have a sore throat." in the doctor book
  const box = page.locator('#pbBox');
  await expect(box).toContainText('I have a sore throat.');
  await box.locator('[data-say]').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.at(-1))).toMatch(/throat/i);
  await box.locator('[data-pb]').first().click();
  await page.locator('.sheet-wrap.open [data-pd="new"]').click();
  await expect.poll(() => page.evaluate(() => (S.decks.at(-1).own || []).map((o) => o.w))).toContain('I have a sore throat.');
  // a word with no phrase leaves the box empty
  await page.evaluate(() => { document.querySelectorAll('.sheet-wrap').forEach((s) => s.remove()); openSheet(WORD_BY.algebra || W.find((w) => w.w === 'zebra') || W[0]); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => ['algebra', 'zebra'].some((x) => phrasesOf(x).length))).toBe(false);
  expect(errors).toEqual([]);
});
