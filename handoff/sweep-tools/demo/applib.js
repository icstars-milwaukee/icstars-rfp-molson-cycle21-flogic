// What a person does in the app, with real input.
const L = require('./lib');
const { click, type, chooseFile, shot, text, note, sleep, fs, path } = L;

function useTrust(file) { fs.copyFileSync(file, path.join(L.REPO, 'DIRECTORY/it-signerI.js')); }

async function cardWords(page) { return text(page, '#vaultCard .vault-box'); }
async function problemWords(page) { return text(page, '#vaultCard .vault-problem'); }

// The first screen -> the key-file screen -> "Or open the key file yourself" -> pick the file.
async function offerKeyFile(page, keyFile) {
    await page.locator('#vaultCard').waitFor({ state: 'visible', timeout: 8000 });
    await sleep(400);
    if (!(await page.locator('#vaultKeyFile').count())) {
        const b = page.locator('#vaultCard button', { hasText: /Sign in with your key file|Someone new on this laptop/ });
        if (await b.count()) await click(page, b.first(), { name: 'key file way in' });
    }
    const det = page.locator('#vaultCard details.vault-details');
    if (!(await det.evaluate((d) => d.open))) await click(page, '#vaultCard details.vault-details summary');
    await chooseFile(page, '#vaultKeyFile', keyFile);
    await sleep(900);
}

// Pick a PIN (first time on this laptop).
async function pickPin(page, pin) {
    await page.locator('#vaultPin1').waitFor({ state: 'visible', timeout: 8000 });
    await type(page, '#vaultPin1', pin);
    await page.keyboard.press('Tab');
    await page.keyboard.type(pin, { delay: 25 });
    await page.keyboard.press('Enter');
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) {
        if (await page.locator('#vaultCard').isHidden()) break;
        const p = await page.locator('#vaultCard .vault-problem').innerText().catch(() => '');
        if (p) return { ok: false, words: p };
        await sleep(100);
    }
    return { ok: await page.locator('#vaultCard').isHidden(), ms: Date.now() - t0 };
}

// Every day: the PIN.
async function enterPin(page, pin) {
    await page.locator('#vaultPin').waitFor({ state: 'visible', timeout: 8000 });
    await type(page, '#vaultPin', pin);
    await page.keyboard.press('Enter');
    for (let i = 0; i < 100; i++) {
        if (await page.locator('#vaultCard').isHidden()) return { ok: true };
        const p = await page.locator('#vaultCard .vault-problem').innerText().catch(() => '');
        if (p) return { ok: false, words: p };
        await sleep(100);
    }
    return { ok: false, words: await cardWords(page) };
}

// Choose File -> a pack or a plain file.  Returns what the page says afterwards.
async function openData(page, file, wait) {
    await chooseFile(page, '#chooseBtn', file);
    const t0 = Date.now();
    let last = {};
    for (let i = 0; i < (wait || 150); i++) {
        await sleep(200);
        last = {
            note: await page.locator('#vaultNote').isVisible().catch(() => false) ? await text(page, '#vaultNote') : '',
            reading: await page.locator('#readingFrom').isVisible().catch(() => false) ? await text(page, '#readingFrom') : '',
            status: await text(page, '#status'),
            loader: await page.locator('#loader').isVisible().catch(() => false),
        };
        if (last.note) break;
        if (last.reading && !last.loader && !/Pick a CSV/.test(last.status) && i > 3) break;
    }
    last.ms = Date.now() - t0;
    return last;
}

module.exports = Object.assign({}, L, { useTrust, cardWords, problemWords, offerKeyFile, pickPin, enterPin, openData });
