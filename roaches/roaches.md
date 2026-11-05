# Roaches

Known bugs we've found but haven't fixed yet. One entry per bug: what it is, where it lives,
how to see it, and the fix we'd try.

---

## 1. The merge glitch (stray quotes far apart) ✅ FIXED

**Fixed:** Nov 5, 2026, on `fix/stray-quotes`. The "smarter stray-quote rule" below, plus the warning:
- A quote only opens a quoted cell at the START of a cell (right after a comma or at the start of the row,
  spaces allowed). `5'10"` is just a letter, so typos can't pair up at any distance. `nextLine()` hops from
  quote to quote with this rule (`opensCell`), and `splitIntoCells` uses the same rule. Before, inside a row,
  `Bob,5'10",Chicago` also came out as `[Bob] [5'10,Chicago...]`.
- `QUOTE_LIMIT` stays at 65,536, but only as a safety net for a quote at the start of a cell that never closes.
- When the reader gives up on a quote, the status says so: `⚠ 1 quote opened a cell that never closed: the row count may be off`.
- Test: Castle Claude `tests/realfile-quotes.html` (42/42). It includes this exact repro, which gives 2,850 rows
  on the old reader and 5,000 now, and all six ServiceNow tables checked row by row against Python's `csv` module.
  Write-up: Part 14 of `markdowns/tutorialwdetails.md`.
- Still open: a REAL quoted cell with line breaks that runs more than 65,536 letters past its first line break
  is still treated as a stray (now with the ⚠). The client's longest is 33,576.

**Found:** Nov 5, 2026, on `feature/dashboard` (commit `aa09d84`, the `QUOTE_LIMIT` change)
**Where:** `DIRECTORY/scriptI.js`: `QUOTE_LIMIT` and `nextLine()` (the CSV reader)
**Affects the Molson data?** No. All six ServiceNow tables read correctly.

The one new risk is with other, messy files: if someone opens a CSV where two typos like `5'10"`
happen to sit about 32,000 to 65,000 characters apart, the rows between them now get merged into one.
With the old limit, that file would have opened correctly.

**Why it happens:** `QUOTE_LIMIT` went from 32,767 to 65,536 so `incident.csv` reads as 23,334 rows
(18 Work notes are 32,863 to 33,576 characters long). The reader treats a quote that's still open
more than `QUOTE_LIMIT` characters later as a typo. With the bigger limit, two typos closer than that
pair up as if they were one quoted cell.

**How to see it:** a 5,000-row CSV with `5'10"` (unquoted) in row 100 and row 2,250 (about 50,000
characters apart):

| Limit | Rows shown | Right answer |
|---|---|---|
| 32,767 (old) | 5,000 | 5,000 |
| 65,536 (new) | 2,850 | 5,000 |

**Related, already there before the change:**
- Stray quotes closer than 32,767 characters merge rows with either limit.
- A real quoted cell longer than 65,536 characters still breaks the file the way `incident.csv` broke.
- Nothing on screen says the reader gave up on a quote, so a wrong row count goes unnoticed.

**Fix to try:** a smarter stray-quote rule instead of a distance limit. A real quoted cell starts
right after a comma (or at the start of a line) and ends right before a comma or line break.
A typo like `5'10"` sits in the middle of a cell, so it can't open a quoted cell. That reads long
cells at any length and stops typos from pairing up. Cheap first step: show a warning when the
reader gives up on a quote ("⚠ 2 quotes looked unfinished: the row count may be off").
