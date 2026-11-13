// Starts a new extra word group (1.255): adds its row to GROUPS_X (js/groups.js), creates data/words/<file>.js with the
// header and a sample row, and lists the file in sw.js DATA. Colours come from the category (--gx-<cat>), so style.css needs nothing.
// Usage: node tools/new-group.js <ID> <mark> <file> <cat> "<label>" "<icon>" "<rarity name>"
//   e.g. node tools/new-group.js LAW W law world "สัญญา/กฎหมาย" "⚖️" "ชุดสัญญาและกฎหมายใกล้ตัว"
// Then: fill the word file (data.spec checks the row mark, the count and that every example holds the word), set the real
// word count in GROUPS_X, add a guide line (data/app/guide.js), a notes row and a CLAUDE.md line, bump the version.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n'); // Windows checkouts are CRLF
const wr = (f, s) => fs.writeFileSync(path.join(root, f), s);
const [id, mark, file, cat, name, icon, rare] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(1); };
if (!rare) fail('usage: node tools/new-group.js <ID> <mark> <file> <cat> "<label>" "<icon>" "<rarity name>"');

const g = rd('js/groups.js');
const rows = vm.runInNewContext(/const GROUPS_X = (\[[\s\S]*?\])\.map/.exec(g)[1]);
const cats = vm.runInNewContext(/const GX_CATS = (\[[\s\S]*?\]);/.exec(g)[1]).map((c) => c[0]);
if (!/^[A-Z]{2,4}$/.test(id)) fail('ID: 2–4 capital letters');
if (!/^[A-Z]$/.test(mark)) fail('mark: one capital letter');
if (!/^[a-z]+$/.test(file)) fail('file: lower-case letters only');
if (!cats.includes(cat)) fail(`cat: one of ${cats.join(', ')}`);
if (rows.some((r) => r[0] === id)) fail(`${id} is already in GROUPS_X`);
if (rows.some((r) => r[1] === mark)) fail(`mark ${mark} is taken (${rows.find((r) => r[1] === mark)[0]})`);
const f = `data/words/${file}.js`;
if (fs.existsSync(path.join(root, f))) fail(`${f} exists`);

const q = (s) => `'${s.replace(/'/g, "\\'")}'`;
const last = g.lastIndexOf('],\n].map(');
if (last < 0) fail('GROUPS_X end not found in js/groups.js');
wr('js/groups.js', g.slice(0, last + 2) + `\n  [${q(id)}, ${q(mark)}, ${q(name)}, ${q(icon)}, ${q(rare)}, ${q(file)}, ${q(cat)}, 1],` + g.slice(last + 2));

wr(f, `// ${name} (new group ${id}): TODO describe what the set covers.
// Word selection, CEFR level (estimate), IPA (US), Thai meanings and example sentences are all written for this app.
// Row: [word, part of speech, CEFR level (estimate), IPA (US), Thai meaning, example sentence, Thai translation, topic id, '${mark}' = ${name} set]
(window.WORDS = window.WORDS || []).push(
  ["example","n","A2","/ɪɡˈzæmpl/","ตัวอย่าง","This example is only a placeholder.","ตัวอย่างนี้เป็นแค่ตัวยึดที่ไว้ก่อน","edu","${mark}"]
);
`);

// style.css: the group token (= its category colour) and a copy of every per-group rule of the last group (.lv.X, .lv-X, …).
const prev = rows[rows.length - 1][0], pl = prev.toLowerCase(), lo = id.toLowerCase();
let css = rd('style.css');
css = css.replace(new RegExp(`(--${pl}: var\\(--gx-[a-z]+\\);)`), `$1 --${lo}: var(--gx-${cat});`);
css = css.replace(new RegExp(`( ?)([^ {};]*\\b${prev}\\b[^{};]*\\{ [^}]*var\\(--${pl}\\);? \\})`, 'g'),
  (m, sp, rule) => `${sp}${rule} ${rule.replace(new RegExp(`\\b${prev}\\b`, 'g'), id).replace(`var(--${pl})`, `var(--${lo})`)}`);
if (!css.includes(`--${lo}: var(--gx-${cat});`)) fail(`colour token of ${prev} not found in style.css`);
wr('style.css', css);

const sw = rd('sw.js'), lastW = [...sw.matchAll(/^ {2}'data\/words\/[a-z0-9]+\.js',\r?\n/gm)].pop();
if (!lastW) fail('data/words entries not found in sw.js');
wr('sw.js', sw.slice(0, lastW.index + lastW[0].length) + `  '${f}',\n` + sw.slice(lastW.index + lastW[0].length));
console.log(`added ${id} (${name}) → ${f}; set its word count in js/groups.js once the file is filled`);
