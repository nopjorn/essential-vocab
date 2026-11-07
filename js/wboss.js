'use strict';
// Weekly boss (1.166.0, single player, fun zone): every Monday a new boss made of the learner's own weakest words — the ones
// answered wrong most in the last 21 days (S.miss), then the leeches and the words with the most wrong answers overall.
// Battle: the boss has 100 HP, the player 3 hearts. A right answer hits for WB_HIT (3 in a row = a critical WB_CRIT); a wrong
// one costs a heart and the word comes back later. Below WB_RAGE HP the boss gets angry: look-alike options. Answers go through
// funAsk() (js/fun.js), so they update the words' own progress like any game. First win of the week: WB_COINS coins + WB_XP XP,
// later wins WB_COINS_AGAIN. State: S.wboss = { k: Monday, win, tries, low: lowest HP left %, wins: weeks won }
// (cleanWboss()/merge in app.js). Classic script sharing globals with app.js.

const WB_HP = 100, WB_HIT = 12, WB_CRIT = 20, WB_RAGE = 30, WB_HEARTS = 3, WB_WORDS = 12, WB_MIN = 6;
const WB_COINS = 40, WB_COINS_AGAIN = 10, WB_XP = 30;
// [emoji, name, line when it appears, line when it falls] — original characters, one a week in turn
const WB_BOSSES = [
  ['🐉', 'มังกรขี้ลืม', 'ข้าจะเผาคำที่เจ้าจำไม่ได้ให้หมด!', 'โอ๊ย… เจ้าจำได้หมดแล้วจริงๆ'],
  ['👹', 'ยักษ์จอมสับสน', 'คำพวกนี้น่ะ เจ้าสลับกันทุกที!', 'ไม่จริง… เจ้าไม่สับสนแล้ว'],
  ['🦑', 'หมึกยักษ์พันคำ', 'หนวดของข้าพันคำไว้แน่นแล้ว!', 'หนวดหลุดหมดเลย…'],
  ['🤖', 'หุ่นยนต์ตัวสะกด', 'ระบบตรวจพบคำที่เจ้าตอบผิดบ่อย!', 'ระบบ… ล่ม… เจ้าชนะ…'],
  ['👻', 'ผีกินคำ', 'ฮี่ๆ คำที่เจ้าลืม ข้ากินไปแล้ว!', 'คายคืนแล้วจ้า… ไปละ'],
  ['🦖', 'ไดโนจำไม่ได้', 'โฮก! คำพวกนี้เจ้าจำไม่ได้แน่!', 'โฮ… เจ้าเก่งกว่าที่คิด'],
  ['🧌', 'โทรลล์ใต้สะพานคำ', 'จะข้ามสะพาน ต้องตอบคำที่เคยผิดก่อน!', 'ข้ามไปเถอะ… เจ้าผ่านแล้ว'],
  ['🐙', 'ปลาหมึกหมุนคำ', 'ข้าจะหมุนคำให้เจ้างงไปเลย!', 'มึนหัวเอง… ยอมแพ้'],
];
const wbWeek = (mon = mondayKey()) => Math.floor(Date.parse(mon + 'T12:00:00') / (7 * DAY));
const wbBoss = (mon = mondayKey()) => WB_BOSSES[((wbWeek(mon) % WB_BOSSES.length) + WB_BOSSES.length) % WB_BOSSES.length];
const wbThisWeek = () => (S.wboss.k === mondayKey() ? S.wboss : { k: mondayKey(), win: false, tries: 0, low: WB_HP, wins: S.wboss.wins });
// The boss's words: misses in the last 21 days count most, then leeches, then wrong answers overall; at least WB_MIN words that
// have been answered wrong at least once, else the weakest learned words (low box first); none = not enough to fight yet.
function wbWords() {
  const miss = {};
  for (const m of Object.values(S.miss || {})) for (const [w, n] of Object.entries(m || {})) miss[w] = (miss[w] || 0) + (+n || 0);
  const score = (w) => { const p = S.prog[w.w]; return (miss[w.w] || 0) * 3 + (p.x >= LEECH ? 4 : 0) + (p.x || 0) - (p.c || 0) / 10; };
  const wrongOnce = W.filter((w) => S.prog[w.w] && ((S.prog[w.w].x || 0) > 0 || miss[w.w]));
  if (wrongOnce.length >= WB_MIN) return wrongOnce.sort((a, b) => score(b) - score(a)).slice(0, WB_WORDS);
  const learned = W.filter((w) => S.prog[w.w]);
  if (learned.length < WB_MIN) return [];
  const extra = learned.filter((w) => !wrongOnce.includes(w)).sort((a, b) => (S.prog[a.w].b || 0) - (S.prog[b.w].b || 0));
  return [...wrongOnce, ...extra].slice(0, WB_WORDS);
}
const wbHearts = (h) => `${'❤️'.repeat(Math.max(0, h))}${'🖤'.repeat(Math.max(0, WB_HEARTS - h))}`;

function renderWboss() {
  const [ic, name, hello] = wbBoss(), wk = wbThisWeek(), words = wbWords();
  if (!words.length) {
    view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="wbBack" data-depth="1">‹ กลับ</button></div>
      ${emptyArt({ kind: 'empty', title: `${ic} ${name} ยังไม่ออกมา`, sub: `เรียนคำศัพท์ให้ได้อย่างน้อย ${WB_MIN} คำก่อน บอสจะสร้างตัวจากคำที่เราจำยากที่สุด`, btn: '▶︎ ไปเรียนคำใหม่', go: 'cards' })}`;
    $('#wbBack').onclick = () => go('fun');
    return;
  }
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="wbBack" data-depth="1">‹ กลับ</button></div>
    <div class="card-box center wb-intro">
      <div class="wb-face${wk.win ? ' down' : ''}" aria-hidden="true">${ic}</div>
      <div class="h2" style="margin:6px 0 2px">${name}</div>
      <p class="small muted" style="margin:0">บอสประจำสัปดาห์ · เปลี่ยนตัวทุกวันจันทร์</p>
      <p class="wb-say">“${wk.win ? 'วันจันทร์หน้าข้าจะกลับมาพร้อมคำใหม่!' : hello}”</p>
      <div class="wb-status">${wk.win ? '🏆 ปราบได้แล้วสัปดาห์นี้' : wk.tries ? `สู้ไปแล้ว ${wk.tries} ครั้ง · พลังบอสเหลือต่ำสุด ${wk.low}%` : 'ยังไม่ได้สู้สัปดาห์นี้'}${S.wboss.wins ? ` · ชนะรวม ${S.wboss.wins} สัปดาห์` : ''}</div>
      <button class="btn primary block" id="wbGo" style="margin-top:12px">⚔️ ${wk.win ? 'สู้อีกรอบ' : wk.tries ? 'สู้ต่อ' : 'เริ่มสู้'}</button>
    </div>
    <div class="h2">บอสสร้างจากคำเหล่านี้ <span class="small muted">${words.length} คำ</span></div>
    <div class="card-box"><div class="wb-words">${words.map((w) => `<button class="chip" data-wi="${w.idx}" lang="en">${esc(w.w)}</button>`).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">คำที่ตอบผิดบ่อยใน 21 วันล่าสุดมาก่อน ตามด้วยคำดื้อ แตะคำเพื่อดูรายละเอียด</p></div>
    <div class="card-box small"><b>กติกา</b><ul class="wb-rules">
      <li>บอสมีพลัง ${WB_HP} · เรามีหัวใจ ${WB_HEARTS} ดวง</li>
      <li>ตอบถูก = โจมตี ${WB_HIT} · ถูกติดกัน 3 ข้อขึ้นไป = 💥 คริติคอล ${WB_CRIT}</li>
      <li>ตอบผิด = เสียหัวใจ และคำนั้นจะวนกลับมาอีก</li>
      <li>พลังบอสต่ำกว่า ${WB_RAGE} = บอสโกรธ ตัวเลือกจะคล้ายกันขึ้น</li>
      <li>ชนะครั้งแรกของสัปดาห์ได้ 🪙 ${WB_COINS} และ ${WB_XP} XP (ครั้งต่อไป 🪙 ${WB_COINS_AGAIN})</li></ul></div>`;
  $('#wbBack').onclick = () => go('fun');
  $('#wbGo').onclick = () => runWboss();
  view.querySelector('.wb-words').onclick = (e) => { const b = e.target.closest('[data-wi]'); if (b) openSheet(W[+b.dataset.wi]); };
}

function runWboss() {
  if (cleanup) { cleanup(); cleanup = null; }
  const words = wbWords(); if (!words.length) return renderWboss();
  const [ic, name, , bye] = wbBoss();
  const wk = wbThisWeek();
  S.wboss = { ...wk, tries: wk.tries + 1 }; save();
  let hp = WB_HP, hearts = WB_HEARTS, combo = 0, right = 0, asked = 0, alive = true, last = null;
  const queue = shuffle(words.slice());
  cleanup = () => { alive = false; };
  runWboss.state = () => ({ hp, hearts, combo, queue: queue.map((w) => w.w) }); // read by tests
  const panel = (hit) => `<div class="session-top"><button class="icon-btn" id="wbQuit" aria-label="ถอยออกจากการต่อสู้">✕</button>
      <div class="wb-bar" role="img" aria-label="พลังบอส ${hp} จาก ${WB_HP}"><div style="width:${hp}%"></div></div><span class="small" id="wbH" aria-label="หัวใจ ${hearts} ดวง">${wbHearts(hearts)}</span></div>
    <div class="wb-arena${hp <= WB_RAGE ? ' rage' : ''}"><span class="wb-face${hit ? ' hit' : ''}" aria-hidden="true">${ic}</span>${hit ? `<span class="wb-dmg${hit > WB_HIT ? ' crit' : ''}" aria-hidden="true">−${hit}</span>` : ''}
      <span class="small muted">${name} · พลัง ${hp}/${WB_HP}${hp <= WB_RAGE ? ' · 😡 โกรธแล้ว!' : ''}${combo >= 2 ? ` · 🔥 ${combo}` : ''}</span></div>`;
  const ask = (hit = 0) => {
    if (!alive) return;
    if (hp <= 0) return end(true);
    if (hearts <= 0) return end(false);
    if (!queue.length) queue.push(...shuffle(words.slice()));
    let w = queue.shift();
    if (w === last && queue.length) { queue.push(w); w = queue.shift(); } // never the same word twice in a row
    last = w;
    const kind = pick(hp <= WB_RAGE ? ['en2th', 'th2en', 'listen', 'cloze'] : ['en2th', 'th2en', 'listen']);
    funAsk(w, kind, {
      top: panel(hit), hard: hp <= WB_RAGE, sub: `ข้อ ${asked + 1}`,
      heart: hearts < WB_HEARTS ? () => { hearts++; const h = $('#wbH'); if (h) h.textContent = wbHearts(hearts); } : null,
      alive: () => alive,
      onDone: (ok) => {
        asked++;
        if (ok) {
          right++; combo++; addXP(comboXP(combo));
          const dmg = combo >= 3 ? WB_CRIT : WB_HIT;
          hp = Math.max(0, hp - dmg);
          if (combo >= 3 && combo % 3 === 0) toast('💥 คริติคอล!');
          return ask(dmg);
        }
        combo = 0; hearts--; queue.splice(Math.min(queue.length, 2), 0, w); // the missed word comes back soon
        ask();
      },
    });
    $('#wbQuit').onclick = () => end(false, true);
  };
  const end = (won, quit) => {
    if (!alive) return;
    alive = false; cleanup = null;
    const first = won && !S.wboss.win;
    const coins = won ? (first ? WB_COINS : WB_COINS_AGAIN) : 0;
    S.wboss = { ...S.wboss, win: S.wboss.win || won, low: Math.min(S.wboss.low, hp), wins: S.wboss.wins + (first ? 1 : 0) };
    if (coins) addCoins(coins);
    if (first) addXP(WB_XP);
    save();
    if (won) confetti('burst');
    view.innerHTML = `<div class="card-box center pop res-top sk-chal">
        <div class="result-emoji">${won ? `<span class="wb-face down" aria-hidden="true">${ic}</span>` : '💔'}</div>
        <div class="h2" style="margin:4px 0">${won ? `ปราบ${name}ได้แล้ว!` : quit ? 'ถอยออกมาก่อน' : 'หัวใจหมดแล้ว'}</div>
        <p class="wb-say">“${won ? bye : 'เจ้ายังสู้ข้าไม่ได้หรอก ลองใหม่สิ!'}”</p>
        <p class="small">ตอบถูก ${right}/${asked} ข้อ · พลังบอสเหลือ ${hp}%${coins ? ` · ได้ 🪙 ${coins}${first ? ` + ${WB_XP} XP` : ''}` : ''}</p>
        <div class="res-acts"><button class="btn primary block" id="wbAgain">⚔️ ${won ? 'สู้อีกรอบ' : 'สู้ใหม่'}</button>
        <button class="btn block" id="wbHome">${ic} กลับหน้าบอส</button></div></div>`;
    $('#title').textContent = 'บอสประจำสัปดาห์';
    $('#wbAgain').onclick = () => runWboss();
    $('#wbHome').onclick = () => renderWboss();
    updateStreak();
  };
  ask();
}
FUN_TILES.push({ id: 'wboss', o: 12, home: false, ic: '⚔️', name: 'บอสประจำสัปดาห์', sub: () => { const b = wbBoss(), wk = wbThisWeek(); return wk.win ? `🏆 ปราบ${b[1]}แล้ว` : `${b[0]} ${b[1]}${wk.tries ? ` · พลังเหลือ ${wk.low}%` : ''}`; }, go: () => go('wboss') });
