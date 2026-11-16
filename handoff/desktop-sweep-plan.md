# Flogic desktop: speed and smoothness sweep. Plan for Fernando's agent

**Thank you, Fernando's agent.** Your last run found a real security hole and ten fixes' worth of rough edges, and DJ sends thanks. This run is about speed: the two Windows apps should start fast, never make anyone wait for nothing, and draw at 60 frames a second.

**The code is rough.** That includes the new desktop shell and title bar written for this run. Don't trust a part because it exists. Test each piece for what it's actually for, the way a person would use it.

Write your results in `handoff/desktop-sweep-report.md` (section 9).

**The goal:** both apps start fast, never make anyone wait for nothing, and draw at 60 fps, **without breaking anything that works today.** Section 6c says what to do first and when you're done. Section 6d is the test gate after every fix.

---

## 0. What you may do, as DJ

- **Which machine:** you'll most likely run on **Fernando's** machine, as last time.
  - A few lines below are true on **DJ's machine only**: his trust file in the working tree, the nearly full C: drive, and `Desktop\Castle Claude`.
  - Check which machine you're on first. Follow the lines that fit it, and say which in the report.
- **Commit and push to `phase1-grid-menus` only.** It has everything from `phase-final-edit-path-rust`, plus the Nov 15 work:
  - the Details drawer, Go to row's corner, no Expand
  - the Excel numbers fix, the SQL `LIKE` fix, and the `DataPage/` rename
  - Checks, and the stations (Sheet / Dashboard / Ticket)
  - the tests in `handoff/tests/`

  Commit and push each tested milestone without asking. Never push to `main`, `phase-final`, `phase-final-edit` or `phase-final-edit-path-rust`, and never force-push.
- **Never commit:** keyrings, `.flogic-key`, `.flogic-signer`, `.flogic-id`, packs, a filled-in `DataPage/it-signerI.js`, test data, or anything under `desktop/target`, `desktop/dist` or `desktop/out`.
- **Never use real client data.** The class rule is that real ServiceNow rows never go to AI tools. Use only the made-up files from `handoff/tests/make-tickets.py` and the test sets named in section 2. If a real export is on the machine, don't open it.
- **The trust file:** on DJ's machine, `DataPage/it-signerI.js` holds DJ's real key, uncommitted. Copy it somewhere safe before you put a test one in, and put it back when you're done. Don't `git checkout` it away without that copy. On Fernando's machine the file in git is the blank one, so make a test trust file as in section 1.
- **Stop only what you started.** Stop only the Flogic processes you launched, by name or by process id: `flogic*.exe`, `Flogic*.exe`, and the `msedgewebview2.exe` processes whose command line has `webview-exe-name=flogic` or `webview-exe-name=Flogic`. Never kill Edge or WebView2 broadly, and never run `msedge --version`.
- **Line endings:** the repo's files use CRLF. Edit with an editor tool or `perl -pi`, never `sed -i`. Before adding a function to a page script, check its name isn't already used: all the scripts share one scope.
- **Disk space** (DJ's machine: the C: drive is nearly full, about 3 GB free; check yours):
  - Build into the one shared folder, `desktop/target/shared`.
  - Delete `desktop/target/shared/debug` when you're done with debug builds.
  - Never delete DJ's files to make room. Ask.

## 1. The apps, and how to drive them for real

- **Shell:** `desktop/` is Tauri 2 (Rust) around WebView2, the same engine as Edge.
- **Two apps from one crate:**
  - **Flogic** (staff): `DataPage/flogic.html`.
  - **Flogic IT**: `it-console/it-console.html`. Build it with `--features it`.
- **What the build adds:** `desktop/build.rs` copies the pages into `desktop/dist/` and adds the title bar (`desktop/titlebar/`). The repo's own pages are not changed.
- **Release builds for people:** `powershell -File desktop/build.ps1` makes `desktop/out/Flogic.exe` and `desktop/out/Flogic IT.exe` (3.1 MB each).
- **Sweep builds (test only):** add `--features sweep`. This opens WebView2's DevTools port (`FLOGIC_SWEEP_PORT`, default 9334), so Playwright can drive and profile the real window. Never give a sweep build to anyone: any program on the computer could read the page, unlocked keys included.

  ```
  cd desktop
  cargo build --release --features sweep --target-dir target/shared              # staff
  copy target\shared\release\flogic.exe target\shared\sweep-staff.exe
  cargo build --release --features it,sweep --target-dir target/shared           # IT
  copy target\shared\release\flogic.exe target\shared\sweep-it.exe
  ```

- **Measure release builds only.** The pages run the same in debug, but the shell, start-up and IPC are slower there.
- **Connecting:** start the exe, then `chromium.connectOverCDP('http://127.0.0.1:9334')`.
  - The first page you get may still be `about:blank`. Wait for `/tauri\.localhost/` before anything else.
  - The page's address is `http://tauri.localhost/DataPage/flogic.html`. A missing file answers 500, not 404.
- **Real input, as before:**
  - Mouse moves and clicks at the element's centre, after checking `elementFromPoint` (the title bar now covers the top 32 px).
  - Keyboard typing with a small delay.
  - Selects changed with the arrow keys.
  - Never set values with `evaluate`. Reading values with `evaluate` to check them is fine.
- **Windows' own dialogs:**
  - **Open-file dialog:** first check whether Playwright's `filechooser` event works through `connectOverCDP`. In a quick try it timed out, and the native dialog probably opened instead. If so, fill the native Open dialog with Windows UI Automation, scoped to the app's process, as you did for the folder picker. Say which way you used.
  - **Downloads:** they work (the download event fires). Note where the file lands with and without Playwright attached.
  - **Folder picker:** `showDirectoryPicker` exists in the window. Check that it really opens and writes (IT's folder, packs into `packs/<group>/`).
- **What CDP input can't reach:** dragging the window by its title bar is done by Windows itself. Test moving the window, snapping it (drag to a screen edge) and resizing it from its edges with OS-level mouse input (UI Automation or `SendInput`). If you can't, mark them **needs a human**.
- **Trust file for sign-in tests:**
  1. Make a test keyring in the IT app.
  2. Download its trust file.
  3. Copy DJ's `DataPage/it-signerI.js` aside, then put the test one in.
  4. Rebuild the staff sweep build.
  5. Put DJ's file back at the end and check it with `git diff`.

## 2. Test data (all made up)

- **Start with `handoff/tests/make-tickets.py`:** `py -3.12 -I make-tickets.py C:\temp\fake` makes a 25,000-row ServiceNow-style `incident.csv`, a `change_request.csv`, and `expected.json` (the true answers). `py -3.12 -I make-tickets.py C:\temp\fake-big 535000` makes a big one for speed.
- **Reuse your earlier made-up set** if you still have it: `finance_ledger_2026.sql`, `hr_roster_2026.xlsx`, `ops_tickets_2026.csv`, `big_warehouse.sql` (40 MB, 535,500 rows), the 1999 and 2006 files, and the odd inputs. If they're gone, make new ones.
- **On DJ's machine only:** `Desktop\Castle Claude\stress-files` (big square CSVs), read-only. Never change or delete anything there, and don't open the ServiceNow exports in the Castle Claude week06 folders: they're real.
- **Make these:**
  - A CSV with 1,000,000 rows and 12 columns.
  - A CSV with 300 columns.
  - An xlsx with 5 sheets.
  - 20 small CSVs, for batch packing.
  - A keyring with 100 people and 500 pack-log entries.
- Big files must be **real files on disk, read with the real clock**. A fake clock stalls big disk reads.

## 3. What to measure

Note the screen's refresh rate first. **A 60 fps frame is 16.7 ms.** On a 120/144 Hz screen, judge against 16.7 ms anyway and note the rate.

| What | How | Budget |
|---|---|---|
| **Cold start** (first run after a restart, or after closing all WebView2 processes for Flogic) | Process start → window visible → first contentful paint → the first control can be clicked | Window visible < 1.5 s. Clickable < 2 s |
| **Warm start** | The same, second run | Window visible < 500 ms (it took ~360 ms here) |
| **White flash** | Screenshots every 16 ms from launch (OS-level screen capture) | No white or empty frame before the page's own colors |
| **Each load** | Time from the action to the result on screen (see the list below) | Under 100 ms feels instant. Anything over 1 s shows progress. Nothing does needless work |
| **Smoothness** | Frame times while doing each interaction in section 4 | p95 ≤ 16.7 ms, max ≤ 33 ms, under 1% of frames over 16.7 ms |
| **Long tasks** | `PerformanceObserver('longtask')` + a CDP trace | None over 50 ms during an interaction. Heavy work (opening 40 MB, PBKDF2) must not freeze the page, or must show progress |
| **Idle** | CPU of the app's processes, 60 s with nothing happening, signed in and not | ~0%. No timers spinning. `Desktop\Castle Claude\tools\idlecpu.ps1` can be adapted |
| **Memory** | Working set: at start, after a 40 MB file, after Lock, after closing the file | Report the numbers. After Lock, the data's memory should come back within a minute |
| **Leftover work** | CDP coverage at start-up (JS and CSS) | List any large code that runs or loads at start and isn't needed until later |

**How to measure frames:**
- Inject a `requestAnimationFrame` recorder with `page.evaluate` after load. Also record a CDP performance trace (`browser.startTracing` / `Tracing.start` with the `devtools.timeline` categories) around each interaction.
- Read dropped frames, long tasks, forced layouts ("Layout forced" / "Recalculate Style" inside JS) and paint areas from the trace.
- Run each interaction 3 times and report the median run.

**Loads to time:**
- **Staff app:**
  - sign in (the 600,000-round PIN check, ~0.1 s, is on purpose)
  - open each data file and each pack size
  - the first dashboard draw
  - running a query (simple, `GROUP BY`, `ORDER BY` on 535k rows)
  - Checks → Run all (the suggested list) on 535k rows
  - Save as CSV, Export report
  - switching theme
  - Lock
  - turning between stations (Sheet / Dashboard / Ticket) with a 535k-row file open: the Sheet re-measures itself on every turn
- **IT app:**
  - open and save the keyring (100 people)
  - make a key file
  - Renew everyone
  - pack 1 file and 20 files
  - pack the 40 MB file

## 4. The interactions to sweep at 60 fps

**Staff app**

**The app is on STATIONS now** (since Nov 15): folder tabs at the top for **Sheet**, **Dashboard** and **Ticket**, one in front at a time. It starts on the Sheet (open a file there). A newly opened file lands on a **simplified Dashboard** (4 tiles, "Show the full dashboard"). **Ask** and **Checks** are two long buttons above the Sheet and the Dashboard. Switching turns the stations like a carousel (0.25 s, the same curve as the "Spreadsheet View" flip). Most items below happen on the Sheet: click its tab first.

0. **The stations themselves:**
   - turn with the tabs (click), ← → on the tabs, Alt+1/2/3, and Back/Forward: every turn at 60 fps, with the 535k-row file open
   - at rest, nothing may stay turned: check that focus mode's full-screen grid and the Details drawer still sit on the screen right after a turn
   - the Ticket station: ▲ Previous ticket / ▼ Next ticket held down (↑ ↓ keys), Home/End on 535k rows; "Big view ▸" from the drawer
   - the simplified Dashboard's "Show the full dashboard", and a dashboard tile row (it turns to the Sheet with the answer)
1. Scroll the grid of the 535k-row file: mouse wheel (slow and fast), dragging the scrollbar, PageDown held, arrow keys held, Home/End.
2. Scroll sideways in the 300-column file.
3. Search, then step through matches with the snap menu ("aimbot"), including wrap-around.
4. Resize a column. Drag a column if the page allows it.
5. Hover cells (the "expand?" tag). Then the **Details drawer** (the ticket viewer, on the right edge since Nov 15):
   - open it by clicking a cell, and by **Details ▾** in the snap menu; close it with × and Escape
   - click a cell in the right part of the sheet: the sheet slides so that cell stays visible left of the drawer
   - "Show the N empty fields" / "Hide the empty fields" on a ServiceNow row (half its fields are empty)
   - keep it open while stepping ▶ through 50+ matches: it redraws each time
   - in focus mode too (it starts under the info strip)
6. Turn focus mode on and off. Scroll in focus mode.
6b. **Go to row** is a small bar under the sheet's bottom-left corner now (not in the controls row). Type a row and press Enter, and use its button. **Expand (show all) is gone:** don't look for it.
7. The dashboard: first draw, Edit mode, moving and resizing tiles (with the ◀ ▶ and S M L buttons: there's no dragging), adding a tile, Hide/Show.
8. The Query menu: open it, type a query, show the answer, scroll the answer.
8b. **Checks** (the long button next to Ask, since Nov 15): open it (an empty list fills with suggested checks), **Run all** on the 535k-row file and on the made-up `incident.csv`, **Show ▸** on a failed check, **+ Add a check** (type one), **Save** (a download) and **Load** it back. Opening Ask closes Checks and the other way round. The page must keep breathing while the checks run: time "Run all" as a load (section 3) and watch for long tasks.
9. The theme chip and menu. Switch each theme.
10. Lock and unlock. Watch the card's appearance and the auto-lock countdown (the timer select).
11. **The title bar:**
    - maximize, restore, minimize, back from the taskbar
    - double-click to maximize
    - resize the window from each edge and corner, slowly and fast: the page must reflow without blank areas or stutter
    - snap to the left or right half
    - move the window between screens if there are two

**IT app**
12. Scroll the whole console with 100 people and 500 pack entries.
13. Tick groups and export boxes in a 20-file pack list. Each tick redraws the list: check it stays under one frame.
14. Add and edit a person. Edit a group (every change redraws all the tables: `refresh()`).
15. Make key files and Renew everyone with the folder connected.
16. The same title-bar checks as item 11.

## 5. Places to look first

**Since the sweep (Nov 16, DJ's agent, `SCANME/returns/SWEEP-CONTINUE-v0.1.0-2026-11-16.md`):** `refresh()` now redraws only the rows that changed. While the sheet scrolls its rows take no mouse (`#output.moving`). The Details drawer narrows below about 1,340 px wide so it never covers ▶. A dashboard tile scrolls the answer row to just under the tab bar. New harness pieces: `edit-cost.js`, `it-rows-check.js`, `paint-probe.js`, `winctl.ps1 size`, and `EXE_SIZE=1280x672` for `stations-test` / `drawer-test` in the desktop build. Frame numbers need a machine with a GPU: DJ's paints in software.

These are guesses from reading the code. Prove or rule out each one.

- **`it-console/itconsoleI.js` `refresh()`** redraws every table (people, groups, data, packs, the to-do list) after any change. With 100 people and 500 packs, that may cost a frame or more per click.
- **`drawQueue()`** rebuilds the whole pack list on every checkbox change.
- **The title bar's `onResized` handler** asks Rust `isMaximized()` on every resize event. During a live resize that is many round trips a second. It may need throttling to one per frame, or only acting when resizing stops.
- **`html.flogic-desktop { padding-top: 32px }`** and the fixed-element offsets in `desktop/titlebar/titlebarI.css`. Check nothing reflows the whole page per frame. Check no layout uses `100vh` and now overflows by 32 px (a stray scrollbar).
- **The sign-in card and Lock:** do they keep timers or animations running when hidden?
- **Start-up:** the app loads 13 scripts, all at once, before the card shows. The last two, `checksI.js` and `stationsI.js`, build their pieces and move the page's pieces into the stations at load. Is anything big (the SQL engine, the xlsx reader, the dashboard) parsed and run before it's needed?
- **The 500 for missing files:** WebView2 asks for `/favicon.ico` by itself. That one is fixed (the build copies the icon). Look for any other failed requests at start.
- **Big-file paths:** reading, packing and opening 40 MB in one go. Do they block the page? Should they use a worker or chunks? Report this before changing it, because it's a design change.

## 6. What to fix now, and what to ask DJ about

**Fix now:**
- Anything that makes a person wait for nothing: needless redraws, work done twice, layout thrash, timers running while idle, failed requests, scripts that run before they're needed (when deferring them doesn't change behaviour), and the title bar's resize handling.
- **Measure before and after each fix.** Put both numbers in the report.
- **Re-test the feature with real input after each fix.** Speed never beats correctness.
- Security checks are never removed or weakened for speed. That includes PBKDF2 rounds, signature checks and the export rules.

**Report and ask DJ:**
- Moving work into Web Workers.
- Changing file formats.
- Splitting or lazy-loading the pages' scripts in a way that changes their order or how they load.
- Changing what the title bar looks like.
- Anything that changes what a person sees or does.

## 6b. A change DJ asked for: center the carousel on the Dashboard

Do this after the measurements, then measure the turns again.

- **The new order:** Ticket (left) · **Dashboard (center)** · Sheet (right).
  - Turning to the **Sheet** brings it in **from the right**.
  - Turning to the **Ticket** brings it in **from the left**.
  - Sheet ↔ Ticket follows the same ring: going to the Ticket, it comes from the left; going to the Sheet, from the right.
- **The tabs follow the same order:** `Ticket | Dashboard | Sheet`. Then the tab you click sits on the side its station comes in from. ← → on the tabs and Alt+1/2/3 follow the tab order.
- **What doesn't change:**
  - The app still starts on the Sheet until a file is open.
  - A new file still lands on the simplified Dashboard.
  - An answer (Ask, a check's Show ▸, a dashboard tile) still turns to the Sheet.
- **Where:** `DataPage/stationsI.js`. The `STATIONS` array's order sets both the tab order and which way a station turns (`stationIndex` decides left or right). Reordering it to ticket, dashboard, sheet should do most of it. Update the diagrams in the header comments of `stationsI.js` and `stationsI.css` to match.
- **Check with real input:**
  - Each of the four turns (Dashboard→Sheet, Dashboard→Ticket, Sheet→Ticket, Ticket→Sheet) comes in from the side listed above: the Sheet from the right, the Ticket from the left. Read the incoming station's `turn-in-*` class, and take a screenshot mid-turn.
  - ← → on the tabs, Alt+1/2/3 and Back/Forward.
  - Nothing stays turned at rest.
  - Focus mode and the Details drawer still sit on the screen right after a turn.
  - Turns stay at 60 fps.

## 6c. What to do first, and when you're done

**Order** (if time runs short, stop at the end of a step, with the report written so far):
1. **Section 7:** both apps work at all. A broken feature beats any speed number: report it at once.
2. **The baseline:** run the test gate (6d) before changing anything, and keep its output. Every later run compares with it.
3. **Measure** everything in section 3, then section 4's interactions. Write the numbers down before fixing anything.
4. **Fix the worst first:** what a person feels most (a freeze, a long wait, a stutter while scrolling or turning) before what only a trace shows.
5. **Section 6b:** center the carousel on the Dashboard, then measure the turns again.
6. **Measure again** and write the report (section 9).

**Done means** all of these:
- Every budget in section 3 passes, or the report says why not and what it would take.
- The test gate (6d) passes as at the baseline: nothing that passed then fails now.
- Every fix has a before and an after number, and its own commit.
- Nothing in section 6's "Report and ask DJ" list was changed without asking.

## 6d. The test gate: run it before your first change and after every fix

**On any machine (`handoff/tests/`, see its README).** Made-up data only:
- `stations-test.mjs`, `drawer-test.mjs`, `checks-test.mjs`: each must end `ALL PASS`, in Edge and in the staff sweep build (`exe:` for stations and drawer).
- `excel-test.mjs`: the four rows must show `-5`, `-12.5`, `=SUM(B2:B4)`, `@handle` with no `'` in front.
- `usability-audit.mjs`: compare with the baseline. No contrast may drop below 4.5, no button below 24×24, and the drawer must never cover the clicked cell.

**On DJ's machine only (`Desktop\Castle Claude`):**
- `tools/run-tests.sh` pages: `aim`, `break-it`, `realfile-focus`, `realfile-drag`, `realfile-view`, `realfile-afterquery`, `realfile-vault`, `realfile-ask`, `realfile-query`, `realfile-deadends`.
- After any change to `flogic.html`, rebuild the pages first: `perl tools/make-test-pages.pl`, then `py -3.12 -I tools/make-vault-pages.py`.
- `tools/query-test`: `node run.js` and `node fuzz.js` (the engine against real SQLite).
- On Fernando's machine, write in the report that DJ needs to run these before merging.

**Known failures. Not yours to chase; report them only if they change:**
- `realfile-vault` 44/45 and part of `realfile-quotes`: this branch has no `demo-data/` folder.
- `realfile-quotes`, three big ServiceNow reads: Edge's own file read fails on DJ's machine after the 94 MB file, even on a blank page with no app code.
- `realfile-chaos` comes back blank. It did before Nov 15 too.
- `query-test` `run.js` 22 fails and `fuzz.js` 185 fails: 64-bit numbers past 2^53 (exact big integers were rolled back on this branch). Same before and after the `LIKE` fix.

## 7. Also check that the desktop apps work at all

Do this once, quickly, before measuring:
- **Staff app:**
  1. sign in with a key file
  2. open a pack and a plain file
  3. export
  4. Lock
  5. close and reopen: the laptop copy is remembered (the app keeps its own storage under `%LOCALAPPDATA%\org.icstars.flogic\staff`)
- **IT app:**
  1. new keyring
  2. groups, a person, a key file into a connected folder
  3. pack into `packs/<group>/`
  4. save
  5. Close with unsaved changes: the first close only warns (✕, Alt+F4 and the taskbar's Close)
- **Both apps:** keyboard Tab order doesn't land on the title bar's buttons, on purpose. Dark theme. A 125% and 150% display scale.

## 8. Not to forget

- Close the apps between runs. Leftover WebView2 processes skew start-up times.
- Don't run the sweep while other heavy apps run. Note anything else that was open.
- Before each commit: `git diff DataPage/it-signerI.js` must show only DJ's own file, or nothing.

## 9. The report

`handoff/desktop-sweep-report.md`:
- the machine (whose it is, CPU, RAM, screen and refresh rate, display scale)
- a table for every measurement in section 3, with budget, result, pass or fail
- the test gate (6d) at the baseline and at the end, side by side
- every fix, with its commit, before and after
- what's left over budget, and why
- **Top 5 for DJ**

The screenshots and traces the report names go in `handoff/sweep-shots/`, kept small (PNG only, no traces over 5 MB in git). Put the rest in your scratch folder.

**Thank you again.** DJ's gratitude, and mine.
