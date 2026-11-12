# Sign-in tests (and the first draft's page)

**Key-file sign-in now lives in the real app and the real IT console.** This folder keeps its tests, the demo signing
key, and the first draft's standalone person page.

| It moved to | What |
|---|---|
| `DIRECTORY/signincoreI.js` | `SignInCore`: IT's signing key, the key file, the PIN-locked laptop copy |
| `DIRECTORY/policyI.js` | `FlogicPolicy`: the built-in rules (7-day key files, the 30-day review, the access levels) |
| `DIRECTORY/mailboxI.js` | `Mailbox`: the drive folder |
| `DIRECTORY/it-signerI.js` | The app's copy of IT's **public** signing key (a DEMO key) |
| `DIRECTORY/vaultI.js` | The app's sign-in card: folder, PIN, renewal, end date |
| `it-console/` | IT's side: people, levels, **Make key file**, **Renew everyone** (it replaced `it-issue.html`) |

How to use it: `it-console/README.md`. The audit of the idea: `SCANME/AUDIT-v0.3.0.md`.

## Try it (Chrome or Edge, opened as `file://`)

Demo IT passphrase: `flogic demo keyring only`. Made-up data only.

1. **IT:** open `it-console/it-console.html`, open `demo-data/packs/demo-it.flogic-keyring`, connect an empty folder,
   and click **Make key file** next to Fernando G. It writes `u-0001/flogic.flogic-key`.
2. **The person:** open `DIRECTORY/testI.html`, click **Connect your Flogic folder**, pick the `u-0001` folder, and pick
   a PIN. Open `demo-data/packs/demo_incident.flogic`: it opens. `demo_change_request.flogic` is refused.
3. Click **🔒 Lock**. From now on it's the PIN only.

## What's still here

| File | What it is |
|---|---|
| `demo/demo-it.flogic-signer` | IT's demo signing key (it's also inside the demo keyring). **Running `make-demo.mjs` replaces it** and breaks every key file and the app's trust file |
| `core-testsS.js`, `run-node-test.mjs`, `load-core.mjs` | Core checks in Node (the browser runs the same ones) |
| `mailbox-testsS.js`, `run-mailbox-test.mjs`, `memory-folderS.js` | Folder checks against an in-memory folder |
| `app-signin-test.html` | **The real app**, signed in with a key file, end to end, plus the "nothing readable is kept" scan |
| `signin-test.html` | Core checks, plus the real console and the draft person page, end to end |
| `folder-real-test.html` | The real console and the draft person page on REAL browser folder handles |
| `signin.html`, `signinS.js`, `signinS.css` | The first draft's person page. Kept because two test pages still drive it |
| `run-browser-test.mjs` | Runs any of the test pages headless |

## Tests

```text
node sso-draft/run-node-test.mjs                                71 / 71
node sso-draft/run-mailbox-test.mjs                             15 / 15
node sso-draft/run-browser-test.mjs                            100 / 100   (Chrome or Edge, Node 22+)
node sso-draft/run-browser-test.mjs app-signin-test.html        50 / 50    (the real app)
node sso-draft/run-browser-test.mjs folder-real-test.html       35 / 35    (real folder handles)
```

`app-signin-test.html` and `signin-test.html` use an in-memory folder. `folder-real-test.html` uses the browser's REAL
folder handles (its private folder: the same kind of handle a OneDrive folder gives), including remembering the folder
after a reload. What no test covers: the Windows "Select folder" window and its "Allow" prompt, and OneDrive or Drive
syncing the file across.

## What it can't do

- **It can't take access back early.** A key file works until its end date (7 days at most, 1 for a Guest).
- **Anyone who gets the key file gets in** until its end date. The drive's login is the lock.
- **A synced drive folder puts the key file on the laptop's disk.** The app keeps nothing readable; the folder does.
- **A 4-digit PIN is very weak against someone who copies the browser's files** (about 0.3 s a guess offline).
- **The laptop's clock decides "ended".**
- **Whoever can change the app's files can change whom it trusts** (`it-signerI.js`) and the rules (`policyI.js`).
