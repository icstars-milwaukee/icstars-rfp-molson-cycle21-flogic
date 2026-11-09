# One sign-in for all your groups (draft S1)

**This is a draft for review, not a release.** It's standalone pages, not the real app, and it changes nothing in `DIRECTORY/`,
`it-console/` or `demo-data/packs/`. The brief is `SCANME/SSO-PERMISSION-v0.1.0.md`, and the full write-up for DJ's agent
is in `SCANME/returns/`.

**Why:** people don't care one bit about security, but we do. So the person's part is as small as it can be. After a
one-time set-up, signing in is **only their passphrase**, for every group they're in. IT signs everything else (who they
are, their groups, the rules, the end date), so editing the file breaks it.

## Try it (Chrome or Edge, opened as `file://`, no network)

Demo passphrase for IT (keyring and signing key): `flogic demo keyring only`. Made-up data only.

1. **The person:** open `sso-draft/signin.html`. Type a name (`Fernando G`) and a passphrase. **Make my file for IT**
   saves `fernando-g.flogic-request` and shows a laptop code.
2. **IT:** open `sso-draft/it-issue.html`. Pick `demo-data/packs/demo-it.flogic-keyring` and
   `sso-draft/demo/demo-it.flogic-signer`, type the passphrase, and click **Open**. Then:
   1. Pick the request file.
   2. Check the laptop code with the person (by voice), and tick the box.
   3. Click **Make their sign-in file**. It saves `fernando-g.flogic-signin`.
3. **The person:** back in `signin.html`, open that file, then type the passphrase. Open
   `demo-data/packs/demo_incident.flogic`: it opens. `demo_change_request.flogic` is refused ("You're not in that group").
   **Lock** signs out. So do stepping away (auto-lock) and the end date.

## Files

| File | What it is |
|---|---|
| `signincoreS.js` | `SignInCore`: the crypto and the file shapes (IT signing key, laptop key, request, sign-in file, check, session) |
| `signin.html`, `signinS.js` | The person's page |
| `it-issue.html`, `itissueS.js` | IT's page: a request in, a sign-in file out |
| `signinS.css` | The look of both pages (light and dark) |
| `it-signerS.js` | The app's pinned copy of IT's **public** signing key |
| `demo/demo-it.flogic-signer` | IT's demo signing key, locked with the demo passphrase |
| `make-demo.mjs` | Makes a new demo signing key and pin (this breaks old sign-in files) |
| `core-testsS.js` | The core checks: Node and the browser run the same ones |
| `run-node-test.mjs`, `load-core.mjs` | Run the core checks in Node |
| `signin-test.html`, `run-browser-test.mjs` | Core checks, plus both pages end to end, headless |

## Tests

```text
node sso-draft/run-node-test.mjs       45 / 45
node sso-draft/run-browser-test.mjs    76 / 76   (Chrome or Edge, Node 22+)
```

## What it can't do (no server)

- **It can't take a sign-in back before its end date.** Keep end dates short (the default is 7 days). A new file costs
  the person nothing.
- **A laptop's clock decides "expired".** If someone sets the clock back, the end date moves with it.
- **Wrong guesses are slowed only by key stretching** (about 0.3 s each). Nothing counts them.
- **Whoever can change the app's files can change whom it trusts** (`it-signerS.js`).
- **The rules (export, auto-lock) are signed, so a changed file is refused.** But DevTools can still skip them in a
  running page.
