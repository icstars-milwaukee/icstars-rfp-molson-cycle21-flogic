# F1: IT's console (V2) and the demo set

**For:** Fernando's agent. **From:** DJ's agent, Nov 5, 2026. **Branch:** `group-BUFFER`.
**Read first:** `relay/README.md` (the rules), then `roaches/access-and-encryption-handoff.md` (sections 1–4 and 8),
then `DIRECTORY/vaultcoreI.js` (the whole file, it's short).
**Target:** Nov 8. Commit and push at each step below, and log each push in `relay/fernando-log.md`.

---

## What it is

A page that plays **Molson's IT department** for the demo. IT uses it to make access groups, lock data files for a
group (data packs, `.flogic`), and make each person's credential file (`.flogic-id`) and setup code. It never ships
to users: it lives in its own top-level folder.

## Files (yours)

| File | What |
|---|---|
| `it-console/it-console.html` | The page. Loads `../DIRECTORY/vaultcoreI.js`, then `itconsoleI.js`. |
| `it-console/itconsoleI.js` | Its brain |
| `it-console/itconsoleI.css` | Its clothes. Plain and clear. Light, with a dark mode by `prefers-color-scheme`. |
| `it-console/README.md` | How IT uses it, written for a person. DJ's agent turns it into a tutorial part later. |
| `it-console/console-test.html` | A headless test page (section "Tests") |
| `demo-data/packs/*` | The demo set (step 5) |

**Don't edit anything in `DIRECTORY/`.** It's DJ's side (except `dashI.*`). If `vaultcoreI.js` is missing something,
write a `REQUEST` in your log. The API below should be all you need.

## The VaultCore you get (already built, 32/32 tests)

```text
VaultCore.newGroupKey()                                   -> CryptoKey (AES-GCM 256, extractable: true)
VaultCore.makeCredential(person, keys)                    -> { credential (object to save as JSON), setupCode }
     person = { id, name, expires, groups: [{ group, label, rules: { export, autoLockMin } }] }
     keys   = [{ group, keyVersion, key }]
VaultCore.readCredential(textOrObject)                    -> the credential (checks its shape),  or throws
VaultCore.openCredential(credential, setupCode)           -> [{ group, keyVersion, key }]   (for your tests)
VaultCore.makePack(fileBytes, header, groupKey)           -> Uint8Array   (header = { group, keyVersion, fileName, rows, made })
VaultCore.readPackHeader(bytes)                           -> { header, ... }   (no key needed)
VaultCore.openPack(bytes, groupKey)                       -> ArrayBuffer   (for your tests)
VaultCore.lockKeys(personId, keys, secret)                -> { salt, rounds, keys: [...] }   (locked)
VaultCore.unlockKeys(personId, locked, secret, extractable) -> [{ group, keyVersion, key }]
VaultCore.makeCode(n), normalizeCode(text), formatCode(text), passphraseProblem(text)
```

Errors have a `.code`: `wrong-secret`, `not-a-pack`, `not-a-credential`, `bad-version`, `locked-out`.
**Codes must go through `normalizeCode` before they lock or unlock anything.** `makeCredential` and
`openCredential` already do this. Passphrases are never normalized.

---

## Steps

### 1. The IT keyring (open or new)

IT's group keys have to outlive one browser session, but the console **never uses IndexedDB or localStorage**:
nothing is saved in the browser. Instead, IT keeps a **keyring file**, locked with an IT passphrase:

```json
{ "flogic": "keyring", "v": 1,
  "groups": [ { "group": "service-desk", "label": "Service Desk", "keyVersion": 1,
                "rules": { "export": true, "autoLockMin": 15 } } ],
  "people": [ { "id": "u-0001", "name": "Fernando G", "groups": ["service-desk"], "expires": "2026-12-31", "made": "2026-11-05" } ],
  "locked": <VaultCore.lockKeys('it-keyring', [all group keys], itPassphrase)> }
```

- **The first screen:** "Open keyring" (pick the file, type the IT passphrase), or "New keyring" (pick an IT passphrase,
  which must pass `passphraseProblem`, and type it twice).
- Open it with `unlockKeys('it-keyring', locked, passphrase, true)` (`true` = extractable, so the keys can be locked
  again for credentials). A wrong passphrase says so, and shows nothing.
- "Save keyring" downloads it again (Blob + `<a download>`) whenever groups or people change. Show a small "unsaved changes"
  mark until it's saved.

### 2. Groups

Make a group: a label ("Service Desk"), its id (a slug made from the label, editable, `[a-z0-9-]` only, unique), its
rules (`export` yes/no, `autoLockMin` = the max idle minutes, 1–240, default 15), then `newGroupKey()`, `keyVersion: 1`.
List the groups with their rules. Editing a group's rules is OK, and so is its label. Never change its id or key.
(Key rotation is "Nice", not now.)

### 3. Pack a file

Pick a file (`.csv`, `.xlsx`, `.sql`), pick a group, then click Pack and download `<name>.flogic`.
Header: `{ group, keyVersion, fileName: the original name, rows: null, made: 'YYYY-MM-DD' }`. (`rows: null`: the
console has no reader. The app counts the rows after it opens the pack.) Show the size before and after.

### 4. A person's credential

Name, id (auto: `u-0001`, `u-0002`, ... unique in the keyring), groups (checkboxes, at least one), and an expiry date
(default: Dec 31 of this year). `makeCredential(person, [their groups' keys])`, then:
- download `<first-name>.flogic-id`
- show the **setup code** big, ONCE, with: *"Give this to the person in person or over Teams, never in the same email as the file. Treat it as one-time."*
  plus a Copy button. It isn't stored anywhere (not in the keyring either). If it's lost, make a new credential.
- add the person to the keyring's `people` list (no keys, no code)

### 5. The demo set

Use the console (or the same VaultCore calls in a one-off script) to make, in `demo-data/packs/`:

| File | What |
|---|---|
| `demo-it.flogic-keyring` | Groups **Service Desk** (`service-desk`, export yes, 15 min) and **Change Team** (`change-team`, export **no**, 10 min) |
| `demo_incident.flogic` | `demo-data/demo_incident.csv`, packed for Service Desk |
| `demo_change_request.flogic` | `demo-data/demo_change_request.csv`, packed for Change Team |
| `fernando.flogic-id` | Fernando G, Service Desk |
| `dj.flogic-id` | DJ, Change Team |
| `README.md` | The IT passphrase and both setup codes, **with "DEMO ONLY, made-up data"** at the top. (Safe only because everything in this folder is fake.) |

The export rules differ on purpose: the demo shows one group that can export and one that can't.

### 6. Its README

`it-console/README.md`: what IT does, step by step, and the "hard truths" from the handoff (section 8) that IT should
know. The setup code is one-time only by habit: nothing can enforce it without a server.

---

## Rules for this page

- **No network, no outside code, no fonts from the internet.** Only `vaultcoreI.js` and its own two files.
- Anything from a file or a person goes on the page with `textContent`, never `innerHTML`.
- Downloads: `URL.createObjectURL(new Blob(...))`, then `revokeObjectURL` afterward.
- Keys only in variables. A **Lock** button (and closing the tab) forgets them all.
- Plain words on the page, like the app: "Pack a file", not "Encrypt artifact".

## Tests (`it-console/console-test.html`, headless, `file://`)

At least:
- New keyring: save, then open it again with the passphrase (OK) and a wrong one (refused).
- A group: the slug rule, no duplicate ids.
- Pack the demo CSV: `readPackHeader` shows the right group and file name; `openPack` with the group key gives the exact same bytes.
- Credential: `openCredential` with the shown setup code gives exactly the person's groups (not the others).
  The setup code is not in the downloaded file or in the keyring.
- The demo set in `demo-data/packs/` opens with the codes in its README (round trip through VaultCore).
- No `fetch`/`XMLHttpRequest` in `itconsoleI.js`; nothing in IndexedDB or localStorage afterward.

Log the pass count in `relay/fernando-log.md` with each `PUSHED`.

## When you're done

Log `DONE` with the hashes and the test count. DJ's agent will then build V4 (the app opens `demo-data/packs/*.flogic`)
on top of your demo set.
