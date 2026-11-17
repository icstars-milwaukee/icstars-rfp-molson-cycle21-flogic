// A tiny Chrome-DevTools-Protocol driver for headless Edge: real mouse and key input (Input.dispatch*), which hit-tests
// like a person's mouse does.   node cdp.mjs <page file path> <csv path> <out dir> [width] [height]
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const [, , PAGE, CSV, OUT, W = '1366', H = '640'] = process.argv;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9351 + Math.floor(Math.random() * 200);
mkdirSync(OUT, { recursive: true });
const PROFILE = OUT + '/profile';
rmSync(PROFILE, { recursive: true, force: true });

//  PAGE = "exe:<path to a sweep build>"  ->  drive the REAL desktop window  (it opens its own page;  FLOGIC_SWEEP_PORT = PORT)
const EXE = PAGE.startsWith('exe:') ? PAGE.slice(4) : null;
const edge = EXE
    ? spawn(EXE, [], { stdio: 'ignore', env: { ...process.env, FLOGIC_SWEEP_PORT: String(PORT) } })
    : spawn(EDGE, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run',
        `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

let ws, id = 0;
const waiting = new Map();
const results = [];
const pageErrors = [];
let fails = 0;
function check(name, ok, extra) {
    results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '   [' + extra + ']' : ''));
    if (!ok) fails++;
}

async function connect() {
    for (let i = 0; i < 100; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
            const pageT = list.find(t => t.type === 'page' && (!EXE || /tauri\.localhost/.test(t.url)));
            if (pageT) {
                ws = new WebSocket(pageT.webSocketDebuggerUrl);
                await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
                ws.onmessage = (m) => {
                    const msg = JSON.parse(m.data);
                    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
                    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
                };
                return;
            }
        } catch (e) { }
        await sleep(200);
    }
    throw new Error('no DevTools');
}
function send(method, params = {}) {
    const my = ++id;
    ws.send(JSON.stringify({ id: my, method, params }));
    return new Promise((res, rej) => waiting.set(my, (msg) => msg.error ? rej(new Error(method + ': ' + msg.error.message)) : res(msg.result)));
}
async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
}
async function waitFor(expr, ms = 15000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await ev(expr)) return true; await sleep(60); }
    return false;
}
async function mouse(type, x, y, extra = {}) {
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, ...extra });
}
async function clickAt(x, y) {
    await mouse('mouseMoved', x, y);
    await sleep(30);
    await mouse('mousePressed', x, y);
    await sleep(40);
    await mouse('mouseReleased', x, y);
    await sleep(120);
}
// The centre of an element, and whether a real mouse there would land ON it (hit-test).
async function spot(sel) {
    return ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
        const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { x, y, w: r.width, h: r.height, hit: hit !== null && (hit === el || el.contains(hit)), hitId: hit ? (hit.id || hit.className) : null }; })()`);
}
async function click(sel) {
    const s = await spot(sel);
    if (!s || !s.hit) { check('can really click ' + sel, false, JSON.stringify(s)); return false; }
    await clickAt(s.x, s.y);
    return true;
}
async function key(k, code, vk, text) {
    await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
    await sleep(80);
}
async function type(s) {
    for (const ch of s) {
        const vk = ch.toUpperCase().charCodeAt(0);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, windowsVirtualKeyCode: vk });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, windowsVirtualKeyCode: vk });
        await sleep(35);
    }
    await sleep(150);
}
async function shot(name) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
}
// Is the drawer fully on screen, and can its × really be clicked?
async function drawerOnScreen(label) {
    const d = await ev(`(() => { const a = document.getElementById('aimRow'); const r = a.getBoundingClientRect();
        return { hidden: a.hidden, top: r.top, right: r.right, bottom: r.bottom, left: r.left, iw: innerWidth, ih: innerHeight,
                 title: document.getElementById('aimRowTitle').textContent }; })()`);
    const x = await spot('#aimRowClose');
    const ok = !d.hidden && d.top >= 0 && d.left >= 0 && d.right <= d.iw + 1 && d.bottom <= d.ih + 1 && d.bottom - d.top > 200 && x && x.hit;
    if (EXE) {
        const tb = await ev(`(() => { const t = document.getElementById('flogicTitlebar'); return t ? t.getBoundingClientRect().bottom : 0; })()`);
        check(label + '  (below the window\'s title bar)', d.top >= tb - 1, `drawer top ${Math.round(d.top)}, title bar bottom ${Math.round(tb)}`);
    }
    check(label, ok, `top ${Math.round(d.top)} bottom ${Math.round(d.bottom)} of ${d.ih}, left ${Math.round(d.left)}, × clickable ${x && x.hit}, "${d.title}"`);
    return d;
}
// A data cell on screen, by its spot among the built cells of a visible row.
async function cellSpot(rowNth, colNth) {
    return ev(`(() => { const box = document.getElementById('output').getBoundingClientRect();
        const lines = [...document.querySelectorAll('#rows > [data-index]')].filter(l => { const r = l.getBoundingClientRect(); return r.top >= box.top + 40 && r.bottom <= box.bottom - 4 && r.bottom <= innerHeight - 4 && r.top >= 0; });
        const line = lines[${rowNth}]; if (!line) return null;
        const cells = [...line.querySelectorAll('.cell')].filter(c => { const r = c.getBoundingClientRect(); return r.left >= box.left + 60 && r.right <= Math.min(box.right, innerWidth) - 4; });
        const c = cells[${colNth}]; if (!c) return null; const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y);
        return { x, y, hit: hit === c || c.contains(hit), index: line.dataset.index }; })()`);
}

try {
    await connect();
    await send('Page.enable');
    await send('Runtime.enable');
    if (!EXE) await send('Page.navigate', { url: 'file:///' + PAGE.replace(/\\/g, '/') });
    else results.push('INFO desktop window: ' + await ev(`location.href + '  ' + innerWidth + 'x' + innerHeight + '  title bar: ' + !!document.getElementById('flogicTitlebar')`));
    await waitFor(`document.readyState === 'complete'`);
    await sleep(500);
    //  EXE_SIZE=1280x672:  the desktop window resized so the PAGE is that big  (a 1080p laptop at 150%,  on any screen).   Uses winctl.ps1 size.
    if (EXE && process.env.EXE_SIZE) {
        const [sw, sh] = process.env.EXE_SIZE.split('x');
        const winctl = decodeURIComponent(new URL('../sweep-tools/sweep/winctl.ps1', import.meta.url).pathname).replace(/^.([A-Za-z]:)/, '$1');
        let [tw, th] = [Number(sw), Number(sh)];
        for (let i = 0; i < 3; i++) {                  //  (the frameless window has hidden borders:  measure the page,  and make up the difference)
            execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${winctl}" -ProcId ${edge.pid} -Cmd size -W ${tw} -H ${th}`);
            await sleep(800);
            const [iw, ih] = await ev(`[innerWidth, innerHeight]`);
            if (iw === Number(sw) && ih === Number(sh)) break;
            tw += Number(sw) - iw; th += Number(sh) - ih;
        }
        results.push('INFO resized: ' + await ev(`innerWidth + 'x' + innerHeight`));
    }

    // 0. The sign-in card:  "Open a plain file without signing in"
    const plain = await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => /plain file without signing in/.test(b.textContent) && b.offsetParent); if (!b) return null; b.id = b.id || 'plainBtnForTest'; return '#' + b.id; })()`);
    if (plain) { await click(plain); await sleep(400); }
    check('sign-in card stepped aside (plain file)', plain !== null);

    check('Expand (show all) is gone from the page', await ev(`document.getElementById('expandBtn') === null && ![...document.querySelectorAll('button')].some(b => /Expand/i.test(b.textContent))`));

    // 1. Open the file with the page's own file input
    const doc = await send('DOM.getDocument');
    const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp.nodeId, files: [CSV] });
    const loaded = await waitFor(`/Rows \\d/.test(document.getElementById('status').textContent) && document.getElementById('loader').hidden`, 60000);
    check('file opened', loaded, await ev(`document.getElementById('status').textContent`));
    await sleep(600);
    //  (Stations:  a new file lands on the Dashboard.   This test is about the Sheet:  click its tab.)
    if (await ev(`!!document.getElementById('tab-sheet')`)) {
        await click('#tab-sheet');
        await waitFor(`document.body.dataset.station === 'sheet' && !document.querySelector('.station-leaving, .turn-in-left, .turn-in-right')`, 3000);
        await sleep(200);
    }

    // 2. Go to row:  in the sheet's bottom-left corner,  not in the controls row
    if (!(await ev(`!!document.getElementById('jumpBar')`))) check('Go to row has its corner bar', false, 'no #jumpBar (old code)');
    else {
    const jb =await ev(`(() => { const j = document.getElementById('jumpBar'), o = document.getElementById('output'); const a = j.getBoundingClientRect(), b = o.getBoundingClientRect();
        return { hidden: j.hidden, inControls: document.getElementById('controls').contains(document.getElementById('jumpBtn')), dx: Math.round(a.left - b.left), dy: Math.round(a.top - b.bottom), w: Math.round(a.width) }; })()`);
    check('Go to row is out of the controls row', !jb.inControls);
    check('Go to row sits at the sheet\'s bottom-left corner', !jb.hidden && jb.dx >= 0 && jb.dx <= 16 && jb.dy >= 0 && jb.dy <= 20, JSON.stringify(jb));

    // Scroll the page so the corner is on screen (real wheel, over the page's empty side)
    for (let i = 0; i < 20; i++) {
        const s = await spot('#jumpInput');
        if (s && s.hit) break;
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 20, y: 300, deltaX: 0, deltaY: 120 });
        await sleep(250);
    }
    await shot('01-corner');
    if (await click('#jumpInput')) {
        await type('500');
        await click('#jumpBtn');
        await sleep(300);
        const st = await ev(`document.getElementById('status').textContent`);
        check('Go to row 500 (typed, then the button)', /Rows 500/.test(st), st);
        await click('#jumpInput');
        await key('Control', 'ControlLeft', 17); // (nothing)
        await ev(`0`);
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await type('1200');
        await key('Enter', 'Enter', 13, '\r');
        await sleep(300);
        const st2 = await ev(`document.getElementById('status').textContent`);
        check('Go to row 1200 (Enter)', /Rows 1200/.test(st2), st2);
    }
    }

    // 3. Scrolled DOWN the page:  the file bar is off the top.   Tap a cell  ->  the drawer, fully on screen.
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 20, y: 300, deltaX: 0, deltaY: 2000 });
    await sleep(500);
    const barTop = await ev(`document.getElementById('fileBar').getBoundingClientRect().bottom`);
    check('page scrolled so the file bar is off screen', barTop < 0, 'bar bottom ' + Math.round(barTop));
    let c = await cellSpot(2, 1);
    check('a cell is on screen and clickable (scrolled)', c && c.hit, JSON.stringify(c));
    if (c) { await clickAt(c.x, c.y); await sleep(300); }
    await drawerOnScreen('scrolled down: a cell tap opens the drawer fully on screen');
    await shot('02-drawer-scrolled');
    await click('#aimRowClose');
    check('× closes the drawer', await ev(`document.getElementById('aimRow').hidden`));

    // 4. Top of the page:  search,  the snap menu's "Details ▾"  opens the same drawer,  ▶ moves it along
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 20, y: 300, deltaX: 0, deltaY: -5000 });
    await sleep(500);
    await click('#searchInput');
    await type('network');
    await waitFor(`document.getElementById('loader').hidden && /\\d+ \\/ \\d+/.test(document.getElementById('aimCount').textContent)`, 60000);
    await sleep(300);
    const cnt = await ev(`document.getElementById('aimCount').textContent`);
    check('search finds matches', /\d+ \/ \d+/.test(cnt), cnt);
    await click('#aimRowBtn');
    await sleep(300);
    const d1 = await drawerOnScreen('Details ▾ opens the drawer for the match');
    const where = `document.getElementById('aimRowTitle').textContent + ' / ' + document.getElementById('aimFocusName').textContent`;
    const w1 = await ev(where);
    await click('#aimNext'); await click('#aimNext'); await click('#aimNext');
    await sleep(300);
    const w2 = await ev(where);
    const aimW = await ev(`document.getElementById('aimWhere').textContent`);
    check('▶ moves the snap menu, and the drawer follows', !(await ev(`document.getElementById('aimRow').hidden`)) && w2 !== w1 && w2.includes(aimW.split('  ·  ')[0] + '  ·'), w1 + '  ->  ' + w2 + '   (snap menu: ' + aimW + ')');
    const aimOk = await spot('#aimNext');
    check('the snap menu stays clickable with the drawer open', aimOk && aimOk.hit, JSON.stringify(aimOk));
    await shot('03-drawer-snap');
    await key('Escape', 'Escape', 27);
    check('Escape closes the drawer', await ev(`document.getElementById('aimRow').hidden`));
    // clear the search
    await click('#searchInput');
    for (let i = 0; i < 7; i++) await key('Backspace', 'Backspace', 8);
    await sleep(500);

    // 5. FOCUS MODE ("fullscreen"):  F,  click a cell (selects),  click it again  ->  the drawer,  on screen,  under the strip
    await clickAt(30, 200);            // (somewhere neutral:  out of the search box)
    await key('f', 'KeyF', 70, 'f');
    await sleep(500);
    check('focus mode on', await ev(`document.body.classList.contains('focus')`));
    c = await cellSpot(4, 2);
    check('a cell is clickable in focus mode', c && c.hit, JSON.stringify(c));
    await clickAt(c.x, c.y);
    check('first click selects the cell (no drawer yet)', await ev(`document.getElementById('aimRow').hidden && document.querySelector('.grid-cell') !== null`));
    await sleep(500);
    await clickAt(c.x, c.y);
    await sleep(300);
    const fd = await drawerOnScreen('focus mode: clicking the selected cell opens the drawer fully on screen');
    const strip = await ev(`document.getElementById('focusInfo').getBoundingClientRect().bottom`);
    check('focus mode: the drawer starts under the info strip', fd.top >= strip - 1, `drawer top ${Math.round(fd.top)}, strip bottom ${Math.round(strip)}`);
    await mouse('mouseMoved', 400, 300); await sleep(200);
    const pillOk = await spot('#pillSearch');
    check('focus mode: the pill stays clickable with the drawer open', pillOk && pillOk.hit, JSON.stringify(pillOk));
    await shot('04-drawer-focus');
    await key('Escape', 'Escape', 27);
    check('focus mode: Escape closes the drawer and stays in focus mode', await ev(`document.getElementById('aimRow').hidden && document.body.classList.contains('focus')`));

    // search inside focus mode, then the selected (found) cell  ->  drawer
    await key('/', 'Slash', 191, '/');
    await type('network');
    await waitFor(`document.getElementById('loader').hidden && /\\d+ \\/ \\d+/.test(document.getElementById('aimCount').textContent)`, 60000);
    await key('Enter', 'Enter', 13, '\r');
    await sleep(500);
    const sel = await ev(`(() => { const g = document.querySelector('#rows .grid-cell'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    check('focus mode: search moves the selected cell onto the match', sel !== null);
    if (sel) {
        await key('Escape', 'Escape', 27);     // (leave the pill's search box)
        await clickAt(sel.x, sel.y); await sleep(300);
        await drawerOnScreen('focus mode: the found cell opens the drawer');
        await key('Escape', 'Escape', 27);
    }
    await clickAt(30, 300);
    await key('Escape', 'Escape', 27);
    await sleep(300);
    check('Escape leaves focus mode', !(await ev(`document.body.classList.contains('focus')`)));
    check('Go to row is back in its corner after focus mode', await ev(`document.getElementById('jumpBar').contains(document.getElementById('jumpInput')) && !document.getElementById('jumpBar').hidden`));

    check('no page errors in the whole run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
    check('test ran to the end', false, e.message);
} finally {
    writeFileSync(`${OUT}/result.txt`, results.join('\n') + `\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}\n`);
    console.log(results.join('\n') + `\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
    try { ws && ws.close(); } catch (e) { }
    try { execSync(`taskkill /PID ${edge.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { }
    process.exit(0);
}
