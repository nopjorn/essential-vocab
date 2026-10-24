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
  for (const r of ['home', 'cards', 'games', 'list', 'stats', 'settings', 'read', 'mtest']) {
    await page.evaluate((r) => go(r), r);
    expect(await page.evaluate(unnamed), r).toEqual([]);
  }
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
