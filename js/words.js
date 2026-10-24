'use strict';
// Word list, memory notes and the word detail sheet.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- word list ---------- */
let listFilter = { q: '', lv: 'all', st: 'all', tp: '', gl: '' };
function renderList() {
  view.innerHTML = `
    <div class="list-head">${libSwitch('list')}<input class="search" id="q" type="search" placeholder="🔍 ค้นหาคำอังกฤษหรือคำแปลไทย" value="${esc(listFilter.q)}" autocapitalize="none" autocorrect="off"></div>
    <div class="chips scroll" id="lv" style="margin-bottom:8px">
      ${['all', ...LEVELS].map((l) => `<button class="chip" data-v="${l}">${l === 'all' ? 'ทุกระดับ' : LV_LABEL[l]}</button>`).join('')}
    </div>
    <div class="chips scroll" id="st" style="margin-bottom:8px">
      ${[['all', 'ทั้งหมด'], ['new', 'ยังไม่เรียน'], ['learning', '🟡 กำลังเรียน'], ['mastered', '🟢 จำได้แล้ว'], ['star', '⭐ ติดดาว'], ['leech', '🐢 คำดื้อ'], ['note', '💡 มีวิธีจำ']].map(([v, t]) => `<button class="chip" data-v="${v}">${t}</button>`).join('')}
    </div>
    <div class="sel-pair">
      <select class="sel block-sel" id="tpSel" aria-label="หมวด"><option value="">📂 ทุกหมวด</option>${topicOptions(listFilter.tp)}</select>
      <select class="sel block-sel" id="glSel" aria-label="เป้าหมาย"><option value="">🎯 ทุกเป้าหมาย</option>${TAGS.map((t) => `<option value="${t.id}" ${listFilter.gl === t.id ? 'selected' : ''}>${TAG_LABEL[t.id]}</option>`).join('')}</select>
    </div>
    <div class="small muted" id="cnt" style="margin:6px 4px"></div>
    <div class="card-box" style="padding:4px 14px" id="rows"></div>
    <div id="sentinel" style="height:1px"></div>`;
  const paint = () => {
    view.querySelectorAll('#lv .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === listFilter.lv));
    view.querySelectorAll('#st .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === listFilter.st));
  };
  let items = [], shown = 0;
  const rows = $('#rows');
  const more = () => {
    const chunk = items.slice(shown, shown + 80);
    rows.insertAdjacentHTML('beforeend', chunk.map((w) => `<div class="wrow" data-i="${w.idx}">
      <span class="dot ${status(w)}"></span>
      <div class="grow"><div><span class="w">${esc(w.w)}</span> <span class="pos">${esc(w.p)}</span></div><div class="t">${esc(w.t)}</div></div>
      <span class="star-mark">${isLeech(w) ? '🐢' : ''}${isStar(w) ? '⭐' : ''}</span>${lvBadge(w.g)}</div>`).join(''));
    shown += chunk.length;
  };
  const apply = () => {
    const q = listFilter.q.trim().toLowerCase();
    items = W.filter((w) => (listFilter.lv === 'all' || w.g === listFilter.lv) && (!listFilter.tp || topicMatch(listFilter.tp, w.tp)) && (!listFilter.gl || hasTag(w, listFilter.gl))
      && (listFilter.st === 'all' || (listFilter.st === 'star' ? isStar(w) : listFilter.st === 'leech' ? isLeech(w) : listFilter.st === 'note' ? !!S.note[w.w] : status(w) === listFilter.st))
      && (!q || w.w.toLowerCase().includes(q) || w.t.includes(q)));
    if (q) items.sort((a, b) => (b.w.toLowerCase().startsWith(q)) - (a.w.toLowerCase().startsWith(q)));
    rows.innerHTML = ''; shown = 0; more();
    if (!items.length) rows.innerHTML = '<p class="center muted">ไม่พบคำศัพท์</p>';
    $('#cnt').textContent = `${items.length} คำ · แตะคำเพื่อดูตัวอย่างประโยค`;
    paint();
  };
  $('#q').oninput = (e) => { listFilter.q = e.target.value; apply(); };
  $('#tpSel').onchange = (e) => { listFilter.tp = e.target.value; apply(); };
  $('#glSel').onchange = (e) => { listFilter.gl = e.target.value; apply(); };
  $('#lv').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.lv = c.dataset.v; apply(); } };
  $('#st').onclick = (e) => { const c = e.target.closest('.chip'); if (c) { listFilter.st = c.dataset.v; apply(); } };
  rows.onclick = (e) => {
    const r = e.target.closest('.wrow'); if (!r) return;
    const w = W[+r.dataset.i];
    speak(w.w);
    openSheet(w, () => { r.querySelector('.dot').className = 'dot ' + status(w); r.querySelector('.star-mark').textContent = (isLeech(w) ? '🐢' : '') + (isStar(w) ? '⭐' : ''); });
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < items.length) more(); }, { root: view, rootMargin: '400px' });
  io.observe($('#sentinel'));
  cleanup = () => io.disconnect();
  apply();
}

/* ---------- memory notes ---------- */
// Card/sheet snippet: the user's own memory hook, or a prompt to write one for leeches.
function noteBox(w) {
  if (S.note[w.w]) return `<button class="note-box" data-note>💡 <b>วิธีจำของฉัน:</b> ${esc(S.note[w.w])} <span class="muted">✏️</span></button>`;
  return isLeech(w) ? '<button class="note-box empty" data-note>🐢 คำนี้ลืมบ่อย แตะเพื่อเขียนวิธีจำของตัวเอง</button>'
    : '<button class="note-add" data-note>✏️ เขียนวิธีจำ</button>';
}
// Read-only memory hook shown in game feedback (1.64); '' for words without one and for skill-game items (idx < 0).
const hookBox = (w) => (w.idx >= 0 && S.note[w.w] ? `<div class="note-box hook">💡 <b>วิธีจำของฉัน:</b> ${esc(S.note[w.w])}</div>` : '');
function editNote(w, onDone) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="วิธีจำ ${esc(w.w)}">
      <div class="grab"></div>
      <div class="h2" style="margin:8px 0 4px">💡 วิธีจำ "${esc(w.w)}"</div>
      <div class="muted small">${esc(w.t)}</div>
      <textarea class="note-in" id="noteIn" maxlength="200" placeholder="เช่น เสียงคล้ายคำไทย, แต่งประโยคตลกๆ, นึกภาพ…">${esc(S.note[w.w] || '')}</textarea>
      <div class="small muted">ตัวอย่าง: abandon = "อะ-แบน-ดอน" ทิ้งรถไว้จนยางแบน 🚗</div>
      <div class="row" style="margin-top:12px">${S.note[w.w] ? '<button class="btn grow" data-act="del">ลบ</button>' : ''}<button class="btn primary grow" data-act="save">บันทึก</button></div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); if (onDone) onDone(); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    const act = e.target.closest('[data-act]'); if (!act) return;
    const v = $('#noteIn', el).value.trim();
    if (act.dataset.act === 'del' || !v) delete S.note[w.w]; else S.note[w.w] = v;
    save(); toast(S.note[w.w] ? 'บันทึกวิธีจำแล้ว 💡' : 'ลบวิธีจำแล้ว'); close();
  };
}

/* ---------- word detail sheet ---------- */
// opt.deck = id of a word set: show that set's progress and hide the buttons that change the main progress.
function openSheet(w, onChange, opt = {}) {
  const dm = opt.deck ? S.dprog[opt.deck] || {} : null;
  const st = dm ? DECK_DOT[deckStatus(dm[w.w])] : status(w);
  const stLabel = { new: 'ยังไม่เรียน', learning: '🟡 กำลังเรียน', mastered: dm ? '🟢 แม่นแล้ว' : '🟢 จำได้แล้ว' }[st] + ((dm ? leechIn(w, dm) : isLeech(w)) ? ' · 🐢 คำดื้อ' : '');
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet wsheet${tintStyle(w) ? ' tint' : ''}" role="dialog" aria-label="${esc(w.w)}"${tintStyle(w)}>
      <div class="grab"></div>
      <div class="sheet-body">
      <div class="row" style="justify-content:space-between">${lvBadge(w.g)}<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener" aria-label="ดูใน Oxford Learner's Dictionaries">📖 Oxford ↗</a><span class="st-pill ${st}">${stLabel}</span></div>
      <div class="sheet-word" lang="en">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button></div>
      <div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span>${w.tp ? ` · ${TOPIC_LABEL[w.tp]}` : ''}</div>
      ${tagsOf(w).length ? `<div class="small muted sheet-tags">${tagsOf(w).map((id) => `<span class="tag-pill">${TAG_LABEL[id]}</span>`).join('')}</div>` : ''}
      <div class="th" style="font-size:22px;margin:10px 0">${esc(w.t)}</div>
      ${noteBox(w)}${exampleBox(w)}<div class="colloc" id="colBox"></div><div class="colloc" id="famBox"></div><div class="colloc" id="pvBox"></div><div class="colloc" id="idBox"></div><div class="colloc" id="synBox"></div><div class="colloc" id="afBox"></div>
      </div>
      <div class="sheet-acts">
        <button class="btn" data-act="star">${isStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาว'}</button>
        ${dm ? '' : '<button class="btn" data-act="review" aria-label="ทบทวนวันนี้">🔁 ทบทวน</button><button class="btn" data-act="known">✓ รู้แล้ว</button>'}
      </div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  loadColloc().then((c) => {
    const box = el.querySelector('#colBox'), list = c[w.w];
    if (box && list) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🔗 คำที่มักใช้คู่กัน</b> (แตะเพื่อฟัง)</div>
      ${list.map(([en, th]) => `<button class="col-row" data-col="${esc(en)}"><b>${esc(en)}</b><span>${esc(th)}</span></button>`).join('')}`;
  });
  loadFamilies().then(() => {
    const box = el.querySelector('#famBox'), f = familyOf(w.w);
    if (box && f) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧬 ครอบครัวคำ</b> (แตะเพื่อฟัง)</div>${famRows(f, w.w.toLowerCase())}`;
  });
  lexisBoxes(el, w);
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    const col = e.target.closest('[data-col]'); if (col) return speak(col.dataset.col);
    if (e.target.closest('[data-say]')) return speak(w.w);
    if (e.target.closest('[data-sayex]')) return speak(e.target.closest('[data-sayex]').dataset.sayex || w.e);
    if (e.target.closest('[data-note]')) { close(); return editNote(w, onChange); }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'star') {
      act.textContent = toggleStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาว';
      if (onChange) onChange();
      return;
    }
    if (act.dataset.act === 'known') { markKnown(w); toast('ทำเครื่องหมายว่ารู้แล้ว 👍'); }
    else { markForReview(w); toast('เพิ่มเข้ารายการทบทวนแล้ว 🔁'); }
    if (onChange) onChange();
    close();
  };
}

// Weekly summary. Weeks run Monday–Sunday; `off` = 0 for this week, 1 for last week, …
function mondayKey(off = 0) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - off * 7);
  return d.toLocaleDateString('en-CA');
}
function weekStats(off) {
  const mon = mondayKey(off), days = [];
  for (let k = 0; k < 7; k++) { const d = new Date(Date.parse(mon + 'T12:00:00') + k * DAY).toLocaleDateString('en-CA'); if (d <= today()) days.push(d); }
  const end = days[days.length - 1];
  const snapAt = (key) => { const ks = Object.keys(S.snap).filter((k) => k <= key).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const before = new Date(Date.parse(mon + 'T12:00:00') - DAY).toLocaleDateString('en-CA');
  const a = snapAt(before) || (Object.keys(S.snap).sort()[0] >= mon ? [0, 0, 0, 0] : null), b = snapAt(end);
  const missed = {};
  days.forEach((d) => Object.entries(S.miss[d] || {}).forEach(([w, n]) => (missed[w] = (missed[w] || 0) + n)));
  const top = Object.entries(missed).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([w, n]) => ({ w: W.find((x) => x.w === w), n })).filter((x) => x.w);
  return {
    mon, days: days.length,
    active: days.filter((d) => S.hist[d]).length,
    total: days.reduce((t, d) => t + (S.hist[d] || 0), 0),
    learned: a && b ? b[2] - a[2] : null, mastered: a && b ? b[3] - a[3] : null,
    top,
  };
}
function weekBox(off, withActions) {
  const w = weekStats(off), prev = weekStats(off + 1);
  const diff = prev.total ? Math.round((w.total - prev.total) / prev.total * 100) : null;
  const range = `${thDate(Date.parse(w.mon + 'T12:00:00'))} – ${off ? thDate(Date.parse(w.mon + 'T12:00:00') + 6 * DAY) : 'วันนี้'}`;
  return `<div class="small muted">${range}</div>
    <div class="tiles" style="margin:10px 0 6px">
      <div class="tile-s"><b>${w.active}<small>/${w.days}</small></b><span>วันที่เล่น</span></div>
      <div class="tile-s"><b>${w.total}</b><span>การ์ด+ข้อเกม</span></div>
      <div class="tile-s"><b>${w.learned == null ? '–' : '+' + w.learned}</b><span>คำใหม่</span></div>
      <div class="tile-s"><b>${w.mastered == null ? '–' : (w.mastered >= 0 ? '+' : '') + w.mastered}</b><span>จำได้เพิ่ม</span></div>
    </div>
    ${diff == null ? '' : `<div class="small">${diff >= 0 ? '📈' : '📉'} ทำ${diff >= 0 ? 'มากกว่า' : 'น้อยกว่า'}สัปดาห์ก่อน ${Math.abs(diff)}%</div>`}
    ${w.top.length ? `<div class="small" style="margin-top:8px"><b>คำที่ผิดบ่อย:</b> ${w.top.map((x) => `${esc(x.w.w)} <span class="muted">(${x.n})</span>`).join(', ')}</div>` : ''}
    ${withActions ? `<div class="row" style="margin-top:12px">${w.top.length >= 4 ? `<button class="btn primary grow" data-wk="drill" data-off="${off}">🎯 ฝึกคำที่ผิดบ่อย</button>` : ''}<button class="btn grow" data-wk="close">ปิด</button></div>` : ''}`;
}
// Monthly summary: same idea as the weekly one, per calendar month ('YYYY-MM').
const monthKey = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - off); return d.toLocaleDateString('en-CA').slice(0, 7); };
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const monthName = (key) => `${TH_MONTH[+key.slice(5) - 1]} ${+key.slice(0, 4) + 543}`;
function monthStats(off) {
  const key = monthKey(off), days = [];
  for (let d = new Date(key + '-01T12:00:00'); d.toLocaleDateString('en-CA').startsWith(key); d = new Date(d.getTime() + DAY)) {
    const k = d.toLocaleDateString('en-CA'); if (k <= today()) days.push(k);
  }
  const snapAt = (k) => { const ks = Object.keys(S.snap).filter((x) => x <= k).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const first = key + '-01', before = new Date(Date.parse(first + 'T12:00:00') - DAY).toLocaleDateString('en-CA');
  const a = snapAt(before) || (Object.keys(S.snap).sort()[0] >= first ? [0, 0, 0, 0] : null), b = days.length ? snapAt(days[days.length - 1]) : null;
  const best = days.reduce((m, d) => ((S.hist[d] || 0) > m.n ? { d, n: S.hist[d] } : m), { d: '', n: 0 });
  let streak = 0, run = 0;
  days.forEach((d) => { run = S.hist[d] ? run + 1 : 0; streak = Math.max(streak, run); });
  return {
    key, days: days.length,
    active: days.filter((d) => S.hist[d]).length,
    total: days.reduce((t, d) => t + (S.hist[d] || 0), 0),
    learned: a && b ? b[2] - a[2] : null, mastered: a && b ? b[3] - a[3] : null,
    stories: Object.values(S.read).filter((d) => String(d).startsWith(key)).length,
    best, streak,
  };
}
function monthBox(off, withClose) {
  const m = monthStats(off), prev = monthStats(off + 1);
  const diff = prev.total ? Math.round((m.total - prev.total) / prev.total * 100) : null;
  const vs = (x, y) => (x == null || y == null || !prev.total ? '' : `<em class="${x >= y ? 'up' : 'down'}">${x >= y ? '▲' : '▼'} ${Math.abs(x - y)}</em>`);
  return `<div class="small muted">${monthName(m.key)}${off ? '' : ' (ถึงวันนี้)'}</div>
    <div class="tiles mo-tiles" style="margin:10px 0 6px">
      <div class="tile-s"><b>${m.active}<small>/${m.days}</small></b><span>วันที่เล่น ${vs(m.active, prev.active)}</span></div>
      <div class="tile-s"><b>${m.total}</b><span>การ์ด+ข้อเกม</span></div>
      <div class="tile-s"><b>${m.learned == null ? '–' : '+' + m.learned}</b><span>คำใหม่ ${vs(m.learned, prev.learned)}</span></div>
      <div class="tile-s"><b>${m.mastered == null ? '–' : (m.mastered >= 0 ? '+' : '') + m.mastered}</b><span>จำได้เพิ่ม ${vs(m.mastered, prev.mastered)}</span></div>
      <div class="tile-s"><b>${m.stories}</b><span>เรื่องสั้นที่อ่าน</span></div>
      <div class="tile-s"><b>${m.streak}</b><span>ติดต่อกันนานสุด (วัน)</span></div>
    </div>
    ${m.best.n ? `<div class="small">🏅 วันที่ขยันที่สุด: ${thDate(Date.parse(m.best.d + 'T12:00:00'))} (${m.best.n} ข้อ)</div>` : ''}
    ${diff == null ? '' : `<div class="small">${diff >= 0 ? '📈' : '📉'} ทำ${diff >= 0 ? 'มากกว่า' : 'น้อยกว่า'}เดือนก่อน ${Math.abs(diff)}%</div>`}
    ${withClose ? '<button class="btn block" data-mo="close" style="margin-top:12px">ปิด</button>' : ''}`;
}
function drillWeek(off) {
  customWords = weekStats(off).top.map((x) => x.w);
  gameSource = 'custom';
  startGame(pick(['en2th', 'th2en', 'listen']));
}
