// Rebuilds tests/durations.json (1.264.6) from the log of a GitHub Actions "Tests" run:
//   node tools/test-durations.js [run id]     (default: the newest successful run on master)
// Needs the gh CLI signed in. tests/shard.js uses the times to give each CI part the same amount of work, so rebuild it
// now and then (after adding many tests, or when the parts drift apart in the run summary); stale times only cost balance.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 256 << 20 });
let id = process.argv[2];
if (!id) id = JSON.parse(gh(['run', 'list', '--workflow=Tests', '--branch=master', '--status=success', '--limit=1', '--json', 'databaseId']))[0].databaseId;
const out = {};
for (const line of gh(['run', 'view', String(id), '--log']).split(/\r?\n/)) {
  // list reporter: "  ✓  62 tests/features.spec.js:2094:1 › story quiz (1.151): … (11.2s)"
  const m = /[✓✘]\s+\d+\s+(tests\/[^:\s]+):\d+:\d+ › (.*) \(([\d.]+)(ms|s|m)\)\s*$/.exec(line);
  if (!m) continue;
  const sec = m[4] === 'ms' ? m[3] / 1000 : m[4] === 'm' ? m[3] * 60 : +m[3];
  out[`${m[1]} › ${m[2]}`] = Math.round(sec * 10) / 10;
}
const keys = Object.keys(out).sort();
if (keys.length < 100) throw new Error(`only ${keys.length} test times found in run ${id}`);
const file = path.join(__dirname, '..', 'tests', 'durations.json');
fs.writeFileSync(file, '{\n' + keys.map((k) => `  ${JSON.stringify(k)}: ${out[k]}`).join(',\n') + '\n}\n');
console.log(`${keys.length} test times from run ${id} → tests/durations.json`);
