'use strict';
// Daily word riddle (route `riddle`): guess today's 5-letter word in 6 tries.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- riddle ---------- */
// Everyone gets the same word on the same day (hash of the date over the A1–B1 five-letter words, which are sorted A–Z).
// Guesses must be five-letter words from the list. Colours: green = right place, yellow = in the word, grey = not in it.
// After 3 misses the Thai meaning is shown as a hint. The share text is a colour grid without the word.
const RIDDLE_TRIES = 6;
const RIDDLE_EPOCH = Date.UTC(2026, 0, 1);
const RIDDLE_URL = 'https://nopjorn.github.io/essential-vocab/';
const RIDDLE_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const RIDDLE_ALL = W.filter((w) => /^[a-z]{5}$/.test(w.w));
const RIDDLE_ANS = RIDDLE_ALL.filter((w) => ['A1', 'A2', 'B1'].includes(w.l));
const RIDDLE_SET = new Set(RIDDLE_ALL.map((w) => w.w));
const riddleNo = (day) => Math.floor((Date.parse(day + 'T00:00:00Z') - RIDDLE_EPOCH) / 864e5) + 1;
function riddleAnswer(day) {
  let h = 11; for (const c of 'riddle' + day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RIDDLE_ANS[h % RIDDLE_ANS.length];
}
// 'g' right place, 'y' elsewhere in the word, 'x' absent; repeated letters are matched once each.
function riddleScore(guess, ans) {
  const res = Array(5).fill('x'), left = {};
  for (let i = 0; i < 5; i++) { if (guess[i] === ans[i]) res[i] = 'g'; else left[ans[i]] = (left[ans[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) if (res[i] === 'x' && left[guess[i]] > 0) { res[i] = 'y'; left[guess[i]]--; }
  return res;
}
const RIDDLE_EMOJI = { g: '🟩', y: '🟨', x: '⬛' };
const RIDDLE_NAME = { g: 'ถูกตำแหน่ง', y: 'มีในคำแต่ผิดตำแหน่ง', x: 'ไม่มีในคำ' };
function riddleToday() {
  const t = today();
  if (S.riddle.d !== t) S.riddle = { d: t, g: [], over: false, win: false };
  return S.riddle;
}
function riddleShare(r) {
  const ans = riddleAnswer(r.d).w;
  return `ปริศนาศัพท์ #${riddleNo(r.d)} ${r.win ? r.g.length : 'X'}/${RIDDLE_TRIES}\n${r.g.map((g) => riddleScore(g, ans).map((c) => RIDDLE_EMOJI[c]).join('')).join('\n')}\n${RIDDLE_URL}`;
}
function riddleFinish(r) {
  const st = S.riddleStat, yest = new Date(Date.parse(r.d + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
  st.played++;
  if (r.win) {
    st.won++; st.dist[r.g.length - 1]++;
    st.streak = st.last === yest ? st.streak + 1 : 1;
    st.best = Math.max(st.best, st.streak);
    addXP(5 + (RIDDLE_TRIES - r.g.length) * 3);
  } else st.streak = 0;
  st.last = r.d;
  S.counts.riddle = (S.counts.riddle || 0) + (r.win ? 1 : 0);
}
function renderRiddle(from) {
  const back = from || 'games', r = riddleToday(), ans = riddleAnswer(r.d);
  let cur = '', flipRow = -1;
  const keyState = () => {
    const k = {};
    r.g.forEach((g) => riddleScore(g, ans.w).forEach((c, i) => { const ch = g[i]; if (c === 'g' || (c === 'y' && k[ch] !== 'g') || (c === 'x' && !k[ch])) k[ch] = c; }));
    return k;
  };
  const paint = () => {
    $('#title').textContent = `ปริศนาศัพท์ #${riddleNo(r.d)}`;
    const ks = keyState();
    const rows = Array.from({ length: RIDDLE_TRIES }, (_, ri) => {
      const g = r.g[ri], sc = g ? riddleScore(g, ans.w) : null, active = !g && ri === r.g.length && !r.over;
      return `<div class="rd-row${ri === flipRow ? ' flip' : ''}" role="group" aria-label="ครั้งที่ ${ri + 1}">${[0, 1, 2, 3, 4].map((i) => {
        const ch = g ? g[i] : active ? cur[i] || '' : '';
        return `<div class="rd-t ${sc ? 'c-' + sc[i] : ch ? 'typed' : ''}" lang="en" style="--d:${i * 0.12}s"${sc ? ` aria-label="${ch.toUpperCase()} ${RIDDLE_NAME[sc[i]]}"` : ''}>${ch.toUpperCase()}</div>`;
      }).join('')}</div>`;
    }).join('');
    const kb = RIDDLE_ROWS.map((row, ri) => `<div class="rd-kr">${ri === 2 ? '<button class="rd-k wide" data-k="enter" aria-label="ส่งคำตอบ">ส่ง</button>' : ''}${[...row].map((c) => `<button class="rd-k ${ks[c] ? 'c-' + ks[c] : ''}" data-k="${c}" lang="en">${c.toUpperCase()}</button>`).join('')}${ri === 2 ? '<button class="rd-k wide" data-k="back" aria-label="ลบ">⌫</button>' : ''}</div>`).join('');
    const st = S.riddleStat, maxd = Math.max(1, ...st.dist);
    const result = r.over ? `<div class="card-box center pop" id="rdRes"><div class="result-emoji">${r.win ? '🎉' : '😅'}</div>
        <div class="h2" style="margin:4px 0">${r.win ? `ทายถูกในครั้งที่ ${r.g.length}!` : 'วันนี้ยังไม่ใช่ ลองใหม่พรุ่งนี้นะ'}</div>
        <div class="word" lang="en" style="margin-top:6px">${esc(ans.w)}</div><div class="ipa" lang="en">${esc(ans.i || '')}</div>
        <div class="th" style="margin:2px 0 10px">${esc(ans.p)} · ${esc(ans.t)}</div>
        <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px"><button class="btn" id="rdSay">🔊 ฟัง</button><button class="btn" id="rdSheet">📖 ดูรายละเอียดคำ</button><button class="btn primary" id="rdShare">📤 แชร์ผล</button></div>
        <div class="tiles mo-tiles" style="margin:14px 0 8px"><div class="tile-s"><b>${st.played}</b><span>เล่น</span></div><div class="tile-s"><b>${st.played ? Math.round(st.won / st.played * 100) : 0}%</b><span>ทายถูก</span></div><div class="tile-s"><b>${st.streak}</b><span>ติดต่อกัน</span></div><div class="tile-s"><b>${st.best}</b><span>สูงสุด</span></div></div>
        <div class="rd-dist">${st.dist.map((n, i) => `<div><span>${i + 1}</span><i style="width:${Math.max(6, n / maxd * 100)}%" class="${r.win && r.g.length === i + 1 ? 'me' : ''}">${n}</i></div>`).join('')}</div>
        <p class="small muted" style="margin:10px 0 0">คำใหม่ทุกวัน · ทุกคนได้คำเดียวกัน</p></div>` : '';
    view.innerHTML = `<div class="row" style="margin-bottom:8px"><button class="btn ghost" id="rdBack">‹ กลับ</button><div class="grow"></div><span class="small muted">ทาย ${r.g.length}/${RIDDLE_TRIES}</span></div>
      ${r.over ? '' : '<p class="small muted center" style="margin:0 4px 8px">ทายคำภาษาอังกฤษ 5 ตัวอักษรใน 6 ครั้ง 🟩 ถูกตำแหน่ง · 🟨 มีแต่ผิดที่ · ⬛ ไม่มี</p>'}
      ${r.g.length >= 3 && !r.over ? `<div class="tip-box center" style="margin-bottom:10px">💡 คำใบ้: <b>${esc(ans.t)}</b> <span class="muted">(${esc(ans.p)})</span></div>` : ''}
      <div class="rd-grid" id="rdGrid">${rows}</div>${result}
      ${r.over ? '' : `<div class="rd-kb" id="rdKb">${kb}</div>`}`;
    $('#rdBack').onclick = () => go(back);
    if ($('#rdSay')) $('#rdSay').onclick = () => speak(ans.w);
    if ($('#rdSheet')) $('#rdSheet').onclick = () => openSheet(ans);
    if ($('#rdShare')) $('#rdShare').onclick = async () => {
      const text = riddleShare(r);
      if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(text); toast('คัดลอกผลแล้ว นำไปวางแชร์ได้เลย'); } catch (e) { toast('คัดลอกไม่ได้ ลองจับเลือกข้อความเอง'); }
    };
    if ($('#rdKb')) $('#rdKb').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); };
    flipRow = -1;
  };
  const shake = (msg) => {
    toast(msg); sfx('bad');
    const row = view.querySelectorAll('.rd-row')[r.g.length]; if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
  };
  const press = (k) => {
    if (r.over) return;
    if (k === 'back') cur = cur.slice(0, -1);
    else if (k === 'enter') {
      if (cur.length < 5) return shake('ใส่ให้ครบ 5 ตัวอักษรก่อนนะ');
      if (!RIDDLE_SET.has(cur)) return shake('ไม่มีคำนี้ในลิสต์ ลองคำอื่นดู');
      if (r.g.includes(cur)) return shake('ทายคำนี้ไปแล้ว');
      r.g.push(cur); flipRow = r.g.length - 1;
      if (cur === ans.w) { r.over = r.win = true; } else if (r.g.length >= RIDDLE_TRIES) r.over = true;
      cur = '';
      if (r.over) { riddleFinish(r); if (r.win) { confetti(); sfx('ok'); } else sfx('bad'); }
      save();
    } else if (cur.length < 5) cur += k;
    paint();
  };
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || current !== 'riddle') return;
    if (e.key === 'Enter') { e.preventDefault(); press('enter'); }
    else if (e.key === 'Backspace') press('back');
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);
  view.scrollTop = 0;
  paint();
}
