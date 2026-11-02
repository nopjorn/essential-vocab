// 1.135: ✏️ handwriting game, 🖨️ printable worksheets, 📰 words from your own text.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const now = Date.now();
const learning = (words) => Object.fromEntries(words.map((w) => [w, { b: 1, i: 3, e: 2.5, d: now - 1000, s: 2, c: 1, x: 0 }]));

test('worksheet: every part, answer key matches the questions, print uses #printArea', async ({ page }) => {
  const errors = await openApp(page, { prog: learning(['apple', 'bread', 'water', 'house', 'happy', 'teacher', 'family', 'friend', 'school', 'morning', 'dinner', 'river']) });
  await page.evaluate(() => { S.settings.ws = { src: 'learning', n: 10, parts: ['list', 'match', 'spell', 'cloze', 'trace'], key: true, title: 'Week 1' }; go('print'); });
  const paper = page.locator('#wkPaper');
  await expect(paper.locator('h1')).toHaveText('Week 1');
  await expect(paper.locator('.wk-tbl tbody tr')).toHaveCount(10);
  await expect(paper.locator('.wk-match > div')).toHaveCount(20);
  await expect(paper.locator('.wk-sp')).toHaveCount(10);
  await expect(paper.locator('.wk-tr')).toHaveCount(10);
  await expect(paper.locator('.wk-key')).toContainText('จับคู่');
  // the match key pairs every English word with its own Thai meaning
  const bad = await page.evaluate(() => {
    const out = [], cells = [...document.querySelectorAll('#wkPaper .wk-match > div')];
    const key = document.querySelector('#wkPaper .wk-key').textContent.match(/\d+-[a-j]/g);
    key.forEach((k) => {
      const [n, l] = k.split('-'); const block = Math.floor((n - 1) / 10), row = (n - 1) % 10;
      const en = cells[(block * 10 + row) * 2].querySelector('b').textContent;
      const th = cells.find((c, i) => i % 2 && c.textContent.startsWith(l + ')') && Math.floor(i / 20) === block).textContent.slice(3);
      if (W.find((w) => w.w === en).t !== th) out.push(k);
    });
    return out;
  });
  expect(bad).toEqual([]);
  // cloze rows: the key word fills the blank to give back the example sentence
  const cz = await page.evaluate(() => document.querySelectorAll('#wkPaper .wk-cz').length);
  expect(cz).toBeGreaterThan(0);
  // 🔀 changes the order, the title box renames, parts can be switched off (not the last one)
  await page.locator('#wkParts [data-p="trace"]').click();
  await expect(paper.locator('.wk-tr')).toHaveCount(0);
  await page.locator('#wkN [data-n="20"]').click();
  await expect(page.locator('#wkInfo')).toContainText('12 คำ');
  // print: the sheet is copied into #printArea and window.print is called
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; window.__area = document.querySelector('#printArea .wk-paper').textContent.length; }; });
  await page.locator('#wkGo').click();
  await expect.poll(() => page.evaluate(() => window.__printed)).toBe(1);
  expect(await page.evaluate(() => window.__area)).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.body.classList.contains('wk-printing'))).toBe(true);
  await page.locator('#topBack').click();
  expect(await page.evaluate(() => [current, document.body.classList.contains('wk-printing')])).toEqual(['settings', false]);
  expect((await readState(page)).settings.ws.n).toBe(20);
  expect(errors).toEqual([]);
});

test('worksheet from a set, and an empty source', async ({ page }) => {
  const errors = await openApp(page, { decks: [{ id: 'd1', name: 'Trip', icon: '✈️', words: ['airport', 'ticket', 'hotel', 'passport'], at: now, used: now }] });
  await page.evaluate(() => go('decks', 'd1'));
  await page.locator('#dkPrint').click();
  await expect(page.locator('#wkSrc')).toHaveValue('deck:d1');
  await expect(page.locator('#wkPaper .wk-tbl tbody tr')).toHaveCount(4);
  await page.locator('#wkSrc').selectOption('leech');
  await expect(page.locator('#wkGo')).toBeDisabled();
  await page.locator('#wkSrc').selectOption('topic');
  await expect(page.locator('#wkTp')).toBeVisible();
  await page.locator('#topBack').click();
  expect(await page.evaluate(() => current)).toBe('decks');
  expect(errors).toEqual([]);
});

test('article words: scan, highlight, add the new ones to a set, practise and print', async ({ page }) => {
  const errors = await openApp(page, { prog: { ...learning(['market']), apple: { b: 5, i: 40, e: 2.5, d: now + 9e8, s: 5, c: 5, x: 0 } } });
  const r = await page.evaluate(async () => { await loadIrregular(); const r = mineScan('My brother went to the market and bought apples in Bangkok.'); return { n: r.n, out: r.out, miss: r.miss, words: r.words.map((x) => x.w.w), first: r.words[0].w.w, mastered: r.mastered, learning: r.learning }; });
  expect(r.n).toBe(11);
  expect(r.miss).toEqual(['bangkok']);
  expect(r.words).toEqual(expect.arrayContaining(['go', 'buy', 'apple', 'market', 'brother']));
  expect([r.mastered, r.learning]).toEqual([1, 1]);
  expect(['my', 'to', 'the', 'and', 'in']).not.toContain(r.first); // content words come first
  await page.evaluate(() => go('read'));
  await page.locator('#toMine').click();
  await page.locator('#mineIn').fill('Yesterday my brother went to the market and bought some apples. The weather was beautiful.');
  await page.locator('#mineGo').click();
  await expect(page.locator('.mine-big b')).toContainText('%');
  await expect(page.locator('#mineText .rw.new').first()).toBeVisible();
  await page.locator('#mineOnly').click();
  await expect(page.locator('#mineText')).toHaveClass(/only-new/);
  // the text stays on this device and comes back
  await page.evaluate(() => go('home'));
  await page.evaluate(() => go('mine'));
  await expect(page.locator('#mineIn')).toHaveValue(/Yesterday/);
  await expect(page.locator('.mine-row').first()).toBeVisible();
  // put the picked words into a new set
  const n = await page.locator('.mine-ck:checked').count();
  expect(n).toBeGreaterThan(3);
  await page.locator('#mineDeck').click();
  await page.locator('.sheet-wrap').getByText(/สร้างชุดใหม่|ชุดใหม่/).first().click();
  await expect.poll(() => page.evaluate(() => S.decks.filter((d) => !d.del).reduce((a, d) => a + d.words.length, 0))).toBe(n);
  await page.evaluate(() => go('mine'));
  await page.locator('#minePrint').click();
  await expect(page.locator('#wkSrc')).toHaveValue('custom');
  await expect(page.locator('#wkPaper .wk-sub')).toContainText('คำจากบทความ');
  await page.locator('#topBack').click();
  expect(await page.evaluate(() => current)).toBe('mine');
  await page.locator('#minePlay').click();
  await expect(page.locator('#view .opt').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('handwriting: trace mode is practice only, undo/clear, an empty pad is not graded', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], handTrace: true } });
  await page.evaluate(() => startGame('hand'));
  await expect(page.locator('#hdTrace')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#hdCheck').click();
  await expect(page.locator('#reveal')).toContainText('ลองเขียน');
  const b = await page.locator('#hdPad').boundingBox();
  for (let s = 0; s < 2; s++) { await page.mouse.move(b.x + 40 + s * 60, b.y + 60); await page.mouse.down(); await page.mouse.move(b.x + 80 + s * 60, b.y + 120); await page.mouse.up(); }
  await page.locator('#hdUndo').click();
  await page.locator('#hdCheck').click();
  await page.locator('#hdYes').click();
  await expect(page.locator('#reveal')).toContainText('โหมดฝึก');
  expect(Object.keys((await readState(page)).prog)).toEqual([]); // copied, so no schedule change
  await page.evaluate(() => { S.settings.handTrace = false; }); // a question that started with the faint copy stays practice, so switch off before the next one
  await page.locator('#nextQ').click();
  await expect(page.locator('#hdTrace')).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.move(b.x + 40, b.y + 60); await page.mouse.down(); await page.mouse.move(b.x + 120, b.y + 100); await page.mouse.up();
  await page.locator('#hdCheck').click();
  await page.locator('#hdNo').click();
  await expect(page.locator('#reveal')).toContainText('❌');
  expect(Object.keys((await readState(page)).prog).length).toBe(1);
  expect(errors).toEqual([]);
});

test('app keyboard: an Apple Pencil touch hands the field back to iPadOS (Scribble)', async ({ page }) => {
  const errors = await openApp(page, { settings: { appKbd: 'on', levels: ['A1'] } });
  await page.evaluate(() => startGame('spell'));
  const si = page.locator('#si');
  await expect(si).toHaveAttribute('readonly', '');
  await si.dispatchEvent('pointerdown', { pointerType: 'mouse' });
  await expect(si).toHaveAttribute('readonly', '');
  await si.dispatchEvent('pointerdown', { pointerType: 'pen' });
  await expect(si).not.toHaveAttribute('readonly', '');
  await expect(si).toHaveAttribute('inputmode', 'text');
  expect(errors).toEqual([]);
});
