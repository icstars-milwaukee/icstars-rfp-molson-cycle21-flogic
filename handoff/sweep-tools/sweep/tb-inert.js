// The title bar while the sign-in card is up:  at first start, and after Lock.
const D = require('./deskhelp');
const { click, type, sleep, path, note, expect } = D;
const TAG = process.argv[2] || '';
const hit = (page) => page.evaluate(() => { const b = document.getElementById('flogicClose').getBoundingClientRect(); const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { inert: document.getElementById('flogicTitlebar').inert, parent: document.getElementById('flogicTitlebar').parentElement.tagName, top: e ? e.tagName + '#' + e.id : null }; });
(async () => {
    note('==== title bar under the sign-in card ' + TAG + ' ====');
    const app = await D.startApp('staff');
    const page = app.page;
    await sleep(800);
    let h = await hit(page);
    expect('at start (card up): the X can be clicked', /flogicClose|svg|path/i.test(h.top), h);
    await type(page, '#vaultPin', '4827'); await page.keyboard.press('Enter');
    for (let i = 0; i < 80 && !(await page.locator('#vaultCard').isHidden()); i++) await sleep(100);
    await click(page, '#vaultChip');
    await sleep(600);
    h = await hit(page);
    expect('after Lock (card up again): the X can still be clicked', /flogicClose|svg|path/i.test(h.top), h);
    await page.screenshot({ path: path.join(D.SHOTS, 'tb-inert-after-lock' + TAG + '.png') });
    // minimize with a real click, then bring it back
    try {
        await click(page, '#flogicMin');
        await sleep(700);
        const r = D.win(app, 'rect');
        expect('after Lock: Minimize works', /,True,(True|False)$/.test(r.replace(/^[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,/, ',')) || r.split(',')[5] === 'True', r);
        D.win(app, 'restore');
        await sleep(600);
        await click(page, '#flogicClose');
        await sleep(1200);
        expect('after Lock: the X closes the window', !D.alive(app));
    } catch (e) { expect('after Lock: the title bar buttons work', false, e.message); }
    if (D.alive(app)) await app.close(); else { try { await app.browser.close(); } catch (e) {} }
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
