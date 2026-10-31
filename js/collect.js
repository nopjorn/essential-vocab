'use strict';
// Collections (1.119, single player): the word-card album (route `album`) and the word garden (route `garden`).
//  · Album: every mastered word is a collectible card; rarity follows the study group (A1 common … C1 legendary). Foil cards ✨
//    (S.foil = { word: date }, union-merged in app.js) come from finishing both daily puzzles and from tower boss floors (foilGive()).
//  · Garden: one plant per topic that grows with the topic's progress (seed → bloom) and wilts when 5+ of its learned words are due;
//    💧 waters it = flashcards of that topic's due words (renderCards('tp:<topic>'), see buildQueueRaw in js/cards.js).
// Classic script sharing globals with app.js.

/* ---------- album ---------- */
const RARITY = { A1: ['⚪', 'ธรรมดา'], A2: ['🟢', 'ไม่ธรรมดา'], B1: ['🔵', 'หายาก'], B2: ['🟣', 'หายากมาก'], B2x: ['🟠', 'มหากาพย์'], C1: ['🌟', 'ตำนาน'] };
const ALBUM_PAGE = 60;
let albumLv = '', albumN = ALBUM_PAGE, albumFoil = false;
const isFoil = (w) => !!(S.foil && S.foil[w.w]);
// A random mastered word without foil becomes foil; rarer cards are a little more likely. Returns the word or null.
function foilGive() {
  const c = masteredWords().filter((w) => !isFoil(w));
  if (!c.length) return null;
  const weight = (w) => 1 + LEVELS.indexOf(w.g) * 0.5, total = c.reduce((n, w) => n + weight(w), 0);
  let r = Math.random() * total, w = c[c.length - 1];
  for (const x of c) { r -= weight(x); if (r <= 0) { w = x; break; } }
  S.foil[w.w] = today(); save();
  return w.w;
}
function albumCard(w) {
  const [ic] = RARITY[w.g] || RARITY.A1, em = typeof emojiOf === 'function' ? emojiOf(w) : '';
  return `<button class="al-card r-${w.g}${isFoil(w) ? ' foil' : ''}" data-w="${w.idx}" aria-label="${esc(w.w)} ${RARITY[w.g][1]}${isFoil(w) ? ' ฟอยล์' : ''}">
    <span class="al-r" aria-hidden="true">${ic}</span><span class="al-pic" aria-hidden="true">${em || esc(w.w[0].toUpperCase())}</span>
    <b lang="en">${esc(w.w)}</b><small>${esc(thFirst(w.t))}</small></button>`;
}
function renderAlbum() {
  if (!EMOJI) { loadEmoji().then(() => { if (current === 'album') renderAlbum(); }).catch(() => {}); }
  const mine = masteredWords(), foils = mine.filter(isFoil).length;
  let list = mine.filter((w) => (!albumLv || w.g === albumLv) && (!albumFoil || isFoil(w)));
  list.sort((a, b) => (isFoil(b) - isFoil(a)) || LEVELS.indexOf(b.g) - LEVELS.indexOf(a.g) || ((S.prog[b.w].t || 0) - (S.prog[a.w].t || 0)));
  const stat = LEVELS.map((l) => [l, mine.filter((w) => w.g === l).length, GROUP[l].length]);
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="alBack">‹ กลับ</button></div>
    <div class="card-box"><b>🃏 อัลบั้มการ์ดคำศัพท์</b><div class="small muted" style="margin:2px 0 8px">คำที่ “จำได้แล้ว” กลายเป็นการ์ดสะสม · มีแล้ว ${mine.length.toLocaleString()} ใบ · ✨ ฟอยล์ ${foils} ใบ</div>
      <div class="al-stat">${stat.map(([l, n, t]) => `<div><span aria-hidden="true">${RARITY[l][0]}</span><b>${RARITY[l][1]}</b><small>${LV_LABEL[l]} · ${n}/${t}</small><span class="qbar"><span style="width:${t ? n / t * 100 : 0}%"></span></span></div>`).join('')}</div></div>
    <div class="chips" id="alF" style="margin:10px 0"><button class="chip${!albumLv && !albumFoil ? ' on' : ''}" data-lv="">ทั้งหมด</button>${LEVELS.map((l) => `<button class="chip${albumLv === l ? ' on' : ''}" data-lv="${l}">${RARITY[l][0]} ${LV_LABEL[l]}</button>`).join('')}<button class="chip${albumFoil ? ' on' : ''}" data-foil="1">✨ ฟอยล์</button></div>
    ${list.length ? `<div class="al-grid">${list.slice(0, albumN).map(albumCard).join('')}</div>${list.length > albumN ? `<button class="btn block" id="alMore" style="margin-top:10px">ดูเพิ่ม (${list.length - albumN})</button>` : ''}`
      : emptyArt({ kind: 'empty', title: mine.length ? 'ยังไม่มีการ์ดในกลุ่มนี้' : 'ยังไม่มีการ์ด', sub: 'ทบทวนคำจนขึ้นสถานะ “จำได้แล้ว” (ทบทวนห่างกัน 16 วันขึ้นไป) แล้วการ์ดจะมาอยู่ที่นี่', btn: 'ไปทบทวน', go: 'cards' })}
    <p class="small muted" style="margin:10px 4px">✨ การ์ดฟอยล์ได้จากการทำปริศนาประจำวันครบทั้ง 2 อย่าง และจากการชนะชั้นบอสของหอคอย · แตะการ์ดเพื่อดูรายละเอียดคำ</p>`;
  $('#alBack').onclick = () => go('fun');
  $('#alF').onclick = (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (b.dataset.foil) { albumFoil = !albumFoil; albumLv = ''; } else { albumLv = b.dataset.lv; albumFoil = false; }
    albumN = ALBUM_PAGE; renderAlbum();
  };
  if ($('#alMore')) $('#alMore').onclick = () => { const top = view.scrollTop; albumN += ALBUM_PAGE * 2; renderAlbum(); view.scrollTop = top; };
  const grid = view.querySelector('.al-grid');
  if (grid) grid.onclick = (e) => { const c = e.target.closest('[data-w]'); if (c) openSheet(W[+c.dataset.w]); };
}
FUN_TILES.push({ id: 'album', o: 30, ic: '🃏', name: 'อัลบั้มการ์ด', sub: () => `${masteredWords().length.toLocaleString()} ใบ · ✨ ${Object.keys(S.foil || {}).length}`, go: () => go('album') });

/* ---------- garden ---------- */
const PLANT = [['🟫', 'ยังเป็นดิน'], ['🌱', 'ต้นกล้า'], ['🌿', 'แตกใบ'], ['🪴', 'ต้นไม้น้อย'], ['🌳', 'ต้นไม้ใหญ่'], ['🌸', 'ออกดอก']];
const WILT_AT = 5;
// Stage of a topic's plant: progress over the topic's words in the levels being studied (all its words if none are in them).
function plantOf(id) {
  if (!TOPIC_WORDS) topicStat(id);
  const all = TOPIC_WORDS[id] || [], inLv = all.filter((w) => S.settings.levels.includes(w.g)), ws = inLv.length ? inLv : all, now = Date.now();
  let m = 0, l = 0, due = 0;
  for (const w of ws) { const p = S.prog[w.w]; if (!p) continue; l++; if (p.b >= MASTERED) m++; }
  for (const w of all) { const p = S.prog[w.w]; if (p && p.d <= now) due++; }
  const n = ws.length, score = n ? (m + 0.35 * (l - m)) / n : 0;
  const stage = !l ? 0 : m / Math.max(1, n) >= 0.85 ? 5 : score >= 0.6 ? 4 : score >= 0.35 ? 3 : score >= 0.12 ? 2 : 1;
  return { stage, n, m, l, due, wilt: due >= WILT_AT, score };
}
function renderGarden() {
  const plants = TOPICS.map(([id, ic, name]) => [id, ic, name, plantOf(id)]).filter((x) => x[3].n);
  const bloom = plants.filter((x) => x[3].stage === 5).length, wilt = plants.filter((x) => x[3].wilt).length;
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="gdBack">‹ กลับ</button></div>
    <div class="card-box garden-head"><b>🌱 สวนคำศัพท์</b><div class="small muted" style="margin-top:2px">หมวดละ 1 ต้น โตตามคำที่เรียนและจำได้ (ระดับที่เลือก ${lvNames(S.settings.levels)}) · 🌸 ออกดอก ${bloom} ต้น${wilt ? ` · 🥀 รอรดน้ำ ${wilt} ต้น` : ''}</div></div>
    <div class="gd-grid">${plants.map(([id, ic, name, p]) => `<div class="gd-plot${p.wilt ? ' wilt' : ''}${p.stage === 5 ? ' bloom' : ''}">
      <div class="gd-plant" aria-hidden="true">${p.wilt && p.stage ? '🥀' : PLANT[p.stage][0]}</div>
      <b>${ic} ${esc(name)}</b><small>${p.wilt && p.stage ? `เหี่ยว: ${p.due} คำครบรอบทบทวน` : PLANT[p.stage][1]} · จำได้ ${p.m}/${p.n}</small>
      <span class="qbar" role="img" aria-label="ความคืบหน้า ${Math.round(p.score * 100)}%"><span style="width:${Math.round(p.score * 100)}%"></span></span>
      ${p.due ? `<button class="btn${p.wilt ? ' primary' : ''} gd-water" data-water="${id}">💧 รดน้ำ (${p.due})</button>` : !p.l ? `<button class="btn gd-water" data-plant="${id}">🌰 ปลูก</button>` : ''}</div>`).join('')}</div>
    <p class="small muted" style="margin:10px 4px">💧 รดน้ำ = ทบทวนแฟลชการ์ดคำที่ครบรอบของหมวดนั้น · 🌰 ปลูก = เริ่มเรียนคำใหม่ของหมวดนั้น · ต้นไม้เหี่ยวเมื่อมีคำครบรอบตั้งแต่ ${WILT_AT} คำ · ออกดอกเมื่อจำได้ 85% ของคำในระดับที่เลือก</p>`;
  $('#gdBack').onclick = () => go('fun');
  view.querySelector('.gd-grid').onclick = (e) => {
    const wb = e.target.closest('[data-water]'), pb = e.target.closest('[data-plant]');
    if (wb) go('cards', 'tp:' + wb.dataset.water);
    else if (pb) { S.settings.topic = pb.dataset.plant; save(); toast(`🌰 เปลี่ยนหมวดที่เรียนเป็น “${TOPICS.find((t) => t[0] === pb.dataset.plant)[2]}” แล้ว (เปลี่ยนกลับได้ที่ตั้งค่า)`); go('cards'); }
  };
}
const gardenSub = () => { const ps = TOPICS.map(([id]) => plantOf(id)), w = ps.filter((p) => p.wilt).length; return w ? `🥀 รอรดน้ำ ${w} ต้น` : `🌸 ออกดอก ${ps.filter((p) => p.stage === 5).length} ต้น`; };
FUN_TILES.push({ id: 'garden', o: 25, home: true, ic: '🌱', name: 'สวนคำศัพท์', sub: gardenSub, go: () => go('garden') });
