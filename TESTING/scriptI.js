// THE NANDO NOTES - scriptI.js
// Reads a selected CSV file and displays it line by line in a scrolling window 15 lines tall, with a search bar.
//
// How it works, start to finish:
//   user picks a file -> FileReader reads it as text -> text gets split into lines
//   -> render() puts every line into a scroll box that's only 15 rows tall
//   -> scrolling the box moves through the file; the status line says which lines you're looking at
//   -> typing in the search bar filters to only the matching lines and highlights the match
//
// FileReader is built into the browser (no install needed). It reads files the user picks
// right on their own computer; nothing gets uploaded to a server.
//
// WHAT CHANGED (Claude update - scrolling window):
//   - Before: you saw 15 lines, then had to click "Show 15 more" or "Show all".
//   - Now: ALL lines are loaded into #output, but the box is only 15 rows tall (set in styleI.css),
//     so you scroll inside it like a window sliding over the file.
//   - updatePosition() (section 7) reads how far the box is scrolled and shows "Lines X–Y of Z".
//   - "Go to line" (section 5) scrolls the window so that line sits at the top, and flashes it.
//   - "Expand" removes the 15-row height limit to see everything at once; click again to shrink back.
//   - Show more / Show all / Collapse buttons were removed (the scroll window replaces them).

const WINDOW_SIZE = 15; // how many lines fit in the window (must match the 15 in styleI.css)

// 1. Grab every element we need using their IDs (these match the id="..." values in testI.html)
const fileInput   = document.getElementById('csvFileInput');
const searchInput = document.getElementById('searchInput');
const statusText  = document.getElementById('status');
const outputBox   = document.getElementById('output'); // the scrolling window
const rowsBox     = document.getElementById('rows');   // the rows inside the window
const controls    = document.getElementById('controls');
const jumpInput   = document.getElementById('jumpInput');
const jumpBtn     = document.getElementById('jumpBtn');
const expandBtn   = document.getElementById('expandBtn');
const topBtn      = document.getElementById('topBtn');

// 2. The page's "memory". "let" (instead of const) means these values change over time.
let allLines = []; // every line in the file, e.g. ["name,age", "Ana,22", ...]
let matches = [];  // the lines currently in the window: [{ num: 1, text: "name,age" }, ...]

// 3. When a file is picked, read it
fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return; // user canceled = stop here

    const reader = new FileReader();

    // Runs once the file is done reading. e.target.result = the whole file as one big string.
    reader.onload = function (e) {
        // Split the text into lines. /\r?\n/ handles both Windows (\r\n) and Mac/Linux (\n) line endings.
        allLines = e.target.result.split(/\r?\n/);

        // Files often end with a blank line; drop it so we don't show an empty last row
        if (allLines[allLines.length - 1] === '') allLines.pop();

        // Reset everything for the new file
        searchInput.value = '';
        searchInput.disabled = false;
        jumpInput.value = '';
        render();
    };

    reader.readAsText(file);
});

// 4. Search: every time the user types, re-draw the window using the new search text
searchInput.addEventListener('input', render);

// 5. Go to line: scroll the window so the chosen line is at the top
jumpBtn.addEventListener('click', jumpToLine);
jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpToLine(); // pressing Enter works too
});

function jumpToLine() {
    const target = parseInt(jumpInput.value, 10); // turns the typed text into a whole number
    if (isNaN(target) || matches.length === 0) return;

    // Find the first line in the window whose number is >= the target.
    // (While searching, the exact line might be filtered out, so we land on the next one that's there.)
    let index = matches.findIndex(function (line) { return line.num >= target; });
    if (index === -1) index = matches.length - 1; // past the end = go to the last line

    const row = rowsBox.children[index];
    if (outputBox.classList.contains('expanded')) {
        row.scrollIntoView({ block: 'center' }); // expanded = no window to scroll, so scroll the page instead
    } else {
        outputBox.scrollTop = row.offsetTop;     // scroll the window so this row is at the top
    }

    updatePosition(); // refresh the "Lines X–Y" text right away

    // Flash the row so your eye can find it. Removing then re-adding the class restarts the animation.
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
}

// 6. Expand / shrink the window
expandBtn.addEventListener('click', function () {
    // classList.toggle adds the class if it's missing, removes it if it's there, and returns true if it added it
    const expanded = outputBox.classList.toggle('expanded');
    expandBtn.textContent = expanded ? 'Shrink to 15-line window' : 'Expand (show all)';
    sizeWindow();
    updatePosition();
});

// Sets the window to exactly 15 rows tall.
// If a long line adds a sideways scrollbar, that scrollbar eats into the height, so we measure it
// and add it back on. Scrollbar = full height - inside height - the top and bottom borders.
function sizeWindow() {
    outputBox.style.height = ''; // start from the CSS height (or height: auto when expanded)
    if (outputBox.classList.contains('expanded') || rowsBox.children.length === 0) return;

    const style = getComputedStyle(outputBox); // the box's final, applied CSS values
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;
    const rowHeight = rowsBox.children[0].offsetHeight;
    outputBox.style.height = (WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}

// 7. Status line: every time the window scrolls, figure out which lines are showing
outputBox.addEventListener('scroll', updatePosition);

function updatePosition() {
    const query = searchInput.value.trim();

    if (allLines.length === 0) return;
    if (matches.length === 0) {
        statusText.textContent = 'No lines match "' + query + '"';
        return;
    }

    // Every row is the same height, so: rows scrolled past = how far we scrolled / one row's height
    const rowHeight = rowsBox.children[0].offsetHeight;
    const first = Math.round(outputBox.scrollTop / rowHeight);
    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;

    let message = 'Lines ' + matches[first].num + '–' + matches[last].num;
    if (query === '') {
        message += ' of ' + allLines.length;
    } else {
        message += ' (' + matches.length + ' matching line(s) for "' + query + '")';
    }
    statusText.textContent = message;
}

// Show the page's Top button only after the user has scrolled the page down a bit
topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // smooth = animated scroll instead of a jump
});
window.addEventListener('scroll', function () {
    topBtn.hidden = window.scrollY < 300;
});

// 8. render() rebuilds the window. It runs after loading a file and every time the search changes.
function render() {
    const query = searchInput.value.trim().toLowerCase(); // lowercase = search ignores capital letters

    // Build a list of lines to show. Each one remembers its ORIGINAL line number (index + 1),
    // so when searching you still see where the match lives in the file.
    matches = [];
    allLines.forEach(function (text, index) {
        if (query === '' || text.toLowerCase().includes(query)) {
            matches.push({ num: index + 1, text: text });
        }
    });

    // Clear the old rows, then add the new ones.
    // A DocumentFragment is an off-screen holder: we build every row in it, then add them all at once,
    // which is much faster than adding thousands of rows to the page one by one.
    rowsBox.textContent = '';
    const fragment = document.createDocumentFragment();
    matches.forEach(function (line) {
        fragment.appendChild(makeRow(line.num, line.text, query));
    });
    rowsBox.appendChild(fragment);

    controls.hidden = false;
    sizeWindow();
    outputBox.scrollTop = 0; // new search = start back at the top of the window
    updatePosition();
}

// 9. makeRow() builds one row: [line number | line text], with search matches highlighted.
function makeRow(num, text, query) {
    const row = document.createElement('div');
    row.className = 'line';

    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num;

    const textCell = document.createElement('span');
    textCell.className = 'line-text';

    if (query === '') {
        textCell.textContent = text;
    } else {
        // Walk through the line, wrapping every match in a <mark> tag (yellow highlight).
        // We build real elements instead of using innerHTML, so text from the file is never run as code.
        const lower = text.toLowerCase();
        let start = 0;
        let found = lower.indexOf(query, start);
        while (found !== -1) {
            textCell.appendChild(document.createTextNode(text.slice(start, found))); // text before the match
            const mark = document.createElement('mark');
            mark.textContent = text.slice(found, found + query.length);              // the match itself
            textCell.appendChild(mark);
            start = found + query.length;
            found = lower.indexOf(query, start);
        }
        textCell.appendChild(document.createTextNode(text.slice(start)));           // text after the last match
    }

    // Keep empty lines from collapsing to zero height
    if (text === '') textCell.textContent = ' ';

    row.appendChild(numCell);
    row.appendChild(textCell);
    return row;
}
