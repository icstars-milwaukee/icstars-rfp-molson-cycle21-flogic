# Demo Runbook

**Team:** Flogic
**Project:** Molson Coors Project
**Demo length (minutes):** 12

## Roles

- **Driver (keyboard + mouse):** Dj
- **Narrator (talks to the room):** DJ + Fernando
- **Backup (watches the clock, runs the fallback, takes over if someone freezes):** ⚠ name one person. "Two laptops" is the backup *hardware*; the role still needs a name.

## Quality gate (before EVERY run, including rehearsals)

**Why this isn't `npm run gate`:** the T11A gate checks `.env` keys, a JSON seed file and HTTP health endpoints. Flogic has none of those: no server, no API, no `.env`. Both apps run on the laptop and read files from disk. So the gate below checks the four things that actually break a Flogic demo, in the same four groups (env, data, credentials, health). Green on every line, or you don't start.

**Every teammate runs this gate themselves at least once** (DEL-1113 sign-off). Log each run in the table under the checklist.

- [ ] **Env ready:** `desktop\out\Flogic.exe` and `desktop\out\Flogic IT.exe` exist and were built **after the last code change** (`powershell -File desktop\build.ps1`, on `phase1-grid-menus`). The fallback pages `DataPage\flogic.html` and `it-console\it-console.html` open in Edge.
- [ ] **Data seeded:** the demo folder holds only made-up people (Dana, Morgan Lee, Riley Contractor). The clean keyring copy is in `$demo\clean\`. The three demo files are there: the Projects file, the client's `incident.csv` (23,334 rows, approved for the demo), and a `.sql`. The tampered key file is on the desktop. **Morgan is in Finance and Operations only, not HR**, and an HR-only pack is already in `packs\hr\` (step 9 needs both).
- [ ] **Creds verified:** the app's trust file matches the demo keyring. The committed `DataPage\it-signerI.js` is **blank on purpose** (`FLOGIC_IT_SIGNER = null`), and an exe built from it has key-file sign-in switched off. Proof: open the keyring in Flogic IT. There is no "the app trusts a different key" warning at the top. Then sign Morgan in once on the staff app.
- [ ] **Health check OK:** both exes start and show their own title bars. The keyring opens with the IT passphrase. The demo shared folder connects in Flogic IT (permission prompt answered). Morgan's Finance pack opens.
- [ ] **Fallback ready:** in the last 24 hours, both pages were opened in Edge from the repo folder and `handoff\shots\` opens. ⚠ There are no screenshots yet for steps 7–8 (drawer, Checks) or for the desktop apps. See DEFECT_BURNDOWN D-30.
- [ ] **Screen ready:** notifications off, zoom at 125%+, unneeded windows closed, laptop plugged in, and you've clicked **Forget me on this laptop** for every demo person since the last run.

| Date | Run by | Green? | What was red, and what fixed it |
|---|---|---|---|
| ⚠ | | | |

## Demo script

Each step: what the driver does, what the narrator says, what the room should see, and the fallback if it fails.

Built from the latest work on `phase1-grid-menus` (on top of Sprint 3's `phase-final-edit-path-rust`): the two Windows apps (**Flogic** for staff, **Flogic IT** for IT), packs shared across groups and signed by IT, packing many files at once, the fixes from the UC0–UC8 demo run, and the new Phase 1 work: the **ticket drawer** (click a cell, see the whole ticket) and **Checks** (a saved list of questions that pass or fail, run on the open file in one click).

**Before the room fills:** both apps open side by side (Flogic IT on the left, Flogic on the right). A demo keyring with made-up people only: Dana (IT), Morgan Lee (Viewer: Finance, Operations; **not HR**, so step 9 has a group to refuse), Riley Contractor (Guest: Operations). One made-up HR file (like the 13 Nov run's `hr_roster_2026.xlsx`; never real HR data) is already packed for **HR only**, so `packs/hr/` holds a pack Morgan can't open. The demo shared folder is connected. A pre-made tampered key file sits on the desktop. The three demo files are ready: the Projects file, the client's `incident.csv` (23,334 rows), and a `.sql`. Do **not** use drag-and-drop of a folder: no human has tested it yet. Use the folder picker you rehearsed.

| # | Driver does | Narrator says (one line) | Room sees | Time (sec) | If it fails |
|---|---|---|---|---|---|
| 1 | Show both apps side by side on the title bars: Flogic IT on the left, Flogic on the right. | **Fernando:** "Molson Coors teams need to work with sensitive data files, and IT needs to decide exactly who sees what, even with no network." | Two Flogic windows with their own title bars. No browser, no login site. | 30 | If an app won't start, open the same page in Edge (`it-console/it-console.html` or `DataPage/flogic.html`). It's the same engine, so say "same app, in the browser" and keep going. |
| 2 | In Flogic IT, type the IT passphrase under "Open keyring" and press **Enter**. Scroll the people list. | **DJ:** "IT holds one keyring. Every person gets a level (Viewer, Analyst or Guest) and the groups they belong to." | The keyring opens, showing the people list with levels, groups and key-file dates. | 40 | Wrong passphrase: retype it slowly. Still refused: open the backup copy of the demo keyring (see Reset). |
| 3 | Try to put Riley (Guest) in a second group and click Save. Then fix it, and click **Make key file** for Morgan into the connected folder. | **DJ:** "The console refuses mistakes in plain words. A Guest gets one group and one day, nothing more." | "A Guest can be in 1 group only." Then Morgan's key file lands in Morgan's folder. | 60 | If the folder picker misbehaves, download the key file instead and say "IT can also hand it over by hand." |
| 4 | Click Pack, pick the three demo files at once (Projects, `incident.csv`, the `.sql`), click **Same groups for every file**, tick Finance and Operations, then Pack. | **Fernando:** "IT packs many files at once. Each pack is locked for its groups and signed by IT, so nobody can fake or change one." | One row per file. Packs written to `packs/<group>/` in IT's folder, one copy per group. | 60 | If writing to the folder fails, the packs download. Show the Downloads folder and keep the story going. |
| 5 | In Flogic, sign in as Morgan from Morgan's folder. Type PIN `1111` (refused), then a real PIN. | **DJ:** "Staff sign in with the key file IT made. No password server. The PIN protects this laptop's copy." | "Hi, Morgan Lee / IT gave you: Viewer · Finance · Operations". `1111` refused, real PIN accepted. | 60 | Sign-in refused: open the key file by hand with the file button. Still stuck: switch to the screenshots in `handoff/shots/` (fallback below). |
| 6 | Open the Finance Projects pack. Ask a question: `SELECT Project, Start, YEAR(Start) FROM Projects ORDER BY Start`. | **Fernando:** "Dates written the everyday way, like 3/15/06, now count as dates. They sort right, and the totals match the source file." | Rows sorted in real date order, with a year on every row. | 60 | If the query errors, run the pre-typed copy from the notes. If that fails, show `uc3-a-dates-sorted.png`. |
| 7 | Open the `incident.csv` pack. Click any cell in a ticket row. Click **Show the empty fields**, then press **Escape**. | **DJ:** "Click any cell and the whole ticket opens beside it. The cell you clicked stays in view, and the empty fields fold away." | A drawer on the right titled like "INC… · Row 2 · 23 of 44 filled". The clicked cell sits just left of it. Escape closes it and the page doesn't jump. | 40 | If the drawer doesn't open, use **Details** in the snap menu (same drawer). Still nothing: say what it does and move on. |
| 8 | Click **Checks** next to Ask. Click **Run all**. On the failed check, click **Show >**. | **Fernando:** "This is the start of automation. Flogic writes checks from the file: row count, no blank or repeated ticket number, no group over 40 open tickets. Next week's export runs the same checks in one click, and a check never passes quietly." | Row count 23,334 passes. No blank or repeated Numbers passes. The over-40 check fails: "1 row, like TCS-ServiceDesk-L1-NA-WE". The encoding check fails with 8,163 rows. Show > opens the failed group in the sheet. | 60 | If Run all fails, read the list of checks aloud and say "each one passes, fails with what failed, or says why it couldn't run." |
| 9 | Point at the off **Export report** button. Then open the HR pack from `packs/hr/` (made before the room filled). Don't use a pack from another keyring: its message points the wrong way (DEFECT_BURNDOWN D-18). | **DJ:** "Access follows the person's level and group, and the app always says why. Finance is allowed to export, but Morgan is a Viewer, so the stricter rule wins. And Morgan isn't in HR, so HR's data stays shut." | "A Viewer can't export" on the off button. "This pack is for HR. You're not in that group." | 45 | If the HR pack **opens**, Morgan's key file was made with HR in it: read the expected line aloud, move on, and fix Morgan's groups before the next run. Don't debug on stage. |
| 10 | Click **Lock**. Click **Someone else**, then **Someone new on this laptop**. | **Fernando:** "Our test run found a real security hole: on a shared laptop, someone could sign in as the last person without their PIN. We fixed it. Now a new person always starts fresh." | Data and the Checks list leave the screen. The sign-in screen asks for a folder or key file, not Morgan's PIN. | 60 | If it shows Morgan's card, stop the live part and show `uc6-two-02-someone-new-before-fix.png` as "before". Say the fix is in commit `8c9a9f5`. |
| 11 | Open the tampered key file from the desktop (Morgan's file, edited from Viewer to Analyst). | **DJ:** "Change one word in a key file and the app refuses it." | "This key file has been changed since IT made it." | 30 | If the file is missing, skip the step and say "we tested 5 kinds of tampering, all refused." |
| 12 | Switch to the summary slide. | **Fernando:** "We tested 9 personas with real mouse and keyboard: 233 checks passed, and the 2 that failed are known limits. One we're honest about: ending someone's access takes effect when their key file runs out, up to 7 days. Next we close that gap, add a way to share the signing key, and grow Checks into weekly automation." | Summary slide: what works, what we found and fixed, the 2 known limits, next steps. Then Q&A. | 50 | If there's no slide, say it out loud. The product story beats the app. |

**Total live time:** about 9 minutes 55 seconds. That leaves about 2 minutes for slips and the handoff to Q&A inside the 12. If you're running long, cut step 11 (tampered key file) first.

**Hard questions to have an answer ready for:**
- "What happens when someone leaves?" The key file still works until it runs out (7 days, or 1 day for a Guest). The console says so on screen. Closing that gap is the top fix in the plan.
- "What if two IT people edit the keyring at once?" The console warns and refuses the second save while the folder is connected. It doesn't merge yet.
- "Does it need the internet?" No. Everything runs on the laptop, and that's the point.
- "Can we trust the answers?" The query engine is tested against real SQLite. A recent fix makes `LIKE` match big and small letters only for A–Z, exactly like SQLite. On the client's `incident.csv`, every check result matched Python's csv module (23,334 rows, 1 group over 40 open, 8,163 rows with encoding scars).
- "Can we keep the checks?" Yes. Save them as a small `.json` file and load them next week. Nothing is stored in the browser.

## Offline / mock data fallback

- **How the app switches to offline or mock data:** Flogic is offline by design. Both apps run on the laptop and read keyrings, key files and packs from disk or the connected folder, so a network drop doesn't affect the demo. The fallback ladder covers a broken app: (1) the desktop exe won't start → open the same page in Edge; (2) a step misbehaves → show that step's screenshot from `handoff/shots/` in the `phase1-grid-menus` branch; (3) both laptops fail → the summary slide.
- **How the audience can tell (banner, label):** Leaving the desktop app is visible, because Edge's address bar and tabs appear above the page. Screenshots go full screen with the label "From our test run, 13 Nov". The narrator also says it out loud.
- **What the narrator says when it happens:** "The app runs fully offline. This is the same page outside the desktop shell" (for Edge), or "This is the exact screen from our test run, so let me walk you through it" (for screenshots).

Run these from the root of `icstars-rfp-molson-cycle21-flogic`, on the `phase1-grid-menus` branch. In order: the desktop apps (built with `desktop\build.ps1`), then fallback 1 (the same pages in Edge), then fallback 2 (the test-run screenshots).

```powershell
Start-Process ".\desktop\out\Flogic IT.exe"
Start-Process ".\desktop\out\Flogic.exe"

Start-Process msedge ".\it-console\it-console.html"
Start-Process msedge ".\DataPage\flogic.html"

Start-Process ".\handoff\shots"
```

## Failure injection results

> **Why this section was rewritten (2026-11-15).** The earlier text here described a different app: a chaos-proxy network outage, a "fallback banner", a `DEMO_MODE=offline` switch and a "filtered view for the main business metric". Flogic has no API to proxy, no banner and no `DEMO_MODE` setting, and step 3 of this script is the IT console, not a drill-down. So that text can't be a record of a Flogic run, and it was taken out. The lines below stay blank until the team actually runs the injection.

**The chaos proxy doesn't apply to Flogic**, because nothing goes over the network: cutting the network changes nothing (and that's worth proving once, out loud). The real failures for this demo are the ones in the "If it fails" column. **The backup picks one, without warning the driver, mid-run:**

| Injection | How the backup does it | The fallback that should take over |
|---|---|---|
| Network dies | Turn the laptop's wifi off during step 6 | Nothing should change. Say "it's offline by design." |
| The staff app dies | Close `Flogic.exe` from Task Manager during step 7 | Fallback 1: `DataPage\flogic.html` in Edge, sign in again, carry on |
| The folder is gone | Rename the demo shared folder before step 5 | Open Morgan's key file by hand with the file button |
| A step misbehaves | Hand the driver a note "step 8 is broken" | Fallback 2: the screenshot for that step |

Earlier evidence that the app itself survives bad input: the 13 Nov demo run (`handoff/demo-run-report.md` on `phase1-grid-menus`) ran 9 personas with real mouse and keyboard. There were no crashes and no console errors, a wrong clock, tampered key files and odd files were each refused in plain words, and 233 of 235 checks passed. That was a test run, not a mid-demo injection, so it doesn't fill the lines below.

- **Which step we were on when the network died:** 
- **What the app did (blank screen? spinner? fallback?):** 
- **What the presenters did:** 
- **What we changed afterwards:** 
- **Second injection, after the change: what happened:** 

## Reset between runs

How to get back to the exact starting state (data, logins, open tabs) in under a minute.

In Flogic, click **Forget me on this laptop** for each demo person who signed in. Then close both apps and run the commands below. Set `$demo` to your demo folder first. It must hold only made-up people.

**One-time setup for step 9:**
1. In Flogic IT, set Morgan to Finance and Operations only.
2. Pack the made-up HR file for HR only.
3. **Save keyring**, and copy the saved keyring to `$demo\clean\it.flogic-keyring`.
4. Copy the HR pack to `$demo\clean\packs\hr\`.

The reset below deletes every pack and then puts that HR pack back.

```powershell
$demo = "$HOME\Documents\flogic-demo"   # set to your demo folder

Get-Process "Flogic*" -ErrorAction SilentlyContinue | Stop-Process
Remove-Item "$demo\shared\packs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$demo\shared\flogic-keyring.stamp" -ErrorAction SilentlyContinue
Copy-Item "$demo\clean\it.flogic-keyring" "$demo\it.flogic-keyring" -Force
New-Item -ItemType Directory -Force "$demo\shared\packs\hr" | Out-Null
Copy-Item "$demo\clean\packs\hr\*" "$demo\shared\packs\hr\" -Force   # the HR-only pack for step 9

Start-Process ".\desktop\out\Flogic IT.exe"
Start-Process ".\desktop\out\Flogic.exe"
```

## Side-by-side rehearsal feedback

From the team that watched you. **The watching team writes this, not us.**

> The earlier text here mentioned an "API call", a "drill-down" and a "fallback banner". Flogic has none of those, and no team name was given, so it was taken out (2026-11-15). Fill it in from a real side-by-side run.

- **Watched by team:** 
- **Where the demo felt unreliable or slow:** 
- **Where they got lost in the story:** 
- **The one change they'd make:** 
