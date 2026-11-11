/*
    ==========================================================

        mailboxS.js   -   THE SHARED-FOLDER MAILBOX   (v0.2.0)

        A folder both sides can reach:  OneDrive / SharePoint / Google Drive for desktop / a network share.
        Anything that shows up on the laptop as an ordinary folder will do.   It carries two kinds of file and decides nothing:

            inbox/<LAPTOP-CODE>.flogic-request     the person's request          (public:  a name and a PUBLIC key)
            outbox/<LAPTOP-CODE>.flogic-signin     IT's answer                   (signed;  group keys locked to that laptop)

        The folder is treated as HOSTILE.   Anyone who can write to it can add,  change or delete files.   So:
          *  file names are the laptop code and nothing else   (checked against a strict pattern:  no name from inside a file
             ever becomes a path,  so no  ../  tricks),
          *  every file is size-checked BEFORE it's read,  and re-verified after  (request: code matches key;  sign-in: IT's
             signature, the laptop, the end date),
          *  a missing or changed file is "ask again" or "refused",  never a silent success.
        Nothing secret is ever written here:  not a passphrase,  not a private key,  not a plain group key.

        Works with a real folder  (File System Access API:  Chrome / Edge,  showDirectoryPicker)  or with ANY object that
        answers the same few calls  (the tests use an in-memory folder).   Without folder access the app falls back to
        saving and opening the files by hand  (no change to the person's page,  only slower).

        It puts ONE name on the page:  Mailbox.      Needs SignInCore first.

    ==========================================================
*/

const Mailbox = (function (SignInCore) {

    'use strict';

    const FP = /^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/;      //  a laptop code
    const REQ_EXT = '.flogic-request', SIGNIN_EXT = '.flogic-signin';
    const MAX_FILE = 256 * 1024;                                    //  same ceiling as SignInCore
    const MAX_LISTED = 500;                                         //  a flooded inbox shows the first 500,  not a frozen page

    function fail(code, message) { const e = new Error(message); e.code = code; return e; }

    function supported() { return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'; }

    //  Ask the person for the folder.   Must be called from a click.
    async function pick() {
        if (!supported()) throw fail('no-folder-access', 'This browser can\'t open a shared folder. Use Chrome or Edge, or send the files by hand.');
        try { return await window.showDirectoryPicker({ id: 'flogic-mailbox', mode: 'readwrite' }); }
        catch (e) { throw e && e.name === 'AbortError' ? fail('cancelled', 'No folder picked.') : e; }
    }


    // ------------------------------------------------------
    //    Remember the folder between visits  (the BROWSER keeps the handle,  not a path,  and asks permission again)
    // ------------------------------------------------------

    function memory(mode, work) {
        return new Promise(function (done, bad) {
            const open = indexedDB.open('flogic-mailbox', 1);
            open.onupgradeneeded = function () { open.result.createObjectStore('folder'); };
            open.onerror = function () { bad(open.error); };
            open.onsuccess = function () {
                const db = open.result, tx = db.transaction('folder', mode), req = work(tx.objectStore('folder'));
                tx.oncomplete = function () { db.close(); done(req ? req.result : undefined); };
                tx.onerror = function () { db.close(); bad(tx.error); };
            };
        });
    }
    function remember(handle, role) { return memory('readwrite', function (s) { return s.put(handle, role || 'default'); }); }
    function recall(role) { return memory('readonly', function (s) { return s.get(role || 'default'); }); }
    function forget(role) { return memory('readwrite', function (s) { return s.delete(role || 'default'); }); }

    //  The browser forgets the permission when the tab closes.   true  =  we can use the folder now.
    //  askToo:  call requestPermission  (only allowed straight after a click).
    async function allowed(handle, askToo) {
        if (!handle) return false;
        if (!handle.queryPermission) return true;                    //  an in-memory folder
        const o = { mode: 'readwrite' };
        if (await handle.queryPermission(o) === 'granted') return true;
        return askToo ? (await handle.requestPermission(o)) === 'granted' : false;
    }


    // ------------------------------------------------------
    //    Small file helpers
    // ------------------------------------------------------

    async function readText(fileHandle) {
        const f = await fileHandle.getFile();
        if (f.size > MAX_FILE) throw fail('not-a-file', 'That file is too big to be one of ours.');     //  before reading it
        return f.text();
    }
    async function writeText(dir, name, text) {
        const h = await dir.getFileHandle(name, { create: true });
        const w = await h.createWritable();                          //  the old file stays until close():  a half-written file is never seen
        try { await w.write(text); } finally { await w.close(); }
    }
    async function tryFile(dir, name) {
        try { return await dir.getFileHandle(name); }
        catch (e) { if (e && (e.name === 'NotFoundError' || e.code === 8)) return null; throw e; }
    }
    function codeOf(name, ext) {
        if (!name.endsWith(ext)) return null;
        const c = name.slice(0, -ext.length);
        return FP.test(c) ? c : null;
    }
    function mustBeCode(fp) { if (typeof fp !== 'string' || !FP.test(fp)) throw fail('not-a-file', 'That isn\'t a laptop code.'); return fp; }


    // ------------------------------------------------------
    //    open(root)  ->  the mailbox
    // ------------------------------------------------------

    async function open(root) {
        if (!await allowed(root, false)) throw fail('no-permission', 'Flogic needs your OK to use that folder again. Click "Connect the shared folder".');
        const inbox = await root.getDirectoryHandle('inbox', { create: true });
        const outbox = await root.getDirectoryHandle('outbox', { create: true });

        return {
            name: root.name || 'shared folder',

            //  PERSON:  leave a request for IT.   Checks it first,  so a broken file never lands in IT's inbox.
            putRequest: async function (request) {
                const text = JSON.stringify(request, null, 2);
                const r = await SignInCore.readRequest(text);
                await writeText(inbox, mustBeCode(r.fingerprint) + REQ_EXT, text);
                return r.fingerprint;
            },

            //  IT:  every good request in the inbox   ->  { requests: [{ fp, name, made, request }],  skipped: n,  more: bool }
            listRequests: async function () {
                const requests = []; let skipped = 0, seen = 0, more = false;
                for await (const entry of inbox.entries()) {
                    const name = entry[0], h = entry[1];
                    if (h.kind !== 'file') continue;
                    const fp = codeOf(name, REQ_EXT);
                    if (!fp) { skipped++; continue; }
                    if (++seen > MAX_LISTED) { more = true; break; }
                    try {
                        const r = await SignInCore.readRequest(await readText(h));
                        if (r.fingerprint !== fp) { skipped++; continue; }               //  the file's name has to be its own code
                        requests.push({ fp: fp, name: r.name, made: r.made, request: r });
                    } catch (e) { skipped++; }
                }
                requests.sort(function (a, b) { return a.name.localeCompare(b.name); });
                return { requests: requests, skipped: skipped, more: more };
            },

            //  IT:  the answer.   Checks it is JSON  (the person's page checks IT's signature,  every time).
            putSignin: async function (fp, signin) {
                const text = typeof signin === 'string' ? signin : JSON.stringify(signin, null, 2);
                SignInCore.readSignin(text);
                await writeText(outbox, mustBeCode(fp) + SIGNIN_EXT, text);
            },

            //  PERSON:  is my answer there yet?   ->  the text,  or null
            getSignin: async function (fp) {
                const h = await tryFile(outbox, mustBeCode(fp) + SIGNIN_EXT);
                return h ? readText(h) : null;
            },

            //  IT:  the answers already given   ->  [{ fp, text }]     (for  "Renew everyone")
            listSignins: async function () {
                const out = []; let seen = 0;
                for await (const entry of outbox.entries()) {
                    if (entry[1].kind !== 'file') continue;
                    const fp = codeOf(entry[0], SIGNIN_EXT);
                    if (!fp) continue;
                    if (++seen > MAX_LISTED) break;
                    try { out.push({ fp: fp, text: await readText(entry[1]) }); } catch (e) { /* too big or unreadable: skip */ }
                }
                return out;
            },

            //  IT:  one request by code   ->  the request,  or null
            getRequest: async function (fp) {
                const h = await tryFile(inbox, mustBeCode(fp) + REQ_EXT);
                if (!h) return null;
                const r = await SignInCore.readRequest(await readText(h));
                return r.fingerprint === fp ? r : null;
            },
        };
    }

    //  PERSON'S PAGE:  look for the answer every few seconds.   ->  stop()
    //  onSignin(text)  is called ONCE per new answer text;  checking it is the page's job.
    function watch(box, fp, onSignin, everyMs) {
        let stopped = false, last = null, timer = null;
        async function look() {
            if (stopped) return;
            try {
                const text = await box.getSignin(fp);
                if (text && text !== last) { last = text; await onSignin(text); }
            } catch (e) { /* the folder went away for a moment:  try again next time */ }
            if (!stopped) timer = setTimeout(look, everyMs || 4000);
        }
        look();
        return function stop() { stopped = true; clearTimeout(timer); };
    }


    return Object.freeze({
        FP: FP, supported: supported, pick: pick, open: open, watch: watch,
        remember: remember, recall: recall, forget: forget, allowed: allowed,
    });

})(SignInCore);
