// The stations, with real mouse and keyboard.   node stations-test.mjs <page | exe:path> <csv> <out> [w] [h]
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const [, , PAGE, CSV, OUT, W = '1366', H = '860'] = process.argv;
mkdirSync(OUT, { recursive: true });
rmSync(OUT + '/profile', { recursive: true, force: true });
const EXE = PAGE.startsWith('exe:') ? PAGE.slice(4) : null;
const PORT = 9500 + Math.floor(Math.random() * 300);
const proc = EXE ? spawn(EXE, [], { stdio: 'ignore', env: { ...process.env, FLOGIC_SWEEP_PORT: String(PORT) } })
    : spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
        `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/profile`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const waiting = new Map(); const out = []; let fails = 0; const pageErrors = [];
const check = (name, ok, extra) => { out.push((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '   [' + extra + ']' : '')); if (!ok) fails++; };
const send = (method, params = {}) => new Promise((res, rej) => { const my = ++id; waiting.set(my, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: my, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
const waitFor = async (e, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await ev(e)) return true; await sleep(80); } return false; };
async function clickAt(x, y) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); await sleep(40); } await sleep(150); }
async function spot(js) { return ev(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { x, y, w: Math.round(r.width), h: Math.round(r.height), hit: !!h && (h === el || el.contains(h)) }; })()`); }
async function click(js, label) { const s = await spot(js); if (!s || !s.hit) { check('can really click ' + label, false, JSON.stringify(s)); return false; } await clickAt(s.x, s.y); return true; }
async function key(k, code, vk, mods = 0, text) { await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods }); await sleep(120); }
async function shot(n) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); }
const st = () => ev(`document.body.dataset.station`);
const settled = () => waitFor(`!document.querySelector('.station-leaving, .turn-in-left, .turn-in-right')`, 3000);
const turned = `[...document.querySelectorAll('#stations, .station')].filter(e => getComputedStyle(e).transform !== 'none').map(e => e.id)`;

try {
    for (let i = 0; i < 100 && !ws; i++) { try { const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page' && (!EXE || /tauri\.localhost/.test(t.url))); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); } } catch (e) { } if (!ws) await sleep(200); }
    ws.onmessage = m => { const x = JSON.parse(m.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } if (x.method === 'Runtime.exceptionThrown') pageErrors.push(x.params.exceptionDetails.exception?.description || x.params.exceptionDetails.text); };
    await send('Runtime.enable');
    if (!EXE) await send('Page.navigate', { url: 'file:///' + PAGE });
    else { await send('Page.reload'); }
    await waitFor(`document.readyState === 'complete' && !!document.getElementById('stationTabs')`); await sleep(600);
    out.push('INFO ' + await ev(`location.href + '  ' + innerWidth + 'x' + innerHeight`));
    await click(`[...document.querySelectorAll('button')].find(b => /plain file without signing in/.test(b.textContent) && b.offsetParent)`, 'plain file');
    await waitFor(`(() => { const c = document.getElementById('vaultCard'); return !c || c.hidden || getComputedStyle(c).display === 'none' || getComputedStyle(c).visibility === 'hidden' || Number(getComputedStyle(c).opacity) === 0; })()`, 5000); await sleep(400);

    // 1. Start:  Sheet,  the other tabs off,  no Ask/Checks strip
    check('starts on the Sheet', await st() === 'sheet');
    check('Dashboard and Ticket tabs are off until a file is open', await ev(`['tab-dashboard','tab-ticket'].every(t => document.getElementById(t).getAttribute('aria-disabled') === 'true')`));
    await click(`document.getElementById('tab-dashboard')`, 'Dashboard tab (off)');
    check('clicking an off tab does nothing', await st() === 'sheet');
    check('no Ask/Checks strip before a file', await ev(`document.getElementById('stationActions').hidden`));
    check('Choose File is on the Sheet station, clickable', (await spot(`document.getElementById('chooseBtn')`)).hit && await ev(`document.getElementById('station-sheet').contains(document.getElementById('chooseBtn'))`));
    await shot('01-start');

    // 2. Open a file  ->  lands on the SIMPLIFIED dashboard
    const doc = await send('DOM.getDocument');
    const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp.nodeId, files: [CSV] });
    await waitFor(`document.body.dataset.station === 'dashboard' && document.getElementById('loader').hidden`, 60000);
    await settled();
    check('a new file lands on the Dashboard', await st() === 'dashboard');
    await waitFor(`document.querySelectorAll('#dash .dash-tile').length > 4`, 20000);
    await sleep(500);
    const dashInfo = await ev(`({ simple: document.getElementById('dash').classList.contains('dash-simple'), shown: [...document.querySelectorAll('#dash .dash-tile')].filter(t => t.offsetParent).length, all: document.querySelectorAll('#dash .dash-tile').length, more: document.getElementById('dashMore').hidden ? null : document.getElementById('dashMore').textContent })`);
    check('the dashboard is simplified: 4 tiles, and "Show the full dashboard (N tiles)"', dashInfo.simple && dashInfo.shown === 4 && dashInfo.more && dashInfo.more.includes(String(dashInfo.all)), JSON.stringify(dashInfo));
    check('nothing is left turned at rest', (await ev(turned)).length === 0, (await ev(turned)).join(','));
    check('Ask and Checks: long buttons on the Dashboard, clickable', (await spot(`document.getElementById('queryBtn')`)).hit && (await spot(`document.getElementById('checksBtn')`)).hit && (await spot(`document.getElementById('queryBtn')`)).w > 200, JSON.stringify(await spot(`document.getElementById('queryBtn')`)));
    await shot('02-landing-dashboard');
    await click(`document.getElementById('dashMore')`, 'Show the full dashboard');
    check('"Show the full dashboard" shows every tile', await ev(`[...document.querySelectorAll('#dash .dash-tile')].every(t => t.offsetParent !== null) && document.getElementById('dashMore').hidden`));

    // 3. Tabs:  click,  keyboard ← →,  Alt + digit,  Back
    await click(`document.getElementById('tab-sheet')`, 'Sheet tab');
    await settled();
    check('Sheet tab turns to the Sheet', await st() === 'sheet' && await ev(`!document.getElementById('station-sheet').hidden && document.getElementById('station-dashboard').hidden`));
    check('the sheet measured itself (rows built, inside the window)', await ev(`document.querySelectorAll('#rows > [data-index]').length > 5 && document.getElementById('output').clientWidth > 300`));
    check('Ask and Checks on the Sheet too', (await spot(`document.getElementById('checksBtn')`)).hit);
    await key('ArrowRight', 'ArrowRight', 39);
    await settled();
    check('→ on the tabs: Dashboard', await st() === 'dashboard' && await ev(`document.activeElement.id === 'tab-dashboard'`));
    await key('ArrowRight', 'ArrowRight', 39); await settled();
    check('→ again: Ticket', await st() === 'ticket');
    await key('ArrowRight', 'ArrowRight', 39); await settled();
    check('→ at the end wraps to Sheet', await st() === 'sheet');
    await key('2', 'Digit2', 50, 1); await settled();
    check('Alt+2: Dashboard', await st() === 'dashboard');
    await send('Page.navigateToHistoryEntry', { entryId: (await send('Page.getNavigationHistory')).entries.slice(-2)[0].id }).catch(() => {});
    await sleep(500); await settled();
    check('Back goes to the station before (Sheet)', await st() === 'sheet', await st() + ' ' + await ev(`location.hash`));

    // 4. Drawer on the Sheet  ->  Big view ▸  ->  Ticket station
    await settled();
    const cell = await ev(`(() => { const box = document.getElementById('output').getBoundingClientRect(); const l = [...document.querySelectorAll('#rows > [data-index]')].find(l => { const r = l.getBoundingClientRect(); const c = l.querySelector('.cell'); const cr = c.getBoundingClientRect(); const x = Math.max(cr.left, box.left + 70) + 15, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return r.top > box.top + 40 && r.bottom < Math.min(box.bottom, innerHeight) - 5 && h !== null && c.contains(h); }); const c = l.querySelector('.cell'); const r = c.getBoundingClientRect(); return { x: Math.max(r.left, box.left + 70) + 15, y: r.top + r.height / 2, row: Number(l.dataset.index) }; })()`);
    await clickAt(cell.x, cell.y);
    const drawerId = await ev(`document.getElementById('aimRowTitle').textContent.split('  ·  ')[0]`);
    check('a cell click opens the drawer, which has "Big view ▸"', await ev(`!document.getElementById('aimRow').hidden`) && (await spot(`document.getElementById('aimRowBig')`)).hit, drawerId);
    await click(`document.getElementById('aimRowBig')`, 'Big view ▸');
    await settled();
    check('Big view ▸: the Ticket station, the same ticket, the drawer closed', await st() === 'ticket' && await ev(`document.getElementById('ticketTitle').textContent`) === drawerId && await ev(`document.getElementById('aimRow').hidden`), await ev(`document.getElementById('ticketTitle').textContent`));
    check('no Ask/Checks strip on the Ticket station', await ev(`document.getElementById('stationActions').hidden`));
    const t1 = await ev(`({ head: (document.getElementById('ticketHeadline') || {}).textContent, where: document.getElementById('ticketWhere').textContent, filled: [...document.querySelectorAll('.ticket-field')].filter(f => f.offsetParent).length, empty: document.querySelectorAll('.ticket-empty-field').length })`);
    check('the ticket: a headline, its place, filled fields shown, empty ones folded', t1.head && t1.where.includes(" of " + (await ev(`rowCount.toLocaleString("en-US")`))) && t1.filled > 10 && t1.empty > 0, JSON.stringify(t1));
    await shot('03-ticket');

    // 5. The ticket arrows:  up and down,  with words  (not like the tabs)
    const rail = await ev(`[...document.querySelectorAll('#ticketRail button')].map(b => b.textContent.trim())`);
    check('the ticket arrows say what they do (▲ Previous ticket / ▼ Next ticket), on a vertical rail', rail[0].startsWith('▲') && /Previous ticket/.test(rail[0]) && /Next ticket/.test(rail[1]) && await ev(`getComputedStyle(document.getElementById('ticketRail')).flexDirection === 'column'`), rail.join(' | '));
    const before = await ev(`document.getElementById('ticketWhere').textContent`);
    await click(`[...document.querySelectorAll('#ticketRail button')].find(b => /Next ticket/.test(b.textContent))`, '▼ Next ticket');
    const after = await ev(`document.getElementById('ticketWhere').textContent`);
    check('▼ Next ticket moves one down', parseInt(after.replace(/,/g, '')) === parseInt(before.replace(/,/g, '')) + 1, before + ' -> ' + after);
    await clickAt(600, 500);                                    //  (the keyboard on the page,  not a button)
    await key('ArrowUp', 'ArrowUp', 38);
    check('↑ key: back up one', await ev(`document.getElementById('ticketWhere').textContent`) === before);
    await key('End', 'End', 35);
    check('End: the last ticket, ▼ turns off', (await ev(`document.getElementById('ticketWhere').textContent.startsWith(rowCount.toLocaleString("en-US") + " of")`)) && await ev(`[...document.querySelectorAll('#ticketRail button')].find(b => /Next ticket/.test(b.textContent)).disabled`));
    await key('Home', 'Home', 36);
    check('Home: the first ticket', /^1 of/.test(await ev(`document.getElementById('ticketWhere').textContent`)));
    check('↑/↓ on the Ticket station never change the station', await st() === 'ticket');

    // 6. An answer from the Dashboard  (a tile row,  or Checks' Show ▸)  turns to the Sheet
    await click(`document.getElementById('tab-dashboard')`, 'Dashboard tab'); await settled();
    const bar = await spot(`[...document.querySelectorAll('#dash .dash-tile button.dash-bar')].find(b => b.offsetParent !== null)`);
    if (bar && bar.hit) {
        await clickAt(bar.x, bar.y);
        await waitFor(`document.body.dataset.station === 'sheet' && !document.getElementById('backBtn').hidden && document.getElementById('loader').hidden`, 30000);
        await settled();
        check('a dashboard tile row: its rows show in the Sheet', await st() === 'sheet' && await ev(`!document.getElementById('backBtn').hidden`), await ev(`document.getElementById('status').textContent`));
        await click(`document.getElementById('backBtn')`, '← Back to file');
        await waitFor(`document.getElementById('backBtn').hidden`, 20000);
    } else out.push('INFO (no clickable tile bar found: skipped the tile check)');

    // 7. Focus mode from the Dashboard:  F turns to the Sheet first;  the grid is full screen  (nothing turned around it)
    await click(`document.getElementById('tab-dashboard')`, 'Dashboard tab (2)'); await settled();
    await clickAt(30, 600);
    await key('f', 'KeyF', 70, 0, 'f');
    await sleep(500);
    const fm = await ev(`(() => { const r = document.getElementById('output').getBoundingClientRect(); return { focus: document.body.classList.contains('focus'), station: document.body.dataset.station, left: Math.round(r.left), width: Math.round(r.width), iw: innerWidth, bar: getComputedStyle(document.getElementById('stationBar')).display }; })()`);
    check('F on the Dashboard: focus mode, on the Sheet, the grid edge to edge, the tabs out of the way', fm.focus && fm.station === 'sheet' && fm.left === 0 && fm.width >= fm.iw - 20 && fm.bar === 'none', JSON.stringify(fm));
    await shot('04-focus');
    await key('Escape', 'Escape', 27); await sleep(300);
    check('Escape: out of focus mode, the tabs back', !(await ev(`document.body.classList.contains('focus')`)) && await ev(`getComputedStyle(document.getElementById('stationBar')).display !== 'none'`));

    // 8. Ask from the Sheet opens under the strip;  dark theme screenshot
    await click(`document.getElementById('queryBtn')`, 'Ask');
    await sleep(600);
    check('Ask opens its menu under the strip, clickable', await ev(`queryMenuOpen()`) && (await spot(`document.getElementById('queryRun')`)).hit);
    await key('Escape', 'Escape', 27); await click(`document.getElementById('queryClose')`, 'Ask ×').catch(() => {});
    await ev(`setTheme(THEMES.find(t => t.id === 'neo-dark'))`).catch(() => {});
    await click(`document.getElementById('tab-dashboard')`, 'Dashboard tab (dark)'); await settled(); await sleep(300);
    await shot('05-dashboard-dark');
    check('nothing is left turned at rest (end)', (await ev(turned)).length === 0);
    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) { check('test ran to the end', false, e.message); }
finally {
    writeFileSync(OUT + '/result.txt', out.join('\n') + '\n' + (fails ? fails + ' FAILED' : 'ALL PASS'));
    console.log(out.join('\n') + '\n' + (fails ? fails + ' FAILED' : 'ALL PASS'));
    try { execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { }
    process.exit(0);
}
