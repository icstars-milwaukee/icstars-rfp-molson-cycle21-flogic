// ----------------------------------------------------------
//
//    THE THIRD TRANSLATOR:   SQLite databases   (.db,  .sqlite,  .sqlite3 ...   or no ending at all,  like Chrome's "History")
//
//    A SQLite database is ONE file holding a whole database:  every table,  its columns and types,  every row.
//    It isn't text.   It's PAGES  (4 KB pieces,  usually)  that point at each other like a family tree:
//
//        page 1      the file's notes  (100 bytes),  then the top of the list of tables  ("sqlite_schema")
//        a table     a tree of pages:  its top page points at pages below it ...  down to the bottom ones,
//                    which hold the rows.   (A row too big for its page goes on in "overflow" pages.)
//
//    This reads ONE table  (the one you pick)  and turns it into CSV text,  plus the same notes a SQL dump gets
//    (the column types,  the primary key,  which cells are NULL).   So the brain shows it like a SQL dump:  the
//    table look,  the tabs,  the query engine ...  everything.
//
//    It only READS.   Nothing is ever written,  and nothing in the file is ever run.
//    It reads only the PAGES it needs  (file.slice):  a big database never has to fit in memory.  Only the table does.
//    And it doesn't trust the file:  every page number and every length is checked,  and every page is read at most
//    once per table,  so a broken  (or hostile)  file can't freeze or crash the page.   The worst it gets is "damaged".
//
//    A busy database  (an app that's open,  like Firefox)  often keeps its newest changes in a 2nd file next to it:
//    "places.sqlite-wal",  "notes.db-wal"  (SQLite's "write-ahead log").   Pick both together,  and the newest pages are
//    read from there  (see THE -WAL FILE).
//
// ----------------------------------------------------------

const DB_STALE   = new Error('stale');          //  "a newer file was picked:  forget this one"  (not a real problem)
const DB_DAMAGED = new Error('damaged');
const DB_CHUNK   = 4 * 1024 * 1024;             //  the file is read 4 MB at a time  (a multiple of every page size:  a page is never split)
const DB_KEEP    = 64;                          //  ...and the last 64 pieces it read are kept  (256 MB at most)
const DB_DEPTH   = 20;                          //  a table's tree is never deeper than this  (SQLite's own limit)
const DB_MAX_TEXT = 450 * 1000 * 1000;          //  the CSV text of one table:  at most this long  (a string can't be much longer)
const DB_HEX_UP_TO = 32;                        //  a BLOB up to this many bytes shows as hex  (0x0A1B...);  bigger:  [BLOB  48 KB  PNG image]

//  The first 16 bytes of every SQLite 3 database:   SQLite format 3  and a "nothing" byte.
function dbIsSqlite(b) {
    const magic = 'SQLite format 3';
    for (let k = 0; k < 15; k++) if (b[k] !== magic.charCodeAt(k)) return false;
    return b[15] === 0;
}



// ----------------------------------------------------------
//
//    READ A DATABASE
//
//    readDb(file, isCurrent, choice, wal)   ->   a "promise" of  { text, info }   (like readSql)
//        text  =  the table,  as CSV text
//        info  =  the SQL notes  (see sqlI.js),  with  format: 'db'   (and its -wal file's:  see the end)
//
//    choice       =  which table to show  (0 = the first one).   null  =  the first one that HAS rows.
//    isCurrent()  says if this file is still the one you want.  (Picked a newer one?  Stop.)
//    wal          =  its -wal file,  if you picked that too.   (null:  none)
//
// ----------------------------------------------------------

async function readDb(file, isCurrent, choice, wal) {

    const size = file.size;

    //  Big jobs are done in BITES  (like everything else),  so the page never freezes.
    let stopAt = performance.now() + CHUNK_TIME;
    let rowsDone = 0;
    async function breathe() {
        if (performance.now() < stopAt) return;
        setLoadingLabel('Reading the database...  ' + dbCommas(rowsDone) + ' rows');
        await new Promise(function (go) { nextBite(go); });
        if (!isCurrent()) throw DB_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }


    //  ---- THE FILE'S NOTES:  its first 100 bytes ----
    if (size === 0) throw new Error('notables');                   //  (an empty file IS an empty database,  to SQLite)
    const first = new Uint8Array(await file.slice(0, 100).arrayBuffer());
    if (first.length < 100 || !dbIsSqlite(first)) throw new Error('notsqlite');
    let pageSize = (first[16] << 8) | first[17];
    if (pageSize === 1) pageSize = 65536;
    if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0) throw DB_DAMAGED;
    const word = function (b, at) { return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0; };
    let pageCount = Math.floor(size / pageSize);                   //  (the file's own size is the truth:  a page past it isn't there)


    //  ---- ITS -WAL FILE  (if you picked it too):  which pages have newer bytes in there ----
    let walPages = null, walNote = '';
    if (wal) {
        const w = await readWal(wal, pageSize, isCurrent);
        if (w.pages !== null) { walPages = w.pages; pageCount = w.size; }       //  (the database's size:  the newest save's)
        walNote = w.note;
    } else if (first[19] === 2) walNote = 'missing';               //  a database that USES a -wal file,  picked alone
    const frameSize = 24 + pageSize;
    const framesPerChunk = Math.floor(DB_CHUNK / frameSize);
    const most = size + (walPages !== null ? wal.size : 0);         //  (no value can be longer than both files)


    //  ---- THE PAGES:  read 4 MB at a time,  the recent ones kept ----
    //  A page that has newer bytes in the -wal file  (frame f)  is read from there.
    const chunks = new Map();
    async function page(no) {
        if (!(no >= 1 && no <= pageCount)) throw DB_DAMAGED;
        const f = walPages === null ? undefined : walPages.get(no);
        let c, source, from, to, at;
        if (f === undefined) {
            const offset = (no - 1) * pageSize;
            c = Math.floor(offset / DB_CHUNK);
            source = file;  from = c * DB_CHUNK;  to = Math.min(size, from + DB_CHUNK);
            at = offset - from;
        } else {
            const k = Math.floor(f / framesPerChunk);
            c = -1 - k;                                            //  (the -wal file's pieces:  -1, -2, -3 ...)
            source = wal;  from = 32 + k * framesPerChunk * frameSize;  to = Math.min(wal.size, from + framesPerChunk * frameSize);
            at = (f - k * framesPerChunk) * frameSize + 24;
        }
        let chunk = chunks.get(c);
        if (chunk === undefined) {
            chunk = new Uint8Array(await source.slice(from, to).arrayBuffer());
            if (!isCurrent()) throw DB_STALE;
            if (chunks.size >= DB_KEEP) chunks.delete(chunks.keys().next().value);
        } else chunks.delete(c);
        chunks.set(c, chunk);                                      //  (the one used last goes to the back:  the oldest goes first)
        if (at + pageSize > chunk.length) throw DB_DAMAGED;
        return chunk.subarray(at, at + pageSize);
    }

    //  "Which pages has this table used?"   One byte a page  (a database too big for that,  which only a broken
    //  -wal file can claim to be:  a list that only takes room for the pages really used).
    function newSeen() { return pageCount <= 67108864 ? new Uint8Array(pageCount + 1) : []; }


    //  ---- THE NOTES THAT COUNT:  the NEWEST page 1's  (the -wal file's,  if it has a newer one) ----
    const head = await page(1);
    if (!dbIsSqlite(head) || head[16] !== first[16] || head[17] !== first[17]) throw DB_DAMAGED;
    if (head[19] > 2) throw new Error('newer');                    //  (a file format from a newer SQLite:  it says so itself)
    const usable = pageSize - head[20];                            //  (each page can keep some bytes for itself at its end)
    if (usable < 480) throw DB_DAMAGED;
    if (head[21] !== 64 || head[22] !== 32 || head[23] !== 32) throw DB_DAMAGED;
    const schemaFormat = word(head, 44);
    if (schemaFormat > 4) throw DB_DAMAGED;
    const encoding = word(head, 56);                               //  1  UTF-8,   2  UTF-16 little end first,   3  big end first
    const decoder = new TextDecoder(encoding === 2 ? 'utf-16le' : encoding === 3 ? 'utf-16be' : 'utf-8');
    const utf8 = encoding !== 2 && encoding !== 3;

    //  How much of a cell is ON its page  (the rest goes to overflow pages)   (SQLite's numbers,  exactly)
    const tableX = usable - 35;
    const indexX = Math.floor((usable - 12) * 64 / 255) - 23;
    const minLocal = Math.floor((usable - 12) * 32 / 255) - 23;


    //  ---- READING INSIDE A PAGE ----

    //  A "varint":  a whole number in 1 to 9 bytes   (7 bits a byte,  the top bit says "more";  the 9th byte:  all 8 bits).
    //  Gives back the number  (a BigInt past the safe limit,  see queryI.js),  and leaves  vEnd  just after it.
    let vEnd = 0;
    function varint(b, at, end) {
        let v = 0;
        for (let k = 0; k < 7; k++) {
            if (at >= end) throw DB_DAMAGED;
            const x = b[at++];
            v = v * 128 + (x & 127);
            if (x < 128) { vEnd = at; return v; }
        }
        let big = BigInt(v);                                       //  past 49 bits:  exact,  as a BigInt
        if (at >= end) throw DB_DAMAGED;
        const x = b[at++];
        big = big * 128n + BigInt(x & 127);
        if (x >= 128) {
            if (at >= end) throw DB_DAMAGED;
            big = big * 256n + BigInt(b[at++]);
        }
        vEnd = at;
        if (big >= 9223372036854775808n) big -= 18446744073709551616n;      //  64 bits,  "two's complement"  (a rowid can be below 0)
        return exactInt(big);
    }

    //  A cell's whole payload  (its first part is on the page;  the rest,  if any,  in a chain of overflow pages)
    //  X  =  how much fits on the page for this kind of cell.   seen  =  the pages this table already used.
    async function payload(b, at, P, X, seen) {
        if (typeof P !== 'number' || P > most || P > 1e9) throw DB_DAMAGED;      //  (no value can be longer than the files)
        let local = P;
        if (P > X) {
            const K = minLocal + (P - minLocal) % (usable - 4);
            local = K <= X ? K : minLocal;
        }
        if (at + local > usable) throw DB_DAMAGED;
        if (local === P) return b.subarray(at, at + P);
        if (at + local + 4 > usable) throw DB_DAMAGED;
        const out = new Uint8Array(P);
        out.set(b.subarray(at, at + local));
        let filled = local;
        let next = word(b, at + local);
        while (filled < P) {
            if (next === 0 || next > pageCount || seen[next] === 1) throw DB_DAMAGED;
            seen[next] = 1;
            const o = await page(next);
            const take = Math.min(usable - 4, P - filled);
            out.set(o.subarray(4, 4 + take), filled);
            filled += take;
            next = word(o, 0);
        }
        return out;
    }

    //  A RECORD  (one row's values):  first how long its notes are,  then each value's "serial type",  then the values.
    //      0  NULL      1 2 3 4 5 6  a whole number in 1, 2, 3, 4, 6, 8 bytes      7  a REAL  (8 bytes)      8  0      9  1
    //      12, 14, 16 ...  a BLOB of  (N - 12) / 2  bytes            13, 15, 17 ...  TEXT of  (N - 13) / 2  bytes
    //  The values go in 2 lists that are used again for every row  (no new lists for a million rows):
    //  kinds  ('n' null,  'i' whole,  'r' REAL,  't' text,  'b' BLOB)  and  values.
    const kinds = [], values = [];
    let view = null, viewOf = null;
    function record(b) {
        const end = b.length;
        const headerSize = varint(b, 0, end);
        if (typeof headerSize !== 'number' || headerSize < 1 || headerSize > end) throw DB_DAMAGED;
        let at = vEnd, p = headerSize, count = 0;
        while (at < headerSize) {
            const t = varint(b, at, headerSize);
            at = vEnd;
            if (typeof t !== 'number') throw DB_DAMAGED;
            let kind, v = null, len;
            switch (t) {
                case 0: kind = 'n'; len = 0; break;
                case 1: kind = 'i'; len = 1; if (p + 1 <= end) v = (b[p] << 24) >> 24; break;
                case 2: kind = 'i'; len = 2; if (p + 2 <= end) v = ((b[p] << 24) >> 16) | b[p + 1]; break;
                case 3: kind = 'i'; len = 3; if (p + 3 <= end) v = ((b[p] << 24) >> 8) | (b[p + 1] << 8) | b[p + 2]; break;
                case 4: kind = 'i'; len = 4; if (p + 4 <= end) v = (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]; break;
                case 5: kind = 'i'; len = 6; if (p + 6 <= end) v = (((b[p] << 24) >> 16) | b[p + 1]) * 4294967296 + word(b, p + 2); break;
                case 6: {
                    kind = 'i'; len = 8;
                    if (p + 8 <= end) {
                        const hi = (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3], lo = word(b, p + 4);
                        v = hi >= -2097152 && hi < 2097152 ? hi * 4294967296 + lo : exactInt((BigInt(hi) << 32n) + BigInt(lo));
                    }
                    break;
                }
                case 7:
                    kind = 'r'; len = 8;
                    if (p + 8 <= end) {
                        if (viewOf !== b.buffer) { view = new DataView(b.buffer); viewOf = b.buffer; }
                        v = view.getFloat64(b.byteOffset + p, false);
                        if (v !== v) kind = 'n';                       //  NaN:  SQLite reads it as NULL
                    }
                    break;
                case 8: kind = 'i'; len = 0; v = 0; break;
                case 9: kind = 'i'; len = 0; v = 1; break;
                case 10: case 11: throw DB_DAMAGED;                    //  (never in a good file)
                default:
                    len = (t - (t & 1 ? 13 : 12)) / 2;
                    kind = t & 1 ? 't' : 'b';
                    if (p + len <= end) v = kind === 't' ? text(b, p, len) : b.subarray(p, p + len);
            }
            if (p + len > end) throw DB_DAMAGED;
            p += len;
            kinds[count] = kind;
            values[count] = v;
            count++;
        }
        return count;
    }

    //  TEXT in the database's own letters.   (Plain short ASCII,  the usual,  is quicker by hand.)
    function text(b, at, len) {
        if (utf8 && len <= 64) {
            let s = '';
            for (let k = 0; k < len; k++) {
                const c = b[at + k];
                if (c >= 128) return decoder.decode(b.subarray(at, at + len));
                s += String.fromCharCode(c);
            }
            return s;
        }
        return decoder.decode(b.subarray(at, at + len));
    }


    //  ---- WALKING A TREE ----

    //  The cells of one tree page:  where each one starts.   (h = where the page's own notes start:  100 on page 1)
    function cellsOf(b, h, interior) {
        const count = (b[h + 3] << 8) | b[h + 4];
        const first = h + (interior ? 12 : 8);
        if (first + 2 * count > usable) throw DB_DAMAGED;
        const spots = new Array(count);
        for (let k = 0; k < count; k++) {
            const at = (b[first + 2 * k] << 8) | b[first + 2 * k + 1];
            if (at < first + 2 * count || at >= usable) throw DB_DAMAGED;
            spots[k] = at;
        }
        return spots;
    }

    //  Every row of a rowid table,  in order:   each(rowid, payload).
    //  (Only the bottom pages,  the "leaves"  (13),  hold rows.   The ones above  (5)  just say which way to go.)
    async function walkTable(root, each) {
        const seen = newSeen();
        async function visit(no, depth) {
            if (depth > DB_DEPTH || !(no >= 1 && no <= pageCount) || seen[no] === 1) throw DB_DAMAGED;
            seen[no] = 1;
            const b = await page(no);
            const h = no === 1 ? 100 : 0;
            const type = b[h];
            if (type !== 13 && type !== 5) throw DB_DAMAGED;
            const spots = cellsOf(b, h, type === 5);
            for (let k = 0; k < spots.length; k++) {
                if (type === 13) {
                    const P = varint(b, spots[k], usable);
                    const rowid = varint(b, vEnd, usable);
                    each(rowid, await payload(b, vEnd, P, tableX, seen));
                    rowsDone++;
                    if ((rowsDone & 63) === 0) await breathe();
                } else {
                    if (spots[k] + 4 > usable) throw DB_DAMAGED;
                    await visit(word(b, spots[k]), depth + 1);
                }
            }
            if (type === 5) await visit(word(b, h + 8), depth + 1);
        }
        await visit(root, 0);
    }

    //  Every row of a WITHOUT ROWID table  (an "index" tree:  10 = a bottom page,  2 = a page above),  in order:
    //  each(payload).   Here the pages ABOVE hold rows too:  each one sits between the rows of 2 of its pages below.
    async function walkIndex(root, each) {
        const seen = newSeen();
        async function visit(no, depth) {
            if (depth > DB_DEPTH || !(no >= 1 && no <= pageCount) || seen[no] === 1) throw DB_DAMAGED;
            seen[no] = 1;
            const b = await page(no);
            const h = no === 1 ? 100 : 0;
            const type = b[h];
            if (type !== 10 && type !== 2) throw DB_DAMAGED;
            const spots = cellsOf(b, h, type === 2);
            for (let k = 0; k < spots.length; k++) {
                let at = spots[k];
                if (type === 2) {
                    if (at + 4 > usable) throw DB_DAMAGED;
                    await visit(word(b, at), depth + 1);
                    at += 4;
                }
                const P = varint(b, at, usable);
                each(await payload(b, vEnd, P, indexX, seen));
                rowsDone++;
                if ((rowsDone & 63) === 0) await breathe();
            }
            if (type === 2) await visit(word(b, h + 8), depth + 1);
        }
        await visit(root, 0);
    }

    //  Does a table have rows?   (Its top page alone says:  a bottom page with no cells is an empty table.)
    async function hasRows(root) {
        const b = await page(root);
        const h = root === 1 ? 100 : 0;
        return !((b[h] === 13 || b[h] === 10) && ((b[h + 3] << 8) | b[h + 4]) === 0);
    }


    //  ---- THE LIST OF TABLES  (sqlite_schema,  on page 1):   type,  name,  tbl_name,  rootpage,  sql ----
    const tables = [];
    await walkTable(1, function (rowid, b) {
        const n = record(b);
        if (n < 5 || kinds[0] !== 't' || kinds[1] !== 't') return;
        if (values[0] !== 'table' || kinds[3] !== 'i' || typeof values[3] !== 'number' || values[3] < 1) return;     //  (an index,  a view,  a virtual table:  not rows of their own)
        const name = values[1];
        if (/^sqlite_/i.test(name)) return;                                         //  SQLite's own notes  (sqlite_sequence ...)
        tables.push({ name: name, root: values[3], sql: kinds[4] === 't' ? values[4] : '' });
    });
    if (tables.length === 0) throw Object.assign(new Error('notables'), { walMissing: walNote === 'missing' });     //  (all in a -wal file?)
    //  (A table whose top page is broken doesn't stop the others:  it just can't be opened itself,  like in SQLite.)
    for (const t of tables) {
        try { t.hasData = await hasRows(t.root); }
        catch (problem) { if (problem === DB_STALE) throw problem; t.hasData = false; t.damaged = true; }
    }

    let chosen = choice !== null && choice >= 0 && choice < tables.length ? tables[choice] : null;
    if (chosen === null) chosen = tables.find(function (t) { return t.hasData; }) || tables[0];
    if (chosen.damaged) throw DB_DAMAGED;
    const shape = dbShape(chosen.sql);
    const columns = shape.columns;
    const width = columns.length;


    //  ---- ITS ROWS:  CSV lines,  and the NULLs ----
    //  Which value of a record goes in which column?   A rowid table:  the columns in order  (but a "virtual"
    //  generated column isn't stored at all).   WITHOUT ROWID:  the primary key's columns first,  then the rest.
    const stored = [];                                             //  stored[f]  =  the column for the record's value f
    if (shape.withoutRowid) shape.pkOrder.forEach(function (j) { stored.push(j); });
    columns.forEach(function (c, j) { if (!c.virtual && !(shape.withoutRowid && shape.pkOrder.indexOf(j) !== -1)) stored.push(j); });
    const alias = shape.withoutRowid ? -1 : columns.findIndex(function (c) { return c.rowid; });     //  INTEGER PRIMARY KEY:  the rowid itself

    //  The CSV text is glued bite by bite:  every ~1 MB of lines becomes one piece.   At the end the pieces are glued with
    //  + :  that's quick  (the browser only notes "these, one after another"),  and the one real copy happens the first
    //  time the text is read  (~100 ms for a million rows:  like opening the same rows as a CSV).   Measured in the browser
    //  (tests/joinbench.js):  ONE join of a million lines held the page still for 300 to 650 ms,  bytes + blob.text() 250.
    const NL = String.fromCharCode(10);
    const pieces = [];
    let waiting = [], waitingSize = 0, rowCount = 0;
    function glue() {
        if (waiting.length === 0) return;
        pieces.push(NL + waiting.join(NL));
        waiting = [];
        waitingSize = 0;
    }
    let textSize = 0;
    let nullRows  = new Uint32Array(1024);
    let nullCols  = new Uint16Array(1024);
    let nullCount = 0;
    function markNull(row, col) {
        if (nullCount === nullRows.length) {
            const r = new Uint32Array(nullRows.length * 2); r.set(nullRows); nullRows = r;
            const c = new Uint16Array(nullCols.length * 2); c.set(nullCols); nullCols = c;
        }
        nullRows[nullCount] = row;
        nullCols[nullCount] = col;
        nullCount++;
    }

    const cells = new Array(width);
    function addRow(rowid, b) {
        const n = record(b);
        const num = rowCount + 1;
        for (let j = 0; j < width; j++) cells[j] = null;
        for (let f = 0; f < n && f < stored.length; f++) {
            const j = stored[f];
            //  A REAL column keeps a whole REAL  (2.0)  as a whole number on disk,  to save room:  it's a REAL again here.
            cells[j] = kinds[f] === 'i' && columns[j].affinity === 'real' ? numberText(Number(values[f]), true) : dbCellText(kinds[f], values[f]);
        }
        //  A row from before  ALTER TABLE ... ADD COLUMN  has fewer values:  the rest get the column's DEFAULT.
        for (let f = n; f < stored.length; f++) cells[stored[f]] = columns[stored[f]].dflt;
        if (alias !== -1 && cells[alias] === null) cells[alias] = String(rowid);
        for (let j = 0; j < width; j++) {
            if (cells[j] === null) { markNull(num, j); cells[j] = ''; }
            else cells[j] = sqlCell(cells[j]);
        }
        const line = cells.join(',');                              //  (one flat join:  see the crash fix in Part 10)
        textSize += line.length + 1;
        if (textSize > DB_MAX_TEXT) throw new Error('toobig');
        waiting.push(line);
        waitingSize += line.length;
        rowCount++;
        if (waitingSize >= 1048576) glue();
    }

    if (shape.withoutRowid) await walkIndex(chosen.root, function (b) { addRow(null, b); });
    else await walkTable(chosen.root, addRow);
    glue();


    //  The CSV text:   the column names on top,  then every row.
    const header = columns.map(function (column) { return sqlCell(column.name); }).join(',');
    let csvText = header;
    for (let k = 0; k < pieces.length; k++) csvText += pieces[k];

    return {
        text: csvText,
        info: {
            file:        file,
            format:      'db',
            dialect:     'SQLite',
            sheetName:   chosen.name,
            sheetNumber: tables.indexOf(chosen) + 1,
            sheetCount:  tables.length,
            sheets:      tables.map(function (t) { return { name: t.name, hidden: false, chart: false, empty: !t.hasData }; }),
            columns:     columns.map(function (c) { return { name: c.name, type: c.type, pk: c.pk }; }),
            rows:        rowCount,
            nullCount:   nullCount,
            nullRows:    nullRows.subarray(0, nullCount),
            nullCols:    nullCols.subarray(0, nullCount),
            wal:         wal || null,                              //  (so its other tables are read with it too)
            walNote:     walNote
        }
    };
}


// ----------------------------------------------------------
//
//    THE -WAL FILE   (SQLite's "write-ahead log":  a busy database's newest changes,  not copied into it yet)
//
//    32 bytes of notes,  then "frames":  24 bytes of notes + ONE page each  (that page's new bytes).
//        the notes:   magic  (377F0682 or 377F0683)   version   page size   checkpoint   salt 1   salt 2   checksum 1, 2
//        a frame:     its page   the database's size in pages  (only on the LAST frame of a save:  a "commit")
//                     salt 1   salt 2   checksum 1, 2
//
//    A frame only counts if its salts are the notes' AND its checksum is right.   Each checksum carries on from the one
//    before,  so after one wrong byte nothing counts.   (A -wal file that was started over has the old frames after the
//    new ones:  their salts are old,  so they stop it there.)   And only frames up to the LAST commit:  a save that was
//    still being written when the files were copied is left out.   Those are SQLite's own rules when it opens one.
//
//    readWal(wal, pageSize, isCurrent)   ->   { pages,  size,  note }
//        pages  =  Map(a page  ->  its newest saved frame)   (null:  nothing to use)
//        size   =  the database's size in pages,  as of that save
//        note   =  'used'    'empty'  (nothing saved in it)    'notwal'  (it isn't one)    'other'  (another database's)
//
// ----------------------------------------------------------

async function readWal(wal, pageSize, isCurrent) {

    const none = function (note) { return { pages: null, size: 0, note: note }; };
    if (wal.size < 32) return none(wal.size === 0 ? 'empty' : 'notwal');      //  (0 bytes:  SQLite empties it,  after copying it all in)
    const head = new Uint8Array(await wal.slice(0, 32).arrayBuffer());
    if (!isCurrent()) throw DB_STALE;
    const word = function (b, at) { return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0; };
    const magic = word(head, 0);
    if ((magic !== 0x377F0682 && magic !== 0x377F0683) || word(head, 4) !== 3007000) return none('notwal');
    if (word(head, 8) !== pageSize) return none('other');
    const bigEnd = magic === 0x377F0683;                           //  the checksum's numbers:  big end first  (...83)  or little  (...82)
    const salt1 = word(head, 16), salt2 = word(head, 20);

    //  The checksum:  the bytes as 32-bit numbers,  2 at a time,  into 2 running sums   (SQLite's walChecksumBytes)
    let s0 = 0, s1 = 0;
    function sum(b, from, to) {
        for (let k = from; k < to; k += 8) {
            const x0 = bigEnd ? word(b, k)     : ((b[k + 3] << 24) | (b[k + 2] << 16) | (b[k + 1] << 8) | b[k]) >>> 0;
            const x1 = bigEnd ? word(b, k + 4) : ((b[k + 7] << 24) | (b[k + 6] << 16) | (b[k + 5] << 8) | b[k + 4]) >>> 0;
            s0 = (s0 + x0 + s1) >>> 0;
            s1 = (s1 + x1 + s0) >>> 0;
        }
    }
    sum(head, 0, 24);
    if (s0 !== word(head, 24) || s1 !== word(head, 28)) return none('empty');    //  (half-written notes:  "nothing saved",  to SQLite)

    //  Every frame,  ~4 MB of them at a time:  which page it is,  and where the last commit is
    const frameSize = 24 + pageSize;
    const frames = Math.floor((wal.size - 32) / frameSize);
    const perRead = Math.floor(DB_CHUNK / frameSize);
    const pageOf = new Uint32Array(frames);
    let lastCommit = -1, size = 0;
    reading:
    for (let start = 0; start < frames; start += perRead) {
        setLoadingLabel('Reading the newest changes  (the -wal file)...  ' + Math.floor(100 * start / frames) + '%');
        const count = Math.min(perRead, frames - start);
        const at = 32 + start * frameSize;
        const b = new Uint8Array(await wal.slice(at, at + count * frameSize).arrayBuffer());
        if (!isCurrent()) throw DB_STALE;
        if (b.length < count * frameSize) break;
        for (let k = 0; k < count; k++) {
            const o = k * frameSize;
            const no = word(b, o);
            if (no === 0 || word(b, o + 8) !== salt1 || word(b, o + 12) !== salt2) break reading;
            sum(b, o, o + 8);
            sum(b, o + 24, o + frameSize);
            if (s0 !== word(b, o + 16) || s1 !== word(b, o + 20)) break reading;
            pageOf[start + k] = no;
            const commit = word(b, o + 4);
            if (commit !== 0) { lastCommit = start + k; size = commit; }
        }
    }
    if (lastCommit === -1) return none('empty');

    //  Each page's newest bytes:  its LAST frame up to the last commit
    const pages = new Map();
    for (let f = 0; f <= lastCommit; f++) pages.set(pageOf[f], f);
    return { pages: pages, size: size, note: 'used' };
}


//  One value as a CSV cell's words  (null = NULL).
//      a whole number   every digit  (a BigInt past the safe limit:  exact)
//      a REAL           the shortest words that give back the SAME number  (so a query on it matches SQLite exactly);
//                       a whole one as  5.0,  and past 1e15 SQLite's way  (see numberText in queryI.js)
//      a BLOB           up to 32 bytes:  hex  (0x0A1B...).   Bigger:  what it is,  and how big   ([BLOB  48 KB  PNG image])
function dbCellText(kind, v) {
    switch (kind) {
        case 'n': return null;
        case 'i': return String(v);
        case 't': return v;
        case 'r': return Number.isInteger(v) || !isFinite(v) ? numberText(v, true) : String(v);
        default:  return v.length <= DB_HEX_UP_TO ? dbHex(v) : '[BLOB  ' + dbBytes(v.length) + (dbWhatItIs(v) ? '  ' + dbWhatItIs(v) : '') + ']';
    }
}

function dbHex(b) {
    let s = '0x';
    for (let k = 0; k < b.length; k++) s += (b[k] < 16 ? '0' : '') + b[k].toString(16).toUpperCase();
    return s;
}

//  1234567  ->  1,234,567   (by hand:  the first  toLocaleString()  in a page wakes the browser's number rules,  ~70 ms,
//  and the loader's label is the first thing to ask)
function dbCommas(n) {
    const s = String(n);
    let out = '';
    for (let k = 0; k < s.length; k++) out += (k > 0 && (s.length - k) % 3 === 0 ? ',' : '') + s[k];
    return out;
}

function dbBytes(n) {
    return n < 1024 ? n + ' bytes' : n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';
}

//  What a BLOB is,  by its first bytes   (the same trick the brain uses to spot an Excel file)
function dbWhatItIs(b) {
    const starts = function (list) { return list.every(function (x, k) { return b[k] === x; }); };
    if (starts([0x89, 0x50, 0x4E, 0x47])) return 'PNG image';
    if (starts([0xFF, 0xD8, 0xFF])) return 'JPEG image';
    if (starts([0x47, 0x49, 0x46, 0x38])) return 'GIF image';
    if (starts([0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'WebP image';
    if (starts([0x25, 0x50, 0x44, 0x46])) return 'PDF';
    if (starts([0x50, 0x4B, 0x03, 0x04])) return 'zip';
    if (starts([0x1F, 0x8B])) return 'gzip';
    if (starts([0x62, 0x70, 0x6C, 0x69, 0x73, 0x74])) return 'Apple plist';
    if (dbIsSqlite(b)) return 'SQLite database';
    return '';
}



// ----------------------------------------------------------
//
//    A TABLE'S SHAPE,  from its CREATE TABLE   (SQLite keeps the words in sqlite_schema)
//
//      id INTEGER PRIMARY KEY,         ->   rowid: true   (the column IS the row's number:  SQLite stores NULL for it)
//      n INT DEFAULT 5,                ->   dflt: '5'      (a row from before  ADD COLUMN n  gets this)
//      full AS (a || b)                ->   virtual: true  (never stored:  SQLite works it out when it's read;  here,  NULL for now)
//      ...)  WITHOUT ROWID             ->   withoutRowid:  the rows are kept in primary-key order,  key first
//
// ----------------------------------------------------------

const DB_COLUMN_RULES = /\s(CONSTRAINT|PRIMARY|NOT|NULL|UNIQUE|CHECK|DEFAULT|COLLATE|REFERENCES|GENERATED|AS)\b/i;
const DB_NOT_A_COLUMN = /^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b/i;

function dbShape(words) {
    const sql = dbNoComments(words);
    const open = dbOpenParen(sql);
    const close = open === -1 ? -1 : dbCloseParen(sql, open);
    const body = close === -1 ? '' : sql.slice(open + 1, close);
    const tail = close === -1 ? '' : sql.slice(close + 1);
    const columns = [];
    let pkOrder = [];
    let pkDesc = false;

    for (const item of splitTopLevel(body)) {
        const text = item.trim();
        if (text === '') continue;

        if (!/^["`\[]/.test(text) && DB_NOT_A_COLUMN.test(text)) {
            const pk = /PRIMARY\s+KEY\s*\(([\s\S]*)\)/i.exec(text.replace(/^CONSTRAINT\s+("(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|\S+)\s+/i, ''));
            if (pk !== null) pkOrder = splitTopLevel(pk[1]).map(function (part) { return { name: unquote(part.trim().replace(/\s+(ASC|DESC)\s*$/i, '').replace(/\s+COLLATE\s+\S+\s*$/i, '')).toLowerCase(), desc: false }; });
            continue;
        }

        const named = /^("(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|[^\s(]+)/.exec(text);
        if (named === null) continue;
        const rest = ' ' + text.slice(named[0].length);
        const blank = blankInside(rest);
        const rule = DB_COLUMN_RULES.exec(blank);
        const cut = rule === null ? rest.length : rule.index;
        const rules = blank.slice(cut);
        const column = {
            name:    unquote(named[0]),
            type:    upperOutsideQuotes(rest.slice(0, cut).trim().replace(/\s+/g, ' ')),
            pk:      /\bPRIMARY\s+KEY\b/i.test(rules),
            rowid:   false,
            dflt:    null,
            virtual: /\bAS\b/i.test(rules) && !/\bSTORED\b/i.test(rules),
        };
        column.affinity = dbAffinity(column.type);
        if (column.pk) pkDesc = /\bPRIMARY\s+KEY\s+DESC\b/i.test(rules);
        //  The DEFAULT:  the words right after it   (a number,  'words',  NULL,  TRUE / FALSE,  X'...')
        const d = /\sDEFAULT\b/i.exec(blank);                     //  (just the word:  in  blank,  'words'  are spaces too)
        if (d !== null) column.dflt = dbDefault(rest.slice(d.index + d[0].length));
        columns.push(column);
    }

    if (pkOrder.length === 0) {
        columns.forEach(function (c, j) { if (c.pk) pkOrder.push({ name: c.name.toLowerCase(), desc: pkDesc }); });
    }
    const pkIndex = pkOrder.map(function (k) { return columns.findIndex(function (c) { return c.name.toLowerCase() === k.name; }); }).filter(function (j) { return j !== -1; });
    pkIndex.forEach(function (j) { columns[j].pk = true; });

    const withoutRowid = /\bWITHOUT\s+ROWID\b/i.test(tail);
    //  INTEGER PRIMARY KEY  (exactly that type,  the only key column,  not  "PRIMARY KEY DESC"  on the column itself):
    //  the column is the row's own number  (SQLite's rule,  quirks and all)
    if (!withoutRowid && pkIndex.length === 1 && columns[pkIndex[0]].type.toUpperCase() === 'INTEGER' && !(columns[pkIndex[0]].pk && pkDesc)) {
        columns[pkIndex[0]].rowid = true;
    }
    return { columns: columns, withoutRowid: withoutRowid, pkOrder: pkIndex };
}

//  A column's "affinity":  what its values lean toward.   SQLite's rule,  in this order:
//      INT  ->  integer        CHAR / CLOB / TEXT  ->  text        BLOB,  or no type  ->  blob        REAL / FLOA / DOUB  ->  real
//      anything else  ->  numeric
function dbAffinity(type) {
    const u = type.toUpperCase();
    if (u.indexOf('INT') !== -1) return 'integer';
    if (/CHAR|CLOB|TEXT/.test(u)) return 'text';
    if (u === '' || u.indexOf('BLOB') !== -1) return 'blob';
    if (/REAL|FLOA|DOUB/.test(u)) return 'real';
    return 'numeric';
}

//  The same words with every comment turned into spaces   (SQLite keeps a CREATE TABLE exactly as it was typed,
//  -- comments and all,  and a  (  inside one mustn't count)
function dbNoComments(sql) {
    let out = '', quote = '';
    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (quote !== '') { out += c; if (c === quote) quote = ''; continue; }
        if (c === '"' || c === '`' || c === "'") { quote = c; out += c; continue; }
        if (c === '[') { quote = ']'; out += c; continue; }
        if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== String.fromCharCode(10)) { out += ' '; i++; } out += i < sql.length ? sql[i] : ''; continue; }
        if (c === '/' && sql[i + 1] === '*') { const end = sql.indexOf('*/', i + 2); const stop = end === -1 ? sql.length : end + 2; out += ' '.repeat(stop - i); i = stop - 1; continue; }
        out += c;
    }
    return out;
}

//  The first  (  of  CREATE TABLE name (  that isn't inside the name's quotes
function dbOpenParen(sql) {
    let quote = '';
    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (quote !== '') { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === '`' || c === "'") quote = c;
        else if (c === '[') quote = ']';
        else if (c === '(') return i;
    }
    return -1;
}

//  The  )  that closes the  (  at  open
function dbCloseParen(sql, open) {
    let depth = 0, quote = '';
    for (let i = open; i < sql.length; i++) {
        const c = sql[i];
        if (quote !== '') { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === '`' || c === "'") quote = c;
        else if (c === '[') quote = ']';
        else if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

//  A DEFAULT's value,  as a cell's words  (null = NULL)
function dbDefault(s) {
    const t = s.trim();
    let m;
    if ((m = /^'((?:[^']|'')*)'/.exec(t)) !== null) return m[1].replace(/''/g, "'");
    if ((m = /^[xX]'([0-9a-fA-F]*)'/.exec(t)) !== null) return '0x' + m[1].toUpperCase();
    if ((m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(t)) !== null) return m[0].replace(/^\+/, '');
    if (/^NULL\b/i.test(t)) return null;
    if (/^TRUE\b/i.test(t)) return '1';
    if (/^FALSE\b/i.test(t)) return '0';
    if ((m = /^"((?:[^"]|"")*)"/.exec(t)) !== null) return m[1].replace(/""/g, '"');
    return null;
}


//  Turn a problem into words for you.
function dbProblem(problem, name) {
    const what = '"' + name + '"';
    switch (problem && problem.message) {
        case 'notsqlite': return 'Couldn\'t open ' + what + ': it isn\'t a SQLite database. (Some apps lock theirs with a password, like WhatsApp\'s and Signal\'s backups: those can\'t be read without it.)';
        case 'notables':  return 'Couldn\'t open ' + what + ': the database has no tables.' +
                                 (problem.walMissing ? ' (Not saved into it yet? If "' + name + '-wal" is next to it, pick both together: the tables may be in there.)' : '');
        case 'toobig':    return 'Couldn\'t open ' + what + ': that table is too big to show (over 450 MB as text).';
        case 'damaged':   return 'Couldn\'t open ' + what + ': it looks damaged (a page points somewhere it can\'t), so it isn\'t read any further.';
        case 'newer':     return 'Couldn\'t open ' + what + ': it\'s from a newer kind of SQLite than this page can read.';
        default:          return 'Couldn\'t read ' + what + ' as a SQLite database' + (problem && problem.message ? ' (' + problem.message + ')' : '') + '.';
    }
}


//  A file that goes WITH a database  (but isn't one),  picked on its own?   Say what it is.   (b = its first bytes)
//  null:  it isn't one of those.
function dbSideFile(b, name) {
    const what = '"' + name + '"';
    const main = /-(wal|shm|journal)$/i.test(name) ? '"' + name.slice(0, name.lastIndexOf('-')) + '"' : 'its database';
    if (b.length >= 4 && b[0] === 0x37 && b[1] === 0x7F && b[2] === 0x06 && (b[3] === 0x82 || b[3] === 0x83)) {
        return 'That\'s ' + what + ': the newest changes of a SQLite database, not a database itself. Pick ' + main + ' and ' + what + ' together (Ctrl+click both).';
    }
    if (b.length >= 8 && b[0] === 0xD9 && b[1] === 0xD5 && b[2] === 0x05 && b[3] === 0xF9 && b[4] === 0x20 && b[5] === 0xA1 && b[6] === 0x63 && b[7] === 0xD7) {
        return 'That\'s ' + what + ': SQLite\'s notes for undoing a save that didn\'t finish (no rows in it). Pick ' + main + ' instead.';
    }
    const shm = b.length >= 4 && ((b[0] === 0x18 && b[1] === 0xE2 && b[2] === 0x2D && b[3] === 0) ||     //  (its version,  3007000,
                                  (b[0] === 0 && b[1] === 0x2D && b[2] === 0xE2 && b[3] === 0x18) ||     //   either way round,
                                  (b[0] === 0 && b[1] === 0 && b[2] === 0 && b[3] === 0));               //   or nothing yet)
    if (shm && /-shm$/i.test(name)) {
        return 'That\'s ' + what + ': a scratch file SQLite keeps while a database is open (no rows in it). Pick ' + main + ' instead (and its -wal file too, if it\'s there).';
    }
    return null;
}

//  What the -wal file did,  in a few words  (for the "Rows 1–15" line)
function dbWalNote(info) {
    const wal = info.wal !== null ? '"' + info.wal.name + '"' : '';
    switch (info.walNote) {
        case 'used':    return '  ·  with its newest changes  (from ' + wal + ')';
        case 'empty':   return '  ·  ' + wal + ' had no newer changes in it';
        case 'notwal':  return '  ·  ' + wal + ' was left out:  it isn\'t a -wal file';
        case 'other':   return '  ·  ' + wal + ' was left out:  it\'s another database\'s  (its pages are a different size)';
        case 'missing': return '  ·  if "' + info.file.name + '-wal" is next to it,  pick both together:  it may have newer changes';
        default:        return '';
    }
}
