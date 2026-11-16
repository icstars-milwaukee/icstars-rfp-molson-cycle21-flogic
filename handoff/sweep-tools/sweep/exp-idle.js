// An experiment (diagnosis only): which forever-animation on the Sheet costs the idle CPU?
const H = require('./staffhelp');
const { sleep, note } = H;
const { execFileSync } = require('child_process');
function cpu() {
    return execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "$r = @{}; Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'sweep-*.exe' -or ($_.Name -eq 'msedgewebview2.exe' -and $_.CommandLine -match 'webview-exe-name=sweep') } | ForEach-Object { $k = if ($_.CommandLine -match '--type=([a-z-]+)') { $Matches[1] } else { 'main' }; $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; if ($p) { $r[$k] = [math]::Round($r[$k] + $p.TotalProcessorTime.TotalMilliseconds) } }; ($r.GetEnumerator() | ForEach-Object { $_.Key + '=' + $_.Value }) -join ','"]).toString().trim().split(',').reduce((o, kv) => { const [k, v] = kv.split('='); o[k] = Number(v); return o; }, {});
}
(async () => {
    const app = await H.startApp('staff'); const page = app.page;
    await sleep(3000);
    const variants = [
        ['as it is', []],
        ['glow in 12 steps per fade (5 a second)', ['.scope-hint.ready { animation-timing-function: steps(12, end) !important; }']],
        ['glow in 8 steps per fade (3.3 a second)', ['.scope-hint.ready { animation-timing-function: steps(8, end) !important; }']],
        ['glow paused while the sign-in card is up', ['body.vault-up .scope-hint.ready { animation-play-state: paused !important; }']],
    ];
    for (const [name, rules] of variants) {
        await page.evaluate((rules) => { const sh = Array.from(document.styleSheets).find((s) => /flogicI\.css/.test(s.href || '')); for (const r of rules) sh.insertRule(r, sh.cssRules.length); }, rules);
        await sleep(1500);
        const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => (a.animationName || a.constructor.name) + ' on ' + (a.effect && a.effect.target ? (a.effect.target.id ? '#' + a.effect.target.id : '.' + a.effect.target.className) : '?')));
        const a = cpu(), t0 = Date.now(); await sleep(15000); const b = cpu(), wall = Date.now() - t0;
        const parts = Object.keys(b).map((k) => k + ' ' + (100 * (b[k] - (a[k] || 0)) / wall).toFixed(1) + '%').join(', ');
        const total = Object.keys(b).reduce((s, k) => s + b[k] - (a[k] || 0), 0);
        note('EXPERIMENT  ' + name.padEnd(38) + (100 * total / wall).toFixed(1) + '% of one core   [' + parts + ']   running: ' + JSON.stringify(anims));
        await page.evaluate((n) => { const sh = Array.from(document.styleSheets).find((s) => /flogicI\.css/.test(s.href || '')); for (let i = 0; i < n; i++) sh.deleteRule(sh.cssRules.length - 1); }, rules.length);
    }
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
