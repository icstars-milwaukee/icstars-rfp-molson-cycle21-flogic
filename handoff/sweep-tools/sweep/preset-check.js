// PRESET DATA, in the real windows:  IT packs a small file "for key files", makes the key file,
// and the staff app opens that data BY ITSELF at sign-in.     node preset-check.js
//   Run after sec7-it.js and sec7-staff.js (it uses their keyring, IT folder and Dana's laptop copy, PIN 4827),
//   with a staff sweep build made with -Trust.   Made-up data only.
const D = require('./deskhelp');
const H = require('./staffhelp');
const { click, type, sleep, path, note, fs, expect } = D;
const itDir = path.join(D.DRIVE, 'sweep-it');
const keyPath = path.join(itDir, 'u-0001', 'flogic.flogic-key');
const store = path.join(process.env.LOCALAPPDATA, 'org.icstars.flogic', 'staff');
const OPS = path.join(D.ROOT, '..', 'demo', 'data', 'ops_tickets_2026.csv');
let fails = 0;
function ok(what, good, got) { if (!expect(what, good, got)) fails++; }
const msg = (page, id) => page.locator('#' + id).innerText();

async function packOne(app, file, preset) {
    const page = app.page;
    await click(page, '#p-file');
    await D.dialog(app, 'file', file);
    await sleep(500);
    await click(page, page.locator('#p-queue tr').first().locator('input[id$="-for-finance"]'), { name: 'Finance' });
    if (preset) await click(page, '#p-preset');
    await click(page, '#p-btn');
    let m = '';
    for (let i = 0; i < 200; i++) { await sleep(150); m = await msg(page, 'pack-msg'); if (m.startsWith('Packed ') || m.includes('packed:')) break; }
    return m;
}

// The PIN, then whatever the app asks (the folder's "Allow" prompt, when it wants to read the key file again), until the card is gone.
async function signIn(app, pinId, twice) {
    const page = app.page;
    await type(page, pinId, '4827');
    if (twice) { await page.keyboard.press('Tab'); await page.keyboard.type('4827', { delay: 25 }); }
    await page.keyboard.press('Enter');
    const allow = D.dialog(app, 'allow');
    for (let i = 0; i < 200; i++) { if (await page.locator('#vaultCard').isHidden()) break; await sleep(100); }
    const prompt = await allow;
    return { inNow: await page.locator('#vaultCard').isHidden(), prompt };
}
// What's on screen about the open file, once it has settled (or after  wait  ms with nothing opening).
async function settled(page, wait) {
    let s = {};
    const t0 = Date.now();
    while (Date.now() - t0 < wait) {
        s = await H.state(page);
        if (s.reading && !s.loader && Date.now() - t0 > 1200) break;
        await sleep(150);
    }
    s.tag = await page.locator('#vaultTag').innerText().catch(() => '');
    s.presets = await page.evaluate(() => { const b = document.getElementById('vaultPresets'); return !b || b.hidden ? null : Array.from(b.querySelectorAll('button')).map((x) => x.textContent); });
    return s;
}

(async () => {
    note('==== preset data: IT packs it into key files, the app opens it at sign-in ====');

    // ---------- IT ----------
    fs.rmSync(path.join(process.env.LOCALAPPDATA, 'org.icstars.flogic', 'it'), { recursive: true, force: true });      // (a fresh profile: the plain first-time folder prompt)
    let app = await D.startApp('it'); let page = app.page; await sleep(500);
    await click(page, '#open-file'); await D.dialog(app, 'file', path.join(D.WORLD, 'sweep.flogic-keyring'));
    await type(page, '#open-pass', D.PASS); await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 }); await sleep(900);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('#main > section.card')).map((s) => s.id));
    ok('the console\'s sections are in make order', order.join() === 'today,groups,people,folder,pack,access,data,levels,signer', order);
    if (!(await msg(page, 'folder-status')).startsWith('Connected')) { await D.pickFolder(app, '#connect-folder', itDir); }
    ok('IT\'s folder is connected', (await msg(page, 'folder-status')).startsWith('Connected'), await msg(page, 'folder-status'));
    ok('the size limit is said next to the tick box', (await page.locator('#p-preset-max').innerText()) === '180.0 KB', await page.locator('#p-preset-max').innerText());

    let m = await packOne(app, OPS, true);
    ok('a small file packed "for key files"', m.includes('In key files now: ops_tickets_2026.flogic') && fs.existsSync(path.join(itDir, 'packs', 'finance', 'ops_tickets_2026.flogic')), m.slice(0, 260));
    ok('it shows under "In key files"', (await page.locator('#preset-list tr').count()) === 1 && (await page.locator('#preset-list').innerText()).includes('ops_tickets_2026.flogic'), (await page.locator('#preset-list').innerText()).replace(/\s+/g, ' '));
    ok('the tick box clears itself after packing', !(await page.locator('#p-preset').isChecked()));

    m = await packOne(app, path.join(D.DATA, 'five_sheets.xlsx'), true);
    ok('a file too big for key files is still packed, and IT is told why', m.startsWith('Packed 1 file') && m.includes('Not in key files') && m.includes('too big for key files') && (await page.locator('#preset-list tr').count()) === 1, m.slice(0, 300));

    m = await packOne(app, path.join(D.DATA, 'batch20', 'batch_01.csv'), true);
    ok('a second small one rides too', (await page.locator('#preset-list tr').count()) === 2, m.slice(0, 160));
    await click(page, '#preset-out-0'); await sleep(400);
    ok('"Take out" takes the newest one out again', (await page.locator('#preset-list tr').count()) === 1 && (await page.locator('#preset-list').innerText()).includes('ops_tickets_2026') && (await msg(page, 'preset-msg')).includes('no longer rides'), await msg(page, 'preset-msg'));

    await click(page, '#make-u-0001');
    for (let i = 0; i < 100; i++) { await sleep(150); m = await msg(page, 'issue-msg'); if (m.startsWith('Put ')) break; }
    ok('Dana\'s new key file carries it, and IT is told', m.includes('It carries ops_tickets_2026.flogic'), m.slice(0, 260));
    const onDisk = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    ok('the key file in her folder holds one pack and fits the limit', Array.isArray(onDisk.packs) && onDisk.packs.length === 1 && fs.statSync(keyPath).size <= 256 * 1024 && typeof JSON.parse(onDisk.claims).packs === 'string', fs.statSync(keyPath).size + ' bytes');

    const ring = await D.download(page, () => click(page, '#save-btn'));
    for (let i = 0; i < 60; i++) { m = await msg(page, 'keyring-msg'); if (m.startsWith('Saved ')) break; await sleep(100); }
    const saved = JSON.parse(fs.readFileSync(ring, 'utf8'));
    ok('the keyring saves with its preset inside', m.startsWith('Saved ') && Array.isArray(saved.presets) && saved.presets.length === 1 && fs.statSync(ring).size < 1024 * 1024, fs.statSync(ring).size + ' bytes');
    fs.copyFileSync(ring, path.join(D.WORLD, 'sweep.flogic-keyring'));
    await page.screenshot({ path: path.join(D.SHOTS, 'preset-it.png'), fullPage: true });
    await app.close();

    // ---------- staff: a FIRST sign-in on a new laptop (nothing stored yet) ----------
    fs.rmSync(store, { recursive: true, force: true });
    app = await D.startApp('staff'); page = app.page; await sleep(600);
    await click(page, '#vaultConnect');
    const picked = await D.dialog(app, 'folder', path.join(itDir, 'u-0001'));
    await sleep(1200);
    let r = await signIn(app, '#vaultPin1', true);
    let s = await settled(page, 15000);
    ok('FIRST sign-in on a new laptop: the data from the key file is on screen, by itself', r.inNow && s.reading === 'ops_tickets_2026.csv' && s.hash === '#dashboard' && !s.loader, { picked: picked.slice(0, 70), reading: s.reading, hash: s.hash, status: s.status, note: s.note });
    ok('...as a locked Finance pack, with its button under "Reading from"', s.tag.includes('Finance') && Array.isArray(s.presets) && s.presets.join() === 'ops_tickets_2026.csv', { tag: s.tag, presets: s.presets });
    await sleep(800);
    await page.screenshot({ path: path.join(D.SHOTS, 'preset-staff-first-sign-in.png') });

    // open something else, then get the preset back with its button
    await H.tab(page, 'sheet');
    await D.chooseFiles(page, '#chooseBtn', [path.join(D.ROOT, 'fake', 'change_request.csv')]);
    await sleep(1500);
    s = await settled(page, 8000);
    const other = s.reading;
    await H.tab(page, 'sheet');
    await click(page, '#vaultPreset0'); await sleep(600);
    s = await settled(page, 10000);
    ok('another file opened, then the button of the preset brings it back', other === 'change_request.csv' && s.reading === 'ops_tickets_2026.csv' && s.tag.includes('Finance'), { other, reading: s.reading, tag: s.tag });

    await click(page, '#vaultChip'); await sleep(700);
    s = await settled(page, 1500);
    ok('Lock: the data and its button are gone', !(await page.locator('#vaultCard').isHidden()) && s.reading === '' && s.presets === null, { reading: s.reading, presets: s.presets });

    // ---------- the same laptop, PIN only: the app reads the key file from the remembered folder again ----------
    r = await signIn(app, '#vaultPin', false);
    s = await settled(page, 15000);
    ok('PIN sign-in on the same laptop: it opens by itself again', r.inNow && s.reading === 'ops_tickets_2026.csv', { r, reading: s.reading, note: s.note });
    await app.close();
    const kept = fs.readdirSync(store, { recursive: true }).filter((f) => String(f).includes('ops_tickets')).length;
    ok('nothing named after the data is in the storage of the app', kept === 0, kept);

    // ---------- someone edits the key file in the drive folder: a first sign-in with it ----------
    const good = fs.readFileSync(keyPath, 'utf8');
    try {
        const k = JSON.parse(good); const d = k.packs[0].data;
        k.packs[0].data = d.slice(0, 60) + (d[60] === 'A' ? 'B' : 'A') + d.slice(61);
        fs.writeFileSync(keyPath, JSON.stringify(k, null, 2));
        fs.rmSync(store, { recursive: true, force: true });
        app = await D.startApp('staff'); page = app.page; await sleep(600);
        await click(page, '#vaultConnect');
        await D.dialog(app, 'folder', path.join(itDir, 'u-0001'));
        await sleep(1200);
        r = await signIn(app, '#vaultPin1', true);
        s = await settled(page, 4000);
        ok('the data changed in the folder: sign-in still works, the data is NOT opened', r.inNow && s.reading === '' && s.presets === null, { r, reading: s.reading, presets: s.presets });
        await app.close();
    } finally { fs.writeFileSync(keyPath, good); }

    note(fails ? fails + ' FAILED' : 'ALL PASS');
    process.exit(fails ? 1 : 0);
})().catch(async (e) => { note('STOPPED ' + e.stack); for (const p of D.flogicProcs()) D.stopApp(p.pid); process.exit(1); });
