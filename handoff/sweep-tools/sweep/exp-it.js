// An experiment (diagnosis only): what makes the console's redraw slow with 100 people?  Try CSS variants, measure each.
const D = require('./deskhelp');
const { click, type, sleep, path, note } = D;
(async () => {
    const app = await D.startApp('it'); const page = app.page; await sleep(500);
    await click(page, '#open-file'); await D.dialog(app, 'file', path.join(D.WORLD, 'hundred.flogic-keyring'));
    await type(page, '#open-pass', D.PASS); await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(600);
    const work = async () => { for (let i = 0; i < 4; i++) { await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit HR' }); await sleep(150); await type(page, '#g-autolock', String(11 + i)); await click(page, '#g-add'); await sleep(300); } };
    const variants = [
        ['as it is', ''],
        ['cards without the blur', '.card { backdrop-filter: none !important; }'],
        ['cards: contain layout paint', '.card { contain: layout paint; }'],
        ['buttons without the transition', 'button { transition: none !important; }'],
        ['no blur + no button shadows', '.card { backdrop-filter: none !important; } button { box-shadow: none !important; }'],
    ];
    for (const [name, css] of variants) {
        const rules = css.split('}').map((s) => s.trim()).filter(Boolean).map((s) => s + '}');
        const n = await page.evaluate((rules) => { const sh = Array.from(document.styleSheets).find((s) => /itconsoleI/.test(s.href || '')); for (const r of rules) sh.insertRule(r, sh.cssRules.length); return rules.length; }, rules);
        await sleep(500);
        await D.startRec(page); await work(); const r = await D.stopRec(page);
        note('EXPERIMENT  ' + name.padEnd(34) + JSON.stringify({ max: r.max, over33: r.over33, longTasks: r.longTasks, longMax: r.longMax, overPct: r.overPct }));
        if (name === 'as it is' || name === 'cards without the blur') { await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await page.screenshot({ path: path.join(D.SHOTS, 'exp-it-' + name.replace(/\W+/g, '_') + '.png') }); }
        await page.evaluate((n) => { const sh = Array.from(document.styleSheets).find((s) => /itconsoleI/.test(s.href || '')); for (let i = 0; i < n; i++) sh.deleteRule(sh.cssRules.length - 1); }, n);
    }
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
