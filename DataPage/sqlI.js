/*
    ==========================================================

        THE NANDO NOTES  -  sqlI.js

        This file READS SQL DUMPS  (.sql).
        It's a translator,  like xlsxI.js:  it turns ONE TABLE of the dump into the same
        kind of text a CSV file has,  and hands it to the brain  (flogicI.js),
        which does everything else  (storage, search, scrolling).

            flogic.html   =  what's there     (skeleton)
            flogicI.css   =  how it looks     (clothes)
            flogicI.js   =  what it does     (brain)
            xlsxI.js     =  reads Excel files     (a translator)
            sqlI.js      =  reads SQL dumps       (a translator)

    ==========================================================


    A SQL DUMP  is a database,  written out as the commands that would build it again:

        CREATE TABLE users (id INT PRIMARY KEY, name TEXT, email TEXT);      <-  the columns
        INSERT INTO users VALUES (1, 'Ana', 'ana@x.com'), (2, 'Bo', NULL);    <-  the rows

        COPY users (id, name, email) FROM stdin;          <-  PostgreSQL's way:  the rows come right after,
        1	Ana	ana@x.com                                     one per line,  split by TABs,
        2	Bo	\N                                            \N  =  NULL  (nothing),
        \.                                                    and  \.  ends them.

    Every database writes them a little differently  (MySQL, PostgreSQL, SQLite):
    how names are quoted  ("name"  `name`  [name]),  how quotes INSIDE words are written
    ('it''s'  or  'it\'s'),  and comments  (-- ...   # ...   and the slash-star kind).  This file knows them all.


    THE STEPS:

        1.   Walk through the dump,  one command at a time.   (Skip the ones that aren't about tables.)
        2.   CREATE TABLE  ->  remember the table's columns:  their names,  their TYPES,  the PRIMARY KEY.
        3.   INSERT / COPY  for the table we're showing  ->  turn every row into a line of CSV text.
             Rows of the OTHER tables are skipped  (quickly:  they're not even read).
        4.   Hand the CSV text to the brain.   Each table becomes a TAB  (like Excel's sheets).


    NULL  is not the same as empty  (''  =  "we know it's nothing",   NULL  =  "we don't know").
    CSV text can't tell them apart,  so the NULLs are written down on the side  (in sqlInfo):
    the Table look shows them as a faint  NULL.


    SAFETY  (the file came from outside,  so it's treated like a stranger):

        -  Nothing is ever RUN.  The commands are only READ,  like text.
        -  Every value goes on the page as plain text  (the brain already does that).

*/



// ----------------------------------------------------------
//
//    THE OPEN FILE'S SQL NOTES
//
//    null  =  the open file isn't a SQL dump.
//    Otherwise  (set by the brain when the file is swapped in):
//
//      { file,        the original file itself
//        dialect,     'MySQL',  'PostgreSQL',  'SQLite',  or ''  (couldn't tell)
//        sheetName,   which table is showing   ("users")
//        sheetNumber, which one it is,  counting from 1
//        sheetCount,  how many tables the dump has
//        sheets,      all of them:  [{ name, empty }]    (for the tabs:  the same tabs as Excel's sheets)
//        columns,     the showing table's columns:  [{ name, type, pk }]
//        rows,        how many rows it has
//        nullCount,   how many of its cells are NULL
//        nullRows,    which ones:  the row  (counting from 1,  like the row numbers)  ...
//        nullCols }   ...  and the column,  for each NULL,  in order
//
// ----------------------------------------------------------

let sqlInfo = null;

const SQL_STALE = new Error('stale');       //  "a newer file was picked:  forget this one"  (not a real problem)



// ----------------------------------------------------------
//
//    READ A SQL DUMP
//
//    readSql(text, file, isCurrent, choice)   ->   a "promise" of  { text, info }
//        text  =  the table,  as CSV text
//        info  =  the SQL notes  (see above)
//
//    text         =  the whole dump  (the brain already read it,  like any text file)
//    choice       =  which table to show  (0 = the first one).   null  =  the first one that HAS rows.
//    isCurrent()  says if this file is still the one you want.  (Picked a newer one?  Stop.)
//
// ----------------------------------------------------------

async function readSql(text, file, isCurrent, choice) {

    const t = text;
    const n = t.length;
    let p = 0;                              //  where we are in the dump


    //  Big jobs are done in BITES  (like everything else),  so the page never freezes.
    let stopAt = performance.now() + CHUNK_TIME;

    async function breathe() {
        if (performance.now() < stopAt) return;
        setLoadingLabel('Reading the SQL...  ' + Math.floor(100 * p / Math.max(n, 1)) + '%');
        await new Promise(function (go) { nextBite(go); });
        if (!isCurrent()) throw SQL_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }


    //  WHICH DATABASE wrote it?  (Look at the first 64 KB.)
    //  It matters for one thing:  in MySQL,  a backslash inside a word is special  ('it\'s'),
    //  everywhere else it's just a backslash  (they write  'it''s').
    const head    = t.slice(0, 65536);
    const mysql   = /MySQL dump|MariaDB dump|\bENGINE\s*=|`/i.test(head);
    const dialect = mysql ? 'MySQL'
        : /PostgreSQL database dump|^COPY\s|\bsearch_path\b|::/im.test(head) ? 'PostgreSQL'
        : /\bPRAGMA\b|BEGIN TRANSACTION/i.test(head) ? 'SQLite'
        : '';


    //  ---- THE TABLES,  in the order they first show up ----
    const tables = [];
    const byKey  = new Map();

    function tableNamed(q) {
        let table = byKey.get(q.key);
        if (table === undefined) {
            table = { name: q.name, columns: null, hasData: false };
            byKey.set(q.key, table);
            tables.push(table);
            if (choice !== null && tables.length - 1 === choice) chosen = table;
        }
        return table;
    }

    let chosen = null;                      //  the table we're turning into rows

    //  The first table that has rows wins  (when no table was asked for).
    function wanted(table) {
        if (chosen === null && choice === null) chosen = table;
        return table === chosen;
    }


    //  ---- THE ROWS of the chosen table:  CSV lines,  and the NULLs ----
    const lines = [];
    let nullRows  = new Uint32Array(1024);
    let nullCols  = new Uint16Array(1024);
    let nullCount = 0;

    function markNull(row, col) {
        if (nullCount === nullRows.length) {                //  full?  Twice as big,  copy the old ones in.
            const r = new Uint32Array(nullRows.length * 2); r.set(nullRows); nullRows = r;
            const c = new Uint16Array(nullCols.length * 2); c.set(nullCols); nullCols = c;
        }
        nullRows[nullCount] = row;
        nullCols[nullCount] = col;
        nullCount++;
    }

    //  One row:  "values"  in the order they came,  "where"  says which column each one goes in.
    function addRow(table, values, where) {

        if (table.columns === null) table.columns = [];
        const columns = table.columns;

        const row = new Array(columns.length).fill('');
        const num = lines.length + 1;                       //  this row's number  (counting from 1)

        for (let i = 0; i < values.length; i++) {

            let col = where === null ? i : where[i];

            //  More values than columns?  (No CREATE TABLE for it.)  Make up a name.
            while (col >= columns.length) {
                columns.push({ name: 'column ' + (columns.length + 1), type: '', pk: false });
                row.push('');
            }

            if (values[i] === null) markNull(num, col);
            else row[col] = values[i];
        }

        lines.push(row.map(sqlCell).join(','));
    }


    // ---------------------------------------------------------- the reading tools

    //  Skip spaces,  line breaks,  and comments:    -- to the end of the line,   # too  (MySQL),   /* ... */
    function skipSpace() {
        while (p < n) {
            const c = t.charCodeAt(p);
            if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 0xFEFF) { p++; continue; }
            if ((c === 45 && t.charCodeAt(p + 1) === 45) || (c === 35 && mysql)) {
                const end = t.indexOf('\n', p);
                p = end === -1 ? n : end + 1;
                continue;
            }
            if (c === 47 && t.charCodeAt(p + 1) === 42) {
                const end = t.indexOf('*/', p + 2);
                p = end === -1 ? n : end + 2;
                continue;
            }
            return;
        }
    }

    //  A plain word  (a command,  or a name without quotes):   letters, digits,  _  $
    function word() {
        const start = p;
        while (p < n) {
            const c = t.charCodeAt(p);
            if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c > 127) p++;
            else break;
        }
        return t.slice(start, p);
    }

    //  The next word,  if it's THIS one  (any capitals).   It is?  Step past it.   It isn't?  Stay put.
    function keyword(k) {
        skipSpace();
        const start = p;
        if (word().toUpperCase() === k) return true;
        p = start;
        return false;
    }

    //  A name:   users    "users"    `users`    [users]      (a doubled quote inside  =  a real quote)
    function identifier() {
        skipSpace();
        const c = t[p];
        if (c === '"' || c === '`') {
            let out = '';
            p++;
            while (p < n) {
                const end = t.indexOf(c, p);
                if (end === -1) { out += t.slice(p); p = n; break; }
                out += t.slice(p, end);
                p = end + 1;
                if (t[p] === c) { out += c; p++; continue; }
                break;
            }
            return out;
        }
        if (c === '[') {
            const end = t.indexOf(']', p);
            const out = t.slice(p + 1, end === -1 ? n : end);
            p = end === -1 ? n : end + 1;
            return out;
        }
        return word();
    }

    //  A table's name,  maybe with its "schema" in front:    public.users    mydb.`users`
    //  (The usual schemas  public,  dbo,  main  are left off:  they're just "the normal place".)
    function tableName() {
        const parts = [identifier()];
        while (true) {
            skipSpace();
            if (t[p] !== '.') break;
            p++;
            parts.push(identifier());
        }
        const name   = parts[parts.length - 1];
        const schema = parts.length > 1 && !/^(public|dbo|main)$/i.test(parts[parts.length - 2]) ? parts[parts.length - 2] + '.' : '';
        return { name: schema + name, key: (schema + name).toLowerCase() };
    }

    //  A word in quotes:   'it''s'    (and in MySQL,  or with  E'...'  in PostgreSQL:   'it\'s'   'line one\nline two')
    const quoteOrSlash = /['\\]/g;

    function readString(backslashes) {
        p++;                                //  past the opening  '
        let out = '';
        while (true) {
            let q;
            if (backslashes) { quoteOrSlash.lastIndex = p; const m = quoteOrSlash.exec(t); q = m === null ? -1 : m.index; }
            else q = t.indexOf("'", p);

            if (q === -1) { out += t.slice(p); p = n; return out; }        //  never closed:  take the rest

            out += t.slice(p, q);
            if (t.charCodeAt(q) === 39) {                                   //  a quote:
                if (t.charCodeAt(q + 1) === 39) { out += "'"; p = q + 2; continue; }    //  ''  =  a real quote
                p = q + 1;
                return out;                                                 //  the end of the word
            }
            p = q + 1;                                                      //  a backslash:  what's next?
            out += backslashLetter();
        }
    }

    //  After a backslash:   \n  =  a line break,   \t  =  a tab,   \'  =  a quote ...
    function backslashLetter() {
        const c = t[p++];
        switch (c) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'Z': return '\x1A';
            case '0': return '';                                            //  a "nothing" letter:  leave it out
            case 'x': { const hex = /^[0-9a-fA-F]{1,2}/.exec(t.slice(p, p + 2)); if (hex) { p += hex[0].length; return String.fromCharCode(parseInt(hex[0], 16)); } return 'x'; }
            case 'u': { const hex = /^[0-9a-fA-F]{4}/.exec(t.slice(p, p + 4)); if (hex) { p += 4; return String.fromCharCode(parseInt(hex[0], 16)); } return 'u'; }
            case '%': return '\\%';                                         //  (MySQL keeps these two as they are)
            case '_': return '\\_';
            case undefined: return '';
            default:  return c;                                             //  \'  \"  \\  ->  just the letter
        }
    }

    //  Skip a quoted word without keeping it.
    function skipString(backslashes) { readString(backslashes); }

    //  PostgreSQL's  $$ ... $$  or  $tag$ ... $tag$  (used for function bodies:  they can have  ;  inside).
    const dollarTag = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/y;

    function readDollar() {
        dollarTag.lastIndex = p;
        const m = dollarTag.exec(t);
        if (m === null) { p++; return null; }
        const end = t.indexOf(m[0], p + m[0].length);
        const out = t.slice(p + m[0].length, end === -1 ? n : end);
        p = end === -1 ? n : end + m[0].length;
        return out;
    }

    //  Skip to just past the end of this command  (the next  ;  that's not inside quotes or a comment).
    const special = /[;'"`$\-\/#]/g;

    function skipCommand() {
        while (p < n) {
            special.lastIndex = p;
            const m = special.exec(t);
            if (m === null) { p = n; return; }
            p = m.index;
            const c = t[p];
            if (c === ';') { p++; return; }
            if (c === "'") { skipString(mysql || /[eE]/.test(t[p - 1] || '') && !/\w/.test(t[p - 2] || '')); continue; }
            if (c === '"' || c === '`') { identifier(); continue; }
            if (c === '$') { readDollar(); continue; }
            if (c === '-' && t[p + 1] === '-') { skipSpace(); continue; }
            if (c === '/' && t[p + 1] === '*') { skipSpace(); continue; }
            if (c === '#' && mysql) { skipSpace(); continue; }
            p++;
        }
    }

    //  Everything inside  ( ... ),  as text.   p starts ON the  (  and ends just past the matching  ).
    const parenStuff = /[()'"`]/g;

    function insideParens() {
        const start = ++p;
        let depth = 1;
        while (p < n) {
            parenStuff.lastIndex = p;
            const m = parenStuff.exec(t);
            if (m === null) { p = n; break; }
            p = m.index;
            const c = t[p];
            if (c === '(') { depth++; p++; continue; }
            if (c === ')') { if (--depth === 0) { p++; return t.slice(start, p - 1); } p++; continue; }
            if (c === "'") { skipString(mysql); continue; }
            identifier();
        }
        return t.slice(start, p);
    }


    // ---------------------------------------------------------- the commands

    //  CREATE TABLE  name  ( column TYPE ..., ...,  PRIMARY KEY (...) )
    function createCommand() {

        while (keyword('OR') || keyword('REPLACE') || keyword('TEMPORARY') || keyword('TEMP') ||
               keyword('UNLOGGED') || keyword('GLOBAL') || keyword('LOCAL')) { /* (just skip these) */ }

        if (!keyword('TABLE')) { skipCommand(); return; }          //  CREATE INDEX,  CREATE VIEW ...:  not a table
        if (keyword('IF')) { keyword('NOT'); keyword('EXISTS'); }

        const table = tableNamed(tableName());
        skipSpace();

        if (t[p] === '(' && table.columns === null) table.columns = readColumns(insideParens());
        skipCommand();
    }

    //  ALTER TABLE  name  ADD  CONSTRAINT x  PRIMARY KEY (id)
    //  (PostgreSQL's dumps name the primary key HERE,  at the very end,  not in CREATE TABLE.)
    function alterCommand() {

        if (!keyword('TABLE')) { skipCommand(); return; }
        if (keyword('IF')) keyword('EXISTS');
        keyword('ONLY');

        const name  = tableName();
        const start = p;
        skipCommand();

        const table = byKey.get(name.key);
        const pk    = /\bPRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(t.slice(start, p));
        if (table === undefined || table.columns === null || pk === null) return;

        pk[1].split(',').forEach(function (key) {
            const column = table.columns.find(function (c) { return c.name.toLowerCase() === unquote(key.trim()).toLowerCase(); });
            if (column !== undefined) column.pk = true;
        });
    }

    //  INSERT INTO  name  (columns)  VALUES  ( ... ),  ( ... );      (also  REPLACE INTO,   INSERT OR IGNORE INTO ...)
    async function insertCommand() {

        while (keyword('LOW_PRIORITY') || keyword('DELAYED') || keyword('HIGH_PRIORITY') || keyword('IGNORE') ||
               keyword('OR') || keyword('REPLACE') || keyword('ROLLBACK') || keyword('ABORT') || keyword('FAIL')) { /* (skip) */ }
        keyword('INTO');

        const name = tableName();

        //  Which columns,  in which order?
        skipSpace();
        let named = null;
        if (t[p] === '(') {
            const save = p;
            p++;
            if (keyword('SELECT') || keyword('WITH')) { p = save; skipCommand(); return; }     //  INSERT ... (SELECT ...):  no values to read
            p = save;
            named = splitTopLevel(insideParens()).map(unquote);
        }

        if (!keyword('VALUES') && !keyword('VALUE')) { skipCommand(); return; }               //  INSERT ... SELECT,  DEFAULT VALUES:  no rows here

        const table = tableNamed(name);                             //  (only NOW:  an  INSERT ... SELECT  isn't about a table in this file)
        table.hasData = true;
        if (!wanted(table)) { skipCommand(); return; }             //  another table's rows:  skip them,  fast

        const where = named === null ? null : columnSpots(table, named);

        //  The rows:    ( ... ) , ( ... ) , ( ... )
        let count = 0;
        while (true) {
            skipSpace();
            if (t[p] !== '(') break;
            p++;
            addRow(table, rowValues(), where);
            skipSpace();
            if (t[p] !== ',') break;
            p++;
            if (++count % 256 === 0) await breathe();              //  (one INSERT can hold 100,000 rows)
        }

        skipCommand();                                              //  the rest:  ON DUPLICATE KEY ...,   ;
    }

    //  COPY  name  (columns)  FROM stdin;    then the rows,  one per line,  TAB between them,  until   \.
    async function copyCommand() {

        keyword('ONLY');
        const table = tableNamed(tableName());

        skipSpace();
        const named = t[p] === '(' ? splitTopLevel(insideParens()).map(unquote) : null;

        if (!keyword('FROM') || !keyword('STDIN')) { skipCommand(); return; }                  //  COPY ... FROM a file / TO ...
        skipCommand();                                              //  to the end of the  COPY ... ;  line

        //  The rows start on the next line,  and end at a line that's just   \.
        const nl    = t.indexOf('\n', p);
        const start = nl === -1 ? n : nl + 1;
        let end = t.startsWith('\\.', start) ? start : t.indexOf('\n\\.', start - 1);
        if (end === -1) end = n;
        else if (end !== start) end++;                              //  (the  \n  before  \.  belongs to the last row)

        p = t.indexOf('\n', end);
        p = p === -1 ? n : p + 1;                                   //  carry on after the  \.  line

        if (end <= start) return;                                   //  no rows
        table.hasData = true;
        if (!wanted(table)) return;                                 //  another table:  skip its rows

        const where = named === null ? null : columnSpots(table, named);

        let at = start, count = 0;
        while (at < end) {
            let lineEnd = t.indexOf('\n', at);
            if (lineEnd === -1 || lineEnd > end) lineEnd = end;
            let line = t.slice(at, lineEnd);
            if (line.charCodeAt(line.length - 1) === 13) line = line.slice(0, -1);    //  a Windows  \r
            at = lineEnd + 1;
            if (line === '' && at >= end) break;

            addRow(table, line.split('\t').map(copyValue), where);
            if (++count % 2048 === 0) await breathe();
        }
    }


    // ---------------------------------------------------------- the values

    //  One row's values:    1, 'Ana', NULL, 'x'::text, now()      (p is just past the  (  ,  ends past the  ) )
    function rowValues() {
        const values = [];
        while (p < n) {
            values.push(oneValue());
            skipSpace();
            const c = t[p];
            if (c === ',') { p++; continue; }
            if (c === ')') { p++; break; }
            skipExpression();                                       //  something we didn't expect:  skip to the next  ,  or  )
            if (t[p] === ',') { p++; continue; }
            p++;
            break;
        }
        return values;
    }

    const prefixedString = /([A-Za-z_][A-Za-z0-9_]*)'/y;
    const plainToken     = /[^,()\s]+/y;

    function oneValue() {
        skipSpace();
        const c = t[p];
        let value;

        if (c === "'") {
            value = readString(mysql);
        } else if (c === '$') {
            value = readDollar() || '';
        } else {
            prefixedString.lastIndex = p;
            const pre = prefixedString.exec(t);

            if (pre !== null) {                                     //  E'...'   X'...'   N'...'   _utf8mb4'...'
                const kind = pre[1].toUpperCase();
                p += pre[1].length;
                value = readString(mysql || kind === 'E');
                if (kind === 'X') value = '0x' + value.toUpperCase();          //  bytes,  written in hex
                if (kind === 'B') value = 'b' + value;                          //  bits
            } else if (/[-+0-9.]/.test(c)) {
                plainToken.lastIndex = p;                           //  a number:   42   -3.5   1e9   0x1F
                const m = plainToken.exec(t);
                value = m === null ? '' : m[0];
                p += value.length;
            } else {
                const start = p;
                const w = word();
                const upper = w.toUpperCase();
                skipSpace();
                if (upper === 'NULL' && (t[p] === ',' || t[p] === ')')) return null;
                if ((upper === 'TRUE' || upper === 'FALSE') && (t[p] === ',' || t[p] === ')')) return w.toLowerCase();
                if (upper === 'DEFAULT' && (t[p] === ',' || t[p] === ')')) return '';
                if (w[0] === '_' && t[p] === "'") return readString(mysql);     //  _binary 'abc'   (MySQL:  "these letters are in this alphabet")
                p = start;
                value = skipExpression().trim();                    //  now(),  CAST(...),  anything else:  keep it as written
            }
        }

        //  'x'::text   'x'::character varying   (PostgreSQL's "treat it as this type"):  skip the type
        skipSpace();
        while (t[p] === ':' && t[p + 1] === ':') {
            p += 2;
            while (p < n) {
                skipSpace();
                const ch = t[p];
                if (ch === ',' || ch === ')' || ch === ';' || ch === undefined) break;
                if (ch === '(') { insideParens(); continue; }
                if (ch === '[') { const end = t.indexOf(']', p); p = end === -1 ? n : end + 1; continue; }
                if (ch === '"') { identifier(); continue; }
                if (word() === '') p++;
            }
        }

        return value;
    }

    //  Skip (and return) an expression,  up to the next  ,  or  )  that's not inside its own parentheses.
    function skipExpression() {
        const start = p;
        let depth = 0;
        while (p < n) {
            const c = t[p];
            if (c === "'") { skipString(mysql); continue; }
            if (c === '"' || c === '`') { identifier(); continue; }
            if (c === '(') depth++;
            else if (c === ')') { if (depth === 0) break; depth--; }
            else if (c === ',' && depth === 0) break;
            p++;
        }
        return t.slice(start, p);
    }

    //  One value of a COPY row:    \N  =  NULL,    \t  \n  \\  ...  =  a tab, a line break, a backslash ...
    function copyValue(raw) {
        if (raw === '\\N') return null;
        if (raw.indexOf('\\') === -1) return raw;
        return raw.replace(/\\(?:([0-7]{1,3})|x([0-9a-fA-F]{1,2})|(.))/g, function (all, oct, hex, ch) {
            if (oct !== undefined) return String.fromCharCode(parseInt(oct, 8));
            if (hex !== undefined) return String.fromCharCode(parseInt(hex, 16));
            return { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' }[ch] || ch;
        });
    }


    // ---------------------------------------------------------- GO:  one command at a time

    while (p < n) {

        skipSpace();
        if (p >= n) break;

        const c = t[p];
        if (c === ';') { p++; continue; }

        if (c === '\\') {                                           //  psql's own commands  (\connect ...):  one line,  no  ;
            const end = t.indexOf('\n', p);
            p = end === -1 ? n : end + 1;
            continue;
        }

        const command = word().toUpperCase();

        if (command === 'CREATE') createCommand();
        else if (command === 'ALTER') alterCommand();
        else if (command === 'INSERT' || command === 'REPLACE') await insertCommand();
        else if (command === 'COPY') await copyCommand();
        else if (command === '') { p++; skipCommand(); }            //  starts with something odd:  skip the whole command
        else skipCommand();                                         //  SET,  LOCK TABLES,  ALTER,  BEGIN ...:  not rows

        await breathe();
    }


    if (tables.length === 0) throw new Error('notables');
    if (chosen === null) chosen = tables[0];                        //  no table has rows:  show the first one  (just its columns)


    //  The CSV text:   the column names on top,  then every row.
    const columns = chosen.columns || [];
    const header  = columns.map(function (column) { return sqlCell(column.name); }).join(',');

    return {
        text: header + '\n' + lines.join('\n'),
        info: {
            file:        file,
            dialect:     dialect,
            sheetName:   chosen.name,
            sheetNumber: tables.indexOf(chosen) + 1,
            sheetCount:  tables.length,
            sheets:      tables.map(function (table) { return { name: table.name, hidden: false, chart: false, empty: !table.hasData }; }),
            columns:     columns,
            rows:        lines.length,
            nullCount:   nullCount,
            nullRows:    nullRows.subarray(0, nullCount),
            nullCols:    nullCols.subarray(0, nullCount)
        }
    };
}



// ----------------------------------------------------------
//
//    THE COLUMNS OF A CREATE TABLE
//
//      id INT NOT NULL AUTO_INCREMENT,           ->   { name: 'id',    type: 'INT',          pk: true  }
//      email VARCHAR(255) DEFAULT NULL,          ->   { name: 'email', type: 'VARCHAR(255)', pk: false }
//      PRIMARY KEY (id)                          ->   (not a column:  it marks  id  as the primary key)
//
//    The TYPE is everything after the name,  up to the first "rule"  (NOT NULL,  DEFAULT,  ...).
//
// ----------------------------------------------------------

const NOT_A_COLUMN = /^(CONSTRAINT|PRIMARY|UNIQUE|KEY|INDEX|FOREIGN|CHECK|FULLTEXT|SPATIAL|EXCLUDE|LIKE|PERIOD)\b/i;
const COLUMN_RULES = /\s(NOT\s+NULL|NULL|DEFAULT|PRIMARY\s+KEY|REFERENCES|UNIQUE|CHECK|COLLATE|AUTO_INCREMENT|AUTOINCREMENT|COMMENT|CONSTRAINT|GENERATED|ON\s+UPDATE|CHARACTER\s+SET|CHARSET|IDENTITY|KEY|AS)\b/i;

function readColumns(body) {

    const columns = [];
    const keys    = new Set();              //  the primary key's columns  (from a  PRIMARY KEY (...)  line)

    for (const item of splitTopLevel(body)) {

        const text = item.trim();
        if (text === '') continue;

        if (!/^["`\[]/.test(text) && NOT_A_COLUMN.test(text)) {
            const pk = /PRIMARY\s+KEY\s*(?:[\w"`]+\s*)?\(([^)]*)\)/i.exec(text);
            if (pk !== null) {
                pk[1].split(',').forEach(function (name) { keys.add(unquote(name.trim().replace(/\s*\(\d+\)\s*$/, '')).toLowerCase()); });
            }
            continue;
        }

        //  The name  (maybe in quotes),  then the rest.
        const named = /^("(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|[^\s(]+)/.exec(text);
        if (named === null) continue;                       //  (nothing we can read as a name:  skip it)
        const name  = unquote(named[0]);
        const rest  = ' ' + text.slice(named[0].length);

        //  Find the first rule,  but only OUTSIDE quotes and parentheses:   enum('NULL','x')  is still part of the type.
        const blank = blankInside(rest);
        const rule  = COLUMN_RULES.exec(blank);
        const cut   = rule === null ? rest.length : rule.index;

        columns.push({
            name: name,
            type: upperOutsideQuotes(rest.slice(0, cut).trim().replace(/\s+/g, ' ')),
            pk:   /\bPRIMARY\s+KEY\b/i.test(blank.slice(cut))
        });
    }

    columns.forEach(function (column) { if (keys.has(column.name.toLowerCase())) column.pk = true; });
    return columns;
}


//  Which column does each named value go in?    (A name we haven't seen?  It's a new column.)
function columnSpots(table, names) {
    if (table.columns === null) table.columns = [];
    return names.map(function (name) {
        let spot = table.columns.findIndex(function (column) { return column.name.toLowerCase() === name.toLowerCase(); });
        if (spot === -1) {
            table.columns.push({ name: name, type: '', pk: false });
            spot = table.columns.length - 1;
        }
        return spot;
    });
}



// ----------------------------------------------------------
//
//    LITTLE HELPERS
//
// ----------------------------------------------------------

//  Cut at the commas that are NOT inside quotes or parentheses:    a INT, b ENUM('x','y'), c TEXT   ->   3 parts
function splitTopLevel(text) {
    const parts = [];
    let depth = 0, start = 0, quote = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote !== '') {
            if (c === quote) { if (text[i + 1] === quote) i++; else quote = ''; }
            else if (c === '\\' && quote === "'") i++;
            continue;
        }
        if (c === "'" || c === '"' || c === '`') quote = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
    }
    parts.push(text.slice(start));
    return parts;
}

//  The same text,  with everything inside quotes and parentheses turned into spaces  (the same length).
//  So a search for words only finds them OUTSIDE.
function blankInside(text) {
    let out = '', depth = 0, quote = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote !== '') { out += ' '; if (c === quote) quote = ''; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; out += ' '; continue; }
        if (c === '(') { depth++; out += ' '; continue; }
        if (c === ')') { depth--; out += ' '; continue; }
        out += depth > 0 ? ' ' : c;
    }
    return out;
}

//  INT(11) unsigned  ->  INT(11) UNSIGNED      (but  enum('a','b')  keeps its words as they are)
function upperOutsideQuotes(text) {
    return text.replace(/('(?:[^']|'')*')|([^']+)/g, function (all, quoted, plain) { return quoted !== undefined ? quoted : plain.toUpperCase(); });
}

//  "name"  `name`  [name]  ->  name
function unquote(name) {
    const s = name.trim();
    if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/""/g, '"');
    if (/^`.*`$/.test(s)) return s.slice(1, -1).replace(/``/g, '`');
    if (/^\[.*\]$/.test(s)) return s.slice(1, -1);
    return s;
}

//  One cell,  written the CSV way:  quotes around it if it has a comma,  a quote,  or a line break inside.
//  (And a "nothing" letter  \0  becomes  ␀,  so you can see it,  and it can't confuse the search.)
function sqlCell(value) {
    if (value === '') return '';
    if (value.indexOf('\0') !== -1) value = value.replace(/\0/g, '␀');
    if (/[",\r\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
    return value;
}


//  Is this cell NULL?   (row counts from 1,  like the row numbers;  col from 0)
//  The NULLs were written down in row order,  so:  "guess the number"  for the row,  then look at its few NULLs.
function sqlIsNull(info, row, col) {
    const rows = info.nullRows;
    let low = 0, high = info.nullCount;
    while (low < high) {
        const middle = (low + high) >> 1;
        if (rows[middle] < row) low = middle + 1; else high = middle;
    }
    for (let i = low; i < info.nullCount && rows[i] === row; i++) {
        if (info.nullCols[i] === col) return true;
    }
    return false;
}


//  Turn a problem into words for you.
function sqlProblem(problem, name) {
    if (problem && problem.message === 'notables') {
        return 'Couldn\'t open "' + name + '": there are no tables in it  (no CREATE TABLE,  INSERT INTO,  or COPY).';
    }
    if (problem instanceof RangeError) return 'Couldn\'t open "' + name + '": it\'s too big for the browser.';
    return 'Couldn\'t open "' + name + '": something in this SQL file wasn\'t what we expected.';
}
