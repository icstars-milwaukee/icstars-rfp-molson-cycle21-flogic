// Asking the open file a question, the way a person would: Ask -> "Write it myself" -> type -> Enter.
const C = require('./conlib');
const { click, type, text, note, sleep } = C;

async function openAsk(page) {
    // (the menu folds in and out of the Ask button: give it a moment to settle either way)
    for (let i = 0; i < 30; i++) {
        if (await page.locator('#querySql').isVisible()) return;
        if (await page.locator('#queryBtn').isVisible()) break;
        await sleep(150);
    }
    await sleep(250);
    if (await page.locator('#querySql').isVisible()) return;
    await click(page, '#queryBtn');
    await page.locator('#querySql').waitFor({ state: 'visible', timeout: 5000 });
    await sleep(350);
}

// -> { status, fixes, header: [..], rows: [[..]], raw }
async function ask(page, sql) {
    await openAsk(page);
    if (!(await page.locator('#queryType').isChecked())) await click(page, '#queryType');
    await type(page, '#querySql', sql, { delay: 8 });
    await page.keyboard.press('Enter');
    let status = '';
    for (let i = 0; i < 80; i++) {
        await sleep(150);
        status = await text(page, '#queryStatus');
        if (status && !/Working|Asking|…$|\.\.\.$/.test(status)) break;
    }
    // the menu folds itself away once the answer is up: wait until it has (or 2.5 s: an error keeps it open)
    for (let i = 0; i < 16; i++) { if (!(await page.locator('#querySql').isVisible())) break; await sleep(150); }
    await sleep(400);
    const fixes = await page.locator('#queryFixes').isVisible() ? await text(page, '#queryFixes') : '';
    const answer = await readSheet(page);
    return Object.assign({ status, fixes }, answer);
}

// What the glass window shows right now.
async function readSheet(page) {
    return page.evaluate(() => {
        const cut = (rowEl) => Array.from(rowEl.children).map((c) => c.innerText.replace(/\n/g, ' ').trim());
        const head = document.querySelector('#header');
        const header = head ? Array.from(head.querySelectorAll('.cell, [class*=cell]')).map((c) => c.innerText.split('\n')[0].trim()) : [];
        const rows = Array.from(document.querySelectorAll('#rows > *')).slice(0, 40).map(cut);
        return { header, rows, status: (document.querySelector('#status') || {}).innerText };
    });
}

async function backToFile(page) {
    if (await page.locator('#backBtn').isVisible()) await click(page, '#backBtn');
    await sleep(300);
}

module.exports = Object.assign({}, C, { openAsk, ask, readSheet, backToFile });
