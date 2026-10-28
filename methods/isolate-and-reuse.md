# The method: isolate code from a working system, reuse it as standalone pieces

Written for an AI coding agent (or a person) who has to build something new when the hard parts
already exist inside a bigger, working codebase. The worked example is the `reverse` cleaning pipeline:
messy CSV in, clean CSV + JSON summary + cleaning log out. It was built from this repo's CSV console
([DIRECTORY/](../DIRECTORY/)). Every example below is real.

> **Honest note:** the method is sound, but the code it produces is still rough. A piece that worked
> inside its old home has not been proven in its new one. Test each piece for the job it now does.

---

## The idea in one paragraph

A mature codebase holds two kinds of knowledge that look the same in the file: **the rules** (what a valid
number is, when a quote ends a cell, why `007` isn't a number) and **the machinery** (how the old app made
those rules fast, drew them on screen, or ran them in bites). The rules took the longest to get right, and
they usually carry over to a new job. The machinery almost never does. So you find the rules, separate them
from the machinery, and reuse only the rules. You build the new thing from those, adding only the parts that are actually new.

---

## Two ways to reuse code: point at it, or lift it out

| | **Point** (in place) | **Lift** (copy out) |
|---|---|---|
| What you do | Make one object that *refers to* functions already in the app, under short names. Nothing is copied or moved. | Copy the *rules* into new standalone files, without the old app's machinery. |
| Example in this repo | `SearchKit` in [smart-search-toolkit.md](../markdowns/smart-search-toolkit.md): `distance: flexDistance`, `cell: cellAt`, ... | The `reverse` pipeline: `isUtf8`, `splitIntoCells`, `lookOf`, ... rebuilt as a Node script |
| Use it when | The new feature runs **in the same program** (same page, same scripts loaded) | The new job runs **somewhere else** (Node instead of the browser, another repo, an assignment), or must **change** data the old code only read |
| Wins | No copies. A fix to the original reaches the new feature for free, and nothing that already works can break. | Runs anywhere. It's frozen, so later changes to the app can't break it. You're free to adapt the rules. |
| Costs | A rename in the original breaks it. You also inherit whatever each function quietly depends on (screen state, globals). | Two copies to keep in step. Fixes don't flow across, so provenance headers say where to look. |
| The trap | Pointing at a function that hides machinery. `getCells` only returns the columns on screen. `cellAt` returns any column. The toolkit plan catches this one. | Copying the machinery along with the rules |

**Steps 1, 2 and 6 apply to both ways.** Steps 3 to 5 are about lifting. When pointing, step 2 is still the key
question: *does this function quietly depend on what's on screen, or on some app state?*

---

## Step 1: Map the new job to the old code before you read deeply

Write down the new job's steps first, in your own words. Then search the old codebase for each step.
Don't read the whole codebase top to bottom.

| New job step | Search for | Found |
|---|---|---|
| Detect file encoding | `TextDecoder`, `utf-8`, `1252` | [`isUtf8`](../DIRECTORY/scriptI.js#L280) |
| Split CSV into cells | `split`, `quote`, `'"'` | [`splitIntoCells`](../DIRECTORY/scriptI.js#L880), [`nextLine`](../DIRECTORY/scriptI.js#L476) |
| Decide a column's type | `int`, `real`, `kind`, `type` | [`lookAtKinds`](../DIRECTORY/queryI.js#L1789), [`CELL_INT`](../DIRECTORY/queryI.js#L1701), [`CELL_LOOK`](../DIRECTORY/queryI.js#L1711) |
| Write a CSV cell | `csv`, `""` | [`csvCell`](../DIRECTORY/xlsxI.js#L429), [`sqlCell`](../DIRECTORY/sqlI.js#L798) |

(Line numbers checked 2026-10-28 on `Test-One`. They drift as the code changes, so search for the name if a link misses.)

Useful moves:
- List every function name in each file (`grep -n "function "`). The names alone usually show where things live.
- Look for **constants and regexes** near the top of a section. They are often the purest form of a rule. `CELL_LOOK` holds most of the money/percent logic in one line.
- Look for **two copies of the same idea** (`csvCell` and `sqlCell`). When two parts of the codebase solved it the same way, that's the version to trust.
- Read the comments. In a well-commented codebase, the comment states the rule and the code is just one way of doing it.

**Output of step 1:** a table like the one above. Any new-job step with no match is something you'll write fresh. That's fine; mark it.

---

## Step 2: Sort each match into RULE vs MACHINERY

For each found function, go line by line and label what you see:

| Keep (rule) | Drop (machinery) |
|---|---|
| The regex / condition that decides yes or no | Running in bites (`nextBite`, `performance.now()` budgets) |
| Edge cases with a reason (`007` is a code, `(5)` means negative, a `(` needs its `)`) | Storing rows as offsets in a `Uint32Array` for speed |
| The order checks happen in | DOM, events, progress bars, "loading..." labels |
| Fallbacks (not UTF-8? try Windows-1252) | Caching (`knownDates` map), sampling 20,000 rows |
| Error meaning ("never closed = it was a stray") | Global state (`fileText`, `rowStart`, `loadId` guards) |

Ask of every line: **"Would this still matter if the data were small and nobody was watching a screen?"**
Yes = rule. No = machinery.

Example: the console's `nextLine` is 50 lines. About 40 of them are about counting quotes without scanning the
whole file again (machinery). The rule underneath is only: *a line break inside an open quote is part of the cell;
a quote still open at the end of the file was a stray.* That's what got carried over.

---

## Step 3 (lifting): Cut it loose and make each piece a pure, standalone unit

A reusable piece takes everything it needs **as inputs**, gives everything back **as its return value**, and
touches nothing else. No globals and no reaching back into the old app.

Before ([`cellAt`](../DIRECTORY/scriptI.js#L1029), inside the console: reads app state and depends on the app's row storage):

```js
function cellAt(i, col) {
    const info = rowInfo(i);                 // reaches into app state
    if (info.cells) return info.cells[col] || '';
    ...
}
```

After (standalone: text in, rows out):

```ts
function parseCsv(text: string): { cells: string[]; line: number }[] { ... }
```

Checklist for each piece:
- [ ] **Inputs are parameters.** No reading of outside variables (constants are fine if they move with it).
- [ ] **Output is a return value.** No writing to outside state. The one allowed exception is a **declared** side channel. The pipeline's `note()` logger is passed around on purpose and is named at the top of the file.
- [ ] **One job.** If you can't name it in 3 words (`read the bytes`, `vote a type`, `write a cell`), split it.
- [ ] **Typed edges.** Write down the shape of what goes in and out (`{ n: number; pre: string; post: string } | null`). This is the piece's contract.
- [ ] **No silent changes.** If the new job needs to be auditable, every change the piece makes must be reportable (a return value or a log call). The console only *showed* data. The pipeline *changes* it, so every lifted rule gained a `note(...)` call.

---

## Step 4 (lifting): Write down where it came from (provenance)

Every lifted piece gets a header that names its source and what changed. This is how anyone (including a future
agent) can tell whether a bug lives in the original or was added in the port.

```ts
// ------------------------------------------------------------
// 4b. NUMBERS WITH A LOOK   $116,450.00   1,200   ($3.00)   12%
//
// FROM:     queryI.js  CELL_LOOK + lookOf   (CSV console, branch Test-One, commit 31921c2)
// SAME:     the regex, the "( needs its )" and "one sign at most" rules
// CHANGED:  also rejects a leading zero (007), since a pipeline must never turn a code into a number
// IN:       one cell's text
// OUT:      { n, pre, post } or null (null = not a number with a look)
// ------------------------------------------------------------
```

Also keep a **steal map** document: one row per piece listing *new step → source file:line → what it does → what changed*.
Pin it to a commit, because line numbers drift. (The `reverse` folder's `02-what-we-steal.md` is one.)

---

## Step 5 (lifting): Save the pieces so they can be reused (as objects / modules)

Once a piece is pure and labeled, it can live on its own. Save it so the next job can pick it up without
digging through the old codebase again.

### Layout

```
pieces/
  README.md            <- the index: one line per piece (name, 3-word job, source)
  read-text.mts        <- export function readText(bytes): { text, encoding }
  parse-csv.mts        <- export function parseCsv(text, onNote?): Row[]
  number-look.mts      <- export function lookOf(s), asNumber(s)
  as-date.mts          <- export function asDate(s): string | null
  csv-cell.mts         <- export function csvCell(text): string
  pieces.test.mts      <- one or more checks per piece, from the edge cases in its comments
```

### When to use an object

- **Pointing:** the object *is* the method. One roof, short names, and one place to check that every piece still exists. See `SearchKit`.
- **Lifting:** each module is already its own roof. Add an object only when several functions share **settings** that a caller should change in one place:

```ts
// A column-typing object: the rules travel together, and the judgment calls are settings, not edits.
export function makeTyper(opts = { vote: 0.8, usDates: true, missing: ["", "n/a", "null", "-"] }) {
  const missing = new Set(opts.missing);
  return {
    isMissing: (v: string) => missing.has(v.trim().toLowerCase()),
    asNumber,                                   // pure piece, reused as-is
    asDate: (v: string) => asDate(v, opts.usDates),
    voteKind: (values: string[]) => voteKind(values, opts.vote),
  };
}
```

Rule of thumb: **config that varies by job → object settings; logic that never varies → plain exported functions.**
Don't wrap a single pure function in a class.

### The index entry (pieces/README.md)

```
| Piece        | Job              | From                          | Tested by                 |
|--------------|------------------|-------------------------------|---------------------------|
| lookOf       | read money / %   | queryI.js CELL_LOOK + lookOf  | pieces.test.mts #4, #5    |
| parseCsv     | text -> rows     | scriptI.js splitIntoCells     | pieces.test.mts #11, #12  |
```

---

## Step 6: Test each piece for its NEW job

A piece that worked in the console has only been tested for the console's job. The new job can break it in ways
the old one never could.

Real example: the console reads `00601` as text (good). The pipeline's first version **voted the zip column to be
numbers and blanked `00601`**, which destroyed data. That only showed up because a test fed it a zip code. The fix
(any leading-zero value keeps the whole column text) was a new rule the old app never needed.

How to test:
1. **Mine the old comments for edge cases.** `007`, `-$-5`, `($3.00)`, `5'10"`, `""`, a line break inside quotes. Each one becomes one check.
2. **Build one deliberately awful input** with one of every mess, small enough to read by eye (the `reverse` folder's `data/messy.csv`).
3. **Check meaning, not just "it ran".** "`02/30/2026` became blank *and the log says so*" is a test. "No errors" is not.
4. **Check the accounting.** In = out + removed, and every removal has a logged reason.
5. **Run it on one real file from the old world** (the week 6 ServiceNow sample) to catch what the made-up input missed.
6. **Write down what was NOT tested.** Saying it is part of the method.

When pointing, test the same way. Also check at load that every pointer is still a function (a rename upstream breaks it silently otherwise).

---

## Step 7: Add only what's actually new

After reusing, list what the new job needs that the old code never did. For the `reverse` pipeline:
- **Changing** data (the console only read it), so: trim, blank out missing-value words, standardize formats, unify spellings, drop duplicates.
- **A log of every change**, with the original line number. That's new plumbing, threaded through every lifted piece.
- **A summary output** (counts, types, min/max).

Write these fresh, in the same style as the reused pieces: pure, one job, typed edges, logged changes.
When pointing, new code goes in its **own** file (like `searchI.js`). Don't edit a shared function to suit the new feature, because other features depend on it.

---

## Common mistakes

| Mistake | What happens | Instead |
|---|---|---|
| Copying a whole file "to be safe" | You inherit globals, the DOM, and machinery, and nothing runs outside its old home | Lift functions, not files |
| Copying the speed tricks | 3x the code, and the tricks hide the rule | Keep the plain version; optimize only if the new job is big |
| Keeping old rules the new job contradicts | The console requires *all* cells to fit a type, but messy data never does | Adapt the rule, then say so in the provenance header |
| No provenance | Nobody can tell a port bug from an original bug | Header + steal map, pinned to a commit |
| Trusting "it worked over there" | The zip-code bug | Every piece gets tested for the new job |
| Pointing without a guard | A rename upstream silently breaks the feature | At load, check every pointer is a function (the toolkit's `Object.entries(SearchKit)` check) |
| Pointing at something that only sees the screen | `getCells` misses every column that isn't on screen | Step 2: find the rule-only version (`cellAt`) |
| Changing the original while reusing it | Two things break at once | Read-only on the source. New code goes in a new file |

---

## The whole method on one card

1. **Map** the new job's steps to search hits in the old code.
2. **Sort** each hit: rule (keep) vs machinery (drop).
3. **Choose:** same program → **point** (one object, short names, a guard). Different program, or the job changes data → **lift**.
4. **Lifting:** cut each piece loose (inputs in, outputs out, one job, typed edges, changes reported), label its source, keep a steal map, and save it as a small module.
5. **Test for the new job**, using the old comments' edge cases, one awful input, one real file, and the accounting.
6. **Write only what's new**, in its own file and the same style.

## Where to see it applied

- **Lifting:** the `reverse` folder (on DJ's Desktop, not in this repo). `code/clean.mts` has the pieces, numbered, each naming its source. `02-what-we-steal.md` is the steal map, and `05-test-it.md` covers the tests.
- **Pointing:** [markdowns/smart-search-toolkit.md](../markdowns/smart-search-toolkit.md) (the `SearchKit` plan).
- **The originals:** [DIRECTORY/](../DIRECTORY/) (`scriptI.js`, `queryI.js`, `xlsxI.js`, `sqlI.js`).
