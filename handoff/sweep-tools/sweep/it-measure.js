// Sections 3 and 4, the IT app: loads and frames, with the 100-person keyring.   node it-measure.js [tag]
const D = require('./deskhelp');
const { click, type, sleep, path, note, fs, C } = D;
const TAG = process.argv[2] || 'base';
const out = { loads: [], frames: [] };
let app, page;

// Time one action INSIDE the page: from the click / key that starts it, until  done()  (page code) is true.
async function timed(name, action, doneSrc, opts) {
    opts = opts || {};
    await page.evaluate((doneSrc) => {
        const o = window.__t = { maxGap: 0, long: [] };
        const done = new Function('return (' + doneSrc + ')');
        const start = (e) => { if (!o.t0 && e.isTrusted) { o.t0 = performance.now(); o.last = o.t0; } };
        window.addEventListener('click', start, true); window.addEventListener('keydown', start, true); window.addEventListener('change', start, true);
        try { o.obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (o.t0 && e.startTime + e.duration > o.t0) o.long.push(Math.round(e.duration)); }); o.obs.observe({ entryTypes: ['longtask'] }); } catch (e) {}
        function tick(now) {
            if (o.t0) { if (now - o.last > o.maxGap) o.maxGap = now - o.last; o.last = now; let ok = false; try { ok = !!done(); } catch (e) {} if (ok) { o.ms = now - o.t0; window.removeEventListener('click', start, true); window.removeEventListener('keydown', start, true); window.removeEventListener('change', start, true); return; } }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }, doneSrc);
    await action();
    let o = {};
    const t0 = Date.now();
    while (Date.now() - t0 < (opts.timeout || 180000)) { o = await page.evaluate(() => ({ ms: window.__t.ms, maxGap: window.__t.maxGap, long: window.__t.long, started: !!window.__t.t0 })).catch(() => ({})); if (o.ms !== undefined) break; await sleep(50); }
    const r = { name, ms: o.ms === undefined ? null : Math.round(o.ms), longestFreeze: Math.round(o.maxGap || 0), longTasks: (o.long || []).length, longestTask: (o.long || []).length ? Math.max.apply(null, o.long) : 0 };
    note('LOAD  ' + JSON.stringify(r));
    out.loads.push(r);
    return r;
}
async function M(name, work, opts) {
    try { const r = await D.measure(page, 'it: ' + name, work, opts); out.frames.push(r); return r; }
    catch (e) { note('SKIP  it: ' + name + ' -> ' + String(e.message).split('\n')[0].slice(0, 200)); out.frames.push({ name: 'it: ' + name, skipped: String(e.message).split('\n')[0] }); try { await D.stopRec(page); } catch (x) {} return null; }
}
const msg = (id) => page.locator('#' + id).innerText();

(async () => {
    note('==== IT app, loads and frames (' + TAG + ') ====');
    const dir = path.join(D.DRIVE, 'sweep-it100');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    app = await D.startApp('it'); page = app.page;
    await sleep(500);

    // open the keyring (100 people, 500 pack entries): the real Open window, then the passphrase
    await click(page, '#open-file');
    note('open dialog: ' + (await D.dialog(app, 'file', path.join(D.WORLD, 'hundred.flogic-keyring'))));
    await type(page, '#open-pass', D.PASS);
    await timed('open the keyring (100 people, 500 pack entries)', () => page.keyboard.press('Enter'), "!document.getElementById('main').hidden");
    note('   counts: ' + (await msg('keyring-counts')) + ' | rows drawn: people ' + (await page.locator('#person-list tr').count()) + ', packs ' + (await page.locator('#pack-list tr').count()) + ' | page height ' + (await page.evaluate(() => document.documentElement.scrollHeight)));
    let folderOut = await D.pickFolder(app, '#connect-folder', dir);
    if (!/Connected/.test(await msg('folder-status'))) { note('   (the folder did not connect: ' + folderOut + ' | ' + (await msg('folder-status')) + '. Trying once more.)'); folderOut = await D.dialog(app, 'allow'); await sleep(1500); }
    note('folder: ' + folderOut + ' | ' + (await msg('folder-status')));
    if (!/Connected/.test(await msg('folder-status'))) throw new Error('IT folder not connected: ' + folderOut);

    // ---- frames ----
    await page.mouse.move(640, 400);
    await M('scroll the whole console (wheel down, 100 people)', async () => { for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 240); await sleep(16); } }, { before: () => page.evaluate(() => window.scrollTo(0, 0)) });
    await M('scroll back up (fast)', async () => { for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, -600); await sleep(16); } });
    await page.evaluate(() => window.scrollTo(0, 0));

    // ---- loads ----
    await timed('make a key file (into the folder)', () => click(page, '#make-u-0002'), "/Put .* key file in their folder/.test(document.getElementById('issue-msg').innerText)");
    let was = await msg('issue-msg');
    const seenWords = new Set(); const watchWords = setInterval(async () => { try { seenWords.add((await msg('issue-msg')).replace(/\d+ of/, 'N of').replace(/: .*/, '')); } catch (e) {} }, 200);
    await timed('Renew everyone (100 people, folder connected)', () => click(page, '#renew-all'), "/^Renewed \\d+/.test(document.getElementById('issue-msg').innerText)");
    clearInterval(watchWords); note('   words on screen while it ran: ' + JSON.stringify(Array.from(seenWords)));
    note('   ' + (await msg('issue-msg')).slice(0, 160) + ' | key files in the folder: ' + fs.readdirSync(dir).filter((n) => /^u-/.test(n)).length);

    // add / edit a person, edit a group: each change redraws every table (refresh())
    await M('add a person (refresh() with 100 people)', async () => { await C.setPerson(page, 'Zed Sweep', 'Viewer', ['finance'], null); await sleep(200); }, { runs: 2 });
    await M('edit a person: open the form, save', async () => { await click(page, '#edit-u-0005'); await sleep(250); await click(page, '#c-btn'); await sleep(300); }, { runs: 2 });
    await M('edit a group: open, change the minutes, save', async () => { await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit HR' }); await sleep(200); await type(page, '#g-autolock', '12'); await click(page, '#g-add'); await sleep(300); }, { runs: 2 });
    await M('typing a name (30 letters)', async () => { await type(page, '#c-name', 'Someone With A Long Name Here', { delay: 30 }); await type(page, '#c-name', ''); }, { runs: 1 });

    // pack 1 file
    await click(page, '#p-file');
    note('pick 1: ' + (await D.dialog(app, 'file', path.join(D.DATA, 'batch20', 'batch_01.csv'))));
    await sleep(400);
    await click(page, page.locator('#p-queue tr').first().locator('input[id$="-for-finance"]'), { name: 'Finance' });
    await timed('pack 1 small file (into packs/finance/)', () => click(page, '#p-btn'), "/^Packed 1 file/.test(document.getElementById('pack-msg').innerText)");

    // pack 20 files
    const twenty = fs.readdirSync(path.join(D.DATA, 'batch20')).slice(1).map((n) => '"' + n + '"').join(' ');
    await click(page, '#p-file');
    await D.dialog(app, 'file', path.join(D.DATA, 'batch20'));             // walk into the folder first
    note('pick 19 more: ' + (await D.dialog(app, 'file', twenty)));
    await sleep(600);
    const rows = await page.locator('#p-queue tr').count();
    note('   rows in the pack list: ' + rows);
    await M('tick a group box in the ' + rows + '-file list (the list redraws)', async () => { const b = page.locator('#p-queue tr').nth(3).locator('input[id$="-for-hr"]'); await click(page, b, { name: 'HR box', after: 120 }); await click(page, b, { name: 'HR box', after: 120 }); });
    await click(page, page.locator('#p-queue tr').first().locator('input[id$="-for-finance"]'), { name: 'Finance' });
    await click(page, page.locator('#p-queue tr').first().locator('input[id$="-for-operations"]'), { name: 'Operations' });
    await M('Same groups for every file', async () => { await click(page, '#p-same'); await sleep(300); }, { runs: 1 });
    await M('tick an export box in the list', async () => { const b = page.locator('#p-queue tr').nth(5).locator('input[id$="-ex-finance"]'); await click(page, b, { name: 'export box', after: 120 }); await click(page, b, { name: 'export box', after: 120 }); });
    await page.screenshot({ path: path.join(D.SHOTS, 'it-pack-list-' + TAG + '.png') });
    await timed('pack ' + rows + ' files (each into 2 group folders)', () => click(page, '#p-btn'), "/^Packed \\d+ files/.test(document.getElementById('pack-msg').innerText)");
    note('   ' + (await msg('pack-msg')).slice(0, 120) + ' | in packs/finance: ' + (fs.existsSync(path.join(dir, 'packs', 'finance')) ? fs.readdirSync(path.join(dir, 'packs', 'finance')).length : 0));

    // pack the 40 MB file
    await click(page, '#p-file');
    note('pick 40 MB: ' + (await D.dialog(app, 'file', path.join(D.ROOT, '..', 'demo', 'data', 'big_warehouse.sql'))));
    await sleep(500);
    await click(page, page.locator('#p-queue tr').first().locator('input[id$="-for-finance"]'), { name: 'Finance' });
    await timed('pack the 40 MB file (into packs/finance/)', () => click(page, '#p-btn'), "/^Packed 1 file|packed:/.test(document.getElementById('pack-msg').innerText)");
    note('   ' + (await msg('pack-msg')).slice(0, 140));

    // save
    let dl = null; page.once('download', (d) => { dl = d; });
    await timed('save the keyring (100 people)', () => click(page, '#save-btn'), "/^Saved /.test(document.getElementById('keyring-msg').innerText)");
    await sleep(500);
    if (dl) await dl.saveAs(path.join(D.ROOT, 'out', 'hundred-saved.flogic-keyring')).catch(() => {});
    note('   ' + (await msg('keyring-msg')).slice(0, 90));
    out.mem = D.flogicProcs();
    fs.writeFileSync(path.join(D.ROOT, 'out', 'it-measure-' + TAG + '.json'), JSON.stringify(out, null, 1));
    note('SUMMARY it frames (' + TAG + '): ' + out.frames.filter((r) => r.pass).length + ' of ' + out.frames.length + ' within budget');
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); try { await page.screenshot({ path: path.join(D.SHOTS, 'it-STOPPED.png') }); } catch (x) {} fs.writeFileSync(path.join(D.ROOT, 'out', 'it-measure-' + TAG + '-partial.json'), JSON.stringify(out, null, 1)); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
