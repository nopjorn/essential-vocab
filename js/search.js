'use strict';
// Search the whole app (1.112): 🔍 in the top bar, "/" or Ctrl/⌘+K. Finds words (English or Thai), games and pages.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- search everything ---------- */
const GS_EXTRA = [ // pages that have no tab/sidebar entry: [icon, name, keywords, route]
  ['📜', 'ประวัติการอัปเดต', 'changelog เวอร์ชัน มีอะไรใหม่', 'changelog'],
  ['🔤', 'ปริศนาศัพท์ประจำวัน', 'riddle wordle ทายคำ', 'riddle'],
  ['🗺️', 'แผนที่ด่าน', 'map ด่าน บอส', 'map'],
  ['🐣', 'น้องคำ', 'mascot ตู้เสื้อผ้า กล่องรางวัล', 'mascot'],
  ['🎪', 'โซนสนุก', 'fun เล่นคนเดียว เหรียญ coin', 'fun'],
  ['🏯', 'หอคอยไม่รู้จบ', 'tower หอคอย ปีน endless', 'tower'],
  ['🧩', 'ปริศนาประจำวัน', 'puzzle crossword ครอสเวิร์ด บันไดคำ word ladder', 'puzzle'],
  ['🃏', 'อัลบั้มการ์ด', 'album card การ์ดสะสม ฟอยล์ foil', 'album'],
  ['🌱', 'สวนคำศัพท์', 'garden สวน ต้นไม้ รดน้ำ', 'garden'],
  ['🕵️', 'คดีนักสืบ', 'detective case คดี นักสืบ อ่าน', 'cases'],
  ['🍜', 'ร้านน้องคำ', 'cafe ร้านอาหาร สั่งอาหาร ฟัง', 'cafe'],
  ['🛍️', 'ร้านค้าเหรียญ', 'shop coin เหรียญ ซื้อ', 'coinshop'],
  ['🗺️', 'ผจญภัยประจำสัปดาห์', 'adventure ด่าน ตราประทับ พาสปอร์ต', 'adv'],
  ['🎯', 'วัดระดับ', 'placement ทดสอบระดับ', 'placement'],
  ['🔎', 'ค้นหาคำในตาราง', 'word search ตารางคำ', 'wsearch'],
  ['⚔️', 'ท้าดวลเพื่อน', 'duel', 'duel'],
  ['🎊', 'สรุปปีของฉัน', 'year in review', 'year'],
];
const gsNorm = (s) => String(s || '').toLowerCase().normalize('NFC');
// 0 = exact, 1 = starts with, 2 = contains, -1 = no match
const gsRank = (text, q) => { const t = gsNorm(text); return t === q ? 0 : t.startsWith(q) ? 1 : t.includes(q) ? 2 : -1; };

function gsSearch(q) {
  q = gsNorm(q).trim();
  const out = { words: [], games: [], pages: [] };
  // pages: every tab-bar / sidebar entry (read from the DOM, so a new page there is found automatically) + the extras
  const pages = [...document.querySelectorAll('#tabbar button[data-tab], #tabbar button[data-ref]')].map((b) => {
    const sp = b.querySelectorAll('span'), key = b.dataset.tab ? 't:' + b.dataset.tab : 'r:' + b.dataset.ref;
    return { ic: sp[0] ? sp[0].textContent : '', t: sp[1] ? sp[1].textContent : '', kw: b.dataset.tab || b.dataset.ref, key, btn: b };
  }).concat(GS_EXTRA.map(([ic, t, kw, route]) => ({ ic, t, kw: kw + ' ' + route, key: 'x:' + route, route })));
  if (!q) { out.pages = pages.slice(0, 8); return out; }
  for (const p of pages) { const r = Math.min(...[gsRank(p.t, q), gsRank(p.kw, q)].map((x) => (x < 0 ? 9 : x))); if (r < 9) out.pages.push({ ...p, r }); }
  for (const [id, g] of Object.entries(GAMES)) {
    const r = Math.min(...[gsRank(g.name, q), gsRank(g.desc, q), gsRank(id, q)].map((x) => (x < 0 ? 9 : x)));
    if (r < 9) out.games.push({ id, g, r });
  }
  const seen = new Set();
  for (const w of W) {
    const r = Math.min(...[gsRank(w.w, q), gsRank(w.t, q)].map((x) => (x < 0 ? 9 : x)));
    if (r < 9 && !seen.has(w.w + w.p)) { seen.add(w.w + w.p); out.words.push({ w, r }); }
  }
  const by = (a, b) => a.r - b.r;
  out.words.sort((a, b) => a.r - b.r || a.w.w.length - b.w.w.length);
  out.games.sort(by); out.pages.sort(by);
  return out;
}

function openSearch() {
  if (document.querySelector('.gs')) return;
  const el = document.createElement('div');
  el.className = 'gs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'ค้นหา');
  el.innerHTML = `<div class="gs-box">
    <div class="gs-bar"><span aria-hidden="true">🔍</span><input id="gsq" type="search" placeholder="ค้นหาคำ เกม หรือหน้าในแอป" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="ค้นหาคำ เกม หรือหน้าในแอป"><button class="gs-x" id="gsClose" aria-label="ปิดการค้นหา">ยกเลิก</button></div>
    <div class="gs-res" id="gsRes" aria-live="polite"></div></div>`;
  document.body.appendChild(el);
  const input = el.querySelector('#gsq'), res = el.querySelector('#gsRes');
  let items = [];
  const close = () => { document.removeEventListener('keydown', onKey, true); el.remove(); };
  const run = (it) => {
    close();
    if (it.kind === 'word') openSheet(it.w);
    else if (it.kind === 'game') startGame(it.id);
    else if (it.btn) it.btn.click();
    else go(it.route);
  };
  const row = (i, ic, t, sub) => `<button class="gs-row" data-i="${i}" role="option"><span class="gs-ic" aria-hidden="true">${ic}</span><span class="gs-tx"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="muted" aria-hidden="true">›</span></button>`;
  const paint = () => {
    const q = input.value.trim(), r = gsSearch(q);
    items = [];
    let h = '';
    const sec = (title, list) => { if (list.length) h += `<div class="gs-h">${title}</div>` + list.join(''); };
    sec(q ? '📖 คำศัพท์' : '', r.words.slice(0, 8).map((x) => { items.push({ kind: 'word', w: x.w }); return row(items.length - 1, lvBadge(x.w.g), `<span lang="en">${esc(x.w.w)}</span> <span class="muted">${esc(x.w.p)}</span>`, esc(x.w.t)); }));
    if (r.words.length > 8) h += `<div class="small muted gs-more">ยังมีอีก ${r.words.length - 8} คำ พิมพ์ให้เจาะจงขึ้นอีกนิดนะ</div>`;
    sec('🎮 เกม', r.games.slice(0, 5).map((x) => { items.push({ kind: 'game', id: x.id }); return row(items.length - 1, x.g.icon, esc(x.g.name), esc(x.g.desc)); }));
    sec(q ? '🧭 หน้าในแอป' : '🧭 ไปที่', r.pages.slice(0, q ? 6 : 8).map((x) => { items.push(x); return row(items.length - 1, x.ic, esc(x.t), ''); }));
    if (q && !items.length) h = `<div class="gs-empty">${emptyArt({ kind: 'search', title: `ไม่เจอ “${esc(q)}”`, sub: 'ลองสะกดอีกแบบ หรือค้นเป็นภาษาไทยดูนะ', sm: true })}</div>`;
    res.innerHTML = h;
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Enter' && e.target === input && items[0]) { e.preventDefault(); run(items[0]); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = [...res.querySelectorAll('.gs-row')]; if (!rows.length) return;
      e.preventDefault();
      const i = rows.indexOf(document.activeElement);
      (rows[e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : i <= 0 ? -1 : i - 1] || input).focus();
    }
  };
  document.addEventListener('keydown', onKey, true);
  input.addEventListener('input', paint);
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('#gsClose')) return close();
    const b = e.target.closest('.gs-row'); if (b) run(items[+b.dataset.i]);
  });
  paint();
  input.focus();
}
$('#qsBtn').addEventListener('click', openSearch);
document.addEventListener('keydown', (e) => {
  const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) { e.preventDefault(); openSearch(); }
});
