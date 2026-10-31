'use strict';
// Fun zone (1.115, single player): hub page (route `fun`), coins 🪙 and the coin shop (route `coinshop`), plus funAsk(): one
// multiple-choice question with power-ups (50:50, skip, +1 heart) shared by the tower (js/tower.js) and the other fun pages.
// Coins: S.coin = { device id: [earned, spent] } (each device only writes its own bucket, so syncing keeps the larger numbers;
// cleanCoin()/merge live in app.js). Later fun files add their tile to FUN_TILES. Classic script sharing globals with app.js.

/* ---------- coins ---------- */
const coinBal = () => Object.values(S.coin || {}).reduce((n, v) => n + v[0] - v[1], 0);
function addCoins(n) {
  if (!(n > 0)) return;
  const m = (S.coin[DEV] = S.coin[DEV] || [0, 0]);
  m[0] += n;
  S.counts.maxCoin = Math.max(S.counts.maxCoin || 0, coinBal());
  coinFly(n);
  save();
}
function spendCoins(n) {
  if (coinBal() < n) { toast(`🪙 เหรียญไม่พอ (มี ${coinBal()} ต้องใช้ ${n})`); return false; }
  const m = (S.coin[DEV] = S.coin[DEV] || [0, 0]);
  m[1] += n;
  save();
  return true;
}
function coinFly(n) {
  if (document.documentElement.classList.contains('no-ans')) return;
  const el = document.createElement('div');
  el.className = 'coin-fly'; el.setAttribute('aria-hidden', 'true'); el.textContent = `🪙 +${n}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
const coinPill = () => `<span class="coin-pill" role="img" aria-label="มีเหรียญ ${coinBal()} เหรียญ">🪙 <b>${coinBal()}</b></span>`;

/* ---------- one question with power-ups ---------- */
const PW_COST = { fifty: 5, skip: 8, heart: 15 };
// kind: en2th | th2en | listen | cloze. o: { top: header markup, sub: label above the prompt, hard: harder distractors,
// alive: () => false once the page was left (the next question is not drawn), heart: fn (shows the +1 heart power-up; called when bought), practice: true = no SRS update (markActive only),
// onDone(ok, how) — how = 'skip' when skipped with a power-up }. A skipped question counts as right but never touches the card.
function funAsk(w, kind, o) {
  if (kind === 'cloze' && !hasCloze(w)) kind = 'en2th';
  const toTh = kind === 'en2th' || kind === 'listen';
  const opts = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w', !!o.hard)]);
  let prompt;
  if (kind === 'en2th') prompt = `<div class="word" lang="en">${esc(w.w)}</div><div class="pos">${esc(w.p)}</div>`;
  else if (kind === 'th2en') prompt = `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
  else if (kind === 'cloze') prompt = `<div class="cloze" lang="en">${esc(w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000')).replace('\u0000', '<span class="blank">_____</span>')}</div>`;
  else prompt = `<button class="speak" data-fsay aria-label="ฟังอีกครั้ง" style="width:84px;height:84px;font-size:38px;margin:0">🔊</button><div class="muted small" style="margin-top:8px">ฟังแล้วเลือกความหมาย</div>`;
  funAsk.cur = w; funAsk.opts = opts; // read by tests
  const label = (x) => (toTh ? x.t : kind === 'cloze' ? clozeOpt(x, w) : x.w);
  const pw = (id, ic, name) => `<button class="pw-btn" data-pw="${id}" ${coinBal() < PW_COST[id] ? 'disabled' : ''} aria-label="${name} ใช้ ${PW_COST[id]} เหรียญ">${ic} ${name} <small>🪙${PW_COST[id]}</small></button>`;
  view.innerHTML = `${o.top || ''}
    <div class="card-box q-prompt fit pop">${o.sub ? `<div class="small muted">${o.sub}</div>` : ''}${lvBadge(w.g)}<div style="height:6px"></div>${prompt}</div>
    <div class="options">${opts.map((x, n) => `<button class="opt" data-k="${n}"${toTh ? '' : ' lang="en"'}>${esc(label(x))}</button>`).join('')}</div>
    <div class="pw-row">${pw('fifty', '✂️', '50:50')}${pw('skip', '⏭️', 'ข้าม')}${o.heart ? pw('heart', '❤️', '+1 หัวใจ') : ''}</div>
    <div class="reveal" id="reveal" aria-live="polite"></div>`;
  if (kind === 'listen' || kind === 'en2th') speak(w.w);
  const sayBtn = view.querySelector('[data-fsay]');
  if (sayBtn) sayBtn.onclick = () => speak(w.w);
  let answered = false;
  const finish = (ok, how) => {
    if (answered) return; answered = true;
    view.querySelectorAll('.opt').forEach((b) => { if (opts[+b.dataset.k] === w) b.classList.add('correct'); b.disabled = true; });
    view.querySelectorAll('.pw-btn').forEach((b) => { b.disabled = true; });
    if (how !== 'skip') { if (o.practice) markActive(); else gameResult(w, ok); }
    else markActive();
    sfx(ok ? 'ok' : 'bad');
    if (!ok) $('#reveal').innerHTML = `❌ ที่ถูกคือ <b lang="en">${esc(w.w)}</b> = ${esc(w.t)}`;
    else if (how === 'skip') $('#reveal').textContent = `⏭️ ข้ามแล้ว: ${w.w} = ${w.t}`;
    setTimeout(() => { if (!o.alive || o.alive()) o.onDone(ok, how); }, ok ? 650 : 1500);
  };
  view.querySelector('.options').onclick = (ev) => {
    const b = ev.target.closest('.opt'); if (!b || answered) return;
    const ok = opts[+b.dataset.k] === w;
    if (!ok) b.classList.add('wrong');
    finish(ok);
  };
  view.querySelector('.pw-row').onclick = (ev) => {
    const b = ev.target.closest('[data-pw]'); if (!b || answered || b.disabled) return;
    const id = b.dataset.pw;
    if (!spendCoins(PW_COST[id])) return;
    S.counts.pw = (S.counts.pw || 0) + 1;
    b.disabled = true;
    if (id === 'fifty') {
      shuffle([...view.querySelectorAll('.opt')].filter((x) => opts[+x.dataset.k] !== w)).slice(0, 2).forEach((x) => { x.disabled = true; x.classList.add('gone'); });
    } else if (id === 'skip') finish(true, 'skip');
    else if (id === 'heart') { o.heart(); toast('❤️ ได้หัวใจเพิ่ม 1 ดวง'); }
    view.querySelectorAll('.pw-btn').forEach((x) => { if (coinBal() < PW_COST[x.dataset.pw]) x.disabled = true; });
  };
}

/* ---------- hub ---------- */
// Each fun page adds { id, ic, name, sub: () => status text, go: () => open it } (in load order).
const FUN_TILES = [];
const funTiles = () => FUN_TILES.slice().sort((a, b) => a.o - b.o); // o = position on the hub
function renderFun() {
  const secret = ACH.filter((a) => a.secret), found = secret.filter((a) => S.ach[a.id]).length;
  view.innerHTML = `<div class="card-box fun-head"><div class="grow"><b>🎪 โซนสนุก</b><div class="small muted">เล่นคนเดียวได้ทุกอย่าง · ได้ทั้ง XP และ 🪙 เหรียญ</div></div>${coinPill()}</div>
    <div class="fun-grid">${funTiles().map((t) => `<button class="fun-tile" data-fun="${t.id}"><span class="fun-ic" aria-hidden="true">${t.ic}</span><b>${t.name}</b><small>${t.sub()}</small></button>`).join('')}</div>
    <button class="card-box guide-link" id="funSecret"><span>🥚</span><div class="grow"><b>เหรียญลับ ${found}/${secret.length}</b><div class="small muted">ไม่บอกเงื่อนไข ลองเล่นทุกอย่างแล้วจะเจอเอง · ดูได้ที่หน้าสถิติ</div></div><span class="muted">›</span></button>
    <p class="small muted" style="margin:10px 4px">🪙 เหรียญได้จากหอคอย ปริศนาประจำวัน คดีนักสืบ ร้านน้องคำ และกล่องรางวัล ใช้ซื้อตัวช่วยในเกม (✂️ 50:50 · ⏭️ ข้าม · ❤️ หัวใจ) หรือของแต่งตัวน้องคำที่ร้านค้า</p>`;
  view.querySelector('.fun-grid').onclick = (e) => {
    const b = e.target.closest('[data-fun]'); if (!b) return;
    const t = FUN_TILES.find((x) => x.id === b.dataset.fun); if (t) t.go();
  };
  $('#funSecret').onclick = () => go('stats');
}
function funCard() {
  const t = funTiles().filter((x) => x.home).slice(0, 3);
  return `<button class="card-box guide-link fun-card" data-go="fun"><span>🎪</span><div class="grow"><b>โซนสนุก ${coinPill()}</b>
    <div class="small muted">${t.map((x) => `${x.ic} ${x.sub()}`).join(' · ')}</div></div><span class="muted">›</span></button>`;
}

/* ---------- coin shop ---------- */
// Mascot items with a `coin` price are sold here; items that open at a level can also be bought early for 25 coins per level.
const shopPrice = (it) => (it.coin ? it.coin : isFinite(it.lv) ? it.lv * 25 : 0);
function shopItems() { return ITEMS.filter((it) => shopPrice(it) > 0); }
function renderCoinShop() {
  const row = (it) => {
    const open = itemOpen(it.id), price = shopPrice(it);
    return `<div class="wrow shop-row"><span class="shop-ic" aria-hidden="true">${it.ic}</span><div class="grow"><b>${esc(it.name)}</b><div class="small muted">${it.coin ? 'มีเฉพาะที่ร้านนี้' : `เปิดเองที่ Lv.${it.lv} · ซื้อก่อนได้`}</div></div>
      ${open ? '<span class="small">✅ มีแล้ว</span>' : `<button class="btn${coinBal() >= price ? ' primary' : ''}" data-buy="${it.id}" ${coinBal() >= price ? '' : 'disabled'}>🪙 ${price}</button>`}</div>`;
  };
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="csBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">${mascotSvg({ mood: 'happy', size: 96 })}</div><div class="h2" style="margin:4px 0">🛍️ ร้านค้าเหรียญ</div>
      <p class="small muted">ของที่ซื้อแล้วไปใส่ให้น้องคำได้ที่หน้าน้องคำ (ตู้เสื้อผ้า)</p></div>
    <div class="card-box">${shopItems().map(row).join('')}</div>
    <button class="btn block" id="csWear">🐣 ไปแต่งตัวน้องคำ</button>`;
  $('#csBack').onclick = () => go('fun');
  $('#csWear').onclick = () => go('mascot');
  view.onclick = (e) => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    const it = ITEMS.find((x) => x.id === b.dataset.buy);
    if (!it || itemOpen(it.id) || !spendCoins(shopPrice(it))) return;
    (S.owned = S.owned || []).push(it.id);
    S.counts.buys = (S.counts.buys || 0) + 1;
    save(); sfx('win'); toast(`🛍️ ได้ ${it.ic} ${it.name} แล้ว!`);
    const top = view.scrollTop; renderCoinShop(); view.scrollTop = top;
  };
  cleanup = () => { view.onclick = null; };
}
FUN_TILES.push({ id: 'shop', o: 90, ic: '🛍️', name: 'ร้านค้าเหรียญ', sub: () => `🪙 ${coinBal()} เหรียญ`, go: () => go('coinshop') });
