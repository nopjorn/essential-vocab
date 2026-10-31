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
  let fresh = p.filter((w) => !S.prog[w.w] && inTopic(w));
  if (S.settings.order === 'shuffle') fresh = shuffle(fresh);
  if (extra === 'short') {
    // 3-minute session: the most overdue cards, topped up with new words (unless a backlog is being cleared).
    const d = dueList().slice(0, SHORT_N);
    const room = backlogPlan().on ? 0 : SHORT_N - d.length;
    if (fresh.length && room > 0) d.push(...fresh.slice(0, room));
    return d.length ? d : p.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, SHORT_N);
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

// "What next?" buttons shown when the flashcards for today are done (empty queue or end of a round).
function nextSteps(learned) {
  const unseen = pool().filter((w) => !S.prog[w.w]).length;
  const mastered = masteredWords().length;
  const learning = W.filter((w) => status(w) === 'learning').length;
  const backlog = backlogPlan().on ? dueList().length : 0;
  const leech = W.filter(isLeech).length, star = W.filter(isStar).length;
  const b = (id, ic, t, d) => `<button class="quick-btn" data-ns="${id}"><span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
  return `<div class="quick next-steps">
    ${backlog ? b('backlog', '🧹', 'ทวนค้างอีก 50 ใบ', 'ยังเหลือ ' + backlog + ' ใบ ค่อยๆ เคลียร์ได้') : ''}
    ${unseen ? b('more', '➕', 'คำใหม่อีก 10 คำ', 'เรียนล่วงหน้าเกินเป้าวันนี้') : ''}
    ${learned >= 4 ? b('ahead', '🔮', 'ทบทวนล่วงหน้า', '20 ใบที่ใกล้ถึงกำหนดที่สุด') : ''}
    ${b('feed', '📱', 'ไถศัพท์', 'ปัดดูทีละคำ ไม่มีวันจบ')}
    ${b('ear', '🎧', 'ฟังทบทวน', 'ฟังคำ นึกความหมาย ไม่ต้องดูจอ')}
    ${b('play', '⚡', 'เล่นด่วน', 'เกมสุ่ม 10 ข้อ ~1 นาที')}
    ${learning ? b('learning', '🟡', 'ทบทวนคำที่กำลังเรียน', 'สุ่ม 20 ใบ จากคำที่กำลังเรียน ' + learning + ' คำ') : ''}
    ${mastered ? b('mastered', '🟢', 'ทบทวนคำที่จำได้แล้ว', 'สุ่ม 20 ใบ จากคำที่จำได้แล้ว ' + mastered + ' คำ') : ''}
    ${leech ? b('leech', '🐢', 'ฝึกคำดื้อ', leech + ' คำที่ลืมบ่อย') : ''}
    ${star ? b('star', '⭐', 'ฝึกคำติดดาว', star + ' คำที่ติดดาวไว้') : ''}
    ${(S.settings.nextGames || []).filter((g) => GAMES[g]).map((g) => b('g:' + g, GAMES[g].icon, GAMES[g].name, GAMES[g].desc)).join('')}</div>`;
}
function bindNextSteps() {
  view.querySelectorAll('[data-ns]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.ns;
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

// extra: undefined (today's cards), true (10 more new), 'ahead', 'mastered', 'learning' (random 20 learning words), 'leech' (stubborn words, 15), or { deck: id, ahead? } = study one of my word sets.
// A set uses its own progress table `map` (S.dprog[id]); the main S.prog and the daily counts stay untouched.
function renderCards(extra) {
  if (!FAMILIES || !CONFUSE) { withLoading(Promise.all([loadFamilies(), loadPairs()])).then(() => renderCards(extra)); return; } // spreadFamilies() needs the family and confusable-pair data
  const deck = extra && typeof extra === 'object' ? deckById(extra.deck) : null;
  if (extra && typeof extra === 'object' && !deck) return go('decks');
  const map = deck ? deckMap(deck.id) : S.prog;
  const queue = deck ? buildDeckQueue(deck, extra) : buildQueue(extra);
  const total = queue.length;
  let done = 0, stats = { again: 0, ok: 0 };
  if (deck) { deck.used = Date.now(); save(); }
  if (deck && !total) { view.innerHTML = deckEmptyHtml(deck); bindDeckSteps(deck); return; }
  if (!total) {
    const learned = W.filter((w) => S.prog[w.w]).length;
    view.innerHTML = `<div class="card-box center pop" style="margin-top:20px">
      <div class="result-emoji">${mascotSvg({ mood: 'happy', size: 110 })}</div><div class="h2">วันนี้ทำครบแล้ว!</div>
      <p class="muted">ไม่มีการ์ดค้างสำหรับระดับ ${lvNames(S.settings.levels)} · อยากทำอะไรต่อดี?</p></div>
      ${tomorrowBox()}${nextSteps(learned)}`;
    bindNextSteps();
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
  $('#quit').onclick = () => (deck ? go('decks', deck.id) : go('home'));

  let card = null, flipped = false;
  const gradeBox = $('#grade');
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
    done = h.done; stats = h.stats;
    show();
  };

  // iPad landscape (CSS shows it from 1100×700): today's numbers beside the card, refreshed with every card.
  function updSide() {
    const el = $('#sideStats'); if (!el) return;
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
      <div class="word" lang="en">${esc(card.w)}</div><div class="ipa">${esc(card.i)}</div>
      <button class="speak" data-say aria-label="ฟังเสียง">🔊</button>`;
    const thFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="th">${esc(card.t)}</div>`;
    const backExtra = emojiBox(card) + noteBox(card) + exampleBox(card) + `<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">📖 ดูใน Oxford ↗</a>`;
    $('#stage').innerHTML = `
      <div class="fc${tintStyle(card) ? ' tint' : ''}${S.settings.frame === 'gold' && itemOpen('frame:gold') ? ' gold' : ''}" id="fc"${tintStyle(card)}>
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div>
        <div class="fc-inner">
          <div class="face front">${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}${leechIn(card, map) ? '🐢 คำดื้อ · ' : ''}<span class="tap-hint">แตะเพื่อพลิก · ปัดซ้าย/ขวา</span><span class="kb-hint">คลิกหรือกด Space เพื่อพลิก · ปุ่ม 1–4 ให้คะแนน</span></div></div>
          <div class="face back">${enFront ? `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
            <div class="th">${esc(card.t)}</div><div class="ipa" style="margin-top:8px">${esc(card.w)} ${esc(card.i)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>${backExtra}`
            : enFace + backExtra}</div>
        </div>
      </div>`;
    gradeBox.innerHTML = [
      ['g-again', 'ลืม', 0], ['g-hard', 'ยาก', 1], ['g-good', 'จำได้', 2], ['g-easy', 'ง่าย', 3],
    ].map(([c, t, g]) => `<button class="btn ${c}" data-g="${g}">${t}<small>${gradeLabel(p, g)}</small></button>`).join('');
    gradeBox.style.visibility = 'hidden';
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
    history.push({ w: card.w, prev: map[card.w] && { ...map[card.w] }, daily: { ...S.daily }, queue: queue.slice(), done, stats: { ...stats }, relearn: [...relearn] });
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
      if (g === 0) { relearn.delete(card.w); stats.again++; requeue(3); }
      else if (g === 1 && (isNew || re)) { relearn.add(card.w); requeue(4); }
      else { stats.ok++; done++; }
    }
    show();
  }

  function bindCard() {
    const fc = $('#fc');
    let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
    const tl = $('.swipe-tag.l', fc), tr = $('.swipe-tag.r', fc);
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
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; dragging = true; moved = false;
      fc.style.transition = 'none';
    }, { passive: true });
    fc.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0]; dx = t.clientX - sx;
      if (Math.abs(dx) < Math.abs(t.clientY - sy)) return;
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
      if (Math.abs(dx) > 100) {
        fc.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx / 10}deg) rotateY(${dx > 0 ? 35 : -35}deg)`;
        setTimeout(() => answer(dx > 0 ? 2 : 0), 180);
      } else {
        fc.style.transform = ''; tl.style.opacity = 0; tr.style.opacity = 0; fc.classList.remove('dragging');
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
    if (deck) {
      view.innerHTML = `<div class="card-box center pop" style="margin-top:30px">
        <div class="result-emoji">🏆</div><div class="h2">จบรอบแล้ว เก่งมาก!</div>
        <p>ทบทวน ${total} ใบ · กด "ลืม" ${stats.again} ครั้ง</p>
        <p class="muted small">คำที่ลืมจะกลับมาให้ทบทวนอีกเร็วๆ นี้</p></div>${deckStepsHtml(deck)}`;
      bindDeckSteps(deck);
      return;
    }
    view.innerHTML = `<div class="card-box center pop" style="margin-top:30px">
      <div class="result-emoji">${mascotSvg({ mood: 'happy', size: 110 })}</div><div class="h2">จบรอบแล้ว เก่งมาก!</div>
      <p>ทบทวน ${total} ใบ · กด "ลืม" ${stats.again} ครั้ง</p>
      <p class="muted small">คำที่ลืมจะกลับมาให้ทบทวนอีกเร็วๆ นี้</p></div>
      ${tomorrowBox()}${nextSteps(W.filter((w) => S.prog[w.w]).length)}`;
    bindNextSteps();
  }

  show();
}
