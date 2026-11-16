// Section 3, "each load", staff app.   node loads-staff.js [tag]
const H = require('./staffhelp');
const { click, type, sleep, path, note, fs } = H;
const TAG = process.argv[2] || 'base';
const DEMO = path.join(H.ROOT, '..', 'demo', 'data');
const results = { opens: [], asks: [], other: {} };

(async () => {
    note('==== loads, staff app (' + TAG + ') ====');
    const app = await H.startApp('staff');
    const page = app.page;
    await sleep(600);
    results.mem0 = H.flogicProcs();
    // sign in: Dana's laptop copy is here from section 7
    if (await page.locator('#vaultPin').count()) { results.other.signInMs = await H.pin(page, '4827'); note('LOAD  sign in with the PIN: ' + results.other.signInMs + ' ms'); }
    else await H.plain(page);

    const files = [
        [path.join(H.ROOT, 'fake', 'incident.csv'), 'incident.csv (25,000 rows x 30)'],
        [path.join(H.DATA, 'five_sheets.xlsx'), 'five_sheets.xlsx (5 sheets)'],
        [path.join(H.DATA, 'wide_300col.csv'), 'wide_300col.csv (2,000 x 300)'],
        [path.join(H.DRIVE, 'sweep-it', 'packs', 'finance', 'incident.flogic'), 'PACK incident.flogic (10 MB)'],
        [path.join(DEMO, 'big_warehouse.sql'), 'big_warehouse.sql (535,500 rows)'],
        [path.join(H.DATA, 'million_12col.csv'), 'million_12col.csv (1,000,000 x 12)'],
        [path.join(H.ROOT, 'fake-big', 'incident.csv'), 'incident.csv BIG (535,000 x 30)'],
    ];
    const big = path.join(H.DRIVE, 'sweep-it', 'packs', 'finance', 'big_warehouse.flogic');
    if (fs.existsSync(big)) files.splice(5, 0, [big, 'PACK big_warehouse.flogic (40 MB)']);
    for (const [f, label] of files) {
        if (process.argv.includes('--quick') && fs.statSync(f).size > 50e6) continue;
        results.opens.push(await H.openTimed(app, f, label));
        await sleep(800);
    }
    results.memBig = H.flogicProcs();

    // the 535k-row file for the questions
    await H.openTimed(app, path.join(DEMO, 'big_warehouse.sql'), 'big_warehouse.sql (again, for the questions)');
    await sleep(1000);
    for (const [sql, label] of [["SELECT * FROM inventory WHERE qty > 4990", 'simple filter, 535k rows'], ['SELECT site, COUNT(*) AS n, SUM(qty) AS total FROM inventory GROUP BY site', 'GROUP BY, 535k rows'], ['SELECT * FROM inventory ORDER BY qty DESC', 'ORDER BY, 535k rows']]) {
        results.asks.push(await H.askTimed(page, sql, label));
    }
    fs.writeFileSync(path.join(H.ROOT, 'out', 'loads-staff-' + TAG + '.json'), JSON.stringify(results, null, 1));
    await page.screenshot({ path: path.join(H.SHOTS, 'loads-staff-' + TAG + '.png') });
    await app.close();
    note('loads done');
})().catch(async (e) => { note('STOPPED ' + e.stack); try { await global.__lastPage.screenshot({ path: path.join(H.SHOTS, 'loads-STOPPED.png') }); } catch (x) {} fs.writeFileSync(path.join(H.ROOT, 'out', 'loads-staff-' + TAG + '-partial.json'), JSON.stringify(results, null, 1)); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
