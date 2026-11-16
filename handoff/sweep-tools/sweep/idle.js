// Idle CPU of the app's own processes: 60 s with nothing happening.   node idle.js [tag]
const H = require('./staffhelp');
const { sleep, path, note, fs } = H;
const { execFileSync } = require('child_process');
const TAG = process.argv[2] || 'base';
function cpu() {
    return Number(execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "$ids = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'sweep-*.exe' -or ($_.Name -eq 'msedgewebview2.exe' -and $_.CommandLine -match 'webview-exe-name=sweep') } | ForEach-Object { $_.ProcessId }); $s = 0; foreach ($p in (Get-Process -Id $ids -ErrorAction SilentlyContinue)) { $s += $p.TotalProcessorTime.TotalMilliseconds }; [math]::Round($s)"]).toString().trim());
}
const res = {};
async function idle(name, seconds, page) {
    if (page) await page.evaluate(() => { window.__idleRaf = 0; });
    const a = cpu(), t0 = Date.now();
    await sleep(seconds * 1000);
    const b = cpu(), wall = Date.now() - t0;
    const pct = +(100 * (b - a) / wall).toFixed(2);
    note('IDLE  ' + name + ': ' + (b - a) + ' ms of CPU in ' + Math.round(wall / 1000) + ' s = ' + pct + '% of one core');
    res[name] = { cpuMs: b - a, seconds: Math.round(wall / 1000), pctOfOneCore: pct };
}
(async () => {
    note('==== idle CPU (' + TAG + ') ====');
    let app = await H.startApp('staff'); const page = app.page;
    await sleep(4000);
    await idle('staff, not signed in (card up)', 60);
    await H.pin(page, '4827'); await sleep(1000);
    await H.openTimed(app, path.join(H.ROOT, '..', 'demo', 'data', 'big_warehouse.sql'), '40 MB');
    await sleep(5000);
    await page.mouse.move(5, 300);
    await idle('staff, signed in, 535k-row file open (dashboard)', 60);
    await H.tab(page, 'sheet'); await sleep(2000); await page.mouse.move(5, 300);
    await idle('staff, signed in, on the Sheet', 30);
    await app.close();
    const D = require('./deskhelp');
    app = await D.startApp('it'); await sleep(4000);
    await idle('IT, start screen', 30);
    await app.close();
    fs.writeFileSync(path.join(H.ROOT, 'out', 'idle-' + TAG + '.json'), JSON.stringify(res, null, 1));
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
