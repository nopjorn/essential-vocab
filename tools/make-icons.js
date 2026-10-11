const { chromium } = require('playwright');
// Regenerates icons/*.png from the SVG below. Run from a folder with playwright installed:
//   node tools/make-icons.js <unused> icons
const OUT = process.argv[2], DEST = process.argv[3];
const svg = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7b5cff"/><stop offset=".55" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <radialGradient id="glow" cx=".25" cy=".15" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="txt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c4cf5"/><stop offset="1" stop-color="#c026d3"/></linearGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#3b0764" flood-opacity=".35"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
    <!-- back card (Thai) -->
    <g transform="rotate(-12 256 262)" filter="url(#sh)">
      <rect x="96" y="112" width="230" height="290" rx="34" fill="#fde7f3"/>
      <text x="142" y="200" font-family="Loma, sans-serif" font-weight="700" font-size="64" fill="#ec4899" text-anchor="middle">ก</text>
    </g>
    <!-- front card (English) -->
    <g transform="translate(26 6) rotate(8 256 262)" filter="url(#sh)">
      <rect x="160" y="128" width="230" height="290" rx="34" fill="#ffffff"/>
      <text x="275" y="306" font-family="DejaVu Sans, Arial, sans-serif" font-weight="800" font-size="118" fill="url(#txt)" text-anchor="middle" letter-spacing="-4">Aa</text>
      <rect x="215" y="346" width="120" height="12" rx="6" fill="#ede9fe"/>
    </g>
    <!-- sparkle -->
    <path d="M436 58 l10 26 26 10 -26 10 -10 26 -10 -26 -26 -10 26 -10z" fill="#fff" opacity=".95"/>
    <path d="M100 68 l6 15 15 6 -15 6 -6 15 -6 -15 -15 -6 15 -6z" fill="#fff" opacity=".8"/>
  </g>
</svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--headless=new'] });
  for (const [name, size, scale] of [['icon-512', 512, 1], ['icon-192', 192, 1], ['apple-touch-icon', 180, 1], ['icon-maskable-512', 512, 0.8]]) {
    const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0">${svg(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: `${DEST}/${name}.png`, omitBackground: false });
  }
  await b.close();
})();
