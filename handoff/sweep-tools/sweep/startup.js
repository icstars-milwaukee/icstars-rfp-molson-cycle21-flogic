// Start-up: process start -> window visible -> first paint -> first control can be clicked.   And the white flash.
//   node startup.js staff|it [runs] [tag]
const S = require('./sweeplib');
const { sleep, path, note, fs, chromium } = S;
const { execFileSync } = require('child_process');
const which = process.argv[2] || 'staff', RUNS = Number(process.argv[3] || 6), TAG = process.argv[4] || '';
const port = which === 'it' ? 9335 : 9334;

async function one(i) {
    while (S.flogicProcs().length) { for (const p of S.flogicProcs()) S.stopApp(p.pid); await sleep(500); }
    await sleep(1500);
    const raw = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(S.ROOT, 'launch.ps1'), '-Exe', S.EXE[which], '-Port', String(port), '-WatchMs', '3000'], { maxBuffer: 1 << 24 }).toString();
    const L = JSON.parse(raw.trim().split(/\r?\n/).pop());
    let browser = null;
    for (let k = 0; k < 60 && !browser; k++) { try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); } catch (e) { await sleep(100); } }
    let page = null;
    for (let k = 0; k < 60 && !page; k++) { for (const c of browser.contexts()) for (const p of c.pages()) if (/tauri\.localhost/.test(p.url())) page = p; if (!page) await sleep(100); }
    const t = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = (performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint') || {}).startTime;
        const res = performance.getEntriesByType('resource').map((r) => ({ n: r.name.split('/').pop(), end: Math.round(r.responseEnd), size: r.decodedBodySize, st: r.responseStatus }));
        const b = document.querySelector('#vaultCard button, #new-btn, #open-btn');
        return { origin: performance.timeOrigin, fcp, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, res, firstControl: b ? (b.id || b.innerText.slice(0, 30)) : null, bad: res.filter((r) => r.st >= 400) };
    });
    const off = t.origin - L.epoch0;                    // page clock -> ms since the process started
    // the flash: any frame, once the window is up, that is near-white AND not what the page settles on
    const fr = L.frames.filter((f) => f[0] >= L.visibleMs);
    const last = fr[fr.length - 1];
    const white = fr.filter((f) => f[1] > 245 && f[2] > 245 && f[3] > 245 && Math.abs(f[1] - last[1]) + Math.abs(f[2] - last[2]) + Math.abs(f[3] - last[3]) > 30);
    const settle = fr.find((f) => Math.abs(f[1] - last[1]) + Math.abs(f[2] - last[2]) + Math.abs(f[3] - last[3]) < 12);
    const out = { run: i, visible: L.visibleMs, navStart: Math.round(off), fcp: Math.round(off + t.fcp), dcl: Math.round(off + t.dcl), load: Math.round(off + t.load),
                  clickable: Math.round(Math.max(L.visibleMs, off + t.load)), firstControl: t.firstControl, whiteFrames: white.length,
                  behind: 'rgb(' + L.before.join(',') + ')', firstFrames: fr.slice(0, 5).map((f) => f[0] + 'ms rgb(' + f[1] + ',' + f[2] + ',' + f[3] + ')'), settledAt: settle ? settle[0] : null, final: 'rgb(' + last[1] + ',' + last[2] + ',' + last[3] + ')',
                  rect: L.rect, screen: L.screen, failed: t.bad, scripts: t.res.filter((r) => /\.js$/.test(r.n)).length };
    if (i === 1) fs.writeFileSync(path.join(S.ROOT, 'out', 'startup-' + which + TAG + '-resources.json'), JSON.stringify(t.res, null, 1));
    try { await browser.close(); } catch (e) {}
    S.stopApp(L.pid);
    return out;
}

(async () => {
    note('==== start-up: ' + which + ' ' + TAG + ' ====');
    const runs = [];
    for (let i = 1; i <= RUNS; i++) { const r = await one(i); runs.push(r); note(JSON.stringify(r)); }
    const med = (k) => { const a = runs.slice(1).map((r) => r[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
    note('SUMMARY ' + which + TAG + ': first run  visible ' + runs[0].visible + ' ms, painted ' + runs[0].fcp + ' ms, clickable ' + runs[0].clickable + ' ms   |   later runs (median of ' + (RUNS - 1) + ')  visible ' + med('visible') + ' ms, painted ' + med('fcp') + ' ms, clickable ' + med('clickable') + ' ms   |   white frames: ' + runs.map((r) => r.whiteFrames).join(','));
})().catch((e) => { note('STOPPED ' + e.stack); for (const p of S.flogicProcs()) S.stopApp(p.pid); process.exit(1); });
