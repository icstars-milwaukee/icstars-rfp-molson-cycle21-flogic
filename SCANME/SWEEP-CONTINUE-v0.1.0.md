# SWEEP-CONTINUE v0.1.0: finish the desktop speed sweep

**To:** DJ's agent. **From:** Fernando's agent. **Branch:** `phase1-grid-menus`.
**Read first:**
- `handoff/desktop-sweep-plan.md`: DJ's plan. Its permissions and rules (section 0) still hold.
- `handoff/desktop-sweep-report.md`: what I measured, fixed and found.

Fernando's agent ran most of the sweep on Fernando's laptop and stopped before the end. This file is the rest of it.

## Where it stands

**Done and pushed:**

| Commit | Change |
|---|---|
| `1b835f9` | The title bar works after Lock |
| `dd52a9c` | Idle CPU of the Ready glow |
| `9865fb4` | One maximized check per resize |
| `9bc1a19` | The window never starts bigger than the screen |
| `9e4f4db` | 6b: carousel centered on the Dashboard, and `stations-test.mjs` updated |
| `b81289a` | "Renew everyone" counts along |

Also done: section 7 (both apps work), and the baseline measurements for sections 3 and 4.

**Not done:** the jobs below. The report's "after" columns are partly empty or noisy, because half of the last runs were on battery with Teams running.

## The harness

All of it is in `handoff/sweep-tools/`. Read its `README.md`: setup, the order to run things in, and the quirks. Two parts are worth keeping:

- **`sweep/pick.ps1`** answers the app's own Windows dialogs (Open, Select Folder, the WebView2 Allow prompt) through UI Automation, scoped to the app's process ids.
- **`sweep/winctl.ps1`** reads and drives the app's window from outside (rect, restore, the system close message, a stepped resize).

## Jobs

| # | Job | Done when |
|---|---|---|
| C1 | **Re-measure "after", on AC power, on a quiet machine.** `startup.js staff` and `it`, `loads-staff.js`, `frames-staff.js` (all of it), `it-measure.js`, `idle.js`. | Every "after" cell in the report is filled from a quiet run, and the machine line says whose machine, and on AC |
| C2 | **IT console: stop redrawing everything on every edit.** `refresh()` rebuilds every table: with 100 people that's 2,566 nodes and 529 buttons. Adding or editing a person, or editing a group, gives one or two 56–116 ms long tasks. Redraw only what the change touched: people → people, to-do, data list; group → groups, choices, data list, person groups; and so on. Turning off the blur and transitions didn't help much (67 → 50 ms). | `it-measure.js` shows no long task over 50 ms on those three edits, with a before and an after number. `sec7-it.js` still passes. Own commit |
| C3 | **Sideways wheel on a 300-column file:** p95 33.5 ms, 31 % of frames over. No long tasks and no forced layout: it's Paint and Commit (`profile.js` shows it). Find what repaints on each sideways step (the header row, spacer widths in `--columns`, the glass?). Fix it if it's needless work. | Under budget, or the report says why not and what it would take |
| C4 | **Wheel in focus mode:** 13 % over in the sweep, 0 % in a profiling run straight after. Run it 3 times fresh and settle it. | One honest number in the report |
| C5 | **Covered buttons**, from DJ's own gate. (a) At 1280 px wide or less, the Details drawer covers the snap menu's ▶ and the Checks button: `drawer-test` fails 5 checks in the desktop build at the baseline, and in Edge at 1280 × 640. (b) At the true 672 px height, "← Back to file" sits under the sticky tab bar after a dashboard tile click: `stations-test` in the desktop build, 1 fail. (c) When the page is scrolled, Details ▾ can sit under the title bar. Smallest layout fix. Ask DJ if it visibly moves anything. | `drawer-test` and `stations-test` pass in the desktop build at 1280 × 672. Edge still passes |
| C6 | **The first frame at launch is dark grey** (rgb 49,49,49, about 30 ms) before the page's colors. Tauri 2.12.5 has `WebviewWindowBuilder::background_color`: match the page (light theme `--page`). | `startup.js` shows the first frame in the page's own color, and start-up no slower |
| C7 | **Needs OS-level input or a human:** move the window by dragging its title bar; snap to the left and right halves; resize from each edge and corner with a real drag (I used `SetWindowPos`); move between two screens; 125 % scale; drag-and-drop of a folder; a cold start after a restart; where downloads land with no Playwright attached. | Each one tested, or marked **needs a human** in the report |
| C8 | **DJ's machine only:** the Castle Claude gate (`tools/run-tests.sh` pages, `query-test` `run.js` and `fuzz.js`), as in plan 6d. | Results in the report, side by side with any earlier ones |
| C9 | **Before merge:** `powershell -File desktop/build.ps1` with the blank trust file (the build warns that key-file sign-in is off), and check both exes start. Delete `desktop/target/shared/debug` if you made one. | Two release exes start. `git status` clean |

## Don't change, ask DJ

These are on the plan's "Report and ask DJ" list. The report has the numbers for each.

- **A Worker or chunking for big files.** The 207 MB CSV freezes the page for 0.55–0.64 s, and packing 40 MB in IT freezes it for 135–146 ms.
- **Stopping or dropping the Ready glow.** The Sheet still idles at 5–10 % of a core because of it.
- **Deferring scripts.** It's not worth it: all 14 run in 14 ms at load.

## Rules, from the plan

- **Git:**
  - Commit and push to `phase1-grid-menus` only, one commit per tested fix, with a before and an after number.
  - Never push to `main`, `phase-final`, `phase-final-edit` or `phase-final-edit-path-rust`, and never force-push.
- **Never commit:**
  - keyrings, key files, packs, test data
  - a filled-in `DataPage/it-signerI.js`
  - anything under `desktop/target`, `desktop/dist` or `desktop/out`
- **The trust file:**
  - `sweep-tools/sweep/build.ps1 -Trust` puts the test trust file in for the build and checks out the blank one after.
  - On DJ's machine, copy DJ's real `it-signerI.js` aside first, and put it back.
- **Data and processes:**
  - Made-up data only.
  - Stop only the processes you started (`sweep-*.exe`, and the `msedgewebview2.exe` whose command line has `webview-exe-name=sweep`).
- **Before every change:**
  - Files are CRLF.
  - Check a new global function name isn't already used.
- **After every fix:** run the gate (`sweep-tools/sweep/gate.ps1 -Name <tag>`).

## Return

When you're done, put your return in `SCANME/returns/SWEEP-CONTINUE-v0.1.0-<date>.md`. For each job, say: done, blocked or needs a human, the commit, and the before and after numbers. Then finish `handoff/desktop-sweep-report.md`.
