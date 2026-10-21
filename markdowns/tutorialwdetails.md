# Build the CSV Reader From Scratch

You're going to build a web page that opens a CSV file and shows it like a **mini Excel sheet** inside a floating glass window:

- Row 0 (the column names) stays stuck to the top
- 15 rows show at a time, and scrolling snaps row by row
- Every value sits in its own box, and the columns line up
- Search paints your word yellow
- Go to any row, or expand to see everything
- **It stays fast, even with hundreds of thousands of rows**
- A glass **hexagon** in the corner opens a theme menu (the default theme is **Neo-Neutral**)

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
const GLIDE       = 0.25;   // how fast the wheel glide catches up (bigger = snappier, smaller = floatier)
const CHUNK_TIME  = 12;     // big jobs are done in BITES of about 12 milliseconds, so the page never freezes
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

let loadId         = 0;      // counts every file you pick (a NEW file = a new number, so the old one quits)
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

        let col  = 0;
        let from = 0;                       // where this cell starts

        while (true) {
            const comma = line.indexOf(',', from);
            const size  = (comma === -1 ? line.length : comma) - from;

            if (longest[col] === undefined || size > longest[col]) longest[col] = size;

            if (comma === -1) return;       // no more commas? That was the last cell.
            from = comma + 1;
            col++;
        }
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
function drawHeader() {

    headerBox.textContent = '';                         // wipe the old one

    const row = makeRow(0, headerCells, '', 0);         // row 0, the column names, no search
    row.classList.add('header-row');

    headerBox.appendChild(row);

    // Measure it, so the brain knows exactly how tall one row is.
    rowHeight = row.offsetHeight || 30;
}
```

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
function buildVisibleRows(scrollSpot) {

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
        viewTop     = scrollSpot;
        scrolledTop = scrollbarSpotFor(scrollSpot);
        viewHeight  = outputBox.clientHeight;                   // the window
    } else {
        viewTop     = readViewY();
        scrolledTop = outputBox.scrollTop;
        viewHeight  = outputBox.clientHeight;
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


// Figure out which columns should be built, and hand the clothes the column list.
// "force" = rebuild even if nothing moved (for a new file, or a new search).
function updateColumns(force) {

    if (columnStarts === null || columnCount === 0) return;


    // 1. Where are we looking?
    const viewWidth = Math.max(outputBox.clientWidth - NUM_WIDTH, 0);   // how much sheet fits beside the row numbers
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

    if (columns !== lastColumns) {
        outputBox.style.setProperty('--columns', columns);
        lastColumns = columns;
    }

    // Handing over new columns can change how wide the WINDOW is (it fits the sheet, up to 900px).
    // Wider window = more columns fit. So check again, once, with the new width.
    if (outputBox.clientWidth - NUM_WIDTH > viewWidth + 1 && !updateColumns.again) {
        updateColumns.again = true;
        updateColumns(force);
        updateColumns.again = false;
        return;
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
| `clientWidth` | How wide the inside of the window is |
| `function` inside a `function` | `leftSpace` and `fits` live inside `updateColumns`, so they can use `spot` and `scrolled` |
| `updateColumns.again` | A little "I'm already checking again" flag stuck right on the function, so it only re-checks ONCE |
| `.setProperty('--columns', ...)` | Hand the clothes the new column list (Part 3 reads it) |

> **Why only rebuild when the columns change?** Scrolling a few pixels sideways usually keeps the same columns (the extras on each side cover it). Rebuilding ~45 rows is quick, but skipping it when nothing changed is quicker.

<br>

### Step 2.10: The "Rows 21–35 of 100" words (`updatePosition`)

```js
function updatePosition() {

    if (headerCells.length === 0) return;               // no file yet? stop.

    const word = searchInput.value.trim();

    if (matches.length === 0) {
        statusText.textContent = word === ''
            ? 'This file only has a header row'
            : 'No rows match "' + word + '"';
        return;
    }

    // Every row is the same height.
    // So: how far we scrolled ÷ one row's height = which row is at the top.
    const first = Math.min(Math.round(readViewY() / rowHeight), matches.length - 1);

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

    statusText.textContent = message;
}
```

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

    outputBox.style.height = '';    // start fresh

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;   // how tall the scrollbar is

    // 15 rows (or fewer, if that's all there is)
    const rowsToShow = Math.min(WINDOW_SIZE, matches.length);

    // the header + the rows + the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + rowsToShow * rowHeight + scrollbar) + 'px';
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
            setTimeout(searchSome, 0);
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
            setTimeout(squishSomeRows, 0);
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
| `setTimeout(squishSomeRows, 0)` | "Run the next bite as soon as the screen has had a chance to update." |
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

Now the brain listens for you picking a file. It cuts the file up **in bites** too, one line at a time, and measures each column's longest thing as it goes:

```js
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
                setTimeout(cutSomeRows, 0);
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
            drawHeader();                       // draw row 0
            render();                           // show the rows!
            finishLoading();                    // the pie fills up, and the loader goes away
        }

        cutSomeRows();                          // take the first bite
    };

    reader.readAsText(file);              // GO! start reading.
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
    updateColumns();                // scrolled sideways? swap columns in and out
    buildVisibleRows();             // scrolled up or down? swap rows in and out
    updatePosition();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToRow, 150);
});

// The page scrolls → only matters when expanded.
window.addEventListener('scroll', function () {
    if (outputBox.classList.contains('expanded')) buildVisibleRows();
});

// The browser window changes size → more or fewer rows (and columns) might fit.
window.addEventListener('resize', function () {
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

Every time the screen redraws (about 60 times a second), the window moves **25% of the way** to the finish line (that's `GLIDE = 0.25`). Far away = big steps. Almost there = tiny steps. So it speeds off and lands gently.

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
function glideStep() {

    // The finish line got cleared? Stop.
    if (wheelTarget === null) {
        gliding = false;
        return;
    }

    // Someone else moved the window (like dragging the scrollbar)? Let them. Stop gliding.
    if (Math.abs(outputBox.scrollTop - scrollbarSpotFor(glideSpot)) > 2) {
        gliding = false;
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
        return;
    }

    // Move 25% of the way there.
    glideSpot += gap * GLIDE;
    setViewY(glideSpot);

    requestAnimationFrame(glideStep);             // same thing again, next redraw
}


function snapToRow() {

    wheelTarget = null;                     // the glide is over
    wheelLeft = 0;

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    // Already on a whole row? Nothing to do.
    const now = readViewY();
    const nearest = Math.round(now / rowHeight) * rowHeight;
    if (Math.abs(now - nearest) < 1) return;

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
function squeezedEnd() { return headerBox.offsetHeight + rowsHeight - outputBox.clientHeight; }
function fullEnd()     { return headerBox.offsetHeight + matches.length * rowHeight - outputBox.clientHeight; }

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

    --theme-color:  #2a2e35;                        /* the theme's own color (the hexagon + its name) */
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
   (The hexagon and the theme menu's rows are buttons too. They undo this with their own rules.) */
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

> **Why do the theme menu's buttons look different, if `button` dresses ALL buttons?** The hexagon and the theme rows have their own rules with `#id`s in them. A rule with an `#id` beats a plain `button` rule, so theirs win. (The hexagon has to say `box-shadow: none;` though, or it would get a square glow behind it.)

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
       then just slides that finished picture up and down. */
    will-change: transform;
}

/* The floating move: up 4 pixels, then back down.
   A smooth float written out as 10 points on the curve (slow at the top and bottom, faster in the middle). */
@keyframes float {
    0%, 100% { transform: translateY(0); }
    10%, 90% { transform: translateY(-0.38px); }
    20%, 80% { transform: translateY(-1.38px); }
    30%, 70% { transform: translateY(-2.62px); }
    40%, 60% { transform: translateY(-3.62px); }
    50%      { transform: translateY(-4px); }
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

The loader is built like the hexagon you'll make in Part 4: **solid theme color, glowing white outline**. So they look like they belong together.

```css
/* The cloud: the whole screen, on top of everything. */
#loader {
    position: fixed;
    inset: 0;                       /* fill the whole screen */
    z-index: 20;                    /* above everything (even the hexagon) */

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
        0 0 0 3px rgba(255, 255, 255, 0.9),         /* a white outline (like the hexagon) */
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
- [ ] The page never freezes while it works (try moving the mouse over the hexagon: it still reacts)
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

# PART 4: The Theme Hexagon ⬢

A little glass **hexagon** in the top-left corner. Click it and a **theme menu** floats down. The menu is a tiny sheet, made of the same parts as the CSV window. It shows the theme you're wearing (**Neo-Neutral**) in its own color.

```text
   ⬢   ← the hexagon  (a little spaced down, a little spaced over)
  ┌────┬──────────────────┐
  │ ░░ │▓▓ Theme ▓▓▓▓▓▓▓▓▓│   ← the floating menu's header row
  │▓⬢▓│░░ Neo-Neutral ░✓░│   ← name + check mark = "you're wearing this one"
  └────┴──────────────────┘     (colored like a glowing chessboard: light and dark take turns)
```

This part touches **all 3 files**, because it's a brand-new piece: skeleton, then clothes, then brain.

<br>

### Step 4.1: The skeleton

In `testI.html`, put this at the **very top of `<body>`**, before the `<h1>`:

```html
    <!-- 0. THE THEME HEXAGON (top-left corner) -->
    <button id="themeHex" title="Theme: Neo-Neutral" aria-haspopup="true" aria-expanded="false" aria-controls="themeMenu">
        <span class="hex">
            <span class="hex-inner"></span>
        </span>
    </button>

    <!-- The floating theme menu (the brain fills in the list) -->
    <div id="themeMenu" role="menu" aria-label="Themes" hidden>
        <p class="menu-title">Theme</p>
        <div id="themeList"></div>
    </div>
```

**Why a span inside a span?** The hexagon is built in **2 layers**, like a coin with a rim:

```text
   .hex          →  the shiny outline            (outside)
   .hex-inner    →  the theme color, as glass    (inside, a little smaller, so the outline peeks out around it)
```

> **Why not just use `border`?** The scissors (coming up next) would cut the border off the slanted sides. Two layers is the trick to get an outline on a shape that isn't a box.

| Word | Baby words |
|---|---|
| `<span>` | A plain box with no meaning. Just something to dress up. |
| `aria-haspopup="true"` | Tells screen readers: "clicking me opens a menu." |
| `aria-expanded="false"` | Tells screen readers if the menu is open. The brain flips it to `"true"`. |
| `aria-controls="themeMenu"` | "The menu I open is the one called themeMenu." |
| `role="menu"` | Tells screen readers: "this is a menu." |

<br>

### Step 4.2: The clothes: the hexagon

A hexagon is just a box with its corners **cut off**. `clip-path` is the scissors. It cuts along these 6 points:

```text
                 (50% 0)
            ┌───/───\───┐
            │  /       \│    (100% 25%)
            │ |         |
            │ |         |
            │  \       /│    (100% 75%)
            └───\───/───┘
                 (50% 100%)
```

> ⚠️ **The scissors cut off shadows and glows too!** So the GLOW + SHADOW go on the outside piece (the button), and the scissors go on the inside pieces.

Add this to `styleI.css`, right **above** the `[hidden]` rule:

```css
#themeHex {
    position: fixed;            /* glued to the screen, even when you scroll */
    top: 24px;                  /* a little spaced down */
    left: 28px;                 /* a little spaced over */
    z-index: 10;                /* on top of everything */

    width: 50px;
    height: 58px;               /* a hexagon is a bit taller than it is wide */
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    box-shadow: none;           /* no square glow from "ALL THE BUTTONS" (the hexagon has its own, below) */

    /* 3 shapes stacked: a white rim glow, the theme's glow, then a floating shadow */
    filter:
        drop-shadow(0 0 2px rgba(255, 255, 255, 0.9))
        drop-shadow(0 0 8px var(--theme-glow))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
    transition: transform 0.35s ease, filter 0.35s ease;
}

#themeHex:hover {
    background: none;           /* undo the grey hover from "ALL THE BUTTONS" */
    transform: scale(1.07);
    filter:                     /* glow a little brighter */
        drop-shadow(0 0 3px #fff)
        drop-shadow(0 0 14px var(--theme-glow))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
}

/* Menu open? Turn 1/6 of the way around.
   (A hexagon turned 60 degrees looks the same, so it "clicks" into place.) */
#themeHex[aria-expanded="true"] {
    transform: rotate(60deg);
}

/* The keyboard ring (when you Tab to it) */
#themeHex:focus-visible {
    outline: none;
    filter:
        drop-shadow(0 0 3px #fff)
        drop-shadow(0 0 4px #fff)
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
}

/* Both layers get the scissors */
.hex,
.hex-inner {
    display: grid;
    place-items: center;        /* whatever's inside sits in the middle */
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

/* Layer 1: the outline. The same thin shiny edge as the CSV window. */
.hex {
    width: 100%;
    height: 100%;
    background: var(--glass-edge);
}

/* Layer 2: the theme color, made of GLASS (4px smaller, so 2px of the outline shows all around).
   The same shine as the CSV window (a little white in the top-left, fading to clear) laid over the color. */
.hex-inner {
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 60%),
        var(--theme-color);
}
```

> **Two backgrounds in one?** Yes! List them with a comma, and they stack: the FIRST one is on top. So the see-through white shine sits on top of the solid theme color. It's only 10% white, so the hexagon stays dark and almost flat, with just a hint of glass in the top-left. (`0) 60%` = "be fully clear by 60% of the way across." Want it glossier? Raise the `0.1`. Totally flat? Delete the whole `linear-gradient(...)` line.)

**How the glow works:** `drop-shadow` with no sideways or downward move (`0 0`) doesn't look like a shadow at all. It spreads out evenly on every side, so with a light color it's a **glow**. We stack two glows (a tight white one hugging the outline, then a wider one in the theme's glow color), then a normal dark shadow underneath so it still floats.

| Word | Baby words |
|---|---|
| `clip-path: polygon(...)` | The scissors. Cut the box along these points. |
| `filter: drop-shadow(...)` | A shadow (or glow) that follows the real SHAPE, not the square box. |
| `transform: scale(1.07)` | Grow 7% bigger. |
| `transform: rotate(60deg)` | Turn 60 degrees. |
| `transition` | Don't jump. Slide into the new look smoothly. |
| `[aria-expanded="true"]` | "...only while the menu is open." |
| `calc(100% - 4px)` | "All of it, minus 4 pixels." Lets the clothes do math. |

<br>

### Step 4.3: The clothes: the floating menu

The menu is a **tiny sheet**, built from the SAME parts as the CSV window. Same design language everywhere, so the whole page feels like one thing:

```text
 ┌────┬──────────────────┐
 │    │ Theme            │   <- the header row (with the "0" corner box)
 ├────┼──────────────────┤
 │ ⬢  │ Neo-Neutral    ✓ │   <- a row (the swatch sits in the row-number column)
 └────┴──────────────────┘
```

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
 │▓⬢▓│░░ Neo-Neutral ░✓░│
 ├────┼──────────────────┤     Every row flips the one above it,
 │ ░⬢ │▓▓ Midnight ▓▓▓▓▓▓│     so a new theme just keeps the board going.
 └────┴──────────────────┘
```

The window **bobs**, the menu **pops in**, then stays still.

Add this right after the hexagon rules:

```css
#themeMenu {
    position: fixed;
    top: 94px;                  /* just under the hexagon */
    left: 20px;
    z-index: 10;
    min-width: 210px;
    overflow: hidden;           /* keep the header row's corners inside the round corners */

    /* The same letters as the CSV window */
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 14px;

    /* The same glass as the CSV window (see #output) */
    background: linear-gradient(135deg, var(--glass-top), var(--glass-bottom));
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-edge);
    border-radius: 18px;

    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),                /* soft shadow below = floating */
        inset 0 1px 0 rgba(255, 255, 255, 0.9);         /* shiny line on the top edge */

    transform-origin: 30px 0;   /* grow out from under the hexagon */
    animation: menu-pop 0.18s ease-out;
}

/* Pop in: start a little higher, a little smaller, and invisible */
@keyframes menu-pop {
    from { opacity: 0; transform: translateY(-6px) scale(0.96); }
}

/* The "Theme" word on top = the HEADER ROW. A DARK square (with the light "0" corner box beside it). */
.menu-title {
    display: grid;
    grid-template-columns: 36px 1fr;
    column-gap: 8px;
    margin: 0;
    line-height: 29px;
    background: linear-gradient(90deg, transparent 36px, var(--square-dark) 36px);  /* dark only AFTER the corner box,
                                                                                        so the corner sits on plain glass (like every light square) */
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);  /* a soft rim of the theme's glow */
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    font-weight: 600;
}

/* The "0" corner box = a LIGHT square */
.menu-title::before {
    content: "";
    background: var(--square-light);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);        /* glowing white from inside */
    border-right: 1px solid rgba(255, 255, 255, 0.6);
}

/* One theme in the list = one ROW of the sheet.
   29px + the 1px white line under it = 30px. Just like the CSV window. */
#themeMenu .theme-option {
    position: relative;
    display: grid;
    grid-template-columns: 36px 1fr auto;      /* [swatch] [name] [✓] */
    align-items: center;
    column-gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0 12px 0 0;
    font: inherit;              /* (FIRST: "font" also resets line-height, so it has to come before it) */
    line-height: 29px;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 0;
    background: none;
    text-align: left;
    transition: background 0.15s;
}

#themeMenu .theme-option:last-child {
    border-bottom: none;        /* the glass edge is the last line */
}

/* The row-number column, behind the swatch */
#themeMenu .theme-option::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 36px;
    border-right: 1px solid rgba(255, 255, 255, 0.6);
}

/* 1st, 3rd, 5th theme... (the header was dark-on-the-right, so flip it):
   swatch = DARK square, name = LIGHT square */
#themeMenu .theme-option:nth-child(odd) {
    background: var(--square-light);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);
}

#themeMenu .theme-option:nth-child(odd)::before {
    background: var(--square-dark);
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);
}

/* 2nd, 4th, 6th theme... (flip again):
   swatch = LIGHT square, name = DARK square */
#themeMenu .theme-option:nth-child(even) {
    background: var(--square-dark);
    box-shadow: inset 0 0 12px color-mix(in srgb, var(--theme-glow) 25%, transparent);
}

#themeMenu .theme-option:nth-child(even)::before {
    background: var(--square-light);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);
}

/* On a DARK square, the name turns white and glows in its own theme color
   (so it's easy to read on the dark glass). */
#themeMenu .theme-option:nth-child(even) .theme-name {
    color: #fff;
    text-shadow: 0 0 2px #fff, 0 0 10px var(--c-glow);
}

/* Mouse on it -> both of its squares light up */
#themeMenu .theme-option:hover {
    filter: brightness(1.12);
}

/* Got there with the keyboard -> it GLOWS, like a cell you hover in the sheet */
#themeMenu .theme-option:focus-visible {
    outline: none;
    filter: brightness(1.12);
    box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.95),
        0 0 14px 2px rgba(255, 255, 255, 0.9);
    z-index: 1;
}

/* The tiny hexagon next to the name.
   (Too tiny for a glow. It would just look blurry.)
   Same 2 layers as the big hexagon: the swatch is the outline,
   the span inside it is the colored glass. */
.theme-swatch,
.theme-swatch span {
    display: grid;
    place-items: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.theme-swatch {
    width: 16px;
    height: 18px;
    justify-self: center;       /* in the middle of the row-number column */
    position: relative;
    z-index: 1;                 /* on top of the row-number column (the ::before above) */
    background: var(--glass-edge);
}

/* The same colored glass as the big hexagon */
.theme-swatch span {
    width: calc(100% - 3px);
    height: calc(100% - 3px);
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 60%),
        var(--c);
}

/* The name, in the theme's own color. (The brain hands over the color as --c.)
   Plain like the sheet's words, with just a thin white rim so it stays sharp on the glass. */
.theme-name {
    font-weight: 600;
    color: var(--c);
    text-shadow: 0 0 2px #fff;
}

/* The check mark (only on the theme you're using) */
.theme-check {
    color: var(--c);
    visibility: hidden;
}

.theme-option[aria-checked="true"] .theme-check {
    visibility: visible;
}

/* Turned off motion? No spinning, no popping. */
@media (prefers-reduced-motion: reduce) {
    #themeHex  { transition: none; }
    #themeMenu { animation: none; }
}
```

| Word | Baby words |
|---|---|
| `::before` | A fake extra piece the clothes make by themselves, stuck at the start. Here: the "0" corner box, and the row-number column behind each swatch. |
| `content: ""` | The fake piece has no words. (Without this line, it doesn't show up at all!) |
| `grid-template-columns: 36px 1fr auto` | 3 columns: 36px for the swatch, ALL the leftover room for the name, then just enough for the ✓. |
| `position: absolute` + `top: 0; bottom: 0; left: 0` | "Ignore the columns. Stick to the left edge, from the very top to the very bottom." |
| `position: relative` (on the row) | "Things stuck with `absolute` inside me measure from MY edges." |
| `z-index: 1` (on the swatch) | "Stack me on top," so the row-number column doesn't cover it. |
| `justify-self: center` | Sit in the middle of your column, side to side. |
| `:nth-child(odd)` / `:nth-child(even)` | The 1st, 3rd, 5th... / the 2nd, 4th, 6th... That's how each row knows which way to flip the board. |
| `color-mix(in srgb, var(--theme-glow) 25%, transparent)` | "The theme's glow color, but only 25% as strong." Mixes a color with see-through. |
| `box-shadow: inset 0 0 12px ...` | A glow on the INSIDE edges of a box. Makes a square look lit from within. |
| `filter: brightness(1.12)` | Make everything in it 12% brighter: both squares AND the swatch, all at once. |
| `:last-child` | Only the very last one. |
| `text-shadow` | A shadow behind the LETTERS. A tiny light one = a thin rim that keeps the letters sharp. |
| `visibility: hidden` | Invisible, but still takes up its space (so nothing jumps around). |

> **Why build it from the sheet's parts?** One design language for the whole page. When the menu uses the same glass, header row, row-number column and 30px rows as the CSV window, your eyes already know how to read it. AND it uses the same theme color NAMES (`--glass-top`, `--header-bg`...), so a new theme repaints the menu too, for free.

> **How does the chessboard flip?** Each row is 2 squares: the `::before` (behind the swatch) and the row itself (behind the name). Odd rows paint `::before` dark and the row light. Even rows do the opposite. The header row starts it off: light corner, dark title. So every square is the opposite of the one beside it AND the one above it.

> **Why does the header's dark color start at 36px?** The corner box (`::before`) is drawn INSIDE the header row, and `--square-light` is half see-through. If the whole header row were dark, the corner would be half-white over near-black = a muddy grey, darker than every other light square. `linear-gradient(90deg, transparent 36px, var(--square-dark) 36px)` = "see-through for the first 36px, dark after that." Two colors at the SAME spot (36px) = a sharp edge, not a fade.

> **Why does the name turn white on a dark square?** Dark theme-colored text on a dark theme-colored square would vanish. White with a glow in the theme's OWN color (`--c-glow`) stays readable, and still tells you whose row it is.

> **Why `overflow: hidden`?** The header row is a plain rectangle. Without it, its square corners would poke out past the menu's round corners.

<br>

### Step 4.4: The brain

Add this at the **very bottom** of `scriptI.js`:

```js
// The list of themes. Each one: a name tag (id), a name you read, its color, and its glow.
const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#2a2e35', glow: 'rgba(165, 175, 190, 0.95)' },
];

const themeHex  = document.getElementById('themeHex');      // the hexagon button
const themeMenu = document.getElementById('themeMenu');     // the floating menu
const themeList = document.getElementById('themeList');     // the list of themes inside it

let currentTheme = THEMES[0];                               // Neo-Neutral is the default


// Put on a theme.
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme.id;      // <html data-theme="neo-neutral">  →  styleI.css picks the colors
    themeHex.title = 'Theme: ' + theme.name;
    buildThemeList();                                       // move the check mark
}


// Build one button per theme:    [⬢]  Neo-Neutral  ✓
function buildThemeList() {
    themeList.innerHTML = '';

    for (const theme of THEMES) {
        const option = document.createElement('button');
        option.className = 'theme-option';
        option.setAttribute('role', 'menuitemradio');
        option.setAttribute('aria-checked', theme === currentTheme);

        // Hand the colors to the clothes (see ".theme-name" in styleI.css)
        option.style.setProperty('--c', theme.color);
        option.style.setProperty('--c-glow', theme.glow);

        const swatch = document.createElement('span');
        swatch.className = 'theme-swatch';
        swatch.appendChild(document.createElement('span'));     // the solid color, inside the outline

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


function openThemeMenu() {
    themeMenu.hidden = false;
    themeHex.setAttribute('aria-expanded', 'true');
    themeList.querySelector('[aria-checked="true"]').focus();   // so the keyboard is ready to pick
}

function closeThemeMenu() {
    themeMenu.hidden = true;
    themeHex.setAttribute('aria-expanded', 'false');
}


// Click the hexagon → open. Click it again → close.
themeHex.addEventListener('click', function () {
    if (themeMenu.hidden) {
        openThemeMenu();
    } else {
        closeThemeMenu();
    }
});


// Click somewhere that's NOT the menu or the hexagon → close.
document.addEventListener('click', function (event) {
    if (!themeMenu.hidden && !themeMenu.contains(event.target) && !themeHex.contains(event.target)) {
        closeThemeMenu();
    }
});


// Press Escape → close, and go back to the hexagon.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !themeMenu.hidden) {
        closeThemeMenu();
        themeHex.focus();
    }
});


// Start with the default.
setTheme(currentTheme);
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
| `.contains(event.target)` | "Was the click INSIDE this piece?" |
| `option.append(a, b, c)` | Put a, b, and c inside the button, in that order. |
| `.focus()` | Move the keyboard to this piece, like you clicked into it. |

<br>

### ✅ Test it

Refresh. You should have:

- [ ] A darker grey page than before (that's Neo-Neutral)
- [ ] A solid slate hexagon in the top-left, with a bright glowing outline
- [ ] Mouse on it → it grows a little and glows brighter
- [ ] In the menu, the tiny hexagon is solid with a crisp white outline (no glow)
- [ ] Click it → it turns, and the menu pops down underneath
- [ ] **Neo-Neutral**, glowing, with a ✓ next to it
- [ ] Click the name, click anywhere else, or press **Escape** → the menu goes away
- [ ] Open a CSV with the menu open: the menu looks **brighter and closer** than the CSV window

**Now you're done!** 🎉

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
| **Build more/fewer extra rows** | Change `EXTRA_ROWS`. More = safer for super-fast scrolling, but a little more work per scroll. |
| **Make the glow stronger** | In `.cell:hover`, raise `14px 2px` to something like `20px 6px` |
| **Let columns get wider** | In `setColumnWidths`, change the `40` |
| **Change the page color** | In the Neo-Neutral block at the top of the clothes, change `--page` |
| **Make the glass greyer or clearer** | Change `--glass-top` and `--glass-bottom`. A bigger last number = more solid. |
| **Add a new theme** | Copy the whole `[data-theme="neo-neutral"]` block, change the name (like `"midnight"`) and the colors. Then add one line to `THEMES` in the brain with the same `id`. It shows up in the menu by itself. |
| **Move the hexagon** | `#themeHex` → `top` and `left`. Move `#themeMenu`'s `top` too, so the menu stays under it. |
| **Stop the hexagon from spinning** | Delete the `#themeHex[aria-expanded="true"]` rule |
| **Change the search color** | `mark` → `background` |
| **Change the flash color** | `@keyframes flash` → the `rgba(...)` |
| **Make the loader show up sooner (or later)** | Change `LOADER_DELAY`. `0` = it shows up for every file, even tiny ones (not recommended, it'll flash). |
| **Make the cloud blurrier** | In `#loader.show`, raise `blur(8px)` to something like `blur(14px)` |
| **Make the pie bigger** | In `#loaderPie`, change both `64px` |
| **Build more/fewer extra columns** | Change `EXTRA_COLUMNS`. More = safer for fast sideways scrolling, but every row gets a little heavier. |
| **Change when the scrollbars get "scaled"** | Change `MAX_SCROLL_WIDTH` (sideways) or `MAX_SCROLL_HEIGHT` (up and down). Keep them under about 4,000,000: browsers stop drawing text past ~8 million pixels, and on sharp 2× screens that limit comes twice as soon. |
| **Change the buttons' accent color** | Change `--control-accent` in the theme block. `var(--corner-bg)` = the table's corner. Try `var(--square-dark)` for near-black buttons like the theme menu (then also set `color: #fff` in `button`). |
| **Move Expand closer (or further)** | `#expandBtn` → the `28px` in `margin`. |
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
| Stripes jump around while scrolling | The CSS still uses `.line:nth-child(even)` instead of `.line.zebra`. |
| The window isn't header + 15 rows | The numbers don't match in both places, or the row height isn't 30. |
| Picking a file does nothing, and the Console says `startLoading is not defined` | Step 2.14 (the loader) is missing from the brain. |
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
| The window has empty glass at the bottom | `sizeWindow` still uses `WINDOW_SIZE` instead of `rowsToShow`. |
| Deep in a huge file, the rows show numbers but the cells are BLANK | The rows area is taller than ~8 million pixels, where browsers stop drawing text. Check `MAX_SCROLL_HEIGHT` and that `render` sets `rowsScaled` and `rowsHeight`. |
| On a huge file, the wheel jumps hundreds of rows per click | Something still reads `outputBox.scrollTop` directly instead of `readViewY()`, or sets it instead of calling `setViewY()`. |
| Colors are missing and everything looks see-through or white | A color name is misspelled. `var(--pgae)` finds nothing. Check every `var(--...)` against the theme block. |
| The hexagon is a square | The `clip-path` line is missing, or there's a typo in the 6 points. |
| The hexagon has no glow or shadow | The `drop-shadow` is on a piece WITH the scissors. It has to be on `#themeHex`, the outside piece. |
| The hexagon has no outline (it's just one solid color) | `.hex-inner` is missing its `calc(100% - 4px)` size, so it covers the whole outline layer. |
| The outline is only on the top and bottom, not the slanted sides | You used `border` instead of the 2-layer trick. The scissors cut the border off the slanted sides. |
| The hexagon has a SQUARE glow or shadow behind it | `#themeHex` is missing `box-shadow: none;`. The "ALL THE BUTTONS" glow is sneaking in. |
| "Row #" and "Go to row" have a gap between them | `#controls` is missing `display: flex;`. Without it, the space between them in the skeleton shows up as a gap. |
| The controls aren't all the same height | One of them is missing `line-height: 34px;` (or has a different number). |
| "Choose File" still looks like a plain grey button | The `#csvFileInput::file-selector-button` rule is missing or misspelled. |
| The hexagon turns grey when you hover it | `#themeHex:hover` is missing `background: none;` (the "ALL THE BUTTONS" hover is sneaking in). |
| The menu opens but is empty | `buildThemeList` never ran. Make sure `setTheme(currentTheme);` is the very last line of the brain. |
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

- **It expects a header.** The first line is always treated as the column names.
- **A quote that never closes still changes its OWN row.** The brain catches a stray `"` and keeps every other row safe, but in that one row, everything after the `"` lands in one cell. (`Bob,5'10",tall` → `[Bob] [5'10,tall]`.) The real fix is in the file.
- **A real cell with a line break AND over 32,767 letters after it** gets treated like a stray quote. (Excel couldn't hold that cell either.)
- **Huge cells only show their first 1,000 letters**, in the box and the hover. Search still finds words past that, but you won't see the yellow.
- **No typo help.** `Jon` won't find `John`.
- **Whole rows only.** You can't search just one column.
- **In Expand mode,** the header doesn't follow you down the page.
- **Search can find a match you can't see.** On a wide file, a row might match because of something way off to the side. It shows up in the results, but the yellow is off-screen. (A "jump to the match" button would fix this.)
- **Super-wide sheets scroll fast sideways.** Past `MAX_SCROLL_WIDTH`, each pixel of scrollbar covers many pixels of sheet. On the million-column test file, one click of Shift + wheel jumps about 14 columns instead of 1 or 2. (Fine for zooming across a giant sheet, but not for reading cell by cell. A fix: catch Shift + wheel in the brain and move a set number of columns, like the vertical wheel moves a set number of rows.)
- **Dragging the scrollbar on a HUGE file is coarse.** Past about 133,000 rows the scrollbar is squeezed, so one pixel of dragging jumps several rows. (The wheel and Go to row are still exact. It snaps to a whole row when you let go.)
- **Really, REALLY huge files** (around 1 GB) may be too big for the browser to read at all. Everything up to a few hundred MB is fine.
