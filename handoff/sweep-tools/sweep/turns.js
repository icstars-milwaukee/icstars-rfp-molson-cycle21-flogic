// 6b: the four turns, with real clicks in the desktop window: which side each station comes in from (its class, read
// mid-turn), a screenshot mid-turn, what's left turned at rest, focus mode and the drawer right after a turn.
const H = require('./staffhelp');
const { click, sleep, path, note, fs, expect } = H;
(async () => {
    note('==== 6b: the carousel, Dashboard in the center ====');
    const app = await H.startApp('staff'); const page = app.page;
    await sleep(600); await H.pin(page, '4827');
    await H.openTimed(app, path.join(H.ROOT, '..', 'demo', 'data', 'big_warehouse.sql'), '535k'); await sleep(1200);
    const tabs = await page.locator('#stationTabs [role=tab]').allInnerTexts();
    expect('the tabs read Ticket | Dashboard | Sheet', tabs.join(' | ') === 'Ticket | Dashboard | Sheet', tabs);
    expect('a new file still lands on the Dashboard', (await page.evaluate(() => location.hash)) === '#dashboard');
    const shotsDir = path.join(H.SHOTS, 'turns'); fs.mkdirSync(shotsDir, { recursive: true });
    const turn = async (from, to, wantSide) => {
        await H.tab(page, from); await sleep(300);
        await click(page, '#tab-' + to, { after: 0 });
        await sleep(70);
        const mid = await page.evaluate((to) => ({ cls: document.getElementById('station-' + to).className, x: new DOMMatrix(getComputedStyle(document.getElementById('station-' + to)).transform).m41 }), to);
        await page.screenshot({ path: path.join(shotsDir, from + '-to-' + to + '.png') });
        await sleep(450);
        const side = /turn-in-left/.test(mid.cls) ? 'right' : /turn-in-right/.test(mid.cls) ? 'left' : '?';
        const turned = await page.evaluate(() => Array.from(document.querySelectorAll('#stations, .station')).filter((e) => getComputedStyle(e).transform !== 'none').map((e) => e.id));
        expect(from + ' -> ' + to + ': the ' + to + ' comes in from the ' + wantSide + ' (mid-turn it sat ' + Math.round(mid.x) + ' px ' + (mid.x > 0 ? 'right' : 'left') + ' of its place)', side === wantSide && (wantSide === 'right' ? mid.x > 0 : mid.x < 0), mid);
        expect('   nothing stays turned at rest', turned.length === 0, turned);
    };
    await turn('dashboard', 'sheet', 'right');
    await turn('dashboard', 'ticket', 'left');
    await turn('sheet', 'ticket', 'left');
    await turn('ticket', 'sheet', 'right');
    await turn('sheet', 'dashboard', 'left');
    await turn('ticket', 'dashboard', 'right');

    // the keys follow the tabs' order
    await H.tab(page, 'dashboard'); await page.locator('#tab-dashboard').focus();
    const hash = () => page.evaluate(() => location.hash);
    await page.keyboard.press('ArrowRight'); await sleep(450); const r1 = await hash();
    await page.keyboard.press('ArrowLeft'); await sleep(450); await page.keyboard.press('ArrowLeft'); await sleep(450); const l2 = await hash();
    expect('on the tabs: right arrow from the Dashboard is the Sheet, two left arrows back is the Ticket', r1 === '#sheet' && l2 === '#ticket', { r1, l2 });
    const alt = [];
    for (const k of ['Alt+1', 'Alt+2', 'Alt+3']) { await page.keyboard.press(k); await sleep(450); alt.push(await hash()); }
    expect('Alt+1 / 2 / 3 follow the tabs: Ticket, Dashboard, Sheet', alt.join() === '#ticket,#dashboard,#sheet', alt);
    await page.keyboard.press('Alt+ArrowLeft'); await sleep(500); const b1 = await hash();
    await page.keyboard.press('Alt+ArrowRight'); await sleep(500); const f1 = await hash();
    expect('Back, then Forward (Alt+Left / Alt+Right)', b1 === '#dashboard' && f1 === '#sheet', { b1, f1 });

    // right after a turn: focus mode fills the screen, and the drawer sits on the screen
    await H.tab(page, 'dashboard'); await click(page, '#tab-sheet', { after: 0 }); await sleep(380);
    await click(page, '#focusBtn'); await sleep(600);
    const f = await page.evaluate(() => { const r = document.getElementById('output').getBoundingClientRect(); return { focus: document.body.classList.contains('focus'), left: Math.round(r.left), width: Math.round(r.width), iw: innerWidth }; });
    expect('focus mode right after a turn: the grid fills the window edge to edge', f.focus && f.left === 0 && f.width === f.iw, f);
    await page.keyboard.press('Escape'); await sleep(500);
    await H.tab(page, 'dashboard'); await click(page, '#tab-sheet', { after: 0 }); await sleep(380);
    const b = await page.locator('#output').boundingBox();
    await page.mouse.click(b.x + 200, b.y + 120); await sleep(600);
    const d = await page.evaluate(() => { const e = document.getElementById('aimRow'); const r = e.getBoundingClientRect(); return { open: !e.hidden, top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), iw: innerWidth, ih: innerHeight }; });
    expect('the Details drawer right after a turn: on the screen, at the right edge, under the title bar', d.open && d.top >= 32 && Math.abs(d.right - d.iw) <= 20 && d.bottom <= d.ih + 1, d);
    await page.keyboard.press('Escape'); await sleep(300);
    // an answer still turns to the Sheet
    await H.tab(page, 'dashboard');
    await click(page, page.locator('.dash-bar').first(), { name: 'a tile row' }); await sleep(1200);
    expect('a dashboard tile still turns to the Sheet with its answer', (await hash()) === '#sheet' && /ANSWER/.test(await page.locator('#fileBadge').innerText()));
    await app.close();
    // the start: still the Sheet, before any file
    const app2 = await H.startApp('staff'); await sleep(700); await H.pin(app2.page, '4827'); await sleep(400);
    expect('the app still starts on the Sheet, the other two tabs off', (await app2.page.evaluate(() => location.hash)) === '#sheet' && (await app2.page.locator('#tab-dashboard').getAttribute('aria-disabled')) === 'true');
    await app2.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of H.flogicProcs()) H.stopApp(p.pid); process.exit(1); });
