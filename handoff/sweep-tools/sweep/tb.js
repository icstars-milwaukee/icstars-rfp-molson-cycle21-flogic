// Section 4, item 11: the window's own title bar.   node tb.js staff|it [tag]
const H = require('./staffhelp');
const { click, sleep, path, note, fs } = H;
const { execFileSync, spawn } = require('child_process');
const which = process.argv[2] || 'staff', TAG = process.argv[3] || 'base';
const out = {};
const tauri = (page, fn) => page.evaluate((fn) => window.__TAURI__.window.getCurrentWindow()[fn](), fn);        // READ the window's state
const ipc = (page) => page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /plugin/.test(r.name)).reduce((o, r) => { const k = decodeURIComponent(r.name.split('/').pop()); o[k] = (o[k] || 0) + 1; return o; }, {}));

const resizeSweep = (app, steps, gap) => H.winAsync(app, 'sweep', steps, gap);

(async () => {
    note('==== title bar: ' + which + ' (' + TAG + ') ====');
    const app = await H.startApp(which); const page = app.page;
    await sleep(800);
    if (which === 'staff') { await H.pin(page, '4827'); await H.openTimed(app, path.join(H.ROOT, '..', 'demo', 'data', 'big_warehouse.sql'), '535k'); await sleep(1000); await H.tab(page, 'sheet'); }
    else { await click(page, '#open-file'); await H.dialog(app, 'file', path.join(H.WORLD, 'hundred.flogic-keyring')); await H.type(page, '#open-pass', H.PASS); await page.keyboard.press('Enter'); await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(600); }
    const size = () => page.evaluate(() => innerWidth + 'x' + innerHeight);
    note('window from outside: ' + H.win(app, 'rect'));
    note('at start: ' + (await size()) + ' maximized=' + (await tauri(page, 'isMaximized')) + ' | stray scrollbars: ' + JSON.stringify(await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: innerWidth, docH: document.documentElement.scrollHeight, winH: innerHeight }))));

    // maximize / restore with the button
    const frames = async (name, work) => { await H.startRec(page); await work(); const r = await H.stopRec(page); note((r.max <= 34 && r.longMax <= 50 ? 'OK    ' : 'OVER  ') + 'titlebar: ' + name + '  ' + JSON.stringify(r)); out[name] = r; return r; };
    await frames('Maximize button, then Restore', async () => { await click(page, '#flogicMax'); await sleep(700); out.maxed = await tauri(page, 'isMaximized'); out.maxSize = await size(); out.maxLabel = await page.locator('#flogicMax').getAttribute('title'); await click(page, '#flogicMax'); await sleep(700); });
    note('   maximized: ' + out.maxed + ' at ' + out.maxSize + ', the button then read "' + out.maxLabel + '"; after restore: maximized=' + (await tauri(page, 'isMaximized')) + ' ' + (await size()) + ', button "' + (await page.locator('#flogicMax').getAttribute('title')) + '"');
    // double-click the bar
    const bar = await page.locator('.flogic-tb-note').boundingBox();
    await frames('double-click the bar (maximize), again (restore)', async () => { await page.mouse.dblclick(bar.x + bar.width / 2, bar.y + 16); await sleep(800); out.dbl = await tauri(page, 'isMaximized'); await page.mouse.dblclick(bar.x + bar.width / 2, bar.y + 16); await sleep(800); });
    note('   double-click maximized it: ' + out.dbl + '; and back: maximized=' + (await tauri(page, 'isMaximized')));
    // minimize, back from the taskbar
    await click(page, '#flogicMin'); await sleep(900);
    out.minimized = await tauri(page, 'isMinimized');
    H.win(app, 'restore'); await sleep(900);
    note('   Minimize button: minimized=' + out.minimized + '; brought back (as the taskbar does): minimized=' + (await tauri(page, 'isMinimized')) + ' visible=' + (await tauri(page, 'isVisible')) + ' ' + (await size()));

    if (await tauri(page, 'isMaximized')) { await click(page, '#flogicMax'); await sleep(700); note('   (restored first, to resize it: ' + (await size()) + ')'); }
    // a live resize: 120 steps, slowly, then fast.  How many times does the page ask Rust "are you maximized?"
    for (const [name, steps, gap] of [['resizing the window slowly (120 steps, 16 ms apart)', 120, 16], ['resizing the window fast (60 steps, 4 ms apart)', 60, 4]]) {
        const before = await ipc(page);
        const sizes = new Set();
        const watch = setInterval(async () => { try { sizes.add(await size()); } catch (e) {} }, 60);
        let blank = 0;
        const r = await frames(name, async () => { out[name + ' swept'] = await resizeSweep(app, steps, gap); await sleep(500); });
        clearInterval(watch);
        const after = await ipc(page);
        const asked = (after['plugin:window|is_maximized'] || 0) - (before['plugin:window|is_maximized'] || 0);
        note('   the page asked Rust "is it maximized?" ' + asked + ' times during it (' + steps + ' size changes); sizes the page saw: ' + sizes.size + '; back at ' + (await size()));
        out[name + ' ipc'] = asked;
    }
    await page.screenshot({ path: path.join(H.SHOTS, 'tb-' + which + '-' + TAG + '.png') });
    note('   after resizing: stray scrollbars? ' + JSON.stringify(await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: innerWidth }))) + ' | title bar width ' + (await page.evaluate(() => document.getElementById('flogicTitlebar').getBoundingClientRect().width)));
    fs.writeFileSync(path.join(H.ROOT, 'out', 'tb-' + which + '-' + TAG + '.json'), JSON.stringify(out, null, 1));
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
