// Open an xlsx in the REAL page (headless Edge, the page's own file input), and print what the sheet shows.
//   node xcheck.mjs <page path> <xlsx path> <profile dir>
import { spawn, execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const [, , PAGE, FILE, PROFILE] = process.argv;
const PORT = 9600 + Math.floor(Math.random() * 200);
rmSync(PROFILE, { recursive: true, force: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu',
    '--allow-file-access-from-files', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const waiting = new Map(); const errors = [];
try {
    for (let i = 0; i < 50 && !ws; i++) {
        try { const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page');
              if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); } } catch (e) { }
        if (!ws) await sleep(200);
    }
    ws.onmessage = m => { const x = JSON.parse(m.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); }
                          if (x.method === 'Runtime.exceptionThrown') errors.push(x.params.exceptionDetails.exception?.description); };
    const send = (method, params = {}) => new Promise(r => { const my = ++id; waiting.set(my, x => r(x.result)); ws.send(JSON.stringify({ id: my, method, params })); });
    const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.value;
    await send('Runtime.enable');
    await send('Page.navigate', { url: 'file:///' + PAGE });
    for (let i = 0; i < 100 && !(await ev(`document.readyState === 'complete'`)); i++) await sleep(100);
    await sleep(500);
    await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => /plain file without signing in/.test(b.textContent) && b.offsetParent); if (b) b.click(); })()`);
    await sleep(300);
    const doc = await send('DOM.getDocument');
    const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp.nodeId, files: [FILE] });
    for (let i = 0; i < 100 && !(await ev(`/Rows \\d/.test(document.getElementById('status').textContent)`)); i++) await sleep(100);
    await sleep(600);
    const rows = await ev(`[...document.querySelectorAll('#rows > [data-index]')].map(l => [...l.querySelectorAll('.cell')].map(c => c.textContent).filter(t => t !== '').join(' | '))`);
    console.log(rows.join('\n'));
    console.log('csvCell("-5") on this page = ' + await ev(`csvCell('-5')`));
    console.log('page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} finally {
    try { execSync(`taskkill /PID ${edge.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { }
    process.exit(0);
}
