// Learning logic added in 1.107: real retention vs the target, fill-in-the-blank with inflected forms, related words kept apart.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
const due = (i, extra = {}) => ({ b: 3, i, e: 2.5, d: Date.now() - DAY, s: 4, c: 4, x: 0, ...extra });

test('retention (1.107): due reviews are counted by gap, forgotten ones are not remembered, other reviews are ignored', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] }, prog: { apple: due(1), house: due(5), water: due(10), bread: due(30), cat: due(0), dog: { ...due(10), d: Date.now() + 5 * DAY } } });
  const out = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    grade(w('apple'), 2); grade(w('house'), 0); grade(w('water'), 1); grade(w('bread'), 3);
    grade(w('cat'), 2);   // i = 0: a learning step, not counted
    grade(w('dog'), 2);   // not due yet: not counted
    grade(w('new1' in S.prog ? 'apple' : 'banana'), 2); // never seen: not counted
    const deck = {}; grade(w('apple'), 2, deck); // a set's table: not counted
    return JSON.parse(JSON.stringify(S.ret));
  });
  expect(out).toEqual([[1, 1], [1, 0], [1, 1], [1, 1]]);
  // stats page: card with the numbers and a note that there is too little data yet
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#view')).toContainText('จำได้จริงเทียบกับเป้า');
  await expect(page.locator('#view')).toContainText('4 ใบที่ทวน');
  await expect(page.locator('#view')).toContainText('ยังมีข้อมูลน้อย');
  // plenty of data below / above the target gives advice; a backup merge keeps the larger count
  await page.evaluate(() => { S.ret = [[40, 20], [0, 0], [0, 0], [0, 0]]; go('stats'); });
  await expect(page.locator('#view')).toContainText('จำได้น้อยกว่าเป้า');
  await page.evaluate(() => { S.ret = [[40, 40], [0, 0], [0, 0], [0, 0]]; go('stats'); });
  await expect(page.locator('#view')).toContainText('จำได้เกินเป้ามาก');
  const merged = await page.evaluate(() => { S.ret = [[10, 5], [0, 0], [3, 3], [0, 0]]; mergeBackup({ ret: [[8, 8], [6, 4], [1, 1], [0, 0]] }); return S.ret; });
  expect(merged).toEqual([[10, 5], [6, 4], [3, 3], [0, 0]]);
  expect(errors).toEqual([]);
});

test('retention: an unreadable ret field in a saved state is repaired', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', ret: 'oops' });
  expect(await page.evaluate(() => S.ret)).toEqual([[0, 0], [0, 0], [0, 0], [0, 0]]);
  expect(errors).toEqual([]);
});

test('inflected blanks (1.107): climbed / eggs / studying are found, options take the same ending, the duel keeps its old rule', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const r = await page.evaluate(() => {
    const f = (x) => W.find((w) => w.w === x);
    const out = { forms: {}, inflect: {}, bad: [], withCloze: 0, exact: 0 };
    for (const x of ['climb', 'egg', 'win']) { const c = clozeForm(f(x)); out.forms[x] = c && [c.kind, c.tok]; }
    for (const [b, k] of [['study', 'ed'], ['stop', 'ing'], ['visit', 'ed'], ['make', 'ing'], ['box', 's'], ['city', 's'], ['lie', 'ing'], ['big', 'er'], ['happy', 'est'], ['love', 'ed'], ['play', 'ed']]) out.inflect[b + '+' + k] = inflect(b, k);
    for (const w of W) {
      if (hasCloze(w)) { out.withCloze++; const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000'); if (!blank.includes('\u0000') || blank === w.e) out.bad.push(w.w); }
      if (hasClozeExact(w)) out.exact++;
    }
    out.opt = [clozeOpt(f('apple'), f('climb')), clozeOpt(f('study'), f('climb')), clozeOpt(f('apple'), f('egg'))];
    return out;
  });
  expect(r.forms.climb).toEqual(['ed', 'climbed']);
  expect(r.forms.egg).toEqual(['s', 'eggs']);
  expect(r.forms.win).toBeNull(); // irregular: not covered
  expect(r.inflect).toEqual({ 'study+ed': 'studied', 'stop+ing': 'stopping', 'visit+ed': 'visited', 'make+ing': 'making', 'box+s': 'boxes', 'city+s': 'cities', 'lie+ing': 'lying', 'big+er': 'bigger', 'happy+est': 'happiest', 'love+ed': 'loved', 'play+ed': 'played' });
  expect(r.bad).toEqual([]);
  expect(r.exact).toBeLessThan(r.withCloze);
  expect(r.withCloze).toBeGreaterThan(4900);
  expect(r.opt).toEqual(['appled', 'studied', 'apples']);
  // a real round of the cloze game on an inflected word: blank + every option in the -ed form
  await page.evaluate(() => { customWords = W.filter((w) => { const c = clozeForm(w); return c && c.kind === 'ed' && /^[a-z]+$/.test(w.w); }).slice(0, 10); gameSource = 'custom'; startGame('cloze'); });
  const opts = await page.locator('.opt').allTextContents();
  expect(opts.length).toBe(4);
  expect(opts.every((o) => /ed$/.test(o))).toBe(true);
  expect(await page.locator('.q-prompt .cloze').textContent()).toContain('_____');
  expect(await page.locator('.q-prompt .blank').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('new words (1.107): near meanings are not introduced together, nor next to a word still being learned', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } });
  const r = await page.evaluate(() => {
    const f = (x) => W.find((w) => w.w === x);
    const fresh = ['afraid', 'scared', 'apple', 'big', 'large', 'banana'].map(f);
    const a = separateNew(fresh, 3).map((w) => w.w);
    const small = separateNew(fresh.slice(0, 2), 2).map((w) => w.w); // only related ones left: both come, in order
    const map = { afraid: { b: 1, i: 1, e: 2.5, d: Date.now() + DAY, s: 1, c: 1, x: 0 } };
    const b = separateNew([f('scared'), f('apple'), f('banana')], 2, map).map((w) => w.w);
    return { a, small, b };
  });
  expect(r.a).toEqual(['afraid', 'apple', 'big']);
  expect(r.small).toEqual(['afraid', 'scared']);
  expect(r.b).toEqual(['apple', 'banana']);
  expect(errors).toEqual([]);
});
