/*
    ==========================================================

        signinS.js   -   THE PERSON'S SIDE   (a standalone draft page:  not the real app)

        What the person does,  and nothing more:
            1.  once:   type your name,  pick a passphrase   ->   a small file to send IT
            2.  once:   open the file IT sends back
            3.  every day:   your passphrase.   That's it,  for every group you're in.

        What this browser keeps  (IndexedDB  "flogic-signin-draft",  one record per laptop set-up):
            the name,  the laptop's PUBLIC key,  its private key LOCKED with the passphrase,
            and IT's sign-in file  (signed claims + group keys locked to this laptop).
            Never a passphrase.   Never an unlocked key.   Never data.

        The session lives in memory only  (SignInCore.startSession),  and ends by Lock,  the idle timer,
        or the sign-in file's end date.

    ==========================================================
*/

(function () {

    'use strict';

    const S = SignInCore;
    const DB_NAME = 'flogic-signin-draft';

    // ---- the browser's store ----

    function openDb() {
        return new Promise(function (done, fail) {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('laptops', { keyPath: 'id' }); };
            req.onsuccess = function () { done(req.result); };
            req.onerror = function () { fail(req.error); };
        });
    }
    async function dbDo(mode, work) {
        const db = await openDb();
        try {
            return await new Promise(function (done, fail) {
                const tx = db.transaction('laptops', mode);
                const req = work(tx.objectStore('laptops'));
                tx.oncomplete = function () { done(req ? req.result : undefined); };
                tx.onerror = function () { fail(tx.error); };
            });
        } finally { db.close(); }
    }
    const allLaptops = function () { return dbDo('readonly', function (s) { return s.getAll(); }); };
    const saveLaptop = function (r) { return dbDo('readwrite', function (s) { return s.put(r); }); };
    const forgetLaptop = function (id) { return dbDo('readwrite', function (s) { return s.delete(id); }); };


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
    function field(label, type, id) {
        const input = el('input', { type: type, id: id, autocomplete: 'off', spellcheck: 'false' });
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
        lines.forEach(function (l) { box.appendChild(typeof l === 'string' ? el('p', { text: l }) : l); });
        controls.forEach(function (c) { if (c) box.appendChild(c); });
        const first = box.querySelector('input:not([type=file]), button.main');
        if (first) first.focus();
    }
    function download(fileName, text) {
        window.__flogicLastDownload = { fileName: fileName, text: text };      //  the tests read this
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = el('a', { href: url, download: fileName });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function fileName(name, ext) {
        return (String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'me') + ext;
    }
    function groupsLine(groups) { return groups.map(function (g) { return g.label; }).join(' · '); }
    function claimsOf(record) { try { return JSON.parse(record.signin.claims); } catch (e) { return null; } }

    const ENDED = {
        lock: 'Locked.',
        idle: 'Locked, because nothing happened for a while.',
        expired: 'Your sign-in from IT has ended. Ask IT for a new one: there\'s nothing for you to set up again.',
    };


    // ---- START:  who's this? ----

    async function start(note) {
        let laptops = [];
        try { laptops = await allLaptops(); } catch (e) { console.warn('Sign-in draft: could not read this browser\'s store:', e); }
        if (laptops.length === 0) { setup(note); return; }
        const pick = laptops.map(function (r) {
            const c = r.signin ? claimsOf(r) : null;
            const b = button(r.name, function () { r.signin ? unlock(r) : waiting(r); }, 'person', 'who-' + r.id);
            b.appendChild(el('small', { text: c ? groupsLine(c.groups) : 'Waiting for your file from IT' }));
            return b;
        });
        screen('Who\'s signing in?', [], pick.concat([button('Set up someone new on this laptop', function () { setup(); }, 'quiet', 'new')]), note);
    }


    // ---- 1.  SET UP  (once):   your name,  a passphrase   ->   the file for IT ----

    function setup(note) {
        const name = field('Your name', 'text', 'name');
        const a = field('Pick a passphrase', 'password', 'pass1');
        const b = field('Type it again', 'password', 'pass2');
        const why = problem();
        const go = button('Make my file for IT', async function () {
            why.textContent = '';
            if (!name.input.value.trim()) { why.textContent = 'Type your name.'; return; }
            const issue = VaultCore.passphraseProblem(a.input.value);
            if (issue) { why.textContent = issue; return; }
            if (a.input.value !== b.input.value) { why.textContent = 'The two don\'t match.'; return; }
            try {
                const made = await busy(go, 'Making it…', function () { return S.newLaptop(name.input.value, a.input.value); });
                a.input.value = ''; b.input.value = '';
                await saveLaptop(made.record);
                download(fileName(made.record.name, '.flogic-request'), JSON.stringify(made.request, null, 2));
                waiting(made.record, true);
            } catch (e) { why.textContent = 'Couldn\'t set up: ' + e.message; }
        }, 'main', 'make');
        onEnter(b.input, function () { go.click(); });
        screen('One sign-in for all your groups',
               ['Type your name and pick a passphrase. You\'ll type the passphrase each time you sign in. At least 12 characters, or 4 words.'],
               [name.wrap, a.wrap, b.wrap, go, why], note);
    }


    // ---- 2.  WAITING FOR IT  ->  open the sign-in file IT sent ----

    function signinPicker(record, after, whyId) {
        const pick = el('input', { type: 'file', id: 'signin-file', accept: '.flogic-signin,application/json' });
        const why = problem(whyId);
        pick.addEventListener('change', async function () {
            why.textContent = '';
            const f = pick.files[0];
            if (!f) return;
            try {
                const signin = S.readSignin(await f.text());
                await S.check(signin, FLOGIC_IT_SIGNER, record.id);
                const old = record.signin ? claimsOf(record) : null;
                const c = JSON.parse(signin.claims);
                if (old && old.sub !== c.sub) { why.textContent = 'This sign-in file is for ' + c.name + ', not ' + old.name + '.'; return; }
                if (old && new Date(c.issued) < new Date(old.issued)) { why.textContent = 'That\'s an older sign-in file than the one you have.'; return; }
                record.signin = signin;
                await saveLaptop(record);
                after(record);
            } catch (e) {
                why.textContent = e.code === 'not-a-file' ? 'That isn\'t a sign-in file. Pick the .flogic-signin file IT sent you.' : e.message;
            }
        });
        return { wrap: el('label', { class: 'field' }, [el('span', { text: 'The file IT sent you  (.flogic-signin)' }), pick]), why: why };
    }

    function waiting(record, justMade) {
        const p = signinPicker(record, function (r) { unlock(r, 'You\'re set. Type your passphrase to sign in.'); });
        screen(justMade ? 'Send that file to IT' : 'Waiting for IT',
               [justMade ? 'Your browser just saved ' + fileName(record.name, '.flogic-request') + '. Send it to IT, by email or Teams. It holds nothing secret.'
                         : 'Send IT the file this laptop made, then open the file they send back.',
                el('p', {}, ['If IT asks, your laptop code is ', el('strong', { class: 'code', id: 'laptop-code', text: record.id }), '.']),
                'When IT sends a file back, open it here.'],
               [p.wrap, p.why,
                button('Save the file for IT again', function () {
                    download(fileName(record.name, '.flogic-request'), JSON.stringify({ flogic: 'signin-request', v: S.VERSION, name: record.name,
                             fingerprint: record.id, publicKey: record.publicKey, made: record.made }, null, 2));
                }),
                button('Back', function () { start(); })]);
    }


    // ---- 3.  SIGN IN  (every day):   the passphrase ----

    function unlock(record, note) {
        const c = claimsOf(record);
        const pass = field('Passphrase', 'password', 'pass');
        const why = problem();
        const go = button('Sign in', async function () {
            why.textContent = '';
            try {
                const opened = await busy(go, 'Signing in…', async function () {
                    const priv = await S.openLaptop(record, pass.input.value);
                    const claims = await S.check(record.signin, FLOGIC_IT_SIGNER, record.id);   //  checked EVERY time
                    return { claims: claims, keys: await S.openKeys(record.signin, claims, priv) };
                });
                pass.input.value = '';
                signedIn(record, opened);
            } catch (e) {
                why.textContent = e.code === 'wrong-secret' ? 'That passphrase doesn\'t match.' : e.message;
                pass.input.select();
            }
        }, 'main', 'go');
        onEnter(pass.input, function () { go.click(); });
        const renew = signinPicker(record, function (r) { unlock(r, 'Your new sign-in file is in. Type your passphrase.'); }, 'renew-why');
        const ends = c ? new Date(c.expires) : null;
        const soon = ends && ends - Date.now() < 3 * 86400000;
        screen(record.name, [c ? groupsLine(c.groups) : '',
                             ends ? el('p', { class: soon ? 'warn' : 'small', id: 'ends', text: (ends < new Date() ? 'Ended ' : 'Good until ') + S.niceDate(ends) + (soon && ends > new Date() ? '. IT can send a new file; nothing for you to set up.' : '') }) : null],
               [pass.wrap, go, why,
                el('details', {}, [el('summary', { text: 'Got a new file from IT?' }), renew.wrap, renew.why]),
                el('p', { class: 'small', text: 'Forgot your passphrase? Set up again: IT just sends a new file. Nothing is lost, because no data is kept here.' }),
                button('Forget me on this laptop', async function () {
                    if (!confirm('Forget ' + record.name + ' on this laptop? You\'d set up again, and IT would send a new file.')) return;
                    await forgetLaptop(record.id); start();
                }, 'quiet', 'forget'),
                button('Someone else', function () { start(); })], note);
    }


    // ---- SIGNED IN ----

    function signedIn(record, opened) {
        let tick = null;
        session = S.startSession({ claims: opened.claims, keys: opened.keys, onEnd: function (reason) {
            session = null;
            clearInterval(tick);
            unlock(record, ENDED[reason] || 'Locked.');
        } });
        const ends = el('p', { class: 'small', id: 'session-ends' });
        tick = setInterval(show, 1000);
        function show() {
            if (!session) return;
            const at = session.endsAt();
            ends.textContent = at ? 'Locks by itself at ' + at.toLocaleTimeString() + ' if you step away.' + ' Sign-in from IT good until ' + S.niceDate(new Date(opened.claims.expires)) + '.' : '';
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
               [el('p', { id: 'groups', text: 'Signed in for: ' + groupsLine(opened.claims.groups) }), ends],
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
