# Flogic desktop sweep: report

**From Fernando's agent, 15–16 Nov 2026, and continued by DJ's agent on 16 Nov, branch `phase1-grid-menus`.**

## Where it ended (DJ's agent, 16 Nov)

The full account, job by job, is in `SCANME/returns/SWEEP-CONTINUE-v0.1.0-2026-11-16.md`. In short:

| Left over, below | Now |
|---|---|
| The IT console redraws everything on every edit | **Fixed** (`106936f`): longest task per edit 34–57 ms → 9–27 ms, people rows built 105 → 0 or 1 |
| Sideways scroll, 300 columns | **Fixed** (`96b66fd`): paints of the sheet 95 → 22 per 60 notches. The new frame rate is **not measured** |
| The drawer covers ▶; Back to file under the tabs | **Fixed** (`791d1e7`): both gate tests pass in the desktop build at 1280 × 672 |
| Idle with the Sheet in front (the Ready glow) | **Fixed** (`8047777`, DJ's call): 5 fades, then it rests |
| Dark grey first frame at launch | **Tried, not committed:** the window colour made no difference on DJ's machine, and flashed light for dark-theme users |
| Wheel in focus mode | **Not settled** |
| Opening a 207 MB file; packing 40 MB | Unchanged: DJ's decision (a Worker) |
| The Castle Claude gate | **Run:** all pages as before; `run.js` 22 fails; `fuzz.js` 162 fails (the plan says 185) |
| The release build | **Built and started**, blank trust file |

**The frame numbers below are Fernando's laptop only.** DJ's machine is a virtual machine with no graphics card (WebView2 paints in software: even plain scrolling is 100 % over budget there), so no frame rate from it is in this report. The "after" frame sweep, and the new numbers for the two scrolling fixes, still need a machine with a GPU.

Everything from here down is Fernando's agent's report, as written.

---

**The short version**

- **Both apps work** (plan section 7), after one fix: the title bar went dead after every Lock.
- **Six fixes are pushed**, each measured before and after:
  - the dead title bar
  - 15% of a CPU core burned while idle
  - one Rust round trip per resize step
  - a window bigger than the screen
  - the carousel change you asked for (6b)
  - a progress count on "Renew everyone"
- **Not done:**
  - **The "after" frame measurements.** My last run broke on a typo in my own script.
  - **Four performance problems found but not fixed:**
    - the IT console's full redraw with many people
    - sideways scrolling in a wide file
    - a 0.5 s freeze opening a 207 MB file
    - the Ready glow, which still costs some CPU on the Sheet
  - **Two covered-button layout bugs,** both shown by your own gate tests.
- **Gate:** nothing that passed at the baseline fails in Edge. In the desktop build, one check now fails because the window is now its true height (see the test gate section).

---

## The machine

Fernando's laptop, not DJ's. So the trust file in git is the blank one; I made a test one and put the blank one back before every commit.

| | |
|---|---|
| CPU | Intel i5-1135G7, 4 cores / 8 threads |
| RAM | 15.4 GB |
| Screen | one, 1920 × 1080 at **60 Hz**, **150 % scale** (the page sees 1280 × 672 when maximized) |
| WebView2 | 157.0.4341.46 |
| Power | Balanced plan. **On battery for the last IT run and the last staff run**, with Teams, VS Code, Chrome and Google Drive running (CPU 46 % busy at one point). Those "after" numbers are noisier than the baseline. |
| Installed for this run | Python 3.12, Rust (rustup, MSVC), Visual Studio 2022 Build Tools (C++) |

**How it was driven**

- Release sweep builds (`--features sweep`), driven over the DevTools port with real mouse and keyboard input.
- **Windows' own dialogs:**
  - Playwright's `filechooser` event does fire through `connectOverCDP` here, and so does `download`.
  - For the native Open and Select Folder windows, and WebView2's "Allow" prompt, I used Windows UI Automation, scoped to the app's own process ids: `handoff/sweep-tools/sweep/pick.ps1`.
- **Window resizing:** `SetWindowPos` in 120 small steps (`winctl.ps1`). That is not a real edge drag (see "Not tested").

---

## Section 7: do the apps work at all?

| App | Result |
|---|---|
| **Flogic IT** | **Pass.** New keyring, two groups, people, key file into a connected folder, 3 packs into `packs/<group>/` (one for two groups), save, the keyring stamp. Tab never lands on the title bar. Dark theme. Close with unsaved changes: ✕, and the system close message that Alt+F4 and the taskbar send, both only warn the first time, clear after 8 s, and close on the second try. |
| **Flogic (staff)** | **Pass, after fix `1b835f9`.** Folder picker, key file, PIN, a signed pack (lands on the Dashboard), a Finance+HR pack, a plain file ("not locked"), Export report and Save as CSV (99 rows + header, right), Lock, close and reopen (the laptop copy is remembered under `%LOCALAPPDATA%\org.icstars.flogic\staff`, PIN only). |

**Found:** after Lock, the whole title bar was dead: no ✕, no minimize, no maximize, no moving the window. The sign-in card makes everything in `<body>` inert, and the bar was in `<body>`. Screenshots: `sweep-shots/titlebar-dead-after-lock-before.png`, `titlebar-after-lock-fixed.png`.

**Not tested here:** 125 % scale (this screen is 150 %, and I didn't change Fernando's display), and where downloads land with no Playwright attached.

---

## Section 3: the measurements

### Start-up

Six launches each. "First" means the first launch after closing every Flogic WebView2 process, not after a restart.

| | Budget | Staff before | Staff after | IT before | IT after |
|---|---|---|---|---|---|
| Window visible, first launch | < 1.5 s | 681 ms | 637 ms | 850 ms | 553 ms |
| Clickable, first launch | < 2 s | 681 ms | 637 ms | 850 ms | 553 ms |
| Window visible, later launches (median) | < 500 ms | **607 ms** | **622 ms** | **545 ms** | **569 ms** |
| White frames | none | 0 of 6 | 0 of 6 | 0 of 6 | 0 of 6 |
| Failed requests at start | none | none | none | none | none |

**What the start-up numbers show:**

- **Warm start is over budget on this laptop** (about 0.6 s; you saw about 0.36 s). The page's own part is small: WebView2 reaches `navigationStart` about 420 ms after the process starts, and the page is painted about 170 ms later. All 14 scripts together run in **14 ms** at load.
- **No white flash, but one dark grey frame** (rgb 49,49,49, about 30 ms) shows before the page's colors. Setting the webview's background color should remove it. Handed on.
- **Leftover work at start: none worth moving.** Coverage shows that only 20 % of `queryI.js` and 35 % of `flogicI.js` run before the card is up, but parsing and running everything takes 14 ms. Deferring scripts would save almost nothing, and it is on your ask list anyway.

### Loads, staff app

Timed inside the page, from the file being handed over. The "after" run was on battery.

| Load | Before | After | Progress shown? | Longest freeze |
|---|---|---|---|---|
| Sign in with the PIN | 122 ms | 183 ms | — | — |
| `incident.csv`, 25,000 × 30, 10 MB | 161 ms | 859 ms ¹ | after: yes | 17 / 67 ms |
| `five_sheets.xlsx` | 19 ms | 26 ms | no | 17 ms |
| `wide_300col.csv`, 2,000 × 300 | 43 ms | 57 ms | no | 17 ms (after: 82 ms task) |
| Pack `incident.flogic`, 10 MB | not measured ² | 883 ms | yes | 50 ms |
| `big_warehouse.sql`, 535,500 rows, 40 MB | 2.45 s (dashboard 2.66 s) | 2.18 s (2.23 s) | yes, at 0.15 s, with % | 53 ms |
| `million_12col.csv`, 1,000,000 × 12, 76 MB | 1.40 s (2.44 s) | 1.33 s (2.38 s) | yes | 54 / 50 ms |
| `incident.csv` big, 535,000 × 30, 207 MB | 5.56 s | 4.07 s (7.04 s) | yes | **640 / 533 ms: OVER** |
| Ask, simple filter, 535k rows | 415 ms | 391 ms | — | 70 ms |
| Ask, `GROUP BY`, 535k rows | 607 ms | 513 ms | — | 51 ms |
| Ask, `ORDER BY`, 535k rows | 2.38 s | 1.51 s | answer badge only ³ | 71 ms |
| Checks → Run all (3 suggested), 535k rows | 1.00 s, no long task | not re-run | — | — |

¹ **Big swing between the two runs.** The after run was on battery and busy, so re-measure it on AC power before believing it.
² A bug in my harness: the vault stops the change event before my timer saw it. Fixed in the harness.
³ Over 1 s with no progress of its own. Worth a look.

**The 207 MB file freezes the page for about 0.55 s** in one long task, while it reads the file or cuts it into rows. Fixing that means chunking or a Worker, which is on your ask list.

### Loads, IT app (100 people, 500 pack entries)

| Load | Before | After (battery) |
|---|---|---|
| Open the keyring | 255 ms | 428 ms |
| Make a key file into the folder | 197 ms | 295 ms |
| Renew everyone (90 people, folder) | 8.2 s, said only "Working…" | 13.2 s, counts "Renewing 12 of 90: name…" (`b81289a`) |
| Pack 1 small file | 198 ms | 233 ms |
| Pack 19 files, each into 2 group folders | 3.7 s | 5.8 s |
| Pack the 40 MB file | 511 ms, **one 135 ms long task** | 730 ms, 146 ms task |
| Save the keyring | 362 ms | 482 ms (one 194 ms task) |

### Frames (60 Hz, judged against 16.7 ms)

**Staff baseline: 44 of 55 interactions within budget** (p95 ≤ 16.7, max ≤ 33, under 1 % over, no long task over 50 ms).

| Over budget | p95 | Over 16.7 ms | Worst | Notes |
|---|---|---|---|---|
| **Sideways wheel, 300 columns** | 33.5 ms | **30.8 %** | 50 ms | No long tasks and no forced layouts. The trace is all Paint and Commit (556 ms of paint in 4.2 s): paint-bound, not script. |
| **Wheel in focus mode** | 33.3 ms | 13.4 % | 50 ms | **Inconsistent:** a profiling run of the same thing straight after was 0 % over. Needs 3 fresh runs. |
| Wheel, fast (90 big notches) | 16.8 | 1.0 % | 33.4 | one frame |
| Spreadsheet View flip and back | 16.9 | 1.4 % | 33.2 | one frame |
| Ask → Enter, `GROUP BY` on 535k | 17.0 | 1.9 % | 33.4 | one frame |
| Switch to Neo-Dark | 17.0 | 2.8 % | 33.3 | one frame |
| Dashboard → Sheet tab | 16.8 | 1.4 % | 17.8 | essentially fine |

**Skipped by the harness:**

- "Show the full dashboard" and Hide/Show: the harness looked for the button after it had gone.
- **The drawer open while stepping ▶ through 55 matches: impossible, because the drawer covers ▶.** See the layout bugs below.
- Reopening Details: the Details ▾ button sat under the title bar when the page was scrolled.

**Everything else ran at 60 fps:**

- the turns, the ticket rail held down, End and Home on 535k rows
- the wheel, the scrollbar drag, PageDown and arrow keys held down
- search and stepping 40 matches
- opening and closing the drawer, the empty fields, hovering cells
- dashboard Edit, ◀ ▶ and S M L, + Add a tile
- Ask, Checks, Lock and unlock

**IT baseline: 5 of 9.**

- **Every edit redraws the whole console.** Adding a person, editing a person and editing a group each cause **one or two long tasks of 56–68 ms (83–116 ms on battery)**. `refresh()` rebuilds every table: 2,566 nodes and 529 buttons.
  - Turning off the card blur and the button transitions only brought the worst frame from 67 ms to 50 ms.
  - The cost is the rebuild itself, so it needs redrawing only the table that changed. That counts as a needless redraw, so it is fix-now, but I didn't get to it.
- **Scrolling the console** had one 66 ms frame on a fast scroll back up.
- **The pack list does not have the redraw problem.** Ticking boxes in the 19-file list and "Same groups for every file" stayed within a frame, even though the list redraws on every tick.

### The title bar (staff and IT)

- **All work:** Maximize and Restore (the button's icon and label follow), double-click to maximize and back, Minimize and back.
- **Resizing** in 120 steps (slow) and 60 steps (fast) stayed at **60 fps**, with no blank areas and no sideways scrollbar.
- **The page asked Rust "is it maximized?" 118 times for 120 sizes** (and 60 for 60). After `9865fb4` it asks once.

### Idle CPU (% of one core, 60 s doing nothing)

| | Before | After `dd52a9c` (quiet) | After (busy, battery) |
|---|---|---|---|
| Staff, sign-in card up | **15.0 %** | 1.7 % | 1.6 % |
| Staff, signed in, Dashboard in front | 0.2 % | 0.5 % | 1.1 % |
| Staff, signed in, **Sheet in front** | **15.3 %** | **5.2 %** | 10.4 % |
| IT, start screen | 0.36 % | — | — |

**The cause was the "Ready" glow** in the snap menu. It sits inside the blurred glass bar, so each of its 60 redraws a second made the graphics process blur the bar again.

- **Fixed:** behind the sign-in card the glow is now paused, and the fade moves in 12 steps instead of 60 frames a second.
- **Still left:** the Sheet still idles at 5–10 %. Getting to about 0 % means stopping or dropping the glow, which changes what a person sees, so that's yours to decide.

### Memory (working set, all 6 processes)

| When | Working set | Private |
|---|---|---|
| Staff at start | 454 MB | 239 MB |
| Signed in, no file | 458 MB | 225 MB |
| After the 40 MB file (535,500 rows) | 830 MB | 585 MB |
| Right after Lock | 551 MB | 308 MB |
| **60 s after Lock** | **493 MB** | **245 MB** (back within a minute: **pass**) |
| IT at start | 396 MB | 186 MB |

---

## The test gate (6d), baseline and end side by side

| Test | Baseline | End | Notes |
|---|---|---|---|
| `stations-test`, Edge | 34 / 34 | **41 / 41** | Updated with 6b: tab order, and which side each station comes in from (+7 checks) |
| `drawer-test`, Edge (1366 × 640) | 28 / 28 | 28 / 28 | |
| `checks-test`, Edge | 25 / 25 | 25 / 25 | |
| `excel-test` | `-5`, `-12.5`, `=SUM(B2:B4)`, `@handle` | the same | |
| `usability-audit` | | **identical** to the baseline | |
| `stations-test`, desktop build | 34 / 34 | **41 / 42** | See below |
| `drawer-test`, desktop build | **30 / 35** | **30 / 35** | The same 5 fails at the baseline. See below |
| Castle Claude pages and `query-test` | **not run** | **not run** | They are on your machine only. **DJ needs to run these before merging.** |

**About the gate runs:**

- **Headless Edge sometimes opens at 500 × 320** whatever size it is asked for, and then every layout check fails. My gate runner reruns a test when its `INFO` line says 500 × 320.

**The two layout bugs:**

1. **The Details drawer covers the snap menu's ▶ (and the Checks button) at 1280 px wide or less.**
   - It also fails in Edge at 1280 × 640 and 1200 × 640, and passes at 1366 × 640. A 1080p laptop at 150 % is exactly 1280 wide.
   - Screenshot: `sweep-shots/drawer-covers-next-match-1280wide.png`.
2. **After a dashboard tile click, "← Back to file" sits under the sticky tab bar** at the window's true height of 672 px, until the page is scrolled.
   - This showed up only after `9bc1a19`. Before it, the window hung 57 px below the screen, so the page thought it had 729 px and the test passed.

---

## The fixes, with before and after

| Commit | What | Before | After |
|---|---|---|---|
| `1b835f9` | The title bar works while the sign-in card is up | After Lock, the ✕'s spot hit `<html>` (dead) | It hits the ✕, and it closes the window |
| `dd52a9c` | The Ready glow, idle | 15.0 % (card up) / 15.3 % (Sheet) of a core | 1.7 % / 5.2 % |
| `9865fb4` | One maximized check per resize, not per size | 118 round trips (120 sizes); 60 (60) | 1; 1 (60 fps both) |
| `9bc1a19` | The window never starts bigger than the screen | 1942 × 1106 window on a 1920 × 1008 work area; Lock chip behind the taskbar | Starts maximized when it doesn't fit. Start-up unchanged |
| `9e4f4db` | 6b: the carousel centered on the Dashboard | Sheet · Dashboard · Ticket | Ticket · Dashboard · Sheet |
| `b81289a` | Renew everyone counts along | "Working…" for 8 s | "Renewing 12 of 90: name…" |

**How 6b was checked:**

- **Sides:** all six turns come in from the side they should. I read the incoming station's `turn-in-*` class mid-turn and took screenshots: `sweep-shots/turn-dashboard-to-sheet-midway.png`, `turn-dashboard-to-ticket-midway.png`.
- **Rest state:** nothing stays turned at rest.
- **Keys:** ← →, Alt+1/2/3 and Back/Forward follow the new order.
- **Right after a turn:** focus mode fills the window and the drawer sits on screen.
- **Unchanged behaviour:** a tile click still turns to the Sheet, and the app still starts on the Sheet.
- **Frames:** every turn runs at 60 fps (p95 16.9 ms, worst 17.1 ms).

---

## What's left over budget, and why

| What | Over by | What it would take | Whose call |
|---|---|---|---|
| IT console edits with 100 people | 56–116 ms long tasks | Redraw only the table that changed, not all of `refresh()` | fix-now (handed on) |
| Sideways scroll, 300 columns | p95 33 ms, 31 % of frames | Find out why each sideways step repaints so much (paint-bound) | fix-now if needless (handed on) |
| Opening a 207 MB file | one 0.55–0.64 s freeze | Chunk the read and cut, or a Worker | **DJ** (Workers) |
| Packing 40 MB in IT | one 135–146 ms task | The same | **DJ** |
| Idle with the Sheet in front | 5–10 % of a core | Stop or drop the Ready glow | **DJ** (visible change) |
| Warm start | 0.55–0.62 s vs 0.5 s | Mostly WebView2's own start on this laptop. Check on yours first | — |
| Dark grey first frame at launch | ~30 ms | The webview's background color = the page's | fix-now (handed on) |
| Drawer covers ▶ at ≤ 1280 px; Back to file under the tabs at 672 px | dead buttons | Layout | fix-now, ask if it moves anything visibly |

## Not tested

- Moving the window by dragging the title bar, snapping to a half, and a real edge drag. I resized with `SetWindowPos`, not the OS drag.
- Moving between two screens (this laptop has one).
- 125 % scale.
- Drag-and-drop of a folder.
- A true cold start after a restart.
- Chrome.
- The release build from `build.ps1` (only sweep builds were made).
- The "after" frame sweep, staff and IT.

---

## Top 5 for DJ

1. **The IT console redraws everything on every edit.** With 100 people, each click costs a 60–110 ms freeze. It is the one thing in this sweep a person will feel. Handed to your agent as fix-now.
2. **Two covered buttons,** both caught by your own gate tests:
   - the Details drawer covers ▶ (and Checks) on a 1280-wide window, which is exactly a 1080p laptop at 150 %
   - Back to file sits under the tab bar at 672 px tall
3. **Big files:** the 207 MB CSV freezes the page for about 0.55 s, and packing 40 MB about 0.14 s. A Worker is your decision.
4. **The Ready glow:** keep it at about 5 % CPU while the Sheet sits idle, or stop it when nothing is happening? It changes what a person sees, so it's yours.
5. **Before merging,** run the Castle Claude gate. Re-run the "after" measurements on AC power on a quiet machine: half of mine were on battery with Teams running. The harness is in `handoff/sweep-tools/`.
