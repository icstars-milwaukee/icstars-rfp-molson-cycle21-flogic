# Changelog

Plain words, newest first. Headings: **New**, **Safer**, **Fixed**, **Known limits** (left out when empty).
Versions follow SemVer; everything is `0.x` until the Nov 19 demo. Conventions: `SCANME/README.md`.

## 0.4.0 (unreleased, branch `feature/sprint3-finalization`)

DJ's Sprint 3 finalization list. Key-file sign-in moves out of the draft and into the real app and the real IT console.

### New
- **The app signs you in with your key file.** Connect the drive folder IT shared with you once, pick a PIN, and after
  that it's the PIN only. A renewed key file in the folder is taken in by itself.
- **Access levels: Guest, Viewer, Analyst.** A group says which data you can open. A level says what you may do with it:
  whether you can export, how soon the app locks, how long your key file lasts, and what the dashboard opens with.
  When a group and a level disagree, the stricter one wins.
- **The IT console is one place for all of it**, in the app's own look. It opens on who has what (level, groups, key
  file, review, last day) and what needs doing today. Add and edit people, **Make key file**, **Renew everyone**,
  **Still needed**, **End access**.
- The console shows **which data is for whom**: each group with its key, its rules, its people, and what was packed
  for it.
- IT's signing key now lives inside the keyring (one file, one passphrase), and the console makes the app's trust file.

### Safer
- **Short access is built in.** A key file lasts 7 days at most, 1 day for a Guest. IT can't pick longer.
- **Renewal is built in.** Every 30 days IT confirms each person still needs access. Without it, no new key file.
- **The app checks the rules itself.** A key file that lasts too long, was made after the review ran out, or gives more
  than its level allows is refused, even when IT's own key signed it (tested).
- **Nothing that signs you in is kept readable by the app** (tested): no PIN, no plain key and no data in the browser's
  storage, in the page, or in a page-wide variable. The browser keeps IT's signed claims and PIN-locked keys only.
- The end date signs you out mid-session. Ten wrong PINs and the laptop forgets that person.

### Fixed
- The key-file page for IT could make a new signing key with no way to tell the app about it, so its key files were
  refused. The console now warns when the app next to it trusts a different key, and downloads the trust file.
- IT couldn't add a person for key files without making an old credential first. People are now added directly.
- The people list on IT's page could show a person twice when it was redrawn while still reading the folder.

### Known limits
- **The key file is still the login**, and **a synced drive folder puts it on the laptop's disk.** The app keeps
  nothing readable; the folder does. The computer's lock screen and the drive's MFA are the protection there.
- No early revoke: **End access** stops new key files, and the one already held works until its end date.
- The older credential file and passphrase way is still on (`FlogicPolicy.ALLOW_LEGACY_CREDENTIALS`). It doesn't follow
  the short-access and review rules. One flag turns it off.
- Export, auto-lock and the dashboard view are rules the app follows, not locks. The group keys and the key-file
  checks are the locks.
- A Guest's "short summary" is what the dashboard starts with, not a limit: Edit can still add tiles.
- Key files from 0.3.0 (`v: 3`) are refused. IT makes new ones.
- Not yet tried on a real OneDrive or Drive folder. Shipping Molson's data with the IT side is not handled here.

## 0.3.0 (unreleased, branch `feature/filekey`)

### New
- Sign in with a key file. IT makes one signed key file per person and puts it in that person's OneDrive or Google Drive
  folder. The person connects the folder once, picks a PIN, and is in. After that it's the PIN only.
- IT's page lists everyone in the keyring: **Make key file** per person, and **Renew everyone**. Renewals are taken in
  by the person's page by itself.
- Without folder access, IT downloads the key file and the person opens it by hand.

### Safer
- An edited, forged, swapped or ended key file is refused (tested). An older one put back isn't taken.
- After 10 wrong PINs, the laptop forgets the person. They connect their folder again.
- Audit: `SCANME/AUDIT-v0.3.0.md`.

### Known limits
- **The key file is the login.** Whoever gets it gets in until its end date, so the drive account (with MFA) is the lock.
- No early revoke: someone removed keeps access until their current file ends (7 days by default).
- A 4-digit PIN slows a casual person, not someone who copies the browser's files.
- Not yet tried on a real OneDrive or Drive folder.

### Removed
- The request file, the laptop code and voice check, and the passphrase. 0.2.0 was never released.

## 0.2.0 (not released, replaced by 0.3.0; branch `feature/drive-signin`)

### New
- Sign-in through a shared folder (OneDrive, Google Drive for desktop or a network share). The person types a name and a
  passphrase and clicks "Ask IT for access". Nothing to email, nothing to open when IT says yes: the page signs them in by
  itself.
- IT sees one inbox of requests, answers each with a click, and can **Renew everyone** in one go.
- Without a shared folder it still works by swapping files by hand.

### Safer
- IT now types back the laptop code the person reads out, instead of ticking a box. The page never shows IT the code.
- Names in the shared folder are checked strictly. Odd names, oversize files, and a flooded inbox are ignored, not trusted.
- A sign-in someone edited, made with another key, or copied from another laptop is refused (tested).
- Security audit written down: `SCANME/AUDIT-v0.2.0.md`.

### Known limits
- Folder logic is tested against an in-memory folder; a real OneDrive/Drive folder has not been tried yet.
- A sign-in can't be taken back early. It works until its end date. People who leave stop getting renewals.
- Anyone with access to the shared folder can read who has access and to which groups (never any keys).
- The IT signing key in the app is a demo key. Make a new one before real use.

## 0.1.0 (tag `v0.1.0`)

### New
- First draft of one sign-in for all your groups: the person sends IT a small file, IT sends one back, then only a
  passphrase each day. Groups, rules and an end date come from IT and are signed.

### Known limits
- Sending and opening the files by hand takes several steps.
