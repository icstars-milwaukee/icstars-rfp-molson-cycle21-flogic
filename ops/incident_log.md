# Incident Log – Flogic

Fill in one entry per incident. Times are in Central Time (CT).

## Template
| Field | Entry |
|---|---|
| ID / Date | INC-### / YYYY-MM-DD |
| Release / Image tag | |
| Detected (time, by whom, which signal) | |
| Severity | Sev1 site down · Sev2 feature broken · Sev3 minor |
| Incident commander / Scribe | DJ (Darryl Moore) / Fernando Gamboa |
| Timeline | HH:MM – event |
| Action taken | Rolled back / Fixed forward |
| Escalated? (to whom, when) | |
| Resolved (time) | |
| Root cause | |
| Follow-up issues | # |

## INC-001 (simulated) – 2026-11-23
| Field | Entry |
|---|---|
| Release / Image tag | 0.3.0 |
| Detected | 10:42, Fernando: `smoke.sh` FAIL "the page names sqlI.js, and the server answers 404" |
| Severity | Sev2: the app loads, but SQL queries don't work |
| Incident commander / Scribe | DJ / Fernando |
| Timeline | 10:42 detected · 10:44 DJ calls rollback · 10:46 image back to the previous `:sha-` tag · 10:48 healthy, smoke test passes, Run all shows 4 passed · 2 failed |
| Action taken | Rolled back |
| Escalated? | No (fixed within 30 min) |
| Resolved | 10:48 (6 min) |
| Root cause | Simulated: a script file was left out of the image build |
| Follow-up issues | Add a CI check that the image contains every file `flogic.html` names |
