# Build the CSV Reader From Scratch

You're going to build a web page that opens a CSV file and shows it like a **mini Excel sheet** inside a floating glass window:

- Row 0 (the column names) stays stuck to the top
- 15 rows show at a time, and scrolling snaps row by row
- Every value sits in its own box, and the columns line up
- Search paints your word yellow
- Go to any row, or expand to see everything
- **It stays fast, even with hundreds of thousands of rows**
- A small glass **theme chip** in the corner unfolds into a theme menu: **Neo-Neutral** (the default, and the fastest), and **Neo-Dark** (flat and soft black, a forest red accent, and floating panels of bending glass)
- It opens **Excel files (`.xlsx`)** too, with dates done carefully (Part 5)
- A **snap menu** ("the aimbot") locks onto search matches and snaps the sheet right to them, even thousands of columns away (Part 6)
- **Drag mode**: hold on the sheet and drag it in any direction, with a mouse, a trackpad, or a finger (Part 7)
- **Spreadsheet View ↔ CSV View**: flip any file between the CSV look and Excel's look (letters on top, Excel's row numbers, a wider grid), like turning a card over (Part 8)
- It opens **SQL dumps (`.sql`)** too: MySQL, PostgreSQL, and SQLite, one table at a time, in a **table look** (each column's type under its name, a PK badge, faint NULLs) in classic database blue. It flips to the CSV look, too (Part 9)
- A **query engine** of its own: ask any open table a question in SQL (`WHERE`, `GROUP BY`, `JOIN`, window functions...), or click it together in the **Query** menu's builder. The answer takes the window's place; **← Back to file** brings the file back (Part 10)
- **Query Flexibility** ("snap to result"): sloppy SQL like `selct * form orders` or `where status = shipped` gets fixed, and it says what it changed. **Type mode**: type your own SQL, then untick it and your SQL snaps back into the builder's buttons. And **click any cell** for its Details: rest the mouse on it and a little black **expand?** tag shows up. And **money columns** (`"$116,450.00"`) count as numbers, so `>`, `SUM`, `MAX` and sorting work, while answers keep the `$` look (Part 11)

You'll build it **one piece at a time**. After each part there's a **✅ Test it** step, so you always know it's working before you move on.

<br>

---

<br>

## Before you start: the 3 files

A web page is usually 3 files working together:

| File | Nickname | Job |
|---|---|---|
| `testI.html` | **the skeleton** | WHAT is on the page |
| `styleI.css` | **the clothes** | How it LOOKS |
| `scriptI.js` | **the brain** | What it DOES |

(Later, Part 5 adds a 4th file: `xlsxI.js`, **the translator**, which reads Excel files. Part 9 adds a 5th: `sqlI.js`, a second translator, for SQL dumps. And Part 10 adds a 6th: `queryI.js`, **the query engine**.)

**We build them in this order:**

```text
  1. Skeleton   →   2. Brain   →   3. Clothes
```

> Why the brain before the clothes? So you can see it WORK first, then make it pretty.

<br>

**What you need:**
- A code editor (like VS Code)
- A web browser (like Chrome)
- A `.csv` file to test with. The **first line should be the column names**, like this:

```text
Name,Age,City,Salary
Ana,22,"Chicago, IL",$40137
Bo,31,Denver,$52000
```

<br>

**Make the files:**

1. Make a folder (ours is called `TESTING`).
2. Inside it, make 3 empty files: `testI.html`, `scriptI.js`, `styleI.css`.

<br>

---

<br>

# PART 1: The Skeleton (`testI.html`)

The skeleton says what's on the page. Nothing moves yet. It's like building a house before the electricity is on.

<br>

### Step 1.1: The empty page

Every web page starts like this. Type it into `testI.html`:

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV Reader Test</title>
    <link rel="stylesheet" href="styleI.css">
</head>

<body>

    <!-- all the pieces go here -->

    <script src="scriptI.js"></script>

</body>
</html>
```

**What's what:**

| Line | Baby words |
|---|---|
| `<!DOCTYPE html>` | "This is a normal, modern web page." MUST be the first line. |
| `<head>` | Stuff the browser needs to know. You can't SEE it. |
| `<meta charset="UTF-8">` | Lets the page show any letter or symbol (é, ñ, 😀). |
| `<meta name="viewport" ...>` | Makes the page fit on phones. |
| `<title>` | The words on the browser tab. |
| `<link ... styleI.css>` | **Put on the clothes.** |
| `<body>` | Everything you can SEE. |
| `<script src="scriptI.js">` | **Plug in the brain.** It goes LAST, so all the pieces exist before the brain looks for them. |

<br>

### Step 1.2: Add the pieces

Replace `<!-- all the pieces go here -->` with these, **in this order** (top of the page → bottom):

```html
    <!-- 1. The big title -->
    <h1>CSV Reader</h1>

    <!-- 2. The "Choose File" button -->
    <input type="file" id="csvFileInput" accept=".csv">

    <!-- 3. The search bar (OFF until a file is picked) -->
    <input type="search" id="searchInput" placeholder="Search text, numbers, or characters..." disabled>

    <!-- 4. The "Rows 1–15 of 100" words -->
    <p id="status">Pick a CSV file to get started.</p>

    <!-- 5. Go to row + Expand (hidden until a file is picked) -->
    <div id="controls" hidden>
        <input type="number" id="jumpInput" min="1" placeholder="Row #">
        <button id="jumpBtn">Go to row</button>
        <button id="expandBtn">Expand (show all)</button>
    </div>

    <!-- 6. THE WINDOW: a frame, with the header on top and the rows under it -->
    <div id="output">
        <div id="header"></div>
        <div id="rows"></div>
    </div>

    <!-- 7. The "Top" button (hidden until you scroll down) -->
    <button id="topBtn" title="Back to top" hidden>&#8593; Top</button>

    <!-- 8. THE LOADER (only shows up for BIG files): a cloud, a pie that fills up, and some words -->
    <div id="loader" role="status" aria-live="polite" hidden>
        <div id="loaderPie"></div>
        <p id="loaderLabel">Loading...</p>
    </div>
```

<br>

**The most important idea on this page: name tags.**

```text
id="searchInput"
    ^^^^^^^^^^^
    the name tag
```

Every piece the brain needs to talk to gets a **name tag** (`id`). Later, the brain will say *"find the piece called searchInput"* and grab it.

<br>

**The window, in a picture:**

```text
   ┌─ output (the glass frame) ────────────────────┐
   │  header   →   0 │ Name   │ Age │ City        │   ← stuck to the top
   │  rows     →   1 │ Ana    │  22 │ Chicago, IL │
   │               2 │ Bo     │  31 │ Denver      │
   │               3 │ ...                         │   ← these scroll
   └───────────────────────────────────────────────┘
```

<br>

**Other magic words:**

| Word | Baby words |
|---|---|
| `type="file"` | Makes a "pick a file" button |
| `accept=".csv"` | Only shows CSV files when you pick |
| `disabled` | Turned OFF (greyed out) |
| `hidden` | Invisible for now |
| `type="number"` | The box only takes numbers |
| `&#8593;` | The ↑ arrow symbol |
| `role="status"` + `aria-live="polite"` | Tells screen readers: "read these words out loud when they change" (like "Cutting it into rows...") |

<br>

### ✅ Test it

Double-click `testI.html`. You should see:
- A title
- A Choose File button
- A grey search bar you can't type in
- "Pick a CSV file to get started."

Clicking things does nothing. **That's correct!** There's no brain yet.

<br>

---

<br>

# PART 2: The Brain (`scriptI.js`)

The brain makes things happen. We'll build it in small pieces, then test.

> **3 words you'll see a lot:**
>
> | Word | Baby words |
> |---|---|
> | `const` | A box whose label never changes |
> | `let` | A box whose stuff CAN change later |
> | `function` | A list of instructions with a name. Say the name → it runs the list. |

<br>

**The whole story, in 6 steps:**

```text
  1.  You pick a file.
          ↓
  2.  The brain reads it.                      (FileReader, built into every browser)
          ↓
  3.  The brain cuts it into lines,
      and every line into CELLS at the commas. (like boxes in Excel)
          ↓
  4.  Line 0 = the HEADER.                     (the column names, stuck on top)
          ↓
  5.  The rows show up in the window.          (only the ones you can SEE get built. More on that in Step 2.9!)
          ↓
  6.  You type in the search bar   →   back to step 5, but only keeping the matches.
```

<br>

### Step 2.1: Settings + find the pieces

Open `scriptI.js`. First, 9 settings, then the brain finds every piece by its name tag:

```js
const WINDOW_SIZE = 15;     // how many rows fit in the window (plus the header)
const EXTRA_ROWS  = 15;     // extra rows to build above and below the ones you see (a whole window's worth)
const EXTRA_COLUMNS = 8;    // extra columns to build left and right of the ones you see (the SIDEWAYS treadmill)
const MAX_SCROLL_WIDTH = 4000000;   // wider sheet than this? the sideways scrollbar gets "scaled" (Step 2.9)
const MAX_SCROLL_HEIGHT = 4000000;  // more rows than fit in this? the up-and-down scrollbar gets "scaled" (Step 2.20)
const NUM_WIDTH   = 60;     // how wide the row-number column is (in pixels)
const BIG_FILE    = 20000;  // bigger than this? search waits until you stop typing
const GLIDE       = 0.25;   // how fast the wheel glide catches up, every 60th of a second (bigger = snappier, smaller = floatier)
const CHUNK_TIME  = 12;     // big jobs are done in BITES of about 12 milliseconds, so the page never freezes

// "Take the next bite": let the screen breathe (draw, handle a click), then run "fn".
// Why not setTimeout(fn, 0)? After 5 in a row, browsers make EVERY setTimeout wait at least 4 ms,
// even with nothing else to do. A big file takes dozens of bites: that's a lot of waiting for nothing.
// A message to ourselves (a "MessageChannel") has no such wait.
const biteChannel = new MessageChannel();
const biteQueue   = [];
biteChannel.port1.onmessage = function () { biteQueue.shift()(); };

function nextBite(fn) {
    biteQueue.push(fn);
    biteChannel.port2.postMessage(0);
}
const LOADER_DELAY = 150;   // the loader only shows up if a job takes longer than this (milliseconds)
const SHOW_LETTERS = 1000;  // a cell with MORE letters than this only shows (and hovers) its first 1,000 (Step 2.5)
const QUOTE_LIMIT = 32767;  // a quote still open this far past a line break is a MISTAKE, like 5'10" (Step 2.15)

const fileInput   = document.getElementById('csvFileInput');   // Choose File button
const searchInput = document.getElementById('searchInput');    // search bar
const statusText  = document.getElementById('status');         // "Rows 1–15 of 100"
const outputBox   = document.getElementById('output');         // the glass window
const headerBox   = document.getElementById('header');         // the header row (row 0)
const rowsBox     = document.getElementById('rows');           // the rows under it
const controls    = document.getElementById('controls');       // Go to row + Expand area
const jumpInput   = document.getElementById('jumpInput');      // "Row #" box
const jumpBtn     = document.getElementById('jumpBtn');        // "Go to row" button
const expandBtn   = document.getElementById('expandBtn');      // "Expand" button
const topBtn      = document.getElementById('topBtn');         // "Top" button
const loader      = document.getElementById('loader');         // the cloudy loading screen
const loaderPie   = document.getElementById('loaderPie');      // the pie circle that fills up
const loaderLabel = document.getElementById('loaderLabel');    // the words under the pie

// Two invisible "spacers." You'll see what they're for in Step 2.9.
const topSpacer    = document.createElement('div');
const bottomSpacer = document.createElement('div');
```

`document.getElementById('xyz')` = **"Find the piece with the name tag xyz."**

> ⚠️ The name tags must match the skeleton EXACTLY. `searchInput` ≠ `SearchInput`.

<br>

### Step 2.2: The brain's memory

```js
let headerCells = [];     // the column names (row 0).          Like: ["Name", "Age"]

// THE ROWS. They're NOT cut into cells and kept. (Every cell as its own little string
// took about 4 times the file's size in memory.) Instead: the whole file stays as ONE string,
// plus a list of where each row STARTS. A row only gets cut into cells when it's on screen.
//
//     fileText:   "name,age\nAna,22\nBo,31\n"
//     rowStart:   [9, 16, 22]      <- row 0 starts at letter 9, row 1 at 16... (+1 extra: where the last row ENDS)
//
let fileText    = '';                   // the whole file, as one long string
let rowStart    = new Uint32Array(1);   // where each row starts in fileText (4 bytes per row. Super light.)
let rowCount    = 0;                    // how many rows (not counting the header)
let rowCache    = new Map();            // rows looked at lately: where their commas are (so cutting out a few columns is quick)
let cacheCells  = 0;                    // how many cells are in rowCache, all together (too many? it gets emptied)

let searchText  = null;   // every row squished into small letters, ready to search (made on your first search)
let columnCount = 0;      // how many columns the widest row has
let matches     = [];     // ALL the rows that pass the search, as their row number (0, 1, 2...).  Like: [0, 4, 9]
let allRows     = null;   // the list for "no search": [0, 1, 2, 3 ...] every row. Made once, then reused.
let query       = '';     // the search word, in small letters

let rowHeight   = 30;     // how tall one row is (measured for real later)
let builtStart  = 0;      // the rows that are BUILT right now:
let builtEnd    = 0;      //    from builtStart, up to (but not including) builtEnd

let rowsScaled  = false;  // too many rows to draw at full height? (then the up-and-down scrollbar is "scaled")
let rowsHeight  = 0;      // how tall the rows area REALLY is on the page (never more than MAX_SCROLL_HEIGHT)
let viewY       = 0;      // where you're looking, in "full height" pixels: row 500,000 is at 500,000 x 30
let expectedTop = 0;      // where the brain last PUT the scrollbar. If it's somewhere else, YOU moved it.

let columnWidths  = null; // how wide each column is, in pixels.             Like: [96, 64, 150]
let columnStarts  = null; // where each column STARTS (a running total).    Like: [0, 96, 160, 310]
let sheetWidth    = 0;    // how wide ALL the columns are, added up
let scrollWidth   = 0;    // how wide the scrollable area is (the sheet, or MAX_SCROLL_WIDTH if the sheet is wider)
let builtColStart = 0;    // the columns that are BUILT right now:
let builtColEnd   = 0;    //    from builtColStart, up to (but not including) builtColEnd
let lastColumns   = '';   // the last column list we handed the clothes (so we don't hand over the same one twice)

let searchTimer = null;   // "wait until they stop typing" timer
let searchId    = 0;      // counts every search. Type again while one is running? The old one sees the number changed, and quits.
let doneQuery   = null;   // the last search that FINISHED ...
let doneMatches = null;   // ...and its matches. (Type MORE onto that word, and only these rows get checked.)
let snapTimer   = null;   // "wait until scrolling stops, then snap" timer
let wheelTarget = null;   // the glide's FINISH LINE (null = no glide)
let wheelLeft   = 0;      // leftover wheel spin, not enough for a whole row yet
let glideSpot   = 0;      // exactly where the glide is right now (can be in-between pixels)
let gliding     = false;  // is the glide moving right now?
let glideLast   = 0;      // the time of the glide's last step (0 = it's just starting)

let loadId         = 0;      // counts every file you pick (a NEW file = a new number, so the old one quits)
let fileNote       = '';     // a note added to the "Rows 1–15" words about how the file was read (or nothing)
let buildingSearch = false;  // is the brain getting the search ready right now?
let loaderTimer    = null;   // "wait a moment before showing the loader" timer
```

`[]` = an empty list. `null` = "nothing yet." They're `let` because they'll change later.

> **Why is `matches` just numbers?** Each match is the row's number in the file, counting from `0`. On screen it's that `+ 1`, because the header is row 0. A million plain numbers is MUCH lighter for the browser than a million little `{ num, cells }` objects.

> **Why not keep every row cut into cells?** We used to! It was a list of rows, and each row was a list of cells, like a spreadsheet. Simple, but every cell was its own little string, and each one costs ~20 bytes of "wrapping" even if it's only "42". A 489 MB file took **2 GB** that way. Now it's ONE string (the file, 489 MB) plus 4 bytes per row. Rows get cut up only when they're on screen (Step 2.3b).

| Word | Baby words |
|---|---|
| `Uint32Array` | A list of whole numbers that's super light: exactly 4 bytes each, nothing else. Perfect for a million "where does this row start" numbers. |
| `new Map()` | A list you look things up in by a key. Here: "row 5" → what we remember about row 5. |

<br>

### Step 2.3: Cut a line into cells (`splitIntoCells`)

```text
Easy:    Ana,22,Chicago          →   [Ana] [22] [Chicago]
Tricky:  Ana,22,"Chicago, IL"    →   [Ana] [22] [Chicago, IL]
```

The tricky part: **a comma inside "quotes" is NOT a cut.** So for lines with quotes, the brain walks along one letter at a time, remembering whether it's inside quotes. Lines with NO quotes take a shortcut.

```js
function splitIntoCells(line) {

    // SPEED TRICK: no quotes in this line? Every comma is a cut. Chop it all at once.
    if (line.indexOf('"') === -1) return line.split(',');

    const cells = [];
    let current = '';           // the cell we're building right now
    let insideQuotes = false;   // are we inside "quotes" right now?

    // Walk along the line, one letter at a time.
    for (let i = 0; i < line.length; i++) {

        const letter = line[i];

        if (insideQuotes) {

            if (letter === '"' && line[i + 1] === '"') {
                current += '"';             // "" = a real quote mark
                i++;                        // skip the second one
            } else if (letter === '"') {
                insideQuotes = false;       // closing quote. back to normal.
            } else {
                current += letter;          // anything else (even a comma, even a line break!) is part of the cell
            }

        } else {

            if (letter === '"') {
                insideQuotes = true;        // opening quote
            } else if (letter === ',') {
                cells.push(current);        // a comma = CUT! this cell is done.
                current = '';
            } else {
                current += letter;
            }
        }
    }

    cells.push(current);                    // don't forget the last cell
    return cells;
}
```

| Code | Baby words |
|---|---|
| `line.split(',')` | "Chop at every comma." Super fast, but can't handle quotes. |
| `for (let i = 0; i < line.length; i++)` | "Count from 0 up to the end of the line, one at a time." |
| `line[i]` | The letter at spot number `i` |
| `current += letter` | Stick this letter on the end of the cell |
| `.push(x)` | Add `x` to the end of the list |
| `true` / `false` | Yes / no. `insideQuotes` is like a light switch. |

> **What about a line break inside quotes?** Like `"123 Main St` ⏎ `Apt 4"`. That's ONE cell. This function already keeps it (a line break is just another letter inside quotes). The hard part is making sure the line it gets isn't cut in half first. That's `nextLine`'s job, in Step 2.15.

<br>

### Step 2.3b: Keep the file, not the cells (`measureCells`, `rowText`, `getCells`)

The rows stay inside the file (`fileText`), and `rowStart` says where each one starts (Step 2.2). These 4 helpers get what we need out of it, **without** cutting up every row:

```text
   measureCells   ->  how LONG is each cell?          (for the column widths, while loading)
   rowText(5)     ->  "Fy,Miami,FL"                   (row 5, as it is in the file)
   getCells(5)    ->  ["Fy", "Miami", "FL"]           (row 5 cut into cells: just the columns being built right now)
   rowInfo(5)     ->  where row 5's commas are        (found once, then remembered)
```

```js
// HOW LONG IS EACH CELL? (without cutting the line up)
// No quotes? Then the cells are just the bits between the commas,
// so count the letters between commas. No new strings at all. (Fast + light.)
//     Ana,22,Chicago    ->    3, 2, 7
// Quotes? Then really cut it up (the quotes don't count as letters).
// "longest" is the list of the longest so far, per column. This makes it longer where needed.
function measureCells(line, longest) {

    if (line.indexOf('"') === -1) {

        // Walk the letters one by one: a comma (letter code 44) or the end of the line = a cell ends.
        // (Measured on a 125 MB file: ~15% faster than asking indexOf for every comma. Same answers.)
        let col  = 0;
        let from = 0;                       // where this cell starts
        const end = line.length;

        for (let i = 0; i <= end; i++) {
            if (i === end || line.charCodeAt(i) === 44) {
                const size = i - from;
                if (col >= longest.length) longest.push(size);      // a column we haven't seen yet
                else if (size > longest[col]) longest[col] = size;
                from = i + 1;
                col++;
            }
        }
        return;
    }

    const cells = splitIntoCells(line);

    for (let col = 0; col < cells.length; col++) {
        if (longest[col] === undefined || cells[col].length > longest[col]) {
            longest[col] = cells[col].length;
        }
    }
}


// GET ONE ROW BACK OUT OF THE FILE
// Row 5 starts at rowStart[5]. It ends just before the line break,
// and the next row starts just AFTER that line break (rowStart[6]).
function rowText(i) {

    const start = rowStart[i];
    let end = rowStart[i + 1] - 1;          // the line break that ends this row

    // A Windows \r just before that line break? Leave it off.
    // (The very last row might have no line break at all. Then there's nothing to leave off.)
    if (end < fileText.length && end > start && fileText.charCodeAt(end - 1) === 13) end--;

    return fileText.slice(start, end);
}


// Only the columns being BUILT right now get cut out (builtColStart up to builtColEnd: the sideways treadmill).
// A row with a MILLION columns still only makes about 30 little strings.
//
//     row:      Ana,22,Chicago,IL,60601
//     commas:      3  6       14 17          <- found once, then remembered (4 bytes each)
//     column 2  =  from just after comma 1 (7) to comma 2 (14)  =  "Chicago"
//
// The result only has the built columns in it. (The rest are empty, and nobody looks at them.)
function getCells(i) {

    const info = rowInfo(i);

    if (info.cells) return info.cells;      // a row with quotes: already cut up, all of it

    const cells = [];
    const stop  = Math.min(builtColEnd, info.count);

    for (let col = builtColStart; col < stop; col++) {
        const from = col === 0 ? 0 : info.commas[col - 1] + 1;                 // just after the comma before it
        const to   = col < info.count - 1 ? info.commas[col] : info.line.length;  // up to the comma after it
        cells[col] = info.line.slice(from, to);
    }

    return cells;
}


// Look at a row once, and remember what we need to cut it up fast.
//   No quotes? Remember where every comma is.
//   Quotes?    Cut it all up for real (commas inside quotes don't count, so we can't just use the commas).
function rowInfo(i) {

    let info = rowCache.get(i);
    if (info !== undefined) return info;

    const line = rowText(i);

    if (line.indexOf('"') === -1) {

        let commas = new Uint32Array(16);
        let n = 0;
        let at = line.indexOf(',');

        while (at !== -1) {
            if (n === commas.length) {                      // full? Twice as big.
                const bigger = new Uint32Array(n * 2);
                bigger.set(commas);
                commas = bigger;
            }
            commas[n++] = at;
            at = line.indexOf(',', at + 1);
        }

        info = { line: line, commas: commas, count: n + 1 };   // 3 commas = 4 cells

    } else {
        const cells = splitIntoCells(line);
        info = { cells: cells, count: cells.length };
    }

    // Keep the last rows we looked at (so scrolling back and forth, or sideways, is free).
    // But not TOO many: 1,000 rows, or 20 million cells (very wide rows), whichever comes first.
    // Too many? Start over. (Simple. The rows on screen get looked at again right away.)
    if (rowCache.size >= 1000 || cacheCells + info.count > 20000000) {
        rowCache.clear();
        cacheCells = 0;
    }
    rowCache.set(i, info);
    cacheCells += info.count;

    return info;
}
```

| Code | Baby words |
|---|---|
| `line.indexOf(',', from)` | "Starting at `from`, where's the next comma?" (`-1` = there isn't one) |
| `while (true) { ... return; }` | "Keep going forever... until a `return` says stop." |
| `rowStart[i + 1] - 1` | The next row starts just after this row's line break. So 1 back = the line break itself. |
| `{ line: line, commas: commas, count: n + 1 }` | A little bundle of 3 things about the row, with names. |
| `info.cells` | "Does the bundle have `cells` in it?" Only rows with quotes do. |
| `rowCache.get(i)` / `.set(i, info)` | Look up row `i` / remember `info` for row `i`. |

> **Why does it only cut out the BUILT columns?** A row with a million columns would be a million little strings, just to show the ~30 you can see. Remembering where the commas are (4 bytes each) means any column can be cut out instantly, and only the ones on screen ever are.

> **Why does the cache empty itself?** So it can never grow forever. 1,000 rows is way more than fit on screen (about 45), so normal scrolling is always free. The 20 million cell limit is for super-wide rows: 20 rows × 1,000,000 columns would be too much to keep.

> **Did this change what you SEE?** No. We checked: the old way and the new way store exactly the same cells and column widths for 10 messy test files, and draw exactly the same cells at 8 different scroll spots. Only the memory changed: a 489 MB file went from **2 GB → 0.5 GB** after loading.

<br>

### Step 2.4: How wide is each column? (`setColumnWidths`)

Make each column fit the longest thing in it. Not too skinny (6 letters), not too fat (40 letters).

The longest things get measured **while the file is being cut up** (Step 2.15), and handed over as a list called `longest`. Like `[12, 3, 25]` = 12 letters, 3 letters, 25 letters.

Each column's width gets worked out **in pixels**, and so does where it **starts** (a running total). The sideways treadmill (Step 2.9) needs both, to know which columns are on screen.

```js
function setColumnWidths(longest) {

    const letter = measureLetterWidth();                // how many pixels one letter takes up

    columnWidths = new Float64Array(columnCount);
    columnStarts = new Float64Array(columnCount + 1);   // (a "Float64Array" is a list of numbers that's
                                                        //  super fast and light. Good for a million of them.)

    for (let col = 0; col < columnCount; col++) {

        // Squeeze it between 6 and 40.
        // (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest[col] + 2, 6), 40);

        // The letters +16px for the padding on both sides.
        columnWidths[col] = letters * letter + 16;

        // This column starts where the last one started, plus the last one's width.
        columnStarts[col + 1] = columnStarts[col] + columnWidths[col];
    }

    sheetWidth  = columnStarts[columnCount];
    scrollWidth = Math.min(sheetWidth, MAX_SCROLL_WIDTH);

    builtColStart = 0;                                  // no columns built yet
    builtColEnd   = 0;
    lastColumns   = '';
}


// How wide is one letter, in pixels? Write 100 zeros in the sheet's letters, measure, divide by 100.
// (It's measured off to the side, invisible, so you never see it.)
function measureLetterWidth() {

    const probe = document.createElement('span');
    probe.style.cssText = 'position: absolute; visibility: hidden; white-space: pre; font: ' + getComputedStyle(outputBox).font;
    probe.textContent = '0'.repeat(100);

    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width / 100;
    probe.remove();

    return width || 8;                                  // (couldn't measure? 8 pixels is a good guess)
}
```

**A running total, in a picture:**

```text
   widths:   [ 96 ][ 64 ][   150   ][ 80 ]
   starts:   0     96    160        310   390   ← the last one = the whole sheet's width
```

| Code | Baby words |
|---|---|
| `longest[col]` | The longest thing in column number `col` |
| `Math.max(a, b)` | The BIGGER of the two |
| `Math.min(a, b)` | The SMALLER of the two |
| `new Float64Array(n)` | A list of `n` numbers, all starting at 0. Lighter and faster than a normal list. |
| `'0'.repeat(100)` | "0000...0", 100 zeros |
| `getBoundingClientRect().width` | How wide something really is on screen, in pixels |

> **Why measure while cutting?** The old way looked through EVERY row once for EACH column. 20 columns = 20 trips through the whole file. Measuring while we're already looking at every cell = **1 trip**.

<br>

### Step 2.5: Build one row (`makeRow`)

A row is a line of boxes, like Excel:

```text
   [ # ] [ cell ] [ cell ] [ cell ] ...
     2     Bo       31      Denver
```

```js
function makeRow(num, cells, query, index) {

    // The row itself.
    const row = document.createElement('div');
    row.className = 'line';
    row.dataset.index = index;                                     // a name tag, so Go to row can find it

    if (index % 2 === 1) row.classList.add('zebra');               // every other row: stripe

    // The row number, on the far left.
    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num;
    row.appendChild(numCell);

    // The LEFT spacer (stands in for all the columns to the left that aren't built).
    row.appendChild(document.createElement('span'));

    // One box for every column that's BUILT right now (the sideways treadmill decides which).
    // (If this row is missing some cells, those boxes are just empty.)
    for (let col = builtColStart; col < builtColEnd; col++) {

        const text = cells[col] || '';

        // A HUGE cell? Only use its first SHOW_LETTERS letters, plus "…".
        // (You can only see about 40. All 50 million in the box froze the page.)
        const short = text.length > SHOW_LETTERS ? text.slice(0, SHOW_LETTERS) + '…' : text;

        // A line break inside the cell? Show it as ↵ so the row stays ONE line tall.
        // (Every row MUST be the same height. All the scrolling math counts on it.)
        const shown = /[\r\n]/.test(short) ? short.replace(/\r\n|\r|\n/g, '↵') : short;

        const cell = document.createElement('span');
        cell.className = 'cell';

        if (looksLikeNumber(shown)) cell.classList.add('num');     // numbers go on the right

        if (text.length > 40 || shown !== text) cell.title = short; // too long, or has line breaks? hover to read it

        paintMatches(cell, shown, query);

        row.appendChild(cell);
    }

    // The RIGHT spacer (stands in for all the columns to the right).
    row.appendChild(document.createElement('span'));

    return row;
}
```

**A row, in a picture:**

```text
   [ # ] [left spacer] [ cell ] [ cell ] ... [ cell ] [right spacer]
                        only the columns you can SEE get built (Step 2.9)
```

| Code | Baby words |
|---|---|
| `document.createElement('div')` | Make a brand new piece (not on the page yet) |
| `.className = 'line'` | Give it a group name, so the clothes can find it later |
| `.classList.add('zebra')` | Stick on ANOTHER group name |
| `.dataset.index = index` | A hidden sticky note on the row: "I'm row #index on screen" |
| `index % 2 === 1` | "Is this an odd number?" (`%` = the leftover after dividing.) So every OTHER row gets a stripe. |
| `.title = text` | The little popup when you hover over something |
| `.appendChild(x)` | Put `x` inside this piece |
| `/[\r\n]/.test(short)` | "Is there a `\r` OR a `\n` anywhere in here?" Yes or no. |
| `short.replace(/\r\n\|\r\|\n/g, '↵')` | "Swap EVERY line break for a ↵." `\r\n` (Windows), `\r`, or `\n`, whichever it is. `g` = all of them, not just the first. |
| `a ? b : c` | "Is `a` true? Then `b`. If not, `c`." A tiny if/else in one line. |
| `text.slice(0, SHOW_LETTERS)` | Just the first 1,000 letters |

> **Why only 1,000 letters?** A box is at most 40 letters wide, so you never SEE more than that. But the browser still has to hold and lay out EVERY letter you put in it. One 50-million-letter cell (from a broken file) took the page down. Now it takes about 2 seconds. Why not 40? So search can still paint yellow a little past the edge, and the hover has something to read.

> **Why does `short` (not just `text`) go in the hover?** Same reason. A 50-million-letter popup is just as bad as a 50-million-letter box.

> **Why ALSO catch a lone `\r`?** Cutting at 1,000 letters can land right between the `\r` and the `\n` of a Windows line break, leaving a `\r` all alone at the end.

> **Why ↵ instead of a real line break?** The clothes say `white-space: pre` (Step 3.5), so a real line break would make a second line of words, and that row would be TALLER than the others. The treadmill counts on every row being exactly 30px. One tall row, and every row after it lands in the wrong spot. The ↵ keeps it one line. Hover to see the real thing.

<br>

### Step 2.6: Is it a number? (`looksLikeNumber`)

Excel puts numbers on the RIGHT side of their box. So the brain needs to know what's a number.

```js
function looksLikeNumber(text) {
    return /^\s*[-+]?[$€£]?\d[\d,]*(\.\d+)?%?\s*$/.test(text);
}
```

That scary line is a **pattern** (called a "regex"). You don't need to read it. It just answers:

| Yes, a number | No, not a number |
|---|---|
| `42`  `-7`  `3.14`  `1,200`  `$9.99`  `50%` | `Ana`  `22nd`  `hello` |

<br>

### Step 2.7: Paint the search word yellow (`paintMatches`)

```text
   "Ana,22,ana@ex.com"      searching "ana"
    ^^^    ^^^              ← these get wrapped in <mark>
```

```js
function paintMatches(box, text, query) {

    // No search? Just put the words in.
    if (query === '') {
        box.textContent = text;
        return;
    }

    // Search? Walk along the words. Wrap every match in <mark>.
    const lower = text.toLowerCase();
    let start = 0;
    let found = lower.indexOf(query, start);

    while (found !== -1) {

        box.appendChild(document.createTextNode(text.slice(start, found)));     // words BEFORE the match

        const mark = document.createElement('mark');
        mark.textContent = text.slice(found, found + query.length);            // the match (yellow)
        box.appendChild(mark);

        start = found + query.length;
        found = lower.indexOf(query, start);                                   // look for the next one
    }

    box.appendChild(document.createTextNode(text.slice(start)));               // words AFTER the last match
}
```

| Code | Baby words |
|---|---|
| `<mark>` | The **highlighter pen** of web pages: paints things yellow |
| `indexOf(query)` | "Where is my word?" Gives `-1` if it's not there. |
| `while (found !== -1)` | "Keep going until there are no more matches" |
| `return` | "Stop here. Leave the function." |

> 🔒 **Why not just write HTML into the page?** Because a file could have sneaky code in it. Building real pieces with `textContent` means the file's words are ALWAYS shown as plain words, never run as code.

<br>

### Step 2.8: Draw the header (`drawHeader`)

The header is just a normal row with number **0** and a special label, so the clothes can make it bold and stick it to the top.

It's also the perfect ruler: every row is the same height as the header, so the brain measures it here.

```js
function drawHeader(measure) {

    headerBox.textContent = '';                         // wipe the old one

    const row = makeRow(0, headerCells, '', 0);         // row 0, the column names, no search
    row.classList.add('header-row');

    headerBox.appendChild(row);

    // The header is the same height as every row.
    // Measure it (only for a NEW file: "measure" = true), so the brain knows exactly how tall one row is.
    // (Measuring makes the browser lay out the whole sheet RIGHT NOW. Doing that every time you
    //  scroll sideways was most of the cost of scrolling sideways. The height never changes, so once is enough.)
    if (measure) rowHeight = row.offsetHeight || 30;
}
```

> **`drawHeader(true)` vs `drawHeader()`.** A new file calls `drawHeader(true)` (measure!). Scrolling sideways rebuilds the header with `drawHeader()` (no measuring). Reading a size like `offsetHeight` makes the browser stop and lay out the whole page first. We measured it: skipping that, plus one more check in `updateColumns`, made each sideways rebuild 35% cheaper, and no frames drop anymore.

<br>

### Step 2.9: THE SPEED TRICK 🚀 (`buildVisibleRows` + `buildRows`)

This is what keeps big files from choking.

**The problem:** a file with 200,000 rows × 6 columns = about **1.4 million boxes**. Building all of them freezes the browser. But you only ever SEE about 15 rows!

**The trick:** only build the rows you can see, plus 15 extra above and below. About 45 rows. **Always.** Even for a million-row file.

> **Wait, is the file loaded or not?** YES, the whole file is loaded. When you pick a file, it's read into one long string (`fileText`), and the brain writes down where every row starts (Step 2.3b). The trick only limits how many rows get **drawn** as boxes on the page (and cut into cells). Drawing boxes is the slow part, so the brain only draws what you can see.

Above and below those rows sit the two invisible **spacers** from Step 2.1. They're empty, but stretched as tall as all the rows that AREN'T built. So the scrollbar still looks exactly right.

```text
     ┌──────────────────────┐
     │   top spacer         │  ← empty, but as tall as rows 1–4,980
     ├──────────────────────┤
     │   row 4,981          │
     │   row 4,982          │  ← the ONLY rows that really exist
     │   ...                │
     │   row 5,015          │
     ├──────────────────────┤
     │   bottom spacer      │  ← empty, but as tall as all the rest
     └──────────────────────┘
```

When you scroll, rows that leave get thrown away and rows that come in get built. **Like a treadmill.**

```js
function buildVisibleRows(scrollSpot, scrolledTopNow) {

    if (matches.length === 0) return;

    // 1. Where are we looking?
    //    viewTop     = in full-height pixels (which rows)
    //    scrolledTop = in REAL pixels on the page (where to put them)
    //    (Normal files: the same number. Huge files: see Step 2.20.)
    let viewTop, viewHeight, scrolledTop;

    if (outputBox.classList.contains('expanded')) {
        scrolledTop = -rowsBox.getBoundingClientRect().top;     // how far the rows' top has scrolled above the screen
        viewTop     = pageViewFor(scrolledTop);
        viewHeight  = window.innerHeight;                       // the whole screen
    } else if (scrollSpot !== undefined) {
        knowBox();
        viewTop     = scrollSpot;
        scrolledTop = scrolledTopNow !== undefined ? scrolledTopNow : scrollbarSpotFor(scrollSpot);
        viewHeight  = boxHeight;                                // the window
    } else {
        knowBox();
        viewTop     = readViewY();
        scrolledTop = outputBox.scrollTop;
        viewHeight  = boxHeight;
    }

    // Turn that into row numbers (+ extras), kept inside 0 ... the last row.
    let start = Math.max(0, Math.floor(viewTop / rowHeight) - EXTRA_ROWS);
    let end   = Math.min(matches.length, Math.ceil((viewTop + viewHeight) / rowHeight) + EXTRA_ROWS);

    // How far the rows have to slide so the right row lands at the top of the window.
    // (Normal files: 0. Huge files: the difference between the real and the full-height spot.)
    const slide = scrolledTop - viewTop;
    const area  = rowsScaled ? rowsHeight : matches.length * rowHeight;     // how tall the rows area really is

    // Huge file, near the very top or bottom? Drop extra rows that wouldn't fit in the rows area.
    if (rowsScaled) {
        const firstSeen = Math.floor(viewTop / rowHeight);
        const lastSeen  = Math.ceil((viewTop + viewHeight) / rowHeight);
        while (start < firstSeen && slide + start * rowHeight < 0) start++;
        while (end > lastSeen && slide + end * rowHeight > area) end--;
    }

    // 2 + 3. Swap rows in and out.
    if (start >= builtEnd || end <= builtStart) {

        // Jumped somewhere totally new? Throw ALL the built rows away, build fresh.
        while (topSpacer.nextSibling !== bottomSpacer) topSpacer.nextSibling.remove();
        bottomSpacer.before(buildRows(start, end));

    } else {

        // Scrolled a bit? Only fix the edges.

        // Top edge: rows scrolled off the top → throw away. New rows above → build.
        for (let i = builtStart; i < start; i++) topSpacer.nextSibling.remove();
        if (start < builtStart) topSpacer.after(buildRows(start, builtStart));

        // Bottom edge: rows scrolled off the bottom → throw away. New rows below → build.
        for (let i = builtEnd; i > end; i--) bottomSpacer.previousSibling.remove();
        if (end > builtEnd) bottomSpacer.before(buildRows(builtEnd, end));
    }

    builtStart = start;
    builtEnd = end;

    // 4. Stretch the spacers.
    //    (Huge file? Squeezed to fit, and slid so the right rows land in the window.)
    const above = Math.max(0, slide + start * rowHeight);
    topSpacer.style.height    = above + 'px';
    bottomSpacer.style.height = Math.max(0, area - above - (end - start) * rowHeight) + 'px';
}


// Build rows "from" up to (but not including) "to", in a hidden box, then hand them over all at once.
function buildRows(from, to) {

    const fragment = document.createDocumentFragment();

    for (let i = from; i < to; i++) {
        const spot = matches[i];                // which row this is (in the file)
        fragment.appendChild(makeRow(spot + 1, getCells(spot), query, i));
    }

    return fragment;
}
```

| Code | Baby words |
|---|---|
| `scrollSpot` | Optional: "pretend the window is scrolled HERE." Go to row uses it to build rows BEFORE jumping there. |
| `Math.floor` / `Math.ceil` | Round DOWN / round UP |
| `.nextSibling` / `.previousSibling` | "The piece right after me" / "the piece right before me" |
| `.remove()` | Throw this piece away |
| `.before(x)` / `.after(x)` | Put `x` right before / right after this piece |
| `createDocumentFragment()` | A hidden box to build things in. Dropping them in all at once is much faster than one by one. |

> **Why the extra 15 rows?** So if you scroll fast, the next rows are already built and you never see a blank gap. 15 = a whole window's worth on each side.

<br>

**Part 2: the SIDEWAYS treadmill.** 🔁

Rows aren't the only thing that can get huge. A file with a **million columns** would build a million boxes in EVERY row and crash the page. So columns get the same trick, turned sideways: only build the 20–30 columns you can see, plus a few extra on each side. Two more invisible spacers (the ones in `makeRow`, Step 2.5) fill in for the rest.

```text
   [#] [left spacer] [C501] [C502] ... [C530] [right spacer]
        as wide as    only these get BUILT     as wide as
        columns 1-500                          all the rest
```

> **Up and down is still the main way to move.** The mouse wheel scrolls DOWN through the rows (that's how you read a column). Sideways is only for reading ACROSS a row: **Shift + wheel**, a trackpad swipe, or the scrollbar at the bottom. Same as Excel.

**One problem:** browsers stop **drawing text** past about **8 million pixels** (sooner on sharp, high-resolution screens). A million columns is about 110 million. So past `MAX_SCROLL_WIDTH` (4 million), the sideways scrollbar gets **scaled**: one pixel of scrollbar moves you several pixels through the sheet. (Rows get the same trick in Step 2.20.)

```text
   normal sheet:    scrollbar ████████████████████   =   sheet ████████████████████   (1 to 1)
   GIANT sheet:     scrollbar ████████                =   sheet ██████████████████████████████████████████...
                    (every pixel of scrollbar covers ~14 pixels of sheet)
```

```js
// Where in the SHEET are we looking, for this much scrolling?
// Normal sheet: the same number. Scaled sheet: further along.
function sheetSpot(scrolled, viewWidth) {

    if (scrollWidth === sheetWidth) return scrolled;    // not scaled? 1 pixel = 1 pixel.

    // The first 400 pixels stay 1-to-1 (so the start of the sheet lines up perfectly),
    // then everything after is stretched, so the END of the scrollbar = the END of the sheet.
    const easy = 400;
    const scrollEnd = scrollWidth - viewWidth;
    const sheetEnd  = sheetWidth - viewWidth;

    if (scrolled <= easy || scrollEnd <= easy) return scrolled;

    return easy + (scrolled - easy) * (sheetEnd - easy) / (scrollEnd - easy);
}


// Which column is at this spot in the sheet?
// "Guess the number" again (just like Go to row): look in the middle, throw away the wrong half.
function columnAt(spot) {

    let low  = 0;
    let high = columnCount;

    while (low < high) {
        const middle = Math.floor((low + high) / 2);

        if (columnStarts[middle + 1] <= spot) {
            low = middle + 1;               // that column ends before the spot → look to the right
        } else {
            high = middle;                  // that column reaches the spot → it's this one, or to the left
        }
    }

    return low;
}


// THE WINDOW'S SIZE, REMEMBERED
// Reading a size (or where the scrollbar is) RIGHT AFTER changing the page makes the browser
// stop and measure the whole sheet, right then, in the middle of scrolling.
// So the window's size is measured ONCE, and remembered. It only changes when:
// a new file or search, a flip, Expand, the screen gets resized, or sizeWindow runs.
// Those call boxChanged(), and the next one who asks measures it fresh.
let boxWidth    = 0;        // the window's inside width (without its scrollbar)
let boxHeight   = 0;        // ...and inside height
let headHeight  = 0;        // the header's height
let boxKnown    = false;    // are those up to date?

function boxChanged() {
    boxKnown = false;
}

function knowBox() {
    if (boxKnown) return;
    boxWidth    = outputBox.clientWidth;
    boxHeight   = outputBox.clientHeight;
    headHeight  = headerBox.offsetHeight;
    boxKnown    = true;
}


// Figure out which columns should be built, and hand the clothes the column list.
// "force" = rebuild even if nothing moved (for a new file, or a new search).
function updateColumns(force) {

    if (columnStarts === null || columnCount === 0) return;


    // 1. Where are we looking? (Read BEFORE changing anything: see "THE WINDOW'S SIZE, REMEMBERED".)
    knowBox();
    const viewWidth = Math.max(boxWidth - NUM_WIDTH, 0);                // how much sheet fits beside the row numbers
    const scrolled  = outputBox.scrollLeft;
    const spot      = sheetSpot(scrolled, viewWidth);

    const first = Math.min(columnAt(spot), columnCount - 1);            // the first column you can see
    const last  = Math.min(columnAt(spot + viewWidth) + 1, columnCount); // one past the last column you can see


    // How wide the left spacer has to be, if we start building at column "from".
    // (Put column "from" exactly where it needs to be, so the column at "spot" lands at the left edge.)
    function leftSpace(from) {
        return scrolled - (spot - columnStarts[from]);
    }

    function fits(from, to) {
        const space = leftSpace(from);
        return space >= 0 && space + (columnStarts[to] - columnStarts[from]) <= scrollWidth + 0.5;
    }


    // 2. Do the columns we already built still cover what you can see?
    let from = builtColStart;
    let to   = builtColEnd;

    if (force || from > first || to < last || !fits(from, to)) {

        // No. Pick new ones: the ones you can see, plus extras on each side.
        from = Math.max(0, first - EXTRA_COLUMNS);
        to   = Math.min(columnCount, last + EXTRA_COLUMNS);

        // (Scaled sheet near the start, or near the end? Drop extras that wouldn't fit.)
        while (from < first && leftSpace(from) < 0) from++;
        while (to > last && !fits(from, to)) to--;
    }

    const changed = from !== builtColStart || to !== builtColEnd;
    builtColStart = from;
    builtColEnd   = to;


    // 3. Hand the clothes the column list:
    //    row numbers, left spacer, the built columns, right spacer.
    const left  = Math.max(0, leftSpace(from));
    const right = Math.max(0, scrollWidth - left - (columnStarts[to] - columnStarts[from]));

    const widths = [];
    for (let col = from; col < to; col++) widths.push(columnWidths[col] + 'px');

    const columns = NUM_WIDTH + 'px ' + left + 'px ' + widths.join(' ') + ' ' + right + 'px';

    const fresh = lastColumns === '';                   // the first column list for this layout?

    if (columns !== lastColumns) {
        outputBox.style.setProperty('--columns', columns);
        lastColumns = columns;
    }

    // A NEW layout (a new file, a search, a flip) can change how wide the WINDOW is (it fits the sheet, up to its max-width).
    // Then measure it again, and if the width changed, pick the columns once more, for the new width.
    // Plain scrolling never changes the window's width (the columns + the 2 spacers always add up to the same total),
    // so then there's nothing to measure: no stopping the browser in the middle of scrolling.
    if ((force || fresh) && !updateColumns.again) {
        boxChanged();
        knowBox();
        if (Math.abs(boxWidth - NUM_WIDTH - viewWidth) > 1) {
            updateColumns.again = true;
            updateColumns(force);
            updateColumns.again = false;
            return;
        }
    }


    // 4. New columns? Rebuild the header and the rows that are showing (only ~45 rows, so it's quick).
    if (changed || force) {

        drawHeader();

        if (builtEnd > builtStart) {
            while (topSpacer.nextSibling !== bottomSpacer) topSpacer.nextSibling.remove();
            bottomSpacer.before(buildRows(builtStart, builtEnd));
        }
    }
}
```

**The left spacer is the tricky part.** It has to be exactly wide enough that the column at your "spot" lands right at the left edge of the window:

```text
   scrolled ─────────────────┐
                             ▼  (left edge of what you see)
   [ left spacer ][ C499 ][ C500 ][ C501 ] ...
                  ▲              ▲
          columnStarts[from]    spot
   left spacer = scrolled − (spot − columnStarts[from])
```

On a normal sheet, `spot` = `scrolled`, so the left spacer is just `columnStarts[from]`: as wide as all the columns before it. On a scaled sheet, the spacer slides to keep things lined up.

| Code | Baby words |
|---|---|
| `scrollLeft` | How far the window is scrolled SIDEWAYS (like `scrollTop`, but left-right) |
| `clientWidth` | How wide the inside of the window is (`knowBox` remembers it in `boxWidth`) |
| `knowBox()` / `boxChanged()` | "Measure the window, if it might have changed" / "It might have changed: measure it next time." |
| `function` inside a `function` | `leftSpace` and `fits` live inside `updateColumns`, so they can use `spot` and `scrolled` |
| `updateColumns.again` | A little "I'm already checking again" flag stuck right on the function, so it only re-checks ONCE |
| `.setProperty('--columns', ...)` | Hand the clothes the new column list (Part 3 reads it) |

> **Why only rebuild when the columns change?** Scrolling a few pixels sideways usually keeps the same columns (the extras on each side cover it). Rebuilding ~45 rows is quick, but skipping it when nothing changed is quicker.

> **Why remember the window's size?** The browser measures the page when it draws it, once a frame. But if the brain CHANGES the page and then ASKS a size (or `scrollTop`), the browser has to stop and measure everything right then, and then again when it draws. On a 3,000-column sheet that was most of the cost of a scroll. So: ask first, change after, and remember the sizes that don't change while you scroll. (Measured: the scroll listener's own time went from ~9 ms to ~5 ms at its slowest.)

<br>

### Step 2.10: The "Rows 21–35 of 100" words (`updatePosition`)

```js
// "y" is optional: where you're looking, already read (the scroll listener hands it over).
function updatePosition(y) {

    if (headerCells.length === 0) return;               // no file yet? stop.

    const word = searchInput.value.trim();

    if (matches.length === 0) {
        statusText.textContent = (word === ''
            ? 'This file only has a header row'
            : 'No rows match "' + word + '"') + fileNote;
        return;
    }

    // Every row is the same height.
    // So: how far we scrolled ÷ one row's height = which row is at the top.
    const first = Math.min(Math.round((y === undefined ? readViewY() : y) / rowHeight), matches.length - 1);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    // expanded? you see them all
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    // small? the top row + 14 more

    // matches holds row numbers (0, 1, 2...). Row numbers start at 1 (the header is 0). So: +1.
    let message = 'Rows ' + (matches[first] + 1) + '–' + (matches[last] + 1);

    if (word === '') {
        message += ' of ' + rowCount;
    } else {
        message += ' (' + matches.length + ' matching row(s) for "' + word + '")';
    }

    statusText.textContent = message + fileNote;
}
```

> **What's `fileNote`?** A little extra note about how the file was read, stuck on the end. Usually it's empty (`''`). For an older Excel file it says *"· read as Windows-1252 (an older Excel format)"* (Step 2.15).

| Code | Baby words |
|---|---|
| `scrollTop` | How far down the window is scrolled |
| `a ? b : c` | A tiny if/else: "if `a`, use `b`. Otherwise use `c`." |

<br>

### Step 2.11: Keep the window exactly header + 15 rows (`sizeWindow`)

**Problem:** lots of columns add a sideways scrollbar, and the scrollbar steals space.
**Fix:** measure the scrollbar and give the space back.

**And:** fewer than 15 rows? The window shrinks to fit them. Otherwise a 10-row file gets a 15-row window with empty glass at the bottom, and the sideways scrollbar ends up way down there, often off the screen where you can't reach it.

```js
function sizeWindow() {

    boxChanged();                   // the window's size is about to change: measure it fresh next time
    outputBox.style.height = '';    // start fresh

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;   // how tall the scrollbar is

    // 15 rows (or fewer, if that's all there is)
    const rowsToShow = Math.min(WINDOW_SIZE, matches.length);

    // the header + the rows + the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + rowsToShow * rowHeight + scrollbar) + 'px';
    boxChanged();
}
```

<br>

### Step 2.12: Pick the rows to show (`render`)

This runs after you pick a file AND every time you search. It decides WHICH rows pass the search, then hands them to `showMatches`, which hands off to `buildVisibleRows` (Step 2.9) to actually build them.

The search is done **in bites** (like cutting up the file in Step 2.15), so even a huge file never freezes the page. And when you type MORE onto your word, it only re-checks the rows that already matched (**narrowing**).

```js
function render() {

    // Your search word, in small letters. ("ANA" and "ana" find the same thing.)
    const wanted = searchInput.value.trim().toLowerCase();

    // The first time you search, the search copy isn't ready yet.
    // Get it ready (Step 2.13), and it'll come back here when it's done.
    if (wanted !== '' && searchText === null) {
        buildSearchText();
        return;
    }

    const mySearch = ++searchId;            // this search's number. (Type again? The next one gets a new number.)

    // Pick which rows to show.
    //   No search word?  keep every row. (Use the "every row" list. Make it the first time.)
    //   Search word?     keep only rows that have it.
    // Each match is just the row's number (0, 1, 2...).
    if (wanted === '') {

        if (allRows === null) {
            allRows = new Uint32Array(rowCount);    // [0, 1, 2, 3 ...] (a light list of numbers: 4 bytes each)
            for (let i = 0; i < rowCount; i++) allRows[i] = i;
        }
        doneQuery   = null;
        doneMatches = null;
        showMatches('', allRows);
        return;
    }

    // NARROWING: you typed MORE onto the last word? ("chi" -> "chic")
    // Then only rows that had "chi" can have "chic". Only check THOSE.
    // (Same answer as checking every row. Just way less checking.)
    const pool  = doneQuery !== null && wanted.includes(doneQuery) ? doneMatches : null;    // null = check every row
    const total = pool === null ? rowCount : pool.length;
    const texts = searchText;               // hold on to THIS file's search copy
    const found = [];
    let i = 0;

    // Search in BITES, like cutting up the file, so the page never freezes.
    // (Small file? It's all done in the first bite, so it's instant, same as always.)
    // The old results stay on screen until the new ones are READY. Then they swap in, all at once.
    function searchSome() {

        if (mySearch !== searchId) return;  // you typed again since? This search is old. Stop.

        const stopAt = performance.now() + CHUNK_TIME;

        while (i < total && performance.now() < stopAt) {

            const last = Math.min(i + 500, total);  // (checking the clock every 500 rows, like cutting up the file.
                                                     //  Wide rows are BIG: 500 of square_10000's rows = 25 MB.)
            for (; i < last; i++) {
                const row = pool === null ? i : pool[i];
                if (texts[row].includes(wanted)) found.push(row);
            }
        }

        // More to do? Say how far along we are, let the screen breathe, then take the next bite.
        if (i < total) {
            statusText.textContent = 'Searching for "' + searchInput.value.trim() + '"...  ' + Math.floor(100 * i / total) + '%';
            nextBite(searchSome);
            return;
        }

        // Done! Remember it (for narrowing next time), and swap it in.
        doneQuery   = wanted;
        doneMatches = found;
        showMatches(wanted, found);
    }

    searchSome();                           // take the first bite
}


// SHOW THESE MATCHES: swaps in a search's results, and redraws the window.
// "wanted" = the search word (it paints the yellow). "list" = the rows that passed.
// The word and the rows change TOGETHER, right here.
// (If the word changed sooner, rows built while the search was still running
//  would paint the NEW word on the OLD results.)
function showMatches(wanted, list) {

    query   = wanted;
    matches = list;

    // Start over: wipe the old rows, put the 2 spacers in.
    // (No matches? Leave it totally empty, and the window hides itself.)
    rowsBox.textContent = '';
    builtStart = 0;
    builtEnd = 0;

    if (matches.length > 0) {
        rowsBox.appendChild(topSpacer);
        rowsBox.appendChild(bottomSpacer);
    }

    controls.hidden = false;      // show Go to row + Expand
    updateColumns(true);          // pick the columns to build (and draw the header with them)

    // Too many rows to draw at full height? Then the up-and-down scrollbar gets "scaled" (Step 2.20).
    rowsScaled = matches.length * rowHeight > MAX_SCROLL_HEIGHT;
    rowsHeight = rowsScaled ? MAX_SCROLL_HEIGHT : matches.length * rowHeight;

    sizeWindow();                 // make the window header + 15 rows tall
    setViewY(0);                  // start at the top
    buildVisibleRows();           // build the rows you can see
    updatePosition();             // update the "Rows 1–15" words
}
```

| Code | Baby words |
|---|---|
| `return;` | "Stop here." The rest of `render` doesn't run (yet). |
| `.map(function (cells, i) { return i; })` | "For every row, give me its spot number." = `[0, 1, 2, 3 ...]` |
| `.includes(query)` | "Does this have my word in it?" yes / no |
| `===` | "is exactly equal to" |

> **Why reuse `allRows`?** Clearing the search used to rebuild the "every row" list from scratch. Now it's made once per file, and handed back every time.

> **Why search in bites?** On a 489 MB file, checking every row in one go froze the page for about 0.2 seconds per search, a visible stutter. In bites, the longest freeze is about 0.02 seconds (smooth). The whole search takes a tiny bit longer, because it stops to let the screen breathe. Small files fit in the first bite, so they're exactly as fast as before.

> **Why `searchId`?** Same trick as `loadId` (Step 2.15). Type "denver", then "austin" before "denver" is done: the "denver" search sees the number changed, and quits. Only the newest search ever lands.

> **Why does narrowing give the SAME answer?** If a row has "chic" in it, it MUST have "chi" in it (that's the start of "chic"!). So the rows with "chic" are always somewhere in the "chi" list. Checking only that list can't miss any. It only works when the new word CONTAINS the old one: backspacing ("chic" → "chi") has to check every row again.

> **Why do the old results stay up while it searches?** So the window never shows a half-finished list. The new word and its rows swap in together, in `showMatches`.

| Code | Baby words |
|---|---|
| `++searchId` | Add 1 to `searchId`, and use the NEW number |
| `wanted.includes(doneQuery)` | "Is the old word INSIDE the new one?" `"chic"` has `"chi"` inside it: yes. |
| `a ? b : c` | "Is `a` true? Then `b`. If not, `c`." |
| `pool === null ? i : pool[i]` | No pool? Check row `i`. Pool? Check the `i`-th row IN the pool. |

<br>

### Step 2.13: Get the search ready (`buildSearchText`)

The first time you search, every row gets squished into one small-letter string. Every search after that just checks those strings. (Way faster.)

```text
   ["Ana", "22", "Chicago"]   →   "ana␀22␀chicago"
```

The `␀` is an invisible "wall," so a search can never match ACROSS two cells.

> **`replaceAll(',', '\u0000')`?** For a row with no quotes, cutting it at the commas and gluing it back with walls = just swapping every comma for a wall. Same string, but no cutting at all. (Rows WITH quotes still get cut properly: the commas inside quotes aren't walls.)

On a huge file, squishing a million rows at once would **freeze** the page. So the brain does it in **bites**: work for a moment, let the screen breathe, work again. The loader (Step 2.14) shows how far along it is. When it's done, it runs `render()` again, and the search happens for real.

```js
// One row, ready to search: small letters, with a ␀ wall between the cells.
// No quotes? The cells are just the bits between commas, so swap every comma for a wall.
// (Same answer as cutting it up and gluing it back together. Just no cutting.)
function searchLine(line) {

    if (line.indexOf('"') === -1) return line.replaceAll(',', '\u0000').toLowerCase();

    return splitIntoCells(line).join('\u0000').toLowerCase();
}


function buildSearchText() {

    if (buildingSearch) return;             // already on it? (You typed more while it works.) Don't start twice.
    buildingSearch = true;

    const myLoad = loadId;                  // which file this is for
    const total  = rowCount;                // how many rows THIS file has
    const built  = [];
    let i = 0;

    startLoading('Getting search ready...');


    function squishSomeRows() {

        // You picked a new file in the meantime? This copy is for the old one. Stop.
        if (myLoad !== loadId) {
            buildingSearch = false;
            return;
        }

        const stopAt = performance.now() + CHUNK_TIME;

        while (i < total && performance.now() < stopAt) {

            const last = Math.min(i + 50, total);           // (checking the clock every 50 rows: squishing a WIDE row is slow.
                                                             //  500 of square_10000's rows = 25 MB in one go = a freeze.)

            for (; i < last; i++) {
                built.push(searchLine(rowText(i)));
            }
        }

        setProgress(i / Math.max(total, 1));

        // More to do? Let the screen breathe, then take the next bite.
        if (i < total) {
            nextBite(squishSomeRows);
            return;
        }


        // Done! Keep it, put the loader away, and search for real.
        searchText = built;
        buildingSearch = false;
        finishLoading();
        render();
    }

    squishSomeRows();                       // take the first bite
}
```

**A bite, in a picture:**

```text
   one bite:   work work work work (12 milliseconds) → STOP, let the screen breathe
   next bite:  work work work work (12 milliseconds) → STOP, let the screen breathe
   ...
   the page never freezes, and the pie can fill up in between.
```

| Code | Baby words |
|---|---|
| `performance.now()` | A super-exact stopwatch, in milliseconds |
| `stopAt = performance.now() + CHUNK_TIME` | "This bite ends 12 milliseconds from now." |
| `for (; i < last; i++)` | Keep counting from wherever `i` already is. (Nothing before the first `;` = don't start over.) |
| `.join('\u0000')` | Glue the cells into one string, with an invisible wall (`\u0000`) between them |
| `.toLowerCase()` | Make every letter small |
| `nextBite(squishSomeRows)` | "Run the next bite as soon as the screen has had a chance to update." (See `nextBite`, with the numbers at the top of the brain.) |
| `function` inside a `function` | `squishSomeRows` lives inside `buildSearchText`, so it can see `i`, `rows`, and `built`, and keep going where it left off. |

> **Why check the clock every 500 rows, not every row?** Checking the clock takes a tiny bit of time too. Every 500 rows is often enough to stop on time, and rare enough not to slow things down.

<br>

### Step 2.14: The loader

When a big job runs, the screen **clouds up**, and a **pie circle fills up** all the way around into a solid color. Then the cloud clears.

```text
     ◔   →   ◑   →   ◕   →   ●
    25%     50%     75%    done!  (solid)
```

The brain only needs 3 commands to drive it:

```text
   A big job starts         →  startLoading('Reading the file...')
   The job gets further     →  setProgress(0.5)      (0 = nothing done, 1 = all done)
   The job is finished      →  finishLoading()
```

```js
function startLoading(words) {

    setLoadingLabel(words);
    setProgress(0);
    loader.classList.remove('done');

    // Only show it if the job is still going after a moment.
    clearTimeout(loaderTimer);
    loaderTimer = setTimeout(function () {
        loader.hidden = false;
        void loader.offsetWidth;            // (a trick: make the browser notice it's there, so the cloud can FADE in)
        loader.classList.add('show');
    }, LOADER_DELAY);
}


// Fill the pie. 0.25 = a quarter of the way around. 1 = all the way.
// The clothes turn this number into degrees (see "--done" in Part 3).
function setProgress(amount) {
    loaderPie.style.setProperty('--done', amount);
}


function setLoadingLabel(words) {
    loaderLabel.textContent = words;
}


function finishLoading() {

    clearTimeout(loaderTimer);              // not shown yet? Then it never will be.

    if (!loader.classList.contains('show')) {
        loader.hidden = true;
        return;
    }

    // It's showing: fill the pie all the way (solid!), let you see that for a moment,
    // then clear the cloud.
    setProgress(1);
    loader.classList.add('done');

    loaderTimer = setTimeout(function () {
        loader.classList.remove('show');                    // the cloud fades away...
        loaderTimer = setTimeout(function () {
            loader.hidden = true;                           // ...then it's gone for real.
        }, 250);
    }, 300);
}
```

**Why wait before showing it?** Most files load in a blink. If the loader popped up for every one, it would **flash** on and off for nothing. So `startLoading` sets a 0.15-second timer. If the job finishes first, `finishLoading` cancels the timer, and you never see it at all.

```text
   small file:   start ─── done                (timer cancelled → loader never shows)
                       0.15s
   big file:     start ─────── 0.15s ─────────────────── done
                               ↑ loader shows up          ↑ pie goes solid, cloud clears
```

| Code | Baby words |
|---|---|
| `void loader.offsetWidth` | Asking for its size makes the browser actually put it on the page first. Then adding `show` FADES it in, instead of just appearing. |
| `classList.contains('show')` | "Does it have the `show` label right now?" = "Is it on screen?" |
| `setProperty('--done', amount)` | Leave a note for the clothes: "fill the pie this much." (Same trick as `--columns`!) |

<br>

### Step 2.15: Read the file

Now the brain listens for you picking a file. It cuts the file up **in bites** too, one line at a time, and measures each column's longest thing as it goes.

But first, one question: **which "rulebook" is the file written in?** A file is just numbers (bytes). The rulebook (its *encoding*) says which number is which letter:

| Letter | UTF-8 (modern) | Windows-1252 (older Excel "CSV") |
|---|---|---|
| `A` | `41` | `41` ← same |
| `é` | `C3 A9` (2 bytes) | `E9` (1 byte) |
| `€` | `E2 82 AC` (3 bytes) | `80` (1 byte) |

Plain letters, numbers and commas are the SAME in both. Only special letters differ. Read an old Excel file with the UTF-8 rulebook, and `José` shows up as `Jos�`.

```js
// WHICH "RULEBOOK" IS THIS FILE WRITTEN IN? (its "encoding")
// We read as UTF-8, unless the bytes BREAK UTF-8's rules. Then it must be the older Excel rulebook.
//
// isUtf8(file, howMuch, done): checks the first "howMuch" bytes, a slice at a time,
// with a STRICT decoder that throws an error at the first broken byte.
// Then calls done(true) or done(false).
function isUtf8(file, howMuch, done) {

    const decoder = new TextDecoder('utf-8', { fatal: true });    // fatal = "throw an error, don't put in a �"
    const SLICE   = 16 * 1024 * 1024;                               // 16 MB at a time (so memory stays low)
    const end     = Math.min(howMuch, file.size);
    let at = 0;

    (function next() {

        if (at >= end) {
            // Checked the WHOLE file? Make sure it didn't stop halfway through a letter.
            // (Only checked the start? Stopping halfway is fine. The rest just wasn't checked.)
            if (end === file.size) {
                try { decoder.decode(); } catch (e) { done(false); return; }
            }
            done(true);
            return;
        }

        file.slice(at, Math.min(at + SLICE, end)).arrayBuffer().then(function (bytes) {

            // A UTF-16 file (Excel's "Unicode Text")? It starts with a marker: FF FE or FE FF.
            // The browser spots that marker by itself and reads it right. So: fine.
            const b = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
            if (at === 0 && b.length === 2 && ((b[0] === 0xFF && b[1] === 0xFE) || (b[0] === 0xFE && b[1] === 0xFF))) {
                done(true);
                return;
            }

            at += SLICE;
            try {
                decoder.decode(bytes, { stream: true });    // stream = "a letter might keep going in the next slice"
            } catch (e) {
                done(false);                                // a broken byte: NOT UTF-8
                return;
            }
            next();

        }, function () {
            done(true);     // couldn't even read it? Let the normal reading try (it has its own error message).
        });
    })();
}


// Clear the button every time you CLICK it.
// (The browser only says "change" if you pick a DIFFERENT file. So without this,
//  editing a file in Excel and picking it again would do nothing.)
fileInput.addEventListener('click', function () {
    fileInput.value = '';
});


fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];   // the file you picked
    if (!file) return;                    // clicked Cancel? stop.

    const myLoad = ++loadId;              // this file's number. (Pick another file? It gets a new number.)

    searchInput.disabled = true;          // no searching while the new file loads (it turns back on when it's done)
    startLoading('Reading the file...');  // the loader shows up (if this takes a while)

    const reader = new FileReader();      // a helper that reads files (comes with every browser)

    let encoding     = 'utf-8';           // which rulebook to read it with (decided just before reading, at the bottom)
    let checkedWhole = false;             // did the safety net already check the WHOLE file?

    // While reading: fill the first 20% of the pie.
    reader.onprogress = function (e) {
        if (e.lengthComputable) setProgress(0.2 * e.loaded / e.total);
    };

    // Couldn't read it? Put the loader away, turn search back on (if there's an old file to search),
    // and SAY what happened. (The browser's own reason is no help: it blames "permission problems"
    // even when the file is just too big.)
    function couldNotRead() {

        searchInput.disabled = headerCells.length === 0;
        finishLoading();

        let message = file.size > 500 * 1000 * 1000
            ? 'Couldn\'t open "' + file.name + '": it\'s ' + Math.round(file.size / 1000000) + ' MB, and the browser can only read files up to about 500 MB.'
            : 'Couldn\'t read "' + file.name + '". Was it moved, renamed, or deleted? Try picking it again.';

        if (headerCells.length > 0) message += '  (Your last file is still open.)';

        statusText.textContent = message;
    }

    reader.onerror = function () {
        if (myLoad !== loadId) return;    // you picked a newer file in the meantime? Forget this one.
        couldNotRead();
    };

    // This part waits until the file is DONE reading.
    reader.onload = function (e) {

        if (myLoad !== loadId) return;    // you picked a newer file in the meantime? Forget this one.

        const text = e.target.result;     // the whole file, as one long string

        // The file HAS stuff in it, but we got nothing back? The read failed.
        // (A too-big file read from disk does this: no error, just an empty string.)
        if (text.length === 0 && file.size > 0) {
            couldNotRead();
            return;
        }

        // SAFETY NET: read as UTF-8, but a � showed up?
        // The first 4 MB looked fine, but a broken byte might be further in. Check the WHOLE file for real.
        //   Broken?           Read it again with the older Excel rulebook.
        //   Really UTF-8?     Then the file truly has a � in it. Carry on with this text.
        // (Just seeing a � isn't enough to decide: a UTF-8 file is ALLOWED to have one.)
        if (encoding === 'utf-8' && !checkedWhole && text.indexOf('\uFFFD') !== -1) {

            checkedWhole = true;
            setLoadingLabel('Checking the letters...');

            isUtf8(file, file.size, function (ok) {

                if (myLoad !== loadId) return;  // a newer file? Forget this one.

                if (ok) {
                    reader.onload(e);           // really UTF-8. Run this again (the net is checked now, so it carries on).
                } else {
                    encoding = 'windows-1252';
                    reader.readAsText(file, encoding);
                }
            });
            return;
        }

        let spot = 0;                     // where we are in it


        // Where the next " is in the file (-1 = there are no more).
        // We REMEMBER it, so each quote in the file only gets looked for once.
        let nextQuote = text.indexOf('"');

        // How many quotes from here up to "end"? (And move nextQuote past them.)
        function quotesBefore(end) {
            let count = 0;
            while (nextQuote !== -1 && nextQuote < end) {
                count++;
                nextQuote = text.indexOf('"', nextQuote + 1);
            }
            return count;
        }


        // Cut off the NEXT line, and move "spot" past it.
        // (Windows ends lines with \r\n, Mac and Linux with just \n. This handles both.)
        //
        // A line break INSIDE quotes is part of a cell, not the end of the row:
        //
        //     Ana,"123 Main St       <- 1 quote so far  = ODD  = still inside a cell. Keep going.
        //     Apt 4"                 <- 2 quotes so far = EVEN = the row really ends here.
        //
        // ("" is a real quote mark. It's 2 quotes, so it never changes odd or even.)
        function nextLine() {

            let lineEnd = text.indexOf('\n', spot);         // find the next line break...
            let quotes  = 0;                                // how many " since this row started
            const firstEnd = lineEnd;                       // the FIRST line break (the end, if there were no quotes)

            while (lineEnd !== -1) {

                quotes += quotesBefore(lineEnd);            // count the quotes before this line break

                if (quotes % 2 === 0) break;                // EVEN? outside quotes. This is the real end.

                lineEnd = text.indexOf('\n', lineEnd + 1);  // ODD? inside a cell. Try the next line break.

                // No more line breaks? Count the quotes in the last bit of the file too.
                if (lineEnd === -1) quotes += quotesBefore(text.length);

                // Is it a STRAY quote (like 5'10")? Two ways to tell:
                //   - it's still open WAY past the first line break (no real cell is that long), or
                //   - the file ENDS with it still open (it never closed).
                // Then give up: end the row at the FIRST line break.
                // (And count quotes again from there. The ones we just counted belong to the next rows.)
                const tooFar      = lineEnd - firstEnd > QUOTE_LIMIT;
                const neverClosed = lineEnd === -1 && quotes % 2 === 1;

                if (tooFar || neverClosed) {
                    lineEnd = firstEnd;
                    nextQuote = text.indexOf('"', firstEnd + 1);
                    break;
                }
            }

            const found = lineEnd !== -1;
            if (!found) lineEnd = text.length;              // ...none left? The line goes to the end.

            let cut = lineEnd;
            if (found && text.charCodeAt(cut - 1) === 13) cut--;     // 13 = the \r from Windows. Leave it off.

            const line = text.slice(spot, cut);
            spot = lineEnd + 1;
            return line;
        }


        // Line 0 = the header (the column names). It gets cut into cells.
        // Everything after it = the data rows. For those, we just write down where each one STARTS.
        // (A file that ends with a line break doesn't get an extra empty row at the end.)
        const newHeader = splitIntoCells(spot < text.length ? nextLine() : '');
        let   starts    = new Uint32Array(1024);    // where each row starts (it grows as we go)
        let   count     = 0;                        // how many rows so far

        // While we go, remember the LONGEST thing in each column (for Step 2.4).
        const longest = newHeader.map(function (name) { return name.length; });

        setLoadingLabel('Cutting it into rows...');


        // Go through the rows in BITES, so the page never freezes.
        function cutSomeRows() {

            if (myLoad !== loadId) return;  // a newer file? stop.

            const stopAt = performance.now() + CHUNK_TIME;

            // Go until this bite's time is up (checking the clock every 500 rows).
            while (spot < text.length && performance.now() < stopAt) {

                for (let n = 0; n < 500 && spot < text.length; n++) {

                    // The list is full? Make a new one, twice as big, and copy the old one in.
                    if (count + 1 >= starts.length) {
                        const bigger = new Uint32Array(starts.length * 2);
                        bigger.set(starts);
                        starts = bigger;
                    }

                    starts[count++] = spot;             // write down where this row starts...
                    measureCells(nextLine(), longest);  // ...and how long its cells are
                }
            }

            // Fill the pie: 20% (reading) + up to 75% more (cutting).
            setProgress(0.2 + 0.75 * Math.min(spot / Math.max(text.length, 1), 1));

            // More to do? Let the screen breathe, then take the next bite.
            if (spot < text.length) {
                nextBite(cutSomeRows);
                return;
            }


            // ALL DONE. Now swap in the new file.
            if (count + 1 > starts.length) {   // (room for 1 more: where the LAST row ends)
                const bigger = new Uint32Array(count + 1);
                bigger.set(starts);
                starts = bigger;
            }
            starts[count] = spot;               // where the last row ends (+1, just past its line break)

            headerCells = newHeader;
            fileText    = text;                 // keep the whole file...
            rowStart    = starts;               // ...and where each row starts in it
            rowCount    = count;
            rowCache    = new Map();            // new file = forget the old file's rows
            cacheCells  = 0;
            fileNote    = encoding === 'windows-1252'
                ? '  ·  read as Windows-1252  (an older Excel format)'
                : '';
            columnCount = longest.length;       // the widest row decides how many columns there are
            searchText  = null;                 // new file = throw away the old search copy
            allRows     = null;                 // ...and the old "every row" list
            doneQuery   = null;                 // ...and the last search (its rows were the OLD file's rows)
            doneMatches = null;

            // Clean slate for the new file.
            searchInput.value = '';
            searchInput.disabled = false;       // turn the search bar ON
            jumpInput.value = '';

            setColumnWidths(longest);           // decide how wide each column is
            drawHeader(true);                   // draw row 0 (and measure how tall a row is)
            render();                           // show the rows!
            finishLoading();                    // the pie fills up, and the loader goes away
        }

        cutSomeRows();                          // take the first bite
    };

    // GO! But first: check the first 4 MB. Breaks UTF-8's rules? Use the older Excel rulebook.
    // (4 MB is quick, and almost always enough: the safety net up in onload catches the rest.)
    isUtf8(file, 4 * 1024 * 1024, function (ok) {

        if (myLoad !== loadId) return;      // a newer file? Forget this one.

        encoding = ok ? 'utf-8' : 'windows-1252';
        reader.readAsText(file, encoding);  // start reading
    });
});
```

| Code | Baby words |
|---|---|
| `++loadId` | Add 1 to `loadId`, and use the NEW number |
| `myLoad !== loadId` | "Is my number old?" = "Did you pick another file since?" |
| `reader.onprogress` | Runs every so often WHILE the file is reading. `e.loaded` of `e.total` is done. |
| `text.indexOf('\n', spot)` | "Starting at `spot`, where's the next line break?" (`-1` = there isn't one) |
| `text.slice(a, b)` | The piece of the text from spot `a` up to (but not including) `b` |
| `text.charCodeAt(x)` | The letter at spot `x`, as a number. `13` is the invisible `\r` Windows puts before line breaks. |
| `longest[col] === undefined` | "We've never seen this column before" (a row with MORE cells than any row so far) |
| `quotes % 2 === 0` | "Is the number of quotes EVEN?" (`% 2` = the leftover after dividing by 2. Even numbers leave 0.) |
| `while (...) { ... }` | "Keep doing this, over and over, as long as `...` is true." |
| `break` | "Stop the loop RIGHT NOW, and carry on after it." |

> **Why check the rulebook BEFORE reading?** So a big file only gets read once. Checking the first 4 MB takes about 0.01 seconds, even on a 489 MB file. Real old-Excel text almost never "accidentally" follows UTF-8's rules, so a broken byte = it's the older rulebook.

> **Why a safety net too?** A file can be plain English for the first 4 MB, and have its first `é` way down at row 170,000. The safety net only kicks in if a `�` shows up, and then it checks the WHOLE file for real.

> **Why not just "saw a `�`? Re-read it"?** Because a UTF-8 file is ALLOWED to contain a real `�` (someone typed or pasted one). Re-reading that file with the older rulebook would turn ALL its special letters into garbage (`☕` → `â˜•`). The strict check knows the difference.

> **What about Excel's "CSV UTF-8" and "Unicode Text"?** They start with a hidden marker that says which rulebook they use. The browser reads that marker by itself, so they always worked, and still do.

| Code | Baby words |
|---|---|
| `new TextDecoder('utf-8', { fatal: true })` | A strict UTF-8 reader that throws an error at the first broken byte, instead of quietly putting in a `�`. |
| `file.slice(a, b)` | Just part of the file: from byte `a` to byte `b`. (It doesn't read anything yet.) |
| `.arrayBuffer().then(function (bytes) { ... })` | "Read that part as raw bytes, and when it's done, run this." |
| `try { ... } catch (e) { ... }` | "Try this. If it throws an error, do THIS instead of crashing." |
| `(function next() { ... })()` | Make a function and run it right away. It calls itself again (`next()`) for each slice. |
| `reader.readAsText(file, encoding)` | Read the file as text, using THIS rulebook. |
| `reader.onload(e)` | Run the "done reading" part again, by hand, with the same text. |

> **Why does the list of row starts double when it's full?** A `Uint32Array` can't grow. So when it's full, make one twice as big and copy everything over. Doubling means it only happens about 20 times even for a million rows. (Growing by 1 each time would copy a million times!)

> **Why write down `starts[count] = spot` at the very end?** That's where the LAST row ends. `rowText` (Step 2.3b) finds a row's end by looking at where the NEXT row starts. The last row has no next row, so we write down a pretend one.

> **Why not just cut the whole file into lines at once?** On a giant file, that one step freezes the page by itself. Finding one line break at a time, in bites, keeps the page alive the whole way.

> **Why count quotes to find the end of a row?** Every `"` that OPENS a quoted cell has one that CLOSES it. So after an even number of quotes, every cell is closed, and a line break means "new row." After an odd number, a cell is still open, and the line break belongs inside it. (Real files do this all the time: addresses and notes from Excel or Salesforce often have line breaks in them.)

> **Why remember `nextQuote` instead of just looking each time?** `text.indexOf('"', spot)` keeps looking until it FINDS a quote. In a file with NO quotes, that's all the way to the end of the file... on every single line. A million lines × a 500 MB search = the page freezes forever. Remembering where the next quote is means each quote gets found once, and a file with no quotes costs one search, total.

> **What if a quote NEVER closes?** Like `Bob,5'10"` (inches!). That's 1 quote, so the brain thinks a cell is open, and EVERY line after it would join that one cell. (A 200,000-row test file came out as 1 row.) So the brain calls it a mistake, and ends the row at the first line break, if either:
>
> - **`tooFar`**: the "cell" runs `QUOTE_LIMIT` (32,767) letters past the first line break. That's the most Excel can fit in one cell, so no real cell is longer. *(Catches it fast in a big file.)*
> - **`neverClosed`**: the file ENDS and the quote is still open. *(Catches it in a small file, which ends before 32,767.)*

> **Why count the "last bit of the file" before deciding?** A file doesn't have to end with a line break. In `1,"x⏎y"` the closing quote comes AFTER the last line break. Skip counting it, and the brain would think that quote never closed, and wrongly chop a good cell.

| More code | Baby words |
|---|---|
| `function quotesBefore(end) { ... return count; }` | A helper that counts, and hands back the answer. Used in 2 places, so it's written once. |
| `quotes += ...` | "Add this to `quotes`." Same as `quotes = quotes + ...` |
| `a \|\| b` | "Is `a` OR `b` true?" Either one is enough. |
| `a && b` | "Are `a` AND `b` BOTH true?" |

> **Why does `nextQuote` get reset when it gives up?** While looking for the closing quote, the brain counted quotes that really belong to the NEXT rows. If `nextQuote` stayed way out there, those rows would skip their own quotes, and get odd and even wrong. So it starts counting again right after the first line break.

> **Why clear the file button on `click`?** The browser only says `change` when the file is DIFFERENT from last time. Pick `sales.csv`, fix it in Excel, pick `sales.csv` again... same name = no change = nothing happens. Clearing it when you click means ANY pick counts as new.

> **Why our own error words?** For a too-big file, the browser says *"could not be read, typically due to permission problems"*. That's wrong and scary. The brain checks the size itself: over 500 MB? Say so. Otherwise, the file probably moved or got deleted since you picked it.

> **Why check for an EMPTY result in `onload` too?** Sneaky one. A too-big file from your DISK doesn't fail with `onerror` at all. The browser says "done!" (`onload`) and hands back... an empty string. No error. The brain would think it's an empty file and quietly show nothing. So: the file on disk has stuff in it (`file.size > 0`), but we got nothing back? That's a failed read. Same message. (`couldNotRead` is one helper, so both ways of failing say the same thing.)

> **Why swap everything in at the END?** While the new file is being cut, the old one is still on screen and still works. Nothing changes until the new one is completely ready. Then it all switches at once.

**The big new idea: listeners.**

```text
fileInput.addEventListener('change', function () { ... })
^^^^^^^^^                  ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
WHO to watch               WHAT to    WHAT to do
                           wait for   when it happens
```

A listener is the brain saying: *"Hey Choose File button, when you change, tell me, and I'll do this."*

> **Why `onload`?** Reading a file takes a moment. The brain doesn't wait around. It says "start reading, and when you're DONE, run this." That's `onload`.

<br>

### ✅ Test it

Refresh the page. Pick a CSV file.

You should see the header and the first few rows with their numbers, and "Rows 1–… of …" above them. It'll look **squished together**: no columns, no window. **That's fine!** The clothes in Part 3 turn it into a sheet.

> **Test line breaks inside quotes.** Make a file in Notepad with these 3 lines, save it as `breaks.csv`, and pick it:
>
> ```text
> name,address
> Ana,"123 Main St
> Apt 4"
> ```
>
> You should see **1 row**, not 2. (Once the clothes are on in Part 3, it shows as `123 Main St↵Apt 4`. Hover it to see the real line break.)

> **Test a stray quote.** Same thing, `stray.csv`:
>
> ```text
> name,height
> Bob,5'10"
> Cy,6'1
> Di,5'4
> ```
>
> You should see **3 rows** (Bob, Cy, Di), not 1. Bob's quote never closes, so the brain catches it (`neverClosed`), and Cy and Di stay safe.

> **Test the same file twice.** Pick `breaks.csv`. Change it in Notepad, save, and pick it AGAIN. You should see the change.

> **Test an older Excel file.** In Notepad, type `name,city` then `José,München` on the next line. In **Save As**, set **Encoding** to **ANSI** (that's Windows-1252), and save as `old.csv`. Pick it. You should see `José` and `München` (not `Jos�`), and the words should end with *"· read as Windows-1252 (an older Excel format)"*. Save it again as **UTF-8**, pick it, and the note goes away.

> Picked a REALLY big file? You might see the words "Cutting it into rows..." for a moment. That's the loader, with no clothes yet. Part 3 turns it into the cloud and the pie.

> Want proof it worked? Press **F12**, click **Elements**, and look inside `<div id="rows">`. You'll see the 2 spacer `<div>`s with a bunch of `<div class="line">` rows between them. Even for a huge file, there are only a few dozen. That's the speed trick working!

<br>

### Step 2.16: Search

Every time you type, show the rows again. On a BIG file, wait until you stop typing for a moment first:

```js
searchInput.addEventListener('input', function () {

    if (rowCount <= BIG_FILE) {
        render();
        return;
    }

    clearTimeout(searchTimer);                  // you typed again? cancel the last countdown...
    searchTimer = setTimeout(render, 200);      // ...and start a new one (0.2 seconds).
});
```

| Code | Baby words |
|---|---|
| `'input'` | "Every time a letter is typed or deleted" |
| `setTimeout(fn, 200)` | "Run `fn` in 200 milliseconds (0.2 seconds)" |
| `clearTimeout(timer)` | "Never mind, cancel that" |

<br>

### Step 2.17: Go to row

```js
jumpBtn.addEventListener('click', jumpToLine);

jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpToLine();        // pressing Enter works too
});

function jumpToLine() {

    const target = parseInt(jumpInput.value, 10);       // the number you typed
    if (isNaN(target) || matches.length === 0) return;  // not a number? nothing to show? stop.

    // Find the row with that number. (If it's hidden by a search, go to the next one.)
    // The rows are in order, so play "guess the number": look at the MIDDLE, throw away the wrong half, repeat.
    let low  = 0;
    let high = matches.length;

    while (low < high) {
        const middle = Math.floor((low + high) / 2);

        if (matches[middle] + 1 < target) {
            low = middle + 1;               // too small → the answer is in the top half
        } else {
            high = middle;                  // big enough → the answer is here, or in the bottom half
        }
    }

    let index = low;
    if (index === matches.length) index = matches.length - 1;   // number too big? go to the last row.

    if (outputBox.classList.contains('expanded')) {

        // Expanded? Scroll the PAGE so the row lands in the middle of the screen.
        const rowsTopOnPage = rowsBox.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, rowsTopOnPage + pageSpotFor(index * rowHeight - window.innerHeight / 2));
        buildVisibleRows();

    } else {

        // Small window? Scroll the WINDOW so the row sits right under the header.
        // (Build the rows there FIRST, so the window has something to land on.)
        const top = index * rowHeight;
        buildVisibleRows(top);
        setViewY(top);
    }

    updatePosition();

    // Flash blue. (Take it off, then put it back on, so it plays every time.)
    const row = rowsBox.querySelector('[data-index="' + index + '"]');
    if (!row) return;

    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
}
```

| Code | Baby words |
|---|---|
| `parseInt(x, 10)` | Turn typed text into a whole number |
| `isNaN(x)` | "Is this NOT a number?" |
| `Math.floor((low + high) / 2)` | The spot halfway between `low` and `high`, rounded down |

**"Guess the number," in a picture.** Looking for row 700 out of 1,000:

```text
   guess 1:  middle = 500   too small → throw away the bottom half    (500 left)
   guess 2:  middle = 750   big enough → throw away the top half      (250 left)
   guess 3:  middle = 625   too small → ...                           (125 left)
   ...
   about 10 guesses for 1,000 rows. About 20 guesses for a MILLION rows.
   (Checking them one by one would take up to a million checks.)
```
| `querySelector('[data-index="5"]')` | "Find the row with the sticky note that says 5" (from Step 2.5) |

<br>

### Step 2.18: Expand / Shrink

```js
expandBtn.addEventListener('click', function () {

    // "toggle" = a light switch. On → Off. Off → On.
    const expanded = outputBox.classList.toggle('expanded');

    expandBtn.textContent = expanded ? 'Shrink to 15-row window' : 'Expand (show all)';

    sizeWindow();
    updateColumns();
    buildVisibleRows();
    updatePosition();
});
```

The brain just flips the `expanded` label on and off. The **clothes** decide what "expanded" looks like.

> Even "show all" only BUILDS the rows on your screen. The page just gets as tall as all of them (thanks to the spacers).

<br>

### Step 2.19: When things scroll

```js
// The window scrolls → swap columns (sideways) and rows (up/down), update the words,
// and start a countdown: still for 0.15 seconds? → snap to a whole row (Step 2.20).
outputBox.addEventListener('scroll', function () {

    // READ first, CHANGE after. Where is everything? Ask now, while the page is still measured.
    knowBox();
    const scrolledTop = outputBox.scrollTop;
    const y           = readViewY();

    updateColumns();                        // scrolled sideways? swap columns in and out
    buildVisibleRows(y, scrolledTop);       // scrolled up or down? swap rows in and out
    updatePosition(y);

    clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToRow, 150);
});

// The page scrolls → only matters when expanded.
window.addEventListener('scroll', function () {
    if (outputBox.classList.contains('expanded')) buildVisibleRows();
});

// The browser window changes size → more or fewer rows (and columns) might fit.
window.addEventListener('resize', function () {
    boxChanged();                   // the window may be a new size now
    updateColumns();                // wider screen = more columns fit
    buildVisibleRows();
});
```

<br>

### Step 2.20: Snappy scrolling

The window always stops on a **whole row**. Never half a row. Two parts:

1. **The mouse wheel** picks a spot on a whole row, and the window **glides** there (one click ≈ 3 rows).
2. **Any other scrolling** (dragging the scrollbar, the keyboard) gets a tiny glide to the nearest whole row when it stops.

> **Why doesn't the browser do the snapping?** It can, but it can only snap to rows that are BUILT. Jump far away, and it would yank you back to the nearest built row. The brain knows where EVERY row is, even the ones that aren't built.

<br>

**How the glide stays smooth: ONE glide, moving finish line.**

The wheel doesn't start a new glide every time you spin it. That would stop-and-go on every row and feel stiff. Instead, there's only ever **one** glide, and each spin just **moves the finish line**. The glide keeps going toward wherever the finish line is now.

> Like a dog chasing a ball: throw the ball again, and the dog doesn't stop and restart. It just turns and keeps running.

```text
   spin, spin, spin  →   finish line:  row 4  →  row 7  →  row 10
   the glide         →   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~>   (never stops in the middle)
```

Every 60th of a second, the window moves **25% of the way** to the finish line (that's `GLIDE = 0.25`). Far away = big steps. Almost there = tiny steps. So it speeds off and lands gently.

> **Why "every 60th of a second", and not "every redraw"?** Most screens redraw 60 times a second, but gaming monitors and newer laptops redraw 120 or 144 times. If the glide moved 25% every REDRAW, it would run twice as fast on those screens. So it checks the clock: at 120 Hz, each redraw moves about 13%, and 2 of those = one 25% step. Same glide on every screen, just smoother on the fast ones.

```js
outputBox.addEventListener('wheel', function (e) {

    // Expanded? Scrolling sideways? Holding Shift? Let the browser handle it.
    if (outputBox.classList.contains('expanded')) return;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // Some mice count in "lines" instead of pixels. Turn lines into pixels.
    const pixels = e.deltaMode === 1 ? e.deltaY * rowHeight : e.deltaY;

    const bottom = lowestViewY();
    const now    = readViewY();             // where you're looking right now

    // Already at the very top or bottom? Let the PAGE scroll instead.
    if ((pixels < 0 && now <= 0) || (pixels > 0 && now >= bottom)) return;

    e.preventDefault();                     // "browser, don't scroll. I've got this."

    // No finish line yet? Start from the row we're on now.
    if (wheelTarget === null) {
        wheelTarget = Math.round(now / rowHeight) * rowHeight;
        glideSpot = now;
    }

    // Add up the wheel spin. Every full row's worth → move the finish line one row.
    // (Trackpads send lots of tiny spins. They add up until they make a whole row.)
    wheelLeft += pixels;
    const rows = Math.trunc(wheelLeft / rowHeight);
    if (rows === 0) return;
    wheelLeft -= rows * rowHeight;

    // Move the finish line (but never past the top or the bottom).
    wheelTarget = Math.min(Math.max(wheelTarget + rows * rowHeight, 0), bottom);

    // Not gliding yet? Start the glide. (Already gliding? It just follows the new finish line.)
    if (!gliding) {
        gliding = true;
        requestAnimationFrame(glideStep);
    }

}, { passive: false });     // "passive: false" = "I might say preventDefault, so wait for me."


// ONE STEP of the glide. Runs once per screen redraw.
// requestAnimationFrame hands it the time (t, in milliseconds).
function glideStep(t) {

    // The finish line got cleared? Stop.
    if (wheelTarget === null) {
        gliding = false;
        glideLast = 0;
        return;
    }

    // Someone else moved the window (like dragging the scrollbar)? Let them. Stop gliding.
    if (Math.abs(outputBox.scrollTop - scrollbarSpotFor(glideSpot)) > 2) {
        gliding = false;
        glideLast = 0;
        wheelTarget = null;
        wheelLeft = 0;
        return;
    }

    const gap = wheelTarget - glideSpot;          // how far to the finish line

    // Basically there? Land EXACTLY on the row, and stop.
    if (Math.abs(gap) < 0.5) {
        glideSpot = wheelTarget;
        setViewY(wheelTarget);
        gliding = false;
        glideLast = 0;
        return;
    }

    // How long since the last step? (The first step: pretend a 60th of a second.
    // A long pause, like a busy moment? Count at most a 10th of a second, so it doesn't jump.)
    const passed = glideLast === 0 ? 1000 / 60 : Math.min(t - glideLast, 100);
    glideLast = t;

    // Move 25% of the way there for every 60th of a second that passed.
    // ("Keep 75%, once per 60th of a second" -> 0.75 to the power of how many 60ths passed.)
    glideSpot += gap * (1 - Math.pow(1 - GLIDE, passed / (1000 / 60)));
    setViewY(glideSpot);

    requestAnimationFrame(glideStep);             // same thing again, next redraw
}


function snapToRow() {

    wheelTarget = null;                     // the glide is over
    wheelLeft = 0;

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    // Already on a whole row? Nothing to do.
    // (A hair off, less than a pixel? Just set it EXACTLY: no glide needed.)
    const now = readViewY();
    const nearest = Math.round(now / rowHeight) * rowHeight;
    if (Math.abs(now - nearest) < 1) {
        if (now !== nearest) setViewY(nearest);
        return;
    }

    if (!rowsScaled) {
        outputBox.scrollTo({ top: nearest, behavior: 'smooth' });    // normal file: the browser glides there
        return;
    }

    // Scaled file: the browser can't land on an exact row (its scrollbar is squeezed),
    // so use our own glide instead.
    wheelTarget = nearest;
    glideSpot = now;

    if (!gliding) {
        gliding = true;
        requestAnimationFrame(glideStep);
    }
}
```

<br>

**HUGE files: the scaled up-and-down scrollbar.** 📏

Browsers stop **drawing text** past about **8 million pixels** (sooner on sharp laptop screens). A million rows × 30 pixels = **30 million**. Without this trick, the rows past about row 280,000 scroll by with **no words in them**: the row numbers show, but every cell is blank.

So past `MAX_SCROLL_HEIGHT` (4 million pixels, about 133,000 rows), the rows area is never taller than that, and the scrollbar gets **squeezed**:

```text
   normal file:   scrollbar ██████████████   =   rows ██████████████        (1 to 1)
   HUGE file:     scrollbar ██████           =   rows █████████████████████████████████...
                  (every pixel of scrollbar covers ~7.5 pixels of rows)
```

But the **wheel** still needs to move exactly 3 rows per click, and **land on whole rows**. A squeezed scrollbar can't do that by itself: it can only stop on its own pixels, which are each 7.5 pixels of rows. So the brain keeps its **own exact number** for where you are: `viewY`, in full-height pixels. The wheel, the glide, Go to row, and the "Rows 1–15" words all use `viewY`. The scrollbar just follows along.

```text
   viewY (the brain's exact number):    15,000,000   = exactly row 500,000
              │  squeeze()
              ▼
   scrollbar (squeezed):                   1,999,997  (close enough, it's only for show)
```

**Who moved it?** The brain remembers where it last put the scrollbar (`expectedTop`). If the scrollbar is somewhere else, YOU moved it (dragged it, or used the keyboard), so the brain **stretches** the scrollbar's number back into `viewY`.

```js
// Stretch a squeezed scrollbar number into a full-height one (or the other way).
// The first 2,000 pixels stay 1-to-1, so the top of the file lines up perfectly.
// After that, everything is stretched, so the END of the scrollbar = the END of the file.
function stretch(spot, squeezedEnd, fullEnd) {
    const easy = 2000;
    if (spot <= easy || squeezedEnd <= easy) return spot;
    return easy + (spot - easy) * (fullEnd - easy) / (squeezedEnd - easy);
}

function squeeze(spot, squeezedEnd, fullEnd) {
    const easy = 2000;
    if (spot <= easy || squeezedEnd <= easy) return spot;
    return easy + (spot - easy) * (squeezedEnd - easy) / (fullEnd - easy);
}


// The furthest the window can scroll: squeezed (what the scrollbar knows) and full (the real thing).
function squeezedEnd() { knowBox(); return headHeight + rowsHeight - boxHeight; }
function fullEnd()     { knowBox(); return headHeight + matches.length * rowHeight - boxHeight; }

// The lowest viewY can go (the bottom of the file).
function lowestViewY() {
    return rowsScaled ? fullEnd() : outputBox.scrollHeight - outputBox.clientHeight;
}

// Where the scrollbar should be, for this viewY.
function scrollbarSpotFor(y) {
    return rowsScaled ? squeeze(y, squeezedEnd(), fullEnd()) : y;
}


// Where are you looking? (Read it fresh from the scrollbar, if YOU moved the scrollbar.)
function readViewY() {

    const scrolled = outputBox.scrollTop;

    if (!rowsScaled) {                      // normal file: the scrollbar's number IS the answer
        viewY = scrolled;
        expectedTop = scrolled;
        return viewY;
    }

    // Scrollbar is where the brain put it? Keep the brain's exact number.
    // Somewhere else? You dragged it → stretch the scrollbar's number.
    if (Math.abs(scrolled - expectedTop) > 1.5) {
        viewY = stretch(scrolled, squeezedEnd(), fullEnd());
        expectedTop = scrolled;
    }

    return viewY;
}


// Go look HERE (in full-height pixels).
function setViewY(y) {

    if (!rowsScaled) {                      // normal file: just move the scrollbar
        outputBox.scrollTop = y;
        viewY = y;
        expectedTop = y;
        return;
    }

    viewY = Math.min(Math.max(y, 0), fullEnd());
    expectedTop = scrollbarSpotFor(viewY);
    outputBox.scrollTop = expectedTop;
}


// Expand mode (the whole page scrolls instead of the window): the same squeeze, using the screen's height.
function pageSpotFor(y) {
    return rowsScaled ? squeeze(y, rowsHeight - window.innerHeight, matches.length * rowHeight - window.innerHeight) : y;
}

function pageViewFor(spot) {
    return rowsScaled ? stretch(spot, rowsHeight - window.innerHeight, matches.length * rowHeight - window.innerHeight) : spot;
}
```

**And the rows have to land in the right place.** The scrollbar says "you're 2 million pixels down," but `viewY` says "you're at row 500,000." So the built rows get **slid** (`slide` in Step 2.9) by the difference, and the top spacer is that much shorter. Same idea as the left spacer in the sideways treadmill.

> **Normal files don't change at all.** Under about 133,000 rows, `rowsScaled` is `false`, so `readViewY()` just returns the scrollbar's number, `setViewY()` just moves the scrollbar, and `slide` is 0. Exactly the old way.

| Code | Baby words |
|---|---|
| `e.deltaY` | How far the wheel spun (down = positive, up = negative) |
| `e.preventDefault()` | "Browser, DON'T do your normal thing." |
| `Math.trunc(x)` | Chop off the decimals. `3.7` → `3` |
| `Math.round(x)` | Round to the nearest whole number. `3.7` → `4` |
| `requestAnimationFrame(fn)` | "Run `fn` right before the screen redraws next." Calling it again inside `fn` = a loop that runs once per redraw. |
| `behavior: 'smooth'` | Glide there instead of jumping (used by `snapToRow`) |

<br>

### Step 2.21: The Top button

```js
// Click it → glide back to the top
topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Only show it after you've scrolled down 300 pixels
window.addEventListener('scroll', function () {
    topBtn.hidden = window.scrollY < 300;
});
```

The brain is DONE! 🧠 Now let's make it pretty.

<br>

---

<br>

# PART 3: The Clothes (`styleI.css`)

> ✅ **Every rule in this part was checked against the real `styleI.css`, and they match.**
> If something looks off, open the real file next to this guide and compare.

<br>

### How to read CSS

```text
#output {              ← WHO gets dressed
    color: red;        ← WHAT they wear
}
```

| Symbol | Baby words | Example |
|---|---|---|
| `#name` | ONE piece, by its name tag (`id`) | `#output` → `id="output"` |
| `.name` | A GROUP of pieces, by group name (`class`) | `.cell` → every `class="cell"` |
| `name` | EVERY piece of that kind | `button` → all buttons |
| `a b` | A `b` that's INSIDE an `a` | `.header-row .cell` → cells inside the header |
| `.a.b` | Something with BOTH group names | `.line.zebra` → rows that are also striped |
| `:hover` | "...while the mouse is on it" | `.cell:hover` |

**See-through colors:**

```text
rgba(255, 255, 255, 0.4)
     ^^^^^^^^^^^^^  ^^^
     the color      how solid:  0 = invisible,  1 = totally solid
     (white)
```

<br>

### Step 3.1: The theme colors (Neo-Neutral)

Before we dress anything, we fill a **box of colors with names**. That box is a **theme**. Ours is called **Neo-Neutral**: a strong grey, so the glass really pops.

Put this at the very top of `styleI.css`:

```css
:root,
[data-theme="neo-neutral"] {
    --page:         #b8bcc3;                        /* the page (a deep grey) */
    --text:         #1f2228;                        /* dark text */
    --text-soft:    #3b4048;                        /* the not-as-important words */

    --glass-top:    rgba(238, 240, 244, 0.42);      /* the glass fill, top-left ... */
    --glass-bottom: rgba(170, 176, 186, 0.16);      /* ... fading to this, bottom-right (a little grey in the glass) */
    --glass-edge:   rgba(255, 255, 255, 0.6);       /* the thin shiny edge */

    --line-num-bg:  rgba(206, 210, 217, 0.9);       /* the row-number column */
    --header-bg:    rgba(218, 221, 227, 0.94);      /* the header row */
    --corner-bg:    rgba(198, 203, 211, 0.96);      /* the top-left "0" box */

    --theme-color:  #2a2e35;                        /* the theme's own color (the theme chip + its name) */
    --theme-glow:   rgba(165, 175, 190, 0.95);      /* the glow around it */

    --square-light: rgba(255, 255, 255, 0.5);       /* the theme menu's chessboard: the light squares (frosted, glowing) */
    --square-dark:  rgba(42, 46, 53, 0.82);         /* ...and the dark squares (the theme color, as glass) */

    --control-accent: var(--corner-bg);             /* the buttons' accent squares = the table's own accent (the "0" corner box) */
}
```

> `var(--corner-bg)` inside a color name? Yes! A color name can point at ANOTHER color name. So the buttons always match the table's corner box, even in a new theme.

> The 2 `--square` colors are for the theme menu's **chessboard** (Part 4, Step 4.3). `--square-dark` is the theme color (`#2a2e35` = `42, 46, 53`) made see-through.

**How it works:**

```text
  --page:  #b8bcc3;          ← make a name, give it a color   (the "--" means "this is a name I made up")
  background: var(--page);   ← use the name somewhere else    ("var" = "go look up this name")
```

| Word | Baby words |
|---|---|
| `:root` | The whole page. Names made here work **everywhere**. |
| `[data-theme="neo-neutral"]` | "...when the page is wearing the Neo-Neutral theme." The brain puts this label on the page in Part 4. |
| `--something` | A color with a name. |
| `var(--something)` | "Use the color with this name." |

> **Why bother with names?** So changing the WHOLE look later means changing ONE box of colors, not hunting through the whole file. A new theme = copy this block, change the name and the colors.

<br>

### Step 3.2: The plain page

```css
body {
    font-family: system-ui, Arial, sans-serif;
    background: var(--page);      /* grey, so the glass window shows up */
    color: var(--text);
    margin: 0;
    padding: 20px 16px 80px;      /* space around the edges */
}

h1 {
    text-align: center;
    margin: 10px 0 20px;
}

/* Put these on their own line, in the middle */
#csvFileInput,
#searchInput {
    display: block;
    margin: 0 auto 15px;
}

/* The light squares (where you type, and the file name) */
#csvFileInput,
#searchInput,
#jumpInput {
    box-sizing: border-box;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 14px;
    color: var(--text);
    background: var(--square-light);
    border: 1px solid var(--glass-edge);
    box-shadow:
        inset 0 0 12px rgba(255, 255, 255, 0.8),        /* glowing white from inside */
        0 4px 14px rgba(0, 0, 0, 0.1);                  /* a soft shadow = floating, a little */
    transition: box-shadow 0.15s, filter 0.15s;
}

/* Clicked into it (or Tabbed to it) -> it GLOWS, like a cell you hover in the sheet */
#searchInput:focus,
#jumpInput:focus,
#csvFileInput:focus-visible {
    outline: none;
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.95),
        0 0 14px 2px rgba(255, 255, 255, 0.9);
}

#searchInput::placeholder,
#jumpInput::placeholder {
    color: var(--text-soft);
    opacity: 0.8;
}

/* "Choose File" = ONE bar, two squares: [▓ Choose File] [░ the file's name]
   The input itself is the light square. Its button is the accent square. */
#csvFileInput {
    max-width: 100%;
    padding: 0 14px 0 0;
    line-height: 34px;              /* 34 + the 2px edge = 36 tall, like every control */
    border-radius: 12px;
    overflow: hidden;               /* keep the button's square corners inside the round ones */
    cursor: pointer;
}

/* "::file-selector-button" = the "Choose File" button INSIDE the file input */
#csvFileInput::file-selector-button {
    margin: 0 12px 0 0;
    padding: 0 16px;
    height: 34px;
    border: none;
    border-right: 1px solid rgba(255, 255, 255, 0.6);  /* the white line between the 2 squares */
    background: var(--control-accent);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.55);
    font: inherit;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    transition: filter 0.15s;
}

#csvFileInput:hover::file-selector-button {
    filter: brightness(1.06);
}

/* The search bar = one long light square */
#searchInput {
    width: 100%;
    max-width: 500px;               /* wide, but not TOO wide */
    padding: 0 14px;
    line-height: 34px;              /* 34 + the 2px edge = 36 tall, like every control */
    font-size: 15px;
    border-radius: 12px;            /* round corners */
}

/* Turned off (no file yet)? Fade it, so it LOOKS off too. */
#searchInput:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

#status {
    text-align: center;
    color: var(--text-soft);
    font-size: 14px;
}

/* "flex" lines them up side by side, with NO gaps, so [Row #] [Go to row] join into one bar.
   Expand sits apart: it changes the WHOLE page (a natural "careful" signal). */
#controls {
    display: flex;
    justify-content: center;        /* in the middle */
    align-items: center;
    flex-wrap: wrap;                /* narrow screen? wrap onto the next line */
    margin: 0 0 15px;
}

/* The LEFT half of the bar: round corners on the left only */
#jumpInput {
    width: 90px;
    padding: 0 12px;
    line-height: 34px;
    border-radius: 12px 0 0 12px;
    border-right: 1px solid rgba(255, 255, 255, 0.6);  /* the white line between the 2 squares */
}

/* The RIGHT half: round corners on the right only, and no edge on the left (the line above is the edge) */
#jumpBtn {
    margin: 0;
    border-left: none;
    border-radius: 0 12px 12px 0;
}

#expandBtn {
    margin: 0 0 0 28px;             /* the extra space */
}

/* Every button is an ACCENT square: the table's grey, as glowing glass.
   (The theme chip and the theme menu's rows are buttons too. They undo this with their own rules.) */
button {
    padding: 0 16px;
    margin: 4px;
    line-height: 34px;          /* 34 + the 2px edge = 36 tall, like every control */
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    background: var(--control-accent);
    border: 1px solid var(--glass-edge);
    border-radius: 12px;
    box-shadow:
        inset 0 0 12px rgba(255, 255, 255, 0.55),       /* a soft glow inside */
        0 4px 14px rgba(0, 0, 0, 0.1);                  /* a soft shadow = floating, a little */
    cursor: pointer;            /* the mouse turns into a pointing hand */
    transition: box-shadow 0.15s, filter 0.15s;
}

/* Mouse on it -> a little brighter, and it GLOWS (like a cell you hover in the sheet) */
button:hover {
    filter: brightness(1.06);
    box-shadow:
        inset 0 0 12px rgba(255, 255, 255, 0.7),
        0 0 14px 2px rgba(255, 255, 255, 0.7);
}

/* Tabbed to it -> the same glow, a bit stronger */
button:focus-visible {
    outline: none;
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.95),
        0 0 14px 2px rgba(255, 255, 255, 0.9);
}

/* Pressed -> it sinks a tiny bit */
button:active {
    filter: brightness(0.97);
}

/* Top button: glued to the bottom-right corner */
#topBtn {
    position: fixed;
    right: 20px;
    bottom: 20px;
    box-shadow:                 /* a bigger shadow than the others: it floats over the sheet */
        inset 0 0 12px rgba(255, 255, 255, 0.55),
        0 8px 24px rgba(0, 0, 0, 0.2);
}

/* "hidden" means hidden. Always. */
[hidden] {
    display: none !important;
}
```

`margin: 0 auto` = **"push equally from both sides"** = centered.

**The controls are made of the same parts as the theme menu (Part 4):** glowing glass **squares** with the shiny glass edge. But instead of the theme menu's near-black, the accent squares use the **table's** accent (`--control-accent`, the grey of the "0" corner box):

```text
          ┌─────────────┬──────────────────┐
          │▓ Choose File│░ sample.csv      │        ░ = a light square  -> places you TYPE
          └─────────────┴──────────────────┘        ▓ = an accent square -> places you CLICK
     ┌──────────────────────────────────────────┐
     │░ Search text, numbers, or characters...  │
     └──────────────────────────────────────────┘
          ┌───────┬───────────┐       ┌───────────────────┐
          │░Row # │▓ Go to row│       │▓ Expand (show all)│
          └───────┴───────────┘       └───────────────────┘
```

| Word | Baby words |
|---|---|
| `::file-selector-button` | The "Choose File" button that lives INSIDE a file input. This is the only way to dress it. |
| `display: flex` | Line the pieces up side by side. With no `gap`, they touch, so 2 pieces can look like 1 bar. |
| `border-radius: 12px 0 0 12px` | Round corners on the LEFT only (top-left, top-right, bottom-right, bottom-left). |
| `line-height: 34px` | How tall the line of words is. 34 + the 1px edge on top + 1px on the bottom = 36. Every control is 36 tall, so they all line up. |
| `:disabled` | "...only while it's turned off." |
| `::placeholder` | The grey hint words in an empty box ("Row #"). |

> **Why do the theme menu's buttons look different, if `button` dresses ALL buttons?** The theme chip and the theme rows have their own rules with `#id`s in them. A rule with an `#id` beats a plain `button` rule, so theirs win. (The hexagon has to say `box-shadow: none;` though, or it would get a square glow behind it.)

<br>

### Step 3.3: The glass window

**The math:**

```text
 1 row                 =  29 (the row)  +  1 (the line under it)  =  30 tall
 the header + 15 rows  =  16 rows × 30                            =  480 tall
```

This is the biggest rule. It's split into labeled sections so it's easy to follow:

```css
#output {

    /* SIZE */
    max-width: 900px;
    width: fit-content;               /* only as wide as the sheet needs (up to 900) */
    height: calc(16 * 30px);          /* the header + 15 rows */
    margin: 0 auto;                   /* in the middle */

    /* LETTERS (the same kind of clean font Excel uses) */
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 14px;
    font-variant-numeric: tabular-nums;     /* every number the same width, so columns line up */

    /* SCROLLING */
    overflow: auto;                   /* too much stuff? add a scrollbar */
    position: relative;               /* helps the brain measure where rows are */

    /* THE GLASS LOOK */
    /* The fill: a little white top-left → almost clear bottom-right. That fade = glass. */
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    /* (No "backdrop-filter: blur" here. Behind the window is only the flat grey page,
       and a blurred flat color looks the same. See "Why no blur?" below.) */
    border: 1px solid var(--glass-edge);              /* thin shiny edge */
    border-radius: 18px;                              /* round corners */
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),              /* soft shadow below = floating */
        inset 0 1px 0 rgba(255, 255, 255, 0.9);       /* shiny line on top = light hitting glass */

    /* (No snapping rule here! The BRAIN snaps now. See Step 2.20.) */

    /* THIN SCROLLBAR */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;

    /* FLOATING: bob up and down forever. Don't like it? Delete this line.
       "steps(3)" = inside each of the 10 keyframes below, move in 3 little jumps,
       and DON'T change at all in between. */
    animation: float 6s steps(3) infinite;

    /* "I'm going to MOVE." So the browser draws the window (and its big shadow) ONCE,
       then just slides that finished picture up and down.
       (2 kinds of moving: "translate" for the float, "transform" for the flip in Part 8.) */
    will-change: transform, translate;
}

/* The floating move: up 4 pixels, then back down.
   A smooth float written out as 10 points on the curve (slow at the top and bottom, faster in the middle).
   It moves "translate" (just the sliding), not "transform", so the flip (Part 8) can run at the same time. */
@keyframes float {
    0%, 100% { translate: 0 0; }
    10%, 90% { translate: 0 -0.38px; }
    20%, 80% { translate: 0 -1.38px; }
    30%, 70% { translate: 0 -2.62px; }
    40%, 60% { translate: 0 -3.62px; }
    50%      { translate: 0 -4px; }
}

/* If someone turned off motion on their computer, stay still */
@media (prefers-reduced-motion: reduce) {
    #output { animation: none; }
}

/* When the brain flips on "expanded": no limit, no floating */
#output.expanded {
    height: auto;
    animation: none;
}

/* No rows yet? No window. */
#output:has(#rows:empty) {
    display: none;
}
```

**Making the float cheap** 🔋. A forever-animation runs even when you're doing NOTHING, so every bit of work it does, it does forever. We measured it: with the page just sitting there, how much computer time does it burn every 10 seconds?

| Version | Computer time per 10 idle seconds |
|---|---|
| Smooth float + blur (the old way) | ~4.5 s (almost half of one processor core!) |
| **Stepped float, no blur, `will-change` (now)** | **~0.6 s** |
| No float at all | ~0.05 s |

Three tricks did it:

> **Why no blur?** `backdrop-filter: blur(...)` blurs what's BEHIND a piece. Behind the window is just the flat grey page, and a blurred flat color looks exactly the same. But since the window moves, the browser had to re-blur that whole area every frame, 60 times a second. All that work for nothing you could see. (The theme menu and the loader KEEP their blur: they really do float over other things.)

> **Why `will-change: transform`?** It tells the browser "I'm going to move." So it draws the window once, like a sticker, then just slides the sticker. Without it, the browser might redraw the window on every frame.

> **Why `steps(3)` and 10 keyframes?** The whole float is only 4 pixels over 3 seconds. That's about 0.02 pixels per frame. Nobody can see a move that small, but every frame still costs work. `steps(3)` means "jump, don't glide": about 5 small jumps a second, each less than half a pixel. That still looks smooth. The 10 keyframes keep it slow at the top and bottom (like `ease-in-out` did), because plain `steps` alone would move at the same speed the whole way.

| Word | Baby words |
|---|---|
| `steps(3)` | Don't glide. Make 3 jumps between each keyframe, and stay still in between. |
| `10%, 90% { ... }` | The same spot at 10% of the way through AND at 90% (going up, then coming back down). |
| `will-change: transform` | "Heads up, browser: I'm going to move." |

<br>

### Step 3.4: The header + the rows

```css
/* As wide as all the columns put together */
#header,
#rows {
    width: max-content;
    min-width: 100%;
}

/* The header is STUCK to the top. Rows slide UNDER it.
   z-index: 3 = "stack me on top of the rows."
   (3, not 2: the row numbers are stacked at 2, and they have to slide UNDER the header too.) */
#header {
    position: sticky;
    top: 0;
    z-index: 3;
}

/* One row: [ # ] [ cell ] [ cell ] ...
   The column widths come from the brain's "--columns" note. */
.line {
    display: grid;
    grid-template-columns: var(--columns, 60px 1fr);
    line-height: 29px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
    transition: background 0.15s;     /* color changes fade in smoothly */
}

/* Zebra stripes: the brain puts "zebra" on every other row */
.line.zebra {
    background: rgba(255, 255, 255, 0.15);
}

/* Mouse on a row → it lights up */
.line:hover {
    background: rgba(255, 255, 255, 0.45);
}

/* The row number, on the far left */
.line-num {
    padding: 0 10px;
    text-align: right;
    color: #555;
    background: var(--line-num-bg);   /* almost solid, so cells slide UNDER it */
    border-right: 1px solid rgba(255, 255, 255, 0.6);
    user-select: none;            /* copying text skips the numbers */
    position: sticky;             /* stays stuck on the left when you scroll sideways */
    left: 0;
    z-index: 2;
}
```

> **Why does the BRAIN pick the zebra rows?** CSS has a way to pick "every other row" by itself, but it counts the invisible spacers too, so the stripes would jump around as rows get swapped in and out. The brain knows the real row numbers, so it does the striping.

<br>

### Step 3.5: The cells (Excel boxes) ✨

```css
/* One box in the sheet */
.cell {
    padding: 0 8px;
    border-right: 1px solid rgba(255, 255, 255, 0.5);   /* thin line between boxes = Excel grid lines */
    white-space: pre;             /* the words stay on ONE line */
    overflow: hidden;             /* too long for the box? hide the extra... */
    text-overflow: ellipsis;      /* ...and show "…" instead */
}

/* Numbers sit on the RIGHT side of their box. Just like Excel. */
.cell.num {
    text-align: right;
}

/* Mouse on a box → it GLOWS, like light inside the glass */
.cell:hover {
    background: rgba(255, 255, 255, 0.55);              /* the box gets brighter */
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.95),      /* a shiny white edge */
        0 0 14px 2px rgba(255, 255, 255, 0.9);          /* soft glow spilling out around it */
    position: relative;
    z-index: 1;                   /* on top, so the glow isn't hidden under its neighbors */
}
```

<br>

### Step 3.6: The header row (row 0)

```css
/* A bit more solid than the glass, with a darker line under it */
.header-row,
.header-row:hover {
    background: var(--header-bg);
    border-bottom-color: rgba(0, 0, 0, 0.15);
}

/* Bold goes on the CELLS, not the whole row.
   (Bold letters are wider. A bold row would measure its columns wider
    than the rows below, and they wouldn't line up.) */
.header-row .cell {
    color: #333;
    font-weight: 600;
}

/* No glow on the column names */
.header-row .cell:hover {
    background: none;
    box-shadow: none;
}

/* The top-left corner box (the "0") */
.header-row .line-num {
    background: var(--corner-bg);
}
```

<br>

### Step 3.7: Flash + search yellow

```css
/* Go to row: flash blue, fade back */
.line.flash {
    animation: flash 1.5s ease-out;
}

@keyframes flash {
    from { background: rgba(120, 170, 255, 0.5); }
}

/* Search matches: yellow highlighter */
mark {
    background: #ffe066;
    padding: 0 1px;
    border-radius: 2px;
}
```

<br>

### Step 3.8: The loader (cloud + pie) ⏳

The loader is built like the theme chip you'll make in Part 4: **solid theme color, with a glow**. So they look like they belong together.

```css
/* The cloud: the whole screen, on top of everything. */
#loader {
    position: fixed;
    inset: 0;                       /* fill the whole screen */
    z-index: 20;                    /* above everything (even the theme chip) */

    display: grid;
    place-content: center;          /* the pie + the words sit in the middle */
    justify-items: center;
    gap: 14px;

    background: rgba(255, 255, 255, 0);     /* starts clear ... */
    backdrop-filter: blur(0);
    transition: background 0.25s ease, backdrop-filter 0.25s ease;
}

/* ... then clouds up. */
#loader.show {
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
}


/* "--done" is how much of the pie is filled: 0 = none, 1 = all of it.
   This "@property" tells the browser it's a NUMBER, so the pie can GLIDE instead of jumping. */
@property --done {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
}


/* The pie */
#loaderPie {
    width: 64px;
    height: 64px;
    border-radius: 50%;             /* a circle */

    /* From 12 o'clock: the theme color for (--done × 360 degrees), then see-through white for the rest. */
    background: conic-gradient(
        var(--theme-color) calc(var(--done) * 360deg),
        rgba(255, 255, 255, 0.45) 0
    );

    box-shadow:
        0 0 0 3px rgba(255, 255, 255, 0.9),         /* a white outline (like the theme chip) */
        0 0 18px var(--theme-glow),                 /* a soft glow around it */
        0 8px 20px rgba(0, 0, 0, 0.2);              /* a floating shadow */

    opacity: 0;
    transform: scale(0.8);
    transition: --done 0.15s linear, opacity 0.25s ease, transform 0.25s ease;
}

#loader.show #loaderPie {
    opacity: 1;
    transform: scale(1);            /* pops in */
}

/* Done! The pie is solid now. A little "pulse" to say so. */
#loader.done #loaderPie {
    animation: pie-done 0.3s ease-out;
}

@keyframes pie-done {
    50% { transform: scale(1.1); }
}


/* The words under the pie */
#loaderLabel {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-soft);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.9);  /* a white glow, so they're easy to read on the cloud */
}


/* Turned off motion? No fading, no popping, no gliding. */
@media (prefers-reduced-motion: reduce) {
    #loader,
    #loaderPie { transition: none; }
    #loader.done #loaderPie { animation: none; }
}
```

**The pie, in a picture.** `conic-gradient` paints colors **around** the middle, like a clock hand sweeping from 12 o'clock:

```text
   --done: 0.25                 --done: 1
       12                           12
     ╭─┬──╮                       ╭────╮
     │ │██│  ← theme color         │████│  ← solid!
     │  ╲ │     for 90°           │████│
     ╰────╯                       ╰────╯
   (0.25 × 360° = 90°)          (1 × 360° = 360° = all the way around)
```

| Code | Baby words |
|---|---|
| `backdrop-filter: blur(8px)` | Blur everything BEHIND me. That's the "cloud." |
| `conic-gradient(color X, other 0)` | Color for the first X degrees, then switch to the other color (the `0` means "right away, no fade"). |
| `calc(var(--done) * 360deg)` | Turn the brain's number into degrees. `0.5` → `180deg` = half the pie. |
| `@property` | Tells the browser what KIND of value `--done` is, so it can slide smoothly between amounts. |
| `transition: --done 0.15s linear` | When `--done` changes, glide to the new amount over 0.15 seconds. |
| `.show` / `.done` | Labels the brain puts on the loader. The clothes react to them. |

> **Why does the cloud start "clear" instead of just hidden?** A fade needs a starting point. It starts at `blur(0)` and see-through, and the `show` label moves it to `blur(8px)`. The `transition` makes the browser slide between them = the cloud **rolls in**.

<br>

### ✅ Final test

Refresh. Pick a file. You should have:

- [ ] A floating glass window: the header + exactly 15 rows (a file with fewer rows gets a shorter window, no empty space)
- [ ] Row 0 (column names) in bold, stuck to the top while you scroll
- [ ] Values in neat columns, with numbers on the right
- [ ] `"Chicago, IL"` in ONE box (not split in two)
- [ ] Really long values cut off with "…" (hover to read them)
- [ ] A glow when your mouse is on a box
- [ ] Scrolling that always stops on a whole row
- [ ] "Rows 21–35 of 100" updating as you scroll
- [ ] Search that paints matches yellow
- [ ] Go to row that flashes blue
- [ ] Expand / Shrink
- [ ] A Top button after scrolling down the page
- [ ] A small file: **no** loader at all (it's done before the loader would show up)

**Bonus test: the speed trick.** Make a giant CSV (a spreadsheet app can make one, or ask a teammate for one) and open it. Press **F12** → **Elements** → look inside `<div id="rows">`: only a few dozen rows exist, no matter how big the file is.

**Bonus test: the loader.** Open a REALLY big CSV (hundreds of thousands of rows). You should see:
- [ ] The screen **clouds up** (blurry), with a pie in the middle and "Cutting it into rows..."
- [ ] The pie **fills up** clockwise, from 12 o'clock
- [ ] When it's full, it's **solid**, does a little pulse, and the cloud clears
- [ ] The page never freezes while it works (try moving the mouse over the theme chip: it still reacts)
- [ ] Your FIRST search on that file shows the loader again ("Getting search ready..."). Searches after that are instant.

**Bonus test: a HUGE file** (a million rows):
- [ ] Go to row `1000000` → the last rows show up **with words in every cell** (not blank)
- [ ] The mouse wheel still moves about 3 rows per click and lands on whole rows, even way down at row 600,000
- [ ] Drag the scrollbar to the middle → about row 500,000 shows up, and it snaps to a whole row when you let go

**Bonus test: a REALLY wide file** (thousands, or even a million columns):
- [ ] It opens without crashing
- [ ] The **mouse wheel** still scrolls DOWN through the rows, with the same glide and snap
- [ ] **Shift + wheel** (or a trackpad swipe, or the bottom scrollbar) moves sideways, smoothly
- [ ] The header always matches the columns under it, no matter how far sideways you go
- [ ] Drag the sideways scrollbar all the way right → the very last column shows up
- [ ] Press **F12** → **Elements** → look at one row: only 20–30 cells exist, even if the file has a million columns

**You built it!** 🎉 One more piece to go.

<br>

---

<br>

# PART 4: The Theme Chip ▬

A small dark **glass rectangle** in the top-left corner: the **theme chip**. Click it and it **unfolds** into the **theme menu**: a tiny glass chessboard, made of the same parts as the CSV window. It shows the theme you're wearing (**Neo-Neutral**) in its own color.

```text
   ▬   ← the chip  (a little spaced down, a little spaced over)

        click  →  it grows out of the chip, still dark...  →  ...then the chessboard shows through:

  ┌────┬──────────────────┐
  │ ░░ │▓▓ Theme ▓▓▓▓▓▓▓▓▓│   ← the menu's header row
  │▓▬▓│░░ Neo-Neutral ░✓░│   ← name + check mark = "you're wearing this one"
  └────┴──────────────────┘     (colored like a glowing chessboard: light and dark take turns)
```

This part touches **all 3 files**, because it's a brand-new piece: skeleton, then clothes, then brain.

<br>

### Step 4.1: The skeleton

In `testI.html`, put this at the **very top of `<body>`**, before the `<h1>`:

```html
    <button id="themeChip" title="Theme: Neo-Neutral" aria-haspopup="true" aria-expanded="false" aria-controls="themeMenu"></button>
```

```html
    <div id="themeMenu" class="folded closed" role="menu" aria-label="Themes">
        <p class="menu-title">Theme</p>
        <div id="themeList"></div>
    </div>
```

> **An empty button?** Yes. The chip has no words or pictures: its look is all clothes (Step 4.2).

> **`class="folded closed"`?** The menu is ALWAYS on the page, just folded down to the chip's size and out of sight. Why not hide it for real (`hidden`)? Because the browser needs a real "before" to grow FROM. A menu that pops in from nothing can't unfold smoothly.

<br>

### Step 4.2: The clothes: the chip

Add this to `styleI.css`, right **after** the TOP button rules (`#topBtn`):

```css
#themeChip {
    position: fixed;            /*  glued to the screen, even when you scroll  */
    top: 24px;                  /*  a little spaced down  */
    left: 28px;                 /*  a little spaced over  */
    z-index: 10;                /*  on top of everything  */

    width: 46px;
    height: 22px;
    padding: 0;
    margin: 0;
    border: 1px solid var(--glass-edge);    /*  the same thin shiny edge as the CSV window  */
    border-radius: 6px;

    /*  The theme color, made of GLASS:  the same shine as the CSV window
        (a little white in the top-left, fading to clear)  laid over the color.  */
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 60%),
        var(--theme-color);
    box-shadow:
        0 0 8px var(--theme-glow),                      /*  the theme's glow  */
        0 4px 10px rgba(0, 0, 0, 0.25);                 /*  a floating shadow  */
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

#themeChip:hover {
    filter: none;               /*  undo the "brighter" hover from "ALL THE BUTTONS"  */
    transform: scale(1.08);
    box-shadow:                 /*  glow a little brighter  */
        0 0 14px var(--theme-glow),
        0 4px 10px rgba(0, 0, 0, 0.25);
}

/*  The keyboard ring  (when you Tab to it)  */
#themeChip:focus-visible {
    outline: none;
    box-shadow:
        0 0 0 2px #fff,
        0 0 10px 2px rgba(255, 255, 255, 0.9);
}
```

| Word | Baby words |
|---|---|
| `position: fixed` | Glued to the screen, even when you scroll. |
| `border-radius: 6px` | Rounded corners, like every control on the page. |
| Two backgrounds, with a comma | They stack: the FIRST one is on top. A see-through white shine on top of the solid theme color = glass. |
| `box-shadow: 0 0 8px var(--theme-glow)` | No sideways or downward move (`0 0`), so it's not a shadow, it's a **glow** all around. |
| `transform: scale(1.08)` | Grow 8% bigger. |
| `transition` | Don't jump. Slide into the new look smoothly. |

<br>

### Step 4.3: The clothes: the unfolding menu

The menu is a **tiny sheet**, built from the SAME parts as the CSV window. Same design language everywhere, so the whole page feels like one thing:

| Part of the menu | Borrowed from the CSV window |
|---|---|
| The glass, edge, round corners, shadow | `#output` (Step 3.3), using the same theme colors |
| "Theme" on top | the header row: bold, a line under it (Step 3.6) |
| The empty box top-left | the "0" corner box |
| The column behind the swatch | the row-number column |
| Each theme | a row: 29px + a 1px white line = 30px (Step 3.4) |
| Keyboard focus | the glow a cell gets when you hover it (Step 3.5) |

**Then it's colored like a glowing chessboard** ♟️. Every box is a square, and light and dark take turns, side to side AND top to bottom:

```text
 ┌────┬──────────────────┐
 │ ░░ │▓▓ Theme ▓▓▓▓▓▓▓▓▓│     ░ = light: frosted glass, glowing white from inside
 ├────┼──────────────────┤     ▓ = dark:  the theme color as glass, with a soft rim of its glow
 │▓▬▓│░░ Neo-Neutral ░✓░│
 ├────┼──────────────────┤     Every row flips the one above it,
 │ ░▬ │▓▓ Midnight ▓▓▓▓▓▓│     so a new theme just keeps the board going.
 └────┴──────────────────┘
```

**And it UNFOLDS out of the chip** (the "transmogrify"):

```text
   1. folded:   the chip's exact size, under a DARK cover   ▬
   2. grows:    to full size, still dark                    ▓▓▓▓▓▓▓▓▓▓▓▓
   3. reveals:  the cover fades, the chessboard shows       ░▓ / ▓░
   (closing:    dark cover first, then folds back into the chip)
```

Add this right after the chip rules:

```css
#themeMenu {
    position: fixed;
    top: 24px;                  /*  right where the chip is,  so it grows out of it  */
    left: 28px;
    z-index: 11;                /*  on top of the chip  */
    min-width: 210px;
    overflow: hidden;           /*  keep the header row's corners inside the round corners  */

    /*  The same letters as the CSV window  */
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 14px;

    /*  The same glass as the CSV window  (see #output)  */
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-edge);
    border-radius: 18px;

    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),                /*  soft shadow below  =  floating  */
        inset 0 1px 0 var(--shine, rgba(255, 255, 255, 0.9));         /*  shiny line on the top edge  */

    transform-origin: top left; /*  grow out from the chip's corner  */
    will-change: transform;     /*  "I'm going to grow and shrink":  so it stays smooth  */
    transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);     /*  OPENING:  grow right away,  slowing down softly at the end  */
}

/*  CLOSED:  folded up AND out of sight.  It never really goes away  (display: none),
    so the browser always knows where it's growing FROM.  (Without that, the second unfold could get stuck.)  */
#themeMenu.closed {
    visibility: hidden;         /*  invisible, can't be clicked, and screen readers skip it  */
}

/*  The dark cover  (the chip's own glass),  over everything in the menu.
    Opening:  it fades away AFTER the menu has grown  (that's the 0.16s wait).  */
#themeMenu::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;                 /*  over the squares, the swatch, and the words  */
    border-radius: inherit;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 60%),
        var(--theme-color);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease 0.26s;
}

/*  FOLDED:  shrunk to the chip's size  (the brain measures it:  --fold-x, --fold-y),  and dark.
    Closing:  the cover comes back first,  THEN it folds down  (that's the 0.14s wait).  */
#themeMenu.folded {
    transform: scale(var(--fold-x, 0.2), var(--fold-y, 0.35));
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.14s;
}

#themeMenu.folded::after {
    opacity: 1;
    transition: opacity 0.16s ease;
}


/*  ---- THE CHESSBOARD ----

    Every box in the menu is a SQUARE on a glowing glass chessboard.
    Light and dark take turns, side to side AND top to bottom:

         ┌────┬──────────────────┐
         │ ░░ │▓▓ Theme ▓▓▓▓▓▓▓▓▓│     ░  =  light:  frosted glass, glowing white from inside
         ├────┼──────────────────┤     ▓  =  dark:   the theme color as glass, with a soft rim of its glow
         │▓▬▓│░░ Neo-Neutral ░✓░│
         ├────┼──────────────────┤     Every row flips the one above it,
         │ ░▬ │▓▓ Midnight ▓▓▓▓▓▓│     so a new theme just keeps the board going.
         └────┴──────────────────┘

    The colors are  --square-light  and  --square-dark,  up in the theme block.  */


/*  The "Theme" word on top  =  the HEADER ROW.   A DARK square  (with the light "0" corner box beside it).  */
.menu-title {
    display: grid;
    grid-template-columns: 36px 1fr;
    column-gap: 8px;
    margin: 0;
    line-height: 29px;
    background: linear-gradient(90deg, transparent 36px, var(--square-dark) 36px);  /*  dark only AFTER the corner box,
                                                                                         so the corner sits on plain glass  (like every light square)  */
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);  /*  a soft rim of the theme's glow  */
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    font-weight: 600;
}

/*  The "0" corner box  =  a LIGHT square  */
.menu-title::before {
    content: "";
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));        /*  glowing white from inside  */
    border-right: 1px solid var(--line, rgba(255, 255, 255, 0.6));
}


/*  One theme in the list  =  one ROW of the sheet.
    29px + the 1px white line under it  =  30px.  Just like the CSV window.  */
#themeMenu .theme-option {
    position: relative;
    display: grid;
    grid-template-columns: 36px 1fr auto;      /*  [swatch]  [name]  [✓]  */
    align-items: center;
    column-gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0 12px 0 0;
    font: inherit;              /*  (FIRST:  "font" also resets line-height, so it has to come before it)  */
    line-height: 29px;
    border: none;
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
    border-radius: 0;
    background: none;
    text-align: left;
    transition: background 0.15s;
}

#themeMenu .theme-option:last-child {
    border-bottom: none;        /*  the glass edge is the last line  */
}

/*  The row-number column, behind the swatch  */
#themeMenu .theme-option::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 36px;
    border-right: 1px solid var(--line, rgba(255, 255, 255, 0.6));
}

/*  1st, 3rd, 5th theme...  (the header was dark-on-the-right, so flip it):
    swatch  =  DARK square,   name  =  LIGHT square  */
#themeMenu .theme-option:nth-child(odd) {
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));
}

#themeMenu .theme-option:nth-child(odd)::before {
    background: var(--square-dark);
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);
}

/*  2nd, 4th, 6th theme...  (flip again):
    swatch  =  LIGHT square,   name  =  DARK square  */
#themeMenu .theme-option:nth-child(even) {
    background: var(--square-dark);
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);
}

#themeMenu .theme-option:nth-child(even)::before {
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));
}

/*  On a DARK square, the name turns white and glows in its own theme color
    (so it's easy to read on the dark glass).  */
#themeMenu .theme-option:nth-child(even) .theme-name {
    color: #fff;
    text-shadow: 0 0 2px #fff, 0 0 10px var(--c-glow);
}

/*  Mouse on it  ->  both of its squares light up  */
#themeMenu .theme-option:hover {
    filter: brightness(1.12);
}

/*  Got there with the keyboard  ->  it GLOWS, like a cell you hover in the sheet  */
#themeMenu .theme-option:focus-visible {
    outline: none;
    filter: brightness(1.12);
    box-shadow:
        inset 0 0 0 1px var(--glow-edge, rgba(255, 255, 255, 0.95)),
        0 0 14px 2px var(--glow, rgba(255, 255, 255, 0.9));
    z-index: 1;
}


/*  The tiny chip next to the name:  the theme's chip, small.
    (Too tiny for a glow.  It would just look blurry.)
    2 layers:  the swatch is the shiny edge,  the span inside it is the colored glass.  */
.theme-swatch {
    display: grid;
    place-items: center;
    width: 18px;
    height: 10px;
    justify-self: center;       /*  in the middle of the row-number column  */
    position: relative;
    z-index: 1;                 /*  on top of the row-number column  (the ::before above)  */
    border-radius: 3px;
    background: var(--glass-edge);
}

/*  The same colored glass as the big chip  */
.theme-swatch span {
    width: calc(100% - 3px);
    height: calc(100% - 3px);
    border-radius: 2px;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 60%),
        var(--c);
}


/*  The name, in the theme's own color.  (The brain hands over the color as  --c.)
    Plain like the sheet's words, with just a thin white rim so it stays sharp on the glass.  */
.theme-name {
    font-weight: 600;
    color: var(--c);
    text-shadow: 0 0 2px #fff;
}


/*  The check mark  (only on the theme you're using)  */
.theme-check {
    color: var(--c);
    visibility: hidden;
}

.theme-option[aria-checked="true"] .theme-check {
    visibility: inherit;        /*  "as visible as the menu":  NOT "visible",  or it would show through the closed menu  */
}


/*  Turned off motion?  No growing, no fading:  the menu just appears and disappears.  */
@media (prefers-reduced-motion: reduce) {
    #themeChip,
    #themeMenu,
    #themeMenu.folded,
    #themeMenu.closed,
    #themeMenu::after,
    #themeMenu.folded::after { transition: none; }
}
```

| Word | Baby words |
|---|---|
| `transform-origin: top left` | Grow and shrink from the top-left corner (where the chip is). |
| `scale(var(--fold-x), var(--fold-y))` | Shrink sideways by `--fold-x` and up-and-down by `--fold-y`. The brain measures them so "folded" = exactly the chip's size. |
| `cubic-bezier(0.16, 1, 0.3, 1)` | The SHAPE of the slide: fast at the start, slowing down very softly at the end. That's what makes it feel smooth. |
| `transition: ... 0.26s` (the last number) | WAIT this long first. The cover waits for the menu to finish growing. |
| `will-change: transform` | "Heads up, browser: I'm going to grow and shrink." So it's ready, and stays smooth. |
| `::after` | A fake extra piece at the end. Here: the dark cover over everything. |
| `visibility: hidden` | Invisible, can't be clicked, but still there. |
| `visibility: inherit` (the ✓) | "As visible as my parent." NOT `visible`: a child that says `visible` shows even inside a hidden parent! |
| `::before` | A fake extra piece at the start. Here: the "0" corner box, and the row-number column behind each swatch. |
| `content: ""` | The fake piece has no words. (Without this line, it doesn't show up at all!) |
| `grid-template-columns: 36px 1fr auto` | 3 columns: 36px for the swatch, ALL the leftover room for the name, then just enough for the ✓. |
| `:nth-child(odd)` / `:nth-child(even)` | The 1st, 3rd, 5th... / the 2nd, 4th, 6th... That's how each row knows which way to flip the board. |
| `color-mix(in srgb, var(--theme-glow) 25%, transparent)` | "The theme's glow color, but only 25% as strong." |
| `filter: brightness(1.12)` | Make everything in it 12% brighter: both squares AND the swatch, all at once. |

> **Why does the cover wait, and then the menu fold?** Each state has its OWN timing. Going TO "folded" (closing): the cover comes in fast (0.16s), and the shrinking WAITS 0.14s for it. Coming OUT of "folded" (opening): the menu grows right away (0.42s), and the cover WAITS 0.26s before fading. So it's always: dark while it changes shape, chessboard only when it's still.

> **Why only `transform` and `opacity`?** They're the two cheapest things to animate: the browser can slide and fade a finished picture without redrawing it. That's what keeps it smooth.

> **Why build it from the sheet's parts?** One design language for the whole page. Your eyes already know how to read it. AND it uses the same theme color NAMES (`--glass-top`, `--header-bg`...), so a new theme repaints the menu too, for free.

> **How does the chessboard flip?** Each row is 2 squares: the `::before` (behind the swatch) and the row itself (behind the name). Odd rows paint `::before` dark and the row light. Even rows do the opposite. The header row starts it off: light corner, dark title.

> **Why does the header's dark color start at 36px?** The corner box is drawn INSIDE the header row, and `--square-light` is half see-through. If the whole header row were dark, the corner would be a muddy grey. `linear-gradient(90deg, transparent 36px, var(--square-dark) 36px)` = "see-through for the first 36px, dark after that."

> **Why does the name turn white on a dark square?** Dark theme-colored text on a dark theme-colored square would vanish. White with a glow in the theme's OWN color (`--c-glow`) stays readable.

> **Why `overflow: hidden`?** The header row is a plain rectangle. Without it, its square corners would poke out past the menu's round corners.

<br>

### Step 4.4: The brain

Add this at the **very bottom** of `scriptI.js`:

```js
const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#2a2e35', glow: 'rgba(165, 175, 190, 0.95)' },
    { id: 'neo-dark',    name: 'Neo-Dark',    color: '#d9dbe0', glow: 'rgba(255, 255, 255, 0.14)' },     //  (flat and dark:  its chip is light)
];

const themeChip = document.getElementById('themeChip');     //  the chip  (the small dark rectangle)
const themeMenu = document.getElementById('themeMenu');     //  the menu it unfolds into
const themeList = document.getElementById('themeList');     //  the list of themes inside it

let currentTheme = THEMES[0];                               //  Neo-Neutral is the default
let foldTimer    = null;                                    //  "hide it once it's done folding" timer


//  Put on a theme.
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme.id;      //  <html data-theme="neo-neutral">  ->  styleI.css picks the colors
    themeChip.title = 'Theme: ' + theme.name;
    buildThemeList();                                       //  move the check mark
}


//  Build one button per theme:    [▬]  Neo-Neutral  ✓
function buildThemeList() {
    themeList.innerHTML = '';

    for (const theme of THEMES) {
        const option = document.createElement('button');
        option.className = 'theme-option';
        option.setAttribute('role', 'menuitemradio');
        option.setAttribute('aria-checked', theme === currentTheme);

        //  Hand the colors to the clothes  (see ".theme-name" in styleI.css)
        option.style.setProperty('--c', theme.color);
        option.style.setProperty('--c-glow', theme.glow);

        const swatch = document.createElement('span');
        swatch.className = 'theme-swatch';
        swatch.appendChild(document.createElement('span'));     //  the solid color, inside the outline

        const name = document.createElement('span');
        name.className = 'theme-name';
        name.textContent = theme.name;

        const check = document.createElement('span');
        check.className = 'theme-check';
        check.textContent = '✓';

        option.append(swatch, name, check);

        option.addEventListener('click', function () {
            setTheme(theme);
            closeThemeMenu();
        });

        themeList.appendChild(option);
    }
}


//  Is the menu open?  (Not closed, and not folded up.)
function themeMenuOpen() {
    return !themeMenu.classList.contains('closed') && !themeMenu.classList.contains('folded');
}


//  How small is "folded"?  Exactly the chip's size:  chip width ÷ menu width,  chip height ÷ menu height.
//  The clothes shrink the menu by that much  (--fold-x,  --fold-y).
function measureFold() {
    themeMenu.style.setProperty('--fold-x', themeChip.offsetWidth  / themeMenu.offsetWidth);
    themeMenu.style.setProperty('--fold-y', themeChip.offsetHeight / themeMenu.offsetHeight);
}


//  UNFOLD:  it's already there, folded up  (chip-sized and dark),  just out of sight.
//  Bring it into sight,  then let it grow.
//  (The clothes do the rest:  grow,  THEN the dark cover fades and the chessboard shows.)
function openThemeMenu() {

    clearTimeout(foldTimer);                                //  it was folding up?  Never mind:  grow back.

    if (themeMenu.classList.contains('closed')) {
        measureFold();                                      //  (the right fold size, in case the menu changed)
        themeMenu.classList.remove('closed');               //  into sight,  still folded...
        void themeMenu.offsetWidth;                         //  (make the browser notice that first)
    }

    themeMenu.classList.remove('folded');                   //  ...and grow
    themeChip.setAttribute('aria-expanded', 'true');
    themeList.querySelector('[aria-checked="true"]').focus();   //  so the keyboard is ready to pick
}


//  FOLD UP:  dark cover first,  then shrink back down into the chip.  Then out of sight.
function closeThemeMenu() {

    if (!themeMenuOpen()) return;

    measureFold();
    themeMenu.classList.add('folded');
    themeChip.setAttribute('aria-expanded', 'false');

    //  Out of sight once the folding is done  (0.14s wait + 0.3s to shrink).
    clearTimeout(foldTimer);
    foldTimer = setTimeout(function () { themeMenu.classList.add('closed'); }, 480);
}


//  Click the chip  ->  unfold.   (When it's open, the menu is ON TOP of the chip, so it can't be clicked.)
themeChip.addEventListener('click', function () {
    openThemeMenu();
});


//  Click somewhere that's NOT the menu or the chip  ->  fold up.
document.addEventListener('click', function (event) {
    if (themeMenuOpen() && !themeMenu.contains(event.target) && !themeChip.contains(event.target)) {
        closeThemeMenu();
    }
});


//  Press Escape  ->  fold up, and go back to the chip.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && themeMenuOpen()) {
        closeThemeMenu();
        themeChip.focus();
    }
});


//  Start with the default.  (Then measure how small "folded" is, now that the menu has its theme list.)
setTheme(currentTheme);
measureFold();
```

**How the brain and the clothes talk about themes:**

```text
   brain:    document.documentElement.dataset.theme = 'neo-neutral'
                          │
                          ▼
   page:     <html data-theme="neo-neutral">
                          │
                          ▼
   clothes:  [data-theme="neo-neutral"] { --page: #b8bcc3; ... }   ← "oh! use THESE colors"
```

| Word | Baby words |
|---|---|
| `document.documentElement` | The `<html>` tag. The biggest box on the page. |
| `.dataset.theme = ...` | Stick a `data-theme="..."` label on it. |
| `style.setProperty('--c', ...)` | Leave a color note on one button, for the clothes to read. (Same trick as `--columns`!) |
| `themeChip.offsetWidth / themeMenu.offsetWidth` | "How many times smaller is the chip than the menu?" That's how far to shrink. |
| `classList.remove('closed')`, then `void themeMenu.offsetWidth`, then `remove('folded')` | Bring it into sight STILL folded, make the browser notice, THEN let it grow. (All at once = no growing, it'd just appear.) |
| `setTimeout(..., 480)` | Out of sight once the fold-up is done (0.14s wait + 0.3s shrink, plus a hair). |
| `.contains(event.target)` | "Was the click INSIDE this piece?" |
| `.focus()` | Move the keyboard to this piece, like you clicked into it. |

> **Why can't you click the chip to close it?** When the menu is open, it's ON TOP of the chip (it grew out of it!). Click anywhere else, pick a theme, or press Escape: it folds back down into the chip.

<br>

### Step 4.5: A second theme: Neo-Dark 🌑

**Neo-Dark is dark and FLAT:** a soft black page (black, but not the deepest black), flat panels, no white glows. The fancy thing: the floating glass panels (the Details panel, the theme menu) are **thick glass that bends** whatever is behind them.

```text
   the page              ->  a soft black  (#18191c)
   panels and buttons    ->  flat dark greys,  no glow
   words                 ->  light
   Excel's greens        ->  "forest red",  a deep maroon:  moved to red (hue 355°),
                             just as strong and just as dark as each green:
       #185c37 -> #5c181e  (the button)     #21a366 -> #a3212c  (the ƒ,  the letters line)
   the floating panels   ->  bending glass  (only in Neo-Dark)
```

**1. Give Part 3's glows and lines a name.** Neo-Neutral writes its little white glows and lines right into the clothes, like `rgba(255, 255, 255, 0.45)`. A dark theme has to be able to change them. So in `styleI.css` (after the theme blocks), each one gets a NAME, with the same color as a backup:

```css
border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
```

`var(--line-soft, ...)` = "use the color called `--line-soft`. Nobody set it? Use the backup." Neo-Neutral never sets these names, so it looks exactly the same (we checked, pixel by pixel). Neo-Dark sets them. The names:

| Name | Neo-Neutral's color (the backup) | Where |
|---|---|---|
| `--line-soft` | `rgba(255, 255, 255, 0.45)` | the thin line under rows and panels |
| `--line` | `rgba(255, 255, 255, 0.6)` | the line between 2 joined squares, the row-number column |
| `--line-grid` | `rgba(255, 255, 255, 0.5)` | the lines between cells |
| `--inner-glow` / `-soft` / `-hover` | `0.8` / `0.55` / `0.7` white | "glowing white from inside" |
| `--glow-edge` + `--glow` | `0.95` + `0.9` white | the hover / focus glow (cells, buttons, menu rows, inputs) |
| `--glow-hover` | `0.7` white | a button's hover glow |
| `--shine` | `rgba(255, 255, 255, 0.9)` | the shiny line on top of the glass |
| `--ink` / `--ink-soft` | `#333` / `#555` | words on buttons and headers / row numbers |
| `--zebra`, `--row-hover`, `--hover-fill` | `0.15` / `0.45` / `0.55` white | striped rows, row hover, cell hover |
| `--formula-rim` | `#fff` | the ƒ's thin rim |
| `--cloud`, `--cloud-glow` | `0.18` / `0.9` white | the loader's cloud and its words |

**2. The colors.** Right after the Neo-Neutral block:

```css
[data-theme="neo-dark"] {
    --page:         #18191c;                        /*  the page:  a soft black  */
    --text:         #e3e5e9;                        /*  light words  */
    --text-soft:    #9aa0a9;                        /*  the not-as-important words  */

    --glass-top:    rgba(255, 255, 255, 0.09);      /*  the glass:  clearer than Neo-Neutral's  */
    --glass-bottom: rgba(255, 255, 255, 0.025);
    --glass-edge:   rgba(255, 255, 255, 0.16);

    --line-num-bg:  #212327;                        /*  flat,  solid colors  */
    --header-bg:    #26282d;
    --corner-bg:    #2d3036;

    --theme-color:  #d9dbe0;                        /*  the chip:  a light,  flat rectangle  */
    --theme-glow:   rgba(255, 255, 255, 0.14);

    --square-light: #24262a;                        /*  where you type and read:  a little raised  */
    --square-dark:  #42464f;                        /*  "this one"  (the target,  open buttons):  raised more,  white words  */

    --control-accent: #2a2d32;                      /*  the buttons  */

    --formula:      #a3212c;                        /*  forest red  (the BRIGHT Excel green's twin)  */
    --formula-glow: rgba(163, 33, 44, 0.6);         /*  ...and its glow  */

    --sql:          #3a7eca;                        /*  SQL blue:  the BRIGHTER one  (#336791 is too dark to see on black)  */
    --sql-dark:     #265174;
    --sql-glow:     rgba(58, 126, 202, 0.5);

    --line:         rgba(255, 255, 255, 0.09);      /*  the lines:  barely there  */
    --line-soft:    rgba(255, 255, 255, 0.06);
    --line-grid:    rgba(255, 255, 255, 0.06);
    --inner-glow:       transparent;                /*  no glowing-from-inside  */
    --inner-glow-soft:  transparent;
    --inner-glow-hover: transparent;
    --glow-edge:    rgba(255, 255, 255, 0.32);      /*  hover / focus:  a thin edge,  no glow  */
    --glow:         transparent;
    --glow-hover:   transparent;
    --shine:        rgba(255, 255, 255, 0.07);
    --ink:          #e3e5e9;                        /*  the words on buttons and headers  */
    --ink-soft:     #7d838c;                        /*  the row numbers  */
    --formula-rim:  #18191c;
    --zebra:        rgba(255, 255, 255, 0.025);
    --row-hover:    rgba(255, 255, 255, 0.05);
    --hover-fill:   rgba(255, 255, 255, 0.1);
    --cloud:        rgba(0, 0, 0, 0.35);            /*  the loader's cloud:  dark  */
    --cloud-glow:   rgba(0, 0, 0, 0.9);
}
```

**3. The bending glass.** In `testI.html`, at the very top of `<body>`:

```html
    <svg width="0" height="0" style="position: absolute" aria-hidden="true" focusable="false">
        <filter id="glassWarp" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="2" seed="7" result="ripples"/>
            <feDisplacementMap in="SourceGraphic" in2="ripples" scale="30" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
    </svg>
```

And at the very end of `styleI.css`, just above the `[hidden]` rule:

```css
[data-theme="neo-dark"] #aimRow,
[data-theme="neo-dark"] #themeMenu {
    backdrop-filter: url(#glassWarp) blur(3px);
}

/*  The window:  glassier.  A light catch along the top edge,  and a shadow underneath
    (darker than Neo-Neutral's,  so it shows on the dark page).
    Kept LEAN on purpose:  a bigger, softer shadow  (60px)  and a soft glow inside  (40px)  looked nice,
    but big blurs are slow to redraw:  measured,  they made scrolling and the flip drop frames.  */
[data-theme="neo-dark"] #output {
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        0 12px 40px rgba(0, 0, 0, 0.45);
}

/*  "Spreadsheet View":  forest red  (#5c181e,  the darker Excel green's twin),  solid,  a soft red glow.
    "CSV View":  black,  with a thin edge  (so it doesn't vanish into the dark page).  */
[data-theme="neo-dark"] #viewBtn {
    background: #5c181e;
    box-shadow: 0 0 12px rgba(163, 33, 44, 0.45);
}

[data-theme="neo-dark"] #viewBtn:hover {
    box-shadow: 0 0 18px 2px rgba(163, 33, 44, 0.6);
}

[data-theme="neo-dark"] #viewBtn.to-csv {
    background: #020202;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14), 0 0 12px rgba(255, 255, 255, 0.12);
}

[data-theme="neo-dark"] #viewBtn.to-csv:hover {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.24), 0 0 18px 2px rgba(255, 255, 255, 0.2);
}

/*  "Table View"  (a SQL dump):  stays SQL blue  (not the forest red,  which is Excel's).  */
[data-theme="neo-dark"] #viewBtn.to-table {
    background: var(--sql-dark);
    box-shadow: 0 0 12px var(--sql-glow);
}
```

| Code | Baby words |
|---|---|
| `var(--name, backup)` | "Use this named color. Not set? Use the backup." |
| `transparent` | No color at all. A glow that's `transparent` is simply gone: that's what makes it flat. |
| `<filter>` | An SVG recipe for changing a picture. |
| `feTurbulence` | Makes soft, wavy noise, like the ripples inside thick glass. `baseFrequency` = how close together the waves are. |
| `feDisplacementMap` | Pushes every pixel by the noise: the red part says how far sideways, the green part how far up or down. `scale="30"` = up to 15 pixels each way. |
| `color-interpolation-filters="sRGB"` | Do the math in normal screen colors. (The default bends dark colors toward green: we saw it.) |
| `backdrop-filter: url(#glassWarp) blur(3px)` | Bend what's BEHIND the glass with that recipe, then frost it a little. |

> **Why doesn't the WINDOW bend?** It did, at first. But behind the window there's only the flat page, and bending a flat color looks exactly like not bending it. Meanwhile the bending had to be redone on EVERY frame you scrolled (the rows inside changed): measured, the browser's drawing work went up 4x, and scrolling got choppy. The panels that float OVER the sheet still bend: there you can see it.

> **Why such a plain shadow under the window?** A bigger, softer shadow (60px) and a soft glow inside (40px) looked nice too. But big blurs are slow to redraw: measured, they made scrolling and the flip drop frames now and then. With this lean one, Neo-Dark is as smooth as Neo-Neutral (every frame on time, in every test run).

> **Why is the ƒ the BRIGHT forest red?** Excel's dark green (`#217346`) works on a light page. Its red twin, `#732128`, nearly disappears on a black one. So the ƒ uses `#a3212c`: the twin of Excel's BRIGHT icon green (`#21a366`). Still forest red, just readable.

<br>

### ✅ Test it

Refresh. You should have:

- [ ] A darker grey page than before (that's Neo-Neutral)
- [ ] A small near-black glass rectangle in the top-left, with a soft glow
- [ ] Mouse on it → it grows a little and glows brighter
- [ ] Click it → it grows out of itself, dark... then the chessboard fades in: a dark "Theme" header, and **Neo-Neutral** on a light square with a ✓
- [ ] In the menu, the tiny swatch is a little dark-glass rectangle too
- [ ] Click the name, click anywhere else, or press **Escape** → it goes dark and folds back down into the chip
- [ ] Open it, close it, open it again: it unfolds every time
- [ ] Open a CSV with the menu open: the menu is made of the same glass as the CSV window
- [ ] The menu has 2 themes. Pick **Neo-Dark**: a soft black page, flat dark panels, light words, a deep maroon **Spreadsheet View** button
- [ ] In Neo-Dark, open the Details panel over the sheet: the rows behind it ripple through the glass
- [ ] Pick **Neo-Neutral** again: everything is back to normal

**The CSV reader is done!** 🎉 Six more parts: Part 5 teaches it to open Excel files, Part 6 adds the snap menu, Part 7 adds drag mode, Part 8 adds Spreadsheet View, Part 9 opens SQL dumps, and Part 10 adds a query engine that answers questions in SQL.

<br>

---

<br>

# PART 5: Reading Excel Files (`xlsxI.js`) 📗

So far the reader opens CSV files. Now it opens **Excel files (`.xlsx`)** too.

The trick: we don't teach the whole brain about Excel. We add a **translator**. It turns the first sheet into the same kind of text a CSV file has, and hands it to the brain. Storage, search, scrolling, the treadmills: all of it just works, because the brain only ever sees CSV text.

```text
   a CSV file   ─────────────────────────────────────────────▶  the brain  (Parts 2-4)
   an Excel file ──▶  xlsxI.js  ──▶  CSV text  ───────────────▶  the brain
                       (the translator)
```

The page also makes it impossible to miss that it's NOT a CSV:

```text
   ┌─────────────┬──────────────┐
   │▓ Choose File│░ sales.xlsx  │
   └─────────────┴──────────────┘
      ┌──────────────────────────────┐
      │ XLSX SPREADSHEET  ·  Sheet1  │      ← a dark chessboard square (Part 4's colors)
      └──────────────────────────────┘
   Rows 1–15 of 1000  ·  dates shown as YYYY-MM-DD  (originals kept)
```

This part touches **all 4 files**: a brand-new one (`xlsxI.js`), plus a few changes to the skeleton, the brain, and the clothes.

<br>

### What's inside an .xlsx file?

An `.xlsx` file is really a **zip file** full of text files. (Rename one to `.zip` and you can open it!)

```text
sales.xlsx  (a zip)
├── _rels/.rels                ← "the workbook is at xl/workbook.xml"
├── xl/workbook.xml            ← the sheet names, and which CALENDAR the dates use
├── xl/_rels/workbook.xml.rels ← "sheet rId1 is at worksheets/sheet1.xml" ...
├── xl/worksheets/sheet1.xml   ← the cells:   <c r="B3" s="2"><v>43586</v></c>
├── xl/sharedStrings.xml       ← every word, stored ONCE:   word #4 = "Chicago"
└── xl/styles.xml              ← how numbers LOOK (which ones are dates)
```

**The translator's job, in 4 steps:**

1. **Unzip** (with a guard against "zip bombs").
2. **Read** the words, the styles, and the sheet.
3. **Turn every cell into text** (dates the careful way).
4. **Glue it into CSV text**, and hand it to the brain.

> **Nothing is lost.** The page SHOWS a simple version of each cell (dates as `2019-05-01`, numbers rounded like Excel). But for every cell that looks different from what Excel stored, the **original** is kept: the exact number, the format, the formula. So a future "save back to Excel" can put back exactly what was there.

<br>

### Step 5.1: Plug in the translator (skeleton)

Make a 4th file next to the others: **`xlsxI.js`**. Then 3 changes in `testI.html`.

**1.** The file picker also shows Excel files (add `,.xlsx` to `accept`):

```html
            <input type="file" id="csvFileInput" accept=".csv,.xlsx,.sql" tabindex="-1" aria-hidden="true">
```

...and the badge (and the sheet tabs, Step 5.13) get their spots under the file bar:

```html
    <div id="fileBadge" hidden></div>
    <div id="sheetTabs" role="tablist" aria-label="Sheets" hidden></div>
```

**2.** The translator gets plugged in right **before** the brain (the brain uses it):

```html
    <script src="xlsxI.js"></script>
    <script src="sqlI.js"></script>
    <script src="scriptI.js"></script>
```

| Code | Baby words |
|---|---|
| `accept=".csv,.xlsx"` | The file picker shows CSV AND Excel files. (The `.sql` on the end, and the `sqlI.js` line, come in Part 9. Building in order? Leave them out for now.) |
| `<div id="fileBadge" hidden>` | An empty box for the "XLSX SPREADSHEET" badge. Hidden until an Excel file is open. |
| `<div id="sheetTabs" role="tablist" ...>` | An empty box for the sheet tabs (Step 5.13). `role="tablist"` tells screen readers "these are tabs". |

<br>

### Step 5.2: The top of the translator

Start `xlsxI.js` with the settings. (Everything after this goes in `xlsxI.js` too, in order, until Step 5.9.)

```js
const XLSX_LIMIT = 512 * 1024 * 1024;    //  the most we'll unzip, in total  (bytes).  More than this?  Stop.
                                         //  (Same as the biggest CSV the browser can read anyway.)

const EXCEL_MAX_ROWS = 1048576;          //  Excel's own limits.  An address past these is junk.
const EXCEL_MAX_COLS = 16384;            //  (column XFD)
```

<br>

### Step 5.3: Dates, the careful way 📅

Excel doesn't store dates. It stores **numbers**: how many days since its "day zero." `43586` = `2019-05-01`. A fraction is the time of day: `0.5` = noon.

**3 traps:**

| Trap | What goes wrong | How we avoid it |
|---|---|---|
| **The day that never was** | Excel thinks **February 29, 1900** existed. It didn't (1900 wasn't a leap year). It's a famous bug, kept on purpose so old Lotus 1-2-3 files still work. Every date before it is one day off. | Number `60` is the fake day. Numbers below 60 get one less. |
| **Two calendars** | Some files (old Mac Excel) count from **1904**. Same number, 4 years apart! | The workbook says which (`date1904`), and we use the right one. |
| **Time zones** | JavaScript's own `Date` quietly shifts dates by your time zone and daylight saving. A date can come out one day early. | We don't use `Date` at all. Just **whole-number math**: same answer on every computer. |

```js
const EXCEL_LAST_DAY = 2958465;          //  9999-12-31,  the last date Excel knows


//  Days since 1970-01-01  ->  [year, month, day].
//  (A well-known recipe, "civil from days":  whole numbers only, works for any day.)
function civilFromDays(z) {

    z += 719468;                                        //  count from March 1, year 0  (so the leap day is the LAST day of a year)
    const era = Math.floor(z / 146097);                 //  400-year blocks  (146,097 days each)
    const doe = z - era * 146097;                       //  day of the block            [0, 146096]
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));   //  day of the year  [0, 365]
    const mp  = Math.floor((5 * doy + 2) / 153);       //  month, counting from March  [0, 11]

    const day   = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const month = mp < 10 ? mp + 3 : mp - 9;
    const year  = yoe + era * 400 + (month <= 2 ? 1 : 0);

    return [year, month, day];
}


//  [year, month, day]  ->  days since 1970-01-01.   (The same recipe, backwards.)
function daysFromCivil(year, month, day) {

    const y   = month <= 2 ? year - 1 : year;           //  January and February count as the END of last year
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;

    return era * 146097 + doe - 719468;
}


//  Excel's day number  ->  [year, month, day].
//  "date1904"  =  does this file use the 1904 calendar?
function excelDayToDate(serial, date1904) {

    if (date1904) return civilFromDays(serial - 24107);     //  1904 calendar:  day 0 = 1904-01-01.  No fake day.

    if (serial === 0)  return [1900, 1, 0];                 //  day 0:  Excel shows it as "January 0, 1900"
    if (serial === 60) return [1900, 2, 29];                //  THE DAY THAT NEVER WAS
    if (serial < 60)   return civilFromDays(serial - 25568);    //  before it:  one less to skip over
    return civilFromDays(serial - 25569);                       //  after it:   1970-01-01 is day 25569
}


//  [year, month, day]  ->  Excel's day number.   (Backwards.  For saving back to Excel, someday.)
function dateToExcelDay(year, month, day, date1904) {

    if (date1904) return daysFromCivil(year, month, day) + 24107;

    if (year === 1900 && month === 1 && day === 0)  return 0;
    if (year === 1900 && month === 2 && day === 29) return 60;     //  the day that never was

    const serial = daysFromCivil(year, month, day) + 25569;
    return serial <= 60 ? serial - 1 : serial;                     //  before the fake day?  one less
}


//  2 digits, with a 0 in front if needed:   7  ->  "07"
function two(n) {
    return n < 10 ? '0' + n : String(n);
}


//  A date cell, as text.   "kind" says what the cell's format shows:
//      'date'      ->  2019-05-01
//      'datetime'  ->  2019-05-01 13:08          (+ ":45" if the format shows seconds)
//      'time'      ->  13:08                     (time of day)
//      'elapsed'   ->  37:30                     (a format like [h]:mm:  hours keep counting past 24)
//  Not a real Excel date  (negative, or after 9999)?  Gives back null, and the cell shows as a plain number.
function excelDateText(value, kind, seconds, date1904) {

    if (!(value >= 0) || value >= EXCEL_LAST_DAY + 1) return null;

    let days = Math.floor(value);
    let secs = Math.round((value - days) * 86400);      //  the fraction  ->  seconds into the day

    if (secs === 86400) {                               //  rounded up all the way to midnight?  That's the next day.
        days++;
        secs = 0;
    }

    const hours = Math.floor(secs / 3600);
    const time  = two(hours) + ':' + two(Math.floor(secs / 60) % 60) + (seconds ? ':' + two(secs % 60) : '');

    if (kind === 'time')    return time;
    if (kind === 'elapsed') return (days * 24 + hours) + time.slice(2);

    const ymd  = excelDayToDate(days, date1904);
    const date = ymd[0] + '-' + two(ymd[1]) + '-' + two(ymd[2]);

    return kind === 'datetime' ? date + ' ' + time : date;
}
```

| Code | Baby words |
|---|---|
| `Math.floor(a / b)` | Divide, and throw away the leftover. (Whole numbers only.) |
| `return [year, month, day]` | Hand back 3 things at once, in a list. |
| `serial - 25569` | Excel's day 25569 = 1970-01-01, where the recipe counts from. |
| `!(value >= 0)` | "Not zero or more." Also catches `NaN` (not a number at all), because `NaN >= 0` is false. |

> **How do we KNOW it's right?** The test (`dates.html` in Castle Claude) checks **every** Excel date there is: all 2,958,466 days in the 1900 calendar and 2,957,004 in the 1904 calendar. Each one goes number → date → number, and must come back the same. And each day must be the day AFTER the one before, checked with a separate, plain calendar rule. Then we broke the math on purpose 3 ways (forgot Feb 29, wrong 1904 offset, wrong leap rule): the test caught all 3.

> **Why `dateToExcelDay` (backwards)?** Nothing uses it yet! It's for saving back to Excel someday. And it lets the test prove the math works both ways.

<br>

### Step 5.4: Numbers, shown like Excel

```js
function generalNumber(raw) {

    const n = Number(raw);

    if (raw.trim() === '' || !isFinite(n)) return raw;     //  not a number at all?  Show it as it is.
    if (n === 0) return '0';                                //  (also turns  -0  into  0)
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);

    let text  = n.toPrecision(15);                          //  15 digits:  "548.971500000000"   or   "1.23456789012346e+20"
    let power = '';

    const e = text.indexOf('e');
    if (e !== -1) {                                         //  huge or tiny?  Excel writes it like  1.23456789012346E+20
        const p = Number(text.slice(e + 1));
        power = 'E' + (p < 0 ? '-' : '+') + two(Math.abs(p));
        text  = text.slice(0, e);
    }

    if (text.indexOf('.') !== -1) text = text.replace(/0+$/, '').replace(/\.$/, '');   //  548.971500000000  ->  548.9715

    return text + power;
}
```

| Code | Baby words |
|---|---|
| `n.toPrecision(15)` | The number, written with exactly 15 digits. |
| `.replace(/0+$/, '')` | Remove all the zeros at the very end. |
| `Number.isInteger(n)` | "Is it a whole number?" |

> **Why 15 digits?** Excel stores `522.83` as `522.83000000000004` (that's how computers store decimals: almost exact, never quite). Excel itself only SHOWS 15 digits, so it shows `522.83`. So do we. The stored number is kept in the Excel notes.

<br>

### Step 5.5: Which cells are dates?

The number alone can't say: `43586` could be a date, or 43,586 cases of beer. Only the cell's **style** knows. A style points to a number format: a built-in one by number (`14` = a date), or a custom one written out (`yyyy-mm-dd`).

```js
const BUILT_IN_DATES = {
    14: ['date', false], 15: ['date', false], 16: ['date', false], 17: ['date', false],
    18: ['time', false], 19: ['time', true],  20: ['time', false], 21: ['time', true],
    22: ['datetime', false],
    45: ['time', true],  46: ['elapsed', true], 47: ['time', true]
};
for (let id = 27; id <= 36; id++) BUILT_IN_DATES[id] = ['date', false];    //  (Asian-language date formats)
for (let id = 50; id <= 58; id++) BUILT_IN_DATES[id] = ['date', false];


//  A custom format code  ->  [kind, shows seconds?],  or null if it isn't a date or time.
function formatKind(code) {

    let f = code
        .replace(/"[^"]*"/g, '')            //  words in quotes
        .replace(/\\./g, '')                //  \x   (just this character)
        .replace(/[_*]./g, '');             //  _x  *x   (spacing tricks)

    f = f.split(';')[0];                    //  only the first part  (the part for positive numbers)

    const elapsed = /\[(h+|m+|s+)\]/i.test(f);

    f = f.replace(/\[[^\]]*\]/g, '')        //  [Red]  [$-409]  [h] ...
         .replace(/am\/pm|a\/p/gi, '')
         .toLowerCase();

    const date = /[yd]/.test(f);
    const time = /[hs]/.test(f) || elapsed;

    if (!date && !time && f.indexOf('m') === -1) return null;     //  no date letters at all:  a plain number format

    const seconds = f.indexOf('s') !== -1;

    if (elapsed)      return ['elapsed', seconds];
    if (date && time) return ['datetime', seconds];
    if (time)         return ['time', seconds];
    return ['date', false];                 //  y, d, or just m  (months)
}
```

| Code | Baby words |
|---|---|
| `.replace(/"[^"]*"/g, '')` | Remove everything in quotes. (`"Qty: "0` has a `y` in it, but it's just a word, not a date!) |
| `.replace(/\\./g, '')` | Remove a backslash AND the character after it. (`\d` means "just the letter d", not "day".) |
| `.split(';')[0]` | A format can have 4 parts (positive; negative; zero; text). Only look at the first. |
| `/[yd]/.test(f)` | "Is there a `y` or a `d` in it?" |

> **Why so careful?** Every format below has a date letter in it, and NONE of them are dates: `"Qty: "0` (quoted), `[Red]0.00` (the `d` is in a color name), `0.0 \d\a\y\s` (escaped letters). Get it wrong, and a price shows up as a date in 1900.

<br>

### Step 5.6: Reading the XML, safely

The file came from outside, so it's treated like a **stranger**. We read the XML with plain text searching (`indexOf`), NOT the browser's XML reader. Tricky XML (like "billion laughs," which makes a tiny file explode into gigabytes) has nothing to grab onto.

```js
function attr(tag, name) {

    const found = new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')').exec(tag);
    if (found === null) return null;

    return decodeXml(found[1] !== undefined ? found[1] : found[2]);
}


//  Turn XML's codes back into letters.   ONLY these:
//      &amp; &lt; &gt; &quot; &apos;     the 5 standard ones
//      &#233;  &#xE9;                    a letter by its number
//      _x000D_                           Excel's own code for invisible characters
//  Anything else is left exactly as it is.  (So there's nothing for tricky XML to grab onto.)
function decodeXml(text) {

    if (text.indexOf('&') !== -1) {
        text = text.replace(/&(amp|lt|gt|quot|apos|#[0-9]{1,7}|#x[0-9a-fA-F]{1,6});/g, function (all, code) {
            if (code === 'amp')  return '&';
            if (code === 'lt')   return '<';
            if (code === 'gt')   return '>';
            if (code === 'quot') return '"';
            if (code === 'apos') return '\'';
            return safeChar(code[1] === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
        });
    }

    if (text.indexOf('_x') !== -1) {
        text = text.replace(/_x([0-9a-fA-F]{4})_/g, function (all, hex) { return safeChar(parseInt(hex, 16)); });
    }

    return text;
}


//  A letter by its number  (only real letters:  no "nothing" characters, no impossible numbers).
function safeChar(n) {

    const ok = n === 9 || n === 10 || n === 13 ||
               (n >= 0x20 && n <= 0xD7FF) || (n >= 0xE000 && n <= 0xFFFD) || (n >= 0x10000 && n <= 0x10FFFF);

    return ok ? String.fromCodePoint(n) : '';
}


//  All the words in one shared word  (<si>)  or inline word  (<is>).
//  A word can come in pieces  (one piece bold, one piece red):  <r><t>Hel</t></r><r><t>lo</t></r>  ->  "Hello"
//  <rPh> is a pronunciation guide for Japanese  (not part of the word), so it's skipped.
function textOf(part) {

    if (part.indexOf('<rPh') !== -1) part = part.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');

    const piece = /<t(?:\s[^>/]*)?>([\s\S]*?)<\/t>/g;
    let text = '';
    let found;

    while ((found = piece.exec(part)) !== null) text += found[1];

    return decodeXml(text);
}


//  A cell address  ->  its column number.    "A3" -> 0,   "B3" -> 1,   "AA7" -> 26.   Junk -> -1.
function columnOf(ref) {

    let col = 0;
    let i   = 0;

    while (i < ref.length && i < 4) {
        const c = ref.charCodeAt(i);
        if (c < 65 || c > 90) break;        //  not  A to Z?  The letters are over.
        col = col * 26 + (c - 64);
        i++;
    }

    return i === 0 || i > 3 ? -1 : col - 1;
}


//  A column number  ->  its letters.    0 -> "A",   1 -> "B",   26 -> "AA".   (columnOf, backwards)
function columnName(col) {

    let name = '';

    for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + (n - 1) % 26) + name;
    }

    return name;
}


//  COPY A FORMULA DOWN  (or across),  the way Excel does.
//
//  Excel saves a formula that was copied down a column ONCE  (the "shared" formula),
//  and the other cells just say "same as group #0".  To show THEIR formula,
//  move every cell address by how far the cell is from the first one:
//
//      first cell, row 8:    =A7*2
//      row 9  (1 down):      =A8*2          (A7 moved down 1)
//      =$A$1+B4  ->          =$A$1+B5       ($ means "don't move this part")
//
//  Left alone:  words in "quotes",  sheet names in 'quotes',  and function names like LOG10( .
function shiftFormula(text, rows, cols) {

    return text.replace(
        /("[^"]*")|('[^']*')|(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)([0-9]+)(?![0-9A-Za-z_(.])/g,
        function (all, quoted, sheet, lockCol, letters, lockRow, digits) {

            if (quoted || sheet) return all;                        //  words or sheet names in quotes:  not addresses

            const col = lockCol ? columnOf(letters) : columnOf(letters) + cols;
            const row = lockRow ? Number(digits) : Number(digits) + rows;

            if (columnOf(letters) === -1) return all;               //  not really an address  (too many letters)
            if (col < 0 || col >= EXCEL_MAX_COLS || row < 1 || row > EXCEL_MAX_ROWS) return '#REF!';    //  moved off the sheet  (Excel says the same)

            return lockCol + columnName(col) + lockRow + row;
        });
}


//  One cell, ready for CSV:  a comma, quote or line break inside?  Wrap it in quotes  (and double any quotes).
function csvCell(text) {
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
```

| Code | Baby words |
|---|---|
| `new RegExp(...)` | Build a search pattern out of words. |
| `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` | XML's codes for `&` `<` `>` `"` `'`. Only these 5 (plus letter numbers) get turned back into letters. Anything else stays exactly as written. |
| `String.fromCodePoint(n)` | The letter with this number. `233` = `é`. |
| `_x000D_` | Excel's own code for invisible characters. `000D` = a line break. |
| `(?<![A-Za-z0-9_.])` | "...but NOT right after a letter, digit, `_` or `.`." (So the `G10` inside `LOG10` isn't an address.) |
| `(?![0-9A-Za-z_(.])` | "...and NOT right before one of these, or a `(`." (So `LOG10(` is a function, not an address.) |
| `lockCol ? ... : ... + cols` | A `$` in front means "don't move this part". No `$`? Move it. |

> **Why does `shiftFormula` exist?** When you copy a formula down a column in Excel, the file saves it ONCE (a "shared" formula), and the other cells just say "same as group #0". To show THEIR formula, every address has to move by how far that cell is from the first one: row 8 has `=A7*2`, so row 9 has `=A8*2`. Exactly what Excel does when you copy. Words in `"quotes"` and sheet names in `'quotes'` are left alone, and so is anything with a `$` in front.

<br>

### Step 5.7: Unzipping 🗜️

A zip file keeps its **table of contents** at the END. It lists every file inside: its name, where it starts, and how big it is (packed and unpacked). The browser can unpack ("deflate") by itself. We just find the pieces, and **count as it unpacks**.

```js
function zipEntries(bytes) {

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    //  The very end of the table has a marker  (50 4B 05 06).  Look for it, from the end backwards.
    let end = -1;
    for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65535; i--) {
        if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end === -1) throw new Error('damaged');

    const count = view.getUint16(end + 10, true);           //  how many files are inside
    let at      = view.getUint32(end + 16, true);           //  where the table starts

    if (count === 0xFFFF || at === 0xFFFFFFFF) throw new Error('too big');     //  a "ZIP64" file:  over 4 GB.  Way too big anyway.

    const entries = new Map();
    const names   = new TextDecoder('utf-8');

    for (let k = 0; k < count; k++) {

        if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw new Error('damaged');

        const nameLength  = view.getUint16(at + 28, true);
        const extraLength = view.getUint16(at + 30, true);
        const noteLength  = view.getUint16(at + 32, true);

        entries.set(names.decode(bytes.subarray(at + 46, at + 46 + nameLength)), {
            flags:  view.getUint16(at + 8, true),           //  bit 1 on  =  locked with a password
            method: view.getUint16(at + 10, true),          //  0 = not packed,  8 = deflate
            packed: view.getUint32(at + 20, true),          //  size inside the zip
            size:   view.getUint32(at + 24, true),          //  size unpacked
            local:  view.getUint32(at + 42, true)           //  where its own little header is
        });

        at += 46 + nameLength + extraLength + noteLength;
    }

    return entries;
}


//  Unpack one file from the zip, as text.   (null = it isn't in there.)
//  "budget.used" counts EVERY byte unpacked so far, for the whole spreadsheet.
async function unzipText(bytes, entries, name, budget) {

    const entry = entries.get(name);
    if (entry === undefined) return null;

    if (entry.flags & 1) throw new Error('locked');
    if (entry.packed === 0xFFFFFFFF || entry.size === 0xFFFFFFFF || entry.local === 0xFFFFFFFF) throw new Error('too big');

    //  Its own little header says how long its name is, so we know where the packed bytes start.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (entry.local + 30 > bytes.length || view.getUint32(entry.local, true) !== 0x04034b50) throw new Error('damaged');

    const start = entry.local + 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true);
    if (start + entry.packed > bytes.length) throw new Error('damaged');

    const packed  = bytes.subarray(start, start + entry.packed);
    const decoder = new TextDecoder('utf-8');

    if (entry.method === 0) {                               //  not packed at all
        budget.used += packed.length;
        if (budget.used > XLSX_LIMIT) throw new Error('bomb');
        return decoder.decode(packed);
    }

    if (entry.method !== 8) throw new Error('unsupported');

    //  Un-deflate it a piece at a time, COUNTING as we go.
    const reader = new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const parts  = [];

    try {
        while (true) {
            const step = await reader.read();
            if (step.done) break;

            budget.used += step.value.length;
            if (budget.used > XLSX_LIMIT) {                 //  too much!  Stop unpacking right now.
                reader.cancel();
                throw new Error('bomb');
            }
            parts.push(decoder.decode(step.value, { stream: true }));
        }
    } catch (problem) {
        throw problem.message === 'bomb' ? problem : new Error('damaged');     //  (the packed bytes were broken)
    }

    parts.push(decoder.decode());
    return parts.join('');
}
```

| Code | Baby words |
|---|---|
| `new DataView(...)` | Read raw bytes as numbers. |
| `view.getUint32(i, true)` | The 4 bytes at spot `i`, as one number. `true` = "littlest byte first" (that's how zip files write numbers). |
| `0x06054b50` | The "end of the table" marker. (Written backwards in the file: `50 4B 05 06` = `PK` + 5 + 6.) |
| `async function` / `await` | A job that WAITS for slow things (like unpacking) without freezing the page. `await` = "wait for this, then keep going." |
| `new DecompressionStream('deflate-raw')` | The browser's own unpacker. |
| `entry.flags & 1` | "Is the first little switch on?" That one means "locked with a password." |

> **What's a zip bomb?** A tiny file that unpacks into a GIANT one. Our test bomb is 583 KB on disk and unpacks to 600 MB. Because we count every byte as it comes out, we stop at `XLSX_LIMIT` (512 MB), long before the browser runs out of memory.

<br>

### Step 5.8: Finding the parts

The parts point to each other with **relationships** (`.rels` files). Never just guess `sheet1.xml`: the first sheet isn't always called that, and it can live anywhere.

```js
function relationships(xml) {

    const list = [];
    if (xml === null) return list;

    const tag = /<Relationship\b[^>]*>/g;
    let found;

    while ((found = tag.exec(xml)) !== null) {
        if (attr(found[0], 'TargetMode') === 'External') continue;     //  a link to somewhere else:  not a part of this file
        list.push({ id: attr(found[0], 'Id'), type: attr(found[0], 'Type') || '', target: attr(found[0], 'Target') || '' });
    }

    return list;
}


//  Where a "target" really is.   folder "xl/"  +  "worksheets/sheet1.xml"   ->   "xl/worksheets/sheet1.xml"
//  (A target starting with  /  is from the top.  ".." means "up one folder".)
function partPath(folder, target) {

    const pieces = (target.charAt(0) === '/' ? target.slice(1) : folder + target).split('/');
    const path   = [];

    pieces.forEach(function (piece) {
        if (piece === '..') path.pop();
        else if (piece !== '.' && piece !== '') path.push(piece);
    });

    return path.join('/');
}


//  The relationship whose type ends with this word  (like "/styles").
function findRel(list, kind) {
    return list.find(function (rel) { return rel.type.slice(-kind.length - 1) === '/' + kind; }) || null;
}
```

<br>

### Step 5.9: Read the whole spreadsheet

This is the main job. It uses everything above: unzip → find the parts → read the words and styles → walk the sheet, row by row, cell by cell → CSV text. It works in **bites** (like everything else), so a big spreadsheet never freezes the page.

```js
let xlsxInfo = null;

const XLSX_STALE = new Error('stale');      //  "a newer file was picked:  forget this one"  (not a real problem)
```

```js
async function readXlsx(file, isCurrent, choice) {

    //  Big jobs are done in BITES  (like everything else),  so the page never freezes.
    let stopAt = performance.now() + CHUNK_TIME;

    async function breathe() {
        if (performance.now() < stopAt) return;
        await new Promise(function (go) { setTimeout(go, 0); });
        if (!isCurrent()) throw XLSX_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }


    //  1.  UNZIP:  the table of contents, then the parts we need.
    const bytes   = new Uint8Array(await file.arrayBuffer());
    if (!isCurrent()) throw XLSX_STALE;

    const entries = zipEntries(bytes);
    const budget  = { used: 0 };


    //  2.  FIND THE WORKBOOK, and its relationships.
    const top          = relationships(await unzipText(bytes, entries, '_rels/.rels', budget));
    const bookRel      = findRel(top, 'officeDocument');
    const bookPath     = bookRel ? partPath('', bookRel.target) : 'xl/workbook.xml';
    const bookFolder   = bookPath.slice(0, bookPath.lastIndexOf('/') + 1);              //  "xl/"
    const bookXml      = await unzipText(bytes, entries, bookPath, budget);
    if (bookXml === null) throw new Error('damaged');

    const bookRels     = relationships(await unzipText(bytes, entries, bookFolder + '_rels/' + bookPath.slice(bookFolder.length) + '.rels', budget));

    //  Which calendar?   <workbookPr date1904="1"/>
    const prTag    = /<workbookPr\b[^>]*>/.exec(bookXml);
    const date1904 = prTag !== null && /^(1|true)$/.test(attr(prTag[0], 'date1904') || '');

    //  "Excel, recalculate everything when you open me"?   <calcPr fullCalcOnLoad="1"/>
    //  (Files made by some programs do this, and save 0 or nothing as every formula's answer.
    //   So the answers we'd show might be WRONG.  We can't recalculate, but we can say so.)
    const calcTag = /<calcPr\b[^>]*>/.exec(bookXml);
    const recalc  = calcTag !== null && /^(1|true)$/.test(attr(calcTag[0], 'fullCalcOnLoad') || '');

    //  The sheets, in order.   Each one:  its name,  hidden or not,  and is it a real sheet  (or just a chart)?
    const sheets = [];
    const sheetTag = /<sheet\b[^>]*>/g;
    let found;
    while ((found = sheetTag.exec(bookXml)) !== null) {
        const id    = attr(found[0], '[\\w.-]+:id');
        const rel   = bookRels.find(function (r) { return r.id === id; }) || null;
        const state = attr(found[0], 'state');
        sheets.push({
            name:   attr(found[0], 'name') || 'Sheet',
            rel:    rel,
            hidden: state === 'hidden' || state === 'veryHidden',
            chart:  rel === null || rel.type.slice(-10) !== '/worksheet'       //  a chart sheet  (or missing):  no rows to show
        });
    }

    //  Which one?  The one asked for  (a sheet tab was clicked),  or the first real sheet that isn't hidden.
    const sheet = (choice !== null && sheets[choice] && !sheets[choice].chart ? sheets[choice] : null) ||
                  sheets.find(function (s) { return !s.hidden && !s.chart; }) ||
                  sheets.find(function (s) { return !s.chart; });
    if (sheet === undefined) throw new Error('nosheet');

    const sheetXml = await unzipText(bytes, entries, partPath(bookFolder, sheet.rel.target), budget);
    if (sheetXml === null) throw new Error('nosheet');


    //  3.  THE SHARED WORDS.   <si><t>Chicago</t></si>   ->   strings[4] = "Chicago"
    const stringsRel = findRel(bookRels, 'sharedStrings');
    const stringsXml = stringsRel ? await unzipText(bytes, entries, partPath(bookFolder, stringsRel.target), budget) : null;
    const strings    = [];

    if (stringsXml !== null) {
        let at = 0;
        while (true) {
            const open = stringsXml.indexOf('<si', at);
            if (open === -1) break;
            const tagEnd = stringsXml.indexOf('>', open);
            if (tagEnd === -1) break;

            if (stringsXml.charAt(tagEnd - 1) === '/') {        //  <si/>  =  an empty word
                strings.push('');
                at = tagEnd + 1;
                continue;
            }
            const close = stringsXml.indexOf('</si>', tagEnd);
            if (close === -1) break;

            strings.push(textOf(stringsXml.slice(tagEnd + 1, close)));
            at = close + 5;
            await breathe();
        }
    }


    //  4.  THE STYLES:  for each style number, its format, and whether it's a date.
    const stylesRel = findRel(bookRels, 'styles');
    const stylesXml = stylesRel ? await unzipText(bytes, entries, partPath(bookFolder, stylesRel.target), budget) : null;
    const styles    = [];                                   //  style number  ->  null  (General)   or   { id, code, kind, seconds }

    if (stylesXml !== null) {

        const custom = {};                                  //  format number  ->  its written-out code
        const fmtTag = /<numFmt\b[^>]*>/g;
        while ((found = fmtTag.exec(stylesXml)) !== null) {
            custom[attr(found[0], 'numFmtId')] = attr(found[0], 'formatCode') || '';
        }

        const from = stylesXml.indexOf('<cellXfs');
        const to   = stylesXml.indexOf('</cellXfs>', from);
        const xfs  = from === -1 || to === -1 ? '' : stylesXml.slice(from, to);
        const xfTag = /<xf\b[^>]*>/g;

        while ((found = xfTag.exec(xfs)) !== null) {
            const id   = parseInt(attr(found[0], 'numFmtId') || '0', 10);
            const code = custom[id] !== undefined ? custom[id] : null;
            const kind = code !== null ? formatKind(code) : (BUILT_IN_DATES[id] || null);

            styles.push(id === 0 && code === null ? null : { id: id, code: code, kind: kind ? kind[0] : null, seconds: kind ? kind[1] : false });
        }
    }


    //  5.  THE SHEET:  row by row, cell by cell.
    //
    //      <row r="2">
    //        <c r="A2" t="s"><v>15</v></c>            t="s"  ->  shared word #15
    //        <c r="B2" s="2"><v>43586</v></c>         style 2 is a date  ->  2019-05-01 00:00:00
    //        <c r="I2"><v>74.69</v></c>               a plain number
    //      </row>
    //
    //  Missing rows and cells are left EMPTY  (so everything stays in its own row and column).
    const lines  = [];                  //  the CSV lines
    const cells  = new Map();           //  the originals  (only where the page shows something different)
    const shared = {};                  //  copied-down formulas:  group number  ->  { text, row, col }  of its FIRST cell
    let hasDates = false;
    let unsolved = 0;                   //  formulas with no saved answer
    let rowNum   = 0;                   //  Excel's row number  (1, 2, 3 ...)

    let at         = sheetXml.indexOf('<sheetData');
    const dataEnd  = sheetXml.indexOf('</sheetData>', at);

    while (at !== -1 && dataEnd !== -1) {

        const rowOpen = sheetXml.indexOf('<row', at);
        if (rowOpen === -1 || rowOpen > dataEnd) break;

        const rowTagEnd = sheetXml.indexOf('>', rowOpen);
        const rowTag    = sheetXml.slice(rowOpen, rowTagEnd + 1);
        const empty     = sheetXml.charAt(rowTagEnd - 1) === '/';
        const rowEnd    = empty ? rowTagEnd : sheetXml.indexOf('</row>', rowTagEnd);
        if (rowEnd === -1) throw new Error('damaged');

        at = empty ? rowTagEnd + 1 : rowEnd + 6;

        const r   = attr(rowTag, 'r');
        const num = r !== null ? parseInt(r, 10) : rowNum + 1;
        if (!(num > rowNum) || num > EXCEL_MAX_ROWS) continue;        //  junk, or out of order?  Skip it.

        while (rowNum < num - 1) {          //  rows Excel skipped  (they were empty)
            lines.push('');
            rowNum++;
        }
        rowNum = num;

        const values = [];                  //  this row's cells, by column
        let col = -1;
        let p   = rowTagEnd + 1;

        while (!empty) {

            const c = sheetXml.indexOf('<c', p);
            if (c === -1 || c > rowEnd) break;

            const after = sheetXml.charAt(c + 2);
            if (after !== ' ' && after !== '>' && after !== '/') { p = c + 2; continue; }      //  not a cell tag

            const cTagEnd = sheetXml.indexOf('>', c);
            const cTag    = sheetXml.slice(c, cTagEnd + 1);
            let inner     = '';

            if (sheetXml.charAt(cTagEnd - 1) === '/') {
                p = cTagEnd + 1;                                            //  <c r="B2" s="1"/>  =  an empty cell
            } else {
                const cEnd = sheetXml.indexOf('</c>', cTagEnd);
                if (cEnd === -1) throw new Error('damaged');
                inner = sheetXml.slice(cTagEnd + 1, cEnd);
                p = cEnd + 4;
            }

            const ref = attr(cTag, 'r');
            col = ref !== null ? columnOf(ref) : col + 1;
            if (col < 0 || col >= EXCEL_MAX_COLS) continue;                //  junk address?  Skip it.

            const cell = readCell(cTag, inner, rowNum, col);
            if (cell === null) continue;

            values[col] = csvCell(cell.show);
            if (cell.keep !== null) cells.set((rowNum - 1) * EXCEL_MAX_COLS + col, cell.keep);
        }

        let line = '';
        for (let i = 0; i < values.length; i++) line += (i > 0 ? ',' : '') + (values[i] === undefined ? '' : values[i]);
        lines.push(line);

        await breathe();
    }


    //  One cell  ->  { show, keep }.    show  =  what the page shows.    keep  =  the original  (or null).
    //  (null  =  nothing in it at all.)
    function readCell(cTag, inner, row, col) {

        const type  = attr(cTag, 't') || 'n';               //  s = shared word,  n = number,  b = TRUE/FALSE,  e = error ...
        const style = styles[parseInt(attr(cTag, 's') || '0', 10)] || null;

        let raw = null;                                     //  what Excel stored
        const v = inner.indexOf('<v>');
        if (v !== -1) raw = decodeXml(inner.slice(v + 3, inner.indexOf('</v>', v)));

        let formula = null;                                 //  =SUM(B2:B9)   (we show its last answer)
        let group   = null;                                 //  a copied-down formula's group number  (or null)
        const f = inner.indexOf('<f');
        if (f !== -1) {
            const fTagEnd = inner.indexOf('>', f);
            const fTag    = inner.slice(f, fTagEnd + 1);
            const text    = inner.charAt(fTagEnd - 1) === '/' ? '' : decodeXml(inner.slice(fTagEnd + 1, inner.indexOf('</f>', fTagEnd)));

            if (attr(fTag, 't') === 'shared') group = attr(fTag, 'si');

            if (text !== '') {
                formula = '=' + text;
                if (group !== null) shared[group] = { text: text, row: row, col: col };    //  the FIRST cell of a copied-down group
            } else if (group !== null && shared[group] !== undefined) {
                const first = shared[group];                //  "same as group #si":  copy the first cell's formula over to here
                formula = '=' + shiftFormula(first.text, row - first.row, col - first.col);
            } else {
                formula = '=?';                             //  a formula we can't see  (its group's first cell is missing)
            }
        }

        let show;

        if (type === 's') {
            const n = raw === null ? -1 : parseInt(raw, 10);
            show = n >= 0 && n < strings.length ? strings[n] : '';
        } else if (type === 'inlineStr') {
            show = textOf(inner);
        } else if (type === 'b') {
            show = raw === '1' ? 'TRUE' : raw === '0' ? 'FALSE' : (raw || '');
        } else if (type === 'str' || type === 'e' || type === 'd') {
            show = raw || '';                               //  formula text,  an error like #N/A,  or a written-out date
        } else if (raw === null) {
            show = '';
        } else {
            const date = style !== null && style.kind !== null
                ? excelDateText(Number(raw), style.kind, style.seconds, date1904)
                : null;
            if (date !== null) hasDates = true;
            show = date !== null ? date : generalNumber(raw);
        }

        //  A formula with NO saved answer?  We can't work it out, so show the formula itself
        //  (like Excel's "Show Formulas"),  instead of an empty cell that looks like real data.
        if (formula !== null && raw === null && type !== 'inlineStr') {
            show = formula;
            unsolved++;
        }

        if (raw === null && formula === null && show === '') return null;

        //  Keep the original when the page shows something different from what Excel stored:
        //  a formula,  a number shown differently  (a date, or rounded),  or a number with its own format  ($, %).
        const differs = formula !== null ||
                        (type !== 's' && type !== 'inlineStr' && raw !== null && show !== raw) ||
                        (type === 'n' && style !== null);

        const keep = differs
            ? { raw: raw, type: type, format: style === null ? null : (style.code !== null ? style.code : style.id), formula: formula, group: group }
            : null;

        return { show: show, keep: keep };
    }


    return {
        text: lines.join('\n'),
        info: { file: file, sheetName: sheet.name, sheetNumber: sheets.indexOf(sheet) + 1, sheetCount: sheets.length,
                sheets: sheets.map(function (s) { return { name: s.name, hidden: s.hidden, chart: s.chart }; }),
                date1904: date1904, hasDates: hasDates, recalc: recalc, unsolved: unsolved, cells: cells }
    };
}
```

And the words for when something's wrong:

```js
function xlsxProblem(problem, name) {

    const why = {
        'damaged':     'it looks like a damaged Excel file.',
        'locked':      'it\'s password-protected. Open it in Excel, remove the password, and save it again.',
        'bomb':        'it unpacks to more than 512 MB. That\'s more than the browser can handle.',
        'too big':     'it\'s too big for the browser to unpack.',
        'unsupported': 'it\'s packed in a way this reader doesn\'t know. In Excel: File → Save As → Excel Workbook (.xlsx), then try again.',
        'nosheet':     'there\'s no sheet in it to show.'
    }[problem && problem.message];

    if (why) return 'Couldn\'t open "' + name + '": ' + why;
    if (problem instanceof RangeError) return 'Couldn\'t open "' + name + '": it\'s too big for the browser.';
    return 'Couldn\'t open "' + name + '": something in this Excel file wasn\'t what we expected.';
}
```

| Code | Baby words |
|---|---|
| `new Map()` | A list you look things up in by a key. Here: the cell's spot → its original. |
| `(rowNum - 1) * EXCEL_MAX_COLS + col` | One number for each cell: row × 16,384 + column. (Like a house number for every cell.) |
| `values[col] = ...` | Put this cell in its own column. Columns Excel skipped stay empty. |
| `throw new Error('damaged')` | "Stop everything, something's wrong." The brain catches it and shows the words for it. |
| `XLSX_STALE` | Not a real problem: a newer file was picked, so this one quietly stops. |

> **Why the first sheet that isn't hidden?** That's what you'd see first in Excel too. The badge says which one it is ("2 of 3 sheets" = the first one was hidden).

> **What about formulas?** We don't recalculate them (that takes a whole "calculation engine"). An `.xlsx` saves each formula's last ANSWER next to it, and that's what shows. Three honest extras:
> - A formula with **no saved answer** (some programs make files like that) shows the **formula itself**, like Excel's "Show Formulas" mode, never an empty cell that looks like real data. The status line counts them.
> - A file that says **"recalculate me when you open me"** (`fullCalcOnLoad`) gets a ⚠ warning: its answers may be out of date.
> - Every formula cell gets a glowing green **ƒ**, and hovering shows the formula (Step 5.12).

> **What do "the originals" look like?** For the date in cell B2 of the sample file: `{ raw: "43586", type: "n", format: "yyyy\-mm\-dd\ hh:mm:ss", formula: null }`. The page shows `2019-05-01 00:00:00`. The original is all there for later.

<br>

### Step 5.10: Teach the brain (5 changes in `scriptI.js`)

**1.** The file listener remembers if it's an Excel file. Add the 3rd line under the other two (Step 2.15):

```js
    let encoding     = 'utf-8';             //  which rulebook to read it with  (decided just before reading, at the bottom)
    let checkedWhole = false;               //  did the safety net already check the WHOLE file?
    let excel        = null;                //  an Excel file?  Its notes  (from xlsxI.js).   A CSV?  null.
```

**2.** `couldNotRead` can show specific words (like "it's password-protected"):

```js
    function couldNotRead(why) {

        searchInput.disabled = headerCells.length === 0;
        finishLoading();

        let message = why ? why
            : file.size > 500 * 1000 * 1000
            ? 'Couldn\'t open "' + file.name + '": it\'s ' + Math.round(file.size / 1000000) + ' MB, and the browser can only read files up to about 500 MB.'
            : 'Couldn\'t read "' + file.name + '". Was it moved, renamed, or deleted? Try picking it again.';

        if (headerCells.length > 0) message += '  (Your last file is still open.)';

        statusText.textContent = message;
    }
```

**3.** Split "done reading" in two. The end of `onload` hands the text to a new `useText`, which does the cutting. (So an Excel file's CSV text can go straight to `useText` too.) Replace `let spot = 0;` near the top of `onload` with:

```js
        else useText(text);                 //  the text is good.  Cut it up!
    };


    //  CUT UP THE TEXT  (a CSV file's text,  or an Excel file's sheet turned into CSV text).
    function useText(text) {

        let spot = 0;                       //  where we are in it
```

> **Building in order?** Write that first line as just `useText(text);`. The `if (isSql) ...` part (and its `else`) comes in Part 9 (SQL dumps).

...and at the very end of the cutting part, the `};` after `cutSomeRows();` becomes just `}` (it now closes `useText`, not `onload`).

**4.** When the new file is swapped in ("ALL DONE"), remember its Excel notes, and show the badge:

```js
            xlsxInfo    = excel;                //  the Excel notes  (null for a CSV)
            sqlInfo     = sql;                  //  the SQL notes    (null if it's not a SQL dump)
            fileNote    = excel !== null
                ? (excel.hasDates ? '  ·  dates shown as YYYY-MM-DD  (originals kept)' : '') +
                  (excel.unsolved > 0 ? '  ·  ' + excel.unsolved + ' formula(s) had no saved answer  (shown as formulas)' : '') +
                  (excel.recalc ? '  ·  ⚠ this file asks Excel to recalculate:  formula answers may be out of date' : '')
                : sql !== null
                ? (sql.nullCount > 0 ? '  ·  ' + sql.nullCount.toLocaleString() + ' NULL' + (sql.nullCount === 1 ? '' : 's') + ' kept' : '')
                : encoding === 'windows-1252'
                ? '  ·  read as Windows-1252  (an older Excel format)'
                : '';
            //  Which look?  A NEW file:  Excel files look like Excel,  SQL dumps like a database table,  CSVs like a CSV.
            //  Another sheet tab  (or table)  of the same file  (sheet !== null):  keep the look you picked.
            if (sheet === null) excelLook = excel !== null || sql !== null;
            applyLook();                        //  the window,  the button,  and the badge  ("XLSX SPREADSHEET",  "SQL DUMP")
```

> **Building in order?** `excelLook` and `applyLook()` arrive in Part 8 (Spreadsheet View). Until then, write just `showBadge();` in place of the `if (sheet === null) ...` and `applyLook();` lines. And the `sql` lines (`sqlInfo = sql;`, the NULL note) arrive in Part 9 (SQL dumps): leave them out until then.

**5.** At the very bottom of the listener: check WHAT KIND of file it is (by its first bytes, not its name), then the badge itself:

```js
    //  GO!   But first:  WHAT KIND of file is it?
    //  Not by its name:  by its first few bytes.  (A file can be named anything.)
    //
    //      50 4B 03 04   ("PK")   =  a zip file  =  an Excel .xlsx         ->  xlsxI.js reads it
    //      D0 CF 11 E0            =  an old Excel .xls  (or a password-locked .xlsx)  ->  say so
    //      anything else          =  text  (a CSV)
    file.slice(0, 8).arrayBuffer().then(function (head) {

        if (myLoad !== loadId) return;      //  a newer file?  Forget this one.

        const b = new Uint8Array(head);

        if (b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) {
            readAsExcel();
            return;
        }

        if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) {
            couldNotRead('Couldn\'t open "' + file.name + '": it\'s an old Excel file (.xls), or a password-protected one. ' +
                         'In Excel:  File → Save As → Excel Workbook (.xlsx)  or  CSV,  then pick that.');
            return;
        }

        //  Text.  Check the first 4 MB:  breaks UTF-8's rules?  Use the older Excel rulebook.
        //  (4 MB is quick, and almost always enough:  the safety net up in onload catches the rest.)
        isUtf8(file, 4 * 1024 * 1024, function (ok) {

            if (myLoad !== loadId) return;  //  a newer file?  Forget this one.

            encoding = ok ? 'utf-8' : 'windows-1252';
            reader.readAsText(file, encoding);      //  start reading
        });

    }, function () {
        couldNotRead();                     //  couldn't even read the first 8 bytes
    });


    //  An Excel file:  xlsxI.js turns its first sheet into CSV text.  Then it's cut up like any CSV.
    function readAsExcel() {

        setLoadingLabel('Opening the spreadsheet...');

        readXlsx(file, function () { return myLoad === loadId; }, sheet).then(function (result) {

            if (myLoad !== loadId) return;
            setProgress(0.2);               //  unpacked + translated  =  the "reading" part is done
            excel = result.info;
            useText(result.text);

        }, function (problem) {

            if (myLoad !== loadId || problem === XLSX_STALE) return;     //  a newer file?  Not a real problem.
            couldNotRead(xlsxProblem(problem, file.name));
        });
    }


    //  A SQL dump:  sqlI.js turns one of its tables into CSV text.  Then it's cut up like any CSV.
    function readAsSql(text) {

        setLoadingLabel('Reading the SQL...');

        readSql(text, file, function () { return myLoad === loadId; }, sheet).then(function (result) {

            if (myLoad !== loadId) return;
            sql = result.info;
            useText(result.text);

        }, function (problem) {

            if (myLoad !== loadId || problem === SQL_STALE) return;      //  a newer file?  Not a real problem.
            couldNotRead(sqlProblem(problem, file.name));
        });
    }
}



// ----------------------------------------------------------
//
//    THE "XLSX SPREADSHEET" BADGE
//
//    An Excel file is NOT a CSV, and the page says so, right under the file bar:
//
//        XLSX SPREADSHEET  ·  Sheet1  ·  1 of 3 sheets  ·  1904 dates
//
//  (It shows the first sheet that isn't hidden.  "2 of 3"  =  the 1st one was hidden.)
//
//    A SQL dump says so too:
//
//        SQL DUMP  ·  MySQL  ·  users  ·  2 of 5 tables
//
//    A CSV?  No badge.
//    (An Excel file or a SQL dump keeps its badge in BOTH looks,  so flipping never moves anything above the window.)
//
// ----------------------------------------------------------

const fileBadge = document.getElementById('fileBadge');
const sheetTabs = document.getElementById('sheetTabs');

function showBadge() {

    showSheetTabs();

    if (sqlInfo !== null) {
        fileBadge.textContent = 'SQL DUMP' + (sqlInfo.dialect ? '  ·  ' + sqlInfo.dialect : '') + '  ·  ' + sqlInfo.sheetName +
            (sqlInfo.sheetCount > 1 ? '  ·  ' + sqlInfo.sheetNumber + ' of ' + sqlInfo.sheetCount + ' tables' : '');
        fileBadge.hidden = false;
        return;
    }

    if (xlsxInfo === null) {
        fileBadge.hidden = true;
        return;
    }

    fileBadge.textContent = 'XLSX SPREADSHEET  ·  ' + xlsxInfo.sheetName +
        (xlsxInfo.sheetCount > 1 ? '  ·  ' + xlsxInfo.sheetNumber + ' of ' + xlsxInfo.sheetCount + ' sheets' : '') +
        (xlsxInfo.date1904 ? '  ·  1904 dates' : '');
    fileBadge.hidden = false;
}
```

| Code | Baby words |
|---|---|
| `file.slice(0, 8)` | Just the first 8 bytes of the file. |
| `50 4B 03 04` | "PK" + 3 + 4: how every zip file starts (PK = Phil Katz, who invented zip). |
| `D0 CF 11 E0` | How an old `.xls` file starts. (A password-locked `.xlsx` too: Excel wraps it the old way.) |
| `.then(function (result) {...}, function (problem) {...})` | When the job's done: if it worked, run the first one. If it failed, run the second. |

> **Why look at the bytes, not the name?** A file can be named anything. Someone renames `sales.xlsx` to `sales.csv`: it still opens right. And a text file that's named `.xlsx` gets read as text.

<br>

### Step 5.11: The badge's clothes

Add this in `styleI.css`, right above "The search bar = one long light square":

```css
/*  "XLSX SPREADSHEET"  (only when an Excel file is open)
    A DARK square, like the theme menu's:  this isn't a CSV, and it should look different.  */
#fileBadge {
    width: fit-content;
    max-width: 100%;
    box-sizing: border-box;
    margin: -6px auto 15px;
    padding: 0 14px;
    line-height: 26px;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    white-space: pre;               /*  keep the double spaces around the  ·  */
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    background: var(--square-dark);
    border: 1px solid var(--glass-edge);
    border-radius: 12px;
    box-shadow:
        inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent),     /*  a soft rim of the theme's glow  */
        0 4px 14px rgba(0, 0, 0, 0.1);
}
```

> **A dark square, on purpose.** Part 4's chessboard dark squares (`--square-dark`) are for things that are DIFFERENT. An Excel file isn't a CSV, and it should look different at a glance.

<br>

### Step 5.12: The glowing green ƒ (formula cells)

A formula cell looks just like any other cell (it shows the answer). So it gets a tiny glowing **ƒ** in its top-left corner, in **Excel's own green**. Hover the cell to see the formula.

**1.** Two new colors in the theme block (Step 3.1), right after `--control-accent`:

```css
    --formula:      #217346;                        /*  the  ƒ  on an Excel formula cell:  Excel's own green  */
    --formula-glow: rgba(33, 163, 102, 0.85);       /*  ...and its glow  (the brighter green from Excel's icon)  */
```

**2.** In `makeRow` (Step 2.5), right after the `cell.title = short;` line: look the cell up in the Excel notes.

```js
        //  An Excel FORMULA?  A glowing green  ƒ  in the corner,  and the formula when you hover.
        //  (Row "num" here  =  Excel's row - 1,  so the cell's spot in the Excel notes is  num × 16384 + col.)
        if (xlsxInfo !== null) {
            const kept = xlsxInfo.cells.get(num * EXCEL_MAX_COLS + col);
            if (kept !== undefined && kept.formula !== null) {
                cell.classList.add('formula');
                cell.title = kept.raw === null
                    ? kept.formula + '   (no saved answer:  open the file in Excel and save it, to fill one in)'
                    : kept.formula;
            }
        }
```

**3.** The clothes for the ƒ, right after the `.cell.num` rule (Step 3.5):

```css
/*  An Excel FORMULA cell:  a tiny glowing green  ƒ  in its top-left corner.
    (Top-left, like Excel's own little corner marks.  Small enough to sit above the words.)
    Hover the cell to see the formula itself.  */
.cell.formula {
    position: relative;
}

.cell.formula::before {
    content: "ƒ";
    position: absolute;
    top: -2px;
    left: 3px;
    font: italic 700 11px Georgia, "Times New Roman", serif;
    line-height: 14px;
    color: var(--formula);
    text-shadow:
        0 0 2px var(--formula-rim, #fff),                                   /*  a white rim, so it's sharp on the glass  */
        0 0 6px var(--formula-glow);                    /*  the green glow  */
    pointer-events: none;                               /*  (so it doesn't get in the way of hovering the cell)  */
}

.cell.formula:hover::before {
    text-shadow:                                        /*  mouse on it?  glow brighter  */
        0 0 2px var(--formula-rim, #fff),
        0 0 8px var(--formula-glow),
        0 0 14px var(--formula-glow);
}
```

| Code | Baby words |
|---|---|
| `num * EXCEL_MAX_COLS + col` | The cell's "house number" in the Excel notes. Row `num` here is Excel's row minus 1 (Excel's row 1 is our header, row 0), and that's exactly how the notes count. |
| `::before` + `content: "ƒ"` | A fake extra piece, with just the letter ƒ in it. |
| `position: absolute; top: -2px; left: 3px;` | Stick it in the top-left corner of the cell. (The cell is `position: relative`, so "corner" means the CELL's corner.) |
| `pointer-events: none;` | The mouse goes right through it, so hovering still hovers the cell. |

> **Why Excel's green?** `#217346` is the green on Excel's own icon. Spreadsheet people already read green as "spreadsheet". It glows in the brighter green from the icon (`#21A366`).

<br>

### Step 5.13: Sheet tabs (more than one sheet)

An Excel file can have lots of sheets. Like the tabs at the bottom of Excel, there's one button per sheet, joined into one bar:

```text
      ┌──────────┬──────────┬──────────────────┬──────────┐
      │▓Q1 Sales │▒ Q2 Sales│▒ Archive (hidden)│░ Chart1  │
      └──────────┴──────────┴──────────────────┴──────────┘
         ▓ = the sheet you're on  (a dark square, like the badge)
         ▒ = click to open it     (accent squares, like every button)
         ░ = a chart sheet: no rows to show  (faded, can't click)
```

Clicking a tab loads the **same file again**, showing that sheet. So the file listener's insides move into a function, `loadFile(file, sheet)`, that both can use.

**1.** The file listener becomes tiny. Everything that was inside it is now `loadFile` (same code, new first lines):

```js
fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];     //  the file you picked

    if (file) loadFile(file, null);         //  (you clicked "Cancel"?  Then there's no file:  do nothing)
});


//  READ A FILE, and show it.
//  "sheet"  =  for an Excel file:  which sheet to show  (0 = the first).   null  =  the first real one that isn't hidden.
//  (Picking a file calls this.  So does clicking a sheet tab:  same file, another sheet.)
function loadFile(file, sheet) {

    const myLoad = ++loadId;                //  this file's number.  (Pick another file?  It gets a new number.)
```

...and the very last `});` of the old listener becomes just `}` (it now closes `loadFile`).

**2.** The tabs (right after `showBadge`, which now starts with `showSheetTabs();`):

```js
function showSheetTabs() {

    sheetTabs.textContent = '';                                 //  wipe the old tabs

    const book = xlsxInfo !== null ? xlsxInfo : sqlInfo;        //  an Excel file's sheets,  or a SQL dump's tables

    if (book === null || book.sheets.length < 2) {              //  a CSV, or just 1 sheet?  No tabs.
        sheetTabs.hidden = true;
        return;
    }

    book.sheets.forEach(function (sheet, i) {

        const tab     = document.createElement('button');
        const current = i + 1 === book.sheetNumber;

        tab.className = 'sheet-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', current);
        tab.textContent = sheet.name + (sheet.hidden ? '  (hidden)' : '') + (sheet.chart ? '  (chart)' : '') + (sheet.empty ? '  (empty)' : '');

        if (sheet.hidden) tab.classList.add('hidden-sheet');

        if (sheet.chart) {
            tab.disabled = true;
            tab.title = 'A chart sheet:  it has no rows to show.';
        } else if (!current) {
            const file = book.file;                             //  (the file, as it is right now)
            tab.title = 'Open the ' + (book === sqlInfo ? 'table' : 'sheet') + ' "' + sheet.name + '"';
            tab.addEventListener('click', function () {
                loadFile(file, i);
            });
        }

        sheetTabs.appendChild(tab);
    });

    sheetTabs.hidden = false;
}
```

**3.** Their clothes, right after the badge's (Step 5.11):

```css
/*  THE SHEET TABS  (an Excel file with more than one sheet)
    One bar, like  [Row #][Go to row]:  every tab is an accent square  (click to open it),
    and the one you're on is a DARK square, like the badge above it.
    Too many to fit?  They wrap onto the next line.  */
#sheetTabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 900px;
    margin: -6px auto 15px;
}

#sheetTabs .sheet-tab {
    margin: 0;
    padding: 0 14px;
    line-height: 28px;
    font-size: 13px;
    white-space: pre;               /*  keep the double space before "(hidden)"  */
    border-left: none;              /*  the tab before it already drew the line between them  */
    border-radius: 0;
}

#sheetTabs .sheet-tab:first-child {
    border-left: 1px solid var(--glass-edge);
    border-radius: 12px 0 0 12px;   /*  round on the left end of the bar  */
}

#sheetTabs .sheet-tab:last-child {
    border-radius: 0 12px 12px 0;   /*  ...and on the right end  */
}

/*  The sheet you're on:  a dark square, glowing a little  (like the badge)  */
#sheetTabs .sheet-tab[aria-selected="true"] {
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    background: var(--square-dark);
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);
    filter: none;
    cursor: default;
}

/*  A hidden sheet:  slanted, a little quieter  (you CAN still open it)  */
#sheetTabs .sheet-tab.hidden-sheet {
    font-style: italic;
}

/*  A chart sheet:  faded, and can't be clicked  (no rows to show)  */
#sheetTabs .sheet-tab:disabled {
    opacity: 0.5;
    filter: none;
    cursor: not-allowed;
}
```

| Code | Baby words |
|---|---|
| `loadFile(file, i)` | Load THIS file again, showing sheet number `i` (counting from 0). |
| `const file = xlsxInfo.file;` | Remember the file NOW. (If you open another file later, this old tab can't get mixed up.) |
| `tab.disabled = true` | A button that can't be clicked. Used for chart sheets. |
| `aria-selected` | Tells screen readers (and the clothes) which tab is the one you're on. |
| `:first-child` / `:last-child` | Only the first tab / only the last one: they get the round ends of the bar. |

> **Which sheet opens first?** The first REAL sheet that isn't hidden (`readXlsx`, Step 5.9). A chart sheet is skipped: it has no rows, so it would open as an empty page.

> **Hidden sheets get a tab too?** Yes, marked *(hidden)* and slanted. Someone hid it in Excel, but you might still want to look. (Excel lets you unhide it, too.)

<br>

### ✅ Test it

1. Save any spreadsheet in Excel as **Excel Workbook (.xlsx)**, and pick it. You should see the dark **XLSX SPREADSHEET** badge with the sheet's name, and the first sheet as rows.
2. Got dates in it? They show as `YYYY-MM-DD`, and the words under the search bar say *"dates shown as YYYY-MM-DD (originals kept)"*.
3. A number like `0.1 + 0.2` (Excel stores `0.30000000000000004`) shows as `0.3`.
4. A spreadsheet with **more than one sheet**? You should see the sheet tabs under the badge. Click one: that sheet loads, and its tab turns dark.
5. Pick a CSV again: the badge (and the tabs) go away.
6. Rename a `.txt` file to `.xls` and pick it... it's text, so it opens as text. Now try a REAL old `.xls` (or a password-protected `.xlsx`): you should see *"it's an old Excel file (.xls), or a password-protected one"* with what to do about it.

> **Want proof?** Press **F12** → **Console**, and type `xlsxInfo`. You'll see the Excel notes: the sheet name, the calendar, and every original that was kept.

<br>

---

<br>

# PART 6: The Snap Menu ("the aimbot") 🎯

Search finds the rows with your word. But on a wide sheet, the word can be thousands of columns off to the side, and you'd have to hunt for it. The **snap menu** finds it for you.

It lives in the file bar, where the file's name used to be:

```text
   ┌─────────────┬────────────────────────────────────────┐
   │             │ 3 / 128      Row 42 · City  ▓Details ▾▓│
   │ Choose File │ ◀ ┌────────┬────────┬────────┐  ▶       │
   │             │   │Denver  │ CO     │ 980    │          │  ← the "scope": the 9 cells
   │  (accent)   │   │Ana     │▓North ▓│ IL     │          │     around the match.
   │             │   │Bo      │ Austin │ TX     │          │     The target = a dark square.
   └─────────────┴───└────────┴────────┴────────┘──────────┘
                    Reading from... sales.csv               ← the dots count up, forever
```

- **Search** → the window **locks on** to the first match: which one it is (`3 / 128`), where it is (`Row 42 · City`), and a **scope** of the 9 cells around it, straight from the file.
- **▶** (or **Enter** in the search bar) → **SNAP**: the sheet scrolls so the cell is in the middle (down AND sideways), and the cell pulses. The first press snaps to the match you see. After that: the next one.
- **◀** (or **Shift + Enter**) → the one before. Both wrap around at the ends.
- A row with the word in **more than one cell**? ▶ visits each one (`hit 2 of 3`), then the next row.
- **Click the scope** → snap to the match you see.
- The match is **cut off** in its little box (`Customer c... ▾`)? It gets a **▾** in its corner, and the **Details ▾** button turns into a dark square like it and pulses twice: "the rest is in here."
- **Details ▾** → drops down under the bar: first the match's **full text**, big and easy to read (the "focus" card, scrolled to your word), then its **whole row**: every column's name and value.
- No search? The window says **No search**, and a calm **Ready** slowly glows in and out. Searched, but nothing found? **No matches**.

This part touches **3 files**: the skeleton, the clothes, and the brain.

<br>

### Step 6.1: The file bar (skeleton)

The browser's own file picker can't be split in two (its button and its file name are stuck together). So the real picker goes **out of sight**, and our own **Choose File** button opens it. Replace the `<input type="file" ...>` line from Part 1 with this whole area (the bar, plus the details panel that drops down under it):

```html
    <div id="fileArea">

        <div id="fileBar">
            <button id="chooseBtn" type="button">Choose File</button>
            <input type="file" id="csvFileInput" accept=".csv,.xlsx,.sql" tabindex="-1" aria-hidden="true">

            <div id="aimbot" role="group" aria-label="Snap to search matches">
                <div class="aim-head">
                    <span id="aimCount">No search</span>
                    <span id="aimWhere"></span>
                    <button id="aimRowBtn" type="button" aria-expanded="false" aria-controls="aimRow" title="Read the match's full text, and its whole row" disabled>Details ▾</button>
                </div>
                <div class="aim-body">
                    <button id="aimPrev" type="button" aria-label="Previous match" disabled>◀</button>
                    <div id="aimScope" title="Snap to this match"></div>
                    <button id="aimNext" type="button" aria-label="Next match" disabled>▶</button>
                </div>
            </div>
        </div>

        <!--  The DETAILS, when you press "Details ▾".  It drops down right under the bar:
                1.  The match's FULL text,  big and easy to read  (the "focus" card).
                2.  Its whole row:  every column's name and value.
              (The brain fills it in.)  -->
        <div id="aimRow" role="region" aria-label="The match's details" hidden>
            <div class="row-head">
                <span id="aimRowTitle"></span>
                <button id="aimRowClose" type="button" aria-label="Close the details">×</button>
            </div>
            <div id="aimFocus">
                <div id="aimFocusName"></div>
                <div id="aimFocusText"></div>
            </div>
            <p class="row-sub">Viewing row vertically<span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p>
            <div id="aimRowList"></div>
        </div>

    </div>

    <p id="readingFrom" hidden>Reading from<span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span> <span id="readingName"></span></p>
```

| Code | Baby words |
|---|---|
| `tabindex="-1"` | Tabbing with the keyboard skips it (you Tab to the Choose File button instead). |
| `aria-hidden="true"` | Screen readers skip it too. The button is the one to use. |
| `role="group" aria-label="..."` | Tells screen readers "these pieces belong together, and here's what they're for." |
| `<span class="dots">` + 3 `<span>.</span>` | The 3 dots, each in its own box, so the clothes can show and hide them one at a time. |
| `disabled` (on Details ▾, ◀, ▶) | Greyed out and can't be clicked, until there's something to aim at. The brain turns them on. |
| `aria-expanded="false"` | Tells screen readers "this button opens something, and it's closed right now." |

> **Why wrap it all in `#fileArea`?** The details panel floats right under the bar. It needs something to measure "right under" FROM: the area around the bar.

> **Why is the file input still there?** The brain listens to IT (`fileInput`, Step 2.15). The button just opens it. So everything that already worked (picking a file, picking the same file again) keeps working.

<br>

### Step 6.2: The bar's clothes

In `styleI.css`, the old Choose File rules (`#csvFileInput`, `#csvFileInput::file-selector-button`, `#csvFileInput:hover::file-selector-button`) go away, and `#csvFileInput` comes OUT of the 3 lists it was in (the "on its own line" list, the light squares, and the `:focus` glow list). In their place:

```css
/*  ---- THE FILE BAR:   [▓ Choose File] [░ the aimbot window] ----

    ONE bar, two squares.  The accent square opens a file.
    The light square is the SNAP MENU's window  ("the aimbot"):  it locks onto
    a search match, and snaps the sheet right to it.

         ┌─────────────┬────────────────────────────────────┐
         │             │ ⌖  3 / 128          Row 42 · City   │
         │ Choose File │ ◀ ┌────────┬────────┬────────┐  ▶   │
         │             │   │Denver  │ CO     │ 980    │      │   <-  the "scope":  the 9 cells
         │             │   │Ana     │▓North ▓│ IL     │      │       around the match
         │             │   │Bo      │ Austin │ TX     │      │
         └─────────────┴───└────────┴────────┴────────┘──────┘
                          Reading from... sales.csv
*/
/*  The bar  +  the "whole row" panel that drops down under it.
    (The panel can't live INSIDE the bar:  the bar cuts off anything that sticks out of it.)  */
#fileArea {
    position: relative;             /*  the panel hangs from here  */
    width: fit-content;
    max-width: 100%;
    margin: 0 auto 6px;
}

#fileBar {
    display: flex;
    max-width: 100%;
    border: 1px solid var(--glass-edge);
    border-radius: 12px;
    overflow: hidden;               /*  keep the squares' corners inside the round ones  */
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}

/*  The real file picker is still here  (the brain listens to it),  just out of sight.
    The "Choose File" button opens it.  */
#csvFileInput {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
}

/*  The accent square:  as tall as the whole bar  */
#chooseBtn {
    margin: 0;
    padding: 0 18px;
    border: none;
    border-right: 1px solid var(--line, rgba(255, 255, 255, 0.6));  /*  the white line between the 2 squares  */
    border-radius: 0;
    box-shadow: inset 0 0 12px var(--inner-glow-soft, rgba(255, 255, 255, 0.55));
}

/*  The light square:  the aimbot window  */
#aimbot {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 8px 10px;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 13px;
    color: var(--text);
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));   /*  glowing white from inside  */
}

/*  The top line:   ⌖  3 / 128  ·  hit 1 of 2              Row 42 · City  */
.aim-head {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
}

#aimCount {
    font-weight: 600;
}

#aimWhere {
    margin-left: auto;              /*  pushed all the way right  */
    color: var(--text-soft);
    overflow: hidden;
    text-overflow: ellipsis;
}

/*  "Details ▾"  (the match's full text + its whole row),  at the right end of the top line  */
#aimRowBtn {
    margin: 0;
    padding: 0 10px;
    line-height: 22px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 8px;
}

#aimRowBtn:disabled {
    opacity: 0.4;
    filter: none;
    cursor: default;
}

/*  The match is CUT OFF in the scope  ("Customer cal...")  ->  the button says so:
    it turns into a dark square,  the SAME as the target cell  (so your eye links the two),
    and pulses twice,  like a cell does when you snap to it.
    Open?  It stays a dark square,  like the sheet tab you're on.  */
#aimRowBtn.more,
#aimRowBtn[aria-expanded="true"] {
    color: #fff;
    background: var(--square-dark);
    text-shadow: 0 0 8px var(--theme-glow);
    box-shadow: inset 0 0 10px color-mix(in srgb, var(--theme-glow) 35%, transparent);
}

#aimRowBtn.more {
    animation: tell-more 1.1s ease-out;
}

#aimRowBtn[aria-expanded="true"] {
    animation: none;                /*  already open:  nothing to tell  */
}

@keyframes tell-more {
    0%, 50% { box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 14px 3px rgba(255, 255, 255, 0.95); }
    25%, 75% { box-shadow: inset 0 0 10px color-mix(in srgb, var(--theme-glow) 35%, transparent); }
}

/*  The middle:   [◀]  the scope  [▶]  */
.aim-body {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 6px;
}

#aimPrev,
#aimNext {
    margin: 0;
    padding: 0;
    line-height: 26px;
    border-radius: 8px;
}

#aimPrev:disabled,
#aimNext:disabled {
    opacity: 0.4;
    filter: none;
    cursor: default;
}

/*  The scope:  a tiny piece of the sheet,  3 rows × 3 columns,  around the target.  */
#aimScope {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 92px));
    border: 1px solid var(--glass-edge);
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    cursor: pointer;                /*  click it  ->  snap to the target  */
}

.scope-cell {
    padding: 0 6px;
    font-size: 12px;
    line-height: 22px;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
    border-right: 1px solid var(--line-grid, rgba(255, 255, 255, 0.5));
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

.scope-cell:nth-child(3n) { border-right: none; }           /*  the last column:  no line on the right  */
.scope-cell:nth-last-child(-n+3) { border-bottom: none; }   /*  the last row:  no line underneath  */

.scope-header { font-weight: 600; background: var(--header-bg); }      /*  the column names  (when the target is in row 1)  */
.scope-edge   { background: rgba(0, 0, 0, 0.04); }                     /*  off the edge of the sheet:  nothing there  */

/*  The TARGET:  the middle cell.  A dark square, like the sheet tab you're on.  */
.scope-target {
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    background: var(--square-dark);
    box-shadow: inset 0 0 10px color-mix(in srgb, var(--theme-glow) 35%, transparent);
}

/*  The target is CUT OFF?  A little  ▾  in its corner:  "there's more,  see Details ▾".  */
.scope-target.cut {
    position: relative;
    padding-right: 16px;            /*  room for the  ▾  */
}

.scope-target.cut::after {
    content: "▾";
    position: absolute;
    right: 5px;
    top: 0;
    font-size: 11px;
}

/*  Nothing to show yet:  one line of words, all the way across.  */
.scope-hint {
    grid-column: 1 / -1;
    padding: 0 8px;
    font-size: 12px;
    line-height: 66px;              /*  as tall as the 3 rows it stands in for  */
    text-align: center;
    color: var(--text-soft);
    cursor: default;
}

/*  "Ready"  (no search yet):  the word glows softly, in and out, slowly.
    Only the word, not the whole window:  calmer on the eyes,  and less for the computer to redraw.
    (It's an "opacity" change:  the cheapest kind of animation there is.)  */
.scope-hint.ready {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text);
    text-shadow: 0 0 10px var(--theme-glow);
    animation: ready-glow 2.4s ease-in-out infinite alternate;
}

@keyframes ready-glow {
    from { opacity: 0.45; }
    to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
    .scope-hint.ready { animation: none; }
}


/*  ---- THE DETAILS  ("Details ▾") ----

    Drops down right under the bar.
      1.  The FOCUS card:  the match's full text,  bigger,  dark words on a light square
          (the easiest way round to read a lot of words).  Long?  It scrolls on its own.
      2.  The whole row:  every column's name and value.  The target is a dark square,
          like in the scope,  with its whole value  (long ones wrap onto more lines).

         ┌────────────────────────────────────────────┐
         │ Row 151  ·  40 columns                   × │   <-  dark
         ├────────────────────────────────────────────┤
         │ NOTES                                      │   <-  the focus card  (light)
         │ Customer called twice about the late       │
         │ delivery. Promised a credit ...            │
         ├────────────────────────────────────────────┤
         │ Viewing row vertically...                  │
         ├────────────┬───────────────────────────────┤
         │ H0         │ v150.0                        │
         │ notes      │▓Customer called twice about ▓ │
         │            │▓the late delivery. Promised ▓ │
         └────────────┴───────────────────────────────┘
*/
#aimRow {
    position: absolute;
    top: calc(100% + 6px);          /*  just under the bar  */
    left: 0;
    right: 0;
    z-index: 9;                     /*  over the search bar and the sheet  */
    display: flex;
    flex-direction: column;
    max-height: 440px;
    overflow: hidden;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 13px;

    /*  The same glass as the CSV window  */
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-edge);
    border-radius: 12px;
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 var(--shine, rgba(255, 255, 255, 0.9));
    animation: row-drop 0.22s ease-out;
}

@keyframes row-drop {
    from { opacity: 0; transform: translateY(-6px); }
}

/*  Its top line:   Row 151  ·  40 columns                ×   (a dark square, like the theme menu's title)  */
.row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 12px;
    line-height: 28px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    background: var(--square-dark);
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

#aimRowTitle {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

#aimRowClose {
    margin: 0;
    padding: 0 8px;
    line-height: 20px;
    border-radius: 6px;
}

/*  1.  THE FOCUS CARD:  a light square,  for reading.  */
#aimFocus {
    flex-shrink: 0;                 /*  never squeezed:  the row list below gives up room first  */
    display: flex;
    flex-direction: column;
    max-height: 200px;
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));   /*  glowing white from inside  */
    border-bottom: 1px solid var(--line, rgba(255, 255, 255, 0.6));
}

/*  "NOTES"  (the column's name)  */
#aimFocusName {
    padding: 8px 14px 2px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-soft);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/*  The full text:  bigger,  roomy lines,  real line breaks kept.  Long?  It scrolls.  */
#aimFocusText {
    padding: 2px 14px 10px;
    font-size: 15px;
    line-height: 24px;
    color: var(--text);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow-y: auto;
    scrollbar-width: thin;
}

/*  "Viewing row vertically..."  (its dots count up,  like "Reading from...")  */
.row-sub {
    flex-shrink: 0;
    margin: 0;
    padding: 0 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 22px;
    color: var(--text-soft);
    background: var(--header-bg);
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

/*  2.  The list:   [column name]  [its full value],  one line each  (or more, when it wraps).  It scrolls.  */
#aimRowList {
    display: grid;
    min-height: 90px;               /*  always room for a few rows  */
    grid-template-columns: minmax(80px, max-content) minmax(0, 1fr);
    overflow-y: auto;
    scrollbar-width: thin;
}

.row-name,
.row-value {
    padding: 4px 10px;
    line-height: 20px;
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

.row-name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: var(--ink, #333);
    background: var(--line-num-bg);                     /*  like the sheet's row-number column  */
    border-right: 1px solid var(--line, rgba(255, 255, 255, 0.6));
}

.row-value {
    white-space: pre-wrap;                              /*  keep real line breaks,  and wrap long words  */
    overflow-wrap: anywhere;
}

/*  The target:  a dark square,  with its whole value  (it wraps,  like every other value here)  */
.row-value.row-target {
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    background: var(--square-dark);
}

/*  A very wide row:  "showing columns 401–600 of 10,000"  */
.row-note {
    grid-column: 1 / -1;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text-soft);
    text-align: center;
}

@media (prefers-reduced-motion: reduce) {
    #aimRow,
    #aimRowBtn.more { animation: none; }
}


/*  ---- "Reading from...  sales.csv"  (under the bar) ----

    4 beats, forever:     (none)    .    ..    ...    (none)    .    ..    ...
    All 3 dots are ALWAYS there  (so the words never jiggle).  Only how see-through they are changes,
    in jumps  ("steps"),  twice a second.  No brain needed:  just the clothes.  */
#readingFrom {
    margin: 0 0 15px;
    text-align: center;
    font-size: 13px;
    color: var(--text-soft);
}

#readingName {
    font-weight: 600;
    color: var(--text);
}

.dots span:nth-child(1) { animation: dot-one   2s steps(1, end) infinite; }
.dots span:nth-child(2) { animation: dot-two   2s steps(1, end) infinite; }
.dots span:nth-child(3) { animation: dot-three 2s steps(1, end) infinite; }

@keyframes dot-one   { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 1; } }      /*  shows from the 2nd beat  */
@keyframes dot-two   { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 1; } }      /*  shows from the 3rd beat  */
@keyframes dot-three { 0% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 1; } }      /*  shows on the 4th beat    */

/*  Turned off motion?  The dots just sit there:  "..."  */
@media (prefers-reduced-motion: reduce) {
    .dots span { animation: none !important; }
}
```

| Code | Baby words |
|---|---|
| `display: flex` | The 2 squares sit side by side, as one bar. |
| `opacity: 0; pointer-events: none;` (the input) | Invisible, and the mouse goes right through it. |
| `grid-template-columns: repeat(3, minmax(0, 92px))` | The scope: 3 columns, each up to 92 pixels wide. |
| `.scope-cell:nth-child(3n)` | Every 3rd cell (the right column): no line on its right. |
| `.scope-cell:nth-last-child(-n+3)` | The last 3 cells (the bottom row): no line underneath. |
| `animation: ready-glow 2.4s ... infinite alternate` | "Ready" fades up, then back down (`alternate`), slowly, forever. Slow on purpose: calm, not blinking at you. |
| `#aimRowBtn.more` | The "there's more" look: a dark square, the same as the target cell, so your eye links the two. |
| `animation: tell-more 1.1s` | Glows bright, dims, bright, dims: 2 pulses, the same rhythm as a cell you snap to. Then it stops. |
| `.scope-target.cut::after { content: "▾" }` | A fake piece with a little ▾, tucked in the target's right corner. `padding-right: 16px` keeps the words from running under it. |
| `position: absolute; top: calc(100% + 6px)` (the details panel) | Float it just under the bar (100% of the area's height, plus 6px), ON TOP of the sheet, so nothing below it moves. |
| `max-height: 440px` | The panel can't grow taller than 440px. Inside, the focus card stops at 200px and the row list at what's left: each one scrolls on its own. |
| `flex-shrink: 0` (the focus card) | "Never squeeze me." When room runs out, the row list gives up room, not the card. |
| `font-size: 15px; line-height: 24px` (the focus card) | Bigger letters, roomy lines: made for reading a paragraph. |
| `text-transform: uppercase` | Show the words in CAPITALS (`NOTES`, `VIEWING ROW VERTICALLY`), without changing the real words. |
| `grid-template-columns: minmax(80px, max-content) minmax(0, 1fr)` | 2 columns: the names (as wide as they need, at least 80px), then the values get the rest. |
| `white-space: pre-wrap` | Keep the value's line breaks, and wrap long text, so you can read ALL of it. |
| `steps(1, end)` | Don't fade: JUMP from one value to the next. |

> **Why do the dots cost (almost) nothing?** All 3 dots are always there (so "sales.csv" never jiggles). Only how see-through they are changes, in jumps, about twice a second. That's done by the clothes alone (no brain, no timer). We measured it: with the dots, the page idles at the same CPU as without them.

> **The dots' timing:** 4 beats on one 2-second loop (half a second each). All 3 dots start see-through. Dot 1 shows a quarter of the way in (`25%`), dot 2 at half (`50%`), dot 3 at three quarters (`75%`), and they all vanish again when the loop starts over. So: `   ` → `.` → `..` → `...` → `   ` ...

> **Why no crosshair?** It's a tool, not a game. Plain words (**No search**, **Ready**, **3 / 128**) say what it's doing, with no decoration.

> **The details panel counts too.** Its "Viewing row vertically" label ends in the SAME 3 `<span>`s with `class="dots"`. The `.dots` rules already know what to do, so it counts `   ` `.` `..` `...` with no new code at all.

Then the **lock-on pulse**, next to the other cell rules (after `.cell.num`):

```css
/*  LOCKED ON:  the aimbot snapped to this cell.
    It pulses with the glow a cell gets when you hover it,  twice,  then settles.  */
.cell.locked {
    position: relative;
    z-index: 1;                     /*  on top, so the glow isn't hidden under the cells next to it  */
    animation: lock-on 1.1s ease-out;
}

@keyframes lock-on {
    0%, 50% {
        background: rgba(255, 255, 255, 0.7);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 16px 3px rgba(255, 255, 255, 0.95);
    }
    25%, 75% {
        background: rgba(255, 255, 255, 0.35);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6), 0 0 6px 1px rgba(255, 255, 255, 0.5);
    }
}

@media (prefers-reduced-motion: reduce) {
    .cell.locked { animation: none; box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.95); }   /*  just a still outline  */
}
```

> **`0%, 50%` and `25%, 75%`?** Bright at the start and halfway, dim in between. That's 2 pulses in 1.1 seconds. Then the animation ends, and the cell goes back to normal.

<br>

### Step 6.3: Teach the brain

**1.** Find the new pieces (Step 2.1). Replace the `fileInput` line with these:

```js
const fileInput   = document.getElementById('csvFileInput');   //  the real file picker  (out of sight)
const chooseBtn   = document.getElementById('chooseBtn');      //  the "Choose File" button  (it opens the picker)
const aimbot      = document.getElementById('aimbot');         //  the snap menu's window  ("the aimbot")
const aimCount    = document.getElementById('aimCount');       //  its "3 / 128"
const aimWhere    = document.getElementById('aimWhere');       //  its "Row 42 · City"
const aimScope    = document.getElementById('aimScope');       //  its 3 × 3 "scope"
const aimPrev     = document.getElementById('aimPrev');        //  its  ◀
const aimNext     = document.getElementById('aimNext');        //  its  ▶
const aimRowBtn   = document.getElementById('aimRowBtn');      //  its  "Details ▾"  button
const aimRow      = document.getElementById('aimRow');         //  the "details" panel  (under the bar)
const aimRowTitle = document.getElementById('aimRowTitle');    //  its  "Row 151 · 40 columns"
const aimFocusName = document.getElementById('aimFocusName');  //  its focus card's  "NOTES"  (the column's name)
const aimFocusText = document.getElementById('aimFocusText');  //  its focus card's full text
const aimRowList  = document.getElementById('aimRowList');     //  its list of  [name] [value]
const aimRowClose = document.getElementById('aimRowClose');    //  its  ×
const readingFrom = document.getElementById('readingFrom');    //  the "Reading from...  sales.csv" line
const readingName = document.getElementById('readingName');    //  the file's name in it
```

**2.** The Choose File button opens the real picker. Right after the `fileInput` click listener (Step 2.15):

```js
//  The "Choose File" button just opens the real file picker.
//  (The picker itself is out of sight:  its spot in the bar is the aimbot window's now.)
chooseBtn.addEventListener('click', function () {
    fileInput.click();
});
```

**3.** When a file is swapped in ("ALL DONE", Step 2.15), show "Reading from...". Add these lines right after `applyLook();` (or `showBadge();`, before Part 8):

```js
            readingName.textContent = file.name;
            readingFrom.hidden = false;         //  "Reading from...  sales.csv"
```

**4.** Scrolling sideways TO a spot. Part 2's `sheetSpot` turns the scrollbar into a spot in the sheet. This does it backwards (right after `sheetSpot`):

```js
//  The other way around:  to look at THIS spot in the sheet,  how far should the sideways scrollbar go?
//  (The snap menu uses it to scroll right to a cell.)
function scrollSpotFor(spot, viewWidth) {

    if (scrollWidth === sheetWidth) return spot;        //  not scaled?  1 pixel  =  1 pixel.

    const easy = 400;
    const scrollEnd = scrollWidth - viewWidth;
    const sheetEnd  = sheetWidth - viewWidth;

    if (spot <= easy || scrollEnd <= easy) return spot;

    return easy + (spot - easy) * (scrollEnd - easy) / (sheetEnd - easy);
}
```

**5.** One cell of one row, any column (right before `rowInfo`, Step 2.3b). The scope uses it to read the neighbors straight from the file:

```js
//  ONE cell of one row,  any column  (built or not).   For the snap menu's scope.
function cellAt(i, col) {

    const info = rowInfo(i);

    if (info.cells) return info.cells[col] || '';      //  a row with quotes:  already cut up
    if (col >= info.count) return '';                  //  this row is shorter than that

    const from = col === 0 ? 0 : info.commas[col - 1] + 1;
    const to   = col < info.count - 1 ? info.commas[col] : info.line.length;
    return info.line.slice(from, to);
}
```

**6.** At the very end of `showMatches` (Step 2.12), after `updatePosition();`:

```js
    aimReset();                     //  the snap menu locks onto the first match  (or "Ready")
```

**7.** And the snap menu itself (right after Go to row, Step 2.17):

```js
let aimAt   = -1;       //  which match the window is locked onto  (its spot in "matches").   -1  =  no target
let aimHits = [];       //  the columns in that row that have the word.   Like:  [2, 7]
let aimHit  = 0;        //  which one of those
let aimed   = false;    //  has the sheet snapped to it yet?  (Then the first press snaps to THIS one, not the next.)


//  New search results  ->  lock onto the first match.   No search  (or no matches)?  "Ready"  /  "No matches".
function aimReset() {

    aimed = false;

    if (query === '' || matches.length === 0) {
        aimAt = -1;
        drawAim();
        return;
    }

    aimOn(0, 0);
}


//  Lock onto match number "at",  hit number "hit"  (-1  =  that row's LAST hit).
function aimOn(at, hit) {
    aimAt   = at;
    aimHits = hitsIn(matches[at]);
    aimHit  = hit < 0 ? aimHits.length - 1 : hit;
    drawAim();
}


//  Which columns of this row have the search word?   (Check the row's search copy, one cell at a time.)
function hitsIn(row) {

    const cells = searchText[row].split('\u0000');
    const hits  = [];

    for (let col = 0; col < cells.length; col++) {
        if (cells[col].includes(query)) hits.push(col);
    }

    return hits.length > 0 ? hits : [0];        //  (the row matched, so there's always one.  But never leave it empty.)
}


//  ▶  (way = 1)   or   ◀  (way = -1):   move to the next  (or the one before),  then snap.
function aimStep(way) {

    if (aimAt === -1) return;

    if (aimed) {
        if (way > 0) {
            if (aimHit + 1 < aimHits.length) aimHit++;                          //  the next hit in this row...
            else aimOn((aimAt + 1) % matches.length, 0);                        //  ...or the first hit of the next row
        } else {
            if (aimHit > 0) aimHit--;                                           //  the hit before, in this row...
            else aimOn((aimAt - 1 + matches.length) % matches.length, -1);      //  ...or the LAST hit of the row before
        }
        drawAim();
    }

    snapToTarget();
}


//  SNAP:  scroll the sheet so the target cell is in the middle,  and make it pulse.
function snapToTarget() {

    if (aimAt === -1) return;

    aimed = true;
    const col = aimHits[aimHit];


    //  1.  Up and down:  the row in the middle of the window  (or of the screen, when it's expanded).
    if (outputBox.classList.contains('expanded')) {
        const rowsTopOnPage = rowsBox.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, rowsTopOnPage + pageSpotFor(aimAt * rowHeight - window.innerHeight / 2));
    } else {
        const top = Math.max(0, (aimAt - Math.floor(WINDOW_SIZE / 2)) * rowHeight);
        buildVisibleRows(top);
        setViewY(top);
    }


    //  2.  Sideways:  the column in the middle.
    knowBox();                                              //  (the remembered size:  no stopping the browser to measure)
    const viewWidth = Math.max(boxWidth - NUM_WIDTH, 0);
    const spot      = columnStarts[col] - (viewWidth - columnWidths[col]) / 2;

    outputBox.scrollLeft = scrollSpotFor(Math.max(0, spot), viewWidth);
    updateColumns();
    buildVisibleRows();
    updatePosition();


    //  3.  LOCK ON:  the cell pulses.
    //      (A row is:  [number] [left spacer] [the built cells ...] [right spacer].   So the cell is child  2 + its spot.)
    const line = rowsBox.querySelector('[data-index="' + aimAt + '"]');
    if (line === null || col < builtColStart || col >= builtColEnd) return;

    const cell = line.children[2 + col - builtColStart];
    cell.classList.remove('locked');
    void cell.offsetWidth;                                  //  (take it off and put it back, so it plays again)
    cell.classList.add('locked');
    cell.addEventListener('animationend', function () { cell.classList.remove('locked'); }, { once: true });
}


//  Draw the window:   ⌖  3 / 128  ·  hit 1 of 2          Row 42  ·  City   +   the scope.
function drawAim() {

    aimScope.textContent = '';

    if (aimAt === -1) {                                     //  NOTHING TO SHOW:  "Ready"  (or "nothing matches")
        aimCount.textContent = query !== '' ? 'No matches' : 'No search';
        aimWhere.textContent = '';
        aimPrev.disabled = true;
        aimNext.disabled = true;
        aimRowBtn.disabled = true;
        aimRowBtn.classList.remove('more');
        toldAbout = '';
        showRow(false);                                     //  no match  =  no row to show



        const hint = document.createElement('div');
        hint.className = query !== '' ? 'scope-hint' : 'scope-hint ready';
        hint.textContent = query !== '' ? 'nothing matches "' + searchInput.value.trim() + '"' : 'Ready';
        aimScope.appendChild(hint);
        return;
    }

    const row = matches[aimAt];
    const col = aimHits[aimHit];

    aimPrev.disabled = false;
    aimNext.disabled = false;
    aimRowBtn.disabled = false;
    if (!aimRow.hidden) drawRow();                          //  the details are open?  They follow the target.

    aimCount.textContent = (aimAt + 1) + ' / ' + matches.length +
        (aimHits.length > 1 ? '  ·  hit ' + (aimHit + 1) + ' of ' + aimHits.length : '');

    //  Where:  the row number  (like the sheet's),  and the column's name.
    //  The spreadsheet look?  Excel's address too, like  K43.   (Excel's row 1 is our header,  so Excel's row  =  ours + 1.)
    aimWhere.textContent = 'Row ' + (row + 1 + rowShift()) + '  ·  ' + (headerCells[col] || 'column ' + (col + 1)) +
        (spreadsheetLook() ? '  (' + columnName(col) + (row + 2) + ')' : '');

    //  The scope:  the 3 × 3 cells around the target,  straight from the file  (so you see its real neighbors).
    let target = null;

    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {

            const box = document.createElement('div');
            box.className = 'scope-cell';

            if (c < 0 || r >= rowCount) {
                box.classList.add('scope-edge');                                //  off the edge of the sheet
            } else if (r < 0) {
                box.classList.add('scope-header');                              //  above row 1:  the column names
                box.textContent = headerCells[c] || '';
            } else {
                const text = cellAt(r, c).slice(0, 200).replace(/\r\n|\r|\n/g, '↵');
                if (r === row && c === col) {
                    box.classList.add('scope-target');                          //  THE TARGET  (your word in yellow)
                    paintMatches(box, text, query);
                    target = box;
                } else {
                    box.textContent = text;
                }
            }

            aimScope.appendChild(box);
        }
    }

    tellMore(target, cellAt(row, col), row + ':' + col);
}


//  Is the target CUT OFF in its little box?   ("Customer cal...":  too wide,  a line break in it,  or past 200 letters.)
//  Then SAY so:   a  ▾  in its corner,  and the "Details ▾" button turns into a dark square like the target.
//  A NEW cut-off target  (and the details are closed)?  The button pulses twice too,  so you notice it.
let toldAbout = '';         //  the last target the button pulsed for  ("row:col"),  so it doesn't pulse again for the same one

function tellMore(target, full, which) {

    const cut = target !== null &&
        (full.length > 200 || /[\r\n]/.test(full) || target.scrollWidth > target.clientWidth + 1);

    if (target !== null) target.classList.toggle('cut', cut);

    if (!cut) {
        aimRowBtn.classList.remove('more');
        return;
    }

    if (which !== toldAbout && aimRow.hidden) {
        aimRowBtn.classList.remove('more');
        void aimRowBtn.offsetWidth;                         //  (take it off and put it back, so the pulse plays again)
    }
    aimRowBtn.classList.add('more');
    toldAbout = which;
}


//  THE DETAILS  ("Details ▾"):   for when the scope's little boxes are too small to read it all.
//    1.  The FOCUS card:  the target's full text,  big,  scrolled to your word.
//    2.  The whole row:  every column's name and value.
//  It stays open as you press ▶ / ◀,  following the target.
//
//  A row with THOUSANDS of columns?  Only the 200 around the target are listed  (so it stays quick),
//  with a note saying which ones.   A giant cell?  The card shows its first 20,000 letters.
const ROW_LIMIT     = 200;
const FOCUS_LETTERS = 20000;

function showRow(open) {
    aimRow.hidden = !open;
    aimRowBtn.setAttribute('aria-expanded', open);
    if (open) drawRow();
}


function drawRow() {

    if (aimAt === -1) return;

    const row   = matches[aimAt];
    const col   = aimHits[aimHit];
    const count = Math.max(headerCells.length, rowInfo(row).count);

    //  Which columns:  all of them,  or the ROW_LIMIT around the target.
    const from = Math.max(0, Math.min(col - ROW_LIMIT / 2, count - ROW_LIMIT));
    const to   = Math.min(count, from + ROW_LIMIT);

    aimRowTitle.textContent = 'Row ' + (row + 1 + rowShift()) + '  ·  ' + count + ' column' + (count === 1 ? '' : 's');

    //  1.  The FOCUS card:   the column's name  ("NOTES")   and the full text,  your word in yellow.
    const full = cellAt(row, col);

    aimFocusName.textContent = (headerCells[col] || 'column ' + (col + 1)) +
        (spreadsheetLook() ? '  ·  ' + columnName(col) + (row + 2) : tableLook() ? sqlType(col) : '');

    aimFocusText.textContent = '';
    paintMatches(aimFocusText, full.length > FOCUS_LETTERS ? full.slice(0, FOCUS_LETTERS) + '…' : full, query);

    //  A long text?  Scroll the card to your word  (a line above it,  so you see what comes before).
    const word = aimFocusText.querySelector('mark');
    aimFocusText.scrollTop = word === null ? 0 : Math.max(0, word.offsetTop - aimFocusText.offsetTop - 24);

    //  2.  The whole row.
    aimRowList.textContent = '';

    const list = document.createDocumentFragment();         //  (build it off to the side, then drop it in all at once)

    if (from > 0 || to < count) {
        const note = document.createElement('div');
        note.className = 'row-note';
        note.textContent = 'showing columns ' + (from + 1) + '–' + to + ' of ' + count + '  (around the match)';
        list.appendChild(note);
    }

    let target = null;

    for (let c = from; c < to; c++) {

        const name = document.createElement('div');
        name.className = 'row-name';
        name.textContent = (headerCells[c] || 'column ' + (c + 1)) + (spreadsheetLook() ? '  ·  ' + columnName(c) : tableLook() ? sqlType(c) : '');
        name.title = name.textContent;

        const text  = cellAt(row, c);
        const value = document.createElement('div');
        value.className = 'row-value';

        const shown = text.length > 2000 ? text.slice(0, 2000) + '…' : text;     //  (a giant cell:  just its start)

        if (c === col) {
            value.classList.add('row-target');
            paintMatches(value, shown, query);              //  your word in yellow
            target = value;
        } else {
            value.textContent = shown;
        }

        if (sqlInfo !== null && sqlIsNull(sqlInfo, row + 1, c)) value.classList.add('null');   //  a SQL NULL:  the clothes show a faint NULL

        list.append(name, value);
    }

    aimRowList.appendChild(list);

    //  Scroll the list so the target is in view  (a third of the way down).
    //  ("offsetTop" counts from the top of the whole panel,  so take off where the list starts.)
    if (target !== null) aimRowList.scrollTop = Math.max(0, target.offsetTop - aimRowList.offsetTop - aimRowList.clientHeight / 3);
}


aimRowBtn.addEventListener('click', function () { showRow(aimRow.hidden); });
aimRowClose.addEventListener('click', function () { showRow(false); aimRowBtn.focus(); });

//  Escape closes the details  (if they're open).
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !aimRow.hidden) {
        showRow(false);
        aimRowBtn.focus();
    }
});


aimNext.addEventListener('click', function () { aimStep(1); });
aimPrev.addEventListener('click', function () { aimStep(-1); });
aimScope.addEventListener('click', function () { snapToTarget(); });

//  Enter in the search bar  =  ▶.     Shift + Enter  =  ◀.
searchInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    aimStep(e.shiftKey ? -1 : 1);
});

drawAim();                          //  start out "Ready"
```

> **Building in order?** A few lines here use `spreadsheetLook()`, `tableLook()`, `sqlType()` and `rowShift()`: they come in Part 8 (Spreadsheet View), and `sqlInfo` / `sqlIsNull` in Part 9 (SQL dumps). Until then, read the looks as `false`, `rowShift()` as `0`, and leave out the `sqlInfo` lines.

| Code | Baby words |
|---|---|
| `fileInput.click()` | Opens the file picker, just like clicking it. |
| `(aimAt + 1) % matches.length` | The next one, and after the last one, back to 0. (`%` = the leftover after dividing.) |
| `(aimAt - 1 + matches.length) % matches.length` | The one before, and before the first one, the last one. (The `+ matches.length` keeps it from going below 0.) |
| `searchText[row].split('\u0000')` | The row's search copy, cut at the ␀ walls = its cells, in small letters (Step 2.13). |
| `line.children[2 + col - builtColStart]` | A row is `[number] [left spacer] [the built cells...]`, so a cell is child number 2 + its spot among the built ones. |
| `{ once: true }` | "Listen just ONE time, then stop listening." |
| `e.preventDefault()` | "Browser, don't do your normal thing with Enter." |
| `ROW_LIMIT = 200` | A row with thousands of columns only lists the 200 around the target, so the panel stays quick. A note says which ones. |
| `document.createDocumentFragment()` | A box off to the side: build the whole list in it, then drop it onto the page all at once. |
| `text.slice(0, 2000) + '…'` | A GIANT cell: the list shows its first 2000 letters. (The focus card shows up to `FOCUS_LETTERS` = 20,000.) |
| `aimFocusText.scrollTop = word.offsetTop - ...` | Scroll the card so your yellow word is near the top (one line of room above it). |
| `classList.toggle('cut', cut)` | Add the `cut` label if `cut` is true, take it off if it's false. |
| `aimRowList.scrollTop = ...` | Scroll the panel so the target sits a third of the way down. |

> **Why does searching NOT move the sheet?** You're still typing! If the sheet jumped on every letter, it'd be jumping around under your nose. The window locks on quietly; YOU decide when to snap.

> **Why does the first ▶ snap to the match you SEE, not the next one?** The window shows match 1. Pressing ▶ and landing on match 2 would skip the one you were looking at.

> **Why does the scope show the FILE's neighbors, not the search's?** So you see the match in its real place: the row above it and below it in the file, even if they didn't match.

> **Why does the details panel stay open as you press ▶?** So you can read match after match. Every snap redraws it (`if (!aimRow.hidden) drawRow();`), following the target.

> **Why dark words on a LIGHT square in the focus card, when the target is a dark square everywhere else?** A dark square is great for "HERE it is" (it stands out). Dark words on light are easier for READING a lot of words. The card is for reading.

> **How does it know the target is cut off?** `tellMore` checks 3 things: more than 200 letters (the scope only gets the first 200), a line break in it (the scope shows `↵`), or `scrollWidth > clientWidth` ("the words are wider than the box", so the browser had to add `...`).

> **Why does the button only pulse for a NEW target?** `toldAbout` remembers the last one it pulsed for. Typing more letters re-locks onto the same match; pulsing every time would nag.

> **Does it work on giant sheets?** Yes: the test snaps to column 55,000 of a 60,000-column sheet, and to row 150,000 of a 200,000-row sheet (both with "scaled" scrollbars), and checks that the cell really ends up on screen.

<br>

### ✅ Test it

1. Before picking a file: the window says **No search**, and **Ready** slowly glows in and out.
2. Pick a file: under the bar, **Reading from... (its name)**, with the dots counting: none, 1, 2, 3, none...
3. Search for a word that's in a few rows. The window says `1 / 3` (or however many), where it is, and the scope shows it in the middle, in yellow.
4. Press **▶** (or Enter): the sheet jumps right to it, and the cell pulses. Again: the next one.
5. **◀** (or Shift+Enter) goes back. At the end, it wraps around.
6. Search for a word in a LONG cell: the target shows `... ▾`, and **Details ▾** turns dark and pulses twice.
7. Press **Details ▾**: the full text drops down, big, with your word in yellow, and the whole row under it, labeled **VIEWING ROW VERTICALLY** with the same counting dots (the match on a dark square, wrapped so you see all of it). Press ▶: it follows. Press **×** or **Escape**: it closes.
8. Search for nonsense: **No matches**. Clear the search: back to **No search** and **Ready**.

> Try it on a WIDE file (lots of columns) with your word way off to the right. That's what it's for.

<br>

---

<br>

# PART 7: Drag Mode ✋

On Windows, clicking the mouse WHEEL turns on a special scroll: move the mouse away from where you clicked, and the page moves that way, in any direction. Further away = faster.

But Macs have no middle click, trackpads don't either, plenty of people never use it, and phones have no mouse at all. So we build it **into the page**, behind a plain button anyone can see: **Drag mode**.

```text
   [Drag mode]   [Row # | Go to row]    [Expand (show all)]
        ↑ first in the row, so people see it right away.  On = a dark square.

   Then HOLD on the sheet, and drag:

        ●  ← the ANCHOR (a little glass dot, right where you pressed)
         \
          \     drag away from it  →  the sheet moves that way
           ↘    further  =  faster      close  =  slow and careful      on it  =  stopped
```

- **Hold and drag** (mouse, trackpad, or finger): the sheet moves. **Let go**: it stops, and lands on a whole row, like the wheel.
- **Escape** stops it too.
- It never goes past the top, the bottom, or the sides, and its top speed stays inside what the page can draw smoothly.

This part touches **3 files**: the skeleton, the clothes, and the brain.

<br>

### Step 7.1: The skeleton

**1.** In `testI.html`, put the button FIRST inside `<div id="controls" hidden>`:

```html
        <button id="dragBtn" type="button" aria-pressed="false" title="Drag mode: hold on the sheet and drag, any direction">Drag mode</button>
```

**2.** And right after the `<div id="output">...</div>` window, the anchor dot:

```html
    <!--  Drag mode's ANCHOR:  a little glass dot where you pressed.  Drag away from it.  -->
    <div id="dragAnchor" hidden></div>
```

| Code | Baby words |
|---|---|
| `aria-pressed="false"` | Tells screen readers "this is an ON/OFF switch, and it's off." The brain flips it. |
| `title="..."` | The little note that pops up when the mouse rests on the button: how to use it. |

<br>

### Step 7.2: The clothes

Add this right after the `#expandBtn` rule:

```css
/*  "Drag mode".  First in the row,  so people see it right away.
    It's a mode  (it changes what pressing on the sheet does),  so it sits apart too.  */
#dragBtn {
    margin: 0 28px 0 0;
}

/*  ON:  a dark square,  like every other "on" switch here  */
#dragBtn[aria-pressed="true"] {
    color: #fff;
    background: var(--square-dark);
    text-shadow: 0 0 8px var(--theme-glow);
    box-shadow:
        inset 0 0 10px color-mix(in srgb, var(--theme-glow) 35%, transparent),
        0 4px 14px rgba(0, 0, 0, 0.1);
}

/*  Drag mode is on:  the mouse turns into a "drag any direction" pointer over the sheet,
    and a finger on a phone drags it too  (instead of the phone scrolling the page by itself).  */
#output.drag {
    cursor: all-scroll;
    touch-action: none;
    user-select: none;
}

/*  The ANCHOR:  where you pressed.  A little glass dot  (a light square,  made round),
    with a dark center.  Drag away from it.  It sits ON the screen  (fixed),  not on the sheet.  */
#dragAnchor {
    position: fixed;
    z-index: 12;
    width: 28px;
    height: 28px;
    margin: -15px 0 0 -15px;        /*  centered on the spot  (half of 28,  plus the 1px edge)  */
    border-radius: 50%;
    background: var(--square-light);
    border: 1px solid var(--glass-edge);
    box-shadow:
        inset 0 0 8px rgba(255, 255, 255, 0.8),
        0 0 12px 2px rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
    pointer-events: none;           /*  clicks go right through it  */
}

#dragAnchor::after {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    background: var(--square-dark);
}
```

| Code | Baby words |
|---|---|
| `[aria-pressed="true"]` | "When the switch is ON." The same label the screen readers use: one label, two jobs. |
| `cursor: all-scroll` | Over the sheet, the mouse turns into the "drag any direction" pointer. |
| `touch-action: none` | On a phone: "Browser, don't scroll the page when a finger drags here. The brain's got it." |
| `user-select: none` | Dragging doesn't paint the words blue (selecting them). |
| `position: fixed` (the anchor) | Glued to the SCREEN, not the sheet: the sheet moves under it, and it stays put. |
| `margin: -15px 0 0 -15px` | Pull it back by half its size (28 + the 2 edges = 30, half = 15), so its CENTER sits on the spot, not its corner. |
| `pointer-events: none` | Clicks go right through it. |
| `inset: 10px` (the dark center) | "Stretch to fill, but 10 pixels in from every edge" = an 8-pixel dot in the middle. |

<br>

### Step 7.3: The brain

**1.** Find the new pieces (Step 2.1). Right after the `controls` line:

```js
const dragBtn     = document.getElementById('dragBtn');        //  the "Drag mode" button  (on / off)
const dragAnchor  = document.getElementById('dragAnchor');     //  drag mode's anchor dot
```

**2.** In `snapToRow` (Step 2.20), make this the very first line inside it:

```js
    if (dragging) return;                   //  drag mode is moving?  Snap when you let go, not now.
```

**3.** And drag mode itself, right after `snapToRow`:

```js
const DRAG_DEAD_ZONE = 10;      //  pixels around the anchor where nothing moves  (so your hand can rest)
const DRAG_FULL_AT   = 250;     //  this far from the anchor  (in pixels)  =  top speed
const DRAG_TOP_DOWN  = 6000;    //  top speed up and down:  pixels a second  (= 200 rows a second)
const DRAG_TOP_SIDE  = 3000;    //  top speed sideways  (slower:  sideways means building new columns)

let dragOn     = false;     //  is the "Drag mode" button on?
let dragging   = false;     //  holding and dragging right now?
let anchorX    = 0;         //  where you pressed  (on the screen)
let anchorY    = 0;
let pointerX   = 0;         //  where the pointer is now
let pointerY   = 0;
let dragX      = 0;         //  where we're looking:  sideways,  in exact SHEET pixels
let dragY      = 0;         //  ...and up and down.   (Exact,  even between pixels:  slow speeds add up.)
let dragWidth  = 0;         //  measured once when you press  (so the drag never has to stop and measure)
let dragBottom = 0;         //  the lowest it can go
let dragPage   = false;     //  Expand mode?  Then the PAGE scrolls up and down,  not the window.
let dragLast   = 0;         //  the time of the last step  (0 = just starting)


//  The "Drag mode" button:  on / off.
dragBtn.addEventListener('click', function () {
    dragOn = !dragOn;
    dragBtn.setAttribute('aria-pressed', dragOn);
    outputBox.classList.toggle('drag', dragOn);     //  the clothes:  a "drag" mouse pointer,  and no phone panning
    if (!dragOn) stopDragging();
});


//  How fast,  for this far from the anchor?   (in pixels a second)
//  Gentle near the anchor,  quick far away:  the speed grows with the distance SQUARED.
//     10 px away  ->  0        130 px  ->  a quarter of top speed        250 px +  ->  top speed
function dragSpeed(distance, top) {
    const past = Math.abs(distance) - DRAG_DEAD_ZONE;
    if (past <= 0) return 0;
    const amount = Math.min(past / (DRAG_FULL_AT - DRAG_DEAD_ZONE), 1);
    return Math.sign(distance) * top * amount * amount;
}


//  HOLD on the sheet  ->  drop the anchor,  start moving.
outputBox.addEventListener('pointerdown', function (e) {

    if (!dragOn || dragging) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;       //  only the main button

    //  On the window's own scrollbars?  Let them work like always.
    const box = outputBox.getBoundingClientRect();
    if (e.clientX - box.left - outputBox.clientLeft > outputBox.clientWidth ||
        e.clientY - box.top - outputBox.clientTop > outputBox.clientHeight) return;

    e.preventDefault();                             //  no text selecting,  no browser scrolling

    //  Keep telling us where the pointer is,  even off the sheet.
    //  (A pointer that's already gone can't be held onto.  The browser complains:  fine,  carry on.)
    try { outputBox.setPointerCapture(e.pointerId); } catch (err) { }

    dragging = true;
    anchorX  = pointerX = e.clientX;
    anchorY  = pointerY = e.clientY;

    wheelTarget = null;                             //  a wheel glide going?  The drag takes over.
    clearTimeout(snapTimer);

    //  Where are we now?  (Measure everything ONCE,  here.)
    dragPage   = outputBox.classList.contains('expanded');
    dragWidth  = Math.max(outputBox.clientWidth - NUM_WIDTH, 0);
    dragX      = sheetSpot(outputBox.scrollLeft, dragWidth);
    dragY      = dragPage ? window.scrollY : readViewY();
    dragBottom = dragPage ? document.documentElement.scrollHeight - window.innerHeight : lowestViewY();

    dragAnchor.style.left = anchorX + 'px';
    dragAnchor.style.top  = anchorY + 'px';
    dragAnchor.hidden = false;

    dragLast = 0;
    requestAnimationFrame(dragStep);
});


//  The pointer moves  ->  remember where it is.  (The next step moves toward it.)
window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    pointerX = e.clientX;
    pointerY = e.clientY;
});

//  Let go  (or the browser cancels it,  or you switch to another window)  ->  stop.
window.addEventListener('pointerup', stopDragging);
window.addEventListener('pointercancel', stopDragging);
window.addEventListener('blur', stopDragging);

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dragging) stopDragging();
});


//  ONE STEP OF THE DRAG  (every redraw).   Timed by the clock,  like the glide,
//  so it moves the same speed on a 60, 120, or 144 Hz screen.
function dragStep(t) {

    if (!dragging) return;

    const passed  = dragLast === 0 ? 1000 / 60 : Math.min(t - dragLast, 100);
    dragLast = t;
    const seconds = passed / 1000;

    const speedX = dragSpeed(pointerX - anchorX, DRAG_TOP_SIDE);
    const speedY = dragSpeed(pointerY - anchorY, DRAG_TOP_DOWN);

    //  Sideways  (in sheet pixels,  then turned into the scrollbar's number:  it might be "scaled")
    if (speedX !== 0) {
        dragX = Math.min(Math.max(dragX + speedX * seconds, 0), Math.max(sheetWidth - dragWidth, 0));
        outputBox.scrollLeft = scrollSpotFor(dragX, dragWidth);
    }

    //  Up and down
    if (speedY !== 0) {
        dragY = Math.min(Math.max(dragY + speedY * seconds, 0), Math.max(dragBottom, 0));
        if (dragPage) window.scrollTo(window.scrollX, dragY);
        else setViewY(dragY);
    }

    //  (Moving the scrollbars sets off the "scroll" listener,  which builds the new rows and columns.)
    requestAnimationFrame(dragStep);
}


function stopDragging() {
    if (!dragging) return;
    dragging = false;
    dragAnchor.hidden = true;
    snapToRow();                                    //  land on a whole row
}
```

| Code | Baby words |
|---|---|
| `DRAG_DEAD_ZONE = 10` | Within 10 pixels of the anchor: nothing moves. Your hand can rest without the sheet drifting. |
| `DRAG_TOP_DOWN = 6000` | Top speed up and down: 6,000 pixels a second = 200 rows a second. The treadmill (Step 2.6) builds that easily. |
| `DRAG_TOP_SIDE = 3000` | Top speed sideways: slower, because sideways means building brand-new columns. |
| `amount * amount` | The speed grows with the distance SQUARED: half way = a quarter of the speed. Gentle near the anchor, quick far away. |
| `Math.sign(distance)` | `1` for down/right, `-1` for up/left. Which WAY to go. |
| `e.preventDefault()` | "Browser, don't select words, and don't scroll by yourself." |
| `setPointerCapture` | "Keep telling ME where this pointer goes, even when it leaves the sheet." So you can drag past the edge of the sheet. |
| `try { ... } catch (err) { }` | "Try this. If it fails, don't crash, just carry on." |
| `window.addEventListener('pointerup', stopDragging)` | Let go ANYWHERE on the page (even off the sheet): stop. |
| `sheetSpot` / `scrollSpotFor` | Sideways, it moves in SHEET pixels, then turns that into the scrollbar's number. That keeps the speed right on super-wide "scaled" sheets (Step 2.9). |
| `setViewY` | Up and down, the same: exact pixels, even on a scaled 200,000-row file (Step 2.20). |
| `window.scrollTo` | Expand mode: the whole PAGE scrolls, not the window. |
| `Math.min(Math.max(...))` | Keep it between the top (0) and the bottom (`dragBottom`), and between the left and the right edge. Never past them. |

> **Why HOLD, and not "click once, then steer"?** We tried both. Holding feels better, and it's foolproof: your hand is ON the drag the whole time, so you always know how to stop it (let go). A "click to start" mode keeps moving after you let go, which is easy to lose track of.

> **Why does it keep its OWN exact spot (`dragX`, `dragY`)?** The scrollbar only stores whole pixels. Dragging slowly (say, 40 pixels a second) is under 1 pixel per redraw: the scrollbar would round it away every time, and the sheet would never move. The brain's own numbers keep the fractions, so they add up.

> **Why measure everything ONCE, when you press?** Measuring the page (`clientWidth`, `lowestViewY()`) right after moving it forces the browser to stop and redo its layout. Doing that every redraw would make the drag stutter. The sizes don't change mid-drag, so measuring once is enough.

> **Why is it timed by the clock, like the glide?** So it moves the same speed on every screen: 6,000 pixels a SECOND, whether that's 100 per redraw (60 Hz) or 50 per redraw (120 Hz).

> **Why doesn't `snapToRow` snap while dragging?** Every scroll restarts the "snap when you stop" timer (Step 2.20). Hold the pointer still near the anchor, and that timer would fire mid-drag and fight you. So `snapToRow` waits, and `stopDragging` calls it once, when you let go.

> **Why skip presses on the scrollbars?** The window's own scrollbars are part of `#output`. Without the check, grabbing the scrollbar would drop an anchor instead.

<br>

### ✅ Test it

1. Open a file: **Drag mode** is first in the controls row.
2. Click it: it turns into a dark square. Over the sheet, the mouse turns into a 4-way arrow.
3. Hold on the sheet: a glass dot appears. Drag down a little: the sheet creeps down. Drag further: it speeds up. Drag up, sideways, diagonally: it follows. Let go: it stops, and lands on a whole row.
4. Just click (don't hold): nothing keeps moving.
5. Drag to the very bottom: it stops there. To the top: it stops at row 1.
6. Press **Escape** mid-drag: it stops. Click **Drag mode** again: off, and holding on the sheet does nothing special.
7. On a phone (or with the browser's phone mode, F12 → the phone icon): turn it on, then hold and drag on the sheet.

> Try it on a HUGE file (hundreds of thousands of rows) and a WIDE one: same speed, same smoothness.

<br>

---

<br>

# PART 8: Spreadsheet View ↔ CSV View 📗

The same file, two ways to look at it, and a button that **flips** between them like turning over a card.

```text
   CSV look  (a CSV opens like this)                Spreadsheet look  (an Excel file opens like this)

   ┌───┬──────┬────────┬────────┐                   ┌───┬──────┬────────┬────────┬──────┬──────┬──────┐
   │ 0 │ id   │ name   │ city   │                   │   │  A   │   B    │   C    │  D   │  E   │  F   │  ← the letters
   ├───┼──────┼────────┼────────┤        flip       ├───┼──────┼────────┼────────┼──────┼──────┼──────┤
   │ 1 │ 1    │ Ana    │ Denver │      ───────▶     │ 1 │ id   │ name   │ city   │      │      │      │  ← the names are row 1
   │ 2 │ 2    │ Bo     │ Austin │      ◀───────     │ 2 │ 1    │ Ana    │ Denver │      │      │      │
   └───┴──────┴────────┴────────┘                   │ 3 │ 2    │ Bo     │ Austin │      │      │      │
                                                    └───┴──────┴────────┴────────┴──────┴──────┴──────┘
   [Spreadsheet View]  (dark Excel green)            WIDER, with empty columns, like Excel's grid.   [CSV View]  (black)
```

The spreadsheet look is **Excel's way** of showing a sheet:

- a row of column **letters** on top (A, B, C ... Z, AA ...)
- Excel's **row numbers**: the column names are row 1, so the first real row is row 2
- Excel **addresses** in the snap menu (like `B78`), for a CSV too
- the green **ƒ** on formulas
- a **wider** window, filled out with empty lettered columns, like Excel's grid that keeps going past your data

**The flip:** the window turns away until it's edge-on (you can't see it), switches looks right then (so the widening is never seen), and turns back. Nothing is read again: the file, the Excel notes, your search, and where you are all stay.

**Sheet tabs** keep the look you picked: flip an Excel file to the CSV look, and every sheet you click opens "as a CSV" too.

This part touches **3 files**.

<br>

### Step 8.1: The skeleton

At the end of `<div id="controls" hidden>`, after the Expand button:

```html
        <button id="viewBtn" type="button" title="Flip between the spreadsheet look (like Excel) and the CSV look">Spreadsheet View</button>
```

> **Why does it start out saying "Spreadsheet View"?** The button always says the look it flips **to**. The brain changes its words (and color) every time.

<br>

### Step 8.2: The clothes

**1.** The wider window, and the flip. Right after the `#output.expanded` rule:

```css
#output.excel {
    max-width: 1320px;
}


/*  THE FLIP  (switching looks):  the window turns away like a card,  until it's edge-on  (invisible),
    the brain switches the look right then  (so the widening is never seen),  and it turns back.

         ▯   ->   ▏   ->   ▭

    Made to be easy on the eyes:
      •  ONE smooth motion.  The two halves are the two halves of the same curve:
         speeding up  ("ease in")  ->  the switch  ->  slowing down  ("ease out"),  at EXACTLY the same speed
         on both sides of the switch.  (Different speeds there = a little kick your eye feels.)
      •  It fades a little as it turns,  so the thin edge-on moment is soft,
         instead of a sharp line swinging at you.
      •  The float keeps going underneath  (it moves "translate",  the flip moves "transform":  2 different things),
         so nothing jumps when the flip starts or ends.

    "perspective"  =  how far away your eye is:  the near edge looks bigger,  so it reads as 3D.
    Only "transform" and "opacity" change:  the two cheapest things to animate.
    (Written AFTER  "#output.expanded",  so the flip wins over its  "animation: none".)  */
#output.flip-away {
    animation:
        float 6s steps(3) infinite,                                     /*  (the SAME float:  it just keeps going)  */
        flip-away 0.25s cubic-bezier(0.11, 0, 0.5, 0) forwards;         /*  speeding up as it turns away  */
}

#output.flip-back {
    animation:
        float 6s steps(3) infinite,
        flip-back 0.25s cubic-bezier(0.5, 1, 0.89, 1);                  /*  slowing down as it lands  */
}

/*  (No float in Expand mode:  just the flip.)  */
#output.expanded.flip-away { animation: flip-away 0.25s cubic-bezier(0.11, 0, 0.5, 0) forwards; }
#output.expanded.flip-back { animation: flip-back 0.25s cubic-bezier(0.5, 1, 0.89, 1); }

@keyframes flip-away {
    from { transform: perspective(3000px) rotateY(0deg);   opacity: 1; }
    to   { transform: perspective(3000px) rotateY(90deg);  opacity: 0.35; }
}

@keyframes flip-back {
    from { transform: perspective(3000px) rotateY(-90deg); opacity: 0.35; }
    to   { transform: perspective(3000px) rotateY(0deg);   opacity: 1; }
}
```

| Code | Baby words |
|---|---|
| `max-width: 1320px` | The spreadsheet look can be up to 1320px wide (the CSV look: 900px). |
| `perspective(2400px)` | How far away your eye is. The near edge of the turning window looks bigger, so it reads as 3D. |
| `rotateY(90deg)` | Turn around the up-and-down line, a quarter turn: edge-on, invisible. |
| `from { ... rotateY(-90deg) }` | Turning back starts from the OTHER side, so it looks like the back of the card coming around. |
| `forwards` | When the turn-away ends, STAY turned away (until the brain swaps in the turn-back). |
| `cubic-bezier(0.11, 0, 0.5, 0)` / `(0.5, 1, 0.89, 1)` | The SHAPE of each half. Turning away: starts slow, speeds up. Turning back: starts fast, slows down. They're the two halves of ONE curve: at the switch, both go exactly the same speed. |
| `opacity: 0.35` (edge-on) | As it turns, it fades a little. The edge-on moment is soft, instead of a sharp line swinging at you. |
| `float 6s steps(3) infinite, flip-away ...` | 2 animations at once: the float keeps going (it moves `translate`), and the flip turns it (it moves `transform`). Same name = the float doesn't restart, so nothing jumps. |

> **Why switch while it's edge-on?** The window gets WIDER (and taller, by the letters row). Animating a size change makes the browser redo the whole layout every frame: slow. Edge-on, nobody can see it change, so it just happens in one go, and only the cheap turning is animated.

> **Why must the two halves go the same speed at the switch?** Your eyes follow motion. If the card turns away at one speed and comes back at TWICE that speed, there's a little kick right in the middle, even if it's only for a moment. Measured: the first version's biggest one-frame jump was 43% of the window's width; matching the halves brought it down to 20%, as even as the frames around it.

> **Why written AFTER `#output.expanded`?** Expand sets `animation: none`. Two rules with the same strength: the LATER one wins. So the flip has to come after it, or it couldn't flip in Expand mode.

**2.** The letters row. Right after the `.header-row .line-num` corner rule:

```css
/*  The spreadsheet look:  the row of column LETTERS  (A, B, C ...),  on top of the names.
    The same header row,  but quieter:  small letters in the middle of each box,
    and a thin line of Excel's own green underneath.  */
.letters-row .cell {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    color: var(--text-soft);
}

.letters-row,
.letters-row:hover {
    border-bottom-color: var(--formula);
}
```

**3.** No ƒ in the CSV look. Right after the `.cell.formula:hover::before` rule:

```css
/*  The CSV look:  no  ƒ  (a CSV has no formulas).   The formula is still kept:  hover to read it.  */
#output:not(.excel) .cell.formula::before {
    content: none;
}
```

> **Why hide it with the clothes, instead of not adding it?** The brain still marks formula cells (and keeps the formula for hovering) in both looks. The clothes decide whether the ƒ shows. Switching looks then needs no brain work for it at all.

**4.** The button. After the `#dragAnchor::after` rule:

```css
/*  "Spreadsheet View" / "CSV View":  the color of the look it flips TO.
    Spreadsheet View  =  Excel's green,  a bit darker,  solid,  with a soft green glow.
    CSV View          =  black  (as black as a screen gets),  white words,  a soft white glow.
    It changes the WHOLE window,  so it sits a little apart.  */
#viewBtn {
    margin: 0 0 0 12px;
    color: #fff;
    background: #185c37;
    border-color: rgba(255, 255, 255, 0.22);
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.35);
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.12),
        0 0 12px rgba(33, 163, 102, 0.5);
}

#viewBtn:hover {
    filter: brightness(1.12);
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.16),
        0 0 18px 2px rgba(33, 163, 102, 0.65);
}

#viewBtn.to-csv {
    background: #020202;
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.08),
        0 0 12px rgba(255, 255, 255, 0.35);
}

#viewBtn.to-csv:hover {
    filter: none;
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.12),
        0 0 18px 2px rgba(255, 255, 255, 0.5);
}
```

| Code | Baby words |
|---|---|
| `#185c37` | Excel's green, a shade darker. |
| `#020202` | Almost pure black: on a phone or laptop with an OLED screen, those pixels are practically OFF. |
| `0 0 12px rgba(33, 163, 102, 0.5)` | A soft green glow all around (no shadow offset = a glow). |
| `.to-csv` | The brain adds this label when the button says "CSV View": black instead of green. |

<br>

### Step 8.3: The brain

**1.** The new pieces. Next to the other buttons (Step 2.1):

```js
const viewBtn     = document.getElementById('viewBtn');        //  "Spreadsheet View"  /  "CSV View"
```

With the other notes, near the top (Step 2.2):

```js
let excelLook      = false;  //  showing the file in its OWN look?  CSV + Excel:  the spreadsheet look.   SQL:  the table look.  (See SPREADSHEET VIEW <-> CSV VIEW.)
```

**2.** Columns: the real ones, and empty ones. Change the `columnCount` note into these two:

```js
let columnCount = 0;      //  how many columns to lay out  (the real ones,  + the empty ones in the spreadsheet look)
let dataColumns = 0;      //  how many REAL columns:  the widest row has this many
```

and add this one right above `columnWidths`:

```js
let dataWidths    = null; //  how wide each REAL column is, in pixels.         Like:  [96, 64, 150]
```

In "ALL DONE" (Step 2.15), the widest row now sets `dataColumns`:

```js
            dataColumns = longest.length;       //  the widest row decides how many columns there are
```

**3.** Swap `setColumnWidths` (Step 2.8) for this pair. It works out the real columns' widths ONCE, then `layoutColumns` lays them out, plus the empty ones in the spreadsheet look:

```js
function setColumnWidths(longest) {

    const letter = measureLetterWidth();                //  how many pixels one letter takes up

    dataWidths = new Float64Array(dataColumns);         //  (a "Float64Array" is a list of numbers that's
                                                        //   super fast and light.  Good for a million of them.)

    for (let col = 0; col < dataColumns; col++) {

        //  Squeeze it between 6 and 40.
        //  (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest[col] + 2, 6), 40);

        //  The letters  +16px for the padding on both sides.
        dataWidths[col] = letters * letter + 16;
    }

    layoutColumns();
}


//  Lay the columns out,  one after another.
//  The spreadsheet look:  add EMPTY columns after the real ones until the window is full,
//  like Excel  (its grid keeps going past your data:  G, H, I ...).
const EXCEL_WINDOW = 1320;      //  the spreadsheet look's widest window  (the clothes say the same:  #output.excel)
const EMPTY_COLUMN = 100;       //  how wide each empty column is

function layoutColumns() {

    let dataWidth = 0;
    for (let col = 0; col < dataColumns; col++) dataWidth += dataWidths[col];

    //  Room left in the spreadsheet look's window  (minus the row numbers,  its 2 edges,  and room for a scrollbar).
    const room  = spreadsheetLook() ? EXCEL_WINDOW - NUM_WIDTH - 2 - 18 - dataWidth : 0;
    const empty = room > 0 ? Math.ceil(room / EMPTY_COLUMN) : 0;

    columnCount  = dataColumns + empty;
    columnWidths = new Float64Array(columnCount);
    columnStarts = new Float64Array(columnCount + 1);
    columnWidths.set(dataWidths);

    //  The empty ones:  100px each,  and the last one takes whatever room is left  (so it fills EXACTLY).
    for (let col = dataColumns; col < columnCount; col++) {
        columnWidths[col] = col < columnCount - 1 ? EMPTY_COLUMN : room - EMPTY_COLUMN * (empty - 1);
    }

    //  Each column starts where the last one started, plus the last one's width.
    for (let col = 0; col < columnCount; col++) {
        columnStarts[col + 1] = columnStarts[col] + columnWidths[col];
    }

    sheetWidth  = columnStarts[columnCount];
    scrollWidth = Math.min(sheetWidth, MAX_SCROLL_WIDTH);

    builtColStart = 0;                                  //  no columns built yet
    builtColEnd   = 0;
    lastColumns   = '';
    boxChanged();                                       //  a new layout:  the window's size may change
}
```

| Code | Baby words |
|---|---|
| `EXCEL_WINDOW - NUM_WIDTH - 2 - 18 - dataWidth` | How much room is left in a 1320px window: minus the row numbers, the 2 edges, room for a scrollbar, and the real columns. |
| `Math.ceil(room / EMPTY_COLUMN)` | How many 100px columns it takes to fill that (rounding UP). |
| `room - EMPTY_COLUMN * (empty - 1)` | The last empty column gets whatever is left, so they fill the window EXACTLY: no sideways scrollbar. |
| `columnWidths.set(dataWidths)` | Copy all the real widths in, in one go. |

> **Why can the empty columns just "be there"?** Every row is built with `cells[col] || ''`: a column past the end of the row is simply empty. So the treadmills, the search, and the snap menu need no changes at all.

**4.** When a file is swapped in ("ALL DONE"), pick the look, and dress the page for it (this replaces `showBadge();`):

```js
            //  Which look?  A NEW file:  Excel files look like Excel,  SQL dumps like a database table,  CSVs like a CSV.
            //  Another sheet tab  (or table)  of the same file  (sheet !== null):  keep the look you picked.
            if (sheet === null) excelLook = excel !== null || sql !== null;
            applyLook();                        //  the window,  the button,  and the badge  ("XLSX SPREADSHEET",  "SQL DUMP")
```

**5.** The letters row. At the end of `drawHeader` (Step 2.10), after `headerBox.appendChild(row);`:

```js
    //  The spreadsheet look:  a row of column LETTERS on top  (A, B, C ... Z, AA ...),  like Excel's.
    //  Copy the names row  (so every box is exactly the same size),  then swap in the letters.
    if (spreadsheetLook()) {
        const letters = row.cloneNode(true);
        letters.classList.add('letters-row');
        delete letters.dataset.index;
        letters.firstChild.textContent = '';            //  the top-left corner:  empty,  like Excel's
        for (let col = builtColStart; col < builtColEnd; col++) {
            const cell = letters.children[2 + col - builtColStart];
            cell.className = 'cell';
            cell.removeAttribute('title');
            cell.textContent = columnName(col);
        }
        headerBox.prepend(letters);
    }
```

| Code | Baby words |
|---|---|
| `row.cloneNode(true)` | Make an exact copy of the names row, with everything inside it. So every letter box is EXACTLY as wide as the name under it. |
| `delete letters.dataset.index` | Take off its "I'm row 0" name tag: it's not a real row. |
| `columnName(col)` | 0 → `A`, 25 → `Z`, 26 → `AA` (from Part 5). |
| `headerBox.prepend(letters)` | Put it FIRST in the header, above the names. |

**6.** Excel's row numbers. In `makeRow` (Step 2.5):

```js
    numCell.textContent = num + rowShift();
```

In `updatePosition` (the "Rows 1–15" words):

```js
    //  matches holds row numbers  (0, 1, 2...).  Row numbers start at 1  (the header is 0).  So:  +1.
    //  (The spreadsheet look:  Excel's numbers,  1 more:  rowShift.)
    const shift = 1 + rowShift();
    let message = 'Rows ' + (matches[first] + shift) + '–' + (matches[last] + shift);

    if (word === '') {
        message += ' of ' + (rowCount + rowShift());
```

And in `jumpToLine` (Go to row): in the spreadsheet look, you type Excel's number:

```js
    const target = parseInt(jumpInput.value, 10) - rowShift();     //  the number you typed  (the spreadsheet look:  Excel's number,  1 higher)
```

**7.** And the switch itself, right after the Expand button's listener:

```js
let flipping = false;       //  mid-flip?  (Then a second click waits.)


//  Which of the 2 special looks is on?   (excelLook  =  "the file's own look is on".)
function spreadsheetLook() { return excelLook && sqlInfo === null; }      //  a CSV or an Excel file,  in its own look
function tableLook()       { return excelLook && sqlInfo !== null; }      //  a SQL dump,  in its own look


//  Dress the page for the look we're in:  the window,  the button,  the badge.
function applyLook() {
    outputBox.classList.toggle('excel', spreadsheetLook());
    outputBox.classList.toggle('sqltable', tableLook());
    aimRow.classList.toggle('sqltable', tableLook());                       //  (the Details panel shows NULLs the same way)
    viewBtn.textContent = excelLook ? 'CSV View' : sqlInfo !== null ? 'Table View' : 'Spreadsheet View';
    viewBtn.classList.toggle('to-csv', excelLook);                          //  the clothes:  Excel green / SQL blue  ->  or  ->  black
    viewBtn.classList.toggle('to-table', !excelLook && sqlInfo !== null);
    showBadge();
}


//  Excel's row numbers start 1 higher  (its row 1 is the column names).   "How much to add?"
function rowShift() {
    return spreadsheetLook() ? 1 : 0;
}


//  A SQL column's type,  for the snap menu's Details:    "  ·  VARCHAR(255)  ·  PK"
function sqlType(col) {
    const column = sqlInfo.columns[col];
    if (column === undefined) return '';
    return (column.type ? '  ·  ' + column.type : '') + (column.pk ? '  ·  PK' : '');
}


//  Switch to the other look,  right now.
function switchLook() {

    //  Remember where you are.  (The header gets taller or shorter,  and the browser "helpfully"
    //  nudges the scrollbar to make up for it:  you'd land a row off.  So put it back after.)
    const expanded = outputBox.classList.contains('expanded');
    const y = expanded ? 0 : readViewY();

    excelLook = !excelLook;
    applyLook();
    layoutColumns();            //  the spreadsheet look:  empty columns fill the wider window  (or take them away)
    updateColumns(true);        //  new width,  the letters row,  Excel's row numbers:  rebuild the header and the rows
    sizeWindow();               //  the letters row makes the header 1 row taller
    if (!expanded) setViewY(y);
    buildVisibleRows();
    updatePosition();
    drawAim();                  //  the snap menu:  Excel addresses  (or not)
}


viewBtn.addEventListener('click', function () {

    if (flipping) return;

    //  Turned off motion?  Just switch.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        switchLook();
        return;
    }

    //  1.  Turn away  ->  2.  edge-on:  switch  ->  3.  turn back.
    //  ("animationend" also hears the cells' own animations,  like the snap pulse:  only listen to the WINDOW's FLIP.)
    flipping = true;
    outputBox.classList.add('flip-away');

    outputBox.addEventListener('animationend', function turned(e) {
        if (e.target !== outputBox || e.animationName !== 'flip-away') return;
        outputBox.removeEventListener('animationend', turned);

        switchLook();
        outputBox.classList.replace('flip-away', 'flip-back');      //  (right away:  parking the card at exactly 90° made
                                                                    //   the browser draw a whole big sheet at once:  ~100 ms.  Measured.)

        outputBox.addEventListener('animationend', function back(e) {
            if (e.target !== outputBox || e.animationName !== 'flip-back') return;
            outputBox.removeEventListener('animationend', back);
            outputBox.classList.remove('flip-back');
            flipping = false;
        });
    });
});
```

| Code | Baby words |
|---|---|
| `classList.toggle('excel', excelLook)` | Add the `excel` label when `excelLook` is true, take it off when it's false. |
| `rowShift()` | `1` in the spreadsheet look (Excel's numbers start 1 higher), `0` in the CSV look. |
| `const y = ... readViewY()` then `setViewY(y)` | Remember where you are, and put it back after (see below). |
| `matchMedia('(prefers-reduced-motion: reduce)')` | "Did this person turn off motion on their computer?" Then: no flip, just switch. |
| `animationend` | "An animation just finished." The brain waits for the turn-away to end before switching. |
| `e.target !== outputBox` | `animationend` also hears the CELLS' animations (like the snap pulse). Only the window's own counts. |
| `e.animationName !== 'flip-away'` | ...and only the FLIP (not the float, which runs on the same window). |
| `classList.replace('flip-away', 'flip-back')` | Swap one label for the other, in one go. |

> **Why no "sink back a little" (a slight shrink) as it turns?** We tried it. A size change (`scale`) makes the browser redraw the window at a new size, and in the very frame of the switch, the window is brand new and much wider: that frame ran late 3 times out of 4. Fading alone softens the edge just as well, without that cost.

> **Why start turning back RIGHT AWAY?** We tried waiting 2 frames first (so the big switch could be drawn while the card was edge-on). On a huge sheet it backfired: with the card parked at exactly 90°, the browser later had to draw the whole new sheet at once, a 100 ms freeze. Turning back right away: no freeze.

> **Why put the scroll spot back by hand?** The letters row makes the header taller. The browser tries to be helpful ("scroll anchoring") and nudges the scrollbar to make up for it, so you'd land one row off. `setViewY(y)` puts you back exactly.

> **What are `spreadsheetLook()` and `tableLook()`?** `excelLook` really means "the file's OWN look is on". For a CSV or an Excel file, that's the spreadsheet look. For a SQL dump (Part 9), it's the TABLE look (types under the names, NULLs, in SQL blue). The 2 little helpers say which one. **Building in order?** `sqlInfo` comes with Part 9's `sqlI.js`: until then, put `let sqlInfo = null;` at the top of the brain (and take it out again in Part 9, or the page will complain it's there twice).

> **Why does a sheet tab keep the look?** `loadFile(file, sheet)`: a brand-new file comes with `sheet = null`, a sheet tab with its number. Only a NEW file picks its look (`if (sheet === null) ...`).

> **Why doesn't anything above the window move when you flip?** An Excel file has its badge in BOTH looks, and a CSV in neither. If a badge came and went, the search bar and the buttons would jump, and you'd have to chase the button to flip back.

<br>

### ✅ Test it

1. Open a CSV: the CSV look, and a dark green **Spreadsheet View** button with a soft green glow, at the end of the controls row.
2. Click it: the window turns away, and comes back as a spreadsheet: wider, letters on top (A, B, C ... with empty ones past your data), the names on row 1, the rows numbered from 2. The button is now a black **CSV View**, with white words and a soft white glow, in the SAME spot.
3. The words under the search bar count Excel's way (`Rows 2–16 of 31`). Go to row **10** lands on Excel's row 10.
4. Search for something: the snap menu shows Excel addresses (`Row 78 · name (B78)`).
5. Click **CSV View**: it flips back. You're on the same row, your search is still there.
6. Open an Excel file: it opens in the spreadsheet look, with the green ƒ on formulas. Flip it: no ƒ (hover a formula cell: the formula is still there). Click another sheet tab: it stays in the CSV look.
7. Try it in Expand mode, and on a huge, wide file: same flip, just as smooth.

<br>

---

<br>

# PART 9: Reading SQL Dumps (`sqlI.js`) 🛢️

A **database** is where an app keeps its data: users, orders, products. It usually runs on a server (MySQL, PostgreSQL, SQL Server), and programs talk to it all day. You don't "open" it like a file: you connect to it.

A **`.sql` file** is something that comes OUT of a database (or goes INTO one). Mostly two kinds:

```text
   A DUMP  (a backup,  a copy to move,  "here's the data")          SCRIPTS / QUERIES  (instructions to run)

   CREATE TABLE users (id INT PRIMARY KEY, name TEXT);               SELECT name FROM users WHERE id = 1;
   INSERT INTO users VALUES (1, 'Ana'), (2, 'Bo');                   UPDATE users SET name = 'Al' WHERE id = 1;

   -> the database, written out as the commands                     -> no data:  just "do this"
      that would build it again.  THE DATA IS IN HERE.
```

This part teaches the reader to open **dumps**: each table becomes a tab, its rows become the sheet. Nothing is ever RUN: there's no database to run it on, and running a stranger's commands would be dangerous anyway. The reader only READS the recipe:

- `CREATE TABLE`: the columns (names, TYPES, the PRIMARY KEY)
- `INSERT INTO` / `REPLACE INTO` / PostgreSQL's `COPY ... FROM stdin`: the rows
- **everything else** (`SELECT`, `UPDATE`, `DELETE`, `SET`, functions...): skipped

And it opens in the **table look**, like a database tool, in **SQL blue**:

```text
  ┌───┬────────┬──────────────┬────────────────┐
  │ 0 │ id     │ name         │ email          │
  │   │ PK INT │ VARCHAR(100) │ VARCHAR(255)   │   <- the TYPES, and a blue PK badge
  ├───┼────────┼──────────────┼────────────────┤   <- a thin SQL-blue line
  │ 1 │ 1      │ Ana García   │ ana@example.com│
  │ 2 │ 2      │ Bo O'Neil    │ NULL           │   <- NULL ("unknown"), faint, NOT the same as empty
  └───┴────────┴──────────────┴────────────────┘
     [customers] [orders] [audit_log (empty)]        <- one tab per table             [CSV View] flips it
```

This part touches **all 4 files**: a new translator (`sqlI.js`, like `xlsxI.js` in Part 5), plus a little in the skeleton, the brain, and the clothes.

<br>

### Step 9.1: The skeleton

**1.** Plug in the translator, right after the Excel one (before the brain):

```html
    <script src="sqlI.js"></script>
```

**2.** Let the file picker show `.sql` files too:

```html
            <input type="file" id="csvFileInput" accept=".csv,.xlsx,.sql" tabindex="-1" aria-hidden="true">
```

<br>

### Step 9.2: The translator (`sqlI.js`)

Make a new file, `sqlI.js`, next to the others. Start with the notes it keeps about the open dump:

```js
let sqlInfo = null;

const SQL_STALE = new Error('stale');       //  "a newer file was picked:  forget this one"  (not a real problem)
```

**Every database writes dumps a little differently.** The translator knows all of these:

| What | MySQL | PostgreSQL | SQLite |
|---|---|---|---|
| A name | `` `users` `` | `"users"`, `public.users` | `"users"` |
| A quote inside a word | `'it\'s'` | `'it''s'`, `E'it\'s'` | `'it''s'` |
| Comments | `-- ...`, `# ...`, `/* ... */` | `-- ...`, `/* ... */` | `-- ...` |
| The rows | `INSERT INTO ... VALUES (..),(..)` | `COPY ... FROM stdin;` + lines, `\.` | `INSERT INTO ... VALUES(..);` |
| Nothing | `NULL` | `\N` (in COPY) | `NULL` |
| The primary key | in `CREATE TABLE` | `ALTER TABLE ... ADD ... PRIMARY KEY` at the end | in `CREATE TABLE` |

**The reader itself.** It walks the dump one command at a time, in BITES (like everything else), so a big dump never freezes the page:

```js
async function readSql(text, file, isCurrent, choice) {

    const t = text;
    const n = t.length;
    let p = 0;                              //  where we are in the dump


    //  Big jobs are done in BITES  (like everything else),  so the page never freezes.
    let stopAt = performance.now() + CHUNK_TIME;

    async function breathe() {
        if (performance.now() < stopAt) return;
        setLoadingLabel('Reading the SQL...  ' + Math.floor(100 * p / Math.max(n, 1)) + '%');
        await new Promise(function (go) { nextBite(go); });
        if (!isCurrent()) throw SQL_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }


    //  WHICH DATABASE wrote it?  (Look at the first 64 KB.)
    //  It matters for one thing:  in MySQL,  a backslash inside a word is special  ('it\'s'),
    //  everywhere else it's just a backslash  (they write  'it''s').
    const head    = t.slice(0, 65536);
    const mysql   = /MySQL dump|MariaDB dump|\bENGINE\s*=|`/i.test(head);
    const dialect = mysql ? 'MySQL'
        : /PostgreSQL database dump|^COPY\s|\bsearch_path\b|::/im.test(head) ? 'PostgreSQL'
        : /\bPRAGMA\b|BEGIN TRANSACTION/i.test(head) ? 'SQLite'
        : '';


    //  ---- THE TABLES,  in the order they first show up ----
    const tables = [];
    const byKey  = new Map();

    function tableNamed(q) {
        let table = byKey.get(q.key);
        if (table === undefined) {
            table = { name: q.name, columns: null, hasData: false };
            byKey.set(q.key, table);
            tables.push(table);
            if (choice !== null && tables.length - 1 === choice) chosen = table;
        }
        return table;
    }

    let chosen = null;                      //  the table we're turning into rows

    //  The first table that has rows wins  (when no table was asked for).
    function wanted(table) {
        if (chosen === null && choice === null) chosen = table;
        return table === chosen;
    }


    //  ---- THE ROWS of the chosen table:  CSV lines,  and the NULLs ----
    const lines = [];
    let nullRows  = new Uint32Array(1024);
    let nullCols  = new Uint16Array(1024);
    let nullCount = 0;

    function markNull(row, col) {
        if (nullCount === nullRows.length) {                //  full?  Twice as big,  copy the old ones in.
            const r = new Uint32Array(nullRows.length * 2); r.set(nullRows); nullRows = r;
            const c = new Uint16Array(nullCols.length * 2); c.set(nullCols); nullCols = c;
        }
        nullRows[nullCount] = row;
        nullCols[nullCount] = col;
        nullCount++;
    }

    //  One row:  "values"  in the order they came,  "where"  says which column each one goes in.
    function addRow(table, values, where) {

        if (table.columns === null) table.columns = [];
        const columns = table.columns;

        const row = new Array(columns.length).fill('');
        const num = lines.length + 1;                       //  this row's number  (counting from 1)

        for (let i = 0; i < values.length; i++) {

            let col = where === null ? i : where[i];

            //  More values than columns?  (No CREATE TABLE for it.)  Make up a name.
            while (col >= columns.length) {
                columns.push({ name: 'column ' + (columns.length + 1), type: '', pk: false });
                row.push('');
            }

            if (values[i] === null) markNull(num, col);
            else row[col] = values[i];
        }

        lines.push(row.map(sqlCell).join(','));
    }


    // ---------------------------------------------------------- the reading tools

    //  Skip spaces,  line breaks,  and comments:    -- to the end of the line,   # too  (MySQL),   /* ... */
    function skipSpace() {
        while (p < n) {
            const c = t.charCodeAt(p);
            if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 0xFEFF) { p++; continue; }
            if ((c === 45 && t.charCodeAt(p + 1) === 45) || (c === 35 && mysql)) {
                const end = t.indexOf('\n', p);
                p = end === -1 ? n : end + 1;
                continue;
            }
            if (c === 47 && t.charCodeAt(p + 1) === 42) {
                const end = t.indexOf('*/', p + 2);
                p = end === -1 ? n : end + 2;
                continue;
            }
            return;
        }
    }

    //  A plain word  (a command,  or a name without quotes):   letters, digits,  _  $
    function word() {
        const start = p;
        while (p < n) {
            const c = t.charCodeAt(p);
            if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c > 127) p++;
            else break;
        }
        return t.slice(start, p);
    }

    //  The next word,  if it's THIS one  (any capitals).   It is?  Step past it.   It isn't?  Stay put.
    function keyword(k) {
        skipSpace();
        const start = p;
        if (word().toUpperCase() === k) return true;
        p = start;
        return false;
    }

    //  A name:   users    "users"    `users`    [users]      (a doubled quote inside  =  a real quote)
    function identifier() {
        skipSpace();
        const c = t[p];
        if (c === '"' || c === '`') {
            let out = '';
            p++;
            while (p < n) {
                const end = t.indexOf(c, p);
                if (end === -1) { out += t.slice(p); p = n; break; }
                out += t.slice(p, end);
                p = end + 1;
                if (t[p] === c) { out += c; p++; continue; }
                break;
            }
            return out;
        }
        if (c === '[') {
            const end = t.indexOf(']', p);
            const out = t.slice(p + 1, end === -1 ? n : end);
            p = end === -1 ? n : end + 1;
            return out;
        }
        return word();
    }

    //  A table's name,  maybe with its "schema" in front:    public.users    mydb.`users`
    //  (The usual schemas  public,  dbo,  main  are left off:  they're just "the normal place".)
    function tableName() {
        const parts = [identifier()];
        while (true) {
            skipSpace();
            if (t[p] !== '.') break;
            p++;
            parts.push(identifier());
        }
        const name   = parts[parts.length - 1];
        const schema = parts.length > 1 && !/^(public|dbo|main)$/i.test(parts[parts.length - 2]) ? parts[parts.length - 2] + '.' : '';
        return { name: schema + name, key: (schema + name).toLowerCase() };
    }

    //  A word in quotes:   'it''s'    (and in MySQL,  or with  E'...'  in PostgreSQL:   'it\'s'   'line one\nline two')
    const quoteOrSlash = /['\\]/g;

    function readString(backslashes) {
        p++;                                //  past the opening  '
        let out = '';
        while (true) {
            let q;
            if (backslashes) { quoteOrSlash.lastIndex = p; const m = quoteOrSlash.exec(t); q = m === null ? -1 : m.index; }
            else q = t.indexOf("'", p);

            if (q === -1) { out += t.slice(p); p = n; return out; }        //  never closed:  take the rest

            out += t.slice(p, q);
            if (t.charCodeAt(q) === 39) {                                   //  a quote:
                if (t.charCodeAt(q + 1) === 39) { out += "'"; p = q + 2; continue; }    //  ''  =  a real quote
                p = q + 1;
                return out;                                                 //  the end of the word
            }
            p = q + 1;                                                      //  a backslash:  what's next?
            out += backslashLetter();
        }
    }

    //  After a backslash:   \n  =  a line break,   \t  =  a tab,   \'  =  a quote ...
    function backslashLetter() {
        const c = t[p++];
        switch (c) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'Z': return '\x1A';
            case '0': return '';                                            //  a "nothing" letter:  leave it out
            case 'x': { const hex = /^[0-9a-fA-F]{1,2}/.exec(t.slice(p, p + 2)); if (hex) { p += hex[0].length; return String.fromCharCode(parseInt(hex[0], 16)); } return 'x'; }
            case 'u': { const hex = /^[0-9a-fA-F]{4}/.exec(t.slice(p, p + 4)); if (hex) { p += 4; return String.fromCharCode(parseInt(hex[0], 16)); } return 'u'; }
            case '%': return '\\%';                                         //  (MySQL keeps these two as they are)
            case '_': return '\\_';
            case undefined: return '';
            default:  return c;                                             //  \'  \"  \\  ->  just the letter
        }
    }

    //  Skip a quoted word without keeping it.
    function skipString(backslashes) { readString(backslashes); }

    //  PostgreSQL's  $$ ... $$  or  $tag$ ... $tag$  (used for function bodies:  they can have  ;  inside).
    const dollarTag = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/y;

    function readDollar() {
        dollarTag.lastIndex = p;
        const m = dollarTag.exec(t);
        if (m === null) { p++; return null; }
        const end = t.indexOf(m[0], p + m[0].length);
        const out = t.slice(p + m[0].length, end === -1 ? n : end);
        p = end === -1 ? n : end + m[0].length;
        return out;
    }

    //  Skip to just past the end of this command  (the next  ;  that's not inside quotes or a comment).
    const special = /[;'"`$\-\/#]/g;

    function skipCommand() {
        while (p < n) {
            special.lastIndex = p;
            const m = special.exec(t);
            if (m === null) { p = n; return; }
            p = m.index;
            const c = t[p];
            if (c === ';') { p++; return; }
            if (c === "'") { skipString(mysql || /[eE]/.test(t[p - 1] || '') && !/\w/.test(t[p - 2] || '')); continue; }
            if (c === '"' || c === '`') { identifier(); continue; }
            if (c === '$') { readDollar(); continue; }
            if (c === '-' && t[p + 1] === '-') { skipSpace(); continue; }
            if (c === '/' && t[p + 1] === '*') { skipSpace(); continue; }
            if (c === '#' && mysql) { skipSpace(); continue; }
            p++;
        }
    }

    //  Everything inside  ( ... ),  as text.   p starts ON the  (  and ends just past the matching  ).
    const parenStuff = /[()'"`]/g;

    function insideParens() {
        const start = ++p;
        let depth = 1;
        while (p < n) {
            parenStuff.lastIndex = p;
            const m = parenStuff.exec(t);
            if (m === null) { p = n; break; }
            p = m.index;
            const c = t[p];
            if (c === '(') { depth++; p++; continue; }
            if (c === ')') { if (--depth === 0) { p++; return t.slice(start, p - 1); } p++; continue; }
            if (c === "'") { skipString(mysql); continue; }
            identifier();
        }
        return t.slice(start, p);
    }


    // ---------------------------------------------------------- the commands

    //  CREATE TABLE  name  ( column TYPE ..., ...,  PRIMARY KEY (...) )
    function createCommand() {

        while (keyword('OR') || keyword('REPLACE') || keyword('TEMPORARY') || keyword('TEMP') ||
               keyword('UNLOGGED') || keyword('GLOBAL') || keyword('LOCAL')) { /* (just skip these) */ }

        if (!keyword('TABLE')) { skipCommand(); return; }          //  CREATE INDEX,  CREATE VIEW ...:  not a table
        if (keyword('IF')) { keyword('NOT'); keyword('EXISTS'); }

        const table = tableNamed(tableName());
        skipSpace();

        if (t[p] === '(' && table.columns === null) table.columns = readColumns(insideParens());
        skipCommand();
    }

    //  ALTER TABLE  name  ADD  CONSTRAINT x  PRIMARY KEY (id)
    //  (PostgreSQL's dumps name the primary key HERE,  at the very end,  not in CREATE TABLE.)
    function alterCommand() {

        if (!keyword('TABLE')) { skipCommand(); return; }
        if (keyword('IF')) keyword('EXISTS');
        keyword('ONLY');

        const name  = tableName();
        const start = p;
        skipCommand();

        const table = byKey.get(name.key);
        const pk    = /\bPRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(t.slice(start, p));
        if (table === undefined || table.columns === null || pk === null) return;

        pk[1].split(',').forEach(function (key) {
            const column = table.columns.find(function (c) { return c.name.toLowerCase() === unquote(key.trim()).toLowerCase(); });
            if (column !== undefined) column.pk = true;
        });
    }

    //  INSERT INTO  name  (columns)  VALUES  ( ... ),  ( ... );      (also  REPLACE INTO,   INSERT OR IGNORE INTO ...)
    async function insertCommand() {

        while (keyword('LOW_PRIORITY') || keyword('DELAYED') || keyword('HIGH_PRIORITY') || keyword('IGNORE') ||
               keyword('OR') || keyword('REPLACE') || keyword('ROLLBACK') || keyword('ABORT') || keyword('FAIL')) { /* (skip) */ }
        keyword('INTO');

        const name = tableName();

        //  Which columns,  in which order?
        skipSpace();
        let named = null;
        if (t[p] === '(') {
            const save = p;
            p++;
            if (keyword('SELECT') || keyword('WITH')) { p = save; skipCommand(); return; }     //  INSERT ... (SELECT ...):  no values to read
            p = save;
            named = splitTopLevel(insideParens()).map(unquote);
        }

        if (!keyword('VALUES') && !keyword('VALUE')) { skipCommand(); return; }               //  INSERT ... SELECT,  DEFAULT VALUES:  no rows here

        const table = tableNamed(name);                             //  (only NOW:  an  INSERT ... SELECT  isn't about a table in this file)
        table.hasData = true;
        if (!wanted(table)) { skipCommand(); return; }             //  another table's rows:  skip them,  fast

        const where = named === null ? null : columnSpots(table, named);

        //  The rows:    ( ... ) , ( ... ) , ( ... )
        let count = 0;
        while (true) {
            skipSpace();
            if (t[p] !== '(') break;
            p++;
            addRow(table, rowValues(), where);
            skipSpace();
            if (t[p] !== ',') break;
            p++;
            if (++count % 256 === 0) await breathe();              //  (one INSERT can hold 100,000 rows)
        }

        skipCommand();                                              //  the rest:  ON DUPLICATE KEY ...,   ;
    }

    //  COPY  name  (columns)  FROM stdin;    then the rows,  one per line,  TAB between them,  until   \.
    async function copyCommand() {

        keyword('ONLY');
        const table = tableNamed(tableName());

        skipSpace();
        const named = t[p] === '(' ? splitTopLevel(insideParens()).map(unquote) : null;

        if (!keyword('FROM') || !keyword('STDIN')) { skipCommand(); return; }                  //  COPY ... FROM a file / TO ...
        skipCommand();                                              //  to the end of the  COPY ... ;  line

        //  The rows start on the next line,  and end at a line that's just   \.
        const nl    = t.indexOf('\n', p);
        const start = nl === -1 ? n : nl + 1;
        let end = t.startsWith('\\.', start) ? start : t.indexOf('\n\\.', start - 1);
        if (end === -1) end = n;
        else if (end !== start) end++;                              //  (the  \n  before  \.  belongs to the last row)

        p = t.indexOf('\n', end);
        p = p === -1 ? n : p + 1;                                   //  carry on after the  \.  line

        if (end <= start) return;                                   //  no rows
        table.hasData = true;
        if (!wanted(table)) return;                                 //  another table:  skip its rows

        const where = named === null ? null : columnSpots(table, named);

        let at = start, count = 0;
        while (at < end) {
            let lineEnd = t.indexOf('\n', at);
            if (lineEnd === -1 || lineEnd > end) lineEnd = end;
            let line = t.slice(at, lineEnd);
            if (line.charCodeAt(line.length - 1) === 13) line = line.slice(0, -1);    //  a Windows  \r
            at = lineEnd + 1;
            if (line === '' && at >= end) break;

            addRow(table, line.split('\t').map(copyValue), where);
            if (++count % 2048 === 0) await breathe();
        }
    }


    // ---------------------------------------------------------- the values

    //  One row's values:    1, 'Ana', NULL, 'x'::text, now()      (p is just past the  (  ,  ends past the  ) )
    function rowValues() {
        const values = [];
        while (p < n) {
            values.push(oneValue());
            skipSpace();
            const c = t[p];
            if (c === ',') { p++; continue; }
            if (c === ')') { p++; break; }
            skipExpression();                                       //  something we didn't expect:  skip to the next  ,  or  )
            if (t[p] === ',') { p++; continue; }
            p++;
            break;
        }
        return values;
    }

    const prefixedString = /([A-Za-z_][A-Za-z0-9_]*)'/y;
    const plainToken     = /[^,()\s]+/y;

    function oneValue() {
        skipSpace();
        const c = t[p];
        let value;

        if (c === "'") {
            value = readString(mysql);
        } else if (c === '$') {
            value = readDollar() || '';
        } else {
            prefixedString.lastIndex = p;
            const pre = prefixedString.exec(t);

            if (pre !== null) {                                     //  E'...'   X'...'   N'...'   _utf8mb4'...'
                const kind = pre[1].toUpperCase();
                p += pre[1].length;
                value = readString(mysql || kind === 'E');
                if (kind === 'X') value = '0x' + value.toUpperCase();          //  bytes,  written in hex
                if (kind === 'B') value = 'b' + value;                          //  bits
            } else if (/[-+0-9.]/.test(c)) {
                plainToken.lastIndex = p;                           //  a number:   42   -3.5   1e9   0x1F
                const m = plainToken.exec(t);
                value = m === null ? '' : m[0];
                p += value.length;
            } else {
                const start = p;
                const w = word();
                const upper = w.toUpperCase();
                skipSpace();
                if (upper === 'NULL' && (t[p] === ',' || t[p] === ')')) return null;
                if ((upper === 'TRUE' || upper === 'FALSE') && (t[p] === ',' || t[p] === ')')) return w.toLowerCase();
                if (upper === 'DEFAULT' && (t[p] === ',' || t[p] === ')')) return '';
                if (w[0] === '_' && t[p] === "'") return readString(mysql);     //  _binary 'abc'   (MySQL:  "these letters are in this alphabet")
                p = start;
                value = skipExpression().trim();                    //  now(),  CAST(...),  anything else:  keep it as written
            }
        }

        //  'x'::text   'x'::character varying   (PostgreSQL's "treat it as this type"):  skip the type
        skipSpace();
        while (t[p] === ':' && t[p + 1] === ':') {
            p += 2;
            while (p < n) {
                skipSpace();
                const ch = t[p];
                if (ch === ',' || ch === ')' || ch === ';' || ch === undefined) break;
                if (ch === '(') { insideParens(); continue; }
                if (ch === '[') { const end = t.indexOf(']', p); p = end === -1 ? n : end + 1; continue; }
                if (ch === '"') { identifier(); continue; }
                if (word() === '') p++;
            }
        }

        return value;
    }

    //  Skip (and return) an expression,  up to the next  ,  or  )  that's not inside its own parentheses.
    function skipExpression() {
        const start = p;
        let depth = 0;
        while (p < n) {
            const c = t[p];
            if (c === "'") { skipString(mysql); continue; }
            if (c === '"' || c === '`') { identifier(); continue; }
            if (c === '(') depth++;
            else if (c === ')') { if (depth === 0) break; depth--; }
            else if (c === ',' && depth === 0) break;
            p++;
        }
        return t.slice(start, p);
    }

    //  One value of a COPY row:    \N  =  NULL,    \t  \n  \\  ...  =  a tab, a line break, a backslash ...
    function copyValue(raw) {
        if (raw === '\\N') return null;
        if (raw.indexOf('\\') === -1) return raw;
        return raw.replace(/\\(?:([0-7]{1,3})|x([0-9a-fA-F]{1,2})|(.))/g, function (all, oct, hex, ch) {
            if (oct !== undefined) return String.fromCharCode(parseInt(oct, 8));
            if (hex !== undefined) return String.fromCharCode(parseInt(hex, 16));
            return { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' }[ch] || ch;
        });
    }


    // ---------------------------------------------------------- GO:  one command at a time

    while (p < n) {

        skipSpace();
        if (p >= n) break;

        const c = t[p];
        if (c === ';') { p++; continue; }

        if (c === '\\') {                                           //  psql's own commands  (\connect ...):  one line,  no  ;
            const end = t.indexOf('\n', p);
            p = end === -1 ? n : end + 1;
            continue;
        }

        const command = word().toUpperCase();

        if (command === 'CREATE') createCommand();
        else if (command === 'ALTER') alterCommand();
        else if (command === 'INSERT' || command === 'REPLACE') await insertCommand();
        else if (command === 'COPY') await copyCommand();
        else if (command === '') { p++; skipCommand(); }            //  starts with something odd:  skip the whole command
        else skipCommand();                                         //  SET,  LOCK TABLES,  ALTER,  BEGIN ...:  not rows

        await breathe();
    }


    if (tables.length === 0) throw new Error('notables');
    if (chosen === null) chosen = tables[0];                        //  no table has rows:  show the first one  (just its columns)


    //  The CSV text:   the column names on top,  then every row.
    const columns = chosen.columns || [];
    const header  = columns.map(function (column) { return sqlCell(column.name); }).join(',');

    return {
        text: header + '\n' + lines.join('\n'),
        info: {
            file:        file,
            dialect:     dialect,
            sheetName:   chosen.name,
            sheetNumber: tables.indexOf(chosen) + 1,
            sheetCount:  tables.length,
            sheets:      tables.map(function (table) { return { name: table.name, hidden: false, chart: false, empty: !table.hasData }; }),
            columns:     columns,
            rows:        lines.length,
            nullCount:   nullCount,
            nullRows:    nullRows.subarray(0, nullCount),
            nullCols:    nullCols.subarray(0, nullCount)
        }
    };
}
```

| Code | Baby words |
|---|---|
| `t.charCodeAt(p)` | The letter at spot `p`, as a number (45 = `-`, 47 = `/`, 39 = `'`). Comparing numbers is fast. |
| `/['\\]/g` with `.lastIndex = p` | "Jump to the next quote or backslash, starting at `p`." Way faster than looking at every letter. |
| `skipCommand()` | Jump past the end of a command: the next `;` that's NOT inside quotes, a comment, or `$$ ... $$`. |
| `$$ ... $$`, `$body$ ... $body$` | PostgreSQL's way to write a big piece of text (like a function) that has `;` inside. |
| `wanted(table)` | "Is this the table we're showing?" Rows of the OTHER tables are skipped with `skipCommand`, without reading them. |
| `addRow(...)` | One row: put each value in its column, write down the NULLs, turn it into one line of CSV. |
| `markNull(row, col)` | Write down "this cell is NULL" in 2 lists that grow as needed (a row list, a column list). |
| `Uint32Array` / `Uint16Array` | Lists of plain numbers: 4 / 2 bytes each. A million NULLs = 6 MB. |
| `\N` (COPY) | PostgreSQL's NULL. |
| `\.` (COPY) | "The rows end here." |
| `'x'::text` | PostgreSQL's "treat it as this type". The value is `x`; the `::text` is skipped. |
| `_binary 'abc'`, `X'4D'`, `E'...'` | A word with a label in front: the alphabet it's in, bytes in hex, or "backslashes count here". |

> **Why does MySQL need its own rule?** In MySQL, a backslash inside quotes is SPECIAL (`'it\'s'`). Everywhere else it's just a backslash (they write `'it''s'`). Read a MySQL dump the other way, and `'it\'s'` would end at the `\'`. So the first 64 KB decide: MySQL's fingerprints (`MySQL dump`, `ENGINE=`, backtick names) turn the backslash rule on.

> **Why skip the other tables' rows, and not keep them all?** A dump can be hundreds of MB. Keeping every table would need all of it in memory at once. Instead, a table's tab reads the dump again and keeps just that table (like Excel's sheets in Part 5). Skipping is cheap: no values are cut up, it only looks for the end of each command.

> **Why NULL isn't just empty:** `''` means "we know it's nothing". `NULL` means "we don't know". A CSV can't tell them apart, so the NULLs are written down on the side, and the table look shows them.

**Reading the columns of a `CREATE TABLE`:**

```js
const NOT_A_COLUMN = /^(CONSTRAINT|PRIMARY|UNIQUE|KEY|INDEX|FOREIGN|CHECK|FULLTEXT|SPATIAL|EXCLUDE|LIKE|PERIOD)\b/i;
const COLUMN_RULES = /\s(NOT\s+NULL|NULL|DEFAULT|PRIMARY\s+KEY|REFERENCES|UNIQUE|CHECK|COLLATE|AUTO_INCREMENT|AUTOINCREMENT|COMMENT|CONSTRAINT|GENERATED|ON\s+UPDATE|CHARACTER\s+SET|CHARSET|IDENTITY|KEY|AS)\b/i;

function readColumns(body) {

    const columns = [];
    const keys    = new Set();              //  the primary key's columns  (from a  PRIMARY KEY (...)  line)

    for (const item of splitTopLevel(body)) {

        const text = item.trim();
        if (text === '') continue;

        if (!/^["`\[]/.test(text) && NOT_A_COLUMN.test(text)) {
            const pk = /PRIMARY\s+KEY\s*(?:[\w"`]+\s*)?\(([^)]*)\)/i.exec(text);
            if (pk !== null) {
                pk[1].split(',').forEach(function (name) { keys.add(unquote(name.trim().replace(/\s*\(\d+\)\s*$/, '')).toLowerCase()); });
            }
            continue;
        }

        //  The name  (maybe in quotes),  then the rest.
        const named = /^("(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|[^\s(]+)/.exec(text);
        if (named === null) continue;                       //  (nothing we can read as a name:  skip it)
        const name  = unquote(named[0]);
        const rest  = ' ' + text.slice(named[0].length);

        //  Find the first rule,  but only OUTSIDE quotes and parentheses:   enum('NULL','x')  is still part of the type.
        const blank = blankInside(rest);
        const rule  = COLUMN_RULES.exec(blank);
        const cut   = rule === null ? rest.length : rule.index;

        columns.push({
            name: name,
            type: upperOutsideQuotes(rest.slice(0, cut).trim().replace(/\s+/g, ' ')),
            pk:   /\bPRIMARY\s+KEY\b/i.test(blank.slice(cut))
        });
    }

    columns.forEach(function (column) { if (keys.has(column.name.toLowerCase())) column.pk = true; });
    return columns;
}


//  Which column does each named value go in?    (A name we haven't seen?  It's a new column.)
function columnSpots(table, names) {
    if (table.columns === null) table.columns = [];
    return names.map(function (name) {
        let spot = table.columns.findIndex(function (column) { return column.name.toLowerCase() === name.toLowerCase(); });
        if (spot === -1) {
            table.columns.push({ name: name, type: '', pk: false });
            spot = table.columns.length - 1;
        }
        return spot;
    });
}
```

> **How is the TYPE found?** It's everything after the name, up to the first "rule" (`NOT NULL`, `DEFAULT`, `PRIMARY KEY`...). But `ENUM('active','NULL')` has the word NULL inside! So first, `blankInside` turns everything inside quotes and parentheses into spaces (same length), and the rules are only searched in what's left.

**The little helpers:**

```js
function splitTopLevel(text) {
    const parts = [];
    let depth = 0, start = 0, quote = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote !== '') {
            if (c === quote) { if (text[i + 1] === quote) i++; else quote = ''; }
            else if (c === '\\' && quote === "'") i++;
            continue;
        }
        if (c === "'" || c === '"' || c === '`') quote = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
    }
    parts.push(text.slice(start));
    return parts;
}

//  The same text,  with everything inside quotes and parentheses turned into spaces  (the same length).
//  So a search for words only finds them OUTSIDE.
function blankInside(text) {
    let out = '', depth = 0, quote = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote !== '') { out += ' '; if (c === quote) quote = ''; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; out += ' '; continue; }
        if (c === '(') { depth++; out += ' '; continue; }
        if (c === ')') { depth--; out += ' '; continue; }
        out += depth > 0 ? ' ' : c;
    }
    return out;
}

//  INT(11) unsigned  ->  INT(11) UNSIGNED      (but  enum('a','b')  keeps its words as they are)
function upperOutsideQuotes(text) {
    return text.replace(/('(?:[^']|'')*')|([^']+)/g, function (all, quoted, plain) { return quoted !== undefined ? quoted : plain.toUpperCase(); });
}

//  "name"  `name`  [name]  ->  name
function unquote(name) {
    const s = name.trim();
    if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/""/g, '"');
    if (/^`.*`$/.test(s)) return s.slice(1, -1).replace(/``/g, '`');
    if (/^\[.*\]$/.test(s)) return s.slice(1, -1);
    return s;
}

//  One cell,  written the CSV way:  quotes around it if it has a comma,  a quote,  or a line break inside.
//  (And a "nothing" letter  \0  becomes  ␀,  so you can see it,  and it can't confuse the search.)
function sqlCell(value) {
    if (value === '') return '';
    if (value.indexOf('\0') !== -1) value = value.replace(/\0/g, '␀');
    if (/[",\r\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
    return value;
}


//  Is this cell NULL?   (row counts from 1,  like the row numbers;  col from 0)
//  The NULLs were written down in row order,  so:  "guess the number"  for the row,  then look at its few NULLs.
function sqlIsNull(info, row, col) {
    const rows = info.nullRows;
    let low = 0, high = info.nullCount;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (rows[middle] < row) low = middle + 1; else high = middle;
    }
    for (let i = low; i < info.nullCount && rows[i] === row; i++) {
        if (info.nullCols[i] === col) return true;
    }
    return false;
}


//  Turn a problem into words for you.
function sqlProblem(problem, name) {
    if (problem && problem.message === 'notables') {
        return 'Couldn\'t open "' + name + '": there are no tables in it  (no CREATE TABLE,  INSERT INTO,  or COPY).';
    }
    if (problem instanceof RangeError) return 'Couldn\'t open "' + name + '": it\'s too big for the browser.';
    return 'Couldn\'t open "' + name + '": something in this SQL file wasn\'t what we expected.';
}
```

| Code | Baby words |
|---|---|
| `splitTopLevel` | Cut at commas, but not inside quotes or parentheses: `a INT, b ENUM('x','y')` = 2 parts. |
| `sqlCell` | One value, CSV style: quotes around it if it has a comma, a quote, or a line break. |
| `sqlIsNull(info, row, col)` | "Guess the number" to find the row in the NULL list, then check its few NULLs. Fast, even with millions. |

<br>

### Step 9.3: The brain

**1.** In the file listener's `loadFile`, next to `let excel = null;`:

```js
    let sql          = null;                //  a SQL dump?  Its notes  (from sqlI.js).   Otherwise  null.
    const isSql      = /\.sql$/i.test(file.name);      //  a SQL dump is text too:  it's told apart by its name
```

**2.** In `reader.onload`, instead of just `useText(text);`:

```js
        if (isSql) readAsSql(text);         //  a SQL dump:  sqlI.js turns one table into CSV text first
        else useText(text);                 //  the text is good.  Cut it up!
```

**3.** Right after `readAsExcel` (at the end of `loadFile`):

```js
    //  A SQL dump:  sqlI.js turns one of its tables into CSV text.  Then it's cut up like any CSV.
    function readAsSql(text) {

        setLoadingLabel('Reading the SQL...');

        readSql(text, file, function () { return myLoad === loadId; }, sheet).then(function (result) {

            if (myLoad !== loadId) return;
            sql = result.info;
            useText(result.text);

        }, function (problem) {

            if (myLoad !== loadId || problem === SQL_STALE) return;      //  a newer file?  Not a real problem.
            couldNotRead(sqlProblem(problem, file.name));
        });
    }
```

**4.** In "ALL DONE", the dump's types count toward the column widths (so `VARCHAR(255)` fits), right before `setColumnWidths(longest);`:

```js
            //  A SQL dump:  the column TYPES count too,  so the table look can show them  (VARCHAR(255),  DECIMAL(10,2) ...).
            //  (They're in smaller letters:  about 0.8 of a normal letter each.   PK  =  about 4 more.)
            if (sql !== null) {
                sql.columns.forEach(function (column, col) {
                    const wide = Math.ceil(column.type.length * 0.8) + (column.pk ? 4 : 0);
                    if (col < longest.length && wide > longest[col]) longest[col] = wide;
                });
            }
```

(The other "ALL DONE" lines for SQL, `sqlInfo = sql;`, the NULL note, and the look, are already in Part 5's and Part 8's code.)

**5.** The badge (at the top of `showBadge`, after `showSheetTabs();`):

```js
    if (sqlInfo !== null) {
        fileBadge.textContent = 'SQL DUMP' + (sqlInfo.dialect ? '  ·  ' + sqlInfo.dialect : '') + '  ·  ' + sqlInfo.sheetName +
            (sqlInfo.sheetCount > 1 ? '  ·  ' + sqlInfo.sheetNumber + ' of ' + sqlInfo.sheetCount + ' tables' : '');
        fileBadge.hidden = false;
        return;
    }
```

**6.** The types row, at the end of `drawHeader` (after the letters row):

```js
    //  The table look  (a SQL dump):  a row of column TYPES under the names  (INT,  VARCHAR(255) ...),
    //  and a  PK  badge on the primary key.   (Copied from the names row too,  so the boxes line up.)
    if (tableLook()) {
        const types = row.cloneNode(true);
        types.classList.add('types-row');
        delete types.dataset.index;
        types.firstChild.textContent = '';
        for (let col = builtColStart; col < builtColEnd; col++) {
            const cell   = types.children[2 + col - builtColStart];
            const column = sqlInfo.columns[col];
            cell.className = 'cell';
            cell.removeAttribute('title');
            cell.textContent = column === undefined ? '' : column.type;
            if (column !== undefined && column.pk) cell.classList.add('pk');
            if (cell.textContent.length > 14) cell.title = cell.textContent;     //  a long type?  hover to read it all
        }
        headerBox.appendChild(types);
    }
```

**7.** NULLs. In `makeRow`, right before `paintMatches(cell, shown, query);`:

```js
        //  A SQL NULL  (not just empty:  "unknown")?  Mark it:  the table look shows a faint  NULL.
        //  (Only an EMPTY cell can be NULL,  so the others don't even look it up.)
        if (sqlInfo !== null && text === '' && sqlIsNull(sqlInfo, num, col)) cell.classList.add('null');
```

And in `drawRow` (the Details panel), right before `list.append(name, value);`:

```js
        if (sqlInfo !== null && sqlIsNull(sqlInfo, row + 1, c)) value.classList.add('null');   //  a SQL NULL:  the clothes show a faint NULL
```

| Code | Baby words |
|---|---|
| `/\.sql$/i.test(file.name)` | "Does the name end with `.sql`?" (any capitals). A dump is text, like a CSV, so its NAME tells them apart. |
| `text === ''` (in `makeRow`) | Only an EMPTY cell can be NULL, so the others don't even look it up. |
| `row.cloneNode(true)` (the types row) | Copy the names row, so every type box is exactly as wide as the name above it. |

> **Why are tables tabs?** It's the same bar as Excel's sheets (Part 5): `showSheetTabs` reads from `xlsxInfo` OR `sqlInfo`, whichever is open. A table with no rows says `(empty)`, and you can still click it to see its columns.

<br>

### Step 9.4: The clothes: SQL blue

**1.** The colors. In the Neo-Neutral block (after `--formula-glow`):

```css
    --sql:          #336791;                        /*  SQL blue  (the classic database blue):  the table look's lines and PK badge  */
    --sql-dark:     #265174;                        /*  ...a shade darker:  the "Table View" button  */
    --sql-glow:     rgba(58, 126, 202, 0.5);        /*  ...and its glow  (#3a7eca,  brighter)  */
```

In the Neo-Dark block (after its `--formula-glow`):

```css
    --sql:          #3a7eca;                        /*  SQL blue:  the BRIGHTER one  (#336791 is too dark to see on black)  */
    --sql-dark:     #265174;
    --sql-glow:     rgba(58, 126, 202, 0.5);
```

> **Where does the blue come from?** `#336791` is the classic database blue (PostgreSQL's). Its 2 partners keep exactly the same relationship as Excel's 3 greens: a darker one for the button (like `#185c37`), a brighter one for the glow (like `#21a366`). On Neo-Dark, the marks use the brighter blue, because the dark one disappears on black (the same reason the ƒ uses the bright forest red).

**2.** The types row, the PK badge, and the faint NULL (right after the letters row rules):

```css
/*  The table look  (a SQL dump):  the row of column TYPES  (INT,  VARCHAR(255) ...),  under the names.
    Small,  quiet words,  and a thin line of SQL blue underneath.  */
.types-row .cell {
    font-size: 11px;
    letter-spacing: 0.03em;
    color: var(--text-soft);
}

.types-row,
.types-row:hover {
    border-bottom-color: var(--sql);
}

/*  The primary key:  a little SQL-blue  PK  badge,  in front of its type.  */
.types-row .cell.pk::before {
    content: "PK";
    display: inline-block;
    margin-right: 6px;
    padding: 0 5px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0.04em;
    color: #fff;
    background: var(--sql);
}

/*  A NULL  ("unknown",  not just empty):  a faint,  slanted  NULL.   Only in the table look
    (the CSV look shows it like a CSV would:  empty).   The Details panel shows it the same way.  */
#output.sqltable .cell.null::before,
#aimRow.sqltable .row-value.null::before {
    content: "NULL";
    font-size: 12px;
    font-style: italic;
    color: var(--text-soft);
    opacity: 0.6;
}
```

**3.** The "Table View" button (after the `#viewBtn.to-csv:hover` rule):

```css
/*  "Table View"  (a SQL dump,  in the CSV look):  SQL blue,  a shade darker,  solid,  with a soft blue glow.  */
#viewBtn.to-table {
    background: var(--sql-dark);
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.12),
        0 0 12px var(--sql-glow);
}

#viewBtn.to-table:hover {
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.16),
        0 0 18px 2px var(--sql-glow);
}
```

And in the Neo-Dark extras at the end (so the forest red, Excel's color, doesn't take over):

```css
/*  "Table View"  (a SQL dump):  stays SQL blue  (not the forest red,  which is Excel's).  */
[data-theme="neo-dark"] #viewBtn.to-table {
    background: var(--sql-dark);
    box-shadow: 0 0 12px var(--sql-glow);
}

[data-theme="neo-dark"] #viewBtn.to-table:hover {
    box-shadow: 0 0 18px 2px var(--sql-glow);
}
```

| Code | Baby words |
|---|---|
| `.types-row .cell.pk::before { content: "PK" }` | A fake piece in front of the type: a tiny blue badge that says PK. |
| `#output.sqltable .cell.null::before { content: "NULL" }` | The cell itself is empty; the clothes draw a faint, slanted NULL in it. Only in the table look: the CSV look shows it empty, like a CSV would. |

<br>

### ✅ Test it

The test dumps are in `Castle Claude/small-files/sql/`:

1. Open `mysql.sql`: a **SQL DUMP · MySQL · customers · 1 of 3 tables** badge, 3 tabs (`audit_log (empty)`), the table look: types under the names, a blue **PK** on `id`, a blue line under the types.
2. Row 2's email is a faint **NULL**. Row 4's note is EMPTY (no NULL), and its status is the WORD `NULL` (plain text): 3 different things, shown 3 ways.
3. Click **CSV View**: the card flips, the types go away, NULLs show empty. The button is now a SQL-blue **Table View**.
4. Click the `orders` tab: its own columns and rows. Search for a word, open **Details ▾**: every column with its type.
5. Open `postgres.sql`: 3 tables (a function with `;` inside didn't confuse it), the `id` has a PK (from the `ALTER TABLE` at the end), and the TAB / line break / backslash values look right.
6. Open `queries.sql`: just the 1 real table. The queries were skipped.
7. Switch to Neo-Dark: the blue gets brighter, the button stays SQL blue.

<br>

---

<br>

# PART 10: The Query Engine (`queryI.js`) 🔎

So far, the reader SHOWS a table. Now it can ANSWER QUESTIONS about it, the way a database does:

```text
   "How many orders does each status have,  biggest first?"

   SELECT status, COUNT(*) AS count            ┌───┬───────────┬───────┐
   FROM orders                          ->     │ 0 │ status    │ count │
   GROUP BY status                             │   │ TEXT      │INTEGER│   <- the answer is a little table of its own
   ORDER BY count DESC                         ├───┼───────────┼───────┤
                                               │ 1 │ shipped   │ 190   │
                                               │ 2 │ returned  │ 83    │
                                               └───┴───────────┴───────┘
```

That language is **SQL** ("ess-cue-ell", or "sequel"): the language every database speaks. Normally the database is a big program on a server. Here, the database is OURS: a small engine, written from scratch, that runs right inside the page, on the rows the brain already holds. It works on ANY open file: a CSV, an Excel sheet, a SQL dump's table.

You don't have to know SQL to use it. The **Query** button unfolds a menu with a **builder**: pick "keep rows where city is Chicago", "group by state", "count them", and it writes the SQL for you (so you learn it as you go). Or type your own.

```text
         ┌─────────────┬───────────────────────────────┬───────┐
         │ Choose File │  the aimbot window            │ Query │   <- SQL blue
         └─────────────┴───────────────────────────────┴───────┘
                     ┌───────────────────────────────────────────┐
                     │ Query  ·  orders  ·  400 rows           × │
                     ├───────────┬───────────────────────────────┤
                     │ Show      │ all columns   [+ column ▾]    │
                     │ Keep rows │ [qty ▾][is at least ▾][8]  ×  │
                     │ Group by  │ [+ column ▾]                  │
                     │ Totals    │ [+ total ▾]                   │
                     │ Sort by   │ [+ column ▾]                  │
                     │ At most   │ [    ] rows                   │
                     ├───────────┴───────────────────────────────┤
                     │ SQL  written for you as you pick ...      │
                     │ SELECT *  FROM orders  WHERE qty >= 8     │
                     │ [Run ▶] [Copy SQL] [Export CSV]   12 rows │
                     └───────────────────────────────────────────┘
```

**Run** puts the ANSWER where the file was (search it, flip it, snap to it). **← Back to file** puts the file back, instantly: it was only put aside.

This part is the biggest one: a whole new file (`queryI.js`, about 3,500 lines), plus the menu in the skeleton, the brain, and the clothes. Take it one step at a time. Every step says what it's for.

> **Is it a REAL database?** For asking questions: yes. It understands the SELECT part of SQL: `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `JOIN`s, `UNION`, subqueries, `WITH`, `CASE`, window functions (`ROW_NUMBER() OVER (...)`), and about 100 functions. It's tested against the REAL SQLite on over 200 questions, and gives the same answers. What it doesn't do: CHANGE anything (`UPDATE`, `DELETE`, `INSERT` are refused: your file is never touched).

<br>

### Step 10.1: The skeleton

**1.** Plug in the engine, right after `sqlI.js` (before the brain):

```html
    <script src="queryI.js"></script>
```

**2.** The Query button: the file bar's 3rd square, right after the aimbot window (before the bar's closing `</div>`):

```html
            <!--  QUERY:  ask the open table a question  (in SQL).  It unfolds the query menu,  below.  -->
            <button id="queryBtn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="queryMenu" title="Ask the open table a question:  keep some rows,  group them,  total them,  sort them" disabled>Query</button>
```

**3.** The menu itself, inside `#fileArea`, right after the Details panel (`#aimRow`):

```html
        <!--  THE QUERY MENU,  when you press "Query".  It unfolds out of the button:
                1.  The BUILDER:  pick what you want  (which rows,  grouped how,  what totals,  sorted how).
                2.  The SQL it writes for you  (or type your own).
                3.  Run it.   The ANSWER takes the window's place  ("← Back to file" brings the file back).
              class="folded closed"  =  it starts folded up,  and out of sight.
              (The brain fills in the builder.)  -->
        <div id="queryMenu" class="folded closed" role="dialog" aria-label="Query the open table">
            <div class="query-head">
                <span id="queryTitle">Query</span>
                <button id="queryClose" type="button" aria-label="Close the query menu">×</button>
            </div>
            <div id="queryBuilder"></div>
            <div class="query-sql-head">
                <span class="query-sql-label">SQL</span>
                <span id="querySqlNote">written for you as you pick  ·  or type your own</span>
                <button id="queryReset" type="button" hidden>Use the builder again</button>
            </div>
            <textarea id="querySql" spellcheck="false" autocomplete="off" rows="6" aria-label="The SQL query"></textarea>
            <div class="query-foot">
                <button id="queryRun" type="button" title="Run it  (Ctrl + Enter)">Run ▶</button>
                <button id="queryCopy" type="button">Copy SQL</button>
                <button id="queryExport" type="button" title="Save the answer as a CSV file" disabled>Export CSV</button>
                <span id="queryStatus" role="status" aria-live="polite"></span>
            </div>
        </div>
```

**4.** "← Back to file": the first thing in `#controls` (before Drag mode). It's hidden until an answer is on screen.

```html
        <button id="backBtn" type="button" title="Put the answer away,  and show the file again" hidden>← Back to file</button>
```

| Code | Baby words |
|---|---|
| `aria-haspopup="dialog"`, `aria-expanded` | Notes for screen readers: "this button opens a panel", and whether it's open right now. |
| `class="folded closed"` | Like the theme menu: it starts folded up and out of sight, and UNFOLDS out of its button. |
| `<textarea>` | A typing box with many lines (an `<input>` only has one). `spellcheck="false"`: SQL isn't English, so no red squiggles. |
| `role="status" aria-live="polite"` | Screen readers read "12 rows" (or what went wrong) out loud when it changes. |

<br>

### Step 10.2: The engine: how it works

Make a new file, `queryI.js`, next to the others. Here's what it does with every question, in 4 steps:

```text
   SELECT name FROM people WHERE age > 30

   1. WORDS     [SELECT] [name] [FROM] [people] [WHERE] [age] [>] [30]          (cut it into "tokens")

   2. PARSE     a TREE that says what's asked:      core
                                                   ├── show:   name
                                                   ├── from:   people
                                                   └── where:  age > 30

   3. COMPILE   every piece of the tree becomes a tiny ready-to-run function:
                    where(row)  =  row[1] > 30          (age is spot 1 in the row)

   4. RUN       walk the rows, in BITES, keep the ones where  where(row)  is true,  pick  row[0].
```

> **Why "compile" first, and not just read the tree for every row?** Reading the tree means asking "what kind of piece is this?" again and again, for every row. A million rows = a million times. Compiling asks once, and builds a function that just DOES it. The functions are tiny, and the browser makes them very fast.

Start the file with its notes (copy them as they are: they're the map of the whole file):

```js
/*
    ==========================================================

        THE NANDO NOTES  -  queryI.js

        This file is the QUERY ENGINE:  a small database of our own,  inside the page.
        You write a question in SQL,  and it answers it,  using the rows the brain already holds:

            SELECT city, COUNT(*) AS customers
            FROM sales
            WHERE state = 'IL'
            GROUP BY city
            ORDER BY customers DESC

        It works on ANY open file:  a CSV,  an Excel sheet,  or a SQL dump's table
        (they're all just tables to it).

            testI.html   =  what's there     (skeleton)
            styleI.css   =  how it looks     (clothes)
            scriptI.js   =  what it does     (brain)
            xlsxI.js     =  reads Excel files     (a translator)
            sqlI.js      =  reads SQL dumps       (a translator)
            queryI.js    =  answers SQL questions (the query engine)

    ==========================================================


    THE STEPS  (for every question):

        1.   WORDS.     Cut the question into words  ("tokens"):   SELECT   city   ,   COUNT   (   *   )  ...
        2.   PARSE.     Read the words into a TREE  that says what's being asked:
                            "pick these columns,  from this table,  keep these rows,  group them like this ..."
        3.   COMPILE.   Turn every part of the tree into a tiny ready-to-run function.
                        (Done once.  Then each function runs once per row:  that's what makes it fast.)
        4.   RUN.       Walk through the rows,  in BITES  (like everything else),  so the page never freezes.
                        The answer is a new little table:  its columns,  and its rows.


    WHAT IT UNDERSTANDS  (the SELECT part of SQL,  the part that ASKS):

        SELECT  [DISTINCT]  ...  FROM  ...  [JOIN ... ON ...]  WHERE  ...  GROUP BY  ...  HAVING  ...
        ORDER BY  ...  LIMIT  ...  OFFSET  ...       UNION / INTERSECT / EXCEPT       WITH  name AS (...)
        subqueries  (SELECT ...)  inside  IN,  EXISTS,  FROM,  or as one value
        CASE,  CAST,  LIKE,  BETWEEN,  IN,  IS NULL,  math,  ||
        totals:     COUNT  SUM  AVG  MIN  MAX  MEDIAN  STRING_AGG  STDDEV ...
        windows:    ROW_NUMBER()  RANK()  LAG()  SUM(...) OVER (PARTITION BY ... ORDER BY ...) ...
        and lots of functions for words,  numbers,  and dates.

    When two databases disagree on a detail,  it does what SQLITE does
    (the tests check every answer against the real SQLite).


    SAFETY:

        -  It only ever READS.   UPDATE,  DELETE,  INSERT ... are refused:  your file is never changed.
        -  Every answer goes on the page as plain text  (the brain already does that).

*/
```

<br>

### Step 10.3: Problems, and the words

**Problems.** When your question has a mistake ("there's no column named nope"), the engine says so in plain words. Those messages are a `QueryError`, so the brain knows they're for YOU to read (anything else is a bug):

```js
class QueryError extends Error {}

const QUERY_STALE = new Error('stale');     //  "you ran a newer query  (or picked a new file):  forget this one"

function queryFail(words) {
    throw new QueryError(words);
}
```

**1. WORDS.** Cutting the text into tokens. Each token remembers where it was (`at`), so a problem can say WHERE it is ("near FROM, line 2"):

```js
const TWO_SYMBOLS = ['<=', '>=', '<>', '!=', '||', '::', '=='];
const ONE_SYMBOL  = '(),.;+-*/%=<>';

function sqlTokens(text) {

    const tokens = [];
    const n = text.length;
    let p = 0;

    const NUMBER = /(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
    const WORD   = /[A-Za-z_À-￿][A-Za-z0-9_$À-￿]*/y;

    //  Read up to the closing mark.   Two closing marks in a row  =  one real one  ('it''s').
    function quoted(close, what) {
        let out = '';
        for (;;) {
            const end = text.indexOf(close, p);
            if (end === -1) queryFail(what + ' never ends  (a  ' + close + '  is missing).');
            out += text.slice(p, end);
            p = end + 1;
            if (close !== ']' && text[p] === close) { out += close; p++; continue; }
            return out;
        }
    }

    for (;;) {

        //  Skip spaces,  and comments:   -- to the end of the line,   and the slash-star kind.
        for (;;) {
            const c = text.charCodeAt(p);
            if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 160) { p++; continue; }
            if (c === 45 && text.charCodeAt(p + 1) === 45) {
                const end = text.indexOf('\n', p);
                p = end === -1 ? n : end + 1;
                continue;
            }
            if (c === 47 && text.charCodeAt(p + 1) === 42) {
                const end = text.indexOf('*/', p + 2);
                if (end === -1) queryFail('A comment never ends  (the  */  is missing).');
                p = end + 2;
                continue;
            }
            break;
        }

        if (p >= n) {
            tokens.push({ k: 'end', v: '', at: n });
            return tokens;
        }

        const at = p;
        const c  = text[p];

        if (c === "'") { p++; tokens.push({ k: 'str', v: quoted("'", 'Some words in quotes'), at: at }); continue; }

        //  N'...'  (SQL Server's "Unicode words")  is just words.
        if ((c === 'N' || c === 'n') && text[p + 1] === "'") { p += 2; tokens.push({ k: 'str', v: quoted("'", 'Some words in quotes'), at: at }); continue; }

        if (c === '"') { p++; tokens.push({ k: 'qid', v: quoted('"', 'A name in "quotes"'), at: at }); continue; }
        if (c === '`') { p++; tokens.push({ k: 'qid', v: quoted('`', 'A name in `quotes`'), at: at }); continue; }
        if (c === '[') { p++; tokens.push({ k: 'qid', v: quoted(']', 'A name in [brackets]'), at: at }); continue; }

        if ((c >= '0' && c <= '9') || (c === '.' && text[p + 1] >= '0' && text[p + 1] <= '9')) {
            NUMBER.lastIndex = p;
            const m = NUMBER.exec(text);
            p = NUMBER.lastIndex;
            tokens.push({ k: 'num', v: Number(m[0]), int: m[0].indexOf('.') === -1 && m[2] === undefined, at: at });
            continue;
        }

        WORD.lastIndex = p;
        const word = WORD.exec(text);
        if (word !== null && word.index === p) {
            p = WORD.lastIndex;
            tokens.push({ k: 'id', v: word[0], u: word[0].toUpperCase(), at: at });
            continue;
        }

        const two = text.slice(p, p + 2);
        if (TWO_SYMBOLS.indexOf(two) !== -1) { p += 2; tokens.push({ k: 'op', v: two, at: at }); continue; }
        if (ONE_SYMBOL.indexOf(c) !== -1)    { p += 1; tokens.push({ k: 'op', v: c,   at: at }); continue; }

        queryFail('I don\'t know what  ' + c + '  means here' + lineNote(text, at) + '.');
    }
}

//  "  (line 3)"  when the question has more than one line.
function lineNote(text, at) {
    const line = text.slice(0, at).split('\n').length;
    return text.indexOf('\n') === -1 ? '' : '  (line ' + line + ')';
}
```

| Code | Baby words |
|---|---|
| `/.../y` (the `y` at the end) | A "sticky" search: it only looks RIGHT at `lastIndex`, not further along. Perfect for "is there a number right here?" |
| `quoted(close, what)` | Read up to the closing quote. Two in a row (`''`) is one real quote: `'it''s'` = `it's`. |
| `"name"`, `` `name` ``, `[name]` | 3 ways databases quote a NAME (so it can have spaces: `"Sales Data"`). They're all the same here. |
| `'words'` | Single quotes are for WORDS (values). `"double"` quotes are for NAMES. (Mixing them up is the #1 SQL mistake.) |
| `N'...'` | SQL Server's "these words are Unicode". Just words. |

<br>

### Step 10.4: Parse: the tree

The parser reads the tokens into a tree. It's called **recursive descent**: one little function per piece of SQL, and they call each other. The ORDER they call each other decides what's "stronger":

```text
   a OR b AND c      =   a OR (b AND c)          AND is stronger than OR
   1 + 2 * 3         =   1 + (2 * 3)  =  7       *  is stronger than  +
   NOT a = b         =   NOT (a = b)

   expr  ->  orE  ->  andE  ->  notE  ->  predicate (= < IS IN LIKE BETWEEN)  ->  catE (||)  ->  addE (+ -)  ->  mulE (* / %)  ->  unaryE (-x)  ->  primary
   (weakest)                                                                                                                             (strongest)
```

First, the words that can't be a nickname, and the commands that CHANGE data (those are refused). Then the parser's helpers: look at the next token, or "eat" it:

```js
const SQL_RESERVED = new Set((
    'SELECT FROM WHERE GROUP HAVING ORDER LIMIT OFFSET UNION INTERSECT EXCEPT MINUS JOIN INNER LEFT RIGHT FULL ' +
    'CROSS OUTER NATURAL ON USING AS AND OR NOT IN IS NULL LIKE ILIKE BETWEEN CASE WHEN THEN ELSE END EXISTS ' +
    'DISTINCT ALL BY ASC DESC WITH FETCH WINDOW ESCAPE OVER FILTER INTO VALUES SET'
).split(' '));

const COMPARE_SYMBOLS = new Set(['=', '==', '<>', '!=', '<', '<=', '>', '>=']);

//  Commands that would CHANGE the data.   We read them (to skip them),  but never run them.
const WRITE_COMMANDS = new Set(['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'REPLACE', 'MERGE', 'GRANT', 'REVOKE', 'ATTACH', 'DETACH', 'VACUUM', 'PRAGMA', 'BEGIN', 'COMMIT', 'ROLLBACK', 'USE', 'SET', 'EXEC', 'EXECUTE', 'CALL']);


function parseSql(text) {

    const tk = sqlTokens(text);
    let i = 0;                              //  which token we're on


    //  ---- helpers:  look at the next token,  or "eat" it ----

    function isW(u, ahead) {                //  is the token  (ahead of here)  the word u?
        const t = tk[i + (ahead || 0)];
        return t !== undefined && t.k === 'id' && t.u === u;
    }
    function isO(v, ahead) {                //  ...the symbol v?
        const t = tk[i + (ahead || 0)];
        return t !== undefined && t.k === 'op' && t.v === v;
    }
    function eatW(u) { if (isW(u)) { i++; return true; } return false; }
    function eatO(v) { if (isO(v)) { i++; return true; } return false; }
    function needW(u) { if (!eatW(u)) fail('Expected  ' + u); }
    function needO(v) { if (!eatO(v)) fail('Expected  ' + v); }

    //  Say WHERE it went wrong:   near  "FROM"  (line 2)
    function fail(words) {
        const t = tk[i];
        if (t.k === 'end') queryFail(words + '  (at the end of the query).');
        const shown = text.slice(t.at, tk[i + 1].at).trim() || t.v;
        queryFail(words + '  (near  ' + shown + lineNote(text, t.at) + ').');
    }

    //  A name  (of a column,  a table,  a nickname).
    function name(what) {
        const t = tk[i];
        if (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { i++; return t.v; }
        fail('Expected ' + what);
    }

    //  A nickname after AS:  any word,  or words in quotes.
    function aliasName() {
        const t = tk[i];
        if (t.k === 'qid' || t.k === 'str' || t.k === 'id') { i++; return t.v; }
        fail('Expected a nickname after AS');
    }

    function isQueryStart() { return isW('SELECT') || isW('WITH'); }
```

**The whole text, and one query.** Several commands split by `;`? They're all read; the LAST one is the answer (so you can keep notes above it). A `WITH` comes first, then the SELECTs (joined by `UNION`...), then `ORDER BY` and `LIMIT`:

```js
    //  ---- THE WHOLE TEXT:  one or more commands,  split by  ;  ----

    function statements() {
        const list = [];
        for (;;) {
            while (eatO(';')) {}
            if (tk[i].k === 'end') return list;
            list.push(statement());
            if (!eatO(';') && tk[i].k !== 'end') fail('Expected the query to end here  (or a  ;  before the next one)');
        }
    }

    function statement() {
        if (isQueryStart() || isO('(')) return query();
        const t = tk[i];
        if (t.k === 'id' && WRITE_COMMANDS.has(t.u)) {
            //  A command that would change the data.  Skip it  (up to the next  ;  that isn't in quotes).
            const verb = t.u;
            while (tk[i].k !== 'end' && !isO(';')) i++;
            return { t: 'write', verb: verb };
        }
        fail('A query starts with  SELECT  (or WITH)');
    }


    //  ---- A QUERY:   [WITH ...]  SELECT ...  [UNION SELECT ...]  [ORDER BY]  [LIMIT]  ----

    function query() {

        const q = { t: 'query', with: null, body: null, order: null, limit: null, offset: null };

        if (eatW('WITH')) {
            if (isW('RECURSIVE')) fail('WITH RECURSIVE isn\'t supported yet');
            q.with = [];
            do {
                const cte = { name: name('a name for the WITH table'), cols: null, q: null };
                if (eatO('(')) { cte.cols = nameList(); needO(')'); }
                needW('AS');
                needO('(');
                cte.q = query();
                needO(')');
                q.with.push(cte);
            } while (eatO(','));
        }

        q.body = setExpr();

        if (eatW('ORDER')) { needW('BY'); q.order = orderList(); }

        if (eatW('LIMIT')) {
            const first = expr();
            if (eatO(',')) { q.offset = first; q.limit = expr(); }      //  MySQL:   LIMIT 10, 5   =  skip 10,  show 5
            else {
                q.limit = first;
                if (eatW('OFFSET')) q.offset = expr();
            }
        } else if (eatW('OFFSET')) {                                    //  OFFSET 10 ROWS  FETCH NEXT 5 ROWS ONLY   (SQL Server,  Oracle)
            q.offset = expr();
            if (!eatW('ROWS')) eatW('ROW');
            if (eatW('FETCH')) fetchFirst(q);
        } else if (eatW('FETCH')) {
            fetchFirst(q);
        }

        return q;
    }

    function fetchFirst(q) {
        if (!eatW('FIRST')) eatW('NEXT');
        q.limit = isW('ROWS') || isW('ROW') ? { t: 'lit', v: 1, ty: 'int' } : expr();
        if (!eatW('ROWS')) eatW('ROW');
        needW('ONLY');
    }

    //  UNION / INTERSECT / EXCEPT:  all the same strength,  left to right  (like SQLite).
    function setExpr() {
        let a = setTerm();
        for (;;) {
            let op;
            if (eatW('UNION'))          op = eatW('ALL') ? 'UNION ALL' : (eatW('DISTINCT'), 'UNION');
            else if (eatW('INTERSECT')) op = 'INTERSECT';
            else if (eatW('EXCEPT') || eatW('MINUS')) op = 'EXCEPT';
            else return a;
            if (op !== 'UNION ALL' && op !== 'UNION' && isW('ALL')) fail(op + ' ALL isn\'t supported yet');
            eatW('DISTINCT');
            a = { t: 'set', op: op, a: a, b: setTerm() };
        }
    }

    function setTerm() {
        if (eatO('(')) {
            const q = query();
            needO(')');
            return { t: 'paren', q: q };
        }
        return core();
    }
```

| Code | Baby words |
|---|---|
| `LIMIT 10, 5` | MySQL's way: skip 10, show 5. The same as `LIMIT 5 OFFSET 10`. |
| `OFFSET ... FETCH NEXT ... ROWS ONLY` | SQL Server's and Oracle's way. The same thing again. |
| `UNION` / `UNION ALL` | Stack 2 answers on top of each other. `UNION` drops repeats, `UNION ALL` keeps them. |
| `INTERSECT` / `EXCEPT` | Rows in BOTH answers / rows in the first but NOT the second. |

**One SELECT, and FROM.** `TOP 10` is SQL Server's `LIMIT 10`. A JOIN is read as a little tree too: `a JOIN b JOIN c` = `(a JOIN b) JOIN c`:

```js
    //  ---- ONE SELECT:   SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ...  ----

    function core() {

        needW('SELECT');

        const c = { t: 'core', distinct: false, top: null, items: [], from: null, where: null, group: null, having: null };

        if (eatW('DISTINCT')) c.distinct = true;
        else eatW('ALL');

        //  SQL Server:   SELECT TOP 10 ...    (TOP followed by a number:  otherwise  top  is just a column's name)
        if (isW('TOP') && (tk[i + 1].k === 'num' || isO('(', 1))) {
            i++;
            if (eatO('(')) { c.top = expr(); needO(')'); }
            else c.top = primary();
            if (isW('PERCENT')) fail('TOP ... PERCENT isn\'t supported');
        }

        do c.items.push(selectItem()); while (eatO(','));

        if (eatW('FROM')) c.from = fromList();
        if (eatW('WHERE')) c.where = expr();
        if (eatW('GROUP')) { needW('BY'); c.group = exprList(); }
        if (eatW('HAVING')) c.having = expr();
        if (isW('WINDOW')) fail('Named windows  (WINDOW w AS ...)  aren\'t supported:  write the window inside OVER (...)');

        return c;
    }

    //  One thing to show:    *     people.*     age * 2  AS double_age
    function selectItem() {

        if (eatO('*')) return { star: true, table: null };

        if ((tk[i].k === 'id' || tk[i].k === 'qid') && isO('.', 1) && isO('*', 2)) {
            const table = tk[i].v;
            i += 3;
            return { star: true, table: table };
        }

        const from = tk[i].at;
        const e = expr();
        //  The words it was written with  (its column's name,  if it gets no nickname):   COUNT(*)
        const label = text.slice(from, tk[i].at).trim();

        let alias = null;
        if (eatW('AS')) alias = aliasName();
        else {
            const t = tk[i];
            if (t.k === 'qid' || t.k === 'str' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { alias = t.v; i++; }
        }

        return { star: false, e: e, alias: alias, label: label };
    }


    //  ---- FROM:   tables,  and how they're JOINed  ----

    function fromList() {
        let a = fromJoins();
        while (eatO(',')) a = { t: 'join', kind: 'cross', a: a, b: fromJoins(), on: null, using: null, natural: false };
        return a;
    }

    function fromJoins() {
        let a = fromItem();
        for (;;) {
            const save = i;
            const natural = eatW('NATURAL');
            let kind = null;

            if (eatW('JOIN')) kind = 'inner';
            else if (eatW('INNER')) { needW('JOIN'); kind = 'inner'; }
            else if (eatW('LEFT'))  { eatW('OUTER'); needW('JOIN'); kind = 'left'; }
            else if (eatW('RIGHT')) { eatW('OUTER'); needW('JOIN'); kind = 'right'; }
            else if (eatW('FULL'))  { eatW('OUTER'); needW('JOIN'); kind = 'full'; }
            else if (eatW('CROSS')) { needW('JOIN'); kind = 'cross'; }

            if (kind === null) {
                if (natural) fail('Expected  JOIN  after NATURAL');
                i = save;
                return a;
            }

            const j = { t: 'join', kind: kind, a: a, b: fromItem(), on: null, using: null, natural: natural };

            if (kind !== 'cross' && !natural) {
                if (eatW('ON')) j.on = expr();
                else if (eatW('USING')) { needO('('); j.using = nameList(); needO(')'); }
                else if (kind !== 'inner') fail('Expected  ON  (which rows go together)');
            }
            a = j;
        }
    }

    function fromItem() {

        if (eatO('(')) {
            if (isQueryStart()) {
                const q = query();
                needO(')');
                return { t: 'sub', q: q, alias: tableAlias() };
            }
            const inside = fromList();
            needO(')');
            return inside;
        }

        let tableName = name('a table name');
        while (eatO('.')) tableName = name('a table name');             //  dbo.orders  /  main.orders   ->   just "orders"
        return { t: 'table', name: tableName, alias: tableAlias() };
    }

    function tableAlias() {
        if (eatW('AS')) return aliasName();
        const t = tk[i];
        if (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { i++; return t.v; }
        return null;
    }
```

> **Why does `label` keep the words you wrote?** A column with no nickname is named the way you wrote it: `SELECT COUNT(*) FROM t` gives a column called `COUNT(*)`. That's what SQLite does too.

```js
    //  ---- LISTS ----

    function exprList() {
        const list = [];
        do list.push(expr()); while (eatO(','));
        return list;
    }

    function nameList() {
        const list = [];
        do list.push(name('a column name')); while (eatO(','));
        return list;
    }

    //  ORDER BY  price DESC,  name   (NULLS FIRST / NULLS LAST  too)
    function orderList() {
        const list = [];
        do {
            const item = { e: expr(), desc: false, nulls: null };
            if (eatW('DESC')) item.desc = true;
            else eatW('ASC');
            if (eatW('NULLS')) {
                if (eatW('FIRST')) item.nulls = 'first';
                else { needW('LAST'); item.nulls = 'last'; }
            }
            list.push(item);
        } while (eatO(','));
        return list;
    }
```

**Expressions, weakest first:**

```js
    //  ---- EXPRESSIONS  (weakest first) ----

    function expr() { return orE(); }

    function orE() {
        let a = andE();
        while (eatW('OR')) a = { t: 'or', a: a, b: andE() };
        return a;
    }

    function andE() {
        let a = notE();
        while (eatW('AND')) a = { t: 'and', a: a, b: notE() };
        return a;
    }

    function notE() {
        if (eatW('NOT')) return { t: 'not', e: notE() };
        return predicate();
    }

    //  Comparisons and tests:   =  <  IS NULL  IN (...)  BETWEEN  LIKE
    function predicate() {

        let a = catE();

        for (;;) {

            const t = tk[i];

            if (t.k === 'op' && COMPARE_SYMBOLS.has(t.v)) {
                i++;
                const op = t.v === '==' ? '=' : t.v === '!=' ? '<>' : t.v;
                a = { t: 'cmp', op: op, a: a, b: catE() };
                continue;
            }

            if (eatW('IS')) {
                const not = eatW('NOT');
                if (eatW('NULL')) a = { t: 'isnull', e: a, not: not };
                else if (eatW('DISTINCT')) { needW('FROM'); a = { t: 'isdist', a: a, b: catE(), not: not }; }
                else if (eatW('TRUE'))  a = { t: 'istrue', e: a, v: true,  not: not };
                else if (eatW('FALSE')) a = { t: 'istrue', e: a, v: false, not: not };
                else a = { t: 'isdist', a: a, b: catE(), not: !not };      //  SQLite:   a IS b   =   "a is not distinct from b"
                continue;
            }

            const not = isW('NOT') && (isW('IN', 1) || isW('LIKE', 1) || isW('ILIKE', 1) || isW('BETWEEN', 1));
            if (not) i++;

            if (eatW('IN')) {
                needO('(');
                if (isQueryStart()) a = { t: 'insub', e: a, q: query(), not: not };
                else a = { t: 'in', e: a, list: isO(')') ? [] : exprList(), not: not };
                needO(')');
                continue;
            }

            if (eatW('BETWEEN')) {
                const lo = catE();
                needW('AND');
                a = { t: 'between', e: a, lo: lo, hi: catE(), not: not };
                continue;
            }

            if (eatW('LIKE') || eatW('ILIKE')) {
                const pattern = catE();
                const escape  = eatW('ESCAPE') ? catE() : null;
                a = { t: 'like', e: a, pat: pattern, esc: escape, not: not };
                continue;
            }

            if (not) fail('Expected  IN,  LIKE,  or BETWEEN  after NOT');
            return a;
        }
    }

    function catE() {
        let a = addE();
        while (eatO('||')) a = { t: 'cat', a: a, b: addE() };
        return a;
    }

    function addE() {
        let a = mulE();
        for (;;) {
            if (eatO('+')) a = { t: 'bin', op: '+', a: a, b: mulE() };
            else if (eatO('-')) a = { t: 'bin', op: '-', a: a, b: mulE() };
            else return a;
        }
    }

    function mulE() {
        let a = unaryE();
        for (;;) {
            if (eatO('*')) a = { t: 'bin', op: '*', a: a, b: unaryE() };
            else if (eatO('/')) a = { t: 'bin', op: '/', a: a, b: unaryE() };
            else if (eatO('%')) a = { t: 'bin', op: '%', a: a, b: unaryE() };
            else return a;
        }
    }

    function unaryE() {
        if (eatO('-')) {
            const e = unaryE();
            if (e.t === 'lit' && typeof e.v === 'number') return { t: 'lit', v: -e.v, ty: e.ty };    //  -5  is just a number
            return { t: 'neg', e: e };
        }
        if (eatO('+')) return unaryE();
        let e = primary();
        while (eatO('::')) e = { t: 'cast', e: e, to: typeName() };       //  PostgreSQL:   price::INTEGER
        return e;
    }
```

| Code | Baby words |
|---|---|
| `a IS NULL` | The only way to ask "is it NULL?". (`a = NULL` is never true: NULL means "unknown", and "is unknown equal to unknown?" is... unknown.) |
| `a IS NOT DISTINCT FROM b` | Like `=`, but NULL matches NULL. |
| `x IN (1, 2, 3)` / `x IN (SELECT ...)` | "Is x one of these?" |
| `x BETWEEN 5 AND 10` | `x >= 5 AND x <= 10` (both ends count). |
| `x LIKE 'Chi%'` | `%` = any letters, `_` = one letter. |
| `price::INTEGER` | PostgreSQL's way to say `CAST(price AS INTEGER)`. |

**The smallest pieces:** a value, a column, `CASE`, `CAST`, `(SELECT ...)`, a function call:

```js
    //  The smallest pieces:  a value,  a column,  a function,  (...)
    function primary() {

        const t = tk[i];

        if (t.k === 'num') { i++; return { t: 'lit', v: t.v, ty: t.int && Number.isSafeInteger(t.v) ? 'int' : 'real' }; }
        if (t.k === 'str') { i++; return { t: 'lit', v: t.v, ty: 'text' }; }

        if (t.k === 'op' && t.v === '(') {
            i++;
            if (isQueryStart()) {
                const q = query();
                needO(')');
                return { t: 'scalar', q: q };
            }
            const e = expr();
            needO(')');
            return e;
        }

        if (t.k === 'qid') return columnRef();
        if (t.k !== 'id') fail('Expected a value,  a column,  or a function');

        const u = t.u;

        if (u === 'NULL')  { i++; return { t: 'lit', v: null, ty: 'null' }; }
        if (u === 'TRUE')  { i++; return { t: 'lit', v: true,  ty: 'bool' }; }
        if (u === 'FALSE') { i++; return { t: 'lit', v: false, ty: 'bool' }; }

        if (u === 'CASE') return caseE();

        if ((u === 'CAST' || u === 'TRY_CAST') && isO('(', 1)) {
            i += 2;
            const e = expr();
            needW('AS');
            const to = typeName();
            needO(')');
            return { t: 'cast', e: e, to: to };
        }

        if (u === 'EXISTS' && isO('(', 1)) {
            i += 2;
            const q = query();
            needO(')');
            return { t: 'exists', q: q };
        }

        //  DATE '2024-01-31'    TIMESTAMP '2024-01-31 09:30:00'
        if ((u === 'DATE' || u === 'TIMESTAMP' || u === 'DATETIME') && tk[i + 1].k === 'str') {
            i++;
            const s = tk[i++].v;
            return { t: 'cast', e: { t: 'lit', v: s, ty: 'text' }, to: u === 'DATE' ? 'date' : 'timestamp' };
        }

        if ((u === 'CURRENT_DATE' || u === 'CURRENT_TIMESTAMP' || u === 'CURRENT_TIME') && !isO('(', 1)) {
            i++;
            return { t: 'fn', name: u, args: [], distinct: false, star: false, order: null, filter: null, over: null };
        }

        if (isO('(', 1)) return call();

        if (SQL_RESERVED.has(u)) fail('Expected a value,  a column,  or a function');
        return columnRef();
    }

    //  age    people.age    "my table"."my column"
    function columnRef() {
        const first = tk[i++].v;
        if (!eatO('.')) return { t: 'col', table: null, name: first };
        const second = tk[i];
        if (second.k !== 'id' && second.k !== 'qid') fail('Expected a column name after the dot');
        i++;
        if (eatO('.')) {                                    //  schema.table.column   ->   table.column
            const third = tk[i];
            if (third.k !== 'id' && third.k !== 'qid') fail('Expected a column name after the dot');
            i++;
            return { t: 'col', table: second.v, name: third.v };
        }
        return { t: 'col', table: first, name: second.v };
    }

    function caseE() {
        i++;
        const c = { t: 'case', base: null, whens: [], els: null };
        if (!isW('WHEN')) c.base = expr();                  //  CASE x WHEN 1 THEN ...   (compare x to each)
        while (eatW('WHEN')) {
            const when = expr();
            needW('THEN');
            c.whens.push([when, expr()]);
        }
        if (c.whens.length === 0) fail('Expected  WHEN');
        if (eatW('ELSE')) c.els = expr();
        needW('END');
        return c;
    }

    //  A type name:   INTEGER    VARCHAR(50)    DECIMAL(10, 2)    DOUBLE PRECISION
    function typeName() {
        if (tk[i].k !== 'id') fail('Expected a type,  like INTEGER or TEXT');
        let words = tk[i++].u;
        while (tk[i].k === 'id' && /^(PRECISION|VARYING|INTEGER|INT|CHAR|CHARACTER)$/.test(tk[i].u)) words += ' ' + tk[i++].u;
        if (eatO('(')) {
            while (!isO(')') && tk[i].k !== 'end') i++;
            needO(')');
        }
        return typeClass(words);
    }
```

**Function calls** (some have their own grammar: `EXTRACT(YEAR FROM d)`, `TRIM(LEADING '0' FROM code)`), and what can come after them: `FILTER (WHERE ...)`, `WITHIN GROUP (...)`, `OVER (...)`:

```js
    //  A function call:   UPPER(name)    COUNT(*)    COUNT(DISTINCT city)    SUM(x) FILTER (WHERE ...)    RANK() OVER (...)
    function call() {

        const fname = tk[i].u;
        i += 2;                                             //  the name,  and the  (

        const f = { t: 'fn', name: fname, args: [], distinct: false, star: false, order: null, filter: null, over: null };

        //  The ones with their own grammar:
        if (fname === 'EXTRACT') {                          //  EXTRACT(YEAR FROM d)
            const field = tk[i++];
            if (field.k !== 'id' && field.k !== 'str') fail('Expected a part of a date,  like YEAR');
            needW('FROM');
            f.args = [{ t: 'lit', v: field.v.toLowerCase(), ty: 'text' }, expr()];
            needO(')');
            return after(f);
        }
        if (fname === 'POSITION' && !isO(')')) {            //  POSITION('a' IN name)
            const needle = catE();
            if (eatW('IN')) {
                f.name = 'INSTR';
                f.args = [expr(), needle];
                needO(')');
                return after(f);
            }
            f.args = [needle];
            while (eatO(',')) f.args.push(expr());
            needO(')');
            return after(f);
        }
        if (fname === 'SUBSTRING' && !isO(')')) {           //  SUBSTRING(name FROM 2 FOR 3)
            f.args = [expr()];
            if (eatW('FROM')) {
                f.args.push(expr());
                if (eatW('FOR')) f.args.push(expr());
            } else {
                while (eatO(',')) f.args.push(expr());
            }
            needO(')');
            return after(f);
        }
        if (fname === 'TRIM' && !isO(')')) {                //  TRIM(LEADING '0' FROM code)
            let side = 'TRIM';
            if (eatW('BOTH')) side = 'TRIM';
            else if (eatW('LEADING')) side = 'LTRIM';
            else if (eatW('TRAILING')) side = 'RTRIM';
            f.name = side;
            if (eatW('FROM')) { f.args = [expr()]; needO(')'); return after(f); }
            const first = expr();
            if (eatW('FROM')) f.args = [expr(), first];
            else {
                f.args = [first];
                while (eatO(',')) f.args.push(expr());
            }
            needO(')');
            return after(f);
        }

        if (eatO('*')) {
            f.star = true;
            needO(')');
        } else if (!eatO(')')) {
            if (eatW('DISTINCT')) f.distinct = true;
            else eatW('ALL');
            do f.args.push(expr()); while (eatO(','));
            if (eatW('ORDER')) { needW('BY'); f.order = orderList(); }      //  STRING_AGG(name, ', ' ORDER BY name)
            if (eatW('SEPARATOR')) f.args.push(expr());                     //  MySQL:   GROUP_CONCAT(name SEPARATOR '; ')
            needO(')');
        }

        return after(f);
    }

    //  What can come after a function's  ( ... ) :   WITHIN GROUP (...)   FILTER (...)   OVER (...)
    function after(f) {
        if (eatW('WITHIN')) {                               //  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)
            needW('GROUP'); needO('('); needW('ORDER'); needW('BY');
            f.order = orderList();
            f.within = true;
            needO(')');
        }
        if (eatW('FILTER')) {                               //  COUNT(*) FILTER (WHERE price > 10)
            needO('('); needW('WHERE');
            f.filter = expr();
            needO(')');
        }
        if (eatW('OVER')) f.over = windowSpec();
        return f;
    }

    //  OVER (PARTITION BY dept ORDER BY salary DESC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
    function windowSpec() {
        if (!isO('(')) fail('Named windows aren\'t supported:  write the window inside OVER (...)');
        i++;
        const w = { partition: null, order: null, frame: null };
        if (eatW('PARTITION')) { needW('BY'); w.partition = exprList(); }
        if (eatW('ORDER')) { needW('BY'); w.order = orderList(); }
        if (isW('ROWS') || isW('RANGE') || isW('GROUPS')) {
            const unit = tk[i++].u;
            if (unit === 'GROUPS') fail('GROUPS frames aren\'t supported:  use ROWS or RANGE');
            let start, end;
            if (eatW('BETWEEN')) {
                start = frameEdge();
                needW('AND');
                end = frameEdge();
            } else {
                start = frameEdge();
                end = { kind: 'current' };
            }
            w.frame = { unit: unit, start: start, end: end };
        }
        needO(')');
        return w;
    }

    function frameEdge() {
        if (eatW('UNBOUNDED')) {
            if (eatW('PRECEDING')) return { kind: 'first' };
            needW('FOLLOWING');
            return { kind: 'last' };
        }
        if (eatW('CURRENT')) { needW('ROW'); return { kind: 'current' }; }
        const amount = expr();
        if (eatW('PRECEDING')) return { kind: 'before', n: amount };
        needW('FOLLOWING');
        return { kind: 'after', n: amount };
    }


    const list = statements();
    if (list.length === 0) queryFail('There\'s no query to run yet.  Try:   SELECT * FROM ' + 'your_table' + ' LIMIT 10');
    return list;
}


//  What KIND of value a type name means  (the same rules SQLite uses):
//      INT anywhere            ->  int        (INTEGER,  BIGINT,  SMALLINT ...)
//      CHAR / TEXT / CLOB      ->  text       (VARCHAR(50),  NVARCHAR ...)
//      REAL / FLOAT / DOUBLE   ->  real
//      DECIMAL / NUMERIC       ->  num        (a number:  whole or not)
//      BOOL                    ->  bool
//      DATE                    ->  date        (YYYY-MM-DD)
//      DATETIME / TIMESTAMP    ->  timestamp   (YYYY-MM-DD hh:mm:ss)
//      anything else           ->  text
function typeClass(declared) {
    const u = String(declared).toUpperCase();
    if ((/INT/.test(u) && !/INTERVAL|POINT/.test(u)) || /SIGNED/.test(u)) return 'int';
    if (/CHAR|CLOB|TEXT|STRING|UUID|JSON|ENUM/.test(u)) return 'text';
    if (/TIMESTAMP|DATETIME/.test(u)) return 'timestamp';
    if (/^DATE/.test(u)) return 'date';
    if (/REAL|FLOA|DOUB/.test(u)) return 'real';
    if (/DEC|NUMERIC|NUMBER|MONEY/.test(u)) return 'num';
    if (/BOOL|BIT/.test(u)) return 'bool';
    return 'text';
}
```

> **What's `typeClass`?** Types have many names (`INT`, `BIGINT`, `VARCHAR(50)`, `DOUBLE PRECISION`...). SQLite sorts them into a few KINDS by looking at the letters ("has INT in it? a whole number"). So does this. `DECIMAL` is `num`: a number that can be whole or not.

<br>

### Step 10.5: Values

Inside the engine, a value is one of 4 things: `null`, a number, words, or true/false. These helpers turn one into another, and compare them:

```js
const NUMBER_WORDS = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/;

//  The number at the START of some words  ('12abc'  ->  12).
const NUMBER_START = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;


//  A value as WORDS.   ty  =  its type,  if known:  a  real  number that's whole shows as  2.0  (like SQLite).
function valueText(v, ty) {
    if (v === null || typeof v === 'string') return v;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (ty === 'real' && Number.isInteger(v) && Math.abs(v) < 1e15) return v.toFixed(1);
    return numberText(v);
}

function numberText(v) {
    if (Number.isInteger(v)) return String(v);
    if (!isFinite(v)) return v > 0 ? 'Inf' : v < 0 ? '-Inf' : 'NaN';
    return String(Number(v.toPrecision(15)));       //  15 digits,  like SQLite:   0.1 + 0.2  ->  0.3
}

//  A value as a NUMBER.   (Words that aren't a number count as 0,  like SQLite:   'abc' + 1  =  1.)
function numOf(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null) return null;
    const m = NUMBER_START.exec(v);
    return m === null ? 0 : Number(m[0]);
}

//  Is it TRUE?   (For WHERE,  HAVING,  CASE WHEN,  AND / OR / NOT.)
function truthy(v) {
    if (v === true) return true;
    if (v === false || v === null) return false;
    return numOf(v) !== 0;
}

//  TRUE / FALSE / NULL   (for AND,  OR,  NOT:  NULL means "we don't know").
function logic(v) {
    return v === null ? null : truthy(v);
}

//  COMPARE 2 values  (neither is NULL):   -1  (a is smaller),   0  (the same),   1  (a is bigger).
//  A number and words that ARE a number  ('42')  compare as numbers.
//  Otherwise,  every number comes before any words  (like SQLite).
function compareValues(a, b) {
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    if (typeof a === 'number') {
        if (typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
        if (NUMBER_WORDS.test(b)) { const nb = Number(b); return a < nb ? -1 : a > nb ? 1 : 0; }
        return -1;
    }
    if (typeof b === 'number') {
        if (NUMBER_WORDS.test(a)) { const na = Number(a); return na < b ? -1 : na > b ? 1 : 0; }
        return 1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
}

//  The order for SORTING  (ORDER BY,  MIN,  MAX):   numbers first  (small to big),  then words  (A to Z).
//  (Strict:  '10' is words here,  so it sorts with the words.  That's what SQLite does.)
function sortValues(a, b) {
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    const an = typeof a === 'number', bn = typeof b === 'number';
    if (an && bn) return a < b ? -1 : a > b ? 1 : 0;
    if (an) return -1;
    if (bn) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
}

//  A value as a KEY  (to spot "the same value" fast:  GROUP BY,  DISTINCT,  UNION).
//  1  and  1.0  are the same key.   1  and  '1'  are not  (a number isn't words).
const KEY_NULL = String.fromCharCode(0) + 'N';
const KEY_SPLIT = String.fromCharCode(1);

function keyOf(v) {
    if (v === null) return KEY_NULL;
    if (typeof v === 'number') return 'n' + (v === 0 ? 0 : v);
    if (typeof v === 'boolean') return v ? 'n1' : 'n0';
    return 's' + v;
}

function rowKey(row, count) {
    let key = '';
    for (let j = 0; j < count; j++) key += keyOf(row[j]) + KEY_SPLIT;
    return key;
}

//  A JOIN / IN key:  like keyOf,  but words that ARE a number match the number  ('7'  =  7),
//  unless both sides are words  (then  '007'  and  '7'  stay different,  like SQLite).
function matchKey(v, wordsOnly) {
    if (v === null) return null;
    if (typeof v === 'string' && !wordsOnly && NUMBER_WORDS.test(v)) return 'n' + (Number(v) === 0 ? 0 : Number(v));
    return keyOf(v);
}

function isWordsType(ty) {
    return ty === 'text' || ty === 'date' || ty === 'timestamp';
}

//  When 2 parts of the answer can have different types  (CASE ... THEN 1 ELSE 2.5),  what's the column's type?
function mergeTypes(a, b) {
    if (a === b) return a;
    if (a === 'null') return b;
    if (b === 'null') return a;
    const numbers = ['int', 'real', 'num'];
    if (numbers.indexOf(a) !== -1 && numbers.indexOf(b) !== -1) return a === 'real' || b === 'real' ? 'real' : 'num';
    if (isWordsType(a) && isWordsType(b)) return 'text';
    return 'any';
}
```

| Code | Baby words |
|---|---|
| `valueText(2, 'real')` | `'2.0'`. A REAL number that's whole still shows its `.0` (like every database). |
| `numOf('12abc')` | `12`: the number at the START. `'abc'` is `0`. (SQLite's rule. A strict database would refuse.) |
| `compareValues` | `5` and `'5'` compare as numbers (a CSV keeps everything as words, so this matters a lot). |
| `sortValues` | For sorting: numbers first, then words. Strict: `'10'` sorts with the words. |
| `keyOf(v)` | A value as a short text "fingerprint": `n5`, `sAna`. Two values with the same key are the same value. Fast to look up. |
| `String.fromCharCode(1)` | An invisible letter that's never in real data: a safe glue between the keys of a row. |

> **Three answers: TRUE, FALSE, and NULL.** `logic()` keeps the "unknown". `TRUE AND NULL` is NULL (we don't know), but `FALSE AND NULL` is FALSE (one false is enough). `WHERE` only keeps rows where it's really TRUE.

<br>

### Step 10.6: Dates

Dates are words: `2024-03-15` (or `2024-03-15 09:30:00`). Written that way, sorting the words sorts the dates, so most questions need nothing special. For date MATH, the words become a number (milliseconds since 1970, in UTC so time zones never shift them), and back:

```js
const DATE_WORDS = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?\s*$/i;
const DAY_MS = 86400000;

//  Words  ->  milliseconds   (null if they aren't a date).
//  (The same date shows up again and again in a big file,  so each one is only worked out once:
//   they're remembered,  up to 100,000 of them.)
const knownDates = new Map();

function dateMs(v) {
    if (v === null) return null;
    if (typeof v === 'number') return Math.round((v - 2440587.5) * DAY_MS);         //  a "Julian day" number  (SQLite)
    const s = String(v);
    if (s.length === 3 && s.toLowerCase() === 'now') return nowMs();
    let ms = knownDates.get(s);
    if (ms === undefined) {
        ms = readDate(s);
        if (knownDates.size >= 100000) knownDates.clear();
        knownDates.set(s, ms);
    }
    return ms;
}

function readDate(s) {
    const m = DATE_WORDS.exec(s);
    if (m === null) return null;
    const year = +m[1], month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const ms = utc(year, month - 1, day, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), m[7] ? Math.round(Number(m[7]) * 1000) : 0);
    return ms;
}

//  Date.UTC,  but years 0 to 99 stay years 0 to 99  (Date.UTC turns  45  into 1945).
function utc(y, mo, d, h, mi, s, ms) {
    const t = Date.UTC(y, mo, d === undefined ? 1 : d, h || 0, mi || 0, s || 0, ms || 0);
    if (y >= 0 && y < 100) {
        const x = new Date(t);
        x.setUTCFullYear(x.getUTCFullYear() - 1900);
        return x.getTime();
    }
    return t;
}

//  The clock right now,  as if it were UTC  (so  CURRENT_DATE  is YOUR date,  not London's).
function nowMs() {
    const d = new Date();
    return d.getTime() - d.getTimezoneOffset() * 60000;
}

function pad(n, width) {
    let s = String(Math.abs(n));
    while (s.length < width) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
}

function dateText(ms) {
    if (ms === null) return null;
    const d = new Date(ms);
    return pad(d.getUTCFullYear(), 4) + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2);
}

function dateTimeText(ms) {
    if (ms === null) return null;
    const d = new Date(ms);
    return dateText(ms) + ' ' + pad(d.getUTCHours(), 2) + ':' + pad(d.getUTCMinutes(), 2) + ':' + pad(d.getUTCSeconds(), 2);
}

//  Does it have a time part?   ('2024-03-15'  no,   '2024-03-15 09:30'  yes)
function hasTime(v) {
    return typeof v === 'string' && /\d[T ]\d/.test(v);
}

//  SQLite's date "modifiers":   date(d, '+1 month', 'start of month')
function shiftDate(ms, modifier) {
    if (ms === null || modifier === null) return null;
    const m = String(modifier).trim().toLowerCase();
    const d = new Date(ms);
    let y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
    let h = d.getUTCHours(), mi = d.getUTCMinutes(), s = d.getUTCSeconds(), milli = d.getUTCMilliseconds();

    const move = /^([+-]?\d+(?:\.\d+)?)\s+(year|month|day|hour|minute|second)s?$/.exec(m);
    if (move !== null) {
        const n = Number(move[1]);
        switch (move[2]) {
            case 'year':   y += n; break;
            case 'month':  mo += n; break;
            case 'day':    return ms + n * DAY_MS;
            case 'hour':   return ms + n * 3600000;
            case 'minute': return ms + n * 60000;
            case 'second': return ms + n * 1000;
        }
        return utc(y, mo, day, h, mi, s, milli);
    }
    if (m === 'start of month') return utc(y, mo, 1);
    if (m === 'start of year')  return utc(y, 0, 1);
    if (m === 'start of day')   return utc(y, mo, day);
    const weekday = /^weekday\s+([0-6])$/.exec(m);
    if (weekday !== null) {
        const want = Number(weekday[1]);
        const have = d.getUTCDay();
        return ms + ((want - have + 7) % 7) * DAY_MS;
    }
    if (m === 'localtime' || m === 'utc') return ms;
    return null;
}

//  Apply every modifier  (any one that doesn't make sense  ->  NULL).
function datePlus(args) {
    let ms = dateMs(args[0]);
    for (let k = 1; k < args.length && ms !== null; k++) ms = shiftDate(ms, args[k]);
    return ms;
}

//  STRFTIME('%Y-%m', d)   (SQLite's way of writing a date any way you like)
//  (The common ones get a quick path:  no Date,  just pieces of the words.)
function formatDate(format, ms) {
    if (format === null || ms === null) return null;
    if (format === '%Y' || format === '%Y-%m' || format === '%Y-%m-%d') {
        const day = dateText(ms);
        return format === '%Y' ? day.slice(0, 4) : format === '%Y-%m' ? day.slice(0, 7) : day;
    }
    const d = new Date(ms);
    const startOfYear = utc(d.getUTCFullYear(), 0, 1);
    return String(format).replace(/%([a-zA-Z%])/g, function (all, letter) {
        switch (letter) {
            case 'Y': return pad(d.getUTCFullYear(), 4);
            case 'm': return pad(d.getUTCMonth() + 1, 2);
            case 'd': return pad(d.getUTCDate(), 2);
            case 'H': return pad(d.getUTCHours(), 2);
            case 'M': return pad(d.getUTCMinutes(), 2);
            case 'S': return pad(d.getUTCSeconds(), 2);
            case 'f': return pad(d.getUTCSeconds(), 2) + '.' + pad(d.getUTCMilliseconds(), 3);
            case 'j': return pad(Math.floor((ms - startOfYear) / DAY_MS) + 1, 3);
            case 'w': return String(d.getUTCDay());
            case 'u': return String(d.getUTCDay() || 7);
            case 's': return String(Math.floor(ms / 1000));
            case 'J': return numberText(ms / DAY_MS + 2440587.5);
            case '%': return '%';
            default:  return all;
        }
    });
}

//  One part of a date:   year,  month,  day,  hour,  minute,  second,  quarter,  dow (0 = Sunday),  doy,  week,  epoch
function datePart(part, ms) {
    if (part === null || ms === null) return null;
    const d = new Date(ms);
    switch (String(part).toLowerCase().replace(/s$/, '')) {
        case 'year': case 'yy': case 'yyyy': return d.getUTCFullYear();
        case 'quarter': case 'qq': case 'q': return Math.floor(d.getUTCMonth() / 3) + 1;
        case 'month': case 'mm': case 'm': return d.getUTCMonth() + 1;
        case 'day': case 'dd': case 'd': return d.getUTCDate();
        case 'hour': case 'hh': return d.getUTCHours();
        case 'minute': case 'mi': case 'n': return d.getUTCMinutes();
        case 'second': case 'ss': return d.getUTCSeconds();
        case 'dow': case 'weekday': case 'dw': return d.getUTCDay();
        case 'isodow': return d.getUTCDay() || 7;
        case 'doy': case 'dayofyear': case 'dy': return Math.floor((ms - utc(d.getUTCFullYear(), 0, 1)) / DAY_MS) + 1;
        case 'week': case 'wk': case 'ww': return isoWeek(ms);
        case 'epoch': return Math.floor(ms / 1000);
        default: queryFail('I don\'t know the date part  ' + part + '.  Try:  year,  quarter,  month,  day,  hour,  minute,  second,  dow,  doy,  week.');
    }
}

function isoWeek(ms) {
    const d = new Date(ms);
    const dayNum = d.getUTCDay() || 7;
    const thursday = utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - dayNum);
    const yearStart = utc(new Date(thursday).getUTCFullYear(), 0, 1);
    return Math.ceil(((thursday - yearStart) / DAY_MS + 1) / 7);
}

//  DATE_TRUNC('month', d)   ->   the first moment of that month
function truncateDate(part, ms) {
    if (part === null || ms === null) return null;
    const d = new Date(ms);
    const y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
    switch (String(part).toLowerCase().replace(/s$/, '')) {
        case 'year':    return utc(y, 0, 1);
        case 'quarter': return utc(y, mo - mo % 3, 1);
        case 'month':   return utc(y, mo, 1);
        case 'week':    return utc(y, mo, day - ((d.getUTCDay() + 6) % 7));       //  weeks start on Monday
        case 'day':     return utc(y, mo, day);
        case 'hour':    return utc(y, mo, day, d.getUTCHours());
        case 'minute':  return utc(y, mo, day, d.getUTCHours(), d.getUTCMinutes());
        case 'second':  return utc(y, mo, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
        default: queryFail('I don\'t know how to cut a date to  ' + part + '.  Try:  year,  quarter,  month,  week,  day,  hour,  minute.');
    }
}

//  DATEDIFF(day, start, end):   how many day  (or month,  year ...)  lines you cross going from start to end.
function dateDiff(part, a, b) {
    if (part === null || a === null || b === null) return null;
    const unit = String(part).toLowerCase().replace(/s$/, '');
    const da = new Date(a), db = new Date(b);
    switch (unit) {
        case 'year': case 'yy': case 'yyyy': return db.getUTCFullYear() - da.getUTCFullYear();
        case 'quarter': case 'qq': return (db.getUTCFullYear() * 4 + Math.floor(db.getUTCMonth() / 3)) - (da.getUTCFullYear() * 4 + Math.floor(da.getUTCMonth() / 3));
        case 'month': case 'mm': return (db.getUTCFullYear() * 12 + db.getUTCMonth()) - (da.getUTCFullYear() * 12 + da.getUTCMonth());
        case 'week': case 'wk': return Math.floor((truncateDate('week', b) - truncateDate('week', a)) / (7 * DAY_MS));
        case 'day': case 'dd': case 'd': return Math.round((truncateDate('day', b) - truncateDate('day', a)) / DAY_MS);
        case 'hour': case 'hh': return Math.round((truncateDate('hour', b) - truncateDate('hour', a)) / 3600000);
        case 'minute': case 'mi': return Math.round((truncateDate('minute', b) - truncateDate('minute', a)) / 60000);
        case 'second': case 'ss': return Math.round((truncateDate('second', b) - truncateDate('second', a)) / 1000);
        default: queryFail('I don\'t know the date part  ' + part + '.  Try:  year,  quarter,  month,  week,  day,  hour,  minute,  second.');
    }
}

//  DATEADD(month, 3, d)
function dateAdd(part, amount, ms) {
    if (part === null || amount === null || ms === null) return null;
    const unit = String(part).toLowerCase().replace(/s$/, '');
    const names = { yy: 'year', yyyy: 'year', mm: 'month', m: 'month', dd: 'day', d: 'day', hh: 'hour', mi: 'minute', ss: 'second', wk: 'week', week: 'week', qq: 'quarter', quarter: 'quarter' };
    const u = names[unit] || unit;
    const n = numOf(amount);
    if (u === 'week') return ms + n * 7 * DAY_MS;
    if (u === 'quarter') return shiftDate(ms, (n * 3) + ' months');
    return shiftDate(ms, n + ' ' + u);
}

//  A date as words again:  with its time,  if it had one  (or it's not midnight).
function dateBack(ms, withTime) {
    if (ms === null) return null;
    return withTime || ms % DAY_MS !== 0 ? dateTimeText(ms) : dateText(ms);
}
```

| Code | Baby words |
|---|---|
| `knownDates` | A big file has the same date again and again. Each one is worked out ONCE, then remembered (up to 100,000). |
| `utc(y, mo, d, ...)` | `Date.UTC`, fixed for the years 0 to 99 (`Date.UTC` would turn the year 45 into 1945). |
| `date(d, '+1 month')` | SQLite's "modifiers": `'+1 month'`, `'-10 days'`, `'start of month'`, `'weekday 1'`... |
| `strftime('%Y-%m', d)` | Write a date any way you like: `%Y` year, `%m` month, `%d` day, `%H:%M` time, `%w` weekday (0 = Sunday). |
| `DATEDIFF(day, a, b)` | SQL Server's: how many day lines you CROSS from a to b. (11 PM to 1 AM the next day: 1 day.) |
| `DATE_TRUNC('month', d)` | Cut a date down to its month: `2024-03-15` -> `2024-03-01`. Great for "per month" reports. |

<br>

### Step 10.7: Functions

The functions that work on ONE row at a time. Each one says how many values it takes, what type it gives back, and what it does:

```js
function sameAsFirst(types) { return types[0] === 'null' ? 'any' : types[0]; }
function numberLike(types)  { return types[0] === 'int' ? 'int' : types[0] === 'real' ? 'real' : 'num'; }
function anyOf(types)       { return types.reduce(mergeTypes, 'null'); }

//  SQLite's  substr:   start counts from 1  (or from the END,  if it's below 0).
function substring(s, start, length) {
    const chars = /[\uD800-\uDFFF]/.test(s) ? Array.from(s) : null;
    const len = chars !== null ? chars.length : s.length;
    let p1 = Math.trunc(start);
    let p2 = length === undefined ? len + 1 : Math.trunc(length);
    if (p1 < 0) {
        p1 += len;
        if (p1 < 0) { p2 += p1; p1 = 0; }
    } else if (p1 > 0) {
        p1--;
    } else if (p2 > 0) {
        p2--;
    }
    if (p2 < 0) {
        p1 += p2;
        p2 = -p2;
        if (p1 < 0) { p2 += p1; p1 = 0; }
    }
    if (p2 <= 0) return '';
    return chars !== null ? chars.slice(p1, p1 + p2).join('') : s.substr(p1, p2);
}

function trimChars(s, chars, left, right) {
    const set = chars === undefined ? ' ' : chars;
    let a = 0, b = s.length;
    if (left)  while (a < b && set.indexOf(s[a]) !== -1) a++;
    if (right) while (b > a && set.indexOf(s[b - 1]) !== -1) b--;
    return s.slice(a, b);
}

//  Round half AWAY from zero  (2.5  ->  3,   -2.5  ->  -3),  like SQLite.
function roundTo(x, digits) {
    const d = Math.max(0, Math.min(15, Math.trunc(digits || 0)));
    //  (Like SQLite,  1.005 rounds to 1.0:  the computer really holds  1.00499999...,  just under the half.)
    //  (toFixed works on the EXACT value the computer holds:  2.5 is really 2.5,  so it goes up to 3.)
    return Math.abs(x) >= 1e21 ? x : Math.sign(x) * Number(Math.abs(x).toFixed(d));
}

const QUERY_FUNCTIONS = {

    //  ---- words ----
    UPPER:       { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toUpperCase(); } },
    LOWER:       { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toLowerCase(); } },
    UCASE:       { alias: 'UPPER' },
    LCASE:       { alias: 'LOWER' },
    LENGTH:      { args: [1, 1], ty: 'int',  f: function (s) { const t = valueText(s); return /[\uD800-\uDFFF]/.test(t) ? Array.from(t).length : t.length; } },
    LEN:         { alias: 'LENGTH' },
    CHAR_LENGTH: { alias: 'LENGTH' },
    CHARACTER_LENGTH: { alias: 'LENGTH' },
    SUBSTR:      { args: [2, 3], ty: 'text', f: function (s, start, length) { return substring(valueText(s), numOf(start), length === undefined ? undefined : numOf(length)); } },
    SUBSTRING:   { alias: 'SUBSTR' },
    LEFT:        { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); const t = valueText(s); return k >= 0 ? t.slice(0, k) : t.slice(0, Math.max(0, t.length + k)); } },
    RIGHT:       { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); const t = valueText(s); return k >= 0 ? (k === 0 ? '' : t.slice(-k)) : t.slice(Math.min(t.length, -k)); } },
    TRIM:        { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), true, true); } },
    LTRIM:       { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), true, false); } },
    RTRIM:       { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), false, true); } },
    REPLACE:     { args: [3, 3], ty: 'text', f: function (s, from, to) { const f = valueText(from); return f === '' ? valueText(s) : valueText(s).split(f).join(valueText(to)); } },
    INSTR:       { args: [2, 2], ty: 'int',  f: function (s, find) { return valueText(s).indexOf(valueText(find)) + 1; } },
    STRPOS:      { alias: 'INSTR' },
    CHARINDEX:   { args: [2, 3], ty: 'int',  f: function (find, s, from) { return valueText(s).indexOf(valueText(find), from === undefined ? 0 : Math.max(0, numOf(from) - 1)) + 1; } },
    CONCAT:      { args: [1, -1], ty: 'text', keep: true, f: function () { let out = ''; for (let k = 0; k < arguments.length; k++) if (arguments[k] !== null) out += valueText(arguments[k]); return out; } },
    CONCAT_WS:   { args: [2, -1], ty: 'text', keep: true, f: function (sep) {
                     if (sep === null) return null;
                     const parts = [];
                     for (let k = 1; k < arguments.length; k++) if (arguments[k] !== null) parts.push(valueText(arguments[k]));
                     return parts.join(valueText(sep));
                 } },
    LPAD:        { args: [2, 3], ty: 'text', f: function (s, n, fill) { return padWords(valueText(s), numOf(n), fill === undefined ? ' ' : valueText(fill), true); } },
    RPAD:        { args: [2, 3], ty: 'text', f: function (s, n, fill) { return padWords(valueText(s), numOf(n), fill === undefined ? ' ' : valueText(fill), false); } },
    REVERSE:     { args: [1, 1], ty: 'text', f: function (s) { return Array.from(valueText(s)).reverse().join(''); } },
    REPEAT:      { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); return k > 0 ? valueText(s).repeat(Math.min(k, 1000000)) : ''; } },
    REPLICATE:   { alias: 'REPEAT' },
    SPLIT_PART:  { args: [3, 3], ty: 'text', f: function (s, sep, n) {
                     const parts = valueText(s).split(valueText(sep));
                     const k = Math.trunc(numOf(n));
                     const at = k > 0 ? k - 1 : parts.length + k;
                     return at >= 0 && at < parts.length ? parts[at] : '';
                 } },
    INITCAP:     { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toLowerCase().replace(/(^|[^A-Za-z0-9])([a-z])/g, function (all, before, letter) { return before + letter.toUpperCase(); }); } },
    CHAR:        { args: [1, -1], ty: 'text', f: function () { let out = ''; for (let k = 0; k < arguments.length; k++) out += String.fromCodePoint(Math.max(0, Math.min(0x10FFFF, numOf(arguments[k])))); return out; } },
    CHR:         { alias: 'CHAR' },
    UNICODE:     { args: [1, 1], ty: 'int', f: function (s) { const t = valueText(s); return t === '' ? null : t.codePointAt(0); } },
    ASCII:       { alias: 'UNICODE' },
    QUOTE:       { args: [1, 1], ty: 'text', keep: true, f: function (v) { return v === null ? 'NULL' : typeof v === 'string' ? "'" + v.split("'").join("''") + "'" : valueText(v); } },

    //  ---- numbers ----
    ABS:     { args: [1, 1], ty: numberLike, f: function (x) { return Math.abs(numOf(x)); } },
    ROUND:   { args: [1, 2], ty: 'real', f: function (x, d) { return roundTo(numOf(x), d === undefined ? 0 : numOf(d)); } },
    FLOOR:   { args: [1, 1], ty: numberLike, f: function (x) { return Math.floor(numOf(x)); } },
    CEIL:    { args: [1, 1], ty: numberLike, f: function (x) { return Math.ceil(numOf(x)); } },
    CEILING: { alias: 'CEIL' },
    TRUNC:   { args: [1, 2], ty: numberLike, f: function (x, d) { const s = Math.pow(10, d === undefined ? 0 : Math.trunc(numOf(d))); return Math.trunc(numOf(x) * s) / s; } },
    TRUNCATE: { alias: 'TRUNC' },
    SIGN:    { args: [1, 1], ty: 'int', f: function (x) { return Math.sign(numOf(x)); } },
    SQRT:    { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n < 0 ? null : Math.sqrt(n); } },
    POWER:   { args: [2, 2], ty: 'real', f: function (x, y) { return Math.pow(numOf(x), numOf(y)); } },
    POW:     { alias: 'POWER' },
    EXP:     { args: [1, 1], ty: 'real', f: function (x) { return Math.exp(numOf(x)); } },
    LN:      { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log(n); } },
    LOG10:   { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log10(n); } },
    LOG2:    { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log2(n); } },
    LOG:     { args: [1, 2], ty: 'real', f: function (a, b) {               //  LOG(x)  =  base 10   (SQLite,  PostgreSQL).   LOG(base, x).
                 if (b === undefined) { const n = numOf(a); return n <= 0 ? null : Math.log10(n); }
                 const base = numOf(a), n = numOf(b);
                 return n <= 0 || base <= 0 || base === 1 ? null : Math.log(n) / Math.log(base);
             } },
    MOD:     { args: [2, 2], ty: numberLike, f: function (x, y) { const b = numOf(y); return b === 0 ? null : numOf(x) % b; } },
    PI:      { args: [0, 0], ty: 'real', f: function () { return Math.PI; } },
    RANDOM:  { args: [0, 0], ty: 'real', f: function () { return Math.random(); } },
    RAND:    { alias: 'RANDOM' },
    SIN:     { args: [1, 1], ty: 'real', f: function (x) { return Math.sin(numOf(x)); } },
    COS:     { args: [1, 1], ty: 'real', f: function (x) { return Math.cos(numOf(x)); } },
    TAN:     { args: [1, 1], ty: 'real', f: function (x) { return Math.tan(numOf(x)); } },
    DEGREES: { args: [1, 1], ty: 'real', f: function (x) { return numOf(x) * 180 / Math.PI; } },
    RADIANS: { args: [1, 1], ty: 'real', f: function (x) { return numOf(x) * Math.PI / 180; } },

    //  ---- NULL helpers,  and choosing ----
    COALESCE: { args: [1, -1], ty: anyOf, keep: true, f: function () { for (let k = 0; k < arguments.length; k++) if (arguments[k] !== null) return arguments[k]; return null; } },
    IFNULL:   { args: [2, 2], ty: anyOf, keep: true, f: function (a, b) { return a !== null ? a : b; } },
    NVL:      { alias: 'IFNULL' },
    ISNULL:   { alias: 'IFNULL' },
    NULLIF:   { args: [2, 2], ty: sameAsFirst, keep: true, f: function (a, b) { return a !== null && b !== null && compareValues(a, b) === 0 ? null : a; } },
    IIF:      { args: [3, 3], ty: function (t) { return mergeTypes(t[1], t[2]); }, keep: true, f: function (c, a, b) { return truthy(c) ? a : b; } },
    IF:       { alias: 'IIF' },
    GREATEST: { args: [1, -1], ty: anyOf, keep: true, f: function () { let best = null; for (let k = 0; k < arguments.length; k++) { const v = arguments[k]; if (v !== null && (best === null || compareValues(v, best) > 0)) best = v; } return best; } },
    LEAST:    { args: [1, -1], ty: anyOf, keep: true, f: function () { let best = null; for (let k = 0; k < arguments.length; k++) { const v = arguments[k]; if (v !== null && (best === null || compareValues(v, best) < 0)) best = v; } return best; } },
    //  MIN(a, b) and MAX(a, b) with 2 or more values  (SQLite):  any NULL  ->  NULL.
    MIN_OF:   { args: [2, -1], ty: anyOf, f: function () { let best = arguments[0]; for (let k = 1; k < arguments.length; k++) if (sortValues(arguments[k], best) < 0) best = arguments[k]; return best; } },
    MAX_OF:   { args: [2, -1], ty: anyOf, f: function () { let best = arguments[0]; for (let k = 1; k < arguments.length; k++) if (sortValues(arguments[k], best) > 0) best = arguments[k]; return best; } },
    TYPEOF:   { args: [1, 1], ty: 'text', keep: true, f: function (v) { return v === null ? 'null' : typeof v === 'string' ? 'text' : typeof v === 'boolean' ? 'integer' : Number.isInteger(v) ? 'integer' : 'real'; } },

    //  ---- dates ----
    DATE:       { args: [1, -1], ty: 'date',      f: function () { return dateText(datePlus(Array.from(arguments))); } },
    DATETIME:   { args: [1, -1], ty: 'timestamp', f: function () { return dateTimeText(datePlus(Array.from(arguments))); } },
    TIME:       { args: [1, -1], ty: 'text',      f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : dateTimeText(ms).slice(11); } },
    JULIANDAY:  { args: [1, -1], ty: 'real',      f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : ms / DAY_MS + 2440587.5; } },
    UNIXEPOCH:  { args: [1, -1], ty: 'int',       f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : Math.floor(ms / 1000); } },
    STRFTIME:   { args: [2, -1], ty: 'text',      f: function (format) { return formatDate(format, datePlus(Array.from(arguments).slice(1))); } },
    YEAR:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('year', dateMs(d)); } },
    QUARTER:    { args: [1, 1], ty: 'int', f: function (d) { return datePart('quarter', dateMs(d)); } },
    MONTH:      { args: [1, 1], ty: 'int', f: function (d) { return datePart('month', dateMs(d)); } },
    DAY:        { args: [1, 1], ty: 'int', f: function (d) { return datePart('day', dateMs(d)); } },
    DAYOFMONTH: { alias: 'DAY' },
    HOUR:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('hour', dateMs(d)); } },
    MINUTE:     { args: [1, 1], ty: 'int', f: function (d) { return datePart('minute', dateMs(d)); } },
    SECOND:     { args: [1, 1], ty: 'int', f: function (d) { return datePart('second', dateMs(d)); } },
    DAYOFWEEK:  { args: [1, 1], ty: 'int', f: function (d) { const v = datePart('dow', dateMs(d)); return v === null ? null : v + 1; } },     //  MySQL:  1 = Sunday
    DAYOFYEAR:  { args: [1, 1], ty: 'int', f: function (d) { return datePart('doy', dateMs(d)); } },
    WEEK:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('week', dateMs(d)); } },
    EXTRACT:    { args: [2, 2], ty: 'int', f: function (part, d) { return datePart(part, dateMs(d)); } },
    DATE_PART:  { alias: 'EXTRACT' },
    DATEPART:   { alias: 'EXTRACT' },
    DATE_TRUNC: { args: [2, 2], ty: 'text', f: function (part, d) { return dateBack(truncateDate(part, dateMs(d)), hasTime(d)); } },
    DATEDIFF:   { args: [2, 3], ty: 'int', f: function (a, b, c) {
                    if (c === undefined) {                                      //  MySQL:   DATEDIFF(end, start)  =  days
                        const end = dateMs(a), start = dateMs(b);
                        return end === null || start === null ? null : dateDiff('day', start, end);
                    }
                    return dateDiff(a, dateMs(b), dateMs(c));                   //  SQL Server:   DATEDIFF(day, start, end)
                } },
    DATE_DIFF:  { alias: 'DATEDIFF' },
    DATEADD:    { args: [3, 3], ty: 'text', f: function (part, n, d) { return dateBack(dateAdd(part, n, dateMs(d)), hasTime(d)); } },
    DATE_ADD:   { alias: 'DATEADD' },
    LAST_DAY:   { args: [1, 1], ty: 'date', f: function (d) { const ms = dateMs(d); if (ms === null) return null; const x = new Date(ms); return dateText(utc(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)); } },
    EOMONTH:    { alias: 'LAST_DAY' },
    CURRENT_DATE:      { args: [0, 0], ty: 'date',      f: function () { return dateText(nowMs()); } },
    CURRENT_TIMESTAMP: { args: [0, 0], ty: 'timestamp', f: function () { return dateTimeText(nowMs()); } },
    CURRENT_TIME:      { args: [0, 0], ty: 'text',      f: function () { return dateTimeText(nowMs()).slice(11); } },
    NOW:               { alias: 'CURRENT_TIMESTAMP' },
    GETDATE:           { alias: 'CURRENT_TIMESTAMP' },
    TODAY:             { alias: 'CURRENT_DATE' },
};

//  Date-part words written WITHOUT quotes  (SQL Server:   DATEDIFF(day, a, b)):   day  is a word here,  not a column.
const DATE_PART_FIRST = new Set(['DATEDIFF', 'DATE_DIFF', 'DATEADD', 'DATE_ADD', 'DATEPART', 'DATE_PART', 'DATE_TRUNC']);

function padWords(s, n, fill, left) {
    const width = Math.trunc(n);
    if (width <= 0) return '';
    if (s.length >= width) return s.slice(0, width);
    if (fill === '') return s;
    let extra = '';
    while (extra.length < width - s.length) extra += fill;
    extra = extra.slice(0, width - s.length);
    return left ? extra + s : s + extra;
}

function findFunction(name) {
    let spec = QUERY_FUNCTIONS[name];
    if (spec !== undefined && spec.alias) spec = QUERY_FUNCTIONS[spec.alias];
    return spec;
}
```

> **Why do so many functions have 2 or 3 names?** Every database named them differently: `LENGTH` / `LEN`, `SUBSTR` / `SUBSTRING`, `IFNULL` / `NVL` / `ISNULL`, `NOW()` / `GETDATE()`. The `alias` lines mean whatever you're used to just works.

> **`keep: true`?** Most functions give NULL if any value going in is NULL (`UPPER(NULL)` is NULL). The ones with `keep` handle NULL themselves: that's the whole POINT of `COALESCE` (the first one that isn't NULL), and `CONCAT` skips NULLs instead.

<br>

### Step 10.8: Totals

A total ("aggregate") squashes MANY rows into one answer: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `MEDIAN`, `STRING_AGG`... Each one is 3 steps: start an empty tally, add one row at a time, read the answer. (Like counting votes: an empty sheet, a mark per vote, then count the marks.)

```js
function newSum() { return { sum: 0, lost: 0, n: 0, whole: true }; }
function addSum(s, x) {
    const t = s.sum + x;
    if (Math.abs(s.sum) >= Math.abs(x)) s.lost += (s.sum - t) + x;
    else s.lost += (x - t) + s.sum;
    s.sum = t;
    s.n++;
    if (!Number.isInteger(x)) s.whole = false;
}

function sortedNumbers(list) {
    return list.slice().sort(function (a, b) { return a - b; });
}

function percentile(list, p, continuous) {
    if (list.length === 0 || p === null) return null;
    const q = numOf(p);
    if (q < 0 || q > 1) queryFail('A percentile has to be between 0 and 1  (0.5 = the middle).');
    const s = sortedNumbers(list);
    if (!continuous) return s[Math.max(0, Math.ceil(q * s.length) - 1)];
    const at = q * (s.length - 1);
    const lo = Math.floor(at), hi = Math.ceil(at);
    return s[lo] + (s[hi] - s[lo]) * (at - lo);
}

function spread(t, sample, root) {         //  variance  /  standard deviation   (Welford's way:  one pass,  no big rounding errors)
    if (t.n === 0 || (sample && t.n < 2)) return null;
    const v = t.m2 / (sample ? t.n - 1 : t.n);
    return root ? Math.sqrt(v) : v;
}

const QUERY_TOTALS = {
    COUNT:  { ty: function () { return 'int'; },
              start: function () { return { n: 0 }; },
              add: function (t) { t.n++; },
              end: function (t) { return t.n; } },
    SUM:    { ty: numberLike,
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t, ty) { return t.n === 0 ? null : t.sum + t.lost; } },
    TOTAL:  { ty: function () { return 'real'; },
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t) { return t.sum + t.lost; } },
    AVG:    { ty: function () { return 'real'; },
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t) { return t.n === 0 ? null : (t.sum + t.lost) / t.n; } },
    MIN:    { ty: sameAsFirst,
              start: function () { return { v: null }; },
              add: function (t, x) { if (t.v === null || sortValues(x, t.v) < 0) t.v = x; },
              end: function (t) { return t.v; } },
    MAX:    { ty: sameAsFirst,
              start: function () { return { v: null }; },
              add: function (t, x) { if (t.v === null || sortValues(x, t.v) > 0) t.v = x; },
              end: function (t) { return t.v; } },
    GROUP_CONCAT: { ty: function () { return 'text'; },
              start: function () { return { parts: [] }; },
              add: function (t, x, sep, types) { t.parts.push(t.parts.length === 0 ? valueText(x, types[0]) : (sep === undefined ? ',' : sep === null ? '' : valueText(sep)) + valueText(x, types[0])); },
              end: function (t) { return t.parts.length === 0 ? null : t.parts.join(''); } },
    STRING_AGG: { alias: 'GROUP_CONCAT', needs: 2 },
    LISTAGG:    { alias: 'GROUP_CONCAT' },
    MEDIAN: { ty: function () { return 'real'; },
              start: function () { return { list: [] }; },
              add: function (t, x) { t.list.push(numOf(x)); },
              end: function (t) { return percentile(t.list, 0.5, true); } },
    PERCENTILE_CONT: { ty: function () { return 'real'; },
              start: function () { return { list: [], p: null }; },
              add: function (t, x, p) { t.list.push(numOf(x)); t.p = p; },
              end: function (t) { return percentile(t.list, t.p, true); } },
    PERCENTILE_DISC: { ty: sameAsFirst,
              start: function () { return { list: [], p: null }; },
              add: function (t, x, p) { t.list.push(numOf(x)); t.p = p; },
              end: function (t) { return percentile(t.list, t.p, false); } },
    VAR_SAMP:    { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, true, false); } },
    VAR_POP:     { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, false, false); } },
    STDDEV_SAMP: { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, true, true); } },
    STDDEV_POP:  { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, false, true); } },
    VARIANCE: { alias: 'VAR_SAMP' },
    VAR:      { alias: 'VAR_SAMP' },
    STDDEV:   { alias: 'STDDEV_SAMP' },
    STDEV:    { alias: 'STDDEV_SAMP' },
    STDEVP:   { alias: 'STDDEV_POP' },
    ANY_VALUE: { ty: sameAsFirst,
              start: function () { return { v: null, seen: false }; },
              add: function (t, x) { if (!t.seen) { t.v = x; t.seen = true; } },
              end: function (t) { return t.v; } },
    BOOL_AND: { ty: function () { return 'bool'; },
              start: function () { return { v: null }; },
              add: function (t, x) { t.v = (t.v === null ? true : t.v) && truthy(x); },
              end: function (t) { return t.v; } },
    BOOL_OR:  { ty: function () { return 'bool'; },
              start: function () { return { v: null }; },
              add: function (t, x) { t.v = (t.v === null ? false : t.v) || truthy(x); },
              end: function (t) { return t.v; } },
    EVERY:    { alias: 'BOOL_AND' },
    MODE:     { ty: sameAsFirst,
              start: function () { return { counts: new Map(), best: null, bestN: 0 }; },
              add: function (t, x) {
                  const k = keyOf(x);
                  const n = (t.counts.get(k) || 0) + 1;
                  t.counts.set(k, n);
                  if (n > t.bestN) { t.bestN = n; t.best = x; }
              },
              end: function (t) { return t.best; } },
};

function welford(t, x) {
    const v = numOf(x);
    t.n++;
    const d = v - t.mean;
    t.mean += d / t.n;
    t.m2 += d * (v - t.mean);
}

//  The window-only functions:  they need the rows IN ORDER,  so they only work with OVER (...).
const WINDOW_ONLY = new Set(['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PERCENT_RANK', 'CUME_DIST', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE']);

function findTotal(name) {
    let spec = QUERY_TOTALS[name];
    if (spec !== undefined && spec.alias) spec = Object.assign({}, QUERY_TOTALS[spec.alias], { needs: spec.needs });
    return spec;
}

//  Is this function call a TOTAL?   (MIN(a, b) with 2 values isn't:  that's "the smaller one".)
function isTotal(node) {
    if (node.t !== 'fn' || node.over !== null) return false;
    if ((node.name === 'MIN' || node.name === 'MAX') && node.args.length > 1) return false;
    return findTotal(node.name) !== undefined;
}

function isWindow(node) {
    return node.t === 'fn' && node.over !== null;
}
```

| Code | Baby words |
|---|---|
| `addSum` ("Neumaier summation") | Adding 0.1 a million times on a computer slowly drifts (0.1 isn't exact in binary). This keeps the tiny bits that fall off, and adds them back at the end. |
| `welford` | Standard deviation in ONE pass, without huge numbers that lose their precision. |
| `PERCENTILE_CONT(0.25)` | The value a quarter of the way up. `MEDIAN` is `0.5`: the middle. |
| `WINDOW_ONLY` | Functions that only make sense with `OVER (...)`: `ROW_NUMBER()` needs to know the order. |

<br>

### Step 10.9: The tables

The brain hands the engine its tables (Step 10.15). Each column's TYPE is worked out by looking at its cells: all whole numbers -> `int`, numbers -> `real`, dates -> `date`... A huge file? 20,000 rows spread through it are enough (and runQuery looks at them in bites, before the question runs):

```js
const CELL_INT  = /^[+-]?(0|[1-9]\d{0,14})$/;
const CELL_REAL = /^[+-]?((0|[1-9]\d*)(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const CELL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CELL_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const SAMPLE_ROWS = 20000;
const BITE_CELLS  = 16384;      //  a long job takes a breath every 1,024 rows,  OR after this many CELLS,  whichever comes first
                                //  (1,024 rows of a 10,000-column file is 10 million cells:  seconds,  not a bite)

function columnKinds(table) {
    if (!table.kinds) runNow(lookAtKinds(table));
    return table.kinds;
}

//  The looking itself:  a generator  (see RUN),  so runQuery can do it in bites before a question
//  (20,000 rows of a wide file,  all at once,  would stop the page for a moment).
function* lookAtKinds(table) {

    if (table.kinds) return;

    const width = table.columns.length;

    if (table.declared) {
        table.kinds = table.columns.map(function (name, j) {
            const declared = table.declared[j];
            return declared ? typeClass(declared) : 'text';
        });
        return;
    }

    const canInt = new Array(width).fill(true);
    const canReal = new Array(width).fill(true);
    const canDate = new Array(width).fill(true);
    const canTime = new Array(width).fill(true);
    const anything = new Array(width).fill(false);

    const n = table.rowCount;
    const look = Math.min(n, SAMPLE_ROWS);
    const step = n / look;

    let work = 0;                   //  cells looked at since the last breath
    for (let s = 0; s < look; s++) {
        work += width;
        if ((s & 511) === 511 || work >= BITE_CELLS) { work = 0; yield; }
        const cells = table.row(Math.floor(s * step));
        for (let j = 0; j < width && j < cells.length; j++) {
            const v = cells[j];
            if (v === '') continue;
            anything[j] = true;
            if (canInt[j] && !CELL_INT.test(v)) canInt[j] = false;
            if (canReal[j] && !CELL_REAL.test(v)) canReal[j] = false;
            if (canDate[j] && !CELL_DATE.test(v)) canDate[j] = false;
            if (canTime[j] && !CELL_TIME.test(v) && !CELL_DATE.test(v)) canTime[j] = false;
        }
    }

    table.kinds = canInt.map(function (x, j) {
        if (!anything[j]) return 'text';
        if (canInt[j]) return 'int';
        if (canReal[j]) return 'real';
        if (canDate[j]) return 'date';
        if (canTime[j]) return 'timestamp';
        return 'text';
    });
}

//  Column names a query can use:   an empty name  ->  column1, column2 ...     the same name twice  ->  name_2
function columnNames(table) {
    if (table.names) return table.names;
    const seen = new Map();
    table.names = table.columns.map(function (name, j) {
        let n = String(name).trim() === '' ? 'column' + (j + 1) : String(name);
        const key = n.toLowerCase();
        const times = (seen.get(key) || 0) + 1;
        seen.set(key, times);
        if (times > 1) n = n + '_' + times;
        return n;
    });
    return table.names;
}
```

> **Why isn't `007` a number?** A leading zero means it's a CODE (a zip code, an ID), not an amount. As a number it would become `7`, and lose its zeros. So a column with `007` in it stays words.

> **Why `BITE_CELLS`?** Long jobs take a breath (let the page draw) every so many ROWS. But a row of a 10,000-column file is 10,000 cells: 1,024 of those rows is 10 million cells, and the page froze for seconds between breaths. So a job also takes a breath after about 16,000 CELLS, whichever comes first. A 10-column file breathes just like before.

<br>

### Step 10.10: Compile

Every expression becomes a function: `f(row, env)` -> its value for that row. To build them, the engine needs a **scope**: the list of columns, in the row's order ("name is spot 0, age is spot 1").

**Finding a column** (looking outward: this query first, then the queries around it, for a subquery that looks outside itself), and the "fingerprint" that tells if 2 pieces of a tree mean the same thing:

```js
function newCol(name, table, ty) {
    return { name: name, key: String(name).toLowerCase(), table: table, tkey: table === null ? null : String(table).toLowerCase(), ty: ty, used: false, hidden: false };
}

//  Find a column in ONE scope.   -1  =  not here.
function findCol(scope, ref) {
    const key  = String(ref.name).toLowerCase();
    const tkey = ref.table === null ? null : String(ref.table).toLowerCase();
    let found = -1;
    for (let j = 0; j < scope.cols.length; j++) {
        const c = scope.cols[j];
        if (c.key !== key) continue;
        if (tkey !== null ? c.tkey !== tkey : c.hidden) continue;
        if (found !== -1) {
            queryFail('The column  ' + ref.name + '  is in more than one table here.  Say which one,  like:   ' +
                      (scope.cols[found].table || 't1') + '.' + ref.name + '   or   ' + (c.table || 't2') + '.' + ref.name);
        }
        found = j;
    }
    return found;
}

//  Find a column,  looking OUTWARD:  this query first,  then the queries around it.
//  depth  =  how many queries out it was found  (0 = this one).
function resolveColumn(scope, ref, quiet) {

    let depth = 0;
    const crossed = [];

    for (let sc = scope; sc !== null; sc = sc.parent, depth++) {

        //  After GROUP BY:  only group keys can be used as they are.
        if (sc.grouped) {
            const j = findCol(sc.grouped, ref);
            if (j !== -1) {
                if (sc.groupSlot.has(j)) return found(sc, sc.groupSlot.get(j), sc.groupTypes[sc.groupSlot.get(j)], depth, sc.grouped.cols[j].name);
                if (quiet) return null;
                queryFail('The column  ' + ref.name + '  has to be in GROUP BY,  or inside a total  (like  MAX(' + ref.name + ')  or  COUNT(' + ref.name + ')).');
            }
        } else {
            const j = findCol(sc, ref);
            if (j !== -1) {
                if (!quiet) sc.cols[j].used = true;
                return found(sc, j, sc.cols[j].ty, depth, sc.cols[j].name);
            }
        }
        if (sc.owner) crossed.push(sc.owner);
    }

    if (quiet) return null;
    const near = scope.grouped ? scope.grouped : scope;
    const names = near.cols.filter(function (c) { return !c.hidden; }).map(function (c) { return c.name; });
    queryFail('There\'s no column named  ' + (ref.table ? ref.table + '.' : '') + ref.name + '.' +
              (names.length > 0 ? '  The columns are:  ' + names.slice(0, 30).join(',  ') + (names.length > 30 ? ' ...' : '') : ''));

    function found(sc, idx, ty, d, name) {
        //  Found it OUTSIDE the query it was written in?  Then that query (and every one in between)
        //  depends on the outside row:  it's "correlated",  and has to run again for every outside row.
        if (!quiet) for (let k = 0; k < crossed.length; k++) markCorrelated(crossed[k], sc.owner);
        return { depth: d, idx: idx, ty: ty, name: name };
    }
}

//  (Up to the query the column was found in:  that one doesn't depend on anything outside.)
function markCorrelated(owner, stop) {
    for (let o = owner; o !== null && o !== undefined && o !== stop; o = o.enclosing) o.correlated = true;
}

//  A tree's "nodePrint":  2 trees that mean the same thing get the same one.
//  (That's how  SELECT YEAR(d) ... GROUP BY YEAR(d)  knows the 2 are the same group key.)
function nodePrint(node, scope) {
    if (node === null || typeof node !== 'object') return JSON.stringify(node === undefined ? null : node);
    if (Array.isArray(node)) {
        let out = '[';
        for (let k = 0; k < node.length; k++) {
            const f = nodePrint(node[k], scope);
            if (f === null) return null;
            out += f + ',';
        }
        return out + ']';
    }
    if (node.t === 'col') {
        const r = resolveColumn(scope, node, true);
        return r === null ? null : 'c' + r.depth + '.' + r.idx;
    }
    if (node.t === 'ref') return 'c0.' + node.idx;
    if (node.q !== undefined) return null;                          //  a subquery:  never "the same"
    let out = '{';
    for (const k in node) {
        if (k === 'label' || k === 'alias') continue;
        const f = nodePrint(node[k], scope);
        if (f === null) return null;
        out += k + ':' + f + ',';
    }
    return out + '}';
}
```

> **"Correlated"?** In `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`, the inside query uses `c.id`, from the OUTSIDE row. So it has to run again for every outside row. A subquery that DOESN'T look outside runs once, and its answer is remembered. `resolveColumn` notices which kind it is.

**Compiling one expression.** A big `switch`: one case per kind of node. Each builds its tiny function:

```js
//  ---- COMPILE ONE EXPRESSION ----
//  Gives back  { f, ty }:   f(row, env)  ->  the value,   ty  =  its type  ('int', 'real', 'num', 'text', 'date', 'timestamp', 'bool', 'null', 'any')

function cx(node, scope, ctx) {

    if (scope.match) {
        const m = scope.match(node);
        if (m !== null) return m;
    }

    switch (node.t) {

        case 'lit': {
            const v = node.v;
            return { f: function () { return v; }, ty: node.ty };
        }

        case 'col': {
            const r = resolveColumn(scope, node, false);
            return reader(r.depth, r.idx, r.ty);
        }

        case 'ref': {                                               //  a column found by its spot  (SELECT *)
            if (scope.grouped) {
                if (!scope.groupSlot.has(node.idx)) queryFail('SELECT *  can\'t be used with GROUP BY:  name the columns you want.');
                const slot = scope.groupSlot.get(node.idx);
                return reader(0, slot, scope.groupTypes[slot]);
            }
            scope.cols[node.idx].used = true;
            return reader(0, node.idx, scope.cols[node.idx].ty);
        }

        case 'neg': {
            const A = cx(node.e, scope, ctx);
            const a = A.f;
            return { f: function (row, env) { const v = a(row, env); return v === null ? null : -numOf(v); }, ty: numberLike([A.ty]) };
        }

        case 'bin':  return compileMath(node, scope, ctx);

        case 'cat': {
            const A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
            const a = A.f, b = B.f, ta = A.ty, tb = B.ty;
            return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                return x === null || y === null ? null : valueText(x, ta) + valueText(y, tb);
            }, ty: 'text' };
        }

        case 'cmp': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            const test = {
                '=':  function (c) { return c === 0; },
                '<>': function (c) { return c !== 0; },
                '<':  function (c) { return c < 0; },
                '<=': function (c) { return c <= 0; },
                '>':  function (c) { return c > 0; },
                '>=': function (c) { return c >= 0; },
            }[node.op];
            return { f: function (row, env) {
                const x = a(row, env);
                if (x === null) return null;
                const y = b(row, env);
                if (y === null) return null;
                return test(compareValues(x, y));
            }, ty: 'bool' };
        }

        case 'and': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            return { f: function (row, env) {
                const x = logic(a(row, env));
                if (x === false) return false;
                const y = logic(b(row, env));
                if (y === false) return false;
                return x === null || y === null ? null : true;
            }, ty: 'bool' };
        }

        case 'or': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            return { f: function (row, env) {
                const x = logic(a(row, env));
                if (x === true) return true;
                const y = logic(b(row, env));
                if (y === true) return true;
                return x === null || y === null ? null : false;
            }, ty: 'bool' };
        }

        case 'not': {
            const a = cx(node.e, scope, ctx).f;
            return { f: function (row, env) { const x = logic(a(row, env)); return x === null ? null : !x; }, ty: 'bool' };
        }

        case 'isnull': {
            const a = cx(node.e, scope, ctx).f, not = node.not;
            return { f: function (row, env) { return (a(row, env) === null) !== not; }, ty: 'bool' };
        }

        case 'isdist': {                                            //  a IS NOT DISTINCT FROM b:   like  =,  but NULL = NULL is TRUE
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f, not = node.not;
            return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                const same = x === null || y === null ? x === y : compareValues(x, y) === 0;
                return not ? same : !same;
            }, ty: 'bool' };
        }

        case 'istrue': {
            const a = cx(node.e, scope, ctx).f, want = node.v, not = node.not;
            return { f: function (row, env) { const x = logic(a(row, env)); return (x === want) !== not; }, ty: 'bool' };
        }

        case 'between': {
            const e = cx(node.e, scope, ctx).f, lo = cx(node.lo, scope, ctx).f, hi = cx(node.hi, scope, ctx).f, not = node.not;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                const l = lo(row, env), h = hi(row, env);
                const aboveLo = l === null ? null : compareValues(x, l) >= 0;
                const belowHi = h === null ? null : compareValues(x, h) <= 0;
                let inside;
                if (aboveLo === false || belowHi === false) inside = false;
                else if (aboveLo === null || belowHi === null) inside = null;
                else inside = true;
                return inside === null ? null : inside !== not;
            }, ty: 'bool' };
        }

        case 'in': {
            const e = cx(node.e, scope, ctx).f;
            const list = node.list.map(function (item) { return cx(item, scope, ctx).f; });
            const not = node.not;
            return { f: function (row, env) {
                if (list.length === 0) return not;
                const x = e(row, env);
                if (x === null) return null;
                let sawNull = false;
                for (let k = 0; k < list.length; k++) {
                    const y = list[k](row, env);
                    if (y === null) { sawNull = true; continue; }
                    if (compareValues(x, y) === 0) return !not;
                }
                return sawNull ? null : not;
            }, ty: 'bool' };
        }

        case 'insub': {
            const E = cx(node.e, scope, ctx);
            const e = E.f;
            const plan = compileQuery(node.q, scope, ctx);
            if (plan.cols.length !== 1) queryFail('The SELECT inside  IN (...)  has to give back exactly 1 column  (it gives ' + plan.cols.length + ').');
            const wordsOnly = isWordsType(E.ty) && isWordsType(plan.cols[0].ty);
            const not = node.not;
            let cached = null;
            function valuesFor(row, env) {
                if (cached !== null && !plan.owner.correlated) return cached;
                const rows = runNow(plan.run(inner(row, env), Infinity));
                const set = new Set();
                let sawNull = false;
                for (let k = 0; k < rows.length; k++) {
                    const key = matchKey(rows[k][0], wordsOnly);
                    if (key === null) sawNull = true; else set.add(key);
                }
                cached = { set: set, sawNull: sawNull };
                return cached;
            }
            return { f: function (row, env) {
                const x = e(row, env);
                const got = valuesFor(row, env);
                if (got.set.size === 0 && !got.sawNull) return not;
                if (x === null) return null;
                if (got.set.has(matchKey(x, wordsOnly))) return !not;
                return got.sawNull ? null : not;
            }, ty: 'bool' };
        }

        case 'exists': {
            const plan = compileQuery(node.q, scope, ctx);
            let cached = null;
            return { f: function (row, env) {
                if (cached !== null && !plan.owner.correlated) return cached;
                cached = runNow(plan.run(inner(row, env), 1)).length > 0;
                return cached;
            }, ty: 'bool' };
        }

        case 'scalar': {
            const plan = compileQuery(node.q, scope, ctx);
            if (plan.cols.length !== 1) queryFail('A  (SELECT ...)  used as one value has to give back exactly 1 column  (it gives ' + plan.cols.length + ').');
            let cached;
            let have = false;
            return { f: function (row, env) {
                if (have && !plan.owner.correlated) return cached;
                const rows = runNow(plan.run(inner(row, env), 1));
                cached = rows.length > 0 ? rows[0][0] : null;
                have = true;
                return cached;
            }, ty: plan.cols[0].ty };
        }

        case 'like': {
            const e = cx(node.e, scope, ctx).f;
            const P = node.pat, not = node.not;
            const esc = node.esc === null ? null : cx(node.esc, scope, ctx).f;
            //  The pattern never changes?  Build its matcher once.
            const fixed = P.t === 'lit' && (node.esc === null || node.esc.t === 'lit')
                ? (P.v === null ? null : likeMatcher(valueText(P.v), node.esc === null ? null : node.esc.v))
                : undefined;
            const pat = cx(P, scope, ctx).f;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                let m = fixed;
                if (m === undefined) {
                    const p = pat(row, env);
                    if (p === null) return null;
                    m = likeMatcher(valueText(p), esc === null ? null : esc(row, env));
                }
                if (m === null) return null;
                return m.test(valueText(x)) !== not;
            }, ty: 'bool' };
        }

        case 'case': {
            const base = node.base === null ? null : cx(node.base, scope, ctx).f;
            const whens = node.whens.map(function (w) { return [cx(w[0], scope, ctx).f, cx(w[1], scope, ctx)]; });
            const els = node.els === null ? null : cx(node.els, scope, ctx);
            let ty = els === null ? 'null' : els.ty;
            whens.forEach(function (w) { ty = mergeTypes(ty, w[1].ty); });
            const elsF = els === null ? null : els.f;
            return { f: function (row, env) {
                const b = base === null ? null : base(row, env);
                for (let k = 0; k < whens.length; k++) {
                    const w = whens[k][0](row, env);
                    const hit = base === null ? truthy(w) : (b !== null && w !== null && compareValues(b, w) === 0);
                    if (hit) return whens[k][1].f(row, env);
                }
                return elsF === null ? null : elsF(row, env);
            }, ty: ty };
        }

        case 'cast': {
            const A = cx(node.e, scope, ctx);
            const a = A.f, from = A.ty;
            const to = node.to;
            return { f: function (row, env) { return castValue(a(row, env), to, from); }, ty: to === 'num' ? 'num' : to };
        }

        case 'fn':  return compileFunction(node, scope, ctx);
    }

    queryFail('Something in this query isn\'t supported yet.');
}
```

| Code | Baby words |
|---|---|
| `scope.match(node)` | After `GROUP BY`, a row is `[key, key, total, total]`. "Is this piece exactly a group key or a total? Then just read its spot." |
| `case 'and'` | `FALSE AND anything` is FALSE without even looking at the other side. |
| `case 'insub'` | `x IN (SELECT ...)`: the answers go in a `Set` (instant "is it in there?"). |
| `case 'like'` | A pattern that never changes is turned into a matcher ONCE, not once per row. |

**Little helpers: reading a spot, math, CAST, LIKE:**

```js
//  A function that reads one spot of the row  (or of an outside row,  for a subquery).
function reader(depth, idx, ty) {
    if (depth === 0) return { f: function (row) { return row[idx]; }, ty: ty };
    const d = depth - 1;
    return { f: function (row, env) { return env.outer[d][idx]; }, ty: ty };
}

//  The env for a subquery run from this row:  this row becomes its nearest "outside row".
function inner(row, env) {
    return { outer: [row].concat(env.outer) };
}

//  + - * / %
function compileMath(node, scope, ctx) {
    const A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
    const a = A.f, b = B.f;
    const real = A.ty === 'real' || B.ty === 'real';
    const ty = A.ty === 'int' && B.ty === 'int' ? 'int' : real ? 'real' : 'num';
    switch (node.op) {
        case '+': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) + numOf(y); }, ty: ty };
        case '-': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) - numOf(y); }, ty: ty };
        case '*': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) * numOf(y); }, ty: ty };
        case '/': return { f: function (row, env) {
                //  Two WHOLE numbers  ->  a whole answer  (7 / 2 = 3,  like SQLite,  SQL Server,  PostgreSQL).   Dividing by 0  ->  NULL.
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = numOf(x), ny = numOf(y);
                if (ny === 0) return null;
                return !real && Number.isInteger(nx) && Number.isInteger(ny) ? Math.trunc(nx / ny) : nx / ny;
            }, ty: ty };
        case '%': return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = numOf(x), ny = numOf(y);
                if (ny === 0) return null;
                return nx % ny;
            }, ty: ty };
    }
}

//  CAST(x AS type)   (SQLite's rules:   CAST('12abc' AS INTEGER)  =  12,   CAST(3.9 AS INTEGER)  =  3)
function castValue(v, to, from) {
    if (v === null) return null;
    switch (to) {
        case 'int':  { const n = numOf(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }
        case 'real': return numOf(v);
        case 'num':  return numOf(v);
        case 'bool': return truthy(v);
        case 'date': return dateText(dateMs(v));
        case 'timestamp': return dateTimeText(dateMs(v));
        default:     return valueText(v, from);
    }
}

//  LIKE 'Chi%':   %  =  any letters,   _  =  one letter.   (Big and small letters count as the same,  like SQLite.)
function likeMatcher(pattern, escape) {
    const ANY  = /[\s\S]*/.source;
    const ONE  = /[\s\S]/.source;
    const esc  = escape === null || escape === undefined ? null : String(escape);
    let out = '^';
    for (let k = 0; k < pattern.length; k++) {
        const ch = pattern[k];
        if (esc !== null && ch === esc) {
            k++;
            if (k < pattern.length) out += regexLetter(pattern[k]);
            continue;
        }
        out += ch === '%' ? ANY : ch === '_' ? ONE : regexLetter(ch);
    }
    return new RegExp(out + '$', 'i');
}

function regexLetter(ch) {
    return /[.*+?^${}()|[\]\\\/-]/.test(ch) ? '\\' + ch : ch;
}
```

> **Why is `7 / 2` = `3`?** Two WHOLE numbers give a whole answer, in SQLite, SQL Server and PostgreSQL. Want `3.5`? Make one of them not whole: `7.0 / 2`, or `CAST(7 AS REAL) / 2`. (And dividing by 0 gives NULL, not a crash.)

**Functions, totals, and sorting keys:**

```js
//  ---- FUNCTIONS ----
function compileFunction(node, scope, ctx) {

    const name = node.name;

    if (isWindow(node)) queryFail(name + '(...) OVER (...)  can only be used in SELECT or ORDER BY.');
    if (WINDOW_ONLY.has(name)) queryFail(name + '()  needs  OVER (...)  after it,  like:   ' + name + '() OVER (ORDER BY price)');
    if (isTotal(node)) queryFail(name + '(...)  totals many rows,  so it can\'t be used here.  (Use it in SELECT or HAVING,  or inside a subquery.)');
    if (node.filter !== null) queryFail('FILTER (WHERE ...)  only works on totals,  like  COUNT(*) FILTER (WHERE ...).');

    let spec = (name === 'MIN' || name === 'MAX') ? QUERY_FUNCTIONS[name + '_OF'] : findFunction(name);
    if (spec === undefined) queryFail('I don\'t know the function  ' + name + '(...).');

    if (node.star) queryFail(name + '(*)  doesn\'t work:  only  COUNT(*)  takes a star.');
    const n = node.args.length;
    if (n < spec.args[0] || (spec.args[1] !== -1 && n > spec.args[1])) {
        const want = spec.args[0] === spec.args[1] ? String(spec.args[0]) : spec.args[1] === -1 ? spec.args[0] + ' or more' : spec.args[0] + ' to ' + spec.args[1];
        queryFail(name + '(...)  takes ' + want + ' value' + (want === '1' ? '' : 's') + ',  not ' + n + '.');
    }

    //  DATEDIFF(day, a, b):   the  day  is a word,  not a column.
    const args = node.args.map(function (arg, k) {
        if (k === 0 && DATE_PART_FIRST.has(name) && arg.t === 'col' && arg.table === null && resolveColumn(scope, arg, true) === null) {
            return { f: (function (word) { return function () { return word; }; })(arg.name.toLowerCase()), ty: 'text' };
        }
        return cx(arg, scope, ctx);
    });

    const fs = args.map(function (a) { return a.f; });
    const types = args.map(function (a) { return a.ty; });
    const ty = typeof spec.ty === 'function' ? spec.ty(types) : spec.ty;
    const go = spec.f, keep = spec.keep === true;

    //  The common sizes get their own fast versions.
    if (n === 0) return { f: function () { return go(); }, ty: ty };
    if (n === 1) {
        const a = fs[0];
        return { f: function (row, env) { const x = a(row, env); return x === null && !keep ? null : go(x); }, ty: ty };
    }
    if (n === 2) {
        const a = fs[0], b = fs[1];
        return { f: function (row, env) {
            const x = a(row, env), y = b(row, env);
            return !keep && (x === null || y === null) ? null : go(x, y);
        }, ty: ty };
    }
    if (n === 3) {
        const a = fs[0], b = fs[1], c = fs[2];
        return { f: function (row, env) {
            const x = a(row, env), y = b(row, env), z = c(row, env);
            return !keep && (x === null || y === null || z === null) ? null : go(x, y, z);
        }, ty: ty };
    }
    return { f: function (row, env) {
        const vals = new Array(n);
        for (let k = 0; k < n; k++) {
            vals[k] = fs[k](row, env);
            if (vals[k] === null && !keep) return null;
        }
        return go.apply(null, vals);
    }, ty: ty };
}


//  ---- A TOTAL  (COUNT,  SUM ...)  ----
//  Gives back  { ty,  start(),  add(tally, row, env),  end(tally) }
//  inWindow  =  it's a window's total  (SUM(...) OVER):  a total inside it is fine  (that's the group's total,  worked out first).
function compileTotal(node, scope, ctx, inWindow) {

    const name = node.name;
    const spec = findTotal(name);

    if (node.star && name !== 'COUNT') queryFail(name + '(*)  doesn\'t work:  only  COUNT(*)  takes a star.');

    let argNodes = node.args;
    if (node.within) {                                          //  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)   ->   (price, 0.5)
        if (node.order.length !== 1) queryFail('WITHIN GROUP (ORDER BY ...)  takes exactly 1 column.');
        argNodes = [node.order[0].e].concat(node.args);
    }

    if (!node.star) {
        const want = spec.needs || (name === 'PERCENTILE_CONT' || name === 'PERCENTILE_DISC' ? 2 : 1);
        const most = name === 'GROUP_CONCAT' || name === 'STRING_AGG' || name === 'LISTAGG' ? 2 : want;
        if (argNodes.length < want || argNodes.length > most) {
            queryFail(name + '(...)  takes ' + (want === most ? want : want + ' or ' + most) + ' value' + (most === 1 ? '' : 's') + ',  not ' + argNodes.length + '.');
        }
    }

    //  Inside a total,  another total doesn't make sense:   SUM(COUNT(x))
    if (!inWindow) argNodes.forEach(function (a) {
        walk(a, function (x) {
            if (isTotal(x)) queryFail('A total can\'t go inside another total  (like  SUM(COUNT(x))).  Try a subquery.');
            return x.q === undefined;
        });
    });

    const args = argNodes.map(function (a) { return cx(a, scope, ctx); });
    const fs = args.map(function (a) { return a.f; });
    const types = args.map(function (a) { return a.ty; });
    const filter = node.filter === null ? null : cx(node.filter, scope, ctx).f;
    const order = node.order !== null && !node.within
        ? node.order.map(function (o) { return { f: cx(o.e, scope, ctx).f, desc: o.desc, nulls: o.nulls }; })
        : null;
    const distinct = node.distinct;
    const star = node.star;
    const ty = spec.ty(types);
    const add = spec.add, end = spec.end;

    return {
        ty: ty,
        start: function () {
            const t = { t: spec.start(), seen: distinct ? new Set() : null, list: order !== null ? [] : null };
            return t;
        },
        add: function (tally, row, env) {
            if (filter !== null && !truthy(filter(row, env))) return;
            if (star) { tally.t.n++; return; }
            const x = fs[0](row, env);
            if (x === null) return;
            if (distinct) {
                const key = keyOf(x);
                if (tally.seen.has(key)) return;
                tally.seen.add(key);
            }
            const extra = fs.length > 1 ? fs[1](row, env) : undefined;
            if (order !== null) {
                tally.list.push([x, extra, order.map(function (o) { return o.f(row, env); })]);
                return;
            }
            add(tally.t, x, extra, types);
        },
        end: function (tally) {
            if (order !== null) {
                //  An ordered total  (STRING_AGG(name, ', ' ORDER BY name)):   sort what was collected,  then add it up in that order.
                const sorted = tally.list.slice().sort(function (p, q) { return compareKeys(p[2], q[2], order); });
                const t = spec.start();
                for (let k = 0; k < sorted.length; k++) add(t, sorted[k][0], sorted[k][1], types);
                return end(t, ty);
            }
            return end(tally.t, ty);
        },
    };
}

//  Visit every node in a tree.   visit(node)  returns false  =  don't look inside this one.
function walk(node, visit) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (let k = 0; k < node.length; k++) walk(node[k], visit); return; }
    if (node.t !== undefined && visit(node) === false) return;
    for (const k in node) {
        if (k === 'q') continue;                                    //  a subquery has its own totals
        const v = node[k];
        if (v !== null && typeof v === 'object') walk(v, visit);
    }
}

//  Compare 2 lists of sort keys,  by the ORDER BY's rules  (DESC,  NULLS FIRST / LAST).
//  NULLs come first going up  (ASC)  and last going down  (DESC),  like SQLite.
function compareKeys(a, b, order) {
    for (let k = 0; k < order.length; k++) {
        const c = compareOne(a[k], b[k], order[k]);
        if (c !== 0) return c;
    }
    return 0;
}

function compareOne(x, y, how) {
    if (x === null || y === null) {
        if (x === null && y === null) return 0;
        const nullsFirst = how.nulls === null ? !how.desc : how.nulls === 'first';
        return (x === null) === nullsFirst ? -1 : 1;
    }
    const c = sortValues(x, y);
    return how.desc ? -c : c;
}
```

> **`DATEDIFF(day, a, b)`**: SQL Server writes the `day` with NO quotes, so it looks like a column. If there's no column called `day`, it's treated as the word `'day'`.

<br>

### Step 10.11: Window functions

A total squashes rows into one. A **window function** doesn't: every row keeps its place, and gets a value worked out from the rows around it. `RANK() OVER (PARTITION BY dept ORDER BY salary DESC)` = "rank each person inside their own department". `SUM(qty) OVER (ORDER BY id)` = a running total:

```js
function compileWindow(node, scope, ctx) {

    const name = node.name;
    const over = node.over;

    const partition = (over.partition || []).map(function (e) { return cx(e, scope, ctx).f; });
    const order = (over.order || []).map(function (o) { return { f: cx(o.e, scope, ctx).f, desc: o.desc, nulls: o.nulls }; });

    let kind;
    if (WINDOW_ONLY.has(name)) kind = name;
    else if (findTotal(name) !== undefined && !((name === 'MIN' || name === 'MAX') && node.args.length > 1)) kind = 'TOTAL';
    else queryFail(name + '(...)  can\'t be used with OVER (...).');

    let total = null;
    let args = [];
    if (kind === 'TOTAL') {
        if (node.order !== null) queryFail('An ordered total  (... ORDER BY ...)  can\'t also have OVER (...).');
        total = compileTotal(Object.assign({}, node, { over: null }), scope, ctx, true);
    } else {
        args = node.args.map(function (a) { return cx(a, scope, ctx); });
        const wantArgs = { ROW_NUMBER: [0, 0], RANK: [0, 0], DENSE_RANK: [0, 0], PERCENT_RANK: [0, 0], CUME_DIST: [0, 0],
                           NTILE: [1, 1], LAG: [1, 3], LEAD: [1, 3], FIRST_VALUE: [1, 1], LAST_VALUE: [1, 1], NTH_VALUE: [2, 2] }[name];
        if (args.length < wantArgs[0] || args.length > wantArgs[1]) queryFail(name + '(...)  takes ' + (wantArgs[0] === wantArgs[1] ? wantArgs[0] : wantArgs[0] + ' to ' + wantArgs[1]) + ' value(s),  not ' + args.length + '.');
    }

    const ty = kind === 'TOTAL' ? total.ty
        : kind === 'PERCENT_RANK' || kind === 'CUME_DIST' ? 'real'
        : kind === 'LAG' || kind === 'LEAD' ? (args.length > 2 ? mergeTypes(args[0].ty, args[2].ty) : args[0].ty)
        : kind === 'FIRST_VALUE' || kind === 'LAST_VALUE' || kind === 'NTH_VALUE' ? args[0].ty
        : 'int';

    //  The frame:   where it starts and ends,  around each row.
    const frame = over.frame;
    if (frame !== null && frame.unit === 'RANGE' && (frame.start.kind === 'before' || frame.start.kind === 'after' || frame.end.kind === 'before' || frame.end.kind === 'after')) {
        queryFail('RANGE frames can only use  UNBOUNDED  and  CURRENT ROW.   For "the 3 rows before",  use  ROWS BETWEEN 3 PRECEDING AND CURRENT ROW.');
    }
    function edgeAmount(edge) {
        if (edge.n === undefined) return 0;
        const v = edge.n.t === 'lit' ? edge.n.v : null;
        if (typeof v !== 'number' || v < 0) queryFail('The frame needs a plain number,  like  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.');
        return Math.trunc(v);
    }
    const startKind = frame === null ? 'first' : frame.start.kind;
    const endKind   = frame === null ? (order.length > 0 ? 'current' : 'last') : frame.end.kind;
    const startN = frame === null ? 0 : edgeAmount(frame.start);
    const endN   = frame === null ? 0 : edgeAmount(frame.end);
    const peersCount = frame === null ? order.length > 0 : frame.unit === 'RANGE';     //  RANGE:  rows that tie with this one count as "this row" too

    return {
        ty: ty,

        //  Work it out for ALL the rows at once.   Gives back one value per row  (in the rows' order).
        compute: function* (rows, env) {

            const out = new Array(rows.length).fill(null);

            //  1.  Split into partitions.
            const parts = new Map();
            for (let r = 0; r < rows.length; r++) {
                let key = '';
                for (let k = 0; k < partition.length; k++) key += keyOf(partition[k](rows[r], env)) + KEY_SPLIT;
                let list = parts.get(key);
                if (list === undefined) { list = []; parts.set(key, list); }
                list.push(r);
                if ((r & 4095) === 4095) yield;
            }

            const keys = new Array(rows.length);                //  each row's sort keys  (one list,  shared by every partition)

            for (const list of parts.values()) {

                //  2.  Sort each partition  (keeping the original order for ties).
                if (order.length > 0) {
                    for (let k = 0; k < list.length; k++) {
                        const r = list[k];
                        keys[r] = order.map(function (o) { return o.f(rows[r], env); });
                        if ((k & 8191) === 8191) yield;
                    }
                    const sorted = yield* sortRows(list, function (a, b) { return compareKeys(keys[a], keys[b], order) || a - b; });
                    for (let k = 0; k < sorted.length; k++) list[k] = sorted[k];
                }

                const n = list.length;
                function tie(a, b) { return order.length === 0 || compareKeys(keys[list[a]], keys[list[b]], order) === 0; }

                //  Where each run of ties ("peers") starts and ends.
                const peerStart = new Int32Array(n), peerEnd = new Int32Array(n);
                for (let p = 0; p < n; p++) peerStart[p] = p > 0 && tie(p, p - 1) ? peerStart[p - 1] : p;
                for (let p = n - 1; p >= 0; p--) peerEnd[p] = p < n - 1 && tie(p, p + 1) ? peerEnd[p + 1] : p;

                //  3.  The value for each row.
                if (kind === 'ROW_NUMBER') for (let p = 0; p < n; p++) out[list[p]] = p + 1;
                else if (kind === 'RANK') for (let p = 0; p < n; p++) out[list[p]] = peerStart[p] + 1;
                else if (kind === 'DENSE_RANK') {
                    let rank = 0;
                    for (let p = 0; p < n; p++) { if (peerStart[p] === p) rank++; out[list[p]] = rank; }
                }
                else if (kind === 'PERCENT_RANK') for (let p = 0; p < n; p++) out[list[p]] = n > 1 ? peerStart[p] / (n - 1) : 0;
                else if (kind === 'CUME_DIST') for (let p = 0; p < n; p++) out[list[p]] = (peerEnd[p] + 1) / n;
                else if (kind === 'NTILE') {
                    const buckets = Math.trunc(numOf(args[0].f(rows[list[0]], env)));
                    if (!(buckets > 0)) queryFail('NTILE(...)  needs a number above 0.');
                    const size = Math.floor(n / buckets), extra = n % buckets;
                    let p = 0;
                    for (let b = 1; b <= buckets && p < n; b++) {
                        const count = size + (b <= extra ? 1 : 0);
                        for (let c = 0; c < count; c++) out[list[p++]] = b;
                    }
                }
                else if (kind === 'LAG' || kind === 'LEAD') {
                    for (let p = 0; p < n; p++) {
                        const row = rows[list[p]];
                        const off = args.length > 1 ? args[1].f(row, env) : 1;
                        const step = off === null ? 0 : Math.trunc(numOf(off));
                        const q = kind === 'LAG' ? p - step : p + step;
                        out[list[p]] = q >= 0 && q < n ? args[0].f(rows[list[q]], env) : (args.length > 2 ? args[2].f(row, env) : null);
                    }
                }
                else {
                    //  FIRST_VALUE,  LAST_VALUE,  NTH_VALUE,  and totals:   they look at the FRAME around each row.
                    let prevEnd = -1;
                    let tally = null;
                    const growing = startKind === 'first';          //  the frame always starts at the top:  just keep adding  (fast)
                    for (let p = 0; p < n; p++) {
                        let s = startKind === 'first' ? 0 : startKind === 'current' ? (peersCount ? peerStart[p] : p) : startKind === 'before' ? p - startN : startKind === 'after' ? p + startN : n;
                        let e = endKind === 'last' ? n - 1 : endKind === 'current' ? (peersCount ? peerEnd[p] : p) : endKind === 'after' ? p + endN : endKind === 'before' ? p - endN : -1;
                        if (s < 0) s = 0;
                        if (e > n - 1) e = n - 1;

                        if (kind === 'TOTAL') {
                            if (growing) {
                                if (tally === null) tally = total.start();
                                for (let q = prevEnd + 1; q <= e; q++) total.add(tally, rows[list[q]], env);
                                if (e > prevEnd) prevEnd = e;
                                out[list[p]] = total.end(tally);
                            } else {
                                const t = total.start();
                                for (let q = s; q <= e; q++) total.add(t, rows[list[q]], env);
                                out[list[p]] = total.end(t);
                            }
                        } else {
                            let q = -1;
                            if (kind === 'FIRST_VALUE') q = s;
                            else if (kind === 'LAST_VALUE') q = e;
                            else {
                                const nth = Math.trunc(numOf(args[1].f(rows[list[p]], env)));
                                if (!(nth > 0)) queryFail('NTH_VALUE(..., n)  needs n above 0.');
                                q = s + nth - 1;
                            }
                            out[list[p]] = q >= s && q <= e && q >= 0 && q < n ? args[0].f(rows[list[q]], env) : null;
                        }
                        if ((p & 1023) === 1023) yield;
                    }
                }
                yield;
            }
            return out;
        },
    };
}
```

| Code | Baby words |
|---|---|
| `PARTITION BY` | Split the rows into groups. Each group is counted on its own. |
| peers (`peerStart`, `peerEnd`) | Rows that TIE in the order. `RANK` gives ties the same number (1, 2, 2, 4); `DENSE_RANK` doesn't skip (1, 2, 2, 3). |
| the frame | Which rows around this one count: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` = this one and the 2 before (a moving average). |
| `growing` | When the frame starts at the top (a running total), just keep ADDING the next rows. Re-adding everything for every row would take forever on a big table. |

<br>

### Step 10.12: Run

Running is done with **generators** (`function*`): a function that can PAUSE in the middle of its work (`yield`) and pick up right where it left off. The engine pauses every few thousand rows; the driver (Step 10.13) checks the clock and lets the page breathe. So a huge question never freezes the page.

Rows flow like water through pipes: a SOURCE (a table, a JOIN) hands each row to a "sink" function (the next step). The sink says `false` = "I have enough, stop" (that's how `LIMIT 10` on a million rows only reads 10).

**Sources: a table, a subquery, no table at all:**

```js
function runNow(gen) {
    let step = gen.next();
    while (!step.done) step = gen.next();
    return step.value;
}

//  Collect all of a source's rows into a list.
function* collect(source, env) {
    const rows = [];
    yield* source.scan(env, function (row) { rows.push(row); return true; });
    return rows;
}


//  ---- SOURCES ----
//  A source is   { cols,  scan(env, sink) }:   its columns,  and a generator that hands every row to  sink.

//  A table from the brain:  its rows,  cut into cells,  turned into values.
function tableSource(table, alias) {

    const names = columnNames(table);
    const kinds = columnKinds(table);
    const cols  = names.map(function (n, j) { return newCol(n, alias, kinds[j]); });
    const width = cols.length;

    return {
        cols: cols,
        scan: function* (env, sink) {

            //  Only the columns the query USES get turned into values  (a query about 2 columns of 40 is much quicker).
            const used = [];
            for (let j = 0; j < width; j++) if (cols[j].used) used.push(j);
            const numeric = used.map(function (j) { return kinds[j] === 'int' || kinds[j] === 'real' || kinds[j] === 'num'; });
            const isNull = table.isNull || null;
            const emptyIsNull = table.emptyIsNull !== false;
            const n = table.rowCount;
            const emptyRow = new Array(width).fill(null);
            let work = 0;                   //  cells cut since the last breath  (a row is cut whole,  even for 2 columns)

            for (let i = 0; i < n; i++) {

                work += used.length === 0 ? 1 : width;
                if ((i & 1023) === 1023 || work >= BITE_CELLS) { work = 0; yield i / n; }

                //  (No columns used at all,  like COUNT(*)?   Then every row can be the same empty one.)
                const row = used.length === 0 ? emptyRow : new Array(width);
                if (used.length > 0) {
                    const cells = table.row(i);
                    for (let u = 0; u < used.length; u++) {
                        const j = used[u];
                        const s = cells[j];
                        let v;
                        if (s === undefined) v = null;
                        else if (s === '') v = (isNull !== null && isNull(i, j)) || (isNull === null && emptyIsNull) ? null : '';
                        else if (numeric[u] && CELL_REAL.test(s)) v = Number(s);       //  (a cell that isn't a number stays as words)
                        else v = s;
                        row[j] = v;
                    }
                }
                if (!sink(row)) return;
            }
        },
    };
}

//  The rows of a query  (a subquery in FROM,  or a WITH table).
function planSource(plan, alias, cached) {
    const cols = plan.cols.map(function (c) { return newCol(c.name, alias, c.ty); });
    return {
        cols: cols,
        scan: function* (env, sink) {
            let rows;
            if (cached) {
                if (cached.rows === null) cached.rows = yield* plan.run(env, Infinity);
                rows = cached.rows;
            } else {
                rows = yield* plan.run(env, Infinity);
            }
            for (let k = 0; k < rows.length; k++) {
                if ((k & 4095) === 4095) yield;
                if (!sink(rows[k])) return;
            }
        },
    };
}

//  No FROM at all  (SELECT 1 + 1):  one empty row.
function oneRowSource() {
    return { cols: [], scan: function* (env, sink) { sink([]); } };
}
```

> **Why only the USED columns?** Turning every cell into a value costs time. A question about 2 columns of a 40-column file only turns those 2 into values. `COUNT(*)` uses no columns at all: it doesn't even cut the rows up.

**FROM and JOIN.** The slow way to join checks every pair (1,000 × 1,000 = a million pairs). The fast way (a "hash join") puts one table's rows in a lookup by their key, then finds each row's partner directly:

```js
//  ---- FROM ----
function compileFrom(item, parent, ctx) {

    if (item.t === 'table') {
        const cte = ctx.ctes.get(String(item.name).toLowerCase());
        if (cte !== undefined) return planSource(cte.plan, item.alias || cte.name, cte);
        const table = ctx.catalog.find(item.name);
        if (table === null) {
            const names = ctx.catalog.names();
            queryFail('There\'s no table named  ' + item.name + '.' + (names.length > 0 ? '  The tables you can use:  ' + names.join(',  ') : ''));
        }
        return tableSource(table, item.alias || table.name);
    }

    if (item.t === 'sub') {
        const plan = compileQuery(item.q, parent, ctx);
        return planSource(plan, item.alias, null);
    }

    return compileJoin(item, parent, ctx);
}


//  ---- JOIN ----
//
//  Which rows of table A go with which rows of table B?   The ON says:   ON orders.customer_id = customers.id
//
//  The slow way:  check EVERY pair  (A's rows  ×  B's rows:  a million pairs for 1,000 × 1,000).
//  The fast way  (a "hash join"):  put B's rows in a lookup  by their  id,  then for each row of A,
//  look up its  customer_id  directly.   The engine uses the fast way whenever the ON has an  =  like that.
//
//      INNER JOIN   only pairs that match
//      LEFT JOIN    every row of A  (no match?  B's columns are NULL)
//      RIGHT JOIN   every row of B
//      FULL JOIN    every row of both
//      CROSS JOIN   every pair  (no ON)
//
function compileJoin(j, parent, ctx) {

    const A = compileFrom(j.a, parent, ctx);
    const B = compileFrom(j.b, parent, ctx);
    const wa = A.cols.length, wb = B.cols.length;
    const cols = A.cols.concat(B.cols);
    const scope = { cols: cols, parent: parent, owner: ctx.owner, match: null };

    //  USING (id)  and  NATURAL JOIN:   "the columns with the same name must match".
    let on = j.on;
    let names = j.using;
    if (j.natural) {
        names = A.cols.filter(function (c) { return !c.hidden && B.cols.some(function (d) { return !d.hidden && d.key === c.key; }); })
                      .map(function (c) { return c.name; });
    }
    if (names !== null && names !== undefined) {
        names.forEach(function (n) {
            const ia = findCol({ cols: A.cols }, { table: null, name: n });
            const ib = findCol({ cols: B.cols }, { table: null, name: n });
            if (ia === -1 || ib === -1) queryFail('USING (' + n + '):  both tables need a column named  ' + n + '.');
            const test = { t: 'cmp', op: '=', a: { t: 'ref', idx: ia }, b: { t: 'ref', idx: wa + ib } };
            on = on === null ? test : { t: 'and', a: on, b: test };
            B.cols[ib].hidden = true;                                  //  SELECT * shows the column once
        });
    }

    const onF = on === null ? null : cx(on, scope, ctx).f;

    //  Look for the  "A's thing = B's thing"  parts of the ON  (for the fast way).
    const leftKeys = [], rightKeys = [];
    let wordsOnly = true;
    function side(node) {
        let s = 'none';
        let bad = false;
        walk(node, function (x) {
            if (x.t === 'scalar' || x.t === 'exists' || x.t === 'insub') { bad = true; return false; }
            let idx = -1;
            if (x.t === 'ref') idx = x.idx;
            if (x.t === 'col') {
                const r = resolveColumn(scope, x, true);
                if (r === null || r.depth > 0) { if (r === null) bad = true; return false; }
                idx = r.idx;
            }
            if (idx !== -1) {
                const here = idx < wa ? 'A' : 'B';
                if (s === 'none') s = here; else if (s !== here) bad = true;
            }
            return true;
        });
        return bad ? 'mixed' : s;
    }
    (function findKeys(node) {
        if (node === null) return;
        if (node.t === 'and') { findKeys(node.a); findKeys(node.b); return; }
        if (node.t !== 'cmp' || node.op !== '=') return;
        const sa = side(node.a), sb = side(node.b);
        let l = null, r = null;
        if (sa === 'A' && sb === 'B') { l = node.a; r = node.b; }
        else if (sa === 'B' && sb === 'A') { l = node.b; r = node.a; }
        if (l === null) return;
        const L = cx(l, scope, ctx), R = cx(r, scope, ctx);
        leftKeys.push(L.f);
        rightKeys.push(R.f);
        if (!(isWordsType(L.ty) && isWordsType(R.ty))) wordsOnly = false;
    })(on);

    const kind = j.kind;
    const keepA = kind === 'left' || kind === 'full';
    const keepB = kind === 'right' || kind === 'full';

    return {
        cols: cols,
        scan: function* (env, sink) {

            const right = yield* collect(B, env);
            const nullsA = new Array(wa).fill(null);
            const nullsB = new Array(wb).fill(null);
            const matchedB = keepB ? new Uint8Array(right.length) : null;
            let stopped = false;

            //  The joined row:  A's values,  then B's.   (B's are read at spot  wa + j,  so the keys built
            //  from the "B side" are worked out on a pretend joined row.)
            const pretend = new Array(wa + wb);

            if (leftKeys.length > 0) {

                //  THE FAST WAY:  B's rows in a lookup,  by their key.
                const lookup = new Map();
                for (let r = 0; r < right.length; r++) {
                    const row = right[r];
                    for (let k = 0; k < wb; k++) pretend[wa + k] = row[k];
                    let key = '';
                    let skip = false;
                    for (let k = 0; k < rightKeys.length; k++) {
                        const part = matchKey(rightKeys[k](pretend, env), wordsOnly);
                        if (part === null) { skip = true; break; }     //  NULL never matches anything
                        key += part + KEY_SPLIT;
                    }
                    if (!skip) {
                        const list = lookup.get(key);
                        if (list === undefined) lookup.set(key, [r]); else list.push(r);
                    }
                    if ((r & 4095) === 4095) yield;
                }

                yield* A.scan(env, function (row) {
                    let key = '';
                    let skip = false;
                    for (let k = 0; k < leftKeys.length; k++) {
                        const part = matchKey(leftKeys[k](row, env), wordsOnly);
                        if (part === null) { skip = true; break; }
                        key += part + KEY_SPLIT;
                    }
                    let found = false;
                    const list = skip ? undefined : lookup.get(key);
                    if (list !== undefined) {
                        for (let k = 0; k < list.length; k++) {
                            const both = row.concat(right[list[k]]);
                            if (onF !== null && !truthy(onF(both, env))) continue;
                            found = true;
                            if (matchedB !== null) matchedB[list[k]] = 1;
                            if (!sink(both)) { stopped = true; return false; }
                        }
                    }
                    if (!found && keepA && !sink(row.concat(nullsB))) { stopped = true; return false; }
                    return true;
                });

            } else {

                //  THE SLOW WAY:  every pair.   (Pauses every 65,536 pairs,  so a big one never freezes the page.)
                const left = yield* collect(A, env);
                let pairs = 0;
                for (let l = 0; l < left.length && !stopped; l++) {
                    let found = false;
                    for (let r = 0; r < right.length; r++) {
                        if ((++pairs & 65535) === 0) yield l / left.length;
                        const both = left[l].concat(right[r]);
                        if (onF !== null && !truthy(onF(both, env))) continue;
                        found = true;
                        if (matchedB !== null) matchedB[r] = 1;
                        if (!sink(both)) { stopped = true; break; }
                    }
                    if (!stopped && !found && keepA && !sink(left[l].concat(nullsB))) stopped = true;
                }
            }

            //  RIGHT / FULL:  B's rows that never matched.
            if (!stopped && matchedB !== null) {
                for (let r = 0; r < right.length; r++) {
                    if (!matchedB[r] && !sink(nullsA.concat(right[r]))) return;
                }
            }
        },
    };
}
```

| Join | Keeps |
|---|---|
| `JOIN` (`INNER JOIN`) | Only pairs that match |
| `LEFT JOIN` | Every row of the left table (no partner? the right side's columns are NULL) |
| `RIGHT JOIN` | Every row of the right table |
| `FULL JOIN` | Every row of both |
| `CROSS JOIN` | Every pair (no ON) |

**One SELECT.** The order things happen in is NOT the order they're written: FROM, WHERE, GROUP BY, HAVING, windows, SELECT, DISTINCT, then ORDER BY and LIMIT:

```js
//  ---- ONE SELECT ----
//
//  The order things happen in  (not the order they're written!):
//
//      1.  FROM / JOIN     where the rows come from
//      2.  WHERE           keep only some rows
//      3.  GROUP BY        squash rows into groups,  work out the totals
//      4.  HAVING          keep only some groups
//      5.  windows         ROW_NUMBER() OVER (...) ...
//      6.  SELECT          work out what to show
//      7.  DISTINCT        drop repeats
//      8.  ORDER BY        sort   (done by compileQuery)
//      9.  LIMIT           cut    (done by compileQuery)
//
//  "order"  =  the ORDER BY items  (from the query around this SELECT):  they're worked out here too,
//  as hidden extra columns on the end of each row,  because they can use columns that aren't shown.
//
function compileCore(c, parent, ctx, order) {

    const src = c.from === null ? oneRowSource() : compileFrom(c.from, parent, ctx);
    const sc0 = { cols: src.cols, parent: parent, owner: ctx.owner, match: null };

    if (c.where !== null) walk(c.where, function (x) {
        if (isTotal(x)) queryFail('Totals like  ' + x.name + '(...)  can\'t go in WHERE  (WHERE looks at one row at a time).  Use HAVING:   ... GROUP BY ... HAVING ' + x.name + '(...) > ...');
        if (isWindow(x)) queryFail('Window functions can\'t go in WHERE.  Put the query in a subquery,  and filter that.');
        return true;
    });
    const where = c.where === null ? null : cx(c.where, sc0, ctx).f;


    //  SELECT *   ->   every column,  one by one.
    const items = [];
    c.items.forEach(function (it) {
        if (!it.star) {
            //  Its name:  the nickname,  or a column's own name  (spelled the way the TABLE spells it),  or the words it was written with.
            let named = it.label;
            if (it.e.t === 'col') {
                const r = resolveColumn(sc0, it.e, true);
                named = r !== null && r.name ? r.name : it.e.name;
            }
            items.push({ e: it.e, name: it.alias !== null ? it.alias : named });
            return;
        }
        let any = false;
        src.cols.forEach(function (col, j) {
            if (col.hidden) return;
            if (it.table !== null && col.tkey !== String(it.table).toLowerCase()) return;
            items.push({ e: { t: 'ref', idx: j }, name: col.name });
            any = true;
        });
        if (it.table !== null && !any) queryFail('There\'s no table called  ' + it.table + '  in this FROM.');
        if (it.table === null && src.cols.length === 0) queryFail('SELECT *  needs a FROM  (a table to show).');
    });


    //  ORDER BY items:  a number  (ORDER BY 2  =  the 2nd column),  a column's name  (or nickname),  or anything else.
    const orderPlan = [];       //  for each ORDER BY item:   { output: n }   or   { node }
    if (order !== null) {
        order.forEach(function (o) {
            const e = o.e;
            if (e.t === 'lit' && typeof e.v === 'number') {
                const k = Math.trunc(e.v);
                if (k < 1 || k > items.length) queryFail('ORDER BY ' + e.v + ':  there are only ' + items.length + ' columns.');
                orderPlan.push({ output: k - 1, o: o });
                return;
            }
            //  A plain name:  a nickname from SELECT wins.   Otherwise it's a column of the table.
            if (e.t === 'col' && e.table === null) {
                const k = items.findIndex(function (it) { return it.name.toLowerCase() === e.name.toLowerCase(); });
                const isAlias = c.items.some(function (it) { return !it.star && it.alias !== null && it.alias.toLowerCase() === e.name.toLowerCase(); });
                if (k !== -1 && (isAlias || resolveColumn(sc0, e, true) === null)) { orderPlan.push({ output: k, o: o }); return; }
            }
            orderPlan.push({ node: e, o: o });
        });
    }

    //  Find the totals and the windows  (in SELECT,  HAVING,  ORDER BY).
    const totalNodes = [], totalPrints = new Map();
    const windowNodes = [];
    function findSpecial(node) {
        walk(node, function (x) {
            if (isWindow(x)) {
                windowNodes.push(x);
                //  A window's insides can have totals:   RANK() OVER (ORDER BY SUM(sales))
                (x.args || []).forEach(findSpecial);
                (x.over.partition || []).forEach(findSpecial);
                (x.over.order || []).forEach(function (o) { findSpecial(o.e); });
                return false;
            }
            if (isTotal(x)) {
                const print = nodePrint(x, sc0);
                if (print === null || !totalPrints.has(print)) {
                    if (print !== null) totalPrints.set(print, totalNodes.length);
                    totalNodes.push(x);
                }
                return false;
            }
            return true;
        });
    }
    items.forEach(function (it) { findSpecial(it.e); });
    if (c.having !== null) findSpecial(c.having);
    orderPlan.forEach(function (p) { if (p.node) findSpecial(p.node); });
    if (c.group !== null) c.group.forEach(function (g) {
        walk(g, function (x) {
            if (isTotal(x)) queryFail('Totals can\'t go in GROUP BY.');
            if (isWindow(x)) queryFail('Window functions can\'t go in GROUP BY.');
            return true;
        });
    });

    const grouped = c.group !== null || totalNodes.length > 0 || c.having !== null;


    //  ---- 3.  GROUP BY ----
    let levelScope = sc0;
    let keyF = [], totals = [];

    if (grouped) {

        //  GROUP BY 1  =  the 1st thing in SELECT.   GROUP BY total  =  a nickname  (if there's no column with that name).
        const keys = (c.group || []).map(function (g) {
            if (g.t === 'lit' && typeof g.v === 'number') {
                const k = Math.trunc(g.v);
                if (k < 1 || k > items.length) queryFail('GROUP BY ' + g.v + ':  there are only ' + items.length + ' columns.');
                return items[k - 1].e;
            }
            if (g.t === 'col' && g.table === null && resolveColumn(sc0, g, true) === null) {
                const it = c.items.find(function (x) { return !x.star && x.alias !== null && x.alias.toLowerCase() === g.name.toLowerCase(); });
                if (it !== undefined) return it.e;
            }
            return g;
        });

        const keyC = keys.map(function (k) { return cx(k, sc0, ctx); });
        keyF = keyC.map(function (k) { return k.f; });
        const keyPrints = new Map();
        const groupSlot = new Map();
        keys.forEach(function (k, j) {
            const print = nodePrint(k, sc0);
            if (print !== null && !keyPrints.has(print)) keyPrints.set(print, j);
            let idx = -1;
            if (k.t === 'ref') idx = k.idx;
            if (k.t === 'col') { const r = resolveColumn(sc0, k, true); if (r !== null && r.depth === 0) idx = r.idx; }
            if (idx !== -1 && !groupSlot.has(idx)) groupSlot.set(idx, j);
        });

        totals = totalNodes.map(function (t) { return compileTotal(t, sc0, ctx); });

        const width = keys.length;
        const groupTypes = keyC.map(function (k) { return k.ty; }).concat(totals.map(function (t) { return t.ty; }));

        //  After grouping,  each row is:   [ key 1,  key 2 ...,  total 1,  total 2 ... ]
        levelScope = {
            cols: [], parent: parent, owner: ctx.owner, grouped: sc0, groupSlot: groupSlot, groupTypes: groupTypes,
            match: function (node) {
                if (node.t === 'lit') return null;
                if (isTotal(node)) {
                    const print = nodePrint(node, sc0);
                    const j = print !== null && totalPrints.has(print) ? totalPrints.get(print) : totalNodes.indexOf(node);
                    if (j === -1) return null;
                    return reader(0, width + j, totals[j].ty);
                }
                if (isWindow(node)) return null;
                const print = nodePrint(node, sc0);
                if (print !== null && keyPrints.has(print)) {
                    const j = keyPrints.get(print);
                    return reader(0, j, groupTypes[j]);
                }
                return null;
            },
        };
    }

    const having = c.having === null ? null : cx(c.having, levelScope, ctx).f;


    //  ---- 5.  WINDOWS ----
    let finalScope = levelScope;
    const windows = [];
    if (windowNodes.length > 0) {
        const base = grouped ? keyF.length + totals.length : src.cols.length;
        windowNodes.forEach(function (w) { windows.push(compileWindow(w, levelScope, ctx)); });
        const under = levelScope.match;
        finalScope = Object.assign({}, levelScope, {
            match: function (node) {
                if (isWindow(node)) {
                    const j = windowNodes.indexOf(node);
                    return reader(0, base + j, windows[j].ty);
                }
                return under ? under(node) : null;
            },
        });
    }


    //  ---- 6.  SELECT ----
    const outputs = items.map(function (it) { return cx(it.e, finalScope, ctx); });
    const cols = items.map(function (it, k) { return { name: it.name, ty: outputs[k].ty }; });
    const outF = outputs.map(function (o) { return o.f; });

    //  ORDER BY's hidden extras.
    const hidden = [];
    const sortBy = orderPlan.map(function (p) {
        if (p.output !== undefined) return { idx: p.output, desc: p.o.desc, nulls: p.o.nulls };
        if (c.distinct) {
            const print = nodePrint(p.node, finalScope);
            const k = items.findIndex(function (it) { return nodePrint(it.e, finalScope) === print; });
            if (print === null || k === -1) queryFail('With SELECT DISTINCT,  ORDER BY can only use the columns you SELECT.');
            return { idx: k, desc: p.o.desc, nulls: p.o.nulls };
        }
        hidden.push(cx(p.node, finalScope, ctx).f);
        return { idx: items.length + hidden.length - 1, desc: p.o.desc, nulls: p.o.nulls };
    });

    const nOut = outF.length, nHidden = hidden.length;
    function project(row, env) {
        const out = new Array(nOut + nHidden);
        for (let k = 0; k < nOut; k++) out[k] = outF[k](row, env);
        for (let k = 0; k < nHidden; k++) out[nOut + k] = hidden[k](row, env);
        return out;
    }

    const distinct = c.distinct;
    const top = c.top;

    return {
        cols: cols,
        order: order === null ? null : sortBy,
        top: top,
        run: function* (env, need) {

            const out = [];
            const seen = distinct ? new Set() : null;
            function emit(row) {
                const o = project(row, env);
                if (seen !== null) {
                    const key = rowKey(o, nOut);
                    if (seen.has(key)) return true;
                    seen.add(key);
                }
                out.push(o);
                return out.length < need;
            }

            //  The simple kind  (no GROUP BY,  no windows):  rows go straight through.
            if (!grouped && windows.length === 0) {
                yield* src.scan(env, function (row) {
                    if (where !== null && !truthy(where(row, env))) return true;
                    return emit(row);
                });
                return out;
            }

            let level;

            if (grouped) {
                const groups = new Map();
                level = [];
                const nk = keyF.length, nt = totals.length;
                const vals = new Array(nk);                     //  (one scratch list,  reused for every row)
                yield* src.scan(env, function (row) {
                    if (where !== null && !truthy(where(row, env))) return true;
                    let key;
                    if (nk === 1) { vals[0] = keyF[0](row, env); key = keyOf(vals[0]); }
                    else {
                        key = '';
                        for (let k = 0; k < nk; k++) { vals[k] = keyF[k](row, env); key += keyOf(vals[k]) + KEY_SPLIT; }
                    }
                    let g = groups.get(key);
                    if (g === undefined) {
                        g = new Array(nk + nt);
                        for (let k = 0; k < nk; k++) g[k] = vals[k];
                        for (let k = 0; k < nt; k++) g[nk + k] = totals[k].start();
                        groups.set(key, g);
                        level.push(g);
                    }
                    for (let k = 0; k < nt; k++) totals[k].add(g[nk + k], row, env);
                    return true;
                });
                //  No GROUP BY,  and no rows at all?  Totals still give ONE answer  (COUNT = 0).
                if (level.length === 0 && nk === 0) {
                    const g = new Array(nt);
                    for (let k = 0; k < nt; k++) g[k] = totals[k].start();
                    level.push(g);
                }
                for (let r = 0; r < level.length; r++) {
                    const g = level[r];
                    for (let k = 0; k < nt; k++) g[nk + k] = totals[k].end(g[nk + k]);
                    if ((r & 4095) === 4095) yield;
                }
                if (having !== null) level = level.filter(function (g) { return truthy(having(g, env)); });
            } else {
                level = [];
                yield* src.scan(env, function (row) {
                    if (where === null || truthy(where(row, env))) level.push(row);
                    return true;
                });
            }

            if (windows.length > 0) {
                const width = grouped ? keyF.length + totals.length : src.cols.length;
                level = level.map(function (r) { const copy = r.slice(); copy.length = width; return copy; });
                for (let w = 0; w < windows.length; w++) {
                    const vals = yield* windows[w].compute(level, env);
                    for (let r = 0; r < level.length; r++) level[r].push(vals[r]);
                }
            }

            for (let r = 0; r < level.length; r++) {
                if ((r & 4095) === 4095) yield;
                if (!emit(level[r])) break;
            }
            return out;
        },
    };
}
```

> **Why can't WHERE use COUNT(*)?** WHERE looks at one row at a time, BEFORE the groups exist. `HAVING` runs after grouping, so it can: `GROUP BY customer_id HAVING COUNT(*) > 5`.

**UNION, the whole query, and sorting:**

```js
//  ---- UNION / INTERSECT / EXCEPT ----
function compileSet(node, parent, ctx) {

    if (node.t === 'core') return compileCore(node, parent, ctx, null);
    if (node.t === 'paren') return compileQuery(node.q, parent, ctx);

    const A = compileSet(node.a, parent, ctx);
    const B = compileSet(node.b, parent, ctx);
    if (A.cols.length !== B.cols.length) {
        queryFail('Both sides of  ' + node.op + '  need the same number of columns  (one has ' + A.cols.length + ',  the other ' + B.cols.length + ').');
    }
    const width = A.cols.length;
    const cols = A.cols.map(function (col, k) { return { name: col.name, ty: mergeTypes(col.ty, B.cols[k].ty) }; });
    const op = node.op;

    return {
        cols: cols,
        order: null,
        run: function* (env) {
            const a = yield* A.run(env, Infinity);
            const b = yield* B.run(env, Infinity);
            const trim = function (r) { return r.length > width ? r.slice(0, width) : r; };
            if (op === 'UNION ALL') return a.map(trim).concat(b.map(trim));
            const out = [];
            const seen = new Set();
            if (op === 'UNION') {
                [a, b].forEach(function (list) {
                    list.forEach(function (r) {
                        const key = rowKey(r, width);
                        if (!seen.has(key)) { seen.add(key); out.push(trim(r)); }
                    });
                });
                return out;
            }
            const inB = new Set(b.map(function (r) { return rowKey(r, width); }));
            a.forEach(function (r) {
                const key = rowKey(r, width);
                if (seen.has(key)) return;
                seen.add(key);
                if (inB.has(key) === (op === 'INTERSECT')) out.push(trim(r));
            });
            return out;
        },
    };
}


//  ---- A WHOLE QUERY:   WITH ...   (the SELECTs)   ORDER BY ...   LIMIT ... ----
function compileQuery(q, parent, ctx) {

    const owner = { correlated: false, enclosing: ctx.owner };

    //  WITH  name AS (...):   tables made just for this query.   (Worked out once,  the first time they're used.)
    let ctes = ctx.ctes;
    if (q.with !== null) {
        ctes = new Map(ctes);
        q.with.forEach(function (w) {
            const plan = compileQuery(w.q, null, { catalog: ctx.catalog, ctes: ctes, owner: null });
            if (w.cols !== null) {
                if (w.cols.length !== plan.cols.length) queryFail('WITH ' + w.name + ' (...) names ' + w.cols.length + ' columns,  but its SELECT gives ' + plan.cols.length + '.');
                plan.cols = plan.cols.map(function (c, k) { return { name: w.cols[k], ty: c.ty }; });
            }
            ctes.set(String(w.name).toLowerCase(), { name: w.name, plan: plan, rows: null });
        });
    }

    const cctx = { catalog: ctx.catalog, ctes: ctes, owner: owner };

    let body, sortBy;
    if (q.body.t === 'core') {
        body = compileCore(q.body, parent, cctx, q.order);
        sortBy = body.order;
    } else {
        body = compileSet(q.body, parent, cctx);
        sortBy = null;
        if (q.order !== null) {
            //  ORDER BY after a UNION:  by the answer's columns  (by number,  or by name).
            const outScope = { cols: body.cols.map(function (c) { return newCol(c.name, null, c.ty); }), parent: null, owner: null, match: null };
            const extra = [];
            sortBy = q.order.map(function (o) {
                if (o.e.t === 'lit' && typeof o.e.v === 'number') {
                    const k = Math.trunc(o.e.v);
                    if (k < 1 || k > body.cols.length) queryFail('ORDER BY ' + o.e.v + ':  there are only ' + body.cols.length + ' columns.');
                    return { idx: k - 1, desc: o.desc, nulls: o.nulls };
                }
                extra.push(cx(o.e, outScope, cctx).f);
                return { idx: body.cols.length + extra.length - 1, desc: o.desc, nulls: o.nulls };
            });
            if (extra.length > 0) {
                const inner = body.run;
                const width = body.cols.length;
                body = Object.assign({}, body, {
                    run: function* (env, need) {
                        const rows = yield* inner(env, need);
                        return rows.map(function (r) {
                            const out = r.slice(0, width);
                            for (let k = 0; k < extra.length; k++) out.push(extra[k](out, env));
                            return out;
                        });
                    },
                });
            }
        }
    }

    const emptyScope = { cols: [], parent: null, owner: null, match: null };
    function amount(node, what) {
        if (node === null) return null;
        const v = cx(node, emptyScope, cctx).f([], { outer: [] });
        if (v === null) return null;
        const n = numOf(v);
        if (!Number.isFinite(n)) queryFail(what + ' needs a number.');
        return Math.trunc(n);
    }
    let limit = amount(q.limit, 'LIMIT');
    if (limit === null && body.top) limit = amount(body.top, 'TOP');
    if (limit !== null && limit < 0) limit = null;                  //  LIMIT -1  =  no limit  (SQLite)
    const offset = Math.max(0, amount(q.offset, 'OFFSET') || 0);

    const width = body.cols.length;

    return {
        cols: body.cols,
        owner: owner,
        run: function* (env, need) {
            const most = limit === null ? need : Math.min(limit, need);
            let rows = yield* body.run(env, sortBy !== null ? Infinity : offset + most);
            if (sortBy !== null) rows = yield* sortByKeys(rows, sortBy, offset + most);
            if (offset > 0 || rows.length > most) rows = rows.slice(offset, most === Infinity ? undefined : offset + most);
            for (let k = 0; k < rows.length; k++) if (rows[k].length > width) rows[k] = rows[k].slice(0, width);
            return rows;
        },
    };
}


//  SORT the answer by its ORDER BY.   Two tricks make it quick:
//
//    -  A column that's all numbers is copied into a plain list of numbers first:
//       comparing two of those is MUCH faster than comparing two values that could be anything.
//    -  Only the first  keep  rows are wanted  (ORDER BY price DESC LIMIT 10)?   Then it doesn't sort them all.
//       It keeps the best 10 so far in a little "heap":  a pile where the WORST of the 10 is always on top,
//       so when a better row comes along,  the worst one is thrown out in a flash.
//
//  (It sorts row NUMBERS,  not the rows:  ties keep their order,  because the lower number wins.)
function* sortByKeys(rows, sortBy, keep) {

    const n = rows.length;
    if (n < 2 || keep <= 0) return keep <= 0 ? [] : rows;

    const keys = [];
    for (let k = 0; k < sortBy.length; k++) {
        const s = sortBy[k];
        let numbers = true, nulls = false;
        for (let r = 0; r < n; r++) {
            const v = rows[r][s.idx];
            if (v === null) nulls = true;
            else if (typeof v !== 'number') { numbers = false; break; }
        }
        const key = { idx: s.idx, how: s, desc: s.desc, nullsFirst: s.nulls === null ? !s.desc : s.nulls === 'first', vals: null, nul: null };
        if (numbers) {
            key.vals = new Float64Array(n);
            if (nulls) key.nul = new Uint8Array(n);
            for (let r = 0; r < n; r++) {
                const v = rows[r][s.idx];
                if (v === null) key.nul[r] = 1; else key.vals[r] = v;
                if ((r & 65535) === 65535) yield;
            }
        }
        keys.push(key);
    }

    function compare(a, b) {
        for (let k = 0; k < keys.length; k++) {
            const key = keys[k];
            let c;
            if (key.vals !== null) {
                const na = key.nul !== null && key.nul[a] === 1, nb = key.nul !== null && key.nul[b] === 1;
                if (na || nb) c = na && nb ? 0 : na === key.nullsFirst ? -1 : 1;
                else {
                    const x = key.vals[a], y = key.vals[b];
                    c = x < y ? -1 : x > y ? 1 : 0;
                    if (key.desc) c = -c;
                }
            } else {
                c = compareOne(rows[a][key.idx], rows[b][key.idx], key.how);
            }
            if (c !== 0) return c;
        }
        return a - b;
    }

    let order;

    if (keep < n / 4 && keep <= 100000) {
        //  THE HEAP:  the best  keep  so far,  worst on top  (spot 0).
        const heap = [];
        function up(at) {
            while (at > 0) {
                const parent = (at - 1) >> 1;
                if (compare(heap[at], heap[parent]) <= 0) return;
                const t = heap[at]; heap[at] = heap[parent]; heap[parent] = t;
                at = parent;
            }
        }
        function down(at) {
            for (;;) {
                const l = 2 * at + 1, r = l + 1;
                let worst = at;
                if (l < heap.length && compare(heap[l], heap[worst]) > 0) worst = l;
                if (r < heap.length && compare(heap[r], heap[worst]) > 0) worst = r;
                if (worst === at) return;
                const t = heap[at]; heap[at] = heap[worst]; heap[worst] = t;
                at = worst;
            }
        }
        for (let r = 0; r < n; r++) {
            if (heap.length < keep) { heap.push(r); up(heap.length - 1); }
            else if (compare(r, heap[0]) < 0) { heap[0] = r; down(0); }
            if ((r & 65535) === 65535) yield r / n;
        }
        order = heap.sort(compare);
    } else {
        const list = new Array(n);
        for (let r = 0; r < n; r++) list[r] = r;
        order = yield* sortRows(list, compare);
    }

    const out = new Array(order.length);
    for (let k = 0; k < order.length; k++) out[k] = rows[order[k]];
    return out;
}

//  SORT a big list,  in bites.
//  Small lists:  the browser's own sort  (it keeps ties in order).
//  Big ones:  sort pieces of 16,384,  then merge the pieces two by two  ("merge sort"),  pausing as it goes.
function* sortRows(rows, compare) {
    const n = rows.length;
    if (n <= 65536) return rows.sort(compare);

    const RUN = 16384;
    for (let start = 0; start < n; start += RUN) {
        const part = rows.slice(start, start + RUN).sort(compare);
        for (let k = 0; k < part.length; k++) rows[start + k] = part[k];
        yield;
    }

    let from = rows, to = new Array(n);
    let steps = 0;
    for (let width = RUN; width < n; width *= 2) {
        for (let lo = 0; lo < n; lo += 2 * width) {
            const mid = Math.min(lo + width, n), hi = Math.min(lo + 2 * width, n);
            let a = lo, b = mid, k = lo;
            while (a < mid && b < hi) {
                to[k++] = compare(from[b], from[a]) < 0 ? from[b++] : from[a++];        //  ties:  the left one first  (keeps them in order)
                if ((++steps & 65535) === 0) yield;
            }
            while (a < mid) to[k++] = from[a++];
            while (b < hi) to[k++] = from[b++];
        }
        const swap = from; from = to; to = swap;
    }
    return from;
}
```

| Code | Baby words |
|---|---|
| `WITH name AS (...)` | A table made just for this question. Worked out once, the first time it's used, then remembered. |
| `sortByKeys` | A column that's all numbers is copied into a plain list of numbers first: comparing those is much faster. |
| the heap | `ORDER BY price DESC LIMIT 10` doesn't sort a million rows: it keeps the best 10 so far, and throws out the worst when a better one comes. (Measured: 4 s -> 1 s on a million rows.) |
| `sortRows` (merge sort) | Sort pieces of 16,384, then merge them 2 by 2, pausing as it goes. |

<br>

### Step 10.13: Ask it a question

The front door: `runQuery`. It reads the text, gets the tables ready (another sheet is read only if the question asks for it), compiles, and runs, in bites:

```js
async function runQuery(text, catalog, isCurrent, progress) {

    const statements = parseSql(text);
    const picked = statements[statements.length - 1];

    if (picked.t === 'write') {
        queryFail(picked.verb + '  would change the data,  so it can\'t run here:  this tool only READS  (your file is never changed).  ' +
                  'Try a SELECT,  like:   SELECT * FROM ' + (catalog.names()[0] || 'your_table') + ' LIMIT 10');
    }

    //  Which tables does it use?   Get them ready first  (another sheet of the file has to be read).
    const wanted = new Set();
    walkQuery(picked, function (item) { if (item.t === 'table') wanted.add(item.name); });
    await catalog.prepare(Array.from(wanted));
    if (!isCurrent()) throw QUERY_STALE;

    //  Their column types:  worked out first,  in bites  (then compiling just reads them).
    let stopAt = performance.now() + CHUNK_TIME;
    for (const name of wanted) {
        const table = catalog.find(name);
        if (table === null) continue;                   //  (a WITH table,  or a mistake:  compiling says so)
        const looking = lookAtKinds(table);
        while (!looking.next().done) {
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
    }

    const plan = compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
    const gen = plan.run({ outer: [] }, Infinity);

    for (;;) {
        const step = gen.next();
        if (step.done) {
            return {
                columns: plan.cols.map(function (c) { return { name: c.name, type: c.ty }; }),
                rows: step.value,
                ran: statements.length,
                count: statements.length,
            };
        }
        if (performance.now() >= stopAt) {
            if (typeof step.value === 'number' && progress) progress(step.value);
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
    }
}

//  Visit every table name in a query  (including the ones in subqueries).
function walkQuery(node, visit) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(function (x) { walkQuery(x, visit); }); return; }
    if (node.t === 'table') visit(node);
    for (const k in node) {
        const v = node[k];
        if (v !== null && typeof v === 'object') walkQuery(v, visit);
    }
}

//  A type's name,  for the answer's types row:   int  ->  INTEGER
function queryTypeName(ty) {
    return { int: 'INTEGER', real: 'REAL', num: 'NUMERIC', text: 'TEXT', date: 'DATE', timestamp: 'TIMESTAMP', bool: 'BOOLEAN' }[ty] || '';
}

//  A value,  as it's shown in the answer.
function queryCellText(v, ty) {
    return v === null ? '' : valueText(v, ty);
}

//  Turn a problem into words for you.
function queryProblem(problem) {
    if (problem instanceof QueryError) return problem.message;
    if (problem instanceof RangeError) return 'The answer is too big for the browser.  Try a LIMIT,  or fewer columns.';
    return 'Something went wrong running that query.  (' + (problem && problem.message ? problem.message : problem) + ')';
}
```

<br>

### Step 10.14: The brain: one way to put a table on screen

Until now, "ALL DONE" (the end of `useText`) put the new file on screen itself. Now there are 3 times a table goes on screen: a file finished loading, an answer is ready, and "← Back to file". So those lines move into ONE function, `swapIn`, that all 3 use.

**1.** In "ALL DONE", replace everything from `headerCells = newHeader;` down to `finishLoading();` with:

```js
            const note = excel !== null
                ? (excel.hasDates ? '  ·  dates shown as YYYY-MM-DD  (originals kept)' : '') +
                  (excel.unsolved > 0 ? '  ·  ' + excel.unsolved + ' formula(s) had no saved answer  (shown as formulas)' : '') +
                  (excel.recalc ? '  ·  ⚠ this file asks Excel to recalculate:  formula answers may be out of date' : '')
                : sql !== null
                ? (sql.nullCount > 0 ? '  ·  ' + sql.nullCount.toLocaleString() + ' NULL' + (sql.nullCount === 1 ? '' : 's') + ' kept' : '')
                : encoding === 'windows-1252'
                ? '  ·  read as Windows-1252  (an older Excel format)'
                : '';

            const table = { header: newHeader, text: text, starts: starts, count: count, longest: longest,
                            excel: excel, sql: sql, note: note, name: file.name };

            //  Which look?  A NEW file:  Excel files look like Excel,  SQL dumps like a database table,  CSVs like a CSV.
            //  Another sheet tab  (or table)  of the same file  (sheet !== null):  keep the look you picked.
            const look = sheet === null ? excel !== null || sql !== null : excelLook;

            swapIn(table, look);
            fileTable = { table: table, file: file, sheet: sheet, others: new Map() };     //  what a query asks about  (see QUERY)
            queryFileChanged();
            finishLoading();                    //  the pie fills up, and the loader goes away
```

**2.** Right after `loadFile` (after its closing `}`), the function those lines moved into:

```js
//  SWAP IN a table:  make it the one on screen.
//  (A file that just finished loading.   Or a query's answer.   Or back from the answer to the file.)
//
//  table  =  { header,   the column names
//              text,     the rows,  as one long string  ...
//              starts,   ...  and where each row starts in it
//              count,    how many rows
//              longest,  the longest thing in each column  (how wide they get)
//              excel,    the Excel notes  (or null)
//              sql,      the SQL notes    (or null)
//              note,     a few words for the "Rows 1–15" line  (or '')
//              name }    the file's name
//  look   =  show it in its OWN look?  (the spreadsheet look,  or the table look)
function swapIn(table, look) {

    headerCells = table.header;
    fileText    = table.text;               //  keep the whole file...
    rowStart    = table.starts;             //  ...and where each row starts in it
    rowCount    = table.count;
    rowCache    = new Map();                //  new rows  =  forget the old ones
    cacheCells  = 0;
    xlsxInfo    = table.excel;              //  the Excel notes  (null for a CSV)
    sqlInfo     = table.sql;                //  the SQL notes    (null if it's not a SQL dump)
    fileNote    = table.note;
    excelLook   = look;
    applyLook();                            //  the window,  the button,  and the badge  ("XLSX SPREADSHEET",  "SQL DUMP")
    readingName.textContent = table.name;
    readingFrom.hidden = false;             //  "Reading from...  sales.csv"
    dataColumns = table.longest.length;     //  the widest row decides how many columns there are
    searchText  = null;                     //  new rows  =  throw away the old search copy
    allRows     = null;                     //  ...and the old "every row" list
    doneQuery   = null;                     //  ...and the last search  (its rows were the OLD rows)
    doneMatches = null;

    //  Clean slate.
    searchInput.value = '';
    searchInput.disabled = false;           //  turn the search bar ON
    jumpInput.value = '';

    //  A SQL dump  (or a query's answer):  the column TYPES count too,  so the table look can show them  (VARCHAR(255),  DECIMAL(10,2) ...).
    //  (They're in smaller letters:  about 0.8 of a normal letter each.   PK  =  about 4 more.)
    const longest = table.longest;
    if (table.sql !== null) {
        table.sql.columns.forEach(function (column, col) {
            const wide = Math.ceil(column.type.length * 0.8) + (column.pk ? 4 : 0);
            if (col < longest.length && wide > longest[col]) longest[col] = wide;
        });
    }

    setColumnWidths(longest);               //  decide how wide each column is
    drawHeader(true);                       //  draw line 0  (and measure how tall a row is)
    render();                               //  show the rows  (see STEP 5 below)
}
```

> **Why keep `fileTable`?** It's the file's table, kept as it is. An answer on screen only REPLACES what's shown: the file's text and rows stay in memory, untouched. "← Back to file" just swaps them back in, instantly. (And every query asks the FILE, not the last answer.)

**3.** The badge, for an answer. In `showBadge`, after `showSheetTabs();`:

```js
    backBtn.hidden = !showingAnswer();

    //  A query's answer:   QUERY RESULT  ·  12 rows  ·  from sales  ·  8 ms
    if (showingAnswer()) {
        const r = sqlInfo.result;
        fileBadge.textContent = 'QUERY RESULT  ·  ' + r.rows.toLocaleString() + ' row' + (r.rows === 1 ? '' : 's') +
            (r.from ? '  ·  from ' + r.from : '') + '  ·  ' + formatTime(r.ms);
        fileBadge.hidden = false;
        return;
    }
```

**4.** The Details panel and the query menu live in the same spot, so opening one closes the other. First line of `showRow`:

```js
    if (open) closeQueryMenu();                         //  (the query menu lives in the same spot)
```

**5.** An answer with no rows: in `updatePosition`, the "only a header row" words:

```js
            ? (showingAnswer() ? 'The answer has no rows:  nothing matched' : 'This file only has a header row')
```

<br>

### Step 10.15: The brain: the query menu

Add all of this at the very end of the brain.

**The pieces, and what the menu remembers:**

```js
const queryBtn     = document.getElementById('queryBtn');       //  "Query"  (the end of the file bar)
const queryMenu    = document.getElementById('queryMenu');      //  the menu it unfolds into
const queryTitle   = document.getElementById('queryTitle');     //  its  "Query  ·  sales  ·  1,204 rows"
const queryClose   = document.getElementById('queryClose');     //  its  ×
const queryBuilder = document.getElementById('queryBuilder');   //  the builder  (the brain fills it in)
const querySql     = document.getElementById('querySql');       //  the SQL box
const queryNote    = document.getElementById('querySqlNote');   //  "written for you as you pick ..."
const queryReset   = document.getElementById('queryReset');     //  "Use the builder again"
const queryRun     = document.getElementById('queryRun');       //  "Run ▶"
const queryCopy    = document.getElementById('queryCopy');      //  "Copy SQL"
const queryExport  = document.getElementById('queryExport');    //  "Export CSV"
const queryStatus  = document.getElementById('queryStatus');    //  "12 rows · 8 ms"   (or what went wrong)
const backBtn      = document.getElementById('backBtn');        //  "← Back to file"

let fileTable   = null;     //  the open file's table  (what a query asks about):   { table, file, sheet, others, engine }
let answer      = null;     //  the answer on screen:  { table, csv }   (null  =  the file is on screen)
let fileLook    = false;    //  the file's look,  to go back to
let queryId     = 0;        //  counts every Run.  (Run again while one is going?  The old one sees the number changed,  and quits.)
let handWritten = false;    //  did you type in the SQL box yourself?  (Then the builder stops writing over it.)
let queryFold   = null;     //  the "hide it once it's done folding" timer

//  What you picked in the builder.
let build = newBuild();

function newBuild() {
    return {
        show:    [],        //  which columns  ([]  =  all of them)
        filters: [],        //  [{ col, op, value }]
        any:     false,     //  false  =  keep rows that pass ALL the conditions.   true  =  ANY of them.
        group:   [],        //  group by these columns
        totals:  [],        //  [{ fn, col }]
        sort:    [],        //  [{ col, desc }]
        limit:   '',        //  at most this many rows  (''  =  no limit)
    };
}

//  Is a query's answer on screen  (not the file)?
function showingAnswer() {
    return sqlInfo !== null && sqlInfo.result !== undefined;
}

//  8 ms   ·   1.2 s
function formatTime(ms) {
    return ms < 1000 ? Math.max(1, Math.round(ms)) + ' ms' : (ms / 1000).toFixed(1) + ' s';
}
```

**The tables a query can use.** A CSV: its name without `.csv`. An Excel file: every sheet. A SQL dump: every table. The open one is ready; the others are read only when a question asks for them (and then remembered):

```js
//  ---- THE TABLES  (what the engine reads) ----

//  The open file's table's NAME,  for  FROM ...
function mainTableName() {
    const t = fileTable.table;
    if (t.excel !== null) return t.excel.sheetName;
    if (t.sql !== null) return t.sql.sheetName;
    return fileTable.file.name.replace(/\.[^.]*$/, '') || 'file';
}

//  The file's OTHER sheets  (or tables):  they can be used too  (they're read when a query asks for them).
function otherSheets() {
    const t = fileTable.table;
    const book = t.excel !== null ? t.excel : t.sql;
    if (book === null) return [];
    const list = [];
    book.sheets.forEach(function (sheet, i) {
        if (!sheet.chart && i + 1 !== book.sheetNumber) list.push({ name: sheet.name, index: i });
    });
    return list;
}

//  One row's text,  out of a table's long string  (like rowText,  for any table).
function tableRowText(table, i) {
    const start = table.starts[i];
    let end = table.starts[i + 1] - 1;
    if (end < table.text.length && end > start && table.text.charCodeAt(end - 1) === 13) end--;
    return table.text.slice(start, end);
}

//  A table,  the way the engine wants it  (see "THE TABLES" in queryI.js).
function engineTable(table, name) {
    const columns = table.header.slice();
    while (columns.length < table.longest.length) columns.push('');
    const sql = table.sql;
    const typed = sql !== null && sql.columns.length > 0 && sql.columns.every(function (c) { return c.type !== ''; });
    return {
        name: name,
        columns: columns,
        declared: typed ? sql.columns.map(function (c) { return c.type; }) : null,
        rowCount: table.count,
        row: function (i) { return splitIntoCells(tableRowText(table, i)); },
        isNull: sql !== null ? function (i, j) { return sqlIsNull(sql, i + 1, j); } : null,
        emptyIsNull: sql === null,         //  a CSV or Excel file:  an empty cell means NULL  (it has no other way to say it)
    };
}

//  Cut CSV text  (an Excel sheet or a SQL table,  turned into CSV by the translator)  into rows of cells.
function cutCsvText(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (quoted) {
            if (c === 34) {
                if (text.charCodeAt(i + 1) === 34) { cell += '"'; i++; }
                else quoted = false;
            } else cell += text[i];
        } else if (c === 34) quoted = true;
        else if (c === 44) { row.push(cell); cell = ''; }
        else if (c === 10) { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c !== 13) cell += text[i];
    }
    if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
    return rows;
}

//  Read ANOTHER sheet  (or table)  of the open file,  for a query that asks for it.
async function loadOtherTable(sheet, isCurrent) {

    const t = fileTable.table, file = fileTable.file;

    setLoadingLabel('Reading "' + sheet.name + '"...');
    const result = t.excel !== null
        ? await readXlsx(file, isCurrent, sheet.index)
        : await readSql(await file.text(), file, isCurrent, sheet.index);

    const rows = cutCsvText(result.text);
    const header = rows.length > 0 ? rows[0] : [];
    const data = rows.slice(1);
    let width = header.length;
    data.forEach(function (r) { if (r.length > width) width = r.length; });
    const columns = header.slice();
    while (columns.length < width) columns.push('');

    const sql = t.sql !== null ? result.info : null;
    const typed = sql !== null && sql.columns.length > 0 && sql.columns.every(function (c) { return c.type !== ''; });

    return {
        name: sheet.name,
        columns: columns,
        declared: typed ? sql.columns.map(function (c) { return c.type; }) : null,
        rowCount: data.length,
        row: function (i) { return data[i]; },
        isNull: sql !== null ? function (i, j) { return sqlIsNull(sql, i + 1, j); } : null,
        emptyIsNull: sql === null,
    };
}

//  The "catalog":  every table a query can use  (see runQuery in queryI.js).
function queryCatalog(isCurrent) {

    const main = fileTable.engine;
    const known = new Map([[main.name.toLowerCase(), main]]);
    fileTable.others.forEach(function (table, key) { known.set(key, table); });
    const others = otherSheets();
    const mine = fileTable;

    return {
        find: function (name) { return known.get(String(name).toLowerCase()) || null; },
        names: function () { return [main.name].concat(others.map(function (s) { return s.name; })); },
        prepare: async function (names) {
            for (const name of names) {
                const key = String(name).toLowerCase();
                if (known.has(key)) continue;
                const sheet = others.find(function (s) { return s.name.toLowerCase() === key; });
                if (sheet === undefined) continue;              //  (not a table at all:  the engine says so)
                const table = await loadOtherTable(sheet, isCurrent);
                if (!isCurrent() || mine !== fileTable) throw QUERY_STALE;
                mine.others.set(key, table);                    //  remembered,  so the next query doesn't read it again
                known.set(key, table);
            }
        },
    };
}
```

**A new file (or sheet) is open:** a fresh builder, for its columns.

```js
//  ---- A NEW FILE  (or sheet)  IS OPEN ----

function queryFileChanged() {

    const name = mainTableName();
    fileTable.engine = engineTable(fileTable.table, name);

    queryBtn.disabled = false;
    answer = null;
    queryExport.disabled = true;
    build = newBuild();
    handWritten = false;

    queryTitle.textContent = 'Query  ·  ' + name + '  ·  ' + fileTable.table.count.toLocaleString() + ' row' + (fileTable.table.count === 1 ? '' : 's');
    setQueryStatus('', false);
    drawBuilder();
    writeSql();
}
```

**The builder.** It's drawn again (all of it) whenever you pick something: it's small, and that keeps it simple. Typing in a value box only rewrites the SQL (redrawing would knock you out of the box mid-word):

```js
//  ---- THE BUILDER ----

//  Which conditions you can pick,  in plain words.
const FILTER_OPS = [
    ['=',        'is'],
    ['<>',       'is not'],
    ['>',        'is over'],
    ['>=',       'is at least'],
    ['<',        'is under'],
    ['<=',       'is at most'],
    ['contains', 'contains'],
    ['starts',   'starts with'],
    ['ends',     'ends with'],
    ['empty',    'is empty'],
    ['filled',   'is not empty'],
];

//  Which totals you can pick.   [what it's called here,  its SQL,  its nickname's start]
const TOTAL_FNS = [
    ['rows',     'COUNT(*)',       'count'],
    ['count',    'COUNT',          'count'],
    ['distinct', 'COUNT DISTINCT', 'different'],
    ['sum',      'SUM',            'sum'],
    ['avg',      'AVG',            'average'],
    ['min',      'MIN',            'smallest'],
    ['max',      'MAX',            'biggest'],
    ['median',   'MEDIAN',         'median'],
];
const TOTAL_WORDS = { rows: 'count rows', count: 'count', distinct: 'count different', sum: 'sum of', avg: 'average of', min: 'smallest', max: 'biggest', median: 'middle value of' };

function queryColumns() { return columnNames(fileTable.engine); }
function queryKinds()   { return columnKinds(fileTable.engine); }

//  A little drop-down list.   options  =  [[value, words]]
function pickList(options, chosen, label, onPick) {
    const list = document.createElement('select');
    list.setAttribute('aria-label', label);
    options.forEach(function (o) {
        const option = document.createElement('option');
        option.value = o[0];
        option.textContent = o[1];
        if (o[0] === chosen) option.selected = true;
        list.appendChild(option);
    });
    list.addEventListener('change', function () { onPick(list.value); });
    return list;
}

//  "+ column ▾":  a list that starts on its own words,  and adds what you pick.
function addList(words, options, label, onPick) {
    const list = pickList([['', words]].concat(options), '', label, function (v) { if (v !== '') onPick(v); });
    list.classList.add('query-add');
    return list;
}

function smallButton(words, label, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'query-x';
    b.textContent = words;
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
}

//  A chip:   [ city  × ]
function chip(words, onRemove) {
    const c = document.createElement('span');
    c.className = 'query-chip';
    c.textContent = words;
    c.appendChild(smallButton('×', 'Remove ' + words, onRemove));
    return c;
}

//  The nicknames the totals get  (count,  sum_price ...),  in order.
function totalNames() {
    const used = new Set(build.group.map(function (g) { return g.toLowerCase(); }));
    return build.totals.map(function (t) {
        const fn = TOTAL_FNS.find(function (f) { return f[0] === t.fn; });
        let name = t.fn === 'rows' ? 'count' : fn[2] + '_' + String(t.col).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        let n = name, k = 2;
        while (used.has(n)) n = name + '_' + k++;
        used.add(n);
        return n;
    });
}

//  Draw the builder  (all of it,  every time something is picked:  it's small).
function drawBuilder() {

    queryBuilder.textContent = '';
    if (fileTable === null) return;

    const columns = queryColumns();
    const colOptions = columns.map(function (c) { return [c, c]; });
    const grouped = build.group.length > 0 || build.totals.length > 0;

    function section(words, fill) {
        const row = document.createElement('div');
        row.className = 'query-row';
        const name = document.createElement('span');
        name.className = 'query-label';
        name.textContent = words;
        const box = document.createElement('div');
        box.className = 'query-pick';
        fill(box);
        row.append(name, box);
        queryBuilder.appendChild(row);
    }

    function changed() { drawBuilder(); writeSql(); }

    //  SHOW
    section('Show', function (box) {
        if (grouped) {
            const note = document.createElement('span');
            note.className = 'query-hint';
            note.textContent = 'the groups and their totals  (below)';
            box.appendChild(note);
            return;
        }
        if (build.show.length === 0) {
            const all = document.createElement('span');
            all.className = 'query-hint';
            all.textContent = 'all columns';
            box.appendChild(all);
        }
        build.show.forEach(function (c, k) {
            box.appendChild(chip(c, function () { build.show.splice(k, 1); changed(); }));
        });
        const left = colOptions.filter(function (o) { return build.show.indexOf(o[0]) === -1; });
        if (left.length > 0) box.appendChild(addList('+ column', left, 'Add a column to show', function (v) { build.show.push(v); changed(); }));
    });

    //  KEEP ROWS
    section('Keep rows', function (box) {
        build.filters.forEach(function (f, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(colOptions, f.col, 'Column', function (v) { f.col = v; changed(); }));
            line.appendChild(pickList(FILTER_OPS, f.op, 'Condition', function (v) { f.op = v; changed(); }));
            if (f.op !== 'empty' && f.op !== 'filled') {
                const value = document.createElement('input');
                value.type = 'text';
                value.className = 'query-value';
                value.value = f.value;
                value.placeholder = 'value';
                value.setAttribute('aria-label', 'Value');
                value.addEventListener('input', function () { f.value = value.value; writeSql(); });
                line.appendChild(value);
            }
            line.appendChild(smallButton('×', 'Remove this condition', function () { build.filters.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        if (build.filters.length > 1) {
            box.appendChild(pickList([['all', 'all of these'], ['any', 'any of these']], build.any ? 'any' : 'all', 'Keep rows that pass',
                                     function (v) { build.any = v === 'any'; changed(); }));
        }
        box.appendChild(addList('+ condition', colOptions, 'Add a condition', function (v) { build.filters.push({ col: v, op: '=', value: '' }); changed(); }));
    });

    //  GROUP BY
    section('Group by', function (box) {
        build.group.forEach(function (c, k) {
            box.appendChild(chip(c, function () { build.group.splice(k, 1); changed(); }));
        });
        const left = colOptions.filter(function (o) { return build.group.indexOf(o[0]) === -1; });
        if (left.length > 0) box.appendChild(addList('+ column', left, 'Group by a column', function (v) { build.group.push(v); changed(); }));
    });

    //  TOTALS
    section('Totals', function (box) {
        build.totals.forEach(function (t, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), t.fn, 'Total', function (v) {
                t.fn = v;
                if (v !== 'rows' && t.col === null) t.col = columns[0];
                changed();
            }));
            if (t.fn !== 'rows') line.appendChild(pickList(colOptions, t.col, 'Of which column', function (v) { t.col = v; changed(); }));
            line.appendChild(smallButton('×', 'Remove this total', function () { build.totals.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        box.appendChild(addList('+ total', TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), 'Add a total', function (v) {
            build.totals.push({ fn: v, col: v === 'rows' ? null : columns[0] });
            changed();
        }));
    });

    //  SORT BY   (grouped:  by a group,  or by a total)
    section('Sort by', function (box) {
        const sortOptions = grouped
            ? build.group.map(function (g) { return [g, g]; }).concat(totalNames().map(function (n) { return [n, n]; }))
            : colOptions;
        build.sort = build.sort.filter(function (s) { return sortOptions.some(function (o) { return o[0] === s.col; }); });
        build.sort.forEach(function (s, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(sortOptions, s.col, 'Sort by', function (v) { s.col = v; changed(); }));
            line.appendChild(pickList([['up', '↑ low to high'], ['down', '↓ high to low']], s.desc ? 'down' : 'up', 'Which way',
                                      function (v) { s.desc = v === 'down'; changed(); }));
            line.appendChild(smallButton('×', 'Remove this sort', function () { build.sort.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        if (sortOptions.length > 0) box.appendChild(addList('+ column', sortOptions, 'Sort by a column', function (v) { build.sort.push({ col: v, desc: false }); changed(); }));
    });

    //  AT MOST
    section('At most', function (box) {
        const limit = document.createElement('input');
        limit.type = 'number';
        limit.min = '1';
        limit.className = 'query-value query-limit';
        limit.placeholder = 'all';
        limit.value = build.limit;
        limit.setAttribute('aria-label', 'At most this many rows');
        limit.addEventListener('input', function () { build.limit = limit.value; writeSql(); });
        const words = document.createElement('span');
        words.className = 'query-hint';
        words.textContent = 'rows';
        box.append(limit, words);
    });

    queryBuilder.classList.toggle('paused', handWritten);
}
```

**The SQL it writes.** Names get quotes only when they need them (`city`, but `"Sales Data"` and `"order"`). A value you type is a number for a number column, words (in `'quotes'`) otherwise:

```js
//  ---- THE SQL IT WRITES ----

//  A name,  in quotes only if it needs them:   city    "Sales Data"    "order"
const NEEDS_QUOTES = new Set(['TRUE', 'FALSE', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'CASE', 'CAST', 'EXISTS']);
function sqlName(name) {
    const n = String(name);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !SQL_RESERVED.has(n.toUpperCase()) && !NEEDS_QUOTES.has(n.toUpperCase())
        ? n
        : '"' + n.split('"').join('""') + '"';
}

//  Words,  in single quotes:   'Chicago'    'it''s'
function sqlWordsOf(text) {
    return "'" + String(text).split("'").join("''") + "'";
}

//  A value you typed:  a number stays a number  (for a column of numbers),  anything else is words.
function sqlValueOf(text, kind) {
    const t = String(text).trim();
    if ((kind === 'int' || kind === 'real' || kind === 'num') && NUMBER_WORDS.test(t)) return t;
    return sqlWordsOf(text);
}

//  For  contains / starts with / ends with:   LIKE '%Chi%'   (a  %  or  _  you typed is marked with  !  so it counts as itself)
function likeOf(text, before, after) {
    const v = String(text);
    const marked = /[!%_]/.test(v);
    const safe = marked ? v.replace(/[!%_]/g, function (c) { return '!' + c; }) : v;
    return 'LIKE ' + sqlWordsOf(before + safe + after) + (marked ? " ESCAPE '!'" : '');
}

function builderSql() {

    //  (A column's TYPE is only worked out when a condition needs it:  that looks at up to 20,000 rows,
    //   too much to do for every new file just in case.)
    const columns = queryColumns();
    function kindOf(col) { return queryKinds()[columns.indexOf(col)]; }

    const grouped = build.group.length > 0 || build.totals.length > 0;
    const names = totalNames();
    const lines = [];

    //  SELECT
    let show;
    if (grouped) {
        show = build.group.map(sqlName).concat(build.totals.map(function (t, k) {
            const what = t.fn === 'rows' ? 'COUNT(*)'
                : t.fn === 'distinct' ? 'COUNT(DISTINCT ' + sqlName(t.col) + ')'
                : TOTAL_FNS.find(function (f) { return f[0] === t.fn; })[1] + '(' + sqlName(t.col) + ')';
            return what + ' AS ' + sqlName(names[k]);
        }));
    } else {
        show = build.show.length > 0 ? build.show.map(sqlName) : ['*'];
    }
    lines.push('SELECT ' + show.join(', '));

    //  FROM
    lines.push('FROM ' + sqlName(fileTable.engine.name));

    //  WHERE
    const tests = build.filters.map(function (f) {
        const c = sqlName(f.col);
        switch (f.op) {
            case 'empty':    return c + ' IS NULL';
            case 'filled':   return c + ' IS NOT NULL';
            case 'contains': return c + ' ' + likeOf(f.value, '%', '%');
            case 'starts':   return c + ' ' + likeOf(f.value, '', '%');
            case 'ends':     return c + ' ' + likeOf(f.value, '%', '');
            default:         return c + ' ' + f.op + ' ' + sqlValueOf(f.value, kindOf(f.col));
        }
    });
    if (tests.length > 0) lines.push('WHERE ' + tests.join(build.any ? '\n   OR ' : '\n  AND '));

    //  GROUP BY
    if (build.group.length > 0) lines.push('GROUP BY ' + build.group.map(sqlName).join(', '));

    //  ORDER BY
    if (build.sort.length > 0) lines.push('ORDER BY ' + build.sort.map(function (s) { return sqlName(s.col) + (s.desc ? ' DESC' : ''); }).join(', '));

    //  LIMIT
    const limit = parseInt(build.limit, 10);
    if (limit > 0) lines.push('LIMIT ' + limit);

    return lines.join('\n');
}

//  Put the builder's SQL in the box  (unless you're writing your own).
function writeSql() {
    if (fileTable === null || handWritten) return;
    querySql.value = builderSql();
}

//  You typed in the box?  Then it's YOUR SQL now:  the builder steps aside.
querySql.addEventListener('input', function () {
    if (handWritten) return;
    handWritten = true;
    queryBuilder.classList.add('paused');
    queryNote.textContent = 'you\'re writing it yourself  ·  the builder is paused';
    queryReset.hidden = false;
});

queryReset.addEventListener('click', function () {
    handWritten = false;
    queryBuilder.classList.remove('paused');
    queryNote.textContent = 'written for you as you pick  ·  or type your own';
    queryReset.hidden = true;
    writeSql();
});

//  Ctrl + Enter  (or Cmd + Enter on a Mac)  in the box  =  Run.
querySql.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runTheQuery();
    }
});

function setQueryStatus(words, bad) {
    queryStatus.textContent = words;
    queryStatus.classList.toggle('bad', bad);
}
```

| Code | Baby words |
|---|---|
| `'it''s'` | A `'` inside words is written twice. Without that, `O'Neil` would end the words early (and that's how "SQL injection" attacks work!). |
| `LIKE '%50!%%' ESCAPE '!'` | You searched for `50%`. A `%` you TYPE is marked with `!`, so it means a real `%`, not "any letters". |
| `handWritten` | You typed in the box? It's yours now: the builder fades and stops writing over it. "Use the builder again" brings it back. |

**Run it, show the answer, Back to file, Copy, Export:**

```js
//  ---- RUN IT ----

function runTheQuery() {

    if (fileTable === null) return;

    const text   = querySql.value;
    const myRun  = ++queryId;
    const myLoad = loadId;
    function isCurrent() { return myRun === queryId && myLoad === loadId; }

    setQueryStatus('Running...', false);
    startLoading('Running the query...');
    const started = performance.now();

    runQuery(text, queryCatalog(isCurrent), isCurrent, function (done) {
        setProgress(0.9 * done);
        setLoadingLabel('Running the query...  ' + Math.floor(100 * done) + '%');
    }).then(function (result) {

        if (!isCurrent()) return;
        return showAnswer(result, text, performance.now() - started, isCurrent);

    }).then(function () {

        if (!isCurrent()) return;
        finishLoading();

    }, function (problem) {

        if (!isCurrent() || problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        finishLoading();
        setQueryStatus(queryProblem(problem), true);
    });
}

queryRun.addEventListener('click', runTheQuery);


//  Turn the answer into a table  (the same kind the brain keeps for a file),  and put it on screen.
//  It's written straight into one long string,  and where each row starts is written down as it goes:
//  so it never has to be cut up again.   (In bites:  a million-row answer never freezes the page.)
//
//  Careful with memory:  a 10,000-column answer is 100 million cells.
//    -  Each line is glued with  join,  never  line += cell.   (+= keeps every little piece alive until the very end:
//       about 60 bytes a cell,  so a 500 MB answer needed 5+ GB,  and the tab crashed.   join makes ONE flat string.)
//    -  Each of the engine's rows is let go once it's written,  so the rows and the text are never both whole.
async function showAnswer(result, text, ms, isCurrent) {

    setLoadingLabel('Laying out the answer...');

    const cols    = result.columns;
    const rows    = result.rows;
    const types   = cols.map(function (c) { return c.type; });
    const header  = cols.map(function (c) { return c.name; });
    const longest = header.map(function (n) { return n.length; });
    const starts  = new Uint32Array(rows.length + 1);
    const nullRows = [], nullCols = [];
    const parts = [];
    const cells = new Array(cols.length);
    let at = 0;
    let work = 0;                                       //  cells written since the clock was last checked
    let stopAt = performance.now() + CHUNK_TIME;

    for (let r = 0; r < rows.length; r++) {

        work += cols.length;
        if (((r & 1023) === 1023 || work >= BITE_CELLS) && performance.now() >= stopAt) {
            setProgress(0.9 + 0.1 * r / rows.length);
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
        if (work >= BITE_CELLS) work = 0;

        starts[r] = at;
        const row = rows[r];
        rows[r] = null;                                 //  (written down now:  the engine's copy can go)
        for (let c = 0; c < cols.length; c++) {
            const v = row[c];
            if (v === null) { nullRows.push(r + 1); nullCols.push(c); }
            const cell = queryCellText(v, types[c]);
            if (cell.length > longest[c]) longest[c] = cell.length;
            cells[c] = /[",\r\n]/.test(cell) ? '"' + cell.split('"').join('""') + '"' : cell;
        }
        const line = cells.join(',') + '\n';
        parts.push(line);
        at += line.length;
    }
    starts[rows.length] = at;

    //  The SQL notes,  so the TABLE LOOK can show the answer's column types and its NULLs  (like a SQL dump's table).
    const info = {
        file: null, dialect: '', sheetName: 'Result', sheetNumber: 1, sheetCount: 1, sheets: [],
        columns: cols.map(function (c) { return { name: c.name, type: queryTypeName(c.type), pk: false }; }),
        rows: rows.length,
        nullCount: nullRows.length,
        nullRows: Uint32Array.from(nullRows),
        nullCols: Uint16Array.from(nullCols),
        result: { sql: text, ms: ms, rows: rows.length, from: mainTableName() },
    };

    const table = {
        header: header, text: parts.join(''), starts: starts, count: rows.length, longest: longest,
        excel: null, sql: info, name: fileTable.file.name,
        note: result.count > 1 ? '  ·  ran the last of ' + result.count + ' queries' : '',
    };

    if (!showingAnswer()) fileLook = excelLook;         //  (remember the file's look,  for "← Back to file")
    swapIn(table, true);
    answer = { table: table };
    queryExport.disabled = false;
    setQueryStatus(rows.length.toLocaleString() + ' row' + (rows.length === 1 ? '' : 's') + '  ·  ' + formatTime(ms), false);
    closeQueryMenu();                                   //  out of the way,  so you can see the answer
}


//  ← BACK TO FILE:  the file was only put aside.   Put it back.
function backToFile() {
    if (fileTable === null || !showingAnswer()) return;
    queryId++;                                          //  (a query still running?  It stops.)
    swapIn(fileTable.table, fileLook);
    answer = null;                                      //  let the answer go  (a big one is as big as a file)
    queryExport.disabled = true;
    setQueryStatus('', false);
}

backBtn.addEventListener('click', backToFile);


//  COPY SQL   (the browser's clipboard.   An older browser?  The old way:  select it,  and "copy".)
queryCopy.addEventListener('click', function () {
    const done = function () { setQueryStatus('SQL copied', false); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(querySql.value).then(done, copyTheOldWay);
    } else copyTheOldWay();

    function copyTheOldWay() {
        querySql.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { setQueryStatus('Couldn\'t copy:  select the SQL and press Ctrl + C', true); }
    }
});


//  EXPORT CSV:  the answer,  saved as a CSV file  ("sales-query.csv").
queryExport.addEventListener('click', function () {
    if (answer === null) return;
    const head = answer.table.header.map(function (n) { return /[",\r\n]/.test(n) ? '"' + n.split('"').join('""') + '"' : n; }).join(',');
    const blob = new Blob([head + '\n' + answer.table.text], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileTable.file.name.replace(/\.[^.]*$/, '') + '-query.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
});
```

| Code | Baby words |
|---|---|
| `queryId` | Every Run gets a number. Run again while one is going? The old one sees the number changed, and quits. |
| `showAnswer` | The answer is written straight into one long string, and where each row starts is written down AS IT GOES: so it never has to be cut up again. |
| `cells.join(',')` | Each line is glued in ONE go. Gluing with `line += cell` looks the same, but the browser secretly keeps every little piece until the end (about 60 bytes a cell): a `SELECT *` on a 500 MB file needed over 5 GB, and the tab crashed. `join` makes one flat line. |
| `rows[r] = null` | That row is written down now, so the engine's copy can go. The rows and the text are never both whole at once. |
| `answer = null` (in `backToFile`) | Back to the file? The answer is let go, and Export turns off. (A big answer is as big as a file.) |
| `info.result` | The answer is shown in the TABLE look (Part 9): its column types on top, NULLs shown faintly. |
| `URL.createObjectURL(blob)` | Turns the answer into a pretend web address the browser can "download". (No server: it never leaves your computer.) |

**Unfold and fold up** (the theme menu's way: Part 4):

```js
//  ---- UNFOLD  /  FOLD UP   (out of the Query button,  like the theme menu out of its chip) ----

function queryMenuOpen() {
    return !queryMenu.classList.contains('closed') && !queryMenu.classList.contains('folded');
}

//  How small is "folded"?  Exactly the button's size.
function measureQueryFold() {
    queryMenu.style.setProperty('--fold-x', queryBtn.offsetWidth  / Math.max(queryMenu.offsetWidth, 1));
    queryMenu.style.setProperty('--fold-y', queryBtn.offsetHeight / Math.max(queryMenu.offsetHeight, 1));
}

function openQueryMenu() {
    if (fileTable === null) return;
    showRow(false);                                     //  (the Details panel lives in the same spot)
    clearTimeout(queryFold);
    if (queryMenu.classList.contains('closed')) {
        measureQueryFold();
        queryMenu.classList.remove('closed');
        void queryMenu.offsetWidth;                     //  (make the browser notice that first)
    }
    queryMenu.classList.remove('folded');
    queryBtn.setAttribute('aria-expanded', 'true');
}

function closeQueryMenu() {
    if (!queryMenuOpen()) return;
    measureQueryFold();
    queryMenu.classList.add('folded');
    queryBtn.setAttribute('aria-expanded', 'false');
    clearTimeout(queryFold);
    queryFold = setTimeout(function () { queryMenu.classList.add('closed'); }, 480);
}

queryBtn.addEventListener('click', function () {
    if (queryMenuOpen()) closeQueryMenu(); else openQueryMenu();
});

queryClose.addEventListener('click', function () {
    closeQueryMenu();
    queryBtn.focus();
});

//  Click somewhere that's NOT the menu or its button  ->  fold up.
//  (Not while the loader is up:  a query is running,  and its answer will close it anyway.)
document.addEventListener('click', function (event) {
    //  (The click's PATH,  as it was when it started:  the  ×  you click is gone by now  (the builder was redrawn),
    //   but it WAS inside the menu.)
    const path = event.composedPath();
    if (queryMenuOpen() && path.indexOf(queryMenu) === -1 && path.indexOf(queryBtn) === -1 && loader.hidden) {
        closeQueryMenu();
    }
});

//  Escape  ->  fold up.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && queryMenuOpen()) {
        closeQueryMenu();
        queryBtn.focus();
    }
});
```

> **`event.composedPath()`?** Click the `×` on a chip: the builder is redrawn, and that `×` is GONE from the page before the "clicked outside?" check runs. The path is the list of pieces the click went through WHEN it happened, so the check still knows it was inside the menu.

<br>

### Step 10.16: The clothes

**1.** Right after the Details panel's rules (before the "Reading from..." ones):

```css
/*  ---- THE QUERY BUTTON  +  THE QUERY MENU ----

    "Query"  is the bar's 3rd square:  SQL blue  (it speaks SQL,  like the table look).
    It UNFOLDS the query menu,  right under the bar,  out of its own corner  (like the theme menu out of its chip):

         ┌─────────────┬───────────────────────────────┬───────┐
         │ Choose File │  the aimbot window            │ Query │
         └─────────────┴───────────────────────────────┴───────┘
                     ┌───────────────────────────────────────────┐
                     │▓ Query  ·  sales  ·  1,204 rows         × ▓│   <-  SQL blue
                     ├───────────┬───────────────────────────────┤
                     │ Show      │ ░ all columns  [+ column ▾]  ░│   <-  the builder:  a little sheet.
                     │ Keep rows │ ░ [city ▾][is ▾][Chicago] ×  ░│       names on the left,  what you pick on the right
                     │ ...       │                               │
                     ├───────────┴───────────────────────────────┤
                     │ SQL  written for you as you pick ...      │
                     │ ░ SELECT * FROM sales WHERE ...         ░ │   <-  the SQL box  (letters that line up,  like code)
                     │ [Run ▶] [Copy SQL] [Export CSV]   12 rows │
                     └───────────────────────────────────────────┘
*/
#queryBtn {
    margin: 0;
    padding: 0 18px;
    color: #fff;
    background: var(--sql-dark);
    border: none;
    border-left: 1px solid var(--line, rgba(255, 255, 255, 0.6));  /*  the white line between the squares  */
    border-radius: 0;
    text-shadow: 0 0 8px var(--sql-glow);
    box-shadow: inset 0 0 12px var(--sql-glow);
}

#queryBtn:disabled {
    opacity: 0.45;
    filter: none;
    cursor: default;
}

#queryBtn[aria-expanded="true"] {
    filter: brightness(1.15);
}

#queryMenu {
    position: absolute;
    top: calc(100% + 6px);          /*  just under the bar  */
    right: 0;                       /*  lined up with the Query button's side  */
    z-index: 9;                     /*  over the search bar and the sheet  (like the Details panel)  */
    width: max(100%, 680px);
    max-width: calc(100vw - 32px);
    box-sizing: border-box;
    overflow: hidden;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 13px;

    /*  The same glass as the CSV window  */
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-edge);
    border-radius: 12px;
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 var(--shine, rgba(255, 255, 255, 0.9));

    transform-origin: top right;    /*  grow out from the button's corner  */
    will-change: transform;
    transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
}

/*  CLOSED  +  FOLDED:  the theme menu's way  (see "THE FLOATING THEME MENU"),  with an SQL-blue cover.  */
#queryMenu.closed {
    visibility: hidden;
}

#queryMenu::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    background: var(--sql-dark);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease 0.26s;
}

#queryMenu.folded {
    transform: scale(var(--fold-x, 0.15), var(--fold-y, 0.1));
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.14s;
}

#queryMenu.folded::after {
    opacity: 1;
    transition: opacity 0.16s ease;
}

/*  Its top line:   Query  ·  sales  ·  1,204 rows        ×   (a dark square,  in SQL blue)  */
.query-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 12px;
    line-height: 28px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 0 8px var(--sql-glow);
    background: var(--sql-dark);
    box-shadow: inset 0 0 12px var(--sql-glow);
}

#queryTitle {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

#queryClose {
    margin: 0;
    padding: 0 8px;
    line-height: 20px;
    border-radius: 6px;
}


/*  THE BUILDER:  one row per part  (Show,  Keep rows,  Group by ...).
    The name on the left is a header square,  what you pick is a light square:  like the sheet.  */
.query-row {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

.query-label {
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-weight: 600;
    background: var(--header-bg);
    border-right: 1px solid var(--line-grid, rgba(255, 255, 255, 0.5));
}

.query-pick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    padding: 5px 8px;
    background: var(--square-light);
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));
}

/*  You're writing your own SQL?  The builder fades,  and can't be clicked  ("Use the builder again" brings it back).  */
#queryBuilder.paused {
    opacity: 0.45;
    pointer-events: none;
}

/*  One condition  (or total,  or sort):   [city ▾] [is ▾] [Chicago] ×  */
.query-line {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

/*  The little drop-down lists and boxes:  small light squares  */
#queryMenu select,
.query-value {
    box-sizing: border-box;
    height: 26px;
    padding: 0 6px;
    font: inherit;
    color: var(--text);
    background: var(--glass-top);
    border: 1px solid var(--glass-edge);
    border-radius: 7px;
}

#queryMenu select:focus-visible,
.query-value:focus {
    outline: none;
    box-shadow:
        inset 0 0 0 1px var(--glow-edge, rgba(255, 255, 255, 0.95)),
        0 0 10px 1px var(--glow, rgba(255, 255, 255, 0.9));
}

.query-value  { width: 120px; }
.query-limit  { width: 80px; }

/*  "+ column ▾",  "+ condition ▾" ...:  the lists that ADD something.  Quieter,  with a dashed edge.  */
#queryMenu select.query-add {
    color: var(--text-soft);
    background: transparent;
    border-style: dashed;
}

/*  A chip:   [ city  × ]   (a dark square,  like a picked sheet tab)  */
.query-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 24px;
    padding: 0 2px 0 9px;
    color: #fff;
    background: var(--square-dark);
    border-radius: 7px;
    box-shadow: inset 0 0 10px color-mix(in srgb, var(--theme-glow) 35%, transparent);
}

/*  The little  ×  buttons  */
.query-x {
    margin: 0;
    padding: 0 6px;
    line-height: 20px;
    font-size: 13px;
    color: inherit;
    background: transparent;
    border: none;
    border-radius: 6px;
    box-shadow: none;
}

.query-x:hover {
    background: var(--hover-fill, rgba(255, 255, 255, 0.35));
    box-shadow: none;
}

.query-hint {
    color: var(--text-soft);
}


/*  THE SQL:  its line on top,  then the box.  */
.query-sql-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 4px;
    color: var(--text-soft);
}

/*  The little  SQL  tag:  SQL blue,  like the PK badge  */
.query-sql-label {
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 17px;
    color: #fff;
    background: var(--sql);
    border-radius: 4px;
}

#queryReset {
    margin: 0 0 0 auto;
    padding: 0 10px;
    line-height: 22px;
    font-size: 12px;
    border-radius: 8px;
}

/*  The box:  letters that all take the same room  (so the SQL lines up,  like code)  */
#querySql {
    display: block;
    box-sizing: border-box;
    width: calc(100% - 20px);
    margin: 0 10px;
    padding: 8px 10px;
    min-height: 92px;
    resize: vertical;
    font-family: Consolas, "Cascadia Mono", Menlo, monospace;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
    background: var(--square-light);
    border: 1px solid var(--glass-edge);
    border-radius: 8px;
    box-shadow: inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8));
    tab-size: 4;
}

#querySql:focus {
    outline: none;
    box-shadow:
        inset 0 0 0 1px var(--glow-edge, rgba(255, 255, 255, 0.95)),
        0 0 14px 2px var(--glow, rgba(255, 255, 255, 0.9));
}

/*  The bottom line:   [Run ▶] [Copy SQL] [Export CSV]            12 rows  ·  8 ms  */
.query-foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px 10px;
}

.query-foot button {
    margin: 0;
    line-height: 30px;
}

/*  Run:  SQL blue  (the main thing to press)  */
#queryRun,
#backBtn {
    color: #fff;
    background: var(--sql-dark);
    text-shadow: 0 0 8px var(--sql-glow);
    box-shadow: 0 0 12px var(--sql-glow);
}

#queryRun:hover,
#backBtn:hover {
    box-shadow: 0 0 18px 2px var(--sql-glow);
}

#queryExport:disabled {
    opacity: 0.45;
    filter: none;
    cursor: default;
}

#queryStatus {
    margin-left: auto;
    color: var(--text-soft);
    white-space: pre-wrap;
}

/*  Something went wrong:  the words say what  (in a soft red,  easy to spot)  */
#queryStatus.bad {
    flex-basis: 100%;
    margin-left: 0;
    color: #a3212c;
    font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
    #queryMenu,
    #queryMenu::after { transition: none; }
}
```

**2.** In Neo-Dark's bending glass, add the query menu to the list:

```css
[data-theme="neo-dark"] #aimRow,
[data-theme="neo-dark"] #queryMenu,
[data-theme="neo-dark"] #themeMenu {
    backdrop-filter: url(#glassWarp) blur(3px);
```

| Code | Baby words |
|---|---|
| `width: max(100%, 680px)` | At least as wide as the bar, and at least 680px (the builder needs room). |
| `transform-origin: top right` | It grows out of the Query button's corner. |
| `font-family: Consolas, ... monospace` | In the SQL box, every letter takes the same room, so the SQL lines up, like code. |
| `#queryBuilder.paused` | Faded, and `pointer-events: none` (clicks go right through it): you're writing your own SQL. |

<br>

### ✅ Test it

The test tables are in `Castle Claude/small-files/query/`:

1. Open `orders.csv`. **Query** turns on (SQL blue). Click it: the menu unfolds out of it. The box says `SELECT * FROM orders`.
2. **Keep rows**: + condition -> `qty`, `is at least`, `8`. The SQL updates as you type: `WHERE qty >= 8` (no quotes: it's a number column).
3. **Group by** `status`, **Totals** + `count rows`, **Sort by** `count`, `↓ high to low`. Click **Run**: a little table of 4 statuses, biggest first, in the table look (`TEXT`, `INTEGER` on top). The badge says `QUERY RESULT · 4 rows · from orders`.
4. Search inside the answer. Flip it to the CSV look. Then **← Back to file**: the whole file, instantly.
5. Type your own: `SELECT * FROM orders WHERE discount IS NULL LIMIT 5`. The builder fades. Ctrl + Enter runs it. The discounts are a faint NULL.
6. A mistake: `SELECT nope FROM orders`: the menu says, in red, which columns there ARE. `UPDATE orders SET qty = 0`: refused (it only reads).
7. Open `mysql.sql` (Part 9's dump) and run `SELECT c.name, SUM(o.qty) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name`: a JOIN of 2 of its tables.
8. **Export CSV**: the answer, saved as `orders-query.csv`.

<br>

---

<br>

# PART 11: Query Flexibility, Type Mode, and Click a Cell ✨

Part 10 gave the page a real query engine. But a real engine is STRICT: one wrong word and it says no. And the SQL people type FIRST is hardly ever perfect:

| You type | The strict engine says | With Query Flexibility it runs |
|---|---|---|
| `select from orders` | ❌ Expected a value | `select * from orders` |
| `selct * form orders` | ❌ A query starts with SELECT | `SELECT * FROM orders` |
| `select * from orders.csv` | ❌ There's no table named csv | `select * from orders` |
| `select * where qty > 5` | ❌ SELECT * needs a FROM | `select * FROM orders where qty > 5` |
| `... where status = shipped` | ❌ There's no column named shipped | `... where status = 'shipped'` |
| `... where status contains 'ship'` | ❌ Expected the query to end here | `... where status LIKE '%ship%'` |
| `select status, count(*) from orders` | ❌ status has to be in GROUP BY | `... GROUP BY status` |
| `... where status = 'Shipped'` | ⚠️ **0 rows** (the file says `shipped`) | `... where status = 'shipped'` |
| `... where ordered > 2024-05-01` | ⚠️ **all 400 rows** (that's MATH: 2024 − 5 − 1 = 2018) | `... where ordered > '2024-05-01'` |

Those last two are the sneaky ones: no error, just a wrong answer.

This part adds 3 things:

```text
   ┌───────────────────────────────────────────────────────────────┐
   │ SQL  [✓] Query Flexibility   [ ] Type mode   written for you  │   <- 1. two checkboxes
   │ ░ select * from orders                                      ░ │
   │ ┃ The builder can't show:  UPPER(status).  [Drop it] [Keep typing]   <- 2. it ASKS first
   │ Query Flexibility fixed:   added  *   (all the columns)       │
   │ [Run ▶] [Copy SQL] [Export CSV]               400 rows · 8 ms │
   └───────────────────────────────────────────────────────────────┘

   │ Ana     │ 123 Main St, Apt 4…[expand?]│      <- 3. rest the mouse on a cell:  "expand?"
                                                         click it  ->  the Details panel, for THAT row
```

1. **Query Flexibility** (on at the start, the tooltip calls it "snap to result"): small mistakes get fixed, and it SAYS what it changed. Your SQL still runs exactly as written whenever it can: fixing only starts when it can't.
2. **Type mode** (off at the start): click in the SQL box and it turns on. The builder greys out while you type. Untick it, and your SQL **snaps back into the builder's buttons**, so the builder works like a SQL-less GUI. If part of it can't be shown as buttons (a JOIN, a CASE), it asks first.
3. **Click a cell** → its Details. Before, the Details panel (Part 6) only showed a search match. Now any cell works.

> **Building in order?** Parts 4–10 show the files as they were at their own stage. This part changes a few lines in what Part 10 built: when a step says "replace", find the old lines from Part 10.

<br>

### Step 11.1: The skeleton

**1.** In the query menu, the SQL line gets the 2 checkboxes. ("Use the builder again" is gone: unticking Type mode does that now.) Replace the whole `query-sql-head` line:

```html
            <div class="query-sql-head">
                <span class="query-sql-label">SQL</span>
                <label class="query-option" title="Snap to result:  small SQL mistakes get fixed  (a typo,  a missing FROM,  words without quotes ...),  and what you type snaps into the builder's buttons">
                    <input type="checkbox" id="queryFlex" checked> Query Flexibility
                </label>
                <label class="query-option" title="Type your own SQL  (the builder is greyed out while you do)">
                    <input type="checkbox" id="queryType"> Type mode
                </label>
                <span id="querySqlNote">written for you as you pick</span>
            </div>
```

| Code | Baby words |
|---|---|
| `<label>` around the box | Clicking the WORDS ticks the box too. |
| `checked` | Query Flexibility starts ticked. Type mode doesn't. |
| `title="Snap to result: ..."` | What shows up when you hover it. |

**2.** Right after the SQL box (`<textarea id="querySql" ...>`), the question it asks, and the line that says what got fixed:

```html
            <!--  Leaving type mode,  but some of your SQL doesn't fit the builder?  It ASKS first.  -->
            <div id="queryAsk" role="alertdialog" aria-live="polite" hidden>
                <span id="queryAskWords"></span>
                <button id="queryAskYes" type="button">Drop them</button>
                <button id="queryAskNo" type="button">Keep typing</button>
            </div>
            <!--  What Query Flexibility fixed  (in words)  -->
            <div id="queryFixes" hidden></div>
```

**3.** The "expand?" tag, right after drag mode's anchor (`<div id="dragAnchor" hidden></div>`):

```html
    <!--  The "expand?" tag:  rest the mouse on a cell for a moment,  and it shows up on its corner.
          (Click the cell  ->  the Details panel,  for that cell's whole row.)  -->
    <div id="cellTag" aria-hidden="true" hidden>expand?</div>
```

> `aria-hidden="true"` tells screen readers to skip it: it's only a hint for the eyes. The cell itself is what you click.

<br>

### Step 11.2: The engine says WHAT went wrong

To fix a mistake, the fixer has to know what the mistake WAS. Words like "There's no column named shipped" are for people. So every problem now carries a second, short note for the code, called `why`:

```js
//  why  =  the same problem,  for the code  (Query Flexibility reads it to fix the question):
//      { kind: 'parse', tok }        the words stopped making sense at token number  tok
//      { kind: 'column', name }      no column with that name
//      { kind: 'table', name }       no table with that name
//      { kind: 'group', name }       that column has to be in GROUP BY
//      { kind: 'nofrom' }            SELECT *  with no FROM
//      { kind: 'unclosed', close }   a quote never ends
function queryFail(words, why) {
    const problem = new QueryError(words);
    problem.why = why || null;
    throw problem;
}
```

Then give each problem its `why`. Add the second part to these `queryFail(...)` lines (in this order in `queryI.js`):

```js
            if (end === -1) queryFail(what + ' never ends  (a  ' + close + '  is missing).', { kind: 'unclosed', close: close });
```

```js
        if (t.k === 'end') queryFail(words + '  (at the end of the query).', { kind: 'parse', tok: i });
        const shown = text.slice(t.at, tk[i + 1].at).trim() || t.v;
        queryFail(words + '  (near  ' + shown + lineNote(text, t.at) + ').', { kind: 'parse', tok: i });
```

```js
                queryFail('The column  ' + ref.name + '  has to be in GROUP BY,  or inside a total  (like  MAX(' + ref.name + ')  or  COUNT(' + ref.name + ')).',
                          { kind: 'group', name: ref.name });
```

```js
              { kind: 'column', name: ref.name });
```

```js
                      { kind: 'table', name: item.name });
```

```js
        if (it.table === null && src.cols.length === 0) queryFail('SELECT *  needs a FROM  (a table to show).', { kind: 'nofrom' });
```

| `why` | Means | The fix it leads to |
|---|---|---|
| `parse`, `tok` | The words stopped making sense at token number `tok` | Look at that word, and the one before it |
| `column`, `name` | No column with that name | A typo? Words without quotes? No FROM? |
| `table`, `name` | No table with that name | `orders.csv` → `orders`, or the only table there is |
| `group` | A plain column next to a total | Add `GROUP BY` |
| `nofrom` | `SELECT *` with nothing to show | Add `FROM` the open table |
| `unclosed` | A quote that never ends | Add the missing `'` |

**Every token remembers where it ENDS, too.** (It already knew where it starts: `at`.) Then a fix can swap ONE word for another and leave the rest of your SQL (your spaces, your new lines) just as you wrote it. At the top of the loop in `sqlTokens`:

```js
        //  (The token just read ends here:  Query Flexibility needs to know,  to swap one word for another.)
        if (tokens.length > 0 && tokens[tokens.length - 1].to === undefined) tokens[tokens.length - 1].to = p;
```

<br>

### Step 11.3: Run = try, fix ONE thing, try again

`runQuery` gets a 5th thing, `flexible` (is the box ticked?). Add it to the notes above `runQuery`:

```js
//    flexible     Query Flexibility  (see FLEXIBILITY below):  small mistakes get fixed,  and the answer also has
//                     sql:    the question that really ran
//                     fixes:  what was changed,  in words   ([]  =  nothing:  it ran just as you wrote it)
```

Then split `runQuery` in 3, so it can TRY a question without running it (replace the whole old `runQuery`):

```js
async function runQuery(text, catalog, isCurrent, progress, flexible) {

    const flex = { fixes: [], grouped: false };         //  what Query Flexibility changed  (and did it add a GROUP BY?)
    let sql = flexible ? flexTraps(text, catalog, flex) : text;
    let ready = null;

    //  Try it.   Wrong?  Fix ONE thing,  and try again  (each try is only reading + compiling:  quick).
    for (let round = 0; ready === null; round++) {
        try {
            ready = await readyQuery(sql, catalog, isCurrent);
        } catch (problem) {
            if (!flexible || !(problem instanceof QueryError)) throw problem;
            const better = round < FLEX_ROUNDS ? flexFix(sql, problem, catalog, flex) : null;
            if (better === null || better === sql) {
                problem.sql = sql;                      //  (what it got to,  so the brain can show where it's stuck)
                problem.fixes = flex.fixes;
                throw problem;
            }
            sql = better;
        }
    }

    let answer = await runPlan(ready, isCurrent, progress);

    //  SNAP TO RESULT:  no rows,  but a word you compared to is in the file spelled a little differently?
    if (flexible && answer.rows.length === 0) {
        const snapped = await flexSnap(sql, ready.picked, catalog, isCurrent);
        if (snapped !== null) {
            const again = await runPlan(await readyQuery(snapped.sql, catalog, isCurrent), isCurrent, progress);
            if (again.rows.length > 0) {
                sql = snapped.sql;
                answer = again;
                flex.fixes.push.apply(flex.fixes, snapped.fixes);
            }
        }
    }

    answer.ran = ready.statements.length;
    answer.count = ready.statements.length;
    answer.sql = sql;
    answer.fixes = flex.fixes;
    const looks = answerLooks(ready.picked, ready.plan, catalog);
    answer.columns.forEach(function (c, k) { c.look = looks[k]; });
    return answer;
}
```

...and below it, its 2 new helpers:

```js
//  Read a question,  get its tables ready,  and compile it.   (Nothing runs yet.)
async function readyQuery(text, catalog, isCurrent) {

    const statements = parseSql(text);
    if (statements.length === 0) queryFail('There\'s no question yet.  Try:   SELECT * FROM ' + (catalog.names()[0] || 'your_table'));
    const picked = statements[statements.length - 1];

    if (picked.t === 'write') {
        queryFail(picked.verb + '  would change the data,  so it can\'t run here:  this tool only READS  (your file is never changed).  ' +
                  'Try a SELECT,  like:   SELECT * FROM ' + (catalog.names()[0] || 'your_table') + ' LIMIT 10');
    }

    //  Which tables does it use?   Get them ready first  (another sheet of the file has to be read).
    const wanted = new Set();
    walkQuery(picked, function (item) { if (item.t === 'table') wanted.add(item.name); });
    await catalog.prepare(Array.from(wanted));
    if (!isCurrent()) throw QUERY_STALE;

    //  Their column types:  worked out first,  in bites  (then compiling just reads them).
    //  Only the columns the question NAMES   (SELECT *,  or a NATURAL / USING join:  all of them).
    const named = new Set();
    let everything = false;
    (function look(node) {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(look); return; }
        if (node.t === 'col') named.add(String(node.name).toLowerCase());
        if (node.star === true && node.t === undefined) everything = true;          //  SELECT *   /   t.*
        if (node.t === 'join' && (node.natural || node.using)) everything = true;
        for (const k in node) if (node[k] !== null && typeof node[k] === 'object') look(node[k]);
    })(picked);
    let stopAt = performance.now() + CHUNK_TIME;
    for (const name of wanted) {
        const table = catalog.find(name);
        if (table === null) continue;                   //  (a WITH table,  or a mistake:  compiling says so)
        const only = everything ? undefined : [];
        if (!everything) columnNames(table).forEach(function (n, j) { if (named.has(n.toLowerCase())) only.push(j); });
        const looking = lookAtKinds(table, only);
        while (!looking.next().done) {
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
    }

    const plan = compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
    return { statements: statements, picked: picked, plan: plan, stopAt: stopAt };
}

//  Run a compiled question,  in bites.
//  (The clock carries on from getting ready:  the first bite is ONE bite long,  not getting-ready + a bite.)
async function runPlan(ready, isCurrent, progress) {

    const plan = ready.plan;
    const gen = plan.run({ outer: [] }, Infinity);
    let stopAt = ready.stopAt !== undefined ? ready.stopAt : performance.now() + CHUNK_TIME;

    for (;;) {
        const step = gen.next();
        if (step.done) {
            return {
                columns: plan.cols.map(function (c) { return { name: c.name, type: c.ty }; }),
                rows: step.value,
            };
        }
        if (performance.now() >= stopAt) {
            if (typeof step.value === 'number' && progress) progress(step.value);
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
    }
}
```

```text
   runQuery
     │
     ├─ flexTraps         the 2 sneaky ones  (dates without quotes,  a missing comma between 2 columns)
     │
     ├─ readyQuery  ──✗──>  flexFix  (ONE fix)  ──>  readyQuery again ...      (up to 10 times)
     │       │
     │       ✓  (it reads, and it compiles)
     │
     ├─ runPlan          the rows,  in bites  (like before)
     │
     └─ 0 rows?  ──>  flexSnap  (a word spelled a little differently in the file?)  ──>  runPlan again
```

| Code | Baby words |
|---|---|
| `readyQuery` | Read it, get its tables ready, compile it. Nothing runs yet, so trying again is quick. |
| `runPlan` | Run what `readyQuery` made, in bites. |
| `better === sql` | A "fix" that changes nothing isn't a fix. Stop (or it could go round and round). |
| `problem.sql` / `problem.fixes` | It couldn't fix everything? The brain still shows how far it got, so the problem's words line up with the SQL in the box. |
| `statements.length === 0` | An EMPTY box used to crash. Now it says "There's no question yet". |

<br>

### Step 11.4: The fixer (`FLEXIBILITY`, at the end of `queryI.js`)

**1.** What it is, and its lists:

```js
//    FLEXIBILITY   ("Query Flexibility":  the checkbox in the query menu,  on at the start)
//
//    The SQL people type FIRST is hardly ever perfect:
//
//        select from orders                     ->   SELECT * FROM orders
//        selct * form orders                    ->   SELECT * FROM orders
//        select * from orders.csv               ->   SELECT * FROM orders
//        select * where qty > 5                 ->   SELECT * FROM orders WHERE qty > 5
//        ... where status = shipped             ->   ... where status = 'shipped'
//        ... where statuss = 'shipped'          ->   ... where status = 'shipped'
//        ... where status contains 'ship'       ->   ... where status LIKE '%ship%'
//        select status, count(*) from orders    ->   ... GROUP BY status
//        ... where qty >                        ->   (the unfinished end is left out)
//
//    THE RULE:  your SQL runs EXACTLY as you wrote it,  if it can.   Only when it CAN'T  (a mistake),
//    that one mistake gets fixed,  and it tries again  (up to FLEX_ROUNDS times).
//    Every fix is written down in words  (flex.fixes),  so the page can tell you what changed.
//
//    Two traps are fixed even though they'd run,  because they'd QUIETLY give the wrong answer:
//        ordered > 2024-05-01      that's MATH  (2024 - 5 - 1 = 2018),  not a date     ->   '2024-05-01'
//        select status qty ...     that's  status  nicknamed "qty".   But qty is a column:  a comma is missing.
//
//    And one after it runs:  SNAP TO RESULT.   No rows,  because you asked for  status = 'Shipped'
//    and the file only ever says  'shipped'?   It snaps to how the file spells it,  and runs again.
//
// ----------------------------------------------------------

const FLEX_ROUNDS = 10;                         //  at most this many fixes  (then it says what's still wrong)

//  The words that start a part of a query:  a typo of one  (form,  wher,  oder,  limt ...)  gets fixed.
const FLEX_CLAUSES = ['SELECT', 'FROM', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'AND'];

//  Words people use for SELECT.
const FLEX_SELECT = new Set(['SHOW', 'GET', 'FIND', 'LIST', 'DISPLAY', 'PICK']);

//  A file's ending,  written as part of a table's name   (orders.csv  ->  orders)
const FLEX_ENDINGS = /\.(csv|tsv|txt|xlsx|xlsm|xls|sql|json|db)$/i;

//  Where an unfinished end gets cut off   (... WHERE qty >   ->   cut from WHERE)
const FLEX_CUT_AT = new Set(['WHERE', 'AND', 'OR', 'HAVING', 'LIMIT', 'OFFSET', 'ON', 'BY']);

//  The parts that come after FROM  /  after GROUP BY   (a new FROM  /  GROUP BY  goes in front of the first one there is)
const FLEX_AFTER_FROM  = new Set(['WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT']);
const FLEX_AFTER_GROUP = new Set(['HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT']);
```

**2.** Little helpers. The most important one is `flexClosest`: "which ONE name is this word closest to?" Close means: the same when written loosely (`Customer_ID` = `customer id`), or 1 letter off (2 for longer words). Two names just as close? It doesn't guess.

```js
//  A name,  as SQL:   status    "customer id"    "order"
function flexName(name) {
    const n = String(name);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !SQL_RESERVED.has(n.toUpperCase()) ? n : '"' + n.split('"').join('""') + '"';
}

//  Words,  as SQL:   'shipped'    'it''s'
function flexWords(text) {
    return "'" + String(text).split("'").join("''") + "'";
}

//  contains  /  starts with  /  ends with,  as SQL:   LIKE '%ship%'    (a  %  or  _  in the word is marked with  !)
function flexLike(value, before, after) {
    const v = String(value);
    const marked = /[!%_]/.test(v);
    const safe = marked ? v.replace(/[!%_]/g, function (c) { return '!' + c; }) : v;
    return 'LIKE ' + flexWords(before + safe + after) + (marked ? " ESCAPE '!'" : '');
}

//  Names,  compared loosely:   Customer_ID  =  customer id  =  customerid
function flexKey(name) {
    return String(name).toLowerCase().replace(/[\s_\-.]+/g, '');
}

//  Words,  compared loosely:   ' Shipped '  =  'shipped'
function flexLoose(text) {
    return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

//  How many letters have to change to get from  a  to  b   (put one in,  take one out,  swap one,  or turn 2 around).
function flexDistance(a, b) {
    const d = [];
    for (let x = 0; x <= a.length; x++) d.push([x]);
    for (let y = 1; y <= b.length; y++) d[0][y] = y;
    for (let x = 1; x <= a.length; x++) {
        for (let y = 1; y <= b.length; y++) {
            d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
            if (x > 1 && y > 1 && a[x - 1] === b[y - 2] && a[x - 2] === b[y - 1]) d[x][y] = Math.min(d[x][y], d[x - 2][y - 2] + 1);
        }
    }
    return d[a.length][b.length];
}

//  The ONE name closest to a word   (null:  none is close,  or two are just as close:  then don't guess).
//  Close  =  the same written loosely,  or 1 letter off  (2 for a word of 5 letters or more).
function flexClosest(word, names) {
    const key = flexKey(word);
    const same = names.filter(function (n) { return flexKey(n) === key; });
    if (same.length > 0) return same.length === 1 ? same[0] : null;
    const most = key.length <= 4 ? 1 : 2;
    let best = null, bestDistance = most + 1, tie = false;
    names.forEach(function (n) {
        const d = flexDistance(key, flexKey(n));
        if (d < bestDistance) { best = n; bestDistance = d; tie = false; }
        else if (d === bestDistance) tie = true;
    });
    return best !== null && !tie && bestDistance < key.length ? best : null;
}

//  How deep inside  ( )  each token is.
function flexDepths(tk) {
    const depth = [];
    let d = 0;
    tk.forEach(function (t) {
        if (t.k === 'op' && t.v === ')') d = Math.max(0, d - 1);
        depth.push(d);
        if (t.k === 'op' && t.v === '(') d++;
    });
    return depth;
}

function flexIsWord(t, u) { return t !== undefined && t.k === 'id' && t.u === u; }
function flexIsOp(t, v)   { return t !== undefined && t.k === 'op' && t.v === v; }
function flexIsName(t)    { return t !== undefined && (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))); }

//  Put words in at a spot  (with a space on each side,  if there isn't one already).
function flexInsert(sql, at, words) {
    const before = sql.slice(0, at), after = sql.slice(at);
    return before + (before === '' || /\s$/.test(before) ? '' : ' ') + words + (after === '' || /^[\s;)]/.test(after) ? '' : ' ') + after;
}

//  The columns of the tables the question reads  (the ones after FROM and JOIN).   None found?  The open table's.
function flexColumnsFor(tk, catalog) {
    const list = [];
    for (let j = 1; j < tk.length; j++) {
        if ((flexIsWord(tk[j - 1], 'FROM') || flexIsWord(tk[j - 1], 'JOIN')) && (tk[j].k === 'id' || tk[j].k === 'qid')) {
            const table = catalog.find(tk[j].v);
            if (table !== null) columnNames(table).forEach(function (c) { if (list.indexOf(c) === -1) list.push(c); });
        }
    }
    if (list.length > 0) return list;
    const names = catalog.names();
    const main = names.length > 0 ? catalog.find(names[0]) : null;
    return main === null ? [] : columnNames(main);
}
```

> **`flexDistance`?** How many letters you'd have to change to get from one word to the other. `statuss` → `status` = 1 (take one out). `form` → `from` = 1 (turn 2 around). It fills in a little grid, one letter pair at a time (it's called "edit distance").

**3.** The 2 traps: SQL that RUNS, but means something you didn't. These are fixed before the first try:

```js
//  THE TRAPS:  SQL that runs,  but means something you didn't.   (Fixed before the first try.)
function flexTraps(sql, catalog, flex) {

    let tk;
    try { tk = sqlTokens(sql); } catch (problem) { return sql; }       //  (it can't even be read:  that's fixed later)

    const edits = [];                                                   //  [from, to, new words]

    //  1.  A date without quotes:   2024-05-01   (or  2024/5/1)   ->   '2024-05-01'
    for (let j = 0; j + 4 < tk.length; j++) {
        const y = tk[j], d1 = tk[j + 1], m = tk[j + 2], d2 = tk[j + 3], d = tk[j + 4];
        if (y.k !== 'num' || m.k !== 'num' || d.k !== 'num' || d1.k !== 'op' || d2.k !== 'op') continue;
        if (!((d1.v === '-' && d2.v === '-') || (d1.v === '/' && d2.v === '/'))) continue;
        if (y.to !== d1.at || d1.to !== m.at || m.to !== d2.at || d2.to !== d.at) continue;     //  written as ONE thing,  no spaces
        const ys = sql.slice(y.at, y.to), ms = sql.slice(m.at, m.to), ds = sql.slice(d.at, d.to);
        if (!/^\d{4}$/.test(ys) || !/^\d{1,2}$/.test(ms) || !/^\d{1,2}$/.test(ds)) continue;
        if (+ms < 1 || +ms > 12 || +ds < 1 || +ds > 31) continue;
        const date = flexWords(ys + '-' + ('0' + ms).slice(-2) + '-' + ('0' + ds).slice(-2));
        edits.push([y.at, d.to, date]);
        flex.fixes.push(sql.slice(y.at, d.to) + '  ->  ' + date + '   (a date:  without quotes it\'s math)');
        j += 4;
    }

    //  2.  Two columns in a SELECT list with no comma:   select status qty   ->   select status, qty
    const depth = flexDepths(tk);
    const columns = flexColumnsFor(tk, catalog).map(function (c) { return c.toLowerCase(); });
    for (let j = 0; j < tk.length; j++) {
        if (!flexIsWord(tk[j], 'SELECT')) continue;
        for (let k = j + 1; k + 1 < tk.length; k++) {
            if (depth[k] < depth[j] || (depth[k] === depth[j] && (flexIsWord(tk[k], 'FROM') || flexIsOp(tk[k], ';')))) break;
            const a = tk[k], b = tk[k + 1];
            if (depth[k] !== depth[j] || !flexIsName(a) || !flexIsName(b)) continue;
            if (flexIsOp(tk[k - 1], '.') || flexIsWord(tk[k - 1], 'AS') || flexIsOp(tk[k + 2], '.') || flexIsOp(tk[k + 2], '(')) continue;
            if (columns.indexOf(a.v.toLowerCase()) === -1 || columns.indexOf(b.v.toLowerCase()) === -1) continue;
            edits.push([a.to, a.to, ',']);
            flex.fixes.push(sql.slice(a.at, b.to) + '  ->  ' + sql.slice(a.at, a.to) + ', ' + sql.slice(b.at, b.to) + '   (a missing comma:  both are columns)');
        }
    }

    edits.sort(function (x, y) { return y[0] - x[0]; });                 //  (from the end backward,  so the spots don't move)
    edits.forEach(function (e) { sql = sql.slice(0, e[0]) + e[2] + sql.slice(e[1]); });
    return sql;
}
```

> **Why only when it's written as ONE thing?** `2024-05-01` (no spaces) is a date. `2024 - 5 - 1` (with spaces) is someone doing math on purpose: left alone.

**4.** ONE fix for a problem. Each `why` has its own list of rules, tried in order:

```js
//  ONE fix for this problem   ->   the new SQL   (or null:  this one can't be fixed).
function flexFix(sql, problem, catalog, flex) {

    const why = problem.why;
    if (!why) return null;

    //  A quote that never ends:  end it  (at the very end,  before a last  ;).
    if (why.kind === 'unclosed') {
        const end = sql.replace(/[\s;]+$/, '').length;
        flex.fixes.push('added the missing  ' + why.close + '  at the end');
        return sql.slice(0, end) + why.close + sql.slice(end);
    }

    const tk = sqlTokens(sql);
    const depth = flexDepths(tk);
    const names = catalog.names();
    const main = names.length > 0 ? names[0] : null;
    const columns = flexColumnsFor(tk, catalog);

    function say(words) { flex.fixes.push(words); }
    function words(from, to) { return sql.slice(tk[from].at, tk[to].to).replace(/\s+/g, ' '); }
    function swap(t, to, now) { return sql.slice(0, t.at) + now + sql.slice(to.to); }

    //  The statement a token is in   (between  ;  marks):   [start,  end)
    function start(i) { let j = i; while (j > 0 && !(flexIsOp(tk[j - 1], ';') && depth[j - 1] === 0)) j--; return j; }
    function end(i)   { let j = i; while (tk[j].k !== 'end' && !(flexIsOp(tk[j], ';') && depth[j] === 0)) j++; return j; }

    //  The first token from  a  to  b,  at depth  d,  that passes the test   (-1  =  none)
    function find(a, b, d, test) {
        for (let j = a; j < b; j++) if (depth[j] === d && test(tk[j])) return j;
        return -1;
    }
    function isFrom(t) { return flexIsWord(t, 'FROM'); }

    function columnFor(word) {
        const key = flexKey(word);
        const found = columns.filter(function (c) { return flexKey(c) === key; });
        return found.length === 1 ? found[0] : null;
    }

    function tableFor(word) {
        const exact = names.filter(function (n) { return n.toLowerCase() === String(word).toLowerCase(); });
        return exact.length === 1 ? exact[0] : flexClosest(String(word).replace(FLEX_ENDINGS, ''), names);
    }

    //  No FROM:  the open file's table   (in front of WHERE,  GROUP BY ...  or at the end)
    function addFrom(i) {
        if (main === null) return null;
        const s = start(i), e = end(i);
        const spot = find(s + 1, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_FROM.has(t.u); });
        say('added  FROM ' + flexName(main) + '   (the open file\'s table)');
        return flexInsert(sql, spot === -1 ? tk[e].at : tk[spot].at, 'FROM ' + flexName(main));
    }

    //  Is token j a VALUE  (not a column)?   After  =  <  LIKE  BETWEEN,  or in an  IN (...)  list.
    function isValueSpot(j) {
        const p = tk[j - 1];
        if (p === undefined) return false;
        if (p.k === 'op' && COMPARE_SYMBOLS.has(p.v)) return true;
        if (flexIsWord(p, 'LIKE') || flexIsWord(p, 'ILIKE') || flexIsWord(p, 'BETWEEN')) return true;
        for (let k = j - 1; k > 0; k--) {
            const t = tk[k];
            if (flexIsOp(t, '(')) return flexIsWord(tk[k - 1], 'IN');
            if (!(flexIsOp(t, ',') || t.k === 'str' || t.k === 'num' || t.k === 'id' || t.k === 'qid')) return false;
        }
        return false;
    }


    //  ---- THE WORDS STOPPED MAKING SENSE  (at token i) ----
    if (why.kind === 'parse') {

        const i = why.tok;
        const t = tk[i], prev = tk[i - 1], next = tk[i + 1];
        const s = start(i);
        const atEnd = t.k === 'end' || flexIsOp(t, ';');

        //  1.  The very start:   selct ...    show ...    from orders    orders    status, qty from orders
        if (i === s) {
            if (t.k === 'id' && (FLEX_SELECT.has(t.u) || flexClosest(t.u, ['SELECT']) === 'SELECT')) {
                say(sql.slice(t.at, t.to) + '  ->  SELECT');
                return swap(t, t, 'SELECT');
            }
            if (flexIsWord(t, 'FROM')) { say('added  SELECT *  in front'); return flexInsert(sql, t.at, 'SELECT *'); }
            if (flexIsName(t) && catalog.find(t.v) !== null &&
                (next.k === 'end' || flexIsOp(next, ';') || (next.k === 'id' && FLEX_AFTER_FROM.has(next.u)))) {
                say('added  SELECT * FROM  in front');
                return flexInsert(sql, t.at, 'SELECT * FROM');
            }
            if (flexIsName(t) || flexIsOp(t, '*')) { say('added  SELECT  in front'); return flexInsert(sql, t.at, 'SELECT'); }
            return null;
        }

        //  2.  Nothing to show:   SELECT FROM orders    (SELECT DISTINCT FROM ...)    SELECT  (and nothing)
        const afterSelect = flexIsWord(prev, 'SELECT') ||
            ((flexIsWord(prev, 'DISTINCT') || flexIsWord(prev, 'ALL')) && flexIsWord(tk[i - 2], 'SELECT'));
        if (afterSelect && (atEnd || flexIsOp(t, ')') || (t.k === 'id' && (t.u === 'FROM' || FLEX_AFTER_FROM.has(t.u))))) {
            say('added  *   (all the columns)');
            return flexInsert(sql, prev.to, '*');
        }

        //  3.  No table after FROM  (or JOIN):   FROM    FROM order    FROM WHERE ...    FROM all
        if (flexIsWord(prev, 'FROM') || flexIsWord(prev, 'JOIN')) {
            if (t.k === 'id' && SQL_RESERVED.has(t.u)) {
                const table = tableFor(t.v);                    //  a table called that  (or nearly):   order  ->  orders
                if (table !== null) { say(sql.slice(t.at, t.to) + '  ->  ' + flexName(table)); return swap(t, t, flexName(table)); }
            }
            //  The next part of the query starts right away  (FROM WHERE ...):  the table's name goes in FRONT of it.
            if (main !== null && (atEnd || flexIsOp(t, ')') || (t.k === 'id' && FLEX_AFTER_FROM.has(t.u)))) {
                say('added the table  ' + flexName(main));
                return flexInsert(sql, prev.to, flexName(main));
            }
            //  Something that can't be a table  (FROM all,  FROM *,  FROM 2024):  with ONE table,  it means that one.
            //  (Several tables,  like a SQL dump's?  Which one?  Don't guess.)
            if (main !== null && names.length === 1 && ((t.k === 'id' && SQL_RESERVED.has(t.u)) || flexIsOp(t, '*') || t.k === 'num' || t.k === 'str')) {
                say(sql.slice(t.at, t.to) + '  ->  ' + flexName(main) + '   (the open file\'s table)');
                return swap(t, t, flexName(main));
            }
        }

        //  4.  ORDER  /  GROUP  without  BY
        if ((flexIsWord(prev, 'ORDER') || flexIsWord(prev, 'GROUP')) && !flexIsWord(t, 'BY')) {
            say('added  BY  after  ' + prev.u);
            return flexInsert(sql, prev.to, 'BY');
        }

        //  5.  A  (  that never closes
        if (atEnd && depth[i] > 0 && problem.message.indexOf('Expected  )') === 0) {
            say('added the missing  )');
            return sql.slice(0, prev.to) + ')' + sql.slice(prev.to);
        }

        //  6.  It stopped at the END:  the end is unfinished.   Leave it out   (... WHERE qty >   ...  LIMIT   select status,)
        if (atEnd) {
            let cut = -1;
            for (let j = i - 1; j > s && cut === -1; j--) {
                if (depth[j] === depth[i] && ((tk[j].k === 'id' && FLEX_CUT_AT.has(tk[j].u)) || flexIsOp(tk[j], ','))) cut = j;
            }
            if (cut === -1) return null;
            if (flexIsWord(tk[cut], 'BY') && (flexIsWord(tk[cut - 1], 'ORDER') || flexIsWord(tk[cut - 1], 'GROUP'))) cut--;
            say('left out the unfinished  ' + words(cut, i - 1));
            return sql.slice(0, tk[cut].at).replace(/\s+$/, '') + sql.slice(prev.to);
        }

        //  7.  A comma with nothing after it:   select status, from orders
        if (flexIsOp(prev, ',') && t.k === 'id' && SQL_RESERVED.has(t.u)) {
            say('took out the extra  ,  before  ' + t.u);
            return sql.slice(0, tk[i - 2].to) + sql.slice(prev.to);
        }

        //  8.  The word BEFORE this one was a typo of a part's first word,  read as a NICKNAME:
        //          from orders wher qty > 5     ("orders,  nicknamed wher")
        //          from orders oder by qty      select status form orders
        if (prev.k === 'id' && !SQL_RESERVED.has(prev.u) && catalog.find(prev.v) === null && columnFor(prev.v) === null) {
            const word = prev.u === 'SORT' ? 'ORDER' : flexClosest(prev.u, FLEX_CLAUSES);
            if (word !== null && word !== prev.u && word !== 'SELECT') {
                const now = (word === 'ORDER' || word === 'GROUP') && !flexIsWord(t, 'BY') ? word + ' BY' : word;
                say(sql.slice(prev.at, prev.to) + '  ->  ' + now);
                return swap(prev, prev, now);
            }
        }

        //  9.  A table's name,  with no FROM in front:   select * orders
        if (flexIsName(t) && catalog.find(t.v) !== null && find(s, i, depth[i], isFrom) === -1) {
            say('added  FROM  in front of  ' + sql.slice(t.at, t.to));
            return flexInsert(sql, t.at, 'FROM');
        }

        //  10.  Other words for ORDER BY:   sort by qty    orderby qty
        if (flexIsWord(t, 'SORT') || flexIsWord(t, 'ORDERBY') || flexIsWord(t, 'GROUPBY')) {
            const now = t.u === 'GROUPBY' ? 'GROUP BY' : 'ORDER BY';
            const last = t.u === 'SORT' && flexIsWord(next, 'BY') ? next : t;
            say(sql.slice(t.at, last.to) + '  ->  ' + now);
            return swap(t, last, now);
        }

        //  11.  contains  /  starts with  /  ends with   (the builder's words)   ->   LIKE
        const withWord = t.k === 'id' && (t.u === 'STARTS' || t.u === 'BEGINS' || t.u === 'ENDS') && flexIsWord(next, 'WITH');
        if (withWord || (t.k === 'id' && (t.u === 'CONTAINS' || t.u === 'HAS' || t.u === 'INCLUDES'))) {
            const v = withWord ? tk[i + 2] : next;
            if (v !== undefined && (v.k === 'str' || v.k === 'num' || v.k === 'id' || v.k === 'qid')) {
                const value = v.k === 'num' ? sql.slice(v.at, v.to) : v.v;
                const like = flexLike(value, t.u === 'STARTS' || t.u === 'BEGINS' ? '' : '%', t.u === 'ENDS' ? '' : '%');
                say(sql.slice(t.at, v.to) + '  ->  ' + like);
                return swap(t, v, like);
            }
        }

        //  12.  A typo of a part's first word:   form  ->  FROM    wher  ->  WHERE    oder  ->  ORDER BY
        //       (Not if it's really a column or a table:  then it's something else.)
        if (t.k === 'id' && catalog.find(t.v) === null && columnFor(t.v) === null) {
            const word = flexClosest(t.u, FLEX_CLAUSES);
            if (word !== null && word !== t.u) {
                const now = (word === 'ORDER' || word === 'GROUP') && !flexIsWord(next, 'BY') ? word + ' BY' : word;
                say(sql.slice(t.at, t.to) + '  ->  ' + now);
                return swap(t, t, now);
            }
        }

        //  13.  A name in 2 words:   customer id   ->   customer_id
        if (flexIsName(prev) && t.k === 'id') {
            const column = columnFor(prev.v + ' ' + t.v);
            if (column !== null) { say(sql.slice(prev.at, t.to) + '  ->  ' + flexName(column)); return swap(prev, t, flexName(column)); }
        }

        //  14.  A missing comma in the SELECT list:   select status count(*)    select status qty count
        let select = -1;
        for (let j = i - 1; j >= s && select === -1; j--) if (depth[j] === depth[i] && flexIsWord(tk[j], 'SELECT')) select = j;
        if (select !== -1 && find(select, i, depth[i], isFrom) === -1) {
            if (flexIsOp(t, '(') && flexIsName(prev) && i - 2 > select) {
                say('added a missing  ,  before  ' + sql.slice(prev.at, prev.to));
                return sql.slice(0, tk[i - 2].to) + ',' + sql.slice(tk[i - 2].to);
            }
            if (flexIsName(t) || t.k === 'num' || t.k === 'str') {
                say('added a missing  ,  before  ' + sql.slice(t.at, t.to));
                return sql.slice(0, prev.to) + ',' + sql.slice(prev.to);
            }
        }

        return null;
    }


    //  ---- SELECT *  WITH NO FROM ----
    if (why.kind === 'nofrom') return addFrom(0);


    //  ---- NO COLUMN WITH THAT NAME ----
    if (why.kind === 'column') {

        const key = String(why.name).toLowerCase();
        const spots = [];
        tk.forEach(function (t, j) {
            if ((t.k === 'id' || t.k === 'qid') && t.v.toLowerCase() === key && !flexIsOp(tk[j + 1], '(')) spots.push(j);
        });
        if (spots.length === 0) return null;
        const j = spots[0];

        //  a.  No FROM at all   (select status where qty > 5):   it's the open file's table.
        if (find(start(j), end(j), 0, isFrom) === -1) return addFrom(j);

        //  b.  A name in 2 words:   customer id   ->   customer_id
        if (flexIsName(tk[j + 1])) {
            const column = columnFor(tk[j].v + ' ' + tk[j + 1].v);
            if (column !== null) { say(words(j, j + 1) + '  ->  ' + flexName(column)); return swap(tk[j], tk[j + 1], flexName(column)); }
        }
        if (flexIsName(tk[j - 1])) {
            const column = columnFor(tk[j - 1].v + ' ' + tk[j].v);
            if (column !== null) { say(words(j - 1, j) + '  ->  ' + flexName(column)); return swap(tk[j - 1], tk[j], flexName(column)); }
        }

        //  c.  A VALUE without its quotes   (status = shipped,   status = "shipped"):   words
        if (isValueSpot(j)) {
            say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexWords(tk[j].v) + '   (words go in single quotes)');
            return swap(tk[j], tk[j], flexWords(tk[j].v));
        }

        //  d.  A typo:   statuss  ->  status   (every time it's written)
        const column = flexClosest(why.name, columns);
        if (column !== null && column.toLowerCase() !== key) {
            say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexName(column));
            let out = sql;
            for (let k = spots.length - 1; k >= 0; k--) out = out.slice(0, tk[spots[k]].at) + flexName(column) + out.slice(tk[spots[k]].to);
            return out;
        }
        return null;
    }


    //  ---- NO TABLE WITH THAT NAME ----
    if (why.kind === 'table') {

        const key = String(why.name).toLowerCase();
        if (names.some(function (n) { return n.toLowerCase() === key; })) return null;     //  (it's there:  something else is wrong)

        const spots = [];
        tk.forEach(function (t, j) { if ((t.k === 'id' || t.k === 'qid') && t.v.toLowerCase() === key) spots.push(j); });
        if (spots.length === 0) return null;
        const j = spots[0];

        //  a.  orders.csv   (read as  "the table csv,  in orders")   ->   orders
        if (flexIsOp(tk[j - 1], '.') && FLEX_ENDINGS.test('.' + tk[j].v) && flexIsName(tk[j - 2])) {
            say(words(j - 2, j) + '  ->  ' + sql.slice(tk[j - 2].at, tk[j - 2].to));
            return sql.slice(0, tk[j - 2].to) + sql.slice(tk[j].to);
        }

        //  b.  "orders.csv"  /  a near miss  /  the only table there is
        let now = tableFor(why.name);
        let note = '';
        if (now === null && names.length === 1) { now = main; note = '   (the open file\'s table)'; }
        if (now === null) return null;
        say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexName(now) + note);
        let out = sql;
        for (let k = spots.length - 1; k >= 0; k--) out = out.slice(0, tk[spots[k]].at) + flexName(now) + out.slice(tk[spots[k]].to);
        return out;
    }


    //  ---- A COLUMN THAT HAS TO BE IN GROUP BY   (select status, count(*) from orders) ----
    if (why.kind === 'group') {

        const key = String(why.name).toLowerCase();
        let j = 0;
        while (tk[j].k !== 'end' && !((tk[j].k === 'id' || tk[j].k === 'qid') && tk[j].v.toLowerCase() === key)) j++;
        const s = start(j), e = end(j);
        const group = find(s, e, 0, function (t) { return flexIsWord(t, 'GROUP'); });

        if (group !== -1) {
            if (!flex.grouped) return null;             //  YOUR GROUP BY:  how you meant it isn't clear.  Don't guess.
            const after = find(group + 2, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_GROUP.has(t.u); });
            const at = tk[(after === -1 ? e : after) - 1].to;
            say('added  ' + flexName(why.name) + '  to the GROUP BY');
            return sql.slice(0, at) + ', ' + flexName(why.name) + sql.slice(at);
        }

        const from = find(s, e, 0, isFrom);
        if (from === -1) return null;
        const spot = find(from + 1, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_GROUP.has(t.u); });
        flex.grouped = true;
        say('added  GROUP BY ' + flexName(why.name) + '   (a total needs groups)');
        return flexInsert(sql, spot === -1 ? tk[e].at : tk[spot].at, 'GROUP BY ' + flexName(why.name));
    }

    return null;
}
```

| Rule | Example | Why it's in THIS order |
|---|---|---|
| A table name with no FROM before it | `select * orders` | BEFORE the typo rule: `orders` is 1 letter from `ORDER`! |
| The word BEFORE was a typo | `from orders wher qty > 5` | SQL reads `orders wher` as "orders, nicknamed wher". The mistake is only noticed at `qty`, one word late. |
| A typo of a part's first word | `form`, `oder`, `limt` | Not if it's really a column or a table's name. |
| The unfinished end is left out | `... where qty >` | Cut at the last `WHERE` / `AND` / `,` ... and say so. |
| Words without quotes | `status = shipped` | Only in a VALUE spot (after `=`, `LIKE`, inside `IN (...)`). Anywhere else, it's more likely a column typo. |

**5.** Fix it without running it (for the builder, Step 11.5):

```js
//  Fix a question WITHOUT running it   (for the builder:  your SQL,  snapped into its buttons).
//      ->  { sql,  fixes }     (still wrong at the end?  sql is as far as the fixing got)
//  (Right away,  not in bites:  it only reads and compiles.   Another sheet that isn't read yet stays as it is.)
function flexSync(text, catalog) {
    const flex = { fixes: [], grouped: false };
    let sql = flexTraps(text, catalog, flex);
    for (let round = 0; round < FLEX_ROUNDS; round++) {
        try {
            const statements = parseSql(sql);
            const picked = statements[statements.length - 1];
            if (picked === undefined || picked.t === 'write') break;
            compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
            break;
        } catch (problem) {
            if (!(problem instanceof QueryError)) throw problem;
            const better = flexFix(sql, problem, catalog, flex);
            if (better === null || better === sql) break;
            sql = better;
        }
    }
    return { sql: sql, fixes: flex.fixes };
}
```

**6.** SNAP TO RESULT: no rows came back. Was a word spelled differently in the file?

```js
//  SNAP TO RESULT:  the answer had NO rows.   Was it a word that's spelled a little differently in the file?
//      status = 'Shipped'    but the file only says  'shipped'    ->   { sql:  ... 'shipped' ...,   fixes:  [...] }
//  (Only when the file has ONE other spelling,  and never the one you typed.   Otherwise:  null.)
async function flexSnap(sql, picked, catalog, isCurrent) {

    //  1.  The comparisons to words:    column = 'Shipped'    column IN ('a', 'b')    column IS 'x'
    const asks = [];
    (function look(node, core) {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(function (x) { look(x, core); }); return; }
        if (node.t === 'core') core = node;
        if (core !== null && core.from !== null && core.from.t === 'table') {
            const pairs = [];
            if ((node.t === 'cmp' && node.op === '=') || (node.t === 'isdist' && node.not)) pairs.push([node.a, node.b], [node.b, node.a]);
            if (node.t === 'in' && !node.not) node.list.forEach(function (x) { pairs.push([node.e, x]); });
            pairs.forEach(function (p) {
                if (p[0].t !== 'col' || p[1].t !== 'lit' || typeof p[1].v !== 'string') return;
                const table = catalog.find(core.from.name);
                if (table === null) return;
                const col = columnNames(table).map(function (c) { return c.toLowerCase(); }).indexOf(String(p[0].name).toLowerCase());
                if (col !== -1 && asks.length < 4) asks.push({ table: table, col: col, word: p[1].v });
            });
        }
        for (const k in node) if (node[k] !== null && typeof node[k] === 'object') look(node[k], core);
    })(picked, null);
    if (asks.length === 0) return null;

    //  2.  How does the file spell each one?
    const tk = sqlTokens(sql);
    const edits = [], fixes = [];
    for (const ask of asks) {
        const spelled = await flexSpelling(ask, isCurrent);
        if (spelled === null) continue;
        tk.forEach(function (t) { if (t.k === 'str' && t.v === ask.word) edits.push([t.at, t.to, flexWords(spelled)]); });
        fixes.push(flexWords(ask.word) + '  ->  ' + flexWords(spelled) + '   (no row had it:  that\'s how the file spells it)');
    }
    if (edits.length === 0) return null;

    edits.sort(function (x, y) { return y[0] - x[0]; });
    let out = sql, last = -1;
    edits.forEach(function (e) { if (e[0] !== last) out = out.slice(0, e[0]) + e[2] + out.slice(e[1]); last = e[0]; });
    return { sql: out, fixes: fixes };
}

//  The ONE way the file spells this word  (loosely the same,  but not exactly).   null:  none,  two,  or it's there as typed.
async function flexSpelling(ask, isCurrent) {
    const want = flexLoose(ask.word);
    const table = ask.table, n = table.rowCount, width = table.rowUpTo ? ask.col + 1 : Math.max(table.columns.length, 1);
    let found = null, work = 0, stopAt = performance.now() + CHUNK_TIME;
    for (let i = 0; i < n; i++) {
        work += width;
        if (work >= BITE_CELLS) {
            work = 0;
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
        const v = (table.rowUpTo ? table.rowUpTo(i, ask.col + 1) : table.row(i))[ask.col];
        if (v === undefined || v === '') continue;
        if (v === ask.word) return null;                //  it IS in the file,  just as you typed it:  something else left no rows
        if (flexLoose(v) !== want) continue;
        if (found === null) found = v;
        else if (found !== v) return null;              //  two different spellings:  which one?  Don't guess.
    }
    return found;
}
```

| Code | Baby words |
|---|---|
| `flexLoose` | `' Shipped '` and `'shipped'` are the same, loosely (spaces and big letters don't count). |
| `if (v === ask.word) return null` | Your word IS in the file, just as you typed it? Then something ELSE gave no rows. Don't touch it. |
| `else if (found !== v) return null` | Two different spellings (`Shipped` AND `SHIPPED`)? Which one did you mean? Don't guess. |
| `work >= BITE_CELLS` | It reads a whole column, so it takes breaths too (Part 10's crash fix). A million rows: about 1 second, and the page never freezes. |

<br>

### Step 11.5: The brain: Type mode, and your SQL back into the builder

**1.** The new pieces, next to the other query names (replace the `queryNote` and `queryReset` lines):

```js
const queryNote    = document.getElementById('querySqlNote');   //  "written for you as you pick"
const queryFlex    = document.getElementById('queryFlex');      //  [✓] Query Flexibility
const queryType    = document.getElementById('queryType');      //  [ ] Type mode
const queryAsk     = document.getElementById('queryAsk');       //  "The builder can't show ...   [Drop them] [Keep typing]"
const queryAskWords = document.getElementById('queryAskWords');
const queryAskYes  = document.getElementById('queryAskYes');
const queryAskNo   = document.getElementById('queryAskNo');
const queryFixes   = document.getElementById('queryFixes');     //  "Query Flexibility fixed:  selct  ->  SELECT ..."
```

And `handWritten` becomes `typeMode` (replace the line, and every `handWritten` in the brain):

```js
let typeMode    = false;    //  TYPE MODE:  you write the SQL yourself.  (The builder is greyed out,  and stops writing over it.)
```

In `queryFileChanged`, replace `handWritten = false;`:

```js
    setTypeMode(false);
    showFixes([]);
```

**2.** A total can keep a NICKNAME you typed (`COUNT(*) AS n`), so that very common SQL fits the builder without asking:

```js
//  The nicknames the totals get  (count,  sum_price ...),  in order.   (A nickname from SQL you typed?  That one.)
function totalNames(of) {
    const b = of || build;
    const used = new Set(b.group.map(function (g) { return g.toLowerCase(); }));
    return b.totals.map(function (t) {
        const fn = TOTAL_FNS.find(function (f) { return f[0] === t.fn; });
        if (t.name) { used.add(t.name.toLowerCase()); return t.name; }
        let name = t.fn === 'rows' ? 'count' : fn[2] + '_' + String(t.col).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        let n = name, k = 2;
        while (used.has(n)) n = name + '_' + k++;
        used.add(n);
        return n;
    });
}
```

In `drawBuilder`, the TOTALS part (picking a new total forgets the old nickname; a nickname shows as "as n"):

```js
    //  TOTALS
    section('Totals', function (box) {
        build.totals.forEach(function (t, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), t.fn, 'Total', function (v) {
                t.fn = v;
                t.name = null;                          //  (a nickname you typed was for the OLD total)
                if (v !== 'rows' && t.col === null) t.col = columns[0];
                changed();
            }));
            if (t.fn !== 'rows') line.appendChild(pickList(colOptions, t.col, 'Of which column', function (v) { t.col = v; t.name = null; changed(); }));
            if (t.name) {                               //  a nickname from SQL you typed:   COUNT(*) AS n   ->   "as n"
                const as = document.createElement('span');
                as.className = 'query-hint';
                as.textContent = 'as ' + t.name;
                line.appendChild(as);
            }
            line.appendChild(smallButton('×', 'Remove this total', function () { build.totals.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        box.appendChild(addList('+ total', TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), 'Add a total', function (v) {
            build.totals.push({ fn: v, col: v === 'rows' ? null : columns[0] });
            changed();
        }));
    });
```

**3.** Your SQL → the builder's buttons. It reads your SQL with the engine's own `parseSql` (Part 10), then walks the tree and asks, piece by piece: "can a button show this?"

```js
//  ---- THE SQL IT READS   (your SQL  ->  the builder's buttons) ----
//
//  Leaving type mode,  your SQL is read back into the builder:
//
//      SELECT status, COUNT(*) AS n FROM orders WHERE qty > 5 GROUP BY status ORDER BY n DESC LIMIT 10
//
//          Keep rows   [qty] [is over] [5]           Group by   [status]
//          Totals      [count rows]  as n            Sort by    [n] [↓ high to low]          At most   10
//
//  ->  { build,  left }      left  =  the parts the builder CAN'T show,  in words   ([]  =  all of it fits)
//  (SQL with a mistake in it?  It throws the engine's QueryError,  like Run would.)

const FLIP_OP = { '=': '=', '<>': '<>', '<': '>', '<=': '>=', '>': '<', '>=': '<=' };     //  5 < qty   =   qty > 5

function buildFromSql(text) {

    const statements = parseSql(text);
    const q = statements[statements.length - 1];
    const b = newBuild();
    const left = [];

    if (q === undefined || q.t !== 'query') queryFail('The builder only shows a question  (a SELECT).');
    if (statements.length > 1) left.push('the queries before the last one');
    if (q.with !== null) left.push('the WITH tables');
    if (q.body.t !== 'core') {
        left.push(q.body.t === 'set' ? 'the ' + q.body.op : 'the ( ) around the query');
        return { build: b, left: left };
    }

    const c = q.body;
    const columns = queryColumns();
    const lower = columns.map(function (n) { return n.toLowerCase(); });
    const main = fileTable.engine.name.toLowerCase();

    //  FROM:  the open table  (nothing else:  the builder only asks about the open table).
    if (c.from === null || c.from.t !== 'table' || c.from.name.toLowerCase() !== main) {
        left.push(c.from === null ? 'a question with no FROM'
            : c.from.t === 'join' ? 'the JOIN'
            : c.from.t === 'sub' ? 'the query inside FROM'
            : 'the table  ' + c.from.name + '   (the builder only uses  ' + fileTable.engine.name + ')');
        return { build: b, left: left };
    }
    const alias = c.from.alias ? c.from.alias.toLowerCase() : null;

    //  A plain column of the open table   ->   its real name   (or null)
    function columnOf(e) {
        if (e === null || e.t !== 'col') return null;
        if (e.table !== null && e.table.toLowerCase() !== main && e.table.toLowerCase() !== alias) return null;
        const k = lower.indexOf(String(e.name).toLowerCase());
        return k === -1 ? null : columns[k];
    }

    //  A value  (words or a number)   ->   what the builder's value box holds   (or null)
    function valueOf(e) {
        return e !== null && e.t === 'lit' && (typeof e.v === 'string' || typeof e.v === 'number') ? String(e.v) : null;
    }

    //  A total the builder has:   COUNT(*)  COUNT(x)  COUNT(DISTINCT x)  SUM  AVG  MIN  MAX  MEDIAN   ->   { fn, col }   (or null)
    function totalOf(e) {
        if (e === null || e.t !== 'fn' || e.over || e.filter || e.order) return null;
        if (e.name === 'COUNT' && e.star) return { fn: 'rows', col: null, name: null };
        const col = e.args.length === 1 ? columnOf(e.args[0]) : null;
        if (col === null) return null;
        if (e.name === 'COUNT') return { fn: e.distinct ? 'distinct' : 'count', col: col, name: null };
        const fn = { SUM: 'sum', AVG: 'avg', MIN: 'min', MAX: 'max', MEDIAN: 'median' }[e.name];
        return fn && !e.distinct ? { fn: fn, col: col, name: null } : null;
    }


    //  SELECT   (DISTINCT a, b  is the same rows as  GROUP BY a, b:  so that's how it's shown)
    const hasTotal = c.items.some(function (it) { return !it.star && isTotal(it.e); });
    const distinctCols = c.distinct && !hasTotal && c.group === null
        ? c.items.map(function (it) { return it.star || (it.alias && it.alias.toLowerCase() !== String(it.e.name).toLowerCase()) ? null : columnOf(it.e); })
        : null;
    if (distinctCols !== null && distinctCols.every(function (x) { return x !== null; })) b.group = distinctCols;
    else if (c.distinct && !hasTotal) left.push('DISTINCT');

    const grouped = b.group.length > 0 || c.group !== null || hasTotal;

    if (c.group !== null) {
        c.group.forEach(function (g) {
            let col = columnOf(g);
            if (col === null && g.t === 'lit' && Number.isInteger(g.v)) {                     //  GROUP BY 1   (the 1st thing shown)
                const it = c.items[g.v - 1];
                col = it && !it.star ? columnOf(it.e) : null;
            }
            if (col === null && g.t === 'col' && g.table === null) {                          //  GROUP BY a nickname
                const it = c.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(g.name).toLowerCase(); });
                col = it ? columnOf(it.e) : null;
            }
            if (col === null) left.push('GROUP BY ' + sqlWordsFor(g));
            else if (b.group.indexOf(col) === -1) b.group.push(col);
        });
    }

    if (distinctCols === null || !distinctCols.every(function (x) { return x !== null; })) {
        c.items.forEach(function (it) {
            if (it.star) {
                if (grouped) left.push('SELECT *');
                else if (c.items.length > 1) left.push('the  *  next to other columns');
                return;
            }
            const col = columnOf(it.e);
            if (col !== null) {
                if (it.alias !== null && it.alias.toLowerCase() !== col.toLowerCase()) left.push('the nickname  ' + it.alias + '  for  ' + col);
                if (grouped) { if (b.group.indexOf(col) === -1) left.push(col + '   (it isn\'t in GROUP BY)'); }
                else if (b.show.indexOf(col) === -1) b.show.push(col);
                return;
            }
            const t = grouped ? totalOf(it.e) : null;
            if (t === null) { left.push(sqlWordsFor(it.e)); return; }
            t.name = it.alias;                                  //  (null  =  the builder names it:  count,  sum_qty ...)
            b.totals.push(t);
        });
    }

    if (c.having !== null) left.push('HAVING ' + sqlWordsFor(c.having));


    //  WHERE:  conditions joined by AND only  (or by OR only),  each one  [column] [how] [value]
    if (c.where !== null) {
        const flat = function (node, kind, out) {
            if (node.t === kind) { flat(node.a, kind, out); flat(node.b, kind, out); } else out.push(node);
            return out;
        };
        const any = c.where.t === 'or';
        let parts = flat(c.where, any ? 'or' : 'and', []);
        const oneIn = parts.length === 1 && parts[0].t === 'in' && !parts[0].not;           //  status IN ('a', 'b')   =   status is 'a'  OR  'b'
        parts.forEach(function (p) {
            const found = filtersOf(p, any || oneIn);
            if (found === null) left.push('the condition  ' + sqlWordsFor(p));
            else found.forEach(function (f) { b.filters.push(f); });
        });
        b.any = (any || oneIn) && b.filters.length > 1;
    }

    function filtersOf(p, anyMode) {
        if (p.t === 'cmp' && FLIP_OP[p.op]) {
            let col = columnOf(p.a), value = valueOf(p.b), op = p.op;
            if (col === null) { col = columnOf(p.b); value = valueOf(p.a); op = FLIP_OP[p.op]; }
            return col !== null && value !== null ? [{ col: col, op: op, value: value }] : null;
        }
        if (p.t === 'isnull') {
            const col = columnOf(p.e);
            return col !== null ? [{ col: col, op: p.not ? 'filled' : 'empty', value: '' }] : null;
        }
        if (p.t === 'isdist') {                                     //  status IS 'shipped'   (SQLite's  IS  =  "the same as")
            const col = columnOf(p.a), value = valueOf(p.b);
            if (col === null) return null;
            if (p.b.t === 'lit' && p.b.v === null) return [{ col: col, op: p.not ? 'empty' : 'filled', value: '' }];
            return value !== null ? [{ col: col, op: p.not ? '=' : '<>', value: value }] : null;
        }
        if (p.t === 'like' && !p.not) {
            const col = columnOf(p.e), pattern = valueOf(p.pat);
            const escape = p.esc === null ? null : valueOf(p.esc);
            if (col === null || pattern === null) return null;
            //  Read the pattern:  only a  %  at the start and/or the end can be shown   (contains / starts with / ends with)
            let word = '', first = false, last = false;
            for (let k = 0; k < pattern.length; k++) {
                const ch = pattern[k];
                if (escape !== null && ch === escape && k + 1 < pattern.length) { word += pattern[++k]; continue; }
                if (ch === '_') return null;
                if (ch === '%') {
                    if (k === 0) first = true;
                    else if (k === pattern.length - 1) last = true;
                    else return null;
                    continue;
                }
                word += ch;
            }
            const op = first && last ? 'contains' : last ? 'starts' : first ? 'ends' : '=';
            return [{ col: col, op: op, value: word }];
        }
        if (p.t === 'between' && !p.not && !anyMode) {
            const col = columnOf(p.e), lo = valueOf(p.lo), hi = valueOf(p.hi);
            return col !== null && lo !== null && hi !== null ? [{ col: col, op: '>=', value: lo }, { col: col, op: '<=', value: hi }] : null;
        }
        if (p.t === 'in' && !p.not && (anyMode || p.list.length === 1)) {
            const col = columnOf(p.e), values = p.list.map(valueOf);
            return col !== null && values.every(function (v) { return v !== null; })
                ? values.map(function (v) { return { col: col, op: '=', value: v }; })
                : null;
        }
        return null;
    }


    //  ORDER BY:  a column  (or,  grouped:  a group,  or a total)
    const sortable = grouped ? b.group.concat(totalNames(b)) : columns;
    const sortLower = sortable.map(function (n) { return n.toLowerCase(); });
    (q.order || []).forEach(function (o) {
        let name = null;
        let e = o.e;
        if (e.t === 'lit' && Number.isInteger(e.v)) {                              //  ORDER BY 2   (the 2nd thing shown)
            const it = c.items[e.v - 1];
            e = it && !it.star ? (it.alias ? { t: 'col', table: null, name: it.alias } : it.e) : null;
        }
        if (e !== null && e.t === 'col' && e.table === null) {
            const it = c.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(e.name).toLowerCase(); });
            if (it && !grouped) e = it.e;                                          //  a nickname for a column
        }
        if (e !== null && e.t === 'col') {
            const k = sortLower.indexOf(String(e.name).toLowerCase());
            if (k !== -1 && (e.table === null || columnOf(e) !== null || grouped)) name = sortable[k];
        } else if (e !== null && grouped) {                                        //  ORDER BY COUNT(*)   ->   that total's name
            const t = totalOf(e);
            const k = t === null ? -1 : b.totals.findIndex(function (x) { return x.fn === t.fn && x.col === t.col; });
            if (k !== -1) name = totalNames(b)[k];
        }
        if (name === null) left.push('ORDER BY ' + sqlWordsFor(o.e));
        else b.sort.push({ col: name, desc: o.desc });
        if (o.nulls !== null) left.push('NULLS ' + o.nulls.toUpperCase());
    });


    //  LIMIT   (or SQL Server's  TOP)
    const limit = q.limit !== null ? q.limit : c.top;
    if (limit !== null) {
        if (limit.t === 'lit' && Number.isInteger(limit.v) && limit.v > 0) b.limit = String(limit.v);
        else left.push('LIMIT ' + sqlWordsFor(limit));
    }
    if (q.offset !== null) left.push('OFFSET ' + sqlWordsFor(q.offset));

    return { build: b, left: left };
}

//  A piece of a question,  back in words   (for "The builder can't show:  UPPER(city)")
function sqlWordsFor(e) {
    if (e === null || e === undefined) return '';
    switch (e.t) {
        case 'lit':     return e.v === null ? 'NULL' : typeof e.v === 'string' ? sqlWordsOf(e.v) : String(e.v);
        case 'col':     return (e.table ? e.table + '.' : '') + e.name;
        case 'fn':      return e.name + '(' + (e.star ? '*' : (e.distinct ? 'DISTINCT ' : '') + e.args.map(sqlWordsFor).join(', ')) + ')' + (e.over ? ' OVER (...)' : '');
        case 'bin':     return sqlWordsFor(e.a) + ' ' + e.op + ' ' + sqlWordsFor(e.b);
        case 'cat':     return sqlWordsFor(e.a) + ' || ' + sqlWordsFor(e.b);
        case 'cmp':     return sqlWordsFor(e.a) + ' ' + e.op + ' ' + sqlWordsFor(e.b);
        case 'and':
        case 'or':      return sqlWordsFor(e.a) + ' ' + e.t.toUpperCase() + ' ' + sqlWordsFor(e.b);
        case 'not':     return 'NOT ' + sqlWordsFor(e.e);
        case 'neg':     return '-' + sqlWordsFor(e.e);
        case 'isnull':  return sqlWordsFor(e.e) + (e.not ? ' IS NOT NULL' : ' IS NULL');
        case 'like':    return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' LIKE ' + sqlWordsFor(e.pat);
        case 'in':      return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' IN (' + e.list.map(sqlWordsFor).join(', ') + ')';
        case 'between': return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' BETWEEN ' + sqlWordsFor(e.lo) + ' AND ' + sqlWordsFor(e.hi);
        case 'case':    return 'CASE ...';
        case 'cast':    return 'CAST(' + sqlWordsFor(e.e) + ' AS ...)';
        default:        return 'a query inside the query';
    }
}
```

| SQL | Becomes |
|---|---|
| `DISTINCT a, b` | Group by `a`, `b` (the same rows!) |
| `status IN ('a', 'b')` | Keep rows: status is `a` **OR** is `b` |
| `qty BETWEEN 3 AND 5` | qty is at least 3 **AND** is at most 5 |
| `LIKE '%ship%'` / `'ship%'` / `'%ship'` | contains / starts with / ends with `ship` |
| `5 < qty` | qty is over 5 (turned around: `FLIP_OP`) |
| `GROUP BY 1`, `ORDER BY 2` | The 1st / 2nd thing shown |
| `COUNT(*) AS n` | count rows, as n |
| A JOIN, CASE, `UPPER(...)`, HAVING ... | In `left`: "the builder can't show ..." |

**4.** Type mode itself, the question it asks, and the "fixed" line. Replace the old `input` listener and the old "Use the builder again" listener with:

```js
//  ---- TYPE MODE ----

function setTypeMode(on) {
    typeMode = on;
    queryType.checked = on;
    queryBuilder.classList.toggle('paused', on);
    queryNote.textContent = on ? 'type mode  ·  the builder is greyed out' : 'written for you as you pick';
    askFirst(null);
}

//  Click in the box  (or type in it)  ->  type mode turns on.
querySql.addEventListener('pointerdown', function () { if (!typeMode) setTypeMode(true); });
querySql.addEventListener('input', function () {
    if (!typeMode) setTypeMode(true);
    showFixes([]);                                      //  (the fixes were for the SQL before you changed it)
});

//  The checkbox.   Unticked?  Not right away:  first,  does your SQL fit the builder?
queryType.addEventListener('change', function () {
    if (queryType.checked) { setTypeMode(true); querySql.focus(); return; }
    queryType.checked = true;
    leaveTypeMode();
});

//  Back to the builder:  your SQL,  snapped into its buttons.   (Query Flexibility on?  Its mistakes are fixed first.)
//  Something the buttons can't show  (a JOIN,  a CASE ...)?   ASK first:  drop it,  or keep typing.
function leaveTypeMode() {

    const typed = querySql.value;
    if (typed.trim() === '' || typed === builderSql()) { setTypeMode(false); writeSql(); return; }

    let sql = typed, fixes = [];
    if (queryFlex.checked) {
        const fixed = flexSync(typed, queryCatalog(function () { return true; }));
        sql = fixed.sql;
        fixes = fixed.fixes;
    }

    function done(newBuild) {
        build = newBuild;
        setTypeMode(false);
        drawBuilder();
        writeSql();
        showFixes(fixes);
    }

    let read;
    try {
        read = buildFromSql(sql);
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
        askFirst('The builder can\'t read this SQL:   ' + problem.message, 'Start the builder fresh', function () { done(newBuild()); });
        return;
    }

    if (read.left.length === 0) { done(read.build); return; }
    askFirst('The builder can\'t show:   ' + read.left.join(',   ') + '.', read.left.length === 1 ? 'Drop it' : 'Drop them',
             function () { done(read.build); });
}

//  The question,  under the SQL box:   "The builder can't show:  the JOIN.   [Drop it]  [Keep typing]"
//  (words  null  =  put it away)
let askYes = null;

function askFirst(words, yesWords, onYes) {
    queryAsk.hidden = words === null;
    askYes = onYes || null;
    if (words === null) return;
    queryAskWords.textContent = words;
    queryAskYes.textContent = yesWords;
    queryAskYes.focus();
}

queryAskYes.addEventListener('click', function () {
    const go = askYes;
    askFirst(null);
    if (go !== null) go();
});

queryAskNo.addEventListener('click', function () {
    askFirst(null);
    querySql.focus();                                   //  (still in type mode)
});

//  What Query Flexibility fixed,  in words,  under the box   ([]  =  nothing:  put the line away)
function showFixes(list) {
    queryFixes.hidden = list.length === 0;
    queryFixes.textContent = list.length === 0 ? '' : 'Query Flexibility fixed:   ' + list.join('   ·   ');
}

//  After a Run:  Query Flexibility changed the SQL?   Show the SQL that REALLY ran,  and say what changed.
function afterFlex(sql, fixes) {
    showFixes(fixes);
    if (fixes.length === 0) return;
    if (typeMode) { querySql.value = sql; return; }
    //  The builder's own SQL  (snap to result:  a word,  spelled the file's way):  its buttons follow along.
    try {
        const read = buildFromSql(sql);
        if (read.left.length === 0) { build = read.build; drawBuilder(); writeSql(); }
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
    }
}
```

> **Why does unticking UN-untick the box first?** (`queryType.checked = true;`) Because you're not out of type mode YET: if your SQL doesn't fit, it asks, and you might say "Keep typing". The box only unticks when you really leave.

**5.** Run passes the checkbox to the engine, and shows the SQL that REALLY ran (replace `runTheQuery`):

```js
function runTheQuery() {

    if (fileTable === null) return;

    const text   = querySql.value;
    const myRun  = ++queryId;
    const myLoad = loadId;
    function isCurrent() { return myRun === queryId && myLoad === loadId; }

    setQueryStatus('Running...', false);
    startLoading('Running the query...');
    const started = performance.now();

    askFirst(null);
    runQuery(text, queryCatalog(isCurrent), isCurrent, function (done) {
        setProgress(0.9 * done);
        setLoadingLabel('Running the query...  ' + Math.floor(100 * done) + '%');
    }, queryFlex.checked).then(function (result) {

        if (!isCurrent()) return;
        afterFlex(result.sql, result.fixes);                //  (Query Flexibility changed it?  Show what really ran.)
        return showAnswer(result, result.sql, performance.now() - started, isCurrent);

    }).then(function () {

        if (!isCurrent()) return;
        finishLoading();

    }, function (problem) {

        if (!isCurrent() || problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        finishLoading();
        if (problem && problem.fixes && problem.fixes.length > 0) afterFlex(problem.sql, problem.fixes);    //  (how far the fixing got:  so the problem lines up)
        setQueryStatus(queryProblem(problem), true);
    });
}
```

In `showAnswer`, the answer's notes remember the fixes:

```js
        result: { sql: text, ms: ms, rows: rows.length, from: mainTableName(), fixes: result.fixes || [] },
```

And the badge says so: `QUERY RESULT · 400 rows · from orders · 8 ms · Query Flexibility fixed 1 thing` (hover it for which). In `showBadge`, replace the `if (showingAnswer())` part:

```js
    fileBadge.title = '';

    //  A query's answer:   QUERY RESULT  ·  12 rows  ·  from sales  ·  8 ms
    //  (Query Flexibility fixed something?   ·  Query Flexibility fixed 2 things    hover  ->  what they were)
    if (showingAnswer()) {
        const r = sqlInfo.result;
        fileBadge.textContent = 'QUERY RESULT  ·  ' + r.rows.toLocaleString() + ' row' + (r.rows === 1 ? '' : 's') +
            (r.from ? '  ·  from ' + r.from : '') + '  ·  ' + formatTime(r.ms) +
            (r.fixes.length > 0 ? '  ·  Query Flexibility fixed ' + r.fixes.length + (r.fixes.length === 1 ? ' thing' : ' things') : '');
        fileBadge.title = r.fixes.join('   ·   ');
        fileBadge.hidden = false;
        return;
    }
```

<br>

### Step 11.6: The brain: click a cell

**1.** A clicked cell, next to the snap menu's other notes (`aimAt`, `aimHits` ...):

```js
let picked  = null;     //  a cell you CLICKED:  { row, col }.   The Details show it  (until the snap menu moves,  or they close).
```

**2.** The Details panel used to read the snap menu's target directly (`matches[aimAt]`). Now it asks `detailsTarget()`: a clicked cell first, else the snap target. Replace `showRow`, and the top of `drawRow`:

```js
function showRow(open) {
    if (open && detailsTarget() === null) return;       //  (nothing to show)
    if (open) closeQueryMenu();                         //  (the query menu lives in the same spot)
    else picked = null;                                 //  (closed:  a clicked cell is forgotten)
    aimRow.hidden = !open;
    aimRowBtn.setAttribute('aria-expanded', open);
    if (open) drawRow();
}

//  Which cell the Details are about:  one you CLICKED,  or the snap menu's target.   (null  =  neither)
function detailsTarget() {
    if (picked !== null) return picked;
    return aimAt === -1 ? null : { row: matches[aimAt], col: aimHits[aimHit] };
}


function drawRow() {

    const spot = detailsTarget();
    if (spot === null) return;

    const row   = spot.row;
    const col   = spot.col;
```

**3.** When the snap menu MOVES, the Details follow it again. In `aimOn`, at the top:

```js
    picked  = null;                 //  (the snap menu moved:  the Details follow it again)
```

In `snapToTarget`, right after `aimed = true;`:

```js
    if (picked !== null) { picked = null; if (!aimRow.hidden) drawRow(); }     //  (the Details follow the snap again)
```

And in `drawAim`, "no match" only closes the Details if they're not about a clicked cell:

```js
        if (picked === null) showRow(false);                //  no match  =  no row to show   (unless it's a cell you clicked)
        else if (!aimRow.hidden) drawRow();
```

**4.** The click, and the "expand?" tag. Right after the snap menu's buttons (`aimScope.addEventListener(...)`):

```js
//    CLICK A CELL   ->   ITS DETAILS
//
//    Rest the mouse on a cell  ->  after a moment,  a little black  "expand?"  tag shows up on its corner.
//    Click the cell  ->  the Details panel opens for it:  the cell big  (the focus card),  and its whole row,
//    up and down  ("VIEWING ROW VERTICALLY").   No search needed.
//
//        ┌──────────────┬────────────[expand?]──┐
//        │ Ana          │ 123 Main St, Apt 4... │      <-  the mouse rests here
//        └──────────────┴───────────────────────┘
//
//    Not a click:  dragging to select words,  or drag mode  (that's for moving the sheet).
//    A phone?  No resting mouse:  just tap the cell.
//
// ----------------------------------------------------------

const cellTag  = document.getElementById('cellTag');
const TAG_WAIT = 600;           //  how long the mouse rests on a cell before "expand?" shows up  (ms)

let tagCell  = null;            //  the cell the mouse is resting on
let tagTimer = null;
let pressX   = 0;               //  where the last press started  (a click that MOVED is a drag,  not a click)
let pressY   = 0;


//  Where is this cell?   ->   { row  (in the file),  col }    (null:  not a real cell,  like the spreadsheet look's empty columns)
//  (A row on screen is:  [number] [left spacer] [the built cells ...] [right spacer].   Its name tag is its spot in "matches".)
function cellSpot(cell) {
    const line = cell.parentElement;
    if (line === null || line.dataset.index === undefined) return null;
    const col = builtColStart + Array.prototype.indexOf.call(line.children, cell) - 2;
    const at  = Number(line.dataset.index);
    if (col < 0 || col >= dataColumns || at >= matches.length) return null;
    return { row: matches[at], col: col };
}

function hideTag() {
    if (tagCell === null && cellTag.hidden) return;         //  (already hidden:  this runs on every scroll,  so do nothing)
    clearTimeout(tagTimer);
    tagCell = null;
    cellTag.classList.remove('on');
    cellTag.hidden = true;
}

//  The mouse has rested long enough:  show the tag,  on the cell's top-right corner  (inside the window's edge).
function showTag() {
    if (tagCell === null || !tagCell.isConnected || dragging || !loader.hidden) return;
    const cell = tagCell.getBoundingClientRect();
    const box  = outputBox.getBoundingClientRect();
    const right = Math.min(cell.right, box.left + outputBox.clientLeft + outputBox.clientWidth);
    if (right - 40 < Math.max(cell.left, box.left)) return;                 //  (hardly any of it is on screen)
    cellTag.style.left = right + 'px';
    cellTag.style.top  = Math.max(cell.top, box.top) + 'px';
    cellTag.hidden = false;
    void cellTag.offsetWidth;                               //  (make the browser notice it first,  so it fades in)
    cellTag.classList.add('on');
}

//  Open the Details for a cell.   (It pulses,  like a snapped-to target,  so you see which one.)
function pickCell(spot, cell) {
    picked = spot;
    showRow(true);
    cell.classList.remove('locked');
    void cell.offsetWidth;
    cell.classList.add('locked');
    cell.addEventListener('animationend', function () { cell.classList.remove('locked'); }, { once: true });
}

rowsBox.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    const cell = e.target.closest('.cell');
    if (cell === tagCell) return;
    hideTag();
    if (cell === null || cellSpot(cell) === null) return;
    tagCell = cell;
    tagTimer = setTimeout(showTag, TAG_WAIT);
});

rowsBox.addEventListener('pointerleave', hideTag);
rowsBox.addEventListener('pointerdown', function (e) {
    hideTag();
    pressX = e.clientX;
    pressY = e.clientY;
});
outputBox.addEventListener('scroll', hideTag, { passive: true });
outputBox.addEventListener('wheel', hideTag, { passive: true });
window.addEventListener('scroll', hideTag, { passive: true });         //  (Expand mode:  the page scrolls)

rowsBox.addEventListener('click', function (e) {
    const cell = e.target.closest('.cell');
    if (cell === null) return;
    if (Math.abs(e.clientX - pressX) > 5 || Math.abs(e.clientY - pressY) > 5) return;     //  it moved:  selecting words
    if (String(window.getSelection()).length > 0) return;                                   //  words are selected:  leave them
    const spot = cellSpot(cell);
    if (spot === null) return;
    hideTag();
    pickCell(spot, cell);
});
```

| Code | Baby words |
|---|---|
| `cellSpot` | Which cell is this? Its column: count the boxes in its row. Its file row: the row's name tag is its spot in `matches` (Part 2), so it's `matches[spot]`. **With a search on, the 3rd row on screen isn't the file's 3rd row!** |
| `col >= dataColumns` | The spreadsheet look's empty columns (Part 8) have nothing in them: not a cell. |
| `TAG_WAIT = 600` | Rest the mouse 0.6 s. Shorter, and tags flash all over while you move across the sheet. |
| `e.pointerType === 'touch'` | A finger can't "rest" on a cell. Just tap it. |
| `> 5` pixels | You pressed, moved, and let go: you were selecting words, not clicking. |
| `if (tagCell === null && cellTag.hidden) return;` | Scrolling sends LOTS of events. Already hidden? Do nothing at all. |

**5.** A new file (or an answer, or Back) has new rows, so forget a clicked cell. In `swapIn`, after `doneMatches = null;`:

```js
    picked      = null;                     //  ...and a cell you clicked  (it was in the OLD rows)
    hideTag();
```

<br>

### Step 11.7: The clothes

**1.** 3 new colors in the theme block, after `--sql-glow` (Neo-Neutral):

```css
    --check-box:    #ffffff;                        /*  a checkbox:  a white box  (ticked:  solid SQL blue,  a white ✓)  */
    --tag-bg:       #020202;                        /*  the "expand?" tag:  OLED-off black  (like the "CSV View" button)  */
    --tag-glow:     rgba(255, 255, 255, 0.35);      /*  ...and its soft white glow  */
```

...and in Neo-Dark's:

```css
    --check-box:    #ffffff;                        /*  still a white box:  it reads as "a box to tick",  even on black  */
    --tag-bg:       #020202;                        /*  blacker than the page  (#18191c),  so it still stands out  */
    --tag-glow:     rgba(255, 255, 255, 0.3);
```

**2.** The checkboxes, the question, and the "fixed" line. Replace the old `#queryReset` rule with:

```css
/*  The 2 checkboxes:   [✓] Query Flexibility    [ ] Type mode
    A white box.   Ticked:  solid SQL blue,  with a white  ✓,  and a soft blue glow.  */
.query-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    user-select: none;
}

.query-option input {
    appearance: none;
    -webkit-appearance: none;
    display: grid;
    place-content: center;
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    background: var(--check-box);
    border: 1px solid var(--glass-edge);
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    cursor: pointer;
}

.query-option input::after {
    content: "✓";
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    opacity: 0;                     /*  (not  visibility:  that would show through the closed menu)  */
}

.query-option input:checked {
    background: var(--sql);
    border-color: var(--sql);
    box-shadow: 0 0 8px var(--sql-glow);
}

.query-option input:checked::after {
    opacity: 1;
}

.query-option input:focus-visible {
    outline: none;
    box-shadow:
        0 0 0 2px var(--check-box),
        0 0 10px 2px var(--sql-glow);
}

#querySqlNote {
    margin-left: auto;
    font-size: 12px;
}

/*  "The builder can't show:  the JOIN.   [Drop it]  [Keep typing]"   (a light square,  with an SQL-blue edge)  */
#queryAsk {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 8px 10px 0;
    padding: 6px 8px 6px 10px;
    color: var(--text);
    background: var(--square-light);
    border: 1px solid var(--glass-edge);
    border-left: 4px solid var(--sql);
    border-radius: 8px;
}

#queryAskWords {
    flex: 1 1 260px;
}

#queryAsk button {
    margin: 0;
    padding: 0 10px;
    line-height: 24px;
    font-size: 12px;
    border-radius: 8px;
}

#queryAskYes {
    color: #fff;
    background: var(--sql-dark);
    text-shadow: 0 0 8px var(--sql-glow);
    box-shadow: 0 0 10px var(--sql-glow);
}

/*  "Query Flexibility fixed:   selct  ->  SELECT   ·   added  FROM orders"  */
#queryFixes {
    margin: 6px 10px 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--sql);
    white-space: pre-wrap;
}
```

> **`appearance: none`?** It takes away the browser's own checkbox drawing, so ours (a white box, solid SQL blue + a white ✓ when ticked) can be drawn instead. The ✓ is `opacity: 0` when unticked, NOT `visibility: hidden`: `visibility: visible` shows through a closed menu (the theme menu's gotcha, Part 4).

**3.** The tag, right after drag mode's anchor (`#dragAnchor::after`):

```css
/*  The "expand?" tag:  rest the mouse on a cell,  and after a moment it shows up on the cell's top-right corner.
    A small solid black box  (like the "CSV View" button),  white words,  a soft white glow.
    It sits ON the screen  (fixed)  and lets clicks through:  clicking the cell opens its Details.  */
#cellTag {
    position: fixed;
    z-index: 12;
    padding: 0 7px;
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    white-space: nowrap;
    color: #fff;
    background: var(--tag-bg);
    border-radius: 6px;
    text-shadow: 0 0 6px var(--tag-glow);
    box-shadow:
        inset 0 0 8px rgba(255, 255, 255, 0.08),
        0 0 10px var(--tag-glow);
    transform: translate(-100%, -60%);  /*  its right edge on the cell's right edge,  poking up over the top  */
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
}

#cellTag.on {
    opacity: 1;
}
```

> **`transform: translate(-100%, -60%)`?** The brain puts the tag's top-left corner on the cell's top-RIGHT corner. This slides it back by its own width (so its right edge lines up), and up a little (so it pokes over the cell's top, and doesn't hide the words).

<br>

### Step 11.8: Money columns (numbers with a LOOK)

A real file (an employee list, 500,000 rows) had its salaries written the way people write money: `"$116,450.00"`. To SQL, that's WORDS, not a number. And words follow word rules, quietly:

| You ask | You'd expect | Words-rules answer |
|---|---|---|
| `WHERE "Annual Salary" > 150000` | 156,396 rows | **every row** (in SQL, words are always "bigger" than numbers) |
| `WHERE "Annual Salary" < 60000` | 20,554 rows | **no rows** |
| `MAX("Annual Salary")` | $409,950.00 | **$99,950.00** (as words, "$9..." comes after "$4...") |
| `SUM(...)`, `AVG(...)` | the total | **0** |

No error, just wrong answers. (Real SQLite answers the same way: it's the SQL rule. That's why the tests against SQLite couldn't catch it: a person had to.)

So the engine learns a 3rd kind of number, a number with a LOOK: `$116,450.00`, `1,200`, `€5`, `-$3`, `($3.00)` (accountants' minus), `12%`. It reads them as the NUMBERS they are, and remembers the look, so an answer can show them the same way.

**1.** How to read a look, and write a number back in it (above `SAMPLE_ROWS`, in "THE TABLES"):

```js
//  A NUMBER WITH A LOOK:   $116,450.00    1,200    €5    -$3    $-3    ($3.00)    12%
//  (People write money like that,  and a CSV keeps it as written.   To SQL it's words:  then  >  matches every row,
//   MAX says $99,950,  SUM says 0.   So the engine reads them as the NUMBERS they are,  and remembers the LOOK,
//   so an answer can show them the same way.)
//      1  (       2  a sign       3  the money sign       4  a sign       5  the whole part  (1,200  or  1200)
//      6  .50     7  %            8  )
const CELL_LOOK = /^\s*(\()?\s*([-+])?\s*([$€£¥])?\s*([-+])?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%)?\s*(\))?\s*$/;

//  '$116,450.00'   ->   { n: 116450,  pre: '$',  post: '',  commas: true,  places: 2,  parens: false }
//  null  =  not a number with a look   (a plain number like 1200 is NOT one:  it needs no help)
function lookOf(s) {
    const m = CELL_LOOK.exec(s);
    if (m === null) return null;
    const parens = m[1] !== undefined;
    if (parens !== (m[8] !== undefined)) return null;                  //  a  (  needs its  )
    if (m[2] !== undefined && m[4] !== undefined) return null;         //  -$-5:  one sign at most
    const sign = m[2] || m[4] || '';
    if (parens && sign !== '') return null;
    const commas = m[5].indexOf(',') !== -1;
    if (!parens && m[3] === undefined && m[7] === undefined && !commas) return null;     //  nothing to look at:  a plain number
    const n = Number(m[5].split(',').join('') + (m[6] || ''));
    return { n: parens || sign === '-' ? -n : n, pre: m[3] || '', post: m[7] || '', commas: commas, places: m[6] ? m[6].length - 1 : 0, parens: parens };
}

//  A number back in its look:   116450.5   ->   $116,450.50
function lookText(v, look) {
    let s = Math.abs(v).toFixed(look.places);
    if (look.commas) {
        const dot = s.indexOf('.');
        const whole = dot === -1 ? s : s.slice(0, dot);
        let grouped = '';
        for (let k = whole.length; k > 0; k -= 3) grouped = whole.slice(Math.max(0, k - 3), k) + (grouped === '' ? '' : ',' + grouped);
        s = grouped + (dot === -1 ? '' : s.slice(dot));
    }
    s = look.pre + s + look.post;
    return v < 0 ? (look.parens ? '(' + s + ')' : '-' + s) : s;
}

//  Words that are a number with a look,  next to a NUMBER   ->   that number   ('$100,000'  ->  100000)
//  (Anything else:  the same node,  untouched.)
function lookLiteral(node, otherTy) {
    if (node.t !== 'lit' || typeof node.v !== 'string' || !(otherTy === 'int' || otherTy === 'real' || otherTy === 'num')) return node;
    const L = lookOf(node.v);
    return L === null ? node : { t: 'lit', v: L.n, ty: Number.isInteger(L.n) ? 'int' : 'real' };
}
```

| Code | Baby words |
|---|---|
| `(\d{1,3}(?:,\d{3})+\|\d+)` | The whole part: `1,200` (commas every 3) or `1200`. `12,34` (Europe's 12.34) doesn't fit: it stays words. Which one was meant? Don't guess. |
| `return null` (nothing to look at) | A plain `1200` is NOT a look: it needs no help. And `007` stays a code, like before. |
| `lookLiteral` | `'$100,000'` written IN a question, next to a number: it's the number 100000. |

**2.** Each column's look is worked out WITH its kind, by `lookAtKinds`. Replace `columnKinds` and `lookAtKinds` with these. (They also do the speed tricks of Step 11.10: a column's kind and look are worked out only when a question needs that column.)

```js
//  Every column's kind  (all of them:  the ones not worked out yet are,  now).
function columnKinds(table) {
    runNow(lookAtKinds(table));
    return table.kinds;
}

//  Each column's LOOK  (money,  1,200,  12%),  or null   (worked out together with the kinds).
function columnLooks(table) {
    runNow(lookAtKinds(table));
    return table.looks;
}

//  ONE column's kind  /  look   (worked out now,  if it isn't yet).
//  (Safety:  a question that keeps asking for columns one by one?  After a few,  just do all the rest at once:
//   then it's never slower than looking at every column was.)
function kindAt(table, j) {
    if (!table.kinds || table.kinds[j] === undefined) {
        table.misses = (table.misses || 0) + 1;
        runNow(lookAtKinds(table, table.misses > 4 ? undefined : [j]));
    }
    return table.kinds[j];
}
function lookAt(table, j) {
    kindAt(table, j);
    return table.looks[j];
}
```

```js
//  The looking itself:  a generator  (see RUN),  so runQuery can do it in bites before a question
//  (20,000 rows of a wide file,  all at once,  would stop the page for a moment).
//  only  =  which columns to look at  (their numbers).   Left out:  all of them.
//  (A question about 2 columns of a 10,000-column file only needs THOSE 2.   The others wait until they're asked for.)
function* lookAtKinds(table, only) {

    const width = table.columns.length;
    if (!table.kinds) {
        table.kinds = new Array(width);                 //  (undefined  =  not worked out yet)
        table.looks = new Array(width).fill(null);
    }
    const kindsOut = table.kinds, looksOut = table.looks;

    if (table.declared) {
        for (let j = 0; j < width; j++) {               //  (its types are written down:  they win.   No looks.)
            const declared = table.declared[j];
            kindsOut[j] = declared ? typeClass(declared) : 'text';
        }
        return;
    }

    //  The columns still to do  (in order)
    const wanted = only === undefined ? null : new Set(only);
    const todo = [];
    for (let j = 0; j < width; j++) if (kindsOut[j] === undefined && (wanted === null || wanted.has(j))) todo.push(j);
    if (todo.length === 0) return;
    const m = todo.length;
    const upTo = todo[m - 1] + 1;                       //  cut each row only this far

    const canInt = new Array(m).fill(true);
    const canReal = new Array(m).fill(true);
    const canDate = new Array(m).fill(true);
    const canTime = new Array(m).fill(true);
    const canLook = new Array(m).fill(true);            //  every cell a number,  some with a look  ($116,450.00)?
    const looks = new Array(m).fill(null);
    const anything = new Array(m).fill(false);

    const n = table.rowCount;
    const sample = Math.min(n, SAMPLE_ROWS, Math.max(1000, Math.floor(SAMPLE_CELLS / Math.max(m, 1))));
    const step = n / sample;
    const partial = table.rowUpTo && upTo < width;

    let work = 0;                   //  cells looked at since the last breath
    for (let s = 0; s < sample; s++) {
        work += upTo;
        if ((s & 511) === 511 || work >= BITE_CELLS) { work = 0; yield; }
        const r = Math.floor(s * step);
        const cells = partial ? table.rowUpTo(r, upTo) : table.row(r);
        for (let k = 0; k < m; k++) {
            const j = todo[k];
            if (j >= cells.length) continue;
            const v = cells[j];
            if (v === '') continue;
            anything[k] = true;
            if (canInt[k] && !CELL_INT.test(v)) canInt[k] = false;
            if (canReal[k] && !CELL_REAL.test(v)) canReal[k] = false;
            if (canDate[k] && !CELL_DATE.test(v)) canDate[k] = false;
            if (canTime[k] && !CELL_TIME.test(v) && !CELL_DATE.test(v)) canTime[k] = false;
            if (canLook[k] && !CELL_REAL.test(v)) {                 //  (a plain number fits a money column too:  0,  1200)
                const L = lookOf(v);
                const was = looks[k];
                if (L === null) canLook[k] = false;
                else if (was === null) looks[k] = { pre: L.pre, post: L.post, commas: L.commas, places: L.places, parens: L.parens };
                else if (was.pre !== L.pre || was.post !== L.post) canLook[k] = false;     //  $ AND € in one column?  Which is it?  Words.
                else {
                    if (L.places > was.places) was.places = L.places;
                    if (L.commas) was.commas = true;
                    if (L.parens) was.parens = true;
                }
            }
        }
    }

    for (let k = 0; k < m; k++) {
        const money = anything[k] && !canInt[k] && !canReal[k] && canLook[k] && looks[k] !== null;
        kindsOut[todo[k]] = !anything[k] ? 'text'
            : canInt[k] ? 'int'
            : canReal[k] ? 'real'
            : money ? (looks[k].places > 0 ? 'real' : 'int')
            : canDate[k] ? 'date'
            : canTime[k] ? 'timestamp'
            : 'text';
        looksOut[todo[k]] = money ? looks[k] : null;
    }
}
```

| Code | Baby words |
|---|---|
| `table.looks` | Next to `table.kinds`: each column's look (`$`, commas, 2 places), or `null`. |
| `canLook` / `looks` | 2 more notes per column, next to `canInt` ...: is every cell a number (some with a look)? And which look? |
| `$` AND `€` in one column | Not clear what the column IS: it stays words, like before. One cell like `N/A` too. Better a column of words than wrong numbers. |
| `money ? (places > 0 ? 'real' : 'int')` | A money column is a number: `real` (or `int`, when it never has cents). |
| `table.declared` | A SQL dump writes its types down: they win (no looks). |

**3.** Reading the rows: in `tableSource` (Step 11.10), a money cell becomes its number: `looked[u] ? money(s)`. In `resolveColumn`'s `found`, the look comes along with the column it found (so `LIKE` can use it):

```js
        const col = sc.grouped ? null : sc.cols[idx];
        return { depth: d, idx: idx, ty: ty, name: name, look: col && col.look ? col.look : null };
```

**4.** Money words in a QUESTION (`salary > '$100,000'`, `salary = '$116,450.00'`) become numbers, in `=` `<` `>` ..., `BETWEEN` and `IN`. And `LIKE` looks at a money column the way the FILE writes it (`salary LIKE '$116%'`):

```js
        case 'cmp': {
            let A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
            //  Money words against a number:   salary > '$100,000'   ->   salary > 100000
            const la = lookLiteral(node.a, B.ty), lb = lookLiteral(node.b, A.ty);
            if (la !== node.a) A = cx(la, scope, ctx);
            if (lb !== node.b) B = cx(lb, scope, ctx);
            const a = A.f, b = B.f;
            const test = {
                '=':  function (c) { return c === 0; },
                '<>': function (c) { return c !== 0; },
                '<':  function (c) { return c < 0; },
                '<=': function (c) { return c <= 0; },
                '>':  function (c) { return c > 0; },
                '>=': function (c) { return c >= 0; },
            }[node.op];
            return { f: function (row, env) {
                const x = a(row, env);
                if (x === null) return null;
                const y = b(row, env);
                if (y === null) return null;
                return test(compareValues(x, y));
            }, ty: 'bool' };
        }
```

```js
        case 'between': {
            const E = cx(node.e, scope, ctx);
            const e = E.f, lo = cx(lookLiteral(node.lo, E.ty), scope, ctx).f, hi = cx(lookLiteral(node.hi, E.ty), scope, ctx).f, not = node.not;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                const l = lo(row, env), h = hi(row, env);
                const aboveLo = l === null ? null : compareValues(x, l) >= 0;
                const belowHi = h === null ? null : compareValues(x, h) <= 0;
                let inside;
                if (aboveLo === false || belowHi === false) inside = false;
                else if (aboveLo === null || belowHi === null) inside = null;
                else inside = true;
                return inside === null ? null : inside !== not;
            }, ty: 'bool' };
        }
```

```js
        case 'in': {
            const E = cx(node.e, scope, ctx);
            const e = E.f;
            const list = node.list.map(function (item) { return cx(lookLiteral(item, E.ty), scope, ctx).f; });
            const not = node.not;
            return { f: function (row, env) {
                if (list.length === 0) return not;
                const x = e(row, env);
                if (x === null) return null;
                let sawNull = false;
                for (let k = 0; k < list.length; k++) {
                    const y = list[k](row, env);
                    if (y === null) { sawNull = true; continue; }
                    if (compareValues(x, y) === 0) return !not;
                }
                return sawNull ? null : not;
            }, ty: 'bool' };
        }
```

```js
        case 'like': {
            const e = cx(node.e, scope, ctx).f;
            //  A column with a look  (money)?  LIKE sees it the way the FILE writes it:   salary LIKE '$116%'
            const found = node.e.t === 'col' ? resolveColumn(scope, node.e, true) : null;
            const look = found !== null && found.look ? found.look : null;
            const P = node.pat, not = node.not;
            const esc = node.esc === null ? null : cx(node.esc, scope, ctx).f;
            //  The pattern never changes?  Build its matcher once.
            const fixed = P.t === 'lit' && (node.esc === null || node.esc.t === 'lit')
                ? (P.v === null ? null : likeMatcher(valueText(P.v), node.esc === null ? null : node.esc.v))
                : undefined;
            const pat = cx(P, scope, ctx).f;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                let m = fixed;
                if (m === undefined) {
                    const p = pat(row, env);
                    if (p === null) return null;
                    m = likeMatcher(valueText(p), esc === null ? null : esc(row, env));
                }
                if (m === null) return null;
                return m.test(look !== null && typeof x === 'number' ? lookText(x, look) : valueText(x)) !== not;
            }, ty: 'bool' };
        }
```

**5.** The answer keeps the look. Which answer columns get one? A column that IS a money column (or `*`), or a `SUM` / `MIN` / `MAX` / `AVG` / `TOTAL` of one. (`salary * 2` is a new number: plain.) At the end of `runQuery`:

```js
    const looks = answerLooks(ready.picked, ready.plan, catalog);
    answer.columns.forEach(function (c, k) { c.look = looks[k]; });
```

```js
//  The LOOK of each answer column  ($116,450.00),  or null  (a plain number,  or words).
//  A column gets its table's look when it IS that column  (or  *),  or a SUM / MIN / MAX / AVG / TOTAL of it.
//  (Anything else,  like  salary * 2  or a UNION:  plain numbers.   AVG gets at least 2 places:  it's rarely whole.)
function answerLooks(picked, plan, catalog) {
    const none = plan.cols.map(function () { return null; });
    if (picked.t !== 'query' || picked.body.t !== 'core' || picked.body.from === null) return none;
    const c = picked.body;
    const tables = [];
    (function walk(f) {
        if (f.t === 'table') {
            const t = catalog.find(f.name);
            if (t !== null) tables.push({ keys: [String(f.name).toLowerCase(), String(f.alias || '').toLowerCase()], table: t });
        } else if (f.t === 'join') { walk(f.a); walk(f.b); }
    })(c.from);
    function lookOfCol(e) {
        if (e.t !== 'col') return null;
        for (const s of tables) {
            if (e.table !== null && s.keys.indexOf(String(e.table).toLowerCase()) === -1) continue;
            const j = columnNames(s.table).map(function (n) { return n.toLowerCase(); }).indexOf(String(e.name).toLowerCase());
            if (j !== -1) return lookAt(s.table, j);
        }
        return null;
    }
    const out = [];
    for (const it of c.items) {
        if (it.star) {
            tables.forEach(function (s) {
                if (it.table === null || s.keys.indexOf(String(it.table).toLowerCase()) !== -1) columnLooks(s.table).forEach(function (L) { out.push(L); });
            });
            continue;
        }
        const e = it.e;
        let L = lookOfCol(e);
        if (e.t === 'fn' && !e.over && !e.star && e.args.length === 1 && ['SUM', 'MIN', 'MAX', 'AVG', 'TOTAL'].indexOf(e.name) !== -1) {
            L = lookOfCol(e.args[0]);
            if (L !== null && e.name === 'AVG') L = Object.assign({}, L, { places: Math.max(L.places, 2) });
        }
        out.push(L);
    }
    return out.length === plan.cols.length ? out : none;           //  (didn't line up  (a JOIN with USING?):  play it safe)
}
```

```js
//  A value,  as it's shown in the answer.   (A column with a look  (money):  in its look,   $116,450.00.)
function queryCellText(v, ty, look) {
    if (v === null) return '';
    return look && typeof v === 'number' ? lookText(v, look) : valueText(v, ty);
}
```

**6.** The brain prints each answer cell in its column's look (in `showAnswer`):

```js
    const looks   = cols.map(function (c) { return c.look || null; });     //  money keeps its look:   $116,450.00
```

```js
            const cell = queryCellText(v, types[c], looks[c]);
```

> **The FILE never changes.** The sheet still shows `$116,450.00` exactly as written: only the QUESTIONS see a number. And Export CSV saves the answer in its look too.

<br>

### Step 11.9: What the random tests found

To test "does it find the right rows", a tester (`tools/query-test/fuzz.js`) makes up THOUSANDS of random, correct questions, runs each one here AND in the real SQLite, and compares. Plus the same questions inside the page, a chaos test (random clicking, scrolling, searching, flipping, between questions), and a person's questions on real files. Two things turned up:

**1. `%` with decimals.** `7.9 % 3`: SQLite cuts both sides to WHOLE numbers first (`7 % 3 = 1`). JavaScript's own `%` says `1.9`. In `compileMath`, replace the `%` part:

```js
        case '%': return { f: function (row, env) {
                //  SQLite's way:  both sides are cut to WHOLE numbers first   (7.9 % 3  =  7 % 3  =  1,    0.15 % 6  =  0).
                //  Cut down to 0?  NULL   (7 % 0.5  =  7 % 0).   The sign is the left side's   (-7 % 3  =  -1).
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = Math.trunc(numOf(x)), ny = Math.trunc(numOf(y));
                if (ny === 0 || !isFinite(ny)) return null;
                return nx % ny;
            }, ty: ty };
```

**2. `select * from all`.** Flexibility used to "add the table" in FRONT of any keyword after FROM (`from orders all`: then a strange error). Now only in front of the next part of the query (`from WHERE ...`); a word that can't be a table (`all`, `*`, `2024`) is REPLACED by the open table (just one table: otherwise, which one?). That's rule 3 in Step 11.4's `flexFix`.

<br>

### Step 11.10: Faster on big and WIDE files

Measured first, changed second, measured again (and kept only what really helped). The big one: on a WIDE file (`square_10000.csv`: 10,000 columns), every question looked at all 10,000 columns, even one about column 1:

| `square_10000.csv`  (straight through the engine, in the page) | Before | After |
|---|---|---|
| `SELECT C1, COUNT(*) ... GROUP BY 1` | ~10 s | **56 ms** |
| `SELECT * ... WHERE C1 > 9990` | 5.3 s | **0.73 s** |
| `square_5000.csv`: `SELECT * ... WHERE C1 > 4990` | 2.9 s | **0.36 s** |
| 1 million rows: `SELECT * ... WHERE price > 499` | 346 ms | **266 ms** |
| 1 million rows sorted: the longest the page stood still | 84–98 ms | **18 ms** |
| any question: its first bite | ~23 ms | **12 ms** (one bite, like the rest) |
| a 10,000-column file opening: the query menu's lists | 67 ms | **8 ms** |

Four tricks:

| Trick | Baby words |
|---|---|
| **Cut only as far as needed** | A question about column 3 cuts each row into 3 cells, not 10,000 (`rowUpTo`). |
| **Types only for the columns named** | `readyQuery` works out the kinds of the columns the question NAMES. `SELECT *` needs them all. A wide file samples fewer rows (`SAMPLE_CELLS`): 400 rows x 10,000 columns, not 20,000 x 10,000. |
| **WHERE first** | One table? It tests the WHERE with ONLY the WHERE's columns, and cuts the rest of a row only if it passes. |
| **No long stops** | A sort's row numbers go in a typed list (`Int32Array`: cheap for the browser's cleaner-upper), and every big loop takes breaths. |

**1.** The brain's table gets a 2nd way to read a row: just the first `count` cells. Next to `row:` in `engineTable`:

```js
        rowUpTo: function (i, count) { return cellsUpTo(tableRowText(table, i), count); },     //  just the first  count  cells
```

...using this, right above `cutCsvText`:

```js
//  Just the first  count  cells of a line   (a question about column 3 of a 10,000-column file doesn't cut the other 9,997).
//  No quotes in those cells?  One quick  split.   Quotes?  The careful way  (splitIntoCells),  then keep the first  count.
function cellsUpTo(line, count) {
    const first = line.split(',', count);
    for (let k = 0; k < first.length; k++) {
        if (first[k].indexOf('"') !== -1) return splitIntoCells(line).slice(0, count);
    }
    return first;
}
```

> **`split(',', count)`?** "Cut at the commas, but stop after `count` pieces." The browser really stops there: a 10,000-cell row, cut to 2 cells, takes 0.1 µs instead of 300 µs.

**2.** `tableSource`, all of it (replace the old one). The columns get their kinds when first asked (`Object.defineProperty ... get`); each row is cut only as far as the last column used; and a WHERE (`pre`) is tested first:

```js
function tableSource(table, alias) {

    const names = columnNames(table);
    //  Each column's kind and look are read the first time they're needed  (readyQuery already worked out the ones the
    //  question names:  a question about 2 columns of a 10,000-column file never looks at the other 9,998).
    const cols  = names.map(function (n, j) {
        const c = newCol(n, alias, null);
        Object.defineProperty(c, 'ty',   { get: function () { return kindAt(table, j); }, enumerable: true });
        Object.defineProperty(c, 'look', { get: function () { return lookAt(table, j); }, enumerable: true });
        return c;
    });
    const width = cols.length;

    return {
        cols: cols,
        canTestFirst: true,             //  it can test a WHERE itself,  before cutting the whole row  (see  pre  below)

        //  pre  (from compileCore,  when there's a WHERE):   { test,  cols }   the WHERE,  and the columns it reads.
        //  Then each row is cut only as far as the WHERE needs,  and tested:  only a row that PASSES gets the rest of its
        //  cells cut.   (SELECT * ... WHERE id = 7  on a 10,000-column file:  1 cell a row,  not 10,000.)
        scan: function* (env, sink, pre) {

            //  Only the columns the query USES get turned into values  (a query about 2 columns of 40 is much quicker).
            const used = [];
            for (let j = 0; j < width; j++) if (cols[j].used) used.push(j);
            const numeric = used.map(function (j) { const k = kindAt(table, j); return k === 'int' || k === 'real' || k === 'num'; });
            const looked  = used.map(function (j) { return lookAt(table, j) !== null; });     //  money:  $116,450.00  ->  116450
            const isNull = table.isNull || null;
            const emptyIsNull = table.emptyIsNull !== false;
            const n = table.rowCount;
            const emptyRow = new Array(width).fill(null);
            //  Cut each row only as far as the LAST column used   (column 3 of 10,000:  3 cells,  not 10,000).
            const upTo = used.length === 0 ? 0 : used[used.length - 1] + 1;

            const cutAll = table.rowUpTo && upTo < width;                  //  cut only part of each row?

            //  An empty cell:  NULL,  or really empty words  ('')   (a SQL dump says which;  a CSV can't,  so it's NULL)
            function empty(i, j) { return (isNull !== null && isNull(i, j)) || (isNull === null && emptyIsNull) ? null : ''; }
            //  Money:  $116,450.00  ->  116450   (a cell that doesn't fit stays as words)
            function money(s) { const L = lookOf(s); return L === null ? s : L.n; }

            //  The WHERE's own columns,  and the rest
            let preU = null, restU = null, preUpTo = 0;
            if (pre) {
                const inPre = new Set(pre.cols);
                preU = []; restU = [];
                for (let u = 0; u < used.length; u++) (inPre.has(used[u]) ? preU : restU).push(u);
                preUpTo = preU.length === 0 ? 0 : used[preU[preU.length - 1]] + 1;
            }
            const nPre = pre ? preU.length : 0, nRest = pre ? restU.length : 0;
            //  Cut in TWO steps  (the WHERE's part,  then the rest only for rows that pass)  only when that saves real work:
            //  more than 16 cells past the WHERE's.   Otherwise ONE cut is enough for both:  on a 6-column file,  most rows
            //  pass,  and cutting them twice made a big  SELECT * ... WHERE  10% slower.
            const testTo = pre && table.rowUpTo && upTo - preUpTo > 16 ? preUpTo : upTo;
            const cutPre = pre && table.rowUpTo && testTo < width;
            const preCovers = cutPre ? testTo : width;                      //  how far the test's cutting goes
            const scratch = pre ? new Array(width).fill(null) : null;     //  (the test row:  reused,  only the WHERE's cells filled in)
            const nUsed = used.length;

            let work = 0;                   //  cells cut since the last breath

            for (let i = 0; i < n; i++) {

                work += pre ? (preUpTo > 0 ? preUpTo : 1) : nUsed === 0 ? 1 : upTo;
                if ((i & 1023) === 1023 || work >= BITE_CELLS) { work = 0; yield i / n; }

                //  (The cell -> value lines below are written out in each loop,  not in a little function:
                //   this runs for every cell of a million rows,  and the calls cost about 10%.)
                if (pre) {
                    let cells = null;
                    if (nPre > 0) {
                        cells = cutPre ? table.rowUpTo(i, testTo) : table.row(i);
                        for (let k = 0; k < nPre; k++) {
                            const u = preU[k], j = used[u], s = cells[j];
                            scratch[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : s;
                        }
                    }
                    if (!truthy(pre.test(scratch, env))) continue;                 //  doesn't pass:  the rest is never cut
                    if (nUsed === 0) { if (!sink(emptyRow)) return; continue; }
                    const row = new Array(width);
                    for (let k = 0; k < nPre; k++) { const j = used[preU[k]]; row[j] = scratch[j]; }
                    if (nRest > 0) {
                        if (cells === null || upTo > preCovers) cells = cutAll ? table.rowUpTo(i, upTo) : table.row(i);
                        work += upTo;
                        for (let k = 0; k < nRest; k++) {
                            const u = restU[k], j = used[u], s = cells[j];
                            row[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : s;
                        }
                    }
                    if (!sink(row)) return;
                    continue;
                }

                //  (No columns used at all,  like COUNT(*)?   Then every row can be the same empty one.)
                const row = nUsed === 0 ? emptyRow : new Array(width);
                if (nUsed > 0) {
                    const cells = cutAll ? table.rowUpTo(i, upTo) : table.row(i);
                    for (let u = 0; u < nUsed; u++) {
                        const j = used[u], s = cells[j];
                        row[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : s;
                    }
                }
                if (!sink(row)) return;
            }
        },
    };
}
```

| Code | Baby words |
|---|---|
| `get: function () { return kindAt(table, j); }` | The column's kind, worked out the first time anything asks. A question about 2 columns never asks for the other 9,998. |
| `testTo` | Cut in TWO steps only when that saves real work (more than 16 cells past the WHERE's). On a 6-column file most rows pass anyway, and cutting them twice was 10% SLOWER (measured). |
| `scratch` | The test row: ONE list, reused for every row. Only the WHERE's cells are filled in. |
| The value lines, written out 3 times | They run for every cell of a million rows: in a little function, the calls cost ~10% (measured). |

**3.** In `compileCore`, right after `const where = ...`: one table? It tests the WHERE itself. (Right there, the "used" columns are exactly the WHERE's: nothing else is compiled yet.)

```js
    const pushed = where !== null && src.canTestFirst === true;
    const pre = pushed ? { test: where, cols: src.cols.map(function (col, j) { return col.used ? j : -1; }).filter(function (j) { return j !== -1; }) } : null;
```

...and the 3 `src.scan(...)` calls in `compileCore`'s `run` pass it along, and don't test the WHERE again when the table already did (`!pushed`). The plain one:

```js
            if (!grouped && windows.length === 0) {
                yield* src.scan(env, function (row) {
                    if (!pushed && where !== null && !truthy(where(row, env))) return true;
                    return emit(row);
                }, pre);
                return out;
            }
```

(The grouped one: `if (!pushed && where !== null ...)` and `}, pre);` the same way. The windows one: `if (pushed || where === null || ...) level.push(row);` and `}, pre);`.)

**4.** The sort (`sortByKeys`): row numbers in a typed list, and breaths:

```js
        const list = new Int32Array(n);
        for (let r = 0; r < n; r++) list[r] = r;
        order = yield* sortRows(list, compare);
```

```js
    let from = rows, to = ArrayBuffer.isView(rows) ? new Int32Array(n) : new Array(n);     //  (row numbers:  typed,  like the list)
```

...and after a sort, the extra columns come off IN PLACE (a copy of each of a million rows was the last ~70 ms freeze):

```js
            //  The sort's extra columns  (ORDER BY something not shown)  come off.   In place:  these rows were made just for
            //  this answer,  and a copy of each of a million rows cost ~70 ms  (plus the cleaning up after).
            for (let k = 0; k < rows.length; k++) {
                if (rows[k].length > width) rows[k].length = width;
                if ((k & 65535) === 65535) yield;
            }
```

**5.** The query menu's long lists (`pickList`): a list with more than 200 choices (a file with thousands of columns) only makes them when you open it:

```js
//  A little drop-down list.   options  =  [[value, words]]
//  A LONG one  (a file with thousands of columns)?  Its options are only made when you OPEN it.
//  (5 lists x 10,000 columns = 50,000 options,  made on every load AND on every pick:  ~0.1 s each time.)
//  Until then it holds just the one that's picked,  and the longest one  (so it's already as wide as it'll be).
const LAZY_LIST = 200;

function pickList(options, chosen, label, onPick) {
    const list = document.createElement('select');
    list.setAttribute('aria-label', label);
    function fillWith(some) {
        const box = document.createDocumentFragment();
        some.forEach(function (o) {
            const option = document.createElement('option');
            option.value = o[0];
            option.textContent = o[1];
            if (o[0] === chosen) option.selected = true;
            box.appendChild(option);
        });
        list.appendChild(box);
    }
    if (options.length <= LAZY_LIST) fillWith(options);
    else {
        const picked = options.find(function (o) { return o[0] === chosen; }) || options[0];
        const longest = options.reduce(function (a, o) { return o[1].length > a[1].length ? o : a; }, picked);
        fillWith(longest === picked ? [picked] : [picked, longest]);
        let full = false;
        const fill = function () { if (full) return; full = true; list.textContent = ''; fillWith(options); };
        ['mousedown', 'focus', 'keydown', 'touchstart'].forEach(function (e) { list.addEventListener(e, fill, { passive: true }); });
    }
    list.addEventListener('change', function () { onPick(list.value); });
    return list;
}
```

> **Why also the LONGEST name?** A list is as wide as its widest choice. With the longest one already in, the list doesn't jump wider when it fills.

**6.** The answer's lines are glued together bite by bite (`pieces`), not all at the end (in `showAnswer`):

```js
            pieces.push(parts.join(''));
            parts.length = 0;
```

```js
    pieces.push(parts.join(''));
```

> **Measuring tip:** the speed tests in Node (`tools/query-test/speed.js`) used to load the engine in a "sandbox". In there, every `Math.` and `Number.` was ~200 times slower: `SUM` looked 400 times slower than it really is. Always measure the way it really runs.

<br>

### ✅ Test it

The test tables are in `Castle Claude/small-files/query/`.

1. Open `orders.csv`. Press **Query**. **Query Flexibility** is ticked (solid SQL blue, white ✓). **Type mode** isn't (a white box).
2. Click in the SQL box: **Type mode** ticks itself, and the builder greys out.
3. Type `select from orders`. **Run**. You get all 400 rows. Open the menu again: the box says `select * from orders`, and under it: "Query Flexibility fixed: added `*` (all the columns)". The badge says *Query Flexibility fixed 1 thing*.
4. Try `selct status, count(*) form orders wher qty > 5`. 4 rows. 4 fixes.
5. Untick **Query Flexibility**, and run `select from orders` again: red words, refused, exactly as written. Tick it back.
6. Type `select status, count(*) as n from orders where qty > 5 group by status order by n desc limit 3`. Untick **Type mode**: the builder lights up with all of it (Group by status, count rows *as n*, qty is over 5, sort by n, at most 3).
7. Type mode again, `select upper(status), qty from orders`. Untick: *The builder can't show: UPPER(status).* **Keep typing** (nothing changes), or **Drop it** (the builder shows qty).
8. In the builder: Keep rows **status is Shipped** (big S). Run: 190 rows, and the builder's box now says `shipped`.
9. Back to file. Rest the mouse on a cell: after a moment, **expand?** shows up on its corner. Click the cell: the Details open, for that row. Click another: they follow. Escape closes them.
10. Search `pending`, click the 3rd row: the Details say the FILE's row number (not 3).
11. Type `select * from all`: it runs on the open table (and says `all -> orders`).
12. Open a file with money in it (like `corporate_500k.csv`, `"$116,450.00"`). Ask `SELECT MAX("Annual Salary"), AVG("Annual Salary") FROM corporate_500k`: `$409,950.00`, and an average with cents. `WHERE "Annual Salary" > 150000` finds 156,396 rows, not all of them.

<br>

---

<br>

# PART 12: Ask It Like a Person 🗣️

Part 11 made the engine forgiving. Then a test that played a high schooler's first data class found the places where "forgiving" turned into "quietly wrong", and where a person's normal words got a robot's answer. The same 10-row class gradebook (`small-files/beginner/class_data.csv`), the OLD engine (Part 11) and the NEW one:

| You type | Part 11 did | Now |
|---|---|---|
| `... where score between 90-100` | ⚠️ **all 10 rows**: the WHERE was quietly left out | `between 90 AND 100`: **4 rows** |
| `... where score = 92%` | ⚠️ **all 10 rows**: left out too | `score = '92%'`: **1 row** |
| `... where score between 90-100 and "letter grade" = 'A'` | ⚠️ **0 rows**, no error (it ran `BETWEEN -10 AND "letter grade"`) | **2 rows** |
| `... where "student name" = 'Liam O'Brien'` | ❌ Expected the query to end here (near Brien) | `'Liam O''Brien'`: **1 row** |
| `... where score > 90 and < 100` | ❌ Expected a value, a column, or a function | `and score < 100`: **3 rows** |
| `... where "makeup homework" = ''` | ⚠️ **0 rows** (in a CSV an empty cell is NULL, never `''`) | `IS NULL`: **7 rows** |
| `... where score >` | all 10 rows, said only as a "fix" | all 10 rows, AND a **warning**: "NOT filtered by where score >" |
| `show me the A students` | ❌ There's no column named me | `WHERE "Letter Grade" = 'A'`: **2 rows** |
| `how many of us failed` | ❌ There's no column named how | "Did you mean: **How many rows in class_data?** (I didn't use: failed)" |
| `select * ... where score > 80; oops` | ❌ There's no column named oops | "The **LAST** question (after the last `;`) has a problem ... **The one before it is fine** on its own" |

The ⚠️ rows are the dangerous ones: an answer that LOOKS fine, for a question you didn't ask.

This part adds 5 things to the engine (`queryI.js`), and then a new menu that uses them:

1. **Warnings.** A fix that LEFT OUT a condition is not a typo fix: the answer has rows the question meant to keep out. It's now a warning, kept apart from the fixes.
2. **4 new fixes and a 3rd trap** (`O'Brien`, `92%`, `90-100` / `90 to 100`, `and < 100`, and `between 90-100 and ...`).
3. **Snap to result, 2 new ways:** `= ''` in a CSV, and totals of nothing (`COUNT(*)` = 0).
4. **Plain words.** "average score per grade level" becomes SQL. It knows the table's columns and values, and about 150 plain words. Every OTHER word is handed back as unused, and a question with an unused word is never run by itself: you're asked "Did you mean ...?" first.
5. **The question, back in words.** Any SQL, written as a sentence. The words come from each column's KIND, so they never fib: sorting a WORDS column says "Z to A", not "highest first".
6. **The "Ask" menu** (Steps 12.8 to 12.16). The goal: somebody who has never heard of SQL looks at it for 2 seconds and gets their answer.

```text
   ┌───────────────────────────────────────────────────────────────────┐
   │ Ask  ·  class_data  ·  10 rows                                  × │
   │ Try:  (How many for each Grade Level) (Top 5 by Score) ...        │   <- press one: the answer
   │ Show      [every column]  [+ column ▾]  [+ count or total ▾]      │   <- or pick: a SENTENCE
   │ where     [any column ▾] [contains ▾] [jo] ×    [+ and ▾]         │      (Show + where always there,
   │           [+ for each ▾]  [+ sorted by ▾]  [+ at most]            │       glowing a little)
   │ → 2 rows  ·  Every row of class_data where Student Name contains  │   <- what you'd get, BEFORE you ask
   │ SQL  [✓] Fix my typos  [ ] Write it myself                        │   <- the SQL it writes (or yours:
   │ [Show answer ▶]  [Copy SQL]  [Save as CSV]                        │      SQL, or plain words)
   └───────────────────────────────────────────────────────────────────┘
```

All 3 ways stay in step: a Try question → the sentence → the SQL. Whichever you use, the other two show what it means. (Plain words go in the SQL box: Fix my typos reads them. One box for writing, not two.)

> **No AI here.** Nothing is sent anywhere, nothing is guessed by a model. The same words always give the same SQL, and every rule is in this file. That's on purpose: a tool people trust with their data has to be one you can check.

> **Building in order?** Part 11's files are frozen now (`tools/tutorial/frozen/*-part11b.*`). Steps 12.1 to 12.7 only ADD to `queryI.js`, except 4 small changes (Steps 12.1, 12.2, 12.4, 12.6): find those lines from Part 11 and replace them. Steps 12.8 to 12.16 REPLACE the query menu's skeleton and most of its brain from Parts 10 and 11 (each step says which).

<br>

### Step 12.1: A fix that left something out is a WARNING

Part 11 cut an unfinished end off (`... WHERE qty >`) and said "left out the unfinished where qty >", in the same small words as "selct → SELECT". But those two are not the same kind of thing. A typo fix answers YOUR question. A cut WHERE answers a bigger one.

**1.** Replace `FLEX_CUT_AT`, and add `FLEX_WIDENS` right under it:

```js
//  Where an unfinished end gets cut off   (... WHERE qty >   ->   cut from WHERE)
//  (Not ON:  a JOIN with its ON left out pairs EVERY row with every row.   An unfinished ON stays a mistake.)
const FLEX_CUT_AT = new Set(['WHERE', 'AND', 'OR', 'HAVING', 'LIMIT', 'OFFSET', 'BY']);

//  Cutting from one of these leaves out a CONDITION:  the answer then has rows the question meant to keep out.
//  That's more than a typo fixed,  so it's said as a WARNING  (flex.warnings),  and the page shows it in amber.
const FLEX_WIDENS = new Set(['WHERE', 'AND', 'OR', 'HAVING']);
```

| Code | Baby words |
|---|---|
| no `'ON'` any more | `... JOIN customers ON` with the ON cut off would pair EVERY order with EVERY customer. An unfinished ON stays a mistake. |
| `FLEX_WIDENS` | The words that start a CONDITION. Cutting from one of them = rows the question meant to keep out. |

**2.** In `flexFix`, rule 6 now says so. Replace rule 6 (the whole `if (atEnd) { ... }`):

```js
        //  6.  It stopped at the END:  the end is unfinished.   Leave it out   (... WHERE qty >   ...  LIMIT   select status,)
        if (atEnd) {
            let cut = -1;
            for (let j = i - 1; j > s && cut === -1; j--) {
                if (depth[j] === depth[i] && ((tk[j].k === 'id' && FLEX_CUT_AT.has(tk[j].u)) || flexIsOp(tk[j], ','))) cut = j;
            }
            if (cut === -1) return null;
            if (flexIsWord(tk[cut], 'BY') && (flexIsWord(tk[cut - 1], 'ORDER') || flexIsWord(tk[cut - 1], 'GROUP'))) cut--;
            say('left out the unfinished  ' + words(cut, i - 1));
            //  A condition left out  (or a WHERE with nothing in it)?   The answer has rows the question meant to keep out:  say so LOUDLY.
            if (tk[cut].k === 'id' && FLEX_WIDENS.has(tk[cut].u) && (i - 1 > cut || tk[cut].u === 'WHERE' || tk[cut].u === 'HAVING')) {
                flex.warnings.push('NOT filtered by  ' + words(cut, i - 1) + '   (it wasn\'t finished,  so it was left out)');
            }
            return sql.slice(0, tk[cut].at).replace(/\s+$/, '') + sql.slice(prev.to);
        }
```

> `i - 1 > cut` = there was something AFTER the word (`where qty >`, not just `where`). A lone `and` at the end left nothing out, so it's only a fix. A lone `WHERE` is a warning: you meant to filter, and nothing was.

<br>

### Step 12.2: Four new fixes, and a third trap

**1.** At the very top of `flexFix`, right after `if (!why) return null;`, the apostrophe fix goes FIRST (before "add the missing `'` at the end", which can't help this one):

```js
    //  An  '  INSIDE words  ('Liam O'Brien',  'don't'):  it ended the words too soon.   SQL writes it twice:   'O''Brien'
    if ((why.kind === 'unclosed' && why.close === "'") || why.kind === 'parse') {
        const doubled = flexApostrophes(sql);
        if (doubled !== null) {
            flex.fixes.push(doubled.words.join(',  ') + '  ->  ' + doubled.words.map(function (w) { return w.split("'").join("''"); }).join(',  ') +
                            '   (an  \'  inside words is written twice in SQL)');
            return doubled.sql;
        }
    }
```

The function it calls goes at the end of the file:

```js
//  The  '  marks INSIDE words   ('Liam O'Brien':  the one between O and B)   ->   { sql  (each one written twice),  words }
//  null  =  there are none,  or the quotes STILL don't add up with them doubled  (then the mistake was something else).
//  (Only ever after a mistake:   x='a'OR y=1   is fine SQL,  and a question that runs is never changed.)
function flexApostrophes(sql) {
    const letter = function (c) { return c !== undefined && c.toLowerCase() !== c.toUpperCase(); };
    const digit  = function (c) { return c !== undefined && c >= '0' && c <= '9'; };
    const inside = [];
    let state = '';                                     //  ''  =  outside,   "'"  =  in words,   '"'  '`'  ']'  =  in a name
    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (state === '') {
            if (c === "'") state = "'";
            else if (c === '"' || c === '`') state = c;
            else if (c === '[') state = ']';
            else if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql.charCodeAt(i) !== 10) i++; }
            else if (c === '/' && sql[i + 1] === '*') { const end = sql.indexOf('*/', i + 2); if (end === -1) return null; i = end + 1; }
            continue;
        }
        if (state !== "'") {                            //  in a name:  only its own closing mark counts   ("" = a real ")
            if (c === state) { if (state !== ']' && sql[i + 1] === state) i++; else state = ''; }
            continue;
        }
        if (c !== "'") continue;
        if (sql[i + 1] === "'") { i++; continue; }      //  ''  =  already written twice
        if ((letter(sql[i - 1]) || digit(sql[i - 1])) && letter(sql[i + 1])) { inside.push(i); continue; }     //  O'Brien:  inside the words
        state = '';
    }
    if (state !== '' || inside.length === 0) return null;
    let out = sql;
    for (let k = inside.length - 1; k >= 0; k--) out = out.slice(0, inside[k]) + "'" + out.slice(inside[k]);
    try { sqlTokens(out); } catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const marks = new Set(inside), words = [];
    inside.forEach(function (at) {                      //  the words each one was in   (for the fix's note:   O'Brien  ->  O''Brien)
        let a = at, b = at + 1;
        while (a > 0 && (letter(sql[a - 1]) || digit(sql[a - 1]) || marks.has(a - 1))) a--;
        while (b < sql.length && (letter(sql[b]) || digit(sql[b]) || marks.has(b))) b++;
        const w = sql.slice(a, b);
        if (words.indexOf(w) === -1) words.push(w);
    });
    return { sql: out, words: words };
}
```

| Code | Baby words |
|---|---|
| `letter(...)` | A letter in ANY alphabet: it has a capital and a small form (`é`, `Ж` too). |
| `inside.push(i)` | A `'` with a letter before AND after it (`O'Brien`, `don't`) is inside words: it doesn't end them. |
| `if (state !== '' ...) return null` | The quotes still don't add up? Then the mistake was something else: don't touch it. |
| `try { sqlTokens(out) }` | Doubled, it has to read cleanly. Otherwise, hands off. |

> **Why it can't break good SQL:** `x='a'OR y=1` has `a'O`: letters on both sides! But fixes only run on SQL that FAILED, and that one runs. (`run.js --flex` checks every correct query is left alone.)

**2.** In `flexFix`'s "words stopped making sense" part, right BEFORE rule 6, three new rules:

```js
        //  5b.  A percent:   score = 92%    (% on its own means "the remainder",  and nothing comes after it)   ->   '92%'
        //       (In quotes it's a number with a look,  like the file's  92%  cells:  next to a number column it's 92.)
        const num = tk[i - 2];
        if (flexIsOp(prev, '%') && num !== undefined && num.k === 'num' && num.to === prev.at &&
            (atEnd || flexIsOp(t, ')') || flexIsOp(t, ',') || (t.k === 'id' && SQL_RESERVED.has(t.u)))) {
            const quoted = flexWords(sql.slice(num.at, prev.to));
            say(sql.slice(num.at, prev.to) + '  ->  ' + quoted + '   (a percent:  % on its own means "the remainder")');
            return sql.slice(0, num.at) + quoted + sql.slice(prev.to);
        }

        //  5c.  A range with a dash  (BETWEEN 90-100)  or with TO  (BETWEEN 90 TO 100):   BETWEEN 90 AND 100
        if (problem.message.indexOf('Expected  AND') === 0) {
            let b = -1;
            for (let j = i - 1; j >= s && b === -1; j--) if (depth[j] === depth[i] && flexIsWord(tk[j], 'BETWEEN')) b = j;
            if (b !== -1 && flexIsWord(t, 'TO')) {
                say(sql.slice(t.at, t.to) + '  ->  AND   (BETWEEN puts AND between its two ends)');
                return swap(t, t, 'AND');
            }
            const lo = tk[b + 1], dash = tk[b + 2], hi = tk[b + 3];
            if (b !== -1 && i === b + 4 && lo.k === 'num' && flexIsOp(dash, '-') && hi.k === 'num' && lo.to === dash.at && dash.to === hi.at) {
                say(sql.slice(lo.at, hi.to) + '  ->  ' + sql.slice(lo.at, lo.to) + ' AND ' + sql.slice(hi.at, hi.to) + '   (a range:  BETWEEN puts AND between its two ends)');
                return sql.slice(0, lo.to) + ' AND ' + sql.slice(hi.at);
            }
        }

        //  5d.  The column left out after AND / OR:   score > 90 AND < 100   ->   score > 90 AND score < 100
        if (t.k === 'op' && COMPARE_SYMBOLS.has(t.v) && (flexIsWord(prev, 'AND') || flexIsWord(prev, 'OR'))) {
            let c = -1;                                     //  the comparison before it  (in the same part,  in the same  ( )
            for (let j = i - 2; j > s && c === -1; j--) {
                if (depth[j] < depth[i]) break;
                if (depth[j] !== depth[i]) continue;
                if (tk[j].k === 'id' && (tk[j].u === 'WHERE' || tk[j].u === 'HAVING' || tk[j].u === 'ON' || tk[j].u === 'WHEN' || tk[j].u === 'SELECT')) break;
                if (tk[j].k === 'op' && COMPARE_SYMBOLS.has(tk[j].v)) c = j;
            }
            if (c !== -1 && flexIsName(tk[c - 1])) {
                let from = c - 1;                           //  (people.score:  the whole name)
                while (flexIsOp(tk[from - 1], '.') && tk[from - 2] !== undefined && (tk[from - 2].k === 'id' || tk[from - 2].k === 'qid')) from -= 2;
                const left = sql.slice(tk[from].at, tk[c - 1].to);
                say(sql.slice(prev.at, t.to) + '  ->  ' + sql.slice(prev.at, prev.to) + ' ' + left + ' ' + sql.slice(t.at, t.to) + '   (said which column again)');
                return flexInsert(sql, t.at, left);
            }
        }
```

| Rule | You typed | Why it's safe |
|---|---|---|
| 5b | `score = 92%` | `92 %` with nothing after it can't be "the remainder" (that needs 2 numbers). In quotes, `'92%'` is a number with a look, like the file's cells, so next to a number column it's 92. |
| 5c | `between 90-100`, `between 90 to 100` | Only when the error was "Expected AND" right after a BETWEEN, and `90-100` is written as ONE thing (no spaces). |
| 5d | `score > 90 and < 100` | A comparison with nothing on its left can't be anything else. The column is copied from the comparison before it, in the same part of the question. |

**3.** The trap. `score between 90-100 and grade = 'A'` doesn't FAIL: it runs as `BETWEEN -10 AND grade`, then compares that to `'A'`. Zero rows, no error. In `flexTraps`, after trap 2:

```js
    //  3.  A range written with a dash,  then another condition:   score BETWEEN 90-100 AND grade = 'A'
    //      It RUNS,  but  90-100  is math  (-10),  and BETWEEN takes the AND that was meant for the next condition.
    for (let j = 0; j + 6 < tk.length; j++) {
        if (!flexIsWord(tk[j], 'BETWEEN')) continue;
        const lo = tk[j + 1], dash = tk[j + 2], hi = tk[j + 3], next = tk[j + 5], how = tk[j + 6];
        if (lo.k !== 'num' || !flexIsOp(dash, '-') || hi.k !== 'num' || lo.to !== dash.at || dash.to !== hi.at) continue;    //  90-100,  as ONE thing
        if (!flexIsWord(tk[j + 4], 'AND') || !flexIsName(next)) continue;
        const condition = (how.k === 'op' && COMPARE_SYMBOLS.has(how.v)) || flexIsWord(how, 'IS') || flexIsWord(how, 'LIKE') ||
                          flexIsWord(how, 'ILIKE') || flexIsWord(how, 'IN') || flexIsWord(how, 'BETWEEN') || flexIsWord(how, 'NOT');
        if (!condition) continue;                                       //  (BETWEEN 100-5 AND 200:  that one IS math,  and fine)
        edits.push([lo.to, hi.at, ' AND ']);
        flex.fixes.push(sql.slice(lo.at, hi.to) + '  ->  ' + sql.slice(lo.at, lo.to) + ' AND ' + sql.slice(hi.at, hi.to) +
                        '   (a range:  written with a dash it\'s math,  ' + sql.slice(lo.at, hi.to) + ' = ' + numberText(lo.v - hi.v) + ')');
        j += 4;
    }
```

> **`BETWEEN 100-5 AND 200` is left alone:** there, the AND is followed by a number, not a column and a comparison. So `100-5` really is math (95).

<br>

### Step 12.3: Snap to result, two new ways

Snap to result (Part 11) looks again when the answer is EMPTY. Two new kinds of empty:

**1.** A total of nothing. `SELECT COUNT(*) ... WHERE status = 'Shipped'` isn't "no rows": it's ONE row that says 0. Add this at the end of the file:

```js
//  An answer with NOTHING in it:  no rows,  or one row of totals of nothing  (COUNT = 0,  SUM = NULL ...).
//  (Snap to result only looks again after an answer like that.)
function answerIsEmpty(answer, picked) {
    if (answer.rows.length === 0) return true;
    if (answer.rows.length > 1 || picked.t !== 'query' || picked.body.t !== 'core' || picked.body.group !== null) return false;
    if (!picked.body.items.every(function (it) { return !it.star && isTotal(it.e); })) return false;
    return answer.rows[0].every(function (v) { return v === null || v === 0; });
}
```

**2.** `= ''` in a CSV. A CSV can't tell "empty" from "unknown", so an empty cell is NULL, and NULL is never equal to anything. `notes = ''` is always 0 rows there. (A SQL dump keeps `''` and NULL apart: left alone.)

```js
//  column = ''   where an EMPTY cell means NULL  (a CSV,  an Excel sheet):  no row there is ever  ''   ->   column IS NULL
//  (Only after an empty answer,  like the spelling snap.   A SQL dump keeps  ''  and NULL apart:  it's left alone there.)
function flexEmptyWords(sql, picked, catalog) {
    let tk;
    try { tk = sqlTokens(sql); } catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const columns = new Set();
    walkQuery(picked, function (item) {
        const table = catalog.find(item.name);
        if (table !== null && table.emptyIsNull) columnNames(table).forEach(function (c) { columns.add(c.toLowerCase()); });
    });
    const edits = [], fixes = [];
    for (let j = 2; j < tk.length; j++) {
        const empty = tk[j], is = tk[j - 1], col = tk[j - 2];
        if (empty.k !== 'str' || empty.v !== '' || !(flexIsOp(is, '=') || flexIsOp(is, '=='))) continue;
        if (!(col.k === 'id' || col.k === 'qid') || !columns.has(String(col.v).toLowerCase()) || flexIsOp(tk[j + 1], '||')) continue;
        edits.push([is.at, empty.to, 'IS NULL']);
        fixes.push(sql.slice(col.at, empty.to) + '  ->  ' + sql.slice(col.at, col.to) + ' IS NULL   (an empty cell is NULL here,  not \'\')');
    }
    if (edits.length === 0) return null;
    let out = sql;
    for (let k = edits.length - 1; k >= 0; k--) out = out.slice(0, edits[k][0]) + edits[k][2] + out.slice(edits[k][1]);
    return { sql: out, fixes: fixes };
}
```

<br>

### Step 12.4: More than one question in the box

Only the LAST question in the box runs (since Part 10). That's fine... until the last one is junk: `SELECT * FROM t WHERE x > 80; oops` said "There's no column named oops", and nothing about your good question.

**1.** The refusal for DROP, DELETE ... gets a `why` too, so nothing later can mistake it for plain words. In `readyQuery`, replace the `if (picked.t === 'write')` part:

```js
    if (picked.t === 'write') {
        queryFail(picked.verb + '  would change the data,  so it can\'t run here:  this tool only READS  (your file is never changed).  ' +
                  'Try a SELECT,  like:   SELECT * FROM ' + (catalog.names()[0] || 'your_table') + ' LIMIT 10', { kind: 'write', verb: picked.verb });
    }
```

**2.** Where each question starts, and whether the one before the last was fine (end of the file):

```js
//  Where each question in the text starts and stops  (split by the  ;  marks that aren't inside  ( )):   [[first token, end token] ...]
function flexStatementRanges(tk) {
    const out = [];
    let start = 0, depth = 0;
    for (let j = 0; j < tk.length; j++) {
        const t = tk[j];
        if (t.k === 'op' && t.v === '(') depth++;
        else if (t.k === 'op' && t.v === ')') depth = Math.max(0, depth - 1);
        if (t.k === 'end' || (t.k === 'op' && t.v === ';' && depth === 0)) {
            if (j > start) out.push([start, j]);
            start = j + 1;
        }
    }
    return out;
}

function flexStatementCount(text) {
    try { return flexStatementRanges(sqlTokens(text)).length; }
    catch (problem) { if (problem instanceof QueryError) return 1; throw problem; }
}

//  The question BEFORE the last one:  a whole,  good question on its own?   (Then only what came after it is wrong.)
function flexEarlierIsFine(text, catalog) {
    try {
        const tk = sqlTokens(text);
        const ranges = flexStatementRanges(tk);
        if (ranges.length < 2) return false;
        const statements = parseSql(text.slice(0, tk[ranges[ranges.length - 1][0]].at));
        const picked = statements[statements.length - 1];
        if (picked.t !== 'query') return false;
        compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
        return true;
    } catch (problem) {
        if (problem instanceof QueryError) return false;
        throw problem;
    }
}
```

> `flexEarlierIsFine` reads AND compiles the question before the last `;` (no running: quick). If that works, the problem is only what came after it, and the words say so.

<br>

### Step 12.5: What's in each column (the profile)

Plain words need to know your table: "the **A** students" means `"Letter Grade" = 'A'` only because the file has an A in Letter Grade. So the engine takes ONE look at up to 20,000 rows (in bites, like everything else), and keeps what it saw on the table:

```js
//    A TABLE'S PROFILE   (what's IN each column:  for plain words,  and the menu's "Try:" questions)
//
//    One look at up to PROFILE_ROWS rows,  spread through the whole file  (in bites),  then kept on the table.
//    For each of the first PROFILE_COLUMNS columns:
//        { name,  kind,
//          values,   Map:  the words written loosely  ->  the file's own spelling     ('shipped'  ->  'Shipped')
//                    null  =  more than PROFILE_VALUES different ones  (names,  notes ...:  not a "pick one" column)
//          count,    Map:  the file's spelling  ->  how many of the rows looked at have it
//          filled }  how many of those rows have something in this column
//
// ----------------------------------------------------------

const PROFILE_ROWS    = 20000;
const PROFILE_COLUMNS = 60;
const PROFILE_VALUES  = 500;

async function tableProfile(table, isCurrent) {

    if (table.profile) return table.profile;

    const names = columnNames(table);
    const width = Math.min(names.length, PROFILE_COLUMNS);
    let stopAt = performance.now() + CHUNK_TIME;
    async function breathe() {
        if (performance.now() < stopAt) return;
        await new Promise(function (go) { nextBite(go); });
        if (!isCurrent()) throw QUERY_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }

    //  Their kinds first  (in bites too:  a wide file's are a lot of looking)
    const only = [];
    for (let j = 0; j < width; j++) only.push(j);
    const looking = lookAtKinds(table, only);
    while (!looking.next().done) await breathe();

    const cols = [];
    for (let j = 0; j < width; j++) cols.push({ name: names[j], kind: table.kinds[j], values: new Map(), count: new Map(), filled: 0 });

    const n = table.rowCount;
    const sample = Math.min(n, PROFILE_ROWS);
    const step = n / Math.max(sample, 1);
    let work = 0;
    for (let s = 0; s < sample; s++) {
        work += width;
        if (work >= BITE_CELLS || (s & 511) === 511) { work = 0; await breathe(); }
        const r = Math.floor(s * step);
        const cells = table.rowUpTo ? table.rowUpTo(r, width) : table.row(r);
        for (let j = 0; j < width; j++) {
            const v = cells[j];
            if (v === undefined || v === '' || (table.isNull !== null && table.isNull(r, j))) continue;
            const col = cols[j];
            col.filled++;
            if (col.values === null) continue;
            const key = flexLoose(v);
            if (!col.values.has(key)) {
                if (col.values.size >= PROFILE_VALUES) { col.values = null; col.count = null; continue; }
                col.values.set(key, v);
            }
            const spelled = col.values.get(key);
            col.count.set(spelled, (col.count.get(spelled) || 0) + 1);
        }
    }

    table.profile = { rows: sample, columns: cols };
    return table.profile;
}
```

| Code | Baby words |
|---|---|
| `values` | Every different value, written loosely (`'shipped'`), and how the FILE spells it (`'Shipped'`). |
| `PROFILE_VALUES` (500) | More different values than that? Not a "pick one" column (names, notes). Stop keeping them. |
| `lookAtKinds(table, only)` | The kinds of just these columns, in bites. (A 10,000-column file only pays for its first 60.) |

What each column is FOR, and the 4 starter questions the menu offers (the next milestone's "Try:" row):

```js
function isNumberKind(kind) {
    return kind === 'int' || kind === 'real' || kind === 'num';
}

//  What each column is FOR   (from its profile):
//      groups     2 to 12 different values  (and fewer than half the rows):   Region,  Status,  Grade Level   ->  "for each ..."
//      measures   numbers that change  (not a group,  not an ID)                                             ->  "average ...",  "top 5 by ..."
//      dates      dates                                                                                      ->  "newest first"
const ID_LIKE = /(^|[^A-Za-z])(id|ID|Id)$/;

function profileRoles(profile) {
    const groups = [], measures = [], dates = [];
    profile.columns.forEach(function (c) {
        if (c.filled === 0) return;
        const size = c.values === null ? Infinity : c.values.size;
        const group = size >= 2 && size <= 12 && size <= Math.max(2, c.filled / 2);
        if (group) groups.push(c);
        //  (a number with only a few values is a code:  Grade Level 9 / 10.   With more  (qty 1 ... 10),  it's ALSO a measure)
        if (isNumberKind(c.kind) && size > (group ? 5 : 1) && !ID_LIKE.test(c.name)) measures.push(c);
        if (c.kind === 'date' || c.kind === 'timestamp') dates.push(c);
    });
    //  Words make the best groups  (Status,  Region),  then the fewest values   (the order is always the same:  a sort that keeps ties)
    const size = function (c) { return c.values === null ? Infinity : c.values.size; };
    groups.sort(function (a, b) { return (isNumberKind(a.kind) - isNumberKind(b.kind)) || size(a) - size(b); });
    return { groups: groups, measures: measures.filter(function (c) { return groups[0] !== c; }), dates: dates };
}
```

```js
//  A value,  as SQL,  for a column of this kind:   a number stays a number  (for a number column),  anything else is words.
function profileValue(v, kind) {
    return isNumberKind(kind) && NUMBER_WORDS.test(v) ? String(v).trim() : flexWords(v);
}

//  The menu's "Try:" questions:  up to 4 REAL questions about this table,  each in plain words,  with its SQL.
//  (Built only from its columns' profile:  the same table always gets the same ones.)
function tableStarters(profile, tableName) {
    const roles = profileRoles(profile);
    const from = ' FROM ' + flexName(tableName);
    const g = roles.groups[0], m = roles.measures[0], d = roles.dates[0];
    const out = [];
    if (g) out.push({ words: 'How many for each ' + g.name,
                      sql: 'SELECT ' + flexName(g.name) + ', COUNT(*)' + from + ' GROUP BY ' + flexName(g.name) + ' ORDER BY COUNT(*) DESC' });
    if (g && m) out.push({ words: 'Average ' + m.name + ' for each ' + g.name,
                           sql: 'SELECT ' + flexName(g.name) + ', AVG(' + flexName(m.name) + ')' + from + ' GROUP BY ' + flexName(g.name) +
                                ' ORDER BY AVG(' + flexName(m.name) + ') DESC' });
    if (m) out.push({ words: 'Top 5 by ' + m.name, sql: 'SELECT *' + from + ' ORDER BY ' + flexName(m.name) + ' DESC LIMIT 5' });
    if (d && out.length < 4) out.push({ words: 'Newest 10 by ' + d.name, sql: 'SELECT *' + from + ' ORDER BY ' + flexName(d.name) + ' DESC LIMIT 10' });
    if (g && out.length < 4) {
        let common = null, most = 0;
        g.count.forEach(function (n, v) { if (n > most) { most = n; common = v; } });
        out.push({ words: 'Rows where ' + g.name + ' is ' + common, sql: 'SELECT *' + from + ' WHERE ' + flexName(g.name) + ' = ' + profileValue(common, g.kind) });
    }
    if (out.length === 0) out.push({ words: 'The first 10 rows', sql: 'SELECT *' + from + ' LIMIT 10' });
    return out.slice(0, 4);
}

//  2 or 3 plain-word questions with this table's OWN column names   (for "Try words like ...")
function wordsExamples(catalog) {
    const name = catalog.names()[0];
    const table = name === undefined ? null : catalog.find(name);
    if (table === null || !table.profile) return ['how many rows', 'the first 10 rows'];
    return tableStarters(table.profile, name).map(function (s) { return s.words.charAt(0).toLowerCase() + s.words.slice(1); }).slice(0, 3);
}
```

| Role | Means | Example |
|---|---|---|
| group | 2 to 12 different values, fewer than half the rows | Grade Level (9, 10), status |
| measure | numbers that change, not an ID | Score, qty |
| date | dates | ordered |

> **Same table, same questions.** Nothing random: the first group (words before numbers, then fewest values), the first measure, the first date.

<br>

### Step 12.6: Plain words → SQL

**1.** The words it knows. Each one means ONE part of a question:

```js
//    PLAIN WORDS  ->  SQL   (plain words typed in the SQL box,  with "Fix my typos" on)
//
//        how many for each grade level             ->   SELECT "Grade Level", COUNT(*) FROM class_data GROUP BY "Grade Level"
//        average score per grade level             ->   SELECT "Grade Level", AVG(Score) FROM class_data GROUP BY "Grade Level"
//        who has the highest score                 ->   SELECT * FROM class_data ORDER BY Score DESC LIMIT 1
//        names and scores where score is over 90   ->   SELECT "Student Name", Score FROM class_data WHERE Score > 90
//        show me the A students                    ->   SELECT * FROM class_data WHERE "Letter Grade" = 'A'
//
//    NOT a mind reader,  on purpose.   It knows:
//        -  the open table's COLUMN names   (any capitals,  spaces or _,  one word of a longer name,  a plural,  a small typo)
//        -  its VALUES   ("A",  "shipped":  read from the file  (its profile),  so they're spelled the file's way)
//        -  numbers,  'words in quotes',  dates  (2024-05-01)
//        -  the plain words for the parts of a question  (WORDS_KNOWN),  and the little words of a sentence  (WORDS_FILLER)
//    Any OTHER word is handed back as UNUSED.   A question with an unused word never runs by itself:
//    the page asks "Did you mean ...?" first.   So it can't quietly answer a different question.
//
//    ->  { sql,  unused  (words),  meaning  (the question back in words) }     or null  (nothing in it to use)
//
// ----------------------------------------------------------

const WORDS_KNOWN = new Map([
    //  totals
    ['how many', 'count'], ['number of', 'count'], ['count of', 'count'], ['count', 'count'], ['total number of', 'count'],
    ['how many different', 'distinct'], ['number of different', 'distinct'], ['different', 'distinct'], ['distinct', 'distinct'], ['unique', 'distinct'],
    ['average', 'avg'], ['average of', 'avg'], ['avg', 'avg'], ['mean', 'avg'],
    ['total', 'sum'], ['total of', 'sum'], ['sum', 'sum'], ['sum of', 'sum'], ['add up', 'sum'],
    ['median', 'median'], ['middle value of', 'median'],
    ['highest', 'high'], ['biggest', 'high'], ['largest', 'high'], ['greatest', 'high'], ['maximum', 'high'], ['max', 'high'], ['most', 'high'],
    ['latest', 'high'], ['newest', 'high'], ['most recent', 'high'],
    ['lowest', 'low'], ['smallest', 'low'], ['least', 'low'], ['minimum', 'low'], ['min', 'low'], ['fewest', 'low'], ['earliest', 'low'], ['oldest', 'low'],
    //  groups
    ['for each', 'each'], ['for every', 'each'], ['in each', 'each'], ['per', 'each'], ['each', 'each'], ['grouped by', 'each'], ['group by', 'each'],
    ['broken down by', 'each'], ['by', 'by'],
    //  sorting,  and how many rows
    ['sorted by', 'sort'], ['sort by', 'sort'], ['order by', 'sort'], ['ordered by', 'sort'], ['ranked by', 'sort'], ['sorted', 'sort'], ['sort', 'sort'],
    ['highest first', 'desc'], ['biggest first', 'desc'], ['largest first', 'desc'], ['most first', 'desc'], ['high to low', 'desc'], ['descending', 'desc'],
    ['desc', 'desc'], ['z to a', 'desc'], ['z-a', 'desc'], ['newest first', 'desc'], ['latest first', 'desc'],
    ['lowest first', 'asc'], ['smallest first', 'asc'], ['least first', 'asc'], ['low to high', 'asc'], ['ascending', 'asc'], ['asc', 'asc'],
    ['a to z', 'asc'], ['a-z', 'asc'], ['alphabetical', 'asc'], ['alphabetically', 'asc'], ['oldest first', 'asc'], ['earliest first', 'asc'],
    ['top', 'top'], ['bottom', 'bottom'], ['first', 'first'], ['limit', 'first'],
    //  conditions
    ['more than', '>'], ['greater than', '>'], ['higher than', '>'], ['bigger than', '>'], ['larger than', '>'], ['over', '>'], ['above', '>'],
    ['after', '>'], ['later than', '>'], ['>', '>'],
    ['at least', '>='], ['no less than', '>='], ['>=', '>='],
    ['or more', '>=after'], ['or higher', '>=after'], ['or above', '>=after'], ['and up', '>=after'], ['or later', '>=after'],
    ['less than', '<'], ['fewer than', '<'], ['lower than', '<'], ['smaller than', '<'], ['under', '<'], ['below', '<'],
    ['before', '<'], ['earlier than', '<'], ['<', '<'],
    ['at most', '<='], ['no more than', '<='], ['<=', '<='],
    ['or less', '<=after'], ['or fewer', '<=after'], ['or lower', '<=after'], ['or below', '<=after'], ['or earlier', '<=after'],
    ['is not', '<>'], ['isn\'t', '<>'], ['isnt', '<>'], ['are not', '<>'], ['aren\'t', '<>'], ['not', '<>'], ['except', '<>'], ['other than', '<>'],
    ['!=', '<>'], ['<>', '<>'],
    ['is', '='], ['are', '='], ['was', '='], ['were', '='], ['equals', '='], ['equal to', '='], ['is equal to', '='], ['=', '='], ['==', '='],
    ['between', 'between'], ['from', 'from'], ['to', 'to'], ['through', 'to'], ['-', 'to'], ['and', 'and'], ['or', 'or'],
    ['contains', 'contains'], ['containing', 'contains'], ['contain', 'contains'], ['including', 'contains'], ['includes', 'contains'],
    ['starts with', 'starts'], ['starting with', 'starts'], ['start with', 'starts'], ['begins with', 'starts'], ['beginning with', 'starts'],
    ['ends with', 'ends'], ['ending with', 'ends'], ['end with', 'ends'],
    ['is empty', 'empty'], ['is blank', 'empty'], ['is missing', 'empty'], ['are empty', 'empty'], ['are blank', 'empty'], ['are missing', 'empty'],
    ['empty', 'empty'], ['blank', 'empty'], ['missing', 'empty'], ['no', 'no'], ['without', 'no'], ['without a', 'no'], ['without any', 'no'],
    ['is not empty', 'filled'], ['isn\'t empty', 'filled'], ['not empty', 'filled'], ['not blank', 'filled'], ['filled in', 'filled'], ['filled', 'filled'],
    ['with', 'with'], ['has', 'with'], ['have', 'with'], ['having', 'with'], ['has a', 'with'], ['have a', 'with'],
]);

//  The little words of a sentence:  left out,  no harm done   ("please show me ALL the rows",  "who got the highest ...").
const WORDS_FILLER = new Set(('a an the of me my us our we i you your please can could would will do does did just only all every any some ' +
    'there here be been being show list give get find display tell see want need let lets what whats which who whos whose where when how ' +
    'in on at for so also too really very thanks thank ok okay hi hello hey now then table file sheet spreadsheet csv data info information ' +
    'result results answer whole entire got gets getting made earned received took ' +
    'rows row records record entries entry everything everyone everybody people person persons students student kids kid ' +
    'employees employee customers customer users user members member staff workers clients patients tickets incidents ' +
    'requests cases transactions accounts items ones').split(' '));

//  Words for "the rows",  as a person says it   (then  "highest"  means the top row,  not a total)
const WORDS_ROWS = new Set('rows row records record entries entry everyone everybody people person persons students student kids kid employees employee customers customer users user members member staff workers clients patients tickets incidents requests cases transactions accounts items ones who whos which'.split(' '));

//  Words about an EARLIER question  ("sort THAT by name"):  it doesn't remember one,  so they're never quietly dropped.
const WORDS_CONTEXT = new Set('that those these them it its previous again same last above'.split(' '));
```

| List | What's in it | What happens to it |
|---|---|---|
| `WORDS_KNOWN` | how many, average, for each, over, at least, between, top, sorted by, a to z ... | It becomes part of the question. |
| `WORDS_FILLER` | the, me, please, show, students, rows ... | Left out: no harm done. |
| `WORDS_CONTEXT` | that, it, them, again ... | NEVER dropped quietly: "sort THAT by name" can't be answered (it doesn't remember an earlier question), so it's handed back. |

**2.** Cutting words into pieces. (Comments are taken out first: `-- like this` is never read as a question.)

```js
//  The words of a text,  with SQL's comments taken out  (-- like this,  /* and this */):  a comment is never read as a question.
//  (Cut the SQL way,  so a  --  inside 'quotes' stays.   Can't be cut that way  (show me Liam O'Brien)?   As it is.)
function wordsWithoutComments(text) {
    let tk;
    try { tk = sqlTokens(text); } catch (problem) { if (problem instanceof QueryError) return text; throw problem; }
    let out = '', at = 0;
    tk.forEach(function (t) {                           //  (between 2 pieces there's only space and comments:  85%  and  1,200  stay whole)
        const gap = text.slice(at, t.at);
        out += /--|\/\*/.test(gap) ? ' ' : gap;
        if (t.k !== 'end') { out += text.slice(t.at, t.to); at = t.to; }
    });
    return out;
}

//  Plain words  ->  pieces:   { k: 'word' | 'num' | 'str' | 'date' | 'sym',  v: as written,  low: in small letters }
const WORDS_PIECE = /'([^']*)'|"([^"]*)"|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})|([$€£¥]?\d[\d,]*(?:\.\d+)?%?|\.\d+%?)|(>=|<=|<>|!=|==|[<>=])|([A-Za-z0-9_À-￿](?:[A-Za-z0-9_À-￿'’-]*[A-Za-z0-9_À-￿])?)|(\S)/g;

function wordPieces(text) {
    const out = [];
    let m;
    WORDS_PIECE.lastIndex = 0;
    while ((m = WORDS_PIECE.exec(text)) !== null) {
        if (m[1] !== undefined || m[2] !== undefined) out.push({ k: 'str', v: m[1] !== undefined ? m[1] : m[2] });
        else if (m[3] !== undefined) out.push({ k: 'date', v: m[3] });
        else if (m[4] !== undefined) out.push({ k: 'num', v: m[4] });
        else if (m[5] !== undefined) out.push({ k: 'sym', v: m[5] });
        else if (m[6] !== undefined) out.push({ k: 'word', v: m[6].replace(/’/g, "'") });
        else out.push({ k: 'sym', v: m[7] });
    }
    out.forEach(function (p) { p.low = p.v.toLowerCase(); });
    return out;
}

//  A word,  and the shorter words it could be   (scores  ->  score,   scored  ->  score,   names  ->  name)
function wordStems(w) {
    const out = [w];
    if (w.length > 3 && /s$/.test(w)) out.push(w.slice(0, -1));
    if (w.length > 4 && /es$/.test(w)) out.push(w.slice(0, -2));
    if (w.length > 4 && /d$/.test(w)) out.push(w.slice(0, -1));
    if (w.length > 4 && /ed$/.test(w)) out.push(w.slice(0, -2));
    return out;
}
```

**3.** The reader itself. It works in 4 steps (the comments in it say which):

```js
async function readWords(text, catalog, isCurrent) {

    const tableName = catalog.names()[0];
    const table = tableName === undefined ? null : catalog.find(tableName);
    if (table === null) return null;
    const profile = await tableProfile(table, isCurrent);
    const cols = columnNames(table);
    const keys = cols.map(flexKey);
    const parts = cols.map(function (c) { return c.toLowerCase().split(/[^a-z0-9À-￿]+/).filter(function (w) { return w !== ''; }); });
    const kindOf = function (j) { return j < profile.columns.length ? profile.columns[j].kind : kindAt(table, j); };
    const pieces = wordPieces(wordsWithoutComments(text));
    const span = function (i, n) { return pieces.slice(i, i + n).map(function (p) { return p.v; }).join(' '); };


    //  ---- 1.  WHAT EACH PIECE IS:   a column  ·  a known word  ·  a value from the file  ·  a little word  ·  unknown ----

    //  A column's name,  at piece i   (the longest one that fits):   { col,  len }     (2 columns have that word?   { cols,  len })
    function columnAt(i) {
        for (let len = Math.min(5, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'num' || (p.k === 'sym' && (p.v === '%' || p.v === '#' || p.v === '&')); })) continue;
            const key = flexKey(span(i, len));
            const hits = [];
            keys.forEach(function (k, j) { if (k === key || k === key + 's' || k === key + 'es' || k + 's' === key || k + 'es' === key) hits.push(j); });
            if (hits.length === 1) return { col: hits[0], len: len };
        }
        const p = pieces[i];
        if (p.k !== 'word' || p.low.length < 3 || WORDS_FILLER.has(p.low) || WORDS_KNOWN.has(p.low)) return null;
        const stems = wordStems(p.low);
        const hits = [];                                //  one word of a longer name   (name  ->  Student Name,   homework  ->  Makeup Homework)
        parts.forEach(function (ws, j) { if (ws.some(function (w) { return stems.indexOf(w) !== -1; })) hits.push(j); });
        if (hits.length === 1) return { col: hits[0], len: 1 };
        if (hits.length > 1) return { cols: hits, len: 1 };
        if (p.low.length >= 5) {                        //  a small typo of a whole name   (atendance  ->  Attendance %)
            const near = flexClosest(p.v, cols);
            if (near !== null) return { col: cols.indexOf(near), len: 1 };
        }
        return null;
    }

    //  The longest known plain words at piece i:   { m,  len }
    function knownAt(i) {
        for (let len = Math.min(4, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'sym'; })) continue;
            const m = WORDS_KNOWN.get(run.map(function (p) { return p.low; }).join(' '));
            if (m !== undefined) return { m: m, len: len };
        }
        return null;
    }

    //  The file's own words at piece i   ("A",  "New York"):   { col,  spelled,  len }     (in 2 columns?   { cols,  len })
    function valueAt(i) {
        for (let len = Math.min(4, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'num' || p.k === 'str' || (p.k === 'sym' && (p.v === '&' || p.v === '/')); })) continue;
            const key = flexLoose(span(i, len));
            const hits = [];
            profile.columns.forEach(function (c, j) { if (c.values !== null && c.values.has(key)) hits.push(j); });
            if (hits.length === 1) return { col: hits[0], spelled: profile.columns[hits[0]].values.get(key), len: len };
            if (hits.length > 1) return { cols: hits, len: len };
        }
        return null;
    }

    const items = [];
    for (let i = 0; i < pieces.length; ) {
        const p = pieces[i];
        if (p.k === 'sym' && !WORDS_KNOWN.has(p.v)) { i++; continue; }            //  ?  !  ,  .   (nothing here)
        if (p.k === 'str' || p.k === 'date') {
            const v = valueAt(i);
            items.push({ t: 'value', k: p.k, v: v !== null && v.col !== undefined ? v.spelled : p.v, col: v !== null && v.col !== undefined ? v.col : null, words: p.v });
            i++;
            continue;
        }
        let C = columnAt(i);
        const K = knownAt(i), V = valueAt(i);
        //  A word that's in 2 columns' names  ("grade":  Grade Level?  Letter Grade?),  right before a value only ONE of them has
        //  ("grade 10":  only Grade Level has a 10)   ->   that one.
        if (C !== null && C.cols !== undefined) {
            const after = i + 1 < pieces.length ? valueAt(i + 1) : null;
            if (after !== null && after.col !== undefined && C.cols.indexOf(after.col) !== -1) C = { col: after.col, len: 1 };
        }
        const cl = C ? C.len : 0, kl = K ? K.len : 0, vl = V ? V.len : 0;
        //  A capital letter or word that's in the file beats a little word:   "the A students"   ("a list"  stays a little word)
        const capital = V !== null && V.col !== undefined && V.len === 1 && p.k === 'word' && p.v !== p.low && p.low !== 'i' && i > 0;
        if (cl > 0 && cl >= kl && cl >= vl && !capital) {
            items.push(C.col !== undefined ? { t: 'col', col: C.col, words: span(i, cl) }
                                           : { t: 'unknown', words: span(i, cl) + '  (' + C.cols.map(function (j) { return cols[j]; }).join(' or ') + '?)' });
            i += cl;
            continue;
        }
        if (vl > 0 && (capital || vl > kl) && V.col !== undefined) {
            const number = vl === 1 && p.k === 'num';       //  (a number that's also in the file,  like a 3 in "Lunch Period":  still a number:  "top 3")
            items.push({ t: 'value', k: number ? 'num' : 'word', v: number ? p.v : V.spelled, col: V.col, words: span(i, vl) });
            i += vl;
            continue;
        }
        if (kl > 0) { items.push({ t: 'known', m: K.m, words: span(i, kl) }); i += kl; continue; }
        if (p.k === 'num') { items.push({ t: 'value', k: 'num', v: p.v, col: V !== null && V.col !== undefined ? V.col : null, words: p.v }); i++; continue; }
        if (p.k === 'word' && (WORDS_FILLER.has(p.low) || flexKey(p.v) === flexKey(tableName))) { items.push({ t: 'filler', w: p.low, words: p.v }); i++; continue; }
        items.push({ t: 'unknown', raw: p.v, words: vl > 0 ? span(i, vl) + '  (in more than one column)'
                                                    : WORDS_CONTEXT.has(p.low) ? p.v + '  (it doesn\'t remember an earlier question)' : p.v });
        i += Math.max(vl, 1);
    }


    //  ---- 2.  READ THEM INTO A QUESTION   (left to right) ----

    const q = { show: [], totals: [], group: [], filters: [], sort: [], limit: null };
    const unused = [];
    const joins = [];               //  the  and / or  between each 2 conditions
    const highLow = [];             //  highest / lowest + a column:  a total  (MAX)  or the top row  (decided at the end)
    let lastCol = null;             //  a column just named and not used yet:  a condition's left side,  or a column to show
    let lastList = null;            //  which list the last column went in   ("for each A and B":  B goes there too)
    let wait = null;                //  a word waiting for its column:   { m,  words }
    let cond = null;                //  a condition waiting for its value:   { col,  op,  words }
    let range = null;               //  a range waiting for its ends:   { col,  lo,  words }
    let top = null;                 //  top 5  /  bottom 3  /  first 10:   { n,  desc  (null = no order),  col,  words }
    let pendingDir = null;          //  "A to Z" said before its column
    let join = null;                //  an  and / or  said since the last condition

    const asksTotal = items.some(function (it) { return it.t === 'filler' && (it.w === 'what' || it.w === 'whats'); });
    const asksRows  = items.some(function (it) { return it.t === 'filler' && WORDS_ROWS.has(it.w); });
    const anyTotal  = items.some(function (it) { return it.t === 'known' && ['count', 'distinct', 'avg', 'sum', 'median'].indexOf(it.m) !== -1; });
    const showsAll  = items.some(function (it) { return it.t === 'filler' && /^(show|list|display|everything|all|everyone|everybody)$/.test(it.w); });
    const OPS = new Set(['>', '>=', '<', '<=', '=', '<>', 'contains', 'starts', 'ends']);
    const NOT_OP = { '>': '<=', '>=': '<', '<': '>=', '<=': '>' };

    function condition(col, op, value) {
        if (q.filters.length > 0) joins.push(join || 'and');
        join = null;
        q.filters.push({ col: col, op: op, value: value });
    }
    function giveUp(words) { if (words) unused.push(words); cond = null; range = null; }
    function nextItem(k) { let j = k + 1; while (j < items.length && items[j].t === 'filler') j++; return j < items.length ? items[j] : null; }

    for (let k = 0; k < items.length; k++) {
        const it = items[k];

        if (it.t === 'filler') continue;
        if (it.t === 'unknown') {
            //  Any word,  right after  contains / starts with / is ... :   that's the words to look for   ("name contains jo")
            if (cond !== null && it.raw !== undefined && ['contains', 'starts', 'ends', '=', '<>'].indexOf(cond.op) !== -1) {
                const words = { t: 'value', k: 'word', v: it.raw, col: null, words: it.raw };
                const col = cond.col;
                const op = cond.op;
                cond = null;
                if (col === null) { unused.push(op + ' ' + it.raw); continue; }
                condition(col, op, words);
                continue;
            }
            unused.push(it.words);
            continue;
        }

        //  ---- A COLUMN ----
        if (it.t === 'col') {
            const j = it.col;
            if (cond !== null) giveUp(cond.words);                 //  "score over attendance":  2 columns aren't a value
            if (range !== null) giveUp(range.words);
            if (wait !== null) {
                const w = wait;
                wait = null;
                if (w.m === 'avg' || w.m === 'sum' || w.m === 'median') {
                    if (isNumberKind(kindOf(j))) q.totals.push({ fn: w.m, col: j });
                    else unused.push(w.words + ' ' + it.words + '  (' + cols[j] + ' is words,  not numbers)');
                    lastList = null;
                    continue;
                }
                if (w.m === 'distinct') { q.totals.push({ fn: 'distinct', col: j }); lastList = null; continue; }
                if (w.m === 'high' || w.m === 'low') { highLow.push({ high: w.m === 'high', col: j }); lastList = null; continue; }
                if (w.m === 'each' || (w.m === 'by' && (anyTotal || q.totals.length > 0))) { q.group.push(j); lastList = 'group'; continue; }
                if (w.m === 'by' && top !== null && top.col === null) { top.col = j; lastList = null; continue; }
                if (w.m === 'sort' || w.m === 'by') { q.sort.push({ col: j, desc: pendingDir === 'desc' }); pendingDir = null; lastList = 'sort'; continue; }
                if (w.m === 'no') { condition(j, 'empty', null); continue; }
                if (w.m === 'with') {                       //  "with homework" = it's filled in.   ("with score over 90":  just a little word)
                    const after = nextItem(k);
                    const more = after !== null && (after.t === 'value' || (after.t === 'known' && (OPS.has(after.m) || after.m === 'between' || after.m === 'from')));
                    if (!more) { condition(j, 'filled', null); continue; }
                }
            }
            if (top !== null && top.col === null && lastCol === null) { top.col = j; continue; }       //  "top 5 scores"
            if (lastList !== null && k > 0 && items[k - 1].t === 'known' && items[k - 1].m === 'and') {  //  "for each A and B"
                if (lastList === 'group') q.group.push(j);
                else q.sort.push({ col: j, desc: false });
                continue;
            }
            if (lastCol !== null) q.show.push(lastCol);     //  "name and score":  the one before was a column to show
            lastCol = j;
            lastList = null;
            continue;
        }

        //  ---- A VALUE   (a number,  'words',  a date,  or the file's own words) ----
        if (it.t === 'value') {
            if (wait !== null && wait.m === 'with') wait = null;                                        //  ("who HAS an A":  just a little word)
            if (top !== null && top.n === null && it.k === 'num') { top.n = it.v; continue; }           //  top 5
            if (range !== null) {
                if (range.lo === null) { range.lo = it; continue; }
                if (range.col === null) giveUp(range.words + ' ' + range.lo.words + ' and ' + it.words + '  (which column?)');
                else condition(range.col, 'between', [range.lo, it]);
                range = null;
                continue;
            }
            let col, op = '=', words = it.words;
            if (cond !== null) { col = cond.col !== null ? cond.col : it.col; op = cond.op; words = cond.words + ' ' + it.words; cond = null; }
            else if (lastCol !== null) col = lastCol;       //  "grade level 10"
            else col = it.col;                              //  "the A students":  the one column that has an A
            if (col === null) { unused.push(words); continue; }
            if (col === lastCol) lastCol = null;
            const a = items[k + 1], b = items[k + 2];       //  80-90  /  80 to 90:   a range
            if (op === '=' && a !== undefined && b !== undefined && a.t === 'known' && a.m === 'to' && b.t === 'value') {
                condition(col, 'between', [it, b]);
                k += 2;
                continue;
            }
            condition(col, op, it);
            continue;
        }

        //  ---- A KNOWN WORD ----
        const m = it.m;
        if (m === 'and' || m === 'or') {
            if (range !== null && range.lo !== null) continue;                     //  between 80 AND 90
            if (q.filters.length > 0 && cond === null) join = m;
            continue;
        }
        if (cond !== null) {
            if (cond.op === '=' && (OPS.has(m) || m === 'empty' || m === 'filled')) {       //  "score IS over 90"   "homework IS empty"
                if (m === 'empty' || m === 'filled') { condition(cond.col, m, null); cond = null; continue; }
                cond.op = m; cond.words += ' ' + it.words; continue;
            }
            if (cond.op === '=' && (m === 'between' || m === 'from')) { range = { col: cond.col, lo: null, words: cond.words + ' ' + it.words }; cond = null; continue; }
            if (cond.op === '<>' && NOT_OP[m] !== undefined) { cond.op = NOT_OP[m]; cond.words += ' ' + it.words; continue; }     //  "NOT over 90"
            giveUp(cond.words);
        }
        if (range !== null && !(m === 'to' && range.lo !== null)) giveUp(range.words);
        if (wait !== null && wait.m === 'with' && m !== 'and') wait = null;     //  ("who HAS the highest ...",  "with NO homework":  just a little word)
        if (m === 'count') { if (!q.totals.some(function (t) { return t.fn === 'rows'; })) q.totals.push({ fn: 'rows' }); continue; }
        if (m === 'by' && wait !== null && wait.m === 'sort') { wait.words += ' ' + it.words; continue; }      //  "sort that BY name"
        if (m === 'distinct' || m === 'avg' || m === 'sum' || m === 'median' || m === 'each' || m === 'by' || m === 'sort' || m === 'no' || m === 'with') {
            if (wait !== null) unused.push(wait.words);
            wait = { m: m, words: it.words };
            continue;
        }
        if (m === 'high' || m === 'low' || m === 'top' || m === 'bottom' || m === 'first') {
            const after = nextItem(k);
            const high = m === 'high' || m === 'top';
            if (after !== null && after.t === 'value' && after.k === 'num') { top = { n: null, desc: m === 'first' ? null : high, col: null, words: it.words }; continue; }   //  top 5,  newest 10
            if (m === 'first') { unused.push(it.words); continue; }
            if (wait !== null) unused.push(wait.words);
            wait = { m: high ? 'high' : 'low', words: it.words };
            continue;
        }
        if (m === 'desc' || m === 'asc') {
            if (q.sort.length > 0 && lastList === 'sort') q.sort[q.sort.length - 1].desc = m === 'desc';
            else if (top !== null) top.desc = m === 'desc';
            else pendingDir = m;
            continue;
        }
        if (OPS.has(m)) {
            if (lastCol !== null) { cond = { col: lastCol, op: m, words: it.words }; lastCol = null; }
            else if (m !== '=') cond = { col: null, op: m, words: it.words };      //  "except F":  then F's own column,  if only one has it
            continue;                                                               //  (a lone "is" / "are":  just a little word)
        }
        if (m === '>=after' || m === '<=after') {                                   //  "score 90 or more"
            const f = q.filters[q.filters.length - 1];
            if (f !== undefined && f.op === '=' && join === null) f.op = m === '>=after' ? '>=' : '<=';
            else unused.push(it.words);
            continue;
        }
        if (m === 'between' || m === 'from') {
            const after = nextItem(k);
            if (after !== null && after.t === 'value') { range = { col: lastCol !== null ? lastCol : after.col, lo: null, words: it.words }; lastCol = null; }
            continue;                                                               //  ("rows FROM class_data":  just a little word)
        }
        if (m === 'empty' || m === 'filled') {
            if (lastCol !== null) { condition(lastCol, m, null); lastCol = null; }
            else if (m === 'empty') wait = { m: 'no', words: it.words };            //  "empty homework"
            else unused.push(it.words);
            continue;
        }
        //  (to  /  -  with nothing to join:   "want TO see")
    }


    //  ---- 3.  WHAT'S LEFT WAITING ----

    if (cond !== null) unused.push(cond.words);
    if (range !== null) unused.push(range.words + (range.lo !== null ? ' ' + range.lo.words : ''));
    if (lastCol !== null) {
        if (q.totals.length > 0 || anyTotal) q.group.push(lastCol);        //  "grade level  average score"
        else q.show.push(lastCol);
    }
    //  "scores ... sorted highest first":  sorted with no column named,  but only ONE thing is shown?   By that.
    if (wait !== null && wait.m === 'sort' && pendingDir !== null && q.totals.length + q.show.length === 1 && q.group.length === 0) {
        if (q.totals.length === 1) q.sort.push({ total: 0, desc: pendingDir === 'desc' });
        else q.sort.push({ col: q.show[0], desc: pendingDir === 'desc' });
        wait = null;
    }
    if (wait !== null && wait.m !== 'with') unused.push(wait.words);   //  (a "with" left over was just a little word)
    highLow.forEach(function (h) {
        if (q.group.length === 0 && (asksRows || (!asksTotal && q.totals.length === 0))) {       //  "WHO has the highest score":  the top row
            q.sort.push({ col: h.col, desc: h.high });
            if (q.limit === null && top === null) q.limit = 1;
        } else {                                                                                  //  "WHAT is the highest score":  a total
            q.totals.push({ fn: h.high ? 'max' : 'min', col: h.col });
            if (asksRows) unused.push('who  (for each group it can show the highest one,  not whose it is)');
        }
    });
    if (top !== null) {
        if (top.n !== null) q.limit = parseInt(String(top.n).replace(/,/g, ''), 10);
        if (top.col !== null) q.sort.unshift({ col: top.col, desc: top.desc !== false });
        else if (top.desc !== null && q.totals.length > 0) q.sort.unshift({ total: 0, desc: top.desc });
        else if (top.desc !== null) unused.push(top.words + '  (by what?)');
    }
    if (joins.indexOf('or') !== -1 && joins.indexOf('and') !== -1) unused.push('or  (and + or together:  which comes first?  Say it in SQL)');

    //  Nothing it could use?   null   (or,  if it can say WHY a word didn't fit:  no SQL,  just the reasons:  "average Letter Grade")
    const nothing = q.show.length + q.totals.length + q.group.length + q.filters.length + q.sort.length === 0 && q.limit === null;
    if (nothing && !(showsAll && unused.length === 0)) {
        return unused.some(function (u) { return u.indexOf('  (') !== -1; }) ? { sql: null, unused: unused, meaning: null } : null;
    }                                                                           //  ("show me everything":  every row)


    //  ---- 4.  THE SQL ----

    const name = function (j) { return flexName(cols[j]); };
    const totalSql = function (t) {
        if (t.fn === 'rows') return 'COUNT(*)';
        if (t.fn === 'distinct') return 'COUNT(DISTINCT ' + name(t.col) + ')';
        return { avg: 'AVG', sum: 'SUM', median: 'MEDIAN', max: 'MAX', min: 'MIN' }[t.fn] + '(' + name(t.col) + ')';
    };
    const valueSql = function (v, j) {
        const kind = kindOf(j);
        let s = String(v.v);
        if (v.k === 'date') { const d = s.split(/[-\/]/); return flexWords(d[0] + '-' + ('0' + d[1]).slice(-2) + '-' + ('0' + d[2]).slice(-2)); }
        if (v.k === 'num' && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.split(',').join('');      //  1,200  ->  1200
        return isNumberKind(kind) && NUMBER_WORDS.test(s) ? s.trim() : flexWords(s);
    };
    const conditionSql = function (f) {
        const c = name(f.col);
        if (f.op === 'empty') return c + ' IS NULL';
        if (f.op === 'filled') return c + ' IS NOT NULL';
        if (f.op === 'between') return c + ' BETWEEN ' + valueSql(f.value[0], f.col) + ' AND ' + valueSql(f.value[1], f.col);
        if (f.op === 'contains') return c + ' ' + flexLike(f.value.v, '%', '%');
        if (f.op === 'starts') return c + ' ' + flexLike(f.value.v, '', '%');
        if (f.op === 'ends') return c + ' ' + flexLike(f.value.v, '%', '');
        return c + ' ' + f.op + ' ' + valueSql(f.value, f.col);
    };
    const unique = function (list) { return list.filter(function (x, k) { return list.indexOf(x) === k; }); };

    const grouped = q.totals.length > 0 || q.group.length > 0;
    const groups = unique(q.group);
    const totals = q.totals.filter(function (t, k) { return q.totals.findIndex(function (u) { return u.fn === t.fn && u.col === t.col; }) === k; });
    const shown = grouped ? groups.map(name).concat(totals.map(totalSql)) : unique(q.show).map(name);
    let sql = 'SELECT ' + (shown.length > 0 ? shown.join(', ') : '*') + ' FROM ' + flexName(tableName);
    if (q.filters.length > 0) sql += ' WHERE ' + q.filters.map(conditionSql).join(joins.length > 0 && joins.every(function (j) { return j === 'or'; }) ? ' OR ' : ' AND ');
    if (groups.length > 0) sql += ' GROUP BY ' + groups.map(name).join(', ');
    const order = [];
    q.sort.forEach(function (s) {
        if (s.total !== undefined) { order.push(totalSql(totals[s.total]) + (s.desc ? ' DESC' : '')); return; }
        if (!grouped || groups.indexOf(s.col) !== -1) { order.push(name(s.col) + (s.desc ? ' DESC' : '')); return; }
        const t = totals.find(function (x) { return x.col === s.col; });       //  grouped:  by that column's total   ("average score ... highest first")
        if (t !== undefined) order.push(totalSql(t) + (s.desc ? ' DESC' : ''));
        else unused.push('sorted by ' + cols[s.col] + '  (it isn\'t in the answer:  each group is ONE row)');
    });
    if (order.length > 0) sql += ' ORDER BY ' + order.join(', ');
    if (q.limit !== null && q.limit > 0) sql += ' LIMIT ' + q.limit;

    return { sql: sql, unused: unique(unused), meaning: queryInWords(sql, catalog) };
}
```

| Step | What it does | Example |
|---|---|---|
| 1. What each piece IS | the longest match wins: a column name, a known word, a value from the file, a little word | "grade 10": "grade" is in 2 column names, but only Grade Level has a 10 → Grade Level |
| 2. Read them in order | a column waits for its condition, a condition waits for its value ... | "score **is over** 90" → `Score > 90` |
| 3. What's left waiting | "average" with no column after it, an `or` mixed with `and` ... | handed back as unused |
| 4. The SQL | names in quotes when they need them, values the file's way | `"Attendance %" < '85%'` |

> **Highest = a total, or the top row?** "**what** is the highest score" → `MAX(Score)`. "**who** has the highest score" → the top row. With "for each" → `MAX` for each group (and if you said "who", it says it can show the highest one, not whose it is).

**4.** Deciding if words are plain words at all (end of the file):

```js
//  The SHAPE of a command that changes data,  anywhere in the text   (DROP TABLE,  DELETE FROM,  INSERT INTO,  UPDATE x SET ...)
const FLEX_WRITE_SHAPE = /\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA)\b|\bDELETE\s+FROM\b|\bINSERT\s+(OR\s+\w+\s+)?INTO\b|\bUPDATE\s+\S+\s+SET\b|\b(GRANT|REVOKE)\s+\w+/i;

//  Does this read like PLAIN WORDS,  not SQL?
//      show me the A students                    ->  yes   (it doesn't start the way SQL does)
//      select the kids who passed                ->  yes   (most of its words are no SQL word,  no column,  no table)
//      SELECT * FROM orders WHERE Name = Bob     ->  no    (SQL,  with a mistake in it:  SQL's own words say what's wrong)
function flexLooksLikeWords(text, catalog) {
    let first;
    try {
        const tk = sqlTokens(text).filter(function (t) { return !(t.k === 'op' && t.v === ';'); });     //  (only comments and  ;  ?   No question at all)
        first = tk[0].k === 'id' ? tk[0].u : tk[0].k === 'op' ? tk[0].v : tk[0].k;
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
        const word = wordPieces(text).find(function (p) { return p.k === 'word'; });      //  (it can't even be cut into SQL:   show me Liam O'Brien)
        first = word === undefined ? 'end' : word.v.toUpperCase();
    }
    if (first === 'end' || WRITE_COMMANDS.has(first)) return false;
    if (FLEX_WRITE_SHAPE.test(wordsWithoutComments(text))) return false;           //  '; DROP TABLE x; --   is SQL that writes,  not a sentence
    if (flexStatementCount(text) > 1) return false;                                 //  (people don't put  ;  between the parts of a sentence:  SQL does)
    if (first !== 'SELECT' && first !== 'WITH' && first !== '(') return true;
    const known = new Set();
    catalog.names().forEach(function (n) {
        known.add(flexKey(n));
        const table = catalog.find(n);
        if (table !== null) columnNames(table).forEach(function (c) { known.add(flexKey(c)); });
    });
    const plain = wordPieces(wordsWithoutComments(text)).filter(function (p) { return p.k === 'word'; });
    const unknown = plain.filter(function (p) {
        const u = p.v.toUpperCase();
        return !SQL_RESERVED.has(u) && findFunction(u) === undefined && findTotal(u) === undefined && !known.has(flexKey(p.v));
    });
    return unknown.length >= 2 && unknown.length >= 0.4 * plain.length;
}
```

> `'; DROP TABLE x; --` is not a sentence. Anything shaped like a command that changes data stays SQL, and gets SQL's refusal.

**5.** When it's stuck: the words for you, and a `why` for the page (`why.kind = 'words'`, with the SQL it would run, so the page can offer a "Did you mean" button):

```js
//  STUCK:  even fixed,  the question can't run.   Put what's known on the problem,  in words for you  (and for the code).
function flexStuck(problem, text, sql, flex, words, catalog, flexible) {

    const write = problem.why && problem.why.kind === 'write';

    //  Plain words,  only partly understood:   "Did you mean ...?"   (The page offers to ask it:  YOU decide.)
    //  (No question at all,  but it knows WHY a word didn't fit?   "average Letter Grade":  it's words,  not numbers.   Say that.)
    if (words !== null) {
        const asked = new QueryError(words.sql === null
            ? 'That reads like plain words,  and I couldn\'t make a question of it:   ' + words.unused.join('   ·   ') + '.   Try words like:   ' +
              wordsExamples(catalog).join('   ·   ')
            : 'That reads like plain words.   Did you mean:   ' + words.meaning + '?' + '   (I didn\'t use:  ' + words.unused.join(',  ') + ')');
        asked.why = { kind: 'words', sql: words.sql, unused: words.unused, meaning: words.meaning };
        asked.sql = text;
        asked.fixes = [];
        asked.warnings = [];
        return asked;
    }

    problem.sql = sql;                                  //  (how far the fixing got,  so the brain can show where it's stuck)
    problem.fixes = flex.fixes;
    problem.warnings = flex.warnings;

    //  Plain words,  but no question in them at all   ("please help me"):   instead of SQL's words,  examples with YOUR columns.
    if (flexible && !write && flexLooksLikeWords(text, catalog)) {
        const plain = new QueryError('That reads like plain words,  and I couldn\'t find a question in them.   Try words like:   ' +
                                     wordsExamples(catalog).join('   ·   ') + '   (or SQL:  it starts with SELECT)');
        plain.why = { kind: 'words', sql: null, unused: [], meaning: null };
        plain.sql = text;
        plain.fixes = [];
        plain.warnings = [];
        return plain;
    }

    //  More than one question  (split by  ;):   only the LAST one runs.   Say so,  and whether the one before it was fine.
    if (flexStatementCount(text) > 1) {
        problem.message = 'The LAST question  (after the last  ;)  has a problem:   ' + problem.message +
            (flexEarlierIsFine(text, catalog)
                ? '   (Only the last question in the box runs.   The one before it is fine on its own:  delete what comes after its  ;  to run it.)'
                : '   (Only the last question in the box runs.)');
    }

    //  Fixing is OFF,  and those are plain words?   Say how to ask in words.
    if (!flexible && !write && flexLooksLikeWords(text, catalog)) {
        problem.message += '   (Those look like plain words:  tick  "Fix my typos"  to ask in your own words.)';
    }
    return problem;
}
```

**6.** And `runQuery` puts it all together. Replace it:

```js
async function runQuery(text, catalog, isCurrent, progress, flexible) {

    //  What Query Flexibility changed,  what that LEFT OUT  (amber on the page),  and did it add a GROUP BY?
    const flex = { fixes: [], warnings: [], grouped: false };
    let sql = flexible ? flexTraps(text, catalog, flex) : text;
    let ready = null;

    //  Try it.   Wrong?  Fix ONE thing,  and try again  (each try is only reading + compiling:  quick).
    for (let round = 0; ready === null; round++) {
        try {
            ready = await readyQuery(sql, catalog, isCurrent);
        } catch (problem) {
            if (!(problem instanceof QueryError)) throw problem;
            const better = flexible && round < FLEX_ROUNDS ? flexFix(sql, problem, catalog, flex) : null;
            if (better !== null && better !== sql) { sql = better; continue; }

            //  Stuck.   Was it PLAIN WORDS,  not SQL?   ("average score for each grade level")   Read it as words.
            //  EVERY word understood?  That's the question:  run it.   Some not?  Ask first  ("Did you mean ...?",  see flexStuck).
            //  (Never for DROP,  DELETE ...:  those stay refused.)
            const words = flexible && !(problem.why && problem.why.kind === 'write') && flexLooksLikeWords(text, catalog)
                ? await readWords(text, catalog, isCurrent) : null;
            if (words !== null && words.unused.length === 0) {
                flex.fixes = ['read your words as:   ' + words.sql];
                flex.warnings = [];
                sql = words.sql;
                ready = await readyQuery(sql, catalog, isCurrent);
                break;
            }
            throw flexStuck(problem, text, sql, flex, words, catalog, flexible);
        }
    }

    let answer = await runPlan(ready, isCurrent, progress);

    //  SNAP TO RESULT:  nothing in the answer,  but the question asked for something the FILE writes another way?
    //      status = 'Shipped'   ->   'shipped'   (how the file spells it)
    //      notes = ''           ->   notes IS NULL   (in a CSV an empty cell is NULL,  never '')
    //  ("Nothing" = no rows,  or one row of totals of nothing:  COUNT = 0,  SUM = NULL.)
    if (flexible && answerIsEmpty(answer, ready.picked)) {
        for (const snap of [flexEmptyWords, flexSnap]) {
            const snapped = await snap(sql, ready.picked, catalog, isCurrent);
            if (snapped === null) continue;
            const again = await readyQuery(snapped.sql, catalog, isCurrent);
            const other = await runPlan(again, isCurrent, progress);
            if (answerIsEmpty(other, again.picked)) continue;
            sql = snapped.sql;
            ready = again;
            answer = other;
            flex.fixes.push.apply(flex.fixes, snapped.fixes);
            break;
        }
    }

    answer.ran = ready.statements.length;
    answer.count = ready.statements.length;
    answer.skipped = ready.statements.filter(function (s) { return s.t === 'write'; }).map(function (s) { return s.verb; });     //  DROP ... before the question:  never run
    answer.sql = sql;
    answer.fixes = flex.fixes;
    answer.warnings = flex.warnings;
    const looks = answerLooks(ready.picked, ready.plan, catalog);
    answer.columns.forEach(function (c, k) { c.look = looks[k]; });
    return answer;
}
```

| Code | Baby words |
|---|---|
| `flex.warnings` | What a fix left out (Step 12.1). It comes back as `answer.warnings`. |
| `words.unused.length === 0` | EVERY word understood: that's the question. Run it, and say how the words were read. |
| `throw flexStuck(...)` | Otherwise: "Did you mean ...?", or examples with your own columns. |
| `for (const snap of [flexEmptyWords, flexSnap])` | Snap to result: `= ''` first, then the file's spelling. |
| `answer.skipped` | A DROP before your question was skipped. The page can say so. |

<br>

### Step 12.7: The question, back in words

Any SQL, as a sentence. Under the SQL box it says what you REALLY asked, and on the answer's badge it says what the answer IS:

```js
//    A QUESTION,  BACK IN PLAIN WORDS   (SQL  ->  words:   "In words:"  in the query menu,  and the answer's badge)
//
//        SELECT * FROM orders WHERE qty > 5 ORDER BY qty DESC LIMIT 3
//        ->   Every row of orders where qty is over 5,  sorted by qty (highest first),  at most 3 rows
//
//    The words come from each column's KIND,  so they never fib about what SQL will do:
//        sorting numbers  ->  highest first / lowest first      words  ->  Z to A / A to Z      dates  ->  newest / oldest first
//        a WORDS column  >  'C'   ->   "comes after 'C'  (A to Z)"     (that's what  >  does to words:  alphabetical,  not better)
//        x = NULL   ->   "(never true:  NULL isn't equal to anything,  say IS NULL)"
//
//    ->  the words,  or null  (it isn't a question yet:  a mistake in it,  or nothing typed)
//
// ----------------------------------------------------------

function queryInWords(sql, catalog) {
    let statements;
    try { statements = parseSql(sql); }
    catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const q = statements[statements.length - 1];
    let words = q.t === 'write' ? q.verb + ' would change the data  (this tool only reads:  it won\'t run)' : wordsOfQuery(q, catalog);
    if (statements.length > 1) words += '   (only the last of the ' + statements.length + ' questions runs)';
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function wordsOfQuery(q, catalog) {
    let words, core = null;
    if (q.body.t === 'core') { core = q.body; words = wordsOfCore(core, catalog); }
    else if (q.body.t === 'set') words = 'the rows of two questions put together  (' + q.body.op + ')';
    else words = wordsOfQuery(q.body.q, catalog);
    if (q.with !== null) words = 'first making  ' + q.with.map(function (w) { return w.name; }).join(',  ') + ',  then:  ' + words;
    if (q.order !== null && q.order.length > 0) words += ',  sorted by ' + q.order.map(function (o) { return wordsOfSort(o, core, catalog); }).join(',  then ');
    const limit = q.limit !== null ? q.limit : core !== null ? core.top : null;
    if (limit !== null) words += ',  at most ' + wordsOfValue(limit) + (limit.t === 'lit' && limit.v === 1 ? ' row' : ' rows');
    if (q.offset !== null) words += ',  after skipping the first ' + wordsOfValue(q.offset);
    return words;
}
```

```js
function wordsOfCore(c, catalog) {
    const from = c.from === null ? null : wordsOfFrom(c.from);
    const grouped = c.group !== null || c.items.some(function (it) { return !it.star && isTotal(it.e); });
    const groupKeys = (c.group || []).map(function (g) { return exprText(g).toLowerCase(); });
    let words;
    if (grouped) {
        const parts = c.items.filter(function (it) { return it.star || groupKeys.indexOf(exprText(it.e).toLowerCase()) === -1; })
                             .map(function (it) { return it.star ? 'every column' : wordsOfItem(it.e, c, catalog); });
        words = (parts.length > 0 ? wordsList(parts) : 'each different ' + wordsList((c.group || []).map(function (g) { return wordsOfItem(g, c, catalog); })));
        if (c.group !== null && parts.length > 0) words += ' for each ' + wordsList(c.group.map(function (g) { return wordsOfItem(g, c, catalog); }));
        if (from !== null) words += ' in ' + from;
    } else if (c.items.length === 1 && c.items[0].star && c.items[0].table === null) {
        words = (c.distinct ? 'every different row' : 'every row') + (from !== null ? ' of ' + from : '');
    } else {
        const parts = c.items.map(function (it) { return it.star ? (it.table ? 'every column of ' + it.table : 'every column') : wordsOfItem(it.e, c, catalog); });
        words = c.distinct ? 'each different ' + wordsList(parts) + (from !== null ? ' in ' + from : '')
                           : wordsList(parts) + (from !== null ? ',  from every row of ' + from : '');
    }
    if (c.where !== null) words += ' where ' + wordsOfCond(c.where, c, catalog);
    if (c.having !== null) words += ',  keeping only the groups where ' + wordsOfCond(c.having, c, catalog);
    return words;
}

function wordsOfFrom(f) {
    if (f.t === 'table') return f.name;
    if (f.t === 'sub') return 'the answer to another question';
    const how = f.kind === 'cross' ? ' paired with every row of ' : f.kind === 'left' ? ' with the matching rows of ' :
                f.kind === 'right' ? ' matched to every row of ' : f.kind === 'full' ? ' and ' : ' joined with ';
    return wordsOfFrom(f.a) + how + wordsOfFrom(f.b);
}
```

```js
//  One thing shown:  a column  ->  its name,   a total  ->  "how many rows",  "the average Score" ...,   anything else  ->  its SQL
function wordsOfItem(e, c, catalog) {
    if (e.t === 'col') return e.name;
    if (e.t === 'fn' && isTotal(e) && !e.filter) {
        const x = e.args.length === 1 ? wordsOfItem(e.args[0], c, catalog) : null;
        const kind = e.args.length === 1 ? kindOfExpr(e.args[0], c, catalog) : 'number';
        if (e.name === 'COUNT') return e.star ? 'how many rows' : e.distinct ? 'how many different values of ' + x : 'how many filled-in ' + x;
        if (e.distinct || x === null) return exprText(e);
        if (e.name === 'SUM' || e.name === 'TOTAL') return 'the total of ' + x;
        if (e.name === 'AVG') return 'the average ' + x;
        if (e.name === 'MEDIAN') return 'the middle value of ' + x;
        if (e.name === 'MIN') return kind === 'words' ? 'the first ' + x + ' (A to Z)' : kind === 'date' ? 'the earliest ' + x : 'the smallest ' + x;
        if (e.name === 'MAX') return kind === 'words' ? 'the last ' + x + ' (A to Z)' : kind === 'date' ? 'the latest ' + x : 'the biggest ' + x;
    }
    return exprText(e);
}

function wordsList(list) {
    return list.length <= 1 ? list.join('') : list.slice(0, -1).join(',  ') + ' and ' + list[list.length - 1];
}

function wordsOfSort(o, core, catalog) {
    let e = o.e;
    if (core !== null && e.t === 'lit' && Number.isInteger(e.v) && core.items[e.v - 1] && !core.items[e.v - 1].star) e = core.items[e.v - 1].e;    //  ORDER BY 2
    if (core !== null && e.t === 'col' && e.table === null) {                    //  ORDER BY a nickname
        const it = core.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(e.name).toLowerCase(); });
        if (it) e = it.e;
    }
    const kind = kindOfExpr(e, core, catalog);
    const way = kind === 'words' ? (o.desc ? 'Z to A' : 'A to Z') : kind === 'date' ? (o.desc ? 'newest first' : 'oldest first') : (o.desc ? 'highest first' : 'lowest first');
    return wordsOfItem(e, core, catalog) + ' (' + way + (o.nulls ? ',  empty ones ' + o.nulls : '') + ')';
}
```

```js
function wordsOfCond(e, c, catalog) {
    const side = function (x) { return x.t === 'col' ? x.name : wordsOfValue(x); };
    const inner = function (x, outer) {
        const w = wordsOfCond(x, c, catalog);
        return (x.t === 'or' || x.t === 'and') && x.t !== outer && anyColumnWords(x, c, catalog) === null ? '(' + w + ')' : w;
    };
    switch (e.t) {
        case 'and':
        case 'or': {
            const any = anyColumnWords(e, c, catalog);
            if (any !== null) return any;
            return inner(e.a, e.t) + ' ' + e.t + ' ' + inner(e.b, e.t);
        }
        case 'not':
            return 'NOT (' + wordsOfCond(e.e, c, catalog) + ')';
        case 'cmp': {
            if ((e.a.t === 'lit' && e.a.v === null) || (e.b.t === 'lit' && e.b.v === null)) {
                return side(e.a) + ' ' + e.op + ' ' + side(e.b) + '  (never true:  NULL isn\'t equal to anything,  even NULL.   Say "is empty":  IS NULL)';
            }
            const flip = e.a.t !== 'col' && e.b.t === 'col';                         //  5 < qty   =   qty > 5
            const left = flip ? e.b : e.a, right = flip ? e.a : e.b;
            const op = flip ? FLIP_WORDS[e.op] : e.op;
            const kind = kindOfExpr(left, c, catalog);
            const words = (kind === 'words' ? WORDS_OPS_WORDS : kind === 'date' ? WORDS_OPS_DATES : WORDS_OPS_NUMBERS)[op] || op;
            return side(left) + ' ' + words + ' ' + side(right) + (kind === 'words' && op !== '=' && op !== '<>' ? '  (A to Z)' : '');
        }
        case 'isnull':  return side(e.e) + (e.not ? ' is not empty' : ' is empty');
        case 'isdist':  return side(e.a) + (e.not ? ' is ' : ' is not ') + side(e.b);
        case 'istrue':  return side(e.e) + (e.not ? ' is not ' : ' is ') + (e.v ? 'true' : 'false');
        case 'between': return side(e.e) + (e.not ? ' is not from ' : ' is from ') + side(e.lo) + ' to ' + side(e.hi);
        case 'in': {
            const list = e.list.map(side);
            const either = list.length <= 1 ? list.join('') : list.slice(0, -1).join(',  ') + ' or ' + list[list.length - 1];
            return side(e.e) + (e.not ? ' is none of ' + list.join(',  ') : ' is ' + either);
        }
        case 'insub':   return side(e.e) + (e.not ? ' is not in ' : ' is in ') + 'the answer to another question';
        case 'exists':  return 'another question has an answer';
        case 'like': {
            const how = likeHow(e);
            return side(e.e) + (e.not ? ' does not ' + how.replace(/^(contains|starts|ends|matches|is)/, function (w) { return { contains: 'contain', starts: 'start', ends: 'end', matches: 'match', is: 'equal' }[w]; }) : ' ' + how);
        }
        default:
            return exprText(e);
    }
}

//  A LIKE's pattern,  in words:   '%jo%'  ->  "contains 'jo'"     'jo%'  ->  "starts with 'jo'"     'jo'  ->  "is 'jo'  (any capitals)"
function likeHow(e) {
    const p = e.pat.t === 'lit' && typeof e.pat.v === 'string' && e.esc === null ? e.pat.v : null;
    const plain = p === null ? null : p.replace(/^%/, '').replace(/%$/, '');
    return p === null || /[%_]/.test(plain) ? 'matches the pattern ' + (e.pat.t === 'col' ? e.pat.name : wordsOfValue(e.pat))
        : p.length > 1 && p[0] === '%' && p[p.length - 1] === '%' ? 'contains ' + flexWords(plain)
        : p[p.length - 1] === '%' ? 'starts with ' + flexWords(plain)
        : p[0] === '%' ? 'ends with ' + flexWords(plain)
        : 'is ' + flexWords(plain) + '  (any capitals)';
}

//  The builder's "any column":   (Name LIKE '%jo%' OR City LIKE '%jo%' OR ...)   ->   "any column contains 'jo'"
//  Only when it's EVERY column of the table,  each once,  with the same LIKE   (else it's said test by test,  as written).
function anyColumnWords(e, c, catalog) {
    if (e.t !== 'or' || c === null || c.from === null || c.from.t !== 'table') return null;
    const table = catalog.find(c.from.name);
    if (table === null) return null;
    const tests = [];
    (function flat(x) { if (x.t === 'or') { flat(x.a); flat(x.b); } else tests.push(x); })(e);
    const names = columnNames(table).map(function (n) { return n.toLowerCase(); });
    if (tests.length < 2 || tests.length !== names.length) return null;
    const sameAs = function (x) { return x.t === 'like' && !x.not && x.e.t === 'col' && exprText(x.pat) === exprText(tests[0].pat) && (x.esc === null) === (tests[0].esc === null) && (x.esc === null || exprText(x.esc) === exprText(tests[0].esc)); };
    const seen = new Set();
    for (const x of tests) {
        if (!sameAs(x)) return null;
        const n = String(x.e.name).toLowerCase();
        if (names.indexOf(n) === -1 || seen.has(n)) return null;
        seen.add(n);
    }
    return 'any column ' + likeHow(tests[0]);
}

const FLIP_WORDS = { '=': '=', '<>': '<>', '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const WORDS_OPS_NUMBERS = { '=': 'is', '<>': 'is not', '>': 'is over', '>=': 'is at least', '<': 'is under', '<=': 'is at most' };
const WORDS_OPS_WORDS   = { '=': 'is', '<>': 'is not', '>': 'comes after', '>=': 'is or comes after', '<': 'comes before', '<=': 'is or comes before' };
const WORDS_OPS_DATES   = { '=': 'is', '<>': 'is not', '>': 'is after', '>=': 'is on or after', '<': 'is before', '<=': 'is on or before' };
```

```js
function wordsOfValue(e) {
    if (e.t === 'lit' && typeof e.v === 'string' && lookOf(e.v) !== null) return e.v;          //  '85%'  '$1,200'  ->  85%  $1,200   (a number with a look)
    if (e.t === 'lit') return e.v === null ? 'NULL' : typeof e.v === 'string' ? flexWords(e.v) : typeof e.v === 'boolean' ? (e.v ? 'TRUE' : 'FALSE') : numberText(e.v);
    if (e.t === 'neg' && e.e.t === 'lit') return '-' + wordsOfValue(e.e);
    return exprText(e);
}
```

```js
//  Any piece of a question,  written back as SQL   (for the parts plain words can't say:  UPPER(city),  qty * 2)
function exprText(e) {
    switch (e.t) {
        case 'lit':    return wordsOfValue(e);
        case 'col':    return (e.table ? e.table + '.' : '') + e.name;
        case 'ref':    return 'column ' + (e.idx + 1);
        case 'fn':     return e.name + '(' + (e.star ? '*' : (e.distinct ? 'DISTINCT ' : '') + e.args.map(exprText).join(', ')) + ')' + (e.over ? ' OVER (...)' : '');
        case 'bin':    return exprText(e.a) + ' ' + e.op + ' ' + exprText(e.b);
        case 'cat':    return exprText(e.a) + ' || ' + exprText(e.b);
        case 'neg':    return '-' + exprText(e.e);
        case 'cast':   return 'CAST(' + exprText(e.e) + ' AS ' + String(e.to).toUpperCase() + ')';
        case 'case':   return 'CASE ... END';
        case 'cmp':    return exprText(e.a) + ' ' + e.op + ' ' + exprText(e.b);
        case 'and':
        case 'or':     return exprText(e.a) + ' ' + e.t.toUpperCase() + ' ' + exprText(e.b);
        case 'not':    return 'NOT ' + exprText(e.e);
        case 'isnull': return exprText(e.e) + (e.not ? ' IS NOT NULL' : ' IS NULL');
        case 'like':   return exprText(e.e) + (e.not ? ' NOT LIKE ' : ' LIKE ') + exprText(e.pat);
        case 'between': return exprText(e.e) + (e.not ? ' NOT BETWEEN ' : ' BETWEEN ') + exprText(e.lo) + ' AND ' + exprText(e.hi);
        case 'in':     return exprText(e.e) + (e.not ? ' NOT IN (' : ' IN (') + e.list.map(exprText).join(', ') + ')';
        case 'isdist': return exprText(e.a) + (e.not ? ' IS ' : ' IS NOT ') + exprText(e.b);
        case 'istrue': return exprText(e.e) + (e.not ? ' IS NOT ' : ' IS ') + (e.v ? 'TRUE' : 'FALSE');
        case 'scalar':
        case 'insub':
        case 'exists': return '(another question)';
        default:       return '(...)';
    }
}
```

```js
//  What KIND of thing a piece of a question gives:  'number',  'words',  or 'date'   (for the right words:  "highest first"  or  "Z to A")
function kindOfExpr(e, c, catalog) {
    if (e.t === 'lit') return typeof e.v === 'string' ? (CELL_DATE.test(e.v) || CELL_TIME.test(e.v) ? 'date' : 'words') : 'number';
    if (e.t === 'col' && c !== null) {
        const found = [];
        (function look(f) {
            if (f === null) return;
            if (f.t === 'join') { look(f.a); look(f.b); return; }
            if (f.t !== 'table') return;
            if (e.table !== null && String(e.table).toLowerCase() !== String(f.name).toLowerCase() && String(e.table).toLowerCase() !== String(f.alias || '').toLowerCase()) return;
            const table = catalog.find(f.name);
            if (table === null) return;
            const j = columnNames(table).map(function (n) { return n.toLowerCase(); }).indexOf(String(e.name).toLowerCase());
            if (j !== -1) found.push(kindAt(table, j));
        })(c.from);
        const kind = found.length === 1 ? found[0] : null;
        return kind === 'text' ? 'words' : kind === 'date' || kind === 'timestamp' ? 'date' : 'number';
    }
    if (e.t === 'fn') {
        if ((e.name === 'MIN' || e.name === 'MAX') && e.args.length === 1) return kindOfExpr(e.args[0], c, catalog);
        if (isTotal(e)) return 'number';
        return /^(UPPER|LOWER|TRIM|LTRIM|RTRIM|SUBSTR|SUBSTRING|REPLACE|CONCAT|LEFT|RIGHT|PRINTF|FORMAT|STRING_AGG|GROUP_CONCAT)$/.test(e.name) ? 'words' : 'number';
    }
    if (e.t === 'cat') return 'words';
    return 'number';
}
```

| SQL | In words |
|---|---|
| `SELECT * FROM class_data ORDER BY "Letter Grade" DESC LIMIT 1` | Every row of class_data, sorted by Letter Grade **(Z to A)**, at most 1 row |
| `... WHERE "Letter Grade" > 'C'` | ... where Letter Grade **comes after** 'C' (A to Z) |
| `... WHERE x = NULL` | ... **(never true**: NULL isn't equal to anything, even NULL. Say "is empty": IS NULL) |
| `SELECT 1; SELECT * FROM t` | Every row of t (only the last of the 2 questions runs) |

> That first row is the high schooler's "I asked for the best grade and got the kid who's failing": `DESC` on letters is Z to A, and F comes after A. The engine was right. The words were the problem: "highest first" was a fib for a words column.

<br>

### Step 12.8: The skeleton: "Ask"

**1.** The button says what it's FOR. Replace the Query button:

```html
            <!--  ASK:  ask the open file a question  (in plain words,  by picking,  or in SQL).  It unfolds the query menu,  below.  -->
            <button id="queryBtn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="queryMenu" title="Ask the open file a question:  in your own words,  by picking,  or in SQL" disabled>Ask</button>
```

**2.** Replace the whole query menu (from its comment down to its last `</div>`):

```html
        <!--  THE QUERY MENU,  when you press "Ask".  It unfolds out of the button.   3 ways to ask,  always in step:
                1.  TRY:  ready questions about THIS file   (one press:  the answer).
                2.  THE SENTENCE   (the builder):   Show [every column]   where [Score] [contains] [90]  sorted by ...
                    Show and where are always there,  glowing a little  (that's where you start).
                    The parts you don't use wait on one line  ("+ for each ...").
                    Under it:  how many rows you'd get,  and the question in plain words  (before you ask).
                3.  THE SQL it writes for you.   WRITE IT MYSELF  =  type your own  (SQL,  or plain words:  the sentence waits).
              Then "Show answer":  the ANSWER takes the window's place  ("← Back to file" brings the file back).
              FIX MY TYPOS  (on at the start)  =  small SQL mistakes get fixed,  and you're told what changed
              (in amber if a fix left a condition out:  that answer has rows you meant to keep out).
              class="folded closed"  =  it starts folded up,  and out of sight.
              (The brain fills in the "Try:" line and the sentence.)  -->
        <div id="queryMenu" class="folded closed" role="dialog" aria-label="Ask the open file a question">
            <div class="query-head">
                <span id="queryTitle">Ask</span>
                <button id="queryClose" type="button" aria-label="Close">×</button>
            </div>
            <div id="queryTry" role="group" aria-label="Ready questions about this file"></div>
            <div id="queryBuilder" role="group" aria-label="Pick your question"></div>
            <p id="queryMeaning" aria-live="polite"></p>
            <div class="query-sql-head">
                <span class="query-sql-label">SQL</span>
                <label class="query-option" title="Small SQL mistakes get fixed  (a typo,  a missing FROM,  words without quotes ...),  and you're told what changed">
                    <input type="checkbox" id="queryFlex" checked> Fix my typos
                </label>
                <label class="query-option" title="Type your own SQL  (or plain words).   The sentence waits while you do  (click it to go back to it).">
                    <input type="checkbox" id="queryType"> Write it myself
                </label>
                <span id="querySqlNote">writes itself as you pick</span>
            </div>
            <textarea id="querySql" spellcheck="false" autocomplete="off" rows="4" aria-label="The question in SQL" placeholder="SQL,  or plain words.   Enter = show the answer,  Shift + Enter = a new line"></textarea>
            <!--  It ASKS first:  "Did you mean ...?"  (plain words with a word left over),  or leaving "Write it myself"
                  when part of your SQL doesn't fit the sentence.  -->
            <div id="queryAsk" role="alertdialog" aria-live="polite" hidden>
                <span id="queryAskWords"></span>
                <button id="queryAskYes" type="button">Drop them</button>
                <button id="queryAskNo" type="button">Keep writing</button>
            </div>
            <!--  What "Fix my typos" fixed  (and what a fix left out:  in amber)  -->
            <div id="queryFixes" hidden></div>
            <div class="query-foot">
                <button id="queryRun" type="button" title="Show the answer  (Enter)">Show answer ▶</button>
                <button id="queryCopy" type="button">Copy SQL</button>
                <button id="queryExport" type="button" title="Download the answer as a CSV file" disabled>Save as CSV</button>
                <span id="queryStatus" role="status" aria-live="polite"></span>
            </div>
        </div>
```

| Piece | Baby words |
|---|---|
| `#queryTry` | "Try:" + up to 4 ready questions about THIS file (the brain fills it in). |
| `#queryMeaning` | Under the sentence: "→ 4 rows · Every row of ... where ...". |
| "Fix my typos" / "Write it myself" | The SAME two checkboxes as Part 11 (same `id`s), in plainer words. |
| `placeholder` on the SQL box | It shows when the box is empty: it says plain words work, and what Enter does. |
| "Show answer ▶" / "Save as CSV" | "Run" and "Export" are computer words. These say what you GET. |

> Every `id` from Part 10 and 11 is still there, so everything that used them still works. Only the words a person reads changed.

<br>

### Step 12.9: The brain's new handles

In the brain's QUERY section, replace the list of handles (it grew 2: the Try line, and the meaning line):

```js
const queryBtn     = document.getElementById('queryBtn');       //  "Ask"  (the end of the file bar)
const queryMenu    = document.getElementById('queryMenu');      //  the menu it unfolds into
const queryTitle   = document.getElementById('queryTitle');     //  its  "Ask  ·  sales  ·  1,204 rows"
const queryClose   = document.getElementById('queryClose');     //  its  ×
const queryTry     = document.getElementById('queryTry');       //  "Try:  (How many for each Region) ..."   (the brain fills it in)
const queryBuilder = document.getElementById('queryBuilder');   //  the sentence  (the brain fills it in)
const queryMeaning = document.getElementById('queryMeaning');   //  "→ 4 rows  ·  Every row of sales where ..."
const querySql     = document.getElementById('querySql');       //  the SQL box
const queryNote    = document.getElementById('querySqlNote');   //  "writes itself as you pick"
const queryFlex    = document.getElementById('queryFlex');      //  [✓] Fix my typos
const queryType    = document.getElementById('queryType');      //  [ ] Write it myself
const queryAsk     = document.getElementById('queryAsk');       //  "Did you mean ...?   [Ask that] [Keep writing]"
const queryAskWords = document.getElementById('queryAskWords');
const queryAskYes  = document.getElementById('queryAskYes');
const queryAskNo   = document.getElementById('queryAskNo');
const queryFixes   = document.getElementById('queryFixes');     //  "Fixed for you:  selct  ->  SELECT ..."   (+ the amber warnings)
const queryRun     = document.getElementById('queryRun');       //  "Show answer ▶"
const queryCopy    = document.getElementById('queryCopy');      //  "Copy SQL"
const queryExport  = document.getElementById('queryExport');    //  "Save as CSV"
const queryStatus  = document.getElementById('queryStatus');    //  "12 rows · 8 ms"   (or what went wrong)
const backBtn      = document.getElementById('backBtn');        //  "← Back to file"
```

And the state, under `typeMode`:

```js
let typeMode    = false;    //  WRITE IT MYSELF:  you write the SQL yourself.  (The sentence waits,  and stops writing over it.)
let queryFold   = null;     //  the "hide it once it's done folding" timer
let limitOpen   = false;    //  "at most ... rows" shown,  but no number in it yet   (you pressed "+ at most")
let previewId   = 0;        //  counts every "→ 4 rows" look-ahead  (a newer pick?  The old count stops)
let previewWait = null;     //  ...and the little wait before it starts  (picking 3 things fast = one count)
```

> **Why no box for "your own words"?** A first version had one, on top. But that's 2 boxes to type in, and people don't know which one is for what. Plain words go in the SQL box: Fix my typos reads them (Step 12.6), and the sentence shows how. One box for writing; the sentence for picking.

<br>

### Step 12.10: Words that follow the column

Part 10's `FILTER_OPS` said "is over" for every column. To a WORDS column, `>` means "comes after, A to Z" (that's what SQL really does), so "is over" was a fib: `"Letter Grade" is over C` sounds like "better than C", and it means D, F. Replace `FILTER_OPS`, `TOTAL_FNS` and `TOTAL_WORDS` with:

```js
//  ---- THE SENTENCE   (the builder) ----

//  A column's KIND,  for the words:   'number'  ·  'words'  ·  'date'
//  (Worked out from up to 20,000 of its rows,  only when a word needs it:  queryI.js's kindAt.)
function kindWordsOf(col) {
    const kind = kindAt(fileTable.engine, queryColumns().indexOf(col));
    return kind === 'int' || kind === 'real' || kind === 'num' ? 'number' : kind === 'date' || kind === 'timestamp' ? 'date' : 'words';
}

//  Which conditions you can pick,  in plain words.   They follow the column:  to WORDS,  ">"  means "comes after,  A to Z"
//  (that's what SQL does with it),  so the words say that,  instead of "is over".
const FILTER_WORDS = {
    number: [['=', 'is'], ['<>', 'is not'], ['>', 'is over'], ['>=', 'is at least'], ['<', 'is under'], ['<=', 'is at most'],
             ['contains', 'contains'], ['starts', 'starts with'], ['ends', 'ends with'], ['empty', 'is empty'], ['filled', 'is not empty']],
    words:  [['=', 'is'], ['anycase', 'is (any capitals)'], ['<>', 'is not'], ['contains', 'contains'], ['starts', 'starts with'], ['ends', 'ends with'],
             ['empty', 'is empty'], ['filled', 'is not empty'],
             ['<', 'comes before (A to Z)'], ['<=', 'is or comes before'], ['>', 'comes after (A to Z)'], ['>=', 'is or comes after']],
    date:   [['=', 'is'], ['<>', 'is not'], ['>', 'is after'], ['>=', 'is on or after'], ['<', 'is before'], ['<=', 'is on or before'],
             ['empty', 'is empty'], ['filled', 'is not empty'], ['contains', 'contains'], ['starts', 'starts with'], ['ends', 'ends with']],
};
//  ('anycase'  =  LIKE with no  %:   City LIKE 'chicago'   ("is",  but any capitals:  the same as "is" for numbers and dates)

//  "ANY COLUMN":  find a word wherever it is in the row   (you don't have to know which column it's in).
//  Its SQL is one test per column,  joined by OR:   (Name LIKE '%jo%' OR City LIKE '%jo%' OR ...)
//  So it only makes sense for a word:  contains,  starts with,  ends with,  or is  (any capitals).
//  Offered up to ANY_COLUMN_MAX columns  (a 10,000-column file would write 10,000 lines of SQL,  and check them all on every row).
//  The two picks below aren't columns,  so their values start with a character no column name can have  (a NUL).
const ANY_COLUMN     = String.fromCharCode(0) + 'any column';
const EVERY_COLUMN   = String.fromCharCode(0) + 'every column';
const ANY_COLUMN_MAX = 100;
FILTER_WORDS.any = [['contains', 'contains'], ['starts', 'starts with'], ['ends', 'ends with'], ['anycase', 'is (any capitals)']];

//  Which way a sort goes,  in plain words   ("highest first" would be a fib for letters:  F comes after A)
const SORT_WORDS = {
    number: [['up', 'lowest first'], ['down', 'highest first']],
    words:  [['up', 'A to Z'], ['down', 'Z to A']],
    date:   [['up', 'oldest first'], ['down', 'newest first']],
};

//  Which totals you can pick.   [what it's called here,  its SQL,  its nickname's start]
const TOTAL_FNS = [
    ['rows',     'COUNT(*)',       'count'],
    ['count',    'COUNT',          'count'],
    ['distinct', 'COUNT DISTINCT', 'different'],
    ['sum',      'SUM',            'sum'],
    ['avg',      'AVG',            'average'],
    ['min',      'MIN',            'smallest'],
    ['max',      'MAX',            'biggest'],
    ['median',   'MEDIAN',         'median'],
];

//  The "+ count or total" list   (before a column is picked,  so its words are the number ones)
const TOTAL_ADD = [['rows', 'how many rows'], ['distinct', 'how many different ...'], ['count', 'how many filled-in ...'],
                   ['sum', 'the total of ...'], ['avg', 'the average of ...'], ['min', 'the smallest ...'], ['max', 'the biggest ...'],
                   ['median', 'the middle value of ...']];

//  A total,  in plain words,  for the kind of column it's of   (the smallest WORD is the first one,  A to Z)
function totalWords(fn, kind) {
    if (fn === 'min') return kind === 'words' ? 'the first (A to Z)' : kind === 'date' ? 'the earliest' : 'the smallest';
    if (fn === 'max') return kind === 'words' ? 'the last (A to Z)' : kind === 'date' ? 'the latest' : 'the biggest';
    return { rows: 'how many rows', count: 'how many filled-in', distinct: 'how many different', sum: 'the total of', avg: 'the average of', median: 'the middle value of' }[fn];
}

//  Only NUMBERS can be added up,  averaged,  or have a middle value   (an average of words would always be 0:  never offered)
function totalFits(fn, kind) {
    return kind === 'number' || ['rows', 'count', 'distinct', 'min', 'max'].indexOf(fn) !== -1;
}
```

| A column of... | Conditions say | Sorting says | Its smallest / biggest |
|---|---|---|---|
| numbers | is over, is at least ... | lowest first / highest first | the smallest / the biggest |
| words | comes after (A to Z) ... | A to Z / Z to A | the first (A to Z) / the last (A to Z) |
| dates | is after, is on or before ... | oldest first / newest first | the earliest / the latest |

> `totalFits`: an average of WORDS is always 0 (SQL reads `'Ana'` as 0). So "the average of" only offers number columns. A total you can't do is never on the list.

<br>

### Step 12.11: The sentence

Part 10's builder showed all 6 rows all the time: Show, Keep rows, Group by, Totals, Sort by, At most. For somebody who doesn't know SQL, that's 6 strange words before they've done anything. Now it's a SENTENCE. Show and where are always there (that's where everybody starts), glowing a little; the other parts only get a line once you use them:

```text
   Show      [every column]   [+ column ▾]  [+ count or total ▾]
   where     [+ pick a column to search ... ▾]
             [+ for each ▾]  [+ sorted by ▾]  [+ at most]        <- a new file:  just this
```

Pick a column to search: its condition starts as **contains**, and the keyboard is already in its value box. Type `jo`: José AND Carter **Jo**nes. Replace `drawBuilder`:

```js
//  Draw the sentence  (all of it,  every time something is picked:  it's small).
//
//      Show       [Student Name ×]  [+ column ▾]  [+ count or total ▾]
//      where      [Name ▾] [contains ▾] [jo] ×    [or ▾] [Letter Grade ▾] [is ▾] [A] ×    [+ and ▾]
//      for each   [Grade Level ×]  [+ and ▾]
//      sorted by  [Score ▾] [highest first ▾] ×    [+ then by ▾]
//      at most    [ 10 ] rows ×
//                 [+ for each ▾]  [+ sorted by ▾]  [+ at most]      <- the parts not used yet,  on ONE line
//
//  Show and where are ALWAYS there  (a new file:  "Show every column",  "where [+ pick a column to search]"):
//  that's where people start,  so they glow a little.   The other parts only get a line once you use them.
//  Each line has a NAME that never changes  (data-part:  show,  where,  group,  sort,  limit,  more),  and so does each
//  "+" list  (data-add:  what it adds).   The words can change;  the names don't  (tests and screen readers go by them).
//  (focusNext:  which pick gets the keyboard after the redraw.   Add a condition  ->  you're typing its value right away.)
let focusNext = null;

function drawBuilder() {

    const before = document.activeElement && queryBuilder.contains(document.activeElement) ? document.activeElement.dataset.key || null : null;
    queryBuilder.textContent = '';
    if (fileTable === null) return;

    const columns = queryColumns();
    const colOptions = columns.map(function (c) { return [c, c]; });
    const grouped = build.group.length > 0 || build.totals.length > 0;

    //  One line of the sentence:   [its words]  [what you picked ...]
    function part(name, words, fill) {
        const row = document.createElement('div');
        row.className = 'query-row';
        row.dataset.part = name;
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', words || 'Add to the question');
        const label = document.createElement('span');
        label.className = 'query-label';
        label.textContent = words;
        const box = document.createElement('div');
        box.className = 'query-pick';
        fill(box);
        row.append(label, box);
        queryBuilder.appendChild(row);
    }
    function key(element, name) { element.dataset.key = name; return element; }
    function adder(what, words, options, label, onPick) { const list = key(addList(words, options, label, onPick), 'add:' + what); list.dataset.add = what; return list; }
    function hint(box, words) { const h = document.createElement('span'); h.className = 'query-hint'; h.textContent = words; box.appendChild(h); }
    function changed() { drawBuilder(); writeSql(); }

    //  A total:   [the average of ▾] [Score ▾]  as n  ×     (its words follow its column's kind)
    function addTotal(fn) {
        if (fn === 'rows' && build.totals.some(function (t) { return t.fn === 'rows'; })) return;     //  ("how many rows" twice says nothing new)
        let col = null;
        if (fn !== 'rows') {
            col = columns.find(function (c) { return totalFits(fn, kindWordsOf(c)); }) || null;
            if (col === null) { setQueryStatus('There\'s no column of numbers to work that out on.', true); return; }
        }
        build.totals.push({ fn: fn, col: col });
        focusNext = 'total:' + (build.totals.length - 1) + ':col';
        changed();
    }
    function totalLine(t, k) {
        const line = document.createElement('span');
        line.className = 'query-line';
        const kind = t.col === null ? 'number' : kindWordsOf(t.col);
        line.appendChild(key(pickList(TOTAL_FNS.map(function (f) { return [f[0], totalWords(f[0], kind)]; }), t.fn, 'Count or total', function (v) {
            t.fn = v;
            t.name = null;                              //  (a nickname you typed was for the OLD total)
            t.auto = false;                             //  (you picked it now:  it stays,  even without "for each")
            if (v === 'rows') t.col = null;
            else if (t.col === null || !totalFits(v, kindWordsOf(t.col))) {
                const fit = columns.find(function (c) { return totalFits(v, kindWordsOf(c)); });
                if (fit === undefined) { t.fn = 'rows'; t.col = null; setQueryStatus('There\'s no column of numbers to work that out on.', true); }
                else t.col = fit;
            }
            changed();
        }), 'total:' + k + ':fn'));
        if (t.fn !== 'rows') {
            const numbersOnly = !totalFits(t.fn, 'words');
            const fits = numbersOnly ? colOptions.filter(function (o) { return kindWordsOf(o[0]) === 'number'; }) : colOptions;
            line.appendChild(key(pickList(fits, t.col, 'Of which column', function (v) { t.col = v; t.name = null; changed(); }), 'total:' + k + ':col'));
        }
        if (t.name) hint(line, 'as ' + t.name);         //  a nickname from SQL you typed:   COUNT(*) AS n   ->   "as n"
        line.appendChild(key(smallButton('×', 'Remove this total', function () { build.totals.splice(k, 1); changed(); }), 'total:' + k + ':x'));
        return line;
    }

    //  SHOW:  the columns,  or the totals   ("Show how many rows,  the average of Score")
    //  Whatever it shows,  "every column" is ALWAYS one pick away   (the first choice of its "+" list):
    //  picked 3 columns,  or counted for each Region,  and want the whole rows back?   No × by ×,  no typing SQL.
    const EVERY = [[EVERY_COLUMN, '↺ every column']];
    function everyColumn() {
        build.show = [];
        build.totals = [];
        build.group = [];                               //  (every column  =  every ROW too:  "for each" would squash them)
        changed();
    }
    function addTotalOrEvery(v) { if (v === EVERY_COLUMN) everyColumn(); else addTotal(v); }
    part('show', 'Show', function (box) {
        if (build.totals.length > 0) {
            build.totals.forEach(function (t, k) { box.appendChild(totalLine(t, k)); });
            box.appendChild(adder('totals', '+ and ...', EVERY.concat(TOTAL_ADD), 'Count or total something else  (or back to every column)', addTotalOrEvery));
            return;
        }
        if (build.group.length > 0) {
            hint(box, 'each different ' + build.group.join(' + '));
            box.appendChild(adder('totals', '+ count or total', EVERY.concat(TOTAL_ADD), 'Count or total something  (or back to every column)', addTotalOrEvery));
            return;
        }
        if (build.show.length === 0) {                      //  (a pill,  not faint words:  it IS what you'll get)
            const all = document.createElement('span');
            all.className = 'query-all';
            all.textContent = 'every column';
            box.appendChild(all);
        }
        build.show.forEach(function (c, k) {
            box.appendChild(key(chip(c, function () { build.show.splice(k, 1); changed(); }), 'show:' + k));
        });
        const left = colOptions.filter(function (o) { return build.show.indexOf(o[0]) === -1; });
        const choices = build.show.length > 0 ? EVERY.concat(left) : left;
        if (choices.length > 0) box.appendChild(adder('show', '+ column', choices, 'Show just some columns  (or back to every column)', function (v) {
            if (v === EVERY_COLUMN) everyColumn(); else { build.show.push(v); changed(); }
        }));
        box.appendChild(adder('totals', '+ count or total', TOTAL_ADD, 'Count or total something', addTotal));
    });

    //  WHERE:   [column] [how] [value] ×,  each one after the first starts with  [and ▾] / [or ▾]
    //  Always there  (a new file too):  "find the rows with this word in them" is the first thing most people want.
    //  A new condition starts as CONTAINS,  not "is":  people type the word they EXPECT to see,  and "contains"
    //  (any capitals,  anywhere in the cell)  finds it.   "is" wants the whole cell,  exactly:  pick it when you mean that.
    //  "any column"  comes first in the list:  the word could be anywhere in the row.
    function addCondition(v) {
        build.filters.push({ col: v, op: 'contains', value: '' });
        focusNext = 'where:' + (build.filters.length - 1) + ':value';
        changed();
    }
    const whereOptions = columns.length >= 2 && columns.length <= ANY_COLUMN_MAX ? [[ANY_COLUMN, 'any column']].concat(colOptions) : colOptions;
    part('where', 'where', function (box) {
        if (build.filters.length === 0) {
            box.appendChild(adder('where', '+ pick a column to search ...', whereOptions, 'Keep only the rows where a column has a word', addCondition));
            return;
        }
        build.filters.forEach(function (f, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            if (k > 0) {                                //  (all of them join the same way:  pick "or" once,  and they all say "or")
                const join = key(pickList([['all', 'and'], ['any', 'or']], build.any ? 'any' : 'all', 'And, or or', function (v) { build.any = v === 'any'; changed(); }), 'where:' + k + ':join');
                join.classList.add('query-join');
                line.appendChild(join);
            }
            line.appendChild(key(pickList(whereOptions, f.col, 'Column', function (v) {
                f.col = v;
                if (v === ANY_COLUMN && !FILTER_WORDS.any.some(function (o) { return o[0] === f.op; })) f.op = 'contains';     //  (any column:  word tests only)
                changed();
            }), 'where:' + k + ':col'));
            const kind = f.col === ANY_COLUMN ? 'any' : kindWordsOf(f.col);
            let ops = FILTER_WORDS[kind];
            if (!ops.some(function (o) { return o[0] === f.op; })) ops = ops.concat(FILTER_WORDS.number.concat(FILTER_WORDS.words).filter(function (o) { return o[0] === f.op; }).slice(0, 1));
            line.appendChild(key(pickList(ops, f.op, 'Condition', function (v) { f.op = v; if (v !== 'empty' && v !== 'filled') focusNext = 'where:' + k + ':value'; changed(); }), 'where:' + k + ':op'));
            if (f.op !== 'empty' && f.op !== 'filled') {
                const value = document.createElement('input');
                value.type = 'text';
                value.className = 'query-value';
                value.value = f.value;
                value.placeholder = kind === 'number' ? 'a number' : kind === 'date' ? 'YYYY-MM-DD' : kind === 'any' ? 'a word' : 'words';
                value.setAttribute('aria-label', 'Value');
                value.addEventListener('input', function () { f.value = value.value; writeSql(); });
                line.appendChild(key(value, 'where:' + k + ':value'));
            }
            line.appendChild(key(smallButton('×', 'Remove this condition', function () { build.filters.splice(k, 1); changed(); }), 'where:' + k + ':x'));
            box.appendChild(line);
        });
        box.appendChild(adder('where', '+ and ...', whereOptions, 'Add another condition', addCondition));
    });

    //  FOR EACH   (group by)
    //  × the last one?   The "how many rows" that "+ for each" put in by itself goes with it   (auto),
    //  so you're back to the rows,  not stuck on ONE row that counts them all.   (A total YOU picked stays.)
    if (build.group.length > 0) part('group', 'for each', function (box) {
        build.group.forEach(function (c, k) {
            box.appendChild(key(chip(c, function () {
                build.group.splice(k, 1);
                if (build.group.length === 0) build.totals = build.totals.filter(function (t) { return !t.auto; });
                changed();
            }), 'group:' + k));
        });
        const left = colOptions.filter(function (o) { return build.group.indexOf(o[0]) === -1; });
        if (left.length > 0) box.appendChild(adder('group', '+ and ...', left, 'For each of another column too', function (v) { build.group.push(v); changed(); }));
    });

    //  SORTED BY   (grouped:  by a group,  or by a total).   Its "which way" words follow what's sorted.
    const names = totalNames();
    const sortOptions = grouped
        ? build.group.map(function (g) { return [g, g]; }).concat(names.map(function (n) { return [n, n]; }))
        : colOptions;
    function sortKind(col) {
        const k = grouped ? names.indexOf(col) : -1;
        if (k === -1) return kindWordsOf(col);
        const t = build.totals[k];
        return (t.fn === 'min' || t.fn === 'max') && t.col !== null ? kindWordsOf(t.col) : 'number';
    }
    build.sort = build.sort.filter(function (s) { return sortOptions.some(function (o) { return o[0] === s.col; }); });
    function addSort(v) { build.sort.push({ col: v, desc: false }); focusNext = 'sort:' + (build.sort.length - 1) + ':way'; changed(); }
    if (build.sort.length > 0) part('sort', 'sorted by', function (box) {
        build.sort.forEach(function (s, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(key(pickList(sortOptions, s.col, 'Sort by', function (v) { s.col = v; changed(); }), 'sort:' + k + ':col'));
            line.appendChild(key(pickList(SORT_WORDS[sortKind(s.col)], s.desc ? 'down' : 'up', 'Which way',
                                          function (v) { s.desc = v === 'down'; changed(); }), 'sort:' + k + ':way'));
            line.appendChild(key(smallButton('×', 'Remove this sort', function () { build.sort.splice(k, 1); changed(); }), 'sort:' + k + ':x'));
            box.appendChild(line);
        });
        if (sortOptions.length > 0) box.appendChild(adder('sort', '+ then by ...', sortOptions, 'Then sort by', addSort));
    });

    //  AT MOST
    if (build.limit !== '' || limitOpen) part('limit', 'at most', function (box) {
        const limit = document.createElement('input');
        limit.type = 'number';
        limit.min = '1';
        limit.className = 'query-value query-limit';
        limit.placeholder = 'all';
        limit.value = build.limit;
        limit.setAttribute('aria-label', 'At most this many rows');
        limit.addEventListener('input', function () { build.limit = limit.value; writeSql(); });
        box.appendChild(key(limit, 'limit'));
        hint(box, 'rows');
        box.appendChild(key(smallButton('×', 'Show every row', function () { build.limit = ''; limitOpen = false; changed(); }), 'limit:x'));
    });

    //  THE PARTS NOT USED YET,  on one line   (pick one:  its line shows up,  and the keyboard is already in it)
    const more = [];
    if (build.group.length === 0) more.push(adder('group', '+ for each ...', colOptions, 'One row for each ...', function (v) {
        build.group.push(v);
        if (build.totals.length === 0) build.totals.push({ fn: 'rows', col: null, auto: true });     //  "for each Region"  ->  how many in each   (× it,  for just the different ones)
        changed();
    }));
    if (build.sort.length === 0 && sortOptions.length > 0) more.push(adder('sort', '+ sorted by ...', sortOptions, 'Sort by ...', addSort));
    if (build.limit === '' && !limitOpen) {
        const atMost = key(smallButton('+ at most ...', 'Show at most this many rows', function () { limitOpen = true; focusNext = 'limit'; drawBuilder(); }), 'add:limit');
        atMost.className = 'query-add-button';
        atMost.dataset.add = 'limit';
        more.push(atMost);
    }
    if (more.length > 0) part('more', '', function (box) { more.forEach(function (m) { box.appendChild(m); }); });

    pauseSentence(typeMode);

    //  The keyboard goes back where it was  (or where the pick said:  the new condition's value box)
    const want = focusNext !== null ? focusNext : before;
    focusNext = null;
    if (want !== null && !typeMode) {
        const target = queryBuilder.querySelector('[data-key="' + want.replace(/"/g, '') + '"]') || queryBuilder.querySelector('[data-key^="add:"]');
        if (target !== null) target.focus();
    }
}
```

| Code | Baby words |
|---|---|
| `part(name, words, fill)` | One line. `data-part` is its name (`show`, `where`, `group`, `sort`, `limit`, `more`): the words can change, the name doesn't. Tests and screen readers go by the name. |
| `adder(what, ...)` | A "+" list. `data-add` says what it adds, wherever it is (its own line, or the "more" line). |
| `key(element, name)` | Every pick has a name too (`where:1:op`). After a redraw, the keyboard goes back to the pick with the same name. |
| `focusNext` | Where the keyboard goes after THIS pick: a new condition → its value box, a new sort → which way. |
| the `[and ▾]` on line 2 and on | The old "Keep rows that pass all of these / any of these" list, as a word in the sentence. They all join the same way: pick "or" once, and they all say "or". |
| `op: 'contains'` in `addCondition` | The WIDE search: people type the word they expect to see, and "contains" finds it anywhere in the cell, any capitals. "is" wants the whole cell, exactly: it's still on the list, for when you mean that. |
| "every column" is a pill (`.query-all`) | Faint grey words looked like a hint, not like "this is what you'll get". |
| "+ for each" adds "how many rows" | "for each Grade Level" alone means "each different Grade Level". People almost always mean "how many in each". × it to get just the different ones. |
| `EVERY_COLUMN`, `ANY_COLUMN`, `auto` | The way back to every column, the "any column" search, and the "how many rows" that leaves with its "for each": Step 12.16. |

> **Keyboard people:** every pick is a real `<select>` or `<button>` (Tab, arrows, Enter all work), and nothing gets lost in a redraw.

<br>

### Step 12.12: What you'd get, before you ask

"→ 4 rows · Every row of class_data where Score is over 90": under the sentence, a moment after each pick. So you see "→ 0 rows" BEFORE you press anything, and the words say what the picks MEAN.

**1.** `builderSql` learns to write the counting question. Its first line:

```js
//  forCount  =  the question  "how many rows will the answer have?"   (for  "→ 4 rows",  before you ask)
//               the rows that pass the conditions,  or  (for each ...)  how many groups.
function builderSql(forCount) {
```

and right after the GROUP BY line:

```js
    if (forCount) {
        const rest = lines.slice(1).join('\n');                     //  FROM,  WHERE,  GROUP BY
        return build.group.length > 0 ? 'SELECT COUNT(*) FROM (SELECT 1\n' + rest + ') AS counted' : 'SELECT COUNT(*)\n' + rest;
    }
```

**2.** `writeSql` starts it, and the counting itself:

```js
function writeSql() {
    if (fileTable === null || typeMode) return;
    querySql.value = builderSql();
    showMeaning();
}
```

```js
//  ---- WHAT YOU'D GET   ("→ 4 rows  ·  Every row of class_data where Score is over 90":  under the sentence,  before you ask) ----
//
//  A little while after each pick  (3 quick picks = 1 count),  in bites,  and it stops when you pick again,  or ask.
//  It counts with "Fix my typos" too  (a word spelled the file's way:  the same rows the answer will have).
//  Writing it yourself?   Just the words  (no counting while you type).
const PREVIEW_WAIT = 250;
const PREVIEW_MAX_ROWS = 2000000;       //  a bigger file:  just the words  (counting on every pick would keep the computer busy)

function showMeaning() {
    clearTimeout(previewWait);
    previewId++;                                        //  (a count that's still going:  stop)
    if (fileTable === null || !queryMenuOpen()) return;
    previewWait = setTimeout(previewNow, PREVIEW_WAIT);
}

async function previewNow() {
    const myPreview = previewId, myLoad = loadId, myRun = queryId;
    function isCurrent() { return myPreview === previewId && myLoad === loadId && myRun === queryId && queryMenuOpen(); }
    const catalog = queryCatalog(isCurrent);
    const sql = typeMode ? querySql.value : builderSql();
    const words = sql.trim() === '' ? null : queryInWords(sql, catalog);

    if (typeMode) {
        meaningLine(null, words !== null ? words : sql.trim() === '' ? '' :
                    '... not a whole question yet' + (queryFlex.checked ? '   ("Show answer" will try to fix it)' : ''));
        return;
    }
    if (build.totals.length > 0 && build.group.length === 0) { meaningLine(1, words); return; }     //  totals of everything:  ONE row
    if (fileTable.table.count > PREVIEW_MAX_ROWS) { meaningLine(null, words); return; }
    meaningLine(undefined, words);
    try {
        const counted = await runQuery(builderSql(true), catalog, isCurrent, null, queryFlex.checked);
        if (!isCurrent()) return;
        const limit = parseInt(build.limit, 10);
        const n = counted.rows[0][0];
        meaningLine(limit > 0 && n > limit ? limit : n, words, counted.fixes.length > 0);
    } catch (problem) {
        if (problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        if (!(problem instanceof QueryError)) throw problem;
        if (isCurrent()) meaningLine(null, words);
    }
}

//  The line:   → 4 rows  ·  the words      (n:  undefined = still counting,  null = no count)
function meaningLine(n, words, fixed) {
    queryMeaning.textContent = '';
    if (n !== null) {
        const count = document.createElement('strong');
        count.textContent = n === undefined ? '→ counting ...' : '→ ' + n.toLocaleString() + (n === 1 ? ' row' : ' rows') + (fixed ? '  (with a fix)' : '');
        queryMeaning.appendChild(count);
    }
    if (words) queryMeaning.appendChild(document.createTextNode((n !== null ? '   ·   ' : '') + words));
}
```

| Code | Baby words |
|---|---|
| `PREVIEW_WAIT` (250 ms) | 3 quick picks = ONE count, not 3. |
| `previewId++` | A new pick? The count that's going stops (at its next bite). So does pressing "Show answer" (`queryId`). |
| `queryFlex.checked` | It counts with "Fix my typos" too: `'Shipped'` spelled the file's way gives the same rows the answer will have. |
| `PREVIEW_MAX_ROWS` | Past 2,000,000 rows: just the words (counting on every pick would keep the computer busy). |

<br>

### Step 12.13: Ask it, and "Try:"

**1.** One way in for every whole question (a Try button, "Did you mean"): into the sentence, then asked. A part the sentence can't show (a JOIN)? It goes in the SQL box instead.

```js
//  ---- ASK IT   (a whole question in SQL:  a "Try:" button,  plain words,  or "Did you mean")  ----
//  Into the sentence,  then asked.   A part the sentence can't show?   Into the SQL box instead,  as if you wrote it.
function askSql(sql) {
    let read = null;
    try { read = buildFromSql(sql); }
    catch (problem) { if (!(problem instanceof QueryError)) throw problem; }
    askFirst(null);
    if (read !== null && read.left.length === 0) {
        build = read.build;
        limitOpen = false;
        setTypeMode(false);
        drawBuilder();
        writeSql();
    } else {
        setTypeMode(true);
        querySql.value = sql;
    }
    runTheQuery();
}
```

**2.** "Try:", from the file's profile (Step 12.5). The first time the menu opens for a file:

```js
//  ---- TRY:   up to 4 ready questions about THIS file   (queryI.js:  tableStarters,  from the file's profile) ----
//  Worked out the first time the menu opens for a file  (one look at its rows,  in bites),  then kept.
async function showStarters() {
    if (fileTable === null || queryTry.childElementCount > 0) return;
    const table = fileTable.engine, myLoad = loadId;
    function isCurrent() { return myLoad === loadId && fileTable !== null && fileTable.engine === table; }
    let profile;
    try { profile = await tableProfile(table, isCurrent); }
    catch (problem) { if (problem === QUERY_STALE) return; throw problem; }
    if (!isCurrent() || queryTry.childElementCount > 0) return;

    const label = document.createElement('span');
    label.className = 'query-try-label';
    label.textContent = 'Try:';
    queryTry.appendChild(label);
    tableStarters(profile, table.name).forEach(function (s) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'query-try';
        b.textContent = s.words;
        b.title = s.sql;                                //  (hover:  the SQL it asks)
        b.addEventListener('click', function () { askSql(s.sql); });
        queryTry.appendChild(b);
    });
}
```

> **Never `innerHTML`.** A column named `<img src=x onerror=...>` is somebody's data, not the page's code. Every word goes in with `textContent`, so it's shown, never run (`realfile-ask` checks exactly that).

<br>

### Step 12.14: Enter asks it, and the warnings are amber

**1.** Enter, like a chat box (people expect it now). Shift + Enter = a new line, Ctrl + Enter still works. Replace the old Ctrl + Enter listener:

```js
//  ENTER  =  ask it,  like a chat box.   Shift + Enter  =  a new line.   Ctrl / Cmd + Enter  works too.
//  (Never while an input method is still making a letter:  there,  Enter PICKS the letter  (Japanese,  Chinese,  Korean ...).)
function isAskEnter(e) {
    return e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.isComposing && e.keyCode !== 229;
}
querySql.addEventListener('keydown', function (e) {
    if (isAskEnter(e)) { e.preventDefault(); runTheQuery(); }
});
queryBuilder.addEventListener('keydown', function (e) {             //  (Enter in a value box,  or in "at most")
    if (isAskEnter(e) && e.target.tagName === 'INPUT') { e.preventDefault(); runTheQuery(); }
});

function setQueryStatus(words, bad) {
    queryStatus.textContent = words;
    queryStatus.classList.toggle('bad', bad);
}


//  ---- RUN IT ----

function runTheQuery() {

    if (fileTable === null) return;

    const text   = querySql.value;
    const myRun  = ++queryId;
    const myLoad = loadId;
    function isCurrent() { return myRun === queryId && myLoad === loadId; }

    setQueryStatus('Asking ...', false);
    startLoading('Working out the answer...');
    const started = performance.now();

    askFirst(null);
    clearTimeout(previewWait);                          //  (the "→ 4 rows" look-ahead:  not now.   queryId changed,  so it stops anyway)
    runQuery(text, queryCatalog(isCurrent), isCurrent, function (done) {
        setProgress(0.9 * done);
        setLoadingLabel('Working out the answer...  ' + Math.floor(100 * done) + '%');
    }, queryFlex.checked).then(function (result) {

        if (!isCurrent()) return;
        afterFlex(result.sql, result.fixes, result.warnings);       //  (fixed?  Show what really ran,  and what a fix left out.)
        return showAnswer(result, result.sql, performance.now() - started, isCurrent);

    }).then(function () {

        if (!isCurrent()) return;
        finishLoading();

    }, function (problem) {

        if (!isCurrent() || problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        finishLoading();
        if (problem && problem.fixes && problem.fixes.length > 0) afterFlex(problem.sql, problem.fixes, problem.warnings);    //  (how far the fixing got)
        //  Plain words with a word left over:  not an error,  a QUESTION back   ("Did you mean ...?"  [Ask that])
        if (problem instanceof QueryError && problem.why && problem.why.kind === 'words' && problem.why.sql !== null) {
            const sql = problem.why.sql;
            setQueryStatus('', false);
            askFirst(problem.message.replace(/^That reads like plain words\.\s+/, ''), 'Ask that', function () { askSql(sql); }, 'Keep writing', querySql);
            return;
        }
        setQueryStatus(queryProblem(problem), true);
    });
}

queryRun.addEventListener('click', runTheQuery);


//  Turn the answer into a table  (the same kind the brain keeps for a file),  and put it on screen.
//  It's written straight into one long string,  and where each row starts is written down as it goes:
//  so it never has to be cut up again.   (In bites:  a million-row answer never freezes the page.)
//
//  Careful with memory:  a 10,000-column answer is 100 million cells.
//    -  Each line is glued with  join,  never  line += cell.   (+= keeps every little piece alive until the very end:
//       about 60 bytes a cell,  so a 500 MB answer needed 5+ GB,  and the tab crashed.   join makes ONE flat string.)
//    -  Each of the engine's rows is let go once it's written,  so the rows and the text are never both whole.
async function showAnswer(result, text, ms, isCurrent) {

    setLoadingLabel('Laying out the answer...');

    const cols    = result.columns;
    const rows    = result.rows;
    const types   = cols.map(function (c) { return c.type; });
    const looks   = cols.map(function (c) { return c.look || null; });     //  money keeps its look:   $116,450.00
    const header  = cols.map(function (c) { return c.name; });
    const longest = header.map(function (n) { return n.length; });
    const starts  = new Uint32Array(rows.length + 1);
    const nullRows = [], nullCols = [];
    const parts = [];
    const pieces = [];                                  //  each bite's lines,  glued into ONE piece at the end of that bite
    const cells = new Array(cols.length);
    let at = 0;
    let work = 0;                                       //  cells written since the clock was last checked
    let stopAt = performance.now() + CHUNK_TIME;

    for (let r = 0; r < rows.length; r++) {

        work += cols.length;
        if (((r & 1023) === 1023 || work >= BITE_CELLS) && performance.now() >= stopAt) {
            setProgress(0.9 + 0.1 * r / rows.length);
            //  (Gluing as it goes:  270,000 lines glued in ONE go at the end held the page still for ~50 ms.)
            pieces.push(parts.join(''));
            parts.length = 0;
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
        if (work >= BITE_CELLS) work = 0;

        starts[r] = at;
        const row = rows[r];
        rows[r] = null;                                 //  (written down now:  the engine's copy can go)
        for (let c = 0; c < cols.length; c++) {
            const v = row[c];
            if (v === null) { nullRows.push(r + 1); nullCols.push(c); }
            const cell = queryCellText(v, types[c], looks[c]);
            if (cell.length > longest[c]) longest[c] = cell.length;
            cells[c] = /[",\r\n]/.test(cell) ? '"' + cell.split('"').join('""') + '"' : cell;
        }
        const line = cells.join(',') + '\n';
        parts.push(line);
        at += line.length;
    }
    starts[rows.length] = at;

    //  The SQL notes,  so the TABLE LOOK can show the answer's column types and its NULLs  (like a SQL dump's table).
    const info = {
        file: null, dialect: '', sheetName: 'Result', sheetNumber: 1, sheetCount: 1, sheets: [],
        columns: cols.map(function (c) { return { name: c.name, type: queryTypeName(c.type), pk: false }; }),
        rows: rows.length,
        nullCount: nullRows.length,
        nullRows: Uint32Array.from(nullRows),
        nullCols: Uint16Array.from(nullCols),
        result: { sql: text, ms: ms, rows: rows.length, from: mainTableName(), fixes: result.fixes || [],
                  warnings: result.warnings || [], skipped: result.skipped || [], meaning: queryInWords(text, queryCatalog(isCurrent)) },
    };

    pieces.push(parts.join(''));
    const table = {
        header: header, text: pieces.length === 1 ? pieces[0] : pieces.join(''), starts: starts, count: rows.length, longest: longest,
        excel: null, sql: info, name: fileTable.file.name,
        note: result.count > 1 ? '  ·  ran the last of ' + result.count + ' queries' : '',
    };

    if (!showingAnswer()) fileLook = excelLook;         //  (remember the file's look,  for "← Back to file")
    swapIn(table, true);
    answer = { table: table };
    queryExport.disabled = false;
    setQueryStatus(rows.length.toLocaleString() + ' row' + (rows.length === 1 ? '' : 's') + '  ·  ' + formatTime(ms), false);
    closeQueryMenu();                                   //  out of the way,  so you can see the answer
}


//  ← BACK TO FILE:  the file was only put aside.   Put it back.
function backToFile() {
    if (fileTable === null || !showingAnswer()) return;
    queryId++;                                          //  (a query still running?  It stops.)
    swapIn(fileTable.table, fileLook);
    answer = null;                                      //  let the answer go  (a big one is as big as a file)
    queryExport.disabled = true;
    setQueryStatus('', false);
}

backBtn.addEventListener('click', backToFile);


//  COPY SQL   (the browser's clipboard.   An older browser?  The old way:  select it,  and "copy".)
queryCopy.addEventListener('click', function () {
    const done = function () { setQueryStatus('SQL copied', false); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(querySql.value).then(done, copyTheOldWay);
    } else copyTheOldWay();

    function copyTheOldWay() {
        querySql.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { setQueryStatus('Couldn\'t copy:  select the SQL and press Ctrl + C', true); }
    }
});
```

> **`e.isComposing`:** with a Japanese, Chinese or Korean keyboard, Enter PICKS the letter you're making. Asking right then would be a bug only those people ever see. (`keyCode 229` is the same thing, for older browsers.)

**2.** The ask bar learns a second kind of question ("Did you mean ...? [Ask that] [Keep writing]"), and where "Keep writing" sends the keyboard. Replace `askFirst` and its 2 buttons:

```js
//  The question,  under the SQL box:   "The sentence can't show:  the JOIN.   [Drop it]  [Keep writing]"
//  or   "Did you mean:  ...?   [Ask that]  [Keep writing]"
//  (words  null  =  put it away.   noWords / noFocus:  the other button,  and where it sends the keyboard.)
let askYes = null;
let askNoFocus = null;

function askFirst(words, yesWords, onYes, noWords, noFocus) {
    queryAsk.hidden = words === null;
    askYes = onYes || null;
    askNoFocus = noFocus || querySql;
    if (words === null) return;
    queryAskWords.textContent = words;
    queryAskYes.textContent = yesWords;
    queryAskNo.textContent = noWords || 'Keep writing';
    queryAskYes.focus();
}

queryAskYes.addEventListener('click', function () {
    const go = askYes;
    askFirst(null);
    if (go !== null) go();
});

queryAskNo.addEventListener('click', function () {
    const back = askNoFocus;
    askFirst(null);
    back.focus();                                       //  (still writing:  nothing changed)
});
```

**3.** The fixes line puts what a fix LEFT OUT first, in amber. Replace `showFixes` and `afterFlex`'s first line:

```js
//  What "Fix my typos" fixed,  in words,  under the box.   A fix that LEFT OUT a condition comes first,  in amber:
//  that answer has rows the question meant to keep out.   (Both empty  =  put the line away.)
function showFixes(fixes, warnings) {
    const left = warnings || [];
    queryFixes.hidden = fixes.length === 0 && left.length === 0;
    queryFixes.textContent = '';
    left.forEach(function (w) {
        const line = document.createElement('div');
        line.className = 'query-warn';
        line.textContent = '⚠  ' + w;
        queryFixes.appendChild(line);
    });
    if (fixes.length > 0) {
        const line = document.createElement('div');
        line.textContent = 'Fixed for you:   ' + fixes.join('   ·   ');
        queryFixes.appendChild(line);
    }
}

//  After a Run:  "Fix my typos" changed the SQL?   Show the SQL that REALLY ran,  and say what changed.
function afterFlex(sql, fixes, warnings) {
    showFixes(fixes, warnings);
```

<br>

### Step 12.15: The answer says what it is

**1.** `runTheQuery`: a "Did you mean" isn't an error. It's a QUESTION back (blue, with a button), not red words:

```js
function runTheQuery() {

    if (fileTable === null) return;

    const text   = querySql.value;
    const myRun  = ++queryId;
    const myLoad = loadId;
    function isCurrent() { return myRun === queryId && myLoad === loadId; }

    setQueryStatus('Asking ...', false);
    startLoading('Working out the answer...');
    const started = performance.now();

    askFirst(null);
    clearTimeout(previewWait);                          //  (the "→ 4 rows" look-ahead:  not now.   queryId changed,  so it stops anyway)
    runQuery(text, queryCatalog(isCurrent), isCurrent, function (done) {
        setProgress(0.9 * done);
        setLoadingLabel('Working out the answer...  ' + Math.floor(100 * done) + '%');
    }, queryFlex.checked).then(function (result) {

        if (!isCurrent()) return;
        afterFlex(result.sql, result.fixes, result.warnings);       //  (fixed?  Show what really ran,  and what a fix left out.)
        return showAnswer(result, result.sql, performance.now() - started, isCurrent);

    }).then(function () {

        if (!isCurrent()) return;
        finishLoading();

    }, function (problem) {

        if (!isCurrent() || problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        finishLoading();
        if (problem && problem.fixes && problem.fixes.length > 0) afterFlex(problem.sql, problem.fixes, problem.warnings);    //  (how far the fixing got)
        //  Plain words with a word left over:  not an error,  a QUESTION back   ("Did you mean ...?"  [Ask that])
        if (problem instanceof QueryError && problem.why && problem.why.kind === 'words' && problem.why.sql !== null) {
            const sql = problem.why.sql;
            setQueryStatus('', false);
            askFirst(problem.message.replace(/^That reads like plain words\.\s+/, ''), 'Ask that', function () { askSql(sql); }, 'Keep writing', querySql);
            return;
        }
        setQueryStatus(queryProblem(problem), true);
    });
}
```

**2.** In `showAnswer`, the answer keeps its warnings, what was skipped, and its question in words:

```js
        result: { sql: text, ms: ms, rows: rows.length, from: mainTableName(), fixes: result.fixes || [],
                  warnings: result.warnings || [], skipped: result.skipped || [], meaning: queryInWords(text, queryCatalog(isCurrent)) },
```

**3.** The badge says it. The menu is closed by now, so a warning on a HOVER would never be seen: it goes right on the badge, in amber:

```js
    //  A query's answer:   ANSWER  ·  12 rows  ·  from sales  ·  8 ms
    //  (fixed something?   ·  fixed 2 things    hover  ->  the question in words,  and what they were)
    //  A fix LEFT OUT a condition?   It's said right ON the badge,  in amber  (the menu is closed by now:  a hover isn't enough).
    fileBadge.classList.remove('warn');
    if (showingAnswer()) {
        const r = sqlInfo.result;
        fileBadge.textContent = 'ANSWER  ·  ' + r.rows.toLocaleString() + ' row' + (r.rows === 1 ? '' : 's') +
            (r.from ? '  ·  from ' + r.from : '') + '  ·  ' + formatTime(r.ms) +
            (r.skipped.length > 0 ? '  ·  skipped ' + r.skipped.join(',  ') + '  (it only reads)' : '') +
            (r.fixes.length > 0 ? '  ·  fixed ' + r.fixes.length + (r.fixes.length === 1 ? ' thing' : ' things') : '') +
            r.warnings.map(function (w) { return '  ·  ⚠ ' + w; }).join('');
        fileBadge.classList.toggle('warn', r.warnings.length > 0);
        fileBadge.title = [r.meaning].concat(r.fixes).filter(function (x) { return x; }).join('\n');
        fileBadge.hidden = false;
        return;
    }
```

**4.** The clothes. 2 new colors in each theme (Neo-Neutral, then Neo-Dark):

```css
    --warn:         #8a4b00;                        /*  amber:  a fix LEFT OUT a condition  (not red:  there IS an answer,  just a bigger one)  */
    --warn-dark:    #7a4500;                        /*  ...the answer's badge,  when it says so  */

    --menu-bg:      #f4f5f7;                        /*  an OPEN drop-down list:  solid  (glass behind a list is hard to read)  */
    --menu-text:    #1f2228;
    color-scheme:   light;                          /*  ...and the browser's own parts  (lists,  scrollbars)  drawn light  */
```

```css
    --warn:         #e8a33d;                        /*  amber,  bright enough for black  */
    --warn-dark:    #7a4500;

    --menu-bg:      #24262a;                        /*  an open drop-down list:  dark,  light words  */
    --menu-text:    #e3e5e9;
    color-scheme:   dark;
```

"Try:", right after `#queryClose`:

```css
/*  TRY:  ready questions about this file,  one press each.
    SQL-blue outlines:  "press me",  but quieter than the solid "Show answer".  */
#queryTry {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
}

#queryTry:empty {
    display: none;
}

.query-try-label {
    font-weight: 600;
    color: var(--text-soft);
}

.query-try {
    margin: 0;
    padding: 0 10px;
    line-height: 24px;
    font-size: 12px;
    color: var(--sql);
    background: transparent;
    border: 1px solid var(--sql);
    border-radius: 12px;
    box-shadow: none;
}

.query-try:hover,
.query-try:focus-visible {
    outline: none;
    color: #fff;
    background: var(--sql-dark);
    box-shadow: 0 0 10px var(--sql-glow);
}
```

The glow on Show and where, the "every column" pill, and the inviting "+ pick a column to search" list, right after `.query-pick`:

```css
/*  SHOW and WHERE:  where everybody starts.   A faint SQL-blue glow,  so the eye lands there first
    ("this shows every column",  "I can look for a word").  */
.query-row[data-part="show"] .query-pick,
.query-row[data-part="where"] .query-pick {
    box-shadow:
        inset 0 0 12px var(--inner-glow, rgba(255, 255, 255, 0.8)),
        inset 0 0 16px color-mix(in srgb, var(--sql-glow) 55%, transparent);
}

.query-row[data-part="show"] .query-label,
.query-row[data-part="where"] .query-label {
    color: var(--sql);
}

/*  "every column":  a solid pill,  not faint words  (it IS what you'll get)  */
.query-all {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    font-weight: 600;
    color: #fff;
    background: var(--sql-dark);
    border-radius: 7px;
    box-shadow: 0 0 8px var(--sql-glow);
}

/*  "+ pick a column to search ...":  an invitation,  not a quiet extra  (solid SQL-blue edge,  a soft glow)  */
#queryMenu .query-row[data-part="where"] select.query-add {
    font-weight: 600;
    color: var(--sql);
    border: 1px solid var(--sql);
    box-shadow: 0 0 8px var(--sql-glow);
}
```

The OPEN drop-down lists, right after `.query-limit`. Before, on some computers they came up white, and in Neo-Dark with white words: white on white.

```css
/*  THE OPEN LIST  (what drops down when you press a pick):  the theme's colors,  never the computer's own.
    (Before:  on some computers it came up white,  and in Neo-Dark its words were white too:  white on white.)
    1.  Every browser:  each choice gets the theme's solid colors  (--menu-bg,  --menu-text),
        and  color-scheme  (in each theme block)  tells the browser to draw the list itself light or dark.  */
#queryMenu option,
#queryMenu optgroup {
    color: var(--menu-text);
    background: var(--menu-bg);
}

/*  2.  A browser that lets a page dress its lists  (appearance: base-select:  Edge / Chrome 135 and later):
        the open list is a glass panel like the menu,  and the choice under the mouse is SQL blue.  */
@supports (appearance: base-select) {
    #queryMenu select,
    #queryMenu select::picker(select) {
        appearance: base-select;
    }
    #queryMenu select::picker(select) {
        max-height: 320px;
        padding: 4px;
        color: var(--menu-text);
        background: var(--menu-bg);
        border: 1px solid var(--glass-edge);
        border-radius: 10px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    }
    #queryMenu option {
        padding: 3px 10px;
        border-radius: 6px;
    }
    #queryMenu option:hover,
    #queryMenu option:focus-visible {
        outline: none;
        color: #fff;
        background: var(--sql-dark);
    }
    #queryMenu option:checked {
        font-weight: 600;
    }
    #queryMenu option::checkmark {
        display: none;
    }
}
```

The "+ at most" button, the `[and ▾]` word, picks as wide as their words, the meaning line and the amber, right after `.query-hint`:

```css
/*  "+ at most ...":  a button dressed like the "+" lists  (dashed and quiet:  "there's more,  if you want it")  */
.query-add-button {
    margin: 0;
    padding: 0 8px;
    height: 26px;
    line-height: 24px;
    font: inherit;
    color: var(--text-soft);
    background: transparent;
    border: 1px dashed var(--glass-edge);
    border-radius: 7px;
    box-shadow: none;
}

.query-add-button:hover,
.query-add-button:focus-visible {
    outline: none;
    color: var(--text);
    border-style: solid;
}

/*  The  [and ▾] / [or ▾]  in front of a condition:  a word of the sentence,  not a box  */
#queryMenu select.query-join {
    font-weight: 600;
    color: var(--sql);
    background: transparent;
    border-color: transparent;
}

/*  The sentence's picks are as wide as their words  (a short pick = a short box:  it reads like a sentence).
    (A browser without  field-sizing  keeps them as wide as their longest choice:  still works,  just roomier.)  */
@supports (field-sizing: content) {
    #queryMenu select {
        field-sizing: content;
    }
    #queryMenu .query-value:not(.query-limit) {
        field-sizing: content;
        width: auto;
        min-width: 90px;
        max-width: 240px;
    }
}

/*  "→ 4 rows  ·  Every row of class_data where ...":  what you'd get,  in plain words,  BEFORE you ask  */
#queryMeaning {
    margin: 0;
    padding: 6px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-soft);
    border-top: 1px solid var(--line-soft, rgba(255, 255, 255, 0.45));
}

#queryMeaning:empty {
    display: none;
}

#queryMeaning strong {
    color: var(--sql);
}

/*  A fix that LEFT OUT a condition:  amber  (not red:  there is an answer,  it just has rows you meant to keep out)  */
.query-warn {
    font-weight: 600;
    color: var(--warn);
}
```

And the badge, right after `#fileBadge`:

```css
/*  An answer a fix LEFT A CONDITION OUT of:  amber,  and the words wrap  (they have to be READ,  not cut off with "...")  */
#fileBadge.warn {
    white-space: pre-wrap;
    text-overflow: clip;
    background: var(--warn-dark);
    text-shadow: none;
}
```

| Code | Baby words |
|---|---|
| `--warn` amber, not red | Red = it didn't work. Amber = it worked, but read this. |
| `white-space: pre-wrap` on the amber badge | The badge normally cuts long words off with "...". A warning has to be READ. |
| `color-scheme` + `--menu-bg` / `--menu-text` | Every browser: the list's choices get the theme's solid colors, and the browser draws its own parts (the list, scrollbars) light or dark to match. |
| `appearance: base-select` | Newer Edge / Chrome let a page dress the open list itself: a panel like the menu, the choice under the mouse in SQL blue. Older ones skip it (`@supports`) and still get the colors. |
| `field-sizing: content` | A pick is as wide as its words ("is", not a box as wide as "is or comes before"), so the line reads like a sentence. A browser without it keeps them as wide as their longest choice. |

<br>

### Step 12.16: No dead ends (and "any column")

A real person, on a subscriptions file: Show **Subscription Date**, sorted by Subscription Date, newest first, Show answer. One column. "Oops, I want everything back." And they couldn't: the only way out was to rewrite the SQL by hand.

What went wrong: they had clicked in the SQL box, just to look at it. ONE click in that box turned on "Write it myself", and the whole sentence went faint and stopped taking clicks (`pointer-events: none`). The way back was the little "Write it myself" tick box, and nothing said so. A dead end: the screen shows you the buttons, and they don't work.

So this step goes looking for every place like that, and closes it:

| Dead end | Before | Now |
|---|---|---|
| Clicked the SQL box to look, or to copy | the sentence froze | only TYPING turns "Write it myself" on |
| Wrote your own SQL, want the sentence back | find the tick box | click the sentence itself: "↩ Click to go back to the sentence" (or Tab to it + Enter) |
| Picked some columns, want them all back | × each chip, one by one | "+ column ▾" → **↺ every column** (its first choice) |
| Counted or totalled, want the rows back | × every total AND every "for each" | "+ and ... ▾" → **↺ every column** |
| × the "for each" | stuck on ONE row: its "how many rows" was left behind | the "how many rows" that came with it goes too |
| A new condition, nothing typed yet | `contains ''` quietly dropped every row with an EMPTY cell there | left out until you type something |
| Your SQL said `City LIKE 'chicago'` | read back as `City = 'chicago'`: 0 rows | **is (any capitals)**, still a LIKE: the same 3 rows |

And the idea that came with it: **any column**. Mom doesn't know "Chicago" is in a column called City. She knows it's in there somewhere.

```text
   where     [any column ▾] [contains ▾] [chi]  ×
   → 3 rows  ·  Every row of subscribers where any column contains 'chi'
```

**1.** Typing turns "Write it myself" on, and clicking the sentence turns it off. Replace `setTypeMode` and the SQL box's `pointerdown` / `input` listeners:

```js
function setTypeMode(on) {
    typeMode = on;
    queryType.checked = on;
    pauseSentence(on);
    queryNote.textContent = on ? 'you\'re writing it  ·  click the sentence to go back to it' : 'writes itself as you pick';
    askFirst(null);
    showMeaning();
}

//  While you write:  the sentence FADES,  and the whole of it is ONE button  ("Click to go back to the sentence").
//  Its picks can't be clicked or tabbed to  (inert:  a pick changed now would be thrown away when your SQL is read back).
//  Click it  (or Tab to it + Enter)  ->  your SQL snaps back into it,  like unticking "Write it myself".
//  (It was a dead end:  ONE click in the SQL box,  just to look,  froze every pick,
//   and the only way out was the little tick box.   Now looking doesn't freeze anything,  and the way back is the sentence itself.)
function pauseSentence(on) {
    queryBuilder.classList.toggle('paused', on);
    Array.from(queryBuilder.children).forEach(function (row) { row.inert = on; });
    if (on) {
        queryBuilder.tabIndex = 0;
        queryBuilder.setAttribute('role', 'button');
        queryBuilder.setAttribute('aria-label', 'Go back to the sentence  (your SQL is read back into it)');
        queryBuilder.title = 'Click to go back to the sentence';
    } else {
        queryBuilder.removeAttribute('tabindex');
        queryBuilder.removeAttribute('role');
        queryBuilder.removeAttribute('aria-label');
        queryBuilder.removeAttribute('title');
    }
}
queryBuilder.addEventListener('click', function () { if (typeMode) leaveTypeMode(); });
queryBuilder.addEventListener('keydown', function (e) {
    if (typeMode && e.target === queryBuilder && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        focusNext = 'add:where';                        //  (the keyboard lands IN the sentence,  not nowhere)
        leaveTypeMode();
        if (typeMode) focusNext = null;                 //  (it asked first:  the keyboard is on its question)
    }
});

//  TYPE in the box  ->  "Write it myself" turns on.   (Just clicking in it,  to look or to copy,  changes nothing.)
querySql.addEventListener('input', function () {
    if (!typeMode) setTypeMode(true);
    showFixes([], []);                                  //  (the fixes were for the SQL before you changed it)
    showMeaning();                                      //  (what it says now,  in words)
});
queryFlex.addEventListener('change', showMeaning);
```

| Code | Baby words |
|---|---|
| no `pointerdown` listener | Clicking in a box is how people LOOK at it (and select it, to copy it). It isn't writing. |
| `row.inert = on` | The faded picks can't be clicked OR tabbed to. (A pick changed now would be thrown away when your SQL is read back in.) |
| `role = 'button'`, `tabIndex = 0` | The sentence itself is the button back: for the mouse, and the keyboard too. |
| `leaveTypeMode()` | The same as unticking the box: your SQL snaps back into the sentence. A part the sentence can't show (a JOIN)? It asks first. |

**2.** The clothes. Replace the `#queryBuilder.paused` rule:

```css
/*  WRITE IT MYSELF  (you're writing your own SQL):  the sentence's picks fade and can't be clicked,
    and the sentence ITSELF is the button back   ("Click to go back to the sentence",  in the middle).  */
#queryBuilder.paused {
    position: relative;
    cursor: pointer;
    border-radius: 10px;
}

#queryBuilder.paused > .query-row {
    opacity: 0.4;
    pointer-events: none;
}

#queryBuilder.paused::after {
    content: "↩  Click to go back to the sentence";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 6px 14px;
    max-width: 90%;
    font-weight: 600;
    text-align: center;
    color: #fff;
    background: var(--sql-dark);
    border-radius: 8px;
    box-shadow: 0 0 10px var(--sql-glow);
    pointer-events: none;
}

#queryBuilder.paused:hover::after,
#queryBuilder.paused:focus-visible::after {
    background: var(--sql);
}

#queryBuilder.paused:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 1px var(--glow-edge, rgba(255, 255, 255, 0.95)), 0 0 10px 1px var(--glow, rgba(255, 255, 255, 0.9));
}
```

> The picks are faded and `pointer-events: none`, so every click lands on the sentence behind them. The words in the middle are a `::after`: nothing in the page has to make them.

**3.** The new picks (their constants are in Step 12.10's code, under `FILTER_WORDS`):

| Code | Baby words |
|---|---|
| `EVERY_COLUMN`, `ANY_COLUMN` | They aren't columns, so their values start with a NUL (character 0). A column name can't have one, so a column CALLED "any column" is still just a column. |
| `ANY_COLUMN_MAX` (100) | "any column" is one test per column. A 10,000-column file would write 10,000 lines of SQL, and check them all on every row. |
| `FILTER_WORDS.any` | Word tests only: contains, starts with, ends with, is (any capitals). "is over 90" across Name AND Score means nothing. |
| `'anycase'` | "is (any capitals)" = `LIKE` with no `%`. It's on the words list, and it's what a `LIKE 'chicago'` you wrote reads back as. |

**4.** `builderSql` writes "any column" as one `LIKE` per column, joined by `OR`, in `( )`. And a condition with nothing in it yet is left out. Replace its WHERE part:

```js
    //  WHERE   (a condition with nothing typed in it yet is left out:  it's not finished.
    //           "contains ''" would quietly drop every row with an EMPTY cell there,  before you've typed a letter.)
    const tests = build.filters.filter(function (f) { return f.op === 'empty' || f.op === 'filled' || f.value !== ''; }).map(function (f) {
        if (f.col === ANY_COLUMN) {                                 //  any column:  one test per column,  OR'd,  in ( )
            const like = f.op === 'starts' ? likeOf(f.value, '', '%') : f.op === 'ends' ? likeOf(f.value, '%', '')
                       : f.op === 'anycase' ? likeOf(f.value, '', '') : likeOf(f.value, '%', '%');
            return '(' + columns.map(function (col) { return sqlName(col) + ' ' + like; }).join('\n      OR ') + ')';
        }
        const c = sqlName(f.col);
        switch (f.op) {
            case 'empty':    return c + ' IS NULL';
            case 'filled':   return c + ' IS NOT NULL';
            case 'contains': return c + ' ' + likeOf(f.value, '%', '%');
            case 'starts':   return c + ' ' + likeOf(f.value, '', '%');
            case 'ends':     return c + ' ' + likeOf(f.value, '%', '');
            case 'anycase':  return c + ' ' + likeOf(f.value, '', '');
            default:         return c + ' ' + f.op + ' ' + sqlValueOf(f.value, kindOf(f.col));
        }
    });
    if (tests.length > 0) lines.push('WHERE ' + tests.join(build.any ? '\n   OR ' : '\n  AND '));
```

```sql
SELECT *
FROM subscribers
WHERE (Name LIKE '%chi%'
      OR Plan LIKE '%chi%'
      OR "Monthly Fee" LIKE '%chi%'
      OR "Subscription Date" LIKE '%chi%'
      OR City LIKE '%chi%')
```

> The `( )` matter: `(... OR ...) AND Plan = 'Family'`. Without them AND goes first, and it means something else.

**5.** Reading it back (`buildFromSql`, from Part 10). Ask it, or click back from "Write it myself", and that SQL has to come back as ONE "any column" pick, not 5 conditions. Replace from the start of its WHERE part down to the first rule of `filtersOf`:

```js
    function flat(node, kind, out) {
        if (node.t === kind) { flat(node.a, kind, out); flat(node.b, kind, out); } else out.push(node);
        return out;
    }
    if (c.where !== null) {
        const any = c.where.t === 'or';
        let parts = flat(c.where, any ? 'or' : 'and', []);
        const oneIn = parts.length === 1 && parts[0].t === 'in' && !parts[0].not;           //  status IN ('a', 'b')   =   status is 'a'  OR  'b'
        parts.forEach(function (p) {
            const found = filtersOf(p, any || oneIn);
            if (found === null) left.push('the condition  ' + sqlWordsFor(p));
            else found.forEach(function (f) { b.filters.push(f); });
        });
        if (any) b.filters = anyColumnRuns(b.filters);              //  (all OR:  its ( ) are gone,  so find "any column" by its run of tests)
        b.filters.forEach(function (f) { delete f.like; });
        b.any = (any || oneIn) && b.filters.length > 1;
    }

    //  "Any column",  read back:   (Name LIKE '%jo%' OR City LIKE '%jo%' OR ...)   ->   [any column] [contains] [jo]
    //  Only when it's EVERY column,  in order,  the same LIKE each time   (so it says exactly what the builder would write).
    function anyColumnRuns(list) {
        const out = [];
        const n = columns.length;
        for (let i = 0; i < list.length; i++) {
            const run = n >= 2 && n <= ANY_COLUMN_MAX ? list.slice(i, i + n) : [];
            const same = run.length === n && run.every(function (f, k) {
                return f.like && f.col === columns[k] && f.op === run[0].op && f.value === run[0].value;
            });
            if (same) { out.push({ col: ANY_COLUMN, op: run[0].op, value: run[0].value }); i += n - 1; }
            else out.push(list[i]);
        }
        return out;
    }

    //  A LIKE  ->  contains / starts with / ends with / is   (only a  %  at the start and/or the end can be shown)
    function likeFilter(p) {
        const col = columnOf(p.e), pattern = valueOf(p.pat);
        const escape = p.esc === null ? null : valueOf(p.esc);
        if (col === null || pattern === null) return null;
        let word = '', first = false, last = false;
        for (let k = 0; k < pattern.length; k++) {
            const ch = pattern[k];
            if (escape !== null && ch === escape && k + 1 < pattern.length) { word += pattern[++k]; continue; }
            if (ch === '_') return null;
            if (ch === '%') {
                if (k === 0) first = true;
                else if (k === pattern.length - 1) last = true;
                else return null;
                continue;
            }
            word += ch;
        }
        const op = first && last ? 'contains' : last ? 'starts' : first ? 'ends' : 'anycase';
        return { col: col, op: op, value: word, like: true };
    }

    function filtersOf(p, anyMode) {
        if (p.t === 'or' && !anyMode) {                             //  ( ... OR ... )  inside AND:  "any column"?
            const found = anyColumnRuns(flat(p, 'or', []).map(function (x) { return x.t === 'like' && !x.not ? likeFilter(x) : null; })
                                                           .map(function (f) { return f || {}; }));
            return found.length === 1 && found[0].col === ANY_COLUMN ? found : null;
        }
```

and its LIKE rule:

```js
        if (p.t === 'like' && !p.not) {
            const f = likeFilter(p);
            return f === null ? null : [f];
        }
```

| Code | Baby words |
|---|---|
| `anyColumnRuns` | EVERY column, in order, the same LIKE each time → one "any column". Two of the five columns? That's two conditions, shown as two. |
| `if (any) b.filters = anyColumnRuns(...)` | Everything joined by OR: the `( )` are gone (SQL doesn't need them there), so it goes by the run of tests instead. |
| `like: true` | Only LIKE tests count. `Name = 'x' OR City = 'x'` wants exact capitals: it stays what it is. |

**6.** The words: "where any column contains 'chi'", not five "or"s. Step 12.7's `wordsOfCond` already has it (`likeHow` and `anyColumnWords` are in that code, right under it). It's the same rule: every column of the table once, the same LIKE.

> **How do you know there are no more dead ends?** `realfile-deadends` has a RANDOM CLICKER: 2,400 random picks, ×'s, typing, asking, "Try:" presses and SQL, in random order (seeded, so a failure can be replayed). After EVERY step it checks: every pick on screen can really be clicked (`elementFromPoint`, the same test a real mouse does), "every column" is one pick away, the SQL runs, "→ N rows" = the answer's rows, and the SQL reads back into the same sentence. With the old freeze put back on purpose (`?mutate`), it fails within the first few steps of every run. So it really is looking.

<br>

### ✅ Test it

The test tables: `small-files/beginner/class_data.csv` (a class gradebook) and `small-files/query/`.

1. **Node:** `node tools/query-test/beginner.js` → **135 passed, 0 failed** (typed fixes, warnings, more than one question, safety, 44 plain-word questions, the words back, the starter questions, hostile column names, and the words back on all 3,236 questions in `cases.sql` + the fuzzer's file without ever throwing). `run.js --flex` and `fuzz.js --flex`: exactly the same as before this part (a correct query is never changed). `sloppy.js`: 67 passed.
2. **The page:** `sh tools/run-tests.sh realfile-ask` → **58 passed** (everything below, by itself, in both themes). `realfile-deadends` → **51 passed** (the dead ends of Step 12.16, "any column", and the random clicker). `realfile-query`, `realfile-flex`, `realfile-lazylist`, `realfile-money`, `realfile-theme` still pass, on the new menu.
3. Open `class_data.csv`. The button says **Ask**. Press it: **Show [every column]**, **where [+ pick a column to search]** (both glowing a little), one line of "+" lists, and "→ 10 rows · Every row of class_data".
4. A moment later, **Try:** How many for each Grade Level · Average Score for each Grade Level · Top 5 by Score · Rows where Grade Level is 10. Press **Top 5 by Score**: 5 rows. Hover the badge: the question in words.
5. Pick a column to search: **Student Name**. It says **contains**, and you're typing in its value box. Type `jo`: "→ 2 rows" (José, Carter Jones). Switch to **Score**, **is over**, `90`: "→ 4 rows". Press **Enter**: 4 rows.
6. **+ sorted by ... Letter Grade**: the way says **A to Z / Z to A**. Switch it to Score: **lowest first / highest first**. Open any list: it looks like the menu (in Neo-Dark too: light words on dark, never white on white).
7. In the SQL box, type `show me the A students`, Enter: 2 rows, and the box shows the SQL it was read as.
8. `how many of us failed`: **Did you mean: How many rows in class_data? (I didn't use: failed) [Ask that] [Keep writing]**. Nothing runs until you press Ask that.
9. In the SQL box: `select * from class_data where score >`, Enter. All 10 rows, and the badge says, in amber: **⚠ NOT filtered by where score >**.
10. `select * from class_data where score between 90-100`: 4 rows. `... "student name" = 'Liam O'Brien'`: 1 row. `DROP TABLE class_data`: refused, exactly as before.
11. **No dead ends:** Show **Score** (+ column), sorted by Score, Show answer, open Ask again. Click in the SQL box: nothing freezes. **+ column → ↺ every column**: all the columns are back, still sorted. Type in the SQL box: the sentence fades, and says **↩ Click to go back to the sentence**. Click it: your SQL is the sentence again.
12. **Any column:** where **any column**, contains `jo`: "→ 2 rows" (José, Carter Jones), and the words say "where any column contains 'jo'". Type `9`: every row with a 9 in ANY cell.

<br>

---

<br>
## Change stuff yourself

| I want to... | Do this |
|---|---|
| **Stop the floating** | Delete `animation: float 6s steps(3) infinite;` in `#output` |
| **Make the float glide (smoother, but costs more)** | Change `steps(3)` to `linear`. More steps (like `steps(6)`) = smoother AND more work. |
| **Show 20 rows instead of 15** | Change **BOTH**: `WINDOW_SIZE = 15` → `20` (brain) AND `calc(16 * 30px)` → `calc(21 * 30px)` (clothes). Remember the +1 for the header! |
| **Make the wheel move more/fewer rows** | The wheel moves 1 row per 30 pixels of spin. Most mice spin 100 per click (≈ 3 rows). To change it, multiply `pixels` in the wheel listener, like `e.deltaY * 2` |
| **Make the wheel glide snappier or floatier** | Change `GLIDE`. `0.4` = snappier, `0.15` = floatier. Keep it between `0.1` and `0.5`. |
| **Make drag mode faster (or slower)** | `DRAG_TOP_DOWN` (up and down) and `DRAG_TOP_SIDE` (sideways), in pixels a second. Going much past `9000` down or `4000` sideways can outrun the treadmill on wide files. |
| **Make drag mode reach top speed sooner** | Lower `DRAG_FULL_AT` (how far from the anchor = top speed). |
| **Give your hand more (or less) resting room** | `DRAG_DEAD_ZONE`: the pixels around the anchor where nothing moves. |
| **Move Drag mode to the end of the row** | Move the `<button id="dragBtn">` to the end of `#controls`, and flip its `margin` to `0 0 0 28px` (the gap on its left). |
| **Make the spreadsheet look wider (or narrower)** | Change BOTH: `EXCEL_WINDOW` (brain) and `#output.excel` → `max-width` (clothes). Keep them the same number. |
| **Make the empty columns wider** | `EMPTY_COLUMN` (100 = about 11 letters). |
| **Make the flip slower (or faster)** | `#output.flip-away` → `0.2s` and `#output.flip-back` → `0.36s`. Keep the turn-away the shorter one. |
| **Open Excel files in the CSV look, too** | In "ALL DONE", change `excelLook = excel !== null \|\| sql !== null;` to `excelLook = sql !== null;` (or to `false`, for SQL dumps too). |
| **Change the SQL blue** | `--sql` (the table look's lines and the PK badge), `--sql-dark` and `--sql-glow` (the Table View button), in each theme block. |
| **Open SQL dumps in the CSV look, too** | In "ALL DONE", change `excelLook = excel !== null \|\| sql !== null;` to `excelLook = excel !== null;`. |
| **Give long SQL types more (or less) room** | In "ALL DONE", the `0.8` (room per letter of the type) and the `4` (room for the PK badge). |
| **Let the builder show more totals** | Add a line to `TOTAL_FNS` (and its words to `TOTAL_WORDS`): like `['stddev', 'STDDEV', 'spread']`. Any total in `QUERY_TOTALS` (`queryI.js`) works. |
| **Add a function to the engine** | Add a line to `QUERY_FUNCTIONS` in `queryI.js`: `{ args: [fewest, most], ty: 'text', f: function (x) { ... } }`. NULLs going in give NULL out, unless you add `keep: true`. |
| **Look at more rows when guessing column types** | `SAMPLE_ROWS` in `queryI.js` (20,000). More = slower to start, a little surer. |
| **Make the query menu wider** | `#queryMenu` -> `width: max(100%, 680px)`: change the `680px`. |
| **Keep the query menu open after Run** | In `showAnswer`, delete `closeQueryMenu();`. (The answer is under the menu then: close it to see.) |
| **Start with Query Flexibility OFF** | In `testI.html`, take `checked` off `<input type="checkbox" id="queryFlex" checked>`. |
| **Let Query Flexibility fix more (or fewer) times in a row** | `FLEX_ROUNDS` in `queryI.js` (10). |
| **Teach it another word for SELECT** | Add it to `FLEX_SELECT` in `queryI.js`: like `'GIVE'`. |
| **Let it fix a typo in another word** | Add the word to `FLEX_CLAUSES` (like `'OFFSET'`). Short words are risky: `OR` is 1 letter from lots of things. |
| **Teach plain words a new word** | Add it to `WORDS_KNOWN` in `queryI.js`, with what it means: like `['beyond', '>']` or `['per each', 'each']`. A word that should just be skipped goes in `WORDS_FILLER`. |
| **Let plain words look at more of the file** | `PROFILE_ROWS` (20,000 rows) and `PROFILE_COLUMNS` (the first 60 columns) in `queryI.js`. More = surer, a little slower the first time. |
| **Let a "pick one" column keep more values** | `PROFILE_VALUES` (500). A column with more different values than that (names, notes) isn't kept: use "contains" for those. |
| **Change what counts as a group** (the "for each" columns the menu suggests) | In `profileRoles`: `size >= 2 && size <= 12`. |
| **Stop a left-out condition from being a warning** | Take its word out of `FLEX_WIDENS`. (Not a good idea: that's exactly the "looks fine, isn't" answer.) |
| **Change the Ask button's word** | In `testI.html`: `...disabled>Ask</button>`. (The menu's title follows it in `queryFileChanged`.) |
| **Count "→ 4 rows" sooner (or later) after a pick** | `PREVIEW_WAIT` in `scriptI.js` (250 ms). Smaller = it counts while you're still picking. |
| **Count "→ 4 rows" on bigger files too** | `PREVIEW_MAX_ROWS` (2,000,000). Every pick then re-counts the whole file: fine on a fast computer, busy on a slow one. |
| **Make Enter a new line again** (and Ctrl + Enter ask) | In `isAskEnter`, add `&& (e.ctrlKey \|\| e.metaKey)` before the `;`. |
| **Show more (or fewer) "Try:" questions** | `tableStarters` in `queryI.js`: the `out.slice(0, 4)` at its end, and the `out.length < 4` checks. |
| **Change the amber** | `--warn` (the words) and `--warn-dark` (the answer's badge), in each theme block. |
| **Stop "+ for each" from adding "how many rows"** | In `drawBuilder`, the "+ for each" list: delete the `if (build.totals.length === 0) build.totals.push(...)` line. |
| **Offer "any column" on wider files** | `ANY_COLUMN_MAX` (100) in `scriptI.js`. It writes one `LIKE` per column, so a 500-column file means 500 lines of SQL, checked on every row. |
| **Make clicking in the SQL box turn on "Write it myself" again** | Don't: that was the dead end of Step 12.16 (one click to look froze every pick). Typing turns it on; that's enough. |
| **Make the "expand?" tag show up sooner (or later)** | `TAG_WAIT` in `scriptI.js` (600 ms). |
| **Change the tag's words** | In `testI.html`: `<div id="cellTag" ...>expand?</div>`. |
| **A different color for the ticked checkbox** | `.query-option input:checked` -> `background:` and `border-color:` (it's `var(--sql)`, SQL blue). |
| **Read another money sign as money** (like ₹ or ₩) | Add it to `[$€£¥]` in `CELL_LOOK` (`queryI.js`). |
| **Show averages of money with more (or fewer) cents** | In `answerLooks`: `Math.max(L.places, 2)`. |
| **Look at more (or fewer) cells when guessing a WIDE file's column types** | `SAMPLE_CELLS` in `queryI.js` (4,000,000). More = surer, slower: 10,000 columns x 20,000 rows took 7 s. |
| **Make the query menu's lists fill only when opened at a different size** | `LAZY_LIST` in `scriptI.js` (200 choices). |
| **Cut in two steps sooner (or later)** | In `tableSource`: `upTo - preUpTo > 16`. |
| **Change the button colors** | `#viewBtn` → `background` (`#185c37`, the green) and `#viewBtn.to-csv` → `background` (`#020202`, the black). |
| **Build more/fewer extra rows** | Change `EXTRA_ROWS`. More = safer for super-fast scrolling, but a little more work per scroll. |
| **Make the glow stronger** | In `.cell:hover`, raise `14px 2px` to something like `20px 6px` |
| **Let columns get wider** | In `setColumnWidths`, change the `40` |
| **Change the page color** | In the Neo-Neutral block at the top of the clothes, change `--page` |
| **Make the glass greyer or clearer** | Change `--glass-top` and `--glass-bottom`. A bigger last number = more solid. |
| **Make Neo-Dark's glass bend more (or less)** | In `testI.html`'s `#glassWarp`: `scale="30"` = how far it pushes (bigger = wavier), `baseFrequency` = how close together the waves are (smaller = wider, softer waves). |
| **Make the Neo-Dark window bend too** | Add `[data-theme="neo-dark"] #output,` to the bending-glass rule. Careful: it only has the flat page behind it (nothing to see), and it costs about 4x the browser's drawing while you scroll. |
| **Make Neo-Dark lighter or darker** | Its `--page` (the background), `--square-light` and `--control-accent` (the panels and buttons). |
| **Add a new theme** | Copy the whole `[data-theme="neo-neutral"]` block, change the name (like `"midnight"`) and the colors. Then add one line to `THEMES` in the brain with the same `id`. It shows up in the menu by itself. |
| **Move the theme chip** | `#themeChip` → `top` and `left`. Change `#themeMenu`'s `top` and `left` to the same numbers, so the menu still grows out of it. |
| **Make the theme menu unfold slower (or faster)** | `#themeMenu` → the `0.42s` (growing) and the `0.26s` wait on `::after` (the cover fading). Change both together, about the same amount. |
| **Make "Ready" pulse slower (or faster)** | `.scope-hint.ready` → the `2.4s`. Bigger = calmer. |
| **Show more columns in the Details panel** | Change `ROW_LIMIT`. Every listed column is 2 boxes, so keep it in the hundreds. |
| **Make the Details panel taller** | `#aimRow` → `max-height` (the whole panel) and `#aimFocus` → `max-height` (the focus card). |
| **Make the focus card's words bigger** | `#aimFocusText` → `font-size` (and raise `line-height` with it, about 1.6×). |
| **Stop the Details button from pulsing** | Delete the `animation: tell-more ...` line in `#aimRowBtn.more`. It still turns dark when the target is cut off. |
| **Change the search color** | `mark` → `background` |
| **Change the flash color** | `@keyframes flash` → the `rgba(...)` |
| **Make the loader show up sooner (or later)** | Change `LOADER_DELAY`. `0` = it shows up for every file, even tiny ones (not recommended, it'll flash). |
| **Make the cloud blurrier** | In `#loader.show`, raise `blur(8px)` to something like `blur(14px)` |
| **Make the pie bigger** | In `#loaderPie`, change both `64px` |
| **Build more/fewer extra columns** | Change `EXTRA_COLUMNS`. More = safer for fast sideways scrolling, but every row gets a little heavier. |
| **Change when the scrollbars get "scaled"** | Change `MAX_SCROLL_WIDTH` (sideways) or `MAX_SCROLL_HEIGHT` (up and down). Keep them under about 4,000,000: browsers stop drawing text past ~8 million pixels, and on sharp 2× screens that limit comes twice as soon. |
| **Change the buttons' accent color** | Change `--control-accent` in the theme block. `var(--corner-bg)` = the table's corner. Try `var(--square-dark)` for near-black buttons like the theme menu (then also set `color: #fff` in `button`). |
| **Move Expand closer (or further)** | `#expandBtn` → the `28px` in `margin`. |
| **Make the "Reading from..." dots faster or slower** | Change all 3 `2s` in the `.dots span` rules (keep them the same). Smaller = faster. |
| **Make the scope's cells wider** | `#aimScope` → the `92px` in `grid-template-columns`. |
| **Make the lock-on pulse longer** | `.cell.locked` → the `1.1s`. |
| **Let searching snap the sheet right away** (without pressing ▶) | At the end of `aimReset`, after `aimOn(0, 0);`, add `snapToTarget();`. (Careful: the sheet will jump while you type.) |
| **Let bigger Excel files unpack** | `XLSX_LIMIT` in `xlsxI.js`. Careful: past ~512 MB the browser can't hold the text anyway, and this limit is what stops "zip bombs". |
| **Show Excel dates another way** | `excelDateText` in `xlsxI.js` builds `year-month-day`. Change the order there (like `day/month/year`). The originals are kept either way. |
| **Show more (or less) of a huge cell** | Change `SHOW_LETTERS`. Keep it in the thousands: every letter you show costs the browser work, on every row. |
| **Change when a stray quote gets caught** | Change `QUOTE_LIMIT`. Smaller = gives up sooner. Don't go below a few thousand, or real notes with line breaks get chopped. |
| **Make the page even smoother during big loads** | Lower `CHUNK_TIME` (like `8`). Smaller bites = smoother, but the whole job takes a little longer. |

> ⚠️ The row count lives in 2 places. Change one, change the other (and remember the header counts as 1 more).

<br>

## Stuck? Check these first

| Problem | Probably... |
|---|---|
| Nothing happens when you pick a file | A name tag doesn't match. Check every `id` in the skeleton vs. every `getElementById` in the brain. |
| The page looks totally plain | The `<link>` to `styleI.css` is missing or misspelled. |
| Nothing works at all | The `<script>` tag isn't at the bottom of `<body>`, or there's a typo in the brain. Press **F12** → **Console** tab to see the error in red. |
| Everything is squished together | The `.line` rule is missing, or `--columns` is misspelled. |
| Header columns don't line up with the rows | `font-weight: 600` is on `.header-row` instead of `.header-row .cell`. |
| Blank gaps while scrolling | `buildVisibleRows` isn't being called in the `scroll` listener, or the spacers weren't added in `render`. |
| Scrolling yanks you back somewhere | A leftover `scroll-snap-type` rule in the CSS. The brain does the snapping now. Delete it. |
| The wheel feels stiff / stutters on every row | The wheel listener is calling `scrollTo(...)` on every spin instead of just moving `wheelTarget` and letting `glideStep` follow it. |
| The wheel glide is too fast on a 120 Hz / 144 Hz screen | `glideStep` is still `glideSpot += gap * GLIDE;`. It has to use the time that `passed` (Step 2.20). |
| The glide jumps or never moves | `glideStep(t)` is missing the `t`, or `glideLast = 0;` is missing from one of the 3 "stop" spots (so the next glide thinks a huge pause happened). |
| Drag mode does nothing | The button isn't on (`dragOn`), or the `pointerdown` listener is on the wrong piece: it has to be `outputBox`. |
| Drag mode: the anchor shows in a corner, not where you pressed | `#dragAnchor` is missing `position: fixed;`, or the brain sets `left`/`top` without `+ 'px'`. |
| Drag mode creeps, even with the pointer on the anchor | `dragSpeed` is missing the `if (past <= 0) return 0;` dead zone. |
| Drag mode fights you, snapping back to rows mid-drag | `snapToRow` is missing `if (dragging) return;` at the top. |
| Drag mode barely moves on a slow drag | The brain is reading the spot back from the scrollbar every step, instead of keeping its own `dragX` / `dragY` (the scrollbar drops the fractions). |
| On a phone, dragging scrolls the PAGE instead of the sheet | `#output.drag` is missing `touch-action: none;`. |
| The flip happens, but nothing changes | `switchLook` is missing `layoutColumns();` or `updateColumns(true);` (without `true`, the built columns look "fine" and nothing is rebuilt). |
| The window flips away and never comes back | The first `animationend` listener is missing `classList.replace('flip-away', 'flip-back')`, or `@keyframes flip-back` is misspelled. |
| Flipping sometimes switches twice | The `animationend` listeners are missing `if (e.target !== outputBox) return;`: a cell's snap pulse ending counted as the flip ending. |
| After flipping, you're one row lower | `switchLook` is missing the `readViewY()` / `setViewY(y)` pair ("scroll anchoring" nudged you). |
| The letters don't line up with the columns | The letters row isn't a `cloneNode(true)` of the names row, or `drawHeader` builds it before the names row. |
| The spreadsheet look has a sideways scrollbar on a small file | `layoutColumns` doesn't give the LAST empty column the leftover room (`room - EMPTY_COLUMN * (empty - 1)`), or `EXCEL_WINDOW` doesn't match `#output.excel`'s `max-width`. |
| Clicking another sheet tab jumps back to the spreadsheet look | "ALL DONE" is missing the `if (sheet === null)` in front of `excelLook = ...`. |
| Go to row lands 1 row off in the spreadsheet look | `jumpToLine` is missing `- rowShift()`. |
| Stripes jump around while scrolling | The CSS still uses `.line:nth-child(even)` instead of `.line.zebra`. |
| The window isn't header + 15 rows | The numbers don't match in both places, or the row height isn't 30. |
| Picking a file does nothing, and the Console says `startLoading is not defined` | Step 2.14 (the loader) is missing from the brain. |
| Picking an Excel file does nothing, and the Console says `readXlsx is not defined` | `xlsxI.js` isn't plugged in, or it's AFTER `scriptI.js`. It has to come first (Step 5.1). |
| Picking a `.sql` file does nothing, and the Console says `readSql is not defined` | `sqlI.js` isn't plugged in, or it's AFTER `scriptI.js`. It has to come first (Step 9.1). |
| The page won't load at all, and the Console says `sqlInfo has already been declared` | The `let sqlInfo = null;` from Part 8's "Building in order?" note is still in the brain. Now `sqlI.js` has it: take it out of the brain. |
| A SQL dump opens, but there's no PK badge | The key was set later, with `ALTER TABLE ... PRIMARY KEY` (PostgreSQL does this). `alterCommand` has to be in the main loop. Or the `.types-row .cell.pk::before` rule is missing. |
| Empty cells and NULL cells look the same | `makeRow` is missing the `sqlIsNull` line, or the `#output.sqltable .cell.null::before` rule is. (In the CSV look they're SUPPOSED to look the same: CSV has no NULL.) |
| MySQL words show `\n` or `\'` instead of a line break or a quote | `readString` isn't being told `backslashes` for MySQL, so the backslashes are kept as letters. |
| A dump says "there are no tables in it", but it has some | Its tables are only made by `INSERT ... SELECT` (rows copied from another table). There are no rows written IN the file to show. |
| The Query button stays greyed out | `queryFileChanged()` is missing from "ALL DONE" (Step 10.14), or `queryI.js` isn't plugged in BEFORE the brain. |
| The page says `runQuery is not defined` | `queryI.js` isn't plugged in, or it's after `scriptI.js` (Step 10.1). |
| Excel files open with the wrong words after adding the engine | Two files have a function with the SAME name (they all share one page). The last one loaded wins, and breaks the other. Every name in `queryI.js` must be new. |
| Clicking a chip's `×` closes the whole query menu | The "clicked outside?" check uses `contains(event.target)`. The `×` is already gone (the builder was redrawn): use `event.composedPath()` (Step 10.15). |
| Every condition's value gets quotes, even numbers | `sqlValueOf` gets no column type: check `queryKinds()` and `columnKinds` (Step 10.9). |
| `7 / 2` gives `3` | That's right! Two whole numbers give a whole answer (like SQLite, SQL Server and PostgreSQL). Write `7.0 / 2` for `3.5`. |
| A query on a big file freezes the page | A loop in the engine doesn't `yield` (pause). Every loop over all the rows needs one every few thousand rows. |
| A query on a WIDE file (thousands of columns) freezes the page for seconds | The loop pauses by ROWS only. It needs `|| work >= BITE_CELLS` too, so it also pauses by cells (Step 10.9). |
| The tab crashes ("Aw, Snap" / "Out of memory") after `SELECT *` on a big file | `showAnswer` glues each line with `line += cell` instead of `cells.join(',')`. The `+=` pieces stay alive until the end: about 10× the file's size. |
| Memory stays high after "← Back to file" | `backToFile` is missing `answer = null;`. The old answer (as big as a file) is still kept. |
| "← Back to file" shows the answer again | `backToFile` has to swap in `fileTable.table` (the file), not `answer.table`. |
| Query Flexibility never fixes anything | `runTheQuery` isn't passing `queryFlex.checked` as `runQuery`'s 5th thing, or `queryFail` lost its `why` (Step 11.2): no `why`, no fix. |
| A fix goes round and round, and the query never runs | `runQuery` is missing `better === sql`. A "fix" that changes nothing has to stop the fixing. |
| `select * orders` becomes `select * ORDER` | In `flexFix`, the typo rule comes BEFORE "a table's name with no FROM". `orders` is 1 letter from `ORDER`: the table rule has to go first. |
| `from orders wher qty > 5` isn't fixed | The "word BEFORE was a typo" rule is missing: SQL reads `orders wher` as "orders, nicknamed wher", so the problem shows up one word LATE, at `qty`. |
| Unticking Type mode always loses your SQL | `leaveTypeMode` isn't calling `buildFromSql`, or `done()` is using `newBuild()` instead of `read.build`. |
| Unticking Type mode unticks the box even when it asks | `queryType.checked = true;` is missing at the start of leaving: you're not out until you say so. |
| Clicking a cell with a search on shows the WRONG row | `cellSpot` uses the row's name tag as the file row. It's the spot in `matches`: use `matches[spot]`. |
| Clicking an empty column (the spreadsheet look) opens empty Details | `cellSpot` is missing `col >= dataColumns`. |
| The "expand?" tag never goes away when you scroll | The `scroll` / `wheel` listeners that call `hideTag` are missing. |
| The tag blocks clicks on the cell under it | `#cellTag` is missing `pointer-events: none;`. |
| The ✓ shows up floating when the query menu is closed | `.query-option input::after` uses `visibility`. Use `opacity: 0;` (the theme menu's gotcha, Part 4). |
| `salary > 100000` finds EVERY row (or none), and `MAX(salary)` says $99,950 | The money column is still words: `lookAtKinds` isn't making its kind `real` (check the `money` line), or `tableSource` is missing the `looked[u]` line (the cells stay words). |
| `SUM(salary)` works, but the answer shows `6166611450.0` instead of `$6,166,611,450.00` | `runQuery` is missing the `answerLooks` lines, or `showAnswer` isn't passing `looks[c]` to `queryCellText`. |
| `salary = '$116,450.00'` finds nothing | `lookLiteral` isn't used in the `cmp` part (the money words have to become a number). |
| `salary LIKE '$116%'` finds nothing | `like` isn't using the column's `look` (it's matching `116450.0`). |
| `7.9 % 3` gives `1.9` | `%` has to `Math.trunc` both sides first, like SQLite (Step 11.9). |
| `select * from all` gives "Expected the query to end here" | Rule 3 in `flexFix` adds the table in front of `ALL` instead of swapping `ALL` for it. Only the next PART (`WHERE`, `GROUP` ...) gets the table in front. |
| A question about ONE column of a wide file still takes seconds | The brain's table is missing `rowUpTo` (`engineTable`), or `readyQuery` works out every column's kind (`lookAtKinds(table, only)`: check `only`). |
| A query gives a column the wrong kind (a number column read as words) | A column read before `readyQuery` worked it out uses `kindAt`: check `tableSource`'s `get: function () { return kindAt(table, j); }`. |
| Plain words say "Did you mean" for a word you think it knows | That word isn't in `WORDS_KNOWN` or `WORDS_FILLER`, isn't a column, and isn't a value in the rows the profile looked at. Add it to a list (Step 12.6), or name its column ("region contains ireland"). |
| "Did you mean" never gets a button / `err.why` is `undefined` | The `why` was given to `new QueryError(words, why)`. The 2nd thing there is the browser's own `options` (`{ cause }`): set `problem.why = ...` on its own line, like `queryFail` does. |
| A comment (`-- like this`) gets read as plain words | `readWords` / `flexLooksLikeWords` aren't using `wordsWithoutComments(text)`. |
| `run.js` crashes: `no such column: Student Name` | A CSV with spaces in its column names is in `small-files/query/`: run.js loads EVERY CSV there into SQLite. Those go in `small-files/beginner/`. |
| `top 3 scores` becomes `"Lunch Period" = 3` | A number that's also a value in the file lost its "number" kind. In `readWords` step 1, a 1-piece number stays `k: 'num'`. |
| The "Try:" line stays empty | `openQueryMenu` isn't calling `showStarters()`, or `queryFileChanged` doesn't empty `queryTry` (then a new file keeps the old file's questions: they'd ask about columns that aren't there). |
| The faded sentence ignores clicks (can't get back from "Write it myself") | `#queryBuilder.paused` itself got `pointer-events: none`. Only its ROWS get that (`#queryBuilder.paused > .query-row`): the sentence behind them takes the click. |
| "any column" comes back as 5 conditions after asking | `buildFromSql` isn't running `anyColumnRuns`, or the columns aren't in the file's order (it goes by EVERY column, in order, the same LIKE). |
| A new condition makes rows disappear before you've typed anything | `builderSql` isn't leaving out conditions with an empty value (`f.value !== ''`): `LIKE '%%'` is false for an empty cell. |
| Picking from "+ where ..." does nothing | That list isn't made with `adder('where', ...)`, so it has no `data-add`, or `addCondition` isn't its `onPick`. |
| The keyboard jumps to nowhere after every pick | The new pick has no `key(...)` name, or `drawBuilder`'s last part (`focusNext` / `before`) is missing. |
| Enter in a Japanese / Chinese / Korean keyboard asks the question | `isAskEnter` is missing `!e.isComposing` (and `e.keyCode !== 229`). |
| "→ 4 rows" never changes | `writeSql` isn't calling `showMeaning()`, or the menu isn't open (`queryMenuOpen()`): it only counts while you can see it. |
| The amber badge cuts the warning off with "..." | `#fileBadge.warn` is missing `white-space: pre-wrap;` (the badge's normal `pre` + `ellipsis` cut it). |
| A test can't find "Keep rows" any more | The sentence's lines are named by `data-part` (`show`, `where`, `group`, `sort`, `limit`, `more`), and the "+" lists by `data-add`. The words on them changed; the names didn't. |
| `SELECT * ... WHERE x = 1` gives rows that DON'T match | `compileCore` tests the WHERE twice wrong: with `pushed`, the scan already tested it (`!pushed && ...`). Without the table's test (`canTestFirst`), compileCore has to test it itself. |
| The page stops for a moment at the END of a huge sort | `sortByKeys` makes plain lists (`new Array(n)`) instead of `Int32Array`, or the "extra columns come off" loop copies rows (`slice`) instead of `rows[k].length = width`. |
| A drop-down list in the query menu is empty when you open it | `pickList`'s `fill` isn't listening for `mousedown` / `focus` / `keydown` / `touchstart`. |
| Picking ANY file crashes with `Cannot set properties of null (setting 'hidden')` | The `<div id="fileBadge" hidden></div>` is missing from the skeleton (Step 5.1). |
| An Excel file shows garbage letters (`PK...`) | The first-bytes check (Step 5.10 #5) is missing, so it got read as text. |
| Excel dates show as numbers like `43586` | The date style wasn't found: check `styles` in `readXlsx` (it reads `<cellXfs>`), and that `formatKind` returns a kind for the format. |
| Excel dates are all 1 day off (before March 1900), or 4 years off | The Feb 29, 1900 lines in `excelDayToDate` are missing, or the `date1904` check is. Run `dates.html` (Castle Claude): it checks every date. |
| A price shows up as a date in 1900 | `formatKind` is finding a date letter that isn't one: in quotes (`"Qty: "`), escaped (`\d`), or in brackets (`[Red]`). Those get removed first. |
| Excel numbers show way too many digits (`522.83000000000004`) | `generalNumber` isn't used for plain numbers. |
| An Excel file loads, but the words are the wrong words | The shared words list is off by one. `<si/>` (an empty word) still counts as a word: it has to `push('')`. |
| Choose File does nothing | The `chooseBtn` click listener (Step 6.3 #2) is missing, or the button's `id` doesn't match. |
| The browser's own grey file button shows up in the bar | `#csvFileInput` is missing `opacity: 0;` (Step 6.2), or the old `::file-selector-button` rules are still there. |
| The aimbot says "No search" even when the search found rows | `showMatches` is missing `aimReset();` at the end (Step 6.3 #6). |
| ▶ snaps, but the cell is still off to the side | `outputBox.scrollLeft` is set to the sheet spot instead of `scrollSpotFor(...)` (it matters on super-wide sheets, where the scrollbar is "scaled"). |
| ▶ snaps, but nothing pulses | `.cell.locked` (Step 6.2) is missing, or `snapToTarget` picks the wrong child: it's `2 + col - builtColStart`. |
| The first ▶ skips the match the window showed | `aimStep` is missing the `if (aimed)` check: the first press should only snap. |
| "sales.csv" jiggles left and right | The dots are being added and removed. All 3 must ALWAYS be there; only their `opacity` changes. |
| The dots never go blank (they go `.` `..` `...` `.`) | Dot 1 is missing its `dot-one` animation, or a keyframe doesn't start at `0% { opacity: 0; }`. |
| Details ▾ stays greyed out | `drawAim` isn't setting `aimRowBtn.disabled = false;` when there's a target. |
| The Details panel pushes the sheet down | `#aimRow` is missing `position: absolute;`, or `#fileArea` is missing `position: relative;`. |
| The Details panel shows the OLD row after ▶ | `drawAim` is missing `if (!aimRow.hidden) drawRow();`. |
| A cut-off target gets no ▾, and the button stays plain | `drawAim` isn't calling `tellMore(target, ...)` at the end, or `target = box;` is missing in the scope loop. |
| The ▾ sits on top of the words | `.scope-target.cut` is missing `padding-right: 16px;`, or `position: relative;` (then the ▾ flies off to a corner of the page). |
| The button pulses every time you type a letter | `tellMore` isn't checking `which !== toldAbout`. |
| The focus card is empty | `paintMatches` ADDS to a box. `aimFocusText.textContent = '';` has to come first, and the card's `id`s must match the skeleton. |
| The focus card squeezes to nothing on a wide row | `#aimFocus` is missing `flex-shrink: 0;`. |
| A multi-sheet Excel file shows no sheet tabs | `showBadge` doesn't call `showSheetTabs();`, or the `<div id="sheetTabs">` is missing from the skeleton (Step 5.1). |
| Clicking a sheet tab does nothing | The listener's insides weren't moved into `loadFile(file, sheet)`, or `readAsExcel` doesn't pass `sheet` on to `readXlsx` (Step 5.13). |
| A workbook opens to an empty page | Its first sheet is a chart sheet. `readXlsx` has to skip sheets where `chart` is true. |
| The tabs have gaps between them, or double lines | `#sheetTabs` needs `display: flex;`, and each tab `border-left: none;` (except the first). |
| No green ƒ on formula cells | The `if (xlsxInfo !== null)` part is missing from `makeRow` (Step 5.12), or the `.cell.formula::before` rule is missing `content: "ƒ";`. |
| The ƒ is on the WRONG cells (one row off) | The cell's spot in the notes is `num * EXCEL_MAX_COLS + col`. Using `index` (the spot on screen) instead of `num` (the row number) gets it wrong as soon as you search. |
| A copied-down formula shows the FIRST cell's formula on every row | `shiftFormula` isn't used for the "same as group #si" cells (Step 5.9, `readCell`). |
| An empty-looking cell turns out to be a formula | The "no saved answer" part of `readCell` is missing: it should show the formula itself (`show = formula`). |
| A tiny Excel file freezes the page | The zip-bomb guard is missing: `unzipText` must add up `budget.used` as it unpacks, and stop at `XLSX_LIMIT`. |
| Accented letters show up as `�` (`Jos�`) | The file is in the older Excel rulebook, and `isUtf8` isn't called before reading, or `readAsText` is missing its `encoding`. |
| Every file says "read as Windows-1252" | `isUtf8` calls `done(false)` too easily. Is `fatal: true` there? Is `{ stream: true }` there? (Without it, a letter cut in half at the 4 MB edge looks "broken".) |
| A file with a real `�` in it turns into garbage (`â˜•`) | The safety net re-reads as soon as it SEES a `�`. It has to check the whole file with `isUtf8(file, file.size, ...)` first. |
| The loader never goes away on a file with `�` in it | The safety net's `ok` branch is missing `reader.onload(e);`, or `checkedWhole = true;` is missing (so it checks forever). |
| Every row shows the NEXT row's first letter, or loses its last letter | `rowText` is off by one. The row ends at `rowStart[i + 1] - 1` (the line break), not `rowStart[i + 1]`. |
| The last row is missing, or shows up empty | `starts[count] = spot;` is missing from the "ALL DONE" part of Step 2.15, so the last row has no end. |
| Cells end with a weird invisible character (Windows files) | `rowText` isn't leaving off the `\r` (the `charCodeAt(end - 1) === 13` line). |
| Scrolling sideways shows the WRONG columns' words | `getCells` loops from 0 instead of `builtColStart`, or `rowInfo`'s `commas` are counted wrong (`col - 1` for the start, `col` for the end). |
| A new file shows rows from the OLD file | `rowCache = new Map();` is missing from the "ALL DONE" part of Step 2.15. |
| Super-wide files eat all the memory | The cache limit (`rowCache.size >= 1000 \|\| cacheCells + info.count > 20000000`) is missing from `rowInfo`. |
| Search results flicker, or OLD results show up after you typed a new word | `searchSome` is missing `if (mySearch !== searchId) return;` at the top, so old searches keep running and landing. |
| Yellow paints the wrong word for a moment while searching | `query = ...` is set at the top of `render` instead of inside `showMatches`. The word and the rows have to change together. |
| Backspacing gives too FEW results | Narrowing is used when the new word is SHORTER. It must only narrow when `wanted.includes(doneQuery)`. |
| A new file's first search gives weird results | `doneQuery = null; doneMatches = null;` is missing from the "ALL DONE" part of Step 2.15. The old file's matches are getting reused. |
| "Searching for ...%" never goes away | `showMatches` isn't called at the end of `searchSome` (it's what puts the "Rows 1–15" words back). |
| The loader shows up but never goes away | `finishLoading();` is missing at the end of `cutSomeRows` (Step 2.15) or `squishSomeRows` (Step 2.13). |
| The loader flashes on and off for tiny files | `LOADER_DELAY` is `0`, or `startLoading` shows the loader right away instead of using `setTimeout`. |
| The pie jumps instead of filling smoothly | The `@property --done` block is missing or misspelled (it needs `syntax: "<number>"`). |
| The pie is just a plain circle that never fills | `setProgress` sets `--done` on the wrong piece. It has to be `loaderPie`. |
| A cell with a line break inside quotes splits into 2 rows | `nextLine` (Step 2.15) is missing the quote-counting `while` loop, so it stops at the first line break. |
| Rows with a line break in them are TALLER, and the rows after them are off | `makeRow` (Step 2.5) is missing the `shown` line, so the real line break gets drawn. |
| A big file with no quotes freezes on "Cutting it into rows..." | `nextLine` looks for the next quote from `spot` every time, instead of remembering `nextQuote`. |
| Everything after one row turns into ONE giant row | That row has a quote that never closes (like `5'10",Bob`), and the `tooFar` / `neverClosed` check is missing from `nextLine` (Step 2.15). |
| A stray quote is caught in BIG files but eats the rest of a SMALL file | `neverClosed` is missing. Small files end before `tooFar` ever kicks in. |
| The last row's quoted line break gets chopped | `nextLine` skips `quotes += quotesBefore(text.length)`, so the closing quote after the last line break never gets counted. |
| After a stray quote, the NEXT rows split in weird places | The `QUOTE_LIMIT` check gives up but doesn't reset `nextQuote = text.indexOf('"', firstEnd + 1)`. |
| A file with one HUGE cell freezes the page | `makeRow` (Step 2.5) puts all of `text` in the box or the hover, instead of `short`. |
| Picking the SAME file again does nothing | The `click` listener that clears `fileInput.value` is missing (Step 2.15). |
| A too-big file just makes the loader vanish, no message | `couldNotRead` doesn't set `statusText.textContent`, OR `onload` is missing the `text.length === 0 && file.size > 0` check. (From disk, a too-big file comes back EMPTY, not as an error.) (Step 2.15) |
| The search bar stays greyed out after loading | `searchInput.disabled = false;` is missing from the "ALL DONE" part of Step 2.15. |
| Rows show the wrong numbers (off by one) | Somewhere is missing the `+ 1`. `matches` holds spots (start at 0), row numbers start at 1. |
| A very wide file still crashes | `makeRow` still loops `col < columnCount`. It has to loop from `builtColStart` to `builtColEnd`. |
| The header doesn't match the columns under it | The header isn't rebuilt when the columns change. `updateColumns` has to call `drawHeader()` in step 4. |
| Columns are squished or overlap | The left and right spacer `span`s are missing from `makeRow`, so the cells land in the spacers' spots in the grid. |
| Sideways scrolling shows blank space | `updateColumns()` isn't in the `scroll` listener, so the columns never swap in. |
| After resizing the browser (or a new file), too few or too many columns are built | Something that changes the window's size is missing `boxChanged();` (the resize listener, `sizeWindow`, or `layoutColumns`), so `knowBox` keeps the OLD size. |
| Scrolling feels heavy on a wide file, even though nothing looks wrong | The scroll listener reads `scrollTop` AFTER `updateColumns()` changed the page. Read first (`knowBox()`, `scrollTop`, `readViewY()`), then change. |
| The window has empty glass at the bottom | `sizeWindow` still uses `WINDOW_SIZE` instead of `rowsToShow`. |
| Deep in a huge file, the rows show numbers but the cells are BLANK | The rows area is taller than ~8 million pixels, where browsers stop drawing text. Check `MAX_SCROLL_HEIGHT` and that `render` sets `rowsScaled` and `rowsHeight`. |
| On a huge file, the wheel jumps hundreds of rows per click | Something still reads `outputBox.scrollTop` directly instead of `readViewY()`, or sets it instead of calling `setViewY()`. |
| Colors are missing and everything looks see-through or white | A color name is misspelled. `var(--pgae)` finds nothing. Check every `var(--...)` against the theme block. |
| The theme chip looks like a plain grey button | A `#themeChip` rule is misspelled, so the "ALL THE BUTTONS" look wins. |
| The theme chip turns brighter-grey when you hover it | `#themeChip:hover` is missing `filter: none;`. |
| The menu just APPEARS (no unfolding) | `openThemeMenu` is missing `void themeMenu.offsetWidth;` between removing `closed` and removing `folded`. |
| The menu unfolds from the wrong size, or lands off the chip | `measureFold()` isn't called, or `#themeMenu` has a different `top` / `left` than `#themeChip`, or `transform-origin: top left;` is missing. |
| The menu opens once, then never again | `closeThemeMenu` isn't clearing `foldTimer`, or `#themeMenu` uses `display: none` instead of `.closed { visibility: hidden; }`. |
| The ✓ shows up floating in the corner when the menu is closed | The ✓'s rule says `visibility: visible;`. It must be `visibility: inherit;`. |
| The menu stays dark when it's open | The `#themeMenu::after` cover is missing `opacity: 0;`, or `pointer-events: none;` (then clicks hit the cover, too). |
| "Row #" and "Go to row" have a gap between them | `#controls` is missing `display: flex;`. Without it, the space between them in the skeleton shows up as a gap. |
| The controls aren't all the same height | One of them is missing `line-height: 34px;` (or has a different number). |
| "Choose File" still looks like a plain grey button | The `#csvFileInput::file-selector-button` rule is missing or misspelled. |
| The menu opens but is empty | `buildThemeList` never ran. Make sure `setTheme(currentTheme);` is at the very end of the brain (just before `measureFold();`). |
| The menu won't close when clicking outside | The `document.addEventListener('click', ...)` listener is missing. |
| The menu's header row pokes out past the round corners | `overflow: hidden;` is missing from `#themeMenu`. |
| The swatch is invisible (just a grey column) | `.theme-swatch` is missing `position: relative; z-index: 1;`, so the row-number column (`::before`) covers it. |
| The theme row is shorter than the sheet's rows | `font: inherit;` comes AFTER `line-height: 29px;` in `#themeMenu .theme-option`. `font` resets line-height. Put it first. |
| The corner box or row-number column is missing | `content: "";` is missing from `.menu-title::before` or `#themeMenu .theme-option::before`. |
| The chessboard doesn't alternate (two dark squares touch) | An `:nth-child(odd)` / `:nth-child(even)` rule has its `::before` and row colors the same way round. Odd = dark swatch, light name. Even = light swatch, dark name. |
| The top-left corner box is darker grey than the other light squares | `.menu-title` uses `background: var(--square-dark);` for the whole row. The corner is see-through, so the dark shows through it. Use the `linear-gradient(90deg, transparent 36px, ...)` version. |
| A theme name disappears on a dark square | The `:nth-child(even) .theme-name` rule (white + glow) is missing. |
| The squares have no glow, just flat color | The `box-shadow: inset 0 0 12px ...` lines are missing, or the browser is old (`color-mix` needs a 2023+ browser). |

<br>

## What it can't do (yet)

- **Excel: one sheet at a time.** It opens the first real sheet that isn't hidden; click a sheet tab to see another one. Chart sheets can't be opened (they have no rows).
- **Excel: dates and plain numbers only.** Dates and times show as `YYYY-MM-DD hh:mm`. Other formats (`$1,234.00`, `25%`, fractions) show as the plain number. The format itself is kept in the Excel notes.
- **Excel: formulas aren't recalculated.** It shows the last answer Excel saved, with a green **ƒ** (hover for the formula). No saved answer? It shows the formula itself. The page warns when a file asks to be recalculated.
- **Excel: no old `.xls` files, no password-protected files.** You get a message saying what to do (Save As `.xlsx` or CSV).
- **Excel: no merged cells, colors, or fonts.** Just the values.

- **SQL: one table at a time.** Click a table tab to see another one. A table with no rows still gets a tab, marked "(empty)".
- **SQL: queries are skipped, never run.** `SELECT`, `UPDATE`, `DELETE`, views and the rest are read past. Only the rows written IN the file (`INSERT ... VALUES` and `COPY`) are shown, so an `UPDATE` later in the dump doesn't change them.
- **SQL: text dumps only.** A real database file (like SQLite's `.db`) is a different, binary thing, and it can't open those. And it only treats a file as SQL if its name ends in `.sql`.
- **SQL: search can't find NULL.** A NULL cell is empty inside. The faint "NULL" is just drawn on top.

- **Queries only READ.** `UPDATE`, `DELETE`, `INSERT`, `CREATE` are refused: the file is never changed. To change data, change the file, or use a real database.
- **Queries: the SELECT part of SQL, not ALL of it.** No `WITH RECURSIVE`, no named windows (`WINDOW w AS ...`), no `GROUPS` frames, no `INTERSECT ALL` / `EXCEPT ALL`. It says so when you use one.
- **Queries follow SQLite's rules where databases disagree.** `LIKE` ignores big and small letters, `7 / 2` is `3`, `'12abc' + 1` is `13`. A query written for SQL Server or PostgreSQL usually runs as is, but the odd function or detail may differ.
- **Queries: a column's type is a good guess.** It looks at 20,000 rows. A cell that doesn't fit (a word in a number column) stays words, and a number column with `007` in it is words on purpose (it's a code).
- **Queries hold the answer in memory.** A question that answers with MILLIONS of rows (like `SELECT *` on a huge file, sorted) needs room for the file AND the answer. A `SELECT *` on a 500 MB file works (about 2 GB at its peak, ~17 s); an answer BIGGER than the browser can hold as text (about 500 MB, like `SELECT *, *` on that file) says "The answer is too big for the browser" instead.
- **Queries on another sheet or table read it first.** The open one is ready; any other one is read (once) the first time a question asks for it.
- **Query Flexibility fixes small mistakes, not meaning.** A typo, a missing `FROM` or `*`, words without quotes, a missing `GROUP BY`, an unfinished end. It can't guess what you MEANT: `select status, qty from orders group by status` is still refused (add qty to the GROUP BY? or total it? only you know). When two fixes are just as likely, it doesn't guess either.
- **Snap to result only fixes spelling (for `=` and `IN`), and `= ''` in a CSV.** No rows (or a total of nothing, like `COUNT(*)` = 0) for `status = 'Shipped'` and the file says `shipped`? Fixed. `notes = ''` in a CSV? It becomes `notes IS NULL`. But if the file has `Shipped` AND `SHIPPED`, or the word just isn't there, it leaves your question alone (0 rows is the right answer then).
- **Plain words know ONE table, its values, and about 150 words.** No JOINs, no "this month", no "the 2nd highest". A value is only known if it's in the profile (the first 60 columns, up to 20,000 rows, and 500 different values at most). Anything it doesn't know is handed back ("I didn't use: ..."), and then it asks before it runs.
- **Plain words don't remember the last question.** "Now sort THAT by name" is answered about the whole table, so it asks first ("that: it doesn't remember an earlier question").
- **Plain words can't mix AND with OR** ("score over 90 and grade A or attendance 100": which goes first?). It joins them all with AND and asks. Write that one in SQL, with ( ).
- **"→ 4 rows" before you ask only counts files up to 2,000,000 rows** (`PREVIEW_MAX_ROWS`). Bigger ones get just the words. And it's the count "Show answer" WILL get, so on a big file it can take a moment ("→ counting ...").
- **"Try:" looks at the first 60 columns** (the profile). A file whose interesting columns are past column 60 gets questions about the first ones.
- **The builder shows ONE table's simple questions.** A JOIN, a CASE, a function like `UPPER(...)`, HAVING, OFFSET, or AND mixed with OR can't be buttons. Leaving type mode, it says which parts, and asks before dropping them.
- **"any column" is only offered up to 100 columns** (`ANY_COLUMN_MAX`), and only for word tests (contains, starts with, ends with, is). It finds a word INSIDE one cell: "Ana Chicago" across two cells isn't found (that would need the cells glued together, and then "a C" would be found across the gap too).
- **Clicking a cell in drag mode moves the sheet** (that's what drag mode is for). Turn it off to click cells.
- **Money columns have to be ONE look.** A column with `$` in some cells and `€` in others, or a cell like `N/A` in between, stays words (which is it? it doesn't guess). Europe's `1.234,56` stays words too (is `12,34` twelve, or 1234?). `12%` counts as **12** (what you see), not 0.12.
- **An answer keeps the money look only for the column itself** (and its `SUM`, `MIN`, `MAX`, `AVG`, `TOTAL`). Math on it (`salary * 2`), or a UNION, gives a plain number.
- **`LIKE` ignores big and small letters for EVERY letter** (`'%Ñ%'` finds `Núñez`). Real SQLite only does it for A to Z: this is one place it's kinder on purpose.
- **A WIDE file's column types are a smaller guess.** It looks at up to 4 million cells (`SAMPLE_CELLS`): a 10,000-column file, 400 rows spread through it. `SELECT *` on it still has to guess every column (about 0.7 s for 10,000).

- **It expects a header.** The first line is always treated as the column names.
- **A quote that never closes still changes its OWN row.** The brain catches a stray `"` and keeps every other row safe, but in that one row, everything after the `"` lands in one cell. (`Bob,5'10",tall` → `[Bob] [5'10,tall]`.) The real fix is in the file.
- **A real cell with a line break AND over 32,767 letters after it** gets treated like a stray quote. (Excel couldn't hold that cell either.)
- **Huge cells only show their first 1,000 letters**, in the box and the hover. Search still finds words past that, but you won't see the yellow.
- **No typo help.** `Jon` won't find `John`.
- **Whole rows only.** You can't search just one column.
- **In Expand mode,** the header doesn't follow you down the page.
- **Spreadsheet View is a LOOK, not Excel.** No cell picking, no editing, no formulas being worked out. It shows the sheet the way Excel lays it out (letters, row numbers, addresses).
- **Spreadsheet View can't save a CSV as an `.xlsx`** (or an Excel sheet as a `.csv`). The file is only ever read.
- **Search can find a match you can't see.** On a wide file, a row might match because of something way off to the side. It shows up in the results, but the yellow is off-screen until you press ▶ in the snap menu (Part 6).
- **The Details panel lists 200 columns at most** (the ones around the match). A giant cell shows its first 2,000 letters in the list, and its first 20,000 in the focus card.
- **The focus card shows one cell at a time.** A row with your word in 3 cells: press ▶ to move the card to the next one (`hit 2 of 3`).
- **Super-wide sheets scroll fast sideways.** Past `MAX_SCROLL_WIDTH`, each pixel of scrollbar covers many pixels of sheet. On the million-column test file, one click of Shift + wheel jumps about 14 columns instead of 1 or 2. (Fine for zooming across a giant sheet, but not for reading cell by cell. A fix: catch Shift + wheel in the brain and move a set number of columns, like the vertical wheel moves a set number of rows.) (Or turn on drag mode: it moves in exact sheet pixels, at any speed you want, even on the million-column file.)
- **Dragging the scrollbar on a HUGE file is coarse.** Past about 133,000 rows the scrollbar is squeezed, so one pixel of dragging jumps several rows. (The wheel and Go to row are still exact. It snaps to a whole row when you let go.)
- **Really, REALLY huge files** (around 1 GB) may be too big for the browser to read at all. Everything up to a few hundred MB is fine.
