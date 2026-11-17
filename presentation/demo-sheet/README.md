# Demo sheet

`demo-sheet.html` is the live assistant for the demo: a run script with timed reps, a pre-flight list, fixes for
when it goes wrong, and ways to reset a device. Double-click it. It is one offline file, and every word on it is
editable (press **Edit**).

## What is here, and what is not

| | Where | In git? |
|---|---|---|
| The sheet (edit it, then use **Save my edits** to carry your changes to another device) | `presentation/demo-sheet/demo-sheet.html` | yes |
| The checks that load into the app's **Checks** panel (plain JSON: change a name, a rule or a number in any text editor) | `presentation/demo-sheet/demo-checks.json` | yes |
| The made-up practice data (`incident.csv`, 25,000 rows, the same bytes every time) | made on each device by `tests/make-tickets.py` | **no.** The repo refuses data files on purpose (`deploy/no-data-check.sh`) |
| IT's trust file `DataPage/it-signerI.js` (only for the key-file sign-in act) | copy it by hand from the device that has it | **no.** The repo holds the blank one, and CI refuses a filled-in one |
| The self-tests | `tests/` | yes |
| The app | `DataPage/flogic.html` (the sheet's "Open the app" link) | yes |
| The deck | `presentation/index.html` (the sheet's "Open the deck" link) | yes |

## A new device, in 5 steps

1. `git clone` the repo and `git switch presentation/demo-sheet` (or copy the folder).
2. Make the practice data (needs Python 3.12): `py -3.12 -I tests\make-tickets.py C:\flogic-demo`
3. Open `presentation/demo-sheet/demo-sheet.html`. Use **Load edits** if you saved edits elsewhere.
4. Open `DataPage/flogic.html`, open `incident.csv`, **Checks** > **Load** > `demo-checks.json` > **Run all**.
   It must say **4 passed, 2 failed**.
5. Only for the sign-in act: copy `DataPage/it-signerI.js` and the keyring/drive folder across, and renew the key files.

The sheet's **Reset** tab has every way to clear a device before the next demo.

Edits you make in the sheet are saved in that browser only. If you change a name or step the sheet depends on
(for example the file name `incident.csv`), change it in `demo-checks.json` too: a check's table is the file's name.
