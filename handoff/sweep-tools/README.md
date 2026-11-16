# The sweep harness

These are the scripts Fernando's agent used for `handoff/desktop-sweep-report.md`. They drive the real desktop window (a sweep build) with real mouse and keyboard input, through Playwright's `connectOverCDP`, and measure it.

**They're rough.** They were written on the way, for one laptop. A failure can be the harness's fault, so read the failing line before changing the app.

## Setup (once)

```
cd handoff\sweep-tools\demo
npm init -y; npm install playwright-core xlsx
node gen-data.js                                   # the earlier made-up set: ledger .sql, 2006/1999 files, big_warehouse.sql (40 MB), odd inputs
cd ..\sweep
node gen.js                                        # 1,000,000 x 12 CSV, 300-column CSV, 5-sheet xlsx, 20 small CSVs
py -3.12 -I ..\..\tests\make-tickets.py fake          # incident.csv (25,000), expected.json
py -3.12 -I ..\..\tests\make-tickets.py fake-big 535000
py -3.12 -I ..\..\tests\make-negatives.py fake\negatives.xlsx
```

**What else it needs:**

- Edge
- Node 22+
- Python 3.12
- Rust with the MSVC toolchain and the Visual Studio C++ Build Tools

**Paths and generated files:**

- The repo is found relative to this folder.
- IT's stand-in "drive folder" is `%USERPROFILE%\Documents\flogic-demo-run\`. Edge refuses folders under AppData.
- Everything the scripts make goes next to them: `data/`, `fake/`, `world/`, `out/`, `shots/`, `profiles/`, `sweep.log`. **Never commit those.**

## The order

```
cd handoff\sweep-tools\sweep
powershell -File build.ps1                 # both sweep builds, blank trust file
node sec7-it.js                            # section 7, IT: makes world\it-signerI.js and the IT folder (key files, packs) the staff app uses
powershell -File build.ps1 -Which staff -Trust   # staff build WITH the test trust file (the blank one is checked out again after)
node sec7-staff.js                         # section 7, staff: signs Dana in (PIN 4827) and leaves her laptop copy for the others
node gen-keyring.js                        # world\hundred.flogic-keyring: 6 groups, 100 people, 500 pack entries
powershell -File gate.ps1 -Name base       # the test gate (plan 6d): Edge + the desktop build
node startup.js staff 6 base ; node startup.js it 6 base
node loads-staff.js base ; node frames-staff.js base ; node it-measure.js base ; node idle.js base
node tb.js staff base ; node tb.js it base ; node turns.js
```

## What each one is

| File | What |
|---|---|
| `sweep/sweeplib.js` | Start an app (`startApp`), stop only what we started, frame and long-task recorder (`measure`: 3 runs, the median), `timeLoad` |
| `sweep/deskhelp.js` | The app's own dialogs (`dialog`, `pickFolder`), `chooseFiles`, `download`, the window from outside (`win`) |
| `sweep/staffhelp.js` | Staff app: PIN, the station tabs, `openTimed` (opens through the real Open window and times it inside the page), `askTimed` |
| `sweep/pick.ps1` | Answers Open, Select Folder and Save As through their own controls (WM_SETTEXT + BM_CLICK), then WebView2's Allow prompt. Scoped to the process ids given |
| `sweep/winctl.ps1` | The app's top window: `rect`, `restore`, `close` (the system close message), `sweep` (a 120-step resize with `SetWindowPos`) |
| `sweep/launch.ps1` | Starts an exe and watches the screen every 16 ms (when the window shows, and the colors where it lands: the white-flash check) |
| `sweep/startup.js` | Start-up times and the white flash |
| `sweep/loads-staff.js`, `it-measure.js` | Section 3 loads, staff and IT. `it-measure.js` also does the IT frames |
| `sweep/frames-staff.js` | Section 4, staff. `--only=stations,scroll,search,drawer,wide,dash,ask,checks,theme,lock` |
| `sweep/idle.js`, `idle-mem.js` | Idle CPU of our processes; memory through a session; start-up coverage |
| `sweep/tb.js`, `tb-inert.js` | The title bar: maximize, double-click, minimize, resize and its round trips, the bar under the sign-in card |
| `sweep/turns.js` | 6b: which side each station comes in from, read mid-turn |
| `sweep/sec7-it.js`, `sec7-staff.js` | Plan section 7. Both start from a fresh app profile unless given `--keep` |
| `sweep/preset-check.js` | Preset data in the real windows: IT packs a small file "for key files", the key file carries it, the staff app opens it by itself at sign-in; an edited key file's data is refused. Run after the two `sec7` scripts |
| `sweep/web-check.js` | The app as a web page under the Docker image's headers (`deploy/stand-in.mjs`): the security policy blocks nothing the app needs, a key file opened by hand brings its preset up, and a `fetch` from the page is blocked |
| `sweep/it-rows-check.js`, `edit-cost.js` | IT console: each change shows on the right rows only; what one edit costs the main thread |
| `sweep/paint-probe.js` | What repaints while the sheet scrolls (a paint-invalidation trace in headless Edge) |
| `sweep/profile.js`, `prof-it.js`, `proflib.js` | A CPU profile and timeline trace around one interaction |
| `sweep/exp-it.js`, `exp-idle.js` | Experiments only: turn CSS off through the stylesheet (the pages forbid inline styles) and measure |
| `sweep/build.ps1`, `gate.ps1` | Build the sweep builds; run DJ's test gate |
| `demo/*` | The click and type helpers from the demo run (`click` checks `elementFromPoint` first), and the keyring and person helpers |

## Quirks

- **WebView2's "from the last time you visited this site" prompt** (Allow this time / Allow on every visit) replaces the plain folder prompt after a few grants of the same folder, and UI Automation can't see or press it. Start from a fresh app profile (the `sec7` scripts do) to get the plain one.
- **`build.ps1 -Trust`** puts back whatever trust file was there before (on DJ's machine that is DJ's real one), not git's blank one.
- **Headless Edge** in DJ's tests sometimes opens at 500 × 320, whatever size it is asked for. `gate.ps1` runs a test again when its `INFO` line says 500 × 320.
- **A file over 50 MB** can't go through `fileChooser.setFiles` to a CDP-connected browser. Open it through the real Open window (`openTimed` does).
- **The vault catches the file input's change event** for a `.flogic` file. Listen on `window`, capturing, to time it.
- **Cargo doesn't always see** that `DataPage/it-signerI.js` changed. `build.ps1 -Trust` touches the file's time.
- **The staff laptop copy** lives in `%LOCALAPPDATA%\org.icstars.flogic\staff`. `sec7-staff.js` deletes it unless given `--keep`.
- **After `9bc1a19`** the window starts maximized on a screen with less than 1280 × 860 free. `tb.js` restores it before resizing.
- **The machine:** close Teams and friends, and plug in, before measuring. On battery the numbers move by 30–50 %.
