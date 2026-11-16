// What a person does in the staff window (stations layout), with real input, plus timing helpers.
const D = require('./deskhelp');
const { click, type, sleep, path, note, fs } = D;

async function plain(page) {
    await click(page, page.locator('#vaultCard button', { hasText: 'Open a plain file without signing in' }), { name: 'plain file' });
    await sleep(400);
}
async function pin(page, code) {
    await type(page, '#vaultPin', code);
    const t0 = Date.now();
    await page.keyboard.press('Enter');
    while (Date.now() - t0 < 15000 && !(await page.locator('#vaultCard').isHidden())) await sleep(15);
    return Date.now() - t0;
}
async function tab(page, id) { if ((await page.evaluate(() => location.hash)) !== '#' + id) { await click(page, '#tab-' + id); await sleep(450); } }
const state = (page) => page.evaluate(() => ({
    hash: location.hash,
    reading: document.getElementById('readingFrom').hidden ? '' : document.getElementById('readingName').innerText,
    status: document.getElementById('status').innerText,
    loader: !document.getElementById('loader').hidden,
    loaderWords: document.getElementById('loaderLabel').innerText,
    note: document.getElementById('vaultNote') && !document.getElementById('vaultNote').hidden ? document.getElementById('vaultNote').innerText : '',
    tiles: document.querySelectorAll('.dash-tile').length,
    counting: /counting/i.test((document.getElementById('dash') || document.body).innerText),
}));

// Open a file from the Sheet station, through the app's REAL Open window (answered through its own controls, so the
// app reads the file from disk itself).  Everything is timed INSIDE the page, from the moment the file is handed over:
// until the rows are readable, until the dashboard has its numbers, whether progress showed, and the longest freeze.
async function openTimed(app, file, label) {
    const page = app.page;
    await tab(page, 'sheet');
    const name = path.basename(file).replace(/\.flogic$/, '').split('.')[0];
    await page.evaluate((name) => {
        const o = window.__open = { t: {}, maxGap: 0, long: [], words: [] };
        window.addEventListener('change', (e) => { if (e.target && e.target.id === 'csvFileInput' && !o.t.change) { o.t.change = performance.now(); o.last = o.t.change; } }, true);     // (on the window: the vault stops the event further in, for packs)
        try { o.obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) if (o.t.change && e.startTime + e.duration > o.t.change) o.long.push(Math.round(e.duration)); }); o.obs.observe({ entryTypes: ['longtask'] }); } catch (e) {}
        function tick(now) {
            if (o.t.change) {
                if (now - o.last > o.maxGap) o.maxGap = now - o.last;
                o.last = now;
                const loader = !document.getElementById('loader').hidden;
                if (loader) { if (!o.t.loader) o.t.loader = now; const w = document.getElementById('loaderLabel').innerText; if (o.words[o.words.length - 1] !== w && o.words.length < 6) o.words.push(w); }
                const noteEl = document.getElementById('vaultNote');
                if (noteEl && !noteEl.hidden && noteEl.innerText) { o.note = noteEl.innerText; o.done = true; return; }
                const reading = document.getElementById('readingFrom').hidden ? '' : document.getElementById('readingName').innerText;
                const status = document.getElementById('status').innerText;
                if (!o.t.rows && reading.indexOf(name) === 0 && !loader && /Rows \d|only has|is empty/.test(status)) { o.t.rows = now; o.status = status; }
                if (o.t.rows) {
                    const dash = document.getElementById('dash');
                    if (document.querySelectorAll('.dash-tile').length > 0 && !/counting/i.test(dash.innerText)) { o.t.dash = now; o.done = true; return; }
                    if (now - o.t.rows > 60000) { o.done = true; return; }
                }
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }, name);
    await click(page, '#chooseBtn');
    const picked = await D.dialog(app, 'file', file);
    let o = {};
    const t0 = Date.now();
    while (Date.now() - t0 < 300000) { try { o = await page.evaluate(() => { const o = window.__open; return { t: o.t, maxGap: o.maxGap, long: o.long, words: o.words, done: o.done, note: o.note, status: o.status, hash: location.hash }; }); } catch (e) {} if (o.done) break; await sleep(100); }
    const r = (k) => o.t && o.t[k] !== undefined && o.t.change !== undefined ? Math.round(o.t[k] - o.t.change) : null;
    const out = { file: label || path.basename(file), mb: +(fs.statSync(file).size / 1048576).toFixed(1), rowsMs: r('rows'), dashMs: r('dash'), progressShown: !!(o.t && o.t.loader), progressAt: r('loader'),
                  progressWords: (o.words || []).join(' / ').slice(0, 110), longestFreeze: Math.round(o.maxGap || 0), longTasks: (o.long || []).length, longestTask: (o.long || []).length ? Math.max.apply(null, o.long) : 0,
                  status: (o.status || '').replace(/[^\x20-\x7e]/g, '-'), landed: o.hash, note: o.note, dialog: /PICKED/.test(picked) ? undefined : picked };
    note('OPEN  ' + JSON.stringify(out));
    return out;
}

// Ask -> Write it myself -> type -> Enter.  Time from Enter until the answer's status shows.
async function askTimed(page, sql, label) {
    if (!(await page.locator('#querySql').isVisible())) { await click(page, '#queryBtn'); await page.locator('#querySql').waitFor({ state: 'visible', timeout: 5000 }); await sleep(400); }
    if (!(await page.locator('#queryType').isChecked())) await click(page, '#queryType');
    await type(page, '#querySql', sql, { delay: 5 });
    const was = await page.locator('#fileBadge').innerText().catch(() => '');
    await D.startRec(page);
    const t0 = Date.now();
    await page.keyboard.press('Enter');
    let badge = '', st = '', worstGap = 0, last = t0;
    while (Date.now() - t0 < 120000) {
        const s = await page.evaluate(() => ({ badge: document.getElementById('fileBadge').innerText, st: document.getElementById('queryStatus').innerText, status: document.getElementById('status').innerText })).catch(() => ({}));
        const b = Date.now(); if (b - last > worstGap) worstGap = b - last; last = b;
        badge = s.badge || ''; st = s.st || '';
        if (/ANSWER/.test(badge) && badge !== was) break;
        if (/can't|couldn't|error|not/i.test(st) && b - t0 > 400) break;
        await sleep(15);
    }
    const ms = Date.now() - t0;
    const r = await D.stopRec(page).catch(() => ({}));
    const out = { ask: label || sql, ms, engine: (/(\d[\d,.]*)\s*ms/.exec(badge) || [])[1], badge: badge.replace(/\s+/g, ' ').slice(0, 80), longestSilence: worstGap, longTasks: r.longTasks, longestTask: r.longMax };
    note('ASK   ' + JSON.stringify(out));
    for (let i = 0; i < 20 && await page.locator('#querySql').isVisible(); i++) await sleep(150);
    await sleep(300);
    return out;
}

module.exports = Object.assign({}, D, { plain, pin, tab, state, openTimed, askTimed });
