// Shared setup: sync off, fake speech synthesis/recognition, page errors collected.
const { expect } = require('@playwright/test');

const KEY = 'oxford3000.v1';

// Opens the app with sync disabled. `state` (optional) is merged into a fresh localStorage save.
async function openApp(page, state) {
  if (state && state.seenVer === undefined) state = { ...state, seenVer: '99.0.0' }; // keep the what's-new bar out of other tests
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/config.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.SYNC_CONFIG = { url: '', anonKey: '' };" }));
  await page.addInitScript(([key, st]) => {
    if (st && !sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); }
    // Speech synthesis: record what was said, finish each utterance right away.
    window.__said = [];
    const synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      speak(u) { window.__said.push(u.text); setTimeout(() => { if (u.onend) u.onend({}); }, 10); },
      cancel() {}, pause() {}, resume() {}, getVoices: () => [],
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    // Speech recognition (both names: Chromium has the unprefixed one natively): "hears" window.__heard.
    class FakeRec {
      start() { setTimeout(() => { if (this.onresult) this.onresult({ results: [[{ transcript: window.__heard || '' }]] }); if (this.onend) this.onend(); }, 20); }
      stop() {} abort() {}
    }
    window.SpeechRecognition = FakeRec;
    window.webkitSpeechRecognition = FakeRec;
  }, [KEY, state || null]);
  await page.goto('index.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  return errors;
}

const readState = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);

module.exports = { openApp, readState, KEY };
