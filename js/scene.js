/* ---------- scene: hero card sky (1.97) ---------- */
// The home "today" card can take its colours from the theme (settings.heroBg 'theme', default) or from the
// time of day ('time'), and can carry a hand-drawn SVG scene (settings.heroArt, default on): sky body that the
// goal ring orbits (sun / moon), clouds, birds, stars, hills and a palm. Everything is drawn here, no image files.
const SKY_AT = [[300, 'morning'], [540, 'forenoon'], [720, 'afternoon'], [960, 'evening'], [1110, 'dusk'], [1320, 'night']];
// g = sky gradient top/middle/horizon (the top two stay dark enough for white text), h = hills back→front, cl = cloud
// colour, d = sun/moon gradient, ink = text colour on that disc, glow = r,g,b of the halo, pal = palm silhouette.
const SKY = {
  morning:   { name: 'เช้า', hrs: '05:00–08:59', emo: '🌅', g: ['#2f4f94', '#8a6fb3', '#f7a97e'], h: ['#b08ab5', '#8a6f9f', '#5f4f84'], cl: ['#ffd9d0', [[128, 76, .9, .3], [286, 150, .7, .26], [12, 172, .8, .22]]], d: ['#fff1b0', '#ffb868'], ink: '#4e2000', glow: '255,190,120', birds: [[170, 40, 1], [190, 52, .8], [208, 36, .9]] },
  forenoon:  { name: 'สาย', hrs: '09:00–11:59', emo: '☀️', g: ['#1a5fb0', '#2877c0', '#8fcdf0'], h: ['#7fc58a', '#4aa56a', '#2f8656'], cl: ['#ffffff', [[120, 84, 1, .26], [278, 142, .8, .24], [20, 168, .7, .2]]], d: ['#fffbd0', '#ffe36b'], ink: '#472a00', glow: '255,240,150', birds: [[160, 44, 1], [182, 56, .8]] },
  afternoon: { name: 'บ่าย', hrs: '12:00–15:59', emo: '🌤️', g: ['#0e6b8a', '#1f8aa3', '#f3d98c'], h: ['#9bc77a', '#5fae6c', '#2f8a5a'], cl: ['#fff6dc', [[140, 80, .9, .26], [272, 146, .75, .22], [14, 164, .7, .2]]], d: ['#fff7c2', '#ffd23f'], ink: '#472600', glow: '255,226,120' },
  evening:   { name: 'เย็น', hrs: '16:00–18:29', emo: '🌇', g: ['#3d2a7a', '#c2477a', '#ff9a52'], h: ['#8a3f7e', '#5a2f70', '#331f55'], cl: ['#ffb4a0', [[126, 82, .9, .26], [282, 152, .7, .22], [10, 176, .8, .2]]], d: ['#ffe0a0', '#ff8a4a'], ink: '#3a0f05', glow: '255,140,90', birds: [[150, 52, 1], [170, 44, .9], [192, 56, .8], [212, 46, .7]], palm: '#2a1648' },
  dusk:      { name: 'มืด', hrs: '18:30–21:59', emo: '🌙', g: ['#0f1a4a', '#2a2f80', '#6a4a9c'], h: ['#2a3a85', '#1d2a68', '#121b47'], cl: ['#b8a8f0', [[132, 84, .9, .1], [284, 150, .7, .09]]], d: ['#f6f2d8', '#d9d4ee'], ink: '#1c2556', glow: '180,190,255', stars: 22, palm: '#0c1238' },
  night:     { name: 'ดึก', hrs: '22:00–04:59', emo: '🌌', g: ['#060a1f', '#0f1842', '#1b2a5c'], h: ['#17235a', '#101946', '#0a1133'], cl: ['#8a96e0', [[140, 86, .9, .07]]], d: ['#fffbe6', '#e8e4f6'], ink: '#141c4a', glow: '200,210,255', stars: 46, shoot: 1, palm: '#060a22' }
};
// Optional "main colour follows the time of day" (settings.palAuto): each sky maps to an existing palette; a locked one falls back to violet in applyTheme().
const SKY_PAL = { morning: 'sakura', forenoon: 'ocean', afternoon: 'mint', evening: 'orange', dusk: 'violet', night: 'galaxy' };
const skyPalette = (d) => SKY_PAL[skyId(d)];
function skyId(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes();
  let id = 'night';
  for (const [t, k] of SKY_AT) if (m >= t) id = k;
  return id;
}
// Fixed star field (same stars on every render): small linear-congruential generator.
function skyStars(n) {
  let s = 20261026;
  const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (r() * 400).toFixed(1), y = (r() * 190).toFixed(1), rad = (0.6 + r() * 0.9).toFixed(2), o = (0.45 + r() * 0.55).toFixed(2);
    out += `<circle class="sc-star${i % 4 === 0 ? ' tw' : ''}" cx="${x}" cy="${y}" r="${rad}" opacity="${o}"${i % 4 === 0 ? ` style="animation-delay:${(r() * 4).toFixed(1)}s"` : ''}/>`;
  }
  return out;
}
const SKY_PALM = '<path d="M57 130C62 100 57 78 49 50L55 49C64 76 68 100 66 130Z"/><path d="M52 50C40 38 22 38 8 52 24 46 38 48 52 50Z"/><path d="M52 50C62 34 82 32 96 44 80 42 64 46 52 50Z"/><path d="M52 50C44 30 34 18 22 14 36 24 46 34 52 50Z"/><path d="M52 50C58 28 70 16 84 12 70 22 60 34 52 50Z"/><path d="M52 50C50 34 52 20 54 8 56 22 56 36 52 50Z"/><path d="M52 50C36 54 24 66 20 82 32 68 42 60 52 50Z"/><path d="M52 50C68 54 80 64 86 80 74 68 62 60 52 50Z"/>';
// The scene layer: absolutely positioned behind the card content (CSS .hero-scene), aria-hidden.
function skyScene(id) {
  const k = SKY[id] || SKY.night;
  const cloud = ([x, y, s, o]) => `<g class="sc-cloud" transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><ellipse cx="30" cy="22" rx="30" ry="8"/><circle cx="19" cy="15" r="10"/><circle cx="34" cy="10" r="13"/><circle cx="48" cy="16" r="9"/></g>`;
  const bird = ([x, y, s]) => `<path class="sc-bird" transform="translate(${x} ${y}) scale(${s})" d="M0 0q4-5 8 0 4-5 8 0"/>`;
  const sky = `<svg class="sc-sky" viewBox="0 0 400 300" preserveAspectRatio="xMidYMin slice" focusable="false">${k.stars ? skyStars(k.stars) : ''}${k.shoot ? '<line class="sc-shoot" x1="250" y1="34" x2="222" y2="22"/>' : ''}${k.cl[1].map(cloud).join('')}${(k.birds || []).map(bird).join('')}</svg>`;
  const hills = '<svg class="sc-hills" viewBox="0 0 400 150" preserveAspectRatio="none" focusable="false"><path class="h1" d="M0 70C40 40 90 30 140 55S230 85 280 50 360 20 400 45V150H0Z"/><path class="h2" d="M0 95C50 70 110 65 170 90S280 115 340 80 385 70 400 78V150H0Z"/><path class="h3" d="M0 120C60 105 120 112 190 125S300 130 400 108V150H0Z"/></svg>';
  const palm = k.palm ? `<svg class="sc-palm" viewBox="0 0 100 130" focusable="false">${SKY_PALM}</svg>` : '';
  return `<div class="hero-scene" aria-hidden="true">${sky}${hills}${palm}</div>`;
}
// CSS variables for the hero (colours that depend on the slot). time = also paint the sky gradient.
function skyVars(id, time) {
  const k = SKY[id] || SKY.night;
  const hills = time ? k.h : ['rgba(0,0,0,.07)', 'rgba(0,0,0,.12)', 'rgba(0,0,0,.18)'];
  const v = [`--h1:${hills[0]}`, `--h2:${hills[1]}`, `--h3:${hills[2]}`, `--cl:${k.cl[0]}`, `--d1:${k.d[0]}`, `--d2:${k.d[1]}`, `--ink:${k.ink}`, `--glowc:${k.glow}`, `--palm:${time ? k.palm || k.h[2] : 'rgba(0,0,0,.22)'}`];
  if (time) v.push(`--sky:linear-gradient(180deg,${k.g[0]},${k.g[1]} 55%,${k.g[2]})`, `--btn:${k.g[0]}`);
  return v.join(';');
}
// What the home hero needs: classes, inline style, scene markup and the disc inside the ring.
function heroSky() {
  const time = S.settings.heroBg === 'time', art = S.settings.heroArt !== false;
  if (!time && !art) return { cls: '', style: '', scene: '', disc: '' };
  const id = skyId(), fe = art ? festOn() : null, fx = fe ? festScene(fe) : '';
  return { cls: ` sk-${id}${time ? ' sky-time' : ''}${art ? ' sky-art' : ''}${fx ? ' fest-on' : ''}`, style: ` style="${skyVars(id, time)}"`, scene: art ? skyScene(id).replace(/<\/div>$/, `${fx}</div>`) : '', disc: art ? '<i class="ring-disc" aria-hidden="true"></i>' : '' };
}
// Settings: a small card per time of day (always the full time-of-day look) so every sky can be seen.
function skyGallery() {
  const now = skyId();
  return `<div class="sky-grid" id="skyPrev" role="list" aria-label="ท้องฟ้าทั้ง 6 ช่วงเวลา">${Object.keys(SKY).map((id) => {
    const k = SKY[id];
    return `<div class="sk-mini sk-${id}${id === now ? ' now' : ''}" role="listitem" style="${skyVars(id, true)}">${skyScene(id)}<i class="ring-disc" aria-hidden="true"></i><div class="sk-cap"><b>${k.emo} ${k.name}</b><span>${k.hrs}</span>${id === now ? '<em class="sk-now">ตอนนี้</em>' : ''}</div></div>`;
  }).join('')}</div>`;
}

/* ---------- festive sky (1.115) ---------- */
// While a seasonal event (js/events.js) is on, the hero sky gets an extra hand-drawn layer: bats and jack-o'-lanterns,
// rising sky lanterns and a krathong, water drops, snow and a tree, fireworks, hearts, red lanterns, jasmine.
// settings.fest (default on) also lets น้องคำ try the event costume on (festEquip in js/mascot.js). Decorative only (aria-hidden).
const festOn = () => (S.settings.fest !== false && typeof eventOn === 'function' ? eventOn() : null);
function festRand(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
// n moving things spread across the sky: f(x, y, size, delay, duration) → markup
function festMany(n, seed, f) {
  const r = festRand(seed);
  let out = '';
  for (let i = 0; i < n; i++) out += f((r() * 390 + 5).toFixed(0), (r() * 200).toFixed(0), 0.6 + r() * 0.7, (r() * 8).toFixed(1), (6 + r() * 6).toFixed(1));
  return out;
}
const FX_A = (cls, x, y, s, d, t, inner) => `<g transform="translate(${x} ${y})"><g class="${cls}" style="animation-delay:-${d}s;animation-duration:${t}s"><g transform="scale(${s.toFixed(2)})">${inner}</g></g></g>`;
const FX_HEART = '<path d="M0 6C-9-1-6-9 0-4 6-9 9-1 0 6z"/>';
const FX_FLOWER = '<g fill="#fff"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/></g><circle r="1.4" fill="#ffd34d"/>';
const FX_BAT = '<path class="fx-wing" d="M0 0C-4-4-10-5-15-2-12-1-11 1-12 3-9 1-6 2-5 4-3 2-1 2 0 3 1 2 3 2 5 4 6 2 9 1 12 3 11 1 12-1 15-2 10-5 4-4 0 0z"/>';
const FX_LANTERN = '<path d="M-6-9h12l-2 16h-8z" fill="#ffb347"/><path d="M-4 7h8" stroke="#ffe08a" stroke-width="2"/><ellipse cy="5" rx="3" ry="2" fill="#fff3b0"/>';
const FX_DROP = '<path d="M0-7C3-2 5 1 5 3A5 5 0 0 1-5 3C-5 1-3-2 0-7z" fill="#bfe8ff" stroke="#fff" stroke-width=".8" opacity=".9"/>';
const FX_BURST = (c) => `<g stroke="${c}" stroke-width="2" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, x1 = (Math.cos(a) * 6).toFixed(1), y1 = (Math.sin(a) * 6).toFixed(1), x2 = (Math.cos(a) * 20).toFixed(1), y2 = (Math.sin(a) * 20).toFixed(1); return `<path d="M${x1} ${y1}L${x2} ${y2}"/>`; }).join('')}</g><circle r="2.5" fill="#fff"/>`;
const FX_REDLANTERN = '<path d="M0-30V-12" stroke="#ffd34d" stroke-width="1.6"/><rect x="-5" y="-14" width="10" height="4" rx="1" fill="#d9a400"/><ellipse rx="15" ry="12" fill="#e8322d"/><path d="M-9-10Q-14 0-9 10M0-12V12M9-10Q14 0 9 10" stroke="#b81f1b" stroke-width="1.4" fill="none"/><rect x="-5" y="10" width="10" height="4" rx="1" fill="#d9a400"/><path d="M-2 14v10M0 14v12M2 14v10" stroke="#ffd34d" stroke-width="1.2"/>';
const FEST_SKY = {
  halloween: () => [[300, 34, 1.5], [340, 60, 1.1], [100, 44, 1.2], [200, 24, .9]].map(([x, y, s], i) => FX_A('fx-bat', x, y, s, i * 1.3, 4 + i, `<g fill="#1b1030">${FX_BAT}</g>`)).join(''),
  loy: () => festMany(12, 31, (x, y, s, d, t) => FX_A('fx-rise', x, +y + 80, s * 1.6, d * 2, +t + 8, FX_LANTERN)),
  songkran: () => festMany(18, 47, (x, y, s, d, t) => FX_A('fx-fall', x, -20, s * 1.2, d, +t / 2, FX_DROP)),
  christmas: () => festMany(34, 59, (x, y, s, d, t) => FX_A('fx-fall', x, -10, s, d, t, `<circle r="${(1.4 + s).toFixed(1)}" fill="#fff" opacity=".9"/>`)),
  newyear: () => [[300, 46, 1, '#ffd34d'], [356, 92, .7, '#ff8fb8'], [70, 40, .8, '#8fe0ff'], [230, 80, .6, '#b6ff8f']].map(([x, y, s, c], i) => FX_A('fx-burst', x, y, s, i * 0.9, 3.6, FX_BURST(c))).join(''),
  valentine: () => festMany(12, 71, (x, y, s, d, t) => FX_A('fx-rise', x, +y + 80, s, d, t, `<g fill="${+x % 2 ? '#ff5c8a' : '#ff9cc0'}" opacity=".9">${FX_HEART}</g>`)),
  cny: () => [[236, 30, .8], [380, 34, .9]].map(([x, y, s], i) => FX_A('fx-swing', x, y, s, i * 1.1, 3.2, FX_REDLANTERN)).join('') + festMany(10, 83, (x, y, s, d, t) => FX_A('fx-tw', x, y, s, d, 3, '<path d="M0-4L1 -1 4 0 1 1 0 4-1 1-4 0-1-1z" fill="#ffd34d"/>')),
  mother: () => festMany(14, 97, (x, y, s, d, t) => FX_A('fx-fall fx-sway', x, -12, s * 0.9, d, +t + 3, FX_FLOWER)),
};
// A prop in the open space between the big number and the goal ring (viewBox 120×60).
const FEST_GROUND = {
  halloween: '<g transform="translate(26 44)"><ellipse rx="17" ry="13" fill="#f28c28" stroke="#b85c0c" stroke-width="2"/><path d="M0-13q-5 13 0 26M-9-11q-6 11 0 23M9-11q6 11 0 23" stroke="#b85c0c" stroke-width="1.5" fill="none"/><path d="M-1-13q1-6 5-7" stroke="#3f6d2a" stroke-width="3" stroke-linecap="round" fill="none"/><g class="fx-glow" fill="#ffe36b"><path d="M-10-4l4-4 3 4zM10-4l-4-4-3 4zM-9 4q9 8 18 0l-3 2-3-2-3 2-3-2-3 2z"/></g></g><g transform="translate(58 50) scale(.62)"><ellipse rx="17" ry="13" fill="#e9761b" stroke="#b85c0c" stroke-width="2"/><path d="M-1-13q1-6 5-7" stroke="#3f6d2a" stroke-width="3" stroke-linecap="round" fill="none"/><g class="fx-glow" fill="#ffe36b"><circle cx="-6" cy="-3" r="3"/><circle cx="6" cy="-3" r="3"/><path d="M-7 5q7 5 14 0z"/></g></g>',
  loy: '<g transform="translate(34 48)"><path d="M-22 4q22 10 44 0l-4 6h-36z" fill="#3f8f4f"/><path d="M-18 4l4-10 4 8 4-11 4 11 4-8 4 10z" fill="#5fbf6a" stroke="#2f7a3e" stroke-width="1"/><circle cx="-8" cy="-4" r="3" fill="#ffd34d"/><circle cx="8" cy="-4" r="3" fill="#ff8fb8"/><path d="M0-6v-12" stroke="#fff" stroke-width="2.4"/><path class="fx-glow" d="M0-24q-3 3 0 6 3-3 0-6z" fill="#ffd34d"/></g><path d="M0 58q30-6 60 0t60 0" stroke="rgba(255,255,255,.45)" stroke-width="2" fill="none"/>',
  songkran: '<g transform="translate(30 46)"><path d="M-18-6h36l-5 16h-26z" fill="#d7dbe6" stroke="#9aa3b2" stroke-width="1.6"/><path d="M-18-6h36" stroke="#eef1f8" stroke-width="3"/><ellipse cy="-6" rx="16" ry="3" fill="#8fd3ff"/><path d="M-6-12q2-6 6-10M4-12q3-5 8-8" stroke="#bfe8ff" stroke-width="2" stroke-linecap="round" fill="none"/></g>',
  christmas: '<g transform="translate(30 58)"><path d="M0-52l14 20h-6l12 16h-7l13 16h-52l13-16h-7l12-16h-6z" fill="#2f8a5a" stroke="#1f6a42" stroke-width="1.5" stroke-linejoin="round"/><rect x="-4" y="0" width="8" height="2" fill="#7a4a2a"/><path class="fx-glow" d="M0-58l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#ffd34d"/><g class="fx-tw2"><circle cx="-6" cy="-30" r="2" fill="#ff5c5c"/><circle cx="7" cy="-20" r="2" fill="#ffd34d"/><circle cx="-10" cy="-10" r="2" fill="#5cb8ff"/><circle cx="12" cy="-6" r="2" fill="#ff8fb8"/></g></g>',
};
function festScene(e) {
  const sky = FEST_SKY[e.id], ground = FEST_GROUND[e.id];
  if (!sky && !ground) return '';
  return `<div class="fest fest-${e.id}" aria-hidden="true">${sky ? `<svg class="fx-sky" viewBox="0 0 400 300" preserveAspectRatio="xMidYMin slice" focusable="false">${sky()}</svg>` : ''}${ground ? `<svg class="fx-prop" viewBox="0 0 120 60" focusable="false">${ground}</svg>` : ''}</div>`;
}
