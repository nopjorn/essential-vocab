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
  return { rate: S.settings.newPerDay * h.ratio, measured: false };
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
  if (!opts.includes(S.settings.newPerDay)) opts.push(S.settings.newPerDay), opts.sort((a, b) => a - b);
  const ratio = h.ratio || 1;
  const whatIf = opts.map((n) => {
    const r = n === S.settings.newPerDay && rate > 0 ? rate : n * ratio; // current setting: same rate as the cards above
    const e3 = etaDays(in3000().size, snap[0], r, { ...h, ratio }), e5 = etaDays(W.length, snap[2], r, { ...h, ratio });
    const cell = (e, m, t) => (m >= t ? '✓ ครบแล้ว' : `${durTxt(e)}`);
    return `<tr class="${n === S.settings.newPerDay ? 'cur' : ''}"><td>${n}${n === S.settings.newPerDay ? ' (ตอนนี้)' : ''}</td><td>${cell(e3, snap[1], in3000().size)}</td><td>${cell(e5, snap[3], W.length)}</td><td>~${n * 5}</td></tr>`;
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
    <div class="h2">ความคืบหน้าแต่ละระดับ</div>
    <div class="card-box">${lvRows}
      <div class="small muted" style="margin-top:8px">🟣 เรียนแล้ว &nbsp; 🟢 จำได้แล้ว (ทบทวนผ่านหลายรอบ)</div></div>
    <div class="h2">📅 การ์ดที่ต้องทบทวน 7 วันข้างหน้า</div>
    <div class="card-box">${forecastChart()}</div>
    <div class="h2">นิสัยการเล่น <span class="small muted">${h.span} วันล่าสุด</span></div>
    <div class="tiles">
      <div class="tile-s"><b>${h.active}<small>/${h.span}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.cards / h.active) : 0}</b><span>แฟลชการ์ด/วัน</span></div>
      <div class="tile-s"><b>${h.active ? Math.round(h.games / h.active) : 0}</b><span>ข้อเกม/วัน</span></div>
      <div class="tile-s"><b>${Math.round(h.acc * 100)}<small>%</small></b><span>ตอบถูก</span></div>
    </div>
    <div class="card-box"><div class="small muted" style="margin-bottom:6px">กิจกรรมต่อวัน (แตะแท่งเพื่อดูตัวเลข)</div>${activityChart(W_)}</div>

    ${boardSection()}
    <div class="h2">สรุปรายสัปดาห์</div>
    <div class="card-box"><b>สัปดาห์นี้</b>${weekBox(0)}</div>
    <div class="card-box"><b>สัปดาห์ที่แล้ว</b>${weekBox(1)}</div>
    <div class="h2">สรุปรายเดือน</div>
    <div class="card-box"><b>เดือนนี้</b>${monthBox(0)}</div>
    ${monthStats(1).total ? `<div class="card-box"><b>เดือนที่แล้ว</b>${monthBox(1)}</div>` : ''}

    <div class="h2">แนวโน้มคำศัพท์</div>
    <div class="card-box">${trendChart(W_)}</div>

    <div class="h2">คาดการณ์ว่าจะจำได้ครบเมื่อไร</div>
    ${rate > 0 ? `<p class="small muted" style="margin:-4px 4px 10px">คิดจากที่เรียนคำใหม่ได้ราว <b>${rate.toFixed(1)} คำ/วัน</b>${measured ? ' (วัดจากความคืบหน้าจริง)' : ` (ประมาณจากเป้า ${S.settings.newPerDay} คำ × เล่น ${h.active}/${h.span} วัน)`} และความแม่นยำ ${Math.round(h.acc * 100)}%</p>` : ''}
    ${sets.map(etaCard).join('')}

    <div class="h2">ถ้าปรับจำนวนคำใหม่ต่อวัน</div>
    <div class="card-box">
      <table class="g-table whatif"><tr><th>คำใหม่/วัน</th><th>ครบ 3000</th><th>ครบ 5000</th><th>ทบทวน/วัน</th></tr>${whatIf}</table>
      <div class="small muted" style="margin-top:8px">คิดจากความถี่ที่เล่นตอนนี้ (${h.active}/${h.span} วัน)${h.ratio < 1 && h.since ? ' ถ้าเล่นทุกวันจะเร็วขึ้นอีก' : ''} · การ์ดทบทวนต่อวันเป็นค่าประมาณเมื่อเรียนไปได้สักระยะ</div>
    </div>
    <p class="small muted center">เป็นการคาดการณ์คร่าวๆ จะแม่นขึ้นเรื่อยๆ เมื่อเล่นไปนานขึ้น</p>
    ${stickerBook()}
    <div class="h2">🏅 เหรียญรางวัล <span class="small muted">${ACH.filter((a) => S.ach[a.id]).length}/${ACH.length}</span></div>
    <div class="card-box ach-grid" id="ach">${ACH.map((a) => `<button class="ach ${S.ach[a.id] ? 'on' : ''}" data-ach="${a.id}"><span>${a.icon}</span><small>${a.name}</small></button>`).join('')}</div>`;
  $('#sBack').onclick = () => go(from || 'home');
  bindStickers();
  $('#ach').onclick = (e) => {
    const b = e.target.closest('[data-ach]'); if (!b) return;
    const a = ACH.find((x) => x.id === b.dataset.ach);
    toast(`${a.icon} ${a.name}: ${a.desc}${S.ach[a.id] ? ' ✅' : ' 🔒'}`);
  };
  bindChartTips();
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
function bindChartTips() {
  view.querySelectorAll('.chart').forEach((ch) => {
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
