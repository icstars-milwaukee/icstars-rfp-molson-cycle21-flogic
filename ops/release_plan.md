# Release Plan – Flogic 0.3.0

## System context
| Layer | What it is in Flogic |
|---|---|
| UI | `DataPage/flogic.html`: the staff app, running in the user's browser (Edge/Chrome) |
| API | nginx in Docker (`ghcr.io/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic:0.3.0`). It serves only static files and `/healthz`, on port 8080 behind HTTPS |
| DB | Runs in the browser: an in-page SQL engine (`sqlI.js`) for CSV/Excel/SQL files, and IndexedDB for sign-in and key files. The server stores no data |

## Roles
| Role | Who | Does |
|---|---|---|
| Release lead / Incident commander | DJ (Darryl Moore) | Makes the go/no-go call, runs the deploy, decides on rollback |
| Verifier / Comms | Fernando Gamboa | Runs the smoke test and app checks, watches the monitors, keeps the incident log, updates the team |
| Escalation | iC Stars program lead | Gets called if the release can't be rolled back or the outage lasts more than 30 minutes |

## 1. Pre-flight checklist (all must be ✅ before deploying)
- [ ] CI is green on `release/0.3.0`: scripts parse, `preset-core-test.mjs`, `no-data-check.sh`, image build, smoke test
- [ ] The image is published at `:0.3.0` and `:sha-<commit>`; the previous good tag is written down for rollback
- [ ] `bash deploy/no-data-check.sh` passes: no data or key files in the repo, and the trust file is blank
- [ ] IT's trust file `it-signerI.js` is ready to mount; the key files have been renewed (IT console > Renew everyone)
- [ ] The HTTPS address is ready (key-file sign-in is turned off on plain http)
- [ ] Both roles are online and the incident log is open

## 2. Release steps (in order)
1. Announce the release window in the team channel (Fernando).
2. Pull the new image: `docker compose pull` (DJ).
3. Mount the trust file: uncomment the `volumes:` lines in `docker-compose.yml` (DJ).
4. Start it: `docker compose up -d`. Wait for `docker ps` to show **healthy** (DJ).
5. Smoke test the live address: `bash deploy/smoke.sh https://<address>`. It must end with `Alive, and it is ours` (Fernando).
6. Check the app: open `incident.csv`, then Checks > Load `demo-checks.json` > Run all. It must show **4 passed · 2 failed** (Fernando).
7. Check sign-in: sign in with a test key file and PIN (Fernando).
8. Watch the monitoring signals for 15 minutes, then DJ declares the release done.

## 3. Monitoring signals
| Signal | How it's checked | Healthy | Rollback trigger |
|---|---|---|---|
| Health check | Docker `HEALTHCHECK` on `/healthz` every 30 s | Answers `ok` | 3 failures in a row (90 s) |
| Error rate | nginx access log: 5xx responses and 404s on app scripts | < 1% | ≥ 1% for 5 min, or any app `.js`/`.css` file returns 404 |
| Latency | `curl -w '%{time_total}'` on `/DataPage/flogic.html` | p95 < 500 ms | p95 > 1 s for 5 min |
| App correctness | Step 6 check results | 4 passed · 2 failed | Any other result |
| Security headers | `smoke.sh` step 4 | CSP has `connect-src 'none'` | Header missing |

## 4. Rollback
**Trigger:** any signal in the rollback column above, or any `FAIL` line from `smoke.sh`. DJ calls it; no further discussion is needed.
1. In `docker-compose.yml`, set `image:` back to the last good tag (`:sha-<previous>`).
2. `docker compose up -d`. Wait for **healthy**.
3. Re-run `bash deploy/smoke.sh https://<address>` and the step 6 app check.
4. Log it in `ops/incident_log.md` and open a GitHub issue with the label `bug`.

## 5. Incidents and escalation
1. **Detect:** whoever sees the problem tells the incident commander (DJ) right away.
2. **Triage (≤ 5 min):** DJ decides between fixing forward and rolling back. Fernando starts an entry in the incident log.
3. **Act:** DJ rolls back or applies the fix. Fernando re-runs the checks and posts an update every 15 min.
4. **Escalate:** if the rollback fails, the outage runs past 30 min, or data exposure is suspected, Fernando contacts the iC Stars program lead.
5. **Close:** write up the root cause and follow-ups in the log, with linked issues.
