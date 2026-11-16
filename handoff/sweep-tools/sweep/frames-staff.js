// Section 4, staff app: every interaction, with real input, frame by frame.   node frames-staff.js [tag] [--only=name,name]
const H = require('./staffhelp');
const { click, type, sleep, path, note, fs } = H;
const TAG = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'base';
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const DEMO = path.join(H.ROOT, '..', 'demo', 'data');
const out = [];
let app, page;
const want = (group) => only.length === 0 || only.includes(group);
async function M(group, name, work, opts) {
    try { const r = await H.measure(page, group + ': ' + name, work, opts); r.group = group; out.push(r); return r; }
    catch (e) { note('SKIP  ' + group + ': ' + name + '  -> ' + String(e.message).split('\n')[0].slice(0, 200)); out.push({ group, name: group + ': ' + name, skipped: String(e.message).split('\n')[0] }); try { await H.stopRec(page); } catch (x) {} return null; }
}
const box = (sel) => page.locator(sel).first().boundingBox();
async function over(sel, fx, fy) { const b = await box(sel); await page.mouse.move(b.x + b.width * (fx === undefined ? 0.5 : fx), b.y + b.height * (fy === undefined ? 0.5 : fy)); return b; }
async function keys(key, n, gap) { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await sleep(gap === undefined ? 30 : gap); } }
async function wheel(n, dy, gap, dx) { for (let i = 0; i < n; i++) { await page.mouse.wheel(dx || 0, dy); await sleep(gap); } }
const top0 = () => page.evaluate(() => { document.getElementById('output').scrollTop = 0; document.getElementById('output').scrollLeft = 0; window.scrollTo(0, 0); });   // (only to put the test back at its start)

(async () => {
    note('==== frames, staff app (' + TAG + ') ====');
    app = await H.startApp('staff'); page = app.page;
    await sleep(600);
    await H.pin(page, '4827');
    note('screen: ' + JSON.stringify(await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }))));
    // the refresh rate, as the page sees it
    await H.startRec(page); await sleep(1000); const idle = await H.stopRec(page);
    note('at rest for 1 s: ' + JSON.stringify(idle) + '  (' + Math.round(1000 / idle.median) + ' Hz)');
    await H.openTimed(app, path.join(DEMO, 'big_warehouse.sql'), '535k');
    await sleep(1200);

    if (want('stations')) {
        const turn = async (to) => { await click(page, '#tab-' + to, { after: 0 }); await sleep(420); };
        await M('stations', 'tab click: Dashboard -> Sheet (535k rows)', () => turn('sheet'), { before: () => H.tab(page, 'dashboard') });
        await M('stations', 'tab click: Sheet -> Dashboard', () => turn('dashboard'), { before: () => H.tab(page, 'sheet') });
        await M('stations', 'tab click: Dashboard -> Ticket', () => turn('ticket'), { before: () => H.tab(page, 'dashboard') });
        await M('stations', 'tab click: Ticket -> Sheet', () => turn('sheet'), { before: () => H.tab(page, 'ticket') });
        await H.tab(page, 'sheet');
        await page.locator('#tab-sheet').focus();
        await M('stations', 'arrow keys on the tabs, 6 turns', async () => { for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) { await page.keyboard.press(k); await sleep(380); } });
        await M('stations', 'Alt+1/2/3, 6 turns', async () => { for (const k of ['Alt+2', 'Alt+3', 'Alt+1', 'Alt+3', 'Alt+2', 'Alt+1']) { await page.keyboard.press(k); await sleep(380); } });
        await M('stations', 'Back / Forward (Alt+Left, Alt+Right), 4 turns', async () => { for (const k of ['Alt+ArrowLeft', 'Alt+ArrowLeft', 'Alt+ArrowRight', 'Alt+ArrowRight']) { await page.keyboard.press(k); await sleep(420); } });
        note('   after Back/Forward the station is ' + (await page.evaluate(() => location.hash)));
        await H.tab(page, 'ticket');
        const tk = () => page.locator('#ticketView').innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 60));
        { const b = await box('#ticketView'); await page.mouse.click(b.x + b.width - 30, b.y + 12); await sleep(200); }          // focus off the tab row, onto the ticket
        const tk0 = await tk();
        await M('ticket', 'Next ticket held down (40 x down arrow)', () => keys('ArrowDown', 40, 30));
        note('   the ticket moved: ' + JSON.stringify(tk0) + ' -> ' + JSON.stringify(await tk()) + ' | still on ' + (await page.evaluate(() => location.hash)));
        await M('ticket', 'Previous ticket held down (40 x up arrow)', () => keys('ArrowUp', 40, 30));
        await M('ticket', 'End then Home (535k rows)', async () => { await page.keyboard.press('End'); await sleep(350); await page.keyboard.press('Home'); await sleep(350); });
        note('   after End/Home: ' + JSON.stringify(await tk()) + ' | on ' + (await page.evaluate(() => location.hash)));
        await M('ticket', 'the Next ticket button, 20 clicks', async () => { const b = page.locator('button.ticket-step', { hasText: 'Next ticket' }); for (let i = 0; i < 20; i++) { await click(page, b, { name: 'Next ticket', after: 20 }); } });
        await H.tab(page, 'dashboard');
        await M('dashboard', 'Show the full dashboard', async () => { await click(page, '#dashMore'); await sleep(600); }, { runs: 1 });
        await M('dashboard', 'a tile row -> the Sheet with the answer', async () => { await click(page, page.locator('.dash-bar').first(), { name: 'tile row' }); await sleep(1500); }, { before: () => H.tab(page, 'dashboard') });
        await H.tab(page, 'sheet');
        if (await page.locator('#backBtn').isVisible()) { await click(page, '#backBtn'); await sleep(400); }
    }

    if (want('scroll')) {
        await H.tab(page, 'sheet');
        await page.locator('#output').scrollIntoViewIfNeeded();
        await over('#output');
        await M('scroll', 'wheel, slow (40 notches)', () => wheel(40, 100, 50), { before: top0 });
        await M('scroll', 'wheel, fast (90 big notches)', () => wheel(90, 1200, 16), { before: top0 });
        await M('scroll', 'dragging the scrollbar', async () => {
            const b = await box('#output'); const x = b.x + b.width - 5;
            await page.mouse.move(x, b.y + 14); await page.mouse.down();
            for (let i = 1; i <= 70; i++) { await page.mouse.move(x, b.y + 14 + i * 5); await sleep(16); }
            for (let i = 70; i >= 1; i--) { await page.mouse.move(x, b.y + 14 + i * 5); await sleep(16); }
            await page.mouse.up();
        }, { before: top0 });
        note('   after the drag, scrollTop was moved: ' + (await page.evaluate(() => document.getElementById('output').scrollTop)));
        await top0(); await over('#output'); await click(page, page.locator('#rows > *').nth(3), { name: 'a cell', dx: 300 }); await sleep(400);
        if (await page.locator('#aimRowClose').isVisible()) { await page.keyboard.press('Escape'); await sleep(300); }
        await page.locator('#output').focus().catch(() => {});
        await M('scroll', 'PageDown held (40)', () => keys('PageDown', 40, 30), { before: async () => { await top0(); await page.locator('#output').focus().catch(() => {}); } });
        await M('scroll', 'Down arrow held (60)', () => keys('ArrowDown', 60, 25), { before: async () => { await top0(); await page.locator('#output').focus().catch(() => {}); } });
        await M('scroll', 'End then Home', async () => { await page.keyboard.press('End'); await sleep(400); await page.keyboard.press('Home'); await sleep(400); });
        note('   keyboard scrolling moved the sheet: scrollTop ' + (await page.evaluate(() => document.getElementById('output').scrollTop)) + ' status ' + (await page.locator('#status').innerText()).replace(/[^\x20-\x7e]/g, '-'));
        // Go to row
        await M('scroll', 'Go to row: 400000 + Enter', async () => { await type(page, '#jumpInput', '400000', { delay: 15 }); await page.keyboard.press('Enter'); await sleep(500); });
        note('   after Go to row: ' + (await page.locator('#status').innerText()).replace(/[^\x20-\x7e]/g, '-'));
        await M('scroll', 'Go to row: its button', async () => { await type(page, '#jumpInput', '12', { delay: 15 }); await click(page, '#jumpBtn'); await sleep(400); });
    }

    if (want('search')) {
        await H.tab(page, 'sheet'); await top0();
        await M('search', 'typing a search (535k rows): "Toronto"', async () => { await type(page, '#searchInput', 'Toronto', { delay: 60 }); await sleep(1500); }, { runs: 1 });
        note('   search: ' + (await page.locator('#aimCount').innerText()) + ' | ' + (await page.locator('#status').innerText()).replace(/[^\x20-\x7e]/g, '-'));
        await M('search', 'next match x 40', async () => { for (let i = 0; i < 40; i++) { await click(page, '#aimNext', { after: 15 }); } });
        await M('search', 'previous match x 20 (wraps around)', async () => { for (let i = 0; i < 20; i++) { await click(page, '#aimPrev', { after: 15 }); } }, { before: async () => { for (let i = 0; i < 3; i++) await click(page, '#aimPrev', { after: 15 }); } });
        // the drawer, following the matches
        await click(page, '#aimRowBtn'); await sleep(500);
        note('   drawer open: ' + (await page.locator('#aimRow').isVisible()) + ' title ' + JSON.stringify(await page.locator('#aimRowTitle').innerText().catch(() => '')));
        let covered = '';
        try { await M('drawer', 'next match x 55, drawer open (it redraws each time)', async () => { for (let i = 0; i < 55; i++) { await click(page, '#aimNext', { after: 15 }); } }, { runs: 2 }); }
        catch (e) { covered = e.message; note('FINDING  with the drawer open the next-match button can\'t be clicked: ' + covered); }
        await M('drawer', 'close with Escape, open with Details', async () => { await page.keyboard.press('Escape'); await sleep(300); await click(page, '#aimRowBtn'); await sleep(350); });
        await page.keyboard.press('Escape'); await sleep(300);
        await type(page, '#searchInput', ''); await sleep(600);
    }

    if (want('drawer')) {
        await H.openTimed(app, path.join(H.ROOT, 'fake', 'incident.csv'), 'incident 25k');
        await sleep(900); await H.tab(page, 'sheet'); await top0();
        const cell = async (rowN, fx) => { const b = await box('#output'); return { x: b.x + b.width * fx, y: b.y + 60 + rowN * 30 }; };
        await M('drawer', 'click a cell -> the drawer opens; x closes', async () => { const c = await cell(3, 0.3); await page.mouse.move(c.x, c.y); await page.mouse.click(c.x, c.y); await sleep(450); await click(page, '#aimRowClose'); await sleep(350); });
        await M('drawer', 'click a cell on the right: the sheet slides it clear', async () => { const c = await cell(4, 0.92); await page.mouse.move(c.x, c.y); await page.mouse.click(c.x, c.y); await sleep(550); await page.keyboard.press('Escape'); await sleep(350); });
        { const c = await cell(5, 0.3); await page.mouse.click(c.x, c.y); await sleep(500); }
        const toggle = page.locator('#aimRow button', { hasText: /empty fields/ }).first();
        if (await toggle.count()) await M('drawer', 'Show / Hide the empty fields', async () => { await click(page, toggle, { name: 'empty fields' }); await sleep(300); await click(page, toggle, { name: 'empty fields' }); await sleep(300); });
        else note('   no "empty fields" toggle on this row: ' + JSON.stringify((await page.locator('#aimRow').innerText()).slice(0, 120)));
        await page.keyboard.press('Escape'); await sleep(300);
        await M('hover', 'hovering 30 cells (the "expand?" tag)', async () => { const b = await box('#output'); for (let i = 0; i < 30; i++) { await page.mouse.move(b.x + 80 + (i % 6) * 120, b.y + 70 + (i % 10) * 30, { steps: 3 }); await sleep(70); } });
        // focus mode
        await M('focus', 'Focus mode on, then off (Escape)', async () => { await click(page, '#focusBtn'); await sleep(600); await page.keyboard.press('Escape'); await sleep(600); });
        await click(page, '#focusBtn'); await sleep(700);
        await over('#output');
        await M('focus', 'wheel in focus mode (60 notches)', () => wheel(60, 400, 20));
        await M('focus', 'the drawer in focus mode: open on a cell, close', async () => { const b = await box('#output'); await page.mouse.click(b.x + 300, b.y + 200); await sleep(500); await page.keyboard.press('Escape'); await sleep(350); });
        note('   still in focus mode: ' + (await page.evaluate(() => document.body.classList.contains('focus'))));
        await page.keyboard.press('Escape'); await sleep(500);
        if (await page.evaluate(() => document.body.classList.contains('focus'))) { await page.keyboard.press('Escape'); await sleep(500); }
        // the view flip
        await M('sheet', 'Spreadsheet View flip, and back', async () => { await click(page, '#viewBtn'); await sleep(600); await click(page, '#viewBtn'); await sleep(600); });
    }

    if (want('wide')) {
        await H.openTimed(app, path.join(H.DATA, 'wide_300col.csv'), 'wide 300');
        await sleep(900); await H.tab(page, 'sheet'); await top0(); await over('#output');
        await M('wide', 'sideways wheel, 300 columns (60 notches)', () => wheel(60, 0, 20, 300), { before: top0 });
        await M('wide', 'sideways wheel, at a hand pace (60 notches of 40 px)', () => wheel(60, 0, 20, 40), { before: top0 });
        await M('wide', 'dragging the bottom scrollbar', async () => {
            const b = await box('#output'); const y = b.y + b.height - 5;
            await page.mouse.move(b.x + 20, y); await page.mouse.down();
            for (let i = 1; i <= 60; i++) { await page.mouse.move(b.x + 20 + i * 8, y); await sleep(16); }
            await page.mouse.up();
        }, { before: top0 });
        note('   scrollLeft after: ' + (await page.evaluate(() => document.getElementById('output').scrollLeft)));
        await M('wide', 'down wheel on 300 columns (40 notches)', () => wheel(40, 300, 20), { before: top0 });
    }

    if (want('dash')) {
        await H.openTimed(app, path.join(DEMO, 'big_warehouse.sql'), '535k');
        await sleep(1200); await H.tab(page, 'dashboard');
        const b = (re) => page.locator('#dash button', { hasText: re }).first();
        await click(page, '#dashMore').catch(() => {}); await sleep(600);
        await M('dash', 'Edit on, Done', async () => { await click(page, b(/^Edit$/), { name: 'Edit' }); await sleep(400); await click(page, b(/^Done$/), { name: 'Done' }); await sleep(400); });
        await click(page, b(/^Edit$/), { name: 'Edit' }); await sleep(400);
        await M('dash', 'move a tile right and back (the arrow buttons)', async () => { await click(page, b(/^▶$/), { name: 'move right' }); await sleep(300); await click(page, b(/^◀$/), { name: 'move left' }); await sleep(300); });
        await M('dash', 'resize a tile L, S, M', async () => { for (const s of ['L', 'S', 'M']) { await click(page, b(new RegExp('^' + s + '$')), { name: 'size ' + s }); await sleep(300); } });
        await M('dash', '+ Add a tile (opens its chooser)', async () => { await click(page, b(/Add a tile/), { name: 'Add a tile' }); await sleep(600); await page.keyboard.press('Escape'); await sleep(300); }, { runs: 1 });
        await page.screenshot({ path: path.join(H.SHOTS, 'frames-dash-edit-' + TAG + '.png') });
        if (await b(/^Done$/).count()) { await click(page, b(/^Done$/), { name: 'Done' }); await sleep(300); }
        await M('dash', 'Hide, Show', async () => { await click(page, b(/^Hide$/), { name: 'Hide' }); await sleep(400); await click(page, page.locator('button', { hasText: /^Show/ }).first(), { name: 'Show' }); await sleep(600); });
    }

    if (want('ask')) {
        await H.tab(page, 'dashboard');
        await M('ask', 'Ask opens, closes', async () => { await click(page, '#queryBtn'); await sleep(500); await click(page, '#queryClose'); await sleep(500); });
        await click(page, '#queryBtn'); await sleep(500);
        if (!(await page.locator('#queryType').isChecked())) await click(page, '#queryType');
        await M('ask', 'typing a question (60 letters)', async () => { await type(page, '#querySql', 'SELECT site, COUNT(*) AS n FROM inventory GROUP BY site ORDER BY n', { delay: 25 }); });
        await M('ask', 'Enter: the answer shows (GROUP BY on 535k rows)', async () => { await page.keyboard.press('Enter'); await sleep(1500); }, { runs: 1 });
        await H.askTimed(page, 'SELECT * FROM inventory WHERE qty > 2500', 'a big answer to scroll');
        await over('#output');
        await M('ask', 'scrolling the answer (60 notches)', () => wheel(60, 600, 20));
        await click(page, '#backBtn').catch(() => {}); await sleep(400);
    }

    if (want('checks')) {
        await H.tab(page, 'dashboard');
        await M('checks', 'Checks opens (suggested list), closes', async () => { await click(page, '#checksBtn'); await sleep(600); await click(page, '#checksClose'); await sleep(400); });
        await click(page, '#checksBtn'); await sleep(600);
        note('   checks listed: ' + (await page.locator('#checksList > *').count()));
        const t0 = Date.now();
        await H.startRec(page);
        await click(page, '#checksRun');
        let words = '';
        for (let i = 0; i < 600; i++) { await sleep(50); words = await page.locator('#checksNote').innerText().catch(() => ''); const off = await page.locator('#checksRun').isDisabled(); if (!off && i > 3 && !/Running|Checking/i.test(words)) break; }
        const r = await H.stopRec(page);
        note('LOAD  Checks: Run all on 535k rows: ' + (Date.now() - t0) + ' ms | ' + JSON.stringify(r) + ' | ' + JSON.stringify(words));
        out.push(Object.assign({ group: 'checks', name: 'checks: Run all on 535k rows (a load)', loadMs: Date.now() - t0, pass: r.longMax <= 50 }, r));
        note('   results: ' + JSON.stringify((await page.locator('#checksList').innerText()).replace(/\n+/g, ' | ').slice(0, 500)));
        await page.screenshot({ path: path.join(H.SHOTS, 'frames-checks-' + TAG + '.png') });
        const show = page.locator('#checksList button', { hasText: /Show/ }).first();
        if (await show.count()) await M('checks', 'Show on a check -> the Sheet', async () => { await click(page, show, { name: 'Show' }); await sleep(1500); }, { runs: 1 });
        else note('   no Show button (no failed check on this file)');
        await H.tab(page, 'dashboard');
        await M('checks', 'Ask closes Checks, Checks closes Ask', async () => { await click(page, '#checksBtn'); await sleep(450); await click(page, '#queryBtn'); await sleep(450); await click(page, '#checksBtn'); await sleep(450); await page.keyboard.press('Escape'); await sleep(300); });
    }

    if (want('theme')) {
        await M('theme', 'the theme chip opens its menu, closes', async () => { await click(page, '#themeChip'); await sleep(500); await page.keyboard.press('Escape'); await sleep(400); });
        const pick = async (name) => { await click(page, '#themeChip'); await sleep(450); await click(page, page.locator('#themeList button, #themeList [role=menuitemradio], #themeList > *', { hasText: name }).first(), { name }); await sleep(600); };
        await M('theme', 'switch to Neo-Dark', () => pick('Neo-Dark'), { runs: 1 });
        await page.screenshot({ path: path.join(H.SHOTS, 'frames-dark-' + TAG + '.png') });
        await M('theme', 'switch to Neo-Neutral', () => pick('Neo-Neutral'), { runs: 1 });
    }

    if (want('lock')) {
        await M('lock', 'Lock (535k rows open), then the PIN', async () => { await click(page, '#vaultChip'); await sleep(700); await H.pin(page, '4827'); await sleep(500); }, { runs: 2 });
        note('   after unlock: ' + JSON.stringify(await H.state(page)));
        await M('lock', 'the auto-lock timer select (arrow keys)', async () => { await page.locator('#vaultTimer').focus(); await page.keyboard.press('ArrowUp'); await sleep(250); await page.keyboard.press('ArrowDown'); await sleep(250); }, { runs: 1 });
    }

    fs.writeFileSync(path.join(H.ROOT, 'out', 'frames-staff-' + TAG + (only.length ? '-' + only.join('_') : '') + '.json'), JSON.stringify(out, null, 1));
    note('SUMMARY frames staff (' + TAG + '): ' + out.filter((r) => r.pass).length + ' of ' + out.length + ' within budget');
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); try { await page.screenshot({ path: path.join(H.SHOTS, 'frames-STOPPED.png') }); } catch (x) {} fs.writeFileSync(path.join(H.ROOT, 'out', 'frames-staff-' + TAG + '-partial.json'), JSON.stringify(out, null, 1)); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
