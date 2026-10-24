// Features added in 1.32+: slow speech, shadowing, phrasal verbs, synonyms, word parts, year heatmap, monthly test, export, a11y,
// idioms, situations and goal tags (1.44).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('slow speech: 🔊 twice plays slower, 🐢 buttons, setting turns repeat-slow off', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], rate: 0.9 } });
  await page.evaluate(() => { speak('apple'); speak('apple'); speak('apple'); speak('pear'); });
  let rates = await page.evaluate(() => window.__rates);
  expect(rates[0]).toBe(0.9); expect(rates[1]).toBeLessThan(0.7); expect(rates[2]).toBe(0.9); expect(rates[3]).toBe(0.9);
  // 🐢 button in the listening game
  await page.evaluate(() => go('games'));
  await page.locator('[data-game="listen"]').click();
  await page.locator('.slow-btn').click();
  rates = await page.evaluate(() => window.__rates);
  expect(rates[rates.length - 1]).toBeLessThan(0.7);
  // setting off → repeats stay at normal speed
  await page.evaluate(() => { S.settings.slowRepeat = false; window.__rates = []; speak('dog'); speak('dog'); });
  expect(await page.evaluate(() => window.__rates)).toEqual([0.9, 0.9]);
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#slowRep')).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('story reader: slow toggle and shadowing mode (play, next, prev, hide, back)', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => loadStories().then(() => go('read', STORIES[0].id)));
  await expect(page.locator('#rShadow')).toBeVisible();
  await page.locator('#rSlow').click();
  await expect(page.locator('#rSlow')).toHaveClass(/on/);
  await page.locator('#rShadow').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 1/');
  await expect(page.locator('#shSlow')).toHaveClass(/on/);
  await page.locator('#shPlay').click();
  await expect(page.locator('#shState')).toContainText('ตาคุณ');
  const first = await page.locator('#shEn').textContent();
  expect(await page.evaluate(() => window.__said)).toContain(first);
  await expect(page.locator('#shN')).toContainText('ประโยค 2/', { timeout: 8000 }); // auto-advances after the pause
  await page.locator('#shPrev').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 1/');
  await page.locator('#shNext').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 2/');
  await page.locator('#shHide').click();
  await expect(page.locator('#shEn')).toHaveClass(/hid/);
  await page.locator('#shThBtn').click();
  await expect(page.locator('#shTh')).toBeVisible();
  await page.locator('#topBack').click();
  await expect(page.locator('#rShadow')).toBeVisible();
  // shadowing again, jump to the last sentence and let it finish
  await page.locator('#rShadow').click();
  const n = await page.evaluate(() => storySentences(STORIES[0]).length);
  for (let k = 1; k < n; k++) await page.locator('#shNext').click();
  await page.locator('#shPlay').click();
  await expect(page.locator('#shState')).toContainText('ครบทั้งเรื่อง', { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('phrasal verbs: browser, word sheet box, game with right and wrong answers', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('games'));
  await page.locator('#toPV').click();
  await expect(page.locator('#pvList .pair-card').first()).toBeVisible();
  await page.locator('#pvq').fill('เลิก');
  await expect(page.locator('#pvList')).toContainText('give up');
  await page.locator('#pvList [data-say]').first().click();
  // word sheet of "look" lists its phrasal verbs
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'look')));
  await expect(page.locator('#pvBox')).toContainText('look after');
  await page.evaluate(() => document.querySelector('.sheet-wrap').remove());
  // game: alternate wrong and right answers to the result screen
  await page.evaluate(() => startGame('phrasal'));
  for (let k = 0; k < 10; k++) {
    await expect(page.locator('.options .opt').first()).toBeVisible();
    const opts = page.locator('.options .opt');
    const answer = await page.evaluate(() => { const shown = document.querySelector('.cloze').textContent; return PHRASAL.find((r) => { let k = 0; return r.ex.replace(/\[([^\]]+)\]/g, (a, x) => (k++ ? '_____' : x)) === shown; }).part; });
    const texts = await opts.allTextContents();
    const pickIdx = k % 2 ? texts.indexOf(answer) : texts.findIndex((t) => t !== answer);
    expect(pickIdx).toBeGreaterThanOrEqual(0);
    await opts.nth(pickIdx).click();
    await expect(page.locator('#reveal')).toContainText(k % 2 ? 'ถูกต้อง' : 'ที่ถูกคือ');
    await page.locator('#nextQ').click();
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  await expect(page.locator('.wrong-list')).toBeVisible();
  expect(errors).toEqual([]);
});

test('synonyms: every question has exactly one listed answer; browser, sheet box, game', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const problems = await page.evaluate(() => loadSyn().then(() => {
    const out = [];
    synItems().forEach((it) => {
      for (let k = 0; k < 3; k++) {
        const { answer, opts } = synQuestion(it), { syn, ant } = synRel(it.t), rel = it.kind === 's' ? syn : ant;
        const hits = opts.filter((o) => rel.has(o));
        if (opts.length !== 4 || new Set(opts).size !== 4 || hits.length !== 1 || hits[0] !== answer || opts.includes(it.t)) out.push(`${it.kind} ${it.t}: ${opts}`);
      }
    });
    return out;
  }));
  expect(problems).toEqual([]);
  await page.evaluate(() => go('games'));
  await page.locator('#toSyn').click();
  await page.locator('#synq').fill('ใหญ่');
  await expect(page.locator('#synList')).toContainText('enormous');
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'big')));
  await expect(page.locator('#synBox')).toContainText('huge');
  await page.evaluate(() => document.querySelector('.sheet-wrap').remove());
  await page.evaluate(() => startGame('syn'));
  for (let k = 0; k < 10; k++) {
    await expect(page.locator('.options .opt').first()).toBeVisible();
    const opts = page.locator('.options .opt');
    if (k % 2) await opts.first().click();
    else {
      // pick the right one: the only option related to the shown word in the asked way
      const idx = await page.evaluate(() => {
        const t = document.querySelector('.q-prompt .word').firstChild.textContent.replace(/^[≈↔] /, '').trim();
        const kind = document.querySelector('.q-prompt .word').textContent.startsWith('≈') ? 's' : 'a';
        const { syn, ant } = synRel(t), rel = kind === 's' ? syn : ant;
        return [...document.querySelectorAll('.options .opt')].findIndex((o) => rel.has(o.dataset.o));
      });
      await opts.nth(idx).click();
      await expect(page.locator('#reveal')).toContainText('ถูกต้อง');
    }
    await page.locator('#nextQ').click();
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  expect(errors).toEqual([]);
});

test('word parts: browser, word sheet box, game with right and wrong answers', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('games'));
  await page.locator('#toAf').click();
  await expect(page.locator('#afList')).toContainText('un-');
  await page.locator('#afq').fill('less');
  await expect(page.locator('#afList')).toContainText('careless');
  await expect(page.locator('#afList')).not.toContainText('unhappy');
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'careful')));
  await expect(page.locator('#afBox')).toContainText('-ful');
  await page.evaluate(() => document.querySelector('.sheet-wrap').remove());
  // no question offers a second affix that makes a real word with the same base
  const amb = await page.evaluate(() => gamePool('affix').filter((it) => affixDistractors(it._af, it.w).some((b) => WORD_BY[affixJoin(b, affixStem(it._af, it.w))])).map((it) => it.w));
  expect(amb).toEqual([]);
  await page.evaluate(() => startGame('affix'));
  for (let k = 0; k < 10; k++) {
    await expect(page.locator('.options .opt').first()).toBeVisible();
    const answer = await page.evaluate(() => {
      const th = document.querySelector('.q-prompt .th').textContent.replace(/[“”]/g, ''), shown = document.querySelector('.q-prompt .word').textContent;
      for (const a of AFFIX) for (const [w, t] of a.ex) if (t === th && (a.k === 'p' ? '___' + affixStem(a, w) : affixStem(a, w) + '___') === shown) return affixLabel(a);
    });
    const texts = await page.locator('.options .opt').allTextContents();
    const idx = k % 2 ? texts.indexOf(answer) : texts.findIndex((t) => t !== answer);
    expect(idx).toBeGreaterThanOrEqual(0);
    await page.locator('.options .opt').nth(idx).click();
    await expect(page.locator('#reveal')).toContainText(k % 2 ? 'ถูกต้อง' : 'ที่ถูกคือ');
    await page.locator('#nextQ').click();
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  expect(errors).toEqual([]);
});

// Seeds `n` learned words (half mastered) so the monthly test and the exports have data.
function seededProgress(n) {
  return (words) => {
    const prog = {};
    words.slice(0, n).forEach((w, k) => { prog[w] = k % 2 ? { b: 4, i: 20, e: 2.5, d: Date.now() + 9e8, s: 5, c: 5, x: 0 } : { b: 1, i: 1, e: 2.5, d: Date.now(), s: 1, c: 1, x: 0 }; });
    return prog;
  };
}

test('stats: year heatmap levels, tap a day; monthly test with right and wrong answers', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate((mk) => {
    const prog = (0, eval)(mk)(W.slice(0, 60).map((w) => w.w));
    const d = (k) => { const x = new Date(); x.setDate(x.getDate() - k); return x.toLocaleDateString('en-CA'); };
    Object.assign(S, { prog, hist: { [d(0)]: 3, [d(1)]: 12, [d(3)]: 30, [d(40)]: 80 } });
    save(); go('stats');
  }, `(${seededProgress})(60)`);
  await expect(page.locator('.hm-sum')).toContainText('4');
  for (const lv of [1, 2, 3, 4]) await expect(page.locator(`#hm .hm-${lv}`)).toHaveCount(1);
  await page.locator('#hm .hm-4').click();
  await expect(page.locator('#toast')).toContainText('80 ข้อ');
  // monthly test: 30 questions, wrong on even, right on odd
  await page.locator('[data-go="mtest"]').first().click();
  await page.locator('#mtGo').click();
  for (let k = 0; k < 30; k++) {
    await expect(page.locator('.options .opt')).toHaveCount(4);
    const idx = await page.evaluate((wantRight) => {
      const t = document.querySelector('#title').textContent;
      // the right option is the one whose text belongs to the asked word: find it from the prompt
      const p = document.querySelector('.q-prompt'), opts = [...document.querySelectorAll('.options .opt')].map((o) => o.textContent);
      let w;
      if (p.querySelector('.word')) w = W.find((x) => x.w === p.querySelector('.word').textContent);
      else if (p.querySelector('.th')) w = W.find((x) => x.t === p.querySelector('.th').textContent && S.prog[x.w]);
      else w = W.find((x) => x.w === window.__said[window.__said.length - 1]);
      const right = opts.findIndex((o) => o === w.t || o === w.w);
      return wantRight ? right : (right + 1) % 4;
    }, k % 2 === 1);
    await page.waitForTimeout(k % 3 === 2 ? 200 : 0); // listen questions speak after a short delay
    await page.locator('.options .opt').nth(idx).click();
    await expect(page.locator('.opt.correct')).toHaveCount(1);
    await expect(page.locator('#title')).toContainText(k === 29 ? 'ผล' : `${k + 2}/30`, { timeout: 4000 });
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  await expect(page.locator('.wrong-list .wl')).toHaveCount(15);
  const mt = (await readState(page)).mtest;
  expect(Object.values(mt)[0]).toMatchObject({ r: 15, n: 30 });
  await page.locator('[data-go="stats"]').click();
  await expect(page.locator('.mt-hist')).toContainText('50%');
  expect(errors).toEqual([]);
});

test('settings: export words as CSV and Anki', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate((mk) => { S.prog = (0, eval)(mk)(W.slice(0, 10).map((w) => w.w)); S.note[W[0].w] = 'my, "hook"'; save(); navigator.canShare = undefined; go('settings'); }, `(${seededProgress})(10)`);
  await page.locator('details[data-g="backup"] summary').click();
  await expect(page.locator('#xpWhich')).toContainText('(10)');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.locator('#xpCsv').click()]);
  const text = require('fs').readFileSync(await csv.path(), 'utf8');
  const lines = text.trim().split('\r\n');
  expect(lines).toHaveLength(11);
  expect(text.startsWith('\ufeff"word","pos"')).toBe(true); // BOM so Excel reads Thai as UTF-8
  expect(text).toContain('"my, ""hook"""');
  await page.locator('#xpWhich').selectOption('mastered');
  const [anki] = await Promise.all([page.waitForEvent('download'), page.locator('#xpAnki').click()]);
  const a = require('fs').readFileSync(await anki.path(), 'utf8').split('\n');
  expect(a.slice(0, 3)).toEqual(['#separator:tab', '#html:true', '#tags column:3']);
  expect(a).toHaveLength(3 + 5);
  a.slice(3).forEach((l) => expect(l.split('\t')).toHaveLength(3));
  expect(errors).toEqual([]);
});

test('accessibility: every visible control has a name; English text is marked lang="en"; feedback is announced', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const unnamed = () => [...document.querySelectorAll('button, a, input, select')].filter((e) => e.offsetParent).filter((e) => {
    const lab = e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || (e.labels && e.labels[0] && e.labels[0].textContent) || '';
    const txt = (e.textContent || '').replace(/[\p{Extended_Pictographic}\p{S}\p{P}\s‍️\d]/gu, '');
    return !lab.trim() && !txt;
  }).map((e) => e.id || e.className);
  for (const r of ['home', 'cards', 'games', 'list', 'stats', 'settings', 'read', 'mtest', 'decks']) {
    await page.evaluate((r) => go(r), r);
    expect(await page.evaluate(unnamed), r).toEqual([]);
  }
  await page.evaluate(() => { addDeck('ทดสอบ', '📚', ['airport', 'hotel']); renderDeckEdit(S.decks[0].id); });
  expect(await page.evaluate(unnamed), 'deck edit').toEqual([]);
  await page.evaluate(() => go('decks', S.decks[0].id));
  expect(await page.evaluate(unnamed), 'deck page').toEqual([]);
  await page.evaluate(() => { addDeck('อีกชุด', '💼', ['hotel']); gameSource = 'deck'; gameDecks = S.decks.map((d) => d.id); go('games'); });
  expect(await page.evaluate(unnamed), 'games with sets').toEqual([]);
  await page.evaluate(() => { gameSource = 'level'; go('home'); });
  expect(await page.evaluate(unnamed), 'home with sets').toEqual([]);
  await expect(page.locator('#toast')).toHaveAttribute('aria-live', 'polite');
  await page.evaluate(() => startGame('en2th'));
  await expect(page.locator('.q-prompt .word')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#reveal')).toHaveAttribute('aria-live', 'polite');
  await page.evaluate(() => openSheet(W[3]));
  await expect(page.locator('.sheet-word')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});

test('iPad sidebar (portrait + landscape): extra shortcuts only in the sidebar, they open their pages', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await expect(page.locator('.tab-more')).toBeHidden();
  await page.setViewportSize({ width: 956, height: 440 });
  await expect(page.locator('.tab-more')).toBeHidden();
  await page.setViewportSize({ width: 834, height: 1210 });
  await expect(page.locator('.tab-more')).toBeVisible();
  await page.setViewportSize({ width: 1376, height: 1032 });
  await expect(page.locator('.tab-more')).toBeVisible();
  await page.locator('.tabbar [data-tab="stats"]').click();
  await expect(page.locator('.tabbar [data-tab="stats"]')).toHaveClass(/active/);
  await page.locator('.tabbar [data-ref="phrasal"]').click();
  await expect(page.locator('#pvList')).toBeVisible();
  await expect(page.locator('.tabbar [data-ref="phrasal"]')).toHaveClass(/active/);
  await page.locator('#topBack').click();
  await expect(page.locator('[data-game]').first()).toBeVisible();
  await page.locator('.tabbar [data-ref="syn"]').click();
  await expect(page.locator('#title')).not.toHaveText('ศัพท์ต้องรู้');
  await page.locator('.tabbar [data-tab="read"]').click();
  await expect(page.locator('#title')).toHaveText('อ่านเรื่องสั้น');
  expect(errors).toEqual([]);
});

test('page animations: tabs slide by side, sub pages push / pop; slow data shows a skeleton', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const anim = () => page.evaluate(() => [...view.classList].find((c) => c.startsWith('vin')));
  await page.evaluate(() => go('games'));
  expect(await anim()).toBe('vin-l');
  await page.evaluate(() => go('home'));
  expect(await anim()).toBe('vin-r');
  await page.evaluate(() => go('games'));
  await page.evaluate(() => loadPairs().then(renderPairs));
  await expect(page.locator('#pBack')).toBeAttached();
  expect(await anim()).toBe('vin-push');
  await page.locator('#topBack').click();
  expect(await anim()).toBe('vin-pop');
  // phrasal.js answers slowly → skeleton, then the list
  await page.route('**/data/phrasal.js*', async (r) => { await new Promise((s) => setTimeout(s, 700)); r.continue(); });
  await page.evaluate(() => renderPhrasal());
  await expect(page.locator('.skel')).toBeVisible();
  await expect(page.locator('#pvList .pair-card').first()).toBeVisible();
  await expect(page.locator('.skel')).toHaveCount(0);
  // a fast load never flashes the skeleton, and a page opened meanwhile is not replaced by it
  await page.evaluate(() => { go('games'); withLoading(new Promise((r) => setTimeout(r, 400))); go('stats'); });
  await page.waitForTimeout(300);
  await expect(page.locator('.skel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('service worker', () => {
  test.use({ serviceWorkers: 'allow' });
  test('caches the app and content, then opens offline', async ({ page, context }) => {
    await page.goto('index.html');
    await page.evaluate(() => navigator.serviceWorker.ready);
    const ready = () => page.evaluate(async () => {
      const keys = await caches.keys();
      if (!keys.includes('o3k-data') || !keys.includes('o3k-' + APP_VERSION)) return 0;
      return (await (await caches.open('o3k-data')).keys()).length;
    });
    await expect.poll(ready, { timeout: 20000 }).toBe(22);
    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#view')).not.toBeEmpty();
    expect(await page.evaluate(() => WORDS.length)).toBeGreaterThan(4900);
    await context.setOffline(false);
  });
});

test('settings: page slide, answer bounce and confetti switch off one by one; old single switch migrates', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const html = () => page.evaluate(() => [...document.documentElement.classList].filter((c) => c.startsWith('no-')).sort());
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="look"]').open = true; });
  for (const id of ['animPage', 'animAnswer', 'confetti']) await expect(page.locator('#' + id)).toBeChecked();
  await page.locator('#animPage + span').click();
  expect(await html()).toEqual(['no-vt']);
  expect(await page.evaluate(() => { go('games'); return getComputedStyle(view).animationName; })).toBe('none');
  await page.evaluate(() => confetti());
  await expect(page.locator('.confetti')).toHaveCount(1); // confetti still on
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="look"]').open = true; });
  await page.locator('#confetti + span').click();
  await page.evaluate(() => { document.querySelector('.confetti')?.remove(); confetti(); });
  await expect(page.locator('.confetti')).toHaveCount(0);
  expect(await html()).toEqual(['no-vt']);
  await page.locator('#animAnswer + span').click();
  expect(await html()).toEqual(['no-ans', 'no-vt']);
  await page.locator('#animPage + span').click();
  expect(await html()).toEqual(['no-ans']);
  await page.reload();
  expect(await html()).toEqual(['no-ans']);
  expect(await page.evaluate(() => [S.settings.animPage, S.settings.animAnswer, S.settings.confetti])).toEqual([true, false, false]);
  expect(errors).toEqual([]);
});

test('settings: a 1.39.1 save with animations off turns all three switches off', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], anim: false } });
  expect(await page.evaluate(() => [S.settings.animPage, S.settings.animAnswer, S.settings.confetti, 'anim' in S.settings])).toEqual([false, false, false, false]);
  expect(errors).toEqual([]);
});

test('idioms: browser search, word sheet box, both question kinds with right and wrong answers', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('games'));
  await page.locator('#toId').click();
  await expect(page.locator('#idList .pair-card').first()).toBeVisible();
  await page.locator('#idq').fill('ง่ายมาก');
  await expect(page.locator('#idList')).toContainText('piece of cake');
  await page.locator('#idList [data-say]').first().click();
  expect(await page.evaluate(() => window.__said.at(-1))).toContain('piece of cake');
  await page.evaluate(() => openSheet(W.find((w) => w.w === 'ice')));
  await expect(page.locator('#idBox')).toContainText('break the ice');
  await page.evaluate(() => document.querySelector('.sheet-wrap').remove());
  // distractors never come from the same meaning group
  const clash = await page.evaluate(() => IDIOMS.some((r) => r.grp && [0, 1, 2].some(() => idDistractors(r).some((x) => x.grp === r.grp))));
  expect(clash).toBe(false);
  // a round mixes both kinds: idiom in a sentence → Thai meaning, or Thai meaning → idiom
  await page.evaluate(() => startGame('idiom'));
  for (let k = 0; k < 10; k++) {
    await expect(page.locator('.options .opt').first()).toBeVisible();
    const answer = await page.evaluate(() => {
      const r = IDIOMS.find((x) => x.exTh === document.querySelector('#idTh').textContent);
      return document.querySelector('.q-prompt mark') ? r.th : r.id;
    });
    const texts = await page.locator('.options .opt').allTextContents();
    expect(texts).toHaveLength(4);
    const idx = k % 2 ? texts.indexOf(answer) : texts.findIndex((t) => t !== answer);
    expect(idx).toBeGreaterThanOrEqual(0);
    await page.locator('.options .opt').nth(idx).click();
    await expect(page.locator('#reveal')).toContainText(k % 2 ? 'ถูกต้อง' : 'ที่ถูกคือ');
    await page.locator('#nextQ').click();
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  await expect(page.locator('.wrong-list')).toBeVisible();
  expect(errors).toEqual([]);
});

test('situations: list, detail with phrases and full dialogue playback, reply game', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('games'));
  await page.locator('#toSit').click();
  await expect(page.locator('.sit-tile').first()).toBeVisible(); // situations.js is lazy-loaded
  await expect(page.locator('.sit-tile')).toHaveCount(await page.evaluate(() => SIT.length));
  await page.locator('.sit-tile[data-sit="restaurant"]').click();
  await expect(page.locator('#title')).toContainText('สั่งอาหาร');
  await page.locator('[data-col]').first().click();
  expect(await page.evaluate(() => window.__said.at(-1))).toBe('menu');
  await page.locator('.dlg-line').nth(2).click();
  await expect(page.locator('.dlg-line').nth(2)).toHaveClass(/on/);
  await page.evaluate(() => { window.__said = []; });
  await page.locator('#sitAll').click();
  const n = await page.evaluate(() => SIT.find((s) => s.id === 'restaurant').d.length);
  await expect.poll(() => page.evaluate(() => window.__said.length), { timeout: 10000 }).toBe(n);
  await expect(page.locator('.dlg-line.on')).toHaveCount(0);
  // back goes to the list, then to the games menu
  await page.locator('#topBack').click();
  await expect(page.locator('.sit-tile').first()).toBeVisible();
  await page.locator('#sitPlay').click();
  for (let k = 0; k < 10; k++) {
    await expect(page.locator('.options .opt').first()).toBeVisible();
    const answer = await page.evaluate(() => {
      const prev = document.querySelector('.dlg-line.q span').firstChild.textContent.trim();
      for (const s of SIT) { const i = s.d.findIndex((l) => l[1] === prev); if (i >= 0) return s.d[i + 1][1]; }
    });
    const texts = await page.locator('.options .opt').allTextContents();
    expect(texts).toHaveLength(4);
    const idx = k % 2 ? texts.indexOf(answer) : texts.findIndex((t) => t !== answer);
    expect(idx).toBeGreaterThanOrEqual(0);
    await page.locator('.options .opt').nth(idx).click();
    await expect(page.locator('#reveal')).toContainText(k % 2 ? 'ถูกต้อง' : 'ประโยคที่เข้ากับบทสนทนาคือ');
    await page.locator('#nextQ').click();
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  expect(errors).toEqual([]);
});

test('goal tags: word list filter, sheet pills, game source, new flashcards follow the goal', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2', 'B1'] } });
  const travel = await page.evaluate(() => TAGS.find((t) => t.id === 'travel').w);
  // word list: goal filter combines with the level chips
  await page.evaluate(() => go('list'));
  await page.locator('#glSel').selectOption('travel');
  const shown = await page.locator('#rows .wrow .w').allTextContents();
  expect(shown.length).toBeGreaterThan(10);
  shown.forEach((w) => expect(travel).toContain(w));
  await page.locator('#rows .wrow').first().click();
  await expect(page.locator('.sheet-tags')).toContainText('ท่องเที่ยว');
  await page.evaluate(() => document.querySelector('.sheet-wrap').remove());
  // games: 🎯 source plays only tagged words
  await page.evaluate(() => go('games'));
  await page.locator('#srcBtn').click();
  await page.locator('#src [data-s="goal"]').click();
  await page.locator('#gGoal').selectOption('health');
  expect(await page.evaluate(() => gamePool('en2th').every((w) => hasTag(w, 'health')))).toBe(true);
  // settings: new words come from the goal; the count of new words left is shown
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="lv"]').open = true; });
  await page.locator('#goal').selectOption('work');
  await expect(page.locator('#goalCnt')).toContainText('เหลือคำใหม่');
  expect(await page.evaluate(() => S.settings.goal)).toBe('work');
  const fresh = await page.evaluate(() => pool().filter((w) => !S.prog[w.w] && inTopic(w)).map((w) => w.w));
  expect(fresh.length).toBeGreaterThan(10);
  expect(await page.evaluate((ws) => ws.every((x) => hasTag(W.find((w) => w.w === x), 'work')), fresh)).toBe(true);
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#view')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test('word sheet: extra examples for other meanings get their own boxes; games keep the main sentence', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => openSheet(W.find(w => w.w === 'maybe')));
  const boxes = page.locator('.example');
  await expect(boxes).toHaveCount(2);
  await expect(boxes.nth(1).locator('.thx')).toHaveText('บางทีเธออาจแค่เหนื่อย');
  await boxes.nth(1).locator('[data-sayex]').click();
  expect(await page.evaluate(() => window.__said.at(-1))).toBe('Maybe she is just tired.');
  expect(await page.evaluate(() => exParts(W.find(w => w.w === 'hungry')).length)).toBe(1);
  expect(await page.evaluate(() => W.find(w => w.w === 'maybe').e)).toBe('Maybe it will rain later.');
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); openSheet(W.find(w => w.w === 'light')); });
  await expect(page.locator('.example')).toHaveCount(5);
  await expect(page.locator('.example').nth(2).locator('.thx')).toHaveText('กระเป๋าใบนี้เบามาก');
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); openSheet(W.find(w => w.w === 'fit')); });
  await expect(page.locator('.example')).toHaveCount(4);
  await expect(page.locator('.example').nth(2).locator('.thx')).toHaveText('เด็กชายมีอาการชักแล้วล้มลงกับพื้น');
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); openSheet(W.find(w => w.w === 'charge')); });
  await expect(page.locator('.example')).toHaveCount(4);
  await expect(page.locator('.example').nth(3).locator('.thx')).toHaveText('เขาถูกตั้งข้อหาลักทรัพย์');
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); openSheet(W.find(w => w.w === 'seal')); });
  await expect(page.locator('.example')).toHaveCount(3);
  await expect(page.locator('.example').nth(1).locator('.thx')).toHaveText('เราเห็นแมวน้ำบนโขดหิน');
  expect(errors).toEqual([]);
});

test('speak: waits a beat after cancelling a running utterance and resumes a paused engine (iOS)', async ({ page }) => {
  const errors = await openApp(page, {});
  await page.evaluate(() => { window.__said = []; speechSynthesis.speaking = true; speechSynthesis.paused = true; speechSynthesis.resume = () => { speechSynthesis.paused = false; window.__resumed = true; }; speak('first'); speak('second'); });
  expect(await page.evaluate(() => window.__said.length)).toBe(0); // deferred, not spoken in the same tick as cancel()
  await expect.poll(() => page.evaluate(() => window.__said.slice())).toEqual(['second']); // only the latest survives
  expect(await page.evaluate(() => window.__resumed)).toBe(true);
  expect(errors).toEqual([]);
});

test('tab bar: สถิติ sits between เกม and คำศัพท์ and opens the stats page', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  expect(await page.evaluate(() => [...document.querySelectorAll('#tabbar > button')].map((b) => b.dataset.tab))).toEqual(['home', 'cards', 'games', 'stats', 'list', 'settings']);
  await page.locator('#tabbar > [data-tab="stats"]').click();
  await expect(page.locator('#title')).toHaveText('สถิติ');
  await expect(page.locator('#tabbar > [data-tab="stats"]')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('daily word riddle: same word per date, scoring, invalid guesses, hint, win, share, stats', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({ a: riddleAnswer('2026-10-23').w, b: riddleAnswer('2026-10-23').w, ok: riddlePool().every((w) => /^[a-z]{5}$/.test(w.w)), n: RIDDLE_ALL.length }));
  expect(info.a).toBe(info.b); expect(info.ok).toBe(true); expect(info.n).toBeGreaterThan(600);
  expect(await page.evaluate(() => riddleScore('geese', 'these').join(''))).toBe('xxggg');
  expect(await page.evaluate(() => riddleScore('speed', 'abide').join(''))).toBe('xxyxy');
  const { ans, wrong } = await page.evaluate(() => { const a = riddleAnswer(today()).w; return { ans: a, wrong: RIDDLE_ALL.map((w) => w.w).filter((w) => w !== a).slice(0, 3) }; });
  await page.evaluate(() => go('home'));
  await page.locator('#qRiddle').click();
  await expect(page.locator('.rd-row')).toHaveCount(6);
  // too short / not in the list: no try used
  await page.keyboard.type('ab'); await page.keyboard.press('Enter');
  await expect(page.locator('#toast')).toContainText('ครบ 5');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.type('zzzzz'); await page.keyboard.press('Enter');
  await expect(page.locator('#toast')).toContainText('ไม่มีคำนี้');
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
  // wrong guesses (on-screen keys for the first) → hint after two, first letter after four
  for (const [k, w] of wrong.entries()) {
    if (k === 0) { for (const c of w) await page.locator(`[data-k="${c}"]`).click(); await page.locator('[data-k="enter"]').click(); } else { await page.keyboard.type(w); await page.keyboard.press('Enter'); }
  }
  await expect(page.locator('.tip-box')).toContainText('คำใบ้');
  await expect(page.locator('.tip-box')).not.toContainText('ขึ้นต้นด้วย');
  expect((await readState(page)).riddle.g).toEqual(wrong);
  await page.keyboard.type(ans); await page.keyboard.press('Enter');
  await expect(page.locator('#rdRes')).toContainText('ครั้งที่ 4');
  const st = (await readState(page)).riddleStat;
  expect([st.played, st.won, st.streak, st.dist[3]]).toEqual([1, 1, 1, 1]);
  await page.evaluate(() => { window.__shared = ''; navigator.share = async (d) => { window.__shared = d.text; }; });
  await page.locator('#rdShare').click();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toContain('4/6'); expect(shared).toContain('🟩🟩🟩🟩🟩'); expect(shared.toLowerCase()).not.toContain(ans);
  await page.locator('#rdSay').click();
  expect(await page.evaluate(() => window.__said)).toContain(ans);
  // finished: reopening shows the result, and the home card says done
  await page.evaluate(() => go('games')); await page.locator('#toRiddle').click();
  await expect(page.locator('#rdRes')).toBeVisible();
  await expect(page.locator('#rdKb')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('daily word riddle: level chips change the pool until the first guess, then lock', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('riddle'));
  await expect(page.locator('[data-lv="A1"]')).toHaveClass(/on/);
  await expect(page.locator('[data-lv="B1"]')).not.toHaveClass(/on/);
  await page.locator('[data-lv="A2"]').click(); // A1 only
  await page.locator('[data-lv="C1"]').click(); // A1 + C1
  await page.locator('[data-lv="A1"]').click(); // C1 only
  await page.locator('[data-lv="C1"]').click(); // last one stays on
  await expect(page.locator('[data-lv="C1"]')).toHaveClass(/on/);
  expect(await page.evaluate(() => S.settings.riddleLv)).toEqual(['C1']);
  expect(await page.evaluate(() => riddleAnswer(today(), S.riddle.lv).l)).toBe('C1');
  const g = await page.evaluate(() => RIDDLE_ALL.map((w) => w.w).find((w) => w !== riddleAnswer(today(), ['C1']).w));
  await page.keyboard.type(g); await page.keyboard.press('Enter');
  await expect(page.locator('[data-lv="A1"]')).toBeDisabled();
  await page.evaluate(() => { S.settings.riddleLv = ['A1']; riddleToday(); });
  expect(await page.evaluate(() => S.riddle.lv)).toEqual(['C1']); // locked for today
  expect(errors).toEqual([]);
});

test('daily word riddle: six misses ends the round, streak resets, new day starts fresh', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => {
    const a = riddleAnswer(today()).w, ws = RIDDLE_ALL.map((w) => w.w).filter((w) => w !== a).slice(0, 6);
    S.riddleStat.streak = 3; S.riddleStat.last = '2000-01-01';
    go('riddle'); ws.forEach((w) => { [...w].forEach((c) => document.querySelector(`[data-k="${c}"]`).click()); document.querySelector('[data-k="enter"]').click(); });
  });
  await expect(page.locator('#rdRes')).toContainText('วันนี้ยังไม่ใช่');
  const s = await readState(page);
  expect([s.riddleStat.played, s.riddleStat.won, s.riddleStat.streak]).toEqual([1, 0, 0]);
  // yesterday's puzzle is replaced by today's
  await page.evaluate(() => { S.riddle.d = '2000-01-01'; go('riddle'); });
  await expect(page.locator('#rdRes')).toHaveCount(0);
  expect((await readState(page)).riddle.d).not.toBe('2000-01-01');
  expect(errors).toEqual([]);
});

test('home still renders when riddle data is missing or broken (1.46.1)', async ({ page }) => {
  const errors = await openApp(page, { riddle: null, riddleStat: null });
  expect(await page.$eval('#view', (v) => v.querySelectorAll('.hb').length)).toBeGreaterThan(2);
  expect(await page.$('#qRiddle')).not.toBeNull();
  // a card that throws is skipped, the rest of the home screen stays
  await page.evaluate(() => { window.riddleToday = () => { throw new Error('boom'); }; renderHome(); });
  expect(await page.$('#qRiddle')).toBeNull();
  expect(await page.$('#startBtn')).not.toBeNull();
  expect(errors.filter((e) => !/boom/.test(e))).toEqual([]);
});

test('emoji game: shows one emoji, options are emoji words, answer marks progress', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => startGame('emoji'));
  const view = page.locator('#view');
  await expect(view.locator('.emoji-big')).toBeVisible();
  const info = await page.evaluate(() => ({ emoji: document.querySelector('.emoji-big').textContent, opts: [...document.querySelectorAll('.opt')].map((o) => o.textContent) }));
  expect(info.opts.length).toBe(4);
  expect(await page.evaluate((o) => o.every((w) => !!EMOJI[w]) && o.filter((w) => EMOJI[w] === document.querySelector('.emoji-big').textContent).length, info.opts)).toBe(1);
  await view.locator('.opt.correct').count();
  await view.locator('.opt', { hasText: await page.evaluate(() => Object.keys(EMOJI).find((w) => EMOJI[w] === document.querySelector('.emoji-big').textContent)) }).first().click();
  await expect(view.locator('#reveal')).toContainText('✅');
  expect(errors).toEqual([]);
});

test('endless emoji run: streak resets on a wrong answer, record keeps the longest run, ✕ ends with a summary', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => startGame('emojiRun'));
  const view = page.locator('#view');
  const pick = async (right) => {
    await view.locator('.emoji-big').waitFor();
    const idx = await page.evaluate((right) => {
      const e = document.querySelector('.emoji-big').textContent;
      const opts = [...document.querySelectorAll('.opt')];
      const i = opts.findIndex((o) => EMOJI[o.textContent] === e);
      return right ? i : +(i === 0);
    }, right);
    await view.locator('.opt').nth(idx).click();
    await view.locator('#nextQ').click();
  };
  for (let n = 0; n < 12; n++) await pick(true);   // more than one 10-question round
  await expect(view.locator('#runStat')).toContainText('12');
  await pick(false);
  await expect(view.locator('#runStat')).toContainText('🔥 0');
  await pick(true); await pick(true);
  await view.locator('#quit').click();
  await expect(view.locator('.result-emoji')).toBeVisible();
  await expect(view.locator('.h2')).toContainText('12');
  expect((await readState(page)).best.emojiRun).toBe(12);
  expect(errors).toEqual([]);
});

test('colour palettes + black theme: settings switch html attributes, persist, no overflow', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => go('settings'));
  await page.locator('details[data-g="look"] > summary').click();
  const root = page.locator('html');
  const primary = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
  expect(await primary()).toBe('#6c5ce7');
  await expect(page.locator('#palette button')).toHaveCount(6);
  await page.locator('#palette [data-p="mint"]').click();
  await expect(root).toHaveAttribute('data-palette', 'mint');
  expect(await primary()).toBe('#007a61');
  await expect(page.locator('#palette [data-p="mint"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#theme [data-v="black"]').click();
  await expect(root).toHaveAttribute('data-theme', 'black');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const st = await readState(page);
  expect(st.settings.palette).toBe('mint');
  expect(st.settings.theme).toBe('black');
  await page.locator('#palette [data-p="violet"]').click();
  expect(await root.getAttribute('data-palette')).toBeNull();
  expect(errors).toEqual([]);
});

test('app icon picker: settings swap the touch icon, persist, no overflow', async ({ page }) => {
  const errors = await openApp(page, {});
  await page.evaluate(() => go('settings'));
  await page.locator('details[data-g="look"] > summary').click();
  await expect(page.locator('#iconPick button')).toHaveCount(6);
  await page.locator('#iconPick [data-i="dark"]').click();
  await expect(page.locator('#iconPick [data-i="dark"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe('icons/apple-touch-icon-dark.png');
  const st = await page.evaluate(() => JSON.parse(localStorage['oxford3000.v1']));
  expect(st.settings.icon).toBe('dark');
  await page.locator('#iconPick [data-i="purple"]').click();
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe('icons/apple-touch-icon.png');
  expect(errors).toEqual([]);
});

test('games menu: frequent row, pin + reorder, hide and unhide', async ({ page }) => {
  const errors = await openApp(page, { gplay: { syn: 5, listen: 3, match: 1 } });
  await page.evaluate(() => go('games'));
  const view = page.locator('#view');
  const sec = (t) => view.locator('.games-sec', { hasText: t }).locator('+ .game-grid [data-game]');
  await expect(sec('เล่นบ่อย')).toHaveCount(2);                 // match (1 round) is not frequent yet
  expect(await sec('เล่นบ่อย').evaluateAll((els) => els.map((e) => e.dataset.game))).toEqual(['syn', 'listen']);
  await view.locator('#gEdit').click();
  await view.locator('.gedit-row[data-id="emoji"] [data-pin]').click();
  await view.locator('.gedit-row[data-id="listen"] [data-pin]').click();
  await view.locator('.gedit-row[data-id="listen"] [data-up]').click();   // listen moves above emoji
  await view.locator('.gedit-row[data-id="spell"] [data-hide]').click();
  await view.locator('#gEdit').click();
  expect(await sec('เกมโปรด').evaluateAll((els) => els.map((e) => e.dataset.game))).toEqual(['listen', 'emoji']);
  expect(await sec('เล่นบ่อย').evaluateAll((els) => els.map((e) => e.dataset.game))).toEqual(['syn']);
  await expect(view.locator('.game-grid:not(.hidden-games .game-grid) [data-game="spell"]')).toHaveCount(0);
  await expect(view.locator('.hidden-games [data-game="spell"]')).toHaveCount(1);
  await expect(view.locator('[data-game="emoji"]')).toHaveCount(1);   // pinned: only in the top section
  await expect(view.locator('.games-head')).toContainText('เกมอื่นๆ');
  const st = await readState(page);
  expect(st.settings.gamePin).toEqual(['listen', 'emoji']);
  expect(st.settings.gameHide).toEqual(['spell']);
  // starting a game counts a play
  await page.evaluate(() => startGame('en2th'));
  expect(await page.evaluate(() => gamePlays('en2th'))).toBe(1);
  // unhide again
  await page.evaluate(() => go('games'));
  await view.locator('#gEdit').click();
  await view.locator('.gedit-row[data-id="spell"] [data-hide]').click();
  await expect(view.locator('.gedit-row[data-id="spell"] [data-hide]')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('sync: newest settings win on every device, voice stays per device, game plays add up across devices', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], voice: 'mine' }, gplay: { syn: 2 } });
  // boot alone never stamps the settings as changed
  expect((await readState(page)).settingsAt || 0).toBe(0);
  await page.reload();
  expect((await readState(page)).settingsAt || 0).toBe(0);
  // a change here stamps it
  await page.evaluate(() => { S.settings.newPerDay = 15; save(); });
  const at = (await readState(page)).settingsAt;
  expect(at).toBeGreaterThan(0);
  // an older copy from another device doesn't override it
  await page.evaluate((at) => mergeBackup({ prog: {}, settings: { ...S.settings, newPerDay: 40 }, settingsAt: at - 1000 }), at);
  expect((await readState(page)).settings.newPerDay).toBe(15);
  // a newer one does (pins, hidden games, theme, home layout), but keeps this device's voice
  await page.evaluate((at) => mergeBackup({ prog: {}, settings: { ...S.settings, newPerDay: 30, gamePin: ['emoji'], gameHide: ['spell'], theme: 'dark', voice: 'theirs' },
    homeCfg: [{ id: 'today', on: true, w: 'full' }], settingsAt: at + 1000, gplay: { other: { syn: 3, emoji: 1 } } }), at);
  const st = await readState(page);
  expect(st.settings.newPerDay).toBe(30);
  expect(st.settings.gamePin).toEqual(['emoji']);
  expect(st.settings.gameHide).toEqual(['spell']);
  expect(st.settings.voice).toBe('mine');
  expect(st.homeCfg).toEqual([{ id: 'today', on: true, w: 'full' }]);
  expect(st.settingsAt).toBe(at + 1000);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  // adopting synced settings is not a local change
  await page.evaluate(() => save());
  expect((await readState(page)).settingsAt).toBe(at + 1000);
  // plays: this device 2 + other device 3 (merging the same copy twice doesn't double it)
  await page.evaluate(() => mergeBackup({ prog: {}, gplay: { other: { syn: 3 } } }));
  expect(await page.evaluate(() => [gamePlays('syn'), gamePlays('emoji')])).toEqual([5, 1]);
  expect(errors).toEqual([]);
});

test('1.58: grouped topic picks (whole group or one topic), stickers of retired topics carry over', async ({ page }) => {
  const errors = await openApp(page, { settings: { topic: 'study', wotd: { lv: [], st: [], tp: ['media', 'food'] } }, stk: { work: 3, food: 2, nature: 1 } });
  const r = await page.evaluate(() => ({ topic: S.settings.topic, tp: S.settings.wotd.tp, stk: S.stk, group: W.filter((w) => topicMatch('study', w.tp)).length, leaf: W.filter((w) => topicMatch('tech', w.tp)).length, all: W.filter((w) => w.tp === 'edu' || w.tp === 'sci' || w.tp === 'tech').length }));
  expect(r.topic).toBe('study'); // a group id is a valid choice
  expect(r.tp).toEqual(['media', 'food']);
  expect(r.stk).toEqual({ food: 2, job: 3, money: 3, animal: 1, plant: 1, weather: 1 });
  expect(r.group).toBe(r.all);
  expect(r.leaf).toBeGreaterThan(0);
  expect(r.leaf).toBeLessThan(r.group);
  // the word list: pick a whole group, then one topic inside it
  await page.evaluate(() => go('list'));
  await page.selectOption('#tpSel', 'nature');
  const n1 = await page.evaluate(() => W.filter((w) => topicMatch('nature', w.tp)).length);
  await page.selectOption('#tpSel', 'animal');
  const n2 = await page.evaluate(() => W.filter((w) => w.tp === 'animal').length);
  expect(n1).toBeGreaterThan(n2);
  expect(n2).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

// ---- 1.59: look & feel ----
test('home goal rings: fill with progress, close with ✓ when everything is done', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 5 } });
  await expect(page.locator('.hero .ring')).toBeVisible();
  await expect(page.locator('.ring-legend')).toContainText('คำใหม่ 0/5');
  expect(await page.locator('.ring .rg').count()).toBe(2);
  // 3 of 5 new words learned: inner ring at 60%
  await page.evaluate(() => { S.daily = { date: today(), fresh: 3, reviews: 0 }; go('home'); });
  expect(await page.locator('.ring .rg.r2').evaluate((e) => e.style.strokeDashoffset)).toBe('40');
  await expect(page.locator('.hero')).not.toHaveClass(/ring-closed/);
  // nothing left to learn or review, something done → closed
  await page.evaluate(() => { S.daily = { date: today(), fresh: 5, reviews: 0 }; go('home'); });
  await expect(page.locator('.hero')).toHaveClass(/ring-closed/);
  await expect(page.locator('.ring-c')).toHaveText('✓');
  expect(errors).toEqual([]);
});

test('celebrations: level-up screen, XP fly, streak flash; level-up falls back to a toast with confetti off', async ({ page }) => {
  const errors = await openApp(page, { xp: 45 });
  await page.evaluate(() => addXP(10));
  await expect(page.locator('.xp-fly')).toHaveCount(1);
  await expect(page.locator('.lvlup')).toBeVisible();
  await expect(page.locator('.lvlup')).toContainText('Lv.2');
  await page.locator('.lvlup [data-close]').click();
  await expect(page.locator('.lvlup')).toHaveCount(0);
  await page.evaluate(() => { S.streak = { last: '', count: 0 }; markActive(); });
  await expect(page.locator('.streak-flash')).toBeVisible();
  expect(await page.locator('.streak-flash').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  await page.evaluate(() => { S.settings.confetti = false; addXP(200); });
  await expect(page.locator('#toast')).toContainText('เลเวลอัป');
  await expect(page.locator('.lvlup')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('topic tint and haptics: tint on card + sheet, switches in settings', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const hue = await page.evaluate(() => { const w = W.find((x) => FEED_HUE[x.tp] != null); return { w: w.w, hue: FEED_HUE[w.tp] }; });
  await page.evaluate((w) => { openSheet(W.find((x) => x.w === w)); }, hue.w);
  await expect(page.locator('.sheet.tint')).toHaveCSS('--hue', String(hue.hue));
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); S.settings.topicTint = false; });
  await page.evaluate((w) => { openSheet(W.find((x) => x.w === w)); }, hue.w);
  await expect(page.locator('.sheet.tint')).toHaveCount(0);
  await page.evaluate(() => { document.querySelector('.sheet-wrap').remove(); S.settings.topicTint = true; go('cards'); });
  await expect(page.locator('#stage .fc')).toBeVisible();
  // haptics: sfx() ticks the hidden switch input (1 for right, 2 for wrong); off → none
  await page.evaluate(() => { window.__t = 0; sfx('ok'); document.querySelector('.hap input').addEventListener('click', () => window.__t++); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__t = 0; sfx('bad'); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__t)).toBe(2);
  await page.evaluate(() => { S.settings.haptic = false; window.__t = 0; sfx('bad'); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__t)).toBe(0);
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#haptic')).toBeAttached();
  await expect(page.locator('#topicTint')).toBeAttached();
  expect(errors).toEqual([]);
});

test('gentle comeback (1.60): big backlog pauses new words, caps the round at 50, home card, toggle', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 10 } });
  // 90 A1 words overdue by 1..90 days, last activity 5 days ago
  await page.evaluate(() => {
    const now = Date.now(), t = (n) => new Date(now - n * DAY).toISOString().slice(0, 10);
    W.filter((w) => w.g === 'A1').slice(0, 90).forEach((w, i) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: now - (i + 1) * DAY, s: 1, c: 1, x: 0 }; });
    S.hist = { [t(5)]: 20 }; S.streak = { last: t(5), count: 3 };
    go('home');
  });
  await expect(page.locator('.welcome-back')).toContainText('หายไป 5 วัน');
  const q = await page.evaluate(() => { const b = buildQueue(); return { n: b.length, fresh: b.filter((w) => !S.prog[w.w]).length, first: b[0].w, oldest: dueList(pool())[0].w }; });
  expect(q.n).toBe(50); expect(q.fresh).toBe(0); expect(q.first).toBe(q.oldest);
  expect(await page.evaluate(() => buildQueue('backlog').length)).toBe(50);
  // ≤ 60 overdue → normal again (new words come back)
  await page.evaluate(() => { dueList(pool()).slice(0, 40).forEach((w) => { S.prog[w.w].d = Date.now() + 5 * DAY; }); });
  expect(await page.evaluate(() => backlogPlan().on)).toBe(false);
  expect(await page.evaluate(() => buildQueue().filter((w) => !S.prog[w.w]).length)).toBe(10);
  // switch off in settings
  await page.evaluate(() => { dueList(pool()); W.filter((w) => w.g === 'A1' && !S.prog[w.w]).slice(0, 60).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() - DAY, s: 1, c: 1, x: 0 }; }); go('settings'); });
  await expect(page.locator('#gentle')).toBeChecked();
  expect(await page.evaluate(() => backlogPlan().on)).toBe(true);
  await page.locator('label.switch:has(#gentle)').click();
  expect(await page.evaluate(() => backlogPlan().on)).toBe(false);
  expect(errors).toEqual([]);
});

test('quests (1.61): 3 daily tiers, set bonus, weekly quest reward + freeze', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => { const l = questDefs(); return { tiers: l.map((x) => x.def.tier), n: l.length }; });
  expect(info.tiers).toEqual([0, 1, 2]);
  await page.evaluate(() => go('home'));
  await expect(page.locator('.qrow')).toHaveCount(4); // 3 daily + weekly
  // finish all three by hand through questEvent-compatible progress, check XP + bonus
  const r = await page.evaluate(() => {
    S.xp = 0; S.freeze = 0; S.counts.qsets = 2; S.wq = { key: mondayKey(), id: 'sets3', c: { sets: 2 }, done: false };
    const l = questDefs(); l.slice(0, 2).forEach((x) => { x.st.n = questTarget(x.def); x.st.done = true; });
    const last = l[2]; last.st.n = questTarget(last.def) - 1;
    // push the last one over with its own event type
    const ev = { 'cards15': ['card'], 'cards': ['card'], 'fresh': ['card'], leech3: ['leech'], combo: ['round', { game: 'x', bestCombo: 9, correct: 0 }], perfect: ['round', { game: 'th2en', perfect: true, correct: 10 }], skill: ['round', { game: 'syn', correct: 9 }], speak: ['answer', { game: 'speak', ok: true }] }[last.def.id] || ['card'];
    if (last.def.id === 'fresh') S.daily.fresh = questTarget(last.def) - 1, last.st.n = S.daily.fresh;
    const before = S.xp;
    questEvent(...ev);
    return { done: questDefs().every((x) => x.st.done), bonus: S.quest.bonus, gain: S.xp - before, freeze: S.freeze, wdone: S.wq.done, id: last.def.id };
  });
  expect(r.done).toBe(true); expect(r.bonus).toBe(true);
  expect(r.wdone).toBe(true); expect(r.freeze).toBe(2); // set bonus (3rd set) + weekly
  expect(r.gain).toBeGreaterThanOrEqual(40 + 100 + 25);
  // pre-1.61 saved shape is replaced without errors
  await page.evaluate(() => { S.quest = { date: today(), n: 3, done: true }; go('home'); });
  await expect(page.locator('.qrow')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('streak repair (1.61): broken 5-day streak is restored after 2x goal; expires after 48 h; secret medal hidden', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 10 } });
  const r = await page.evaluate(() => {
    const t = (n) => new Date(Date.now() - n * DAY).toLocaleDateString('en-CA');
    S.streak = { last: t(4), count: 5 }; S.freeze = 0; S.hist = { [t(4)]: 10 };
    markActive(); // returns after missing 3 days
    const first = { count: S.streak.count, repair: !!repairInfo(), need: S.repair.need };
    for (let i = 0; i < S.repair.need; i++) markActive();
    return { first, after: { count: S.streak.count, done: S.repair.done, repairs: S.counts.repairs } };
  });
  expect(r.first).toEqual({ count: 1, repair: true, need: 20 });
  expect(r.after).toEqual({ count: 6, done: true, repairs: 1 });
  // expiry
  const ex = await page.evaluate(() => { S.repair = { count: 4, at: Date.now() - 49 * 3600e3, base: 0, need: 20, done: false }; return repairInfo(); });
  expect(ex).toBeNull();
  // home card + secret medal grid
  await page.evaluate(() => { S.repair = { count: 4, at: Date.now() - 3600e3, base: 0, need: 20, done: false }; go('home'); });
  await expect(page.locator('.repair-card')).toContainText('ซ่อมสตรีค 4 วัน');
  await page.evaluate(() => { S.ach = {}; go('stats'); });
  await expect(page.locator('#ach')).toContainText('เหรียญลับ');
  expect(errors).toEqual([]);
});

test('reviews come from every learned level (1.62.1): A1 due cards stay in the queue when only A2 is selected', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A2'], newPerDay: 5 } });
  await page.evaluate(() => {
    W.filter((w) => w.g === 'A1').slice(0, 12).forEach((w, i) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() - (i + 1) * 3600000, s: 1, c: 1, x: 0 }; });
  });
  const r = await page.evaluate(() => { const q = buildQueue(); return { due: q.filter((w) => w.g === 'A1').length, fresh: q.filter((w) => !S.prog[w.w]).every((w) => w.g === 'A2'), n: dueList().length }; });
  expect(r.due).toBe(12); expect(r.fresh).toBe(true); expect(r.n).toBe(12);
  expect(await page.evaluate(() => buildQueue('ahead').length)).toBe(12);
  expect(errors).toEqual([]);
});

test('1.62: 3-minute session, tomorrow box, weekly new-word goal, ready-to-read box', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 10, weekGoal: 5 }, placedAt: '2026-01-01' });
  // home block + short queue
  await page.evaluate(() => go('home'));
  await expect(page.locator('#qShort')).toBeVisible();
  const q = await page.evaluate(() => buildQueue('short').length);
  expect(q).toBe(12);
  // weekly goal counts new words and shows on home
  await page.evaluate(() => { const w = W.filter((x) => x.g === 'A1'); for (let i = 0; i < 3; i++) grade(w[i], 2); go('home'); });
  await expect(page.locator('[data-hb="wgoal"]')).toContainText('3/5');
  // finishing a round shows tomorrow's box
  await page.evaluate(() => { const w = W.filter((x) => x.g === 'A1')[5]; S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() + 0.5 * DAY, s: 1, c: 1, x: 0 }; S.daily.fresh = S.settings.newPerDay; go('cards'); });
  await expect(page.locator('.tomorrow')).toContainText('พรุ่งนี้รอคุณอยู่');
  // ready box in the library and on stats
  await page.evaluate(() => loadStories().then(() => go('read')));
  await expect(page.locator('.ready-box')).toContainText('พร้อมอ่านระดับไหนแล้ว');
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#readyHost .ready-box')).toBeVisible();
  expect(errors).toEqual([]);
});

test('minutes goal (1.63): new words are worked out from time per card and the reviews due; fixed for the day', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 20, minutes: 0 } });
  expect(await page.evaluate(() => newGoal())).toBe(20);
  const r = await page.evaluate(() => {
    S.spc = { t: 600, n: 60 }; // 10 s per card
    S.settings.minutes = 10;   // 60 cards, none due -> floor(60 / 2.5) = 24
    const none = newGoal();
    // due reviews appear later in the day but the goal stays fixed
    W.filter((w) => w.g === 'A1').slice(0, 20).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() - 1000, s: 1, c: 1, x: 0 }; });
    const same = newGoal();
    S.settings.minutes = 20;   // 120 cards - 20 due = 100 / 2.5 = 40
    const twenty = newGoal();
    S.settings.minutes = 10; delete S.daily.ng; // 60 - 20 = 40 / 2.5 = 16
    return { none, same, twenty, ten: newGoal(), spc: secPerCard() };
  });
  expect(r).toEqual({ none: 24, same: 24, twenty: 40, ten: 16, spc: 10 });
  // timing: two grades 5 s apart add to the average, a long pause is ignored
  const t = await page.evaluate(() => {
    S.spc = { t: 0, n: 0 }; const w = W.find((x) => x.g === 'A1' && !S.prog[x.w]);
    gradeAt = Date.now() - 5000; grade(w, 2);
    const a = { ...S.spc };
    gradeAt = Date.now() - 120000; grade(W.find((x) => x.g === 'A1' && !S.prog[x.w]), 2);
    return { a, b: { ...S.spc } };
  });
  expect(t.a.n).toBe(1); expect(t.a.t).toBeGreaterThan(4.9); expect(t.b.n).toBe(1);
  await page.evaluate(() => { S.settings.minutes = 15; go('settings'); });
  await expect(page.locator('#minInfo')).toContainText('คำใหม่/วัน');
  await expect(page.locator('#npd')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('leech session (1.64): 15 stubborn words as flashcards with the memory hook; hook shown in game feedback', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const names = await page.evaluate(() => {
    const ws = W.filter((w) => w.g === 'A1').slice(0, 20);
    ws.forEach((w) => { S.prog[w.w] = { b: 0, i: 1, e: 2, d: Date.now() + 5 * DAY, s: 6, c: 1, x: 5 }; });
    ws.forEach((w) => { S.note[w.w] = 'ท่องเป็นเพลง'; }); save();
    return { n: buildQueue('leech').length, all: buildQueue('leech').every(isLeech), hook: hookBox(ws[0]), none: hookBox(W.find((w) => !S.note[w.w])) };
  });
  expect(names.n).toBe(15); expect(names.all).toBe(true);
  expect(names.hook).toContain('ท่องเป็นเพลง'); expect(names.none).toBe('');
  // flashcards: leech button on the done screen opens the session, back of card shows the hook
  await page.evaluate(() => go('cards', 'leech'));
  await expect(page.locator('#fc')).toBeVisible();
  // game: a wrong answer shows the hook of that word (every leech word has one)
  let hooked = false;
  for (let k = 0; k < 8 && !hooked; k++) {
    await page.evaluate(() => { gameSource = 'leech'; startGame('en2th'); });
    await page.locator('#view .opt').nth(k % 4).click();
    if ((await page.locator('#reveal').innerText()).includes('❌')) { await expect(page.locator('#reveal .note-box.hook')).toContainText('ท่องเป็นเพลง'); hooked = true; }
  }
  expect(hooked).toBe(true);
  expect(errors).toEqual([]);
});

test('skill games on a schedule (1.65): wrong items come back first, solid ones go later, stats table, backup merge', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => loadPhrasal());
  const r = await page.evaluate(() => {
    const src = gamePool('phrasal');
    const a = src[0], b = src[1], c = src[2];
    lexGrade(lexKey('phrasal', a), false); // wrong → due now
    lexGrade(lexKey('phrasal', b), true); lexGrade(lexKey('phrasal', b), true); // right twice → later
    const pickA = lexPick('phrasal', src, 10);
    const keys = new Set(src.map((x) => lexKey('phrasal', x)));
    return { first: pickA.includes(a), hasB: S.lex[lexKey('phrasal', b)].i > 1, dueA: S.lex[lexKey('phrasal', a)].d <= Date.now(), unique: keys.size === src.length, n: pickA.length, st: lexStats('phrasal'), c: !!c };
  });
  expect(r.first).toBe(true); expect(r.hasB).toBe(true); expect(r.dueA).toBe(true); expect(r.unique).toBe(true); expect(r.n).toBe(10);
  expect(r.st).toEqual({ seen: 2, solid: 0, due: 1 });
  // a played round writes S.lex
  await page.evaluate(() => { S.lex = {}; startGame('phrasal'); });
  await page.locator('#view .opt').first().click();
  expect(await page.evaluate(() => Object.keys(S.lex).length)).toBe(1);
  // stats table + backup merge keeps the further-along copy
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.g-table', { hasText: 'ถึงกำหนด' })).toContainText('Phrasal');
  const m = await page.evaluate(() => {
    const k = Object.keys(S.lex)[0], mine = S.lex[k];
    mergeBackup({ prog: {}, lex: { [k]: { ...mine, b: 3, i: 20, s: mine.s + 5 }, bad: { b: 'x' } } });
    return { i: S.lex[k].i, bad: !!S.lex.bad };
  });
  expect(m).toEqual({ i: 20, bad: false });
  expect(errors).toEqual([]);
});

test('FSRS scheduler (1.67): first reviews, growth with good answers, lapse, retention, old cards, SM-2 switch', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const r = await page.evaluate(() => {
    const first = [0, 1, 2, 3].map((g) => sched(undefined, g).i);
    // a card reviewed 3 days ago with stability 3.2: good → longer, again → lapse (due now, lower stability)
    const card = { b: 1, i: 3, e: 2.5, d: Date.now() - 3600000, s: 2, c: 2, x: 0, st: 3.17, df: 5, lr: Date.now() - 3 * DAY };
    const good = sched(card, 2), easy = sched(card, 3), hard = sched(card, 1), again = sched(card, 0);
    // retention 80% → longer gaps than 95%
    S.settings.retention = 0.8; const lo = sched(undefined, 2).i;
    S.settings.retention = 0.95; const hi = sched(undefined, 2).i;
    S.settings.retention = 0.9;
    // a card from before 1.66 (no st/df): derives its state from i/e
    const old = { b: 3, i: 7, e: 2.5, d: Date.now() - 2 * DAY, s: 4, c: 4, x: 0 };
    const og = sched(old, 2);
    // grade() stores the fields
    const w = W.find((x) => !S.prog[x.w]); grade(w, 2);
    const stored = S.prog[w.w];
    S.settings.scheduler = 'sm2'; const sm = sched(undefined, 2).i, smFields = fsFields(sched(undefined, 2));
    return { first, goodUp: good.i > 3, order: hard.i <= good.i && good.i <= easy.i, againI: again.i, againLower: again.st < card.st, lo, hi, oldUp: og.i > 7, stored: [stored.i, stored.st > 0, stored.df > 0, stored.lr > 0], sm, smFields };
  });
  expect(r.first).toEqual([0, 1, 3, 16]);
  expect(r.goodUp).toBe(true); expect(r.order).toBe(true); expect(r.againI).toBe(0); expect(r.againLower).toBe(true);
  expect(r.lo).toBeGreaterThan(3); expect(r.hi).toBeLessThan(3);
  expect(r.oldUp).toBe(true); expect(r.stored).toEqual([3, true, true, true]);
  expect(r.sm).toBe(1); expect(r.smFields).toEqual({});
  // settings: switch + retention
  await page.evaluate(() => { S.settings.scheduler = 'fsrs'; go('settings'); });
  await expect(page.locator('#sched')).toHaveValue('fsrs');
  await page.locator('#ret').selectOption('95');
  expect(await page.evaluate(() => S.settings.retention)).toBe(0.95);
  await page.locator('#sched').selectOption('sm2');
  await expect(page.locator('#ret')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('1.66: level test (gate, pass, medal), share card, year in review', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await openApp(page, { settings: { levels: ['A1'] }, placedAt: '2026-01-01' });
  // gate: nothing learned → test locked; learn 80% of A1 → opens
  await page.evaluate(() => go('stats'));
  await expect(page.locator('[data-lt="A1"]')).toBeDisabled();
  await page.evaluate(() => {
    const a1 = W.filter((w) => w.g === 'A1'); a1.slice(0, Math.ceil(a1.length * 0.85)).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() + DAY, s: 1, c: 1, x: 0 }; });
    go('stats');
  });
  await expect(page.locator('[data-lt="A1"]')).toBeEnabled();
  await page.locator('[data-lt="A1"]').click();
  await page.locator('#mtGo').click();
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(250);
    const idx = await page.evaluate(() => {
      const t = document.querySelector('.q-prompt .word, .q-prompt .th'), isEn = !!document.querySelector('.q-prompt .word');
      const said = (window.__said || []).slice(-1)[0], sw = typeof said === 'string' ? said : said && said.text;
      const rows = t ? W.filter((x) => (isEn ? x.w === t.textContent : x.t === t.textContent)) : W.filter((x) => x.w === sw);
      const toTh = !t || isEn, good = new Set(rows.map((x) => (toTh ? x.t : x.w)));
      return [...document.querySelectorAll('.opt')].findIndex((o) => good.has(o.textContent));
    });
    expect(idx).toBeGreaterThanOrEqual(0);
    await page.locator('.opt').nth(idx).click();
    await page.waitForTimeout(700);
  }
  await expect(page.locator('.result-emoji')).toBeVisible();
  expect(await page.evaluate(() => pct(S.ltest.A1))).toBeGreaterThanOrEqual(80);
  expect(await page.evaluate(() => !!S.ach.ltA1)).toBe(true);
  // share card downloads a PNG
  await page.evaluate(() => go('stats'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#shareProg').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
  // year in review
  await page.evaluate(() => { const y = new Date().getFullYear(); S.hist[`${y}-02-03`] = 12; S.hist[`${y}-02-04`] = 30; S.chist[`${y}-02-04`] = 10; go('year', y); });
  await expect(page.locator('.year-slide')).toContainText('ปี');
  for (let i = 0; i < 12 && await page.locator('#yNext').count(); i++) await page.locator('#yNext').click();
  await expect(page.locator('#yShare')).toBeVisible();
  expect(errors).toEqual([]);
});
