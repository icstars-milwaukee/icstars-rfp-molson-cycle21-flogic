/*
    ==========================================================

        THE NANDO NOTES  -  scriptI.js

        This file is the BRAIN of the page.
        It makes things HAPPEN when you click and type.

    ==========================================================


    THE WHOLE STORY, IN 5 STEPS:


        1.   You pick a CSV file.

        2.   The brain reads the file.

        3.   The brain cuts the file into lines.
             (one line = one row)

        4.   The brain puts every row inside the window.
             The window only shows 15 rows at a time.
             You scroll to see the rest.

        5.   When you type in the search bar,
             the brain only keeps the rows that have your word,
             and paints your word yellow.


    Nothing leaves your computer.
    The file is read right here, in your browser.

*/



// ----------------------------------------------------------
//
//    HOW MANY ROWS FIT IN THE WINDOW
//
//    15 rows.
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
const statusText  = document.getElementById('status');         //  the "Lines 1–15 of 100" words
const outputBox   = document.getElementById('output');         //  the glass window
const rowsBox     = document.getElementById('rows');           //  the rows inside the window
const controls    = document.getElementById('controls');       //  the Go-to-line + Expand area
const jumpInput   = document.getElementById('jumpInput');      //  the "Line #" box
const jumpBtn     = document.getElementById('jumpBtn');        //  the "Go to line" button
const expandBtn   = document.getElementById('expandBtn');      //  the "Expand" button
const topBtn      = document.getElementById('topBtn');         //  the "Top" button



// ----------------------------------------------------------
//
//    THE BRAIN'S MEMORY
//
//    "let" means:  this can change later.
//
// ----------------------------------------------------------

let allLines = [];    //  EVERY line from the file.          Like:  ["name,age", "Ana,22"]
let matches  = [];    //  ONLY the lines we are showing now.  Like:  [{ num: 2, text: "Ana,22" }]



// ----------------------------------------------------------
//
//    STEP 1 + 2 + 3:  PICK A FILE  ->  READ IT  ->  CUT IT INTO LINES
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
        allLines = e.target.result.split(/\r?\n/);

        //  Files often end with one empty line. Throw it away.
        if (allLines[allLines.length - 1] === '') allLines.pop();

        //  Clean slate for the new file.
        searchInput.value = '';
        searchInput.disabled = false;       //  turn the search bar ON
        jumpInput.value = '';

        render();                           //  draw the rows  (see STEP 4 below)
    };


    reader.readAsText(file);                //  GO!  Start reading.
});



// ----------------------------------------------------------
//
//    STEP 5:  SEARCH
//
//    Every time you type a letter,
//    draw the rows again, using your new word.
//
// ----------------------------------------------------------

searchInput.addEventListener('input', render);



// ----------------------------------------------------------
//
//    GO TO LINE
//
//    Type a number  ->  click "Go to line"  (or press Enter)
//    ->  that line jumps to the top of the window
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


    //  Find the row with that line number.
    //  (If you're searching and that line is hidden, go to the next one that's showing.)
    let index = matches.findIndex(function (line) { return line.num >= target; });

    //  Number too big?  Go to the last line.
    if (index === -1) index = matches.length - 1;


    const row = rowsBox.children[index];

    if (outputBox.classList.contains('expanded')) {
        row.scrollIntoView({ block: 'center' });        //  window is expanded?  Scroll the PAGE.
    } else {
        outputBox.scrollTop = row.offsetTop;            //  window is small?  Scroll the WINDOW.
    }

    updatePosition();                                   //  update the "Lines 1–15" words


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

    expandBtn.textContent = expanded ? 'Shrink to 15-line window' : 'Expand (show all)';

    sizeWindow();
    updatePosition();
});



// ----------------------------------------------------------
//
//    MAKE THE WINDOW EXACTLY 15 ROWS TALL
//
//    Problem:  a really long line adds a sideways scrollbar,
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

    //  15 rows  +  the scrollbar
    outputBox.style.height = (WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}



// ----------------------------------------------------------
//
//    THE "LINES 21–35 OF 100" WORDS
//
//    Every time the window scrolls, figure out
//    which rows you can see right now.
//
// ----------------------------------------------------------

outputBox.addEventListener('scroll', updatePosition);


function updatePosition() {

    const query = searchInput.value.trim();

    if (allLines.length === 0) return;                  //  no file yet?  Stop.

    if (matches.length === 0) {
        statusText.textContent = 'No lines match "' + query + '"';
        return;
    }


    //  Every row is the same height.
    //  So:   how far we scrolled  ÷  one row's height  =  which row is at the top.
    const rowHeight = rowsBox.children[0].offsetHeight;
    const first = Math.round(outputBox.scrollTop / rowHeight);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    //  expanded?  You can see them all.
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    //  small?     The top row + 14 more.


    let message = 'Lines ' + matches[first].num + '–' + matches[last].num;

    if (query === '') {
        message += ' of ' + allLines.length;
    } else {
        message += ' (' + matches.length + ' matching line(s) for "' + query + '")';
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
//    STEP 4:  DRAW THE ROWS   (this is called "render")
//
//    This runs after you pick a file,
//    and every time you type in the search bar.
//
// ----------------------------------------------------------

function render() {

    //  Your search word, in small letters.
    //  (So "ANA" and "ana" find the same thing.)
    const query = searchInput.value.trim().toLowerCase();


    //  Pick which lines to show.
    //    No search word?    Keep every line.
    //    Search word?       Keep only lines that have it.
    //
    //  Each line also remembers its REAL line number,
    //  so you always know where it lives in the file.
    matches = [];

    allLines.forEach(function (text, index) {
        if (query === '' || text.toLowerCase().includes(query)) {
            matches.push({ num: index + 1, text: text });
        }
    });


    //  Wipe the old rows away.
    rowsBox.textContent = '';


    //  Build all the new rows in a hidden box first ("fragment"),
    //  then drop them onto the page all at once.
    //  (Much faster than one at a time.)
    const fragment = document.createDocumentFragment();

    matches.forEach(function (line) {
        fragment.appendChild(makeRow(line.num, line.text, query));
    });

    rowsBox.appendChild(fragment);


    controls.hidden = false;        //  show the Go-to-line + Expand buttons
    sizeWindow();                   //  make the window 15 rows tall
    outputBox.scrollTop = 0;        //  start at the top
    updatePosition();               //  update the "Lines 1–15" words
}



// ----------------------------------------------------------
//
//    BUILD ONE ROW
//
//    A row has 2 parts:
//
//         [ line number ]  [ the words from that line ]
//
//    If you're searching, your word gets painted yellow.
//
// ----------------------------------------------------------

function makeRow(num, text, query) {

    //  The row itself.
    const row = document.createElement('div');
    row.className = 'line';


    //  Part 1:  the line number.
    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num;


    //  Part 2:  the words.
    const textCell = document.createElement('span');
    textCell.className = 'line-text';


    if (query === '') {

        //  No search?  Just put the words in.
        textCell.textContent = text;

    } else {

        //  Search?  Walk along the line.
        //  Every time we find your word, wrap it in <mark>  (= yellow paint).
        //
        //     "Ana,22,ana@ex.com"    searching "ana"
        //      ^^^     ^^^            <- these get painted
        //
        const lower = text.toLowerCase();
        let start = 0;
        let found = lower.indexOf(query, start);

        while (found !== -1) {

            textCell.appendChild(document.createTextNode(text.slice(start, found)));   //  the words BEFORE your word

            const mark = document.createElement('mark');
            mark.textContent = text.slice(found, found + query.length);                //  YOUR word  (yellow)
            textCell.appendChild(mark);

            start = found + query.length;
            found = lower.indexOf(query, start);                                       //  look for the next one
        }

        textCell.appendChild(document.createTextNode(text.slice(start)));             //  the words AFTER the last one
    }


    //  Empty line?  Put a space in it, so the row doesn't squish flat.
    if (text === '') textCell.textContent = ' ';


    //  Snap the 2 parts into the row.  Done!
    row.appendChild(numCell);
    row.appendChild(textCell);
    return row;
}
