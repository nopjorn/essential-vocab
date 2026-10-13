# Notes for Claude

"ศัพท์ต้องรู้" (Essential Vocab) — a vocabulary trainer for the Oxford 3000/5000 word lists: a static, vanilla-JS PWA hosted on GitHub Pages
(`https://nopjorn.github.io/essential-vocab/`, branch `master`, repo root).
Main targets: iPhone 17 Pro Max and iPad (M5), home-screen app, portrait **and** landscape. The owner talks in Thai; reply in Thai.

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
| `topics.js` | `window.TOPIC_CODES`: one letter per WORDS row → `TOPICS` in app.js (`w.tp`) |
| `stories.js` | `window.STORIES`: 80 original A1–B2 stories `{id, level, emoji, title, titleTh, en[], th[], q[{q,o,a}]}` |
| `supabase/functions/daily-reminder/index.ts` | Hourly Edge Function sending Web Push reminders (VAPID secrets in Supabase) |
| `config.js` | `window.SYNC_CONFIG = {url, anonKey, requireLogin, leaderboard, vapidPublicKey}` for Supabase sync (empty = off); see `SYNC-SETUP.md` |
| `reminders/HHMM.ics` | Static daily-reminder calendar files (app URL hardcoded inside) |
| `icons/`, `manifest.webmanifest` | PWA install assets |
| `tools/make-icons.js` | Playwright script that renders the icon SVG to all `icons/*.png` sizes |

Study groups (`w.g`): `A1 A2 B1 B2` = Oxford 3000; `B2x` (shown "B2+") and `C1` = Oxford 5000-only
(rows with trailing `5`).

## State (localStorage key `oxford3000.v1` — never rename it, or users lose progress)
- `prog[word] = { b: box, i: interval days, e: ease, d: due ms, s: seen, c: correct, x: wrong }`
  (`i`/`e` missing on pre-1.10 words → `ivlOf()` falls back to `INTERVALS[b]`)
- `settings`, `daily`, `streak {last,count}`, `freeze`, `best`, `hist`, `star`, `ach`, `quest`,
  `counts`, `backupAt`, `backupSnooze`, `remind`, `xp` (seeded from existing progress when null),
  `chist` (flashcards per day; games = `hist` − `chist`), `chistFrom`, `snap` (daily
  `[learned3000, mastered3000, learnedAll, masteredAll]`, written by `takeSnap()` in `save()`),
  `note` (memory hooks), `miss` (date → word → wrong count, 21 days), `weekSeen`, `read` (story id → date), `readScore` (story id → [best right, questions]),
  `settings.topic`, `placedAt`, `xpWeek` (Monday key → XP), `nick`. Auth tokens live separately in localStorage `o3k.auth` (never in backups).
- When adding a field: add it to `defaults()` (load() shallow-merges top-level keys) **and** handle it
  in `mergeBackup()` so importing a backup keeps it.
- `save()` also runs `checkAch()` (achievements).

## Learning logic
- Scheduling (1.10+): SM-2 style `sched(p, g)` → `{i, e, b}`; `b = boxOf(i)` against
  `INTERVALS = [0, 1, 3, 7, 16, 35, 80, 180]` so `b >= MASTERED (4)` (i ≥ 16 days) still = "จำได้แล้ว".
- Leech ("คำดื้อ"): `x >= LEECH (4)`; `noteBox()`/`editNote()` for memory hooks; wrong answers go to `logMiss()`.
- Grades: 0 ลืม (box 0, requeue in session), 1 ยาก (keep box; new cards "วนอีกรอบ" via `relearn`),
  2 จำได้ (+1), 3 ง่าย (+2). Games use the lighter `gameResult()`; a failed pronunciation in the
  speak game does not reset the card.
- XP: `addXP()`; level L starts at 25·L·(L−1) XP. Flashcard 2 (ลืม 1), right answer `comboXP(combo)`.
- Feed (`renderFeed`, route/tab `feed`): due → new (learn card, quiz 3 cards later, counts toward
  `daily.fresh`) → practice. Uses `gameResult()`. Start screen: `settings.start`.
- Stats page (`renderStats`, route `stats`): 28-day habits, learn rate from `snap` (≥7 days) else
  newPerDay × active-day ratio; ETA = remaining/rate + 11 days/accuracy/active-ratio. Chart colours are
  `--c-card/--c-game/--c-master` (validated with the dataviz palette checker in light and dark).
- Placement (`renderPlacement`, route `placement`): 8 MC questions per level, stops below 6/8; skipped words
  get b=4/i=16 with first review spread over 7–30 days; moves `settings.levels` on if all were skipped.
- `stories.js` is lazy-loaded by `loadStories()` (not in index.html); `STORY_COUNT` (keep in sync with the file) is shown before load.
  Library = `renderLibrary()` (suggested story `nextStory()`, filters `readFilter`); reader chains `speak()` per paragraph
  (speak returns the utterance; `onend` → next) with a token so leaving/stopping cancels; font size `settings.rFont` (0–2).
- Home is kept short (today, quick play, weekly card, quest, progress card); charts, per-level bars and
  achievements live on the stats page.
- Leaderboard (`pushBoard`/`loadBoard`, table `leaderboard`) and Web Push (`enablePush`, table `push_subs`,
  `sw.js` push/notificationclick) only appear when sync is configured and signed in.
- Sync: `syncNow()` = GET row → `mergeBackup()` → upsert; `save()` debounces a push (4 s); also on
  start/visibility. Email OTP code login (`create_user:false` = invite-only). `requireLogin` locks the UI.
  Tests mock Supabase with `page.route` and override `config.js`.
- Streak freezes: +1 per 7-day streak, max 2, auto-used for missed days.

## Content / copyright
- Only word, POS, CEFR level and IPA came from the Oxford list (via a GitHub CSV). Thai meanings and
  all example sentences are original — never copy Oxford definitions or examples.
- "Oxford 3000/5000" is an OUP trademark. Since 1.8.1 the app has its own brand (now "ศัพท์ต้องรู้", repo `essential-vocab` since 1.8.2): never use "Oxford"
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

## Responsive layout (1.13+)
- `go()` sets `view.dataset.route`; `startGame()` also sets it to `games` (games can start from home).
- CSS block "responsive: iPad + landscape" at the end of `style.css`: ≥700px wide → left tab rail and
  centred content (`--maxw` 760, 1100 for home/list/stats/games menu/library); ≥1100×700 → sidebar with labels;
  ≤520px tall → compact, flashcards/quizzes/feed split into two columns via `:has()`; ≥900px → multi-column grids.
- Check every change at 440×956, 956×440, 834×1210, 1210×834, 1032×1376, 1376×1032 (scratchpad `pw/resp.js`).

## iOS gotchas
- Home-screen app storage is separate from Safari; deleting the icon deletes progress.
- Users update by closing/reopening the app online (network-first SW), not by re-adding the icon.
- Speech needs a user gesture first; speech recognition may be unavailable in standalone mode.
