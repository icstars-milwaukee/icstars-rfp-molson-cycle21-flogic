# Build the CSV Reader From Scratch

You're going to build a web page that opens a CSV file and shows it in a glass window, 15 lines at a time, with search.

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

```
  1. Skeleton   →   2. Brain   →   3. Clothes
```

> Why the brain before the clothes? So you can see it WORK first, then make it pretty.

<br>

**What you need:**
- A code editor (like VS Code)
- A web browser (like Chrome)
- Any `.csv` file to test with

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

    <!-- 4. The "Lines 1–15 of 100" words -->
    <p id="status">Pick a CSV file to get started.</p>

    <!-- 5. Go to line + Expand (hidden until a file is picked) -->
    <div id="controls" hidden>
        <input type="number" id="jumpInput" min="1" placeholder="Line #">
        <button id="jumpBtn">Go to line</button>
        <button id="expandBtn">Expand (show all)</button>
    </div>

    <!-- 6. THE WINDOW: a frame, with a box of rows inside -->
    <div id="output">
        <div id="rows"></div>
    </div>

    <!-- 7. The "Top" button (hidden until you scroll down) -->
    <button id="topBtn" title="Back to top" hidden>&#8593; Top</button>
```

<br>

**The most important idea on this page: name tags.**

```
id="searchInput"
    ^^^^^^^^^^^
    the name tag
```

Every piece the brain needs to talk to gets a **name tag** (`id`). Later, the brain will say *"find the piece called searchInput"* and grab it.

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

The brain makes things happen. We'll build it in small pieces and test along the way.

> **3 words you'll see a lot:**
>
> | Word | Baby words |
> |---|---|
> | `const` | A box whose label never changes |
> | `let` | A box whose stuff CAN change later |
> | `function` | A list of instructions with a name. Say the name → it runs the list. |

<br>

### Step 2.1: Find the pieces

Open `scriptI.js`. First, the brain finds every piece by its name tag:

```js
const WINDOW_SIZE = 15;   // how many rows fit in the window

const fileInput   = document.getElementById('csvFileInput');   // Choose File button
const searchInput = document.getElementById('searchInput');    // search bar
const statusText  = document.getElementById('status');         // "Lines 1–15 of 100"
const outputBox   = document.getElementById('output');         // the window
const rowsBox     = document.getElementById('rows');           // rows inside the window
const controls    = document.getElementById('controls');       // Go to line + Expand area
const jumpInput   = document.getElementById('jumpInput');      // "Line #" box
const jumpBtn     = document.getElementById('jumpBtn');        // "Go to line" button
const expandBtn   = document.getElementById('expandBtn');      // "Expand" button
const topBtn      = document.getElementById('topBtn');         // "Top" button
```

`document.getElementById('xyz')` = **"Find the piece with the name tag xyz."**

> ⚠️ The name tags must match the skeleton EXACTLY. `searchInput` ≠ `SearchInput`.

<br>

### Step 2.2: The brain's memory

Add 2 lists the brain will remember:

```js
let allLines = [];   // EVERY line from the file
let matches  = [];   // ONLY the lines on screen right now
```

`[]` = an empty list. They're `let` because they'll fill up later.

<br>

### Step 2.3: Build one row (`makeRow`)

Every row has 2 parts:

```
   [ line number ]  [ the words from that line ]
         2           Ana,22,ana@ex.com
```

Add this function. It builds ONE row:

```js
function makeRow(num, text, query) {

    // The row itself
    const row = document.createElement('div');
    row.className = 'line';

    // Part 1: the line number
    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num;

    // Part 2: the words
    const textCell = document.createElement('span');
    textCell.className = 'line-text';

    if (query === '') {
        // No search? Just put the words in.
        textCell.textContent = text;
    } else {
        // Search? Paint every match yellow with <mark>.
        const lower = text.toLowerCase();
        let start = 0;
        let found = lower.indexOf(query, start);

        while (found !== -1) {
            textCell.appendChild(document.createTextNode(text.slice(start, found)));   // words BEFORE the match

            const mark = document.createElement('mark');
            mark.textContent = text.slice(found, found + query.length);                // the match (yellow)
            textCell.appendChild(mark);

            start = found + query.length;
            found = lower.indexOf(query, start);                                       // look for the next one
        }

        textCell.appendChild(document.createTextNode(text.slice(start)));             // words AFTER the last match
    }

    // Empty line? Put a space in, so the row doesn't squish flat.
    if (text === '') textCell.textContent = ' ';

    // Snap the 2 parts into the row. Done!
    row.appendChild(numCell);
    row.appendChild(textCell);
    return row;
}
```

**What's what:**

| Code | Baby words |
|---|---|
| `document.createElement('div')` | Make a brand new piece (not on the page yet) |
| `.className = 'line'` | Give it a group name, so the clothes can find it later |
| `.textContent = ...` | Put words inside it |
| `.appendChild(x)` | Put `x` inside this piece |
| `<mark>` | The **highlighter pen** of web pages: paints things yellow |
| `indexOf(query)` | "Where is my word in this line?" Gives `-1` if it's not there. |
| `while (found !== -1)` | "Keep going until there are no more matches" |

**The yellow paint, in a picture:**

```
   "Ana,22,ana@ex.com"      searching "ana"
    ^^^    ^^^              ← these get wrapped in <mark>
```

> 🔒 **Why not just write HTML into the page?** Because a file could have sneaky code in it. Building real pieces with `textContent` means the file's words are ALWAYS shown as plain words, never run as code.

<br>

### Step 2.4: The "Lines 21–35 of 240" words (`updatePosition`)

```js
function updatePosition() {

    const query = searchInput.value.trim();

    if (allLines.length === 0) return;      // no file yet? stop.

    if (matches.length === 0) {
        statusText.textContent = 'No lines match "' + query + '"';
        return;
    }

    // Every row is the same height.
    // So: how far we scrolled ÷ one row's height = which row is at the top.
    const rowHeight = rowsBox.children[0].offsetHeight;
    const first = Math.round(outputBox.scrollTop / rowHeight);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    // expanded? you see them all
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    // small? the top row + 14 more

    let message = 'Lines ' + matches[first].num + '–' + matches[last].num;

    if (query === '') {
        message += ' of ' + allLines.length;
    } else {
        message += ' (' + matches.length + ' matching line(s) for "' + query + '")';
    }

    statusText.textContent = message;
}
```

| Code | Baby words |
|---|---|
| `return` | "Stop here. Leave the function." |
| `scrollTop` | How far down the window is scrolled |
| `offsetHeight` | How tall something is |
| `a ? b : c` | A tiny if/else: "if `a`, use `b`. Otherwise use `c`." |

<br>

### Step 2.5: Keep the window exactly 15 rows (`sizeWindow`)

**Problem:** a really long line adds a sideways scrollbar, and the scrollbar steals space.
**Fix:** measure the scrollbar and give the space back.

```js
function sizeWindow() {

    outputBox.style.height = '';    // start fresh

    if (outputBox.classList.contains('expanded') || rowsBox.children.length === 0) return;

    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;   // how tall the scrollbar is
    const rowHeight = rowsBox.children[0].offsetHeight;                             // how tall one row is

    // 15 rows + the scrollbar
    outputBox.style.height = (WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}
```

<br>

### Step 2.6: Draw all the rows (`render`)

This is the big one. It runs after you pick a file AND every time you type in the search bar.

```js
function render() {

    // Your search word, in small letters. ("ANA" and "ana" find the same thing.)
    const query = searchInput.value.trim().toLowerCase();

    // Pick which lines to show.
    //   No search word?  keep every line.
    //   Search word?     keep only lines that have it.
    // Each one remembers its REAL line number (index + 1).
    matches = [];
    allLines.forEach(function (text, index) {
        if (query === '' || text.toLowerCase().includes(query)) {
            matches.push({ num: index + 1, text: text });
        }
    });

    // Wipe the old rows away.
    rowsBox.textContent = '';

    // Build all the new rows in a hidden box first, then drop them in all at once. (Faster!)
    const fragment = document.createDocumentFragment();
    matches.forEach(function (line) {
        fragment.appendChild(makeRow(line.num, line.text, query));
    });
    rowsBox.appendChild(fragment);

    controls.hidden = false;      // show Go to line + Expand
    sizeWindow();                 // make the window 15 rows tall
    outputBox.scrollTop = 0;      // start at the top
    updatePosition();             // update the "Lines 1–15" words
}
```

| Code | Baby words |
|---|---|
| `.forEach(function (text, index) {...})` | "Do this for every item in the list." `index` starts at **0**, so the real line number is `index + 1`. |
| `.includes(query)` | "Does this line have my word in it?" yes / no |
| `.push(x)` | Add `x` to the end of the list |
| `\|\|` | "or" |
| `===` | "is exactly equal to" |

<br>

### Step 2.7: Read the file

Now the brain listens for you picking a file:

```js
fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];   // the file you picked
    if (!file) return;                    // clicked Cancel? stop.

    const reader = new FileReader();      // a helper that reads files (comes with every browser)

    // This part waits until the file is DONE reading.
    reader.onload = function (e) {

        // Cut the file into lines. (Handles Windows AND Mac line endings.)
        allLines = e.target.result.split(/\r?\n/);

        // Files often end with an empty line. Throw it away.
        if (allLines[allLines.length - 1] === '') allLines.pop();

        // Clean slate for the new file.
        searchInput.value = '';
        searchInput.disabled = false;     // turn the search bar ON
        jumpInput.value = '';

        render();                         // draw the rows!
    };

    reader.readAsText(file);              // GO! start reading.
});
```

**The big new idea: listeners.**

```
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

You should see every line, each with its number. It looks plain and it's NOT a 15-row window yet. **That's fine!** The clothes come in Part 3.

<br>

### Step 2.8: Search

One line! Every time you type, draw the rows again:

```js
searchInput.addEventListener('input', render);
```

`'input'` = "every time a letter is typed or deleted."

<br>

### ✅ Test it

Type in the search bar. Only matching lines stay, and your word is wrapped in `<mark>` (it already shows yellow, because browsers paint `<mark>` yellow by default).

<br>

### Step 2.9: Go to line

```js
jumpBtn.addEventListener('click', jumpToLine);

jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpToLine();        // pressing Enter works too
});

function jumpToLine() {

    const target = parseInt(jumpInput.value, 10);       // the number you typed
    if (isNaN(target) || matches.length === 0) return;  // not a number? nothing to show? stop.

    // Find the row with that line number. (If it's hidden by a search, go to the next one.)
    let index = matches.findIndex(function (line) { return line.num >= target; });
    if (index === -1) index = matches.length - 1;       // number too big? go to the last line.

    const row = rowsBox.children[index];

    if (outputBox.classList.contains('expanded')) {
        row.scrollIntoView({ block: 'center' });        // expanded? scroll the PAGE
    } else {
        outputBox.scrollTop = row.offsetTop;            // small? scroll the WINDOW
    }

    updatePosition();

    // Flash blue. (Take it off, then put it back on, so it plays every time.)
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
| `classList.add('flash')` | Stick a label on it, so the clothes know to flash it |

<br>

### Step 2.10: Expand / Shrink

```js
expandBtn.addEventListener('click', function () {

    // "toggle" = a light switch. On → Off. Off → On.
    const expanded = outputBox.classList.toggle('expanded');

    expandBtn.textContent = expanded ? 'Shrink to 15-line window' : 'Expand (show all)';

    sizeWindow();
    updatePosition();
});
```

The brain just flips the `expanded` label on and off. The **clothes** decide what "expanded" looks like (Part 3).

<br>

### Step 2.11: Scroll listeners + the Top button

```js
// When the window scrolls, update the "Lines 21–35" words
outputBox.addEventListener('scroll', updatePosition);

// Top button: click it → glide back to the top
topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Only show the Top button after you've scrolled down 300 pixels
window.addEventListener('scroll', function () {
    topBtn.hidden = window.scrollY < 300;
});
```

<br>

### ✅ Test it

- Type a number in **Line #** → click **Go to line** → the page jumps there.
- **Expand** changes its words to **Shrink to 15-line window**.

The brain is DONE! 🧠 Now let's make it pretty.

<br>

---

<br>

# PART 3: The Clothes (`styleI.css`)

> ⚠️ **Heads up: Part 3 wasn't double-checked like Parts 1 and 2.**
>
> The skeleton and brain code in this guide were copied out and tested, and they work.
> The clothes are different: some steps (3.4 and 3.5) add lines INTO rules you already wrote,
> so they couldn't be tested the same way.
>
> **If something looks off, open the real `styleI.css` next to this guide and compare.**
> The real file is the one that's been tested.

<br>

### How to read CSS

```css
#output {              ← WHO gets dressed
    color: red;        ← WHAT they wear
}
```

| Symbol | Baby words | Example |
|---|---|---|
| `#name` | ONE piece, by its name tag (`id`) | `#output` → `id="output"` |
| `.name` | A GROUP of pieces, by group name (`class`) | `.line` → every `class="line"` |
| `name` | EVERY piece of that kind | `button` → all buttons |

**See-through colors:**

```
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

### Step 3.2: The window (the 15-row box)

**The math:**

```
 1 row  =  29 (the row)  +  1 (the line under it)  =  30 tall
15 rows =  15 × 30                                 =  450 tall
```

```css
#output {
    max-width: 900px;
    height: calc(15 * 30px);      /* exactly 15 rows tall */
    margin: 0 auto;
    font-family: Consolas, "Courier New", monospace;   /* every letter the same width */
    font-size: 14px;
    overflow: auto;               /* too much stuff? add a scrollbar */
    position: relative;           /* helps the brain measure where rows are */
}

/* When the brain flips on "expanded": no more limit */
#output.expanded {
    height: auto;
}

/* No rows yet? No window. */
#output:has(#rows:empty) {
    display: none;
}

/* The box of rows: as wide as the longest line */
#rows {
    width: max-content;
    min-width: 100%;
}
```

<br>

### Step 3.3: The rows

```css
/* One row:  [ number (60 wide) ] [ words (the rest) ] */
.line {
    display: grid;
    grid-template-columns: 60px 1fr;
    line-height: 29px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.45);
    transition: background 0.15s;     /* color changes fade in smoothly */
}

/* Zebra stripes: every other row a bit lighter */
.line:nth-child(even) {
    background: rgba(255, 255, 255, 0.15);
}

/* Mouse on a row → it lights up */
.line:hover {
    background: rgba(255, 255, 255, 0.45);
}

/* The number */
.line-num {
    padding: 0 10px;
    text-align: right;
    color: #666;
    background: rgba(225, 228, 233, 0.85);
    border-right: 1px solid rgba(255, 255, 255, 0.6);
    user-select: none;            /* copying text skips the numbers */
    position: sticky;             /* stays stuck on the left when you scroll sideways */
    left: 0;
}

/* The words */
.line-text {
    padding: 0 10px;
    white-space: pre;             /* one line stays ONE line */
}

/* Search matches: yellow */
mark {
    background: #ffe066;
    padding: 0 1px;
    border-radius: 2px;
}

/* Go to line: flash blue, fade back */
.line.flash {
    animation: flash 1.5s ease-out;
}

@keyframes flash {
    from { background: rgba(120, 170, 255, 0.5); }
}
```

<br>

### ✅ Test it

Refresh and pick a file. NOW it's a real 15-row window you can scroll, with numbered, striped rows. Go to line flashes blue. Expand and Shrink work.

<br>

### Step 3.4: The glass ✨

Go back to `#output` and add these lines **inside** its `{ }`:

```css
    /* The fill: a little white top-left → almost clear bottom-right. That fade = glass. */
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.40), rgba(255, 255, 255, 0.10));

    backdrop-filter: blur(12px);                      /* frosts whatever is behind it */
    border: 1px solid rgba(255, 255, 255, 0.7);       /* thin shiny edge */
    border-radius: 18px;                              /* round corners */

    box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.18),              /* soft shadow below = floating */
        inset 0 1px 0 rgba(255, 255, 255, 0.9);       /* shiny line on top = light hitting glass */

    /* Thin scrollbar */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
```

<br>

### Step 3.5: Snappy scrolling + floating

Add these 2 lines inside `#output { }` too:

```css
    scroll-snap-type: y mandatory;               /* always stop on a whole row */
    animation: float 6s ease-in-out infinite;    /* bob up and down forever */
```

Add this line inside `.line { }`:

```css
    scroll-snap-align: start;                    /* each row is a place to snap to */
```

Then add these at the bottom of the file:

```css
/* The floating move: up 4 pixels, then back down */
@keyframes float {
    50% { transform: translateY(-4px); }
}

/* If someone turned off motion on their computer, stay still */
@media (prefers-reduced-motion: reduce) {
    #output { animation: none; }
}
```

And update `#output.expanded` so expanded mode doesn't snap or float:

```css
#output.expanded {
    height: auto;
    scroll-snap-type: none;
    animation: none;
}
```

<br>

### ✅ Final test

Refresh. Pick a file. You should have:

- [ ] A floating glass window, exactly 15 rows tall
- [ ] Scrolling that snaps one row at a time
- [ ] "Lines 21–35 of 240" updating as you scroll
- [ ] Search that paints matches yellow
- [ ] Go to line that flashes blue
- [ ] Expand / Shrink
- [ ] A Top button after scrolling down the page

**You built it!** 🎉

<br>

---

<br>

## Change stuff yourself

| I want to... | Do this |
|---|---|
| **Stop the floating** | Delete `animation: float 6s ease-in-out infinite;` in `#output` |
| **Show 20 rows instead of 15** | Change 15 → 20 in **BOTH**: `WINDOW_SIZE = 15` (brain) AND `calc(15 * 30px)` (clothes) |
| **Change the page color** | `body` → `background` |
| **Change the search color** | `mark` → `background` |
| **Change the flash color** | `@keyframes flash` → the `rgba(...)` |

> ⚠️ The 15 lives in 2 places. Change one, change the other.

<br>

## Stuck? Check these first

| Problem | Probably... |
|---|---|
| Nothing happens when you pick a file | A name tag doesn't match. Check every `id` in the skeleton vs. every `getElementById` in the brain. |
| The page looks totally plain | The `<link>` to `styleI.css` is missing or misspelled. |
| Nothing works at all | The `<script>` tag isn't at the bottom of `<body>`, or there's a typo in the brain. Press **F12** → **Console** tab to see the error in red. |
| The window isn't 15 rows | The 15 doesn't match in both places, or the row height isn't 30. |

<br>

## What it can't do (yet)

- **No typo help.** `Jon` won't find `John`.
- **Whole lines only.** You can't search one column.
- **Commas inside quotes** aren't treated specially.
- **Huge files** (hundreds of thousands of lines) might take a second to load.
