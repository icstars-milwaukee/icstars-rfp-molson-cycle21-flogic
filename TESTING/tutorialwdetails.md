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

Open `scriptI.js`. First, 6 settings, then the brain finds every piece by its name tag:

```js
const WINDOW_SIZE = 15;     // how many rows fit in the window (plus the header)
const EXTRA_ROWS  = 15;     // extra rows to build above and below the ones you see (a whole window's worth)
const BIG_FILE    = 20000;  // bigger than this? search waits until you stop typing
const GLIDE       = 0.25;   // how fast the wheel glide catches up (bigger = snappier, smaller = floatier)
const CHUNK_TIME  = 12;     // big jobs are done in BITES of about 12 milliseconds, so the page never freezes
const LOADER_DELAY = 150;   // the loader only shows up if a job takes longer than this (milliseconds)

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
let dataRows    = [];     // EVERY other row, cut into cells.    Like: [["Ana", "22"], ["Bo", "31"]]
let searchText  = null;   // every row squished into small letters, ready to search (made on your first search)
let columnCount = 0;      // how many columns the widest row has
let matches     = [];     // ALL the rows that pass the search, as their spot in dataRows.  Like: [0, 4, 9]
let allRows     = null;   // the list for "no search": [0, 1, 2, 3 ...] every row. Made once, then reused.
let query       = '';     // the search word, in small letters

let rowHeight   = 30;     // how tall one row is (measured for real later)
let builtStart  = 0;      // the rows that are BUILT right now:
let builtEnd    = 0;      //    from builtStart, up to (but not including) builtEnd

let searchTimer = null;   // "wait until they stop typing" timer
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

> **Why is `matches` just numbers?** Each match is the row's **spot** in `dataRows` (`0`, `1`, `2`...). Its row **number** is that `+ 1`, because the header is row 0. A million plain numbers is MUCH lighter for the browser than a million little `{ num, cells }` objects.

> **A list inside a list?** `dataRows` is a list of ROWS, and each row is a list of CELLS. Just like a spreadsheet: rows going down, cells going across.

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
                current += letter;          // anything else (even a comma!) is part of the cell
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

<br>

### Step 2.4: How wide is each column? (`setColumnWidths`)

Make each column fit the longest thing in it. Not too skinny (6 letters), not too fat (40 letters).

The longest things get measured **while the file is being cut up** (Step 2.15), and handed over as a list called `longest`. Like `[12, 3, 25]` = 12 letters, 3 letters, 25 letters.

```js
function setColumnWidths(longest) {

    const widths = [];

    for (let col = 0; col < columnCount; col++) {

        // Squeeze it between 6 and 40.
        // (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest[col] + 2, 6), 40);

        // "ch" = the width of one letter. +16px for the padding on both sides.
        widths.push('calc(' + letters + 'ch + 16px)');
    }

    // Hand the widths to the clothes as one list.
    // The row-number column is always 60px.
    outputBox.style.setProperty('--columns', '60px ' + widths.join(' '));
}
```

| Code | Baby words |
|---|---|
| `longest[col]` | The longest thing in column number `col` |
| `Math.max(a, b)` | The BIGGER of the two |
| `Math.min(a, b)` | The SMALLER of the two |
| `--columns` | A note the brain leaves for the clothes. The clothes read it in Part 3. |

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

    // One box for every column.
    // (If this row is missing some cells, those boxes are just empty.)
    for (let col = 0; col < columnCount; col++) {

        const text = cells[col] || '';

        const cell = document.createElement('span');
        cell.className = 'cell';

        if (looksLikeNumber(text)) cell.classList.add('num');      // numbers go on the right

        if (text.length > 40) cell.title = text;                   // too long? hover to read it all

        paintMatches(cell, text, query);

        row.appendChild(cell);
    }

    return row;
}
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

> **Wait, is the file loaded or not?** YES, the whole file is loaded. When you pick a file, every line is read and cut into cells right away (that's `dataRows`). The trick only limits how many rows get **drawn** as boxes on the page. Drawing boxes is the slow part, so the brain only draws what you can see.

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
    let viewTop, viewHeight;

    if (outputBox.classList.contains('expanded')) {
        viewTop    = -rowsBox.getBoundingClientRect().top;      // how far the rows' top has scrolled above the screen
        viewHeight = window.innerHeight;                        // the whole screen
    } else {
        viewTop    = scrollSpot !== undefined ? scrollSpot : outputBox.scrollTop;
        viewHeight = outputBox.clientHeight;                    // the window
    }

    // Turn that into row numbers (+ extras), kept inside 0 ... the last row.
    const start = Math.max(0, Math.floor(viewTop / rowHeight) - EXTRA_ROWS);
    const end   = Math.min(matches.length, Math.ceil((viewTop + viewHeight) / rowHeight) + EXTRA_ROWS);

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
    topSpacer.style.height    = (start * rowHeight) + 'px';
    bottomSpacer.style.height = ((matches.length - end) * rowHeight) + 'px';
}


// Build rows "from" up to (but not including) "to", in a hidden box, then hand them over all at once.
function buildRows(from, to) {

    const fragment = document.createDocumentFragment();

    for (let i = from; i < to; i++) {
        const spot = matches[i];                // where this row lives in dataRows
        fragment.appendChild(makeRow(spot + 1, dataRows[spot], query, i));
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
    const first = Math.min(Math.round(outputBox.scrollTop / rowHeight), matches.length - 1);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    // expanded? you see them all
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    // small? the top row + 14 more

    // matches holds spots in dataRows (0, 1, 2...). Row numbers start at 1 (the header is 0). So: +1.
    let message = 'Rows ' + (matches[first] + 1) + '–' + (matches[last] + 1);

    if (word === '') {
        message += ' of ' + dataRows.length;
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

```js
function sizeWindow() {

    outputBox.style.height = '';    // start fresh

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;   // how tall the scrollbar is

    // the header + 15 rows + the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}
```

<br>

### Step 2.12: Pick the rows to show (`render`)

This runs after you pick a file AND every time you search. It decides WHICH rows pass the search, then hands off to `buildVisibleRows` (Step 2.9) to actually build them.

```js
function render() {

    // Your search word, in small letters. ("ANA" and "ana" find the same thing.)
    query = searchInput.value.trim().toLowerCase();

    // The first time you search, the search copy isn't ready yet.
    // Get it ready (Step 2.13), and it'll come back here when it's done.
    if (query !== '' && searchText === null) {
        buildSearchText();
        return;
    }

    // Pick which rows to show.
    //   No search word?  keep every row. (Use the "every row" list. Make it the first time.)
    //   Search word?     keep only rows that have it.
    // Each match is just the row's spot in dataRows (0, 1, 2...).
    if (query === '') {

        if (allRows === null) {
            allRows = dataRows.map(function (cells, i) { return i; });
        }
        matches = allRows;

    } else {

        matches = [];

        for (let i = 0; i < dataRows.length; i++) {
            if (searchText[i].includes(query)) matches.push(i);
        }
    }

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
    sizeWindow();                 // make the window header + 15 rows tall
    outputBox.scrollTop = 0;      // start at the top
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

<br>

### Step 2.13: Get the search ready (`buildSearchText`)

The first time you search, every row gets squished into one small-letter string. Every search after that just checks those strings. (Way faster.)

```text
   ["Ana", "22", "Chicago"]   →   "ana␀22␀chicago"
```

The `␀` is an invisible "wall," so a search can never match ACROSS two cells.

On a huge file, squishing a million rows at once would **freeze** the page. So the brain does it in **bites**: work for a moment, let the screen breathe, work again. The loader (Step 2.14) shows how far along it is. When it's done, it runs `render()` again, and the search happens for real.

```js
function buildSearchText() {

    if (buildingSearch) return;             // already on it? (You typed more while it works.) Don't start twice.
    buildingSearch = true;

    const myLoad = loadId;                  // which file this is for
    const rows   = dataRows;                // hold on to THIS file's rows
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

        while (i < rows.length && performance.now() < stopAt) {

            const last = Math.min(i + 500, rows.length);

            for (; i < last; i++) {
                built.push(rows[i].join('\u0000').toLowerCase());
            }
        }

        setProgress(i / Math.max(rows.length, 1));

        // More to do? Let the screen breathe, then take the next bite.
        if (i < rows.length) {
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

    // Couldn't read it? Put the loader away, and turn search back on (if there's an old file to search).
    reader.onerror = function () {
        searchInput.disabled = headerCells.length === 0;
        finishLoading();
    };

    // This part waits until the file is DONE reading.
    reader.onload = function (e) {

        if (myLoad !== loadId) return;    // you picked a newer file in the meantime? Forget this one.

        const text = e.target.result;     // the whole file, as one long string
        let spot = 0;                     // where we are in it


        // Cut off the NEXT line, and move "spot" past it.
        // (Windows ends lines with \r\n, Mac and Linux with just \n. This handles both.)
        function nextLine() {

            let lineEnd = text.indexOf('\n', spot);         // find the next line break...
            const found = lineEnd !== -1;
            if (!found) lineEnd = text.length;              // ...none left? The line goes to the end.

            let cut = lineEnd;
            if (found && text.charCodeAt(cut - 1) === 13) cut--;     // 13 = the \r from Windows. Leave it off.

            const line = text.slice(spot, cut);
            spot = lineEnd + 1;
            return line;
        }


        // Line 0 = the header. Everything after it = the data rows.
        // (A file that ends with a line break doesn't get an extra empty row at the end.)
        const newHeader = splitIntoCells(spot < text.length ? nextLine() : '');
        const newRows   = [];

        // While we cut, remember the LONGEST thing in each column (for Step 2.4).
        const longest = newHeader.map(function (name) { return name.length; });

        setLoadingLabel('Cutting it into rows...');


        // Cut the rows in BITES, so the page never freezes.
        function cutSomeRows() {

            if (myLoad !== loadId) return;  // a newer file? stop.

            const stopAt = performance.now() + CHUNK_TIME;

            // Cut rows until this bite's time is up (checking the clock every 500 rows).
            while (spot < text.length && performance.now() < stopAt) {

                for (let n = 0; n < 500 && spot < text.length; n++) {
                    const cells = splitIntoCells(nextLine());
                    newRows.push(cells);

                    for (let col = 0; col < cells.length; col++) {
                        if (longest[col] === undefined || cells[col].length > longest[col]) {
                            longest[col] = cells[col].length;
                        }
                    }
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
            headerCells = newHeader;
            dataRows    = newRows;
            columnCount = longest.length;       // the widest row decides how many columns there are
            searchText  = null;                 // new file = throw away the old search copy
            allRows     = null;                 // ...and the old "every row" list

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

> **Why not just cut the whole file into lines at once?** On a giant file, that one step freezes the page by itself. Finding one line break at a time, in bites, keeps the page alive the whole way.

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

> Picked a REALLY big file? You might see the words "Cutting it into rows..." for a moment. That's the loader, with no clothes yet. Part 3 turns it into the cloud and the pie.

> Want proof it worked? Press **F12**, click **Elements**, and look inside `<div id="rows">`. You'll see the 2 spacer `<div>`s with a bunch of `<div class="line">` rows between them. Even for a huge file, there are only a few dozen. That's the speed trick working!

<br>

### Step 2.16: Search

Every time you type, show the rows again. On a BIG file, wait until you stop typing for a moment first:

```js
searchInput.addEventListener('input', function () {

    if (dataRows.length <= BIG_FILE) {
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
        window.scrollTo(0, rowsTopOnPage + index * rowHeight - window.innerHeight / 2);
        buildVisibleRows();

    } else {

        // Small window? Scroll the WINDOW so the row sits right under the header.
        // (Build the rows there FIRST, so the window has something to land on.)
        const top = index * rowHeight;
        buildVisibleRows(top);
        outputBox.scrollTop = top;
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
    buildVisibleRows();
    updatePosition();
});
```

The brain just flips the `expanded` label on and off. The **clothes** decide what "expanded" looks like.

> Even "show all" only BUILDS the rows on your screen. The page just gets as tall as all of them (thanks to the spacers).

<br>

### Step 2.19: When things scroll

```js
// The window scrolls → build the rows coming in, update the words,
// and start a countdown: still for 0.15 seconds? → snap to a whole row (Step 2.20).
outputBox.addEventListener('scroll', function () {
    buildVisibleRows();
    updatePosition();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToRow, 150);
});

// The page scrolls → only matters when expanded.
window.addEventListener('scroll', function () {
    if (outputBox.classList.contains('expanded')) buildVisibleRows();
});

// The browser window changes size → more or fewer rows might fit.
window.addEventListener('resize', function () {
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

    const bottom = outputBox.scrollHeight - outputBox.clientHeight;

    // Already at the very top or bottom? Let the PAGE scroll instead.
    if ((pixels < 0 && outputBox.scrollTop <= 0) || (pixels > 0 && outputBox.scrollTop >= bottom)) return;

    e.preventDefault();                     // "browser, don't scroll. I've got this."

    // No finish line yet? Start from the row we're on now.
    if (wheelTarget === null) {
        wheelTarget = Math.round(outputBox.scrollTop / rowHeight) * rowHeight;
        glideSpot = outputBox.scrollTop;
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
    if (Math.abs(outputBox.scrollTop - glideSpot) > 2) {
        gliding = false;
        wheelTarget = null;
        wheelLeft = 0;
        return;
    }

    const gap = wheelTarget - glideSpot;          // how far to the finish line

    // Basically there? Land EXACTLY on the row, and stop.
    if (Math.abs(gap) < 0.5) {
        glideSpot = wheelTarget;
        outputBox.scrollTop = wheelTarget;
        gliding = false;
        return;
    }

    // Move 25% of the way there.
    glideSpot += gap * GLIDE;
    outputBox.scrollTop = glideSpot;

    requestAnimationFrame(glideStep);             // same thing again, next redraw
}


function snapToRow() {

    wheelTarget = null;                     // the glide is over
    wheelLeft = 0;

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    // Already on a whole row? Nothing to do.
    const nearest = Math.round(outputBox.scrollTop / rowHeight) * rowHeight;
    if (Math.abs(outputBox.scrollTop - nearest) < 1) return;

    outputBox.scrollTo({ top: nearest, behavior: 'smooth' });
}
```

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

    --theme-color:  #4a5260;                        /* the theme's own color (the hexagon + its glowing name) */
    --theme-glow:   rgba(165, 175, 190, 0.95);      /* the glow around it */
}
```

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

#searchInput {
    width: 100%;
    max-width: 500px;
    padding: 10px 12px;
    font-size: 16px;
    border: 1px solid #bbb;
    border-radius: 6px;           /* round corners */
    box-sizing: border-box;
}

#status {
    text-align: center;
    color: var(--text-soft);
    font-size: 14px;
}

#controls {
    text-align: center;
    margin: 0 0 15px;
}

#jumpInput {
    width: 90px;
    padding: 8px;
    font-size: 14px;
    border: 1px solid #bbb;
    border-radius: 6px;
}

button {
    padding: 8px 14px;
    margin: 4px;
    font-size: 14px;
    border: 1px solid #888;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;              /* mouse turns into a pointing hand */
}

button:hover {
    background: #eaeaea;          /* a bit darker when your mouse is on it */
}

/* Top button: glued to the bottom-right corner */
#topBtn {
    position: fixed;
    right: 20px;
    bottom: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* "hidden" means hidden. Always. */
[hidden] {
    display: none !important;
}
```

`margin: 0 auto` = **"push equally from both sides"** = centered.

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
    backdrop-filter: blur(12px);                      /* frosts whatever is behind it */
    border: 1px solid var(--glass-edge);              /* thin shiny edge */
    border-radius: 18px;                              /* round corners */
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),              /* soft shadow below = floating */
        inset 0 1px 0 rgba(255, 255, 255, 0.9);       /* shiny line on top = light hitting glass */

    /* (No snapping rule here! The BRAIN snaps now. See Step 2.20.) */

    /* THIN SCROLLBAR */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;

    /* FLOATING: bob up and down forever. Don't like it? Delete this line. */
    animation: float 6s ease-in-out infinite;
}

/* The floating move: up 4 pixels, then back down */
@keyframes float {
    50% { transform: translateY(-4px); }
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
   z-index: 2 = "stack me on top of the rows." */
#header {
    position: sticky;
    top: 0;
    z-index: 2;
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

- [ ] A floating glass window: the header + exactly 15 rows
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

**You built it!** 🎉 One more piece to go.

<br>

---

<br>

# PART 4: The Theme Hexagon ⬢

A little glass **hexagon** in the top-left corner. Click it and a **theme menu** floats down. It shows the theme you're wearing (**Neo-Neutral**) with its name **glowing** in its own color.

```text
   ⬢   ← the hexagon  (a little spaced down, a little spaced over)
  ┌──────────────────────┐
  │ THEME                │   ← the floating menu
  │ ⬢  Neo-Neutral    ✓  │   ← glowing name + check mark = "you're wearing this one"
  └──────────────────────┘
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
   .hex          →  the bright outline       (outside)
   .hex-inner    →  the solid theme color    (inside, a little smaller, so the outline peeks out around it)
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

/* Layer 1: the bright outline */
.hex {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.92);
}

/* Layer 2: the solid theme color (4px smaller, so 2px of the outline shows all around) */
.hex-inner {
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    background: var(--theme-color);     /* solid */
}
```

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

The menu uses the **same glass as the CSV window**, but turned UP, so your eyes find it first. If both are open at once, they don't look the same:

| | CSV window | Theme menu |
|---|---|---|
| Glass | see-through | **brighter** |
| Edge | thin shiny line | thin shiny line + a **glowing ring** around it |
| Shadow | soft | **bigger** = it looks closer to you |
| Top | — | a **glowing line** across the top |
| Moves | bobs slowly | **pops in**, then stays still |

Add this right after the hexagon rules:

```css
#themeMenu {
    position: fixed;
    top: 94px;                  /* just under the hexagon */
    left: 20px;
    z-index: 10;
    min-width: 210px;
    padding: 10px 8px 8px;

    font-family: "Segoe UI", system-ui, Arial, sans-serif;

    background: linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.24));
    backdrop-filter: blur(16px) saturate(1.3);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 18px;

    box-shadow:
        0 0 0 4px rgba(255, 255, 255, 0.25),            /* the glowing ring */
        0 20px 50px rgba(0, 0, 0, 0.3),                 /* big shadow = closer to you */
        inset 0 1px 0 #fff,                             /* shiny top edge */
        inset 0 0 20px rgba(255, 255, 255, 0.35);       /* light glowing inside the glass */

    transform-origin: 30px 0;   /* grow out from under the hexagon */
    animation: menu-pop 0.18s ease-out;
}

/* The glowing line across the top */
#themeMenu::before {
    content: "";
    position: absolute;
    top: 0;
    left: 18px;
    right: 18px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, transparent, var(--theme-glow), transparent);
    box-shadow: 0 0 8px var(--theme-glow);
}

/* Pop in: start a little higher, a little smaller, and invisible */
@keyframes menu-pop {
    from { opacity: 0; transform: translateY(-6px) scale(0.96); }
}

/* The little "THEME" word on top */
.menu-title {
    margin: 0 10px 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-soft);
}

/* One theme in the list */
#themeMenu .theme-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: none;
    text-align: left;
    font: inherit;
    font-size: 15px;
}

#themeMenu .theme-option:hover,
#themeMenu .theme-option:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.9);
}

/* The theme you're using right now */
#themeMenu .theme-option[aria-checked="true"] {
    background: rgba(255, 255, 255, 0.35);
}

/* The tiny hexagon next to the name: solid color with a white outline.
   (Too tiny for a glow. It would just look blurry.)
   Same 2 layers as the big hexagon: the swatch is the outline,
   the span inside it is the solid color. */
.theme-swatch,
.theme-swatch span {
    display: grid;
    place-items: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.theme-swatch {
    width: 16px;
    height: 18px;
    flex-shrink: 0;
    background: #fff;
}

.theme-swatch span {
    width: calc(100% - 3px);
    height: calc(100% - 3px);
    background: var(--c);
}

/* The GLOWING name, in the theme's own color.
   The brain hands over the colors as --c and --c-glow. */
.theme-name {
    flex-grow: 1;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--c);
    text-shadow:
        0 0 2px #fff,                                   /* a bright white rim, so the letters stay sharp */
        0 0 10px var(--c-glow),                         /* the colored glow */
        0 0 20px var(--c-glow);                         /* the glow fading out */
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
| `::before` | A fake extra piece the clothes make by themselves, stuck at the start. Here: the glowing line. |
| `content: ""` | The fake piece has no words. (Without this line, it doesn't show up at all!) |
| `text-shadow` | A shadow behind the LETTERS. Make it a light color and blur it, and it becomes a **glow**. |
| `display: flex` | Line things up in a row: swatch, name, check. |
| `flex-grow: 1` | "Take up all the leftover room." Pushes the check mark to the far right. |
| `visibility: hidden` | Invisible, but still takes up its space (so nothing jumps around). |

> **How does the glow work?** Three shadows stacked: a tiny sharp **white** one (keeps the letters crisp), then two big blurry ones in the theme's glow color. Blurry + light = glow.

<br>

### Step 4.4: The brain

Add this at the **very bottom** of `scriptI.js`:

```js
// The list of themes. Each one: a name tag (id), a name you read, its color, and its glow.
const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#4a5260', glow: 'rgba(165, 175, 190, 0.95)' },
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
| **Stop the floating** | Delete `animation: float 6s ease-in-out infinite;` in `#output` |
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
| The loader shows up but never goes away | `finishLoading();` is missing at the end of `cutSomeRows` (Step 2.15) or `squishSomeRows` (Step 2.13). |
| The loader flashes on and off for tiny files | `LOADER_DELAY` is `0`, or `startLoading` shows the loader right away instead of using `setTimeout`. |
| The pie jumps instead of filling smoothly | The `@property --done` block is missing or misspelled (it needs `syntax: "<number>"`). |
| The pie is just a plain circle that never fills | `setProgress` sets `--done` on the wrong piece. It has to be `loaderPie`. |
| The search bar stays greyed out after loading | `searchInput.disabled = false;` is missing from the "ALL DONE" part of Step 2.15. |
| Rows show the wrong numbers (off by one) | Somewhere is missing the `+ 1`. `matches` holds spots (start at 0), row numbers start at 1. |
| Colors are missing and everything looks see-through or white | A color name is misspelled. `var(--pgae)` finds nothing. Check every `var(--...)` against the theme block. |
| The hexagon is a square | The `clip-path` line is missing, or there's a typo in the 6 points. |
| The hexagon has no glow or shadow | The `drop-shadow` is on a piece WITH the scissors. It has to be on `#themeHex`, the outside piece. |
| The hexagon has no outline (it's just one solid color) | `.hex-inner` is missing its `calc(100% - 4px)` size, so it covers the whole outline layer. |
| The outline is only on the top and bottom, not the slanted sides | You used `border` instead of the 2-layer trick. The scissors cut the border off the slanted sides. |
| The hexagon turns grey when you hover it | `#themeHex:hover` is missing `background: none;` (the "ALL THE BUTTONS" hover is sneaking in). |
| The menu opens but is empty | `buildThemeList` never ran. Make sure `setTheme(currentTheme);` is the very last line of the brain. |
| The menu won't close when clicking outside | The `document.addEventListener('click', ...)` listener is missing. |
| The glowing line on the menu doesn't show | `content: "";` is missing from `#themeMenu::before`. |

<br>

## What it can't do (yet)

- **It expects a header.** The first line is always treated as the column names.
- **No line breaks inside a cell.** A value with a line break inside quotes will split into two rows.
- **No typo help.** `Jon` won't find `John`.
- **Whole rows only.** You can't search just one column.
- **In Expand mode,** the header doesn't follow you down the page.
- **Really, REALLY huge files** (around 1 GB) may be too big for the browser to read at all. Everything up to a few hundred MB is fine.
