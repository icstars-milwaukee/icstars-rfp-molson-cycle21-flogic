# Build the CSV Reader From Scratch

You're going to build a web page that opens a CSV file and shows it like a **mini Excel sheet** inside a floating glass window:

- Row 0 (the column names) stays stuck to the top
- 15 rows show at a time, and scrolling snaps row by row
- Every value sits in its own box, and the columns line up
- Search paints your word yellow
- Go to any row, or expand to see everything
- **It stays fast, even with hundreds of thousands of rows**

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

Open `scriptI.js`. First, 4 settings, then the brain finds every piece by its name tag:

```js
const WINDOW_SIZE = 15;     // how many rows fit in the window (plus the header)
const EXTRA_ROWS  = 15;     // extra rows to build above and below the ones you see (a whole window's worth)
const BIG_FILE    = 20000;  // bigger than this? search waits until you stop typing
const GLIDE       = 0.25;   // how fast the wheel glide catches up (bigger = snappier, smaller = floatier)

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
let matches     = [];     // ALL the rows that pass the search.  Like: [{ num: 1, cells: ["Ana", "22"] }]
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
```

`[]` = an empty list. `null` = "nothing yet." They're `let` because they'll change later.

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

Look at the longest thing in each column, and make the column fit it. Not too skinny (6 letters), not too fat (40 letters).

```js
function setColumnWidths() {

    const widths = [];

    for (let col = 0; col < columnCount; col++) {

        // Start with the header's length...
        let longest = (headerCells[col] || '').length;

        // ...then check every row for something longer.
        dataRows.forEach(function (cells) {
            longest = Math.max(longest, (cells[col] || '').length);
        });

        // Squeeze it between 6 and 40.
        // (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest + 2, 6), 40);

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
| `x \|\| ''` | "Use `x`. If there's nothing there, use empty instead." |
| `Math.max(a, b)` | The BIGGER of the two |
| `Math.min(a, b)` | The SMALLER of the two |
| `--columns` | A note the brain leaves for the clothes. The clothes read it in Part 3. |

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
        fragment.appendChild(makeRow(matches[i].num, matches[i].cells, query, i));
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

    let message = 'Rows ' + matches[first].num + '–' + matches[last].num;

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

    // The first time you search, squish every row into one small-letter string.
    // Every search after that just checks those strings. (Way faster.)
    //     ["Ana", "22", "Chicago"]  →  "ana␀22␀chicago"
    // The ␀ is an invisible "wall," so a search can't match ACROSS two cells.
    if (query !== '' && searchText === null) {
        searchText = dataRows.map(function (cells) {
            return cells.join('\u0000').toLowerCase();
        });
    }

    // Pick which rows to show.
    //   No search word?  keep every row.
    //   Search word?     keep only rows that have it.
    // Each row remembers its number (1, 2, 3... because the header is 0).
    matches = [];

    for (let i = 0; i < dataRows.length; i++) {
        if (query === '' || searchText[i].includes(query)) {
            matches.push({ num: i + 1, cells: dataRows[i] });
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
| `.join('\u0000')` | Glue the cells into one string, with an invisible wall (`\u0000`) between them |
| `.toLowerCase()` | Make every letter small |
| `.includes(query)` | "Does this have my word in it?" yes / no |
| `\|\|` | "or" |
| `===` | "is exactly equal to" |

<br>

### Step 2.13: Read the file

Now the brain listens for you picking a file:

```js
fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];   // the file you picked
    if (!file) return;                    // clicked Cancel? stop.

    const reader = new FileReader();      // a helper that reads files (comes with every browser)

    // This part waits until the file is DONE reading.
    reader.onload = function (e) {

        // Cut the file into lines. (Handles Windows AND Mac line endings.)
        const lines = e.target.result.split(/\r?\n/);

        // Files often end with an empty line. Throw it away.
        if (lines[lines.length - 1] === '') lines.pop();

        // Line 0 = the header. Everything after it = the data rows.
        // Every line gets cut into cells.
        headerCells = splitIntoCells(lines[0] || '');
        dataRows    = lines.slice(1).map(splitIntoCells);
        searchText  = null;               // new file = throw away the old search copy

        // How many columns? Count the cells in the widest row.
        columnCount = headerCells.length;
        dataRows.forEach(function (cells) {
            columnCount = Math.max(columnCount, cells.length);
        });

        // Clean slate for the new file.
        searchInput.value = '';
        searchInput.disabled = false;     // turn the search bar ON
        jumpInput.value = '';

        setColumnWidths();                // decide how wide each column is
        drawHeader();                     // draw row 0
        render();                         // show the rows!
    };

    reader.readAsText(file);              // GO! start reading.
});
```

| Code | Baby words |
|---|---|
| `.slice(1)` | "Everything from spot 1 onward" = everything except the header |
| `.map(splitIntoCells)` | "Run `splitIntoCells` on EVERY line, and give me a list of the answers" |

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

> Want proof it worked? Press **F12**, click **Elements**, and look inside `<div id="rows">`. You'll see the 2 spacer `<div>`s with a bunch of `<div class="line">` rows between them. Even for a huge file, there are only a few dozen. That's the speed trick working!

<br>

### Step 2.14: Search

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

### Step 2.15: Go to row

```js
jumpBtn.addEventListener('click', jumpToLine);

jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpToLine();        // pressing Enter works too
});

function jumpToLine() {

    const target = parseInt(jumpInput.value, 10);       // the number you typed
    if (isNaN(target) || matches.length === 0) return;  // not a number? nothing to show? stop.

    // Find the row with that number. (If it's hidden by a search, go to the next one.)
    let index = matches.findIndex(function (line) { return line.num >= target; });
    if (index === -1) index = matches.length - 1;       // number too big? go to the last row.

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
| `.findIndex(...)` | "Which spot in the list is the first one that fits?" |
| `querySelector('[data-index="5"]')` | "Find the row with the sticky note that says 5" (from Step 2.5) |

<br>

### Step 2.16: Expand / Shrink

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

### Step 2.17: When things scroll

```js
// The window scrolls → build the rows coming in, update the words,
// and start a countdown: still for 0.15 seconds? → snap to a whole row (Step 2.18).
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

### Step 2.18: Snappy scrolling

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

### Step 2.19: The Top button

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

### Step 3.1: The plain page

```css
body {
    font-family: system-ui, Arial, sans-serif;
    background: #d6d9de;          /* grey, so the glass window shows up */
    color: #222;
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
    color: #444;
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

### Step 3.2: The glass window

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
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.40), rgba(255, 255, 255, 0.10));
    backdrop-filter: blur(12px);                      /* frosts whatever is behind it */
    border: 1px solid rgba(255, 255, 255, 0.7);       /* thin shiny edge */
    border-radius: 18px;                              /* round corners */
    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),              /* soft shadow below = floating */
        inset 0 1px 0 rgba(255, 255, 255, 0.9);       /* shiny line on top = light hitting glass */

    /* (No snapping rule here! The BRAIN snaps now. See Step 2.18.) */

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

### Step 3.3: The header + the rows

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
    color: #666;
    background: rgba(225, 228, 233, 0.85);   /* almost solid, so cells slide UNDER it */
    border-right: 1px solid rgba(255, 255, 255, 0.6);
    user-select: none;            /* copying text skips the numbers */
    position: sticky;             /* stays stuck on the left when you scroll sideways */
    left: 0;
    z-index: 2;
}
```

> **Why does the BRAIN pick the zebra rows?** CSS has a way to pick "every other row" by itself, but it counts the invisible spacers too, so the stripes would jump around as rows get swapped in and out. The brain knows the real row numbers, so it does the striping.

<br>

### Step 3.4: The cells (Excel boxes) ✨

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

### Step 3.5: The header row (row 0)

```css
/* A bit more solid than the glass, with a darker line under it */
.header-row,
.header-row:hover {
    background: rgba(235, 238, 242, 0.92);
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
    background: rgba(220, 224, 230, 0.95);
}
```

<br>

### Step 3.6: Flash + search yellow

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

**Bonus test: the speed trick.** Make a giant CSV (a spreadsheet app can make one, or ask a teammate for one) and open it. It should pop up in under a second. Press **F12** → **Elements** → look inside `<div id="rows">`: only a few dozen rows exist, no matter how big the file is.

**You built it!** 🎉

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
| **Change the page color** | `body` → `background` |
| **Change the search color** | `mark` → `background` |
| **Change the flash color** | `@keyframes flash` → the `rgba(...)` |

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

<br>

## What it can't do (yet)

- **It expects a header.** The first line is always treated as the column names.
- **No line breaks inside a cell.** A value with a line break inside quotes will split into two rows.
- **No typo help.** `Jon` won't find `John`.
- **Whole rows only.** You can't search just one column.
- **In Expand mode,** the header doesn't follow you down the page.
- **Really, REALLY huge files** (around 1 GB) may be too big for the browser to read at all. Everything up to a few hundred MB is fine.
