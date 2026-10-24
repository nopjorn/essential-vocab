# Notes for Claude

"ศัพท์ต้องรู้" (Essential Vocab) — a vocabulary trainer for the Oxford 3000/5000 word lists: a static, vanilla-JS PWA hosted on GitHub Pages
(`https://nopjorn.github.io/essential-vocab/`, branch `master`, repo root).
Main targets: iPhone 17 Pro Max and iPad (M5), home-screen app, portrait **and** landscape. The owner talks in Thai; reply in Thai.

## Release rules (every push)
- Bump the version on **every** push: `APP_VERSION` in `app.js` and `VERSION` in `sw.js`
  (`o3k-<same version>`), and add a row to the changelog table at the end of `README.md` **and** to the top of `data/changelog.js` (shown in-app; a test checks both match).
  Tell the user the new version number.
- Patch (x.y.Z) for small fixes, minor (x.Y.0) for new features.
- Push directly to `master` (no PRs unless asked).
- The in-app manual (`GUIDE` / `renderGuide()` in `js/guide.js`, route `guide`) describes every feature
  in Thai: update it whenever a feature is added or changed.
- The version is shown at the bottom of the home and settings screens so the user can
  check whether the iPhone has picked up the update.

## Files
| File | Role |
|---|---|
| `index.html` | Shell: top bar, `#view`, tab bar |
| `app.js` | Core: `APP_VERSION`, data, storage/backup, quests, XP, achievements, helpers, speech, SRS, router (`go()`) |
| `js/*.js` | The rest of the logic, one classic script per area (`home cards games feed reading words placement stats sync guide settings boot`), sections marked `/* ---------- name ---------- */`. They share globals (no modules, no build); `index.html` loads them after `app.js` and `boot.js` must stay last. A new file goes in `index.html` **and** `sw.js` (a test checks) |
| `style.css` | Mobile-first styles; colour tokens on `:root` with dark mode |
| `data/words/<level>.js` | `a1 a2 b1 b2 b2plus c1` (Oxford 5000-only rows in `b2plus`/`c1`), one row per line, each pushes onto `window.WORDS`: `[word, pos, level, ipa, thai, example, thaiExample, topicId, 5?, [[ex, thaiEx], …]?]` (4,957 rows total; app.js sorts them A–Z, topic id → `w.tp`; the optional trailing array → `w.xe` = extra examples for other meanings, shown as extra `exampleBox()` boxes, never used by games — A1 since 1.40, A2 1.41, B1 1.42, B2/B2+/C1 1.43) |
| `js/decks.js` | "ชุดของฉัน" (route `decks`, 1.54): create/edit/copy/delete word sets picked from the built-in list; `matchWords(text)` (paste matcher: ok / guess / miss), `renderDecks`, `renderDeck`, `renderDeckEdit`, `libSwitch()`, `deckStats()`, `buildDeckQueue()` (the คลังคำ ⇄ ชุดของฉัน switch on the word list) |
| `sw.js` | Network-first service worker with versioned cache |
| `data/families.js` | `window.FAMILIES = [{f: [[word, pos, thai], ...], q: [[sentence ___, answer, thai], ...]}]` original word families (a word is in one family only), lazy-loaded by `loadFamilies()`; `familyOf(word)` → family (word sheet box, `wform` game, `renderFamilies()` browser) |
| `tests/*.spec.js`, `playwright.config.js` | Playwright test suite (`npm test`), run by `.github/workflows/test.yml` on every push to `master` |
| `data/collocations.js` | `window.COLLOC = {headword: [[phrase, thai], ...]}` original collocation data, lazy-loaded by `loadColloc()` (word sheet + `colloc` game) |
| `data/changelog.js` | `window.CHANGELOG = [[version, thai text, 'YYYY-MM-DD'], …]` newest first (same rows as README, plus the release date); lazy-loaded by `loadChangelog()`; page `renderChangelog()` (route `changelog`, linked from settings); `whatsNew()` shows a one-time bar after an update (`S.seenVer`, device-local) |
| `data/phrasal.js` | `window.PHRASAL = [[phrasal, level, thai, example with [verb] [particles], thaiExample]]` original (exactly 2 bracket groups; test checks), lazy-loaded by `loadPhrasal()` in `js/lexis.js` → objects `{pv, verb, part, plain, …}`; `phrasalOf(verb)`; browser `renderPhrasal()`, word-sheet box via `lexisBoxes()`, game `phrasal` (`qPhrasal`, particle distractors never form another listed phrasal with that verb) |
| `data/synonyms.js` | `window.SYNONYMS = [{th, s: [near-synonyms], a: [antonyms], tip}]` original; a word may be in several groups (homonyms). `loadSyn()`, `synGroups(word)`, `synRel(word)` (all listed syn/ant incl. reverse antonyms), `synQuestion(item)` never offers a second related option (a test checks every item); browser `renderSyn()`, game `syn` (`qSyn`) |
| `data/affixes.js` | `window.AFFIXES = [{x, k: 'p'|'s', th, note, ex: [[word, thai]]}]` original prefixes/suffixes; each example = affix + unchanged base (test). `loadAffix()`, `AFFIX_OF` (example word → affix), `affixDistractors()` skips affixes that make a real word with the base; browser `renderAffix()`, game `affix` (`qAffix`), word-sheet box. The games menu groups the reference pages in the 📚 คลังความรู้ tiles (`.ref-grid`) |
| `data/pairs.js` | `window.CONFUSE` (confusable pairs `{a,b,tip,q:[[sentence ___, right, wrong, thai]]}`), `window.MINPAIRS` (`[a, aTh, b, bTh, group]`) + `MINPAIRS_TIP`; original, lazy-loaded by `loadPairs()` |
| `data/stories/<level>.js` | One file per level (`a1`…`c2`, `STORY_FILES` in app.js), each pushes onto `window.STORIES`: 105 original A1–C2 stories (ids unique across files) `{id, level, emoji, title, titleTh, en[], th[], q[{q,o,a}]}` |
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
  `settings.topic`, `settings.voice` (voiceURI, '' = auto), `settings.theme` (auto/light/dark → `html[data-theme]`, mirrored to localStorage `o3k.theme` for the early script in index.html), `monthSeen`, `stk` (topic → sticker tier 1–4), `placedAt`, `xpWeek` (Monday key → XP), `nick`, `mtest` (month → best monthly-test `{r, n, at}`). Auth tokens live separately in localStorage `o3k.auth` (never in backups).
- My word sets (1.54+): `decks` = `[{id, name, icon, words: [list spellings], at, used, del?}]` and `dprog` (deck id → word → progress, same shape as `prog`, written from 1.55). Everything read from storage/backup/cloud goes through `cleanDecks()`/`cleanDprog()` (`sanitizeDecks` in `load()`); `mergeDecks(d)` (called by `mergeBackup`) keeps the newer `at` per id, deleted sets stay as `del` tombstones for 90 days, `dprog` merges per word with `progAhead`. The reset button keeps both fields.
- Settings sync (1.53+): `save()` stamps `settingsAt` when `settingsSig()` (settings minus `voice` + `homeCfg`) changes; `mergeBackup()` adopts the copy with the newer `settingsAt`. `gplay` is per device (`DEV`, localStorage `o3k.dev`), summed by `gamePlays(id)`.
- When adding a field: add it to `defaults()` (load() shallow-merges top-level keys) **and** handle it
  in `mergeBackup()` so importing a backup keeps it.
- `save()` also runs `checkAch()` (achievements).

## Learning logic
- Scheduling (1.10+): SM-2 style `sched(p, g)` → `{i, e, b}`; `b = boxOf(i)` against
  `INTERVALS = [0, 1, 3, 7, 16, 35, 80, 180]` so `b >= MASTERED (4)` (i ≥ 16 days) still = "จำได้แล้ว".
- Progress tables (1.55+): `status(w, map)`, `dueList(list, map)`, `grade(w, g, map)`, `gameResult(w, ok, map)`, `markKnown/markForReview(w, map)` take the table as the last parameter (default `S.prog`); `leechIn(w, map)` is the table-aware `isLeech` (kept one-argument so `W.filter(isLeech)` works). A word set passes `deckMap(id)` (= `S.dprog[id]`): then `grade`/`gameResult` skip `S.daily.fresh/reviews` and `logMiss`, but still count effort (`markActive`, XP, `chist`, quests). **Never swap `S.prog` or keep a "current set" global.** `renderCards({ deck: id })` studies a set (`buildDeckQueue`: due + ≤20 new per round, `{ahead:true}` = 20 closest to due); set statuses `deckStatus` new / learning (i<7) / solid (i≥7); `deckStats()`; page `renderDeck(id)` (reached by `go('decks', id)`). "Start this set again" clears `S.dprog[id]` in place and sets `deck.rst`: `mergeDecks` ignores progress from an older `rst` and wipes a device still on an older one. `mergeDecks` mutates `S.dprog` in place (a session keeps its reference).
- Games from sets (1.56+): `gameSource = 'deck'` + `gameDecks` (ids). `startGame` builds `deckRun`: one set → `{ map: deckMap(id) }` passed to `playQuiz`/`playMatch` (→ `gameResult(w, ok, map)`); several → `{ practice: true }` (only `markActive`, still XP/streak). Only games drawing on the word source use it (not `review`, story or skill games). A stale `'deck'` source is reset to `'level'` when a game starts outside the games menu (home quest button). Home block `decks` (`HOME_BLOCKS`, top 3 by `used`).
- Leech ("คำดื้อ"): `x >= LEECH (4)`; `noteBox()`/`editNote()` for memory hooks; wrong answers go to `logMiss()`.
- Grades: 0 ลืม (box 0, requeue in session), 1 ยาก (keep box; new cards "วนอีกรอบ" via `relearn`),
  2 จำได้ (+1), 3 ง่าย (+2). Games use the lighter `gameResult()`; a failed pronunciation in the
  speak game does not reset the card.
- XP: `addXP()`; level L starts at 25·L·(L−1) XP. Flashcard 2 (ลืม 1), right answer `comboXP(combo)`.
- Feed (`renderFeed`, route `feed`, no tab since 1.31.1: reached from home `#qFeed`, the flashcard done screen and `settings.start`): due → new (learn card, quiz 3 cards later, counts toward
  `daily.fresh`) → practice. Uses `gameResult()`. Start screen: `settings.start`.
- Stats page (`renderStats`, route `stats`): 28-day habits, learn rate from `snap` (≥7 days) else
  newPerDay × active-day ratio; ETA = remaining/rate + 11 days/accuracy/active-ratio. Chart colours are
  `--c-card/--c-game/--c-master` (validated with the dataviz palette checker in light and dark).
- Placement (`renderPlacement`, route `placement`): 8 MC questions per level, stops below 6/8; skipped words
  get b=4/i=16 with first review spread over 7–30 days; moves `settings.levels` on if all were skipped.
- `data/stories/*.js` are lazy-loaded by `loadStories()` (not in index.html; sorted by id); `STORY_COUNT` (keep in sync with the files) is shown before load.
  Library = `renderLibrary()` (suggested story `nextStory()`, filters `readFilter`); reader chains `speak()` per paragraph
  (speak returns the utterance; `onend` → next) with a token so leaving/stopping cancels; font size `settings.rFont` (0–2).
- Games added in 1.14: `order` (rebuild example sentence; `qOrder`), `colloc` (`qColloc`), story games `sCloze`/`sOrder`
  (`STORY_GAMES`, items from `storyItems()` = copies of list words carrying `_s/_tok/_opts/_st`). Order games and failed
  pronunciation use the soft path in `mark()` (no card reset). Monthly summary: `monthStats()/monthBox()` (stats page; home card days 1–7).
- 1.15: `PAIR_GAMES` `confuse` (`qConfuse`) and `minpair` (`qMinpair`) use items with `idx: -1` → `mark()` only calls `markActive()` (no SRS); pair list page `renderPairs()`.
  1.17: `wform` (`qWform`, items from `FAMILIES`, `idx: -1`); `SKILL_GAMES` = `PAIR_GAMES` + `wform` + `phrasal` (1.33) + `syn` (1.34) + `affix` (1.35). Skill-game items carry `_q = [sentence ___, answer, "", thai]` so the result screen can list wrong ones.
  Sticker book: `STK_TIERS`, `topicStat()`, `checkStickers()` (run from `checkAch()`), `stickerBook()` on the stats page.
- 1.32: slow speech — `speak(text, { slow })`; with no `slow` given, the same text again within `SLOW_AGAIN` (8 s) plays at `slowRate()`
  (alternating; `settings.slowRepeat !== false`). `slowBtn(text)` renders a 🐢 button (`data-slow`, handled by one document listener).
  Reader: `#rSlow` toggle and `shadowStory(st)` (🗣️ shadowing: `storySentences()`, speak → pause ≈ sentence length → next).
- 1.36: stats page `yearHeatmap()` (53 Monday-first weeks of `hist`, `--hm0..4` one-hue ramp with its own dark steps) + `bindHeatmap()`;
  monthly test route `mtest` (`renderMonthTest`/`runMonthTest`: 30 MC questions from mastered words, else learned; answers via `gameResult()`;
  best per month in `S.mtest`, history bars `mtestSummary()`); `saveFile(file, title)` (share sheet or download) used by backups and
  `exportWords(set, 'csv'|'anki')` in `js/settings.js` (CSV with BOM; Anki tab-separated with `#separator/#html/#tags column` headers).
- Home is kept short (today, quick play, weekly card, quest, progress card); charts, per-level bars and
  achievements live on the stats page.
- Leaderboard (`pushBoard`/`loadBoard`, table `leaderboard`) and Web Push (`enablePush`, table `push_subs`,
  `sw.js` push/notificationclick) only appear when sync is configured and signed in.
- Sync: `syncNow()` = GET row → `mergeBackup()` → upsert; `save()` debounces a push (4 s); also on
  start/visibility. Email OTP code login (`create_user:false` = invite-only). `requireLogin` locks the UI.
  Tests: `fakeSupabase(page, store)` in `tests/helpers.js` mocks the `progress` table with `page.route` (see `tests/decks.spec.js`; before 1.54 there were no sync tests).
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
- Run before every push: `npm ci` (once) then `PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npm test`
  (the config starts `python3 -m http.server 8765` itself). CI (GitHub Actions "Tests") runs the same suite on every
  push to `master`; it must stay green.
- `tests/data.spec.js` (no browser): version in app.js/sw.js/README, sw.js file list, word rows, families, pairs,
  collocations, stories. `app.spec.js`: every route, word sheet, family browser, flashcards. `games.spec.js`: every
  game plays a full round with right **and** wrong answers to the result screen. `features.spec.js`: features from 1.32 on. `responsive.spec.js`: no sideways
  overflow at the 6 target sizes. Add tests here when adding a game/screen/data file.
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
- Check every change at 440×956, 956×440, 834×1210, 1210×834, 1032×1376, 1376×1032 (scratchpad `pw/resp.js`).

## Accessibility (1.36.1+)
- Every control needs a readable name: icon-only buttons get `aria-label`; settings rows get it from `labelRows(view)` (row text).
  English text containers carry `lang="en"` (`.word`, `.en`, `.cloze`, `.sheet-word`, `.f-word`, story `.st-p`, …) so VoiceOver uses an
  English voice; `#reveal` and `#toast` are `aria-live="polite"`. `features.spec.js` checks names on the main screens.

## iOS gotchas
- Home-screen app storage is separate from Safari; deleting the icon deletes progress.
- Users update by closing/reopening the app online (network-first SW), not by re-adding the icon.
- Speech needs a user gesture first; speech recognition may be unavailable in standalone mode.
