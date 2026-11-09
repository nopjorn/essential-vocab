'use strict';
// Stats page: habits, projections, charts, monthly summary, sticker book.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- stats & projections ---------- */
// Function (not a const) so save() can call takeSnap() at any point during startup.
function in3000() { return in3000.set || (in3000.set = new Set(W.filter((w) => LEVELS_3000.includes(w.g)).map((w) => w.w))); }
// Daily snapshot of how many words are learned/mastered, for the trend chart.
function takeSnap() {
  let l3 = 0, m3 = 0, la = 0, ma = 0;
  for (const [w, p] of Object.entries(S.prog)) {
    const m = p.b >= MASTERED;
    la++; if (m) ma++;
    if (in3000().has(w)) { l3++; if (m) m3++; }
  }
  S.snap[today()] = [l3, m3, la, ma];
}
const dayKey = (k) => ymd(new Date(Date.now() - k * DAY)); // k days ago
// Thai dates by hand (1.126), same text as toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) ("11 ธ.ค. 69"):
// building the Thai Intl formatter cost 50–65 ms of start-up at 4× CPU.
const TH_MON_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FMT = { format: (d) => TH_MON_SHORT[d.getMonth()] };
const thDate = (ms) => { const d = new Date(ms); return `${d.getDate()} ${TH_MON_SHORT[d.getMonth()]} ${String((d.getFullYear() + 543) % 100).padStart(2, '0')}`; };
const durTxt = (d) => (d < 45 ? `${Math.round(d)} วัน` : d < 365 * 1.5 ? `${Math.round(d / 30)} เดือน` : `${(d / 365).toFixed(1)} ปี`);

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

// 💼 TOEIC by part (1.193.0): accuracy (S.lex c / s of the part's questions), questions met, ones due, days since last played (S.glast),
// the weakest part (lowest accuracy among parts with ≥ 8 answers) and parts left alone for 7+ days. Buttons start a part.
function toeicStat(g) {
  let seen = 0, ans = 0, ok = 0, due = 0;
  const now = Date.now();
  for (const [k, p] of Object.entries(S.lex)) {
    if (!k.startsWith(g + ':')) continue;
    seen++; ans += p.s || 0; ok += p.c || 0; if (p.d <= now) due++;
  }
  const last = (S.glast || {})[g];
  const ago = last ? Math.round((new Date(today()) - new Date(last)) / DAY) : null;
  return { g, seen, ans, ok, due, ago, acc: ans ? ok / ans : null };
}
// last mock tests (S.mock): latest score, best, and the last five totals as small bars
function mockLine() {
  const m = S.mock || [];
  if (!m.length) return '<div class="small muted" style="margin-top:6px">🏁 ยังไม่เคยทำข้อสอบจำลอง: 30 ข้อครบ 7 พาร์ต ราว 18 นาที แล้วดูคะแนนคร่าวๆ</div>';
  const last = m[m.length - 1], tot = (x) => x.L + x.R, best = Math.max(...m.map(tot)), five = m.slice(-5);
  return `<div class="mock-line" style="margin-top:8px"><div class="small">🏁 ข้อสอบจำลองล่าสุด <b>${tot(last)}</b>/990 (ฟัง ${last.L} · อ่าน ${last.R}) · ดีที่สุด ${best} · ทำไป ${m.length} ครั้ง</div>
    <div class="mock-bars" role="img" aria-label="คะแนน ${five.length} ครั้งล่าสุด ${five.map(tot).join(', ')}">${five.map((x) => `<i style="height:${Math.max(6, tot(x) / 990 * 40)}px" title="${tot(x)}"></i>`).join('')}</div></div>`;
}
// TOEIC study plan for an exam goal whose name says TOEIC (1.197.0, home exam card): today's parts by phase — > 60 days: 2 parts,
// 15–60: 3 parts, ≤ 14: 3 parts + a mock every other day (also from 21 days), ≤ 1 day: one light part. Parts with due questions
// come first, then the least accurate, then the longest left alone. A task is ticked when that game was played today (S.glast).
const isToeicGoal = (name) => /toeic/i.test(name || '');
function toeicPlan(days) {
  const t = today();
  const parts = TOEIC_GAMES.filter((g) => GAMES[g] && g !== 'toeicMock').map(toeicStat)
    .sort((a, b) => (b.due > 0) - (a.due > 0) || (a.acc == null ? -1 : a.acc) - (b.acc == null ? -1 : b.acc) || (b.ago == null ? 999 : b.ago) - (a.ago == null ? 999 : a.ago));
  const phase = days <= 1 ? ['🌙', 'ทวนเบาๆ ก่อนสอบ', 'คืนนี้พักผ่อนให้พอ ไม่ต้องอัดเพิ่มแล้ว'] : days <= 14 ? ['🔥', 'โค้งสุดท้าย', 'ทำข้อสอบจำลองวันเว้นวัน แล้วเก็บพาร์ตที่ยังพลาด']
    : days <= 60 ? ['💪', 'ฝึกเข้ม', 'วันละ 3 พาร์ต เน้นพาร์ตที่ถึงกำหนดทวนและยังไม่แม่น'] : ['🌱', 'ปูพื้นฐาน', 'วันละ 2 พาร์ต ควบคู่กับเรียนศัพท์ชุด TOEIC'];
  // the day's list is fixed at its first look (device memory o3k.tplan), so playing a part does not swap it out of the list
  let mem = null;
  try { mem = JSON.parse(localStorage.getItem('o3k.tplan') || 'null'); } catch (e) { mem = null; }
  let tasks = mem && mem.d === t && mem.days === days && Array.isArray(mem.g) ? mem.g.filter((g) => GAMES[g]) : null;
  if (!tasks || !tasks.length) {
    tasks = parts.slice(0, days <= 1 ? 1 : days <= 60 ? 3 : 2).map((r) => r.g);
    const lastMock = (S.mock || []).length ? S.mock[S.mock.length - 1].t : 0;
    if (days > 1 && days <= 21 && Date.now() - lastMock > 1.5 * DAY) tasks.unshift('toeicMock');
    try { localStorage.setItem('o3k.tplan', JSON.stringify({ d: t, days, g: tasks })); } catch (e) { /* private mode: recomputed next time */ }
  }
  return { phase, tasks: tasks.map((g) => ({ g, done: (S.glast || {})[g] === t })) };
}
function toeicPlanHtml(days) {
  const p = toeicPlan(days);
  return `<div class="toeic-plan"><div class="small"><b>${p.phase[0]} แผน TOEIC วันนี้ · ${p.phase[1]}</b></div><div class="small muted">${p.phase[2]}</div>
    <div class="tp-list">${p.tasks.map((x) => `<button class="tp-item${x.done ? ' done' : ''}" data-tplan="${x.g}"><span aria-hidden="true">${x.done ? '✅' : GAMES[x.g].icon}</span>${esc(GAMES[x.g].name)}</button>`).join('')}</div></div>`;
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
  const sets = [
    { name: 'ชุด 3000 คำ', total: in3000().size, l: snap[0], m: snap[1] },
    { name: 'ครบทุกคำในแอป', total: W.length, l: snap[2], m: snap[3] },
  ];
  const etaCard = (st) => {
    const d = etaDays(st.total, st.l, rate, h);
    const pl = st.l / st.total * 100, pm = st.m / st.total * 100;
    const when = st.m >= st.total ? '🎉 จำได้ครบแล้ว!'
      : d == null ? 'เริ่มเล่นสักสองสามวัน แล้วแอปจะคาดการณ์ให้'
      : `คาดว่าจำได้ครบราว <b>${thDate(Date.now() + d * DAY)}</b> <span class="muted">(อีก ~${durTxt(d)})</span>`;
    return `<div class="card-box">
      <div class="row" style="justify-content:space-between"><b>${st.name}</b><span class="small muted">${st.total.toLocaleString()} คำ</span></div>
      <div class="bar eta-bar" style="margin:10px 0 6px"><div class="l" style="width:${pl}%"></div><div class="m" style="width:${pm}%"></div></div>
      <div class="small muted"><span class="key m"></span>จำได้แล้ว ${st.m.toLocaleString()} (${pm.toFixed(0)}%) &nbsp; <span class="key l"></span>เรียนแล้ว ${st.l.toLocaleString()} (${pl.toFixed(0)}%)</div>
      <div style="margin-top:10px">${when}</div></div>`;
  };
  const opts = [10, 20, 30, 50];
  if (!opts.includes(newGoal())) opts.push(newGoal()), opts.sort((a, b) => a - b);
  const ratio = h.ratio || 1;
  const whatIf = opts.map((n) => {
    const r = n === newGoal() && rate > 0 ? rate : n * ratio; // current setting: same rate as the cards above
    const e3 = etaDays(in3000().size, snap[0], r, { ...h, ratio }), e5 = etaDays(W.length, snap[2], r, { ...h, ratio });
    const cell = (e, m, t) => (m >= t ? '✓ ครบแล้ว' : `${durTxt(e)}`);
    return `<tr class="${n === newGoal() ? 'cur' : ''}"><td>${n}${n === newGoal() ? ' (ตอนนี้)' : ''}</td><td>${cell(e3, snap[1], in3000().size)}</td><td>${cell(e5, snap[3], W.length)}</td><td>~${n * 5}</td></tr>`;
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
  const lvRest = [...LEVELS_3000, ...LEVELS_5000, ...LEVELS_EXTRA].filter((l) => !lvOn(l));
  const lvRows = lvSet('ชุด 3000 คำ', 'คำหลัก', LEVELS_3000, 8) + lvSet('ชุด 5000 คำ', 'คำเพิ่มเติม', LEVELS_5000, 12) + lvSet('ชุดเสริม', 'TOEIC · วิชาการ · ธุรกิจ · IT · สุขภาพ', LEVELS_EXTRA, 12)
    + (lvRest.length ? `<details class="lv-more"><summary>ระดับอื่นที่ยังไม่ได้เริ่ม (${lvRest.map((l) => LV_LABEL[l]).join(' · ')})</summary>${lvRest.map(lvRow).join('')}</details>` : '');

  view.innerHTML = `
    ${starterCard()}
    ${statNav()}
    ${statSum(snap, rate, h)}
    ${levelCard()}
    <div id="todayHost">${todayCard()}</div>
    ${weekCmpCard()}
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
    ${growthCard()}
    <div id="readyHost"></div>
    <div class="h2">ความคืบหน้าแต่ละระดับ</div>
    <div class="card-box">${lvRows}
      <div class="small muted" style="margin-top:8px"><span class="key bl"></span>เรียนแล้ว &nbsp; <span class="key bm"></span>จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div></div>
    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}${forecast30()}</div>
    ${retCard()}
    ${memCard()}
    ${lvAccCard()}
    ${weakCard()}
    ${hardCard()}
    ${skillCard()}
    ${toeicCard()}
    <div class="h2">🗓️ ปฏิทินการเล่น 12 เดือน</div>
    <div class="card-box" data-lz="heat" style="min-height:200px"></div>

    ${boardSection()}
    <div class="h2">สรุปรายสัปดาห์</div>
    <div class="card-box"><b>สัปดาห์นี้</b>${weekBox(0)}</div>
    <div class="card-box"><b>สัปดาห์ที่แล้ว</b>${weekBox(1)}</div>
    <div class="h2">สรุปรายเดือน</div>
    <div class="card-box"><b>เดือนนี้</b>${monthBox(0)}</div>
    ${monthStats(1).total ? `<div class="card-box"><b>เดือนที่แล้ว</b>${monthBox(1)}</div>` : ''}

    <div class="h2">📝 แบบทดสอบประจำเดือน</div>
    <div class="card-box">${mtestSummary()}<button class="btn primary block" data-go="mtest" style="margin-top:10px">${S.mtest[monthKey()] ? 'ทำอีกครั้ง' : 'ทำแบบทดสอบเดือนนี้'}</button></div>

    <div class="card-box row share-row"><button class="btn primary" id="shareProg">📤 แชร์ความก้าวหน้า</button><button class="btn" id="statCsv">📊 ส่งออกสถิติ CSV</button><button class="btn" data-go="year" data-year="${yearToShow() || new Date().getFullYear()}">🎊 สรุปปี</button></div>
    <div class="h2">🎓 ทดสอบจบระดับ</div>
    ${levelTestBox()}

    <div class="h2">แนวโน้มคำศัพท์</div>
    <div class="card-box chart-host" data-lz="trend" data-chart="trend" style="min-height:260px"></div>

    <div class="h2">คาดการณ์ว่าจะจำได้ครบเมื่อไร</div>
    ${rate > 0 ? `<p class="small muted" style="margin:-4px 4px 10px">คิดจากที่เรียนคำใหม่ได้ราว <b>${rate.toFixed(1)} คำ/วัน</b>${measured ? ' (วัดจากความคืบหน้าจริง)' : ` (ประมาณจากเป้า ${newGoal()} คำ × เล่น ${h.active}/${h.span} วัน)`} และความแม่นยำ ${Math.round(h.acc * 100)}%</p>` : ''}
    ${sets.map(etaCard).join('')}

    <div class="h2">ถ้าปรับจำนวนคำใหม่ต่อวัน</div>
    <div class="card-box">
      <table class="g-table whatif"><tr><th>คำใหม่/วัน</th><th>ครบ 3000</th><th>ครบทุกคำ</th><th>ทบทวน/วัน</th></tr>${whatIf}</table>
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
  masonry([view], '.row, .st-nav, .st-sum, .m-sec:has([data-lz="heat"], #ach), [data-lz="stk"]');
  bindStatNav();
}

// Jump bar (1.165.0): the stats page runs to ~11 screens, so a sticky row of chips jumps to each part and lights the one in
// view. Targets are found by their heading's text (the cards come from many functions), a missing one just hides its chip.
const STAT_NAV = [['today', '☀️', 'วันนี้', '#todayHost'], ['habit', '📊', 'นิสัย', 'นิสัยการเล่น'], ['lv', '📈', 'ระดับ', 'ความคืบหน้าแต่ละระดับ'],
  ['due', '📅', 'ทบทวน', '📅 การ์ดที่ต้องทบทวน'], ['weak', '🎯', 'จุดอ่อน', '🎯 ความแม่นแยกตามระดับ'], ['toeic', '💼', 'TOEIC', '💼 TOEIC'], ['cal', '🗓️', 'ปฏิทิน', '🗓️ ปฏิทินการเล่น'],
  ['sum', '🧾', 'สรุป', 'สรุปรายสัปดาห์'], ['test', '📝', 'ทดสอบ', '📝 แบบทดสอบประจำเดือน'], ['future', '🔮', 'คาดการณ์', 'แนวโน้มคำศัพท์'], ['award', '🏅', 'รางวัล', '🏅 เหรียญรางวัล']];
const statNav = () => `<nav class="st-nav" aria-label="ไปยังหัวข้อในหน้าสถิติ">${STAT_NAV.map(([k, ic, t]) => `<button class="chip" data-sec="${k}"><span aria-hidden="true">${ic}</span> ${t}</button>`).join('')}</nav>`;
function statTargets() {
  const heads = [...view.querySelectorAll('.h2')];
  return STAT_NAV.map(([k, , , f]) => {
    const el = f.startsWith('#') ? view.querySelector(f) : heads.find((h) => h.textContent.trim().startsWith(f));
    return [k, el && (el.closest('.m-sec') || el)];
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
      <div><b>${snap[3].toLocaleString()}</b><span>🟢 จำได้แล้ว</span></div>
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
let actMetric = 'n', actSpan = 7;
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
  const big = Wd >= 520, H = big ? 180 : 130, top = 8, bot = big ? 26 : 22, n = 28, gap = big ? 4 : 3;
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
  const ticks = [0, 7, 14, 21, 27].map((i) => `<text class="ax" x="${i * (bw + gap) + bw / 2}" y="${H - 7}" text-anchor="middle">${i === 27 ? 'วันนี้' : `${27 - i} วันก่อน`}</text>`).join('');
  const sw = `<div class="chips trend-range" role="group" aria-label="แสดงเป็น">${[['n', 'จำนวนข้อ'], ['sec', 'เวลา (นาที)']].map(([id, t]) => `<button class="chip${actMetric === id ? ' on' : ''}" data-am="${id}" aria-pressed="${actMetric === id}">${t}</button>`).join('')}</div>`;
  const leg = [...ACT_CATS, ['unk', 'ยังไม่แยกประเภท']].filter(([id]) => used.has(id)).map(([id, t]) => `<span><i class="a-${id}"></i>${t}</span>`).join('');
  return `${sw}<div class="chart${big ? ' big' : ''}"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="กิจกรรมต่อวัน 28 วัน แยกตามประเภท${sec ? ' (นาที)' : ''}">
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
  if (all.length < 2) {
    return `<div class="small muted">📊 แอปเริ่มเก็บข้อมูลแนวโน้มตั้งแต่วันนี้ เล่นต่ออีกวันสองวันแล้วกราฟเส้นจะขึ้นตรงนี้</div>
      <div style="margin-top:8px">ตอนนี้: เรียนแล้ว <b>${S.snap[today()][2]}</b> คำ · จำได้แล้ว <b>${S.snap[today()][3]}</b> คำ</div>`;
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
  const hi0 = Math.max(10, ...keys.map((k) => S.snap[k][2])), lo0 = range === 'all' ? 0 : Math.min(...keys.map((k) => S.snap[k][3]));
  const step = niceStep(hi0 - lo0, big ? 4 : 3);
  const lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step; if (hi <= lo) hi = lo + step;
  const px = (k) => left + (Wd - left - right) * (Date.parse(k + 'T12:00:00') - t0) / span;
  const py = (v) => H - bot - (H - bot - top) * (v - lo) / (hi - lo);
  const grid = [];
  for (let v = lo; v <= hi; v += step) grid.push(`<line class="${v === lo ? 'base' : 'grid'}" x1="${left}" x2="${Wd - right}" y1="${py(v)}" y2="${py(v)}"/><text class="ax" x="${left - 8}" y="${py(v) + 4}" text-anchor="end">${v.toLocaleString()}</text>`);
  const line = (i, cls) => `<polyline class="${cls}" points="${keys.map((k) => `${px(k).toFixed(1)},${py(S.snap[k][i]).toFixed(1)}`).join(' ')}"/>`;
  const last = keys[keys.length - 1], F = S.snap[keys[0]], L = S.snap[last];
  const dot = (v, cls) => `<circle class="${cls}" cx="${px(last)}" cy="${py(v)}" r="${big ? 5 : 4}"/>`;
  const hits = keys.map((k, i) => {
    const x0 = i ? (px(keys[i - 1]) + px(k)) / 2 : 0, x1 = i < keys.length - 1 ? (px(k) + px(keys[i + 1])) / 2 : Wd;
    return `<rect class="hit" data-x="${px(k)}" data-tip="${thDate(Date.parse(k + 'T12:00:00'))}: เรียนแล้ว ${S.snap[k][2]} · จำได้ ${S.snap[k][3]}" x="${x0}" y="0" width="${x1 - x0}" height="${H}"/>`;
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
function levelTestBox() {
  return `<div class="card-box">${LEVELS.map((lv) => {
    const p = levelProgress(lv), t = S.ltest[lv], ok = p.f >= LTEST_NEED;
    return `<div class="wrow lt-row"><div class="grow"><b>${LV_LABEL[lv]}</b> <span class="small muted">· เรียนแล้ว ${Math.round(p.f * 100)}%${t ? ` · ดีที่สุด ${pct(t)}%${pct(t) >= LTEST_PASS ? ' 🎓 ผ่านแล้ว' : ''}` : ''}</span></div>
      <button class="chip" data-lt="${lv}" ${ok ? '' : 'disabled'} aria-label="ทดสอบจบ ${LV_LABEL[lv]}">${ok ? (t ? 'ทำอีกครั้ง' : 'ทดสอบ') : `ต้องเรียน ${Math.round(LTEST_NEED * 100)}%`}</button></div>`;
  }).join('')}<div class="small muted" style="margin-top:8px">เรียนครบ 80% ของระดับไหนก็ทดสอบจบระดับนั้นได้ ผ่านเมื่อได้ ${LTEST_PASS}% ขึ้นไป</div></div>`;
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
