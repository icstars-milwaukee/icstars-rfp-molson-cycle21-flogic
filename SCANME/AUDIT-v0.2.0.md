# Security audit v0.2.0: sign-in through a shared folder

**Scope:** `sso-draft/` as of branch `feature/drive-signin`: `signincoreS.js`, `mailboxS.js`, `signinS.js`, `itissueS.js`.
**Method:** read the code, tried hostile folders against it in Node (25 checks in `mailbox-testsS.js`), ran the pages in
a headless browser (77 checks). **Not done:** a test with a real OneDrive/Drive folder and a real folder picker. No outside
reviewer has looked yet (job R1 in `STANDBY-v0.2.0.md`).

**Threat in one line:** the shared folder is not trusted. Whoever can write to it, or whoever runs it, can add, change,
delete or read files. Flogic must stay safe anyway.

## Fixed in this build

| # | Finding | Why it mattered | Fix |
|---|---|---|---|
| A1 | The voice check was a tick box | With a shared folder, IT no longer knows the sender from an email address. A box nobody has to be honest about is the only thing between a fake request and a real key | IT types the code the person reads out; the page compares. The page never shows the expected code, so it can't be read to the person |
| A2 | File names in a shared folder | A name like `../../x` or a person's chosen name could become a path | Names are the laptop code only, checked against a strict pattern. Nothing inside a file is ever used as a path |
| A3 | Huge or flooded folders | A 1 GB file or 100,000 junk files could freeze IT's page | Size is checked before reading; only the first 500 files are listed, and the page says so |
| A4 | A request filed under another laptop's code | Could trick IT into answering the wrong key | The file's own code must equal its key's hash and its name; otherwise it is skipped |
| A5 | IT page picked the person by name | An attacker who types a boss's name gets the boss's groups pre-selected | Still pre-selected, but now it says plainly it is only a guess from the name |
| A6 | Renewal needed a second voice check | Nobody will do 200 phone calls; they would stop renewing | `readIssued`: IT renews only laptops it has already signed for (signature, issuer and keys-hash checked). A laptop's key can't change under the same code |

## Tried and held (tests)

A longer end date typed into the file; a sign-in made by another IT key; another laptop's valid sign-in copied under
mine; a swapped key part; a deleted answer; a request with a mismatched key; the folder without permission.

## Still open (honest)

| # | Risk | Level | What we do about it |
|---|---|---|---|
| B1 | **No early revoke.** A sign-in works on that laptop until its end date, even after the person leaves | High, known | Short end dates (7 days, draft). Stopping "Renew everyone" is the lever. A real identity provider would do this properly |
| B2 | **The folder shows who and what.** Names, groups, rules, end dates and laptop codes are signed, not hidden. Anyone with folder access can read them (not any keys) | Medium | Share the folder only with the people who need it; ideally people can add to `inbox` but not read others' files, and `outbox` is read-only for them (set in OneDrive/Drive). Needs R2 to confirm it is workable |
| B3 | **The demo IT signing key is public.** Its passphrase is in the repo (`flogic demo keyring only`) | High if shipped | Make a new key before any real use (`it-issue.html`, "No signing key yet?"), replace `it-signerS.js`, delete the demo one. Never ship the demo key |
| B4 | **A weak passphrase is the only brake** on guessing a stolen laptop record (600,000 rounds, about 0.3 s a guess) | Medium | 12 characters or 4 words minimum. The laptop record holds no data, only a locked key |
| B5 | **The laptop clock decides expiry** | Medium, known | Nothing here. Back date the clock and an expired file works again |
| B6 | **Spam in the inbox.** Anyone with write access can add many fake requests | Low | They can't get a file without the typed code. IT sees "waiting" entries, which is noise only |
| B7 | **Sync quirks.** OneDrive/Drive may rename conflicts (`name (1).flogic-signin`) or lag. Odd names are ignored on purpose, so the person sees "waiting" | Low | The person's page can still open a file by hand. Say this in the tutorial |
| B8 | **Folder permission may re-prompt** each browser session; some browsers refuse top-level folders such as Downloads (to confirm in R2) | Low | Pick a subfolder. The by-hand route always works |
| B9 | **No log of who was issued what.** The outbox files are the only record | Low | A v0.3 candidate |
| B10 | **Whoever can edit the app's files can swap the pinned IT key** (a file you can edit is a key you can change) | Known | Ship the app from a place only IT can write to |

## What this design does not claim

It is not single sign-on and not an identity provider. It proves "IT said yes to this laptop's key, with these groups,
until this date." Real SSO (an identity provider such as Entra ID) would add instant revoke and proper identity, and would
replace the hand-made signing. This prototype plays that part for the demo.

## Before any real use

1. Make a real IT signing key (B3). 2. Decide the default end date (7 or 30 days). 3. Run R2 on real folders.
4. Have someone outside this build run R1.
