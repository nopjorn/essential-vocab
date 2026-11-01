'use strict';
// น้องคำ's room (1.122, single player; route `room`): buy furniture and pets with coins; each thing is a list word with its picture
// (data/emoji.js) and sits at a fixed place in the room. Tap a thing → hear the English word and see the Thai meaning (labels can be shown).
// State: S.room = { own: [words] } (cleanRoom() / union merge in app.js). Classic script sharing globals with app.js.

// [word, price, x %, y %, size em] — x/y = the thing's centre in the room box (wall above 58 %, floor below)
const ROOM_ITEMS = [
  ['window', 20, 20, 22, 2.6], ['clock', 15, 50, 14, 1.8], ['mirror', 25, 80, 26, 2.2], ['lamp', 20, 88, 62, 2.4],
  ['bed', 60, 22, 72, 3.4], ['chair', 25, 66, 76, 2.4], ['plant', 15, 6, 74, 2.2], ['flower', 10, 62, 52, 1.6],
  ['book', 10, 42, 56, 1.5], ['television', 50, 44, 36, 2.6], ['radio', 20, 32, 52, 1.6], ['computer', 60, 50, 54, 2],
  ['guitar', 45, 94, 82, 2.4], ['piano', 80, 80, 90, 2.8], ['toy', 15, 40, 90, 1.6], ['balloon', 10, 8, 22, 2],
  ['candle', 10, 70, 52, 1.4], ['camera', 30, 56, 56, 1.4], ['cat', 40, 30, 92, 2], ['dog', 50, 56, 92, 2.2], ['fish', 35, 74, 54, 1.4],
];
let roomLabels = false;
const roomOwn = () => (S.room && S.room.own) || [];
const roomWord = (w) => W.find((x) => x.w === w);
function renderRoom() {
  if (!EMOJI) { withLoading(loadEmoji()).then(() => { if (current === 'room') renderRoom(); }); return; }
  const own = new Set(roomOwn()), items = ROOM_ITEMS.filter(([w]) => EMOJI[w] && roomWord(w));
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="rmBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="room${roomLabels ? ' lbl' : ''}" role="group" aria-label="ห้องของน้องคำ">
      <div class="room-m" aria-hidden="true">${mascotSvg({ mood: own.size >= 5 ? 'happy' : 'normal', size: 84 })}</div>
      ${items.filter(([w]) => own.has(w)).map(([w, , x, y, s]) => `<button class="room-it" data-rw="${w}" style="left:${x}%;top:${y}%;font-size:${s}em" aria-label="${esc(w)} ${esc(thFirst(roomWord(w).t))}">${EMOJI[w]}<small lang="en">${esc(w)}</small></button>`).join('')}
    </div>
    <div class="row" style="margin:8px 0;gap:8px"><span class="small muted grow">มีแล้ว ${own.size}/${items.length} ชิ้น · แตะของในห้องเพื่อฟังคำ</span><button class="chip${roomLabels ? ' on' : ''}" id="rmLbl" aria-pressed="${roomLabels}">🏷️ ป้ายชื่อ</button></div>
    <div class="card-box"><b>🛋️ ซื้อของแต่งห้อง</b>${items.filter(([w]) => !own.has(w)).map(([w, price]) => `<div class="wrow shop-row"><span class="shop-ic" aria-hidden="true">${EMOJI[w]}</span><div class="grow"><b lang="en">${esc(w)}</b><div class="small muted">${esc(thFirst(roomWord(w).t))}</div></div>
      <button class="btn${coinBal() >= price ? ' primary' : ''}" data-rbuy="${w}" ${coinBal() >= price ? '' : 'disabled'}>🪙 ${price}</button></div>`).join('') || '<p class="small">🎉 ซื้อครบทุกชิ้นแล้ว ห้องสวยมาก!</p>'}</div>`;
  $('#rmBack').onclick = () => go('fun');
  $('#rmLbl').onclick = () => { roomLabels = !roomLabels; renderRoom(); };
  view.onclick = (e) => {
    const it = e.target.closest('[data-rw]'), b = e.target.closest('[data-rbuy]');
    if (it) { const w = roomWord(it.dataset.rw); speak(w.w); toast(`${EMOJI[w.w]} ${w.w} = ${thFirst(w.t)}`); it.classList.remove('bounce'); void it.offsetWidth; it.classList.add('bounce'); }
    else if (b) {
      const row = ROOM_ITEMS.find(([w]) => w === b.dataset.rbuy);
      if (!row || own.has(row[0]) || !spendCoins(row[1])) return;
      S.room.own = [...roomOwn(), row[0]]; markActive(); save(); sfx('win'); speak(row[0]);
      toast(`🛋️ ได้ ${EMOJI[row[0]]} ${row[0]} แล้ว!`);
      const top = view.scrollTop; renderRoom(); view.scrollTop = top;
    }
  };
  cleanup = () => { view.onclick = null; };
}
FUN_TILES.push({ id: 'room', o: 35, ic: '🏠', name: 'ห้องของน้องคำ', sub: () => `ของแต่งห้อง ${roomOwn().length}/${ROOM_ITEMS.length} ชิ้น`, go: () => go('room') });
