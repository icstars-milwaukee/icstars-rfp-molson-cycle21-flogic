# Filekey sign-in (draft v0.3.0)

**This is a draft for review, not a release.** These are standalone pages, not the real app. Nothing in `DIRECTORY/`,
`it-console/` or `demo-data/packs/` changes. The audit is in `SCANME/AUDIT-v0.3.0.md`.

**The idea:** IT makes one signed **key file** per person and puts it in that person's OneDrive or Google Drive folder.
The person connects the folder once and picks a PIN for the laptop. After that, signing in is **only the PIN**. IT
renews by putting a new key file in the folder, and the page takes it in by itself. Data is opened only on the laptop.

**Security depends on the employee's drive account.** The key file is the login, so the drive's sign-in (company MFA)
guards it. The PIN guards the laptop's own copy: 10 wrong PINs and the laptop forgets the person.

## Try it (Chrome or Edge, opened as `file://`)

Demo IT passphrase (keyring and signing key): `flogic demo keyring only`. Made-up data only.

1. **IT:** open `sso-draft/it-issue.html`.
   1. Pick `demo-data/packs/demo-it.flogic-keyring` and `sso-draft/demo/demo-it.flogic-signer`, type the passphrase, and
      click **Open**.
   2. **Connect IT's Flogic folder**: make an empty folder for this, inside OneDrive or Drive if you have it.
   3. Click **Make key file** next to Fernando G. It writes `u-0001/flogic.flogic-key` into that folder.
2. **The person:** open `sso-draft/signin.html`.
   1. Click **Connect your Flogic folder** and pick the `u-0001` folder.
   2. Pick a PIN (4 or more digits). You're signed in.
   3. Open `demo-data/packs/demo_incident.flogic`: it opens. `demo_change_request.flogic` is refused.
   4. Click **Lock**. From now on it's the PIN only.

With no folder access, IT's page downloads the key file and the person opens it by hand.

## Files

| File | What it is |
|---|---|
| `signincoreS.js` | `SignInCore`: IT's signing key, the key file, the PIN-locked laptop copy, the session |
| `mailboxS.js` | `Mailbox`: the drive folder (IT's parent folder, the person's own subfolder) |
| `signin.html`, `signinS.js` | The person's page |
| `it-issue.html`, `itissueS.js` | IT's page: people from the keyring, Make key file, Renew everyone |
| `signinS.css` | The look of both pages |
| `it-signerS.js` | The app's pinned copy of IT's **public** signing key (a DEMO key) |
| `demo/demo-it.flogic-signer` | IT's demo signing key. **Running `make-demo.mjs` replaces it** and breaks old key files |
| `core-testsS.js`, `run-node-test.mjs`, `load-core.mjs` | Core checks in Node (the browser runs the same ones) |
| `mailbox-testsS.js`, `run-mailbox-test.mjs`, `memory-folderS.js` | Folder checks against an in-memory folder |
| `signin-test.html`, `run-browser-test.mjs` | Core checks, plus both pages end to end, headless |
| `folder-real-test.html` | Both pages on a real browser folder handle (run: `node sso-draft/run-browser-test.mjs folder-real-test.html`) |

## Tests

```text
node sso-draft/run-node-test.mjs       47 / 47
node sso-draft/run-mailbox-test.mjs    15 / 15
node sso-draft/run-browser-test.mjs    77 / 77   (Chrome or Edge, Node 22+)
node sso-draft/run-browser-test.mjs folder-real-test.html    31 / 31   (real folder handles)
```

`signin-test.html` uses an in-memory folder. `folder-real-test.html` uses the browser's REAL folder handles (its private
folder: the same kind of handle a OneDrive folder gives), including remembering the folder after a reload. What no test
covers: the Windows "Select folder" window and its "Allow" prompt, and OneDrive or Drive syncing the file across.

## What it can't do

- **It can't take access back early.** A key file works until its end date (default 7 days). Stop renewing someone, and
  they're out when it ends.
- **Anyone who gets the key file gets in** until its end date: a shared link, a hacked drive account, a copy on a USB
  stick. The drive's login is the lock.
- **A 4-digit PIN is very weak against someone who copies the browser's files** (about 0.3 s a guess offline). It stops a
  person at an unlocked desk, not a determined thief with the disk.
- **The laptop's clock decides "ended".**
- **Whoever can change the app's files can change whom it trusts** (`it-signerS.js`).
