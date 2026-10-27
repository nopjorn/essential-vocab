'use strict';
// Extra vocabulary knowledge: phrasal verbs, synonyms/antonyms, word parts (prefixes/suffixes), idioms and situations.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- lazy data files ---------- */
// loadData('data/phrasal.js', 'PHRASAL') → Promise of window.PHRASAL ([] if the file fails to load).
const DATA_P = {};
function loadData(file, key) {
  if (!DATA_P[key]) {
    DATA_P[key] = window[key] ? Promise.resolve(window[key]) : new Promise((res) => {
      const sc = document.createElement('script');
      sc.src = file + '?v=' + APP_VERSION;
      const done = () => res(window[key] || []);
      sc.onload = done; sc.onerror = done;
      document.head.appendChild(sc);
    });
  }
  return DATA_P[key];
}
const isVerb = (w) => w.p.split('/').includes('v');

/* ---------- phrasal verbs ---------- */
// data/phrasal.js rows: [phrasal, level, thai, example with [verb] and [particles], thai example]
let PHRASAL = null, PV_BY_VERB = null;
const loadPhrasal = () => loadData('data/phrasal.js', 'PHRASAL').then((rows) => {
  if (!PHRASAL) {
    PHRASAL = rows.map(([pv, lv, th, ex, exTh]) => {
      const sp = pv.split(' ');
      return { pv, lv, th, ex, exTh, verb: sp[0], part: sp.slice(1).join(' '), plain: ex.replace(/[[\]]/g, '') };
    });
    PV_BY_VERB = new Map();
    PHRASAL.forEach((r) => { if (!PV_BY_VERB.has(r.verb)) PV_BY_VERB.set(r.verb, []); PV_BY_VERB.get(r.verb).push(r); });
  }
  return PHRASAL;
});
const phrasalOf = (word) => (PV_BY_VERB && PV_BY_VERB.get(word.toLowerCase())) || [];
// Example with the phrasal verb highlighted (both bracket groups).
const pvHTML = (r) => esc(r.ex).replace(/\[([^\]]+)\]/g, '<mark>$1</mark>');
// Three particles that do not make another phrasal verb with the same verb (so only one answer fits).
function pvDistractors(r) {
  const n = r.part.split(' ').length, taken = new Set(phrasalOf(r.verb).map((x) => x.part));
  const pool = [...new Set(PHRASAL.map((x) => x.part))].filter((p) => p.split(' ').length === n && !taken.has(p));
  return shuffle(pool).slice(0, 3);
}
const pvRows = (list, hi) => list.map((r) => `<button class="col-row${r.pv === hi ? ' on' : ''}" data-col="${esc(r.pv)}"><b>${esc(r.pv)}</b><span>${esc(r.th)}</span></button>`).join('');

let pvQuery = '';
function renderPhrasal() {
  if (!PHRASAL) { withLoading(loadPhrasal()).then(renderPhrasal); return; }
  $('#title').textContent = 'Phrasal verbs';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="pvBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="pvPlay">🧩 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${PHRASAL.length} คำ · กริยา + คำเล็กๆ (up, out, off …) ที่รวมกันแล้วได้ความหมายใหม่ เช่น give (ให้) → give up (เลิก) · แตะประโยคเพื่อฟัง</p>
    <input class="search" id="pvq" type="search" placeholder="ค้นหา เช่น look หรือ เลิก" value="${esc(pvQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหา phrasal verb">
    <div class="pair-list" id="pvList"></div>`;
  const paint = () => {
    const q = pvQuery.trim().toLowerCase();
    const list = q ? PHRASAL.filter((r) => r.pv.includes(q) || r.th.includes(q)) : PHRASAL;
    const verbs = [...new Set(list.map((r) => r.verb))].sort();
    $('#pvList').innerHTML = verbs.length ? verbs.map((v) => `<div class="card-box pair-card"><div class="pair-h"><b>${esc(v)}</b> <span class="small muted">${esc(WORD_BY[v] ? thFirst(WORD_BY[v].t) : '')}</span></div>
      ${list.filter((r) => r.verb === v).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span><b>${esc(r.pv)}</b> <span class="lvl-mini">${r.lv}</span> = ${esc(r.th)}</span><span>${pvHTML(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`).join('')}</div>`).join('')
      : emptyArt({ kind: 'search', title: 'ไม่พบ phrasal verb นี้', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#pvq').oninput = (e) => { pvQuery = e.target.value; paint(); };
  $('#pvBack').onclick = () => go('games');
  $('#pvPlay').onclick = () => startGame('phrasal');
  $('#pvList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

/* ---------- word sheet extras ---------- */
// Fills the phrasal-verb and synonym boxes of the word sheet (el) for word w.
function lexisBoxes(el, w) {
  lexis2Boxes(el, w);
  if (isVerb(w)) irregBox(el, w);
  dpBox(el, w);
  gpBox(el, w);
  loadAffix().then(() => {
    const box = el.querySelector('#afBox'), hit = AFFIX_OF.get(w.w.toLowerCase());
    if (box && hit) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧱 ส่วนประกอบคำ</b></div>
      <div class="tip-box" style="margin-top:0"><b>${affixHTML(hit.a, hit.w)}</b> = <b>${affixLabel(hit.a)}</b> (${esc(hit.a.th)}) + ${esc(affixStem(hit.a, hit.w))}</div>
      <div class="small muted" style="margin:10px 0 6px">คำอื่นที่มี ${affixLabel(hit.a)} (แตะเพื่อฟัง)</div>${affixRows(hit.a, hit.w)}`;
  });
  loadSyn().then(() => {
    const box = el.querySelector('#synBox'), gs = synGroups(w.w);
    if (box && gs.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>≈ คำเหมือน–คำตรงข้าม</b> (แตะเพื่อฟัง)</div>${gs.map((g) => synCard(g, w.w.toLowerCase())).join('')}`;
  });
  if (isVerb(w)) {
    loadPhrasal().then(() => {
      const box = el.querySelector('#pvBox'), list = phrasalOf(w.w);
      if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🧩 Phrasal verbs</b> (แตะเพื่อฟัง)</div>${pvRows(list)}`;
    });
  }
  loadIdioms().then(() => {
    const box = el.querySelector('#idBox'), list = idiomsOf(w.w);
    if (box && list.length) box.innerHTML = `<div class="small muted" style="margin:12px 0 6px"><b>🎭 สำนวน</b> (แตะเพื่อฟัง)</div>${idRows(list.slice(0, 8))}`;
  });
}

/* ---------- emoji ---------- */
// data/emoji.js: window.EMOJI = { headword: emoji } for concrete words (picture-guess game, emoji shown on the word sheet).
let EMOJI = null;
const loadEmoji = () => loadData('data/emoji.js', 'EMOJI').then((m) => { EMOJI = Array.isArray(m) ? {} : m; return EMOJI; });
// The word's picture on the back of flashcards, the learn card in the feed and the word sheet (settings.cardEmoji, on by default); '' when there is none or it isn't loaded yet.
const emojiOf = (w) => (S.settings.cardEmoji !== false && EMOJI && EMOJI[w.w]) || '';
const emojiBox = (w) => (emojiOf(w) ? `<div class="card-emoji" role="img" aria-label="ภาพอีโมจิของคำนี้">${emojiOf(w)}</div>` : '');

/* ---------- idioms ---------- */
// data/idioms.js rows: [idiom, level, thai, example with the idiom as used in [brackets], thai example, meaning group?]
let IDIOMS = null, ID_OF = null;
// Words of an idiom that don't link it to the word sheet (too common to be its key word).
const ID_SKIP = new Set("a an the of in on at to for with by up out off and or as than like from into over under is be it its one you your my his her their our someone something that this all every has no not".split(' '));
const loadIdioms = () => loadData('data/idioms.js', 'IDIOMS').then((rows) => {
  if (!IDIOMS) {
    IDIOMS = rows.map(([id, lv, th, ex, exTh, grp]) => ({ id, lv, th, ex, exTh, grp: grp || '', plain: ex.replace(/[[\]]/g, '') }));
    ID_OF = new Map();
    IDIOMS.forEach((r) => new Set(r.id.toLowerCase().replace(/'s\b/g, '').match(/[a-z]+/g)).forEach((t) => {
      if (ID_SKIP.has(t) || !WORD_BY[t]) return;
      if (!ID_OF.has(t)) ID_OF.set(t, []);
      ID_OF.get(t).push(r);
    }));
  }
  return IDIOMS;
});
const idiomsOf = (word) => (ID_OF && ID_OF.get(word.toLowerCase())) || [];
// Example with the idiom highlighted / blanked out.
const idHTML = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<mark>$1</mark>');
const idBlank = (r) => esc(r.ex).replace(/\[([^\]]+)\]/, '<span class="blank">_____</span>');
// Three other idioms, never one from the same meaning group (so only one option fits).
const idDistractors = (r) => shuffle(IDIOMS.filter((x) => x !== r && (!r.grp || x.grp !== r.grp))).slice(0, 3);
const idRows = (list, hi) => list.map((r) => `<button class="col-row${r.id === hi ? ' on' : ''}" data-col="${esc(r.id)}"><b>${esc(r.id)}</b><span>${esc(r.th)}</span></button>`).join('');

let idQuery = '';
function renderIdioms() {
  if (!IDIOMS) { withLoading(loadIdioms()).then(renderIdioms); return; }
  $('#title').textContent = 'สำนวน';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="idBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="idPlay">🎭 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${IDIOMS.length} สำนวน · กลุ่มคำที่แปลตรงตัวไม่ได้ ต้องจำทั้งก้อน เช่น piece of cake = ง่ายมาก · แตะประโยคเพื่อฟัง</p>
    <input class="search" id="idq" type="search" placeholder="ค้นหา เช่น ice หรือ ง่าย" value="${esc(idQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาสำนวน">
    <div class="pair-list" id="idList"></div>`;
  const paint = () => {
    const q = idQuery.trim().toLowerCase();
    const list = q ? IDIOMS.filter((r) => r.id.includes(q) || r.th.includes(q)) : IDIOMS;
    const lvs = ['A1', 'A2', 'B1', 'B2', 'C1'].filter((l) => list.some((r) => r.lv === l));
    $('#idList').innerHTML = lvs.length ? lvs.map((l) => `<div class="card-box pair-card"><div class="pair-h"><b>${l}</b> <span class="small muted">${list.filter((r) => r.lv === l).length} สำนวน</span></div>
      ${list.filter((r) => r.lv === l).map((r) => `<button class="pair-ex" data-say="${esc(r.plain)}"><span><b lang="en">${esc(r.id)}</b> = ${esc(r.th)}</span><span lang="en">${idHTML(r)}</span><small class="muted">${esc(r.exTh)}</small></button>`).join('')}</div>`).join('')
      : emptyArt({ kind: 'search', title: 'ไม่พบสำนวนนี้', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#idq').oninput = (e) => { idQuery = e.target.value; paint(); };
  $('#idBack').onclick = () => go('games');
  $('#idPlay').onclick = () => startGame('idiom');
  $('#idList').onclick = (e) => { const b = e.target.closest('[data-say]'); if (b) speak(b.dataset.say); };
}

/* ---------- situations ---------- */
// data/situations.js: [{ id, icon, th, en, tip, w: [[phrase, thai]], d: [[speaker, english, thai]] }]
let SIT = null;
const loadSit = () => loadData('data/situations.js', 'SITUATIONS').then((rows) => (SIT = rows));
// Item for the reply game: line k of a dialogue (k >= 1), answered after seeing line k − 1.
const sitItems = () => SIT.flatMap((st) => st.d.slice(1).map((l, k) => ({ st, k: k + 1 })));
// Three lines from other situations' dialogues as wrong replies.
const sitDistractors = (st) => shuffle(SIT.filter((x) => x !== st).flatMap((x) => x.d.slice(1).map((l) => l[1]))).slice(0, 3);

let sitPlayTok = 0;
function renderSit(id) {
  if (!SIT) { withLoading(loadSit()).then(() => renderSit(id)); return; }
  sitPlayTok++;
  const st = id && SIT.find((x) => x.id === id);
  view.scrollTop = 0;
  if (!st) {
    $('#title').textContent = 'ศัพท์ตามสถานการณ์';
    view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="sitBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="sitPlay">🗨️ เล่นเกม</button></div>
      <p class="small muted" style="margin:0 4px 10px">${SIT.length} สถานการณ์ที่เจอบ่อย แต่ละเรื่องมีคำ/วลีสำคัญและบทสนทนาสั้นๆ ให้ฟังและพูดตาม</p>
      <div class="sit-grid" id="sitList">${SIT.map((x) => `<button class="sit-tile" data-sit="${x.id}"><span class="sit-ic">${x.icon}</span><b>${esc(x.th)}</b><small class="muted" lang="en">${esc(x.en)}</small></button>`).join('')}</div>`;
    $('#sitBack').onclick = () => go('games');
    $('#sitPlay').onclick = () => startGame('sit');
    $('#sitList').onclick = (e) => { const b = e.target.closest('[data-sit]'); if (b) renderSit(b.dataset.sit); };
    return;
  }
  $('#title').textContent = `${st.icon} ${st.th}`;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="sitBack">‹ สถานการณ์</button><div class="grow"></div><button class="btn primary" id="sitAll">▶️ ฟังบทสนทนา</button></div>
    <div class="card-box"><div class="h2" style="margin:0 0 2px">${st.icon} ${esc(st.th)}</div><div class="small muted" lang="en">${esc(st.en)}</div>
      <div class="tip-box">💡 ${esc(st.tip)}</div></div>
    <div class="card-box"><div class="small muted" style="margin-bottom:8px"><b>🔑 คำและวลีสำคัญ</b> (แตะเพื่อฟัง)</div>
      ${st.w.map(([en, th]) => `<button class="col-row" data-col="${esc(en)}"><b lang="en">${esc(en)}</b><span>${esc(th)}</span></button>`).join('')}</div>
    <div class="card-box"><div class="small muted" style="margin-bottom:4px"><b>🗨️ บทสนทนา</b> (แตะประโยคเพื่อฟัง)</div>
      <div id="sitDlg">${st.d.map(([who, en, th], k) => `<button class="dlg-line${k % 2 ? ' alt' : ''}" data-k="${k}"><small class="muted">${esc(who)}</small><span lang="en">${esc(en)}</span><small class="muted">${esc(th)}</small></button>`).join('')}</div></div>
    <button class="btn primary block" id="sitRole">🎭 ฝึกพูดบทบาทสมมติ</button>`;
  $('#sitBack').onclick = () => renderSit();
  $('#sitRole').onclick = () => renderRole(st);
  view.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => speak(b.dataset.col)));
  const lines = [...view.querySelectorAll('.dlg-line')];
  const on = (k) => lines.forEach((b, j) => b.classList.toggle('on', j === k));
  $('#sitDlg').onclick = (e) => { const b = e.target.closest('.dlg-line'); if (b) { sitPlayTok++; on(+b.dataset.k); speak(st.d[+b.dataset.k][1]); } };
  // Whole dialogue: one line after another (a new tap, another page or leaving stops it).
  $('#sitAll').onclick = () => {
    const tok = ++sitPlayTok;
    const step = (k) => {
      if (tok !== sitPlayTok || !document.body.contains(lines[0]) || k >= st.d.length) { if (tok === sitPlayTok) on(-1); return; }
      on(k);
      const u = speak(st.d[k][1]);
      if (u) { u.onend = () => setTimeout(() => step(k + 1), 400); u.onerror = () => { if (tok === sitPlayTok) on(-1); }; } else on(-1);
    };
    step(0);
  };
}

/* ---------- role play (1.103) ---------- */
// Pick one side of a situation's dialogue; the app speaks the other side's lines and you say yours (checked with sentenceMatch,
// 3 tries per line). Without speech recognition (canListen false) it is repeat-after-me: say it aloud, tap ✅. Hide-text mode shows only the Thai.
let roleHide = false;
function renderRole(st, me) {
  const tok = ++sitPlayTok; // also stops the dialogue player and any earlier role play
  view.scrollTop = 0;
  const roles = [...new Set(st.d.map((l) => l[0]))];
  const back = () => renderSit(st.id);
  if (me == null) {
    $('#title').textContent = `🎭 ${st.th}`;
    view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="roleBack">‹ ${esc(st.th)}</button></div>
      <div class="card-box center"><div class="result-emoji" aria-hidden="true">🎭</div><div class="h2" style="margin:2px 0">ฝึกพูดบทบาทสมมติ</div>
        <p class="small muted">เลือกว่าคุณเป็นใคร แอปจะพูดบทของอีกฝ่าย แล้วถึงตาคุณพูด${canListen ? ' (ระบบฟังเสียงตรวจให้)' : ' (เครื่องนี้ฟังเสียงไม่ได้ พูดออกเสียงเองแล้วแตะ ✅)'}</p>
        <div class="chips" id="roleWho" style="justify-content:center">${roles.map((r) => `<button class="chip" data-who="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>
      <div class="set-row"><span>ซ่อนข้อความของฉัน<br><span class="small muted">เห็นแค่คำแปลไทย ต้องนึกประโยคเอง (แตะดูใบ้ได้)</span></span>
        <label class="switch"><input type="checkbox" id="roleHide" aria-label="ซ่อนข้อความของฉัน" ${roleHide ? 'checked' : ''}><span></span></label></div>`;
    $('#roleBack').onclick = back;
    $('#roleHide').onchange = (e) => { roleHide = e.target.checked; };
    $('#roleWho').onclick = (e) => { const b = e.target.closest('[data-who]'); if (b) renderRole(st, b.dataset.who); };
    return;
  }
  const res = [];
  let rec = null;
  const alive = () => tok === sitPlayTok && document.getElementById('roleBox');
  const stop = () => { if (rec) { try { rec.abort(); } catch (e) { /* ignore */ } rec = null; } };
  cleanup = stop;
  const bubbles = (k) => st.d.slice(Math.max(0, k - 3), k).map(([who, en, th], j) => `<div class="dlg-line${who === me ? ' me' : ''}"><small class="muted">${esc(who)}</small><span lang="en">${esc(en)}</span><small class="muted">${esc(th)}</small></div>`).join('');
  const frame = (k, inner) => {
    $('#title').textContent = `🎭 ${st.th} · ${k + 1}/${st.d.length}`;
    view.innerHTML = `<div id="roleBox"><div class="session-top"><button class="icon-btn" id="roleBack" aria-label="ออก">✕</button>
      <div class="progress"><div style="width:${k / st.d.length * 100}%"></div></div><span class="small">คุณคือ <b>${esc(me)}</b></span></div>
      <div class="role-log">${bubbles(k)}</div>${inner}</div>`;
    $('#roleBack').onclick = () => { stop(); sitPlayTok++; back(); };
  };
  const step = (k) => {
    stop();
    if (!alive() && k > 0) return;
    if (k >= st.d.length) return finish();
    const [who, en, th] = st.d[k];
    if (who !== me) { // the app's line
      frame(k, `<div class="dlg-line cur"><small class="muted">${esc(who)}</small><span lang="en">${esc(en)}</span><small class="muted">${esc(th)}</small></div><div class="center small muted" style="margin-top:8px">🔊 กำลังฟัง…</div><button class="btn block" id="roleSkip" style="margin-top:10px">ข้าม ▶</button>`);
      let moved = false;
      const go1 = () => { if (!moved && alive()) { moved = true; setTimeout(() => step(k + 1), 350); } };
      $('#roleSkip').onclick = () => { moved = true; if (window.speechSynthesis) speechSynthesis.cancel(); step(k + 1); };
      const u = speak(en);
      if (u) { u.onend = go1; u.onerror = go1; } else setTimeout(go1, 1200);
      return;
    }
    let tries = 0, shown = !roleHide, over = false;
    const paint = () => {
      frame(k, `<div class="card-box q-prompt pop"><div class="small muted">ถึงตาคุณแล้ว 🎤 พูดว่า…</div>
        <div class="th" style="margin-top:6px">${esc(th)}</div>
        <div class="cloze" lang="en" id="roleEn" style="margin-top:8px" ${shown ? '' : 'hidden'}>${esc(en)}</div>
        ${shown ? '' : '<button class="hint-btn" id="roleShow">👁 ดูใบ้ประโยค</button>'}<button class="hint-btn" id="roleHear">🔊 ฟังตัวอย่าง</button></div>
        ${canListen ? '<div class="center"><button class="mic" id="mic" aria-label="กดแล้วพูด">🎤</button></div>' : '<button class="btn primary block" id="roleDone" style="margin-top:10px">✅ พูดแล้ว ไปต่อ</button>'}
        <div class="center small muted" id="heard">${canListen ? 'แตะไมค์แล้วพูดประโยคนี้' : 'พูดออกเสียงตามเอง แล้วแตะปุ่ม'}</div>
        <button class="btn block" id="roleGive" style="margin-top:12px">ข้าม / เฉลย</button><div class="reveal" id="reveal" aria-live="polite"></div>`);
      if ($('#roleShow')) $('#roleShow').onclick = () => { shown = true; paint(); };
      $('#roleHear').onclick = () => speak(en);
      $('#roleGive').onclick = () => fin(false);
      if ($('#roleDone')) $('#roleDone').onclick = () => fin(true);
      if ($('#mic')) $('#mic').onclick = listen;
    };
    const fin = (ok) => {
      if (over) return; over = true; stop();
      res.push({ k, ok, tries });
      if (ok) { addXP(2); markActive(); }
      const rv = $('#reveal');
      rv.innerHTML = (ok ? '✅ เยี่ยมเลย!' : `👂 ประโยคนี้คือ <b lang="en">${esc(en)}</b>`) + `<button class="btn primary block" id="roleNext" style="margin-top:12px">ถัดไป →</button>`;
      $('#roleNext').onclick = () => step(k + 1);
      $('#roleGive').remove(); if ($('#mic')) $('#mic').disabled = true; if ($('#roleDone')) $('#roleDone').remove();
      if (!ok) speak(en); else setTimeout(() => { if (alive() && res.length && res[res.length - 1].k === k) step(k + 1); }, 1100);
    };
    const listen = () => {
      if (over) return;
      if (rec) { rec.stop(); return; }
      if (window.speechSynthesis) speechSynthesis.cancel();
      const mic = $('#mic'), heard = $('#heard');
      rec = new SR(); rec.lang = S.settings.accent; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
      mic.classList.add('on'); heard.textContent = 'กำลังฟัง... พูดได้เลย';
      rec.onresult = (e) => {
        const alts = Array.from(e.results[0]).map((a) => a.transcript);
        if (alts.some((a) => sentenceMatch(a, en))) { tries++; return fin(true); }
        tries++;
        heard.innerHTML = `ได้ยินว่า "<b>${esc(alts[0] || '')}</b>" ลองอีกครั้งนะ 💪 (${tries}/3)`;
        mic.classList.remove('no'); void mic.offsetWidth; mic.classList.add('no');
        if (tries >= 3) fin(false);
      };
      rec.onerror = (e) => { heard.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์/การรู้จำเสียง ลองเปิดในตั้งค่า iPhone ดูนะ' : 'ไม่ได้ยินเสียง แตะไมค์แล้วลองอีกครั้งนะ'; };
      rec.onend = () => { rec = null; if (mic) mic.classList.remove('on'); };
      try { rec.start(); } catch (err) { rec = null; mic.classList.remove('on'); heard.textContent = 'เปิดไมค์ไม่ได้ ลองอีกครั้งนะ'; }
    };
    paint();
  };
  const finish = () => {
    const ok = res.filter((r) => r.ok).length, n = res.length;
    S.counts.role = (S.counts.role || 0) + 1; save();
    if (n && ok === n) confetti();
    $('#title').textContent = `🎭 ${st.th}`;
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${!n ? '🎭' : ok === n ? '🏆' : ok >= n / 2 ? '🎉' : '💪'}</div>
        <div class="h2">${n ? `พูดได้ ${ok}/${n} ประโยค` : 'จบบทสนทนาแล้ว'}</div><p class="small muted">คุณเป็น ${esc(me)} · ${esc(st.th)}</p></div>
      ${res.some((r) => !r.ok) ? `<div class="card-box wrong-list"><b>ประโยคที่ควรฝึกอีก</b> <span class="small muted">(แตะเพื่อฟัง)</span>
        ${res.filter((r) => !r.ok).map((r) => `<button class="col-row" data-col="${esc(st.d[r.k][1])}"><b lang="en">${esc(st.d[r.k][1])}</b><span>${esc(st.d[r.k][2])}</span></button>`).join('')}</div>` : ''}
      <button class="btn primary block" id="roleAgain">เล่นอีกรอบ (บทเดิม)</button><div style="height:10px"></div>
      <button class="btn block" id="roleSwap">สลับบท</button><div style="height:10px"></div><button class="btn block" id="roleBack">‹ กลับ</button>`;
    view.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => speak(b.dataset.col)));
    $('#roleAgain').onclick = () => renderRole(st, me);
    $('#roleSwap').onclick = () => renderRole(st);
    $('#roleBack').onclick = back;
  };
  step(0);
}

/* ---------- synonyms & antonyms ---------- */
// data/synonyms.js: [{ th, s: [near-synonyms], a: [antonyms], tip }]; a word may be in several groups.
let SYN = null, SYN_OF = null;
const loadSyn = () => loadData('data/synonyms.js', 'SYNONYMS').then((rows) => {
  if (!SYN) {
    SYN = rows; SYN_OF = new Map();
    SYN.forEach((g) => g.s.forEach((x) => { if (!SYN_OF.has(x)) SYN_OF.set(x, []); SYN_OF.get(x).push(g); }));
  }
  return SYN;
});
const synGroups = (word) => (SYN_OF && SYN_OF.get(word.toLowerCase())) || [];
// Every listed synonym / antonym of a word over all its groups, plus words that list it as their antonym.
function synRel(word) {
  const gs = synGroups(word), syn = new Set(), ant = new Set();
  gs.forEach((g) => { g.s.forEach((x) => syn.add(x)); g.a.forEach((x) => ant.add(x)); });
  SYN.forEach((g) => { if (g.a.includes(word)) g.s.forEach((x) => ant.add(x)); });
  syn.delete(word);
  return { syn, ant };
}
// One question per (group, word): kind 's' = pick the near-synonym, 'a' = pick the opposite.
function synItems() {
  const out = [];
  SYN.forEach((g) => g.s.forEach((t) => {
    if (g.s.length >= 2) out.push({ g, t, kind: 's' });
    if (g.a.length) out.push({ g, t, kind: 'a' });
  }));
  return out;
}
// Options for a synonym/antonym question: the answer, one "trap" from the other relation, the rest unrelated.
function synQuestion(it) {
  const { syn, ant } = synRel(it.t);
  const answer = pick(it.kind === 's' ? it.g.s.filter((x) => x !== it.t) : it.g.a);
  const trapPool = [...(it.kind === 's' ? ant : syn)];
  const opts = [answer];
  if (trapPool.length) opts.push(pick(trapPool));
  const bad = new Set([it.t, ...(it.kind === 's' ? syn : ant)]);
  const all = shuffle([...new Set(SYN.flatMap((g) => g.s))]);
  for (const x of all) { if (opts.length >= 4) break; if (!bad.has(x) && !opts.includes(x)) opts.push(x); }
  return { answer, opts: shuffle(opts) };
}
const synChips = (list) => list.map((x) => `<button class="chip" data-col="${esc(x)}">${esc(x)}</button>`).join('');
const synCard = (g, hi) => `<div class="syn-g"><div class="small muted"><b>${esc(g.th)}</b></div>
  <div class="chips">${g.s.map((x) => `<button class="chip${x === hi ? ' on' : ''}" data-col="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  ${g.a.length ? `<div class="small muted" style="margin-top:6px">↔ ตรงข้าม</div><div class="chips">${synChips(g.a)}</div>` : ''}
  <div class="tip-box">💡 ${esc(g.tip)}</div></div>`;

let synQuery = '';
function renderSyn() {
  if (!SYN) { withLoading(loadSyn()).then(renderSyn); return; }
  $('#title').textContent = 'คำเหมือน–คำตรงข้าม';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="synBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="synPlay">≈ เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">${SYN.length} กลุ่มคำความหมายใกล้เคียง พร้อมคำตรงข้ามและวิธีเลือกใช้ · แตะคำเพื่อฟังและดูการ์ดคำ</p>
    <input class="search" id="synq" type="search" placeholder="ค้นหา เช่น big หรือ ใหญ่" value="${esc(synQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาคำเหมือน">
    <div class="pair-list" id="synList"></div>`;
  const paint = () => {
    const q = synQuery.trim().toLowerCase();
    const list = q ? SYN.filter((g) => g.th.includes(q) || g.s.some((x) => x.includes(q)) || g.a.some((x) => x.includes(q))) : SYN;
    $('#synList').innerHTML = list.length ? list.map((g) => `<div class="card-box pair-card">${synCard(g)}</div>`).join('') : emptyArt({ kind: 'search', title: 'ไม่พบคำนี้', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#synq').oninput = (e) => { synQuery = e.target.value; paint(); };
  $('#synBack').onclick = () => go('games');
  $('#synPlay').onclick = () => startGame('syn');
  $('#synList').onclick = (e) => {
    const b = e.target.closest('[data-col]'); if (!b) return;
    speak(b.dataset.col);
    const w = WORD_BY[b.dataset.col]; if (w) openSheet(w);
  };
}

/* ---------- word parts (prefixes / suffixes) ---------- */
// data/affixes.js: [{ x, k: 'p'|'s', th, note, ex: [[word, thai], ...] }]
let AFFIX = null, AFFIX_OF = null;
const loadAffix = () => loadData('data/affixes.js', 'AFFIXES').then((rows) => {
  if (!AFFIX) {
    AFFIX = rows; AFFIX_OF = new Map();
    AFFIX.forEach((a) => a.ex.forEach(([w, th]) => AFFIX_OF.set(w, { a, w, th })));
  }
  return AFFIX;
});
const affixLabel = (a) => (a.k === 'p' ? a.x + '-' : '-' + a.x);
const affixStem = (a, w) => (a.k === 'p' ? w.slice(a.x.length) : w.slice(0, -a.x.length));
const affixJoin = (a, stem) => (a.k === 'p' ? a.x + stem : stem + a.x);
// Word split into base + highlighted affix, e.g. un|happy.
const affixHTML = (a, w) => (a.k === 'p' ? `<mark>${esc(a.x)}</mark>${esc(affixStem(a, w))}` : `${esc(affixStem(a, w))}<mark>${esc(a.x)}</mark>`);
// Affixes of the same kind that do not make a real word with this base (so only one answer fits).
function affixDistractors(a, w) {
  const stem = affixStem(a, w);
  const real = (x) => AFFIX_OF.has(x) || WORD_BY[x];
  return shuffle(AFFIX.filter((b) => b.k === a.k && b.x !== a.x && !real(affixJoin(b, stem)))).slice(0, 3);
}
const affixRows = (a, hi) => a.ex.map(([w, th]) => `<button class="col-row${w === hi ? ' on' : ''}" data-col="${esc(w)}"><b>${affixHTML(a, w)}</b><span>${esc(th)}</span></button>`).join('');

let affixQuery = '';
function renderAffix() {
  if (!AFFIX) { withLoading(loadAffix()).then(renderAffix); return; }
  $('#title').textContent = 'อุปสรรค–ปัจจัย';
  view.scrollTop = 0;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="afBack">‹ กลับ</button><div class="grow"></div><button class="btn primary" id="afPlay">🧱 เล่นเกม</button></div>
    <p class="small muted" style="margin:0 4px 10px">รู้ความหมายของส่วนหน้า (prefix) และส่วนท้ายคำ (suffix) แล้วเดาความหมายคำใหม่ได้เอง เช่น un- (ไม่) + happy = ไม่มีความสุข · แตะคำเพื่อฟัง</p>
    <input class="search" id="afq" type="search" placeholder="ค้นหา เช่น un หรือ ful หรือ ไม่" value="${esc(affixQuery)}" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="ค้นหาอุปสรรคและปัจจัย">
    <div id="afList"></div>`;
  const paint = () => {
    const q = affixQuery.trim().toLowerCase().replace(/-/g, '');
    const hit = (a) => !q || a.x.includes(q) || a.th.includes(q) || a.ex.some(([w, th]) => w.includes(q) || th.includes(q));
    const part = (k, h) => { const list = AFFIX.filter((a) => a.k === k && hit(a)); return list.length ? `<div class="h2">${h}</div><div class="pair-list">${list.map((a) => `<div class="card-box pair-card"><div class="pair-h"><b class="af-x">${affixLabel(a)}</b> <span>= ${esc(a.th)}</span></div>
      ${a.note ? `<div class="small muted" style="margin:4px 0 6px">${esc(a.note)}</div>` : ''}${affixRows(a)}</div>`).join('')}</div>` : ''; };
    const html = part('p', '⬅️ อุปสรรค (prefix) — เติมหน้าคำ') + part('s', '➡️ ปัจจัย (suffix) — เติมท้ายคำ');
    $('#afList').innerHTML = html || emptyArt({ kind: 'search', title: 'ไม่พบ', sub: 'ลองพิมพ์ให้สั้นลง หรือเปลี่ยนตัวกรอง', sm: true });
  };
  paint();
  $('#afq').oninput = (e) => { affixQuery = e.target.value; paint(); };
  $('#afBack').onclick = () => go('games');
  $('#afPlay').onclick = () => startGame('affix');
  $('#afList').onclick = (e) => { const b = e.target.closest('[data-col]'); if (b) speak(b.dataset.col); };
}

/* ---------- numbers (generated listening practice) ---------- */
// No data file: each round builds its own numbers, prices, times, dates and phone numbers (so no SRS key, see GEN_GAMES).
const NUM_ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const NUM_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const NUM_ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
const NUM_MONTHS = 'January February March April May June July August September October November December'.split(' ');
const NUM_MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const NUM_SIM_MONTH = { June: 'July', July: 'June', March: 'May', May: 'March', April: 'August', August: 'April', September: 'November', November: 'September' };
const NUM_KINDS = { n: 'ตัวเลข', p: 'ราคา', t: 'เวลา', d: 'วันที่', ph: 'เบอร์โทร' };
const NUM_TIPS = {
  n: '-teen กับ -ty ฟังคล้ายกัน: thir<b>TEEN</b> (13) เน้นพยางค์หลัง ส่วน <b>THIR</b>ty (30) เน้นพยางค์แรกและเสียง t ท้ายสั้นกว่า',
  p: 'ราคาอ่านเป็น “ดอลลาร์ + เซนต์” เช่น $12.50 = twelve dollars fifty หรือ twelve fifty (ไม่ต้องพูดคำว่า point)',
  t: 'quarter past = +15 นาที · half past = 30 นาที · quarter to eight = 7:45 (อีก 15 นาทีจะ 8 โมง) · ten to = ก่อนชั่วโมงถัดไป 10 นาที',
  d: 'วันที่อ่านเป็นเลขลำดับ (third ไม่ใช่ three) และเรียงได้ 2 แบบ: the third of May / May the third · thirteenth = 13, thirtieth = 30',
  ph: 'เบอร์โทรอ่านทีละหลัก เลข 0 อ่านว่า oh หรือ zero และตัวซ้ำติดกันอ่านว่า double (55 = double five)',
};
function numWords(n) {
  if (n < 20) return NUM_ONES[n];
  if (n < 100) return NUM_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + NUM_ONES[n % 10] : '');
  return NUM_ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numWords(n % 100) : '');
}
function ordWords(n) {
  const parts = numWords(n).split('-'), last = parts.pop();
  const o = NUM_ORD[last] || (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th');
  return [...parts, o].join('-');
}
// thirteen ↔ thirty style twin: 13–19 → 30–90, 30–90 (tens) → 13–19, else 0.
const numTwin = (t) => (t >= 13 && t <= 19 ? (t - 10) * 10 : t >= 30 && t % 10 === 0 ? t / 10 + 10 : 0);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// The three wrong options: the likely mix-ups first (`cands`), then `fill` so there are always three distinct ones.
function numOpts(right, cands, fill) {
  const out = [];
  for (const c of cands.concat(fill)) if (c !== right && !out.includes(c)) { out.push(c); if (out.length === 3) break; }
  return out;
}
function numItem(kind) {
  let say, right, cands = [], fill = [];
  if (kind === 'n') {
    const roll = Math.random();
    const tail = roll < 0.35 ? rint(13, 19) : roll < 0.7 ? rint(3, 9) * 10 : rint(2, 9) * 10 + rint(1, 9);
    const v = (Math.random() < 0.25 ? rint(1, 9) * 100 : 0) + tail, h = v - tail;
    right = String(v); say = numWords(v);
    const add = (x) => x > 0 && cands.push(String(x));
    if (numTwin(tail)) add(h + numTwin(tail));
    if (tail >= 10 && tail % 11) add(h + (tail % 10) * 10 + Math.floor(tail / 10));
    add(v + 10); add(v - 10); add(v + 1); add(v - 1);
    fill = [2, 3, 4, 5, 6, 7].map((k) => String(v + k * 11));
  } else if (kind === 'p') {
    const roll = Math.random();
    const d = roll < 0.4 ? rint(13, 19) : roll < 0.7 ? rint(3, 9) * 10 : rint(2, 99);
    const c = pick([0, 15, 50, 25, 75, 45, 95, 60, 30, 99]);
    const P = (dd, cc) => '$' + dd + (cc ? '.' + String(cc).padStart(2, '0') : '');
    right = P(d, c);
    say = numWords(d) + (c ? (Math.random() < 0.5 ? ' dollars ' : ' ') + numWords(c) : ' dollars');
    if (numTwin(d)) cands.push(P(numTwin(d), c));
    if (c && numTwin(c)) cands.push(P(d, numTwin(c)));
    cands.push(P(d + 1, c), P(Math.max(1, d - 1), c), P(d, c === 50 ? 15 : 50));
    fill = [P(d + 2, c), P(d + 10, c), P(d, 25), P(d, 75), P(d + 3, 0), P(d + 20, c)];
  } else if (kind === 'd') {
    const mo = rint(0, 11), md = NUM_MDAYS[mo];
    const roll = Math.random();
    const day = roll < 0.4 ? rint(13, 19) : roll < 0.5 && md >= 30 ? 30 : rint(1, md);
    const M = NUM_MONTHS[mo];
    const D = (dd, mm) => (dd >= 1 && dd <= NUM_MDAYS[mm] ? `${dd} ${NUM_MONTHS[mm]}` : null);
    right = D(day, mo);
    const o = ordWords(day), r = Math.random();
    say = r < 0.34 ? `the ${o} of ${M}` : r < 0.67 ? `${M} the ${o}` : `${M} ${o}`;
    const sim = NUM_MONTHS.indexOf(NUM_SIM_MONTH[M]);
    cands = [day === 13 ? D(30, mo) : day === 30 ? D(13, mo) : null, day >= 13 && day <= 19 ? D(day - 10, mo) : D(day + 10, mo), sim >= 0 ? D(day, sim) : null,
      D(day + 1, mo), D(day - 1, mo), D(day, (mo + 1) % 12), D(day, (mo + 11) % 12)].filter(Boolean);
    fill = [D(day + 2, mo), D(day + 3, mo), D(day, (mo + 5) % 12), D(Math.max(1, day - 2), mo), D(1, mo), D(2, mo), D(4, mo)].filter(Boolean);
  } else if (kind === 't') {
    const h = rint(1, 12), nx = h % 12 + 1, m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]), alt = Math.random() < 0.5;
    const T = (hh, mm) => ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0');
    right = T(h, m);
    say = m === 0 ? `${numWords(h)} o'clock`
      : m === 30 ? (alt ? `half past ${numWords(h)}` : `${numWords(h)} thirty`)
      : m === 15 ? (alt ? `quarter past ${numWords(h)}` : `${numWords(h)} fifteen`)
      : m === 45 ? (alt ? `quarter to ${numWords(nx)}` : `${numWords(h)} forty-five`)
      : m < 30 ? (alt ? `${numWords(m)} past ${numWords(h)}` : `${numWords(h)} ${m < 10 ? 'oh ' : ''}${numWords(m)}`)
      : (alt ? `${numWords(60 - m)} to ${numWords(nx)}` : `${numWords(h)} ${numWords(m)}`);
    if (m === 15) cands.push(T(h, 50)); if (m === 50) cands.push(T(h, 15));
    if (m === 45) cands.push(T(nx, 45), T(h, 15));
    if (m === 15) cands.push(T(nx, 15), T(h, 45));
    cands.push(T(h + 1, m), T(h - 1, m), T(h, (m + 5) % 60), T(h, (m + 55) % 60));
    fill = [T(h, (m + 10) % 60), T(h + 2, m), T(h, (m + 20) % 60), T(h, (m + 35) % 60), T(h + 3, m)];
  } else {
    const dg = Array.from({ length: 6 }, () => rint(0, 9));
    const fmt = (a) => a.slice(0, 3).join('') + '-' + a.slice(3).join('');
    const name = (x) => (x === 0 ? (Math.random() < 0.5 ? 'oh' : 'zero') : NUM_ONES[x]);
    const spell = (a) => { const o = []; for (let k = 0; k < a.length; k++) { if (k + 1 < a.length && a[k] === a[k + 1]) { o.push('double ' + name(a[k])); k++; } else o.push(name(a[k])); } return o.join(' '); };
    right = fmt(dg);
    say = spell(dg.slice(0, 3)) + ', ' + spell(dg.slice(3));
    const swap = (k) => { const a = dg.slice(); [a[k], a[k + 1]] = [a[k + 1], a[k]]; return fmt(a); };
    const chg = (k, by) => { const a = dg.slice(); a[k] = (a[k] + by) % 10; return fmt(a); };
    cands = [swap(4), swap(1), swap(2), swap(0), chg(5, 1), chg(4, 1)];
    fill = [0, 1, 2, 3, 4, 5].map((k) => chg(k, 3));
  }
  return { idx: -1, w: right, t: NUM_KINDS[kind], p: '', g: '', _num: { kind, say, right, opts: numOpts(right, cands, fill) }, _q: [say, right, '', say] };
}
const numItems = (n = 40) => shuffle(Array.from({ length: n }, (_, k) => numItem(['n', 'p', 't', 'd', 'n', 'ph', 't', 'p', 'd', 'n'][k % 10])));
