# Return: SWEEP-CONTINUE v0.1.0, and the release that followed

**From:** DJ's agent. **To:** Fernando's agent, and DJ. **Date:** 16 Nov 2026.
**Branches:** `phase1-grid-menus` (all the work) and `release/0.3.0` (the same commits, cut for the Docker deploy).

DJ stopped the sweep partway ("halt development") and asked for four things instead: the IT console in make order, data packs that ride in key files, the Ready glow paused, and a Docker release. This file covers both halves.

## What needs someone's eyes first

1. **The Actions tab.** `.github/workflows/ci.yml` is new, and its first run is the first time the Docker image has ever been built: the machine it was written on has no Docker. I could not see the run (the repo is private). If the `image` or `publish` job is red, read its log before anything else.
2. **Frame rates need Fernando's laptop.** DJ's machine is a virtual machine with no graphics card: WebView2 reports `gpu_compositing: disabled_software`. Even plain scrolling there is 100 % over budget with zero long tasks. So C1's frame cells, C3's new p95 and C4 are **not measured**. The work that repaints is measured (it is the same on any machine); how long a frame takes is not.
3. **Two fixes change what a person sees**, and DJ has not looked at them yet: the Details drawer is narrower in a window 1,340 px wide or less (C5), and cells don't glow under the mouse while the sheet is scrolling (C3).

## The nine jobs

| # | Job | State | Commit | Before → after |
|---|---|---|---|---|
| C1 | Re-measure "after" on a quiet machine | **Partly.** Start-up and the IT loads were measured on DJ's machine (below). The staff loads, idle and frame sweeps were cut off by the halt | — | See "C1 numbers" |
| C2 | IT console: stop redrawing everything | **Done** | `106936f` | Longest main-thread task per edit, 5 runs each: add a person 56.6 → 16.5 ms; edit a person 42.8 → 26.6; edit a group 33.9 → 9.3; Still needed 40.3 → 10.5. People rows built per edit: 105 → 0 or 1. No task over 50 ms. `sec7-it` passes |
| C3 | Sideways wheel, 300 columns | **Fixed, frame rate not re-measured** | `96b66fd` | 60 sideways notches: paints of the sheet 95 → 22; painting 669–788 ms → 230–323 ms. Needs a GPU machine for the new p95 |
| C4 | Wheel in focus mode | **Not settled** (needs a GPU) | — | Same cause as C3, smaller: 90 notches, paints of the sheet 290–330 → 243 with C3's fix |
| C5 | Covered buttons | **(a) and (b) done.** (c) left | `791d1e7` | Desktop build at a 1280 × 672 page: stations 1 fail → pass, drawer 5 fails → pass. Edge 1280 × 640 drawer: 5 fails → pass |
| C6 | Dark grey first frame | **Tried, not committed** | — | See "C6" |
| C7 | Needs OS input or a human | **Needs a human.** Not attempted | — | Title-bar drag, snapping, a real edge drag, two screens, 125 % scale, folder drag-and-drop, a cold start after a restart, where downloads land with nothing attached |
| C8 | Castle Claude gate | **Done** | — | See "The gate" |
| C9 | Release build, blank trust file | **Done** | — | Both exes built (3.1 MB each), the build warned that key-file sign-in is off, both started with their window and no DevTools port, both closed on the system close message |

### How C2 was found and fixed

`refresh()` rebuilt every table on every change. The people table is the big one. Each row now writes down what it shows as one string; a row is built again only when that string changes. The data list and the packs table are skipped when nothing in them changed. `it-rows-check.js` proves the other half: each change still shows, on the right rows only (a group rename rebuilds exactly that group's 33 people; a change of minutes rebuilds none).

`it-measure.js`'s own long-task count was 0 before and after on DJ's machine (a faster CPU than Fernando's laptop), so the before and after numbers come from `edit-cost.js`, which reads the renderer's own tasks from a trace.

### How C3 was found

`paint-probe.js` traces paint invalidations. The sheet scrolls on its own compositor layer, so a scroll alone should not repaint it. But with the mouse resting on the sheet, a new cell slides under the pointer on every step, the `:hover` glow jumps to it, and the whole sheet layer is painted again. Two things that did **not** fix it: giving the sticky row numbers their own layers (no change), and turning off only the glow's look (95 → 57 paints: the hover itself costs). What did: while the sheet moves, and for 0.15 s after, the rows don't take the mouse.

**The cost:** a click within 0.15 s of the last scroll step lands on the sheet, not on a cell.

### C5 details

- **(a) The drawer.** It was always 420 px wide while the page's column is centred, so at 1,340 px or less it reached past the file bar's right edge. It now stops at that edge: 366 px at 1280, never under 300, and 420 on anything wider.
- **(b) Back to file.** A dashboard tile scrolled the sheet to the very top, behind the sticky tab bar. It now scrolls the answer's top row to just under the bar, reading the bar's real height and stick point.
- **(c) Details ▾ under the title bar when the page is scrolled:** left. It is ordinary sticky-header behaviour: a person sees it half-hidden and scrolls.
- **The harness:** `EXE_SIZE=1280x672` makes `stations-test` and `drawer-test` resize the desktop window to that page size on any screen.

### C6: what happened

`background_color(#b8bcc3)` on the window builder made no difference on DJ's machine in 5 of 6 staff launches. The page has already painted before the window shows (first paint 373–411 ms, window visible 420–460 ms); the wrong first frame is the desktop showing through until Windows composes the window. In the one launch where the colour did show, the app was in Neo-Dark, so it showed as a **light flash before a dark page**. Not committed.

To do it properly the colour has to follow the person's theme, which needs a new command the page can call. Today the page can only use the title-bar commands. **DJ's call.**

### C1 numbers (DJ's machine, 6 launches each)

| | Budget | Staff | IT |
|---|---|---|---|
| Window visible, first launch | < 1.5 s | 500 ms | 608 ms |
| Window visible, later launches (median) | < 500 ms | **460 ms** | **459 ms** |
| White frames | none | 0 of 6 | 0 of 6 |

Warm start is inside the budget on DJ's machine (it was 0.55–0.62 s on Fernando's laptop).

IT loads, 100 people (one run each; this machine swings by 30 % between runs, so these say "the same", not "faster"): open the keyring 129 → 128 ms; pack 19 files 3.2 → 3.6 s; Renew everyone 8.0 → 10.5 s; save 399 → 674 ms; the 40 MB pack still has one 241–254 ms task.

## The gate

| Test | Baseline (DJ's machine) | End |
|---|---|---|
| `stations-test`, Edge | 41 / 41 | 41 / 41 |
| `drawer-test`, Edge 1366 × 640 | 28 / 28 | 28 / 28 |
| `checks-test`, Edge | 25 / 25 | 25 / 25 |
| `excel-test` | the four rows right | the same |
| `usability-audit` | | same; the clicked cell is still not covered |
| `stations-test`, desktop build | 41 / 41 | 41 / 41 (and passes at 1280 × 672) |
| `drawer-test`, desktop build 1280 × 861 | 29 + 6 fails | 31 + **1 fail** |
| `drawer-test`, desktop build 1280 × 672 | 5 fails | all pass |
| Castle Claude pages | | aim 48, break-it clean, focus 77/77, drag 36, view 41, afterquery 21, vault 44/45, ask 58, query 65, deadends 51 (2,400 steps) |
| `query-test` `run.js` | 22 fails (known) | 235 pass, 22 fail |
| `query-test` `fuzz.js` | 185 fails (the plan's number) | 1,838 pass, **162** fail |

- **The one desktop drawer fail left** ("page scrolled so the file bar is off screen") is the test, not the app: at 861 px tall the page is too short to scroll the file bar away. It passes at 672.
- **`fuzz.js` 162, not 185:** `queryI.js` was not touched in this work. I did not find out why the count differs from the plan's. One of the first 16 failures it prints is not a big-number case: `LOWER('Ãrea')` gives `ãrea` here and `Ãrea` in SQLite (SQLite's `LOWER` is ASCII-only). **Worth a look by DJ.**

## After the halt: what DJ asked for

| Commit | What |
|---|---|
| `d6cf091` | **Preset data in key files, and the IT console in make order** |
| `8047777` | **The Ready glow** fades 5 times (12 s), then rests |
| `d41cd9a` | **Docker:** `Dockerfile`, `docker-compose.yml`, `deploy/`, and CI on every push |

### Preset data ("pack inside the key file", DJ's pick)

- **IT:** under Data packs, tick "Also put in key files" when packing a small file. It is kept in the keyring, still locked, and goes into every key file made for a person in one of its groups.
- **Staff:** the newest one opens by itself right after sign-in, on the Dashboard, with a "From IT, for you" button to open it again.
- **Signed:** the key file's claims hold the hash of the pack list. An edited key file still signs in; its data is refused.
- **Never stored on the laptop.** It arrives with the key file: at a first sign-in, and at a PIN sign-in when the folder can be read.
- **The limit is 180 KB of pack**, because a key file stays under 256 KB. That is about 2,000 ticket rows. A bigger file is packed as always and IT is told why it isn't in key files. Raising the limit is a one-line change to a safety check, so it is DJ's to decide.
- **One thing a person will notice:** someone whose key file carries data is asked by the browser to allow the folder at each PIN sign-in (unless they pick "Allow on every visit"). That prompt is how the data gets read.

### IT console order

Today → 1 Groups → 2 People → 3 IT's folder → 4 Data packs → 5 Key files → Who has which data → Levels → Signing key. Key files are last because they carry what was made before them.

### Docker

- The image is nginx serving the app's own files, and nothing else: the build fails if a page folder holds anything that isn't app code.
- IT's console is left out unless asked for (`--build-arg IT_CONSOLE=1`).
- `connect-src 'none'`: the browser stops the page sending anything anywhere. `web-check.js` shows this blocks nothing the app needs.
- **Sign-in needs HTTPS** (or `localhost`). On a plain `http://` address only plain files open.
- **Key-file sign-in needs IT's trust file mounted** (`docker-compose.yml` shows how). The repo's is blank.
- `deploy/README.md` has the rest.

**Not done:** no host, no live address. A `v0.3.0` tag is not made yet: make it once a CI run is green (`git tag -a v0.3.0 release/0.3.0 -m "0.3.0" && git push origin v0.3.0`).

## Harness changes worth knowing

- **`build.ps1 -Trust` used to end with `git checkout DataPage/it-signerI.js`.** On DJ's machine that file is DJ's real trust file, uncommitted: the checkout would have destroyed it. It now saves whatever is there and puts it back (`6b275f3`).
- **`sec7-it.js` starts from a fresh app profile.** After a few grants of the same folder, WebView2 shows a different prompt ("from the last time you visited this site") that UI Automation cannot see or press.
- New: `edit-cost.js`, `it-rows-check.js`, `paint-probe.js`, `preset-check.js`, `web-check.js`, `winctl.ps1 size`, and a `.gitignore` for everything the scripts make.

## Still DJ's to decide

- A Worker or chunking for big files (the 207 MB freeze, the 40 MB pack).
- The window's colour at launch (C6).
- Whether IT's console goes in the public image.
- The 180 KB preset limit.
- Folder access on a Mac: Tauri uses Safari's engine there, which has no folder picker. It would need Rust's file plugins.
