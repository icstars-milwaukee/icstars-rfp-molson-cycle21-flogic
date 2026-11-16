// C3: what repaints on each sideways wheel step in a 300-column file?   node paint-probe.js [tag] [--css="extra css"]
//   Headless Edge (the paint WORK is the same on any machine; only how long it takes differs).
//   Traces 60 sideways notches with paint-invalidation tracking, and prints:
//     - how many paints, and how much area they cover (in screens' worth)
//     - which elements were invalidated, and why (the top reasons)
//     - the compositor layers, and why each exists
//   --css adds a stylesheet first (an experiment: does this change stop the repaint?).   The page's own files are not changed.
const { chromium } = require('../demo/node_modules/playwright-core');
const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '../../..');
const TAG = process.argv[2] || 'run';
const CSS = (process.argv.find((a) => a.startsWith('--css=')) || '').slice(6);
(async () => {
    const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--allow-file-access-from-files'] });
    const p = await b.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5 });
    await p.goto('file:///' + R.split(path.sep).join('/') + '/DataPage/flogic.html'); await p.waitForTimeout(500);
    if (CSS) await p.addStyleTag({ content: CSS });
    const plain = p.locator('button', { hasText: 'plain file without signing in' }).first(); if (await plain.count()) await plain.click();
    await p.setInputFiles('#csvFileInput', path.join(__dirname, 'data', 'wide_300col.csv'));
    await p.waitForFunction(() => document.getElementById('loader').hidden && /Rows/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
    if (await p.locator('#tab-sheet').count()) { await p.click('#tab-sheet'); await p.waitForTimeout(800); }
    const box = await p.locator('#output').boundingBox();
    await p.evaluate(() => { document.getElementById('output').scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(400);
    const bx = await p.locator('#output').boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.waitForTimeout(300);

    const cdp = await p.context().newCDPSession(p);
    await cdp.send('LayerTree.enable');
    let layers = [];
    cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
    const ev = [];
    cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) ev.push(e); });
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking,__metadata', transferMode: 'ReportEvents' });
    const t0 = Date.now();
    for (let i = 0; i < Number(process.env.STEPS || 60); i++) { await p.mouse.wheel(300, 0); await p.waitForTimeout(20); }
    await p.waitForTimeout(300);
    const ms = Date.now() - t0;
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); await done;
    const scrolled = await p.evaluate(() => document.getElementById('output').scrollLeft);

    const main = ev.find((e) => e.ph === 'M' && e.name === 'thread_name' && e.args.name === 'CrRendererMain');
    const onMain = (e) => main && e.pid === main.pid && e.tid === main.tid;
    const vp = 1280 * 672;
    const paints = ev.filter((e) => e.name === 'Paint' && e.ph === 'X' && onMain(e));
    let area = 0; const byLayer = {};
    for (const e of paints) {
        const c = e.args && e.args.data && e.args.data.clip; const nodeId = e.args && e.args.data && e.args.data.nodeId;
        if (c && c.length === 8) { const w = Math.abs(c[2] - c[0]), h = Math.abs(c[5] - c[1]); area += w * h; }
        byLayer[nodeId] = (byLayer[nodeId] || 0) + 1;
    }
    const inv = {};
    for (const e of ev) {
        if (!/PaintInvalidationTracking|StyleInvalidatorInvalidationTracking|LayoutInvalidationTracking/.test(e.name)) continue;
        const d = e.args && e.args.data; if (!d) continue;
        const k = e.name.replace('InvalidationTracking', '') + ': ' + (d.nodeName || '?').slice(0, 60) + ' / ' + (d.reason || '');
        inv[k] = (inv[k] || 0) + 1;
    }
    const sum = (n) => ev.filter((e) => e.name === n && e.ph === 'X' && onMain(e)).reduce((a, e) => a + e.dur / 1000, 0);
    // the layers: which ones exist, why
    const reasons = [];
    for (const l of layers.slice(0, 60)) {
        let why = [];
        try { why = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasons || []; } catch (e) {}
        reasons.push(Math.round(l.width) + 'x' + Math.round(l.height) + (l.backendNodeId ? ' node' + l.backendNodeId : '') + (l.scrollRects && l.scrollRects.length ? ' SCROLL' : '') + ' ' + why.join(','));
    }
    const byNode = {}; for (const e of paints) { const d = (e.args && e.args.data) || {}; const k = (d.nodeName || d.nodeId || "?") + ""; byNode[k] = byNode[k] || { n: 0, ms: 0 }; byNode[k].n++; byNode[k].ms += e.dur / 1000; }
    const paintSample = paints.slice(5, 7).map((e) => e.args);
    const out = { tag: TAG, css: CSS || null, ms, scrolledTo: scrolled, paints: paints.length, paintScreens: +(area / vp).toFixed(1),
                  paintMs: +sum('Paint').toFixed(1), layoutMs: +sum('Layout').toFixed(1), styleMs: +sum('UpdateLayoutTree').toFixed(1), commits: ev.filter((e) => e.name === 'Commit' && e.ph === 'X').length,
                  paintsBy: Object.entries(byNode).sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, v]) => k.slice(0, 70) + "  n=" + v.n + "  " + v.ms.toFixed(0) + " ms"), paintSample, invalidations: Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, 14), layers: layers.length, layerReasons: reasons.slice(0, 25) };
    console.log(JSON.stringify(out, null, 1));
    fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'out', 'paint-probe-' + TAG + '.json'), JSON.stringify(out, null, 1));
    await b.close();
})().catch((e) => { console.log('STOPPED', e.message.split('\n')[0]); process.exit(1); });
