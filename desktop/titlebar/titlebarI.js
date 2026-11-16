/*
    titlebarI.js   -   THE WINDOW'S OWN TOP BAR   (desktop app only)

    Flogic's window has no Windows frame.   This draws the top bar in the page's own colors:
        [ Flogic                                          —   ▢   ✕ ]
    Drag it to move the window.   Double-click it to maximize.   Buttons:  minimize,  maximize / restore,  close.

    CLOSE asks the page first,  the way a browser tab does:  a page with unsaved work  (the IT console's keyring)
    says so,  and the first close only warns.   Close again to lose it.   That goes for the ✕,  Alt+F4 and the taskbar.

    In a browser  (no window.__TAURI__)  it does nothing at all.
*/

(function () {

    'use strict';

    const T = window.__TAURI__;
    if (!T || !T.window || typeof T.window.getCurrentWindow !== 'function') return;
    const win = T.window.getCurrentWindow();
    const SVG = 'http://www.w3.org/2000/svg';

    document.documentElement.classList.add('flogic-desktop');

    function icon(paths) {
        const s = document.createElementNS(SVG, 'svg');
        s.setAttribute('viewBox', '0 0 10 10');
        s.setAttribute('width', '10');
        s.setAttribute('height', '10');
        s.setAttribute('aria-hidden', 'true');
        for (const d of paths) {
            const p = document.createElementNS(SVG, 'path');
            p.setAttribute('d', d);
            s.appendChild(p);
        }
        return s;
    }
    const MIN = ['M0 5.5 H10'];
    const MAX = ['M0.5 0.5 H9.5 V9.5 H0.5 Z'];
    const RESTORE = ['M2.5 0.5 H9.5 V7.5', 'M0.5 2.5 H7.5 V9.5 H0.5 Z'];
    const CLOSE = ['M0.5 0.5 L9.5 9.5', 'M9.5 0.5 L0.5 9.5'];

    function button(id, label, paths, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = id;
        b.className = 'flogic-tb-btn';
        b.tabIndex = -1;                            //  like Windows' own:  not in the page's Tab order
        b.title = label;
        b.setAttribute('aria-label', label);
        b.appendChild(icon(paths));
        b.addEventListener('click', onClick);
        return b;
    }

    const bar = document.createElement('div');
    bar.id = 'flogicTitlebar';
    bar.setAttribute('data-tauri-drag-region', '');

    const name = document.createElement('span');
    name.className = 'flogic-tb-name';
    name.setAttribute('data-tauri-drag-region', '');
    name.textContent = document.title;
    win.title().then(function (t) { if (t) name.textContent = t; }).catch(function () {});

    const note = document.createElement('span');
    note.className = 'flogic-tb-note';
    note.setAttribute('role', 'status');
    note.setAttribute('data-tauri-drag-region', '');

    const minBtn = button('flogicMin', 'Minimize', MIN, function () { win.minimize(); });
    const maxBtn = button('flogicMax', 'Maximize', MAX, function () { win.toggleMaximize(); });
    const closeBtn = button('flogicClose', 'Close', CLOSE, function () { win.close(); });

    const buttons = document.createElement('div');
    buttons.className = 'flogic-tb-buttons';
    buttons.append(minBtn, maxBtn, closeBtn);
    bar.append(name, note, buttons);

    //  The bar goes NEXT TO <body>,  not inside it.
    //  The sign-in card makes everything in <body> untouchable while it's up  (vaultI.js:  pageInert).   Inside <body>,
    //  the bar went dead with the rest after every Lock:  no minimize,  no maximize,  no ✕,  no moving the window.
    //  (Found in the desktop sweep.   At first start it worked only because the bar was added after the card came up.)
    document.documentElement.appendChild(bar);

    //  Maximize  <->  Restore
    async function showMax() {
        let big = false;
        try { big = await win.isMaximized(); } catch (e) { big = false; }
        maxBtn.replaceChildren(icon(big ? RESTORE : MAX));
        maxBtn.title = big ? 'Restore' : 'Maximize';
        maxBtn.setAttribute('aria-label', maxBtn.title);
        document.documentElement.classList.toggle('flogic-maximized', big);
    }
    showMax();
    win.onResized(function () { showMax(); }).catch(function () {});

    //  CLOSE:  the page's own "unsaved changes?" check  (its beforeunload),  then close for real
    let armed = false, disarm = null;
    win.onCloseRequested(function (event) {
        const ask = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(ask);
        if (!ask.defaultPrevented || armed) return;            //  nothing unsaved  (or asked already):  it closes
        event.preventDefault();
        armed = true;
        note.textContent = 'Unsaved changes. Close again to lose them.';
        bar.classList.add('warn');
        clearTimeout(disarm);
        disarm = setTimeout(function () { armed = false; note.textContent = ''; bar.classList.remove('warn'); }, 8000);
    }).catch(function () {});

})();
