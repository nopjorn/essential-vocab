'use strict';
// The game engine: playQuiz (every multiple-choice / typing / speaking game) and playMatch. Moved out of js/games.js in 1.101
// and lazy-loaded by loadPlay() (idle prefetch from boot.js, or on the first game started), so ~100 KB are not parsed at app start.
// Declares the real playQuiz/playMatch, which replace the loader stubs in js/games.js. Cached offline via DATA in sw.js.

// deckRun: {} = main progress, { map } = one set's progress table, { practice: true } = several sets (no progress written).
function playQuiz(mode, src, gameId, deckRun = {}, stage = null) {
  const ROUND = 10;
  // Endless run (emojiRun): no round limit, wrong answers only reset the streak; the player ends it themselves.
  // Survival (3 hearts, words climb from A1 to C1) and time attack (60 s) are endless runs too.
  const SURV = gameId === 'survival', TIMED = gameId === 'timeAttack', EMOJI_RUN = gameId === 'emojiRun';
  const ENDLESS = EMOJI_RUN || SURV || TIMED;
  // Level-map stage (js/map.js): the stage's words, each asked once in a mix of games; ends on the stars screen.
  const STAGE = gameId === 'stage';
  const BOSS = STAGE && !!stage.boss; // boss stage (js/map.js): hearts like survival, plus a boss bar
  const GNAME = STAGE ? stage.title : GAMES[gameId].name;
  const leave = () => (STAGE ? go('map', stage.topic) : go('games'));
  let lastMode = '';
  const stagePick = (w) => {
    const ok = ['en2th', 'th2en', 'listen'];
    if (hasCloze(w)) ok.push('cloze');
    if (/^[a-z]{4,12}$/i.test(w.w)) ok.push('anagram');
    return (lastMode = pick(ok.filter((x) => x !== lastMode)));
  };
  const TIME_LIMIT = 60;
  const items = SURV ? [] : SKILL_GAMES.includes(gameId) && !GEN_GAMES.includes(gameId) ? lexPick(gameId, src, ROUND) : shuffle(src).slice(0, ENDLESS || STAGE ? src.length : ROUND);
  let noSrs = false; // ✏️ hand game in trace mode: copying a faint word is practice, not recall (no SRS change)
  let i = 0, score = 0, combo = 0, bestCombo = 0, asked = 0, hearts = 3, reach = 0, finished = false, timeLeft = TIME_LIMIT;
  const wrong = [], runLog = [], xp0 = S.xp || 0; // runLog: right/wrong of each answer, xp0: XP at the start (result screen, 1.129)
  $('#title').textContent = GNAME;

  // 👻 Ghost race (1.120): survival / time attack show the best run so far next to this one (S.ghost[gameId]:
  // time attack = seconds at each right answer, survival = right answers after each question). Shown only when a best run exists.
  const GHOST = (SURV || TIMED) && Array.isArray((S.ghost || {})[gameId]) && S.ghost[gameId].length ? S.ghost[gameId] : null;
  const runT0 = Date.now(), ghostRun = [];
  const ghostAt = () => (TIMED ? GHOST.filter((t) => t <= (Date.now() - runT0) / 1000).length : asked ? GHOST[Math.min(asked, GHOST.length) - 1] : 0);
  const ghostTag = () => { if (!GHOST) return ''; const g = ghostAt(), me = asked - wrong.length; return ` · <span class="ghost${me > g ? ' lead' : me < g ? ' behind' : ''}" id="ghN" aria-label="เงาสถิติเดิม ${g} ข้อ">👻 ${g}</span>`; };
  // Top-right status of an endless run (rebuilt after every answer).
  const runStat = () => (SURV ? `${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)} · ✅ <b>${asked - wrong.length}</b>${ghostTag()}`
    : TIMED ? `⏱ <b id="tLeft">${Math.ceil(timeLeft)}</b> · ✅ <b>${asked - wrong.length}</b>${ghostTag()}`
    : `🔥 <b>${combo}</b> · 🏅 ${Math.max(S.best[gameId] || 0, bestCombo)}`);
  function header() {
    if (ENDLESS) {
      $('#title').textContent = `${GNAME} · ข้อ ${i + 1}`;
      const bar = TIMED ? timeLeft / TIME_LIMIT * 100 : SURV ? asked % 5 * 20 : combo % 10 * 10;
      return `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="จบรอบ">✕</button>${qmHtml()}
      <div class="progress"><div id="tBar" style="width:${bar}%"></div></div>
      <span class="small" id="runStat">${runStat()}</span></div>`;
    }
    if (BOSS) {
      const hp = items.length - (asked - wrong.length);
      $('#title').textContent = `${GNAME} · ข้อ ${Math.min(i + 1, items.length)}/${items.length}`;
      return `<div class="session-top boss-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
      <span class="boss-m" aria-hidden="true">${mascotSvg({ mood: wrong.length ? 'miss' : 'normal', size: 40 })}</span>
      <div class="boss-bars"><div class="progress boss-hp" role="img" aria-label="เลือดบอสเหลือ ${hp} จาก ${items.length}"><div style="width:${hp / items.length * 100}%"></div></div>
        <span class="small">${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)} · 🐲 ${hp}</span></div></div>`;
    }
    if (i < items.length) $('#title').textContent = `${GNAME} · ${i + 1}/${items.length}`;
    return `<div class="session-top">
      <button class="icon-btn" id="quit" aria-label="ออก">✕</button>${qmHtml()}
      <div class="progress"><div style="width:${i / items.length * 100}%"></div></div>
      <span class="small"><b>${score}</b> แต้ม</span></div>`;
  }

  const quit = () => (ENDLESS && asked ? result() : leave());
  // น้องคำ in the corner of the question header (1.115, settings.qMascot): cheers a right answer, looks sad on a wrong one.
  let lastOk = null;
  const qmHtml = (anim = '') => (S.settings.qMascot !== false ? `<span class="q-m${anim}" aria-hidden="true">${mascotSvg({ mood: lastOk == null ? 'normal' : lastOk ? 'happy' : 'miss', size: 42, equip: festEquip().equip })}</span>` : '');
  function qmReact(ok) {
    lastOk = ok;
    const el = view.querySelector('.q-m'); if (el) el.outerHTML = qmHtml(ok ? ' yay' : ' oops');
  }
  // Survival: the level climbs every 5 questions (A1 → C1); falls back to the nearest level the word source has.
  function survivalPick() {
    const want = Math.min(LEVELS.length - 1, Math.floor(i / 5));
    const recent = new Set(items.slice(-15));
    for (let d = 0; d < LEVELS.length; d++) {
      for (const l of d ? [want - d, want + d] : [want]) {
        const c = src.filter((x) => x.g === LEVELS[l] && !recent.has(x));
        if (c.length) return pick(c);
      }
    }
    return pick(src);
  }
  if (TIMED) {
    const t0 = Date.now();
    const tick = setInterval(() => {
      timeLeft = Math.max(0, TIME_LIMIT - (Date.now() - t0) / 1000);
      const l = $('#tLeft'), b = $('#tBar');
      if (l) l.textContent = Math.ceil(timeLeft);
      const gh = GHOST && $('#ghN');
      if (gh) gh.outerHTML = ghostTag().slice(3);
      if (b) b.style.width = timeLeft / TIME_LIMIT * 100 + '%';
      if (timeLeft <= 0) result();
    }, 100);
    cleanup = () => clearInterval(tick);
  }
  function q() {
    if (finished) return;
    if (ENDLESS && i >= items.length) items.push(...(SURV ? [survivalPick()] : shuffle(src).filter((x) => x !== items[items.length - 1])));
    if (i >= items.length) return result();
    const w = items[i];
    playQuiz.cur = w; // the word being asked (read by tests)
    reach = Math.max(reach, LEVELS.indexOf(w.g));
    const m = STAGE ? stagePick(w) : SURV ? pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'cloze'] : ['en2th', 'th2en', 'listen'])
      : TIMED ? pick(['en2th', 'th2en'])
      : gameId === 'review' ? pick(hasCloze(w) ? ['en2th', 'th2en', 'listen', 'spell', 'cloze'] : ['en2th', 'th2en', 'listen', 'spell']) : mode;
    if (m === 'spell') return qSpell(w);
    if (m === 'hangman') return qHangman(w);
    if (m === 'anagram') return qAnagram(w);
    if (m === 'speak') return qSpeak(w);
    if (m === 'speakS') return qSpeak(w, true);
    if (m === 'dict') return qDict(w);
    if (m === 'dictW') return qDictW(w);
    if (m === 'dictS') return qDictS(w);
    if (m === 'compose') return qCompose(w);
    if (m === 'hand') return qHand(w);
    if (m === 'order') return qOrder(w, w.e, w.et);
    if (m === 'sOrder') return qOrder(w, w._s, '', w._st);
    if (m === 'sCloze') return qSCloze(w);
    if (m === 'colloc') return qColloc(w);
    if (m === 'emoji') return qEmoji(w);
    if (m === 'confuse') return qConfuse(w);
    if (m === 'minpair') return qMinpair(w);
    if (m === 'wform') return qWform(w);
    if (m === 'phrasal') return qPhrasal(w);
    if (m === 'syn') return qSyn(w);
    if (m === 'affix') return qAffix(w);
    if (m === 'root') return qRoot(w);
    if (m === 'idiom') return qIdiom(w);
    if (m === 'sit') return qSit(w);
    if (m === 'num') return qNum(w);
    if (m === 'irreg') return qIrreg(w);
    if (m === 'dprep') return qDprep(w);
    if (m === 'thaierr') return qMistake(w);
    if (m === 'gpat') return qGpat(w);
    if (m === 'real') return qReal(w);
    const toTh = m !== 'th2en' && m !== 'cloze' && m !== 'ipa';
    const diff = gameDiff();
    const opts = shuffle([w, ...(m === 'ipa' ? ipaDistractors(w) : distractors(w, 3, toTh ? 't' : 'w', diff >= 2))]);
    const limit = diff >= 3 && !ENDLESS ? (m === 'cloze' ? 15 : 12) : 0; // seconds per question
    let prompt;
    if (m === 'en2th') prompt = `<div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
    else if (m === 'th2en') prompt = `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
    else if (m === 'guess') prompt = `<div class="small muted">เดาความหมายของคำที่ไฮไลต์จากประโยค</div><div class="cloze" lang="en" style="margin-top:8px">${hlExample(w)}</div>`;
    else if (m === 'ipa') prompt = `<div class="small muted">คำนี้อ่านว่าอะไร</div><div class="word" lang="en" style="font-family:'Noto Sans','Segoe UI',system-ui,sans-serif">${esc(w.i)}</div><div class="pos">${esc(w.p)}</div>`;
    else if (m === 'cloze') {
      const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
      prompt = `<div class="cloze" lang="en">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="clozeHint">💡 ดูคำแปลประโยค</button><div class="thx" id="clozeTh" hidden>${esc(w.et)}</div>`;
    }
    else prompt = `<button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button><div class="muted small" style="margin-top:10px">แตะเพื่อฟังอีกครั้ง</div>${slowBtn(w.w)}`;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>${prompt}${limit ? `<div class="q-timer" aria-hidden="true"><i style="--t:${limit}s"></i></div>` : ''}</div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(toTh ? o.t : m === 'cloze' ? clozeOpt(o, w) : o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = quit;
    if ((m === 'en2th' || m === 'listen') && !TIMED) speak(w.w);
    const say = view.querySelector('[data-say]'); if (say) say.onclick = () => speak(w.w);
    const hb = $('#clozeHint'); if (hb) hb.onclick = () => { $('#clozeTh').hidden = false; hb.remove(); };
    let answered = false, tm = null;
    // b = the tapped option, or null when the time ran out
    const choose = (b) => {
      if (answered) return;
      answered = true; clearTimeout(tm);
      const ok = !!b && +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (b && !ok) b.classList.add('wrong');
      gameAcc(ok);
      mark(w, ok);
      if (ENDLESS) $('#runStat').innerHTML = runStat();
      const out = (SURV || BOSS) && hearts <= 0;
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `${b ? '❌' : '⏰ หมดเวลา'} <b>${esc(w.w)}</b> = ${esc(w.t)}`)
        + (!TIMED && (m === 'cloze' || m === 'guess' || !ok) ? hookBox(w) + exampleBox(w) : '')
        + (out ? '<div class="center" style="margin-top:8px">💔 หัวใจหมดแล้ว</div>' : '')
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">${out ? 'ดูผล →' : 'ถัดไป →'}</button>`;
      bindSayEx(view, w.e); // buttons only present when the example is shown
      $('#nextQ').onclick = next;
      if (!TIMED) { if (m === 'cloze' || m === 'guess') speak(w.e); else if (m === 'th2en' || m === 'ipa') speak(w.w); }
      if (TIMED) setTimeout(() => { if (items[i] === w) next(); }, ok ? 350 : 1200);
      else if (ok && m !== 'cloze' && m !== 'guess') setTimeout(() => { if (items[i] === w) next(); }, 1000);
    };
    view.querySelector('.options').onclick = (e) => { const b = e.target.closest('.opt'); if (b) choose(b); };
    if (limit) {
      tm = setTimeout(() => { if (current === 'games') choose(null); }, limit * 1000);
      cleanup = () => clearTimeout(tm);
    }
  }

  // Dictation of one word: hear it, type all of it (no meaning shown, so it tests ear and spelling together).
  function qDictW(w) {
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button>
        <div class="muted small" style="margin-top:10px">ฟังแล้วพิมพ์คำที่ได้ยินให้ครบทั้งคำ</div>${slowBtn(w.w)}
        <div style="margin-top:12px;font-size:22px;letter-spacing:4px;font-weight:700" id="hint" aria-live="polite"></div></div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำที่ได้ยิน" aria-label="พิมพ์คำที่ได้ยิน">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(w.w);
    const inp = $('#si');
    let tries = 0, answered = false;
    const norm = (x) => x.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = w.w; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ คำตอบคือ'} <b lang="en">${esc(w.w)}</b> <span class="muted">${esc(w.i)}</span> = ${esc(w.t)}`
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    if (typeof appKbd === 'function') appKbd($('#si'), $('#sf')); // 1.123: the app's keyboard for one-word answers
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      if (norm(inp.value) === norm(w.w)) return done(tries === 0);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false);
      $('#reveal').textContent = 'ยังไม่ถูก ฟังอีกครั้งนะ 💪';
      $('#hint').textContent = w.w[0] + w.w.slice(1).replace(/[a-zA-Z]/g, '_');
      speak(w.w);
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    setTimeout(() => { if (items[i] === w && !answered) speak(w.w); }, 200);
  }

  // Dictation of a whole sentence: hear it, type it, then every word is checked (the sentence is lined up with what was typed).
  function qDictS(w) {
    const target = dictTokens(w.e);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <button class="speak" data-say aria-label="ฟังประโยค" style="width:76px;height:76px;font-size:34px;margin:0">🔊</button>
        <div>${slowBtn(w.e)}</div>
        <div class="muted small" style="margin-top:10px">ฟังแล้วพิมพ์ประโยคให้ครบ (${target.length} คำ) · ไม่ต้องใส่เครื่องหมายวรรคตอน</div>
        <button class="hint-btn" id="dHint">💡 ดูคำแปลประโยค</button><div class="thx" id="dTh" hidden>${esc(w.et)}</div></div>
      <form id="sf" autocomplete="off">
        <textarea class="spell-input" id="si" rows="2" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="พิมพ์ประโยคที่ได้ยิน" aria-label="พิมพ์ประโยคที่ได้ยิน"></textarea>
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(w.e);
    $('#dHint').onclick = () => { $('#dTh').hidden = false; $('#dHint').remove(); };
    const inp = $('#si');
    let tries = 0, answered = false;
    const done = (ok, diff) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ลองดูคำที่พลาด'} <span class="muted small">ถูก ${diff.hit}/${target.length} คำ</span>
        <div class="example"><div class="en dict-res" lang="en">${diff.marks.map((m) => `<span class="dw ${m.ok ? 'ok' : 'no'}">${esc(m.t)}</span>`).join(' ')}</div>
        ${diff.extra.length ? `<div class="small muted">คำที่พิมพ์เกินมา: ${esc(diff.extra.join(' '))}</div>` : ''}
        <div class="en" lang="en" style="margin-top:6px">${esc(w.e)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(w.et)}</div></div>`
        + hookBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
    };
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      const diff = dictDiff(target, dictTokens(inp.value));
      if (diff.hit / target.length >= 0.85 && diff.extra.length <= 1) return done(tries === 0, diff);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false, diff);
      $('#reveal').textContent = `ถูก ${diff.hit}/${target.length} คำ ฟังอีกครั้งแล้วแก้ดูนะ 💪`;
      speak(w.e);
    };
    $('#skip').onclick = () => { if (!answered) done(false, dictDiff(target, dictTokens(inp.value))); };
    setTimeout(() => { if (items[i] === w && !answered) speak(w.e); }, 200);
  }

  function qSpell(w) {
    const hint = w.w[0] + w.w.slice(1).replace(/[a-zA-Z]/g, '_');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>
        <div style="margin-top:12px;font-size:22px;letter-spacing:4px;font-weight:700" id="hint">${esc(hint)}</div>
      </div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำภาษาอังกฤษ">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const inp = $('#si');
    inp.focus();
    let tries = 0, answered = false;
    const norm = (s) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = w.w; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! ${esc(w.i)}` : `❌ คำตอบคือ <b>${esc(w.w)}</b> ${esc(w.i)}`)
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    if (typeof appKbd === 'function') appKbd($('#si'), $('#sf')); // 1.123: the app's keyboard for one-word answers
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      if (norm(inp.value) === norm(w.w)) return done(tries === 0);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false);
      $('#reveal').textContent = 'ยังไม่ถูก ลองอีกครั้ง 💪';
      $('#hint').textContent = w.w.slice(0, 2) + w.w.slice(2).replace(/[a-zA-Z]/g, '_');
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
  }

  // Hangman: Thai meaning + blanks (first letter shown), tap letters; 6 misses lose. Right = solved with at most 3 misses.
  function qHangman(w) {
    const word = w.w.toLowerCase(), LIVES = 6;
    const guessed = new Set([word[0]]), misses = [];
    let answered = false;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>
        <div class="hg-word" id="hgWord" lang="en" role="img"></div>
        <div class="hg-lives" id="hgLives"></div></div>
      <div class="hg-kb" id="hgKb">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div class="hg-kr">${[...r].map((c) => `<button class="hg-k" data-l="${c}" lang="en">${c}</button>`).join('')}</div>`).join('')}</div>
      <button class="btn block" id="hgGive" style="margin-top:12px">ไม่รู้ / เฉลย</button>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const solved = () => [...word].every((c) => guessed.has(c));
    const paint = (reveal) => {
      $('#hgWord').innerHTML = [...word].map((c) => `<span class="hg-c${reveal && !guessed.has(c) ? ' miss' : ''}">${guessed.has(c) || reveal ? c : ''}</span>`).join('');
      $('#hgWord').setAttribute('aria-label', [...word].map((c) => (guessed.has(c) || reveal ? c : 'ว่าง')).join(' '));
      $('#hgLives').innerHTML = '❤️'.repeat(LIVES - misses.length) + '🖤'.repeat(misses.length)
        + (misses.length ? ` <span class="small muted" lang="en">${misses.join(' ').toUpperCase()}</span>` : '');
      view.querySelectorAll('.hg-k').forEach((b) => {
        const l = b.dataset.l;
        b.disabled = answered || guessed.has(l) || misses.includes(l);
        b.classList.toggle('hit', guessed.has(l)); b.classList.toggle('miss', misses.includes(l));
      });
    };
    const stop = () => document.removeEventListener('keydown', onKey);
    const done = (win) => {
      answered = true; stop(); cleanup = null;
      const ok = win && misses.length <= 3;
      mark(w, ok);
      paint(true);
      $('#reveal').innerHTML = (win ? (ok ? '✅ เก่งมาก!' : '👍 แก้ได้ แต่พลาดหลายครั้ง ยังไม่นับว่าแม่น') : '❌ คำตอบคือ') + ` <b lang="en">${esc(w.w)}</b> ${esc(w.i)}`
        + (ok ? '' : hookBox(w)) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      $('#hgGive').remove();
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    const press = (l) => {
      if (answered || guessed.has(l) || misses.includes(l)) return;
      if (word.includes(l)) { guessed.add(l); sfx('ok'); } else { misses.push(l); sfx('bad'); }
      paint();
      if (solved()) done(true); else if (misses.length >= LIVES) done(false);
    };
    function onKey(e) { if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[a-zA-Z]$/.test(e.key) && current === 'games') press(e.key.toLowerCase()); }
    document.addEventListener('keydown', onKey);
    cleanup = stop;
    $('#hgKb').onclick = (e) => { const b = e.target.closest('.hg-k'); if (b) press(b.dataset.l); };
    $('#hgGive').onclick = () => { if (!answered) done(false); };
    paint();
  }

  // Anagram: tap the shuffled letters in order to spell the word; one wrong try is forgiven.
  function qAnagram(w) {
    const letters = [...w.w.toLowerCase()];
    let order = shuffle(letters.map((_, k) => k));
    for (let n = 0; n < 8 && (order.every((x, k) => x === k) || order.map((k) => letters[k]).join('') === w.w.toLowerCase()); n++) order = shuffle(order);
    const picked = [];
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)} · ${letters.length} ตัวอักษร</div></div>
      <div class="ord-ans" id="oAns" lang="en"></div>
      <div class="ord-pool" id="oPool" lang="en">${order.map((k) => `<button class="ord-chip" data-k="${k}">${esc(letters[k])}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" id="oClear">↺ เริ่มใหม่</button><button class="btn grow" id="oGive">ไม่รู้ / เฉลย</button></div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false, tries = 0;
    const paint = () => {
      $('#oAns').innerHTML = picked.length ? picked.map((k, j) => `<button class="ord-chip on" data-j="${j}">${esc(letters[k])}</button>`).join('') : '<span class="muted small">แตะตัวอักษรด้านล่างเรียงเป็นคำ</span>';
      view.querySelectorAll('#oPool .ord-chip').forEach((b) => (b.disabled = picked.includes(+b.dataset.k)));
    };
    const done = (ok, solvedLate) => {
      answered = true;
      mark(w, ok);
      $('#oAns').classList.add(ok || solvedLate ? 'ok' : 'no');
      $('#oAns').innerHTML = `<span class="ord-full">${esc(w.w)}</span>`;
      $('#oPool').innerHTML = '';
      $('#reveal').innerHTML = (ok ? '✅ ถูกต้อง!' : solvedLate ? '👍 เรียงได้แล้ว แต่ต้องลองสองครั้ง ยังไม่นับว่าแม่น' : '❌ คำตอบคือด้านบน') + ` ${esc(w.i)}` + (ok ? '' : hookBox(w)) + exampleBox(w)
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    $('#oPool').onclick = (e) => {
      const b = e.target.closest('.ord-chip'); if (!b || answered || b.disabled) return;
      picked.push(+b.dataset.k); paint();
      if (picked.length < letters.length) return;
      if (picked.map((k) => letters[k]).join('') === letters.join('')) return done(tries === 0, tries > 0);
      tries++;
      if (tries >= 2) return done(false);
      $('#oAns').classList.remove('no'); void $('#oAns').offsetWidth; $('#oAns').classList.add('no');
      $('#reveal').textContent = 'ยังไม่ถูก ลองเรียงใหม่อีกครั้ง 💪';
      setTimeout(() => { if (!answered) { picked.length = 0; $('#oAns').classList.remove('no'); paint(); } }, 600);
    };
    $('#oAns').onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b || answered) return; picked.splice(+b.dataset.j, 1); paint(); };
    $('#oClear').onclick = () => { if (!answered) { picked.length = 0; paint(); } };
    $('#oGive').onclick = () => { if (!answered) done(false); };
    paint();
  }

  function qSpeak(w, sentence) {
    const target = sentence ? w.e : w.w;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        ${sentence ? `<div class="cloze" lang="en">${hlExample(w)}</div><div class="thx" style="margin-top:6px">${esc(w.et)}</div>`
          : `<div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="muted" style="margin-top:6px">${esc(w.t)}</div>`}
        <button class="hint-btn" data-say>🔊 ฟังตัวอย่าง</button></div>
      <div class="center"><button class="mic" id="mic" aria-label="กดแล้วพูด">🎤</button></div>
      <div class="center small muted" id="heard">แตะไมค์แล้วพูด${sentence ? 'ทั้งประโยค' : 'คำนี้'}</div>
      <button class="btn block" id="skip" style="margin-top:12px">ข้าม / เฉลย</button>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(target);
    const mic = $('#mic'), heard = $('#heard');
    let tries = 0, answered = false, rec = null;
    cleanup = () => { if (rec) try { rec.abort(); } catch (e) { /* ignore */ } };
    const done = (ok) => {
      answered = true; cleanup();
      mark(w, ok);
      mic.disabled = true;
      $('#skip').remove();
      $('#reveal').innerHTML = (ok ? `✅ ออกเสียงถูกแล้ว! <b>${esc(w.w)}</b>` : `👂 ลองฟังแล้วพูดตามอีกครั้งนะ <b>${esc(w.w)}</b> ${esc(w.i)}`)
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = () => { cleanup = null; next(); };
      if (!ok) speak(target);
      else setTimeout(() => { if (items[i] === w) { cleanup = null; next(); } }, 1300);
    };
    mic.onclick = () => {
      if (answered) return;
      if (rec) { rec.stop(); return; }
      if (window.speechSynthesis) speechSynthesis.cancel();
      rec = new SR();
      rec.lang = S.settings.accent; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
      mic.classList.add('on'); heard.textContent = 'กำลังฟัง... พูดได้เลย';
      rec.onresult = (e) => {
        const alts = Array.from(e.results[0]).map((a) => a.transcript);
        if (alts.some((a) => (sentence ? sentenceMatch(a, w.e) : spokenMatch(a, w.w)))) return done(true);
        tries++;
        heard.innerHTML = `ได้ยินว่า "<b>${esc(alts[0] || '')}</b>" ลองอีกครั้งนะ 💪 (${tries}/3)`;
        mic.classList.remove('no'); void mic.offsetWidth; mic.classList.add('no');
        if (tries >= 3) done(false);
      };
      rec.onerror = (e) => {
        heard.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์/การรู้จำเสียง ลองเปิดในตั้งค่า iPhone ดูนะ'
          : 'ไม่ได้ยินเสียง แตะไมค์แล้วลองอีกครั้งนะ';
      };
      rec.onend = () => { rec = null; mic.classList.remove('on'); };
      try { rec.start(); } catch (err) { rec = null; mic.classList.remove('on'); heard.textContent = 'เปิดไมค์ไม่ได้ ลองอีกครั้งนะ'; }
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    speak(target);
  }

  // Dictation: hear the example sentence, type the missing word.
  // Write your own sentence with the word (1.104): auto-checked only for the word (any ending) and length; the app's example is shown to compare.
  // The sentence can be saved into the word's memory hook (S.note).
  function qCompose(w) {
    const stem = w.w.split(/\s+/)[0].replace(/[^A-Za-z'-]/g, ''), cut = stem.length > 3 ? stem.replace(/(e|y)$/i, '') : stem;
    const re = new RegExp('(^|[^A-Za-z])(' + reEsc(w.w) + '|' + reEsc(cut) + '[A-Za-z]*)(?![A-Za-z])', 'i');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="small muted">แต่งประโยคภาษาอังกฤษด้วยคำนี้ (อย่างน้อย 3 คำ)</div>
        <div class="word" lang="en" style="margin-top:6px">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>
        <div class="muted" style="margin-top:6px">${esc(w.t)}</div></div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" lang="en" maxlength="140" autocapitalize="sentences" spellcheck="true" enterkeyhint="done" placeholder="พิมพ์ประโยคของคุณ">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ข้าม / ดูตัวอย่าง</button>
          <button type="submit" class="btn primary grow">ส่งประโยค</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const inp = $('#si');
    let tries = 0, answered = false;
    const done = (ok, mine) => {
      answered = true; mark(w, ok);
      inp.blur(); inp.readOnly = true;
      const saveBtn = ok ? '<button class="btn block" id="saveMine" style="margin-top:10px">💾 เก็บประโยคของฉันไว้ในโน้ต</button>' : '';
      $('#reveal').innerHTML = (ok ? `✅ เยี่ยม! ประโยคของคุณ: <b lang="en">${esc(mine)}</b>` : `👀 ลองดูตัวอย่างของแอปนะ`)
        + `<div class="small muted" style="margin-top:8px">ตัวอย่างของแอป</div>` + hookBox(w) + exampleBox(w) + saveBtn
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      if ($('#saveMine')) $('#saveMine').onclick = () => {
        const old = (S.note[w.w] || '').split(' · ').filter((x) => x && !x.startsWith('✍️ ')).join(' · ');
        setNote(w.w, ((old ? old + ' · ' : '') + '✍️ ' + mine).slice(0, 200));
        save(); $('#saveMine').textContent = '✅ เก็บไว้ในโน้ตแล้ว'; $('#saveMine').disabled = true;
      };
      $('#nextQ').onclick = next;
    };
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      const mine = inp.value.trim().replace(/\s+/g, ' ');
      const words = mine.split(' ').filter(Boolean).length;
      if (words >= 3 && re.test(mine)) return done(true, mine);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 3) return done(false);
      $('#reveal').textContent = words < 3 ? 'ประโยคสั้นไปหน่อย ลองแต่งให้ยาวขึ้น (อย่างน้อย 3 คำ) 💪' : `ในประโยคยังไม่มีคำว่า “${w.w}” (ใช้รูปอื่นได้ เช่น เติม -s -ed -ing) ลองอีกครั้งนะ 💪`;
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    setTimeout(() => inp.focus(), 50);
  }
  // ✏️ Handwriting (1.135): see the Thai meaning, write the word by hand (Apple Pencil, finger or mouse) on lined paper, then the
  // answer is laid over the writing and the player grades it. 👻 ลอกตาม (settings.handTrace) shows a faint copy to trace: practice
  // only (noSrs). Once a pencil touches the pad, finger touches are ignored (palm resting on the screen).
  function qHand(w) {
    noSrs = false;
    const hint = w.w[0] + w.w.slice(1).replace(/[a-zA-Z]/g, '_');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>
        <div style="margin-top:10px;font-size:20px;letter-spacing:4px;font-weight:700" lang="en" aria-label="ตัวช่วย ${w.w.replace(/[^a-zA-Z]/g, '').length} ตัวอักษร">${esc(hint)}</div>
      </div>
      <div class="hd-wrap"><canvas id="hdPad" class="hd-pad" role="img" aria-label="พื้นที่เขียนคำภาษาอังกฤษด้วยมือ"></canvas></div>
      <div class="row hd-tools">
        <button type="button" class="btn" id="hdUndo">↶ ย้อน</button><button type="button" class="btn" id="hdClear">🗑 ล้าง</button>
        <button type="button" class="btn grow" id="hdTrace" aria-pressed="false">👻 ลอกตาม</button></div>
      <div class="row" id="hdAct" style="margin-top:10px">
        <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
        <button type="button" class="btn primary grow" id="hdCheck">ตรวจคำตอบ</button></div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    const cv = $('#hdPad'), ctx = cv.getContext('2d');
    const strokes = [];
    let cur = null, answered = false, shown = false, trace = !!S.settings.handTrace, traced = trace, W_ = 0, H_ = 0;
    const ink = () => getComputedStyle(view).getPropertyValue('--text').trim() || '#222';
    const accent = () => getComputedStyle(view).getPropertyValue('--primary').trim() || '#6c5ce7';
    const lineY = (k) => H_ * [0.2, 0.42, 0.68, 0.88][k]; // ascender · x-height · baseline · descender
    const font = () => {
      let px = (lineY(2) - lineY(0)) / 0.72;
      ctx.font = `${px}px "Chalkboard SE", "Noteworthy", "Comic Sans MS", "Segoe Print", sans-serif`;
      const wd = ctx.measureText(w.w).width;
      if (wd > W_ * 0.9) { px *= W_ * 0.9 / wd; ctx.font = `${px}px "Chalkboard SE", "Noteworthy", "Comic Sans MS", "Segoe Print", sans-serif`; }
    };
    function paint() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      const r = cv.width / W_; ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = ink(); ctx.globalAlpha = 0.18; ctx.setLineDash([]);
      [0, 2, 3].forEach((k) => { ctx.beginPath(); ctx.moveTo(8, lineY(k)); ctx.lineTo(W_ - 8, lineY(k)); ctx.stroke(); });
      ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(8, lineY(1)); ctx.lineTo(W_ - 8, lineY(1)); ctx.stroke(); ctx.setLineDash([]);
      if (trace || shown) { // faint copy (trace) or the answer laid over the writing (after checking)
        font(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = shown ? accent() : ink(); ctx.globalAlpha = shown ? 0.45 : 0.16;
        ctx.fillText(w.w, W_ / 2, lineY(2));
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = ink(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const s of strokes) drawStroke(s);
    }
    function drawStroke(s, from = 1) {
      if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.pts[0][2] / 2, 0, 7); ctx.fillStyle = ink(); ctx.fill(); return; }
      for (let k = Math.max(1, from); k < s.pts.length; k++) {
        const a = s.pts[k - 1], b = s.pts[k];
        ctx.lineWidth = (a[2] + b[2]) / 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    const size = () => {
      if (!cv.isConnected) return;
      const r = cv.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
      if (!r.width) return;
      const k = W_ ? r.width / W_ : 1; // keep the strokes when the pad changes size (rotation)
      if (W_ && k !== 1) strokes.forEach((s) => s.pts.forEach((p) => { p[0] *= k; p[1] *= r.height / H_; }));
      W_ = r.width; H_ = r.height; cv.width = Math.round(W_ * dpr); cv.height = Math.round(H_ * dpr);
      paint();
    };
    size();
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    if (ro) ro.observe(cv);
    let pen = false;
    const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'pen' ? 1.6 + (e.pressure || 0.5) * 4 : 4]; };
    cv.addEventListener('pointerdown', (e) => {
      if (answered) return;
      if (e.pointerType === 'pen') pen = true; else if (pen && e.pointerType === 'touch') return; // palm rest
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic events */ }
      cur = { id: e.pointerId, pts: [at(e)] }; strokes.push(cur);
      ctx.strokeStyle = ink(); drawStroke(cur);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur || e.pointerId !== cur.id) return;
      e.preventDefault();
      const n = cur.pts.length;
      for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) cur.pts.push(at(ev));
      if (cur.pts.length === n) cur.pts.push(at(e));
      ctx.strokeStyle = ink(); drawStroke(cur, n);
    });
    const end = (e) => { if (cur && e.pointerId === cur.id) cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false }); // no page scroll while writing (older iOS)
    const tBtn = $('#hdTrace');
    const showTrace = () => { tBtn.classList.toggle('on', trace); tBtn.setAttribute('aria-pressed', String(trace)); };
    showTrace();
    tBtn.onclick = () => {
      if (answered) return;
      trace = !trace; if (trace) traced = true;
      S.settings.handTrace = trace; save(); showTrace(); paint();
    };
    $('#hdUndo').onclick = () => { if (!answered && strokes.length) { strokes.pop(); paint(); } };
    $('#hdClear').onclick = () => { if (!answered) { strokes.length = 0; paint(); } };
    const done = (ok) => {
      answered = true; shown = true; paint();
      if (ro) ro.disconnect();
      noSrs = traced; // traced = copied, so it only counts as practice
      mark(w, ok);
      $('#reveal').innerHTML = (ok ? `✅ ${traced ? 'ลอกตามได้ครบ (โหมดฝึก ไม่นับรอบทบทวน)' : 'เขียนถูก!'} <b lang="en">${esc(w.w)}</b> ${esc(w.i)}` : `❌ คำที่ถูกคือ <b lang="en">${esc(w.w)}</b> ${esc(w.i)}`)
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
    };
    $('#skip').onclick = () => { if (!answered) { $('#hdAct').hidden = true; done(false); } };
    $('#hdCheck').onclick = () => {
      if (answered) return;
      if (!strokes.length) { $('#reveal').textContent = 'ลองเขียนคำลงในกรอบก่อนนะ ✏️ (ถ้าไม่รู้ กด “ไม่รู้ / เฉลย”)'; return; }
      shown = true; paint(); // answer over the handwriting: the player compares and grades
      $('#hdAct').innerHTML = `<div class="small muted hd-ask">เทียบลายมือกับคำสีจาง <b lang="en">${esc(w.w)}</b> เขียนถูกทุกตัวไหม?</div>
        <button type="button" class="btn grow" id="hdNo">❌ ผิด / ไม่ครบ</button><button type="button" class="btn primary grow" id="hdYes">✅ ถูกทุกตัว</button>`;
      $('#hdNo').onclick = () => { $('#hdAct').hidden = true; done(false); };
      $('#hdYes').onclick = () => { $('#hdAct').hidden = true; done(true); };
    };
  }
  function qDict(w) {
    const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <button class="speak" data-say aria-label="ฟังประโยค" style="width:76px;height:76px;font-size:34px;margin:0">🔊</button>
        <div>${slowBtn(w.e)}</div>
        <div class="cloze" lang="en" style="margin-top:12px">${esc(blank).replace('\u0000', '<span class="blank" id="hint">_____</span>')}</div>
        <button class="hint-btn" id="dHint">💡 ดูคำแปลประโยค</button><div class="thx" id="dTh" hidden>${esc(w.et)}</div></div>
      <form id="sf" autocomplete="off">
        <input class="spell-input" id="si" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="พิมพ์คำที่ได้ยิน">
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn grow" id="skip">ไม่รู้ / เฉลย</button>
          <button type="submit" class="btn primary grow">ตรวจคำตอบ</button>
        </div>
      </form>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(w.e);
    $('#dHint').onclick = () => { $('#dTh').hidden = false; $('#dHint').remove(); };
    const inp = $('#si');
    let tries = 0, answered = false;
    const norm = (x) => x.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
    const answerWord = (w.e.match(clozeRe(w)) || ['', '', w.w])[0].replace(/^[^A-Za-z]/, '');
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      inp.blur(); inp.value = answerWord; inp.classList.add(ok ? 'ok' : 'no');
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ คำตอบคือ <b>${esc(answerWord)}</b> (${esc(w.t)})`)
        + hookBox(w) + exampleBox(w) + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1500);
    };
    if (typeof appKbd === 'function') appKbd($('#si'), $('#sf')); // 1.123: the app's keyboard for one-word answers
    $('#sf').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      if (norm(inp.value) === norm(answerWord) || norm(inp.value) === norm(w.w)) return done(tries === 0);
      tries++;
      inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no');
      if (tries >= 2) return done(false);
      $('#reveal').textContent = 'ยังไม่ถูก ฟังอีกครั้งนะ 💪';
      $('#hint').textContent = answerWord[0] + answerWord.slice(1).replace(/[a-zA-Z]/g, '_');
      speak(w.e);
    };
    $('#skip').onclick = () => { if (!answered) done(false); };
    setTimeout(() => speak(w.e), 200);
  }

  // Tap the shuffled words in order to rebuild the sentence (word examples or story sentences).
  function qOrder(w, sent, th, from) {
    const toks = sent.trim().split(/\s+/);
    let order = shuffle(toks.map((t, k) => k));
    for (let n = 0; n < 5 && order.every((x, k) => x === k); n++) order = shuffle(order);
    const picked = [];
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        ${th ? `<div class="ord-th">${esc(th)}</div>` : `<div class="small muted">จากเรื่อง <b>${esc(from)}</b></div>`}
        <button class="hint-btn" id="oSay">🔊 ฟังประโยค (ตัวช่วย)</button></div>
      <div class="ord-ans" id="oAns"><span class="muted small">แตะคำด้านล่างเรียงตามลำดับ</span></div>
      <div class="ord-pool" id="oPool">${order.map((k) => `<button class="ord-chip" data-k="${k}">${esc(toks[k])}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn grow" id="oClear">↺ เริ่มใหม่</button><button class="btn grow" id="oGive">ไม่รู้ / เฉลย</button></div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false, heard = false;
    $('#oSay').onclick = () => { heard = true; speak(sent); };
    const paint = () => {
      $('#oAns').innerHTML = picked.length ? picked.map((k, j) => `<button class="ord-chip on" data-j="${j}">${esc(toks[k])}</button>`).join('') : '<span class="muted small">แตะคำด้านล่างเรียงตามลำดับ</span>';
      view.querySelectorAll('#oPool .ord-chip').forEach((b) => (b.disabled = picked.includes(+b.dataset.k)));
    };
    const done = (ok) => {
      answered = true;
      mark(w, ok);
      $('#oAns').classList.add(ok ? 'ok' : 'no');
      $('#oAns').innerHTML = `<span class="ord-full">${esc(sent)}</span>`;
      $('#oPool').innerHTML = '';
      $('#reveal').innerHTML = (ok ? '✅ ถูกต้อง!' : '❌ ประโยคที่ถูกคือด้านบน') + (th ? '' : ` <span class="small muted">· ${esc(w.w)} = ${esc(w.t)}</span>`)
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(sent);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 2200);
    };
    $('#oPool').onclick = (e) => {
      const b = e.target.closest('.ord-chip'); if (!b || answered || b.disabled) return;
      picked.push(+b.dataset.k); paint();
      if (picked.length === toks.length) done(picked.map((k) => toks[k]).join(' ') === toks.join(' ') && !heard);
    };
    $('#oAns').onclick = (e) => { const b = e.target.closest('[data-j]'); if (!b || answered) return; picked.splice(+b.dataset.j, 1); paint(); };
    $('#oClear').onclick = () => { if (!answered) { picked.length = 0; paint(); } };
    $('#oGive').onclick = () => { if (!answered) done(false); };
  }

  // Story cloze: the hardest list word of a story sentence is blanked; options are other words from that story.
  function qSCloze(w) {
    const re = new RegExp(`\\b${w._tok.replace(/[’']/g, "[’']")}\\b`);
    const blank = w._s.replace(re, '\u0000');
    const opts = shuffle([w._tok, ...w._opts]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">จากเรื่อง <b>${esc(w._st)}</b></div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === w._tok;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === w._tok) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(w._tok)}</b> (${esc(w.w)} = ${esc(w.t)})
        <div class="example"><div class="en" lang="en">${esc(w._s)}</div></div><button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(w._s);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 2200);
    };
  }

  // Collocations: "___ a decision" + Thai meaning → pick the headword.
  function qColloc(w) {
    const { phrase, th, shown, opts } = collocQ(w);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div style="height:8px"></div>
        <div class="cloze" lang="en">${esc(shown).replace('\u0000', '<span class="blank">_____</span>')}</div>
        <div class="muted" style="margin-top:6px">${esc(th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === w.w;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === w.w) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} <b>${esc(phrase)}</b> = ${esc(th)}
        <div class="small muted" style="margin-top:6px">คำคู่กันอื่นของ ${esc(w.w)}: ${COLLOC[w.w].filter((x) => x[0] !== phrase).map((x) => esc(x[0])).join(' · ') || '–'}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      $('#nextQ').onclick = next;
      speak(phrase);
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1600);
    };
  }

  // Confusable words: pick the right one of a pair in a sentence, then see the Thai tip.
  function qConfuse(w) {
    const c = w._c, [sent, right, bad, th] = w._q;
    const opts = shuffle([right, bad]);
    const full = sent.replace('___', right);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${esc(c.a)} หรือ ${esc(c.b)}?</div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(sent).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="cHint">💡 ดูคำแปลประโยค</button><div class="thx" id="cTh" hidden>${esc(th)}</div></div>
      <div class="options two">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#cHint').onclick = () => { $('#cTh').hidden = false; $('#cHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}
        <div class="example"><div class="en" lang="en">${esc(full)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(th)}</div></div>
        <div class="tip-box">💡 ${esc(c.tip)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(full);
      $('#nextQ').onclick = next;
      speak(full);
    };
  }

  // Word forms: pick the family member that fits the sentence, then see the whole family.
  function qWform(w) {
    const f = w._f, [sent, right, , th] = w._q;
    const opts = shuffle([right, ...shuffle(f.f.map((x) => x[0]).filter((x) => x !== right)).slice(0, 3)]);
    const full = sent.replace('___', right);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เลือกรูปคำที่เข้ากับประโยค</div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(sent).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="fHint">💡 ดูคำแปลประโยค</button><div class="thx" id="fTh" hidden>${esc(th)}</div></div>
      <div class="options${opts.length === 2 ? ' two' : ''}">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#fHint').onclick = () => { $('#fTh').hidden = false; $('#fHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำที่ถูกคือ <b>${esc(right)}</b>`}
        <div class="example"><div class="en" lang="en">${esc(full)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(th)}</div></div>
        <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧬 ครอบครัวคำ</b> (แตะเพื่อฟัง)</div>${famRows(f, right)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(full);
      view.querySelector('.fam-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(full);
    };
  }

  // Phrasal verbs: the verb stays, pick the particle(s) that give the Thai meaning shown.
  function qPhrasal(w) {
    const r = w._pv, right = r.part;
    const opts = shuffle([right, ...pvDistractors(r)]);
    let k = 0;
    const shown = esc(r.ex).replace(/\[([^\]]+)\]/g, (all, x) => (k++ ? '<span class="blank">_____</span>' : `<b>${x}</b>`));
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เติมให้ได้ความหมาย</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(r.th)}”</div>
        <div class="cloze" lang="en" style="margin-top:8px">${shown}</div>
        <button class="hint-btn" id="pvHint">💡 ดูคำแปลประโยค</button><div class="thx" id="pvTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#pvHint').onclick = () => { $('#pvTh').hidden = false; $('#pvHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      const same = phrasalOf(r.verb);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <b>${esc(r.pv)}</b>`}
        <div class="example"><div class="en" lang="en">${pvHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div></div>
        ${same.length > 1 ? `<div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧩 ${esc(r.verb)} + …</b> (แตะเพื่อฟัง)</div>${pvRows(same, r.pv)}</div>` : ''}
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.plain);
      const fb = view.querySelector('.fam-box'); if (fb) fb.onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(r.plain);
    };
  }

  // Synonyms / antonyms: pick the word closest in meaning (≈) or the opposite (↔).
  function qSyn(w) {
    const it = w._syn, { answer, opts } = synQuestion(it);
    const ask = it.kind === 's' ? 'คำไหนความหมาย<b>ใกล้เคียง</b>ที่สุด' : 'คำไหนมีความหมาย<b>ตรงข้าม</b>';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${ask}</div>
        <div class="word" lang="en" style="margin-top:6px">${it.kind === 's' ? '≈' : '↔'} ${esc(it.t)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
        <div class="muted">${esc(it.g.th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(it.t);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === answer;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === answer) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ คำตอบคือ <b>${esc(answer)}</b>`}
        <div class="card-box syn-box">${synCard(it.g, it.t)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('.syn-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(answer);
    };
  }

  // Word parts: the base word is shown, pick the prefix/suffix that gives the Thai meaning.
  // Roots (1.104): the root part of a word is bold; pick its meaning.
  function qRoot(w) {
    const r = w._rt, right = r.th;
    const opts = shuffle([r, ...rootDistractors(r)]).map((x) => x.th);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">ส่วนที่ตัวหนาในคำนี้ (รากศัพท์) หมายถึงอะไร</div>
        <div class="word af-word" lang="en" style="margin-top:8px">${rootHTML(r, w.w)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <b>${esc(right)}</b>`}
        <div class="tip-box"><b class="af-word" lang="en">${rootHTML(r, w.w)}</b> = ${esc(WORD_BY[w.w].t)}<div><b>${esc(rootVariant(r, w.w))}</b> = ${esc(r.th)}</div><div class="small muted">${esc(r.note)}</div></div>
        <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🌱 คำอื่นที่มี ${esc(r.x)}</b> (แตะเพื่อฟัง)</div>${rootRows({ ...r, ex: r.ex.filter((x) => x !== w.w).slice(0, 6) })}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('.fam-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(w.w);
    };
  }
  function qAffix(w) {
    const a = w._af, stem = affixStem(a, w.w), right = affixLabel(a);
    const opts = shuffle([a, ...affixDistractors(a, w.w)]).map(affixLabel);
    const blank = '<span class="blank">___</span>';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เติม${a.k === 'p' ? 'หน้า' : 'ท้าย'}คำให้ได้ความหมาย</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(w.t)}”</div>
        <div class="word" lang="en" style="margin-top:8px">${a.k === 'p' ? blank + esc(stem) : esc(stem) + blank}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <b>${esc(w.w)}</b>`}
        <div class="tip-box"><b class="af-word">${affixHTML(a, w.w)}</b> · <b>${right}</b> = ${esc(a.th)}${a.note ? `<div class="small muted">${esc(a.note)}</div>` : ''}</div>
        <div class="fam-box"><div class="small muted" style="margin:10px 0 6px"><b>🧱 คำอื่นที่มี ${right}</b> (แตะเพื่อฟัง)</div>${affixRows(a, w.w)}</div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('.fam-box').onclick = (ev) => { const c = ev.target.closest('[data-col]'); if (c) speak(c.dataset.col); };
      $('#nextQ').onclick = next;
      speak(w.w);
    };
  }

  // Picture guess: one emoji, pick the English word it shows (distractors are other emoji words, so every option is a picture word).
  function qEmoji(w) {
    const used = new Set([w.w]);
    const others = shuffle(W.filter((x) => EMOJI[x.w] && !used.has(x.w) && used.add(x.w))).slice(0, 3);
    const opts = shuffle([w, ...others]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${lvBadge(w.g)}<div class="small muted" style="margin-top:6px">อีโมจินี้คือคำอะไร</div>
        <div class="emoji-big" role="img" aria-label="ภาพอีโมจิ">${EMOJI[w.w]}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-i="${o.idx}">${esc(o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = quit;
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      if (ENDLESS) $('#runStat').innerHTML = `🔥 <b>${combo}</b> · 🏅 ${Math.max(S.best[gameId] || 0, bestCombo)}`;
      $('#reveal').innerHTML = `${ok ? (ENDLESS && combo >= 2 ? `✅ ติดต่อกัน ${combo} ข้อ! 🔥` : '✅ ถูกต้อง!') : (ENDLESS && bestCombo > 0 ? '❌ สตรีคจบที่ ' + bestCombo + ' · เริ่มนับใหม่' : '❌')} ${EMOJI[w.w]} <b lang="en">${esc(w.w)}</b> = ${esc(w.t)}`
        + (ok ? '' : hookBox(w) + exampleBox(w))
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      bindSayEx(view, w.e);
      $('#nextQ').onclick = next;
      speak(w.w);
    };
  }

  // Idioms: either see the idiom in a sentence and pick its Thai meaning, or see the meaning and pick the idiom.
  function qIdiom(w) {
    const r = w._id, byMeaning = Math.random() < 0.5;
    const right = byMeaning ? r.th : r.id;
    const opts = shuffle([r, ...idDistractors(r)]).map((x) => (byMeaning ? x.th : x.id));
    const prompt = byMeaning
      ? `<div class="small muted">สำนวนนี้หมายถึงอะไร</div><div class="cloze" lang="en" style="margin-top:8px">${idHTML(r)} <button class="say-ex" data-say aria-label="ฟังประโยค">🔊</button></div>`
      : `<div class="small muted">เลือกสำนวนที่มีความหมายว่า</div><div class="th" style="margin:4px 0 2px;font-size:clamp(20px, 6vw, 26px)">“${esc(r.th)}”</div>
        <div class="cloze" lang="en" style="margin-top:8px">${idBlank(r)}</div>`;
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">${prompt}
        <button class="hint-btn" id="idHint">💡 ดูคำแปลประโยค</button><div class="thx" id="idTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-o="${esc(o)}"${byMeaning ? '' : ' lang="en"'}>${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#idHint').onclick = () => { $('#idTh').hidden = false; $('#idHint').remove(); };
    const say = view.querySelector('.q-prompt [data-say]'); if (say) say.onclick = () => speak(r.plain);
    if (byMeaning) speak(r.plain);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.id)}</b> = ${esc(r.th)}
        <div class="example"><div class="en" lang="en">${idHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.plain);
      $('#nextQ').onclick = next;
      speak(r.plain);
    };
  }

  // Situations: see one line of a dialogue and pick the line that comes next (wrong options come from other situations).
  function qSit(w) {
    const st = w._sit, [whoA, prevEn, prevTh] = st.d[w._k - 1], [whoB, right, rightTh] = st.d[w._k];
    const opts = shuffle([right, ...sitDistractors(st)]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${st.icon} ${esc(st.th)} · ประโยคถัดไปควรเป็นข้อไหน</div>
        <div class="dlg-line q" style="margin-top:8px"><small class="muted">${esc(whoA)}</small><span lang="en">${esc(prevEn)} <button class="say-ex" data-say aria-label="ฟังประโยค">🔊</button></span></div>
        <button class="hint-btn" id="sitHint">💡 ดูคำแปล</button><div class="thx" id="sitTh" hidden>${esc(prevTh)}</div>
        <div class="small muted" style="margin-top:8px">${esc(whoB)}:</div></div>
      <div class="options">${opts.map((o) => `<button class="opt sit-opt" data-o="${esc(o)}" lang="en">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    $('#sitHint').onclick = () => { $('#sitTh').hidden = false; $('#sitHint').remove(); };
    view.querySelector('.q-prompt [data-say]').onclick = () => speak(prevEn);
    speak(prevEn);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ประโยคที่เข้ากับบทสนทนาคือ'}
        <div class="example"><div class="en" lang="en">${esc(right)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(rightTh)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(right);
      $('#nextQ').onclick = next;
      speak(right);
    };
  }

  // Grammar tied to words: pick the form the word needs (some advice / enjoy swimming / let me go).
  function qGpat(w) {
    const r = w._gp, opts = shuffle([r.right, ...r.wrong]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${GP_KIND[r.kind].icon} เลือกรูปที่ถูก · ${esc(r.th)}</div>
        <div class="cloze" lang="en" style="margin-top:8px">${esc(r.frame).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="gpHint">💡 ดูคำแปลประโยค</button><div class="thx" id="gpTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    $('#gpHint').onclick = () => { $('#gpTh').hidden = false; $('#gpHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === r.right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === r.right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.right)}</b>
        <div class="example"><div class="en" lang="en">${gpFilled(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div><div class="thx">💡 <b>${esc(r.head)}</b>: ${GP_KIND[r.kind].note}${r.count ? ` · นับว่า ${esc(r.count)}` : ''}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(gpPlain(r));
      $('#nextQ').onclick = next;
      speak(gpPlain(r));
    };
  }

  // Real-life texts: a sign / announcement / menu / bill / label with one word missing - pick it (wrong options never fit the context).
  function qReal(w) {
    const r = w._rt, K = RT_KIND[r.kind], opts = shuffle([r.right, ...r.wrong]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${K.icon} ${K.name} · ${esc(r.sit)}</div>
        <div class="rt-paper rt-${r.kind}" lang="en">${esc(r.text).replace('___', '<span class="blank">_____</span>')}</div>
        <button class="hint-btn" id="rtHint">💡 ดูคำแปล</button><div class="thx" id="rtTh" hidden>${esc(r.th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    $('#rtHint').onclick = () => { $('#rtTh').hidden = false; $('#rtHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === r.right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === r.right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.right)}</b>
        <div class="example"><div class="rt-paper rt-${r.kind} done" lang="en">${esc(r.text).replace('___', `<mark>${esc(r.right)}</mark>`)}</div>
          <button class="say-ex" data-sayex aria-label="ฟังข้อความ">🔊</button><div class="thx">${esc(r.th)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(rtPlain(r));
      $('#nextQ').onclick = next;
      speak(rtPlain(r));
    };
  }

  // Thai-learner mistakes: two versions of a sentence, pick the correct one (the tip explains the trap).
  function qMistake(w) {
    const r = w._mis, opts = shuffle([r.ok, r.no]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">${MIS_CAT[r.cat]}</div><div class="h2" style="margin-top:6px">ประโยคไหนถูกต้อง?</div>
        <div class="small muted" style="margin-top:6px">${esc(r.th)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt sit-opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === r.ok;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === r.ok) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.ok)}</b>
        <div class="example"><div class="en" lang="en"><b>ถูก:</b> ${esc(r.ok)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="en" lang="en" style="opacity:.75"><b>ผิด:</b> <s>${esc(r.no)}</s></div><div class="thx">💡 ${esc(r.tip)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.ok);
      $('#nextQ').onclick = next;
      speak(r.ok);
    };
  }

  // Dependent prepositions: fill the blank with the preposition that goes with the word (interested ___ sports).
  function qDprep(w) {
    const r = w._dp, opts = shuffle([r.prep, ...dpDistractors(r)]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="small muted">เติมบุพบทให้ถูก · ${esc(r.th)}</div>
        <div class="cloze" lang="en" style="margin-top:8px">${dpBlank(r)}</div>
        <button class="hint-btn" id="dpHint">💡 ดูคำแปลประโยค</button><div class="thx" id="dpTh" hidden>${esc(r.exTh)}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    $('#dpHint').onclick = () => { $('#dpTh').hidden = false; $('#dpHint').remove(); };
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === r.prep;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === r.prep) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(r.head)} ${esc(r.prep)}</b> = ${esc(r.th)}
        <div class="example"><div class="en" lang="en">${dpHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังประโยค">🔊</button></div><div class="thx">${esc(r.exTh)}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(r.plain);
      $('#nextQ').onclick = next;
      speak(r.plain);
    };
  }

  // Irregular verbs: see the base form and pick its past (V2) or past participle (V3).
  function qIrreg(w) {
    const r = w._ir, k = w._k, right = w.w;
    const opts = shuffle([right, ...irregOpts(r, k, right)]);
    const label = k === 'v2' ? 'ช่อง 2 · อดีตกาล (Yesterday, I ___)' : k === 'v3' ? 'ช่อง 3 · ใช้หลัง have / has (I have ___)' : 'ช่อง 2 และช่อง 3 · รูปเดียวกัน';
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><div class="word" lang="en">${esc(r.v1)}</div><div class="th" style="margin:2px 0 6px">${esc(r.th)}</div>
        <div class="pos">${label}</div></div>
      <div class="options">${opts.map((o) => `<button class="opt" lang="en" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('games');
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b lang="en">${esc(right)}</b>
        <div class="example"><div class="en" lang="en">${irrHTML(r)} <button class="say-ex" data-sayex aria-label="ฟังเสียง">🔊</button></div><div class="thx">${IRR_TIP[r.pat]}${r.v1 === 'be' ? ' · be เปลี่ยนตามประธาน: I was / he was / we were' : ''}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(irrSay(r));
      $('#nextQ').onclick = next;
      speak(irrSay(r));
    };
  }

  // Numbers: hear a number, price, time, date or phone number and pick the digits that were said.
  function qNum(w) {
    const n = w._num, opts = shuffle([n.right, ...n.opts]);
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop"><span class="pos">${NUM_KINDS[n.kind]}</span><div style="height:8px"></div>
        <button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button>
        <div class="muted small" style="margin-top:10px">ได้ยินเป็นอะไร? แตะเพื่อฟังอีกครั้ง</div>${slowBtn(n.say)}</div>
      <div class="options two">${opts.map((o) => `<button class="opt mp" data-o="${esc(o)}"><b>${esc(o)}</b></button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(n.say);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = b.dataset.o === n.right;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === n.right) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌ ที่ถูกคือ'} <b>${esc(n.right)}</b>
        <div class="example"><div class="en" lang="en">${esc(n.say)} <button class="say-ex" data-sayex aria-label="ฟังอีกครั้ง">🔊</button></div><div class="thx">${NUM_TIPS[n.kind]}</div></div>
        <button class="btn primary block" id="nextQ" style="margin-top:12px">ถัดไป →</button>`;
      view.querySelector('[data-sayex]').onclick = () => speak(n.say);
      $('#nextQ').onclick = next;
      speak(n.say);
    };
    setTimeout(() => { if (items[i] === w && !answered) speak(n.say); }, 200);
  }

  // Minimal pairs: hear one word of a pair (ship / sheep) and pick which one it was.
  function qMinpair(w) {
    const [a, aTh, b, bTh, cat] = w._m;
    const target = Math.random() < 0.5 ? a : b;
    const ipa = (x) => { const e = WORD_BY[x]; return e && e.i ? ` <span class="muted">${esc(e.i)}</span>` : ''; };
    view.innerHTML = `${header()}
      <div class="card-box q-prompt fit pop">
        <button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:96px;height:96px;font-size:44px;margin:0">🔊</button>
        <div class="muted small" style="margin-top:10px">ได้ยินคำไหน? แตะเพื่อฟังอีกครั้ง</div>${slowBtn(target)}</div>
      <div class="options two">${[[a, aTh], [b, bTh]].map(([x, t]) => `<button class="opt mp" data-o="${esc(x)}"><b>${esc(x)}</b><small>${esc(t)}</small></button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = leave;
    view.querySelector('[data-say]').onclick = () => speak(target);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const bt = e.target.closest('.opt'); if (!bt || answered) return;
      answered = true;
      const ok = bt.dataset.o === target;
      view.querySelectorAll('.opt').forEach((o) => { if (o.dataset.o === target) o.classList.add('correct'); });
      if (!ok) bt.classList.add('wrong');
      mark(w, ok);
      $('#reveal').innerHTML = `${ok ? '✅ ถูกต้อง!' : '❌'} ที่ได้ยินคือ <b>${esc(target)}</b>
        <div class="example"><div class="en" lang="en"><b>${esc(a)}</b>${ipa(a)} · <b>${esc(b)}</b>${ipa(b)}</div><div class="thx">${esc(MINPAIRS_TIP[cat] || '')}</div></div>
        <button class="btn block" id="mpCmp" style="margin-top:10px">🔁 ฟังเทียบ ${esc(a)} → ${esc(b)}</button>
        <button class="btn primary block" id="nextQ" style="margin-top:10px">ถัดไป →</button>`;
      $('#mpCmp').onclick = () => { const u = speak(a); if (u) u.onend = () => setTimeout(() => { if (items[i] === w) speak(b); }, 250); };
      $('#nextQ').onclick = next;
      if (ok) setTimeout(() => { if (items[i] === w) next(); }, 1600);
    };
    setTimeout(() => speak(target), 200);
  }

  function mark(w, ok) {
    // A missed pronunciation or word order doesn't mean the meaning was forgotten, so it doesn't reset the card.
    const spk = gameId === 'speak' || gameId === 'speakS';
    const soft = spk || gameId === 'order' || gameId === 'sOrder' || gameId === 'dictS' || gameId === 'compose';
    asked++;
    if (w.idx < 0 && SKILL_GAMES.includes(gameId) && !GEN_GAMES.includes(gameId)) lexGrade(lexKey(gameId, w), ok);
    if (w.idx < 0 || (soft && !ok) || deckRun.practice || noSrs) markActive(!!ok); else gameResult(w, ok, deckRun.map);
    if (spk && ok) S.counts.speak = (S.counts.speak || 0) + 1;
    questEvent('answer', { game: gameId, ok });
    sfx(ok ? 'ok' : 'bad');
    if (ok) { combo++; bestCombo = Math.max(bestCombo, combo); S.counts.maxCombo = Math.max(S.counts.maxCombo || 0, combo); score += 10 + Math.min(combo - 1, 5) * 2; addXP(comboXP(combo)); if (combo >= 5 && combo % 5 === 0) mascotCheer(combo); }
    else { combo = 0; wrong.push(w); if (SURV || BOSS) hearts--; }
    if (TIMED && ok) ghostRun.push(Math.round((Date.now() - runT0) / 100) / 10);
    if (SURV) ghostRun.push(asked - wrong.length);
    qmReact(ok);
    runLog.push(ok);
  }
  function next() { if ((SURV || BOSS) && hearts <= 0) return result(); i++; q(); }

  function result() {
    if (finished) return;
    finished = true;
    if (cleanup) { cleanup(); cleanup = null; }
    const done = STAGE ? stageDone(stage.topic, stage.k, items.length - wrong.length, items.length, BOSS && hearts <= 0) : null;
    const prev = S.best[gameId];
    const right_ = asked - wrong.length;
    // endless emoji run: the record is the longest run of right answers; survival / time attack: how many were right
    const mark_ = SURV || TIMED ? right_ : ENDLESS ? bestCombo : score;
    const isBest = !STAGE && (prev == null || mark_ > prev) && (mark_ > 0 || !ENDLESS);
    if (isBest) { S.best[gameId] = mark_; save(); }
    if ((SURV || TIMED) && isBest && ghostRun.length) { S.ghost = S.ghost || {}; S.ghost[gameId] = ghostRun.slice(0, 400); save(); }
    const ghostEnd = GHOST ? (TIMED ? GHOST.length : GHOST[GHOST.length - 1]) : null;
    const ghostMsg = ghostEnd == null ? '' : `<p class="small">${right_ > ghostEnd ? `👻 แซงเงาตัวเองได้ ${right_ - ghostEnd} ข้อ!` : right_ === ghostEnd ? '👻 เสมอกับเงาตัวเอง' : `👻 เงาตัวเองยังนำอยู่ ${ghostEnd - right_} ข้อ`}</p>`;
    // 1.163.0: the record is spelled out — new (and the old one), or how far off it was ("เกือบแล้ว" when within 15%)
    const unit = SURV || TIMED || ENDLESS ? 'ข้อ' : 'แต้ม';
    const recLine = STAGE ? '' : isBest ? `<p class="res-best new">🏅 สถิติใหม่!${prev != null ? ` <span>(เดิม ${prev} ${unit})</span>` : ''}</p>`
      : prev != null ? `<p class="res-best">${prev - mark_ + 1 <= Math.max(1, prev * 0.15) ? '😮 เกือบแล้ว! ' : ''}ขาดอีก <b>${prev - mark_ + 1}</b> ${unit} จะทำลายสถิติ <span>(🏅 ${prev})</span></p>` : '';
    const total = ENDLESS || (BOSS && hearts <= 0) ? asked : items.length;
    const correct = total - wrong.length;
    if (!ENDLESS && correct === items.length && items.length >= 10) S.counts.perfect = (S.counts.perfect || 0) + 1;
    questEvent('round', { game: gameId, correct, bestCombo, perfect: !ENDLESS && correct === items.length && items.length >= 10 });
    if ((isBest && prev != null) || (STAGE ? done.stars >= 2 : SURV || TIMED ? right_ >= 20 : ENDLESS ? bestCombo >= 10 : correct >= 8)) confetti(STAGE && done.stars === 3 ? 'burst' : undefined);
    const emoji = STAGE && done.stars === 3 && typeof mascotSvg === 'function' ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 104 })}</div>` : STAGE ? (done.stars === 3 ? '🏆' : done.stars ? '🎉' : '💪') : SURV || TIMED ? (right_ >= 30 ? '🏆' : right_ >= 15 ? '🎉' : '💪') : ENDLESS ? (bestCombo >= 20 ? '🏆' : bestCombo >= 10 ? '🎉' : '💪') : correct === items.length ? '🏆' : correct >= 7 ? '🎉' : correct >= 4 ? '💪' : '📚';
    // 1.129: a normal round gets stars (3 = 9+/10, 2 = 7+, 1 = 4+), น้องคำ acting out the result, and its score counting up
    const PLAIN = !STAGE && !ENDLESS, ratio = items.length ? correct / items.length : 0;
    const rStars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
    const rMood = ratio >= 0.8 ? 'happy' : ratio >= 0.5 ? 'normal' : 'miss';
    const rSay = ratio === 1 ? 'เต็มทุกข้อ! เก่งที่สุดเลย 🎉' : ratio >= 0.8 ? 'เยี่ยมมาก! เกือบเต็มแล้ว ✨' : ratio >= 0.5 ? 'ดีขึ้นเรื่อยๆ นะ ทวนคำที่ผิดอีกนิด 💪' : 'ไม่เป็นไรนะ ลองรอบหน้าด้วยกัน 💛';
    const plainHead = PLAIN && typeof mascotSvg === 'function' ? `<div class="result-emoji res-m${rMood === 'happy' ? ' dance' : ''}" aria-hidden="true">${mascotSvg({ mood: rMood, size: 96, equip: festEquip().equip })}</div>
        <div class="res-stars" role="img" aria-label="${rStars} ดาวจาก 3">${[0, 1, 2].map((k) => `<i class="${k < rStars ? 'on' : ''}" style="--k:${k}">★</i>`).join('')}</div><p class="small res-say">${rSay}</p>` : '';
    view.innerHTML = `<div class="card-box center pop res-top sk-${(typeof SKILL_OF === 'object' && SKILL_OF[gameId]) || 'mean'}">
        ${plainHead || `<div class="result-emoji">${emoji}</div>`}
        ${STAGE ? `<div class="h2" aria-label="${done.stars} ดาว">${starRow(done.stars)}</div>
        <p>${BOSS ? (done.stars ? `🐲 ชนะบอสแล้ว!${done.badge ? ' ได้ 🏅 ตราบอสหมวดนี้ (+25 XP)' : ''}` : '💔 หัวใจหมด บอสชนะรอบนี้ ลองใหม่นะ') : done.stars ? (done.first ? 'ผ่านด่านแล้ว! ปลดล็อกด่านต่อไป 🔓' : 'ผ่านด่านแล้ว') : `ยังไม่ผ่าน ต้องถูกอย่างน้อย ${needFor(items.length)} ข้อ ลองใหม่นะ`} · ถูก ${correct}/${items.length}</p>`
        : SURV ? `<div class="h2">❤️ รอดมาได้ ${right_} ข้อ</div>
        <p>ไปถึงคำระดับ ${LV_LABEL[LEVELS[reach]]} · คอมโบสูงสุด ${bestCombo}</p>${recLine}${ghostMsg}`
        : TIMED ? `<div class="h2">⏱️ ตอบถูก ${right_} ข้อใน ${TIME_LIMIT} วินาที</div>
        <p>ตอบไป ${asked} ข้อ · คอมโบสูงสุด ${bestCombo}</p>${recLine}${ghostMsg}`
        : ENDLESS ? `<div class="h2">🔥 ถูกติดต่อกันสูงสุด ${bestCombo} ข้อ</div>
        <p>เล่นไป ${total} ข้อ · ถูก ${correct} · ${score} แต้ม</p>${recLine}`
        : `<div class="res-stats">
          <div><b><span class="res-cnt">${correct}</span><small>/${items.length}</small></b><span>ตอบถูก</span></div>
          <div><b>${bestCombo}</b><span>🔥 คอมโบ</span></div>
          <div><b class="res-cnt">${score}</b><span>แต้ม</span></div>
        </div>${recLine}`}
        ${['en2th', 'th2en', 'listen', 'cloze'].includes(gameId) ? `<p class="small muted">🎚️ ความยากตอนนี้ ${diffLabel()}</p>` : ''}
        ${resultExtras(runLog, xp0)}
      </div>
      ${wrong.length ? `<div class="card-box wrong-list"><div class="wl-h"><b>${gameId.startsWith('speak') ? 'คำที่ควรฝึกออกเสียง' : 'คำที่ควรทบทวน'}</b><span class="wl-n">${new Set(wrong).size}</span></div><div class="small muted wl-hint">${gameId.startsWith('speak') || SKILL_GAMES.includes(gameId) ? '🔊 แตะเพื่อฟังเสียง' : deckRun.practice ? 'โหมดซ้อม · 🔊 ฟังเสียง · ☆ ติดดาว' : deckRun.map ? 'ใส่ในการทบทวนของชุดให้แล้ว · 🔊 ฟังเสียง · ☆ ติดดาว' : 'ใส่ในแฟลชการ์ดให้แล้ว · 🔊 ฟังเสียง · ☆ ติดดาว'}</div>
        ${[...new Set(wrong)].map((w) => w.idx < 0 ? `<div class="wl" data-i="-1" data-say="${esc(w._q ? w._q[0].replace('___', w._q[1]) : w._m[0] + ', ' + w._m[2])}"><span><b>${esc(w.w)}</b></span><span class="muted grow" style="text-align:right">${esc(w._q ? w._q[3] : w.t)}</span><button class="wl-say" aria-label="ฟังเสียง ${esc(w.w)}">🔊</button></div>`
          : `<div class="wl" data-i="${w.idx}"><span><b>${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span><button class="wl-say" aria-label="ฟังเสียง ${esc(w.w)}">🔊</button><button class="star-btn" data-star>${starIcon(w)}</button></div>`).join('')}</div>` : ''}
      <div class="res-acts">${wrong.some((w) => w.idx >= 0) && !deckRun.map ? '<button class="btn block" id="wrongDeck">📚 ใส่คำที่ผิดเข้าชุดของฉัน</button>' : ''}
      ${STAGE && done.hasNext ? '<button class="btn primary block" id="stNext">ด่านต่อไป →</button>' : ''}
      <button class="btn ${STAGE && done.hasNext ? '' : 'primary '}block" id="again">${STAGE ? 'เล่นด่านนี้อีกครั้ง' : 'เล่นอีกรอบ'}</button>
      <button class="btn block" id="back">${STAGE ? '🗺️ กลับแผนที่' : 'เลือกเกมอื่น'}</button></div>`;
    if ($('#wrongDeck')) $('#wrongDeck').onclick = () => pickDeck([...new Set(wrong.filter((w) => w.idx >= 0).map((w) => w.w))]);
    $('#again').onclick = () => (STAGE ? startStage(stage.topic, stage.k) : startGame(gameId));
    $('#back').onclick = leave;
    if ($('#stNext')) $('#stNext').onclick = () => startStage(stage.topic, stage.k + 1);
    const wl = view.querySelector('.wrong-list');
    if (wl) wl.onclick = (e) => {
      const row = e.target.closest('.wl'); if (!row) return;
      const w = W[+row.dataset.i];
      if (!w) return speak(row.dataset.say || '');
      const sb = e.target.closest('[data-star]');
      if (sb) { toggleStar(w); sb.textContent = starIcon(w); } else speak(w.w);
    };
    updateStreak();
    countUp(view.querySelectorAll('.res-cnt, .res-xp b'));
  }

  q();
}

// Result screen extras (1.129): the answers in order as a strip (runs of right answers stand out), XP earned this round and
// the bar to the next level filling from where the round started.
function resultExtras(log, xp0) {
  const gain = Math.max(0, (S.xp || 0) - xp0), L = levelOf(S.xp), a = levelStart(L), b = levelStart(L + 1);
  const from = levelOf(xp0) === L ? Math.max(0, (xp0 - a) / (b - a) * 100) : 0, to = Math.min(100, ((S.xp || 0) - a) / (b - a) * 100);
  let best = 0, run = 0; for (const ok of log) { run = ok ? run + 1 : 0; best = Math.max(best, run); }
  const strip = log.length > 1 && log.length <= 60 ? `<div class="res-strip" role="img" aria-label="ผลทีละข้อ ถูก ${log.filter(Boolean).length} จาก ${log.length} ข้อ ถูกติดกันยาวสุด ${best} ข้อ">${log.map((ok, k) => `<i class="${ok ? 'ok' : 'no'}" style="--k:${k}"></i>`).join('')}</div>` : '';
  return `${strip}${gain ? `<div class="res-xp"><span class="small"><b>+${gain}</b> XP · Lv.${L}${levelOf(xp0) < L ? ' ⬆️' : ''}</span><div class="bar"><div class="l" style="--from:${from.toFixed(1)}%;width:${to.toFixed(1)}%"></div></div></div>` : ''}`;
}
// ✏️ Draw-a-line matching (1.144): drag from a tile with Apple Pencil or a finger; a line follows to the pointer and letting go
// on a tile of the other column pairs them through the same logic as two taps. A short press is still an ordinary tap.
function matchLines(grid, pair) {
  if (!grid) return;
  let d = null;
  const NS = 'http://www.w3.org/2000/svg';
  const mid = (el) => { const g = grid.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - g.left + r.width / 2, r.top - g.top + r.height / 2]; };
  const local = (e) => { const g = grid.getBoundingClientRect(); return [e.clientX - g.left, e.clientY - g.top]; };
  const stop = () => { if (d && d.svg) d.svg.remove(); if (d && d.t) d.t.classList.remove('drag'); d = null; };
  grid.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.tile'); if (!t || t.classList.contains('done') || (d && d.id !== e.pointerId)) return;
    d = { id: e.pointerId, t, x: e.clientX, y: e.clientY, svg: null };
  });
  grid.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.svg) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 14) return;
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
      d.svg = document.createElementNS(NS, 'svg'); d.svg.setAttribute('class', 'mt-lines'); d.svg.setAttribute('aria-hidden', 'true');
      d.line = document.createElementNS(NS, 'line'); d.svg.appendChild(d.line); grid.appendChild(d.svg);
      d.t.classList.add('drag');
    }
    const [x1, y1] = mid(d.t), [x2, y2] = local(e);
    d.line.setAttribute('x1', x1); d.line.setAttribute('y1', y1); d.line.setAttribute('x2', x2); d.line.setAttribute('y2', y2);
    e.preventDefault();
  });
  grid.addEventListener('pointerup', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const from = d.t, drew = !!d.svg; stop();
    if (!drew) return; // a tap: the click handler does it
    const hit = document.elementFromPoint(e.clientX, e.clientY), to = hit && hit.closest && hit.closest('.match-grid .tile');
    if (!to || to === from || to.classList.contains('done') || to.dataset.k === from.dataset.k) return;
    pair(from, to);
  });
  grid.addEventListener('pointercancel', stop);
}
function playMatch(src, deckRun = {}) {
  const PAIRS = 6, ROUNDS = 3;
  let round = 0, mistakes = 0, start = Date.now(), timer;
  $('#title').textContent = GAMES.match.name;
  const used = new Set();

  function deal() {
    if (round >= ROUNDS) return result();
    const words = [];
    const seenTh = new Set();
    for (const w of shuffle(src)) {
      if (used.has(w.w) || seenTh.has(thFirst(w.t))) continue;
      words.push(w); seenTh.add(thFirst(w.t)); used.add(w.w);
      if (words.length === PAIRS) break;
    }
    const en = shuffle(words), th = shuffle(words);
    let left = PAIRS, sel = null;
    view.innerHTML = `<div class="session-top">
        <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
        <div class="progress"><div style="width:${round / ROUNDS * 100}%"></div></div>
        <span class="small" id="clock">0.0s</span></div>
      <p class="center muted small">รอบ ${round + 1}/${ROUNDS} · แตะคำอังกฤษแล้วแตะคำแปล หรือ ✏️ ลากเส้นจากคำหนึ่งไปหาอีกคำ</p>
      <div class="match-grid">
        ${en.map((w, k) => `<button class="tile" data-k="en" data-i="${w.idx}" style="grid-column:1;grid-row:${k + 1}">${esc(w.w)}</button>`).join('')}
        ${th.map((w, k) => `<button class="tile th" data-k="th" data-i="${w.idx}" style="grid-column:2;grid-row:${k + 1}">${esc(thFirst(w.t))}</button>`).join('')}
      </div>`;
    $('#quit').onclick = () => go('games');
    const pick = (t) => {
      if (!t || t.classList.contains('done')) return;
      if (t.dataset.k === 'en') speak(W[+t.dataset.i].w);
      if (!sel || sel.dataset.k === t.dataset.k) {
        if (sel) sel.classList.remove('sel');
        sel = t; t.classList.add('sel'); return;
      }
      const a = sel, b = t; sel = null; a.classList.remove('sel');
      if (a.dataset.i === b.dataset.i) {
        a.classList.add('done'); b.classList.add('done');
        if (deckRun.practice) markActive(); else gameResult(W[+a.dataset.i], true, deckRun.map);
        sfx('ok');
        if (--left === 0) { round++; setTimeout(deal, 350); }
      } else {
        mistakes++; sfx('bad');
        [a, b].forEach((x) => { x.classList.remove('no'); void x.offsetWidth; x.classList.add('no'); });
        const enTile = a.dataset.k === 'en' ? a : b;
        if (deckRun.practice) markActive(); else gameResult(W[+enTile.dataset.i], false, deckRun.map);
      }
    };
    view.querySelector('.match-grid').onclick = (e) => pick(e.target.closest('.tile'));
    // a drawn line pairs exactly its two ends, whatever was tapped before
    matchLines(view.querySelector('.match-grid'), (a, b) => { if (sel) { sel.classList.remove('sel'); sel = null; } pick(a); pick(b); });
  }
  timer = setInterval(() => { const c = $('#clock'); if (c) c.textContent = ((Date.now() - start) / 1000).toFixed(1) + 's'; }, 100);
  cleanup = () => clearInterval(timer);

  function result() {
    clearInterval(timer);
    const secs = (Date.now() - start) / 1000 + mistakes * 3;
    const score = Math.max(0, Math.round(1000 - secs * 10));
    const prev = S.best.match;
    const isBest = prev == null || score > prev;
    if (isBest) { S.best.match = score; save(); }
    addXP(mistakes <= 2 ? 12 : 6);
    questEvent('match', { mistakes });
    if (isBest || mistakes === 0) confetti();
    view.innerHTML = `<div class="card-box center pop res-top sk-mean">
        <div class="result-emoji">⚡</div>
        <div class="h2"><b class="res-cnt">${score}</b> แต้ม</div>
        <p>เวลา ${((Date.now() - start) / 1000).toFixed(1)} วินาที · ผิด ${mistakes} ครั้ง (+3 วิ/ครั้ง)</p>
        ${isBest ? `<p class="res-best new">🏅 สถิติใหม่!${prev != null ? ` <span>(เดิม ${prev} แต้ม)</span>` : ''}</p>` : `<p class="res-best">ขาดอีก <b>${prev - score + 1}</b> แต้ม จะทำลายสถิติ <span>(🏅 ${prev})</span></p>`}
      </div>
      <div class="res-acts"><button class="btn primary block" id="again">เล่นอีกรอบ</button>
      <button class="btn block" id="back">เลือกเกมอื่น</button></div>`;
    $('#again').onclick = () => startGame('match');
    $('#back').onclick = () => go('games');
    updateStreak();
    countUp(view.querySelectorAll('.res-cnt'));
  }
  deal();
}
