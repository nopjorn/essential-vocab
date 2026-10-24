'use strict';
// Flashcards hub and session (SRS grading).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- flashcards ---------- */
function buildQueue(extra) {
  rollDay();
  const p = pool();
  const due = dueList(p).slice(0, 200);
  let fresh = p.filter((w) => !S.prog[w.w] && inTopic(w));
  if (S.settings.order === 'shuffle') fresh = shuffle(fresh);
  if (extra === 'mastered') return shuffle(masteredWords()).slice(0, 20);
  if (extra === 'ahead') return p.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, 20);
  const n = extra ? 10 : Math.max(0, S.settings.newPerDay - S.daily.fresh);
  fresh = fresh.slice(0, n);
  // Mix new cards in among reviews so a session doesn't end with only new words.
  const q = [];
  const step = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : 0;
  let di = 0;
  fresh.forEach((w) => { q.push(...due.slice(di, di + step)); di += step; q.push(w); });
  q.push(...due.slice(di));
  if (!q.length && extra) {
    // Nothing new left: practise learned words that are closest to being due.
    return p.filter((w) => S.prog[w.w]).sort((a, b) => S.prog[a.w].d - S.prog[b.w].d).slice(0, 20);
  }
  return q;
}

// "What next?" buttons shown when the flashcards for today are done (empty queue or end of a round).
function nextSteps(learned) {
  const unseen = pool().filter((w) => !S.prog[w.w]).length;
  const mastered = masteredWords().length;
  const leech = W.filter(isLeech).length, star = W.filter(isStar).length;
  const b = (id, ic, t, d) => `<button class="quick-btn" data-ns="${id}"><span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
  return `<div class="quick next-steps">
    ${unseen ? b('more', '➕', 'คำใหม่อีก 10 คำ', 'เรียนล่วงหน้าเกินเป้าวันนี้') : ''}
    ${learned >= 4 ? b('ahead', '🔮', 'ทบทวนล่วงหน้า', '20 ใบที่ใกล้ถึงกำหนดที่สุด') : ''}
    ${b('feed', '📱', 'ไถศัพท์', 'ปัดดูทีละคำ ไม่มีวันจบ')}
    ${b('play', '⚡', 'เล่นด่วน', 'เกมสุ่ม 10 ข้อ ~1 นาที')}
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
      else if (id === 'mastered') go('cards', 'mastered');
      else if (id === 'play') quickPlay();
      else if (id === 'leech' || id === 'star') { gameSource = id; startGame('en2th'); }
      else if (id.startsWith('g:')) { // extra games picked in settings (nextGames)
        gameSource = W.filter((w) => S.prog[w.w] && S.settings.levels.includes(w.g)).length >= 10 ? 'learned' : 'level';
        startGame(id.slice(2));
      }
      else go(id);
    };
  });
}

// extra: undefined (today's cards), true (10 more new), 'ahead', 'mastered', or { deck: id, ahead? } = study one of my word sets.
// A set uses its own progress table `map` (S.dprog[id]); the main S.prog and the daily counts stay untouched.
function renderCards(extra) {
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
      <div class="result-emoji">🎉</div><div class="h2">วันนี้ทำครบแล้ว!</div>
      <p class="muted">ไม่มีการ์ดค้างสำหรับระดับ ${lvNames(S.settings.levels)} · อยากทำอะไรต่อดี?</p></div>
      ${nextSteps(learned)}`;
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
    <div class="grade" id="grade"></div>`;
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
    if (h.prev) map[h.w] = h.prev; else delete map[h.w];
    if (!deck) S.daily = h.daily;
    relearn = new Set(h.relearn); save();
    queue.splice(0, queue.length, ...h.queue);
    done = h.done; stats = h.stats;
    show();
  };

  function show() {
    if (!queue.length) return finish();
    card = queue[0]; flipped = false;
    $('#pbar').style.width = (done / total * 100) + '%';
    $('#pcount').textContent = `${done}/${total}`;
    const p = map[card.w];
    const isNew = !p;
    const enFront = S.settings.front === 'en';
    const star = `<button class="star-btn" data-star aria-label="ติดดาว">${starIcon(card)}</button>`;
    const enFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="word" lang="en">${esc(card.w)}</div><div class="ipa">${esc(card.i)}</div>
      <button class="speak" data-say aria-label="ฟังเสียง">🔊</button>`;
    const thFace = `<div class="top">${lvBadge(card.g)}<span class="pos">${esc(card.p)}</span>${star}</div>
      <div class="th">${esc(card.t)}</div>`;
    const backExtra = noteBox(card) + exampleBox(card) + `<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(card.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener">📖 ดูใน Oxford ↗</a>`;
    $('#stage').innerHTML = `
      <div class="fc${tintStyle(card) ? ' tint' : ''}" id="fc"${tintStyle(card)}>
        <div class="swipe-tag l">ลืม</div><div class="swipe-tag r">จำได้</div>
        <div class="fc-inner">
          <div class="face front">${enFront ? enFace : thFace}
            ${isNew ? '<button class="know-btn" data-know>✓ รู้คำนี้แล้ว ข้ามเลย</button>' : ''}
            <div class="hint">${isNew ? '✨ คำใหม่ · ' : ''}${leechIn(card, map) ? '🐢 คำดื้อ · ' : ''}แตะเพื่อพลิก · ปัดซ้าย/ขวา</div></div>
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
      if (S.settings.front !== 'en' && S.settings.autoSpeak) speak(card.w);
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
      map[card.w] = { ...map[card.w], b: boxOf(i), i, d: dueAt(i), s: map[card.w].s + 1, c: map[card.w].c + 1 };
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
      fc.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
      tl.style.opacity = Math.min(1, Math.max(0, -dx / 100));
      tr.style.opacity = Math.min(1, Math.max(0, dx / 100));
    }, { passive: true });
    fc.addEventListener('touchend', () => {
      dragging = false;
      fc.style.transition = '';
      if (Math.abs(dx) > 100) {
        fc.style.transform = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx / 10}deg)`;
        setTimeout(() => answer(dx > 0 ? 2 : 0), 180);
      } else {
        fc.style.transform = ''; tl.style.opacity = 0; tr.style.opacity = 0;
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
      <div class="result-emoji">🏆</div><div class="h2">จบรอบแล้ว เก่งมาก!</div>
      <p>ทบทวน ${total} ใบ · กด "ลืม" ${stats.again} ครั้ง</p>
      <p class="muted small">คำที่ลืมจะกลับมาให้ทบทวนอีกเร็วๆ นี้</p></div>
      ${nextSteps(W.filter((w) => S.prog[w.w]).length)}`;
    bindNextSteps();
  }

  show();
}
