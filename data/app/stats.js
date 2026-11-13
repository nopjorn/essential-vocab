'use strict';
// Stats page (lazy-loaded by js/stats.js since 1.236): habits, projections, charts, monthly summary, day page, heatmap, monthly / level test.
// Classic script sharing globals with app.js and js/stats.js.

// Habits over the last 28 days (or since the first day played, if sooner).
function habits() {
  const firstDay = Object.keys(S.hist).sort()[0];
  const since = firstDay ? dayDiff(today(), firstDay) + 1 : 0;
  const span = Math.max(1, Math.min(28, since));
  let active = 0, cards = 0, games = 0;
  for (let k = 0; k < span; k++) {
    const key = dayKey(k), all = S.hist[key] || 0, c = Math.min(all, S.chist[key] || 0);
    if (all) active++;
    cards += c; games += all - c;
  }
  const progs = Object.values(S.prog);
  const seen = progs.reduce((a, p) => a + (p.s || 0), 0), ok = progs.reduce((a, p) => a + (p.c || 0), 0);
  return { span, active, ratio: since ? active / span : 0, cards, games, acc: seen ? Math.min(1, ok / seen) : 0, since };
}

// Words newly learned per calendar day: measured from snapshots when there are ≥7 days of them,
// otherwise estimated from the daily goal × how often the user plays.
function learnRate(h) {
  const keys = Object.keys(S.snap).sort();
  const old = keys.find((k) => dayDiff(today(), k) <= 28);
  if (old && dayDiff(today(), old) >= 7) {
    const r = (S.snap[today()][2] - S.snap[old][2]) / dayDiff(today(), old);
    if (r > 0) return { rate: r, measured: true };
  }
  return { rate: newGoal() * h.ratio, measured: false };
}

// Days until every word in a set is "จำได้แล้ว": time to meet the remaining words, plus the time the
// last ones need to climb boxes 1→4 (1+3+7 = 11 days if always remembered, longer with lapses and
// skipped days).
function etaDays(total, learned, rate, h) {
  if (learned >= total && rate <= 0) return 0;
  if (rate <= 0) return null;
  const lag = 11 / Math.max(0.5, h.acc || 0.8) / Math.max(0.2, h.ratio || 1);
  return (total - learned) / rate + lag;
}

// Skill games on a review schedule (S.lex): per game how many questions were asked, how many are solid (gap ≥ 7 days) and due now.
// Weak spots (1.125): from the last 21 days of wrong answers (S.miss) and the skill games' own records (S.lex): which topics,
// parts of speech and levels go wrong most, and which skill games are least accurate. Each finding comes with a button to practise it.
const POS_TH = { n: 'คำนาม', v: 'คำกริยา', adj: 'คำคุณศัพท์', adv: 'คำกริยาวิเศษณ์', prep: 'บุพบท', pron: 'สรรพนาม', conj: 'คำเชื่อม', det: 'คำนำหน้านาม' };
function weakSpots() {
  const miss = {};
  for (const day of Object.values(S.miss || {})) for (const [w, n] of Object.entries(day)) miss[w] = (miss[w] || 0) + n;
  const words = Object.entries(miss).map(([w, n]) => [WORD_BY[w], n]).filter(([w]) => w);
  const total = words.reduce((a, [, n]) => a + n, 0);
  const tally = (key) => { const t = {}; for (const [w, n] of words) { const k = key(w); if (k) t[k] = (t[k] || 0) + n; } return Object.entries(t).sort((a, b) => b[1] - a[1]); };
  const skills = {};
  for (const [k, p] of Object.entries(S.lex || {})) { const g = k.split(':')[0]; if (!GAMES[g] || !p) continue; const r = (skills[g] = skills[g] || [0, 0]); r[0] += (p.c || 0) + (p.x || 0); r[1] += p.c || 0; }
  const weakSkills = Object.entries(skills).filter(([, [n]]) => n >= 6).map(([g, [n, c]]) => [g, c / n, n]).filter(([, acc]) => acc < 0.8).sort((a, b) => a[1] - b[1]).slice(0, 2);
  // 1.160.0: words missed on 2+ different days in the 21-day log (a habit, not a slip)
  const days = {};
  for (const day of Object.values(S.miss || {})) for (const w of Object.keys(day)) days[w] = (days[w] || 0) + 1;
  const rep = Object.entries(days).filter(([w, n]) => n >= 2 && WORD_BY[w]).sort((a, b) => b[1] - a[1]).map(([w, n]) => [WORD_BY[w], n]);
  return { rep, total, words: words.sort((a, b) => b[1] - a[1]), topics: tally((w) => w.tp).slice(0, 3), pos: tally((w) => String(w.p || '').split('/')[0]).slice(0, 2), levels: tally((w) => w.g).slice(0, 2), weakSkills };
}
function weakCard() {
  const r = weakSpots();
  if (r.total < 8 && !r.weakSkills.length) return `<div class="h2">🩺 จุดอ่อนของฉัน</div><div class="card-box small muted">ยังมีข้อมูลน้อย ตอบผิดสะสมใน 21 วันอีกสักหน่อย (ตอนนี้ ${r.total} ครั้ง) แล้วแอปจะบอกได้ว่าพลาดเรื่องไหนบ่อย</div>`;
  const pct = (n) => Math.round(n / Math.max(1, r.total) * 100);
  const row = (ic, label, list, fmt) => (list.length ? `<div class="wk-row"><span class="wk-ic" aria-hidden="true">${ic}</span><div class="grow"><b>${label}</b><div class="small">${list.map(fmt).join(' · ')}</div></div></div>` : '');
  return `<div class="h2">🩺 จุดอ่อนของฉัน <span class="small muted">21 วันล่าสุด</span></div><div class="card-box" id="weak">
    ${r.total ? `<div class="small muted" style="margin-bottom:8px">ตอบผิด ${r.total} ครั้ง จาก ${r.words.length} คำ</div>` : ''}
    ${row('📂', 'หมวดที่พลาดบ่อย', r.topics, ([t, n]) => `${TOPIC_LABEL[t] || t} <span class="muted">${pct(n)}%</span>`)}
    ${row('🔤', 'ชนิดคำที่พลาดบ่อย', r.pos, ([p, n]) => `${POS_TH[p] || p} <span class="muted">${pct(n)}%</span>`)}
    ${row('📶', 'ระดับที่พลาดบ่อย', r.levels, ([l, n]) => `${LV_LABEL[l] || l} <span class="muted">${pct(n)}%</span>`)}
    ${row('🔁', 'ผิดซ้ำหลายวัน', r.rep.slice(0, 6), ([w, n]) => `<span lang="en">${esc(w.w)}</span> <span class="muted">${n} วัน</span>`)}
    ${row('🧩', 'เกมฝึกทักษะที่ยังไม่แม่น', r.weakSkills, ([g, acc]) => `${GAMES[g].icon} ${esc(GAMES[g].name)} <span class="muted">ถูก ${Math.round(acc * 100)}%</span>`)}
    <div class="wk-btns">${r.words.length ? `<button class="btn primary" data-weak="miss">🎯 ฝึกคำที่ผิดช่วงนี้ (${Math.min(20, r.words.length)} คำ)</button>` : ''}
      ${r.rep.length >= 2 ? `<button class="btn" data-weak="rep">🔁 ฝึกคำที่ผิดซ้ำ (${Math.min(20, r.rep.length)} คำ)</button>` : ''}
      ${r.topics.length ? `<button class="btn" data-weak="tp:${r.topics[0][0]}">📂 ฝึกหมวด${esc((TOPIC_LABEL[r.topics[0][0]] || '').replace(/^\S+ /, ''))}</button>` : ''}
      ${r.weakSkills.map(([g]) => `<button class="btn" data-weak="g:${g}">${GAMES[g].icon} เล่น${esc(GAMES[g].name)}</button>`).join('')}</div></div>`;
}
// The buttons: a one-off round on the words picked (custom source), or the weak skill game itself.
function weakGo(k) {
  const r = weakSpots();
  if (k.startsWith('g:')) return startGame(k.slice(2));
  const list = k === 'rep' ? r.rep.map(([w]) => w) : k === 'miss' ? r.words.map(([w]) => w) : r.words.map(([w]) => w).filter((w) => w.tp === k.slice(3))
    .concat(W.filter((w) => w.tp === k.slice(3) && S.prog[w.w]).sort((a, b) => (S.prog[b.w].x || 0) - (S.prog[a.w].x || 0)));
  customWords = [...new Set(list)].slice(0, 20);
  if (customWords.length < 4) customWords = [...new Set(customWords.concat(pool().filter((w) => k === 'miss' || k === 'rep' || w.tp === k.slice(3)).slice(0, 10)))];
  gameSource = 'custom';
  startGame(pick(['en2th', 'th2en', 'listen']));
}
function skillCard() {
  const rows = SKILL_GAMES.map((g) => ({ g, ...lexStats(g) })).filter((r) => r.seen);
  if (!rows.length) return '';
  return `<div class="h2">🧩 เกมฝึกทักษะ — ข้อที่ต้องทวน</div><div class="card-box">
    <table class="g-table"><tr><th>เกม</th><th>เคยเจอ</th><th>แม่นแล้ว</th><th>ถึงกำหนด</th></tr>${rows.map((r) => `<tr><td>${GAMES[r.g].icon} ${esc(GAMES[r.g].name)}</td><td>${r.seen}</td><td>${r.solid}</td><td>${r.due ? `<b>${r.due}</b>` : '–'}</td></tr>`).join('')}</table>
    <div class="small muted" style="margin-top:8px">ข้อที่ตอบผิดจะกลับมาให้ทวนในรอบถัดไปของเกมนั้นเอง ข้อที่ตอบถูกจะห่างออกไปเรื่อยๆ</div></div>`;
}
function toeicCard() {
  const rows = TOEIC_GAMES.filter((g) => GAMES[g] && g !== 'toeicMock').map(toeicStat);
  if (!rows.some((r) => r.seen) && !(S.mock || []).length) return '';
  const rated = rows.filter((r) => r.ans >= 8).sort((a, b) => a.acc - b.acc);
  const weak = rated.length >= 2 && rated[0].acc < 0.85 ? rated[0] : null;
  const stale = rows.filter((r) => r.ago == null || r.ago >= 7);
  const pct = (r) => (r.acc == null ? '–' : Math.round(r.acc * 100) + '%');
  const when = (r) => (r.ago == null ? 'ยังไม่เคย' : r.ago === 0 ? 'วันนี้' : r.ago + ' วันก่อน');
  const tip = weak ? `🎯 พาร์ตที่ยังพลาดบ่อยที่สุด: <b>${GAMES[weak.g].icon} ${esc(GAMES[weak.g].name)}</b> (แม่น ${pct(weak)})`
    : rated.length >= 2 ? '✅ ทุกพาร์ตที่เล่นพอแล้วแม่นเกิน 85% เก่งมาก' : 'เล่นแต่ละพาร์ตสักรอบสองรอบ แล้วแอปจะบอกว่าพาร์ตไหนต้องฝึกเพิ่ม';
  return `<div class="h2">💼 TOEIC แยกตามพาร์ต</div><div class="card-box" id="toeicBox">
    <table class="g-table toeic-t"><tr><th>พาร์ต</th><th>ความแม่น</th><th>เคยเจอ</th><th>ถึงกำหนด</th><th>เล่นล่าสุด</th></tr>${rows.map((r) => `<tr${weak && r.g === weak.g ? ' class="weak"' : ''}><td><button class="linkish" data-tgo="${r.g}">${GAMES[r.g].icon} ${esc(GAMES[r.g].name.replace('TOEIC ', ''))}</button></td><td>${pct(r)}</td><td>${r.seen}</td><td>${r.due ? `<b>${r.due}</b>` : '–'}</td><td>${when(r)}</td></tr>`).join('')}</table>
    <div class="small" style="margin-top:8px">${tip}</div>
    ${stale.length && stale.length < rows.length ? `<div class="small muted" style="margin-top:4px">💤 ไม่ได้ฝึก 7 วันขึ้นไป: ${stale.map((r) => esc(GAMES[r.g].name.replace('TOEIC ', ''))).join(' · ')}</div>` : ''}
    ${mockLine()}
    <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn" id="toeicHub">💼 ศูนย์ TOEIC</button><button class="btn" data-tgo="toeicMock">🏁 ทำข้อสอบจำลอง</button><button class="btn" id="toeicEar">🎧 ฟังบทสนทนาต่อเนื่อง</button>${weak ? `<button class="btn primary" data-tgo="${weak.g}">ฝึกพาร์ตที่อ่อนที่สุด</button>` : ''}${stale.length ? `<button class="btn" data-tgo="${stale[0].g}">เล่น ${esc(GAMES[stale[0].g].name.replace('TOEIC ', ''))} ที่ห่างไปนาน</button>` : ''}</div></div>`;
}

// Real retention against the target (1.107): of the reviews of cards that were due, how many came back, by the gap they had.
function retCard() {
  const tot = S.ret.reduce((a, r) => [a[0] + r[0], a[1] + r[1]], [0, 0]), target = Math.round(retention() * 100);
  if (!tot[0]) return '';
  const pct = (r) => (r[0] ? Math.round(r[1] / r[0] * 100) + '%' : '–');
  const actual = Math.round(tot[1] / tot[0] * 100), enough = tot[0] >= 30;
  const advice = !enough ? 'ยังมีข้อมูลน้อย (ต้องทวนการ์ดที่ถึงกำหนดอีกสักพัก ราว 30 ใบ) ถึงจะบอกได้แม่น'
    : S.settings.scheduler === 'sm2' ? 'ตอนนี้ใช้ตัวจัดรอบแบบเก่า (SM-2) ไม่มีเป้า % ให้เทียบ'
    : actual < target - 5 ? '📉 จำได้น้อยกว่าเป้า: ลองตั้ง “อยากจำได้กี่ %” ให้สูงขึ้น (ทวนถี่ขึ้น) หรือลดคำใหม่ต่อวันลงสักพัก'
    : actual > target + 5 ? '📈 จำได้เกินเป้ามาก: ลดเป้าความจำลงได้ (ใน ⚙️ ตั้งค่า → การเรียน) จะทวนน้อยลงโดยความจำยังดีอยู่'
    : '✅ ใกล้เป้าที่ตั้งไว้ ตัวจัดรอบทำงานได้ดี';
  return `<div class="h2">🎯 จำได้จริงเทียบกับเป้า</div><div class="card-box">
    <div class="ret-sum"><b>${enough ? actual + '%' : '–'}</b> <span class="muted">จำได้จริง</span> <span class="muted">·</span> <b>${target}%</b> <span class="muted">เป้า (${tot[0]} ใบที่ทวน)</span></div>
    <table class="g-table"><tr><th>ห่างจากรอบก่อน</th><th>ทวน</th><th>จำได้</th></tr>${S.ret.map((r, b) => `<tr><td>${RET_BUCKETS[b]}</td><td>${r[0]}</td><td>${r[0] >= 5 ? pct(r) : '–'}</td></tr>`).join('')}</table>
    <div class="small muted" style="margin-top:8px">${advice}</div>${fskBox()}</div>`;
}
// 🧠 Personal schedule (1.153.0): what fsFit() found in this learner's own reviews, and a button to use it (settings.fsk).
function fskBox() {
  if (!fsOn()) return '';
  const cur = fsK(), f = fsFit(), x = (k) => '×' + k.toFixed(2).replace(/0$/, '');
  let body;
  if (!f) body = `<div class="small muted">เก็บข้อมูลการทวนแฟลชการ์ดแล้ว <b>${S.rev.length}/${FIT_MIN}</b> ครั้ง · ครบแล้วแอปจะคำนวณว่าความจำของคุณอยู่ได้นานกว่าหรือสั้นกว่าค่ามาตรฐานของ FSRS</div>`;
  else {
    const near = Math.abs(f.k - 1) < 0.1, pct = Math.round(Math.abs(f.k / cur - 1) * 100);
    const what = near ? '✅ ใกล้ค่ามาตรฐาน: ตารางทบทวนเดิมเข้ากับความจำของคุณดีแล้ว'
      : f.k > 1 ? `📈 คุณจำได้นานกว่าค่ามาตรฐาน (ทำนายไว้ ${Math.round(f.pred * 100)}% แต่จำได้จริง ${Math.round(f.actual * 100)}%)`
      : `📉 คุณลืมเร็วกว่าค่ามาตรฐาน (ทำนายไว้ ${Math.round(f.pred * 100)}% แต่จำได้จริง ${Math.round(f.actual * 100)}%)`;
    const effect = Math.abs(f.k - cur) < 0.05 ? '' : f.k > cur ? `ใช้ค่านี้แล้วรอบทวนจะห่างขึ้น (ราว ${pct}% ในระยะยาว) ทวนน้อยลงโดยความจำยังได้ตามเป้า` : `ใช้ค่านี้แล้วรอบทวนจะถี่ขึ้น (ราว ${pct}% ในระยะยาว) จำได้ตามเป้ามากขึ้น`;
    body = `<div class="fsk-k"><b>${x(f.k)}</b> <span class="muted small">ความจำของคุณเทียบค่ามาตรฐาน (จาก ${f.n} ครั้งที่ทวน)</span></div>
      <div class="small">${what}</div>${effect ? `<div class="small muted">${effect}</div>` : ''}
      ${Math.abs(f.k - cur) >= 0.05 && !(near && cur === 1) ? `<button class="btn primary" data-fsk="${f.k}" style="margin-top:8px">ใช้ ${x(f.k)}</button>` : ''}`;
  }
  return `<div class="fsk-box" id="fskBox"><b>🧠 ตารางทบทวนเฉพาะตัว</b> ${cur !== 1 ? `<span class="small muted">· ตอนนี้ใช้ ${x(cur)}</span>` : ''}
    ${body}${cur !== 1 ? `<button class="btn" data-fsk="1" style="margin-top:8px">กลับไปใช้ค่ามาตรฐาน</button>` : ''}</div>`;
}
view.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fsk]'); if (!b) return;
  S.settings.fsk = +b.dataset.fsk; save();
  toast(S.settings.fsk === 1 ? 'กลับไปใช้ค่ามาตรฐานแล้ว' : `🧠 ใช้ตารางเฉพาะตัว ×${S.settings.fsk} แล้ว มีผลกับการทวนครั้งถัดไปของแต่ละคำ`);
  const box = $('#fskBox'); if (box) box.outerHTML = fskBox();
});

function renderStats() {
  takeSnap();
  const h = habits();
  const { rate, measured } = learnRate(h);
  const snap = S.snap[today()];
  const W_ = Math.max(280, (viewW || view.clientWidth) - 68); // first draw only: paintChart() redraws at the real width (1.155.1: no forced layout here)
  // The main lists first (1.246): 3000 and 5000 (= 3000 + the 5000-only words); the extra word groups get one small card below.
  const s5 = snap5(snap), n5 = in5000().size;
  const sets = [
    { name: 'ชุด 3000 คำ', total: in3000().size, l: snap[0], m: snap[1] },
    { name: 'ชุด 5000 คำ', sub: 'รวม 3000 คำ', total: n5, l: s5[0], m: s5[1] },
  ];
  const ext = { total: GROUPS_X.reduce((t, x) => t + x.n, 0), // every extra group, loaded this start or not (1.253)
    l: Math.max(0, snap[2] - s5[0]), m: Math.max(0, snap[3] - s5[1]) };
  const etaCard = (st) => {
    const d = etaDays(st.total, st.l, rate, h);
    const pl = st.l / st.total * 100, pm = st.m / st.total * 100;
    const when = st.m >= st.total ? '🎉 จำได้ครบแล้ว!'
      : d == null ? 'เริ่มเล่นสักสองสามวัน แล้วแอปจะคาดการณ์ให้'
      : `คาดว่าจำได้ครบราว <b>${thDate(Date.now() + d * DAY)}</b> <span class="muted">(อีก ~${durTxt(d)})</span>`;
    return `<div class="card-box">
      <div class="row" style="justify-content:space-between"><b>${st.name}</b><span class="small muted">${st.sub ? st.sub + ' · ' : ''}${st.total.toLocaleString()} คำ</span></div>
      <div class="bar eta-bar" style="margin:10px 0 6px"><div class="l" style="width:${pl}%"></div><div class="m" style="width:${pm}%"></div></div>
      <div class="small muted"><span class="key m"></span>จำได้แล้ว ${st.m.toLocaleString()} (${pm.toFixed(0)}%) &nbsp; <span class="key l"></span>เรียนแล้ว ${st.l.toLocaleString()} (${pl.toFixed(0)}%)</div>
      <div style="margin-top:10px">${when}</div></div>`;
  };
  const opts = [10, 20, 30, 50];
  if (!opts.includes(newGoal())) opts.push(newGoal()), opts.sort((a, b) => a - b);
  const ratio = h.ratio || 1;
  const whatIf = opts.map((n) => {
    const r = n === newGoal() && rate > 0 ? rate : n * ratio; // current setting: same rate as the cards above
    const e3 = etaDays(in3000().size, snap[0], r, { ...h, ratio }), e5 = etaDays(n5, s5[0], r, { ...h, ratio });
    const cell = (e, m, t) => (m >= t ? '✓ ครบแล้ว' : `${durTxt(e)}`);
    return `<tr class="${n === newGoal() ? 'cur' : ''}"><td>${n}${n === newGoal() ? ' (ตอนนี้)' : ''}</td><td>${cell(e3, snap[1], in3000().size)}</td><td>${cell(e5, s5[1], n5)}</td><td>~${n * 5}</td></tr>`;
  }).join('');

  const lvRow = (l) => {
    const ws = W.filter((w) => w.g === l);
    const learned = ws.filter((w) => S.prog[w.w]).length;
    const mastered = ws.filter((w) => status(w) === 'mastered').length;
    return `<div class="lvl-row lv-${l}">${lvBadge(l)}
      <div class="grow"><div class="bar"><div class="l" style="width:${learned / ws.length * 100}%"></div><div class="m" style="width:${mastered / ws.length * 100}%"></div></div>
      <div class="small muted" style="margin-top:4px">เรียนแล้ว ${learned} · จำได้ ${mastered} / ${ws.length}</div></div></div>`;
  };
  // Levels being studied (or with progress) show; the rest fold away so a new learner doesn't face a wall of empty bars (1.134).
  const lvOn = (l) => S.settings.levels.includes(l) || W.some((w) => w.g === l && S.prog[w.w]);
  const lvSet = (name, sub, ls, top) => { const on = ls.filter(lvOn); return on.length ? `<div class="small muted" style="margin-top:${top}px"><b>${name}</b> (${sub})</div>${on.map(lvRow).join('')}` : ''; };
  // 1.246: only the 3000 / 5000 levels show open; the extra groups fold into one row (started ones first).
  const lvRest = [...LEVELS_3000, ...LEVELS_5000].filter((l) => !lvOn(l));
  const exOn = LEVELS_EXTRA.filter(lvOn), exOff = LEVELS_EXTRA.filter((l) => !lvOn(l));
  // 1.253: extra groups being studied show open under their own heading; the rest fold into one row, the ones whose words are
  // not loaded this start (js/groups.js) as name chips that open settings.
  const exIdle = GROUPS_X.filter((x) => !GX_ON.has(x.g));
  const exRows = (exOn.length ? `<div class="small muted" style="margin-top:12px"><b>📚 ชุดเสริมที่เรียนอยู่</b> (${exOn.length} หมวด)</div>${exOn.map(lvRow).join('')}` : '')
    + `<details class="lv-more lv-extra"><summary>📚 ชุดเสริม${exOn.length ? 'อื่น' : ''} ${exOff.length + exIdle.length} หมวด · เรียนแล้ว ${ext.l.toLocaleString()} · จำได้ ${ext.m.toLocaleString()} / ${ext.total.toLocaleString()}</summary>`
    + `${exOff.map(lvRow).join('')}${exIdle.length ? `<div class="small muted" style="margin-top:8px">ยังไม่ได้เปิดใช้ · เลือกได้ใน ⚙️ ตั้งค่า</div><div class="chips" style="margin-top:6px">${exIdle.map((x) => `<button class="chip ex-idle" data-go="settings">${x.icon} ${x.name} · ${x.n}</button>`).join('')}</div>` : ''}</details>`;
  const lvRows = lvSet('ชุด 3000 คำ', 'คำหลัก', LEVELS_3000, 8) + lvSet('ชุด 5000 คำ', 'คำเพิ่มเติม', LEVELS_5000, 12)
    + (lvRest.length ? `<details class="lv-more"><summary>ระดับอื่นที่ยังไม่ได้เริ่ม (${lvRest.map((l) => LV_LABEL[l]).join(' · ')})</summary>${lvRest.map(lvRow).join('')}</details>` : '')
    + exRows;

  view.innerHTML = `
    ${starterCard()}
    ${statNav()}
    ${statSum(snap, rate, h)}
    ${levelCard()}
    <div id="todayHost">${todayCard()}</div>
    ${weekCmpCard()}
    ${memNowCard()}
    <div class="h2">นิสัยการเล่น <span class="small muted">${h.span} วันล่าสุด</span></div>
    <div class="tiles">
      <div class="tile-s"><b>${h.active}<small>/${h.span}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.cards / h.active) : 0}</b><span>แฟลชการ์ด/วัน</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.games / h.active) : 0}</b><span>ข้อเกม/วัน</span></div>
      <div class="tile-s"><b>${Math.round(h.acc * 100)}<small>%</small></b><span>ตอบถูก</span></div>
    </div>
    <div class="card-box"><div class="small muted" style="margin-bottom:6px">กิจกรรมต่อวัน แยกตามประเภท (แตะแท่งเพื่อดูรายละเอียดวันนั้น)</div><div class="chart-host" data-chart="act">${activityChart(W_)}</div></div>
    <div class="h2">⏱️ ใช้เวลากับอะไรบ้าง</div>
    <div class="card-box" id="actBox">${actBreakdown()}</div>
    ${recordsCard()}
    ${hourAccCard()}
    ${growthCard()}
    ${monthMastCard()}
    <div id="readyHost"></div>
    <div class="h2">ความคืบหน้าแต่ละระดับ</div>
    <div class="card-box">${lvRows}
      <div class="small muted" style="margin-top:8px"><span class="key bl"></span>เรียนแล้ว &nbsp; <span class="key bm"></span>จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div></div>
    <div class="h2">🌳 ป่าคำศัพท์ <span class="small muted">ชุด 5000</span></div>
    <div class="card-box" data-lz="tree" style="min-height:220px"></div>
    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}${forecast30()}</div>
    ${loadCard()}
    ${retCard()}
    ${memCard()}
    ${lvAccCard()}
    ${weakCard()}
    ${topicAccCard()}
    ${confCard()}
    ${skillMixCard()}
    ${hardCard()}
    ${leechWinCard()}
    ${speedCard()}
    ${dirCard()}
    ${heardCard()}
    ${typoCard()}
    ${skillCard()}
    ${toeicCard()}
    ${readSpeedCard()}
    ${quitCard()}
    ${deviceCard()}
    ${moodCard()}
    ${smissCard()}
    <div class="h2">🗓️ ปฏิทินการเล่น 12 เดือน</div>
    <div class="card-box" data-lz="heat" style="min-height:200px"></div>

    ${boardSection()}
    <div class="h2">สรุปรายสัปดาห์</div>
    <div class="card-box"><b>สัปดาห์นี้</b>${weekBox(0)}</div>
    <div class="card-box"><b>สัปดาห์ที่แล้ว</b>${weekBox(1)}</div>
    <div class="h2">สรุปรายเดือน</div>
    <div class="card-box"><b>เดือนนี้</b>${monthBox(0)}</div>
    ${monthStats(1).total ? `<div class="card-box"><b>เดือนที่แล้ว</b>${monthBox(1)}</div>` : ''}
    ${vsCard()}
    ${journeyCard()}

    <div class="h2">📝 แบบทดสอบประจำเดือน</div>
    <div class="card-box">${mtestSummary()}<button class="btn primary block" data-go="mtest" style="margin-top:10px">${S.mtest[monthKey()] ? 'ทำอีกครั้ง' : 'ทำแบบทดสอบเดือนนี้'}</button></div>

    <div class="card-box row share-row"><button class="btn primary" id="shareProg">📤 แชร์ความก้าวหน้า</button><button class="btn" id="statCsv">📊 ส่งออกสถิติ CSV</button><button class="btn" data-go="year" data-year="${yearToShow() || new Date().getFullYear()}">🎊 สรุปปี</button></div>
    <div class="h2">🎓 ทดสอบจบระดับ</div>
    ${levelTestBox()}

    <div class="h2">แนวโน้มคำศัพท์ <span class="small muted">ชุด 5000</span></div>
    <div class="card-box chart-host" data-lz="trend" data-chart="trend" style="min-height:260px"></div>

    <div class="h2">คาดการณ์ว่าจะจำได้ครบเมื่อไร</div>
    ${rate > 0 ? `<p class="small muted" style="margin:-4px 4px 10px">คิดจากที่เรียนคำใหม่ได้ราว <b>${rate.toFixed(1)} คำ/วัน</b>${measured ? ' (วัดจากความคืบหน้าจริง)' : ` (ประมาณจากเป้า ${newGoal()} คำ × เล่น ${h.active}/${h.span} วัน)`} และความแม่นยำ ${Math.round(h.acc * 100)}%</p>` : ''}
    ${sets.map(etaCard).join('')}
    <div class="card-box ext-box"><div class="row" style="justify-content:space-between"><b>📚 ชุดเสริม</b><span class="small muted">${GROUPS_X.length} หมวด · ${ext.total.toLocaleString()} คำ</span></div>
      <div class="small muted" style="margin-top:6px">TOEIC วิชาการ ธุรกิจ IT ฯลฯ ไม่นับรวมใน 3000/5000 · เรียนแล้ว ${ext.l.toLocaleString()} · จำได้แล้ว ${ext.m.toLocaleString()} คำ</div></div>

    <div class="h2">ถ้าปรับจำนวนคำใหม่ต่อวัน</div>
    <div class="card-box">
      <table class="g-table whatif"><tr><th>คำใหม่/วัน</th><th>ครบ 3000</th><th>ครบ 5000</th><th>ทบทวน/วัน</th></tr>${whatIf}</table>
      <div class="small muted" style="margin-top:8px">คิดจากความถี่ที่เล่นตอนนี้ (${h.active}/${h.span} วัน)${h.ratio < 1 && h.since ? ' ถ้าเล่นทุกวันจะเร็วขึ้นอีก' : ''} · การ์ดทบทวนต่อวันเป็นค่าประมาณเมื่อเรียนไปได้สักระยะ</div>
    </div>
    <p class="small muted center">เป็นการคาดการณ์คร่าวๆ จะแม่นขึ้นเรื่อยๆ เมื่อเล่นไปนานขึ้น</p>
    <div data-lz="stk" style="min-height:260px"></div>
    <div class="h2">🏅 เหรียญรางวัล <span class="small muted">${ACH.filter((a) => S.ach[a.id]).length}/${ACH.length}</span></div>
    <div class="card-box ach-grid" id="ach" data-lz="ach" style="min-height:200px"></div>`;
  loadStories().then(() => { const h = $('#readyHost'); if (h) h.innerHTML = readyBox() + readStatsBox(); });
  bindToday();
  bindMore();
  { const mb = $('#memBox'); if (mb) mb.onclick = (e) => { const b = e.target.closest('[data-wsi]'); if (b && W[+b.dataset.wsi]) openSheet(W[+b.dataset.wsi]); }; }
  $('#shareProg').onclick = shareProgress;
  { const wk = $('#weak'); if (wk) wk.onclick = (e) => { const b = e.target.closest('[data-weak]'); if (b) weakGo(b.dataset.weak); }; }
  countUp(view.querySelectorAll('.tile-s b'));
  view.querySelectorAll('[data-lt]').forEach((b) => { b.onclick = () => go('ltest', b.dataset.lt); });
  startLazy({
    heat: [yearHeatmap, bindHeatmap],
    tree: [treeBox, paintTree],
    trend: [(el) => { el.dataset.w = hostW(el); return trendChart(+el.dataset.w); }, bindTrend],
    stk: [stickerBook, bindStickers],
    ach: [() => ACH.map((a) => { const hid = a.secret && !S.ach[a.id], t = medalTier(a), fresh = typeof S.ach[a.id] === 'string' && dayDiff(today(), S.ach[a.id]) <= 3;
      return `<button class="ach ${S.ach[a.id] ? 'on' : ''} md-${t}${fresh ? ' fresh' : ''}" data-ach="${a.id}" aria-label="${hid ? 'เหรียญลับ' : esc(a.name)}${S.ach[a.id] ? ` (${MEDAL_NAME[t]})` : ' ยังไม่ได้'}">${medalSvg(t, !!S.ach[a.id])}<span>${hid ? '❓' : a.icon}</span><small>${hid ? 'เหรียญลับ' : a.name}</small></button>`; }).join('')],
  });
  $('#ach').onclick = (e) => {
    const b = e.target.closest('[data-ach]'); if (!b) return;
    const a = ACH.find((x) => x.id === b.dataset.ach);
    toast(a.secret && !S.ach[a.id] ? '❓ เหรียญลับ: ไม่บอกเงื่อนไข ลองเรียนไปเรื่อยๆ แล้วจะเจอเอง' : `${a.icon} ${a.name}: ${a.desc}${S.ach[a.id] ? ' ✅' : ' 🔒'}`);
  };
  bindChartTips();
  bindAct();
  watchCharts();
  sectionize(view, '[data-lz="stk"]');
  statLayout();
  bindStatX();
  bindStatY();
  masonry([view], '.row, .st-nav, .st-sum, .m-sec:has([data-lz="heat"], #ach), [data-lz="stk"]');
  bindStatNav();
}

// Jump bar (1.165.0): the stats page runs to ~11 screens, so a sticky row of chips jumps to each part and lights the one in
// view. Targets are found by their heading's text (the cards come from many functions), a missing one just hides its chip.
const STAT_NAV = [['today', '☀️', 'วันนี้', '#todayHost'], ['habit', '📊', 'นิสัย', 'นิสัยการเล่น'], ['lv', '📈', 'ระดับ', 'ความคืบหน้าแต่ละระดับ'],
  ['mem', '🧠', 'ความจำ', '🧠 ความจำตอนนี้'], ['due', '📅', 'ทบทวน', '📅 การ์ดที่ต้องทบทวน'], ['weak', '🎯', 'จุดอ่อน', '🎯 ความแม่นแยกตามระดับ'], ['deep', '🔬', 'เจาะลึก', '⏱️ ความเร็วและความคล่อง'], ['toeic', '💼', 'TOEIC', '💼 TOEIC'], ['cal', '🗓️', 'ปฏิทิน', '🗓️ ปฏิทินการเล่น'],
  ['sum', '🧾', 'สรุป', 'สรุปรายสัปดาห์'], ['test', '📝', 'ทดสอบ', '📝 แบบทดสอบประจำเดือน'], ['future', '🔮', 'คาดการณ์', 'แนวโน้มคำศัพท์'], ['award', '🏅', 'รางวัล', '🏅 เหรียญรางวัล']];
const statNav = () => `<nav class="st-nav" aria-label="ไปยังหัวข้อในหน้าสถิติ">${STAT_NAV.map(([k, ic, t]) => `<button class="chip" data-sec="${k}"><span aria-hidden="true">${ic}</span> ${t}</button>`).join('')}<button class="chip" id="stLay" aria-expanded="false"><span aria-hidden="true">🧩</span> จัดหน้า</button></nav><div id="stLayBox" hidden></div>`;
function statTargets() {
  const heads = [...view.querySelectorAll('.h2')];
  return STAT_NAV.map(([k, , , f]) => {
    const el = f.startsWith('#') ? view.querySelector(f) : heads.find((h) => h.textContent.trim().startsWith(f));
    const sec = el && (el.closest('.m-sec') || el);
    return [k, sec && !sec.hidden ? sec : null];
  });
}
let jumpSeq = 0;
function bindStatNav() {
  const nav = view.querySelector('.st-nav'); if (!nav) return;
  edgeFade(nav);
  const tg = new Map(statTargets());
  nav.querySelectorAll('[data-sec]').forEach((b) => { if (!tg.get(b.dataset.sec)) b.hidden = true; });
  let lit = '';
  const light = (k) => {
    if (k === lit) return; lit = k;
    nav.querySelectorAll('[data-sec]').forEach((b) => { const on = b.dataset.sec === k; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    const b = nav.querySelector('.on'); if (b) nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
  };
  const topOf = (el) => el.getBoundingClientRect().top - view.getBoundingClientRect().top; // from #view's top edge
  nav.onclick = (e) => {
    const b = e.target.closest('[data-sec]'); const el = b && tg.get(b.dataset.sec); if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const off = () => topOf(el) - nav.offsetHeight - 8;
    view.scrollTo({ top: view.scrollTop + off(), behavior: reduce ? 'auto' : 'smooth' });
    light(b.dataset.sec);
    // parts above load as they scroll into view (calendar, trend, stories): put the heading back under the bar once they have
    const seq = ++jumpSeq;
    [700, 1400].forEach((ms) => setTimeout(() => { if (seq === jumpSeq && el.isConnected && Math.abs(off()) > 4) view.scrollTo({ top: view.scrollTop + off() }); }, ms));
  };
  // the part in view: the last one whose top has passed just under the bar (measured in a frame while scrolling)
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; if (!nav.isConnected) return;
      const line = nav.getBoundingClientRect().bottom - view.getBoundingClientRect().top + 24;
      let k = [...tg].find(([, el]) => el)?.[0] || ''; // above the first part: the first chip
      for (const [key, el] of tg) if (el && el.isConnected && topOf(el) <= line) k = key;
      light(k);
    });
  };
  view.addEventListener('scroll', onScroll, { passive: true });
  const onTouch = () => { jumpSeq++; }; // a finger on the page cancels a pending correction
  view.addEventListener('touchstart', onTouch, { passive: true });
  const prev = cleanup; cleanup = () => { view.removeEventListener('scroll', onScroll); view.removeEventListener('touchstart', onTouch); jumpSeq++; if (prev) prev(); };
}
// Three numbers on top (1.165.0): words remembered, cards due today, and when the 3000 list should be done.
function statSum(snap, rate, h) {
  const due = dueList().length, d = etaDays(in3000().size, snap[0], rate, h);
  const eta = snap[1] >= in3000().size ? '🎉 ครบแล้ว' : d == null ? '–' : `~${durTxt(d)}`;
  return `<div class="st-sum">
      <div><b>${snap5(snap)[1].toLocaleString()}</b><span>🟢 จำได้ (ชุด 5000)</span></div>
      <div><b>${due.toLocaleString()}</b><span>📅 ต้องทวนวันนี้</span></div>
      <div><b>${eta}</b><span>🏁 ครบ 3000 คำ</span></div>
    </div>`;
}

// First days: a friendly card instead of letting the empty charts speak first (1.134). Days played = days with any
// answer in hist; it goes away on the 3rd day played.
function starterCard() {
  const days = Object.keys(S.hist).filter((k) => S.hist[k] > 0).length;
  if (days >= 3) return '';
  const dots = [0, 1, 2].map((k) => `<span class="sc-dot${k < days ? ' on' : ''}">${k < days ? '✓' : k + 1}</span>`).join('');
  return `<div class="card-box starter-card">
    <div class="sc-pic" aria-hidden="true">${mascotSvg({ mood: days ? 'happy' : 'normal', size: 76 })}</div>
    <div class="grow"><b>${days ? 'เริ่มได้สวยเลย!' : 'ยินดีต้อนรับสู่หน้าสถิติ'}</b>
      <div class="small muted" style="margin-top:4px">เล่นให้ครบ 3 วัน แล้วกราฟ ปฏิทิน และวันคาดว่าจะจำได้ครบจะเริ่มมีข้อมูลให้ดูนะ</div>
      <div class="sc-dots" role="img" aria-label="เล่นแล้ว ${days} จาก 3 วัน">${dots}</div></div></div>`;
}

// Heavy blocks below the fold (calendar, trend chart, stickers, medals) are drawn when they come within 300px of the
// screen, or a moment after the page is up, one block per tick, so the stats page opens fast (1.71).
let lazyIO = null, lazyTimer = 0;
function startLazy(defs) {
  if (lazyIO) lazyIO.disconnect();
  clearTimeout(lazyTimer);
  const els = [...view.querySelectorAll('[data-lz]')];
  const fill = (el) => {
    const d = defs[el.dataset.lz];
    if (!d || el.dataset.done || !el.isConnected) return;
    el.dataset.done = '1'; el.style.minHeight = '';
    el.innerHTML = d[0](el);
    if (d[1]) d[1](el);
  };
  if ('IntersectionObserver' in window) {
    lazyIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { lazyIO.unobserve(e.target); fill(e.target); } }), { root: view, rootMargin: '300px 0px' });
    els.forEach((el) => lazyIO.observe(el));
  }
  const rest = () => { const el = els.find((x) => !x.dataset.done && x.isConnected); if (el) { fill(el); lazyTimer = setTimeout(rest, 120); } };
  lazyTimer = setTimeout(rest, 400);
}

/* ---------- more stats (1.160.0) ---------- */
// Totals over the days k0..k1 ago (inclusive): answers from hist, and what S.act logged (time, right answers, games).
function actRange(k0, k1) {
  const r = { hist: 0, days: 0, logged: 0, n: 0, sec: 0, ok: 0, jd: 0, g: {} };
  for (let k = k0; k <= k1; k++) {
    const key = dayKey(k), hv = S.hist[key] || 0, a = actDay(key);
    r.hist += hv; if (hv) r.days++;
    if (!a) continue;
    r.logged++; r.n += a.n; r.sec += a.sec; r.ok += a.ok; r.jd += a.jd;
    for (const [id, v] of Object.entries(a.x.g || {})) { const t = r.g[id] || (r.g[id] = [0, 0, 0, 0]); v.forEach((y, i) => { t[i] += y; }); }
  }
  return r;
}
// Words learned between k1 and k0 days ago from the daily snapshots (null when either day has none).
const snapGain = (k0, k1) => { const a = S.snap[dayKey(k0)], b = S.snap[dayKey(k1)]; return a && b ? Math.max(0, a[2] - b[2]) : null; };
function cmpTag(cur, prev, pp) {
  if (cur == null || prev == null || (!pp && !prev && !cur)) return '';
  const d = pp ? Math.round(cur - prev) : prev ? Math.round((cur - prev) / prev * 100) : null;
  if (d == null) return cur ? '<span class="cmp up">ใหม่</span>' : '';
  if (!d) return '<span class="cmp">เท่าเดิม</span>';
  return `<span class="cmp ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${pp ? ' จุด' : '%'}</span>`;
}
// 📊 This week (last 7 days) against the 7 days before.
function weekCmpCard() {
  const c = actRange(0, 6), p = actRange(7, 13);
  if (!c.hist && !p.hist) return '';
  const acc = (r) => (r.jd ? r.ok / r.jd * 100 : null);
  const tiles = [
    ['วันที่เล่น', `${c.days}<small>/7</small>`, c.days, p.days, `${p.days} วัน`],
    ['ข้อที่ทำ', c.hist.toLocaleString(), c.hist, p.hist, `${p.hist.toLocaleString()} ข้อ`],
    ['เวลาฝึก', c.logged ? minTxt(c.sec) : '–', c.logged ? c.sec : null, p.logged ? p.sec : null, p.logged ? minTxt(p.sec) : '–'],
    ['ตอบถูก', acc(c) == null ? '–' : Math.round(acc(c)) + '%', acc(c), acc(p), acc(p) == null ? '–' : Math.round(acc(p)) + '%', true],
    ['คำใหม่', snapGain(0, 7) == null ? '–' : snapGain(0, 7).toLocaleString(), snapGain(0, 7), snapGain(7, 14), snapGain(7, 14) == null ? '–' : snapGain(7, 14).toLocaleString() + ' คำ'],
  ];
  return `<div class="h2">📊 7 วันนี้ เทียบ 7 วันก่อน</div><div class="card-box"><div class="cmp-grid">${tiles.map(([l, v, cur, prev, pv, pp]) => `<div><span class="small muted">${l}</span><b>${v}</b><small class="muted">ก่อนหน้า ${pv}</small>${cmpTag(cur, prev, pp)}</div>`).join('')}</div></div>`;
}
// 🏆 Personal bests.
function recordsCard() {
  const hk = Object.keys(S.hist).filter((k) => S.hist[k] > 0).sort();
  if (!hk.length) return '';
  const busy = hk.reduce((b, k) => (S.hist[k] > S.hist[b] ? k : b), hk[0]);
  let run = 0, best = 0, prev = '';
  for (const k of hk) { run = prev && dayDiff(k, prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  let longDay = ['', 0], longSit = 0;
  for (const [k, d] of Object.entries(S.act)) { const a = actDay(k); if (a && a.sec > longDay[1]) longDay = [k, a.sec]; if (d.x && d.x.ss) longSit = Math.max(longSit, d.x.ss[1]); }
  const xpw = Object.entries(S.xpWeek || {}).sort((a, b) => b[1] - a[1])[0];
  const dt = (k) => thDate(Date.parse(k + 'T12:00:00'));
  const rows = [
    ['📅', 'วันที่ทำเยอะที่สุด', `${S.hist[busy].toLocaleString()} ข้อ`, dt(busy)],
    ['🔥', 'เล่นติดกันนานที่สุด', `${best} วัน`, `ตอนนี้ ${streakNow()} วัน`],
    longDay[1] ? ['⏱️', 'ฝึกนานที่สุดในวันเดียว', minTxt(longDay[1]), dt(longDay[0])] : null,
    longSit ? ['🪑', 'นั่งเล่นรอบยาวที่สุด', minTxt(longSit), ''] : null,
    S.counts.maxCombo ? ['⚡', 'คอมโบสูงสุด', `${S.counts.maxCombo} ข้อติด`, ''] : null,
    xpw && xpw[1] ? ['⭐', 'XP มากที่สุดในสัปดาห์', `${xpw[1].toLocaleString()} XP`, `สัปดาห์ ${dt(xpw[0])}`] : null,
    S.tower && S.tower.best ? ['🗼', 'หอคอยชั้นสูงสุด', `ชั้น ${S.tower.best}`, ''] : null,
  ].filter(Boolean);
  return `<div class="h2">🏆 สถิติสูงสุดของฉัน</div><div class="card-box rec-grid">${rows.map(([ic, l, v, sub]) => `<div><span class="rec-ic" aria-hidden="true">${ic}</span><span class="small muted">${l}</span><b>${v}</b>${sub ? `<small class="muted">${sub}</small>` : ''}</div>`).join('')}</div>`;
}
// 🧠 How long the learned words are expected to last (interval buckets), and words one review away from "จำได้แล้ว".
const MEM_BUCKETS = [[0, 7, 'กำลังจำ', 'น้อยกว่า 7 วัน'], [7, 16, 'ระยะสั้น', '1–2 สัปดาห์'], [16, 90, 'จำได้แล้ว', '16 วัน–3 เดือน'], [90, Infinity, 'ระยะยาว', '3 เดือนขึ้นไป']];
function memCard() {
  const cnt = [0, 0, 0, 0], near = [];
  for (const w of W) {
    const p = S.prog[w.w]; if (!p) continue;
    const i = ivlOf(p), b = MEM_BUCKETS.findIndex(([lo, hi]) => i >= lo && i < hi);
    cnt[b < 0 ? 0 : b]++;
    if (i >= 7 && i < 16) near.push([w, p.d]);
  }
  const tot = cnt.reduce((a, b) => a + b, 0);
  if (!tot) return '';
  near.sort((a, b) => a[1] - b[1]);
  const dIn = (ms) => { const d = Math.ceil((ms - Date.now()) / DAY); return d <= 0 ? 'ถึงกำหนดแล้ว' : `อีก ${d} วัน`; };
  return `<div class="h2">🧠 คำที่เรียนแล้วจำได้นานแค่ไหน</div><div class="card-box" id="memBox">
    <div class="mem-bar" role="img" aria-label="${MEM_BUCKETS.map((m, i) => `${m[2]} ${cnt[i]} คำ`).join(', ')}">${cnt.map((n, i) => (n ? `<i class="mem-${i}" style="flex:${n}"></i>` : '')).join('')}</div>
    <div class="legend">${MEM_BUCKETS.map((m, i) => `<span><i class="mem-${i}"></i>${m[2]} <b>${cnt[i].toLocaleString()}</b> <span class="muted">(${m[3]})</span></span>`).join('')}</div>
    ${near.length ? `<div class="act-h">🎯 ใกล้จำได้แล้ว <span class="small muted">ทวนผ่านอีกครั้งตอนถึงกำหนดก็เข้าเกณฑ์ (${near.length} คำ)</span></div>
      <div class="near-list">${near.slice(0, 12).map(([w, d]) => `<button class="chip" data-wsi="${W.indexOf(w)}"><span lang="en">${esc(w.w)}</span> <small class="muted">${dIn(d)}</small></button>`).join('')}</div>` : ''}
    <div class="small muted" style="margin-top:8px">แบ่งตามระยะห่างก่อนการทวนครั้งถัดไป ยิ่งห่างยิ่งแปลว่าจำได้แน่น</div></div>`;
}
// 📚 Stories read per level, with the average best score.
function readStatsBox() {
  if (!STORIES || !STORIES.length) return '';
  const lv = {}, recent = Object.values(S.read).filter((d) => typeof d === 'string' && dayDiff(today(), d) < 28).length;
  for (const st of STORIES) {
    const r = lv[st.level] || (lv[st.level] = { n: 0, read: 0, sc: [0, 0] });
    r.n++;
    if (S.read[st.id]) { r.read++; const sc = S.readScore[st.id]; if (Array.isArray(sc) && sc[1]) { r.sc[0] += sc[0]; r.sc[1] += sc[1]; } }
  }
  const all = Object.values(lv).reduce((a, r) => [a[0] + r.read, a[1] + r.n, a[2] + r.sc[0], a[3] + r.sc[1]], [0, 0, 0, 0]);
  if (!all[0]) return '';
  const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].filter((l) => lv[l]);
  return `<div class="card-box"><b>📚 เรื่องสั้นที่อ่านแล้ว</b>
    <div class="small" style="margin:4px 0 6px">อ่านแล้ว <b>${all[0]}</b>/${all[1]} เรื่อง${all[3] ? ` · ตอบคำถามถูกเฉลี่ย <b>${aPct(all[2], all[3])}%</b>` : ''} · 28 วันล่าสุด ${recent} เรื่อง</div>
    ${order.map((l) => { const r = lv[l]; return `<div class="act-row"><span class="act-n">${LV_LABEL[l] || l}</span><span class="act-bar"><i class="a-any" style="width:${Math.round(r.read / r.n * 100)}%"></i></span><span class="act-v">${r.read}/${r.n}<small>${r.sc[1] ? `ถูก ${aPct(r.sc[0], r.sc[1])}%` : 'ยังไม่ได้อ่าน'}</small></span></div>`; }).join('')}</div>`;
}
// Daily time goal (1.160.0): settings.minutes (study budget, set in settings) or settings.timeGoal (set here; only a goal).
const TIME_GOALS = [0, 10, 15, 20, 30, 45];
const timeGoal = () => (S.settings.minutes | 0) || (S.settings.timeGoal | 0);
function goalRing(sec) {
  const g = timeGoal(); if (!g) return '';
  const f = Math.min(1, sec / 60 / g), done = f >= 1;
  return `<div class="tg-ring${done ? ' done' : ''}" style="--f:${f}" role="img" aria-label="เป้าเวลาวันนี้ ${g} นาที ทำไปแล้ว ${Math.round(sec / 60)} นาที"><b>${done ? '✓' : Math.round(f * 100) + '%'}</b><small>${Math.round(sec / 60)}/${g} นาที</small></div>`;
}
/* ---------- even more stats (1.161.0) ---------- */
// 🐢 Hardest words: most wrong answers (2+), with accuracy and a button to practise them.
function hardWords() {
  return W.map((w) => [w, S.prog[w.w]]).filter(([, p]) => p && (p.x || 0) >= 2)
    .sort((a, b) => (b[1].x - a[1].x) || ((a[1].c / a[1].s) - (b[1].c / b[1].s))).slice(0, 10);
}
function hardCard() {
  const l = hardWords();
  if (!l.length) return '';
  return `<div class="h2">🐢 คำที่จำยากที่สุด</div><div class="card-box" id="hardBox">
    ${l.map(([w, p]) => `<button class="hard-row" data-wsi="${W.indexOf(w)}"><span class="grow"><b lang="en">${esc(w.w)}</b> <span class="small muted">${esc(w.t)}</span></span><span class="small muted">ผิด ${p.x} ครั้ง · ถูก ${aPct(p.c, p.s)}%</span></button>`).join('')}
    <button class="btn primary block" id="hardGo" style="margin-top:10px">🎯 ฝึกคำพวกนี้</button></div>`;
}
// 🎯 Accuracy per level from every answer ever given (prog: seen / correct).
function lvAccCard() {
  const rows = LEVELS.map((l) => { let s = 0, c = 0, n = 0; for (const w of W) { if (w.g !== l) continue; const p = S.prog[w.w]; if (p && p.s) { s += p.s; c += p.c || 0; n++; } } return [l, s, c, n]; }).filter((r) => r[1] >= 5);
  if (!rows.length) return '';
  return `<div class="h2">🎯 ความแม่นแยกตามระดับ</div><div class="card-box">${rows.map(([l, s, c, n]) => `<div class="act-row"><span class="act-n">${lvBadge(l)}</span><span class="act-bar"><i class="a-any" style="width:${aPct(c, s)}%"></i></span><span class="act-v">${aPct(c, s)}%<small>${s.toLocaleString()} ครั้ง · ${n.toLocaleString()} คำ</small></span></div>`).join('')}
    <div class="small muted" style="margin-top:8px">นับทุกครั้งที่เจอคำในแต่ละระดับ ทั้งแฟลชการ์ดและเกม</div></div>`;
}
// ⭐ XP per week (S.xpWeek, last 12 Mondays) and 🌱 words started per day (snapshots, last 28 days).
function growthCard() {
  const mons = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.parse(mondayKey() + 'T12:00:00') - (11 - i) * 7 * DAY); return ymd(d); });
  const xp = mons.map((m) => S.xpWeek[m] || 0);
  const nw = Array.from({ length: 28 }, (_, i) => { const k = 27 - i; const g = snapGain(k, k + 1); return g == null ? 0 : g; });
  const hasN = nw.some((v) => v), hasX = xp.some((v) => v);
  if (!hasN && !hasX) return '';
  const md = (k) => thDate(Date.parse(k + 'T12:00:00'));
  const nwSum = nw.reduce((a, b) => a + b, 0);
  return `<div class="h2">🌱 การเติบโต</div><div class="card-box" id="growBox">
    ${hasN ? `<div class="act-h" style="margin-top:0">🌱 คำใหม่ที่เริ่มเรียนต่อวัน <span class="small muted">28 วัน รวม ${nwSum.toLocaleString()} คำ · เฉลี่ย ${(nwSum / 28).toFixed(1)}/วัน</span></div>
      ${miniBars(nw, nw.map((v, i) => (i === 27 ? 'วันนี้' : `${27 - i}`)), nw.map((v, i) => `${md(dayKey(27 - i))} · ${v} คำใหม่`), 7)}` : ''}
    ${hasX ? `<div class="act-h">⭐ XP รายสัปดาห์ <span class="small muted">12 สัปดาห์ · สัปดาห์นี้ ${xp[11].toLocaleString()} XP</span></div>
      ${miniBars(xp, mons.map((m) => md(m).replace(/ \d+$/, '')), mons.map((m, i) => `สัปดาห์ ${md(m)} · ${xp[i].toLocaleString()} XP`), 3)}` : ''}</div>`;
}
// 📅 Reviews due over the next 30 days (the 7-day box above stays as it is).
function forecast30() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const n = Array(30).fill(0);
  for (const w of W) { const p = S.prog[w.w]; if (!p) continue; const k = Math.max(0, Math.floor((p.d - start.getTime()) / DAY)); if (k < 30) n[k]++; }
  if (!n.some((v) => v)) return '';
  return `<details class="act-more f30"><summary>ดูล่วงหน้า 30 วัน (รวม ${n.reduce((a, b) => a + b, 0).toLocaleString()} ใบ)</summary>
    ${miniBars(n, n.map((v, i) => (i ? `+${i}` : 'วันนี้')), n.map((v, i) => `${thDate(start.getTime() + i * DAY + DAY / 2)} · ${v} ใบ`), 7)}</details>`;
}
// 📤 Daily stats as a CSV file (one row per day with any activity).
function exportStats() {
  const days = [...new Set([...Object.keys(S.hist), ...Object.keys(S.act)])].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  if (!days.length) return toast('ยังไม่มีข้อมูลให้ส่งออก');
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['date', 'answers', 'flashcards', 'minutes', 'judged', 'right', 'app_open_minutes', 'sittings', 'longest_sitting_minutes',
    ...ACT_IDS.flatMap((id) => [`${id}_answers`, `${id}_minutes`]), ...ACT_EVENTS.map((e) => `${e[0]}_count`), 'words_learned_total', 'words_mastered_total', 'top_games'];
  const rows = [head];
  for (const k of days) {
    const a = actDay(k), x = (S.act[k] && S.act[k].x) || {}, sn = S.snap[k] || [];
    const games = Object.entries(x.g || {}).sort((p, r) => r[1][1] - p[1][1]).slice(0, 5).map(([id, v]) => `${id}:${v[0]}`).join(' ');
    rows.push([k, S.hist[k] || 0, S.chist[k] || 0, a ? Math.round(a.sec / 6) / 10 : '', a ? a.jd : '', a ? a.ok : '', x.on ? Math.round(x.on / 6) / 10 : '', x.ss ? x.ss[0] : '', x.ss ? Math.round(x.ss[1] / 6) / 10 : '',
      ...ACT_IDS.flatMap((id) => (a ? [a.by[id], Math.round(a.secBy[id] / 6) / 10] : ['', ''])), ...ACT_EVENTS.map((e) => (x.e && x.e[e[0]]) || ''), sn[2] == null ? '' : sn[2], sn[3] == null ? '' : sn[3], games]);
  }
  exportStats.last = rows;
  const text = '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  saveFile(new File([text], `essential-vocab-stats-${today()}.csv`, { type: 'text/csv' }), 'สถิติรายวันจากศัพท์ต้องรู้').then((ok) => { if (ok) toast(`ส่งออก ${days.length} วันแล้ว ✅`); });
}
function bindMore() {
  const hb = $('#hardBox');
  if (hb) hb.onclick = (e) => {
    const r = e.target.closest('[data-wsi]'); if (r && W[+r.dataset.wsi]) return openSheet(W[+r.dataset.wsi]);
    if (e.target.closest('#hardGo')) { customWords = hardWords().map(([w]) => w); if (customWords.length < 4) customWords = [...new Set(customWords.concat(pool().filter((w) => S.prog[w.w]), pool().slice(0, 10)))].slice(0, 12); gameSource = 'custom'; startGame(pick(['en2th', 'th2en', 'listen'])); }
  };
  const gb = $('#growBox'), f30 = view.querySelector('.f30'), ex = $('#statCsv');
  [gb, f30].forEach((el) => { if (el) el.onclick = (e) => { const b = e.target.closest('.mb-b'); if (b) toast(b.dataset.tip); }; });
  if (ex) ex.onclick = exportStats;
  const tb = $('#toeicBox');
  if (tb) tb.onclick = (e) => { if (e.target.closest('#toeicEar')) return playToeicEar(); if (e.target.closest('#toeicHub')) return go('toeic', 'stats'); const b = e.target.closest('[data-tgo]'); if (b) startGame(b.dataset.tgo); };
}

// Today at a glance (1.159.0; 1.160.0 adds the time-goal ring): from S.act / S.hist, shown above the habits.
function todayCard() {
  const t = today(), a = actDay(t), x = (S.act[t] && S.act[t].x) || {}, all = S.hist[t] || 0;
  const kinds = a ? ACT_CATS.filter(([id]) => a.by[id]).sort((p, q) => a.secBy[q[0]] - a.secBy[p[0]]) : [];
  const set = S.settings.minutes | 0;
  const chips = set ? `<div class="small muted" style="margin-top:8px">เป้า ${set} นาที มาจาก ⚙️ ตั้งค่า → เวลาเรียนต่อวัน</div>`
    : `<div class="chips trend-range tg-chips" role="group" aria-label="เป้าเวลาต่อวัน"><span class="small muted">เป้าเวลาต่อวัน</span>${TIME_GOALS.map((m) => `<button class="chip${(S.settings.timeGoal | 0) === m ? ' on' : ''}" data-tg="${m}" aria-pressed="${(S.settings.timeGoal | 0) === m}">${m ? m + ' นาที' : 'ปิด'}</button>`).join('')}</div>`;
  return `<div class="h2">☀️ วันนี้</div>
    <div class="card-box today-act"><div class="today-top">${goalRing(a ? a.sec : 0)}<div class="act-tiles">
      <div><b>${a ? '≈ ' + minTxt(a.sec) : '–'}</b><span>ฝึกจริง</span></div>
      <div><b>${all.toLocaleString()}</b><span>ข้อ</span></div>
      <div><b>${a && a.jd ? aPct(a.ok, a.jd) + '%' : '–'}</b><span>ตอบถูก</span></div>
      <div><b>${x.on ? minTxt(x.on) : '–'}</b><span>เปิดแอป${x.ss ? ` · ${x.ss[0]} รอบ` : ''}</span></div>
    </div></div>${kinds.length ? `<div class="legend">${kinds.map(([id, n]) => `<span><i class="a-${id}"></i>${n} ${a.by[id]}</span>`).join('')}</div>` : ''}${chips}</div>`;
}
function bindToday() {
  const host = $('#todayHost'); if (!host) return;
  host.onclick = (e) => {
    const b = e.target.closest('[data-tg]'); if (!b) return;
    S.settings.timeGoal = +b.dataset.tg; save();
    host.innerHTML = todayCard();
  };
}

// Stacked bars per kind of activity (1.158.0, S.act; ACT_CATS order bottom → top). Days logged before 1.158.0 keep what is known:
// flashcards from chist (since 1.9.0) and the rest in grey. actMetric 'n' = answers, 'sec' = minutes (logged days only).
let actMetric = 'n', actSpan = 7, actDays = 28; // actDays (1.255.0): bars in the activity chart, ACT_DAYS_OPT
const ACT_SHORT = { card: 'การ์ด', feed: 'ไถ', game: 'เกม', skill: 'ทักษะ', read: 'อ่าน/ฟัง', fun: 'สนุก', other: 'อื่นๆ', unk: 'ไม่แยก' };
const minTxt = (sec) => (sec < 60 ? '<1 นาที' : sec < 3600 ? `${Math.round(sec / 60)} นาที` : `${Math.floor(sec / 3600)} ชม. ${Math.round((sec % 3600) / 60)} นาที`);
function actSplit(key) {
  const all = S.hist[key] || 0, a = actDay(key), seg = {};
  if (actMetric === 'sec') { if (a) ACT_IDS.forEach((id) => { seg[id] = a.secBy[id] / 60; }); return { seg, a, all }; }
  if (a) { ACT_IDS.forEach((id) => { seg[id] = a.by[id]; }); seg.unk = Math.max(0, all - a.n); }
  else if (key in S.chist || all === 0 || key >= S.chistFrom) { seg.card = Math.min(all, S.chist[key] || 0); seg.unk = all - seg.card; }
  else seg.unk = all;
  return { seg, a, all };
}
function activityChart(Wd) {
  const n = actDays, big = Wd >= 520, H = big ? 180 : 130, top = 8, bot = big ? 26 : 22, gap = n > 40 ? 1 : big ? 4 : 3;
  const bw = (Wd - gap * (n - 1)) / n, sec = actMetric === 'sec';
  const days = Array.from({ length: n }, (_, i) => { const key = dayKey(n - 1 - i), d = actSplit(key); d.key = key; d.sum = Object.values(d.seg).reduce((x, v) => x + v, 0); return d; });
  const max = Math.max(sec ? 5 : 10, ...days.map((d) => d.sum));
  const y = (v) => (H - bot - top) * v / max;
  const used = new Set(); days.forEach((d) => Object.entries(d.seg).forEach(([k, v]) => { if (v > 0) used.add(k); }));
  const bars = days.map((d, i) => {
    const x = i * (bw + gap); let base = H - bot, out = '';
    for (const id of [...ACT_IDS, 'unk']) {
      const v = d.seg[id]; if (!(v > 0)) continue;
      const hh = Math.max(2, y(v)), last = base - hh;
      out += `<rect class="a-${id}" x="${x}" y="${last}" width="${bw}" height="${Math.max(1, hh - (out ? 2 : 0))}" rx="2"/>`;
      base = last;
    }
    const date = thDate(Date.parse(d.key + 'T12:00:00'));
    const parts = [...ACT_IDS, 'unk'].filter((id) => d.seg[id] > 0).map((id) => `${ACT_SHORT[id]} ${sec ? minTxt(d.a.secBy[id]) : d.seg[id]}`);
    const lab = !d.sum ? `${date}: ${sec && d.all ? 'ยังไม่ได้จับเวลา' : 'ไม่ได้เล่น'}`
      : `${date}: ${sec ? `≈ ${minTxt(d.a.sec)}` : `${d.sum} ข้อ${d.a ? ` · ≈ ${minTxt(d.a.sec)}` : ''}`}${d.a && d.a.jd ? ` · ถูก ${Math.round(d.a.ok / d.a.jd * 100)}%` : ''}&#10;${parts.join(' · ')}`;
    return `${out}<rect class="hit" data-day="${d.key}" data-tip="${lab}" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}"/>`;
  }).join('');
  const ticks = [0, 1, 2, 3, 4].map((q) => Math.round((n - 1) * q / 4)).map((i, q) => `<text class="ax" x="${i * (bw + gap) + bw / 2}" y="${H - 7}" text-anchor="${q === 0 ? 'start' : q === 4 ? 'end' : 'middle'}">${i === n - 1 ? 'วันนี้' : `${n - 1 - i} วันก่อน`}</text>`).join('');
  const sw = `<div class="chips trend-range" role="group" aria-label="แสดงเป็น">${[['n', 'จำนวนข้อ'], ['sec', 'เวลา (นาที)']].map(([id, t]) => `<button class="chip${actMetric === id ? ' on' : ''}" data-am="${id}" aria-pressed="${actMetric === id}">${t}</button>`).join('')}</div>`
    + `<div class="chips trend-range" role="group" aria-label="จำนวนวันในกราฟ">${ACT_DAYS_OPT.map((d) => `<button class="chip${actDays === d ? ' on' : ''}" data-ad="${d}" aria-pressed="${actDays === d}">${d} วัน</button>`).join('')}</div>`;
  const leg = [...ACT_CATS, ['unk', 'ยังไม่แยกประเภท']].filter(([id]) => used.has(id)).map(([id, t]) => `<span><i class="a-${id}"></i>${t}</span>`).join('');
  return `${sw}<div class="chart${big ? ' big' : ''}"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="กิจกรรมต่อวัน ${n} วัน แยกตามประเภท${sec ? ' (นาที)' : ''}">
    <line class="base" x1="0" x2="${Wd}" y1="${H - bot}" y2="${H - bot}"/>${bars}${ticks}</svg><div class="tip" hidden></div></div>
    <div class="legend">${leg || '<span>ยังไม่มีข้อมูล</span>'}</div>`;
}
// What the time went to (1.158.0; 1.159.0 adds right answers, games, hours, weekdays, sittings, app time and other actions):
// totals over the last actSpan days from S.act (weekdays from S.hist, so older days count too). Also the charts' table view.
const aPct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const okTxt = (ok, jd) => (jd ? ` · ถูก ${aPct(ok, jd)}%` : '');
function actName(id) {
  if (typeof GAMES !== 'undefined' && GAMES[id]) return `${GAMES[id].icon} ${GAMES[id].name}`;
  return { other: 'อื่นๆ', home: '🏠 หน้าแรก', list: '📚 คำศัพท์', cards: '🃏 แฟลชการ์ด', feed: '📜 ไถศัพท์', read: '📖 อ่านเรื่องสั้น', games: '🎮 เกม' }[id] || TITLES[id] || id;
}
// Small bar row in HTML (keeps the real text size at every width); a tap tells the numbers.
function miniBars(vals, labs, tips, every) {
  const top = Math.max(1, ...vals);
  return `<div class="mb" role="img" aria-label="${esc(tips.filter((t, i) => vals[i]).join(', ') || 'ยังไม่มีข้อมูล')}">${vals.map((v, i) => `<button class="mb-b" data-tip="${esc(tips[i])}" aria-label="${esc(tips[i])}"><i style="height:${v ? Math.max(3, Math.round(v / top * 100)) : 0}%"></i></button>`).join('')}</div>
    <div class="mb-ax">${labs.map((l, i) => `<span>${i % every === 0 ? l : ''}</span>`).join('')}</div>`;
}
function actBreakdown() {
  const tot = Object.fromEntries(ACT_IDS.map((id) => [id, [0, 0, 0, 0]]));
  const g = {}, h = Array(24).fill(0), ev = {}, wd = Array(7).fill(0);
  let days = 0, n = 0, sec = 0, ok = 0, jd = 0, on = 0, sits = 0, longest = 0;
  for (let k = 0; k < actSpan; k++) {
    const key = dayKey(k), a = actDay(key);
    wd[(new Date(key + 'T12:00:00').getDay() + 6) % 7] += S.hist[key] || 0;
    const x = (S.act[key] && S.act[key].x) || {};
    on += x.on || 0;
    for (const [id, v] of Object.entries(x.e || {})) ev[id] = (ev[id] || 0) + v;
    if (!a) continue;
    days++; n += a.n; sec += a.sec; ok += a.ok; jd += a.jd;
    ACT_IDS.forEach((id) => { const t = tot[id]; t[0] += a.by[id]; t[1] += a.secBy[id]; t[2] += a.jdBy[id]; t[3] += a.okBy[id]; });
    for (const [id, v] of Object.entries(x.g || {})) { const t = g[id] || (g[id] = [0, 0, 0, 0]); v.forEach((y, i) => { t[i] += y; }); }
    (x.h || []).forEach((v, i) => { h[i] += v; });
    if (x.ss) { sits += x.ss[0]; longest = Math.max(longest, x.ss[1]); }
  }
  const chips = `<div class="chips trend-range" role="group" aria-label="ช่วงเวลา">${[7, 28, 90, 365].map((d) => `<button class="chip${actSpan === d ? ' on' : ''}" data-as="${d}" aria-pressed="${actSpan === d}">${d} วัน</button>`).join('')}</div>`;
  if (!n) return `${chips}<div class="small muted">📊 แอปเริ่มเก็บรายละเอียดว่าเล่นอะไรไปเท่าไรตั้งแต่เวอร์ชัน 1.158.0 เล่นสักพักแล้วตัวเลขจะขึ้นตรงนี้</div>`;
  const rows = ACT_CATS.filter(([id]) => tot[id][0]).sort((a, b) => tot[b[0]][1] - tot[a[0]][1]);
  const top = Math.max(...rows.map(([id]) => tot[id][1]), 1);
  const since = Object.keys(S.act).sort()[0];
  const row = (cls, name, v, topV, share, speed) => `<div class="act-row"><span class="act-n">${cls ? `<i class="${cls}"></i>` : ''}${esc(name)}</span>
      <span class="act-bar"><i class="${cls || 'a-any'}" style="width:${Math.max(2, Math.round(v[1] / topV * 100))}%"></i></span>
      <span class="act-v">≈ ${minTxt(v[1])}<small>${v[0].toLocaleString()} ข้อ${share ? ` · ${aPct(v[1], sec)}%` : ''}${okTxt(v[3], v[2])}${speed && v[0] ? ` · ${Math.round(v[1] / v[0])} วิ/ข้อ` : ''}</small></span></div>`;
  // games / pages by time
  const gl = Object.entries(g).sort((a, b) => b[1][1] - a[1][1]), gTop = Math.max(1, ...gl.map((x) => x[1][1]));
  const gRows = (l) => l.map(([id, v]) => row('', actName(id), v, gTop, true, true)).join('');
  // 📈 games whose accuracy rose most against the span before (10+ judged answers in both)
  const prevG = actRange(actSpan, actSpan * 2 - 1).g;
  const up = Object.entries(g).filter(([id, v]) => v[2] >= 10 && prevG[id] && prevG[id][2] >= 10)
    .map(([id, v]) => [id, v[3] / v[2] * 100 - prevG[id][3] / prevG[id][2] * 100, v]).filter((x) => x[1] >= 1).sort((a, b) => b[1] - a[1]).slice(0, 3);
  // hours and weekdays
  const hTips = h.map((v, i) => `${String(i).padStart(2, '0')}:00–${String((i + 1) % 24).padStart(2, '0')}:00 · ${v} ข้อ`);
  const bestH = h.indexOf(Math.max(...h));
  const WD = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'], WDF = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'];
  const bestW = wd.indexOf(Math.max(...wd));
  const evs = ACT_EVENTS.filter(([id]) => ev[id]);
  return `${chips}<div class="act-sum"><b>≈ ${minTxt(sec)}</b> · ${n.toLocaleString()} ข้อ · เล่น ${days} วัน (เฉลี่ยวันละ ≈ ${minTxt(sec / days)})</div>
    <div class="act-tiles">
      <div><b>${jd ? aPct(ok, jd) + '%' : '–'}</b><span>ตอบถูก${jd ? ` (${ok.toLocaleString()}/${jd.toLocaleString()})` : ''}</span></div>
      <div><b>${on ? minTxt(on) : '–'}</b><span>เปิดแอปรวม</span></div>
      <div><b>${sits || '–'}</b><span>รอบที่นั่งเล่น${sits ? ` · เฉลี่ย ≈ ${minTxt(sec / sits)}` : ''}</span></div>
      <div><b>${longest ? minTxt(longest) : '–'}</b><span>รอบที่ยาวที่สุด</span></div>
    </div>
    <div class="act-h">แยกตามประเภท</div>
    <div class="act-rows">${rows.map(([id, t]) => row(`a-${id}`, t, tot[id], top, true)).join('')}</div>
    ${gl.length ? `<div class="act-h">🎯 เล่นอะไรนานที่สุด</div><div class="act-rows">${gRows(gl.slice(0, 6))}</div>
      ${gl.length > 6 ? `<details class="act-more"><summary>ดูอีก ${gl.length - 6} อย่าง</summary><div class="act-rows">${gRows(gl.slice(6))}</div></details>` : ''}` : ''}
    ${up.length ? `<div class="act-h">📈 เก่งขึ้นที่สุด <span class="small muted">% ถูกเทียบกับ ${actSpan} วันก่อนหน้า</span></div><div class="up-list">${up.map(([id, d, v]) => `<div><span>${esc(actName(id))}</span><b>${aPct(v[3], v[2])}%</b><span class="cmp up">▲ ${Math.round(d)} จุด</span></div>`).join('')}</div>` : ''}
    ${h.some((v) => v) ? `<div class="act-h">🕐 ช่วงเวลาที่เล่น <span class="small muted">เยอะสุด ${String(bestH).padStart(2, '0')}:00–${String((bestH + 1) % 24).padStart(2, '0')}:00</span></div>
      ${miniBars(h, h.map((v, i) => String(i)), hTips, 6)}` : ''}
    <div class="act-h">📆 วันในสัปดาห์ <span class="small muted">เยอะสุด${WDF[bestW]}</span></div>
    ${miniBars(wd, WD, wd.map((v, i) => `${WDF[i]} · ${v.toLocaleString()} ข้อ`), 1)}
    ${evs.length ? `<div class="act-h">✨ ทำอะไรอีกบ้าง</div><div class="act-ev">${evs.map(([id, ic, t]) => `<div><span aria-hidden="true">${ic}</span><b>${ev[id].toLocaleString()}</b><small>${t}</small></div>`).join('')}</div>` : ''}
    <div class="small muted" style="margin-top:10px">เวลาเป็นค่าประมาณจากช่วงห่างระหว่างแต่ละข้อ (พักเกิน 2 นาทีนับเป็นรอบใหม่ ข้อแรกหลังพักนับ 8 วินาที) · % ถูก คิดเฉพาะข้อที่ตรวจถูกผิดได้${since > dayKey(actSpan - 1) ? ` · เริ่มเก็บเมื่อ ${thDate(Date.parse(since + 'T12:00:00'))}` : ''}</div>`;
}
function bindAct(root = view) {
  const host = root.querySelector('[data-chart="act"]');
  if (host) host.querySelectorAll('[data-am]').forEach((b) => { b.onclick = () => { actMetric = b.dataset.am; delete host.dataset.w; paintChart(host); }; });
  if (host) host.querySelectorAll('[data-ad]').forEach((b) => { b.onclick = () => { actDays = +b.dataset.ad; delete host.dataset.w; paintChart(host); }; });
  const svg = host && host.querySelector('svg'); // 1.216.0: a tap on a day's bar opens that day's page
  if (svg) svg.onclick = (e) => { const r = e.target.closest('.hit[data-day]'); if (r) go('day', r.dataset.day); };
  const box = root.querySelector('#actBox');
  if (box) {
    box.querySelectorAll('[data-as]').forEach((b) => { b.onclick = () => { actSpan = +b.dataset.as; box.innerHTML = actBreakdown(); bindAct(root); }; });
    box.onclick = (e) => { const b = e.target.closest('.mb-b'); if (b) toast(b.dataset.tip); };
  }
}

/* ---------- day page ---------- */
// One day in detail (1.216.0, route `day`, opened from a bar of the activity chart): totals, kinds, games, hours, other actions,
// words learned / mastered. ‹ › step a day (up to ACT_DAYS back); ‹ กลับ returns to the stats page at the chart.
const WD_FULL = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const daysAgo = (key) => Math.round((Date.parse(today() + 'T12:00:00') - Date.parse(key + 'T12:00:00')) / DAY);
function dayBody(key) {
  const k = daysAgo(key), a = actDay(key), x = (S.act[key] && S.act[key].x) || {}, all = S.hist[key] || 0;
  const cards = S.chist[key] || 0, sn = S.snap[key], prevSn = Object.keys(S.snap).filter((d) => d < key).sort().pop(); // gains vs the last day with a snapshot
  const nw = sn && prevSn ? sn[2] - S.snap[prevSn][2] : null, mst = sn && prevSn ? sn[3] - S.snap[prevSn][3] : null;
  const ev = ACT_EVENTS.filter(([id]) => x.e && x.e[id]);
  if (!all && !a && !ev.length && !x.on) return `<div class="card-box">${emptyArt({ kind: 'empty', title: k ? 'วันนั้นไม่ได้เล่น' : 'วันนี้ยังไม่ได้เล่น', sub: k ? 'ไม่มีการเล่นในวันนั้น ลองดูวันอื่นด้วยปุ่ม ‹ ›' : 'เล่นสักข้อ แล้วรายละเอียดของวันนี้จะขึ้นตรงนี้' })}</div>`;
  const row = (cls, name, v, topV, total) => `<div class="act-row"><span class="act-n">${cls ? `<i class="${cls}"></i>` : ''}${esc(name)}</span>
      <span class="act-bar"><i class="${cls || 'a-any'}" style="width:${Math.max(2, Math.round(v[1] / topV * 100))}%"></i></span>
      <span class="act-v">≈ ${minTxt(v[1])}<small>${v[0].toLocaleString()} ข้อ${total ? ` · ${aPct(v[1], total)}%` : ''}${okTxt(v[3], v[2])}</small></span></div>`;
  let kinds = '', games = '';
  if (a) {
    const rows = ACT_CATS.filter(([id]) => a.by[id]).sort((p, q) => a.secBy[q[0]] - a.secBy[p[0]]);
    const top = Math.max(1, ...rows.map(([id]) => a.secBy[id]));
    kinds = rows.map(([id, t]) => row(`a-${id}`, t, [a.by[id], a.secBy[id], a.jdBy[id], a.okBy[id]], top, a.sec)).join('');
    const gl = Object.entries(x.g || {}).sort((p, q) => q[1][1] - p[1][1]), gTop = Math.max(1, ...gl.map((v) => v[1][1]));
    games = gl.map(([id, v]) => row('', actName(id), v, gTop, a.sec)).join('');
  }
  const unk = Math.max(0, all - (a ? a.n : 0));
  const h = Array.isArray(x.h) ? x.h : [], bestH = h.indexOf(Math.max(...h));
  const tile = (v, t) => `<div><b>${v}</b><span>${t}</span></div>`;
  return `<div class="card-box"><div class="act-tiles day-tiles">
      ${tile(all.toLocaleString(), 'ข้อทั้งหมด')}
      ${tile(a ? '≈ ' + minTxt(a.sec) : '–', 'ฝึกจริง')}
      ${tile(a && a.jd ? aPct(a.ok, a.jd) + '%' : '–', `ตอบถูก${a && a.jd ? ` (${a.ok}/${a.jd})` : ''}`)}
      ${tile(cards ? cards.toLocaleString() : '–', 'แฟลชการ์ด')}
      ${tile(x.on ? minTxt(x.on) : '–', 'เปิดแอป')}
      ${tile(x.ss ? x.ss[0] : '–', `รอบที่นั่งเล่น${x.ss ? ` · ยาวสุด ${minTxt(x.ss[1])}` : ''}`)}
      ${tile(nw > 0 ? '+' + nw.toLocaleString() : '–', 'คำใหม่ที่เริ่มเรียน')}
      ${tile(mst > 0 ? '+' + mst.toLocaleString() : '–', 'คำที่จำได้เพิ่ม')}
    </div></div>
    ${kinds ? `<div class="h2">แยกตามประเภท</div><div class="card-box"><div class="act-rows">${kinds}</div>
      ${unk ? `<div class="small muted" style="margin-top:8px">อีก ${unk.toLocaleString()} ข้อยังไม่แยกประเภท</div>` : ''}</div>` : ''}
    ${!a && all ? `<div class="card-box small muted">วันนั้นอยู่ก่อนเวอร์ชัน 1.158.0 ที่เริ่มแยกประเภท: รู้แค่จำนวนข้อ${cards ? ` (แฟลชการ์ด ${cards} ข้อ)` : ''}</div>` : ''}
    ${games ? `<div class="h2">🎯 เล่นอะไรบ้าง</div><div class="card-box"><div class="act-rows">${games}</div></div>` : ''}
    ${h.some((v) => v) ? `<div class="h2">🕐 ช่วงเวลาที่เล่น</div><div class="card-box day-hours"><div class="small muted" style="margin-bottom:6px">เยอะสุด ${String(bestH).padStart(2, '0')}:00–${String((bestH + 1) % 24).padStart(2, '0')}:00 (แตะแท่งเพื่อดูตัวเลข)</div>
      ${miniBars(h, h.map((v, i) => String(i)), h.map((v, i) => `${String(i).padStart(2, '0')}:00–${String((i + 1) % 24).padStart(2, '0')}:00 · ${v} ข้อ`), 6)}</div>` : ''}
    ${ev.length ? `<div class="h2">✨ ทำอะไรอีกบ้าง</div><div class="card-box"><div class="act-ev">${ev.map(([id, ic, t]) => `<div><span aria-hidden="true">${ic}</span><b>${x.e[id].toLocaleString()}</b><small>${t}</small></div>`).join('')}</div></div>` : ''}`;
}
function renderDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '') || daysAgo(key) < 0) key = today();
  const k = daysAgo(key), d = new Date(key + 'T12:00:00');
  const name = k === 0 ? 'วันนี้' : k === 1 ? 'เมื่อวาน' : `${k} วันก่อน`;
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="dayBack">‹ กลับ</button></div>
    <div class="day-head"><button class="btn" id="dayPrev" aria-label="วันก่อนหน้า"${k >= ACT_DAYS - 1 ? ' disabled' : ''}>‹</button>
      <div class="grow center"><div class="h2" style="margin:0">${WD_FULL[d.getDay()]}ที่ ${thDate(d.getTime())}</div><div class="small muted">${name}</div></div>
      <button class="btn" id="dayNext" aria-label="วันถัดไป"${k ? '' : ' disabled'}>›</button></div>
    ${dayBody(key)}`;
  $('#dayBack').onclick = () => {
    go('stats');
    const c = view.querySelector('[data-chart="act"]');
    if (c) requestAnimationFrame(() => { view.scrollTop += c.getBoundingClientRect().top - view.getBoundingClientRect().top - 80; });
  };
  $('#dayPrev').onclick = () => renderDay(dayKey(k + 1));
  $('#dayNext').onclick = () => renderDay(dayKey(k - 1));
  const hb = view.querySelector('.day-hours');
  if (hb) hb.onclick = (e) => { const b = e.target.closest('.mb-b'); if (b) toast(b.dataset.tip); };
}

// Lines: words learned and words mastered (all levels), from daily snapshots. The SVG is drawn at the width of its box
// (1 unit = 1 px, so the text keeps its real size on a wide iPad column, 1.110); the latest numbers sit in the legend below.
let trendRange = 'all';
const TREND_DAYS = [7, 14, 30, 90, 180, 365]; // a range button shows only while the data is longer than it
const niceStep = (range, n) => { const raw = Math.max(1, range) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
function trendChart(Wd) {
  const all = Object.keys(S.snap).sort();
  const SN = {}; for (const k of all) { const p = snap5(S.snap[k]); SN[k] = [0, 0, p[0], p[1]]; } // 1.246: the 5000 list, extra groups left out
  if (all.length < 2) {
    return `<div class="small muted">📊 แอปเริ่มเก็บข้อมูลแนวโน้มตั้งแต่วันนี้ เล่นต่ออีกวันสองวันแล้วกราฟเส้นจะขึ้นตรงนี้</div>
      <div style="margin-top:8px">ตอนนี้ (ชุด 5000): เรียนแล้ว <b>${SN[today()][2]}</b> คำ · จำได้แล้ว <b>${SN[today()][3]}</b> คำ</div>`;
  }
  const days = (Date.parse(all[all.length - 1] + 'T12:00:00') - Date.parse(all[0] + 'T12:00:00')) / DAY;
  const rangeIds = TREND_DAYS.filter((d) => days > d + 1);
  const canRange = rangeIds.length > 0;
  const range = canRange && (trendRange === 'all' || rangeIds.includes(+trendRange)) ? trendRange : 'all';
  let keys = all;
  if (range !== 'all') { const cut = dayKey(+range - 1); keys = all.filter((k) => k >= cut); if (keys.length < 2) keys = all.slice(-2); }
  const big = Wd >= 520;
  const H = big ? 240 : 170, top = 14, bot = big ? 28 : 24, left = big ? 48 : 40, right = 14;
  const t0 = Date.parse(keys[0] + 'T12:00:00'), t1 = Date.parse(keys[keys.length - 1] + 'T12:00:00');
  const span = Math.max(DAY, t1 - t0);
  const hi0 = Math.max(10, ...keys.map((k) => SN[k][2])), lo0 = range === 'all' ? 0 : Math.min(...keys.map((k) => SN[k][3]));
  const step = niceStep(hi0 - lo0, big ? 4 : 3);
  const lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step; if (hi <= lo) hi = lo + step;
  const px = (k) => left + (Wd - left - right) * (Date.parse(k + 'T12:00:00') - t0) / span;
  const py = (v) => H - bot - (H - bot - top) * (v - lo) / (hi - lo);
  const grid = [];
  for (let v = lo; v <= hi; v += step) grid.push(`<line class="${v === lo ? 'base' : 'grid'}" x1="${left}" x2="${Wd - right}" y1="${py(v)}" y2="${py(v)}"/><text class="ax" x="${left - 8}" y="${py(v) + 4}" text-anchor="end">${v.toLocaleString()}</text>`);
  const line = (i, cls) => `<polyline class="${cls}" points="${keys.map((k) => `${px(k).toFixed(1)},${py(SN[k][i]).toFixed(1)}`).join(' ')}"/>`;
  const last = keys[keys.length - 1], F = SN[keys[0]], L = SN[last];
  const dot = (v, cls) => `<circle class="${cls}" cx="${px(last)}" cy="${py(v)}" r="${big ? 5 : 4}"/>`;
  const hits = keys.map((k, i) => {
    const x0 = i ? (px(keys[i - 1]) + px(k)) / 2 : 0, x1 = i < keys.length - 1 ? (px(k) + px(keys[i + 1])) / 2 : Wd;
    return `<rect class="hit" data-x="${px(k)}" data-tip="${thDate(Date.parse(k + 'T12:00:00'))}: เรียนแล้ว ${SN[k][2]} · จำได้ ${SN[k][3]}" x="${x0}" y="0" width="${x1 - x0}" height="${H}"/>`;
  }).join('');
  const gain = (i) => { const d = L[i] - F[i]; return d > 0 ? ` <small class="up">+${d.toLocaleString()}</small>` : ''; };
  const seg = canRange ? `<div class="chips trend-range" role="group" aria-label="ช่วงเวลาของกราฟ">${[...rangeIds.map((d) => [String(d), `${d} วัน`]), ['all', 'ทั้งหมด']].map(([id, t]) => `<button class="chip${range === id ? ' on' : ''}" data-range="${id}" aria-pressed="${range === id}">${t}</button>`).join('')}</div>` : '';
  return `${seg}<div class="chart${big ? ' big' : ''}"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="แนวโน้มจำนวนคำที่เรียนแล้วและจำได้แล้ว: เรียนแล้ว ${L[2]} จำได้แล้ว ${L[3]}">
    ${grid.join('')}${line(2, 'ln-l')}${line(3, 'ln-m')}${dot(L[2], 'dot-l')}${dot(L[3], 'dot-m')}
    <text class="ax" x="${left}" y="${H - 7}">${thDate(t0)}</text><text class="ax" x="${Wd - right}" y="${H - 7}" text-anchor="end">วันนี้</text>
    <line class="xhair" x1="0" x2="0" y1="${top}" y2="${H - bot}" visibility="hidden"/>${hits}</svg><div class="tip" hidden></div></div>
    <div class="legend trend-leg"><span><i class="s-card"></i>เรียนแล้ว <b>${L[2].toLocaleString()}</b>${gain(2)}</span><span><i class="s-master"></i>จำได้แล้ว <b>${L[3].toLocaleString()}</b>${gain(3)}</span></div>`;
}
const hostW = (el) => { const cs = getComputedStyle(el); return Math.max(240, Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))); };
function bindTrend(el) {
  bindChartTips(el);
  if (el.dataset.chart === 'act') bindAct(el.parentNode);
  el.querySelectorAll('[data-range]').forEach((b) => {
    b.onclick = () => { trendRange = b.dataset.range; delete el.dataset.w; paintChart(el); };
  });
}
// Redraw a chart box at its current width (skips when the width did not change).
function paintChart(el) {
  if (!el.isConnected || (el.dataset.lz && !el.dataset.done)) return;
  const w = hostW(el);
  if (el.dataset.w == w) return;
  el.dataset.w = w;
  el.innerHTML = el.dataset.chart === 'trend' ? trendChart(w) : activityChart(w);
  bindTrend(el);
}
let chartRO = null;
function watchCharts() {
  if (chartRO) chartRO.disconnect();
  const hosts = [...view.querySelectorAll('[data-chart]')];
  if (!window.ResizeObserver) return hosts.forEach(paintChart);
  chartRO = new ResizeObserver((es) => es.forEach((e) => paintChart(e.target)));
  hosts.forEach((el) => chartRO.observe(el));
}

// Tap/hover on a chart shows the hovered mark's numbers in a small tooltip.
function bindChartTips(root = view) {
  root.querySelectorAll('.chart').forEach((ch) => {
    const tip = ch.querySelector('.tip'), xh = ch.querySelector('.xhair'), svg = ch.querySelector('svg');
    const show = (e) => {
      const r = e.target.closest('.hit'); if (!r) return;
      tip.textContent = r.dataset.tip; tip.hidden = false;
      const box = ch.getBoundingClientRect(), rb = r.getBoundingClientRect();
      const cx = rb.left + rb.width / 2 - box.left;
      const hw = Math.min(box.width / 2, tip.offsetWidth / 2 + 4);
      tip.style.left = Math.min(Math.max(cx, hw), box.width - hw) + 'px';
      if (xh && r.dataset.x) { xh.setAttribute('x1', r.dataset.x); xh.setAttribute('x2', r.dataset.x); xh.setAttribute('visibility', 'visible'); }
    };
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (xh) xh.setAttribute('visibility', 'hidden'); });
  });
}

/* ---------- year heatmap ---------- */
// GitHub-style calendar of the last 53 weeks (Monday-first columns); colour = answers that day, 5 steps of one hue.
const HM_STEPS = [1, 10, 25, 50]; // ≥ these → levels 1..4
const hmLevel = (v) => (v ? HM_STEPS.filter((x) => v >= x).length : 0);
function yearHeatmap() {
  const now = new Date(); now.setHours(12, 0, 0, 0);
  const start = new Date(now); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 52 * 7);
  const tKey = today(), cells = [], months = [];
  let active = 0, total = 0, run = 0, best = 0, lastMonth = -1;
  for (let wk = 0; wk < 53; wk++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start); d.setDate(start.getDate() + wk * 7 + dow);
      const key = ymd(d);
      if (key > tKey) { cells.push('<i class="hm-c hm-x"></i>'); continue; }
      if (dow === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        if (wk < 51) { if (months.length && wk - months[months.length - 1][0] < 3) months.pop(); months.push([wk, TH_MON_FMT.format(d)]); }
      }
      const v = S.hist[key] || 0;
      if (v) { active++; total += v; run++; best = Math.max(best, run); } else if (key !== tKey) run = 0;
      cells.push(`<i class="hm-c hm-${hmLevel(v)}" data-hm="${key}" title="${thDate(d)}: ${v} ข้อ"></i>`);
    }
  }
  const legend = [0, 1, 2, 3, 4].map((l) => `<i class="hm-c hm-${l}"></i>`).join('');
  return `<div class="hm-sum small"><span>📅 เล่น <b>${active}</b> วัน</span><span>🔥 ติดกันนานสุด <b>${best}</b> วัน</span><span>✏️ รวม <b>${total.toLocaleString()}</b> ข้อ</span></div>
    <div class="hm-wrap" id="hmWrap" role="img" aria-label="ปฏิทินการเล่นย้อนหลัง 12 เดือน: เล่น ${active} วัน รวม ${total} ข้อ ติดกันนานสุด ${best} วัน">
      <div class="hm-months">${months.map(([wk, m]) => `<span style="grid-column:${wk + 1} / span 3;grid-row:1">${m}</span>`).join('')}</div>
      <div class="hm" id="hm">${cells.join('')}</div>
    </div>
    <div class="hm-legend small muted"><span>แตะช่องเพื่อดูวันที่</span><span class="grow"></span>น้อย ${legend} มาก</div>`;
}
function bindHeatmap() {
  const wrap = $('#hmWrap'); if (!wrap) return;
  wrap.scrollLeft = wrap.scrollWidth; // newest weeks first in view on phones
  $('#hm').onclick = (e) => { const c = e.target.closest('[data-hm]'); if (c) toast(`${thDate(new Date(c.dataset.hm + 'T12:00'))}: ${S.hist[c.dataset.hm] || 0} ข้อ`); };
}

/* ---------- monthly test ---------- */
// Up to 30 questions from mastered words (or learned ones while few are mastered): checks what is really remembered.
// Answers go through gameResult(), so a missed word returns to the flashcards. Best score per month in S.mtest.
const MTEST_N = 30;
const pct = (r) => (r ? Math.round((r.r / r.n) * 100) : 0);
function mtestPool() {
  const m = masteredWords();
  return m.length >= 20 ? m : W.filter((w) => S.prog[w.w]);
}
function mtestSummary() {
  const keys = Object.keys(S.mtest).sort().slice(-6);
  if (!keys.length) return '<p class="small muted" style="margin:0">ทดสอบเดือนละครั้งว่าคำที่จำได้แล้วยังจำได้จริงไหม แล้วดูพัฒนาการแต่ละเดือน</p>';
  return `<div class="mt-hist">${keys.map((k) => { const p = pct(S.mtest[k]); return `<div class="mt-col"><b>${p}%</b><div class="mt-bar"><i style="height:${Math.max(4, p)}%"></i></div><span>${new Date(k + '-15T12:00').toLocaleDateString('th-TH', { month: 'short' })}</span></div>`; }).join('')}</div>`;
}
function renderMonthTest() {
  const pool = mtestPool(), cur = S.mtest[monthKey()], prev = S.mtest[monthKey(1)];
  if (pool.length < 10) {
    view.innerHTML = `<div class="card-box center"><div class="result-emoji">📝</div><p>เรียนคำศัพท์ให้ได้อย่างน้อย 10 คำก่อน แล้วค่อยมาทำแบบทดสอบประจำเดือนนะ</p><button class="btn primary block" data-go="cards">ไปเรียนแฟลชการ์ด</button></div>`;
    return;
  }
  const n = Math.min(MTEST_N, pool.length), fromMastered = pool.length && pool.every((w) => status(w) === 'mastered');
  view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">📝</div>
    <div class="h2" style="margin:4px 0">แบบทดสอบประจำเดือน${monthName(monthKey())}</div>
    <p class="small muted">${n} ข้อ สุ่มจาก${fromMastered ? 'คำที่จำได้แล้ว' : 'คำที่เรียนแล้ว'} (${pool.length} คำ) ไม่มีตัวช่วย คำที่ตอบผิดจะกลับไปให้ทบทวนในแฟลชการ์ด</p>
    <div class="tiles mo-tiles" style="margin:12px 0"><div class="tile-s"><b>${cur ? pct(cur) + '%' : '–'}</b><span>เดือนนี้ (ดีที่สุด)</span></div><div class="tile-s"><b>${prev ? pct(prev) + '%' : '–'}</b><span>เดือนที่แล้ว</span></div><div class="tile-s"><b>${n}</b><span>ข้อ</span></div></div>
    <button class="btn primary block" id="mtGo">เริ่มทำแบบทดสอบ</button></div>
    <div class="card-box mt-sum"><b>📈 ผลย้อนหลังรายเดือน</b>${mtestSummary()}</div>`;
  $('#mtGo').onclick = () => runMonthTest(shuffle(pool).slice(0, n));
}
function runMonthTest(items, lv) {
  let i = 0, right = 0, timer = null;
  const wrong = [], modes = ['en2th', 'th2en', ...(window.speechSynthesis ? ['listen'] : [])];
  cleanup = () => clearTimeout(timer);
  const q = () => {
    if (i >= items.length) return done();
    const w = items[i], m = modes[i % modes.length], toTh = m !== 'th2en';
    runMonthTest.cur = w; // read by tests (a listen question speaks 150 ms after it appears)
    const opts = shuffle([w, ...distractors(w, 3, toTh ? 't' : 'w')]);
    $('#title').textContent = `${lv ? 'ทดสอบจบ ' + LV_LABEL[lv] : 'แบบทดสอบ'} · ${i + 1}/${items.length}`;
    const prompt = m === 'en2th' ? `<div class="word" lang="en">${esc(w.w)}</div><div class="pos">${esc(w.p)}</div>`
      : m === 'th2en' ? `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`
      : `<button class="speak" data-say aria-label="ฟังอีกครั้ง" style="width:88px;height:88px;font-size:40px;margin:0">🔊</button>`;
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="mtQuit" aria-label="ออก">✕</button><div class="progress"><div style="width:${(i / items.length) * 100}%"></div></div><span class="small"><b>${right}</b> ถูก</span></div>
      <div class="card-box q-prompt pop">${prompt}</div>
      <div class="options">${opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(toTh ? o.t : o.w)}</button>`).join('')}</div>`;
    $('#mtQuit').onclick = () => go('stats');
    const say = view.querySelector('[data-say]'); if (say) { say.onclick = () => speak(w.w); setTimeout(() => speak(w.w), 150); }
    let answered = false;
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b || answered) return;
      answered = true;
      const ok = opts[+b.dataset.k] === w;
      view.querySelectorAll('.opt').forEach((o) => { if (opts[+o.dataset.k] === w) o.classList.add('correct'); });
      if (!ok) { b.classList.add('wrong'); wrong.push(w); } else { right++; addXP(2); }
      gameResult(w, ok); sfx(ok ? 'ok' : 'bad');
      timer = setTimeout(() => { i++; q(); }, ok ? 650 : 1500);
    };
  };
  const done = () => {
    const key = lv || monthKey(), res = { r: right, n: items.length, at: Date.now() };
    const book = lv ? S.ltest : S.mtest, prev = lv ? null : S.mtest[monthKey(1)];
    const best = !book[key] || pct(res) > pct(book[key]);
    if (best) book[key] = res;
    save();
    const p = pct(res), diff = prev ? p - pct(prev) : null, pass = lv && p >= LTEST_PASS;
    if (p >= 90 || pass) confetti();
    $('#title').textContent = lv ? 'ผลทดสอบจบ ' + LV_LABEL[lv] : 'ผลแบบทดสอบ';
    const note = lv ? (pass ? `🎓 ผ่านแบบทดสอบระดับ ${LV_LABEL[lv]} แล้ว! ได้เหรียญ “จบ ${LV_LABEL[lv]}”` : `ต้องได้ ${LTEST_PASS}% ขึ้นไปถึงจะผ่าน ลองทบทวนคำที่ผิดแล้วทำอีกครั้งนะ`)
      : diff == null ? 'เดือนหน้ามาทำอีกครั้งเพื่อดูพัฒนาการนะ' : diff > 0 ? `📈 ดีขึ้นจากเดือนที่แล้ว ${diff}%` : diff < 0 ? `📉 น้อยกว่าเดือนที่แล้ว ${-diff}% ลองทบทวนคำที่ผิดดูนะ` : 'เท่ากับเดือนที่แล้วพอดี';
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${p >= 90 ? '🏆' : p >= 70 ? '🎉' : p >= 50 ? '💪' : '📚'}</div>
      <div class="h2" style="margin:4px 0">${right}/${items.length} · ${p}%</div>
      <p class="small muted">${note}${best ? '' : ' · คะแนนดีที่สุดยังเป็นครั้งก่อน'}</p>
      <div class="tiles mo-tiles" style="margin:12px 0"><div class="tile-s"><b>✅ ${right}</b><span>ตอบถูก</span></div><div class="tile-s"><b>❌ ${wrong.length}</b><span>ตอบผิด</span></div><div class="tile-s"><b>${pct(book[key])}%</b><span>${lv ? 'ดีที่สุดของระดับนี้' : 'ดีที่สุดเดือนนี้'}</span></div></div>
      <button class="btn primary block" id="mtAgain">ทำอีกครั้ง</button><button class="btn ghost block" style="margin-top:8px" data-go="stats">ดูสถิติ</button></div>
      ${wrong.length ? '' : `<div class="card-box center"><div class="mt-star" aria-hidden="true">🌟</div><b>ไม่มีคำผิดเลย!</b><div class="small muted">คำทั้ง ${items.length} คำนี้ยังจำได้แม่น ไม่ต้องกลับไปทบทวนเพิ่ม</div></div>`}
      ${lv ? '' : `<div class="card-box"><b>พัฒนาการรายเดือน</b><div style="margin-top:8px">${mtestSummary()}</div></div>`}
      ${wrong.length ? `<div class="card-box wrong-list"><b>คำที่ตอบผิด</b> <span class="small muted">(กลับไปอยู่ในแฟลชการ์ดแล้ว · แตะเพื่อดู)</span>
        ${wrong.map((w) => `<div class="wl" data-i="${w.idx}"><span><b>${esc(w.w)}</b></span><span class="muted grow" style="text-align:right">${esc(w.t)}</span></div>`).join('')}</div>` : ''}`;
    $('#mtAgain').onclick = () => (lv ? renderLevelTest(lv) : renderMonthTest());
    const wl = view.querySelector('.wrong-list');
    if (wl) wl.onclick = (e) => { const r = e.target.closest('[data-i]'); if (r) openSheet(W[+r.dataset.i]); };
  };
  q();
}

/* ---------- level test (1.63) ---------- */
// Offered when 80% of a level's words are learned: up to 30 questions from the learned words of that level, pass = 80%.
// Best result per level in S.ltest[level]; passing gives the "ผ่านทดสอบ" medal. Same question engine as the monthly test.
const LTEST_NEED = 0.8, LTEST_PASS = 80;
function levelProgress(lv) {
  const ws = W.filter((w) => w.g === lv), l = ws.filter((w) => S.prog[w.w]).length;
  return { n: ws.length, l, f: ws.length ? l / ws.length : 0 };
}
// 1.246.1: the 3000 / 5000 levels show open, the extra groups fold into one <details class="lt-extra"> (closed by default).
function levelTestBox() {
  const row = (lv) => {
    const p = levelProgress(lv), t = S.ltest[lv], ok = p.f >= LTEST_NEED;
    return `<div class="wrow lt-row"><div class="grow"><b>${LV_LABEL[lv]}</b> <span class="small muted">· เรียนแล้ว ${Math.round(p.f * 100)}%${t ? ` · ดีที่สุด ${pct(t)}%${pct(t) >= LTEST_PASS ? ' 🎓 ผ่านแล้ว' : ''}` : ''}</span></div>
      <button class="chip" data-lt="${lv}" ${ok ? '' : 'disabled'} aria-label="ทดสอบจบ ${LV_LABEL[lv]}">${ok ? (t ? 'ทำอีกครั้ง' : 'ทดสอบ') : `ต้องเรียน ${Math.round(LTEST_NEED * 100)}%`}</button></div>`;
  };
  const ex = LEVELS.filter((l) => LEVELS_EXTRA.includes(l));
  const ready = ex.filter((l) => levelProgress(l).f >= LTEST_NEED).length, passed = ex.filter((l) => S.ltest[l] && pct(S.ltest[l]) >= LTEST_PASS).length;
  return `<div class="card-box">${LEVELS.filter((l) => !ex.includes(l)).map(row).join('')}${ex.length ? `<details class="lv-more lt-extra"><summary>📚 ชุดเสริม ${ex.length} หมวด${ready ? ` · ทดสอบได้ ${ready}` : ''}${passed ? ` · ผ่านแล้ว ${passed}` : ''}</summary>${ex.map(row).join('')}</details>` : ''}<div class="small muted" style="margin-top:8px">เรียนครบ 80% ของระดับไหนก็ทดสอบจบระดับนั้นได้ ผ่านเมื่อได้ ${LTEST_PASS}% ขึ้นไป</div></div>`;
}
function renderLevelTest(lv) {
  if (!LEVELS.includes(lv)) return go('stats');
  const pool = W.filter((w) => w.g === lv && S.prog[w.w]), p = levelProgress(lv), t = S.ltest[lv];
  if (p.f < LTEST_NEED || pool.length < 10) {
    view.innerHTML = `<div class="card-box center"><div class="result-emoji">🎓</div><p>เรียนคำระดับ ${LV_LABEL[lv]} ให้ได้ ${Math.round(LTEST_NEED * 100)}% ก่อน (ตอนนี้ ${Math.round(p.f * 100)}%) แล้วค่อยมาทดสอบนะ</p><button class="btn primary block" data-go="cards">ไปเรียนแฟลชการ์ด</button></div>`;
    return;
  }
  const n = Math.min(MTEST_N, pool.length);
  view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">🎓</div>
    <div class="h2" style="margin:4px 0">ทดสอบจบระดับ ${LV_LABEL[lv]}</div>
    <p class="small muted">${n} ข้อ สุ่มจากคำระดับ ${LV_LABEL[lv]} ที่เรียนแล้ว (${pool.length} คำ) ไม่มีตัวช่วย ผ่านเมื่อได้ ${LTEST_PASS}% ขึ้นไป คำที่ผิดจะกลับไปให้ทบทวน</p>
    <div class="tiles mo-tiles" style="margin:12px 0"><div class="tile-s"><b>${t ? pct(t) + '%' : '–'}</b><span>ดีที่สุด</span></div><div class="tile-s"><b>${n}</b><span>ข้อ</span></div></div>
    <button class="btn primary block" id="mtGo">เริ่มทดสอบ</button></div>`;
  $('#mtGo').onclick = () => runMonthTest(shuffle(pool).slice(0, n), lv);
}

/* ---------- statistics extras (1.255.0) ---------- */
const ACT_DAYS_OPT = [14, 28, 60];
// 🕐 Accuracy by time of day: S.act x.hj / x.hr (judged / right per hour), last 28 days, in 3-hour slots.
const HOUR_SLOTS = [[0, 6, 'ดึก 00–06'], [6, 9, 'เช้า 06–09'], [9, 12, 'สาย 09–12'], [12, 15, 'บ่าย 12–15'], [15, 18, 'เย็น 15–18'], [18, 21, 'ค่ำ 18–21'], [21, 24, 'กลางคืน 21–24']];
const HOUR_MIN = 20; // answers in a slot before its % shows
function hourAcc(days = 28) {
  const jd = Array(24).fill(0), ok = Array(24).fill(0);
  for (let k = 0; k < days; k++) { const x = (S.act[dayKey(k)] || {}).x; if (x && x.hj && x.hr) x.hj.forEach((v, i) => { jd[i] += v; ok[i] += x.hr[i] || 0; }); }
  return HOUR_SLOTS.map(([a, b, t]) => { let j = 0, r = 0; for (let i = a; i < b; i++) { j += jd[i]; r += ok[i]; } return { t, j, r, acc: j ? r / j : null }; });
}
function hourAccCard() {
  const sl = hourAcc(), used = sl.filter((x) => x.j >= HOUR_MIN);
  const head = '<div class="h2">🕐 ช่วงเวลาที่ตอบแม่นที่สุด <span class="small muted">28 วันล่าสุด</span></div>';
  if (used.length < 2) return `${head}<div class="card-box small muted" id="hourBox">ตอบอย่างน้อย ${HOUR_MIN} ข้อในสองช่วงเวลาขึ้นไป แล้วแอปจะบอกได้ว่าช่วงไหนตอบแม่นที่สุด (เริ่มเก็บตั้งแต่เวอร์ชัน 1.255.0)</div>`;
  const best = used.reduce((a, b) => (b.acc > a.acc ? b : a)), worst = used.reduce((a, b) => (b.acc < a.acc ? b : a));
  const rows = sl.map((x) => `<div class="act-row"><span class="act-n">${x.t}</span><span class="act-bar"><i class="a-any" style="width:${x.j >= HOUR_MIN ? Math.max(2, Math.round(x.acc * 100)) : 0}%"></i></span><span class="act-v">${x.j >= HOUR_MIN ? Math.round(x.acc * 100) + '%' : '–'}<small>${x.j.toLocaleString()} ข้อ</small></span></div>`).join('');
  const gap = Math.round((best.acc - worst.acc) * 100);
  return `${head}<div class="card-box" id="hourBox">
    <div class="small">${gap >= 5 ? `⭐ ช่วง<b>${best.t}</b> ตอบถูก ${Math.round(best.acc * 100)}% แม่นกว่าช่วง${worst.t} ${gap} จุด ลองตั้งเวลาเตือนช่วงนี้ดูนะ` : '✅ ตอบแม่นพอๆ กันทุกช่วงที่เล่น เล่นเวลาไหนก็ได้ที่สะดวก'}</div>
    <div class="act-rows" style="margin-top:8px">${rows}</div>
    ${gap >= 5 ? '<button class="btn" data-go="settings" style="margin-top:8px">⏰ ไปตั้งเวลาเตือน</button>' : ''}</div>`;
}
// ✨ Words that became "จำได้แล้ว" this month (S.mday, kept since 1.255.0), newest first. Tap a word to open it.
function monthMast(mk = monthKey()) {
  return Object.entries(S.mday || {}).filter(([w, k]) => k.startsWith(mk) && WORD_BY[w]).sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(([w]) => WORD_BY[w]);
}
function monthMastCard() {
  const ws = monthMast(), head = `<div class="h2">✨ คำที่จำได้เดือนนี้ <span class="small muted">${ws.length} คำ</span></div>`;
  if (!ws.length) return `${head}<div class="card-box small muted" id="mastBox">ยังไม่มีคำที่เพิ่งจำได้เดือนนี้ ทบทวนแฟลชการ์ดตามกำหนดไปเรื่อยๆ คำที่ผ่านหลายรอบจะขึ้นมาตรงนี้ (เริ่มเก็บตั้งแต่เวอร์ชัน 1.255.0)</div>`;
  const chip = (w) => `<button class="chip" data-wsi="${w.idx}" lang="en">${esc(w.w)}</button>`;
  return `${head}<div class="card-box" id="mastBox"><div class="chips">${ws.slice(0, 40).map(chip).join('')}</div>
    ${ws.length > 40 ? `<details class="act-more"><summary>ดูอีก ${ws.length - 40} คำ</summary><div class="chips">${ws.slice(40).map(chip).join('')}</div></details>` : ''}
    <div class="small muted" style="margin-top:8px">แตะคำเพื่อเปิดดู · นับคำที่ทบทวนผ่านจนได้สถานะ “จำได้แล้ว” ในเดือนนี้</div></div>`;
}
// 📂 Accuracy by topic and part of speech over all answers so far (S.prog c right / x wrong), weakest first.
const ACC_MIN = 15;
function accBy(key) {
  const t = {};
  for (const w of W) { const p = S.prog[w.w]; if (!p) continue; const k = key(w); if (!k) continue; const r = t[k] || (t[k] = [0, 0]); r[0] += (p.c || 0) + (p.x || 0); r[1] += p.c || 0; }
  return Object.entries(t).filter(([, [n]]) => n >= ACC_MIN).map(([k, [n, c]]) => [k, c / n, n]).sort((a, b) => a[1] - b[1]);
}
function topicAccCard() {
  const tp = accBy((w) => w.tp), pos = accBy((w) => String(w.p || '').split('/')[0].trim());
  const head = '<div class="h2">📂 ความแม่นตามหมวดและชนิดคำ <span class="small muted">ทุกคำที่เคยตอบ</span></div>';
  if (tp.length < 2 && pos.length < 2) return `${head}<div class="card-box small muted" id="tpAcc">เรียนคำจากหลายหมวดอีกสักหน่อย (หมวดละ ${ACC_MIN} ข้อขึ้นไป) แล้วแอปจะเทียบให้ว่าหมวดไหนแม่น หมวดไหนยังพลาดบ่อย</div>`;
  const row = (name, [, acc, n]) => `<div class="act-row"><span class="act-n">${name}</span><span class="act-bar"><i class="a-any" style="width:${Math.max(2, Math.round(acc * 100))}%"></i></span><span class="act-v">${Math.round(acc * 100)}%<small>${n.toLocaleString()} ข้อ</small></span></div>`;
  const tl = (k) => esc(TOPIC_LABEL[k] || k);
  return `${head}<div class="card-box" id="tpAcc">
    ${tp.length ? `<div class="act-h">หมวดที่ยังพลาดบ่อย</div><div class="act-rows">${tp.slice(0, 5).map((r) => row(tl(r[0]), r)).join('')}</div>
      ${tp.length > 5 ? `<details class="act-more"><summary>ดูหมวดอื่นอีก ${tp.length - 5} หมวด</summary><div class="act-rows">${tp.slice(5).map((r) => row(tl(r[0]), r)).join('')}</div></details>` : ''}` : ''}
    ${pos.length ? `<div class="act-h">ชนิดคำ</div><div class="act-rows">${pos.map((r) => row(esc(POS_TH[r[0]] || r[0]), r)).join('')}</div>` : ''}
    ${tp.length ? `<div class="wk-btns"><button class="btn primary" data-weak="tp:${tp[0][0]}">📂 ฝึกหมวด${esc((TOPIC_LABEL[tp[0][0]] || '').replace(/^\S+ /, ''))}</button></div>` : ''}</div>`;
}
// 🔀 Word pairs mixed up most (S.conf from quiz and match answers), both directions added together.
function confPairs() {
  const t = {};
  for (const [a, m] of Object.entries(S.conf || {})) for (const [b, n] of Object.entries(m)) {
    if (!WORD_BY[a] || !WORD_BY[b]) continue;
    const k = a < b ? a + '\u0001' + b : b + '\u0001' + a; t[k] = (t[k] || 0) + n;
  }
  return Object.entries(t).sort((x, y) => y[1] - x[1]).map(([k, n]) => [...k.split('\u0001').map((w) => WORD_BY[w]), n]);
}
function confCard() {
  const ps = confPairs(), head = '<div class="h2">🔀 คู่คำที่ชอบสับสน</div>';
  if (!ps.length) return `${head}<div class="card-box small muted" id="confBox">ยังไม่มีคู่คำที่ตอบสลับกัน · เวลาเลือกคำตอบผิดในเกมทายคำหรือเกมจับคู่ แอปจะจำว่าสับสนคำไหนกับคำไหน แล้วรวมไว้ที่นี่ (เริ่มเก็บตั้งแต่เวอร์ชัน 1.255.0)</div>`;
  const word = (w) => `<button class="linkish" data-wsi="${w.idx}" lang="en">${esc(w.w)}</button> <span class="muted small">${esc(w.t)}</span>`;
  const row = ([a, b, n]) => `<div class="cf-row">${word(a)}<span aria-hidden="true"> ⇄ </span>${word(b)} <span class="muted small">· ${n} ครั้ง</span></div>`;
  return `${head}<div class="card-box" id="confBox">${ps.slice(0, 6).map(row).join('')}
    ${ps.length > 6 ? `<details class="act-more"><summary>ดูอีก ${Math.min(24, ps.length - 6)} คู่</summary>${ps.slice(6, 30).map(row).join('')}</details>` : ''}
    <div class="wk-btns"><button class="btn primary" id="confGo">🔀 ฝึกคู่ที่สับสน (${Math.min(20, ps.length * 2)} คำ)</button></div></div>`;
}
function confGo() {
  customWords = [...new Set(confPairs().slice(0, 10).flatMap(([a, b]) => [a, b]))].slice(0, 20);
  if (customWords.length < 4) customWords = [...new Set(customWords.concat(pool().slice(0, 6)))];
  gameSource = 'custom';
  startGame(pick(['en2th', 'th2en', 'match']));
}
// 🎧 Skills: answers and accuracy by the games menu's skill groups (GAME_SKILLS / SKILL_OF in js/games.js), from S.act x.g.
// Flashcards, the feed and stories count as "ความหมาย"; listening review (ear) as listening.
const MIX_EXTRA = { cards: 'mean', feed: 'mean', read: 'mean', ear: 'hear' };
const MIX_TRY = ['hear', 'say', 'write', 'gram', 'phrase']; // groups worth a nudge when they get under 10 %
const mixOf = (id) => SKILL_OF[id] || MIX_EXTRA[id] || '';
function skillMix(days = 90) {
  const t = Object.fromEntries(GAME_SKILLS.map(([k]) => [k, [0, 0, 0, 0]]));
  for (let k = 0; k < days; k++) {
    const x = (S.act[dayKey(k)] || {}).x; if (!x || !x.g) continue;
    for (const [id, v] of Object.entries(x.g)) { const r = t[mixOf(id)]; if (r) v.forEach((y, i) => { r[i] += y; }); }
  }
  return t;
}
function skillMixCard() {
  const t = skillMix(), all = Object.values(t).reduce((a, r) => a + r[0], 0);
  const head = '<div class="h2">🎧 ฝึกทักษะไหนไปเท่าไร <span class="small muted">90 วันล่าสุด</span></div>';
  if (all < 20) return `${head}<div class="card-box small muted" id="skillBox">เล่นอีกสักหน่อย แล้วแอปจะแยกให้ดูว่าฝึกฟัง พูด สะกด ความหมาย และไวยากรณ์ไปเท่าไร</div>`;
  const rows = GAME_SKILLS.filter(([k]) => t[k][0] || MIX_TRY.includes(k)).map(([k, ic, name]) => { const r = t[k];
    return `<div class="act-row"><span class="act-n"><span aria-hidden="true">${ic}</span> ${name}</span><span class="act-bar"><i class="a-any" style="width:${r[0] ? Math.max(2, Math.round(r[0] / all * 100)) : 0}%"></i></span><span class="act-v">${aPct(r[0], all)}%<small>${r[0].toLocaleString()} ข้อ${okTxt(r[3], r[2])}</small></span></div>`; }).join('');
  const low = GAME_SKILLS.filter(([k, , , ids]) => MIX_TRY.includes(k) && t[k][0] / all < 0.1 && GAMES[ids[0]]).slice(0, 3);
  return `${head}<div class="card-box" id="skillBox"><div class="act-rows">${rows}</div>
    ${low.length ? `<div class="small" style="margin-top:8px">💡 ยังฝึก${low.map(([, , n]) => n).join(' / ')}น้อย (ไม่ถึง 10%) ลองสลับเล่นบ้างนะ</div><div class="wk-btns">${low.map(([, , , ids]) => `<button class="btn" data-weak="g:${ids[0]}">${GAMES[ids[0]].icon} ${esc(GAMES[ids[0]].name)}</button>`).join('')}</div>` : ''}
    <div class="small muted" style="margin-top:8px">แบ่งกลุ่มเหมือนหน้าเมนูเกม · แฟลชการ์ด ไถศัพท์ และเรื่องสั้นนับเป็น “ความหมาย”</div></div>`;
}
function bindStatX() {
  const sheet = (e) => { const b = e.target.closest('[data-wsi]'); if (b && W[+b.dataset.wsi]) openSheet(W[+b.dataset.wsi]); };
  ['#mastBox', '#confBox'].forEach((id) => { const el = $(id); if (el) el.addEventListener('click', sheet); });
  const cg = $('#confGo'); if (cg) cg.onclick = confGo;
  ['#tpAcc', '#skillBox'].forEach((id) => { const el = $(id); if (el) el.onclick = (e) => { const b = e.target.closest('[data-weak]'); if (b) weakGo(b.dataset.weak); }; });
  const lb = $('#stLay');
  if (lb) lb.onclick = () => { const box = $('#stLayBox'), open = box.hidden; box.hidden = !open; lb.setAttribute('aria-expanded', String(open)); lb.classList.toggle('on', open); if (open) layPanel(); };
}
// 🧩 Page layout: hide or move the stats parts (each .m-sec, keyed by its heading text). settings.statHide = [keys],
// settings.statOrder = [keys] (empty = the built-in order; parts not listed keep their built-in place after the listed ones).
// A block between sections without a heading of its own (the sticker book) moves with the section before it.
const secKey = (sec) => { const h = sec.querySelector(':scope > .h2'); return h ? (h.firstChild ? h.firstChild.textContent : h.textContent).trim() : ''; };
function statUnits() {
  const out = [];
  for (const el of [...view.children]) {
    if (el.classList.contains('m-sec')) out.push({ key: secKey(el), els: [el] });
    else if (out.length) out[out.length - 1].els.push(el);
  }
  return out.filter((u) => u.key);
}
function statLayout() {
  const us = statUnits(); if (!us.length) return;
  const hide = new Set(S.settings.statHide || []), ord = S.settings.statOrder || [];
  const byKey = new Map(us.map((u) => [u.key, u]));
  const list = ord.length ? [...ord.filter((k) => byKey.has(k)).map((k) => byKey.get(k)), ...us.filter((u) => !ord.includes(u.key))] : us;
  const anchor = document.createComment('st'); us[0].els[0].before(anchor);
  let at = anchor;
  for (const u of list) for (const el of u.els) { at.after(el); at = el; el.hidden = hide.has(u.key); }
  anchor.remove();
}
function layPanel() {
  const box = $('#stLayBox'); if (!box) return;
  const us = statUnits(), hide = new Set(S.settings.statHide || []), keys = us.map((u) => u.key);
  box.className = 'card-box st-lay';
  box.innerHTML = `<div class="row" style="justify-content:space-between"><b>🧩 จัดหน้าสถิติ</b><button class="btn" id="layReset">คืนค่าเดิม</button></div>
    <div class="small muted" style="margin:4px 0 8px">ติ๊กออกเพื่อซ่อน · ใช้ ↑ ↓ เลื่อนลำดับ (ซิงก์ไปเครื่องอื่นด้วย)</div>
    ${us.map((u, i) => `<div class="lay-row"><label><input type="checkbox" data-lk="${i}"${hide.has(u.key) ? '' : ' checked'}> ${esc(u.key)}</label>
      <span class="lay-mv"><button class="btn" data-lu="${i}" aria-label="เลื่อน ${esc(u.key)} ขึ้น"${i ? '' : ' disabled'}>↑</button><button class="btn" data-ld="${i}" aria-label="เลื่อน ${esc(u.key)} ลง"${i < us.length - 1 ? '' : ' disabled'}>↓</button></span></div>`).join('')}`;
  const apply = () => { save(); statLayout(); layPanel(); };
  box.onchange = (e) => {
    const c = e.target.closest('[data-lk]'); if (!c) return;
    const k = keys[+c.dataset.lk], h = new Set(S.settings.statHide || []);
    if (c.checked) h.delete(k); else h.add(k);
    S.settings.statHide = [...h]; apply();
    const nc = box.querySelector(`[data-lk="${c.dataset.lk}"]`); if (nc) nc.focus();
  };
  box.onclick = (e) => {
    if (e.target.closest('#layReset')) { S.settings.statHide = []; S.settings.statOrder = []; save(); return go('stats'); } // redraw in the built-in order
    const b = e.target.closest('[data-lu], [data-ld]'); if (!b) return;
    const up = b.dataset.lu != null, i = +(up ? b.dataset.lu : b.dataset.ld), j = up ? i - 1 : i + 1;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]]; S.settings.statOrder = keys.slice(); apply();
    const nb = box.querySelector(`[data-${up ? 'lu' : 'ld'}="${j}"]`); if (nb && !nb.disabled) nb.focus();
  };
}

/* ---------- deeper stats (1.256.0) ---------- */
const nf = (n) => Math.round(n).toLocaleString();
const shrBtn = (k) => `<button class="btn" data-shr="${k}">📸 แชร์เป็นรูป</button>`;
// 🧠 Memory now (FSRS recall chance of every studied card today) and 🔮 what is left after a break of 3 / 7 / 14 / 30 days.
const FORGET_DAYS = [3, 7, 14, 30];
function memCurve(maxD = 30) {
  const cards = [];
  for (const [w, p] of Object.entries(S.prog)) { if (!p || !(p.s > 0) || !WORD_BY[w]) continue; const st = fsState(p); cards.push(st); }
  const at = (d) => cards.reduce((a, st) => a + fsRetr(st.t + d, Math.max(0.1, st.s)), 0);
  return { n: cards.length, pts: Array.from({ length: maxD + 1 }, (_, d) => at(d)) };
}
function memNowCard() {
  const c = memCurve(), head = '<div class="h2">🧠 ความจำตอนนี้ <span class="small muted">คำนวณจากตัวจัดรอบ FSRS</span></div>';
  if (c.n < 10) return `${head}<div class="card-box small muted" id="memNow">เรียนคำไปอีกสักหน่อย (ตอนนี้ ${c.n} คำ) แล้วแอปจะคำนวณว่าตอนนี้จำได้จริงกี่คำ และถ้าหยุดเล่นจะลืมไปเท่าไร</div>`;
  const now = c.pts[0], Wd = 300, H = 110, top = Math.max(1, now);
  const x = (d) => 6 + d / 30 * (Wd - 12), y = (v) => 8 + (1 - v / top) * (H - 30);
  const path = c.pts.map((v, d) => `${d ? 'L' : 'M'}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const dots = FORGET_DAYS.map((d) => `<circle cx="${x(d)}" cy="${y(c.pts[d])}" r="3.5" class="mf-dot"/><text class="ax" x="${x(d)}" y="${H - 6}" text-anchor="middle">${d} วัน</text>`).join('');
  const rows = FORGET_DAYS.map((d) => { const v = c.pts[d], lost = now - v;
    return `<div class="mf-row"><span>หยุด ${d} วัน</span><b>${nf(v)} คำ</b><span class="cmp down">▼ ${nf(lost)} (${Math.round(lost / Math.max(1, now) * 100)}%)</span></div>`; }).join('');
  return `${head}<div class="card-box" id="memNow">
    <div class="mf-hero"><b>${nf(now)}</b><span>คำที่น่าจะนึกออกถ้าถูกถามตอนนี้ <span class="muted">จาก ${nf(c.n)} คำที่เคยทบทวน</span></span></div>
    <div class="act-h">🔮 ถ้าหยุดเล่นไป…</div>
    <svg class="mf-svg" viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="ถ้าหยุดเล่น ความจำจะลดจาก ${nf(now)} เหลือ ${nf(c.pts[30])} คำใน 30 วัน"><path d="${path}" class="mf-line"/>${dots}</svg>
    <div class="mf-rows">${rows}</div>
    <div class="small muted" style="margin-top:8px">ยิ่งทบทวนตามกำหนด เส้นยิ่งลาดน้อยลง เพราะคำที่ผ่านหลายรอบจะลืมช้ามาก · เป็นค่าประมาณทางสถิติ</div>
    <div class="wk-btns">${shrBtn('mem')}</div></div>`;
}
// 📜 My journey: first day, learned / mastered milestones (from S.snap), medals, level tests passed.
const MILES_M = [10, 50, 100, 250, 500, 1000, 2000, 3000, 4000, 5000], MILES_L = [50, 100, 500, 1000, 2000, 3000, 5000];
function journey() {
  const ev = [], days = Object.keys(S.hist).filter((k) => S.hist[k] > 0).sort();
  if (days[0]) ev.push([days[0], '🌱', 'เริ่มเรียนวันแรก']);
  const snaps = Object.keys(S.snap).sort();
  const first = (i, m) => snaps.find((k) => (S.snap[k] || [])[i] >= m);
  MILES_L.forEach((m) => { const k = first(2, m); if (k) ev.push([k, '📚', `เรียนครบ ${nf(m)} คำ`]); });
  MILES_M.forEach((m) => { const k = first(3, m); if (k) ev.push([k, '🟢', `จำได้ครบ ${nf(m)} คำ`]); });
  for (const a of ACH) { const v = S.ach[a.id]; if (typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v)) ev.push([v, a.icon, `ได้เหรียญ “${a.name}”`]); }
  for (const [lv, r] of Object.entries(S.ltest || {})) if (r && r.n && r.r / r.n * 100 >= LTEST_PASS && r.at) ev.push([ymd(new Date(r.at)), '🎓', `ผ่านทดสอบจบระดับ ${LV_LABEL[lv] || lv}`]);
  return ev.sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
}
function journeyCard() {
  const ev = journey(), head = `<div class="h2">📜 เส้นทางของฉัน <span class="small muted">${ev.length} เหตุการณ์</span></div>`;
  if (!ev.length) return `${head}<div class="card-box small muted" id="jrBox">เริ่มเล่นวันแรก แล้วเหตุการณ์สำคัญจะเรียงอยู่ตรงนี้</div>`;
  const li = ([k, ic, t]) => `<li><span class="jr-ic" aria-hidden="true">${ic}</span><div><b>${esc(t)}</b><small>${thDate(Date.parse(k + 'T12:00:00'))}</small></div></li>`;
  return `${head}<div class="card-box" id="jrBox"><ol class="jr">${ev.slice(0, 10).map(li).join('')}</ol>
    ${ev.length > 10 ? `<details class="act-more"><summary>ดูอีก ${ev.length - 10} เหตุการณ์</summary><ol class="jr">${ev.slice(10).map(li).join('')}</ol></details>` : ''}</div>`;
}
// ⚖️ Review load for the next 14 days (main list): warns about a pile-up and offers to review ahead today.
function loadDays(n = 14) {
  const out = Array(n).fill(0), t0 = Date.parse(today() + 'T00:00:00');
  for (const p of Object.values(S.prog)) { if (!p || !isNum(p.d)) continue; const k = Math.floor((p.d - t0) / DAY); out[Math.max(0, Math.min(n - 1, k))] += k < n ? 1 : 0; }
  return out;
}
function loadCard() {
  const d = loadDays(), avg = d.reduce((a, b) => a + b, 0) / d.length, wk = d.slice(1, 8), peak = Math.max(...wk), pi = wk.indexOf(peak) + 1;
  const head = '<div class="h2">⚖️ งานทบทวน 14 วันข้างหน้า</div>';
  if (!d.some((v) => v)) return `${head}<div class="card-box small muted" id="loadBox">ยังไม่มีการ์ดที่ต้องทบทวน</div>`;
  const spike = peak >= 30 && peak >= avg * 1.6;
  const labs = d.map((v, i) => (i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : `+${i}`));
  const tips = d.map((v, i) => `${i === 0 ? 'วันนี้ (รวมที่ค้าง)' : thDate(Date.now() + i * DAY)} · ${v} ใบ`);
  return `${head}<div class="card-box" id="loadBox">${miniBars(d, labs, tips, 3)}
    <div class="small" style="margin-top:8px">${spike ? `⚠️ อีก ${pi} วัน (${thDate(Date.now() + pi * DAY)}) จะมีการ์ดถึงกำหนด <b>${peak} ใบ</b> มากกว่าปกติ (เฉลี่ย ${Math.round(avg)} ใบ/วัน) ทวนล่วงหน้าวันนี้สักหน่อยจะเกลี่ยงานได้` : `✅ งานกระจายดี เฉลี่ยราว ${Math.round(avg)} ใบ/วัน`}</div>
    ${spike ? '<div class="wk-btns"><button class="btn primary" id="loadAhead">🔮 ทวนล่วงหน้า 20 ใบ</button></div>' : ''}</div>`;
}
// 🐢→🏆 Stubborn words beaten: forgotten LEECH+ times, now remembered for 3+ weeks.
function leechWins() { return W.filter((w) => { const p = S.prog[w.w]; return p && (p.x || 0) >= LEECH && ivlOf(p) >= 21; }); }
function leechWinCard() {
  const ws = leechWins();
  if (!ws.length) return '';
  return `<div class="h2">🏆 คำดื้อที่ชนะได้แล้ว <span class="small muted">${ws.length} คำ</span></div><div class="card-box" id="lwBox">
    <div class="small" style="margin-bottom:8px">คำเหล่านี้เคยลืมตั้งแต่ ${LEECH} ครั้งขึ้นไป แต่ตอนนี้จำได้นานเกิน 3 สัปดาห์แล้ว เก่งมาก! 🎉</div>
    <div class="chips">${ws.slice(0, 40).map((w) => `<button class="chip lw-chip" data-wsi="${w.idx}" lang="en">🏆 ${esc(w.w)} <small class="muted" lang="th">ลืม ${S.prog[w.w].x} ครั้ง</small></button>`).join('')}</div></div>`;
}
// ⏱️ Answer speed (S.wd): average seconds per one-tap answer, words answered right but slowly, words that needed hints.
function speedInfo() {
  let n = 0, ms = 0; const rows = [];
  for (const [w, r] of Object.entries(S.wd || {})) { if (!WORD_BY[w] || !r[0]) continue; n += r[0]; ms += r[1]; rows.push([WORD_BY[w], r]); }
  const avg = n ? ms / n : 0, p = (w) => S.prog[w.w] || {};
  const acc = (w) => { const q = p(w), t = (q.c || 0) + (q.x || 0); return t ? (q.c || 0) / t : 0; };
  const slow = rows.filter(([w, r]) => r[0] >= 3 && r[1] / r[0] > Math.max(4000, avg * 1.6) && acc(w) >= 0.7).sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0]);
  const hint = rows.filter(([, r]) => r[2] >= 3).sort((a, b) => b[1][2] - a[1][2]);
  return { n, avg, slow, hint };
}
function speedCard() {
  const s = speedInfo(), head = '<div class="h2">⏱️ ความเร็วและความคล่อง</div>';
  if (s.n < 20) return `${head}<div class="card-box small muted" id="spdBox">ตอบเกมแบบเลือกคำตอบอีกสักหน่อย (ตอนนี้ ${s.n} ข้อ) แล้วแอปจะบอกได้ว่าคำไหนตอบถูกแต่ยังลังเล (เริ่มเก็บตั้งแต่เวอร์ชัน 1.256.0)</div>`;
  const sec = (r) => (r[1] / r[0] / 1000).toFixed(1);
  return `${head}<div class="card-box" id="spdBox">
    <div class="mf-hero"><b>${(s.avg / 1000).toFixed(1)}<small> วิ</small></b><span>เวลาเฉลี่ยต่อข้อ <span class="muted">(${nf(s.n)} ข้อแบบแตะตอบ)</span></span></div>
    ${s.slow.length ? `<div class="act-h">🐌 ตอบถูกแต่ยังช้า <span class="small muted">ยังไม่คล่องจริง</span></div><div class="chips">${s.slow.slice(0, 12).map(([w, r]) => `<button class="chip" data-wsi="${w.idx}" lang="en">${esc(w.w)} <small class="muted">${sec(r)} วิ</small></button>`).join('')}</div>
      <div class="wk-btns"><button class="btn primary" data-xgo="slow">⚡ ฝึกให้ไวขึ้น (${Math.min(20, s.slow.length)} คำ)</button></div>` : '<div class="small" style="margin-top:6px">✅ ไม่มีคำที่ตอบถูกแต่ช้าผิดปกติ</div>'}
    ${s.hint.length ? `<div class="act-h">💡 คำที่ต้องพึ่งตัวช่วย <span class="small muted">กดฟังซ้ำ / ดูคำแปลประโยค</span></div><div class="chips">${s.hint.slice(0, 12).map(([w, r]) => `<button class="chip" data-wsi="${w.idx}" lang="en">${esc(w.w)} <small class="muted">${r[2]} ครั้ง</small></button>`).join('')}</div>` : ''}</div>`;
}
// 🔁 Recognise vs recall (S.wd): misses when the English is shown / heard against when it has to come from the Thai.
function dirInfo() {
  let rn = 0, rm = 0, cn = 0, cm = 0; const gap = [];
  for (const [w, r] of Object.entries(S.wd || {})) {
    if (!WORD_BY[w]) continue; rn += r[3]; rm += r[4]; cn += r[5]; cm += r[6];
    if (r[5] >= 2 && r[6] / r[5] >= 0.5 && (r[3] === 0 || r[4] / r[3] <= 0.2)) gap.push([WORD_BY[w], r]);
  }
  return { rn, rm, cn, cm, gap: gap.sort((a, b) => b[1][6] - a[1][6]) };
}
function dirCard() {
  const d = dirInfo(), head = '<div class="h2">🔁 รู้จัก vs นึกออก</div>';
  if (d.rn < 10 || d.cn < 10) return `${head}<div class="card-box small muted" id="dirBox">เล่นทั้งเกมที่เห็นคำอังกฤษ (ทายความหมาย ฟังแล้วตอบ) และเกมที่ต้องนึกคำอังกฤษเอง (ทายคำศัพท์ สะกดคำ) อย่างละ 10 ข้อขึ้นไป แล้วแอปจะเทียบให้ดู (เริ่มเก็บตั้งแต่เวอร์ชัน 1.256.0)</div>`;
  const ra = 1 - d.rm / d.rn, ca = 1 - d.cm / d.cn, diff = Math.round((ra - ca) * 100);
  const bar = (t, a, n) => `<div class="act-row"><span class="act-n">${t}</span><span class="act-bar"><i class="a-any" style="width:${Math.max(2, Math.round(a * 100))}%"></i></span><span class="act-v">${Math.round(a * 100)}%<small>${nf(n)} ข้อ</small></span></div>`;
  return `${head}<div class="card-box" id="dirBox"><div class="act-rows">${bar('👀 เห็นคำแล้วรู้ความหมาย', ra, d.rn)}${bar('💭 เห็นคำไทยแล้วนึกคำอังกฤษ', ca, d.cn)}</div>
    <div class="small" style="margin-top:8px">${diff >= 10 ? `💡 “รู้จัก” คำได้ดีกว่า “นึกออก” ${diff} จุด เป็นเรื่องปกติของคนเรียนภาษา ลองเล่นเกมทายคำศัพท์หรือสะกดคำเพิ่ม จะช่วยให้พูดและเขียนได้คล่องขึ้น` : diff <= -10 ? '👍 นึกคำอังกฤษได้ดีมาก ลองฟังให้มากขึ้นเพื่อจำความหมายได้ไวขึ้น' : '✅ รู้จักและนึกออกได้ใกล้เคียงกัน สมดุลดีมาก'}</div>
    ${d.gap.length ? `<div class="act-h">คำที่รู้ความหมายแต่ยังนึกไม่ออก</div><div class="chips">${d.gap.slice(0, 12).map(([w]) => `<button class="chip" data-wsi="${w.idx}" lang="en">${esc(w.w)}</button>`).join('')}</div>
      <div class="wk-btns"><button class="btn primary" data-xgo="recall">💭 ฝึกนึกคำ (${Math.min(20, d.gap.length)} คำ)</button></div>` : ''}</div>`;
}
// 🗣️ What the microphone heard instead (S.heard), with rough sound patterns.
const SOUND_PAT = [
  ['th', 'เสียง th', (w, h) => /th/.test(w) && !/th/.test(h) && /[tdsfz]/.test(h)],
  ['rl', 'เสียง r / l', (w, h) => w.length === h.length && [...w].some((c, i) => (c === 'r' && h[i] === 'l') || (c === 'l' && h[i] === 'r'))],
  ['end', 'เสียงท้ายคำ', (w, h) => h.length < w.length && w.startsWith(h.slice(0, Math.max(2, h.length - 1)))],
  ['v', 'เสียง v / w / b', (w, h) => w.length === h.length && [...w].some((c, i) => c === 'v' && 'wbf'.includes(h[i]))],
];
function heardInfo() {
  const rows = [], pat = {};
  for (const [w, m] of Object.entries(S.heard || {})) for (const [h, n] of Object.entries(m)) {
    if (!WORD_BY[w]) continue; rows.push([WORD_BY[w], h, n]);
    for (const [id, , f] of SOUND_PAT) if (f(w.toLowerCase(), h)) pat[id] = (pat[id] || 0) + n;
  }
  return { rows: rows.sort((a, b) => b[2] - a[2]), pat: SOUND_PAT.filter(([id]) => pat[id]).map(([id, t]) => [t, pat[id]]).sort((a, b) => b[1] - a[1]) };
}
function heardCard() {
  const h = heardInfo();
  if (!h.rows.length) return '';
  return `<div class="h2">🗣️ เสียงที่เครื่องฟังผิด</div><div class="card-box" id="hrdBox">
    ${h.pat.length ? `<div class="small" style="margin-bottom:6px">🎯 เสียงที่ควรฝึก: ${h.pat.map(([t, n]) => `<b>${t}</b> <span class="muted">${n} ครั้ง</span>`).join(' · ')}</div>` : ''}
    ${h.rows.slice(0, 8).map(([w, t, n]) => `<div class="cf-row"><button class="linkish" data-wsi="${w.idx}" lang="en">${esc(w.w)}</button> <span class="muted" aria-hidden="true">→</span> <span class="muted">ได้ยินเป็น</span> “<span lang="en">${esc(t)}</span>” <span class="muted small">· ${n} ครั้ง</span></div>`).join('')}
    <div class="wk-btns">${GAMES.speak ? '<button class="btn primary" data-xgo="speak">🗣️ ฝึกพูดคำเหล่านี้</button>' : ''}</div>
    <div class="small muted" style="margin-top:8px">เก็บแค่ข้อความที่เครื่องได้ยิน ไม่เก็บเสียง · การรู้จำเสียงของเครื่องอาจพลาดเองได้บ้าง</div></div>`;
}
// ✍️ Spelling slips (S.typo) and their patterns.
const isVow = (c) => 'aeiou'.includes(c);
function typoKind(w, t) {
  if (w.replace(/(.)\1/g, '$1') === t.replace(/(.)\1/g, '$1') && w !== t) return 'dbl';
  if (w.length === t.length) {
    const d = [...w].map((c, i) => (c !== t[i] ? i : -1)).filter((i) => i >= 0);
    if (d.length === 2 && d[1] === d[0] + 1 && w[d[0]] === t[d[1]] && w[d[1]] === t[d[0]]) return 'swap';
    if (d.length === 1 && isVow(w[d[0]]) && isVow(t[d[0]])) return 'vow';
  }
  if (t.length === w.length - 1) { for (let i = 0; i < w.length; i++) if (w.slice(0, i) + w.slice(i + 1) === t) return 'miss'; }
  if (t.length === w.length + 1) { for (let i = 0; i < t.length; i++) if (t.slice(0, i) + t.slice(i + 1) === w) return 'extra'; }
  return 'other';
}
const TYPO_NAME = { dbl: 'ตัวอักษรซ้ำ (เช่น ll, ss)', swap: 'สลับตัวอักษรที่ติดกัน', vow: 'สระผิด', miss: 'ตกตัวอักษร', extra: 'เกินมาหนึ่งตัว', other: 'อื่นๆ' };
function typoInfo() {
  const rows = [], kind = {};
  for (const [w, m] of Object.entries(S.typo || {})) for (const [t, n] of Object.entries(m)) {
    if (!WORD_BY[w]) continue; const k = typoKind(w.toLowerCase(), t); rows.push([WORD_BY[w], t, n, k]); kind[k] = (kind[k] || 0) + n;
  }
  return { rows: rows.sort((a, b) => b[2] - a[2]), kind: Object.entries(kind).sort((a, b) => b[1] - a[1]) };
}
function typoCard() {
  const t = typoInfo();
  if (!t.rows.length) return '';
  const tot = t.kind.reduce((a, [, n]) => a + n, 0);
  return `<div class="h2">✍️ สะกดผิดบ่อย</div><div class="card-box" id="typoBox">
    <div class="small" style="margin-bottom:6px">แบบที่พลาดบ่อย: ${t.kind.slice(0, 3).map(([k, n]) => `<b>${TYPO_NAME[k]}</b> <span class="muted">${aPct(n, tot)}%</span>`).join(' · ')}</div>
    ${t.rows.slice(0, 8).map(([w, x, n]) => `<div class="cf-row"><button class="linkish" data-wsi="${w.idx}" lang="en">${esc(w.w)}</button> <span class="muted">พิมพ์เป็น</span> <s lang="en">${esc(x)}</s> <span class="muted small">· ${n} ครั้ง</span></div>`).join('')}
    <div class="wk-btns"><button class="btn primary" data-xgo="spell">✍️ ฝึกสะกดคำเหล่านี้</button></div></div>`;
}
// 📖 Reading speed (S.rspd): words per minute of each first read, trend, words looked up per 100.
function readSpeedCard() {
  const r = (S.rspd || []).filter((x) => x[2] > 0);
  if (!r.length) return '';
  const wpm = (x) => x[1] / (x[2] / 60), last = r.slice(-5), first = r.slice(0, 5);
  const avg = (a) => a.reduce((t, x) => t + wpm(x), 0) / a.length, look = r.reduce((t, x) => t + x[3], 0) / r.reduce((t, x) => t + x[1], 0) * 100;
  const up = r.length >= 6 ? Math.round(avg(last) - avg(first)) : null;
  const bars = r.slice(-14).map(wpm);
  return `<div class="h2">📖 ความเร็วอ่าน <span class="small muted">${r.length} เรื่อง</span></div><div class="card-box" id="rspdBox">
    <div class="mf-hero"><b>${Math.round(avg(last))}<small> คำ/นาที</small></b><span>เฉลี่ย 5 เรื่องล่าสุด${up != null ? ` · <span class="cmp ${up >= 0 ? 'up' : 'down'}">${up >= 0 ? '▲' : '▼'} ${Math.abs(up)}</span> เทียบช่วงแรก` : ''}</span></div>
    ${miniBars(bars, bars.map((_, i) => String(i + 1)), r.slice(-14).map((x) => `${thDate(Date.parse(x[0] + 'T12:00:00'))} · ${Math.round(wpm(x))} คำ/นาที · แตะดูคำ ${x[3]} คำ`), 1)}
    <div class="small muted" style="margin-top:8px">แตะดูความหมายเฉลี่ย ${look.toFixed(1)} คำ ต่อ 100 คำ · นับเวลาตั้งแต่เปิดเรื่องจนตอบคำถามครบ (เฉพาะครั้งแรกที่อ่าน)</div></div>`;
}
// 🚪 Games left before the end (S.gq).
function quitCard() {
  const rows = Object.entries(S.gq || {}).filter(([g, r]) => GAMES[g] && r[0] + r[1] >= 5).map(([g, r]) => [g, r[1] / (r[0] + r[1]), r]).filter((x) => x[1] >= 0.3).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  return `<div class="h2">🚪 เกมที่มักออกก่อนจบ</div><div class="card-box" id="quitBox">
    ${rows.slice(0, 5).map(([g, q, r]) => `<div class="act-row"><span class="act-n">${GAMES[g].icon} ${esc(GAMES[g].name)}</span><span class="act-bar"><i class="a-any" style="width:${Math.round(q * 100)}%"></i></span><span class="act-v">${Math.round(q * 100)}%<small>ออก ${r[1]} จาก ${r[0] + r[1]} รอบ${r[2] ? ` · หลังตอบผิด ${r[2]}` : ''}</small></span></div>`).join('')}
    <div class="small muted" style="margin-top:8px">ถ้าออกเพราะยากไป ลองลดความยากในหน้าเมนูเกม หรือเลือกคำจากระดับที่ง่ายลง</div></div>`;
}
// 📱 Device and orientation (x.dv) + what the day starts with (x.f), last 90 / 28 days.
const DV_NAME = { phone: '📱 มือถือ', tablet: '📲 แท็บเล็ต', desk: '💻 คอมพิวเตอร์' };
function deviceCard() {
  const dv = {}, first = {};
  for (let k = 0; k < 90; k++) {
    const x = (S.act[dayKey(k)] || {}).x; if (!x) continue;
    for (const [id, v] of Object.entries(x.dv || {})) { const t = dv[id] || (dv[id] = [0, 0, 0, 0]); v.forEach((y, i) => { t[i] += y; }); }
    if (x.f && k < 28) first[x.f] = (first[x.f] || 0) + 1;
  }
  const rows = Object.entries(dv).sort((a, b) => b[1][0] - a[1][0]), fl = Object.entries(first).sort((a, b) => b[1] - a[1]);
  if (!rows.length && !fl.length) return '';
  const top = Math.max(1, ...rows.map(([, v]) => v[0]));
  const name = (id) => { const [d, o] = id.split('-'); return `${DV_NAME[d] || d} ${o === 'l' ? 'แนวนอน' : 'แนวตั้ง'}`; };
  return `<div class="h2">📱 เล่นที่ไหน เริ่มด้วยอะไร</div><div class="card-box" id="dvBox">
    ${rows.length ? `<div class="act-h">อุปกรณ์และท่าถือ <span class="small muted">90 วัน</span></div><div class="act-rows">${rows.map(([id, v]) => `<div class="act-row"><span class="act-n">${name(id)}</span><span class="act-bar"><i class="a-any" style="width:${Math.max(2, Math.round(v[0] / top * 100))}%"></i></span><span class="act-v">${nf(v[0])} ข้อ<small>${v[2] ? `ถูก ${aPct(v[3], v[2])}%` : ''}</small></span></div>`).join('')}</div>` : ''}
    ${fl.length ? `<div class="act-h">เปิดแอปแล้วเริ่มด้วย <span class="small muted">28 วัน</span></div><div class="small">${fl.slice(0, 4).map(([id, n]) => `${esc(actName(id))} <span class="muted">${n} วัน</span>`).join(' · ')}</div>` : ''}</div>`;
}
// 🔍 Searches with no result (S.smiss): ideas for words to add.
function smissCard() {
  const r = Object.entries(S.smiss || {}).sort((a, b) => b[1] - a[1]);
  if (!r.length) return '';
  return `<div class="h2">🔍 ค้นแล้วไม่เจอ</div><div class="card-box" id="smBox"><div class="chips">${r.slice(0, 20).map(([t, n]) => `<span class="chip">${esc(t)} <small class="muted">${n}</small></span>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">คำเหล่านี้ยังไม่มีในแอป บอกผู้พัฒนาได้ว่าอยากให้เพิ่มคำไหน · เพิ่มเองได้ที่ “เก็บคำจากบทความ” หรือชุดของฉัน</div></div>`;
}
// 😊 Mood (S.mood): today's pick and accuracy by mood.
const MOODS = [['😴', 'เหนื่อย'], ['😐', 'เฉยๆ'], ['😄', 'สดใส']];
function moodCard() {
  const m = S.mood || {}, cur = m[today()], acc = MOODS.map(() => [0, 0, 0]);
  for (const [k, v] of Object.entries(m)) { const a = actDay(k); if (a && a.jd) { acc[v][0] += a.jd; acc[v][1] += a.ok; acc[v][2]++; } }
  const used = acc.filter((a) => a[2] >= 2).length;
  return `<div class="h2">😊 อารมณ์ตอนเล่น</div><div class="card-box" id="moodBox">
    <div class="small" style="margin-bottom:6px">วันนี้รู้สึกอย่างไร</div>
    <div class="chips" role="group" aria-label="อารมณ์วันนี้">${MOODS.map(([ic, t], i) => `<button class="chip${cur === i ? ' on' : ''}" data-mood="${i}" aria-pressed="${cur === i}"><span aria-hidden="true">${ic}</span> ${t}</button>`).join('')}</div>
    ${used >= 2 ? `<div class="act-rows" style="margin-top:10px">${MOODS.map(([ic, t], i) => acc[i][2] ? `<div class="act-row"><span class="act-n">${ic} ${t}</span><span class="act-bar"><i class="a-any" style="width:${aPct(acc[i][1], acc[i][0])}%"></i></span><span class="act-v">ถูก ${aPct(acc[i][1], acc[i][0])}%<small>${acc[i][2]} วัน</small></span></div>` : '').join('')}</div>`
      : '<div class="small muted" style="margin-top:8px">เลือกอารมณ์ในวันที่เล่นสักหลายวัน แล้วแอปจะเทียบว่าอารมณ์มีผลกับ % ตอบถูกไหม</div>'}</div>`;
}
// 🆚 This month against last month, row by row, a 🏆 for the winner.
function vsCard() {
  const a = monthStats(0), b = monthStats(1);
  if (!b.total) return '';
  const rows = [['📅 วันที่เล่น', a.active, b.active], ['✏️ ข้อที่ทำ', a.total, b.total], ['📚 คำใหม่', a.learned, b.learned], ['🟢 จำได้เพิ่ม', a.mastered, b.mastered], ['🔥 เล่นติดกันนานสุด', a.streak, b.streak]].filter((r) => r[1] != null && r[2] != null);
  const win = rows.filter((r) => r[1] > r[2]).length, lose = rows.filter((r) => r[1] < r[2]).length;
  return `<div class="h2">🆚 เดือนนี้ vs เดือนที่แล้ว</div><div class="card-box" id="vsBox">
    <div class="mf-hero"><b>${win} : ${lose}</b><span>${win > lose ? '🏆 เดือนนี้กำลังชนะ!' : win < lose ? 'เดือนที่แล้วยังนำอยู่ สู้ๆ 💪' : 'สูสีกันมาก'}${a.days < 28 ? ` <span class="muted">(ผ่านมา ${a.days} วัน)</span>` : ''}</span></div>
    <table class="g-table vs-t"><tr><th></th><th>เดือนนี้</th><th>เดือนที่แล้ว</th></tr>${rows.map(([t, x, y]) => `<tr><td>${t}</td><td>${x > y ? '🏆 ' : ''}<b>${nf(x)}</b></td><td>${y > x ? '🏆 ' : ''}${nf(y)}</td></tr>`).join('')}</table>
    <div class="wk-btns">${shrBtn('vs')}</div></div>`;
}
// 🌳 Word forest: one dot per word of the 5000 list, coloured by status, a row block per level (canvas, lazy).
function treeBox() {
  const lv = [...LEVELS_3000, ...LEVELS_5000], cnt = { n: 0, l: 0, m: 0 };
  lv.forEach((l) => W.forEach((w) => { if (w.g !== l) return; const s = status(w); cnt[s === 'mastered' ? 'm' : S.prog[w.w] ? 'l' : 'n']++; }));
  return `<div class="small muted" style="margin-bottom:6px">1 จุด = 1 คำ · <span class="key bm"></span>จำได้แล้ว ${nf(cnt.m)} · <span class="key bl"></span>กำลังเรียน ${nf(cnt.l)} · ยังไม่เริ่ม ${nf(cnt.n)}</div>
    <canvas class="tree-c" role="img" aria-label="คำศัพท์ชุด 5000: จำได้แล้ว ${cnt.m} กำลังเรียน ${cnt.l} ยังไม่เริ่ม ${cnt.n} คำ"></canvas>`;
}
function paintTree(el) {
  const cv = el.querySelector('canvas'); if (!cv) return;
  const cs = getComputedStyle(document.documentElement), col = (k, d) => cs.getPropertyValue(k).trim() || d;
  const cM = col('--good', '#22a06b'), cL = col('--warn', '#f0a020'), cN = col('--border', '#ccc'), ink = col('--muted', '#777');
  const Wd = Math.max(240, el.clientWidth - 4), dot = Wd >= 600 ? 6 : 5, gap = 1, per = Math.floor(Wd / (dot + gap)), lv = [...LEVELS_3000, ...LEVELS_5000];
  const groups = lv.map((l) => [l, W.filter((w) => w.g === l)]).filter(([, ws]) => ws.length);
  const H = groups.reduce((h, [, ws]) => h + 16 + Math.ceil(ws.length / per) * (dot + gap) + 6, 0);
  const dpr = window.devicePixelRatio || 1;
  cv.width = Wd * dpr; cv.height = H * dpr; cv.style.width = Wd + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let y = 0;
  for (const [l, ws] of groups) {
    g.fillStyle = ink; g.font = '600 11px system-ui, sans-serif'; g.fillText(LV_LABEL[l] || l, 0, y + 11); y += 16;
    ws.forEach((w, i) => { const s = status(w); g.fillStyle = s === 'mastered' ? cM : S.prog[w.w] ? cL : cN; g.fillRect((i % per) * (dot + gap), y + Math.floor(i / per) * (dot + gap), dot, dot); });
    y += Math.ceil(ws.length / per) * (dot + gap) + 6;
  }
}
// 📸 Share a stats card as a picture (drawCard in js/share.js).
const SHR = {
  mem: () => { const c = memCurve(); return { title: '🧠 ความจำของฉัน', sub: thDate(Date.now()), hero: nf(c.pts[0]), heroLabel: 'คำที่นึกออกตอนนี้', tiles: [[nf(c.n), 'คำที่เคยทบทวน'], [nf(snap5(S.snap[today()])[1]), 'จำได้แล้ว (ชุด 5000)'], [nf(c.pts[30]), 'ถ้าหยุด 30 วัน'], ['🔥 ' + streakNow(), 'วันติดต่อกัน']] }; },
  vs: () => { const a = monthStats(0), b = monthStats(1); return { title: '🆚 เดือนนี้ vs เดือนที่แล้ว', sub: thDate(Date.now()), hero: `${nf(a.total)}`, heroLabel: `ข้อที่ทำเดือนนี้ (เดือนก่อน ${nf(b.total)})`, tiles: [[a.active, 'วันที่เล่น'], [nf(a.learned || 0), 'คำใหม่'], [nf(a.mastered || 0), 'จำได้เพิ่ม'], [a.streak, 'ติดกันนานสุด']] }; },
};
function xGo(k) {
  let list = [], game = 'en2th';
  if (k === 'slow') { list = speedInfo().slow.map(([w]) => w); game = 'en2th'; }
  if (k === 'recall') { list = dirInfo().gap.map(([w]) => w); game = 'th2en'; }
  if (k === 'speak') { list = heardInfo().rows.map(([w]) => w); game = 'speak'; }
  if (k === 'spell') { list = typoInfo().rows.map(([w]) => w); game = 'spell'; }
  customWords = [...new Set(list)].slice(0, 20);
  if (customWords.length < 4) customWords = [...new Set(customWords.concat(pool().slice(0, 6)))];
  gameSource = 'custom';
  startGame(game);
}
function bindStatY() {
  const sheet = (e) => { const b = e.target.closest('[data-wsi]'); if (b && W[+b.dataset.wsi]) openSheet(W[+b.dataset.wsi]); };
  ['#lwBox', '#spdBox', '#dirBox', '#hrdBox', '#typoBox'].forEach((id) => { const el = $(id); if (el) el.addEventListener('click', sheet); });
  view.querySelectorAll('[data-xgo]').forEach((b) => { b.onclick = () => xGo(b.dataset.xgo); });
  view.querySelectorAll('[data-shr]').forEach((b) => { b.onclick = () => shareWithPicker((tpl, art) => drawCard(SHR[b.dataset.shr](), tpl, art), `essential-vocab-${b.dataset.shr}-${today()}.png`, 'สถิติของฉัน', () => toast('บันทึกภาพแล้ว ✅')); });
  const la = $('#loadAhead'); if (la) la.onclick = () => go('cards', 'ahead');
  bindMood();
}
function bindMood() {
  const mb = $('#moodBox'); if (!mb) return;
  mb.onclick = (e) => { const b = e.target.closest('[data-mood]'); if (!b) return; S.mood[today()] = +b.dataset.mood; save(); mb.outerHTML = moodCard(); bindMood(); toast('บันทึกอารมณ์วันนี้แล้ว'); const nb = $(`#moodBox [data-mood="${b.dataset.mood}"]`); if (nb) nb.focus(); };
}
