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
