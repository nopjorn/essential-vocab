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

test('level map (1.83): stages cover every topic word once, easy first; stars thresholds; unlocking; replay keeps best stars; backup merge', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const info = await page.evaluate(() => {
    let covered = 0, okSizes = true, okOrder = true, total = 0;
    for (const [id] of TOPICS) {
      const st = topicStages(id), words = W.filter((w) => w.tp === id);
      total += words.length; covered += st.flat().length;
      if (new Set(st.flat()).size !== words.length) okSizes = false;
      if (st.length && !st.every((s, k) => s.length >= (k === st.length - 1 && st.length > 1 ? 4 : Math.min(8, words.length)) && s.length <= 11)) okSizes = false;
      const lv = st.flat().map((w) => LEVELS.indexOf(w.g));
      if (lv.some((x, k) => k && x < lv[k - 1])) okOrder = false;
    }
    return { covered, total, okSizes, okOrder, stars: [8, 7, 6, 5, 4].map((r) => starsFor(r, 8)), n11: [11, 10, 8, 7, 6].map((r) => starsFor(r, 11)) };
  });
  expect(info.covered).toBe(info.total); expect(info.okSizes).toBe(true); expect(info.okOrder).toBe(true);
  expect(info.stars).toEqual([3, 2, 1, 1, 0]); expect(info.n11).toEqual([3, 2, 1, 1, 0]);
  // backup merge keeps the better star of every stage and the longer path
  const merged = await page.evaluate(() => { S.lvmap = { animal: '12' }; mergeBackup({ lvmap: { animal: '3', food: '21x' } }); return S.lvmap; });
  expect(merged).toEqual({ animal: '32', food: '21' });
  await page.evaluate(() => { S.lvmap = {}; Math.random = () => 0; go('map'); }); // random 0: en2th / th2en only, same option order
  const view = page.locator('#view');
  await expect(view.locator('.map-topic')).toHaveCount(await page.evaluate(() => TOPICS.length));
  await view.locator('.map-topic[data-t="animal"]').click();
  const stages = await page.evaluate(() => topicStages('animal').length);
  await expect(view.locator('.map-node')).toHaveCount(stages);
  await expect(view.locator('.map-node.lock')).toHaveCount(stages - 1);
  await expect(view.locator('.map-node.sel')).toHaveClass(/cur/);
  await view.locator('.map-node button[data-k="1"]').click();
  await expect(view.locator('#mpSel')).toContainText('🔒');
  expect(await view.locator('#mpGo').count()).toBe(0);
  await view.locator('.map-node button[data-k="0"]').click();
  await expect(view.locator('#mpSel .map-words span')).toHaveCount(await page.evaluate(() => topicStages('animal')[0].length));
  const play = async (right) => {
    const n = await page.evaluate(() => document.querySelectorAll('.progress').length && 0);
    for (let q = 0; q < 8; q++) {
      await expect(view.locator('.opt').first()).toBeVisible();
      const rightIdx = await page.evaluate(() => {
        const pos = document.querySelector('.q-prompt .pos').textContent, word = document.querySelector('.q-prompt .word'), th = document.querySelector('.q-prompt .th');
        return (word ? W.find((x) => x.w === word.textContent && x.p === pos) : W.find((x) => x.t === th.textContent && x.p === pos)).idx;
      });
      const opt = right ? view.locator(`.opt[data-i="${rightIdx}"]`) : view.locator(`.opt:not([data-i="${rightIdx}"])`).first();
      await opt.click();
      if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click().catch(() => {});
      await expect.poll(async () => (await view.locator('.result-emoji').count()) || (await view.locator('#nextQ').count()) === 0).toBeTruthy();
    }
  };
  await view.locator('#mpGo').click();
  await expect(page.locator('#title')).toContainText('ด่าน 1');
  await play(true);
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText('★★★');
  await expect(view.locator('#stNext')).toBeVisible();
  expect((await readState(page)).lvmap.animal).toBe('3');
  // next stage opens; ✕ goes back to the path of this topic
  await view.locator('#stNext').click();
  await expect(page.locator('#title')).toContainText('ด่าน 2');
  await view.locator('#quit').click();
  await expect(view.locator('.map-path')).toBeVisible();
  await expect(view.locator('.map-node.sel')).toHaveClass(/cur/); // points at stage 2 now
  expect(await view.locator('.map-node.lock').count()).toBe(stages - 2);
  // replaying stage 1 badly: not passed, but the 3 stars stay
  await view.locator('.map-node button[data-k="0"]').click();
  await view.locator('#mpGo').click();
  await play(false);
  await expect(view.locator('.h2')).toContainText('☆☆☆');
  await expect(view.locator('#reveal, .card-box').first()).toContainText('ยังไม่ผ่าน');
  expect((await readState(page)).lvmap.animal).toBe('3');
  await view.locator('#back').click();
  await expect(view.locator('.map-path')).toBeVisible();
  // map list shows progress; the games menu card too
  await page.locator('#topBack').click(); // the in-page back button is mirrored in the top bar
  await expect(view.locator('.map-topic[data-t="animal"]')).toContainText('★ 3/');
  await page.evaluate(() => go('games'));
  await expect(page.locator('#toMap')).toContainText('ผ่าน 1/');
  expect(errors).toEqual([]);
});

test('level map (1.83): stages mix every question type and reach the stars screen', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { Math.random = () => 0.5; startStage('food', 0); });
  const view = page.locator('#view'), seen = new Set();
  for (let q = 0; q < 12 && !(await view.locator('.result-emoji').count()); q++) {
    await expect(view.locator('.opt, #oPool, .result-emoji').first()).toBeVisible();
    if (await view.locator('.result-emoji').count()) break;
    seen.add((await view.locator('#oPool').count()) ? 'anagram' : (await view.locator('.cloze').count()) ? 'cloze' : (await view.locator('.speak').count()) ? 'listen' : 'mc');
    if (await view.locator('#oPool').count()) await view.locator('#oGive').click();
    else await view.locator('.opt').first().click();
    if (await view.locator('#nextQ').count()) await view.locator('#nextQ').click().catch(() => {});
  }
  await expect(view.locator('.result-emoji')).toBeVisible();
  expect(seen.size).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('guide (1.84): the duel, level map and word search sections sit in the practice group', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('guide'));
  const grp = await page.evaluate(() => ['ท้าดวลเพื่อน', 'แผนที่ด่าน', 'ค้นหาคำในตาราง'].map((t) => GUIDE_GROUPS[guideGroupOf(t)][1]));
  expect(grp).toEqual(['เรียนและฝึก', 'เรียนและฝึก', 'เรียนและฝึก']);
  expect(errors).toEqual([]);
});

test('word search (1.85): grid invariants for every difficulty', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const res = await page.evaluate(() => {
    const out = {};
    for (const diff of ['easy', 'normal', 'hard']) {
      let builds = 0, bad = 0, minWords = 99; const dirs = new Set();
      for (let k = 0; k < 60; k++) {
        const words = wsPick(['', 'animal', 'food', 'job'][k % 4] || '');
        const b = wsBuild(words, diff, duelRng(diff + k));
        if (!b) continue;
        builds++; minWords = Math.min(minWords, b.words.length);
        for (const p of b.words) {
          const s = p.w.w.toLowerCase();
          dirs.add(p.dr + ',' + p.dc);
          const read = [...s].map((_, i) => b.grid[p.r + p.dr * i] && b.grid[p.r + p.dr * i][p.c + p.dc * i]).join('');
          if (read !== s) bad++;
        }
        if (b.grid.length !== 10 || b.grid.some((r) => r.length !== 10 || r.some((c) => !/^[a-z]$/.test(c)))) bad++;
      }
      out[diff] = { builds, bad, minWords, dirs: [...dirs].sort().join(' ') };
    }
    // the picked words: single, 4–9 letters, none inside another
    const w = wsPick('animal');
    out.pick = { n: w.length, ok: w.every((x) => /^[a-z]{4,9}$/i.test(x.w) && x.tp === 'animal'), nested: w.some((a, i) => w.some((b, j) => i !== j && a.w.toLowerCase().includes(b.w.toLowerCase()))) };
    return out;
  });
  for (const d of ['easy', 'normal', 'hard']) { expect(res[d].builds).toBeGreaterThan(40); expect(res[d].bad).toBe(0); expect(res[d].minWords).toBeGreaterThanOrEqual(6); }
  expect(res.easy.dirs).toBe('0,1 1,0');
  expect(res.normal.dirs.split(' ').every((d) => ['0,1', '1,0', '1,1', '-1,1'].includes(d))).toBe(true);
  expect(res.hard.dirs.split(' ').length).toBeGreaterThan(5);
  expect(res.pick.n).toBe(8); expect(res.pick.ok).toBe(true); expect(res.pick.nested).toBe(false);
  expect(errors).toEqual([]);
});

test('word search (1.85): tap-tap, drag, reverse, wrong line, hint, finish and give up update progress', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('#toWs').click();
  await page.locator('#wsTopic').selectOption('animal');
  await page.locator('#wsDiff [data-d="hard"]').click();
  await page.locator('#wsGo').click();
  const view = page.locator('#view');
  await expect(view.locator('.ws-c')).toHaveCount(100);
  await expect(view.locator('#wsList li')).toHaveCount(await page.evaluate(() => wsGame.words.length));
  const cell = (r, c) => view.locator(`.ws-c[data-r="${r}"][data-c="${c}"]`);
  const ends = (k) => page.evaluate((k) => { const p = wsGame.words[k], n = p.w.w.length; return { a: [p.r, p.c], b: [p.r + p.dr * (n - 1), p.c + p.dc * (n - 1)] }; }, k);
  const total = await page.evaluate(() => wsGame.words.length);
  // wrong: two letters that are not in line do nothing; a line that spells nothing shakes and clears
  await cell(0, 0).click(); await cell(1, 2).click();
  expect(await view.locator('#wsList li.found').count()).toBe(0);
  await expect(view.locator('.ws-c.anchor')).toHaveCount(1); // the second tap started a new first letter
  await cell(1, 2).click(); // same letter again: cancel
  await expect(view.locator('.ws-c.anchor')).toHaveCount(0);
  // tap first and last letter
  let e = await ends(0);
  await cell(...e.a).click(); await expect(view.locator('.ws-c.anchor')).toHaveCount(1); await cell(...e.b).click();
  await expect(view.locator('#wsList li.found')).toHaveCount(1);
  await expect(view.locator('#wsLeft')).toContainText(`เหลือ ${total - 1} คำ`);
  // drag across the letters
  e = await ends(1);
  const box = async (c) => (await cell(...c).boundingBox());
  const a = await box(e.a), b = await box(e.b);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
  await expect(view.locator('#wsList li.found')).toHaveCount(2);
  // reverse direction (from the last letter back to the first)
  e = await ends(2);
  await cell(...e.b).click(); await cell(...e.a).click();
  await expect(view.locator('#wsList li.found')).toHaveCount(3);
  // hint shows the first letter of an unfound word
  await view.locator('#wsHint').click();
  await expect(view.locator('.ws-c.hint')).toHaveCount(1);
  expect(await page.evaluate(() => wsGame.words.filter((p) => p.hint).length)).toBe(1);
  // find the rest by tapping
  for (let k = 3; k < total; k++) { e = await ends(k); await cell(...e.a).click(); await cell(...e.b).click(); }
  await expect(view.locator('.result-emoji')).toBeVisible({ timeout: 5000 });
  await expect(view.locator('.h2').first()).toContainText(`เจอครบ ${total} คำ`);
  const st = await readState(page);
  expect(st.counts.wsearch).toBe(1);
  expect(await page.evaluate(() => W.filter((w) => S.prog[w.w] && S.prog[w.w].c >= 1).length)).toBeGreaterThanOrEqual(total);
  // another table: give up shows the missing words and counts them as missed
  await view.locator('#wsAgain').click();
  await expect(view.locator('.ws-c')).toHaveCount(100);
  e = await ends(0); await cell(...e.a).click(); await cell(...e.b).click();
  const missed = await page.evaluate(() => wsGame.words.slice(1).map((p) => p.w.w));
  await view.locator('#wsGive').click();
  await expect(view.locator('.h2').first()).toContainText(`เจอ 1/${total} คำ`);
  expect(await view.locator('.ws-c.rev').count()).toBeGreaterThan(0);
  expect(await page.evaluate((m) => m.every((w) => S.prog[w] && S.prog[w].x >= 1), missed)).toBe(true);
  await view.locator('#wsMenu').click();
  await expect(view.locator('#wsGo')).toBeVisible();
  expect(errors).toEqual([]);
});
