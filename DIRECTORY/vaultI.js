/*
    ==========================================================

        vaultI.js   -   SIGNING IN,  AND LOCK

        The plan:  roaches/access-and-encryption-handoff.md.   The locks and keys:  vaultcoreI.js.

        What it does:
            -  the full-screen UNLOCK CARD  (before the app shows anything)
            -  SETUP,  the first time:  your credential file  ->  the setup code IT gave you
                                        ->  pick a passphrase  ->  your recovery code  ("write this down")
            -  UNLOCK:  your passphrase  (or your recovery code)
            -  LOCK:  the keys and the open file leave the page,  and the card comes back
            -  window.FlogicVault:  what the dashboard reads  (who you are,  can you export)

        What the browser keeps  (IndexedDB  "flogic-vault"):  for each person who set up here,
        their name,  their groups,  their rules,  and their group keys LOCKED twice
        (once with the passphrase,  once with the recovery code).   Never data.   Never a passphrase.
        Never an unlocked key.

        It loads LAST  (after scriptI.js and dashI.js),  and changes nothing of theirs:
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


    // ------------------------------------------------------
    //    THE VAULT'S STATE   (only in variables:  Lock sets them back to null)
    // ------------------------------------------------------

    let state  = missing.length > 0 ? 'off' : 'locked';     //  'off'  |  'locked'  (the card is up)  |  'unlocked'
    let me     = null;          //  the signed-in person:   { id, name, groups, expires, prefs }
    let keys   = null;          //  their unlocked group keys:   Map  group -> { keyVersion, key }   (not readable:  extractable false)
    let pack   = null;          //  the open data pack's label  (V4)
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

    //  What the dashboard reads.   (Only reads.   Nothing here hands out a key.)
    window.FlogicVault = Object.freeze({
        state: function () { return state; },
        person: function () {
            return me === null ? null : { id: me.id, name: me.name,
                groups: me.groups.map(function (g) { return { group: g.group, label: g.label, rules: Object.assign({}, g.rules) }; }) };
        },
        openPack: function () { return pack === null ? null : Object.assign({}, pack); },
        canExport: function () {
            if (state !== 'unlocked' || pack === null) return state !== 'locked';    //  a plain file:  yes   (locked:  no)
            const g = groupOf(pack.group);
            return g !== null && g.rules.export === true;
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


    // ------------------------------------------------------
    //    THE CARD   (built here,  not in testI.html:  older test pages keep working)
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

    async function startScreen() {
        screen('Opening…', [], []);
        const people = await peopleOrNothing();

        const pick = people.map(function (p) {
            const b = button(p.name, function () { unlockScreen(p, false); }, 'vault-person');
            b.appendChild(el('small', { text: p.groups.map(function (g) { return g.label; }).join(' · ') }));
            return b;
        });

        if (people.length === 1) { unlockScreen(people[0], false); return; }

        screen(people.length === 0 ? 'Sign in to Flogic' : 'Who\'s unlocking?',
               people.length === 0 ? ['Your IT department gives you a credential file and a setup code.'] : [],
               pick.concat([
                   button('Set up with a credential file', setupScreen, people.length === 0 ? 'vault-main' : 'vault-quiet'),
                   button('Open a plain file without signing in', plainMode, 'vault-quiet'),
               ]));
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
        const people = await peopleOrNothing();
        screen('Who\'s unlocking?', [], people.map(function (p) {
            return button(p.name, function () { unlockScreen(p, false); }, 'vault-person');
        }).concat([button('Set up with a credential file', setupScreen, 'vault-quiet'),
                   button('Open a plain file without signing in', plainMode, 'vault-quiet')]));
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
        me = { id: person.id, name: person.name, groups: person.groups, expires: person.expires, prefs: person.prefs || {} };
        keys = new Map();
        for (const k of opened) keys.set(k.group, { keyVersion: k.keyVersion, key: k.key });
        pack = null;
        state = 'unlocked';
        lockReason = '';
        chip.textContent = '🔒 Lock  ·  ' + me.name + '  ·  ' + me.groups.map(function (g) { return g.label; }).join(', ');
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
        tag.textContent = state !== 'unlocked' ? '' : pack !== null ? '🔒 ' + pack.label : 'not locked';
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
        const name = label.groupLabel || label.group;
        if (state !== 'unlocked') { say('"' + file.name + '" is a locked data pack for ' + name + '.  Sign in to open it.'); return; }
        const mine = keys.get(label.group);
        if (!mine) { say('This pack is for ' + name + '.  You\'re not in that group.'); return; }
        if (mine.keyVersion !== label.keyVersion) {
            say('This pack was locked with a newer ' + name + ' key.  Ask IT for a new credential file.');
            return;
        }
        let plain;
        try { plain = await V.openPack(bytes, mine.key); }
        catch (e) { say('"' + file.name + '" can\'t be opened with your key.  It may have been changed since IT made it.'); return; }
        bytes = null;
        if (myOpen !== openId || state !== 'unlocked') return;          //  locked  (or another file picked)  meanwhile

        pack = { group: label.group, label: name, fileName: label.fileName || file.name.replace(/\.flogic$/i, ''),
                 rows: label.rows, made: label.made };
        changed();
        loadFile(new File([plain], pack.fileName), null);
    }


    // ---- THE EXPORT RULE on the Query menu's "Save as CSV"   (the dashboard's Export report reads canExport itself) ----
    //    A polite rule:  someone with DevTools can get around it.   What they CAN'T get around:  no key,  no data.
    document.addEventListener('click', function (e) {
        if (e.target !== queryExport || window.FlogicVault.canExport()) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        const g = pack !== null ? pack.label : 'your group';
        if (typeof setQueryStatus === 'function') setQueryStatus(g + ' can\'t export.  (IT sets this for each group.)', true);
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
            const people = await allPeople();
            const record = people.find(function (p) { return p.id === me.id; });
            if (record) { record.prefs = Object.assign({}, record.prefs, { autoLockMin: m }); await savePerson(record); }
        } catch (e) { console.warn('Vault: could not save the auto-lock choice:', e); }
    });

    function startIdle() {
        fillTimer();
        idleSince = Date.now();
        clearInterval(idleTimer);
        idleTimer = setInterval(function () {
            if (state !== 'unlocked') return;
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
