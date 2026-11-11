/*
    ==========================================================

        signinS.js   -   THE PERSON'S SIDE   (filekey,  v0.3.0.   A standalone draft page:  not the real app)

        What the person does:
            1.  once:    "Connect your Flogic folder"   (the drive folder IT shared with you),  pick a PIN
            2.  daily:   the PIN.   That's it,  for every group you're in.
        Renewals:  IT puts a new filekey in your folder;  this page picks it up by itself.

        What this browser keeps  (IndexedDB  "flogic-filekey",  one record per person):
            IT's signed claims,  and the group keys LOCKED with the PIN.   Never the PIN.   Never an unlocked key.  Never data.
        The folder is remembered as a browser handle  (Mailbox.remember),  never as a path.

        The session lives in memory only,  and ends by Lock,  the idle timer,  or the filekey's end date.

    ==========================================================
*/

(function () {

    'use strict';

    const S = SignInCore;
    const DB_NAME = 'flogic-filekey';

    // ---- the browser's store ----

    function openDb() {
        return new Promise(function (done, fail) {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('people', { keyPath: 'id' }); };
            req.onsuccess = function () { done(req.result); };
            req.onerror = function () { fail(req.error); };
        });
    }
    async function dbDo(mode, work) {
        const db = await openDb();
        try {
            return await new Promise(function (done, fail) {
                const tx = db.transaction('people', mode);
                const req = work(tx.objectStore('people'));
                tx.oncomplete = function () { done(req ? req.result : undefined); };
                tx.onerror = function () { fail(tx.error); };
            });
        } finally { db.close(); }
    }
    const allCopies = function () { return dbDo('readonly', function (s) { return s.getAll(); }); };
    const saveCopy = function (r) { return dbDo('readwrite', function (s) { return s.put(r); }); };
    const forgetCopy = function (id) { return dbDo('readwrite', function (s) { return s.delete(id); }); };


    // ---- little helpers ----

    const box = document.getElementById('card');
    let session = null;

    function el(tag, props, kids) {
        const e = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) {
            if (k === 'text') e.textContent = props[k];
            else if (k === 'class') e.className = props[k];
            else e.setAttribute(k, props[k]);
        });
        (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function button(text, onClick, cls, id) {
        const b = el('button', { type: 'button', class: cls || 'quiet' });
        if (id) b.id = id;
        b.textContent = text;
        b.addEventListener('click', onClick);
        return b;
    }
    function field(label, id) {
        const input = el('input', { type: 'password', id: id, autocomplete: 'off', inputmode: 'numeric', maxlength: '12' });
        return { wrap: el('label', { class: 'field' }, [el('span', { text: label }), input]), input: input };
    }
    function problem(id) { return el('p', { class: 'problem', role: 'alert', id: id || 'why' }); }
    function onEnter(input, go) { input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } }); }
    async function busy(btn, words, work) {
        const was = btn.textContent;
        btn.disabled = true; btn.textContent = words;
        try { return await work(); } finally { btn.disabled = false; btn.textContent = was; }
    }
    function screen(title, lines, controls, note) {
        box.replaceChildren();
        box.appendChild(el('h1', { text: title, id: 'title' }));
        if (note) box.appendChild(el('p', { class: 'note', id: 'note', text: note }));
        lines.forEach(function (l) { if (l) box.appendChild(typeof l === 'string' ? el('p', { text: l }) : l); });
        controls.forEach(function (c) { if (c) box.appendChild(c); });
        const first = box.querySelector('input:not([type=file]), button.main');
        if (first) first.focus();
    }
    function groupsLine(groups) { return groups.map(function (g) { return g.label; }).join(' · '); }
    function claimsOf(copy) { try { return JSON.parse(copy.claims); } catch (e) { return null; } }
    function nice(e) { return e.code === 'not-a-file' ? 'That isn\'t a Flogic key file. It\'s called ' + Mailbox.KEY_FILE + ', in the folder IT shared with you.' : e.message; }

    const ENDED = {
        lock: 'Locked.',
        idle: 'Locked, because nothing happened for a while.',
        expired: 'Your access has ended. IT renews it in your folder: there\'s nothing for you to do but sign in again later.',
    };


    // ---- the drive folder ----

    let folder = null;
    async function reconnect(ask) {
        if (folder) return folder;
        if (!Mailbox.supported()) return null;
        try {
            const h = await Mailbox.recall('person');
            if (!h || !await Mailbox.allowed(h, 'read', ask)) return null;
            folder = await Mailbox.openPersonal(h);
        } catch (e) { console.warn('Flogic draft: the folder isn\'t available:', e); folder = null; }
        return folder;
    }
    async function connectNew() {
        const h = await Mailbox.pick('read');
        folder = await Mailbox.openPersonal(h);
        try { await Mailbox.remember(h, 'person'); } catch (e) { /* works this visit;  asks again next time */ }
        return folder;
    }
    //  The filekey from the folder,  checked.   ->  the key file,  or null
    async function keyFromFolder() {
        if (!folder) return null;
        const t = await folder.getKey();
        return t ? S.readKey(t) : null;
    }


    // ---- START:  who's this? ----

    async function start(note) {
        let copies = [];
        try { copies = await allCopies(); } catch (e) { console.warn('Flogic draft: could not read this browser\'s store:', e); }
        if (copies.length === 0) { firstTime(note); return; }
        if (copies.length === 1 && !note) { pinScreen(copies[0]); return; }
        const pick = copies.map(function (r) {
            const c = claimsOf(r);
            const b = button(r.name, function () { pinScreen(r); }, 'person', 'who-' + r.id);
            b.appendChild(el('small', { text: c ? groupsLine(c.groups) : '' }));
            return b;
        });
        screen('Who\'s signing in?', [], pick.concat([button('Someone new on this laptop', function () { firstTime(); }, 'quiet', 'new')]), note);
    }


    // ---- 1.  FIRST TIME ON THIS LAPTOP:   connect your folder  (or open the file),  pick a PIN ----

    async function firstTime(note) {
        const why = problem();
        const byHand = el('input', { type: 'file', id: 'key-file', accept: '.flogic-key,application/json' });
        byHand.addEventListener('change', async function () {
            why.textContent = '';
            const f = byHand.files[0];
            if (!f) return;
            try { const k = S.readKey(await f.text()); await S.check(k, FLOGIC_IT_SIGNER); choosePin(k); }
            catch (e) { why.textContent = nice(e); }
            byHand.value = '';
        });
        function failed(e) {
            console.warn('Flogic: connecting the folder failed:', e);
            why.textContent = e.code && e.code !== 'cancelled' && !e.raw ? nice(e) : Mailbox.whyNot(e);
        }
        //  A folder handle  ->  its key file  ->  pick a PIN
        async function useFolder(h) {
            folder = await Mailbox.openPersonal(h);
            try { await Mailbox.remember(h, 'person'); } catch (e) { /* works this visit;  asks again next time */ }
            const k = await keyFromFolder();
            if (!k) { why.textContent = 'There\'s no key file in "' + folder.name + '" yet. Pick the folder IT shared with you, or ask IT to put your key there.'; folder = null; return; }
            await S.check(k, FLOGIC_IT_SIGNER);
            choosePin(k);
        }
        const connect = Mailbox.supported() ? button('Connect your Flogic folder', function () {
            why.textContent = '';
            Mailbox.pick('read').then(useFolder).catch(failed);         //  the picker FIRST,  straight from the click
        }, 'main', 'connect') : null;
        //  Or drag the folder  (or the key file itself)  onto the page:  no picker window at all
        const drop = el('div', { class: 'drop', id: 'folder-drop', text: 'Or drag your Flogic folder (or the key file) here' });
        ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
        drop.addEventListener('drop', function (e) {
            e.preventDefault(); drop.classList.remove('over'); why.textContent = '';
            Mailbox.fromDrop(e).then(async function (r) {
                if (r.dir) return useFolder(r.dir);
                const k = S.readKey(await r.file.text()); await S.check(k, FLOGIC_IT_SIGNER); choosePin(k);
            }).catch(failed);
        });
        screen('Sign in to Flogic',
               [Mailbox.supported() ? 'IT shared a folder with you in OneDrive or Google Drive. Pick it once, and you\'re in.'
                                    : 'Open the key file IT gave you (' + Mailbox.KEY_FILE + ').'],
               [connect, drop,
                el('details', { id: 'by-hand' }, [el('summary', { text: 'Or open the key file yourself' }),
                    el('label', { class: 'field' }, [el('span', { text: 'Your key file  (' + Mailbox.KEY_FILE + ')' }), byHand])]),
                why], note);
        if (!Mailbox.supported()) box.querySelector('details').open = true;
        //  A folder this browser already remembers,  still allowed:  go straight to the PIN
        if (!note && await reconnect(false)) {
            try { const k = await keyFromFolder(); if (k) { await S.check(k, FLOGIC_IT_SIGNER); choosePin(k); } }
            catch (e) { why.textContent = nice(e); }
        }
    }

    function choosePin(keyFile) {
        const c = JSON.parse(keyFile.claims);
        const a = field('Pick a PIN for this laptop  (4 or more digits)', 'pin1');
        const b = field('Type it again', 'pin2');
        const why = problem();
        const go = button('Sign in', async function () {
            why.textContent = '';
            const issue = S.pinProblem(a.input.value);
            if (issue) { why.textContent = issue; return; }
            if (a.input.value !== b.input.value) { why.textContent = 'The two don\'t match.'; return; }
            try {
                const opened = await busy(go, 'Signing in…', async function () {
                    const copy = await S.claim(keyFile, a.input.value, FLOGIC_IT_SIGNER);
                    const o = await S.unlock(copy, a.input.value, FLOGIC_IT_SIGNER);
                    await saveCopy(o.copy);
                    return o;
                });
                a.input.value = ''; b.input.value = '';
                signedIn(opened.copy, opened);
            } catch (e) { why.textContent = nice(e); }
        }, 'main', 'set-pin');
        onEnter(b.input, function () { go.click(); });
        screen('Hi, ' + c.name,
               [el('p', { id: 'groups', text: 'IT gave you: ' + groupsLine(c.groups) + '.' }),
                'Pick a PIN. You\'ll type it each time you sign in on this laptop. Nobody else needs it, not even IT.'],
               [a.wrap, b.wrap, go, why]);
    }


    // ---- 2.  EVERY DAY:   the PIN ----

    function pinScreen(copy, note) {
        const c = claimsOf(copy);
        const pin = field('PIN', 'pin');
        const why = problem();
        const go = button('Sign in', async function () {
            why.textContent = '';
            const typed = pin.input.value;
            try {
                const opened = await busy(go, 'Signing in…', async function () {
                    let o = await S.unlock(copy, typed, FLOGIC_IT_SIGNER);
                    await saveCopy(o.copy); copy = o.copy;
                    //  Renewal:  a newer filekey in the folder replaces this one,  under the same PIN.
                    const ends = new Date(o.claims.expires), endingSoon = ends - Date.now() < 3 * 86400000;
                    if (await reconnect(endingSoon)) {
                        try {
                            const k = await keyFromFolder();
                            if (k && await S.isNewer(k, copy, FLOGIC_IT_SIGNER)) {
                                await S.check(k, FLOGIC_IT_SIGNER);
                                o = await S.unlock(await S.claim(k, typed, FLOGIC_IT_SIGNER), typed, FLOGIC_IT_SIGNER);
                                await saveCopy(o.copy); copy = o.copy;
                                o.renewed = true;
                            }
                        } catch (e) { console.warn('Flogic draft: the folder\'s key file wasn\'t used:', e); }
                    }
                    S.notEnded(o.claims);
                    return o;
                });
                pin.input.value = '';
                signedIn(copy, opened);
            } catch (e) {
                pin.input.value = '';
                if (e.code === 'wrong-pin') { await saveCopy(e.copy); copy = e.copy; }
                if (e.code === 'wiped') {
                    //  Forget the folder too:  otherwise the page would just offer "pick a new PIN" to whoever is at the desk
                    folder = null;
                    try { await Mailbox.forget('person'); } catch (x) { /* nothing remembered */ }
                    await forgetCopy(copy.id); start(e.message); return;
                }
                why.textContent = e.message;
            }
        }, 'main', 'go');
        onEnter(pin.input, function () { go.click(); });
        const ends = c ? new Date(c.expires) : null;
        screen(copy.name, [c ? groupsLine(c.groups) : '',
                           ends ? el('p', { class: 'small', id: 'ends', text: (ends < new Date() ? 'Ended ' : 'Good until ') + S.niceDate(ends) + '. IT renews it in your folder.' }) : null],
               [pin.wrap, go, why,
                el('p', { class: 'small', text: 'Forgot your PIN? Forget me on this laptop, then connect your folder again and pick a new one. Nothing is lost.' }),
                button('Forget me on this laptop', async function () {
                    if (!confirm('Forget ' + copy.name + ' on this laptop? You\'d connect your folder again and pick a new PIN.')) return;
                    await forgetCopy(copy.id); start();
                }, 'quiet', 'forget'),
                button('Someone else', function () { start('Pick who\'s signing in.'); }, 'quiet', 'someone-else')], note);
    }


    // ---- SIGNED IN ----

    function signedIn(copy, opened) {
        let tick = null;
        session = S.startSession({ claims: opened.claims, keys: opened.keys, onEnd: function (reason) {
            session = null;
            clearInterval(tick);
            pinScreen(copy, ENDED[reason] || 'Locked.');
        } });
        const ends = el('p', { class: 'small', id: 'session-ends' });
        tick = setInterval(show, 1000);
        function show() {
            if (!session) return;
            const at = session.endsAt();
            ends.textContent = at ? 'Locks by itself at ' + at.toLocaleTimeString() + ' if you step away. Access good until ' + S.niceDate(new Date(opened.claims.expires)) + '.' : '';
        }
        show();

        const pack = el('input', { type: 'file', id: 'pack-file', accept: '.flogic' });
        const result = el('p', { id: 'pack-result', role: 'status' });
        pack.addEventListener('change', async function () {
            result.textContent = ''; result.className = '';
            const f = pack.files[0];
            if (!f || !session) return;
            try {
                const out = await session.openPack(new Uint8Array(await f.arrayBuffer()));
                const text = new TextDecoder().decode(out.bytes);
                result.className = 'good';
                result.textContent = 'Opened ' + out.header.fileName + ' (' + (out.header.groupLabel || out.header.group) + '). First line: ' + text.split('\n')[0].slice(0, 80);
            } catch (e) {
                result.className = 'problem';
                result.textContent = e.message;
            }
            pack.value = '';
        });

        screen('Hi, ' + opened.claims.name,
               [el('p', { id: 'groups', text: 'Signed in for: ' + groupsLine(opened.claims.groups) }),
                opened.renewed ? el('p', { class: 'good', id: 'renewed', text: 'IT renewed your access.' }) : null, ends],
               [el('label', { class: 'field' }, [el('span', { text: 'Open a data pack  (.flogic)' }), pack]), result,
                button('Lock', function () { if (session) session.lock(); }, 'main', 'lock')]);
    }

    ['pointerdown', 'keydown', 'wheel'].forEach(function (t) {
        document.addEventListener(t, function () { if (session) session.touch(); }, { passive: true, capture: true });
    });

    window.SignInPage = Object.freeze({ signedIn: function () { return session !== null; },
                                         endsAt: function () { return session ? session.endsAt() : null; } });
    start();

})();
