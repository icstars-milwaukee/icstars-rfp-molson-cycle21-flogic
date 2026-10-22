/*
    ==========================================================

        THE NANDO NOTES  -  queryI.js

        This file is the QUERY ENGINE:  a small database of our own,  inside the page.
        You write a question in SQL,  and it answers it,  using the rows the brain already holds:

            SELECT city, COUNT(*) AS customers
            FROM sales
            WHERE state = 'IL'
            GROUP BY city
            ORDER BY customers DESC

        It works on ANY open file:  a CSV,  an Excel sheet,  or a SQL dump's table
        (they're all just tables to it).

            testI.html   =  what's there     (skeleton)
            styleI.css   =  how it looks     (clothes)
            scriptI.js   =  what it does     (brain)
            xlsxI.js     =  reads Excel files     (a translator)
            sqlI.js      =  reads SQL dumps       (a translator)
            queryI.js    =  answers SQL questions (the query engine)

    ==========================================================


    THE STEPS  (for every question):

        1.   WORDS.     Cut the question into words  ("tokens"):   SELECT   city   ,   COUNT   (   *   )  ...
        2.   PARSE.     Read the words into a TREE  that says what's being asked:
                            "pick these columns,  from this table,  keep these rows,  group them like this ..."
        3.   COMPILE.   Turn every part of the tree into a tiny ready-to-run function.
                        (Done once.  Then each function runs once per row:  that's what makes it fast.)
        4.   RUN.       Walk through the rows,  in BITES  (like everything else),  so the page never freezes.
                        The answer is a new little table:  its columns,  and its rows.


    WHAT IT UNDERSTANDS  (the SELECT part of SQL,  the part that ASKS):

        SELECT  [DISTINCT]  ...  FROM  ...  [JOIN ... ON ...]  WHERE  ...  GROUP BY  ...  HAVING  ...
        ORDER BY  ...  LIMIT  ...  OFFSET  ...       UNION / INTERSECT / EXCEPT       WITH  name AS (...)
        subqueries  (SELECT ...)  inside  IN,  EXISTS,  FROM,  or as one value
        CASE,  CAST,  LIKE,  BETWEEN,  IN,  IS NULL,  math,  ||
        totals:     COUNT  SUM  AVG  MIN  MAX  MEDIAN  STRING_AGG  STDDEV ...
        windows:    ROW_NUMBER()  RANK()  LAG()  SUM(...) OVER (PARTITION BY ... ORDER BY ...) ...
        and lots of functions for words,  numbers,  and dates.

    When two databases disagree on a detail,  it does what SQLITE does
    (the tests check every answer against the real SQLite).


    SAFETY:

        -  It only ever READS.   UPDATE,  DELETE,  INSERT ... are refused:  your file is never changed.
        -  Every answer goes on the page as plain text  (the brain already does that).

*/



// ----------------------------------------------------------
//
//    PROBLEMS
//
//    A QueryError  =  something's wrong with the QUESTION  (a typo,  a column that isn't there).
//    Its words get shown to you as they are,  so they're written to be helpful.
//
// ----------------------------------------------------------

class QueryError extends Error {}

const QUERY_STALE = new Error('stale');     //  "you ran a newer query  (or picked a new file):  forget this one"

function queryFail(words) {
    throw new QueryError(words);
}



// ----------------------------------------------------------
//
//    1.   WORDS   (cut the question into tokens)
//
//        SELECT name, age*2 FROM "my table" WHERE city = 'Chicago, IL'
//
//    becomes:
//
//        [SELECT] [name] [,] [age] [*] [2] [FROM] ["my table"] [WHERE] [city] [=] ['Chicago, IL']
//
//    Each token has a kind:
//        id   =  a word  (a keyword like SELECT,  or a name like  city)
//        qid  =  a name in quotes:   "my table"    `my table`    [my table]
//        str  =  words in single quotes:   'Chicago, IL'      ('it''s'  =  it's)
//        num  =  a number:   2    3.5    1e6
//        op   =  a symbol:   ,  (  )  *  =  <=  ||  ...
//        end  =  the end of the question
//
// ----------------------------------------------------------

const TWO_SYMBOLS = ['<=', '>=', '<>', '!=', '||', '::', '=='];
const ONE_SYMBOL  = '(),.;+-*/%=<>';

function sqlTokens(text) {

    const tokens = [];
    const n = text.length;
    let p = 0;

    const NUMBER = /(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y;
    const WORD   = /[A-Za-z_À-￿][A-Za-z0-9_$À-￿]*/y;

    //  Read up to the closing mark.   Two closing marks in a row  =  one real one  ('it''s').
    function quoted(close, what) {
        let out = '';
        for (;;) {
            const end = text.indexOf(close, p);
            if (end === -1) queryFail(what + ' never ends  (a  ' + close + '  is missing).');
            out += text.slice(p, end);
            p = end + 1;
            if (close !== ']' && text[p] === close) { out += close; p++; continue; }
            return out;
        }
    }

    for (;;) {

        //  Skip spaces,  and comments:   -- to the end of the line,   and the slash-star kind.
        for (;;) {
            const c = text.charCodeAt(p);
            if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 160) { p++; continue; }
            if (c === 45 && text.charCodeAt(p + 1) === 45) {
                const end = text.indexOf('\n', p);
                p = end === -1 ? n : end + 1;
                continue;
            }
            if (c === 47 && text.charCodeAt(p + 1) === 42) {
                const end = text.indexOf('*/', p + 2);
                if (end === -1) queryFail('A comment never ends  (the  */  is missing).');
                p = end + 2;
                continue;
            }
            break;
        }

        if (p >= n) {
            tokens.push({ k: 'end', v: '', at: n });
            return tokens;
        }

        const at = p;
        const c  = text[p];

        if (c === "'") { p++; tokens.push({ k: 'str', v: quoted("'", 'Some words in quotes'), at: at }); continue; }

        //  N'...'  (SQL Server's "Unicode words")  is just words.
        if ((c === 'N' || c === 'n') && text[p + 1] === "'") { p += 2; tokens.push({ k: 'str', v: quoted("'", 'Some words in quotes'), at: at }); continue; }

        if (c === '"') { p++; tokens.push({ k: 'qid', v: quoted('"', 'A name in "quotes"'), at: at }); continue; }
        if (c === '`') { p++; tokens.push({ k: 'qid', v: quoted('`', 'A name in `quotes`'), at: at }); continue; }
        if (c === '[') { p++; tokens.push({ k: 'qid', v: quoted(']', 'A name in [brackets]'), at: at }); continue; }

        if ((c >= '0' && c <= '9') || (c === '.' && text[p + 1] >= '0' && text[p + 1] <= '9')) {
            NUMBER.lastIndex = p;
            const m = NUMBER.exec(text);
            p = NUMBER.lastIndex;
            tokens.push({ k: 'num', v: Number(m[0]), int: m[0].indexOf('.') === -1 && m[2] === undefined, at: at });
            continue;
        }

        WORD.lastIndex = p;
        const word = WORD.exec(text);
        if (word !== null && word.index === p) {
            p = WORD.lastIndex;
            tokens.push({ k: 'id', v: word[0], u: word[0].toUpperCase(), at: at });
            continue;
        }

        const two = text.slice(p, p + 2);
        if (TWO_SYMBOLS.indexOf(two) !== -1) { p += 2; tokens.push({ k: 'op', v: two, at: at }); continue; }
        if (ONE_SYMBOL.indexOf(c) !== -1)    { p += 1; tokens.push({ k: 'op', v: c,   at: at }); continue; }

        queryFail('I don\'t know what  ' + c + '  means here' + lineNote(text, at) + '.');
    }
}

//  "  (line 3)"  when the question has more than one line.
function lineNote(text, at) {
    const line = text.slice(0, at).split('\n').length;
    return text.indexOf('\n') === -1 ? '' : '  (line ' + line + ')';
}



// ----------------------------------------------------------
//
//    2.   PARSE   (read the tokens into a tree)
//
//    The tree for   SELECT name FROM people WHERE age > 30   is:
//
//        { t: 'core',
//          items: [ { e: { t: 'col', name: 'name' } } ],
//          from:  { t: 'table', name: 'people' },
//          where: { t: 'cmp', op: '>',  a: { t: 'col', name: 'age' },  b: { t: 'lit', v: 30 } } }
//
//    Every piece is a "node"  with a  t  (its type).   The kinds of nodes:
//
//        lit      a value:  30,  'Chicago',  NULL,  TRUE
//        col      a column:  age,   people.age
//        ref      a column found by its spot  (made for SELECT *)
//        neg      -x
//        bin      x + y,   x - y,   x * y,   x / y,   x % y
//        cat      x || y   (glue words together)
//        cmp      x = y,  <>,  <,  <=,  >,  >=
//        and / or / not
//        isnull   x IS NULL,  x IS NOT NULL
//        isdist   x IS [NOT] DISTINCT FROM y   (like = ,  but NULL = NULL)
//        istrue   x IS [NOT] TRUE / FALSE
//        between  x BETWEEN lo AND hi
//        in       x IN (1, 2, 3)
//        insub    x IN (SELECT ...)
//        exists   EXISTS (SELECT ...)
//        scalar   (SELECT ...)   used as ONE value
//        like     x LIKE 'Chi%'
//        case     CASE WHEN ... THEN ... ELSE ... END
//        cast     CAST(x AS INTEGER),   x::INTEGER
//        fn       a function:  UPPER(x),  COUNT(*),  ROW_NUMBER() OVER (...)
//
//    The way it's read is called "recursive descent":  one little function per piece of the
//    grammar,  calling each other.  The order they call each other decides what goes first:
//        OR  is weakest,  then AND,  NOT,  comparisons,  ||,  + -,  * / %,  and  -x  is strongest.
//    (So   a OR b AND c   means   a OR (b AND c),   and   1 + 2 * 3   is 7.)
//
// ----------------------------------------------------------

//  Words that START a new part of the query,  so they can't be a nickname  ("alias")  without AS.
//  (SELECT price total FROM ...   ->   "total"  is a nickname.    SELECT price FROM ...   ->   FROM is not.)
const SQL_RESERVED = new Set((
    'SELECT FROM WHERE GROUP HAVING ORDER LIMIT OFFSET UNION INTERSECT EXCEPT MINUS JOIN INNER LEFT RIGHT FULL ' +
    'CROSS OUTER NATURAL ON USING AS AND OR NOT IN IS NULL LIKE ILIKE BETWEEN CASE WHEN THEN ELSE END EXISTS ' +
    'DISTINCT ALL BY ASC DESC WITH FETCH WINDOW ESCAPE OVER FILTER INTO VALUES SET'
).split(' '));

const COMPARE_SYMBOLS = new Set(['=', '==', '<>', '!=', '<', '<=', '>', '>=']);

//  Commands that would CHANGE the data.   We read them (to skip them),  but never run them.
const WRITE_COMMANDS = new Set(['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'REPLACE', 'MERGE', 'GRANT', 'REVOKE', 'ATTACH', 'DETACH', 'VACUUM', 'PRAGMA', 'BEGIN', 'COMMIT', 'ROLLBACK', 'USE', 'SET', 'EXEC', 'EXECUTE', 'CALL']);


function parseSql(text) {

    const tk = sqlTokens(text);
    let i = 0;                              //  which token we're on


    //  ---- helpers:  look at the next token,  or "eat" it ----

    function isW(u, ahead) {                //  is the token  (ahead of here)  the word u?
        const t = tk[i + (ahead || 0)];
        return t !== undefined && t.k === 'id' && t.u === u;
    }
    function isO(v, ahead) {                //  ...the symbol v?
        const t = tk[i + (ahead || 0)];
        return t !== undefined && t.k === 'op' && t.v === v;
    }
    function eatW(u) { if (isW(u)) { i++; return true; } return false; }
    function eatO(v) { if (isO(v)) { i++; return true; } return false; }
    function needW(u) { if (!eatW(u)) fail('Expected  ' + u); }
    function needO(v) { if (!eatO(v)) fail('Expected  ' + v); }

    //  Say WHERE it went wrong:   near  "FROM"  (line 2)
    function fail(words) {
        const t = tk[i];
        if (t.k === 'end') queryFail(words + '  (at the end of the query).');
        const shown = text.slice(t.at, tk[i + 1].at).trim() || t.v;
        queryFail(words + '  (near  ' + shown + lineNote(text, t.at) + ').');
    }

    //  A name  (of a column,  a table,  a nickname).
    function name(what) {
        const t = tk[i];
        if (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { i++; return t.v; }
        fail('Expected ' + what);
    }

    //  A nickname after AS:  any word,  or words in quotes.
    function aliasName() {
        const t = tk[i];
        if (t.k === 'qid' || t.k === 'str' || t.k === 'id') { i++; return t.v; }
        fail('Expected a nickname after AS');
    }

    function isQueryStart() { return isW('SELECT') || isW('WITH'); }


    //  ---- THE WHOLE TEXT:  one or more commands,  split by  ;  ----

    function statements() {
        const list = [];
        for (;;) {
            while (eatO(';')) {}
            if (tk[i].k === 'end') return list;
            list.push(statement());
            if (!eatO(';') && tk[i].k !== 'end') fail('Expected the query to end here  (or a  ;  before the next one)');
        }
    }

    function statement() {
        if (isQueryStart() || isO('(')) return query();
        const t = tk[i];
        if (t.k === 'id' && WRITE_COMMANDS.has(t.u)) {
            //  A command that would change the data.  Skip it  (up to the next  ;  that isn't in quotes).
            const verb = t.u;
            while (tk[i].k !== 'end' && !isO(';')) i++;
            return { t: 'write', verb: verb };
        }
        fail('A query starts with  SELECT  (or WITH)');
    }


    //  ---- A QUERY:   [WITH ...]  SELECT ...  [UNION SELECT ...]  [ORDER BY]  [LIMIT]  ----

    function query() {

        const q = { t: 'query', with: null, body: null, order: null, limit: null, offset: null };

        if (eatW('WITH')) {
            if (isW('RECURSIVE')) fail('WITH RECURSIVE isn\'t supported yet');
            q.with = [];
            do {
                const cte = { name: name('a name for the WITH table'), cols: null, q: null };
                if (eatO('(')) { cte.cols = nameList(); needO(')'); }
                needW('AS');
                needO('(');
                cte.q = query();
                needO(')');
                q.with.push(cte);
            } while (eatO(','));
        }

        q.body = setExpr();

        if (eatW('ORDER')) { needW('BY'); q.order = orderList(); }

        if (eatW('LIMIT')) {
            const first = expr();
            if (eatO(',')) { q.offset = first; q.limit = expr(); }      //  MySQL:   LIMIT 10, 5   =  skip 10,  show 5
            else {
                q.limit = first;
                if (eatW('OFFSET')) q.offset = expr();
            }
        } else if (eatW('OFFSET')) {                                    //  OFFSET 10 ROWS  FETCH NEXT 5 ROWS ONLY   (SQL Server,  Oracle)
            q.offset = expr();
            if (!eatW('ROWS')) eatW('ROW');
            if (eatW('FETCH')) fetchFirst(q);
        } else if (eatW('FETCH')) {
            fetchFirst(q);
        }

        return q;
    }

    function fetchFirst(q) {
        if (!eatW('FIRST')) eatW('NEXT');
        q.limit = isW('ROWS') || isW('ROW') ? { t: 'lit', v: 1, ty: 'int' } : expr();
        if (!eatW('ROWS')) eatW('ROW');
        needW('ONLY');
    }

    //  UNION / INTERSECT / EXCEPT:  all the same strength,  left to right  (like SQLite).
    function setExpr() {
        let a = setTerm();
        for (;;) {
            let op;
            if (eatW('UNION'))          op = eatW('ALL') ? 'UNION ALL' : (eatW('DISTINCT'), 'UNION');
            else if (eatW('INTERSECT')) op = 'INTERSECT';
            else if (eatW('EXCEPT') || eatW('MINUS')) op = 'EXCEPT';
            else return a;
            if (op !== 'UNION ALL' && op !== 'UNION' && isW('ALL')) fail(op + ' ALL isn\'t supported yet');
            eatW('DISTINCT');
            a = { t: 'set', op: op, a: a, b: setTerm() };
        }
    }

    function setTerm() {
        if (eatO('(')) {
            const q = query();
            needO(')');
            return { t: 'paren', q: q };
        }
        return core();
    }


    //  ---- ONE SELECT:   SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ...  ----

    function core() {

        needW('SELECT');

        const c = { t: 'core', distinct: false, top: null, items: [], from: null, where: null, group: null, having: null };

        if (eatW('DISTINCT')) c.distinct = true;
        else eatW('ALL');

        //  SQL Server:   SELECT TOP 10 ...    (TOP followed by a number:  otherwise  top  is just a column's name)
        if (isW('TOP') && (tk[i + 1].k === 'num' || isO('(', 1))) {
            i++;
            if (eatO('(')) { c.top = expr(); needO(')'); }
            else c.top = primary();
            if (isW('PERCENT')) fail('TOP ... PERCENT isn\'t supported');
        }

        do c.items.push(selectItem()); while (eatO(','));

        if (eatW('FROM')) c.from = fromList();
        if (eatW('WHERE')) c.where = expr();
        if (eatW('GROUP')) { needW('BY'); c.group = exprList(); }
        if (eatW('HAVING')) c.having = expr();
        if (isW('WINDOW')) fail('Named windows  (WINDOW w AS ...)  aren\'t supported:  write the window inside OVER (...)');

        return c;
    }

    //  One thing to show:    *     people.*     age * 2  AS double_age
    function selectItem() {

        if (eatO('*')) return { star: true, table: null };

        if ((tk[i].k === 'id' || tk[i].k === 'qid') && isO('.', 1) && isO('*', 2)) {
            const table = tk[i].v;
            i += 3;
            return { star: true, table: table };
        }

        const from = tk[i].at;
        const e = expr();
        //  The words it was written with  (its column's name,  if it gets no nickname):   COUNT(*)
        const label = text.slice(from, tk[i].at).trim();

        let alias = null;
        if (eatW('AS')) alias = aliasName();
        else {
            const t = tk[i];
            if (t.k === 'qid' || t.k === 'str' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { alias = t.v; i++; }
        }

        return { star: false, e: e, alias: alias, label: label };
    }


    //  ---- FROM:   tables,  and how they're JOINed  ----

    function fromList() {
        let a = fromJoins();
        while (eatO(',')) a = { t: 'join', kind: 'cross', a: a, b: fromJoins(), on: null, using: null, natural: false };
        return a;
    }

    function fromJoins() {
        let a = fromItem();
        for (;;) {
            const save = i;
            const natural = eatW('NATURAL');
            let kind = null;

            if (eatW('JOIN')) kind = 'inner';
            else if (eatW('INNER')) { needW('JOIN'); kind = 'inner'; }
            else if (eatW('LEFT'))  { eatW('OUTER'); needW('JOIN'); kind = 'left'; }
            else if (eatW('RIGHT')) { eatW('OUTER'); needW('JOIN'); kind = 'right'; }
            else if (eatW('FULL'))  { eatW('OUTER'); needW('JOIN'); kind = 'full'; }
            else if (eatW('CROSS')) { needW('JOIN'); kind = 'cross'; }

            if (kind === null) {
                if (natural) fail('Expected  JOIN  after NATURAL');
                i = save;
                return a;
            }

            const j = { t: 'join', kind: kind, a: a, b: fromItem(), on: null, using: null, natural: natural };

            if (kind !== 'cross' && !natural) {
                if (eatW('ON')) j.on = expr();
                else if (eatW('USING')) { needO('('); j.using = nameList(); needO(')'); }
                else if (kind !== 'inner') fail('Expected  ON  (which rows go together)');
            }
            a = j;
        }
    }

    function fromItem() {

        if (eatO('(')) {
            if (isQueryStart()) {
                const q = query();
                needO(')');
                return { t: 'sub', q: q, alias: tableAlias() };
            }
            const inside = fromList();
            needO(')');
            return inside;
        }

        let tableName = name('a table name');
        while (eatO('.')) tableName = name('a table name');             //  dbo.orders  /  main.orders   ->   just "orders"
        return { t: 'table', name: tableName, alias: tableAlias() };
    }

    function tableAlias() {
        if (eatW('AS')) return aliasName();
        const t = tk[i];
        if (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))) { i++; return t.v; }
        return null;
    }


    //  ---- LISTS ----

    function exprList() {
        const list = [];
        do list.push(expr()); while (eatO(','));
        return list;
    }

    function nameList() {
        const list = [];
        do list.push(name('a column name')); while (eatO(','));
        return list;
    }

    //  ORDER BY  price DESC,  name   (NULLS FIRST / NULLS LAST  too)
    function orderList() {
        const list = [];
        do {
            const item = { e: expr(), desc: false, nulls: null };
            if (eatW('DESC')) item.desc = true;
            else eatW('ASC');
            if (eatW('NULLS')) {
                if (eatW('FIRST')) item.nulls = 'first';
                else { needW('LAST'); item.nulls = 'last'; }
            }
            list.push(item);
        } while (eatO(','));
        return list;
    }


    //  ---- EXPRESSIONS  (weakest first) ----

    function expr() { return orE(); }

    function orE() {
        let a = andE();
        while (eatW('OR')) a = { t: 'or', a: a, b: andE() };
        return a;
    }

    function andE() {
        let a = notE();
        while (eatW('AND')) a = { t: 'and', a: a, b: notE() };
        return a;
    }

    function notE() {
        if (eatW('NOT')) return { t: 'not', e: notE() };
        return predicate();
    }

    //  Comparisons and tests:   =  <  IS NULL  IN (...)  BETWEEN  LIKE
    function predicate() {

        let a = catE();

        for (;;) {

            const t = tk[i];

            if (t.k === 'op' && COMPARE_SYMBOLS.has(t.v)) {
                i++;
                const op = t.v === '==' ? '=' : t.v === '!=' ? '<>' : t.v;
                a = { t: 'cmp', op: op, a: a, b: catE() };
                continue;
            }

            if (eatW('IS')) {
                const not = eatW('NOT');
                if (eatW('NULL')) a = { t: 'isnull', e: a, not: not };
                else if (eatW('DISTINCT')) { needW('FROM'); a = { t: 'isdist', a: a, b: catE(), not: not }; }
                else if (eatW('TRUE'))  a = { t: 'istrue', e: a, v: true,  not: not };
                else if (eatW('FALSE')) a = { t: 'istrue', e: a, v: false, not: not };
                else a = { t: 'isdist', a: a, b: catE(), not: !not };      //  SQLite:   a IS b   =   "a is not distinct from b"
                continue;
            }

            const not = isW('NOT') && (isW('IN', 1) || isW('LIKE', 1) || isW('ILIKE', 1) || isW('BETWEEN', 1));
            if (not) i++;

            if (eatW('IN')) {
                needO('(');
                if (isQueryStart()) a = { t: 'insub', e: a, q: query(), not: not };
                else a = { t: 'in', e: a, list: isO(')') ? [] : exprList(), not: not };
                needO(')');
                continue;
            }

            if (eatW('BETWEEN')) {
                const lo = catE();
                needW('AND');
                a = { t: 'between', e: a, lo: lo, hi: catE(), not: not };
                continue;
            }

            if (eatW('LIKE') || eatW('ILIKE')) {
                const pattern = catE();
                const escape  = eatW('ESCAPE') ? catE() : null;
                a = { t: 'like', e: a, pat: pattern, esc: escape, not: not };
                continue;
            }

            if (not) fail('Expected  IN,  LIKE,  or BETWEEN  after NOT');
            return a;
        }
    }

    function catE() {
        let a = addE();
        while (eatO('||')) a = { t: 'cat', a: a, b: addE() };
        return a;
    }

    function addE() {
        let a = mulE();
        for (;;) {
            if (eatO('+')) a = { t: 'bin', op: '+', a: a, b: mulE() };
            else if (eatO('-')) a = { t: 'bin', op: '-', a: a, b: mulE() };
            else return a;
        }
    }

    function mulE() {
        let a = unaryE();
        for (;;) {
            if (eatO('*')) a = { t: 'bin', op: '*', a: a, b: unaryE() };
            else if (eatO('/')) a = { t: 'bin', op: '/', a: a, b: unaryE() };
            else if (eatO('%')) a = { t: 'bin', op: '%', a: a, b: unaryE() };
            else return a;
        }
    }

    function unaryE() {
        if (eatO('-')) {
            const e = unaryE();
            if (e.t === 'lit' && typeof e.v === 'number') return { t: 'lit', v: -e.v, ty: e.ty };    //  -5  is just a number
            return { t: 'neg', e: e };
        }
        if (eatO('+')) return unaryE();
        let e = primary();
        while (eatO('::')) e = { t: 'cast', e: e, to: typeName() };       //  PostgreSQL:   price::INTEGER
        return e;
    }

    //  The smallest pieces:  a value,  a column,  a function,  (...)
    function primary() {

        const t = tk[i];

        if (t.k === 'num') { i++; return { t: 'lit', v: t.v, ty: t.int && Number.isSafeInteger(t.v) ? 'int' : 'real' }; }
        if (t.k === 'str') { i++; return { t: 'lit', v: t.v, ty: 'text' }; }

        if (t.k === 'op' && t.v === '(') {
            i++;
            if (isQueryStart()) {
                const q = query();
                needO(')');
                return { t: 'scalar', q: q };
            }
            const e = expr();
            needO(')');
            return e;
        }

        if (t.k === 'qid') return columnRef();
        if (t.k !== 'id') fail('Expected a value,  a column,  or a function');

        const u = t.u;

        if (u === 'NULL')  { i++; return { t: 'lit', v: null, ty: 'null' }; }
        if (u === 'TRUE')  { i++; return { t: 'lit', v: true,  ty: 'bool' }; }
        if (u === 'FALSE') { i++; return { t: 'lit', v: false, ty: 'bool' }; }

        if (u === 'CASE') return caseE();

        if ((u === 'CAST' || u === 'TRY_CAST') && isO('(', 1)) {
            i += 2;
            const e = expr();
            needW('AS');
            const to = typeName();
            needO(')');
            return { t: 'cast', e: e, to: to };
        }

        if (u === 'EXISTS' && isO('(', 1)) {
            i += 2;
            const q = query();
            needO(')');
            return { t: 'exists', q: q };
        }

        //  DATE '2024-01-31'    TIMESTAMP '2024-01-31 09:30:00'
        if ((u === 'DATE' || u === 'TIMESTAMP' || u === 'DATETIME') && tk[i + 1].k === 'str') {
            i++;
            const s = tk[i++].v;
            return { t: 'cast', e: { t: 'lit', v: s, ty: 'text' }, to: u === 'DATE' ? 'date' : 'timestamp' };
        }

        if ((u === 'CURRENT_DATE' || u === 'CURRENT_TIMESTAMP' || u === 'CURRENT_TIME') && !isO('(', 1)) {
            i++;
            return { t: 'fn', name: u, args: [], distinct: false, star: false, order: null, filter: null, over: null };
        }

        if (isO('(', 1)) return call();

        if (SQL_RESERVED.has(u)) fail('Expected a value,  a column,  or a function');
        return columnRef();
    }

    //  age    people.age    "my table"."my column"
    function columnRef() {
        const first = tk[i++].v;
        if (!eatO('.')) return { t: 'col', table: null, name: first };
        const second = tk[i];
        if (second.k !== 'id' && second.k !== 'qid') fail('Expected a column name after the dot');
        i++;
        if (eatO('.')) {                                    //  schema.table.column   ->   table.column
            const third = tk[i];
            if (third.k !== 'id' && third.k !== 'qid') fail('Expected a column name after the dot');
            i++;
            return { t: 'col', table: second.v, name: third.v };
        }
        return { t: 'col', table: first, name: second.v };
    }

    function caseE() {
        i++;
        const c = { t: 'case', base: null, whens: [], els: null };
        if (!isW('WHEN')) c.base = expr();                  //  CASE x WHEN 1 THEN ...   (compare x to each)
        while (eatW('WHEN')) {
            const when = expr();
            needW('THEN');
            c.whens.push([when, expr()]);
        }
        if (c.whens.length === 0) fail('Expected  WHEN');
        if (eatW('ELSE')) c.els = expr();
        needW('END');
        return c;
    }

    //  A type name:   INTEGER    VARCHAR(50)    DECIMAL(10, 2)    DOUBLE PRECISION
    function typeName() {
        if (tk[i].k !== 'id') fail('Expected a type,  like INTEGER or TEXT');
        let words = tk[i++].u;
        while (tk[i].k === 'id' && /^(PRECISION|VARYING|INTEGER|INT|CHAR|CHARACTER)$/.test(tk[i].u)) words += ' ' + tk[i++].u;
        if (eatO('(')) {
            while (!isO(')') && tk[i].k !== 'end') i++;
            needO(')');
        }
        return typeClass(words);
    }

    //  A function call:   UPPER(name)    COUNT(*)    COUNT(DISTINCT city)    SUM(x) FILTER (WHERE ...)    RANK() OVER (...)
    function call() {

        const fname = tk[i].u;
        i += 2;                                             //  the name,  and the  (

        const f = { t: 'fn', name: fname, args: [], distinct: false, star: false, order: null, filter: null, over: null };

        //  The ones with their own grammar:
        if (fname === 'EXTRACT') {                          //  EXTRACT(YEAR FROM d)
            const field = tk[i++];
            if (field.k !== 'id' && field.k !== 'str') fail('Expected a part of a date,  like YEAR');
            needW('FROM');
            f.args = [{ t: 'lit', v: field.v.toLowerCase(), ty: 'text' }, expr()];
            needO(')');
            return after(f);
        }
        if (fname === 'POSITION' && !isO(')')) {            //  POSITION('a' IN name)
            const needle = catE();
            if (eatW('IN')) {
                f.name = 'INSTR';
                f.args = [expr(), needle];
                needO(')');
                return after(f);
            }
            f.args = [needle];
            while (eatO(',')) f.args.push(expr());
            needO(')');
            return after(f);
        }
        if (fname === 'SUBSTRING' && !isO(')')) {           //  SUBSTRING(name FROM 2 FOR 3)
            f.args = [expr()];
            if (eatW('FROM')) {
                f.args.push(expr());
                if (eatW('FOR')) f.args.push(expr());
            } else {
                while (eatO(',')) f.args.push(expr());
            }
            needO(')');
            return after(f);
        }
        if (fname === 'TRIM' && !isO(')')) {                //  TRIM(LEADING '0' FROM code)
            let side = 'TRIM';
            if (eatW('BOTH')) side = 'TRIM';
            else if (eatW('LEADING')) side = 'LTRIM';
            else if (eatW('TRAILING')) side = 'RTRIM';
            f.name = side;
            if (eatW('FROM')) { f.args = [expr()]; needO(')'); return after(f); }
            const first = expr();
            if (eatW('FROM')) f.args = [expr(), first];
            else {
                f.args = [first];
                while (eatO(',')) f.args.push(expr());
            }
            needO(')');
            return after(f);
        }

        if (eatO('*')) {
            f.star = true;
            needO(')');
        } else if (!eatO(')')) {
            if (eatW('DISTINCT')) f.distinct = true;
            else eatW('ALL');
            do f.args.push(expr()); while (eatO(','));
            if (eatW('ORDER')) { needW('BY'); f.order = orderList(); }      //  STRING_AGG(name, ', ' ORDER BY name)
            if (eatW('SEPARATOR')) f.args.push(expr());                     //  MySQL:   GROUP_CONCAT(name SEPARATOR '; ')
            needO(')');
        }

        return after(f);
    }

    //  What can come after a function's  ( ... ) :   WITHIN GROUP (...)   FILTER (...)   OVER (...)
    function after(f) {
        if (eatW('WITHIN')) {                               //  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)
            needW('GROUP'); needO('('); needW('ORDER'); needW('BY');
            f.order = orderList();
            f.within = true;
            needO(')');
        }
        if (eatW('FILTER')) {                               //  COUNT(*) FILTER (WHERE price > 10)
            needO('('); needW('WHERE');
            f.filter = expr();
            needO(')');
        }
        if (eatW('OVER')) f.over = windowSpec();
        return f;
    }

    //  OVER (PARTITION BY dept ORDER BY salary DESC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
    function windowSpec() {
        if (!isO('(')) fail('Named windows aren\'t supported:  write the window inside OVER (...)');
        i++;
        const w = { partition: null, order: null, frame: null };
        if (eatW('PARTITION')) { needW('BY'); w.partition = exprList(); }
        if (eatW('ORDER')) { needW('BY'); w.order = orderList(); }
        if (isW('ROWS') || isW('RANGE') || isW('GROUPS')) {
            const unit = tk[i++].u;
            if (unit === 'GROUPS') fail('GROUPS frames aren\'t supported:  use ROWS or RANGE');
            let start, end;
            if (eatW('BETWEEN')) {
                start = frameEdge();
                needW('AND');
                end = frameEdge();
            } else {
                start = frameEdge();
                end = { kind: 'current' };
            }
            w.frame = { unit: unit, start: start, end: end };
        }
        needO(')');
        return w;
    }

    function frameEdge() {
        if (eatW('UNBOUNDED')) {
            if (eatW('PRECEDING')) return { kind: 'first' };
            needW('FOLLOWING');
            return { kind: 'last' };
        }
        if (eatW('CURRENT')) { needW('ROW'); return { kind: 'current' }; }
        const amount = expr();
        if (eatW('PRECEDING')) return { kind: 'before', n: amount };
        needW('FOLLOWING');
        return { kind: 'after', n: amount };
    }


    const list = statements();
    if (list.length === 0) queryFail('There\'s no query to run yet.  Try:   SELECT * FROM ' + 'your_table' + ' LIMIT 10');
    return list;
}


//  What KIND of value a type name means  (the same rules SQLite uses):
//      INT anywhere            ->  int        (INTEGER,  BIGINT,  SMALLINT ...)
//      CHAR / TEXT / CLOB      ->  text       (VARCHAR(50),  NVARCHAR ...)
//      REAL / FLOAT / DOUBLE   ->  real
//      DECIMAL / NUMERIC       ->  num        (a number:  whole or not)
//      BOOL                    ->  bool
//      DATE                    ->  date        (YYYY-MM-DD)
//      DATETIME / TIMESTAMP    ->  timestamp   (YYYY-MM-DD hh:mm:ss)
//      anything else           ->  text
function typeClass(declared) {
    const u = String(declared).toUpperCase();
    if ((/INT/.test(u) && !/INTERVAL|POINT/.test(u)) || /SIGNED/.test(u)) return 'int';
    if (/CHAR|CLOB|TEXT|STRING|UUID|JSON|ENUM/.test(u)) return 'text';
    if (/TIMESTAMP|DATETIME/.test(u)) return 'timestamp';
    if (/^DATE/.test(u)) return 'date';
    if (/REAL|FLOA|DOUB/.test(u)) return 'real';
    if (/DEC|NUMERIC|NUMBER|MONEY/.test(u)) return 'num';
    if (/BOOL|BIT/.test(u)) return 'bool';
    return 'text';
}



// ----------------------------------------------------------
//
//    VALUES
//
//    Inside the engine,  a value is one of these:
//        null                      NULL  (unknown / missing)
//        a number                  42,   3.5
//        some words  (a string)    'Chicago'
//        true / false              (the answer to a comparison)
//
//    Dates are words written as  YYYY-MM-DD  (or  YYYY-MM-DD hh:mm:ss):
//    written that way,  sorting the words sorts the dates.
//
// ----------------------------------------------------------

//  Words that are a number,  all of them:   42    -3.5    1e6     (spaces around are OK)
const NUMBER_WORDS = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/;

//  The number at the START of some words  ('12abc'  ->  12).
const NUMBER_START = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;


//  A value as WORDS.   ty  =  its type,  if known:  a  real  number that's whole shows as  2.0  (like SQLite).
function valueText(v, ty) {
    if (v === null || typeof v === 'string') return v;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (ty === 'real' && Number.isInteger(v) && Math.abs(v) < 1e15) return v.toFixed(1);
    return numberText(v);
}

function numberText(v) {
    if (Number.isInteger(v)) return String(v);
    if (!isFinite(v)) return v > 0 ? 'Inf' : v < 0 ? '-Inf' : 'NaN';
    return String(Number(v.toPrecision(15)));       //  15 digits,  like SQLite:   0.1 + 0.2  ->  0.3
}

//  A value as a NUMBER.   (Words that aren't a number count as 0,  like SQLite:   'abc' + 1  =  1.)
function numOf(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null) return null;
    const m = NUMBER_START.exec(v);
    return m === null ? 0 : Number(m[0]);
}

//  Is it TRUE?   (For WHERE,  HAVING,  CASE WHEN,  AND / OR / NOT.)
function truthy(v) {
    if (v === true) return true;
    if (v === false || v === null) return false;
    return numOf(v) !== 0;
}

//  TRUE / FALSE / NULL   (for AND,  OR,  NOT:  NULL means "we don't know").
function logic(v) {
    return v === null ? null : truthy(v);
}

//  COMPARE 2 values  (neither is NULL):   -1  (a is smaller),   0  (the same),   1  (a is bigger).
//  A number and words that ARE a number  ('42')  compare as numbers.
//  Otherwise,  every number comes before any words  (like SQLite).
function compareValues(a, b) {
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    if (typeof a === 'number') {
        if (typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
        if (NUMBER_WORDS.test(b)) { const nb = Number(b); return a < nb ? -1 : a > nb ? 1 : 0; }
        return -1;
    }
    if (typeof b === 'number') {
        if (NUMBER_WORDS.test(a)) { const na = Number(a); return na < b ? -1 : na > b ? 1 : 0; }
        return 1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
}

//  The order for SORTING  (ORDER BY,  MIN,  MAX):   numbers first  (small to big),  then words  (A to Z).
//  (Strict:  '10' is words here,  so it sorts with the words.  That's what SQLite does.)
function sortValues(a, b) {
    if (typeof a === 'boolean') a = a ? 1 : 0;
    if (typeof b === 'boolean') b = b ? 1 : 0;
    const an = typeof a === 'number', bn = typeof b === 'number';
    if (an && bn) return a < b ? -1 : a > b ? 1 : 0;
    if (an) return -1;
    if (bn) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
}

//  A value as a KEY  (to spot "the same value" fast:  GROUP BY,  DISTINCT,  UNION).
//  1  and  1.0  are the same key.   1  and  '1'  are not  (a number isn't words).
const KEY_NULL = String.fromCharCode(0) + 'N';
const KEY_SPLIT = String.fromCharCode(1);

function keyOf(v) {
    if (v === null) return KEY_NULL;
    if (typeof v === 'number') return 'n' + (v === 0 ? 0 : v);
    if (typeof v === 'boolean') return v ? 'n1' : 'n0';
    return 's' + v;
}

function rowKey(row, count) {
    let key = '';
    for (let j = 0; j < count; j++) key += keyOf(row[j]) + KEY_SPLIT;
    return key;
}

//  A JOIN / IN key:  like keyOf,  but words that ARE a number match the number  ('7'  =  7),
//  unless both sides are words  (then  '007'  and  '7'  stay different,  like SQLite).
function matchKey(v, wordsOnly) {
    if (v === null) return null;
    if (typeof v === 'string' && !wordsOnly && NUMBER_WORDS.test(v)) return 'n' + (Number(v) === 0 ? 0 : Number(v));
    return keyOf(v);
}

function isWordsType(ty) {
    return ty === 'text' || ty === 'date' || ty === 'timestamp';
}

//  When 2 parts of the answer can have different types  (CASE ... THEN 1 ELSE 2.5),  what's the column's type?
function mergeTypes(a, b) {
    if (a === b) return a;
    if (a === 'null') return b;
    if (b === 'null') return a;
    const numbers = ['int', 'real', 'num'];
    if (numbers.indexOf(a) !== -1 && numbers.indexOf(b) !== -1) return a === 'real' || b === 'real' ? 'real' : 'num';
    if (isWordsType(a) && isWordsType(b)) return 'text';
    return 'any';
}



// ----------------------------------------------------------
//
//    DATES
//
//    A date is words like  2024-03-15  or  2024-03-15 09:30:00.
//    To do math with one,  it's turned into a number:  milliseconds since 1970  (in UTC,
//    so time zones and daylight saving never shift it).   Then back into words.
//
// ----------------------------------------------------------

const DATE_WORDS = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?\s*$/i;
const DAY_MS = 86400000;

//  Words  ->  milliseconds   (null if they aren't a date).
//  (The same date shows up again and again in a big file,  so each one is only worked out once:
//   they're remembered,  up to 100,000 of them.)
const knownDates = new Map();

function dateMs(v) {
    if (v === null) return null;
    if (typeof v === 'number') return Math.round((v - 2440587.5) * DAY_MS);         //  a "Julian day" number  (SQLite)
    const s = String(v);
    if (s.length === 3 && s.toLowerCase() === 'now') return nowMs();
    let ms = knownDates.get(s);
    if (ms === undefined) {
        ms = readDate(s);
        if (knownDates.size >= 100000) knownDates.clear();
        knownDates.set(s, ms);
    }
    return ms;
}

function readDate(s) {
    const m = DATE_WORDS.exec(s);
    if (m === null) return null;
    const year = +m[1], month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const ms = utc(year, month - 1, day, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), m[7] ? Math.round(Number(m[7]) * 1000) : 0);
    return ms;
}

//  Date.UTC,  but years 0 to 99 stay years 0 to 99  (Date.UTC turns  45  into 1945).
function utc(y, mo, d, h, mi, s, ms) {
    const t = Date.UTC(y, mo, d === undefined ? 1 : d, h || 0, mi || 0, s || 0, ms || 0);
    if (y >= 0 && y < 100) {
        const x = new Date(t);
        x.setUTCFullYear(x.getUTCFullYear() - 1900);
        return x.getTime();
    }
    return t;
}

//  The clock right now,  as if it were UTC  (so  CURRENT_DATE  is YOUR date,  not London's).
function nowMs() {
    const d = new Date();
    return d.getTime() - d.getTimezoneOffset() * 60000;
}

function pad(n, width) {
    let s = String(Math.abs(n));
    while (s.length < width) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
}

function dateText(ms) {
    if (ms === null) return null;
    const d = new Date(ms);
    return pad(d.getUTCFullYear(), 4) + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2);
}

function dateTimeText(ms) {
    if (ms === null) return null;
    const d = new Date(ms);
    return dateText(ms) + ' ' + pad(d.getUTCHours(), 2) + ':' + pad(d.getUTCMinutes(), 2) + ':' + pad(d.getUTCSeconds(), 2);
}

//  Does it have a time part?   ('2024-03-15'  no,   '2024-03-15 09:30'  yes)
function hasTime(v) {
    return typeof v === 'string' && /\d[T ]\d/.test(v);
}

//  SQLite's date "modifiers":   date(d, '+1 month', 'start of month')
function shiftDate(ms, modifier) {
    if (ms === null || modifier === null) return null;
    const m = String(modifier).trim().toLowerCase();
    const d = new Date(ms);
    let y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
    let h = d.getUTCHours(), mi = d.getUTCMinutes(), s = d.getUTCSeconds(), milli = d.getUTCMilliseconds();

    const move = /^([+-]?\d+(?:\.\d+)?)\s+(year|month|day|hour|minute|second)s?$/.exec(m);
    if (move !== null) {
        const n = Number(move[1]);
        switch (move[2]) {
            case 'year':   y += n; break;
            case 'month':  mo += n; break;
            case 'day':    return ms + n * DAY_MS;
            case 'hour':   return ms + n * 3600000;
            case 'minute': return ms + n * 60000;
            case 'second': return ms + n * 1000;
        }
        return utc(y, mo, day, h, mi, s, milli);
    }
    if (m === 'start of month') return utc(y, mo, 1);
    if (m === 'start of year')  return utc(y, 0, 1);
    if (m === 'start of day')   return utc(y, mo, day);
    const weekday = /^weekday\s+([0-6])$/.exec(m);
    if (weekday !== null) {
        const want = Number(weekday[1]);
        const have = d.getUTCDay();
        return ms + ((want - have + 7) % 7) * DAY_MS;
    }
    if (m === 'localtime' || m === 'utc') return ms;
    return null;
}

//  Apply every modifier  (any one that doesn't make sense  ->  NULL).
function datePlus(args) {
    let ms = dateMs(args[0]);
    for (let k = 1; k < args.length && ms !== null; k++) ms = shiftDate(ms, args[k]);
    return ms;
}

//  STRFTIME('%Y-%m', d)   (SQLite's way of writing a date any way you like)
//  (The common ones get a quick path:  no Date,  just pieces of the words.)
function formatDate(format, ms) {
    if (format === null || ms === null) return null;
    if (format === '%Y' || format === '%Y-%m' || format === '%Y-%m-%d') {
        const day = dateText(ms);
        return format === '%Y' ? day.slice(0, 4) : format === '%Y-%m' ? day.slice(0, 7) : day;
    }
    const d = new Date(ms);
    const startOfYear = utc(d.getUTCFullYear(), 0, 1);
    return String(format).replace(/%([a-zA-Z%])/g, function (all, letter) {
        switch (letter) {
            case 'Y': return pad(d.getUTCFullYear(), 4);
            case 'm': return pad(d.getUTCMonth() + 1, 2);
            case 'd': return pad(d.getUTCDate(), 2);
            case 'H': return pad(d.getUTCHours(), 2);
            case 'M': return pad(d.getUTCMinutes(), 2);
            case 'S': return pad(d.getUTCSeconds(), 2);
            case 'f': return pad(d.getUTCSeconds(), 2) + '.' + pad(d.getUTCMilliseconds(), 3);
            case 'j': return pad(Math.floor((ms - startOfYear) / DAY_MS) + 1, 3);
            case 'w': return String(d.getUTCDay());
            case 'u': return String(d.getUTCDay() || 7);
            case 's': return String(Math.floor(ms / 1000));
            case 'J': return numberText(ms / DAY_MS + 2440587.5);
            case '%': return '%';
            default:  return all;
        }
    });
}

//  One part of a date:   year,  month,  day,  hour,  minute,  second,  quarter,  dow (0 = Sunday),  doy,  week,  epoch
function datePart(part, ms) {
    if (part === null || ms === null) return null;
    const d = new Date(ms);
    switch (String(part).toLowerCase().replace(/s$/, '')) {
        case 'year': case 'yy': case 'yyyy': return d.getUTCFullYear();
        case 'quarter': case 'qq': case 'q': return Math.floor(d.getUTCMonth() / 3) + 1;
        case 'month': case 'mm': case 'm': return d.getUTCMonth() + 1;
        case 'day': case 'dd': case 'd': return d.getUTCDate();
        case 'hour': case 'hh': return d.getUTCHours();
        case 'minute': case 'mi': case 'n': return d.getUTCMinutes();
        case 'second': case 'ss': return d.getUTCSeconds();
        case 'dow': case 'weekday': case 'dw': return d.getUTCDay();
        case 'isodow': return d.getUTCDay() || 7;
        case 'doy': case 'dayofyear': case 'dy': return Math.floor((ms - utc(d.getUTCFullYear(), 0, 1)) / DAY_MS) + 1;
        case 'week': case 'wk': case 'ww': return isoWeek(ms);
        case 'epoch': return Math.floor(ms / 1000);
        default: queryFail('I don\'t know the date part  ' + part + '.  Try:  year,  quarter,  month,  day,  hour,  minute,  second,  dow,  doy,  week.');
    }
}

function isoWeek(ms) {
    const d = new Date(ms);
    const dayNum = d.getUTCDay() || 7;
    const thursday = utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - dayNum);
    const yearStart = utc(new Date(thursday).getUTCFullYear(), 0, 1);
    return Math.ceil(((thursday - yearStart) / DAY_MS + 1) / 7);
}

//  DATE_TRUNC('month', d)   ->   the first moment of that month
function truncateDate(part, ms) {
    if (part === null || ms === null) return null;
    const d = new Date(ms);
    const y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
    switch (String(part).toLowerCase().replace(/s$/, '')) {
        case 'year':    return utc(y, 0, 1);
        case 'quarter': return utc(y, mo - mo % 3, 1);
        case 'month':   return utc(y, mo, 1);
        case 'week':    return utc(y, mo, day - ((d.getUTCDay() + 6) % 7));       //  weeks start on Monday
        case 'day':     return utc(y, mo, day);
        case 'hour':    return utc(y, mo, day, d.getUTCHours());
        case 'minute':  return utc(y, mo, day, d.getUTCHours(), d.getUTCMinutes());
        case 'second':  return utc(y, mo, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
        default: queryFail('I don\'t know how to cut a date to  ' + part + '.  Try:  year,  quarter,  month,  week,  day,  hour,  minute.');
    }
}

//  DATEDIFF(day, start, end):   how many day  (or month,  year ...)  lines you cross going from start to end.
function dateDiff(part, a, b) {
    if (part === null || a === null || b === null) return null;
    const unit = String(part).toLowerCase().replace(/s$/, '');
    const da = new Date(a), db = new Date(b);
    switch (unit) {
        case 'year': case 'yy': case 'yyyy': return db.getUTCFullYear() - da.getUTCFullYear();
        case 'quarter': case 'qq': return (db.getUTCFullYear() * 4 + Math.floor(db.getUTCMonth() / 3)) - (da.getUTCFullYear() * 4 + Math.floor(da.getUTCMonth() / 3));
        case 'month': case 'mm': return (db.getUTCFullYear() * 12 + db.getUTCMonth()) - (da.getUTCFullYear() * 12 + da.getUTCMonth());
        case 'week': case 'wk': return Math.floor((truncateDate('week', b) - truncateDate('week', a)) / (7 * DAY_MS));
        case 'day': case 'dd': case 'd': return Math.round((truncateDate('day', b) - truncateDate('day', a)) / DAY_MS);
        case 'hour': case 'hh': return Math.round((truncateDate('hour', b) - truncateDate('hour', a)) / 3600000);
        case 'minute': case 'mi': return Math.round((truncateDate('minute', b) - truncateDate('minute', a)) / 60000);
        case 'second': case 'ss': return Math.round((truncateDate('second', b) - truncateDate('second', a)) / 1000);
        default: queryFail('I don\'t know the date part  ' + part + '.  Try:  year,  quarter,  month,  week,  day,  hour,  minute,  second.');
    }
}

//  DATEADD(month, 3, d)
function dateAdd(part, amount, ms) {
    if (part === null || amount === null || ms === null) return null;
    const unit = String(part).toLowerCase().replace(/s$/, '');
    const names = { yy: 'year', yyyy: 'year', mm: 'month', m: 'month', dd: 'day', d: 'day', hh: 'hour', mi: 'minute', ss: 'second', wk: 'week', week: 'week', qq: 'quarter', quarter: 'quarter' };
    const u = names[unit] || unit;
    const n = numOf(amount);
    if (u === 'week') return ms + n * 7 * DAY_MS;
    if (u === 'quarter') return shiftDate(ms, (n * 3) + ' months');
    return shiftDate(ms, n + ' ' + u);
}

//  A date as words again:  with its time,  if it had one  (or it's not midnight).
function dateBack(ms, withTime) {
    if (ms === null) return null;
    return withTime || ms % DAY_MS !== 0 ? dateTimeText(ms) : dateText(ms);
}



// ----------------------------------------------------------
//
//    FUNCTIONS   (the ones that work on ONE row at a time)
//
//    Each one says:
//        args   how many it takes:   [fewest, most]   (most = -1:  any number)
//        ty     what type it gives back  (a type name,  or a function of its arguments' types)
//        f      what it does
//        keep   true  =  it handles NULL itself.   Otherwise:  any NULL in  ->  NULL out.
//
// ----------------------------------------------------------

function sameAsFirst(types) { return types[0] === 'null' ? 'any' : types[0]; }
function numberLike(types)  { return types[0] === 'int' ? 'int' : types[0] === 'real' ? 'real' : 'num'; }
function anyOf(types)       { return types.reduce(mergeTypes, 'null'); }

//  SQLite's  substr:   start counts from 1  (or from the END,  if it's below 0).
function substring(s, start, length) {
    const chars = /[\uD800-\uDFFF]/.test(s) ? Array.from(s) : null;
    const len = chars !== null ? chars.length : s.length;
    let p1 = Math.trunc(start);
    let p2 = length === undefined ? len + 1 : Math.trunc(length);
    if (p1 < 0) {
        p1 += len;
        if (p1 < 0) { p2 += p1; p1 = 0; }
    } else if (p1 > 0) {
        p1--;
    } else if (p2 > 0) {
        p2--;
    }
    if (p2 < 0) {
        p1 += p2;
        p2 = -p2;
        if (p1 < 0) { p2 += p1; p1 = 0; }
    }
    if (p2 <= 0) return '';
    return chars !== null ? chars.slice(p1, p1 + p2).join('') : s.substr(p1, p2);
}

function trimChars(s, chars, left, right) {
    const set = chars === undefined ? ' ' : chars;
    let a = 0, b = s.length;
    if (left)  while (a < b && set.indexOf(s[a]) !== -1) a++;
    if (right) while (b > a && set.indexOf(s[b - 1]) !== -1) b--;
    return s.slice(a, b);
}

//  Round half AWAY from zero  (2.5  ->  3,   -2.5  ->  -3),  like SQLite.
function roundTo(x, digits) {
    const d = Math.max(0, Math.min(15, Math.trunc(digits || 0)));
    //  (Like SQLite,  1.005 rounds to 1.0:  the computer really holds  1.00499999...,  just under the half.)
    //  (toFixed works on the EXACT value the computer holds:  2.5 is really 2.5,  so it goes up to 3.)
    return Math.abs(x) >= 1e21 ? x : Math.sign(x) * Number(Math.abs(x).toFixed(d));
}

const QUERY_FUNCTIONS = {

    //  ---- words ----
    UPPER:       { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toUpperCase(); } },
    LOWER:       { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toLowerCase(); } },
    UCASE:       { alias: 'UPPER' },
    LCASE:       { alias: 'LOWER' },
    LENGTH:      { args: [1, 1], ty: 'int',  f: function (s) { const t = valueText(s); return /[\uD800-\uDFFF]/.test(t) ? Array.from(t).length : t.length; } },
    LEN:         { alias: 'LENGTH' },
    CHAR_LENGTH: { alias: 'LENGTH' },
    CHARACTER_LENGTH: { alias: 'LENGTH' },
    SUBSTR:      { args: [2, 3], ty: 'text', f: function (s, start, length) { return substring(valueText(s), numOf(start), length === undefined ? undefined : numOf(length)); } },
    SUBSTRING:   { alias: 'SUBSTR' },
    LEFT:        { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); const t = valueText(s); return k >= 0 ? t.slice(0, k) : t.slice(0, Math.max(0, t.length + k)); } },
    RIGHT:       { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); const t = valueText(s); return k >= 0 ? (k === 0 ? '' : t.slice(-k)) : t.slice(Math.min(t.length, -k)); } },
    TRIM:        { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), true, true); } },
    LTRIM:       { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), true, false); } },
    RTRIM:       { args: [1, 2], ty: 'text', f: function (s, c) { return trimChars(valueText(s), c === undefined ? undefined : valueText(c), false, true); } },
    REPLACE:     { args: [3, 3], ty: 'text', f: function (s, from, to) { const f = valueText(from); return f === '' ? valueText(s) : valueText(s).split(f).join(valueText(to)); } },
    INSTR:       { args: [2, 2], ty: 'int',  f: function (s, find) { return valueText(s).indexOf(valueText(find)) + 1; } },
    STRPOS:      { alias: 'INSTR' },
    CHARINDEX:   { args: [2, 3], ty: 'int',  f: function (find, s, from) { return valueText(s).indexOf(valueText(find), from === undefined ? 0 : Math.max(0, numOf(from) - 1)) + 1; } },
    CONCAT:      { args: [1, -1], ty: 'text', keep: true, f: function () { let out = ''; for (let k = 0; k < arguments.length; k++) if (arguments[k] !== null) out += valueText(arguments[k]); return out; } },
    CONCAT_WS:   { args: [2, -1], ty: 'text', keep: true, f: function (sep) {
                     if (sep === null) return null;
                     const parts = [];
                     for (let k = 1; k < arguments.length; k++) if (arguments[k] !== null) parts.push(valueText(arguments[k]));
                     return parts.join(valueText(sep));
                 } },
    LPAD:        { args: [2, 3], ty: 'text', f: function (s, n, fill) { return padWords(valueText(s), numOf(n), fill === undefined ? ' ' : valueText(fill), true); } },
    RPAD:        { args: [2, 3], ty: 'text', f: function (s, n, fill) { return padWords(valueText(s), numOf(n), fill === undefined ? ' ' : valueText(fill), false); } },
    REVERSE:     { args: [1, 1], ty: 'text', f: function (s) { return Array.from(valueText(s)).reverse().join(''); } },
    REPEAT:      { args: [2, 2], ty: 'text', f: function (s, n) { const k = Math.trunc(numOf(n)); return k > 0 ? valueText(s).repeat(Math.min(k, 1000000)) : ''; } },
    REPLICATE:   { alias: 'REPEAT' },
    SPLIT_PART:  { args: [3, 3], ty: 'text', f: function (s, sep, n) {
                     const parts = valueText(s).split(valueText(sep));
                     const k = Math.trunc(numOf(n));
                     const at = k > 0 ? k - 1 : parts.length + k;
                     return at >= 0 && at < parts.length ? parts[at] : '';
                 } },
    INITCAP:     { args: [1, 1], ty: 'text', f: function (s) { return valueText(s).toLowerCase().replace(/(^|[^A-Za-z0-9])([a-z])/g, function (all, before, letter) { return before + letter.toUpperCase(); }); } },
    CHAR:        { args: [1, -1], ty: 'text', f: function () { let out = ''; for (let k = 0; k < arguments.length; k++) out += String.fromCodePoint(Math.max(0, Math.min(0x10FFFF, numOf(arguments[k])))); return out; } },
    CHR:         { alias: 'CHAR' },
    UNICODE:     { args: [1, 1], ty: 'int', f: function (s) { const t = valueText(s); return t === '' ? null : t.codePointAt(0); } },
    ASCII:       { alias: 'UNICODE' },
    QUOTE:       { args: [1, 1], ty: 'text', keep: true, f: function (v) { return v === null ? 'NULL' : typeof v === 'string' ? "'" + v.split("'").join("''") + "'" : valueText(v); } },

    //  ---- numbers ----
    ABS:     { args: [1, 1], ty: numberLike, f: function (x) { return Math.abs(numOf(x)); } },
    ROUND:   { args: [1, 2], ty: 'real', f: function (x, d) { return roundTo(numOf(x), d === undefined ? 0 : numOf(d)); } },
    FLOOR:   { args: [1, 1], ty: numberLike, f: function (x) { return Math.floor(numOf(x)); } },
    CEIL:    { args: [1, 1], ty: numberLike, f: function (x) { return Math.ceil(numOf(x)); } },
    CEILING: { alias: 'CEIL' },
    TRUNC:   { args: [1, 2], ty: numberLike, f: function (x, d) { const s = Math.pow(10, d === undefined ? 0 : Math.trunc(numOf(d))); return Math.trunc(numOf(x) * s) / s; } },
    TRUNCATE: { alias: 'TRUNC' },
    SIGN:    { args: [1, 1], ty: 'int', f: function (x) { return Math.sign(numOf(x)); } },
    SQRT:    { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n < 0 ? null : Math.sqrt(n); } },
    POWER:   { args: [2, 2], ty: 'real', f: function (x, y) { return Math.pow(numOf(x), numOf(y)); } },
    POW:     { alias: 'POWER' },
    EXP:     { args: [1, 1], ty: 'real', f: function (x) { return Math.exp(numOf(x)); } },
    LN:      { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log(n); } },
    LOG10:   { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log10(n); } },
    LOG2:    { args: [1, 1], ty: 'real', f: function (x) { const n = numOf(x); return n <= 0 ? null : Math.log2(n); } },
    LOG:     { args: [1, 2], ty: 'real', f: function (a, b) {               //  LOG(x)  =  base 10   (SQLite,  PostgreSQL).   LOG(base, x).
                 if (b === undefined) { const n = numOf(a); return n <= 0 ? null : Math.log10(n); }
                 const base = numOf(a), n = numOf(b);
                 return n <= 0 || base <= 0 || base === 1 ? null : Math.log(n) / Math.log(base);
             } },
    MOD:     { args: [2, 2], ty: numberLike, f: function (x, y) { const b = numOf(y); return b === 0 ? null : numOf(x) % b; } },
    PI:      { args: [0, 0], ty: 'real', f: function () { return Math.PI; } },
    RANDOM:  { args: [0, 0], ty: 'real', f: function () { return Math.random(); } },
    RAND:    { alias: 'RANDOM' },
    SIN:     { args: [1, 1], ty: 'real', f: function (x) { return Math.sin(numOf(x)); } },
    COS:     { args: [1, 1], ty: 'real', f: function (x) { return Math.cos(numOf(x)); } },
    TAN:     { args: [1, 1], ty: 'real', f: function (x) { return Math.tan(numOf(x)); } },
    DEGREES: { args: [1, 1], ty: 'real', f: function (x) { return numOf(x) * 180 / Math.PI; } },
    RADIANS: { args: [1, 1], ty: 'real', f: function (x) { return numOf(x) * Math.PI / 180; } },

    //  ---- NULL helpers,  and choosing ----
    COALESCE: { args: [1, -1], ty: anyOf, keep: true, f: function () { for (let k = 0; k < arguments.length; k++) if (arguments[k] !== null) return arguments[k]; return null; } },
    IFNULL:   { args: [2, 2], ty: anyOf, keep: true, f: function (a, b) { return a !== null ? a : b; } },
    NVL:      { alias: 'IFNULL' },
    ISNULL:   { alias: 'IFNULL' },
    NULLIF:   { args: [2, 2], ty: sameAsFirst, keep: true, f: function (a, b) { return a !== null && b !== null && compareValues(a, b) === 0 ? null : a; } },
    IIF:      { args: [3, 3], ty: function (t) { return mergeTypes(t[1], t[2]); }, keep: true, f: function (c, a, b) { return truthy(c) ? a : b; } },
    IF:       { alias: 'IIF' },
    GREATEST: { args: [1, -1], ty: anyOf, keep: true, f: function () { let best = null; for (let k = 0; k < arguments.length; k++) { const v = arguments[k]; if (v !== null && (best === null || compareValues(v, best) > 0)) best = v; } return best; } },
    LEAST:    { args: [1, -1], ty: anyOf, keep: true, f: function () { let best = null; for (let k = 0; k < arguments.length; k++) { const v = arguments[k]; if (v !== null && (best === null || compareValues(v, best) < 0)) best = v; } return best; } },
    //  MIN(a, b) and MAX(a, b) with 2 or more values  (SQLite):  any NULL  ->  NULL.
    MIN_OF:   { args: [2, -1], ty: anyOf, f: function () { let best = arguments[0]; for (let k = 1; k < arguments.length; k++) if (sortValues(arguments[k], best) < 0) best = arguments[k]; return best; } },
    MAX_OF:   { args: [2, -1], ty: anyOf, f: function () { let best = arguments[0]; for (let k = 1; k < arguments.length; k++) if (sortValues(arguments[k], best) > 0) best = arguments[k]; return best; } },
    TYPEOF:   { args: [1, 1], ty: 'text', keep: true, f: function (v) { return v === null ? 'null' : typeof v === 'string' ? 'text' : typeof v === 'boolean' ? 'integer' : Number.isInteger(v) ? 'integer' : 'real'; } },

    //  ---- dates ----
    DATE:       { args: [1, -1], ty: 'date',      f: function () { return dateText(datePlus(Array.from(arguments))); } },
    DATETIME:   { args: [1, -1], ty: 'timestamp', f: function () { return dateTimeText(datePlus(Array.from(arguments))); } },
    TIME:       { args: [1, -1], ty: 'text',      f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : dateTimeText(ms).slice(11); } },
    JULIANDAY:  { args: [1, -1], ty: 'real',      f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : ms / DAY_MS + 2440587.5; } },
    UNIXEPOCH:  { args: [1, -1], ty: 'int',       f: function () { const ms = datePlus(Array.from(arguments)); return ms === null ? null : Math.floor(ms / 1000); } },
    STRFTIME:   { args: [2, -1], ty: 'text',      f: function (format) { return formatDate(format, datePlus(Array.from(arguments).slice(1))); } },
    YEAR:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('year', dateMs(d)); } },
    QUARTER:    { args: [1, 1], ty: 'int', f: function (d) { return datePart('quarter', dateMs(d)); } },
    MONTH:      { args: [1, 1], ty: 'int', f: function (d) { return datePart('month', dateMs(d)); } },
    DAY:        { args: [1, 1], ty: 'int', f: function (d) { return datePart('day', dateMs(d)); } },
    DAYOFMONTH: { alias: 'DAY' },
    HOUR:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('hour', dateMs(d)); } },
    MINUTE:     { args: [1, 1], ty: 'int', f: function (d) { return datePart('minute', dateMs(d)); } },
    SECOND:     { args: [1, 1], ty: 'int', f: function (d) { return datePart('second', dateMs(d)); } },
    DAYOFWEEK:  { args: [1, 1], ty: 'int', f: function (d) { const v = datePart('dow', dateMs(d)); return v === null ? null : v + 1; } },     //  MySQL:  1 = Sunday
    DAYOFYEAR:  { args: [1, 1], ty: 'int', f: function (d) { return datePart('doy', dateMs(d)); } },
    WEEK:       { args: [1, 1], ty: 'int', f: function (d) { return datePart('week', dateMs(d)); } },
    EXTRACT:    { args: [2, 2], ty: 'int', f: function (part, d) { return datePart(part, dateMs(d)); } },
    DATE_PART:  { alias: 'EXTRACT' },
    DATEPART:   { alias: 'EXTRACT' },
    DATE_TRUNC: { args: [2, 2], ty: 'text', f: function (part, d) { return dateBack(truncateDate(part, dateMs(d)), hasTime(d)); } },
    DATEDIFF:   { args: [2, 3], ty: 'int', f: function (a, b, c) {
                    if (c === undefined) {                                      //  MySQL:   DATEDIFF(end, start)  =  days
                        const end = dateMs(a), start = dateMs(b);
                        return end === null || start === null ? null : dateDiff('day', start, end);
                    }
                    return dateDiff(a, dateMs(b), dateMs(c));                   //  SQL Server:   DATEDIFF(day, start, end)
                } },
    DATE_DIFF:  { alias: 'DATEDIFF' },
    DATEADD:    { args: [3, 3], ty: 'text', f: function (part, n, d) { return dateBack(dateAdd(part, n, dateMs(d)), hasTime(d)); } },
    DATE_ADD:   { alias: 'DATEADD' },
    LAST_DAY:   { args: [1, 1], ty: 'date', f: function (d) { const ms = dateMs(d); if (ms === null) return null; const x = new Date(ms); return dateText(utc(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)); } },
    EOMONTH:    { alias: 'LAST_DAY' },
    CURRENT_DATE:      { args: [0, 0], ty: 'date',      f: function () { return dateText(nowMs()); } },
    CURRENT_TIMESTAMP: { args: [0, 0], ty: 'timestamp', f: function () { return dateTimeText(nowMs()); } },
    CURRENT_TIME:      { args: [0, 0], ty: 'text',      f: function () { return dateTimeText(nowMs()).slice(11); } },
    NOW:               { alias: 'CURRENT_TIMESTAMP' },
    GETDATE:           { alias: 'CURRENT_TIMESTAMP' },
    TODAY:             { alias: 'CURRENT_DATE' },
};

//  Date-part words written WITHOUT quotes  (SQL Server:   DATEDIFF(day, a, b)):   day  is a word here,  not a column.
const DATE_PART_FIRST = new Set(['DATEDIFF', 'DATE_DIFF', 'DATEADD', 'DATE_ADD', 'DATEPART', 'DATE_PART', 'DATE_TRUNC']);

function padWords(s, n, fill, left) {
    const width = Math.trunc(n);
    if (width <= 0) return '';
    if (s.length >= width) return s.slice(0, width);
    if (fill === '') return s;
    let extra = '';
    while (extra.length < width - s.length) extra += fill;
    extra = extra.slice(0, width - s.length);
    return left ? extra + s : s + extra;
}

function findFunction(name) {
    let spec = QUERY_FUNCTIONS[name];
    if (spec !== undefined && spec.alias) spec = QUERY_FUNCTIONS[spec.alias];
    return spec;
}



// ----------------------------------------------------------
//
//    TOTALS   (aggregates:  they work on MANY rows at once)
//
//    Each total has 3 steps:
//        start()          a fresh, empty tally
//        add(tally, ...)  one more row's value
//        end(tally)       the answer
//
//    (Like counting votes:  start with an empty sheet,  add a mark per vote,  read the result.)
//    NULLs are skipped by every total  (COUNT(*) counts rows,  so it counts them too).
//
// ----------------------------------------------------------

//  A sum that doesn't lose tiny bits  (adding 0.1 a million times stays close to 100000).
//  "Neumaier summation":  it keeps the bits that fall off,  and adds them back at the end.
function newSum() { return { sum: 0, lost: 0, n: 0, whole: true }; }
function addSum(s, x) {
    const t = s.sum + x;
    if (Math.abs(s.sum) >= Math.abs(x)) s.lost += (s.sum - t) + x;
    else s.lost += (x - t) + s.sum;
    s.sum = t;
    s.n++;
    if (!Number.isInteger(x)) s.whole = false;
}

function sortedNumbers(list) {
    return list.slice().sort(function (a, b) { return a - b; });
}

function percentile(list, p, continuous) {
    if (list.length === 0 || p === null) return null;
    const q = numOf(p);
    if (q < 0 || q > 1) queryFail('A percentile has to be between 0 and 1  (0.5 = the middle).');
    const s = sortedNumbers(list);
    if (!continuous) return s[Math.max(0, Math.ceil(q * s.length) - 1)];
    const at = q * (s.length - 1);
    const lo = Math.floor(at), hi = Math.ceil(at);
    return s[lo] + (s[hi] - s[lo]) * (at - lo);
}

function spread(t, sample, root) {         //  variance  /  standard deviation   (Welford's way:  one pass,  no big rounding errors)
    if (t.n === 0 || (sample && t.n < 2)) return null;
    const v = t.m2 / (sample ? t.n - 1 : t.n);
    return root ? Math.sqrt(v) : v;
}

const QUERY_TOTALS = {
    COUNT:  { ty: function () { return 'int'; },
              start: function () { return { n: 0 }; },
              add: function (t) { t.n++; },
              end: function (t) { return t.n; } },
    SUM:    { ty: numberLike,
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t, ty) { return t.n === 0 ? null : t.sum + t.lost; } },
    TOTAL:  { ty: function () { return 'real'; },
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t) { return t.sum + t.lost; } },
    AVG:    { ty: function () { return 'real'; },
              start: newSum,
              add: function (t, x) { addSum(t, numOf(x)); },
              end: function (t) { return t.n === 0 ? null : (t.sum + t.lost) / t.n; } },
    MIN:    { ty: sameAsFirst,
              start: function () { return { v: null }; },
              add: function (t, x) { if (t.v === null || sortValues(x, t.v) < 0) t.v = x; },
              end: function (t) { return t.v; } },
    MAX:    { ty: sameAsFirst,
              start: function () { return { v: null }; },
              add: function (t, x) { if (t.v === null || sortValues(x, t.v) > 0) t.v = x; },
              end: function (t) { return t.v; } },
    GROUP_CONCAT: { ty: function () { return 'text'; },
              start: function () { return { parts: [] }; },
              add: function (t, x, sep, types) { t.parts.push(t.parts.length === 0 ? valueText(x, types[0]) : (sep === undefined ? ',' : sep === null ? '' : valueText(sep)) + valueText(x, types[0])); },
              end: function (t) { return t.parts.length === 0 ? null : t.parts.join(''); } },
    STRING_AGG: { alias: 'GROUP_CONCAT', needs: 2 },
    LISTAGG:    { alias: 'GROUP_CONCAT' },
    MEDIAN: { ty: function () { return 'real'; },
              start: function () { return { list: [] }; },
              add: function (t, x) { t.list.push(numOf(x)); },
              end: function (t) { return percentile(t.list, 0.5, true); } },
    PERCENTILE_CONT: { ty: function () { return 'real'; },
              start: function () { return { list: [], p: null }; },
              add: function (t, x, p) { t.list.push(numOf(x)); t.p = p; },
              end: function (t) { return percentile(t.list, t.p, true); } },
    PERCENTILE_DISC: { ty: sameAsFirst,
              start: function () { return { list: [], p: null }; },
              add: function (t, x, p) { t.list.push(numOf(x)); t.p = p; },
              end: function (t) { return percentile(t.list, t.p, false); } },
    VAR_SAMP:    { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, true, false); } },
    VAR_POP:     { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, false, false); } },
    STDDEV_SAMP: { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, true, true); } },
    STDDEV_POP:  { ty: function () { return 'real'; }, start: function () { return { n: 0, mean: 0, m2: 0 }; }, add: welford, end: function (t) { return spread(t, false, true); } },
    VARIANCE: { alias: 'VAR_SAMP' },
    VAR:      { alias: 'VAR_SAMP' },
    STDDEV:   { alias: 'STDDEV_SAMP' },
    STDEV:    { alias: 'STDDEV_SAMP' },
    STDEVP:   { alias: 'STDDEV_POP' },
    ANY_VALUE: { ty: sameAsFirst,
              start: function () { return { v: null, seen: false }; },
              add: function (t, x) { if (!t.seen) { t.v = x; t.seen = true; } },
              end: function (t) { return t.v; } },
    BOOL_AND: { ty: function () { return 'bool'; },
              start: function () { return { v: null }; },
              add: function (t, x) { t.v = (t.v === null ? true : t.v) && truthy(x); },
              end: function (t) { return t.v; } },
    BOOL_OR:  { ty: function () { return 'bool'; },
              start: function () { return { v: null }; },
              add: function (t, x) { t.v = (t.v === null ? false : t.v) || truthy(x); },
              end: function (t) { return t.v; } },
    EVERY:    { alias: 'BOOL_AND' },
    MODE:     { ty: sameAsFirst,
              start: function () { return { counts: new Map(), best: null, bestN: 0 }; },
              add: function (t, x) {
                  const k = keyOf(x);
                  const n = (t.counts.get(k) || 0) + 1;
                  t.counts.set(k, n);
                  if (n > t.bestN) { t.bestN = n; t.best = x; }
              },
              end: function (t) { return t.best; } },
};

function welford(t, x) {
    const v = numOf(x);
    t.n++;
    const d = v - t.mean;
    t.mean += d / t.n;
    t.m2 += d * (v - t.mean);
}

//  The window-only functions:  they need the rows IN ORDER,  so they only work with OVER (...).
const WINDOW_ONLY = new Set(['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PERCENT_RANK', 'CUME_DIST', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE']);

function findTotal(name) {
    let spec = QUERY_TOTALS[name];
    if (spec !== undefined && spec.alias) spec = Object.assign({}, QUERY_TOTALS[spec.alias], { needs: spec.needs });
    return spec;
}

//  Is this function call a TOTAL?   (MIN(a, b) with 2 values isn't:  that's "the smaller one".)
function isTotal(node) {
    if (node.t !== 'fn' || node.over !== null) return false;
    if ((node.name === 'MIN' || node.name === 'MAX') && node.args.length > 1) return false;
    return findTotal(node.name) !== undefined;
}

function isWindow(node) {
    return node.t === 'fn' && node.over !== null;
}



// ----------------------------------------------------------
//
//    THE TABLES  (where the rows come from)
//
//    The brain hands the engine its tables  (see "QUERY" in scriptI.js).   Each one is:
//
//        { name,        what it's called in a query   ("sales")
//          columns,     its column names               (["name", "age", "city"])
//          declared,    its column TYPES,  if the file says them  (a SQL dump does).   Otherwise null.
//          rowCount,    how many rows
//          row(i),      row i,  cut into cells          (["Ana", "22", "Chicago"])
//          isNull(i, j) is that cell a real NULL?       (a SQL dump knows.   Otherwise null.)
//          emptyIsNull  true  =  an empty cell means NULL   (a CSV or Excel file:  it has no other way to say it) }
//
//    The engine works out what TYPE each column holds  (it looks at the cells):
//
//        all whole numbers   ->  int          (but not  007:  that's a code,  so it stays words)
//        all numbers         ->  real
//        all dates           ->  date  /  timestamp
//        anything else       ->  text
//
//    A huge file?  It looks at 20,000 rows spread through the file  (not all of them):  quick,
//    and almost always right.   (A cell that doesn't fit its column just stays as words.)
//
// ----------------------------------------------------------

const CELL_INT  = /^[+-]?(0|[1-9]\d{0,14})$/;
const CELL_REAL = /^[+-]?((0|[1-9]\d*)(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const CELL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CELL_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const SAMPLE_ROWS = 20000;
const BITE_CELLS  = 16384;      //  a long job takes a breath every 1,024 rows,  OR after this many CELLS,  whichever comes first
                                //  (1,024 rows of a 10,000-column file is 10 million cells:  seconds,  not a bite)

function columnKinds(table) {
    if (!table.kinds) runNow(lookAtKinds(table));
    return table.kinds;
}

//  The looking itself:  a generator  (see RUN),  so runQuery can do it in bites before a question
//  (20,000 rows of a wide file,  all at once,  would stop the page for a moment).
function* lookAtKinds(table) {

    if (table.kinds) return;

    const width = table.columns.length;

    if (table.declared) {
        table.kinds = table.columns.map(function (name, j) {
            const declared = table.declared[j];
            return declared ? typeClass(declared) : 'text';
        });
        return;
    }

    const canInt = new Array(width).fill(true);
    const canReal = new Array(width).fill(true);
    const canDate = new Array(width).fill(true);
    const canTime = new Array(width).fill(true);
    const anything = new Array(width).fill(false);

    const n = table.rowCount;
    const look = Math.min(n, SAMPLE_ROWS);
    const step = n / look;

    let work = 0;                   //  cells looked at since the last breath
    for (let s = 0; s < look; s++) {
        work += width;
        if ((s & 511) === 511 || work >= BITE_CELLS) { work = 0; yield; }
        const cells = table.row(Math.floor(s * step));
        for (let j = 0; j < width && j < cells.length; j++) {
            const v = cells[j];
            if (v === '') continue;
            anything[j] = true;
            if (canInt[j] && !CELL_INT.test(v)) canInt[j] = false;
            if (canReal[j] && !CELL_REAL.test(v)) canReal[j] = false;
            if (canDate[j] && !CELL_DATE.test(v)) canDate[j] = false;
            if (canTime[j] && !CELL_TIME.test(v) && !CELL_DATE.test(v)) canTime[j] = false;
        }
    }

    table.kinds = canInt.map(function (x, j) {
        if (!anything[j]) return 'text';
        if (canInt[j]) return 'int';
        if (canReal[j]) return 'real';
        if (canDate[j]) return 'date';
        if (canTime[j]) return 'timestamp';
        return 'text';
    });
}

//  Column names a query can use:   an empty name  ->  column1, column2 ...     the same name twice  ->  name_2
function columnNames(table) {
    if (table.names) return table.names;
    const seen = new Map();
    table.names = table.columns.map(function (name, j) {
        let n = String(name).trim() === '' ? 'column' + (j + 1) : String(name);
        const key = n.toLowerCase();
        const times = (seen.get(key) || 0) + 1;
        seen.set(key, times);
        if (times > 1) n = n + '_' + times;
        return n;
    });
    return table.names;
}



// ----------------------------------------------------------
//
//    3.   COMPILE   (turn the tree into little functions)
//
//    Every expression becomes a function:   f(row, env)  ->  its value for that row.
//        row  =  the row's values,  in order   ([ 'Ana', 22, 'Chicago' ])
//        env  =  the rows of the queries AROUND this one  (for a subquery that looks outside itself)
//
//    To build those functions,  the engine has to know where each column IS in the row.
//    A SCOPE is that list:   "name is spot 0,  age is spot 1 ..."
//
//        { cols,     the columns,  in the row's order:   [{ name, table, ty, used }]
//          parent,   the scope of the query AROUND this one  (null = none)
//          owner,    the query this scope belongs to  (so a subquery knows if it looks outside)
//          match,    after GROUP BY:  "is this exactly a group key or a total?  then it's spot N"
//          grouped } after GROUP BY:  the scope from BEFORE grouping  (to say "that column isn't grouped")
//
// ----------------------------------------------------------

function newCol(name, table, ty) {
    return { name: name, key: String(name).toLowerCase(), table: table, tkey: table === null ? null : String(table).toLowerCase(), ty: ty, used: false, hidden: false };
}

//  Find a column in ONE scope.   -1  =  not here.
function findCol(scope, ref) {
    const key  = String(ref.name).toLowerCase();
    const tkey = ref.table === null ? null : String(ref.table).toLowerCase();
    let found = -1;
    for (let j = 0; j < scope.cols.length; j++) {
        const c = scope.cols[j];
        if (c.key !== key) continue;
        if (tkey !== null ? c.tkey !== tkey : c.hidden) continue;
        if (found !== -1) {
            queryFail('The column  ' + ref.name + '  is in more than one table here.  Say which one,  like:   ' +
                      (scope.cols[found].table || 't1') + '.' + ref.name + '   or   ' + (c.table || 't2') + '.' + ref.name);
        }
        found = j;
    }
    return found;
}

//  Find a column,  looking OUTWARD:  this query first,  then the queries around it.
//  depth  =  how many queries out it was found  (0 = this one).
function resolveColumn(scope, ref, quiet) {

    let depth = 0;
    const crossed = [];

    for (let sc = scope; sc !== null; sc = sc.parent, depth++) {

        //  After GROUP BY:  only group keys can be used as they are.
        if (sc.grouped) {
            const j = findCol(sc.grouped, ref);
            if (j !== -1) {
                if (sc.groupSlot.has(j)) return found(sc, sc.groupSlot.get(j), sc.groupTypes[sc.groupSlot.get(j)], depth, sc.grouped.cols[j].name);
                if (quiet) return null;
                queryFail('The column  ' + ref.name + '  has to be in GROUP BY,  or inside a total  (like  MAX(' + ref.name + ')  or  COUNT(' + ref.name + ')).');
            }
        } else {
            const j = findCol(sc, ref);
            if (j !== -1) {
                if (!quiet) sc.cols[j].used = true;
                return found(sc, j, sc.cols[j].ty, depth, sc.cols[j].name);
            }
        }
        if (sc.owner) crossed.push(sc.owner);
    }

    if (quiet) return null;
    const near = scope.grouped ? scope.grouped : scope;
    const names = near.cols.filter(function (c) { return !c.hidden; }).map(function (c) { return c.name; });
    queryFail('There\'s no column named  ' + (ref.table ? ref.table + '.' : '') + ref.name + '.' +
              (names.length > 0 ? '  The columns are:  ' + names.slice(0, 30).join(',  ') + (names.length > 30 ? ' ...' : '') : ''));

    function found(sc, idx, ty, d, name) {
        //  Found it OUTSIDE the query it was written in?  Then that query (and every one in between)
        //  depends on the outside row:  it's "correlated",  and has to run again for every outside row.
        if (!quiet) for (let k = 0; k < crossed.length; k++) markCorrelated(crossed[k], sc.owner);
        return { depth: d, idx: idx, ty: ty, name: name };
    }
}

//  (Up to the query the column was found in:  that one doesn't depend on anything outside.)
function markCorrelated(owner, stop) {
    for (let o = owner; o !== null && o !== undefined && o !== stop; o = o.enclosing) o.correlated = true;
}

//  A tree's "nodePrint":  2 trees that mean the same thing get the same one.
//  (That's how  SELECT YEAR(d) ... GROUP BY YEAR(d)  knows the 2 are the same group key.)
function nodePrint(node, scope) {
    if (node === null || typeof node !== 'object') return JSON.stringify(node === undefined ? null : node);
    if (Array.isArray(node)) {
        let out = '[';
        for (let k = 0; k < node.length; k++) {
            const f = nodePrint(node[k], scope);
            if (f === null) return null;
            out += f + ',';
        }
        return out + ']';
    }
    if (node.t === 'col') {
        const r = resolveColumn(scope, node, true);
        return r === null ? null : 'c' + r.depth + '.' + r.idx;
    }
    if (node.t === 'ref') return 'c0.' + node.idx;
    if (node.q !== undefined) return null;                          //  a subquery:  never "the same"
    let out = '{';
    for (const k in node) {
        if (k === 'label' || k === 'alias') continue;
        const f = nodePrint(node[k], scope);
        if (f === null) return null;
        out += k + ':' + f + ',';
    }
    return out + '}';
}


//  ---- COMPILE ONE EXPRESSION ----
//  Gives back  { f, ty }:   f(row, env)  ->  the value,   ty  =  its type  ('int', 'real', 'num', 'text', 'date', 'timestamp', 'bool', 'null', 'any')

function cx(node, scope, ctx) {

    if (scope.match) {
        const m = scope.match(node);
        if (m !== null) return m;
    }

    switch (node.t) {

        case 'lit': {
            const v = node.v;
            return { f: function () { return v; }, ty: node.ty };
        }

        case 'col': {
            const r = resolveColumn(scope, node, false);
            return reader(r.depth, r.idx, r.ty);
        }

        case 'ref': {                                               //  a column found by its spot  (SELECT *)
            if (scope.grouped) {
                if (!scope.groupSlot.has(node.idx)) queryFail('SELECT *  can\'t be used with GROUP BY:  name the columns you want.');
                const slot = scope.groupSlot.get(node.idx);
                return reader(0, slot, scope.groupTypes[slot]);
            }
            scope.cols[node.idx].used = true;
            return reader(0, node.idx, scope.cols[node.idx].ty);
        }

        case 'neg': {
            const A = cx(node.e, scope, ctx);
            const a = A.f;
            return { f: function (row, env) { const v = a(row, env); return v === null ? null : -numOf(v); }, ty: numberLike([A.ty]) };
        }

        case 'bin':  return compileMath(node, scope, ctx);

        case 'cat': {
            const A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
            const a = A.f, b = B.f, ta = A.ty, tb = B.ty;
            return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                return x === null || y === null ? null : valueText(x, ta) + valueText(y, tb);
            }, ty: 'text' };
        }

        case 'cmp': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            const test = {
                '=':  function (c) { return c === 0; },
                '<>': function (c) { return c !== 0; },
                '<':  function (c) { return c < 0; },
                '<=': function (c) { return c <= 0; },
                '>':  function (c) { return c > 0; },
                '>=': function (c) { return c >= 0; },
            }[node.op];
            return { f: function (row, env) {
                const x = a(row, env);
                if (x === null) return null;
                const y = b(row, env);
                if (y === null) return null;
                return test(compareValues(x, y));
            }, ty: 'bool' };
        }

        case 'and': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            return { f: function (row, env) {
                const x = logic(a(row, env));
                if (x === false) return false;
                const y = logic(b(row, env));
                if (y === false) return false;
                return x === null || y === null ? null : true;
            }, ty: 'bool' };
        }

        case 'or': {
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f;
            return { f: function (row, env) {
                const x = logic(a(row, env));
                if (x === true) return true;
                const y = logic(b(row, env));
                if (y === true) return true;
                return x === null || y === null ? null : false;
            }, ty: 'bool' };
        }

        case 'not': {
            const a = cx(node.e, scope, ctx).f;
            return { f: function (row, env) { const x = logic(a(row, env)); return x === null ? null : !x; }, ty: 'bool' };
        }

        case 'isnull': {
            const a = cx(node.e, scope, ctx).f, not = node.not;
            return { f: function (row, env) { return (a(row, env) === null) !== not; }, ty: 'bool' };
        }

        case 'isdist': {                                            //  a IS NOT DISTINCT FROM b:   like  =,  but NULL = NULL is TRUE
            const a = cx(node.a, scope, ctx).f, b = cx(node.b, scope, ctx).f, not = node.not;
            return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                const same = x === null || y === null ? x === y : compareValues(x, y) === 0;
                return not ? same : !same;
            }, ty: 'bool' };
        }

        case 'istrue': {
            const a = cx(node.e, scope, ctx).f, want = node.v, not = node.not;
            return { f: function (row, env) { const x = logic(a(row, env)); return (x === want) !== not; }, ty: 'bool' };
        }

        case 'between': {
            const e = cx(node.e, scope, ctx).f, lo = cx(node.lo, scope, ctx).f, hi = cx(node.hi, scope, ctx).f, not = node.not;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                const l = lo(row, env), h = hi(row, env);
                const aboveLo = l === null ? null : compareValues(x, l) >= 0;
                const belowHi = h === null ? null : compareValues(x, h) <= 0;
                let inside;
                if (aboveLo === false || belowHi === false) inside = false;
                else if (aboveLo === null || belowHi === null) inside = null;
                else inside = true;
                return inside === null ? null : inside !== not;
            }, ty: 'bool' };
        }

        case 'in': {
            const e = cx(node.e, scope, ctx).f;
            const list = node.list.map(function (item) { return cx(item, scope, ctx).f; });
            const not = node.not;
            return { f: function (row, env) {
                if (list.length === 0) return not;
                const x = e(row, env);
                if (x === null) return null;
                let sawNull = false;
                for (let k = 0; k < list.length; k++) {
                    const y = list[k](row, env);
                    if (y === null) { sawNull = true; continue; }
                    if (compareValues(x, y) === 0) return !not;
                }
                return sawNull ? null : not;
            }, ty: 'bool' };
        }

        case 'insub': {
            const E = cx(node.e, scope, ctx);
            const e = E.f;
            const plan = compileQuery(node.q, scope, ctx);
            if (plan.cols.length !== 1) queryFail('The SELECT inside  IN (...)  has to give back exactly 1 column  (it gives ' + plan.cols.length + ').');
            const wordsOnly = isWordsType(E.ty) && isWordsType(plan.cols[0].ty);
            const not = node.not;
            let cached = null;
            function valuesFor(row, env) {
                if (cached !== null && !plan.owner.correlated) return cached;
                const rows = runNow(plan.run(inner(row, env), Infinity));
                const set = new Set();
                let sawNull = false;
                for (let k = 0; k < rows.length; k++) {
                    const key = matchKey(rows[k][0], wordsOnly);
                    if (key === null) sawNull = true; else set.add(key);
                }
                cached = { set: set, sawNull: sawNull };
                return cached;
            }
            return { f: function (row, env) {
                const x = e(row, env);
                const got = valuesFor(row, env);
                if (got.set.size === 0 && !got.sawNull) return not;
                if (x === null) return null;
                if (got.set.has(matchKey(x, wordsOnly))) return !not;
                return got.sawNull ? null : not;
            }, ty: 'bool' };
        }

        case 'exists': {
            const plan = compileQuery(node.q, scope, ctx);
            let cached = null;
            return { f: function (row, env) {
                if (cached !== null && !plan.owner.correlated) return cached;
                cached = runNow(plan.run(inner(row, env), 1)).length > 0;
                return cached;
            }, ty: 'bool' };
        }

        case 'scalar': {
            const plan = compileQuery(node.q, scope, ctx);
            if (plan.cols.length !== 1) queryFail('A  (SELECT ...)  used as one value has to give back exactly 1 column  (it gives ' + plan.cols.length + ').');
            let cached;
            let have = false;
            return { f: function (row, env) {
                if (have && !plan.owner.correlated) return cached;
                const rows = runNow(plan.run(inner(row, env), 1));
                cached = rows.length > 0 ? rows[0][0] : null;
                have = true;
                return cached;
            }, ty: plan.cols[0].ty };
        }

        case 'like': {
            const e = cx(node.e, scope, ctx).f;
            const P = node.pat, not = node.not;
            const esc = node.esc === null ? null : cx(node.esc, scope, ctx).f;
            //  The pattern never changes?  Build its matcher once.
            const fixed = P.t === 'lit' && (node.esc === null || node.esc.t === 'lit')
                ? (P.v === null ? null : likeMatcher(valueText(P.v), node.esc === null ? null : node.esc.v))
                : undefined;
            const pat = cx(P, scope, ctx).f;
            return { f: function (row, env) {
                const x = e(row, env);
                if (x === null) return null;
                let m = fixed;
                if (m === undefined) {
                    const p = pat(row, env);
                    if (p === null) return null;
                    m = likeMatcher(valueText(p), esc === null ? null : esc(row, env));
                }
                if (m === null) return null;
                return m.test(valueText(x)) !== not;
            }, ty: 'bool' };
        }

        case 'case': {
            const base = node.base === null ? null : cx(node.base, scope, ctx).f;
            const whens = node.whens.map(function (w) { return [cx(w[0], scope, ctx).f, cx(w[1], scope, ctx)]; });
            const els = node.els === null ? null : cx(node.els, scope, ctx);
            let ty = els === null ? 'null' : els.ty;
            whens.forEach(function (w) { ty = mergeTypes(ty, w[1].ty); });
            const elsF = els === null ? null : els.f;
            return { f: function (row, env) {
                const b = base === null ? null : base(row, env);
                for (let k = 0; k < whens.length; k++) {
                    const w = whens[k][0](row, env);
                    const hit = base === null ? truthy(w) : (b !== null && w !== null && compareValues(b, w) === 0);
                    if (hit) return whens[k][1].f(row, env);
                }
                return elsF === null ? null : elsF(row, env);
            }, ty: ty };
        }

        case 'cast': {
            const A = cx(node.e, scope, ctx);
            const a = A.f, from = A.ty;
            const to = node.to;
            return { f: function (row, env) { return castValue(a(row, env), to, from); }, ty: to === 'num' ? 'num' : to };
        }

        case 'fn':  return compileFunction(node, scope, ctx);
    }

    queryFail('Something in this query isn\'t supported yet.');
}

//  A function that reads one spot of the row  (or of an outside row,  for a subquery).
function reader(depth, idx, ty) {
    if (depth === 0) return { f: function (row) { return row[idx]; }, ty: ty };
    const d = depth - 1;
    return { f: function (row, env) { return env.outer[d][idx]; }, ty: ty };
}

//  The env for a subquery run from this row:  this row becomes its nearest "outside row".
function inner(row, env) {
    return { outer: [row].concat(env.outer) };
}

//  + - * / %
function compileMath(node, scope, ctx) {
    const A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
    const a = A.f, b = B.f;
    const real = A.ty === 'real' || B.ty === 'real';
    const ty = A.ty === 'int' && B.ty === 'int' ? 'int' : real ? 'real' : 'num';
    switch (node.op) {
        case '+': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) + numOf(y); }, ty: ty };
        case '-': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) - numOf(y); }, ty: ty };
        case '*': return { f: function (row, env) { const x = a(row, env), y = b(row, env); return x === null || y === null ? null : numOf(x) * numOf(y); }, ty: ty };
        case '/': return { f: function (row, env) {
                //  Two WHOLE numbers  ->  a whole answer  (7 / 2 = 3,  like SQLite,  SQL Server,  PostgreSQL).   Dividing by 0  ->  NULL.
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = numOf(x), ny = numOf(y);
                if (ny === 0) return null;
                return !real && Number.isInteger(nx) && Number.isInteger(ny) ? Math.trunc(nx / ny) : nx / ny;
            }, ty: ty };
        case '%': return { f: function (row, env) {
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = numOf(x), ny = numOf(y);
                if (ny === 0) return null;
                return nx % ny;
            }, ty: ty };
    }
}

//  CAST(x AS type)   (SQLite's rules:   CAST('12abc' AS INTEGER)  =  12,   CAST(3.9 AS INTEGER)  =  3)
function castValue(v, to, from) {
    if (v === null) return null;
    switch (to) {
        case 'int':  { const n = numOf(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }
        case 'real': return numOf(v);
        case 'num':  return numOf(v);
        case 'bool': return truthy(v);
        case 'date': return dateText(dateMs(v));
        case 'timestamp': return dateTimeText(dateMs(v));
        default:     return valueText(v, from);
    }
}

//  LIKE 'Chi%':   %  =  any letters,   _  =  one letter.   (Big and small letters count as the same,  like SQLite.)
function likeMatcher(pattern, escape) {
    const ANY  = /[\s\S]*/.source;
    const ONE  = /[\s\S]/.source;
    const esc  = escape === null || escape === undefined ? null : String(escape);
    let out = '^';
    for (let k = 0; k < pattern.length; k++) {
        const ch = pattern[k];
        if (esc !== null && ch === esc) {
            k++;
            if (k < pattern.length) out += regexLetter(pattern[k]);
            continue;
        }
        out += ch === '%' ? ANY : ch === '_' ? ONE : regexLetter(ch);
    }
    return new RegExp(out + '$', 'i');
}

function regexLetter(ch) {
    return /[.*+?^${}()|[\]\\\/-]/.test(ch) ? '\\' + ch : ch;
}


//  ---- FUNCTIONS ----
function compileFunction(node, scope, ctx) {

    const name = node.name;

    if (isWindow(node)) queryFail(name + '(...) OVER (...)  can only be used in SELECT or ORDER BY.');
    if (WINDOW_ONLY.has(name)) queryFail(name + '()  needs  OVER (...)  after it,  like:   ' + name + '() OVER (ORDER BY price)');
    if (isTotal(node)) queryFail(name + '(...)  totals many rows,  so it can\'t be used here.  (Use it in SELECT or HAVING,  or inside a subquery.)');
    if (node.filter !== null) queryFail('FILTER (WHERE ...)  only works on totals,  like  COUNT(*) FILTER (WHERE ...).');

    let spec = (name === 'MIN' || name === 'MAX') ? QUERY_FUNCTIONS[name + '_OF'] : findFunction(name);
    if (spec === undefined) queryFail('I don\'t know the function  ' + name + '(...).');

    if (node.star) queryFail(name + '(*)  doesn\'t work:  only  COUNT(*)  takes a star.');
    const n = node.args.length;
    if (n < spec.args[0] || (spec.args[1] !== -1 && n > spec.args[1])) {
        const want = spec.args[0] === spec.args[1] ? String(spec.args[0]) : spec.args[1] === -1 ? spec.args[0] + ' or more' : spec.args[0] + ' to ' + spec.args[1];
        queryFail(name + '(...)  takes ' + want + ' value' + (want === '1' ? '' : 's') + ',  not ' + n + '.');
    }

    //  DATEDIFF(day, a, b):   the  day  is a word,  not a column.
    const args = node.args.map(function (arg, k) {
        if (k === 0 && DATE_PART_FIRST.has(name) && arg.t === 'col' && arg.table === null && resolveColumn(scope, arg, true) === null) {
            return { f: (function (word) { return function () { return word; }; })(arg.name.toLowerCase()), ty: 'text' };
        }
        return cx(arg, scope, ctx);
    });

    const fs = args.map(function (a) { return a.f; });
    const types = args.map(function (a) { return a.ty; });
    const ty = typeof spec.ty === 'function' ? spec.ty(types) : spec.ty;
    const go = spec.f, keep = spec.keep === true;

    //  The common sizes get their own fast versions.
    if (n === 0) return { f: function () { return go(); }, ty: ty };
    if (n === 1) {
        const a = fs[0];
        return { f: function (row, env) { const x = a(row, env); return x === null && !keep ? null : go(x); }, ty: ty };
    }
    if (n === 2) {
        const a = fs[0], b = fs[1];
        return { f: function (row, env) {
            const x = a(row, env), y = b(row, env);
            return !keep && (x === null || y === null) ? null : go(x, y);
        }, ty: ty };
    }
    if (n === 3) {
        const a = fs[0], b = fs[1], c = fs[2];
        return { f: function (row, env) {
            const x = a(row, env), y = b(row, env), z = c(row, env);
            return !keep && (x === null || y === null || z === null) ? null : go(x, y, z);
        }, ty: ty };
    }
    return { f: function (row, env) {
        const vals = new Array(n);
        for (let k = 0; k < n; k++) {
            vals[k] = fs[k](row, env);
            if (vals[k] === null && !keep) return null;
        }
        return go.apply(null, vals);
    }, ty: ty };
}


//  ---- A TOTAL  (COUNT,  SUM ...)  ----
//  Gives back  { ty,  start(),  add(tally, row, env),  end(tally) }
//  inWindow  =  it's a window's total  (SUM(...) OVER):  a total inside it is fine  (that's the group's total,  worked out first).
function compileTotal(node, scope, ctx, inWindow) {

    const name = node.name;
    const spec = findTotal(name);

    if (node.star && name !== 'COUNT') queryFail(name + '(*)  doesn\'t work:  only  COUNT(*)  takes a star.');

    let argNodes = node.args;
    if (node.within) {                                          //  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)   ->   (price, 0.5)
        if (node.order.length !== 1) queryFail('WITHIN GROUP (ORDER BY ...)  takes exactly 1 column.');
        argNodes = [node.order[0].e].concat(node.args);
    }

    if (!node.star) {
        const want = spec.needs || (name === 'PERCENTILE_CONT' || name === 'PERCENTILE_DISC' ? 2 : 1);
        const most = name === 'GROUP_CONCAT' || name === 'STRING_AGG' || name === 'LISTAGG' ? 2 : want;
        if (argNodes.length < want || argNodes.length > most) {
            queryFail(name + '(...)  takes ' + (want === most ? want : want + ' or ' + most) + ' value' + (most === 1 ? '' : 's') + ',  not ' + argNodes.length + '.');
        }
    }

    //  Inside a total,  another total doesn't make sense:   SUM(COUNT(x))
    if (!inWindow) argNodes.forEach(function (a) {
        walk(a, function (x) {
            if (isTotal(x)) queryFail('A total can\'t go inside another total  (like  SUM(COUNT(x))).  Try a subquery.');
            return x.q === undefined;
        });
    });

    const args = argNodes.map(function (a) { return cx(a, scope, ctx); });
    const fs = args.map(function (a) { return a.f; });
    const types = args.map(function (a) { return a.ty; });
    const filter = node.filter === null ? null : cx(node.filter, scope, ctx).f;
    const order = node.order !== null && !node.within
        ? node.order.map(function (o) { return { f: cx(o.e, scope, ctx).f, desc: o.desc, nulls: o.nulls }; })
        : null;
    const distinct = node.distinct;
    const star = node.star;
    const ty = spec.ty(types);
    const add = spec.add, end = spec.end;

    return {
        ty: ty,
        start: function () {
            const t = { t: spec.start(), seen: distinct ? new Set() : null, list: order !== null ? [] : null };
            return t;
        },
        add: function (tally, row, env) {
            if (filter !== null && !truthy(filter(row, env))) return;
            if (star) { tally.t.n++; return; }
            const x = fs[0](row, env);
            if (x === null) return;
            if (distinct) {
                const key = keyOf(x);
                if (tally.seen.has(key)) return;
                tally.seen.add(key);
            }
            const extra = fs.length > 1 ? fs[1](row, env) : undefined;
            if (order !== null) {
                tally.list.push([x, extra, order.map(function (o) { return o.f(row, env); })]);
                return;
            }
            add(tally.t, x, extra, types);
        },
        end: function (tally) {
            if (order !== null) {
                //  An ordered total  (STRING_AGG(name, ', ' ORDER BY name)):   sort what was collected,  then add it up in that order.
                const sorted = tally.list.slice().sort(function (p, q) { return compareKeys(p[2], q[2], order); });
                const t = spec.start();
                for (let k = 0; k < sorted.length; k++) add(t, sorted[k][0], sorted[k][1], types);
                return end(t, ty);
            }
            return end(tally.t, ty);
        },
    };
}

//  Visit every node in a tree.   visit(node)  returns false  =  don't look inside this one.
function walk(node, visit) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (let k = 0; k < node.length; k++) walk(node[k], visit); return; }
    if (node.t !== undefined && visit(node) === false) return;
    for (const k in node) {
        if (k === 'q') continue;                                    //  a subquery has its own totals
        const v = node[k];
        if (v !== null && typeof v === 'object') walk(v, visit);
    }
}

//  Compare 2 lists of sort keys,  by the ORDER BY's rules  (DESC,  NULLS FIRST / LAST).
//  NULLs come first going up  (ASC)  and last going down  (DESC),  like SQLite.
function compareKeys(a, b, order) {
    for (let k = 0; k < order.length; k++) {
        const c = compareOne(a[k], b[k], order[k]);
        if (c !== 0) return c;
    }
    return 0;
}

function compareOne(x, y, how) {
    if (x === null || y === null) {
        if (x === null && y === null) return 0;
        const nullsFirst = how.nulls === null ? !how.desc : how.nulls === 'first';
        return (x === null) === nullsFirst ? -1 : 1;
    }
    const c = sortValues(x, y);
    return how.desc ? -c : c;
}



// ----------------------------------------------------------
//
//    WINDOW FUNCTIONS   (ROW_NUMBER,  RANK,  LAG,  running totals ...)
//
//    A total squashes many rows into ONE.   A window function DOESN'T:
//    every row keeps its place,  and gets a value worked out from the rows AROUND it.
//
//        SELECT name, salary,
//               RANK() OVER (PARTITION BY dept ORDER BY salary DESC)        ->  1, 2, 3 ...  inside each dept
//               SUM(salary) OVER (ORDER BY hired)                           ->  a running total
//
//    PARTITION BY  =  split the rows into groups  (each group is counted on its own)
//    ORDER BY      =  the order inside each group
//    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW   =  which rows around this one count  (the "frame")
//
// ----------------------------------------------------------

function compileWindow(node, scope, ctx) {

    const name = node.name;
    const over = node.over;

    const partition = (over.partition || []).map(function (e) { return cx(e, scope, ctx).f; });
    const order = (over.order || []).map(function (o) { return { f: cx(o.e, scope, ctx).f, desc: o.desc, nulls: o.nulls }; });

    let kind;
    if (WINDOW_ONLY.has(name)) kind = name;
    else if (findTotal(name) !== undefined && !((name === 'MIN' || name === 'MAX') && node.args.length > 1)) kind = 'TOTAL';
    else queryFail(name + '(...)  can\'t be used with OVER (...).');

    let total = null;
    let args = [];
    if (kind === 'TOTAL') {
        if (node.order !== null) queryFail('An ordered total  (... ORDER BY ...)  can\'t also have OVER (...).');
        total = compileTotal(Object.assign({}, node, { over: null }), scope, ctx, true);
    } else {
        args = node.args.map(function (a) { return cx(a, scope, ctx); });
        const wantArgs = { ROW_NUMBER: [0, 0], RANK: [0, 0], DENSE_RANK: [0, 0], PERCENT_RANK: [0, 0], CUME_DIST: [0, 0],
                           NTILE: [1, 1], LAG: [1, 3], LEAD: [1, 3], FIRST_VALUE: [1, 1], LAST_VALUE: [1, 1], NTH_VALUE: [2, 2] }[name];
        if (args.length < wantArgs[0] || args.length > wantArgs[1]) queryFail(name + '(...)  takes ' + (wantArgs[0] === wantArgs[1] ? wantArgs[0] : wantArgs[0] + ' to ' + wantArgs[1]) + ' value(s),  not ' + args.length + '.');
    }

    const ty = kind === 'TOTAL' ? total.ty
        : kind === 'PERCENT_RANK' || kind === 'CUME_DIST' ? 'real'
        : kind === 'LAG' || kind === 'LEAD' ? (args.length > 2 ? mergeTypes(args[0].ty, args[2].ty) : args[0].ty)
        : kind === 'FIRST_VALUE' || kind === 'LAST_VALUE' || kind === 'NTH_VALUE' ? args[0].ty
        : 'int';

    //  The frame:   where it starts and ends,  around each row.
    const frame = over.frame;
    if (frame !== null && frame.unit === 'RANGE' && (frame.start.kind === 'before' || frame.start.kind === 'after' || frame.end.kind === 'before' || frame.end.kind === 'after')) {
        queryFail('RANGE frames can only use  UNBOUNDED  and  CURRENT ROW.   For "the 3 rows before",  use  ROWS BETWEEN 3 PRECEDING AND CURRENT ROW.');
    }
    function edgeAmount(edge) {
        if (edge.n === undefined) return 0;
        const v = edge.n.t === 'lit' ? edge.n.v : null;
        if (typeof v !== 'number' || v < 0) queryFail('The frame needs a plain number,  like  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.');
        return Math.trunc(v);
    }
    const startKind = frame === null ? 'first' : frame.start.kind;
    const endKind   = frame === null ? (order.length > 0 ? 'current' : 'last') : frame.end.kind;
    const startN = frame === null ? 0 : edgeAmount(frame.start);
    const endN   = frame === null ? 0 : edgeAmount(frame.end);
    const peersCount = frame === null ? order.length > 0 : frame.unit === 'RANGE';     //  RANGE:  rows that tie with this one count as "this row" too

    return {
        ty: ty,

        //  Work it out for ALL the rows at once.   Gives back one value per row  (in the rows' order).
        compute: function* (rows, env) {

            const out = new Array(rows.length).fill(null);

            //  1.  Split into partitions.
            const parts = new Map();
            for (let r = 0; r < rows.length; r++) {
                let key = '';
                for (let k = 0; k < partition.length; k++) key += keyOf(partition[k](rows[r], env)) + KEY_SPLIT;
                let list = parts.get(key);
                if (list === undefined) { list = []; parts.set(key, list); }
                list.push(r);
                if ((r & 4095) === 4095) yield;
            }

            const keys = new Array(rows.length);                //  each row's sort keys  (one list,  shared by every partition)

            for (const list of parts.values()) {

                //  2.  Sort each partition  (keeping the original order for ties).
                if (order.length > 0) {
                    for (let k = 0; k < list.length; k++) {
                        const r = list[k];
                        keys[r] = order.map(function (o) { return o.f(rows[r], env); });
                        if ((k & 8191) === 8191) yield;
                    }
                    const sorted = yield* sortRows(list, function (a, b) { return compareKeys(keys[a], keys[b], order) || a - b; });
                    for (let k = 0; k < sorted.length; k++) list[k] = sorted[k];
                }

                const n = list.length;
                function tie(a, b) { return order.length === 0 || compareKeys(keys[list[a]], keys[list[b]], order) === 0; }

                //  Where each run of ties ("peers") starts and ends.
                const peerStart = new Int32Array(n), peerEnd = new Int32Array(n);
                for (let p = 0; p < n; p++) peerStart[p] = p > 0 && tie(p, p - 1) ? peerStart[p - 1] : p;
                for (let p = n - 1; p >= 0; p--) peerEnd[p] = p < n - 1 && tie(p, p + 1) ? peerEnd[p + 1] : p;

                //  3.  The value for each row.
                if (kind === 'ROW_NUMBER') for (let p = 0; p < n; p++) out[list[p]] = p + 1;
                else if (kind === 'RANK') for (let p = 0; p < n; p++) out[list[p]] = peerStart[p] + 1;
                else if (kind === 'DENSE_RANK') {
                    let rank = 0;
                    for (let p = 0; p < n; p++) { if (peerStart[p] === p) rank++; out[list[p]] = rank; }
                }
                else if (kind === 'PERCENT_RANK') for (let p = 0; p < n; p++) out[list[p]] = n > 1 ? peerStart[p] / (n - 1) : 0;
                else if (kind === 'CUME_DIST') for (let p = 0; p < n; p++) out[list[p]] = (peerEnd[p] + 1) / n;
                else if (kind === 'NTILE') {
                    const buckets = Math.trunc(numOf(args[0].f(rows[list[0]], env)));
                    if (!(buckets > 0)) queryFail('NTILE(...)  needs a number above 0.');
                    const size = Math.floor(n / buckets), extra = n % buckets;
                    let p = 0;
                    for (let b = 1; b <= buckets && p < n; b++) {
                        const count = size + (b <= extra ? 1 : 0);
                        for (let c = 0; c < count; c++) out[list[p++]] = b;
                    }
                }
                else if (kind === 'LAG' || kind === 'LEAD') {
                    for (let p = 0; p < n; p++) {
                        const row = rows[list[p]];
                        const off = args.length > 1 ? args[1].f(row, env) : 1;
                        const step = off === null ? 0 : Math.trunc(numOf(off));
                        const q = kind === 'LAG' ? p - step : p + step;
                        out[list[p]] = q >= 0 && q < n ? args[0].f(rows[list[q]], env) : (args.length > 2 ? args[2].f(row, env) : null);
                    }
                }
                else {
                    //  FIRST_VALUE,  LAST_VALUE,  NTH_VALUE,  and totals:   they look at the FRAME around each row.
                    let prevEnd = -1;
                    let tally = null;
                    const growing = startKind === 'first';          //  the frame always starts at the top:  just keep adding  (fast)
                    for (let p = 0; p < n; p++) {
                        let s = startKind === 'first' ? 0 : startKind === 'current' ? (peersCount ? peerStart[p] : p) : startKind === 'before' ? p - startN : startKind === 'after' ? p + startN : n;
                        let e = endKind === 'last' ? n - 1 : endKind === 'current' ? (peersCount ? peerEnd[p] : p) : endKind === 'after' ? p + endN : endKind === 'before' ? p - endN : -1;
                        if (s < 0) s = 0;
                        if (e > n - 1) e = n - 1;

                        if (kind === 'TOTAL') {
                            if (growing) {
                                if (tally === null) tally = total.start();
                                for (let q = prevEnd + 1; q <= e; q++) total.add(tally, rows[list[q]], env);
                                if (e > prevEnd) prevEnd = e;
                                out[list[p]] = total.end(tally);
                            } else {
                                const t = total.start();
                                for (let q = s; q <= e; q++) total.add(t, rows[list[q]], env);
                                out[list[p]] = total.end(t);
                            }
                        } else {
                            let q = -1;
                            if (kind === 'FIRST_VALUE') q = s;
                            else if (kind === 'LAST_VALUE') q = e;
                            else {
                                const nth = Math.trunc(numOf(args[1].f(rows[list[p]], env)));
                                if (!(nth > 0)) queryFail('NTH_VALUE(..., n)  needs n above 0.');
                                q = s + nth - 1;
                            }
                            out[list[p]] = q >= s && q <= e && q >= 0 && q < n ? args[0].f(rows[list[q]], env) : null;
                        }
                        if ((p & 1023) === 1023) yield;
                    }
                }
                yield;
            }
            return out;
        },
    };
}



// ----------------------------------------------------------
//
//    4.   RUN
//
//    Running is done with "generators"  (function*).   A generator can PAUSE  (yield)  in the middle
//    of its work,  and pick up right where it left off.   The engine pauses every few thousand rows;
//    the driver  (runQuery,  at the bottom)  checks the clock,  and when a bite's time is up,
//    lets the page breathe before going on.   So a huge query never freezes the page.
//
//    (A number it yields  =  how far along it is,  0 to 1,  for the progress pie.)
//
//    Rows flow like water through pipes:  a SOURCE  (a table,  a JOIN)  hands each row to a
//    "sink"  function  (the next step:  WHERE,  then GROUP BY ...).   A sink says  false  =  "I have
//    enough,  stop"  (that's how  LIMIT 10  on a million rows only reads 10 of them).
//
// ----------------------------------------------------------

//  Run a generator all the way,  with no pauses  (for a subquery,  inside one row's work).
function runNow(gen) {
    let step = gen.next();
    while (!step.done) step = gen.next();
    return step.value;
}

//  Collect all of a source's rows into a list.
function* collect(source, env) {
    const rows = [];
    yield* source.scan(env, function (row) { rows.push(row); return true; });
    return rows;
}


//  ---- SOURCES ----
//  A source is   { cols,  scan(env, sink) }:   its columns,  and a generator that hands every row to  sink.

//  A table from the brain:  its rows,  cut into cells,  turned into values.
function tableSource(table, alias) {

    const names = columnNames(table);
    const kinds = columnKinds(table);
    const cols  = names.map(function (n, j) { return newCol(n, alias, kinds[j]); });
    const width = cols.length;

    return {
        cols: cols,
        scan: function* (env, sink) {

            //  Only the columns the query USES get turned into values  (a query about 2 columns of 40 is much quicker).
            const used = [];
            for (let j = 0; j < width; j++) if (cols[j].used) used.push(j);
            const numeric = used.map(function (j) { return kinds[j] === 'int' || kinds[j] === 'real' || kinds[j] === 'num'; });
            const isNull = table.isNull || null;
            const emptyIsNull = table.emptyIsNull !== false;
            const n = table.rowCount;
            const emptyRow = new Array(width).fill(null);
            let work = 0;                   //  cells cut since the last breath  (a row is cut whole,  even for 2 columns)

            for (let i = 0; i < n; i++) {

                work += used.length === 0 ? 1 : width;
                if ((i & 1023) === 1023 || work >= BITE_CELLS) { work = 0; yield i / n; }

                //  (No columns used at all,  like COUNT(*)?   Then every row can be the same empty one.)
                const row = used.length === 0 ? emptyRow : new Array(width);
                if (used.length > 0) {
                    const cells = table.row(i);
                    for (let u = 0; u < used.length; u++) {
                        const j = used[u];
                        const s = cells[j];
                        let v;
                        if (s === undefined) v = null;
                        else if (s === '') v = (isNull !== null && isNull(i, j)) || (isNull === null && emptyIsNull) ? null : '';
                        else if (numeric[u] && CELL_REAL.test(s)) v = Number(s);       //  (a cell that isn't a number stays as words)
                        else v = s;
                        row[j] = v;
                    }
                }
                if (!sink(row)) return;
            }
        },
    };
}

//  The rows of a query  (a subquery in FROM,  or a WITH table).
function planSource(plan, alias, cached) {
    const cols = plan.cols.map(function (c) { return newCol(c.name, alias, c.ty); });
    return {
        cols: cols,
        scan: function* (env, sink) {
            let rows;
            if (cached) {
                if (cached.rows === null) cached.rows = yield* plan.run(env, Infinity);
                rows = cached.rows;
            } else {
                rows = yield* plan.run(env, Infinity);
            }
            for (let k = 0; k < rows.length; k++) {
                if ((k & 4095) === 4095) yield;
                if (!sink(rows[k])) return;
            }
        },
    };
}

//  No FROM at all  (SELECT 1 + 1):  one empty row.
function oneRowSource() {
    return { cols: [], scan: function* (env, sink) { sink([]); } };
}


//  ---- FROM ----
function compileFrom(item, parent, ctx) {

    if (item.t === 'table') {
        const cte = ctx.ctes.get(String(item.name).toLowerCase());
        if (cte !== undefined) return planSource(cte.plan, item.alias || cte.name, cte);
        const table = ctx.catalog.find(item.name);
        if (table === null) {
            const names = ctx.catalog.names();
            queryFail('There\'s no table named  ' + item.name + '.' + (names.length > 0 ? '  The tables you can use:  ' + names.join(',  ') : ''));
        }
        return tableSource(table, item.alias || table.name);
    }

    if (item.t === 'sub') {
        const plan = compileQuery(item.q, parent, ctx);
        return planSource(plan, item.alias, null);
    }

    return compileJoin(item, parent, ctx);
}


//  ---- JOIN ----
//
//  Which rows of table A go with which rows of table B?   The ON says:   ON orders.customer_id = customers.id
//
//  The slow way:  check EVERY pair  (A's rows  ×  B's rows:  a million pairs for 1,000 × 1,000).
//  The fast way  (a "hash join"):  put B's rows in a lookup  by their  id,  then for each row of A,
//  look up its  customer_id  directly.   The engine uses the fast way whenever the ON has an  =  like that.
//
//      INNER JOIN   only pairs that match
//      LEFT JOIN    every row of A  (no match?  B's columns are NULL)
//      RIGHT JOIN   every row of B
//      FULL JOIN    every row of both
//      CROSS JOIN   every pair  (no ON)
//
function compileJoin(j, parent, ctx) {

    const A = compileFrom(j.a, parent, ctx);
    const B = compileFrom(j.b, parent, ctx);
    const wa = A.cols.length, wb = B.cols.length;
    const cols = A.cols.concat(B.cols);
    const scope = { cols: cols, parent: parent, owner: ctx.owner, match: null };

    //  USING (id)  and  NATURAL JOIN:   "the columns with the same name must match".
    let on = j.on;
    let names = j.using;
    if (j.natural) {
        names = A.cols.filter(function (c) { return !c.hidden && B.cols.some(function (d) { return !d.hidden && d.key === c.key; }); })
                      .map(function (c) { return c.name; });
    }
    if (names !== null && names !== undefined) {
        names.forEach(function (n) {
            const ia = findCol({ cols: A.cols }, { table: null, name: n });
            const ib = findCol({ cols: B.cols }, { table: null, name: n });
            if (ia === -1 || ib === -1) queryFail('USING (' + n + '):  both tables need a column named  ' + n + '.');
            const test = { t: 'cmp', op: '=', a: { t: 'ref', idx: ia }, b: { t: 'ref', idx: wa + ib } };
            on = on === null ? test : { t: 'and', a: on, b: test };
            B.cols[ib].hidden = true;                                  //  SELECT * shows the column once
        });
    }

    const onF = on === null ? null : cx(on, scope, ctx).f;

    //  Look for the  "A's thing = B's thing"  parts of the ON  (for the fast way).
    const leftKeys = [], rightKeys = [];
    let wordsOnly = true;
    function side(node) {
        let s = 'none';
        let bad = false;
        walk(node, function (x) {
            if (x.t === 'scalar' || x.t === 'exists' || x.t === 'insub') { bad = true; return false; }
            let idx = -1;
            if (x.t === 'ref') idx = x.idx;
            if (x.t === 'col') {
                const r = resolveColumn(scope, x, true);
                if (r === null || r.depth > 0) { if (r === null) bad = true; return false; }
                idx = r.idx;
            }
            if (idx !== -1) {
                const here = idx < wa ? 'A' : 'B';
                if (s === 'none') s = here; else if (s !== here) bad = true;
            }
            return true;
        });
        return bad ? 'mixed' : s;
    }
    (function findKeys(node) {
        if (node === null) return;
        if (node.t === 'and') { findKeys(node.a); findKeys(node.b); return; }
        if (node.t !== 'cmp' || node.op !== '=') return;
        const sa = side(node.a), sb = side(node.b);
        let l = null, r = null;
        if (sa === 'A' && sb === 'B') { l = node.a; r = node.b; }
        else if (sa === 'B' && sb === 'A') { l = node.b; r = node.a; }
        if (l === null) return;
        const L = cx(l, scope, ctx), R = cx(r, scope, ctx);
        leftKeys.push(L.f);
        rightKeys.push(R.f);
        if (!(isWordsType(L.ty) && isWordsType(R.ty))) wordsOnly = false;
    })(on);

    const kind = j.kind;
    const keepA = kind === 'left' || kind === 'full';
    const keepB = kind === 'right' || kind === 'full';

    return {
        cols: cols,
        scan: function* (env, sink) {

            const right = yield* collect(B, env);
            const nullsA = new Array(wa).fill(null);
            const nullsB = new Array(wb).fill(null);
            const matchedB = keepB ? new Uint8Array(right.length) : null;
            let stopped = false;

            //  The joined row:  A's values,  then B's.   (B's are read at spot  wa + j,  so the keys built
            //  from the "B side" are worked out on a pretend joined row.)
            const pretend = new Array(wa + wb);

            if (leftKeys.length > 0) {

                //  THE FAST WAY:  B's rows in a lookup,  by their key.
                const lookup = new Map();
                for (let r = 0; r < right.length; r++) {
                    const row = right[r];
                    for (let k = 0; k < wb; k++) pretend[wa + k] = row[k];
                    let key = '';
                    let skip = false;
                    for (let k = 0; k < rightKeys.length; k++) {
                        const part = matchKey(rightKeys[k](pretend, env), wordsOnly);
                        if (part === null) { skip = true; break; }     //  NULL never matches anything
                        key += part + KEY_SPLIT;
                    }
                    if (!skip) {
                        const list = lookup.get(key);
                        if (list === undefined) lookup.set(key, [r]); else list.push(r);
                    }
                    if ((r & 4095) === 4095) yield;
                }

                yield* A.scan(env, function (row) {
                    let key = '';
                    let skip = false;
                    for (let k = 0; k < leftKeys.length; k++) {
                        const part = matchKey(leftKeys[k](row, env), wordsOnly);
                        if (part === null) { skip = true; break; }
                        key += part + KEY_SPLIT;
                    }
                    let found = false;
                    const list = skip ? undefined : lookup.get(key);
                    if (list !== undefined) {
                        for (let k = 0; k < list.length; k++) {
                            const both = row.concat(right[list[k]]);
                            if (onF !== null && !truthy(onF(both, env))) continue;
                            found = true;
                            if (matchedB !== null) matchedB[list[k]] = 1;
                            if (!sink(both)) { stopped = true; return false; }
                        }
                    }
                    if (!found && keepA && !sink(row.concat(nullsB))) { stopped = true; return false; }
                    return true;
                });

            } else {

                //  THE SLOW WAY:  every pair.   (Pauses every 65,536 pairs,  so a big one never freezes the page.)
                const left = yield* collect(A, env);
                let pairs = 0;
                for (let l = 0; l < left.length && !stopped; l++) {
                    let found = false;
                    for (let r = 0; r < right.length; r++) {
                        if ((++pairs & 65535) === 0) yield l / left.length;
                        const both = left[l].concat(right[r]);
                        if (onF !== null && !truthy(onF(both, env))) continue;
                        found = true;
                        if (matchedB !== null) matchedB[r] = 1;
                        if (!sink(both)) { stopped = true; break; }
                    }
                    if (!stopped && !found && keepA && !sink(left[l].concat(nullsB))) stopped = true;
                }
            }

            //  RIGHT / FULL:  B's rows that never matched.
            if (!stopped && matchedB !== null) {
                for (let r = 0; r < right.length; r++) {
                    if (!matchedB[r] && !sink(nullsA.concat(right[r]))) return;
                }
            }
        },
    };
}


//  ---- ONE SELECT ----
//
//  The order things happen in  (not the order they're written!):
//
//      1.  FROM / JOIN     where the rows come from
//      2.  WHERE           keep only some rows
//      3.  GROUP BY        squash rows into groups,  work out the totals
//      4.  HAVING          keep only some groups
//      5.  windows         ROW_NUMBER() OVER (...) ...
//      6.  SELECT          work out what to show
//      7.  DISTINCT        drop repeats
//      8.  ORDER BY        sort   (done by compileQuery)
//      9.  LIMIT           cut    (done by compileQuery)
//
//  "order"  =  the ORDER BY items  (from the query around this SELECT):  they're worked out here too,
//  as hidden extra columns on the end of each row,  because they can use columns that aren't shown.
//
function compileCore(c, parent, ctx, order) {

    const src = c.from === null ? oneRowSource() : compileFrom(c.from, parent, ctx);
    const sc0 = { cols: src.cols, parent: parent, owner: ctx.owner, match: null };

    if (c.where !== null) walk(c.where, function (x) {
        if (isTotal(x)) queryFail('Totals like  ' + x.name + '(...)  can\'t go in WHERE  (WHERE looks at one row at a time).  Use HAVING:   ... GROUP BY ... HAVING ' + x.name + '(...) > ...');
        if (isWindow(x)) queryFail('Window functions can\'t go in WHERE.  Put the query in a subquery,  and filter that.');
        return true;
    });
    const where = c.where === null ? null : cx(c.where, sc0, ctx).f;


    //  SELECT *   ->   every column,  one by one.
    const items = [];
    c.items.forEach(function (it) {
        if (!it.star) {
            //  Its name:  the nickname,  or a column's own name  (spelled the way the TABLE spells it),  or the words it was written with.
            let named = it.label;
            if (it.e.t === 'col') {
                const r = resolveColumn(sc0, it.e, true);
                named = r !== null && r.name ? r.name : it.e.name;
            }
            items.push({ e: it.e, name: it.alias !== null ? it.alias : named });
            return;
        }
        let any = false;
        src.cols.forEach(function (col, j) {
            if (col.hidden) return;
            if (it.table !== null && col.tkey !== String(it.table).toLowerCase()) return;
            items.push({ e: { t: 'ref', idx: j }, name: col.name });
            any = true;
        });
        if (it.table !== null && !any) queryFail('There\'s no table called  ' + it.table + '  in this FROM.');
        if (it.table === null && src.cols.length === 0) queryFail('SELECT *  needs a FROM  (a table to show).');
    });


    //  ORDER BY items:  a number  (ORDER BY 2  =  the 2nd column),  a column's name  (or nickname),  or anything else.
    const orderPlan = [];       //  for each ORDER BY item:   { output: n }   or   { node }
    if (order !== null) {
        order.forEach(function (o) {
            const e = o.e;
            if (e.t === 'lit' && typeof e.v === 'number') {
                const k = Math.trunc(e.v);
                if (k < 1 || k > items.length) queryFail('ORDER BY ' + e.v + ':  there are only ' + items.length + ' columns.');
                orderPlan.push({ output: k - 1, o: o });
                return;
            }
            //  A plain name:  a nickname from SELECT wins.   Otherwise it's a column of the table.
            if (e.t === 'col' && e.table === null) {
                const k = items.findIndex(function (it) { return it.name.toLowerCase() === e.name.toLowerCase(); });
                const isAlias = c.items.some(function (it) { return !it.star && it.alias !== null && it.alias.toLowerCase() === e.name.toLowerCase(); });
                if (k !== -1 && (isAlias || resolveColumn(sc0, e, true) === null)) { orderPlan.push({ output: k, o: o }); return; }
            }
            orderPlan.push({ node: e, o: o });
        });
    }

    //  Find the totals and the windows  (in SELECT,  HAVING,  ORDER BY).
    const totalNodes = [], totalPrints = new Map();
    const windowNodes = [];
    function findSpecial(node) {
        walk(node, function (x) {
            if (isWindow(x)) {
                windowNodes.push(x);
                //  A window's insides can have totals:   RANK() OVER (ORDER BY SUM(sales))
                (x.args || []).forEach(findSpecial);
                (x.over.partition || []).forEach(findSpecial);
                (x.over.order || []).forEach(function (o) { findSpecial(o.e); });
                return false;
            }
            if (isTotal(x)) {
                const print = nodePrint(x, sc0);
                if (print === null || !totalPrints.has(print)) {
                    if (print !== null) totalPrints.set(print, totalNodes.length);
                    totalNodes.push(x);
                }
                return false;
            }
            return true;
        });
    }
    items.forEach(function (it) { findSpecial(it.e); });
    if (c.having !== null) findSpecial(c.having);
    orderPlan.forEach(function (p) { if (p.node) findSpecial(p.node); });
    if (c.group !== null) c.group.forEach(function (g) {
        walk(g, function (x) {
            if (isTotal(x)) queryFail('Totals can\'t go in GROUP BY.');
            if (isWindow(x)) queryFail('Window functions can\'t go in GROUP BY.');
            return true;
        });
    });

    const grouped = c.group !== null || totalNodes.length > 0 || c.having !== null;


    //  ---- 3.  GROUP BY ----
    let levelScope = sc0;
    let keyF = [], totals = [];

    if (grouped) {

        //  GROUP BY 1  =  the 1st thing in SELECT.   GROUP BY total  =  a nickname  (if there's no column with that name).
        const keys = (c.group || []).map(function (g) {
            if (g.t === 'lit' && typeof g.v === 'number') {
                const k = Math.trunc(g.v);
                if (k < 1 || k > items.length) queryFail('GROUP BY ' + g.v + ':  there are only ' + items.length + ' columns.');
                return items[k - 1].e;
            }
            if (g.t === 'col' && g.table === null && resolveColumn(sc0, g, true) === null) {
                const it = c.items.find(function (x) { return !x.star && x.alias !== null && x.alias.toLowerCase() === g.name.toLowerCase(); });
                if (it !== undefined) return it.e;
            }
            return g;
        });

        const keyC = keys.map(function (k) { return cx(k, sc0, ctx); });
        keyF = keyC.map(function (k) { return k.f; });
        const keyPrints = new Map();
        const groupSlot = new Map();
        keys.forEach(function (k, j) {
            const print = nodePrint(k, sc0);
            if (print !== null && !keyPrints.has(print)) keyPrints.set(print, j);
            let idx = -1;
            if (k.t === 'ref') idx = k.idx;
            if (k.t === 'col') { const r = resolveColumn(sc0, k, true); if (r !== null && r.depth === 0) idx = r.idx; }
            if (idx !== -1 && !groupSlot.has(idx)) groupSlot.set(idx, j);
        });

        totals = totalNodes.map(function (t) { return compileTotal(t, sc0, ctx); });

        const width = keys.length;
        const groupTypes = keyC.map(function (k) { return k.ty; }).concat(totals.map(function (t) { return t.ty; }));

        //  After grouping,  each row is:   [ key 1,  key 2 ...,  total 1,  total 2 ... ]
        levelScope = {
            cols: [], parent: parent, owner: ctx.owner, grouped: sc0, groupSlot: groupSlot, groupTypes: groupTypes,
            match: function (node) {
                if (node.t === 'lit') return null;
                if (isTotal(node)) {
                    const print = nodePrint(node, sc0);
                    const j = print !== null && totalPrints.has(print) ? totalPrints.get(print) : totalNodes.indexOf(node);
                    if (j === -1) return null;
                    return reader(0, width + j, totals[j].ty);
                }
                if (isWindow(node)) return null;
                const print = nodePrint(node, sc0);
                if (print !== null && keyPrints.has(print)) {
                    const j = keyPrints.get(print);
                    return reader(0, j, groupTypes[j]);
                }
                return null;
            },
        };
    }

    const having = c.having === null ? null : cx(c.having, levelScope, ctx).f;


    //  ---- 5.  WINDOWS ----
    let finalScope = levelScope;
    const windows = [];
    if (windowNodes.length > 0) {
        const base = grouped ? keyF.length + totals.length : src.cols.length;
        windowNodes.forEach(function (w) { windows.push(compileWindow(w, levelScope, ctx)); });
        const under = levelScope.match;
        finalScope = Object.assign({}, levelScope, {
            match: function (node) {
                if (isWindow(node)) {
                    const j = windowNodes.indexOf(node);
                    return reader(0, base + j, windows[j].ty);
                }
                return under ? under(node) : null;
            },
        });
    }


    //  ---- 6.  SELECT ----
    const outputs = items.map(function (it) { return cx(it.e, finalScope, ctx); });
    const cols = items.map(function (it, k) { return { name: it.name, ty: outputs[k].ty }; });
    const outF = outputs.map(function (o) { return o.f; });

    //  ORDER BY's hidden extras.
    const hidden = [];
    const sortBy = orderPlan.map(function (p) {
        if (p.output !== undefined) return { idx: p.output, desc: p.o.desc, nulls: p.o.nulls };
        if (c.distinct) {
            const print = nodePrint(p.node, finalScope);
            const k = items.findIndex(function (it) { return nodePrint(it.e, finalScope) === print; });
            if (print === null || k === -1) queryFail('With SELECT DISTINCT,  ORDER BY can only use the columns you SELECT.');
            return { idx: k, desc: p.o.desc, nulls: p.o.nulls };
        }
        hidden.push(cx(p.node, finalScope, ctx).f);
        return { idx: items.length + hidden.length - 1, desc: p.o.desc, nulls: p.o.nulls };
    });

    const nOut = outF.length, nHidden = hidden.length;
    function project(row, env) {
        const out = new Array(nOut + nHidden);
        for (let k = 0; k < nOut; k++) out[k] = outF[k](row, env);
        for (let k = 0; k < nHidden; k++) out[nOut + k] = hidden[k](row, env);
        return out;
    }

    const distinct = c.distinct;
    const top = c.top;

    return {
        cols: cols,
        order: order === null ? null : sortBy,
        top: top,
        run: function* (env, need) {

            const out = [];
            const seen = distinct ? new Set() : null;
            function emit(row) {
                const o = project(row, env);
                if (seen !== null) {
                    const key = rowKey(o, nOut);
                    if (seen.has(key)) return true;
                    seen.add(key);
                }
                out.push(o);
                return out.length < need;
            }

            //  The simple kind  (no GROUP BY,  no windows):  rows go straight through.
            if (!grouped && windows.length === 0) {
                yield* src.scan(env, function (row) {
                    if (where !== null && !truthy(where(row, env))) return true;
                    return emit(row);
                });
                return out;
            }

            let level;

            if (grouped) {
                const groups = new Map();
                level = [];
                const nk = keyF.length, nt = totals.length;
                const vals = new Array(nk);                     //  (one scratch list,  reused for every row)
                yield* src.scan(env, function (row) {
                    if (where !== null && !truthy(where(row, env))) return true;
                    let key;
                    if (nk === 1) { vals[0] = keyF[0](row, env); key = keyOf(vals[0]); }
                    else {
                        key = '';
                        for (let k = 0; k < nk; k++) { vals[k] = keyF[k](row, env); key += keyOf(vals[k]) + KEY_SPLIT; }
                    }
                    let g = groups.get(key);
                    if (g === undefined) {
                        g = new Array(nk + nt);
                        for (let k = 0; k < nk; k++) g[k] = vals[k];
                        for (let k = 0; k < nt; k++) g[nk + k] = totals[k].start();
                        groups.set(key, g);
                        level.push(g);
                    }
                    for (let k = 0; k < nt; k++) totals[k].add(g[nk + k], row, env);
                    return true;
                });
                //  No GROUP BY,  and no rows at all?  Totals still give ONE answer  (COUNT = 0).
                if (level.length === 0 && nk === 0) {
                    const g = new Array(nt);
                    for (let k = 0; k < nt; k++) g[k] = totals[k].start();
                    level.push(g);
                }
                for (let r = 0; r < level.length; r++) {
                    const g = level[r];
                    for (let k = 0; k < nt; k++) g[nk + k] = totals[k].end(g[nk + k]);
                    if ((r & 4095) === 4095) yield;
                }
                if (having !== null) level = level.filter(function (g) { return truthy(having(g, env)); });
            } else {
                level = [];
                yield* src.scan(env, function (row) {
                    if (where === null || truthy(where(row, env))) level.push(row);
                    return true;
                });
            }

            if (windows.length > 0) {
                const width = grouped ? keyF.length + totals.length : src.cols.length;
                level = level.map(function (r) { const copy = r.slice(); copy.length = width; return copy; });
                for (let w = 0; w < windows.length; w++) {
                    const vals = yield* windows[w].compute(level, env);
                    for (let r = 0; r < level.length; r++) level[r].push(vals[r]);
                }
            }

            for (let r = 0; r < level.length; r++) {
                if ((r & 4095) === 4095) yield;
                if (!emit(level[r])) break;
            }
            return out;
        },
    };
}


//  ---- UNION / INTERSECT / EXCEPT ----
function compileSet(node, parent, ctx) {

    if (node.t === 'core') return compileCore(node, parent, ctx, null);
    if (node.t === 'paren') return compileQuery(node.q, parent, ctx);

    const A = compileSet(node.a, parent, ctx);
    const B = compileSet(node.b, parent, ctx);
    if (A.cols.length !== B.cols.length) {
        queryFail('Both sides of  ' + node.op + '  need the same number of columns  (one has ' + A.cols.length + ',  the other ' + B.cols.length + ').');
    }
    const width = A.cols.length;
    const cols = A.cols.map(function (col, k) { return { name: col.name, ty: mergeTypes(col.ty, B.cols[k].ty) }; });
    const op = node.op;

    return {
        cols: cols,
        order: null,
        run: function* (env) {
            const a = yield* A.run(env, Infinity);
            const b = yield* B.run(env, Infinity);
            const trim = function (r) { return r.length > width ? r.slice(0, width) : r; };
            if (op === 'UNION ALL') return a.map(trim).concat(b.map(trim));
            const out = [];
            const seen = new Set();
            if (op === 'UNION') {
                [a, b].forEach(function (list) {
                    list.forEach(function (r) {
                        const key = rowKey(r, width);
                        if (!seen.has(key)) { seen.add(key); out.push(trim(r)); }
                    });
                });
                return out;
            }
            const inB = new Set(b.map(function (r) { return rowKey(r, width); }));
            a.forEach(function (r) {
                const key = rowKey(r, width);
                if (seen.has(key)) return;
                seen.add(key);
                if (inB.has(key) === (op === 'INTERSECT')) out.push(trim(r));
            });
            return out;
        },
    };
}


//  ---- A WHOLE QUERY:   WITH ...   (the SELECTs)   ORDER BY ...   LIMIT ... ----
function compileQuery(q, parent, ctx) {

    const owner = { correlated: false, enclosing: ctx.owner };

    //  WITH  name AS (...):   tables made just for this query.   (Worked out once,  the first time they're used.)
    let ctes = ctx.ctes;
    if (q.with !== null) {
        ctes = new Map(ctes);
        q.with.forEach(function (w) {
            const plan = compileQuery(w.q, null, { catalog: ctx.catalog, ctes: ctes, owner: null });
            if (w.cols !== null) {
                if (w.cols.length !== plan.cols.length) queryFail('WITH ' + w.name + ' (...) names ' + w.cols.length + ' columns,  but its SELECT gives ' + plan.cols.length + '.');
                plan.cols = plan.cols.map(function (c, k) { return { name: w.cols[k], ty: c.ty }; });
            }
            ctes.set(String(w.name).toLowerCase(), { name: w.name, plan: plan, rows: null });
        });
    }

    const cctx = { catalog: ctx.catalog, ctes: ctes, owner: owner };

    let body, sortBy;
    if (q.body.t === 'core') {
        body = compileCore(q.body, parent, cctx, q.order);
        sortBy = body.order;
    } else {
        body = compileSet(q.body, parent, cctx);
        sortBy = null;
        if (q.order !== null) {
            //  ORDER BY after a UNION:  by the answer's columns  (by number,  or by name).
            const outScope = { cols: body.cols.map(function (c) { return newCol(c.name, null, c.ty); }), parent: null, owner: null, match: null };
            const extra = [];
            sortBy = q.order.map(function (o) {
                if (o.e.t === 'lit' && typeof o.e.v === 'number') {
                    const k = Math.trunc(o.e.v);
                    if (k < 1 || k > body.cols.length) queryFail('ORDER BY ' + o.e.v + ':  there are only ' + body.cols.length + ' columns.');
                    return { idx: k - 1, desc: o.desc, nulls: o.nulls };
                }
                extra.push(cx(o.e, outScope, cctx).f);
                return { idx: body.cols.length + extra.length - 1, desc: o.desc, nulls: o.nulls };
            });
            if (extra.length > 0) {
                const inner = body.run;
                const width = body.cols.length;
                body = Object.assign({}, body, {
                    run: function* (env, need) {
                        const rows = yield* inner(env, need);
                        return rows.map(function (r) {
                            const out = r.slice(0, width);
                            for (let k = 0; k < extra.length; k++) out.push(extra[k](out, env));
                            return out;
                        });
                    },
                });
            }
        }
    }

    const emptyScope = { cols: [], parent: null, owner: null, match: null };
    function amount(node, what) {
        if (node === null) return null;
        const v = cx(node, emptyScope, cctx).f([], { outer: [] });
        if (v === null) return null;
        const n = numOf(v);
        if (!Number.isFinite(n)) queryFail(what + ' needs a number.');
        return Math.trunc(n);
    }
    let limit = amount(q.limit, 'LIMIT');
    if (limit === null && body.top) limit = amount(body.top, 'TOP');
    if (limit !== null && limit < 0) limit = null;                  //  LIMIT -1  =  no limit  (SQLite)
    const offset = Math.max(0, amount(q.offset, 'OFFSET') || 0);

    const width = body.cols.length;

    return {
        cols: body.cols,
        owner: owner,
        run: function* (env, need) {
            const most = limit === null ? need : Math.min(limit, need);
            let rows = yield* body.run(env, sortBy !== null ? Infinity : offset + most);
            if (sortBy !== null) rows = yield* sortByKeys(rows, sortBy, offset + most);
            if (offset > 0 || rows.length > most) rows = rows.slice(offset, most === Infinity ? undefined : offset + most);
            for (let k = 0; k < rows.length; k++) if (rows[k].length > width) rows[k] = rows[k].slice(0, width);
            return rows;
        },
    };
}


//  SORT the answer by its ORDER BY.   Two tricks make it quick:
//
//    -  A column that's all numbers is copied into a plain list of numbers first:
//       comparing two of those is MUCH faster than comparing two values that could be anything.
//    -  Only the first  keep  rows are wanted  (ORDER BY price DESC LIMIT 10)?   Then it doesn't sort them all.
//       It keeps the best 10 so far in a little "heap":  a pile where the WORST of the 10 is always on top,
//       so when a better row comes along,  the worst one is thrown out in a flash.
//
//  (It sorts row NUMBERS,  not the rows:  ties keep their order,  because the lower number wins.)
function* sortByKeys(rows, sortBy, keep) {

    const n = rows.length;
    if (n < 2 || keep <= 0) return keep <= 0 ? [] : rows;

    const keys = [];
    for (let k = 0; k < sortBy.length; k++) {
        const s = sortBy[k];
        let numbers = true, nulls = false;
        for (let r = 0; r < n; r++) {
            const v = rows[r][s.idx];
            if (v === null) nulls = true;
            else if (typeof v !== 'number') { numbers = false; break; }
        }
        const key = { idx: s.idx, how: s, desc: s.desc, nullsFirst: s.nulls === null ? !s.desc : s.nulls === 'first', vals: null, nul: null };
        if (numbers) {
            key.vals = new Float64Array(n);
            if (nulls) key.nul = new Uint8Array(n);
            for (let r = 0; r < n; r++) {
                const v = rows[r][s.idx];
                if (v === null) key.nul[r] = 1; else key.vals[r] = v;
                if ((r & 65535) === 65535) yield;
            }
        }
        keys.push(key);
    }

    function compare(a, b) {
        for (let k = 0; k < keys.length; k++) {
            const key = keys[k];
            let c;
            if (key.vals !== null) {
                const na = key.nul !== null && key.nul[a] === 1, nb = key.nul !== null && key.nul[b] === 1;
                if (na || nb) c = na && nb ? 0 : na === key.nullsFirst ? -1 : 1;
                else {
                    const x = key.vals[a], y = key.vals[b];
                    c = x < y ? -1 : x > y ? 1 : 0;
                    if (key.desc) c = -c;
                }
            } else {
                c = compareOne(rows[a][key.idx], rows[b][key.idx], key.how);
            }
            if (c !== 0) return c;
        }
        return a - b;
    }

    let order;

    if (keep < n / 4 && keep <= 100000) {
        //  THE HEAP:  the best  keep  so far,  worst on top  (spot 0).
        const heap = [];
        function up(at) {
            while (at > 0) {
                const parent = (at - 1) >> 1;
                if (compare(heap[at], heap[parent]) <= 0) return;
                const t = heap[at]; heap[at] = heap[parent]; heap[parent] = t;
                at = parent;
            }
        }
        function down(at) {
            for (;;) {
                const l = 2 * at + 1, r = l + 1;
                let worst = at;
                if (l < heap.length && compare(heap[l], heap[worst]) > 0) worst = l;
                if (r < heap.length && compare(heap[r], heap[worst]) > 0) worst = r;
                if (worst === at) return;
                const t = heap[at]; heap[at] = heap[worst]; heap[worst] = t;
                at = worst;
            }
        }
        for (let r = 0; r < n; r++) {
            if (heap.length < keep) { heap.push(r); up(heap.length - 1); }
            else if (compare(r, heap[0]) < 0) { heap[0] = r; down(0); }
            if ((r & 65535) === 65535) yield r / n;
        }
        order = heap.sort(compare);
    } else {
        const list = new Array(n);
        for (let r = 0; r < n; r++) list[r] = r;
        order = yield* sortRows(list, compare);
    }

    const out = new Array(order.length);
    for (let k = 0; k < order.length; k++) out[k] = rows[order[k]];
    return out;
}

//  SORT a big list,  in bites.
//  Small lists:  the browser's own sort  (it keeps ties in order).
//  Big ones:  sort pieces of 16,384,  then merge the pieces two by two  ("merge sort"),  pausing as it goes.
function* sortRows(rows, compare) {
    const n = rows.length;
    if (n <= 65536) return rows.sort(compare);

    const RUN = 16384;
    for (let start = 0; start < n; start += RUN) {
        const part = rows.slice(start, start + RUN).sort(compare);
        for (let k = 0; k < part.length; k++) rows[start + k] = part[k];
        yield;
    }

    let from = rows, to = new Array(n);
    let steps = 0;
    for (let width = RUN; width < n; width *= 2) {
        for (let lo = 0; lo < n; lo += 2 * width) {
            const mid = Math.min(lo + width, n), hi = Math.min(lo + 2 * width, n);
            let a = lo, b = mid, k = lo;
            while (a < mid && b < hi) {
                to[k++] = compare(from[b], from[a]) < 0 ? from[b++] : from[a++];        //  ties:  the left one first  (keeps them in order)
                if ((++steps & 65535) === 0) yield;
            }
            while (a < mid) to[k++] = from[a++];
            while (b < hi) to[k++] = from[b++];
        }
        const swap = from; from = to; to = swap;
    }
    return from;
}



// ----------------------------------------------------------
//
//    RUN A QUESTION
//
//    runQuery(text, catalog, isCurrent, progress)   ->   a "promise" of the answer:
//
//        { columns:  [{ name, type }],     the answer's columns   (type:  'int', 'real', 'text' ...)
//          rows:     [[ values ]],          its rows
//          ran:      which query ran  (counting from 1),   of  count  queries in the text }
//
//    catalog      the tables you can use  (the brain makes it):
//                     find(name)   ->  a table  (see THE TABLES),  or null
//                     names()      ->  all their names  (for "there's no table named ...")
//                     prepare(names)  ->  a promise:  get these tables ready  (another sheet or table of the file:  it's read first)
//    isCurrent()  says if this question is still the one you want.  (Ran a newer one?  Stop.)
//    progress(n)  is told how far along it is  (0 to 1),  now and then.
//
//    Several queries in the text  (split by  ;)?   The LAST one is the answer.
//
// ----------------------------------------------------------

async function runQuery(text, catalog, isCurrent, progress) {

    const statements = parseSql(text);
    const picked = statements[statements.length - 1];

    if (picked.t === 'write') {
        queryFail(picked.verb + '  would change the data,  so it can\'t run here:  this tool only READS  (your file is never changed).  ' +
                  'Try a SELECT,  like:   SELECT * FROM ' + (catalog.names()[0] || 'your_table') + ' LIMIT 10');
    }

    //  Which tables does it use?   Get them ready first  (another sheet of the file has to be read).
    const wanted = new Set();
    walkQuery(picked, function (item) { if (item.t === 'table') wanted.add(item.name); });
    await catalog.prepare(Array.from(wanted));
    if (!isCurrent()) throw QUERY_STALE;

    //  Their column types:  worked out first,  in bites  (then compiling just reads them).
    let stopAt = performance.now() + CHUNK_TIME;
    for (const name of wanted) {
        const table = catalog.find(name);
        if (table === null) continue;                   //  (a WITH table,  or a mistake:  compiling says so)
        const looking = lookAtKinds(table);
        while (!looking.next().done) {
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
    }

    const plan = compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
    const gen = plan.run({ outer: [] }, Infinity);

    for (;;) {
        const step = gen.next();
        if (step.done) {
            return {
                columns: plan.cols.map(function (c) { return { name: c.name, type: c.ty }; }),
                rows: step.value,
                ran: statements.length,
                count: statements.length,
            };
        }
        if (performance.now() >= stopAt) {
            if (typeof step.value === 'number' && progress) progress(step.value);
            await new Promise(function (go) { nextBite(go); });
            if (!isCurrent()) throw QUERY_STALE;
            stopAt = performance.now() + CHUNK_TIME;
        }
    }
}

//  Visit every table name in a query  (including the ones in subqueries).
function walkQuery(node, visit) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(function (x) { walkQuery(x, visit); }); return; }
    if (node.t === 'table') visit(node);
    for (const k in node) {
        const v = node[k];
        if (v !== null && typeof v === 'object') walkQuery(v, visit);
    }
}

//  A type's name,  for the answer's types row:   int  ->  INTEGER
function queryTypeName(ty) {
    return { int: 'INTEGER', real: 'REAL', num: 'NUMERIC', text: 'TEXT', date: 'DATE', timestamp: 'TIMESTAMP', bool: 'BOOLEAN' }[ty] || '';
}

//  A value,  as it's shown in the answer.
function queryCellText(v, ty) {
    return v === null ? '' : valueText(v, ty);
}

//  Turn a problem into words for you.
function queryProblem(problem) {
    if (problem instanceof QueryError) return problem.message;
    if (problem instanceof RangeError) return 'The answer is too big for the browser.  Try a LIMIT,  or fewer columns.';
    return 'Something went wrong running that query.  (' + (problem && problem.message ? problem.message : problem) + ')';
}
