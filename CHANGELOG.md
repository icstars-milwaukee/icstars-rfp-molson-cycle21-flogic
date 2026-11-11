# Changelog

Plain words, newest first. Headings: **New**, **Safer**, **Fixed**, **Known limits** (left out when empty).
Versions follow SemVer; everything is `0.x` until the Nov 19 demo. Conventions: `SCANME/README.md`.

## 0.2.0 (unreleased, branch `feature/drive-signin`)

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
