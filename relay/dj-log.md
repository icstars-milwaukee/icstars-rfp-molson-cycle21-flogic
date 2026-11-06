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
