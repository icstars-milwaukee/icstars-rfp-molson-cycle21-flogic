/*
    ==========================================================

        vaultI.js   -   SIGNING IN,  AND LOCK

        The locks and keys:  vaultcoreI.js.

        What it does:
            -  the full-screen UNLOCK CARD  (before the app shows anything)
            -  SIGN IN WITH YOUR KEY FILE   (the main way):
                   the first time:  connect the drive folder IT shared with you  ->  pick a PIN for this laptop
                   every day:       the PIN.   A renewed key file in the folder is taken in by itself.
               The key file is signed by IT,  lasts days,  and carries your ACCESS LEVEL  (signincoreI.js,  policyI.js).
            -  THE OLDER WAY  (only while  FlogicPolicy.ALLOW_LEGACY_CREDENTIALS  is true):
                   SETUP:   your credential file  ->  the setup code IT gave you
                            ->  pick a passphrase  ->  your recovery code  ("write this down")
                   UNLOCK:  your passphrase  (or your recovery code)
            -  LOCK:  the keys and the open file leave the page,  and the card comes back
            -  window.FlogicVault:  what the dashboard reads  (who you are,  can you export)

        What the browser keeps:
            IndexedDB "flogic-filekey":   for each person who signed in with a key file here:  IT's signed claims
                                          (name,  level,  groups,  end date)  and their group keys LOCKED with the PIN.
            IndexedDB "flogic-mailbox":   which drive folder was connected  (a browser handle,  not a path,  not a file).
            IndexedDB "flogic-vault":     the older way:  name,  groups,  rules,  and the group keys LOCKED twice
                                          (once with the passphrase,  once with the recovery code).
        Never data.   Never a PIN or a passphrase.   Never an unlocked key.   Nothing in localStorage.

        It loads LAST  (after flogicI.js and dashI.js),  and changes nothing of theirs:
        it only CALLS  loadFile,  closeFile,  queryFileChanged.   Renamed?  It says so in the console and stays off.

    ==========================================================
*/

(function () {

    'use strict';

    const VAULT_NEEDS = ['loadFile', 'closeFile', 'queryFileChanged'];
    const missing = VAULT_NEEDS.filter(function (name) { return typeof window[name] !== 'function'; });
    if (typeof VaultCore === 'undefined') missing.push('VaultCore');
    if (typeof indexedDB === 'undefined') missing.push('indexedDB');

    const V = typeof VaultCore === 'undefined' ? null : VaultCore;

    //  Key-file sign-in needs 4 more files  (policyI.js,  signincoreI.js,  mailboxI.js,  it-signerI.js).
    //  One missing  (an older test page)?   Then only the older way is offered.
    const S = typeof SignInCore === 'undefined' ? null : SignInCore;
    const P = typeof FlogicPolicy === 'undefined' ? null : FlogicPolicy;
    const TRUSTED = typeof FLOGIC_IT_SIGNER === 'undefined' ? null : FLOGIC_IT_SIGNER;      //  IT's public key:  whose key files we believe
    const keyFilesOn = S !== null && P !== null && TRUSTED !== null && typeof Mailbox !== 'undefined';
    const legacyOn = !keyFilesOn || P.ALLOW_LEGACY_CREDENTIALS === true;                     //  the credential file + passphrase way


    // ------------------------------------------------------
    //    THE VAULT'S STATE   (only in variables:  Lock sets them back to null)
    // ------------------------------------------------------

    let state  = missing.length > 0 ? 'off' : 'locked';     //  'off'  |  'locked'  (the card is up)  |  'unlocked'
    let me     = null;          //  the signed-in person:   { id, name, groups, expires, prefs,  level, endsAt, byKey  (key-file sign-in) }
    let keys   = null;          //  their unlocked group keys:   Map  group -> { keyVersion, key }   (not readable:  extractable false)
    let pack   = null;          //  the open data pack's label  (V4)
    let presets = [];           //  the data packs that came IN the key file  (still locked;  in memory only;  Lock forgets them)
    let presetBar = null;       //  where they show,  under "Reading from..."   (made further down:  see PRESET DATA)
    const listeners = [];

    function changed() {
        showTag();
        for (const fn of listeners.slice()) {
            try { fn(); } catch (e) { console.warn('FlogicVault: an onChange listener failed:', e); }
        }
    }

    function groupOf(id) {
        if (me === null) return null;
        for (const g of me.groups) if (g.group === id) return g;
        return null;
    }

    function niceDate(d) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    //  THE EXPORT RULE for the open pack.   null:  export is allowed.   Otherwise  { why,  by:  'level' | 'group' | 'pack' }.
    //
    //    An older pack  (one group):    that group's rule  (already cut down by the person's level:  policyI.js).
    //    A SHARED pack  (IT-signed):    allowed if ANY of the pack's groups that the person is in has BOTH
    //                                   the pack's "export" for that group  (IT ticked it when packing)
    //                                   AND the person's own rule for that group.
    //    So a pack can only narrow what a person may do,  never widen it.
    function noExport() {
        const l = me.level && P !== null ? P.level(me.level) : null;
        const levelWhy = l && !l.can.export ? { why: 'A ' + l.label + ' can\'t export', by: 'level' } : null;
        if (!Array.isArray(pack.groups)) {
            const g = groupOf(pack.group);
            if (g !== null && g.rules.export === true) return null;
            return levelWhy || { why: (g ? g.label : pack.label) + ' can\'t export', by: 'group' };
        }
        const mine = pack.groups.filter(function (pg) { return groupOf(pg.group) !== null; });
        if (mine.some(function (pg) { return pg.export === true && groupOf(pg.group).rules.export === true; })) return null;
        if (levelWhy) return levelWhy;
        const groupsSayNo = mine.filter(function (pg) { return groupOf(pg.group).rules.export !== true; });
        if (groupsSayNo.length === mine.length) {
            return { why: groupsSayNo.map(function (pg) { return groupOf(pg.group).label; }).join(' and ') + ' can\'t export', by: 'group' };
        }
        return { why: 'IT turned off export for this file', by: 'pack' };
    }

    //  What the dashboard reads.   (Only reads.   Nothing here hands out a key.)
    window.FlogicVault = Object.freeze({
        state: function () { return state; },
        person: function () {
            return me === null ? null : { id: me.id, name: me.name, level: me.level,
                groups: me.groups.map(function (g) { return { group: g.group, label: g.label, rules: Object.assign({}, g.rules) }; }) };
        },
        //  The signed-in person's access level  (policyI.js:  { id, label, can, view ... }),  or null  (the older way,  or nobody).
        level: function () { return me === null || !me.level || P === null ? null : P.level(me.level); },
        //  When their key file ends  (a Date),  or null.
        accessEnds: function () { return me === null || !me.endsAt ? null : new Date(me.endsAt); },
        openPack: function () { return pack === null ? null : Object.assign({}, pack, pack.groups ? { groups: pack.groups.map(function (g) { return Object.assign({}, g); }) } : {}); },
        canExport: function () {
            if (state !== 'unlocked' || pack === null) return state !== 'locked';    //  a plain file:  yes   (locked:  no)
            return noExport() === null;
        },
        //  WHY exporting is off right now,  in a few words   ('':  it isn't off).
        //  A LEVEL that can't export  (Guest,  Viewer)  is said as the level's rule:  the group may well allow it.
        whyNoExport: function () {
            if (state === 'locked') return 'Locked';
            if (state !== 'unlocked' || pack === null) return '';
            const n = noExport();
            return n === null ? '' : n.why;
        },
        stamp: function () {
            if (state !== 'unlocked' || pack === null) return '';
            const g = groupOf(pack.group);
            const rows = typeof rowCount === 'number' ? '  (' + rowCount.toLocaleString() + ' rows)' : '';
            return me.name + ' · ' + (g ? g.label : pack.group) + ' · ' + niceDate(new Date()) + ' · ' + pack.fileName + rows;
        },
        onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    });

    if (missing.length > 0) {
        console.warn('Vault: "' + missing.join('", "') + '" is missing, so the vault is turned off.');
        return;
    }


    // ------------------------------------------------------
    //    THE VAULT IN THE BROWSER   (IndexedDB:  one record per person who set up here)
    // ------------------------------------------------------

    const DB_NAME = 'flogic-vault';

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
                tx.onabort = function () { fail(tx.error); };
            });
        } finally {
            db.close();
        }
    }

    const allPeople = function () { return dbDo('readonly', function (s) { return s.getAll(); }); };
    const savePerson = function (record) { return dbDo('readwrite', function (s) { return s.put(record); }); };


    //  KEY-FILE SIGN-IN keeps its own database:  "flogic-filekey",  one LAPTOP COPY per person.
    //      { id, name, claims, sig,                IT's signed claims,  exactly as IT wrote them
    //        locked: { salt, rounds, iv, data },   the group keys,  locked with the PIN
    //        tries,                                wrong PINs in a row  (10  ->  the copy is wiped)
    //        prefs: { autoLockMin } }
    function keyDb(mode, work) {
        return new Promise(function (done, fail) {
            const open = indexedDB.open('flogic-filekey', 1);
            open.onupgradeneeded = function () { open.result.createObjectStore('people', { keyPath: 'id' }); };
            open.onerror = function () { fail(open.error); };
            open.onsuccess = function () {
                const db = open.result;
                let tx, req;
                try { tx = db.transaction('people', mode); req = work(tx.objectStore('people')); }
                catch (e) { db.close(); fail(e); return; }
                tx.oncomplete = function () { db.close(); done(req ? req.result : undefined); };
                tx.onerror = tx.onabort = function () { db.close(); fail(tx.error); };
            };
        });
    }

    const allCopies = function () { return keyDb('readonly', function (s) { return s.getAll(); }); };
    const saveCopy = function (copy) { return keyDb('readwrite', function (s) { return s.put(copy); }); };
    const forgetCopy = function (id) { return keyDb('readwrite', function (s) { return s.delete(id); }); };


    // ------------------------------------------------------
    //    THE CARD   (built here,  not in flogic.html:  older test pages keep working)
    // ------------------------------------------------------

    function el(tag, props, kids) {
        const e = document.createElement(tag);
        for (const k in props || {}) {
            if (k === 'text') e.textContent = props[k];
            else if (k === 'class') e.className = props[k];
            else e.setAttribute(k, props[k]);
        }
        for (const kid of kids || []) e.appendChild(kid);
        return e;
    }

    const card = el('div', { id: 'vaultCard', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'vaultTitle' });
    const box  = el('div', { class: 'vault-box' });
    card.appendChild(box);
    document.body.appendChild(card);

    //  Bottom left:   [ 🔒 Lock · Fernando G · Service Desk ] [ ⏱ 15 min ▾ ]
    const bar  = el('div', { id: 'vaultBar' });
    const chip = el('button', { id: 'vaultChip', type: 'button', title: 'Lock: the keys and the open file leave the page' });
    const timer = el('select', { id: 'vaultTimer', title: 'Lock by itself after this many minutes with no mouse or keys', 'aria-label': 'Auto-lock after' });
    bar.append(chip, timer);
    bar.hidden = true;
    document.body.appendChild(bar);
    chip.addEventListener('click', function () { lock(false, ''); });

    let lockReason = '';        //  why the card is back  ("Locked after 15 minutes with no mouse or keys.")

    //  The rest of the page can't be clicked or tabbed to while the card is up.
    function pageInert(on) {
        for (const kid of document.body.children) {
            if (kid !== card && kid.tagName !== 'SCRIPT') kid.inert = on;
        }
    }

    //  One screen of the card:  a title,  a few lines,  the controls.
    function screen(title, lines, controls) {
        box.textContent = '';
        box.appendChild(el('div', { class: 'vault-lock', 'aria-hidden': 'true', text: '🔒' }));
        box.appendChild(el('h2', { id: 'vaultTitle', text: title }));
        if (lockReason) box.appendChild(el('p', { class: 'vault-reason', text: lockReason }));
        for (const line of lines) box.appendChild(typeof line === 'string' ? el('p', { text: line }) : line);
        for (const c of controls) box.appendChild(c);
        const first = box.querySelector('input, button');
        if (first) first.focus();
    }

    function button(text, onClick, cls) {
        const b = el('button', { type: 'button', class: cls || '', text: text });
        b.addEventListener('click', onClick);
        return b;
    }

    function field(label, type, id) {
        const input = el('input', { type: type, id: id, autocomplete: 'off', spellcheck: 'false' });
        return { wrap: el('label', { class: 'vault-field' }, [el('span', { text: label }), input]), input: input };
    }

    function problem() { return el('p', { class: 'vault-problem', role: 'alert' }); }

    //  Enter in a box  =  its button.
    function onEnter(input, go) {
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    }

    //  While the slow part runs  (PBKDF2:  ~0.1–0.3 s),  the button says so and can't be pressed twice.
    async function busy(btn, words, work) {
        const was = btn.textContent;
        btn.disabled = true;
        btn.textContent = words;
        try { return await work(); }
        finally { btn.disabled = false; btn.textContent = was; }
    }

    function showCard() {
        state = 'locked';
        bar.hidden = true;
        card.hidden = false;
        document.body.classList.add('vault-up');
        pageInert(true);
        changed();
        startScreen();
    }

    function hideCard() {
        box.textContent = '';                   //  empty it:  a hidden card must not keep a recovery code  (or anything else typed or shown)
        card.hidden = true;
        document.body.classList.remove('vault-up');
        pageInert(false);
    }


    // ---- THE FIRST SCREEN:  who's unlocking? ----

    //  Read the browser vault,  but never wait on it forever:  a stuck read  (a browser that won't keep
    //  IndexedDB on file://,  like Firefox)  gives up after 3 s,  and the card still works  (as "nobody set up").
    function peopleOrNothing() {
        return Promise.race([
            allPeople().catch(function (e) { console.warn('Vault: could not read the browser vault:', e); return []; }),
            new Promise(function (done) { setTimeout(function () { done(null); }, 3000); }),
        ]).then(function (people) {
            if (people === null) console.warn('Vault: the browser vault didn\'t answer in 3 s.  (Chrome or Edge only for the demo.)');
            return people || [];
        });
    }

    //  The laptop copies  (key-file sign-in),  never waiting forever either.
    function copiesOrNothing() {
        if (!keyFilesOn) return Promise.resolve([]);
        return Promise.race([
            allCopies().catch(function (e) { console.warn('Vault: could not read the key-file store:', e); return []; }),
            new Promise(function (done) { setTimeout(function () { done([]); }, 3000); }),
        ]);
    }

    function claimsOf(copy) { try { return JSON.parse(copy.claims); } catch (e) { return null; } }

    //  "Service Desk · Change Team"
    function groupsLine(groups) { return groups.map(function (g) { return g.label; }).join(' · '); }

    //  "Analyst  ·  Service Desk"
    function levelLine(c) {
        const l = P.level(c.level);
        return (l ? l.label + '  ·  ' : '') + groupsLine(c.groups);
    }

    async function startScreen() {
        screen('Opening…', [], []);
        const people = legacyOn ? await peopleOrNothing() : [];
        const copies = await copiesOrNothing();

        if (people.length + copies.length === 0) { keyFilesOn ? keyFileScreen() : whoScreen([], []); return; }
        if (people.length + copies.length === 1) {
            if (copies.length === 1) pinScreen(copies[0]); else unlockScreen(people[0], false);
            return;
        }
        whoScreen(people, copies);
    }

    //  The list:  everyone who signed in on this laptop,  and the ways in for someone new.
    function whoScreen(people, copies) {
        const pick = copies.map(function (r) {
            const c = claimsOf(r);
            const b = button(r.name, function () { pinScreen(r); }, 'vault-person');
            b.appendChild(el('small', { text: c ? levelLine(c) : '' }));
            return b;
        }).concat(people.map(function (p) {
            const b = button(p.name, function () { unlockScreen(p, false); }, 'vault-person');
            b.appendChild(el('small', { text: groupsLine(p.groups) }));
            return b;
        }));
        const nobody = pick.length === 0;

        screen(nobody ? 'Sign in to Flogic' : 'Who\'s unlocking?',
               nobody ? [keyFilesOn ? 'Your IT department puts a key file in a drive folder it shares with you.'
                                    : 'Your IT department gives you a credential file and a setup code.'] : [],
               pick.concat([
                   keyFilesOn ? button(nobody ? 'Sign in with your key file' : 'Someone new on this laptop', keyFileScreen, nobody ? 'vault-main' : 'vault-quiet') : null,
                   legacyOn ? button('Set up with a credential file', setupScreen, nobody && !keyFilesOn ? 'vault-main' : 'vault-quiet') : null,
                   button('Open a plain file without signing in', plainMode, 'vault-quiet'),
               ].filter(Boolean)));
    }


    // ---- KEY-FILE SIGN-IN,  THE FIRST TIME ON THIS LAPTOP:   your drive folder  (or the file itself),  then a PIN ----

    //  THE REMEMBERED FOLDER:   ONE PER PERSON   ('person:u-0002'),   and only ever used AFTER that person's PIN.
    //
    //  Before,  the laptop remembered ONE folder for everybody,  and the sign-in screen read the key file in it by itself.
    //  So after Frank locked,  "Someone new on this laptop" read FRANK's key file from his still-connected folder and
    //  offered whoever was at the desk a NEW PIN for Frank:  in,  as Frank,  without his PIN.   (Found in the demo run.)
    //
    //  Now:   -  a new person always picks their folder  (or key file)  in the browser's own window:  nothing is read by itself
    //         -  the remembered folder is looked at only inside a PIN sign-in,  for that same person  (to pick up a renewal)
    //         -  "Forget me"  and  "too many wrong PINs"  forget that person's folder too
    function folderSlot(id) { return 'person:' + id; }

    //  This person's remembered folder,  if it's still allowed.   ask:  only straight after a click.   Read only.
    async function reconnect(ask, id) {
        if (!Mailbox.supported()) return null;
        try {
            let h = await Mailbox.recall(folderSlot(id));
            if (!h) h = await Mailbox.recall('person');             //  remembered before each person had their own
            if (!h || !await Mailbox.allowed(h, 'read', ask)) return null;
            return await Mailbox.openPersonal(h);
        } catch (e) { console.warn('Vault: the drive folder isn\'t available:', e); return null; }
    }

    async function forgetFolder(id) {
        for (const slot of [folderSlot(id), 'person']) {
            try { await Mailbox.forget(slot); } catch (e) { /* nothing remembered */ }
        }
    }

    //  The key file in a folder   ->   read  (not checked yet),  or null
    async function keyFromFolder(f) {
        if (!f) return null;
        const t = await f.getKey();
        return t ? S.readKey(t) : null;
    }

    function keyWords(e) {
        if (e.code === 'not-a-file') return 'That isn\'t a Flogic key file. It\'s called ' + Mailbox.KEY_FILE + ', in the folder IT shared with you.';
        return e.message;
    }

    function keyFileScreen() {
        const why = problem();
        const canFolder = Mailbox.supported();

        //  A key file's text   ->   checked against IT's signature AND the built-in rules   ->   pick a PIN
        async function take(text) {
            const k = S.readKey(text);
            await S.check(k, TRUSTED);
            choosePinScreen(k);
        }
        function failed(e) {
            console.warn('Vault: that key file or folder didn\'t work:', e);
            why.textContent = e.code && e.code !== 'cancelled' && !e.raw ? keyWords(e) : Mailbox.whyNot(e);
        }
        async function useFolder(h) {
            const f = await Mailbox.openPersonal(h);
            const t = await f.getKey();
            if (!t) {
                why.textContent = 'There\'s no key file in "' + f.name + '" yet. Pick the folder IT shared with you, or ask IT to put your key there.';
                return;
            }
            //  Remember the folder under the name of the person its key file is for   (so renewals reach THEM,  after THEIR PIN)
            let who = null;
            try { who = JSON.parse(S.readKey(t).claims).sub; } catch (e) { who = null; }
            if (typeof who === 'string' && Mailbox.PERSON.test(who)) {
                try { await Mailbox.remember(h, folderSlot(who)); } catch (e) { /* works this visit;  asks again next time */ }
            }
            await take(t);
        }

        const connect = canFolder ? button('Connect your Flogic folder', function () {
            why.textContent = '';
            Mailbox.pick('read').then(useFolder).catch(failed);         //  the picker FIRST,  straight from the click:  the browser insists
        }, 'vault-main') : null;
        if (connect) connect.id = 'vaultConnect';

        //  Or drag the folder  (or the key file itself)  onto the card:  no picker window at all
        const drop = el('div', { class: 'vault-drop', id: 'vaultDrop', text: canFolder ? 'Or drag your Flogic folder (or the key file) here' : 'Drag your key file here' });
        ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
        drop.addEventListener('drop', function (e) {
            e.preventDefault();
            drop.classList.remove('over');
            why.textContent = '';
            Mailbox.fromDrop(e).then(async function (r) {               //  FIRST,  during the drop
                if (r.dir) return useFolder(r.dir);
                await take(await r.file.text());
            }).catch(failed);
        });

        const byHand = el('input', { type: 'file', id: 'vaultKeyFile', accept: '.flogic-key,application/json' });
        byHand.addEventListener('change', function () {
            why.textContent = '';
            const f = byHand.files[0];
            if (!f) return;
            f.text().then(take).catch(failed);
            byHand.value = '';
        });
        const hand = el('details', { class: 'vault-details' }, [
            el('summary', { text: 'Or open the key file yourself' }),
            el('label', { class: 'vault-field' }, [el('span', { text: 'Your key file  (' + Mailbox.KEY_FILE + ')' }), byHand]),
        ]);
        if (!canFolder) hand.open = true;

        screen('Sign in to Flogic',
               [canFolder ? 'IT shared a folder with you in OneDrive or Google Drive. Pick it once, and you\'re in.'
                          : 'Open the key file IT gave you (' + Mailbox.KEY_FILE + ').'],
               [connect, drop, hand, why,
                button('Back', startScreenAll, 'vault-quiet'),
                legacyOn ? button('Set up with a credential file', setupScreen, 'vault-quiet') : null,
                button('Open a plain file without signing in', plainMode, 'vault-quiet')].filter(Boolean));

        //  (Nothing is read from a remembered folder here:  a new person picks their own.   See THE REMEMBERED FOLDER,  above.)
    }

    function pinField(label, id) {
        const f = field(label, 'password', id);
        f.input.setAttribute('inputmode', 'numeric');
        f.input.setAttribute('maxlength', '12');
        return f;
    }

    function choosePinScreen(keyFile) {
        const c = JSON.parse(keyFile.claims);
        const a = pinField('Pick a PIN for this laptop  (4 or more digits)', 'vaultPin1');
        const b = pinField('Type it again', 'vaultPin2');
        const why = problem();
        const go = button('Sign in', async function () {
            why.textContent = '';
            const issue = S.pinProblem(a.input.value);
            if (issue) { why.textContent = issue; return; }
            if (a.input.value !== b.input.value) { why.textContent = 'The two don\'t match.'; return; }
            try {
                const opened = await busy(go, 'Signing in…', async function () {
                    const copy = await S.claim(keyFile, a.input.value, TRUSTED);
                    const o = await S.unlock(copy, a.input.value, TRUSTED);
                    await saveCopy(o.copy);
                    o.presets = await presetsOf(keyFile);           //  the data IT put in the key file  (never saved on the laptop)
                    return o;
                });
                a.input.value = '';
                b.input.value = '';
                signInWithKey(opened.copy, opened);
            } catch (e) { why.textContent = keyWords(e); }
        }, 'vault-main');
        onEnter(b.input, function () { go.click(); });

        const l = P.describe(c.level);
        screen('Hi, ' + c.name,
               [el('p', { class: 'vault-who', id: 'vaultGave', text: 'IT gave you: ' + levelLine(c) }),
                el('p', { class: 'vault-small', text: l.label + ': export ' + l.export.toLowerCase() + ', locks after ' + l.autoLock + '.' }),
                'Pick a PIN. You\'ll type it each time you sign in on this laptop. Nobody else needs it, not even IT.'],
               [a.wrap, b.wrap, go, why, button('Back', startScreen, 'vault-quiet')]);
    }


    // ---- KEY-FILE SIGN-IN,  EVERY DAY:   the PIN ----

    function pinScreen(copy) {
        const c = claimsOf(copy);
        const pin = pinField('PIN', 'vaultPin');
        const why = problem();
        let forgetArmed = false;

        const go = button('Sign in', async function () {
            why.textContent = '';
            const typed = pin.input.value;
            try {
                const opened = await busy(go, 'Signing in…', async function () {
                    let o = await S.unlock(copy, typed, TRUSTED);
                    await saveCopy(o.copy);
                    copy = o.copy;
                    //  RENEWAL:  a newer key file in the drive folder replaces this one,  under the same PIN.
                    //  (Ending soon?  Then it's worth asking for the folder again.   Otherwise:  only if it's still allowed.)
                    const endingSoon = new Date(o.claims.expires) - Date.now() < P.RENEW_WHEN_DAYS_LEFT * 86400000;
                    //  PRESET DATA rides in the key file,  and the laptop copy never keeps data:  so when this person's key file
                    //  carries some  (the signed claims say so),  it's worth asking for the folder again,  to read it from there.
                    const carriesData = typeof o.claims.packs === 'string';
                    const theirs = await reconnect(endingSoon || carriesData, copy.id);
                    if (theirs) {
                        try {
                            const k = await keyFromFolder(theirs);
                            if (k && await S.isNewer(k, copy, TRUSTED)) {
                                await S.check(k, TRUSTED);
                                const fresh = await S.claim(k, typed, TRUSTED);
                                fresh.prefs = copy.prefs;                       //  the auto-lock pick carries over
                                o = await S.unlock(fresh, typed, TRUSTED);
                                await saveCopy(o.copy);
                                copy = o.copy;
                                o.renewed = true;
                            }
                            //  The folder's key file is the very one this laptop holds  (same serial)?   Then its data is this person's.
                            if (k && JSON.parse(k.claims).serial === o.claims.serial) o.presets = await presetsOf(k);
                        } catch (e) { console.warn('Vault: the folder\'s key file wasn\'t used:', e); }
                    }
                    S.notEnded(o.claims);
                    return o;
                });
                pin.input.value = '';
                signInWithKey(copy, opened);
            } catch (e) {
                pin.input.value = '';
                if (e.code === 'wrong-pin') { await saveCopy(e.copy); copy = e.copy; }
                if (e.code === 'wiped') {
                    //  Forget the folder too:  otherwise the card would just offer "pick a new PIN" to whoever is at the desk.
                    await forgetFolder(copy.id);
                    await forgetCopy(copy.id);
                    lockReason = e.message;
                    startScreen();
                    return;
                }
                why.textContent = e.message;
            }
        }, 'vault-main');
        onEnter(pin.input, function () { go.click(); });

        const ends = c ? new Date(c.expires) : null;
        const forget = button('Forget me on this laptop', async function () {
            if (!forgetArmed) {
                forgetArmed = true;
                forget.textContent = 'Click again to forget ' + copy.name + ' on this laptop';
                return;
            }
            await forgetFolder(copy.id);            //  the folder too:  a new PIN needs the folder picked again,  by whoever can reach it
            await forgetCopy(copy.id);
            startScreen();
        }, 'vault-quiet');

        screen(copy.name,
               [el('p', { id: 'vaultGave', text: c ? levelLine(c) : '' }),
                ends ? el('p', { class: 'vault-small', id: 'vaultEnds',
                                 text: (ends < new Date() ? 'Ended ' : 'Good until ') + S.niceDate(ends) + '. IT renews it in your folder.' }) : null].filter(Boolean),
               [pin.wrap, go, why,
                el('p', { class: 'vault-small', text: 'Forgot your PIN?  Forget me on this laptop, then connect your folder again and pick a new one. Nothing is lost.' }),
                forget,
                button('Someone else', startScreenAll, 'vault-quiet'),
                button('Open a plain file without signing in', plainMode, 'vault-quiet')]);
    }

    //  PIN right,  signature right,  rules kept,  not ended:   in.
    function signInWithKey(copy, opened) {
        const c = opened.claims;
        signIn({ id: c.sub, name: c.name, groups: c.groups, expires: null, prefs: copy.prefs || {},
                 level: c.level, endsAt: new Date(c.expires).getTime(), byKey: true }, opened.keys);
        if (opened.renewed) say('IT renewed your access. Good until ' + S.niceDate(new Date(c.expires)) + '.');
        offerPresets(opened.presets);
    }


    // ---- UNLOCK ----

    function unlockScreen(person, byRecovery) {
        const f = field(byRecovery ? 'Recovery code' : 'Passphrase', byRecovery ? 'text' : 'password', 'vaultSecret');
        const why = problem();
        const go = button('Unlock', function () { tryUnlock(person, byRecovery, f.input, go, why); }, 'vault-main');
        onEnter(f.input, function () { go.click(); });

        screen(person.name, [person.groups.map(function (g) { return g.label; }).join(' · ')], [
            f.wrap, go, why,
            button(byRecovery ? 'Use my passphrase instead' : 'Forgot it?  Use my recovery code',
                   function () { unlockScreen(person, !byRecovery); }, 'vault-quiet'),
            el('p', { class: 'vault-small', text: 'Forgot both?  Ask IT for a new credential file, then set up again.' }),
            button('Someone else', startScreenAll, 'vault-quiet'),
            button('Open a plain file without signing in', plainMode, 'vault-quiet'),
        ]);
    }

    //  "Someone else":  the full list,  even with one person.
    async function startScreenAll() {
        whoScreen(legacyOn ? await peopleOrNothing() : [], await copiesOrNothing());
    }

    async function tryUnlock(person, byRecovery, input, btn, why) {
        why.textContent = '';
        if (expired(person)) { why.textContent = 'This credential expired on ' + person.expires + '. Ask IT for a new one.'; return; }
        const secret = byRecovery ? V.normalizeCode(input.value) : input.value;
        try {
            const opened = await busy(btn, 'Unlocking…', function () {
                return V.unlockKeys(person.id, byRecovery ? person.byRecovery : person.byPassphrase, secret, false);
            });
            input.value = '';
            signIn(person, opened);
        } catch (e) {
            why.textContent = e.code === 'wrong-secret'
                ? (byRecovery ? 'That recovery code doesn\'t match.' : 'That passphrase doesn\'t match.')
                : 'Couldn\'t unlock: ' + e.message;
            input.select();
        }
    }

    function expired(person) {
        if (!person.expires) return false;
        const end = new Date(person.expires + 'T23:59:59');
        return !isNaN(end) && end < new Date();
    }


    // ---- SETUP  (the first time,  with IT's credential file + setup code) ----

    function setupScreen() {
        const pickFile = el('input', { type: 'file', id: 'vaultCredFile', accept: '.flogic-id,application/json' });
        const pickWrap = el('label', { class: 'vault-field' }, [el('span', { text: 'Your credential file  (.flogic-id)' }), pickFile]);
        const who = el('p', { class: 'vault-who' });
        const code = field('Setup code from IT', 'text', 'vaultSetupCode');
        const why = problem();
        let cred = null;

        pickFile.addEventListener('change', async function () {
            why.textContent = '';
            who.textContent = '';
            cred = null;
            const f = pickFile.files[0];
            if (!f) return;
            try {
                cred = V.readCredential(await f.text());
                who.textContent = cred.name + '  ·  ' + cred.groups.map(function (g) { return g.label; }).join(' · ') +
                                  (cred.expires ? '  ·  until ' + cred.expires : '');
                code.input.focus();
            } catch (e) {
                why.textContent = e.code === 'bad-version' ? e.message : 'That isn\'t a credential file. Pick the .flogic-id file IT gave you.';
            }
        });

        const go = button('Next', async function () {
            why.textContent = '';
            if (cred === null) { why.textContent = 'Pick your credential file first.'; return; }
            if (expired(cred)) { why.textContent = 'This credential expired on ' + cred.expires + '. Ask IT for a new one.'; return; }
            try {
                const opened = await busy(go, 'Checking…', function () { return V.openCredential(cred, code.input.value); });
                code.input.value = '';
                passphraseScreen(cred, opened);
            } catch (e) {
                why.textContent = e.code === 'wrong-secret' ? 'That setup code doesn\'t match this credential file.' : 'Couldn\'t open it: ' + e.message;
            }
        }, 'vault-main');
        onEnter(code.input, function () { go.click(); });

        screen('Set up', ['Pick the credential file IT gave you, then type its setup code.'],
               [pickWrap, who, code.wrap, go, why, button('Back', startScreen, 'vault-quiet')]);
    }

    function passphraseScreen(cred, opened) {
        const a = field('Pick a passphrase', 'password', 'vaultPass1');
        const b = field('Type it again', 'password', 'vaultPass2');
        const why = problem();
        const go = button('Next', async function () {
            why.textContent = '';
            const p = a.input.value;
            const issue = V.passphraseProblem(p);
            if (issue) { why.textContent = issue; return; }
            if (p !== b.input.value) { why.textContent = 'The two don\'t match.'; return; }
            const recovery = V.makeCode(25);
            try {
                const record = await busy(go, 'Locking your keys…', async function () {
                    return {
                        id: cred.id, name: cred.name, groups: cred.groups, expires: cred.expires || null,
                        prefs: { autoLockMin: null },
                        byPassphrase: await V.lockKeys(cred.id, opened, p),
                        byRecovery:   await V.lockKeys(cred.id, opened, V.normalizeCode(recovery)),
                    };
                });
                a.input.value = '';
                b.input.value = '';
                recoveryScreen(record, recovery, p);
            } catch (e) {
                why.textContent = 'Couldn\'t lock your keys: ' + e.message;
            }
        }, 'vault-main');
        onEnter(b.input, function () { go.click(); });

        screen('Hi, ' + cred.name, ['Pick a passphrase you\'ll type each time you unlock.  At least 12 characters, or 4 words.'],
               [a.wrap, b.wrap, go, why]);
    }

    function recoveryScreen(record, recovery, passphrase) {
        const codeBox = el('p', { class: 'vault-code', id: 'vaultRecovery', text: recovery });
        const tick = el('input', { type: 'checkbox', id: 'vaultWroteIt' });
        const tickWrap = el('label', { class: 'vault-tick' }, [tick, el('span', { text: 'I wrote it down' })]);
        const why = problem();
        const go = button('Continue', async function () {
            why.textContent = '';
            try {
                await busy(go, 'Saving…', async function () {
                    await savePerson(record);
                    //  Unlock it the normal way  (the keys come back NOT readable),  and forget the setup's copies.
                    const opened = await V.unlockKeys(record.id, record.byPassphrase, passphrase, false);
                    passphrase = null;
                    signIn(record, opened);
                });
            } catch (e) {
                why.textContent = 'Couldn\'t save to this browser: ' + e.message;
            }
        }, 'vault-main');
        go.disabled = true;
        tick.addEventListener('change', function () { go.disabled = !tick.checked; });

        screen('Your recovery code', ['If you forget your passphrase, this unlocks instead.  It\'s shown only this once.',
                                      codeBox,
                                      'Write this down and keep it safe, or save it in your phone.'],
               [tickWrap, go, why]);
        tick.focus();
    }


    // ---- SIGNED IN  /  LOCKED  /  PLAIN ----

    function signIn(person, opened) {
        me = { id: person.id, name: person.name, groups: person.groups, expires: person.expires, prefs: person.prefs || {},
               level: person.level || null, endsAt: person.endsAt || null, byKey: person.byKey === true };
        keys = new Map();
        for (const k of opened) keys.set(k.group, { keyVersion: k.keyVersion, key: k.key });
        pack = null;
        state = 'unlocked';
        lockReason = '';
        const levelName = me.level && P !== null && P.level(me.level) ? P.level(me.level).label + '  ·  ' : '';
        chip.textContent = '🔒 Lock  ·  ' + me.name + '  ·  ' + levelName + me.groups.map(function (g) { return g.label; }).join(', ');
        bar.hidden = false;
        startIdle();
        hideCard();
        changed();
        tell('lock-others');                    //  one person at a time:  another tab that's open locks
    }

    //  LOCK:  forget the keys,  the person,  and the open file  (closeFile),  and put the card back up.
    function lock(fromOtherTab, reason) {
        lockReason = reason || (fromOtherTab ? 'Locked from another tab.' : '');
        stopIdle();
        openId++;                               //  a pack still unlocking?  It's dropped.
        keys = null;
        me = null;
        pack = null;
        offerPresets([]);                       //  the key file's data leaves with the keys
        say('');
        closeFile();
        if (!fromOtherTab) tell('lock');
        showCard();
    }

    //  "Open a plain file without signing in":  the vault steps aside  ('off':  the dashboard works like there's no vault).
    function plainMode() {
        keys = null;
        me = null;
        pack = null;
        state = 'off';
        offerPresets([]);
        lockReason = '';
        stopIdle();
        hideCard();
        chip.textContent = '🔒 Sign in';
        timer.hidden = true;
        bar.hidden = false;
        changed();
    }


    // ---- OPENING DATA PACKS  (.flogic) ----
    //
    //    Pick a .flogic file  ->  the VAULT opens it  (the brain never sees the locked bytes):
    //       1.  read its label  (no key needed)          "group": "service-desk",  "fileName": "incident.csv" ...
    //       2.  do you hold that group's key?             no  ->  "This pack is for Change Team.  You're not in that group."
    //       3.  unlock it,  in memory                     ->  new File([bytes], "incident.csv")  ->  loadFile,  like any file
    //    A plain file  (.csv  .xlsx  .sql)  goes to the brain as always,  and gets a small "not locked" tag.

    let openId = 0;                                 //  counts packs being opened  (Lock in the middle?  the old one is dropped)

    fileInput.accept = fileInput.accept ? fileInput.accept + ',.flogic' : '.flogic';

    const note = el('p', { id: 'vaultNote', role: 'status' });      //  what the vault has to say about a pack
    note.hidden = true;
    readingFrom.after(note);
    const tag = el('span', { id: 'vaultTag' });                     //  "Reading from... incident.csv  🔒 Service Desk"
    readingFrom.appendChild(tag);

    function say(words) {
        note.textContent = words;
        note.hidden = words === '';
    }

    function showTag() {
        tag.classList.toggle('plain', pack === null);
        //  (A plain file is tagged "not locked" with or without a sign-in:  "Open a plain file without signing in" too.)
        tag.textContent = state === 'locked' ? '' : pack !== null ? '🔒 ' + pack.label : 'not locked';
        tag.title = pack !== null ? 'A locked data pack for ' + pack.label + '.  It stays locked on disk.'
                                  : 'A plain file:  not a locked data pack.  Anyone with the file can read it.';
    }

    //  Capture,  on the whole page:  this runs BEFORE the brain's own listener on the file picker.
    document.addEventListener('change', function (e) {
        if (e.target !== fileInput) return;
        const file = fileInput.files[0];
        if (!file) return;
        say('');
        if (!/\.flogic$/i.test(file.name)) {        //  a plain file:  the brain opens it
            openId++;
            if (pack !== null) { pack = null; changed(); }
            return;
        }
        e.stopImmediatePropagation();               //  a pack:  the vault opens it
        openPackFile(file);
    }, true);

    async function openPackFile(file) {
        const myOpen = ++openId;
        fileInput.value = '';                       //  (so picking the same pack again still counts)
        let bytes, label;
        try {
            bytes = new Uint8Array(await file.arrayBuffer());
            label = V.readPackHeader(bytes).header;
        } catch (e) {
            say(e.code === 'bad-version' ? e.message : '"' + file.name + '" isn\'t a Flogic data pack.');
            return;
        }
        //  An older pack:  one group.   A SHARED pack  (v2):  one or more,  each with IT's export rule for this file.
        const shared = label.v === V.PACK_VERSION;
        const onPack = shared ? label.groups : [{ group: label.group, label: label.groupLabel || label.group, keyVersion: label.keyVersion }];
        const name = onPack.map(function (g) { return g.label || g.group; }).join(' + ');
        if (state !== 'unlocked') { say('"' + file.name + '" is a locked data pack for ' + name + '.  Sign in to open it.'); return; }
        //  Which of its groups opens it for me?   (In more than one?   One whose export IT allowed,  if there is one:  the stamp names it.)
        const held = onPack.filter(function (g) { return keys.has(g.group); });
        if (held.length === 0) {
            say('This pack is for ' + name + '.  You\'re not in ' + (onPack.length === 1 ? 'that group.' : onPack.length === 2 ? 'either group.' : 'any of those groups.'));
            return;
        }
        const fits = held.filter(function (g) { return keys.get(g.group).keyVersion === g.keyVersion; });
        if (fits.length === 0) {
            say('This pack was locked with a newer ' + (held[0].label || held[0].group) + ' key.  Ask IT to renew your access.');
            return;
        }
        const via = fits.find(function (g) { return g.export === true && groupOf(g.group) && groupOf(g.group).rules.export === true; }) || fits[0];
        if (shared) {
            //  IT signed it?   (Everyone in a group holds its key,  so anyone in it COULD make a pack.   Only IT can sign one.)
            if (S === null || TRUSTED === null) { say('"' + file.name + '" is a shared pack, and this app has no IT trust file to check it with.  Ask IT.'); return; }
            try { await V.checkPackSignature(bytes, await S.trustedKey(TRUSTED), TRUSTED.fingerprint); }
            catch (e) { say('"' + file.name + '": ' + (e.code === 'wrong-issuer' || e.code === 'bad-signature' ? e.message : 'its signature can\'t be checked.') ); return; }
            if (myOpen !== openId || state !== 'unlocked') return;
        }
        let plain;
        try { plain = await V.openPack(bytes, keys.get(via.group).key, via.group); }
        catch (e) { say('"' + file.name + '" can\'t be opened with your key.  It may have been changed since IT made it.'); return; }
        bytes = null;
        if (myOpen !== openId || state !== 'unlocked') return;          //  locked  (or another file picked)  meanwhile

        pack = { group: via.group, label: name, fileName: label.fileName || file.name.replace(/\.flogic$/i, ''),
                 rows: label.rows, made: label.made,
                 groups: shared ? onPack.map(function (g) { return { group: g.group, label: g.label, export: g.export === true }; }) : undefined };
        changed();
        loadFile(new File([plain], pack.fileName), null);
    }


    // ---- PRESET DATA:   the small packs that ride IN the key file ----
    //
    //    IT can put a small data pack inside a person's key file   (IT's console:  "Also put in key files").
    //    The app takes it only when IT's signature covers it  (SignInCore.presets:  the signed claims hold the list's hash),
    //    holds it LOCKED,  in memory only   (the laptop copy never keeps data;  Lock forgets it),
    //    and opens the newest one BY ITSELF right after sign-in:   the person's data is the first thing on screen.
    //    Any others wait as buttons under "Reading from...".     Each one opens like any  .flogic  file  (openPackFile:
    //    the group's key,  IT's signature on the pack,  the export rule).
    //    It arrives with the key file:  at the first sign-in,  and at a later one whenever the folder can be read.

    async function presetsOf(keyFile) {
        if (!keyFile || S === null || TRUSTED === null || typeof S.presets !== 'function') return [];
        try { return await S.presets(keyFile, TRUSTED); }
        catch (e) { console.warn('Vault: the data in the key file wasn\'t used:', e); return []; }
    }

    presetBar = el('p', { id: 'vaultPresets' });
    presetBar.hidden = true;
    note.after(presetBar);

    function drawPresets() {
        if (presetBar === null) return;             //  (the page is still loading)
        presetBar.textContent = '';
        presetBar.hidden = presets.length === 0 || state !== 'unlocked';
        if (presetBar.hidden) return;
        presetBar.appendChild(el('span', { text: 'From IT, for you:' }));
        presets.forEach(function (p, i) {
            const b = button(p.fileName, function () { openPreset(i); }, 'vault-preset');
            b.id = 'vaultPreset' + i;
            b.title = 'Data IT put in your key file.  It opens here,  and stays locked on disk.';
            presetBar.appendChild(b);
        });
    }

    function openPreset(i, bySignIn) {
        const p = presets[i];
        if (!p || state !== 'unlocked') return;
        if (!bySignIn) say('');                     //  (at sign-in the note may be saying "IT renewed your access":  it stays)
        openPackFile(new File([p.bytes], p.pack));
    }

    //  At sign-in:  keep them,  show them,  and  (nothing open yet?)  open the newest by itself.     []  =  forget them.
    function offerPresets(list) {
        presets = Array.isArray(list) ? list : [];
        drawPresets();
        if (presets.length > 0 && state === 'unlocked' && (typeof fileTable === 'undefined' || fileTable === null)) openPreset(0, true);
    }


    // ---- THE EXPORT RULE on the Query menu's "Save as CSV"   (the dashboard's Export report reads canExport itself) ----
    //    A polite rule:  someone with DevTools can get around it.   What they CAN'T get around:  no key,  no data.
    document.addEventListener('click', function (e) {
        if (e.target !== queryExport || window.FlogicVault.canExport()) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        const n = me !== null && pack !== null ? noExport() : null;
        const why = window.FlogicVault.whyNoExport() || 'Your group can\'t export';
        const who = n === null ? 'IT sets this for each group.' : n.by === 'level' ? 'IT sets each person\'s access level.'
                  : n.by === 'pack' ? 'IT sets this for each file it packs.' : 'IT sets this for each group.';
        if (typeof setQueryStatus === 'function') setQueryStatus(why + '.  (' + who + ')', true);
    }, true);


    // ---- AUTO-LOCK   (IT sets the most minutes;  you can pick fewer) ----
    //
    //    IT's number is each group's  rules.autoLockMin.   In 2 groups?  The STRICTER one counts  (the smaller number).
    //    Your pick is kept in your record in the browser  (prefs.autoLockMin):  just a number,  nothing secret.
    //    "Idle"  =  no mouse,  no keys,  no wheel,  no touch,  in this tab.

    const TIMER_CHOICES = [1, 5, 10, 15, 30, 60, 120, 240];
    let idleSince = Date.now();
    let idleTimer = null;

    function itMax() {
        let most = Infinity;
        for (const g of me.groups) {
            const m = Number(g.rules && g.rules.autoLockMin);
            if (m > 0 && m < most) most = m;
        }
        return most === Infinity ? 240 : most;
    }

    function idleMinutes() {
        const max = itMax();
        const mine = Number(me.prefs && me.prefs.autoLockMin);
        return mine > 0 && mine <= max ? mine : max;
    }

    function fillTimer() {
        const max = itMax(), now = idleMinutes();
        timer.textContent = '';
        const choices = TIMER_CHOICES.filter(function (m) { return m < max; }).concat([max]);
        for (const m of choices) {
            const o = el('option', { value: String(m), text: '⏱ ' + (m < 60 ? m + ' min' : (m / 60) + ' h') + (m === max ? '  (IT\'s limit)' : '') });
            if (m === now) o.selected = true;
            timer.appendChild(o);
        }
        timer.hidden = false;
    }

    timer.addEventListener('change', async function () {
        if (me === null) return;
        const m = Number(timer.value);
        me.prefs = Object.assign({}, me.prefs, { autoLockMin: m });
        idleSince = Date.now();
        try {
            const id = me.id;
            if (me.byKey) {
                const copy = (await allCopies()).find(function (r) { return r.id === id; });
                if (copy) { copy.prefs = Object.assign({}, copy.prefs, { autoLockMin: m }); await saveCopy(copy); }
            } else {
                const record = (await allPeople()).find(function (p) { return p.id === id; });
                if (record) { record.prefs = Object.assign({}, record.prefs, { autoLockMin: m }); await savePerson(record); }
            }
        } catch (e) { console.warn('Vault: could not save the auto-lock choice:', e); }
    });

    function startIdle() {
        fillTimer();
        idleSince = Date.now();
        clearInterval(idleTimer);
        idleTimer = setInterval(function () {
            if (state !== 'unlocked') return;
            //  The key file's END DATE signs you out,  even in the middle of something.
            if (me.endsAt && Date.now() >= me.endsAt) {
                lock(false, 'Your access has ended. IT renews it in your drive folder: sign in again once they have.');
                return;
            }
            const m = idleMinutes();
            if (Date.now() - idleSince >= m * 60000) lock(false, 'Locked after ' + m + ' minute' + (m === 1 ? '' : 's') + ' with no mouse or keys.');
        }, 5000);
    }

    function stopIdle() {
        clearInterval(idleTimer);
        idleTimer = null;
    }

    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (kind) {
        document.addEventListener(kind, function () { idleSince = Date.now(); }, { passive: true, capture: true });
    });


    // ---- OTHER TABS  (BroadcastChannel:  in this browser only,  no network) ----

    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('flogic-vault') : null;
    function tell(what) { if (channel) channel.postMessage(what); }
    if (channel) {
        channel.onmessage = function (e) {
            if ((e.data === 'lock' || e.data === 'lock-others') && state === 'unlocked') lock(true, '');
        };
    }


    //  START:  the card comes up before anything else.
    showCard();

})();
