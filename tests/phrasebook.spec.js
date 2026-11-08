// Phrase books (1.212.0+, js/phrasebook.js): each book has a reference page and a game with its id (qBook in data/play.js).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const BOOKS = [['doctor', 'toDr'], ['thai', 'toTh'], ['chat', 'toCh'], ['abbr', 'toAb']];

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
