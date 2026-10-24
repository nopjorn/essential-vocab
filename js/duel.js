'use strict';
// Challenge a friend (route `duel`): 10 questions generated from a short code, no server.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- duel ---------- */
// Code = 1 digit for the word pool + 4 random characters (the seed), e.g. 2K7Q2. The same code always gives the same 10 questions
// (same words, question types, options and option order) on every device, because everything is drawn from W (sorted A–Z) with a seeded RNG.
// A result is shared as `2K7Q2·8/10·45s`; pasting that into "ใส่รหัสของเพื่อน" plays the same set and compares the two results.
const DUEL_N = 10;
const DUEL_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0 O 1 I L
const DUEL_POOLS = {
  1: { name: 'ง่าย (A1–A2)', lv: ['A1', 'A2'] },
  2: { name: 'กลาง (B1–B2)', lv: ['B1', 'B2'] },
  3: { name: 'ยาก (B2+–C1)', lv: ['B2x', 'C1'] },
  4: { name: 'ทุกระดับ', lv: LEVELS },
};
const DUEL_URL = 'https://nopjorn.github.io/essential-vocab/';
let duelPool = 0; // pool chosen on the start screen (0 = not chosen yet: follows the user's own levels)

function duelRng(code) {
  let h = 2166136261;
  for (const c of 'duel' + code) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6D2B79F5) >>> 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const duelDefaultPool = () => {
  const top = Math.max(...S.settings.levels.map((l) => LEVELS.indexOf(l)), 0);
  return top <= 1 ? 1 : top <= 3 ? 2 : 4;
};
const duelNewCode = (pool) => pool + Array.from({ length: 4 }, () => DUEL_CHARS[Math.random() * DUEL_CHARS.length | 0]).join('');
// Finds a code (and the friend's result, if pasted with it) in whatever the user typed or pasted.
function duelParse(text) {
  const t = String(text || '').toUpperCase().replace(/\s+/g, ' ');
  const code = `([1-4][${DUEL_CHARS}]{4})`, head = '(?:^|[^A-Z0-9])', tail = '(?![A-Z0-9])';
  // a code with a result (2K7Q2·8/10·45s) wins over a bare code mentioned earlier in the message
  const full = t.match(new RegExp(`${head}${code}\\s*[·•.\\-]\\s*(\\d{1,2})\\s*/\\s*(\\d{1,2})(?:\\s*[·•.\\-]\\s*(\\d{1,4})\\s*S?)?${tail}`));
  if (full && +full[2] <= DUEL_N && +full[3] === DUEL_N) return { code: full[1], friend: { r: +full[2], n: DUEL_N, t: full[4] != null ? +full[4] : null } };
  const bare = t.match(new RegExp(`${head}${code}${tail}`));
  return bare ? { code: bare[1], friend: null } : null;
}
// The 10 questions of a code: [{w, kind: en2th|th2en|cloze, opts: [4 words]}].
function duelQuestions(code) {
  const rnd = duelRng(code);
  const pool = W.filter((w) => DUEL_POOLS[code[0]].lv.includes(w.g));
  const idx = pool.map((_, i) => i);
  const posOf = (x) => x.p.split('/')[0];
  const out = [];
  for (let k = 0; k < DUEL_N; k++) {
    const j = k + Math.floor(rnd() * (idx.length - k));
    [idx[k], idx[j]] = [idx[j], idx[k]];
    const w = pool[idx[k]];
    const kinds = hasCloze(w) ? ['en2th', 'th2en', 'cloze'] : ['en2th', 'th2en'];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const near = pool.filter((x) => x !== w && posOf(x) === posOf(w));
    const from = near.length >= 12 ? near : W.filter((x) => x !== w && posOf(x) === posOf(w));
    const seenTh = new Set([thFirst(w.t)]), seenW = new Set([w.w.toLowerCase()]), ds = [];
    for (let tries = 0; ds.length < 3 && tries < 400; tries++) {
      const x = from[Math.floor(rnd() * from.length)];
      if (seenTh.has(thFirst(x.t)) || seenW.has(x.w.toLowerCase())) continue;
      seenTh.add(thFirst(x.t)); seenW.add(x.w.toLowerCase()); ds.push(x);
    }
    const opts = [w, ...ds];
    for (let a = opts.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [opts[a], opts[b]] = [opts[b], opts[a]]; }
    out.push({ w, kind, opts });
  }
  return out;
}
const duelStr = (code, r, secs) => `${code}·${r}/${DUEL_N}·${secs}s`;
// 1 = I win, 0 = tie, -1 = friend wins (more right answers, then less time).
function duelCompare(me, friend) {
  if (me.r !== friend.r) return me.r > friend.r ? 1 : -1;
  if (friend.t == null || me.t === friend.t) return 0;
  return me.t < friend.t ? 1 : -1;
}
async function duelShare(code, r, secs) {
  const text = `⚔️ ท้าดวลศัพท์ต้องรู้!\nรหัส ${code} · ฉันได้ ${r}/${DUEL_N} ใน ${secs} วินาที\nเธอจะเอาชนะได้ไหม? 😎\n\nก๊อปบรรทัดนี้ไปวางที่ เกม → ⚔️ ท้าดวลเพื่อน:\n${duelStr(code, r, secs)}\n${DUEL_URL}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('คัดลอกแล้ว ส่งให้เพื่อนได้เลย 📋'); } catch (e) { toast('คัดลอกไม่ได้ ลองจดรหัส ' + code + ' ส่งให้เพื่อนนะ'); }
}

function renderDuel(arg) {
  const parsed = arg ? duelParse(arg) : null;
  if (parsed) return playDuel(parsed.code, parsed.friend);
  if (!duelPool) duelPool = duelDefaultPool();
  const recent = Object.entries(S.duel || {}).filter(([, v]) => Array.isArray(v)).sort((a, b) => b[1][3] - a[1][3]).slice(0, 6);
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="duBack">‹ กลับ</button></div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">⚔️</div><div class="h2" style="margin:2px 0">ท้าดวลเพื่อน</div>
      <p class="small muted">ข้อสอบ ${DUEL_N} ข้อที่สร้างจากรหัสสั้นๆ · ใครใส่รหัสเดียวกันก็ได้ข้อเดียวกันทุกข้อ แล้วเอาคะแนนมาเทียบกัน (ไม่ต้องมีเซิร์ฟเวอร์)</p></div>
    <div class="card-box"><b>🎲 สร้างข้อสอบใหม่</b>
      <div class="chips" id="duPool" style="margin:10px 0">${Object.entries(DUEL_POOLS).map(([k, p]) => `<button class="chip${+k === duelPool ? ' on' : ''}" data-p="${k}">${p.name}</button>`).join('')}</div>
      <button class="btn primary block" id="duNew">เริ่มเล่น · สุ่มรหัสใหม่</button></div>
    <form class="card-box" id="duForm" autocomplete="off"><b>🔑 มีรหัสจากเพื่อน?</b>
      <p class="small muted" style="margin:4px 0 8px">พิมพ์รหัส เช่น <b>2K7Q2</b> หรือวางข้อความที่เพื่อนส่งมาทั้งหมด จะเห็นผลเทียบกันตอนจบ</p>
      <input class="spell-input" id="duCode" lang="en" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="รหัสหรือข้อความจากเพื่อน" aria-label="รหัสของเพื่อน">
      <button class="btn block" type="submit" style="margin-top:10px">เริ่มเล่นด้วยรหัสนี้</button></form>
    ${recent.length ? `<div class="card-box"><b>🕘 ที่เคยเล่น</b>${recent.map(([c, v]) => `<div class="wl" data-code="${c}"><span><b lang="en">${c}</b> · ${DUEL_POOLS[c[0]] ? DUEL_POOLS[c[0]].name : ''}</span><span class="muted grow" style="text-align:right">${v[0]}/${v[1]} · ${v[2]} วิ</span><button class="btn" data-again aria-label="เล่นรหัส ${c} อีกครั้ง">เล่นอีก</button></div>`).join('')}</div>` : ''}`;
  $('#duBack').onclick = () => go('games');
  $('#duPool').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { duelPool = +b.dataset.p; renderDuel(); } };
  $('#duNew').onclick = () => playDuel(duelNewCode(duelPool), null);
  $('#duForm').onsubmit = (e) => {
    e.preventDefault();
    const p = duelParse($('#duCode').value);
    if (!p) { toast('ไม่พบรหัสในข้อความนี้ รหัสมี 5 ตัว เช่น 2K7Q2'); return; }
    playDuel(p.code, p.friend);
  };
  view.querySelectorAll('[data-again]').forEach((b) => (b.onclick = () => playDuel(b.closest('[data-code]').dataset.code, null)));
}

function playDuel(code, friend) {
  const qs = duelQuestions(code);
  const t0 = Date.now();
  let i = 0, right = 0, combo = 0, bestCombo = 0;
  const wrong = [];
  $('#title').textContent = 'ท้าดวลเพื่อน';

  function q() {
    if (i >= qs.length) return finish();
    const { w, kind, opts } = qs[i];
    const toTh = kind === 'en2th';
    let prompt;
    if (kind === 'en2th') prompt = `<div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div>`;
    else if (kind === 'th2en') prompt = `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`;
    else {
      const blank = w.e.replace(clozeRe(w), (all, pre) => pre + '\u0000');
      prompt = `<div class="cloze" lang="en">${esc(blank).replace('\u0000', '<span class="blank">_____</span>')}</div><div class="thx" style="margin-top:6px">${esc(w.et)}</div>`;
    }
    $('#title').textContent = `ท้าดวลเพื่อน · ${i + 1}/${qs.length}`;
    view.innerHTML = `<div class="session-top">
        <button class="icon-btn" id="quit" aria-label="ออก">✕</button>
        <div class="progress"><div style="width:${i / qs.length * 100}%"></div></div>
        <span class="small" lang="en"><b>${code}</b></span></div>
      <div class="card-box q-prompt pop">${lvBadge(w.g)}<div style="height:8px"></div>${prompt}</div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(toTh ? thFirst(o.t) : o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite">${combo >= 2 ? `<span class="combo">🔥 คอมโบ x${combo}</span>` : ''}</div>`;
    $('#quit').onclick = () => go('duel');
    if (kind === 'en2th') speak(w.w);
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = +b.dataset.i === w.idx;
      view.querySelectorAll('.opt').forEach((o) => { if (+o.dataset.i === w.idx) o.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      gameResult(w, ok);
      questEvent('answer', { game: 'duel', ok });
      sfx(ok ? 'ok' : 'bad');
      if (ok) { right++; combo++; bestCombo = Math.max(bestCombo, combo); addXP(comboXP(combo)); } else { combo = 0; wrong.push(w); }
      $('#reveal').innerHTML = (ok ? `✅ ถูกต้อง! <b>${esc(w.w)}</b> = ${esc(w.t)}` : `❌ <b>${esc(w.w)}</b> = ${esc(w.t)}`)
        + (kind === 'cloze' || !ok ? exampleBox(w) : '')
        + `<button class="btn primary block" id="nextQ" style="margin-top:12px">${i + 1 >= qs.length ? 'ดูผล →' : 'ถัดไป →'}</button>`;
      bindSayEx(view, w.e);
      const cur = qs[i];
      const next = () => { if (qs[i] === cur && current === 'duel') { i++; q(); } };
      $('#nextQ').onclick = next;
      if (kind !== 'en2th') speak(w.w);
      if (ok && kind !== 'cloze') setTimeout(next, 900);
    };
  }

  function finish() {
    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    S.duel = S.duel && typeof S.duel === 'object' ? S.duel : {};
    const prev = S.duel[code];
    const best = !prev || right > prev[0] || (right === prev[0] && secs < prev[2]);
    if (best) S.duel[code] = [right, DUEL_N, secs, Date.now()];
    const keep = Object.entries(S.duel).sort((a, b) => b[1][3] - a[1][3]).slice(0, 30);
    S.duel = Object.fromEntries(keep);
    S.counts.duels = (S.counts.duels || 0) + 1;
    if (right === DUEL_N) S.counts.perfect = (S.counts.perfect || 0) + 1;
    addXP(right >= 8 ? 15 : 8);
    questEvent('round', { game: 'duel', correct: right, bestCombo, perfect: right === DUEL_N });
    if (right >= 8) confetti();
    const me = { r: right, n: DUEL_N, t: secs };
    const cmp = friend ? duelCompare(me, friend) : null;
    const verdict = cmp == null ? '' : cmp > 0 ? '🏆 เธอชนะเพื่อน!' : cmp < 0 ? '💪 เพื่อนชนะไปนิดเดียว ลองใหม่อีกที!' : '🤝 เสมอกัน!';
    view.innerHTML = `<div class="card-box center pop">
        <div class="result-emoji">${cmp > 0 ? '🏆' : right >= 8 ? '🎉' : right >= 5 ? '💪' : '📚'}</div>
        ${verdict ? `<div class="h2" style="margin:2px 0">${verdict}</div>` : ''}
        <div class="duel-vs"><div><small>ฉัน</small><b>${right}/${DUEL_N}</b><span>${secs} วินาที</span></div>${friend ? `<div class="vs">vs</div><div><small>เพื่อน</small><b>${friend.r}/${friend.n}</b><span>${friend.t != null ? friend.t + ' วินาที' : ''}</span></div>` : ''}</div>
        <p class="small muted">รหัส <b lang="en">${code}</b> · ${DUEL_POOLS[code[0]].name}${best ? '' : ` · สถิติเดิมของรหัสนี้ ${prev[0]}/${prev[1]}`}</p>
      </div>
      ${wrong.length ? `<div class="card-box wrong-list"><b>คำที่ควรทบทวน</b> <span class="small muted">(ใส่ในแฟลชการ์ดให้แล้ว) · กด ☆ เพื่อติดดาว</span>
        ${[...new Set(wrong)].map((w) => `<div class="wl" data-i="${w.idx}"><span><b>${esc(w.w)}</b> <span class="pos">${esc(w.p)}</span></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span><button class="star-btn" data-star>${starIcon(w)}</button></div>`).join('')}</div>` : ''}
      <button class="btn primary block" id="duShare">📤 ท้าเพื่อน (แชร์รหัส ${code})</button>
      <div style="height:10px"></div><button class="btn block" id="duAgain">เล่นรหัสนี้อีกครั้ง</button>
      <div style="height:10px"></div><button class="btn block" id="duMenu">สร้างข้อสอบใหม่ / ใส่รหัสอื่น</button>`;
    $('#title').textContent = 'ท้าดวลเพื่อน';
    $('#duShare').onclick = () => duelShare(code, right, secs);
    $('#duAgain').onclick = () => playDuel(code, friend);
    $('#duMenu').onclick = () => go('duel');
    const wl = view.querySelector('.wrong-list');
    if (wl) wl.onclick = (e) => {
      const row = e.target.closest('.wl'); if (!row) return;
      const w = W[+row.dataset.i]; if (!w) return;
      const sb = e.target.closest('[data-star]');
      if (sb) { toggleStar(w); sb.textContent = starIcon(w); } else speak(w.w);
    };
    updateStreak();
  }
  q();
}
