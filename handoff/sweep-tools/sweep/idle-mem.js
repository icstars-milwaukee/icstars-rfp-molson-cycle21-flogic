// Section 3: idle CPU, memory, and what code start-up really uses.   node idle-mem.js [tag]
const H = require('./staffhelp');
const { click, sleep, path, note, fs } = H;
const { execFileSync } = require('child_process');
const TAG = process.argv[2] || 'base';
const res = {};

// CPU seconds used by OUR processes, and their memory, right now.
function snap() {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "$ids = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'sweep-*.exe' -or ($_.Name -eq 'msedgewebview2.exe' -and $_.CommandLine -match 'webview-exe-name=sweep') } | ForEach-Object { $_.ProcessId }); $p = Get-Process -Id $ids -ErrorAction SilentlyContinue; \"$([math]::Round(($p | Measure-Object -Property TotalProcessorTime.TotalMilliseconds -Sum).Sum))|$([math]::Round(($p | Measure-Object WorkingSet64 -Sum).Sum/1MB))|$([math]::Round(($p | Measure-Object PrivateMemorySize64 -Sum).Sum/1MB))|$($p.Count)\""]).toString().trim().split('|').map(Number);
    return { cpuMs: out[0], workingSetMB: out[1], privateMB: out[2], procs: out[3] };
}
async function idle(name, seconds) {
    const a = snap(); const t0 = Date.now();
    await sleep(seconds * 1000);
    const b = snap(); const wall = Date.now() - t0;
    const pct = +(100 * (b.cpuMs - a.cpuMs) / wall).toFixed(2);          // percent of ONE core
    note('IDLE  ' + name + ': ' + (b.cpuMs - a.cpuMs) + ' ms of CPU in ' + Math.round(wall / 1000) + ' s = ' + pct + '% of one core (' + (pct / 8).toFixed(2) + '% of this 8-thread CPU)');
    res['idle ' + name] = { cpuMs: b.cpuMs - a.cpuMs, seconds: Math.round(wall / 1000), pctOfOneCore: pct };
}
function mem(name) { const s = snap(); note('MEM   ' + name + ': working set ' + s.workingSetMB + ' MB, private ' + s.privateMB + ' MB (' + s.procs + ' processes)'); res['mem ' + name] = s; }

(async () => {
    note('==== idle, memory, coverage: staff (' + TAG + ') ====');
    let app = await H.startApp('staff'); let page = app.page;
    await sleep(3000);
    mem('at start (sign-in card up)');
    // timers alive while idle?
    const timers = await page.evaluate(() => new Promise((done) => { let n = 0; const raf = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(raf); else done(n); }; const t0 = performance.now(); requestAnimationFrame(raf); }));
    await idle('not signed in (card up)', 60);
    await H.pin(page, '4827');
    await sleep(1500);
    mem('signed in, no file');
    await H.openTimed(app, path.join(H.ROOT, '..', 'demo', 'data', 'big_warehouse.sql'), '40 MB');
    await sleep(4000);
    mem('after the 40 MB file (535,500 rows), on the dashboard');
    await idle('signed in, 40 MB file open', 60);
    await click(page, '#vaultChip'); await sleep(1000);
    mem('right after Lock');
    await sleep(60000);
    mem('60 s after Lock');
    await H.pin(page, '4827'); await sleep(1500);
    mem('signed in again, no file');
    await app.close();

    // what start-up really uses
    app = await H.startApp('staff'); page = app.page;
    await sleep(800);
    await page.coverage.startJSCoverage({ resetOnNavigation: true });
    await page.coverage.startCSSCoverage({ resetOnNavigation: true });
    await page.reload(); await page.waitForLoadState('load'); await sleep(1500);
    const js = await page.coverage.stopJSCoverage(), css = await page.coverage.stopCSSCoverage();
    const used = (e) => { let u = 0; if (e.functions) { const marks = new Uint8Array(e.source.length); for (const f of e.functions) for (const r of f.ranges) marks.fill(r.count > 0 ? 1 : 2, r.startOffset, r.endOffset); for (const m of marks) if (m === 1) u++; } else for (const r of e.ranges) u += r.end - r.start; return u; };
    const rows = js.concat(css).map((e) => ({ file: e.url.split('/').pop(), kb: +(((e.source || e.text) || '').length / 1024).toFixed(0), usedKb: +(used(e) / 1024).toFixed(0) })).filter((r) => r.kb > 0).sort((a, b) => (b.kb - b.usedKb) - (a.kb - a.usedKb));
    for (const r of rows) note('COVER ' + r.file.padEnd(18) + String(r.kb).padStart(5) + ' KB, ' + String(r.usedKb).padStart(4) + ' KB run by the time the card is up (' + Math.round(100 * r.usedKb / r.kb) + '%)');
    res.coverage = rows;
    // how long the scripts take to run at load
    const cdp = await page.context().newCDPSession(page);
    const ev = []; cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) ev.push(e); });
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8.execute', transferMode: 'ReportEvents' });
    await page.reload(); await page.waitForLoadState('load'); await sleep(1200);
    const ended = new Promise((r) => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); await ended;
    const per = {};
    for (const e of ev) if (e.ph === 'X' && (e.name === 'EvaluateScript' || e.name === 'v8.compile') && e.args && e.args.data && e.args.data.url) { const f = e.args.data.url.split('/').pop(); per[f] = per[f] || { compile: 0, run: 0 }; per[f][e.name === 'EvaluateScript' ? 'run' : 'compile'] += e.dur / 1000; }
    const list = Object.keys(per).map((f) => ({ file: f, runMs: +per[f].run.toFixed(1), compileMs: +per[f].compile.toFixed(1) })).sort((a, b) => b.runMs - a.runMs);
    note('SCRIPTS at load (ms to run, of which compile): ' + list.map((l) => l.file + ' ' + l.runMs + ' (' + l.compileMs + ')').join(', ') + '   TOTAL ' + list.reduce((a, l) => a + l.runMs, 0).toFixed(0) + ' ms');
    res.scripts = list; res.rafIn2s = timers;
    fs.writeFileSync(path.join(H.ROOT, 'out', 'idle-mem-' + TAG + '.json'), JSON.stringify(res, null, 1));
    await app.close();

    // the IT app, idle
    const D = require('./deskhelp');
    const it = await D.startApp('it'); await sleep(3000);
    mem('IT app at start');
    await idle('IT app, start screen', 30);
    await it.close();
    fs.writeFileSync(path.join(H.ROOT, 'out', 'idle-mem-' + TAG + '.json'), JSON.stringify(res, null, 1));
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
