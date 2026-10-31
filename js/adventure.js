'use strict';
// Weekly adventure (1.114): every Monday a themed trail starts (the theme rotates through the goal tags: travel, work, shopping …).
// 7 stops, one for each day (the earlier ones can be caught up); a stop is a 5-question round on the theme's words. A pass earns a stamp,
// 5 stamps = adventure complete (XP, 🧊, mascot items after the 1st and 5th), all 7 = bonus. Single player, device-local data that syncs with the rest.
// cleanAdv() / mergeAdv() live in app.js (storage and backup code runs before this file loads).
// State: S.adv = { 'YYYY-MM-DD' (Monday): { t: tag id, s: '0101100' (stamp per stop), done, perfect } }. Classic script sharing globals with app.js.

/* ---------- data ---------- */
const ADV_STOPS = [['🚪', 'ประตูเมือง'], ['🛒', 'ตลาดริมทาง'], ['🌉', 'สะพานข้ามแม่น้ำ'], ['🌲', 'ป่าลึก'], ['⛰️', 'ยอดเขา'], ['🏞️', 'ทะเลสาบ'], ['🏰', 'ปราสาทปลายทาง']];
const ADV_NEED = 5, ADV_N = 5, ADV_PASS = [3, 3, 3, 3, 3, 3, 4]; // stamps for a completed adventure; questions per stop; right answers to pass each stop
const ADV_XP = 8, ADV_DONE_XP = 60, ADV_PERFECT_XP = 40;
const advMonday = () => mondayKey(0);
// Theme of a week: the goal tags in turn (same on every device, from the week number).
function advTheme(mon) {
  const wk = Math.floor(Date.parse(mon + 'T12:00:00') / (7 * DAY));
  return TAGS[((wk % TAGS.length) + TAGS.length) % TAGS.length];
}
const advStops = (mon) => ((S.adv[mon] && S.adv[mon].s) || '0000000').padEnd(7, '0').slice(0, 7);
const advStamps = (mon) => advStops(mon).split('').filter((c) => c === '1').length;
function advToday(mon = advMonday()) { return Math.max(0, Math.min(6, dayDiff(today(), mon))); } // stop number of today (0 = Monday); a function so tests can override it
const advDoneCount = () => Object.values(S.adv).filter((a) => a && a.done).length;
// Words of the theme that suit the learner: not above the highest level they study (unless that leaves too few).
function advPool(tag) {
  const all = W.filter((w) => hasTag(w, tag.id));
  const lim = Math.max(0, ...S.settings.levels.map((l) => LEVELS.indexOf(l)));
  const easy = all.filter((w) => LEVELS.indexOf(w.g) <= lim);
  return easy.length >= 12 ? easy : all;
}
// 5 words for a stop: words that are not mastered yet come first, so the trail teaches rather than repeats.
function advPick(tag) {
  const pool = shuffle(advPool(tag)), notDone = pool.filter((w) => status(w) !== 'mastered');
  return notDone.concat(pool.filter((w) => !notDone.includes(w))).slice(0, ADV_N);
}
/* ---------- home card ---------- */
function adventureCard() {
  const mon = advMonday(), tag = advTheme(mon), s = advStops(mon), k = advToday(mon), got = advStamps(mon), done = S.adv[mon] && S.adv[mon].done;
  return `<button class="card-box guide-link adv-card" data-go="adv"><span>🗺️</span><div class="grow"><b>ผจญภัยประจำสัปดาห์ · ${tag.icon} ${esc(tag.th)}</b>
    <div class="adv-dots" aria-hidden="true">${ADV_STOPS.map((st, i) => `<i class="${s[i] === '1' ? 'on' : i === k ? 'now' : ''}">${s[i] === '1' ? '✓' : ''}</i>`).join('')}</div>
    <div class="small muted">${done ? `ครบแล้ว ✅ (${got}/7 ตรา)` : s[k] === '1' ? `วันนี้ผ่านแล้ว ✅ · ${got}/${ADV_NEED} ตราที่ต้องมี` : `ด่านวันนี้: ${ADV_STOPS[k][0]} ${ADV_STOPS[k][1]} · ${got}/${ADV_NEED} ตรา`}</div></div><span class="muted">›</span></button>`;
}

/* ---------- passport page ---------- */
function renderAdventure() {
  const mon = advMonday(), tag = advTheme(mon), s = advStops(mon), k = advToday(mon), got = advStamps(mon), rec = S.adv[mon] || {};
  const past = Object.keys(S.adv).filter((m) => m < mon).sort().reverse().slice(0, 12);
  const stop = (i) => {
    const [ic, name] = ADV_STOPS[i], stamped = s[i] === '1', open = i <= k;
    return `<button class="adv-stop${stamped ? ' got' : ''}${i === k ? ' now' : ''}" data-stop="${i}" ${open ? '' : 'disabled'} aria-label="ด่าน ${i + 1} ${name} ${stamped ? 'ผ่านแล้ว' : open ? 'ยังไม่ผ่าน' : 'ยังไม่เปิด'}">
      <span class="adv-ic" aria-hidden="true">${open ? ic : '🔒'}</span><span class="adv-tx"><b>ด่าน ${i + 1} · ${name}</b>
      <small>${stamped ? '✅ ได้ตราแล้ว · แตะเพื่อฝึกซ้ำ' : i === k ? 'ด่านของวันนี้ · ตอบถูก ' + ADV_PASS[i] + '/' + ADV_N + ' ข้อ' : open ? 'ย้อนมาทำให้ทัน · ตอบถูก ' + ADV_PASS[i] + '/' + ADV_N + ' ข้อ' : 'เปิดวัน' + THDAY[i]}</small></span>
      <span class="adv-stamp" aria-hidden="true">${stamped ? '🟣' : ''}</span></button>`;
  };
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="advBack">‹ กลับ</button></div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${tag.icon}</div>
      <div class="h2" style="margin:2px 0">ผจญภัยสัปดาห์ ${esc(tag.th)}</div>
      <p class="small muted" style="margin:4px 0 8px">${esc(tag.note)}</p>
      <div class="qbar" role="img" aria-label="ตราประทับ ${got} จาก ${ADV_NEED}"><span style="width:${Math.min(100, got / ADV_NEED * 100)}%"></span></div>
      <p class="small" style="margin:8px 0 0">${rec.done ? '🎉 ผจญภัยสำเร็จแล้ว!' : `ตราประทับ ${got}/${ADV_NEED} · ครบแล้วรับ +${ADV_DONE_XP} XP และ 🧊`}${rec.perfect ? ' · 💯 ครบทั้ง 7 ด่าน' : ''}</p></div>
    <div class="adv-trail">${ADV_STOPS.map((_, i) => stop(i)).join('')}</div>
    <p class="small muted" style="margin:10px 4px">ทุกด่านเป็นควิซ ${ADV_N} ข้อจากคำของเป้าหมายนี้ (คำที่ยังไม่จำได้มาก่อน เลือกจากระดับที่เรียนอยู่) · ผ่านด่านได้ +${ADV_XP} XP · ครบทั้ง 7 ด่านโบนัส +${ADV_PERFECT_XP} XP · ด่านย้อนหลังทำได้ตลอดสัปดาห์ · ผจญภัยสำเร็จครั้งแรกได้ 🤠 หมวกนักสำรวจ และครบ 5 สัปดาห์ได้ 🧭 เข็มทิศ สำหรับน้องคำ</p>
    <div class="h2">📒 สมุดพาสปอร์ต <span class="small muted">สำเร็จแล้ว ${advDoneCount()} สัปดาห์</span></div>
    <div class="card-box">${past.length ? past.map((m) => { const t = TAGS.find((x) => x.id === S.adv[m].t) || advTheme(m), n = S.adv[m].s.split('').filter((c) => c === '1').length;
      return `<div class="wrow adv-past"><span aria-hidden="true">${t.icon}</span><div class="grow"><b>${esc(t.th)}</b> <span class="small muted">สัปดาห์ ${esc(thDate(Date.parse(m + 'T12:00:00')))}</span></div><span class="small">${S.adv[m].done ? '✅' : '⚪'} ${n}/7</span></div>`; }).join('')
      : emptyArt({ kind: 'empty', title: 'ยังไม่มีเส้นทางที่ผ่านมา', sub: 'จบสัปดาห์นี้แล้วจะมาเก็บไว้ที่นี่', sm: true })}</div>`;
  $('#advBack').onclick = () => go('home');
  view.querySelectorAll('[data-stop]').forEach((b) => { b.onclick = () => runAdvStop(mon, +b.dataset.stop); });
}
const THDAY = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

/* ---------- one stop ---------- */
function runAdvStop(mon, k) {
  const tag = advTheme(mon), items = advPick(tag), pool = advPool(tag), [ic, name] = ADV_STOPS[k];
  if (items.length < ADV_N) return renderAdventure();
  let i = 0, right = 0;
  const q = () => {
    if (i >= items.length) return finish();
    const w = items[i], toTh = i % 2 === 0; // alternate: English → Thai meaning, Thai → English word
    const wrong = shuffle(pool.filter((x) => x !== w && (toTh ? x.t !== w.t : x.w !== w.w))).slice(0, 3);
    const opts = shuffle([w, ...wrong]);
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="advQuit" aria-label="ออก">✕</button><div class="progress"><div style="width:${i / items.length * 100}%"></div></div><span class="small muted">${i + 1}/${items.length}</span></div>
      <div class="card-box q-prompt pop"><div class="small muted">${ic} ${esc(name)} · ${tag.icon} ${esc(tag.th)}</div>${toTh ? `<div class="word" lang="en">${esc(w.w)}</div><div class="pos">${esc(w.p)}</div>` : `<div class="th">${esc(w.t)}</div><div class="pos">${esc(w.p)}</div>`}</div>
      <div class="options">${opts.map((o, n) => `<button class="opt" data-k="${n}"${toTh ? '' : ' lang="en"'}>${esc(toTh ? o.t : o.w)}</button>`).join('')}</div>
      <div class="reveal" id="reveal" aria-live="polite"></div>`;
    $('#advQuit').onclick = () => renderAdventure();
    if (toTh) speak(w.w);
    let answered = false;
    view.querySelector('.options').onclick = (ev) => {
      const b = ev.target.closest('.opt'); if (!b || answered) return; answered = true;
      const ok = opts[+b.dataset.k] === w;
      view.querySelectorAll('.opt').forEach((o) => { if (opts[+o.dataset.k] === w) o.classList.add('correct'); });
      if (ok) right++; else b.classList.add('wrong');
      gameResult(w, ok); sfx(ok ? 'ok' : 'bad');
      if (!ok) $('#reveal').innerHTML = `❌ ที่ถูกคือ <b lang="en">${esc(w.w)}</b> = ${esc(w.t)}`;
      setTimeout(() => { i++; q(); }, ok ? 600 : 1400);
    };
  };
  const finish = () => {
    const pass = right >= ADV_PASS[k], rec = S.adv[mon] || (S.adv[mon] = { t: tag.id, s: '0000000', done: false, perfect: false });
    const first = pass && advStops(mon)[k] !== '1';
    let msg = '', big = false;
    if (first) {
      rec.s = rec.s.slice(0, k) + '1' + rec.s.slice(k + 1); addXP(ADV_XP); msg = `🟣 ได้ตราประทับด่าน ${k + 1} แล้ว (+${ADV_XP} XP)`;
      if (!rec.done && advStamps(mon) >= ADV_NEED) {
        rec.done = big = true; addXP(ADV_DONE_XP); if (S.freeze < MAX_FREEZE) S.freeze++;
        const n = advDoneCount();
        S.owned = S.owned || [];
        if (n >= 1 && !S.owned.includes('acc:explorer')) S.owned.push('acc:explorer');
        if (n >= 5 && !S.owned.includes('acc:compass')) S.owned.push('acc:compass');
        msg += `<br>🎉 ผจญภัยสัปดาห์นี้สำเร็จ! +${ADV_DONE_XP} XP และ 🧊${n === 1 ? ' · ได้ 🤠 หมวกนักสำรวจสำหรับน้องคำ' : n === 5 ? ' · ได้ 🧭 เข็มทิศสำหรับน้องคำ' : ''}`;
      }
      if (!rec.perfect && advStamps(mon) === 7) { rec.perfect = big = true; addXP(ADV_PERFECT_XP); msg += `<br>💯 ครบทั้ง 7 ด่าน โบนัส +${ADV_PERFECT_XP} XP`; }
      S.adv = cleanAdv(S.adv);
    }
    save();
    if (big) confetti('burst'); else if (pass) confetti();
    const dance = pass && typeof mascotSvg === 'function';
    const nextK = [0, 1, 2, 3, 4, 5, 6].find((x) => x > k && x <= advToday(mon) && advStops(mon)[x] !== '1');
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${dance ? `<div class="dance">${mascotSvg({ mood: 'happy', size: 96 })}</div>` : '💪'}</div>
      <div class="h2" style="margin:4px 0">${right}/${ADV_N}</div>
      <p class="small">${pass ? msg || 'ผ่านด่านนี้แล้ว (ฝึกซ้ำ)' : `ต้องตอบถูกอย่างน้อย ${ADV_PASS[k]} ข้อถึงจะได้ตรา ลองใหม่นะ`}</p>
      ${nextK != null && pass ? `<button class="btn primary block" id="advNext">ด่านถัดไป ${ADV_STOPS[nextK][0]} →</button>` : `<button class="btn primary block" id="advAgain">${pass ? 'ฝึกซ้ำด่านนี้' : 'ลองใหม่'}</button>`}
      <button class="btn ghost block" id="advPass" style="margin-top:8px">🗺️ กลับไปที่เส้นทาง</button></div>`;
    if (nextK != null && pass) $('#advNext').onclick = () => runAdvStop(mon, nextK); else $('#advAgain').onclick = () => runAdvStop(mon, k);
    $('#advPass').onclick = () => renderAdventure();
  };
  q();
}
