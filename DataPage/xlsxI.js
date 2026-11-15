/*
    ==========================================================

        THE NANDO NOTES  -  xlsxI.js

        This file READS EXCEL FILES  (.xlsx).
        It's a translator:  it turns the first sheet into the same
        kind of text a CSV file has, and hands it to the brain
        (flogicI.js),  which does everything else  (storage, search, scrolling).

            flogic.html   =  what's there     (skeleton)
            flogicI.css   =  how it looks     (clothes)
            flogicI.js   =  what it does     (brain)
            xlsxI.js     =  reads Excel files  (the translator)

    ==========================================================


    AN .XLSX FILE IS REALLY A ZIP FILE,  full of text files:

        xl/workbook.xml          the sheet names  (and which CALENDAR the dates use)
        xl/worksheets/....xml    the cells:   <c r="B3" s="2"><v>43586</v></c>
        xl/sharedStrings.xml     every word, stored ONCE:   word #4  =  "Chicago"
        xl/styles.xml            how numbers LOOK  (which ones are dates)


    THE STEPS:

        1.   Unzip.                            (with a guard against "zip bombs")
        2.   Read the words, the styles, the sheet.
        3.   Turn every cell into text.        (dates the CAREFUL way:  see "DATES")
        4.   Glue it all into CSV text.        ->  the brain takes it from there.


    SAFETY  (the file came from outside, so it's treated like a stranger):

        -  Unzipping stops at XLSX_LIMIT.  A tiny file can't unzip into a giant one.
        -  The XML is read with plain text searching  (indexOf),  NOT the browser's XML reader.
           So tricky XML  ("billion laughs" and friends)  has nothing to grab onto.
           Only the 5 standard codes  (&amp;  &lt;  &gt;  &quot;  &apos;)  and letter numbers get turned into letters.
        -  Cell addresses outside Excel's own limits are skipped.
        -  Every cell goes on the page as plain text  (the brain already does that).


    NOTHING IS LOST:

        The page SHOWS a simple version of each cell  (dates as 2019-05-01).
        But for every cell that looks different from what Excel stored,
        the ORIGINAL is kept  (xlsxInfo.cells):  the raw value, the format, the formula.
        So a future "save back to Excel" can put back exactly what was there.

*/



// ----------------------------------------------------------
//
//    SETTINGS
//
// ----------------------------------------------------------

const XLSX_LIMIT = 512 * 1024 * 1024;    //  the most we'll unzip, in total  (bytes).  More than this?  Stop.
                                         //  (Same as the biggest CSV the browser can read anyway.)

const EXCEL_MAX_ROWS = 1048576;          //  Excel's own limits.  An address past these is junk.
const EXCEL_MAX_COLS = 16384;            //  (column XFD)



// ----------------------------------------------------------
//
//    DATES   (the careful way)
//
//    Excel doesn't store dates.  It stores NUMBERS:
//    how many days since its "day zero".   43586  =  2019-05-01.
//    A fraction is the time of day:          0.5  =  noon.
//
//    3 traps, and how we avoid them:
//
//    1.  THE DAY THAT NEVER WAS.
//        Excel thinks February 29, 1900 existed.  It didn't  (1900 wasn't a leap year).
//        It's a famous bug, kept on purpose so old Lotus 1-2-3 files still work.
//        So:  number 60 is the fake day,  and every number BELOW 60 is one day off.
//
//    2.  TWO CALENDARS.
//        Some files  (old Mac Excel)  count from 1904 instead.  Same number, 4 years apart!
//        The file says which  (date1904),  and we use the right one.
//
//    3.  TIME ZONES.
//        JavaScript's own Date quietly shifts dates by your time zone and daylight saving.
//        A date can come out one day early.  So we DON'T use Date at all:
//        just whole-number math.  Same answer on every computer, in every time zone.
//
//    And it works BOTH ways  (number -> date,  date -> number),
//    tested on every Excel date there is:  1 to 2,958,465  (9999-12-31),  in both calendars.
//
// ----------------------------------------------------------

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



// ----------------------------------------------------------
//
//    NUMBERS   (shown like Excel's "General")
//
//    Excel stores numbers with about 17 digits, but SHOWS at most 15:
//
//        stored:  522.83000000000004     shown:  522.83
//        stored:  548.97149999999999     shown:  548.9715
//
//    (Those extra digits come from how computers store decimals.  They aren't "real".)
//    So the page shows 15 digits, like Excel.  The stored number is kept  (xlsxInfo.cells).
//
// ----------------------------------------------------------

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



// ----------------------------------------------------------
//
//    WHICH CELLS ARE DATES?
//
//    The number alone can't say:  43586 could be a date, or 43,586 cases of beer.
//    Only the cell's STYLE knows.  Each style points to a number format:
//
//      -  a built-in one, by number   (14 = a date,  20 = a time ...)
//      -  or a custom one, written out:   "yyyy\-mm\-dd\ hh:mm:ss"
//
//    For a custom one, look for date letters  (y, d, m  =  date.   h, s  =  time),
//    but first throw away the parts that are NOT letters of the format:
//
//      "Qty: "0      <-  words in quotes  ("Qty:"  has no date in it!)
//      \-            <-  a backslash means "just this character"
//      [Red]         <-  colors and other notes in brackets  (except [h] [m] [s]:  "keep counting past 24 hours")
//      AM/PM         <-  the m in it isn't "month"
//
// ----------------------------------------------------------

//  Built-in format numbers that show a date or time.   [kind, shows seconds?]
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



// ----------------------------------------------------------
//
//    READING THE XML   (plain text searching, on purpose)
//
// ----------------------------------------------------------

//  One attribute out of a tag:    attr('<c r="B3" s="2">', 's')   ->   "2"
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



// ----------------------------------------------------------
//
//    UNZIPPING
//
//    A zip file keeps its "table of contents"  (the central directory)  at the END.
//    It says, for every file inside:  its name,  where it starts,  how big it is packed and unpacked,
//    and how it's packed  (0 = not packed at all,  8 = "deflate",  the normal way).
//
//    The browser can un-deflate by itself  (DecompressionStream).
//    We just have to find the pieces, and COUNT as it unpacks:
//    past XLSX_LIMIT?  Stop.  (A "zip bomb" is a tiny file that unpacks into a giant one.)
//
// ----------------------------------------------------------

//  The table of contents:   name  ->  { flags, method, packed, size, local }
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



// ----------------------------------------------------------
//
//    FINDING THE PARTS
//
//    The parts point to each other with "relationships"  (.rels files):
//
//        _rels/.rels                   ->  "the workbook is at  xl/workbook.xml"
//        xl/_rels/workbook.xml.rels    ->  "sheet rId1 is at  worksheets/sheet1.xml"
//                                          "the shared words are at  sharedStrings.xml" ...
//
//    (Never just guess "sheet1.xml".  The first sheet isn't always called that.)
//
// ----------------------------------------------------------

//  Every relationship in a .rels file:   [{ id, type, target }]
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



// ----------------------------------------------------------
//
//    THE OPEN FILE'S EXCEL NOTES
//
//    null  =  the open file is a CSV.
//    Otherwise  (set by the brain when the file is swapped in):
//
//      { file,        the original file itself  (not a copy:  for saving back someday)
//        sheetName,   which sheet is showing     ("Sheet1")
//        sheetNumber, which one it is, counting from 1
//        sheetCount,  how many sheets the file has
//        sheets,      all of them:  [{ name, hidden, chart }]   (for the sheet tabs)
//        date1904,    does it use the 1904 calendar?
//        hasDates,    did any cell get shown as a date?
//        recalc,      does the file ask Excel to recalculate when it opens?  (then formula answers may be out of date)
//        unsolved,    how many formulas had NO saved answer  (they show as their formula)
//        cells }      the ORIGINALS:  for every cell that's shown differently than Excel stored it,
//                     (row * 16384 + column)  ->  { raw, type, format, formula, group }
//                     ("group" = a copied-down formula's group number,  for saving back the same way)
//
// ----------------------------------------------------------

let xlsxInfo = null;

const XLSX_STALE = new Error('stale');      //  "a newer file was picked:  forget this one"  (not a real problem)



// ----------------------------------------------------------
//
//    READ AN EXCEL FILE
//
//    readXlsx(file, isCurrent, choice)   ->   a "promise" of  { text, info }
//        text  =  the sheet, as CSV text
//        info  =  the Excel notes  (see above)
//
//    choice       =  which sheet to show  (0 = the first one).   null  =  the first real sheet that isn't hidden.
//    isCurrent()  says if this file is still the one you want.  (Picked a newer one?  Stop.)
//    Something wrong?  The promise fails with a short reason:  'damaged', 'locked', 'bomb' ...
//    (The brain turns that into words for you:  see xlsxProblem below.)
//
// ----------------------------------------------------------

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



// ----------------------------------------------------------
//
//    WHAT WENT WRONG?   (in words)
//
// ----------------------------------------------------------

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
