# STANDBY v0.2.0: Fernando's agent, wait for pushes and help

**To:** Fernando's agent. **From:** DJ's agent (Cornerstone side). **Branch to watch:** `feature/drive-signin`.
**Go-word:** **Keystone**. Start the jobs below only after DJ writes it, or after a `relay/dj-log.md` entry says `S2 READY`.

## Where things stand

v0.1.0 (your S1 draft) is tagged. v0.2.0 is being built on `feature/drive-signin`: the same sign-in, but the person's
request and IT's answer travel through a shared folder (OneDrive, Google Drive for desktop, or a network share), so the
person does one thing (type name and passphrase, click "Ask IT for access") and IT does the rest.

Already on the branch: the mailbox (`sso-draft/mailboxS.js`), IT's own-file check (`SignInCore.readIssued`), the
person's page and IT's page reworked, and 25 + 45 + 77 passing checks. Read `AUDIT-v0.2.0.md` first. It lists what is
fixed and what is honestly still open.

## What to do while waiting

Nothing that changes files on `feature/drive-signin`. Waiting means:

1. `git fetch` now and then, and when a `relay/dj-log.md` entry says `S2 · PUSHED`, pull and run the three test commands
   (below). Don't trust the counts in the entry: run them.
2. Read `AUDIT-v0.2.0.md` and `sso-draft/mailboxS.js` as a second pair of eyes. You wrote the S1 core, so you will spot
   what the mailbox gets wrong about it.

## Jobs, in order, once Keystone is given

| # | Job | Where | Done when |
|---|---|---|---|
| R1 | Independent review of the audit and the mailbox. Try to break it: hostile file names, a replaced outbox file, a request for a name that isn't theirs, a huge folder. | your own branch `feature/drive-signin-review` | A return `SSO-RETURN-v0.2.0-R1-<date>.md` in `SCANME/returns/` lists what you tried and what held |
| R2 | The real-browser pass I can't do headless: open `signin.html` and `it-issue.html` as `file://` in Chrome and Edge, connect an actual OneDrive or Drive folder, and walk the whole flow on two profiles. | your machine | The return says which browser, which folder service, and which steps worked or didn't. Folder permission re-prompts and "folder not allowed" messages matter most |
| R3 | The five S1 REQUESTS (VaultCore, vault, styles, test page, IT console), now with the mailbox. Only on DJ's word. | `DIRECTORY/`, `it-console/` | As in `SSO-PERMISSION-v0.1.0.md`; every `DIRECTORY/` edit also updates `markdowns/tutorialwdetails.md` |

## Test commands (run from the repo root)

    node sso-draft/run-node-test.mjs        # core: 45 checks
    node sso-draft/run-mailbox-test.mjs     # shared folder: 25 checks
    node sso-draft/run-browser-test.mjs     # both pages in headless Chrome/Edge: 77 checks

Never broad-kill browser processes while a test runs (other windows share the process name).

## Rules that still apply

- The words "SSO" and "single sign-on" never appear on screen, in a file a person opens, or in a message to a person.
- Say what a check really shows. The folder logic is tested against an in-memory folder; the browser's real folder
  picker has NOT been driven by a test. Don't write "works with OneDrive" until R2 has actually done it.
- No real keys, names or company data in the repo. The IT signing key in `it-signerS.js` is a DEMO key.
- Reply in `relay/fernando-log.md` with the heading `## <date> · S2-R# · <DONE or BLOCKED>`. Release conventions are in
  `SCANME/README.md`.

## How you'll know I'm done

A `relay/dj-log.md` entry `S2 · PUSHED <commit>` plus a CHANGELOG entry for `0.2.0`. If neither exists, I'm not done.
