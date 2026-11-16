// Where does refresh() spend its time with 100 people?
const D = require('./deskhelp'); const P = require('./proflib');
const { click, type, sleep, path, note } = D;
P.setTag(process.argv[2] || 'base');
(async () => {
    const app = await D.startApp('it'); const page = app.page; await sleep(500);
    await click(page, '#open-file'); await D.dialog(app, 'file', path.join(D.WORLD, 'hundred.flogic-keyring'));
    await type(page, '#open-pass', D.PASS); await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(600);
    await P.prof(page, 'IT edit a group x5 (refresh with 100 people)', async () => {
        for (let i = 0; i < 5; i++) { await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit HR' }); await sleep(150); await type(page, '#g-autolock', String(11 + i)); await click(page, '#g-add'); await sleep(300); }
    });
    note('   DOM nodes: ' + (await page.evaluate(() => document.querySelectorAll('*').length)) + ' | buttons ' + (await page.evaluate(() => document.querySelectorAll('button').length)));
    await app.close();
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
