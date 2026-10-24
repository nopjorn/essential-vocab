const { chromium } = require('playwright');
// Regenerates icons/*.png from the SVG below. Run from a folder with playwright installed:
//   node tools/make-icons.js <unused> icons
const OUT = process.argv[2], DEST = process.argv[3];
// App-icon styles (settings → หน้าตา → ไอคอนแอป): id → colours. 'purple' is the default icon.
const STYLES = {
  purple: { bg: ['#7b5cff', '#a855f7', '#ec4899'], back: '#fde7f3', thai: '#ec4899', front: '#ffffff', txt: ['#6c4cf5', '#c026d3'], bar: '#ede9fe', spark: '#ffffff', glow: 0.35 },
  dark:   { bg: ['#17142b', '#241a45', '#3a1f5c'], back: '#3b2f63', thai: '#f0abfc', front: '#f5f3ff', txt: ['#6c4cf5', '#c026d3'], bar: '#ddd6fe', spark: '#c4b5fd', glow: 0.12 },
  black:  { bg: ['#000000', '#0b0b12', '#16101f'], back: '#2a2540', thai: '#f472b6', front: '#ffffff', txt: ['#7c5cff', '#d946ef'], bar: '#ddd6fe', spark: '#a78bfa', glow: 0.06 },
  light:  { bg: ['#ffffff', '#f3efff', '#ffe4f1'], back: '#fbcfe8', thai: '#be185d', front: '#ffffff', txt: ['#6c4cf5', '#c026d3'], bar: '#ddd6fe', spark: '#a855f7', glow: 0 },
  ocean:  { bg: ['#0a6fc2', '#1d9bd1', '#5bc8e0'], back: '#e0f7fa', thai: '#0891b2', front: '#ffffff', txt: ['#0a6fc2', '#0891b2'], bar: '#cffafe', spark: '#ffffff', glow: 0.35 },
  sakura: { bg: ['#c03a78', '#e8609a', '#f7b3cc'], back: '#fff0f6', thai: '#c03a78', front: '#ffffff', txt: ['#be185d', '#e11d77'], bar: '#fce7f3', spark: '#ffffff', glow: 0.35 },
};
const svg = (scale, c = STYLES.purple) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.bg[0]}"/><stop offset=".55" stop-color="${c.bg[1]}"/><stop offset="1" stop-color="${c.bg[2]}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".25" cy=".15" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="${c.glow}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="txt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.txt[0]}"/><stop offset="1" stop-color="${c.txt[1]}"/></linearGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#3b0764" flood-opacity=".35"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
    <!-- back card (Thai) -->
    <g transform="rotate(-12 256 262)" filter="url(#sh)">
      <rect x="96" y="112" width="230" height="290" rx="34" fill="${c.back}"/>
      <text x="142" y="200" font-family="Loma, sans-serif" font-weight="700" font-size="64" fill="${c.thai}" text-anchor="middle">ก</text>
    </g>
    <!-- front card (English) -->
    <g transform="translate(26 6) rotate(8 256 262)" filter="url(#sh)">
      <rect x="160" y="128" width="230" height="290" rx="34" fill="${c.front}"/>
      <text x="275" y="306" font-family="DejaVu Sans, Arial, sans-serif" font-weight="800" font-size="118" fill="url(#txt)" text-anchor="middle" letter-spacing="-4">Aa</text>
      <rect x="215" y="346" width="120" height="12" rx="6" fill="${c.bar}"/>
    </g>
    <!-- sparkle -->
    <path d="M436 58 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10z" fill="${c.spark}" opacity=".95"/>
    <path d="M100 68 l6 15 15 6 -15 6 -6 15 -6 -15 -15 -6 15 -6z" fill="${c.spark}" opacity=".8"/>
  </g>
</svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--headless=new'] });
  for (const [name, size, scale] of [['icon-512', 512, 1], ['icon-192', 192, 1], ['apple-touch-icon', 180, 1], ['icon-maskable-512', 512, 0.8]]) {
    const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0">${svg(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: `${DEST}/${name}.png`, omitBackground: false });
  }
  for (const [id, c] of Object.entries(STYLES)) { // 180px touch icon per style (the home-screen icon iOS copies)
    const p = await b.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0">${svg(1, c).replace('width="512" height="512"', 'width="180" height="180"')}</body></html>`);
    await p.screenshot({ path: `${DEST}/apple-touch-icon-${id}.png` });
  }
  await b.close();
  try { require('child_process').execFileSync('python3', [require('path').join(__dirname, 'optimize-icons.py'), DEST], { stdio: 'inherit' }); } catch (e) { console.log('optimize-icons.py skipped:', e.message); } // lossless recompression
})();
