# Build the CSV Reader From Scratch

You're going to build a web page that opens a CSV file and shows it like a **mini Excel sheet** inside a floating glass window:

- Row 0 (the column names) stays stuck to the top
- 15 rows show at a time, and scrolling snaps row by row
- Every value sits in its own box, and the columns line up
- Search paints your word yellow
- Go to any row, or expand to see everything
- **It stays fast, even with hundreds of thousands of rows**
- A small glass **theme chip** in the corner unfolds into a theme menu (the default theme is **Neo-Neutral**)
- It opens **Excel files (`.xlsx`)** too, with dates done carefully (Part 5)
- A **snap menu** ("the aimbot") locks onto search matches and snaps the sheet right to them, even thousands of columns away (Part 6)
- **Drag mode**: hold on the sheet and drag it in any direction, with a mouse, a trackpad, or a finger (Part 7)
- **Spreadsheet View ↔ CSV View**: flip any file between the CSV look and Excel's look (letters on top, Excel's row numbers, a wider grid), like turning a card over (Part 8)

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

(Later, Part 5 adds a 4th file: `xlsxI.js`, **the translator**, which reads Excel files.)

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

    // Handing over new columns can change how wide the WINDOW is (it fits the sheet, up to its max-width).
    // Wider window = more columns fit. So check again, once, with the new width.
    // But only for a sheet NARROWER than the window can get: a wider one already fills it, so nothing can change.
    // (Checking makes the browser lay out the whole sheet RIGHT NOW, in the middle of scrolling. Skip it when we can.)
    const widest = parseFloat(getComputedStyle(outputBox).maxWidth);       // (from the clothes: 900px)
    const couldGrow = !(widest > 0) || NUM_WIDTH + sheetWidth < widest + 2;

    if (couldGrow && !updateColumns.again && outputBox.clientWidth - NUM_WIDTH > viewWidth + 1) {
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
        statusText.textContent = (word === ''
            ? 'This file only has a header row'
            : 'No rows match "' + word + '"') + fileNote;
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
        inset 0 1px 0 rgba(255, 255, 255, 0.9);         /*  shiny line on the top edge  */

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
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
    color: #fff;
    text-shadow: 0 0 8px var(--theme-glow);
    font-weight: 600;
}

/*  The "0" corner box  =  a LIGHT square  */
.menu-title::before {
    content: "";
    background: var(--square-light);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);        /*  glowing white from inside  */
    border-right: 1px solid rgba(255, 255, 255, 0.6);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
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
    border-right: 1px solid rgba(255, 255, 255, 0.6);
}

/*  1st, 3rd, 5th theme...  (the header was dark-on-the-right, so flip it):
    swatch  =  DARK square,   name  =  LIGHT square  */
#themeMenu .theme-option:nth-child(odd) {
    background: var(--square-light);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);
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
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);
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
        inset 0 0 0 1px rgba(255, 255, 255, 0.95),
        0 0 14px 2px rgba(255, 255, 255, 0.9);
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

**The CSV reader is done!** 🎉 Four more parts: Part 5 teaches it to open Excel files, Part 6 adds the snap menu, Part 7 adds drag mode, and Part 8 adds Spreadsheet View.

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
            <input type="file" id="csvFileInput" accept=".csv,.xlsx" tabindex="-1" aria-hidden="true">
```

...and the badge (and the sheet tabs, Step 5.13) get their spots under the file bar:

```html
    <div id="fileBadge" hidden></div>
    <div id="sheetTabs" role="tablist" aria-label="Sheets" hidden></div>
```

**2.** The translator gets plugged in right **before** the brain (the brain uses it):

```html
    <script src="xlsxI.js"></script>
    <script src="scriptI.js"></script>
```

| Code | Baby words |
|---|---|
| `accept=".csv,.xlsx"` | The file picker shows CSV AND Excel files. |
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
        useText(text);                      //  the text is good.  Cut it up!
    };


    //  CUT UP THE TEXT  (a CSV file's text,  or an Excel file's sheet turned into CSV text).
    function useText(text) {

        let spot = 0;                       //  where we are in it
```

...and at the very end of the cutting part, the `};` after `cutSomeRows();` becomes just `}` (it now closes `useText`, not `onload`).

**4.** When the new file is swapped in ("ALL DONE"), remember its Excel notes, and show the badge:

```js
            xlsxInfo    = excel;                //  the Excel notes  (null for a CSV)
            fileNote    = excel !== null
                ? (excel.hasDates ? '  ·  dates shown as YYYY-MM-DD  (originals kept)' : '') +
                  (excel.unsolved > 0 ? '  ·  ' + excel.unsolved + ' formula(s) had no saved answer  (shown as formulas)' : '') +
                  (excel.recalc ? '  ·  ⚠ this file asks Excel to recalculate:  formula answers may be out of date' : '')
                : encoding === 'windows-1252'
                ? '  ·  read as Windows-1252  (an older Excel format)'
                : '';
            //  Which look?  A NEW file:  Excel files look like Excel,  CSVs like a CSV.
            //  Another sheet tab of the same file  (sheet !== null):  keep the look you picked.
            if (sheet === null) excelLook = excel !== null;
            applyLook();                        //  the window,  the button,  and the badge  ("XLSX SPREADSHEET")
```

> **Building in order?** `excelLook` and `applyLook()` arrive in Part 8 (Spreadsheet View). Until then, write just `showBadge();` in place of the `if (sheet === null) ...` and `applyLook();` lines.

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
//    A CSV?  No badge.
//    (An Excel file keeps its badge in BOTH looks,  so flipping never moves anything above the window.)
//
// ----------------------------------------------------------

const fileBadge = document.getElementById('fileBadge');
const sheetTabs = document.getElementById('sheetTabs');

function showBadge() {

    showSheetTabs();

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
        0 0 2px #fff,                                   /*  a white rim, so it's sharp on the glass  */
        0 0 6px var(--formula-glow);                    /*  the green glow  */
    pointer-events: none;                               /*  (so it doesn't get in the way of hovering the cell)  */
}

.cell.formula:hover::before {
    text-shadow:                                        /*  mouse on it?  glow brighter  */
        0 0 2px #fff,
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

    if (xlsxInfo === null || xlsxInfo.sheets.length < 2) {      //  a CSV, or just 1 sheet?  No tabs.
        sheetTabs.hidden = true;
        return;
    }

    xlsxInfo.sheets.forEach(function (sheet, i) {

        const tab     = document.createElement('button');
        const current = i + 1 === xlsxInfo.sheetNumber;

        tab.className = 'sheet-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', current);
        tab.textContent = sheet.name + (sheet.hidden ? '  (hidden)' : '') + (sheet.chart ? '  (chart)' : '');

        if (sheet.hidden) tab.classList.add('hidden-sheet');

        if (sheet.chart) {
            tab.disabled = true;
            tab.title = 'A chart sheet:  it has no rows to show.';
        } else if (!current) {
            const file = xlsxInfo.file;                         //  (the file, as it is right now)
            tab.title = 'Open the sheet "' + sheet.name + '"';
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
            <input type="file" id="csvFileInput" accept=".csv,.xlsx" tabindex="-1" aria-hidden="true">

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
    border-right: 1px solid rgba(255, 255, 255, 0.6);  /*  the white line between the 2 squares  */
    border-radius: 0;
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.55);
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
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);   /*  glowing white from inside  */
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
    border-right: 1px solid rgba(255, 255, 255, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
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
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
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
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.8);   /*  glowing white from inside  */
    border-bottom: 1px solid rgba(255, 255, 255, 0.6);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
}

.row-name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: #333;
    background: var(--line-num-bg);                     /*  like the sheet's row-number column  */
    border-right: 1px solid rgba(255, 255, 255, 0.6);
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
    const viewWidth = Math.max(outputBox.clientWidth - NUM_WIDTH, 0);
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
        (excelLook ? '  (' + columnName(col) + (row + 2) + ')' : '');

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
        (excelLook ? '  ·  ' + columnName(col) + (row + 2) : '');

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
        name.textContent = (headerCells[c] || 'column ' + (c + 1)) + (excelLook ? '  ·  ' + columnName(c) : '');
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

> **Building in order?** A few lines here use `excelLook` and `rowShift()`: they come in Part 8 (Spreadsheet View). Until then, read `excelLook` as `false` and `rowShift()` as `0`.

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

    "perspective"  =  how far away your eye is:  the near edge looks bigger,  so it reads as 3D.
    Only "transform" changes:  the cheapest thing to animate.
    (Written AFTER  "#output.expanded",  so the flip wins over its  "animation: none".)  */
#output.flip-away {
    animation: flip-away 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;     /*  speeding up as it turns away  */
}

#output.flip-back {
    animation: flip-back 0.36s cubic-bezier(0.16, 1, 0.3, 1);          /*  slowing down softly as it lands  */
}

@keyframes flip-away {
    from { transform: perspective(2400px) rotateY(0deg); }
    to   { transform: perspective(2400px) rotateY(90deg); }
}

@keyframes flip-back {
    from { transform: perspective(2400px) rotateY(-90deg); }
    to   { transform: perspective(2400px) rotateY(0deg); }
}
```

| Code | Baby words |
|---|---|
| `max-width: 1320px` | The spreadsheet look can be up to 1320px wide (the CSV look: 900px). |
| `perspective(2400px)` | How far away your eye is. The near edge of the turning window looks bigger, so it reads as 3D. |
| `rotateY(90deg)` | Turn around the up-and-down line, a quarter turn: edge-on, invisible. |
| `from { ... rotateY(-90deg) }` | Turning back starts from the OTHER side, so it looks like the back of the card coming around. |
| `forwards` | When the turn-away ends, STAY turned away (until the brain swaps in the turn-back). |
| `cubic-bezier(0.4, 0, 1, 1)` | Turning away: starts slow, speeds up. `(0.16, 1, 0.3, 1)` turning back: fast, then lands softly. |

> **Why switch while it's edge-on?** The window gets WIDER (and taller, by the letters row). Animating a size change makes the browser redo the whole layout every frame: slow. Edge-on, nobody can see it change, so it just happens in one go, and only the cheap turning is animated.

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
let excelLook      = false;  //  showing the file like EXCEL?  ("Spreadsheet View":  letters on top,  Excel's row numbers)
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
    const room  = excelLook ? EXCEL_WINDOW - NUM_WIDTH - 2 - 18 - dataWidth : 0;
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
            //  Which look?  A NEW file:  Excel files look like Excel,  CSVs like a CSV.
            //  Another sheet tab of the same file  (sheet !== null):  keep the look you picked.
            if (sheet === null) excelLook = excel !== null;
            applyLook();                        //  the window,  the button,  and the badge  ("XLSX SPREADSHEET")
```

**5.** The letters row. At the end of `drawHeader` (Step 2.10), after `headerBox.appendChild(row);`:

```js
    //  The spreadsheet look:  a row of column LETTERS on top  (A, B, C ... Z, AA ...),  like Excel's.
    //  Copy the names row  (so every box is exactly the same size),  then swap in the letters.
    if (excelLook) {
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


//  Dress the page for the look we're in:  the window,  the button,  the badge.
function applyLook() {
    outputBox.classList.toggle('excel', excelLook);
    viewBtn.textContent = excelLook ? 'CSV View' : 'Spreadsheet View';
    viewBtn.classList.toggle('to-csv', excelLook);     //  the clothes:  Excel green  ->  or  ->  black
    showBadge();
}


//  Excel's row numbers start 1 higher  (its row 1 is the column names).   "How much to add?"
function rowShift() {
    return excelLook ? 1 : 0;
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
    //  ("animationend" also hears the cells' own animations,  like the snap pulse:  only listen to the WINDOW's.)
    flipping = true;
    outputBox.classList.add('flip-away');

    outputBox.addEventListener('animationend', function turned(e) {
        if (e.target !== outputBox) return;
        outputBox.removeEventListener('animationend', turned);

        switchLook();
        outputBox.classList.replace('flip-away', 'flip-back');

        outputBox.addEventListener('animationend', function back(e) {
            if (e.target !== outputBox) return;
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
| `classList.replace('flip-away', 'flip-back')` | Swap one label for the other, in one go. |

> **Why put the scroll spot back by hand?** The letters row makes the header taller. The browser tries to be helpful ("scroll anchoring") and nudges the scrollbar to make up for it, so you'd land one row off. `setViewY(y)` puts you back exactly.

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
| **Open Excel files in the CSV look, too** | In "ALL DONE", change `excelLook = excel !== null;` to `excelLook = false;`. |
| **Change the button colors** | `#viewBtn` → `background` (`#185c37`, the green) and `#viewBtn.to-csv` → `background` (`#020202`, the black). |
| **Build more/fewer extra rows** | Change `EXTRA_ROWS`. More = safer for super-fast scrolling, but a little more work per scroll. |
| **Make the glow stronger** | In `.cell:hover`, raise `14px 2px` to something like `20px 6px` |
| **Let columns get wider** | In `setColumnWidths`, change the `40` |
| **Change the page color** | In the Neo-Neutral block at the top of the clothes, change `--page` |
| **Make the glass greyer or clearer** | Change `--glass-top` and `--glass-bottom`. A bigger last number = more solid. |
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
