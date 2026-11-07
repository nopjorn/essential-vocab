// TOEIC Parts 3 + 4 (1.187.0): a recording spoken on its first question (speakers in different voices), questions on screen, kept together.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

for (const part of [3, 4]) {
  test(`TOEIC Part ${part}: recording plays on the first question only, transcript hint, right and wrong answers, questions kept together`, async ({ page }) => {
    const errors = await openApp(page, { placedAt: '2026-01-01' });
    await page.evaluate(() => go('games'));
    await page.locator(`[data-game="toeic${part}"]`).click();
    const view = page.locator('#view');
    await expect(view.locator('.p34-card')).toBeVisible();
    await expect(view.locator('.opt')).toHaveCount(4);
    const cur = () => page.evaluate(() => { const r = playQuiz.cur._p34; return { id: r.d.id, k: r.k, n: r.d.q.length, lines: r.d.lines.map((l) => l[1]), right: r.opts[r.a], wrong: r.opts.find((o, i) => i !== r.a), voices: p34Lines(r.d).map((l) => l[0]) }; });
    let r = await cur();
    expect(r.k).toBe(0);
    // the whole recording is spoken, line by line
    await expect.poll(() => page.evaluate((n) => window.__said.slice(-n), r.lines.length)).toEqual(r.lines);
    await expect(view.locator('#p34Now')).toContainText('อีกครั้ง');
    if (part === 3) expect(new Set(r.voices).size).toBeGreaterThan(1); // different voices for different speakers
    else expect(new Set(r.voices).size).toBe(1);
    await expect(view.locator('.p34-sp')).toHaveCount(part === 3 ? new Set(r.voices).size : 1);
    await view.locator('#p34Hint').click();
    await expect(view.locator('#p34Tr')).toBeVisible();
    await expect(view.locator('#p34Tr .p34-line')).toHaveCount(r.lines.length);
    await view.locator(`.opt[data-o="${r.right}"]`).click();
    await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
    await view.locator('.p34-det summary').click();
    await expect(view.locator('.p34-det .thx')).toBeVisible();
    await view.locator('#nextQ').click();
    // the second question of the same recording: no automatic replay
    const said = await page.evaluate(() => window.__said.length);
    const r2 = await cur();
    expect(r2.id).toBe(r.id);
    expect(r2.k).toBe(1);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__said.length)).toBe(said);
    await view.locator('#p34Play').click();
    await expect.poll(() => page.evaluate(() => window.__said.length)).toBe(said + r2.lines.length);
    await view.locator(`.opt[data-o="${r2.wrong}"]`).click();
    await expect(view.locator('.opt.wrong')).toHaveCount(1);
    await page.evaluate(() => flushSave());
    const st = await readState(page);
    const keys = Object.entries(st.lex).filter(([k]) => k.startsWith(`toeic${part}:`));
    expect(keys.length).toBe(2);
    expect(keys.filter(([, p]) => p.x === 1).length).toBe(1);
    const round = await page.evaluate((n) => setOrder(lexPick('toeic' + n, p34Items(n), 10), p34Items(n)).length, part);
    expect(round).toBe(12);
    expect(errors).toEqual([]);
  });
}
