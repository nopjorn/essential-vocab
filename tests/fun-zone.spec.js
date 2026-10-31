// 1.115+: fun zone - hub, coins, power-ups, coin shop, endless tower, new secret medals.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const base = { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } };

// Answer the funAsk() question on screen right (or wrong).
async function funAnswer(page, ok) {
  await expect(page.locator('.q-prompt')).toBeVisible();
  const k = await page.evaluate((ok) => { const i = funAsk.opts.indexOf(funAsk.cur); return ok ? i : [...document.querySelectorAll('.opt')].map((o) => +o.dataset.k).find((x) => x !== i && !document.querySelector(`.opt[data-k="${x}"]`).disabled); }, ok);
  await page.locator(`.opt[data-k="${k}"]`).click();
  await page.waitForTimeout(ok ? 750 : 1600);
}

test('fun hub: tiles open their pages, home card and games menu link to it', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => go('home'));
  await expect(page.locator('.fun-card')).toBeVisible();
  await page.locator('.fun-card').click();
  await expect(page.locator('.fun-tile[data-fun="tower"]')).toBeVisible();
  const ids = await page.locator('.fun-tile').evaluateAll((els) => els.map((e) => e.dataset.fun));
  expect(ids[0]).toBe('tower');
  expect(ids.at(-1)).toBe('shop');
  await page.locator('.fun-tile[data-fun="shop"]').click();
  await expect(page.locator('.shop-row').first()).toBeVisible();
  await page.evaluate(() => go('games'));
  await expect(page.locator('#view [data-go="fun"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('coins: per-device buckets, merge keeps the larger numbers, shop buys an item once, bad data is cleaned', async ({ page }) => {
  const errors = await openApp(page, { ...base, coin: { other: [100, 20], bad: 'x', neg: [-5, 'a'] } });
  expect(await page.evaluate(() => coinBal())).toBe(80);
  await page.evaluate(() => addCoins(50));
  expect(await page.evaluate(() => coinBal())).toBe(130);
  await page.evaluate(() => mergeBackup({ coin: { other: [90, 40], dev2: [10, 0] } }));
  expect(await page.evaluate(() => coinBal())).toBe(100 - 40 + 50 + 10);
  await page.evaluate(() => go('coinshop'));
  await page.locator('[data-buy="acc:flower"]').click();
  expect(await page.evaluate(() => [coinBal(), S.owned.includes('acc:flower'), itemOpen('acc:flower')])).toEqual([40, true, true]);
  await expect(page.locator('[data-buy="acc:flower"]')).toHaveCount(0);
  await expect(page.locator('[data-buy="acc:tophat"]')).toBeDisabled(); // 150 > 40
  expect(await page.evaluate(() => spendCoins(999))).toBe(false);
  const st = await readState(page);
  expect(Object.keys(st.coin).sort()).toEqual(expect.arrayContaining(['other', 'dev2']));
  expect(st.coin.bad).toBeUndefined();
  // the wardrobe shows the price hint for coin items and draws them
  await page.evaluate(() => go('mascot'));
  await expect(page.locator('#view')).toContainText('🪙 150 ที่ร้านค้า');
  expect(await page.evaluate(() => ['tophat', 'flower', 'wizard'].every((h) => mascotSvg({ equip: { head: h } }).length > mascotSvg({}).length + 100) && mascotSvg({ equip: { body: 'scarf' } }).length > mascotSvg({}).length + 100)).toBe(true);
  expect(errors).toEqual([]);
});

test('tower: right answers clear floors (+coins), wrong ones cost hearts, a run ends at 0 hearts; boss floor saves a checkpoint', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => go('tower'));
  await page.locator('#twGo').click();
  for (let k = 0; k < 6; k++) await funAnswer(page, true); // floors 1 and 2
  await expect.poll(() => page.evaluate(() => S.tower.best)).toBe(2);
  expect(await page.evaluate(() => coinBal())).toBe(2);
  for (let k = 0; k < 3; k++) await funAnswer(page, false);
  await expect(page.locator('#twAgain')).toBeVisible();
  await expect(page.locator('#view')).toContainText('ไปถึงชั้น 3');
  expect(await page.evaluate(() => [S.tower.runs, S.tower.cp])).toEqual([1, 0]);
  // start at floor 10 (boss: 5 questions) via a checkpoint-less shortcut
  await page.evaluate(() => { S.tower.best = 9; runTower(10); });
  for (let k = 0; k < 5; k++) await funAnswer(page, true);
  await expect.poll(() => page.evaluate(() => S.tower.cp)).toBe(10);
  await expect(page.locator('.tw-banner')).toContainText('ชั้น 11');
  await page.locator('#twQuit').click().catch(() => {});
  await page.evaluate(() => go('tower'));
  await expect(page.locator('[data-start="11"]')).toBeVisible();
  expect(await page.evaluate(() => twPool(11).every((w) => w.g === 'A2') && twPool(70).every((w) => /^(B2|B2x|C1)$/.test(w.g)))).toBe(true);
  expect(await page.evaluate(() => { mergeBackup({ tower: { best: 40, cp: 33, runs: 1 } }); return S.tower; })).toEqual({ best: 40, cp: 30, runs: 2 });
  expect(errors).toEqual([]);
});

test('power-ups: 50:50 hides two wrong options, skip counts as right without touching the card, heart refills', async ({ page }) => {
  const errors = await openApp(page, { ...base, coin: { x: [100, 0] } });
  await page.evaluate(() => runTower(1));
  await expect(page.locator('.q-prompt')).toBeVisible();
  await page.locator('[data-pw="fifty"]').click();
  await expect(page.locator('.opt.gone')).toHaveCount(2);
  expect(await page.evaluate(() => coinBal())).toBe(95);
  await funAnswer(page, false); // lose a heart: the heart power-up shows on the next question
  await expect(page.locator('[data-pw="heart"]')).toBeVisible();
  await page.locator('[data-pw="heart"]').click();
  await expect(page.locator('#twH')).toHaveText('❤️❤️❤️');
  const before = await page.evaluate(() => [funAsk.cur.w, JSON.stringify(S.prog[funAsk.cur.w] || null)]);
  await page.locator('[data-pw="skip"]').click();
  await page.waitForTimeout(800);
  expect(await page.evaluate((w) => JSON.stringify(S.prog[w] || null), before[0])).toBe(before[1]); // skipping never touches the card
  expect(await page.evaluate(() => coinBal())).toBe(100 - 5 - 15 - 8);
  expect(await page.evaluate(() => S.counts.pw)).toBe(3);
  expect(errors).toEqual([]);
});

test('secret medals: new ones exist, are hidden until earned, and unlock from their counters', async ({ page }) => {
  const errors = await openApp(page, { ...base, tower: { best: 100, cp: 100, runs: 3 }, counts: { quests: 0, speak: 0, perfect: 0, maxCoin: 600, buys: 5 }, best: { timeAttack: 31 } });
  await page.evaluate(() => { save(); flushSave(); });
  const got = await page.evaluate(() => ['tower10', 'tower50', 'sTower', 'sRich', 'sShop', 'sSpeed'].filter((id) => S.ach[id]));
  expect(got).toEqual(['tower10', 'tower50', 'sTower', 'sRich', 'sShop', 'sSpeed']);
  expect(await page.evaluate(() => ACH.filter((a) => a.secret).length)).toBeGreaterThanOrEqual(9);
  expect(errors).toEqual([]);
});

/* ---------- 1.119: daily puzzles, album, garden ---------- */
test('crossword generator: same grid for the same day on every call, words cross, fit 9×9, clues numbered; ladder has a valid path', async ({ page }) => {
  const errors = await openApp(page, base);
  const r = await page.evaluate(() => {
    const out = [];
    for (let k = 0; k < 40; k++) {
      const day = ymd(new Date(Date.UTC(2026, 0, 1) + k * DAY));
      const cw = makeCrossword(day), L = makeLadder(day), g = ladGraph();
      // every word's letters agree with the grid; the grid has no stray letters
      const okWords = cw.words.every((x) => cwCells(x).every(([r, c], i) => cw.grid[r][c] === x.w.w[i]));
      const cells = cw.grid.flat().filter(Boolean).length, used = new Set(cw.words.flatMap((x) => cwCells(x).map(([r, c]) => r + ',' + c))).size;
      const crossing = cw.words.every((x) => cw.words.some((y) => y !== x && y.d !== x.d && cwCells(y).some(([r, c]) => cwCells(x).some(([r2, c2]) => r === r2 && c === c2))));
      const path = L && L.path.every((s, i) => g.set.has(s) && (i === 0 || ladDiff(L.path[i - 1], s))) && L.path.length >= 4 && L.path.length <= 6;
      out.push(okWords && cells === used && crossing && cw.rows <= 9 && cw.cols <= 9 && cw.words.length >= 4 && path && JSON.stringify(makeCrossword(day).grid) === JSON.stringify(cw.grid));
    }
    return out;
  });
  expect(r.every(Boolean)).toBe(true);
  expect(errors).toEqual([]);
});

test('daily puzzle: crossword wrong answer refused, right answers fill it; ladder checks steps; both solved = coins, streak, foil', async ({ page }) => {
  const now = Date.now();
  const prog = Object.fromEntries(['apple', 'water', 'house', 'happy', 'green'].map((w) => [w, { b: 5, i: 35, e: 2.5, d: now + 20 * 86400000, s: 6, c: 6, x: 0 }]));
  const errors = await openApp(page, { ...base, prog });
  await page.evaluate(() => go('puzzle', 'cw'));
  const words = await page.evaluate(() => makeCrossword(today()).words.map((x) => x.w.w));
  await page.locator('#cwIn').fill('zzzz');
  await page.locator('#cwForm button').click();
  expect(await page.evaluate(() => S.puz.cw.length)).toBe(0);
  for (let i = 0; i < words.length; i++) {
    const sel = await page.evaluate(() => cwSel);
    const w = words[sel];
    await page.locator('#cwIn').fill(w.toUpperCase());
    await page.locator('#cwForm button').click();
  }
  await expect(page.locator('#pzBody')).toContainText('ครอสเวิร์ดวันนี้เสร็จแล้ว');
  expect(await page.evaluate(() => coinBal())).toBe(15);
  // ladder
  await page.locator('[data-tab="lad"]').click();
  const L = await page.evaluate(() => makeLadder(today()));
  await page.locator('#ladIn').fill(L.from); // same word: refused
  await page.locator('#ladForm button').click();
  expect(await page.evaluate(() => S.puz.lad.length)).toBe(0);
  for (const s of L.path.slice(1)) { await page.locator('#ladIn').fill(s); await page.locator('#ladForm button').click(); }
  await expect(page.locator('#pzBody')).toContainText('สั้นสุดเลย');
  const st = await page.evaluate(() => [coinBal(), S.puz.streak, S.puz.n, Object.keys(S.foil).length]);
  expect(st).toEqual([30, 1, 1, 1]);
  // sync merge of the same day keeps solved words; a newer day replaces
  expect(await page.evaluate(() => { mergePuz({ d: today(), cw: [0], lad: ['aaaa'], ladDone: false, streak: 0, best: 3, last: '2026-01-01', n: 9 }); return [S.puz.cw.length > 0, S.puz.ladDone, S.puz.best, S.puz.n, S.puz.streak]; })).toEqual([true, true, 3, 9, 1]);
  expect(errors).toEqual([]);
});

test('ladder: hint costs coins and names the next word, give up shows the path and keeps the streak at 0', async ({ page }) => {
  const errors = await openApp(page, { ...base, coin: { x: [10, 0] } });
  await page.evaluate(() => go('puzzle', 'lad'));
  await page.locator('#ladHint').click();
  await expect(page.locator('#ladTip')).toContainText('เปลี่ยนตัวที่');
  expect(await page.evaluate(() => coinBal())).toBe(7);
  await page.locator('#ladIn').fill('qqqq');
  await page.locator('#ladForm button').click();
  expect(await page.evaluate(() => S.puz.lad.length)).toBe(0);
  await page.locator('#ladGive').click();
  await expect(page.locator('#pzBody')).toContainText('เฉลย');
  expect(await page.evaluate(() => [S.puz.ladDone, S.puz.ladGave, S.puz.streak])).toEqual([true, true, 0]);
  expect(errors).toEqual([]);
});

test('album: mastered words are cards with rarity, foil filter, opens the word sheet; garden grows, wilts and waters', async ({ page }) => {
  const errors = await openApp(page, base);
  const animals = await page.evaluate(() => {
    const now = Date.now(), ws = W.filter((w) => w.tp === 'animal' && w.g === 'A1').map((w) => w.w);
    ws.forEach((w, k) => { S.prog[w] = { b: 5, i: 35, e: 2.5, d: k < 6 ? now - 3600000 : now + 9 * 86400000, s: 5, c: 5, x: 0 }; });
    S.foil = { [ws[0]]: '2026-10-01' }; S.settings.levels = ['A1']; save();
    return ws;
  });
  await page.evaluate(() => go('album'));
  await expect(page.locator('.al-card')).toHaveCount(animals.length);
  await expect(page.locator('.al-card.foil')).toHaveCount(1);
  await page.locator('[data-foil]').click();
  await expect(page.locator('.al-card')).toHaveCount(1);
  await page.locator('.al-card').first().click();
  await expect(page.locator('.sheet-word')).toBeVisible();
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((e) => e.remove()));
  expect(await page.evaluate(() => { const w = foilGive(); return [typeof w, Object.keys(S.foil).length]; })).toEqual(['string', 2]);
  // garden: the animal plant is in bloom (all A1 animal words mastered) but wilting (6 due)
  await page.evaluate(() => go('garden'));
  const p = await page.evaluate(() => plantOf('animal'));
  expect(p.stage).toBe(5); expect(p.wilt).toBe(true); expect(p.due).toBe(6);
  await expect(page.locator('[data-water="animal"]')).toContainText('(6)');
  await page.locator('[data-water="animal"]').click();
  await expect(page.locator('#fc')).toBeVisible();
  expect(await page.evaluate(() => buildQueueRaw('tp:animal').length)).toBe(6);
  await page.evaluate(() => { flushSave(); });
  expect(await page.evaluate(() => !!S.ach.sBloom)).toBe(true);
  expect(errors).toEqual([]);
});

/* ---------- 1.120: detective cases, ร้านน้องคำ, ghost race ---------- */
test('cases data: every case has 3 suspects with notes, Thai for every clue, 2 reading questions with valid answers', async () => {
  const fs = require('fs'), vm = require('vm'), ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'cases.js'), 'utf8'), ctx);
  const C = ctx.window.CASES;
  expect(C.length).toBeGreaterThanOrEqual(8);
  expect(new Set(C.map((c) => c.id)).size).toBe(C.length);
  for (const c of C) {
    expect(c.suspects.length, c.id).toBe(3);
    expect(c.suspects.every((s) => s.length === 4 && s.every((x) => typeof x === 'string' && x)), c.id).toBe(true);
    expect(c.clues.length, c.id).toBeGreaterThanOrEqual(5);
    expect(c.clues.every(([en, th]) => /^[\x20-\x7e’]+$/.test(en) && /[฀-๿]/.test(th)), c.id).toBe(true);
    expect(c.q.length, c.id).toBe(2);
    expect(c.q.every(([q, o, a]) => o.length === 3 && a >= 0 && a < 3), c.id).toBe(true);
    expect(c.ans >= 0 && c.ans < 3 && c.why && c.intro && c.title, c.id).toBeTruthy();
    expect(/^[a-z0-9]{1,20}$/.test(c.id)).toBe(true);
  }
});

test('detective: read clues, answer questions, a wrong guess then the right one; coins once; hat after 3 cases', async ({ page }) => {
  const errors = await openApp(page, { ...base, cases: { cake: { ok: true, t: 0 }, book: { ok: true, t: 1 } } });
  await page.evaluate(() => go('cases'));
  await expect(page.locator('[data-case]')).toHaveCount(8);
  await page.locator('[data-case="flowers"]').click();
  await page.locator('#caseNext').click(); // intro → clues
  await page.locator('[data-th="0"]').click();
  await expect(page.locator('#cth0')).toBeVisible();
  await page.locator('#caseNext').click(); // clues → questions
  for (const right of [1, 0]) { // flowers: answers 1 and 1; answer the first right, the second wrong
    const a = await page.evaluate(() => CASES.find((c) => c.id === 'flowers').q.map((x) => x[2]));
    const k = right ? a[0] : (a[1] + 1) % 3;
    await page.locator(`.opt[data-k="${k}"]`).click();
    await page.waitForTimeout(right ? 800 : 1600);
  }
  await page.locator('[data-sus="1"]').click(); // wrong
  await expect(page.locator('#caseRetry')).toBeVisible();
  expect(await page.evaluate(() => [S.cases.flowers.t, coinBal()])).toEqual([1, 0]);
  await page.locator('#caseRetry').click();
  await page.locator('#caseNext').click();
  for (let i = 0; i < 2; i++) { await page.locator('.opt').first().click(); await page.waitForTimeout(1600); }
  await page.locator('[data-sus="0"]').click(); // Jack: right
  await expect(page.locator('#view')).toContainText('ใช่แล้ว');
  expect(await page.evaluate(() => [S.cases.flowers.ok, coinBal(), S.owned.includes('acc:detective')])).toEqual([true, 10, true]);
  expect(await page.evaluate(() => { mergeBackup({ cases: { pizza: { ok: true, t: 2 }, flowers: { ok: false, t: 5 } } }); return [S.cases.flowers, S.cases.pizza]; })).toEqual([{ ok: true, t: 5 }, { ok: true, t: 2 }]);
  expect(errors).toEqual([]);
});

test('ร้านน้องคำ: serving the right food earns a tip, wrong food is a strike, 3 strikes close the day', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => go('cafe'));
  await page.locator('#cfGo').click();
  const serve = async (ok) => {
    await expect(page.locator('.cf-item').first()).toBeEnabled();
    const ks = await page.evaluate((ok) => { const want = cafeRun.shelf.map((w, k) => (cafeRun.order.includes(w) ? k : -1)).filter((k) => k >= 0); return ok ? want : [cafeRun.shelf.findIndex((w) => !cafeRun.order.includes(w))]; }, ok);
    for (const k of ks) await page.locator(`.cf-item[data-k="${k}"]`).click();
    await page.locator('#cfServe').click();
    await expect(page.locator('#reveal')).not.toBeEmpty();
    await page.waitForTimeout(ok ? 1200 : 2700);
  };
  expect(await page.evaluate(() => /^(Can I have|I'd like|Could I get|Hello!) .+(\?|\.)$/.test(window.__said.at(-1)))).toBe(true);
  await serve(true);
  expect(await page.evaluate(() => coinBal())).toBeGreaterThanOrEqual(1);
  for (let i = 0; i < 3; i++) await serve(false);
  await expect(page.locator('#cfAgain')).toBeVisible();
  expect(await page.evaluate(() => S.cafe)).toEqual({ best: 1, total: 1 });
  expect(await page.evaluate(() => cafeItems().length)).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => [cafeArt('apple'), cafeArt('milk'), cafeArt('banana'), cafeList(['a', 'b', 'c'])])).toEqual(['an apple', 'some milk', 'a banana', 'a, b and c']);
  expect(errors).toEqual([]);
});

test('ghost race: survival shows the best run and saves a new one; time attack ghost counts by time', async ({ page }) => {
  const errors = await openApp(page, { ...base, ghost: { survival: [1, 2, 3, 4], timeAttack: [1.5, 3, 4, 60] }, best: { survival: 4, timeAttack: 4 } });
  const step = async (ok) => {
    await expect(page.locator('.opt').first()).toBeVisible();
    const k = await page.evaluate(() => { // the right option of a survival question (en2th / th2en / listen / cloze)
      const words = [...document.querySelectorAll('.opt')].map((o) => W[+o.dataset.i]);
      const wd = document.querySelector('.q-prompt .word'), th = document.querySelector('.q-prompt .th'), cz = document.querySelector('.q-prompt .cloze');
      if (wd) return words.findIndex((w) => w.w === wd.textContent.trim());
      if (th) return words.findIndex((w) => w.t === th.textContent.trim());
      if (cz) { const pre = cz.textContent.split('_____')[0]; return words.findIndex((w) => w.e && w.e.startsWith(pre)); }
      return words.findIndex((w) => w.w === window.__said.at(-1));
    });
    await page.locator('.opt').nth(ok ? k : (k + 1) % 4).click();
    await expect(page.locator('#reveal')).not.toBeEmpty();
    const n = page.locator('#nextQ'); if (await n.count()) await n.click().catch(() => {});
    await page.waitForTimeout(1000);
  };
  await page.evaluate(() => startGame('survival'));
  await expect(page.locator('#ghN')).toBeVisible();
  for (let i = 0; i < 3; i++) await step(false);
  await expect(page.locator('#view')).toContainText('เงาตัวเองยังนำอยู่ 4 ข้อ');
  expect(await page.evaluate(() => S.ghost.survival)).toEqual([1, 2, 3, 4]);
  await page.evaluate(() => { S.ghost = {}; S.best = {}; startGame('survival'); });
  await expect(page.locator('#ghN')).toHaveCount(0); // no best run yet: no ghost
  await step(true);
  for (let i = 0; i < 3; i++) await step(false);
  await expect(page.locator('.result-emoji')).toBeVisible();
  expect(await page.evaluate(() => S.ghost.survival)).toEqual([1, 1, 1, 1]);
  await page.evaluate(() => { S.ghost.timeAttack = [0.1, 0.2, 500]; startGame('timeAttack'); });
  await expect(page.locator('#ghN')).toContainText('👻 2');
  expect(await page.evaluate(() => { mergeBackup({ ghost: { survival: [1, 2, 3, 4, 5, 6] } }); return S.ghost.survival.length; })).toBe(6);
  expect(errors).toEqual([]);
});

test('saved state with every fun-zone field loads as is (no rescue, nothing reset)', async ({ page }) => {
  const errors = await openApp(page, { ...base, xp: 1234, coin: { a: [5, 1] }, tower: { best: 12, cp: 10, runs: 2 }, puz: { d: '2026-10-30', cw: [0], rv: [], lad: [], ladDone: false, ladGave: false, streak: 2, best: 4, last: '2026-10-29', n: 5 }, foil: { cat: '2026-10-01' }, cases: { cake: { ok: true, t: 0 } }, cafe: { best: 5, total: 9 }, ghost: { survival: [1, 2] } });
  const r = await page.evaluate(() => [loadRescued, S.xp, coinBal(), S.tower.best, S.puz.best, Object.keys(S.foil).length, S.cases.cake.ok, S.cafe.total, S.ghost.survival.length]);
  expect(r).toEqual([false, 1234, 4, 12, 4, 1, true, 9, 2]);
  expect(errors).toEqual([]);
});
