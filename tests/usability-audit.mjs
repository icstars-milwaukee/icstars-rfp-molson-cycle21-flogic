// Usability audit of the Details drawer + Go to row:  target sizes,  text contrast (both themes),  keyboard focus,
// whether the drawer covers the clicked cell,  empty fields.   node audit.mjs <page> <csv> <out>
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const [, , PAGE, CSV, OUT, W = '1366', H = '768'] = process.argv;
mkdirSync(OUT, { recursive: true });
const PORT = 9400 + Math.floor(Math.random() * 300);
rmSync(OUT + '/profile', { recursive: true, force: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/profile`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const waiting = new Map(); const lines = [];
const say = s => { lines.push(s); console.log(s); };
const send = (method, params = {}) => new Promise((res, rej) => { const my = ++id; waiting.set(my, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: my, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
async function clickAt(x, y) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); await sleep(40); } await sleep(250); }
async function key(k, code, vk, shift) { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: shift ? 8 : 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: shift ? 8 : 0 }); await sleep(120); }
async function shot(n) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); }

// In-page helpers:  real background behind an element (gradients averaged, see-through layers blended down),  WCAG contrast.
const HELPERS = `
window.__audit = (function () {
  function parse(c) { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function over(top, bottom) { const a = top.a + bottom.a * (1 - top.a); if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a: a }; }
  function layer(el) { const s = getComputedStyle(el); let c = parse(s.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
    const stops = (s.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []).map(parse);
    if (stops.length) { const avg = stops.reduce((t, x) => ({ r: t.r + x.r / stops.length, g: t.g + x.g / stops.length, b: t.b + x.b / stops.length, a: t.a + x.a / stops.length }), { r: 0, g: 0, b: 0, a: 0 }); c = over(avg, c); }
    return c; }
  function bgOf(el) { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e);
    let bg = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) { const l = layer(chain[i]); if (l.a > 0) bg = over(l, bg); } return bg; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function opacityOf(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; }
  function contrast(el, colorProp) { const s = getComputedStyle(el); const bg = bgOf(el); let fg = parse(colorProp || s.color);
    fg = over({ ...fg, a: fg.a * opacityOf(el) }, bg); const a = lum(fg), b = lum(bg); return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), size: parseFloat(s.fontSize), weight: Number(s.fontWeight) }; }
  return { contrast: contrast };
})();`;

try {
    for (let i = 0; i < 60 && !ws; i++) { try { const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); } } catch (e) { } if (!ws) await sleep(200); }
    ws.onmessage = m => { const x = JSON.parse(m.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } };
    await send('Runtime.enable');
    await send('Page.navigate', { url: 'file:///' + PAGE });
    for (let i = 0; i < 100 && !(await ev(`document.readyState === 'complete'`)); i++) await sleep(100);
    await sleep(500);
    await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => /plain file without signing in/.test(b.textContent) && b.offsetParent); if (b) b.click(); })()`);
    const doc = await send('DOM.getDocument'); const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp.nodeId, files: [CSV] });
    for (let i = 0; i < 300 && !(await ev(`/Rows \\d/.test(document.getElementById('status').textContent) && document.getElementById('loader').hidden`)); i++) await sleep(100);
    await sleep(800);
    await ev(HELPERS);

    //  (Stations:  a new file lands on the Dashboard.   The audit is about the Sheet:  click its tab.)
    const sheetTab = await ev(`(() => { const t = document.getElementById('tab-sheet'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (sheetTab) { await clickAt(sheetTab.x, sheetTab.y); await sleep(600); }

    // Scroll so the sheet is in view, then click a cell in the RIGHT part of the sheet (where the drawer will land)
    await ev(`document.getElementById('output').scrollIntoView({ block: 'center' })`); await sleep(400);
    const pick = await ev(`(() => { const drawerLeft = innerWidth - Math.min(420, innerWidth); const box = document.getElementById('output').getBoundingClientRect();
        const line = [...document.querySelectorAll('#rows > [data-index]')].find(l => { const r = l.getBoundingClientRect(); return r.top > box.top + 60 && r.bottom < box.bottom - 10; });
        const right = Math.min(box.right, innerWidth) - 4;
        const seen = [...line.querySelectorAll('.cell')].map(c => { const r = c.getBoundingClientRect(); const l = Math.max(r.left, box.left + 60), rr = Math.min(r.right, right); return { c, r, mid: (l + rr) / 2, w: rr - l }; }).filter(o => o.w > 20);
        const o = seen.filter(o => o.mid > drawerLeft + 10).pop() || seen.pop();
        o.c.dataset.auditPicked = '1'; return { x: o.mid, y: o.r.top + o.r.height / 2, drawerLeft: drawerLeft, boxRight: Math.round(box.right), text: o.c.textContent.slice(0, 40) }; })()`);
    const focusBefore = await ev(`document.activeElement.id || document.activeElement.tagName`);
    await clickAt(pick.x, pick.y);
    await ev(`document.getElementById('aimRow').getAnimations().forEach(a => a.finish())`);

    say('== WHAT YOU CLICKED vs THE DRAWER');
    const cov = await ev(`(() => { const c = document.querySelector('[data-audit-picked]'); const d = document.getElementById('aimRow').getBoundingClientRect(); if (!c) return 'cell gone (rebuilt)'; const r = c.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { cellLeft: Math.round(r.left), cellRight: Math.round(r.right), drawerLeft: Math.round(d.left), coveredByDrawer: document.getElementById('aimRow').contains(hit) }; })()`);
    say('clicked "' + pick.text + '": ' + JSON.stringify(cov));

    say('== KEYBOARD');
    say('focus before the click: ' + focusBefore + ';  after the drawer opens: ' + await ev(`(document.activeElement.id || document.activeElement.className || document.activeElement.tagName)`));
    let tabs = [];
    for (let i = 0; i < 4; i++) { await key('Tab', 'Tab', 9); tabs.push(await ev(`(document.activeElement.id || document.activeElement.className || document.activeElement.tagName) + (document.getElementById('aimRow').contains(document.activeElement) ? ' [in drawer]' : '')`)); }
    say('Tab x4 after opening: ' + tabs.join('  ->  '));

    say('== CLICK TARGETS (WCAG 2.2 minimum 24x24;  44x44 is comfortable)');
    const targets = await ev(`[['× close', '#aimRowClose'], ['Details ▾ (snap menu)', '#aimRowBtn'], ['Row # box', '#jumpInput'], ['Go to row', '#jumpBtn'], ['◀', '#aimPrev'], ['▶', '#aimNext']].map(([n, s]) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return n + ': ' + Math.round(r.width) + 'x' + Math.round(r.height); })`);
    targets.forEach(say);

    for (const theme of ['neo-neutral', 'neo-dark']) {
        await ev(`setTheme(THEMES.find(t => t.id === '${theme}') || '${theme}')`).catch(() => ev(`document.documentElement.dataset.theme = '${theme}'`));
        await sleep(500);
        say('== CONTRAST, ' + theme + '  (WCAG AA: 4.5 for normal text, 3 for 18px+ or 14px bold+)');
        const res = await ev(`[['drawer title (Row 12 · 44 columns)', '#aimRowTitle'], ['focus card: column name (small caps)', '#aimFocusName'], ['focus card: full text', '#aimFocusText'],
            ['"VIEWING ROW VERTICALLY"', '#aimRow .row-sub'], ['row list: column name', '#aimRowList .row-name'], ['row list: value', '#aimRowList .row-value:not(.row-target)'],
            ['row list: the clicked value (dark square)', '#aimRowList .row-target'], ['Go to row button (bar at 75% opacity)', '#jumpBtn'], ['Row # box text', '#jumpInput']]
          .map(([n, s]) => { const e = document.querySelector(s); if (!e) return n + ': (not found)'; const c = __audit.contrast(e); const big = c.size >= 18 || (c.size >= 14 && c.weight >= 700);
            const need = big ? 3 : 4.5; return (c.ratio >= need ? 'ok   ' : 'LOW  ') + n + ': ' + c.ratio.toFixed(2) + ' (' + c.size + 'px ' + c.weight + ', needs ' + need + ')'; })`);
        res.forEach(say);
        const ph = await ev(`(() => { const e = document.getElementById('jumpInput'); const c = __audit.contrast(e, getComputedStyle(e, '::placeholder').color); return c.ratio.toFixed(2); })()`);
        say('     "Row #" placeholder: ' + ph + ' (placeholder hints: 4.5 is the bar too)');
        await shot('audit-' + theme);
    }

    say('== READING A TICKET');
    const fields = await ev(`(() => { const v = [...document.querySelectorAll('#aimRowList .row-value')]; const empty = v.filter(x => x.textContent.trim() === '').length;
        const list = document.getElementById('aimRowList'); return { fields: v.length, empty: empty, listHeight: list.clientHeight, contentHeight: list.scrollHeight,
        title: document.getElementById('aimRowTitle').textContent, firstFields: [...document.querySelectorAll('#aimRowList .row-name')].slice(0, 6).map(n => n.textContent) }; })()`);
    say(JSON.stringify(fields));

    const tog = await ev(`(() => { const b = document.querySelector('#aimRowList .row-empties'); if (!b) return 'no toggle'; const r = b.getBoundingClientRect(); return { label: b.textContent, w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    say('empty-fields toggle: ' + JSON.stringify(tog));
    if (tog.label) {
        await ev(`document.querySelector('#aimRowList .row-empties').scrollIntoView({ block: 'center' })`); await sleep(200);
        const t = await ev(`(() => { const r = document.querySelector('#aimRowList .row-empties').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        await clickAt(t.x, t.y);
        say('after clicking it: ' + JSON.stringify(await ev(`({ label: document.querySelector('#aimRowList .row-empties').textContent, shown: [...document.querySelectorAll('#aimRowList .row-value')].filter(v => v.offsetParent !== null).length })`)));
        await clickAt(t.x, t.y);
    }

    // With a search on (so the snap menu's Details button is live), scroll down, click a cell, Escape:  does the page jump?
    await ev(`window.scrollTo(0, 0)`); await sleep(200);
    const si = await ev(`(() => { const r = document.getElementById('searchInput').getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; })()`);
    await key('Escape', 'Escape', 27);
    await clickAt(si.x, si.y);
    for (const ch of 'network') { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await sleep(30); }
    for (let i = 0; i < 300 && !(await ev(`document.getElementById('loader').hidden && /\\//.test(document.getElementById('aimCount').textContent)`)); i++) await sleep(100);
    await ev(`document.getElementById('output').scrollIntoView({ block: 'end' })`); await sleep(400);
    const c2 = await ev(`(() => { const box = document.getElementById('output').getBoundingClientRect(); const line = [...document.querySelectorAll('#rows > [data-index]')].find(l => { const r = l.getBoundingClientRect(); return r.top > box.top + 60 && r.bottom < Math.min(box.bottom, innerHeight) - 10; });
        const c = line.querySelector('.cell'); const r = c.getBoundingClientRect(); return { x: Math.max(r.left, box.left + 70) + 20, y: r.top + r.height / 2 }; })()`);
    await clickAt(c2.x, c2.y);
    say('drawer title with a search on: ' + await ev(`document.getElementById('aimRowTitle').textContent`));
    const y0 = await ev(`scrollY`);
    await key('Escape', 'Escape', 27);
    const y1 = await ev(`scrollY`);
    say('Escape: page scroll ' + Math.round(y0) + ' -> ' + Math.round(y1) + (Math.abs(y1 - y0) < 2 ? '  (no jump)' : '  (JUMPED)') + ';  focus now on: ' + await ev(`document.activeElement.id || document.activeElement.tagName`));
} catch (e) { say('AUDIT ERROR ' + e.message); }
finally { writeFileSync(`${OUT}/audit.txt`, lines.join('\n')); try { execSync(`taskkill /PID ${edge.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { } process.exit(0); }
