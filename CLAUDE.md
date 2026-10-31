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
- The in-app manual (`GUIDE` / `renderGuideBody()` in `data/guide.js`, lazy-loaded by `loadGuide()`/`renderGuide()` in `js/guide.js`, route `guide`) describes every feature
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
| `js/share.js` | Share cards drawn on a canvas (`drawCard`, `shareCard` → `saveFile`), `progressCard()`/`shareProgress()` (stats page) and the year in review (`yearStats(y)`, `yearToShow()`, route `year` → `renderYear`, home block `year` Dec 15–Jan 10) |
| `js/scene.js` | Home hero sky (1.97): `SKY` (6 time-of-day skies `morning forenoon afternoon evening dusk night`, `SKY_AT` start minutes 05:00 09:00 12:00 16:00 18:30 22:00), `skyId(date)`, `skyScene(id)` (hand-drawn SVG layer: clouds, birds, stars, shooting star, hills, palm), `skyVars`, `heroSky()` (classes/style/scene/disc used by `B.hero`), `skyGallery()` (settings preview). Settings `heroBg` ('theme' default / 'time' = sky gradient) and `heroArt` (default true). `palAuto` (1.98): `skyPalette()` / `SKY_PAL` make `applyTheme()` pick the palette by time of day (re-applied on boot and when the app becomes visible); picking a swatch turns it off. The sun/moon is `.ring-disc` inside the goal ring; `greeting()` also follows `skyId()`. Colours are checked for white-text contrast in `tests/scene.spec.js` |
| `js/mascot.js` | Mascot "น้องคำ" (`mascotSvg({mood,stage,equip})`, `mascotMood/Stage`, home block `mascot` = `mascotCard`, route `mascot` = wardrobe `renderMascot`), unlockables `ITEMS` (accessories / palettes `gold` `galaxy` / card frame; open by level or via `S.owned`; `itemOpen`, `paletteOpen`) and the daily mystery box (`boxReady`/`openBox`, `S.box`). State: `S.mascot {equip, at}`, `S.owned`, `S.box`, `settings.frame` |
| `js/map.js` (boss, 1.102) | `isBoss(topic,k)` = last stage of a topic with 2+ stages; `playQuiz` `BOSS` mode (hearts 3, boss bar `.boss-hp`); `stageDone(…, beaten)`; first win → `S.owned` `boss:<topic>`, `bossCount()` unlocks ITEMS with `boss: n` (`acc:helm` 1, `acc:medal` 3, `acc:shades` 6). `mascotPop/mascotCheer/mascotWelcome` in `js/mascot.js` (combo cheer every 5, welcome-back after 3+ days, localStorage `o3k.wb`) |
| `js/lexis2.js` | Roots (1.104): `loadRoots()`/`ROOT`, `rootHTML`, `rootItems()`, `rootDistractors` (other groups only), `renderRoots()`, game `root` (`qRoot` in data/play.js); `data/roots.js` rows `[root(s), Thai, group, note, [list words]]` (test: every example is a list word containing a root variant). UK↔US: `data/ukus.js` `[uk, us, Thai, 'w'|'s']`, `loadUkUs()`, `ukusOf(word)`, `speakBoth(uk, us)` (`speak(text, {lang})` = fixed accent), `renderUkUs()`; word-sheet boxes `#rtBox` `#ukBox` via `lexis2Boxes()`. Game `compose` (`qCompose`: own sentence, saved into `S.note` as `✍️ …`) |
| `js/adventure.js` | Weekly adventure (1.114, single player): `S.adv[mondayKey] = {t: tag id, s: '0101100' stamps per stop, done, perfect}` (`cleanAdv`/`mergeAdv` live in app.js: storage runs before this file loads; merge only adds stamps), `advTheme(mon)` (goal tags in rotation by week number), `advPool/advPick` (theme words up to the learner's level, unmastered first), home block `adv` = `adventureCard`, route `adv` = `renderAdventure` (7 stops 🚪→🏰, stop n of today = `advToday()`, earlier ones catch-up), `runAdvStop` (5 questions, pass 3/5, last stop 4/5, answers via `gameResult`); 5 stamps = done (+60 XP, 🧊), 7 = perfect (+40); `S.owned` gets `acc:explorer` (1st done) / `acc:compass` (5th); ACH `adv1` `adv5`; ITEMS field `adv: n` = lock hint |
| `js/fun.js` (1.115) | Fun zone hub (route `fun` = `renderFun`, home block `fun` = `funCard`, tiles registered by each fun file in `FUN_TILES` `{id, o (order), home, ic, name, sub(), go()}`), coins 🪙 `S.coin = {device: [earned, spent]}` (`coinBal`, `addCoins`, `spendCoins`; `cleanCoin` + per-device max merge in app.js; also from the daily box), coin shop (route `coinshop` = `renderCoinShop`: ITEMS with `coin: price`, or level items early for 25/level → `S.owned`), `funAsk(w, kind, o)` = one MC question (`en2th th2en listen cloze`) with power-ups `PW_COST` (✂️ 50:50, ⏭️ skip = right but no SRS, ❤️ heart via `o.heart`), `o.alive()` guard, `funAsk.cur/opts` read by tests |
| `js/tower.js` (1.115) | Endless tower (route `tower` = `renderTower`, `runTower(start)`): 3 questions a floor, 5 on boss floors (every 10th), 3 hearts, level by floor `twLevel` (A1 1–10 … C1 51–60, then B2–C1 + hard distractors), checkpoints after boss floors (`twStarts`), coins +1/+10, `acc:wizard` at floor 50 (ITEMS `tower: n`). `S.tower = {best, cp, runs}` (`cleanTower`, max merge). ACH `tower10 tower50` + secret `sTower sRich sShop sF13 sSpeed` |
| `js/puzzle.js` (1.119) | Daily puzzles (route `puzzle`, arg `'cw'`/`'lad'`): seeded by the date (`puzRng`), A1–A2 words. Crossword `makeCrossword(day)` → `{words: [{w, r, c, d (0 across / 1 down), n}], grid, rows, cols}` (≤ 6 crossing words, ≤ 9×9, `cwCells`), 💡 reveal a letter 🪙3; word ladder `makeLadder(day)` → `{from, to, path}` over 4-letter list words (`ladGraph`, `ladBfs`, `ladDiff`; target 3–5 steps), hint 🪙3, undo, give up. Each solved +15 coins +10 XP (`puzSolved`); both solved without giving up → streak + `foilGive()`. `S.puz = {d, cw, rv, lad, ladDone, ladGave, streak, best, last, n}` (`cleanPuz`/`mergePuz` in app.js); ACH `puz7` |
| `js/collect.js` (1.119) | Album (route `album`, `renderAlbum`): mastered words as cards, `RARITY` by group, foil `S.foil = {word: date}` (`foilGive()` from puzzles + tower boss floors; union merge, `cleanFoil`). Garden (route `garden`, `renderGarden`): `plantOf(topic)` → `{stage 0–5, n, m, l, due, wilt (due ≥ 5), score}` over the topic's words in `settings.levels`; 💧 → `go('cards', 'tp:<topic>')` (due words of the topic, `buildQueueRaw`), 🌰 sets `settings.topic`. Secret ACH `sFoil sBloom` |
| `js/onboard.js` | First-run welcome (1.112): `onboard(force)`, `onbDue()`; 3 steps goal → level → pace, writes `settings.goal/levels/newPerDay`; once per device via localStorage `o3k.onb` (tests set it in `openApp`; pass `{ onboarding: true }` to test it) |
| `js/search.js` | Search the whole app (1.112): `openSearch()` (🔍 `#qsBtn`, `/`, Ctrl/⌘+K), `gsSearch(q)` over words (EN/TH), `GAMES` and pages (read from `#tabbar` buttons + `GS_EXTRA`) |
| `data/realtext.js` | `window.REALTEXT = [[kind, Thai situation, text with ___, answer, [3 wrong], Thai, list word?]]` (1.113: 70 original signs / announcements / menus / bills / labels / notices / timetables), lazy-loaded by `loadRealText()` in `js/lexis2.js` (`RT_KIND`, `rtItems()`), game `real` (`qReal` in data/play.js; skill game, own SRS in `S.lex`); test checks every answer is a list word (inflected answers name the list word in field 7) |
| `js/events.js` | Seasonal events (`EVENTS`: halloween 24–31 Oct, songkran 10–16 Apr, loy 5–30 Nov, newyear 26 Dec–3 Jan, christmas 20–25 Dec, valentine 10–14 Feb, mother 8–12 Aug, cny = Chinese New Year via `dates: CNY_WINDOWS` (3 days before to 5 after, 2026–2035 only: add years in `CNY_DAYS`); first match wins, cny is listed before valentine; each with 10 original words + short story + 5-question quiz). `eventOn(date)`, `eventYear`, home block `event` (`eventCard`), route `event` (`renderEvent(id)`), quiz pass (3/5) → `S.evt['id-year']`, sticker + mascot item `evt:*` in `S.owned` |
| `data/play.js` | Game engine `playQuiz`/`playMatch` (moved out of `js/games.js` in 1.101): `loadPlay()` + stubs in games.js, idle prefetch in boot.js; `openApp` in tests waits for `playOn` |
| `sw.js` | Network-first service worker with versioned cache |
| `data/families.js` | `window.FAMILIES = [{f: [[word, pos, thai], ...], q: [[sentence ___, answer, thai], ...]}]` original word families (a word is in one family only), lazy-loaded by `loadFamilies()`; `familyOf(word)` → family (word sheet box, `wform` game, `renderFamilies()` browser) |
| `tests/*.spec.js`, `playwright.config.js` | Playwright test suite (`npm test`), run by `.github/workflows/test.yml` on every push to `master` |
| `data/collocations.js` | `window.COLLOC = {headword: [[phrase, thai], ...]}` original collocation data, lazy-loaded by `loadColloc()` (word sheet + `colloc` game) |
| `data/changelog.js` | `window.CHANGELOG = [[version, thai text, 'YYYY-MM-DD'], …]` newest first (same rows as README, plus the release date); lazy-loaded by `loadChangelog()`; page `renderChangelog()` (route `changelog`, linked from settings); `whatsNew()` shows a one-time bar after an update (`S.seenVer`, device-local) |
| `data/phrasal.js` | `window.PHRASAL = [[phrasal, level, thai, example with [verb] [particles], thaiExample]]` original (exactly 2 bracket groups; test checks), lazy-loaded by `loadPhrasal()` in `js/lexis.js` → objects `{pv, verb, part, plain, …}`; `phrasalOf(verb)`; browser `renderPhrasal()`, word-sheet box via `lexisBoxes()`, game `phrasal` (`qPhrasal`, particle distractors never form another listed phrasal with that verb) |
| `data/synonyms.js` | `window.SYNONYMS = [{th, s: [near-synonyms], a: [antonyms], tip}]` original; a word may be in several groups (homonyms). `loadSyn()`, `synGroups(word)`, `synRel(word)` (all listed syn/ant incl. reverse antonyms), `synQuestion(item)` never offers a second related option (a test checks every item); browser `renderSyn()`, game `syn` (`qSyn`) |
| `data/affixes.js` | `window.AFFIXES = [{x, k: 'p'|'s', th, note, ex: [[word, thai]]}]` original prefixes/suffixes; each example = affix + unchanged base (test). `loadAffix()`, `AFFIX_OF` (example word → affix), `affixDistractors()` skips affixes that make a real word with the base; browser `renderAffix()`, game `affix` (`qAffix`), word-sheet box. The games menu groups the reference pages in the 📚 คลังความรู้ tiles (`.ref-grid`) |
| `data/pairs.js` | `window.CONFUSE` (confusable pairs `{a,b,tip,q:[[sentence ___, right, wrong, thai]]}`), `window.MINPAIRS` (`[a, aTh, b, bTh, group]`) + `MINPAIRS_TIP`; original, lazy-loaded by `loadPairs()` |
| `data/stories/<level>.js` | One file per level (`a1`…`c2`) plus `real.js` (1.103: 10 dialogues/emails with `kind: 'dialogue'|'email'`), listed in `STORY_FILES` (js/reading.js), each pushes onto `window.STORIES`: 115 original A1–C2 stories (ids unique across files) `{id, level, emoji, title, titleTh, en[], th[], q[{q,o,a}]}` |
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
- `save()` (1.73+) is batched: it stamps `settingsAt`, schedules the cloud push and badge, and marks dirty; `flushSave()` (≈300 ms later, on `visibilitychange` hidden, on `pagehide`, in `exportBackup`) runs `checkAch()` (achievements), `takeSnap()` and the localStorage write. Tests call `flushSave()` before reading localStorage (`readState` does).

## Learning logic
- Scheduling (1.66+): `sched(p, g)` = FSRS-5 (`schedFSRS`, default weights; card fields `st` stability, `df` difficulty, `lr` last review; cards without them derive state from `i`/`e` via `fsState()`; `settings.retention` default 0.9, `settings.scheduler = 'sm2'` switches back to `schedSM2`); `fsFields(n)` spreads the new fields into a stored card. Before 1.66 it was SM-2 style `sched(p, g)` → `{i, e, b}`; `b = boxOf(i)` against
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
- `data/stories/*.js` are lazy-loaded by `loadStories()` (not in index.html; sorted by id); `STORY_COUNT` in js/reading.js (keep in sync with the files) is shown before load.
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
- Check every change at 440×956, 956×440, 834×1210, 1210×834, 1032×1376, 1376×1032 (scratchpad `pw/resp.js`).

## Accessibility (1.36.1+)
- Every control needs a readable name: icon-only buttons get `aria-label`; settings rows get it from `labelRows(view)` (row text).
  English text containers carry `lang="en"` (`.word`, `.en`, `.cloze`, `.sheet-word`, `.f-word`, story `.st-p`, …) so VoiceOver uses an
  English voice; `#reveal` and `#toast` are `aria-live="polite"`. `features.spec.js` checks names on the main screens.

## iOS gotchas
- Home-screen app storage is separate from Safari; deleting the icon deletes progress.
- Users update by closing/reopening the app online (network-first SW), not by re-adding the icon.
- Speech needs a user gesture first; speech recognition may be unavailable in standalone mode.
