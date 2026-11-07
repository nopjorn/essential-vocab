'use strict';
// Word list, memory notes and the word detail sheet.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- word list ---------- */
let listFilter = { q: '', lv: 'all', st: 'all', tp: '', gl: '' };
function renderList() {
  view.innerHTML = `
    <div class="list-head" id="listHead">${libSwitch('list')}<input class="search" id="q" type="search" placeholder="🔍 ค้นหาคำอังกฤษหรือคำแปลไทย" value="${esc(listFilter.q)}" autocapitalize="none" autocorrect="off"></div>
    <div class="chips scroll" id="lv" style="margin-bottom:8px">
      ${['all', ...LEVELS].map((l) => `<button class="chip${l === 'all' ? '' : ' lv-' + l}" data-v="${l}">${l === 'all' ? 'ทุกระดับ' : `<i class="lc-dot"></i>${LV_LABEL[l]}`}</button>`).join('')}
    </div>
    <div class="chips scroll" id="st" style="margin-bottom:8px">
      ${[['all', 'ทั้งหมด'], ['new', 'ยังไม่เรียน'], ['learning', '🟡 กำลังเรียน'], ['mastered', '🟢 จำได้แล้ว'], ['star', '⭐ ติดดาว'], ['leech', '🐢 คำดื้อ'], ['note', '💡 มีวิธีจำ']].map(([v, t]) => `<button class="chip" data-v="${v}">${t} <small class="cn"></small></button>`).join('')}
    </div>
    <div class="sel-pair">
      <select class="sel block-sel" id="tpSel" aria-label="หมวด"><option value="">📂 ทุกหมวด</option>${topicOptions(listFilter.tp)}</select>
      <select class="sel block-sel" id="glSel" aria-label="เป้าหมาย"><option value="">🎯 ทุกเป้าหมาย</option>${TAGS.map((t) => `<option value="${t.id}" ${listFilter.gl === t.id ? 'selected' : ''}>${TAG_LABEL[t.id]}</option>`).join('')}</select>
    </div>
    <div class="lt-sum" id="ltSum"><div class="lt-bar" aria-hidden="true"><i class="m"></i><i class="l"></i></div><div class="small muted" id="cnt"></div></div>
    <div class="card-box" style="padding:4px 14px" id="rows"></div>
    <div id="sentinel" style="height:1px"></div>
    <nav class="az-rail" id="azRail" aria-label="กระโดดไปตัวอักษร"></nav><div class="az-pop" id="azPop" aria-hidden="true"></div>`;
  let base = [];
  const ST_TEST = { all: () => true, star: isStar, leech: isLeech, note: (w) => !!S.note[w.w], new: (w) => status(w) === 'new', learning: (w) => status(w) === 'learning', mastered: (w) => status(w) === 'mastered' };
  const paint = () => {
    view.querySelectorAll('#lv .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === listFilter.lv));
    view.querySelectorAll('#st .chip').forEach((c) => {
      c.classList.toggle('on', c.dataset.v === listFilter.st);
      const n = c.dataset.v === 'all' ? base.length : base.filter(ST_TEST[c.dataset.v]).length;
      c.querySelector('.cn').textContent = n.toLocaleString('en-US');
    });
  };
  let items = [], shown = 0, letter = '', az = true, perLetter = {};
  const rows = $('#rows'), rail = $('#azRail'), pop = $('#azPop');
  const first = (w) => (w.w[0] || '').toUpperCase();
  // A–Z headings only while the list is in A–Z order (a search sorts prefix matches first)
  const head = (w) => { if (!az) return ''; const c = first(w); if (c === letter) return ''; letter = c; return `<div class="lt-h" data-c="${esc(c)}" aria-hidden="true"><b>${esc(c)}</b><span>${perLetter[c]} คำ</span></div>`; };
  const more = () => {
    const chunk = items.slice(shown, shown + 80);
    rows.insertAdjacentHTML('beforeend', chunk.map((w) => `${head(w)}<div class="wrow" data-i="${w.idx}">
      ${wordRing(w)}
      <div class="grow"><div><span class="w">${esc(w.w)}</span> <span class="pos">${esc(w.p)}</span></div><div class="t">${esc(w.t)}</div></div>
      <span class="star-mark">${isLeech(w) ? '🐢' : ''}${isStar(w) ? '⭐' : ''}</span>${lvBadge(w.g)}</div>`).join(''));
    shown += chunk.length;
  };
  // A–Z rail (1.164): tap or slide a finger down the letters; rows load up to that letter, then the view scrolls to it
  const jump = (c) => {
    const at = items.findIndex((w) => first(w) === c);
    if (at < 0) return;
    while (shown <= at) more();
    const h = rows.querySelector(`.lt-h[data-c="${CSS.escape(c)}"]`), row = h && h.nextElementSibling;
    if (!row) return;
    const lh = $('#listHead');
    view.scrollTop += row.getBoundingClientRect().top - (lh ? lh.getBoundingClientRect().bottom : view.getBoundingClientRect().top) - h.offsetHeight - 6;
  };
  let railOn = '';
  const railAt = (e) => {
    const bs = rail.children; if (!bs.length) return;
    const r = rail.getBoundingClientRect();
    const b = bs[Math.max(0, Math.min(bs.length - 1, Math.floor((e.clientY - r.top) / r.height * bs.length)))];
    if (b.dataset.c === railOn) return;
    railOn = b.dataset.c;
    pop.textContent = railOn; pop.classList.add('on');
    if (e.pointerType === 'touch' && navigator.vibrate) navigator.vibrate(5);
    jump(railOn);
  };
  const railEnd = () => { railOn = ''; pop.classList.remove('on'); };
  rail.onpointerdown = (e) => { e.preventDefault(); try { rail.setPointerCapture(e.pointerId); } catch (_) {} railAt(e); };
  rail.onpointermove = (e) => { if (railOn) railAt(e); };
  rail.onpointerup = rail.onpointercancel = railEnd;
  rail.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b && !railOn) jump(b.dataset.c); };
  const apply = () => {
    const q = listFilter.q.trim().toLowerCase();
    base = W.filter((w) => (listFilter.lv === 'all' || w.g === listFilter.lv) && (!listFilter.tp || topicMatch(listFilter.tp, w.tp)) && (!listFilter.gl || hasTag(w, listFilter.gl))
      && (!q || w.w.toLowerCase().includes(q) || w.t.includes(q)));
    items = base.filter(ST_TEST[listFilter.st] || ST_TEST.all);
    if (q) items.sort((a, b) => (b.w.toLowerCase().startsWith(q)) - (a.w.toLowerCase().startsWith(q)));
    else items.sort((a, b) => { const x = a.w.toLowerCase(), y = b.w.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }); // A–Z ignoring case (W puts capitals first), so each letter heading shows once
    az = !q; letter = ''; perLetter = {};
    for (const w of items) { const c = first(w); perLetter[c] = (perLetter[c] || 0) + 1; }
    rows.innerHTML = ''; shown = 0; more();
    if (!items.length) rows.innerHTML = emptyArt({ kind: 'search', title: 'ไม่พบคำศัพท์', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรองด้านบน' });
    // summary: how much of what is shown is mastered / learning
    let m = 0, l = 0;
    for (const w of items) { const st = status(w); if (st === 'mastered') m++; else if (st === 'learning') l++; }
    const pc = (n) => (items.length ? (n / items.length * 100).toFixed(2) : 0) + '%';
    const sum = $('#ltSum');
    sum.style.setProperty('--m', pc(m)); sum.style.setProperty('--l', pc(l));
    sum.querySelector('.lt-bar').hidden = !items.length;
    $('#cnt').innerHTML = `<b>${items.length.toLocaleString('en-US')} คำ</b>${items.length && (m || l) ? ` · <span class="nowrap">จำได้แล้ว ${m.toLocaleString('en-US')}</span> · <span class="nowrap">กำลังเรียน ${l.toLocaleString('en-US')}</span>` : ''} · <span class="nowrap">แตะคำเพื่อดูตัวอย่างประโยค</span>`;
    const letters = az ? Object.keys(perLetter).filter((c) => /[A-Z]/.test(c)) : [];
    rail.innerHTML = letters.length > 3 && items.length > 40 ? letters.map((c) => `<button type="button" data-c="${c}" aria-label="ไปที่ตัว ${c}">${c}</button>`).join('') : '';
    view.classList.toggle('az-on', !!rail.children.length);
    onScroll();
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
    const onChange = () => { r.querySelector('.dot').outerHTML = wordRing(w); r.querySelector('.star-mark').textContent = (isLeech(w) ? '🐢' : '') + (isStar(w) ? '⭐' : ''); };
    // the tapped word morphs into the sheet's title (View Transitions); otherwise the sheet slides up as before
    const from = r.querySelector('.w');
    if (!vtOk() || vtBusy) return openSheet(w, onChange);
    from.style.viewTransitionName = 'wd';
    vtRun(() => { from.style.viewTransitionName = ''; const el = openSheet(w, onChange, { now: true }); const t = el.querySelector('.sheet-word'); if (t) t.style.viewTransitionName = 'wd'; }, 'wd');
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && shown < items.length) more(); }, { root: view, rootMargin: '400px' });
  io.observe($('#sentinel'));
  // letter headings stick just under the sticky search box
  const lhRo = new ResizeObserver(() => { const lh = $('#listHead'); if (lh) view.style.setProperty('--lhh', lh.offsetHeight + 'px'); });
  lhRo.observe($('#listHead'));
  edgeFade($('#lv')); edgeFade($('#st'));
  // the rail shows once the filters have scrolled away (it would sit over them at the top)
  let railRaf = 0;
  const railShow = () => { railRaf = 0; const lh = $('#listHead'); if (lh) rail.classList.toggle('show', rows.getBoundingClientRect().top < lh.getBoundingClientRect().bottom + 24); };
  const onScroll = () => { if (!railRaf) railRaf = requestAnimationFrame(railShow); };
  view.addEventListener('scroll', onScroll, { passive: true });
  cleanup = () => { io.disconnect(); lhRo.disconnect(); view.removeEventListener('scroll', onScroll); cancelAnimationFrame(railRaf); view.classList.remove('az-on'); view.style.removeProperty('--lhh'); };
  apply();
}

// Word-list status (1.131): a small ring that fills as the review interval grows (full = จำได้แล้ว, 16+ days).
function wordRing(w) {
  const st = status(w), p = st === 'mastered' ? 100 : st === 'new' ? 0 : Math.max(12, Math.min(90, ivlOf(S.prog[w.w]) / 16 * 100));
  return `<span class="dot ring ${st}" style="--p:${Math.round(p)}%"></span>`;
}

/* ---------- memory notes ---------- */
// Card/sheet snippet: the user's own memory hook, or a prompt to write one for leeches.
function noteBox(w) {
  if (S.note[w.w] || S.sketch[w.w]) return `<button class="note-box${S.sketch[w.w] ? ' has-sk' : ''}" data-note>${sketchSvg(w.w)}<span>💡 <b>วิธีจำของฉัน:</b> ${esc(S.note[w.w] || '')} <span class="muted">✏️</span></span></button>`;
  return isLeech(w) ? '<button class="note-box empty" data-note>🐢 คำนี้ลืมบ่อย แตะเพื่อเขียนวิธีจำของตัวเอง</button>'
    : '<button class="note-add" data-note>✏️ เขียนวิธีจำ</button>';
}
// Read-only memory hook shown in game feedback (1.64); '' for words without one and for skill-game items (idx < 0).
const hookBox = (w) => (w.idx >= 0 && (S.note[w.w] || S.sketch[w.w]) ? `<div class="note-box hook${S.sketch[w.w] ? ' has-sk' : ''}">${sketchSvg(w.w)}<span>💡 <b>วิธีจำของฉัน:</b> ${esc(S.note[w.w] || '')}</span></div>` : '');
function editNote(w, onDone) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="วิธีจำ ${esc(w.w)}">
      <div class="grab"></div>
      <div class="h2" style="margin:8px 0 4px">💡 วิธีจำ "${esc(w.w)}"</div>
      <div class="muted small">${esc(w.t)}</div>
      <textarea class="note-in" id="noteIn" maxlength="200" placeholder="เช่น เสียงคล้ายคำไทย, แต่งประโยคตลกๆ, นึกภาพ…">${esc(S.note[w.w] || '')}</textarea>
      <div class="small muted">ตัวอย่าง: abandon = "อะ-แบน-ดอน" ทิ้งรถไว้จนยางแบน 🚗</div>
      <div class="sk-head"><b>🎨 วาดรูปช่วยจำ</b><span class="small muted">Apple Pencil หรือนิ้ว</span><span class="grow"></span><button class="btn ghost small" data-sk="undo" aria-label="ย้อนเส้นล่าสุด">↩︎</button><button class="btn ghost small" data-sk="clear" aria-label="ล้างรูป">🗑</button></div>
      <canvas class="sk-pad" id="skPad" width="600" height="360" aria-label="ช่องวาดรูปช่วยจำ"></canvas>
      <div class="row" style="margin-top:12px">${S.note[w.w] || S.sketch[w.w] ? '<button class="btn grow" data-act="del">ลบ</button>' : ''}<button class="btn primary grow" data-act="save">บันทึก</button></div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  const pad = sketchPad($('#skPad', el), S.sketch[w.w]);
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 250); if (onDone) onDone(); };
  el.onclick = (e) => {
    if (e.target === el) return close();
    const sk = e.target.closest('[data-sk]'); if (sk) { if (sk.dataset.sk === 'undo') pad.undo(); else pad.clear(); return; }
    const act = e.target.closest('[data-act]'); if (!act) return;
    const v = $('#noteIn', el).value.trim(), del = act.dataset.act === 'del', d = del ? '' : pad.path();
    if (del || v !== (S.note[w.w] || '')) setNote(w.w, del ? '' : v);
    if (del || d !== (S.sketch[w.w] || '')) setSketch(w.w, d);
    save(); toast(S.note[w.w] || S.sketch[w.w] ? 'บันทึกวิธีจำแล้ว 💡' : 'ลบวิธีจำแล้ว'); close();
  };
}

// 🎨 Drawing pad for a memory hook (1.142): strokes kept as point lists in a 300×180 box, saved as SVG path data.
// A pencil draws; once a pencil has been used, finger/palm touches are ignored (palm rest). Returns {path, undo, clear, strokes}.
function sketchPad(cv, d) {
  const W0 = 300, H0 = 180, ctx = cv.getContext('2d');
  let strokes = [], cur = null, penSeen = false;
  // read back a saved drawing: "M x y L x y L … M …"
  (sketchD(d).match(/M[^M]*/g) || []).forEach((s) => { const n = (s.match(/-?\d+/g) || []).map(Number), pts = []; for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k], n[k + 1]]); if (pts.length) strokes.push(pts); });
  const ink = () => getComputedStyle(cv).color || '#222';
  const draw = () => {
    ctx.setTransform(cv.width / W0, 0, 0, cv.height / H0, 0, 0);
    ctx.clearRect(0, 0, W0, H0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = ink();
    for (const s of strokes) {
      ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
      if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]);
      for (const [x, y] of s.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  const at = (e) => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(W0, Math.round((e.clientX - r.left) / r.width * W0))), Math.max(0, Math.min(H0, Math.round((e.clientY - r.top) / r.height * H0)))]; };
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'pen') penSeen = true; else if (penSeen && e.pointerType === 'touch') return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    cur = { id: e.pointerId, pts: [at(e)] }; strokes.push(cur.pts); draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    const p = at(e), q = cur.pts[cur.pts.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 2) { cur.pts.push(p); draw(); }
  });
  const end = (e) => { if (cur && e.pointerId === cur.id) cur = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  draw();
  const path = () => {
    let out = '';
    for (const s of strokes) { const t = 'M' + s.map(([x, y], k) => (k ? 'L' : '') + x + ' ' + y).join(' '); if ((out + t).length > SKETCH_MAX) break; out += t; }
    return out;
  };
  return { path, undo: () => { strokes.pop(); draw(); }, clear: () => { strokes = []; draw(); }, strokes: () => strokes.length };
}

/* ---------- word detail sheet ---------- */
// opt.deck = id of a word set: show that set's progress and hide the buttons that change the main progress.
// Word-sheet header (1.129): how well the word is held, as a ring (new 0 → mastered full, by the review gap up to 16 days).
function sheetRing(w, dm) {
  const p = (dm || S.prog)[w.w], f = !p ? 0 : p.b >= MASTERED ? 1 : Math.min(0.95, Math.max(0.08, ivlOf(p) / INTERVALS[MASTERED]));
  const lab = !p ? 'ยังไม่เรียน' : f >= 1 ? 'จำได้แล้ว' : `ความจำ ${Math.round(f * 100)}%`;
  // 1.132: tap = what the number means (the review gap so far against the 16 days that count as "จำได้แล้ว")
  const tip = !p ? 'วงความจำ: ยังไม่ได้เรียนคำนี้ เริ่มที่ 0%' : f >= 1 ? 'วงความจำเต็มแล้ว ✓ คำนี้ทบทวนห่างกันเกิน 16 วันแล้ว = จำได้แล้ว'
    : `วงความจำ ${Math.round(f * 100)}% · ตอนนี้ทบทวนห่างกันราว ${Math.max(1, Math.round(ivlOf(p)))} วัน ถึง 16 วันเมื่อไหร่ = จำได้แล้ว (เต็มวง)`;
  return `<button type="button" class="sh-ring" aria-label="${lab}" data-tip="${esc(tip)}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="rt"/><circle cx="18" cy="18" r="15" class="rg" pathLength="100" style="stroke-dashoffset:${(100 - f * 100).toFixed(1)}" transform="rotate(-90 18 18)"/></svg><span aria-hidden="true">${f >= 1 ? '✓' : Math.round(f * 100) + '<small>%</small>'}</span></button>`;
}
document.addEventListener('click', (e) => { const r = e.target.closest && e.target.closest('.sh-ring[data-tip]'); if (r) toast(r.dataset.tip); });
function openSheet(w, onChange, opt = {}) {
  actEvent('sheet');
  const dm = opt.deck ? S.dprog[opt.deck] || {} : null;
  const st = dm ? DECK_DOT[deckStatus(dm[w.w])] : status(w);
  const stLabel = { new: 'ยังไม่เรียน', learning: '🟡 กำลังเรียน', mastered: dm ? '🟢 แม่นแล้ว' : '🟢 จำได้แล้ว' }[st] + ((dm ? leechIn(w, dm) : isLeech(w)) ? ' · 🐢 คำดื้อ' : '');
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet wsheet${tintStyle(w) ? ' tint' : ''}" role="dialog" aria-label="${esc(w.w)}"${tintStyle(w)}>
      <div class="grab"></div>
      <div class="sheet-body">
      <div class="sh-hero lvc-${w.g}">${sheetRing(w, dm)}
      <div class="row" style="justify-content:space-between">${lvBadge(w.g)}<a class="oxl" href="https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(w.w.toLowerCase().replace(/ /g, '-'))}" target="_blank" rel="noopener" aria-label="ดูใน Oxford Learner's Dictionaries">📖 Oxford ↗</a><span class="st-pill ${st}">${stLabel}</span></div>
      <div class="sheet-word" lang="en">${esc(w.w)} <button class="say-ex" data-say aria-label="ฟังเสียง">🔊</button><span class="sheet-emoji" id="emBox" aria-hidden="true">${emojiOf(w)}</span></div>
      <div class="muted">${ipaHtml(w.i)} · <span class="pos">${esc(w.p)}</span>${w.tp ? ` · ${TOPIC_LABEL[w.tp]}` : ''}</div>
      </div>
      ${tagsOf(w).length ? `<div class="small muted sheet-tags">${tagsOf(w).map((id) => `<span class="tag-pill">${TAG_LABEL[id]}</span>`).join('')}</div>` : ''}
      <div class="th" style="font-size:22px;margin:10px 0">${esc(w.t)}</div>
      ${noteBox(w)}${exampleBox(w)}<div class="colloc" id="colBox"></div><div class="colloc" id="famBox"></div><div class="colloc" id="irBox"></div><div class="colloc" id="dpBox"></div><div class="colloc" id="gpBox"></div><div class="colloc" id="pvBox"></div><div class="colloc" id="idBox"></div><div class="colloc" id="synBox"></div><div class="colloc" id="afBox"></div><div class="colloc" id="rtBox"></div><div class="colloc" id="ukBox"></div>
      </div>
      <div class="sheet-acts">
        <button class="btn" data-act="star">${isStar(w) ? '★ เอาดาวออก' : '⭐ ติดดาว'}</button>
        ${dm ? '' : '<button class="btn" data-act="review" aria-label="ทบทวนวันนี้">🔁 ทบทวน</button><button class="btn" data-act="known">✓ รู้แล้ว</button><button class="btn" data-act="deck" aria-label="ใส่คำนี้เข้าชุดของฉัน">📚 ใส่ชุด</button>'}
      </div>
    </div>`;
  document.body.appendChild(el);
  // drag the word out (Split View: into Notes, Goodnotes, Mail …) as "word – Thai" (1.140)
  const dw = el.querySelector('.sheet-word');
  if (dw) { dw.draggable = true; dw.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', `${w.w} – ${w.t}`); e.dataTransfer.effectAllowed = 'copy'; }); }
  if (opt.now) el.classList.add('open', 'nt'); else requestAnimationFrame(() => el.classList.add('open')); // opt.now: shown at once (View Transition morph)
  if (!EMOJI) loadEmoji().then(() => { const b = el.querySelector('#emBox'); if (b) b.textContent = emojiOf(w); }).catch(() => {});
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
  // Swipe the card down to close it. The scroll container is .sheet-body (the sheet itself never scrolls), so the swipe only
  // arms when the body is at the top, and drops out as soon as the finger moves up or the body starts scrolling.
  const sheet = el.querySelector('.sheet'), body = el.querySelector('.sheet-body');
  let y0 = null, dy = 0, drag = false;
  sheet.addEventListener('touchstart', (e) => { y0 = body.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; drag = false; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const d = e.touches[0].clientY - y0;
    if (!drag) {
      if (d < -4 || body.scrollTop > 0) { y0 = null; return; } // scrolling the content, not closing
      if (d < 8) return;
      drag = true; sheet.style.transition = 'none';
    }
    dy = Math.max(0, d);
    sheet.style.transform = `translateY(${dy}px)`; // follows the finger
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (!drag) { y0 = null; return; }
    y0 = null; drag = false; sheet.style.transition = '';
    if (dy > 90) { sheet.style.transform = 'translateY(100%)'; close(); }
    else sheet.style.transform = '';
  });
  sheet.addEventListener('touchcancel', () => { if (drag) { drag = false; y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; } });
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
    if (act.dataset.act === 'deck') { close(); pickDeck([w.w]); return; }
    if (act.dataset.act === 'known') { markKnown(w); toast('ทำเครื่องหมายว่ารู้แล้ว 👍'); }
    else { markForReview(w); toast('เพิ่มเข้ารายการทบทวนแล้ว 🔁'); }
    if (onChange) onChange();
    close();
  };
  return el;
}

// Weekly summary. Weeks run Monday–Sunday; `off` = 0 for this week, 1 for last week, …
function mondayKey(off = 0) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - off * 7);
  return ymd(d);
}
function weekStats(off) {
  const mon = mondayKey(off), days = [];
  for (let k = 0; k < 7; k++) { const d = ymd(new Date(Date.parse(mon + 'T12:00:00') + k * DAY)); if (d <= today()) days.push(d); }
  const end = days[days.length - 1];
  const snapAt = (key) => { const ks = Object.keys(S.snap).filter((k) => k <= key).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const before = ymd(new Date(Date.parse(mon + 'T12:00:00') - DAY));
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
const monthKey = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - off); return ymd(d).slice(0, 7); };
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const monthName = (key) => `${TH_MONTH[+key.slice(5) - 1]} ${+key.slice(0, 4) + 543}`;
function monthStats(off) {
  const key = monthKey(off), days = [];
  for (let d = new Date(key + '-01T12:00:00'); ymd(d).startsWith(key); d = new Date(d.getTime() + DAY)) {
    const k = ymd(d); if (k <= today()) days.push(k);
  }
  const snapAt = (k) => { const ks = Object.keys(S.snap).filter((x) => x <= k).sort(); return ks.length ? S.snap[ks[ks.length - 1]] : null; };
  const first = key + '-01', before = ymd(new Date(Date.parse(first + 'T12:00:00') - DAY));
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

/* ---------- word menu (1.146) ---------- */
// Right-click (mouse / trackpad on an iPad with a keyboard) or a long press with a finger on any list word — in stories,
// the book, my article, the word list, sets and result lists — opens a small menu: 🔊 listen · 📖 meaning · ⭐ star ·
// 📚 into a set · 📋 copy. A pencil long press is left alone (the pencil highlights in the book). Game answers are not targets.
const WM_SEL = '.rw[data-i], .wrow[data-i], .wl[data-i], [data-wi]';
let wmEl = null, wmSkipClick = false;
function wmClose() { if (wmEl) { wmEl.remove(); wmEl = null; } }
function wordMenu(w, x, y) {
  wmClose();
  const el = document.createElement('div');
  el.className = 'wmenu'; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', 'เมนูคำ ' + w.w);
  el.innerHTML = `<div class="wm-h"><b lang="en">${esc(w.w)}</b><span>${esc(w.t)}</span></div>
    <button role="menuitem" data-wm="say">🔊 ฟังเสียง</button>
    <button role="menuitem" data-wm="sheet">📖 ดูความหมาย</button>
    <button role="menuitem" data-wm="star">${isStar(w) ? '☆ เอาดาวออก' : '⭐ ติดดาว'}</button>
    <button role="menuitem" data-wm="deck">📚 ใส่ชุดของฉัน</button>
    <button role="menuitem" data-wm="copy">📋 คัดลอก</button>`;
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x)) + 'px';
  el.style.top = Math.max(8, Math.min(innerHeight - r.height - 8, y)) + 'px';
  wmEl = el; wmEl._at = Date.now();
  el.querySelector('button').focus({ preventScroll: true });
  el.onclick = (e) => {
    const b = e.target.closest('[data-wm]'); if (!b) return;
    const a = b.dataset.wm; wmClose();
    if (a === 'say') speak(w.w);
    else if (a === 'sheet') { speak(w.w); openSheet(w); }
    else if (a === 'star') toggleStar(w);
    else if (a === 'deck') pickDeck([w.w]);
    else if (a === 'copy') {
      const t = `${w.w} – ${w.t}`; wordMenu.copied = t; // read by tests
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('📋 คัดลอกแล้ว'), () => toast('คัดลอกไม่ได้ในเครื่องนี้'));
    }
  };
  el.addEventListener('keydown', (e) => {
    const items = [...el.querySelectorAll('button')], k = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); wmClose(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); items[(k + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
  });
}
const wmWord = (t) => { const el = t && t.closest && t.closest(WM_SEL); if (!el || el.closest('.wmenu, .opt, .tile')) return null; const w = W[+(el.dataset.i != null ? el.dataset.i : el.dataset.wi)]; return w || null; };
document.addEventListener('contextmenu', (e) => {
  const w = wmWord(e.target); if (!w) return;
  e.preventDefault(); wordMenu(w, e.clientX, e.clientY);
});
(() => {
  let lp = null;
  const stop = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
  document.addEventListener('pointerdown', (e) => {
    if (wmEl && !e.target.closest('.wmenu')) wmClose();
    if (e.pointerType !== 'touch' || e.target.closest('.book.pen')) return;
    const w = wmWord(e.target); if (!w) return;
    lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { lp = null; wmSkipClick = true; wordMenu(w, e.clientX, e.clientY + 12); }, 550) };
  }, true);
  document.addEventListener('pointermove', (e) => { if (lp && Math.abs(e.clientX - lp.x) + Math.abs(e.clientY - lp.y) > 10) stop(); }, true);
  document.addEventListener('pointerup', stop, true);
  document.addEventListener('pointercancel', stop, true);
  // the click that ends a long press must not also open the word / turn the page
  document.addEventListener('click', (e) => { if (wmSkipClick) { wmSkipClick = false; if (!e.target.closest('.wmenu')) { e.preventDefault(); e.stopPropagation(); } } }, true);
  addEventListener('scroll', () => { if (wmEl && Date.now() - wmEl._at > 400) wmClose(); }, true); // not the scroll that brought the word into view
})();

/* ---------- hover meaning (1.147) ---------- */
// An Apple Pencil hovering over the screen (iPads with pencil hover) or a mouse / trackpad pointer resting on a list word in
// reading text (stories, the book, my article, cases) shows its meaning in a small bubble after a short pause. Touch never
// hovers, so phones are untouched. The bubble ignores the pointer and goes away on leave, press, scroll or page change.
let hovEl = null, hovT = 0, hovOn = null;
function hovHide() { clearTimeout(hovT); hovOn = null; if (hovEl) { hovEl.remove(); hovEl = null; } }
function hovShow(rw) {
  const w = W[+rw.dataset.i]; if (!w || !rw.isConnected) return;
  hovHide(); hovOn = rw;
  const el = document.createElement('div');
  el.className = 'whov'; el.setAttribute('role', 'tooltip');
  const st = status(w);
  el.innerHTML = `<b lang="en">${esc(w.w)}</b> <span class="whov-p">${esc(w.p)}</span><div>${esc(w.t)}</div>${st !== 'new' ? `<div class="whov-s">${st === 'mastered' ? '🟢 จำได้แล้ว' : '🟡 กำลังเรียน'}</div>` : ''}`;
  document.body.appendChild(el);
  const r = rw.getBoundingClientRect(), b = el.getBoundingClientRect();
  const below = r.top - b.height - 10 < 8;
  el.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, r.left + r.width / 2 - b.width / 2)) + 'px';
  el.style.top = (below ? r.bottom + 10 : r.top - b.height - 10) + 'px';
  el.classList.toggle('below', below);
  hovEl = el;
}
document.addEventListener('pointerover', (e) => {
  if ((e.pointerType !== 'pen' && e.pointerType !== 'mouse') || e.buttons) return;
  const rw = e.target.closest && e.target.closest('.rw[data-i]');
  if (!rw || rw === hovOn || rw.closest('.wmenu')) return;
  hovHide(); hovOn = rw;
  hovT = setTimeout(() => { if (hovOn === rw) hovShow(rw); }, e.pointerType === 'pen' ? 180 : 450);
});
document.addEventListener('pointerout', (e) => {
  const rw = e.target.closest && e.target.closest('.rw[data-i]');
  if (rw && rw === hovOn && !(e.relatedTarget && rw.contains(e.relatedTarget))) hovHide();
});
document.addEventListener('pointerdown', hovHide, true);
addEventListener('scroll', hovHide, true);
document.addEventListener('keydown', hovHide, true);
