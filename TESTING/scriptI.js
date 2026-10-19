/*
    ==========================================================

        THE NANDO NOTES  -  scriptI.js

        This file is the BRAIN of the page.
        It makes things HAPPEN when you click and type.

    ==========================================================


    THE WHOLE STORY, IN 6 STEPS:


        1.   You pick a CSV file.

        2.   The brain reads the file.

        3.   The brain cuts the file into lines,
             and cuts every line into CELLS at the commas.
             (just like boxes in Excel)

        4.   The FIRST line is special.  It's line 0: the HEADER.
             It holds the column names, and it stays stuck
             to the top of the window.

        5.   The brain puts every other row inside the window.
             The window shows 15 rows at a time.
             You scroll to see the rest.

        6.   When you type in the search bar,
             the brain only keeps the rows that have your word,
             and paints your word yellow.


    Nothing leaves your computer.
    The file is read right here, in your browser.

*/



// ----------------------------------------------------------
//
//    HOW MANY ROWS FIT IN THE WINDOW
//
//    15 rows  (plus the header on top).
//    If you change this, change the 15 in styleI.css too.
//
// ----------------------------------------------------------

const WINDOW_SIZE = 15;



// ----------------------------------------------------------
//
//    STEP 0:  FIND THE PIECES ON THE PAGE
//
//    Every piece in testI.html has a name tag  (id="...").
//    Here we find each piece by its name tag,
//    so the brain can talk to it later.
//
// ----------------------------------------------------------

const fileInput   = document.getElementById('csvFileInput');   //  the "Choose File" button
const searchInput = document.getElementById('searchInput');    //  the search bar
const statusText  = document.getElementById('status');         //  the "Rows 1–15 of 100" words
const outputBox   = document.getElementById('output');         //  the glass window
const headerBox   = document.getElementById('header');         //  the header row  (line 0)
const rowsBox     = document.getElementById('rows');           //  the rows inside the window
const controls    = document.getElementById('controls');       //  the Go-to-row + Expand area
const jumpInput   = document.getElementById('jumpInput');      //  the "Row #" box
const jumpBtn     = document.getElementById('jumpBtn');        //  the "Go to row" button
const expandBtn   = document.getElementById('expandBtn');      //  the "Expand" button
const topBtn      = document.getElementById('topBtn');         //  the "Top" button



// ----------------------------------------------------------
//
//    THE BRAIN'S MEMORY
//
//    "let" means:  this can change later.
//
// ----------------------------------------------------------

let headerCells = [];   //  the column names  (line 0).        Like:  ["name", "age"]
let dataRows    = [];   //  EVERY other row, cut into cells.    Like:  [["Ana", "22"], ["Bo", "31"]]
let columnCount = 0;    //  how many columns the widest row has
let matches     = [];   //  ONLY the rows we are showing now.   Like:  [{ num: 1, cells: ["Ana", "22"] }]



// ----------------------------------------------------------
//
//    STEP 1 + 2 + 3 + 4:  PICK A FILE  ->  READ IT  ->  CUT IT UP
//
// ----------------------------------------------------------

fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];     //  the file you picked

    if (!file) return;                      //  you clicked "Cancel"?  Then stop.


    const reader = new FileReader();        //  FileReader = a helper that reads files. It comes with every browser.


    //  This part waits until the file is DONE reading.
    reader.onload = function (e) {

        //  Cut the file into lines.
        //  (Windows and Mac end lines a little differently. This handles both.)
        const lines = e.target.result.split(/\r?\n/);

        //  Files often end with one empty line. Throw it away.
        if (lines[lines.length - 1] === '') lines.pop();


        //  Line 0  =  the header  (the column names).
        //  Everything after it  =  the data rows.
        //  Every line gets cut into cells.
        headerCells = splitIntoCells(lines[0] || '');
        dataRows    = lines.slice(1).map(splitIntoCells);


        //  How many columns?  Count the cells in the widest row.
        columnCount = headerCells.length;
        dataRows.forEach(function (cells) {
            columnCount = Math.max(columnCount, cells.length);
        });


        //  Clean slate for the new file.
        searchInput.value = '';
        searchInput.disabled = false;       //  turn the search bar ON
        jumpInput.value = '';

        setColumnWidths();                  //  decide how wide each column is
        drawHeader();                       //  draw line 0
        render();                           //  draw the rows  (see STEP 5 below)
    };


    reader.readAsText(file);                //  GO!  Start reading.
});



// ----------------------------------------------------------
//
//    CUT ONE LINE INTO CELLS
//
//    Easy case:    Ana,22,Chicago        ->   [Ana] [22] [Chicago]
//
//    Tricky case:  Ana,22,"Chicago, IL"  ->   [Ana] [22] [Chicago, IL]
//
//    Quotes mean:  "the comma inside here is NOT a cut."
//    Two quotes in a row ("") mean:  "a real quote mark."
//
// ----------------------------------------------------------

function splitIntoCells(line) {

    const cells = [];
    let current = '';           //  the cell we're building right now
    let insideQuotes = false;   //  are we inside "quotes" right now?


    //  Walk along the line, one letter at a time.
    for (let i = 0; i < line.length; i++) {

        const letter = line[i];

        if (insideQuotes) {

            if (letter === '"' && line[i + 1] === '"') {
                current += '"';             //  ""  =  a real quote mark
                i++;                        //  skip the second one
            } else if (letter === '"') {
                insideQuotes = false;       //  closing quote.  Back to normal.
            } else {
                current += letter;          //  anything else (even a comma!) is part of the cell
            }

        } else {

            if (letter === '"') {
                insideQuotes = true;        //  opening quote
            } else if (letter === ',') {
                cells.push(current);        //  a comma = CUT!  This cell is done.
                current = '';
            } else {
                current += letter;
            }
        }
    }

    cells.push(current);                    //  don't forget the last cell
    return cells;
}



// ----------------------------------------------------------
//
//    HOW WIDE IS EACH COLUMN?
//
//    Look at the longest thing in each column,
//    and make the column fit it.
//
//       Not too skinny  (at least 6 letters wide)
//       Not too fat     (at most 40 letters wide)
//
//    Too long for 40?  It gets cut off with "…"
//    and you can hover over it to read the whole thing.
//
// ----------------------------------------------------------

function setColumnWidths() {

    const widths = [];

    for (let col = 0; col < columnCount; col++) {

        //  Start with the header's length...
        let longest = (headerCells[col] || '').length;

        //  ...then check every row for something longer.
        dataRows.forEach(function (cells) {
            longest = Math.max(longest, (cells[col] || '').length);
        });

        //  Squeeze it between 6 and 40.
        //  (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest + 2, 6), 40);

        //  "ch" = the width of one letter.  +16px for the padding on both sides.
        widths.push('calc(' + letters + 'ch + 16px)');
    }


    //  Hand the widths to the clothes (styleI.css) as one list:
    //      "60px  calc(10ch + 16px)  calc(6ch + 16px)  ..."
    //       ^^^^
    //       the row-number column is always 60px
    outputBox.style.setProperty('--columns', '60px ' + widths.join(' '));
}



// ----------------------------------------------------------
//
//    DRAW THE HEADER  (line 0)
//
//    Same as a normal row, but with a special label
//    so the clothes make it bold and stick it to the top.
//
// ----------------------------------------------------------

function drawHeader() {

    headerBox.textContent = '';                         //  wipe the old one

    const row = makeRow(0, headerCells, '');            //  line number 0, the column names, no search
    row.classList.add('header-row');

    headerBox.appendChild(row);
}



// ----------------------------------------------------------
//
//    STEP 6:  SEARCH
//
//    Every time you type a letter,
//    draw the rows again, using your new word.
//
// ----------------------------------------------------------

searchInput.addEventListener('input', render);



// ----------------------------------------------------------
//
//    GO TO ROW
//
//    Type a number  ->  click "Go to row"  (or press Enter)
//    ->  that row jumps to the top of the window  (right under the header)
//    ->  and flashes blue so you can find it.
//
// ----------------------------------------------------------

jumpBtn.addEventListener('click', jumpToLine);

jumpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') jumpToLine();
});


function jumpToLine() {

    const target = parseInt(jumpInput.value, 10);       //  the number you typed

    if (isNaN(target) || matches.length === 0) return;  //  not a number?  nothing to show?  Stop.


    //  Find the row with that number.
    //  (If you're searching and that row is hidden, go to the next one that's showing.)
    let index = matches.findIndex(function (line) { return line.num >= target; });

    //  Number too big?  Go to the last row.
    if (index === -1) index = matches.length - 1;


    const row = rowsBox.children[index];

    if (outputBox.classList.contains('expanded')) {
        row.scrollIntoView({ block: 'center' });                        //  window is expanded?  Scroll the PAGE.
    } else {
        outputBox.scrollTop = row.offsetTop - headerBox.offsetHeight;   //  window is small?  Scroll the WINDOW.
    }                                                                   //  (minus the header, so the row sits right under it)

    updatePosition();                                   //  update the "Rows 1–15" words


    //  Make the row flash blue.
    //  (Take the flash off, then put it back on, so it plays again every time.)
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
}



// ----------------------------------------------------------
//
//    EXPAND  /  SHRINK
//
//    Click once   ->  show ALL the rows.
//    Click again  ->  back to the 15-row window.
//
// ----------------------------------------------------------

expandBtn.addEventListener('click', function () {

    //  "toggle" = a light switch.  On -> Off.  Off -> On.
    const expanded = outputBox.classList.toggle('expanded');

    expandBtn.textContent = expanded ? 'Shrink to 15-row window' : 'Expand (show all)';

    sizeWindow();
    updatePosition();
});



// ----------------------------------------------------------
//
//    MAKE THE WINDOW EXACTLY  HEADER + 15 ROWS  TALL
//
//    Problem:  lots of columns add a sideways scrollbar,
//              and that scrollbar steals some space.
//
//    Fix:      measure how tall the scrollbar is,
//              and give that space back.
//
// ----------------------------------------------------------

function sizeWindow() {

    outputBox.style.height = '';                        //  start fresh

    if (outputBox.classList.contains('expanded') || rowsBox.children.length === 0) return;


    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;    //  how tall the scrollbar is
    const rowHeight = rowsBox.children[0].offsetHeight;                              //  how tall one row is

    //  the header  +  15 rows  +  the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}



// ----------------------------------------------------------
//
//    THE "ROWS 21–35 OF 100" WORDS
//
//    Every time the window scrolls, figure out
//    which rows you can see right now.
//
// ----------------------------------------------------------

outputBox.addEventListener('scroll', updatePosition);


function updatePosition() {

    const query = searchInput.value.trim();

    if (headerCells.length === 0) return;               //  no file yet?  Stop.

    if (matches.length === 0) {
        statusText.textContent = query === ''
            ? 'This file only has a header row'
            : 'No rows match "' + query + '"';
        return;
    }


    //  Every row is the same height.
    //  So:   how far we scrolled  ÷  one row's height  =  which row is at the top.
    const rowHeight = rowsBox.children[0].offsetHeight;
    const first = Math.min(Math.round(outputBox.scrollTop / rowHeight), matches.length - 1);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    //  expanded?  You can see them all.
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    //  small?     The top row + 14 more.


    let message = 'Rows ' + matches[first].num + '–' + matches[last].num;

    if (query === '') {
        message += ' of ' + dataRows.length;
    } else {
        message += ' (' + matches.length + ' matching row(s) for "' + query + '")';
    }

    statusText.textContent = message;
}



// ----------------------------------------------------------
//
//    THE "TOP" BUTTON
//
//    It hides until you scroll down the page.
//    Click it  ->  glide back to the top.
//
// ----------------------------------------------------------

topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', function () {
    topBtn.hidden = window.scrollY < 300;
});



// ----------------------------------------------------------
//
//    STEP 5:  DRAW THE ROWS   (this is called "render")
//
//    This runs after you pick a file,
//    and every time you type in the search bar.
//
// ----------------------------------------------------------

function render() {

    //  Your search word, in small letters.
    //  (So "ANA" and "ana" find the same thing.)
    const query = searchInput.value.trim().toLowerCase();


    //  Pick which rows to show.
    //    No search word?    Keep every row.
    //    Search word?       Keep only rows where SOME cell has it.
    //
    //  Each row also remembers its number  (1, 2, 3...  because the header is 0),
    //  so you always know where it lives in the file.
    matches = [];

    dataRows.forEach(function (cells, index) {

        const hasWord = cells.some(function (cell) {
            return cell.toLowerCase().includes(query);
        });

        if (query === '' || hasWord) {
            matches.push({ num: index + 1, cells: cells });
        }
    });


    //  Wipe the old rows away.
    rowsBox.textContent = '';


    //  Build all the new rows in a hidden box first ("fragment"),
    //  then drop them onto the page all at once.
    //  (Much faster than one at a time.)
    const fragment = document.createDocumentFragment();

    matches.forEach(function (line) {
        fragment.appendChild(makeRow(line.num, line.cells, query));
    });

    rowsBox.appendChild(fragment);


    controls.hidden = false;        //  show the Go-to-row + Expand buttons
    sizeWindow();                   //  make the window header + 15 rows tall
    outputBox.scrollTop = 0;        //  start at the top
    updatePosition();               //  update the "Rows 1–15" words
}



// ----------------------------------------------------------
//
//    BUILD ONE ROW
//
//    A row is a line of boxes, like Excel:
//
//         [ # ] [ cell ] [ cell ] [ cell ] ...
//
//    Words sit on the LEFT of their box.
//    Numbers sit on the RIGHT  (that's what Excel does).
//
// ----------------------------------------------------------

function makeRow(num, cells, query) {

    //  The row itself.
    const row = document.createElement('div');
    row.className = 'line';


    //  The row number, on the far left.
    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num;
    row.appendChild(numCell);


    //  One box for every column.
    //  (If this row is missing some cells, those boxes are just empty.)
    for (let col = 0; col < columnCount; col++) {

        const text = cells[col] || '';

        const cell = document.createElement('span');
        cell.className = 'cell';

        if (looksLikeNumber(text)) cell.classList.add('num');      //  numbers go on the right

        if (text.length > 40) cell.title = text;                   //  too long?  hover to read it all

        paintMatches(cell, text, query);

        row.appendChild(cell);
    }

    return row;
}



// ----------------------------------------------------------
//
//    IS THIS A NUMBER?
//
//    Yes:   42    -7    3.14    1,200    $9.99    50%
//    No:    Ana   22nd  hello
//
// ----------------------------------------------------------

function looksLikeNumber(text) {
    return /^\s*[-+]?[$€£]?\d[\d,]*(\.\d+)?%?\s*$/.test(text);
}



// ----------------------------------------------------------
//
//    PUT THE WORDS IN A BOX  (and paint the search word yellow)
//
//     "Ana,22,ana@ex.com"    searching "ana"
//      ^^^     ^^^            <- these get wrapped in <mark>  (yellow)
//
// ----------------------------------------------------------

function paintMatches(box, text, query) {

    //  No search?  Just put the words in.
    if (query === '') {
        box.textContent = text;
        return;
    }


    //  Search?  Walk along the words.
    //  Every time we find your word, wrap it in <mark>.
    const lower = text.toLowerCase();
    let start = 0;
    let found = lower.indexOf(query, start);

    while (found !== -1) {

        box.appendChild(document.createTextNode(text.slice(start, found)));       //  the words BEFORE your word

        const mark = document.createElement('mark');
        mark.textContent = text.slice(found, found + query.length);              //  YOUR word  (yellow)
        box.appendChild(mark);

        start = found + query.length;
        found = lower.indexOf(query, start);                                     //  look for the next one
    }

    box.appendChild(document.createTextNode(text.slice(start)));                 //  the words AFTER the last one
}
