// Balanced CI parts (1.264.6): `node tests/shard.js <part> <parts>` prints the test locations (file:line) of one part.
// Playwright's own --shard cuts the test list into equal counts in file order, so heavy files bunched up (1.264.5: the
// parts took 69–114 s). Here every location gets its time from tests/durations.json (rebuild it with
// tools/test-durations.js now and then; a test not in it counts as the median), and the locations are dealt out longest
// first, each to the part with the least time so far. Every part works this out from the same list, so together the
// parts run each test exactly once (data.spec checks that with Playwright itself). `node tests/shard.js plan <parts>` prints
// the whole split; `node tests/shard.js json <parts>` prints every part's locations as JSON (for that check).
const { execFileSync } = require('child_process');
const path = require('path');

const [a, b] = process.argv.slice(2);
const parts = Number(b), part = a === 'plan' || a === 'json' ? 0 : Number(a);
if (!(parts >= 1 && part >= 0 && part <= parts)) {
  console.error('usage: node tests/shard.js <part> <parts>  |  node tests/shard.js plan|json <parts>');
  process.exit(2);
}
const cli = path.join(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
const list = JSON.parse(execFileSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
const dur = require('./durations.json');
const known = Object.values(dur).sort((x, y) => x - y), median = known[known.length >> 1] || 1;

// One unit per location: tests made in a loop share their line (responsive.spec's sizes), so they go together.
const units = new Map();
let total = 0, guessed = 0;
const walk = (suite, titles) => {
  for (const spec of suite.specs || []) {
    const loc = `tests/${spec.file}:${spec.line}`;
    const u = units.get(loc) || units.set(loc, { loc, sec: 0, n: 0 }).get(loc);
    const t = dur[`tests/${spec.file} › ${[...titles, spec.title].join(' › ')}`];
    if (t === undefined) guessed += spec.tests.length;
    u.sec += (t === undefined ? median : t) * spec.tests.length;
    u.n += spec.tests.length; total += spec.tests.length;
  }
  for (const child of suite.suites || []) walk(child, [...titles, child.title]);
};
for (const file of list.suites) walk(file, []);

const bins = Array.from({ length: parts }, () => ({ sec: 0, n: 0, locs: [] }));
for (const u of [...units.values()].sort((x, y) => y.sec - x.sec || (x.loc < y.loc ? -1 : 1))) {
  const bin = bins.reduce((best, x) => (x.sec < best.sec ? x : best), bins[0]);
  bin.sec += u.sec; bin.n += u.n; bin.locs.push(u.loc);
}
if (bins.reduce((s, x) => s + x.n, 0) !== total) throw new Error('shard.js: the parts do not add up to the test list');
const line = (x, i) => `part ${i + 1}/${parts}: ${x.n} tests, ~${Math.round(x.sec)} s of test time`;
if (a === 'json') { console.log(JSON.stringify(bins.map((x) => x.locs.sort()))); process.exit(0); }
if (!part) {
  bins.forEach((x, i) => console.log(line(x, i)));
  console.log(`${total} tests, ${guessed} without a time in tests/durations.json (counted as ${median} s)`);
  process.exit(0);
}
const mine = bins[part - 1];
if (!mine.locs.length) { console.error(`shard.js: part ${part}/${parts} got no tests`); process.exit(1); } // an empty list would run everything
console.error(`${line(mine, part - 1)} (${guessed} of ${total} tests without a time)`);
console.log(mine.locs.sort().join('\n'));
