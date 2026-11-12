# Questions for DJ: Sprint 3 finalization (v0.4.0)

**To:** DJ. **From:** Fernando's agent. **Branch:** `feature/sprint3-finalization` (made from `feature/filekey`).
**About:** the first pass on your "Sprint 3 Finalization Doc". What was built is in `CHANGELOG.md` (0.4.0) and
`relay/fernando-log.md` (2026-11-12).

These are decisions for people, not agents. For each one I took the cautious choice, shown in brackets, and kept going.
Answer in `relay/dj-log.md`, or tell Fernando.

## 1. What was "broken" in the key-file console?

The old page (`sso-draft/it-issue.html`) passed all of its own checks, so I had to guess. I found and fixed three faults:

1. **Make a new signing key** had no way to tell the app about the new key, so every key file made with it was refused.
2. A person could only be added by making an old `.flogic-id` credential in the other console first.
3. The people list could show everyone twice when it was redrawn while still reading the folder.

**Is one of these what you saw?** If not, what did you click, and what happened?
*(Now: the old page is retired. Its job is in `it-console/it-console.html`.)*

## 2. "No credentials accessible local" can only be partly true

The app keeps nothing readable: no PIN, no plain key and no data in the browser's storage, in the page, or in a
page-wide variable (tested in `sso-draft/app-signin-test.html`).

But the key file sits in the person's drive folder. **If that folder syncs, the key file is a file on the laptop's
disk.** Someone at an unlocked laptop can connect the folder and pick their own PIN. This is risk C9 in
`AUDIT-v0.3.0.md`. Closing it means tying the key file to the laptop, or Windows Hello, which the audit left as a
decision.

**Is "short key files, drive MFA and the computer's lock screen" enough for Nov 19, or should the key file be tied to
the laptop?** *(Now: not tied. Said plainly in the README, the changelog and the tutorial.)*

## 3. Keep the older credential and passphrase sign-in?

It doesn't follow the new rules: its end date is whatever IT types, and it has no level and no review.

**Keep it for the Nov 19 demo, or turn it off?**
*(Now: on, as a quiet second option, so your vault tests and the demo credentials keep working. One flag turns it off
in the app and the console: `FlogicPolicy.ALLOW_LEGACY_CREDENTIALS` in `DIRECTORY/policyI.js`.)*

## 4. Are these the right access levels and numbers?

They're my proposal. All of it is one table in `DIRECTORY/policyI.js`.

| Level | For | Export | Auto-lock | Key file lasts | Renewed | Groups | Dashboard starts with |
|---|---|---|---|---|---|---|---|
| Guest | a visitor for a day | No | 5 min at most | 1 day | by name, each time | 1 | a short summary (3 tiles) |
| Viewer | reads the numbers | No | 10 min at most | 7 days | with "Renew everyone" | any | the full dashboard |
| Analyst | works the data, hands out reports | Yes, if the group allows it | 30 min at most | 7 days | with "Renew everyone" | any | the full dashboard |

Built in for everyone: a key file lasts **7 days at most**, and IT confirms each person every **30 days**.

**Are these Molson's levels, names and numbers?** *(Now: as in the table.)*

## 5. Should lower levels be locked out of parts of the app?

Today a level changes export, auto-lock, key-file length and what the dashboard **starts** with. A Guest can still
press Edit and add tiles, run queries and read the sheet.

**Should a Guest or Viewer be kept out of Edit, the query box or the sheet?** That needs hooks in `scriptI.js` and
`queryI.js`, which are yours. *(Now: no lock-outs beyond export.)*

## 6. "Saved offsite (likely IndexedDB)": the person's sign-in, IT's keyring, or both?

I read it as the person's sign-in: the app keeps a PIN-locked copy in IndexedDB and needs no file after the first
sign-in.

**Did you also mean IT's keyring should live in the browser instead of a file?**
*(Now: the keyring stays a locked file IT saves. The console keeps only which folder was connected.)*

## 7. Please run your vault suite on this branch

`realfile-vault` isn't in the repo, so I couldn't run it. I changed `DIRECTORY/vaultI.js`, `vaultI.css` and
`testI.html` on the strength of your doc. The first card screen is different: the main button is now **Connect your
Flogic folder**, and **Set up with a credential file** is still there as a quiet button.

**What does your suite say?**

## Not done, on purpose

- **Shipping Molson's data with the IT side:** your doc says not to handle it.
- **Single page:** on pause, as your doc says.
- **A real OneDrive or Google Drive folder** hasn't been tried. The tests use the browser's own real folder handles
  and an in-memory folder.
- `relay/README.md`, the release notes in `SCANME/README.md` and `AUDIT-v0.3.0.md` still describe the old layout and
  file paths. They're yours, so I left their text alone.
