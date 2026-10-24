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
const dayKey = (k) => new Date(Date.now() - k * DAY).toLocaleDateString('en-CA'); // k days ago
const thDate = (ms) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
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
function skillCard() {
  const rows = SKILL_GAMES.map((g) => ({ g, ...lexStats(g) })).filter((r) => r.seen);
  if (!rows.length) return '';
  return `<div class="h2">🧩 เกมฝึกทักษะ — ข้อที่ต้องทวน</div><div class="card-box">
    <table class="g-table"><tr><th>เกม</th><th>เคยเจอ</th><th>แม่นแล้ว</th><th>ถึงกำหนด</th></tr>${rows.map((r) => `<tr><td>${GAMES[r.g].icon} ${esc(GAMES[r.g].name)}</td><td>${r.seen}</td><td>${r.solid}</td><td>${r.due ? `<b>${r.due}</b>` : '–'}</td></tr>`).join('')}</table>
    <div class="small muted" style="margin-top:8px">ข้อที่ตอบผิดจะกลับมาให้ทวนในรอบถัดไปของเกมนั้นเอง ข้อที่ตอบถูกจะห่างออกไปเรื่อยๆ</div></div>`;
}

function renderStats(from) {
  takeSnap();
  const h = habits();
  const { rate, measured } = learnRate(h);
  const snap = S.snap[today()];
  const W_ = Math.max(280, view.clientWidth - 68);
  const sets = [
    { name: 'ชุด 3000 คำ', total: in3000().size, l: snap[0], m: snap[1] },
    { name: 'ครบทั้ง 5000 คำ', total: W.length, l: snap[2], m: snap[3] },
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
    return `<div class="lvl-row">${lvBadge(l)}
      <div class="grow"><div class="bar"><div class="l" style="width:${learned / ws.length * 100}%"></div><div class="m" style="width:${mastered / ws.length * 100}%"></div></div>
      <div class="small muted" style="margin-top:4px">เรียนแล้ว ${learned} · จำได้ ${mastered} / ${ws.length}</div></div></div>`;
  };
  const lvRows = `<div class="small muted" style="margin-top:8px"><b>ชุด 3000 คำ</b> (คำหลัก)</div>${LEVELS_3000.map(lvRow).join('')}
    <div class="small muted" style="margin-top:12px"><b>ชุด 5000 คำ</b> (คำเพิ่มเติม)</div>${LEVELS_5000.map(lvRow).join('')}`;

  view.innerHTML = `
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="sBack">‹ กลับ</button></div>
    ${levelCard()}
    <div id="readyHost"></div>
    <div class="h2">ความคืบหน้าแต่ละระดับ</div>
    <div class="card-box">${lvRows}
      <div class="small muted" style="margin-top:8px"><span class="key bl"></span>เรียนแล้ว &nbsp; <span class="key bm"></span>จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div></div>
    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}</div>
    ${skillCard()}
    <div class="h2">นิสัยการเล่น <span class="small muted">${h.span} วันล่าสุด</span></div>
    <div class="tiles">
      <div class="tile-s"><b>${h.active}<small>/${h.span}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.cards / h.active) : 0}</b><span>แฟลชการ์ด/วัน</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.games / h.active) : 0}</b><span>ข้อเกม/วัน</span></div>
      <div class="tile-s"><b>${Math.round(h.acc * 100)}<small>%</small></b><span>ตอบถูก</span></div>
    </div>
    <div class="card-box"><div class="small muted" style="margin-bottom:6px">กิจกรรมต่อวัน (แตะแท่งเพื่อดูตัวเลข)</div>${activityChart(W_)}</div>
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

    <div class="card-box row share-row"><button class="btn primary" id="shareProg">📤 แชร์ความก้าวหน้า</button><button class="btn" data-go="year" data-year="${yearToShow() || new Date().getFullYear()}">🎊 สรุปปี</button></div>
    <div class="h2">🎓 ทดสอบจบระดับ</div>
    ${levelTestBox()}

    <div class="h2">แนวโน้มคำศัพท์</div>
    <div class="card-box" data-lz="trend" style="min-height:190px"></div>

    <div class="h2">คาดการณ์ว่าจะจำได้ครบเมื่อไร</div>
    ${rate > 0 ? `<p class="small muted" style="margin:-4px 4px 10px">คิดจากที่เรียนคำใหม่ได้ราว <b>${rate.toFixed(1)} คำ/วัน</b>${measured ? ' (วัดจากความคืบหน้าจริง)' : ` (ประมาณจากเป้า ${newGoal()} คำ × เล่น ${h.active}/${h.span} วัน)`} และความแม่นยำ ${Math.round(h.acc * 100)}%</p>` : ''}
    ${sets.map(etaCard).join('')}

    <div class="h2">ถ้าปรับจำนวนคำใหม่ต่อวัน</div>
    <div class="card-box">
      <table class="g-table whatif"><tr><th>คำใหม่/วัน</th><th>ครบ 3000</th><th>ครบ 5000</th><th>ทบทวน/วัน</th></tr>${whatIf}</table>
      <div class="small muted" style="margin-top:8px">คิดจากความถี่ที่เล่นตอนนี้ (${h.active}/${h.span} วัน)${h.ratio < 1 && h.since ? ' ถ้าเล่นทุกวันจะเร็วขึ้นอีก' : ''} · การ์ดทบทวนต่อวันเป็นค่าประมาณเมื่อเรียนไปได้สักระยะ</div>
    </div>
    <p class="small muted center">เป็นการคาดการณ์คร่าวๆ จะแม่นขึ้นเรื่อยๆ เมื่อเล่นไปนานขึ้น</p>
    <div data-lz="stk" style="min-height:260px"></div>
    <div class="h2">🏅 เหรียญรางวัล <span class="small muted">${ACH.filter((a) => S.ach[a.id]).length}/${ACH.length}</span></div>
    <div class="card-box ach-grid" id="ach" data-lz="ach" style="min-height:200px"></div>`;
  loadStories().then(() => { const h = $('#readyHost'); if (h) h.innerHTML = readyBox(); });
  $('#shareProg').onclick = shareProgress;
  view.querySelectorAll('[data-lt]').forEach((b) => { b.onclick = () => go('ltest', b.dataset.lt); });
  $('#sBack').onclick = () => go(from || 'home');
  startLazy({
    heat: [yearHeatmap, bindHeatmap],
    trend: [() => trendChart(W_), (el) => bindChartTips(el)],
    stk: [stickerBook, bindStickers],
    ach: [() => ACH.map((a) => { const hid = a.secret && !S.ach[a.id]; return `<button class="ach ${S.ach[a.id] ? 'on' : ''}" data-ach="${a.id}"><span>${hid ? '❓' : a.icon}</span><small>${hid ? 'เหรียญลับ' : a.name}</small></button>`; }).join('')],
  });
  $('#ach').onclick = (e) => {
    const b = e.target.closest('[data-ach]'); if (!b) return;
    const a = ACH.find((x) => x.id === b.dataset.ach);
    toast(a.secret && !S.ach[a.id] ? '❓ เหรียญลับ: ไม่บอกเงื่อนไข ลองเรียนไปเรื่อยๆ แล้วจะเจอเอง' : `${a.icon} ${a.name}: ${a.desc}${S.ach[a.id] ? ' ✅' : ' 🔒'}`);
  };
  bindChartTips();
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
    el.innerHTML = d[0]();
    if (d[1]) d[1](el);
  };
  if ('IntersectionObserver' in window) {
    lazyIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { lazyIO.unobserve(e.target); fill(e.target); } }), { root: view, rootMargin: '300px 0px' });
    els.forEach((el) => lazyIO.observe(el));
  }
  const rest = () => { const el = els.find((x) => !x.dataset.done && x.isConnected); if (el) { fill(el); lazyTimer = setTimeout(rest, 120); } };
  lazyTimer = setTimeout(rest, 400);
}

// Stacked bars: flashcards (bottom) + game/feed answers (top); days before 1.9.0 have no split.
function activityChart(Wd) {
  const H = 130, top = 8, bot = 22, n = 28, gap = 3;
  const bw = (Wd - gap * (n - 1)) / n;
  const days = Array.from({ length: n }, (_, i) => {
    const k = n - 1 - i, key = dayKey(k), all = S.hist[key] || 0;
    const known = key in S.chist || all === 0 || key >= S.chistFrom;
    const c = Math.min(all, S.chist[key] || 0);
    return { key, all, c: known ? c : 0, g: known ? all - c : 0, u: known ? 0 : all };
  });
  const max = Math.max(10, ...days.map((d) => d.all));
  const y = (v) => (H - bot - top) * v / max;
  const hasU = days.some((d) => d.u);
  const bars = days.map((d, i) => {
    const x = i * (bw + gap); let base = H - bot, out = '';
    const seg = (v, cls) => {
      if (!v) return; const hh = Math.max(2, y(v));
      const last = base - hh;
      out += `<rect class="${cls}" x="${x}" y="${last}" width="${bw}" height="${hh - (out ? 2 : 0)}" rx="2"/>`;
      base = last;
    };
    seg(d.c, 's-card'); seg(d.u, 's-unk'); seg(d.g, 's-game');
    const lab = d.all ? `${thDate(Date.parse(d.key + 'T12:00:00'))}: การ์ด ${d.c} · เกม ${d.g}${d.u ? ` · ไม่แยกประเภท ${d.u}` : ''}` : `${thDate(Date.parse(d.key + 'T12:00:00'))}: ไม่ได้เล่น`;
    return `${out}<rect class="hit" data-tip="${lab}" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}"/>`;
  }).join('');
  const ticks = [0, 7, 14, 21, 27].map((i) => `<text class="ax" x="${i * (bw + gap) + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 27 ? 'วันนี้' : `${27 - i} วันก่อน`}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="กิจกรรมต่อวัน 28 วัน">
    <line class="base" x1="0" x2="${Wd}" y1="${H - bot}" y2="${H - bot}"/>${bars}${ticks}</svg><div class="tip" hidden></div></div>
    <div class="legend"><span><i class="s-card"></i>แฟลชการ์ด</span><span><i class="s-game"></i>เกม + ไถศัพท์</span>${hasU ? '<span><i class="s-unk"></i>ก่อนเริ่มแยกประเภท</span>' : ''}</div>`;
}

// Lines: words learned and words mastered (all levels), from daily snapshots.
function trendChart(Wd) {
  const keys = Object.keys(S.snap).sort();
  if (keys.length < 2) {
    return `<div class="small muted">📊 แอปเริ่มเก็บข้อมูลแนวโน้มตั้งแต่วันนี้ เล่นต่ออีกวันสองวันแล้วกราฟเส้นจะขึ้นตรงนี้</div>
      <div style="margin-top:8px">ตอนนี้: เรียนแล้ว <b>${S.snap[today()][2]}</b> คำ · จำได้แล้ว <b>${S.snap[today()][3]}</b> คำ</div>`;
  }
  const H = 150, top = 14, bot = 22, left = 4, right = 64;
  const t0 = Date.parse(keys[0] + 'T12:00:00'), t1 = Date.parse(keys[keys.length - 1] + 'T12:00:00');
  const span = Math.max(DAY, t1 - t0);
  const max = Math.max(10, ...keys.map((k) => S.snap[k][2])) * 1.1;
  const px = (k) => left + (Wd - left - right) * (Date.parse(k + 'T12:00:00') - t0) / span;
  const py = (v) => H - bot - (H - bot - top) * v / max;
  const line = (i, cls) => `<polyline class="${cls}" points="${keys.map((k) => `${px(k).toFixed(1)},${py(S.snap[k][i]).toFixed(1)}`).join(' ')}"/>`;
  const last = keys[keys.length - 1], L = S.snap[last];
  const endLab = (v, cls, txt, dy) => `<circle class="${cls}" cx="${px(last)}" cy="${py(v)}" r="4"/><text class="lab" x="${px(last) + 8}" y="${py(v) + dy}">${txt} ${v}</text>`;
  const dl = Math.abs(py(L[2]) - py(L[3])) < 14 ? [-4, 12] : [4, 4];
  const hits = keys.map((k, i) => {
    const x0 = i ? (px(keys[i - 1]) + px(k)) / 2 : 0, x1 = i < keys.length - 1 ? (px(k) + px(keys[i + 1])) / 2 : Wd;
    return `<rect class="hit" data-x="${px(k)}" data-tip="${thDate(Date.parse(k + 'T12:00:00'))}: เรียนแล้ว ${S.snap[k][2]} · จำได้ ${S.snap[k][3]}" x="${x0}" y="0" width="${x1 - x0}" height="${H}"/>`;
  }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="แนวโน้มจำนวนคำที่เรียนแล้วและจำได้แล้ว">
    <line class="base" x1="0" x2="${Wd - right}" y1="${H - bot}" y2="${H - bot}"/>
    ${line(2, 'ln-l')}${line(3, 'ln-m')}${endLab(L[2], 'dot-l', 'เรียน', dl[0])}${endLab(L[3], 'dot-m', 'จำได้', dl[1])}
    <text class="ax" x="${left}" y="${H - 6}">${thDate(t0)}</text><text class="ax" x="${Wd - right}" y="${H - 6}" text-anchor="end">วันนี้</text>
    <line class="xhair" x1="0" x2="0" y1="${top}" y2="${H - bot}" visibility="hidden"/>${hits}</svg><div class="tip" hidden></div></div>
    <div class="legend"><span><i class="s-card"></i>เรียนแล้ว</span><span><i class="s-master"></i>จำได้แล้ว</span></div>`;
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
      tip.style.left = Math.min(Math.max(cx, 80), box.width - 80) + 'px';
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
      const key = d.toLocaleDateString('en-CA');
      if (key > tKey) { cells.push('<i class="hm-c hm-x"></i>'); continue; }
      if (dow === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        if (wk < 51) { if (months.length && wk - months[months.length - 1][0] < 3) months.pop(); months.push([wk, d.toLocaleDateString('th-TH', { month: 'short' })]); }
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
    <div class="card-box">${mtestSummary()}</div>`;
  $('#mtGo').onclick = () => runMonthTest(shuffle(pool).slice(0, n));
}
function runMonthTest(items, lv) {
  let i = 0, right = 0, timer = null;
  const wrong = [], modes = ['en2th', 'th2en', ...(window.speechSynthesis ? ['listen'] : [])];
  cleanup = () => clearTimeout(timer);
  const q = () => {
    if (i >= items.length) return done();
    const w = items[i], m = modes[i % modes.length], toTh = m !== 'th2en';
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
