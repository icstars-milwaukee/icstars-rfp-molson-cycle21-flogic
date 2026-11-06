/*
    ==========================================================

        itconsoleI.js   -   IT'S CONSOLE   (it plays Molson's IT department for the demo)

        The task:  relay/F1-it-console.md          The plan:  roaches/access-and-encryption-handoff.md
        The locks and keys:  ../DIRECTORY/vaultcoreI.js   (VaultCore).   This file never does crypto itself.

        IT uses it to:
            -  keep a KEYRING   (the groups,  their keys,  the people)  in a file,  locked with an IT passphrase
            -  make GROUPS      (Service Desk,  Change Team, ...)   each with its own key and rules
            -  PACK a file      (.csv / .xlsx / .sql   ->   .flogic,   locked with one group's key)
            -  make a person's CREDENTIAL   (.flogic-id)   and their one-time SETUP CODE

        Nothing is saved in the browser:  no IndexedDB,  no localStorage,  no network.
        The keys live in variables only.   Lock  (or closing the tab)  forgets them.

        It puts ONE name on the page:  ITConsole.
            -  the logic  (no page needed:  the tests and the demo-set script call it directly)
            -  the page   (only wired up when  it-console.html  is the page)

    ==========================================================
*/

const ITConsole = (function () {

    'use strict';

    const KEYRING_PERSON = 'it-keyring';           //  the "person" the keyring's keys are locked for   (see VaultCore.keyLabel)
    const KEYRING_VERSION = 1;
    const KEYRING_MAX_BYTES = 1024 * 1024;         //  a keyring is small.   A huge file isn't one.

    //  One extra locked key,  always there,  that belongs to no group.   Without it,  a keyring with NO groups
    //  has nothing to unlock,  so ANY passphrase would "open" it.   ('~' can't be in a group id,  so it can't clash.)
    const CHECK_ID = '~check';


    function fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }


    // ------------------------------------------------------
    //    DATES      'YYYY-MM-DD'   (the computer's own day,  not UTC)
    // ------------------------------------------------------

    function ymd(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function today() { return ymd(new Date()); }


    // ------------------------------------------------------
    //    1.  THE KEYRING
    //
    //    In the file:
    //        { flogic: 'keyring', v: 1,
    //          groups: [ { group, label, keyVersion, rules: { export, autoLockMin } } ],
    //          people: [ { id, name, groups: [group ids], expires, made } ],
    //          locked: VaultCore.lockKeys('it-keyring', [every group key  +  the check key], IT passphrase) }
    //
    //    Open  (a "session",  in memory only):
    //        { groups, people,                 the same lists  (readable)
    //          keys: { group id: { keyVersion, key } },     the group keys  (extractable,  so they can be locked again)
    //          check,                         the check key   (CHECK_ID above)
    //          passphrase,                    kept so Save can lock the keys again.   Lock forgets it.
    //          unsaved }                      true after a change,  until Save
    // ------------------------------------------------------

    async function newKeyring(passphrase) {
        const problem = VaultCore.passphraseProblem(passphrase);
        if (problem) throw fail('weak-passphrase', problem);
        return { groups: [], people: [], keys: {}, check: await VaultCore.newGroupKey(), passphrase: passphrase, unsaved: true };
    }


    //  Check the file's shape before trying the passphrase.
    function readKeyring(text) {
        let k;
        try { k = typeof text === 'string' ? JSON.parse(text) : text; }
        catch (e) { throw fail('not-a-keyring', 'That isn\'t a keyring file.'); }
        if (!k || k.flogic !== 'keyring') throw fail('not-a-keyring', 'That isn\'t a keyring file.');
        if (k.v > KEYRING_VERSION) throw fail('bad-version', 'This keyring is from a newer version of the console.');
        if (!Array.isArray(k.groups) || !Array.isArray(k.people) || !k.locked ||
            typeof k.locked.salt !== 'string' || !Array.isArray(k.locked.keys)) {
            throw fail('not-a-keyring', 'This keyring file is damaged.');
        }
        //  every group has exactly one locked key,  every locked key has a group,  and the check key is there
        const ids = k.groups.map(function (g) { return g && g.group; });
        const lockedIds = k.locked.keys.map(function (e) { return e && e.group; });
        if (new Set(ids).size !== ids.length || ids.length + 1 !== lockedIds.length || lockedIds.indexOf(CHECK_ID) < 0 ||
            !ids.every(function (id) { return typeof id === 'string' && lockedIds.indexOf(id) >= 0; })) {
            throw fail('not-a-keyring', 'This keyring file is damaged (its groups and keys don\'t match).');
        }
        return k;
    }


    async function openKeyring(text, passphrase) {
        if (typeof text === 'string' && text.length > KEYRING_MAX_BYTES) throw fail('not-a-keyring', 'That file is too big to be a keyring.');
        const k = readKeyring(text);
        //  A wrong passphrase throws  'wrong-secret'  here,  and nothing below runs.
        const unlocked = await VaultCore.unlockKeys(KEYRING_PERSON, k.locked, passphrase, true);
        const keys = {};
        let check = null;
        for (const u of unlocked) {
            if (u.group === CHECK_ID) check = u.key;
            else keys[u.group] = { keyVersion: u.keyVersion, key: u.key };
        }
        return {
            groups: k.groups.map(function (g) {
                return { group: g.group, label: String(g.label), keyVersion: g.keyVersion,
                         rules: { export: g.rules.export === true, autoLockMin: g.rules.autoLockMin } };
            }),
            people: k.people.map(function (p) {
                return { id: String(p.id), name: String(p.name), groups: p.groups.map(String), expires: p.expires, made: p.made };
            }),
            keys: keys,
            check: check,
            passphrase: passphrase,
            unsaved: false,
        };
    }


    //  The file's text.   Locks every group key again,  with a fresh salt.
    async function keyringText(s) {
        const keys = s.groups.map(function (g) { return { group: g.group, keyVersion: g.keyVersion, key: s.keys[g.group].key }; });
        keys.push({ group: CHECK_ID, keyVersion: 1, key: s.check });
        const locked = await VaultCore.lockKeys(KEYRING_PERSON, keys, s.passphrase);
        return JSON.stringify({ flogic: 'keyring', v: KEYRING_VERSION, groups: s.groups, people: s.people, locked: locked }, null, 2);
    }


    // ======================================================
    //    THE PAGE
    //
    //    Everything from a file or a person goes on the page with  textContent,  never  innerHTML.
    // ======================================================

    let session = null;             //  the open keyring.   null = locked.
    let keyringName = 'it.flogic-keyring';
    let lockArmed = false;          //  Lock with unsaved changes:  the first click warns,  the second one locks

    function $(id) { return document.getElementById(id); }

    function show(id, on) { $(id).hidden = !on; }

    function say(id, text, kind) {
        const box = $(id);
        box.textContent = text || '';
        box.className = 'msg' + (kind ? ' ' + kind : '');
    }

    function download(fileName, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    //  Run a slow step  (PBKDF2 takes a moment)  with the button turned off,  and a word on screen.
    async function busy(button, msgId, work) {
        button.disabled = true;
        say(msgId, 'Working…');
        try { await work(); }
        catch (e) { say(msgId, e.message || String(e), 'bad'); }
        finally { button.disabled = false; }
    }

    function markUnsaved() {
        session.unsaved = true;
        lockArmed = false;
        refresh();
    }

    function refresh() {
        const open = session !== null;
        show('start', !open);
        show('main', open);
        if (!open) return;
        $('keyring-name').textContent = keyringName;
        $('unsaved').hidden = !session.unsaved;
        $('keyring-counts').textContent = session.groups.length + (session.groups.length === 1 ? ' group' : ' groups') + ' · ' +
                                          session.people.length + (session.people.length === 1 ? ' person' : ' people');
    }


    // ------------------------------------------------------
    //    1.  OPEN,  NEW,  SAVE,  LOCK
    // ------------------------------------------------------

    function startSession(s, name) {
        session = s;
        keyringName = name;
        lockArmed = false;
        $('open-pass').value = '';
        $('new-pass').value = '';
        $('new-pass2').value = '';
        say('start-msg', '');
        say('keyring-msg', '');
        refresh();
    }

    async function onOpen() {
        const file = $('open-file').files[0];
        const pass = $('open-pass').value;
        if (!file) { say('start-msg', 'Pick the keyring file first.', 'bad'); return; }
        if (!pass) { say('start-msg', 'Type the IT passphrase.', 'bad'); return; }
        await busy($('open-btn'), 'start-msg', async function () {
            if (file.size > KEYRING_MAX_BYTES) throw fail('not-a-keyring', 'That file is too big to be a keyring.');
            let s;
            try { s = await openKeyring(await file.text(), pass); }
            catch (e) {
                if (e.code === 'wrong-secret') throw fail('wrong-secret', 'That passphrase doesn\'t open this keyring.');
                throw e;
            }
            startSession(s, file.name);
        });
    }

    async function onNew() {
        const pass = $('new-pass').value;
        const problem = VaultCore.passphraseProblem(pass);
        if (problem) { say('start-msg', problem, 'bad'); return; }
        if (pass !== $('new-pass2').value) { say('start-msg', 'The two passphrases don\'t match.', 'bad'); return; }
        startSession(await newKeyring(pass), 'it.flogic-keyring');
        say('keyring-msg', 'New keyring. Save it before you close this tab, or it\'s gone.', 'warn');
    }

    async function onSave() {
        await busy($('save-btn'), 'keyring-msg', async function () {
            const text = await keyringText(session);
            download(keyringName, new Blob([text], { type: 'application/json' }));
            session.unsaved = false;
            lockArmed = false;
            say('keyring-msg', 'Saved ' + keyringName + '. Keep it, and its passphrase, somewhere safe.', 'good');
            refresh();
        });
    }

    function lock() {
        //  Forget everything:  the keys,  the passphrase,  the lists,  and anything on screen.
        session = null;
        lockArmed = false;
        keyringName = 'it.flogic-keyring';
        $('open-file').value = '';
        say('keyring-msg', '');
        refresh();
        say('start-msg', 'Locked. The keys are gone from this page.', 'good');
    }

    function onLock() {
        if (session && session.unsaved && !lockArmed) {
            lockArmed = true;
            say('keyring-msg', 'You have unsaved changes. Save first, or click Lock again to lose them.', 'warn');
            return;
        }
        lock();
    }

    function wire() {
        $('open-btn').addEventListener('click', onOpen);
        $('new-btn').addEventListener('click', onNew);
        $('save-btn').addEventListener('click', onSave);
        $('lock-btn').addEventListener('click', onLock);
        window.addEventListener('beforeunload', function (e) {
            if (session && session.unsaved) { e.preventDefault(); e.returnValue = ''; }
        });
        refresh();
    }

    if (typeof document !== 'undefined' && document.getElementById('it-app')) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
        else wire();
    }


    return Object.freeze({
        KEYRING_PERSON: KEYRING_PERSON,
        today: today,
        newKeyring: newKeyring, readKeyring: readKeyring, openKeyring: openKeyring, keyringText: keyringText,
    });

})();
