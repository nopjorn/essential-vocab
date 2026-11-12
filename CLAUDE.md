# Notes for Claude

"ศัพท์ต้องรู้" (Essential Vocab) — a vocabulary trainer for the Oxford 3000/5000 word lists: a static, vanilla-JS PWA hosted on GitHub Pages
(`https://nopjorn.github.io/essential-vocab/`, branch `master`, repo root).
Main targets: iPhone 17 Pro Max and iPad (M5), home-screen app, portrait **and** landscape. The owner talks in Thai; reply in Thai.

## Release rules (every push)
- Bump the version on **every** push: `APP_VERSION` in `app.js` and `VERSION` in `sw.js`
  (`o3k-<same version>`), and add a row to the changelog table at the end of `README.md` **and** to the top of `data/app/changelog.js` (shown in-app; a test checks both match).
  Tell the user the new version number.
- Patch (x.y.Z) for small fixes, minor (x.Y.0) for new features.
- Push directly to `master` (no PRs unless asked).
- When adding or changing a feature, add/update its row in the matching `docs/notes/*.md` file (see the Files section).
- The in-app manual (`GUIDE` / `renderGuideBody()` in `data/app/guide.js`, lazy-loaded by `loadGuide()`/`renderGuide()` in `js/guide.js`, route `guide`) describes every feature
  in Thai: update it whenever a feature is added or changed.
- The version is shown at the bottom of the home and settings screens so the user can
  check whether the iPhone has picked up the update.

## Files
Core files below. Feature-by-feature notes (names, ids, state fields, tests) live in `docs/notes/` — **read the matching file before touching an area, and add a row there when adding or changing a feature**:

| Notes file | Covers |
|---|---|
| `docs/notes/ui.md` | games menu, answer badges, result screen, polish, thumbs, book mode, keyboard, pencil, drag & drop, sketch, line matching, word menu, hover, offline, fast start, personal FSRS, settings groups/search, window buttons, home polish |
| `docs/notes/fun.md` | decks + ready-made sets, worksheets / words from my text, hand game, share, sky, mascot, boss map, roots/UK-US, adventure, fun zone (coins, chain, weekly boss, tower, puzzles, album/garden, cases, cafe, ghost, room, paths, create), onboarding, search, seasonal events, duel/riddle/word search |
| `docs/notes/toeic-lexis.md` | TOEIC mock / plan / Part 1–7 data, work phrases, business collocations, register, emails, real texts, grammar data, families, collocations, phrasal verbs, synonyms, affixes, pairs, stories |
| `docs/notes/state-learning.md` | every stored field, decks/dprog merge, settings sync, batched save, FSRS/SM-2, grades, XP, feed, stats, placement, games from sets, sync/compact cloud row, stats nav, page-change animation |

| File / feature | Notes |
|---|---|
| `index.html` | Shell: top bar, `#view`, tab bar |
| `app.js` | Core: `APP_VERSION`, data, storage/backup, quests, XP, achievements, helpers, speech, SRS, router (`go()`) |
| `js/*.js` | The rest of the logic, one classic script per area (`home cards games feed reading words placement stats sync guide settings boot`), sections marked `/* ---------- name ---------- */`. They share globals (no modules, no build); `index.html` loads them after `app.js` and `boot.js` must stay last; `js/errlog.js` (1.224, device error log `o3k.errs`) is the exception: it loads first, before `config.js`. A new file goes in `index.html` **and** `sw.js` (a test checks) |
| `style.css` | Mobile-first styles; colour tokens on `:root` with dark mode |
| `data/words/<level>.js` | `a1 a2 b1 b2 b2plus c1` (Oxford 5000-only rows in `b2plus`/`c1`), one row per line, each pushes onto `window.WORDS`: `[word, pos, level, ipa, thai, example, thaiExample, topicId, 5?, [[ex, thaiEx], …]?]` (4,957 rows total; app.js sorts them A–Z, topic id → `w.tp`; the optional trailing array → `w.xe` = extra examples for other meanings, shown as extra `exampleBox()` boxes, never used by games — A1 since 1.40, A2 1.41, B1 1.42, B2/B2+/C1 1.43) |
| `data/<group>/*.js` | Layout of `data/`: every file lives in a group folder, nothing loose in `data/` (a test checks): `app/` (`changelog`, in-app manual `guide`, game engine `play`), `sets/` (`presets`, goal `tags`), `lexis/` (collocations, families, pairs, phrasal, synonyms, affixes, idioms, roots, ukus, situations, realtext), `grammar/` (irregular, depprep, grampat, mistakes), `toeic/` (`toeicp1`–`toeicp7`), `work/` (workphr, bizcol, register, emails), `phrasebook/` (the `PB` books in js/phrasebook.js + `roleplay`), `fun/` (emoji, cases, paths), plus `words/` and `stories/`. A new data file goes in the matching folder **and** in `sw.js` `DATA` (grouped by folder; a test checks); `sw.js` drops cached copies of paths no longer listed when a new worker activates |
| `data/app/play.js` | Game engine `playQuiz`/`playMatch` (moved out of `js/games.js` in 1.101): `loadPlay()` + stubs in games.js, idle prefetch in boot.js; `openApp` in tests waits for `playOn` |
| `sw.js` | Network-first service worker with versioned cache; an update re-downloads only the changed app files (`fillShell`, 1.230) |
| `data/app/changelog.js` | `window.CHANGELOG = [[version, thai text, 'YYYY-MM-DD'], …]` newest first (same rows as README, plus the release date); lazy-loaded by `loadChangelog()`; page `renderChangelog()` (route `changelog`, linked from settings); `whatsNew()` shows a one-time bar after an update (`S.seenVer`, device-local) |
| `tests/*.spec.js`, `playwright.config.js` | Playwright test suite (`npm test`), run by `.github/workflows/test.yml` on every push to `master` |
| `supabase/functions/daily-reminder/index.ts` | Hourly Edge Function sending Web Push reminders (VAPID secrets in Supabase) |
| `config.js` | `window.SYNC_CONFIG = {url, anonKey, requireLogin, leaderboard, vapidPublicKey}` for Supabase sync (empty = off); see `SYNC-SETUP.md` |
| `reminders/HHMM.ics` | Static daily-reminder calendar files (app URL hardcoded inside) |
| `icons/`, `manifest.webmanifest` | PWA install assets |
| `tools/make-icons.js` | Playwright script that renders the icon SVG to all `icons/*.png` sizes |
| `tools/make-splash.js` | iOS launch images `icons/splash/<device>-<light|dark>-<portrait|landscape>.png` + the `<link rel="apple-touch-startup-image">` tags it prints; devices (1.146): iPhone 17 Pro Max, iPad Pro 11/13, iPad mini 744×1133, iPad Air 11 (820×1180) / 13 (1024×1366); data.spec checks 24 links |
| `fonts/anuphan-thai-700.woff2` | Heading font (1.117, Thai glyphs only, OFL in `fonts/OFL-Anuphan.txt`), `--head` in style.css, off with `settings.headFont = false` (`html.no-hf`) |
| `docs/word-list-licence.md` | Notes on replacing the OUP-derived word list (NGSL etc.) if the app is ever sold; numbers in `docs/word-list-audit.md`, made by `tools/licence-audit.js` (1.234, NGSL/NAWL/CMUdict files downloaded by hand, see the script's header) |

Study groups (`w.g`): `A1 A2 B1 B2` = Oxford 3000; `B2x` (shown "B2+") and `C1` = Oxford 5000-only
(rows with trailing `5`).
`TOE` (shown "TOEIC", 1.179) = `data/words/toeic.js`, 604 TSL words not in the 3000/5000 lists (rows end with `'T'`, `l` = own CEFR estimate, CC BY-SA 4.0 credit in the file, README and settings footer). `LEVELS` includes it (chips, stats, ach, album); `LEVELS_CEFR` (no TOE) is the easy→hard ladder for survival, tower and placement; `LEVELS_EXTRA` = settings chip row `#lvlsX`.
`AWL` (shown "วิชาการ", 1.180) = `data/words/nawl.js`, 355 NAWL words not in any other list (rows end with `'A'`, same rules as TOE; colour `--awl`).
`BIZ` (shown "ธุรกิจ", 1.195) = `data/words/bsl.js`, 354 Business Service List words not in any other list (rows end with `'B'`, alphabetical; same rules; colour `--biz`; RARITY 📊; all 354 picks done in 1.195.3).
`IT` (shown "IT", 1.210) = `data/words/it.js`, 229 software / IT words written for the app, not in any other list (rows end with `'I'`, alphabetical; same rules; colour `--it`; RARITY 💻; the dev/devops presets use them as list words).
`MED` (shown "สุขภาพ", 1.215) = `data/words/health.js`, 158 health / doctor / medicine words written for the app, not in any other list (rows end with `'H'`, alphabetical; same rules; colour `--med`; RARITY 🩺; the clinic preset uses them as list words; phrases for the doctor are the `doctor` phrase book).
`POL` (shown "การเมือง", 1.237) = `data/words/politics.js`, 246 politics / election / parliament / diplomacy words written for the app, not in any other list (rows end with `'P'`, alphabetical; same rules; colour `--pol`; RARITY 🗳️; examples stay neutral: no real living politicians or parties, royalty words use foreign / historical facts; data.spec also checks every example holds the word for fill-in-the-blank).
`COOK` (shown "ทำอาหาร", 1.238) = `data/words/cooking.js`, 268 cooking / kitchen / Thai ingredient / taste words written for the app, not in any other list (rows end with `'K'`, alphabetical; same rules incl. the example check; colour `--cook`; RARITY 🍳; topic ids food / home / qty / job; the `food` preset uses them as list words; ideas for further groups: `TODO-VOCAP-SET.md`).
`FEEL` (shown "อารมณ์/นิสัย", 1.239) = `data/words/feelings.js`, 222 emotion / mood / reaction / personality words written for the app, not in any other list (rows end with `'E'`, alphabetical; same rules incl. the example check; colour `--feel`; RARITY 💗; topic ids emo / char / mind; the `interview` preset uses some as list words).
`ENV` (shown "สิ่งแวดล้อม", 1.240) = `data/words/environment.js`, 213 pollution / PM2.5 haze / climate / waste / energy / nature and wildlife words written for the app, not in any other list (rows end with `'G'`, alphabetical; same rules incl. the example check, words may hold spaces like `oil spill`; colour `--env`; RARITY 🌏; topic ids mostly weather / sci / plant / animal / home; `PM2.5` only appears inside example sentences, never as a word).
`SOC` (shown "โซเชียล/ออนไลน์", 1.241) = `data/words/social.js`, 214 social media / chat / streaming / creator / online shopping / online safety words written for the app, not in any other list (rows end with `'S'`, alphabetical; same rules incl. the example check; colour `--soc`; RARITY 📱; topic ids mostly comm / tech / arts / money / law; long-lived words only, short-lived slang and abbreviations stay in the `chat` / `abbr` phrase books).
`FIT` (shown "ออกกำลังกาย/กีฬา", 1.242) = `data/words/sports.js`, 257 gym / workout / exercise / running event / muscle / sports rules words written for the app, not in any other list (rows end with `'F'`, alphabetical; same rules incl. the example check; colour `--fit`; RARITY 🏋️; topic ids mostly sport / anatomy / health / food / clothes; words already in the app with a gym meaning (`set`) get an extra `xe` example instead of a new row).


## State (localStorage key `oxford3000.v1` — never rename it, or users lose progress)
Details: `docs/notes/state-learning.md`. The rules that always apply:
- When adding a field: add it to `defaults()` (load() shallow-merges top-level keys) **and** handle it in `mergeBackup()` so importing a backup keeps it; a big table also goes in `Z_KEYS` (compact cloud row).
- `save()` is batched; `flushSave()` does the localStorage write. Tests call `flushSave()` before reading localStorage (`readState` does).
- Progress functions take the table as the last parameter (default `S.prog`); a word set passes `deckMap(id)`. **Never swap `S.prog` or keep a "current set" global.**
- Everything read from storage/backup/cloud goes through the `clean*()` functions.
- Auth tokens live in localStorage `o3k.auth` (never in backups).

## Content / copyright
- Only word, POS, CEFR level and IPA came from the Oxford list (via a GitHub CSV). Thai meanings and
  all example sentences are original — never copy Oxford definitions or examples.
- "Oxford 3000/5000" is an OUP trademark. Since 1.8.1 the app has its own brand (now "ศัพท์ต้องรู้", repo `essential-vocab` since 1.8.2): never use "Oxford"
  in the app name, icon, titles or headings. Mention it only descriptively (the settings-page footer
  disclaimer, README "แหล่งข้อมูล", links to Oxford Learner's Dictionaries).
- The word-list selection/CEFR levels/IPA are still OUP-derived: if the app is ever sold, flag that the
  list should be replaced (e.g. an openly licensed list such as NGSL).

## Testing
- **On Windows (the owner's PC)**: no `PW_CHROMIUM`, no `/opt/...`; plain `npx playwright test` (config uses `python3`, which exists on the PC). Full steps: `docs/howto-run-local.md`. Checkouts are CRLF (`core.autocrlf=true`), so a test regex that matches a line break in a source file must accept `\r?\n`. Running the app locally needs `config.js` with `url: ''` (restore it before committing; `git diff config.js` must be empty).
- `@playwright/test` is pinned to 1.63.0 (same Chromium build as the container's `/opt/pw-browsers/chromium-1243`; 1.56 could not see or route a service worker's own requests).
- Run before every push: `npm ci` (once) then `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npm test`
  (the config starts `python3 -m http.server 8765` itself). CI (GitHub Actions "Tests") runs the same suite on every
  push to `master`; it must stay green. Since 1.233 it runs in 3 shards (`--shard=n/3`, one job each, Chromium cached) and a newer
  push cancels the older run. To run one shard locally: `npx playwright test --shard=1/3`.
- Size budget (1.233, `data.spec.js`): app.js ≤ 210 KB, style.css ≤ 330 KB, each eager `js/*.js` ≤ 125 KB, all start-up scripts
  except the word lists ≤ 1500 KB. Over a limit → move the new part into its own (preferably lazy-loaded) file instead of raising it.
- `tests/data.spec.js` (no browser): version in app.js/sw.js/README, sw.js file list, word rows, families, pairs,
  collocations, stories. `app.spec.js`: every route, word sheet, family browser, flashcards. `games.spec.js`: every
  game plays a full round with right **and** wrong answers to the result screen. `features.spec.js`: features from 1.32 on. `responsive.spec.js`: no sideways
  overflow at the 6 target sizes. `contrast.spec.js` (1.112): every visible text on the main screens is AA (4.5:1) in light and dark (add new pages to its `ROUTES`/`REFS`); text colours must use `--muted`/`--pink-ink`/`--primary-ink`/`--bad-ink`, not the raw accents. Add tests here when adding a game/screen/data file.
- `tests/helpers.js` `openApp(page, state)`: overrides `config.js` (sync off), fakes speech synthesis
  (`window.__said`) and recognition (hears `window.__heard`), collects `pageerror`s (assert none).
- One-off scripts (screenshots etc.) go in the scratchpad (`pw/`), using
  `executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'`, `args: ['--headless=new']`,
  viewport 440×956. Manual serve: `nohup python3 -m http.server 8765 >/dev/null 2>&1 &`; stop with
  `kill $(pgrep -f "[h]ttp.server 8765")` (`pkill -f` kills the calling shell).
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
- Check every change at 440×956, 956×440, 834×1210, 1210×834, 1032×1376, 1376×1032, iPad mini 744×1133 / 1133×744 (scratchpad `pw/resp.js`); responsive.spec.js also covers Split View / Slide Over widths (320, 372, 566). ≤380px wide: smaller tab labels (`max-width: 379.98px` block at the end of style.css). 1.145 free-size windows: responsive.spec.js also runs 600×480 … 1099×699; `(min-width: 520px) and (max-width: 699.98px) and (max-height: 520px)` = squat window block (sessions split like phone landscape, tab bar hidden while `.session-top` is shown; cards.js `landMQ` includes it), `(min-width: 700px) and (min-height: 521px) and (max-height: 699.98px)` shrinks match tiles.

## Accessibility (1.36.1+)
- Every control needs a readable name: icon-only buttons get `aria-label`; settings rows get it from `labelRows(view)` (row text).
  English text containers carry `lang="en"` (`.word`, `.en`, `.cloze`, `.sheet-word`, `.f-word`, story `.st-p`, …) so VoiceOver uses an
  English voice; `#reveal` and `#toast` are `aria-live="polite"`. `features.spec.js` checks names on the main screens.

## iOS gotchas
- Home-screen app storage is separate from Safari; deleting the icon deletes progress.
- Users update by closing/reopening the app online (network-first SW), not by re-adding the icon.
- Speech needs a user gesture first; speech recognition may be unavailable in standalone mode.
