// Sync merge (1.105.4): the newest edit of a card, memory hook or star wins, so "forgot" / a wrong game answer / "review again"
// / a deleted hook / a removed star made on one device is not undone by an older copy from the cloud or another device.
const { test, expect } = require('@playwright/test');
const { fakeSupabase, syncOnce } = require('./helpers');

const DAY = 864e5;
async function device(browser, store, state) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:8765/', viewport: { width: 440, height: 956 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fakeSupabase(page, store);
  await page.addInitScript((st) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('oxford3000.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, { seenVer: '99.0.0', ...state });
  await page.goto('index.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  return { ctx, page, errors };
}
const card = () => ({ b: 3, i: 7, e: 2.5, d: Date.now() - DAY, s: 5, c: 5, x: 0 });

test('sync: forgot, wrong game answer, review again, deleted hook and removed star all survive a sync round', async ({ browser }) => {
  const seed = { prog: { apple: card(), house: card(), water: card(), bread: card() }, note: { apple: 'แอปเปิ้ลสีแดง', house: 'บ้าน' }, star: { apple: 1 }, settings: { levels: ['A1'] } };
  const store = { data: JSON.parse(JSON.stringify(seed)) }; // the cloud holds the older copy
  const A = await device(browser, store, seed);
  const pa = A.page;
  expect(await syncOnce(pa)).toBe(true);
  await pa.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    grade(w('apple'), 0);                  // forgot
    gameResult(w('water'), false);          // wrong in a game
    markForReview(w('house'));              // review again
    markKnown(w('bread'));                  // "I know this"
    setNote('apple', '');                   // hook deleted
    setNote('house', 'บ้านหลังใหญ่');        // hook edited
    toggleStar(w('apple'));                 // star removed
    save();
  });
  expect(await syncOnce(pa)).toBe(true);
  const r = await pa.evaluate(() => ({ apple: S.prog.apple, water: S.prog.water.b, house: S.prog.house.b, bread: S.prog.bread.b, na: S.note.apple, nh: S.note.house, star: S.star.apple }));
  expect(r.apple.b).toBe(0); expect(r.apple.x).toBe(1); // not reset to the cloud's box 3 / x 0
  expect(r.water).toBe(0); expect(r.house).toBe(0); expect(r.bread).toBe(4);
  expect(r.na).toBeUndefined(); expect(r.nh).toBe('บ้านหลังใหญ่'); expect(r.star).toBeUndefined();
  // a second device that still has the old copy receives all of it
  const B = await device(browser, store, seed);
  expect(await syncOnce(B.page)).toBe(true);
  expect(await B.page.evaluate(() => [S.prog.apple.b, S.prog.apple.x, S.prog.water.b, S.prog.house.b, S.note.apple, S.note.house, S.star.apple])).toEqual([0, 1, 0, 0, undefined, 'บ้านหลังใหญ่', undefined]);
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('sync: cards from an older app version (no time stamp) still merge by "further ahead wins"', async ({ page }) => {
  await fakeSupabase(page, { data: null });
  await page.goto('index.html');
  const out = await page.evaluate(() => {
    const old = { b: 2, i: 3, e: 2.5, d: 5, s: 2, c: 2, x: 0 }, ahead = { b: 4, i: 20, e: 2.5, d: 9, s: 6, c: 6, x: 0 };
    S.prog.aaa = { ...old }; S.prog.bbb = { ...ahead };
    mergeBackup({ prog: { aaa: ahead, bbb: old, ccc: old } });
    return [S.prog.aaa.b, S.prog.bbb.b, S.prog.ccc.b, cardWins({ ...old, t: 1 }, ahead), cardWins(ahead, { ...old, t: 1 })];
  });
  expect(out).toEqual([4, 4, 2, true, false]); // a stamped card beats an unstamped one, whatever its box
});

test('storage: unreadable saved state is kept as a rescue copy, a failed write is announced once', async ({ page }) => {
  await page.route('**/config.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.SYNC_CONFIG = { url: '', anonKey: '' };" }));
  const raw = JSON.stringify({ prog: { apple: { b: 5, i: 40, e: 2.5, d: 1, s: 9, c: 9, x: 0 } }, xp: 5000 }) + 'x'; // one stray character
  await page.addInitScript((raw) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('oxford3000.v1', raw); sessionStorage.setItem('seeded', '1'); } }, raw);
  await page.goto('index.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  await page.evaluate(() => { save(); flushSave(); });
  expect(await page.evaluate(() => localStorage.getItem('oxford3000.v1.rescue'))).toBe(raw);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('oxford3000.v1')).xp)).toBe(0); // started fresh, the old text is safe next to it
  await expect(page.locator('#toast')).toContainText('อ่านข้อมูลเดิมในเครื่องไม่ได้');
  // a second unreadable start must not overwrite the first rescue copy
  await page.evaluate(() => localStorage.setItem('oxford3000.v1', '{bad'));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('oxford3000.v1.rescue'))).toBe(raw);
  // writes failing: one warning, not one per save
  await page.evaluate(() => {
    const set = Storage.prototype.setItem; window.__sets = 0;
    Storage.prototype.setItem = function (k, v) { if (k === 'oxford3000.v1') { window.__sets++; throw new DOMException('full', 'QuotaExceededError'); } return set.call(this, k, v); };
    save(); flushSave(); save(); flushSave();
  });
  await expect(page.locator('#toast')).toContainText('บันทึกข้อมูลลงเครื่องไม่ได้');
  expect(await page.evaluate(() => window.__sets)).toBe(2);
});
