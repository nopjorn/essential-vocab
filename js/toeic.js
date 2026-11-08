'use strict';
// 💼 TOEIC hub (1.211.0, route 'toeic'): everything TOEIC on one page — today's plan, the mock test, Part 1–7 with accuracy,
// work-English games and reference pages, the TOEIC / business word lists, and a link to the detailed stats.
// Reached from the games menu (💼 chip banner), the home exam card / goal card, the stats TOEIC card and search.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- TOEIC hub ---------- */
const TH_LISTEN = ['toeic1', 'toeic2', 'toeic3', 'toeic4'];
const TH_READ = ['toeic5', 'toeic6', 'toeic7'];
const TH_WORK = ['wphr', 'wpdict', 'bizcol', 'regi', 'email']; // practice games for workplace English
const TH_REFS = ['wphr', 'bizcol', 'regi']; // REF_LIST keys shown as reading pages
const TH_WORDS = ['TOE', 'BIZ']; // word groups that belong here (LEVELS_EXTRA)
const TH_PLAN_DAYS = 90; // no TOEIC exam date: the plan runs in its "foundation" phase

// days left to a TOEIC exam goal, else null
function toeicExamDays() {
  const x = examPlan();
  return x && !x.past && isToeicGoal(x.name) ? x.days : null;
}
// a word group's counts: [total, learned, mastered, due]
function toeicWordStat(g) {
  let n = 0, l = 0, m = 0, d = 0; const now = Date.now();
  for (const w of W) {
    if (w.g !== g) continue;
    n++; const p = S.prog[w.w]; if (!p) continue;
    l++; if (p.b >= MASTERED) m++; if (p.d <= now) d++;
  }
  return [n, l, m, d];
}
// start a game and come back here when it ends (go() reads gameBackTo)
function toeicGo(g) {
  if (!GAMES[g]) return;
  gameBackTo = 'toeic';
  startGame(g);
}
function toeicPartTile(g) {
  const r = toeicStat(g), G = GAMES[g];
  const acc = r.acc == null ? 'ยังไม่เคยเล่น' : `แม่น ${Math.round(r.acc * 100)}%`;
  const tag = r.due ? ` · ทวน <b>${r.due}</b>` : r.ago != null && r.ago >= 7 ? ` · ห่างไป ${r.ago} วัน` : '';
  const lvl = r.acc == null ? '' : r.acc >= 0.85 ? ' good' : r.acc < 0.6 && r.ans >= 8 ? ' weak' : '';
  return `<button class="th-part${lvl}" data-thg="${g}"><span class="th-ic" aria-hidden="true">${G.icon}</span><b>${esc(G.name.replace('TOEIC ', ''))}</b><small>${esc(G.desc)}</small><small class="th-acc">${acc}${tag}</small></button>`;
}
function renderToeic(from) {
  const days = toeicExamDays();
  const W2 = TH_WORDS.filter((g) => LEVELS.includes(g));
  const words = W2.map((g) => [g, ...toeicWordStat(g)]);
  const onPlan = (g) => (S.settings.levels || []).includes(g);
  const hero = days != null
    ? `<div class="th-count"><b>${days}</b><span>วันก่อนสอบ</span></div><div class="grow"><b>💼 ${esc(S.settings.exam.name)}</b><div class="small muted">${thDate(Date.parse(S.settings.exam.date + 'T12:00:00'))}</div></div>`
    : `<div class="grow"><b>💼 ศูนย์ TOEIC</b><div class="small muted">ตั้งวันสอบ แล้วแผนรายวันจะปรับตามจำนวนวันที่เหลือ</div></div><button class="btn" id="thExam">🗓️ ตั้งวันสอบ</button>`;
  view.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn" id="thBack" data-depth="1">‹ กลับ</button></div>
    <div class="th-wrap">
    <div class="card-box th-hero">${hero}</div>
    <div class="card-box th-plan">${toeicPlanHtml(days != null ? days : TH_PLAN_DAYS)}</div>
    <div class="card-box th-mock"><div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b>🏁 ข้อสอบจำลอง</b><button class="btn primary" data-thg="toeicMock">เริ่มทำ</button></div>${mockLine()}</div>
    <div class="h2 th-h">🎧 Listening · Part 1–4</div>
    <div class="th-parts">${TH_LISTEN.filter((g) => GAMES[g]).map(toeicPartTile).join('')}</div>
    <button class="card-box guide-link" id="thEar"><span>🎧</span><div class="grow"><b>ฟังบทสนทนาต่อเนื่อง</b><div class="small muted">Part 3–4 สุ่ม 6 บท เล่นต่อกันเอง มีสรุปไทยหลังจบแต่ละบท</div></div><span class="muted">›</span></button>
    <div class="h2 th-h">📖 Reading · Part 5–7</div>
    <div class="th-parts">${TH_READ.filter((g) => GAMES[g]).map(toeicPartTile).join('')}</div>
    <div class="h2 th-h">✉️ ภาษาอังกฤษที่ทำงาน</div>
    <div class="${gridCls()} th-games">${TH_WORK.filter((g) => GAMES[g]).map(gameTile).join('')}</div>
    <div class="ref-grid th-refs">${REF_LIST.filter(([k]) => TH_REFS.includes(k)).map(([k, , ic, name]) => `<button class="ref-tile" data-thr="${k}"><span>${ic}</span>${name}</button>`).join('')}</div>
    ${words.length ? `<div class="h2 th-h">📚 ศัพท์สำหรับงานและ TOEIC</div>
    <div class="th-words">${words.map(([g, n, l, m, d]) => `<div class="card-box th-wl lv-${g}"><div class="row" style="justify-content:space-between"><b>${LV_LABEL[g]}</b><span class="small muted">${n.toLocaleString()} คำ</span></div>
      <div class="qbar th-bar" role="img" aria-label="เรียนแล้ว ${l} จำได้แล้ว ${m} จาก ${n}"><span style="width:${n ? l / n * 100 : 0}%"></span></div>
      <div class="small muted">เรียนแล้ว ${l.toLocaleString()} · จำได้แล้ว ${m.toLocaleString()}${d ? ` · ถึงกำหนดทวน <b>${d}</b>` : ''}</div>
      <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><button class="btn primary" data-thw="${g}">${l < n ? 'เรียนคำชุดนี้' : 'ทวนคำชุดนี้'}</button>${onPlan(g) ? '<span class="small muted th-on">✅ อยู่ในแผนเรียนรายวันแล้ว</span>' : `<button class="btn" data-thadd="${g}">➕ เพิ่มเข้าแผนเรียนรายวัน</button>`}</div></div>`).join('')}</div>` : ''}
    <button class="card-box guide-link" id="thStats"><span>📊</span><div class="grow"><b>สถิติ TOEIC แบบละเอียด</b><div class="small muted">ตารางแยกพาร์ต พาร์ตที่อ่อน และคะแนนข้อสอบจำลองย้อนหลัง</div></div><span class="muted">›</span></button>
    </div>`;
  $('#thBack').onclick = () => go(from && TITLES[from] ? from : 'games');
  const ex = $('#thExam');
  if (ex) ex.onclick = () => { // settings search filled in, like the games menu's difficulty pill
    go('settings');
    const q = $('#setQ'); if (!q) return;
    q.value = 'วันสอบ'; q.oninput();
    const n = $('#examName'); if (n && !n.value) n.value = 'สอบ TOEIC';
    const d = $('#examDate'); if (d) d.scrollIntoView({ block: 'center' });
  };
  $('#thEar').onclick = () => playToeicEar();
  $('#thStats').onclick = () => go('stats');
  view.querySelector('.th-wrap').addEventListener('click', (e) => {
    const t = e.target.closest('[data-thg],[data-tplan],[data-game],[data-thr],[data-thw],[data-thadd]'); if (!t) return;
    const ds = t.dataset;
    if (ds.thg || ds.tplan || ds.game) return toeicGo(ds.thg || ds.tplan || ds.game);
    if (ds.thr) return REF_PAGES[ds.thr]();
    if (ds.thw) return go('cards', 'lv:' + ds.thw);
    if (ds.thadd) {
      const ls = S.settings.levels || (S.settings.levels = []);
      if (!ls.includes(ds.thadd)) ls.push(ds.thadd);
      save(); toast(`เพิ่ม ${LV_LABEL[ds.thadd]} เข้าแผนเรียนรายวันแล้ว ✅`);
      const top = view.scrollTop; renderToeic(from); view.scrollTop = top;
    }
  });
}
