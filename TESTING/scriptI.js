// THE NANDO NOTES - scriptI.js
// Reads a selected CSV file and displays it line by line, 15 lines at a time, with a search bar.
//
// How it works, start to finish:
//   user picks a file -> FileReader reads it as text -> text gets split into lines
//   -> render() draws the first 15 lines -> buttons show more / all / collapse
//   -> typing in the search bar filters to only the matching lines and highlights the match
//
// FileReader is built into the browser (no install needed). It reads files the user picks
// right on their own computer; nothing gets uploaded to a server.

const PAGE_SIZE = 15; // how many lines to show at a time

// 1. Grab every element we need using their IDs (these match the id="..." values in testI.html)
const fileInput   = document.getElementById('csvFileInput');
const searchInput = document.getElementById('searchInput');
const statusText  = document.getElementById('status');
const outputBox   = document.getElementById('output');
const controls    = document.getElementById('controls');
const showMoreBtn = document.getElementById('showMoreBtn');
const showAllBtn  = document.getElementById('showAllBtn');
const collapseBtn = document.getElementById('collapseBtn');
const topBtn      = document.getElementById('topBtn');

// 2. The page's "memory". "let" (instead of const) means these values change over time.
let allLines = [];        // every line in the file, e.g. ["name,age", "Ana,22", ...]
let visibleCount = PAGE_SIZE; // how many lines are currently shown

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
        visibleCount = PAGE_SIZE;
        searchInput.value = '';
        searchInput.disabled = false;
        render();
    };

    reader.readAsText(file);
});

// 4. Search: every time the user types, re-draw the list using the new search text
searchInput.addEventListener('input', function () {
    visibleCount = PAGE_SIZE; // start from the top of the results each time
    render();
});

// 5. Buttons
showMoreBtn.addEventListener('click', function () {
    visibleCount += PAGE_SIZE;
    render();
});

showAllBtn.addEventListener('click', function () {
    visibleCount = Infinity; // "Infinity" = bigger than any number, so every line fits
    render();
});

collapseBtn.addEventListener('click', function () {
    visibleCount = PAGE_SIZE;
    render();
    scrollToTop();
});

topBtn.addEventListener('click', scrollToTop);

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // smooth = animated scroll instead of a jump
}

// Show the Top button only after the user has scrolled down a bit
window.addEventListener('scroll', function () {
    topBtn.hidden = window.scrollY < 300;
});

// 6. render() draws the lines on the page. It runs after loading, searching, and every button click.
function render() {
    const query = searchInput.value.trim().toLowerCase(); // lowercase = search ignores capital letters

    // Build a list of lines to show. Each one remembers its ORIGINAL line number (index + 1),
    // so when searching you still see where the match lives in the file.
    const matches = [];
    allLines.forEach(function (text, index) {
        if (query === '' || text.toLowerCase().includes(query)) {
            matches.push({ num: index + 1, text: text });
        }
    });

    // Only draw the first "visibleCount" of them
    const shown = matches.slice(0, visibleCount);

    // Clear the old rows, then add the new ones
    outputBox.textContent = '';
    shown.forEach(function (line) {
        outputBox.appendChild(makeRow(line.num, line.text, query));
    });

    // Update the status message
    if (query === '') {
        statusText.textContent = 'Showing ' + shown.length + ' of ' + allLines.length + ' lines';
    } else if (matches.length === 0) {
        statusText.textContent = 'No lines match "' + searchInput.value.trim() + '"';
    } else {
        statusText.textContent = matches.length + ' matching line(s) — showing ' + shown.length;
    }

    // Show/hide buttons depending on whether there's more to see
    const hasMore = shown.length < matches.length;
    showMoreBtn.hidden = !hasMore;
    showAllBtn.hidden = !hasMore;
    collapseBtn.hidden = shown.length <= PAGE_SIZE;
    controls.hidden = showMoreBtn.hidden && collapseBtn.hidden;
}

// 7. makeRow() builds one row: [line number | line text], with search matches highlighted.
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
