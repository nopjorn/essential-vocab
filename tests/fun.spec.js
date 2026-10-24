// Fun features from 1.78: survival and time attack (1.78), challenge a friend (1.79), spelling games (1.80),
// auto difficulty (1.81), level map (1.82), word search (1.83), emoji on the word page (1.84).
const { test, expect } = require('@playwright/test');
const { openApp, readState, answer } = require('./helpers');

// `answer` learns where the right option sits from the first click, so that first answer may be either: report what happened.
async function play(page, ok, round) {
  expect(await answer(page, ok, round)).toBe(true);
  const reveal = page.locator('#view #reveal');
  await expect(reveal).not.toBeEmpty();
  return (await reveal.textContent()).includes('✅');
}

test('survival: 3 hearts, wrong answers end the run, level climbs every 5 questions, record kept', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; gameSource = 'all'; startGame('survival'); });
  const view = page.locator('#view'), round = {};
  const level = () => view.locator('.q-prompt').first().textContent();
  expect(await level()).toContain('A1');
  await expect(view.locator('#runStat')).toContainText('❤️❤️❤️');
  let rights = 0, lost = 0;
  const probe = await play(page, true, round); // first click is a probe
  if (probe) rights++; else lost++;
  while (rights < 6) {
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click();
    else await expect.poll(() => view.locator('#nextQ').count()).toBe(0);
    await expect(view.locator('.opt').first()).toBeVisible();
    if (rights + lost === 5) expect(await level()).toContain('A2');
    if (await play(page, true, round)) rights++;
  }
  await expect(view.locator('#runStat')).toContainText(`✅ ${rights}`);
  await expect(view.locator('#runStat')).toContainText('🖤'.repeat(lost) || '❤️');
  // now lose every remaining heart
  while (!(await view.locator('.result-emoji').count())) {
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click();
    await expect(view.locator('.opt, .result-emoji').first()).toBeVisible();
    if (await view.locator('.result-emoji').count()) break;
    await play(page, false, round);
    if ((await view.locator('#reveal').textContent()).includes('หัวใจหมดแล้ว')) { await view.locator('#nextQ').click(); break; }
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText(`รอดมาได้ ${rights} ข้อ`);
  expect((await readState(page)).best.survival).toBe(rights);
  expect(errors).toEqual([]);
});

test('survival: leaving early with ✕ shows the result; zero answers go back to the menu', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; startGame('survival'); });
  const view = page.locator('#view');
  await view.locator('#quit').click();
  await expect(view.locator('.game-tile').first()).toBeVisible();
  await page.evaluate(() => startGame('survival'));
  await answer(page, true, {});
  await view.locator('#quit').click();
  await expect(view.locator('.result-emoji')).toBeVisible();
  expect(errors).toEqual([]);
});

test('time attack: 60 s countdown ends the round, score = right answers, record kept', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.3; startGame('timeAttack'); });
  const view = page.locator('#view'), round = {};
  await expect(view.locator('#tLeft')).toBeVisible();
  let rights = 0;
  const step = async (ok) => {
    if (await play(page, ok, round)) rights++;
    await expect.poll(() => view.locator('#nextQ').count(), { timeout: 5000 }).toBe(0); // moves on by itself
    await expect(view.locator('.opt').first()).toBeVisible();
  };
  await step(true);
  for (let n = 0; n < 3; n++) await step(true);
  await step(false); // a wrong answer costs nothing but time
  await expect(view.locator('#runStat')).toContainText(`✅ ${rights}`);
  await page.evaluate(() => { const o = Date.now; Date.now = () => o() + 61000; }); // the minute is up
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText(`ตอบถูก ${rights} ข้อใน 60 วินาที`);
  expect((await readState(page)).best.timeAttack).toBe(rights);
  await view.locator('#again').click();
  await expect(view.locator('#tLeft')).toHaveText('60');
  expect(errors).toEqual([]);
});

test('challenge a friend (1.79): same code = same 10 questions on any device, parse pasted result, compare, share, saved', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  // codes: parse a pasted message, ignore junk
  const parsed = await page.evaluate(() => [
    duelParse('ท้าดวล! รหัส 2k7q2 · ฉันได้ 8/10 ใน 45 วินาที\n2K7Q2·8/10·45s https://x'),
    duelParse('1abcd'), duelParse('hello world'), duelParse('9K7Q2'), duelParse('2K7Q'),
  ]);
  expect(parsed[0]).toEqual({ code: '2K7Q2', friend: { r: 8, n: 10, t: 45 } });
  expect(parsed[1]).toEqual({ code: '1ABCD', friend: null });
  expect(parsed.slice(2)).toEqual([null, null, null]);
  // determinism: the same code always makes the same questions, another code makes others; options are real, distinct and include the answer
  const info = await page.evaluate(() => {
    const sig = (c) => JSON.stringify(duelQuestions(c).map((q) => [q.w.w, q.kind, q.opts.map((o) => o.w)]));
    const a = duelQuestions('2K7Q2');
    return {
      same: sig('2K7Q2') === sig('2K7Q2'), other: sig('2K7Q2') !== sig('2K7Q3'),
      n: a.length, uniq: new Set(a.map((q) => q.w.w)).size,
      okOpts: a.every((q) => q.opts.length === 4 && new Set(q.opts.map((o) => o.w)).size === 4 && new Set(q.opts.map((o) => thFirst(o.t))).size === 4 && q.opts.includes(q.w)),
      pool: a.every((q) => ['B1', 'B2'].includes(q.w.g)),
      newCode: /^[1-4][2-9A-HJKMN-Z]{4}$/.test(duelNewCode(2)),
    };
  });
  expect(info).toEqual({ same: true, other: true, n: 10, uniq: 10, okOpts: true, pool: true, newCode: true });
  // play the friend's set: the first answer is right, the rest wrong; result compares with the friend's
  await page.evaluate(() => go('games'));
  await page.locator('#toDuel').click();
  await page.locator('#duCode').fill('2K7Q2·1/10·30s');
  await page.locator('#duForm button[type=submit]').click();
  const view = page.locator('#view');
  for (let n = 0; n < 10; n++) {
    await expect(view.locator('.opt').first()).toBeVisible();
    const correct = await page.evaluate((n) => duelQuestions('2K7Q2')[n].w.idx, n);
    const sel = n === 0 ? `.opt[data-i="${correct}"]` : `.opt:not([data-i="${correct}"])`;
    await view.locator(sel).first().click();
    await view.locator('#nextQ').click();
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.duel-vs')).toContainText('1/10');
  await expect(view.locator('.h2').first()).toContainText(/ชนะ|เสมอ/);
  await expect(view.locator('.wrong-list .wl')).toHaveCount(9);
  const st = await readState(page);
  expect(st.duel['2K7Q2'].slice(0, 2)).toEqual([1, 10]);
  // share text carries the code and the result
  await page.evaluate(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d.text; }; });
  await view.locator('#duShare').click();
  await expect.poll(() => page.evaluate(() => window.__shared)).toMatch(/2K7Q2·1\/10·\d+s/);
  // menu lists the played code and can replay it
  await view.locator('#duMenu').click();
  await expect(view.locator('[data-code="2K7Q2"]')).toBeVisible();
  await view.locator('[data-code="2K7Q2"] [data-again]').click();
  await expect(view.locator('.opt').first()).toBeVisible();
  await view.locator('#quit').click();
  // a new code from the pool chips
  await view.locator('#duPool [data-p="3"]').click();
  await view.locator('#duNew').click();
  await expect(view.locator('.session-top')).toContainText(/3[2-9A-HJKMN-Z]{4}/);
  expect(errors).toEqual([]);
});

test('hangman (1.81): letters only words, misses cost lives, 4+ misses solved is not "right", keyboard works, give up reveals', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { gameSource = 'all'; });
  // the pool only holds single words of 4–12 letters
  expect(await page.evaluate(() => gamePool('hangman').every((w) => /^[a-z]{4,12}$/i.test(w.w)) && gamePool('anagram').length > 100)).toBe(true);
  await page.evaluate(() => startGame('hangman'));
  const view = page.locator('#view');
  const word = () => page.evaluate(() => W.find((w) => w.t === document.querySelector('.q-prompt .th').textContent && new RegExp('^' + [...document.querySelectorAll('.hg-c')].map((c) => c.textContent.trim() || '[a-zA-Z]').join('') + '$', 'i').test(w.w)).w.toLowerCase());
  let w = await word();
  await expect(view.locator('.hg-c').first()).toHaveText(w[0]); // first letter is free
  // 4 wrong letters, then solve: counts as solved but not right
  const wrongs = [...'zxqjvkw'].filter((c) => !w.includes(c)).slice(0, 4);
  for (const c of wrongs) await view.locator(`.hg-k[data-l="${c}"]`).click();
  await expect(view.locator('#hgLives')).toContainText('🖤🖤🖤🖤');
  for (const c of new Set(w)) { const k = view.locator(`.hg-k[data-l="${c}"]`); if (await k.isEnabled()) await k.click(); }
  await expect(view.locator('#reveal')).toContainText('พลาดหลายครั้ง');
  await view.locator('#nextQ').click();
  // physical keyboard + clean solve with no misses = right
  w = await word();
  for (const c of new Set(w)) await page.keyboard.press(c);
  await expect(view.locator('#reveal')).toContainText('เก่งมาก');
  await view.locator('#nextQ').click().catch(() => {});
  await expect(view.locator('.hg-k').first()).toBeVisible();
  // running out of lives loses and shows the word
  w = await word();
  for (const c of [...'zxqjvkwyfbp'].filter((c) => !w.includes(c)).slice(0, 6)) await view.locator(`.hg-k[data-l="${c}"]`).click();
  await expect(view.locator('#reveal')).toContainText(`คำตอบคือ ${w}`);
  expect(errors).toEqual([]);
});

test('anagram (1.81): tap letters to spell the word, one wrong try is forgiven, second ends the question', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { gameSource = 'all'; startGame('anagram'); });
  const view = page.locator('#view');
  const info = () => page.evaluate(() => ({ th: document.querySelector('.q-prompt .th').textContent, n: document.querySelectorAll('#oPool .ord-chip').length }));
  const { th, n } = await info();
  // several words can share one Thai meaning: the right one is the candidate made of exactly the letters on screen
  const shown = await view.locator('#oPool .ord-chip').allTextContents();
  const w = await page.evaluate(([th, letters]) => W.find((w) => w.t === th && /^[a-z]{4,12}$/i.test(w.w) && [...w.w.toLowerCase()].sort().join('') === letters).w.toLowerCase(), [th, [...shown].sort().join('')]);
  expect(w.length).toBe(n);
  // wrong order first: shortest way is to click chips in reverse index order
  for (let k = n - 1; k >= 0; k--) await view.locator(`#oPool [data-k="${k}"]`).click();
  const rev = [...w].reverse().join('') !== w;
  if (rev) await expect(view.locator('#reveal')).toContainText('ลองเรียงใหม่');
  await expect(view.locator('#oAns .ord-chip')).toHaveCount(0, { timeout: 3000 });
  for (let k = 0; k < n; k++) await view.locator(`#oPool [data-k="${k}"]`).click();
  await expect(view.locator('#oAns')).toContainText(w);
  await expect(view.locator('#reveal')).toContainText(rev ? 'ต้องลองสองครั้ง' : '✅');
  expect(errors).toEqual([]);
});

test('automatic difficulty (1.82): level from rolling accuracy, look-alike options, per-question timer, setting overrides', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', gacc: { a: 0.7, n: 0 } });
  const lv = (gacc, gdiff) => page.evaluate(([g, d]) => { S.gacc = g; S.settings.gdiff = d; return gameDiff(); }, [gacc, gdiff]);
  expect(await lv({ a: 0.99, n: 5 }, 'auto')).toBe(1);   // too few answers to judge
  expect(await lv({ a: 0.7, n: 40 }, 'auto')).toBe(1);
  expect(await lv({ a: 0.85, n: 40 }, 'auto')).toBe(2);
  expect(await lv({ a: 0.95, n: 40 }, 'auto')).toBe(3);
  expect(await lv({ a: 0.95, n: 40 }, '1')).toBe(1);     // fixed levels ignore accuracy
  expect(await lv({ a: 0.5, n: 40 }, '3')).toBe(3);
  // look-alike options really look alike (English) and share a topic (Thai)
  const cmp = await page.evaluate(() => {
    const words = W.filter((w) => w.g === 'B1' && /^[a-z]{5,8}$/.test(w.w)).slice(0, 60);
    const avg = (f) => words.reduce((s, w) => s + f(w), 0) / words.length;
    const sim = (hard) => avg((w) => distractors(w, 3, 'w', hard).reduce((s, x) => s + simScore(w.w, x.w), 0) / 3);
    const top = (hard) => avg((w) => distractors(w, 3, 't', hard).filter((x) => x.tp === w.tp).length);
    const hard = words.map((w) => distractors(w, 3, 'w', true)), hardT = words.map((w, k) => distractors(w, 3, 't', true));
    return {
      simHard: sim(true), simEasy: sim(false), topHard: top(true), topEasy: top(false),
      distinct: hard.every((d, k) => d.length === 3 && new Set([...d.map((x) => x.w), words[k].w]).size === 4) && hardT.every((d, k) => d.length === 3 && new Set([...d.map((x) => thFirst(x.t)), thFirst(words[k].t)]).size === 4),
    };
  });
  expect(cmp.simHard).toBeGreaterThan(cmp.simEasy + 1);
  expect(cmp.topHard).toBeGreaterThan(cmp.topEasy);
  expect(cmp.distinct).toBe(true);
  // games menu shows the level; the setting is saved
  await page.evaluate(() => { S.gacc = { a: 0.85, n: 40 }; S.settings.gdiff = 'auto'; go('games'); });
  await expect(page.locator('#gDiff')).toContainText('⭐⭐');
  await expect(page.locator('#gDiff')).toContainText('แม่น 85%');
  await page.locator('#gDiffSet').click();
  await expect(page.locator('#gdiff')).toBeVisible();
  await page.locator('#gdiff').selectOption('3');
  expect((await readState(page)).settings.gdiff).toBe('3');
  // level 3: a timer bar; running out of time counts as wrong and lowers the accuracy
  await page.evaluate(() => {
    S.gacc = { a: 0.95, n: 40 }; S.settings.gdiff = 'auto';
    const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms >= 10000 ? 300 : ms, ...a); // 12 s → 0.3 s
    gameSource = 'all'; startGame('en2th');
  });
  const view = page.locator('#view');
  await expect(view.locator('.q-timer')).toBeVisible();
  await expect(view.locator('#reveal')).toContainText('หมดเวลา');
  await expect(view.locator('.opt.correct')).toHaveCount(1);
  const after = await page.evaluate(() => S.gacc);
  expect(after.n).toBe(41); expect(after.a).toBeLessThan(0.95);
  // level 1: no timer; a right answer raises the count
  await page.evaluate(() => { S.gacc = { a: 0.7, n: 40 }; S.settings.gdiff = 'auto'; startGame('en2th'); });
  await expect(view.locator('.opt').first()).toBeVisible();
  expect(await view.locator('.q-timer').count()).toBe(0);
  expect(errors).toEqual([]);
});
