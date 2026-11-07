// TOEIC Part 1 game (1.189.0): an emoji "photo", (A)–(D) spoken, text hidden until 📝 or the answer, own SRS in S.lex.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC Part 1: scene shown, A–D spoken in order, text hidden until asked, right and wrong answers', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('#gSkill [data-skill="toeic"]').click();
  await page.locator('[data-game="toeic1"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p1-scene')).toBeVisible();
  await expect(view.locator('.p2-opt')).toHaveCount(4);
  const cur = () => page.evaluate(() => ({ ...playQuiz.cur._p1, shown: [...document.querySelectorAll('.p2-opt')].map((b) => b.dataset.o) }));
  let r = await cur();
  await expect(view.locator('.p1-scene')).toHaveText(r.scene);
  await expect.poll(() => page.evaluate(() => window.__said.slice(-4))).toEqual(r.shown.map((o, k) => 'ABCD'[k] + '. ' + o));
  await expect(view.locator('#p2Now')).toContainText('เลือกประโยค');
  await expect(view.locator('.p2-t').first()).toBeHidden();
  await view.locator('#p2Hint').click();
  await expect(view.locator('.p2-t').first()).toBeVisible();
  await view.locator(`.p2-opt[data-o="${r.right}"]`).click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('.p7-why')).toContainText(r.tip);
  await view.locator('#nextQ').click();
  r = await cur();
  const wrong = r.shown.find((o) => o !== r.right);
  await view.locator(`.p2-opt[data-o="${wrong}"]`).click();
  await expect(view.locator('.opt.wrong')).toHaveCount(1);
  await expect(view.locator('#reveal')).toContainText(`ที่ถูกคือ ${'ABCD'[r.shown.indexOf(r.right)]}`);
  await expect(view.locator('.p2-t').first()).toBeVisible();
  await page.evaluate(() => flushSave());
  const st = await readState(page);
  const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('toeic1:'));
  expect(keys.length).toBe(2);
  expect(keys.filter(([, p]) => p.x === 1).length).toBe(1);
  expect(errors).toEqual([]);
});
