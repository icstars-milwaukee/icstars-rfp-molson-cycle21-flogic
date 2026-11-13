# Flogic demo run: plan for Fernando's agent

**From DJ (and DJ's Claude):** thank you to Fernando's agent for the Sprint 3 work: key-file sign-in, access levels, the built-in policy and the rebuilt IT console. This plan builds on that work.

> **Rough plan. Test everything for its real purpose.** The code here (and the code you'll be fixing) is imperfect, a starting point and not finished work. "It runs" isn't a pass. A step passes only when a real person doing that job would get what they came for.
> Neither page has been run in a browser since the `phase-final` cleanup (commit 32faf7b), so expect breakage.

---

## 0. Your permissions (you act as DJ on this branch)

**You may:**
- Commit and push to **`phase-final-edit`** after each tested fix. Don't ask first.
- Make files in a scratch folder **outside the repo**, run headed Edge/Chrome, and install Playwright in that scratch folder.

**You may not:**
- Push to `main` or `phase-final`, force-push, delete branches, or rewrite history.
- Commit demo secrets: keyrings, `.flogic-key`, `.flogic-signer`, `.flogic-id` files, packs, or a filled-in `DIRECTORY/it-signerI.js`.
  - Restore the signer before every commit: `git checkout DIRECTORY/it-signerI.js`.
- Close DJ's browser.
  - **Never** run `taskkill /IM msedge.exe`. Only kill processes whose command line has *your* `--user-data-dir`.
  - Never run `msedge.exe --version`, because it opens in DJ's running Edge.

**House rules for fixes:**
- **Line endings.** Files in `DIRECTORY/` and `it-console/` are **CRLF**. Edit them with an editor tool or `perl -pi`, **never `sed -i`**, which strips the CRs.
- **New function names.** Before adding a global function, grep for its name. A name clash once blanked every file.
- **Commits.** Keep each fix small with a plain message, for example `fix(console): ...` or `fix(app): ...`.
- **The tutorial.** It (`markdowns/tutorialwdetails.md`) isn't on this branch. Note each code change in the report (section 5) so DJ can carry it over.
- **Before merging back.** This `handoff/` folder is working notes. Delete it before `phase-final-edit` is merged back into `phase-final`.

---

## 1. "Real user" rules: how to drive the pages

DJ wants this done **as a real person would**, with real keyboard and mouse. Work quickly, but take no shortcuts and don't skip over errors.

**Browser setup:**
- Use a **headed** Playwright Edge (or Chrome) with its own `--user-data-dir` in your scratch folder.
- Open pages over `file:///`, exactly as a user would: `DIRECTORY/testI.html` and `it-console/it-console.html`.

**Clicks:**
- Find the element, scroll it into view, read its `boundingBox()`, then `page.mouse.move` and `page.mouse.click` at its centre.
- Before each click, check that `document.elementFromPoint(x, y)` is the element, or sits inside it. If something covers it, **that's a finding**.
- **Never** use `element.click()`, `dispatchEvent`, or `page.evaluate` to set values or call app functions.

**Typing:**
- Click into the field, then `page.keyboard.type(text, { delay: 25 })`.
- Use Tab, Enter and the arrow keys the way a person would.
- Dates go into `<input type="date">` by typing digits, not by setting `.value`.

**Files:**
- Click the real file button, catch Playwright's `filechooser` event, then `setFiles`. This is the one allowed stand-in for the OS dialog.
- **The folder picker** (`showDirectoryPicker`, "Connect IT's Flogic folder" and "Sign in with your key file") can't be driven by Playwright.
  - Use computer-use or real OS input if you have it.
  - If not, do the folder steps through **drag-and-drop of a real folder**, if you can produce a genuine OS drag.
  - Otherwise, log it as "not tested: needs a human" and use the "open the key file yourself" path instead. Don't fake it.

**Downloads and clocks:**
- Catch every download with Playwright's `download` event and save it into the scratch folder under its suggested name.
- **Wrong-clock personas** (section 3): use `page.clock.install({ time: ... })` before the page loads. This changes what the *page* thinks the date is, the way a laptop with a wrong clock would.

**Evidence and pace:**
- Take a screenshot at each persona's key moments, and on every error. Name them `ucN-step-what.png`.
- **Watch the console.** Log every `console.error`, `pageerror` and failed request. Each one is a finding, even if the screen looks fine.
- Move at human speed, not robot speed. If a person has to wait more than ~2 seconds without feedback, or has to guess what to do next, **log it as a grievance**.

---

## 2. Test data to make first (in the scratch folder)

Make these with a script. Keep them small, but realistic:

| File | What's in it | Why |
|---|---|---|
| `finance_ledger_2026.sql` | `CREATE TABLE` + ~500 `INSERT`s: dates, money like `$1,204.50`, departments | The main "database file" |
| `hr_roster_2026.xlsx` | 2 sheets, ~300 rows, hire dates, some blank cells | Workbook packing |
| `ops_tickets_2026.csv` | ~2,000 rows, quoted commas, a few stray quotes | CSV packing |
| `legacy_projects_2006.xlsx` | Project rows dated **2006**: `3/15/06`, `2006-03-15`, `15-Mar-2006` | The 2006 PM persona |
| `y2k_sales_1999.csv` | Sales dated **1999–2000**, mixing 2-digit years (`12/31/99`, `01/01/00`) with 4-digit years | The 1999 analyst persona (the Y2K edge) |
| `big_warehouse.sql` | ~40 MB | "a bunch of database files" with one heavy one. Test it from a REAL disk file, not an in-memory blob |
| `not_data.pdf`, `empty.csv`, `weird name (final) v2.sql` | Odd inputs | Error paths |

---

## 3. The runs, in this order

Write down **expected vs. what actually happened** for each step. Any mismatch goes into the report.

### UC0: a full IT console run (every section, once)
Open `it-console/it-console.html` and work through each section:

1. **Keyrings.**
   - New keyring with a weak passphrase. It should be refused with a clear reason.
   - Then try a good passphrase (4+ words), with a mismatched "Type it again" first.
2. **Signing key.** Make a signing key, then **Download the app's trust file**. Copy it over `DIRECTORY/it-signerI.js` locally, and don't commit it.
3. **Groups.**
   - Make **Finance** (export on, 15 min), **HR** (export off, 10 min) and **Operations** (export on, 30 min).
   - Try a duplicate id, a bad id (`Finance Team!`), and auto-lock values 0 and 241.
4. **Levels and rules.** Read the table. Does it match `DIRECTORY/policyI.js` (Guest 1 day/5 min/1 group, Viewer 7 days/10 min, Analyst 7 days/30 min with export)?
5. **People.** Add one person at each level.
   - Try no groups, a blank name, and a Guest in 2 groups. Each should be refused.
   - Try a Last day in the past.
6. **Access.**
   - Do "Who has what", **Renew everyone** (Guests must be left out, with the reason shown) and "Which data is for whom".
   - Connect IT's folder. It needs subfolders `u-0001`… for each person.
7. **Packs and saving.**
   - Pack one file from section 2.
   - **Save keyring**, then **🔒 Lock**.
   - Reload the page, then **Open keyring** with a wrong passphrase, then the right one. Everything must still be there.
8. **Make a new signing key.** Tick "I understand", then confirm that old key files are now refused in the app. Then go back to the first signer by bringing in the `.flogic-signer`, if the console offers that.

### UC1: one IT person, 2026, packing a pile of database files for their groups
- **Persona.** Dana, IT, today's date. Dana has 5 files to get out before lunch: the `.sql`, `.xlsx` and `.csv` files from section 2, `big_warehouse.sql`, and the odd inputs.
- **The packing.** Pack each one for the right group.
  - **Expect a grievance:** the pack form takes one file at a time. Time how long 5 packs take, and log the friction.
  - The odd inputs must be refused with clear words.
  - The big file must not freeze the page without any feedback.
- **The hand-off.** Add 6 people across the 3 groups, then make key files into the folder. Check that each `u-000X/flogic.flogic-key` landed in the **right** person's folder.
- **The proof.** Then, in the app, sign in as one person from each group:
  - Their own group's packs open.
  - **Other groups' packs are refused**, with words a non-IT person understands.

### UC2: an IT team doing the same, all at once
- **Persona.** Three IT people (Dana, Luis, Priya) share one keyring file on the shared drive and one signing key.
- **Setup.** Run **three browser profiles side by side**, each with the console open and the same keyring.
  1. Dana adds people while Luis packs files and Priya edits a group's rules.
  2. All three **Save keyring** to the same file, in the order Dana, Luis, Priya.
  3. Re-open the keyring. **Are Dana's and Luis's changes still there, or did Priya's save silently overwrite them?** Last-save-wins with no warning is a real finding, so log it with steps.
- **Same name or id.** Two people each add a person with the same name. Do the `u-000X` ids clash?
- **Signing key spread.** Dana brings in Luis's `.flogic-signer`. Are key files made by either of them accepted by the app?
- **The fix.** If you fix lost saves, prefer the smallest honest fix: detect a newer keyring on save and refuse or warn. Don't build a merge system. Ask DJ before anything bigger.

### UC3: the super-user project manager, as a Viewer, with a laptop clock stuck in 2006
- **Persona.** Morgan, a PM who is in **every group** (allowed for a Viewer, since maxGroups is 0), but at **Viewer** level. Morgan opens `legacy_projects_2006.xlsx`, packed for Operations.
- **Run A: correct clock.**
  - Sign in, set a PIN, then open packs from all 3 groups.
  - Expect the full dashboard and **no export anywhere**, even in Finance, where the group allows it (the stricter rule wins).
  - Try Export report and Save as CSV. Each should be blocked with a clear reason.
  - Auto-lock should be 10 minutes or less.
- **Run B: the laptop clock says 2006** (`page.clock.install`).
  - The key file was issued "in the future". What does Morgan see? It should be a plain "your computer's date looks wrong" message, not a crash and not "ask IT".
  - Log the exact words.
- **Dates in the data.** In the dashboard and queries, are the 2006 dates read as 2006 in every format, including `3/15/06`? Do they sort and filter correctly?

### UC4: the 1999 analyst
- **Persona.** Sam, an **Analyst** in Finance and HR, working `y2k_sales_1999.csv` (packed for Finance).
- **Run A: correct clock.**
  - Does `12/31/99` become 1999 and `01/01/00` become 2000, not 1900 or 2099?
  - Does a query by year split 1999 from 2000 correctly?
  - **Export** works in Finance. Open the Save as CSV result and compare it to the source rows. A file that saves but has wrong data is a FAIL.
  - In **HR** (export off), export must be blocked even though Sam is an Analyst.
- **Run B: laptop clock says 1999-12-31 23:58.** Same check as UC3 run B.
  - Also wait past "midnight" with `page.clock` running. Does anything (auto-lock, key expiry) behave strangely across the year change?

### UC5: Guest
- **Persona.** Riley, a contractor for one day, **Guest**, Operations only.
- **In the console:**
  - Adding a 2nd group must be refused.
  - Set Last day = tomorrow. The key file must say 1 day.
  - **Renew everyone** must skip Riley and say why.
- **In the app:**
  - The **summary** dashboard (first 3 tiles) appears.
  - Auto-lock is 5 minutes or less. Prove it fires with `page.clock`, and that unlocking needs the PIN.
  - No export.
- **Expiry:** move the clock past Riley's day. The key file must be refused with plain words. Then IT renews Riley by name, and they can sign in again.

### UC6: more Viewer cases
- **A pack from another group** is refused with plain words.
- **End access in the console:**
  1. Click End access, then make the next key file. The person must be refused.
  2. Click "Give access back", then make a new key file, and they're back in.
- **The 30-day review:** move the console clock to day 31. Making a key file must be refused until "Still needed" is clicked.
- **Two viewers, one laptop:**
  1. Sign in as person A, then lock.
  2. Sign in as person B. A's open data must be gone.
  3. Then switch back to A with A's PIN.

### UC7: more Analyst cases
- **Level down:** move an Analyst down to Viewer in the console, then make a new key file. Export must disappear in the app.
- **Tampered key file:** open a `.flogic-key` in a text editor, change `"level":"viewer"` to `"analyst"` (or push `expires` out by 30 days), and save. The app must refuse it.
- **Wrong PIN:** enter it 5+ times. What happens, and is it clear?

### UC8: the older way, and no sign-in
- **The older way:** People, then "The older way: a credential file".
  1. Make one, hand over the code, then click "I've handed it over. Hide it."
  2. In the app, go to **Set up with a credential file**, enter the code and passphrase, then open a pack.
- **No sign-in:** **Open a plain file without signing in** with a plain `.csv`. It must work and be tagged "unlocked".
  - Then try to open a `.flogic` pack in that mode. It must ask for sign-in, not crash.

---

## 4. What to fix, and what to only report

**Fix it now** (test the fix, commit, push to `phase-final-edit`):
- Crashes and console errors.
- Dead or covered buttons.
- Wrong or missing error words.
- Key files landing in the wrong folder.
- Wrong date handling.
- Export leaking where it shouldn't.
- Anything where the screen says one thing and the files say another.

**After each fix**, re-run the whole persona that found it, not just the one step, with real input again.

**Report only, and ask DJ** (these are design choices, and DJ makes them):
- Batch packing UI.
- Multi-admin keyring merging.
- Changes to levels, days or minutes in `policyI.js`.
- New storage in the browser. DJ treats "nothing stored client-side" as a selling point.
- Any visual or layout redesign.

**Security-relevant failures** (a tampered key file accepted, a pack opened by the wrong group, export allowed for a Viewer):
- Stop and fix those first.
- Mark them **SECURITY** in the report.

---

## 5. The report (`handoff/demo-run-report.md`, committed with the fixes)

For each persona UC0–UC8:
- **Pass, Fail, or Not tested** (and why).
- **Each finding:** steps to reproduce, expected, actual, a screenshot name, and the fix commit (or "reported, needs DJ").
- **Grievances:** things that work but annoy. Include time-to-do for UC1/UC2.
- **The tested list:** which fixes were tested and how, and which weren't.
- **Code changes for the tutorial:** file, function, and what changed.

End with the top 5 things DJ should look at first.

Thanks again, Fernando's agent. DJ is grateful for the help.
