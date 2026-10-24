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

// Answers the current question right (ok) or wrong. Returns false if no question is on screen.
// `round.at` = position of the right option, learnt from the first answer: Math.random is pinned
// for choice games, so the options come out in the same order every question.
async function answer(page, ok, round) {
  const view = page.locator('#view');
  if (await view.locator('.opt').count()) {
    const at = round.at == null ? 0 : ok ? round.at : +!round.at;
    await view.locator('.opt').nth(at).click();
    round.at = await view.locator('.opt').evaluateAll((els) => els.findIndex((e) => e.classList.contains('correct')));
  } else if (await view.locator('#oPool').count()) {
    if (ok) {
      const k = await view.locator('#oPool .ord-chip').count();
      for (let i = 0; i < k; i++) await view.locator(`#oPool [data-k="${i}"]`).click();
    } else await view.locator('#oGive').click();
  } else if (await view.locator('#mic').count()) {
    if (ok) {
      await view.locator('[data-say]').first().click();
      await page.evaluate(() => (window.__heard = window.__said.at(-1)));
      await view.locator('#mic').click();
    } else {
      await page.evaluate(() => (window.__heard = 'zzzz'));
      for (let i = 0; i < 3; i++) { await view.locator('#mic').click(); await page.waitForTimeout(80); }
    }
  } else if (await view.locator('#si').count()) {
    if (!ok) { await view.locator('#skip').click(); }
    else {
      const dict = await view.locator('.q-prompt [data-say]').count();
      if (dict) await view.locator('.q-prompt [data-say]').click(); // speaks the full sentence
      const word = await page.evaluate(() => {
        const cloze = document.querySelector('.q-prompt .cloze');
        if (cloze) { // dictation: the missing word is what the spoken sentence has in place of the blank
          const [pre, post] = cloze.textContent.split('_____');
          const said = window.__said.at(-1);
          return said.slice(pre.length, said.length - post.length).trim();
        }
        const th = document.querySelector('.q-prompt .th').textContent;
        const hint = new RegExp('^' + document.querySelector('#hint').textContent.replace(/_/g, '[a-zA-Z]') + '$');
        return W.find((w) => w.t === th && hint.test(w.w)).w;
      });
      await view.locator('#si').fill(word);
      await view.locator('#sf button[type=submit]').click();
    }
  } else return false;
  return true;
}

async function playRound(page, id) {
  const view = page.locator('#view');
  const seen = { ok: 0, bad: 0 }, round = {};
  for (let n = 0; n < 12; n++) {
    if (await view.locator('.result-emoji').count()) break;
    const before = await view.locator('.progress > div').getAttribute('style');
    expect(await answer(page, n % 2 === 0, round), `${id}: question ${n} has no input`).toBe(true);
    await expect(view.locator('#reveal')).not.toBeEmpty();
    (await view.locator('#reveal').textContent()).includes('✅') ? seen.ok++ : seen.bad++;
    // Next works after either answer; a right answer may also advance by itself.
    const next = view.locator('#nextQ');
    if (await next.count()) await next.click().catch(() => {});
    await expect.poll(async () => (await view.locator('.result-emoji').count()) || (await view.locator('.progress > div').getAttribute('style').catch(() => null)) !== before, { message: `${id}: stuck on question ${n}` }).toBeTruthy();
  }
  await expect(view.locator('.result-emoji'), `${id}: result screen`).toBeVisible();
  return seen;
}

module.exports = { openApp, readState, KEY, fakeSupabase, syncOnce, answer, playRound };
