// C2: the IT console draws only what changed.   Does every change still SHOW, and only on the rows it touched?   node it-rows-check.js
//   Before each change, every row of the people table gets a mark (a JS property).   After it, a row without the mark was built again.
const D = require('./deskhelp');
const { click, type, sleep, path, note, C } = D;
let fails = 0;
function expect(what, ok, got) { if (!ok) fails++; note((ok ? 'PASS  ' : 'FAIL  ') + what + (got === undefined ? '' : '   -> ' + JSON.stringify(got).slice(0, 300))); }

(async () => {
    note('==== C2: the people table still shows every change ====');
    const app = await D.startApp('it'); const page = app.page; await sleep(500);
    const open = async () => {
        await click(page, '#open-file'); await D.dialog(app, 'file', path.join(D.WORLD, 'hundred.flogic-keyring'));
        await type(page, '#open-pass', D.PASS); await page.keyboard.press('Enter');
        await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(500);
    };
    await open();
    const mark = () => page.evaluate(() => { for (const tr of document.querySelectorAll('#person-list tr')) tr.__mark = 1; });
    const rebuilt = () => page.evaluate(() => Array.from(document.querySelectorAll('#person-list tr')).filter((tr) => !tr.__mark).map((tr) => tr.id));
    const row = (id) => page.locator('#person-' + id).innerText();
    const ids = () => page.evaluate(() => Array.from(document.querySelectorAll('#person-list tr')).map((tr) => tr.id.replace('person-', '')));
    const firstIds = await ids();
    expect('100 rows, in the keyring order', firstIds.length === 100 && firstIds[0] === 'u-0001' && firstIds[99] === 'u-0100', [firstIds.length, firstIds[0], firstIds[99]]);

    // 1. edit a person: new name and level
    await mark();
    await click(page, '#edit-u-0005'); await sleep(250);
    await C.setPerson(page, 'Renamed Rowcheck', 'Analyst', null, null);
    let t = await row('u-0005');
    expect('edit: the row shows the new name and level', /Renamed Rowcheck/.test(t) && /Analyst/.test(t), t.replace(/\s+/g, ' ').slice(0, 120));
    expect('edit: only that row was built again', JSON.stringify(await rebuilt()) === '["person-u-0005"]', await rebuilt());

    // 2. rename a group: every person in it shows the new name
    const hrBefore = await page.evaluate(() => Array.from(document.querySelectorAll('#person-list tr')).filter((tr) => / HR(,|$)|^HR(,|$)/m.test(tr.children[2].textContent)).map((tr) => tr.id));
    await mark();
    await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit HR' }); await sleep(200);
    await type(page, '#g-label', 'People Ops'); await click(page, '#g-add'); await sleep(300);
    const hrAfter = await page.evaluate(() => Array.from(document.querySelectorAll('#person-list tr')).filter((tr) => /People Ops/.test(tr.children[2].textContent)).map((tr) => tr.id));
    const rb = await rebuilt();
    expect('group rename: every HR person now shows "People Ops"', hrBefore.length > 0 && JSON.stringify(hrBefore) === JSON.stringify(hrAfter), [hrBefore.length, hrAfter.length]);
    expect('group rename: exactly those rows were built again', JSON.stringify(rb.slice().sort()) === JSON.stringify(hrAfter.slice().sort()), [rb.length, hrAfter.length]);
    const dl = await page.locator('#data-list').innerText();
    expect('group rename: the data list shows it too', /People Ops/.test(dl) && !/^HR\b/m.test(dl), dl.slice(0, 80));
    const pl = await page.locator('#pack-list').innerText();
    expect('group rename: the packs table shows it too', /People Ops/.test(pl) && !/(^|\t| \+ )HR(\t| \+ )/m.test(pl), pl.split('\n').filter((l) => /People Ops|HR/.test(l)).slice(0, 2));
    // and a rules-only edit changes no person row
    await mark();
    await click(page, page.locator('#group-list button[data-group=hr]'), { name: 'Edit People Ops' }); await sleep(200);
    await type(page, '#g-autolock', '13'); await click(page, '#g-add'); await sleep(300);
    expect('group minutes only: no person row built again', (await rebuilt()).length === 0, await rebuilt());
    expect('group minutes only: the groups table shows 13 min', /People Ops\s+hr\s+\S+\s+13 min/.test(await page.locator('#group-list').innerText()), (await page.locator('#group-list').innerText()).replace(/\s+/g, ' ').slice(0, 200));

    // 3. End access: two clicks
    await mark();
    await click(page, '#end-u-0007'); await sleep(150); await click(page, '#end-u-0007'); await sleep(300);
    const gone = await page.evaluate(() => { const tr = document.getElementById('person-u-0007'); return { cls: tr.className, end: !!tr.querySelector('#end-u-0007'), still: tr.querySelector('#review-u-0007').textContent }; });
    expect('End access: the row turns grey, loses its End button, offers "Give access back"', gone.cls === 'gone' && !gone.end && gone.still === 'Give access back', gone);
    expect('End access: only that row was built again', JSON.stringify(await rebuilt()) === '["person-u-0007"]', await rebuilt());

    // 4. Make key file (no folder: it downloads)
    const keyBefore = await page.locator('#status-u-0008').innerText();
    await mark();
    await D.download(page, () => click(page, '#make-u-0008'));
    await sleep(400);
    const keyAfter = await page.locator('#status-u-0008').innerText();
    expect('Make key file: the key column changes', keyAfter !== keyBefore, [keyBefore, keyAfter]);
    expect('Make key file: the button is on again', await page.locator('#make-u-0008').isEnabled());
    expect('Make key file: only that row was built again', JSON.stringify(await rebuilt()) === '["person-u-0008"]', await rebuilt());

    // 5. add a person: a new row, last
    await mark();
    await C.setPerson(page, 'Newest Rowcheck', 'Viewer', ['finance'], null);
    const after = await ids();
    expect('add: 101 rows, the new one last, nothing else moved', after.length === 101 && JSON.stringify(after.slice(0, 100)) === JSON.stringify(firstIds), [after.length, after[100]]);
    expect('add: only the new row was built', (await rebuilt()).length === 1 && /Newest Rowcheck/.test(await page.locator('#person-list tr').last().innerText()), await rebuilt());
    const counts = await page.locator('#keyring-counts').innerText();
    expect('add: the counts say 101 people', /101 people/.test(counts), counts);

    // 6. Lock (twice: unsaved), open the same keyring again: a clean table, from the file
    await click(page, '#lock-btn'); await sleep(200); await click(page, '#lock-btn'); await sleep(400);
    await open();
    const again = await ids();
    t = await row('u-0005');
    expect('reopened: 100 rows from the file, none left over from before', again.length === 100 && !/Renamed Rowcheck/.test(t) && !/People Ops/.test(await page.locator('#person-list').innerText()), [again.length, t.replace(/\s+/g, ' ').slice(0, 60)]);

    note(fails ? fails + ' FAILED' : 'ALL PASS');
    await app.close();
    process.exit(fails ? 1 : 0);
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
