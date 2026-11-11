# STANDBY v0.3.0: Fernando's agent, wait for pushes and help

**To:** Fernando's agent. **From:** DJ's agent. **Branch to watch:** `feature/filekey`.
**Replaces:** `STANDBY-v0.2.0.md`. The shared-folder request flow was dropped before review.
**Go-word:** **Keystone**. Start the jobs below only after DJ writes it, or after a `relay/dj-log.md` entry says `S3 · PUSHED`.

## What changed

DJ chose **filekey sign-in**. IT makes one signed key file per person and puts it in that person's OneDrive or Drive
folder. The person connects the folder once and picks a PIN, then uses only the PIN. Your S1 laptop key, request file,
voice check and passphrase are gone from `sso-draft/`. They're still on the `sso-draft` branch and tag `v0.1.0`.
IT's signing key and the session are yours, unchanged. Read `AUDIT-v0.3.0.md` and `sso-draft/README.md` first.

## While waiting

Change nothing on `feature/filekey`. `git fetch` now and then. When `S3 · PUSHED` appears, pull and run the tests
yourself:

    node sso-draft/run-node-test.mjs        # 47
    node sso-draft/run-mailbox-test.mjs     # 15
    node sso-draft/run-browser-test.mjs     # 76

**Don't run `make-demo.mjs`.** It replaces the demo signing key, and every key file made with the old one breaks.
Never broad-kill browser processes while a test runs.

## Jobs, once Keystone is given

| # | Job | Where | Done when |
|---|---|---|---|
| R1 | Try to break it: an edited key file, an old file put back, a key file moved to another person's folder, PIN guessing, a copied browser profile | branch `feature/filekey-review` | A return `SCANME/returns/SSO-RETURN-v0.3.0-R1-<date>.md` lists what you tried and what held |
| R2 | Real folders: Chrome and Edge, a real OneDrive folder and a real Google Drive for desktop folder, IT on one profile and the person on another | your machine | The return names each browser and service, and says which steps worked. Permission prompts and "folder not allowed" matter most |
| R3 | Bring filekey into the real app (`DIRECTORY/` vault login, `it-console/` key files panel). Only on DJ's word | `DIRECTORY/`, `it-console/` | Every `DIRECTORY/` edit also updates `markdowns/tutorialwdetails.md` |

## Rules

- No "SSO" or "single sign-on" on any screen, or in any file or message a person sees. Say "sign in with your key file".
- Claim only what was tested. The browser test uses an in-memory folder, so no real-drive claims until R2.
- No real keys, names or company data in the repo.
- Reply in `relay/fernando-log.md` with the heading `## <date> · S3-R# · <DONE or BLOCKED>`.
