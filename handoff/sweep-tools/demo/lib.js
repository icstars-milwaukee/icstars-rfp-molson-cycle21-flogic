// The "real user" harness: headed Edge, real mouse and keyboard only.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const REPO = path.resolve(__dirname, '..', '..', '..').replace(/\\/g, '/');
const APP = pathToFileURL(path.join(REPO, 'DIRECTORY/testI.html')).href;
const CONSOLE = pathToFileURL(path.join(REPO, 'it-console/it-console.html')).href;
const DATA = path.join(ROOT, 'data');
const SHOTS = path.join(ROOT, 'shots');
const DL = path.join(ROOT, 'downloads');
const LOG = path.join(ROOT, 'findings.log');
for (const d of [SHOTS, DL, path.join(ROOT, 'profiles')]) fs.mkdirSync(d, { recursive: true });

let UC = 'uc?';
let dlCount = Date.now() % 100000;
function setUC(name) { UC = name; note('==== ' + name + ' ====');}
function note(line) {
    const s = '[' + UC + '] ' + line;
    console.log(s);
    fs.appendFileSync(LOG, s + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One browser "laptop".  opts.fresh wipes the profile.  opts.clock = a Date the page should believe.
async function laptop(name, opts) {
    opts = opts || {};
    const dir = path.join(ROOT, 'profiles', name);
    if (opts.fresh) fs.rmSync(dir, { recursive: true, force: true });
    const ctx = await chromium.launchPersistentContext(dir, {
        channel: opts.channel || 'msedge', headless: false, acceptDownloads: true,
        viewport: opts.viewport || { width: 1280, height: 850 },
        args: ['--no-first-run', '--no-default-browser-check', '--window-position=' + (opts.x || 40) + ',' + (opts.y || 20)].concat(opts.args || []),
    });
    ctx._name = name;
    return ctx;
}

// Watch a page: console errors, page errors, failed requests are all findings.  Dialogs are logged (and accepted).
function watch(page, who) {
    page._who = who;
    page.on('console', (m) => {
        if (m.type() === 'error') note('CONSOLE.ERROR (' + who + '): ' + m.text());
        else if (m.type() === 'warning') note('console.warn (' + who + '): ' + m.text());
    });
    page.on('pageerror', (e) => note('PAGEERROR (' + who + '): ' + e.message + '\n' + (e.stack || '')));
    page.on('requestfailed', (r) => note('REQUESTFAILED (' + who + '): ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
    page.on('dialog', async (d) => { note('DIALOG (' + who + ') ' + d.type() + ': ' + d.message()); try { await d.accept(); } catch (e) {} });
    page.on('download', async (d) => {
        const dir = path.join(DL, who);
        fs.mkdirSync(dir, { recursive: true });
        const to = path.join(dir, d.suggestedFilename());
        try { await d.saveAs(to); page._lastDownload = to; (page._downloads = page._downloads || []).push(to); note('download (' + who + '): ' + d.suggestedFilename()); }
        catch (e) { note('DOWNLOAD FAILED (' + who + '): ' + e.message); }
    });
    return page;
}

async function open(ctx, url, who, clockTime) {
    const page = ctx.pages().length && ctx.pages()[0].url() === 'about:blank' ? ctx.pages()[0] : await ctx.newPage();
    watch(page, who);
    global.__lastPage = page;
    if (clockTime) await page.clock.install({ time: clockTime });
    await page.goto(url);
    return page;
}

function loc(page, target) { return typeof target === 'string' ? page.locator(target).first() : target; }

// A real click: scroll into view, find the centre, check nothing covers it, move the mouse, click.
async function click(page, target, opts) {
    opts = opts || {};
    const l = loc(page, target);
    const label = typeof target === 'string' ? target : (opts.name || 'element');
    await l.waitFor({ state: 'visible', timeout: opts.timeout || 8000 });
    await l.scrollIntoViewIfNeeded();
    await sleep(120);
    const box = await l.boundingBox();
    if (!box) throw new Error('no box for ' + label);
    const x = box.x + (opts.dx !== undefined ? opts.dx : box.width / 2), y = box.y + (opts.dy !== undefined ? opts.dy : box.height / 2);
    const hit = await l.evaluate((el, p) => {
        const top = document.elementFromPoint(p.x, p.y);
        if (!top) return 'nothing at point';
        if (top === el || el.contains(top) || top.contains(el) && top.tagName === 'LABEL') return '';
        return 'covered by <' + top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') + (top.className ? '.' + String(top.className).replace(/\s+/g, '.') : '') + '>';
    }, { x, y });
    if (hit) {
        // still moving (a menu unfolding)?  Look again in half a second, as a person's eye would.
        if (!opts._waited) { await sleep(600); return click(page, target, Object.assign({}, opts, { _waited: true })); }
        // what a person does next: scroll a little, and try again (once).  It still counts: it's written down.
        note('GRIEVANCE covered until scrolled: ' + label + ' ' + hit);
        if (!opts._again) {
            await page.mouse.move(640, 420);
            await page.mouse.wheel(0, y < 140 ? -160 : 160);          // under a top bar: scroll the other way
            await sleep(350);
            return click(page, target, Object.assign({}, opts, { _again: true }));
        }
        note('FINDING covered even after scrolling: ' + label + ' ' + hit);
        if (!opts.force) throw new Error(label + ' ' + hit);
    }
    const disabled = await l.evaluate((el) => el.disabled === true);
    if (disabled && !opts.allowDisabled) note('clicking a DISABLED control: ' + label);
    await page.mouse.move(x, y, { steps: 6 });
    await sleep(60);
    await page.mouse.click(x, y);
    await sleep(opts.after || 150);
}

// Click into a field, clear what's there with the keyboard, and type.
async function type(page, target, text, opts) {
    opts = opts || {};
    await click(page, target);
    if (!opts.keep) { await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); }
    await page.keyboard.type(text, { delay: opts.delay === undefined ? 25 : opts.delay });
}

// A date input: click the first segment and type the digits (mm dd yyyy in en-US).
async function typeDate(page, target, ymd) {
    const l = loc(page, target);
    await l.scrollIntoViewIfNeeded();
    const box = await l.boundingBox();
    await page.mouse.click(box.x + 12, box.y + box.height / 2);
    const [y, m, d] = ymd.split('-');
    await page.keyboard.type(m + d + y, { delay: 40 });
}

// The real file button -> the OS dialog's stand-in.
async function chooseFile(page, target, files, opts) {
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), click(page, target, opts)]);
    await fc.setFiles(files);
    await sleep(200);
}

async function shot(page, name) {
    const f = path.join(SHOTS, name + '.png');
    try { await page.screenshot({ path: f }); } catch (e) { note('screenshot failed ' + name + ': ' + e.message); }
    return f;
}

async function text(page, sel) { try { return (await page.locator(sel).first().innerText({ timeout: 3000 })).trim(); } catch (e) { return '<<missing ' + sel + '>>'; } }

// Wait until a message box stops saying "WorkingÃ¢â‚¬Â¦" and has words.  Returns the words and how long it took.
async function waitMsg(page, sel, opts) {
    opts = opts || {};
    const t0 = Date.now();
    let last = '';
    while (Date.now() - t0 < (opts.timeout || 60000)) {
        last = await text(page, sel);
        if (last && !/^Working|^Opening|Ã¢â‚¬Â¦$/.test(last) && (!opts.not || last !== opts.not)) break;
        await sleep(100);
    }
    return { words: last, ms: Date.now() - t0 };
}

async function waitDownload(page, work, timeout) {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: timeout || 60000 }), work()]);
    // our own copy, under a name that can't clash with an earlier download of the same name
    const dir = path.join(DL, page._who, 'n' + String(++dlCount).padStart(3, '0'));
    fs.mkdirSync(dir, { recursive: true });
    const to = path.join(dir, d.suggestedFilename());
    await d.saveAs(to);
    return to;
}

function expect(what, ok, actual) {
    note((ok ? 'PASS  ' : 'FAIL  ') + what + (actual !== undefined ? '   -> ' + JSON.stringify(actual) : ''));
    return ok;
}

// The folder picker: click the page's real button, then the native "Select Folder" window and Edge's own
// Allow prompt are answered through their own controls (pick-folder.ps1).  mode: 'pick' | 'cancel'
const DRIVE = require('path').join(require('os').homedir(), 'Documents', 'flogic-demo-run');
function driveFolder(ctx, folder, mode) {
    const { execFile } = require('child_process');
    return new Promise((done) => {
        execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'pick-folder.ps1'),
                 '-ProfileDir', path.join(ROOT, 'profiles', ctx._name), '-Folder', folder, '-Mode', mode || 'pick'],
                 { timeout: 45000 }, (err, out, errOut) => done((out || '').trim().replace(/\r?\n/g, ' | ') + (errOut ? ' ERR ' + errOut.trim().slice(0, 300) : '')));
    });
}
async function pickFolder(ctx, page, target, folder, mode) {
    await click(page, target);
    const out = await driveFolder(ctx, folder, mode);
    await sleep(1200);
    return out;
}

module.exports = { DRIVE, driveFolder, pickFolder, chromium, ROOT, REPO, APP, CONSOLE, DATA, SHOTS, DL, laptop, open, watch, click, type, typeDate, chooseFile, shot, text, waitMsg, waitDownload, note, setUC, expect, sleep, fs, path };

