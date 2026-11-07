// 🔎 Settings search (1.154.0): the box at the top of the settings page filters rows, opens the groups that have a match,
// hides the rest, says when nothing matches, and puts everything back (including which groups were open) when cleared.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const shown = (page) => page.evaluate(() => ({
  groups: [...document.querySelectorAll('details.set-group')].filter((d) => getComputedStyle(d).display !== 'none').map((d) => d.dataset.g),
  open: [...document.querySelectorAll('details.set-group')].filter((d) => d.open).map((d) => d.dataset.g),
  rows: [...document.querySelectorAll('details.set-group .card-box > *')].filter((r) => r.offsetParent !== null).map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
}));

test('settings search filters rows, opens matching groups and restores the page when cleared', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#setQ')).toBeVisible();
  const before = await shown(page);
  expect(before.groups.length).toBe(9); // 1.162.0: no ☁️ sync group while sync is not set up (config.js empty in tests)
  expect(before.groups).not.toContain("sync");

  // a row label: only that row (and others with the word) are shown, its group opens, the others hide
  await page.fill('#setQ', 'อยากจำได้');
  let s = await shown(page);
  expect(s.groups).toEqual(['learn']);
  expect(s.rows.length).toBe(1);
  expect(s.rows[0]).toContain('อยากจำได้กี่ %');
  await expect(page.locator('#ret')).toBeVisible(); // the control itself is usable from the result

  // a group's keyword (English): the whole group, not just a row
  await page.fill('#setQ', 'dark');
  s = await shown(page);
  expect(s.groups).toEqual(['look']);
  expect(s.open).toContain('look');
  expect(s.rows.length).toBeGreaterThan(5);

  // two words must both appear; option lists inside dropdowns do not count
  await page.fill('#setQ', 'เสียง อ่าน');
  s = await shown(page);
  expect(s.groups).toContain('sound');
  expect(s.rows.every((r) => r.includes('เสียง') && r.includes('อ่าน'))).toBe(true);
  await page.fill('#setQ', 'ทุกเป้าหมาย'); // only an option of the goal dropdown
  expect((await shown(page)).groups).toEqual([]);
  await expect(page.locator('#setQNone')).toBeVisible();

  // links between the groups (changelog) are filtered too; nothing found = a hint
  await page.fill('#setQ', 'ประวัติการอัปเดต');
  await expect(page.locator('#clBtn')).toBeVisible();
  expect((await shown(page)).groups).toEqual([]);
  await expect(page.locator('#setQNone')).toBeHidden();
  await page.fill('#setQ', 'qqqzzz');
  await expect(page.locator('#setQNone')).toBeVisible();
  await expect(page.locator('#clBtn')).toBeHidden();

  // cleared: every group and row is back, and only the groups that were open before are open
  await page.fill('#setQ', '');
  await page.waitForTimeout(100); // toggle events from closing the groups again
  s = await shown(page);
  expect(s.groups).toEqual(before.groups);
  expect(s.open).toEqual(before.open);
  expect(s.rows.length).toBe(before.rows.length);
  await expect(page.locator('#setQNone')).toBeHidden();
  // opening a group by hand afterwards is still remembered
  await page.click('details[data-g="sound"] > summary');
  await page.waitForFunction(() => setOpen.sound === true); // the toggle event comes a moment after the click
  await page.evaluate(() => go('settings'));
  expect((await shown(page)).open).toContain('sound');
  expect(errors).toEqual([]);
});

test('advanced learning rows are folded under ⚙️ ขั้นสูง, found by search and folded again after (1.162.0)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#advBox')).not.toHaveAttribute('open', '');
  await expect(page.locator('#sched')).toBeHidden();
  await page.fill('#setQ', 'ตัวจัดรอบ');
  await expect(page.locator('#sched')).toBeVisible();
  await expect(page.locator('#advBox > .set-row:has(#gentle)')).toBeHidden(); // the other folded rows stay out
  await page.fill('#setQ', 'ขั้นสูง'); // the fold's own title shows all of it
  await expect(page.locator('#advBox > .set-row:has(#gentle)')).toBeVisible();
  await page.fill('#setQ', '');
  await expect(page.locator('#sched')).toBeHidden();
  expect(errors).toEqual([]);
});

test('↺ default settings: looks, sound and input go back to defaults, the learning plan and progress stay (1.162.0)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', prog: { apple: { b: 2, i: 3, e: 2.5, d: Date.now(), s: 1, c: 1, x: 0 } },
    settings: { levels: ['B1'], newPerDay: 30, exam: { date: '2030-01-01', name: 'TOEIC' }, theme: 'dark', fsz: 'xl', sfx: false, gdiff: '3', animPage: false, thumbs: 'on' } });
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="danger"]').open = true; });
  page.once('dialog', (d) => d.accept());
  await page.locator('#resetSet').click();
  const st = await page.evaluate(() => S.settings);
  expect([st.theme, st.fsz, st.sfx, st.gdiff, st.animPage, st.thumbs]).toEqual(['auto', 'md', true, undefined, true, 'auto']);
  expect([st.levels, st.newPerDay, st.exam.name]).toEqual([['B1'], 30, 'TOEIC']);
  expect(await page.evaluate(() => [!!S.prog.apple, document.documentElement.dataset.theme, document.documentElement.classList.contains('no-vt')])).toEqual([true, undefined, false]);
  expect(errors).toEqual([]);
});

test('auto options say what they give on this device now (1.162.0)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { thumbs: 'on' } });
  await page.evaluate(() => go('settings'));
  // tests run with a fine pointer: the app keyboard and thumb buttons would be off on auto, even with thumbs set to 'on'
  await expect(page.locator('#appKbd option[value="auto"]')).toHaveText('อัตโนมัติ (ตอนนี้ปิด)');
  await expect(page.locator('#thumbs option[value="auto"]')).toHaveText('อัตโนมัติ (ตอนนี้ปิด)');
  await expect(page.locator('#thumbs')).toHaveValue('on');
  await page.evaluate(() => localStorage.setItem('o3k.pen', '1')); // a pen was used here
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#penMode option[value="auto"]')).toHaveText('อัตโนมัติ (ตอนนี้เปิด)');
  expect(errors).toEqual([]);
});
