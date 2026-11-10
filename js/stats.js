'use strict';
// Stats page — eager part: start-up helpers (snapshot, Thai dates, TOEIC plan for home) + loader stubs.
// The page itself (habits, charts, day page, heatmap, monthly / level test) is data/app/stats.js, lazy-loaded (1.236).
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

/* ---------- lazy stats page (1.236) ---------- */
// The stats page lives in data/app/stats.js and loads the first time one of its routes opens (idle prefetch in boot.js makes that
// wait rare). The stubs below load it and call the real functions, which replace them as globals.
let statsOn = false;
function loadStats() {
  if (statsOn) return Promise.resolve(true);
  return new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'data/app/stats.js?v=' + APP_VERSION;
    sc.onload = () => { statsOn = true; res(true); };
    sc.onerror = () => { sc.remove(); res(false); };
    document.head.appendChild(sc);
  });
}
function statsStub(fn, route, args) {
  withLoading(loadStats()).then((ok) => {
    if (current !== route) return;
    if (ok) return window[fn](...args);
    view.innerHTML = `<div class="card-box">${emptyArt({ kind: 'empty', title: 'โหลดหน้าสถิติไม่สำเร็จ', sub: 'ต้องต่ออินเทอร์เน็ตสักครั้งเพื่อโหลดหน้านี้ แล้วลองใหม่นะคะ', btn: 'กลับหน้าแรก', go: 'home' })}</div>`;
  });
}
function renderStats(...a) { statsStub('renderStats', 'stats', a); }
function renderDay(...a) { statsStub('renderDay', 'day', a); }
function renderMonthTest(...a) { statsStub('renderMonthTest', 'mtest', a); }
function renderLevelTest(...a) { statsStub('renderLevelTest', 'ltest', a); }
