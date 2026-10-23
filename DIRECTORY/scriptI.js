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

const EXTRA_COLUMNS = 8;         //  the SIDEWAYS treadmill:  how many extra columns to build
                                 //  to the left and right of the ones you see.

const MAX_SCROLL_WIDTH = 4000000;    //  browsers stop DRAWING text past about 8 million pixels
                                     //  (sooner on sharp, high-resolution screens).
                                     //  A sheet wider than THIS gets a "scaled" sideways scrollbar:
                                     //  one pixel of scrollbar moves you more than one pixel of sheet.

const MAX_SCROLL_HEIGHT = 4000000;   //  same thing, up and down.  4 million pixels  =  about 133,000 rows.
                                     //  More rows than that?  The up-and-down scrollbar gets "scaled" too,
                                     //  but the wheel still moves exactly 3 rows per click.

const NUM_WIDTH = 60;            //  how wide the row-number column is  (in pixels)

const EXTRA_ROWS = 15;           //  how many extra rows to build above and below the ones you see,
                                 //  so fast scrolling never shows a blank gap.
                                 //  (A whole window's worth on each side.)

const GLIDE = 0.25;              //  how fast the wheel glide catches up.
                                 //  Every 60th of a second, the window moves 25% of the way to where it's going.
                                 //  (Timed by the CLOCK,  not by frames:  it feels the same on a 60, 120, or 144 Hz screen.)
                                 //  Bigger = snappier.  Smaller = floatier.  (Keep it between 0.1 and 0.5.)

const BIG_FILE = 20000;          //  files with more rows than this wait until you stop typing to search
                                 //  (so the search bar doesn't lag on every letter).

const CHUNK_TIME = 12;           //  big jobs (like cutting up a huge file) are done in small BITES.
                                 //  Each bite works for about 12 milliseconds, then lets the screen
                                 //  breathe, so the page never freezes and the loader can move.


//  "Take the next bite":  let the screen breathe  (draw,  handle a click),  then run "fn".
//  Why not  setTimeout(fn, 0)?  After 5 in a row,  browsers make EVERY setTimeout wait at least 4 ms,
//  even with nothing else to do.  A big file takes dozens of bites:  that's a lot of waiting for nothing.
//  A message to ourselves  (a "MessageChannel")  has no such wait.
const biteChannel = new MessageChannel();
const biteQueue   = [];
biteChannel.port1.onmessage = function () { biteQueue.shift()(); };

function nextBite(fn) {
    biteQueue.push(fn);
    biteChannel.port2.postMessage(0);
}

const LOADER_DELAY = 150;        //  the loader only shows up if a job takes longer than this
                                 //  (in milliseconds).  Small files are done before it would appear,
                                 //  so it never flashes on and off for nothing.

const SHOW_LETTERS = 1000;       //  a cell with MORE letters than this only shows (and hovers) its first 1,000.
                                 //  You can only SEE about 40 anyway.  Putting 50 million letters
                                 //  in one box froze the page.

const QUOTE_LIMIT = 32767;       //  a quote that's still open this many letters past a line break is a MISTAKE
                                 //  (a stray quote, like  5'10"  ).  Excel can't fit more than 32,767 letters
                                 //  in one cell either.



// ----------------------------------------------------------
//
//    STEP 0:  FIND THE PIECES ON THE PAGE
//
//    Every piece in testI.html has a name tag  (id="...").
//    Here we find each piece by its name tag,
//    so the brain can talk to it later.
//
// ----------------------------------------------------------

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
const searchInput = document.getElementById('searchInput');    //  the search bar
const statusText  = document.getElementById('status');         //  the "Rows 1–15 of 100" words
const outputBox   = document.getElementById('output');         //  the glass window
const headerBox   = document.getElementById('header');         //  the header row  (line 0)
const rowsBox     = document.getElementById('rows');           //  the rows inside the window
const controls    = document.getElementById('controls');       //  the Drag mode + Go-to-row + Expand area
const dragBtn     = document.getElementById('dragBtn');        //  the "Drag mode" button  (on / off)
const dragAnchor  = document.getElementById('dragAnchor');     //  drag mode's anchor dot
const jumpInput   = document.getElementById('jumpInput');      //  the "Row #" box
const jumpBtn     = document.getElementById('jumpBtn');        //  the "Go to row" button
const expandBtn   = document.getElementById('expandBtn');      //  the "Expand" button
const viewBtn     = document.getElementById('viewBtn');        //  "Spreadsheet View"  /  "CSV View"
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

//  THE ROWS.  They're NOT cut into cells and kept.  (Every cell as its own little string
//  took about 4 times the file's size in memory.)  Instead:  the whole file stays as ONE string,
//  plus a list of where each row STARTS.  A row only gets cut into cells when it's on screen.
//
//      fileText:   "name,age\nAna,22\nBo,31\n"
//      rowStart:   [9, 16, 22]      <-  row 0 starts at letter 9, row 1 at 16...  (+1 extra:  where the last row ENDS)
//
let fileText    = '';                   //  the whole file, as one long string
let rowStart    = new Uint32Array(1);   //  where each row starts in fileText  (4 bytes per row.  Super light.)
let rowCount    = 0;                    //  how many rows  (not counting the header)
let rowCache    = new Map();            //  rows looked at lately:  where their commas are  (so cutting out a few columns is quick)
let cacheCells  = 0;                    //  how many cells are in rowCache, all together  (too many?  it gets emptied)

let searchText  = null;   //  every row squished into small letters, ready to search.  (made the first time you search)
let columnCount = 0;      //  how many columns to lay out  (the real ones,  + the empty ones in the spreadsheet look)
let dataColumns = 0;      //  how many REAL columns:  the widest row has this many
let matches     = [];     //  ALL the rows that pass the search, as their row number  (0, 1, 2...).  Like:  [0, 4, 9]
                          //  (Just numbers!  Way lighter than building a little object for every row.)
let allRows     = null;   //  the list for "no search":  [0, 1, 2, 3 ...]  every row.  Made once, then reused.
let query       = '';     //  the search word, in small letters

let rowHeight   = 30;     //  how tall one row is  (measured for real once the header is drawn)
let builtStart  = 0;      //  the rows that are BUILT right now:
let builtEnd    = 0;      //     from builtStart, up to (but not including) builtEnd

let rowsScaled  = false;  //  too many rows to draw at full height?  (then the up-and-down scrollbar is "scaled")
let rowsHeight  = 0;      //  how tall the rows area REALLY is on the page  (never more than MAX_SCROLL_HEIGHT)
let viewY       = 0;      //  where you're looking, in "full height" pixels:  row 500,000 is at 500,000 x 30.
                          //  This is the brain's own exact number.  (The scrollbar only knows a squeezed one.)
let expectedTop = 0;      //  where the brain last PUT the scrollbar.  If it's somewhere else, YOU moved it.

let dataWidths    = null; //  how wide each REAL column is, in pixels.         Like:  [96, 64, 150]
let columnWidths  = null; //  how wide each column is  (real + empty ones).   Like:  [96, 64, 150, 100, 100]
let columnStarts  = null; //  where each column STARTS  (a running total).   Like:  [0, 96, 160, 310]
                          //  (one extra at the end  =  where the last column ends  =  the whole sheet's width)
let sheetWidth    = 0;    //  how wide ALL the columns are, added up
let scrollWidth   = 0;    //  how wide the scrollable area is  (the sheet, or MAX_SCROLL_WIDTH if the sheet is wider)
let builtColStart = 0;    //  the columns that are BUILT right now:
let builtColEnd   = 0;    //     from builtColStart, up to (but not including) builtColEnd
let lastColumns   = '';   //  the last column list we handed the clothes  (so we don't hand over the same one twice)

let searchTimer = null;   //  the "wait until they stop typing" timer, for big files
let searchId    = 0;      //  counts every search.  Type again while one is running?  The old one sees the number changed, and quits.
let doneQuery   = null;   //  the last search that FINISHED  ...
let doneMatches = null;   //  ...and its matches.  (Type MORE onto that word, and only these rows get checked.)

let snapTimer   = null;   //  the "wait until scrolling stops, then snap" timer
let wheelTarget = null;   //  where the mouse wheel is gliding the window to  (null = not gliding)
let wheelLeft   = 0;      //  leftover wheel spin that wasn't enough for a whole row yet
let glideSpot   = 0;      //  exactly where the glide is right now  (can be in-between pixels)
let gliding     = false;  //  is the glide moving right now?
let glideLast   = 0;      //  the time of the glide's last step  (0 = it's just starting)

let loadId         = 0;      //  counts every file you pick.  If you pick a NEW file while an old one
                             //  is still loading, the old one sees the number changed, and quits.
let fileNote       = '';     //  a note added to the "Rows 1–15" words about how the file was read  (or nothing)
let excelLook      = false;  //  showing the file in its OWN look?  CSV + Excel:  the spreadsheet look.   SQL:  the table look.  (See SPREADSHEET VIEW <-> CSV VIEW.)
let buildingSearch = false;  //  is the brain getting the search ready right now?
let loaderTimer    = null;   //  the "wait a moment before showing the loader" timer



// ----------------------------------------------------------
//
//    STEP 1 + 2 + 3 + 4:  PICK A FILE  ->  READ IT  ->  CUT IT UP
//
// ----------------------------------------------------------

//  WHICH "RULEBOOK" IS THIS FILE WRITTEN IN?   (its "encoding")
//
//  A file is just numbers  (bytes).  The rulebook says which number is which letter.
//  Plain letters, numbers and commas are the SAME in every rulebook.  Only special ones differ:
//
//      letter    UTF-8  (modern)    Windows-1252  (older Excel "CSV")
//        A            41                 41
//        é          C3 A9                E9
//        €         E2 82 AC              80
//
//  We read as UTF-8, unless the bytes BREAK UTF-8's rules.  Then it must be the older Excel rulebook.
//  (Read old-Excel bytes as UTF-8 and every é turns into  �.)
//
//  isUtf8(file, howMuch, done):  checks the first "howMuch" bytes, a slice at a time,
//  with a STRICT decoder that throws an error at the first broken byte.
//  Then calls  done(true)  or  done(false).
function isUtf8(file, howMuch, done) {

    const decoder = new TextDecoder('utf-8', { fatal: true });    //  fatal  =  "throw an error, don't put in a  �"
    const SLICE   = 16 * 1024 * 1024;                               //  16 MB at a time  (so memory stays low)
    const end     = Math.min(howMuch, file.size);
    let at = 0;

    (function next() {

        if (at >= end) {
            //  Checked the WHOLE file?  Make sure it didn't stop halfway through a letter.
            //  (Only checked the start?  Stopping halfway is fine.  The rest just wasn't checked.)
            if (end === file.size) {
                try { decoder.decode(); } catch (e) { done(false); return; }
            }
            done(true);
            return;
        }

        file.slice(at, Math.min(at + SLICE, end)).arrayBuffer().then(function (bytes) {

            //  A UTF-16 file  (Excel's "Unicode Text")?  It starts with a marker:  FF FE  or  FE FF.
            //  The browser spots that marker by itself and reads it right.  So:  fine.
            const b = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
            if (at === 0 && b.length === 2 && ((b[0] === 0xFF && b[1] === 0xFE) || (b[0] === 0xFE && b[1] === 0xFF))) {
                done(true);
                return;
            }

            at += SLICE;
            try {
                decoder.decode(bytes, { stream: true });    //  stream  =  "a letter might keep going in the next slice"
            } catch (e) {
                done(false);                                //  a broken byte:  NOT UTF-8
                return;
            }
            next();

        }, function () {
            done(true);     //  couldn't even read it?  Let the normal reading try  (it has its own error message).
        });
    })();
}


//  Clear the button every time you CLICK it.
//  (The browser only says "change" if you pick a DIFFERENT file.  So without this,
//   editing a file in Excel and picking it again would do nothing.)
fileInput.addEventListener('click', function () {
    fileInput.value = '';
});


//  The "Choose File" button just opens the real file picker.
//  (The picker itself is out of sight:  its spot in the bar is the aimbot window's now.)
chooseBtn.addEventListener('click', function () {
    fileInput.click();
});


fileInput.addEventListener('change', function (event) {

    const file = event.target.files[0];     //  the file you picked

    if (file) loadFile(file, null);         //  (you clicked "Cancel"?  Then there's no file:  do nothing)
});


//  READ A FILE, and show it.
//  "sheet"  =  for an Excel file:  which sheet to show  (0 = the first).   null  =  the first real one that isn't hidden.
//  (Picking a file calls this.  So does clicking a sheet tab:  same file, another sheet.)
function loadFile(file, sheet) {

    const myLoad = ++loadId;                //  this file's number.  (Pick another file?  It gets a new number.)

    searchInput.disabled = true;            //  no searching while the new file loads  (it turns back on when it's done)
    startLoading('Reading the file...');    //  the loader shows up  (if this takes a while)


    const reader = new FileReader();        //  FileReader = a helper that reads files. It comes with every browser.

    let encoding     = 'utf-8';             //  which rulebook to read it with  (decided just before reading, at the bottom)
    let checkedWhole = false;               //  did the safety net already check the WHOLE file?
    let excel        = null;                //  an Excel file?  Its notes  (from xlsxI.js).   A CSV?  null.
    let sql          = null;                //  a SQL dump?  Its notes  (from sqlI.js).   Otherwise  null.
    const isSql      = /\.sql$/i.test(file.name);      //  a SQL dump is text too:  it's told apart by its name


    //  While reading:  fill the first 20% of the pie.
    reader.onprogress = function (e) {
        if (e.lengthComputable) setProgress(0.2 * e.loaded / e.total);
    };

    //  Couldn't read it?  Put the loader away, turn search back on  (if there's an old file to search),
    //  and SAY what happened.  (The browser's own reason is no help:  it blames "permission problems"
    //  even when the file is just too big.)
    //  "why"  =  the words to show, if we already know what's wrong  (like a broken Excel file).
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

    reader.onerror = function () {
        if (myLoad !== loadId) return;      //  you picked a newer file in the meantime?  Forget this one.
        couldNotRead();
    };


    //  This part waits until the file is DONE reading.
    reader.onload = function (e) {

        if (myLoad !== loadId) return;      //  you picked a newer file in the meantime?  Forget this one.

        const text = e.target.result;       //  the whole file, as one long string

        //  The file HAS stuff in it, but we got nothing back?  The read failed.
        //  (A too-big file read from disk does this:  no error, just an empty string.)
        if (text.length === 0 && file.size > 0) {
            couldNotRead();
            return;
        }

        //  SAFETY NET:  read as UTF-8, but a  �  showed up?
        //  The first 4 MB looked fine, but a broken byte might be further in.  Check the WHOLE file for real.
        //    Broken?           Read it again with the older Excel rulebook.
        //    Really UTF-8?     Then the file truly has a  �  in it.  Carry on with this text.
        //  (Just seeing a  �  isn't enough to decide:  a UTF-8 file is ALLOWED to have one.)
        if (encoding === 'utf-8' && !checkedWhole && text.indexOf('\uFFFD') !== -1) {

            checkedWhole = true;
            setLoadingLabel('Checking the letters...');

            isUtf8(file, file.size, function (ok) {

                if (myLoad !== loadId) return;  //  a newer file?  Forget this one.

                if (ok) {
                    reader.onload(e);           //  really UTF-8.  Run this again  (the net is checked now, so it carries on).
                } else {
                    encoding = 'windows-1252';
                    reader.readAsText(file, encoding);
                }
            });
            return;
        }

        if (isSql) readAsSql(text);         //  a SQL dump:  sqlI.js turns one table into CSV text first
        else useText(text);                 //  the text is good.  Cut it up!
    };


    //  CUT UP THE TEXT  (a CSV file's text,  or an Excel file's sheet turned into CSV text).
    function useText(text) {

        let spot = 0;                       //  where we are in it


        //  Where the next  "  is in the file  (-1 = there are no more).
        //  We REMEMBER it, so each quote in the file only gets looked for once.
        //  (Looking from scratch every line would search to the END of a no-quotes file
        //   on every single line.  On a huge file, that freezes the page.)
        let nextQuote = text.indexOf('"');

        //  How many quotes from here up to "end"?  (And move nextQuote past them.)
        function quotesBefore(end) {
            let count = 0;
            while (nextQuote !== -1 && nextQuote < end) {
                count++;
                nextQuote = text.indexOf('"', nextQuote + 1);
            }
            return count;
        }


        //  Cut off the NEXT line, and move "spot" past it.
        //  (We don't cut the whole file into lines at once.  On a huge file,
        //   that alone freezes the page.  We cut one line at a time, in bites.)
        //
        //  Windows ends lines with  \r\n,  Mac and Linux with just  \n.  This handles both.
        //
        //  A line break INSIDE quotes is part of a cell, not the end of the row:
        //
        //      Ana,"123 Main St       <-  1 quote so far  =  ODD   =  still inside a cell.  Keep going.
        //      Apt 4"                 <-  2 quotes so far  =  EVEN  =  the row really ends here.
        //
        //  ("" is a real quote mark.  It's 2 quotes, so it never changes odd or even.)
        function nextLine() {

            let lineEnd = text.indexOf('\n', spot);         //  find the next line break...
            let quotes  = 0;                                //  how many  "  since this row started
            const firstEnd = lineEnd;                       //  the FIRST line break  (the end, if there were no quotes)

            while (lineEnd !== -1) {

                quotes += quotesBefore(lineEnd);            //  count the quotes before this line break

                if (quotes % 2 === 0) break;                //  EVEN?  Outside quotes.  This is the real end.

                lineEnd = text.indexOf('\n', lineEnd + 1);  //  ODD?  Inside a cell.  Try the next line break.

                //  No more line breaks?  Count the quotes in the last bit of the file too.
                if (lineEnd === -1) quotes += quotesBefore(text.length);

                //  Is it a STRAY quote  (like  5'10"  )?  Two ways to tell:
                //    -  it's still open WAY past the first line break  (no real cell is that long), or
                //    -  the file ENDS with it still open  (it never closed).
                //  Then give up:  end the row at the FIRST line break.
                //  (And count quotes again from there.  The ones we just counted belong to the next rows.)
                const tooFar      = lineEnd - firstEnd > QUOTE_LIMIT;
                const neverClosed = lineEnd === -1 && quotes % 2 === 1;

                if (tooFar || neverClosed) {
                    lineEnd = firstEnd;
                    nextQuote = text.indexOf('"', firstEnd + 1);
                    break;
                }
            }

            const found = lineEnd !== -1;
            if (!found) lineEnd = text.length;              //  ...none left?  The line goes to the end.

            let cut = lineEnd;
            if (found && text.charCodeAt(cut - 1) === 13) cut--;     //  13 = the  \r  from Windows.  Leave it off.

            const line = text.slice(spot, cut);
            spot = lineEnd + 1;
            return line;
        }


        //  Line 0  =  the header  (the column names).  It gets cut into cells.
        //  Everything after it  =  the data rows.  For those, we just write down where each one STARTS.
        //  (A file that ends with a line break doesn't get an extra empty row at the end.)
        const newHeader = splitIntoCells(spot < text.length ? nextLine() : '');
        let   starts    = new Uint32Array(1024);    //  where each row starts  (it grows as we go)
        let   count     = 0;                        //  how many rows so far

        //  While we go, remember the LONGEST thing in each column.
        //  (That's how wide each column needs to be.  Doing it now, while we're
        //   already looking at every row, saves a whole extra trip through the file.)
        const longest = newHeader.map(function (name) { return name.length; });

        setLoadingLabel('Cutting it into rows...');


        //  Go through the rows in BITES, so the page never freezes.
        function cutSomeRows() {

            if (myLoad !== loadId) return;  //  a newer file?  Stop.

            const stopAt = performance.now() + CHUNK_TIME;

            //  Go until this bite's time is up  (checking the clock every 500 rows).
            while (spot < text.length && performance.now() < stopAt) {

                for (let n = 0; n < 500 && spot < text.length; n++) {

                    //  The list is full?  Make a new one, twice as big, and copy the old one in.
                    if (count + 1 >= starts.length) {
                        const bigger = new Uint32Array(starts.length * 2);
                        bigger.set(starts);
                        starts = bigger;
                    }

                    starts[count++] = spot;             //  write down where this row starts...
                    measureCells(nextLine(), longest);  //  ...and how long its cells are
                }
            }

            //  Fill the pie:  20% (reading)  +  up to 75% more (cutting).
            setProgress(0.2 + 0.75 * Math.min(spot / Math.max(text.length, 1), 1));

            //  More to do?  Let the screen breathe, then take the next bite.
            if (spot < text.length) {
                nextBite(cutSomeRows);
                return;
            }


            //  ALL DONE.  Now swap in the new file.
            if (count + 1 > starts.length) {   //  (room for 1 more:  where the LAST row ends)
                const bigger = new Uint32Array(count + 1);
                bigger.set(starts);
                starts = bigger;
            }
            starts[count] = spot;               //  where the last row ends  (+1, just past its line break)

            const note = excel !== null
                ? (excel.hasDates ? '  ·  dates shown as YYYY-MM-DD  (originals kept)' : '') +
                  (excel.unsolved > 0 ? '  ·  ' + excel.unsolved + ' formula(s) had no saved answer  (shown as formulas)' : '') +
                  (excel.recalc ? '  ·  ⚠ this file asks Excel to recalculate:  formula answers may be out of date' : '')
                : sql !== null
                ? (sql.nullCount > 0 ? '  ·  ' + sql.nullCount.toLocaleString() + ' NULL' + (sql.nullCount === 1 ? '' : 's') + ' kept' : '')
                : encoding === 'windows-1252'
                ? '  ·  read as Windows-1252  (an older Excel format)'
                : '';

            const table = { header: newHeader, text: text, starts: starts, count: count, longest: longest,
                            excel: excel, sql: sql, note: note, name: file.name };

            //  Which look?  A NEW file:  Excel files look like Excel,  SQL dumps like a database table,  CSVs like a CSV.
            //  Another sheet tab  (or table)  of the same file  (sheet !== null):  keep the look you picked.
            const look = sheet === null ? excel !== null || sql !== null : excelLook;

            swapIn(table, look);
            fileTable = { table: table, file: file, sheet: sheet, others: new Map() };     //  what a query asks about  (see QUERY)
            queryFileChanged();
            finishLoading();                    //  the pie fills up, and the loader goes away
        }

        cutSomeRows();                          //  take the first bite
    }


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


    //  A SQL dump:  sqlI.js turns one of its tables into CSV text.  Then it's cut up like any CSV.
    function readAsSql(text) {

        setLoadingLabel('Reading the SQL...');

        readSql(text, file, function () { return myLoad === loadId; }, sheet).then(function (result) {

            if (myLoad !== loadId) return;
            sql = result.info;
            useText(result.text);

        }, function (problem) {

            if (myLoad !== loadId || problem === SQL_STALE) return;      //  a newer file?  Not a real problem.
            couldNotRead(sqlProblem(problem, file.name));
        });
    }
}


//  SWAP IN a table:  make it the one on screen.
//  (A file that just finished loading.   Or a query's answer.   Or back from the answer to the file.)
//
//  table  =  { header,   the column names
//              text,     the rows,  as one long string  ...
//              starts,   ...  and where each row starts in it
//              count,    how many rows
//              longest,  the longest thing in each column  (how wide they get)
//              excel,    the Excel notes  (or null)
//              sql,      the SQL notes    (or null)
//              note,     a few words for the "Rows 1–15" line  (or '')
//              name }    the file's name
//  look   =  show it in its OWN look?  (the spreadsheet look,  or the table look)
function swapIn(table, look) {

    headerCells = table.header;
    fileText    = table.text;               //  keep the whole file...
    rowStart    = table.starts;             //  ...and where each row starts in it
    rowCount    = table.count;
    rowCache    = new Map();                //  new rows  =  forget the old ones
    cacheCells  = 0;
    xlsxInfo    = table.excel;              //  the Excel notes  (null for a CSV)
    sqlInfo     = table.sql;                //  the SQL notes    (null if it's not a SQL dump)
    fileNote    = table.note;
    excelLook   = look;
    applyLook();                            //  the window,  the button,  and the badge  ("XLSX SPREADSHEET",  "SQL DUMP")
    readingName.textContent = table.name;
    readingFrom.hidden = false;             //  "Reading from...  sales.csv"
    dataColumns = table.longest.length;     //  the widest row decides how many columns there are
    searchText  = null;                     //  new rows  =  throw away the old search copy
    allRows     = null;                     //  ...and the old "every row" list
    doneQuery   = null;                     //  ...and the last search  (its rows were the OLD rows)
    doneMatches = null;
    picked      = null;                     //  ...and a cell you clicked  (it was in the OLD rows)
    hideTag();

    //  Clean slate.
    searchInput.value = '';
    searchInput.disabled = false;           //  turn the search bar ON
    jumpInput.value = '';

    //  A SQL dump  (or a query's answer):  the column TYPES count too,  so the table look can show them  (VARCHAR(255),  DECIMAL(10,2) ...).
    //  (They're in smaller letters:  about 0.8 of a normal letter each.   PK  =  about 4 more.)
    const longest = table.longest;
    if (table.sql !== null) {
        table.sql.columns.forEach(function (column, col) {
            const wide = Math.ceil(column.type.length * 0.8) + (column.pk ? 4 : 0);
            if (col < longest.length && wide > longest[col]) longest[col] = wide;
        });
    }

    setColumnWidths(longest);               //  decide how wide each column is
    drawHeader(true);                       //  draw line 0  (and measure how tall a row is)
    render();                               //  show the rows  (see STEP 5 below)
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
//    A SQL dump says so too:
//
//        SQL DUMP  ·  MySQL  ·  users  ·  2 of 5 tables
//
//    A CSV?  No badge.
//    (An Excel file or a SQL dump keeps its badge in BOTH looks,  so flipping never moves anything above the window.)
//
// ----------------------------------------------------------

const fileBadge = document.getElementById('fileBadge');
const sheetTabs = document.getElementById('sheetTabs');

function showBadge() {

    showSheetTabs();
    backBtn.hidden = !showingAnswer();
    fileBadge.title = '';

    //  A query's answer:   QUERY RESULT  ·  12 rows  ·  from sales  ·  8 ms
    //  (Query Flexibility fixed something?   ·  Query Flexibility fixed 2 things    hover  ->  what they were)
    if (showingAnswer()) {
        const r = sqlInfo.result;
        fileBadge.textContent = 'QUERY RESULT  ·  ' + r.rows.toLocaleString() + ' row' + (r.rows === 1 ? '' : 's') +
            (r.from ? '  ·  from ' + r.from : '') + '  ·  ' + formatTime(r.ms) +
            (r.fixes.length > 0 ? '  ·  Query Flexibility fixed ' + r.fixes.length + (r.fixes.length === 1 ? ' thing' : ' things') : '');
        fileBadge.title = r.fixes.join('   ·   ');
        fileBadge.hidden = false;
        return;
    }

    if (sqlInfo !== null) {
        fileBadge.textContent = 'SQL DUMP' + (sqlInfo.dialect ? '  ·  ' + sqlInfo.dialect : '') + '  ·  ' + sqlInfo.sheetName +
            (sqlInfo.sheetCount > 1 ? '  ·  ' + sqlInfo.sheetNumber + ' of ' + sqlInfo.sheetCount + ' tables' : '');
        fileBadge.hidden = false;
        return;
    }

    if (xlsxInfo === null) {
        fileBadge.hidden = true;
        return;
    }

    fileBadge.textContent = 'XLSX SPREADSHEET  ·  ' + xlsxInfo.sheetName +
        (xlsxInfo.sheetCount > 1 ? '  ·  ' + xlsxInfo.sheetNumber + ' of ' + xlsxInfo.sheetCount + ' sheets' : '') +
        (xlsxInfo.date1904 ? '  ·  1904 dates' : '');
    fileBadge.hidden = false;
}



// ----------------------------------------------------------
//
//    THE SHEET TABS   (an Excel file with more than one sheet)
//
//    Like the tabs at the bottom of Excel.  One button per sheet, joined into one bar:
//
//        ┌──────────┬──────────┬──────────────────┬──────────┐
//        │▓Q1 Sales │▒ Q2 Sales│▒ Archive (hidden)│░ Chart1  │
//        └──────────┴──────────┴──────────────────┴──────────┘
//           ▓ = the one you're on  (dark, like the badge)
//           ▒ = click to open it
//           ░ = a chart sheet:  no rows to show  (faded, can't click)
//
//    Click one  ->  the SAME file loads again, showing that sheet.
//    (It goes through loadFile like any file, so the loader, search, everything just works.)
//
//    A SQL dump's TABLES are tabs too  (the same bar):   [▓users] [▒orders] [▒logs  (empty)]
//
// ----------------------------------------------------------

function showSheetTabs() {

    sheetTabs.textContent = '';                                 //  wipe the old tabs

    const book = xlsxInfo !== null ? xlsxInfo : sqlInfo;        //  an Excel file's sheets,  or a SQL dump's tables

    if (book === null || book.sheets.length < 2) {              //  a CSV, or just 1 sheet?  No tabs.
        sheetTabs.hidden = true;
        return;
    }

    book.sheets.forEach(function (sheet, i) {

        const tab     = document.createElement('button');
        const current = i + 1 === book.sheetNumber;

        tab.className = 'sheet-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', current);
        tab.textContent = sheet.name + (sheet.hidden ? '  (hidden)' : '') + (sheet.chart ? '  (chart)' : '') + (sheet.empty ? '  (empty)' : '');

        if (sheet.hidden) tab.classList.add('hidden-sheet');

        if (sheet.chart) {
            tab.disabled = true;
            tab.title = 'A chart sheet:  it has no rows to show.';
        } else if (!current) {
            const file = book.file;                             //  (the file, as it is right now)
            tab.title = 'Open the ' + (book === sqlInfo ? 'table' : 'sheet') + ' "' + sheet.name + '"';
            tab.addEventListener('click', function () {
                loadFile(file, i);
            });
        }

        sheetTabs.appendChild(tab);
    });

    sheetTabs.hidden = false;
}



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
                current += letter;          //  anything else (even a comma, even a line break!) is part of the cell
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
//    HOW LONG IS EACH CELL?   (without cutting the line up)
//
//    For the column widths, we only need each cell's LENGTH.
//    No quotes?  Then the cells are just the bits between the commas,
//    so count the letters between commas.  No new strings at all.  (Fast + light.)
//
//        Ana,22,Chicago    ->    3, 2, 7
//
//    Quotes?  Then really cut it up  (the quotes don't count as letters).
//
//    "longest" is the list of the longest so far, per column.  This makes it longer where needed.
//
// ----------------------------------------------------------

function measureCells(line, longest) {

    if (line.indexOf('"') === -1) {

        //  Walk the letters one by one:  a comma  (letter code 44)  or the end of the line  =  a cell ends.
        //  (Measured on a 125 MB file:  ~15% faster than asking indexOf for every comma.  Same answers.)
        let col  = 0;
        let from = 0;                       //  where this cell starts
        const end = line.length;

        for (let i = 0; i <= end; i++) {
            if (i === end || line.charCodeAt(i) === 44) {
                const size = i - from;
                if (col >= longest.length) longest.push(size);      //  a column we haven't seen yet
                else if (size > longest[col]) longest[col] = size;
                from = i + 1;
                col++;
            }
        }
        return;
    }

    const cells = splitIntoCells(line);

    for (let col = 0; col < cells.length; col++) {
        if (longest[col] === undefined || cells[col].length > longest[col]) {
            longest[col] = cells[col].length;
        }
    }
}



// ----------------------------------------------------------
//
//    GET ONE ROW BACK OUT OF THE FILE
//
//    rowText(5)   ->  "Fy,Miami,FL"            (the row, as it is in the file)
//    getCells(5)  ->  ["Fy", "Miami", "FL"]    (cut into cells:  just the columns being built right now)
//
//    Row 5 starts at rowStart[5].  It ends just before the line break,
//    and the next row starts just AFTER that line break  (rowStart[6]).
//
// ----------------------------------------------------------

function rowText(i) {

    const start = rowStart[i];
    let end = rowStart[i + 1] - 1;          //  the line break that ends this row

    //  A Windows  \r  just before that line break?  Leave it off.
    //  (The very last row might have no line break at all.  Then there's nothing to leave off.)
    if (end < fileText.length && end > start && fileText.charCodeAt(end - 1) === 13) end--;

    return fileText.slice(start, end);
}


//  Only the columns being BUILT right now get cut out  (builtColStart up to builtColEnd:  the sideways treadmill).
//  A row with a MILLION columns still only makes about 30 little strings.
//
//      row:      Ana,22,Chicago,IL,60601
//      commas:      3  6       14 17          <-  found once, then remembered  (4 bytes each)
//      column 2  =  from just after comma 1  (7)  to comma 2  (14)  =  "Chicago"
//
//  The result only has the built columns in it.  (The rest are empty, and nobody looks at them.)
function getCells(i) {

    const info = rowInfo(i);

    if (info.cells) return info.cells;      //  a row with quotes:  already cut up, all of it

    const cells = [];
    const stop  = Math.min(builtColEnd, info.count);

    for (let col = builtColStart; col < stop; col++) {
        const from = col === 0 ? 0 : info.commas[col - 1] + 1;                 //  just after the comma before it
        const to   = col < info.count - 1 ? info.commas[col] : info.line.length;  //  up to the comma after it
        cells[col] = info.line.slice(from, to);
    }

    return cells;
}


//  ONE cell of one row,  any column  (built or not).   For the snap menu's scope.
function cellAt(i, col) {

    const info = rowInfo(i);

    if (info.cells) return info.cells[col] || '';      //  a row with quotes:  already cut up
    if (col >= info.count) return '';                  //  this row is shorter than that

    const from = col === 0 ? 0 : info.commas[col - 1] + 1;
    const to   = col < info.count - 1 ? info.commas[col] : info.line.length;
    return info.line.slice(from, to);
}


//  Look at a row once, and remember what we need to cut it up fast.
//    No quotes?  Remember where every comma is.
//    Quotes?     Cut it all up for real  (commas inside quotes don't count, so we can't just use the commas).
function rowInfo(i) {

    let info = rowCache.get(i);
    if (info !== undefined) return info;

    const line = rowText(i);

    if (line.indexOf('"') === -1) {

        let commas = new Uint32Array(16);
        let n = 0;
        let at = line.indexOf(',');

        while (at !== -1) {
            if (n === commas.length) {                      //  full?  Twice as big.
                const bigger = new Uint32Array(n * 2);
                bigger.set(commas);
                commas = bigger;
            }
            commas[n++] = at;
            at = line.indexOf(',', at + 1);
        }

        info = { line: line, commas: commas, count: n + 1 };   //  3 commas  =  4 cells

    } else {
        const cells = splitIntoCells(line);
        info = { cells: cells, count: cells.length };
    }

    //  Keep the last rows we looked at  (so scrolling back and forth, or sideways, is free).
    //  But not TOO many:  1,000 rows,  or 20 million cells  (very wide rows),  whichever comes first.
    //  Too many?  Start over.  (Simple.  The rows on screen get looked at again right away.)
    if (rowCache.size >= 1000 || cacheCells + info.count > 20000000) {
        rowCache.clear();
        cacheCells = 0;
    }
    rowCache.set(i, info);
    cacheCells += info.count;

    return info;
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
    const room  = spreadsheetLook() ? EXCEL_WINDOW - NUM_WIDTH - 2 - 18 - dataWidth : 0;
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
    boxChanged();                                       //  a new layout:  the window's size may change
}


//  How wide is one letter, in pixels?  Write 100 zeros in the sheet's letters, measure, divide by 100.
//  (It's measured off to the side, invisible, so you never see it.)
function measureLetterWidth() {

    const probe = document.createElement('span');
    probe.style.cssText = 'position: absolute; visibility: hidden; white-space: pre; font: ' + getComputedStyle(outputBox).font;
    probe.textContent = '0'.repeat(100);

    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width / 100;
    probe.remove();

    return width || 8;                                  //  (couldn't measure?  8 pixels is a good guess)
}



// ----------------------------------------------------------
//
//    THE SIDEWAYS TREADMILL   (only build the columns you can SEE)
//
//    Same idea as the rows:  a file with a million columns only ever
//    builds the 30 or so you can see, plus a few extra on each side.
//    Two invisible spacers fill in for everything else:
//
//      [#] [left spacer] [C501] [C502] ... [C530] [right spacer]
//           as wide as    only these get BUILT     as wide as
//           columns 1-500                          all the rest
//
//    Scroll sideways  ->  columns that leave get thrown away,
//                         columns that come in get built.
//
//    SUPER-wide sheets:  browsers can't make anything wider than about
//    33 million pixels.  A million columns would be ~80 million.
//    So past MAX_SCROLL_WIDTH, the scrollbar is "scaled":
//    one pixel of scrollbar  =  several pixels of sheet.
//
// ----------------------------------------------------------

//  Where in the SHEET are we looking, for this much scrolling?
//  Normal sheet:  the same number.  Scaled sheet:  further along.
function sheetSpot(scrolled, viewWidth) {

    if (scrollWidth === sheetWidth) return scrolled;    //  not scaled?  1 pixel  =  1 pixel.

    //  The first 400 pixels stay 1-to-1  (so the start of the sheet lines up perfectly),
    //  then everything after is stretched, so the END of the scrollbar  =  the END of the sheet.
    const easy = 400;
    const scrollEnd = scrollWidth - viewWidth;
    const sheetEnd  = sheetWidth - viewWidth;

    if (scrolled <= easy || scrollEnd <= easy) return scrolled;

    return easy + (scrolled - easy) * (sheetEnd - easy) / (scrollEnd - easy);
}


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


//  Which column is at this spot in the sheet?
//  "Guess the number" again  (just like Go to row):  look in the middle, throw away the wrong half.
function columnAt(spot) {

    let low  = 0;
    let high = columnCount;

    while (low < high) {
        const middle = Math.floor((low + high) / 2);

        if (columnStarts[middle + 1] <= spot) {
            low = middle + 1;               //  that column ends before the spot  ->  look to the right
        } else {
            high = middle;                  //  that column reaches the spot  ->  it's this one, or to the left
        }
    }

    return low;
}


// ----------------------------------------------------------
//
//    THE WINDOW'S SIZE,  REMEMBERED
//
//    Reading a size  (or where the scrollbar is)  RIGHT AFTER changing the page makes the browser
//    stop and measure the whole sheet,  right then,  in the middle of scrolling.
//    Do that 3 times in one scroll  ->  3 full measurings instead of 1.
//    (Measured:  that was 6.6 of the 7.1 ms a sideways scroll cost.)
//
//    So the window's size is measured ONCE,  and remembered.  It only changes when:
//    a new file or search,  a flip,  Expand,  the screen gets resized,  or sizeWindow runs.
//    Those call boxChanged(),  and the next one who asks measures it fresh.
//
// ----------------------------------------------------------

let boxWidth    = 0;        //  the window's inside width   (without its scrollbar)
let boxHeight   = 0;        //  ...and inside height
let headHeight  = 0;        //  the header's height  (1 row,  or 2 in the spreadsheet look)
let boxKnown    = false;    //  are those up to date?

function boxChanged() {
    boxKnown = false;
}

function knowBox() {
    if (boxKnown) return;
    boxWidth    = outputBox.clientWidth;
    boxHeight   = outputBox.clientHeight;
    headHeight  = headerBox.offsetHeight;
    boxKnown    = true;
}


//  Figure out which columns should be built, and hand the clothes the column list.
//  "force" = rebuild even if nothing moved  (for a new file, or a new search).
function updateColumns(force) {

    if (columnStarts === null || columnCount === 0) return;


    //  1.  Where are we looking?   (Read BEFORE changing anything:  see "THE WINDOW'S SIZE, REMEMBERED".)
    knowBox();
    const viewWidth = Math.max(boxWidth - NUM_WIDTH, 0);                //  how much sheet fits beside the row numbers
    const scrolled  = outputBox.scrollLeft;
    const spot      = sheetSpot(scrolled, viewWidth);

    const first = Math.min(columnAt(spot), columnCount - 1);            //  the first column you can see
    const last  = Math.min(columnAt(spot + viewWidth) + 1, columnCount); //  one past the last column you can see


    //  How wide the left spacer has to be, if we start building at column "from".
    //  (Put column "from" exactly where it needs to be, so the column at "spot" lands at the left edge.)
    function leftSpace(from) {
        return scrolled - (spot - columnStarts[from]);
    }

    function fits(from, to) {
        const space = leftSpace(from);
        return space >= 0 && space + (columnStarts[to] - columnStarts[from]) <= scrollWidth + 0.5;
    }


    //  2.  Do the columns we already built still cover what you can see?
    let from = builtColStart;
    let to   = builtColEnd;

    if (force || from > first || to < last || !fits(from, to)) {

        //  No.  Pick new ones:  the ones you can see, plus extras on each side.
        from = Math.max(0, first - EXTRA_COLUMNS);
        to   = Math.min(columnCount, last + EXTRA_COLUMNS);

        //  (Scaled sheet near the start, or near the end?  Drop extras that wouldn't fit.)
        while (from < first && leftSpace(from) < 0) from++;
        while (to > last && !fits(from, to)) to--;
    }

    const changed = from !== builtColStart || to !== builtColEnd;
    builtColStart = from;
    builtColEnd   = to;


    //  3.  Hand the clothes the column list:
    //      row numbers,  left spacer,  the built columns,  right spacer.
    const left  = Math.max(0, leftSpace(from));
    const right = Math.max(0, scrollWidth - left - (columnStarts[to] - columnStarts[from]));

    const widths = [];
    for (let col = from; col < to; col++) widths.push(columnWidths[col] + 'px');

    const columns = NUM_WIDTH + 'px ' + left + 'px ' + widths.join(' ') + ' ' + right + 'px';

    const fresh = lastColumns === '';                   //  the first column list for this layout?

    if (columns !== lastColumns) {
        outputBox.style.setProperty('--columns', columns);
        lastColumns = columns;
    }

    //  A NEW layout  (a new file,  a search,  a flip)  can change how wide the WINDOW is  (it fits the sheet,  up to its max-width).
    //  Then measure it again,  and if the width changed,  pick the columns once more,  for the new width.
    //  Plain scrolling never changes the window's width  (the columns + the 2 spacers always add up to the same total),
    //  so then there's nothing to measure:  no stopping the browser in the middle of scrolling.
    if ((force || fresh) && !updateColumns.again) {
        boxChanged();
        knowBox();
        if (Math.abs(boxWidth - NUM_WIDTH - viewWidth) > 1) {
            updateColumns.again = true;
            updateColumns(force);
            updateColumns.again = false;
            return;
        }
    }


    //  4.  New columns?  Rebuild the header and the rows that are showing  (only ~45 rows, so it's quick).
    if (changed || force) {

        drawHeader();

        if (builtEnd > builtStart) {
            while (topSpacer.nextSibling !== bottomSpacer) topSpacer.nextSibling.remove();
            bottomSpacer.before(buildRows(builtStart, builtEnd));
        }
    }
}



// ----------------------------------------------------------
//
//    DRAW THE HEADER  (line 0)
//
//    Same as a normal row, but with a special label
//    so the clothes make it bold and stick it to the top.
//
// ----------------------------------------------------------

function drawHeader(measure) {

    headerBox.textContent = '';                         //  wipe the old one

    const row = makeRow(0, headerCells, '', 0);         //  line number 0, the column names, no search
    row.classList.add('header-row');

    headerBox.appendChild(row);

    //  The spreadsheet look:  a row of column LETTERS on top  (A, B, C ... Z, AA ...),  like Excel's.
    //  Copy the names row  (so every box is exactly the same size),  then swap in the letters.
    if (spreadsheetLook()) {
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

    //  The table look  (a SQL dump):  a row of column TYPES under the names  (INT,  VARCHAR(255) ...),
    //  and a  PK  badge on the primary key.   (Copied from the names row too,  so the boxes line up.)
    if (tableLook()) {
        const types = row.cloneNode(true);
        types.classList.add('types-row');
        delete types.dataset.index;
        types.firstChild.textContent = '';
        for (let col = builtColStart; col < builtColEnd; col++) {
            const cell   = types.children[2 + col - builtColStart];
            const column = sqlInfo.columns[col];
            cell.className = 'cell';
            cell.removeAttribute('title');
            cell.textContent = column === undefined ? '' : column.type;
            if (column !== undefined && column.pk) cell.classList.add('pk');
            if (cell.textContent.length > 14) cell.title = cell.textContent;     //  a long type?  hover to read it all
        }
        headerBox.appendChild(types);
    }

    //  The header is the same height as every row.
    //  Measure it  (only for a NEW file:  "measure" = true),  so the brain knows exactly how tall one row is.
    //  (Measuring makes the browser lay out the whole sheet RIGHT NOW.  Doing that every time you
    //   scroll sideways was most of the cost of scrolling sideways.  The height never changes, so once is enough.)
    if (measure) rowHeight = row.offsetHeight || 30;
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

    if (rowCount <= BIG_FILE) {
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

    const target = parseInt(jumpInput.value, 10) - rowShift();     //  the number you typed  (the spreadsheet look:  Excel's number,  1 higher)

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
        window.scrollTo(0, rowsTopOnPage + pageSpotFor(index * rowHeight - window.innerHeight / 2));
        buildVisibleRows();

    } else {

        //  Window is small?  Scroll the WINDOW so the row sits right under the header.
        //  (Build the rows there FIRST, so the window has something to land on.)
        const top = index * rowHeight;
        buildVisibleRows(top);
        setViewY(top);
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
//    THE SNAP MENU   ("the aimbot")
//
//    Search for something  ->  the window next to "Choose File" LOCKS ON to the first match:
//    which match it is,  where it is,  and a "scope" of the 9 cells around it.
//
//    ▶  (or Enter in the search bar)   ->  SNAP:  the sheet scrolls so that cell is in the middle
//                                          (down AND sideways),  and the cell pulses.
//                                          The first press snaps to the match you SEE.  Then:  the next one.
//    ◀  (or Shift + Enter)             ->  the one before.
//    Click the scope                   ->  snap to the match you see.
//
//    A row can have the word in more than one cell.  ▶ visits each one  ("hit 2 of 3"),  then the next row.
//    At the end?  It wraps around to the start.
//
// ----------------------------------------------------------

let aimAt   = -1;       //  which match the window is locked onto  (its spot in "matches").   -1  =  no target
let aimHits = [];       //  the columns in that row that have the word.   Like:  [2, 7]
let aimHit  = 0;        //  which one of those
let aimed   = false;    //  has the sheet snapped to it yet?  (Then the first press snaps to THIS one, not the next.)
let picked  = null;     //  a cell you CLICKED:  { row, col }.   The Details show it  (until the snap menu moves,  or they close).


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
    picked  = null;                 //  (the snap menu moved:  the Details follow it again)
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
    if (picked !== null) { picked = null; if (!aimRow.hidden) drawRow(); }     //  (the Details follow the snap again)
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
    knowBox();                                              //  (the remembered size:  no stopping the browser to measure)
    const viewWidth = Math.max(boxWidth - NUM_WIDTH, 0);
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
        if (picked === null) showRow(false);                //  no match  =  no row to show   (unless it's a cell you clicked)
        else if (!aimRow.hidden) drawRow();



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
        (spreadsheetLook() ? '  (' + columnName(col) + (row + 2) + ')' : '');

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
//  CLICK A CELL  (see "CLICK A CELL" below)  ->  the Details for THAT cell,  search or no search.
//
//  A row with THOUSANDS of columns?  Only the 200 around the target are listed  (so it stays quick),
//  with a note saying which ones.   A giant cell?  The card shows its first 20,000 letters.
const ROW_LIMIT     = 200;
const FOCUS_LETTERS = 20000;

function showRow(open) {
    if (open && detailsTarget() === null) return;       //  (nothing to show)
    if (open) closeQueryMenu();                         //  (the query menu lives in the same spot)
    else picked = null;                                 //  (closed:  a clicked cell is forgotten)
    aimRow.hidden = !open;
    aimRowBtn.setAttribute('aria-expanded', open);
    if (open) drawRow();
}

//  Which cell the Details are about:  one you CLICKED,  or the snap menu's target.   (null  =  neither)
function detailsTarget() {
    if (picked !== null) return picked;
    return aimAt === -1 ? null : { row: matches[aimAt], col: aimHits[aimHit] };
}


function drawRow() {

    const spot = detailsTarget();
    if (spot === null) return;

    const row   = spot.row;
    const col   = spot.col;
    const count = Math.max(headerCells.length, rowInfo(row).count);

    //  Which columns:  all of them,  or the ROW_LIMIT around the target.
    const from = Math.max(0, Math.min(col - ROW_LIMIT / 2, count - ROW_LIMIT));
    const to   = Math.min(count, from + ROW_LIMIT);

    aimRowTitle.textContent = 'Row ' + (row + 1 + rowShift()) + '  ·  ' + count + ' column' + (count === 1 ? '' : 's');

    //  1.  The FOCUS card:   the column's name  ("NOTES")   and the full text,  your word in yellow.
    const full = cellAt(row, col);

    aimFocusName.textContent = (headerCells[col] || 'column ' + (col + 1)) +
        (spreadsheetLook() ? '  ·  ' + columnName(col) + (row + 2) : tableLook() ? sqlType(col) : '');

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
        name.textContent = (headerCells[c] || 'column ' + (c + 1)) + (spreadsheetLook() ? '  ·  ' + columnName(c) : tableLook() ? sqlType(c) : '');
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

        if (sqlInfo !== null && sqlIsNull(sqlInfo, row + 1, c)) value.classList.add('null');   //  a SQL NULL:  the clothes show a faint NULL

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



// ----------------------------------------------------------
//
//    CLICK A CELL   ->   ITS DETAILS
//
//    Rest the mouse on a cell  ->  after a moment,  a little black  "expand?"  tag shows up on its corner.
//    Click the cell  ->  the Details panel opens for it:  the cell big  (the focus card),  and its whole row,
//    up and down  ("VIEWING ROW VERTICALLY").   No search needed.
//
//        ┌──────────────┬────────────[expand?]──┐
//        │ Ana          │ 123 Main St, Apt 4... │      <-  the mouse rests here
//        └──────────────┴───────────────────────┘
//
//    Not a click:  dragging to select words,  or drag mode  (that's for moving the sheet).
//    A phone?  No resting mouse:  just tap the cell.
//
// ----------------------------------------------------------

const cellTag  = document.getElementById('cellTag');
const TAG_WAIT = 600;           //  how long the mouse rests on a cell before "expand?" shows up  (ms)

let tagCell  = null;            //  the cell the mouse is resting on
let tagTimer = null;
let pressX   = 0;               //  where the last press started  (a click that MOVED is a drag,  not a click)
let pressY   = 0;


//  Where is this cell?   ->   { row  (in the file),  col }    (null:  not a real cell,  like the spreadsheet look's empty columns)
//  (A row on screen is:  [number] [left spacer] [the built cells ...] [right spacer].   Its name tag is its spot in "matches".)
function cellSpot(cell) {
    const line = cell.parentElement;
    if (line === null || line.dataset.index === undefined) return null;
    const col = builtColStart + Array.prototype.indexOf.call(line.children, cell) - 2;
    const at  = Number(line.dataset.index);
    if (col < 0 || col >= dataColumns || at >= matches.length) return null;
    return { row: matches[at], col: col };
}

function hideTag() {
    if (tagCell === null && cellTag.hidden) return;         //  (already hidden:  this runs on every scroll,  so do nothing)
    clearTimeout(tagTimer);
    tagCell = null;
    cellTag.classList.remove('on');
    cellTag.hidden = true;
}

//  The mouse has rested long enough:  show the tag,  on the cell's top-right corner  (inside the window's edge).
function showTag() {
    if (tagCell === null || !tagCell.isConnected || dragging || !loader.hidden) return;
    const cell = tagCell.getBoundingClientRect();
    const box  = outputBox.getBoundingClientRect();
    const right = Math.min(cell.right, box.left + outputBox.clientLeft + outputBox.clientWidth);
    if (right - 40 < Math.max(cell.left, box.left)) return;                 //  (hardly any of it is on screen)
    cellTag.style.left = right + 'px';
    cellTag.style.top  = Math.max(cell.top, box.top) + 'px';
    cellTag.hidden = false;
    void cellTag.offsetWidth;                               //  (make the browser notice it first,  so it fades in)
    cellTag.classList.add('on');
}

//  Open the Details for a cell.   (It pulses,  like a snapped-to target,  so you see which one.)
function pickCell(spot, cell) {
    picked = spot;
    showRow(true);
    cell.classList.remove('locked');
    void cell.offsetWidth;
    cell.classList.add('locked');
    cell.addEventListener('animationend', function () { cell.classList.remove('locked'); }, { once: true });
}

rowsBox.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    const cell = e.target.closest('.cell');
    if (cell === tagCell) return;
    hideTag();
    if (cell === null || cellSpot(cell) === null) return;
    tagCell = cell;
    tagTimer = setTimeout(showTag, TAG_WAIT);
});

rowsBox.addEventListener('pointerleave', hideTag);
rowsBox.addEventListener('pointerdown', function (e) {
    hideTag();
    pressX = e.clientX;
    pressY = e.clientY;
});
outputBox.addEventListener('scroll', hideTag, { passive: true });
outputBox.addEventListener('wheel', hideTag, { passive: true });
window.addEventListener('scroll', hideTag, { passive: true });         //  (Expand mode:  the page scrolls)

rowsBox.addEventListener('click', function (e) {
    const cell = e.target.closest('.cell');
    if (cell === null) return;
    if (Math.abs(e.clientX - pressX) > 5 || Math.abs(e.clientY - pressY) > 5) return;     //  it moved:  selecting words
    if (String(window.getSelection()).length > 0) return;                                   //  words are selected:  leave them
    const spot = cellSpot(cell);
    if (spot === null) return;
    hideTag();
    pickCell(spot, cell);
});

//  Enter in the search bar  =  ▶.     Shift + Enter  =  ◀.
searchInput.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    aimStep(e.shiftKey ? -1 : 1);
});

drawAim();                          //  start out "Ready"



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
    updateColumns();
    buildVisibleRows();
    updatePosition();
});



// ----------------------------------------------------------
//
//    SPREADSHEET VIEW   <->   CSV VIEW
//
//    The same file,  two ways to look at it:
//
//      CSV look           the glass sheet.   Row 0 = the column names.
//      Spreadsheet look   EXCEL's way:  a row of column LETTERS on top  (A, B, C ...),
//                         Excel's row numbers  (the column names are row 1),
//                         Excel addresses in the snap menu  (like K43),
//                         the green  ƒ  on formulas,  and a WIDER window.
//
//    A SQL dump's own look is the TABLE look instead,  like a database tool:
//
//      Table look         a row of column TYPES under the names  (INT,  VARCHAR(255) ...),
//                         a  PK  badge on the primary key,  NULLs shown as a faint  NULL,
//                         the types in the snap menu's Details,  in SQL blue.
//
//    A CSV opens in the CSV look.   An Excel file opens in the spreadsheet look.   A SQL dump in the table look.
//    The button FLIPS between them,  like turning a card over:
//
//         ▯   ->   ▏   ->   ▭      the window turns away until it's edge-on  (you can't see it),
//                                   changes into the other look  (and width)  right then,
//                                   and turns back.
//
//    Nothing is read again:  the file,  the Excel notes,  your search,  where you are:  all kept.
//    Another sheet tab keeps the look you picked  (so you can look at every sheet "as a CSV" too).
//
// ----------------------------------------------------------

let flipping = false;       //  mid-flip?  (Then a second click waits.)


//  Which of the 2 special looks is on?   (excelLook  =  "the file's own look is on".)
function spreadsheetLook() { return excelLook && sqlInfo === null; }      //  a CSV or an Excel file,  in its own look
function tableLook()       { return excelLook && sqlInfo !== null; }      //  a SQL dump,  in its own look


//  Dress the page for the look we're in:  the window,  the button,  the badge.
function applyLook() {
    outputBox.classList.toggle('excel', spreadsheetLook());
    outputBox.classList.toggle('sqltable', tableLook());
    aimRow.classList.toggle('sqltable', tableLook());                       //  (the Details panel shows NULLs the same way)
    viewBtn.textContent = excelLook ? 'CSV View' : sqlInfo !== null ? 'Table View' : 'Spreadsheet View';
    viewBtn.classList.toggle('to-csv', excelLook);                          //  the clothes:  Excel green / SQL blue  ->  or  ->  black
    viewBtn.classList.toggle('to-table', !excelLook && sqlInfo !== null);
    showBadge();
}


//  Excel's row numbers start 1 higher  (its row 1 is the column names).   "How much to add?"
function rowShift() {
    return spreadsheetLook() ? 1 : 0;
}


//  A SQL column's type,  for the snap menu's Details:    "  ·  VARCHAR(255)  ·  PK"
function sqlType(col) {
    const column = sqlInfo.columns[col];
    if (column === undefined) return '';
    return (column.type ? '  ·  ' + column.type : '') + (column.pk ? '  ·  PK' : '');
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
    //  ("animationend" also hears the cells' own animations,  like the snap pulse:  only listen to the WINDOW's FLIP.)
    flipping = true;
    outputBox.classList.add('flip-away');

    outputBox.addEventListener('animationend', function turned(e) {
        if (e.target !== outputBox || e.animationName !== 'flip-away') return;
        outputBox.removeEventListener('animationend', turned);

        switchLook();
        outputBox.classList.replace('flip-away', 'flip-back');      //  (right away:  parking the card at exactly 90° made
                                                                    //   the browser draw a whole big sheet at once:  ~100 ms.  Measured.)

        outputBox.addEventListener('animationend', function back(e) {
            if (e.target !== outputBox || e.animationName !== 'flip-back') return;
            outputBox.removeEventListener('animationend', back);
            outputBox.classList.remove('flip-back');
            flipping = false;
        });
    });
});



// ----------------------------------------------------------
//
//    MAKE THE WINDOW EXACTLY  HEADER + 15 ROWS  TALL
//    (or shorter, if there are fewer than 15 rows to show)
//
//    Problem:  lots of columns add a sideways scrollbar,
//              and that scrollbar steals some space.
//
//    Fix:      measure how tall the scrollbar is,
//              and give that space back.
//
//    Only 10 rows?  The window is only 10 rows tall.
//    No empty glass at the bottom, and the sideways scrollbar
//    sits right under the last row, where you can reach it.
//
// ----------------------------------------------------------

function sizeWindow() {

    boxChanged();                                       //  the window's size is about to change:  measure it fresh next time
    outputBox.style.height = '';                        //  start fresh

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;


    const style     = getComputedStyle(outputBox);
    const borders   = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const scrollbar = outputBox.offsetHeight - outputBox.clientHeight - borders;    //  how tall the scrollbar is

    //  15 rows  (or fewer, if that's all there is)
    const rowsToShow = Math.min(WINDOW_SIZE, matches.length);

    //  the header  +  the rows  +  the scrollbar
    outputBox.style.height = (headerBox.offsetHeight + rowsToShow * rowHeight + scrollbar) + 'px';
    boxChanged();
}



// ----------------------------------------------------------
//
//    THE "ROWS 21–35 OF 100" WORDS
//
//    Figure out which rows you can see right now.
//
// ----------------------------------------------------------

//  "y" is optional:  where you're looking,  already read  (the scroll listener hands it over).
function updatePosition(y) {

    if (headerCells.length === 0) return;               //  no file yet?  Stop.

    const word = searchInput.value.trim();

    if (matches.length === 0) {
        statusText.textContent = (word === ''
            ? (showingAnswer() ? 'The answer has no rows:  nothing matched' : 'This file only has a header row')
            : 'No rows match "' + word + '"') + fileNote;
        return;
    }


    //  Every row is the same height.
    //  So:   how far we scrolled  ÷  one row's height  =  which row is at the top.
    const first = Math.min(Math.round((y === undefined ? readViewY() : y) / rowHeight), matches.length - 1);

    const last = outputBox.classList.contains('expanded')
        ? matches.length - 1                                    //  expanded?  You can see them all.
        : Math.min(first + WINDOW_SIZE, matches.length) - 1;    //  small?     The top row + 14 more.


    //  matches holds row numbers  (0, 1, 2...).  Row numbers start at 1  (the header is 0).  So:  +1.
    //  (The spreadsheet look:  Excel's numbers,  1 more:  rowShift.)
    const shift = 1 + rowShift();
    let message = 'Rows ' + (matches[first] + shift) + '–' + (matches[last] + shift);

    if (word === '') {
        message += ' of ' + (rowCount + rowShift());
    } else {
        message += ' (' + matches.length + ' matching row(s) for "' + word + '")';
    }

    statusText.textContent = message + fileNote;
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

    //  READ first,  CHANGE after.   Where is everything?  Ask now,  while the page is still measured.
    //  (Asking AFTER changing the page makes the browser stop and measure it all again:
    //   see "THE WINDOW'S SIZE, REMEMBERED".)
    knowBox();
    const scrolledTop = outputBox.scrollTop;
    const y           = readViewY();

    updateColumns();                        //  scrolled sideways?  swap columns in and out
    buildVisibleRows(y, scrolledTop);       //  scrolled up or down?  swap rows in and out
    updatePosition(y);

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

    const bottom = lowestViewY();
    const now    = readViewY();             //  where you're looking right now

    //  Already at the very top or bottom?  Let the PAGE scroll instead.
    if ((pixels < 0 && now <= 0) || (pixels > 0 && now >= bottom)) return;

    e.preventDefault();                     //  "browser, don't scroll.  I've got this."


    //  No finish line yet?  Start from the row we're on now.
    if (wheelTarget === null) {
        wheelTarget = Math.round(now / rowHeight) * rowHeight;
        glideSpot = now;
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
//    The screen redraws 60 times a second  (or 120, or 144, on a fast screen).
//    Every 60th of a second, the window moves 25% of the way to the finish line.
//
//       far away   ->  big steps    (fast)
//       almost there  ->  tiny steps  (gentle landing)
//
//    A fast screen redraws more often,  so each of ITS steps is smaller:
//    at 120 Hz,  2 steps of about 13%  =  the same as 1 step of 25%.
//    Same glide,  just smoother.
//
//    "requestAnimationFrame" = "run this again right before the next redraw."
//    It hands us the time  (t,  in milliseconds).
//
// ----------------------------------------------------------

function glideStep(t) {

    //  The finish line got cleared?  Stop.
    if (wheelTarget === null) {
        gliding = false;
        glideLast = 0;
        return;
    }

    //  Someone else moved the window  (like dragging the scrollbar)?  Let them.  Stop gliding.
    if (Math.abs(outputBox.scrollTop - scrollbarSpotFor(glideSpot)) > 2) {
        gliding = false;
        glideLast = 0;
        wheelTarget = null;
        wheelLeft = 0;
        return;
    }


    const gap = wheelTarget - glideSpot;          //  how far to the finish line

    //  Basically there?  Land EXACTLY on the row, and stop.
    if (Math.abs(gap) < 0.5) {
        glideSpot = wheelTarget;
        setViewY(wheelTarget);
        gliding = false;
        glideLast = 0;
        return;
    }

    //  How long since the last step?  (The first step:  pretend a 60th of a second.
    //  A long pause,  like a busy moment?  Count at most a 10th of a second,  so it doesn't jump.)
    const passed = glideLast === 0 ? 1000 / 60 : Math.min(t - glideLast, 100);
    glideLast = t;

    //  Move 25% of the way there  for every 60th of a second that passed.
    //  ("Keep 75%,  once per 60th of a second"  ->  0.75 to the power of how many 60ths passed.)
    glideSpot += gap * (1 - Math.pow(1 - GLIDE, passed / (1000 / 60)));
    setViewY(glideSpot);

    requestAnimationFrame(glideStep);             //  same thing again, next redraw
}


function snapToRow() {

    if (dragging) return;                   //  drag mode is moving?  Snap when you let go, not now.

    wheelTarget = null;                     //  the glide is over
    wheelLeft = 0;

    if (outputBox.classList.contains('expanded') || matches.length === 0) return;

    //  Already on a whole row?  Nothing to do.
    //  (A hair off,  less than a pixel?  Drag mode moves in fractions of a pixel.  Just set it EXACTLY:  no glide needed.)
    const now = readViewY();
    const nearest = Math.round(now / rowHeight) * rowHeight;
    if (Math.abs(now - nearest) < 1) {
        if (now !== nearest) setViewY(nearest);
        return;
    }

    if (!rowsScaled) {
        outputBox.scrollTo({ top: nearest, behavior: 'smooth' });    //  normal file:  the browser glides there
        return;
    }

    //  Scaled file:  the browser can't land on an exact row  (its scrollbar is squeezed),
    //  so use our own glide instead.
    wheelTarget = nearest;
    glideSpot = now;

    if (!gliding) {
        gliding = true;
        requestAnimationFrame(glideStep);
    }
}



// ----------------------------------------------------------
//
//    DRAG MODE
//
//    Like the mouse's middle-click scroll on Windows,  but for EVERYONE:
//    Macs  (no middle click),  trackpads,  and phones.
//
//    Turn it on  ->  HOLD anywhere on the sheet.  That spot is the ANCHOR  (a little glass dot).
//    Drag away from it  ->  the sheet moves that way,  in ANY direction:
//    up,  down,  sideways,  or diagonal.   Let go  ->  it stops.
//
//         ●  the anchor
//          \
//           \     the further from the anchor,  the faster.
//            ↘    Close to it  =  slow and careful.   On it  =  stopped.
//
//    Escape stops it too.  When it stops,  it lands on a whole row  (like the wheel).
//
//    It never goes past the top,  the bottom,  or the sides,
//    and its top speeds stay inside what the page can draw smoothly.
//
// ----------------------------------------------------------

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



// ----------------------------------------------------------
//
//    THE SCALED UP-AND-DOWN SCROLLBAR   (only for HUGE files)
//
//    Browsers stop drawing text past about 8 million pixels.
//    A million rows x 30 pixels  =  30 million.  Way past it:
//    the rows would scroll by with NO WORDS in them.
//
//    So past MAX_SCROLL_HEIGHT, the rows area is never taller than that,
//    and the scrollbar is "squeezed":  one pixel of scrollbar  =  several pixels of rows.
//
//    The brain keeps its OWN exact number for where you are  (viewY),
//    in full-height pixels.  The wheel, the glide, Go to row, and the
//    "Rows 1–15" words all use viewY, so they stay exact:
//    3 rows per wheel click, landing on whole rows, on ANY size file.
//
//    Normal-size files  (not scaled):  viewY is just the scrollbar's number.
//    Nothing changes.
//
// ----------------------------------------------------------

//  Stretch a squeezed scrollbar number into a full-height one  (or the other way).
//  The first 2,000 pixels stay 1-to-1, so the top of the file lines up perfectly.
//  After that, everything is stretched, so the END of the scrollbar  =  the END of the file.
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


//  The furthest the window can scroll:  squeezed  (what the scrollbar knows)  and full  (the real thing).
function squeezedEnd() { knowBox(); return headHeight + rowsHeight - boxHeight; }
function fullEnd()     { knowBox(); return headHeight + matches.length * rowHeight - boxHeight; }

//  The lowest viewY can go  (the bottom of the file).
function lowestViewY() {
    return rowsScaled ? fullEnd() : outputBox.scrollHeight - outputBox.clientHeight;
}

//  Where the scrollbar should be, for this viewY.
function scrollbarSpotFor(y) {
    return rowsScaled ? squeeze(y, squeezedEnd(), fullEnd()) : y;
}


//  Where are you looking?  (Read it fresh from the scrollbar, if YOU moved the scrollbar.)
function readViewY() {

    const scrolled = outputBox.scrollTop;

    if (!rowsScaled) {                      //  normal file:  the scrollbar's number IS the answer
        viewY = scrolled;
        expectedTop = scrolled;
        return viewY;
    }

    //  Scrollbar is where the brain put it?  Keep the brain's exact number.
    //  Somewhere else?  You dragged it  ->  stretch the scrollbar's number.
    if (Math.abs(scrolled - expectedTop) > 1.5) {
        viewY = stretch(scrolled, squeezedEnd(), fullEnd());
        expectedTop = scrolled;
    }

    return viewY;
}


//  Go look HERE  (in full-height pixels).
function setViewY(y) {

    if (!rowsScaled) {                      //  normal file:  just move the scrollbar
        outputBox.scrollTop = y;
        viewY = y;
        expectedTop = y;
        return;
    }

    viewY = Math.min(Math.max(y, 0), fullEnd());
    expectedTop = scrollbarSpotFor(viewY);
    outputBox.scrollTop = expectedTop;
}


//  Expand mode  (the whole page scrolls instead of the window):  the same squeeze, using the screen's height.
function pageSpotFor(y) {
    return rowsScaled ? squeeze(y, rowsHeight - window.innerHeight, matches.length * rowHeight - window.innerHeight) : y;
}

function pageViewFor(spot) {
    return rowsScaled ? stretch(spot, rowsHeight - window.innerHeight, matches.length * rowHeight - window.innerHeight) : spot;
}

window.addEventListener('scroll', function () {
    if (outputBox.classList.contains('expanded')) buildVisibleRows();
});

window.addEventListener('resize', function () {
    boxChanged();                   //  the window may be a new size now
    updateColumns();                //  wider screen  =  more columns fit
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
    const wanted = searchInput.value.trim().toLowerCase();


    //  The first time you search, the search copy isn't ready yet.
    //  Get it ready  (in bites, with the loader),  and it'll come back here when it's done.
    if (wanted !== '' && searchText === null) {
        buildSearchText();
        return;
    }

    const mySearch = ++searchId;            //  this search's number.  (Type again?  The next one gets a new number.)


    //  Pick which rows to show.
    //    No search word?    Keep every row.   (Use the "every row" list.  Make it the first time.)
    //    Search word?       Keep only rows that have it.
    //
    //  Each match is just the row's number  (0, 1, 2...).
    //  Its row NUMBER is that  +1,  because the header is row 0.
    if (wanted === '') {

        if (allRows === null) {
            allRows = new Uint32Array(rowCount);    //  [0, 1, 2, 3 ...]  (a light list of numbers:  4 bytes each)
            for (let i = 0; i < rowCount; i++) allRows[i] = i;
        }
        doneQuery   = null;
        doneMatches = null;
        showMatches('', allRows);
        return;
    }


    //  NARROWING:  you typed MORE onto the last word?  ("chi"  ->  "chic")
    //  Then only rows that had "chi" can have "chic".  Only check THOSE.
    //  (Same answer as checking every row.  Just way less checking.)
    const pool  = doneQuery !== null && wanted.includes(doneQuery) ? doneMatches : null;    //  null  =  check every row
    const total = pool === null ? rowCount : pool.length;
    const texts = searchText;               //  hold on to THIS file's search copy
    const found = [];
    let i = 0;


    //  Search in BITES, like cutting up the file, so the page never freezes.
    //  (Small file?  It's all done in the first bite, so it's instant, same as always.)
    //  The old results stay on screen until the new ones are READY.  Then they swap in, all at once.
    function searchSome() {

        if (mySearch !== searchId) return;  //  you typed again since?  This search is old.  Stop.

        const stopAt = performance.now() + CHUNK_TIME;

        while (i < total && performance.now() < stopAt) {

            const last = Math.min(i + 500, total);  //  (checking the clock every 500 rows, like cutting up the file.
                                                     //   Wide rows are BIG:  500 of square_10000's rows  =  25 MB.)
            for (; i < last; i++) {
                const row = pool === null ? i : pool[i];
                if (texts[row].includes(wanted)) found.push(row);
            }
        }

        //  More to do?  Say how far along we are, let the screen breathe, then take the next bite.
        if (i < total) {
            statusText.textContent = 'Searching for "' + searchInput.value.trim() + '"...  ' + Math.floor(100 * i / total) + '%';
            nextBite(searchSome);
            return;
        }

        //  Done!  Remember it  (for narrowing next time),  and swap it in.
        doneQuery   = wanted;
        doneMatches = found;
        showMatches(wanted, found);
    }

    searchSome();                           //  take the first bite
}



// ----------------------------------------------------------
//
//    SHOW THESE MATCHES
//
//    Swaps in a search's results, and redraws the window.
//    "wanted"  =  the search word  (it paints the yellow).
//    "list"    =  the rows that passed.
//
//    The word and the rows change TOGETHER, right here.
//    (If the word changed sooner, rows built while the search was
//     still running would paint the NEW word on the OLD results.)
//
// ----------------------------------------------------------

function showMatches(wanted, list) {

    query   = wanted;
    matches = list;


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
    updateColumns(true);            //  pick the columns to build  (and draw the header with them)

    //  Too many rows to draw at full height?  Then the up-and-down scrollbar gets "scaled".
    rowsScaled = matches.length * rowHeight > MAX_SCROLL_HEIGHT;
    rowsHeight = rowsScaled ? MAX_SCROLL_HEIGHT : matches.length * rowHeight;

    sizeWindow();                   //  make the window header + 15 rows tall
    setViewY(0);                    //  start at the top
    buildVisibleRows();             //  build the rows you can see
    updatePosition();               //  update the "Rows 1–15" words
    aimReset();                     //  the snap menu locks onto the first match  (or "Ready")
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

//  One row, ready to search:  small letters, with a ␀ wall between the cells.
//  No quotes?  The cells are just the bits between commas, so swap every comma for a wall.
//  (Same answer as cutting it up and gluing it back together.  Just no cutting.)
function searchLine(line) {

    if (line.indexOf('"') === -1) return line.replaceAll(',', '\u0000').toLowerCase();

    return splitIntoCells(line).join('\u0000').toLowerCase();
}


function buildSearchText() {

    if (buildingSearch) return;            //  already on it?  (You typed more while it works.)  Don't start twice.
    buildingSearch = true;

    const myLoad = loadId;                  //  which file this is for
    const total  = rowCount;                //  how many rows THIS file has
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

        while (i < total && performance.now() < stopAt) {

            const last = Math.min(i + 50, total);           //  (checking the clock every 50 rows:  squishing a WIDE row is slow.
                                                             //   500 of square_10000's rows  =  25 MB in one go  =  a freeze.)

            for (; i < last; i++) {
                built.push(searchLine(rowText(i)));
            }
        }

        setProgress(i / Math.max(total, 1));

        //  More to do?  Let the screen breathe, then take the next bite.
        if (i < total) {
            nextBite(squishSomeRows);
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
//    "scrolledTop" is optional too:  where the scrollbar really is,  already read
//    (the scroll listener reads it BEFORE changing anything,  so nobody has to read it after).
//
// ----------------------------------------------------------

function buildVisibleRows(scrollSpot, scrolledTopNow) {

    if (matches.length === 0) return;


    //  1.  Where are we looking?
    //      viewTop     =  in full-height pixels  (which rows)
    //      scrolledTop =  in REAL pixels on the page  (where to put them)
    //      (Normal files:  the same number.  Huge files:  see "THE SCALED UP-AND-DOWN SCROLLBAR".)
    let viewTop, viewHeight, scrolledTop;

    if (outputBox.classList.contains('expanded')) {
        scrolledTop = -rowsBox.getBoundingClientRect().top;     //  how far the rows' top has scrolled above the screen
        viewTop     = pageViewFor(scrolledTop);
        viewHeight  = window.innerHeight;                       //  the whole screen
    } else if (scrollSpot !== undefined) {
        knowBox();
        viewTop     = scrollSpot;
        scrolledTop = scrolledTopNow !== undefined ? scrolledTopNow : scrollbarSpotFor(scrollSpot);
        viewHeight  = boxHeight;                                //  the window
    } else {
        knowBox();
        viewTop     = readViewY();
        scrolledTop = outputBox.scrollTop;
        viewHeight  = boxHeight;
    }

    //  Turn that into row numbers  (+ extras),  kept inside  0 ... the last row.
    let start = Math.max(0, Math.floor(viewTop / rowHeight) - EXTRA_ROWS);
    let end   = Math.min(matches.length, Math.ceil((viewTop + viewHeight) / rowHeight) + EXTRA_ROWS);

    //  How far the rows have to slide so the right row lands at the top of the window.
    //  (Normal files:  0.  Huge files:  the difference between the real and the full-height spot.)
    const slide = scrolledTop - viewTop;
    const area  = rowsScaled ? rowsHeight : matches.length * rowHeight;     //  how tall the rows area really is

    //  Huge file, near the very top or bottom?  Drop extra rows that wouldn't fit in the rows area.
    if (rowsScaled) {
        const firstSeen = Math.floor(viewTop / rowHeight);
        const lastSeen  = Math.ceil((viewTop + viewHeight) / rowHeight);
        while (start < firstSeen && slide + start * rowHeight < 0) start++;
        while (end > lastSeen && slide + end * rowHeight > area) end--;
    }


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
    //      (Huge file?  Squeezed to fit, and slid so the right rows land in the window.)
    const above = Math.max(0, slide + start * rowHeight);
    topSpacer.style.height    = above + 'px';
    bottomSpacer.style.height = Math.max(0, area - above - (end - start) * rowHeight) + 'px';
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
        const spot = matches[i];                //  which row this is  (in the file)
        fragment.appendChild(makeRow(spot + 1, getCells(spot), query, i));
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


    //  The row number, on the far left.   (The spreadsheet look:  Excel's number,  1 higher.)
    const numCell = document.createElement('span');
    numCell.className = 'line-num';
    numCell.textContent = num + rowShift();
    row.appendChild(numCell);


    //  The LEFT spacer  (stands in for all the columns to the left that aren't built).
    row.appendChild(document.createElement('span'));


    //  One box for every column that's BUILT right now  (the sideways treadmill decides which).
    //  (If this row is missing some cells, those boxes are just empty.)
    for (let col = builtColStart; col < builtColEnd; col++) {

        const text = cells[col] || '';

        //  A HUGE cell?  Only use its first SHOW_LETTERS letters, plus "…".
        //  (You can only see about 40.  All 50 million in the box froze the page.)
        const short = text.length > SHOW_LETTERS ? text.slice(0, SHOW_LETTERS) + '…' : text;

        //  A line break inside the cell?  Show it as  ↵  so the row stays ONE line tall.
        //  (Every row MUST be the same height.  All the scrolling math counts on it.)
        const shown = /[\r\n]/.test(short) ? short.replace(/\r\n|\r|\n/g, '↵') : short;

        const cell = document.createElement('span');
        cell.className = 'cell';

        if (looksLikeNumber(shown)) cell.classList.add('num');     //  numbers go on the right

        if (text.length > 40 || shown !== text) cell.title = short; //  too long, or has line breaks?  hover to read it

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

        //  A SQL NULL  (not just empty:  "unknown")?  Mark it:  the table look shows a faint  NULL.
        //  (Only an EMPTY cell can be NULL,  so the others don't even look it up.)
        if (sqlInfo !== null && text === '' && sqlIsNull(sqlInfo, num, col)) cell.classList.add('null');

        paintMatches(cell, shown, query);

        row.appendChild(cell);
    }


    //  The RIGHT spacer  (stands in for all the columns to the right).
    row.appendChild(document.createElement('span'));

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
//    THE THEME CHIP  (top-left corner)
//
//    Click the chip     ->  it UNFOLDS into the theme menu  (a tiny glass chessboard).
//    Click a theme      ->  the whole page changes colors.
//    Click anywhere else, or press Escape  ->  the menu folds back down into the chip.
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
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#2a2e35', glow: 'rgba(165, 175, 190, 0.95)' },
    { id: 'neo-dark',    name: 'Neo-Dark',    color: '#d9dbe0', glow: 'rgba(255, 255, 255, 0.14)' },     //  (flat and dark:  its chip is light)
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



// ----------------------------------------------------------
//
//    QUERY   (ask the open table a question:  the engine is queryI.js)
//
//    "Query",  at the end of the file bar,  UNFOLDS the query menu  (out of the button,  like the theme menu):
//
//        ┌──────────────────────────────────────────────────────────────┐
//        │ Query  ·  sales  ·  1,204 rows                             × │
//        ├────────────┬─────────────────────────────────────────────────┤
//        │ Show       │ [all columns]   [+ column ▾]                    │
//        │ Keep rows  │ [city ▾] [is ▾] [Chicago] ×    [+ condition]    │
//        │ Group by   │ [+ column ▾]                                    │
//        │ Totals     │ [count ▾] [of rows ▾] ×    [+ total]            │
//        │ Sort by    │ [+ column ▾]                                    │
//        │ At most    │ [     ] rows                                    │
//        ├────────────┴─────────────────────────────────────────────────┤
//        │ SQL  [✓] Query Flexibility  [ ] Type mode   written for you  │
//        │ SELECT city, COUNT(*) AS count FROM sales GROUP BY city      │
//        ├──────────────────────────────────────────────────────────────┤
//        │ [Run ▶]  [Copy SQL]  [Export CSV]            12 rows · 8 ms  │
//        └──────────────────────────────────────────────────────────────┘
//
//    1.  The BUILDER:  pick things,  and it writes the SQL for you  (so you can learn it,  too).
//    2.  Or TYPE MODE:  type your own SQL in the box  (click in,  and it turns on:  the builder is greyed out).
//        Untick it  ->  your SQL snaps back into the builder's buttons.   (A part they can't show?  It asks first.)
//        QUERY FLEXIBILITY  ("snap to result",  on at the start):  small mistakes get fixed,  and you're told what changed.
//    3.  Run  ->  the ANSWER takes the window's place:  a little table of its own,
//        in the table look  (its column types on top,  NULLs shown).   Search it,  flip it,  snap to it.
//        "← Back to file"  brings the file back,  right away  (it was never gone:  just put aside).
//
//    The tables a query can use:
//        a CSV          ->  its name,  without .csv              (sales.csv   ->   FROM sales)
//        an Excel file  ->  every sheet,  by its name            (FROM "Q1 Sales")
//        a SQL dump     ->  every table,  by its name            (FROM orders)
//    So a JOIN can bring two sheets  (or two tables of a dump)  together.
//
// ----------------------------------------------------------

const queryBtn     = document.getElementById('queryBtn');       //  "Query"  (the end of the file bar)
const queryMenu    = document.getElementById('queryMenu');      //  the menu it unfolds into
const queryTitle   = document.getElementById('queryTitle');     //  its  "Query  ·  sales  ·  1,204 rows"
const queryClose   = document.getElementById('queryClose');     //  its  ×
const queryBuilder = document.getElementById('queryBuilder');   //  the builder  (the brain fills it in)
const querySql     = document.getElementById('querySql');       //  the SQL box
const queryNote    = document.getElementById('querySqlNote');   //  "written for you as you pick"
const queryFlex    = document.getElementById('queryFlex');      //  [✓] Query Flexibility
const queryType    = document.getElementById('queryType');      //  [ ] Type mode
const queryAsk     = document.getElementById('queryAsk');       //  "The builder can't show ...   [Drop them] [Keep typing]"
const queryAskWords = document.getElementById('queryAskWords');
const queryAskYes  = document.getElementById('queryAskYes');
const queryAskNo   = document.getElementById('queryAskNo');
const queryFixes   = document.getElementById('queryFixes');     //  "Query Flexibility fixed:  selct  ->  SELECT ..."
const queryRun     = document.getElementById('queryRun');       //  "Run ▶"
const queryCopy    = document.getElementById('queryCopy');      //  "Copy SQL"
const queryExport  = document.getElementById('queryExport');    //  "Export CSV"
const queryStatus  = document.getElementById('queryStatus');    //  "12 rows · 8 ms"   (or what went wrong)
const backBtn      = document.getElementById('backBtn');        //  "← Back to file"

let fileTable   = null;     //  the open file's table  (what a query asks about):   { table, file, sheet, others, engine }
let answer      = null;     //  the answer on screen:  { table, csv }   (null  =  the file is on screen)
let fileLook    = false;    //  the file's look,  to go back to
let queryId     = 0;        //  counts every Run.  (Run again while one is going?  The old one sees the number changed,  and quits.)
let typeMode    = false;    //  TYPE MODE:  you write the SQL yourself.  (The builder is greyed out,  and stops writing over it.)
let queryFold   = null;     //  the "hide it once it's done folding" timer

//  What you picked in the builder.
let build = newBuild();

function newBuild() {
    return {
        show:    [],        //  which columns  ([]  =  all of them)
        filters: [],        //  [{ col, op, value }]
        any:     false,     //  false  =  keep rows that pass ALL the conditions.   true  =  ANY of them.
        group:   [],        //  group by these columns
        totals:  [],        //  [{ fn, col }]
        sort:    [],        //  [{ col, desc }]
        limit:   '',        //  at most this many rows  (''  =  no limit)
    };
}

//  Is a query's answer on screen  (not the file)?
function showingAnswer() {
    return sqlInfo !== null && sqlInfo.result !== undefined;
}

//  8 ms   ·   1.2 s
function formatTime(ms) {
    return ms < 1000 ? Math.max(1, Math.round(ms)) + ' ms' : (ms / 1000).toFixed(1) + ' s';
}


//  ---- THE TABLES  (what the engine reads) ----

//  The open file's table's NAME,  for  FROM ...
function mainTableName() {
    const t = fileTable.table;
    if (t.excel !== null) return t.excel.sheetName;
    if (t.sql !== null) return t.sql.sheetName;
    return fileTable.file.name.replace(/\.[^.]*$/, '') || 'file';
}

//  The file's OTHER sheets  (or tables):  they can be used too  (they're read when a query asks for them).
function otherSheets() {
    const t = fileTable.table;
    const book = t.excel !== null ? t.excel : t.sql;
    if (book === null) return [];
    const list = [];
    book.sheets.forEach(function (sheet, i) {
        if (!sheet.chart && i + 1 !== book.sheetNumber) list.push({ name: sheet.name, index: i });
    });
    return list;
}

//  One row's text,  out of a table's long string  (like rowText,  for any table).
function tableRowText(table, i) {
    const start = table.starts[i];
    let end = table.starts[i + 1] - 1;
    if (end < table.text.length && end > start && table.text.charCodeAt(end - 1) === 13) end--;
    return table.text.slice(start, end);
}

//  A table,  the way the engine wants it  (see "THE TABLES" in queryI.js).
function engineTable(table, name) {
    const columns = table.header.slice();
    while (columns.length < table.longest.length) columns.push('');
    const sql = table.sql;
    const typed = sql !== null && sql.columns.length > 0 && sql.columns.every(function (c) { return c.type !== ''; });
    return {
        name: name,
        columns: columns,
        declared: typed ? sql.columns.map(function (c) { return c.type; }) : null,
        rowCount: table.count,
        row: function (i) { return splitIntoCells(tableRowText(table, i)); },
        rowUpTo: function (i, count) { return cellsUpTo(tableRowText(table, i), count); },     //  just the first  count  cells
        isNull: sql !== null ? function (i, j) { return sqlIsNull(sql, i + 1, j); } : null,
        emptyIsNull: sql === null,         //  a CSV or Excel file:  an empty cell means NULL  (it has no other way to say it)
    };
}

//  Just the first  count  cells of a line   (a question about column 3 of a 10,000-column file doesn't cut the other 9,997).
//  No quotes in those cells?  One quick  split.   Quotes?  The careful way  (splitIntoCells),  then keep the first  count.
function cellsUpTo(line, count) {
    const first = line.split(',', count);
    for (let k = 0; k < first.length; k++) {
        if (first[k].indexOf('"') !== -1) return splitIntoCells(line).slice(0, count);
    }
    return first;
}

//  Cut CSV text  (an Excel sheet or a SQL table,  turned into CSV by the translator)  into rows of cells.
function cutCsvText(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (quoted) {
            if (c === 34) {
                if (text.charCodeAt(i + 1) === 34) { cell += '"'; i++; }
                else quoted = false;
            } else cell += text[i];
        } else if (c === 34) quoted = true;
        else if (c === 44) { row.push(cell); cell = ''; }
        else if (c === 10) { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c !== 13) cell += text[i];
    }
    if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
    return rows;
}

//  Read ANOTHER sheet  (or table)  of the open file,  for a query that asks for it.
async function loadOtherTable(sheet, isCurrent) {

    const t = fileTable.table, file = fileTable.file;

    setLoadingLabel('Reading "' + sheet.name + '"...');
    const result = t.excel !== null
        ? await readXlsx(file, isCurrent, sheet.index)
        : await readSql(await file.text(), file, isCurrent, sheet.index);

    const rows = cutCsvText(result.text);
    const header = rows.length > 0 ? rows[0] : [];
    const data = rows.slice(1);
    let width = header.length;
    data.forEach(function (r) { if (r.length > width) width = r.length; });
    const columns = header.slice();
    while (columns.length < width) columns.push('');

    const sql = t.sql !== null ? result.info : null;
    const typed = sql !== null && sql.columns.length > 0 && sql.columns.every(function (c) { return c.type !== ''; });

    return {
        name: sheet.name,
        columns: columns,
        declared: typed ? sql.columns.map(function (c) { return c.type; }) : null,
        rowCount: data.length,
        row: function (i) { return data[i]; },
        isNull: sql !== null ? function (i, j) { return sqlIsNull(sql, i + 1, j); } : null,
        emptyIsNull: sql === null,
    };
}

//  The "catalog":  every table a query can use  (see runQuery in queryI.js).
function queryCatalog(isCurrent) {

    const main = fileTable.engine;
    const known = new Map([[main.name.toLowerCase(), main]]);
    fileTable.others.forEach(function (table, key) { known.set(key, table); });
    const others = otherSheets();
    const mine = fileTable;

    return {
        find: function (name) { return known.get(String(name).toLowerCase()) || null; },
        names: function () { return [main.name].concat(others.map(function (s) { return s.name; })); },
        prepare: async function (names) {
            for (const name of names) {
                const key = String(name).toLowerCase();
                if (known.has(key)) continue;
                const sheet = others.find(function (s) { return s.name.toLowerCase() === key; });
                if (sheet === undefined) continue;              //  (not a table at all:  the engine says so)
                const table = await loadOtherTable(sheet, isCurrent);
                if (!isCurrent() || mine !== fileTable) throw QUERY_STALE;
                mine.others.set(key, table);                    //  remembered,  so the next query doesn't read it again
                known.set(key, table);
            }
        },
    };
}


//  ---- A NEW FILE  (or sheet)  IS OPEN ----

function queryFileChanged() {

    const name = mainTableName();
    fileTable.engine = engineTable(fileTable.table, name);

    queryBtn.disabled = false;
    answer = null;
    queryExport.disabled = true;
    build = newBuild();
    setTypeMode(false);
    showFixes([]);

    queryTitle.textContent = 'Query  ·  ' + name + '  ·  ' + fileTable.table.count.toLocaleString() + ' row' + (fileTable.table.count === 1 ? '' : 's');
    setQueryStatus('', false);
    drawBuilder();
    writeSql();
}


//  ---- THE BUILDER ----

//  Which conditions you can pick,  in plain words.
const FILTER_OPS = [
    ['=',        'is'],
    ['<>',       'is not'],
    ['>',        'is over'],
    ['>=',       'is at least'],
    ['<',        'is under'],
    ['<=',       'is at most'],
    ['contains', 'contains'],
    ['starts',   'starts with'],
    ['ends',     'ends with'],
    ['empty',    'is empty'],
    ['filled',   'is not empty'],
];

//  Which totals you can pick.   [what it's called here,  its SQL,  its nickname's start]
const TOTAL_FNS = [
    ['rows',     'COUNT(*)',       'count'],
    ['count',    'COUNT',          'count'],
    ['distinct', 'COUNT DISTINCT', 'different'],
    ['sum',      'SUM',            'sum'],
    ['avg',      'AVG',            'average'],
    ['min',      'MIN',            'smallest'],
    ['max',      'MAX',            'biggest'],
    ['median',   'MEDIAN',         'median'],
];
const TOTAL_WORDS = { rows: 'count rows', count: 'count', distinct: 'count different', sum: 'sum of', avg: 'average of', min: 'smallest', max: 'biggest', median: 'middle value of' };

function queryColumns() { return columnNames(fileTable.engine); }
function queryKinds()   { return columnKinds(fileTable.engine); }

//  A little drop-down list.   options  =  [[value, words]]
//  A LONG one  (a file with thousands of columns)?  Its options are only made when you OPEN it.
//  (5 lists x 10,000 columns = 50,000 options,  made on every load AND on every pick:  ~0.1 s each time.)
//  Until then it holds just the one that's picked,  and the longest one  (so it's already as wide as it'll be).
const LAZY_LIST = 200;

function pickList(options, chosen, label, onPick) {
    const list = document.createElement('select');
    list.setAttribute('aria-label', label);
    function fillWith(some) {
        const box = document.createDocumentFragment();
        some.forEach(function (o) {
            const option = document.createElement('option');
            option.value = o[0];
            option.textContent = o[1];
            if (o[0] === chosen) option.selected = true;
            box.appendChild(option);
        });
        list.appendChild(box);
    }
    if (options.length <= LAZY_LIST) fillWith(options);
    else {
        const picked = options.find(function (o) { return o[0] === chosen; }) || options[0];
        const longest = options.reduce(function (a, o) { return o[1].length > a[1].length ? o : a; }, picked);
        fillWith(longest === picked ? [picked] : [picked, longest]);
        let full = false;
        const fill = function () { if (full) return; full = true; list.textContent = ''; fillWith(options); };
        ['mousedown', 'focus', 'keydown', 'touchstart'].forEach(function (e) { list.addEventListener(e, fill, { passive: true }); });
    }
    list.addEventListener('change', function () { onPick(list.value); });
    return list;
}

//  "+ column ▾":  a list that starts on its own words,  and adds what you pick.
function addList(words, options, label, onPick) {
    const list = pickList([['', words]].concat(options), '', label, function (v) { if (v !== '') onPick(v); });
    list.classList.add('query-add');
    return list;
}

function smallButton(words, label, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'query-x';
    b.textContent = words;
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
}

//  A chip:   [ city  × ]
function chip(words, onRemove) {
    const c = document.createElement('span');
    c.className = 'query-chip';
    c.textContent = words;
    c.appendChild(smallButton('×', 'Remove ' + words, onRemove));
    return c;
}

//  The nicknames the totals get  (count,  sum_price ...),  in order.   (A nickname from SQL you typed?  That one.)
function totalNames(of) {
    const b = of || build;
    const used = new Set(b.group.map(function (g) { return g.toLowerCase(); }));
    return b.totals.map(function (t) {
        const fn = TOTAL_FNS.find(function (f) { return f[0] === t.fn; });
        if (t.name) { used.add(t.name.toLowerCase()); return t.name; }
        let name = t.fn === 'rows' ? 'count' : fn[2] + '_' + String(t.col).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        let n = name, k = 2;
        while (used.has(n)) n = name + '_' + k++;
        used.add(n);
        return n;
    });
}

//  Draw the builder  (all of it,  every time something is picked:  it's small).
function drawBuilder() {

    queryBuilder.textContent = '';
    if (fileTable === null) return;

    const columns = queryColumns();
    const colOptions = columns.map(function (c) { return [c, c]; });
    const grouped = build.group.length > 0 || build.totals.length > 0;

    function section(words, fill) {
        const row = document.createElement('div');
        row.className = 'query-row';
        const name = document.createElement('span');
        name.className = 'query-label';
        name.textContent = words;
        const box = document.createElement('div');
        box.className = 'query-pick';
        fill(box);
        row.append(name, box);
        queryBuilder.appendChild(row);
    }

    function changed() { drawBuilder(); writeSql(); }

    //  SHOW
    section('Show', function (box) {
        if (grouped) {
            const note = document.createElement('span');
            note.className = 'query-hint';
            note.textContent = 'the groups and their totals  (below)';
            box.appendChild(note);
            return;
        }
        if (build.show.length === 0) {
            const all = document.createElement('span');
            all.className = 'query-hint';
            all.textContent = 'all columns';
            box.appendChild(all);
        }
        build.show.forEach(function (c, k) {
            box.appendChild(chip(c, function () { build.show.splice(k, 1); changed(); }));
        });
        const left = colOptions.filter(function (o) { return build.show.indexOf(o[0]) === -1; });
        if (left.length > 0) box.appendChild(addList('+ column', left, 'Add a column to show', function (v) { build.show.push(v); changed(); }));
    });

    //  KEEP ROWS
    section('Keep rows', function (box) {
        build.filters.forEach(function (f, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(colOptions, f.col, 'Column', function (v) { f.col = v; changed(); }));
            line.appendChild(pickList(FILTER_OPS, f.op, 'Condition', function (v) { f.op = v; changed(); }));
            if (f.op !== 'empty' && f.op !== 'filled') {
                const value = document.createElement('input');
                value.type = 'text';
                value.className = 'query-value';
                value.value = f.value;
                value.placeholder = 'value';
                value.setAttribute('aria-label', 'Value');
                value.addEventListener('input', function () { f.value = value.value; writeSql(); });
                line.appendChild(value);
            }
            line.appendChild(smallButton('×', 'Remove this condition', function () { build.filters.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        if (build.filters.length > 1) {
            box.appendChild(pickList([['all', 'all of these'], ['any', 'any of these']], build.any ? 'any' : 'all', 'Keep rows that pass',
                                     function (v) { build.any = v === 'any'; changed(); }));
        }
        box.appendChild(addList('+ condition', colOptions, 'Add a condition', function (v) { build.filters.push({ col: v, op: '=', value: '' }); changed(); }));
    });

    //  GROUP BY
    section('Group by', function (box) {
        build.group.forEach(function (c, k) {
            box.appendChild(chip(c, function () { build.group.splice(k, 1); changed(); }));
        });
        const left = colOptions.filter(function (o) { return build.group.indexOf(o[0]) === -1; });
        if (left.length > 0) box.appendChild(addList('+ column', left, 'Group by a column', function (v) { build.group.push(v); changed(); }));
    });

    //  TOTALS
    section('Totals', function (box) {
        build.totals.forEach(function (t, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), t.fn, 'Total', function (v) {
                t.fn = v;
                t.name = null;                          //  (a nickname you typed was for the OLD total)
                if (v !== 'rows' && t.col === null) t.col = columns[0];
                changed();
            }));
            if (t.fn !== 'rows') line.appendChild(pickList(colOptions, t.col, 'Of which column', function (v) { t.col = v; t.name = null; changed(); }));
            if (t.name) {                               //  a nickname from SQL you typed:   COUNT(*) AS n   ->   "as n"
                const as = document.createElement('span');
                as.className = 'query-hint';
                as.textContent = 'as ' + t.name;
                line.appendChild(as);
            }
            line.appendChild(smallButton('×', 'Remove this total', function () { build.totals.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        box.appendChild(addList('+ total', TOTAL_FNS.map(function (f) { return [f[0], TOTAL_WORDS[f[0]]]; }), 'Add a total', function (v) {
            build.totals.push({ fn: v, col: v === 'rows' ? null : columns[0] });
            changed();
        }));
    });

    //  SORT BY   (grouped:  by a group,  or by a total)
    section('Sort by', function (box) {
        const sortOptions = grouped
            ? build.group.map(function (g) { return [g, g]; }).concat(totalNames().map(function (n) { return [n, n]; }))
            : colOptions;
        build.sort = build.sort.filter(function (s) { return sortOptions.some(function (o) { return o[0] === s.col; }); });
        build.sort.forEach(function (s, k) {
            const line = document.createElement('span');
            line.className = 'query-line';
            line.appendChild(pickList(sortOptions, s.col, 'Sort by', function (v) { s.col = v; changed(); }));
            line.appendChild(pickList([['up', '↑ low to high'], ['down', '↓ high to low']], s.desc ? 'down' : 'up', 'Which way',
                                      function (v) { s.desc = v === 'down'; changed(); }));
            line.appendChild(smallButton('×', 'Remove this sort', function () { build.sort.splice(k, 1); changed(); }));
            box.appendChild(line);
        });
        if (sortOptions.length > 0) box.appendChild(addList('+ column', sortOptions, 'Sort by a column', function (v) { build.sort.push({ col: v, desc: false }); changed(); }));
    });

    //  AT MOST
    section('At most', function (box) {
        const limit = document.createElement('input');
        limit.type = 'number';
        limit.min = '1';
        limit.className = 'query-value query-limit';
        limit.placeholder = 'all';
        limit.value = build.limit;
        limit.setAttribute('aria-label', 'At most this many rows');
        limit.addEventListener('input', function () { build.limit = limit.value; writeSql(); });
        const words = document.createElement('span');
        words.className = 'query-hint';
        words.textContent = 'rows';
        box.append(limit, words);
    });

    queryBuilder.classList.toggle('paused', typeMode);
}


//  ---- THE SQL IT WRITES ----

//  A name,  in quotes only if it needs them:   city    "Sales Data"    "order"
const NEEDS_QUOTES = new Set(['TRUE', 'FALSE', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'CASE', 'CAST', 'EXISTS']);
function sqlName(name) {
    const n = String(name);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !SQL_RESERVED.has(n.toUpperCase()) && !NEEDS_QUOTES.has(n.toUpperCase())
        ? n
        : '"' + n.split('"').join('""') + '"';
}

//  Words,  in single quotes:   'Chicago'    'it''s'
function sqlWordsOf(text) {
    return "'" + String(text).split("'").join("''") + "'";
}

//  A value you typed:  a number stays a number  (for a column of numbers),  anything else is words.
function sqlValueOf(text, kind) {
    const t = String(text).trim();
    if ((kind === 'int' || kind === 'real' || kind === 'num') && NUMBER_WORDS.test(t)) return t;
    return sqlWordsOf(text);
}

//  For  contains / starts with / ends with:   LIKE '%Chi%'   (a  %  or  _  you typed is marked with  !  so it counts as itself)
function likeOf(text, before, after) {
    const v = String(text);
    const marked = /[!%_]/.test(v);
    const safe = marked ? v.replace(/[!%_]/g, function (c) { return '!' + c; }) : v;
    return 'LIKE ' + sqlWordsOf(before + safe + after) + (marked ? " ESCAPE '!'" : '');
}

function builderSql() {

    //  (A column's TYPE is only worked out when a condition needs it:  that looks at up to 20,000 rows,
    //   too much to do for every new file just in case.)
    const columns = queryColumns();
    function kindOf(col) { return kindAt(fileTable.engine, columns.indexOf(col)); }      //  (just that column's:  a wide file has thousands)

    const grouped = build.group.length > 0 || build.totals.length > 0;
    const names = totalNames();
    const lines = [];

    //  SELECT
    let show;
    if (grouped) {
        show = build.group.map(sqlName).concat(build.totals.map(function (t, k) {
            const what = t.fn === 'rows' ? 'COUNT(*)'
                : t.fn === 'distinct' ? 'COUNT(DISTINCT ' + sqlName(t.col) + ')'
                : TOTAL_FNS.find(function (f) { return f[0] === t.fn; })[1] + '(' + sqlName(t.col) + ')';
            return what + ' AS ' + sqlName(names[k]);
        }));
    } else {
        show = build.show.length > 0 ? build.show.map(sqlName) : ['*'];
    }
    lines.push('SELECT ' + show.join(', '));

    //  FROM
    lines.push('FROM ' + sqlName(fileTable.engine.name));

    //  WHERE
    const tests = build.filters.map(function (f) {
        const c = sqlName(f.col);
        switch (f.op) {
            case 'empty':    return c + ' IS NULL';
            case 'filled':   return c + ' IS NOT NULL';
            case 'contains': return c + ' ' + likeOf(f.value, '%', '%');
            case 'starts':   return c + ' ' + likeOf(f.value, '', '%');
            case 'ends':     return c + ' ' + likeOf(f.value, '%', '');
            default:         return c + ' ' + f.op + ' ' + sqlValueOf(f.value, kindOf(f.col));
        }
    });
    if (tests.length > 0) lines.push('WHERE ' + tests.join(build.any ? '\n   OR ' : '\n  AND '));

    //  GROUP BY
    if (build.group.length > 0) lines.push('GROUP BY ' + build.group.map(sqlName).join(', '));

    //  ORDER BY
    if (build.sort.length > 0) lines.push('ORDER BY ' + build.sort.map(function (s) { return sqlName(s.col) + (s.desc ? ' DESC' : ''); }).join(', '));

    //  LIMIT
    const limit = parseInt(build.limit, 10);
    if (limit > 0) lines.push('LIMIT ' + limit);

    return lines.join('\n');
}

//  Put the builder's SQL in the box  (unless you're in type mode:  then it's yours).
function writeSql() {
    if (fileTable === null || typeMode) return;
    querySql.value = builderSql();
}


//  ---- THE SQL IT READS   (your SQL  ->  the builder's buttons) ----
//
//  Leaving type mode,  your SQL is read back into the builder:
//
//      SELECT status, COUNT(*) AS n FROM orders WHERE qty > 5 GROUP BY status ORDER BY n DESC LIMIT 10
//
//          Keep rows   [qty] [is over] [5]           Group by   [status]
//          Totals      [count rows]  as n            Sort by    [n] [↓ high to low]          At most   10
//
//  ->  { build,  left }      left  =  the parts the builder CAN'T show,  in words   ([]  =  all of it fits)
//  (SQL with a mistake in it?  It throws the engine's QueryError,  like Run would.)

const FLIP_OP = { '=': '=', '<>': '<>', '<': '>', '<=': '>=', '>': '<', '>=': '<=' };     //  5 < qty   =   qty > 5

function buildFromSql(text) {

    const statements = parseSql(text);
    const q = statements[statements.length - 1];
    const b = newBuild();
    const left = [];

    if (q === undefined || q.t !== 'query') queryFail('The builder only shows a question  (a SELECT).');
    if (statements.length > 1) left.push('the queries before the last one');
    if (q.with !== null) left.push('the WITH tables');
    if (q.body.t !== 'core') {
        left.push(q.body.t === 'set' ? 'the ' + q.body.op : 'the ( ) around the query');
        return { build: b, left: left };
    }

    const c = q.body;
    const columns = queryColumns();
    const lower = columns.map(function (n) { return n.toLowerCase(); });
    const main = fileTable.engine.name.toLowerCase();

    //  FROM:  the open table  (nothing else:  the builder only asks about the open table).
    if (c.from === null || c.from.t !== 'table' || c.from.name.toLowerCase() !== main) {
        left.push(c.from === null ? 'a question with no FROM'
            : c.from.t === 'join' ? 'the JOIN'
            : c.from.t === 'sub' ? 'the query inside FROM'
            : 'the table  ' + c.from.name + '   (the builder only uses  ' + fileTable.engine.name + ')');
        return { build: b, left: left };
    }
    const alias = c.from.alias ? c.from.alias.toLowerCase() : null;

    //  A plain column of the open table   ->   its real name   (or null)
    function columnOf(e) {
        if (e === null || e.t !== 'col') return null;
        if (e.table !== null && e.table.toLowerCase() !== main && e.table.toLowerCase() !== alias) return null;
        const k = lower.indexOf(String(e.name).toLowerCase());
        return k === -1 ? null : columns[k];
    }

    //  A value  (words or a number,  a long whole number too)   ->   what the builder's value box holds   (or null)
    function valueOf(e) {
        return e !== null && e.t === 'lit' && (typeof e.v === 'string' || typeof e.v === 'number' || typeof e.v === 'bigint') ? String(e.v) : null;
    }

    //  A total the builder has:   COUNT(*)  COUNT(x)  COUNT(DISTINCT x)  SUM  AVG  MIN  MAX  MEDIAN   ->   { fn, col }   (or null)
    function totalOf(e) {
        if (e === null || e.t !== 'fn' || e.over || e.filter || e.order) return null;
        if (e.name === 'COUNT' && e.star) return { fn: 'rows', col: null, name: null };
        const col = e.args.length === 1 ? columnOf(e.args[0]) : null;
        if (col === null) return null;
        if (e.name === 'COUNT') return { fn: e.distinct ? 'distinct' : 'count', col: col, name: null };
        const fn = { SUM: 'sum', AVG: 'avg', MIN: 'min', MAX: 'max', MEDIAN: 'median' }[e.name];
        return fn && !e.distinct ? { fn: fn, col: col, name: null } : null;
    }


    //  SELECT   (DISTINCT a, b  is the same rows as  GROUP BY a, b:  so that's how it's shown)
    const hasTotal = c.items.some(function (it) { return !it.star && isTotal(it.e); });
    const distinctCols = c.distinct && !hasTotal && c.group === null
        ? c.items.map(function (it) { return it.star || (it.alias && it.alias.toLowerCase() !== String(it.e.name).toLowerCase()) ? null : columnOf(it.e); })
        : null;
    if (distinctCols !== null && distinctCols.every(function (x) { return x !== null; })) b.group = distinctCols;
    else if (c.distinct && !hasTotal) left.push('DISTINCT');

    const grouped = b.group.length > 0 || c.group !== null || hasTotal;

    if (c.group !== null) {
        c.group.forEach(function (g) {
            let col = columnOf(g);
            if (col === null && g.t === 'lit' && Number.isInteger(g.v)) {                     //  GROUP BY 1   (the 1st thing shown)
                const it = c.items[g.v - 1];
                col = it && !it.star ? columnOf(it.e) : null;
            }
            if (col === null && g.t === 'col' && g.table === null) {                          //  GROUP BY a nickname
                const it = c.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(g.name).toLowerCase(); });
                col = it ? columnOf(it.e) : null;
            }
            if (col === null) left.push('GROUP BY ' + sqlWordsFor(g));
            else if (b.group.indexOf(col) === -1) b.group.push(col);
        });
    }

    if (distinctCols === null || !distinctCols.every(function (x) { return x !== null; })) {
        c.items.forEach(function (it) {
            if (it.star) {
                if (grouped) left.push('SELECT *');
                else if (c.items.length > 1) left.push('the  *  next to other columns');
                return;
            }
            const col = columnOf(it.e);
            if (col !== null) {
                if (it.alias !== null && it.alias.toLowerCase() !== col.toLowerCase()) left.push('the nickname  ' + it.alias + '  for  ' + col);
                if (grouped) { if (b.group.indexOf(col) === -1) left.push(col + '   (it isn\'t in GROUP BY)'); }
                else if (b.show.indexOf(col) === -1) b.show.push(col);
                return;
            }
            const t = grouped ? totalOf(it.e) : null;
            if (t === null) { left.push(sqlWordsFor(it.e)); return; }
            t.name = it.alias;                                  //  (null  =  the builder names it:  count,  sum_qty ...)
            b.totals.push(t);
        });
    }

    if (c.having !== null) left.push('HAVING ' + sqlWordsFor(c.having));


    //  WHERE:  conditions joined by AND only  (or by OR only),  each one  [column] [how] [value]
    if (c.where !== null) {
        const flat = function (node, kind, out) {
            if (node.t === kind) { flat(node.a, kind, out); flat(node.b, kind, out); } else out.push(node);
            return out;
        };
        const any = c.where.t === 'or';
        let parts = flat(c.where, any ? 'or' : 'and', []);
        const oneIn = parts.length === 1 && parts[0].t === 'in' && !parts[0].not;           //  status IN ('a', 'b')   =   status is 'a'  OR  'b'
        parts.forEach(function (p) {
            const found = filtersOf(p, any || oneIn);
            if (found === null) left.push('the condition  ' + sqlWordsFor(p));
            else found.forEach(function (f) { b.filters.push(f); });
        });
        b.any = (any || oneIn) && b.filters.length > 1;
    }

    function filtersOf(p, anyMode) {
        if (p.t === 'cmp' && FLIP_OP[p.op]) {
            let col = columnOf(p.a), value = valueOf(p.b), op = p.op;
            if (col === null) { col = columnOf(p.b); value = valueOf(p.a); op = FLIP_OP[p.op]; }
            return col !== null && value !== null ? [{ col: col, op: op, value: value }] : null;
        }
        if (p.t === 'isnull') {
            const col = columnOf(p.e);
            return col !== null ? [{ col: col, op: p.not ? 'filled' : 'empty', value: '' }] : null;
        }
        if (p.t === 'isdist') {                                     //  status IS 'shipped'   (SQLite's  IS  =  "the same as")
            const col = columnOf(p.a), value = valueOf(p.b);
            if (col === null) return null;
            if (p.b.t === 'lit' && p.b.v === null) return [{ col: col, op: p.not ? 'empty' : 'filled', value: '' }];
            return value !== null ? [{ col: col, op: p.not ? '=' : '<>', value: value }] : null;
        }
        if (p.t === 'like' && !p.not) {
            const col = columnOf(p.e), pattern = valueOf(p.pat);
            const escape = p.esc === null ? null : valueOf(p.esc);
            if (col === null || pattern === null) return null;
            //  Read the pattern:  only a  %  at the start and/or the end can be shown   (contains / starts with / ends with)
            let word = '', first = false, last = false;
            for (let k = 0; k < pattern.length; k++) {
                const ch = pattern[k];
                if (escape !== null && ch === escape && k + 1 < pattern.length) { word += pattern[++k]; continue; }
                if (ch === '_') return null;
                if (ch === '%') {
                    if (k === 0) first = true;
                    else if (k === pattern.length - 1) last = true;
                    else return null;
                    continue;
                }
                word += ch;
            }
            const op = first && last ? 'contains' : last ? 'starts' : first ? 'ends' : '=';
            return [{ col: col, op: op, value: word }];
        }
        if (p.t === 'between' && !p.not && !anyMode) {
            const col = columnOf(p.e), lo = valueOf(p.lo), hi = valueOf(p.hi);
            return col !== null && lo !== null && hi !== null ? [{ col: col, op: '>=', value: lo }, { col: col, op: '<=', value: hi }] : null;
        }
        if (p.t === 'in' && !p.not && (anyMode || p.list.length === 1)) {
            const col = columnOf(p.e), values = p.list.map(valueOf);
            return col !== null && values.every(function (v) { return v !== null; })
                ? values.map(function (v) { return { col: col, op: '=', value: v }; })
                : null;
        }
        return null;
    }


    //  ORDER BY:  a column  (or,  grouped:  a group,  or a total)
    const sortable = grouped ? b.group.concat(totalNames(b)) : columns;
    const sortLower = sortable.map(function (n) { return n.toLowerCase(); });
    (q.order || []).forEach(function (o) {
        let name = null;
        let e = o.e;
        if (e.t === 'lit' && Number.isInteger(e.v)) {                              //  ORDER BY 2   (the 2nd thing shown)
            const it = c.items[e.v - 1];
            e = it && !it.star ? (it.alias ? { t: 'col', table: null, name: it.alias } : it.e) : null;
        }
        if (e !== null && e.t === 'col' && e.table === null) {
            const it = c.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(e.name).toLowerCase(); });
            if (it && !grouped) e = it.e;                                          //  a nickname for a column
        }
        if (e !== null && e.t === 'col') {
            const k = sortLower.indexOf(String(e.name).toLowerCase());
            if (k !== -1 && (e.table === null || columnOf(e) !== null || grouped)) name = sortable[k];
        } else if (e !== null && grouped) {                                        //  ORDER BY COUNT(*)   ->   that total's name
            const t = totalOf(e);
            const k = t === null ? -1 : b.totals.findIndex(function (x) { return x.fn === t.fn && x.col === t.col; });
            if (k !== -1) name = totalNames(b)[k];
        }
        if (name === null) left.push('ORDER BY ' + sqlWordsFor(o.e));
        else b.sort.push({ col: name, desc: o.desc });
        if (o.nulls !== null) left.push('NULLS ' + o.nulls.toUpperCase());
    });


    //  LIMIT   (or SQL Server's  TOP)
    const limit = q.limit !== null ? q.limit : c.top;
    if (limit !== null) {
        if (limit.t === 'lit' && Number.isInteger(limit.v) && limit.v > 0) b.limit = String(limit.v);
        else left.push('LIMIT ' + sqlWordsFor(limit));
    }
    if (q.offset !== null) left.push('OFFSET ' + sqlWordsFor(q.offset));

    return { build: b, left: left };
}

//  A piece of a question,  back in words   (for "The builder can't show:  UPPER(city)")
function sqlWordsFor(e) {
    if (e === null || e === undefined) return '';
    switch (e.t) {
        case 'lit':     return e.v === null ? 'NULL' : typeof e.v === 'string' ? sqlWordsOf(e.v) : String(e.v);
        case 'col':     return (e.table ? e.table + '.' : '') + e.name;
        case 'fn':      return e.name + '(' + (e.star ? '*' : (e.distinct ? 'DISTINCT ' : '') + e.args.map(sqlWordsFor).join(', ')) + ')' + (e.over ? ' OVER (...)' : '');
        case 'bin':     return sqlWordsFor(e.a) + ' ' + e.op + ' ' + sqlWordsFor(e.b);
        case 'cat':     return sqlWordsFor(e.a) + ' || ' + sqlWordsFor(e.b);
        case 'cmp':     return sqlWordsFor(e.a) + ' ' + e.op + ' ' + sqlWordsFor(e.b);
        case 'and':
        case 'or':      return sqlWordsFor(e.a) + ' ' + e.t.toUpperCase() + ' ' + sqlWordsFor(e.b);
        case 'not':     return 'NOT ' + sqlWordsFor(e.e);
        case 'neg':     return '-' + sqlWordsFor(e.e);
        case 'isnull':  return sqlWordsFor(e.e) + (e.not ? ' IS NOT NULL' : ' IS NULL');
        case 'like':    return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' LIKE ' + sqlWordsFor(e.pat);
        case 'in':      return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' IN (' + e.list.map(sqlWordsFor).join(', ') + ')';
        case 'between': return sqlWordsFor(e.e) + (e.not ? ' NOT' : '') + ' BETWEEN ' + sqlWordsFor(e.lo) + ' AND ' + sqlWordsFor(e.hi);
        case 'case':    return 'CASE ...';
        case 'cast':    return 'CAST(' + sqlWordsFor(e.e) + ' AS ...)';
        default:        return 'a query inside the query';
    }
}


//  ---- TYPE MODE ----

function setTypeMode(on) {
    typeMode = on;
    queryType.checked = on;
    queryBuilder.classList.toggle('paused', on);
    queryNote.textContent = on ? 'type mode  ·  the builder is greyed out' : 'written for you as you pick';
    askFirst(null);
}

//  Click in the box  (or type in it)  ->  type mode turns on.
querySql.addEventListener('pointerdown', function () { if (!typeMode) setTypeMode(true); });
querySql.addEventListener('input', function () {
    if (!typeMode) setTypeMode(true);
    showFixes([]);                                      //  (the fixes were for the SQL before you changed it)
});

//  The checkbox.   Unticked?  Not right away:  first,  does your SQL fit the builder?
queryType.addEventListener('change', function () {
    if (queryType.checked) { setTypeMode(true); querySql.focus(); return; }
    queryType.checked = true;
    leaveTypeMode();
});

//  Back to the builder:  your SQL,  snapped into its buttons.   (Query Flexibility on?  Its mistakes are fixed first.)
//  Something the buttons can't show  (a JOIN,  a CASE ...)?   ASK first:  drop it,  or keep typing.
function leaveTypeMode() {

    const typed = querySql.value;
    if (typed.trim() === '' || typed === builderSql()) { setTypeMode(false); writeSql(); return; }

    let sql = typed, fixes = [];
    if (queryFlex.checked) {
        const fixed = flexSync(typed, queryCatalog(function () { return true; }));
        sql = fixed.sql;
        fixes = fixed.fixes;
    }

    function done(newBuild) {
        build = newBuild;
        setTypeMode(false);
        drawBuilder();
        writeSql();
        showFixes(fixes);
    }

    let read;
    try {
        read = buildFromSql(sql);
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
        askFirst('The builder can\'t read this SQL:   ' + problem.message, 'Start the builder fresh', function () { done(newBuild()); });
        return;
    }

    if (read.left.length === 0) { done(read.build); return; }
    askFirst('The builder can\'t show:   ' + read.left.join(',   ') + '.', read.left.length === 1 ? 'Drop it' : 'Drop them',
             function () { done(read.build); });
}

//  The question,  under the SQL box:   "The builder can't show:  the JOIN.   [Drop it]  [Keep typing]"
//  (words  null  =  put it away)
let askYes = null;

function askFirst(words, yesWords, onYes) {
    queryAsk.hidden = words === null;
    askYes = onYes || null;
    if (words === null) return;
    queryAskWords.textContent = words;
    queryAskYes.textContent = yesWords;
    queryAskYes.focus();
}

queryAskYes.addEventListener('click', function () {
    const go = askYes;
    askFirst(null);
    if (go !== null) go();
});

queryAskNo.addEventListener('click', function () {
    askFirst(null);
    querySql.focus();                                   //  (still in type mode)
});

//  What Query Flexibility fixed,  in words,  under the box   ([]  =  nothing:  put the line away)
function showFixes(list) {
    queryFixes.hidden = list.length === 0;
    queryFixes.textContent = list.length === 0 ? '' : 'Query Flexibility fixed:   ' + list.join('   ·   ');
}

//  After a Run:  Query Flexibility changed the SQL?   Show the SQL that REALLY ran,  and say what changed.
function afterFlex(sql, fixes) {
    showFixes(fixes);
    if (fixes.length === 0) return;
    if (typeMode) { querySql.value = sql; return; }
    //  The builder's own SQL  (snap to result:  a word,  spelled the file's way):  its buttons follow along.
    try {
        const read = buildFromSql(sql);
        if (read.left.length === 0) { build = read.build; drawBuilder(); writeSql(); }
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
    }
}

//  Ctrl + Enter  (or Cmd + Enter on a Mac)  in the box  =  Run.
querySql.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runTheQuery();
    }
});

function setQueryStatus(words, bad) {
    queryStatus.textContent = words;
    queryStatus.classList.toggle('bad', bad);
}


//  ---- RUN IT ----

function runTheQuery() {

    if (fileTable === null) return;

    const text   = querySql.value;
    const myRun  = ++queryId;
    const myLoad = loadId;
    function isCurrent() { return myRun === queryId && myLoad === loadId; }

    setQueryStatus('Running...', false);
    startLoading('Running the query...');
    const started = performance.now();

    askFirst(null);
    runQuery(text, queryCatalog(isCurrent), isCurrent, function (done) {
        setProgress(0.9 * done);
        setLoadingLabel('Running the query...  ' + Math.floor(100 * done) + '%');
    }, queryFlex.checked).then(function (result) {

        if (!isCurrent()) return;
        afterFlex(result.sql, result.fixes);                //  (Query Flexibility changed it?  Show what really ran.)
        return showAnswer(result, result.sql, performance.now() - started, isCurrent);

    }).then(function () {

        if (!isCurrent()) return;
        finishLoading();

    }, function (problem) {

        if (!isCurrent() || problem === QUERY_STALE || problem === XLSX_STALE || problem === SQL_STALE) return;
        finishLoading();
        if (problem && problem.fixes && problem.fixes.length > 0) afterFlex(problem.sql, problem.fixes);    //  (how far the fixing got:  so the problem lines up)
        setQueryStatus(queryProblem(problem), true);
    });
}

queryRun.addEventListener('click', runTheQuery);


//  Turn the answer into a table  (the same kind the brain keeps for a file),  and put it on screen.
//  It's written straight into one long string,  and where each row starts is written down as it goes:
//  so it never has to be cut up again.   (In bites:  a million-row answer never freezes the page.)
//
//  Careful with memory:  a 10,000-column answer is 100 million cells.
//    -  Each line is glued with  join,  never  line += cell.   (+= keeps every little piece alive until the very end:
//       about 60 bytes a cell,  so a 500 MB answer needed 5+ GB,  and the tab crashed.   join makes ONE flat string.)
//    -  Each of the engine's rows is let go once it's written,  so the rows and the text are never both whole.
async function showAnswer(result, text, ms, isCurrent) {

    setLoadingLabel('Laying out the answer...');

    const cols    = result.columns;
    const rows    = result.rows;
    const types   = cols.map(function (c) { return c.type; });
    const looks   = cols.map(function (c) { return c.look || null; });     //  money keeps its look:   $116,450.00
    const header  = cols.map(function (c) { return c.name; });
    const longest = header.map(function (n) { return n.length; });
    const starts  = new Uint32Array(rows.length + 1);
    const nullRows = [], nullCols = [];
    const parts = [];
    const pieces = [];                                  //  each bite's lines,  glued into ONE piece at the end of that bite
    const cells = new Array(cols.length);
    let at = 0;
    let work = 0;                                       //  cells written since the clock was last checked
    let stopAt = performance.now() + CHUNK_TIME;

    for (let r = 0; r < rows.length; r++) {

        work += cols.length;
        if (((r & 1023) === 1023 || work >= BITE_CELLS) && performance.now() >= stopAt) {
            setProgress(0.9 + 0.1 * r / rows.length);
            //  (Gluing as it goes:  270,000 lines glued in ONE go at the end held the page still for ~50 ms.)
            pieces.push(parts.join(''));
            parts.length = 0;
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
        if (work >= BITE_CELLS) work = 0;

        starts[r] = at;
        const row = rows[r];
        rows[r] = null;                                 //  (written down now:  the engine's copy can go)
        for (let c = 0; c < cols.length; c++) {
            const v = row[c];
            if (v === null) { nullRows.push(r + 1); nullCols.push(c); }
            const cell = queryCellText(v, types[c], looks[c]);
            if (cell.length > longest[c]) longest[c] = cell.length;
            cells[c] = /[",\r\n]/.test(cell) ? '"' + cell.split('"').join('""') + '"' : cell;
        }
        const line = cells.join(',') + '\n';
        parts.push(line);
        at += line.length;
    }
    starts[rows.length] = at;

    //  The SQL notes,  so the TABLE LOOK can show the answer's column types and its NULLs  (like a SQL dump's table).
    const info = {
        file: null, dialect: '', sheetName: 'Result', sheetNumber: 1, sheetCount: 1, sheets: [],
        columns: cols.map(function (c) { return { name: c.name, type: queryTypeName(c.type), pk: false }; }),
        rows: rows.length,
        nullCount: nullRows.length,
        nullRows: Uint32Array.from(nullRows),
        nullCols: Uint16Array.from(nullCols),
        result: { sql: text, ms: ms, rows: rows.length, from: mainTableName(), fixes: result.fixes || [] },
    };

    pieces.push(parts.join(''));
    const table = {
        header: header, text: pieces.length === 1 ? pieces[0] : pieces.join(''), starts: starts, count: rows.length, longest: longest,
        excel: null, sql: info, name: fileTable.file.name,
        note: result.count > 1 ? '  ·  ran the last of ' + result.count + ' queries' : '',
    };

    if (!showingAnswer()) fileLook = excelLook;         //  (remember the file's look,  for "← Back to file")
    swapIn(table, true);
    answer = { table: table };
    queryExport.disabled = false;
    setQueryStatus(rows.length.toLocaleString() + ' row' + (rows.length === 1 ? '' : 's') + '  ·  ' + formatTime(ms), false);
    closeQueryMenu();                                   //  out of the way,  so you can see the answer
}


//  ← BACK TO FILE:  the file was only put aside.   Put it back.
function backToFile() {
    if (fileTable === null || !showingAnswer()) return;
    queryId++;                                          //  (a query still running?  It stops.)
    swapIn(fileTable.table, fileLook);
    answer = null;                                      //  let the answer go  (a big one is as big as a file)
    queryExport.disabled = true;
    setQueryStatus('', false);
}

backBtn.addEventListener('click', backToFile);


//  COPY SQL   (the browser's clipboard.   An older browser?  The old way:  select it,  and "copy".)
queryCopy.addEventListener('click', function () {
    const done = function () { setQueryStatus('SQL copied', false); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(querySql.value).then(done, copyTheOldWay);
    } else copyTheOldWay();

    function copyTheOldWay() {
        querySql.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { setQueryStatus('Couldn\'t copy:  select the SQL and press Ctrl + C', true); }
    }
});


//  EXPORT CSV:  the answer,  saved as a CSV file  ("sales-query.csv").
queryExport.addEventListener('click', function () {
    if (answer === null) return;
    const head = answer.table.header.map(function (n) { return /[",\r\n]/.test(n) ? '"' + n.split('"').join('""') + '"' : n; }).join(',');
    const blob = new Blob([head + '\n' + answer.table.text], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileTable.file.name.replace(/\.[^.]*$/, '') + '-query.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
});


//  ---- UNFOLD  /  FOLD UP   (out of the Query button,  like the theme menu out of its chip) ----

function queryMenuOpen() {
    return !queryMenu.classList.contains('closed') && !queryMenu.classList.contains('folded');
}

//  How small is "folded"?  Exactly the button's size.
function measureQueryFold() {
    queryMenu.style.setProperty('--fold-x', queryBtn.offsetWidth  / Math.max(queryMenu.offsetWidth, 1));
    queryMenu.style.setProperty('--fold-y', queryBtn.offsetHeight / Math.max(queryMenu.offsetHeight, 1));
}

function openQueryMenu() {
    if (fileTable === null) return;
    showRow(false);                                     //  (the Details panel lives in the same spot)
    clearTimeout(queryFold);
    if (queryMenu.classList.contains('closed')) {
        measureQueryFold();
        queryMenu.classList.remove('closed');
        void queryMenu.offsetWidth;                     //  (make the browser notice that first)
    }
    queryMenu.classList.remove('folded');
    queryBtn.setAttribute('aria-expanded', 'true');
}

function closeQueryMenu() {
    if (!queryMenuOpen()) return;
    measureQueryFold();
    queryMenu.classList.add('folded');
    queryBtn.setAttribute('aria-expanded', 'false');
    clearTimeout(queryFold);
    queryFold = setTimeout(function () { queryMenu.classList.add('closed'); }, 480);
}

queryBtn.addEventListener('click', function () {
    if (queryMenuOpen()) closeQueryMenu(); else openQueryMenu();
});

queryClose.addEventListener('click', function () {
    closeQueryMenu();
    queryBtn.focus();
});

//  Click somewhere that's NOT the menu or its button  ->  fold up.
//  (Not while the loader is up:  a query is running,  and its answer will close it anyway.)
document.addEventListener('click', function (event) {
    //  (The click's PATH,  as it was when it started:  the  ×  you click is gone by now  (the builder was redrawn),
    //   but it WAS inside the menu.)
    const path = event.composedPath();
    if (queryMenuOpen() && path.indexOf(queryMenu) === -1 && path.indexOf(queryBtn) === -1 && loader.hidden) {
        closeQueryMenu();
    }
});

//  Escape  ->  fold up.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && queryMenuOpen()) {
        closeQueryMenu();
        queryBtn.focus();
    }
});
