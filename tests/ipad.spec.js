// iPad held with both hands (1.136): flashcard grade buttons on both sides of the card.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('thumb grade buttons: ลืม/ยาก left of the card, จำได้/ง่าย right, card still flips', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 }); // iPad mini landscape
  const errors = await openApp(page, { settings: { levels: ['A1'], thumbs: 'on' } });
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#grade.thumbs')).toHaveCount(1);
  const box = async (sel) => page.locator(sel).boundingBox();
  const stage = await box('#stage');
  for (const g of [0, 1]) expect((await box(`#grade [data-g="${g}"]`)).x + (await box(`#grade [data-g="${g}"]`)).width).toBeLessThanOrEqual(stage.x + 1);
  for (const g of [2, 3]) expect((await box(`#grade [data-g="${g}"]`)).x).toBeGreaterThanOrEqual(stage.x + stage.width - 4);
  await expect(page.locator('#sideStats')).toBeHidden();
  // the button layer lies over the card row: a tap on the card must still reach it
  await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height * 0.8);
  await expect(page.locator('#fc')).toHaveClass(/flip/);
  await page.locator('#grade [data-g="2"]').click();
  await expect(page.locator('#pcount')).toContainText('1/');
  expect(errors).toEqual([]);
});

test('thumb grade buttons: off keeps the usual row, auto follows the pointer, setting saved', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page, { settings: { levels: ['A1'], thumbs: 'off' } });
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#grade.thumbs')).toHaveCount(0);
  await page.evaluate(() => { S.settings.thumbs = 'auto'; go('cards'); });
  await expect(page.locator('#grade.thumbs')).toHaveCount(0); // tests run with a fine pointer
  await page.evaluate(() => go('settings'));
  await page.locator('#thumbs').selectOption('on');
  expect(await page.evaluate(() => S.settings.thumbs)).toBe('on');
  // portrait / phone: the class is there but the layout stays the usual 4-button row under the card
  await page.setViewportSize({ width: 744, height: 1133 });
  await page.evaluate(() => go('cards'));
  const stage = await page.locator('#stage').boundingBox(), g0 = await page.locator('#grade [data-g="0"]').boundingBox();
  expect(g0.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
  expect(errors).toEqual([]);
});

test('book mode: pages, two-page spread in landscape, turn by key/tap/swipe, pen highlight → set, questions', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page, { settings: { levels: ['B1'], rFont: 2 } });
  const id = await page.evaluate(() => loadStories().then(() => STORIES.find((s) => s.level === 'B2').id));
  await page.evaluate((id) => go('read', id), id);
  await page.click('#rBook');
  await expect(page.locator('.book')).toBeVisible();
  await page.click('#bkTh'); // Thai under each paragraph makes it longer than one spread
  await page.waitForTimeout(200);
  let s = await page.evaluate(() => openBook.state());
  expect(s.spread).toBe(2);
  expect(s.pages).toBeGreaterThan(1);
  await page.keyboard.press('ArrowRight');
  expect((await page.evaluate(() => openBook.state())).page).toBe(1);
  // a tap on the left third goes back
  const vp = await page.locator('#bkVp').boundingBox();
  await page.mouse.click(vp.x + 10, vp.y + vp.height - 5);
  expect((await page.evaluate(() => openBook.state())).page).toBe(0);
  // swipe left = next page
  await page.mouse.move(vp.x + vp.width * 0.5, vp.y + vp.height - 5);
  await page.mouse.down(); await page.mouse.move(vp.x + vp.width * 0.2, vp.y + vp.height - 5, { steps: 5 }); await page.mouse.up();
  expect((await page.evaluate(() => openBook.state())).page).toBe(1);
  await page.keyboard.press('ArrowLeft');
  // highlighter on (finger/mouse), drag across the first visible list word
  await page.click('#bkPen');
  const r = await page.evaluate(() => { const x = [...document.querySelectorAll('.bk-flow .rw')].find((e) => { const b = e.getBoundingClientRect(); return b.left > 0 && b.right < innerWidth / 2; }); const b = x.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: x.textContent }; });
  await page.mouse.move(r.x - 2, r.y); await page.mouse.down(); await page.mouse.move(r.x + 2, r.y, { steps: 3 }); await page.mouse.up();
  s = await page.evaluate(() => openBook.state());
  expect(s.page).toBe(0); // highlighting never turns the page
  expect(s.marked.length).toBe(1);
  await expect(page.locator('.bk-flow .rw.hl').first()).toBeVisible();
  await page.click('#bkMark');
  await page.locator('[data-pd="new"]').click();
  expect(await page.evaluate(() => S.decks.filter((d) => !d.del).map((d) => d.words.length))).toEqual([1]);
  // last page → questions; leaving the route closes the book
  await page.evaluate(() => { const s = openBook.state(); for (let i = 0; i < s.pages; i++) document.getElementById('bkNext').click(); });
  await page.click('#bkDone');
  await expect(page.locator('.book')).toHaveCount(0);
  await page.click('#rBook');
  await page.keyboard.press('Escape');
  await expect(page.locator('.book')).toHaveCount(0);
  await page.click('#rBook');
  await page.evaluate(() => go('home'));
  await expect(page.locator('.book')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('book mode on a phone: one page at a time, no sideways overflow', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => loadStories().then(() => STORIES[0].id));
  await page.evaluate((id) => go('read', id), id);
  await page.click('#rBook');
  await page.waitForTimeout(200);
  expect((await page.evaluate(() => openBook.state())).spread).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('keyboard: arrows grade flashcards, Esc closes sheet / leaves a session / goes back, ⌥1–6 tabs, ⌘[ back, ? list', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page, { settings: { levels: ['A1'], thumbs: 'off' } });
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#fc')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight'); // จำได้
  await expect(page.locator('#pcount')).toContainText('1/');
  const w = await page.evaluate(() => Object.keys(S.prog)[0]);
  expect(w).toBeTruthy();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft'); // ลืม: the card comes back later in the session
  expect(await page.evaluate(() => Object.values(S.prog).some((p) => p.x >= 1 || p.b === 0))).toBe(true);
  const party = () => page.evaluate(() => document.querySelectorAll('.celebrate').forEach((e) => e.remove())); // the first-answer streak party has its own keys
  const kp = async (k) => { await party(); await page.keyboard.press(k); };
  await party();
  await kp('Escape'); // ✕ leaves the session
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'home');
  // ⌥3 = games, ⌥6 = settings
  await kp('Alt+Digit3');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'games');
  await kp('Alt+Digit6');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'settings');
  // ? opens the list, Esc closes it
  await kp('Shift+Slash');
  await expect(page.locator('.keys-sheet')).toHaveCount(1);
  expect(await page.locator('.keys-sheet kbd').count()).toBeGreaterThan(8);
  await kp('Escape');
  await expect(page.locator('.keys-sheet')).toHaveCount(0);
  await page.evaluate(() => { document.querySelector('details[data-g="look"]').open = true; });
  await page.click('#keysBtn');
  await expect(page.locator('.keys-sheet')).toHaveCount(1);
  await page.locator('.keys-sheet [data-close]').click();
  await expect(page.locator('.keys-sheet')).toHaveCount(0);
  // a word sheet closes with Esc; ⌘[ and Esc go back from a page with ‹
  await page.evaluate(() => go('list'));
  await page.evaluate(() => openSheet(W[0]));
  await expect(page.locator('.sheet-wrap')).toHaveCount(1);
  await kp('Escape');
  await expect(page.locator('.sheet-wrap')).toHaveCount(0);
  await page.evaluate(() => go('read'));
  const id = await page.evaluate(() => loadStories().then(() => STORIES[0].id));
  await page.evaluate((id) => go('read', id), id);
  await expect(page.locator('#rText')).toHaveCount(1);
  await kp('Meta+BracketLeft');
  await expect(page.locator('#rText')).toHaveCount(0);
  await page.evaluate((id) => go('read', id), id);
  // the book keeps Esc for itself: closing it does not also leave the story
  await page.click('#rBook');
  await kp('Escape');
  await expect(page.locator('.book')).toHaveCount(0);
  await expect(page.locator('#rText')).toHaveCount(1);
  await kp('Escape');
  await expect(page.locator('#rText')).toHaveCount(0);
  // typing in a field: Alt+digit and ? do nothing
  await page.evaluate(() => go('list'));
  const inp = page.locator('#view input').first();
  if (await inp.count()) { await inp.focus(); await kp('Shift+Slash'); await expect(page.locator('.keys-sheet')).toHaveCount(0); }
  expect(errors).toEqual([]);
});

test('Apple Pencil mode: big writable field, folded app keyboard, ⌨️ toggle, no double typing; auto turns on after a pencil touch', async ({ page }) => {
  await page.setViewportSize({ width: 744, height: 1133 });
  const errors = await openApp(page, { settings: { levels: ['A1'], appKbd: 'on', penMode: 'auto' } });
  expect(await page.evaluate(() => document.documentElement.classList.contains('pen-mode'))).toBe(false);
  // a pencil touch anywhere = this device has a pencil
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen', bubbles: true })));
  expect(await page.evaluate(() => [document.documentElement.classList.contains('pen-mode'), localStorage.getItem('o3k.pen')])).toEqual([true, '1']);
  await page.evaluate(() => startGame('spell'));
  const si = page.locator('#si');
  await expect(si).toBeVisible();
  expect(await si.evaluate((x) => [x.readOnly, x.getAttribute('inputmode'), x.classList.contains('kb-pen')])).toEqual([false, 'text', true]);
  await expect(page.locator('.app-kb')).toBeHidden();
  expect((await si.boundingBox()).height).toBeGreaterThanOrEqual(90);
  // writing (typing into the focused field) lands once
  await si.click();
  await page.keyboard.type('ab');
  await expect(si).toHaveValue('ab');
  // ⌨️ unfolds the app's keys and locks the field again; ✏️ folds them back
  await page.locator('.kb-toggle').click();
  await expect(page.locator('.app-kb')).toBeVisible();
  expect(await si.evaluate((x) => x.readOnly)).toBe(true);
  await page.locator('.app-kb [data-k="c"]').click();
  await expect(si).toHaveValue('abc');
  await page.locator('.kb-toggle').click();
  await expect(page.locator('.app-kb')).toBeHidden();
  // off in settings: the usual small field and the app keyboard
  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="look"]').open = true; });
  await page.locator('#penMode').selectOption('off');
  expect(await page.evaluate(() => document.documentElement.classList.contains('pen-mode'))).toBe(false);
  await page.evaluate(() => startGame('spell'));
  await expect(page.locator('.app-kb')).toBeVisible();
  await expect(page.locator('.kb-toggle')).toHaveCount(0);
  expect(await page.locator('#si').evaluate((x) => x.readOnly)).toBe(true);
  expect(errors).toEqual([]);
});

// Split View drag & drop (1.140): text dropped from another app → article checker or a word sheet; a field keeps its own drop.
const dropOn = (page, sel, data) => page.evaluate(([sel, data]) => {
  const t = document.querySelector(sel), dt = new DataTransfer();
  Object.entries(data).forEach(([k, v]) => dt.setData(k, v));
  const r = t.getBoundingClientRect(), xy = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  const over = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, ...xy });
  t.dispatchEvent(over);
  const zone = !!document.getElementById('dropZone');
  const drop = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, ...xy });
  t.dispatchEvent(drop);
  return { caught: over.defaultPrevented, zone, after: !!document.getElementById('dropZone') };
}, [sel, data]);

test('drag & drop: a dropped article opens the checker, one word opens its sheet, html is read as text, fields keep their drop', async ({ page }) => {
  await page.setViewportSize({ width: 566, height: 744 }); // half of an iPad mini in Split View
  const errors = await openApp(page);
  let r = await dropOn(page, '#view', { 'text/plain': 'The weather was beautiful, so we walked to the market and bought fresh bread.' });
  expect(r).toEqual({ caught: true, zone: true, after: false });
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'mine');
  await expect(page.locator('#mineIn')).toHaveValue(/beautiful, so we walked/);
  await expect(page.locator('#mineText')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('o3k.mine'))).toContain('fresh bread');
  // ‹ goes back where the drop happened
  await page.evaluate(() => document.getElementById('mineBack').click());
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'home');
  // one word → its sheet
  await dropOn(page, '#view', { 'text/plain': '  Weather ' });
  await expect(page.locator('.sheet .sheet-word')).toContainText('weather');
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  // html only (no plain text): read as text, and never run
  await dropOn(page, '#view', { 'text/html': '<p>I <b>like</b> green apples and hot tea.</p><img src=x onerror="window.__pwned=1">' });
  await expect(page.locator('#mineIn')).toHaveValue(/like green apples/);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  // a drop on a text field is left to the field
  r = await dropOn(page, '#mineIn', { 'text/plain': 'hello' });
  expect(r.caught).toBe(false);
  // no English: a toast, nothing else
  await page.evaluate(() => go('home'));
  await dropOn(page, '#view', { 'text/plain': 'สวัสดี 123' });
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'home');
  // the word on a sheet can be dragged out as "word – Thai"
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'apple')));
  const out = await page.evaluate(() => { const el = document.querySelector('.sheet-word'), dt = new DataTransfer(); el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true })); const t = dt.getData('text/plain'); el.dispatchEvent(new DragEvent('dragend', { bubbles: true })); return [el.draggable, t]; });
  expect(out[0]).toBe(true);
  expect(out[1]).toMatch(/^apple – /);
  expect(errors).toEqual([]);
});
