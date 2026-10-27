'use strict';
// Level map (route `map`): every topic is a path of stages (8 mixed questions each) with 1–3 stars.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- map ---------- */
// A topic's words go easiest level first (A1 → C1, then list order), 8 per stage; a last stage of fewer than 4 words joins the one before it.
// Stars from the share of right answers: all = 3, 7/8 = 2, 5/8 = 1, fewer = not passed. A stage opens when the one before has at least 1 star.
// S.lvmap[topic] = string with one digit (0–3) per stage.
const STAGE_SIZE = 8;
const STAGE_WAVE = [0, 36, 64, 36, 0, -36, -64, -36]; // sideways offset of a path node (px), repeating
const stageCache = {};
function topicStages(id) {
  if (stageCache[id]) return stageCache[id];
  const words = W.filter((w) => w.tp === id).sort((a, b) => LEVELS.indexOf(a.g) - LEVELS.indexOf(b.g) || a.idx - b.idx);
  const out = [];
  for (let k = 0; k < words.length; k += STAGE_SIZE) out.push(words.slice(k, k + STAGE_SIZE));
  if (out.length > 1 && out[out.length - 1].length < 4) out[out.length - 2].push(...out.pop());
  return (stageCache[id] = out);
}
const starsFor = (right, n) => (right >= n ? 3 : right >= Math.ceil(n * 0.875) ? 2 : right >= Math.ceil(n * 0.625) ? 1 : 0);
const needFor = (n) => Math.ceil(n * 0.625);
const starsOf = (id) => String((S.lvmap && S.lvmap[id]) || '').replace(/[^0-3]/g, '');
const starsAt = (id, k) => +(starsOf(id)[k] || 0);
const stageOpen = (id, k) => k === 0 || starsAt(id, k - 1) >= 1;
function topicProgress(id) {
  const n = topicStages(id).length, s = starsOf(id).slice(0, n);
  return { n, cleared: [...s].filter((c) => +c > 0).length, stars: [...s].reduce((a, c) => a + +c, 0) };
}
// First stage not cleared yet (the one the path points at); the last stage when everything is cleared.
const stageNext = (id) => { const n = topicStages(id).length; for (let k = 0; k < n; k++) if (starsAt(id, k) === 0) return k; return n - 1; };
// Called when a stage round ends: keeps the best stars, pays XP; returns what to show.
function stageDone(topic, k, right, n, beaten = false) {
  const stars = beaten ? 0 : starsFor(right, n), prev = starsAt(topic, k); // beaten = the boss took all 3 hearts: not cleared
  if (!S.lvmap || typeof S.lvmap !== 'object') S.lvmap = {};
  const s = starsOf(topic).padEnd(k + 1, '0').split('');
  s[k] = String(Math.max(+s[k] || 0, stars));
  S.lvmap[topic] = s.join('');
  addXP(stars * 4 + (prev === 0 && stars > 0 ? 6 : 0));
  let badge = false;
  if (stars > 0 && isBoss(topic, k) && !(S.owned = S.owned || []).includes('boss:' + topic)) { S.owned.push('boss:' + topic); addXP(25); badge = true; }
  return { stars, first: prev === 0 && stars > 0, hasNext: stars > 0 && k + 1 < topicStages(topic).length, badge };
}
// Boss (1.102): the last stage of a topic with 2+ stages. The boss has one hit point per word; a right answer hits it, a wrong one
// costs น้องคำ a heart (3). Win = stars as usual, first win of a topic = ตราบอส in S.owned ('boss:<topic>'), which unlocks mascot items.
const isBoss = (id, k) => { const n = topicStages(id).length; return n > 1 && k === n - 1; };
const bossCount = () => (S.owned || []).filter((x) => String(x).startsWith('boss:')).length;
function startStage(topic, k) {
  const words = topicStages(topic)[k];
  if (!words || !stageOpen(topic, k)) return go('map', topic);
  if (cleanup) { cleanup(); cleanup = null; }
  current = 'games'; view.classList.remove('feed-mode'); view.dataset.route = 'games'; view.scrollTop = 0;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'games'));
  const boss = isBoss(topic, k);
  playQuiz('en2th', words, 'stage', {}, { topic, k, boss, title: `${TOPIC_LABEL[topic]} · ${boss ? '🐲 บอส' : 'ด่าน ' + (k + 1)}` });
}

const starRow = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
function renderMap(arg) {
  if (arg && topicStages(arg).length) return renderMapTopic(arg);
  const rows = (ids) => ids.map((id) => {
    const p = topicProgress(id);
    return `<button class="map-topic" data-t="${id}"><span class="mt-n">${TOPIC_LABEL[id]}</span>
      <span class="mp-bar" aria-hidden="true"><i style="width:${p.n ? Math.round(p.cleared / p.n * 100) : 0}%"></i></span>
      <span class="mt-s small muted">ผ่าน ${p.cleared}/${p.n} ด่าน · ★ ${p.stars}/${p.n * 3}</span></button>`;
  }).join('');
  const grouped = new Set(TOPIC_GROUPS.flatMap((g) => g[3]));
  const loose = TOPICS.map((t) => t[0]).filter((id) => !grouped.has(id));
  const all = TOPICS.map((t) => t[0]).reduce((a, id) => { const p = topicProgress(id); a.n += p.n; a.c += p.cleared; a.s += p.stars; return a; }, { n: 0, c: 0, s: 0 });
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="mpBack">‹ กลับ</button></div>
    <div class="card-box center"><div class="result-emoji" aria-hidden="true">🗺️</div><div class="h2" style="margin:2px 0">แผนที่ด่าน</div>
      <p class="small muted">แต่ละหมวดเป็นเส้นทางด่าน ด่านละ 8 ข้อผสมหลายเกม (คำง่ายก่อน) ได้ ★ 1–3 ตามความแม่น ผ่านแล้วปลดล็อกด่านต่อไป</p>
      <div class="tiles mo-tiles" style="display:flex;justify-content:center;gap:10px"><div class="tile-s" style="min-width:110px"><b>${all.c}<small>/${all.n}</small></b><span>ด่านที่ผ่าน</span></div><div class="tile-s" style="min-width:110px"><b>${all.s}<small>/${all.n * 3}</small></b><span>ดาวที่ได้</span></div></div></div>
    ${TOPIC_GROUPS.map(([, ic, th, kids]) => `<div class="small muted games-sec"><b>${ic} ${th}</b></div><div class="map-list">${rows(kids)}</div>`).join('')}
    ${loose.length ? `<div class="small muted games-sec"><b>📦 หมวดอื่นๆ</b></div><div class="map-list">${rows(loose)}</div>` : ''}`;
  $('#mpBack').onclick = () => go('games');
  view.querySelectorAll('.map-topic').forEach((b) => (b.onclick = () => go('map', b.dataset.t)));
}

function renderMapTopic(id) {
  const stages = topicStages(id);
  let sel = stageNext(id);
  const paint = () => {
    const words = stages[sel], open = stageOpen(id, sel), st = starsAt(id, sel);
    view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="mpBack">‹ แผนที่</button><div class="grow"></div><span class="small muted">★ ${topicProgress(id).stars}/${stages.length * 3}</span></div>
      <div class="card-box center" style="padding:12px"><div class="h2" style="margin:0">${TOPIC_LABEL[id]}</div><div class="small muted">ผ่าน ${topicProgress(id).cleared}/${stages.length} ด่าน</div></div>
      <div class="card-box" id="mpSel"><div class="row"><b>${isBoss(id, sel) ? '🐲 บอสท้ายด่าน' : `ด่าน ${sel + 1}`} <span class="small muted">· ${sel + 1}/${stages.length}</span></b><div class="grow"></div><span class="map-st" aria-label="${st} ดาว">${starRow(st)}</span></div>
        ${open ? `<div class="map-words" lang="en">${words.map((w) => `<span>${esc(w.w)}</span>`).join('')}</div>
          ${isBoss(id, sel) ? `<p class="small muted" style="margin:8px 0 0">🐲 ตอบถูกให้บอสเสียเลือด ตอบผิดน้องคำเสียหัวใจ (มี 3 ดวง) ชนะครั้งแรกได้ตราบอส${(S.owned || []).includes('boss:' + id) ? ' · 🏅 ได้ตราหมวดนี้แล้ว' : ''}</p>` : ''}
          <button class="btn primary block" id="mpGo" style="margin-top:10px">▶ ${st ? 'เล่นอีกครั้ง' : isBoss(id, sel) ? 'สู้กับบอส' : 'เริ่มด่านนี้'}</button>`
          : `<p class="small muted" style="margin:8px 0 0">🔒 ผ่านด่านก่อนหน้าให้ได้ ★ อย่างน้อย 1 ดวงก่อน (ตอบถูก ${needFor(stages[sel - 1].length)} ข้อขึ้นไป)</p>`}</div>
      <ol class="map-path" aria-label="เส้นทางด่าน">${stages.map((ws, k) => {
        const s = starsAt(id, k), o = stageOpen(id, k);
        return `<li class="map-node ${!o ? 'lock' : s ? 'done' : 'cur'}${k === sel ? ' sel' : ''}" style="--x:${STAGE_WAVE[k % STAGE_WAVE.length]}px">
          <button data-k="${k}" aria-label="ด่าน ${k + 1} ${o ? (s ? s + ' ดาว' : 'ยังไม่ผ่าน') : 'ล็อกอยู่'}">${o ? (isBoss(id, k) ? '🐲' : k + 1) : '🔒'}</button><span class="map-st">${o ? starRow(s) : ''}</span></li>`;
      }).join('')}</ol>`;
    $('#mpBack').onclick = () => go('map');
    if ($('#mpGo')) $('#mpGo').onclick = () => startStage(id, sel);
    view.querySelectorAll('.map-node button').forEach((b) => (b.onclick = () => { sel = +b.dataset.k; const top = view.scrollTop; paint(); view.scrollTop = top; }));
  };
  paint();
  const cur = view.querySelector('.map-node.sel');
  if (cur) cur.scrollIntoView({ block: 'center' });
}
// "12/640" for the games menu card.
const stageTotals = () => { let n = 0, c = 0; for (const [id] of TOPICS) { const p = topicProgress(id); n += p.n; c += p.cleared; } return `${c}/${n}`; };
