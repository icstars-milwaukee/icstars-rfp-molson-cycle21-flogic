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
