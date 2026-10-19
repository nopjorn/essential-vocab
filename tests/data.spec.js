// Content and release checks that need no browser.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
// Runs data files (they assign to window.*) in a sandbox and returns that window.
function load(...files) {
  const window = {};
  files.forEach((f) => vm.runInNewContext(read(f), { window }));
  return window;
}
// All app code: app.js plus the js/*.js scripts it is split into.
const appCode = () => ['app.js', ...fs.readdirSync(path.join(root, 'js')).map((f) => `js/${f}`)].map(read).join('\n');
const WORD_FILES = ['a1', 'a2', 'b1', 'b2', 'b2plus', 'c1'].map((l) => `words/${l}.js`);

test('version is the same in app.js, sw.js and the README changelog', () => {
  const v = read('app.js').match(/const APP_VERSION = '([\d.]+)'/)[1];
  expect(read('sw.js')).toContain(`const VERSION = 'o3k-${v}'`);
  expect(read('README.md')).toContain(`| ${v} |`);
});

test('changelog.js lists every README version, newest first', () => {
  const { CHANGELOG } = load('changelog.js');
  const readme = [...read('README.md').matchAll(/^\| (\d+\.\d+\.\d+) \|/gm)].map((m) => m[1]);
  expect(CHANGELOG.map((r) => r[0])).toEqual(readme);
  CHANGELOG.forEach(([v, t, d]) => { expect(typeof t).toBe('string'); expect(t.length, v).toBeGreaterThan(5); expect(d, v).toMatch(/^\d{4}-\d{2}-\d{2}$/); });
});

test('every file the service worker caches exists', () => {
  const files = [...read('sw.js').matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]).filter((f) => f !== './');
  expect(files.length).toBeGreaterThan(10);
  files.forEach((f) => expect(fs.existsSync(path.join(root, f)), f).toBe(true));
});

test('word rows are well formed', () => {
  const { WORDS } = load(...WORD_FILES);
  expect(WORDS.length).toBeGreaterThan(4900);
  // Collect problems first: one expect() per field of ~5,000 rows is very slow.
  const seen = new Set(), bad = [];
  for (const r of WORDS) {
    const [w, p, lv, ipa, th, ex, exTh, tp] = r;
    if (r.length !== 8 && !(r.length === 9 && r[8] === 5)) bad.push(`${w}: ${r.length} fields`);
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${w}: level ${lv}`);
    Object.entries({ w, p, ipa, th, ex, exTh, tp }).forEach(([n, x]) => { if (typeof x !== 'string' || !x) bad.push(`${w}: empty ${n}`); });
    const k = `${w}|${p}`;
    if (seen.has(k)) bad.push(`duplicate ${k}`);
    seen.add(k);
  }
  expect(bad).toEqual([]);
});

test('word families are valid practice data', () => {
  const { FAMILIES } = load('families.js');
  expect(FAMILIES.length).toBeGreaterThan(200);
  const seen = new Set();
  for (const fam of FAMILIES) {
    const words = fam.f.map((x) => x[0]);
    expect(words.length, words.join()).toBeGreaterThanOrEqual(2);
    fam.f.forEach(([w, p, th]) => {
      expect(seen.has(w), `${w} is in two families`).toBe(false);
      seen.add(w);
      expect(p).toMatch(/^(n|v|adj|adv)(\/(n|v|adj|adv))?$/);
      expect(th.length).toBeGreaterThan(0);
    });
    expect(fam.q.length, words[0]).toBeGreaterThan(0);
    fam.q.forEach(([s, a, th]) => {
      expect(s.split('___').length, s).toBe(2);
      expect(s.startsWith('___'), s).toBe(false);
      expect(words, s).toContain(a);
      expect(th.length).toBeGreaterThan(0);
    });
  }
});

test('confusable pairs and minimal pairs are valid', () => {
  const { CONFUSE, MINPAIRS } = load('pairs.js');
  for (const c of CONFUSE) {
    expect(c.tip.length).toBeGreaterThan(0);
    c.q.forEach(([s, right, wrong, th]) => {
      expect(s.split('___').length, s).toBe(2);
      expect(right).not.toBe(wrong);
      expect(th.length).toBeGreaterThan(0);
    });
  }
  MINPAIRS.forEach((m) => expect(m.length).toBe(5));
});

test('collocations belong to list words', () => {
  const { COLLOC } = load('collocations.js');
  const { WORDS } = load(...WORD_FILES);
  const words = new Set(WORDS.map((r) => r[0]));
  for (const [k, list] of Object.entries(COLLOC)) {
    expect(words.has(k), k).toBe(true);
    list.forEach(([en, th]) => expect(en && th, k).toBeTruthy());
  }
});

test('stories: unique ids, count matches STORY_COUNT, questions point at an option', () => {
  const files = appCode().match(/const STORY_FILES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((x) => `stories/${x.slice(1, -1)}.js`);
  const { STORIES } = load(...files);
  const count = +appCode().match(/const STORY_COUNT = (\d+)/)[1];
  expect(STORIES.length).toBe(count);
  expect(new Set(STORIES.map((s) => s.id)).size).toBe(count);
  for (const s of STORIES) {
    expect(s.en.length, s.id).toBe(s.th.length);
    s.q.forEach((q) => expect(q.o[q.a], `${s.id}: ${q.q}`).toBeDefined());
  }
});

test('index.html loads every js/ script, and the service worker caches it', () => {
  const html = read('index.html'), sw = read('sw.js');
  fs.readdirSync(path.join(root, 'js')).forEach((f) => {
    expect(html, f).toContain(`<script src="js/${f}"></script>`);
    expect(sw, f).toContain(`'js/${f}',`);
  });
  expect(html.indexOf('js/boot.js')).toBeGreaterThan(html.indexOf('js/settings.js'));
});

test('phrasal verbs are valid practice data', () => {
  const { PHRASAL } = load('phrasal.js');
  expect(PHRASAL.length).toBeGreaterThan(120);
  const seen = new Set(), bad = [];
  for (const r of PHRASAL) {
    const [pv, lv, th, ex, exTh] = r;
    if (r.length !== 5) bad.push(`${pv}: ${r.length} fields`);
    if (seen.has(pv)) bad.push(`duplicate ${pv}`);
    seen.add(pv);
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${pv}: level ${lv}`);
    if (!th || !exTh) bad.push(`${pv}: missing Thai`);
    const groups = [...ex.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
    if (groups.length !== 2 || groups[1] !== pv.split(' ').slice(1).join(' ')) bad.push(`${pv}: brackets ${groups}`);
  }
  expect(bad).toEqual([]);
  // every particle count has enough other particles for 3 distractors
  const parts = [...new Set(PHRASAL.map((r) => r[0].split(' ').slice(1).join(' ')))];
  [1, 2].forEach((n) => expect(parts.filter((p) => p.split(' ').length === n).length).toBeGreaterThan(6));
});

test('synonym groups are valid', () => {
  const { SYNONYMS } = load('synonyms.js');
  expect(SYNONYMS.length).toBeGreaterThan(80);
  const bad = [];
  for (const g of SYNONYMS) {
    if (!g.th || !g.tip) bad.push(`${g.s[0]}: missing th/tip`);
    if (g.s.length < 2) bad.push(`${g.s[0]}: fewer than 2 synonyms`);
    if (new Set(g.s).size !== g.s.length) bad.push(`${g.s[0]}: duplicate`);
    g.a.forEach((x) => { if (g.s.includes(x)) bad.push(`${g.s[0]}: ${x} is synonym and antonym`); });
  }
  expect(bad).toEqual([]);
});

test('word parts (affixes) are valid', () => {
  const { AFFIXES } = load('affixes.js');
  expect(AFFIXES.filter((a) => a.k === 'p').length).toBeGreaterThan(12);
  expect(AFFIXES.filter((a) => a.k === 's').length).toBeGreaterThan(12);
  const seen = new Set(), bad = [];
  for (const a of AFFIXES) {
    if (!['p', 's'].includes(a.k) || !a.th || a.ex.length < 2) bad.push(`${a.x}: kind/meaning/examples`);
    a.ex.forEach(([w, th]) => {
      const stem = a.k === 'p' ? w.slice(a.x.length) : w.slice(0, -a.x.length);
      if (!(a.k === 'p' ? w.startsWith(a.x) : w.endsWith(a.x)) || stem.length < 2) bad.push(`${a.x}: ${w}`);
      if (!th) bad.push(`${w}: no Thai`);
      if (seen.has(w)) bad.push(`${w} twice`);
      seen.add(w);
    });
  }
  expect(bad).toEqual([]);
});

test('service worker keeps word lists, stories and other content in the data cache', () => {
  const sw = read('sw.js'), data = sw.slice(sw.indexOf('const DATA = ['), sw.indexOf('];', sw.indexOf('const DATA = [')));
  const files = [...data.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  ['words', 'stories'].forEach((d) => fs.readdirSync(path.join(root, d)).forEach((f) => expect(files, f).toContain(`${d}/${f}`)));
  ['app.js', 'index.html', 'changelog.js', 'config.js'].forEach((f) => expect(files, f).not.toContain(f)); // change every version
});
