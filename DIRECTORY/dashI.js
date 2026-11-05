/*
    ==========================================================

        THE NANDO NOTES  -  dashI.js

        THE DASHBOARD.   The first thing you see after you open a file:
        a few cards and charts that answer "what's in here?"  at a glance.
        No SQL,  no scrolling.   Then the sheet is right below,  like always.

            testI.html   =  what's there     (skeleton)
            styleI.css   =  how it looks     (clothes)
            scriptI.js   =  what it does     (brain)
            queryI.js    =  answers SQL questions (the query engine)
            dashI.js     =  the dashboard         (this file)
            dashI.css    =  the dashboard's clothes

    ==========================================================


    WHAT IT LOOKS LIKE:

        ┌ DASHBOARD  ·  incident  ·  23,334 rows ─────────────── [ Edit ] [ Hide ] ┐
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
    engine  (askSql in scriptI.js),  so they show up in the sheet with  "← Back to file".

    SAFETY  (same rules as the rest of the app):
        -  Nothing is saved in the browser.   A layout only leaves as a file YOU download.
        -  No network.   No outside code.
        -  Every word from the file goes on the page as plain text  (textContent),  never as HTML.
        -  A layout file is checked piece by piece:  an unknown kind or column is dropped,  not trusted.

    HOW IT PLUGS IN  (DJ's isolate-and-reuse method:  POINT,  don't copy):
        It points at functions that already live in scriptI.js and queryI.js  (DASH_NEEDS,  below),
        and adds ONE thing:  when a file finishes loading,  scriptI.js calls  queryFileChanged().
        This file wraps it,  so the dashboard hears about every new file  (and every sheet tab).
        It runs the original first,  then rebuilds the dashboard.   Nothing in scriptI.js is edited.

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



// ----------------------------------------------------------
//
//    WHAT IT POINTS AT  (checked once,  at the start)
//
//    If someone renames one of these in scriptI.js or queryI.js,  the dashboard says so in the
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
//    STEP 0:  BUILD THE PIECES  (here,  not in testI.html,  like focus mode does)
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

const dashEditBtn = dashButton('Edit', 'Move, resize, rename, add or remove tiles', toggleEditing);
const dashHideBtn = dashButton('Hide', 'Fold the dashboard away  (the sheet stays)', toggleHidden);
dashEditBtn.setAttribute('aria-pressed', 'false');
dashTools.append(dashEditBtn, dashHideBtn);

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

dash.append(dashHead, dashEditBar, dashAdd, dashNote, dashGrid);

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
//    scriptI.js calls  queryFileChanged()  right after a file  (or a sheet tab)  finishes loading.
//    The dashboard runs the original,  THEN rebuilds itself.
//    (A query's ANSWER doesn't call it:  the dashboard keeps showing the file,  not the answer.)
//
// ----------------------------------------------------------

if (dashReady) {
    const originalFileChanged = queryFileChanged;
    queryFileChanged = function () {
        originalFileChanged.apply(this, arguments);
        dashFileChanged();
    };
}

async function dashFileChanged() {

    const myLoad = ++dashLoad;
    const table = fileTable.engine;
    const isCurrent = function () { return myLoad === dashLoad && fileTable !== null && fileTable.engine === table; };

    dashProfile = null;
    dashResults = new Map();
    dashAdd.hidden = true;
    dashNote.textContent = '';
    dash.hidden = false;
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
    else suggestTiles();

    refresh();
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
    //  Best first:  a good name,  then fewer values.
    const ranked = groups.slice().sort(function (a, b) { return nameKind(a) - nameKind(b) || a.values.size - b.values.size; });

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

    let days = Array.from(result.map.entries()).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    if (days.length === 0) { body.appendChild(soft('No dates in this column.')); return; }

    const first = days[0][0], last = days[days.length - 1][0];
    const span = (Date.parse(last) - Date.parse(first)) / 86400000;
    let unit = 'day';
    if (span > DASH_MONTHS_AFTER) {
        const months = new Map();
        days.forEach(function (d) { const m = d[0].slice(0, 7); months.set(m, (months.get(m) || 0) + d[1]); });
        days = Array.from(months.entries());
        unit = 'month';
    }

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
//    It asks the query engine,  the same way a "Try:" button does  (askSql in scriptI.js):
//        SELECT * FROM incident WHERE State = 'Closed'
//    so the rows show up in the sheet,  with  "← Back to file"  to go back.
//    "(blank)"  ->   WHERE State IS NULL   (an empty cell in a CSV or Excel file is NULL to the engine).
//
// ----------------------------------------------------------

function showRows(col, value) {
    const from = sqlName(fileTable.engine.name);
    const where = value === DASH_BLANK ? sqlName(col) + ' IS NULL' : sqlName(col) + ' = ' + sqlWordsOf(value);
    askSql('SELECT * FROM ' + from + ' WHERE ' + where);
    document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
