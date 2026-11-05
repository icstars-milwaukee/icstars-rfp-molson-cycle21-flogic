# Login, saving and encryption: the handoff (DJ → Fernando)

**From:** DJ and DJ's agent, Nov 5, 2026
**Answers:** `access-and-encryption.md`, which is now answered (section 11, the `DJ:` lines). This file is the build plan that comes out of it.
**Branch:** `feature/vault`, made from `fix/stray-quotes` (which already holds focus mode, the dashboard, and the stray-quote fix).
**Freeze:** Nov 16. **Demo:** Nov 19.

---

## 1. What DJ decided

| # | Question | Decision | What changes from the talk doc |
|---|---|---|---|
| 1 | Options | **A + B for the freeze.** C (signatures) only if there's time. | Nothing |
| 2 | What the vault holds | **Keys only.** The vault holds each person's *locked* group keys plus their name, groups and rules. **Data packs are never stored.** They're opened from disk every time and live in memory only. | **`keepPacks` is dropped.** It's not a rule, and it's not "Nice". This keeps the zero-trust pitch true: *"No data is ever saved. The browser only keeps locked keys."* (`local-security-recommendations.md` rule #1) |
| 3 | Plain files after sign-in | **Allowed, marked "unlocked".** Plain CSV/XLSX/SQL still open (demo mode), with a visible tag saying it isn't a locked pack. | Before sign-in too: the unlock card has "Open a plain file without signing in". |
| 4 | Export | **The report AND rows, both gated.** The new dashboard **Export report** and the existing Query menu **Save as CSV** both follow the group's `export` rule while a pack is open. Both say "This file isn't locked." Plain files aren't gated, since they're the user's own file. | Save as CSV gets the gate too |
| 5 | Auto-lock | **IT sets the maximum, and the user can pick shorter.** `rules.autoLockMin` = the max. The user's choice (≤ max) is kept in the vault as a preference. The Lock button is always there. | Nothing |
| 6 | IT console | **Its own top-level folder: `it-console/`.** It never ships inside `DIRECTORY/`. | Nothing |
| 7 | Pack format | **A JSON header plus raw bytes** (section 4). No base64 for the data. | Nothing |
| 8 | Recovery code to IT | **No IT copy.** IT reissues the credential file instead. | Nothing |
| 9 | Branch | `feature/vault` off `fix/stray-quotes` | Not off `dev`: `dev` doesn't have the dashboard yet |
| 10 | Login look | **A full-screen unlock card**, shown before the app | Once signed in, a small "🔒 Lock · name · group" chip |
| — | One instance per browser | **One person at a time. Switching = Lock, then unlock as another person.** The vault keeps one *locked* record per person who has set up, so Fernando and DJ can both use the demo laptop. | The card shows "Who's unlocking?" when the vault holds more than one person |

---

## 2. Files

| File | Who | What |
|---|---|---|
| `DIRECTORY/vaultcoreI.js` | DJ | **Crypto and file formats only.** No DOM, no IndexedDB. The app and the IT console both load it. It's tested on its own. |
| `DIRECTORY/vaultI.js` + `vaultI.css` | DJ | The app side: the unlock card, setup, Lock, the vault (IndexedDB `flogic-vault`), opening packs, the export gate, auto-lock, tab sync |
| `it-console/it-console.html` + `itconsoleI.js` | DJ | IT's tool: make groups, pack files, make credential files and setup codes. Loads `../DIRECTORY/vaultcoreI.js`. |
| `DIRECTORY/scriptI.js` | DJ | **One small addition: `closeFile()`.** Lock has to clear the open file, and nothing can do that today. It empties the sheet, the search and the query table, and calls `queryFileChanged()` so the dashboard clears too. |
| `DIRECTORY/dashI.js` | **Fernando** | The **Export report** button and page (section 5) |
| `DIRECTORY/testI.html` | DJ | Loads `vaultcoreI.js` and `vaultI.js` after `dashI.js`, plus `vaultI.css` |

Load order: `xlsxI.js, sqlI.js, queryI.js, scriptI.js, dashI.js, vaultcoreI.js, vaultI.js`.

---

## 3. The one shared name: `window.FlogicVault`

All the files share one global scope. Twice now, a new function silently replaced an old one with the same name (`showMatches`, and a test's `loadFile`). So the vault puts **one** object on `window`, and nothing else:

```js
window.FlogicVault = {
    state(),        //  'off' (no vault, e.g. a renamed point)  |  'locked'  |  'unlocked'
    person(),       //  null, or { id, name, groups: [{ group, label, rules }] }
    openPack(),     //  null (a plain file or nothing open), or { group, label, fileName, rows, made }
    canExport(),    //  true for a plain file;  for a pack, the group's  rules.export
    stamp(),        //  'Fernando G · Service Desk · Nov 19, 2026 · incident.csv (23,334 rows)'   ('' for a plain file)
    onChange(fn),   //  fn() runs after unlock, lock, and every pack or plain file that opens
};
```

The dashboard only ever *reads* this. If `window.FlogicVault` is missing, the dashboard works the way it does today, with no export gate and no stamp.

`vaultI.js` checks its own plug points like `DASH_NEEDS` does: `loadFile`, `closeFile`, `queryFileChanged`, `queryExport`. If one is missing, it logs a console warning and stays `'off'`.

---

## 4. Formats (v1)

**Codes.** The alphabet is `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 symbols, with no 0/O, 1/I/L), shown in groups of 5.
- **Recovery code:** 25 symbols, about 124 bits.
- **Setup code:** 15 symbols, about 74 bits. It's one-time, and slowed down by PBKDF2.
- When codes are typed, spaces and dashes are ignored, and lowercase becomes uppercase.

**Passphrase:** at least 12 characters, or 4 words. The only brake on guessing is PBKDF2's cost: an attempt limit can't be enforced without a server, and the unlock screen won't pretend otherwise.

**Key from a code or passphrase:**
- PBKDF2-SHA256, 600,000 rounds, a fresh 16-byte salt each time.
- The result is an AES-GCM-256 key that can only `wrapKey`/`unwrapKey`, with `extractable: false`.

**Group key:** AES-GCM-256.
- **At setup:** unwrapped as extractable, so it can be wrapped again twice (by the passphrase and by the recovery code). Then it's forgotten.
- **At unlock:** unwrapped as `extractable: false`.

**Wrapping:**
- `wrapKey('raw', groupKey, kek, { name: 'AES-GCM', iv, additionalData })` with a fresh 12-byte IV.
- `additionalData` = the UTF-8 of `personId + '|' + group + '|' + keyVersion`, so a wrapped key copied onto another person or group won't open.
- A wrong passphrase makes `unwrapKey` throw: that's the "wrong passphrase" check.

**Credential file** `name.flogic-id`: small JSON, base64 is fine here.

```json
{ "flogic": "credential", "v": 1, "id": "u-0003", "name": "Fernando G",
  "groups": [ { "group": "service-desk", "label": "Service Desk", "rules": { "export": true, "autoLockMin": 15 } } ],
  "expires": "2026-12-31",
  "setup": { "salt": "<b64>", "rounds": 600000 },
  "keys": [ { "group": "service-desk", "keyVersion": 1, "iv": "<b64>", "wrapped": "<b64>" } ] }
```

**Data pack** `name.flogic`: binary, so a 95 MB file never becomes a 127 MB base64 string.

```text
 bytes 0–7      "FLGPACK1"                       (ASCII:  the kind + the version)
 bytes 8–11     N, the header's length           (uint32, big-endian)
 next N bytes   the header, as JSON (UTF-8):     { "group": "service-desk", "keyVersion": 1,
                                                   "fileName": "incident.csv", "rows": 23334, "made": "2026-11-05" }
 next 12 bytes  the IV
 the rest       AES-GCM ciphertext + its 16-byte tag
```

The first `12 + N` bytes are the AES-GCM `additionalData`. Editing the label (say, the group) breaks the decrypt. The app reads the header *before* decrypting, so it can say "This pack is for Change Team. You're not in that group." without trying the key.

**The vault:** IndexedDB `flogic-vault`, store `people`, keyPath `id`, one record per person who has set up:

```json
{ "id": "u-0003", "name": "Fernando G", "groups": [ ...same as the credential... ], "expires": "2026-12-31",
  "prefs": { "autoLockMin": 10 },
  "byPassphrase": { "salt": "<b64>", "rounds": 600000, "keys": [ { "group", "keyVersion", "iv", "wrapped" } ] },
  "byRecovery":   { "salt": "<b64>", "rounds": 600000, "keys": [ ... ] } }
```

Only **locked** keys are stored, never data, never a passphrase or code, and never an unlocked key. The name, groups and rules are stored readable, so the card can show "Who's unlocking?". That means someone at the computer can see *who* has set up and *which groups* they're in, but not any data.

---

## 5. What we need from Fernando's side

1. **The Export report, in `dashI.js`.** A button on the dashboard's top line:
   - **The page:** a printable page with the tiles as a clean layout, plus a small CSV of the tile numbers. Both are stamped with `FlogicVault.stamp()`, and both say *"This file isn't locked. Share it like any work document."*
   - **The gate:** disabled with a reason ("Your group can't export") when `FlogicVault.canExport()` is false.
   - **Staying current:** re-check on `FlogicVault.onChange`.
   - **With no `FlogicVault`:** the button still works, just with no stamp.
2. **A clear dashboard on Lock.** `closeFile()` calls `queryFileChanged()` with no file open. Please check that the dashboard empties cleanly on that call. If it needs a different signal, tell us which.
3. **Demo data for the packs.** Made-up incident and change CSVs, shaped like the real ones. The real Molson files stay on our own laptops. They're never put in the repo or shown to an AI.
4. **The real-laptop checklist** (section 7), on your machine as well as DJ's.
5. **Keep working on `feature/dashboard`.** We'll merge it into `feature/vault` when it's ready. Tell us if you'd rather work on `feature/vault` directly.

---

## 6. Build order (DJ's side), each step tested, committed and pushed

| # | Step | Target | Test |
|---|---|---|---|
| V1 | `vaultcoreI.js`: codes, PBKDF2, wrap/unwrap, credential files, pack files, the header as AAD | Nov 6 | `realfile-vaultcore`: round trips, wrong passphrase, swapped key, edited header, a 95 MB pack's timing |
| V2 | The IT console: groups, pack a file, credential file + setup code | Nov 7–8 | Make the demo set; open it with V1 |
| V3 | The app: the unlock card, setup (credential → setup code → passphrase → recovery code, "I wrote it down"), unlock, recovery unlock, Lock, `closeFile()` | Nov 9–10 | `realfile-vault`: the full setup and lock flow, nothing readable in IndexedDB |
| V4 | Opening packs → `loadFile(new File([bytes], fileName), null)`; "not your group"; the "unlocked" tag on plain files; expiry (a polite rule) | Nov 11 | Both demo packs, the wrong group, an edited pack |
| V5 | The export gate on Save as CSV; `FlogicVault` for the dashboard's report (needs section 5.1) | Nov 12–13 | Gated and allowed groups, the stamp's text |
| V6 | Auto-lock (IT max, user shorter); `BroadcastChannel('flogic-vault')`, so locking one tab locks every tab; the storage-space line | Nov 14–15 | Two tabs; the idle timer |
| — | **Freeze** | Nov 16 | Section 7 on real laptops |

If it gets tight, cut V6 first (auto-lock and two tabs). Lock stays.

---

## 7. Real-laptop checklist (Chrome or Edge, opened as `file://`)

- [ ] Set up, close Chrome completely, reopen the page: the person is still there, and the passphrase unlocks.
- [ ] Wrong passphrase: refused, no data shown. Recovery code: unlocks.
- [ ] DevTools → Application → IndexedDB → `flogic-vault`: only locked keys and names. No rows.
- [ ] Open `change_request.flogic` as the Service Desk person: "This pack is for Change Team."
- [ ] Lock: the sheet and dashboard are empty. Unlock takes under a second.
- [ ] `navigator.storage.estimate()`: write down the number.
- [ ] Firefox: say "Chrome or Edge only" in the demo, don't fix it.

---

## 8. Honest claims for the presentation

- **Can say:**
  - "No data is ever saved. The browser keeps only locked keys."
  - "Without a group's key, that group's data can't be opened. That's math, not a setting."
  - "Lock removes the keys and the open file from the page."
  - "No network, no outside code."
- **Can't say:**
  - "Can't be bypassed": the export and expiry rules are polite rules without Option C, and even with C, DevTools can skip them.
  - "Wiped from memory": the browser frees memory when it chooses.
  - "Safe after export": an exported file is plain on purpose.
- **This is a prototype of what Entra ID would do.** The IT console plays Molson IT's part.
