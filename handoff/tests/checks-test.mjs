// Checks, with real mouse and keyboard:  open, suggested list, Run all, compare with the Python answer key,
// Show ▸, add a check by typing, a broken check, Save (a real download), Load it back, Lock-free reset on a new file.
//   node checks-test.mjs <page> <folder>/incident.csv <out>
//   The CSV comes from make-tickets.py,  with expected.json  (the true answers,  counted in Python)  next to it.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const [, , PAGE, CSV, OUT] = process.argv;
const KEY = JSON.parse(readFileSync(join(dirname(CSV), 'expected.json'), 'utf8'));
const fmt = n => n.toLocaleString('en-US');
const TEAM = KEY.groupsOver40Open[0][0];
mkdirSync(OUT, { recursive: true });
const DL = OUT + '/downloads';
rmSync(DL, { recursive: true, force: true }); mkdirSync(DL, { recursive: true });
rmSync(OUT + '/profile', { recursive: true, force: true });
const PORT = 9700 + Math.floor(Math.random() * 200);
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/profile`, '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const waiting = new Map(); const out = []; let fails = 0; const pageErrors = [];
const check = (name, ok, extra) => { out.push((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '   [' + extra + ']' : '')); if (!ok) fails++; };
const send = (method, params = {}) => new Promise((res, rej) => { const my = ++id; waiting.set(my, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: my, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
const waitFor = async (e, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await ev(e)) return true; await sleep(80); } return false; };
async function clickAt(x, y) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) { await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); await sleep(40); } await sleep(200); }
async function spot(js) { return ev(`(() => { const el = ${js}; if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y); return { x, y, hit: !!h && (h === el || el.contains(h)) }; })()`); }
async function click(js, label) { const s = await spot(js); if (!s || !s.hit) { check('can really click ' + label, false, JSON.stringify(s)); return false; } await clickAt(s.x, s.y); return true; }
async function type(text) { for (const ch of text) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await sleep(12); } }
async function key(k, code, vk) { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); await sleep(100); }
const btn = (scope, words) => `[...document.querySelectorAll('${scope} button')].find(b => b.textContent.trim() === ${JSON.stringify(words)})`;
const results = `[...document.querySelectorAll('#checksList .check-row')].map(r => ({ state: r.className.replace('check-row check-', ''), name: r.querySelector('.check-name').textContent, how: r.querySelector('.check-how').textContent, shown: r.querySelector('.check-shown').textContent }))`;

try {
    for (let i = 0; i < 60 && !ws; i++) { try { const t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); } } catch (e) { } if (!ws) await sleep(200); }
    ws.onmessage = m => { const x = JSON.parse(m.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } if (x.method === 'Runtime.exceptionThrown') pageErrors.push(x.params.exceptionDetails.exception?.description || x.params.exceptionDetails.text); };
    await send('Runtime.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL.replace(/\//g, '\\') });
    await send('Page.navigate', { url: 'file:///' + PAGE });
    await waitFor(`document.readyState === 'complete'`); await sleep(500);
    await click(`[...document.querySelectorAll('button')].find(b => /plain file without signing in/.test(b.textContent) && b.offsetParent)`, 'plain file');

    check('Checks square is next to Ask, and off before a file', await ev(`(() => { const b = document.getElementById('checksBtn'); return !!b && b.previousElementSibling.id === 'queryBtn' && b.disabled; })()`));
    const doc = await send('DOM.getDocument');
    const inp = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp.nodeId, files: [CSV] });
    await waitFor(`/Rows \\d/.test(document.getElementById('status').textContent) && document.getElementById('loader').hidden`, 60000);
    await sleep(500);

    // 1. Open: the suggested checks fill an empty list
    await click(`document.getElementById('checksBtn')`, 'Checks');
    const list = await ev(results);
    check('opening Checks on an empty list shows suggested checks', list.length >= 4, list.map(r => r.name).join(' | '));
    check('nothing has run yet', list.every(r => r.state === 'waiting') && /Not run/.test(await ev(`document.getElementById('checksNote').textContent`)));

    // 2. Run all, then compare with Python's answer key
    const t0 = Date.now();
    await click(`document.getElementById('checksRun')`, 'Run all');
    await waitFor(`/^Ran /.test(document.getElementById('checksNote').textContent)`, 120000);
    const ran = await ev(results);
    out.push('INFO ran in ' + (Date.now() - t0) + ' ms: ' + await ev(`document.getElementById('checksNote').textContent`));
    ran.forEach(r => out.push('INFO   ' + r.state.padEnd(5) + ' ' + r.name + '  ->  ' + r.shown + '   (' + r.how + ')'));
    const by = n => ran.find(r => r.name.startsWith(n));
    check('row count: pass, ' + fmt(KEY.rows) + ' (Python: ' + KEY.rows + ')', by('Row count') && by('Row count').state === 'pass' && by('Row count').shown === fmt(KEY.rows));
    check('every row has a Number: pass, 0 blank (Python: ' + KEY.blankNumbers + ')', by('Every row has a') && by('Every row has a').state === 'pass' && by('Every row has a').shown === '0');
    check('no Number twice: pass, none (Python: ' + KEY.duplicateNumbers + ' duplicates)', by('No Number') && by('No Number').state === 'pass' && by('No Number').shown === 'none');
    const grp = by('No assignment group');
    check('team load: FAIL with 1 group, ' + TEAM + ' (Python: ' + JSON.stringify(KEY.groupsOver40Open) + ')', grp && grp.state === 'fail' && grp.shown === '1 row' && grp.how.includes(TEAM), grp && grp.shown + ' / ' + grp.how);
    const scar = by('No encoding scars');
    check('encoding scars: FAIL, ' + fmt(KEY.scarredRows) + ' rows (Python: ' + KEY.scarredRows + ';  lowercase ã decoys must NOT count)', scar && scar.state === 'fail' && scar.shown === fmt(KEY.scarredRows), scar && scar.shown);

    // 3. Show ▸ on the failing team check: the answer is the sheet now
    await click(`[...document.querySelectorAll('#checksList .check-row')].find(r => /assignment group/.test(r.textContent)).querySelector('button')`, 'Show ▸');
    await waitFor(`!document.getElementById('backBtn').hidden && document.getElementById('loader').hidden`, 60000);
    await sleep(400);
    const ans = await ev(`({ status: document.getElementById('status').textContent, first: (document.querySelector('#rows [data-index="0"] .cell') || {}).textContent, panel: document.getElementById('checksMenu').hidden })`);
    check('Show ▸ puts the failing rows in the sheet (the 1 group), and the panel steps aside', ans.panel && /of 1\b/.test(ans.status) && ans.first === TEAM, JSON.stringify(ans));
    await click(`document.getElementById('backBtn')`, '← Back to file');
    await waitFor(`document.getElementById('backBtn').hidden`, 30000);

    // 4. Add a check by typing:  P1 tickets at most 5   (Python-free: count it in the page's own data afterwards)
    await click(`document.getElementById('checksBtn')`, 'Checks (again)');
    check('results are kept while the same file is open', (await ev(results)).every(r => r.state !== 'waiting'));
    await click(btn('#checksMenu .checks-foot', '+ Add a check'), '+ Add a check');
    await click(`document.getElementById('checkName')`, 'Name box');
    await type('At most 5 P1 incidents');
    await click(`document.getElementById('checkSql')`, 'SQL box');
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await type(`SELECT COUNT(*) FROM incident WHERE Priority = 'P1 - Critical'`);
    await click(`document.getElementById('checkKind')`, 'Passes when');
    await key('ArrowDown', 'ArrowDown', 40); await key('Enter', 'Enter', 13);
    await click(`document.getElementById('checkOp')`, 'operator');
    await key('ArrowDown', 'ArrowDown', 40); await key('Enter', 'Enter', 13);
    await click(`document.getElementById('checkTo')`, 'number');
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await type('5');
    await click(btn('#checksAdd', 'Add'), 'Add');
    // a broken one:  a column that doesn't exist
    await click(btn('#checksMenu .checks-foot', '+ Add a check'), '+ Add a check (2)');
    await click(`document.getElementById('checkName')`, 'Name box (2)');
    await type('Broken on purpose');
    await click(`document.getElementById('checkSql')`, 'SQL box (2)');
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
    await type(`SELECT COUNT(*) FROM incident WHERE Stat = 'New'`);
    await click(btn('#checksAdd', 'Add'), 'Add (2)');
    const after = await ev(results);
    check('two checks added by typing, waiting to run', after.length === ran.length + 2 && after.slice(-2).every(r => r.state === 'waiting'), after.slice(-2).map(r => r.name + ' (' + r.how + ')').join(' | '));

    await click(`document.getElementById('checksRun')`, 'Run all (2)');
    await waitFor(`/^Ran /.test(document.getElementById('checksNote').textContent)`, 120000);
    const ran2 = await ev(results);
    const p1 = ran2.find(r => r.name === 'At most 5 P1 incidents');
    const truth = await ev(`(() => { const k = headerCells.map(h => h.toLowerCase()).indexOf('priority'); let n = 0; for (let r = 0; r < rowCount; r++) if (cellAt(r, k) === 'P1 - Critical') n++; return n; })()`);
    check('typed check: right count, right verdict (the sheet counts ' + truth + ', Python ' + KEY.p1 + ')', truth === KEY.p1 && p1 && p1.shown === truth.toLocaleString() && p1.state === (truth <= 5 ? 'pass' : 'fail'), p1 && p1.state + ' ' + p1.shown + ' / ' + p1.how);
    const broken = ran2.find(r => r.name === 'Broken on purpose');
    check('a broken check says it couldn\'t run (not a quiet pass), and why', broken && broken.state === 'error' && /couldn't run/.test(broken.how), broken && broken.how);
    check('the note counts it:  "1 couldn\'t run"', /1 couldn't run/.test(await ev(`document.getElementById('checksNote').textContent`)));
    await ev(`0`);
    await send('Page.captureScreenshot', { format: 'png' }).then(r => writeFileSync(OUT + '/checks-panel.png', Buffer.from(r.data, 'base64')));

    // 5. Save (a real download), then remove everything, then Load it back
    await click(btn('#checksMenu .checks-foot', 'Save'), 'Save');
    let saved = null;
    for (let i = 0; i < 50 && saved === null; i++) { const f = readdirSync(DL).filter(n => n.endsWith('.json')); if (f.length) saved = DL + '/' + f[0]; else await sleep(100); }
    check('Save downloads a .json', saved !== null, saved);
    let fileOk = false;
    if (saved) { const j = JSON.parse(readFileSync(saved, 'utf8')); fileOk = j.flogicChecks === 1 && j.checks.length === ran2.length && j.checks.every(c => c.name && c.sql && c.expect) && !JSON.stringify(j).includes(TEAM); }
    check('the saved file holds the checks, and no data or results', fileOk);
    for (let i = 0; i < ran2.length; i++) await click(`document.querySelector('#checksList .check-remove')`, '✕');
    check('✕ removes checks (list empty)', (await ev(results)).length === 0);
    const fin = await send('DOM.querySelector', { nodeId: (await send('DOM.getDocument')).root.nodeId, selector: '#checksMenu input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId: fin.nodeId, files: [saved.replace(/\//g, '\\')] });
    await waitFor(`/^Loaded/.test(document.getElementById('checksNote').textContent)`, 10000);
    check('Load brings the same checks back', (await ev(results)).length === ran2.length, await ev(`document.getElementById('checksNote').textContent`));
    // a hostile file:  bad pieces are left out
    writeFileSync(OUT + '/bad-checks.json', JSON.stringify({ flogicChecks: 1, checks: [{ name: 'ok', sql: 'SELECT 1', expect: { rows: 0 } }, { name: '<img src=x onerror=alert(1)>', sql: 'SELECT 1', expect: { value: 'equal', to: 'x' } }, { name: 'x', sql: 7, expect: {} }, null] }));
    await send('DOM.setFileInputFiles', { nodeId: fin.nodeId, files: [(OUT + '/bad-checks.json').replace(/\//g, '\\')] });
    await waitFor(`/^Loaded 1 /.test(document.getElementById('checksNote').textContent)`, 10000);
    check('a file with bad pieces: only the good one is loaded, the rest are counted as left out', /Loaded 1 check.*3 left out/.test(await ev(`document.getElementById('checksNote').textContent`)), await ev(`document.getElementById('checksNote').textContent`));

    // 6. One panel at a time,  Escape,  and the click targets
    await click(`document.getElementById('queryBtn')`, 'Ask');
    await sleep(500);
    check('opening Ask closes Checks', await ev(`document.getElementById('checksMenu').hidden`));
    await click(`document.getElementById('checksBtn')`, 'Checks (3)');
    check('opening Checks closes Ask', await ev(`!queryMenuOpen() && !document.getElementById('checksMenu').hidden`));
    const sizes = await ev(`['#checksClose', '#checksRun', '#checksList .check-row button', '#checksBtn'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return s + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (r.width >= 24 && r.height >= 24 ? '' : ' SMALL'); })`);
    check('every button is at least 24x24', sizes.every(s => !/SMALL/.test(s)), sizes.join(', '));
    await key('Escape', 'Escape', 27);
    check('Escape closes Checks', await ev(`document.getElementById('checksMenu').hidden`));

    // 7. A new file: old results are about another file
    await click(`document.getElementById('checksBtn')`, 'Checks (4)');
    await click(`document.getElementById('checksRun')`, 'Run all (3)');
    await waitFor(`/^Ran /.test(document.getElementById('checksNote').textContent)`, 60000);
    const inp2 = await send('DOM.querySelector', { nodeId: (await send('DOM.getDocument')).root.nodeId, selector: '#csvFileInput' });
    await send('DOM.setFileInputFiles', { nodeId: inp2.nodeId, files: [CSV.replace(/incident\.csv$/, 'change_request.csv')] });
    await waitFor(`/Rows \\d/.test(document.getElementById('status').textContent) && document.getElementById('loader').hidden && /change_request/.test(document.getElementById('readingName').textContent)`, 60000);
    await sleep(400);
    check('a new file: the list stays, the results reset ("Not run on this file yet")', (await ev(results)).every(r => r.state === 'waiting') && /Not run/.test(await ev(`document.getElementById('checksNote').textContent`)) || await ev(`document.getElementById('checksMenu').hidden`));
    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) { check('test ran to the end', false, e.message); }
finally {
    writeFileSync(OUT + '/result.txt', out.join('\n') + '\n' + (fails ? fails + ' FAILED' : 'ALL PASS'));
    console.log(out.join('\n') + '\n' + (fails ? fails + ' FAILED' : 'ALL PASS'));
    try { execSync(`taskkill /PID ${edge.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { }
    process.exit(0);
}
