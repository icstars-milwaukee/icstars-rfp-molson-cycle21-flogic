// Where does the time go?  A CPU profile + timeline trace of the two stutters.   node profile.js [tag]
const H = require('./staffhelp');
const { click, sleep, path, note, fs } = H;
const TAG = process.argv[2] || 'base';

async function prof(page, name, work) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    const events = [];
    cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) events.push(e); });
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    await cdp.send('Profiler.start');
    await H.startRec(page);
    await work();
    const frames = await H.stopRec(page);
    const { profile } = await cdp.send('Profiler.stop');
    const ended = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await ended;
    // self time per function
    const dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map();
    profile.samples.forEach((id, i) => { const n = byId.get(id); const k = n.callFrame.functionName + ' @' + (n.callFrame.url.split('/').pop() || '(native)') + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
    const total = dt.reduce((a, b) => a + b, 0) / 1000;
    const top = Array.from(self.entries()).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => (v / 1000).toFixed(0) + ' ms  ' + k);
    // the timeline: how long in layout, style, paint, script; forced layouts
    const sum = {}; let forced = 0;
    for (const e of events) {
        if (e.ph !== 'X' || !e.dur) continue;
        if (['Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'Layerize', 'Commit', 'FunctionCall', 'EventDispatch', 'FireAnimationFrame', 'TimerFire', 'MinorGC', 'MajorGC', 'ParseHTML', 'HitTest'].includes(e.name)) { sum[e.name] = sum[e.name] || { n: 0, ms: 0, max: 0 }; sum[e.name].n++; sum[e.name].ms += e.dur / 1000; sum[e.name].max = Math.max(sum[e.name].max, e.dur / 1000); }
        if ((e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.args && e.args.beginData && e.args.beginData.stackTrace) forced++;
    }
    for (const k in sum) { sum[k].ms = +sum[k].ms.toFixed(1); sum[k].max = +sum[k].max.toFixed(1); }
    note('PROFILE ' + name + ' (' + TAG + ')  frames ' + JSON.stringify(frames));
    note('   timeline: ' + JSON.stringify(sum) + '  forcedLayouts=' + forced);
    note('   script self time (of ' + total.toFixed(0) + ' ms sampled):\n      ' + top.join('\n      '));
    fs.writeFileSync(path.join(H.ROOT, 'out', 'profile-' + name.replace(/\W+/g, '_') + '-' + TAG + '.json'), JSON.stringify({ frames, sum, forced, top }, null, 1));
    await cdp.detach();
}
const wheel = async (page, n, dy, gap, dx) => { for (let i = 0; i < n; i++) { await page.mouse.wheel(dx || 0, dy); await sleep(gap); } };
const over = async (page) => { const b = await page.locator('#output').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); };

(async () => {
    const app = await H.startApp('staff'); const page = app.page;
    await sleep(600); await H.pin(page, '4827');
    await H.openTimed(app, path.join(H.DATA, 'wide_300col.csv'), 'wide'); await sleep(900);
    await H.tab(page, 'sheet'); await over(page);
    await prof(page, 'sideways wheel 300 columns', () => wheel(page, 60, 0, 20, 300));
    note('   scrollLeft now ' + (await page.evaluate(() => document.getElementById('output').scrollLeft)) + ' | cells in the DOM: ' + (await page.evaluate(() => document.querySelectorAll('#rows *').length)) + ' header cells ' + (await page.evaluate(() => document.querySelectorAll('#header *').length)));
    await H.openTimed(app, path.join(H.ROOT, 'fake', 'incident.csv'), 'incident'); await sleep(900);
    await H.tab(page, 'sheet');
    await click(page, '#focusBtn'); await sleep(700); await over(page);
    note('   focus mode: rows in the DOM ' + (await page.evaluate(() => document.querySelectorAll('#rows > *').length)) + ', nodes ' + (await page.evaluate(() => document.querySelectorAll('#rows *').length)) + ', output ' + JSON.stringify(await page.evaluate(() => { const r = document.getElementById('output').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })));
    await prof(page, 'wheel in focus mode', () => wheel(page, 60, 400, 20));
    await page.keyboard.press('Escape'); await sleep(500);
    await over(page);
    await prof(page, 'wheel NOT in focus mode (for comparison)', () => wheel(page, 60, 400, 20));
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
