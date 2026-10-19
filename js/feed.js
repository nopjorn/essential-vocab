'use strict';
// Feed (ไถศัพท์): vertical card stream of due / new / practice cards.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- feed (ไถศัพท์) ---------- */
// Endless TikTok-style feed: one card per screen, swipe up for the next. Due words come first, then
// new words (a "learn" card followed by a quiz on it a few cards later) up to the daily goal, then
// practice on learned words. Answers use gameResult() like the games.
// Extras: a special card every FEED_SP_EVERY cards (word family / collocation / confusable pair /
// story sentence; no SRS), a "boss" leech word that needs BOSS_HP right answers, timed cards, combo
// milestones with a x2-XP fever from combo FEVER_AT, and a summary card after every FEED_SUM_EVERY cards.
const FEED_HUE = { people: 340, body: 0, food: 25, home: 35, clothes: 290, nature: 120, travel: 200, work: 45, study: 230, media: 270, society: 210, time: 180, feelings: 320, actions: 150, describe: 260, grammar: 220 };
const FEED_LOOK = { fam: ['🧬', 160], colloc: ['🤝', 190], conf: ['⚖️', 30], story: ['📖', 250], sum: ['🏆', 48], boss: ['👾', 0] };
const TOPIC_ICON = Object.fromEntries(TOPICS.map(([id, ic]) => [id, ic]));
const FEED_SPECIALS = ['fam', 'colloc', 'conf', 'story'];
const FEED_SP_EVERY = 6, FEED_SUM_EVERY = 20, FEED_TIMER = 6, BOSS_HP = 3, BOSS_XP = 15, FEVER_AT = 10;
const BLANK = '<span class="blank">_____</span>';

// A sentence from a story near the user's level with one list word blanked (feed story card).
function feedStoryQ() {
  const lv = new Set(S.settings.levels.map((l) => (l === 'B2x' ? 'B2' : l)));
  if (lv.has('C1')) lv.add('C2');
  let list = STORIES.filter((st) => lv.has(st.level));
  if (!list.length) list = STORIES;
  for (let t = 0; t < 10; t++) {
    const st = pick(list), pi = Math.random() * st.en.length | 0;
    const sents = (st.en[pi].match(/[^.!?]+[.!?]+["')”]?/g) || []).map((x) => x.trim()).filter((x) => { const k = x.split(/\s+/).length; return k >= 5 && k <= 22; });
    if (!sents.length) continue;
    const sent = pick(sents);
    const cands = (sent.match(/[A-Za-z][A-Za-z’']*/g) || []).filter((x) => x.length >= 4).map((x) => ({ t: x, w: lookupWord(x) })).filter((x) => x.w);
    if (!cands.length) continue;
    const best = cands.sort((a, b) => LEVELS.indexOf(b.w.g) - LEVELS.indexOf(a.w.g) || b.t.length - a.t.length)[0];
    const cap = best.t[0] !== best.t[0].toLowerCase();
    const fit = (x) => (cap ? x[0].toUpperCase() + x.slice(1).toLowerCase() : x.toLowerCase());
    const used = new Set([best.t.toLowerCase()]), others = [];
    for (const x of shuffle(st.en.join(' ').match(/[A-Za-z][A-Za-z’']*/g) || [])) {
      const k = x.toLowerCase(), w = x.length >= 4 && lookupWord(x);
      if (!w || w === best.w || used.has(k)) continue;
      used.add(k); others.push(fit(x));
      if (others.length === 3) break;
    }
    if (others.length < 3) continue;
    const re = new RegExp('(^|[^A-Za-z’\'])' + reEsc(best.t) + '(?![A-Za-z’\'])');
    return { st, pi, sent, right: best.t, shown: sent.replace(re, (all, pre) => pre + '\u0000'), opts: shuffle([best.t, ...others]) };
  }
  return null;
}

function renderFeed() {
  view.classList.add('feed-mode');
  view.innerHTML = `<div class="feed-hud"><span id="fCombo" class="combo"></span><span class="small f-goal" id="fGoal"></span><span class="small" id="fXp"></span></div><div class="feed" id="feed"></div>`;
  const feed = $('#feed');
  const seen = new Set();
  const later = [];            // { at: card number, w } quizzes on words just introduced
  const cards = [];            // card number -> { w, type, el, done, sp (special), right, say, reveal, ... }
  const sess = { n: 0, ok: 0, xp: 0, best: 0, bosses: 0, t0: Date.now() };
  let n = 0, combo = 0, newDealt = 0, newDone = 0, activeN = -1, spTurn = 0, alive = true;
  let boss = null, bossNext = 8;   // boss = { w, hp, miss, at }
  let lastTap = { k: -1, t: 0 };
  const fever = () => combo >= FEVER_AT;
  const hud = () => {
    const L = levelOf(S.xp);
    $('#fXp').textContent = `Lv.${L} · ${S.xp - levelStart(L)}/${levelStart(L + 1) - levelStart(L)} XP`;
    $('#fCombo').textContent = fever() ? `🔥 ไฟลุก x${combo} · XP x2` : combo >= 2 ? `🔥 คอมโบ x${combo}` : '';
    $('#fCombo').classList.toggle('fever', fever());
    feed.classList.toggle('fever', fever());
    const fresh = S.daily.date === today() ? S.daily.fresh : 0, goal = S.settings.newPerDay;
    $('#fGoal').textContent = fresh >= goal ? '🎯 ครบเป้าคำใหม่' : `✨ คำใหม่ ${fresh}/${goal}`;
  };
  hud();
  // Data for the special cards loads in the background; a special is skipped until its data is in.
  loadFamilies(); loadColloc(); loadPairs(); loadStories();
  const spReady = {
    fam: () => FAMILIES && FAMILIES.some((f) => f.q.length),
    colloc: () => COLLOC && Object.keys(COLLOC).length,
    conf: () => CONFUSE && CONFUSE.length,
    story: () => STORIES && STORIES.length,
  };

  function chooseWord() {
    if (later.length && later[0].at <= n) return [later.shift().w, 'quiz'];
    const p = pool();
    const due = dueList(p).find((w) => !seen.has(w.w));
    if (due) return [due, 'quiz'];
    if (S.daily.fresh + (newDealt - newDone) < S.settings.newPerDay) {
      const fresh = shuffle(p.filter((w) => !S.prog[w.w] && !seen.has(w.w) && inTopic(w)))[0];
      if (fresh) return [fresh, 'learn'];
    }
    // Practice: lower boxes first, with some randomness.
    let learned = p.filter((w) => S.prog[w.w] && !seen.has(w.w));
    if (!learned.length) learned = W.filter((w) => S.prog[w.w] && !seen.has(w.w));
    if (learned.length) {
      learned.sort((a, b) => S.prog[a.w].b - S.prog[b.w].b);
      return [pick(learned.slice(0, 30)), 'quiz'];
    }
    // Nothing learned and today's new words used up (or everything seen): keep going anyway.
    const rest = p.filter((w) => !seen.has(w.w));
    if (!rest.length) seen.clear();
    const w = pick(rest.length ? rest : p);
    return [w, S.prog[w.w] ? 'quiz' : 'learn'];
  }

  // A leech (or at least a word missed twice) becomes the next boss.
  function spawnBoss(k) {
    const p = pool(), fresh = (x) => !seen.has(x.w);
    const cands = shuffle(p.filter(isLeech)).concat(shuffle(p.filter((x) => !isLeech(x) && S.prog[x.w] && (S.prog[x.w].x || 0) >= 2)));
    const w = cands.find(fresh) || cands[0]; // prefer one not shown yet in this session
    if (!w) { bossNext = k + 10; return null; }
    boss = { w, hp: BOSS_HP, miss: 0, at: k };
    return w;
  }
  const hpBar = (hp) => '❤️'.repeat(hp) + '🖤'.repeat(BOSS_HP - hp);

  const optBtns = (list, two) => `<div class="options${two ? ' two' : ''}">${list.map(([v, label]) => `<button class="opt" data-o="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
  const same = (list) => list.map((o) => [o, o]);
  const sayEx = (text, th) => `<div class="example"><div class="en" lang="en">${esc(text)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div>${th ? `<div class="thx">${esc(th)}</div>` : ''}</div>`;
  const hint = (th) => `<button class="hint-btn" data-hint>💡 ดูคำแปลประโยค</button><div class="thx" hidden>${esc(th)}</div>`;

  // Special cards: no SRS, just practice + XP. Returns null when the data is not loaded yet.
  function special(kind) {
    if (kind === 'fam') {
      const f = pick(FAMILIES.filter((x) => x.q.length)), [sent, right, th] = pick(f.q);
      const full = sent.replace('___', right);
      const opts = shuffle([right, ...shuffle(f.f.map((x) => x[0]).filter((x) => x !== right)).slice(0, 3)]);
      return { right, say: full, badge: '',
        body: `<div class="f-tag">🧬 เลือกรูปคำให้ถูก</div><div class="cloze" lang="en">${esc(sent).replace('___', BLANK)}</div>${hint(th)}${optBtns(same(opts), opts.length === 2)}`,
        reveal: (ok) => `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}${sayEx(full, th)}
          <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧬 ครอบครัวคำ</b> (แตะเพื่อฟัง)</div>${famRows(f, right)}</div>` };
    }
    if (kind === 'colloc') {
      const cands = pool().filter((w) => COLLOC[w.w]), known = cands.filter((w) => S.prog[w.w]);
      const w = pick(known.length >= 5 ? known : cands.length ? cands : W.filter((x) => COLLOC[x.w]));
      const { phrase, th, shown, opts } = collocQ(w);
      return { right: w.w, say: phrase, badge: lvBadge(w.g),
        body: `<div class="f-tag">🤝 คำไหนใช้คู่กัน?</div><div class="cloze" lang="en">${esc(shown).replace('\u0000', BLANK)}</div><div class="muted" style="margin-top:6px">${esc(th)}</div>${optBtns(same(opts))}`,
        reveal: (ok) => `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(phrase)}</b> = ${esc(th)}
          <div class="small muted" style="margin-top:6px">คำคู่กันอื่นของ ${esc(w.w)}: ${COLLOC[w.w].filter((x) => x[0] !== phrase).map((x) => esc(x[0])).join(' · ') || '–'}</div>` };
    }
    if (kind === 'conf') {
      const c = pick(CONFUSE), [sent, right, bad, th] = pick(c.q);
      const full = sent.replace('___', right);
      return { right, say: full, badge: '',
        body: `<div class="f-tag">⚖️ ${esc(c.a)} หรือ ${esc(c.b)}?</div><div class="cloze" lang="en">${esc(sent).replace('___', BLANK)}</div>${hint(th)}${optBtns(same(shuffle([right, bad])), true)}`,
        reveal: (ok) => `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}${sayEx(full, th)}<div class="tip-box">💡 ${esc(c.tip)}</div>` };
    }
    const q = feedStoryQ();
    if (!q) return null;
    return { right: q.right, say: q.sent, badge: lvBadge(q.st.level),
      body: `<div class="f-tag">📖 จากเรื่อง ${esc(q.st.emoji || '')} ${esc(q.st.title)}</div><div class="cloze" lang="en">${esc(q.shown).replace('\u0000', BLANK)}</div>${optBtns(same(q.opts))}`,
      reveal: (ok) => `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(q.right)}</b>`}${sayEx(q.sent)}
        <div class="small muted" style="margin-top:8px;text-align:left">คำแปลย่อหน้านี้: ${esc(q.st.th[q.pi] || '')}</div>
        <button class="btn ghost block" data-read="${q.st.id}" style="margin-top:10px">📖 อ่านเรื่องเต็ม${S.read[q.st.id] ? ' (อ่านแล้ว)' : ''}</button>` };
  }

  // Quiz on a list word (also used for the boss).
  function wordQuiz(w, k, isBoss) {
    const timed = !isBoss && k % 8 === 7;
    const type = pick(timed ? ['en2th', 'th2en', 'tf'] : hasCloze(w) ? ['en2th', 'th2en', 'listen', 'tf', 'cloze'] : ['en2th', 'th2en', 'listen', 'tf']);
    let prompt, opts, right;
    if (type === 'tf') {
      const real = Math.random() < 0.5;
      const shown = real ? w : distractors(w, 1, 't')[0];
      right = real ? '1' : '0';
      prompt = `<div class="f-tag">✅ ใช่หรือไม่?</div><div class="f-word" lang="en">${esc(w.w)}</div><div class="muted">แปลว่า</div><div class="f-th">${esc(thFirst(shown.t))}</div>`;
      opts = `<div class="options tf"><button class="opt" data-o="1">⭕ ใช่</button><button class="opt" data-o="0">❌ ไม่ใช่</button></div>`;
    } else {
      const toTh = type !== 'th2en' && type !== 'cloze';
      const list = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w')]);
      right = String(w.idx);
      if (type === 'en2th') prompt = `<div class="f-tag">🇬🇧 แปลว่าอะไร?</div><div class="f-word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
      else if (type === 'th2en') prompt = `<div class="f-tag">🇹🇭 ภาษาอังกฤษคือ?</div><div class="f-th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
      else if (type === 'listen') prompt = `<div class="f-tag">🎧 ฟังแล้วตอบ</div><button class="speak f-listen" data-say>🔊</button><div class="small muted">แตะเพื่อฟังอีกครั้ง</div>`;
      else {
        const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
        prompt = `<div class="f-tag">📝 เติมคำในประโยค</div><div class="cloze" lang="en">${esc(blank).replace('\u0000', BLANK)}</div><div class="thx">${esc(w.et)}</div>`;
      }
      opts = optBtns(list.map((o) => [o.idx, toTh ? o.t : o.w]));
    }
    const top = isBoss ? `<div class="f-boss">👾 บอสคำดื้อ <span class="f-hp">${hpBar(boss.hp)}</span><small>ตอบถูก ${boss.hp} ครั้งเพื่อปราบบอส</small></div>`
      : timed ? `<div class="f-timer"><i></i></div><div class="f-time small">⏱️ ตอบภายใน ${FEED_TIMER} วินาที ได้ XP x2</div>` : '';
    return { type, timed, right, body: `${top}${prompt}${opts}` };
  }

  const heart = (w) => `<button class="f-act" data-heart aria-label="ติดดาว">${isStar(w) ? '❤️' : '🤍'}<small>ชอบ</small></button>`;
  const sayBtn = '<button class="f-act" data-say aria-label="ฟังเสียง">🔊<small>ฟัง</small></button>';
  function addCard() {
    const k = n++;
    let c = null;
    if (k % (FEED_SUM_EVERY + 1) === FEED_SUM_EVERY) c = { type: 'sum', done: true };
    else if (boss && boss.at <= k || !boss && k >= bossNext && spawnBoss(k)) {
      const w = boss.w;
      boss.at = Infinity; // until this card is answered
      seen.add(w.w);
      c = { w, isBoss: true, ...wordQuiz(w, k, true) };
    } else if (k >= 4 && k % FEED_SP_EVERY === 4) {
      for (let t = 0; t < FEED_SPECIALS.length && !c; t++) {
        const kind = FEED_SPECIALS[spTurn++ % FEED_SPECIALS.length];
        const s = spReady[kind]() ? special(kind) : null;
        if (s) c = { type: kind, sp: true, ...s };
      }
    }
    if (!c) {
      const [w, kind] = chooseWord();
      seen.add(w.w);
      if (kind === 'learn') {
        newDealt++;
        later.push({ at: k + 3, w });
        c = { w, type: 'learn', done: true, body: `<div class="f-tag">✨ คำใหม่</div>
          <div class="f-word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
          <div class="f-th">${esc(w.t)}</div>${S.note[w.w] ? noteBox(w) : ''}${exampleBox(w)}
          <div class="small muted" style="margin-top:14px">จำไว้นะ อีกเดี๋ยวจะมีคำถามคำนี้ 😉</div>` };
      } else c = { w, ...wordQuiz(w, k, false) };
    }
    const look = c.isBoss ? FEED_LOOK.boss : FEED_LOOK[c.type] || [TOPIC_ICON[c.w.tp] || '', FEED_HUE[c.w.tp] != null ? FEED_HUE[c.w.tp] : 250];
    const badge = c.sp ? c.badge : c.w ? lvBadge(c.w.g) : '';
    const body = c.type === 'sum' ? '<div class="f-sum"></div>' : `${c.body}${c.done ? '' : '<div class="reveal f-reveal"></div>'}`;
    const side = c.type === 'sum' ? '' : `<div class="f-side">${c.sp ? '' : heart(c.w)}${sayBtn}</div>`;
    const el = document.createElement('section');
    el.className = 'fcard' + (c.isBoss ? ' boss' : '') + (c.type === 'sum' ? ' sum' : '');
    el.dataset.n = k;
    el.dataset.type = c.isBoss ? 'boss' : c.type;
    el.style.setProperty('--hue', look[1]);
    el.innerHTML = `<div class="f-in"><span class="f-emo" aria-hidden="true">${look[0]}</span>${badge}<div class="f-body">${body}</div></div>${side}`;
    el._right = c.right; // read by the tests
    cards[k] = { ...c, el, done: !!c.done };
    feed.appendChild(el);
    io.observe(el);
  }

  function answer(k, ok, btn) {
    const c = cards[k]; if (c.done) return;
    c.done = true;
    const w = c.w;
    if (c.sp) { markActive(); save(); } else {
      if (!S.prog[w.w]) { S.daily.fresh++; newDone++; }
      gameResult(w, ok);
    }
    sess.n++;
    sfx(ok ? 'ok' : 'bad');
    let xp = 0;
    const notes = [];
    if (ok) {
      sess.ok++;
      const fev = fever(), mult = 1 + (fev ? 1 : 0) + (c.timed && !c.late ? 1 : 0);
      combo++;
      sess.best = Math.max(sess.best, combo);
      xp = comboXP(combo) * mult;
      if (fev) notes.push('🔥 ไฟลุก XP x2');
      if (c.timed && !c.late) notes.push('⏱️ ทันเวลา XP x2');
      if (combo === 5 || combo % 10 === 0) {
        const bonus = Math.min(combo, 20);
        xp += bonus;
        if (combo >= 10) confetti();
        toast(combo === FEVER_AT ? `🔥 คอมโบ 10! โหมดไฟลุก XP x2 จนกว่าจะตอบผิด (+${bonus} XP)` : `🔥 คอมโบ ${combo}! โบนัส +${bonus} XP`);
      }
    } else {
      if (fever()) notes.push('💧 ไฟดับแล้ว เริ่มคอมโบใหม่นะ');
      combo = 0;
    }
    if (c.isBoss) {
      if (ok && --boss.hp === 0) {
        xp += BOSS_XP; sess.bosses++;
        confetti(); toast(`👾 ปราบบอส "${w.w}" สำเร็จ! +${BOSS_XP} XP`);
        notes.push(`🏆 ปราบบอสสำเร็จ +${BOSS_XP} XP`);
        boss = null; bossNext = n + 12;
      } else if (ok) {
        notes.push(`👾 บอสเหลือพลัง ${hpBar(boss.hp)} เดี๋ยวกลับมาอีก!`);
        boss.at = n + 3;
      } else if (++boss.miss >= 3) {
        notes.push('💨 บอสหนีไปแล้ว ไว้เจอกันใหม่นะ');
        boss = null; bossNext = n + 12;
      } else {
        boss.hp = BOSS_HP; boss.at = n + 3;
        notes.push('👾 บอสฟื้นพลังเต็มแล้ว! เดี๋ยวกลับมาอีก');
      }
    }
    if (xp) { addXP(xp); sess.xp += xp; }
    if (combo === 6) questEvent('round', { game: 'feed', correct: 0, bestCombo: combo });
    questEvent('answer', { game: 'feed', ok });
    hud();
    c.el.querySelectorAll('[data-o]').forEach((o) => { if (o.dataset.o === c.right) o.classList.add('correct'); });
    if (!ok && btn) btn.classList.add('wrong');
    c.el.classList.add(ok ? 'ok' : 'bad');
    const head = (xp ? `<span class="f-xp">+${xp} XP</span>` : '') + notes.map((x) => `<div class="f-note">${x}</div>`).join('');
    const rv = c.el.querySelector('.f-reveal');
    rv.innerHTML = head + (c.sp ? c.reveal(ok)
      : (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ <b>${esc(w.w)}</b> = ${esc(w.t)}`)
        + (ok ? '' : noteBox(w) + exampleBox(w) + '<div class="small muted" style="margin-top:8px">ใส่ในแฟลชการ์ดให้แล้ว · ปัดขึ้นเพื่อไปต่อ ↑</div>'));
    if (c.sp) speak(c.say);
    else if (c.type === 'th2en' || c.type === 'cloze' || !ok) speak(w.w);
    if (ok) setTimeout(() => { if (alive && activeN === k) scrollToCard(k + 1); }, c.sp ? 1800 : 900);
  }

  function showSummary(c) {
    const box = c.el.querySelector('.f-sum');
    const acc = sess.n ? Math.round((sess.ok * 100) / sess.n) : 0;
    const mins = Math.max(1, Math.round((Date.now() - sess.t0) / 60000));
    const msg = !sess.n ? 'ไถต่ออีกนิด แล้วมาดูสรุปกันนะ 😊' : acc >= 90 ? 'สุดยอดไปเลย! 🤩' : acc >= 70 ? 'เก่งมาก ไปต่อกัน! 💪' : 'ค่อยๆ ไป คำที่ผิดจะกลับมาให้ทบทวนนะ 🌱';
    box.innerHTML = `<div class="f-tag">🏆 สรุปช่วงนี้</div><div class="f-word" lang="en">${acc}%</div><div class="muted">ตอบถูก ${sess.ok}/${sess.n} ข้อ</div>
      <div class="f-stats"><div><b>${newDone}</b><small>คำใหม่</small></div><div><b>${sess.best}</b><small>คอมโบสูงสุด</small></div><div><b>+${sess.xp}</b><small>XP</small></div><div><b>${mins}</b><small>นาที</small></div></div>
      ${sess.bosses ? `<div class="f-note">👾 ปราบบอสได้ ${sess.bosses} ตัว</div>` : ''}<div class="f-msg">${msg}</div><div class="small muted">ปัดขึ้นเพื่อไถต่อ ↑</div>`;
    if (!c.shown && sess.n >= 10 && acc >= 80) confetti();
    c.shown = true;
  }

  function startTimer(c) {
    c.started = true;
    c.el.querySelector('.f-timer').classList.add('run');
    setTimeout(() => {
      if (!alive || c.done) return;
      c.late = true;
      c.el.querySelector('.f-time').textContent = '⌛ หมดเวลาโบนัส ตอบต่อได้นะ';
    }, FEED_TIMER * 1000);
  }

  function scrollToCard(k) {
    if (!cards[k]) addCard();
    feed.scrollTo({ top: cards[k].el.offsetTop, behavior: 'smooth' });
  }

  // Double-tap a word card (not a button) = like, with a heart popping up like TikTok.
  function doubleTap(k, c, e) {
    const now = Date.now();
    const dbl = lastTap.k === k && now - lastTap.t < 350;
    lastTap = dbl ? { k: -1, t: 0 } : { k, t: now };
    if (!dbl || !c.w || c.sp) return;
    if (!isStar(c.w)) { toggleStar(c.w); toast('⭐ ติดดาวแล้ว ไปเล่นในเกมได้ที่ "คำติดดาว"'); }
    const hb = c.el.querySelector('[data-heart]');
    if (hb) hb.innerHTML = `❤️<small>ชอบ</small>`;
    const inn = c.el.querySelector('.f-in'), r = inn.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'f-pop'; pop.textContent = '❤️';
    pop.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + 'px';
    pop.style.top = (e.clientY ? e.clientY - r.top + inn.scrollTop : r.height / 2) + 'px';
    inn.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  feed.addEventListener('click', (e) => {
    const el = e.target.closest('.fcard'); if (!el) return;
    const k = +el.dataset.n, c = cards[k], w = c.w;
    if (!e.target.closest('button, a, .opt')) return doubleTap(k, c, e);
    if (e.target.closest('[data-heart]')) {
      toggleStar(w);
      e.target.closest('[data-heart]').innerHTML = `${isStar(w) ? '❤️' : '🤍'}<small>ชอบ</small>`;
      if (isStar(w)) toast('⭐ ติดดาวแล้ว ไปเล่นในเกมได้ที่ "คำติดดาว"');
      return;
    }
    if (e.target.closest('[data-sayex]')) return speak(c.sp ? c.say : w.e);
    if (e.target.closest('[data-say]')) return speak(c.sp ? c.say : w.w);
    const col = e.target.closest('[data-col]');
    if (col) return speak(col.dataset.col);
    const hb = e.target.closest('[data-hint]');
    if (hb) { hb.nextElementSibling.hidden = false; hb.remove(); return; }
    const rd = e.target.closest('[data-read]');
    if (rd) return go('read', +rd.dataset.read);
    const nb = e.target.closest('[data-note]');
    if (nb) return editNote(w, () => { nb.outerHTML = noteBox(w); });
    const o = e.target.closest('[data-o]');
    if (o) answer(k, o.dataset.o === c.right, o);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const k = +en.target.dataset.n;
      if (k === activeN) return;
      activeN = k;
      const c = cards[k];
      if (c.type === 'sum') showSummary(c);
      if (c.timed && !c.started && !c.done) startTimer(c);
      if (!c.sp && c.w && S.settings.autoSpeak && (c.type === 'learn' || (!c.done && ['en2th', 'listen', 'tf'].includes(c.type)))) speak(c.w.w);
      while (n - k < 4) addCard();
    });
  }, { root: feed, threshold: 0.6 });
  cleanup = () => { alive = false; io.disconnect(); };
  for (let k = 0; k < 4; k++) addCard();
}
