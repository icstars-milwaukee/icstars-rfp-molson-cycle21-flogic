# Defect Burndown

**Team:** Flogic

Log **every** defect you find while hardening and rehearsing, even small ones. Dates as `YYYY-MM-DD`. Leave **Fixed** blank until it's fixed. Then run `npm run burndown`.

- **Severity:** S1 = demo can't continue · S2 = demo continues but looks broken · S3 = cosmetic
- **Demo-blocking?** Yes / No. Every S1 is demo-blocking.

**Where these came from.** D-1 to D-23 are from the 13 Nov demo run (`handoff/demo-run-report.md` on `phase1-grid-menus`, personas UC0–UC8), with the fix commit in brackets. D-24 to D-29 are fix commits on the product branches whose bug wasn't logged anywhere else. For those, Found is the day it was fixed. D-30 and D-31 came from checking this week's runbook against the app. Owner is whoever made or owns the fix. **Add every bug from this week's rehearsals below D-31.**

## Defects

| ID | Defect | Severity | Demo-blocking? | Found | Fixed | Owner | Status |
|---|---|---|---|---|---|---|---|
| D-1 | SECURITY: on a shared laptop, "Someone else → Someone new" signed a stranger in as the last person with any new PIN, from that person's remembered folder (`8c9a9f5`) | S1 | Yes | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-2 | Written dates (`3/15/06`, `15-Mar-2006`) weren't dates: `YEAR()` was empty, sorting went A to Z, and `WHERE Start < '2006-02-01'` returned 55 wrong rows. Demo step 6 depends on this (`76edb50`) | S1 | Yes | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-3 | Three IT people saving one keyring: last save won with no warning. Two people and a pack entry were lost (`b48224b`, warns and refuses, no merge) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-4 | A laptop clock set to 2006 wasn't noticed, and the person signed in as normal (`ba3f765`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-5 | The reason export was off was wrong: "Finance can't export" shown to a Viewer, when Finance *can* export. Demo step 9 shows this message (`01e8ca7`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-6 | The Lock bar covered "← Back to file" and "Drag mode" (`01e8ca7`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-7 | Enter did nothing in the passphrase boxes. Demo step 2 presses Enter (`ababb8b`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-8 | After "Make a new signing key", old key files were still shown as good in the console (`ababb8b`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-9 | The console gave no warning when the app next to it had the blank trust file, so key-file sign-in was off (`ababb8b`) | S2 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-10 | "This key file wasn't made by this company's IT." gave no next step (`7d2a6da`) | S3 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-11 | An empty (0-byte) file packed without complaint (`b90f74d`) | S3 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-12 | A plain file opened without sign-in had no "not locked" tag, and a 0-byte file said "only has a header row" (`9269591`) | S3 | No | 2026-11-13 | 2026-11-13 | Fernando | Fixed |
| D-13 | The app was still titled "CSV Reader Test" (`0b7dc2d`, the page is now `DataPage/flogic.html`) | S3 | No | 2026-11-13 | 2026-11-15 | DJ | Fixed |
| D-14 | Two IT consoles hand out the same next id (`u-0007` twice). The person is only stopped at "Make key file" | S2 | No | 2026-11-13 | | DJ | Open |
| D-15 | A level-down (Analyst → Viewer) doesn't reach a laptop already in use, so export stays for up to ~4 days. The console now says so (`f5134c3`) | S2 | No | 2026-11-13 | | DJ | Open |
| D-16 | A Guest's "short summary" isn't a limit: Edit → + Add a tile adds every tile | S2 | No | 2026-11-13 | | DJ | Open |
| D-17 | There's no way to save a `.flogic-signer` out of the console. It can only bring one in | S2 | No | 2026-11-13 | | DJ | Open |
| D-18 | A pack from another keyring's same-named group says "It may have been changed since IT made it", which points the wrong way (the key differs, not the file) | S3 | No | 2026-11-13 | | DJ | Open |
| D-19 | The file type is checked by its ending only: a PDF renamed `.csv` packs, and the app opens `not_data.pdf` as six rows of text | S3 | No | 2026-11-13 | | DJ | Open |
| D-20 | The Lock bar can still sit over a button at some scroll positions on a narrow window | S3 | No | 2026-11-13 | | DJ | Open |
| D-21 | While Edge shows its own "Choose a different folder" box, the console still says "Pick a folder in the window that opened" | S3 | No | 2026-11-13 | | DJ | Open |
| D-22 | Every downloaded key file is called `flogic.flogic-key`, so six people means six identical names in Downloads | S3 | No | 2026-11-13 | | DJ | Open |
| D-23 | "Replace the signing key" stays unfolded after Lock (nothing leaks), and the Ask menu folds away as soon as an answer shows (Save as CSV is two clicks away) | S3 | No | 2026-11-13 | | DJ | Open |
| D-24 | CSV reader: two stray quotes (`5'10"`) far apart merged every row between them (`fix/stray-quotes`) | S2 | No | 2026-11-05 | 2026-11-05 | Fernando | Fixed |
| D-25 | The folder picker always said "cancelled", so folder sign-in was impossible (`ec2ecb8`) | S1 | Yes | 2026-11-11 | 2026-11-11 | DJ | Fixed |
| D-26 | Excel numbers opened as `'-5`, from a function-name clash (`csvCell` renamed to `reportCell`, `1f72976`) | S2 | No | 2026-11-15 | 2026-11-15 | DJ | Fixed |
| D-27 | `LIKE` didn't match big and small letters the way SQLite does (`50b4857`) | S3 | No | 2026-11-15 | 2026-11-15 | DJ | Fixed |
| D-28 | Checks: removing a check mid-run didn't stop the run, and Run all could be clicked while running. Demo step 8 uses Checks (`906a0ff`) | S2 | No | 2026-11-15 | 2026-11-15 | DJ | Fixed |
| D-29 | Folder drag-and-drop has never been tested by a human, on either page | S2 | No | 2026-11-13 | | DJ | Open |
| D-30 | No fallback screenshots exist for steps 7–8 (ticket drawer, Checks, added 15 Nov) or for the desktop apps. `handoff/shots/` is all from 13 Nov | S2 | No | 2026-11-15 | | Fernando | Open |
| D-31 | Demo script step 9 opens "an HR-only pack Morgan isn't in" and expects "You're not in that group". But Morgan is in Finance, HR **and** Operations (runbook "Before the room fills"), so the pack opens and the refusal never shows. Script fixed: Morgan is now Finance + Operations only, an HR-only made-up pack is set up before the demo and restored by the reset, and the gate checks both. The demo keyring itself still has to be set up once by hand (runbook "One-time setup for step 9") | S2 | No | 2026-11-15 | 2026-11-15 | DJ | Fixed (script) |

## Decisions

- **Open defects we're accepting for the demo, and why it's safe:** D-14 to D-23 and D-29 stay open. None is on the demo path: the demo uses one IT console (D-14), never demotes anyone (D-15), never opens a Guest's dashboard edit (D-16), never moves the signing key (D-17), never opens another keyring's pack (D-18: step 9 now uses the same-keyring HR pack) and never packs a renamed file (D-19). D-20 to D-23 are cosmetic. D-15 and the "End access" gap are named on the summary slide and in RISK_LOG R-1 instead of hidden. D-30 is a gap in the fallback, not in the app. It's above the cut line in the fix plan.
- **How we'll avoid them during the demo (route around, don't click, etc.):** Use the folder picker, never drag-and-drop a folder (D-29). Keep the staff window wide, or scroll before clicking near the bottom-left (D-20). Show Save as CSV straight from the answer, not after the menu folds (D-23). Pack into the connected folder so key files never land in Downloads (D-22). In step 9, use the HR pack, not a pack from another keyring (D-18).
