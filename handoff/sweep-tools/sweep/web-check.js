// The app AS A WEB PAGE, under the Docker image's own headers.     node web-check.js
//   Starts deploy/stand-in.mjs (the same rules and headers as deploy/nginx.conf), opens it in headless Edge, and uses the app
//   the way a person would.  It fails on ANY Content-Security-Policy violation or page error: the policy must not block
//   something the app needs.  Then a key-file sign-in by hand (no folder), with the preset data opening by itself.
//   Run after sec7-it.js + preset-check.js (their IT folder and trust file).  Made-up data only.
const { chromium } = require('../demo/node_modules/playwright-core');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs'); const os = require('os');
const REPO = path.resolve(__dirname, '..', '..', '..');
const PORT = 8097;
const URL0 = 'http://127.0.0.1:' + PORT;
const itDir = path.join(os.homedir(), 'Documents', 'flogic-demo-run', 'sweep-it');
let fails = 0;
function ok(what, good, got) { if (!good) fails++; console.log((good ? 'PASS  ' : 'FAIL  ') + what + (got === undefined ? '' : '   -> ' + JSON.stringify(got).slice(0, 300))); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const server = spawn(process.execPath, [path.join(REPO, 'deploy', 'stand-in.mjs'), String(PORT)], { env: Object.assign({}, process.env, { TRUST: path.join(__dirname, 'world', 'it-signerI.js') }), stdio: 'ignore' });
    await sleep(1200);
    const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    try {
        const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
        const page = await ctx.newPage();
        const broke = [];
        await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.effectiveDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + e.lineNumber)); });
        page.on('pageerror', (e) => broke.push('pageerror: ' + String(e.message).slice(0, 200)));
        page.on('console', (m) => { if (m.type() === 'error') broke.push('console: ' + m.text().slice(0, 200)); });
        const csp = () => page.evaluate(() => window.__csp);
        const loaded = () => page.waitForFunction(() => document.getElementById('loader').hidden && /Rows \d/.test(document.getElementById('status').textContent), null, { timeout: 60000 });

        const res = await page.goto(URL0 + '/');
        ok('the bare address lands on the app, with the policy header', page.url().includes('/DataPage/flogic.html') && /connect-src 'none'/.test(res.headers()['content-security-policy'] || ''), page.url());
        ok('a secure-enough place for keys (crypto, folder picker)', await page.evaluate(() => isSecureContext && !!crypto.subtle && typeof showDirectoryPicker === 'function'));

        // ---- a plain file, and the app's main moves ----
        await page.locator('button', { hasText: 'plain file without signing in' }).first().click();
        await page.setInputFiles('#csvFileInput', path.join(__dirname, 'fake', 'incident.csv'));
        await loaded(); await sleep(800);
        ok('a 25,000-row file opens, on the Dashboard', (await page.evaluate(() => location.hash)) === '#dashboard' && (await page.locator('.dash-tile').count()) > 0, await page.locator('#status').innerText());
        await page.click('#tab-sheet'); await sleep(700);
        await page.click('#searchInput'); await page.keyboard.type('network');
        await page.waitForFunction(() => /\d+ \/ \d+/.test(document.getElementById('aimCount').textContent), null, { timeout: 60000 });
        await page.click('#aimRowBtn'); await sleep(400);
        ok('search, and the Details drawer', !(await page.locator('#aimRow').isHidden()), await page.locator('#aimCount').innerText());
        await page.keyboard.press('Escape');
        await page.click('#searchInput'); for (let i = 0; i < 7; i++) await page.keyboard.press('Backspace'); await sleep(400);

        await page.click('#queryBtn'); await sleep(500);
        const tries = page.locator('#queryTry button');
        if (await tries.count()) await tries.first().click(); else await page.click('#queryRun');
        await page.waitForFunction(() => !document.getElementById('backBtn').hidden && document.getElementById('loader').hidden, null, { timeout: 60000 }).catch(() => {});
        ok('Ask gives an answer', !(await page.locator('#backBtn').isHidden()), await page.locator('#status').innerText());
        if (!(await page.evaluate(() => typeof queryMenuOpen === 'function' && queryMenuOpen()))) { await page.click('#queryBtn'); await sleep(400); }
        const dl = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('#queryExport')]).then((a) => a[0]).catch((e) => null);
        ok('Save as CSV downloads (a blob, made in the page)', !!dl, dl ? dl.suggestedFilename() : 'no download');
        await page.keyboard.press('Escape'); await sleep(300);

        await page.evaluate(() => setTheme(THEMES.find((t) => t.id === 'neo-dark'))); await sleep(500);
        ok('the dark theme applies', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'neo-dark');
        await page.evaluate(() => setTheme(THEMES.find((t) => t.id === 'neo-neutral'))); await sleep(300);
        await page.mouse.click(30, 300); await page.keyboard.press('f'); await sleep(600);
        ok('focus mode', await page.evaluate(() => document.body.classList.contains('focus')));
        await page.keyboard.press('Escape'); await sleep(300);

        // ---- key-file sign-in by hand, as on a browser with no folder access: the preset opens by itself ----
        await page.click('#vaultChip'); await sleep(600);
        const someone = page.locator('#vaultCard button', { hasText: 'Someone else' });
        if (await someone.count()) { await someone.first().click(); await sleep(300); }
        const withKey = page.locator('#vaultCard button', { hasText: /key file|Sign in with/i });
        if (!(await page.locator('#vaultKeyFile').count()) && await withKey.count()) { await withKey.first().click(); await sleep(300); }
        await page.locator('#vaultCard summary').first().click().catch(() => {});
        await page.setInputFiles('#vaultKeyFile', path.join(itDir, 'u-0001', 'flogic.flogic-key'));
        await page.waitForSelector('#vaultPin1', { timeout: 15000 });
        await page.fill('#vaultPin1', '4827'); await page.fill('#vaultPin2', '4827'); await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.getElementById('vaultCard').hidden, null, { timeout: 30000 });
        await page.waitForFunction(() => document.getElementById('readingName').innerText === 'ops_tickets_2026.csv' && document.getElementById('loader').hidden, null, { timeout: 30000 }).catch(() => {});
        const s = await page.evaluate(() => ({ reading: document.getElementById('readingName').innerText, tag: document.getElementById('vaultTag').innerText, hash: location.hash, presets: Array.from(document.querySelectorAll('#vaultPresets button')).map((b) => b.textContent) }));
        ok('key file opened by hand, PIN picked: the preset data is on screen by itself', s.reading === 'ops_tickets_2026.csv' && s.tag.includes('Finance') && s.hash === '#dashboard' && s.presets.join() === 'ops_tickets_2026.csv', s);
        await page.screenshot({ path: path.join(__dirname, 'shots', 'web-preset-signed-in.png') });

        const v = await csp();
        ok('the security policy blocked nothing the app needs', v.length === 0, v);
        ok('no errors on the page', broke.length === 0, broke);

        // ---- and the policy really does stop data leaving ----
        const tried = await page.evaluate(async () => { try { await fetch('/healthz'); return 'sent'; } catch (e) { return 'blocked'; } });
        const after = await csp();
        ok('a fetch from the page is blocked by the policy (nothing can be sent out)', tried === 'blocked' && after.some((x) => x.startsWith('connect-src')), { tried, after });
    } finally {
        await browser.close();
        server.kill();
    }
    console.log(fails ? fails + ' FAILED' : 'ALL PASS');
    process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('STOPPED ' + e.stack); process.exit(1); });
