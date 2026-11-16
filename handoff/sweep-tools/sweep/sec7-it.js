// Section 7, the IT app: does it work at all?
const D = require('./deskhelp');
const { click, type, sleep, path, note, fs, expect, C } = D;

(async () => {
    note('==== section 7: Flogic IT (desktop) ====');
    const itDir = path.join(D.DRIVE, 'sweep-it');
    fs.rmSync(itDir, { recursive: true, force: true }); fs.mkdirSync(itDir, { recursive: true });
    const app = await D.startApp('it');
    const page = app.page;
    note('window: ' + D.win(app, 'rect') + ' | viewport ' + JSON.stringify(await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, sw: screen.width, sh: screen.height, availH: screen.availHeight }))));

    // 1. new keyring
    await C.newKeyring(page);
    expect('1. new keyring opens', await page.locator('#main').isVisible(), await page.locator('#keyring-msg').innerText());
    const trust = await D.download(page, () => click(page, '#trust-btn'));
    fs.copyFileSync(trust, path.join(D.WORLD, 'it-signerI.js'));
    expect('   trust file downloads', /FLOGIC_IT_SIGNER = Object\.freeze/.test(fs.readFileSync(trust, 'utf8')), path.basename(trust));

    // 2. groups, a person, a key file into a connected folder
    let m = await C.addGroup(page, 'Finance', null, 15, true);
    m += ' | ' + await C.addGroup(page, 'HR', null, 10, false);
    expect('2. two groups made', (await page.locator('#group-list tr').count()) === 2, m);
    m = await C.setPerson(page, 'Dana Desk', 'Analyst', ['finance'], null);
    expect('   a person added', /Added Dana Desk \(u-0001\) as Analyst/.test(m), m);
    m = await C.setPerson(page, 'Vic Viewer', 'Viewer', ['finance', 'hr'], null);
    const out = await D.pickFolder(app, '#connect-folder', itDir);
    expect('   IT\'s folder connects (showDirectoryPicker really opens)', /Connected: "sweep-it"/.test(await page.locator('#folder-status').innerText()), out);
    await click(page, '#make-u-0001');
    m = (await D.waitMsg(page, '#issue-msg')).words;
    const kf = path.join(itDir, 'u-0001', 'flogic.flogic-key');
    expect('   key file written into the folder', fs.existsSync(kf) && D.C.claimsIn(kf).name === 'Dana Desk', m);
    await click(page, '#make-u-0002');
    await D.waitMsg(page, '#issue-msg', { not: m });

    // 3. pack into packs/<group>/
    await D.chooseFiles(page, '#p-file', [path.join(D.ROOT, 'fake', 'incident.csv'), path.join(D.ROOT, '..', 'demo', 'data', 'finance_ledger_2026.sql'), path.join(D.ROOT, 'data', 'five_sheets.xlsx')]);
    note('   queue: ' + JSON.stringify(await page.locator('#p-queue tr').allInnerTexts()) + ' | ' + (await page.locator('#pack-msg').innerText()));
    await click(page, '#p-btn');
    m = await page.locator('#pack-msg').innerText();
    expect('   Pack with no group ticked is refused, row by row', /need a fix first/.test(m), m);
    await click(page, page.locator('#p-queue tr').nth(0).locator('input[id$="-for-finance"]'), { name: 'row 1 Finance' });
    await click(page, '#p-same');
    // the xlsx is for Finance AND HR
    await click(page, page.locator('#p-queue tr').nth(2).locator('input[id$="-for-hr"]'), { name: 'row 3 HR' });
    note('   row 3 export cell: ' + JSON.stringify(await page.locator('#p-queue tr').nth(2).locator('td').nth(2).innerText()));
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-it-01-pack-list.png') });
    const t0 = Date.now();
    await click(page, '#p-btn');
    m = (await D.waitMsg(page, '#pack-msg', { timeout: 60000 })).words;
    for (let i = 0; i < 100 && /^Packing/.test(m); i++) { await sleep(100); m = await page.locator('#pack-msg').innerText(); }
    const inFin = fs.existsSync(path.join(itDir, 'packs', 'finance')) ? fs.readdirSync(path.join(itDir, 'packs', 'finance')) : [];
    const inHr = fs.existsSync(path.join(itDir, 'packs', 'hr')) ? fs.readdirSync(path.join(itDir, 'packs', 'hr')) : [];
    expect('3. three packs written into packs/<group>/ (' + (Date.now() - t0) + ' ms)', inFin.length === 3 && inHr.length === 1 && inHr[0] === 'five_sheets.flogic', { finance: inFin, hr: inHr, m: m.slice(0, 200) });

    // 4. save
    const ring = await D.download(page, () => click(page, '#save-btn'));
    fs.copyFileSync(ring, path.join(D.WORLD, 'sweep.flogic-keyring'));
    m = await page.locator('#keyring-msg').innerText();
    for (let i = 0; i < 50 && /^Working/.test(m); i++) { await sleep(100); m = await page.locator('#keyring-msg').innerText(); }     // (the download can land before the message changes)
    expect('4. keyring saved (a download)', /^Saved it\.flogic-keyring/.test(m) && fs.statSync(ring).size > 1000, m);
    expect('   the stamp is in the folder', fs.existsSync(path.join(itDir, 'flogic-keyring.stamp')));

    // keyboard: Tab never lands on the title bar's buttons
    await click(page, '#theme-btn');
    const seen = [];
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName))); }
    expect('   Tab (40 presses) never lands on the title bar\'s buttons', !seen.some((s) => /^flogic(Min|Max|Close)$/.test(s)), seen.slice(0, 12));
    // dark theme
    const theme0 = await page.evaluate(() => document.documentElement.dataset.theme);
    await click(page, '#theme-btn');
    const theme1 = await page.evaluate(() => document.documentElement.dataset.theme);
    const barBg = await page.evaluate(() => getComputedStyle(document.getElementById('flogicTitlebar')).backgroundColor + ' / text ' + getComputedStyle(document.getElementById('flogicTitlebar')).color);
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-it-02-dark.png') });
    expect('   the theme button flips ' + theme0 + ' -> ' + theme1 + ', and the title bar follows', theme0 !== theme1, barBg);
    await click(page, '#theme-btn');

    // 5. Close with unsaved changes: the first close only warns  (the X, and the window-close message that Alt+F4 and the taskbar send)
    await C.setPerson(page, 'Una Unsaved', 'Viewer', ['hr'], null);
    expect('5. there are unsaved changes', await page.locator('#unsaved').isVisible());
    await click(page, '#flogicClose');
    await sleep(700);
    let warn = D.alive(app) ? await page.locator('.flogic-tb-note').innerText() : '(the window closed)';
    expect('   X with unsaved changes: the window stays, and warns', D.alive(app) && /Unsaved changes\. Close again to lose them/.test(warn), warn);
    await page.screenshot({ path: path.join(D.SHOTS, 'sec7-it-03-close-warns.png') });
    await sleep(8500);
    warn = await page.locator('.flogic-tb-note').innerText();
    expect('   the warning clears by itself after 8 s', warn === '', warn);
    note('   window-close message: ' + D.win(app, 'close'));
    await sleep(900);
    warn = D.alive(app) ? await page.locator('.flogic-tb-note').innerText() : '(the window closed)';
    expect('   Alt+F4 / taskbar Close (the system close message): first one only warns', D.alive(app) && /Unsaved changes/.test(warn), warn);
    D.win(app, 'close');
    await sleep(1500);
    expect('   a second close within 8 s really closes', !D.alive(app));
    await sleep(800);
    expect('   nothing of ours is left running', D.flogicProcs().length === 0, D.flogicProcs());
    try { await app.browser.close(); } catch (e) {}
    note('section 7 IT done');
})().catch(async (e) => { note('STOPPED ' + e.stack); try { await global.__lastPage.screenshot({ path: path.join(D.SHOTS, 'sec7-it-STOPPED.png') }); } catch (x) {} for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
