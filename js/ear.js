'use strict';
// Listening review (1.108): hands-free practice for the bus or a walk. Per word: the app says the English word, waits a few seconds
// for you to recall the meaning, says the Thai meaning, then the example sentence, and goes to the next word by itself.
// It counts as practice only (markActive + a little XP): cards are not graded, the schedule is not touched.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- ฟังทบทวน ---------- */
const EAR_SRC = {
  due: ['⏰', 'การ์ดที่ถึงกำหนด', () => dueList().slice(0, 60)],
  learning: ['🟡', 'คำที่กำลังเรียน', () => shuffle(W.filter((w) => status(w) === 'learning'))],
  mastered: ['🟢', 'คำที่จำได้แล้ว', () => shuffle(masteredWords())],
  star: ['⭐', 'คำติดดาว', () => shuffle(W.filter(isStar))],
  leech: ['🐢', 'คำดื้อ', () => shuffle(W.filter(isLeech))],
};
const earOpt = { src: 'due', n: 20, gap: 4, ex: true, th: true };
function renderEar() {
  $('#title').textContent = 'ฟังทบทวน';
  view.scrollTop = 0;
  const avail = Object.fromEntries(Object.keys(EAR_SRC).map((k) => [k, EAR_SRC[k][2]().length]));
  if (!avail[earOpt.src]) earOpt.src = Object.keys(avail).find((k) => avail[k]) || 'due';
  const seg = (id, vals, cur, fmt) => `<div class="seg" id="${id}" role="group">${vals.map((v) => `<button class="${cur === v ? 'on' : ''}" data-v="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join('')}</div>`;
  view.innerHTML = `<div class="card-box center"><div class="result-emoji" aria-hidden="true">🎧</div><div class="h2" style="margin:2px 0">ฟังทบทวนแบบไม่ต้องดูจอ</div>
      <p class="small muted">แอปพูดคำ รอให้คุณนึกความหมาย แล้วเฉลยเป็นภาษาไทยพร้อมประโยคตัวอย่าง ไปคำถัดไปเอง เหมาะกับตอนเดินทาง จอจะไม่ดับระหว่างฟัง และแตะ 🌙 เพื่อดับจอประหยัดแบตได้ (นับเป็นการฝึก ไม่เปลี่ยนรอบทบทวนของการ์ด)</p></div>
    <div class="h2">เลือกคำจาก</div>
    <div class="chips" id="earSrc">${Object.entries(EAR_SRC).map(([k, [ic, name]]) => `<button class="chip${earOpt.src === k ? ' on' : ''}${avail[k] ? '' : ' off'}" data-v="${k}" ${avail[k] ? '' : 'disabled'}>${ic} ${name} <small>${avail[k]}</small></button>`).join('')}</div>
    <div class="set-row"><span>จำนวนคำ</span>${seg('earN', [10, 20, 30], earOpt.n, (v) => v + ' คำ')}</div>
    <div class="set-row"><span>เวลาให้นึก</span>${seg('earGap', [2, 4, 7], earOpt.gap, (v) => v + ' วินาที')}</div>
    <div class="set-row"><span>อ่านประโยคตัวอย่างด้วย</span><label class="switch"><input type="checkbox" id="earEx" aria-label="อ่านประโยคตัวอย่างด้วย" ${earOpt.ex ? 'checked' : ''}><span></span></label></div>
    <div class="set-row"><span>อ่านความหมายไทยเป็นเสียง<br><span class="small muted">ใช้เสียงไทยของเครื่อง (ถ้าไม่มีเสียงไทยให้ปิด จะแสดงเป็นตัวหนังสืออย่างเดียว)</span></span><label class="switch"><input type="checkbox" id="earTh" aria-label="อ่านความหมายไทยเป็นเสียง" ${earOpt.th ? 'checked' : ''}><span></span></label></div>
    <button class="btn primary block" id="earGo" style="margin-top:14px" ${avail[earOpt.src] ? '' : 'disabled'}>▶️ เริ่มฟัง</button>
    ${avail[earOpt.src] ? '' : '<p class="small muted center" style="margin-top:8px">ยังไม่มีคำในกลุ่มนี้ ลองเรียนแฟลชการ์ดก่อนนะคะ</p>'}`;
  $('#earSrc').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b && !b.disabled) { earOpt.src = b.dataset.v; renderEar(); } };
  $('#earN').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { earOpt.n = +b.dataset.v; renderEar(); } };
  $('#earGap').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { earOpt.gap = +b.dataset.v; renderEar(); } };
  $('#earEx').onchange = (e) => { earOpt.ex = e.target.checked; };
  $('#earTh').onchange = (e) => { earOpt.th = e.target.checked; };
  $('#earGo').onclick = () => playEar(EAR_SRC[earOpt.src][2]().slice(0, earOpt.n));
}
function playEar(list) {
  if (!list.length) return renderEar();
  let i = 0, tok = 0, timer = null, playing = true;
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="earBack">‹ กลับ</button></div>
    <div class="card-box sh-box ear-box">
      <div class="sh-top"><span class="small muted">${EAR_SRC[earOpt.src][0]} ${EAR_SRC[earOpt.src][1]}</span><b class="small" id="earPos"></b></div>
      <div class="sh-prog"><i id="earProg"></i></div>
      <p class="sh-en" lang="en" id="earWord" aria-live="polite"></p>
      <p class="sh-th" id="earTh2" aria-live="polite"></p>
      <p class="sh-ex" lang="en" id="earExs"></p>
      <div class="sh-state" id="earState" aria-live="polite"></div>
      <div class="sh-timer"><i id="earBar"></i></div>
    </div>
    <div class="st-tools sh-ctl ear-ctl">
      <button class="tool" id="earPrev" aria-label="คำก่อนหน้า"><span>⏮</span>ก่อนหน้า</button>
      <button class="tool" id="earPlay"><span>⏸</span>หยุด</button>
      <button class="tool" id="earNext" aria-label="คำถัดไป"><span>⏭</span>ถัดไป</button>
      <button class="tool" id="earDim" aria-label="ดับหน้าจอ"><span>🌙</span>ดับจอ</button>
    </div>`;
  const bar = $('#earBar');
  const setBar = (ms) => { bar.style.transition = 'none'; bar.style.width = '0'; if (ms) { void bar.offsetWidth; bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; } };
  const halt = () => { tok++; clearTimeout(timer); setBar(0); if (window.speechSynthesis) speechSynthesis.cancel(); };
  // Speak and wait until it ends (or a safety timeout: some voices never report the end).
  const sayP = (text, opt) => new Promise((res) => {
    let done = false; const fin = () => { if (!done) { done = true; clearTimeout(t); res(); } };
    const t = setTimeout(fin, 2500 + text.length * 140), u = speak(text, opt);
    if (u) { u.onend = fin; u.onerror = fin; } else setTimeout(fin, 500);
  });
  const wait = (ms) => new Promise((res) => { timer = setTimeout(res, ms); });
  const paint = (w, th, ex, state) => {
    $('#earPos').textContent = `${i + 1}/${list.length}`; $('#earProg').style.width = ((i + 1) / list.length * 100) + '%';
    $('#earWord').textContent = w.w; $('#earTh2').textContent = th ? w.t : ''; $('#earExs').textContent = ex ? w.e : '';
    $('#earState').textContent = state;
  };
  const finish = () => {
    halt(); playing = false; letSleep();
    S.counts.ear = (S.counts.ear || 0) + 1; markActive(); addXP(Math.min(20, list.length)); save(); sfx('ok');
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">🎧</div><div class="h2">ฟังครบ ${list.length} คำแล้ว</div>
      <p class="small muted">ฟังซ้ำบ่อยๆ ช่วยให้เสียงกับความหมายเชื่อมกัน คำไหนยังนึกไม่ออก ไปทบทวนในแฟลชการ์ดต่อได้เลย</p>
      <button class="btn primary block" id="earAgain">🔁 ฟังรอบใหม่</button><button class="btn block" id="earCards" style="margin-top:8px">🗂️ ไปแฟลชการ์ด</button></div>`;
    $('#earAgain').onclick = () => renderEar(); $('#earCards').onclick = () => go('cards');
  };
  const run = async () => {
    const my = ++tok, w = list[i], ok = () => my === tok && current === 'ear';
    clearTimeout(timer);
    paint(w, false, false, '🔊 ฟังคำ'); setBar(0);
    await sayP(w.w); if (!ok()) return;
    paint(w, false, false, '🤔 นึกความหมายดู…'); setBar(earOpt.gap * 1000);
    await wait(earOpt.gap * 1000); if (!ok()) return;
    setBar(0); paint(w, true, false, '💡 ความหมาย');
    if (earOpt.th) await sayP(thFirst(w.t), { lang: 'th-TH' }); else await wait(900);
    if (!ok()) return;
    if (earOpt.ex && w.e) { paint(w, true, true, '📖 ตัวอย่าง'); await sayP(w.e); if (!ok()) return; }
    await wait(earOpt.gap > 1 ? 700 : 100); if (!ok()) return;
    if (i + 1 < list.length) { i++; run(); } else finish();
  };
  const setPlay = (on) => { playing = on; $('#earPlay').innerHTML = on ? '<span>⏸</span>หยุด' : '<span>▶️</span>เล่นต่อ'; };
  const move = (d) => { halt(); i = Math.max(0, Math.min(list.length - 1, i + d)); if (playing) run(); else { const w = list[i]; paint(w, true, true, 'หยุดไว้'); } };
  $('#earBack').onclick = () => renderEar();
  $('#earPlay').onclick = () => { if (playing) { setPlay(false); halt(); $('#earState').textContent = 'หยุดไว้ แตะ ▶️ เพื่อเล่นต่อ'; } else { setPlay(true); run(); } };
  $('#earPrev').onclick = () => move(-1);
  $('#earNext').onclick = () => move(1);
  $('#earDim').onclick = () => {
    const d = document.createElement('div');
    d.className = 'ear-dim'; d.id = 'earDimmer'; d.setAttribute('role', 'button'); d.setAttribute('aria-label', 'แตะเพื่อเปิดจอ'); d.tabIndex = 0;
    d.innerHTML = '<span>แตะเพื่อเปิดจอ</span>';
    const off = () => d.remove(); d.onclick = off; d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') off(); };
    document.body.appendChild(d); d.focus();
  };
  keepAwake();
  cleanup = () => { halt(); letSleep(); const d = document.getElementById('earDimmer'); if (d) d.remove(); };
  run();
}
