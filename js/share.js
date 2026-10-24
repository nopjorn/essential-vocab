'use strict';
// Share cards (progress card, year in review) drawn on a canvas and handed to saveFile() (share sheet or download).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- share card ---------- */
// { title, sub, hero: big text, heroLabel, tiles: [[value, label] × 4], foot } → 1080×1350 canvas in the app's colours.
function drawCard(o) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement);
  const p1 = cs.getPropertyValue('--primary').trim() || '#6c5ce7', p2 = cs.getPropertyValue('--primary-2').trim() || '#a29bfe';
  const grad = g.createLinearGradient(0, 0, 1080, 1350); grad.addColorStop(0, p1); grad.addColorStop(1, p2);
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
  const font = (px, w = 700) => `${w} ${px}px ui-rounded, system-ui, -apple-system, "Sarabun", sans-serif`;
  const text = (t, x, y, px, w, a = 1) => { g.font = font(px, w); g.fillStyle = `rgba(255,255,255,${a})`; g.textAlign = 'center'; g.fillText(t, x, y); };
  const box = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
  text(o.title, 540, 150, 64, 800);
  text(o.sub || '', 540, 215, 38, 500, 0.85);
  g.fillStyle = 'rgba(255,255,255,0.16)'; box(90, 290, 900, 340, 48);
  text(o.hero, 540, 480, 150, 800);
  text(o.heroLabel, 540, 565, 44, 600, 0.9);
  (o.tiles || []).slice(0, 4).forEach(([v, l], i) => {
    const x = 90 + (i % 2) * 460, y = 690 + Math.floor(i / 2) * 270;
    g.fillStyle = 'rgba(255,255,255,0.16)'; box(x, y, 440, 245, 40);
    text(String(v), x + 220, y + 130, 96, 800);
    text(l, x + 220, y + 205, 38, 500, 0.9);
  });
  text(o.foot || 'ศัพท์ต้องรู้ · nopjorn.github.io/essential-vocab', 540, 1285, 34, 500, 0.8);
  return c;
}
async function shareCard(canvas, name, title) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return false;
  return saveFile(new File([blob], name, { type: 'image/png' }), title);
}
function progressCard() {
  const learned = W.filter((w) => S.prog[w.w]).length, mastered = masteredWords().length;
  return drawCard({
    title: 'ศัพท์ต้องรู้', sub: thDate(Date.now()),
    hero: `🔥 ${streakNow()}`, heroLabel: 'วันติดต่อกัน',
    tiles: [[learned.toLocaleString(), 'คำที่เรียนแล้ว'], [mastered.toLocaleString(), 'คำที่จำได้แล้ว'], ['Lv.' + levelOf(S.xp), (S.xp || 0).toLocaleString() + ' XP'], [ACH.filter((a) => S.ach[a.id]).length, 'เหรียญที่ได้']],
  });
}
async function shareProgress() {
  if (await shareCard(progressCard(), `essential-vocab-${today()}.png`, 'ความก้าวหน้าของฉัน')) toast('บันทึกภาพสรุปแล้ว ✅');
}

/* ---------- year in review ---------- */
// Everything comes from data already kept: hist / chist / snap / read / ach / prog.
function yearStats(y) {
  const pre = String(y), keys = Object.keys(S.hist).filter((k) => k.startsWith(pre) && S.hist[k] > 0).sort();
  let longest = 0, run = 0, prev = null;
  for (const k of keys) { run = prev && dayDiff(k, prev) === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = k; }
  const total = keys.reduce((a, k) => a + S.hist[k], 0), cards = keys.reduce((a, k) => a + (S.chist[k] || 0), 0);
  const busiest = keys.reduce((b, k) => (!b || S.hist[k] > S.hist[b] ? k : b), null);
  const snaps = Object.keys(S.snap).sort(), inY = snaps.filter((k) => k.startsWith(pre)), before = snaps.filter((k) => k < pre + '-01-01');
  const learned = inY.length ? S.snap[inY[inY.length - 1]][2] - (before.length ? S.snap[before[before.length - 1]][2] : 0) : null;
  const top = Object.entries(S.prog).filter(([, p]) => (p.x || 0) > 0).sort((a, b) => b[1].x - a[1].x).slice(0, 5);
  return {
    y, days: keys.length, total, cards, games: Math.max(0, total - cards), longest, busiest, busiestN: busiest ? S.hist[busiest] : 0, learned,
    stories: Object.values(S.read).filter((d) => d.startsWith(pre)).length,
    medals: Object.values(S.ach).filter((d) => String(d).startsWith(pre)).length,
    xp: Object.entries(S.xpWeek).filter(([k]) => k.startsWith(pre)).reduce((a, [, v]) => a + v, 0),
    top,
  };
}
// The year to show on home: from 15 Dec this year, and during 1–10 Jan the year that just ended.
function yearToShow() {
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 11 && day >= 15) return d.getFullYear();
  if (m === 0 && day <= 10) return d.getFullYear() - 1;
  return null;
}
function yearSlides(s) {
  const slides = [
    { e: '🎊', big: `ปี ${s.y + 543}`, line: `มาดูกันว่าคุณเก่งขึ้นแค่ไหนในปีนี้` },
    { e: '📅', big: `${s.days} วัน`, line: `ที่คุณมาเรียน${s.longest > 1 ? ` · ต่อเนื่องยาวสุด ${s.longest} วัน 🔥` : ''}` },
    { e: '✍️', big: s.total.toLocaleString(), line: `ข้อที่ทำทั้งหมด (แฟลชการ์ด ${s.cards.toLocaleString()} · เกม ${s.games.toLocaleString()})` },
  ];
  if (s.learned != null && s.learned > 0) slides.push({ e: '🌱', big: `+${s.learned.toLocaleString()}`, line: 'คำใหม่ที่เริ่มเรียนในปีนี้' });
  if (s.busiest) slides.push({ e: '⚡', big: `${s.busiestN} ข้อ`, line: `ขยันที่สุดในวันเดียว คือ ${thDate(Date.parse(s.busiest + 'T12:00:00'))}` });
  if (s.stories) slides.push({ e: '📖', big: `${s.stories} เรื่อง`, line: 'เรื่องสั้นที่อ่านจบ' });
  if (s.medals) slides.push({ e: '🏅', big: `${s.medals} เหรียญ`, line: 'ที่ได้ในปีนี้' });
  if (s.top.length) slides.push({ e: '🐢', big: s.top[0][0], line: `คำที่ลืมบ่อยที่สุด (${s.top[0][1].x} ครั้ง)${s.top.length > 1 ? ' · ตามด้วย ' + s.top.slice(1, 4).map(([w]) => w).join(', ') : ''}` });
  slides.push({ e: '🚀', big: 'ปีหน้าไปต่อ!', line: `Lv.${levelOf(S.xp)} · ${(S.xp || 0).toLocaleString()} XP` });
  return slides;
}
function renderYear(arg) {
  const y = +arg || yearToShow() || new Date().getFullYear(), s = yearStats(y);
  if (!s.days) {
    view.innerHTML = `<div class="card-box center"><div class="result-emoji">🎊</div><p>ยังไม่มีข้อมูลการเรียนในปี ${y + 543}</p><button class="btn primary block" data-go="stats">กลับ</button></div>`;
    return;
  }
  const slides = yearSlides(s); let i = 0;
  const show = () => {
    const sl = slides[i];
    view.innerHTML = `<div class="card-box center pop year-slide"><div class="result-emoji" aria-hidden="true">${sl.e}</div>
      <div class="h1 year-big">${esc(String(sl.big))}</div><p>${esc(sl.line)}</p>
      <div class="year-dots" aria-label="${i + 1}/${slides.length}">${slides.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>
      <div class="row year-nav">${i ? '<button class="btn" id="yPrev">‹ ก่อนหน้า</button>' : ''}
      ${i < slides.length - 1 ? '<button class="btn primary grow" id="yNext">ต่อไป ›</button>' : '<button class="btn primary grow" id="yShare">📤 แชร์สรุปปี</button><button class="btn" id="yDone">เสร็จ</button>'}</div></div>`;
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('#yPrev', () => { i--; show(); });
    on('#yNext', () => { i++; show(); });
    on('#yDone', () => go('stats'));
    on('#yShare', async () => {
      const card = drawCard({ title: `สรุปปี ${s.y + 543}`, sub: 'ศัพท์ต้องรู้', hero: `${s.days}`, heroLabel: 'วันที่มาเรียน',
        tiles: [[s.longest, 'สตรีคยาวสุด (วัน)'], [s.total.toLocaleString(), 'ข้อที่ทำ'], [s.learned != null ? '+' + s.learned.toLocaleString() : '–', 'คำใหม่'], [s.stories, 'เรื่องสั้นที่อ่าน']] });
      if (await shareCard(card, `essential-vocab-year-${s.y}.png`, `สรุปปี ${s.y + 543}`)) toast('บันทึกภาพสรุปปีแล้ว ✅');
    });
  };
  show();
}
