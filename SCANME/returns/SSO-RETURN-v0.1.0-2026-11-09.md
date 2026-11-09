# SSO-style sign-in: return (v0.1.0)

**From:** Fernando's agent
**Date:** 2026-11-09
**Branch and last commit:** `sso-draft` @ the commit that adds this file (step commits: `fb7233f`, `cb5c035`)
**Task:** S1, from `SCANME/SSO-PERMISSION-v0.1.0.md`
**Status:** done (as a draft). There are decisions for DJ and Fernando in section 9.

**The steer from Fernando:** *"users do not care one bit about security, but we do."* Every choice below follows from
it. The person's part is as small as possible: a one-time set-up, then only a passphrase. Everything that matters is
IT's, signed, and checked on every sign-in.

---

## 1. What you built, and how to run it

- **Folder:** `sso-draft/`. It's standalone. It changes nothing in `DIRECTORY/`, `it-console/` or `demo-data/packs/`
  (all of those are only read).
- **Files, one line each:**
  - `signincoreS.js`: `SignInCore`. The crypto and file shapes: IT's signing key, the laptop key, the request, the
    sign-in file, the check, the session.
  - `signin.html` + `signinS.js`: the person's page (set up, open IT's file, sign in, open packs, Lock).
  - `it-issue.html` + `itissueS.js`: IT's page. It takes in the keyring, the signing key and a request, and puts out a
    sign-in file.
  - `signinS.css`: the look of both pages, light and dark, with no web fonts.
  - `it-signerS.js`: the app's pinned copy of IT's public key (`FLOGIC_IT_SIGNER`).
  - `demo/demo-it.flogic-signer`: IT's demo signing key.
  - `make-demo.mjs`: makes the demo signer and pin again.
  - `core-testsS.js`: the shared checks. `run-node-test.mjs` and `load-core.mjs` run them in Node.
    `signin-test.html` and `run-browser-test.mjs` run them in Chrome, plus the pages end to end.
  - `README.md`: how to try it.
- **How to open it:** Chrome or Edge, as `file://`, Wi-Fi off is fine. Start at `sso-draft/signin.html`, then
  `sso-draft/it-issue.html` for IT. `sso-draft/README.md` has the clicks.
- **Demo passphrase, codes and sample files:**
  - IT passphrase: `flogic demo keyring only`. It opens both the existing demo keyring and the new demo signer.
  - IT key fingerprint: `X8FB-44UJ-APFN-VWCM`.
  - The person picks their own passphrase. The tests use `correct horse battery staple`.
  - There are **no setup codes** anymore.
  - Packs: the existing `demo_incident.flogic` (Service Desk) and `demo_change_request.flogic` (Change Team).

## 2. The sign-in flow

**Once per laptop:**

1. **Person:** opens the app and types their name and a passphrase (twice; at least 12 characters, or 4 words).
2. **App:** makes this laptop's key pair (ECDH P-256) and locks the private half with the passphrase (PBKDF2-SHA256,
   600,000 rounds, AES-GCM wrap). It keeps only the locked copy, then saves `name.flogic-request` (public key, name,
   laptop code) and shows the **laptop code** (`8MHH-QDJF-A66A-CCV2`).
3. **Person:** sends the request file to IT (email or Teams). It holds nothing secret.
4. **IT:** opens the keyring and the signing key with the IT passphrase, then opens the request.
5. **IT's page:** checks that the request's laptop code matches its key, and shows the code.
6. **IT:** asks the person to read out the code on their screen and ticks "it matches". The page won't issue until then.
   This is what stops someone sending IT a request under a colleague's name.
7. **IT:** picks the person in the keyring. Their groups come from the keyring, not from the request. IT then picks an
   end date (default 7 days, never after the person's keyring expiry) and clicks **Make their sign-in file**.
8. **IT's page:** wraps each group key to that laptop's public key (a throwaway ECDH key, then HKDF, then AES-GCM wrap),
   signs the claims, and saves `name.flogic-signin`.
9. **Person:** opens that file in the app.
10. **App:** checks the signature against the pinned IT key, that the file is for this laptop, and that it hasn't
    ended. Then it stores the file next to the locked laptop key.

**Every day:**

11. **Person:** taps their name and types their passphrase.
12. **App:**
    1. The passphrase unlocks the laptop's private key (unreadable).
    2. The sign-in file is **checked again**: signature, issuer, laptop, end date, and that its keys part matches.
    3. The laptop key unlocks **every** group key at once (unreadable).
    4. The **session** starts.

**The session** lives in memory only and covers all of the person's groups. It ends in one of three ways:

- **Lock:** the button. The keys are dropped.
- **Timer:** idle time (no click, key or scroll). The limit is the *shortest* `autoLockMin` among the person's groups.
- **End date:** checked by a timer and on every action. A session open past the end date closes then, even mid-task.

When it ends, the app goes back to the passphrase screen and says why.

**Renewal:** IT issues a new file for the same request, and the person opens it under "Got a new file from IT?". There's
no new passphrase and no new set-up. An *older* file than the one already in is refused, so nobody can roll back to a
file IT replaced. **Forgot the passphrase:** set up again, and IT sends a new file. No data is lost, because none is kept.

## 3. The new file formats

All are JSON (UTF-8). `v: 1` is the version marker in each. Base64 is standard base64; JWKs are WebCrypto's.

### 3.1 `.flogic-signer`: IT's signing key (IT keeps it, like the keyring)

| Field | What |
|---|---|
| `flogic` | `"signer"` |
| `fingerprint` | The IT key's fingerprint (see 3.4) |
| `publicKey` | JWK, ECDSA P-256 |
| `made` | `YYYY-MM-DD` |
| `locked` | `{ salt (16 B), rounds (600000), iv (12 B), wrapped }`: the PKCS#8 private key, AES-GCM-wrapped by PBKDF2(IT passphrase). additionalData = `"flogic-signer|" + fingerprint` |

Example: `sso-draft/demo/demo-it.flogic-signer` (fingerprint `X8FB-44UJ-APFN-VWCM`).

### 3.2 `.flogic-request`: the person to IT (nothing secret)

```json
{ "flogic": "signin-request", "v": 1, "name": "Fernando G", "fingerprint": "8MHH-QDJF-A66A-CCV2",
  "publicKey": { "key_ops": [], "ext": true, "kty": "EC", "crv": "P-256",
                 "x": "ms5eC7msYFDu-Od0HF8Sz5_oX2cqmnE790vbS09jl10", "y": "TP1_A-UjNKL3M_YX1dYk8ZDmv9vNkUXJEYUziDcapG4" },
  "made": "2026-11-09" }
```

`readRequest` refuses it if `fingerprint` isn't the fingerprint of `publicKey`.

### 3.3 `.flogic-signin`: IT to the person

```json
{ "flogic": "signin", "v": 1,
  "claims": "{\"iss\":\"X8FB-44UJ-APFN-VWCM\",\"sub\":\"u-0001\",\"name\":\"Fernando G\",\"groups\":[{\"group\":\"service-desk\",\"label\":\"Service Desk\",\"keyVersion\":1,\"rules\":{\"export\":true,\"autoLockMin\":15}}],\"laptop\":\"8MHH-QDJF-A66A-CCV2\",\"issued\":\"2026-11-09T21:25:23.938Z\",\"expires\":\"2026-11-17T05:59:59.000Z\",\"serial\":\"4L6Fi1uQE7fW\",\"keys\":\"UzyBNzJweHMIMJhXY7n5xDeHSF8P4mGBIRy6ALYFodU=\"}",
  "sig": "3EtwXSxmE8R4wBt0KxCapu6tU/J/L9hPPXEKLQqdRDYNfBo5EjRJRiHW0vPWKPugfeV0fcbgrXWbTTYDhVYSxw==",
  "keys": { "epk": { "kty": "EC", "crv": "P-256", "x": "RUDTxR8oN2FaNOs8Xn9rHLiXaol3ptCJLtVIOC6gung", "y": "H7_oy1zC4NEk46YSRvIcwkfSIyKetXtT07yH4sLLuio", "key_ops": [], "ext": true },
            "salt": "LxGWYI/6OMJF9IqwzqtqMQ==",
            "entries": [ { "group": "service-desk", "keyVersion": 1, "iv": "StNPD2AxZvoDKuxM",
                           "wrapped": "88LOi3Cmrl+GBmiZmvRg9NQzXvKc4JJkBiU23cAFJyhSUCCSOZ7JT0V3QFPJ3u7e" } ] } }
```

- **`claims`** is a *string*, so the signed bytes are exact, with no JSON re-ordering problems. Its fields:

  | Field | What |
  |---|---|
  | `iss` | IT key fingerprint |
  | `sub` | Person id (from the keyring) |
  | `name` | The person's name |
  | `groups[]` | `{ group, label, keyVersion, rules: { export, autoLockMin } }` |
  | `laptop` | Laptop fingerprint |
  | `issued`, `expires` | ISO-8601 UTC instants |
  | `serial` | 9 random bytes, base64 |
  | `keys` | Base64 SHA-256 of `JSON.stringify(keys)` |

- **`keys`** is the locked-keys part. The claims hold **no key**, only that hash, as the brief asks. The two parts are
  bound together: swap either one and the check fails.
- **`sig`** is ECDSA P-256 / SHA-256, 64 bytes (r‖s).

### 3.4 Fingerprints (the laptop code, the IT key id)

Take the SHA-256 of the raw (uncompressed, 65-byte) public key and read it in 5-bit steps into VaultCore's 31-symbol
alphabet. That gives 16 symbols in groups of 4, about 79 bits (the 32nd 5-bit value folds onto `2`). It's short enough
to read over the phone.

### 3.5 What the browser keeps (IndexedDB `flogic-signin-draft`, store `laptops`, keyPath `id`)

```json
{ "id": "8MHH-QDJF-A66A-CCV2", "name": "Fernando G", "publicKey": { "...": "JWK" }, "made": "2026-11-09",
  "locked": { "salt": "gMksWRSTgJWoWJebJCHIdw==", "rounds": 600000, "iv": "+jzBmcjRHa6/xdZA", "wrapped": "<PKCS#8, wrapped>" },
  "signin": { "...": "the .flogic-signin file, as above" } }
```

The laptop key's additionalData is `"flogic-laptop|" + id`. The `.flogic` pack and `.flogic-id` formats are unchanged.

## 4. The crypto

| Question | Answer |
|---|---|
| What is signed (which fields, in what order)? | The UTF-8 of `"FLGSIGN1\n" + claims`, where `claims` is the exact string in the file. Field order as written by `issue`: `iss, sub, name, groups, laptop, issued, expires, serial, keys`. The `FLGSIGN1\n` prefix means a signature over anything else can't pass as a sign-in. The locked keys are covered through the `keys` hash. |
| Algorithm and key size | Signing: ECDSA P-256 with SHA-256. Laptop key: ECDH P-256. Group keys to the laptop: a throwaway ECDH P-256 key, then 256 shared bits, then HKDF-SHA256 (16-byte salt, info `"flogic-signin|" + serial`), then AES-GCM-256 `wrapKey`. Each wrapped key's additionalData is `sub\|group\|keyVersion\|serial`. Passphrases: PBKDF2-SHA256, 600,000 rounds, as in VaultCore. Everything is `crypto.subtle`. |
| Where does IT's private key live, and how is it protected? | In `.flogic-signer`, wrapped with PBKDF2(IT passphrase). It's opened as `extractable: false`, `['sign']`, held only in `it-issue.html`'s memory, and dropped by Lock. In the real thing it would live inside the keyring (REQUEST 5). |
| Where does the app get IT's public key, and what stops someone swapping it? | From `it-signerS.js`, shipped with the app. The app checks that the pin's key matches its own fingerprint, which catches a half-edited pin (tested). **Nothing** stops someone replacing the whole file: whoever can change the app's files can change whom it trusts (tested and written down as a limit). IT should check the fingerprint `X8FB-44UJ-APFN-VWCM` when it hands out the app. |
| What is checked, and where? | **IT's page:** the request's fingerprint against its key, the code read back by voice, the person and groups from the keyring, and an end date that's in the future and not after the keyring expiry. **App, on opening a file and again on every sign-in:** the signature against the pin, the issuer, the keys-part hash, the laptop, the end date, and that the groups and keys match. **App, during a session:** the end date and the idle timer. **Pack:** the group from its label must be in the session (otherwise "not in that group"), and AES-GCM still checks the label. |
| What does a tampered name, group or date do? | It's refused with "This sign-in file has been changed since IT made it." (`bad-signature`). Tested: name, added group, swapped group, a longer auto-lock, a later end date, a changed laptop, one flipped signature bit. A changed keys part, or a keys part moved from another file, gives `damaged`. A file signed by another key gives `wrong-issuer`, including when it claims our `iss`. |
| Anything stored in the browser? | One record per set-up laptop (3.5): name, laptop public key, laptop private key **locked**, and IT's sign-in file (signed claims plus group keys **locked to the laptop**). No passphrase, no unlocked key, no data. The tests check the store for the passphrase and for any JWK private part (`"d":`). |

## 5. What you reused from `VaultCore`, and what you'd need added

| Function / format | Used how | Changed? |
|---|---|---|
| `toB64`, `fromB64` | All base64 | No |
| `passphraseProblem` | The person's passphrase rule | No |
| `unlockKeys('it-keyring', …, true)` | Opening the existing keyring's group keys on IT's page | No |
| `readPackHeader`, `openPack` | The session opens the existing `.flogic` packs | No |
| The 31-symbol code alphabet | The fingerprints (copied as a constant) | No |
| `keyFromSecret` (inside, not exported) | **Re-written** in `signincoreS.js` with the same parameters, because VaultCore doesn't export it | No (see REQUEST 1) |
| `.flogic` / `.flogic-id` formats | `.flogic` read as-is. `.flogic-id` not used by the new way. | No |

New functions I'd want in `DIRECTORY/vaultcoreI.js`. In practice, move the whole of `signincoreS.js` in; it's written
in the same style.

- `lockPrivateKey(key, secret, label, rounds?)` returns `{ salt, rounds, iv, wrapped }`.
  `unlockPrivateKey(locked, secret, label, algorithm, usages)` returns a non-extractable CryptoKey, or throws
  `wrong-secret`. (These share `keyFromSecret`.)
- `fingerprint(publicKey)` returns `"XXXX-XXXX-XXXX-XXXX"`.
- `newSigner(passphrase)`, `readSigner(text)`, `openSigner(file, passphrase)` returning `{ fingerprint, sign }`, and
  `pin(file)`.
- `newLaptop(name, passphrase)` returns `{ record, request }`. Also `readRequest(text)` and
  `openLaptop(record, passphrase)`.
- `issue(signer, request, person, groups, expires)` returns the sign-in file object.
- `readSignin(text)`. `check(signin, pinned, laptopId, now?)` returns the claims, or throws with code `bad-signature`,
  `wrong-issuer`, `wrong-laptop`, `expired` or `damaged`. `openKeys(signin, claims, laptopPrivate)` returns
  `[{ group, keyVersion, key }]`.
- `startSession({ claims, keys, idleMs?, onEnd })` returns `{ who, groups, endsAt, touch, lock, alive, keyFor,
  openPack }`. This may belong in `vaultI.js` instead; see REQUEST 2.

## 6. The honest limits

| Case | What happens | Good enough for the demo? |
|---|---|---|
| Expired assertion | Refused at sign-in ("Your sign-in ended on …. Ask IT for a new one."). A session already open closes at the end time, mid-task (tested with a 6-second file). **But** the laptop's own clock decides: set the clock back and an ended file works again. | Yes, if we say "ends on its date, by the laptop's clock". |
| An assertion copied to another laptop | Refused as `wrong-laptop` ("made for a different laptop"). Even with that check skipped, the other laptop **can't open the keys**, because they're locked to the first laptop's private key (tested both). Copying the browser's *whole profile* and knowing the passphrase would work: that's the same as having the laptop. | Yes. This is stronger than today's `.flogic-id`, which works anywhere with its setup code. |
| A swapped or edited group | Refused (`bad-signature`). Groups and rules are signed now. Today a credential file's `expires` and `rules` can be edited in Notepad. And even if a group were added, there's no key for it. | Yes |
| A person IT wants to cut off before the expiry date | **It can't be done.** There's no server to ask. The file works until its end date. What helps: short end dates (default 7 days; renewing costs the person nothing, which is why short is affordable now) and, for a real cut-off, key rotation (not built, same as today). | Only if said out loud. |
| Wrong passphrase, many times | Each try costs about 0.3 s of PBKDF2 (600,000 rounds), and that's the only brake. Nothing counts tries, and the page doesn't pretend to. Someone with a copy of the browser store can guess offline at that rate. | Yes, the same as today. |
| The app's copy of IT's public key replaced | A pin whose key doesn't match its fingerprint is caught. A **wholly** replaced pin (key and fingerprint) is believed, and that attacker's sign-in files then pass (tested and labelled as the limit). It still can't open real packs without the real group keys. | Yes, because "whoever edits the app owns the app" is true of any app. |
| *(found)* A forged request under someone's name | IT's page refuses to issue until IT ticks that the person read back the laptop code. Skip that by habit and the attacker gets a sign-in for the victim's groups. | It's a habit, like the setup code was. |
| *(found)* The rules (export, auto-lock) | They're signed, so a changed file is refused. DevTools can still skip them in a running page. | Same as handoff section 8. |

**Words to use, in the app and the pitch (never "SSO"):**

- "**One sign-in for all your groups.**"
- "**IT-issued sign-in file.** IT signs who you are and what you can open. Change one letter and it's refused."
- "**It works only on your laptop.**"
- "**After set-up: just your passphrase.**"
- "**It ends on its date. To cut someone off sooner, IT keeps the dates short.**"
- In the pitch: "This is a prototype of what a company sign-in (like Entra ID) would do. The IT console plays IT's part."

## 7. REQUESTS for DJ's agent

| # | File | Change | Why |
|---|---|---|---|
| 1 | `DIRECTORY/vaultcoreI.js` | Add section 5's functions (or move `signincoreS.js` in whole as a second section). Make the PBKDF2 `keyFromSecret` shared rather than written twice. Add the error codes `bad-signature`, `wrong-issuer`, `wrong-laptop`, `expired`, `damaged` to the header list. Edge cases already handled: an empty groups list, a past end date, a file over 256 KB, the `setTimeout` limit beyond 24.8 days (it wakes daily). | One copy of the crypto |
| 2 | `DIRECTORY/vaultI.js` | Add a **second way in** next to "Set up with a credential file": **"Set up this laptop"** (name and passphrase, then the request download and laptop code, then "open the file IT sent"). The unlock screen checks the sign-in file again on every unlock and then calls `signIn(person, opened)` with `opened` from `openKeys`. Use a new store (`laptops`, or a `kind` field) rather than mixing records. Hook the session's end date into V6's auto-lock, so `lockReason` gets "Your sign-in from IT has ended." The user's own shorter auto-lock (V6 prefs) can stay: take the minimum. No recovery code in the new way (see section 9, Q2). | The person's side |
| 3 | `DIRECTORY/vaultI.css` | Styles for the laptop-code line (monospace, letter-spaced), the "good until" line (a warning colour inside 3 days), and the "Got a new file from IT?" fold. `sso-draft/signinS.css` has the draft versions. | Looks |
| 4 | `DIRECTORY/testI.html` | Port `sso-draft/core-testsS.js` (45 checks), plus the page flow in `signin-test.html` (31 more). They're written against `SignInCore` and the page ids, so mostly renames. | Keep the tests |
| 5 | `it-console/` | (Mine to do if you say so.) Put the signing key **inside the keyring** (a `signer` field, locked under the same IT passphrase) instead of a second file. Add an "Issue a sign-in file" panel from `it-issue.html`. Store each issued `serial`, laptop and end date on the person in the keyring, so IT can see who has what. New keyring `v: 2`. | One file for IT, not two |

**What the unlock card should look and say:**

```text
  Who's signing in?                       Fernando G
  ┌──────────────────────────────┐        Service Desk
  │ Fernando G                   │        Good until Nov 16, 2026, 11:59 PM
  │ Service Desk                 │        ┌ Passphrase ───────────────┐
  └──────────────────────────────┘        └───────────────────────────┘
  [ Set up someone new on this laptop ]   [        Sign in         ]
                                          ▸ Got a new file from IT?
                                          Forgot your passphrase? Set up again:
                                          IT just sends a new file.
```

In the first-time screen the title is "One sign-in for all your groups", with name, passphrase twice, and **Make my file
for IT**. After that: "Send that file to IT … If IT asks, your laptop code is **8MHH-QDJF-A66A-CCV2**."

**What changes for someone already set up with a setup code:** nothing, at first. The old way keeps working, and the
draft doesn't touch it. My suggestion is to keep both until IT has re-issued everyone, then hide the old "Set up with a
credential file" behind a small link. The two can live side by side because they use different records.

## 8. Tests

- **Commands:** `node sso-draft/run-node-test.mjs`, and `node sso-draft/run-browser-test.mjs` (Chrome or Edge,
  Node 22+, headless, `file://`).
- **Results:** Node **45 / 45** (about 3 s). Browser **76 / 76** (about 12 s): the same 45, plus 31 that drive the pages.
- **What each group proves:**
  - **Signer:** the demo key matches the pin, a wrong passphrase is refused, a keyring isn't taken for a signer.
  - **Keyring:** the existing demo keyring opens read-only, and the `~check` key is skipped.
  - **Laptop and request:** a weak passphrase is refused, nothing secret is stored or sent, a swapped key is caught,
    and the key comes out unreadable.
  - **Tamper:** name, groups, rules, date, laptop, signature bit, keys part.
  - **Issuer:** another key; another key claiming our id; a half-edited pin; a wholly swapped pin (the limit).
  - **Copied:** the wrong laptop is refused, and it can't open the keys either.
  - **Keys and packs:** one sign-in opens two groups' keys. The real demo packs open, the wrong group's pack is refused
    before and after trying a key, and keys from another file are refused.
  - **Session:** the shortest auto-lock wins, activity keeps it open, idle ends it, Lock drops the keys, the end date
    ends it mid-session.
  - **Pages:**
    - Set-up errors, the request download, the store holding no secrets.
    - IT: wrong passphrase, the voice check enforced, the person matched by name.
    - Edited file refused, wrong passphrase, packs, Lock.
    - Renewal, expiry mid-session, an older file refused.
    - No "SSO" on the page.
- **What isn't tested:**
  - Firefox or Safari (IndexedDB on `file://`).
  - The idle timer *on the page* (too slow at 10–15 min; it's tested in the core with a short timer).
  - The real `DIRECTORY/` app, because nothing is wired in yet.
  - "Forget me on this laptop" (it uses `confirm()`).
  - "Make a new signing key" on IT's page.
  - Two people on one laptop at once.

## 9. Rough edges and what you'd do differently

- **Still rough:**
  - IT has two files (keyring and signer). REQUEST 5 makes them one.
  - "Make a new signing key" on IT's page saves the key but doesn't write the pin. That's done by `make-demo.mjs` for now.
  - There's no list of issued sign-in files, so IT can't see who holds what or until when.
  - Names match a keyring person only by exact name (IT can still pick from the list).
  - The test reads downloads from `window.__flogicLastDownload`, a test hook left on the pages.
- **Would do differently:** with more time, I'd put the request inside the IT console and give IT a "who holds what"
  list, so short end dates are easy to keep up.
- **Questions for DJ and Fernando:**
  1. **The default end date.** I picked 7 days, as the most cautious setting that's still easy (renewal is free for the
     person, about a minute for IT). Is a week right for the demo, or 30 days?
  2. **No recovery code in the new way.** A forgotten passphrase now means "set up again, and IT sends a new file", and
     nothing is lost. I dropped it because people who don't care about security lose or tape up recovery codes. Keep it
     dropped?
  3. **The voice check of the laptop code.** It's the one habit left, like the setup code was. It's enforced by a tick
     box. Is that enough, or should IT type the code back in?
  4. **Both ways at once** (section 7) for the Nov 19 demo, or the new way only?

## 10. Suggested changelog entry

**New**

- One sign-in for all your groups. Set up once: type your name and a passphrase, send the file to IT, and open the file
  IT sends back. After that, just your passphrase.
- IT signs who you are, your groups, your rules and your end date. Change one letter in the file and it's refused.
- An IT sign-in file works only on the laptop it was made for.
- Sign-ins end on their own: when you lock, when you step away, or when IT's end date comes, even mid-task.
- A new file from IT goes straight in, with nothing to set up again.

**Known limits**

- A sign-in can't be taken back before its end date (there's no server to ask). IT keeps the dates short instead.
- The laptop's clock decides when a sign-in has ended.
- Nothing counts wrong passphrases. Each guess is only slowed down.
- Whoever can change the app's files can change which IT key it trusts.
- IT has to check the laptop code with the person by voice. If that's skipped, a fake request could be signed.
