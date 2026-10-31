'use strict';
// Endless tower (1.115, single player): climb floor by floor. 3 questions a floor (5 on every 10th = boss floor), 3 hearts a run,
// words get harder with height (A1 on floors 1–10, A2 11–20 … C1 51–60, then a B2–C1 mix with harder distractors).
// Clearing a boss floor saves a checkpoint that later runs may start from. Coins: +1 a floor, +10 a boss floor.
// Floor 50 → 🧙 wizard hat for the mascot. State: S.tower = { best: highest floor cleared, cp: highest boss floor cleared, runs }
// (cleanTower()/merge in app.js). Uses funAsk() from js/fun.js. Classic script sharing globals with app.js.

const TW_Q = 3, TW_BOSS_Q = 5, TW_HEARTS = 3, TW_WIZARD = 50;
const twBoss = (f) => f % 10 === 0;
const twLevel = (f) => LEVELS[Math.floor((f - 1) / 10)] || null;
const twPool = (f) => (twLevel(f) ? W.filter((w) => w.g === twLevel(f)) : W.filter((w) => w.g === 'B2' || w.g === 'B2x' || w.g === 'C1'));
const twKinds = (f) => (f <= 5 ? ['en2th', 'th2en'] : f < 30 ? ['en2th', 'th2en', 'listen'] : ['en2th', 'th2en', 'listen', 'cloze']);
const TW_ZONES = [[1, '🌷', 'สวนดอกไม้'], [11, '🌲', 'ป่าสน'], [21, '⛰️', 'หน้าผา'], [31, '☁️', 'เหนือเมฆ'], [41, '🌙', 'ดวงจันทร์'], [51, '🌌', 'อวกาศ'], [61, '✨', 'ดินแดนตำนาน']];
const twZone = (f) => TW_ZONES.filter((z) => f >= z[0]).pop();
const twStarts = () => { const a = [1]; for (let c = 10; c <= S.tower.cp; c += 10) a.push(c + 1); return a; };
const twHearts = (h) => `${'❤️'.repeat(Math.max(0, h))}${'🖤'.repeat(Math.max(0, TW_HEARTS - h))}`;

function renderTower() {
  const t = S.tower, starts = twStarts(), top = starts[starts.length - 1];
  const zones = TW_ZONES.slice().reverse().map(([from, ic, name], k, arr) => {
    const to = k === 0 ? '∞' : arr[k - 1][0] - 1, here = t.best + 1 >= from && (k === 0 || t.best + 1 <= arr[k - 1][0] - 1), passed = t.best >= (k === 0 ? Infinity : arr[k - 1][0] - 1);
    return `<div class="tw-zone${passed ? ' got' : ''}${here ? ' now' : ''}"><span aria-hidden="true">${ic}</span><div class="grow"><b>${name}</b> <span class="small muted">ชั้น ${from}–${to}${twLevel(from) ? ' · ' + LV_LABEL[twLevel(from)] : ' · B2–C1'}</span></div><span class="small">${passed ? '✅' : here ? '🧗 อยู่ตรงนี้' : ''}</span></div>`;
  }).join('');
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="twBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">🏯</div><div class="h2" style="margin:2px 0">หอคอยไม่รู้จบ</div>
      <p class="small">สูงสุด <b>ชั้น ${t.best}</b> · ปีนไปแล้ว ${t.runs} รอบ</p>
      <button class="btn primary block" id="twGo">🧗 เริ่มปีนจากชั้น ${top}</button>
      ${starts.length > 1 ? `<div class="chips" style="justify-content:center;margin-top:10px" aria-label="เลือกจุดเริ่ม">${starts.map((s) => `<button class="chip${s === top ? ' on' : ''}" data-start="${s}">ชั้น ${s}</button>`).join('')}</div>` : ''}</div>
    <div class="card-box tw-map">${zones}</div>
    <p class="small muted" style="margin:10px 4px">ชั้นละ ${TW_Q} ข้อ ทุก 10 ชั้นเป็น 🐲 ชั้นบอส ${TW_BOSS_Q} ข้อ · มี ${TW_HEARTS} หัวใจต่อรอบ ตอบผิดเสีย 1 ดวง · ผ่านชั้นบอสแล้วเริ่มรอบหน้าจากชั้นถัดไปได้ · ผ่านชั้นละ 🪙 1 ชั้นบอส 🪙 10 · ถึงชั้น ${TW_WIZARD} ได้ 🧙 หมวกพ่อมดให้น้องคำ · ใช้เหรียญซื้อตัวช่วยระหว่างปีนได้</p>`;
  $('#twBack').onclick = () => go('fun');
  $('#twGo').onclick = () => runTower(top);
  view.querySelectorAll('[data-start]').forEach((b) => { b.onclick = () => runTower(+b.dataset.start); });
}

function runTower(start) {
  let f = start, hearts = TW_HEARTS, qn = 0, combo = 0, coins = 0, right = 0, alive = true;
  const best0 = S.tower.best, used = new Set();
  S.tower.runs++; save();
  cleanup = () => { alive = false; };
  const banner = () => {
    const z = twZone(f);
    $('#title').textContent = `หอคอย · ชั้น ${f}`;
    view.innerHTML = `<div class="tw-banner pop"><div class="tw-up" aria-hidden="true">${twBoss(f) ? '🐲' : '⬆️'}</div><div class="h2">ชั้น ${f}</div><div class="small muted">${z[1]} ${z[2]}${twBoss(f) ? ` · ชั้นบอส ${TW_BOSS_Q} ข้อ` : ''}</div><div class="small">${twHearts(hearts)}</div></div>`;
    setTimeout(() => { if (alive) ask(); }, f === start ? 500 : 750);
  };
  const ask = () => {
    const need = twBoss(f) ? TW_BOSS_Q : TW_Q;
    if (qn >= need) return clear();
    const pool = twPool(f), fresh = pool.filter((w) => !used.has(w.w)), w = pick(fresh.length ? fresh : pool);
    used.add(w.w);
    const z = twZone(f);
    const top = `<div class="session-top"><button class="icon-btn" id="twQuit" aria-label="จบรอบ">✕</button><div class="progress${twBoss(f) ? ' boss-hp' : ''}"><div style="width:${qn / need * 100}%"></div></div><span class="small" id="twH">${twHearts(hearts)}</span></div>`;
    funAsk(w, pick(twKinds(f)), {
      top, sub: `${z[1]} ชั้น ${f}${twBoss(f) ? ' · 🐲 ชั้นบอส' : ''} · ข้อ ${qn + 1}/${need}`, hard: f > 40,
      heart: hearts < TW_HEARTS ? () => { hearts++; const h = $('#twH'); if (h) h.textContent = twHearts(hearts); } : null,
      alive: () => alive,
      onDone: (ok) => {
        if (ok) { right++; combo++; S.counts.maxCombo = Math.max(S.counts.maxCombo || 0, combo); addXP(comboXP(combo)); if (combo >= 5 && combo % 5 === 0) mascotCheer(combo); }
        else { combo = 0; hearts--; }
        qn++;
        if (hearts <= 0) return end();
        ask();
      },
    });
    $('#twQuit').onclick = () => end();
  };
  const clear = () => {
    const boss = twBoss(f), c = boss ? 10 : 1;
    coins += c; addCoins(c);
    S.tower.best = Math.max(S.tower.best, f);
    if (boss) { S.tower.cp = Math.max(S.tower.cp, f); confetti(); toast(`🐲 ชนะชั้นบอส ${f}! บันทึกจุดเริ่มใหม่ที่ชั้น ${f + 1} (+🪙 10)`); }
    if (S.tower.best >= TW_WIZARD && !(S.owned || []).includes('acc:wizard')) { (S.owned = S.owned || []).push('acc:wizard'); setTimeout(() => toast('🧙 ได้หมวกพ่อมดสำหรับน้องคำ!'), 1200); }
    save();
    f++; qn = 0;
    banner();
  };
  const end = () => {
    if (!alive) return;
    alive = false; cleanup = null;
    const newBest = S.tower.best > best0;
    save();
    if (newBest) confetti(S.tower.best >= best0 + 10 ? 'burst' : undefined);
    const starts = twStarts(), again = starts[starts.length - 1];
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${newBest ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 96 })}</div>` : '🏯'}</div>
      <div class="h2" style="margin:4px 0">ไปถึงชั้น ${f}${newBest ? ' · สถิติใหม่! 🏅' : ''}</div>
      <p class="small">ผ่านไป ${Math.max(0, f - start)} ชั้น · ตอบถูก ${right} ข้อ · ได้ 🪙 ${coins}${newBest ? '' : ` · สถิติเดิม ชั้น ${S.tower.best}`}</p>
      <button class="btn primary block" id="twAgain">🧗 ปีนอีกรอบจากชั้น ${again}</button>
      <button class="btn ghost block" id="twHome" style="margin-top:8px">🏯 กลับหน้าหอคอย</button></div>`;
    $('#title').textContent = 'หอคอยไม่รู้จบ';
    $('#twAgain').onclick = () => runTower(again);
    $('#twHome').onclick = () => renderTower();
    updateStreak();
  };
  banner();
}
FUN_TILES.push({ id: 'tower', o: 10, home: true, ic: '🏯', name: 'หอคอยไม่รู้จบ', sub: () => (S.tower.best ? `สูงสุดชั้น ${S.tower.best}` : 'ยังไม่เคยปีน'), go: () => go('tower') });
