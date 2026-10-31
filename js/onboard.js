'use strict';
// First-run welcome (1.112): three short steps for a brand-new user (goal -> level -> pace), then the home screen.
// Classic script sharing globals with app.js (load order: index.html). Shown once per device: localStorage 'o3k.onb'.

/* ---------- onboarding ---------- */
const ONB_LEVELS = [
  { id: 'zero', ic: '🌱', t: 'เริ่มจากศูนย์', d: 'เพิ่งเริ่มเรียน อยากเริ่มจากคำพื้นฐาน (A1)', lv: ['A1'] },
  { id: 'some', ic: '🌿', t: 'พอรู้บ้าง', d: 'จำคำง่ายๆ ได้แล้ว (A1–A2)', lv: ['A1', 'A2'] },
  { id: 'mid', ic: '🌳', t: 'ค่อนข้างคล่อง', d: 'อ่านข่าวง่ายๆ ได้ (A2–B1)', lv: ['A2', 'B1'] },
  { id: 'good', ic: '🏔️', t: 'คล่องแล้ว', d: 'อยากเก็บคำระดับกลางถึงสูง (B1–B2)', lv: ['B1', 'B2'] },
  { id: 'unsure', ic: '🎯', t: 'ไม่แน่ใจ', d: 'ทำแบบทดสอบวัดระดับสั้นๆ ให้ก่อน', lv: ['A1'] },
];
const ONB_PACE = [
  { n: 10, t: 'สบายๆ', d: '10 คำใหม่ต่อวัน · ราว 5 นาที' },
  { n: 20, t: 'กำลังดี', d: '20 คำใหม่ต่อวัน · ราว 10 นาที' },
  { n: 30, t: 'จริงจัง', d: '30 คำใหม่ต่อวัน · ราว 15 นาที' },
];
const onbSeen = () => { try { return !!localStorage.getItem('o3k.onb'); } catch (e) { return true; } };
const onbMark = () => { try { localStorage.setItem('o3k.onb', '1'); } catch (e) { /* private mode */ } };
// A brand-new device with nothing learned yet; signed-in users get their progress from the cloud instead, so they never see it.
const onbDue = () => !onbSeen() && !Object.keys(S.prog).length && !S.placedAt && !(typeof syncOn === 'function' && syncOn() && auth) && !(S.decks || []).length;

function onboard(force) {
  if (!force && !onbDue()) return;
  document.querySelectorAll('.onb').forEach((x) => x.remove());
  const pickd = { goal: S.settings.goal || '', lvl: 'zero', pace: S.settings.newPerDay === 10 || S.settings.newPerDay === 30 ? S.settings.newPerDay : 20 };
  let step = 0;
  const el = document.createElement('div');
  el.className = 'onb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'ยินดีต้อนรับ');
  const opt = (on, attrs, ic, t, d) => `<button class="onb-opt${on ? ' on' : ''}" ${attrs} aria-pressed="${on}"><span class="onb-ic" aria-hidden="true">${ic}</span><span class="onb-tx"><b>${t}</b>${d ? `<small>${d}</small>` : ''}</span></button>`;
  const body = [
    () => `<h2 class="h2">ยินดีต้อนรับ! อยากใช้คำศัพท์ไปทำอะไร?</h2>
      <p class="muted small">เลือกได้ 1 อย่าง จะให้คำศัพท์ที่ตรงเป้าหมายมาก่อน (เปลี่ยนทีหลังได้ในตั้งค่า)</p>
      <div class="onb-list">${opt(!pickd.goal, 'data-goal=""', '🌍', 'ทั่วไป', 'ได้คำศัพท์ครบทุกด้านตามลำดับ')}
      ${TAGS.map((t) => opt(pickd.goal === t.id, `data-goal="${t.id}"`, t.icon, t.th, esc(t.note))).join('')}</div>`,
    () => `<h2 class="h2">ตอนนี้ภาษาอังกฤษของเธออยู่ระดับไหน?</h2>
      <p class="muted small">เลือกให้ใกล้เคียงที่สุด แอปจะเริ่มคำให้พอดีกับระดับนี้</p>
      <div class="onb-list">${ONB_LEVELS.map((l) => opt(pickd.lvl === l.id, `data-lvl="${l.id}"`, l.ic, l.t, l.d)).join('')}</div>`,
    () => `<h2 class="h2">วันละกี่คำดี?</h2>
      <p class="muted small">เริ่มน้อยๆ แล้วทำให้ต่อเนื่องดีที่สุด ปรับได้ทุกเมื่อ</p>
      <div class="onb-list">${ONB_PACE.map((p) => opt(pickd.pace === p.n, `data-pace="${p.n}"`, '⏱️', p.t, p.d)).join('')}</div>`,
  ];
  const draw = () => {
    el.innerHTML = `<div class="onb-card">
      <div class="onb-top"><span class="onb-mascot" aria-hidden="true">${mascotSvg({ mood: 'happy', size: 64 })}</span>
        <div class="onb-dots" role="img" aria-label="ขั้นที่ ${step + 1} จาก 3">${[0, 1, 2].map((k) => `<i class="${k === step ? 'on' : ''}"></i>`).join('')}</div>
        <button class="onb-skip" data-act="skip">ข้าม</button></div>
      <div class="onb-body">${body[step]()}</div>
      <div class="onb-foot">${step ? '<button class="btn" data-act="back">ย้อนกลับ</button>' : ''}
        <button class="btn primary grow" data-act="next">${step === 2 ? (pickd.lvl === 'unsure' ? '🎯 ไปวัดระดับ' : '🚀 เริ่มเรียนเลย') : 'ต่อไป'}</button></div></div>`;
    const sel = el.querySelector('.onb-opt.on'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    const f = el.querySelector('[data-act="next"]'); if (f) f.focus({ preventScroll: true });
  };
  const finish = (apply) => {
    if (apply) {
      const l = ONB_LEVELS.find((x) => x.id === pickd.lvl);
      S.settings.goal = pickd.goal; S.settings.levels = l.lv.slice(); S.settings.newPerDay = pickd.pace; S.settings.minutes = 0;
      save();
    }
    onbMark();
    el.classList.add('out'); setTimeout(() => el.remove(), 250);
    if (apply && pickd.lvl === 'unsure') go('placement'); else go('home');
    if (apply) toast('ตั้งค่าเรียบร้อย เริ่มกันเลย! 🎉');
  };
  el.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.goal != null) { pickd.goal = b.dataset.goal; draw(); }
    else if (b.dataset.lvl) { pickd.lvl = b.dataset.lvl; draw(); }
    else if (b.dataset.pace) { pickd.pace = +b.dataset.pace; draw(); }
    else if (b.dataset.act === 'next') { if (step < 2) { step++; draw(); } else finish(true); }
    else if (b.dataset.act === 'back') { step--; draw(); }
    else if (b.dataset.act === 'skip') finish(false);
  };
  draw();
  document.body.appendChild(el);
}
