# Notes for Claude

"Vocab 3000" — a vocabulary trainer for the Oxford 3000/5000 word lists: a static, vanilla-JS PWA hosted on GitHub Pages
(`https://nopjorn.github.io/language-3000-oxfords/`, branch `master`, repo root).
Main target is iPhone (Pro Max, home-screen app). The owner talks in Thai; reply in Thai.

## Release rules (every push)
- Bump the version on **every** push: `APP_VERSION` in `app.js` and `VERSION` in `sw.js`
  (`o3k-<same version>`), and add a row to the changelog table at the end of `README.md`.
  Tell the user the new version number.
- Patch (x.y.Z) for small fixes, minor (x.Y.0) for new features.
- Push directly to `master` (no PRs unless asked).
- The in-app manual (`GUIDE` / `renderGuide()` in `app.js`, route `guide`) describes every feature
  in Thai: update it whenever a feature is added or changed.
- The version is shown at the bottom of the home and settings screens so the user can
  check whether the iPhone has picked up the update.

## Files
| File | Role |
|---|---|
| `index.html` | Shell: top bar, `#view`, tab bar |
| `app.js` | All logic (single file, sections marked `/* ---------- name ---------- */`) |
| `style.css` | Mobile-first styles; colour tokens on `:root` with dark mode |
| `words.js` | `window.WORDS = [[word, pos, level, ipa, thai, example, thaiExample, 5?], ...]` (4,957 rows) |
| `sw.js` | Network-first service worker with versioned cache |
| `reminders/HHMM.ics` | Static daily-reminder calendar files (app URL hardcoded inside) |
| `icons/`, `manifest.webmanifest` | PWA install assets |

Study groups (`w.g`): `A1 A2 B1 B2` = Oxford 3000; `B2x` (shown "B2+") and `C1` = Oxford 5000-only
(rows with trailing `5`).

## State (localStorage key `oxford3000.v1` — never rename it, or users lose progress)
- `prog[word] = { b: box, d: due ms, s: seen, c: correct, x: wrong }`
- `settings`, `daily`, `streak {last,count}`, `freeze`, `best`, `hist`, `star`, `ach`, `quest`,
  `counts`, `backupAt`, `backupSnooze`, `remind`, `xp` (seeded from existing progress when null)
- When adding a field: add it to `defaults()` (load() shallow-merges top-level keys) **and** handle it
  in `mergeBackup()` so importing a backup keeps it.
- `save()` also runs `checkAch()` (achievements).

## Learning logic
- Leitner boxes: `INTERVALS = [0, 1, 3, 7, 16, 35, 80, 180]` days; `b >= MASTERED (4)` = "จำได้แล้ว".
- Grades: 0 ลืม (box 0, requeue in session), 1 ยาก (keep box; new cards "วนอีกรอบ" via `relearn`),
  2 จำได้ (+1), 3 ง่าย (+2). Games use the lighter `gameResult()`; a failed pronunciation in the
  speak game does not reset the card.
- XP: `addXP()`; level L starts at 25·L·(L−1) XP. Flashcard 2 (ลืม 1), right answer `comboXP(combo)`.
- Feed (`renderFeed`, route/tab `feed`): due → new (learn card, quiz 3 cards later, counts toward
  `daily.fresh`) → practice. Uses `gameResult()`. Start screen: `settings.start`.
- Streak freezes: +1 per 7-day streak, max 2, auto-used for missed days.

## Content / copyright
- Only word, POS, CEFR level and IPA came from the Oxford list (via a GitHub CSV). Thai meanings and
  all example sentences are original — never copy Oxford definitions or examples.
- "Oxford 3000/5000" is an OUP trademark. Since 1.8.1 the app is branded "Vocab 3000": never use "Oxford"
  in the app name, icon, titles or headings. Mention it only descriptively (the settings-page footer
  disclaimer, README "แหล่งข้อมูล", links to Oxford Learner's Dictionaries).
- The word-list selection/CEFR levels/IPA are still OUP-derived: if the app is ever sold, flag that the
  list should be replaced (e.g. an openly licensed list such as NGSL).

## Testing
- Serve: `nohup python3 -m http.server 8765 >/dev/null 2>&1 &`; stop with
  `kill $(pgrep -f "[h]ttp.server 8765")` (`pkill -f` kills the calling shell).
- Playwright scripts live in the scratchpad (`pw/`), using
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, `args: ['--headless=new']`,
  viewport 440×956. Collect `pageerror` events and assert none.
- Seed state by writing `localStorage['oxford3000.v1']` and reloading; app functions
  (`go`, `questEvent`, `W`, …) are globals and can be called via `page.evaluate`.
- Speech recognition mock must replace **both** `window.SpeechRecognition` and
  `window.webkitSpeechRecognition` (Chromium has the unprefixed one natively).
- Test the correct-answer path **and** the wrong-answer path of every game: v1.6.0 shipped a bug where
  `querySelector('[data-sayex]')` was null after a correct answer, which broke the Next button.
  Null-check optional elements before binding handlers.
- `#view` is the scroll container (screenshots with `fullPage` won't scroll it; set `view.scrollTop`).
- Things headless can't verify (say so to the user): real iOS speech synthesis/recognition, sound
  effects in silent mode, share sheet, adding `.ics` to the iPhone calendar.

## iOS gotchas
- Home-screen app storage is separate from Safari; deleting the icon deletes progress.
- Users update by closing/reopening the app online (network-first SW), not by re-adding the icon.
- Speech needs a user gesture first; speech recognition may be unavailable in standalone mode.
