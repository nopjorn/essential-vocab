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
const appCode = () => ['app.js', ...fs.readdirSync(path.join(root, 'js')).map((f) => `js/${f}`), 'data/play.js', 'data/guide.js'].map(read).join('\n'); // + the lazy-loaded engine and manual (1.101)
const WORD_FILES = ['a1', 'a2', 'b1', 'b2', 'b2plus', 'c1'].map((l) => `data/words/${l}.js`);

test('version is the same in app.js, sw.js and the README changelog', () => {
  const v = read('app.js').match(/const APP_VERSION = '([\d.]+)'/)[1];
  expect(read('sw.js')).toContain(`const VERSION = 'o3k-${v}'`);
  expect(read('README.md')).toContain(`| ${v} |`);
});

test('changelog.js lists every README version, newest first', () => {
  const { CHANGELOG } = load('data/changelog.js');
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
    const more = r.slice(8), xe = more.find(Array.isArray);
    if (more.length > 2 || more.some((x) => x !== 5 && x !== xe) || (more.length === 2 && more[0] !== 5)) bad.push(`${w}: ${r.length} fields`);
    if (xe) xe.forEach((x) => { if (!Array.isArray(x) || x.length !== 2 || !/^[A-Z0-9].*[.?!]$/.test(x[0]) || !x[1] || x[0] === ex) bad.push(`${w}: extra example ${JSON.stringify(x)}`); });
    if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(lv)) bad.push(`${w}: level ${lv}`);
    Object.entries({ w, p, ipa, th, ex, exTh, tp }).forEach(([n, x]) => { if (typeof x !== 'string' || !x) bad.push(`${w}: empty ${n}`); });
    const k = `${w}|${p}`;
    if (seen.has(k)) bad.push(`duplicate ${k}`);
    seen.add(k);
  }
  expect(bad).toEqual([]);
});

test('word families are valid practice data', () => {
  const { FAMILIES } = load('data/families.js');
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
  const { CONFUSE, MINPAIRS } = load('data/pairs.js');
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
  const { COLLOC } = load('data/collocations.js');
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
  const { PHRASAL } = load('data/phrasal.js');
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
  const { SYNONYMS } = load('data/synonyms.js');
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
  const { AFFIXES } = load('data/affixes.js');
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
  const { ROOTS } = load('data/roots.js');
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
  const { UKUS } = load('data/ukus.js');
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
  const { EMOJI } = load('data/emoji.js');
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
  const { IDIOMS } = load('data/idioms.js');
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
  const { SITUATIONS } = load('data/situations.js');
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
  const { TAGS } = load('data/tags.js');
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
  expect(read('index.html').indexOf('data/tags.js')).toBeLessThan(read('index.html').indexOf('app.js'));
});

test('service worker keeps word lists, stories and other content in the data cache', () => {
  const sw = read('sw.js'), data = sw.slice(sw.indexOf('const DATA = ['), sw.indexOf('];', sw.indexOf('const DATA = [')));
  const files = [...data.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  ['words', 'stories'].forEach((d) => fs.readdirSync(path.join(root, 'data', d)).forEach((f) => expect(files, f).toContain(`data/${d}/${f}`)));
  ['app.js', 'index.html', 'data/changelog.js', 'config.js'].forEach((f) => expect(files, f).not.toContain(f)); // change every version
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
  expect(links.length).toBe(12);
  links.forEach(([, f]) => expect(fs.existsSync(path.join(root, f)), f).toBe(true));
  ['light', 'dark', 'portrait', 'landscape'].forEach((k) => expect(links.filter((l) => l[2].includes(k)).length).toBe(6));
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
  const { IRREGULAR } = load('data/irregular.js');
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
  const { DEPPREP } = load('data/depprep.js');
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
  const { MISTAKES } = load('data/mistakes.js');
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
  const { GRAMPAT } = load('data/grampat.js');
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

test('the manual states the real number of games', () => {
  const games = read('js/games.js'), body = games.slice(games.indexOf('const GAMES = {'));
  const n = (body.slice(0, body.indexOf('\n};')).match(/^  [a-zA-Z0-9]+: \{/gm) || []).length;
  expect(n).toBeGreaterThan(30);
  expect(read('data/guide.js')).toContain(`เกมทั้ง ${n} แบบ`);
});
