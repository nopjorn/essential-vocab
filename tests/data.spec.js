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
const appCode = () => ['app.js', ...fs.readdirSync(path.join(root, 'js')).map((f) => `js/${f}`), 'data/app/play.js', 'data/app/stats.js', 'data/app/guide.js'].map(read).join('\n'); // + the lazy-loaded engine and manual (1.101)
const WORD_FILES = ['a1', 'a2', 'b1', 'b2', 'b2plus', 'c1', 'toeic', 'nawl', 'bsl', 'it', 'health', 'politics', 'cooking', 'feelings', 'environment', 'social'].map((l) => `data/words/${l}.js`);
// Every data file, e.g. 'data/lexis/phrasal.js' (data/ is grouped into folders; nothing sits loose in data/ itself).
const dataFiles = () => fs.readdirSync(path.join(root, 'data'), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? fs.readdirSync(path.join(root, 'data', d.name)).map((f) => `data/${d.name}/${f}`) : [`data/${d.name}`]));

test('version is the same in app.js, sw.js and the README changelog', () => {
  const v = read('app.js').match(/const APP_VERSION = '([\d.]+)'/)[1];
  expect(read('sw.js')).toContain(`const VERSION = 'o3k-${v}'`);
  expect(read('README.md')).toContain(`| ${v} |`);
});

test('changelog.js lists every README version, newest first', () => {
  const CHANGELOG = [...load('data/app/changelog.js').CHANGELOG, ...load('data/app/changelog-old.js').CHANGELOG_OLD]; // newest rows + the archive (1.236)
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
  const seen = new Set(), exSeen = new Map(), bad = [];
  for (const r of WORDS) {
    const [w, p, lv, ipa, th, ex, exTh, tp] = r;
    const more = r.slice(8), xe = more.find(Array.isArray);
    if (more.length > 2 || more.some((x) => x !== 5 && x !== 'T' && x !== 'A' && x !== 'B' && x !== 'I' && x !== 'H' && x !== 'P' && x !== 'K' && x !== 'E' && x !== 'G' && x !== 'S' && x !== 'F' && x !== 'C' && x !== 'D' && x !== 'L' && x !== 'O' && x !== 'M' && x !== 'R' && x !== xe) || (more.length === 2 && ![5, 'T', 'A', 'B', 'I', 'H', 'P', 'K', 'E', 'G', 'S', 'F', 'C', 'D', 'L', 'O', 'M', 'R'].includes(more[0])) || more.filter((x) => !Array.isArray(x)).length > 1) bad.push(`${w}: ${r.length} fields`);
    if (xe) xe.forEach((x) => { if (!Array.isArray(x) || x.length !== 2 || !/^[A-Z0-9].*[.?!]$/.test(x[0]) || !x[1] || x[0] === ex) bad.push(`${w}: extra example ${JSON.stringify(x)}`); });
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${w}: level ${lv}`);
    Object.entries({ w, p, ipa, th, ex, exTh, tp }).forEach(([n, x]) => { if (typeof x !== 'string' || !x) bad.push(`${w}: empty ${n}`); });
    const k = `${w}|${p}`;
    if (seen.has(k)) bad.push(`duplicate ${k}`);
    seen.add(k);
    // 1.153.2: each word has its own example (29 pairs used to share one, e.g. "Can you swim?" for both can and swim)
    if (exSeen.has(ex)) bad.push(`${w}: same example as ${exSeen.get(ex)} ("${ex}")`);
    exSeen.set(ex, w);
  }
  expect(bad).toEqual([]);
});

test('TOEIC set (1.179): every row is marked T, credited CC BY-SA, and adds a word the 3000/5000 lists do not have', () => {
  const src = read('data/words/toeic.js');
  expect(src).toMatch(/CC BY-SA 4\.0/);
  expect(src).toMatch(/TOEIC Service List/);
  const t = { WORDS: [] };
  vm.runInNewContext(src, { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('toeic.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'T' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
});

test('academic set (1.180): every row is marked A, credited CC BY-SA, and adds a word no other list has', () => {
  const src = read('data/words/nawl.js');
  expect(src).toMatch(/CC BY-SA 4\.0/);
  expect(src).toMatch(/New Academic Word List/);
  const t = { WORDS: [] };
  vm.runInNewContext(src, { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(80);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('nawl.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'A' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
});

test('business set (1.195): every row is marked B, credited CC BY-SA, and adds a word no other list has', () => {
  const src = read('data/words/bsl.js');
  expect(src).toMatch(/CC BY-SA 4\.0/);
  expect(src).toMatch(/Business Service List/);
  const t = { WORDS: [] };
  vm.runInNewContext(src, { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(80);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('bsl.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'B' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
});

test('IT set (1.210): every row is marked I and adds a word no other list has', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/it.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/it.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'I' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
});

test('health set (1.215): every row is marked H and adds a word no other list has', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/health.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(150);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/health.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'H' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
});

test('politics set (1.237): every row is marked P, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/politics.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/politics.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'P' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // the games blank the word out of its example (fill-in-the-blank), so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('cooking set (1.238): every row is marked K, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/cooking.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/cooking.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'K' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('feelings set (1.239): every row is marked E, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/feelings.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/feelings.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'E' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z-]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('environment set (1.240): every row is marked G, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/environment.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/environment.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'G' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('social set (1.241): every row is marked S, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/social.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/social.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'S' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('sports set (1.242): every row is marked F, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/sports.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/sports.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'F' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('family set (1.243): every row is marked C, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/family.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/family.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'C' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('pets set (1.244): every row is marked D, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/pets.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(150);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/pets.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'D' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('beauty set (1.245): every row is marked L, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/beauty.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/beauty.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'L' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('space set (1.247): every row is marked O, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/space.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/space.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'O' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('entertainment set (1.248): every row is marked M, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/entertainment.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/entertainment.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'M' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('crime set (1.249): every row is marked R, adds a word no other list has, and its example uses the word', () => {
  const t = { WORDS: [] };
  vm.runInNewContext(read('data/words/crime.js'), { window: t });
  expect(t.WORDS.length).toBeGreaterThanOrEqual(200);
  const rest = new Set(load(...WORD_FILES.filter((f) => !f.endsWith('/crime.js'))).WORDS.map((r) => r[0].toLowerCase()));
  const bad = t.WORDS.filter((r) => r[8] !== 'R' || r.length !== 9 || rest.has(r[0].toLowerCase()) || !/^[a-z][a-z -]*$/.test(r[0])).map((r) => r[0]);
  expect(bad).toEqual([]);
  expect(t.WORDS.map((r) => r[0])).toEqual(t.WORDS.map((r) => r[0]).sort());
  // fill-in-the-blank games blank the word out of its example, so each sentence needs the word or a regular -s/-ed/-ing form
  const noWord = t.WORDS.filter(([w, , , , , ex]) => !new RegExp(`(^|[^a-z])${w}(s|es|d|ed|${w.slice(-1)}ed|ing|${w.slice(-1)}ing)?(?![a-z])`, 'i').test(ex)
    && !(/y$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ie(s|d)(?![a-z])`, 'i').test(ex))
    && !(/e$/.test(w) && new RegExp(`(^|[^a-z])${w.slice(0, -1)}ing(?![a-z])`, 'i').test(ex))).map((r) => r[0]);
  expect(noWord).toEqual([]);
});

test('word families are valid practice data', () => {
  const { FAMILIES } = load('data/lexis/families.js');
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
  const { CONFUSE, MINPAIRS } = load('data/lexis/pairs.js');
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
  const { COLLOC } = load('data/lexis/collocations.js');
  const { WORDS } = load(...WORD_FILES);
  const words = new Set(WORDS.map((r) => r[0]));
  for (const [k, list] of Object.entries(COLLOC)) {
    expect(words.has(k), k).toBe(true);
    list.forEach(([en, th]) => expect(en && th, k).toBeTruthy());
  }
});

test('stories: unique ids, count matches STORY_COUNT, questions point at an option', () => {
  const files = appCode().match(/const STORY_FILES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((x) => `data/stories/${x.slice(1, -1)}.js`);
  const { STORIES } = load(...files);
  const count = +appCode().match(/const STORY_COUNT = (\d+)/)[1];
  expect(STORIES.length).toBe(count);
  expect(new Set(STORIES.map((s) => s.id)).size).toBe(count);
  for (const s of STORIES) {
    expect(s.en.length, s.id).toBe(s.th.length);
    s.q.forEach((q) => expect(q.o[q.a], `${s.id}: ${q.q}`).toBeDefined());
    // 1.151: at least 5 questions per story, 3 distinct options each, no repeated question
    expect(s.q.length, `${s.id} questions`).toBeGreaterThanOrEqual(5);
    s.q.forEach((q) => expect(new Set(q.o).size, `${s.id}: ${q.q}`).toBe(3));
    expect(new Set(s.q.map((q) => q.q)).size, `${s.id} repeated question`).toBe(s.q.length);
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
  const { PHRASAL } = load('data/lexis/phrasal.js');
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
  const { SYNONYMS } = load('data/lexis/synonyms.js');
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
  const { AFFIXES } = load('data/lexis/affixes.js');
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

test('word roots (1.104): every example is a list word that contains its root; meanings and groups make a fair game', () => {
  const { ROOTS } = load('data/lexis/roots.js');
  const { WORDS } = load(...WORD_FILES);
  const have = new Set(WORDS.map((r) => r[0]));
  expect(ROOTS.length).toBeGreaterThan(20);
  const bad = [], meanings = new Set();
  for (const [x, th, grp, note, ex] of ROOTS) {
    if (!th || !grp || !note || ex.length < 3) bad.push(`${x}: meaning/group/note/examples`);
    if (meanings.has(th)) bad.push(`${x}: meaning ${th} twice`);
    meanings.add(th);
    ex.forEach((w) => {
      if (!have.has(w)) bad.push(`${x}: ${w} is not in the list`);
      if (!x.split('/').some((v) => w.toLowerCase().includes(v))) bad.push(`${x}: ${w} lacks the root`);
    });
    if (new Set(ex).size !== ex.length) bad.push(`${x}: duplicate example`);
  }
  // at least 4 groups, so every question has 3 distractors from other groups
  expect(new Set(ROOTS.map((r) => r[2])).size).toBeGreaterThanOrEqual(8);
  expect(bad).toEqual([]);
});

test('UK ↔ US pairs (1.104): both spellings differ, Thai given, kinds valid, spelling pairs share most letters', () => {
  const { UKUS } = load('data/lexis/ukus.js');
  expect(UKUS.length).toBeGreaterThan(60);
  const bad = [], seen = new Set();
  for (const [uk, us, th, k] of UKUS) {
    if (!uk || !us || uk === us || !th || !['w', 's'].includes(k)) bad.push(`${uk}/${us}`);
    if (k === 's' && uk[0] !== us[0]) bad.push(`${uk}/${us}: spelling pair should start alike`);
    if (seen.has(uk + '|' + us)) bad.push(`${uk}/${us} twice`);
    seen.add(uk + '|' + us);
  }
  expect(bad).toEqual([]);
});

test('emoji picture words: real list words, one word per emoji', () => {
  const { EMOJI } = load('data/fun/emoji.js');
  const words = new Set();
  WORD_FILES.forEach((f) => { const w = { WORDS: [] }; vm.runInNewContext(read(f), { window: w }); w.WORDS.forEach((r) => words.add(r[0])); });
  const entries = Object.entries(EMOJI), bad = [];
  expect(entries.length).toBeGreaterThan(200);
  const byEmoji = {};
  for (const [w, e] of entries) {
    if (!words.has(w)) bad.push(`${w}: not in the word list`);
    if (byEmoji[e]) bad.push(`${e} used for both ${byEmoji[e]} and ${w}`);
    byEmoji[e] = w;
  }
  expect(bad).toEqual([]);
});

test('idioms are valid practice data', () => {
  const { IDIOMS } = load('data/lexis/idioms.js');
  expect(IDIOMS.length).toBeGreaterThan(120);
  const seen = new Set(), th = new Set(), groups = {}, bad = [];
  for (const r of IDIOMS) {
    const [id, lv, t, ex, exTh, grp] = r;
    if (r.length < 5 || r.length > 6 || (r.length === 6 && !/^[a-z]+$/.test(grp))) bad.push(`${id}: fields`);
    if (seen.has(id)) bad.push(`duplicate ${id}`);
    if (th.has(t)) bad.push(`${id}: Thai meaning used twice`);
    seen.add(id); th.add(t);
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${id}: level ${lv}`);
    if (!t || !exTh) bad.push(`${id}: missing Thai`);
    if ((ex.match(/\[[^\]]+\]/g) || []).length !== 1) bad.push(`${id}: needs exactly one [idiom] in the example`);
    if (grp) groups[grp] = (groups[grp] || 0) + 1;
  }
  expect(bad).toEqual([]);
  // the biggest meaning group still leaves plenty of distractors
  expect(Math.max(...Object.values(groups))).toBeLessThan(IDIOMS.length - 10);
});

test('situations: key phrases, dialogues and unique lines', () => {
  const { SITUATIONS } = load('data/lexis/situations.js');
  expect(SITUATIONS.length).toBeGreaterThanOrEqual(15);
  const ids = new Set(), lines = new Set(), bad = [];
  for (const s of SITUATIONS) {
    if (ids.has(s.id)) bad.push(`duplicate ${s.id}`);
    ids.add(s.id);
    if (!s.icon || !s.th || !s.en || !s.tip) bad.push(`${s.id}: title/tip`);
    if (s.w.length < 8) bad.push(`${s.id}: fewer than 8 key phrases`);
    s.w.forEach((x) => { if (x.length !== 2 || !x[0] || !x[1]) bad.push(`${s.id}: phrase ${x}`); });
    if (s.d.length < 5) bad.push(`${s.id}: dialogue too short`);
    s.d.forEach((x) => {
      if (x.length !== 3 || !x.every(Boolean)) bad.push(`${s.id}: line ${x}`);
      if (lines.has(x[1])) bad.push(`${s.id}: line used twice: ${x[1]}`);
      lines.add(x[1]);
    });
  }
  expect(bad).toEqual([]);
});

test('goal tags only list words from the word list', () => {
  const { TAGS } = load('data/sets/tags.js');
  const { WORDS } = load(...WORD_FILES);
  const words = new Set(WORDS.map((r) => r[0]));
  expect(TAGS.length).toBeGreaterThanOrEqual(5);
  const ids = new Set(), bad = [];
  for (const t of TAGS) {
    if (ids.has(t.id) || !t.icon || !t.th || !t.note) bad.push(`${t.id}: id/icon/name`);
    ids.add(t.id);
    if (t.w.length < 60) bad.push(`${t.id}: only ${t.w.length} words`);
    if (new Set(t.w).size !== t.w.length) bad.push(`${t.id}: duplicate word`);
    t.w.forEach((w) => { if (!words.has(w)) bad.push(`${t.id}: ${w} is not a list word`); });
  }
  expect(bad).toEqual([]);
  expect(read('index.html').indexOf('data/sets/tags.js')).toBeLessThan(read('index.html').indexOf('app.js'));
});

test('service worker keeps word lists, stories and other content in the data cache', () => {
  const sw = read('sw.js'), data = sw.slice(sw.indexOf('const DATA = ['), sw.indexOf('];', sw.indexOf('const DATA = [')));
  const files = [...data.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  dataFiles().filter((f) => f !== 'data/app/changelog.js').forEach((f) => expect(files, f).toContain(f)); // every content file, in any folder
  ['app.js', 'index.html', 'data/app/changelog.js', 'config.js'].forEach((f) => expect(files, f).not.toContain(f)); // change every version
});

test('data/ is grouped into folders: no loose files, no stale entries in the service worker', () => {
  const entries = fs.readdirSync(path.join(root, 'data'), { withFileTypes: true });
  expect(entries.filter((d) => !d.isDirectory()).map((d) => d.name), 'loose files in data/ (put them in a folder)').toEqual([]);
  const sw = read('sw.js');
  const listed = [...sw.slice(0, sw.indexOf('const NAV_TIMEOUT')).matchAll(/^\s+'(data\/[^']+)',?$/gm)].map((m) => m[1]);
  const onDisk = new Set(dataFiles());
  expect(listed.filter((f) => !onDisk.has(f)), 'sw.js lists files that do not exist').toEqual([]);
  expect(listed.length, 'a file is listed twice in sw.js').toBe(new Set(listed).size);
});

test('offline (1.123): every data file the code loads lazily is cached by the service worker', () => {
  const sw = read('sw.js'), cached = new Set([...sw.matchAll(/^\s+'([^']+)',?$/gm)].map((m) => m[1]));
  const code = appCode();
  const used = new Set([...code.matchAll(/'(data\/[a-z0-9/]+\.js)/g)].map((m) => m[1]));
  ['lexis/collocations', 'lexis/pairs', 'lexis/families', 'app/guide', 'app/play'].forEach((f) => used.add(`data/${f}.js`));
  dataFiles().filter((f) => f.endsWith('.js')).forEach((f) => used.add(f)); // every data file, lazy or not
  const missing = [...used].filter((f) => f !== 'data/app/changelog.js' && !cached.has(f) && fs.existsSync(path.join(root, f)));
  expect(missing).toEqual([]);
});

test('every word row uses a topic id from TOPICS (and no retired id)', () => {
  const src = read('app.js');
  const block = src.slice(src.indexOf('const TOPICS = ['), src.indexOf('];', src.indexOf('const TOPICS = [')));
  const topics = [...block.matchAll(/\['(\w+)', '[^']+', '[^']+'\]/g)].map((m) => m[1]);
  expect(topics.length).toBe(35);
  const w = load(...WORD_FILES).WORDS;
  const bad = w.filter((r) => !topics.includes(r[7])).map((r) => `${r[0]}:${r[7]}`);
  expect(bad).toEqual([]);
  topics.forEach((t) => expect(w.some((r) => r[7] === t), t).toBe(true));
});

test('iOS splash images: every apple-touch-startup-image exists, light + dark, portrait + landscape', () => {
  const links = [...read('index.html').matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)">/g)];
  expect(links.length).toBe(24);
  links.forEach(([, f]) => expect(fs.existsSync(path.join(root, f)), f).toBe(true));
  ['light', 'dark', 'portrait', 'landscape'].forEach((k) => expect(links.filter((l) => l[2].includes(k)).length).toBe(12));
  // 1.146: iPad mini and iPad Air have their own launch images too
  ['(device-width: 744px) and (device-height: 1133px)', '(device-width: 820px) and (device-height: 1180px)', '(device-width: 1024px) and (device-height: 1366px)'].forEach((d) => expect(links.filter((l) => l[2].includes(d)).length, d).toBe(4));
});

test('icons are valid PNGs and stay small (lossless recompression, tools/optimize-icons.py)', () => {
  const sizes = { 'icon-512.png': [512, 120000], 'icon-maskable-512.png': [512, 120000], 'icon-192.png': [192, 30000], 'apple-touch-icon.png': [180, 30000] };
  for (const [f, [px, max]] of Object.entries(sizes)) {
    const b = fs.readFileSync(path.join(root, 'icons', f));
    expect(b.subarray(0, 8).toString('hex'), f).toBe('89504e470d0a1a0a');
    expect(b.readUInt32BE(16), f + ' width').toBe(px); expect(b.readUInt32BE(20), f + ' height').toBe(px);
    expect(b.length, f + ' size').toBeLessThan(max);
  }
});

test('irregular verbs are valid practice data', () => {
  const { IRREGULAR } = load('data/grammar/irregular.js');
  expect(IRREGULAR.length).toBeGreaterThan(100);
  const seen = new Set(), bad = [];
  IRREGULAR.forEach(([v1, v2, v3, th]) => {
    if (seen.has(v1)) bad.push(`${v1}: duplicate`); seen.add(v1);
    if (![v1, v2, v3, th].every((x) => typeof x === 'string' && x.length)) bad.push(`${v1}: empty field`);
    if (![v1, v2, v3].every((x) => /^[a-z]+( \/ [a-z]+)?$/.test(x))) bad.push(`${v1}: forms must be lowercase words (two forms only as "a / b")`);
    if (v1 === v2 && v2 === v3 && !['cut', 'hit', 'hurt', 'let', 'put', 'set', 'shut', 'cost', 'bet', 'quit', 'split', 'spread', 'burst', 'read'].includes(v1)) bad.push(`${v1}: same in all three`);
  });
  expect(bad).toEqual([]);
});

test('dependent prepositions are valid practice data', () => {
  const { DEPPREP } = load('data/grammar/depprep.js');
  expect(DEPPREP.length).toBeGreaterThan(90);
  const seen = new Set(), bad = [];
  const fine = {}; // head → every preposition that is listed or marked fine for it
  DEPPREP.forEach(([ph, lv, th, ex, exTh, ok]) => {
    const [head, prep, ...rest] = ph.split(' ');
    if (!head || !prep || rest.length) bad.push(`${ph}: must be "head preposition"`);
    if (seen.has(ph)) bad.push(`${ph}: duplicate`); seen.add(ph);
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${ph}: level ${lv}`);
    const groups = ex.match(/\[[^\]]+\]/g) || [];
    if (groups.length !== 1 || groups[0] !== `[${prep}]`) bad.push(`${ph}: example needs exactly one [${prep}]`);
    if (!new RegExp('\\b' + head, 'i').test(ex.replace(/[[\]]/g, ''))) bad.push(`${ph}: example must contain the head word`);
    if (!th || !exTh) bad.push(`${ph}: Thai missing`);
    (fine[head] = fine[head] || new Set()).add(prep);
    (ok || []).forEach((p) => fine[head].add(p));
  });
  const pool = ['in', 'on', 'at', 'of', 'to', 'for', 'with', 'about', 'from', 'by', 'into'];
  Object.entries(fine).forEach(([head, set]) => { if (pool.filter((p) => !set.has(p)).length < 3) bad.push(`${head}: fewer than 3 wrong options left`); });
  expect(bad).toEqual([]);
});

test('Thai-learner mistakes are valid practice data', () => {
  const { MISTAKES } = load('data/grammar/mistakes.js');
  expect(MISTAKES.length).toBeGreaterThan(55);
  const cats = ['prep', 'noun', 'article', 'verb', 'be', 'word', 'order'], seen = new Set(), bad = [];
  MISTAKES.forEach(([cat, ok, no, tip, th]) => {
    if (!cats.includes(cat)) bad.push(`${ok}: category ${cat}`);
    if (seen.has(ok)) bad.push(`${ok}: duplicate`); seen.add(ok);
    if (ok === no || ok.toLowerCase() === no.toLowerCase()) bad.push(`${ok}: wrong sentence is the same`);
    if (!/^[A-Z]/.test(ok) || !/^[A-Z]/.test(no) || !/[.?!]$/.test(ok) || !/[.?!]$/.test(no)) bad.push(`${ok}: sentences start with a capital and end with . ? !`);
    if (!/[฀-๿]/.test(tip) || !/[฀-๿]/.test(th)) bad.push(`${ok}: Thai tip and meaning needed`);
  });
  cats.forEach((c) => { if (!MISTAKES.some((r) => r[0] === c)) bad.push(`category ${c} is empty`); });
  expect(bad).toEqual([]);
});

test('grammar tied to words is valid practice data', () => {
  const { GRAMPAT } = load('data/grammar/grampat.js');
  expect(GRAMPAT.length).toBeGreaterThan(70);
  const kinds = ['u', 'ing', 'to', 'bare', 'both'], seen = new Set(), bad = [];
  GRAMPAT.forEach(([kind, head, th, frame, right, wrong, exTh]) => {
    const id = `${kind}:${head}`;
    if (!kinds.includes(kind)) bad.push(`${id}: kind`);
    if (seen.has(id)) bad.push(`${id}: duplicate`); seen.add(id);
    if (!th || !exTh) bad.push(`${id}: Thai missing`);
    if (kind === 'both') { if (right !== '' || wrong.length) bad.push(`${id}: reference rows have no options`); return; }
    if ((frame.match(/___/g) || []).length !== 1) bad.push(`${id}: frame needs exactly one ___`);
    if (wrong.length !== 2 || new Set([right, ...wrong]).size !== 3) bad.push(`${id}: needs the right form and two different wrong ones`);
    if (kind === 'u' && !right.toLowerCase().includes(head)) bad.push(`${id}: the right form contains the noun`);
    const shown = { deny: 'denied', make: 'made' }[head] || head.split(' ').pop().replace("can't", 'help');
    if (kind !== 'u' && !frame.toLowerCase().includes(shown)) bad.push(`${id}: frame shows the verb`);
  });
  ['u', 'ing', 'to', 'bare', 'both'].forEach((k) => { if (!GRAMPAT.some((r) => r[0] === k)) bad.push(`kind ${k} is empty`); });
  expect(bad).toEqual([]);
});

test('ready-made word sets (presets) are valid', () => {
  const { PRESETS } = load('data/sets/presets.js');
  const { WORDS } = load(...WORD_FILES);
  const words = new Set(WORDS.map((r) => r[0]));
  const low = new Set(WORDS.map((r) => r[0].toLowerCase()));
  expect(PRESETS.length).toBeGreaterThanOrEqual(17);
  const bad = [], ids = new Set();
  PRESETS.forEach((p) => {
    if (!/^[a-z0-9]{1,24}$/.test(p.id) || ids.has(p.id)) bad.push(`${p.id}: id`);
    ids.add(p.id);
    if (!p.icon || !p.name || p.name.length > 40 || !/[\u0E00-\u0E7F]/.test(p.sub || '')) bad.push(`${p.id}: icon / name ≤ 40 / Thai sub`);
    const ws = p.w.split('|');
    if (new Set(ws).size !== ws.length) bad.push(`${p.id}: duplicate word`);
    ws.forEach((w) => { if (!words.has(w)) bad.push(`${p.id}: ${w} is not a list word`); });
    (p.own || []).forEach(([w, t, e, et]) => {
      if (!/^[A-Za-z][A-Za-z' .-]*$/.test(w) || w.length > 40) bad.push(`${p.id}: own ${w} spelling`);
      if (low.has(w.toLowerCase())) bad.push(`${p.id}: own ${w} is a list word (put it in w)`);
      if (!/[\u0E00-\u0E7F]/.test(t) || t.length > 80) bad.push(`${p.id}: own ${w} Thai`);
      if (!e || e.length > 160 || !e.toLowerCase().includes(w.toLowerCase().split(' ')[0]) || !/[\u0E00-\u0E7F]/.test(et || '') || et.length > 160) bad.push(`${p.id}: own ${w} example`);
    });
    if (ws.length + (p.own || []).length < 25) bad.push(`${p.id}: fewer than 25 words`);
  });
  expect(bad).toEqual([]);
});

test('work email / chat phrases (1.199): known category, one [key], 3 distinct wrong keys, Thai and tip, no duplicates', () => {
  const { WORKPHR } = load('data/work/workphr.js');
  const cats = ['open', 'ask', 'follow', 'attach', 'meet', 'opinion', 'sorry', 'thanks', 'close', 'chat', 'call'];
  expect(WORKPHR.length).toBeGreaterThanOrEqual(60);
  const bad = [], seen = new Set(), n = {};
  WORKPHR.forEach(([cat, en, th, wrong, tip], i) => {
    const id = `#${i} ${en}`;
    n[cat] = (n[cat] || 0) + 1;
    if (!cats.includes(cat)) bad.push(`${id}: category ${cat}`);
    const keys = en.match(/\[([^\]]+)\]/g) || [];
    if (keys.length !== 1) bad.push(`${id}: needs exactly one [key]`);
    const key = keys.length ? keys[0].slice(1, -1) : '';
    if (!Array.isArray(wrong) || wrong.length !== 3 || new Set([key, ...wrong].map((x) => x.toLowerCase())).size !== 4) bad.push(`${id}: needs 3 different wrong keys`);
    if (!/[\u0E00-\u0E7F]/.test(th) || !/[\u0E00-\u0E7F]/.test(tip || '')) bad.push(`${id}: Thai meaning and tip`);
    if (seen.has(en) || seen.has(th)) bad.push(`${id}: duplicate phrase or meaning`);
    seen.add(en); seen.add(th);
  });
  cats.forEach((c) => { if ((n[c] || 0) < 5) bad.push(`category ${c} has ${n[c] || 0}`); });
  expect(bad).toEqual([]);
});

test('business collocations (1.200): known group, one [partner], one blank, the answer + 3 distinct wrong partners, Thai, no duplicates', () => {
  const { BIZCOL } = load('data/work/bizcol.js');
  expect(BIZCOL.length).toBeGreaterThanOrEqual(70);
  const bad = [], seen = new Set(), n = {};
  BIZCOL.forEach(([g, col, sent, ans, wrong, th, sth], i) => {
    const id = `#${i} ${col}`;
    n[g] = (n[g] || 0) + 1;
    if (!['v', 'a', 'n', 'p'].includes(g)) bad.push(`${id}: group ${g}`);
    if ((col.match(/\[[^\]]+\]/g) || []).length !== 1) bad.push(`${id}: needs one [partner]`);
    if ((sent.match(/___/g) || []).length !== 1) bad.push(`${id}: needs one ___`);
    if (!Array.isArray(wrong) || wrong.length !== 3 || new Set([ans, ...wrong].map((x) => x.toLowerCase())).size !== 4) bad.push(`${id}: answer + 3 different wrong partners`);
    if (!/[\u0E00-\u0E7F]/.test(th) || !/[\u0E00-\u0E7F]/.test(sth)) bad.push(`${id}: Thai`);
    if (seen.has(sent)) bad.push(`${id}: duplicate sentence`);
    seen.add(sent);
  });
  Object.entries(n).forEach(([g, k]) => { if (k < 5) bad.push(`group ${g} has ${k}`); });
  expect(bad).toEqual([]);
});

test('formal / casual lines (1.205): three different lines, Thai meaning and tip, no duplicates', () => {
  const { REGISTER } = load('data/work/register.js');
  expect(REGISTER.length).toBeGreaterThanOrEqual(30);
  const bad = [], seen = new Set();
  REGISTER.forEach(([f, c, b, th, tip], i) => {
    const id = `#${i} ${th}`;
    if (![f, c, b].every((x) => typeof x === 'string' && /[A-Za-z]/.test(x)) || new Set([f, c, b]).size !== 3) bad.push(`${id}: needs 3 different English lines`);
    if (!/[\u0E00-\u0E7F]/.test(th) || !/[\u0E00-\u0E7F]/.test(tip || '')) bad.push(`${id}: Thai`);
    [f, c, b, th].forEach((x) => { if (seen.has(x)) bad.push(`${id}: duplicate ${x}`); seen.add(x); });
  });
  expect(bad).toEqual([]);
});

test('build-an-email data (1.206): 5 parts in slot order, 3 distinct options each, Thai, unique ids', () => {
  const { EMAILS } = load('data/work/emails.js');
  expect(EMAILS.length).toBeGreaterThanOrEqual(10);
  const bad = [], ids = new Set(), order = ['greet', 'open', 'body', 'ask', 'close'];
  EMAILS.forEach((d) => {
    if (!d.id || ids.has(d.id)) bad.push(`${d.id}: id`); ids.add(d.id);
    if (!['f', 'c'].includes(d.to) || !/[\u0E00-\u0E7F]/.test(d.who + d.sit)) bad.push(`${d.id}: to / Thai reader and situation`);
    if (d.p.map((x) => x[0]).join() !== order.join()) bad.push(`${d.id}: slots`);
    d.p.forEach(([slot, right, wrong, th]) => {
      if (!Array.isArray(wrong) || wrong.length !== 2 || new Set([right, ...wrong]).size !== 3) bad.push(`${d.id}/${slot}: right + 2 different wrong`);
      if (!/[\u0E00-\u0E7F]/.test(th)) bad.push(`${d.id}/${slot}: Thai`);
    });
  });
  expect(bad).toEqual([]);
});

test('real-life texts are valid practice data', () => {
  const { REALTEXT } = load('data/lexis/realtext.js');
  const { WORDS } = load(...WORD_FILES);
  const words = new Set(WORDS.map((r) => r[0]));
  expect(REALTEXT.length).toBeGreaterThanOrEqual(70);
  const kinds = {}, bad = [], texts = new Set();
  REALTEXT.forEach(([kind, sit, text, right, wrong, th, lemma], i) => {
    const id = `#${i} ${right}`;
    kinds[kind] = (kinds[kind] || 0) + 1;
    if (!['sign', 'announce', 'menu', 'bill', 'label', 'notice', 'plan'].includes(kind)) bad.push(`${id}: kind ${kind}`);
    if (!sit || !th || !/[\u0E00-\u0E7F]/.test(th)) bad.push(`${id}: needs a Thai situation and translation`);
    if ((text.match(/___/g) || []).length !== 1) bad.push(`${id}: needs exactly one ___`);
    if (!Array.isArray(wrong) || wrong.length !== 3 || new Set([right, ...wrong].map((x) => x.toLowerCase())).size !== 4) bad.push(`${id}: needs the answer + 3 different wrong words`);
    if (!words.has((lemma || right).toLowerCase())) bad.push(`${id}: ${lemma || right} is not a list word (give the list word as the 7th field)`);
    if (lemma && !words.has(lemma)) bad.push(`${id}: lemma ${lemma}`);
    if (texts.has(text)) bad.push(`${id}: duplicate text`);
    texts.add(text);
    if (text.includes('Oxford')) bad.push(`${id}: no Oxford in app text`);
  });
  Object.entries(kinds).forEach(([k, n]) => { if (n < 8) bad.push(`kind ${k} has only ${n}`); });
  expect(Object.keys(kinds).length).toBe(7);
  expect(bad).toEqual([]);
});

test('TOEIC Part 5 questions (1.183): one blank, the answer + 3 different options, valid type, Thai and tip, no duplicates', () => {
  const { TOEICP5 } = load('data/toeic/toeicp5.js');
  expect(TOEICP5.length).toBeGreaterThanOrEqual(60);
  const bad = [], seen = new Set(), types = {};
  TOEICP5.forEach(([type, text, right, wrong, th, tip], i) => {
    const id = `#${i} ${text}`;
    types[type] = (types[type] || 0) + 1;
    if (!['form', 'vocab', 'gram'].includes(type)) bad.push(`${id}: type ${type}`);
    if ((text.match(/___/g) || []).length !== 1) bad.push(`${id}: needs exactly one ___`);
    if (!Array.isArray(wrong) || wrong.length !== 3 || new Set([right, ...wrong].map((x) => x.toLowerCase())).size !== 4) bad.push(`${id}: answer + 3 different wrong options`);
    if (!th || !tip || !/[ก-๙]/.test(th) || !/[ก-๙]/.test(tip)) bad.push(`${id}: Thai translation and tip`);
    if (!/^[A-Z_].*[.?!]$/.test(text)) bad.push(`${id}: a full sentence`);
    if (seen.has(text)) bad.push(`${id}: duplicate`);
    seen.add(text);
  });
  Object.entries(types).forEach(([k, n]) => { if (n < 12) bad.push(`type ${k} has only ${n}`); });
  expect(Object.keys(types).length).toBe(3);
  expect(bad).toEqual([]);
});

test('TOEIC Part 7 texts (1.184): known kind, Thai summary, 2–4 questions with 4 distinct options and a valid answer', () => {
  const { TOEICP7 } = load('data/toeic/toeicp7.js');
  expect(TOEICP7.length).toBeGreaterThanOrEqual(15);
  const kinds = ['email', 'notice', 'ad', 'memo', 'chat', 'invoice', 'schedule', 'article', 'review'], ids = new Set(), bad = [];
  let n = 0;
  TOEICP7.forEach((d) => {
    if (!d.id || ids.has(d.id)) bad.push(`id ${d.id}`);
    ids.add(d.id);
    if (!kinds.includes(d.kind)) bad.push(`${d.id}: kind ${d.kind}`);
    if (!d.title || !d.text || d.text.length < 150 || !/[ก-๙]/.test(d.th || '')) bad.push(`${d.id}: title, text and Thai summary`);
    if (!Array.isArray(d.q) || d.q.length < 2 || d.q.length > 4) bad.push(`${d.id}: 2–4 questions`);
    (d.q || []).forEach(([q, opts, a, th], k) => {
      n++;
      if (!/[?]$|to$|of$/.test(q)) bad.push(`${d.id} q${k}: question form`);
      if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts.map((o) => o.toLowerCase())).size !== 4) bad.push(`${d.id} q${k}: 4 distinct options`);
      if (!(a >= 0 && a < 4)) bad.push(`${d.id} q${k}: answer index`);
      if (!/[ก-๙]/.test(th || '')) bad.push(`${d.id} q${k}: Thai explanation`);
    });
  });
  expect(n).toBeGreaterThanOrEqual(45);
  expect(bad).toEqual([]);
});

test('TOEIC Part 1 scenes (1.189): emoji scene, 4 distinct statements, a valid answer, Thai and tip', () => {
  const { TOEICP1 } = load('data/toeic/toeicp1.js');
  expect(TOEICP1.length).toBeGreaterThanOrEqual(25);
  const bad = [], seen = new Set();
  TOEICP1.forEach(([scene, place, opts, a, th, tip], i) => {
    const id = `#${i} ${scene}`;
    if (!scene || /[a-zA-Z0-9ก-๙]/.test(scene) || seen.has(scene)) bad.push(`${id}: emoji-only, unique scene`);
    seen.add(scene);
    if (!/[ก-๙]/.test(place || '') || !/[ก-๙]/.test(th || '') || !/[ก-๙]/.test(tip || '')) bad.push(`${id}: Thai place, translation and tip`);
    if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts.map((o) => o.toLowerCase())).size !== 4) bad.push(`${id}: 4 distinct statements`);
    if ((opts || []).some((o) => !/^[A-Z].*\.$/.test(o))) bad.push(`${id}: statements are sentences`);
    if (!(a >= 0 && a < 4)) bad.push(`${id}: answer index`);
  });
  expect(bad).toEqual([]);
});

test('TOEIC Part 2 items (1.186): known type, question, 3 distinct responses, Thai and tip, every type used', () => {
  const { TOEICP2 } = load('data/toeic/toeicp2.js');
  expect(TOEICP2.length).toBeGreaterThanOrEqual(50);
  const bad = [], seen = new Set(), types = {};
  TOEICP2.forEach(([type, q, right, wrong, th, tip], i) => {
    const id = `#${i} ${q}`;
    types[type] = (types[type] || 0) + 1;
    if (!['wh', 'yn', 'choice', 'request', 'statement', 'neg'].includes(type)) bad.push(`${id}: type ${type}`);
    if (!/^[A-Z].*[.?!]$/.test(q) || !/^[A-Z].*[.?!]$/.test(right)) bad.push(`${id}: full sentences`);
    if (!Array.isArray(wrong) || wrong.length !== 2 || new Set([right, ...wrong].map((x) => x.toLowerCase())).size !== 3) bad.push(`${id}: answer + 2 different wrong responses`);
    if (!/[ก-๙]/.test(th || '') || !/[ก-๙]/.test(tip || '')) bad.push(`${id}: Thai and tip`);
    if (seen.has(q)) bad.push(`${id}: duplicate`);
    seen.add(q);
  });
  Object.entries(types).forEach(([k, n]) => { if (n < 6) bad.push(`type ${k} has only ${n}`); });
  expect(Object.keys(types).length).toBe(6);
  expect(bad).toEqual([]);
});

for (const [part, min] of [[3, 2], [4, 1]]) {
  test(`TOEIC Part ${part} recordings (1.187): speakers, Thai summary, 3 questions with 4 distinct options and Thai`, () => {
    const rows = load(`data/toeic/toeicp${part}.js`)['TOEICP' + part];
    expect(rows.length).toBeGreaterThanOrEqual(10);
    const kinds = ['office', 'phone', 'shop', 'hotel', 'restaurant', 'travel', 'announce', 'voicemail', 'tour', 'radio', 'meeting', 'ad'], ids = new Set(), bad = [];
    rows.forEach((d) => {
      if (!/^[a-z0-9]+$/.test(d.id || '') || ids.has(d.id)) bad.push(`id ${d.id}`);
      ids.add(d.id);
      if (!kinds.includes(d.kind)) bad.push(`${d.id}: kind ${d.kind}`);
      if (!/[ก-๙]/.test(d.th || '')) bad.push(`${d.id}: Thai summary`);
      const who = new Set((d.lines || []).map(([s]) => s));
      if ([...who].some((s) => !['M', 'W', 'M2', 'W2'].includes(s))) bad.push(`${d.id}: speaker codes`);
      if (part === 4 ? who.size !== 1 : who.size < 2 || who.size > 3) bad.push(`${d.id}: ${who.size} speakers`);
      if ((d.lines || []).length < 3 || d.lines.some(([, t]) => !/^[A-Z].*[.?!]$/.test(t))) bad.push(`${d.id}: lines`);
      if (!Array.isArray(d.q) || d.q.length !== 3) bad.push(`${d.id}: 3 questions`);
      (d.q || []).forEach(([q, opts, a, th], k) => {
        if (!/\?$/.test(q)) bad.push(`${d.id} q${k}: question`);
        if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts.map((o) => o.toLowerCase())).size !== 4) bad.push(`${d.id} q${k}: 4 distinct options`);
        if (!(a >= 0 && a < 4)) bad.push(`${d.id} q${k}: answer index`);
        if (!/[ก-๙]/.test(th || '')) bad.push(`${d.id} q${k}: Thai explanation`);
      });
    });
    expect(min).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
}

test('TOEIC Part 6 texts (1.185): blanks [1]–[4] in order, 4 distinct options each, a sentence blank, Thai summary and explanations', () => {
  const { TOEICP6 } = load('data/toeic/toeicp6.js');
  expect(TOEICP6.length).toBeGreaterThanOrEqual(10);
  const kinds = ['email', 'notice', 'ad', 'memo', 'chat', 'invoice', 'schedule', 'article', 'review'], ids = new Set(), bad = [];
  TOEICP6.forEach((d) => {
    if (!d.id || ids.has(d.id)) bad.push(`id ${d.id}`);
    ids.add(d.id);
    if (!kinds.includes(d.kind)) bad.push(`${d.id}: kind ${d.kind}`);
    if (!d.title || !d.text || d.text.length < 200 || !/[ก-๙]/.test(d.th || '')) bad.push(`${d.id}: title, text and Thai summary`);
    const marks = (d.text.match(/\[\d\]/g) || []).join('');
    if (marks !== '[1][2][3][4]' || !Array.isArray(d.q) || d.q.length !== 4) bad.push(`${d.id}: blanks [1]–[4] once each, 4 questions`);
    let sentence = 0;
    (d.q || []).forEach(([opts, a, th], k) => {
      if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts.map((o) => o.toLowerCase())).size !== 4) bad.push(`${d.id} q${k}: 4 distinct options`);
      if (!(a >= 0 && a < 4)) bad.push(`${d.id} q${k}: answer index`);
      if (!/[ก-๙]/.test(th || '')) bad.push(`${d.id} q${k}: Thai explanation`);
      if ((opts || []).every((o) => /^[A-Z].*[.!?]$/.test(o) && o.split(' ').length >= 4)) sentence++;
    });
    if (!sentence) bad.push(`${d.id}: needs a sentence blank`);
  });
  expect(bad).toEqual([]);
});

test('phrase books (1.212+): rows [cat, English, Thai, example, Thai example, note], unique English, every category known', () => {
  const src = read('js/phrasebook.js');
  const books = [...src.matchAll(/^  (\w+): \{\r?\n    file: '([^']+)', key: '(\w+)'/gm)].map((m) => m.slice(1));
  expect(books.length).toBeGreaterThanOrEqual(1);
  const bad = [];
  for (const [id, file, key] of books) {
    const rows = load(file)[key], cats = src.slice(src.indexOf(`  ${id}: {`)).match(/cats: \{([^}]*)\}/)[1];
    if (!(rows.length >= 30)) bad.push(`${id}: only ${rows.length} rows`);
    const seen = new Set();
    rows.forEach((r, i) => {
      const head = src.slice(src.indexOf(`  ${id}: {`), src.indexOf(`  ${id}: {`) + 400), fill = /\n    file: [^\n]*fill: true/.test(head), say = /\n    file: [^\n]*say: true/.test(head);
      if (say && new Set(r[5].split('|')).size !== 4) bad.push(`${id} ${r[1]}: needs 1 right + 3 wrong readings`);
      if (r.length !== (fill || say ? 7 : 6) || r.slice(0, 5).some((x) => typeof x !== 'string' || !x.trim())) bad.push(`${id} ${i}: shape`);
      if (fill) { // one [part] in the phrase and the example, 3 wrong forms that differ from the answer
        const ans = (r[3].match(/\[([^\]]+)\]/) || [])[1], wr = r[5].split('|');
        if ((r[1].match(/\[/g) || []).length !== 1 || !ans || (r[3].match(/\[/g) || []).length !== 1 || wr.length !== 3 || new Set(wr).size !== 3 || wr.includes(ans)) bad.push(`${id} ${r[1]}: fill parts`);
        r = [r[0], r[1].replace(/[[\]]/g, ''), r[2], r[3].replace(/[[\]]/g, '')];
      }
      if (!cats.includes(`${r[0]}:`)) bad.push(`${id} ${i}: category ${r[0]}`);
      if (seen.has(r[1].toLowerCase())) bad.push(`${id}: ${r[1]} twice`);
      seen.add(r[1].toLowerCase());
      if (!/[.?!)]$/.test(r[3])) bad.push(`${id} ${r[1]}: example should end a sentence`);
    });
    expect(read('sw.js')).toContain(`'${file}'`);
  }
  expect(bad).toEqual([]);
});

test('role play (1.232): scenes of 5 steps, a reply and 2 different wrong ones, unique ids', () => {
  const { ROLEPLAY } = load('data/phrasebook/roleplay.js');
  expect(ROLEPLAY.length).toBeGreaterThanOrEqual(8);
  const bad = [];
  expect(new Set(ROLEPLAY.map((d) => d.id)).size).toBe(ROLEPLAY.length);
  ROLEPLAY.forEach((d) => {
    if (!d.icon || !d.title || !d.who || !d.you || d.steps.length < 4) bad.push(`${d.id}: shape`);
    d.steps.forEach((s, k) => { if (s.length !== 6 || s.slice(0, 3).concat(s.slice(4)).some((x) => typeof x !== 'string' || !x) || s[3].length !== 2 || new Set([s[2], ...s[3]]).size !== 3) bad.push(`${d.id} ${k}`); });
  });
  expect(bad).toEqual([]);
});

test('the manual states the real number of games', () => {
  const games = read('js/games.js'), body = games.slice(games.indexOf('const GAMES = {'));
  const n = (body.slice(0, body.indexOf('\n};')).match(/^  [a-zA-Z0-9]+: \{/gm) || []).length;
  expect(n).toBeGreaterThan(30);
  expect(read('data/app/guide.js')).toContain(`เกมทั้ง ${n} แบบ`);
});

test('content security policy: the inline theme script is allowed by hash, and nothing else inline is', () => {
  const html = read('index.html');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  expect(inline.length).toBe(1);
  const hash = require('crypto').createHash('sha256').update(inline[0]).digest('base64');
  expect(csp).toContain(`'sha256-${hash}'`);
  expect(csp).toMatch(/object-src 'none'/);
  expect(csp).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  expect(html).not.toMatch(/\son[a-z]+="/); // no inline event handlers
});

test('the reminder edge function only answers the cron job (service-role key)', () => {
  const src = read('supabase/functions/daily-reminder/index.ts');
  expect(src).toContain("req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`");
  expect(src.indexOf('forbidden')).toBeLessThan(src.indexOf(".from('push_subs')"));
});


// 1.233.0: size budget for the files every app start loads (the word lists and lazy-loaded data are not counted). Growing past
// a limit is a hint to move the new part into its own file (lazy-loaded where it can be, like data/app/play.js and data/app/guide.js).
test('files loaded at every start stay within their size budget', () => {
  const size = (f) => fs.statSync(path.join(root, f)).size;
  const eager = [...read('index.html').matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]).filter((f) => !f.startsWith('data/words/'));
  const over = [];
  const budget = (f, kb) => { if (size(f) > kb * 1024) over.push(`${f} ${Math.round(size(f) / 1024)} KB > ${kb} KB`); };
  budget('app.js', 210); budget('style.css', 330);
  for (const f of eager) if (f.startsWith('js/')) budget(f, 125);
  const total = eager.reduce((a, f) => a + size(f), 0);
  if (total > 1500 * 1024) over.push(`all start-up scripts ${Math.round(total / 1024)} KB > 1500 KB`);
  expect(over).toEqual([]);
});

// 1.250: the extra word groups are one table (GROUPS_X in app.js); every row needs its word file, colour token and rows with its mark.
test('GROUPS_X table matches the word files and styles', () => {
  const src = read('js/groups.js'), m = /const GROUPS_X = (\[[\s\S]*?\])\.map/.exec(src);
  const rows = vm.runInNewContext(m[1]), css = read('style.css'), sw = read('sw.js'), html = read('index.html');
  expect(new Set(rows.map((r) => r[0])).size).toBe(rows.length);
  expect(new Set(rows.map((r) => r[1])).size).toBe(rows.length);
  expect(html.indexOf('js/groups.js')).toBeGreaterThan(html.indexOf('data/words/c1.js'));
  expect(html.indexOf('js/groups.js')).toBeLessThan(html.indexOf('"app.js"'));
  for (const [g, mark, , , , file, , n] of rows) {
    const f = `data/words/${file}.js`;
    expect(fs.existsSync(path.join(root, f)), f).toBe(true);
    expect(sw).toContain(`'${f}'`);
    expect(css, g).toContain(`--${g.toLowerCase()}:`);
    const w = load(f).WORDS;
    expect(w.length, f).toBe(n);
    expect(w.every((r) => r.slice(8).includes(mark)), f).toBe(true);
    expect(html, f).not.toContain(f); // loaded by js/groups.js (1.251)
  }
});
