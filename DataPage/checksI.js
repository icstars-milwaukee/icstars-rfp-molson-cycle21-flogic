/*
    ==========================================================

        THE NANDO NOTES  -  checksI.js

        CHECKS:   a list of questions about a file,  each with a rule for PASSING,
                  run on the open file in one click.   The same list works on next week's export.

            flogic.html  =  what's there     (skeleton)
            flogicI.css  =  how it looks     (clothes)
            flogicI.js   =  what it does     (brain)
            checksI.js   =  this:  the checks          (checksI.css:  their clothes)

        [Checks]  (next to Ask)  ->  a panel under the bar:

            ┌ Checks · incident · 5 checks ─────────────────────────── × ┐
            │ ✓  Row count is 23,334                             23,334  │
            │ ✗  No duplicate Numbers                  2 rows  [Show ▸] ✕ │
            │ ✓  No assignment group has more than 40 open tickets     0  │
            │ !  My own check            couldn't run: no column "Stat"   │
            ├────────────────────────────────────────────────────────────┤
            │ [Run all] [+ Add a check] [Suggested] [Save] [Load]          │
            │ Ran 3:52 PM on incident.csv · 3 passed · 1 failed · 1 error  │
            └────────────────────────────────────────────────────────────┘

        A CHECK is:   a name,   a question in SQL,   and when it PASSES:
              "no rows"         ->  the answer has no rows      (like:  duplicates,  teams over the limit)
              "the number is"   ->  the answer's first number is  =  /  at most  /  at least  some number

        ACCURATE,  ON PURPOSE:
            -  Every check runs EXACTLY as written:  "Fix my typos" is OFF here.   A check that can't run is
               marked  !  with the reason,  never quietly passed.
            -  The answers come from the same query engine as Ask  (queryI.js),  checked against real SQLite.
            -  "Show ▸"  opens the failing rows in the sheet  (through Ask),  so you can see WHY.

        SAVED AS A FILE,  never in the browser:   [Save]  downloads  incident-checks.json,   [Load]  opens one.
        Anyone can make one and share it like any work file.   A loaded file is checked piece by piece.
        Lock  (the vault)  empties the list and the results.

        HOW IT PLUGS IN  (like the dashboard:  POINT,  don't copy):   it uses functions that live in flogicI.js and
        queryI.js  (CHECKS_NEEDS),  and wraps  queryFileChanged  (a new file:  forget the old results)  and
        openQueryMenu  (one panel at a time).   Nothing in flogicI.js is edited.

    ==========================================================
*/



// ----------------------------------------------------------
//
//    WHAT IT POINTS AT  (checked once:  something renamed?  The checks turn off and say so,  instead of breaking the page)
//
// ----------------------------------------------------------

const CHECKS_NEEDS = ['queryFileChanged', 'openQueryMenu', 'closeQueryMenu', 'queryMenuOpen', 'runQuery', 'queryCatalog',
                      'askSql', 'sqlName', 'sqlWordsOf', 'showRow'];

const checksReady = CHECKS_NEEDS.every(function (name) {
    const ok = typeof window[name] === 'function';
    if (!ok) console.warn('Checks: "' + name + '" is missing, so Checks is turned off.');
    return ok;
}) && document.getElementById('fileBar') !== null;

const CHECKS_MAX      = 50;         //  a checks file can't hold more than this
const CHECKS_MAX_SQL  = 5000;       //  letters in one check's question
const CHECKS_MAX_FILE = 200000;     //  bytes in a checks file
const CHECK_RULES     = { equal: '=', atMost: '≤', atLeast: '≥' };



// ----------------------------------------------------------
//
//    THE CHECKS' MEMORY
//
// ----------------------------------------------------------

let checkList    = [];      //  [{ name, sql, expect: { rows: 0 }  or  { value: 'equal' | 'atMost' | 'atLeast',  to: 23334 } }]
let checkResults = [];      //  one per check:  null  (not run)   or   { state: 'pass' | 'fail' | 'error',  shown,  detail }
let checksRun    = 0;       //  counts every run:  a newer run  (or a new file)  ->  the older one stops
let checksRanOn  = '';      //  "Ran 3:52 PM on incident.csv"   (empty:  not run on this file)



// ----------------------------------------------------------
//
//    THE PIECES   (built here,  not in flogic.html:  older test pages keep working)
//
// ----------------------------------------------------------

function checksEl(tag, className, words) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (words !== undefined) el.textContent = words;
    return el;
}

function checksButton(words, title, onClick) {
    const b = checksEl('button', null, words);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
}

const checksBtn   = checksButton('Checks', 'Run a saved list of checks on this file:  each one passes or fails', toggleChecks);
const checksMenu  = checksEl('div');
const checksTitle = checksEl('span');
const checksClose = checksButton('×', null, function () { closeChecks(); checksBtn.focus(); });
const checksList  = checksEl('div');
const checksAdd   = checksEl('div');
const checksNote  = checksEl('p');
const checksInput = document.createElement('input');
const checksRunBtn = checksButton('Run all', 'Run every check on the open file', runChecks);

if (checksReady) {
    checksBtn.id = 'checksBtn';
    checksBtn.disabled = true;
    checksBtn.setAttribute('aria-haspopup', 'dialog');
    checksBtn.setAttribute('aria-expanded', 'false');
    checksBtn.setAttribute('aria-controls', 'checksMenu');

    checksMenu.id = 'checksMenu';
    checksMenu.setAttribute('role', 'dialog');
    checksMenu.setAttribute('aria-label', 'Checks on the open file');
    checksMenu.hidden = true;

    const head = checksEl('div', 'checks-head');
    checksTitle.id = 'checksTitle';
    checksClose.id = 'checksClose';
    checksClose.setAttribute('aria-label', 'Close the checks');
    head.append(checksTitle, checksClose);

    checksList.id = 'checksList';
    checksAdd.id = 'checksAdd';
    checksAdd.hidden = true;

    const foot = checksEl('div', 'checks-foot');
    checksRunBtn.id = 'checksRun';
    checksInput.type = 'file';
    checksInput.accept = '.json,application/json';
    checksInput.hidden = true;
    checksInput.addEventListener('change', loadChecks);
    foot.append(checksRunBtn,
        checksButton('+ Add a check', 'Write a check of your own  (or use the question that\'s in Ask)', openAddCheck),
        checksButton('Suggested', 'Checks worked out from THIS file\'s columns  (they replace the list)', suggestChecks),
        checksButton('Save', 'Download this list as a small .json file  (nothing is kept in the browser)', saveChecks),
        checksButton('Load', 'Open a checks file  (.json)', function () { checksInput.click(); }),
        checksInput);

    checksNote.id = 'checksNote';
    checksNote.setAttribute('role', 'status');
    checksNote.setAttribute('aria-live', 'polite');

    checksMenu.append(head, checksList, checksAdd, foot, checksNote);

    const bar = document.getElementById('fileBar');
    const ask = document.getElementById('queryBtn');
    bar.insertBefore(checksBtn, ask ? ask.nextSibling : null);
    document.getElementById('fileArea').appendChild(checksMenu);

    //  A new file  (or sheet tab,  or Lock)  ->  the old results are about another file
    const originalChanged = queryFileChanged;
    queryFileChanged = function () {
        try { return originalChanged.apply(this, arguments); }
        finally { checksFileChanged(); }
    };

    //  One panel at a time:  Ask opens  ->  Checks closes
    const originalOpenQuery = openQueryMenu;
    openQueryMenu = function () {
        closeChecks();
        return originalOpenQuery.apply(this, arguments);
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !checksMenu.hidden && document.getElementById('aimRow').hidden) { closeChecks(); checksBtn.focus(); }
    });
}



// ----------------------------------------------------------
//
//    OPEN  /  CLOSE
//
// ----------------------------------------------------------

function toggleChecks() {
    if (checksMenu.hidden) openChecks(); else closeChecks();
}

function openChecks() {
    if (fileTable === null) return;
    if (queryMenuOpen()) closeQueryMenu();
    showRow(false);                                     //  (the Details drawer:  one thing open at a time)
    checksMenu.hidden = false;
    checksBtn.setAttribute('aria-expanded', 'true');
    if (checkList.length === 0) suggestChecks();        //  nothing yet?  Start with the suggested ones,  so there's something to run
    drawChecks();
}

function closeChecks() {
    if (checksMenu.hidden) return;
    checksMenu.hidden = true;
    checksAdd.hidden = true;
    checksBtn.setAttribute('aria-expanded', 'false');
}

function checksFileChanged() {
    checksRun++;                                        //  a run still going?  It stops.
    checkResults = checkList.map(function () { return null; });
    checksRanOn = '';
    if (fileTable === null) {                           //  no file any more  (Lock):  forget everything
        checkList = [];
        checkResults = [];
        closeChecks();
        checksBtn.disabled = true;
        return;
    }
    checksBtn.disabled = false;
    if (!checksMenu.hidden) drawChecks();
}



// ----------------------------------------------------------
//
//    DRAW THE LIST
//
// ----------------------------------------------------------

function ruleWords(expect) {
    if (expect.rows === 0) return 'passes when there are no rows';
    return 'passes when the number is ' + CHECK_RULES[expect.value] + ' ' + expect.to.toLocaleString();
}

function drawChecks() {
    const table = fileTable !== null ? fileTable.engine.name : '';
    checksTitle.textContent = 'Checks  ·  ' + table + '  ·  ' + checkList.length + ' check' + (checkList.length === 1 ? '' : 's');

    checksList.textContent = '';
    if (checkList.length === 0) {
        checksList.appendChild(checksEl('p', 'checks-empty', 'No checks yet.   "+ Add a check"  writes one,  "Suggested"  works some out from this file,  "Load"  opens a saved list.'));
    }

    checkList.forEach(function (check, i) {
        const result = checkResults[i];
        const state = result === null || result === undefined ? 'waiting' : result.state;

        const row = checksEl('div', 'check-row check-' + state);
        const mark = checksEl('span', 'check-mark', { waiting: '·', pass: '✓', fail: '✗', error: '!' }[state]);
        mark.setAttribute('aria-label', { waiting: 'not run yet', pass: 'passed', fail: 'failed', error: 'couldn\'t run' }[state]);

        const words = checksEl('div', 'check-words');
        const name = checksEl('div', 'check-name', check.name);
        //  (A long reason,  like  "no column named Stat.  The columns are:  ... 44 names ...",  is cut to one line here:
        //   the whole of it,  and the check's SQL,  show when the mouse rests on it.)
        const full = state === 'error' ? 'couldn\'t run: ' + result.detail : ruleWords(check.expect) +
            (state === 'fail' && result.detail ? '   ·   ' + result.detail : '');
        const how = checksEl('div', 'check-how', full.length > 110 ? full.slice(0, 110).replace(/\s+\S*$/, '') + ' …' : full);
        how.title = full + '\n\n' + check.sql;
        words.append(name, how);

        const shown = checksEl('span', 'check-shown', result && result.shown !== undefined ? result.shown : '');
        row.append(mark, words, shown);

        if (state === 'fail' || state === 'pass') {
            row.appendChild(checksButton('Show ▸', 'Open this check\'s answer in the sheet  (← Back to file brings the file back)', function () {
                closeChecks();
                askSql(check.sql);
            }));
        }
        const remove = checksButton('✕', 'Remove this check', function () {
            checkList.splice(i, 1);
            checkResults.splice(i, 1);
            drawChecks();
        });
        remove.className = 'check-remove';
        remove.setAttribute('aria-label', 'Remove "' + check.name + '"');
        row.appendChild(remove);

        checksList.appendChild(row);
    });

    checksRunBtn.disabled = checkList.length === 0 || fileTable === null;
    if (checksRanOn !== '') {
        const n = { pass: 0, fail: 0, error: 0 };
        checkResults.forEach(function (r) { if (r !== null && r !== undefined) n[r.state]++; });
        checksNote.textContent = checksRanOn + '   ·   ' + n.pass + ' passed   ·   ' + n.fail + ' failed' + (n.error > 0 ? '   ·   ' + n.error + ' couldn\'t run' : '');
    } else if (checkList.length > 0) {
        checksNote.textContent = 'Not run on this file yet.';
    } else {
        checksNote.textContent = '';
    }
}



// ----------------------------------------------------------
//
//    RUN ALL   (one after another,  in bites:  the page keeps breathing)
//
// ----------------------------------------------------------

async function runChecks() {
    if (fileTable === null || checkList.length === 0) return;
    const myRun = ++checksRun;
    const table = fileTable.engine;
    function isCurrent() { return myRun === checksRun && fileTable !== null && fileTable.engine === table; }

    checkResults = checkList.map(function () { return null; });
    checksRanOn = '';
    checksRunBtn.disabled = true;
    drawChecks();

    for (let i = 0; i < checkList.length; i++) {
        if (!isCurrent()) return;
        checksNote.textContent = 'Running ' + (i + 1) + ' of ' + checkList.length + ':   ' + checkList[i].name + ' ...';
        checkResults[i] = await runOneCheck(checkList[i], isCurrent);
        if (!isCurrent()) return;
        drawChecks();
        checksNote.textContent = 'Running ' + (i + 1) + ' of ' + checkList.length + ' ...';
    }

    const when = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const shownName = document.getElementById('readingName');           //  the page's own "Reading from... incident.csv"
    checksRanOn = 'Ran ' + when + ' on ' + (shownName && shownName.textContent.trim() !== '' ? shownName.textContent.trim() : table.name);
    drawChecks();
}

//  One check  ->  { state,  shown,  detail }
async function runOneCheck(check, isCurrent) {
    let answer;
    try {
        //  EXACTLY as written:  flexible = false   (no typo fixing:  a check that's wrong should SAY so)
        answer = await runQuery(check.sql, queryCatalog(isCurrent), isCurrent, null, false);
    } catch (problem) {
        if (problem === QUERY_STALE) return null;
        if (problem instanceof QueryError) return { state: 'error', shown: '', detail: problem.message };
        return { state: 'error', shown: '', detail: 'something unexpected went wrong (' + (problem && problem.message || problem) + ')' };
    }
    const rows = answer.rows;

    if (check.expect.rows === 0) {
        if (rows.length === 0) return { state: 'pass', shown: 'none', detail: '' };
        const first = rows.slice(0, 3).map(function (r) { return r[0] === null ? '(blank)' : String(r[0]); });
        return { state: 'fail', shown: rows.length.toLocaleString() + ' row' + (rows.length === 1 ? '' : 's'),
                 detail: 'like ' + first.join(',  ') + (rows.length > 3 ? ' ...' : '') };
    }

    //  "The number is":   the answer's first cell must BE a number
    const cell = rows.length > 0 && rows[0].length > 0 ? rows[0][0] : null;
    const n = typeof cell === 'number' ? cell : typeof cell === 'bigint' ? Number(cell) : (cell !== null && cell !== '' && isFinite(Number(cell)) ? Number(cell) : NaN);
    if (!isFinite(n)) return { state: 'error', shown: '', detail: 'the answer\'s first cell isn\'t a number (' + (cell === null ? 'no answer' : String(cell).slice(0, 40)) + ')' };
    const to = check.expect.to;
    const ok = check.expect.value === 'equal' ? n === to : check.expect.value === 'atMost' ? n <= to : n >= to;
    return { state: ok ? 'pass' : 'fail', shown: n.toLocaleString(), detail: ok ? '' : 'got ' + n.toLocaleString() };
}



// ----------------------------------------------------------
//
//    SUGGESTED CHECKS   (worked out from THIS file's columns:  a start,  not the last word)
//
// ----------------------------------------------------------

const CHECK_RECORD_ID = /^[A-Za-z]{2,8}[-_]?\d{4,}$/;

function checksColumn(names) {                          //  the first column whose name is one of these  (any case)  ->  its name,  or null
    const lower = headerCells.map(function (h) { return String(h).trim().toLowerCase(); });
    for (const want of names) { const k = lower.indexOf(want); if (k !== -1) return headerCells[k]; }
    return null;
}

function suggestChecks() {
    if (fileTable === null) return;
    const table = fileTable.engine;
    const from = sqlName(table.name);
    const list = [];

    //  1.  The row count  (as it is now:  next week's export should be close,  or say why not)
    list.push({ name: 'Row count is at least ' + table.rowCount.toLocaleString(), sql: 'SELECT COUNT(*) FROM ' + from,
                expect: { value: 'atLeast', to: table.rowCount } });

    //  2.  The record id column  (INC0012345 ...):  never blank,  never twice
    let idCol = null;
    const sample = Math.min(table.rowCount, 200);
    for (let c = 0; c < Math.min(headerCells.length, 60) && idCol === null; c++) {
        let ids = 0;
        for (let r = 0; r < sample; r++) if (CHECK_RECORD_ID.test(String(cellAt(r, c)).trim())) ids++;
        if (sample > 0 && ids >= sample * 0.9) idCol = headerCells[c];
    }
    if (idCol !== null) {
        const id = sqlName(idCol);
        list.push({ name: 'Every row has a ' + idCol, sql: 'SELECT COUNT(*) FROM ' + from + ' WHERE ' + id + ' IS NULL',
                    expect: { value: 'equal', to: 0 } });
        list.push({ name: 'No ' + idCol + ' appears twice', sql: 'SELECT ' + id + ', COUNT(*) AS copies FROM ' + from +
                    ' GROUP BY ' + id + ' HAVING COUNT(*) > 1', expect: { rows: 0 } });
    }

    //  3.  ServiceNow's team load:  open tickets per assignment group  (the week 7 alert:  more than 40)
    const group = checksColumn(['assignment group', 'assignment_group']);
    const state = checksColumn(['state', 'incident state', 'incident_state']);
    if (group !== null && state !== null) {
        list.push({ name: 'No assignment group has more than 40 open tickets',
                    sql: 'SELECT ' + sqlName(group) + ', COUNT(*) AS open_tickets FROM ' + from + ' WHERE ' + sqlName(state) +
                         " NOT IN ('Closed', 'Resolved', 'Canceled', 'Cancelled') GROUP BY " + sqlName(group) + ' HAVING COUNT(*) > 40',
                    expect: { rows: 0 } });
    }

    //  4.  Encoding scars  (â€“  Ã©  Â :  text that was saved in one alphabet and read in another)
    const text = ['short description', 'description', 'name', 'notes', 'work notes', 'comments', 'close notes', 'title']
        .map(function (n) { return checksColumn([n]); }).filter(function (n) { return n !== null; }).slice(0, 4);
    if (text.length > 0) {
        const where = text.map(function (n) {
            return ['â€', 'Ã', 'Â'].map(function (scar) { return sqlName(n) + ' LIKE ' + sqlWordsOf('%' + scar + '%'); }).join(' OR ');
        }).join(' OR ');
        list.push({ name: 'No encoding scars (â€ Ã Â) in ' + text.join(', '), sql: 'SELECT COUNT(*) FROM ' + from + ' WHERE ' + where,
                    expect: { value: 'equal', to: 0 } });
    }

    checkList = list;
    checkResults = list.map(function () { return null; });
    checksRanOn = '';
    if (!checksMenu.hidden) drawChecks();
}



// ----------------------------------------------------------
//
//    + ADD A CHECK
//
//        Name   [ Open P1 tickets under 5                 ]
//        SQL    [ SELECT COUNT(*) FROM incident WHERE ... ]   (it starts with the question in Ask,  if there is one)
//        Passes when   [ the number is ▾ ]  [ ≤ ▾ ]  [ 5 ]          [ Add ]  [ Cancel ]
//
// ----------------------------------------------------------

function openAddCheck() {
    checksAdd.textContent = '';
    checksAdd.hidden = false;

    const name = document.createElement('input');
    name.type = 'text';
    name.id = 'checkName';
    name.maxLength = 120;
    name.placeholder = 'What it checks,  like:  "Fewer than 5 open P1 tickets"';

    const sql = document.createElement('textarea');
    sql.id = 'checkSql';
    sql.rows = 3;
    sql.spellcheck = false;
    const asked = document.getElementById('querySql');
    sql.value = asked && asked.value.trim() !== '' ? asked.value.trim() : 'SELECT COUNT(*) FROM ' + sqlName(fileTable.engine.name);

    const kind = document.createElement('select');
    kind.id = 'checkKind';
    kind.append(new Option('there are no rows', 'rows'), new Option('the number is', 'value'));
    const op = document.createElement('select');
    op.id = 'checkOp';
    op.setAttribute('aria-label', 'How the number compares');
    op.append(new Option('= (equal to)', 'equal'), new Option('≤ (at most)', 'atMost'), new Option('≥ (at least)', 'atLeast'));
    const to = document.createElement('input');
    to.type = 'number';
    to.id = 'checkTo';
    to.value = '0';
    to.setAttribute('aria-label', 'The number');
    function sync() { op.hidden = to.hidden = kind.value !== 'value'; }
    kind.addEventListener('change', sync);
    sync();

    const say = checksEl('span', 'check-add-note');
    const add = checksButton('Add', null, function () {
        const n = name.value.trim(), q = sql.value.trim(), v = Number(to.value);
        if (n === '') { say.textContent = 'Give it a name.'; name.focus(); return; }
        if (q === '') { say.textContent = 'Write the question in SQL.'; sql.focus(); return; }
        if (q.length > CHECKS_MAX_SQL) { say.textContent = 'That question is too long for a check.'; return; }
        if (kind.value === 'value' && !isFinite(v)) { say.textContent = 'The number must be a number.'; to.focus(); return; }
        if (checkList.length >= CHECKS_MAX) { say.textContent = 'A list holds ' + CHECKS_MAX + ' checks at most.'; return; }
        checkList.push({ name: n, sql: q, expect: kind.value === 'rows' ? { rows: 0 } : { value: op.value, to: v } });
        checkResults.push(null);
        checksAdd.hidden = true;
        drawChecks();
    });
    const cancel = checksButton('Cancel', null, function () { checksAdd.hidden = true; });

    const line1 = checksEl('label', 'check-add-line');
    line1.append(checksEl('span', 'check-add-label', 'Name'), name);
    const line2 = checksEl('label', 'check-add-line');
    line2.append(checksEl('span', 'check-add-label', 'SQL'), sql);
    const line3 = checksEl('div', 'check-add-line');
    const passes = checksEl('label', 'check-add-label', 'Passes when');
    passes.htmlFor = 'checkKind';
    line3.append(passes, kind, op, to, add, cancel, say);
    checksAdd.append(line1, line2, line3);
    name.focus();
}



// ----------------------------------------------------------
//
//    SAVE  /  LOAD   (a small .json file:  nothing is kept in the browser)
//
//      { "flogicChecks": 1,  "made": "2026-11-15",  "file": "incident",
//        "checks": [ { "name": "...",  "sql": "SELECT ...",  "expect": { "rows": 0 } },  ... ] }
//
// ----------------------------------------------------------

function saveChecks() {
    if (checkList.length === 0) { checksNote.textContent = 'There are no checks to save yet.'; return; }
    const file = {
        flogicChecks: 1,
        made: new Date().toISOString().slice(0, 10),
        file: fileTable !== null ? fileTable.engine.name : null,
        checks: checkList.map(function (c) { return { name: c.name, sql: c.sql, expect: c.expect }; }),
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (fileTable !== null ? fileTable.engine.name : 'flogic') + '-checks.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    checksNote.textContent = 'Saved as  ' + link.download;
}

function loadChecks() {
    const file = checksInput.files[0];
    checksInput.value = '';
    if (!file) return;
    if (file.size > CHECKS_MAX_FILE) { checksNote.textContent = 'That file is too big to be a checks list.'; return; }
    file.text().then(function (text) {
        let data = null;
        try { data = JSON.parse(text); } catch (e) { data = null; }
        if (!data || data.flogicChecks !== 1 || !Array.isArray(data.checks)) {
            checksNote.textContent = 'That isn\'t a checks file.';
            return;
        }
        //  Checked piece by piece:  anything odd is left out,  never trusted.
        let dropped = 0;
        const list = [];
        data.checks.slice(0, CHECKS_MAX).forEach(function (c) {
            const e = c && c.expect;
            const okExpect = e && typeof e === 'object' &&
                ((e.rows === 0 && Object.keys(e).length === 1) ||
                 (Object.prototype.hasOwnProperty.call(CHECK_RULES, e.value) && typeof e.to === 'number' && isFinite(e.to)));
            const ok = c && typeof c.name === 'string' && c.name.trim() !== '' && typeof c.sql === 'string' &&
                       c.sql.trim() !== '' && c.sql.length <= CHECKS_MAX_SQL && okExpect;
            if (!ok) { dropped++; return; }
            list.push({ name: c.name.trim().slice(0, 120), sql: c.sql.trim(),
                        expect: e.rows === 0 ? { rows: 0 } : { value: e.value, to: e.to } });
        });
        dropped += Math.max(0, data.checks.length - CHECKS_MAX);
        checkList = list;
        checkResults = list.map(function () { return null; });
        checksRanOn = '';
        drawChecks();
        checksNote.textContent = 'Loaded ' + list.length + ' check' + (list.length === 1 ? '' : 's') + ' from  ' + file.name +
            (dropped > 0 ? '.   ' + dropped + ' left out  (something in them wasn\'t readable).' : '.   "Run all" runs them.');
    });
}
