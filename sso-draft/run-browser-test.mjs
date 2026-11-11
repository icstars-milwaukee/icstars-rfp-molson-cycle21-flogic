/*
    ==========================================================

        run-browser-test.mjs   -   runs  signin-test.html  in a headless Chrome  (or Edge),  as  file://

            node sso-draft/run-browser-test.mjs

        Prints every check,  then  "N / M passed".   Exit code 0 only if every check passed
        and the page threw no errors.

        Why a flag:  --allow-file-access-from-files  lets the TEST page read the demo set
        (../demo-data/packs/)  and drive the draft pages in a frame.   The pages themselves never read
        anything you didn't pick.

        Nothing to install:  Node 22+  (it has WebSocket and fetch built in)  and Chrome or Edge.

    ==========================================================
*/

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(path.join(here, process.argv[2] || 'signin-test.html')).href;
const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) || 180000;

const browsers = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const browser = browsers.find(function (b) { return fs.existsSync(b); });
if (!browser) { console.error('No Chrome or Edge found.  Set CHROME_PATH.'); process.exit(2); }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'flogic-signin-test-'));
const proc = spawn(browser, [
    '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--allow-file-access-from-files', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    'about:blank',
], { stdio: 'ignore' });

function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function finish(code) {
    try { proc.kill(); } catch (e) { /* already gone */ }
    setTimeout(function () {
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Windows may still hold it */ }
        process.exit(code);
    }, 500);
}

async function main() {
    //  Chrome writes its port into the profile folder.
    let port = null;
    for (let i = 0; i < 100 && !port; i++) {
        await wait(100);
        try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch (e) { /* not yet */ }
    }
    if (!port) throw new Error('Chrome didn\'t start.');

    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const tab = targets.find(function (t) { return t.type === 'page'; });
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(function (r, j) { ws.onopen = r; ws.onerror = j; });

    let nextId = 1;
    const waiting = new Map();
    const pageErrors = [];
    ws.onmessage = function (m) {
        const msg = JSON.parse(m.data);
        if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); return; }
        if (msg.method === 'Runtime.exceptionThrown') {
            const d = msg.params.exceptionDetails;
            pageErrors.push((d.exception && d.exception.description) || d.text);
        }
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
            pageErrors.push('console.error: ' + msg.params.args.map(function (a) { return a.value || a.description; }).join(' '));
        }
    };
    function send(method, params) {
        const id = nextId++;
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
        return new Promise(function (r) { waiting.set(id, r); });
    }
    async function evaluate(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result && r.result.result ? r.result.result.value : undefined;
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: page });

    const start = Date.now();
    let done = false;
    while (!done && Date.now() - start < TIMEOUT_MS) {
        await wait(250);
        done = await evaluate('window.__done === true');
    }
    if (!done) pageErrors.push('The tests didn\'t finish in ' + (TIMEOUT_MS / 1000) + ' s. Results so far are above.');

    const results = JSON.parse(await evaluate('JSON.stringify(window.__results)'));
    let passed = 0;
    for (const r of results) {
        if (r.ok) passed++;
        console.log((r.ok ? '  ok    ' : '  FAIL  ') + r.name + (r.ok || !r.detail ? '' : '   (' + r.detail + ')'));
    }
    for (const e of pageErrors) console.log('  PAGE ERROR  ' + e);
    console.log('\n' + passed + ' / ' + results.length + ' passed' + (pageErrors.length ? ',  ' + pageErrors.length + ' page error(s)' : '') +
                '   (' + ((Date.now() - start) / 1000).toFixed(1) + ' s)');
    ws.close();
    finish(passed === results.length && pageErrors.length === 0 ? 0 : 1);
}

main().catch(function (e) { console.error(e.message || e); finish(2); });
