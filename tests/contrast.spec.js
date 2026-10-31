// Dark mode + light mode text contrast (1.112): every visible piece of text on the main screens must reach WCAG AA
// (4.5:1, 3:1 for large text) against the colour it really sits on. Elements on gradients / images are skipped.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const ROUTES = ['home', 'cards', 'games', 'list', 'stats', 'settings', 'guide', 'read', 'mascot', 'decks', 'adv', 'fun', 'tower', 'coinshop', 'puzzle', 'album', 'garden', 'cases', 'cafe', 'map', 'riddle', 'changelog'];
const REFS = ['pairs', 'fams', 'syn', 'affix', 'roots', 'ukus', 'phrasal', 'idiom', 'sit', 'irr', 'dprep', 'mis', 'gpat', 'ipa'];
const now = Date.now();
const prog = {};
['abandon', 'ability', 'able', 'about', 'above', 'accept', 'access', 'account', 'achieve', 'across', 'act', 'active'].forEach((w, k) => {
  prog[w] = { b: k % 6, i: [1, 3, 7, 16, 35, 80][k % 6], e: 2.5, d: now + (k % 3 ? 1 : -1) * 86400000, s: 4, c: 3, x: k % 4 === 0 ? 4 : 0 };
});

// Runs in the page: returns [{sel, text, ratio, fg, bg}] for text that is too faint.
function scan() {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const out = [];
  const view = document.getElementById('view');
  const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n; (n = walker.nextNode());) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim() || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || el.closest('[aria-hidden="true"], [disabled], .locked, svg')) continue;
    // effective background: walk up, stop at the first opaque colour; bail out on gradients/images
    let bg = null, skip = false, layers = [], op = 1;
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      op *= +s.opacity;
      if (s.backgroundImage !== 'none') { skip = true; break; }
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    if (skip || el.closest('.hero, .confetti, .celebrate')) continue;
    bg = layers.length && layers[layers.length - 1].a >= 1 ? layers[layers.length - 1] : parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    if (bg.a < 1) bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let k = layers.length - (layers[layers.length - 1] && layers[layers.length - 1].a >= 1 ? 2 : 1); k >= 0; k--) bg = mix(layers[k], bg);
    let fg = parse(cs.color); if (!fg) continue;
    fg = mix({ ...fg, a: fg.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) out.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), text: n.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100 });
  }
  return out;
}

for (const theme of ['dark', 'light']) {
  test(`${theme} mode: text on the main screens is readable (AA)`, async ({ page }) => {
    const errors = await openApp(page, { prog, settings: { theme, levels: ['A1', 'A2'] }, read: { }, seenVer: '99.0.0' });
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' }); // mid-fade colours are not real
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    const bad = {};
    const check = async (name) => { await page.waitForTimeout(150); const v = await page.evaluate(scan); if (v.length) bad[name] = v; };
    for (const r of ROUTES) { await page.evaluate((r) => go(r), r); await check(r); }
    for (const r of REFS) { await page.evaluate((r) => { go('games'); REF_PAGES[r](); }, r); await check('ref:' + r); }
    await page.evaluate(() => openSheet(W.find((w) => w.w === 'decide'))); await check('sheet'); await page.keyboard.press('Escape');
    await page.evaluate(() => openSearch()); await page.evaluate(() => { document.querySelector('#gsq').value = 'a'; document.querySelector('#gsq').dispatchEvent(new Event('input')); }); await check('search');
    const lines = Object.entries(bad).map(([k, v]) => `${k}: ` + v.map((x) => `${x.sel} "${x.text}" ${x.ratio}`).slice(0, 8).join(' | '));
    console.log(theme + '\n' + lines.join('\n'));
    expect(errors).toEqual([]);
    expect(lines, lines.join('\n')).toEqual([]);
  });
}
