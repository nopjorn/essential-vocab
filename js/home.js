'use strict';
// Home screen: today card, quick play, weekly card, quest, progress, word of the day.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- home ---------- */
const installHidden = () => { try { return !!localStorage.getItem('o3k.installHide'); } catch (e) { return false; } };
function renderHome() {
  rollDay();
  const p = pool();
  const due = dueList(p).length;
  const newLeft = Math.max(0, S.settings.newPerDay - S.daily.fresh);
  const unseen = p.filter((w) => !S.prog[w.w]).length;
  const todo = due + Math.min(newLeft, unseen);
  const doneToday = S.daily.fresh + S.daily.reviews;
  const goal = S.settings.newPerDay;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

  const lastBackup = S.backupAt ? Math.floor((Date.now() - S.backupAt) / DAY) : null;
  // Each home block returns its HTML ('' = nothing to show today); order/width/visibility come from homeBlocks().
  const B = {
    hero: () => `<div class="hero pop">
      <div class="small" style="opacity:.9">${greeting()}</div>
      <div class="big" style="margin-top:6px">${todo}</div>
      <div>การ์ดที่รอวันนี้ (${lvNames(S.settings.levels)})</div>
      <div class="stats">
        <div class="stat"><b>${due}</b><span>ต้องทบทวน</span></div>
        <div class="stat"><b>${Math.min(newLeft, unseen)}</b><span>คำใหม่</span></div>
        <div class="stat"><b>${doneToday}</b><span>ทำแล้ววันนี้</span></div>
      </div>
      <button class="btn" id="startBtn">${todo ? '▶︎ เริ่มเรียนเลย' : '🎉 วันนี้ครบแล้ว! ทำอะไรต่อดี'}</button>
      <div class="goal-bar"><div style="width:${Math.min(100, S.daily.fresh / goal * 100)}%"></div></div>
      <div class="small" style="margin-top:4px;opacity:.9">เป้าคำใหม่วันนี้ ${S.daily.fresh}/${goal}</div>
    </div>`,
    feed: () => `<button class="quick-btn feed-btn" id="qFeed"><span>📱</span><b>ไถศัพท์</b><small>ปัดขึ้นเรื่อยๆ เหมือนไถฟีด</small></button>`,
    play: () => `<button class="quick-btn" id="qPlay"><span>⚡</span><b>เล่นด่วน</b><small>เกมสุ่ม 10 ข้อ ~1 นาที</small></button>`,
    month: () => new Date().getDate() <= 7 && S.monthSeen !== monthKey() && monthStats(1).total ? `<div class="card-box week-card" id="monthCard"><b>📅 สรุปเดือน${monthName(monthKey(1))}</b>${monthBox(1, true)}${S.mtest[monthKey()] ? '' : '<button class="btn primary block" data-go="mtest" style="margin-top:10px">📝 ทำแบบทดสอบประจำเดือน</button>'}</div>` : '',
    week: () => S.weekSeen !== mondayKey() && weekStats(1).total ? `<div class="card-box week-card" id="weekCard"><b>📊 สรุปสัปดาห์ที่แล้ว</b>${weekBox(1, true)}</div>` : '',
    quest: questCard,
    wotd: wotdCard,
    level: levelCard,
    forecast: () => `<div class="card-box"><b>🔮 ทบทวน 7 วันข้างหน้า</b><div style="margin-top:8px">${forecastChart()}</div></div>`,
    prog: () => `<button class="card-box prog-card" id="statsBtn">
      <div class="row" style="justify-content:space-between"><b>📈 ความคืบหน้า</b><span class="small muted">ดูสถิติ ›</span></div>
      ${[['ชุด 3000 คำ', in3000().size, (w) => in3000().has(w.w)], ['ครบ 5000 คำ', W.length, () => true]].map(([name, n, f]) => {
        const l = W.filter((w) => f(w) && S.prog[w.w]).length, m = W.filter((w) => f(w) && status(w) === 'mastered').length;
        return `<div class="small" style="margin-top:10px">${name} <span class="muted">· จำได้ ${m.toLocaleString()} · เรียนแล้ว ${l.toLocaleString()} / ${n.toLocaleString()}</span></div>
          <div class="bar" style="margin-top:4px"><div class="l" style="width:${l / n * 100}%"></div><div class="m" style="width:${m / n * 100}%"></div></div>`;
      }).join('')}
      <div class="small muted" style="margin-top:10px">⭐ Lv.${levelOf(S.xp)} · 🏅 ${ACH.filter((x) => S.ach[x.id]).length}/${ACH.length} เหรียญ · 🟣 เรียนแล้ว 🟢 จำได้แล้ว</div>
    </button>`,
  };
  const blocks = homeBlocks().filter((b) => b.on).map((b) => ({ ...b, html: B[b.id]() })).filter((b) => b.html);
  // A half-width block with no partner in its row would leave a hole, so it stretches to the full row.
  let open = null;
  for (const b of blocks) {
    if (b.w === 'full') { if (open) open.w = 'full'; open = null; } else if (open) open = null; else open = b;
  }
  if (open) open.w = 'full';

  view.innerHTML = `
    ${needsBackup() ? `<div class="card-box backup-nag">
      <div><b>💾 ถึงเวลาสำรองข้อมูลแล้ว</b><div class="small muted">${lastBackup === null ? 'ยังไม่เคยสำรองเลย' : `สำรองล่าสุด ${lastBackup} วันก่อน`} · กันความคืบหน้าหายตอนลบแอปหรือเปลี่ยนเครื่อง</div></div>
      <div class="row" style="margin-top:10px"><button class="btn primary grow" id="bkNow">📤 สำรองเลย</button><button class="btn" id="bkLater">ไว้ทีหลัง</button></div>
    </div>` : ''}
    ${!S.placedAt && Object.keys(S.prog).length < 50 ? `<div class="card-box place-card slim" id="placeCard">
      <div><b>🎯 รู้ศัพท์อยู่แล้วบ้างไหม?</b><div class="small muted">วัดระดับ 3–5 นาที แล้วข้ามคำที่รู้แล้ว</div></div>
      <button class="btn primary" data-pl="go">วัดระดับ</button><button class="x" data-pl="no" aria-label="ไม่ต้อง">✕</button></div>` : ''}
    ${standalone || installHidden() ? '' : `<div class="card-box install-tip slim small" id="installTip">
      <div>📲 <b>ติดตั้งแอป:</b> แชร์ → <b>เพิ่มไปยังหน้าจอโฮม</b></div><button class="x" data-inst aria-label="ปิด">✕</button></div>`}
    <div class="home-grid">${blocks.map((b) => `<div class="hb hw-${b.w}" data-hb="${b.id}">${b.html}</div>`).join('')}</div>
    ${blocks.length ? '' : '<div class="card-box center small muted">ซ่อนทุกกล่องอยู่ — เปิดกล่องที่ต้องการได้ที่ ⚙️ ตั้งค่า → จัดหน้าแรก</div>'}
    <p class="center small muted">เวอร์ชัน ${APP_VERSION}</p>`;
  const click = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
  click('#startBtn', () => go('cards'));
  click('#qFeed', () => go('feed'));
  click('#statsBtn', () => go('stats', 'home'));
  click('#qPlay', quickPlay);
  const wd = $('#wotd');
  if (wd) wd.onclick = (e) => {
    const w = wotd();
    if (e.target.closest('[data-full]')) wotdFull(w);
    else if (e.target.closest('[data-rand]')) {
      const n = wotdRandom(w); if (n) wd.innerHTML = wotdInner(n);
    } else if (e.target.closest('[data-say]')) speak(w.w); else openSheet(w, renderHome);
  };
  const mc = $('#monthCard');
  if (mc) mc.onclick = (e) => { if (e.target.closest('[data-mo]')) { S.monthSeen = monthKey(); save(); mc.remove(); } };
  const wc = $('#weekCard');
  if (wc) wc.onclick = (e) => {
    const b = e.target.closest('[data-wk]'); if (!b) return;
    S.weekSeen = mondayKey(); save();
    if (b.dataset.wk === 'drill') drillWeek(1); else wc.remove();
  };
  if ($('#bkNow')) {
    $('#bkNow').onclick = async () => { await exportBackup(); renderHome(); };
    $('#bkLater').onclick = () => { S.backupSnooze = today(); save(); renderHome(); };
  }
  click('#questGo', () => { const q = todayQuest(); if (q.game) startGame(q.game); else go('cards'); });
  const pc = $('#placeCard');
  if (pc) pc.onclick = (e) => {
    const b = e.target.closest('[data-pl]'); if (!b) return;
    if (b.dataset.pl === 'go') go('placement'); else { S.placedAt = today(); save(); pc.remove(); }
  };
  const it = $('#installTip');
  if (it) it.onclick = (e) => { if (!e.target.closest('[data-inst]')) return; try { localStorage.setItem('o3k.installHide', '1'); } catch (err) { /* ignore */ } it.remove(); };
}
// Home layout: the blocks the user can show/hide, reorder and size (settings → จัดหน้าแรก). S.homeCfg stores the choice.
const HOME_BLOCKS = [
  { id: 'hero', ic: '🏠', name: 'การ์ดวันนี้ + ปุ่มเริ่มเรียน', w: 'full', on: true },
  { id: 'feed', ic: '📱', name: 'ปุ่มไถศัพท์', w: 'half', on: true },
  { id: 'play', ic: '⚡', name: 'ปุ่มเล่นด่วน', w: 'half', on: true },
  { id: 'month', ic: '📅', name: 'สรุปเดือน (7 วันแรกของเดือน)', w: 'full', on: true },
  { id: 'week', ic: '📊', name: 'สรุปสัปดาห์ (ทุกวันจันทร์)', w: 'full', on: true },
  { id: 'quest', ic: '🎯', name: 'ภารกิจวันนี้', w: 'full', on: true },
  { id: 'wotd', ic: '✨', name: 'คำประจำวัน', w: 'full', on: true },
  { id: 'prog', ic: '📈', name: 'ความคืบหน้า', w: 'full', on: true },
  { id: 'level', ic: '⭐', name: 'เลเวลและ XP', w: 'half', on: false },
  { id: 'forecast', ic: '🔮', name: 'ทบทวน 7 วันข้างหน้า', w: 'full', on: false },
];
// Saved layout merged with the defaults: unknown ids dropped, blocks added in later versions appended at the end.
function homeBlocks() {
  const saved = Array.isArray(S.homeCfg) ? S.homeCfg : [];
  const out = [];
  for (const c of saved) {
    const d = HOME_BLOCKS.find((b) => b.id === c.id);
    if (d && !out.some((o) => o.id === d.id)) out.push({ ...d, on: !!c.on, w: c.w === 'half' ? 'half' : 'full' });
  }
  for (const d of HOME_BLOCKS) if (!out.some((o) => o.id === d.id)) out.push({ ...d });
  return out;
}
// Word of the day: the same word all day (picked from the selected levels by date), tap for the full sheet.
// Word of the day settings (settings.wotd): lv = levels, st = learning status, tp = topics. Empty lv/tp = follow the main setup (settings.levels / settings.topic); empty st = any status; groups combine with AND, choices inside a group with OR.
const WOTD_ST = [['new', '🆕 ยังไม่เรียน'], ['learning', '📖 กำลังเรียน'], ['leech', '🐢 คำดื้อ'], ['mastered', '✅ จำได้แล้ว']];
function wordStatus(w) {
  const p = S.prog[w.w];
  if (!p) return 'new';
  if (isLeech(w)) return 'leech';
  return p.b >= MASTERED ? 'mastered' : 'learning';
}
function wotdCfg() {
  const c = S.settings.wotd || {};
  return { lv: c.lv || [], st: c.st || [], tp: c.tp || [] };
}
function wotdPool() {
  const c = wotdCfg();
  const base = c.lv.length ? W.filter((w) => c.lv.includes(w.g)) : pool();
  return base.filter((w) => (!c.st.length || c.st.includes(wordStatus(w))) && (c.tp.length ? c.tp.includes(w.tp) : inTopic(w)));
}
// The pick is stored for the day (and per setting) so it doesn't flip when you learn the word; 🎲 overwrites it.
function wotd() {
  const key = JSON.stringify(wotdCfg()) + '|' + S.settings.levels.join();
  const k = S.wotdPick;
  if (k && k.day === today() && k.key === key) { const w = W[k.w]; if (w) return w; }
  const p = wotdPool().length ? wotdPool() : pool();
  if (!p.length) return null;
  let h = 0; for (const c of today()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const w = p[h % p.length];
  S.wotdPick = { day: today(), key, w: w.idx };
  return w;
}
function wotdRandom(cur) {
  const p = (wotdPool().length ? wotdPool() : pool()).filter((x) => x !== cur); if (!p.length) return null;
  const n = p[Math.floor(Math.random() * p.length)];
  S.wotdPick = { day: today(), key: JSON.stringify(wotdCfg()) + '|' + S.settings.levels.join(), w: n.idx };
  save();
  return n;
}
function wotdCard() {
  const w = wotd(); if (!w) return '';
  return `<div class="card-box wotd" id="wotd" role="button" tabindex="0">${wotdInner(w)}</div>`;
}
function wotdInner(w) {
  return `<div class="row" style="justify-content:space-between"><b>✨ คำประจำวัน</b><span class="row small muted" style="gap:8px">${lvBadge(w.g)}<button class="say-ex" data-rand aria-label="สุ่มคำใหม่">🎲</button><button class="say-ex" data-full aria-label="ขยายเต็มหน้าจอ">⛶</button></span></div>
    <div class="wotd-word">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
    <div class="muted small">${esc(w.i)} · ${esc(w.p)}</div>
    <div class="th" style="margin:6px 0 8px">${esc(w.t)}</div>
    <div class="small">${hlExample(w)}</div><div class="small muted">${esc(w.et)}</div>`;
}
// Full-screen word of the day (shows everything the word sheet does): 🎲 keeps drawing random words (from the same pool) for casual browsing; ◀ goes back through the ones just seen.
// Full-screen auto-speak modes: [button, toast/label]; settings.wfAuto was a boolean in 1.38.0 (true → 1).
const WF_AUTO = [['🔇', 'ปิดเสียงอ่านอัตโนมัติ'], ['🔊 คำ', 'อ่านคำศัพท์อัตโนมัติ 🔊'], ['🔊 +ประโยค', 'อ่านคำศัพท์ + ประโยคตัวอย่างอัตโนมัติ 🔊💬']];
const wfAuto = () => +S.settings.wfAuto || 0;
function wotdFull(start) {
  const el = document.createElement('div');
  el.className = 'wf';
  document.body.appendChild(el);
  const hist = [start]; let at = 0;
  const paint = () => {
    const w = hist[at];
    const stLabel = { new: '🆕 ยังไม่เรียน', learning: '🟡 กำลังเรียน', mastered: '🟢 จำได้แล้ว' }[status(w)] + (isLeech(w) ? ' · 🐢 คำดื้อ' : '');
    el.innerHTML = `<div class="wf-top"><button class="btn ghost" data-x aria-label="ปิด">✕ ปิด</button><span class="small muted">${hist.length > 1 ? `ดูมาแล้ว ${hist.length} คำ` : '✨ คำประจำวัน'}</span></div>
      <div class="wf-body">
        <div class="row" style="justify-content:space-between">${lvBadge(w.g)}<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener" aria-label="ดูใน Oxford Learner's Dictionaries">📖 Oxford ↗</a><span class="st-pill ${status(w)}">${stLabel}</span></div>
        <div class="wf-word" lang="en">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
        <div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span>${w.tp ? ` · ${TOPIC_LABEL[w.tp]}` : ''}</div>
        <div class="th wf-th">${esc(w.t)}</div>
        ${noteBox(w)}${exampleBox(w)}<div class="colloc" id="colBox"></div><div class="colloc" id="famBox"></div>
        <div class="wf-acts"><button class="btn" data-star><span>${isStar(w) ? '★' : '⭐'}</span>${isStar(w) ? 'ติดดาวแล้ว' : 'ติดดาว'}</button><button class="btn" data-review><span>🔁</span>ทบทวนวันนี้</button><button class="btn" data-known><span>✓</span>รู้แล้ว</button></div>
      </div>
      <div class="wf-bar"><button class="btn" data-back ${at ? '' : 'disabled'} aria-label="คำก่อนหน้า">◀</button><button class="btn" data-auto aria-label="${WF_AUTO[wfAuto()][1]} (แตะเพื่อเปลี่ยน)">${WF_AUTO[wfAuto()][0]}</button><button class="btn primary grow" data-next>🎲 สุ่มคำใหม่</button></div>`;
    loadColloc().then((c) => {
      const box = el.querySelector('#colBox'), list = c[w.w];
      if (box && list && hist[at] === w) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🔗 คำที่มักใช้คู่กัน</b> (แตะเพื่อฟัง)</div>
        ${list.map(([en, th]) => `<button class="col-row" data-col="${esc(en)}"><b>${esc(en)}</b><span>${esc(th)}</span></button>`).join('')}`;
    });
    loadFamilies().then(() => {
      const box = el.querySelector('#famBox'), f = familyOf(w.w);
      if (box && f && hist[at] === w) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧬 ครอบครัวคำ</b> (แตะเพื่อฟัง)</div>${famRows(f, w.w.toLowerCase())}`;
    });
    el.querySelector('.wf-body').scrollTop = 0;
  };
  // Auto-speak (settings.wfAuto 0 off / 1 word / 2 word + example): read the word shown via ◀ / 🎲,
  // then its example; a newer word (token) stops the chain.
  let tok = 0;
  const autoSay = () => {
    const w = hist[at], t = ++tok, mode = wfAuto();
    if (!mode) return;
    const u = speak(w.w, { slow: false });
    if (u && mode === 2 && w.e) u.onend = () => { if (t === tok && document.body.contains(el)) setTimeout(() => { if (t === tok) speak(w.e, { slow: false }); }, 400); };
  };
  const show = () => { paint(); autoSay(); };
  const next = () => {
    if (at < hist.length - 1) { at++; return show(); }
    const p = (wotdPool().length ? wotdPool() : pool()).filter((x) => x !== hist[at]); if (!p.length) return;
    hist.push(p[Math.floor(Math.random() * p.length)]); at = hist.length - 1; show();
  };
  const close = () => { tok++; el.remove(); document.removeEventListener('keydown', key); renderHome(); };
  const key = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft' && at) { at--; show(); } };
  document.addEventListener('keydown', key);
  el.onclick = (e) => {
    const w = hist[at];
    if (e.target.closest('[data-x]')) close();
    else if (e.target.closest('[data-say]')) speak(w.w);
    else if (e.target.closest('[data-sayex]')) speak(w.e);
    else if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-back]')) { if (at) { at--; show(); } }
    else if (e.target.closest('[data-auto]')) {
      S.settings.wfAuto = (wfAuto() + 1) % 3; save(); paint();
      toast(WF_AUTO[wfAuto()][1]);
      if (wfAuto()) autoSay(); else { tok++; if (window.speechSynthesis) speechSynthesis.cancel(); }
    }
    else if (e.target.closest('[data-col]')) speak(e.target.closest('[data-col]').dataset.col);
    else if (e.target.closest('[data-note]')) editNote(w, paint);
    else if (e.target.closest('[data-star]')) { toggleStar(w); paint(); }
    else if (e.target.closest('[data-review]')) { markForReview(w); toast('เพิ่มเข้ารายการทบทวนแล้ว 🔁'); paint(); }
    else if (e.target.closest('[data-known]')) { markKnown(w); toast('ทำเครื่องหมายว่ารู้แล้ว 👍'); paint(); }
  };
  paint();
}
function levelCard() {
  const L = levelOf(S.xp), a = levelStart(L), b = levelStart(L + 1);
  return `<div class="card-box lvl-card"><div class="lvl-num">Lv.${L}</div>
    <div class="grow"><div class="row" style="justify-content:space-between"><b>คะแนนประสบการณ์</b><span class="small muted">${S.xp - a}/${b - a} XP</span></div>
    <div class="bar" style="margin-top:6px"><div class="l" style="width:${(S.xp - a) / (b - a) * 100}%"></div></div>
    <div class="small muted" style="margin-top:4px">ตอบถูกติดกันได้ XP เพิ่ม · อีก ${b - S.xp} XP ถึง Lv.${L + 1}</div></div></div>`;
}
function questCard() {
  if (S.quest.done && !S.settings.questShowDone) return '';
  const q = todayQuest(), target = questTarget(q), n = Math.min(S.quest.n, target);
  return `<div class="card-box quest">
    <div class="row" style="justify-content:space-between"><b>🎯 ภารกิจวันนี้</b><span class="small muted">${S.quest.done ? 'สำเร็จแล้ว ✅' : `${n}/${target}`}</span></div>
    <div style="margin:6px 0 10px">${q.text}</div>
    <div class="qbar"><div style="width:${S.quest.done ? 100 : n / target * 100}%"></div></div>
    ${S.quest.done ? '' : '<button class="btn block" id="questGo" style="margin-top:12px">ไปทำภารกิจ →</button>'}
  </div>`;
}
// Cards coming due in each of the next 7 days (selected levels), so the daily load is predictable.
function forecastChart() {
  const names = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, k) => ({ n: 0, label: k === 0 ? 'วันนี้' : k === 1 ? 'พรุ่งนี้' : names[(start.getDay() + k) % 7] }));
  for (const w of pool()) {
    const pr = S.prog[w.w]; if (!pr) continue;
    const k = Math.max(0, Math.floor((pr.d - start.getTime()) / DAY));
    if (k < 7) days[k].n++;
  }
  const max = Math.max(10, ...days.map((d) => d.n));
  const total = days.reduce((a, d) => a + d.n, 0);
  if (!total) return `<div class="empty-box"><div class="em">🌱</div><div>ยังไม่มีการ์ดที่ต้องทบทวน<div class="small muted">เรียนคำแรกแล้วตารางนี้จะเริ่มขึ้นเอง</div></div><button class="btn primary" data-go="cards">▶︎ เริ่มเรียน</button></div>`;
  const tip = total / 7 > 80 ? '<div class="small" style="margin-top:8px">⚠️ งานทบทวนเยอะแล้ว ลองลดจำนวนคำใหม่ต่อวันในตั้งค่า</div>' : '';
  return `<div class="week">${days.map((d) => `<div class="wk"><div class="wk-n">${d.n || ''}</div><div class="wk-bar fc-bar"><div style="height:${d.n / max * 100}%"></div></div><div class="wk-l">${d.label}</div></div>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">รวม ${total} ใบ · ยังไม่รวมคำใหม่วันละ ${S.settings.newPerDay} คำ</div>${tip}`;
}
function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'อรุณสวัสดิ์ ☀️' : h < 17 ? 'สวัสดีตอนบ่าย 🌤️' : 'สวัสดีตอนเย็น 🌙';
  const s = streakNow();
  return s ? `${g} เรียนต่อเนื่อง ${s} วันแล้ว เก่งมาก!` : `${g} มาเริ่มกันเลย!`;
}
