# Roaches

Known bugs we've found but haven't fixed yet. One entry per bug: what it is, where it lives,
how to see it, and the fix we'd try.

---

## 1. The merge glitch (stray quotes far apart)

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
