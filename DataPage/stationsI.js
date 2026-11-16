/*
    ==========================================================

        THE NANDO NOTES  -  stationsI.js

        THE STATIONS:   one page,  one view at a time,  on a carousel.

            ┌──────────┐┌───────────┐┌─────────┐
            │  Ticket  ││ Dashboard ││  Sheet  │          <-  folder tabs:  every station one click away
           ─┘          └┘▔▔▔▔▔▔▔▔▔▔▔└┘         └──────────          (the Dashboard is the CENTER:  Ticket on its left,  Sheet on its right)
            [          Ask          ] [        Checks        ]     <-  on Sheet AND Dashboard  (long buttons)
                    (the station in front)

            Sheet       Open a file,  the grid,  search,  the snap menu,  Go to row,  focus mode.
                        The app STARTS here,  and stays here until a file is open  (it's a viewer of your data).
            Dashboard   Where a newly opened file LANDS:  a simplified dashboard first  ("Show the full dashboard").
            Ticket      ONE ticket,  big:  its headline,  every field,  the empty ones folded.
                        ▲ Previous ticket  /  ▼ Next ticket   (UP and DOWN:  tickets are rows.   The tabs go LEFT and RIGHT.)

            The Details drawer  (the right edge)  still opens anywhere.   Its  "Big view ▸"  turns to the Ticket station.
            Settings stay in the corners  (the theme chip,  the Lock chip).

        THE MOTION:   the station in front turns away,  and the next one turns in,  with the SAME turn as the
        "Spreadsheet View" flip  (perspective 3000px,  rotateY,  ease-in / ease-out).   Going right?  It turns left.
        So the SHEET always comes in from the right,  and the TICKET from the left  (Sheet <-> Ticket too:  the same ring).
        AT REST nothing is turned:  a turned box would trap focus mode's full-screen grid and the drawer
        (anything "fixed" inside a transformed box sticks to the box,  not the screen).

        KEYS:   on the tabs  ← →  (and Home / End).   Anywhere:  Alt + 1 / 2 / 3   (the tabs' order:  Ticket,  Dashboard,  Sheet).
                On the Ticket station:  ↑ ↓  (and PageUp / PageDown)  the previous / next ticket,  Home / End  the first / last.
        The address follows the station  (#sheet  #dashboard  #ticket),  so Back works.

        HOW IT PLUGS IN  (POINT,  don't copy):   it MOVES the page's real pieces into the stations  (nothing is rebuilt),
        and wraps a few functions by name  (STATION_NEEDS):   a new file  ->  land on the dashboard,   an answer  ->  the Sheet,
        focus mode  ->  the Sheet first.   Nothing in flogicI.js,  dashI.js or checksI.js is edited.
        Missing a piece?  It says so in the console and leaves the page as it was  (one long page,  like before).

    ==========================================================
*/



const STATION_NEEDS = ['queryFileChanged', 'askSql', 'showAnswer', 'backToFile', 'setFocus', 'cellAt', 'recordIdOf',
                       'detailsTarget', 'closeDrawer', 'paintMatches', 'rowShift', 'rowInfo'];

const stationsReady = STATION_NEEDS.every(function (name) {
    const ok = typeof window[name] === 'function';
    if (!ok) console.warn('Stations: "' + name + '" is missing, so the page stays one long page.');
    return ok;
}) && ['fileArea', 'output', 'sheet', 'controls', 'searchInput', 'aimRow', 'dash', 'queryBtn', 'queryMenu']
    .every(function (id) {
        const ok = document.getElementById(id) !== null;
        if (!ok) console.warn('Stations: #' + id + ' is missing, so the page stays one long page.');
        return ok;
    });

//  THE ORDER IS THE CAROUSEL:   Ticket  (left)   ·   Dashboard  (center)   ·   Sheet  (right).
//  It sets the tabs' order,  Alt + 1 / 2 / 3,  and which way each turn goes  (stationIndex,  in goStation):
//  the Sheet always comes in from the RIGHT,  the Ticket from the LEFT.   (The app still STARTS on the Sheet.)
const STATIONS = [
    { id: 'ticket',    label: 'Ticket' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sheet',     label: 'Sheet' },
];
const STATION_TURN_MS  = 260;       //  (a safety net:  the turn's animation ends by itself,  this only cleans up if it doesn't)
const DASH_SIMPLE_TILES = 4;        //  the simplified dashboard:  this many tiles  (the big numbers first)

let station       = 'sheet';        //  the station in front
let stationTurn   = null;           //  the turn still going:  { from,  timer }   (null:  none)
let stationFile   = null;           //  the file a landing was made for  ("incident.csv"):  a NEW file lands on the dashboard
let ticketRow     = null;           //  the Ticket station's ticket:  its row in the FILE  (null:  none picked yet)
const stationScroll = {};           //  where each station was scrolled to  (you come back to the same spot)



// ----------------------------------------------------------
//
//    BUILD:   the tab row,  the Ask / Checks strip,  the three stations   (and move the real pieces in)
//
// ----------------------------------------------------------

function stationEl(tag, id, className) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    if (className) el.className = className;
    return el;
}

const stationBar     = stationEl('nav', 'stationBar');
const stationTabList = stationEl('div', 'stationTabs');
const stationActions = stationEl('div', 'stationActions');
const stationBox     = stationEl('main', 'stations');
const stationPanels  = {};
const stationTabs    = {};
const dashMore       = stationEl('button', 'dashMore');
const ticketView     = stationEl('div', 'ticketView');

if (stationsReady) {

    //  ---- the tab row ----
    stationBar.setAttribute('aria-label', 'Stations');
    const brand = document.querySelector('h1');
    if (brand !== null) stationBar.appendChild(brand);             //  "Flogic":  the tab row's left end
    stationTabList.setAttribute('role', 'tablist');
    stationTabList.setAttribute('aria-label', 'Stations');
    STATIONS.forEach(function (s, i) {
        const tab = stationEl('button', 'tab-' + s.id, 'station-tab');
        tab.type = 'button';
        tab.textContent = s.label;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', 'station-' + s.id);
        tab.setAttribute('aria-selected', String(s.id === station));
        tab.tabIndex = s.id === station ? 0 : -1;
        tab.title = s.label + '   (Alt + ' + (i + 1) + ')';
        tab.addEventListener('click', function () { goStation(s.id); });
        stationTabs[s.id] = tab;
        stationTabList.appendChild(tab);

        const panel = stationEl('section', 'station-' + s.id, 'station');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'tab-' + s.id);
        panel.hidden = s.id !== station;
        stationPanels[s.id] = panel;
        stationBox.appendChild(panel);
    });
    stationBar.appendChild(stationTabList);

    //  ---- where they go:  right where the file bar was ----
    const fileArea = document.getElementById('fileArea');
    fileArea.parentNode.insertBefore(stationBar, fileArea);
    fileArea.parentNode.insertBefore(stationActions, fileArea);
    fileArea.parentNode.insertBefore(stationBox, fileArea);

    //  ---- SHEET:  open a file,  and the grid  (the page's real pieces,  moved in,  in their order) ----
    ['fileArea', 'readingFrom', 'fileBadge', 'sheetTabs', 'searchInput', 'status', 'controls', 'sheet'].forEach(function (id) {
        const piece = document.getElementById(id);
        if (piece !== null) stationPanels.sheet.appendChild(piece);
    });

    //  ---- DASHBOARD:  the dashboard,  and "Show the full dashboard" under it ----
    stationPanels.dashboard.appendChild(document.getElementById('dash'));
    dashMore.type = 'button';
    dashMore.hidden = true;
    dashMore.addEventListener('click', function () { dashSimple(false); });
    stationPanels.dashboard.appendChild(dashMore);

    //  ---- TICKET:  one ticket,  big ----
    stationPanels.ticket.appendChild(ticketView);

    //  ---- ASK  +  CHECKS:  long buttons,  on Sheet and Dashboard  (their menus drop down under them) ----
    const ask = document.getElementById('queryBtn');
    stationActions.appendChild(ask);
    const checks = document.getElementById('checksBtn');
    if (checks !== null) stationActions.appendChild(checks);
    stationActions.appendChild(document.getElementById('queryMenu'));
    const checksPanel = document.getElementById('checksMenu');
    if (checksPanel !== null) stationActions.appendChild(checksPanel);

    //  ---- the Details drawer:  "Big view ▸"  ->  the Ticket station ----
    const bigView = stationEl('button', 'aimRowBig');
    bigView.type = 'button';
    bigView.textContent = 'Big view ▸';
    bigView.title = 'Open this ticket on the Ticket station:  big,  every field  (Alt + 3)';
    bigView.addEventListener('click', function () {
        const t = detailsTarget();
        if (t !== null) ticketRow = t.row;
        closeDrawer();
        goStation('ticket');
    });
    const drawerHead = document.querySelector('#aimRow .row-head');
    drawerHead.insertBefore(bigView, document.getElementById('aimRowClose'));

    //  THE VAULT'S CARD makes the page's top-level pieces "inert"  (not clickable)  while it's up,  and lets go of the
    //  top-level pieces when it goes.   The pieces moved above aren't top-level any more,  so:  the new containers
    //  carry that state now  (the vault reaches them),  and the moved pieces let go of their own.
    //  (Without this,  the Sheet could NEVER be clicked after signing in:  found by the stations test.)
    const moved = [brand, fileArea, ask, checks, document.getElementById('queryMenu'), checksPanel, document.getElementById('dash')]
        .concat(['readingFrom', 'fileBadge', 'sheetTabs', 'searchInput', 'status', 'controls', 'sheet'].map(function (id) { return document.getElementById(id); }));
    const wasInert = moved.some(function (p) { return p !== null && p.inert; });
    moved.forEach(function (p) { if (p !== null) p.inert = false; });
    [stationBar, stationActions, stationBox].forEach(function (c) { c.inert = wasInert; });

    document.body.classList.add('stations');
    setStationLocks();
    drawStationChrome();
    wireStations();
}



// ----------------------------------------------------------
//
//    WHICH STATIONS ARE OPEN TO YOU   (no file:  only the Sheet,  where you open one)
//
// ----------------------------------------------------------

function hasFile() { return typeof fileTable !== 'undefined' && fileTable !== null; }

function setStationLocks() {
    const open = hasFile();
    document.body.classList.toggle('has-file', open);
    ['dashboard', 'ticket'].forEach(function (id) {
        const tab = stationTabs[id];
        tab.setAttribute('aria-disabled', String(!open));
        tab.title = open ? tab.textContent + '   (Alt + ' + (STATIONS.findIndex(function (s) { return s.id === id; }) + 1) + ')'
                         : 'Open a file first  (on the Sheet)';
    });
}

function stationAllowed(id) {
    return id === 'sheet' || hasFile();
}



// ----------------------------------------------------------
//
//    TURN TO A STATION
//
//    The new station shows RIGHT AWAY  (so the sheet can measure itself),  turning in.
//    The old one is lifted out of the page's flow,  on top,  and turns away.   Then it's put away.
//
// ----------------------------------------------------------

function stationIndex(id) { return STATIONS.findIndex(function (s) { return s.id === id; }); }

function goStation(id, opts) {
    opts = opts || {};
    if (!stationsReady || stationIndex(id) === -1 || !stationAllowed(id)) return false;
    if (id === station) { if (opts.focusTab) stationTabs[id].focus(); return true; }

    if (focusOn && id !== 'sheet') setFocus(false);         //  (focus mode is the Sheet,  full screen)
    finishTurn();

    const from = stationPanels[station];
    const to = stationPanels[id];
    const way = stationIndex(id) > stationIndex(station) ? 'left' : 'right';      //  going right:  the old one turns LEFT
    stationScroll[station] = window.scrollY;

    const instant = opts.instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!instant) {
        const box = stationBox.getBoundingClientRect(), r = from.getBoundingClientRect();
        from.style.top = (r.top - box.top) + 'px';
        from.classList.add('station-leaving', 'turn-away-' + way);
        stationTurn = { from: from, timer: setTimeout(finishTurn, STATION_TURN_MS + 200) };
        from.addEventListener('animationend', finishTurn, { once: true });
    } else {
        from.hidden = true;
    }

    to.hidden = false;
    if (!instant) {
        to.classList.add('turn-in-' + way);
        to.addEventListener('animationend', function () { to.classList.remove('turn-in-left', 'turn-in-right'); stationShown(id); }, { once: true });
    }

    station = id;
    drawStationChrome();
    window.scrollTo(0, stationScroll[id] || 0);
    stationShown(id);

    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    if (opts.focusTab) stationTabs[id].focus();
    return true;
}

//  The old station's turn is over  (or a new turn starts first):  put it away,  and leave nothing turned.
function finishTurn() {
    if (stationTurn === null) return;
    const t = stationTurn;
    stationTurn = null;
    clearTimeout(t.timer);
    t.from.hidden = true;
    t.from.classList.remove('station-leaving', 'turn-away-left', 'turn-away-right');
    t.from.style.top = '';
    Object.keys(stationPanels).forEach(function (k) { stationPanels[k].classList.remove('turn-in-left', 'turn-in-right'); });
}

//  A station is in front now:  the sheet measures itself again  (its size may have changed while it was away),
//  the ticket draws.
function stationShown(id) {
    if (id === 'sheet') window.dispatchEvent(new Event('resize'));
    if (id === 'ticket') drawTicket();
}

//  The tabs,  the strip,  the page's own mark  (body[data-station]:  for the clothes)
function drawStationChrome() {
    STATIONS.forEach(function (s) {
        const on = s.id === station;
        stationTabs[s.id].setAttribute('aria-selected', String(on));
        stationTabs[s.id].tabIndex = on ? 0 : -1;
    });
    document.body.dataset.station = station;
    stationActions.hidden = station === 'ticket' || !hasFile();
}



// ----------------------------------------------------------
//
//    WIRING:   a new file,  an answer,  focus mode,  the keys,  Back
//
// ----------------------------------------------------------

function wireStations() {

    //  A NEW file lands on the (simplified) dashboard.   A sheet tab of the same file:  stay where you are.
    //  No file any more  (Lock):  back to the Sheet,  the other tabs off.
    const originalChanged = queryFileChanged;
    queryFileChanged = function () {
        try { return originalChanged.apply(this, arguments); }
        finally {
            setStationLocks();
            ticketRow = null;
            if (!hasFile()) {
                stationFile = null;
                goStation('sheet', { instant: true });
                drawStationChrome();
            } else {
                const name = readingName.textContent.trim();
                if (name !== stationFile) {
                    stationFile = name;
                    dashSimple(true);
                    goStation('dashboard');
                }
                drawStationChrome();
            }
        }
    };

    //  An answer  (Ask,  a check's "Show ▸",  a dashboard tile)  shows in the SHEET:  turn there first.
    const originalAsk = askSql;
    askSql = function () { goStation('sheet'); return originalAsk.apply(this, arguments); };
    const originalAnswer = showAnswer;
    showAnswer = function () { ticketRow = null; goStation('sheet'); return originalAnswer.apply(this, arguments); };
    const originalBack = backToFile;
    backToFile = function () { ticketRow = null; return originalBack.apply(this, arguments); };

    //  Focus mode is the Sheet,  full screen:  turn to the Sheet first  (no motion:  focus mode has its own)
    const originalFocus = setFocus;
    setFocus = function (on) {
        if (on && station !== 'sheet') goStation('sheet', { instant: true });
        return originalFocus.apply(this, arguments);
    };

    //  The tabs:  ← →  Home  End   (and they open as you move:  one key,  one station)
    stationTabList.addEventListener('keydown', function (e) {
        const order = STATIONS.map(function (s) { return s.id; }).filter(stationAllowed);
        const at = order.indexOf(station);
        let to = null;
        if (e.key === 'ArrowRight') to = order[(at + 1) % order.length];
        else if (e.key === 'ArrowLeft') to = order[(at - 1 + order.length) % order.length];
        else if (e.key === 'Home') to = order[0];
        else if (e.key === 'End') to = order[order.length - 1];
        if (to === null) return;
        e.preventDefault();
        goStation(to, { focusTab: true });
    });

    //  Anywhere:  Alt + 1 / 2 / 3.    On the Ticket station:  ↑ ↓  PageUp PageDown  Home End.
    document.addEventListener('keydown', function (e) {
        if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            const s = STATIONS[Number(e.key) - 1];
            if (s) { e.preventDefault(); goStation(s.id, { focusTab: true }); }
            return;
        }
        if (station !== 'ticket' || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], [role="tablist"]')) return;
        const step = { ArrowUp: -1, PageUp: -1, ArrowDown: 1, PageDown: 1 }[e.key];
        if (step !== undefined) { e.preventDefault(); stepTicket(step); }
        else if (e.key === 'Home') { e.preventDefault(); stepTicket(-Infinity); }
        else if (e.key === 'End') { e.preventDefault(); stepTicket(Infinity); }
    });

    //  Back / Forward  (the address:  #sheet  #dashboard  #ticket)
    window.addEventListener('popstate', function () {
        const id = location.hash.slice(1);
        if (stationIndex(id) !== -1 && id !== station) {
            if (!goStation(id)) history.replaceState(null, '', '#' + station);
            else history.replaceState(null, '', '#' + id);
        }
    });
    history.replaceState(null, '', '#' + station);

    //  Edit on the dashboard  ->  the whole dashboard  (you're editing all of it)
    if (typeof dashEditBtn !== 'undefined') dashEditBtn.addEventListener('click', function () { dashSimple(false); });

    //  "Show the full dashboard (12 tiles)":  its count follows the tiles
    const grid = document.querySelector('#dash .dash-grid');
    if (grid !== null) new MutationObserver(drawDashMore).observe(grid, { childList: true });
}



// ----------------------------------------------------------
//
//    THE SIMPLIFIED DASHBOARD   (where a new file lands:  the first few tiles,  the big numbers)
//
// ----------------------------------------------------------

function dashSimple(on) {
    document.getElementById('dash').classList.toggle('dash-simple', on);
    drawDashMore();
}

function drawDashMore() {
    const d = document.getElementById('dash');
    const tiles = d.querySelectorAll('.dash-grid > .dash-tile').length;
    const simple = d.classList.contains('dash-simple');
    dashMore.hidden = !simple || tiles <= DASH_SIMPLE_TILES || d.hidden;
    dashMore.textContent = 'Show the full dashboard  (' + tiles + ' tiles)';
}



// ----------------------------------------------------------
//
//    THE TICKET STATION
//
//      ┌──────────┬──────────────────────────────────────────────────────────┐
//      │ ▲        │  INC1814464                         Row 2  ·  2 of 23,334 │
//      │ Previous │  Unable to access SAP RDTs                    (headline)  │
//      │ ticket   │  ───────────────────────────────────────────────────────  │
//      │          │  Number   INC1814464        State      Resolved           │
//      │ 2 of     │  Created  2026-09-01 ...    Priority   P3 - Average       │
//      │ 23,334   │  Description                                               │
//      │          │    Contact e-mail ...  (long text:  the whole width)       │
//      │ ▼ Next   │  [ Show the 21 empty fields ]                              │
//      │ ticket   │                                                            │
//      │ ⤒ First  │                                                            │
//      │ Last ⤓   │                                                            │
//      └──────────┴──────────────────────────────────────────────────────────┘
//
//    The ticket arrows go UP and DOWN  (tickets are rows),  on their own rail,  with words:
//    nothing like the tabs,  which go left and right.
//
// ----------------------------------------------------------

const TICKET_FIELDS   = 200;        //  a row with thousands of columns:  the first 200
const TICKET_LONG     = 90;         //  a value longer than this  (or with a line break)  takes the whole width
const TICKET_HEADLINE = ['short description', 'title', 'subject', 'summary', 'name', 'description'];

function ticketPosition() {
    if (ticketRow === null) return -1;
    return matches.indexOf(ticketRow);
}

//  -1 / +1:  the ticket before / after.   -Infinity / Infinity:  the first / the last.   (In the sheet's order,  search included.)
function stepTicket(step) {
    if (matches.length === 0) return;
    let at = ticketPosition();
    if (at === -1) at = 0;
    at = step === -Infinity ? 0 : step === Infinity ? matches.length - 1 : Math.min(Math.max(at + step, 0), matches.length - 1);
    ticketRow = matches[at];
    drawTicket();
}

function ticketButton(words, title, onClick, disabled) {
    const b = stationEl('button', null, 'ticket-step');
    b.type = 'button';
    b.textContent = words;
    b.title = title;
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
}

function drawTicket() {
    ticketView.textContent = '';

    if (!hasFile() || matches.length === 0) {
        ticketView.appendChild(stationEl('p', null, 'ticket-empty')).textContent = hasFile()
            ? 'No rows to show:  the search leaves none.'
            : 'Open a file on the Sheet first.';
        return;
    }

    //  Which ticket:  the one you chose  ("Big view ▸",  or the arrows),  else the drawer's,  else the selected cell's,  else the first
    if (ticketRow === null || matches.indexOf(ticketRow) === -1) {
        const t = detailsTarget();
        ticketRow = t !== null && matches.indexOf(t.row) !== -1 ? t.row
                  : gridCell !== null && matches.indexOf(gridCell.row) !== -1 ? gridCell.row
                  : matches[0];
    }
    const row = ticketRow, at = matches.indexOf(row);
    const count = Math.min(Math.max(headerCells.length, rowInfo(row).count), TICKET_FIELDS);

    //  ---- the rail:  ▲ Previous ticket   2 of 23,334   ▼ Next ticket   ⤒ First   Last ⤓ ----
    const rail = stationEl('nav', 'ticketRail');
    rail.setAttribute('aria-label', 'Step through tickets  (↑ ↓)');
    rail.append(
        ticketButton('▲  Previous ticket', 'The ticket above this one  (↑)', function () { stepTicket(-1); }, at <= 0),
        stationEl('div', 'ticketWhere'),
        ticketButton('▼  Next ticket', 'The ticket below this one  (↓)', function () { stepTicket(1); }, at >= matches.length - 1),
        ticketButton('⤒  First', 'The first ticket  (Home)', function () { stepTicket(-Infinity); }, at <= 0),
        ticketButton('Last  ⤓', 'The last ticket  (End)', function () { stepTicket(Infinity); }, at >= matches.length - 1));
    rail.querySelector('#ticketWhere').textContent = (at + 1).toLocaleString() + ' of ' + matches.length.toLocaleString() +
        (query !== '' ? '  (searched)' : '');

    //  ---- the ticket ----
    const card = stationEl('article', 'ticketCard');
    const id = recordIdOf(row, count);
    const head = stationEl('header', null, 'ticket-head');
    const title = stationEl('h2', 'ticketTitle');
    title.textContent = id !== null ? id : 'Row ' + (row + 1 + rowShift());
    const where = stationEl('span', null, 'ticket-row');
    where.textContent = 'Row ' + (row + 1 + rowShift());
    head.append(title, where);
    card.appendChild(head);

    const lower = headerCells.map(function (h) { return String(h).trim().toLowerCase(); });
    const hl = TICKET_HEADLINE.map(function (n) { return lower.indexOf(n); }).find(function (k) { return k !== -1 && cellAt(row, k) !== ''; });
    if (hl !== undefined) {
        const line = stationEl('p', 'ticketHeadline');
        paintMatches(line, cellAt(row, hl).slice(0, 400), query);
        card.appendChild(line);
    }

    const fields = stationEl('dl', 'ticketFields');
    let empties = 0;
    for (let c = 0; c < count; c++) {
        const text = cellAt(row, c);
        const wrap = stationEl('div', null, 'ticket-field');
        if (text === '') { wrap.classList.add('ticket-empty-field'); empties++; }
        if (text.length > TICKET_LONG || /[\r\n]/.test(text)) wrap.classList.add('ticket-long');
        const name = stationEl('dt');
        name.textContent = headerCells[c] || 'column ' + (c + 1);
        const value = stationEl('dd');
        if (text === '') value.textContent = '—';
        else paintMatches(value, text.length > 20000 ? text.slice(0, 20000) + '…' : text, query);
        wrap.append(name, value);
        fields.appendChild(wrap);
    }
    fields.classList.toggle('show-empty', showEmptyFields);
    card.appendChild(fields);

    if (empties > 0) {
        const more = stationEl('button', 'ticketEmpties', 'ticket-step');
        more.type = 'button';
        more.textContent = showEmptyFields ? 'Hide the empty fields' : 'Show the ' + empties + ' empty field' + (empties === 1 ? '' : 's');
        more.addEventListener('click', function () { showEmptyFields = !showEmptyFields; drawTicket(); });
        card.appendChild(more);
    }

    ticketView.append(rail, card);
}
