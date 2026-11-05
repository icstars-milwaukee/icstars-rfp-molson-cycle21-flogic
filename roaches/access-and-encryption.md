# Login, saving and encryption: a talk doc for DJ (and DJ's agent)

**Started:** Nov 5, 2026, by Fernando (PM/BA), with Claude
**Status:** ANSWERED by DJ (Nov 5). The build plan is `access-and-encryption-handoff.md`. One change: **`keepPacks` is dropped**, so the vault holds locked keys only and never data. DJ and DJ's agent write the code (a new file, e.g. `DIRECTORY/vaultI.js`).
**Deadline:** feature freeze Nov 16, final presentation Nov 19.

**How to use this file:** read it top to bottom, then answer the questions in section 11 right under each one
(`DJ:` lines). Cross out what we drop. When we agree, this file becomes the build plan for `vaultI.js`.
It goes in `roaches/` because it's a team talk, not finished docs.

---

## 1. What DJ decided (Nov 5)

DJ's words:

> saving shouldnt be opt-in or automatic, trust should be managed by a centeral IT department distributing
> access groups with of course, saving the report that NEEDS to be exported, which should be much more human
> friendly and intuitive with the new dash., and one INSTANCE per browser, depending on credentials, i'd say we
> want keys to credentials. mhm, a recovery code that is noted to be "write this down and keep it safe or in
> your phone" or hand a copy to your it department type thing. And i'd say lock should be an option

What that means for the build:

| # | DJ said | What we'd build |
|---|---|---|
| 1 | Saving isn't opt-in or automatic | **IT decides.** Each access group comes with its own rules (can this group keep data in the browser? export?). The user doesn't get a "remember me" checkbox. |
| 2 | Trust is managed by a central IT department, through access groups | IT hands out **keys**, not passwords. Each group has a key. Your credential file holds the keys for your groups. |
| 3 | Saving = the report that NEEDS to be exported, made human friendly by the new dashboard | An **Export report** button on the dashboard: the tiles as a clean printable page and a small CSV of the numbers, stamped with who, which group, when, and which file. |
| 4 | One instance per browser, depending on credentials | One vault per browser. One person signed in at a time. Switching people = lock, then unlock with other credentials. |
| 5 | Keys to credentials | Your passphrase unlocks your credential, and your credential unlocks your groups' keys. Data is locked with group keys. |
| 6 | Recovery code: "write this down and keep it safe or in your phone", or hand a copy to IT | Shown once at setup with exactly that note. IT doesn't need a copy, because IT can always issue a fresh credential file (section 5). |
| 7 | Lock should be an option | A **Lock** button that's always there, plus an optional auto-lock after so many idle minutes (IT can set it per group). |
| 8 | A new JS file, by DJ and DJ's agent | `vaultI.js`. This doc has no JS on purpose, only the plan and the file shapes. |

---

## 2. What we already proved (the spike, Nov 5)

A throwaway test page opened as `file://` in headless Chromium (not in the repo):

| Check | Result |
|---|---|
| `window.isSecureContext` on `file://` | `true`, so WebCrypto (`crypto.subtle`) works |
| PBKDF2-SHA256, 600,000 rounds (turn a passphrase into a key) | about 0.3 s |
| AES-GCM 256: encrypt 95 MB (the size of `incident.csv`) | about 0.5 s |
| Save that to IndexedDB | about 0.15 s |
| Unlock + decrypt it again | about 0.5 s |
| Wrong passphrase | refused (unwrap fails, no data comes out) |

**Not proven yet:** whether the vault survives a full Chrome restart on `file://` (it should, but we have to try it
on a real laptop), and how much room Chrome actually gives us. `navigator.storage.estimate()` will say.

---

## 3. The hard truths (put these in the presentation too)

1. **Every local HTML page shares one `file://` "origin".** Any other `.html` file someone opens from their computer
   can read the same IndexedDB. That's why everything in the vault **must** be encrypted. Never put plain data,
   plain keys or the passphrase in it.
2. **There's no server, so the app can't truly *forbid* anything.** Someone with DevTools can change the JavaScript.
   A rule like "Service Desk can't export" is only a polite rule. What *can't* be bypassed is math:
   **if you don't have a group's key, you can't open that group's data.** So real access control = encrypting the data
   per group (Option B below).
3. **An exported report is plain on purpose.** Once you export, the file leaves the vault's protection. The Export
   button should say so ("This file isn't locked. Share it like any work document.").
4. **Encryption protects data at rest:** a lost laptop, another web page, someone poking around the browser.
   It doesn't protect against the signed-in person copying what's on their own screen.
5. **This is a prototype of what Entra ID would do for real.** In production, Molson's IT would hand out group access
   through Entra ID (see the SSO audit doc). Our "IT console" plays Entra's role for the demo.

---

## 4. The words we'll use

| Word | What it is |
|---|---|
| **Access group** | A team that sees the same data, e.g. "Service Desk" or "Change Team". IT makes these. |
| **Group key** | A random 256-bit AES key, one per group. Only IT makes them. |
| **Data pack** | A data file (like `incident.csv`) that IT encrypted with one group's key. Ends in `.flogic`. |
| **Credential file** | One person's "badge": their name, their groups, the rules, and their groups' keys, locked. Ends in `.flogic-id`. |
| **Setup code** | A one-time code IT gives the person (in person or over Teams) to open the credential file the first time. |
| **Passphrase** | What the person picks at setup and types to unlock. At least 4 words or 12 characters. |
| **Recovery code** | Shown once at setup. A second way to unlock if the passphrase is forgotten. |
| **Vault** | The IndexedDB database in this browser. It only ever holds locked things. |
| **Lock** | Forget the keys and the open data from memory. The vault stays. |

---

## 5. The options

### Option A: credential files ("keys to credentials")

IT makes a credential file per person. Inside: name, groups, rules, an expiry date, and the group keys
**wrapped** (locked) with a key made from the one-time setup code.

First time (setup):

1. The person opens the app and picks their `.flogic-id` file.
2. The person types the setup code IT gave them. The app unlocks the group keys.
3. The person picks a passphrase. The app re-locks the group keys with the passphrase, and **again** with a new
   recovery code, and saves both locked copies in the vault.
4. The app shows the recovery code once: *"Write this down and keep it safe, or save it in your phone."*

Every time after: type the passphrase → unlocked.

- **Good:** simple, matches DJ's "keys to credentials" exactly.
- **Weak alone:** it decides who gets in, but if the data itself isn't locked per group, anyone signed in sees everything.
- **Forgot passphrase and recovery code?** IT makes a fresh credential file. IT already has the group keys,
  so IT *is* the backup. ("Hand a copy to your IT department" comes for free.)

### Option B: data packs per group (real access control, no server)

IT encrypts each data file with a group key. The app only opens packs whose group key you hold.
Service Desk gets `incident.flogic`. The Change Team gets `change_request.flogic`. A Service Desk person who
gets their hands on `change_request.flogic` sees "This pack is for Change Team. You're not in that group."

- **Good:** can't be bypassed with DevTools. This is the one that makes "access groups" real.
- **Cost:** IT needs a tool to make packs (the IT console page, section 8).

### Option C: IT-signed credentials (stretch)

IT signs each credential file (ECDSA P-256, built into WebCrypto). The app has IT's public key built in and refuses
edited or fake credential files, so changing your own groups or expiry date doesn't work.

- **Good:** stops tampering with the polite rules (expiry, export rule).
- **Weak:** someone who edits the JS can skip the check. Only worth it on top of A + B.

### Our pick: **A + B for Nov 16. C only if there's time.**

A gets people in. B decides what they see. Together that's DJ's "IT distributes access groups, keys to credentials".

**Taking someone out of a group (revoking):** make a new group key, re-pack that group's data with it, give fresh
credential files to everyone still in the group. The person who left still has the old pack, but no new data.
Expiry dates in the credential are polite rules (and real with Option C).

---

## 6. Where it plugs into the app (isolate-and-reuse, "point")

`vaultI.js` loads after `scriptI.js` (and after `dashI.js`), like the dashboard does. It shouldn't need to change
DJ's reader at all:

- **Opening a pack:** decrypt the bytes → make a `new File([bytes], 'incident.csv')` → call the existing
  **`loadFile(file, null)`** (`scriptI.js` line ~365). The reader already only needs `.name` and `.slice()`,
  and a `File` built in memory has both. Everything after that (sheet, query, dashboard) works the same.
- **Plain files:** decision for DJ (question 11.3). Either still allowed (a demo mode), or turned off once someone
  signs in.
- **Same guard as `dashI.js`:** if `loadFile` gets renamed, turn the vault off with a console warning instead of breaking.
- **The dashboard export** needs `dashI.js` to hand over its tiles. A small "point" like `dashTilesForExport()`, or
  `vaultI.js` reads the drawn tiles. DJ's call.
- **Rules kept:** no network, no outside code, file text only ever goes on the page as `textContent`.

---

## 7. The recipe (for DJ's agent)

Everything is in `crypto.subtle`. No libraries.

| Step | Recipe |
|---|---|
| Passphrase / setup code / recovery code → key | PBKDF2, SHA-256, **600,000** rounds, 16-byte random salt per use, → AES-GCM 256 key (`extractable: false`, usages `wrapKey`/`unwrapKey`) |
| Group key | `generateKey` AES-GCM 256. Must be `extractable: true` only so it can be wrapped. Once unwrapped in the app, import it as `extractable: false` |
| Lock a key with another key | `wrapKey('raw', …)` with AES-GCM and a fresh 12-byte IV. A wrong passphrase makes `unwrapKey` throw: that's the "wrong passphrase" check |
| Lock data | AES-GCM 256, fresh 12-byte random IV **every time**, never reused with the same key |
| Tie the label to the data | Put the pack's header (group, file name, version) in AES-GCM's `additionalData`, so changing the label breaks the decrypt |
| Recovery code | 25 random letters/digits with no look-alikes (no 0/O, 1/I/L), shown as `7KQ4M-X9WTC-...`, 5 groups of 5 |
| In memory | Keys live in variables only. **Lock** = set them to `null`, clear the open table, and send the user back to the unlock screen |

Each one decrypts in well under a second (section 2), so locking costs almost nothing.

### File shapes (JSON, every one has a version number)

Credential file `fernando.flogic-id`:

```json
{
  "flogic": "credential", "v": 1,
  "id": "u-0003", "name": "Fernando G",
  "groups": [
    { "group": "service-desk", "label": "Service Desk", "rules": { "export": true, "keepPacks": true, "autoLockMin": 15 } }
  ],
  "expires": "2026-12-31",
  "setup": { "salt": "<base64>", "rounds": 600000 },
  "keys": [ { "group": "service-desk", "iv": "<base64>", "wrapped": "<base64>" } ],
  "signature": "<base64, only with Option C>"
}
```

Data pack `incident.flogic`:

```json
{
  "flogic": "pack", "v": 1,
  "group": "service-desk", "keyVersion": 1,
  "fileName": "incident.csv", "rows": 23334, "made": "2026-11-05",
  "iv": "<base64>",
  "data": "<base64 of the encrypted file>"
}
```

(For a 95 MB file, base64 inside JSON is slow and about 33% bigger. Better: a short JSON header, a line break, then raw
encrypted bytes. DJ's agent's call.)

The vault (IndexedDB `flogic-vault`, one per browser): one `person` record (id, name, groups, rules, expiry), two locked
copies of the group keys (`byPassphrase` and `byRecovery`, each with its salt and IV), and, if the group's rule
`keepPacks` is on, the packs themselves, **still encrypted**.

---

## 8. The demo for Nov 19

An **IT console** page (`it-console.html`, a separate page, kept out of the main app) plays Molson's IT department:

1. Make two groups: **Service Desk** and **Change Team**.
2. Pack `incident.csv` for Service Desk and `change_request.csv` for the Change Team.
3. Make two credential files: Fernando (Service Desk) and DJ (Change Team), each with a setup code.

Then in the app:

1. Fernando sets up: credential file → setup code → picks a passphrase → recovery code shown ("write this down…").
2. Fernando opens `incident.flogic` → the dashboard shows 23,334 rows, P1 = 3.
3. Fernando tries `change_request.flogic` → "This pack is for Change Team."
4. **Lock** → everything's gone from the screen → passphrase → back in under a second.
5. **Export report** → a printable page stamped "Fernando G · Service Desk · Nov 19, 2026 · incident.csv (23,334 rows)".

**Use the real Molson files only on our own laptops** (same rule as always). Anything shown to an AI or put in the repo
uses the demo data or made-up IDs.

---

## 9. What fits before the freeze (Nov 16)

| Must (Nov 16) | Nice | Later / never in the prototype |
|---|---|---|
| IT console: groups, packs, credential files | Auto-lock timer | Option C signatures |
| Setup: credential + setup code + passphrase + recovery code | Keep packs in the vault (`keepPacks`) | Real Entra ID sign-in |
| Unlock / Lock | "Change my passphrase" | More than one person per browser |
| Open a pack → `loadFile` | Remove a group (key rotation) | Admin audit log |
| "Not your group" message | Show storage space used | |
| Export report from the dashboard | | |
| Tested on a real laptop: Chrome restart, wrong passphrase, recovery code | | |

That's about 9 working days. If it gets tight, the vault cut-down is: no `keepPacks`, so packs are opened from disk
every time, and only the keys live in the vault.

---

## 10. Roaches to watch for

- **The recovery code shows once.** If the page reloads before they write it down, they need IT. Add an
  "I wrote it down" checkbox before Continue.
- **A forgotten passphrase *and* lost recovery code = IT makes a new credential file.** Say so on the unlock screen.
- **A Chrome "clear browsing data"** wipes the vault. That's fine: set up again with the same credential file.
  But **setup codes should be one-time per person**, so IT may need to give a new one.
- **Big packs in IndexedDB:** a 95 MB string can run out of memory on weak laptops. Store `ArrayBuffer`/`Blob`, not base64.
- **Two tabs open:** one locks, the other is still open. A `BroadcastChannel('flogic-vault')` "lock" message fixes it
  (no network, it's local).
- **Firefox on `file://`** treats each file as its own origin and may not keep IndexedDB. Chrome/Edge only for the demo,
  and say so.
- **The merge glitch** (`roaches.md` #1) still applies to anything inside a pack, because it goes through the same reader.

---

## 11. Questions for DJ (answer under each one)

1. **Option pick:** A + B for the freeze, C as a stretch. OK?
   `DJ:` A + B for the freeze, C as a stretch. Agreed.
2. **"One instance per browser":** one signed-in person at a time (switch = lock, then another credential)? Or one
   person, period, until IT resets it?
   `DJ:` One person at a time. Switching = Lock, then unlock as another person. The vault keeps one locked record per person who has set up, so we can both use the demo laptop.
3. **Plain files after sign-in:** still allowed (demo mode), or packs only?
   `DJ:` Allowed, with a visible "unlocked" tag (demo mode). Also allowed before sign-in, from the unlock card.
4. **Export report:** printable page + small CSV of the tile numbers. Do we also allow exporting the filtered rows
   (the sheet after a query), or only the dashboard?
   `DJ:` Both, gated: the dashboard's Export report AND the Query menu's Save as CSV follow the group's `export` rule while a pack is open. Plain files aren't gated.
5. **Who sets auto-lock:** IT per group (in the credential), the user, or both (IT sets the max)?
   `DJ:` Both: IT sets the max (`autoLockMin`), and the user can pick shorter.
6. **The IT console:** same repo folder (`DIRECTORY/it-console.html`), or its own folder, so it's obvious it's
   "IT's tool, not the user's"?
   `DJ:` Its own top-level folder, `it-console/`.
7. **Pack format:** JSON with base64 (simple, slower), or a JSON header + raw bytes (faster)? Your agent's call.
   `DJ:` A JSON header plus raw bytes (`FLGPACK1`, see the handoff, section 4).
8. **Recovery code to IT:** we don't think IT needs a copy (IT can reissue the credential). Agree, or should the
   console also print one for IT?
   `DJ:` Agree: no IT copy. IT reissues the credential file.
9. **Branch:** `feature/vault` off `dev` after your merge, or off `feature/dashboard`?
   `DJ:` `feature/vault` off `fix/stray-quotes` (it already has the dashboard + focus mode + the quote fix).
10. **Login look:** a full-screen unlock card before the app, or a small "🔒 Locked: unlock" bar on top of the normal page?
    `DJ:` A full-screen unlock card, then a small "Lock · name · group" chip once signed in.

---

## 12. How this connects to what's already written

- `markdowns/local-security-recommendations.md` (DJ): the memory-only, no-network, no-libraries rules.
  This plan keeps all of them. The only thing it adds is that **locked** data may now stay in the browser.
- `markdowns/local-first-data-workspace-startup-plan.md` (DJ): this is **Phase 5** (encrypted IndexedDB,
  passphrase-wrapped keys, recovery code), plus the IT access groups DJ added today.
- "Flogic Single Sign-On Audit" (Claude Docs): why the real thing would be Entra ID, and why the prototype fakes it.
- `methods/isolate-and-reuse.md`: `vaultI.js` "points" at `loadFile` the same way `dashI.js` points at `queryFileChanged`.
