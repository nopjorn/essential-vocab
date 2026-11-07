'use strict';
// Word chain (1.167.0, single player, fun zone): each next word starts with the last letter of the one before
// (apple → egg → game …). All three options start with that letter, so the pick is made by meaning: the Thai of the next word
// is shown. CH_TIME seconds a link (CH_FAST after CH_SPEEDUP links); a wrong pick or running out of time ends the chain.
// Words: the learner's levels plus every learned word, one plain word of 3+ letters, never twice in a run (learned ones first).
// A letter with too few words left (x, q …) jumps to a fresh word (🔀) without breaking the chain. Answers go through
// gameResult(). Coins: 1 per CH_COIN_EVERY links. State: S.chain = { best, runs, links } (cleanChain()/merge in app.js).
// Classic script sharing globals with app.js.

const CH_TIME = 10, CH_FAST = 7, CH_SPEEDUP = 10, CH_COIN_EVERY = 5;
const chainPool = () => W.filter((w) => /^[a-z]{3,}$/.test(w.w) && (S.prog[w.w] || S.settings.levels.includes(w.g)));
const chainLast = (w) => w.w[w.w.length - 1];

function renderChain() {
  const c = S.chain;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="chBack" data-depth="1">‹ กลับ</button></div>
    <div class="card-box center ch-intro">
      <div class="ch-demo" aria-hidden="true"><span>appl<b>e</b></span><i>→</i><span><b>e</b>g<b>g</b></span><i>→</i><span><b>g</b>ame</span></div>
      <div class="h2" style="margin:8px 0 2px">🔗 ต่อคำ</div>
      <p class="small muted" style="margin:0">คำถัดไปต้องขึ้นต้นด้วยตัวสุดท้ายของคำก่อนหน้า</p>
      <div class="wb-status" style="margin-top:10px">${c.best ? `🏅 ยาวสุด ${c.best} คำ · เล่นแล้ว ${c.runs} รอบ` : 'ยังไม่เคยเล่น'}</div>
      <button class="btn primary block" id="chGo" style="margin-top:12px">🔗 เริ่มต่อคำ</button>
    </div>
    <div class="card-box small"><b>กติกา</b><ul class="wb-rules">
      <li>ตัวเลือกทั้ง 3 ขึ้นต้นด้วยตัวอักษรเดียวกัน เลือกคำที่<b>แปลตรงกับภาษาไทย</b>ที่ให้มา</li>
      <li>มีเวลาคำละ ${CH_TIME} วินาที ต่อได้ ${CH_SPEEDUP} คำแล้วเหลือ ${CH_FAST} วินาที</li>
      <li>ตอบผิดหรือหมดเวลา = จบรอบ · ตัวอักษรที่หาคำต่อไม่ได้ (เช่น x) แอปจะสุ่มคำใหม่ให้ 🔀 ต่อได้เลย</li>
      <li>ทุก ${CH_COIN_EVERY} คำได้ 🪙 1 · ใช้คำจากระดับที่เรียนและคำที่เรียนแล้ว</li></ul></div>`;
  $('#chBack').onclick = () => go('fun');
  $('#chGo').onclick = () => runChain();
}

function runChain(start) { // start = a word to begin from (tests); else a random one
  if (cleanup) { cleanup(); cleanup = null; }
  const pool = chainPool();
  if (pool.length < 30) { toast('คำในระดับที่เลือกยังน้อยไป ลองเพิ่มระดับในตั้งค่านะ'); return renderChain(); }
  const used = new Set(), trail = [];
  let cur = (start && pool.find((w) => w.w === start)) || pick(pool), n = 0, coins = 0, alive = true, timer = 0, t0 = 0, answer = null, opts = [], jumps = 0;
  used.add(cur.w); trail.push(cur);
  S.chain.runs++; save();
  cleanup = () => { alive = false; clearInterval(timer); };
  runChain.state = () => ({ cur: cur.w, answer: answer && answer.w, opts: opts.map((w) => w.w), n, jumps }); // read by tests
  // the next word: an unused pool word starting with the letter (learned ones first) + 2 others with that letter and another meaning
  const nextFor = (letter) => {
    const cands = pool.filter((w) => w.w[0] === letter && !used.has(w.w));
    if (cands.length < 3) return null;
    const learned = cands.filter((w) => S.prog[w.w]), a = pick(learned.length ? learned : cands);
    const others = shuffle(cands.filter((w) => w !== a && thFirst(w.t) !== thFirst(a.t))).slice(0, 2);
    return others.length < 2 ? null : { a, opts: shuffle([a, ...others]) };
  };
  const limit = () => (n >= CH_SPEEDUP ? CH_FAST : CH_TIME);
  const draw = (note = '') => {
    const letter = chainLast(cur);
    let nx = nextFor(letter);
    let jump = '';
    while (!nx) { // no way on from this letter: a fresh word keeps the chain going
      const fresh = pool.filter((w) => !used.has(w.w));
      if (fresh.length < 3) return end('หมดคำให้ต่อแล้ว เก่งมาก!');
      cur = pick(fresh); used.add(cur.w); trail.push(cur); jumps++;
      jump = `🔀 ไม่มีคำขึ้นต้นด้วย <b>${letter.toUpperCase()}</b> ต่อแล้ว เริ่มจาก <b lang="en">${esc(cur.w)}</b> แทน`;
      nx = nextFor(chainLast(cur));
    }
    answer = nx.a; opts = nx.opts;
    const L = chainLast(cur).toUpperCase();
    const shown = trail.slice(-3);
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="chQuit" aria-label="จบรอบ">✕</button>
        <div class="ch-time" role="img" aria-label="เวลา"><div id="chBar"></div></div><span class="small ch-n" aria-label="ต่อได้ ${n} คำ">🔗 ${n}</span></div>
      <div class="ch-trail" lang="en">${trail.length > 3 ? '<span class="muted">…</span>' : ''}${shown.map((w, k) => `${k ? '<i aria-hidden="true">→</i>' : ''}<span class="${k === shown.length - 1 ? 'last' : ''}">${esc(w.w.slice(0, -1))}<b>${esc(w.w.slice(-1))}</b></span>`).join('')}</div>
      ${jump || note ? `<div class="small ch-note">${jump || note}</div>` : ''}
      <div class="card-box q-prompt pop ch-q"><div class="small muted">คำถัดไปขึ้นต้นด้วย <b class="ch-l">${L}</b> แปลว่า</div>
        <div class="th" style="font-size:24px;margin-top:6px">${esc(answer.t)}</div><div class="pos">${esc(answer.p)}</div></div>
      <div class="options ch-opts">${opts.map((w, k) => `<button class="opt" data-k="${k}" lang="en"><b>${esc(w.w[0])}</b>${esc(w.w.slice(1))}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite"></div>`;
    $('#chQuit').onclick = () => end('');
    view.querySelector('.options').onclick = (e) => { const b = e.target.closest('.opt'); if (b && !b.disabled) choose(opts[+b.dataset.k], b); };
    t0 = Date.now(); clearInterval(timer);
    timer = setInterval(() => {
      if (!alive) return clearInterval(timer);
      const left = limit() - (Date.now() - t0) / 1000, bar = $('#chBar');
      if (bar) bar.style.width = `${Math.max(0, left / limit() * 100)}%`;
      if (left <= 0) choose(null);
    }, 100);
  };
  const choose = (w, btn) => {
    if (!alive) return;
    clearInterval(timer);
    const ok = w === answer;
    view.querySelectorAll('.opt').forEach((b) => { b.disabled = true; if (opts[+b.dataset.k] === answer) b.classList.add('correct'); });
    if (btn && !ok) btn.classList.add('wrong');
    gameResult(answer, ok);
    sfx(ok ? 'ok' : 'bad');
    if (!ok) {
      $('#reveal').innerHTML = `${w ? '❌' : '⏰ หมดเวลา'} คำที่ต่อได้คือ <b lang="en">${esc(answer.w)}</b> = ${esc(answer.t)}`;
      speak(answer.w);
      return setTimeout(() => end(w ? 'ตอบผิด' : 'หมดเวลา'), 1400);
    }
    n++; S.chain.links++; addXP(comboXP(n));
    if (n % CH_COIN_EVERY === 0) { coins++; addCoins(1); }
    if (n >= 5 && n % 5 === 0) mascotCheer(n);
    cur = answer; used.add(cur.w); trail.push(cur);
    speak(cur.w);
    setTimeout(() => { if (alive) draw(n === CH_SPEEDUP ? `⚡ ต่อได้ ${CH_SPEEDUP} คำแล้ว ต่อจากนี้เหลือคำละ ${CH_FAST} วินาที` : ''); }, 450);
  };
  const end = (why) => {
    if (!alive) return;
    alive = false; clearInterval(timer); cleanup = null;
    const best0 = S.chain.best, isBest = n > best0;
    if (isBest) S.chain.best = n;
    save();
    if (isBest && n >= 3) confetti(n >= 20 ? 'burst' : undefined);
    view.innerHTML = `<div class="card-box center pop res-top sk-chal">
        <div class="result-emoji">🔗</div>
        <div class="h2" style="margin:4px 0">ต่อได้ ${n} คำ</div>
        ${why ? `<p class="small muted" style="margin:0">${why}</p>` : ''}
        ${isBest ? `<p class="res-best new">🏅 สถิติใหม่!${best0 ? ` <span>(เดิม ${best0} คำ)</span>` : ''}</p>` : best0 ? `<p class="res-best">ขาดอีก <b>${best0 - n + 1}</b> คำ จะทำลายสถิติ <span>(🏅 ${best0})</span></p>` : ''}
        <div class="ch-trail ch-all" lang="en">${trail.slice(-24).map((x, k) => `${k ? '<i aria-hidden="true">→</i>' : ''}<button class="chip" data-wi="${x.idx}">${esc(x.w)}</button>`).join('')}</div>
        ${coins ? `<p class="small">ได้ 🪙 ${coins}</p>` : ''}
        <div class="res-acts"><button class="btn primary block" id="chAgain">🔗 ต่อคำอีกรอบ</button><button class="btn block" id="chHome">กลับหน้าต่อคำ</button></div></div>`;
    $('#title').textContent = 'ต่อคำ';
    $('#chAgain').onclick = () => runChain();
    $('#chHome').onclick = () => renderChain();
    view.querySelector('.ch-all').onclick = (e) => { const b = e.target.closest('[data-wi]'); if (b) openSheet(W[+b.dataset.wi]); };
    updateStreak();
  };
  draw();
}
FUN_TILES.push({ id: 'chain', o: 14, home: false, ic: '🔗', name: 'ต่อคำ', sub: () => (S.chain.best ? `ยาวสุด ${S.chain.best} คำ` : 'apple → egg → game …'), go: () => go('chain') });
