// What an IT person does in the console, with real input.
const A = require('./applib');
const { click, type, typeDate, chooseFile, text, waitMsg, waitDownload, sleep, path, fs, note } = A;
const PASS = 'correct horse battery staple';

async function newKeyring(page, pass) {
    await type(page, '#new-pass', pass || PASS);
    await type(page, '#new-pass2', pass || PASS);
    await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 });
}

async function openKeyring(page, file, pass) {
    await chooseFile(page, '#open-file', file);
    await type(page, '#open-pass', pass || PASS);
    await page.keyboard.press('Enter');
    await page.locator('#main').waitFor({ state: 'visible', timeout: 30000 });
    await sleep(300);
}

// A real <select>, with the keyboard: click it, close the list, Home, then arrow down.
async function selectIndex(page, sel, index) {
    await click(page, sel);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
}

async function addGroup(page, name, id, mins, canExport) {
    await type(page, '#g-label', name);
    if (id !== null) await type(page, '#g-id', id);
    await type(page, '#g-autolock', String(mins));
    const on = await page.locator('#g-export').isChecked();
    if (on !== canExport) await click(page, '#g-export');
    await click(page, '#g-add');
    return (await waitMsg(page, '#group-msg')).words;
}

async function tickGroups(page, groups) {
    const boxes = page.locator('#c-groups input[type=checkbox]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
        const b = boxes.nth(i);
        const v = await b.getAttribute('value');
        if ((await b.isChecked()) !== groups.includes(v)) await click(page, b, { name: 'group box ' + v });
    }
}

// Fill the person form and press its button (Add person / Save changes).
async function setPerson(page, name, levelLabel, groups, lastDay) {
    if (name !== null) await type(page, '#c-name', name);
    if (levelLabel) await selectIndex(page, '#pp-level', { Guest: 0, Viewer: 1, Analyst: 2 }[levelLabel]);
    if (groups) await tickGroups(page, groups);
    if (lastDay) await typeDate(page, '#c-expires', lastDay);
    await click(page, '#c-btn');
    await sleep(200);
    return text(page, '#person-msg');
}

// Pack one file for the group at this place in the list.  -> { words, ms, file (the .flogic, or null) }
async function pack(page, file, groupIndex, timeout) {
    await chooseFile(page, '#p-file', file);
    await selectIndex(page, '#p-group', groupIndex);
    const t0 = Date.now();
    let dl = null;
    const got = page.waitForEvent('download', { timeout: timeout || 120000 }).then((d) => { dl = d; }).catch(() => {});
    await click(page, '#p-btn');
    let words = '', sawWorking = false, frozenMs = 0;
    for (;;) {
        const t1 = Date.now();
        words = await text(page, '#pack-msg');
        const took = Date.now() - t1;
        if (took > frozenMs) frozenMs = took;                    // how long the page took to answer us at all
        if (/^Working/.test(words)) sawWorking = true;
        else if (words) break;
        if (Date.now() - t0 > (timeout || 120000)) break;
        await sleep(100);
    }
    const ms = Date.now() - t0;
    let out = null;
    if (/^Packed/.test(words)) {
        await got;
        if (dl) {
            const dir = path.join(A.DL, 'packs');
            fs.mkdirSync(dir, { recursive: true });
            out = path.join(dir, dl.suggestedFilename());
            await dl.saveAs(out);
        }
    }
    return { words, ms, file: out, sawWorking, frozenMs };
}

async function saveKeyring(page, to) {
    const f = await waitDownload(page, () => click(page, '#save-btn'));
    await waitMsg(page, '#keyring-msg');
    fs.copyFileSync(f, to);
    return to;
}

// The folder: remembered from before (same browser session), or picked again.
async function pickFolderIfAsked(ctx, page, folder) {
    await sleep(900);
    if (await page.locator('#connect-folder').isVisible()) return A.pickFolder(ctx, page, '#connect-folder', folder);
    return 'remembered';
}

function claimsIn(file) { return JSON.parse(JSON.parse(fs.readFileSync(file, 'utf8')).claims); }

module.exports = Object.assign({}, A, { PASS, newKeyring, openKeyring, selectIndex, addGroup, tickGroups, setPerson, pack, saveKeyring, claimsIn, pickFolderIfAsked });
