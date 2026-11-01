'use strict';
// Making sentences (1.122, single player):
//  · 🖼️ เล่าภาพ (route `pic`): 3 pictures of list words; write one English sentence that uses at least 2 of them (4+ words).
//    2 used = +5 coins, all 3 = +10; the last sentences are kept in S.pics = [{ t: text, w: [words], d: date }] (cleanPics / merge in app.js).
//  · 🧱 ต่อประโยค (route `build`, `runBuild()`): rebuild example sentences from word chips with 2 decoy chips mixed in, 5 a round, +2 coins each.
//  · 🌙 bedtime listening tile (earBedtime() lives in js/ear.js).
// Classic script sharing globals with app.js.

/* ---------- picture story ---------- */
const PIC_N = 3, PIC_MAX = 30;
let picSet = null;
function picPool() {
  const seen = new Set(), all = W.filter((w) => EMOJI && EMOJI[w.w] && !/\s/.test(w.w) && !seen.has(w.w) && seen.add(w.w));
  const known = all.filter((w) => S.prog[w.w]);
  return known.length >= 12 ? known : all.filter((w) => S.settings.levels.includes(w.g)).length >= 12 ? all.filter((w) => S.settings.levels.includes(w.g)) : all;
}
// Which of the picture words a sentence uses (any simple form: cats, played … via lookupWord).
function picUsed(text, words) {
  const toks = (text.match(/[A-Za-z][A-Za-z']*/g) || []);
  return { n: toks.length, used: words.filter((w) => toks.some((t) => t.toLowerCase() === w.w || lookupWord(t) === w)) };
}
function renderPic() {
  if (!EMOJI) { withLoading(loadEmoji()).then(() => { if (current === 'pic') renderPic(); }); return; }
  if (!picSet) picSet = shuffle(picPool()).slice(0, PIC_N);
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="pcBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center"><div class="h2" style="margin:2px 0">🖼️ เล่าภาพเป็นประโยค</div><p class="small muted">เขียนประโยคภาษาอังกฤษ 1 ประโยค ใช้คำจากภาพอย่างน้อย 2 คำ (ใช้ครบ 3 คำได้เหรียญมากกว่า)</p>
      <div class="pic-row">${picSet.map((w, k) => `<button class="pic-card" data-pk="${k}" aria-label="ภาพที่ ${k + 1} แตะเพื่อดูคำ"><span aria-hidden="true">${EMOJI[w.w]}</span><small lang="en" hidden>${esc(w.w)}</small></button>`).join('')}</div>
      <p class="small muted">แตะภาพเพื่อดูคำและฟังเสียง</p></div>
    <form id="pcForm" class="card-box"><textarea id="pcIn" class="search" rows="3" lang="en" autocapitalize="sentences" spellcheck="true" placeholder="เช่น The cat is sleeping on the bed." aria-label="ประโยคของคุณ"></textarea>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn primary grow" type="submit">✅ ตรวจ</button><button class="btn" type="button" id="pcNew">🔀 ภาพใหม่</button></div><div class="small" id="pcMsg" aria-live="polite" style="margin-top:8px"></div></form>
    <div class="h2">📝 ประโยคของฉัน</div><div class="card-box">${(S.pics || []).slice(0, 10).map((p) => `<div class="pic-hist"><span lang="en" class="en">${esc(p.t)}</span><span class="small muted">${p.w.map((w) => (EMOJI[w] || '')).join('')}</span></div>`).join('') || '<p class="small muted">ยังไม่มี ลองเขียนประโยคแรกดูนะ</p>'}</div>`;
  $('#pcBack').onclick = () => go('fun');
  $('#pcNew').onclick = () => { picSet = null; renderPic(); };
  view.querySelector('.pic-row').onclick = (e) => { const b = e.target.closest('[data-pk]'); if (!b) return; const w = picSet[+b.dataset.pk]; b.querySelector('small').hidden = false; speak(w.w); toast(`${w.w} = ${thFirst(w.t)}`); };
  $('#pcForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('#pcIn').value.trim().replace(/\s+/g, ' '), r = picUsed(t, picSet);
    if (r.n < 4) return ($('#pcMsg').textContent = '✏️ เขียนให้ยาวขึ้นอีกนิด (อย่างน้อย 4 คำ)');
    if (r.used.length < 2) return ($('#pcMsg').innerHTML = `🤔 ใช้คำจากภาพไป ${r.used.length} คำ ต้องใช้อย่างน้อย 2 คำ (${picSet.map((w) => `<b lang="en">${esc(w.w)}</b>`).join(', ')})`);
    const coins = r.used.length >= 3 ? 10 : 5;
    S.pics = [{ t: t.slice(0, 200), w: r.used.map((w) => w.w), d: today() }, ...(S.pics || [])].slice(0, PIC_MAX);
    S.counts.pics = (S.counts.pics || 0) + 1;
    addCoins(coins); addXP(5); markActive(); funEvent('pic'); sfx('win'); if (r.used.length >= 3) confetti();
    save(); picSet = null; renderPic();
    toast(`🖼️ เยี่ยม! ใช้คำจากภาพ ${r.used.length} คำ +🪙 ${coins}`);
  };
}

/* ---------- sentence builder ---------- */
const BUILD_N = 5, BUILD_COINS = 2;
const buildRun = {};
function buildItems() {
  const ok = (w) => w.e && w.e.split(/\s+/).length >= 4 && w.e.split(/\s+/).length <= 10;
  const known = W.filter((w) => S.prog[w.w] && ok(w)), lv = W.filter((w) => S.settings.levels.includes(w.g) && ok(w));
  return shuffle(known.length >= 20 ? known : lv).slice(0, BUILD_N);
}
function renderBuild() {
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="bdBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center pop"><div class="result-emoji" aria-hidden="true">🧱</div><div class="h2" style="margin:2px 0">ต่อคำเป็นประโยค</div>
      <p class="small">เรียงบัตรคำให้เป็นประโยคตัวอย่างของคำศัพท์ ระวัง! มีบัตรหลอกปนมา 2 ใบ</p><p class="small muted">รอบละ ${BUILD_N} ประโยค · ถูกประโยคละ 🪙 ${BUILD_COINS} · ต่อถูกไปแล้ว ${S.counts.builds || 0} ประโยค</p>
      <button class="btn primary block" id="bdGo">▶️ เริ่ม</button></div>`;
  $('#bdBack').onclick = () => go('fun');
  $('#bdGo').onclick = () => runBuild();
}
function runBuild() {
  const items = buildItems();
  let i = 0, right = 0;
  const q = () => {
    if (i >= items.length) return end();
    const w = items[i], toks = w.e.split(/\s+/), low = new Set(toks.map((t) => t.toLowerCase().replace(/[^a-z']/g, '')));
    const decoys = shuffle(W.filter((x) => x !== w && x.e).flatMap((x) => x.e.split(/\s+/)).slice(0, 400)).map((t) => t.replace(/[^A-Za-z']/g, '')).filter((t) => t.length >= 3 && !low.has(t.toLowerCase())).slice(0, 2);
    const chips = shuffle([...toks, ...decoys]), ans = [];
    buildRun.toks = toks; buildRun.chips = chips; // read by tests
    let done = false;
    const paint = () => {
      $('#bdAns').innerHTML = ans.map((k) => `<button class="ord-chip" data-a="${k}" lang="en">${esc(chips[k])}</button>`).join('') || '<span class="small muted">แตะบัตรคำด้านล่างเพื่อเรียง</span>';
      $('#bdPool').innerHTML = chips.map((c, k) => (ans.includes(k) ? '' : `<button class="ord-chip" data-p="${k}" lang="en">${esc(c)}</button>`)).join('');
      $('#bdCheck').disabled = ans.length < toks.length;
    };
    $('#title').textContent = `🧱 ต่อประโยค ${i + 1}/${items.length}`;
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="bdQuit" aria-label="ออก">✕</button><div class="progress"><div style="width:${i / items.length * 100}%"></div></div><span class="small muted">✅ ${right}</span></div>
      <div class="card-box q-prompt"><div class="small muted">ประโยคตัวอย่างของคำ</div><div class="word" lang="en">${esc(w.w)}</div><div class="th small">${esc(w.et || '')}</div></div>
      <div class="card-box bd-ans" id="bdAns"></div><div class="bd-pool" id="bdPool"></div>
      <div class="row" style="gap:8px"><button class="btn" id="bdClear">↩️ เริ่มเรียงใหม่</button><button class="btn primary grow" id="bdCheck" disabled>✅ ตรวจ</button></div>
      <div class="reveal" id="reveal" aria-live="polite"></div>`;
    paint();
    $('#bdQuit').onclick = () => renderBuild();
    $('#bdPool').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && !done) { ans.push(+b.dataset.p); paint(); } };
    $('#bdAns').onclick = (e) => { const b = e.target.closest('[data-a]'); if (b && !done) { ans.splice(ans.indexOf(+b.dataset.a), 1); paint(); } };
    $('#bdClear').onclick = () => { if (!done) { ans.length = 0; paint(); } };
    $('#bdCheck').onclick = () => {
      if (done) { i++; return q(); }
      const ok = ans.map((k) => chips[k]).join(' ') === toks.join(' ');
      done = true; markActive(); sfx(ok ? 'ok' : 'bad');
      if (ok) { right++; addCoins(BUILD_COINS); addXP(3); S.counts.builds = (S.counts.builds || 0) + 1; funEvent('build'); }
      $('#reveal').innerHTML = ok ? '✅ ถูกต้อง!' : `❌ ที่ถูกคือ <span lang="en">${esc(w.e)}</span>`;
      speak(w.e); save();
      $('#bdCheck').textContent = 'ถัดไป →'; $('#bdCheck').disabled = false; $('#bdClear').disabled = true;
    };
  };
  const end = () => {
    if (right === items.length) confetti();
    $('#title').textContent = 'ต่อคำเป็นประโยค';
    view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">${right === items.length ? '🏆' : '🧱'}</div><div class="h2">ต่อถูก ${right}/${items.length} ประโยค</div>
      <p class="small">ได้ 🪙 ${right * BUILD_COINS}</p><button class="btn primary block" id="bdAgain">🔁 อีกรอบ</button><button class="btn ghost block" id="bdHome" style="margin-top:8px">🎪 โซนสนุก</button></div>`;
    $('#bdAgain').onclick = () => runBuild(); $('#bdHome').onclick = () => go('fun');
    updateStreak();
  };
  q();
}

FUN_TILES.push({ id: 'pic', o: 50, ic: '🖼️', name: 'เล่าภาพ', sub: () => `เขียนแล้ว ${S.counts.pics || 0} ประโยค`, go: () => go('pic') });
FUN_TILES.push({ id: 'build', o: 52, ic: '🧱', name: 'ต่อคำเป็นประโยค', sub: () => `ต่อถูก ${S.counts.builds || 0} ประโยค`, go: () => go('build') });
FUN_TILES.push({ id: 'bed', o: 60, ic: '🌙', name: 'ทบทวนก่อนนอน', sub: () => 'ฟัง 10 คำ 2 นาที แล้วดับจอ', go: () => earBedtime() });
