# Flogic demo run: report for DJ

**From Fernando's agent, 13 Nov 2026.** All nine runs (UC0–UC8) were done on `phase-final-edit`, with real mouse and keyboard in a headed Edge. Twelve fix commits are pushed. Nothing was pushed anywhere else.

**The short version**

- Both pages work. Neither crashed, and there was not one console error, page error or failed request in the whole run.
- **One security hole was found and fixed** (UC6): on a shared laptop, anyone could sign in as the last person without their PIN.
- Dates like `3/15/06` and `12/31/99` were read as plain words. That's fixed.
- Three IT people on one keyring silently lost each other's work. That now warns. It does not merge.
- Two things are **not** fixed because they are design choices: ended or demoted people keep their old access until their key file runs out, and packing is one file at a time. See "Top 5" at the end.

**The last full run.** After the final fix, every run was done again from a fresh keyring, in one go (about 18 minutes):

- 233 checks passed and 2 failed. Both failures are the limits reported below, kept in the scripts on purpose: two consoles still give two people the same id (UC2), and a level-down doesn't reach a laptop already in use (UC7).
- UC4 stopped part-way in that run because of a timing slip in my test script (the Ask menu folded shut between a check and a click). Run again on its own, UC4 passed 21 checks. One more check there ("not locked yet at 9.5 idle minutes") tripped because someone moved the real mouse over the test window during the idle wait, which rightly restarted the idle clock. In the earlier clean run it passed: still open at 9.5 minutes, locked at 10.5.

---

## How it was tested

- **Browser.** Headed Edge through Playwright, one `--user-data-dir` per "laptop" in a scratch folder outside the repo. Pages opened over `file:///`.
- **Clicks and typing.** Every click was a real mouse move and click at the element's centre, after checking `elementFromPoint`. Every value was typed with the keyboard. Dates were typed as digits. Selects were changed with the arrow keys. Nothing was set through `evaluate`.
- **Files.** The real file button, then Playwright's `filechooser`. Downloads were caught and read back from disk.
- **The folder picker.** Playwright can't drive it, and I had no computer-use tool. I answered the native "Select Folder" window and Edge's own "Allow" prompt through their own controls with Windows UI Automation, scoped to the test browser's process. So the folder steps ran on real folder handles, but **no hand clicked the picker**. Treat them as tested, with that caveat.
- **Drag-and-drop of a folder: not tested. Needs a human.** (Both pages.)
- **Clocks.** `page.clock.install` before the page loads, then `fastForward`.
- **Where the evidence is.** Screenshots, downloads and the step-by-step log are in the scratch folder on Fernando's machine, not in the repo: `%LOCALAPPDATA%\Temp\claude\…\scratchpad\demo\` (`shots\`, `downloads\`, `final.log`). The stand-in for the shared drive is `Documents\flogic-demo-run\` (Edge refuses folders under AppData). Ask Fernando if you want the screenshots committed.

---

## Results by run

| Run | Result | Fix commits |
|---|---|---|
| UC0 full console run | Pass, after 4 fixes | `ababb8b`, `7d2a6da` |
| UC1 one IT person packing | Pass, after 1 fix | `b90f74d` |
| UC2 IT team at once | **Failed before**, pass after the fix. Limits remain. | `b48224b` |
| UC3 Viewer in every group, 2006 clock | **Failed before**, pass after 3 fixes | `76edb50`, `ba3f765`, `01e8ca7` |
| UC4 the 1999 analyst | Pass (needed the UC3 date fix) | — |
| UC5 Guest | Pass | — |
| UC6 more Viewer cases | **SECURITY fail before**, pass after the fix | `8c9a9f5` |
| UC7 more Analyst cases | Pass, with one reported limit | `f5134c3` |
| UC8 older way, no sign-in | Pass, after 1 fix | `9269591` |

---

## UC0: full IT console run. Pass, after fixes

Everything in the plan's eight steps did what it should. Weak passphrase, mismatch, duplicate id, bad id (`Finance Team!`), auto-lock 0 and 241, no groups, blank name, Guest in two groups and a past Last day were each refused with a clear reason. The levels table matches `policyI.js`. Save, Lock, reload, wrong passphrase, right passphrase: everything was still there.

**Findings**

1. **Enter did nothing in the passphrase boxes.**
   - Steps: type the IT passphrase under "Open keyring", press Enter.
   - Expected: the keyring opens. Actual: nothing. You had to find the button.
   - Fix: `ababb8b`. Screenshot: `uc0-12-wrong-passphrase.png`.
2. **After "Make a new signing key", old key files were still shown as good.**
   - Steps: make Vera a key file, replace the signing key.
   - Expected: the list says her key file no longer works. Actual: "key file good until Nov 20", and the to-do list said nothing about her. The file said one thing, the screen another.
   - Fix: `ababb8b`. The keyring now notes which signing key signed each key file. Screenshots: `uc0-14-new-signer.png`, `uc0-15-console-after-new-signer.png`.
3. **The console said nothing when the app next to it still had the blank trust file.** Key-file sign-in is off in the app in that state, and IT got no hint. Fix: `ababb8b`.
4. **"This key file wasn't made by this company's IT."** gave the person no next step. It now ends "Ask IT for a new key file." Fix: `7d2a6da`. Screenshot: `uc0-25-old-key-refused.png`.
5. **Reported, needs DJ: there is no way to save a `.flogic-signer` out of the console.** The console can bring one in, but not hand one out. Step 8's "go back to the first signer" only worked because I lifted the `signer` block out of the old keyring file with a text editor. Bringing it in then worked, and the tick box was enforced.

**Notes**

- A new keyring already comes with a signing key, so the plan's "Make a signing key" has nothing to click on a fresh keyring.
- After the new signing key, the app refused Vera's old key file both ways: opened fresh, and from a laptop that already had her PIN copy.
- With the folder: cancelling the picker says so plainly. "Renew everyone" renewed the Viewer and the Analyst and left the Guest out with the reason. Each `u-000X` subfolder held the right person's file.

---

## UC1: one IT person packing. Pass, after one fix

Dana packed five files, added six people, made key files into the folder, and one person from each group signed in. Each `u-000X/flogic.flogic-key` was the right person's. Own-group packs opened. Other groups' packs were refused with "This pack is for HR. You're not in that group."

**Findings**

1. **An empty file packed without complaint.**
   - Steps: pack `empty.csv` (0 bytes).
   - Expected: refused. Actual: "Packed empty.csv (0 bytes) into empty.flogic (158 bytes) for Finance."
   - Fix: `b90f74d`. It now says `"empty.csv" is empty (0 bytes), so there's nothing to pack.` Screenshot: `uc1-04-odd-inputs.png`.
2. `not_data.pdf` was refused: "Only .csv, .xlsx and .sql files can be packed." `weird name (final) v2.sql` packed and opened fine.
3. **The 40 MB file was no trouble.** Read from a real disk file, it packed in about half a second with no freeze. In the app it opened in under 3 seconds and showed all 535,500 rows.

**Grievances**

- **One file at a time.** Five packs took 9 seconds at machine speed. That hides the real cost: each pack is three actions (pick file, pick group, Pack), one OS file window and one download. Five files is 15 actions, 5 file windows and 5 downloads to move by hand. I'd guess two minutes for a person, and more when the group has to change each time. **Reported, needs DJ** (batch packing).
- The group box keeps its last choice, so it's easy to pack a file for the wrong group. Nothing asks "are you sure" and a pack can't be taken back.
- Adding six people took 15 seconds at machine speed.
- The console only looks at the file's ending. A PDF renamed `.csv` would pack.

---

## UC2: an IT team at once. Failed before the fix. Pass after, with limits

Three browser profiles side by side, the same keyring file, the same shared folder.

**Findings**

1. **Last save wins, silently.**
   - Steps: Dana adds a person, Luis packs a file and adds a person, Priya changes HR's auto-lock. All three click Save keyring, in that order, over the same file. Re-open it.
   - Expected: a warning. Actual: all three were told "Saved". Only Priya's change was left. Dana's person, Luis's person and Luis's pack entry were gone.
2. **Two consoles gave two different people the same id.** Dana's "Nora New" and Luis's "Lars Other" both became `u-0007`.
3. **So the second key file overwrote the first.** `u-0007/flogic.flogic-key` held Nora's file, then Lars's. After Priya's save, the keyring listed neither of them, but a valid signed key file for Lars sat in the folder. That is access IT's own list doesn't show.

**Fix: `b48224b`.** The smallest honest one, as the plan asked. No merging.

- Each save is counted, and leaves a small stamp file in IT's Flogic folder (`flogic-keyring.stamp`: a number, a date, and the keyring's random name. Nothing secret).
- Before a save, the console reads the stamp. If someone saved after this copy was opened, the first click on Save refuses and says so. A second click saves anyway.
- Opening an old copy with the folder connected says a newer one exists.
- Making a key file stops if that person's folder already holds a key file made out to a different name. "Renew everyone" leaves that person out and says why.

After the fix: Dana saved (save 1). Luis and Priya were refused with "Someone saved a newer copy of this keyring on … Saving this copy would undo their changes. Open the newest keyring file and make your changes there." Luis was also stopped before overwriting Nora's key file. Both re-opened the newest file, redid their changes and saved (saves 2 and 3). All four changes were there at the end, and Lars got `u-0008`. Screenshots: `uc2-02-luis-same-id.png`, `uc2-03-save-luis.png`, `uc2-05-stale-copy-warning.png`.

**Limits of the fix. All need DJ.**

- **It only works while IT's folder is connected.** The keyring is saved as a download, so the page can't see the file on the drive. Without the folder, the Save message now says nobody will be warned.
- **Ids still clash.** Two consoles still hand out the same next id. The person is only stopped at "Make key file".
- **The refused person has to redo their work** in the newest copy. That is the cost of no merge.
- The stamp is a new file in the shared folder. If you'd rather not have it, this fix has to be done another way (for example, saving the keyring through a file handle instead of a download).

**Signing key spread.** A second keyring with the same passphrase brought in the team's signer, and the app accepted its key files. A signer locked with a different passphrase was refused with clear words. But see UC0 finding 5: there's no button to get the signer out. And a pack from the *other* keyring's "finance" group was refused with "can't be opened with your key. It may have been changed since IT made it." That is safe, but the words point the wrong way: the group id is the same and the key isn't.

**Times.** Three people opening the keyring and connecting the folder: 46 s. Three saves: 14 s. Luis and Priya re-opening and redoing their changes: 17 s. All at machine speed.

---

## UC3: Viewer in every group, and a 2006 clock. Failed before the fixes. Pass after

**Run A, right clock**

- Morgan signed in, set a PIN (`1111` was refused), and opened packs from all three groups.
- Auto-lock choices were 1, 5 and 10 minutes, with 10 marked as IT's limit.
- No export anywhere, including Finance where the group allows it. The Export report button was off and Save as CSV was blocked with nothing downloaded.

**Findings**

1. **The reason for "no export" was wrong.**
   - Expected: something a Viewer in Finance can make sense of. Actual: "Your group can't export" and "Finance can't export. (IT sets this for each group.)" Finance *can* export. Morgan's level can't.
   - Fix: `01e8ca7`. It now says "A Viewer can't export" and "(IT sets each person's access level.)". Where the group is the reason (HR), it still names the group.
2. **The Lock bar covered "← Back to file" and "Drag mode".** The bar is fixed to the bottom-left corner and Morgan's is long (three groups). Fix: `01e8ca7` keeps a strip of the page free under it. It can still overlap at some scroll positions on a narrow window, until you scroll. Screenshot: `uc3-STOPPED.png`.
3. **Dates written the everyday way were not dates.**
   - Steps: `SELECT Project, Start, YEAR(Start) FROM Projects ORDER BY Start`.
   - Expected: 2006 for `3/15/06`, `2006-03-15` and `15-Mar-2006`, in date order. Actual: `YEAR` came back empty, the order was A to Z ("01-Aug-2006" first), and `WHERE Start < '2006-02-01'` returned 55 wrong rows.
   - Fix: `76edb50`. After it: every Start reads as 2006, sorts in date order, and matches its ISO twin on all 120 rows. `WHERE Start < '2/1/06'` gives the same 14 rows as the ISO column. Excel date cells read as 2006 too. Screenshot: `uc3-a-dates-sorted.png`.

**Run B, the laptop says 15 March 2006**

4. **A wrong clock was not noticed at all.**
   - Before the fix, the exact words on the card were: "Hi, Morgan Lee / IT gave you: Viewer · Finance · HR · Operations / … Pick a PIN." Morgan picked a PIN and was in. Screenshot: `uc3-b-signed-in-2006-before-fix.png`.
   - Fix: `ba3f765`. The card now says: **"Your computer's date looks wrong. It says today is Mar 15, 2006, but this key file was made on Nov 13, 2026. Set the date and time on this computer, then try again."** The same words appear when the key file is opened by hand, and at the PIN screen on a laptop that already had a copy. Screenshot: `uc3-b-clock-2006.png`.

**What the clock check can't do.** It catches a clock set to before the key file was made. A clock set back to a day *inside* the key file's life still works, so an expired key file can be stretched by turning the laptop's clock back a few days. Nothing offline can stop that. Reported.

---

## UC4: the 1999 analyst. Pass

**Run A**

- `12/31/99` reads as 1999-12-31 and `01/01/00` as 2000-01-01. Not 1900, not 2099.
- A question by year gave 198 rows for 1999 and 202 for 2000, the same as the source file.
- **Save as CSV in Finance: the saved file was compared with the source, row by row.** 198 rows, same orders, regions, reps and amounts. Screenshot: `uc4-a-03-saved.png`.
- Export report opened, stamped "Sam Khan · Finance · Nov 13, 2026 · y2k_sales_1999.csv (400 rows)". Its numbers file downloaded.
- In HR, Export report was off with "HR can't export", and Save as CSV was blocked.

**For DJ to decide.** In answers and in Save as CSV, a written date now comes out the standard way: the source says `12/31/99`, the saved file says `1999-12-31`. The value is the same and the Y2K doubt is gone, but it isn't letter-for-letter what was in the file. The two-digit rule is Excel's: 00–29 is 20xx, 30–99 is 19xx. That is one constant in `queryI.js`.

**Run B**

- Clock at 1999-12-31 23:58: the "computer's date looks wrong" message, naming Dec 31, 1999. Five minutes later it named Jan 1, 2000.
- A real year change, with IT's console and Sam's laptop both at 31 Dec 2026:
  - The console refused a key file until "Still needed" was clicked (the 30-day review had run out).
  - Sam signed in at 23:56 and worked across midnight. Still signed in. `CURRENT_DATE` became 2027-01-01.
  - After 10 idle minutes it locked and said why (HR's 10 minutes is the stricter group).
  - The PIN unlocked it. Seven days later it signed Sam out with "Your access has ended", and the PIN was refused with "Your access ended on Jan 7, 2027, 11:40 PM. IT renews it in your drive."
- Nothing behaved strangely across the year change.

---

## UC5: Guest. Pass

- **Console.** A second group was refused ("A Guest can be in 1 group only."). The key file lasts 24 hours and the button says "Lasts 1 day (Guest)." "Renew everyone" skipped Riley: "Riley Contractor is a Guest: renew them by name."
- **App.** Three tiles and "Guest view: a short summary." Auto-lock choices were 1 and 5 minutes. No export ("A Guest can't export"). A Finance pack was refused.
- **Auto-lock proved.** At 4 min 40 s idle it was still open. At 5 min 10 s it locked with "Locked after 5 minutes with no mouse or keys", and the data was off the page. A wrong PIN was refused ("9 more tries"). The right one unlocked.
- **Expiry.** Two days on, the app signed Riley out by itself, and the old key file was refused on that laptop and on a fresh one. In the console the button was off with "Riley Contractor's last day was 2026-11-14." IT moved the last day and renewed Riley by name. Riley typed the same PIN and the app took the new key file from the folder: "IT renewed your access."

**Reported, needs DJ.** The Guest summary is a starting view, not a limit. The note under it says "Edit → + Add a tile for more", and a Guest can add every tile.

---

## UC6: more Viewer cases. SECURITY fail before the fix. Pass after

### SECURITY: on a shared laptop, anyone could sign in as the last person without their PIN

- **Steps.**
  1. Frank signs in from his drive folder, opens the Finance pack, clicks Lock.
  2. Someone else clicks "Someone else", then "Someone new on this laptop".
- **Expected.** The sign-in screen, asking for a folder or a key file.
- **Actual.** The card said "Hi, Frank Finance … Pick a PIN." The app had read Frank's key file by itself from his still-connected folder. Any new PIN was accepted. The stranger was signed in as Frank and opened the Finance pack. Two clicks.
- It also meant the second person could never connect their own folder.
- Screenshots: `uc6-two-02-someone-new-before-fix.png`, `uc6-two-03-signed-in-as-a-without-pin-before-fix.png`.

**Fix: `8c9a9f5`** (`vaultI.js`).

- The sign-in screen no longer reads any remembered folder by itself. A new person always picks their folder or key file.
- The remembered folder is now one per person. It is only looked at inside that person's PIN sign-in, to pick up a renewal.
- "Forget me on this laptop" and ten wrong PINs forget that person's folder too.

After the fix: "Someone new" showed the sign-in screen. Hank connected his own folder and signed in. Frank's data was gone, and Hank couldn't open the Finance pack. The card then listed both people. Hank's PIN didn't open Frank, and Frank's own PIN did. After "Forget me", no new PIN for Frank was offered.

**Please read this fix yourself, DJ.** It changes how the app remembers folders. Also know what it does not change: the key file is the login, by design. Anyone who can reach a person's drive folder on an unlocked laptop can still pick it in the folder window and choose a new PIN. The PIN protects the laptop copy, not the folder.

### The other cases

- **A pack from another group** was refused: "This pack is for Finance. You're not in that group."
- **End access.** The first click asks, and says the key file they hold "still works until Nov 20 … it can't be taken back early". The second click ends it. The next key file can't be made (button off: "Frank Finance's access was ended on 2026-11-13."), and "Renew everyone" leaves them out. "Give access back", then a new key file, and Frank was in again.
- **The 30-day review.** On day 30 a key file could still be made ("Review in 0 days"). On day 31 the row said "Review overdue", the button was off with the reason, and "Renew everyone" renewed nobody and said why for each person. After "Still needed", the key file was made.

**Reported, needs DJ: "End access" is not the end of access.** On the day Frank's access was ended, the key file he already held still got him in, on any laptop, because it was still sitting in his drive folder. He was refused only once it ran out. The console is honest about this. But for up to 7 days (1 for a Guest) IT has no way to stop someone. See Top 5.

---

## UC7: more Analyst cases. Pass, with one reported limit

- **Tampered key files: all refused.** Marked SECURITY in the log, all pass. Level `viewer` to `analyst`, export `false` to `true`, the end date pushed out 30 days, the name changed, a signature pasted from another key file: each gave "This key file has been changed since IT made it." Another group's keys pasted in: "This key file's keys don't match it." Not a key file at all: "That isn't a Flogic key file." The same through the folder way. The untouched file was still accepted.
- **Wrong PIN.** Tries 1 to 9 each said how many are left. The tenth: "Too many wrong PINs. This laptop forgot you: open your key file from your drive again." The card went back to the first screen. Connecting the folder again and picking a PIN worked.
- **Level down.** Fiona was moved from Analyst to Viewer and given a new key file. Once she signed in with it she was a Viewer, Export report was off ("A Viewer can't export"), and Save as CSV was blocked.

**Reported, needs DJ: the level-down did not reach the laptop she already used.**

- Steps: Fiona signs in on her laptop as an Analyst. IT moves her to Viewer and makes the new key file. Fiona closes the browser, opens it again and types her PIN.
- Expected: Viewer, no export. Actual: still "Analyst", and export still worked.
- Why: at a PIN sign-in the app only looks in the folder when the key file has under 3 days left, or when the browser still has permission from before. So the old signed key file, which says Analyst, goes on being believed. She became a Viewer only after "Forget me" and connecting the folder again.
- This is export staying where IT took it away, for up to about 4 days. I did not change the daily sign-in, because that is a design choice. I made the console say it (`f5134c3`): "Until then, a laptop they already use may keep their old level and groups: the key file they hold is good until … and can't be taken back early."
- Screenshot: `uc7-01-level-down-existing-laptop.png`.

---

## UC8: the older way, and no sign-in. Pass, after one fix

**The older way**

- The console made `holly.flogic-id` and showed the setup code once. Copy worked. "I've handed it over. Hide it." took the code off the page. The code isn't in the file.
- In the app: no file, a wrong file, a wrong setup code and a weak passphrase were each refused clearly. The setup code worked typed in small letters.
- The recovery code was shown, and Continue waited for "I wrote it down".
- Holly opened the HR pack. Export was off ("HR can't export"). A Finance pack was refused.
- After Lock: a wrong passphrase was refused, the passphrase unlocked, and the recovery code unlocked.

**No sign-in**

- A plain `.csv` opened.
- **Finding: it had no tag.** The "not locked" tag only showed when someone was signed in. Fix: `9269591`.
- A `.flogic` pack in that mode: `"finance_ledger_2026.flogic" is a locked data pack for Finance. Sign in to open it.` No crash, and the plain file stayed open.
- **Finding: a 0-byte file said "This file only has a header row".** It now says the file is empty. Fix: `9269591`.
- The CSV with quoted commas and stray quotes read all 2,000 rows correctly, including `5" hose clamp missing`.

**Reported.** `not_data.pdf` opened as six rows of text. The file window hides PDFs unless you switch it to "All files", so it takes effort to get there, but the app doesn't refuse it.

---

## Grievances: things that work but annoy

- **Packing is one file at a time** (UC1).
- **"Renew everyone" needs the folder connected.** Without it, it's one key file at a time.
- **A downloaded key file is always called `flogic.flogic-key`.** With no folder connected, six people means six files with the same name in Downloads. Putting each in the right person's folder by hand is exactly where a mix-up happens. The app would catch a wrong-person file only by its name on the PIN card.
- **Edge refuses some folders** (anything under AppData, and whole system folders) with its own "Choose a different folder" box. While that box is up, the console still says "Pick a folder in the window that opened".
- **Folder permission is asked again on every new browser start**, unless the person chose "allow on every visit" in Edge.
- **The second and third IT person have to redo their changes** after a refused save (UC2).
- **The Lock bar** can still sit over a button at some scroll positions on a narrow window.
- **"Replace the signing key" stays unfolded after Lock.** Nothing leaks, it just looks half-open.
- **The app is still titled "CSV Reader"** (tab: "CSV Reader Test"). Nothing on the page says Flogic until the sign-in card.
- **The Ask menu folds away as soon as an answer shows**, so "Save as CSV" is two clicks away from the answer it saves.

---

## What was tested, and how

**Fixes tested with real input, by re-running the whole persona:**

| Fix | Tested by |
|---|---|
| `ababb8b` console: Enter, key files after a new signing key, blank trust file | UC0, re-run start to finish |
| `7d2a6da` app: "Ask IT for a new key file" | UC0 app side, both paths |
| `b90f74d` console: empty file | UC1, re-run start to finish |
| `b48224b` console: keyring stamp, folder clash | UC2, before and after, three browsers |
| `76edb50` app: written dates | UC3 run A and UC4 run A, through the Ask menu |
| `ba3f765` app: wrong clock | UC3 run B (before and after), UC4 run B |
| `01e8ca7` app: export reason, Lock bar | UC3, UC5, UC7 |
| `8c9a9f5` app: SECURITY, remembered folder | UC6 two-viewers (before and after), then UC5 again for renewals |
| `f5134c3` console: wording after a change | UC7 (read on the page) |
| `9269591` app: "not locked" tag, empty file | UC8 no-sign-in half |

**Not tested:**

- Drag-and-drop of a folder, on both pages. Needs a human.
- The folder picker by hand. It was driven through UI Automation.
- Chrome. Everything ran in Edge.
- The stamp check without the folder (there is nothing to check: the page only says so).
- A keyring from before this run opening in the changed console was tested (the UC1 keyring had no save count). A keyring from before Sprint 3 (v1) was not.
- Dark theme. All runs were in the light one.
- Printing from Export report ("Print or save as PDF"). Only the numbers file was downloaded and read.
- `git checkout DIRECTORY/it-signerI.js` was run before every commit. The blank trust file is what's committed.

---

## Code changes for the tutorial

`markdowns/tutorialwdetails.md` isn't on this branch, so here is what to carry over.

**`it-console/itconsoleI.js`**

- `newRingId()` (new), `newKeyring`, `openKeyring`, `keyringText`: the keyring file has two new fields, `rev` (how many saves) and `ring` (a random name). `KEYRING_VERSION` is unchanged.
- `cleanPerson`, `makeKeyFile`: a person's `key` note now also keeps `by`, the fingerprint of the signing key that signed it.
- `keyState(p, now, signedBy)`: new third argument, new code `'replaced'`.
- `signedBy()` (new, page): the open keyring's signing fingerprint.
- `packFile`: refuses 0 bytes.
- `drawTodo`, `drawPeople`: show replaced key files, the newer-copy warning, and the Guest note on renewals.
- `appTrustBlank()`, `TRUST_BLANK_WORDS` (new), `trustProblem`, `drawSigner`: the blank trust file.
- New section "THE KEYRING'S STAMP": `newerStamp`, `saveArmed`, `readStamp()`, `stampIsNewer()`, `newerWords()`, `lookAtStamp()`, `folderHoldsAnother()`.
- `folderOn`: calls `lookAtStamp()`.
- `onMakeKey`, `onRenewAll`: the folder-clash stop (`clashArmed`).
- `onSave`: reads the stamp, may refuse once, counts the save, writes the stamp.
- `onPersonSave`: the "until then" sentence.
- `markUnsaved`, `startSession`, `lock`: reset the new flags.
- `wire`: Enter on `#open-pass` and `#new-pass2`.

**`DIRECTORY/mailboxI.js`**

- `STAMP_FILE` (new). `openIT` gains `putStamp(text)` and `getStamp()`.

**`DIRECTORY/signincoreI.js`**

- `WRONG_ISSUER` (new words), used twice in `verify`.
- `notEnded`: the wrong-clock check, new error code `'clock'`, `CLOCK_SLACK`.
- `niceDay()` (new).

**`DIRECTORY/vaultI.js`**

- "THE REMEMBERED FOLDER" block: `folderSlot(id)`, `reconnect(ask, id)`, `forgetFolder(id)`, `keyFromFolder(f)`. The shared `folder` variable is gone.
- `keyFileScreen`: `useFolder` remembers the folder under the person's id. The "straight to the PIN" block at the end is removed.
- `pinScreen`: uses the person's own folder. The wiped path and "Forget me" call `forgetFolder`.
- `FlogicVault.whyNoExport()` (new). The Save as CSV handler uses it.
- `showTag`: "not locked" in plain mode too.
- The header comment's line about IndexedDB "flogic-mailbox" should now say one folder per person.

**`DIRECTORY/queryI.js`**

- New: `DATE_SLASH`, `DATE_NAMED`, `DATE_NAMED_US`, `MONTH_NAMES`, `TWO_DIGIT_YEAR_SPLIT`, `fullYear()`, `monthNumber()`, `writtenDate()`, `writtenIso()`, `dateLiteral()`.
- `readDate`: falls back to `writtenDate`.
- `lookAtKinds`: `canWritten`, `sawWritten`, and `table.written[]`.
- `tableSource` scan: `dated[]` and `written()` in the three cell-to-value lines.
- `cx`: `dateLiteral` in `cmp`, `between` and `in`.

**`DIRECTORY/dashI.js`**

- `dayOf`: tries `writtenIso` first.
- `exportCheck`: asks the vault for the reason.

**`DIRECTORY/scriptI.js`**

- The status line for a file with no rows and no column names.

**`DIRECTORY/vaultI.css`**

- `html { scroll-padding-bottom }` and `body { padding-bottom }`, under `#vaultBar`.

---

## Before merging back

- Delete this `handoff/` folder, as the plan says.
- The scratch folder and `Documents\flogic-demo-run\` on Fernando's machine hold demo keyrings and key files for made-up people. They can be deleted. None of it is in the repo.

---

## Top 5 for DJ

1. **Read the security fix, `8c9a9f5`.** It closes a real hole (signed in as the last person, no PIN) and changes how the app remembers drive folders: one per person, never read before a PIN. Check that it fits how you want renewals to work.
2. **Ended and demoted people keep their old access until the key file runs out.** "End access" leaves the key file in the folder, and it works for up to 7 days on any laptop. A level-down doesn't reach a laptop already in use for about 4 days, so export stays. Two small options: remove the key file from the folder on "End access" (that stops new laptops), and look in the folder at every PIN sign-in (one argument in `pinScreen`, at the cost of a browser prompt each day). A real fix needs something the laptop checks, which the no-server design doesn't have.
3. **Several IT people on one keyring is still fragile.** The fix warns and refuses. It doesn't merge, it only works with the folder connected, and ids still clash. If a team will really share a keyring, this needs a design: saving through a file handle, ids that can't clash, maybe one keyring owner.
4. **Dates now come out as `1999-12-31`.** Written dates sort and count correctly, but answers and saved CSVs show them the standard way, not as typed. The two-digit rule is Excel's (30 and up is 19xx). Say if you want either changed.
5. **The friction a demo audience will see.** One-at-a-time packing, no button to save the signing key, every downloaded key file having the same name, and the page still being called "CSV Reader".

Thanks, DJ. The pages held up well.
