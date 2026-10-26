// Hero sky (1.97): six time-of-day skies, theme/time colour setting, drawn scene on/off, settings gallery.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const vsWhite = (hex) => 1.05 / (lum(hex) + 0.05);

test('skyId picks the right sky for each time of day', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const at = (h, m) => page.evaluate(([h, m]) => skyId(new Date(2026, 5, 1, h, m)), [h, m]);
  const want = [[0, 0, 'night'], [4, 59, 'night'], [5, 0, 'morning'], [8, 59, 'morning'], [9, 0, 'forenoon'], [11, 59, 'forenoon'], [12, 0, 'afternoon'], [15, 59, 'afternoon'], [16, 0, 'evening'], [18, 29, 'evening'], [18, 30, 'dusk'], [21, 59, 'dusk'], [22, 0, 'night'], [23, 59, 'night']];
  for (const [h, m, id] of want) expect(await at(h, m), `${h}:${m}`).toBe(id);
  expect(errors).toEqual([]);
});

test('sky colours keep white text readable (top ≥ 4.5, middle ≥ 3.9, ink on the sun/moon ≥ 7)', async ({ page }) => {
  await openApp(page, { settings: { levels: ['A1'] } });
  const sky = await page.evaluate(() => SKY);
  expect(Object.keys(sky)).toEqual(['morning', 'forenoon', 'afternoon', 'evening', 'dusk', 'night']);
  for (const [id, k] of Object.entries(sky)) {
    expect(vsWhite(k.g[0]), id + ' top').toBeGreaterThanOrEqual(4.5); // also the colour of the white button's text
    expect(vsWhite(k.g[1]), id + ' middle').toBeGreaterThanOrEqual(3.9);
    for (const d of k.d) expect((lum(d) + 0.05) / (lum(k.ink) + 0.05), `${id} ink on ${d}`).toBeGreaterThanOrEqual(7);
  }
});

test('home hero: theme colours by default with the scene, time mode paints the sky, both switches off = old card', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => { window.skyId = () => 'evening'; go('home'); });
  const hero = page.locator('.hero');
  await expect(hero).toHaveClass(/sky-art/);
  await expect(hero).not.toHaveClass(/sky-time/);
  await expect(hero.locator('.hero-scene svg')).toHaveCount(3); // sky, hills, palm (evening)
  await expect(hero.locator('.ring-disc')).toHaveCount(1);
  expect(await page.locator('.hero .small').first().innerText()).toContain('สวัสดีตอนเย็น');
  // time mode
  await page.evaluate(() => { S.settings.heroBg = 'time'; go('home'); });
  await expect(hero).toHaveClass(/sky-time/);
  await expect(hero).toHaveClass(/sk-evening/);
  expect(await hero.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  // every sky renders without errors, and the start button still works
  for (const id of ['morning', 'forenoon', 'afternoon', 'evening', 'dusk', 'night']) {
    await page.evaluate((id) => { window.skyId = () => id; go('home'); }, id);
    await expect(hero).toHaveClass(new RegExp('sk-' + id));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await page.locator('.hero .small').first().innerText()).toContain('ดึกแล้วนะ');
  await page.locator('#startBtn').click();
  await expect(page.locator('#view[data-route="cards"]')).toBeVisible();
  // both off → the plain card
  await page.evaluate(() => { S.settings.heroBg = 'theme'; S.settings.heroArt = false; go('home'); });
  await expect(hero).not.toHaveClass(/sky-/);
  await expect(hero.locator('.hero-scene, .ring-disc')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('settings: choose time-of-day colours, switch the scene off, gallery of six skies; saved', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('[data-g="look"]').open = true; });
  await expect(page.locator('#heroBg button.on')).toHaveText(/ตามธีม/);
  await page.locator('#heroBg [data-v="time"]').click();
  await expect(page.locator('#heroBg button.on')).toHaveText(/ตามเวลา/);
  await page.locator('.sky-more summary').click();
  await expect(page.locator('#skyPrev .sk-mini')).toHaveCount(6);
  await expect(page.locator('#skyPrev .sk-mini.now')).toHaveCount(1);
  await page.locator('label.switch:has(#heroArt)').click();
  const st = (await readState(page)).settings;
  expect(st.heroBg).toBe('time'); expect(st.heroArt).toBe(false);
  await page.evaluate(() => go('home'));
  await expect(page.locator('.hero')).toHaveClass(/sky-time/);
  await expect(page.locator('.hero')).not.toHaveClass(/sky-art/);
  expect(errors).toEqual([]);
});
