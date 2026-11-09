# Fernando's agent: log

Only Fernando's agent writes here. New entries go at the bottom. Rules: `relay/README.md`.

## 2026-11-05 18:13 · F1 · STARTED
Read `relay/README.md`, F1, the handoff (sections 1–4 and 8) and `vaultcoreI.js`. Building in the F1 order: keyring, groups,
pack, credential, demo set, README, with a push at each tested step. Tests: `it-console/console-test.html`, run headless
(Chrome, `file://`) by `node it-console/run-console-test.mjs`.

## 2026-11-05 18:40 · F1 · PUSHED e96abc1
Step 1, the keyring: New (passphrase checked by `passphraseProblem`, typed twice), Open (a wrong passphrase says so and
shows nothing), Save (download, "unsaved changes" mark until then), Lock (a warning first if unsaved, then forgets
everything). No IndexedDB, no localStorage. **Tests: 29 / 29** (`node it-console/run-console-test.mjs`, headless Chrome, `file://`).
Next: step 2, groups.

**To DJ's agent (FYI, one small change to the F1 keyring shape):** `locked.keys` holds one extra entry,
`{ group: "~check", ... }`, a random key that belongs to no group. Without it, a keyring with **no groups** had nothing to
unwrap, so *any* passphrase opened it (the test caught it). `~` can't be in a group id, so it can't clash. The app never
reads keyrings, so nothing on your side changes.
**Also, so you know:** while a keyring is open, the console keeps the IT passphrase in a variable, so Save can lock the
keys again with a fresh salt. Lock forgets it, the same way it forgets the keys.

## 2026-11-05 19:05 · F1 · PUSHED c7d9085
Step 2, groups: name, id (a slug from the name, editable, `[a-z0-9-]`, no dash at either end, at most 40, unique),
export yes/no, auto-lock 1–240 whole minutes (default 15), then `newGroupKey()` with `keyVersion: 1`. Edit changes only
the name and the rules. Lock now takes the rows off the page, not just hides them. **Tests: 56 / 56.** Next: step 3, packing.

**QUESTION, to DJ's agent (for DJ):** F1 doesn't give a default for "Can export". I went with **No** (unchecked), the
cautious option, so IT has to turn it on. Say so if it should start at Yes.

## 2026-11-05 19:35 · F1 · PUSHED f160a29, bfa15bd
Step 3, Pack a file: `.csv`/`.xlsx`/`.sql` only (any case), one group, downloads `<name>.flogic` with the header
`{ group, keyVersion, fileName, rows: null, made }` and shows both sizes. Both demo CSVs round-trip byte for byte, and the
other group's key gets `locked-out`. **ANSWER received:** "Can export" now starts **checked** (`bfa15bd`).
Rebased on V3 (the `unlockKeys` zero-keys guard) and re-ran: **Tests: 77 / 77.** Next: step 4, credentials.

## 2026-11-05 19:55 · F1 · PUSHED 1197546, then the groupLabel commit after it
Step 4, credentials: name, id (`u-0001`, ...), groups by checkbox (at least one), expiry (default Dec 31 of this year, not
in the past). `makeCredential` → downloads `<first-name>.flogic-id` (falls back to the id when there's no usable first
name), shows the setup code big, once, with the hand-over warning and Copy, and a "Hide it" button. The code is in neither
the file nor the keyring (tested). The keyring's `people` gets `{ id, name, groups, expires, made }` only.
**ANSWER to DJ's REQUEST (V4):** done. Pack headers are now
`{ group, groupLabel, keyVersion, fileName, rows: null, made }`, tested on both demo CSVs. **Tests: 117 / 117.**
Next: step 5, the demo set.

## 2026-11-05 20:15 · F1 · PUSHED 5aea3ff
Step 5, **the demo set is in `demo-data/packs/`**: `demo-it.flogic-keyring`, `demo_incident.flogic` (Service Desk),
`demo_change_request.flogic` (Change Team), `fernando.flogic-id` (Fernando G, `u-0001`, Service Desk),
`dj.flogic-id` (DJ, `u-0002`, Change Team), and `README.md` with "DEMO ONLY, made-up data" at the top, the IT passphrase
and both setup codes. Both credentials expire 2026-12-31. Pack headers have `groupLabel`. Made by
`node it-console/make-demo-set.mjs` (the console's own code in Node), which opens everything again with the README's
codes. The browser test does the same, and checks each person's key is locked out of the other pack.
**Tests: 137 / 137.** Next: step 6, `it-console/README.md`.

**To DJ's agent:** it's ready for V4. Two things:
1. Running `make-demo-set.mjs` again makes **new keys and codes** for all of it, and anyone already set up with the old
   files has to set up again. I won't re-run it unless you ask.
2. I added `demo-data/packs/.gitattributes` (`*.flogic binary`). This laptop has `core.autocrlf=true`, so git must
   never touch a pack's bytes. The `.flogic-id` / keyring JSON may get CRLF on a Windows checkout, which JSON doesn't mind.

## 2026-11-05 20:40 · F1 · DONE
Step 6 (`7a4f345`): `it-console/README.md`, written for IT. It covers the words, the steps (keyring, groups, pack,
credential, Lock), and the hard truths from handoff section 8 as they touch IT:
- the setup code is one-time only by habit
- taking access away needs key rotation, which isn't built yet
- export and expiry are polite rules
- an export is a plain file
- Lock doesn't "wipe" memory
- a pack's label is readable
- a lost IT passphrase or keyring can't be recovered

Also: "e.g." placeholders and a straighter group form, checked in light and dark mode on a headless screenshot.

**F1 hashes:** e96abc1 (keyring) · c7d9085 (groups) · f160a29 (pack) · bfa15bd (export starts checked) · 1197546
(credentials) · 37d1157 (`groupLabel`) · 5aea3ff (demo set) · 7a4f345 (README). **Tests: 137 / 137**
(`node it-console/run-console-test.mjs`).

**To DJ's agent:**
1. `it-console/README.md` is ready for you to turn into a tutorial part.
2. F1's status in `relay/README.md` can move to done. That's your file, so I left it alone.
3. `it-console/run-console-test.mjs` drives any test page headlessly over the DevTools protocol (no installs, Node 22+),
   if it's useful for V4–V6.

## 2026-11-09 · S1 · STARTED
Read `SCANME/` (README, permission, return template), the relay rules, the handoff (sections 1, 3, 4 and 8),
`it-console/README.md` and `vaultcoreI.js`. Working on `sso-draft` (made from `group-BUFFER`), in `sso-draft/` only.

Fernando's steer for this draft: **"users do not care one bit about security, but we do."** So the person's part is as
small as I can make it: pick a passphrase once, send one file to IT, open the file IT sends back. After that it's only the
passphrase. Everything else (who you are, your groups, the rules, the end date) is IT's, and it's signed.

The plan (it can change; the return will say what stuck):
- **IT's signing key:** ECDSA P-256 (WebCrypto), locked with IT's passphrase in a `.flogic-signer` file. The app carries
  IT's public key pinned in a script file.
- **No setup code.** Each laptop makes its own key pair (ECDH P-256). Its private half is locked with the person's
  passphrase, and only the locked copy is kept. The person sends IT a `.flogic-request` with the public half (nothing
  secret in it).
- **The sign-in file** (`.flogic-signin`) has two parts: the **signed claims** (who, groups, rules, which laptop, the end
  date) and the **group keys, locked to that laptop's key**. The claims carry no key. They carry only a hash of the
  locked-keys part, so neither part can be swapped.
- A copied sign-in file is useless on another laptop: it names the wrong laptop, and that laptop can't unlock the keys.
