# Local-First Data Workspace: Startup Plan

**Team flogic · Cycle 21 · updated 2026-10-23**

> **About the examples in this plan:** the JSON, SQL and commands below are rough starting points, not finished work. Test each one for its actual purpose before trusting it.

---

## 1. The idea

### The problem

People who handle company data get it as files: CSV and Excel exports, database dumps. They need to check it, combine it, and pass a result along. Today's options all cost something:

- **Upload it to a cloud tool:** fast, but it may break company policy and puts sensitive data on someone else's server.
- **Work in a spreadsheet:** familiar, but the steps are manual, easy to get wrong, and hard to repeat or review.
- **Use a database tool:** powerful, but it needs a database, setup, and a technical person.
- **Write a script:** solves it for the author, but a colleague can't easily run it or trust it.

We live this problem in class. The client's ServiceNow extracts contain real people's names in free-text fields, and the rules are to never paste real rows into AI tools and to put every endpoint behind a login.

### The product

A **private data workspace that runs in the browser**: bring your files, run repeatable checks on your own computer, and hand off only the result you choose.

> Open your company's exports, check them with a repeatable recipe, hand off the result, and prove, with one line the browser enforces, that nothing went anywhere.

### What "local-first" means here

- Everything happens in the user's browser, on their own computer.
- The user's files stay the only real copy. The app keeps data in memory and forgets it when the tab closes.
- No account, no sync, no upload.
- A handoff is an explicit export the user saves wherever their company allows.
- The browser itself blocks the page from contacting the internet, through a Content Security Policy (a rule in the page that tells the browser what the page may do). Any future network feature is a visible exception for one address, added on purpose.

Local-first is a design choice, not a complete security guarantee. Section 9 says what it protects and what it doesn't.

### Why us, why now

- **The engine exists:**
  - our own readers for CSV (including line breaks inside quoted cells), Excel and SQL dumps
  - a SQL query engine with JOINs
  - a fast table view and Export CSV
  - no outside libraries and no network calls
- **The need is in front of us:** real client data with real names, and class rules that forbid sharing it.
- **Two real testers** are available now.
- **Two of us plus Claude** can build, test and document much faster than a normal four-person plan assumes. The slow parts are the ones that involve people.

---

## 2. Where we are (2026-10-23)

**Team.** Two of us plus Claude. Claude carries most of the building, testing and docs. We own the user sessions, decisions, reviews and demos.

**Code** (branch `Build-One`, rolled back to the `ac6d3f1` code):

| File | What it does |
|---|---|
| `DIRECTORY/testI.html` | The page skeleton |
| `DIRECTORY/scriptI.js` | Loading files, the table view, menus, Export CSV |
| `DIRECTORY/xlsxI.js` | Reading Excel (`.xlsx`) files |
| `DIRECTORY/sqlI.js` | Reading MySQL, PostgreSQL and SQLite text dumps |
| `DIRECTORY/queryI.js` | The SQL query engine (SELECT, JOIN, GROUP BY and more) |
| `DIRECTORY/styleI.css` | The look, including the Neo-Dark theme |

- **Reverted in the rollback, still in git history:**
  - the SQLite `.db` reader (`3e0129e`)
  - reading a `.db` together with its `-wal` file (`06ba56b`)
  - exact 64-bit numbers plus SQLite's date functions (`1f6827b`)
- **Security check (2026-10-23):** no network calls, no browser storage, no `eval`, no outside libraries, and cell text never goes into the page as HTML. One inline style needs moving before the security lock. Details are in `local-security-recommendations.md`.
- **Today the app works on one file at a time** (or one SQL dump's tables). Having several files in one workspace is Phase 2.

**Class context.** The Sprint 2 demo (10/23) is done. The next target is the December product demo. The team's product repo is `rfp-flogic`.

**Data available to us:**

| Source | What it is | How we reach it |
|---|---|---|
| The six ServiceNow CSVs (plus the raw Excel files) | `incident` 23,334 · `change_request` 1,969 · `sc_req_item` 17,501 · `sc_task` 16,321 · `change_approvals` 9,942 · `ritm_approvals` 5,379 (74,446 rows) | Files in the week 6 repo |
| SQL Server Express | Each laptop's own copy, built by the week 6 load script | Local only |
| SQLite `servicenow.db` | The file the week 7 SQL road reads | Built locally with `sqlite3` |
| Class Data Console | A shared copy in Postgres behind the class gateway | HTTPS plus the team password, SELECT only, capped at 1,000 rows |

**Testers.** Two real people are available for sessions and pilot runs.

---

## 3. The map: four layers

```
Layer 4  PROOF      two testers, a real workflow, time saved          Phase 3
Layer 3  WORKFLOW   workspace, recipes, checks, handoff export         Phases 2-3
Layer 2  TRUST      browser-enforced no-network lock, safe export      Phase 1
Layer 1  ENGINE     CSV / Excel / SQL readers, query engine, viewer    built
```

Each layer makes the one above it worth building. The trust layer comes right after the engine because every later feature has to live inside it. Once the lock is on, anything that wants the network has to be added on purpose, and it shows up in one line.

---

## 4. Product principles

1. **Start with a real job.** One recurring workflow before any general platform.
2. **Enforce, don't promise.** If we claim something about privacy, the browser or a test should prove it.
3. **Keep the data path visible.** Users can tell what is loaded, what is exported, and that nothing else goes out.
4. **Make repeatability visible.** Every run records the recipe and its version, the inputs, the check results and the output.
5. **Share only on purpose.** No silent sync, upload or saving.
6. **Respect existing company systems.** Export plain files, and let people put them where their company already approves.
7. **Use honest security language.** Say what the design protects and what it doesn't.
8. **Keep it boring and portable.** Plain CSV in and out, recipes as plain data, and no outside libraries without a good reason.
9. **Build on the engine; don't rewrite it.** Improve the existing readers and query engine step by step.
10. **Code is a draft until it's tested for its purpose.** The bar isn't "it runs"; it's "it does the job."

---

## 5. The pilot workflow

### Default candidate: "Profile the client's extracts"

This is the week 6 profiling assignment, turned into a recipe anyone can re-run when a new export arrives:

- Row counts match the export (the class "lie detector": the six counts above).
- How full each column is.
- Broken characters (encoding scars like `â€“`).
- Duplicate columns in `change_request` (`State.1`, `Planned start date.1`, ...).
- No duplicate ticket numbers.
- The incident-to-change link: incidents whose `Caused by Change` names a real change.
- An alert rule: any team with more than 40 open incidents (the week 7 trigger, as a check).

**If the testers' real workflow is different, theirs wins.** A good pilot workflow:

- happens at least weekly or monthly
- starts from files people already get
- has clear, objective checks
- has an owner, and a time or error cost we can measure
- ends in an ordinary export, with no writing back to a live system

### The user journey

1. Open the app and see that it's offline-locked and which version is running.
2. Open the files for the job, and check names, columns, row counts and warnings.
3. Pick a recipe and see its owner and version.
4. Match the recipe's inputs to the open files.
5. Run it: see pass or fail for each check, and click through to the rows behind any failure.
6. Preview the handoff: the result, plus a report of what was checked.
7. Export only that, and save it where the company allows. Closing the tab clears everything.

---

## 6. Roadmap: phases in order

Every phase has a goal, a "done when" gate, planning tips, and a rough time for two of us plus Claude. The times are planning guesses, not promises.

### Phase 0: Tester sessions (this week, alongside Phase 1)

- **Goal:** know the real workflow before building the recipe.
- **Do:** a 30–45 minute session with each tester. Ask:
  1. What files do you get regularly, and from where?
  2. Show me what you do with them, step by step.
  3. What mistakes do you check for? What's gone wrong before?
  4. When you're done, what do you produce, and who gets it?
  5. Would you be uneasy uploading these files to an online tool?
- **Done when:** one workflow is named, with its checks and the export it ends in.
- **Tips:**
  - Watch, don't demo. The steps they repeat by hand are the recipe.
  - Write each step as a verb ("filter", "count", "compare").
  - If their files hold real company or personal data, ask for safe copies with fake names and the same structure. Real files never go into a repo or to an AI tool.
- **Time:** two sessions, plus an hour to write them up.

### Phase 1: Trust lock (local security)

- **Goal:** make "nothing leaves the computer" something the browser enforces and a test proves.
- **Why it comes first:**
  1. It's small: about a day, including tests.
  2. It sets the guardrail every later feature lives inside.
  3. It changes how test pages are built, so it's better done before Phase 2 adds new tests.
  4. The Phase 3 handoff export builds on Export CSV, so the safe-export fix should land first.
  5. Once it's in, testers can run real files in the app, and we can say so honestly.
- **Build:**
  - The policy line in `testI.html` (`connect-src 'none'` and the rest), after moving the one inline style.
  - A test version of the policy for the test pages, so they can still read disk files.
  - A proof page that shows the browser firing real "blocked" events.
  - A test that a booby-trapped CSV cell stays plain text.
  - Excel-safe Export CSV (OWASP's CSV-injection fix).
  - The tutorial part explaining it.
- **Done when:**
  - the whole test suite matches its pre-change counts
  - the proof page shows real violation events
  - a by-hand run in Edge with DevTools open shows no "Refused to ..." messages
  - an exported `=HYPERLINK(...)` opens in Excel as plain text
- **Tips:**
  - Record the test counts *before* changing anything.
  - In headless Edge a failed request proves nothing, because it has no network. Only the browser's violation event proves the lock works.
  - Keep the "what we can claim" list (section 12) next to the demo script.
- **Handing off to Phase 2:** every Phase 2 feature must work with the lock on. If something needs the network, that's a Phase 4 decision, not a quick fix.
- **Details:** the why is in `local-security-recommendations.md`; the how is in `local-security-build-instructions.md` (its Phases A–B).

### Phase 2: Workflow slice

- **Goal:** one recipe, end to end, on the real files.
- **Build:**
  1. Several files open in one workspace, queried by table name. The engine already handles JOINs; the work is holding several files and naming them.
  2. The recipe format: a JSON file of named checks, each one a SQL question the existing engine runs (rough example in section 8).
  3. A Run Recipe screen: pass or fail for each check, with a click through to the rows behind a failure.
  4. The first recipe: the profile recipe, or the testers' workflow from Phase 0.
- **Decision during this phase:** restore the SQLite `.db` reader from history? It would open the class's `servicenow.db`. If yes, re-check it under the lock and re-run its tests.
- **Done when:** the recipe runs on all six extracts and gives the expected answers (for example, the six row counts match).
- **Tips:**
  - One recipe working end to end beats a general framework.
  - Writing checks as SQL means one engine, and it's already tested against real SQLite.
  - Recipes are data: never run them as code (no `eval`).
  - Results report counts and pass or fail, not row contents.
  - Claude builds and tests with made-up files shaped like the real ones. We run the real extracts in the app ourselves, and only counts and pass or fail come back.
- **Time:** about a week.

### Phase 3: Handoff, first release, and the tester pilot

- **Goal:** the testers finish the job without help and trust the result.
- **Build:**
  - The handoff export: the safe result CSV plus a `manifest.json` with the app version, the recipe and its version, the input names with row counts and SHA-256 fingerprints, the check results, and the time.
  - A preview of exactly what will be exported.
  - The first tagged release, with a published SHA-256 hash (build instructions, Phase C).
- **Run:** tester run 1 on the rough slice, then tester run 2 on the full flow.
- **Done when:** both testers complete the workflow on their own and would hand the result to their manager.
- **Tips:**
  - Watch silently, and time them against their current way.
  - Fix what confuses them before adding features or file types.
  - Fingerprints can use the browser's built-in `crypto.subtle.digest`, which works offline. Check `window.isSecureContext` on a page opened from disk before relying on it.
  - Capture feedback without copying their data.
- **Time:** 1–2 weeks, mostly set by the testers' calendars.

### Phase 4: Connected options (only when asked, one at a time)

Each option adds exactly one address to the lock, visibly, with a test proving everything else is still blocked.

- **4a. Class gateway snapshot.**
  - Pull a query result from the class Data Console into the workspace.
  - The team password is typed in each time, kept in memory only, and sent in a header, never in the URL.
  - Results are labelled with the source, the time pulled, and the 1,000-row cap.
- **4b. AI helper.**
  - The AI sees column names and types only, never rows.
  - It writes SQL, the user approves it, and our engine runs it locally.
  - No API key goes in the code: either the user pastes their own key each session, or a small proxy server holds it.
  - It's opt-in, and the app shows exactly what was sent.
  - This fills in the week 7 AI use-cases page honestly.
- **Done when:** the exception is one address in the policy line, and the proof page still shows everything else blocked.
- **Tips:**
  - One exception per release.
  - Consider a separate "connected" build, so the default stays fully offline.
  - Update the claims list every time.

### Phase 5: Saved work (only if the testers need it)

- Encrypted saving in the browser (IndexedDB plus Web Crypto), served from `localhost` instead of opened from disk.
- The standard design is in section 4 of `local-security-recommendations.md`.
- It needs a design review before building, and a printed recovery code, because a forgotten passphrase means lost work.

### Later: a company database connector

The class gateway is already a small version of this. The server holds the database login, access needs a password, it only allows SELECT, and results are capped. A company version would add:

- **Real sign-ins:** each person signs in through the company's login system, instead of sharing a team password.
- **Approved queries only:** a list of approved views or named queries, instead of free-typed SQL.
- **Server-side protection:** limits and timeouts enforced on the server, read-only access, and audit records with no row contents.
- **Snapshots:** results are saved as labelled snapshots (source, time, complete or cut off). They refresh only when the user asks, and the old snapshot is kept until the new one has saved.
- **Write-back** (sending changes to the live database) is a separate, higher-risk project. It needs a reviewed change set, approval, protection against duplicate submissions, server transactions, and receipts.
- **Gate:** a named system owner agrees to a read-only pilot.

### Rough calendar to December

| Week of | Building (Claude + one of us) | People (the other of us) |
|---|---|---|
| Oct 26 | Phase 1 trust lock; start the Phase 2 workspace | Phase 0 sessions with both testers |
| Nov 2 | Phase 2 recipe and Run Recipe screen | Turn the session notes into the recipe's checks |
| Nov 9 | Phase 3 handoff export and first release | Tester run 1 |
| Nov 16 | Fixes from the testers; one Phase 4 option if wanted | Tester run 2 |
| Nov 23 | Buffer (Thanksgiving week) | |
| Nov 30 to the demo | Polish, demo script, rehearsal | Rehearse with the testers' feedback |

---

## 7. Planning tips

- **Write the gate first.** Every phase starts with its "done when".
- **Take a baseline before changing anything.** Record the test counts before touching code, and compare after.
- **Code is a draft until it's tested for its purpose.** Each piece gets a test of the job it's meant to do.
- **Run one build phase at a time.** People work (sessions, pilots) can run alongside it.
- **Commit and push each tested milestone,** and update `tutorialwdetails.md` with every code change.
- **Decide in writing.** Open questions go in the decision log (section 13), with a date once they're settled.
- **Plan backward from the demo.** What must someone watching see in five minutes? Build that path first.
- **Keep real data away from AI.** Use column names and made-up rows when asking for help, including when working with Claude.
- **Re-check the claims list after every phase.**

---

## 8. Core objects (rough shapes)

Plain objects and small modules come first.

- **Dataset:** one open or derived table: `id`, `name`, `source` (the file name), `format` (`csv`, `xlsx`, `sql-dump` or `derived`), `columns`, `rowCount`, `warnings`. Source files and derived results stay separate.
- **Column:** `name`, `type` (marked as detected, not authoritative), and its position.
- **Workspace:** the open datasets and recipe runs. In memory only, until Phase 5.
- **Recipe:** `id`, `name`, `version`, `owner`, `inputs` (roles and expected columns), `checks`. Plain data, versioned, never run as code.
- **Run:** the recipe's id and version, the input names with row counts and fingerprints, start and end times, each check's result, and a status (passed, passed with warnings, or failed). No row contents by default.
- **Handoff manifest:** the run summary, plus the app version and the list of exported files.

A rough recipe example (untested):

```json
{
  "id": "servicenow-profile",
  "name": "Profile the ServiceNow extracts",
  "version": "0.1.0",
  "owner": "team flogic",
  "inputs": [
    { "role": "incident", "expectColumns": ["Number", "State", "Priority"] },
    { "role": "change_request", "expectColumns": ["Number", "Type"] }
  ],
  "checks": [
    { "id": "incident-rows", "name": "Incident rows match the export",
      "sql": "SELECT COUNT(*) AS n FROM incident", "expect": { "n": 23334 } },
    { "id": "no-duplicate-numbers", "name": "No duplicate incident numbers",
      "sql": "SELECT Number, COUNT(*) AS n FROM incident GROUP BY Number HAVING COUNT(*) > 1",
      "expect": "no rows" }
  ]
}
```

Checks on columns with spaces in their names (like `Assignment group`) need quoted names inside the SQL. Settle how the recipe file writes those during Phase 2.

---

## 9. Security and privacy model

The full reasoning is in `local-security-recommendations.md`. In short:

**What the design protects (after Phase 1):**

- The page can't contact the internet, and the browser enforces that.
- Only our own scripts run, and text inside a file can't become code.
- Nothing is saved; closing the tab clears the data.
- Exports can't carry live Excel formulas.
- A release can be checked against its published hash.
- Files at rest are protected by the operating system (Windows device encryption or BitLocker), which is how companies already do it.

**Out of scope:**

- A computer already controlled by an attacker, or a malicious browser extension.
- A user copying data out by hand.
- Guaranteed secure deletion from disk.
- Recovering work after a lost device (nothing is saved anyway).

**One honest limit:** when the page is opened from disk, the browser treats every file on the computer as "self". So the lock shuts out the internet, not other local files.

---

## 10. Risks and responses

| Risk | Why it matters | Response |
|---|---|---|
| The testers' workflow isn't what we expected | We'd build the wrong recipe | Phase 0 comes before the recipe; writing checks as SQL keeps the format flexible |
| The lock breaks a feature or the tests | A security change that breaks things gets reverted | Baseline counts, a test version of the policy, and a by-hand DevTools run |
| "Local" is mistaken for "secure" | People over-trust it | The claims list, and the device-encryption note |
| A recipe gives a wrong answer | A repeated mistake scales | Versioned recipes, expected results, and review by the recipe's owner |
| Big files freeze the tab | Real exports are big | Keep the existing chunked work; test with the Castle Claude stress files |
| Too many file formats | Edge cases eat the schedule | Pilot formats only: CSV, Excel and SQL dumps (plus `.db` if restored) |
| The handoff leaks more than intended | Exports can carry source data | A preview, no input files by default, and no row contents in the manifest |
| A network feature quietly widens access | It breaks the core promise | One address per exception, visible in the policy, with a proof test |
| Real client data reaches an AI tool | It breaks the class rule | Claude builds with made-up files; real runs are done by people, in the app |
| The testers' time is limited | The pilot stalls | Book sessions early; Claude carries build, test and docs |
| Features lost in the rollback | Rework | They're in git history; restore only by a dated decision |

---

## 11. Success measures

- Both testers complete the workflow without help.
- Time from opening the files to the handoff, compared with their current way.
- The recipe gives the expected answers on test files and on the real extracts.
- The number of manual steps removed.
- Zero "Refused to ..." messages during normal use, and the proof page passes on every release.
- Exports open cleanly in Excel.
- Testers can explain what stays on their computer and what they exported.
- A second person re-runs a recipe successfully.

---

## 12. Positioning

> A private data workspace that runs in your browser: check company exports with repeatable recipes, hand off only what you choose, and prove nothing went anywhere.

**Lead with:**

- No uploading sensitive exports to another service.
- Repeatable checks for routine file work.
- Results and check status anyone can review.
- A lock you can verify yourself: one line in the page, and DevTools shows it working.
- Plain files in and out, saved where your company already approves.

**What we can claim after Phase 1:**

- "The app makes no network requests, and the browser enforces that."
- "Nothing is saved; closing the tab clears the data."
- "No outside code is loaded."

**What not to claim:**

- "Completely secure."
- "Data can never leave the device."
- "Encrypted" (nothing is saved, so there's nothing to encrypt yet).
- "Enterprise-ready," or "a replacement for your database."
- "Full SQL compatibility."

**For the December demo:**

1. Open DevTools to show the lock.
2. Run the recipe on the client's extracts and click into a failed check.
3. Export the handoff and open it in Excel.
4. Close the tab.

**Beyond the class:**

1. Find one team with a recurring export-based job.
2. Agree on safe sample files and a baseline time.
3. Let their IT read the policy line early.
4. Prove one workflow.
5. Expand only after that owner adopts it.

---

## 13. Decision log

| Date | Decision | Status |
|---|---|---|
| 2026-10-23 | Rolled back to the `ac6d3f1` code; the SQLite reader work stays in history | Done |
| 2026-10-23 | Security approach: memory only, a browser-enforced lock, and safe export | Agreed (`local-security-recommendations.md`) |
| — | Restore the SQLite `.db` reader? | Open (suggested: yes, during Phase 2) |
| — | Build here on `Build-One`, or in `rfp-flogic`? | Open |
| — | Pilot workflow: the profile recipe, or the testers' own? | Open until Phase 0 |
| — | Save work between sessions? | Deferred until the testers ask |

---

## 14. Related files

- `markdowns/local-security-recommendations.md`: why the trust lock looks the way it does.
- `markdowns/local-security-build-instructions.md`: step by step for Claude. Its Phases A–B are Phase 1 here, its Phase C is part of Phase 3, and its Phase D is Phase 4.
- `markdowns/tutorialwdetails.md`: how every part of the app is built.
- The Castle Claude `README.md` (on the desktop): the dev log and test pages.
