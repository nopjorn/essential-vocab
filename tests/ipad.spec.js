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
  // ✕ leaves the session (a late celebration can take the first Esc for itself: it owns its keys, so try again)
  await expect.poll(async () => { await kp('Escape'); return page.locator('#view').getAttribute('data-route'); }, { timeout: 10000 }).toBe('home');
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

test('thumb answers in games: options on both sides of the question, next button in reach; off = usual layout', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page, { settings: { levels: ['A1'], thumbs: 'on' } });
  expect(await page.evaluate(() => document.documentElement.classList.contains('thumbs'))).toBe(true);
  await page.evaluate(() => startGame('en2th'));
  await expect(page.locator('.options .opt').first()).toBeVisible();
  const q = await page.locator('.q-prompt').boundingBox();
  const b = async (k) => page.locator('.options .opt').nth(k).boundingBox();
  for (const k of [0, 1]) { const o = await b(k); expect(o.x + o.width).toBeLessThanOrEqual(q.x + 1); }
  for (const k of [2, 3]) { const o = await b(k); expect(o.x).toBeGreaterThanOrEqual(q.x + q.width - 1); }
  for (const k of [0, 1, 2, 3]) { const o = await b(k); expect(o.y + o.height).toBeLessThanOrEqual(744); }
  // a wrong answer: the next button is on screen without scrolling
  await page.evaluate(() => { const c = playQuiz.cur; [...document.querySelectorAll('.opt')].find((x) => +x.dataset.i !== c.idx).click(); });
  const n = await page.locator('#nextQ').boundingBox();
  expect(n.y + n.height).toBeLessThanOrEqual(744);
  expect(n.x).toBeGreaterThan(q.x + q.width - 1);
  await page.locator('#nextQ').click();
  await expect(page.locator('#title')).toContainText('2/');
  // off: answers stay in one column beside the question
  await page.evaluate(() => { S.settings.thumbs = 'off'; applyThumbs(); startGame('en2th'); });
  await expect(page.locator('.options .opt').first()).toBeVisible();
  const q2 = await page.locator('.q-prompt').boundingBox(), o2 = await page.locator('.options .opt').first().boundingBox();
  expect(o2.x).toBeGreaterThanOrEqual(q2.x + q2.width - 1);
  expect(errors).toEqual([]);
});

test('drawn memory hook: draw with a pen, palm ignored, save, shown on the sheet / card / game hint, undo, sync newest wins, bad data dropped', async ({ page }) => {
  await page.setViewportSize({ width: 744, height: 1133 });
  const errors = await openApp(page);
  await page.evaluate(() => editNote(W.find((w) => w.w === 'apple')));
  const pad = page.locator('#skPad');
  await expect(pad).toBeVisible();
  const b = await pad.boundingBox();
  const stroke = (type, x0, y0, x1, y1) => page.evaluate(([type, x0, y0, x1, y1]) => {
    const cv = document.getElementById('skPad'), o = { pointerType: type, pointerId: type === 'pen' ? 7 : 8, bubbles: true };
    cv.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x0, clientY: y0 }));
    for (let k = 1; k <= 10; k++) cv.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x0 + (x1 - x0) * k / 10, clientY: y0 + (y1 - y0) * k / 10 }));
    cv.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x1, clientY: y1 }));
  }, [type, x0, y0, x1, y1]);
  await stroke('pen', b.x + 20, b.y + 20, b.x + b.width - 20, b.y + b.height - 20);
  await stroke('touch', b.x + 20, b.y + b.height - 20, b.x + b.width - 20, b.y + 20); // the palm after a pencil: ignored
  await stroke('pen', b.x + b.width / 2, b.y + 10, b.x + b.width / 2, b.y + b.height - 10);
  await page.locator('[data-sk="undo"]').click(); // takes back the last pen stroke
  await page.locator('#noteIn').fill('แอปเปิ้ลแดง');
  await page.locator('[data-act="save"]').click();
  const st = await page.evaluate(() => [S.sketch.apple, S.note.apple, S.sketchAt.apple > 0]);
  expect(st[0]).toMatch(/^M\d+ \d+( L\d+ \d+)+$/); // exactly one stroke
  expect(st[1]).toBe('แอปเปิ้ลแดง');
  expect(st[2]).toBe(true);
  // shown on the word sheet, the card back and in a game hint
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'apple')));
  await expect(page.locator('.sheet .note-box svg.sketch path')).toHaveCount(1);
  expect(await page.evaluate(() => hookBox(W.find((w) => w.w === 'apple')))).toContain('<svg class="sketch');
  // reopening the editor shows the drawing again
  await page.evaluate(() => { document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()); editNote(W.find((w) => w.w === 'apple')); });
  // sync: a newer delete from another device wins; an older drawing does not come back; junk is dropped
  await page.evaluate(() => { document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()); });
  await page.evaluate(() => mergeBackup({ sketch: { apple: 'M1 1 L5 5' }, sketchAt: { apple: 1 } }));
  expect(await page.evaluate(() => S.sketch.apple)).toBe(st[0]);
  await page.evaluate(() => mergeBackup({ sketch: {}, sketchAt: { apple: Date.now() + 1000 } }));
  expect(await page.evaluate(() => S.sketch.apple)).toBeUndefined();
  await page.evaluate(() => mergeBackup({ sketch: { bad: 'M1 1"/><script>window.__x=1</script>', banana: 'M10 10 L20 20' }, sketchAt: { bad: Date.now() + 5000, banana: Date.now() + 5000 } }));
  expect(await page.evaluate(() => [S.sketch.bad, S.sketch.banana, sketchSvg('bad')])).toEqual([undefined, 'M10 10 L20 20', '']);
  // delete clears both
  await page.evaluate(() => { S.note.apple = 'x'; S.sketch.apple = 'M1 1 L2 2'; editNote(W.find((w) => w.w === 'apple')); });
  await page.locator('[data-act="del"]').click();
  expect(await page.evaluate(() => [S.note.apple, S.sketch.apple])).toEqual([undefined, undefined]);
  expect(errors).toEqual([]);
});

test('book memory: paper colour, page left off and highlights come back next time; the last page starts over; ✕ clears highlights', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 720 }); // a small Split View window: one page at a time = several pages
  const errors = await openApp(page, { settings: { levels: ['B1'], rFont: 2 } });
  const id = await page.evaluate(() => loadStories().then(() => STORIES.filter((s) => s.level === 'B2').sort((a, b) => b.en.join(' ').length - a.en.join(' ').length)[0].id));
  await page.evaluate((id) => go('read', id), id);
  await page.click('#rBook');
  await page.click('#bkTh');
  await page.waitForTimeout(200);
  expect((await page.evaluate(() => openBook.state())).pages).toBeGreaterThan(2);
  // paper: paper → sepia → gray
  await page.click('#bkTheme'); await page.click('#bkTheme');
  expect((await page.evaluate(() => openBook.state())).theme).toBe('gray');
  await expect(page.locator('.book')).toHaveClass(/t-gray/);
  // page 2 and one highlighted word
  await page.keyboard.press('ArrowRight');
  await page.click('#bkPen');
  await page.evaluate(() => { const x = [...document.querySelectorAll('.bk-flow .rw')].find((e) => { const b = e.getBoundingClientRect(); return b.left > 0 && b.right < innerWidth; }); const b = x.getBoundingClientRect(), o = { pointerType: 'pen', pointerId: 3, bubbles: true, clientX: b.left + 2, clientY: b.top + b.height / 2 }; x.dispatchEvent(new PointerEvent('pointerdown', o)); document.getElementById('bkVp').dispatchEvent(new PointerEvent('pointerup', o)); });
  const s1 = await page.evaluate(() => openBook.state());
  expect(s1.page).toBe(1);
  expect(s1.marked.length).toBe(1);
  await page.keyboard.press('Escape');
  // the Thai lines were on when the page was left: open with them off → still near the same place in the story
  await page.click('#rBook');
  await page.waitForTimeout(300);
  let s2 = await page.evaluate(() => openBook.state());
  expect(s2.theme).toBe('gray');
  expect(s2.page).toBeGreaterThanOrEqual(1);
  expect(s2.marked).toEqual(s1.marked);
  await expect(page.locator('.bk-flow .rw.hl').first()).toBeAttached();
  // ✕ clears the highlights (and they stay cleared)
  await page.click('#bkClr');
  expect((await page.evaluate(() => openBook.state())).marked).toEqual([]);
  // the last page → next time from the start
  await page.evaluate(() => { for (let k = 0; k < 40; k++) document.getElementById('bkNext').click(); });
  await page.keyboard.press('Escape');
  await page.click('#rBook');
  await page.waitForTimeout(300);
  s2 = await page.evaluate(() => openBook.state());
  expect([s2.page, s2.marked]).toEqual([0, []]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3k.book')).t)).toBe('gray');
  expect(errors).toEqual([]);
});

test('match by drawing a line: right pair done, wrong pair counted, a tapped tile before does not get in the way, taps still work', async ({ page }) => {
  await page.setViewportSize({ width: 744, height: 1133 });
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => startGame('match'));
  await expect(page.locator('.match-grid .tile')).toHaveCount(12);
  const line = (sa, sb, type = 'pen') => page.evaluate(([sa, sb, type]) => {
    const a = document.querySelector(sa), b = document.querySelector(sb), g = document.querySelector('.match-grid');
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), o = { pointerType: type, pointerId: 11, bubbles: true };
    const at = (r) => ({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    a.dispatchEvent(new PointerEvent('pointerdown', { ...o, ...at(ra) }));
    for (let k = 1; k <= 8; k++) g.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: ra.left + ra.width / 2 + (rb.left - ra.left) * k / 8, clientY: ra.top + ra.height / 2 + (rb.top - ra.top) * k / 8 }));
    const shown = !!g.querySelector('.mt-lines line');
    g.dispatchEvent(new PointerEvent('pointerup', { ...o, ...at(rb) }));
    return shown && !g.querySelector('.mt-lines');
  }, [sa, sb, type]);
  const i0 = await page.locator('.tile[data-k="en"]').first().getAttribute('data-i');
  // tap a different English word first, then draw the right line for the first one
  const other = await page.locator('.tile[data-k="en"]').nth(1).getAttribute('data-i');
  await page.locator(`.tile[data-k="en"][data-i="${other}"]`).click();
  expect(await line(`.tile[data-k="en"][data-i="${i0}"]`, `.tile[data-k="th"][data-i="${i0}"]`)).toBe(true);
  await expect(page.locator(`.tile.done[data-i="${i0}"]`)).toHaveCount(2);
  // a wrong line (finger): not done, shakes
  const i1 = await page.locator('.tile[data-k="en"]:not(.done)').nth(0).getAttribute('data-i');
  const wrongTh = await page.locator(`.tile[data-k="th"]:not(.done):not([data-i="${i1}"])`).first().getAttribute('data-i');
  await line(`.tile[data-k="en"][data-i="${i1}"]`, `.tile[data-k="th"][data-i="${wrongTh}"]`, 'touch');
  await expect(page.locator('.tile.done')).toHaveCount(2);
  await expect(page.locator(`.tile.no[data-k="en"][data-i="${i1}"]`)).toHaveCount(1);
  // a line within one column does nothing
  const i2 = await page.locator('.tile[data-k="en"]:not(.done)').nth(1).getAttribute('data-i');
  await line(`.tile[data-k="en"][data-i="${i1}"]`, `.tile[data-k="en"][data-i="${i2}"]`);
  await expect(page.locator('.tile.done')).toHaveCount(2);
  // finish the round with taps, the rest of the game with lines
  for (let r = 0; r < 3; r++) {
    for (;;) {
      const left = await page.locator('.tile[data-k="en"]:not(.done)').count();
      if (!left) break;
      const i = await page.locator('.tile[data-k="en"]:not(.done)').first().getAttribute('data-i');
      if (r === 0) { await page.locator(`.tile[data-k="en"][data-i="${i}"]`).click(); await page.locator(`.tile[data-k="th"][data-i="${i}"]`).click(); }
      else await line(`.tile[data-k="en"][data-i="${i}"]`, `.tile[data-k="th"][data-i="${i}"]`);
    }
    if (r < 2) await expect(page.locator('.match-grid .tile.done')).toHaveCount(0);
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  await expect(page.locator('#view')).toContainText('ผิด 1 ครั้ง');
  expect(errors).toEqual([]);
});

test('word menu: right-click or a finger long press on a word → listen / meaning / star / set / copy; Esc closes; game answers are left alone', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => loadStories().then(() => STORIES[0].id));
  await page.evaluate((id) => go('read', id), id);
  const rw = page.locator('#rText .rw').first();
  const word = await rw.evaluate((el) => W[+el.dataset.i].w);
  await rw.click({ button: 'right' });
  await expect(page.locator('.wmenu')).toBeVisible();
  await expect(page.locator('.wmenu .wm-h')).toContainText(word);
  await page.locator('[data-wm="star"]').click();
  expect(await page.evaluate((w) => !!S.star[w], word)).toBe(true);
  await expect(page.locator('.wmenu')).toHaveCount(0);
  await rw.click({ button: 'right' });
  await page.locator('[data-wm="copy"]').click();
  expect(await page.evaluate(() => wordMenu.copied)).toMatch(new RegExp('^' + word + ' – '));
  await rw.click({ button: 'right' });
  await page.locator('[data-wm="sheet"]').click();
  await expect(page.locator('.sheet .sheet-word')).toContainText(word);
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  await rw.click({ button: 'right' });
  await page.locator('[data-wm="deck"]').click();
  await expect(page.locator('.pick-decks')).toBeVisible();
  await page.evaluate(() => document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove()));
  // keyboard: arrows move, Esc closes
  await rw.click({ button: 'right' });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-wm="sheet"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.wmenu')).toHaveCount(0);
  await expect(page.locator('#rText')).toBeVisible(); // Esc closed only the menu
  // finger long press: the menu opens and the click that ends the press does not open the sheet
  const r = await rw.boundingBox();
  await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); t.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, clientX: x, clientY: y })); }, [r.x + 3, r.y + r.height / 2]);
  await page.waitForTimeout(700);
  await expect(page.locator('.wmenu')).toBeVisible();
  await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); t.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true, clientX: x, clientY: y })); t.click(); }, [r.x + 3, r.y + r.height / 2]);
  await expect(page.locator('.sheet-wrap')).toHaveCount(0);
  // a moving finger (a scroll) never opens it
  await page.evaluate(() => wmClose());
  await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); t.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, clientX: x, clientY: y })); document.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', bubbles: true, clientX: x, clientY: y + 40 })); }, [r.x + 3, r.y + r.height / 2]);
  await page.waitForTimeout(700);
  await expect(page.locator('.wmenu')).toHaveCount(0);
  // the word list too; a game answer keeps the browser's own menu
  await page.evaluate(() => go('list'));
  await page.locator('#view .wrow[data-i]').first().click({ button: 'right' });
  await expect(page.locator('.wmenu')).toBeVisible();
  await page.evaluate(() => { wmClose(); startGame('en2th'); });
  const caught = await page.evaluate(() => { const o = document.querySelector('.opt'), e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); o.dispatchEvent(e); return e.defaultPrevented; });
  expect(caught).toBe(false);
  expect(errors).toEqual([]);
});

test('hover meaning: a hovering pencil (or a resting mouse) over a story word shows its meaning; touch never; gone on leave / press / page change', async ({ page }) => {
  await page.setViewportSize({ width: 1133, height: 744 });
  const errors = await openApp(page);
  const id = await page.evaluate(() => loadStories().then(() => STORIES[0].id));
  await page.evaluate((id) => go('read', id), id);
  const over = (type, k = 2) => page.evaluate(([type, k]) => { const rw = document.querySelectorAll('#rText .rw')[k]; rw.dispatchEvent(new PointerEvent('pointerover', { pointerType: type, bubbles: true })); return W[+rw.dataset.i]; }, [type, k]);
  const out = (k = 2) => page.evaluate((k) => { const rw = document.querySelectorAll('#rText .rw')[k]; rw.dispatchEvent(new PointerEvent('pointerout', { pointerType: 'pen', bubbles: true, relatedTarget: document.body })); }, k);
  const w = await over('pen');
  await expect(page.locator('.whov')).toBeVisible();
  await expect(page.locator('.whov')).toContainText(w.t);
  expect(await page.locator('.whov').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  await out();
  await expect(page.locator('.whov')).toHaveCount(0);
  // touch: nothing
  await over('touch');
  await page.waitForTimeout(600);
  await expect(page.locator('.whov')).toHaveCount(0);
  // mouse rests a little longer, a press hides it
  await over('mouse', 4);
  await expect(page.locator('.whov')).toBeVisible();
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await expect(page.locator('.whov')).toHaveCount(0);
  // leaving the page hides it
  await over('pen', 5);
  await expect(page.locator('.whov')).toBeVisible();
  await page.evaluate(() => go('home'));
  await expect(page.locator('.whov')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('flashcards still loading their data do not draw over the page the user moved on to (1.148)', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { FAMILIES = null; go('cards'); go('settings'); });
  await page.waitForTimeout(1200);
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'settings');
  await expect(page.locator('#fc')).toHaveCount(0);
  await expect(page.locator('#thumbs')).toBeAttached();
  expect(errors).toEqual([]);
});

test('room for the iPad window buttons: off by default in a browser, on moves a narrow top bar right, wide layouts unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 566, height: 744 });
  const errors = await openApp(page);
  expect(await page.evaluate(() => [winGapOn(), document.documentElement.classList.contains('win-gap')])).toEqual([false, false]); // not a home-screen app
  const x0 = await page.locator('#title').boundingBox();
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="look"]').open = true; });
  await page.locator('#winGap').selectOption('on');
  expect(await page.evaluate(() => [S.settings.winGap, document.documentElement.classList.contains('win-gap')])).toEqual(['on', true]);
  const x1 = await page.locator('#title').boundingBox();
  expect(x1.x - x0.x).toBeGreaterThanOrEqual(60);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // wide window: the top-left corner is the tab rail, the top bar stays where it was
  await page.setViewportSize({ width: 1133, height: 744 });
  const pad = await page.locator('.topbar').evaluate((el) => getComputedStyle(el).paddingLeft);
  expect(parseFloat(pad)).toBeLessThan(60);
  await page.locator('#winGap').selectOption('off');
  expect(await page.evaluate(() => document.documentElement.classList.contains('win-gap'))).toBe(false);
  expect(errors).toEqual([]);
});

// 1.149.1: on an iPad Air 11" home-screen app (1180×820 with the status bar above the top bar) the thumb layouts fit the screen
// exactly: the flashcard did not fit (its height was guessed from 100dvh) and the quiz question was a narrow strip.
test('thumb layouts fill the screen that is left: card and buttons fit, the question card is wide and as tall as the answers', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  const errors = await openApp(page, { settings: { levels: ['A1'], thumbs: 'on' } });
  await page.addStyleTag({ content: '.topbar { padding-top: 44px !important; }' }); // like the status bar of a home-screen app
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#fc')).toBeVisible();
  const card = await page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), v = document.getElementById('view'); return { bottom: s.bottom, h: s.height, buttons: Math.max(...[...document.querySelectorAll('#grade .btn')].map((b) => b.getBoundingClientRect().bottom)), scroll: v.scrollHeight - v.clientHeight }; });
  expect(card.bottom).toBeLessThanOrEqual(820);
  expect(card.buttons).toBeLessThanOrEqual(820);
  expect(card.h).toBeGreaterThan(520); // and it uses the room
  expect(card.scroll).toBeLessThanOrEqual(1);
  await page.evaluate(() => startGame('en2th'));
  await expect(page.locator('.options .opt').first()).toBeVisible();
  await page.waitForTimeout(600); // the question card pops in (scale animation)
  const q = await page.locator('.q-prompt').boundingBox();
  const last = await page.locator('.options .opt').nth(3).boundingBox();
  expect(q.width).toBeGreaterThan(420);
  expect(last.y + last.height).toBeLessThanOrEqual(820);
  expect(Math.abs(q.y + q.height - (last.y + last.height))).toBeLessThanOrEqual(2); // the card reaches down to the answers
  // a wrong answer: the next button does not sit on an answer
  await page.evaluate(() => { const c = playQuiz.cur; [...document.querySelectorAll('.opt')].find((x) => +x.dataset.i !== c.idx).click(); });
  const n = await page.locator('#nextQ').boundingBox(), o4 = await page.locator('.options .opt').nth(3).boundingBox();
  expect(n.y).toBeGreaterThanOrEqual(o4.y + o4.height);
  expect(n.y + n.height).toBeLessThanOrEqual(820);
  expect(errors).toEqual([]);
});
