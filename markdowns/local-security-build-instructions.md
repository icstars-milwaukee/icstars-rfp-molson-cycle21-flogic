# Build Instructions for Claude: Local Security Hardening

**When to use this:** the user hands this file back and says it's time. The reasoning lives in `markdowns/local-security-recommendations.md`; read it first.

**Scope:** Phase A (the policy) and Phase B (safe CSV export) are the default job. Do Phases C–D only if the user asks for them by name.

**In the startup plan** (`markdowns/local-first-data-workspace-startup-plan.md`): Phases A–B here are Phase 1 ("Trust lock"), Phase C is part of Phase 3 (first release), and Phase D is Phase 4 (connected options). Phase 2 (the workflow slice) comes right after A–B, so every Phase 2 feature must work with the lock on.

**Last checked:** 2026-10-23, against the `ac6d3f1` code (after the rollback), headless Edge 155.0.4283.62.

**The code, commands and patterns in this file are rough and imperfect: a starting point, not finished work.** Line numbers drift, greps can miss things, and the snippets haven't run in the real app. Fix them while building, and test every piece for its actual purpose (does the policy really block? does the guard really stop a formula? do the old tests really still pass?) before trusting it. Say in the final report which parts were tested and which weren't.

---

## Facts already verified (don't redo unless Edge or the code changed)

On 2026-10-23 I opened small probe pages from disk (`file://`) in headless Edge, using the exact policy from Phase A:

| Question | Answer |
|---|---|
| Does `'self'` allow the sibling `.js` and `.css` files under `file://`? | **Yes** |
| Does `'self'` allow a `.js` in *another folder* loaded by a full `file:///` path? (This is how the test pages load `DIRECTORY/`.) | **Yes.** In Chromium, under `file://`, `'self'` matches any `file:` URL |
| Inline `style=""` attribute | **Blocked**, so `testI.html:83` must move |
| Setting `.style.cssText` from JS (`scriptI.js:1167`) | Allowed |
| The Export CSV steps (blob + `<a download>` + click) | No violation. Headless can't confirm the file saved, so check that by hand |
| `XMLHttpRequest` of a disk file, or of a `blob:` URL (how 32 test scripts read files, and how tests read the export blob) | **Blocked** by `connect-src 'none'`; **allowed** by `connect-src 'self' blob:` |
| `fetch` to the internet, `<img>` beacon to the internet | Blocked, and `securitypolicyviolation` events fire |
| `fetch` to the internet with **no policy at all** | **Also fails in headless** (no network), with zero violations. A failed fetch proves nothing; only a violation event proves the policy works |

The class gateway answers with `Access-Control-Allow-Origin: *` (`d1/gateway/src/index.js:54` in the week 6 repo), so a page opened from disk can call it once it's allowed in `connect-src`.

---

## Before starting

1. Run `git status` and `git log --oneline -5`. Confirm the branch with the user (it was `Build-One`), and branch off first if on `main`.
2. **Take a baseline:** run the full test suite (the Node suites plus `sh tools/run-tests.sh` pages, as listed in the Castle Claude `README.md`) *before* changing anything, and write down every pass count. Every result afterward gets compared to this.
3. **Re-run the audit**, because the code may have changed since 2026-10-23:
   - `grep -n "innerHTML\|insertAdjacentHTML\|outerHTML" DIRECTORY/*.js`: expected only `themeList.innerHTML = ''`. Anything else that puts cell text in as HTML must be switched to `textContent`.
   - `grep -n "fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon\|EventSource\|localStorage\|sessionStorage\|indexedDB\|eval(\|new Function\|WebAssembly\|new Worker\|importScripts" DIRECTORY/*.js`: expected nothing. If something turns up, ask the user before continuing. (WebAssembly would need `'wasm-unsafe-eval'`; workers would need `worker-src`.)
   - `grep -nE ' style="|\son[a-z]+="|<script>|<style|javascript:' DIRECTORY/testI.html`: expected only line 83. (Keep the leading space or `\s`: a plain `on[a-z]*="` also matches `content="` and `aria-controls="`.)
   - `grep -n "setAttribute('style'\|createElement('style')\|createElement('script')\|javascript:" DIRECTORY/*.js`: expected nothing. Setting `.style.x` or `.style.cssText` from JS is fine.
4. If restored files exist (for example `DIRECTORY/dbI.js`), include them in every check. `make-test-pages.pl` already handles `dbI.js`.
5. **House rules** (from memory; spelled out here in case memory isn't loaded):
   - Every `DIRECTORY/` change also updates `markdowns/tutorialwdetails.md`.
   - `DIRECTORY/` and `markdowns/` files are CRLF: use the Edit tool or `perl -pi`, never `sed -i`.
   - Test big files as real files on disk, on a real clock (`realfile-*` pages). Never kill all Edge processes; only stop the ones whose command line has the test profile path.
   - Backslash escapes in my tool input can get rewritten: check bytes with `od -c`, or use `String.fromCharCode(...)`.
   - Commit and push each tested milestone on the feature branch.

---

## Phase A: Content Security Policy

### A1. Move the inline style out of the HTML

- `testI.html:83`: `<svg width="0" height="0" style="position: absolute" ...>` holds the `glassWarp` filter.
- Remove the `style` attribute, give it a class (for example `class="svgDefs"`), and add `.svgDefs { position: absolute; }` to `styleI.css`. Comment both in the files' plain-words style.
- Confirm the glass look still renders. `backdrop-filter: url(#glassWarp)` points inside the same page, so the policy doesn't touch it.

### A2. Add the policy (exact tested string)

Put it in `<head>` of `DIRECTORY/testI.html` **right after `<meta charset>` and before `<link rel="stylesheet">`**. A meta policy only covers what comes after it. Add a plain-words comment that explains each part:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'">
```

- `frame-ancestors`, `sandbox` and `report-uri` don't work in a meta tag; leave them out.
- If the app ever loads anything outside its folder (fonts, CDNs), stop and ask the user.

### A3. Teach the test pages (otherwise nearly every test breaks)

- `tools/make-test-pages.pl` copies the real `testI.html` into every test page, **policy included**. 32 test scripts read disk files with `XMLHttpRequest`, and `connect-src 'none'` blocks them.
- Edit the generator: after it reads the skeleton, swap `connect-src 'none'` for `connect-src 'self' blob:` on test pages. Make it **`die` if the production policy text isn't found**, so the two policies can't silently drift apart.
- **One exception keeps the production policy unchanged:** a new `tests/realfile-csp.html` (see A4). Have the generator skip the swap for that page name.
- Add a `securitypolicyviolation` listener to `tests/compat.js` (loaded by every app test page) that records violations, and make the result text report them. A page that passes but logged a violation counts as a failure.
- Old A/B pages (`old-script.js`, `old-style.css`) may show style violations from the *old* code. That's not a regression. Note it, or allow `'unsafe-inline'` for styles on those pages only.
- Run `perl tools/make-test-pages.pl`, then the whole suite. **Pass counts must match the baseline.** The test policy differs from production in exactly one place (`connect-src`).

### A4. Prove the policy blocks: `tests/realfile-csp.html` + `tests/csp.js`

- Its first action: listen for `securitypolicyviolation` and record `e.effectiveDirective` and `e.blockedURI`.
- Then try `fetch('https://example.com/x')`, `new Image().src = 'https://example.com/p.png'`, and an `XMLHttpRequest` of a sibling file.
- **PASS only if violation events arrive:** `connect-src` (for both the fetch and the XHR) and `img-src`. Never pass because "the fetch failed", since it fails in headless anyway.
- Also check that the app's own scripts ran (for example, a known function exists) and that `styleI.css` applied (check one computed style).
- Report in the same `RESULT ... DONE` tab-title format as the other `realfile-*` pages, so `run-tests.sh` can read it.

### A5. Prove cell text can't become code (independent of the policy)

- Add a CSV to `small-files/` with cells like `<img src=x onerror="window.__pwned=1">`, `<script>window.__pwned=1</script>` and `<b>bold</b>`.
- Load it on a normal test page, then check:
  - `window.__pwned` is undefined
  - no `img` or `b` element appears inside the table area
  - the visible cell text equals the literal markup
- The DOM checks are what matter. With the policy on, an inline handler would be blocked anyway, so "nothing ran" alone doesn't prove the rendering is safe.

### A6. By hand, in real Edge (not headless)

Double-click `DIRECTORY/testI.html` with DevTools open. The console must show **no "Refused to ..." messages** while you:
- open a CSV (with quoted line breaks), an XLSX file and a SQL dump
- run a query and press **Export CSV** (the file must actually save)
- flip between Spreadsheet and CSV views
- use the theme chip, snap menu, drag mode and click-a-cell Details

Ask the user to do this with you if no browser tool is available.

### A7. Write it down and commit

- `markdowns/tutorialwdetails.md`: a new part explaining the policy line by line in the tutorial's voice, the inline-style move, the test-page swap, and how to check it in DevTools. Update "What it can't do (yet)".
- Castle Claude `README.md`: add or tick the item, with the test counts.
- Check `file` on the changed files (CRLF intact) and `git diff --stat`, then commit in the repo's style, for example `Security lock: the page can't reach the internet (Content Security Policy), details in tutorialwdetails.md`, and push.

---

## Phase B: Safe CSV export (the export exists today)

The Query menu's **Export CSV** is at `scriptI.js:4579-4592`. It saves `header + answer.table.text` as-is.

- **Where to change it:** in the Export click handler, **not** in the answer builder (around `scriptI.js:4508-4515`). The builder's text is also what the table shows, so guarding it there would change the display.
- **How:** the engine's rows are already gone by then (`rows[r] = null`), so walk `answer.table.text` line by line using `answer.table.starts`, and split each line into cells. They're CSV-quoted: `"` doubled, and cells containing `,`, `"`, CR or LF are wrapped in quotes.
- **Rule** (OWASP CSV injection): a **text** cell whose first character is `=`, `+`, `-`, `@`, TAB or CR gets a leading `'`, then is re-quoted if needed. Use the column types in `answer.table.sql.columns`. Don't touch number or money columns (a negative money value like `-$1,234.00` must stay a number). Guard the header names too.
- **Big answers:** work in bites, using the same `nextBite` / `CHUNK_TIME` pattern the answer builder uses. Build the `Blob` from an array of parts instead of one giant string, and show progress so the tab never freezes (remember the "tab crashing after a big query" fix).
- **Escapes:** TAB and CR in code are `\t` and `\r`. Check the bytes after writing (see the house rules), or use `String.fromCharCode(9)` and `String.fromCharCode(13)`.
- **Tests:** no test checks export *content* today (`compat.js` only records `window.lastDownload`). Add one. Run a query that returns `=1+1`, `+cmd`, `@x`, a TAB-led text and `-5` as a real number; read the blob back; check the exact output. By hand: open the file in Excel, and `=HYPERLINK(...)` must show as text.
- **Tell users:** a guarded cell shows a leading `'` in Excel. Say so in the tutorial, and later in the handoff manifest.

---

## Phase C: Release check (only when asked)

- Tag: `git tag -a vX.Y.Z -m "..."`.
- Build the zip **from the tag**, so only committed files go in: `git archive --format=zip --prefix=flogic-vX.Y.Z/ -o flogic-vX.Y.Z.zip vX.Y.Z DIRECTORY`.
- Hash it with `certutil -hashfile flogic-vX.Y.Z.zip SHA256` and publish the hash next to the zip. Add a "check your copy" section to the tutorial.
- **Ask the user before pushing tags or publishing anything.**

---

## Phase D: Network exceptions (only when asked, one at a time)

- Add **exactly one origin** to `connect-src`, never a wildcard. Add it in both the production policy and the generator's test swap.
- **Gateway:**
  - Origin: `https://c21-data-gateway.icstars-milwaukee.workers.dev`.
  - Send `POST /api/query` with the team password in the `X-Class-Token` header, never `?token=` (URLs end up in logs).
  - The password is typed in each time and kept in a variable only: never in storage, never committed.
  - Label results with the source, the time they were pulled, and the 1,000-row cut-off. Remember it's the Postgres dialect with lowercase column names.
- **AI helper:**
  - An API key inside a browser page is readable by anyone using it, so never commit one. Either the user pastes their own key each session (kept in memory only), or a small company-run proxy holds it (the same reasoning as the database connector).
  - Send column names and types only, never rows. Make it opt-in with a visible switch, and show exactly what will be sent.
  - Load the `claude-api` skill first for current model names and the browser-access rules.
- **Encrypted saving** is a separate project: follow section 4 of the recommendations file, and get the user's go-ahead on the design first. It needs `localhost` rather than `file://`, so the saved data belongs to one stable origin.

---

## Done when

- The policy is in `testI.html` and no inline styles or scripts are left.
- The test pages use the test policy, and the whole suite matches the baseline counts.
- `realfile-csp` passes with **real violation events**.
- The injection test passes, and the by-hand DevTools run is clean (Export CSV saved a file).
- The export guard is in and tested (if Phase B was in scope).
- The tutorial and Castle Claude README are updated, and the work is committed and pushed on the feature branch.
- Report back: what changed, what was tested, the results against the baseline, and anything skipped or not working.
