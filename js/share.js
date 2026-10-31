'use strict';
// Share cards (progress card, year in review) drawn on a canvas and handed to saveFile() (share sheet or download).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- share card ---------- */
// { title, sub, hero: big text, heroLabel, tiles: [[value, label] × 4], foot } → 1080×1350 canvas.
// tpl (1.117): 'classic' = app colours gradient · 'sky' = today's sky with hills, sun/moon and น้องคำ · 'clean' = light card with the main colour.
// art = an already loaded น้องคำ image (mascotImage()), drawn on 'sky' and 'clean'.
const SHARE_TPL = [['classic', '🎨 สีธีม'], ['sky', '🌅 ท้องฟ้า + น้องคำ'], ['clean', '🤍 เรียบๆ']];
function drawCard(o, tpl = 'classic', art = null) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement);
  const p1 = cs.getPropertyValue('--primary').trim() || '#6c5ce7', p2 = cs.getPropertyValue('--primary-2').trim() || '#a29bfe';
  const clean = tpl === 'clean', sky = tpl === 'sky' && typeof SKY !== 'undefined' ? SKY[skyId()] : null;
  if (sky) {
    const gr = g.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, sky.g[0]); gr.addColorStop(0.55, sky.g[1]); gr.addColorStop(1, sky.g[2]);
    g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
    const halo = g.createRadialGradient(170, 170, 20, 170, 170, 260); halo.addColorStop(0, `rgba(${sky.glow},.55)`); halo.addColorStop(1, `rgba(${sky.glow},0)`);
    g.fillStyle = halo; g.fillRect(0, 0, 600, 600);
    const disc = g.createLinearGradient(110, 110, 230, 230); disc.addColorStop(0, sky.d[0]); disc.addColorStop(1, sky.d[1]);
    g.fillStyle = disc; g.beginPath(); g.arc(170, 170, 62, 0, Math.PI * 2); g.fill();
    if (sky.stars) { let r = 7; for (let i = 0; i < sky.stars * 2; i++) { r = (r * 9301 + 49297) % 233280; const x = r / 233280 * 1080; r = (r * 9301 + 49297) % 233280; const y = r / 233280 * 700; g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill(); } }
    const hill = (col, y0, a, b) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(300, y0 - a, 700, y0 + b, 1080, y0 - a / 2); g.lineTo(1080, 1350); g.lineTo(0, 1350); g.fill(); };
    hill(sky.h[0], 1040, 120, 60); hill(sky.h[1], 1130, 90, 70); hill(sky.h[2], 1230, 60, 40);
  } else {
    const grad = g.createLinearGradient(0, 0, 1080, 1350);
    if (clean) { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#f3f1ff'); } else { grad.addColorStop(0, p1); grad.addColorStop(1, p2); }
    g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
    if (clean) { g.fillStyle = p1; g.fillRect(0, 0, 1080, 18); }
  }
  const ink = clean ? '30,24,60' : '255,255,255', boxFill = clean ? 'rgba(108,92,231,0.08)' : sky ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.16)';
  const font = (px, w = 700) => `${w} ${px}px "Anuphan", ui-rounded, system-ui, -apple-system, "Sarabun", sans-serif`;
  const text = (t, x, y, px, w, a = 1, col = ink) => { g.font = font(px, w); g.fillStyle = `rgba(${col},${a})`; g.textAlign = 'center'; g.fillText(t, x, y); };
  const box = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
  if (art && (sky || clean)) g.drawImage(art, clean ? 800 : 830, 40, 210, 210);
  text(o.title, 540, 150, 64, 800);
  text(o.sub || '', 540, 215, 38, 500, 0.85);
  g.fillStyle = clean ? p1 : boxFill; box(90, 290, 900, 340, 48);
  text(o.hero, 540, 480, 150, 800, 1, clean ? '255,255,255' : ink);
  text(o.heroLabel, 540, 565, 44, 600, 0.9, clean ? '255,255,255' : ink);
  (o.tiles || []).slice(0, 4).forEach(([v, l], i) => {
    const x = 90 + (i % 2) * 460, y = 690 + Math.floor(i / 2) * 270;
    g.fillStyle = boxFill; box(x, y, 440, 245, 40);
    text(String(v), x + 220, y + 130, 96, 800);
    text(l, x + 220, y + 205, 38, 500, 0.9);
  });
  text(o.foot || 'ศัพท์ต้องรู้ · nopjorn.github.io/essential-vocab', 540, 1285, 34, 500, 0.8);
  return c;
}
// น้องคำ (happy, in today's costume) as an image for the canvas; the CSS colour variables are filled in first.
function mascotImage() {
  const cs = getComputedStyle(document.documentElement), v = (k, d) => cs.getPropertyValue(k).trim() || d;
  const svg = mascotSvg({ mood: 'happy', size: 240, equip: festEquip().equip })
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/var\(--primary-text,([^)]+)\)/g, '$1').replace(/var\(--primary-2\)/g, v('--primary-2', '#a29bfe')).replace(/var\(--primary\)/g, v('--primary', '#6c5ce7'));
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
// Pick a template with live previews, then share/save. build(tpl, art) → canvas.
async function shareWithPicker(build, name, title, done) {
  const art = await mascotImage();
  if (document.fonts && document.fonts.load) { try { await document.fonts.load('800 40px "Anuphan"', 'ก'); } catch (e) { /* system font */ } }
  let tpl = SHARE_TPL.some(([id]) => id === S.settings.shareTpl) ? S.settings.shareTpl : 'classic';
  const old = document.querySelector('.share-pick'); if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'share-pick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'เลือกแบบภาพที่จะแชร์');
  el.innerHTML = `<div class="sp-box"><b class="sp-title">📤 เลือกแบบภาพ</b>
    <div class="sp-list" role="radiogroup" aria-label="แบบภาพ">${SHARE_TPL.map(([id, name]) => `<button class="sp-opt" role="radio" data-tpl="${id}" aria-checked="${id === tpl}"><img alt="" src="${build(id, art).toDataURL('image/jpeg', 0.7)}"><span>${name}</span></button>`).join('')}</div>
    <div class="row sp-nav"><button class="btn" data-sp="x">ยกเลิก</button><button class="btn primary grow" data-sp="go">📤 แชร์ภาพนี้</button></div></div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); document.removeEventListener('keydown', key); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  el.onclick = async (e) => {
    const o = e.target.closest('[data-tpl]'), b = e.target.closest('[data-sp]');
    if (e.target === el) return close();
    if (o) { tpl = o.dataset.tpl; el.querySelectorAll('[data-tpl]').forEach((x) => x.setAttribute('aria-checked', x === o)); return; }
    if (!b) return;
    if (b.dataset.sp === 'x') return close();
    S.settings.shareTpl = tpl; save(); close();
    if (await shareCard(build(tpl, art), name, title) && done) done();
  };
  const first = el.querySelector('[aria-checked="true"]'); if (first) first.focus();
}
async function shareCard(canvas, name, title) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return false;
  return saveFile(new File([blob], name, { type: 'image/png' }), title);
}
function progressCard(tpl, art) {
  const learned = W.filter((w) => S.prog[w.w]).length, mastered = masteredWords().length;
  return drawCard({
    title: 'ศัพท์ต้องรู้', sub: thDate(Date.now()),
    hero: `🔥 ${streakNow()}`, heroLabel: 'วันติดต่อกัน',
    tiles: [[learned.toLocaleString(), 'คำที่เรียนแล้ว'], [mastered.toLocaleString(), 'คำที่จำได้แล้ว'], ['Lv.' + levelOf(S.xp), (S.xp || 0).toLocaleString() + ' XP'], [ACH.filter((a) => S.ach[a.id]).length, 'เหรียญที่ได้']],
  }, tpl, art);
}
async function shareProgress() {
  await shareWithPicker(progressCard, `essential-vocab-${today()}.png`, 'ความก้าวหน้าของฉัน', () => toast('บันทึกภาพสรุปแล้ว ✅'));
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
// A slide's caption cut into phrases at " · " and "(" (outside brackets): each phrase is an inline-block, so a line break
// can only fall between phrases and never splits a Thai word or leaves a lone number on the last line.
function yearLine(line) {
  const parts = []; let cur = '', depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '(' && !depth && cur.trim()) { parts.push(cur.trim()); cur = ''; }
    if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
    if (!depth && line.startsWith(' · ', i)) { parts.push(cur.trim() + '\u00A0·'); cur = ''; i += 2; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map((t) => `<span class="yl">${esc(t)}</span>`).join(' ');
}
function renderYear(arg) {
  const y = +arg || yearToShow() || new Date().getFullYear(), s = yearStats(y);
  if (!s.days) {
    view.innerHTML = `<div class="card-box">${emptyArt({ kind: 'empty', title: `ยังไม่มีข้อมูลการเรียนในปี ${y + 543}`, sub: 'เรียนสักวัน แล้วสรุปของปีนี้จะมาอยู่ที่นี่', btn: 'กลับ', go: 'stats' })}</div>`;
    return;
  }
  const slides = yearSlides(s); let i = 0;
  const show = () => {
    const sl = slides[i];
    view.innerHTML = `<div class="card-box center pop year-slide"><div class="result-emoji" aria-hidden="true">${sl.e}</div>
      <div class="h1 year-big">${esc(String(sl.big))}</div><p>${yearLine(sl.line)}</p>
      <div class="year-dots" aria-label="${i + 1}/${slides.length}">${slides.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>
      <div class="row year-nav">${i ? '<button class="btn" id="yPrev">‹ ก่อนหน้า</button>' : ''}
      ${i < slides.length - 1 ? '<button class="btn primary grow" id="yNext">ต่อไป ›</button>' : '<button class="btn primary grow" id="yShare">📤 แชร์สรุปปี</button><button class="btn" id="yDone">เสร็จ</button>'}</div></div>`;
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('#yPrev', () => { i--; show(); });
    on('#yNext', () => { i++; show(); });
    on('#yDone', () => go('stats'));
    on('#yShare', async () => {
      const build = (tpl, art) => drawCard({ title: `สรุปปี ${s.y + 543}`, sub: 'ศัพท์ต้องรู้', hero: `${s.days}`, heroLabel: 'วันที่มาเรียน',
        tiles: [[s.longest, 'สตรีคยาวสุด (วัน)'], [s.total.toLocaleString(), 'ข้อที่ทำ'], [s.learned != null ? '+' + s.learned.toLocaleString() : '–', 'คำใหม่'], [s.stories, 'เรื่องสั้นที่อ่าน']] }, tpl, art);
      await shareWithPicker(build, `essential-vocab-year-${s.y}.png`, `สรุปปี ${s.y + 543}`, () => toast('บันทึกภาพสรุปปีแล้ว ✅'));
    });
  };
  show();
}
