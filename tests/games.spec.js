// Every game: play a whole round with both right and wrong answers and reach the result screen.
// (v1.6.0 shipped a Next button that broke only after a correct answer.)
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

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

// Answers the current question right (ok) or wrong. Returns false if no question is on screen.
// `round.at` = position of the right option, learnt from the first answer: Math.random is pinned
// for choice games, so the options come out in the same order every question.
async function answer(page, ok, round) {
  const view = page.locator('#view');
  if (await view.locator('.opt').count()) {
    const at = round.at == null ? 0 : ok ? round.at : +!round.at;
    await view.locator('.opt').nth(at).click();
    round.at = await view.locator('.opt').evaluateAll((els) => els.findIndex((e) => e.classList.contains('correct')));
  } else if (await view.locator('#oPool').count()) {
    if (ok) {
      const k = await view.locator('#oPool .ord-chip').count();
      for (let i = 0; i < k; i++) await view.locator(`#oPool [data-k="${i}"]`).click();
    } else await view.locator('#oGive').click();
  } else if (await view.locator('#mic').count()) {
    if (ok) {
      await view.locator('[data-say]').first().click();
      await page.evaluate(() => (window.__heard = window.__said.at(-1)));
      await view.locator('#mic').click();
    } else {
      await page.evaluate(() => (window.__heard = 'zzzz'));
      for (let i = 0; i < 3; i++) { await view.locator('#mic').click(); await page.waitForTimeout(80); }
    }
  } else if (await view.locator('#si').count()) {
    if (!ok) { await view.locator('#skip').click(); }
    else {
      const dict = await view.locator('.q-prompt [data-say]').count();
      if (dict) await view.locator('.q-prompt [data-say]').click(); // speaks the full sentence
      const word = await page.evaluate(() => {
        const cloze = document.querySelector('.q-prompt .cloze');
        if (cloze) { // dictation: the missing word is what the spoken sentence has in place of the blank
          const [pre, post] = cloze.textContent.split('_____');
          const said = window.__said.at(-1);
          return said.slice(pre.length, said.length - post.length).trim();
        }
        const th = document.querySelector('.q-prompt .th').textContent;
        const hint = new RegExp('^' + document.querySelector('#hint').textContent.replace(/_/g, '[a-zA-Z]') + '$');
        return W.find((w) => w.t === th && hint.test(w.w)).w;
      });
      await view.locator('#si').fill(word);
      await view.locator('#sf button[type=submit]').click();
    }
  } else return false;
  return true;
}

async function playRound(page, id) {
  const view = page.locator('#view');
  const seen = { ok: 0, bad: 0 }, round = {};
  for (let n = 0; n < 12; n++) {
    if (await view.locator('.result-emoji').count()) break;
    const before = await view.locator('.progress > div').getAttribute('style');
    expect(await answer(page, n % 2 === 0, round), `${id}: question ${n} has no input`).toBe(true);
    await expect(view.locator('#reveal')).not.toBeEmpty();
    (await view.locator('#reveal').textContent()).includes('✅') ? seen.ok++ : seen.bad++;
    // Next works after either answer; a right answer may also advance by itself.
    const next = view.locator('#nextQ');
    if (await next.count()) await next.click().catch(() => {});
    await expect.poll(async () => (await view.locator('.result-emoji').count()) || (await view.locator('.progress > div').getAttribute('style').catch(() => null)) !== before, { message: `${id}: stuck on question ${n}` }).toBeTruthy();
  }
  await expect(view.locator('.result-emoji'), `${id}: result screen`).toBeVisible();
  return seen;
}

const CHOICE = ['en2th', 'th2en', 'listen', 'cloze', 'colloc', 'sCloze', 'confuse', 'minpair', 'wform', 'idiom', 'sit', 'emoji'];
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

for (const id of ['spell', 'dict', 'speak', 'speakS', 'order', 'sOrder', 'review']) {
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
