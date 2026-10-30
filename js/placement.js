'use strict';
// Placement test.
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- placement test ---------- */
// Samples unseen words level by level (8 per level, multiple choice + "ไม่รู้"), stops after a level
// scores below 6/8, then offers to mark the unseen words of well-known levels as known. Those words
// get spread-out review dates, so any that weren't really known get caught at their first review.
const PT_N = 8, PT_PASS = 6;
function renderPlacement() {
  const levels = LEVELS.filter((l) => GROUP[l].some((w) => !S.prog[w.w]));
  const res = {};           // level -> correct count
  let li = 0, qi = 0, items = [];
  const start = () => {
    view.innerHTML = `<div class="card-box center pop" style="margin-top:10px">
      <div class="result-emoji">🎯</div><div class="h2">แบบทดสอบวัดระดับ</div>
      <p>ตอบคำแปลของคำที่สุ่มมาจากแต่ละระดับ ระดับละ ${PT_N} ข้อ ราว 3–5 นาที</p>
      <p class="small muted">ไม่รู้ให้กด "ไม่รู้" อย่าเดา ผลจะได้แม่น · ทดสอบเฉพาะคำที่ยังไม่เคยเรียน</p>
      <button class="btn primary block" id="ptGo">เริ่มเลย</button>
      <div style="height:10px"></div><button class="btn block" id="ptLater">ไว้ทีหลัง</button></div>`;
    $('#ptGo').onclick = () => level();
    $('#ptLater').onclick = () => go('home');
  };
  const level = () => {
    if (li >= levels.length) return result();
    const lv = levels[li];
    items = shuffle(GROUP[lv].filter((w) => !S.prog[w.w])).slice(0, PT_N);
    qi = 0; res[lv] = 0; q();
  };
  const q = () => {
    if (qi >= items.length) {
      const lv = levels[li];
      if (res[lv] / items.length < PT_PASS / PT_N) return result();
      li++; return level();
    }
    const w = items[qi], lv = levels[li];
    const opts = shuffle([w, ...distractors(w, 3, 't')]);
    view.innerHTML = `<div class="session-top"><button class="icon-btn" id="quit" aria-label="ออก">✕</button>
        <div class="progress"><div style="width:${(li * PT_N + qi) / (levels.length * PT_N) * 100}%"></div></div>
        <span class="small">${lvBadge(lv)}</span></div>
      <div class="card-box q-prompt pop"><div class="word" lang="en">${esc(w.w)}</div><div class="muted">${esc(w.i)} · <span class="pos">${esc(w.p)}</span></div></div>
      <div class="options">${opts.map((o) => `<button class="opt" data-i="${o.idx}">${esc(o.t)}</button>`).join('')}
        <button class="opt idk" data-i="-1">🤷 ไม่รู้</button></div>`;
    $('#quit').onclick = () => go('home');
    view.querySelector('.options').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b) return;
      if (+b.dataset.i === w.idx) res[lv]++;
      qi++; q();
    };
  };
  const result = () => {
    // Levels answered at ≥ 6/8 count as known; the level where the test stopped is shown but not applied.
    const rows = Object.entries(res).map(([lv, c]) => {
      const n = GROUP[lv].filter((w) => !S.prog[w.w]).length;
      return { lv, c, pct: c / PT_N, n, on: c >= PT_PASS };
    });
    const est = rows.reduce((a, r) => a + Math.round(r.n * r.pct), 0);
    const paint = () => {
      const pick = rows.filter((r) => r.on), skip = pick.reduce((a, r) => a + r.n, 0);
      view.innerHTML = `<div class="card-box center pop"><div class="result-emoji">📋</div>
          <div class="h2">ผลวัดระดับ</div><p>น่าจะรู้แล้วราว <b>${est.toLocaleString()}</b> คำจากคำที่ยังไม่เคยเรียน</p></div>
        <div class="card-box">${rows.map((r) => `<label class="pt-row"><input type="checkbox" data-lv="${r.lv}" ${r.on ? 'checked' : ''} ${r.c < PT_PASS - 1 ? 'disabled' : ''}>
            ${lvBadge(r.lv)}<span class="grow">ถูก ${r.c}/${PT_N}<div class="bar" style="margin-top:4px"><div class="m" style="width:${r.pct * 100}%"></div></div></span>
            <span class="small muted">${r.n} คำ</span></label>`).join('')}
          <p class="small muted" style="margin-bottom:0">ติ๊กระดับที่จะข้าม คำที่ข้ามจะถูกนับว่า "รู้แล้ว" และทยอยกลับมาให้ทบทวนใน 1–4 สัปดาห์ ถ้าจริงๆ ไม่รู้ ก็กด "ลืม" ตอนนั้นได้</p></div>
        ${skip ? `<button class="btn primary block" id="ptApply">ข้าม ${skip.toLocaleString()} คำ</button><div style="height:10px"></div>` : ''}
        <button class="btn block" id="ptDone">${skip ? 'ไม่ข้าม เรียนตามปกติ' : 'กลับหน้าแรก'}</button>`;
      view.querySelectorAll('[data-lv]').forEach((cb) => (cb.onchange = () => { rows.find((r) => r.lv === cb.dataset.lv).on = cb.checked; paint(); }));
      const ap = $('#ptApply');
      if (ap) ap.onclick = () => {
        const words = pick.flatMap((r) => GROUP[r.lv].filter((w) => !S.prog[w.w]));
        words.forEach((w) => {
          const i = INTERVALS[MASTERED];
          // Spread first reviews over 7–30 days so they don't all land on one day.
          S.prog[w.w] = { b: MASTERED, i, e: EASE0, d: Date.now() + (7 + Math.random() * 23) * DAY, s: 1, c: 1, x: 0, t: Date.now() };
        });
        // If every level being studied was skipped, move on to the first level that wasn't.
        const skipped = pick.map((r) => r.lv);
        let moved = '';
        if (S.settings.levels.every((l) => skipped.includes(l))) {
          const nextLv = LEVELS.find((l) => !skipped.includes(l) && GROUP[l].some((w) => !S.prog[w.w]));
          if (nextLv) { S.settings.levels = [nextLv]; moved = ` · เปลี่ยนไปเรียนระดับ ${LV_LABEL[nextLv]}`; }
        }
        S.placedAt = today(); markActive(); save(); confetti();
        toast(`ข้าม ${words.length.toLocaleString()} คำแล้ว 🎉${moved}`);
        go('home');
      };
      $('#ptDone').onclick = () => { S.placedAt = S.placedAt || today(); save(); go('home'); };
    };
    paint();
  };
  start();
}
