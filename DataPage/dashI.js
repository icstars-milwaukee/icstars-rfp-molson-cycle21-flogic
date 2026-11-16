/*
    ==========================================================

        THE NANDO NOTES  -  dashI.js

        THE DASHBOARD.   The first thing you see after you open a file:
        a few cards and charts that answer "what's in here?"  at a glance.
        No SQL,  no scrolling.   Then the sheet is right below,  like always.

            flogic.html   =  what's there     (skeleton)
            flogicI.css   =  how it looks     (clothes)
            flogicI.js   =  what it does     (brain)
            queryI.js    =  answers SQL questions (the query engine)
            dashI.js     =  the dashboard         (this file)
            dashI.css    =  the dashboard's clothes

    ==========================================================


    WHAT IT LOOKS LIKE:

        ┌ DASHBOARD  ·  incident  ·  23,334 rows ─── [ Export report ] [ Edit ] [ Hide ] ┐
        │ ┌────────────┐ ┌────────────┐ ┌──────────────────────────────────────┐ │
        │ │ Rows       │ │ Different  │ │ Rows by State                        │ │
        │ │ 23,334     │ │ Assignment │ │ Closed        ██████████████  16,404 │ │
        │ │            │ │ group: 160 │ │ Resolved      ████           3,104   │ │
        │ └────────────┘ └────────────┘ │ ...                                  │ │
        │ ┌──────────────────────────────────────┐ └──────────────────────────────┘ │
        │ │ Rows over time  (Created, by day)    │                                  │
        │ │ ▁▂▃▅▇▆▅▃▂ ...                         │                                  │
        └──────────────────────────────────────────────────────────────────────────┘

    THE TILES  (4 kinds):
        count      how many rows    (all of them,  or only where  column = value)
        distinct   how many DIFFERENT values a column has   (like:  how many teams)
        bars       rows per value of a column,  biggest first   (the top 10,  then "everything else")
        time       rows per day  (or per month,  for a long stretch)  of a date column

    IT PICKS ITS OWN TILES  (the "suggested" dashboard),  from the engine's look at the file
    (tableProfile in queryI.js):  the row count,  the column that splits the rows into the most
    groups,  the columns that look like a status / priority / team,  and the first date column.

    EDIT  ->  every tile gets  ◀ ▶  (move),  S M L  (size),  ✕  (remove),  and you can rename it.
              "+ Add a tile"  builds a new one from the file's own columns.
              "Save layout"  downloads it as a small file  (.json).   "Load layout"  opens one.
              "Suggested"  puts the dashboard back the way it started.

    CLICK A BAR  (or a count card with a "where")  ->  the rows behind it,  asked through the query
    engine  (askSql in flogicI.js),  so they show up in the sheet with  "← Back to file".

    EXPORT REPORT  ->  the dashboard as a page to print  (or "Save as PDF" in the print window),
              and the numbers behind every tile as a small CSV.   Both are stamped with who,  which group,
              when and which file  (from the vault,  vaultI.js,  when it's there),  and both say
              "This file isn't locked."   A locked pack's group decides if it can export  (the gate).

    SAFETY  (same rules as the rest of the app):
        -  Nothing is saved in the browser.   A layout only leaves as a file YOU download.
        -  No network.   No outside code.
        -  Every word from the file goes on the page as plain text  (textContent),  never as HTML.
        -  A layout file is checked piece by piece:  an unknown kind or column is dropped,  not trusted.

    HOW IT PLUGS IN  (DJ's isolate-and-reuse method:  POINT,  don't copy):
        It points at functions that already live in flogicI.js and queryI.js  (DASH_NEEDS,  below),
        and adds ONE thing:  when a file finishes loading,  flogicI.js calls  queryFileChanged().
        This file wraps it,  so the dashboard hears about every new file  (and every sheet tab).
        It runs the original first,  then rebuilds the dashboard.   Nothing in flogicI.js is edited.
        No file open any more  (Lock calls closeFile(),  which calls queryFileChanged())  ->  the dashboard empties.

        The vault  (vaultI.js,  loaded AFTER this file)  is only ever READ,  through one object:
        window.FlogicVault  (canExport,  stamp,  onChange ...).   No vault?  Export works,  just with no stamp.

*/



// ----------------------------------------------------------
//
//    SETTINGS
//
// ----------------------------------------------------------

const DASH_TOP          = 10;       //  a bars tile shows this many values,  then "everything else"
const DASH_MONTHS_AFTER = 120;      //  a time tile covering more days than this goes by MONTH instead of by day
const DASH_MAX_TILES    = 24;       //  a layout file can't make more tiles than this
const DASH_KINDS        = ['count', 'distinct', 'bars', 'time'];
const DASH_SIZES        = ['s', 'm', 'l'];

//  Words that make a column a good first chart  (in this order).
const DASH_GOOD_NAMES = [/state|status|stage/i, /priority|urgency|impact|risk/i, /(^|\s)assign|owner|team/i, /group/i,
                         /category|type|kind|class/i, /region|location|site|city|country/i];

//  Columns that are IDs  (every value different):  never a chart.
const DASH_ID_LIKE = /(^|[^a-z])(id|number|key|code)$/i;

//  What every exported report says  (on the page,  and at the bottom of the CSV).
const DASH_UNLOCKED_NOTE = 'This file isn\'t locked. Share it like any work document.';



// ----------------------------------------------------------
//
//    WHAT IT POINTS AT  (checked once,  at the start)
//
//    If someone renames one of these in flogicI.js or queryI.js,  the dashboard says so in the
//    console and stays out of the way,  instead of breaking the page.
//
// ----------------------------------------------------------

const DASH_NEEDS = ['queryFileChanged', 'tableProfile', 'askSql', 'sqlName', 'sqlWordsOf', 'nextBite', 'isNumberKind'];

const dashReady = DASH_NEEDS.every(function (name) {
    const ok = typeof window[name] === 'function';
    if (!ok) console.warn('Dashboard: "' + name + '" is missing, so the dashboard is turned off.');
    return ok;
});



// ----------------------------------------------------------
//
//    THE DASHBOARD'S MEMORY
//
// ----------------------------------------------------------

let dashTiles   = [];       //  the tiles,  in order:   [{ id, kind, title, col, value, size }]
let dashLoad    = 0;        //  counts every rebuild.   A newer file  (or edit)  ->  the old counting quits.
let dashEditing = false;    //  Edit mode on?
let dashHidden  = false;    //  folded away  (with "Hide")?
let dashNextId  = 1;        //  the next tile's id
let dashProfile = null;     //  the engine's look at the open file  (its columns,  kinds and values)
let dashResults = new Map();//  tile id  ->  what it counted



// ----------------------------------------------------------
//
//    STEP 0:  BUILD THE PIECES  (here,  not in flogic.html,  like focus mode does)
//
//    It goes right ABOVE the controls  (Drag mode,  Go to row ...),  so the order on the page is:
//    file bar  ->  "Rows 1–15 of ..."  ->  THE DASHBOARD  ->  the controls  ->  the sheet.
//
// ----------------------------------------------------------

const dash = document.createElement('section');
dash.id = 'dash';
dash.hidden = true;
dash.setAttribute('aria-label', 'Dashboard');

const dashHead  = document.createElement('div');
dashHead.className = 'dash-head';
const dashTitle = document.createElement('h2');
dashTitle.className = 'dash-title';
const dashTools = document.createElement('div');
dashTools.className = 'dash-tools';
dashHead.append(dashTitle, dashTools);

const dashExportBtn = dashButton('Export report', 'Print this dashboard, or download its numbers as a CSV', toggleExport);
const dashEditBtn = dashButton('Edit', 'Move, resize, rename, add or remove tiles', toggleEditing);
const dashHideBtn = dashButton('Hide', 'Fold the dashboard away  (the sheet stays)', toggleHidden);
dashEditBtn.setAttribute('aria-pressed', 'false');
dashExportBtn.setAttribute('aria-expanded', 'false');
const dashWhy = document.createElement('span');       //  why Export is off  ("Your group can't export")
dashWhy.className = 'dash-why';
dashWhy.id = 'dash-why';
dashTools.append(dashWhy, dashExportBtn, dashEditBtn, dashHideBtn);

//  The Export panel:   who · group · date · file      [ Print or save as PDF ]  [ Download the numbers (.csv) ]  [ Close ]
const dashExport = document.createElement('div');
dashExport.className = 'dash-export';
dashExport.hidden = true;
const dashExportStamp = document.createElement('p');
dashExportStamp.className = 'dash-export-stamp';
const dashExportNote = document.createElement('p');
dashExportNote.className = 'dash-export-note';
dashExportNote.textContent = '⚠ ' + DASH_UNLOCKED_NOTE;
const dashExportButtons = document.createElement('div');
dashExportButtons.className = 'dash-export-buttons';
dashExportButtons.append(
    dashButton('Print or save as PDF', 'Opens the print window.  Pick "Save as PDF" there to get a file.', printReport),
    dashButton('Download the numbers (.csv)', 'Every tile\'s numbers, as a small CSV for Excel', downloadReportCsv),
    dashButton('Close', 'Close the export panel', function () { showExport(false); })
);
dashExport.append(dashExportStamp, dashExportNote, dashExportButtons);

//  Edit mode's own bar:   [ + Add a tile ]  [ Save layout ]  [ Load layout ]  [ Suggested ]
const dashEditBar = document.createElement('div');
dashEditBar.className = 'dash-editbar';
dashEditBar.hidden = true;
const dashLayoutInput = document.createElement('input');
dashLayoutInput.type = 'file';
dashLayoutInput.accept = '.json,application/json';
dashLayoutInput.hidden = true;
dashEditBar.append(
    dashButton('+ Add a tile', 'Make a new tile from this file\'s columns', function () { openAdd(); }),
    dashButton('Save layout', 'Download this dashboard\'s layout as a small .json file', saveLayout),
    dashButton('Load layout', 'Open a layout you saved before', function () { dashLayoutInput.click(); }),
    dashButton('Suggested', 'Put the dashboard back the way it started', function () { dashNote.textContent = ''; suggestTiles(); refresh(); }),
    dashLayoutInput
);

const dashAdd = document.createElement('form');      //  the "+ Add a tile" form  (filled in by openAdd)
dashAdd.className = 'dash-add';
dashAdd.hidden = true;

const dashNote = document.createElement('p');         //  a short message  ("Layout loaded: 2 tiles were for columns this file doesn't have")
dashNote.className = 'dash-note';
dashNote.setAttribute('role', 'status');
dashNote.setAttribute('aria-live', 'polite');

const dashGrid = document.createElement('div');
dashGrid.className = 'dash-grid';

dash.append(dashHead, dashExport, dashEditBar, dashAdd, dashNote, dashGrid);

if (dashReady) {
    const controlsBox = document.getElementById('controls');
    controlsBox.parentNode.insertBefore(dash, controlsBox);
}


//  A plain button.
function dashButton(words, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = words;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
}



// ----------------------------------------------------------
//
//    STEP 1:  A NEW FILE IS OPEN   (the one hook)
//
//    flogicI.js calls  queryFileChanged()  right after a file  (or a sheet tab)  finishes loading.
//    The dashboard runs the original,  THEN rebuilds itself.
//    (A query's ANSWER doesn't call it:  the dashboard keeps showing the file,  not the answer.)
//
// ----------------------------------------------------------

if (dashReady) {
    const originalFileChanged = queryFileChanged;
    queryFileChanged = function () {
        try {
            return originalFileChanged.apply(this, arguments);
        } finally {
            dashFileChanged();          //  (even if the original trips:  on Lock,  emptying the screen matters most)
        }
    };
}

async function dashFileChanged() {

    //  No file open any more  (Lock  ->  closeFile()  ->  here)?   Empty the dashboard.
    if (fileTable === null || !fileTable.engine) {
        dashClear();
        return;
    }

    const myLoad = ++dashLoad;
    const table = fileTable.engine;
    const isCurrent = function () { return myLoad === dashLoad && fileTable !== null && fileTable.engine === table; };

    dashProfile = null;
    dashResults = new Map();
    dashAdd.hidden = true;
    showExport(false);
    dashNote.textContent = '';
    dash.hidden = false;
    updateExport();
    dashTitle.textContent = 'Dashboard  ·  ' + table.name + '  ·  ' + table.rowCount.toLocaleString() + ' row' + (table.rowCount === 1 ? '' : 's');
    dashGrid.textContent = '';
    dashGrid.appendChild(waitingCard('Looking at the file...'));

    try {
        dashProfile = await tableProfile(table, isCurrent);
    } catch (problem) {
        if (problem === QUERY_STALE) return;
        throw problem;
    }
    if (!isCurrent()) return;

    //  A layout you loaded keeps its tiles for the next file too  (the ones whose columns this file has).
    //  Otherwise:  the suggested tiles.
    const kept = dashTiles.filter(function (t) { return t.col === null || columnIndex(t.col) !== -1; });
    if (dashTiles.length > 0 && kept.length === dashTiles.length && dashTiles.some(function (t) { return t.mine; })) dashTiles = kept;
    else { suggestTiles(); levelView(); }

    refresh();
}

//  Empty,  hidden,  and forgetting everything about the last file:  its numbers,  and its tiles too
//  (a tile's title or "where" can name a value,  like  "State:  New",  and the next person shouldn't see it).
function dashClear() {
    ++dashLoad;                                 //  (a count still running for the old file quits)
    dashProfile = null;
    dashResults = new Map();
    dashTiles = [];
    if (dashEditing) toggleEditing();
    dashAdd.hidden = true;
    dashAdd.textContent = '';
    showExport(false);
    dashNote.textContent = '';
    dashTitle.textContent = '';
    dashGrid.textContent = '';
    dash.hidden = true;
    updateExport();
}



// ----------------------------------------------------------
//
//    STEP 2:  THE SUGGESTED TILES   (worked out from the file's profile)
//
//        1.  Rows                                      (always)
//        2.  Different <a team-like column>            (like:  how many teams.   No team?  The column with the most groups.)
//        3.  Rows by <status / priority / team ...>    (up to 3 bars tiles,  ONE per kind of name,  best names first)
//        4.  Rows over time  (<the first date column>)
//
// ----------------------------------------------------------

function suggestTiles() {

    dashTiles = [];
    const table = fileTable.engine;
    const cols = dashProfile.columns;

    dashTiles.push(newTile('count', 'Rows', null, null, 's'));

    //  "Group" columns:  a handful to a few hundred different values,  repeated  (not one per row),
    //  not an ID by name  (… Number),  and not full of record ids  (INC0012345:  a link to another ticket,  not a group).
    const groups = cols.filter(function (c) {
        if (c.filled === 0 || c.values === null || c.kind === 'date' || c.kind === 'timestamp') return false;     //  (dates go in the time tile)
        const size = c.values.size;
        return size >= 2 && size <= 500 && size <= Math.max(2, c.filled * 0.5) && !DASH_ID_LIKE.test(c.name) && !mostlyIds(c);
    });

    //  Which kind of good name it has  (0 = status,  1 = priority,  2 = team ...),  or DASH_GOOD_NAMES.length  (none).
    function nameKind(c) {
        const hit = DASH_GOOD_NAMES.findIndex(function (re) { return re.test(c.name); });
        return hit === -1 ? DASH_GOOD_NAMES.length : hit;
    }
    //  Best first:  a good name,  then the one further LEFT in the file  (ServiceNow puts Priority before Impact
    //  and Urgency,  and Risk before "SAP impact":  the main column comes first).   No good name:  fewer values first.
    const ranked = groups.slice().sort(function (a, b) {
        const ka = nameKind(a), kb = nameKind(b);
        if (ka !== kb) return ka - kb;
        return ka === DASH_GOOD_NAMES.length ? a.values.size - b.values.size : cols.indexOf(a) - cols.indexOf(b);
    });

    //  How many TEAMS  (or owners,  or the column with the most groups):  a team-like name wins.
    const wide = groups.filter(function (c) { return c.values.size > DASH_TOP && !isNumberKind(c.kind); });     //  (words:  "how many different Lane #" says nothing)
    const team = wide.find(function (c) { return nameKind(c) === 2; })
              || wide.sort(function (a, b) { return b.values.size - a.values.size; })[0];
    if (team) dashTiles.push(newTile('distinct', 'Different ' + team.name, team.name, null, 's'));

    //  Up to 3 bar charts,  ONE per kind of name  (a status,  a priority,  a team ...:  not 3 kinds of priority).
    const picked = [], kindsUsed = new Set();
    ranked.forEach(function (c) {
        const k = nameKind(c);
        if (picked.length >= 3 || (k < DASH_GOOD_NAMES.length && kindsUsed.has(k))) return;
        kindsUsed.add(k);
        picked.push(c);
    });
    picked.forEach(function (c) {
        dashTiles.push(newTile('bars', 'Rows by ' + c.name, c.name, null, 'm'));
    });

    //  The first date column  (a name like "Created" or "Opened" wins).
    const dates = cols.filter(function (c) { return (c.kind === 'date' || c.kind === 'timestamp') && c.filled > 0; });
    const date = dates.find(function (c) { return /creat|open|start|date/i.test(c.name); }) || dates[0];
    if (date) dashTiles.push(newTile('time', 'Rows over time  (' + date.name + ')', date.name, null, 'l'));

    if (dashTiles.length === 1 && table.rowCount > 0 && cols.length > 0) {
        dashNote.textContent = 'No column here splits the rows into groups, so there\'s just the row count.  Edit  ->  "+ Add a tile"  to add your own.';
    }
}

//  THE ACCESS LEVEL'S VIEW   (policyI.js:  each level says what the dashboard starts with).
//  A level with a 'summary' dashboard  (a Guest)  starts with the first 3 suggested tiles:  the big numbers,
//  not every chart.   Nothing is locked away by this:  it's what you see FIRST.   Edit still adds tiles.
const DASH_SUMMARY_TILES = 3;
function levelView() {
    const v = window.FlogicVault;
    let level = null;
    try { level = v && typeof v.level === 'function' ? v.level() : null; } catch (e) { level = null; }
    if (level === null || !level.view || level.view.dashboard !== 'summary') return;
    if (dashTiles.length > DASH_SUMMARY_TILES) {
        dashTiles = dashTiles.slice(0, DASH_SUMMARY_TILES);
        dashNote.textContent = level.label + ' view: a short summary.  Edit  ->  "+ Add a tile"  for more.';
    }
}

//  Are most of a column's values record ids  (INC0012345,  CHG0034567,  RITM0001234)?
const DASH_RECORD_ID = /^[A-Za-z]{2,8}[-_]?\d{4,}$/;
function mostlyIds(c) {
    let ids = 0, seen = 0;
    for (const v of c.values.values()) {
        if (++seen > 200) break;
        if (DASH_RECORD_ID.test(String(v).trim())) ids++;
    }
    return seen > 0 && ids / Math.min(seen, 200) > 0.8;
}

function newTile(kind, title, col, value, size) {
    return { id: dashNextId++, kind: kind, title: title, col: col, value: value, size: size, mine: false };
}

//  A column's number,  by its name   (-1:  this file doesn't have it).
function columnIndex(name) {
    return fileTable.engine.columns.indexOf(name);
}



// ----------------------------------------------------------
//
//    STEP 3:  COUNT   (ONE walk through the rows,  for ALL the tiles at once,  in bites)
//
//    Every tile says which column it needs.   Each row is cut only up to the last column needed
//    (rowUpTo:  a question about column 3 doesn't cut the other 40).
//    Empty cells count as "(blank)",  the same as the query engine's NULL for a CSV or Excel file.
//
// ----------------------------------------------------------

const DASH_BLANK = '(blank)';

async function countTiles(isCurrent) {

    const table = fileTable.engine;
    const needs = [];       //  [{ tile, col }]   (col  =  the column's number,  or -1 for "every row")
    dashTiles.forEach(function (tile) {
        const col = tile.col === null ? -1 : columnIndex(tile.col);
        if (tile.col !== null && col === -1) return;
        needs.push({ tile: tile, col: col });
    });

    const width = needs.reduce(function (most, n) { return Math.max(most, n.col + 1); }, 0);
    const tally = needs.map(function (n) {
        return n.tile.kind === 'count' ? { n: 0 } : { map: new Map() };
    });

    const n = table.rowCount;
    let stopAt = performance.now() + CHUNK_TIME;
    for (let i = 0; i < n; i++) {

        if ((i & 255) === 255 && performance.now() > stopAt) {
            await new Promise(function (go) { nextBite(go); });      //  let the screen breathe
            if (!isCurrent()) return null;
            stopAt = performance.now() + CHUNK_TIME;
        }

        const cells = width === 0 ? null : (table.rowUpTo ? table.rowUpTo(i, width) : table.row(i));
        for (let k = 0; k < needs.length; k++) {
            const need = needs[k], t = tally[k];
            if (need.col === -1) { t.n++; continue; }
            let v = cells[need.col];
            const blank = v === undefined || v === '' || (table.isNull !== null && table.isNull(i, need.col));
            v = blank ? DASH_BLANK : v;
            if (need.tile.kind === 'count') {
                if (need.tile.value === null || v === need.tile.value) t.n++;
            } else if (need.tile.kind === 'time') {
                if (blank) continue;
                const day = dayOf(v);
                if (day !== null) t.map.set(day, (t.map.get(day) || 0) + 1);
            } else {
                t.map.set(v, (t.map.get(v) || 0) + 1);
            }
        }
    }

    const out = new Map();
    needs.forEach(function (need, k) { out.set(need.tile.id, tally[k]); });
    return out;
}

//  A cell  ->  its day,  as  2026-07-05   (or null:  not a date).
//  The files write dates like  2026-07-05 00:02:24  (CSV)  or  2026-07-05  (Excel,  as the translator shows them).
function dayOf(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text).trim());
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    //  Written the everyday way  (3/15/06,  15-Mar-2006)?   Read it exactly as the query engine does  (queryI.js:  writtenIso),
    //  so a tile and an answer never disagree about the year of  12/31/99.
    if (typeof writtenIso === 'function') { const iso = writtenIso(String(text)); if (iso !== null) return iso; }
    const t = Date.parse(text);
    if (isNaN(t)) return null;
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}



// ----------------------------------------------------------
//
//    STEP 4:  DRAW   (first the empty tiles,  "counting...",  then the numbers once the walk is done)
//
// ----------------------------------------------------------

async function refresh() {

    if (fileTable === null || dashProfile === null) return;

    const myLoad = ++dashLoad;
    const table = fileTable.engine;
    const isCurrent = function () { return myLoad === dashLoad && fileTable !== null && fileTable.engine === table; };

    drawTiles(true);
    const results = await countTiles(isCurrent);
    if (results === null || !isCurrent()) return;
    dashResults = results;
    drawTiles(false);
}

function drawTiles(counting) {

    dashGrid.textContent = '';
    dash.classList.toggle('editing', dashEditing);

    if (dashTiles.length === 0) {
        dashGrid.appendChild(waitingCard(dashEditing ? 'No tiles.  "+ Add a tile"  makes one.' : 'No tiles.  Edit  ->  "+ Add a tile".'));
        updateExport();
        return;
    }

    dashTiles.forEach(function (tile, index) {

        const card = document.createElement('article');
        card.className = 'dash-tile kind-' + tile.kind + ' size-' + tile.size;

        //  The title  (editable in Edit mode:  click it and type)
        const title = document.createElement('h3');
        title.className = 'dash-tile-title';
        title.textContent = tile.title;
        if (dashEditing) {
            try { title.contentEditable = 'plaintext-only'; }      //  (only words:  no bold or pasted pictures)
            catch (e) { title.contentEditable = 'true'; }           //  (an older browser:  the blur below keeps only the words anyway)
            title.spellcheck = false;
            title.title = 'Click to rename';
            title.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
            title.addEventListener('blur', function () {
                const words = title.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
                tile.title = words || tile.title;
                tile.mine = true;
                title.textContent = tile.title;
            });
        }
        card.appendChild(title);

        if (dashEditing) card.appendChild(tileTools(tile, index));

        const body = document.createElement('div');
        body.className = 'dash-tile-body';
        card.appendChild(body);

        const result = dashResults.get(tile.id);
        if (tile.col !== null && columnIndex(tile.col) === -1) {
            body.appendChild(soft('This file has no column called  ' + tile.col));
        } else if (counting || result === undefined) {
            body.appendChild(soft('counting...'));
        } else if (tile.kind === 'count') {
            drawCount(body, tile, result);
        } else if (tile.kind === 'distinct') {
            drawDistinct(body, tile, result);
        } else if (tile.kind === 'bars') {
            drawBars(body, tile, result);
        } else {
            drawTime(body, tile, result);
        }

        dashGrid.appendChild(card);
    });

    updateExport();
}

function soft(words) {
    const p = document.createElement('p');
    p.className = 'dash-soft';
    p.textContent = words;
    return p;
}

function waitingCard(words) {
    const card = document.createElement('div');
    card.className = 'dash-tile size-l dash-waiting';
    card.appendChild(soft(words));
    return card;
}


//  ---- count:   23,334   (and "where State = Closed",  clickable) ----
function drawCount(body, tile, result) {
    const big = document.createElement('p');
    big.className = 'dash-big';
    big.textContent = result.n.toLocaleString();
    body.appendChild(big);
    if (tile.value !== null) {
        const where = document.createElement('button');
        where.type = 'button';
        where.className = 'dash-link';
        where.textContent = 'where ' + tile.col + ' is ' + tile.value + '  →';
        where.title = 'Show these rows in the sheet';
        where.addEventListener('click', function () { showRows(tile.col, tile.value); });
        body.appendChild(where);
    }
}


//  ---- distinct:   160 different values   (+ the most common one) ----
function drawDistinct(body, tile, result) {
    const values = Array.from(result.map.keys()).filter(function (v) { return v !== DASH_BLANK; });
    const big = document.createElement('p');
    big.className = 'dash-big';
    big.textContent = values.length.toLocaleString();
    body.appendChild(big);
    const top = topValues(result.map, 1)[0];
    if (top) body.appendChild(soft('Most rows:  ' + top[0] + '  (' + top[1].toLocaleString() + ')'));
}


//  ---- bars:   rows per value,  biggest first.   Click a bar  ->  those rows in the sheet. ----
function drawBars(body, tile, result) {

    const all = topValues(result.map, Infinity);
    const total = all.reduce(function (sum, e) { return sum + e[1]; }, 0);
    const shown = all.slice(0, DASH_TOP);
    const rest = all.slice(DASH_TOP);
    const most = shown.length > 0 ? shown[0][1] : 1;

    const list = document.createElement('ol');
    list.className = 'dash-bars';

    shown.forEach(function (entry) {
        const item = document.createElement('li');
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'dash-bar';
        row.title = entry[0] + ':  ' + entry[1].toLocaleString() + ' rows  (' + percent(entry[1], total) + ').  Click to see them in the sheet.';
        row.addEventListener('click', function () { showRows(tile.col, entry[0]); });

        const name = document.createElement('span');
        name.className = 'dash-bar-name';
        name.textContent = entry[0];

        const track = document.createElement('span');
        track.className = 'dash-bar-track';
        const fill = document.createElement('span');
        fill.className = 'dash-bar-fill';
        fill.style.width = Math.max(1, 100 * entry[1] / most) + '%';
        track.appendChild(fill);

        const count = document.createElement('span');
        count.className = 'dash-bar-count';
        count.textContent = entry[1].toLocaleString();

        row.append(name, track, count);
        item.appendChild(row);
        list.appendChild(item);
    });
    body.appendChild(list);

    if (rest.length > 0) {
        const others = rest.reduce(function (sum, e) { return sum + e[1]; }, 0);
        body.appendChild(soft('+ ' + rest.length.toLocaleString() + ' more values  (' + others.toLocaleString() + ' rows,  ' + percent(others, total) + ')'));
    }
}


//  ---- time:   rows per day  (or month),  as columns.   First and last day under it. ----
function drawTime(body, tile, result) {

    const buckets = timeBuckets(result);
    if (buckets === null) { body.appendChild(soft('No dates in this column.')); return; }
    const days = buckets.days, unit = buckets.unit;
    const first = days[0][0], last = days[days.length - 1][0];

    const most = days.reduce(function (m, d) { return Math.max(m, d[1]); }, 1);
    const total = days.reduce(function (s, d) { return s + d[1]; }, 0);

    const chart = document.createElement('div');
    chart.className = 'dash-time';
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', total.toLocaleString() + ' rows from ' + first + ' to ' + last + ', by ' + unit);
    days.forEach(function (d) {
        const col = document.createElement('span');
        col.className = 'dash-time-col';
        col.style.height = Math.max(2, 100 * d[1] / most) + '%';
        col.title = d[0] + ':  ' + d[1].toLocaleString() + ' rows';
        chart.appendChild(col);
    });
    body.appendChild(chart);

    const axis = document.createElement('div');
    axis.className = 'dash-time-axis';
    const a = document.createElement('span'); a.textContent = days[0][0];
    const b = document.createElement('span'); b.textContent = 'by ' + unit + '  ·  busiest:  ' + most.toLocaleString();
    const c = document.createElement('span'); c.textContent = days[days.length - 1][0];
    axis.append(a, b, c);
    body.appendChild(axis);
}


//  A time tile's counts,  in order:   { days: [['2026-07-05', 312], ...],  unit: 'day' }
//  (a long stretch,  more than DASH_MONTHS_AFTER days,  goes by month:  [['2026-07', 9120], ...])   No dates?  null.
//  (The chart and the export both use this,  so they always agree.)
function timeBuckets(result) {
    let days = Array.from(result.map.entries()).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    if (days.length === 0) return null;
    const span = (Date.parse(days[days.length - 1][0]) - Date.parse(days[0][0])) / 86400000;
    if (span <= DASH_MONTHS_AFTER) return { days: days, unit: 'day' };
    const months = new Map();
    days.forEach(function (d) { const m = d[0].slice(0, 7); months.set(m, (months.get(m) || 0) + d[1]); });
    return { days: Array.from(months.entries()), unit: 'month' };
}


//  Biggest first   ->   [[value, count], ...]   (ties:  A to Z,  so it's always the same order)
function topValues(map, howMany) {
    return Array.from(map.entries())
        .sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); })
        .slice(0, howMany);
}

function percent(part, whole) {
    if (whole === 0) return '0%';
    const p = 100 * part / whole;
    return (p < 1 && p > 0 ? p.toFixed(1) : Math.round(p)) + '%';
}



// ----------------------------------------------------------
//
//    STEP 5:  CLICK THROUGH   (the rows behind a bar,  in the sheet)
//
//    It asks the query engine,  the same way a "Try:" button does  (askSql in flogicI.js):
//        SELECT * FROM incident WHERE State = 'Closed'
//    so the rows show up in the sheet,  with  "← Back to file"  to go back.
//    "(blank)"  ->   WHERE State IS NULL   (an empty cell in a CSV or Excel file is NULL to the engine).
//
// ----------------------------------------------------------

function showRows(col, value) {
    const from = sqlName(fileTable.engine.name);
    const where = value === DASH_BLANK ? sqlName(col) + ' IS NULL' : sqlName(col) + ' = ' + sqlWordsOf(value);
    askSql('SELECT * FROM ' + from + ' WHERE ' + where);
    scrollUnderBar(document.getElementById('controls'));
}

//  Scroll so  el  (here:  the answer's top row,  with  "← Back to file")  sits just UNDER the sticky tab bar.
//  It used to scroll the sheet itself to the very top:  the row above it,  and its Back button,  ended up behind the bar
//  (on a 672-tall window,  and behind the desktop window's title bar too).   The bar's own height and stick point are read,
//  so it's right in the browser,  in the desktop app  (the bar sticks at 32,  under the title bar),  and in every theme.
function scrollUnderBar(el) {
    const bar = document.getElementById('stationBar');
    const look = bar ? getComputedStyle(bar) : null;
    const covered = look && look.position === 'sticky' && look.display !== 'none' ? (parseFloat(look.top) || 0) + bar.offsetHeight : 0;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - covered - 8), behavior: 'smooth' });
}



// ----------------------------------------------------------
//
//    EDIT MODE
//
// ----------------------------------------------------------

function toggleEditing() {
    dashEditing = !dashEditing;
    dashEditBtn.setAttribute('aria-pressed', String(dashEditing));
    dashEditBtn.textContent = dashEditing ? 'Done' : 'Edit';
    dashEditBar.hidden = !dashEditing;
    if (!dashEditing) dashAdd.hidden = true;
    if (dashHidden && dashEditing) toggleHidden();
    drawTiles(false);
}

function toggleHidden() {
    dashHidden = !dashHidden;
    dash.classList.toggle('folded', dashHidden);
    dashHideBtn.textContent = dashHidden ? 'Show' : 'Hide';
    dashHideBtn.title = dashHidden ? 'Show the dashboard again' : 'Fold the dashboard away  (the sheet stays)';
}

//  A tile's tools:   ◀  ▶   S M L   ✕
function tileTools(tile, index) {
    const tools = document.createElement('div');
    tools.className = 'dash-tile-tools';

    const left = dashButton('◀', 'Move left', function () { moveTile(index, -1); });
    const right = dashButton('▶', 'Move right', function () { moveTile(index, 1); });
    left.disabled = index === 0;
    right.disabled = index === dashTiles.length - 1;
    tools.append(left, right);

    DASH_SIZES.forEach(function (size) {
        const b = dashButton(size.toUpperCase(), { s: 'Small', m: 'Medium', l: 'Wide' }[size], function () {
            tile.size = size;
            tile.mine = true;
            drawTiles(false);
        });
        b.setAttribute('aria-pressed', String(tile.size === size));
        tools.appendChild(b);
    });

    const remove = dashButton('✕', 'Remove this tile', function () {
        dashTiles.splice(index, 1);
        markMine();
        drawTiles(false);
    });
    remove.className = 'dash-remove';
    tools.appendChild(remove);
    return tools;
}

function moveTile(index, way) {
    const to = index + way;
    if (to < 0 || to >= dashTiles.length) return;
    const tile = dashTiles.splice(index, 1)[0];
    dashTiles.splice(to, 0, tile);
    markMine();
    drawTiles(false);
}

//  The layout is yours now  (a new sheet tab keeps it,  if it has the same columns).
function markMine() {
    dashTiles.forEach(function (t) { t.mine = true; });
}


//  ---- "+ Add a tile" ----
//
//      Show   [ a bar chart of ▾ ]   for   [ column ▾ ]   (count:  where it is  [ value ▾ ])   Title [        ]   [ Add ] [ Cancel ]
//
function openAdd() {

    dashAdd.textContent = '';
    dashAdd.hidden = false;
    const columns = fileTable.engine.columns.filter(function (c) { return c !== ''; });

    const kind = labeled('Show', select([
        ['bars', 'a bar chart: rows per value'],
        ['count', 'a count of rows'],
        ['distinct', 'how many different values'],
        ['time', 'rows over time'],
    ]));
    const col = labeled('of column', select(columns.map(function (c) { return [c, c]; })));
    const value = labeled('where it is', select([]));
    const title = labeled('Title', document.createElement('input'));
    title.field.maxLength = 80;
    title.field.placeholder = '(made for you)';

    //  Which columns make sense for each kind,  and the values for "where it is".
    function update() {
        const k = kind.field.value;
        const colInfo = dashProfile.columns.find(function (c) { return c.name === col.field.value; });
        col.box.hidden = false;
        value.box.hidden = k !== 'count';
        if (k === 'count') {
            const options = [['', '(any: count every row)']];
            if (colInfo && colInfo.count) topValues(colInfo.count, 50).forEach(function (e) { options.push([e[0], e[0]]); });
            fill(value.field, options);
        }
        if (k === 'time') {
            const dates = dashProfile.columns.filter(function (c) { return c.kind === 'date' || c.kind === 'timestamp'; });
            if (dates.length > 0 && !dates.some(function (c) { return c.name === col.field.value; })) col.field.value = dates[0].name;
        }
    }
    kind.field.addEventListener('change', update);
    col.field.addEventListener('change', update);
    update();

    const add = document.createElement('button');
    add.type = 'submit';
    add.textContent = 'Add';
    const cancel = dashButton('Cancel', 'Close without adding', function () { dashAdd.hidden = true; });

    dashAdd.append(kind.box, col.box, value.box, title.box, add, cancel);
    dashAdd.onsubmit = function (e) {
        e.preventDefault();
        const k = kind.field.value;
        const c = col.field.value;
        const v = k === 'count' && value.field.value !== '' ? value.field.value : null;
        const words = title.field.value.replace(/\s+/g, ' ').trim();
        const made = k === 'bars' ? 'Rows by ' + c
            : k === 'distinct' ? 'Different ' + c
            : k === 'time' ? 'Rows over time  (' + c + ')'
            : v !== null ? c + ':  ' + v : 'Rows';
        const tile = newTile(k, words || made, k === 'count' && v === null ? null : c, v, k === 'time' ? 'l' : k === 'bars' ? 'm' : 's');
        dashTiles.push(tile);
        markMine();
        dashAdd.hidden = true;
        refresh();
    };
}

function labeled(words, field) {
    const box = document.createElement('label');
    box.className = 'dash-field';
    const span = document.createElement('span');
    span.textContent = words;
    box.append(span, field);
    return { box: box, field: field };
}

function select(options) {
    const s = document.createElement('select');
    fill(s, options);
    return s;
}

function fill(s, options) {
    s.textContent = '';
    options.forEach(function (o) {
        const option = document.createElement('option');
        option.value = o[0];
        option.textContent = o[1];
        s.appendChild(option);
    });
}


//  ---- SAVE  /  LOAD  a layout   (a small .json file:  nothing is kept in the browser) ----
//
//      { "flogicDashboard": 1,
//        "tiles": [ { "kind": "bars", "title": "Rows by State", "col": "State", "value": null, "size": "m" }, ... ] }
//
function saveLayout() {
    const layout = {
        flogicDashboard: 1,
        tiles: dashTiles.map(function (t) { return { kind: t.kind, title: t.title, col: t.col, value: t.value, size: t.size }; }),
    };
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (fileTable ? fileTable.engine.name : 'dashboard') + '-dashboard.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    dashNote.textContent = 'Layout saved as  ' + link.download;
}

dashLayoutInput.addEventListener('change', function () {
    const file = dashLayoutInput.files[0];
    dashLayoutInput.value = '';
    if (!file) return;
    if (file.size > 100000) { dashNote.textContent = 'That file is too big to be a dashboard layout.'; return; }
    file.text().then(function (text) {
        let layout;
        try { layout = JSON.parse(text); } catch (e) { layout = null; }
        if (!layout || layout.flogicDashboard !== 1 || !Array.isArray(layout.tiles)) {
            dashNote.textContent = 'That isn\'t a dashboard layout file.';
            return;
        }
        //  Checked piece by piece:  anything odd is dropped,  never trusted.
        let dropped = 0;
        const tiles = [];
        layout.tiles.slice(0, DASH_MAX_TILES).forEach(function (t) {
            const ok = t && DASH_KINDS.indexOf(t.kind) !== -1
                && (t.col === null || typeof t.col === 'string')
                && (t.value === null || t.value === undefined || typeof t.value === 'string')
                && (t.col !== null || t.kind === 'count')
                && (t.col === null || columnIndex(t.col) !== -1);
            if (!ok) { dropped++; return; }
            const tile = newTile(t.kind, String(t.title || t.kind).slice(0, 80), t.col, t.value === undefined ? null : t.value,
                                 DASH_SIZES.indexOf(t.size) !== -1 ? t.size : 'm');
            tile.mine = true;
            tiles.push(tile);
        });
        dashTiles = tiles;
        dashNote.textContent = 'Layout loaded:  ' + tiles.length + ' tile' + (tiles.length === 1 ? '' : 's') +
            (dropped > 0 ? '.  ' + dropped + ' left out  (a column this file doesn\'t have,  or something unreadable).' : '.');
        refresh();
    });
});



// ----------------------------------------------------------
//
//    EXPORT REPORT   (the handoff's  5.1:   access-and-encryption-handoff.md)
//
//        [ Export report ]   ->   a small panel:
//            Fernando G · Service Desk · Nov 19, 2026 · incident.csv (23,334 rows)  ·  made 3:52 PM
//            ⚠ This file isn't locked. Share it like any work document.
//            [ Print or save as PDF ]   [ Download the numbers (.csv) ]   [ Close ]
//
//    THE GATE:  while a locked pack is open,  its group's rule decides  (FlogicVault.canExport()).
//               A plain file is the user's own file:  never gated.
//               The button is OFF with the reason next to it  ("Your group can't export"),
//               and the rule is checked AGAIN on every click  (a disabled button isn't a lock).
//
//    THE VAULT is only READ:   window.FlogicVault   (vaultI.js,  loaded after this file).
//    It isn't there?  Export still works,  with no stamp.   It's there but breaks?  Export stays OFF.
//
// ----------------------------------------------------------

let dashVaultHooked = false;        //  told the vault to call  updateExport  when something changes?

//  The vault,  if vaultI.js is there  (and looks like the real thing).   Otherwise  null.
function dashVault() {
    const v = window.FlogicVault;
    return v && typeof v.canExport === 'function' && typeof v.stamp === 'function' ? v : null;
}

//  Can the dashboard export right now?    { ok: true }   or   { ok: false,  why: 'Your group can\'t export' }
function exportCheck() {
    if (fileTable === null || !fileTable.engine || dashProfile === null) return { ok: false, why: '' };
    if (dashTiles.length === 0) return { ok: false, why: 'No tiles to export' };
    if (dashResults.size === 0) return { ok: false, why: 'Still counting...' };
    const v = dashVault();
    if (v === null) return { ok: true };
    try {
        if (typeof v.state === 'function' && v.state() === 'locked') return { ok: false, why: 'Locked' };
        if (v.canExport() !== true) {
            //  The vault knows WHY  (the group's rule,  or the person's access level:  "A Viewer can't export")
            let why = '';
            try { why = typeof v.whyNoExport === 'function' ? String(v.whyNoExport() || '') : ''; } catch (e) { why = ''; }
            return { ok: false, why: why || 'Your group can\'t export' };
        }
        return { ok: true };
    } catch (problem) {
        console.warn('Dashboard: the vault couldn\'t say if exporting is allowed, so Export stays off.', problem);
        return { ok: false, why: 'Couldn\'t check the export rule' };
    }
}

//  Button on or off  (and why),  and the stamp in the panel.   Runs after every draw,  and whenever the vault changes.
function updateExport() {

    const v = dashVault();
    if (v !== null && !dashVaultHooked && typeof v.onChange === 'function') {
        dashVaultHooked = true;
        try { v.onChange(updateExport); } catch (e) { dashVaultHooked = false; }
    }

    const check = exportCheck();
    dashExportBtn.disabled = !check.ok;
    dashWhy.textContent = check.ok ? '' : check.why;
    if (check.ok) dashExportBtn.removeAttribute('aria-describedby');
    else dashExportBtn.setAttribute('aria-describedby', 'dash-why');
    if (!check.ok) showExport(false);
    else dashExportStamp.textContent = reportStamp();
}

function toggleExport() {
    showExport(dashExport.hidden);
}

function showExport(open) {
    if (open && !exportCheck().ok) open = false;
    dashExport.hidden = !open;
    dashExportBtn.setAttribute('aria-expanded', String(open));
    if (open) dashExportStamp.textContent = reportStamp();
}

//  Who · group · date · file  (from the vault),  then the time it was made.
//  No vault  (or a plain file):  the file and its rows,  then the time.
function reportStamp() {
    let stamp = '';
    const v = dashVault();
    if (v !== null) {
        try { stamp = String(v.stamp() || ''); } catch (e) { stamp = ''; }
    }
    if (stamp === '') {
        const rows = fileTable.engine.rowCount;
        stamp = fileTable.file.name + '  (' + rows.toLocaleString() + ' row' + (rows === 1 ? '' : 's') + ')';
        if (fileTable.engine.name !== fileTable.file.name.replace(/\.[^.]*$/, '')) stamp += '  ·  sheet:  ' + fileTable.engine.name;
    }
    const made = new Date().toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return stamp + '  ·  made ' + made;
}


//  ---- THE NUMBERS,  as rows:   [ tile,  column,  value,  rows,  share ] ----
//
//      Rows                    (every row)   23334
//      Rows by Priority        Priority      3 - Moderate     17138    73%
//      Rows over time (...)    Opened        2026-07-05       312      1.3%
//
function reportRows() {
    const rows = [];
    const all = fileTable.engine.rowCount;
    dashTiles.forEach(function (tile) {
        const result = dashResults.get(tile.id);
        if (result === undefined) return;                     //  (a column this file doesn't have)
        if (tile.kind === 'count') {
            rows.push([tile.title, tile.col === null ? '(every row)' : tile.col, tile.value === null ? '' : tile.value, result.n, percent(result.n, all)]);
        } else if (tile.kind === 'distinct') {
            const different = Array.from(result.map.keys()).filter(function (k) { return k !== DASH_BLANK; }).length;
            rows.push([tile.title, tile.col, '(different values)', different, '']);
        } else if (tile.kind === 'bars') {
            const entries = topValues(result.map, Infinity);
            const total = entries.reduce(function (s, e) { return s + e[1]; }, 0);
            entries.forEach(function (e) { rows.push([tile.title, tile.col, e[0], e[1], percent(e[1], total)]); });
        } else {
            const buckets = timeBuckets(result);
            if (buckets === null) return;
            const total = buckets.days.reduce(function (s, d) { return s + d[1]; }, 0);
            buckets.days.forEach(function (d) { rows.push([tile.title, tile.col + '  (by ' + buckets.unit + ')', d[0], d[1], percent(d[1], total)]); });
        }
    });
    return rows;
}

//  One CSV cell.   Quotes when it needs them,  and a cell that starts like a FORMULA  (= + - @)
//  gets a ' in front,  so Excel shows it instead of running it  (a value from the file could be  =HYPERLINK(...) ).
//  (Named  reportCell,  NOT  csvCell:  every script shares one page,  and xlsxI.js has its own  csvCell  for reading
//   Excel files.   Same name  ->  this one replaced it,  and Excel's  -5  opened as  '-5 .)
function reportCell(value) {
    let text = String(value);
    if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = '\'' + text;
    return /[",\r\n]/.test(text) ? '"' + text.split('"').join('""') + '"' : text;
}

function downloadReportCsv() {
    if (!exportCheck().ok) { updateExport(); return; }          //  (checked again:  the rule may have changed)
    const lines = [['Tile', 'Column', 'Value', 'Rows', 'Share']].concat(reportRows());
    lines.push([], ['Report', reportStamp()], ['Note', DASH_UNLOCKED_NOTE]);
    const text = lines.map(function (line) { return line.map(reportCell).join(','); }).join('\r\n') + '\r\n';
    const blob = new Blob(['﻿' + text], { type: 'text/csv' });          //  (the BOM tells Excel it's UTF-8:  é and — come out right)
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileTable.file.name.replace(/\.[^.]*$/, '') + '-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    dashNote.textContent = 'Report numbers saved as  ' + link.download + '.   ' + DASH_UNLOCKED_NOTE;
}


//  ---- THE PRINTED PAGE ----
//
//  A copy of the tiles  (no buttons that do anything,  no Edit tools)  goes in  #dash-report,  under a
//  heading,  the stamp and the "isn't locked" line.   For the print,  ONLY that shows  (dashI.css,  @media print).
//  The print window's "Save as PDF" makes it a file.   Then the copy is thrown away.
//
function printReport() {
    if (!exportCheck().ok) { updateExport(); return; }

    const old = document.getElementById('dash-report');
    if (old) old.remove();

    const report = document.createElement('section');
    report.id = 'dash-report';
    const h = document.createElement('h1');
    h.textContent = 'Report  ·  ' + fileTable.engine.name;
    const stamp = document.createElement('p');
    stamp.className = 'dash-report-stamp';
    stamp.textContent = reportStamp();
    const note = document.createElement('p');
    note.className = 'dash-report-note';
    note.textContent = DASH_UNLOCKED_NOTE;

    const grid = dashGrid.cloneNode(true);
    grid.querySelectorAll('.dash-tile-tools').forEach(function (t) { t.remove(); });
    grid.querySelectorAll('[contenteditable]').forEach(function (t) { t.removeAttribute('contenteditable'); });
    grid.querySelectorAll('button').forEach(function (b) { b.tabIndex = -1; });
    grid.querySelectorAll('[title]').forEach(function (t) { t.removeAttribute('title'); });

    report.append(h, stamp, note, grid);
    document.body.appendChild(report);
    document.body.classList.add('dash-printing');

    let done = false;
    const cleanUp = function () {
        if (done) return;
        done = true;
        document.body.classList.remove('dash-printing');
        report.remove();
        window.removeEventListener('afterprint', cleanUp);
    };
    window.addEventListener('afterprint', cleanUp);
    window.print();                         //  (the copy is thrown away when the print window closes:  "afterprint".
                                            //   It's hidden on the screen anyway,  and the next print replaces it.)
}
