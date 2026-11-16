# Status Update

**Team:** Flogic
**Date:** 2026-11-15
**Audience (who's reading this):** our trainer

> Drafted from what's in the repos on 2026-11-15. Lines marked ⚠ need the team to confirm or fill in before you read this out.

## Overall status

Pick one: **Green** (on track) · **Yellow** (at risk, we have a plan) · **Red** (off track, we need help)

- **Status:** Yellow
- **Why (one sentence with a fact, not a feeling):** In the 13 Nov persona run, 233 of 235 checks passed and no demo-blocking defects are open (DEFECT_BURNDOWN D-1 to D-31), but we haven't rehearsed the demo yet, and three of its twelve steps run on features from 14–15 Nov (desktop apps, ticket drawer, Checks) that no persona run has covered and that have no fallback screenshots.

## Since last update

- **Done:** 9 personas run with real mouse and keyboard (UC0–UC8), with 10 fix commits, including one SECURITY fix: a stranger could sign in as the last person on a shared laptop (`8c9a9f5`). Shared, IT-signed packs, and packing many files at once (`0afb9c8`). Flogic and Flogic IT as Windows desktop apps (`0c09d69`). Phase 1: the ticket drawer and Checks (15 Nov). A 12-step demo runbook with a fallback for every step.
- **Not done that we said we'd do, and why:** The T11A failure injection and side-by-side rehearsal, and both T11B rehearsal rounds (⚠ add why). The quality gate has been rewritten for Flogic but not yet run by each teammate. The plan's browser-enforced no-network lock (CSP) never shipped (RISK_LOG R-1).

## Next, before the presentation

- **Next:** Set up the demo keyring for the fixed step 9 (D-31: Morgan without HR, plus an HR-only pack). Take the missing screenshots (D-30). Run the gate with every teammate. Inject one failure mid-run. Do two timed rehearsal rounds with issues filed. Code freeze 11/18, then rehearse only.

## Top risks

The 3 biggest from `RISK_LOG.md`. Trend: ↑ worse · → same · ↓ better.

| Risk | Impact if it happens | Mitigation | Owner | Trend |
|---|---|---|---|---|
| R-6: ended access keeps working until the key file runs out | Up to 7 days of access after "End access", the question we expect on 11/19 | Said on screen and on the summary slide. Small fixes named in the fix plan | DJ | → |
| R-7: demo exe built with the blank trust file | Key-file sign-in is off on stage, and steps 5–11 fail | Gate line "Creds verified" before every run | DJ | ↑ |
| R-9: the 14–15 Nov features break with no screenshot to fall back on | Steps 1, 7 and 8 have nothing to show | Desktop sweep, new screenshots, code freeze 11/18 | DJ | ↑ |

## Asks

> ⚠ The team writes both lines below.
>
> - **Suggested ask:** "A room with a projector on Mon 11/16 for a standing, timed run, from program staff, by end of day 11/15", and "a paired team for the two T11B rounds by Tue 11/17".
> - **Suggested worry, from the evidence:** the biggest changes landed 14–15 Nov, four days before the demo. That includes a new desktop shell and renaming the app's folder from `DIRECTORY/` to `DataPage/`, and the demo branch is still moving.

- **What we need, from whom, by when:** 
- **The thing we're most worried about that we haven't said out loud yet:** 
