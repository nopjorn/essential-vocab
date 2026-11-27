// Balanced CI parts (1.264.6; by test name since 1.264.7). Playwright's own --shard cuts the test list into equal counts in
// file order, so heavy files bunched up (1.264.5: the parts took 69–114 s). Here every test gets its time from
// tests/durations.json (rebuild it with tools/test-durations.js now and then; a test not in it counts as the median) and
// the tests are dealt out longest first, each to the part with the least time so far. A part picks its tests with --grep
// on their full names (file, describe, title), so the tests a loop makes on one line can go to different parts.
// Every part works this out from the same list, so together they run each test exactly once (data.spec checks that
// with Playwright itself). Files in ELSEWHERE are left out: CI runs them in a job of their own.
//   node tests/shard.js run <part> <parts> [more playwright args]   run one part (CI; works the same in PowerShell)
//   node tests/shard.js plan <parts>                                 print the split
//   node tests/shard.js json <parts>                                 every part's --grep pattern, as JSON
const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const [mode, ...rest] = process.argv.slice(2);
const part = mode === 'run' ? Number(rest.shift()) : 0, parts = Number(rest.shift());
if (!['run', 'plan', 'json'].includes(mode) || !(parts >= 1) || (mode === 'run' && !(part >= 1 && part <= parts))) {
  console.error('usage: node tests/shard.js run <part> <parts> [args]  |  plan <parts>  |  json <parts>');
  process.exit(2);
}
const cli = path.join(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
const list = JSON.parse(execFileSync(process.execPath, [cli, 'test', '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
const dur = require('./durations.json');
const known = Object.values(dur).sort((x, y) => x - y), median = known[known.length >> 1] || 1;

// Playwright matches --grep against "<project> <file> <describe…> <title>" (no project name here, so it starts with spaces).
const tests = [];
let guessed = 0;
const walk = (suite, file, titles) => {
  for (const spec of suite.specs || []) {
    const t = dur[`tests/${file} › ${[...titles, spec.title].join(' › ')}`];
    if (t === undefined) guessed++;
    tests.push({ name: [file, ...titles, spec.title].join(' '), sec: (t === undefined ? median : t) * spec.tests.length });
  }
  for (const child of suite.suites || []) walk(child, file, [...titles, child.title]);
};
// 1.264.8: data.spec runs in test.yml's "data" job beside the parts (no browser and no fonts needed). Its check of these
// parts starts 17 Playwright processes at once, which slowed the 3 other workers of whichever part it landed in.
const ELSEWHERE = ['data.spec.js'];
for (const file of list.suites) if (!ELSEWHERE.includes(file.title)) walk(file, file.title, []);

const bins = Array.from({ length: parts }, () => ({ sec: 0, names: [] }));
for (const t of tests.sort((x, y) => y.sec - x.sec || (x.name < y.name ? -1 : 1))) {
  const bin = bins.reduce((best, x) => (x.sec < best.sec ? x : best), bins[0]);
  bin.sec += t.sec; bin.names.push(t.name);
}
if (bins.some((x) => !x.names.length)) { console.error(`shard.js: more parts (${parts}) than tests`); process.exit(1); } // an empty pattern would run everything
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const grep = (x) => `/(?:^|\\s)(?:${x.names.sort().map(esc).join('|')})$/`; // /…/ form: case-sensitive (a bare pattern gets "gi")
const line = (x, i) => `part ${i + 1}/${parts}: ${x.names.length} tests, ~${Math.round(x.sec)} s of test time`;
if (mode === 'json') { console.log(JSON.stringify(bins.map(grep))); process.exit(0); }
if (mode === 'plan') {
  bins.forEach((x, i) => console.log(line(x, i)));
  console.log(`${tests.length} tests, ${guessed} without a time in tests/durations.json (counted as ${median} s)`);
  process.exit(0);
}
const mine = bins[part - 1];
console.log(`${line(mine, part - 1)} (${guessed} of ${tests.length} tests without a time)`);
const r = spawnSync(process.execPath, [cli, 'test', '--grep', grep(mine), ...rest], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
