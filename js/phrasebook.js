'use strict';
// Phrase books (1.212.0): one engine for small lazy-loaded lists of words or phrases outside the word list.
// Each book = data file rows [category, English, Thai, example sentence, Thai example, note], a reference page (REF_PAGES key = book id,
// renderBook(id)) and a skill game with the same id (qBook in data/play.js, own SRS in S.lex).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- phrase books ---------- */
// file, window key, icon, page title, game question modes (en: English → Thai, th: Thai → English, note: English → the note), note label,
// whether the English is read aloud by itself (abbreviations are spelt oddly by speech engines: the example is read instead), categories.
const PB = {
  abbr: {
    file: 'data/abbr.js', key: 'ABBR', icon: '🔤', title: 'ตัวย่อที่ใช้ในงาน', modes: ['en', 'th', 'note'], note: 'ย่อมาจาก', sayEn: false,
    intro: 'ตัวย่อที่เจอในอีเมล แชต และการประชุม · แต่ละตัวมีคำเต็ม ความหมาย และประโยคตัวอย่าง · แตะเพื่อฟังประโยค · ＋ เก็บเข้าชุดของฉัน',
    ask: { en: 'ตัวย่อนี้แปลว่าอะไร', th: 'ตัวย่อไหนตรงกับความหมายนี้', note: 'ตัวย่อนี้ย่อมาจากอะไร' },
    cats: { mail: ['📧', 'อีเมล'], meet: ['🗓️', 'ประชุม'], hr: ['🧑‍💼', 'งานบุคคล / การลา'], biz: ['📈', 'ธุรกิจ'], tech: ['💻', 'ไอที'], chat: ['💬', 'แชต'] },
  },
};
const PB_DATA = {};
const loadBook = (id) => loadData(PB[id].file, PB[id].key).then((rows) => {
  if (!PB_DATA[id] && rows.length) PB_DATA[id] = rows.map(([cat, en, th, ex, exTh, note]) => ({ cat, en, th, ex, exTh, note: note || '' }));
  return PB_DATA[id] || [];
});
const pbItems = (id) => PB_DATA[id].map((r) => ({ idx: -1, w: r.en, t: r.th, p: '', g: '', _pb: r, _book: id, _q: [r.ex, r.en, '', r.th] }));
// the question for one item: mode, prompt, the right option and 3 others from the same book (same category first, no repeated text)
function pbQuestion(id, r, mode) {
  const b = PB[id], m = mode || pick(b.modes);
  const field = m === 'en' ? 'th' : m === 'th' ? 'en' : 'note';
  const right = r[field], rows = PB_DATA[id].filter((x) => x !== r && x[field] && x[field] !== right);
  const near = shuffle(rows.filter((x) => x.cat === r.cat)), far = shuffle(rows.filter((x) => x.cat !== r.cat));
  const others = [];
  for (const x of [...near.slice(0, 2), ...far, ...near.slice(2)]) { if (others.length < 3 && !others.includes(x[field])) others.push(x[field]); }
  return { m, field, right, opts: shuffle([right, ...others]), prompt: m === 'th' ? r.th : r.en };
}
const pbOwn = (r, id) => ({ w: r.en, t: PB[id].note && r.note ? `${r.th} (${r.note})` : r.th, e: r.ex, et: r.exTh });
const pbSay = (r, id) => (PB[id].sayEn ? r.en : r.ex);
const pbCat = {}; // book id → selected category chip
function renderBook(id) {
  const b = PB[id];
  if (!PB_DATA[id]) { withLoading(loadBook(id)).then(() => renderBook(id)); return; }
  const rows = PB_DATA[id], cats = Object.keys(b.cats).filter((c) => rows.some((r) => r.cat === c));
  $('#title').textContent = b.title;
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="pbBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="pbPlay">${b.icon} เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${rows.length} รายการ · ${b.intro}</p>
    <div class="chips scroll" id="pbCats"><button class="chip" data-c="all">ทั้งหมด</button>${cats.map((c) => `<button class="chip" data-c="${c}">${b.cats[c][0]} ${b.cats[c][1]}</button>`).join('')}</div>
    <div class="row" style="margin:6px 4px 8px"><div class="grow"></div><button class="btn ghost" id="pbAll">＋ เก็บทั้งหมวดเข้าชุดของฉัน</button></div>
    <div class="pair-list" id="pbList"></div>`;
  const cur = () => pbCat[id] || 'all';
  const shown = () => rows.filter((r) => cur() === 'all' || r.cat === cur());
  const paint = () => {
    view.querySelectorAll('#pbCats .chip').forEach((c) => { const on = c.dataset.c === cur(); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    $('#pbList').innerHTML = cats.filter((c) => cur() === 'all' || c === cur()).map((c) => `<div class="card-box pair-card"><div class="pair-h"><b>${b.cats[c][0]} ${b.cats[c][1]}</b> <span class="small muted">${rows.filter((r) => r.cat === c).length}</span></div>
      ${rows.filter((r) => r.cat === c).map((r) => `<div class="bc-item pb-item"><button class="pair-ex" data-say="${esc(pbSay(r, id))}"><span><b lang="en">${esc(r.en)}</b>${r.note ? ` <span class="small muted" lang="en">${esc(r.note)}</span>` : ''} = ${esc(r.th)}</span><span lang="en">${esc(r.ex)}</span><small class="muted">${esc(r.exTh)}</small></button><button class="bc-add" data-add="${rows.indexOf(r)}" aria-label="เก็บ ${esc(r.en)} เข้าชุดของฉัน">＋</button></div>`).join('')}</div>`).join('');
  };
  paint();
  $('#pbCats').onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) { pbCat[id] = c.dataset.c; paint(); } };
  $('#pbBack').onclick = () => go('ref');
  $('#pbPlay').onclick = () => startGame(id);
  $('#pbAll').onclick = () => pickDeck([], shown().map((r) => pbOwn(r, id)));
  $('#pbList').onclick = (e) => {
    const a = e.target.closest('[data-add]'); if (a) { pickDeck([], [pbOwn(rows[+a.dataset.add], id)]); return; }
    const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say);
  };
}
