// Every game: play a whole round with both right and wrong answers and reach the result screen.
// (v1.6.0 shipped a Next button that broke only after a correct answer.)
const { test, expect } = require('@playwright/test');
const { openApp, readState, answer, playRound } = require('./helpers');

// Seed: placement done, a few stories read (story games), some wrong answers (review game).
async function setup(page) {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(async () => {
    const st = await loadStories();
    st.slice(0, 3).forEach((s) => (S.read[s.id] = today()));
    W.filter((w) => w.g === 'A1').slice(0, 12).forEach((w) => (S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now(), s: 2, c: 1, x: 2 }));
    save();
  });
  return errors;
}

const CHOICE = ['en2th', 'th2en', 'listen', 'cloze', 'colloc', 'sCloze', 'confuse', 'minpair', 'wform', 'idiom', 'sit', 'num', 'irreg', 'dprep', 'thaierr', 'gpat', 'ipa', 'guess', 'emoji', 'root'];
for (const id of CHOICE) {
  test(`choice game ${id}: right and wrong answers both work`, async ({ page }) => {
    const errors = await setup(page);
    await page.evaluate(() => { Math.random = () => 0.3; });
    await page.evaluate((id) => startGame(id), id);
    const seen = await playRound(page, id);
    expect(seen.ok, 'right answers').toBeGreaterThan(0);
    expect(seen.bad, 'wrong answers').toBeGreaterThan(0);
    const st = await readState(page);
    expect(st.best[id]).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

for (const id of ['spell', 'dict', 'speak', 'speakS', 'order', 'sOrder', 'review', 'hangman', 'anagram', 'compose']) {
  test(`game ${id}: a full round with right and wrong answers`, async ({ page }) => {
    const errors = await setup(page);
    await page.evaluate((id) => startGame(id), id);
    const seen = await playRound(page, id);
    if (id !== 'review') { // review mixes question types, so right/wrong isn't steered
      expect(seen.ok, 'right answers').toBeGreaterThan(0);
      expect(seen.bad, 'wrong answers').toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });
}

test('match game: right and wrong pairs, three rounds', async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => startGame('match'));
  const grid = page.locator('.match-grid');
  for (let round = 0; round < 3; round++) {
    await expect(grid.locator('.tile:not(.done)')).toHaveCount(12);
    const ids = await grid.locator('[data-k="en"]').evaluateAll((els) => els.map((e) => e.dataset.i));
    // One wrong pair first, then all the right ones.
    await grid.locator(`[data-k="en"][data-i="${ids[0]}"]`).click();
    await grid.locator(`[data-k="th"][data-i="${ids[1]}"]`).click();
    for (const i of ids) {
      await grid.locator(`[data-k="en"][data-i="${i}"]`).click();
      await grid.locator(`[data-k="th"][data-i="${i}"]`).click();
    }
    if (round < 2) await page.waitForTimeout(500);
  }
  await expect(page.locator('#view')).toContainText(/พลาด|ผิด|วินาที|s/);
  expect(errors).toEqual([]);
});

test('multiple-choice options never include a second right answer (no shared Thai meaning)', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const bad = await page.evaluate(() => {
    const out = [];
    for (const w of W) for (const hard of [false, true]) for (const field of ['w', 't']) {
      const d = distractors(w, 3, field, hard);
      if (d.length < 3) out.push(`${w.w}: only ${d.length} options`);
      for (const x of d) if (sharesMeaning(w, x)) out.push(`${w.w} (${w.t}) ~ ${x.w} (${x.t})`);
    }
    return out;
  });
  expect(bad.slice(0, 10)).toEqual([]);
  expect(errors).toEqual([]);
});
