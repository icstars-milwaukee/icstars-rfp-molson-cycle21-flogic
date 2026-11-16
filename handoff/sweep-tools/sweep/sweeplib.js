// The sweep's harness: drive the REAL desktop window (a sweep build, over its DevTools port) or Edge, with real input,
// and measure frames, long tasks and loads.
const L = require('../demo/lib');
const { chromium, sleep, fs, path } = L;
const { spawn, execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const REPO = path.resolve(__dirname, '..', '..', '..').replace(/\\/g, '/');
const EXE = { staff: path.join(REPO, 'desktop/target/shared/sweep-staff.exe'), it: path.join(REPO, 'desktop/target/shared/sweep-it.exe') };
const PAGES = { staff: pathToFileURL(path.join(REPO, 'DataPage/flogic.html')).href, it: pathToFileURL(path.join(REPO, 'it-console/it-console.html')).href };
const DATA = path.join(ROOT, 'data');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const LOG = path.join(ROOT, 'sweep.log');
function note(s) { console.log(s); fs.appendFileSync(LOG, s + '\n'); }

// ---- the desktop app ----
// Start a sweep build and connect.  -> { page, browser, pid, startedAt, close() }
async function startApp(which, opts) {
    opts = opts || {};
    const port = opts.port || (which === 'it' ? 9335 : 9334);
    const env = Object.assign({}, process.env, { FLOGIC_SWEEP_PORT: String(port) });
    const startedAt = Date.now();
    const child = spawn(EXE[which], [], { env, detached: false, stdio: 'ignore' });
    let browser = null;
    for (let i = 0; i < 100 && !browser; i++) {
        try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); } catch (e) { await sleep(100); }
    }
    if (!browser) { try { child.kill(); } catch (e) {} throw new Error('could not connect to the app on port ' + port); }
    let page = null;
    for (let i = 0; i < 150 && !page; i++) {
        for (const c of browser.contexts()) for (const p of c.pages()) if (/tauri\.localhost/.test(p.url())) page = p;
        if (!page) await sleep(100);
    }
    if (!page) throw new Error('no tauri.localhost page');
    L.watch(page, which + '-app');
    await page.waitForLoadState('load');
    return {
        page, browser, pid: child.pid, startedAt, which,
        close: async function () {
            try { await browser.close(); } catch (e) {}
            stopApp(child.pid);
            await sleep(600);
        },
    };
}

// Stop ONLY what we started: that process, and the WebView2 processes that belong to it.
function stopApp(pid) {
    try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
}
function flogicProcs() {
    try {
        const out = execFileSync('powershell.exe', ['-NoProfile', '-Command',
            "Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'sweep-*.exe' -or $_.Name -like 'flogic*.exe' -or ($_.Name -eq 'msedgewebview2.exe' -and $_.CommandLine -match 'webview-exe-name=(sweep|flogic|Flogic)') } | ForEach-Object { \"$($_.ProcessId)|$($_.Name)|$([math]::Round($_.WorkingSetSize/1MB,1))\" }"]).toString();
        return out.trim().split(/\r?\n/).filter(Boolean).map((l) => { const [pid, name, mb] = l.split('|'); return { pid: Number(pid), name, mb: Number(mb) }; });
    } catch (e) { return []; }
}

// ---- measuring ----
// Frames + long tasks, recorded in the page while an interaction runs.
async function startRec(page) {
    await page.evaluate(() => {
        const r = window.__rec = { frames: [], long: [], on: true, t0: performance.now() };
        let last = performance.now();
        function tick(t) { if (!r.on) return; r.frames.push(t - last); last = t; requestAnimationFrame(tick); }
        requestAnimationFrame((t) => { last = t; requestAnimationFrame(tick); });
        try { r.obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) r.long.push(Math.round(e.duration)); }); r.obs.observe({ entryTypes: ['longtask'] }); } catch (e) {}
    });
}
async function stopRec(page) {
    return page.evaluate(() => {
        const r = window.__rec; r.on = false; try { r.obs.disconnect(); } catch (e) {}
        const f = r.frames.slice(1).sort((a, b) => a - b);
        const n = f.length;
        const q = (p) => n ? f[Math.min(n - 1, Math.floor(p * n))] : 0;
        const over = f.filter((x) => x > 17.5).length;                 // 16.7 ms + timer slack
        return { frames: n, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(f[n - 1] || 0).toFixed(1),
                 overPct: n ? +(100 * over / n).toFixed(1) : 0, over33: f.filter((x) => x > 33.4).length,
                 longTasks: r.long.length, longMax: r.long.length ? Math.max.apply(null, r.long) : 0, ms: Math.round(performance.now() - r.t0) };
    });
}
// Run an interaction 3 times, report the median run (by p95).
async function measure(page, name, work, opts) {
    opts = opts || {};
    const runs = [];
    for (let i = 0; i < (opts.runs || 3); i++) {
        if (opts.before) await opts.before();
        await sleep(250);
        await startRec(page);
        await work();
        await sleep(opts.settle === undefined ? 300 : opts.settle);
        runs.push(await stopRec(page));
    }
    runs.sort((a, b) => a.p95 - b.p95);
    const m = runs[Math.floor(runs.length / 2)];
    const pass = m.p95 <= 17.5 && m.max <= 34 && m.overPct < 1 && m.longMax <= 50;
    note((pass ? 'OK    ' : 'OVER  ') + name + '  ' + JSON.stringify(m));
    return Object.assign({ name, pass }, m);
}
// A load: from the action until done() says so.  -> ms
async function timeLoad(page, name, action, done, opts) {
    opts = opts || {};
    await startRec(page);
    const t0 = Date.now();
    await action();
    let ok = false;
    while (Date.now() - t0 < (opts.timeout || 120000)) { if (await done()) { ok = true; break; } await sleep(opts.poll || 25); }
    const ms = Date.now() - t0;
    const r = await stopRec(page).catch(() => ({}));
    note('LOAD  ' + name + '  ' + ms + ' ms' + (ok ? '' : ' (TIMED OUT)') + '  longTasks=' + r.longTasks + ' longest=' + r.longMax + ' ms  worstFrame=' + r.max + ' ms');
    return { name, ms, ok, longTasks: r.longTasks, longMax: r.longMax, worstFrame: r.max };
}

module.exports = Object.assign({}, L, { ROOT, REPO, EXE, PAGES, DATA, SHOTS, note, startApp, stopApp, flogicProcs, startRec, stopRec, measure, timeLoad });
