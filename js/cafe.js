'use strict';
// ร้านน้องคำ (1.120, single player; route `cafe`, `runCafe(branch)`): a day at น้องคำ's shop. Each guest orders in English (spoken; the text
// can be peeked at for a smaller tip), you tap the matching pictures (data/emoji.js) and serve before their patience runs out.
// 8 guests a day (orders grow from 1 to 3 items), 3 mistakes end the day early. Tips are coins (1–3 per guest, faster = more).
// 1.121: three branches (CAFE_BR: 🍜 food, 👗 clothes from 10 guests served, 🛒 home goods from 20) and quantities ("two apples"):
// tapping a picture counts up 1 → 2 → 3 → 0 (CAFE_MAX). Each ordered word counts as a game answer (gameResult).
// 30 guests served in total → 🧑‍🍳 apron for the mascot.
// State: S.cafe = { best: most guests served in one day, total } (cleanCafe() / max merge in app.js). Classic script sharing globals with app.js.

const CAFE_N = 8, CAFE_STRIKES = 3, CAFE_TIME = 25, CAFE_SHELF = 8, CAFE_APRON = 30, CAFE_MAX = 3;
const CAFE_SOME = new Set(['bread', 'cheese', 'chicken', 'chocolate', 'coffee', 'ice cream', 'juice', 'meat', 'milk', 'rice', 'soup', 'tea', 'water', 'paper']);
const CAFE_PAIR = new Set(['boot', 'shoe', 'sock', 'glove', 'trousers']); // "a pair of boots"
const CAFE_NUM = ['', 'one', 'two', 'three'];
const CAFE_BR = {
  food: { ic: '🍜', name: 'ร้านอาหาร', need: 0, tp: ['food'], skip: ['beer', 'wine', 'cocktail', 'salt', 'pepper', 'fork'], qty: ['apple', 'banana', 'egg', 'orange', 'carrot', 'onion', 'potato', 'lemon', 'sandwich'] },
  clothes: { ic: '👗', name: 'ร้านเสื้อผ้า', need: 10, tp: ['clothes'], add: ['bag', 'umbrella'], skip: ['diamond'], qty: ['hat', 'shirt', 'ring', 'dress', 'skirt', 'jacket', 'bag', 'umbrella'] },
  home: { ic: '🛒', name: 'ร้านของใช้', need: 20, tp: ['home'], skip: ['bath', 'bed', 'door', 'house', 'shower', 'toilet', 'window', 'tap', 'knife', 'arrow', 'tool', 'plug', 'bag', 'umbrella'], qty: ['bottle', 'box', 'chair', 'key', 'plate', 'spoon', 'toy', 'battery', 'candle', 'balloon', 'bell', 'gift', 'lamp'] },
};
const CAFE_GUESTS = ['👩', '👨', '👵', '👴', '🧒', '👧', '👦', '🧑‍🎓', '👩‍💼', '👨‍🔧', '🧑‍🚀', '👮'];
const CAFE_FMT = [(l) => `Can I have ${l}, please?`, (l) => `I'd like ${l}, please.`, (l) => `Could I get ${l}?`, (l) => `Hello! ${l[0].toUpperCase() + l.slice(1)}, please.`];
let cafeBr = 'food';
const cafeOpen = (id) => S.cafe.total >= CAFE_BR[id].need;
function cafeItems(br = 'food') {
  const b = CAFE_BR[br], seen = new Set(), skip = new Set(b.skip || []), add = new Set(b.add || []);
  return W.filter((w) => (b.tp.includes(w.tp) || add.has(w.w)) && EMOJI && EMOJI[w.w] && !skip.has(w.w) && !seen.has(w.w) && seen.add(w.w));
}
function cafePlural(w) {
  if (w === 'potato') return 'potatoes';
  if (/(s|x|ch|sh)$/.test(w)) return w + 'es';
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}
// "an apple", "some milk", "a pair of boots", "two bananas"
function cafeArt(w, q = 1) {
  if (CAFE_PAIR.has(w)) return (q > 1 ? CAFE_NUM[q] + ' pairs of ' : 'a pair of ') + (w === 'trousers' ? w : cafePlural(w));
  if (q > 1) return CAFE_NUM[q] + ' ' + cafePlural(w);
  return (CAFE_SOME.has(w) ? 'some ' : /^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
}
const cafeList = (a) => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
// items: [{ w, q }] (older callers may pass plain words = quantity 1)
const cafeSay = (items, fmt) => CAFE_FMT[fmt](cafeList(items.map((x) => (x.w && typeof x.w === 'object' ? cafeArt(x.w.w, x.q) : cafeArt(x.w, 1)))));

function renderCafe() {
  if (!EMOJI) { withLoading(loadEmoji()).then(() => { if (current === 'cafe') renderCafe(); }); return; }
  const c = S.cafe;
  if (!cafeOpen(cafeBr)) cafeBr = 'food';
  const br = CAFE_BR[cafeBr];
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="cfBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="chips" id="cfBr" style="margin-bottom:10px">${Object.entries(CAFE_BR).map(([id, b]) => `<button class="chip${id === cafeBr ? ' on' : ''}" data-br="${id}" ${cafeOpen(id) ? '' : 'disabled'} aria-pressed="${id === cafeBr}">${b.ic} ${b.name}${cafeOpen(id) ? '' : ` 🔒 เสิร์ฟครบ ${b.need} คน`}</button>`).join('')}</div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${mascotSvg({ mood: 'happy', size: 96, equip: { ...(S.mascot.equip || {}), body: (S.owned || []).includes('acc:apron') ? 'apron' : (S.mascot.equip || {}).body } })}</div>
      <div class="h2" style="margin:2px 0">${br.ic} ร้านน้องคำ · ${br.name}</div><p class="small">ลูกค้าสั่งเป็นภาษาอังกฤษ ฟังแล้วหยิบของให้ถูกและครบจำนวน แล้วกด 🛎️ เสิร์ฟ</p>
      <p class="small muted">ดีที่สุด ${c.best}/${CAFE_N} คนต่อวัน · เสิร์ฟไปแล้วทั้งหมด ${c.total} คน</p>
      <button class="btn primary block" id="cfGo">☀️ เปิดร้าน</button></div>
    <p class="small muted" style="margin:10px 4px">วันละ ${CAFE_N} คน (สั่ง 1 → 3 อย่าง บางคนสั่งหลายชิ้น เช่น “two apples” แตะรูปซ้ำเพื่อเพิ่มจำนวน ×2 ×3 แตะอีกครั้งเป็น 0) · เสิร์ฟผิดหรือช้าเกิน ${CAFE_TIME} วินาทีนับเป็นพลาด พลาด ${CAFE_STRIKES} ครั้งปิดร้าน · ทิปเป็น 🪙 1–3 ต่อคน ยิ่งเร็วยิ่งได้มาก (กด 👀 ดูข้อความแล้วทิปลด 1) · เสิร์ฟครบ 10 คนเปิด 👗 ร้านเสื้อผ้า ครบ 20 คนเปิด 🛒 ร้านของใช้ · ครบ ${CAFE_APRON} คนได้ 🧑‍🍳 ผ้ากันเปื้อน</p>`;
  $('#cfBack').onclick = () => go('fun');
  $('#cfGo').onclick = () => runCafe(cafeBr);
  $('#cfBr').onclick = (e) => { const b = e.target.closest('[data-br]'); if (b && !b.disabled) { cafeBr = b.dataset.br; renderCafe(); } };
}

function runCafe(brId = cafeBr) {
  if (cleanup) { cleanup(); cleanup = null; }
  const br = CAFE_BR[brId] || CAFE_BR.food, all = cafeItems(brId), qtyOk = new Set(br.qty || []);
  let g = 0, served = 0, strikes = 0, coins = 0, alive = true, tick = 0;
  cleanup = () => { alive = false; clearInterval(tick); };
  const guest = () => {
    if (!alive) return;
    if (g >= CAFE_N || strikes >= CAFE_STRIKES) return end();
    const n = g < 3 ? 1 : g < 6 ? 2 : 3, words = shuffle(all).slice(0, n);
    // from the 3rd guest on, a countable item is sometimes ordered 2 or 3 times
    const order = words.map((w) => ({ w, q: g >= 2 && qtyOk.has(w.w) && Math.random() < 0.45 ? 2 + (Math.random() < 0.35 ? 1 : 0) : 1 }));
    const shelf = shuffle([...words, ...shuffle(all.filter((w) => !words.includes(w))).slice(0, CAFE_SHELF - n)]);
    const fmt = Math.floor(Math.random() * CAFE_FMT.length), text = cafeSay(order, fmt), face = pick(CAFE_GUESTS), cnt = shelf.map(() => 0), t0 = Date.now();
    let peek = false, done = false;
    cafeRun.order = order.map((x) => x.w); cafeRun.qty = order.map((x) => x.q); cafeRun.shelf = shelf; // read by tests
    $('#title').textContent = `${br.ic} ลูกค้า ${g + 1}/${CAFE_N}`;
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="cfQuit" aria-label="ปิดร้าน">✕</button><div class="progress cf-pat"><div id="cfBar" style="width:100%"></div></div><span class="small">${'❌'.repeat(strikes)}${'⚪'.repeat(CAFE_STRIKES - strikes)} · 🪙 ${coins}</span></div>
      <div class="card-box cf-guest pop"><span class="cf-face" aria-hidden="true">${face}</span><div class="grow"><div class="cf-bubble"><button class="speak" id="cfSay" aria-label="ฟังลูกค้าอีกครั้ง" style="width:52px;height:52px;font-size:24px;margin:0">🔊</button>
        <span id="cfText" lang="en" class="en" hidden>${esc(text)}</span><button class="pw-btn" id="cfPeek">👀 ดูข้อความ</button></div><div class="small muted">สั่ง ${n} อย่าง${order.some((x) => x.q > 1) ? ' (มีสั่งหลายชิ้น)' : ''}</div></div></div>
      <div class="cf-shelf">${shelf.map((w, k) => `<button class="cf-item" data-k="${k}" aria-label="${esc(w.w)} จำนวน 0">${EMOJI[w.w]}<i class="cf-n" hidden></i></button>`).join('')}</div>
      <button class="btn primary block" id="cfServe" disabled>🛎️ เสิร์ฟ</button><div class="reveal" id="reveal" aria-live="polite"></div>`;
    speak(text);
    $('#cfQuit').onclick = () => end();
    $('#cfSay').onclick = () => speak(text);
    $('#cfPeek').onclick = () => { peek = true; $('#cfText').hidden = false; $('#cfPeek').remove(); };
    view.querySelector('.cf-shelf').onclick = (e) => {
      const b = e.target.closest('.cf-item'); if (!b || done) return;
      const k = +b.dataset.k;
      cnt[k] = (cnt[k] + 1) % (CAFE_MAX + 1);
      b.classList.toggle('on', cnt[k] > 0);
      const badge = b.querySelector('.cf-n'); badge.hidden = cnt[k] < 2; badge.textContent = '×' + cnt[k];
      b.setAttribute('aria-label', `${shelf[k].w} จำนวน ${cnt[k]}`);
      $('#cfServe').disabled = !cnt.some((x) => x);
    };
    const finish = (timeUp) => {
      if (done || !alive) return; done = true; clearInterval(tick);
      const want = new Map(order.map((x) => [x.w, x.q]));
      const ok = !timeUp && shelf.every((w, k) => cnt[k] === (want.get(w) || 0));
      order.forEach((x) => gameResult(x.w, !timeUp && cnt[shelf.indexOf(x.w)] > 0));
      view.querySelectorAll('.cf-item').forEach((b) => { const k = +b.dataset.k, w = shelf[k]; if (want.has(w)) b.classList.add('want'); else if (cnt[k]) b.classList.add('wrong'); b.disabled = true; });
      $('#cfServe').disabled = true; $('#cfText').hidden = false; const pk = $('#cfPeek'); if (pk) pk.remove();
      if (ok) {
        const left = 1 - (Date.now() - t0) / 1000 / CAFE_TIME, tip = Math.max(1, 1 + (left > 0.6 ? 2 : left > 0.3 ? 1 : 0) - (peek ? 1 : 0));
        served++; coins += tip; addCoins(tip); addXP(2 * order.length); sfx('ok');
        if (typeof funEvent === 'function') funEvent('guest');
        $('#reveal').innerHTML = `😋 Thank you! ทิป 🪙 ${tip}`;
      } else { strikes++; sfx('bad'); $('#reveal').innerHTML = `${timeUp ? '⌛ ช้าไป ลูกค้ากลับแล้ว' : '😕 ไม่ตรงกับที่สั่ง'} · ที่สั่งคือ ${order.map((x) => `${EMOJI[x.w.w]}${x.q > 1 ? ' ×' + x.q : ''} <b lang="en">${esc(x.w.w)}</b> (${esc(thFirst(x.w.t))})`).join(', ')}`; }
      save();
      setTimeout(() => { if (alive) { g++; guest(); } }, ok ? 1100 : 2600);
    };
    $('#cfServe').onclick = () => finish(false);
    tick = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - t0) / 1000 / CAFE_TIME), bar = $('#cfBar');
      if (bar) bar.style.width = left * 100 + '%';
      if (left <= 0) finish(true);
    }, 200);
  };
  const end = () => {
    if (!alive) return;
    alive = false; clearInterval(tick); cleanup = null;
    const c = S.cafe, best = served > c.best, opened = Object.keys(CAFE_BR).filter((id) => !cafeOpen(id));
    c.best = Math.max(c.best, served); c.total += served;
    let msg = '';
    if (c.total >= CAFE_APRON && !(S.owned || []).includes('acc:apron')) { (S.owned = S.owned || []).push('acc:apron'); msg = '<p class="small"><b>🧑‍🍳 ได้ผ้ากันเปื้อนสำหรับน้องคำ!</b></p>'; }
    opened.filter(cafeOpen).forEach((id) => { msg += `<p class="small"><b>🎉 เปิดสาขาใหม่ ${CAFE_BR[id].ic} ${CAFE_BR[id].name} แล้ว!</b></p>`; });
    save();
    if (served >= 6) confetti(served === CAFE_N ? 'burst' : undefined);
    $('#title').textContent = 'ร้านน้องคำ';
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${served >= 6 ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 96 })}</div>` : br.ic}</div>
      <div class="h2" style="margin:4px 0">ปิดร้านแล้ว · เสิร์ฟ ${served}/${CAFE_N} คน${best ? ' · สถิติใหม่! 🏅' : ''}</div>
      <p class="small">ได้ทิป 🪙 ${coins} · เสิร์ฟสะสม ${c.total} คน</p>${msg}
      <button class="btn primary block" id="cfAgain">☀️ เปิดร้านอีกวัน</button><button class="btn ghost block" id="cfHome" style="margin-top:8px">${br.ic} กลับหน้าร้าน</button></div>`;
    $('#cfAgain').onclick = () => runCafe(brId);
    $('#cfHome').onclick = () => renderCafe();
    updateStreak();
  };
  guest();
}
const cafeRun = {};
FUN_TILES.push({ id: 'cafe', o: 15, home: false, ic: '🍜', name: 'ร้านน้องคำ', sub: () => (S.cafe.total ? `เสิร์ฟแล้ว ${S.cafe.total} คน · ${Object.keys(CAFE_BR).filter(cafeOpen).length}/3 สาขา` : 'ฟังลูกค้าสั่งของ'), go: () => go('cafe') });
