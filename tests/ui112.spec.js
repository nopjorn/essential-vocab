// 1.112: first-run welcome, search everything, iPad side panel, bigger celebrations.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const due = { prog: { abandon: { b: 1, i: 1, e: 2.5, d: 1, s: 2, c: 1, x: 0 }, ability: { b: 1, i: 1, e: 2.5, d: 1, s: 2, c: 1, x: 0 } } };

test('first-run welcome: three steps set goal, level and pace, then never comes back', async ({ page }) => {
  const errors = await openApp(page, undefined, { onboarding: true });
  const onb = page.locator('.onb');
  await expect(onb).toBeVisible();
  await expect(onb).toContainText('อยากใช้คำศัพท์ไปทำอะไร');
  await onb.locator('[data-goal="travel"]').click();
  await expect(onb.locator('[data-goal="travel"]')).toHaveAttribute('aria-pressed', 'true');
  await onb.locator('[data-act=next]').click();
  await onb.locator('[data-lvl="some"]').click();
  await onb.locator('[data-act=next]').click();
  await onb.locator('[data-pace="30"]').click();
  await onb.locator('[data-act=back]').click(); // back keeps the choices
  await expect(onb.locator('[data-lvl="some"]')).toHaveAttribute('aria-pressed', 'true');
  await onb.locator('[data-act=next]').click();
  await onb.locator('[data-act=next]').click();
  await expect(onb).toHaveCount(0);
  const st = await readState(page);
  expect(st.settings.goal).toBe('travel');
  expect(st.settings.levels).toEqual(['A1', 'A2']);
  expect(st.settings.newPerDay).toBe(30);
  await page.reload();
  await expect(page.locator('#view')).not.toBeEmpty();
  await expect(page.locator('.onb')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('first-run welcome: skip keeps the defaults; "not sure" opens the placement test; existing users never see it', async ({ page }) => {
  const errors = await openApp(page, undefined, { onboarding: true });
  await page.locator('.onb [data-act=skip]').click();
  await expect(page.locator('.onb')).toHaveCount(0);
  const st = await page.evaluate(() => S.settings); // skipping saves nothing
  expect(st.goal).toBe('');
  expect(st.newPerDay).toBe(20);
  await page.evaluate(() => onboard(true));
  await page.locator('.onb [data-act=next]').click();
  await page.locator('.onb [data-lvl="unsure"]').click();
  await page.locator('.onb [data-act=next]').click();
  await expect(page.locator('.onb [data-act=next]')).toContainText('วัดระดับ');
  await page.locator('.onb [data-act=next]').click();
  await expect(page.locator('#view')).toContainText('แบบทดสอบวัดระดับ');
  expect(errors).toEqual([]);
  const p2 = await page.context().newPage();
  const e2 = await openApp(p2, due, { onboarding: true }); // has progress: no welcome
  await expect(p2.locator('.onb')).toHaveCount(0);
  expect(e2).toEqual([]);
});

test('search: words (English and Thai), games and pages; / and Escape', async ({ page }) => {
  const errors = await openApp(page, due);
  await page.locator('#qsBtn').click();
  const gs = page.locator('.gs');
  await expect(gs).toBeVisible();
  await expect(gs.locator('#gsq')).toBeFocused();
  await expect(gs.locator('.gs-row').first()).toBeVisible(); // empty query = shortcuts
  await gs.locator('#gsq').fill('abandon');
  await expect(gs.locator('.gs-row').first()).toContainText('abandon');
  await gs.locator('.gs-row').first().click();
  await expect(gs).toHaveCount(0);
  await expect(page.locator('.sheet')).toContainText('abandon');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  // Thai text finds the word by its meaning
  await page.keyboard.press('/');
  await page.locator('#gsq').fill('สำนวน');
  await expect(page.locator('.gs-h', { hasText: 'หน้าในแอป' })).toBeVisible();
  await page.locator('.gs-row').filter({ hasText: /^🎭/ }).last().click(); // words and games match too; the page row is the last section
  await expect(page.locator('#view')).toContainText('สำนวน');
  // a game by name
  await page.keyboard.press('/');
  await page.locator('#gsq').fill('สะกด');
  await expect(page.locator('.gs-h', { hasText: 'เกม' })).toBeVisible();
  await page.locator('.gs-row').filter({ hasText: /^⌨️/ }).click();
  await expect(page.locator('#view .session-top, #view .q-prompt').first()).toBeVisible();
  // nothing found, Escape closes
  await page.keyboard.press('Control+k');
  await page.locator('#gsq').fill('zzzqqqxx');
  await expect(page.locator('.gs-empty')).toContainText('ไม่เจอ');
  await page.keyboard.press('Escape');
  await expect(page.locator('.gs')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('iPad landscape: today panel beside the flashcard (hidden on a phone)', async ({ page }) => {
  await page.setViewportSize({ width: 1210, height: 834 });
  const errors = await openApp(page, due);
  await page.evaluate(() => go('cards'));
  const side = page.locator('#sideStats');
  await expect(side).toBeVisible();
  await expect(side).toContainText('รอบนี้');
  const box = await side.boundingBox(), card = await page.locator('#stage').boundingBox();
  expect(box.x).toBeGreaterThan(card.x + card.width - 1); // beside the card, not under it
  expect(await page.evaluate(() => document.getElementById('view').scrollWidth <= document.getElementById('view').clientWidth)).toBe(true);
  await page.setViewportSize({ width: 440, height: 956 });
  await expect(side).toBeHidden();
  await page.setViewportSize({ width: 956, height: 440 }); // phone landscape keeps its own layout
  await expect(side).toBeHidden();
  expect(errors).toEqual([]);
});

test('celebrations: confetti burst + dancing น้องคำ on level-up; nothing moves with reduced motion', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => confetti('burst'));
  expect(await page.locator('.confetti.burst i').count()).toBeGreaterThan(40);
  await page.evaluate(() => document.querySelectorAll('.confetti').forEach((x) => x.remove()));
  await page.evaluate(() => levelUpScreen(3, 2));
  await expect(page.locator('.lvlup .dance .mascot')).toBeVisible();
  await expect(page.locator('.confetti.burst')).toHaveCount(1);
  await page.evaluate(() => document.querySelectorAll('.lvlup, .confetti').forEach((x) => x.remove()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => confetti('burst'));
  await expect(page.locator('.confetti')).toHaveCount(0);
  expect(errors).toEqual([]);
});
