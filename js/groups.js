// Extra word groups and their lazy loading (1.251). Loaded before app.js, right after the Oxford word files.
// Extra word groups (1.250): one row per group = [id, row mark, label, icon, rarity name, file in data/words/, category, word count (data.spec checks it)].
// Everything else (LEVELS_EXTRA, LV_LABEL, the row-mark lookup, RARITY in collect.js) is built from this table.
const GROUPS_X = [
  ['TOE', 'T', 'TOEIC', '💼', 'ชุด TOEIC', 'toeic', 'work', 604], ['AWL', 'A', 'วิชาการ', '🎓', 'ชุดวิชาการ', 'nawl', 'work', 355],
  ['BIZ', 'B', 'ธุรกิจ', '📊', 'ชุดธุรกิจ', 'bsl', 'work', 354], ['IT', 'I', 'IT', '💻', 'ชุด IT', 'it', 'work', 229],
  ['MED', 'H', 'สุขภาพ', '🩺', 'ชุดสุขภาพ', 'health', 'life', 158], ['POL', 'P', 'การเมือง', '🗳️', 'ชุดการเมือง', 'politics', 'world', 246],
  ['COOK', 'K', 'ทำอาหาร', '🍳', 'ชุดทำอาหาร', 'cooking', 'life', 268], ['FEEL', 'E', 'อารมณ์/นิสัย', '💗', 'ชุดอารมณ์และนิสัย', 'feelings', 'life', 222],
  ['ENV', 'G', 'สิ่งแวดล้อม', '🌏', 'ชุดสิ่งแวดล้อม', 'environment', 'world', 213], ['SOC', 'S', 'โซเชียล/ออนไลน์', '📱', 'ชุดโซเชียลและออนไลน์', 'social', 'world', 214],
  ['FIT', 'F', 'ออกกำลังกาย/กีฬา', '🏋️', 'ชุดออกกำลังกายและกีฬา', 'sports', 'fun', 257], ['FAM', 'C', 'ครอบครัว/โรงเรียน', '👶', 'ชุดครอบครัว เลี้ยงลูก และโรงเรียน', 'family', 'life', 275],
  ['PET', 'D', 'สัตว์เลี้ยง', '🐶', 'ชุดสัตว์เลี้ยง', 'pets', 'life', 172], ['STY', 'L', 'ความงาม/แฟชั่น', '💄', 'ชุดความงามและแฟชั่น', 'beauty', 'life', 277],
  ['SPC', 'O', 'อวกาศ/ดาราศาสตร์', '🔭', 'ชุดอวกาศและดาราศาสตร์', 'space', 'fun', 210], ['ENT', 'M', 'หนัง/เพลง/บันเทิง', '🎬', 'ชุดหนัง เพลง และบันเทิง', 'entertainment', 'fun', 212],
  ['CRM', 'R', 'ภัยใกล้ตัว/ตำรวจ', '🚨', 'ชุดภัยใกล้ตัว มิจฉาชีพ และตำรวจ', 'crime', 'world', 216],
].map(([g, mark, name, icon, rare, file, cat, n]) => ({ g, mark, name, icon, rare, file, cat, n }));
const GX_KEY = 'o3k.gx';
// The groups whose word file loads this start: the list app.js saved last time (gxNote), or every group when there is none
// (first start, storage blocked, or a word from an unknown file turned up). document.write keeps them in order before app.js.
const GX_ON = (() => {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(GX_KEY) || 'null'); } catch (e) { /* blocked */ }
  const all = !Array.isArray(a), on = new Set(all ? GROUPS_X.map((x) => x.g) : a);
  on.all = all;
  for (const x of GROUPS_X) if (on.has(x.g)) document.write(`<script src="data/words/${x.file}.js"></script>`);
  return on;
})();
