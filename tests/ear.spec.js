// Listening review (1.108): word → pause → Thai meaning → example, by itself; practice only.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
const dueCard = () => ({ b: 2, i: 3, e: 2.5, d: Date.now() - DAY, s: 3, c: 3, x: 0 });
const seed = () => ({ placedAt: '2026-01-01', settings: { levels: ['A1'] }, prog: Object.fromEntries(['apple', 'house', 'water', 'bread', 'cat'].map((w) => [w, dueCard()])) });

test('listening review: says word, Thai meaning and example in order, finishes, counts as practice only', async ({ page }) => {
  const errors = await openApp(page, seed());
  await page.evaluate(() => go('ear'));
  await expect(page.locator('#view')).toContainText('ฟังทบทวนแบบไม่ต้องดูจอ');
  await expect(page.locator('#earSrc [data-v="due"]')).toContainText('5');
  await expect(page.locator('#earSrc [data-v="star"]')).toBeDisabled(); // nothing starred: that source is off
  const before = await page.evaluate(() => JSON.stringify(S.prog));
  const xp0 = await page.evaluate(() => S.xp);
  await page.evaluate(() => { earOpt.gap = 0.05; earOpt.n = 3; });
  await page.locator('#earGo').click();
  await expect(page.locator('#view')).toContainText('ฟังครบ 3 คำแล้ว', { timeout: 15000 });
  const said = await page.evaluate(() => window.__said);
  const w0 = await page.evaluate((s) => { const w = W.find((x) => x.w === s); return [w.w, thFirst(w.t), w.e]; }, said[0]);
  expect(said.slice(0, 3)).toEqual(w0);            // word, Thai meaning, example
  expect(said.length).toBe(9);                      // three words × three steps
  expect(await page.evaluate(() => JSON.stringify(S.prog))).toBe(before); // cards are not graded
  const st = await page.evaluate(() => ({ ear: S.counts.ear, xp: S.xp }));
  expect(st.ear).toBe(1); expect(st.xp).toBeGreaterThan(xp0);
  expect(errors).toEqual([]);
});

test('listening review: pause, skip, dark screen, leaving the page stops everything; options can switch things off', async ({ page }) => {
  const errors = await openApp(page, seed());
  await page.evaluate(() => { go('ear'); earOpt.gap = 0.3; earOpt.n = 5; earOpt.ex = false; earOpt.th = false; });
  await page.locator('#earGo').click();
  await expect(page.locator('#earPos')).toHaveText('1/5');
  await page.locator('#earNext').click();
  await expect(page.locator('#earPos')).toHaveText('2/5');
  await page.locator('#earPlay').click();           // pause
  const n = await page.evaluate(() => window.__said.length);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__said.length)).toBe(n);
  await page.locator('#earPrev').click();
  await expect(page.locator('#earPos')).toHaveText('1/5');
  await page.locator('#earPlay').click();           // resume
  await expect(page.locator('#earPos')).toHaveText('2/5', { timeout: 8000 });
  await page.locator('#earDim').click();
  await expect(page.locator('#earDimmer')).toBeVisible();
  await page.locator('#earDimmer').click();
  await expect(page.locator('#earDimmer')).toHaveCount(0);
  await page.locator('#earDim').click();
  await page.evaluate(() => go('home'));            // leaving removes the dark layer and stops the voice loop
  await expect(page.locator('#earDimmer')).toHaveCount(0);
  const m = await page.evaluate(() => window.__said.length);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__said.length)).toBe(m);
  expect(await page.evaluate(() => window.__said.some((t) => /[ก-๙]/.test(t)))).toBe(false); // Thai voice and examples were off
  expect(errors).toEqual([]);
});

test('listening review: reachable from the menu and the after-cards buttons; empty sources explain themselves', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await expect(page.locator('#tabbar [data-tab="ear"]')).toHaveCount(1);
  await page.evaluate(() => go('ear'));
  await expect(page.locator('#earGo')).toBeDisabled();
  await expect(page.locator('#view')).toContainText('ยังไม่มีคำในกลุ่มนี้');
  expect(await page.evaluate(() => nextSteps(0))).toContain('data-ns="ear"');
  expect(errors).toEqual([]);
});

test('screen stays awake while listening (wake lock asked on start, released on leaving)', async ({ page }) => {
  await page.addInitScript(() => {
    window.__wl = { req: 0, rel: 0 };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__wl.req++; const l = new EventTarget(); l.release = () => { window.__wl.rel++; l.dispatchEvent(new Event('release')); return Promise.resolve(); }; return l; } } });
  });
  const errors = await openApp(page, seed());
  await page.evaluate(() => { go('ear'); earOpt.gap = 0.3; });
  await page.locator('#earGo').click();
  await expect.poll(() => page.evaluate(() => window.__wl.req)).toBe(1);
  await page.evaluate(() => go('home'));
  await expect.poll(() => page.evaluate(() => window.__wl.rel)).toBe(1);
  expect(errors).toEqual([]);
});

test('shadowing with your own voice (1.108): takes are recorded in the pause, compared after the original, nothing without a mic', async ({ page }) => {
  await page.addInitScript(() => {
    window.__rec = { started: 0, stopped: 0, tracksStopped: 0, played: [] };
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() { window.__rec.tracksStopped++; } }] });
    window.MediaRecorder = class { constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
      start() { this.state = 'recording'; window.__rec.started++; setTimeout(() => { if (this.ondataavailable) this.ondataavailable({ data: new Blob(['abc']) }); }, 20); }
      stop() { this.state = 'inactive'; window.__rec.stopped++; if (this.onstop) this.onstop(); } };
    window.Audio = class { constructor(u) { this.u = u; } play() { window.__rec.played.push(this.u); setTimeout(() => this.onended && this.onended(), 10); return Promise.resolve(); } };
  });
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(async () => { await loadStories(); go('read', STORIES[0].id); });
  await page.locator('#rShadow').click();
  await expect(page.locator('#shRec')).toBeVisible();
  await expect(page.locator('#shCmp')).toBeDisabled();
  await page.locator('#shRec').click();
  await expect(page.locator('#shRec')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#shRep').click();              // speak sentence 1, then the pause starts the take
  await expect.poll(() => page.evaluate(() => window.__rec.started)).toBe(1);
  await page.waitForTimeout(700);                     // longer than half a second
  await page.locator('#shRep').click();              // halting ends the take
  await expect(page.locator('#shCmp')).toBeEnabled();
  expect(await page.evaluate(() => window.__rec.tracksStopped)).toBeGreaterThanOrEqual(1); // the mic is released
  const said = await page.evaluate(() => window.__said.length);
  await page.locator('#shCmp').click();
  await expect.poll(() => page.evaluate(() => window.__rec.played.length)).toBe(1);
  expect(await page.evaluate(() => window.__said.length)).toBeGreaterThan(said); // the original was spoken first
  expect(await page.evaluate(() => window.__rec.played[0])).toMatch(/^blob:/);
  // moving to another sentence: no clip there yet
  await page.locator('#shNext').click();
  await expect(page.locator('#shCmp')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('shadowing: without a microphone API the record buttons are not shown', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'MediaRecorder', { value: undefined, configurable: true }); });
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(async () => { await loadStories(); go('read', STORIES[0].id); });
  await page.locator('#rShadow').click();
  await expect(page.locator('#shPlay')).toBeVisible();
  await expect(page.locator('#shRec')).toHaveCount(0);
  expect(errors).toEqual([]);
});
