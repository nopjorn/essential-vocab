'use strict';
// Mascot "น้องคำ" (a speech-bubble creature drawn in SVG), unlockable items and the daily mystery box (1.67).
// Classic script sharing globals with app.js (load order: index.html).

/* ---------- unlockable items ---------- */
// kind: acc (mascot slot head/face/body), pal (colour palette), frame (flashcard frame). Open when the level is reached,
// or earlier when won from the daily box (S.owned).
const ITEMS = [
  { id: 'acc:cap', kind: 'acc', slot: 'head', lv: 5, name: 'หมวกแก๊ป', ic: '🧢' },
  { id: 'frame:gold', kind: 'frame', lv: 5, name: 'กรอบการ์ดทอง', ic: '🖼️' },
  { id: 'acc:glasses', kind: 'acc', slot: 'face', lv: 10, name: 'แว่นตากลม', ic: '👓' },
  { id: 'pal:gold', kind: 'pal', lv: 10, name: 'ธีมสีทอง', ic: '🟡' },
  { id: 'acc:bow', kind: 'acc', slot: 'body', lv: 15, name: 'โบว์', ic: '🎀' },
  { id: 'acc:crown', kind: 'acc', slot: 'head', lv: 20, name: 'มงกุฎ', ic: '👑' },
  { id: 'pal:galaxy', kind: 'pal', lv: 20, name: 'ธีมสีกาแล็กซี', ic: '🌌' },
  { id: 'acc:cape', kind: 'acc', slot: 'body', lv: 25, name: 'ผ้าคลุมฮีโร่', ic: '🦸' },
  { id: 'acc:phones', kind: 'acc', slot: 'head', lv: 30, name: 'หูฟัง', ic: '🎧' },
  // seasonal (js/events.js): only from passing the event quiz, kept for good
  { id: 'evt:pumpkin', kind: 'acc', slot: 'head', lv: Infinity, evt: true, name: 'หมวกฟักทอง (ฮาโลวีน)', ic: '🎃' },
  { id: 'evt:garland', kind: 'acc', slot: 'body', lv: Infinity, evt: true, name: 'พวงมาลัยดอกไม้ (สงกรานต์)', ic: '💐' },
  { id: 'evt:lotus', kind: 'acc', slot: 'head', lv: Infinity, evt: true, name: 'ดอกบัวบนหัว (ลอยกระทง)', ic: '🪷' },
  { id: 'evt:party', kind: 'acc', slot: 'head', lv: Infinity, evt: true, name: 'หมวกปาร์ตี้ (ปีใหม่)', ic: '🥳' },
];
const itemOpen = (id) => { const it = ITEMS.find((x) => x.id === id); return !it || levelOf(S.xp) >= it.lv || (S.owned || []).includes(id); };
const paletteOpen = (pal) => itemOpen('pal:' + pal);
const STAGES = [[0, 'ลูกน้อย'], [50, 'เด็กน้อย'], [300, 'โตเต็มวัย'], [1000, 'ตำนานคำศัพท์']];
function mascotStage() {
  const m = masteredWords().length;
  let i = 0; STAGES.forEach(([n], k) => { if (m >= n) i = k; });
  return { i, name: STAGES[i][1], next: STAGES[i + 1] ? { need: STAGES[i + 1][0] - m, name: STAGES[i + 1][1] } : null };
}
// Today's goal ring closed? (same rule as the home hero)
function todayClosed() {
  const plan = backlogPlan(), unseen = pool().filter((w) => !S.prog[w.w]).length;
  const newLeft = plan.on ? 0 : Math.max(0, newGoal() - S.daily.fresh), todo = plan.show + Math.min(newLeft, unseen);
  return todo === 0 && S.daily.fresh + S.daily.reviews > 0;
}
// happy = goal done today · sleepy = away 3+ days · miss = away 1–2 days · normal otherwise (never scolds)
function mascotMood() {
  if (todayClosed()) return 'happy';
  const played = (S.hist[today()] || 0) > 0, away = played ? 0 : daysAway();
  if (away != null && away >= 3) return 'sleepy';
  if (away != null && away >= 1) return 'miss';
  return 'normal';
}
const MASCOT_SAY = {
  happy: () => ['วันนี้เก่งมากเลย! ภูมิใจจังเลย 🎉', 'ครบเป้าแล้ว! พักสบายๆ ได้เลยนะ 💛'][new Date().getDate() % 2],
  normal: () => (streakNow() >= 2 ? `🔥 ต่อเนื่อง ${streakNow()} วันแล้ว ไปต่อด้วยกันนะ` : 'วันนี้มาทวนศัพท์ด้วยกันนะ ✨'),
  miss: () => 'คิดถึงจังเลย วันนี้มาทวนกันสักนิดไหม?',
  sleepy: () => 'ง่วงจัง... แต่ดีใจที่เธอกลับมานะ ค่อยๆ ทวนไปด้วยกัน 💤',
};
const mascotSay = (mood) => MASCOT_SAY[mood]();

/* ---------- the drawing ---------- */
// viewBox 120×120; the body takes the app's colours (CSS variables), so it follows the chosen palette and dark mode.
function mascotSvg({ mood = 'normal', size = 96, equip = S.mascot && S.mascot.equip, stage = mascotStage().i } = {}) {
  const eq = equip || {}, dark = '#2b2350';
  const eyes = {
    happy: `<path d="M44 49q6-9 12 0M64 49q6-9 12 0" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>`,
    normal: `<ellipse cx="50" cy="49" rx="4.5" ry="6" fill="${dark}"/><ellipse cx="70" cy="49" rx="4.5" ry="6" fill="${dark}"/><circle cx="51.5" cy="46.5" r="1.7" fill="#fff"/><circle cx="71.5" cy="46.5" r="1.7" fill="#fff"/>`,
    miss: `<ellipse cx="50" cy="51" rx="4.5" ry="5.5" fill="${dark}"/><ellipse cx="70" cy="51" rx="4.5" ry="5.5" fill="${dark}"/><circle cx="51.5" cy="49.5" r="1.7" fill="#fff"/><circle cx="71.5" cy="49.5" r="1.7" fill="#fff"/>`,
    sleepy: `<path d="M44 50q6 5 12 0M64 50q6 5 12 0" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>`,
  }[mood];
  const mouth = {
    happy: `<path d="M52 60q8 10 16 0z" fill="${dark}"/><path d="M55 64q5 3.5 10 0" fill="#ff8fa3"/>`,
    normal: `<path d="M53 61q7 7 14 0" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`,
    miss: `<path d="M54 64q6-4 12 0" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`,
    sleepy: `<ellipse cx="60" cy="63" rx="3" ry="3.5" fill="${dark}"/>`,
  }[mood];
  const extra = mood === 'happy' ? '<path d="M96 22l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5zM18 36l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#ffd34d"/>'
    : mood === 'sleepy' ? `<text x="92" y="30" font-size="14" font-weight="800" fill="var(--primary-text,#6c5ce7)">z</text><text x="100" y="19" font-size="10" font-weight="800" fill="var(--primary-text,#6c5ce7)">z</text>`
    : mood === 'miss' ? '<circle cx="96" cy="26" r="3" fill="var(--primary-2)" opacity=".6"/><circle cx="104" cy="15" r="5" fill="var(--primary-2)" opacity=".5"/>' : '';
  const aura = stage >= 3 ? '<circle cx="60" cy="56" r="52" fill="none" stroke="#ffd34d" stroke-width="2" stroke-dasharray="3 7" opacity=".8"/>' : '';
  const sprout = stage >= 1 && !eq.head ? '<path d="M61 18v-9" stroke="#3f9d5a" stroke-width="3" stroke-linecap="round"/><path d="M61 11q-12-2-13-11 11-1 13 11zM61 11q12-2 13-11-11-1-13 11z" transform="translate(0 2)" fill="#5fcf80"/>' : '';
  const head = {
    cap: '<path d="M32 28q4-18 30-18t28 18z" fill="#e8504a"/><path d="M28 28h68q3 0 3 3t-3 3H30q-3 0-2-6z" fill="#c43a35"/><circle cx="62" cy="10" r="2.6" fill="#fff"/>',
    crown: '<path d="M36 22l-4-18 14 10 14-14 14 14 14-10-4 18z" fill="#ffd34d" stroke="#d9a400" stroke-width="2" stroke-linejoin="round"/><circle cx="46" cy="14" r="2" fill="#e8504a"/><circle cx="62" cy="9" r="2" fill="#4a90e8"/><circle cx="78" cy="14" r="2" fill="#e8504a"/>',
    pumpkin: '<ellipse cx="62" cy="16" rx="24" ry="14" fill="#f28c28" stroke="#c96a0f" stroke-width="2.5"/><path d="M62 3q-6 8 0 26M48 6q-8 10-2 22M76 6q8 10 2 22" stroke="#c96a0f" stroke-width="2" fill="none"/><path d="M60 3q0-7 6-8" stroke="#3f9d5a" stroke-width="4" stroke-linecap="round" fill="none"/>',
    lotus: '<path d="M62 22q-16-4-18-20 14 2 18 20zM62 22q16-4 18-20-14 2-18 20zM62 22q-5-12 0-24 5 12 0 24z" fill="#ff8fb8" stroke="#e0609a" stroke-width="2"/><path d="M62 24q-12 0-24-6 10 10 24 10zM62 24q12 0 24-6-10 10-24 10z" fill="#ffc0d8"/><ellipse cx="62" cy="-4" rx="2.4" ry="4" fill="#ffd34d"/>',
    party: '<path d="M44 24L62-8 80 24z" fill="#8f7be0" stroke="#5b46c4" stroke-width="2" stroke-linejoin="round"/><path d="M50 16h24M55 6h14" stroke="#ffd34d" stroke-width="3"/><circle cx="62" cy="-9" r="4" fill="#ff6b9b"/>',
    phones: '<path d="M30 40q0-30 31-30t31 30" fill="none" stroke="#3d3d46" stroke-width="5" stroke-linecap="round"/><rect x="23" y="38" width="12" height="20" rx="6" fill="#3d3d46"/><rect x="87" y="38" width="12" height="20" rx="6" fill="#3d3d46"/>',
  }[(eq.head || '')] || '';
  const face = eq.face === 'glasses' ? `<g fill="rgba(255,255,255,.35)" stroke="${dark}" stroke-width="2.6"><circle cx="50" cy="49" r="10"/><circle cx="70" cy="49" r="10"/></g><path d="M58.5 48h3" stroke="${dark}" stroke-width="2.6" fill="none"/>` : '';
  const body = { garland: '<g stroke="#fff" stroke-width="1.2"><circle cx="40" cy="82" r="5" fill="#ff6b9b"/><circle cx="50" cy="86" r="5" fill="#ffd34d"/><circle cx="60" cy="88" r="5" fill="#ff8c42"/><circle cx="70" cy="86" r="5" fill="#ffd34d"/><circle cx="80" cy="82" r="5" fill="#ff6b9b"/></g>', bow: '<path d="M60 84l-14-8v14zM60 84l14-8v14z" fill="#ff6b9b"/><circle cx="60" cy="84" r="4" fill="#e04c80"/>' }[(eq.body || '')] || '';
  const cape = eq.body === 'cape' ? '<path d="M34 50Q20 80 24 98q18-8 36-6 18-2 36 6 4-18-10-48z" fill="#e8504a" opacity=".95"/>' : '';
  return `<svg class="mascot" viewBox="-6 -12 132 136" width="${size}" height="${size}" role="img" aria-label="น้องคำ มาสคอต อารมณ์${{ happy: 'ดีใจ', normal: 'ปกติ', miss: 'คิดถึง', sleepy: 'ง่วง' }[mood]}">
    ${aura}${cape}
    <path d="M30 30Q30 18 44 18H78Q92 18 92 32V70Q92 84 78 84H54L38 102L40 84Q30 82 30 70Z" fill="var(--primary-2)" stroke="var(--primary)" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="46" cy="28" rx="12" ry="5" fill="#fff" opacity=".3"/>
    <ellipse cx="42" cy="60" rx="5.5" ry="3.5" fill="#ff8fa3" opacity=".6"/><ellipse cx="78" cy="60" rx="5.5" ry="3.5" fill="#ff8fa3" opacity=".6"/>
    ${eyes}${face}${mouth}${body}${head}${sprout}${extra}
    <ellipse cx="46" cy="104" rx="9" ry="4" fill="var(--primary)" opacity=".85"/><ellipse cx="74" cy="104" rx="9" ry="4" fill="var(--primary)" opacity=".85"/>
  </svg>`;
}

/* ---------- mystery box (once a day, when the goal ring is closed) ---------- */
function boxReady() { return todayClosed() && (!S.box || S.box.date !== today()); }
function openBox() {
  if (!boxReady()) return null;
  const r = Math.random(), lockedItems = ITEMS.filter((it) => !it.evt && !itemOpen(it.id));
  let text;
  if (r >= 0.8 && lockedItems.length) {
    const it = lockedItems[Math.floor(Math.random() * lockedItems.length)];
    (S.owned = S.owned || []).push(it.id);
    text = `${it.ic} ${it.name} (ปลดล็อกก่อนเวลา!)`;
  } else if (r >= 0.55 && S.freeze < MAX_FREEZE) { S.freeze++; text = '🧊 ตัวกันสตรีค 1 อัน'; }
  else { const xp = 20 + 5 * Math.floor(Math.random() * 7); addXP(xp); text = `⭐ +${xp} XP`; }
  S.box = { date: today(), got: text };
  S.counts.boxes = (S.counts.boxes || 0) + 1;
  save(); confetti(); toast(`🎁 กล่องรางวัลวันนี้: ${text}`);
  return text;
}

/* ---------- home card + wardrobe page ---------- */
function mascotCard() {
  const mood = mascotMood(), st = mascotStage();
  const box = boxReady() ? '<button class="btn primary" id="boxOpen">🎁 เปิดกล่องรางวัลวันนี้</button>' : S.box && S.box.date === today() ? `<div class="small muted">🎁 วันนี้ได้: ${esc(S.box.got)}</div>` : '';
  return `<div class="card-box mascot-card"><button class="mascot-pic" data-go="mascot" aria-label="แต่งตัวน้องคำ">${mascotSvg({ mood, size: 88 })}</button>
    <div class="grow"><b>น้องคำ <span class="small muted">· ${st.name}</span></b><div class="small" style="margin:2px 0 8px">${mascotSay(mood)}</div>
    ${box}</div></div>`;
}
function renderMascot() {
  const mood = mascotMood(), st = mascotStage(), eq = (S.mascot = S.mascot || { equip: {} }).equip, L = levelOf(S.xp);
  const chip = (it, on, attr) => {
    const open = itemOpen(it.id);
    return `<button class="chip wd${on ? ' on' : ''}" ${attr}${open ? '' : ' disabled'} aria-pressed="${on}">${it.ic} ${it.name}${open ? '' : it.evt ? ' 🔒 กิจกรรมเทศกาล' : ` 🔒 Lv.${it.lv}`}</button>`;
  };
  const SLOTS = [['head', 'บนหัว'], ['face', 'ใบหน้า'], ['body', 'ตัว']];
  view.innerHTML = `<div class="row" style="margin:4px 0 12px"><button class="btn ghost" id="mBack">‹ กลับ</button></div>
    <div class="card-box center pop"><div id="mPic">${mascotSvg({ mood, size: 168 })}</div>
      <div class="h2" style="margin:4px 0">น้องคำ · ${st.name}</div><p class="small">${mascotSay(mood)}</p>
      <p class="small muted">${st.next ? `จำคำได้อีก ${st.next.need} คำ จะโตเป็น “${st.next.name}”` : 'โตเต็มที่แล้ว เก่งมาก!'} · Lv.${L}</p></div>
    ${SLOTS.map(([slot, label]) => `<div class="h2">${label}</div><div class="chips">
      <button class="chip wd${eq[slot] ? '' : ' on'}" data-eq="${slot}:">ไม่ใส่</button>
      ${ITEMS.filter((it) => it.kind === 'acc' && it.slot === slot).map((it) => chip(it, eq[slot] === it.id.slice(4), `data-eq="${slot}:${it.id.slice(4)}"`)).join('')}</div>`).join('')}
    <div class="h2">ธีมสีพิเศษ</div><div class="chips">${ITEMS.filter((it) => it.kind === 'pal').map((it) => chip(it, S.settings.palette === it.id.slice(4), `data-pal="${it.id.slice(4)}"`)).join('')}</div>
    <div class="h2">กรอบการ์ด</div><div class="chips"><button class="chip wd${S.settings.frame ? '' : ' on'}" data-frame="">ปกติ</button>
      ${ITEMS.filter((it) => it.kind === 'frame').map((it) => chip(it, S.settings.frame === it.id.slice(6), `data-frame="${it.id.slice(6)}"`)).join('')}</div>
    <p class="small muted center" style="margin-top:14px">ได้ของใหม่ทุก 5 เลเวล หรือลุ้นก่อนเวลาจาก 🎁 กล่องรางวัลที่เปิดได้วันละครั้งเมื่อทำเป้าวันนี้ครบ</p>`;
  $('#mBack').onclick = () => go('home');
  view.onclick = (e) => {
    const a = e.target.closest('[data-eq]'), p = e.target.closest('[data-pal]'), f = e.target.closest('[data-frame]');
    if (a) { const [slot, id] = a.dataset.eq.split(':'); eq[slot] = id; S.mascot.at = Date.now(); save(); renderMascot(); }
    else if (p) { S.settings.palette = p.dataset.pal; save(); applyTheme(); renderMascot(); }
    else if (f) { S.settings.frame = f.dataset.frame; save(); renderMascot(); }
  };
  cleanup = () => { view.onclick = null; };
}
