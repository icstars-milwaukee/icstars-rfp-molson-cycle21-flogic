# Security audit v0.3.0: filekey sign-in

**Scope:** `sso-draft/` on branch `feature/filekey`: `signincoreS.js`, `mailboxS.js`, `signinS.js`, `itissueS.js`.
**Replaces:** `AUDIT-v0.2.0.md` (the request, voice-check and passphrase flow is gone).
**Method:** read the code; 47 core checks, 15 folder checks, and 76 browser checks, all passing. **Not done:** a real
OneDrive or Drive folder, and a review by anyone outside this build.

**The decision (DJ, 2026-11-11):** simpler for IT, nothing for the person to remember but a PIN, and data encrypted
on the laptop. **Security rests on the employee's drive account.**

## What protects what

| Thing | Guarded by |
|---|---|
| The key file in the drive (the login) | The drive account's own sign-in. **Turn on company MFA.** Share each subfolder with its person only |
| Who's in which group, until when | IT's signature. Any edit is refused (tested) |
| The laptop's copy | A PIN of 6 to 12 digits, PBKDF2 at 600,000 rounds, and a wipe after 10 wrong PINs |
| Data packs | AES-GCM group keys, opened only on the laptop, never readable by the page (non-extractable) |

## Tried and held (tests)

- A key file with a pushed-out end date, an added group, or changed rules is refused.
- Keys swapped in from another file, a file signed by another IT key, and a forged issuer name are all refused.
- An ended file is refused, and a session ends at the end date, even mid-session.
- Path tricks in person ids are refused. Oversize files aren't read.
- An older file put back in the folder isn't taken in.
- After 10 wrong PINs, the laptop copy is wiped.
- The laptop copy holds no PIN and no plain group key.

## Open risks (honest)

| # | Risk | Level | What we do |
|---|---|---|---|
| C1 | **The key file is a bearer login.** Whoever has it can sign in until its end date (shared link, hacked drive, copied file) | **High** | MFA on the drive. Short end dates (7 days) with Renew everyone. Never email key files |
| C2 | **No early revoke.** Someone who leaves keeps access until their current file ends | High, known | Remove them from the keyring and don't renew. Their access ends within 7 days at most |
| C3 | **A PIN is weak against a copied browser profile.** 1 million 6-digit PINs at about 0.3 s each means days offline, not years. The wipe counter can be skipped by copying the files | Medium | Accepted: the PIN is for the unlocked-desk case. A longer PIN helps. Windows Hello would be the real fix (v0.4 idea) |
| C4 | **The folder shows who's in which group.** Claims are signed, not hidden | Low | Each subfolder is shared with one person only |
| C5 | **The demo IT signing key is public** (passphrase in the repo) | High if shipped | Make a real key before real use; never ship the demo one |
| C6 | **The laptop clock decides expiry** | Medium, known | None here |
| C7 | **Folder permission may re-prompt** each browser session. Chrome and Edge only | Low | The page asks only when a renewal is due. Opening the file by hand always works |
| C8 | **Whoever can edit the app's files can swap the trusted IT key** | Known | Ship the app from a place only IT can write to |

## What changed from v0.2.0, security-wise

- **Gone:** the laptop's own key pair, the request file, and the voice check. A stolen key file no longer needs the
  laptop to work. That is the price of the simpler flow (C1).
- **New:** the PIN-locked laptop copy, the wrong-PIN wipe, and renewal straight from the folder.

## Before any real use

1. Make a real IT signing key (C5).
2. Turn on MFA for the drive accounts that hold key files (C1).
3. Test on a real OneDrive and a real Drive folder (job R2 in `STANDBY-v0.3.0.md`).
4. Get an outside review (R1).
