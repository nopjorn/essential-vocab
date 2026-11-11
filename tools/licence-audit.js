// Word-list licence audit (1.235.0): how far the app's Oxford-derived core list (groups A1 A2 B1 B2 B2x C1) is from openly
// licensed lists, so the "replace the OUP list before selling" step in docs/word-list-licence.md can be planned with numbers.
// Writes docs/word-list-audit.md. Changes nothing in the app.
//
//   node tools/licence-audit.js --ngsl NGSL_12_stats.csv --ngslf NGSL_12_lemmatized_for_teaching.csv --nawl NAWL_12_lemmatized_for_teaching.csv --cmu cmu/index.js
//
// Inputs (download them yourself; they are not kept in the repo):
//   NGSL 1.2 stats  https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv  (CC BY-SA 4.0: Browne, Culligan & Phillips 2013)
//   NGSL forms  https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv
//   NAWL 1.2        https://www.newgeneralservicelist.com/s/NAWL_12_lemmatized_for_teaching.csv  (CC BY-SA 4.0)
//   CMUdict         `npm pack cmu-pronouncing-dictionary` → package/index.js (BSD-style CMUdict data, ISC wrapper)
// Matching uses the NGSL/NAWL lemma and all its listed forms, and UK/US spelling variants (centre/center, colour/color,
// organise/organize, defence/defense …); app words are compared lower-case.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const need = (k) => { const f = arg(k); if (!f || !fs.existsSync(f)) { console.error(`missing --${k} <file> (see the top of this script)`); process.exit(1); } return f; };

// App words
const ctx = vm.createContext({ window: { WORDS: [] } });
for (const f of fs.readdirSync(path.join(ROOT, 'data/words')).filter((f) => f.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/words', f), 'utf8'), ctx);
const GROUP = (r) => (r[r.length - 1] === 'T' ? 'TOE' : r[r.length - 1] === 'A' ? 'AWL' : r[r.length - 1] === 'B' ? 'BIZ' : r[r.length - 1] === 'I' ? 'IT' : r[r.length - 1] === 'H' ? 'MED' : r[r.length - 1] === 'P' ? 'POL'
  : r.includes(5) ? (r[2] === 'C1' ? 'C1' : 'B2x') : r[2]);
const rows = ctx.window.WORDS.map((r) => ({ w: r[0], lw: r[0].toLowerCase(), g: GROUP(r) }));
const CORE = ['A1', 'A2', 'B1', 'B2', 'B2x', 'C1'];
const core = rows.filter((r) => CORE.includes(r.g));
const coreWords = [...new Set(core.map((r) => r.lw))];

// NGSL: rank by lemma; NAWL: lemma + forms
const ngslRank = new Map();
fs.readFileSync(need('ngsl'), 'utf8').split(/\r?\n/).slice(1).forEach((l) => { const [lemma, rank] = l.split(','); if (lemma) ngslRank.set(lemma.toLowerCase().trim(), +rank); });
const ngslForm = new Map(); // form → lemma
fs.readFileSync(need('ngslf'), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).forEach((l) => {
  const forms = l.split(',').map((x) => x.toLowerCase().trim()).filter(Boolean); for (const f of forms) if (!ngslForm.has(f)) ngslForm.set(f, forms[0]);
});
for (const w of ngslRank.keys()) if (!ngslForm.has(w)) ngslForm.set(w, w);
const nawl = new Map(); // form → lemma
fs.readFileSync(need('nawl'), 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).forEach((l) => {
  const forms = l.split(',').map((x) => x.toLowerCase().trim()).filter(Boolean); for (const f of forms) if (!nawl.has(f)) nawl.set(f, forms[0]);
});
// CMUdict (ES module text: `export const dictionary = {...}`)
const cmuText = fs.readFileSync(need('cmu'), 'utf8').replace(/^[\s\S]*?export const dictionary =/, 'module.exports =');
const cmu = vm.runInNewContext(cmuText.replace(/^module.exports =/, '(') + ')', {});

// UK → US spelling candidates (NGSL/NAWL use US spelling, the app's core list UK spelling)
const WORD_US = { grey: 'gray', judgement: 'judgment', programme: 'program', tyre: 'tire', mum: 'mom', fulfil: 'fulfill', cheque: 'check', aeroplane: 'airplane', storey: 'story', plough: 'plow', aluminium: 'aluminum', jewellery: 'jewelry', ageing: 'aging', analyse: 'analyze', paralyse: 'paralyze', catalogue: 'catalog', dialogue: 'dialog', enrol: 'enroll', skilful: 'skillful', practise: 'practice', licence: 'license', pyjamas: 'pajamas', afterwards: 'afterward', towards: 'toward', backwards: 'backward', upwards: 'upward', forwards: 'forward', amongst: 'among' };
function variants(w) {
  const v = new Set([w]);
  if (WORD_US[w]) v.add(WORD_US[w]);
  v.add(w.replace(/our(s?)$/, 'or$1').replace(/our(ed|ing|ite|able|ful|less|ist)/, 'or$1'));
  v.add(w.replace(/([^aeiou])re$/, '$1er').replace(/([^aeiou])res$/, '$1ers'));
  v.add(w.replace(/is(e|ed|es|ing|ation|ations|er)$/, 'iz$1'));
  v.add(w.replace(/ys(e|ed|ing)$/, 'yz$1'));
  v.add(w.replace(/ogue$/, 'og'));
  v.add(w.replace(/ence$/, 'ense'));
  v.add(w.replace(/ll(ed|ing|er)$/, 'l$1'));
  return [...v];
}
const inNgsl = (w) => variants(w).some((x) => ngslForm.has(x));
const inNawl = (w) => variants(w).some((x) => nawl.has(x));
const rankOf = (w) => { for (const x of variants(w)) if (ngslForm.has(x)) return ngslRank.get(ngslForm.get(x)) || 9999; return 9999; };
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0) + ' %';

// 1. core words per group: covered by NGSL / NAWL / neither
const byGroup = CORE.map((g) => {
  const ws = [...new Set(core.filter((r) => r.g === g).map((r) => r.lw))];
  const n = ws.filter(inNgsl).length, a = ws.filter((w) => !inNgsl(w) && inNawl(w)).length;
  return { g, total: ws.length, ngsl: n, nawl: a, none: ws.length - n - a };
});
const tot = byGroup.reduce((s, x) => ({ total: s.total + x.total, ngsl: s.ngsl + x.ngsl, nawl: s.nawl + x.nawl, none: s.none + x.none }), { total: 0, ngsl: 0, nawl: 0, none: 0 });

// 2. NGSL / NAWL headwords the app has no row for at all (would need new Thai meanings and examples)
const all = new Set(rows.flatMap((r) => variants(r.lw)));
// an app word counts for a lemma when it is one of the lemma's forms (interested → interest)
for (const r of rows) for (const x of variants(r.lw)) { if (ngslForm.has(x)) all.add(ngslForm.get(x)); if (nawl.has(x)) all.add(nawl.get(x)); }
const ngslMissing = [...ngslRank.keys()].filter((w) => !all.has(w)).sort((a, b) => ngslRank.get(a) - ngslRank.get(b));
const nawlHead = [...new Set(nawl.values())];
const nawlMissing = nawlHead.filter((w) => !all.has(w)).sort();

// 3. levels from NGSL rank vs. the current (Oxford) level, for the words in both
const BANDS = [[500, 'A1'], [1000, 'A2'], [1800, 'B1'], [Infinity, 'B2']];
const band = (rank) => BANDS.find(([max]) => rank <= max)[1];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1'];
const lvlOf = (g) => (g === 'B2x' ? 'B2' : g);
let same = 0, off1 = 0, both = 0;
for (const r of core) {
  if (!inNgsl(r.lw)) continue;
  both++;
  const d = Math.abs(CEFR.indexOf(band(rankOf(r.lw))) - CEFR.indexOf(lvlOf(r.g)));
  if (!d) same++; else if (d === 1) off1++;
}

// 4. IPA: words CMUdict can pronounce (US) → IPA could be generated instead of the Oxford one
const cmuHit = coreWords.filter((w) => variants(w).some((x) => cmu[x]) || w.split(/[\s-]/).every((p) => cmu[p])).length;

// Removed words keep nothing to show, but their progress stays in S.prog (keyed by spelling) — harmless.
const kept = tot.ngsl + tot.nawl;
const out = `# รายการคำ: เทียบกับรายการแบบเปิด (สร้างอัตโนมัติ)

> สร้างโดย \`node tools/licence-audit.js\` (1.235.0) — ข้อมูลประกอบแผนใน [word-list-licence.md](word-list-licence.md) ยังไม่ได้เปลี่ยนอะไรในแอป
> รายการที่ใช้เทียบ: NGSL 1.2 (${ngslRank.size} คำ) และ NAWL 1.2 (${nawlHead.length} คำ) ของ Browne, Culligan & Phillips ใช้สัญญาอนุญาต CC BY-SA 4.0 · CMUdict สำหรับคำอ่าน

## 1. คำชุดหลัก (มาจาก Oxford) อยู่ในรายการแบบเปิดแล้วกี่คำ
| กลุ่ม | คำทั้งหมด | อยู่ใน NGSL | อยู่ใน NAWL (ไม่อยู่ใน NGSL) | ไม่อยู่ในทั้งสอง |
|---|---|---|---|---|
${byGroup.map((x) => `| ${x.g === 'B2x' ? 'B2+' : x.g} | ${x.total} | ${x.ngsl} (${pct(x.ngsl, x.total)}) | ${x.nawl} | ${x.none} (${pct(x.none, x.total)}) |`).join('\n')}
| **รวม** | **${tot.total}** | **${tot.ngsl} (${pct(tot.ngsl, tot.total)})** | **${tot.nawl}** | **${tot.none} (${pct(tot.none, tot.total)})** |

ถ้าเปลี่ยนแกนเป็น NGSL + NAWL: เก็บคำแปลไทยและตัวอย่างเดิมได้ **${kept} คำ (${pct(kept, tot.total)})** ส่วนอีก ${tot.none} คำต้องตัดออก หรือหาที่มาแบบเปิดอื่นมารองรับ (ความคืบหน้าผู้ใช้ไม่หาย เพราะ \`prog\` เก็บตามตัวสะกด)

## 2. คำที่ต้องเขียนเพิ่ม (มีในรายการแบบเปิดแต่แอปยังไม่มี)
(เทียบทั้งรูปคำและการสะกดแบบอังกฤษ/อเมริกันแล้ว)
- NGSL: **${ngslMissing.length} คำ** (เรียงตามความถี่): ${ngslMissing.slice(0, 60).join(', ')}${ngslMissing.length > 60 ? ' …' : ''}
- NAWL: **${nawlMissing.length} คำ**: ${nawlMissing.slice(0, 40).join(', ')}${nawlMissing.length > 40 ? ' …' : ''}

## 3. ระดับ: ถ้าแบ่งระดับเองตามอันดับความถี่ใน NGSL
แบ่งแบบลองดู: อันดับ 1–500 = A1, 501–1000 = A2, 1001–1800 = B1, ที่เหลือ = B2 (คำ NAWL ให้เป็น B2–C1)
- ตรงกับระดับเดิม ${same} จาก ${both} คำ (${pct(same, both)}) · ต่างกัน 1 ระดับ ${off1} คำ (${pct(off1, both)}) · ต่างกันมากกว่านั้น ${both - same - off1} คำ
- แปลว่าลำดับความยากโดยรวมใกล้เคียงกัน แต่ต้องปรับเส้นแบ่งและตรวจคำที่ต่างกันมากด้วยมือก่อนใช้จริง

## 4. คำอ่าน (IPA)
CMUdict มีคำอ่านของ **${cmuHit} จาก ${coreWords.length} คำ (${pct(cmuHit, coreWords.length)})** ในชุดหลัก (เป็นสำเนียงอเมริกันแบบ ARPAbet ต้องแปลงเป็น IPA) คำที่เหลือ (ส่วนใหญ่เป็นวลีหรือคำหายาก) ต้องเขียนเองหรือใช้ Wiktionary (CC BY-SA)

## 5. ชุดเสริมที่ไม่ต้องเปลี่ยน
TOEIC ${rows.filter((r) => r.g === 'TOE').length} คำ · วิชาการ ${rows.filter((r) => r.g === 'AWL').length} คำ · ธุรกิจ ${rows.filter((r) => r.g === 'BIZ').length} คำ ใช้ TSL / NAWL / BSL (CC BY-SA 4.0) อยู่แล้ว · IT ${rows.filter((r) => r.g === 'IT').length} คำ สุขภาพ ${rows.filter((r) => r.g === 'MED').length} คำ และการเมือง ${rows.filter((r) => r.g === 'POL').length} คำ เขียนขึ้นเอง
`;
fs.writeFileSync(path.join(ROOT, 'docs/word-list-audit.md'), out);
console.log(out);
