'use strict';
// My word sets ("ชุดของฉัน", route `decks`): create, edit, copy and delete sets of words picked from the built-in list.
// A set is { id, name, icon, words: [list words], at, used, del } in S.decks (cleaned/merged in app.js: cleanDecks, mergeDecks).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- helpers ---------- */
const DECK_ICONS = ['📚', '✈️', '💼', '🎓', '🏠', '🍜', '🏥', '💻', '🗣️', '🎯', '🧳', '⭐'];
const DECK_PASTE_MAX = 500; // lines read from one paste
const newDeckId = () => {
  let id;
  do { id = Math.random().toString(36).slice(2, 12); } while (!id || S.decks.some((d) => d.id === id));
  return id;
};
const liveDecks = () => S.decks.filter((d) => !d.del).sort((a, b) => (b.used || b.at) - (a.used || a.at));
const deckById = (id) => S.decks.find((d) => d.id === id && !d.del);
// Stamp an edit (the newer `at` wins when devices sync) and save.
function touchDeck(d) { d.at = Date.now(); d.used = d.at; save(); }
// The list entries of a set (words no longer in the list are kept in the data but skipped here).
function deckWords(d) {
  if (!DECK_BY.size) W.forEach((w) => { const k = w.w.toLowerCase(); if (!DECK_BY.has(k)) DECK_BY.set(k, w); });
  return d.words.map((x) => DECK_BY.get(x.toLowerCase())).filter(Boolean);
}
const DECK_BY = new Map();
// Default name = this week (Monday–Sunday), e.g. "ศัพท์สัปดาห์ 20–26 ต.ค."
function weekDeckName() {
  const mon = new Date(mondayKey() + 'T12:00:00'), sun = new Date(mon.getTime() + 6 * DAY);
  const m = (d) => d.toLocaleDateString('th-TH', { month: 'short' });
  return `ศัพท์สัปดาห์ ${mon.getDate()}${m(mon) === m(sun) ? '' : ' ' + m(mon)}–${sun.getDate()} ${m(sun)}`.slice(0, DECK_MAX.name);
}
// Words of a goal shortcut ("travel", …) or the starred words, as list spellings.
const tagWords = (id) => (id === 'star' ? W.filter((w) => S.star[w.w]) : W.filter((w) => hasTag(w, id))).map((w) => w.w);
function libSwitch(on) {
  return `<div class="seg lib-sw" id="libSw"><button class="${on === 'list' ? 'on' : ''}" data-go="list">📖 คลังคำ</button><button class="${on === 'decks' ? 'on' : ''}" data-go="decks">📚 ชุดของฉัน</button></div>`;
}

/* ---------- word matcher ---------- */
// Reads pasted text (one word or phrase per line, or separated by commas/tabs; numbers, bullets and Thai meanings after the
// English are ignored) and matches it to the list. ok = exact matches; guess = another form of a list word (leaves → leave),
// which the user must confirm because the guess can be wrong (customs → custom); miss = not in the list.
function matchWords(text) {
  const out = { ok: [], guess: [], miss: [], cut: false };
  const parts = String(text || '').split(/[\n\r\t,;]+/);
  const have = new Set(), missSeen = new Set();
  let n = 0;
  deckWords({ words: [] }); // builds DECK_BY
  for (const part of parts) {
    const m = part.replace(/^[^A-Za-z]+/, '').match(/^[A-Za-z]+(?:['’-][A-Za-z]+)*(?: [A-Za-z]+(?:['’-][A-Za-z]+)*)*/);
    if (!m) continue;
    if (++n > DECK_PASTE_MAX) { out.cut = true; break; }
    const norm = m[0].toLowerCase().replace(/[’']s$/, '');
    const hit = DECK_BY.get(norm);
    if (hit) { if (!have.has(hit.w)) { have.add(hit.w); out.ok.push(hit.w); } continue; }
    const g = /\s/.test(norm) ? null : lookupWord(norm);
    if (g) { if (!have.has(g.w) && !out.guess.some((x) => x.word === g.w)) out.guess.push({ input: norm, word: g.w }); continue; }
    if (!missSeen.has(norm)) { missSeen.add(norm); out.miss.push(norm); }
  }
  out.guess = out.guess.filter((x) => !have.has(x.word));
  return out;
}

/* ---------- list of sets ---------- */
function renderDecks() {
  const ds = liveDecks();
  const goals = [...TAGS.map((t) => [t.id, t.icon, t.th]), ['star', '⭐', 'คำติดดาว']].filter(([id]) => tagWords(id).length);
  view.innerHTML = `
    ${libSwitch('decks')}
    ${ds.length ? `<div class="deck-grid">${ds.map((d) => `<button class="card-box guide-link deck-card" data-id="${d.id}">
        <span>${esc(d.icon)}</span><div class="grow"><b>${esc(d.name || 'ชุดไม่มีชื่อ')}</b><div class="small muted">${deckWords(d).length} คำ</div></div><span class="muted">›</span></button>`).join('')}</div>`
    : `<div class="card-box center"><div style="font-size:44px">📚</div><b>ยังไม่มีชุดคำ</b>
        <p class="small muted">สร้างชุดจากคำในแอป เช่น ศัพท์ประจำสัปดาห์ที่ครูสั่ง คำที่ใช้บ่อยที่ทำงาน หรือคำสำหรับไปเที่ยว</p></div>`}
    <button class="btn primary block" id="dkNew">＋ สร้างชุด</button>
    ${ds.length ? '' : `<div class="small muted" style="margin:16px 4px 6px">หรือเริ่มจากชุดสำเร็จรูป (แก้ไขเพิ่ม–ลดคำได้ภายหลัง)</div>
      <div class="chips">${goals.map(([id, ic, th]) => `<button class="chip" data-from="${id}">${ic} ${esc(th)} · ${tagWords(id).length}</button>`).join('')}</div>`}
    <p class="small muted" style="margin:16px 4px">เลือกคำได้จากคลังคำในแอปเท่านั้น · ชุดซิงก์ข้ามเครื่องผ่านบัญชีเดียวกัน (ต้องอัปเดตแอปทุกเครื่อง) · ตอนนี้สร้างและจัดการชุดได้ก่อน ส่วนเรียนและเล่นเกมจากชุดจะตามมา</p>`;
  view.querySelectorAll('.deck-card').forEach((b) => { b.onclick = () => renderDeckEdit(b.dataset.id); });
  $('#dkNew').onclick = () => renderDeckEdit();
  view.querySelectorAll('[data-from]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.from, t = TAGS.find((x) => x.id === id);
      const d = addDeck(t ? t.th : 'คำติดดาว', t ? t.icon : '⭐', tagWords(id));
      if (d) renderDeckEdit(d.id);
    };
  });
}
// Create and store a set. Returns it, or null when the limit is reached.
function addDeck(name, icon, words) {
  if (liveDecks().length >= DECK_MAX.decks) { toast(`มีชุดครบ ${DECK_MAX.decks} ชุดแล้ว ลบชุดที่ไม่ใช้ก่อนนะคะ`); return null; }
  const d = { id: newDeckId(), name: String(name).slice(0, DECK_MAX.name), icon, words: [...new Set(words)].slice(0, DECK_MAX.words), at: 0, used: 0 };
  S.decks.push(d); touchDeck(d);
  return d;
}

/* ---------- edit one set ---------- */
function renderDeckEdit(id) {
  let d = id ? deckById(id) : null;
  if (id && !d) return go('decks');
  const draft = d ? null : { id: newDeckId(), name: weekDeckName(), icon: '📚', words: [], at: 0, used: 0 }; // stored on the first change
  const cur = () => d || draft;
  const store = () => { if (!d) { if (liveDecks().length >= DECK_MAX.decks) { toast(`มีชุดครบ ${DECK_MAX.decks} ชุดแล้ว`); return false; } d = draft; S.decks.push(d); } touchDeck(d); return true; };
  const persist = () => { if (d || cur().words.length) store(); }; // an empty new set is only kept once it gets a word
  let panel = 'paste', preview = null, defName = cur().name;
  const addWords = (list) => {
    const c = cur(), have = new Set(c.words), fresh = [...new Set(list)].filter((w) => !have.has(w));
    const room = DECK_MAX.words - c.words.length;
    if (!fresh.length) { toast('คำเหล่านี้อยู่ในชุดแล้ว'); return 0; }
    if (room <= 0) { toast(`ชุดเต็มแล้ว (สูงสุด ${DECK_MAX.words} คำ)`); return 0; }
    const take = fresh.slice(0, room);
    if (!store()) return 0;
    c.words.push(...take); touchDeck(c);
    if (take.length < fresh.length) toast(`เพิ่ม ${take.length} คำ (ชุดเต็ม ${DECK_MAX.words} คำ ที่เหลือไม่ได้ใส่)`);
    else toast(`เพิ่ม ${take.length} คำแล้ว ✅`);
    return take.length;
  };
  const draw = () => {
    const c = cur();
    view.innerHTML = `
      <div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="dkBack">‹ กลับ</button></div>
      <div class="card-box">
        <div class="chips scroll" id="dkIcons" aria-label="ไอคอนชุด">${DECK_ICONS.map((ic) => `<button class="chip ${ic === c.icon ? 'on' : ''}" data-ic="${ic}" aria-label="ไอคอน ${ic}">${ic}</button>`).join('')}</div>
        <input class="search" id="dkName" maxlength="${DECK_MAX.name}" value="${esc(c.name)}" placeholder="ชื่อชุด" aria-label="ชื่อชุด" style="margin:8px 0 0">
      </div>
      <div class="card-box">
        <b>เพิ่มคำ</b>
        <div class="seg" id="dkTabs" style="margin:8px 0">${[['paste', '📋 วางลิสต์'], ['find', '🔍 ค้นหา'], ['quick', '🎯 ทางลัด']].map(([v, t]) => `<button class="${panel === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div>
        <div id="dkPanel"></div>
      </div>
      <div class="card-box" style="padding:10px 14px">
        <div class="row" style="justify-content:space-between;padding:6px 0"><b id="dkCount"></b></div>
        <div id="dkWords"></div>
      </div>
      <div class="row" style="gap:10px"><button class="btn ghost grow" id="dkCopy">ทำสำเนา</button><button class="btn danger grow" id="dkDel">ลบชุด</button></div>`;
    paintPanel(); paintWords();
    $('#dkBack').onclick = () => go('decks');
    $('#dkWords').onclick = (e) => {
      const x = e.target.closest('[data-rm]');
      if (x) { const c = cur(); c.words = c.words.filter((w) => w.toLowerCase() !== x.dataset.rm.toLowerCase()); touchDeck(c); paintWords(); return; }
      const r = e.target.closest('.wrow'); if (!r) return;
      const w = W[+r.dataset.i]; speak(w.w); openSheet(w);
    };
    $('#dkIcons').onclick = (e) => {
      const b = e.target.closest('[data-ic]'); if (!b) return;
      cur().icon = b.dataset.ic; persist();
      view.querySelectorAll('#dkIcons .chip').forEach((x) => x.classList.toggle('on', x === b));
    };
    $('#dkName').onchange = (e) => { cur().name = e.target.value.trim().slice(0, DECK_MAX.name); defName = ''; persist(); };
    $('#dkTabs').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; panel = b.dataset.v; preview = null; view.querySelectorAll('#dkTabs button').forEach((x) => x.classList.toggle('on', x === b)); paintPanel(); };
    $('#dkCopy').onclick = () => {
      if (!d) return toast('ชุดนี้ยังไม่ได้บันทึก เพิ่มคำก่อนนะคะ');
      const n = addDeck((d.name + ' (สำเนา)').slice(0, DECK_MAX.name), d.icon, d.words);
      if (n) { toast('ทำสำเนาแล้ว ✅'); renderDeckEdit(n.id); }
    };
    $('#dkDel').onclick = () => {
      if (!d) return go('decks');
      if (!confirm(`ลบชุด "${d.name}" ใช่ไหม? (ความคืบหน้าของชุดนี้จะหายไปด้วย)`)) return;
      d.del = true; d.words = []; delete S.dprog[d.id]; touchDeck(d);
      toast('ลบชุดแล้ว'); go('decks');
    };
  };
  const paintWords = () => {
    const c = cur(), ws = deckWords(c);
    $('#dkCount').textContent = `คำในชุด (${ws.length})`;
    $('#dkWords').innerHTML = ws.length ? ws.map((w) => `<div class="wrow" data-i="${w.idx}"><div class="grow dk-w"><div><span class="w" lang="en">${esc(w.w)}</span> <span class="pos">${esc(w.p)}</span></div><div class="t">${esc(w.t)}</div></div>
        <button class="chip dk-x" data-rm="${esc(w.w)}" aria-label="เอา ${esc(w.w)} ออกจากชุด">✕</button></div>`).join('')
      : '<p class="center muted small">ยังไม่มีคำในชุดนี้ ลองวางลิสต์ ค้นหา หรือใช้ทางลัดด้านบนได้เลยค่ะ</p>';
  };
  const paintPanel = () => {
    const box = $('#dkPanel');
    box.onchange = box.onclick = null;
    if (panel === 'paste') {
      if (!preview) {
        box.innerHTML = `<textarea id="dkText" class="search" rows="6" placeholder="วางรายการคำ แถวละ 1 คำ เช่น&#10;airport&#10;1. ticket = ตั๋ว&#10;passport, hotel" aria-label="รายการคำ" lang="en" autocapitalize="none" autocorrect="off" style="margin:0 0 8px;resize:vertical"></textarea>
          <button class="btn primary block" id="dkCheck">ตรวจคำ</button>`;
        $('#dkCheck').onclick = () => { preview = matchWords($('#dkText').value); if (!preview.ok.length && !preview.guess.length && !preview.miss.length) { preview = null; return toast('ยังไม่พบคำอังกฤษในข้อความ'); } paintPanel(); };
        return;
      }
      const p = preview;
      box.innerHTML = `
        ${p.cut ? `<p class="small" style="color:var(--bad)">อ่านแค่ ${DECK_PASTE_MAX} รายการแรก ที่เหลือถูกตัดออก</p>` : ''}
        <div class="dk-sec"><b>✅ พบในคลัง ${p.ok.length} คำ</b><div class="small muted" lang="en">${p.ok.map(esc).join(', ') || '–'}</div></div>
        ${p.guess.length ? `<div class="dk-sec"><b>⚠️ รูปคำที่ต้องยืนยัน (${p.guess.length})</b><div class="small muted">ติ๊กเฉพาะที่ใช่ เพราะเดาอาจผิด</div>
          ${p.guess.map((g, i) => `<label class="dk-g" lang="en"><input type="checkbox" data-g="${i}"> ${esc(g.input)} → <b>${esc(g.word)}</b></label>`).join('')}</div>` : ''}
        ${p.miss.length ? `<div class="dk-sec"><b>❌ ไม่พบในคลัง ${p.miss.length} รายการ</b><div class="small muted" lang="en">${p.miss.map(esc).join(', ')}</div>
          <button class="btn ghost" id="dkCopyMiss" style="margin-top:6px">คัดลอกรายการที่ไม่พบ</button></div>` : ''}
        <div class="row" style="gap:10px;margin-top:8px"><button class="btn ghost" id="dkRedo">แก้ข้อความ</button><button class="btn primary grow" id="dkAdd"></button></div>`;
      const sel = () => [...p.ok, ...[...box.querySelectorAll('[data-g]:checked')].map((x) => p.guess[+x.dataset.g].word)];
      const label = () => { const n = sel().length; $('#dkAdd').textContent = `เพิ่ม ${n} คำเข้าชุด`; $('#dkAdd').disabled = !n; };
      label();
      box.onchange = label;
      $('#dkRedo').onclick = () => { preview = null; paintPanel(); };
      if ($('#dkCopyMiss')) $('#dkCopyMiss').onclick = () => {
        const txt = p.miss.join('\n');
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('คัดลอกแล้ว 📋'), () => toast('คัดลอกไม่ได้ ลองกดค้างที่ข้อความแล้วคัดลอกเองนะคะ'));
      };
      $('#dkAdd').onclick = () => { if (addWords(sel())) { preview = null; paintPanel(); paintWords(); } };
    } else if (panel === 'find') {
      box.innerHTML = `<input class="search" id="dkQ" type="search" placeholder="🔍 พิมพ์คำอังกฤษหรือคำแปลไทย" aria-label="ค้นหาคำ" autocapitalize="none" autocorrect="off" style="margin:0 0 6px"><div id="dkRes"></div>`;
      const find = () => {
        const q = $('#dkQ').value.trim().toLowerCase(), res = $('#dkRes');
        if (!q) { res.innerHTML = '<p class="small muted">พิมพ์เพื่อค้นหา แล้วแตะ ＋ เพื่อเพิ่มเข้าชุด</p>'; return; }
        const have = new Set(cur().words);
        const hits = W.filter((w) => w.w.toLowerCase().includes(q) || w.t.includes(q)).sort((a, b) => b.w.toLowerCase().startsWith(q) - a.w.toLowerCase().startsWith(q)).slice(0, 30);
        res.innerHTML = hits.length ? hits.map((w) => `<div class="wrow"><div class="grow dk-w"><div><span class="w" lang="en">${esc(w.w)}</span> <span class="pos">${esc(w.p)}</span></div><div class="t">${esc(w.t)}</div></div>
          <button class="chip ${have.has(w.w) ? 'on' : ''}" data-add="${esc(w.w)}" aria-label="${have.has(w.w) ? 'อยู่ในชุดแล้ว' : 'เพิ่ม'} ${esc(w.w)}">${have.has(w.w) ? '✓' : '＋'}</button></div>`).join('') : '<p class="center muted small">ไม่พบคำ</p>';
      };
      $('#dkQ').oninput = find; find();
      $('#dkRes').onclick = (e) => {
        const b = e.target.closest('[data-add]'); if (!b || b.classList.contains('on')) return;
        if (addWords([b.dataset.add])) { b.classList.add('on'); b.textContent = '✓'; paintWords(); }
      };
    } else {
      const goals = [...TAGS.map((t) => [t.id, t.icon, t.th, t.note]), ['star', '⭐', 'คำติดดาว', 'คำที่คุณกดดาวไว้']].filter(([id]) => tagWords(id).length);
      box.innerHTML = `<div class="small muted" style="margin-bottom:6px">เติมคำทั้งกลุ่มเข้าชุดทีเดียว แล้วลบคำที่ไม่ต้องการออกได้ภายหลัง</div>
        ${goals.map(([id, ic, th, note]) => `<button class="card-box guide-link dk-quick" data-q="${id}" style="padding:12px 14px;margin-bottom:8px"><span>${ic}</span><div class="grow"><b>${esc(th)}</b><div class="small muted">${esc(note || '')} · ${tagWords(id).length} คำ</div></div><span class="muted">＋</span></button>`).join('')}`;
      box.onclick = (e) => {
        const b = e.target.closest('[data-q]'); if (!b) return;
        const id = b.dataset.q, t = TAGS.find((x) => x.id === id), c = cur();
        const rename = !c.words.length && (!c.name || c.name === defName);
        if (addWords(tagWords(id)) && rename) { c.name = t ? t.th : 'คำติดดาว'; c.icon = t ? t.icon : '⭐'; defName = ''; touchDeck(c); draw(); }
        else paintWords();
      };
    }
  };
  draw();
}
