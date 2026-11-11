/*
    ==========================================================

        mailboxS.js   -   THE DRIVE FOLDER   (v0.3.0,  filekey)

        IT keeps ONE parent folder in OneDrive / Google Drive / a share,  with a subfolder per person,
        each shared with that person only:

            <IT's folder>/u-0001/flogic.flogic-key        Fernando's filekey
            <IT's folder>/u-0002/flogic.flogic-key        DJ's filekey

        The person connects THEIR folder  (the one IT shared with them)  once.   Flogic reads  flogic.flogic-key  from it.
        Flogic never writes to the person's folder.

        The folder is not trusted for honesty:   every filekey is checked against IT's signature before use.
        It IS trusted for secrecy:   the filekey is the login,  so the drive's own sign-in  (company MFA)  guards it.
          *  file and folder names come from a strict pattern,  never from inside a file  (no  ../  tricks)
          *  size is checked before reading

        Works with a real folder  (File System Access API:  Chrome / Edge)  or with any object that answers the
        same calls  (the tests use an in-memory folder).   Without folder access,  the person opens the file by hand.

        It puts ONE name on the page:  Mailbox.

    ==========================================================
*/

const Mailbox = (function () {

    'use strict';

    const KEY_FILE = 'flogic.flogic-key';
    const PERSON = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;           //  a keyring person id,  e.g.  u-0001
    const MAX_FILE = 256 * 1024;
    const MAX_LISTED = 2000;

    function fail(code, message) { const e = new Error(message); e.code = code; return e; }
    function supported() { return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'; }

    async function pick(mode) {
        if (!supported()) throw fail('no-folder-access', 'This browser can\'t open a drive folder. Use Chrome or Edge, or open your key file by hand.');
        try { return await window.showDirectoryPicker({ id: 'flogic-' + (mode || 'read'), mode: mode === 'readwrite' ? 'readwrite' : 'read' }); }
        catch (e) { throw e && e.name === 'AbortError' ? fail('cancelled', 'No folder picked.') : e; }
    }

    // ---- remember the folder between visits  (the browser keeps the handle;  it may ask permission again) ----

    function memory(mode, work) {
        return new Promise(function (done, bad) {
            const open = indexedDB.open('flogic-mailbox', 1);
            open.onupgradeneeded = function () { open.result.createObjectStore('folder'); };
            open.onerror = function () { bad(open.error); };
            open.onsuccess = function () {
                const db = open.result;
                let tx, req;
                try { tx = db.transaction('folder', mode); req = work(tx.objectStore('folder')); }
                catch (e) { db.close(); bad(e); return; }                    //  e.g. a handle the browser can't store
                tx.oncomplete = function () { db.close(); done(req ? req.result : undefined); };
                tx.onerror = function () { db.close(); bad(tx.error); };
            };
        });
    }
    function remember(handle, role) { return memory('readwrite', function (s) { return s.put(handle, role || 'person'); }); }
    function recall(role) { return memory('readonly', function (s) { return s.get(role || 'person'); }); }
    function forget(role) { return memory('readwrite', function (s) { return s.delete(role || 'person'); }); }

    //  true  =  usable now.    ask:  only straight after a click.
    async function allowed(handle, mode, ask) {
        if (!handle) return false;
        if (!handle.queryPermission) return true;                    //  an in-memory folder
        const o = { mode: mode === 'readwrite' ? 'readwrite' : 'read' };
        if (await handle.queryPermission(o) === 'granted') return true;
        return ask ? (await handle.requestPermission(o)) === 'granted' : false;
    }

    async function readText(fileHandle) {
        const f = await fileHandle.getFile();
        if (f.size > MAX_FILE) throw fail('not-a-file', 'That file is too big to be a key file.');
        return f.text();
    }
    async function tryHandle(get) {
        try { return await get(); }
        catch (e) { if (e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null; throw e; }
    }
    function mustBePerson(id) { if (typeof id !== 'string' || !PERSON.test(id)) throw fail('not-a-file', 'That isn\'t a person id.'); return id; }


    // ---- THE PERSON:  their own folder.   Read only. ----

    async function openPersonal(dir) {
        if (!await allowed(dir, 'read', false)) throw fail('no-permission', 'Flogic needs your OK to read your folder again.');
        return {
            name: dir.name || 'your folder',
            //  ->  the filekey text,  or null
            getKey: async function () {
                const h = await tryHandle(function () { return dir.getFileHandle(KEY_FILE); });
                return h ? readText(h) : null;
            },
        };
    }


    // ---- IT:  the parent folder,  one subfolder per person ----

    async function openIT(root) {
        if (!await allowed(root, 'readwrite', false)) throw fail('no-permission', 'Flogic needs your OK to use that folder again.');
        return {
            name: root.name || 'IT folder',
            putKeyFor: async function (id, text) {
                const sub = await root.getDirectoryHandle(mustBePerson(id), { create: true });
                const h = await sub.getFileHandle(KEY_FILE, { create: true });
                const w = await h.createWritable();                  //  the old file stays until close()
                try { await w.write(text); } finally { await w.close(); }
            },
            getKeyFor: async function (id) {
                const sub = await tryHandle(function () { return root.getDirectoryHandle(mustBePerson(id)); });
                if (!sub) return null;
                const h = await tryHandle(function () { return sub.getFileHandle(KEY_FILE); });
                return h ? readText(h) : null;
            },
            //  ->  the person ids that have a subfolder  (odd names ignored)
            people: async function () {
                const out = [];
                for await (const entry of root.entries()) {
                    if (entry[1].kind === 'directory' && PERSON.test(entry[0])) out.push(entry[0]);
                    if (out.length >= MAX_LISTED) break;
                }
                return out;
            },
        };
    }


    return Object.freeze({
        KEY_FILE: KEY_FILE, PERSON: PERSON, supported: supported, pick: pick,
        openPersonal: openPersonal, openIT: openIT,
        remember: remember, recall: recall, forget: forget, allowed: allowed,
    });

})();
