// C2: what one edit costs the IT console's main thread, with the 100-person keyring.   node edit-cost.js [tag]
//   Traces each edit 5 times and reads the renderer's own tasks (RunTask, or ThreadControllerImpl::RunTask in WebView2 157, on CrRendererMain), so the number is the page's work:
//   script + style + layout.   It doesn't depend on the graphics (a machine with no GPU paints slowly, but that's another thread).
//   Also counts how many rows of the people table were built again (a MutationObserver on #person-list).
const D = require('./deskhelp');
const { click, type, sleep, path, note, fs, C } = D;
const TAG = process.argv[2] || 'run';

async function traced(page, work) {
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) events.push(e); });
    await cdp.send('Tracing.start', { categories: 'toplevel,devtools.timeline,__metadata', transferMode: 'ReportEvents' });
    await work();
    const ended = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await ended;
    await cdp.detach();
    const main = events.find((e) => e.ph === 'M' && e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain');
    const tasks = events.filter((e) => e.ph === 'X' && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && main && e.pid === main.pid && e.tid === main.tid && e.dur).map((e) => e.dur / 1000);
    const sum = (n) => events.filter((e) => e.ph === 'X' && e.name === n && main && e.tid === main.tid && e.dur).reduce((a, e) => a + e.dur / 1000, 0);
    return { longest: tasks.length ? Math.max.apply(null, tasks) : 0, over50: tasks.filter((t) => t > 50).length, style: sum('UpdateLayoutTree'), layout: sum('Layout'), script: sum('FunctionCall') + sum('EventDispatch') };
}

(async () => {
    note('==== C2 edit cost (' + TAG + ') ====');
    const app = await D.startApp('it'); const page = app.page; await sleep(500);
    await click(page, '#open-file'); await D.dialog(app, 'file', path.join(D.WORLD, 'hundred.flogic-keyring'));
    await type(page, '#open-pass', D.PASS); await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(800);
    await page.evaluate(() => {
        window.__rows = 0;
        new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) if (n.nodeName === 'TR') window.__rows++; }).observe(document.getElementById('person-list'), { childList: true });
    });
    const edits = [
        ['add a person', async (i) => { await C.setPerson(page, 'Zed Sweep ' + i, 'Viewer', ['finance'], null); await sleep(250); }],
        ['edit a person: open the form, save', async (i) => { await click(page, '#edit-u-000' + (5 + i)); await sleep(250); await click(page, '#c-btn'); await sleep(300); }],
        ['edit a group: open, change the minutes, save', async (i) => { await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit HR' }); await sleep(200); await type(page, '#g-autolock', String(11 + i)); await click(page, '#g-add'); await sleep(300); }],
        ['Still needed on one person', async (i) => { await click(page, '#review-u-001' + i); await sleep(300); }],
    ];
    const out = {};
    for (const [name, work] of edits) {
        const runs = [];
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => { window.__rows = 0; window.scrollTo(0, 0); });
            const r = await traced(page, () => work(i));
            r.rowsBuilt = await page.evaluate(() => window.__rows);
            runs.push(r);
        }
        const L = runs.map((r) => r.longest).sort((a, b) => a - b);
        const res = { longestTask: +L[L.length - 1].toFixed(1), medianLongest: +L[2].toFixed(1), tasksOver50: runs.reduce((a, r) => a + r.over50, 0),
                      styleMs: +(runs.reduce((a, r) => a + r.style, 0) / 5).toFixed(1), layoutMs: +(runs.reduce((a, r) => a + r.layout, 0) / 5).toFixed(1),
                      scriptMs: +(runs.reduce((a, r) => a + r.script, 0) / 5).toFixed(1), rowsBuilt: runs.map((r) => r.rowsBuilt) };
        out[name] = res;
        note((res.tasksOver50 ? 'OVER  ' : 'OK    ') + name + '  ' + JSON.stringify(res));
    }
    note('   DOM nodes: ' + (await page.evaluate(() => document.querySelectorAll('*').length)) + ' | people rows ' + (await page.locator('#person-list tr').count()));
    fs.mkdirSync(path.join(D.ROOT, 'out'), { recursive: true });
    fs.writeFileSync(path.join(D.ROOT, 'out', 'edit-cost-' + TAG + '.json'), JSON.stringify(out, null, 1));
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
