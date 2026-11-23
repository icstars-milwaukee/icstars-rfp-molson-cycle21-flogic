# Risk Register – Sprint 2 Demo

Project: Flogic (opens CSV / Excel / SQL data in the browser; nothing sent to a server)
Demo run from: `presentation/demo-sheet` → `demo-day/demo-sheet.html`

| # | Risk | Probability | Impact | Mitigation | Owner | Issue |
|---|---|---|---|---|---|---|
| R1 | Demo laptop is missing the practice data (`incident.csv`) or IT's trust file (`it-signerI.js`). Both are kept out of git on purpose. | Medium | High | Day before: run `tests/make-tickets.py` on the demo laptop; copy the data folder and trust file to a USB backup; pre-flight Run all must show **4 passed · 2 failed**. | Fernando Gamboa | [#2](https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic/issues/2) |
| R2 | Key-file sign-in is refused: key files expired, or the laptop clock is wrong. | Medium | High | Morning of the demo: IT console > **Renew everyone**; set the laptop clock to automatic; rehearse the fallback "Open a plain file without signing in" (under 20 s). | DJ (Darryl Moore) | [#3](https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic/issues/3) |
| R3 | Wrong file (`incident (1).csv` from a repeat download) or leftover browser state makes every check say "couldn't run". | Medium | Medium | Clear old downloads; run `demo-day/fresh-start/wipe.html` (Reset Level 2); keep `incident.csv` on the Desktop and a second app window open. | Fernando Gamboa | [#4](https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic/issues/4) |
| R4 | A presenter is absent; the demo needs two people (app + IT console sign-in act). | Low | High | Each teammate runs the full script solo using the demo sheet's timed reps; export sheet edits to the shared folder; agree an Act 1-only version for one presenter. | DJ (Darryl Moore) | [#5](https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic/issues/5) |

Probability / Impact scale: Low · Medium · High. Review this register at the start of each demo rehearsal.
