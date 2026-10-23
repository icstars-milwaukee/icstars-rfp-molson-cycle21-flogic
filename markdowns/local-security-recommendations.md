# Keeping Local Data Safe: Recommendations

**Question:** What is the most efficient, least messy, most standard way to make the app as secure as possible when all the data stays on the user's own machine?

**Short answer:** Keep data in memory only, let the operating system protect files at rest, and have the browser *enforce* "no network" with a Content Security Policy. Encryption inside the app is not needed until the app saves data, and right now it doesn't.

---

## 1. Where the app stands today

I checked every file in `DIRECTORY/` (as of the rollback to `ac6d3f1`):

| Check | Result | Why it matters |
|---|---|---|
| Network calls (`fetch`, XHR, WebSocket, beacons) | **None** | Nothing the app does sends data anywhere |
| Browser storage (localStorage, sessionStorage, IndexedDB) | **None** | Closing the tab erases everything |
| Running text as code (`eval`, `new Function`) | **None** | A file's contents can't turn into running code |
| Outside libraries / CDNs | **None** | The readers are our own code, so no outside package can be tampered with |
| Cell contents put into the page as HTML | **None** | The only `innerHTML` is one `= ''` that clears a list (`scriptI.js:3344`). A cell like `<img onerror=...>` shows up as plain text and never runs |
| Scripts in `testI.html` | All 4 are separate files | Ready for a strict policy |
| Inline `style="..."` in the HTML | **One**, on the hidden SVG filter (`testI.html:83`) | The only thing a strict policy would break |

The app is already "local-only" in practice. The remaining job is to **make that guaranteed and checkable**, not to add new security machinery.

---

## 2. Recommendations, in order

### 1. Keep data in memory only (don't add saving)

- The files on disk stay the only real copy. The app reads them, works on them, and forgets them when the tab closes.
- Protecting files at rest is the **operating system's job**, and it's the standard way companies do it:
  - Windows 11 Home: *Settings → Privacy & security → Device encryption* (turn it on)
  - Windows 11 Pro: BitLocker
  - An account password and screen lock
- Why not encrypt inside the browser? It protects very little beyond what disk encryption already does, adds passphrase loss and recovery problems, and browser storage is unreliable when the page is opened as a plain file (`file://`).

### 2. Add a Content Security Policy (the single biggest win)

One `<meta>` tag in `testI.html` tells the browser what the page is allowed to do:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'
```

What each part does:

| Part | Effect |
|---|---|
| `connect-src 'none'` | The browser **refuses every network request** from the page. "No data leaves" becomes a browser rule, not a promise |
| `script-src 'self'` | Only our own `.js` files run; injected or inline scripts are blocked |
| `style-src 'self'` | Only our own `.css` loads; inline style attributes are blocked |
| `default-src 'none'` | Anything not listed above is blocked by default |
| `form-action 'none'`, `base-uri 'none'` | Close two common ways out |

**Honest limit:** a CSP doesn't block every possible exit (for example, the page navigating itself to another address). It closes the common ones, and it's the standard tool for this.

**To make it fit:** move the one inline `style="position: absolute"` at `testI.html:83` into `styleI.css`. Setting `.style.cssText` from JavaScript (`scriptI.js:1167`) is still allowed under the policy.

**Checked (2026-10-23, headless Edge 155):** `'self'` works when the page is opened straight from disk, including scripts in other folders, so no local web server is needed for Edge or Chrome. The test pages need a looser copy of the policy so they can still read disk files; the build instructions cover that. Also learned: in headless Edge a `fetch` to the internet fails even *without* a policy, so the only real proof is the browser's "policy violation" event.

### 3. Make exports safe (the Query menu's Export CSV exists today)

This is OWASP's standard "CSV injection" fix. Any exported cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'`, so Excel shows it as text instead of running it as a formula.

### 4. Make releases checkable

Ship tagged git releases, or a zip with a published SHA-256 hash, so anyone (IT, a tester, the client) can confirm their copy is the reviewed one.

### 5. Allow network exceptions only on purpose

If we add the class gateway or an AI helper later:

- Add **only that one address** to `connect-src`, nothing broader.
- **Gateway:** the team password is typed in each time, held in memory only, and sent in the `X-Class-Token` header, never as `?token=` in the URL (URLs end up in logs).
- **AI helper:** sends column names and table shapes only, never rows, and is opt-in with a visible switch.
- Keep the default build at `connect-src 'none'`.

---

## 3. Ways to do it (options compared)

| Approach | Security gained | Mess / effort | Standard? | Verdict |
|---|---|---|---|---|
| Memory only + OS disk encryption | High for at-rest data | None | Yes, the norm on managed devices | **Do it** (already true) |
| CSP meta tag, `connect-src 'none'` | High: enforced "no network" | About a day, including test changes | Yes, the web standard | **Do it next** |
| CSV-injection-safe export | Protects whoever opens the export | Small | Yes (OWASP) | **Do it next** (Export CSV already exists) |
| Release hashes / tags | Proves the copy is unmodified | Small | Yes | **Do it at first release** |
| Local web server instead of `file://` | Makes the CSP and storage behave predictably | Small (one script to start) | Yes | **Not needed for Edge or Chrome** (checked 2026-10-23) |
| Encrypted saving (IndexedDB + Web Crypto) | Protects saved work from other users of the same profile | Large: keys, recovery, migrations | Yes, but heavy | **Wait until someone actually needs saving** |
| Packaged desktop app (Electron etc.) | Similar to CSP, more control | Large; adds a big dependency | Common | **Not worth it now** |

---

## 4. If saving is ever needed: the standard pattern

Only if users truly need work saved between sessions:

1. Generate a random **AES-GCM-256 data key** with Web Crypto (`crypto.subtle`).
2. Turn the user's passphrase into a **key-wrapping key** with **PBKDF2-SHA256 at 600,000 rounds** (OWASP's current recommendation) and a random salt.
3. Store only the **wrapped** data key, never the passphrase or the raw key.
4. Encrypt each saved record with a **fresh random 12-byte IV**. Never reuse an IV with the same key.
5. Give the user a **printed recovery code** at setup: without it, a forgotten passphrase means the data is gone, and the app must say so plainly.
6. Run from `localhost`, not `file://`, so storage belongs to a stable origin.
7. Lock (forget the key in memory) on a timeout and when the tab closes.
8. Have someone with security experience review it before trusting it with real client data.

---

## 5. Where this sits in the plan

This work is **Phase 1, "Trust lock"**, of `markdowns/local-first-data-workspace-startup-plan.md`. It comes right after the engine (built) and right before the workflow slice (Phase 2).

| Order | Phase | What | How |
|---|---|---|---|
| Done | Engine | Readers, query engine, viewer, Export CSV | Built |
| **Next** | **Phase 1: Trust lock** | The policy lock and Excel-safe Export CSV; about a day, including tests | Build instructions, Phases A–B |
| Then | Phase 2: Workflow slice | Several files, recipes, the Run Recipe screen | Startup plan, section 6 |
| With the testers | Phase 3: Handoff and first release | Handoff export, tagged release with a SHA-256 hash | Build instructions, Phase C |
| Only when asked | Phase 4: Connected options | Gateway or AI exceptions, one address each | Build instructions, Phase D |
| Only if needed | Phase 5: Saved work | Encrypted saving (section 4 above) | Design review first |

**Why it goes first:**

1. It's small, and every later feature has to live inside it.
2. It changes how test pages are built, so Phase 2's new tests start under the lock.
3. The Phase 3 handoff export builds on Export CSV, so the safe-export fix lands first.
4. Once it's in, the testers can use real files in the app, and we can say so honestly.

**Planning tips for the hand-off to Phase 2:**

- Every Phase 2 feature must work with the lock on. Needing the network is a Phase 4 decision, not a quick fix.
- New test pages get the test policy from `make-test-pages.pl` automatically. Check that it still stops loudly if the policy text changes.
- Keep the claims list (section 6) next to the demo script, and re-check it after every phase.
- The code in the build instructions is rough: test each piece for its purpose before trusting it.

The step-by-step instructions for me are in `markdowns/local-security-build-instructions.md`.

---

## 6. What we can honestly claim afterward

- **Can say:** "The app makes no network requests, and the browser enforces that with a published Content Security Policy." "Nothing is saved; closing the tab clears the data." "No outside code is loaded."
- **Can't say:** "Completely secure," or "data can never leave the device." Someone with control of the computer, a malicious browser extension, or a copy-paste by the user can still move data. Disk protection depends on the device having encryption turned on. And when the page is opened from disk, the browser treats every file on the computer as "self", so the policy shuts out the internet, not other local files.
