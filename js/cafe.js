'use strict';
// ร้านน้องคำ (1.120, single player; route `cafe`, `runCafe()`): a day at น้องคำ's café. Each guest orders in English (spoken; the text
// can be peeked at for a smaller tip), you tap the matching food pictures (data/emoji.js) and serve before their patience runs out.
// 8 guests a day (orders grow from 1 to 3 items), 3 mistakes end the day early. Tips are coins (1–3 per guest, faster = more).
// Each ordered word counts as a game answer (gameResult). 30 guests served in total → 🧑‍🍳 apron for the mascot.
// State: S.cafe = { best: most guests served in one day, total } (cleanCafe() / max merge in app.js). Classic script sharing globals with app.js.

const CAFE_N = 8, CAFE_STRIKES = 3, CAFE_TIME = 25, CAFE_SHELF = 8, CAFE_APRON = 30;
const CAFE_SKIP = new Set(['beer', 'wine', 'cocktail', 'salt', 'pepper', 'fork']);
const CAFE_SOME = new Set(['bread', 'cheese', 'chicken', 'chocolate', 'coffee', 'ice cream', 'juice', 'meat', 'milk', 'rice', 'soup', 'tea', 'water']);
const CAFE_GUESTS = ['👩', '👨', '👵', '👴', '🧒', '👧', '👦', '🧑‍🎓', '👩‍💼', '👨‍🔧', '🧑‍🚀', '👮'];
const CAFE_FMT = [(l) => `Can I have ${l}, please?`, (l) => `I'd like ${l}, please.`, (l) => `Could I get ${l}?`, (l) => `Hello! ${l[0].toUpperCase() + l.slice(1)}, please.`];
function cafeItems() { const seen = new Set(); return W.filter((w) => w.tp === 'food' && EMOJI && EMOJI[w.w] && !CAFE_SKIP.has(w.w) && !seen.has(w.w) && seen.add(w.w)); }
const cafeArt = (w) => (CAFE_SOME.has(w) ? 'some ' : /^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
const cafeList = (a) => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const cafeSay = (items, fmt) => CAFE_FMT[fmt](cafeList(items.map((w) => cafeArt(w.w))));

function renderCafe() {
  if (!EMOJI) { withLoading(loadEmoji()).then(() => { if (current === 'cafe') renderCafe(); }); return; }
  const c = S.cafe;
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="cfBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${mascotSvg({ mood: 'happy', size: 96, equip: { ...(S.mascot.equip || {}), body: (S.owned || []).includes('acc:apron') ? 'apron' : (S.mascot.equip || {}).body } })}</div>
      <div class="h2" style="margin:2px 0">🍜 ร้านน้องคำ</div><p class="small">ลูกค้าสั่งเป็นภาษาอังกฤษ ฟังแล้วหยิบอาหารให้ถูกแล้วกด 🛎️ เสิร์ฟ</p>
      <p class="small muted">ดีที่สุด ${c.best}/${CAFE_N} คนต่อวัน · เสิร์ฟไปแล้วทั้งหมด ${c.total} คน</p>
      <button class="btn primary block" id="cfGo">☀️ เปิดร้าน</button></div>
    <p class="small muted" style="margin:10px 4px">วันละ ${CAFE_N} คน (สั่ง 1 → 3 อย่าง) · เสิร์ฟผิดหรือช้าเกิน ${CAFE_TIME} วินาทีนับเป็นพลาด พลาด ${CAFE_STRIKES} ครั้งปิดร้าน · ทิปเป็น 🪙 1–3 ต่อคน ยิ่งเร็วยิ่งได้มาก (กด 👀 ดูข้อความแล้วทิปลด 1) · เสิร์ฟครบ ${CAFE_APRON} คนได้ 🧑‍🍳 ผ้ากันเปื้อนให้น้องคำ</p>`;
  $('#cfBack').onclick = () => go('fun');
  $('#cfGo').onclick = () => runCafe();
}

function runCafe() {
  const all = cafeItems();
  let g = 0, served = 0, strikes = 0, coins = 0, alive = true, tick = 0;
  cleanup = () => { alive = false; clearInterval(tick); };
  const guest = () => {
    if (!alive) return;
    if (g >= CAFE_N || strikes >= CAFE_STRIKES) return end();
    const n = g < 3 ? 1 : g < 6 ? 2 : 3, order = shuffle(all).slice(0, n), shelf = shuffle([...order, ...shuffle(all.filter((w) => !order.includes(w))).slice(0, CAFE_SHELF - n)]);
    const fmt = Math.floor(Math.random() * CAFE_FMT.length), text = cafeSay(order, fmt), face = pick(CAFE_GUESTS), picked = new Set(), t0 = Date.now();
    let peek = false, done = false;
    cafeRun.order = order; cafeRun.shelf = shelf; // read by tests
    $("#title").textContent = `🍜 ลูกค้า ${g + 1}/${CAFE_N}`;
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="cfQuit" aria-label="ปิดร้าน">✕</button><div class="progress cf-pat"><div id="cfBar" style="width:100%"></div></div><span class="small">${'❌'.repeat(strikes)}${'⚪'.repeat(CAFE_STRIKES - strikes)} · 🪙 ${coins}</span></div>
      <div class="card-box cf-guest pop"><span class="cf-face" aria-hidden="true">${face}</span><div class="grow"><div class="cf-bubble"><button class="speak" id="cfSay" aria-label="ฟังลูกค้าอีกครั้ง" style="width:52px;height:52px;font-size:24px;margin:0">🔊</button>
        <span id="cfText" lang="en" class="en" hidden>${esc(text)}</span><button class="pw-btn" id="cfPeek">👀 ดูข้อความ</button></div><div class="small muted">สั่ง ${n} อย่าง</div></div></div>
      <div class="cf-shelf">${shelf.map((w, k) => `<button class="cf-item" data-k="${k}" aria-pressed="false" aria-label="${esc(w.w)}">${EMOJI[w.w]}</button>`).join('')}</div>
      <button class="btn primary block" id="cfServe" disabled>🛎️ เสิร์ฟ</button><div class="reveal" id="reveal" aria-live="polite"></div>`;
    speak(text);
    $('#cfQuit').onclick = () => end();
    $('#cfSay').onclick = () => speak(text);
    $('#cfPeek').onclick = () => { peek = true; $('#cfText').hidden = false; $('#cfPeek').remove(); };
    view.querySelector('.cf-shelf').onclick = (e) => {
      const b = e.target.closest('.cf-item'); if (!b || done) return;
      const k = +b.dataset.k;
      if (picked.has(k)) picked.delete(k); else picked.add(k);
      b.classList.toggle('on', picked.has(k)); b.setAttribute('aria-pressed', picked.has(k));
      $('#cfServe').disabled = !picked.size;
    };
    const finish = (timeUp) => {
      if (done || !alive) return; done = true; clearInterval(tick);
      const got = new Set([...picked].map((k) => shelf[k])), ok = !timeUp && got.size === order.length && order.every((w) => got.has(w));
      order.forEach((w) => gameResult(w, got.has(w) && !timeUp));
      view.querySelectorAll('.cf-item').forEach((b) => { const w = shelf[+b.dataset.k]; if (order.includes(w)) b.classList.add('want'); else if (picked.has(+b.dataset.k)) b.classList.add('wrong'); b.disabled = true; });
      $('#cfServe').disabled = true; $('#cfText').hidden = false; const pk = $('#cfPeek'); if (pk) pk.remove();
      if (ok) {
        const left = 1 - (Date.now() - t0) / 1000 / CAFE_TIME, tip = Math.max(1, 1 + (left > 0.6 ? 2 : left > 0.3 ? 1 : 0) - (peek ? 1 : 0));
        served++; coins += tip; addCoins(tip); addXP(2 * order.length); sfx('ok');
        $('#reveal').innerHTML = `😋 Thank you! ทิป 🪙 ${tip}`;
      } else { strikes++; sfx('bad'); $('#reveal').innerHTML = `${timeUp ? '⌛ ช้าไป ลูกค้ากลับแล้ว' : '😕 ไม่ใช่ที่สั่ง'} · ที่สั่งคือ ${order.map((w) => `${EMOJI[w.w]} <b lang="en">${esc(w.w)}</b> (${esc(thFirst(w.t))})`).join(', ')}`; }
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
    const c = S.cafe, best = served > c.best;
    c.best = Math.max(c.best, served); c.total += served;
    let msg = '';
    if (c.total >= CAFE_APRON && !(S.owned || []).includes('acc:apron')) { (S.owned = S.owned || []).push('acc:apron'); msg = '<p class="small"><b>🧑‍🍳 ได้ผ้ากันเปื้อนสำหรับน้องคำ!</b></p>'; }
    save();
    if (served >= 6) confetti(served === CAFE_N ? 'burst' : undefined);
    $('#title').textContent = 'ร้านน้องคำ';
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${served >= 6 ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 96 })}</div>` : '🍜'}</div>
      <div class="h2" style="margin:4px 0">ปิดร้านแล้ว · เสิร์ฟ ${served}/${CAFE_N} คน${best ? ' · สถิติใหม่! 🏅' : ''}</div>
      <p class="small">ได้ทิป 🪙 ${coins} · เสิร์ฟสะสม ${c.total} คน</p>${msg}
      <button class="btn primary block" id="cfAgain">☀️ เปิดร้านอีกวัน</button><button class="btn ghost block" id="cfHome" style="margin-top:8px">🍜 กลับหน้าร้าน</button></div>`;
    $('#cfAgain').onclick = () => runCafe();
    $('#cfHome').onclick = () => renderCafe();
    updateStreak();
  };
  guest();
}
const cafeRun = {};
FUN_TILES.push({ id: 'cafe', o: 15, home: false, ic: '🍜', name: 'ร้านน้องคำ', sub: () => (S.cafe.total ? `เสิร์ฟแล้ว ${S.cafe.total} คน` : 'ฟังลูกค้าสั่งอาหาร'), go: () => go('cafe') });
