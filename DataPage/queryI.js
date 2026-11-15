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

            flogic.html   =  what's there     (skeleton)
            flogicI.css   =  how it looks     (clothes)
            flogicI.js   =  what it does     (brain)
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

    Not SQL at all?   PLAIN WORDS work too:   "average score for each grade level"   (see PLAIN WORDS,  near the end).
    And any question can be read BACK in plain words   ("In words:  every row of sales where ...":  queryInWords).

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

//  why  =  the same problem,  for the code  (Query Flexibility reads it to fix the question):
//      { kind: 'parse', tok }        the words stopped making sense at token number  tok
//      { kind: 'column', name }      no column with that name
//      { kind: 'table', name }       no table with that name
//      { kind: 'group', name }       that column has to be in GROUP BY
//      { kind: 'nofrom' }            SELECT *  with no FROM
//      { kind: 'unclosed', close }   a quote never ends
function queryFail(words, why) {
    const problem = new QueryError(words);
    problem.why = why || null;
    throw problem;
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
            if (end === -1) queryFail(what + ' never ends  (a  ' + close + '  is missing).', { kind: 'unclosed', close: close });
            out += text.slice(p, end);
            p = end + 1;
            if (close !== ']' && text[p] === close) { out += close; p++; continue; }
            return out;
        }
    }

    for (;;) {

        //  (The token just read ends here:  Query Flexibility needs to know,  to swap one word for another.)
        if (tokens.length > 0 && tokens[tokens.length - 1].to === undefined) tokens[tokens.length - 1].to = p;

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
        if (t.k === 'end') queryFail(words + '  (at the end of the query).', { kind: 'parse', tok: i });
        const shown = text.slice(t.at, tk[i + 1].at).trim() || t.v;
        queryFail(words + '  (near  ' + shown + lineNote(text, t.at) + ').', { kind: 'parse', tok: i });
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

//  ---- WRITTEN DATES:   how people  (and Excel)  write them ----
//
//      3/15/06      3/15/2006      15-Mar-2006      15 March 06      Mar 15, 2006
//
//  Slashes are read the US way  (month / day / year).   Only when that can't be  (the first number is over 12,
//  like 15/3/2006)  is it read day first.
//
//  A 2-DIGIT YEAR  is read the way Excel reads one:    00 to 29  ->  2000 to 2029       30 to 99  ->  1930 to 1999
//  (So  12/31/99  is 1999,  and  01/01/00  is 2000:  the day after.   Never 1900,  never 2099.)
//
//  The engine turns these into the standard words  (2006-03-15),  so they sort,  compare and count like any date.
const DATE_SLASH = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\s*$/;
const DATE_NAMED = /^\s*(\d{1,2})[- ]([A-Za-z]{3,9})\.?[- ,]\s*(\d{4}|\d{2})\s*$/;      //  15-Mar-2006    15 March 06
const DATE_NAMED_US = /^\s*([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\s*$/;             //  Mar 15, 2006
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const TWO_DIGIT_YEAR_SPLIT = 30;             //  under this:  20xx.    From this on:  19xx.    (Excel's own rule)

function fullYear(words) {
    const n = Number(words);
    return words.length === 4 ? n : n < TWO_DIGIT_YEAR_SPLIT ? 2000 + n : 1900 + n;
}

//  'mar'  'March'  'sept'   ->   3,  3,  9      (0:  not a month)
function monthNumber(word) {
    const w = word.toLowerCase();
    for (let k = 0; k < 12; k++) if (MONTH_NAMES[k].indexOf(w) === 0) return k + 1;
    return 0;
}

//  A written date   ->   [year, month, day]      (null:  it isn't one.   The standard  2006-03-15  isn't "written":  see readDate.)
function writtenDate(s) {
    if (typeof s !== 'string' || s.length < 6 || s.length > 24) return null;
    let year, month, day;
    let m = DATE_SLASH.exec(s);
    if (m !== null) {
        month = +m[1]; day = +m[2]; year = fullYear(m[3]);
        if (month > 12 && day <= 12) { const swap = month; month = day; day = swap; }      //  15/3/2006:  it can only be day first
    } else if ((m = DATE_NAMED.exec(s)) !== null) {
        day = +m[1]; month = monthNumber(m[2]); year = fullYear(m[3]);
    } else if ((m = DATE_NAMED_US.exec(s)) !== null) {
        month = monthNumber(m[1]); day = +m[2]; year = +m[3];
    } else {
        return null;
    }
    if (month < 1 || month > 12 || day < 1) return null;
    if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;                //  no Feb 30
    return [year, month, day];
}

//  '3/15/06'  ->  '2006-03-15'      (null:  not a written date)
function writtenIso(s) {
    const d = writtenDate(s);
    return d === null ? null : pad(d[0], 4) + '-' + pad(d[1], 2) + '-' + pad(d[2], 2);
}

//  Words next to a DATE,  written the everyday way   ->   the standard words     WHERE Start > '3/1/06'   ->   > '2006-03-01'
//  (Anything else:  the same node,  untouched.)
function dateLiteral(node, otherTy) {
    if (node.t !== 'lit' || typeof node.v !== 'string' || !(otherTy === 'date' || otherTy === 'timestamp')) return node;
    const iso = writtenIso(node.v);
    return iso === null ? node : { t: 'lit', v: iso, ty: 'text' };
}

function readDate(s) {
    const m = DATE_WORDS.exec(s);
    if (m === null) {
        const w = writtenDate(s);
        return w === null ? null : utc(w[0], w[1] - 1, w[2]);
    }
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
//    The brain hands the engine its tables  (see "QUERY" in flogicI.js).   Each one is:
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
//  A NUMBER WITH A LOOK:   $116,450.00    1,200    €5    -$3    $-3    ($3.00)    12%
//  (People write money like that,  and a CSV keeps it as written.   To SQL it's words:  then  >  matches every row,
//   MAX says $99,950,  SUM says 0.   So the engine reads them as the NUMBERS they are,  and remembers the LOOK,
//   so an answer can show them the same way.)
//      1  (       2  a sign       3  the money sign       4  a sign       5  the whole part  (1,200  or  1200)
//      6  .50     7  %            8  )
const CELL_LOOK = /^\s*(\()?\s*([-+])?\s*([$€£¥])?\s*([-+])?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%)?\s*(\))?\s*$/;

//  '$116,450.00'   ->   { n: 116450,  pre: '$',  post: '',  commas: true,  places: 2,  parens: false }
//  null  =  not a number with a look   (a plain number like 1200 is NOT one:  it needs no help)
function lookOf(s) {
    const m = CELL_LOOK.exec(s);
    if (m === null) return null;
    const parens = m[1] !== undefined;
    if (parens !== (m[8] !== undefined)) return null;                  //  a  (  needs its  )
    if (m[2] !== undefined && m[4] !== undefined) return null;         //  -$-5:  one sign at most
    const sign = m[2] || m[4] || '';
    if (parens && sign !== '') return null;
    const commas = m[5].indexOf(',') !== -1;
    if (!parens && m[3] === undefined && m[7] === undefined && !commas) return null;     //  nothing to look at:  a plain number
    const n = Number(m[5].split(',').join('') + (m[6] || ''));
    return { n: parens || sign === '-' ? -n : n, pre: m[3] || '', post: m[7] || '', commas: commas, places: m[6] ? m[6].length - 1 : 0, parens: parens };
}

//  A number back in its look:   116450.5   ->   $116,450.50
function lookText(v, look) {
    let s = Math.abs(v).toFixed(look.places);
    if (look.commas) {
        const dot = s.indexOf('.');
        const whole = dot === -1 ? s : s.slice(0, dot);
        let grouped = '';
        for (let k = whole.length; k > 0; k -= 3) grouped = whole.slice(Math.max(0, k - 3), k) + (grouped === '' ? '' : ',' + grouped);
        s = grouped + (dot === -1 ? '' : s.slice(dot));
    }
    s = look.pre + s + look.post;
    return v < 0 ? (look.parens ? '(' + s + ')' : '-' + s) : s;
}

//  Words that are a number with a look,  next to a NUMBER   ->   that number   ('$100,000'  ->  100000)
//  (Anything else:  the same node,  untouched.)
function lookLiteral(node, otherTy) {
    if (node.t !== 'lit' || typeof node.v !== 'string' || !(otherTy === 'int' || otherTy === 'real' || otherTy === 'num')) return node;
    const L = lookOf(node.v);
    return L === null ? node : { t: 'lit', v: L.n, ty: Number.isInteger(L.n) ? 'int' : 'real' };
}

const SAMPLE_ROWS = 20000;
const SAMPLE_CELLS = 4000000;   //  ...but at most about this many CELLS  (a 10,000-column file:  400 rows,  not 20,000 x 10,000 = 7 s).
                                //  At least 1,000 rows,  always spread through the whole file.   (A cell the sample missed that
                                //  isn't a number?  It just stays as words:  see tableSource.)
const BITE_CELLS  = 16384;      //  a long job takes a breath every 1,024 rows,  OR after this many CELLS,  whichever comes first
                                //  (1,024 rows of a 10,000-column file is 10 million cells:  seconds,  not a bite)

//  Every column's kind  (all of them:  the ones not worked out yet are,  now).
function columnKinds(table) {
    runNow(lookAtKinds(table));
    return table.kinds;
}

//  Each column's LOOK  (money,  1,200,  12%),  or null   (worked out together with the kinds).
function columnLooks(table) {
    runNow(lookAtKinds(table));
    return table.looks;
}

//  ONE column's kind  /  look   (worked out now,  if it isn't yet).
//  (Safety:  a question that keeps asking for columns one by one?  After a few,  just do all the rest at once:
//   then it's never slower than looking at every column was.)
function kindAt(table, j) {
    if (!table.kinds || table.kinds[j] === undefined) {
        table.misses = (table.misses || 0) + 1;
        runNow(lookAtKinds(table, table.misses > 4 ? undefined : [j]));
    }
    return table.kinds[j];
}
function lookAt(table, j) {
    kindAt(table, j);
    return table.looks[j];
}

//  The looking itself:  a generator  (see RUN),  so runQuery can do it in bites before a question
//  (20,000 rows of a wide file,  all at once,  would stop the page for a moment).
//  only  =  which columns to look at  (their numbers).   Left out:  all of them.
//  (A question about 2 columns of a 10,000-column file only needs THOSE 2.   The others wait until they're asked for.)
function* lookAtKinds(table, only) {

    const width = table.columns.length;
    if (!table.kinds) {
        table.kinds = new Array(width);                 //  (undefined  =  not worked out yet)
        table.looks = new Array(width).fill(null);
        table.written = new Array(width).fill(false);   //  a DATE column whose cells are written the everyday way  (3/15/06):  see writtenDate
    }
    const kindsOut = table.kinds, looksOut = table.looks;

    if (table.declared) {
        for (let j = 0; j < width; j++) {               //  (its types are written down:  they win.   No looks.)
            const declared = table.declared[j];
            kindsOut[j] = declared ? typeClass(declared) : 'text';
        }
        return;
    }

    //  The columns still to do  (in order)
    const wanted = only === undefined ? null : new Set(only);
    const todo = [];
    for (let j = 0; j < width; j++) if (kindsOut[j] === undefined && (wanted === null || wanted.has(j))) todo.push(j);
    if (todo.length === 0) return;
    const m = todo.length;
    const upTo = todo[m - 1] + 1;                       //  cut each row only this far

    const canInt = new Array(m).fill(true);
    const canReal = new Array(m).fill(true);
    const canDate = new Array(m).fill(true);
    const canTime = new Array(m).fill(true);
    const canWritten = new Array(m).fill(true);         //  every cell a date,  written the standard way OR the everyday way  (3/15/06,  15-Mar-2006)?
    const sawWritten = new Array(m).fill(false);        //  ...and at least one of them the everyday way
    const canLook = new Array(m).fill(true);            //  every cell a number,  some with a look  ($116,450.00)?
    const looks = new Array(m).fill(null);
    const anything = new Array(m).fill(false);

    const n = table.rowCount;
    const sample = Math.min(n, SAMPLE_ROWS, Math.max(1000, Math.floor(SAMPLE_CELLS / Math.max(m, 1))));
    const step = n / sample;
    const partial = table.rowUpTo && upTo < width;

    let work = 0;                   //  cells looked at since the last breath
    for (let s = 0; s < sample; s++) {
        work += upTo;
        if ((s & 511) === 511 || work >= BITE_CELLS) { work = 0; yield; }
        const r = Math.floor(s * step);
        const cells = partial ? table.rowUpTo(r, upTo) : table.row(r);
        for (let k = 0; k < m; k++) {
            const j = todo[k];
            if (j >= cells.length) continue;
            const v = cells[j];
            if (v === '') continue;
            anything[k] = true;
            if (canInt[k] && !CELL_INT.test(v)) canInt[k] = false;
            if (canReal[k] && !CELL_REAL.test(v)) canReal[k] = false;
            if (canDate[k] && !CELL_DATE.test(v)) canDate[k] = false;
            if (canTime[k] && !CELL_TIME.test(v) && !CELL_DATE.test(v)) canTime[k] = false;
            if (canWritten[k] && !CELL_DATE.test(v)) {
                if (writtenDate(v) === null) canWritten[k] = false;
                else sawWritten[k] = true;
            }
            if (canLook[k] && !CELL_REAL.test(v)) {                 //  (a plain number fits a money column too:  0,  1200)
                const L = lookOf(v);
                const was = looks[k];
                if (L === null) canLook[k] = false;
                else if (was === null) looks[k] = { pre: L.pre, post: L.post, commas: L.commas, places: L.places, parens: L.parens };
                else if (was.pre !== L.pre || was.post !== L.post) canLook[k] = false;     //  $ AND € in one column?  Which is it?  Words.
                else {
                    if (L.places > was.places) was.places = L.places;
                    if (L.commas) was.commas = true;
                    if (L.parens) was.parens = true;
                }
            }
        }
    }

    for (let k = 0; k < m; k++) {
        const money = anything[k] && !canInt[k] && !canReal[k] && canLook[k] && looks[k] !== null;
        kindsOut[todo[k]] = !anything[k] ? 'text'
            : canInt[k] ? 'int'
            : canReal[k] ? 'real'
            : money ? (looks[k].places > 0 ? 'real' : 'int')
            : canDate[k] ? 'date'
            : canTime[k] ? 'timestamp'
            : canWritten[k] && sawWritten[k] ? 'date'
            : 'text';
        looksOut[todo[k]] = money ? looks[k] : null;
        table.written[todo[k]] = kindsOut[todo[k]] === 'date' && !canDate[k];
    }
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
                queryFail('The column  ' + ref.name + '  has to be in GROUP BY,  or inside a total  (like  MAX(' + ref.name + ')  or  COUNT(' + ref.name + ')).',
                          { kind: 'group', name: ref.name });
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
              (names.length > 0 ? '  The columns are:  ' + names.slice(0, 30).join(',  ') + (names.length > 30 ? ' ...' : '') : ''),
              { kind: 'column', name: ref.name });

    function found(sc, idx, ty, d, name) {
        //  Found it OUTSIDE the query it was written in?  Then that query (and every one in between)
        //  depends on the outside row:  it's "correlated",  and has to run again for every outside row.
        if (!quiet) for (let k = 0; k < crossed.length; k++) markCorrelated(crossed[k], sc.owner);
        const col = sc.grouped ? null : sc.cols[idx];
        return { depth: d, idx: idx, ty: ty, name: name, look: col && col.look ? col.look : null };
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
            let A = cx(node.a, scope, ctx), B = cx(node.b, scope, ctx);
            //  Money words against a number:   salary > '$100,000'   ->   salary > 100000
            //  ...and a date written the everyday way against a date:   Start > '3/1/06'   ->   Start > '2006-03-01'
            const la = dateLiteral(lookLiteral(node.a, B.ty), B.ty), lb = dateLiteral(lookLiteral(node.b, A.ty), A.ty);
            if (la !== node.a) A = cx(la, scope, ctx);
            if (lb !== node.b) B = cx(lb, scope, ctx);
            const a = A.f, b = B.f;
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
            const E = cx(node.e, scope, ctx);
            const e = E.f, lo = cx(dateLiteral(lookLiteral(node.lo, E.ty), E.ty), scope, ctx).f, hi = cx(dateLiteral(lookLiteral(node.hi, E.ty), E.ty), scope, ctx).f, not = node.not;
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
            const E = cx(node.e, scope, ctx);
            const e = E.f;
            const list = node.list.map(function (item) { return cx(dateLiteral(lookLiteral(item, E.ty), E.ty), scope, ctx).f; });
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
            //  A column with a look  (money)?  LIKE sees it the way the FILE writes it:   salary LIKE '$116%'
            const found = node.e.t === 'col' ? resolveColumn(scope, node.e, true) : null;
            const look = found !== null && found.look ? found.look : null;
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
                return m.test(look !== null && typeof x === 'number' ? lookText(x, look) : valueText(x)) !== not;
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
                //  SQLite's way:  both sides are cut to WHOLE numbers first   (7.9 % 3  =  7 % 3  =  1,    0.15 % 6  =  0).
                //  Cut down to 0?  NULL   (7 % 0.5  =  7 % 0).   The sign is the left side's   (-7 % 3  =  -1).
                const x = a(row, env), y = b(row, env);
                if (x === null || y === null) return null;
                const nx = Math.trunc(numOf(x)), ny = Math.trunc(numOf(y));
                if (ny === 0 || !isFinite(ny)) return null;
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
    //  Each column's kind and look are read the first time they're needed  (readyQuery already worked out the ones the
    //  question names:  a question about 2 columns of a 10,000-column file never looks at the other 9,998).
    const cols  = names.map(function (n, j) {
        const c = newCol(n, alias, null);
        Object.defineProperty(c, 'ty',   { get: function () { return kindAt(table, j); }, enumerable: true });
        Object.defineProperty(c, 'look', { get: function () { return lookAt(table, j); }, enumerable: true });
        return c;
    });
    const width = cols.length;

    return {
        cols: cols,
        canTestFirst: true,             //  it can test a WHERE itself,  before cutting the whole row  (see  pre  below)

        //  pre  (from compileCore,  when there's a WHERE):   { test,  cols }   the WHERE,  and the columns it reads.
        //  Then each row is cut only as far as the WHERE needs,  and tested:  only a row that PASSES gets the rest of its
        //  cells cut.   (SELECT * ... WHERE id = 7  on a 10,000-column file:  1 cell a row,  not 10,000.)
        scan: function* (env, sink, pre) {

            //  Only the columns the query USES get turned into values  (a query about 2 columns of 40 is much quicker).
            const used = [];
            for (let j = 0; j < width; j++) if (cols[j].used) used.push(j);
            const numeric = used.map(function (j) { const k = kindAt(table, j); return k === 'int' || k === 'real' || k === 'num'; });
            const looked  = used.map(function (j) { return lookAt(table, j) !== null; });     //  money:  $116,450.00  ->  116450
            const dated   = used.map(function (j) { kindAt(table, j); return !!(table.written && table.written[j]); });    //  dates:  3/15/06  ->  2006-03-15
            const isNull = table.isNull || null;
            const emptyIsNull = table.emptyIsNull !== false;
            const n = table.rowCount;
            const emptyRow = new Array(width).fill(null);
            //  Cut each row only as far as the LAST column used   (column 3 of 10,000:  3 cells,  not 10,000).
            const upTo = used.length === 0 ? 0 : used[used.length - 1] + 1;

            const cutAll = table.rowUpTo && upTo < width;                  //  cut only part of each row?

            //  An empty cell:  NULL,  or really empty words  ('')   (a SQL dump says which;  a CSV can't,  so it's NULL)
            function empty(i, j) { return (isNull !== null && isNull(i, j)) || (isNull === null && emptyIsNull) ? null : ''; }
            //  Money:  $116,450.00  ->  116450   (a cell that doesn't fit stays as words)
            function money(s) { const L = lookOf(s); return L === null ? s : L.n; }
            //  A written date:  3/15/06  ->  2006-03-15   (a cell that isn't one stays as it is)
            function written(s) { const iso = writtenIso(s); return iso === null ? s : iso; }

            //  The WHERE's own columns,  and the rest
            let preU = null, restU = null, preUpTo = 0;
            if (pre) {
                const inPre = new Set(pre.cols);
                preU = []; restU = [];
                for (let u = 0; u < used.length; u++) (inPre.has(used[u]) ? preU : restU).push(u);
                preUpTo = preU.length === 0 ? 0 : used[preU[preU.length - 1]] + 1;
            }
            const nPre = pre ? preU.length : 0, nRest = pre ? restU.length : 0;
            //  Cut in TWO steps  (the WHERE's part,  then the rest only for rows that pass)  only when that saves real work:
            //  more than 16 cells past the WHERE's.   Otherwise ONE cut is enough for both:  on a 6-column file,  most rows
            //  pass,  and cutting them twice made a big  SELECT * ... WHERE  10% slower.
            const testTo = pre && table.rowUpTo && upTo - preUpTo > 16 ? preUpTo : upTo;
            const cutPre = pre && table.rowUpTo && testTo < width;
            const preCovers = cutPre ? testTo : width;                      //  how far the test's cutting goes
            const scratch = pre ? new Array(width).fill(null) : null;     //  (the test row:  reused,  only the WHERE's cells filled in)
            const nUsed = used.length;

            let work = 0;                   //  cells cut since the last breath

            for (let i = 0; i < n; i++) {

                work += pre ? (preUpTo > 0 ? preUpTo : 1) : nUsed === 0 ? 1 : upTo;
                if ((i & 1023) === 1023 || work >= BITE_CELLS) { work = 0; yield i / n; }

                //  (The cell -> value lines below are written out in each loop,  not in a little function:
                //   this runs for every cell of a million rows,  and the calls cost about 10%.)
                if (pre) {
                    let cells = null;
                    if (nPre > 0) {
                        cells = cutPre ? table.rowUpTo(i, testTo) : table.row(i);
                        for (let k = 0; k < nPre; k++) {
                            const u = preU[k], j = used[u], s = cells[j];
                            scratch[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : dated[u] ? written(s) : s;
                        }
                    }
                    if (!truthy(pre.test(scratch, env))) continue;                 //  doesn't pass:  the rest is never cut
                    if (nUsed === 0) { if (!sink(emptyRow)) return; continue; }
                    const row = new Array(width);
                    for (let k = 0; k < nPre; k++) { const j = used[preU[k]]; row[j] = scratch[j]; }
                    if (nRest > 0) {
                        if (cells === null || upTo > preCovers) cells = cutAll ? table.rowUpTo(i, upTo) : table.row(i);
                        work += upTo;
                        for (let k = 0; k < nRest; k++) {
                            const u = restU[k], j = used[u], s = cells[j];
                            row[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : dated[u] ? written(s) : s;
                        }
                    }
                    if (!sink(row)) return;
                    continue;
                }

                //  (No columns used at all,  like COUNT(*)?   Then every row can be the same empty one.)
                const row = nUsed === 0 ? emptyRow : new Array(width);
                if (nUsed > 0) {
                    const cells = cutAll ? table.rowUpTo(i, upTo) : table.row(i);
                    for (let u = 0; u < nUsed; u++) {
                        const j = used[u], s = cells[j];
                        row[j] = s === undefined ? null : s === '' ? empty(i, j) : numeric[u] && CELL_REAL.test(s) ? Number(s) : looked[u] ? money(s) : dated[u] ? written(s) : s;
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
            queryFail('There\'s no table named  ' + item.name + '.' + (names.length > 0 ? '  The tables you can use:  ' + names.join(',  ') : ''),
                      { kind: 'table', name: item.name });
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

    //  ONE table?  Then the table tests the WHERE itself,  with only the WHERE's own columns,  and cuts the rest of a row
    //  only if it passes  (see tableSource).   (Right here,  "used" columns are exactly the WHERE's:  nothing else is compiled yet.)
    const pushed = where !== null && src.canTestFirst === true;
    const pre = pushed ? { test: where, cols: src.cols.map(function (col, j) { return col.used ? j : -1; }).filter(function (j) { return j !== -1; }) } : null;


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
        if (it.table === null && src.cols.length === 0) queryFail('SELECT *  needs a FROM  (a table to show).', { kind: 'nofrom' });
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
                    if (!pushed && where !== null && !truthy(where(row, env))) return true;
                    return emit(row);
                }, pre);
                return out;
            }

            let level;

            if (grouped) {
                const groups = new Map();
                level = [];
                const nk = keyF.length, nt = totals.length;
                const vals = new Array(nk);                     //  (one scratch list,  reused for every row)
                yield* src.scan(env, function (row) {
                    if (!pushed && where !== null && !truthy(where(row, env))) return true;
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
                }, pre);
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
                    if (pushed || where === null || truthy(where(row, env))) level.push(row);
                    return true;
                }, pre);
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
            //  The sort's extra columns  (ORDER BY something not shown)  come off.   In place:  these rows were made just for
            //  this answer,  and a copy of each of a million rows cost ~70 ms  (plus the cleaning up after).
            for (let k = 0; k < rows.length; k++) {
                if (rows[k].length > width) rows[k].length = width;
                if ((k & 65535) === 65535) yield;
            }
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
            if ((r & 65535) === 65535) yield;
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
        //  (Row NUMBERS in a typed list:  a million of them cost the browser's cleaner-upper  ("garbage collector")
        //   almost nothing to look after.   In a plain list,  cleaning up after a big sort froze the page for ~70 ms.)
        const list = new Int32Array(n);
        for (let r = 0; r < n; r++) list[r] = r;
        order = yield* sortRows(list, compare);
    }

    const out = new Array(order.length);
    for (let k = 0; k < order.length; k++) {
        out[k] = rows[order[k]];
        if ((k & 65535) === 65535) yield;
    }
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

    let from = rows, to = ArrayBuffer.isView(rows) ? new Int32Array(n) : new Array(n);     //  (row numbers:  typed,  like the list)
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
//    flexible     Query Flexibility  (see FLEXIBILITY below):  small mistakes get fixed,  and the answer also has
//                     sql:    the question that really ran
//                     fixes:  what was changed,  in words   ([]  =  nothing:  it ran just as you wrote it)
//
//    Several queries in the text  (split by  ;)?   The LAST one is the answer.
//
// ----------------------------------------------------------

async function runQuery(text, catalog, isCurrent, progress, flexible) {

    //  What Query Flexibility changed,  what that LEFT OUT  (amber on the page),  and did it add a GROUP BY?
    const flex = { fixes: [], warnings: [], grouped: false };
    let sql = flexible ? flexTraps(text, catalog, flex) : text;
    let ready = null;

    //  Try it.   Wrong?  Fix ONE thing,  and try again  (each try is only reading + compiling:  quick).
    for (let round = 0; ready === null; round++) {
        try {
            ready = await readyQuery(sql, catalog, isCurrent);
        } catch (problem) {
            if (!(problem instanceof QueryError)) throw problem;
            const better = flexible && round < FLEX_ROUNDS ? flexFix(sql, problem, catalog, flex) : null;
            if (better !== null && better !== sql) { sql = better; continue; }

            //  Stuck.   Was it PLAIN WORDS,  not SQL?   ("average score for each grade level")   Read it as words.
            //  EVERY word understood?  That's the question:  run it.   Some not?  Ask first  ("Did you mean ...?",  see flexStuck).
            //  (Never for DROP,  DELETE ...:  those stay refused.)
            const words = flexible && !(problem.why && problem.why.kind === 'write') && flexLooksLikeWords(text, catalog)
                ? await readWords(text, catalog, isCurrent) : null;
            if (words !== null && words.unused.length === 0) {
                flex.fixes = ['read your words as:   ' + words.sql];
                flex.warnings = [];
                sql = words.sql;
                ready = await readyQuery(sql, catalog, isCurrent);
                break;
            }
            throw flexStuck(problem, text, sql, flex, words, catalog, flexible);
        }
    }

    let answer = await runPlan(ready, isCurrent, progress);

    //  SNAP TO RESULT:  nothing in the answer,  but the question asked for something the FILE writes another way?
    //      status = 'Shipped'   ->   'shipped'   (how the file spells it)
    //      notes = ''           ->   notes IS NULL   (in a CSV an empty cell is NULL,  never '')
    //  ("Nothing" = no rows,  or one row of totals of nothing:  COUNT = 0,  SUM = NULL.)
    if (flexible && answerIsEmpty(answer, ready.picked)) {
        for (const snap of [flexEmptyWords, flexSnap]) {
            const snapped = await snap(sql, ready.picked, catalog, isCurrent);
            if (snapped === null) continue;
            const again = await readyQuery(snapped.sql, catalog, isCurrent);
            const other = await runPlan(again, isCurrent, progress);
            if (answerIsEmpty(other, again.picked)) continue;
            sql = snapped.sql;
            ready = again;
            answer = other;
            flex.fixes.push.apply(flex.fixes, snapped.fixes);
            break;
        }
    }

    answer.ran = ready.statements.length;
    answer.count = ready.statements.length;
    answer.skipped = ready.statements.filter(function (s) { return s.t === 'write'; }).map(function (s) { return s.verb; });     //  DROP ... before the question:  never run
    answer.sql = sql;
    answer.fixes = flex.fixes;
    answer.warnings = flex.warnings;
    const looks = answerLooks(ready.picked, ready.plan, catalog);
    answer.columns.forEach(function (c, k) { c.look = looks[k]; });
    return answer;
}

//  The LOOK of each answer column  ($116,450.00),  or null  (a plain number,  or words).
//  A column gets its table's look when it IS that column  (or  *),  or a SUM / MIN / MAX / AVG / TOTAL of it.
//  (Anything else,  like  salary * 2  or a UNION:  plain numbers.   AVG gets at least 2 places:  it's rarely whole.)
function answerLooks(picked, plan, catalog) {
    const none = plan.cols.map(function () { return null; });
    if (picked.t !== 'query' || picked.body.t !== 'core' || picked.body.from === null) return none;
    const c = picked.body;
    const tables = [];
    (function walk(f) {
        if (f.t === 'table') {
            const t = catalog.find(f.name);
            if (t !== null) tables.push({ keys: [String(f.name).toLowerCase(), String(f.alias || '').toLowerCase()], table: t });
        } else if (f.t === 'join') { walk(f.a); walk(f.b); }
    })(c.from);
    function lookOfCol(e) {
        if (e.t !== 'col') return null;
        for (const s of tables) {
            if (e.table !== null && s.keys.indexOf(String(e.table).toLowerCase()) === -1) continue;
            const j = columnNames(s.table).map(function (n) { return n.toLowerCase(); }).indexOf(String(e.name).toLowerCase());
            if (j !== -1) return lookAt(s.table, j);
        }
        return null;
    }
    const out = [];
    for (const it of c.items) {
        if (it.star) {
            tables.forEach(function (s) {
                if (it.table === null || s.keys.indexOf(String(it.table).toLowerCase()) !== -1) columnLooks(s.table).forEach(function (L) { out.push(L); });
            });
            continue;
        }
        const e = it.e;
        let L = lookOfCol(e);
        if (e.t === 'fn' && !e.over && !e.star && e.args.length === 1 && ['SUM', 'MIN', 'MAX', 'AVG', 'TOTAL'].indexOf(e.name) !== -1) {
            L = lookOfCol(e.args[0]);
            if (L !== null && e.name === 'AVG') L = Object.assign({}, L, { places: Math.max(L.places, 2) });
        }
        out.push(L);
    }
    return out.length === plan.cols.length ? out : none;           //  (didn't line up  (a JOIN with USING?):  play it safe)
}

//  Read a question,  get its tables ready,  and compile it.   (Nothing runs yet.)
async function readyQuery(text, catalog, isCurrent) {

    const statements = parseSql(text);
    if (statements.length === 0) queryFail('There\'s no question yet.  Try:   SELECT * FROM ' + (catalog.names()[0] || 'your_table'));
    const picked = statements[statements.length - 1];

    if (picked.t === 'write') {
        queryFail(picked.verb + '  would change the data,  so it can\'t run here:  this tool only READS  (your file is never changed).  ' +
                  'Try a SELECT,  like:   SELECT * FROM ' + (catalog.names()[0] || 'your_table') + ' LIMIT 10', { kind: 'write', verb: picked.verb });
    }

    //  Which tables does it use?   Get them ready first  (another sheet of the file has to be read).
    const wanted = new Set();
    walkQuery(picked, function (item) { if (item.t === 'table') wanted.add(item.name); });
    await catalog.prepare(Array.from(wanted));
    if (!isCurrent()) throw QUERY_STALE;

    //  Their column types:  worked out first,  in bites  (then compiling just reads them).
    //  Only the columns the question NAMES   (SELECT *,  or a NATURAL / USING join:  all of them).
    const named = new Set();
    let everything = false;
    (function look(node) {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(look); return; }
        if (node.t === 'col') named.add(String(node.name).toLowerCase());
        if (node.star === true && node.t === undefined) everything = true;          //  SELECT *   /   t.*
        if (node.t === 'join' && (node.natural || node.using)) everything = true;
        for (const k in node) if (node[k] !== null && typeof node[k] === 'object') look(node[k]);
    })(picked);
    let stopAt = performance.now() + CHUNK_TIME;
    for (const name of wanted) {
        const table = catalog.find(name);
        if (table === null) continue;                   //  (a WITH table,  or a mistake:  compiling says so)
        const only = everything ? undefined : [];
        if (!everything) columnNames(table).forEach(function (n, j) { if (named.has(n.toLowerCase())) only.push(j); });
        const looking = lookAtKinds(table, only);
        while (!looking.next().done) {
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
    }

    const plan = compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
    return { statements: statements, picked: picked, plan: plan, stopAt: stopAt };
}

//  Run a compiled question,  in bites.
//  (The clock carries on from getting ready:  the first bite is ONE bite long,  not getting-ready + a bite.)
async function runPlan(ready, isCurrent, progress) {

    const plan = ready.plan;
    const gen = plan.run({ outer: [] }, Infinity);
    let stopAt = ready.stopAt !== undefined ? ready.stopAt : performance.now() + CHUNK_TIME;

    for (;;) {
        const step = gen.next();
        if (step.done) {
            return {
                columns: plan.cols.map(function (c) { return { name: c.name, type: c.ty }; }),
                rows: step.value,
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

//  A value,  as it's shown in the answer.   (A column with a look  (money):  in its look,   $116,450.00.)
function queryCellText(v, ty, look) {
    if (v === null) return '';
    return look && typeof v === 'number' ? lookText(v, look) : valueText(v, ty);
}

//  Turn a problem into words for you.
function queryProblem(problem) {
    if (problem instanceof QueryError) return problem.message;
    if (problem instanceof RangeError) return 'The answer is too big for the browser.  Try a LIMIT,  or fewer columns.';
    return 'Something went wrong running that query.  (' + (problem && problem.message ? problem.message : problem) + ')';
}



// ----------------------------------------------------------
//
//    FLEXIBILITY   ("Query Flexibility":  the  "Fix my typos"  checkbox in the query menu,  on at the start)
//
//    The SQL people type FIRST is hardly ever perfect:
//
//        select from orders                     ->   SELECT * FROM orders
//        selct * form orders                    ->   SELECT * FROM orders
//        select * from orders.csv               ->   SELECT * FROM orders
//        select * where qty > 5                 ->   SELECT * FROM orders WHERE qty > 5
//        ... where status = shipped             ->   ... where status = 'shipped'
//        ... where statuss = 'shipped'          ->   ... where status = 'shipped'
//        ... where status contains 'ship'       ->   ... where status LIKE '%ship%'
//        select status, count(*) from orders    ->   ... GROUP BY status
//        ... where name = 'Liam O'Brien'        ->   ... 'Liam O''Brien'          (an  '  inside words is written twice)
//        ... where score = 92%                  ->   ... score = '92%'            (% alone means "the remainder")
//        ... where score between 90-100         ->   ... between 90 AND 100       (also  90 TO 100)
//        ... where score > 90 and < 100         ->   ... and score < 100          (the column,  said again)
//        ... where qty >                        ->   (the unfinished end is left out,  and that's a WARNING:  see below)
//
//    THE RULE:  your SQL runs EXACTLY as you wrote it,  if it can.   Only when it CAN'T  (a mistake),
//    that one mistake gets fixed,  and it tries again  (up to FLEX_ROUNDS times).
//    Every fix is written down in words  (flex.fixes),  so the page can tell you what changed.
//    A fix that LEFT OUT a condition  (where qty >)  is also a WARNING  (flex.warnings):  that answer has rows
//    the question meant to keep out,  so the page says it in amber,  right on the answer.
//
//    Three traps are fixed even though they'd run,  because they'd QUIETLY give the wrong answer:
//        ordered > 2024-05-01           that's MATH  (2024 - 5 - 1 = 2018),  not a date     ->   '2024-05-01'
//        select status qty ...          that's  status  nicknamed "qty".   But qty is a column:  a comma is missing.
//        between 90-100 and grade = 'A' that's  BETWEEN -10 AND grade:  the AND was the next condition's   ->   90 AND 100
//
//    And after it runs:  SNAP TO RESULT.   Nothing in the answer,  because you asked for  status = 'Shipped'
//    and the file only ever says  'shipped'?   (Or  notes = ''  in a CSV,  where an empty cell is NULL?)
//    It snaps to how the FILE writes it,  and runs again.
//
//    Stuck,  and it reads like PLAIN WORDS  ("average score for each grade level")?   See PLAIN WORDS,  below.
//
// ----------------------------------------------------------

const FLEX_ROUNDS = 10;                         //  at most this many fixes  (then it says what's still wrong)

//  The words that start a part of a query:  a typo of one  (form,  wher,  oder,  limt ...)  gets fixed.
const FLEX_CLAUSES = ['SELECT', 'FROM', 'WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'AND'];

//  Words people use for SELECT.
const FLEX_SELECT = new Set(['SHOW', 'GET', 'FIND', 'LIST', 'DISPLAY', 'PICK']);

//  A file's ending,  written as part of a table's name   (orders.csv  ->  orders)
const FLEX_ENDINGS = /\.(csv|tsv|txt|xlsx|xlsm|xls|sql|json|db)$/i;

//  Where an unfinished end gets cut off   (... WHERE qty >   ->   cut from WHERE)
//  (Not ON:  a JOIN with its ON left out pairs EVERY row with every row.   An unfinished ON stays a mistake.)
const FLEX_CUT_AT = new Set(['WHERE', 'AND', 'OR', 'HAVING', 'LIMIT', 'OFFSET', 'BY']);

//  Cutting from one of these leaves out a CONDITION:  the answer then has rows the question meant to keep out.
//  That's more than a typo fixed,  so it's said as a WARNING  (flex.warnings),  and the page shows it in amber.
const FLEX_WIDENS = new Set(['WHERE', 'AND', 'OR', 'HAVING']);

//  The parts that come after FROM  /  after GROUP BY   (a new FROM  /  GROUP BY  goes in front of the first one there is)
const FLEX_AFTER_FROM  = new Set(['WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT']);
const FLEX_AFTER_GROUP = new Set(['HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT']);


//  A name,  as SQL:   status    "customer id"    "order"
function flexName(name) {
    const n = String(name);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !SQL_RESERVED.has(n.toUpperCase()) ? n : '"' + n.split('"').join('""') + '"';
}

//  Words,  as SQL:   'shipped'    'it''s'
function flexWords(text) {
    return "'" + String(text).split("'").join("''") + "'";
}

//  contains  /  starts with  /  ends with,  as SQL:   LIKE '%ship%'    (a  %  or  _  in the word is marked with  !)
function flexLike(value, before, after) {
    const v = String(value);
    const marked = /[!%_]/.test(v);
    const safe = marked ? v.replace(/[!%_]/g, function (c) { return '!' + c; }) : v;
    return 'LIKE ' + flexWords(before + safe + after) + (marked ? " ESCAPE '!'" : '');
}

//  Names,  compared loosely:   Customer_ID  =  customer id  =  customerid
function flexKey(name) {
    return String(name).toLowerCase().replace(/[\s_\-.]+/g, '');
}

//  Words,  compared loosely:   ' Shipped '  =  'shipped'
function flexLoose(text) {
    return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

//  How many letters have to change to get from  a  to  b   (put one in,  take one out,  swap one,  or turn 2 around).
function flexDistance(a, b) {
    const d = [];
    for (let x = 0; x <= a.length; x++) d.push([x]);
    for (let y = 1; y <= b.length; y++) d[0][y] = y;
    for (let x = 1; x <= a.length; x++) {
        for (let y = 1; y <= b.length; y++) {
            d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
            if (x > 1 && y > 1 && a[x - 1] === b[y - 2] && a[x - 2] === b[y - 1]) d[x][y] = Math.min(d[x][y], d[x - 2][y - 2] + 1);
        }
    }
    return d[a.length][b.length];
}

//  The ONE name closest to a word   (null:  none is close,  or two are just as close:  then don't guess).
//  Close  =  the same written loosely,  or 1 letter off  (2 for a word of 5 letters or more).
function flexClosest(word, names) {
    const key = flexKey(word);
    const same = names.filter(function (n) { return flexKey(n) === key; });
    if (same.length > 0) return same.length === 1 ? same[0] : null;
    const most = key.length <= 4 ? 1 : 2;
    let best = null, bestDistance = most + 1, tie = false;
    names.forEach(function (n) {
        const d = flexDistance(key, flexKey(n));
        if (d < bestDistance) { best = n; bestDistance = d; tie = false; }
        else if (d === bestDistance) tie = true;
    });
    return best !== null && !tie && bestDistance < key.length ? best : null;
}

//  How deep inside  ( )  each token is.
function flexDepths(tk) {
    const depth = [];
    let d = 0;
    tk.forEach(function (t) {
        if (t.k === 'op' && t.v === ')') d = Math.max(0, d - 1);
        depth.push(d);
        if (t.k === 'op' && t.v === '(') d++;
    });
    return depth;
}

function flexIsWord(t, u) { return t !== undefined && t.k === 'id' && t.u === u; }
function flexIsOp(t, v)   { return t !== undefined && t.k === 'op' && t.v === v; }
function flexIsName(t)    { return t !== undefined && (t.k === 'qid' || (t.k === 'id' && !SQL_RESERVED.has(t.u))); }

//  Put words in at a spot  (with a space on each side,  if there isn't one already).
function flexInsert(sql, at, words) {
    const before = sql.slice(0, at), after = sql.slice(at);
    return before + (before === '' || /\s$/.test(before) ? '' : ' ') + words + (after === '' || /^[\s;)]/.test(after) ? '' : ' ') + after;
}

//  The columns of the tables the question reads  (the ones after FROM and JOIN).   None found?  The open table's.
function flexColumnsFor(tk, catalog) {
    const list = [];
    for (let j = 1; j < tk.length; j++) {
        if ((flexIsWord(tk[j - 1], 'FROM') || flexIsWord(tk[j - 1], 'JOIN')) && (tk[j].k === 'id' || tk[j].k === 'qid')) {
            const table = catalog.find(tk[j].v);
            if (table !== null) columnNames(table).forEach(function (c) { if (list.indexOf(c) === -1) list.push(c); });
        }
    }
    if (list.length > 0) return list;
    const names = catalog.names();
    const main = names.length > 0 ? catalog.find(names[0]) : null;
    return main === null ? [] : columnNames(main);
}


//  THE TRAPS:  SQL that runs,  but means something you didn't.   (Fixed before the first try.)
function flexTraps(sql, catalog, flex) {

    let tk;
    try { tk = sqlTokens(sql); } catch (problem) { return sql; }       //  (it can't even be read:  that's fixed later)

    const edits = [];                                                   //  [from, to, new words]

    //  1.  A date without quotes:   2024-05-01   (or  2024/5/1)   ->   '2024-05-01'
    for (let j = 0; j + 4 < tk.length; j++) {
        const y = tk[j], d1 = tk[j + 1], m = tk[j + 2], d2 = tk[j + 3], d = tk[j + 4];
        if (y.k !== 'num' || m.k !== 'num' || d.k !== 'num' || d1.k !== 'op' || d2.k !== 'op') continue;
        if (!((d1.v === '-' && d2.v === '-') || (d1.v === '/' && d2.v === '/'))) continue;
        if (y.to !== d1.at || d1.to !== m.at || m.to !== d2.at || d2.to !== d.at) continue;     //  written as ONE thing,  no spaces
        const ys = sql.slice(y.at, y.to), ms = sql.slice(m.at, m.to), ds = sql.slice(d.at, d.to);
        if (!/^\d{4}$/.test(ys) || !/^\d{1,2}$/.test(ms) || !/^\d{1,2}$/.test(ds)) continue;
        if (+ms < 1 || +ms > 12 || +ds < 1 || +ds > 31) continue;
        const date = flexWords(ys + '-' + ('0' + ms).slice(-2) + '-' + ('0' + ds).slice(-2));
        edits.push([y.at, d.to, date]);
        flex.fixes.push(sql.slice(y.at, d.to) + '  ->  ' + date + '   (a date:  without quotes it\'s math)');
        j += 4;
    }

    //  2.  Two columns in a SELECT list with no comma:   select status qty   ->   select status, qty
    const depth = flexDepths(tk);
    const columns = flexColumnsFor(tk, catalog).map(function (c) { return c.toLowerCase(); });
    for (let j = 0; j < tk.length; j++) {
        if (!flexIsWord(tk[j], 'SELECT')) continue;
        for (let k = j + 1; k + 1 < tk.length; k++) {
            if (depth[k] < depth[j] || (depth[k] === depth[j] && (flexIsWord(tk[k], 'FROM') || flexIsOp(tk[k], ';')))) break;
            const a = tk[k], b = tk[k + 1];
            if (depth[k] !== depth[j] || !flexIsName(a) || !flexIsName(b)) continue;
            if (flexIsOp(tk[k - 1], '.') || flexIsWord(tk[k - 1], 'AS') || flexIsOp(tk[k + 2], '.') || flexIsOp(tk[k + 2], '(')) continue;
            if (columns.indexOf(a.v.toLowerCase()) === -1 || columns.indexOf(b.v.toLowerCase()) === -1) continue;
            edits.push([a.to, a.to, ',']);
            flex.fixes.push(sql.slice(a.at, b.to) + '  ->  ' + sql.slice(a.at, a.to) + ', ' + sql.slice(b.at, b.to) + '   (a missing comma:  both are columns)');
        }
    }

    //  3.  A range written with a dash,  then another condition:   score BETWEEN 90-100 AND grade = 'A'
    //      It RUNS,  but  90-100  is math  (-10),  and BETWEEN takes the AND that was meant for the next condition.
    for (let j = 0; j + 6 < tk.length; j++) {
        if (!flexIsWord(tk[j], 'BETWEEN')) continue;
        const lo = tk[j + 1], dash = tk[j + 2], hi = tk[j + 3], next = tk[j + 5], how = tk[j + 6];
        if (lo.k !== 'num' || !flexIsOp(dash, '-') || hi.k !== 'num' || lo.to !== dash.at || dash.to !== hi.at) continue;    //  90-100,  as ONE thing
        if (!flexIsWord(tk[j + 4], 'AND') || !flexIsName(next)) continue;
        const condition = (how.k === 'op' && COMPARE_SYMBOLS.has(how.v)) || flexIsWord(how, 'IS') || flexIsWord(how, 'LIKE') ||
                          flexIsWord(how, 'ILIKE') || flexIsWord(how, 'IN') || flexIsWord(how, 'BETWEEN') || flexIsWord(how, 'NOT');
        if (!condition) continue;                                       //  (BETWEEN 100-5 AND 200:  that one IS math,  and fine)
        edits.push([lo.to, hi.at, ' AND ']);
        flex.fixes.push(sql.slice(lo.at, hi.to) + '  ->  ' + sql.slice(lo.at, lo.to) + ' AND ' + sql.slice(hi.at, hi.to) +
                        '   (a range:  written with a dash it\'s math,  ' + sql.slice(lo.at, hi.to) + ' = ' + numberText(lo.v - hi.v) + ')');
        j += 4;
    }

    edits.sort(function (x, y) { return y[0] - x[0]; });                 //  (from the end backward,  so the spots don't move)
    edits.forEach(function (e) { sql = sql.slice(0, e[0]) + e[2] + sql.slice(e[1]); });
    return sql;
}


//  ONE fix for this problem   ->   the new SQL   (or null:  this one can't be fixed).
function flexFix(sql, problem, catalog, flex) {

    const why = problem.why;
    if (!why) return null;

    //  An  '  INSIDE words  ('Liam O'Brien',  'don't'):  it ended the words too soon.   SQL writes it twice:   'O''Brien'
    if ((why.kind === 'unclosed' && why.close === "'") || why.kind === 'parse') {
        const doubled = flexApostrophes(sql);
        if (doubled !== null) {
            flex.fixes.push(doubled.words.join(',  ') + '  ->  ' + doubled.words.map(function (w) { return w.split("'").join("''"); }).join(',  ') +
                            '   (an  \'  inside words is written twice in SQL)');
            return doubled.sql;
        }
    }

    //  A quote that never ends:  end it  (at the very end,  before a last  ;).
    if (why.kind === 'unclosed') {
        const end = sql.replace(/[\s;]+$/, '').length;
        flex.fixes.push('added the missing  ' + why.close + '  at the end');
        return sql.slice(0, end) + why.close + sql.slice(end);
    }

    const tk = sqlTokens(sql);
    const depth = flexDepths(tk);
    const names = catalog.names();
    const main = names.length > 0 ? names[0] : null;
    const columns = flexColumnsFor(tk, catalog);

    function say(words) { flex.fixes.push(words); }
    function words(from, to) { return sql.slice(tk[from].at, tk[to].to).replace(/\s+/g, ' '); }
    function swap(t, to, now) { return sql.slice(0, t.at) + now + sql.slice(to.to); }

    //  The statement a token is in   (between  ;  marks):   [start,  end)
    function start(i) { let j = i; while (j > 0 && !(flexIsOp(tk[j - 1], ';') && depth[j - 1] === 0)) j--; return j; }
    function end(i)   { let j = i; while (tk[j].k !== 'end' && !(flexIsOp(tk[j], ';') && depth[j] === 0)) j++; return j; }

    //  The first token from  a  to  b,  at depth  d,  that passes the test   (-1  =  none)
    function find(a, b, d, test) {
        for (let j = a; j < b; j++) if (depth[j] === d && test(tk[j])) return j;
        return -1;
    }
    function isFrom(t) { return flexIsWord(t, 'FROM'); }

    function columnFor(word) {
        const key = flexKey(word);
        const found = columns.filter(function (c) { return flexKey(c) === key; });
        return found.length === 1 ? found[0] : null;
    }

    function tableFor(word) {
        const exact = names.filter(function (n) { return n.toLowerCase() === String(word).toLowerCase(); });
        return exact.length === 1 ? exact[0] : flexClosest(String(word).replace(FLEX_ENDINGS, ''), names);
    }

    //  No FROM:  the open file's table   (in front of WHERE,  GROUP BY ...  or at the end)
    function addFrom(i) {
        if (main === null) return null;
        const s = start(i), e = end(i);
        const spot = find(s + 1, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_FROM.has(t.u); });
        say('added  FROM ' + flexName(main) + '   (the open file\'s table)');
        return flexInsert(sql, spot === -1 ? tk[e].at : tk[spot].at, 'FROM ' + flexName(main));
    }

    //  Is token j a VALUE  (not a column)?   After  =  <  LIKE  BETWEEN,  or in an  IN (...)  list.
    function isValueSpot(j) {
        const p = tk[j - 1];
        if (p === undefined) return false;
        if (p.k === 'op' && COMPARE_SYMBOLS.has(p.v)) return true;
        if (flexIsWord(p, 'LIKE') || flexIsWord(p, 'ILIKE') || flexIsWord(p, 'BETWEEN')) return true;
        for (let k = j - 1; k > 0; k--) {
            const t = tk[k];
            if (flexIsOp(t, '(')) return flexIsWord(tk[k - 1], 'IN');
            if (!(flexIsOp(t, ',') || t.k === 'str' || t.k === 'num' || t.k === 'id' || t.k === 'qid')) return false;
        }
        return false;
    }


    //  ---- THE WORDS STOPPED MAKING SENSE  (at token i) ----
    if (why.kind === 'parse') {

        const i = why.tok;
        const t = tk[i], prev = tk[i - 1], next = tk[i + 1];
        const s = start(i);
        const atEnd = t.k === 'end' || flexIsOp(t, ';');

        //  1.  The very start:   selct ...    show ...    from orders    orders    status, qty from orders
        if (i === s) {
            if (t.k === 'id' && (FLEX_SELECT.has(t.u) || flexClosest(t.u, ['SELECT']) === 'SELECT')) {
                say(sql.slice(t.at, t.to) + '  ->  SELECT');
                return swap(t, t, 'SELECT');
            }
            if (flexIsWord(t, 'FROM')) { say('added  SELECT *  in front'); return flexInsert(sql, t.at, 'SELECT *'); }
            if (flexIsName(t) && catalog.find(t.v) !== null &&
                (next.k === 'end' || flexIsOp(next, ';') || (next.k === 'id' && FLEX_AFTER_FROM.has(next.u)))) {
                say('added  SELECT * FROM  in front');
                return flexInsert(sql, t.at, 'SELECT * FROM');
            }
            if (flexIsName(t) || flexIsOp(t, '*')) { say('added  SELECT  in front'); return flexInsert(sql, t.at, 'SELECT'); }
            return null;
        }

        //  2.  Nothing to show:   SELECT FROM orders    (SELECT DISTINCT FROM ...)    SELECT  (and nothing)
        const afterSelect = flexIsWord(prev, 'SELECT') ||
            ((flexIsWord(prev, 'DISTINCT') || flexIsWord(prev, 'ALL')) && flexIsWord(tk[i - 2], 'SELECT'));
        if (afterSelect && (atEnd || flexIsOp(t, ')') || (t.k === 'id' && (t.u === 'FROM' || FLEX_AFTER_FROM.has(t.u))))) {
            say('added  *   (all the columns)');
            return flexInsert(sql, prev.to, '*');
        }

        //  3.  No table after FROM  (or JOIN):   FROM    FROM order    FROM WHERE ...    FROM all
        if (flexIsWord(prev, 'FROM') || flexIsWord(prev, 'JOIN')) {
            if (t.k === 'id' && SQL_RESERVED.has(t.u)) {
                const table = tableFor(t.v);                    //  a table called that  (or nearly):   order  ->  orders
                if (table !== null) { say(sql.slice(t.at, t.to) + '  ->  ' + flexName(table)); return swap(t, t, flexName(table)); }
            }
            //  The next part of the query starts right away  (FROM WHERE ...):  the table's name goes in FRONT of it.
            if (main !== null && (atEnd || flexIsOp(t, ')') || (t.k === 'id' && FLEX_AFTER_FROM.has(t.u)))) {
                say('added the table  ' + flexName(main));
                return flexInsert(sql, prev.to, flexName(main));
            }
            //  Something that can't be a table  (FROM all,  FROM *,  FROM 2024):  with ONE table,  it means that one.
            //  (Several tables,  like a SQL dump's?  Which one?  Don't guess.)
            if (main !== null && names.length === 1 && ((t.k === 'id' && SQL_RESERVED.has(t.u)) || flexIsOp(t, '*') || t.k === 'num' || t.k === 'str')) {
                say(sql.slice(t.at, t.to) + '  ->  ' + flexName(main) + '   (the open file\'s table)');
                return swap(t, t, flexName(main));
            }
        }

        //  4.  ORDER  /  GROUP  without  BY
        if ((flexIsWord(prev, 'ORDER') || flexIsWord(prev, 'GROUP')) && !flexIsWord(t, 'BY')) {
            say('added  BY  after  ' + prev.u);
            return flexInsert(sql, prev.to, 'BY');
        }

        //  5.  A  (  that never closes
        if (atEnd && depth[i] > 0 && problem.message.indexOf('Expected  )') === 0) {
            say('added the missing  )');
            return sql.slice(0, prev.to) + ')' + sql.slice(prev.to);
        }

        //  5b.  A percent:   score = 92%    (% on its own means "the remainder",  and nothing comes after it)   ->   '92%'
        //       (In quotes it's a number with a look,  like the file's  92%  cells:  next to a number column it's 92.)
        const num = tk[i - 2];
        if (flexIsOp(prev, '%') && num !== undefined && num.k === 'num' && num.to === prev.at &&
            (atEnd || flexIsOp(t, ')') || flexIsOp(t, ',') || (t.k === 'id' && SQL_RESERVED.has(t.u)))) {
            const quoted = flexWords(sql.slice(num.at, prev.to));
            say(sql.slice(num.at, prev.to) + '  ->  ' + quoted + '   (a percent:  % on its own means "the remainder")');
            return sql.slice(0, num.at) + quoted + sql.slice(prev.to);
        }

        //  5c.  A range with a dash  (BETWEEN 90-100)  or with TO  (BETWEEN 90 TO 100):   BETWEEN 90 AND 100
        if (problem.message.indexOf('Expected  AND') === 0) {
            let b = -1;
            for (let j = i - 1; j >= s && b === -1; j--) if (depth[j] === depth[i] && flexIsWord(tk[j], 'BETWEEN')) b = j;
            if (b !== -1 && flexIsWord(t, 'TO')) {
                say(sql.slice(t.at, t.to) + '  ->  AND   (BETWEEN puts AND between its two ends)');
                return swap(t, t, 'AND');
            }
            const lo = tk[b + 1], dash = tk[b + 2], hi = tk[b + 3];
            if (b !== -1 && i === b + 4 && lo.k === 'num' && flexIsOp(dash, '-') && hi.k === 'num' && lo.to === dash.at && dash.to === hi.at) {
                say(sql.slice(lo.at, hi.to) + '  ->  ' + sql.slice(lo.at, lo.to) + ' AND ' + sql.slice(hi.at, hi.to) + '   (a range:  BETWEEN puts AND between its two ends)');
                return sql.slice(0, lo.to) + ' AND ' + sql.slice(hi.at);
            }
        }

        //  5d.  The column left out after AND / OR:   score > 90 AND < 100   ->   score > 90 AND score < 100
        if (t.k === 'op' && COMPARE_SYMBOLS.has(t.v) && (flexIsWord(prev, 'AND') || flexIsWord(prev, 'OR'))) {
            let c = -1;                                     //  the comparison before it  (in the same part,  in the same  ( )
            for (let j = i - 2; j > s && c === -1; j--) {
                if (depth[j] < depth[i]) break;
                if (depth[j] !== depth[i]) continue;
                if (tk[j].k === 'id' && (tk[j].u === 'WHERE' || tk[j].u === 'HAVING' || tk[j].u === 'ON' || tk[j].u === 'WHEN' || tk[j].u === 'SELECT')) break;
                if (tk[j].k === 'op' && COMPARE_SYMBOLS.has(tk[j].v)) c = j;
            }
            if (c !== -1 && flexIsName(tk[c - 1])) {
                let from = c - 1;                           //  (people.score:  the whole name)
                while (flexIsOp(tk[from - 1], '.') && tk[from - 2] !== undefined && (tk[from - 2].k === 'id' || tk[from - 2].k === 'qid')) from -= 2;
                const left = sql.slice(tk[from].at, tk[c - 1].to);
                say(sql.slice(prev.at, t.to) + '  ->  ' + sql.slice(prev.at, prev.to) + ' ' + left + ' ' + sql.slice(t.at, t.to) + '   (said which column again)');
                return flexInsert(sql, t.at, left);
            }
        }

        //  6.  It stopped at the END:  the end is unfinished.   Leave it out   (... WHERE qty >   ...  LIMIT   select status,)
        if (atEnd) {
            let cut = -1;
            for (let j = i - 1; j > s && cut === -1; j--) {
                if (depth[j] === depth[i] && ((tk[j].k === 'id' && FLEX_CUT_AT.has(tk[j].u)) || flexIsOp(tk[j], ','))) cut = j;
            }
            if (cut === -1) return null;
            if (flexIsWord(tk[cut], 'BY') && (flexIsWord(tk[cut - 1], 'ORDER') || flexIsWord(tk[cut - 1], 'GROUP'))) cut--;
            say('left out the unfinished  ' + words(cut, i - 1));
            //  A condition left out  (or a WHERE with nothing in it)?   The answer has rows the question meant to keep out:  say so LOUDLY.
            if (tk[cut].k === 'id' && FLEX_WIDENS.has(tk[cut].u) && (i - 1 > cut || tk[cut].u === 'WHERE' || tk[cut].u === 'HAVING')) {
                flex.warnings.push('NOT filtered by  ' + words(cut, i - 1) + '   (it wasn\'t finished,  so it was left out)');
            }
            return sql.slice(0, tk[cut].at).replace(/\s+$/, '') + sql.slice(prev.to);
        }

        //  7.  A comma with nothing after it:   select status, from orders
        if (flexIsOp(prev, ',') && t.k === 'id' && SQL_RESERVED.has(t.u)) {
            say('took out the extra  ,  before  ' + t.u);
            return sql.slice(0, tk[i - 2].to) + sql.slice(prev.to);
        }

        //  8.  The word BEFORE this one was a typo of a part's first word,  read as a NICKNAME:
        //          from orders wher qty > 5     ("orders,  nicknamed wher")
        //          from orders oder by qty      select status form orders
        if (prev.k === 'id' && !SQL_RESERVED.has(prev.u) && catalog.find(prev.v) === null && columnFor(prev.v) === null) {
            const word = prev.u === 'SORT' ? 'ORDER' : flexClosest(prev.u, FLEX_CLAUSES);
            if (word !== null && word !== prev.u && word !== 'SELECT') {
                const now = (word === 'ORDER' || word === 'GROUP') && !flexIsWord(t, 'BY') ? word + ' BY' : word;
                say(sql.slice(prev.at, prev.to) + '  ->  ' + now);
                return swap(prev, prev, now);
            }
        }

        //  9.  A table's name,  with no FROM in front:   select * orders
        if (flexIsName(t) && catalog.find(t.v) !== null && find(s, i, depth[i], isFrom) === -1) {
            say('added  FROM  in front of  ' + sql.slice(t.at, t.to));
            return flexInsert(sql, t.at, 'FROM');
        }

        //  10.  Other words for ORDER BY:   sort by qty    orderby qty
        if (flexIsWord(t, 'SORT') || flexIsWord(t, 'ORDERBY') || flexIsWord(t, 'GROUPBY')) {
            const now = t.u === 'GROUPBY' ? 'GROUP BY' : 'ORDER BY';
            const last = t.u === 'SORT' && flexIsWord(next, 'BY') ? next : t;
            say(sql.slice(t.at, last.to) + '  ->  ' + now);
            return swap(t, last, now);
        }

        //  11.  contains  /  starts with  /  ends with   (the builder's words)   ->   LIKE
        const withWord = t.k === 'id' && (t.u === 'STARTS' || t.u === 'BEGINS' || t.u === 'ENDS') && flexIsWord(next, 'WITH');
        if (withWord || (t.k === 'id' && (t.u === 'CONTAINS' || t.u === 'HAS' || t.u === 'INCLUDES'))) {
            const v = withWord ? tk[i + 2] : next;
            if (v !== undefined && (v.k === 'str' || v.k === 'num' || v.k === 'id' || v.k === 'qid')) {
                const value = v.k === 'num' ? sql.slice(v.at, v.to) : v.v;
                const like = flexLike(value, t.u === 'STARTS' || t.u === 'BEGINS' ? '' : '%', t.u === 'ENDS' ? '' : '%');
                say(sql.slice(t.at, v.to) + '  ->  ' + like);
                return swap(t, v, like);
            }
        }

        //  12.  A typo of a part's first word:   form  ->  FROM    wher  ->  WHERE    oder  ->  ORDER BY
        //       (Not if it's really a column or a table:  then it's something else.)
        if (t.k === 'id' && catalog.find(t.v) === null && columnFor(t.v) === null) {
            const word = flexClosest(t.u, FLEX_CLAUSES);
            if (word !== null && word !== t.u) {
                const now = (word === 'ORDER' || word === 'GROUP') && !flexIsWord(next, 'BY') ? word + ' BY' : word;
                say(sql.slice(t.at, t.to) + '  ->  ' + now);
                return swap(t, t, now);
            }
        }

        //  13.  A name in 2 words:   customer id   ->   customer_id
        if (flexIsName(prev) && t.k === 'id') {
            const column = columnFor(prev.v + ' ' + t.v);
            if (column !== null) { say(sql.slice(prev.at, t.to) + '  ->  ' + flexName(column)); return swap(prev, t, flexName(column)); }
        }

        //  14.  A missing comma in the SELECT list:   select status count(*)    select status qty count
        let select = -1;
        for (let j = i - 1; j >= s && select === -1; j--) if (depth[j] === depth[i] && flexIsWord(tk[j], 'SELECT')) select = j;
        if (select !== -1 && find(select, i, depth[i], isFrom) === -1) {
            if (flexIsOp(t, '(') && flexIsName(prev) && i - 2 > select) {
                say('added a missing  ,  before  ' + sql.slice(prev.at, prev.to));
                return sql.slice(0, tk[i - 2].to) + ',' + sql.slice(tk[i - 2].to);
            }
            if (flexIsName(t) || t.k === 'num' || t.k === 'str') {
                say('added a missing  ,  before  ' + sql.slice(t.at, t.to));
                return sql.slice(0, prev.to) + ',' + sql.slice(prev.to);
            }
        }

        return null;
    }


    //  ---- SELECT *  WITH NO FROM ----
    if (why.kind === 'nofrom') return addFrom(0);


    //  ---- NO COLUMN WITH THAT NAME ----
    if (why.kind === 'column') {

        const key = String(why.name).toLowerCase();
        const spots = [];
        tk.forEach(function (t, j) {
            if ((t.k === 'id' || t.k === 'qid') && t.v.toLowerCase() === key && !flexIsOp(tk[j + 1], '(')) spots.push(j);
        });
        if (spots.length === 0) return null;
        const j = spots[0];

        //  a.  No FROM at all   (select status where qty > 5):   it's the open file's table.
        if (find(start(j), end(j), 0, isFrom) === -1) return addFrom(j);

        //  b.  A name in 2 words:   customer id   ->   customer_id
        if (flexIsName(tk[j + 1])) {
            const column = columnFor(tk[j].v + ' ' + tk[j + 1].v);
            if (column !== null) { say(words(j, j + 1) + '  ->  ' + flexName(column)); return swap(tk[j], tk[j + 1], flexName(column)); }
        }
        if (flexIsName(tk[j - 1])) {
            const column = columnFor(tk[j - 1].v + ' ' + tk[j].v);
            if (column !== null) { say(words(j - 1, j) + '  ->  ' + flexName(column)); return swap(tk[j - 1], tk[j], flexName(column)); }
        }

        //  c.  A VALUE without its quotes   (status = shipped,   status = "shipped"):   words
        if (isValueSpot(j)) {
            say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexWords(tk[j].v) + '   (words go in single quotes)');
            return swap(tk[j], tk[j], flexWords(tk[j].v));
        }

        //  d.  A typo:   statuss  ->  status   (every time it's written)
        const column = flexClosest(why.name, columns);
        if (column !== null && column.toLowerCase() !== key) {
            say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexName(column));
            let out = sql;
            for (let k = spots.length - 1; k >= 0; k--) out = out.slice(0, tk[spots[k]].at) + flexName(column) + out.slice(tk[spots[k]].to);
            return out;
        }
        return null;
    }


    //  ---- NO TABLE WITH THAT NAME ----
    if (why.kind === 'table') {

        const key = String(why.name).toLowerCase();
        if (names.some(function (n) { return n.toLowerCase() === key; })) return null;     //  (it's there:  something else is wrong)

        const spots = [];
        tk.forEach(function (t, j) { if ((t.k === 'id' || t.k === 'qid') && t.v.toLowerCase() === key) spots.push(j); });
        if (spots.length === 0) return null;
        const j = spots[0];

        //  a.  orders.csv   (read as  "the table csv,  in orders")   ->   orders
        if (flexIsOp(tk[j - 1], '.') && FLEX_ENDINGS.test('.' + tk[j].v) && flexIsName(tk[j - 2])) {
            say(words(j - 2, j) + '  ->  ' + sql.slice(tk[j - 2].at, tk[j - 2].to));
            return sql.slice(0, tk[j - 2].to) + sql.slice(tk[j].to);
        }

        //  b.  "orders.csv"  /  a near miss  /  the only table there is
        let now = tableFor(why.name);
        let note = '';
        if (now === null && names.length === 1) { now = main; note = '   (the open file\'s table)'; }
        if (now === null) return null;
        say(sql.slice(tk[j].at, tk[j].to) + '  ->  ' + flexName(now) + note);
        let out = sql;
        for (let k = spots.length - 1; k >= 0; k--) out = out.slice(0, tk[spots[k]].at) + flexName(now) + out.slice(tk[spots[k]].to);
        return out;
    }


    //  ---- A COLUMN THAT HAS TO BE IN GROUP BY   (select status, count(*) from orders) ----
    if (why.kind === 'group') {

        const key = String(why.name).toLowerCase();
        let j = 0;
        while (tk[j].k !== 'end' && !((tk[j].k === 'id' || tk[j].k === 'qid') && tk[j].v.toLowerCase() === key)) j++;
        const s = start(j), e = end(j);
        const group = find(s, e, 0, function (t) { return flexIsWord(t, 'GROUP'); });

        if (group !== -1) {
            if (!flex.grouped) return null;             //  YOUR GROUP BY:  how you meant it isn't clear.  Don't guess.
            const after = find(group + 2, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_GROUP.has(t.u); });
            const at = tk[(after === -1 ? e : after) - 1].to;
            say('added  ' + flexName(why.name) + '  to the GROUP BY');
            return sql.slice(0, at) + ', ' + flexName(why.name) + sql.slice(at);
        }

        const from = find(s, e, 0, isFrom);
        if (from === -1) return null;
        const spot = find(from + 1, e, 0, function (t) { return t.k === 'id' && FLEX_AFTER_GROUP.has(t.u); });
        flex.grouped = true;
        say('added  GROUP BY ' + flexName(why.name) + '   (a total needs groups)');
        return flexInsert(sql, spot === -1 ? tk[e].at : tk[spot].at, 'GROUP BY ' + flexName(why.name));
    }

    return null;
}


//  Fix a question WITHOUT running it   (for the builder:  your SQL,  snapped into its buttons).
//      ->  { sql,  fixes,  warnings }     (still wrong at the end?  sql is as far as the fixing got)
//  (Right away,  not in bites:  it only reads and compiles.   Another sheet that isn't read yet stays as it is.)
function flexSync(text, catalog) {
    const flex = { fixes: [], warnings: [], grouped: false };
    let sql = flexTraps(text, catalog, flex);
    for (let round = 0; round < FLEX_ROUNDS; round++) {
        try {
            const statements = parseSql(sql);
            const picked = statements[statements.length - 1];
            if (picked === undefined || picked.t === 'write') break;
            compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
            break;
        } catch (problem) {
            if (!(problem instanceof QueryError)) throw problem;
            const better = flexFix(sql, problem, catalog, flex);
            if (better === null || better === sql) break;
            sql = better;
        }
    }
    return { sql: sql, fixes: flex.fixes, warnings: flex.warnings };
}


//  SNAP TO RESULT:  the answer had NO rows.   Was it a word that's spelled a little differently in the file?
//      status = 'Shipped'    but the file only says  'shipped'    ->   { sql:  ... 'shipped' ...,   fixes:  [...] }
//  (Only when the file has ONE other spelling,  and never the one you typed.   Otherwise:  null.)
async function flexSnap(sql, picked, catalog, isCurrent) {

    //  1.  The comparisons to words:    column = 'Shipped'    column IN ('a', 'b')    column IS 'x'
    const asks = [];
    (function look(node, core) {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(function (x) { look(x, core); }); return; }
        if (node.t === 'core') core = node;
        if (core !== null && core.from !== null && core.from.t === 'table') {
            const pairs = [];
            if ((node.t === 'cmp' && node.op === '=') || (node.t === 'isdist' && node.not)) pairs.push([node.a, node.b], [node.b, node.a]);
            if (node.t === 'in' && !node.not) node.list.forEach(function (x) { pairs.push([node.e, x]); });
            pairs.forEach(function (p) {
                if (p[0].t !== 'col' || p[1].t !== 'lit' || typeof p[1].v !== 'string') return;
                const table = catalog.find(core.from.name);
                if (table === null) return;
                const col = columnNames(table).map(function (c) { return c.toLowerCase(); }).indexOf(String(p[0].name).toLowerCase());
                if (col !== -1 && asks.length < 4) asks.push({ table: table, col: col, word: p[1].v });
            });
        }
        for (const k in node) if (node[k] !== null && typeof node[k] === 'object') look(node[k], core);
    })(picked, null);
    if (asks.length === 0) return null;

    //  2.  How does the file spell each one?
    const tk = sqlTokens(sql);
    const edits = [], fixes = [];
    for (const ask of asks) {
        const spelled = await flexSpelling(ask, isCurrent);
        if (spelled === null) continue;
        tk.forEach(function (t) { if (t.k === 'str' && t.v === ask.word) edits.push([t.at, t.to, flexWords(spelled)]); });
        fixes.push(flexWords(ask.word) + '  ->  ' + flexWords(spelled) + '   (no row had it:  that\'s how the file spells it)');
    }
    if (edits.length === 0) return null;

    edits.sort(function (x, y) { return y[0] - x[0]; });
    let out = sql, last = -1;
    edits.forEach(function (e) { if (e[0] !== last) out = out.slice(0, e[0]) + e[2] + out.slice(e[1]); last = e[0]; });
    return { sql: out, fixes: fixes };
}

//  The ONE way the file spells this word  (loosely the same,  but not exactly).   null:  none,  two,  or it's there as typed.
async function flexSpelling(ask, isCurrent) {
    const want = flexLoose(ask.word);
    const table = ask.table, n = table.rowCount, width = table.rowUpTo ? ask.col + 1 : Math.max(table.columns.length, 1);
    let found = null, work = 0, stopAt = performance.now() + CHUNK_TIME;
    for (let i = 0; i < n; i++) {
        work += width;
        if (work >= BITE_CELLS) {
            work = 0;
            if (performance.now() >= stopAt) {
                await new Promise(function (go) { nextBite(go); });
                if (!isCurrent()) throw QUERY_STALE;
                stopAt = performance.now() + CHUNK_TIME;
            }
        }
        const v = (table.rowUpTo ? table.rowUpTo(i, ask.col + 1) : table.row(i))[ask.col];
        if (v === undefined || v === '') continue;
        if (v === ask.word) return null;                //  it IS in the file,  just as you typed it:  something else left no rows
        if (flexLoose(v) !== want) continue;
        if (found === null) found = v;
        else if (found !== v) return null;              //  two different spellings:  which one?  Don't guess.
    }
    return found;
}


//  The  '  marks INSIDE words   ('Liam O'Brien':  the one between O and B)   ->   { sql  (each one written twice),  words }
//  null  =  there are none,  or the quotes STILL don't add up with them doubled  (then the mistake was something else).
//  (Only ever after a mistake:   x='a'OR y=1   is fine SQL,  and a question that runs is never changed.)
function flexApostrophes(sql) {
    const letter = function (c) { return c !== undefined && c.toLowerCase() !== c.toUpperCase(); };
    const digit  = function (c) { return c !== undefined && c >= '0' && c <= '9'; };
    const inside = [];
    let state = '';                                     //  ''  =  outside,   "'"  =  in words,   '"'  '`'  ']'  =  in a name
    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (state === '') {
            if (c === "'") state = "'";
            else if (c === '"' || c === '`') state = c;
            else if (c === '[') state = ']';
            else if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql.charCodeAt(i) !== 10) i++; }
            else if (c === '/' && sql[i + 1] === '*') { const end = sql.indexOf('*/', i + 2); if (end === -1) return null; i = end + 1; }
            continue;
        }
        if (state !== "'") {                            //  in a name:  only its own closing mark counts   ("" = a real ")
            if (c === state) { if (state !== ']' && sql[i + 1] === state) i++; else state = ''; }
            continue;
        }
        if (c !== "'") continue;
        if (sql[i + 1] === "'") { i++; continue; }      //  ''  =  already written twice
        if ((letter(sql[i - 1]) || digit(sql[i - 1])) && letter(sql[i + 1])) { inside.push(i); continue; }     //  O'Brien:  inside the words
        state = '';
    }
    if (state !== '' || inside.length === 0) return null;
    let out = sql;
    for (let k = inside.length - 1; k >= 0; k--) out = out.slice(0, inside[k]) + "'" + out.slice(inside[k]);
    try { sqlTokens(out); } catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const marks = new Set(inside), words = [];
    inside.forEach(function (at) {                      //  the words each one was in   (for the fix's note:   O'Brien  ->  O''Brien)
        let a = at, b = at + 1;
        while (a > 0 && (letter(sql[a - 1]) || digit(sql[a - 1]) || marks.has(a - 1))) a--;
        while (b < sql.length && (letter(sql[b]) || digit(sql[b]) || marks.has(b))) b++;
        const w = sql.slice(a, b);
        if (words.indexOf(w) === -1) words.push(w);
    });
    return { sql: out, words: words };
}


//  An answer with NOTHING in it:  no rows,  or one row of totals of nothing  (COUNT = 0,  SUM = NULL ...).
//  (Snap to result only looks again after an answer like that.)
function answerIsEmpty(answer, picked) {
    if (answer.rows.length === 0) return true;
    if (answer.rows.length > 1 || picked.t !== 'query' || picked.body.t !== 'core' || picked.body.group !== null) return false;
    if (!picked.body.items.every(function (it) { return !it.star && isTotal(it.e); })) return false;
    return answer.rows[0].every(function (v) { return v === null || v === 0; });
}


//  column = ''   where an EMPTY cell means NULL  (a CSV,  an Excel sheet):  no row there is ever  ''   ->   column IS NULL
//  (Only after an empty answer,  like the spelling snap.   A SQL dump keeps  ''  and NULL apart:  it's left alone there.)
function flexEmptyWords(sql, picked, catalog) {
    let tk;
    try { tk = sqlTokens(sql); } catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const columns = new Set();
    walkQuery(picked, function (item) {
        const table = catalog.find(item.name);
        if (table !== null && table.emptyIsNull) columnNames(table).forEach(function (c) { columns.add(c.toLowerCase()); });
    });
    const edits = [], fixes = [];
    for (let j = 2; j < tk.length; j++) {
        const empty = tk[j], is = tk[j - 1], col = tk[j - 2];
        if (empty.k !== 'str' || empty.v !== '' || !(flexIsOp(is, '=') || flexIsOp(is, '=='))) continue;
        if (!(col.k === 'id' || col.k === 'qid') || !columns.has(String(col.v).toLowerCase()) || flexIsOp(tk[j + 1], '||')) continue;
        edits.push([is.at, empty.to, 'IS NULL']);
        fixes.push(sql.slice(col.at, empty.to) + '  ->  ' + sql.slice(col.at, col.to) + ' IS NULL   (an empty cell is NULL here,  not \'\')');
    }
    if (edits.length === 0) return null;
    let out = sql;
    for (let k = edits.length - 1; k >= 0; k--) out = out.slice(0, edits[k][0]) + edits[k][2] + out.slice(edits[k][1]);
    return { sql: out, fixes: fixes };
}


//  STUCK:  even fixed,  the question can't run.   Put what's known on the problem,  in words for you  (and for the code).
function flexStuck(problem, text, sql, flex, words, catalog, flexible) {

    const write = problem.why && problem.why.kind === 'write';

    //  Plain words,  only partly understood:   "Did you mean ...?"   (The page offers to ask it:  YOU decide.)
    //  (No question at all,  but it knows WHY a word didn't fit?   "average Letter Grade":  it's words,  not numbers.   Say that.)
    if (words !== null) {
        const asked = new QueryError(words.sql === null
            ? 'That reads like plain words,  and I couldn\'t make a question of it:   ' + words.unused.join('   ·   ') + '.   Try words like:   ' +
              wordsExamples(catalog).join('   ·   ')
            : 'That reads like plain words.   Did you mean:   ' + words.meaning + '?' + '   (I didn\'t use:  ' + words.unused.join(',  ') + ')');
        asked.why = { kind: 'words', sql: words.sql, unused: words.unused, meaning: words.meaning };
        asked.sql = text;
        asked.fixes = [];
        asked.warnings = [];
        return asked;
    }

    problem.sql = sql;                                  //  (how far the fixing got,  so the brain can show where it's stuck)
    problem.fixes = flex.fixes;
    problem.warnings = flex.warnings;

    //  Plain words,  but no question in them at all   ("please help me"):   instead of SQL's words,  examples with YOUR columns.
    if (flexible && !write && flexLooksLikeWords(text, catalog)) {
        const plain = new QueryError('That reads like plain words,  and I couldn\'t find a question in them.   Try words like:   ' +
                                     wordsExamples(catalog).join('   ·   ') + '   (or SQL:  it starts with SELECT)');
        plain.why = { kind: 'words', sql: null, unused: [], meaning: null };
        plain.sql = text;
        plain.fixes = [];
        plain.warnings = [];
        return plain;
    }

    //  More than one question  (split by  ;):   only the LAST one runs.   Say so,  and whether the one before it was fine.
    if (flexStatementCount(text) > 1) {
        problem.message = 'The LAST question  (after the last  ;)  has a problem:   ' + problem.message +
            (flexEarlierIsFine(text, catalog)
                ? '   (Only the last question in the box runs.   The one before it is fine on its own:  delete what comes after its  ;  to run it.)'
                : '   (Only the last question in the box runs.)');
    }

    //  Fixing is OFF,  and those are plain words?   Say how to ask in words.
    if (!flexible && !write && flexLooksLikeWords(text, catalog)) {
        problem.message += '   (Those look like plain words:  tick  "Fix my typos"  to ask in your own words.)';
    }
    return problem;
}

//  Where each question in the text starts and stops  (split by the  ;  marks that aren't inside  ( )):   [[first token, end token] ...]
function flexStatementRanges(tk) {
    const out = [];
    let start = 0, depth = 0;
    for (let j = 0; j < tk.length; j++) {
        const t = tk[j];
        if (t.k === 'op' && t.v === '(') depth++;
        else if (t.k === 'op' && t.v === ')') depth = Math.max(0, depth - 1);
        if (t.k === 'end' || (t.k === 'op' && t.v === ';' && depth === 0)) {
            if (j > start) out.push([start, j]);
            start = j + 1;
        }
    }
    return out;
}

function flexStatementCount(text) {
    try { return flexStatementRanges(sqlTokens(text)).length; }
    catch (problem) { if (problem instanceof QueryError) return 1; throw problem; }
}

//  The question BEFORE the last one:  a whole,  good question on its own?   (Then only what came after it is wrong.)
function flexEarlierIsFine(text, catalog) {
    try {
        const tk = sqlTokens(text);
        const ranges = flexStatementRanges(tk);
        if (ranges.length < 2) return false;
        const statements = parseSql(text.slice(0, tk[ranges[ranges.length - 1][0]].at));
        const picked = statements[statements.length - 1];
        if (picked.t !== 'query') return false;
        compileQuery(picked, null, { catalog: catalog, ctes: new Map(), owner: null });
        return true;
    } catch (problem) {
        if (problem instanceof QueryError) return false;
        throw problem;
    }
}

//  The SHAPE of a command that changes data,  anywhere in the text   (DROP TABLE,  DELETE FROM,  INSERT INTO,  UPDATE x SET ...)
const FLEX_WRITE_SHAPE = /\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA)\b|\bDELETE\s+FROM\b|\bINSERT\s+(OR\s+\w+\s+)?INTO\b|\bUPDATE\s+\S+\s+SET\b|\b(GRANT|REVOKE)\s+\w+/i;

//  Does this read like PLAIN WORDS,  not SQL?
//      show me the A students                    ->  yes   (it doesn't start the way SQL does)
//      select the kids who passed                ->  yes   (most of its words are no SQL word,  no column,  no table)
//      SELECT * FROM orders WHERE Name = Bob     ->  no    (SQL,  with a mistake in it:  SQL's own words say what's wrong)
function flexLooksLikeWords(text, catalog) {
    let first;
    try {
        const tk = sqlTokens(text).filter(function (t) { return !(t.k === 'op' && t.v === ';'); });     //  (only comments and  ;  ?   No question at all)
        first = tk[0].k === 'id' ? tk[0].u : tk[0].k === 'op' ? tk[0].v : tk[0].k;
    } catch (problem) {
        if (!(problem instanceof QueryError)) throw problem;
        const word = wordPieces(text).find(function (p) { return p.k === 'word'; });      //  (it can't even be cut into SQL:   show me Liam O'Brien)
        first = word === undefined ? 'end' : word.v.toUpperCase();
    }
    if (first === 'end' || WRITE_COMMANDS.has(first)) return false;
    if (FLEX_WRITE_SHAPE.test(wordsWithoutComments(text))) return false;           //  '; DROP TABLE x; --   is SQL that writes,  not a sentence
    if (flexStatementCount(text) > 1) return false;                                 //  (people don't put  ;  between the parts of a sentence:  SQL does)
    if (first !== 'SELECT' && first !== 'WITH' && first !== '(') return true;
    const known = new Set();
    catalog.names().forEach(function (n) {
        known.add(flexKey(n));
        const table = catalog.find(n);
        if (table !== null) columnNames(table).forEach(function (c) { known.add(flexKey(c)); });
    });
    const plain = wordPieces(wordsWithoutComments(text)).filter(function (p) { return p.k === 'word'; });
    const unknown = plain.filter(function (p) {
        const u = p.v.toUpperCase();
        return !SQL_RESERVED.has(u) && findFunction(u) === undefined && findTotal(u) === undefined && !known.has(flexKey(p.v));
    });
    return unknown.length >= 2 && unknown.length >= 0.4 * plain.length;
}



// ----------------------------------------------------------
//
//    A TABLE'S PROFILE   (what's IN each column:  for plain words,  and the menu's "Try:" questions)
//
//    One look at up to PROFILE_ROWS rows,  spread through the whole file  (in bites),  then kept on the table.
//    For each of the first PROFILE_COLUMNS columns:
//        { name,  kind,
//          values,   Map:  the words written loosely  ->  the file's own spelling     ('shipped'  ->  'Shipped')
//                    null  =  more than PROFILE_VALUES different ones  (names,  notes ...:  not a "pick one" column)
//          count,    Map:  the file's spelling  ->  how many of the rows looked at have it
//          filled }  how many of those rows have something in this column
//
// ----------------------------------------------------------

const PROFILE_ROWS    = 20000;
const PROFILE_COLUMNS = 60;
const PROFILE_VALUES  = 500;

async function tableProfile(table, isCurrent) {

    if (table.profile) return table.profile;

    const names = columnNames(table);
    const width = Math.min(names.length, PROFILE_COLUMNS);
    let stopAt = performance.now() + CHUNK_TIME;
    async function breathe() {
        if (performance.now() < stopAt) return;
        await new Promise(function (go) { nextBite(go); });
        if (!isCurrent()) throw QUERY_STALE;
        stopAt = performance.now() + CHUNK_TIME;
    }

    //  Their kinds first  (in bites too:  a wide file's are a lot of looking)
    const only = [];
    for (let j = 0; j < width; j++) only.push(j);
    const looking = lookAtKinds(table, only);
    while (!looking.next().done) await breathe();

    const cols = [];
    for (let j = 0; j < width; j++) cols.push({ name: names[j], kind: table.kinds[j], values: new Map(), count: new Map(), filled: 0 });

    const n = table.rowCount;
    const sample = Math.min(n, PROFILE_ROWS);
    const step = n / Math.max(sample, 1);
    let work = 0;
    for (let s = 0; s < sample; s++) {
        work += width;
        if (work >= BITE_CELLS || (s & 511) === 511) { work = 0; await breathe(); }
        const r = Math.floor(s * step);
        const cells = table.rowUpTo ? table.rowUpTo(r, width) : table.row(r);
        for (let j = 0; j < width; j++) {
            const v = cells[j];
            if (v === undefined || v === '' || (table.isNull !== null && table.isNull(r, j))) continue;
            const col = cols[j];
            col.filled++;
            if (col.values === null) continue;
            const key = flexLoose(v);
            if (!col.values.has(key)) {
                if (col.values.size >= PROFILE_VALUES) { col.values = null; col.count = null; continue; }
                col.values.set(key, v);
            }
            const spelled = col.values.get(key);
            col.count.set(spelled, (col.count.get(spelled) || 0) + 1);
        }
    }

    table.profile = { rows: sample, columns: cols };
    return table.profile;
}

function isNumberKind(kind) {
    return kind === 'int' || kind === 'real' || kind === 'num';
}

//  What each column is FOR   (from its profile):
//      groups     2 to 12 different values  (and fewer than half the rows):   Region,  Status,  Grade Level   ->  "for each ..."
//      measures   numbers that change  (not a group,  not an ID)                                             ->  "average ...",  "top 5 by ..."
//      dates      dates                                                                                      ->  "newest first"
const ID_LIKE = /(^|[^A-Za-z])(id|ID|Id)$/;

function profileRoles(profile) {
    const groups = [], measures = [], dates = [];
    profile.columns.forEach(function (c) {
        if (c.filled === 0) return;
        const size = c.values === null ? Infinity : c.values.size;
        const group = size >= 2 && size <= 12 && size <= Math.max(2, c.filled / 2);
        if (group) groups.push(c);
        //  (a number with only a few values is a code:  Grade Level 9 / 10.   With more  (qty 1 ... 10),  it's ALSO a measure)
        if (isNumberKind(c.kind) && size > (group ? 5 : 1) && !ID_LIKE.test(c.name)) measures.push(c);
        if (c.kind === 'date' || c.kind === 'timestamp') dates.push(c);
    });
    //  Words make the best groups  (Status,  Region),  then the fewest values   (the order is always the same:  a sort that keeps ties)
    const size = function (c) { return c.values === null ? Infinity : c.values.size; };
    groups.sort(function (a, b) { return (isNumberKind(a.kind) - isNumberKind(b.kind)) || size(a) - size(b); });
    return { groups: groups, measures: measures.filter(function (c) { return groups[0] !== c; }), dates: dates };
}

//  A value,  as SQL,  for a column of this kind:   a number stays a number  (for a number column),  anything else is words.
function profileValue(v, kind) {
    return isNumberKind(kind) && NUMBER_WORDS.test(v) ? String(v).trim() : flexWords(v);
}

//  The menu's "Try:" questions:  up to 4 REAL questions about this table,  each in plain words,  with its SQL.
//  (Built only from its columns' profile:  the same table always gets the same ones.)
function tableStarters(profile, tableName) {
    const roles = profileRoles(profile);
    const from = ' FROM ' + flexName(tableName);
    const g = roles.groups[0], m = roles.measures[0], d = roles.dates[0];
    const out = [];
    if (g) out.push({ words: 'How many for each ' + g.name,
                      sql: 'SELECT ' + flexName(g.name) + ', COUNT(*)' + from + ' GROUP BY ' + flexName(g.name) + ' ORDER BY COUNT(*) DESC' });
    if (g && m) out.push({ words: 'Average ' + m.name + ' for each ' + g.name,
                           sql: 'SELECT ' + flexName(g.name) + ', AVG(' + flexName(m.name) + ')' + from + ' GROUP BY ' + flexName(g.name) +
                                ' ORDER BY AVG(' + flexName(m.name) + ') DESC' });
    if (m) out.push({ words: 'Top 5 by ' + m.name, sql: 'SELECT *' + from + ' ORDER BY ' + flexName(m.name) + ' DESC LIMIT 5' });
    if (d && out.length < 4) out.push({ words: 'Newest 10 by ' + d.name, sql: 'SELECT *' + from + ' ORDER BY ' + flexName(d.name) + ' DESC LIMIT 10' });
    if (g && out.length < 4) {
        let common = null, most = 0;
        g.count.forEach(function (n, v) { if (n > most) { most = n; common = v; } });
        out.push({ words: 'Rows where ' + g.name + ' is ' + common, sql: 'SELECT *' + from + ' WHERE ' + flexName(g.name) + ' = ' + profileValue(common, g.kind) });
    }
    if (out.length === 0) out.push({ words: 'The first 10 rows', sql: 'SELECT *' + from + ' LIMIT 10' });
    return out.slice(0, 4);
}

//  2 or 3 plain-word questions with this table's OWN column names   (for "Try words like ...")
function wordsExamples(catalog) {
    const name = catalog.names()[0];
    const table = name === undefined ? null : catalog.find(name);
    if (table === null || !table.profile) return ['how many rows', 'the first 10 rows'];
    return tableStarters(table.profile, name).map(function (s) { return s.words.charAt(0).toLowerCase() + s.words.slice(1); }).slice(0, 3);
}



// ----------------------------------------------------------
//
//    PLAIN WORDS  ->  SQL   (plain words typed in the SQL box,  with "Fix my typos" on)
//
//        how many for each grade level             ->   SELECT "Grade Level", COUNT(*) FROM class_data GROUP BY "Grade Level"
//        average score per grade level             ->   SELECT "Grade Level", AVG(Score) FROM class_data GROUP BY "Grade Level"
//        who has the highest score                 ->   SELECT * FROM class_data ORDER BY Score DESC LIMIT 1
//        names and scores where score is over 90   ->   SELECT "Student Name", Score FROM class_data WHERE Score > 90
//        show me the A students                    ->   SELECT * FROM class_data WHERE "Letter Grade" = 'A'
//
//    NOT a mind reader,  on purpose.   It knows:
//        -  the open table's COLUMN names   (any capitals,  spaces or _,  one word of a longer name,  a plural,  a small typo)
//        -  its VALUES   ("A",  "shipped":  read from the file  (its profile),  so they're spelled the file's way)
//        -  numbers,  'words in quotes',  dates  (2024-05-01)
//        -  the plain words for the parts of a question  (WORDS_KNOWN),  and the little words of a sentence  (WORDS_FILLER)
//    Any OTHER word is handed back as UNUSED.   A question with an unused word never runs by itself:
//    the page asks "Did you mean ...?" first.   So it can't quietly answer a different question.
//
//    ->  { sql,  unused  (words),  meaning  (the question back in words) }     or null  (nothing in it to use)
//
// ----------------------------------------------------------

const WORDS_KNOWN = new Map([
    //  totals
    ['how many', 'count'], ['number of', 'count'], ['count of', 'count'], ['count', 'count'], ['total number of', 'count'],
    ['how many different', 'distinct'], ['number of different', 'distinct'], ['different', 'distinct'], ['distinct', 'distinct'], ['unique', 'distinct'],
    ['average', 'avg'], ['average of', 'avg'], ['avg', 'avg'], ['mean', 'avg'],
    ['total', 'sum'], ['total of', 'sum'], ['sum', 'sum'], ['sum of', 'sum'], ['add up', 'sum'],
    ['median', 'median'], ['middle value of', 'median'],
    ['highest', 'high'], ['biggest', 'high'], ['largest', 'high'], ['greatest', 'high'], ['maximum', 'high'], ['max', 'high'], ['most', 'high'],
    ['latest', 'high'], ['newest', 'high'], ['most recent', 'high'],
    ['lowest', 'low'], ['smallest', 'low'], ['least', 'low'], ['minimum', 'low'], ['min', 'low'], ['fewest', 'low'], ['earliest', 'low'], ['oldest', 'low'],
    //  groups
    ['for each', 'each'], ['for every', 'each'], ['in each', 'each'], ['per', 'each'], ['each', 'each'], ['grouped by', 'each'], ['group by', 'each'],
    ['broken down by', 'each'], ['by', 'by'],
    //  sorting,  and how many rows
    ['sorted by', 'sort'], ['sort by', 'sort'], ['order by', 'sort'], ['ordered by', 'sort'], ['ranked by', 'sort'], ['sorted', 'sort'], ['sort', 'sort'],
    ['highest first', 'desc'], ['biggest first', 'desc'], ['largest first', 'desc'], ['most first', 'desc'], ['high to low', 'desc'], ['descending', 'desc'],
    ['desc', 'desc'], ['z to a', 'desc'], ['z-a', 'desc'], ['newest first', 'desc'], ['latest first', 'desc'],
    ['lowest first', 'asc'], ['smallest first', 'asc'], ['least first', 'asc'], ['low to high', 'asc'], ['ascending', 'asc'], ['asc', 'asc'],
    ['a to z', 'asc'], ['a-z', 'asc'], ['alphabetical', 'asc'], ['alphabetically', 'asc'], ['oldest first', 'asc'], ['earliest first', 'asc'],
    ['top', 'top'], ['bottom', 'bottom'], ['first', 'first'], ['limit', 'first'],
    //  conditions
    ['more than', '>'], ['greater than', '>'], ['higher than', '>'], ['bigger than', '>'], ['larger than', '>'], ['over', '>'], ['above', '>'],
    ['after', '>'], ['later than', '>'], ['>', '>'],
    ['at least', '>='], ['no less than', '>='], ['>=', '>='],
    ['or more', '>=after'], ['or higher', '>=after'], ['or above', '>=after'], ['and up', '>=after'], ['or later', '>=after'],
    ['less than', '<'], ['fewer than', '<'], ['lower than', '<'], ['smaller than', '<'], ['under', '<'], ['below', '<'],
    ['before', '<'], ['earlier than', '<'], ['<', '<'],
    ['at most', '<='], ['no more than', '<='], ['<=', '<='],
    ['or less', '<=after'], ['or fewer', '<=after'], ['or lower', '<=after'], ['or below', '<=after'], ['or earlier', '<=after'],
    ['is not', '<>'], ['isn\'t', '<>'], ['isnt', '<>'], ['are not', '<>'], ['aren\'t', '<>'], ['not', '<>'], ['except', '<>'], ['other than', '<>'],
    ['!=', '<>'], ['<>', '<>'],
    ['is', '='], ['are', '='], ['was', '='], ['were', '='], ['equals', '='], ['equal to', '='], ['is equal to', '='], ['=', '='], ['==', '='],
    ['between', 'between'], ['from', 'from'], ['to', 'to'], ['through', 'to'], ['-', 'to'], ['and', 'and'], ['or', 'or'],
    ['contains', 'contains'], ['containing', 'contains'], ['contain', 'contains'], ['including', 'contains'], ['includes', 'contains'],
    ['starts with', 'starts'], ['starting with', 'starts'], ['start with', 'starts'], ['begins with', 'starts'], ['beginning with', 'starts'],
    ['ends with', 'ends'], ['ending with', 'ends'], ['end with', 'ends'],
    ['is empty', 'empty'], ['is blank', 'empty'], ['is missing', 'empty'], ['are empty', 'empty'], ['are blank', 'empty'], ['are missing', 'empty'],
    ['empty', 'empty'], ['blank', 'empty'], ['missing', 'empty'], ['no', 'no'], ['without', 'no'], ['without a', 'no'], ['without any', 'no'],
    ['is not empty', 'filled'], ['isn\'t empty', 'filled'], ['not empty', 'filled'], ['not blank', 'filled'], ['filled in', 'filled'], ['filled', 'filled'],
    ['with', 'with'], ['has', 'with'], ['have', 'with'], ['having', 'with'], ['has a', 'with'], ['have a', 'with'],
]);

//  The little words of a sentence:  left out,  no harm done   ("please show me ALL the rows",  "who got the highest ...").
const WORDS_FILLER = new Set(('a an the of me my us our we i you your please can could would will do does did just only all every any some ' +
    'there here be been being show list give get find display tell see want need let lets what whats which who whos whose where when how ' +
    'in on at for so also too really very thanks thank ok okay hi hello hey now then table file sheet spreadsheet csv data info information ' +
    'result results answer whole entire got gets getting made earned received took ' +
    'rows row records record entries entry everything everyone everybody people person persons students student kids kid ' +
    'employees employee customers customer users user members member staff workers clients patients tickets incidents ' +
    'requests cases transactions accounts items ones').split(' '));

//  Words for "the rows",  as a person says it   (then  "highest"  means the top row,  not a total)
const WORDS_ROWS = new Set('rows row records record entries entry everyone everybody people person persons students student kids kid employees employee customers customer users user members member staff workers clients patients tickets incidents requests cases transactions accounts items ones who whos which'.split(' '));

//  Words about an EARLIER question  ("sort THAT by name"):  it doesn't remember one,  so they're never quietly dropped.
const WORDS_CONTEXT = new Set('that those these them it its previous again same last above'.split(' '));

//  The words of a text,  with SQL's comments taken out  (-- like this,  /* and this */):  a comment is never read as a question.
//  (Cut the SQL way,  so a  --  inside 'quotes' stays.   Can't be cut that way  (show me Liam O'Brien)?   As it is.)
function wordsWithoutComments(text) {
    let tk;
    try { tk = sqlTokens(text); } catch (problem) { if (problem instanceof QueryError) return text; throw problem; }
    let out = '', at = 0;
    tk.forEach(function (t) {                           //  (between 2 pieces there's only space and comments:  85%  and  1,200  stay whole)
        const gap = text.slice(at, t.at);
        out += /--|\/\*/.test(gap) ? ' ' : gap;
        if (t.k !== 'end') { out += text.slice(t.at, t.to); at = t.to; }
    });
    return out;
}

//  Plain words  ->  pieces:   { k: 'word' | 'num' | 'str' | 'date' | 'sym',  v: as written,  low: in small letters }
const WORDS_PIECE = /'([^']*)'|"([^"]*)"|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})|([$€£¥]?\d[\d,]*(?:\.\d+)?%?|\.\d+%?)|(>=|<=|<>|!=|==|[<>=])|([A-Za-z0-9_À-￿](?:[A-Za-z0-9_À-￿'’-]*[A-Za-z0-9_À-￿])?)|(\S)/g;

function wordPieces(text) {
    const out = [];
    let m;
    WORDS_PIECE.lastIndex = 0;
    while ((m = WORDS_PIECE.exec(text)) !== null) {
        if (m[1] !== undefined || m[2] !== undefined) out.push({ k: 'str', v: m[1] !== undefined ? m[1] : m[2] });
        else if (m[3] !== undefined) out.push({ k: 'date', v: m[3] });
        else if (m[4] !== undefined) out.push({ k: 'num', v: m[4] });
        else if (m[5] !== undefined) out.push({ k: 'sym', v: m[5] });
        else if (m[6] !== undefined) out.push({ k: 'word', v: m[6].replace(/’/g, "'") });
        else out.push({ k: 'sym', v: m[7] });
    }
    out.forEach(function (p) { p.low = p.v.toLowerCase(); });
    return out;
}

//  A word,  and the shorter words it could be   (scores  ->  score,   scored  ->  score,   names  ->  name)
function wordStems(w) {
    const out = [w];
    if (w.length > 3 && /s$/.test(w)) out.push(w.slice(0, -1));
    if (w.length > 4 && /es$/.test(w)) out.push(w.slice(0, -2));
    if (w.length > 4 && /d$/.test(w)) out.push(w.slice(0, -1));
    if (w.length > 4 && /ed$/.test(w)) out.push(w.slice(0, -2));
    return out;
}

async function readWords(text, catalog, isCurrent) {

    const tableName = catalog.names()[0];
    const table = tableName === undefined ? null : catalog.find(tableName);
    if (table === null) return null;
    const profile = await tableProfile(table, isCurrent);
    const cols = columnNames(table);
    const keys = cols.map(flexKey);
    const parts = cols.map(function (c) { return c.toLowerCase().split(/[^a-z0-9À-￿]+/).filter(function (w) { return w !== ''; }); });
    const kindOf = function (j) { return j < profile.columns.length ? profile.columns[j].kind : kindAt(table, j); };
    const pieces = wordPieces(wordsWithoutComments(text));
    const span = function (i, n) { return pieces.slice(i, i + n).map(function (p) { return p.v; }).join(' '); };


    //  ---- 1.  WHAT EACH PIECE IS:   a column  ·  a known word  ·  a value from the file  ·  a little word  ·  unknown ----

    //  A column's name,  at piece i   (the longest one that fits):   { col,  len }     (2 columns have that word?   { cols,  len })
    function columnAt(i) {
        for (let len = Math.min(5, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'num' || (p.k === 'sym' && (p.v === '%' || p.v === '#' || p.v === '&')); })) continue;
            const key = flexKey(span(i, len));
            const hits = [];
            keys.forEach(function (k, j) { if (k === key || k === key + 's' || k === key + 'es' || k + 's' === key || k + 'es' === key) hits.push(j); });
            if (hits.length === 1) return { col: hits[0], len: len };
        }
        const p = pieces[i];
        if (p.k !== 'word' || p.low.length < 3 || WORDS_FILLER.has(p.low) || WORDS_KNOWN.has(p.low)) return null;
        const stems = wordStems(p.low);
        const hits = [];                                //  one word of a longer name   (name  ->  Student Name,   homework  ->  Makeup Homework)
        parts.forEach(function (ws, j) { if (ws.some(function (w) { return stems.indexOf(w) !== -1; })) hits.push(j); });
        if (hits.length === 1) return { col: hits[0], len: 1 };
        if (hits.length > 1) return { cols: hits, len: 1 };
        if (p.low.length >= 5) {                        //  a small typo of a whole name   (atendance  ->  Attendance %)
            const near = flexClosest(p.v, cols);
            if (near !== null) return { col: cols.indexOf(near), len: 1 };
        }
        return null;
    }

    //  The longest known plain words at piece i:   { m,  len }
    function knownAt(i) {
        for (let len = Math.min(4, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'sym'; })) continue;
            const m = WORDS_KNOWN.get(run.map(function (p) { return p.low; }).join(' '));
            if (m !== undefined) return { m: m, len: len };
        }
        return null;
    }

    //  The file's own words at piece i   ("A",  "New York"):   { col,  spelled,  len }     (in 2 columns?   { cols,  len })
    function valueAt(i) {
        for (let len = Math.min(4, pieces.length - i); len >= 1; len--) {
            const run = pieces.slice(i, i + len);
            if (!run.every(function (p) { return p.k === 'word' || p.k === 'num' || p.k === 'str' || (p.k === 'sym' && (p.v === '&' || p.v === '/')); })) continue;
            const key = flexLoose(span(i, len));
            const hits = [];
            profile.columns.forEach(function (c, j) { if (c.values !== null && c.values.has(key)) hits.push(j); });
            if (hits.length === 1) return { col: hits[0], spelled: profile.columns[hits[0]].values.get(key), len: len };
            if (hits.length > 1) return { cols: hits, len: len };
        }
        return null;
    }

    const items = [];
    for (let i = 0; i < pieces.length; ) {
        const p = pieces[i];
        if (p.k === 'sym' && !WORDS_KNOWN.has(p.v)) { i++; continue; }            //  ?  !  ,  .   (nothing here)
        if (p.k === 'str' || p.k === 'date') {
            const v = valueAt(i);
            items.push({ t: 'value', k: p.k, v: v !== null && v.col !== undefined ? v.spelled : p.v, col: v !== null && v.col !== undefined ? v.col : null, words: p.v });
            i++;
            continue;
        }
        let C = columnAt(i);
        const K = knownAt(i), V = valueAt(i);
        //  A word that's in 2 columns' names  ("grade":  Grade Level?  Letter Grade?),  right before a value only ONE of them has
        //  ("grade 10":  only Grade Level has a 10)   ->   that one.
        if (C !== null && C.cols !== undefined) {
            const after = i + 1 < pieces.length ? valueAt(i + 1) : null;
            if (after !== null && after.col !== undefined && C.cols.indexOf(after.col) !== -1) C = { col: after.col, len: 1 };
        }
        const cl = C ? C.len : 0, kl = K ? K.len : 0, vl = V ? V.len : 0;
        //  A capital letter or word that's in the file beats a little word:   "the A students"   ("a list"  stays a little word)
        const capital = V !== null && V.col !== undefined && V.len === 1 && p.k === 'word' && p.v !== p.low && p.low !== 'i' && i > 0;
        if (cl > 0 && cl >= kl && cl >= vl && !capital) {
            items.push(C.col !== undefined ? { t: 'col', col: C.col, words: span(i, cl) }
                                           : { t: 'unknown', words: span(i, cl) + '  (' + C.cols.map(function (j) { return cols[j]; }).join(' or ') + '?)' });
            i += cl;
            continue;
        }
        if (vl > 0 && (capital || vl > kl) && V.col !== undefined) {
            const number = vl === 1 && p.k === 'num';       //  (a number that's also in the file,  like a 3 in "Lunch Period":  still a number:  "top 3")
            items.push({ t: 'value', k: number ? 'num' : 'word', v: number ? p.v : V.spelled, col: V.col, words: span(i, vl) });
            i += vl;
            continue;
        }
        if (kl > 0) { items.push({ t: 'known', m: K.m, words: span(i, kl) }); i += kl; continue; }
        if (p.k === 'num') { items.push({ t: 'value', k: 'num', v: p.v, col: V !== null && V.col !== undefined ? V.col : null, words: p.v }); i++; continue; }
        if (p.k === 'word' && (WORDS_FILLER.has(p.low) || flexKey(p.v) === flexKey(tableName))) { items.push({ t: 'filler', w: p.low, words: p.v }); i++; continue; }
        items.push({ t: 'unknown', raw: p.v, words: vl > 0 ? span(i, vl) + '  (in more than one column)'
                                                    : WORDS_CONTEXT.has(p.low) ? p.v + '  (it doesn\'t remember an earlier question)' : p.v });
        i += Math.max(vl, 1);
    }


    //  ---- 2.  READ THEM INTO A QUESTION   (left to right) ----

    const q = { show: [], totals: [], group: [], filters: [], sort: [], limit: null };
    const unused = [];
    const joins = [];               //  the  and / or  between each 2 conditions
    const highLow = [];             //  highest / lowest + a column:  a total  (MAX)  or the top row  (decided at the end)
    let lastCol = null;             //  a column just named and not used yet:  a condition's left side,  or a column to show
    let lastList = null;            //  which list the last column went in   ("for each A and B":  B goes there too)
    let wait = null;                //  a word waiting for its column:   { m,  words }
    let cond = null;                //  a condition waiting for its value:   { col,  op,  words }
    let range = null;               //  a range waiting for its ends:   { col,  lo,  words }
    let top = null;                 //  top 5  /  bottom 3  /  first 10:   { n,  desc  (null = no order),  col,  words }
    let pendingDir = null;          //  "A to Z" said before its column
    let join = null;                //  an  and / or  said since the last condition

    const asksTotal = items.some(function (it) { return it.t === 'filler' && (it.w === 'what' || it.w === 'whats'); });
    const asksRows  = items.some(function (it) { return it.t === 'filler' && WORDS_ROWS.has(it.w); });
    const anyTotal  = items.some(function (it) { return it.t === 'known' && ['count', 'distinct', 'avg', 'sum', 'median'].indexOf(it.m) !== -1; });
    const showsAll  = items.some(function (it) { return it.t === 'filler' && /^(show|list|display|everything|all|everyone|everybody)$/.test(it.w); });
    const OPS = new Set(['>', '>=', '<', '<=', '=', '<>', 'contains', 'starts', 'ends']);
    const NOT_OP = { '>': '<=', '>=': '<', '<': '>=', '<=': '>' };

    function condition(col, op, value) {
        if (q.filters.length > 0) joins.push(join || 'and');
        join = null;
        q.filters.push({ col: col, op: op, value: value });
    }
    function giveUp(words) { if (words) unused.push(words); cond = null; range = null; }
    function nextItem(k) { let j = k + 1; while (j < items.length && items[j].t === 'filler') j++; return j < items.length ? items[j] : null; }

    for (let k = 0; k < items.length; k++) {
        const it = items[k];

        if (it.t === 'filler') continue;
        if (it.t === 'unknown') {
            //  Any word,  right after  contains / starts with / is ... :   that's the words to look for   ("name contains jo")
            if (cond !== null && it.raw !== undefined && ['contains', 'starts', 'ends', '=', '<>'].indexOf(cond.op) !== -1) {
                const words = { t: 'value', k: 'word', v: it.raw, col: null, words: it.raw };
                const col = cond.col;
                const op = cond.op;
                cond = null;
                if (col === null) { unused.push(op + ' ' + it.raw); continue; }
                condition(col, op, words);
                continue;
            }
            unused.push(it.words);
            continue;
        }

        //  ---- A COLUMN ----
        if (it.t === 'col') {
            const j = it.col;
            if (cond !== null) giveUp(cond.words);                 //  "score over attendance":  2 columns aren't a value
            if (range !== null) giveUp(range.words);
            if (wait !== null) {
                const w = wait;
                wait = null;
                if (w.m === 'avg' || w.m === 'sum' || w.m === 'median') {
                    if (isNumberKind(kindOf(j))) q.totals.push({ fn: w.m, col: j });
                    else unused.push(w.words + ' ' + it.words + '  (' + cols[j] + ' is words,  not numbers)');
                    lastList = null;
                    continue;
                }
                if (w.m === 'distinct') { q.totals.push({ fn: 'distinct', col: j }); lastList = null; continue; }
                if (w.m === 'high' || w.m === 'low') { highLow.push({ high: w.m === 'high', col: j }); lastList = null; continue; }
                if (w.m === 'each' || (w.m === 'by' && (anyTotal || q.totals.length > 0))) { q.group.push(j); lastList = 'group'; continue; }
                if (w.m === 'by' && top !== null && top.col === null) { top.col = j; lastList = null; continue; }
                if (w.m === 'sort' || w.m === 'by') { q.sort.push({ col: j, desc: pendingDir === 'desc' }); pendingDir = null; lastList = 'sort'; continue; }
                if (w.m === 'no') { condition(j, 'empty', null); continue; }
                if (w.m === 'with') {                       //  "with homework" = it's filled in.   ("with score over 90":  just a little word)
                    const after = nextItem(k);
                    const more = after !== null && (after.t === 'value' || (after.t === 'known' && (OPS.has(after.m) || after.m === 'between' || after.m === 'from')));
                    if (!more) { condition(j, 'filled', null); continue; }
                }
            }
            if (top !== null && top.col === null && lastCol === null) { top.col = j; continue; }       //  "top 5 scores"
            if (lastList !== null && k > 0 && items[k - 1].t === 'known' && items[k - 1].m === 'and') {  //  "for each A and B"
                if (lastList === 'group') q.group.push(j);
                else q.sort.push({ col: j, desc: false });
                continue;
            }
            if (lastCol !== null) q.show.push(lastCol);     //  "name and score":  the one before was a column to show
            lastCol = j;
            lastList = null;
            continue;
        }

        //  ---- A VALUE   (a number,  'words',  a date,  or the file's own words) ----
        if (it.t === 'value') {
            if (wait !== null && wait.m === 'with') wait = null;                                        //  ("who HAS an A":  just a little word)
            if (top !== null && top.n === null && it.k === 'num') { top.n = it.v; continue; }           //  top 5
            if (range !== null) {
                if (range.lo === null) { range.lo = it; continue; }
                if (range.col === null) giveUp(range.words + ' ' + range.lo.words + ' and ' + it.words + '  (which column?)');
                else condition(range.col, 'between', [range.lo, it]);
                range = null;
                continue;
            }
            let col, op = '=', words = it.words;
            if (cond !== null) { col = cond.col !== null ? cond.col : it.col; op = cond.op; words = cond.words + ' ' + it.words; cond = null; }
            else if (lastCol !== null) col = lastCol;       //  "grade level 10"
            else col = it.col;                              //  "the A students":  the one column that has an A
            if (col === null) { unused.push(words); continue; }
            if (col === lastCol) lastCol = null;
            const a = items[k + 1], b = items[k + 2];       //  80-90  /  80 to 90:   a range
            if (op === '=' && a !== undefined && b !== undefined && a.t === 'known' && a.m === 'to' && b.t === 'value') {
                condition(col, 'between', [it, b]);
                k += 2;
                continue;
            }
            condition(col, op, it);
            continue;
        }

        //  ---- A KNOWN WORD ----
        const m = it.m;
        if (m === 'and' || m === 'or') {
            if (range !== null && range.lo !== null) continue;                     //  between 80 AND 90
            if (q.filters.length > 0 && cond === null) join = m;
            continue;
        }
        if (cond !== null) {
            if (cond.op === '=' && (OPS.has(m) || m === 'empty' || m === 'filled')) {       //  "score IS over 90"   "homework IS empty"
                if (m === 'empty' || m === 'filled') { condition(cond.col, m, null); cond = null; continue; }
                cond.op = m; cond.words += ' ' + it.words; continue;
            }
            if (cond.op === '=' && (m === 'between' || m === 'from')) { range = { col: cond.col, lo: null, words: cond.words + ' ' + it.words }; cond = null; continue; }
            if (cond.op === '<>' && NOT_OP[m] !== undefined) { cond.op = NOT_OP[m]; cond.words += ' ' + it.words; continue; }     //  "NOT over 90"
            giveUp(cond.words);
        }
        if (range !== null && !(m === 'to' && range.lo !== null)) giveUp(range.words);
        if (wait !== null && wait.m === 'with' && m !== 'and') wait = null;     //  ("who HAS the highest ...",  "with NO homework":  just a little word)
        if (m === 'count') { if (!q.totals.some(function (t) { return t.fn === 'rows'; })) q.totals.push({ fn: 'rows' }); continue; }
        if (m === 'by' && wait !== null && wait.m === 'sort') { wait.words += ' ' + it.words; continue; }      //  "sort that BY name"
        if (m === 'distinct' || m === 'avg' || m === 'sum' || m === 'median' || m === 'each' || m === 'by' || m === 'sort' || m === 'no' || m === 'with') {
            if (wait !== null) unused.push(wait.words);
            wait = { m: m, words: it.words };
            continue;
        }
        if (m === 'high' || m === 'low' || m === 'top' || m === 'bottom' || m === 'first') {
            const after = nextItem(k);
            const high = m === 'high' || m === 'top';
            if (after !== null && after.t === 'value' && after.k === 'num') { top = { n: null, desc: m === 'first' ? null : high, col: null, words: it.words }; continue; }   //  top 5,  newest 10
            if (m === 'first') { unused.push(it.words); continue; }
            if (wait !== null) unused.push(wait.words);
            wait = { m: high ? 'high' : 'low', words: it.words };
            continue;
        }
        if (m === 'desc' || m === 'asc') {
            if (q.sort.length > 0 && lastList === 'sort') q.sort[q.sort.length - 1].desc = m === 'desc';
            else if (top !== null) top.desc = m === 'desc';
            else pendingDir = m;
            continue;
        }
        if (OPS.has(m)) {
            if (lastCol !== null) { cond = { col: lastCol, op: m, words: it.words }; lastCol = null; }
            else if (m !== '=') cond = { col: null, op: m, words: it.words };      //  "except F":  then F's own column,  if only one has it
            continue;                                                               //  (a lone "is" / "are":  just a little word)
        }
        if (m === '>=after' || m === '<=after') {                                   //  "score 90 or more"
            const f = q.filters[q.filters.length - 1];
            if (f !== undefined && f.op === '=' && join === null) f.op = m === '>=after' ? '>=' : '<=';
            else unused.push(it.words);
            continue;
        }
        if (m === 'between' || m === 'from') {
            const after = nextItem(k);
            if (after !== null && after.t === 'value') { range = { col: lastCol !== null ? lastCol : after.col, lo: null, words: it.words }; lastCol = null; }
            continue;                                                               //  ("rows FROM class_data":  just a little word)
        }
        if (m === 'empty' || m === 'filled') {
            if (lastCol !== null) { condition(lastCol, m, null); lastCol = null; }
            else if (m === 'empty') wait = { m: 'no', words: it.words };            //  "empty homework"
            else unused.push(it.words);
            continue;
        }
        //  (to  /  -  with nothing to join:   "want TO see")
    }


    //  ---- 3.  WHAT'S LEFT WAITING ----

    if (cond !== null) unused.push(cond.words);
    if (range !== null) unused.push(range.words + (range.lo !== null ? ' ' + range.lo.words : ''));
    if (lastCol !== null) {
        if (q.totals.length > 0 || anyTotal) q.group.push(lastCol);        //  "grade level  average score"
        else q.show.push(lastCol);
    }
    //  "scores ... sorted highest first":  sorted with no column named,  but only ONE thing is shown?   By that.
    if (wait !== null && wait.m === 'sort' && pendingDir !== null && q.totals.length + q.show.length === 1 && q.group.length === 0) {
        if (q.totals.length === 1) q.sort.push({ total: 0, desc: pendingDir === 'desc' });
        else q.sort.push({ col: q.show[0], desc: pendingDir === 'desc' });
        wait = null;
    }
    if (wait !== null && wait.m !== 'with') unused.push(wait.words);   //  (a "with" left over was just a little word)
    highLow.forEach(function (h) {
        if (q.group.length === 0 && (asksRows || (!asksTotal && q.totals.length === 0))) {       //  "WHO has the highest score":  the top row
            q.sort.push({ col: h.col, desc: h.high });
            if (q.limit === null && top === null) q.limit = 1;
        } else {                                                                                  //  "WHAT is the highest score":  a total
            q.totals.push({ fn: h.high ? 'max' : 'min', col: h.col });
            if (asksRows) unused.push('who  (for each group it can show the highest one,  not whose it is)');
        }
    });
    if (top !== null) {
        if (top.n !== null) q.limit = parseInt(String(top.n).replace(/,/g, ''), 10);
        if (top.col !== null) q.sort.unshift({ col: top.col, desc: top.desc !== false });
        else if (top.desc !== null && q.totals.length > 0) q.sort.unshift({ total: 0, desc: top.desc });
        else if (top.desc !== null) unused.push(top.words + '  (by what?)');
    }
    if (joins.indexOf('or') !== -1 && joins.indexOf('and') !== -1) unused.push('or  (and + or together:  which comes first?  Say it in SQL)');

    //  Nothing it could use?   null   (or,  if it can say WHY a word didn't fit:  no SQL,  just the reasons:  "average Letter Grade")
    const nothing = q.show.length + q.totals.length + q.group.length + q.filters.length + q.sort.length === 0 && q.limit === null;
    if (nothing && !(showsAll && unused.length === 0)) {
        return unused.some(function (u) { return u.indexOf('  (') !== -1; }) ? { sql: null, unused: unused, meaning: null } : null;
    }                                                                           //  ("show me everything":  every row)


    //  ---- 4.  THE SQL ----

    const name = function (j) { return flexName(cols[j]); };
    const totalSql = function (t) {
        if (t.fn === 'rows') return 'COUNT(*)';
        if (t.fn === 'distinct') return 'COUNT(DISTINCT ' + name(t.col) + ')';
        return { avg: 'AVG', sum: 'SUM', median: 'MEDIAN', max: 'MAX', min: 'MIN' }[t.fn] + '(' + name(t.col) + ')';
    };
    const valueSql = function (v, j) {
        const kind = kindOf(j);
        let s = String(v.v);
        if (v.k === 'date') { const d = s.split(/[-\/]/); return flexWords(d[0] + '-' + ('0' + d[1]).slice(-2) + '-' + ('0' + d[2]).slice(-2)); }
        if (v.k === 'num' && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.split(',').join('');      //  1,200  ->  1200
        return isNumberKind(kind) && NUMBER_WORDS.test(s) ? s.trim() : flexWords(s);
    };
    const conditionSql = function (f) {
        const c = name(f.col);
        if (f.op === 'empty') return c + ' IS NULL';
        if (f.op === 'filled') return c + ' IS NOT NULL';
        if (f.op === 'between') return c + ' BETWEEN ' + valueSql(f.value[0], f.col) + ' AND ' + valueSql(f.value[1], f.col);
        if (f.op === 'contains') return c + ' ' + flexLike(f.value.v, '%', '%');
        if (f.op === 'starts') return c + ' ' + flexLike(f.value.v, '', '%');
        if (f.op === 'ends') return c + ' ' + flexLike(f.value.v, '%', '');
        return c + ' ' + f.op + ' ' + valueSql(f.value, f.col);
    };
    const unique = function (list) { return list.filter(function (x, k) { return list.indexOf(x) === k; }); };

    const grouped = q.totals.length > 0 || q.group.length > 0;
    const groups = unique(q.group);
    const totals = q.totals.filter(function (t, k) { return q.totals.findIndex(function (u) { return u.fn === t.fn && u.col === t.col; }) === k; });
    const shown = grouped ? groups.map(name).concat(totals.map(totalSql)) : unique(q.show).map(name);
    let sql = 'SELECT ' + (shown.length > 0 ? shown.join(', ') : '*') + ' FROM ' + flexName(tableName);
    if (q.filters.length > 0) sql += ' WHERE ' + q.filters.map(conditionSql).join(joins.length > 0 && joins.every(function (j) { return j === 'or'; }) ? ' OR ' : ' AND ');
    if (groups.length > 0) sql += ' GROUP BY ' + groups.map(name).join(', ');
    const order = [];
    q.sort.forEach(function (s) {
        if (s.total !== undefined) { order.push(totalSql(totals[s.total]) + (s.desc ? ' DESC' : '')); return; }
        if (!grouped || groups.indexOf(s.col) !== -1) { order.push(name(s.col) + (s.desc ? ' DESC' : '')); return; }
        const t = totals.find(function (x) { return x.col === s.col; });       //  grouped:  by that column's total   ("average score ... highest first")
        if (t !== undefined) order.push(totalSql(t) + (s.desc ? ' DESC' : ''));
        else unused.push('sorted by ' + cols[s.col] + '  (it isn\'t in the answer:  each group is ONE row)');
    });
    if (order.length > 0) sql += ' ORDER BY ' + order.join(', ');
    if (q.limit !== null && q.limit > 0) sql += ' LIMIT ' + q.limit;

    return { sql: sql, unused: unique(unused), meaning: queryInWords(sql, catalog) };
}



// ----------------------------------------------------------
//
//    A QUESTION,  BACK IN PLAIN WORDS   (SQL  ->  words:   "In words:"  in the query menu,  and the answer's badge)
//
//        SELECT * FROM orders WHERE qty > 5 ORDER BY qty DESC LIMIT 3
//        ->   Every row of orders where qty is over 5,  sorted by qty (highest first),  at most 3 rows
//
//    The words come from each column's KIND,  so they never fib about what SQL will do:
//        sorting numbers  ->  highest first / lowest first      words  ->  Z to A / A to Z      dates  ->  newest / oldest first
//        a WORDS column  >  'C'   ->   "comes after 'C'  (A to Z)"     (that's what  >  does to words:  alphabetical,  not better)
//        x = NULL   ->   "(never true:  NULL isn't equal to anything,  say IS NULL)"
//
//    ->  the words,  or null  (it isn't a question yet:  a mistake in it,  or nothing typed)
//
// ----------------------------------------------------------

function queryInWords(sql, catalog) {
    let statements;
    try { statements = parseSql(sql); }
    catch (problem) { if (problem instanceof QueryError) return null; throw problem; }
    const q = statements[statements.length - 1];
    let words = q.t === 'write' ? q.verb + ' would change the data  (this tool only reads:  it won\'t run)' : wordsOfQuery(q, catalog);
    if (statements.length > 1) words += '   (only the last of the ' + statements.length + ' questions runs)';
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function wordsOfQuery(q, catalog) {
    let words, core = null;
    if (q.body.t === 'core') { core = q.body; words = wordsOfCore(core, catalog); }
    else if (q.body.t === 'set') words = 'the rows of two questions put together  (' + q.body.op + ')';
    else words = wordsOfQuery(q.body.q, catalog);
    if (q.with !== null) words = 'first making  ' + q.with.map(function (w) { return w.name; }).join(',  ') + ',  then:  ' + words;
    if (q.order !== null && q.order.length > 0) words += ',  sorted by ' + q.order.map(function (o) { return wordsOfSort(o, core, catalog); }).join(',  then ');
    const limit = q.limit !== null ? q.limit : core !== null ? core.top : null;
    if (limit !== null) words += ',  at most ' + wordsOfValue(limit) + (limit.t === 'lit' && limit.v === 1 ? ' row' : ' rows');
    if (q.offset !== null) words += ',  after skipping the first ' + wordsOfValue(q.offset);
    return words;
}

function wordsOfCore(c, catalog) {
    const from = c.from === null ? null : wordsOfFrom(c.from);
    const grouped = c.group !== null || c.items.some(function (it) { return !it.star && isTotal(it.e); });
    const groupKeys = (c.group || []).map(function (g) { return exprText(g).toLowerCase(); });
    let words;
    if (grouped) {
        const parts = c.items.filter(function (it) { return it.star || groupKeys.indexOf(exprText(it.e).toLowerCase()) === -1; })
                             .map(function (it) { return it.star ? 'every column' : wordsOfItem(it.e, c, catalog); });
        words = (parts.length > 0 ? wordsList(parts) : 'each different ' + wordsList((c.group || []).map(function (g) { return wordsOfItem(g, c, catalog); })));
        if (c.group !== null && parts.length > 0) words += ' for each ' + wordsList(c.group.map(function (g) { return wordsOfItem(g, c, catalog); }));
        if (from !== null) words += ' in ' + from;
    } else if (c.items.length === 1 && c.items[0].star && c.items[0].table === null) {
        words = (c.distinct ? 'every different row' : 'every row') + (from !== null ? ' of ' + from : '');
    } else {
        const parts = c.items.map(function (it) { return it.star ? (it.table ? 'every column of ' + it.table : 'every column') : wordsOfItem(it.e, c, catalog); });
        words = c.distinct ? 'each different ' + wordsList(parts) + (from !== null ? ' in ' + from : '')
                           : wordsList(parts) + (from !== null ? ',  from every row of ' + from : '');
    }
    if (c.where !== null) words += ' where ' + wordsOfCond(c.where, c, catalog);
    if (c.having !== null) words += ',  keeping only the groups where ' + wordsOfCond(c.having, c, catalog);
    return words;
}

function wordsOfFrom(f) {
    if (f.t === 'table') return f.name;
    if (f.t === 'sub') return 'the answer to another question';
    const how = f.kind === 'cross' ? ' paired with every row of ' : f.kind === 'left' ? ' with the matching rows of ' :
                f.kind === 'right' ? ' matched to every row of ' : f.kind === 'full' ? ' and ' : ' joined with ';
    return wordsOfFrom(f.a) + how + wordsOfFrom(f.b);
}

//  One thing shown:  a column  ->  its name,   a total  ->  "how many rows",  "the average Score" ...,   anything else  ->  its SQL
function wordsOfItem(e, c, catalog) {
    if (e.t === 'col') return e.name;
    if (e.t === 'fn' && isTotal(e) && !e.filter) {
        const x = e.args.length === 1 ? wordsOfItem(e.args[0], c, catalog) : null;
        const kind = e.args.length === 1 ? kindOfExpr(e.args[0], c, catalog) : 'number';
        if (e.name === 'COUNT') return e.star ? 'how many rows' : e.distinct ? 'how many different values of ' + x : 'how many filled-in ' + x;
        if (e.distinct || x === null) return exprText(e);
        if (e.name === 'SUM' || e.name === 'TOTAL') return 'the total of ' + x;
        if (e.name === 'AVG') return 'the average ' + x;
        if (e.name === 'MEDIAN') return 'the middle value of ' + x;
        if (e.name === 'MIN') return kind === 'words' ? 'the first ' + x + ' (A to Z)' : kind === 'date' ? 'the earliest ' + x : 'the smallest ' + x;
        if (e.name === 'MAX') return kind === 'words' ? 'the last ' + x + ' (A to Z)' : kind === 'date' ? 'the latest ' + x : 'the biggest ' + x;
    }
    return exprText(e);
}

function wordsList(list) {
    return list.length <= 1 ? list.join('') : list.slice(0, -1).join(',  ') + ' and ' + list[list.length - 1];
}

function wordsOfSort(o, core, catalog) {
    let e = o.e;
    if (core !== null && e.t === 'lit' && Number.isInteger(e.v) && core.items[e.v - 1] && !core.items[e.v - 1].star) e = core.items[e.v - 1].e;    //  ORDER BY 2
    if (core !== null && e.t === 'col' && e.table === null) {                    //  ORDER BY a nickname
        const it = core.items.find(function (x) { return x.alias && x.alias.toLowerCase() === String(e.name).toLowerCase(); });
        if (it) e = it.e;
    }
    const kind = kindOfExpr(e, core, catalog);
    const way = kind === 'words' ? (o.desc ? 'Z to A' : 'A to Z') : kind === 'date' ? (o.desc ? 'newest first' : 'oldest first') : (o.desc ? 'highest first' : 'lowest first');
    return wordsOfItem(e, core, catalog) + ' (' + way + (o.nulls ? ',  empty ones ' + o.nulls : '') + ')';
}

function wordsOfCond(e, c, catalog) {
    const side = function (x) { return x.t === 'col' ? x.name : wordsOfValue(x); };
    const inner = function (x, outer) {
        const w = wordsOfCond(x, c, catalog);
        return (x.t === 'or' || x.t === 'and') && x.t !== outer && anyColumnWords(x, c, catalog) === null ? '(' + w + ')' : w;
    };
    switch (e.t) {
        case 'and':
        case 'or': {
            const any = anyColumnWords(e, c, catalog);
            if (any !== null) return any;
            return inner(e.a, e.t) + ' ' + e.t + ' ' + inner(e.b, e.t);
        }
        case 'not':
            return 'NOT (' + wordsOfCond(e.e, c, catalog) + ')';
        case 'cmp': {
            if ((e.a.t === 'lit' && e.a.v === null) || (e.b.t === 'lit' && e.b.v === null)) {
                return side(e.a) + ' ' + e.op + ' ' + side(e.b) + '  (never true:  NULL isn\'t equal to anything,  even NULL.   Say "is empty":  IS NULL)';
            }
            const flip = e.a.t !== 'col' && e.b.t === 'col';                         //  5 < qty   =   qty > 5
            const left = flip ? e.b : e.a, right = flip ? e.a : e.b;
            const op = flip ? FLIP_WORDS[e.op] : e.op;
            const kind = kindOfExpr(left, c, catalog);
            const words = (kind === 'words' ? WORDS_OPS_WORDS : kind === 'date' ? WORDS_OPS_DATES : WORDS_OPS_NUMBERS)[op] || op;
            return side(left) + ' ' + words + ' ' + side(right) + (kind === 'words' && op !== '=' && op !== '<>' ? '  (A to Z)' : '');
        }
        case 'isnull':  return side(e.e) + (e.not ? ' is not empty' : ' is empty');
        case 'isdist':  return side(e.a) + (e.not ? ' is ' : ' is not ') + side(e.b);
        case 'istrue':  return side(e.e) + (e.not ? ' is not ' : ' is ') + (e.v ? 'true' : 'false');
        case 'between': return side(e.e) + (e.not ? ' is not from ' : ' is from ') + side(e.lo) + ' to ' + side(e.hi);
        case 'in': {
            const list = e.list.map(side);
            const either = list.length <= 1 ? list.join('') : list.slice(0, -1).join(',  ') + ' or ' + list[list.length - 1];
            return side(e.e) + (e.not ? ' is none of ' + list.join(',  ') : ' is ' + either);
        }
        case 'insub':   return side(e.e) + (e.not ? ' is not in ' : ' is in ') + 'the answer to another question';
        case 'exists':  return 'another question has an answer';
        case 'like': {
            const how = likeHow(e);
            return side(e.e) + (e.not ? ' does not ' + how.replace(/^(contains|starts|ends|matches|is)/, function (w) { return { contains: 'contain', starts: 'start', ends: 'end', matches: 'match', is: 'equal' }[w]; }) : ' ' + how);
        }
        default:
            return exprText(e);
    }
}

//  A LIKE's pattern,  in words:   '%jo%'  ->  "contains 'jo'"     'jo%'  ->  "starts with 'jo'"     'jo'  ->  "is 'jo'  (any capitals)"
function likeHow(e) {
    const p = e.pat.t === 'lit' && typeof e.pat.v === 'string' && e.esc === null ? e.pat.v : null;
    const plain = p === null ? null : p.replace(/^%/, '').replace(/%$/, '');
    return p === null || /[%_]/.test(plain) ? 'matches the pattern ' + (e.pat.t === 'col' ? e.pat.name : wordsOfValue(e.pat))
        : p.length > 1 && p[0] === '%' && p[p.length - 1] === '%' ? 'contains ' + flexWords(plain)
        : p[p.length - 1] === '%' ? 'starts with ' + flexWords(plain)
        : p[0] === '%' ? 'ends with ' + flexWords(plain)
        : 'is ' + flexWords(plain) + '  (any capitals)';
}

//  The builder's "any column":   (Name LIKE '%jo%' OR City LIKE '%jo%' OR ...)   ->   "any column contains 'jo'"
//  Only when it's EVERY column of the table,  each once,  with the same LIKE   (else it's said test by test,  as written).
function anyColumnWords(e, c, catalog) {
    if (e.t !== 'or' || c === null || c.from === null || c.from.t !== 'table') return null;
    const table = catalog.find(c.from.name);
    if (table === null) return null;
    const tests = [];
    (function flat(x) { if (x.t === 'or') { flat(x.a); flat(x.b); } else tests.push(x); })(e);
    const names = columnNames(table).map(function (n) { return n.toLowerCase(); });
    if (tests.length < 2 || tests.length !== names.length) return null;
    const sameAs = function (x) { return x.t === 'like' && !x.not && x.e.t === 'col' && exprText(x.pat) === exprText(tests[0].pat) && (x.esc === null) === (tests[0].esc === null) && (x.esc === null || exprText(x.esc) === exprText(tests[0].esc)); };
    const seen = new Set();
    for (const x of tests) {
        if (!sameAs(x)) return null;
        const n = String(x.e.name).toLowerCase();
        if (names.indexOf(n) === -1 || seen.has(n)) return null;
        seen.add(n);
    }
    return 'any column ' + likeHow(tests[0]);
}

const FLIP_WORDS = { '=': '=', '<>': '<>', '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const WORDS_OPS_NUMBERS = { '=': 'is', '<>': 'is not', '>': 'is over', '>=': 'is at least', '<': 'is under', '<=': 'is at most' };
const WORDS_OPS_WORDS   = { '=': 'is', '<>': 'is not', '>': 'comes after', '>=': 'is or comes after', '<': 'comes before', '<=': 'is or comes before' };
const WORDS_OPS_DATES   = { '=': 'is', '<>': 'is not', '>': 'is after', '>=': 'is on or after', '<': 'is before', '<=': 'is on or before' };

function wordsOfValue(e) {
    if (e.t === 'lit' && typeof e.v === 'string' && lookOf(e.v) !== null) return e.v;          //  '85%'  '$1,200'  ->  85%  $1,200   (a number with a look)
    if (e.t === 'lit') return e.v === null ? 'NULL' : typeof e.v === 'string' ? flexWords(e.v) : typeof e.v === 'boolean' ? (e.v ? 'TRUE' : 'FALSE') : numberText(e.v);
    if (e.t === 'neg' && e.e.t === 'lit') return '-' + wordsOfValue(e.e);
    return exprText(e);
}

//  Any piece of a question,  written back as SQL   (for the parts plain words can't say:  UPPER(city),  qty * 2)
function exprText(e) {
    switch (e.t) {
        case 'lit':    return wordsOfValue(e);
        case 'col':    return (e.table ? e.table + '.' : '') + e.name;
        case 'ref':    return 'column ' + (e.idx + 1);
        case 'fn':     return e.name + '(' + (e.star ? '*' : (e.distinct ? 'DISTINCT ' : '') + e.args.map(exprText).join(', ')) + ')' + (e.over ? ' OVER (...)' : '');
        case 'bin':    return exprText(e.a) + ' ' + e.op + ' ' + exprText(e.b);
        case 'cat':    return exprText(e.a) + ' || ' + exprText(e.b);
        case 'neg':    return '-' + exprText(e.e);
        case 'cast':   return 'CAST(' + exprText(e.e) + ' AS ' + String(e.to).toUpperCase() + ')';
        case 'case':   return 'CASE ... END';
        case 'cmp':    return exprText(e.a) + ' ' + e.op + ' ' + exprText(e.b);
        case 'and':
        case 'or':     return exprText(e.a) + ' ' + e.t.toUpperCase() + ' ' + exprText(e.b);
        case 'not':    return 'NOT ' + exprText(e.e);
        case 'isnull': return exprText(e.e) + (e.not ? ' IS NOT NULL' : ' IS NULL');
        case 'like':   return exprText(e.e) + (e.not ? ' NOT LIKE ' : ' LIKE ') + exprText(e.pat);
        case 'between': return exprText(e.e) + (e.not ? ' NOT BETWEEN ' : ' BETWEEN ') + exprText(e.lo) + ' AND ' + exprText(e.hi);
        case 'in':     return exprText(e.e) + (e.not ? ' NOT IN (' : ' IN (') + e.list.map(exprText).join(', ') + ')';
        case 'isdist': return exprText(e.a) + (e.not ? ' IS ' : ' IS NOT ') + exprText(e.b);
        case 'istrue': return exprText(e.e) + (e.not ? ' IS NOT ' : ' IS ') + (e.v ? 'TRUE' : 'FALSE');
        case 'scalar':
        case 'insub':
        case 'exists': return '(another question)';
        default:       return '(...)';
    }
}

//  What KIND of thing a piece of a question gives:  'number',  'words',  or 'date'   (for the right words:  "highest first"  or  "Z to A")
function kindOfExpr(e, c, catalog) {
    if (e.t === 'lit') return typeof e.v === 'string' ? (CELL_DATE.test(e.v) || CELL_TIME.test(e.v) ? 'date' : 'words') : 'number';
    if (e.t === 'col' && c !== null) {
        const found = [];
        (function look(f) {
            if (f === null) return;
            if (f.t === 'join') { look(f.a); look(f.b); return; }
            if (f.t !== 'table') return;
            if (e.table !== null && String(e.table).toLowerCase() !== String(f.name).toLowerCase() && String(e.table).toLowerCase() !== String(f.alias || '').toLowerCase()) return;
            const table = catalog.find(f.name);
            if (table === null) return;
            const j = columnNames(table).map(function (n) { return n.toLowerCase(); }).indexOf(String(e.name).toLowerCase());
            if (j !== -1) found.push(kindAt(table, j));
        })(c.from);
        const kind = found.length === 1 ? found[0] : null;
        return kind === 'text' ? 'words' : kind === 'date' || kind === 'timestamp' ? 'date' : 'number';
    }
    if (e.t === 'fn') {
        if ((e.name === 'MIN' || e.name === 'MAX') && e.args.length === 1) return kindOfExpr(e.args[0], c, catalog);
        if (isTotal(e)) return 'number';
        return /^(UPPER|LOWER|TRIM|LTRIM|RTRIM|SUBSTR|SUBSTRING|REPLACE|CONCAT|LEFT|RIGHT|PRINTF|FORMAT|STRING_AGG|GROUP_CONCAT)$/.test(e.name) ? 'words' : 'number';
    }
    if (e.t === 'cat') return 'words';
    return 'number';
}
