// Words of my own in sets (1.109): words outside the built-in list with a Thai meaning, studied with flashcards.
const { test, expect } = require('@playwright/test');
const { openApp, readState, fakeSupabase, syncOnce } = require('./helpers');

test('parseOwn: comma, tab, "=" and quoted CSV rows, header, numbering, list words, bad rows', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const r = await page.evaluate(() => parseOwn([
    'word,meaning,example,translation',
    'stakeholder, ผู้มีส่วนได้ส่วนเสีย, "We met every stakeholder, one by one.", เราพบผู้มีส่วนได้ส่วนเสียทุกคน',
    'onboarding = การปฐมนิเทศพนักงานใหม่',
    '3. kanban\tกระดานงาน\tThe kanban board is on the wall.',
    'apple, แอปเปิ้ล',            // already in the list → list word
    'Stakeholder, ซ้ำ',           // duplicate (case-insensitive)
    'nomeaning',                   // own word without a Thai meaning → bad
    '123, เลข',                    // not an English word → bad
    '',
  ].join('\n')));
  expect(r.own.map((o) => o.w)).toEqual(['stakeholder', 'onboarding', 'kanban']);
  expect(r.own[0]).toEqual({ w: 'stakeholder', t: 'ผู้มีส่วนได้ส่วนเสีย', e: 'We met every stakeholder, one by one.', et: 'เราพบผู้มีส่วนได้ส่วนเสียทุกคน' });
  expect(r.own[1]).toEqual({ w: 'onboarding', t: 'การปฐมนิเทศพนักงานใหม่', e: '', et: '' });
  expect(r.own[2].e).toBe('The kanban board is on the wall.');
  expect(r.list).toEqual(['apple']);
  expect(r.bad).toBe(3);
  expect(errors).toEqual([]);
});

test('own words: add by form and by import, study with flashcards, progress stays in the set, games leave them out', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => renderDeckEdit());
  await page.locator('#dkTabs [data-v="own"]').click();
  await page.locator('#ownW').fill('stakeholder');
  await page.locator('#ownT').fill('ผู้มีส่วนได้ส่วนเสีย');
  await page.locator('#ownE').fill('Every stakeholder joined the call.');
  await page.locator('#ownEt').fill('ผู้เกี่ยวข้องทุกคนเข้าร่วมประชุม');
  await page.locator('#ownAdd').click();
  await expect(page.locator('#dkWords')).toContainText('stakeholder');
  await expect(page.locator('#ownInfo')).toContainText('คำของฉัน 1');
  await page.locator('#ownText').fill('onboarding, การปฐมนิเทศ\nairport, ท่าอากาศยาน\nhotel');
  await page.locator('#ownImport').click();
  await expect(page.locator('#dkCount')).toHaveText('คำในชุด (4)'); // 2 own + airport (list) ; "hotel" has no meaning but is a list word → also list
  const d = await page.evaluate(() => { const x = S.decks[0]; return { words: x.words, own: x.own.map((o) => o.w), id: x.id }; });
  expect(d.words).toEqual(['airport', 'hotel']);
  expect(d.own).toEqual(['stakeholder', 'onboarding']);
  // deck page and flashcards
  await page.evaluate((id) => go('decks', id), d.id);
  await expect(page.locator('#dkList')).toContainText('stakeholder');
  await page.locator('#dkList .wrow', { hasText: 'stakeholder' }).click();          // word card opens for an own word
  await expect(page.locator('.wsheet')).toContainText('ผู้มีส่วนได้ส่วนเสีย');
  await expect(page.locator('.wsheet .lv.own')).toBeVisible();
  await page.locator('.sheet-wrap').click({ position: { x: 5, y: 5 } });
  const main0 = await page.evaluate(() => JSON.stringify(S.prog));
  await page.locator('#dkStudy').click();
  await expect(page.locator('#pcount')).toHaveText('0/4');
  const seen = [];
  for (let n = 0; n < 12 && await page.locator('#fc').count(); n++) {
    await page.locator('#fc').click();
    seen.push(await page.locator('#fc').textContent());
    await page.locator('[data-g="2"]').click();
  }
  expect(seen.join(' ')).toContain('stakeholder');
  expect(seen.join(' ')).toContain('Every stakeholder joined the call.');
  const st = await readState(page);
  expect(Object.keys(st.dprog[d.id]).sort()).toEqual(['airport', 'hotel', 'onboarding', 'stakeholder']);
  expect(JSON.stringify(st.prog)).toBe(main0);                                       // the main progress is untouched
  // games from this set use only the list words
  const pool = await page.evaluate((id) => { gameSource = 'deck'; gameDecks = [id]; return gameList2(); function gameList2() { return [...new Map(gameDecks.map(deckById).flatMap((x) => deckWords(x)).filter((w) => !w.own).map((w) => [w.idx, w])).values()].map((w) => w.w); } }, d.id);
  expect(pool.sort()).toEqual(['airport', 'hotel']);
  expect(errors).toEqual([]);
});

test('own words: copy keeps them, removing works, limits and junk are cleaned, the other device gets them through sync', async ({ browser }) => {
  const store = { data: null };
  const mk = async (state) => {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:8765/', viewport: { width: 440, height: 956 }, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await fakeSupabase(page, store);
    await page.addInitScript((st) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('oxford3000.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, { seenVer: '99.0.0', ...state });
    await page.goto('index.html'); await expect(page.locator('#view')).not.toBeEmpty();
    return { ctx, page, errors };
  };
  const junk = { id: 'd1', name: 'Work', icon: '💼', words: ['airport'], at: 5, used: 5,
    own: [{ w: 'stakeholder', t: 'ผู้เกี่ยวข้อง', e: 'x', et: 'y' }, { w: 'Airport', t: 'ซ้ำกับคลัง' }, { w: '', t: 'ว่าง' }, { w: 'ok word', t: '' }, 5, null, { w: '<b>x</b>', t: 'แท็ก' }, { w: 'kanban', t: 'กระดาน' }] };
  const A = await mk({ decks: [junk] });
  expect(await A.page.evaluate(() => S.decks[0].own.map((o) => o.w))).toEqual(['stakeholder', 'kanban']); // junk, duplicates of list words and bad names are dropped
  const copy = await A.page.evaluate(() => { const n = addDeck('Work copy', '💼', S.decks[0].words, S.decks[0].own); return n.own.map((o) => o.w); });
  expect(copy).toEqual(['stakeholder', 'kanban']);
  await A.page.evaluate(() => renderDeckEdit('d1'));
  await A.page.locator('#dkWords [data-rm="kanban"]').click();
  expect(await A.page.evaluate(() => S.decks.find((d) => d.id === 'd1').own.map((o) => o.w))).toEqual(['stakeholder']);
  expect(await syncOnce(A.page)).toBe(true);
  const B = await mk({});
  expect(await syncOnce(B.page)).toBe(true);
  expect(await B.page.evaluate(() => deckWords(deckById('d1')).map((w) => [w.w, w.t, !!w.own]))).toEqual([['airport', expect.any(String), false], ['stakeholder', 'ผู้เกี่ยวข้อง', true]].map((r) => r));
  // deleting the set drops its own words
  await A.page.evaluate(() => { const d = deckById('d1'); d.del = true; d.words = []; delete d.own; });
  expect(await A.page.evaluate(() => deckById('d1'))).toBeUndefined();
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});
