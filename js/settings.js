'use strict';
// Settings, word-of-the-day settings and home layout pages.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- settings ---------- */
// Pre-built calendar files in reminders/ (see README): one per time.
const REMIND_TIMES = ['0600', '0700', '0800', '0900', '1200', '1700', '1800', '1900', '2000', '2100', '2200'];
const setOpen = {}; // which settings groups are expanded (kept while the app is open)
const setIsOpen = (id) => ((id in setOpen ? setOpen[id] : id === 'lv' || id === 'learn') ? 'open' : '');
function renderSettings() {
  const st = S.settings;
  const lvChip = (l) => `<button class="chip" data-v="${l}">${LV_LABEL[l]} · ${W.filter((w) => w.g === l).length} คำ</button>`;
  view.innerHTML = `
    <details class="set-group" data-g="lv" ${setIsOpen('lv')}><summary>📚 ระดับคำศัพท์ที่เรียน</summary><div class="card-box">
      <div class="small muted" style="margin-bottom:8px"><b>ชุด 3000 คำ</b> · คำหลักที่ต้องรู้</div>
      <div class="chips grid" id="lvls">${LEVELS_3000.map(lvChip).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px"><b>ชุด 5000 คำ</b> · คำเพิ่มเติมระดับสูง</div>
      <div class="chips grid" id="lvls5">${LEVELS_5000.map(lvChip).join('')}</div>
      <p class="small muted">A1–A2 = พื้นฐาน, B1–B2 = ระดับกลาง, B2+ และ C1 = ระดับสูง (เลือกได้หลายระดับ)</p>
      <div class="set-row stack" style="border-top:1px solid var(--border);padding-top:12px"><span>คำใหม่จากหมวด</span>
        <select class="sel" id="topic"><option value="">📚 ทุกหมวด</option>${TOPICS.map(([id]) => `<option value="${id}" ${st.topic === id ? 'selected' : ''}>${TOPIC_LABEL[id]}</option>`).join('')}</select></div>
      <p class="small muted" style="margin-bottom:0">เลือกหมวดแล้ว คำใหม่ในแฟลชการ์ดและไถศัพท์จะมาจากหมวดนั้น ส่วนคำที่ถึงวันทบทวนยังมาตามปกติ</p>
    </div></details>

    <details class="set-group" data-g="learn" ${setIsOpen('learn')}><summary>🧠 การเรียน</summary><div class="card-box">
      <div class="set-row"><span>คำใหม่ต่อวัน</span>
        <select class="sel" id="npd">${[5, 10, 15, 20, 30, 50, 100].map((n) => `<option ${n === st.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row"><span>ลำดับคำใหม่</span>
        <select class="sel" id="ord"><option value="shuffle" ${st.order === 'shuffle' ? 'selected' : ''}>สุ่ม</option><option value="alpha" ${st.order === 'alpha' ? 'selected' : ''}>เรียงตามตัวอักษร</option></select></div>
      <button class="btn block" id="toPlace" style="margin:4px 0 8px">🎯 แบบทดสอบวัดระดับ (ข้ามคำที่รู้แล้ว)</button>
      <div class="set-row"><span>เปิดแอปแล้วไปที่</span>
        <select class="sel" id="start"><option value="home" ${st.start === 'home' ? 'selected' : ''}>🏠 หน้าแรก</option><option value="feed" ${st.start === 'feed' ? 'selected' : ''}>📱 ไถศัพท์</option><option value="cards" ${st.start === 'cards' ? 'selected' : ''}>🃏 แฟลชการ์ด</option></select></div>
      <div class="set-row"><span>ด้านหน้าการ์ด</span>
        <select class="sel" id="front"><option value="en" ${st.front === 'en' ? 'selected' : ''}>อังกฤษ → ไทย</option><option value="th" ${st.front === 'th' ? 'selected' : ''}>ไทย → อังกฤษ</option></select></div>
      <div class="set-row stack"><span>เกมเพิ่มเติมหลังทำแฟลชการ์ดครบ<br><span class="small muted">แตะเลือกได้หลายเกม จะขึ้นเป็นปุ่มต่อจาก "เล่นด่วน" ในหน้าจบรอบ</span></span>
        <div class="chips" id="nextGames">${Object.keys(GAMES).map((g) => `<button class="chip ${(st.nextGames || []).includes(g) ? 'on' : ''}" data-v="${g}">${GAMES[g].icon} ${GAMES[g].name}</button>`).join('')}</div></div>
      <button class="set-row set-link" id="wotdSetBtn"><span>✨ ตั้งค่าคำประจำวัน<br><span class="small muted">เลือกระดับ สถานะคำ และหมวดที่อยากให้ขึ้นในกล่องหน้าแรก</span></span><span class="muted">›</span></button>
    </div></details>

    <details class="set-group" data-g="remind" ${setIsOpen('remind')}><summary>⏰ เตือนให้มาเรียนทุกวัน</summary><div class="card-box">
      <div class="set-row"><span>เวลาเตือน</span>
        <select class="sel" id="remind">${REMIND_TIMES.map((t) => `<option value="${t}" ${t === S.remind ? 'selected' : ''}>${t.slice(0, 2)}:${t.slice(2)} น.</option>`).join('')}</select></div>
      ${canPush() && auth ? `<div class="set-row"><span>🔔 แจ้งเตือนในแอป</span>
        <label class="switch"><input type="checkbox" id="pushBtn"><span></span></label></div>
      <p class="small muted" style="margin-top:0">เตือนตามเวลานี้ เฉพาะวันที่ยังไม่ได้เล่น บอกจำนวนการ์ดที่รอทบทวน แตะแล้วเปิดแอปได้เลย (เปิดอันนี้แล้วไม่ต้องใช้ปฏิทิน จะได้ไม่เตือนซ้ำ)</p>` : ''}
      ${canPush() && auth ? '<details class="cal-alt"><summary class="small muted">📅 หรือใช้การเตือนในปฏิทินแทน</summary>' : ''}
      <a class="btn block" id="remindAdd" href="reminders/${S.remind}.ics" target="_blank" rel="noopener" style="margin-top:8px;text-decoration:none">📅 เพิ่มการเตือนลงปฏิทิน</a>
      <p class="small muted" style="margin-bottom:0">จะเปิดหน้าปฏิทินของ iPhone ให้กด "เพิ่มทั้งหมด" ปฏิทินจะเตือนทุกวันตามเวลานี้ แตะการแจ้งเตือนแล้วกดลิงก์เพื่อเปิดแอป (ถ้าเปลี่ยนเวลา ให้ลบนัดเดิมในปฏิทินก่อน)</p>
      ${canPush() && auth ? '</details>' : ''}
      <div class="set-row"><span>🔴 ตัวเลขการ์ดค้างบนไอคอนแอป</span>
        <label class="switch"><input type="checkbox" id="badge" ${st.badge !== false ? 'checked' : ''}><span></span></label></div>
    </div></details>

    <details class="set-group" data-g="look" ${setIsOpen('look')}><summary>🎨 หน้าตา</summary><div class="card-box">
      <div class="set-row"><span>ธีม</span>
        <div class="seg" id="theme">${[['auto', '🌓 ตามเครื่อง'], ['light', '☀️ สว่าง'], ['dark', '🌙 มืด']].map(([v, t]) => `<button class="${(st.theme || 'auto') === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      <div class="set-row"><span>🎯 แสดงการ์ดภารกิจต่อ แม้ทำครบแล้ว</span>
        <label class="switch"><input type="checkbox" id="questShow" ${st.questShowDone ? 'checked' : ''}><span></span></label></div>
      <button class="set-row set-link" id="homeSetBtn"><span>🧩 จัดเรียงหน้าแรก<br><span class="small muted">เปิด/ปิด สลับลำดับ และปรับความกว้างของกล่อง</span></span><span class="muted">›</span></button>
    </div></details>

    <details class="set-group" data-g="sound" ${setIsOpen('sound')}><summary>🔊 เสียง</summary><div class="card-box">
      <div class="set-row"><span>เสียงอ่าน</span><select class="sel" id="voice" style="max-width:62%"></select></div>
      <div class="small muted" id="voiceN" style="margin:-4px 0 6px"></div>
      <div class="set-row"><span>อ่านออกเสียงอัตโนมัติ</span>
        <label class="switch"><input type="checkbox" id="auto" ${st.autoSpeak ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>เสียงเอฟเฟกต์ในเกม</span>
        <label class="switch"><input type="checkbox" id="sfx" ${st.sfx ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>สำเนียง</span>
        <select class="sel" id="acc"><option value="en-US" ${st.accent === 'en-US' ? 'selected' : ''}>🇺🇸 อเมริกัน</option><option value="en-GB" ${st.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 อังกฤษ</option></select></div>
      <div class="set-row"><span>ความเร็วเสียง</span>
        <select class="sel" id="rate">${[[0.7, 'ช้า'], [0.9, 'ปกติ'], [1.05, 'เร็ว']].map(([v, t]) => `<option value="${v}" ${v === st.rate ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="set-row"><span>แตะ 🔊 ซ้ำ = ฟังช้าลง<br><span class="small muted">แตะปุ่มฟังคำ/ประโยคเดิมอีกครั้งภายใน 8 วินาที จะพูดช้าลงให้ฟังชัดๆ</span></span>
        <label class="switch"><input type="checkbox" id="slowRep" ${st.slowRepeat !== false ? 'checked' : ''}><span></span></label></div>
      <button class="btn block" id="test" style="margin-top:8px">🔊 ทดสอบเสียง</button>
    </div></details>

    <details class="set-group" data-g="sync" ${setIsOpen('sync')}><summary>☁️ ซิงก์ข้อมูลอัตโนมัติ</summary><div class="card-box">${!syncOn()
      ? '<p class="small muted" style="margin:0">ยังไม่ได้เปิดใช้ ต้องตั้งค่า Supabase ในไฟล์ <code>config.js</code> ก่อน (ดูขั้นตอนใน SYNC-SETUP.md ใน GitHub) จากนั้นความคืบหน้าจะซิงก์ขึ้นคลาวด์เอง ลบแอปหรือเปลี่ยนเครื่องก็ไม่หาย</p>'
      : auth ? `<p class="small" style="margin-top:0">เข้าสู่ระบบเป็น <b>${esc(auth.user.email)}</b><br><span class="muted">ซิงก์ล่าสุด: ${syncState.last ? new Date(syncState.last).toLocaleTimeString('th-TH', { timeStyle: 'short' }) : 'ยังไม่ได้ซิงก์ในรอบนี้'}${syncState.error ? ' · ⚠️ ' + esc(syncState.error) : ''}</span></p>
        ${SYNC.leaderboard ? `<div class="set-row"><span>ชื่อในอันดับเพื่อน</span><input class="sel" id="nick" maxlength="20" style="width:140px" value="${esc(boardName())}"></div>` : ''}
        <div class="row"><button class="btn grow" id="syncNow">🔄 ซิงก์ตอนนี้</button><button class="btn grow" id="logout">ออกจากระบบ</button></div>`
      : '<p class="small muted" style="margin-top:0">เข้าสู่ระบบด้วยอีเมลที่ได้รับเชิญ แล้วความคืบหน้าจะซิงก์ขึ้นคลาวด์อัตโนมัติ ใช้ได้หลายเครื่อง</p><button class="btn primary block" id="login">เข้าสู่ระบบ</button>'}
    </div></details>

    <details class="set-group" data-g="backup" ${setIsOpen('backup')}><summary>💾 สำรองข้อมูล</summary><div class="card-box">
      <p class="small muted" style="margin-top:0">${syncOn() && auth
        ? '☁️ ความคืบหน้าซิงก์ขึ้นคลาวด์อัตโนมัติแล้ว ลบแอปหรือเปลี่ยนเครื่องก็ไม่หาย จะส่งออกเป็นไฟล์เก็บไว้อีกชั้นก็ได้'
        : `ความคืบหน้าเก็บไว้ในเครื่องนี้เท่านั้น ถ้าลบไอคอนแอปออกจากหน้าจอโฮม ข้อมูลจะหายด้วย แนะนำให้สำรองเก็บไว้ใน iCloud Drive (แอปจะเตือนทุก ${BACKUP_EVERY} วัน)`}</p>
      <p class="small" style="margin-top:0"><b>สำรองล่าสุด:</b> ${S.backupAt ? new Date(S.backupAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : 'ยังไม่เคยสำรอง'}<br><span class="muted" id="persist"></span></p>
      <div class="row"><button class="btn grow" id="exp">📤 ส่งออก</button><button class="btn grow" id="imp">📥 นำเข้า</button></div>
      <input type="file" id="file" accept=".json,application/json" hidden>
      <p class="small muted" style="margin-bottom:0">นำเข้าแบบรวมข้อมูล: คำไหนในเครื่องนี้ก้าวหน้ากว่าไฟล์สำรอง จะเก็บของเครื่องนี้ไว้</p>
    </div></details>

    <button class="card-box guide-link" id="guideBtn" style="margin-top:24px"><span>📘</span><div class="grow"><b>คู่มือการใช้งาน & ทริก</b><div class="small muted">วิธีใช้ทุกส่วนของแอป และวิธีจำศัพท์ให้ได้ผลที่สุด</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="clBtn"><span>🆕</span><div class="grow"><b>ประวัติการอัปเดต</b><div class="small muted">ดูว่าแต่ละเวอร์ชันเพิ่มหรือแก้อะไรบ้าง (ตอนนี้ ${APP_VERSION})</div></div><span class="muted">›</span></button>

    <div class="card-box danger-zone"><b>⚠️ โซนอันตราย</b>
      <p class="small muted">ลบคำที่เรียน สถิติ สตรีค และ XP ทั้งหมด (การตั้งค่ายังอยู่) ย้อนกลับไม่ได้${syncOn() && auth ? ' · ข้อมูลบนคลาวด์จะถูกล้างด้วย' : ''}</p>
      <button class="btn danger block" id="reset">ล้างความคืบหน้าทั้งหมด</button>
    </div>
    <p class="center small muted">${W.length} คำ · คำแปลไทยและประโยคตัวอย่างเขียนขึ้นเองสำหรับช่วยจำ<br>รายการคำและระดับ CEFR อ้างอิงจากรายการ Oxford 3000™ และ Oxford 5000™ ซึ่งเป็นเครื่องหมายการค้าของ Oxford University Press<br>แอปนี้ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Oxford University Press<br>เวอร์ชัน ${APP_VERSION}</p>`;

  view.querySelectorAll('details.set-group').forEach((d) => { d.ontoggle = () => { setOpen[d.dataset.g] = d.open; }; });
  const paint = () => view.querySelectorAll('#lvls .chip, #lvls5 .chip').forEach((c) => c.classList.toggle('on', st.levels.includes(c.dataset.v)));
  paint();
  $('#lvls').onclick = $('#lvls5').onclick = (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    const v = c.dataset.v;
    if (st.levels.includes(v)) { if (st.levels.length > 1) st.levels = st.levels.filter((x) => x !== v); else toast('ต้องเลือกอย่างน้อย 1 ระดับ'); }
    else st.levels = LEVELS.filter((l) => l === v || st.levels.includes(l));
    save(); paint();
  };
  $('#wotdSetBtn').onclick = () => go('wotdset');
  $('#nextGames').onclick = (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    const on = new Set(st.nextGames || []);
    if (on.has(c.dataset.v)) on.delete(c.dataset.v); else on.add(c.dataset.v);
    st.nextGames = Object.keys(GAMES).filter((g) => on.has(g)); // keep the games-menu order
    c.classList.toggle('on', on.has(c.dataset.v)); save();
  };
  $('#guideBtn').onclick = () => go('guide', 'settings');
  $('#clBtn').onclick = () => go('changelog', 'settings');
  $('#npd').onchange = (e) => { st.newPerDay = +e.target.value; save(); };
  $('#ord').onchange = (e) => { st.order = e.target.value; save(); };
  $('#toPlace').onclick = () => go('placement');
  $('#topic').onchange = (e) => { st.topic = e.target.value; save(); };
  $('#start').onchange = (e) => { st.start = e.target.value; save(); };
  $('#front').onchange = (e) => { st.front = e.target.value; save(); };
  $('#auto').onchange = (e) => { st.autoSpeak = e.target.checked; save(); };
  $('#questShow').onchange = (e) => { st.questShowDone = e.target.checked; save(); };
  $('#badge').onchange = async (e) => {
    st.badge = e.target.checked; save();
    if (st.badge && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (err) { /* ignore */ }
    }
    updateBadge();
  };
  $('#sfx').onchange = (e) => { st.sfx = e.target.checked; save(); sfx('ok'); };
  $('#acc').onchange = (e) => { st.accent = e.target.value; save(); speak('Hello! Nice to meet you.'); };
  $('#rate').onchange = (e) => { st.rate = +e.target.value; save(); speak('vocabulary'); };
  $('#slowRep').onchange = (e) => { st.slowRepeat = e.target.checked; save(); };
  $('#test').onclick = () => speak('Hello! Let\'s learn English together.');
  fillVoices();
  $('#voice').onchange = (e) => { st.voice = e.target.value; save(); speak('Hello! This is how I sound when I read your words.'); };
  $('#theme').onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    st.theme = b.dataset.v; save(); applyTheme();
    view.querySelectorAll('#theme button').forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#homeSetBtn').onclick = () => go('homeset');
  $('#remind').onchange = (e) => {
    S.remind = e.target.value; save(); $('#remindAdd').href = `reminders/${S.remind}.ics`;
    if (canPush() && auth) pushSub().then((sub) => sub && savePushSub(sub)).catch(() => {});
  };

  if ($('#login')) $('#login').onclick = () => go('login');
  if ($('#nick')) $('#nick').onchange = (e) => { S.nick = e.target.value.trim().slice(0, 20); save(); };
  const pb = $('#pushBtn');
  if (pb) {
    const paintPush = async () => { pb.checked = !!(await pushSub()) && Notification.permission === 'granted'; };
    paintPush();
    pb.onchange = async () => {
      pb.disabled = true;
      try {
        if (!pb.checked) { await disablePush(); toast('ปิดการแจ้งเตือนแล้ว'); } else { await enablePush(); toast('🔔 เปิดการแจ้งเตือนแล้ว'); }
      } catch (err) { toast('⚠️ ' + (err.message || err)); }
      pb.disabled = false; paintPush();
    };
  }
  if ($('#syncNow')) $('#syncNow').onclick = async () => { await syncNow(true); renderSettings(); };
  if ($('#logout')) $('#logout').onclick = () => {
    if (!confirm('ออกจากระบบ? ข้อมูลในเครื่องนี้ยังอยู่ แต่จะไม่ซิงก์จนกว่าจะเข้าสู่ระบบใหม่')) return;
    setAuth(null); toast('ออกจากระบบแล้ว'); go(mustLogin() ? 'login' : 'settings');
  };
  $('#exp').onclick = async () => { await exportBackup(); renderSettings(); };
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((ok) => { const el = $('#persist'); if (el) el.textContent = ok ? '🔒 เครื่องเก็บข้อมูลแบบถาวรแล้ว' : ''; }).catch(() => {});
  }
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || typeof d.prog !== 'object') throw new Error('bad file');
      const { added, updated } = mergeBackup(d);
      toast(`นำเข้าแล้ว ✅ เพิ่ม ${added} คำ · อัปเดต ${updated} คำ`); go('home');
    } catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
  };
  $('#reset').onclick = async () => {
    const cloud = syncOn() && auth;
    if (!confirm('ล้างความคืบหน้าทั้งหมดใช่ไหม? (ย้อนกลับไม่ได้)' + (cloud ? '\nข้อมูลบนคลาวด์จะถูกล้างด้วย ถ้ามีเครื่องอื่นที่ซิงก์อยู่ ให้ล้างที่เครื่องนั้นด้วย ไม่อย่างนั้นข้อมูลจะซิงก์กลับมา' : ''))) return;
    const settings = S.settings;
    S = defaults(); S.settings = settings; save();
    // overwrite the cloud row, otherwise the next sync would merge the old progress back in
    if (cloud && !(await syncNow(false, true))) toast('⚠️ ล้างในเครื่องแล้ว แต่ล้างบนคลาวด์ไม่สำเร็จ ลองใหม่อีกครั้ง');
    else toast('ล้างข้อมูลแล้ว');
    go('home');
  };
}

/* ---------- word of the day settings page ---------- */
function renderWotdSet() {
  const st = S.settings;
  view.innerHTML = `
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="wsBack">‹ กลับ</button></div>
    <div class="card-box">
      <p class="small muted" style="margin-top:0">เลือกได้หลายข้อและผสมกันได้ เช่น A1 + กำลังเรียน · ไม่เลือกข้อไหนในกลุ่ม = ใช้ตามตั้งค่าหลักด้านบน (ระดับที่เรียน / หมวดคำใหม่) หรือไม่กรองสถานะ</p>
      <div class="small muted" style="margin:6px 0 8px"><b>ระดับ</b></div>
      <div class="chips" id="wLv">${LEVELS.map((l) => `<button class="chip" data-g="lv" data-v="${l}">${LV_LABEL[l]}</button>`).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px"><b>สถานะคำ</b></div>
      <div class="chips" id="wSt">${WOTD_ST.map(([v, t]) => `<button class="chip" data-g="st" data-v="${v}">${t}</button>`).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px"><b>หมวดคำ</b></div>
      <div class="chips" id="wTp">${TOPICS.map(([id]) => `<button class="chip" data-g="tp" data-v="${id}">${TOPIC_LABEL[id]}</button>`).join('')}</div>
      <p class="small" id="wCount" style="margin:12px 0 8px"></p>
      <button class="btn block" id="wReset">↺ ล้างเงื่อนไข</button>
    </div>

    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#wsBack').onclick = () => go('settings');
  const wPaint = () => {
    const c = wotdCfg();
    view.querySelectorAll('#wLv .chip, #wSt .chip, #wTp .chip').forEach((b) => b.classList.toggle('on', c[b.dataset.g].includes(b.dataset.v)));
    const n = wotdPool().length;
    $('#wCount').innerHTML = n ? `ตรงเงื่อนไข <b>${n}</b> คำ` : '<span style="color:var(--bad,#d33)">ไม่มีคำตรงเงื่อนไข — จะสุ่มจากระดับที่เรียนอยู่แทน</span>';
  };
  wPaint();
  const wChange = (fn) => { const c = wotdCfg(); fn(c); st.wotd = c; S.wotdPick = null; save(); wPaint(); };
  view.querySelector('#wLv').parentNode.onclick = (e) => {
    const b = e.target.closest('.chip[data-g]'); if (!b) return;
    wChange((c) => { const a = c[b.dataset.g], v = b.dataset.v; c[b.dataset.g] = a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; });
  };
  $('#wReset').onclick = () => wChange((c) => { c.lv = []; c.st = []; c.tp = []; });
}

/* ---------- home layout page ---------- */
function renderHomeSet() {
  view.innerHTML = `
    <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="hsBack">‹ กลับ</button></div>
    <div class="card-box">
      <p class="small muted" style="margin-top:0">เปิด/ปิดกล่อง เลื่อนลำดับด้วย ↑ ↓ และเลือกความกว้าง "ครึ่ง" 2 กล่องติดกันจะอยู่แถวเดียวกัน (กล่องครึ่งที่ไม่มีคู่จะขยายเต็มแถวให้เอง)</p>
      <div id="hcfg"></div>
      <button class="btn block" id="hcReset" style="margin-top:10px">↺ คืนค่าเริ่มต้น</button>
    </div>
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  $('#hsBack').onclick = () => go('settings');
  const paintHome = () => {
    const list = homeBlocks();
    $('#hcfg').innerHTML = list.map((b, i) => `<div class="hc-row${b.on ? '' : ' off'}" data-id="${b.id}">
      <label class="switch"><input type="checkbox" data-act="tog" aria-label="แสดง ${esc(b.name)}" ${b.on ? 'checked' : ''}><span></span></label>
      <span class="hc-name">${b.ic} ${esc(b.name)}</span>
      <div class="seg">${[['full', 'เต็ม'], ['half', 'ครึ่ง']].map(([v, t]) => `<button class="${b.w === v ? 'on' : ''}" data-act="w" data-v="${v}">${t}</button>`).join('')}</div>
      <span class="hc-mv"><button data-act="up" aria-label="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}>↑</button><button data-act="down" aria-label="เลื่อนลง" ${i === list.length - 1 ? 'disabled' : ''}>↓</button></span>
    </div>`).join('');
  };
  const editHome = (e) => {
    const el = e.target.closest('[data-act]'), row = e.target.closest('.hc-row'); if (!el || !row) return;
    const list = homeBlocks(), i = list.findIndex((b) => b.id === row.dataset.id), act = el.dataset.act;
    if (act === 'tog') list[i].on = el.checked;
    else if (act === 'w') list[i].w = el.dataset.v;
    else if (act === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    else if (act === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    S.homeCfg = list.map(({ id, on, w }) => ({ id, on, w }));
    save(); paintHome();
  };
  paintHome();
  $('#hcfg').onclick = (e) => { if (e.target.dataset.act !== 'tog') editHome(e); };
  $('#hcfg').onchange = editHome;
  $('#hcReset').onclick = () => { S.homeCfg = null; save(); paintHome(); toast('คืนค่าหน้าแรกแล้ว'); };
}
