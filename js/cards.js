'use strict';
// Flashcards hub and session (SRS grading).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- flashcards ---------- */
const SHORT_N = 12; // cards in a "3 minutes" session
// "Tomorrow" box for the end of a session: what is waiting, so there is a reason to come back.
function tomorrowBox() {
  const st = new Date(); st.setHours(0, 0, 0, 0);
  const endT = st.getTime() + 2 * DAY, p = pool();
  const due = p.filter((w) => S.prog[w.w] && S.prog[w.w].d < endT);
  const plan = backlogPlan();
  const rev = plan.on ? Math.min(due.length, BACKLOG_CAP) : due.length;
  const unseen = p.filter((w) => !S.prog[w.w] && inTopic(w)).length;
  const nw = plan.on || due.length > BACKLOG_PAUSE ? 0 : Math.min(newGoal(), unseen);
  if (!rev && !nw) return '';
  const leech = due.filter(isLeech).length, mins = Math.max(1, Math.ceil((rev + nw) / 4));
  return `<div class="card-box center tomorrow"><b>🌙 พรุ่งนี้รอคุณอยู่</b>
    <div style="margin-top:4px">ทบทวน ${rev} ใบ${nw ? ` + คำใหม่ ${nw} คำ` : ''}${leech ? ` · 🐢 คำดื้อ ${leech} คำกลับมาให้ฝึก` : ''}</div>
    <div class="small muted">ใช้เวลาประมาณ ${mins} นาที</div></div>`;
}
// Words that give each other away or get mixed up when they sit close together (1.107): the same family (decide / decision),
// the same Thai meaning (afraid / scared, big / large) or a confusable pair (borrow / lend). Same kind of key = related.
let CONF_OF = null;
function relatedKeys(w) {
  const ks = [];
  const f = FAMILIES && familyOf(w.w); if (f) ks.push(f);
  for (const m of String(w.t || '').split(/[;,]/)) { const x = m.trim(); if (x.length >= 2) ks.push('m:' + x); }
  if (typeof CONFUSE !== 'undefined' && CONFUSE) {
    if (!CONF_OF) { CONF_OF = new Map(); CONFUSE.forEach((c, k) => { CONF_OF.set(c.a.toLowerCase(), k); CONF_OF.set(c.b.toLowerCase(), k); }); }
    if (CONF_OF.has(w.w.toLowerCase())) ks.push('c:' + CONF_OF.get(w.w.toLowerCase()));
  }
  return ks;
}
// Related words shouldn't follow each other: take the earliest card that shares no key with the last `gap` placed ones.
function spreadFamilies(q, gap = 4) {
  if (q.length < 2 || q.length > 400) return q;
  const keys = new Map(q.map((w) => [w, relatedKeys(w)])), pool = q.slice(), out = [];
  while (pool.length) {
    const recent = new Set(out.slice(-gap).flatMap((w) => keys.get(w)));
    let k = pool.findIndex((w) => !keys.get(w).some((x) => recent.has(x)));
    if (k < 0) k = 0;
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
// Today's new words: not related to each other, nor to a word started in the last days (still being learned), so two near
// meanings aren't met at the same time. Falls back to related ones when there aren't enough others.
function separateNew(fresh, n, map = S.prog) {
  if (fresh.length <= 1) return fresh.slice(0, n);
  const block = new Set(), picked = [], later = [];
  for (const w of W) { const p = map[w.w]; if (p && (p.s || 0) <= 3 && ivlOf(p) < 7) relatedKeys(w).forEach((x) => block.add(x)); }
  for (const w of fresh) {
    if (picked.length >= n) break;
    const ks = relatedKeys(w);
    if (ks.some((x) => block.has(x))) { later.push(w); continue; }
    picked.push(w); ks.forEach((x) => block.add(x));
  }
  return picked.concat(later).slice(0, n);
}
function buildQueue(extra) {
  return spreadFamilies(buildQueueRaw(extra));
}
function buildQueueRaw(extra) {
  rollDay();
  const p = pool();
  if (extra === 'backlog') return dueList().slice(0, BACKLOG_CAP);
  const plan = backlogPlan();
  const due = dueList().slice(0, plan.on ? plan.show : 200);
  if (extra === 'again') return cardsAgain.slice(); // 🔁 the words forgotten in the round just finished
  if (typeof extra === 'string' && extra.startsWith('f:')) return hubPick(...extra.slice(2).split(':')).slice(0, HUB_PICK_N); // 🎯 one level and/or topic
  if (extra === 'rev') return due; // 🔁 start screen (1.169): today's reviews only
  let fresh = p.filter((w) => !S.prog[w.w] && inTopic(w));
  if (S.settings.order === 'shuffle') fresh = shuffle(fresh);
  if (extra === 'new') return plan.on ? [] : separateNew(fresh, Math.max(0, newGoal() - S.daily.fresh)); // ✨ start screen: today's new words only
  if (extra === 'short') {
    // 3-minute session: the most overdue cards, topped up with new words (unless a backlog is being cleared).
    const d = dueList().slice(0, SHORT_N);
    const room = backlogPlan().on ? 0 : SHORT_N - d.length;
    if (fresh.length && room > 0) d.push(...fresh.slice(0, room));
    return d.length ? d : p.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, SHORT_N);
  }
  if (typeof extra === 'string' && extra.startsWith('tp:')) { // 💧 watering a garden plant (js/collect.js): that topic's due words
    const id = extra.slice(3), ws = W.filter((w) => w.tp === id && S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d);
    return ws.filter((w) => S.prog[w.w].d <= Date.now()).slice(0, 30);
  }
  if (extra === 'leech') return shuffle(W.filter(isLeech)).slice(0, 15); // 🐢 leech session: back of each card shows the memory hook
  if (extra === 'mastered') return shuffle(masteredWords()).slice(0, 20);
  if (extra === 'learning') return shuffle(W.filter((w) => status(w) === 'learning')).slice(0, 20);
  if (extra === 'ahead') return W.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, 20);
  const n = extra ? 10 : plan.on ? 0 : Math.max(0, newGoal() - S.daily.fresh);
  fresh = separateNew(fresh, n);
  // Mix new cards in among reviews so a session doesn't end with only new words.
  const q = [];
  const step = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : 0;
  let di = 0;
  fresh.forEach((w) => { q.push(...due.slice(di, di + step)); di += step; q.push(w); });
  q.push(...due.slice(di));
  if (!q.length && extra) {
    // Nothing new left: practise learned words that are closest to being due.
    return W.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, 20);
  }
  return q;
}

// "What next?" menu shown when the flashcards for today are done (empty queue or end of a round) and under the start screen:
// three groups (learn more · review a group of words · other ways to practise) and one button marked แนะนำ for the situation.
function nextSteps(learned, noRec) { // noRec: the start screen (its ▶︎ is the recommendation)
  const unseen = pool().filter((w) => !S.prog[w.w]).length;
  const mastered = masteredWords().length;
  const learning = W.filter((w) => status(w) === 'learning').length;
  const backlog = backlogPlan().on ? dueList().length : 0;
  const leech = W.filter(isLeech).length, star = W.filter(isStar).length;
  const rec = noRec ? '' : backlog ? 'backlog' : leech >= 3 ? 'leech' : unseen && S.daily.fresh < newGoal() ? 'more' : learning >= 10 ? 'learning' : unseen ? 'more' : 'play';
  const b = (id, ic, t, d) => `<button class="quick-btn${id === rec ? ' rec' : ''}" data-ns="${id}">${id === rec ? '<i class="ns-rec">แนะนำ</i>' : ''}<span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
  const grp = (h, items) => (items.join('') ? `<section class="ns-grp"><h3 class="ns-h">${h}</h3><div class="quick next-steps">${items.join('')}</div></section>` : '');
  return `<div class="ns-wrap">${grp('📚 เรียนเพิ่ม', [
    backlog ? b('backlog', '🧹', 'ทวนค้างอีก 50 ใบ', 'ยังเหลือ ' + backlog + ' ใบ ค่อยๆ เคลียร์ได้') : '',
    unseen ? b('more', '➕', 'คำใหม่อีก 10 คำ', 'เรียนล่วงหน้าเกินเป้าวันนี้') : '',
    learned >= 4 ? b('ahead', '🔮', 'ทบทวนล่วงหน้า', '20 ใบที่ใกล้ถึงกำหนดที่สุด') : '',
  ])}${grp('🔁 ทบทวนเฉพาะกลุ่ม', [
    learning ? b('learning', '🟡', 'คำที่กำลังเรียน', 'สุ่ม 20 ใบ จาก ' + learning + ' คำ') : '',
    mastered ? b('mastered', '🟢', 'คำที่จำได้แล้ว', 'สุ่ม 20 ใบ จาก ' + mastered + ' คำ') : '',
    leech ? b('leech', '🐢', 'ฝึกคำดื้อ', leech + ' คำที่ลืมบ่อย') : '',
    star ? b('star', '⭐', 'ฝึกคำติดดาว', star + ' คำที่ติดดาวไว้') : '',
  ])}${grp('🎮 ฝึกแบบอื่น', [
    b('feed', '📱', 'ไถศัพท์', 'ปัดดูทีละคำ ไม่มีวันจบ'),
    b('ear', '🎧', 'ฟังทบทวน', 'ฟังคำ นึกความหมาย ไม่ต้องดูจอ'),
    b('play', '⚡', 'เล่นด่วน', 'เกมสุ่ม 10 ข้อ ~1 นาที'),
    ...(S.settings.nextGames || []).filter((g) => GAMES[g]).map((g) => b('g:' + g, GAMES[g].icon, GAMES[g].name, GAMES[g].desc)),
  ])}</div>`;
}
function bindNextSteps() {
  const hub = !!$('#hubStart'); // on the start screen: ✕ in the session comes back to it
  view.querySelectorAll('[data-ns]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.ns;
      cardsFromHub = hub;
      if (id === 'more') go('cards', true);
      else if (id === 'ahead') go('cards', 'ahead');
      else if (id === 'backlog') go('cards', 'backlog');
      else if (id === 'mastered') go('cards', 'mastered');
      else if (id === 'learning') go('cards', 'learning');
      else if (id === 'play') quickPlay();
      else if (id === 'leech') go('cards', 'leech');
      else if (id === 'star') { gameSource = id; startGame('en2th'); }
      else if (id.startsWith('g:')) { // extra games picked in settings (nextGames)
        gameSource = W.filter((w) => S.prog[w.w] && S.settings.levels.includes(w.g)).length >= 10 ? 'learned' : 'level';
        startGame(id.slice(2));
      }
      else go(id);
    };
  });
}

/* ---------- start screen (1.169) ---------- */
// The แฟลชการ์ด tab opens this page first (go('cards', 'hub')); other ways in (home ▶︎ เริ่มเรียนเลย, quests …) still start right away.
// It shows what today holds (reviews, new words, stubborn ones, about how long) and how to study it.
let cardsFromHub = false;
let cardsAgain = []; // words forgotten in the last round (summary → 🔁 ฝึกคำที่ลืมอีกรอบ) // ✕ in a session started here goes back here, not home
// 🎯 Review one level and/or topic (start screen): learned words of that group, the ones due soonest (overdue first).
const HUB_PICK_N = 20;
function hubPick(lv, tp) {
  return W.filter((w) => S.prog[w.w] && (!lv || w.g === lv) && (!tp || w.tp === tp)).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d);
}
function hubPickBox() {
  const seen = W.filter((w) => S.prog[w.w]);
  if (seen.length < 5) return '';
  const f = S.settings.cardPick || {}, lv = LEVELS.includes(f.lv) ? f.lv : '', tp = TOPIC_IC[f.tp] ? f.tp : '';
  const lvs = LEVELS.filter((l) => seen.some((w) => w.g === l)), tps = TOPICS.filter(([id]) => seen.some((w) => w.tp === id));
  return `<div class="card-box ch-pick"><div class="ch-h">🎯 ทบทวนเฉพาะระดับ / หมวด</div>
    <div class="sel-pair"><select class="sel block-sel" id="hubLv" aria-label="ระดับ"><option value="">ทุกระดับ</option>${lvs.map((l) => `<option value="${l}" ${l === lv ? 'selected' : ''}>${LV_LABEL[l]}</option>`).join('')}</select>
      <select class="sel block-sel" id="hubTp" aria-label="หมวด"><option value="">ทุกหมวด</option>${tps.map(([id, ic, name]) => `<option value="${id}" ${id === tp ? 'selected' : ''}>${ic} ${esc(name)}</option>`).join('')}</select></div>
    <button class="btn block" id="hubPickGo"></button></div>`;
}
function bindHubPick() {
  const go_ = $('#hubPickGo'); if (!go_) return;
  const upd = () => {
    const lv = $('#hubLv').value, tp = $('#hubTp').value, ws = hubPick(lv, tp), n = Math.min(HUB_PICK_N, ws.length);
    const due = ws.filter((w) => S.prog[w.w].d <= Date.now()).length;
    go_.disabled = !n;
    go_.textContent = n ? `▶︎ ทบทวน ${n} ใบ${due ? ` (ถึงกำหนด ${due})` : ''}` : 'ยังไม่มีคำที่เรียนแล้วในกลุ่มนี้';
    return { lv, tp };
  };
  $('#hubLv').onchange = $('#hubTp').onchange = () => { S.settings.cardPick = upd(); save(); };
  upd();
  go_.onclick = () => { const { lv, tp } = upd(); cardsFromHub = true; renderCards(`f:${lv}:${tp}`); };
}
function hubToday() {
  const q = buildQueueRaw();
  const due = q.filter((w) => S.prog[w.w]), nw = q.length - due.length;
  const leech = due.filter(isLeech).length;
  const mins = Math.max(1, Math.round((due.length + nw * NEW_COST) * secPerCard() / 60));
  return { total: q.length, due: due.length, nw, leech, mins };
}
function renderCardHub() {
  const t = hubToday(), plan = backlogPlan();
  if (!t.total) return renderCards(); // nothing today: the "done" page with its what-next menu
  const stat = (n, label, cls = '') => `<div class="ch-st${cls}"><b>${n}</b><span>${label}</span></div>`;
  const b = (id, ic, title, sub) => `<button class="quick-btn" data-hub="${id}"><span>${ic}</span><b>${title}</b><small>${sub}</small></button>`;
  view.innerHTML = `<div class="card-box ch-top">
      <div class="ch-h">🗂️ การ์ดวันนี้ <span class="small muted">· ระดับ ${lvNames(S.settings.levels)}</span></div>
      <div class="ch-stats">${stat(t.due, 'ทบทวน')}${stat(t.nw, 'คำใหม่')}${t.leech ? stat(t.leech, '🐢 คำดื้อ') : ''}${stat('~' + t.mins, 'นาที')}</div>
      ${plan.on ? '<p class="small muted ch-note">🧹 การ์ดค้างเยอะ วันนี้พักคำใหม่ไว้ก่อน ทวนทีละ 50 ใบที่ค้างนานสุด</p>' : ''}
      <div class="ch-front"><span class="small muted" id="hubFrontL">ด้านหน้าการ์ด</span><div class="seg" id="hubFront" role="group" aria-labelledby="hubFrontL">${[['en', 'อังกฤษ → ไทย'], ['th', 'ไทย → อังกฤษ'], ['mix', 'สลับกัน']].map(([v, t]) => `<button data-front="${v}" class="${(S.settings.front || 'en') === v ? 'on' : ''}" aria-pressed="${(S.settings.front || 'en') === v}">${t}</button>`).join('')}</div></div>
      <button class="btn primary block ch-go" id="hubStart">▶︎ เริ่มเลย (${t.total} ใบ)</button></div>
    <div class="quick next-steps ch-modes">
      ${b('short', '⏱️', '3 นาที', SHORT_N + ' ใบ ค้างนานสุดก่อน')}
      ${t.due && t.nw ? b('rev', '🔁', 'เฉพาะทบทวน', t.due + ' ใบที่ถึงกำหนด') : ''}
      ${t.due && t.nw ? b('new', '✨', 'เฉพาะคำใหม่', t.nw + ' คำของวันนี้') : ''}
    </div>
    ${hubPickBox()}<h2 class="ns-more">อยากฝึกแบบอื่น</h2>${nextSteps(W.filter((w) => S.prog[w.w]).length, true)}`;
  $('#hubStart').onclick = () => { cardsFromHub = true; renderCards(); };
  bindHubPick();
  view.querySelectorAll('[data-front]').forEach((el) => { // same switch as ⚙️ ตั้งค่า → การเรียน → ด้านหน้าการ์ด
    el.onclick = () => {
      S.settings.front = el.dataset.front; save();
      view.querySelectorAll('[data-front]').forEach((x) => { x.classList.toggle('on', x === el); x.setAttribute('aria-pressed', x === el); });
    };
  });
  view.querySelectorAll('[data-hub]').forEach((el) => { el.onclick = () => { cardsFromHub = true; renderCards(el.dataset.hub); }; });
  bindNextSteps();
}

// extra: undefined (today's cards), 'hub' (the start screen), 'short' (3 minutes), 'rev' / 'new' (today's reviews / new words only), true (10 more new), 'ahead', 'mastered', 'learning' (random 20 learning words), 'leech' (stubborn words, 15), or { deck: id, ahead? } = study one of my word sets.
// A set uses its own progress table `map` (S.dprog[id]); the main S.prog and the daily counts stay untouched.
function renderCards(extra) {
  if (extra === 'hub') { cardsFromHub = false; return renderCardHub(); }
  const fromHub = cardsFromHub; cardsFromHub = false;
  if (!FAMILIES || !CONFUSE) { const nav = navSeq; withLoading(Promise.all([loadFamilies(), loadPairs()])).then(() => { if (navSeq === nav) { cardsFromHub = fromHub; renderCards(extra); } }); return; } // 1.148.0: not when the user has left meanwhile // spreadFamilies() needs the family and confusable-pair data
  const deck = extra && typeof extra === 'object' ? deckById(extra.deck) : null;
  if (extra && typeof extra === 'object' && !deck) return go('decks');
  const map = deck ? deckMap(deck.id) : S.prog;
  const queue = deck ? buildDeckQueue(deck, extra) : buildQueue(extra);
  const total = queue.length;
  let done = 0, stats = { again: 0, ok: 0 };
  const t0 = Date.now(), xp0 = S.xp; let missed = []; // for the summary at the end of the round
  if (deck) { deck.used = Date.now(); save(); }
  if (deck && !total) { view.innerHTML = deckEmptyHtml(deck); bindDeckSteps(deck); return; }
  if (!total) {
    const learned = W.filter((w) => S.prog[w.w]).length;
    view.innerHTML = `<div class="card-box center pop" style="margin-top:20px">
      <div class="result-emoji">${mascotSvg({ mood: 'happy', size: 110 })}</div><div class="h2">วันนี้ทำครบแล้ว!</div>
      <p class="muted">ไม่มีการ์ดค้างสำหรับระดับ ${lvNames(S.settings.levels)} · อยากทำอะไรต่อดี?</p></div>
      ${tomorrowBox()}${hubPickBox()}${nextSteps(learned)}`;
    bindNextSteps(); bindHubPick();
    return;
  }

  view.innerHTML = `
    <div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <div class="progress"><div id="pbar" style="width:0"></div></div>
      <span class="small muted" id="pcount"></span>
      <button class="icon-btn" id="undo" aria-label="ย้อนกลับ" style="visibility:hidden">↩︎</button>
    </div>
    <div class="stage" id="stage"></div>
    <div class="grade" id="grade"></div>
    <aside class="side-stats" id="sideStats" aria-label="สถิติวันนี้"></aside>`;
  $('#quit').onclick = () => (deck ? go('decks', deck.id) : fromHub ? go('cards', 'hub') : go('home'));

  let card = null, flipped = false;
  const gradeBox = $('#grade');
  gradeBox.classList.toggle('thumbs', thumbsOn()); // tablet held with both hands: ลืม/ยาก left, จำได้/ง่าย right (1.136)
  // Undo stack: snapshots taken before each answer so a mis-tap can be reverted.
  const history = [];
  // Words marked "ยาก" while new: shown again later this session before they're scheduled for tomorrow.
  let relearn = new Set();
  const gradeLabel = (p, g) => {
    const re = relearn.has(card.w);
    if ((!p || re) && g === 1) return 'วนอีกรอบ';
    if (re && g > 1) return daysLabel(g === 3 ? 3 : 1);
    return daysLabel(sched(p, g).i);
  };
  $('#undo').onclick = () => {
    const h = history.pop(); if (!h) return;
    if (h.prev) map[h.w] = { ...h.prev, t: Date.now() }; else delete map[h.w]; // stamped now, so syncing does not bring back the undone answer
    if (!deck) S.daily = h.daily;
    relearn = new Set(h.relearn); save();
    queue.splice(0, queue.length, ...h.queue);
    done = h.done; stats = h.stats; missed = h.missed;
    show();
  };

  // iPad landscape (CSS shows it from 1100×700): today's numbers beside the card, refreshed with every card.
  const sideMQ = matchMedia('(min-width: 1100px) and (min-height: 700px) and (orientation: landscape)'); // same query as the CSS that shows the panel
  function updSide() {
    const el = $('#sideStats'); if (!el || !sideMQ.matches) return; // hidden on phones: don't build it
    const goal = newGoal(), n = stats.ok + stats.again, acc = n ? Math.round(stats.ok / n * 100) : null;
    const L = levelOf(S.xp), a = levelStart(L), b = levelStart(L + 1), pc = Math.max(0, Math.min(100, Math.round((S.xp - a) / (b - a) * 100)));
    el.innerHTML = `<div class="ss-h">รอบนี้</div>
      <div class="ss-big"><b>${done}</b><span>/ ${total} ใบ</span></div>
      <div class="qbar"><span style="width:${total ? done / total * 100 : 0}%"></span></div>
      <div class="ss-grid">
        <div><b>${acc == null ? '–' : acc + '%'}</b><span>จำได้</span></div>
        <div><b>${Math.max(0, total - done)}</b><span>เหลือ</span></div>
        <div><b>${S.streak.count || 0}</b><span>🔥 วัน</span></div></div>
      ${deck ? '' : `<div class="ss-h">วันนี้ทั้งหมด</div>
      <div class="ss-row"><span>ทบทวนแล้ว</span><b>${S.daily.reviews}</b></div>
      <div class="ss-row"><span>คำใหม่</span><b>${S.daily.fresh}/${goal}</b></div>`}
      <div class="ss-h">Lv.${L}</div>
      <div class="qbar"><span style="width:${pc}%"></span></div>
      <div class="small muted">อีก ${(b - S.xp).toLocaleString()} XP ถึง Lv.${L + 1}</div>`;
  }

  const landMQ = matchMedia('(min-width: 700px) and (orientation: landscape), (min-width: 520px) and (max-height: 520px)'); // 1.145: squat windows too
  let frontEn = true; // side shown first for the current card (settings.front: en, th or mix)
  function show() {
    if (!queue.length) return finish();
    card = queue[0]; flipped = false;
    updSide();
    $('#pbar').style.width = (done / total * 100) + '%';
    $('#pcount').textContent = `${done}/${total}`;
    const p = map[card.w];
    const isNew = !p;
    // "mix": new and still-learning words are shown English-first; words that are already solid are asked the other way round half of the time.
    const enFront = frontEn = S.settings.front === 'en' || (S.settings.front === 'mix' && (isNew || p.b < MASTERED || Math.random() < 0.5));
    const star = `<button class="star-btn" data-star aria-label="ติดดาว">${starIcon(card)}</button>`;
    const enFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="word" lang="en">${esc(card.w)}</div><div class="ipa">${ipaHtml(card.i)}</div>
      <button class="speak" data-say aria-label="ฟังเสียง">🔊</button>`;
    const thFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="th">${esc(card.t)}</div>`;
    const backExtra = emojiBox(card) + noteBox(card) + exampleBox(card) + `<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">📖 ดูใน Oxford ↗</a>`;
    $('#stage').innerHTML = `
      ${queue.length > 1 ? `<div class="fc-stack n${Math.min(queue.length - 1, 2)}" aria-hidden="true"><i></i><i></i></div>` : ''}
      <div class="fc lvc-${card.g}${tintStyle(card) ? ' tint' : ''}${S.settings.frame === 'gold' && itemOpen('frame:gold') ? ' gold' : ''}" id="fc"${tintStyle(card)}>
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div><div class="swipe-tag u">ง่าย</div><div class="swipe-tag d">ยาก</div>
        <div class="fc-inner">
          <div class="face front"><span class="fc-wm" aria-hidden="true">${TOPIC_IC[card.tp] || ''}</span>${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}${leechIn(card, map) ? '🐢 คำดื้อ · ' : ''}<span class="tap-hint">แตะเพื่อพลิก · ปัดซ้าย/ขวา</span><span class="kb-hint">คลิกหรือกด Space เพื่อพลิก · 1–4 หรือ ← ↓ → ↑ ให้คะแนน · ? คีย์ลัด</span></div></div>
          <div class="face back${cardPattern(card.tp) ? ' pat' : ''}"${cardPattern(card.tp) ? ` style='--pat:${cardPattern(card.tp)}'` : ''}><span class="fc-wm" aria-hidden="true">${TOPIC_IC[card.tp] || ''}</span>${enFront ? `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
            <div class="th">${esc(card.t)}</div><div class="ipa" style="margin-top:8px">${esc(card.w)} ${ipaHtml(card.i)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>${backExtra}`
            : enFace + backExtra}</div>
        </div>
      </div>`;
    gradeBox.innerHTML = [
      ['g-again', 'ลืม', 0], ['g-hard', 'ยาก', 1], ['g-good', 'จำได้', 2], ['g-easy', 'ง่าย', 3],
    ].map(([c, t, g]) => `<button class="btn ${c}" data-g="${g}">${t}<small>${gradeLabel(p, g)}</small></button>`).join('');
    gradeBox.style.visibility = landMQ.matches ? 'visible' : 'hidden'; // landscape: the 4 buttons are there from the start
    $('#undo').style.visibility = history.length ? 'visible' : 'hidden';
    if (enFront && S.settings.autoSpeak) speak(card.w);
    bindCard();
  }

  function flip() {
    flipped = !flipped;
    $('#fc').classList.toggle('flip', flipped);
    if (flipped) {
      gradeBox.style.visibility = 'visible';
      if (!frontEn && S.settings.autoSpeak) speak(card.w);
    }
  }

  function snapshot() {
    history.push({ w: card.w, prev: map[card.w] && { ...map[card.w] }, daily: { ...S.daily }, queue: queue.slice(), done, stats: { ...stats }, relearn: [...relearn], missed: missed.slice() });
    if (history.length > 30) history.shift();
  }
  const requeue = (min) => queue.splice(Math.min(queue.length, min + (Math.random() * 3 | 0)), 0, card);
  function answer(g) {
    snapshot();
    const isNew = !map[card.w], re = relearn.has(card.w);
    queue.shift();
    if (re && g >= 2) {
      // Second look at a "hard" new word: keep it at 1 day, or 3 days if it now feels easy.
      relearn.delete(card.w);
      markActive(); if (!deck) S.daily.reviews++;
      const i = g === 3 ? 3 : 1;
      map[card.w] = { ...map[card.w], b: boxOf(i), i, d: dueAt(i), s: map[card.w].s + 1, c: map[card.w].c + 1, t: Date.now() };
      questEvent('card');
      stats.ok++; done++;
    } else {
      grade(card, g, map);
      if (g === 0) { relearn.delete(card.w); stats.again++; if (!missed.includes(card)) missed.push(card); requeue(3); }
      else if (g === 1 && (isNew || re)) { relearn.add(card.w); requeue(4); }
      else { stats.ok++; done++; }
    }
    show();
  }

  function bindCard() {
    const fc = $('#fc');
    let sx = 0, sy = 0, dx = 0, dy = 0, axis = '', dragging = false, moved = false;
    const tl = $('.swipe-tag.l', fc), tr = $('.swipe-tag.r', fc), tu = $('.swipe-tag.u', fc), td = $('.swipe-tag.d', fc);
    // Up = ง่าย, down = ยาก (settings.swipeUD, on by default) — only while neither the page nor the card face scrolls, so a scroll stays a scroll.
    const fits = (el) => !el || el.scrollHeight <= el.clientHeight + 4;
    const udOn = () => S.settings.swipeUD !== false && fits(view) && fits($(flipped ? '.face.back' : '.face.front', fc)); // squat screens scroll inside the face
    fc.addEventListener('click', (e) => {
      if (e.target.closest('[data-say]')) { e.stopPropagation(); speak(card.w); return; }
      if (e.target.closest('[data-sayex]')) { e.stopPropagation(); speak(e.target.closest('[data-sayex]').dataset.sayex || card.e); return; }
      if (e.target.closest('[data-star]')) {
        e.stopPropagation(); toggleStar(card);
        fc.querySelectorAll('[data-star]').forEach((b) => (b.textContent = starIcon(card)));
        return;
      }
      if (e.target.closest('[data-note]')) {
        e.stopPropagation();
        editNote(card, () => { const nb = fc.querySelector('[data-note]'); if (nb) nb.outerHTML = noteBox(card); });
        return;
      }
      if (e.target.closest('[data-know]')) {
        e.stopPropagation(); snapshot(); markKnown(card, map);
        queue.shift(); stats.ok++; done++; toast('ข้าม "' + card.w + '" แล้ว 👍'); show(); return;
      }
      if (e.target.closest('a')) return;
      if (!moved) flip();
    });
    fc.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = dy = 0; axis = ''; dragging = true; moved = false;
      fc.style.transition = 'none';
    }, { passive: true });
    fc.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0]; dx = t.clientX - sx; dy = t.clientY - sy;
      if (!axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : udOn() ? 'y' : '-';
      if (axis === 'y') {
        moved = true;
        fc.style.transform = `translateY(${dy}px) rotateX(${Math.max(-20, Math.min(20, -dy / 8))}deg)`;
        fc.classList.add('dragging');
        fc.style.setProperty('--sa', Math.min(1, Math.abs(dy) / 90));
        fc.style.setProperty('--sc', dy < 0 ? 'var(--a2)' : '#f0932b');
        tu.style.opacity = Math.min(1, Math.max(0, -dy / 80));
        td.style.opacity = Math.min(1, Math.max(0, dy / 80));
        return;
      }
      if (axis !== 'x') return;
      if (Math.abs(dx) > 8) moved = true;
      fc.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg) rotateY(${Math.max(-25, Math.min(25, dx / 8))}deg)`; // tilts with the finger
      fc.classList.add('dragging');
      fc.style.setProperty('--sa', Math.min(1, Math.abs(dx) / 110));
      fc.style.setProperty('--sc', dx > 0 ? 'var(--good)' : 'var(--bad)');
      tl.style.opacity = Math.min(1, Math.max(0, -dx / 100));
      tr.style.opacity = Math.min(1, Math.max(0, dx / 100));
    }, { passive: true });
    fc.addEventListener('touchend', () => {
      dragging = false;
      fc.style.transition = '';
      if (axis === 'x' && Math.abs(dx) > 100) {
        fc.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx / 10}deg) rotateY(${dx > 0 ? 35 : -35}deg)`;
        setTimeout(() => answer(dx > 0 ? 2 : 0), 180);
      } else if (axis === 'y' && Math.abs(dy) > 90) {
        fc.style.transform = `translateY(${dy < 0 ? -700 : 700}px) rotateX(${dy < 0 ? 30 : -30}deg)`;
        setTimeout(() => answer(dy < 0 ? 3 : 1), 180);
      } else {
        fc.style.transform = ''; [tl, tr, tu, td].forEach((x) => (x.style.opacity = 0)); fc.classList.remove('dragging');
        setTimeout(() => (moved = false), 50);
      }
    });
  }

  gradeBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]'); if (b) answer(+b.dataset.g);
  });

  function finish() {
    updateStreak();
    confetti();
    const sum = roundSummary();
    if (deck) {
      view.innerHTML = sum + deckStepsHtml(deck);
      bindSummary(); bindDeckSteps(deck);
      return;
    }
    view.innerHTML = sum + tomorrowBox() + nextSteps(W.filter((w) => S.prog[w.w]).length);
    bindSummary(); bindNextSteps();
  }
  // End of a round: cards, % remembered, XP and time, then the words pressed ลืม with 🔊 / ☆, practise them again or put them in a set.
  function roundSummary() {
    const n = stats.ok + stats.again, acc = n ? Math.round(stats.ok / n * 100) : 0;
    const sec = Math.round((Date.now() - t0) / 1000), time = sec >= 60 ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : sec + ' วิ';
    const say = acc >= 90 ? 'ความจำเยี่ยมมาก!' : acc >= 70 ? 'เก่งมาก ไปได้สวย!' : 'ลืมบ้างไม่เป็นไร ทวนอีกนิดก็จำได้';
    return `<div class="card-box center pop rsum" style="margin-top:20px">
      <div class="result-emoji">${deck ? '🏆' : mascotSvg({ mood: 'happy', size: 96 })}</div><div class="h2">จบรอบแล้ว!</div><p class="muted rsum-say">${say}</p>
      <div class="res-stats rsum-st">
        <div><b>${total}</b><span>ใบ</span></div>
        <div><b>${acc}%</b><span>จำได้</span></div>
        <div><b>+${Math.max(0, S.xp - xp0)}</b><span>XP</span></div>
        <div><b>${time}</b><span>เวลา</span></div></div>
      ${missed.length ? '' : '<p class="small muted">ไม่ได้กด “ลืม” เลยสักใบ 👏</p>'}</div>
      ${missed.length ? `<div class="card-box wrong-list rsum-miss"><div class="wl-h"><b>คำที่กด “ลืม” รอบนี้</b><span class="wl-n">${missed.length}</span></div>
        <div class="small muted wl-hint">จะกลับมาให้ทบทวนเร็วๆ นี้ · 🔊 ฟังเสียง · ☆ ติดดาว</div>
        ${missed.map((w) => `<div class="wl" data-i="${w.idx}"><span><b lang="en">${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span><button class="wl-say" aria-label="ฟังเสียง ${esc(w.w)}">🔊</button><button class="star-btn" data-star aria-label="ติดดาว ${esc(w.w)}">${starIcon(w)}</button></div>`).join('')}
        <div class="res-acts rsum-acts"><button class="btn primary block" id="sumAgain">🔁 ฝึก ${missed.length} คำนี้อีกรอบ</button>${deck ? '' : '<button class="btn block" id="sumDeck">📚 ใส่เข้าชุดของฉัน</button>'}</div></div>` : ''}`;
  }
  function bindSummary() {
    const wl = view.querySelector('.rsum-miss'); if (!wl) return;
    wl.onclick = (e) => {
      const row = e.target.closest('.wl'), w = row && W[+row.dataset.i]; if (!w) return;
      const sb = e.target.closest('[data-star]');
      if (sb) { toggleStar(w); sb.textContent = starIcon(w); } else speak(w.w);
    };
    $('#sumAgain').onclick = () => { cardsAgain = missed.slice(); cardsFromHub = fromHub; renderCards(deck ? { deck: deck.id, again: true } : 'again'); };
    const dk = $('#sumDeck'); if (dk) dk.onclick = () => pickDeck(missed.map((w) => w.w));
  }

  show();
}

// Thumb grade buttons (1.136, settings.thumbs 'auto' | 'on' | 'off'): the CSS splits them to both sides of the card
// on a tablet in landscape (≥1000×600); 'auto' = touch screens only.
function thumbsOn() {
  const v = S.settings.thumbs || 'auto';
  return v === 'on' || (v === 'auto' && matchMedia('(pointer: coarse)').matches);
}
// html.thumbs (1.141): the same switch for multiple-choice games (answers on both sides of the question, CSS at the end of style.css)
function applyThumbs() {
  document.documentElement.classList.toggle('thumbs', thumbsOn());
  document.documentElement.classList.toggle('opt-left', S.settings.optSide === 'left'); // 1.150: game answers on the left (default right)
}
applyThumbs();
