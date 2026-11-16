// Section 7, the staff app: does it work at all?
const D = require('./deskhelp');
const { click, type, sleep, path, note, fs, expect } = D;
const itDir = path.join(D.DRIVE, 'sweep-it');
const store = path.join(process.env.LOCALAPPDATA, 'org.icstars.flogic', 'staff');

async function cardWords(page) { return page.locator('#vaultCard .vault-box').innerText().catch(() => ''); }
async function waitIn(page) { for (let i = 0; i < 100; i++) { if (await page.locator('#vaultCard').isHidden()) return true; await sleep(100); } return false; }
async function openFile(page, file) {
    if (!(await page.locator('#chooseBtn').isVisible())) await click(page, '#tab-sheet');
    await D.chooseFiles(page, '#chooseBtn', [file]);
    let last = {};
    for (let i = 0; i < 150; i++) {
        await sleep(150);
        last = await page.evaluate(() => ({ hash: location.hash, note: (document.getElementById('vaultNote') || {}).hidden === false ? document.getElementById('vaultNote').innerText : '', reading: document.getElementById('readingFrom').hidden ? '' : document.getElementById('readingFrom').innerText, status: document.getElementById('status').innerText, loader: !document.getElementById('loader').hidden }));
        if (last.note || (last.reading && !last.loader && i > 4)) break;
    }
    return last;
}

(async () => {
    note('==== section 7: Flogic (staff, desktop) ====');
    if (!process.argv.includes('--keep')) fs.rmSync(store, { recursive: true, force: true });          // a first run: no storage yet
    let app = await D.startApp('staff');
    let page = app.page;
    note('window: ' + D.win(app, 'rect') + ' | card: ' + JSON.stringify((await cardWords(page)).slice(0, 160)));
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-staff-01-card.png') });

    // 1. sign in with a key file (the folder IT shared)
    await click(page, '#vaultConnect');
    const out = await D.dialog(app, 'folder', path.join(itDir, 'u-0001'));
    await sleep(1200);
    let card = await cardWords(page);
    expect('1. the folder picker opens in the app, and the key file is read', /Hi, Dana Desk/.test(card), { out, card: card.slice(0, 80) });
    await type(page, '#vaultPin1', '4827'); await page.keyboard.press('Tab'); await page.keyboard.type('4827', { delay: 25 }); await page.keyboard.press('Enter');
    expect('   signed in with a new PIN', await waitIn(page), await page.locator('#vaultChip').innerText().catch(() => ''));

    // 2. a pack, and a plain file
    let o = await openFile(page, path.join(itDir, 'packs', 'finance', 'incident.flogic'));
    expect('2. a signed pack opens, and lands on the Dashboard', /incident\.csv/.test(o.reading) && o.hash === '#dashboard', o);
    await sleep(1500);
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-staff-02-pack.png') });
    o = await openFile(page, path.join(itDir, 'packs', 'hr', 'five_sheets.flogic'));
    note('   a Finance+HR pack, opened by someone in Finance only: ' + JSON.stringify(o));
    o = await openFile(page, path.join(D.ROOT, 'fake', 'change_request.csv'));
    expect('   a plain file opens, tagged "not locked"', /change_request\.csv/.test(o.reading) && /not locked/.test(o.reading), o);

    // 3. export (Dana is an Analyst in Finance)
    o = await openFile(page, path.join(itDir, 'packs', 'finance', 'finance_ledger_2026.flogic'));
    await sleep(1500);
    const eb = page.locator('button', { hasText: 'Export report' }).first();
    expect('3. Export report is on for an Analyst in Finance', !(await eb.isDisabled()), await page.locator('#dash-why').innerText().catch(() => ''));
    await click(page, eb, { name: 'Export report' });
    const numbers = await D.download(page, () => click(page, page.locator('button', { hasText: /Download the numbers/ }).first(), { name: 'Download the numbers' }));
    expect('   the numbers file downloads', fs.statSync(numbers).size > 50 && /Tile,Column,Value/.test(fs.readFileSync(numbers, 'utf8')), path.basename(numbers));
    await click(page, '#queryBtn');
    await sleep(500);
    if (!(await page.locator('#queryType').isChecked())) await click(page, '#queryType');
    await type(page, '#querySql', "SELECT * FROM ledger WHERE department = 'Finance'", { delay: 8 });
    await page.keyboard.press('Enter');
    await sleep(1500);
    if (!(await page.locator('#queryExport').isVisible())) await click(page, '#queryBtn');
    await sleep(500);
    const csv = await D.download(page, () => click(page, '#queryExport'));
    const lines = fs.readFileSync(csv, 'utf8').trim().split(/\r?\n/).length;
    expect('   Save as CSV downloads the answer (99 rows + header)', lines === 100, { file: path.basename(csv), lines });
    note('   where a download lands without Playwright: see the manual check in the report');

    // 4. Lock
    await page.keyboard.press('Escape');
    await click(page, '#vaultChip');
    await sleep(600);
    card = await cardWords(page);
    const body = await page.locator('body').innerText();
    expect('4. Lock: the card is back, the data is off the page', /Dana Desk/.test(card) && /PIN/.test(card) && !/vendor, net 30/.test(body), card.slice(0, 80));

    // keyboard and the title bar
    const seen = [];
    for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName + ':' + (document.activeElement.innerText || '').slice(0, 14)))); }
    expect('   Tab on the card never lands on the title bar\'s buttons (or behind the card)', !seen.some((s) => /^flogic(Min|Max|Close)$|^chooseBtn$|^tab-/.test(s)), seen.slice(0, 10));

    // 5. close and reopen: the laptop copy is remembered
    await click(page, '#flogicClose');
    await sleep(1500);
    expect('5. X closes the staff app at once (nothing unsaved)', !D.alive(app) && D.flogicProcs().length === 0, D.flogicProcs());
    try { await app.browser.close(); } catch (e) {}
    expect('   the app keeps its own storage under %LOCALAPPDATA%\\org.icstars.flogic\\staff', fs.existsSync(store), store);
    app = await D.startApp('staff');
    page = app.page;
    await sleep(800);
    card = await cardWords(page);
    expect('   reopened: Dana is remembered, and only the PIN is asked', /Dana Desk/.test(card) && /PIN/.test(card) && !/Connect your Flogic folder/.test(card), card.slice(0, 100));
    await type(page, '#vaultPin', '4827'); await page.keyboard.press('Enter');
    expect('   the PIN signs in', await waitIn(page), await page.locator('#vaultChip').innerText().catch(() => ''));
    // dark theme
    await click(page, '#themeChip');
    await sleep(500);
    const themes = await page.locator('#themeList button, #themeList [role=menuitem], #themeList > *').allInnerTexts();
    note('   themes offered: ' + JSON.stringify(themes));
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-staff-03-theme-menu.png') });
    await page.keyboard.press('Escape');
    await app.close();
    expect('   nothing of ours is left running', D.flogicProcs().length === 0, D.flogicProcs());
    note('section 7 staff done');
})().catch(async (e) => { note('STOPPED ' + e.stack); try { await global.__lastPage.screenshot({ path: path.join(D.SHOTS, 'sec7-staff-STOPPED.png') }); } catch (x) {} for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
