'use strict';
// Choose-your-path stories (1.122, single player; route `paths`, `runPath(id)`): read a short scene in easy English (tap words for their
// sheet, 🇹🇭 shows the Thai, 🔊 reads it), pick what to do next, reach one of several endings. A new ending: +10 coins +5 XP.
// Data: data/paths.js (lazy, loadPaths()). State: S.paths = { story id: [ending node ids found] } (cleanPaths() / union merge in app.js).

let PATHS = null;
const loadPaths = () => loadData('data/paths.js', 'PATHS').then((p) => (PATHS = p));
const PATH_COINS = 10;
const pathEnds = (st) => Object.entries(st.nodes).filter(([, n]) => n.end).map(([id]) => id);
const pathsFound = () => Object.values(S.paths || {}).reduce((n, a) => n + a.length, 0);

function renderPaths() {
  if (!PATHS) { withLoading(loadPaths()).then(() => { if (current === 'paths') renderPaths(); }); return; }
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="ptBack">‹ กลับ</button><span class="grow"></span>${coinPill()}</div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">📖</div><div class="h2" style="margin:2px 0">นิยายเลือกทางเดิน</div>
      <p class="small muted">อ่านแล้วเลือกว่าจะทำอะไรต่อ แต่ละเรื่องจบได้หลายแบบ · เจอตอนจบใหม่ได้ 🪙 ${PATH_COINS}</p></div>
    <div class="card-box" id="ptRows">${PATHS.map((st) => { const ends = pathEnds(st), got = (S.paths[st.id] || []).length;
      return `<button class="wrow case-row" data-path="${st.id}"><span class="shop-ic" aria-hidden="true">${st.emoji}</span><div class="grow"><b>${esc(st.title)}</b> ${lvBadge(st.level)}<div class="small muted">ตอนจบที่เจอแล้ว ${got}/${ends.length}${got === ends.length ? ' 🏆' : ''}</div></div><span class="muted">›</span></button>`; }).join('')}</div>`;
  $('#ptBack').onclick = () => go('fun');
  $('#ptRows').onclick = (e) => { const b = e.target.closest('[data-path]'); if (b) runPath(b.dataset.path); };
}

function runPath(id, node) {
  const st = PATHS.find((x) => x.id === id);
  if (!st) return renderPaths();
  const k = node || st.start, n = st.nodes[k];
  $('#title').textContent = st.title;
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="ptBack">‹ กลับ</button></div>
    <div class="card-box pop path-scene"><div class="small muted">${st.emoji} ${esc(st.title)}</div>
      <p class="en path-en" lang="en">${storyHTML(n.en)}</p><p class="small muted" id="ptTh" hidden>${esc(n.th)}</p>
      <div class="row" style="gap:8px"><button class="pw-btn" id="ptSay">🔊 ฟัง</button><button class="pw-btn" id="ptThB">🇹🇭 คำแปล</button></div></div>
    ${n.end ? '' : `<div class="h2">จะทำอะไรต่อ?</div><div class="path-ch">${n.ch.map(([en, th, next]) => `<button class="opt path-opt" data-next="${next}"><span lang="en">${esc(en)}</span><small class="muted">${esc(th)}</small></button>`).join('')}</div>`}
    <div id="ptEnd"></div>`;
  $('#ptBack').onclick = () => renderPaths();
  $('#ptSay').onclick = () => speak(n.en);
  $('#ptThB').onclick = () => { const t = $('#ptTh'); t.hidden = !t.hidden; };
  view.querySelector('.path-scene').onclick = (e) => { const w = e.target.closest('.rw'); if (w) openSheet(W[+w.dataset.i]); };
  if (!n.end) { view.querySelector('.path-ch').onclick = (e) => { const b = e.target.closest('[data-next]'); if (b) { markActive(); sfx('ok'); runPath(id, b.dataset.next); view.scrollTop = 0; } }; return; }
  // an ending
  const found = S.paths[id] || (S.paths[id] = []), fresh = !found.includes(k), ends = pathEnds(st);
  if (fresh) { found.push(k); addCoins(PATH_COINS); addXP(5); }
  funEvent('path'); markActive(); save();
  if (n.end === 'good') confetti(fresh ? 'burst' : undefined);
  $('#ptEnd').innerHTML = `<div class="card-box center pop"><div class="result-emoji" aria-hidden="true">${{ good: '🌟', ok: '🙂', bad: '😅' }[n.end]}</div>
    <div class="h2" style="margin:2px 0">ตอนจบ: ${esc(n.name)}</div><p class="small">${fresh ? `ตอนจบใหม่! +🪙 ${PATH_COINS}` : 'เคยเจอตอนจบนี้แล้ว'} · เจอแล้ว ${found.length}/${ends.length}</p>
    ${found.length < ends.length ? '<p class="small muted">ลองเลือกทางอื่นดู ยังมีตอนจบที่ซ่อนอยู่ 👀</p>' : '<p class="small">🏆 เจอครบทุกตอนจบแล้ว!</p>'}
    <button class="btn primary block" id="ptAgain">🔁 เริ่มเรื่องนี้ใหม่</button><button class="btn ghost block" id="ptList" style="margin-top:8px">📖 เรื่องอื่น</button></div>`;
  $('#ptAgain').onclick = () => { runPath(id); view.scrollTop = 0; };
  $('#ptList').onclick = () => renderPaths();
}
FUN_TILES.push({ id: 'paths', o: 45, ic: '📖', name: 'นิยายเลือกทาง', sub: () => `เจอตอนจบแล้ว ${pathsFound()} แบบ`, go: () => go('paths') });
