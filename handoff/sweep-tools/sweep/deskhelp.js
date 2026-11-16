// What a person does in the desktop windows.
const S = require('./sweeplib');
const C = require('../demo/conlib');
const { click, type, sleep, path, note, fs } = S;
const { execFile, execFileSync } = require('child_process');
const DRIVE = require('path').join(require('os').homedir(), 'Documents', 'flogic-demo-run');
const WORLD = path.join(S.ROOT, 'world');
fs.mkdirSync(WORLD, { recursive: true });
const PASS = 'correct horse battery staple';

function expect(what, ok, actual) { note((ok ? 'PASS  ' : 'FAIL  ') + what + (actual !== undefined ? '   -> ' + JSON.stringify(actual).slice(0, 400) : '')); return ok; }

// The app's own Windows dialog (folder / file / cancel / allow / dump), answered through its own controls.
function dialog(app, mode, p) {
    const pids = S.flogicProcs().map((x) => x.pid).concat([app.pid]).join(',');
    return new Promise((done) => execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(S.ROOT, 'pick.ps1'), '-Pids', pids, '-Path', p || '', '-Mode', mode],
        { timeout: 45000 }, (e, out, err) => done((out || '').trim().replace(/\r?\n/g, ' | ') + (err ? ' ERR ' + err.trim().slice(0, 200) : ''))));
}
async function pickFolder(app, target, folder) {
    await click(app.page, target);
    const out = await dialog(app, 'folder', folder);
    await sleep(1200);
    return out;
}
// The real file button -> the file window's stand-in.
async function chooseFiles(page, target, files) {
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), click(page, target)]);
    await fc.setFiles(files);
    await sleep(250);
}
let dlN = 0;
async function download(page, work, timeout) {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: timeout || 60000 }), work()]);
    const dir = path.join(S.ROOT, 'out', 'dl' + (++dlN) + '-' + Date.now() % 100000);
    fs.mkdirSync(dir, { recursive: true });
    const to = path.join(dir, d.suggestedFilename());
    await d.saveAs(to);
    return to;
}
// The window itself, from outside the page:  what Alt+F4 and the taskbar's Close send, and where the window is.
function win(app, what, steps, gap) {
    try { return execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(S.ROOT, 'winctl.ps1'), '-ProcId', String(app.pid), '-Cmd', what || 'rect', '-Steps', String(steps || 60), '-Gap', String(gap || 16)]).toString().trim(); }
    catch (e) { return 'ERR ' + e.message.slice(0, 160); }
}
function winAsync(app, what, steps, gap) {
    return new Promise((done) => execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(S.ROOT, 'winctl.ps1'), '-ProcId', String(app.pid), '-Cmd', what, '-Steps', String(steps || 60), '-Gap', String(gap || 16)], (e, out) => done((out || '').trim())));
}
function alive(app) { try { process.kill(app.pid, 0); return true; } catch (e) { return false; } }

module.exports = Object.assign({}, S, { C, DRIVE, WORLD, PASS, expect, dialog, pickFolder, chooseFiles, download, win, winAsync, alive });
