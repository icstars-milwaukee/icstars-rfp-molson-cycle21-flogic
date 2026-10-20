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

        5.   The brain shows the rows inside the window.
             The window shows 15 rows at a time.
             You scroll to see the rest.

        6.   When you type in the search bar,
             the brain only keeps the rows that have your word,
             and paints your word yellow.


    THE SPEED TRICK  (why big files don't choke):

        The brain only BUILDS the rows you can actually see,
        plus a few extra above and below.  About 35 rows.  Always.
        Even if the file has a MILLION rows.

        Above and below those rows sit two invisible "spacers."
        They're just tall empty boxes, as tall as all the rows
        that AREN'T built.  So the scrollbar still looks right.

        When you scroll, rows that leave get thrown away,
        and rows that come in get built.  Like a treadmill.

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


    Nothing leaves your computer.
    The file is read right here, in your browser.

*/



// ----------------------------------------------------------
//
//    SETTINGS
//
// ----------------------------------------------------------

const WINDOW_SIZE = 15;          //  how many rows fit in the window  (plus the header).
                                 //  If you change this, change the 15 in styleI.css too.

const EXTRA_ROWS = 15;           //  how many extra rows to build above and below the ones you see,
                                 //  so fast scrolling never shows a blank gap.
                                 //  (A whole window's worth on each side.)

const GLIDE = 0.25;              //  how fast the wheel glide catches up.
                                 //  Each frame, the window moves 25% of the way to where it's going.
                                 //  Bigger = snappier.  Smaller = floatier.  (Keep it between 0.1 and 0.5.)

const BIG_FILE = 20000;          //  files with more rows than this wait until you stop typing to search
                                 //  (so the search bar doesn't lag on every letter).

const CHUNK_TIME = 12;           //  big jobs (like cutting up a huge file) are done in small BITES.
                                 //  Each bite works for about 12 milliseconds, then lets the screen
                                 //  breathe, so the page never freezes and the loader can move.

const LOADER_DELAY = 150;        //  the loader only shows up if a job takes longer than this
                                 //  (in milliseconds).  Small files are done before it would appear,
                                 //  so it never flashes on and off for nothing.



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
const loader      = document.getElementById('loader');         //  the cloudy loading screen
const loaderPie   = document.getElementById('loaderPie');      //  the pie circle that fills up
const loaderLabel = document.getElementById('loaderLabel');    //  the words under the pie


//  The two invisible spacers  (see "THE SPEED TRICK" up top).
const topSpacer    = document.createElement('div');
const bottomSpacer = document.createElement('div');



// ----------------------------------------------------------
//
//    THE BRAIN'S MEMORY
//
//    "let" means:  this can change later.
//
// ----------------------------------------------------------

let headerCells = [];     //  the column names  (line 0).        Like:  ["name", "age"]
let dataRows    = [];     //  EVERY other row, cut into cells.    Like:  [["Ana", "22"], ["Bo", "31"]]
let searchText  = null;   //  every row squished into small letters, ready to search.  (made the first time you search)
let columnCount = 0;      //  how many columns the widest row has
let matches     = [];     //  ALL the rows that pass the search, as their spot in dataRows.  Like:  [0, 4, 9]
                          //  (Just numbers!  Way lighter than building a little object for every row.)
let allRows     = null;   //  the list for "no search":  [0, 1, 2, 3 ...]  every row.  Made once, then reused.
let query       = '';     //  the search word, in small letters

let rowHeight   = 30;     //  how tall one row is  (measured for real once the header is drawn)
let builtStart  = 0;      //  the rows that are BUILT right now:
let builtEnd    = 0;      //     from builtStart, up to (but not including) builtEnd

let searchTimer = null;   //  the "wait until they stop typing" timer, for big files

let snapTimer   = null;   //  the "wait until scrolling stops, then snap" timer
let wheelTarget = null;   //  where the mouse wheel is gliding the window to  (null = not gliding)
let wheelLeft   = 0;      //  leftover wheel spin that wasn't enough for a whole row yet
let glideSpot   = 0;      //  exactly where the glide is right now  (can be in-between pixels)
let gliding     = false;  //  is the glide moving right now?

let loadId         = 0;      //  counts every file you pick.  If you pick a NEW file while an old one
                             //  is still loading, the old one sees the number changed, and quits.
let buildingSearch = false;  //  is the brain getting the search ready right now?
let loaderTimer    = null;   //  the "wait a moment before showing the loader" timer



// ----------------------------------------------------------
//
//    STEP 1 + 2 + 3 + 4:  PICK A FILE  ->  READ IT  ->  CUT IT UP
//
// ----------------------------------------------------------

fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];     //  the file you picked

    if (!file) return;                      //  you clicked "Cancel"?  Then stop.

    const myLoad = ++loadId;                //  this file's number.  (Pick another file?  It gets a new number.)

    searchInput.disabled = true;            //  no searching while the new file loads  (it turns back on when it's done)
    startLoading('Reading the file...');    //  the loader shows up  (if this takes a while)


    const reader = new FileReader();        //  FileReader = a helper that reads files. It comes with every browser.


    //  While reading:  fill the first 20% of the pie.
    reader.onprogress = function (e) {
        if (e.lengthComputable) setProgress(0.2 * e.loaded / e.total);
    };

    //  Couldn't read it?  Put the loader away, and turn search back on  (if there's an old file to search).
    reader.onerror = function () {
        searchInput.disabled = headerCells.length === 0;
        finishLoading();
    };


    //  This part waits until the file is DONE reading.
    reader.onload = function (e) {

        if (myLoad !== loadId) return;      //  you picked a newer file in the meantime?  Forget this one.

        const text = e.target.result;       //  the whole file, as one long string
        let spot = 0;                       //  where we are in it


        //  Cut off the NEXT line, and move "spot" past it.
        //  (We don't cut the whole file into lines at once.  On a huge file,
        //   that alone freezes the page.  We cut one line at a time, in bites.)
        //
        //  Windows ends lines with  \r\n,  Mac and Linux with just  \n.  This handles both.
        function nextLine() {

            let lineEnd = text.indexOf('\n', spot);         //  find the next line break...
            const found = lineEnd !== -1;
            if (!found) lineEnd = text.length;              //  ...none left?  The line goes to the end.

            let cut = lineEnd;
            if (found && text.charCodeAt(cut - 1) === 13) cut--;     //  13 = the  \r  from Windows.  Leave it off.

            const line = text.slice(spot, cut);
            spot = lineEnd + 1;
            return line;
        }


        //  Line 0  =  the header  (the column names).
        //  Everything after it  =  the data rows.
        //  Every line gets cut into cells.
        //  (A file that ends with a line break doesn't get an extra empty row at the end.)
        const newHeader = splitIntoCells(spot < text.length ? nextLine() : '');
        const newRows   = [];

        //  While we cut, remember the LONGEST thing in each column.
        //  (That's how wide each column needs to be.  Doing it now, while we're
        //   already looking at every cell, saves a whole extra trip through the file.)
        const longest = newHeader.map(function (name) { return name.length; });

        setLoadingLabel('Cutting it into rows...');


        //  Cut the rows in BITES, so the page never freezes.
        function cutSomeRows() {

            if (myLoad !== loadId) return;  //  a newer file?  Stop.

            const stopAt = performance.now() + CHUNK_TIME;

            //  Cut rows until this bite's time is up  (checking the clock every 500 rows).
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

            //  Fill the pie:  20% (reading)  +  up to 75% more (cutting).
            setProgress(0.2 + 0.75 * Math.min(spot / Math.max(text.length, 1), 1));

            //  More to do?  Let the screen breathe, then take the next bite.
            if (spot < text.length) {
                setTimeout(cutSomeRows, 0);
                return;
            }


            //  ALL DONE.  Now swap in the new file.
            headerCells = newHeader;
            dataRows    = newRows;
            columnCount = longest.length;       //  the widest row decides how many columns there are
            searchText  = null;                 //  new file  =  throw away the old search copy
            allRows     = null;                 //  ...and the old "every row" list

            //  Clean slate for the new file.
            searchInput.value = '';
            searchInput.disabled = false;       //  turn the search bar ON
            jumpInput.value = '';

            setColumnWidths(longest);           //  decide how wide each column is
            drawHeader();                       //  draw line 0
            render();                           //  show the rows  (see STEP 5 below)
            finishLoading();                    //  the pie fills up, and the loader goes away
        }

        cutSomeRows();                          //  take the first bite
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

    //  SPEED TRICK:  no quotes in this line?
    //  Then every comma is a cut.  Chop it all at once.  (Way faster.)
    if (line.indexOf('"') === -1) return line.split(',');


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
//    Make each column fit the longest thing in it.
//    (The longest things were measured while the file was being cut up.
//     "longest" is that list:  [12, 3, 25]  =  12 letters, 3 letters, 25 letters.)
//
//       Not too skinny  (at least 6 letters wide)
//       Not too fat     (at most 40 letters wide)
//
//    Too long for 40?  It gets cut off with "…"
//    and you can hover over it to read the whole thing.
//
// ----------------------------------------------------------

function setColumnWidths(longest) {

    const widths = [];

    for (let col = 0; col < columnCount; col++) {

        //  Squeeze it between 6 and 40.
        //  (+2 extra, because some letters like "W" and "$" are wider than normal.)
        const letters = Math.min(Math.max(longest[col] + 2, 6), 40);

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

    const row = makeRow(0, headerCells, '', 0);         //  line number 0, the column names, no search
    row.classList.add('header-row');

    headerBox.appendChild(row);

    //  The header is the same height as every row.
    //  Measure it, so the brain knows exactly how tall one row is.
    rowHeight = row.offsetHeight || 30;
}



// ----------------------------------------------------------
//
//    STEP 6:  SEARCH
//
//    Every time you type a letter,
//    show the rows again, using your new word.
//
//    Big file?  Wait until you stop typing for a moment  (0.2 seconds),
//    so the brain doesn't search a million rows for EVERY letter.
//
// ----------------------------------------------------------

searchInput.addEventListener('input', function () {

    if (dataRows.length <= BIG_FILE) {
        render();
        return;
    }

    clearTimeout(searchTimer);                  //  you typed again?  Cancel the last countdown...
    searchTimer = setTimeout(render, 200);      //  ...and start a new one.
});



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
    //
    //  The rows are in order, so we don't check them one by one.
    //  We play "guess the number":  look at the MIDDLE, throw away the wrong half, repeat.
    //  A million rows takes about 20 guesses, instead of a million checks.
    let low  = 0;
    let high = matches.length;

    while (low < high) {
        const middle = Math.floor((low + high) / 2);

        if (matches[middle] + 1 < target) {
            low = middle + 1;               //  too small  ->  the answer is in the top half
        } else {
            high = middle;                  //  big enough  ->  the answer is here, or in the bottom half
        }
    }

    let index = low;

    //  Number too big?  Go to the last row.
    if (index === matches.length) index = matches.length - 1;


    if (outputBox.classList.contains('expanded')) {

        //  Window is expanded?  Scroll the PAGE so the row lands in the middle of the screen.
        const rowsTopOnPage = rowsBox.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, rowsTopOnPage + index * rowHeight - window.innerHeight / 2);
        buildVisibleRows();

    } else {

        //  Window is small?  Scroll the WINDOW so the row sits right under the header.
        //  (Build the rows there FIRST, so the window has something to land on.)
        const top = index * rowHeight;
        buildVisibleRows(top);
        outputBox.scrollTop = top;
    }

    updatePosition();                                   //  update the "Rows 1–15" words


    //  Make the row flash blue.
    //  (Take the flash off, then put it back on, so it plays again every time.)
    const row = rowsBox.querySelector('[data-index="' + index + '"]');
    if (!row) return;

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
//    (Even "show all" only BUILDS the rows on your screen.
//     The page just gets as tall as all of them.)
//
// ----------------------------------------------------------

expandBtn.addEventListener('click', function () {

    //  "toggle" = a light switch.  On -> Off.  Off -> On.
    const expanded = outputBox.classList.toggle('expanded');

    expandBtn.textContent = expanded ? 'Shrink to 15-row window' : 'Expand (show all)';

    sizeWindow();
    buildVisibleRows();
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

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;


    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;    //  how tall the scrollbar is

    //  the header  +  15 rows  +  the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + WINDOW_SIZE * rowHeight + scrollbar) + 'px';
}



// ----------------------------------------------------------
//
//    THE "ROWS 21–35 OF 100" WORDS
//
//    Figure out which rows you can see right now.
//
// ----------------------------------------------------------

function updatePosition() {

    if (headerCells.length === 0) return;               //  no file yet?  Stop.

    const word = searchInput.value.trim();

    if (matches.length === 0) {
        statusText.textContent = word === ''
            ? 'This file only has a header row'
            : 'No rows match "' + word + '"';
        return;
    }


    //  Every row is the same height.
    //  So:   how far we scrolled  ÷  one row's height  =  which row is at the top.
    const first = Math.min(Math.round(outputBox.scrollTop / rowHeight), matches.length - 1);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    //  expanded?  You can see them all.
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    //  small?     The top row + 14 more.


    //  matches holds spots in dataRows  (0, 1, 2...).  Row numbers start at 1  (the header is 0).  So:  +1.
    let message = 'Rows ' + (matches[first] + 1) + '–' + (matches[last] + 1);

    if (word === '') {
        message += ' of ' + dataRows.length;
    } else {
        message += ' (' + matches.length + ' matching row(s) for "' + word + '")';
    }

    statusText.textContent = message;
}



// ----------------------------------------------------------
//
//    SCROLLING
//
//    Window scrolls  ->  build the rows coming in, update the words.
//    Page scrolls    ->  same thing, but only matters when expanded.
//
// ----------------------------------------------------------

outputBox.addEventListener('scroll', function () {
    buildVisibleRows();
    updatePosition();

    //  Every time the window moves, restart the countdown.
    //  When it's been still for 0.15 seconds  ->  snap.
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToRow, 150);
});



// ----------------------------------------------------------
//
//    SNAPPY SCROLLING
//
//    The window always stops on a WHOLE row.  Never half a row.
//
//    Two parts:
//
//      1.  The mouse wheel picks a spot on a whole row,
//          and the window GLIDES there.   (one click of the wheel = about 3 rows)
//
//      2.  Any other scrolling  (dragging the scrollbar, the keyboard)
//          gets a tiny glide to the nearest whole row when it stops.
//
//    Why not let the browser snap?  The browser can only snap to rows
//    that are BUILT.  Jump far away, and it would yank you back
//    to the nearest built row.  The brain knows where EVERY row is,
//    even the ones that aren't built.
//
//
//    HOW THE GLIDE STAYS SMOOTH:
//
//      There's only ever ONE glide.  The wheel doesn't start a new glide
//      every time you spin it.  It just MOVES THE FINISH LINE.
//      The glide keeps going, smoothly, toward wherever the finish line is now.
//
//      Like a dog chasing a ball:  throw the ball again,
//      the dog doesn't stop and restart.  It just turns and keeps running.
//
//         spin, spin, spin  ->   finish line:  row 4  ->  row 7  ->  row 10
//         the glide         ->   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~>  (never stops in the middle)
//
// ----------------------------------------------------------

outputBox.addEventListener('wheel', function (e) {

    //  Expanded?  Scrolling sideways?  Holding Shift?  Let the browser handle it.
    if (outputBox.classList.contains('expanded')) return;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;


    //  Some mice count in "lines" instead of pixels.  Turn lines into pixels.
    const pixels = e.deltaMode === 1 ? e.deltaY * rowHeight : e.deltaY;

    const bottom = outputBox.scrollHeight - outputBox.clientHeight;

    //  Already at the very top or bottom?  Let the PAGE scroll instead.
    if ((pixels < 0 && outputBox.scrollTop <= 0) || (pixels > 0 && outputBox.scrollTop >= bottom)) return;

    e.preventDefault();                     //  "browser, don't scroll.  I've got this."


    //  No finish line yet?  Start from the row we're on now.
    if (wheelTarget === null) {
        wheelTarget = Math.round(outputBox.scrollTop / rowHeight) * rowHeight;
        glideSpot = outputBox.scrollTop;
    }


    //  Add up the wheel spin.  Every full row's worth  ->  move the finish line one row.
    //  (Trackpads send lots of tiny spins.  They add up until they make a whole row.)
    wheelLeft += pixels;
    const rows = Math.trunc(wheelLeft / rowHeight);
    if (rows === 0) return;
    wheelLeft -= rows * rowHeight;


    //  Move the finish line  (but never past the top or the bottom).
    wheelTarget = Math.min(Math.max(wheelTarget + rows * rowHeight, 0), bottom);


    //  Not gliding yet?  Start the glide.  (Already gliding?  It'll just follow the new finish line.)
    if (!gliding) {
        gliding = true;
        requestAnimationFrame(glideStep);
    }

}, { passive: false });     //  "passive: false"  =  "I might say preventDefault, so wait for me."



// ----------------------------------------------------------
//
//    ONE STEP OF THE GLIDE
//
//    The screen redraws about 60 times a second.
//    Every redraw, the window moves 25% of the way to the finish line.
//
//       far away   ->  big steps    (fast)
//       almost there  ->  tiny steps  (gentle landing)
//
//    "requestAnimationFrame" = "run this again right before the next redraw."
//
// ----------------------------------------------------------

function glideStep() {

    //  The finish line got cleared?  Stop.
    if (wheelTarget === null) {
        gliding = false;
        return;
    }

    //  Someone else moved the window  (like dragging the scrollbar)?  Let them.  Stop gliding.
    if (Math.abs(outputBox.scrollTop - glideSpot) > 2) {
        gliding = false;
        wheelTarget = null;
        wheelLeft = 0;
        return;
    }


    const gap = wheelTarget - glideSpot;          //  how far to the finish line

    //  Basically there?  Land EXACTLY on the row, and stop.
    if (Math.abs(gap) < 0.5) {
        glideSpot = wheelTarget;
        outputBox.scrollTop = wheelTarget;
        gliding = false;
        return;
    }

    //  Move 25% of the way there.
    glideSpot += gap * GLIDE;
    outputBox.scrollTop = glideSpot;

    requestAnimationFrame(glideStep);             //  same thing again, next redraw
}


function snapToRow() {

    wheelTarget = null;                     //  the glide is over
    wheelLeft = 0;

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    //  Already on a whole row?  Nothing to do.
    const nearest = Math.round(outputBox.scrollTop / rowHeight) * rowHeight;
    if (Math.abs(outputBox.scrollTop - nearest) < 1) return;

    outputBox.scrollTo({ top: nearest, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
    if (outputBox.classList.contains('expanded')) buildVisibleRows();
});

window.addEventListener('resize', function () {
    buildVisibleRows();
});



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
//    STEP 5:  PICK THE ROWS TO SHOW   (this is called "render")
//
//    This runs after you pick a file,
//    and every time you search.
//
//    It decides WHICH rows pass the search,
//    then hands off to buildVisibleRows() to actually build them.
//
// ----------------------------------------------------------

function render() {

    //  Your search word, in small letters.
    //  (So "ANA" and "ana" find the same thing.)
    query = searchInput.value.trim().toLowerCase();


    //  The first time you search, the search copy isn't ready yet.
    //  Get it ready  (in bites, with the loader),  and it'll come back here when it's done.
    if (query !== '' && searchText === null) {
        buildSearchText();
        return;
    }


    //  Pick which rows to show.
    //    No search word?    Keep every row.   (Use the "every row" list.  Make it the first time.)
    //    Search word?       Keep only rows that have it.
    //
    //  Each match is just the row's spot in dataRows  (0, 1, 2...).
    //  Its row NUMBER is that  +1,  because the header is row 0.
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


    //  Start over:  wipe the old rows, put the 2 spacers in.
    //  (No matches?  Leave it totally empty, and the window hides itself.)
    rowsBox.textContent = '';
    builtStart = 0;
    builtEnd = 0;

    if (matches.length > 0) {
        rowsBox.appendChild(topSpacer);
        rowsBox.appendChild(bottomSpacer);
    }


    controls.hidden = false;        //  show the Go-to-row + Expand buttons
    sizeWindow();                   //  make the window header + 15 rows tall
    outputBox.scrollTop = 0;        //  start at the top
    buildVisibleRows();             //  build the rows you can see
    updatePosition();               //  update the "Rows 1–15" words
}



// ----------------------------------------------------------
//
//    GET THE SEARCH READY   (only once per file, the first time you search)
//
//    Squish every row into one small-letter string.
//    Then every search after that just checks those strings.  (Way faster.)
//
//        ["Ana", "22", "Chicago"]   ->   "ana␀22␀chicago"
//
//    The ␀ is an invisible "wall" between cells,
//    so a search can never accidentally match ACROSS two cells.
//
//    Big file?  This is done in BITES, with the loader,
//    so the page doesn't freeze.  When it's done, it runs render() again.
//
// ----------------------------------------------------------

function buildSearchText() {

    if (buildingSearch) return;             //  already on it?  (You typed more while it works.)  Don't start twice.
    buildingSearch = true;

    const myLoad = loadId;                  //  which file this is for
    const rows   = dataRows;                //  hold on to THIS file's rows
    const built  = [];
    let i = 0;

    startLoading('Getting search ready...');


    function squishSomeRows() {

        //  You picked a new file in the meantime?  This copy is for the old one.  Stop.
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

        //  More to do?  Let the screen breathe, then take the next bite.
        if (i < rows.length) {
            setTimeout(squishSomeRows, 0);
            return;
        }


        //  Done!  Keep it, put the loader away, and search for real.
        searchText = built;
        buildingSearch = false;
        finishLoading();
        render();
    }

    squishSomeRows();                       //  take the first bite
}



// ----------------------------------------------------------
//
//    BUILD ONLY THE ROWS YOU CAN SEE   (the treadmill)
//
//    1.  Figure out which rows are on screen  (+ 10 extra on each side).
//    2.  Throw away built rows that are now off screen.
//    3.  Build the rows that just came on screen.
//    4.  Stretch the spacers to fill in for everything else.
//
//    "scrollSpot" is optional:  "pretend the window is scrolled HERE."
//    (Go to row uses it, to build rows BEFORE jumping to them.)
//
// ----------------------------------------------------------

function buildVisibleRows(scrollSpot) {

    if (matches.length === 0) return;


    //  1.  Where are we looking?
    let viewTop, viewHeight;

    if (outputBox.classList.contains('expanded')) {
        viewTop    = -rowsBox.getBoundingClientRect().top;      //  how far the rows' top has scrolled above the screen
        viewHeight = window.innerHeight;                        //  the whole screen
    } else {
        viewTop    = scrollSpot !== undefined ? scrollSpot : outputBox.scrollTop;
        viewHeight = outputBox.clientHeight;                    //  the window
    }

    //  Turn that into row numbers  (+ extras),  kept inside  0 ... the last row.
    const start = Math.max(0, Math.floor(viewTop / rowHeight) - EXTRA_ROWS);
    const end   = Math.min(matches.length, Math.ceil((viewTop + viewHeight) / rowHeight) + EXTRA_ROWS);


    //  2 + 3.  Swap rows in and out.

    if (start >= builtEnd || end <= builtStart) {

        //  Jumped somewhere totally new?  Throw ALL the built rows away, build fresh.
        while (topSpacer.nextSibling !== bottomSpacer) topSpacer.nextSibling.remove();
        bottomSpacer.before(buildRows(start, end));

    } else {

        //  Scrolled a bit?  Only fix the edges.

        //  Top edge:  rows scrolled off the top  ->  throw away.   New rows above  ->  build.
        for (let i = builtStart; i < start; i++) topSpacer.nextSibling.remove();
        if (start < builtStart) topSpacer.after(buildRows(start, builtStart));

        //  Bottom edge:  rows scrolled off the bottom  ->  throw away.   New rows below  ->  build.
        for (let i = builtEnd; i > end; i--) bottomSpacer.previousSibling.remove();
        if (end > builtEnd) bottomSpacer.before(buildRows(builtEnd, end));
    }

    builtStart = start;
    builtEnd = end;


    //  4.  Stretch the spacers.
    //      top spacer     =  as tall as all the rows ABOVE the built ones
    //      bottom spacer  =  as tall as all the rows BELOW the built ones
    topSpacer.style.height    = (start * rowHeight) + 'px';
    bottomSpacer.style.height = ((matches.length - end) * rowHeight) + 'px';
}



// ----------------------------------------------------------
//
//    BUILD A BUNCH OF ROWS  (from row "from" up to, but not including, row "to")
//
//    They're built in a hidden box first ("fragment"),
//    then dropped onto the page all at once.
//    (Much faster than one at a time.)
//
// ----------------------------------------------------------

function buildRows(from, to) {

    const fragment = document.createDocumentFragment();

    for (let i = from; i < to; i++) {
        const spot = matches[i];                //  where this row lives in dataRows
        fragment.appendChild(makeRow(spot + 1, dataRows[spot], query, i));
    }

    return fragment;
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
//    "index" = this row's spot in the list on screen  (0, 1, 2...).
//    Every other row gets a "zebra" stripe.
//
// ----------------------------------------------------------

function makeRow(num, cells, query, index) {

    //  The row itself.
    const row = document.createElement('div');
    row.className = 'line';
    row.dataset.index = index;                                     //  a name tag, so Go to row can find it

    if (index % 2 === 1) row.classList.add('zebra');               //  every other row:  stripe


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



// ----------------------------------------------------------
//
//    THE LOADER
//
//    A big job starts         ->  startLoading()
//    The job gets further     ->  setProgress(0.5)      (0 = nothing done,  1 = all done)
//    The job is finished      ->  finishLoading()
//
//    The screen clouds up, and a pie circle fills up all the way around
//    into a solid color, then the cloud clears.
//
//    It WAITS a moment before showing up  (LOADER_DELAY).
//    Quick jobs are done before then, so you never see it flash.
//
// ----------------------------------------------------------

function startLoading(words) {

    setLoadingLabel(words);
    setProgress(0);
    loader.classList.remove('done');

    //  Only show it if the job is still going after a moment.
    clearTimeout(loaderTimer);
    loaderTimer = setTimeout(function () {
        loader.hidden = false;
        void loader.offsetWidth;            //  (a trick:  make the browser notice it's there, so the cloud can FADE in)
        loader.classList.add('show');
    }, LOADER_DELAY);
}


//  Fill the pie.  0.25 = a quarter of the way around.  1 = all the way.
//  The clothes turn this number into degrees  (see "--done" in styleI.css).
function setProgress(amount) {
    loaderPie.style.setProperty('--done', amount);
}


function setLoadingLabel(words) {
    loaderLabel.textContent = words;
}


function finishLoading() {

    clearTimeout(loaderTimer);              //  not shown yet?  Then it never will be.

    if (!loader.classList.contains('show')) {
        loader.hidden = true;
        return;
    }

    //  It's showing:  fill the pie all the way  (solid!),  let you see that for a moment,
    //  then clear the cloud.
    setProgress(1);
    loader.classList.add('done');

    loaderTimer = setTimeout(function () {
        loader.classList.remove('show');                    //  the cloud fades away...
        loaderTimer = setTimeout(function () {
            loader.hidden = true;                           //  ...then it's gone for real.
        }, 250);
    }, 300);
}



// ----------------------------------------------------------
//
//    THE THEME HEXAGON  (top-left corner)
//
//    Click the hexagon  ->  the theme menu floats down.
//    Click a theme      ->  the whole page changes colors.
//    Click anywhere else, or press Escape  ->  the menu goes away.
//
//    The colors live in styleI.css  (look for  [data-theme="..."]).
//    This list just says which themes exist,
//    and what color each one's name glows.
//
//    Want a new theme?  Add one line here,
//    plus a color block in styleI.css with the same id.
//
// ----------------------------------------------------------

const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#4a5260', glow: 'rgba(165, 175, 190, 0.95)' },
];

const themeHex  = document.getElementById('themeHex');      //  the hexagon button
const themeMenu = document.getElementById('themeMenu');     //  the floating menu
const themeList = document.getElementById('themeList');     //  the list of themes inside it

let currentTheme = THEMES[0];                               //  Neo-Neutral is the default


//  Put on a theme.
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme.id;      //  <html data-theme="neo-neutral">  ->  styleI.css picks the colors
    themeHex.title = 'Theme: ' + theme.name;
    buildThemeList();                                       //  move the check mark
}


//  Build one button per theme:    [⬢]  Neo-Neutral  ✓
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


function openThemeMenu() {
    themeMenu.hidden = false;
    themeHex.setAttribute('aria-expanded', 'true');
    themeList.querySelector('[aria-checked="true"]').focus();   //  so the keyboard is ready to pick
}

function closeThemeMenu() {
    themeMenu.hidden = true;
    themeHex.setAttribute('aria-expanded', 'false');
}


//  Click the hexagon  ->  open.  Click it again  ->  close.
themeHex.addEventListener('click', function () {
    if (themeMenu.hidden) {
        openThemeMenu();
    } else {
        closeThemeMenu();
    }
});


//  Click somewhere that's NOT the menu or the hexagon  ->  close.
document.addEventListener('click', function (event) {
    if (!themeMenu.hidden && !themeMenu.contains(event.target) && !themeHex.contains(event.target)) {
        closeThemeMenu();
    }
});


//  Press Escape  ->  close, and go back to the hexagon.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !themeMenu.hidden) {
        closeThemeMenu();
        themeHex.focus();
    }
});


//  Start with the default.
setTheme(currentTheme);
