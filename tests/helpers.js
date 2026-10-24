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
    window.__rates = []; // u.rate of each utterance (slow speech)
    const synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      speak(u) { window.__said.push(u.text); window.__rates.push(Math.round(u.rate * 100) / 100); setTimeout(() => { if (u.onend) u.onend({}); }, 10); },
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

// Fake Supabase for sync tests. `store` is shared by every page that uses it (one cloud, several devices):
// { data: null | the saved state, writes: number }. The app talks to the same origin as the test server, so no CORS preflight.
// Sign-in is faked with a saved token (same user id on every device); `syncNow(true)` then runs one sync round.
async function fakeSupabase(page, store, uid = 'user-1') {
  await page.route('**/config.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.SYNC_CONFIG = { url: 'http://localhost:8765', anonKey: 'x', requireLogin: false, leaderboard: false };" }));
  await page.route('**/rest/v1/progress*', (r) => {
    const req = r.request();
    if (req.method() === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(store.data ? [{ data: store.data }] : []) });
    store.data = JSON.parse(req.postData()).data; store.writes = (store.writes || 0) + 1;
    return r.fulfill({ status: 201, body: '' });
  });
  await page.addInitScript((id) => localStorage.setItem('o3k.auth', JSON.stringify({ access_token: 't', refresh_token: 'r', user: { id, email: 'a@b.c' } })), uid);
}
const syncOnce = async (page) => { // wait for the sync the app starts by itself at boot, then run one round
  await page.waitForFunction(() => !syncState.busy);
  return page.evaluate(() => syncNow(true));
};

module.exports = { openApp, readState, KEY, fakeSupabase, syncOnce };
