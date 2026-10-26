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
  const id = skyId();
  return { cls: ` sk-${id}${time ? ' sky-time' : ''}${art ? ' sky-art' : ''}`, style: ` style="${skyVars(id, time)}"`, scene: art ? skyScene(id) : '', disc: art ? '<i class="ring-disc" aria-hidden="true"></i>' : '' };
}
// Settings: a small card per time of day (always the full time-of-day look) so every sky can be seen.
function skyGallery() {
  const now = skyId();
  return `<div class="sky-grid" id="skyPrev" role="list" aria-label="ท้องฟ้าทั้ง 6 ช่วงเวลา">${Object.keys(SKY).map((id) => {
    const k = SKY[id];
    return `<div class="sk-mini sk-${id}${id === now ? ' now' : ''}" role="listitem" style="${skyVars(id, true)}">${skyScene(id)}<i class="ring-disc" aria-hidden="true"></i><div class="sk-cap"><b>${k.emo} ${k.name}</b><span>${k.hrs}</span>${id === now ? '<em class="sk-now">ตอนนี้</em>' : ''}</div></div>`;
  }).join('')}</div>`;
}
