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

const CHOICE = ['en2th', 'th2en', 'listen', 'cloze', 'colloc', 'sCloze', 'confuse', 'minpair', 'wform', 'idiom', 'sit', 'num', 'irreg', 'dprep', 'thaierr', 'gpat', 'real', 'wphr', 'bizcol', 'regi', 'abbr', 'rplay', 'meeting', 'interview', 'devtalk', 'sayit', 'itcol', 'pbear', 'doctor', 'thai', 'chat', 'email', 'toeic1', 'toeic2', 'toeic3', 'toeic4', 'toeic5', 'toeic6', 'toeic7', 'ipa', 'guess', 'emoji', 'root'];
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

for (const id of ['spell', 'dict', 'speak', 'speakS', 'order', 'sOrder', 'review', 'hangman', 'anagram', 'compose', 'hand']) {
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

// 1.264.3: checking every word × 4 option sets took 3.4 min on the PC (~10,500 words) and grew with the square of the word count
// (each distractors() call scans every word). Now: every word of the newest extra group (what a release usually adds) plus a
// seventh of all the others that moves on by one each day, so a week of runs still covers every word.
// 1.264.7: the plain and the hard distractors are two tests, so they can run side by side (29 s as one on CI).
for (const hard of [false, true]) test(`multiple-choice options never include a second right answer (no shared Thai meaning)${hard ? ', hard distractors' : ''}`, async ({ page }) => {
  test.setTimeout(120000);
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const r = await page.evaluate(([day, hard]) => {
    const newest = GROUPS_X[GROUPS_X.length - 1].g, out = [];
    const pick = W.filter((w, i) => w.g === newest || (i + day) % 7 === 0);
    for (const w of pick) for (const field of ['w', 't']) {
      const d = distractors(w, 3, field, hard);
      if (d.length < 3) out.push(`${w.w}: only ${d.length} options`);
      for (const x of d) if (sharesMeaning(w, x)) out.push(`${w.w} (${w.t}) ~ ${x.w} (${x.t})`);
    }
    return { out, newest: pick.filter((w) => w.g === newest).length, n: pick.length, all: W.length };
  }, [Math.floor(Date.now() / 864e5), hard]);
  expect(r.newest).toBeGreaterThan(100); // the newest group's word file is loaded and checked in full
  expect(r.n).toBeGreaterThan(r.all / 7);
  expect(r.out.slice(0, 10)).toEqual([]);
  expect(errors).toEqual([]);
});
