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
        <select class="sel" id="topic"><option value="">📚 ทุกหมวด</option>${topicOptions(st.topic)}</select></div>
      <div class="set-row stack"><span>คำใหม่ตามเป้าหมาย</span>
        <select class="sel" id="goal"><option value="">🎯 ทุกเป้าหมาย</option>${TAGS.map((t) => `<option value="${t.id}" ${st.goal === t.id ? 'selected' : ''}>${TAG_LABEL[t.id]}</option>`).join('')}</select></div>
      <p class="small muted" style="margin-bottom:0">เลือกหมวดหรือเป้าหมายแล้ว คำใหม่ในแฟลชการ์ดและไถศัพท์จะมาจากหมวด/เป้าหมายนั้น (เลือกทั้งสองอย่าง = ต้องตรงทั้งคู่) ส่วนคำที่ถึงวันทบทวนยังมาตามปกติ <span id="goalCnt"></span></p>
    </div></details>

    <details class="set-group" data-g="learn" ${setIsOpen('learn')}><summary>🧠 การเรียน</summary><div class="card-box">
      <div class="set-row"><span>คำใหม่ต่อวัน</span>
        <select class="sel" id="npd">${[5, 10, 15, 20, 30, 50, 100].map((n) => `<option ${n === st.newPerDay ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="set-row"><span>กลับมาแบบไม่ท้อ<br><span class="small muted">การ์ดค้างเกิน 60 ใบ: พักคำใหม่ และทวนวันละ 50 ใบที่ค้างนานสุดก่อน</span></span>
        <label class="switch"><input type="checkbox" id="gentle" aria-label="กลับมาแบบไม่ท้อ" ${st.gentle !== false ? 'checked' : ''}><span></span></label></div>
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
        <div class="seg" id="theme">${[['auto', '🌓 ตามเครื่อง'], ['light', '☀️ สว่าง'], ['dark', '🌙 มืด'], ['black', '⚫ ดำสนิท']].map(([v, t]) => `<button class="${(st.theme || 'auto') === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      <div class="set-row" style="flex-wrap:wrap"><span>🎨 สีหลัก<br><span class="small muted" id="palName"></span></span>
        <div class="pal" id="palette" role="group" aria-label="สีหลัก">${PALETTES.map(([id, name, a, b]) => `<button data-p="${id}" aria-label="${name}" aria-pressed="${(st.palette || 'violet') === id}" class="${(st.palette || 'violet') === id ? 'on' : ''}"><i style="--sw1:${a};--sw2:${b}">${(st.palette || 'violet') === id ? '✓' : ''}</i></button>`).join('')}</div></div>
      <div class="set-row" style="flex-wrap:wrap"><span>📱 ไอคอนแอป<br><span class="small muted" id="icoName"></span></span>
        <div class="pal ico" id="iconPick" role="group" aria-label="ไอคอนแอป">${ICONS.map(([id, name]) => `<button data-i="${id}" aria-label="ไอคอน${name}" aria-pressed="${(st.icon || 'purple') === id}" class="${(st.icon || 'purple') === id ? 'on' : ''}"><img src="${iconSrc(id)}" alt="" width="44" height="44"></button>`).join('')}</div></div>
      <p class="small muted" style="margin-top:0">iPhone/iPad ตั้งไอคอนได้ตอน "เพิ่มลงหน้าจอโฮม" เท่านั้น เลือกแบบที่ชอบตรงนี้ แล้วทำตามขั้นตอนใน <a href="#" id="icoHow">วิธีเปลี่ยนไอคอน</a> (ต้องสำรองข้อมูลก่อน เพราะลบไอคอนเดิมแล้วข้อมูลในเครื่องหาย)</p>
      <div class="set-row"><span>✨ หน้าเลื่อนตอนเปลี่ยนแท็บ<br><span class="small muted">และตอนเปิด/ปิดหน้าย่อย</span></span>
        <label class="switch"><input type="checkbox" id="animPage" aria-label="หน้าเลื่อนตอนเปลี่ยนแท็บ" ${st.animPage !== false ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>👆 ปุ่มเด้ง/สั่นตอนตอบ<br><span class="small muted">เด้งเมื่อตอบถูก สั่นเมื่อตอบผิด</span></span>
        <label class="switch"><input type="checkbox" id="animAnswer" aria-label="ปุ่มเด้ง/สั่นตอนตอบ" ${st.animAnswer !== false ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>🎉 พลุฉลอง<br><span class="small muted">ตอนเลเวลอัป ทำภารกิจครบ ได้เหรียญ (เสียงฉลองยังมี)</span></span>
        <label class="switch"><input type="checkbox" id="confetti" aria-label="พลุฉลอง" ${st.confetti !== false ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>🌈 สีตามหมวดบนการ์ด<br><span class="small muted">แฟลชการ์ดและหน้าคำมีสีอ่อนตามหมวด ช่วยจำด้วยสี</span></span>
        <label class="switch"><input type="checkbox" id="topicTint" aria-label="สีตามหมวดบนการ์ด" ${st.topicTint !== false ? 'checked' : ''}><span></span></label></div>
      <div class="set-row"><span>📳 สั่นตอบรับ<br><span class="small muted">สั่นเบาๆ ตอนตอบถูก/ผิด (iPhone ต้อง iOS 18 ขึ้นไป · Android สั่นได้เลย)</span></span>
        <label class="switch"><input type="checkbox" id="haptic" aria-label="สั่นตอบรับ" ${st.haptic !== false ? 'checked' : ''}><span></span></label></div>
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
        <label class="switch"><input type="checkbox" id="slowRep" aria-label="แตะ 🔊 ซ้ำ = ฟังช้าลง" ${st.slowRepeat !== false ? 'checked' : ''}><span></span></label></div>
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
      <div class="small" style="margin:16px 0 6px"><b>📤 ส่งออกรายการคำศัพท์</b> <span class="muted">ไปใช้ใน Excel / Google Sheets หรือ Anki</span></div>
      <select class="sel block-sel" id="xpWhich" aria-label="คำที่จะส่งออก">${Object.entries(EXPORT_SETS).map(([k, [name, f]]) => `<option value="${k}">${name} (${W.filter(f).length})</option>`).join('')}</select>
      <div class="row" style="margin-top:8px"><button class="btn grow" id="xpCsv">📄 CSV</button><button class="btn grow" id="xpAnki">🃏 Anki</button></div>
    </div></details>

    <button class="card-box guide-link" id="guideBtn" style="margin-top:24px"><span>📘</span><div class="grow"><b>คู่มือการใช้งาน & ทริก</b><div class="small muted">วิธีใช้ทุกส่วนของแอป และวิธีจำศัพท์ให้ได้ผลที่สุด</div></div><span class="muted">›</span></button>
    <button class="card-box guide-link" id="clBtn"><span>🆕</span><div class="grow"><b>ประวัติการอัปเดต</b><div class="small muted">ดูว่าแต่ละเวอร์ชันเพิ่มหรือแก้อะไรบ้าง (ตอนนี้ ${APP_VERSION})</div></div><span class="muted">›</span></button>

    <details class="set-group danger-group" data-g="danger" ${setIsOpen('danger')}><summary>⚠️ โซนอันตราย</summary><div class="card-box danger-zone">
      <p class="small muted">ลบคำที่เรียน สถิติ สตรีค และ XP ทั้งหมด (การตั้งค่ายังอยู่) ย้อนกลับไม่ได้${syncOn() && auth ? ' · ข้อมูลบนคลาวด์จะถูกล้างด้วย' : ''}</p>
      <button class="btn danger block" id="reset">ล้างความคืบหน้าทั้งหมด</button>
    </div></details>
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
  // How many new words the level + topic + goal choice still leaves (0 = nothing new would come).
  const newCnt = () => { const el = $('#goalCnt'); if (el) el.textContent = st.topic || st.goal ? `· เหลือคำใหม่ ${pool().filter((w) => !S.prog[w.w] && inTopic(w)).length} คำในระดับที่เลือก` : ''; };
  newCnt();
  $('#topic').onchange = (e) => { st.topic = e.target.value; save(); newCnt(); };
  $('#goal').onchange = (e) => { st.goal = e.target.value; save(); newCnt(); };
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
  $('#haptic').onchange = (e) => { st.haptic = e.target.checked; save(); if (st.haptic) haptic('ok'); };
  $('#sfx').onchange = (e) => { st.sfx = e.target.checked; save(); sfx('ok'); };
  $('#acc').onchange = (e) => { st.accent = e.target.value; save(); speak('Hello! Nice to meet you.'); };
  $('#rate').onchange = (e) => { st.rate = +e.target.value; save(); speak('vocabulary'); };
  $('#gentle').onchange = (e) => { st.gentle = e.target.checked; save(); };
  $('#slowRep').onchange = (e) => { st.slowRepeat = e.target.checked; save(); };
  $('#test').onclick = () => speak('Hello! Let\'s learn English together.');
  fillVoices();
  $('#voice').onchange = (e) => { st.voice = e.target.value; save(); speak('Hello! This is how I sound when I read your words.'); };
  $('#theme').onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    st.theme = b.dataset.v; save(); applyTheme();
    view.querySelectorAll('#theme button').forEach((x) => x.classList.toggle('on', x === b));
  };
  const palName = () => { const p = PALETTES.find((x) => x[0] === (st.palette || 'violet')); $('#palName').textContent = p ? p[1] : ''; };
  palName();
  const icoName = () => { const p = ICONS.find((x) => x[0] === (st.icon || 'purple')); $('#icoName').textContent = p ? p[1] : ''; };
  icoName();
  $('#iconPick').onclick = (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    st.icon = b.dataset.i; save(); applyIcon(); icoName();
    view.querySelectorAll('#iconPick button').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  };
  $('#icoHow').onclick = (e) => { e.preventDefault(); go('guide', 'settings'); };
  $('#palette').onclick = (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    st.palette = b.dataset.p; save(); applyTheme(); palName();
    view.querySelectorAll('#palette button').forEach((x) => {
      const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); x.firstElementChild.textContent = on ? '✓' : '';
    });
  };
  ['animPage', 'animAnswer', 'confetti', 'topicTint'].forEach((k) => { $('#' + k).onchange = (e) => { st[k] = e.target.checked; save(); applyAnim(); }; });
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
  $('#xpCsv').onclick = () => exportWords($('#xpWhich').value, 'csv');
  $('#xpAnki').onclick = () => exportWords($('#xpWhich').value, 'anki');
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
    if (!confirm('ล้างความคืบหน้าทั้งหมดใช่ไหม? (ย้อนกลับไม่ได้)\nชุดของฉันไม่ถูกลบ (แต่ความคืบหน้าในชุดไม่ถูกล้างด้วย)' + (cloud ? '\nข้อมูลบนคลาวด์จะถูกล้างด้วย ถ้ามีเครื่องอื่นที่ซิงก์อยู่ ให้ล้างที่เครื่องนั้นด้วย ไม่อย่างนั้นข้อมูลจะซิงก์กลับมา' : ''))) return;
    const { settings, decks, dprog } = S; // my word sets and their progress survive a reset
    S = defaults(); S.settings = settings; S.decks = decks; S.dprog = dprog; save();
    // overwrite the cloud row, otherwise the next sync would merge the old progress back in
    if (cloud && !(await syncNow(false, true))) toast('⚠️ ล้างในเครื่องแล้ว แต่ล้างบนคลาวด์ไม่สำเร็จ ลองใหม่อีกครั้ง');
    else toast('ล้างข้อมูลแล้ว');
    go('home');
  };
  labelRows(view);
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

/* ---------- word export (CSV / Anki) ---------- */
const EXPORT_SETS = {
  learned: ['คำที่เรียนแล้วทั้งหมด', (w) => !!S.prog[w.w]],
  learning: ['กำลังเรียน', (w) => status(w) === 'learning'],
  mastered: ['🟢 จำได้แล้ว', (w) => status(w) === 'mastered'],
  star: ['⭐ คำติดดาว', isStar],
  leech: ['🐢 คำดื้อ', isLeech],
  all: ['ทุกคำในแอป', () => true],
};
const STATUS_TH = { new: 'ยังไม่เรียน', learning: 'กำลังเรียน', mastered: 'จำได้แล้ว' };
// CSV opens in Excel/Sheets (UTF-8 BOM so Thai shows correctly); the Anki file is tab-separated with a
// front (word, part of speech, IPA) and a back (Thai, example + translation, memory note) plus level/topic tags.
function exportWords(which, fmt) {
  const list = W.filter(EXPORT_SETS[which][1]);
  if (!list.length) return toast('ยังไม่มีคำในกลุ่มนี้');
  const due = (p) => (p && p.d ? new Date(p.d).toLocaleDateString('en-CA') : '');
  let text, name, type;
  if (fmt === 'csv') {
    const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = [['word', 'pos', 'level', 'ipa', 'thai', 'example', 'thai_example', 'topic', 'status', 'seen', 'correct', 'wrong', 'next_review', 'note']];
    list.forEach((w) => { const p = S.prog[w.w]; rows.push([w.w, w.p, LV_LABEL[w.g] || w.g, w.i, w.t, w.e, w.et, w.tp ? TOPIC_LABEL[w.tp] : '', STATUS_TH[status(w)] || status(w), p ? p.s : 0, p ? p.c : 0, p ? p.x || 0 : 0, due(p), S.note[w.w] || '']); });
    text = '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n');
    name = `essential-vocab-${which}-${today()}.csv`; type = 'text/csv';
  } else {
    const c = (v) => esc(String(v || '')).replace(/[\t\r\n]+/g, ' ');
    const tag = (v) => String(v || '').replace(/\s+/g, '_');
    const lines = ['#separator:tab', '#html:true', '#tags column:3'];
    list.forEach((w) => lines.push([
      `<b>${c(w.w)}</b><br><small>${c(w.p)} · ${c(w.i)}</small>`,
      `${c(w.t)}<br><br><i>${c(w.e)}</i><br>${c(w.et)}${S.note[w.w] ? `<br><br>💡 ${c(S.note[w.w])}` : ''}`,
      `essential-vocab ${tag(LV_LABEL[w.g] || w.g)}${w.tp ? ' ' + tag(w.tp) : ''}`,
    ].join('\t')));
    text = lines.join('\n');
    name = `essential-vocab-${which}-anki-${today()}.txt`; type = 'text/plain';
  }
  saveFile(new File([text], name, { type }), 'คำศัพท์จากศัพท์ต้องรู้').then((ok) => { if (ok) toast(`ส่งออก ${list.length} คำแล้ว ✅`); });
}

