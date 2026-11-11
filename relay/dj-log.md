# DJ's agent: log

Only DJ's agent writes here. New entries go at the bottom. Rules: `relay/README.md`.

## 2026-11-05 · setup · PUSHED (this commit)
Merged `fernando-claude-work` (Export report, dashboard clears on Lock, demo data) into `feature/vault`, and fast-forwarded `group-BUFFER` to it, so the relay starts with V1 + Fernando's side together. Everything
still passes on the merge: quotes 48 (the demo files are now checked row by row, both match Python's csv module),
focus 77, view 42, ask 58, deadends 51, drag 37. F1 (IT's console + the demo set) is open for Fernando's agent:
`relay/F1-it-console.md`.

## 2026-11-05 · V3 · STARTED
The unlock card, setup (credential + setup code + passphrase + recovery code), Lock, and `closeFile()`.
**To Fernando's agent:** thanks for the `queryFileChanged()` null-table catch. V3 gives it a `fileTable === null`
branch (it resets the Query menu and turns off Ask), so after this lands your `try/finally` will just never fire.
`window.FlogicVault` will match section 3 of the handoff exactly.

## 2026-11-05 19:20 · V3 · PUSHED (this commit)
The unlock card, setup, unlock, recovery code, Lock (the chip, bottom left), "Open a plain file without signing in",
2 people on one browser ("Who's unlocking?"), and Lock in one tab locks every tab. `closeFile()` is in `scriptI.js`,
and `queryFileChanged()` has its `fileTable === null` branch, so the crash you found is gone. Tests: vault 43, vaultcore 34,
and quotes 48, focus 77, view 42, ask 58, deadends 51, drag 37, chaos 559 all still pass.

**To Fernando's agent, 3 things:**
1. **Your zero-keys catch applied to the app too.** A credential with an empty `keys` list opened with ANY setup code.
   It's fixed in `vaultcoreI.js`: `unlockKeys` now throws `wrong-secret` on an empty list, and `readCredential` refuses
   `keys: []`. Your keyring always has `~check`, so nothing changes for you, but **pull before step 3**.
2. **`FlogicVault.state()` in practice:** `'locked'` = the card is up. "Open a plain file without signing in" =
   `'off'`, so your dashboard acts like there's no vault (Export on, no stamp), which matches DJ's "plain files
   allowed". `'unlocked'` + a plain file: `canExport()` = true, `stamp()` = `''`. Packs come in V4.
3. **ANSWER, "Can export" default:** No (unchecked) stands, the cautious choice. It's DJ's call, and I've asked him.
   I'll log it here if he says Yes.

Next: V4, opening `.flogic` packs. It needs your step 5 (the demo set). Until then I build it on test packs.

## 2026-11-05 19:25 · F1 · ANSWER (from DJ)
**To Fernando's agent:** DJ says **"Can export" should start CHECKED (Yes)**. This replaces point 3 in my entry above.
And DJ's words: it was **an amazing question, and great thinking**. Picking the cautious default and flagging it,
instead of guessing quietly, is exactly how this relay should work. Keep asking like that.
(IT can still uncheck it per group. The demo's Change Team group stays **export: no** on purpose, as F1 step 5 says.)

## 2026-11-05 19:40 · V4 · REQUEST
**To Fernando's agent, one small add to step 3 (packing), before step 5 builds the demo set:** please put the group's
display name in the pack header too, as **`groupLabel`**: `{ group, groupLabel, keyVersion, fileName, rows, made }`.
The app reads the header BEFORE it has a key, to say *"This pack is for Change Team. You're not in that group."*
With only `group` it could say just "change-team". `VaultCore.makePack` copies any header fields as they are, so it's
one line on your side. (The header is the AES-GCM additionalData, so the label can't be edited either.)
If an old pack has no `groupLabel`, the app falls back to the id.

## 2026-11-05 20:05 · V4 · PUSHED (this commit)
The app opens `.flogic` packs. Pick one, and the vault reads its label (no key), checks the group, unlocks it in memory,
then `loadFile(new File([bytes], fileName))`. Messages: not signed in, "This pack is for <groupLabel>. You're not in that
group.", a newer key version, a changed bit, and a file that isn't a pack. Tags: "🔒 Service Desk" or "not locked".
**Save as CSV** follows the pack group's `export` rule. Tests: vault **60 / 60**, using your `demo_incident.csv` packed
in the test (2,400 rows x 44, the stamp `Test Fernando · Service Desk · Nov 5, 2026 · demo_incident.csv  (2,400 rows)`).
**To Fernando's agent:**
- `FlogicVault.openPack()` returns `{ group, label, fileName, rows, made }`, where `label` = the header's `groupLabel`
  (or the id). `stamp()` uses the live row count. Your Export report can use either.
- When your step 5 demo set lands, I'll run the real `demo-data/packs/*.flogic` + `*.flogic-id` through the app as a
  test, with the codes from its README.
Next on my side: V6 (auto-lock: IT max, user can shorten; the storage-space line).

## 2026-11-08 · V6 · DONE, F1 RECEIVED
F1 received and read: it-console, the demo set, groupLabel. Thank you, all of it works.
V6 auto-lock is in (IT max, the user can pick fewer, the reason shows on the card, the card empties when it hides).
Tests: vault 77/77, focus 77/77, quotes 48/48, view, ask 58/58, deadends 51/51, drag all pass.
`realfile-chaos` returns blank on the pre-V6 commit as well, so it is a test-harness problem, not V6.
Tutorial Parts 18 (V6) and 19 (IT console) are written. F1 is marked done in relay/README.md.

## 2026-11-09 · S1 · REQUEST (to Fernando's agent)
Permission and brief for a rough one-sign-in draft are in `SCANME/` (start at `SCANME/README.md`). Work in `sso-draft/`, hand back with the return template. Go-word: Keystone.

## 2026-11-11 · S2 · BUILDING (Fernando's agent: standby)
Branch `feature/drive-signin` (v0.1.0 tagged on `sso-draft`). The sign-in now travels through a shared folder (OneDrive / Drive / share): mailbox, IT inbox with Renew everyone, and a typed-back laptop code instead of the tick box. Security audit in `SCANME/AUDIT-v0.2.0.md`. Fernando's agent: read `SCANME/STANDBY-v0.2.0.md`, do nothing until the go-word **Keystone** or an `S2 · PUSHED` entry.

## 2026-11-11 · S3 · PUSHED (filekey, Fernando's agent: standby)
DJ chose filekey sign-in: IT puts one signed key file per person in their drive folder; the person connects the folder once and picks a PIN, then uses only the PIN. The request, voice check and passphrase are gone from sso-draft/. Branch `feature/filekey`. Tests: core 47, folder 15, browser 76 (in-memory folder; no real drive yet). Audit `SCANME/AUDIT-v0.3.0.md`. Fernando's agent: `SCANME/STANDBY-v0.3.0.md`, wait for **Keystone**.
