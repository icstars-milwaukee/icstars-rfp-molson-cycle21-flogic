# Flogic

A page of files that opens a person's CSV, Excel or SQL data in their own browser. Nothing is sent to a server.

## Demo day: start here

| I want to... | Open |
|---|---|
| Rehearse or run the demo (timed reps, what to say, what you should see, fixes, device reset) | [`demo-day/demo-sheet.html`](demo-day/demo-sheet.html) (double-click it) |
| Set up a new device for the demo | [`demo-day/README.md`](demo-day/README.md) |
| Edit the checks the demo loads into the app | [`demo-day/demo-checks.json`](demo-day/demo-checks.json) |
| Make the practice data (made-up, 25,000 rows, the same every time) | `py -3.12 -I tests\make-tickets.py C:\flogic-demo` |
| Run the app | [`DataPage/flogic.html`](DataPage/flogic.html) |
| Run the self-tests | [`tests/README.md`](tests/README.md) |
| Clear a device before the next demo | the sheet's **Reset** tab |

Not in git on purpose: the practice data (the repo refuses data files) and IT's filled-in trust file
`DataPage/it-signerI.js` (CI refuses it; copy it across by hand). Details in `demo-day/README.md`.

## The rest

| Folder | What it is |
|---|---|
| `DataPage/` | The staff app |
| `it-console/` | IT's console (keyrings, people, key files, data packs) |
| `desktop/` | The Windows desktop build of both |
| `deploy/`, `Dockerfile`, `docker-compose.yml` | The Docker image and its checks (see `deploy/README.md`) |
| `tests/` | Real-input tests and the made-up data makers |
