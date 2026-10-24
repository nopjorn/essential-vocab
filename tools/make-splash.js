const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// Regenerates icons/splash/*.png: the iOS launch images (apple-touch-startup-image) shown while the home-screen app starts.
// Light and dark sets, portrait and landscape, for the target devices. Run from the repo root (after npm ci):
//   node tools/make-splash.js
// The <link> tags in index.html must match DEVICES below (a test checks that every file exists and is linked).
const ROOT = path.join(__dirname, '..');
const DEVICES = [ // [name, css width, css height, pixel ratio]
  ['iphone-17-pro-max', 440, 956, 3],
  ['ipad-pro-11', 834, 1210, 2],
  ['ipad-pro-13', 1032, 1376, 2],
];
const THEMES = { light: { bg: '#f5f3ff', text: '#6c5ce7', sub: '#6b6890' }, dark: { bg: '#12111c', text: '#a29bfe', sub: '#a6a3c7' } };
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons/icon-512.png')).toString('base64');
const html = (w, h, t) => {
  const side = Math.round(Math.min(w, h) * 0.26); // icon size in CSS px
  return `<html><body style="margin:0;width:${w}px;height:${h}px;background:${t.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(side * 0.16)}px;font-family:'Noto Sans Thai','Loma','Sukhumvit Set',sans-serif">
    <img src="${icon}" style="width:${side}px;height:${side}px;border-radius:${Math.round(side * 0.2237)}px;box-shadow:0 ${Math.round(side * 0.08)}px ${Math.round(side * 0.24)}px rgba(76,61,190,.25)">
    <div style="font-size:${Math.round(side * 0.2)}px;font-weight:800;color:${t.text}">ศัพท์ต้องรู้</div>
    <div style="font-size:${Math.round(side * 0.1)}px;color:${t.sub}">Essential Vocab</div></body></html>`;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--headless=new'] });
  fs.mkdirSync(path.join(ROOT, 'icons/splash'), { recursive: true });
  const tags = [];
  for (const [name, w, h, dpr] of DEVICES) {
    for (const [theme, t] of Object.entries(THEMES)) {
      for (const orient of ['portrait', 'landscape']) {
        const [vw, vh] = orient === 'portrait' ? [w, h] : [h, w];
        const p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
        await p.setContent(html(vw, vh, t));
        await p.waitForTimeout(150);
        const file = `icons/splash/${name}-${theme}-${orient}.png`;
        await p.screenshot({ path: path.join(ROOT, file) });
        await p.close();
        tags.push(`<link rel="apple-touch-startup-image" href="${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orient}) and (prefers-color-scheme: ${theme})">`);
      }
    }
  }
  await b.close();
  console.log(tags.join('\n')); // paste into index.html <head>
})();
