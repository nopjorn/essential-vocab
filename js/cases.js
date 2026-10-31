'use strict';
// Detective cases (1.120, single player; route `cases`, `runCase(id)`): read the English clues (tap a word for its sheet, 🇹🇭 shows the
// Thai), answer two reading questions, then name who did it. First solve: +30 coins (+10 when solved after a wrong guess) and +20 XP;
// 3 cases solved → 🕵️ detective hat for the mascot. Data: data/cases.js (lazy, loadCases()).
// State: S.cases = { id: { ok: solved, t: wrong guesses } } (cleanCases() / merge in app.js). Classic script sharing globals with app.js.

let CASES = null;
const loadCases = () => loadData('data/cases.js', 'CASES').then((c) => (CASES = c));
const CASE_COINS = 30, CASE_RETRY = 10, CASE_XP = 20, CASE_HAT = 3;
const casesSolved = () => Object.values(S.cases || {}).filter((c) => c && c.ok).length;

function renderCases() {
  if (!CASES) { withLoading(loadCases()).then(() => { if (current === 'cases') renderCases(); }); return; }
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="csxBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">🕵️</div><div class="h2" style="margin:2px 0">คดีนักสืบ</div>
      <p class="small muted">อ่านเบาะแสภาษาอังกฤษ ตอบคำถาม แล้วชี้ตัวคนทำ · ไขแล้ว ${casesSolved()}/${CASES.length} คดี</p></div>
    <div class="card-box" id="caseRows">${CASES.map((c) => { const r = S.cases[c.id];
      return `<button class="wrow case-row" data-case="${c.id}"><span class="shop-ic" aria-hidden="true">${c.emoji}</span><div class="grow"><b>${esc(c.title)}</b> ${lvBadge(c.level)}<div class="small muted">${r && r.ok ? (r.t ? '✅ ไขได้แล้ว' : '✅ ไขได้ในครั้งแรก 🏅') : r && r.t ? `❌ ชี้ผิด ${r.t} ครั้ง · ลองใหม่ได้` : `ไขครั้งแรกได้ 🪙 ${CASE_COINS}`}</div></div><span class="muted">›</span></button>`; }).join('')}</div>
    <p class="small muted" style="margin:10px 4px">แตะคำภาษาอังกฤษในเบาะแสเพื่อดูความหมาย · ไขได้ 3 คดีรับ 🕵️ หมวกนักสืบให้น้องคำ</p>`;
  $('#csxBack').onclick = () => go('fun');
  $('#caseRows').onclick = (e) => { const b = e.target.closest('[data-case]'); if (b) runCase(b.dataset.case); };
}

function runCase(id) {
  const c = CASES.find((x) => x.id === id);
  if (!c) return renderCases();
  const rec = S.cases[id] || (S.cases[id] = { ok: false, t: 0 });
  $('#title').textContent = c.title;
  const tap = (el) => { el.onclick = (e) => { const s = e.target.closest('.rw'); if (s) openSheet(W[+s.dataset.i]); }; };
  const top = (step) => `<div class="session-top"><button class="icon-btn" id="caseQuit" aria-label="ออก">✕</button><div class="progress"><div style="width:${step / 4 * 100}%"></div></div><span class="small muted">${step + 1}/4</span></div>`;
  const bindQuit = () => { $('#caseQuit').onclick = () => renderCases(); };
  const suspects = (pick) => `<div class="case-sus">${c.suspects.map(([n, e, en, th], k) => `<${pick ? 'button' : 'div'} class="sus" ${pick ? `data-sus="${k}"` : ''}><span aria-hidden="true">${e}</span><b lang="en">${esc(n)}</b><small lang="en" class="en">${pick ? esc(en) : storyHTML(en)}</small><small class="muted">${esc(th)}</small></${pick ? 'button' : 'div'}>`).join('')}</div>`;
  const intro = () => {
    view.innerHTML = `${top(0)}<div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${c.emoji}</div><div class="h2" style="margin:2px 0">${esc(c.title)}</div><p>${esc(c.intro)}</p></div>
      <div class="h2">ผู้ต้องสงสัย</div>${suspects(false)}<button class="btn primary block" id="caseNext" style="margin-top:12px">🔍 ดูเบาะแส</button>`;
    bindQuit(); tap(view.querySelector('.case-sus')); $('#caseNext').onclick = clues;
  };
  const clues = () => {
    view.innerHTML = `${top(1)}<div class="card-box"><b>🔍 เบาะแส</b> <span class="small muted">แตะคำเพื่อดูความหมาย · 🇹🇭 ดูคำแปล</span>
      ${c.clues.map(([en, th], k) => `<div class="clue"><span class="clue-n" aria-hidden="true">${k + 1}</span><div class="grow"><div lang="en" class="en">${storyHTML(en)}</div><div class="small muted" hidden id="cth${k}">${esc(th)}</div></div>
        <button class="icon-btn sm" data-th="${k}" aria-label="ดูคำแปลเบาะแส ${k + 1}">🇹🇭</button><button class="icon-btn sm" data-sayc="${k}" aria-label="ฟังเบาะแส ${k + 1}">🔊</button></div>`).join('')}</div>
      <button class="btn primary block" id="caseNext">ตอบคำถาม →</button>`;
    bindQuit();
    const box = view.querySelector('.card-box');
    box.onclick = (e) => {
      const t = e.target.closest('[data-th]'), s = e.target.closest('[data-sayc]'), w = e.target.closest('.rw');
      if (t) { const el = $('#cth' + t.dataset.th); el.hidden = !el.hidden; }
      else if (s) speak(c.clues[+s.dataset.sayc][0]);
      else if (w) openSheet(W[+w.dataset.i]);
    };
    $('#caseNext').onclick = () => quiz(0);
  };
  const quiz = (k) => {
    if (k >= c.q.length) return accuse();
    const [q, opts, a] = c.q[k];
    view.innerHTML = `${top(2)}<div class="card-box q-prompt pop"><div class="small muted">คำถามอ่านจับใจความ ${k + 1}/${c.q.length}</div><div class="cloze" lang="en">${esc(q)}</div></div>
      <div class="options">${opts.map((o, n) => `<button class="opt" data-k="${n}" lang="en">${esc(o)}</button>`).join('')}</div>
      <button class="btn ghost block" id="caseBackClue" style="margin-top:8px">🔍 กลับไปดูเบาะแส</button><div class="reveal" id="reveal" aria-live="polite"></div>`;
    bindQuit(); $('#caseBackClue').onclick = clues;
    let done = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || done) return; done = true;
      const ok = +b.dataset.k === a;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.k === a) o.classList.add('correct'); });
      if (!ok) { b.classList.add('wrong'); $('#reveal').innerHTML = `ที่ถูกคือ <b lang="en">${esc(opts[a])}</b>`; }
      markActive(); sfx(ok ? 'ok' : 'bad'); if (ok) addXP(2); save();
      setTimeout(() => quiz(k + 1), ok ? 700 : 1500);
    };
  };
  const accuse = () => {
    view.innerHTML = `${top(3)}<div class="card-box center"><div class="h2" style="margin:2px 0">🫵 ใครเป็นคนทำ?</div><p class="small muted">แตะผู้ต้องสงสัยเพื่อชี้ตัว</p></div>${suspects(true)}
      <button class="btn ghost block" id="caseBackClue" style="margin-top:12px">🔍 กลับไปดูเบาะแส</button>`;
    bindQuit(); $('#caseBackClue').onclick = clues;
    view.querySelector('.case-sus').onclick = (e) => {
      if (e.target.closest('.rw')) return;
      const b = e.target.closest('[data-sus]'); if (b) result(+b.dataset.sus);
    };
  };
  const result = (k) => {
    const ok = k === c.ans, first = ok && !rec.ok;
    let msg = '';
    if (ok) {
      if (first) {
        const coins = rec.t ? CASE_RETRY : CASE_COINS;
        rec.ok = true; addCoins(coins); addXP(CASE_XP); msg = `+🪙 ${coins} · +${CASE_XP} XP`;
        if (casesSolved() >= CASE_HAT && !(S.owned || []).includes('acc:detective')) { (S.owned = S.owned || []).push('acc:detective'); msg += ' · ได้ 🕵️ หมวกนักสืบสำหรับน้องคำ!'; }
      }
      confetti(first ? 'burst' : undefined); sfx('win');
    } else { rec.t++; sfx('bad'); }
    markActive(); save();
    const [n, e] = c.suspects[c.ans];
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${ok ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 96 })}</div>` : '🤔'}</div>
      <div class="h2" style="margin:4px 0">${ok ? `ใช่แล้ว! ${e} ${esc(n)} คือคำตอบ` : `ยังไม่ใช่ ${c.suspects[k][1]} ${esc(c.suspects[k][0])} นะ`}</div>
      ${ok ? `<p>${esc(c.why)}</p>${msg ? `<p class="small"><b>${msg}</b></p>` : '<p class="small muted">(คดีนี้เคยไขแล้ว)</p>'}` : `<p class="small">ลองอ่านเบาะแสอีกครั้ง ดูว่าใครมีข้อแก้ตัว และใครไม่มี 🔍</p>`}
      ${ok ? '' : '<button class="btn primary block" id="caseRetry">🔍 อ่านเบาะแสอีกครั้ง</button>'}
      ${!ok && rec.t >= 2 ? '<button class="btn block" id="caseShow" style="margin-top:8px">🏳️ ดูเฉลย</button>' : ''}
      <button class="btn ghost block" id="caseList" style="margin-top:8px">🕵️ คดีอื่น</button></div>`;
    $('#title').textContent = c.title;
    if ($('#caseRetry')) $('#caseRetry').onclick = clues;
    if ($('#caseShow')) $('#caseShow').onclick = () => { $('#caseShow').outerHTML = `<p class="small">${e} <b>${esc(n)}</b>: ${esc(c.why)}</p>`; };
    $('#caseList').onclick = () => renderCases();
  };
  intro();
}
FUN_TILES.push({ id: 'cases', o: 40, ic: '🕵️', name: 'คดีนักสืบ', sub: () => `ไขแล้ว ${casesSolved()} คดี`, go: () => go('cases') });
