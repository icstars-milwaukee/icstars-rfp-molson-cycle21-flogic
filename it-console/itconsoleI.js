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
        for (const g of k.groups) {
            if (groupIdProblem(g.group) || typeof g.label !== 'string' || !Number.isInteger(g.keyVersion) || rulesProblem(g.rules)) {
                throw fail('not-a-keyring', 'This keyring file is damaged (a group in it isn\'t right).');
            }
        }
        for (const p of k.people) {
            if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.groups)) {
                throw fail('not-a-keyring', 'This keyring file is damaged (a person in it isn\'t right).');
            }
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
                return { group: g.group, label: g.label, keyVersion: g.keyVersion, rules: cleanRules(g.rules) };
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


    // ------------------------------------------------------
    //    2.  GROUPS
    //
    //    { group: 'service-desk',  label: 'Service Desk',  keyVersion: 1,
    //      rules: { export: true / false,  autoLockMin: 1–240  (the most idle minutes before the app locks) } }
    //
    //    The label and the rules can change.   The id and the key never do.   (Key rotation:  "Nice",  not now.)
    // ------------------------------------------------------

    const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;     //  a-z,  0-9,  dashes  (not at the ends)
    const ID_MAX = 40;
    const LABEL_MAX = 60;
    const AUTOLOCK_DEFAULT = 15;

    //  'Service Desk'  ->  'service-desk'
    function slugify(label) {
        return String(label).toLowerCase()
            .normalize('NFKD').replace(/[̀-ͯ]/g, '')       //  é -> e
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            .slice(0, ID_MAX).replace(/-+$/, '');
    }

    function labelProblem(label) {
        const l = String(label).trim();
        if (!l) return 'Give the group a name.';
        if (l.length > LABEL_MAX) return 'Keep the name under ' + LABEL_MAX + ' characters.';
        return '';
    }

    function groupIdProblem(id, s) {
        const g = String(id);
        if (!g) return 'Give the group an id.';
        if (g.length > ID_MAX) return 'Keep the id under ' + ID_MAX + ' characters.';
        if (!ID_PATTERN.test(g)) return 'The id can only have small letters, numbers and dashes (not at the start or end).';
        if (s && s.groups.some(function (x) { return x.group === g; })) return 'There\'s already a group with the id "' + g + '".';
        return '';
    }

    function rulesProblem(rules) {
        if (!rules || typeof rules.export !== 'boolean') return 'Say whether this group can export.';
        const m = rules.autoLockMin;
        if (!Number.isInteger(m) || m < 1 || m > 240) return 'Auto-lock has to be a whole number of minutes, 1 to 240.';
        return '';
    }

    function cleanRules(rules) { return { export: rules.export, autoLockMin: rules.autoLockMin }; }

    async function addGroup(s, g) {
        const label = String(g.label).trim();
        const problem = labelProblem(label) || groupIdProblem(g.group, s) || rulesProblem(g.rules);
        if (problem) throw fail('bad-group', problem);
        const group = { group: g.group, label: label, keyVersion: 1, rules: cleanRules(g.rules) };
        s.keys[group.group] = { keyVersion: 1, key: await VaultCore.newGroupKey() };
        s.groups.push(group);
        s.unsaved = true;
        return group;
    }

    //  Only the label and the rules.
    function editGroup(s, id, change) {
        const group = s.groups.find(function (x) { return x.group === id; });
        if (!group) throw fail('bad-group', 'There\'s no group "' + id + '".');
        const label = String(change.label).trim();
        const problem = labelProblem(label) || rulesProblem(change.rules);
        if (problem) throw fail('bad-group', problem);
        group.label = label;
        group.rules = cleanRules(change.rules);
        s.unsaved = true;
        return group;
    }


    // ------------------------------------------------------
    //    3.  PACK A FILE      incident.csv   ->   incident.flogic   (locked with one group's key)
    //
    //    The header  (readable without the key):   { group, groupLabel, keyVersion, fileName, rows: null, made }
    //    rows: null,  because the console has no reader.   The app counts the rows after it opens the pack.
    // ------------------------------------------------------

    const PACK_TYPES = ['.csv', '.xlsx', '.sql'];

    function extension(fileName) {
        const m = /\.[^.\\/]+$/.exec(String(fileName));
        return m ? m[0].toLowerCase() : '';
    }

    function packProblem(fileName) {
        if (PACK_TYPES.indexOf(extension(fileName)) < 0) return 'Only .csv, .xlsx and .sql files can be packed.';
        return '';
    }

    //  'demo_incident.csv'  ->  'demo_incident.flogic'
    function packName(fileName) {
        return String(fileName).replace(/\.[^.\\/]+$/, '') + '.flogic';
    }

    async function packFile(s, fileName, bytes, groupId, made) {
        const problem = packProblem(fileName);
        if (problem) throw fail('bad-pack', problem);
        const g = s.groups.find(function (x) { return x.group === groupId; });
        if (!g) throw fail('bad-pack', 'Pick a group first.');
        //  groupLabel:  so the app can say "This pack is for Change Team"  before it has a key   (DJ's V4 request)
        const header = { group: g.group, groupLabel: g.label, keyVersion: g.keyVersion, fileName: String(fileName),
                         rows: null, made: made || today() };
        const pack = await VaultCore.makePack(bytes, header, s.keys[g.group].key);
        return { bytes: pack, name: packName(fileName), header: header };
    }

    //  1627725  ->  '1.6 MB'
    function size(n) {
        if (n < 1024) return n + ' bytes';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1024 / 1024).toFixed(1) + ' MB';
    }


    // ------------------------------------------------------
    //    4.  A PERSON'S CREDENTIAL   (.flogic-id)   and their SETUP CODE
    //
    //    The credential file holds the person's group keys,  locked with the setup code.
    //    The setup code is shown ONCE,  and saved nowhere   (not in the keyring either).
    //    Lost?   Make a new credential.
    //
    //    The keyring only remembers WHO has one:   { id, name, groups: [group ids], expires, made }   (no keys,  no code)
    // ------------------------------------------------------

    const NAME_MAX = 80;
    const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

    //  u-0001,  u-0002, ...   (one more than the biggest so far)
    function nextPersonId(s) {
        let n = 0;
        for (const p of s.people) {
            const m = /^u-(\d+)$/.exec(p.id);
            if (m) n = Math.max(n, Number(m[1]));
        }
        return 'u-' + String(n + 1).padStart(4, '0');
    }

    //  Dec 31 of this year
    function defaultExpiry() { return new Date().getFullYear() + '-12-31'; }

    function expiryProblem(text) {
        const m = DATE_PATTERN.exec(String(text));
        const d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        if (!m || ymd(d) !== text) return 'Pick an expiry date.';
        if (text < today()) return 'The expiry date is already past.';
        return '';
    }

    function nameProblem(name) {
        const n = String(name).trim();
        if (!n) return 'Type the person\'s name.';
        if (n.length > NAME_MAX) return 'Keep the name under ' + NAME_MAX + ' characters.';
        return '';
    }

    //  'Fernando G'  ->  'fernando.flogic-id'      (no usable first name?  the id:  'u-0003.flogic-id')
    function credentialFileName(name, id) {
        const first = String(name).trim().split(/\s+/)[0] || '';
        const clean = first.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '');
        return (clean || id) + '.flogic-id';
    }

    //  who = { name, groups: [group ids], expires }
    async function makePerson(s, who) {
        const name = String(who.name).trim();
        const ids = Array.isArray(who.groups) ? who.groups : [];
        const groups = s.groups.filter(function (g) { return ids.indexOf(g.group) >= 0; });
        let problem = nameProblem(name) || expiryProblem(who.expires);
        if (!problem && groups.length === 0) problem = 'Pick at least one group.';
        if (!problem && groups.length !== new Set(ids).size) problem = 'One of those groups isn\'t in this keyring.';
        if (problem) throw fail('bad-person', problem);

        const id = nextPersonId(s);
        const person = {
            id: id, name: name, expires: who.expires,
            groups: groups.map(function (g) { return { group: g.group, label: g.label, rules: cleanRules(g.rules) }; }),
        };
        const keys = groups.map(function (g) { return { group: g.group, keyVersion: g.keyVersion, key: s.keys[g.group].key }; });
        const made = await VaultCore.makeCredential(person, keys);

        s.people.push({ id: id, name: name, groups: groups.map(function (g) { return g.group; }), expires: who.expires, made: today() });
        s.unsaved = true;
        return { credential: made.credential, setupCode: made.setupCode, fileName: credentialFileName(name, id) };
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

    //  A new element,  with its text set the safe way.
    function el(tag, text, className) {
        const e = document.createElement(tag);
        if (text !== undefined && text !== null) e.textContent = String(text);
        if (className) e.className = className;
        return e;
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
        drawGroups();
        drawGroupChoices();
        drawPeople();
        drawPersonGroups();
    }


    // ------------------------------------------------------
    //    4.  PEOPLE
    // ------------------------------------------------------

    function drawPeople() {
        const body = $('person-list');
        body.replaceChildren();
        for (const p of session.people) {
            const labels = p.groups.map(function (id) {
                const g = session.groups.find(function (x) { return x.group === id; });
                return g ? g.label : id;
            });
            const tr = el('tr');
            tr.appendChild(el('td', p.id, 'mono'));
            tr.appendChild(el('td', p.name));
            tr.appendChild(el('td', labels.join(', ')));
            tr.appendChild(el('td', p.expires));
            tr.appendChild(el('td', p.made));
            body.appendChild(tr);
        }
        $('person-none').hidden = session.people.length > 0;
    }

    //  One checkbox per group,  keeping what's ticked.
    function drawPersonGroups() {
        const box = $('c-groups');
        const ticked = Array.from(box.querySelectorAll('input:checked')).map(function (i) { return i.value; });
        box.replaceChildren();
        if (session.groups.length === 0) box.appendChild(el('p', 'Make a group first.', 'hint'));
        for (const g of session.groups) {
            const label = el('label', null, 'inline');
            const input = el('input');
            input.type = 'checkbox';
            input.value = g.group;
            input.checked = ticked.indexOf(g.group) >= 0;
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + g.label));
            box.appendChild(label);
        }
        $('c-btn').disabled = session.groups.length === 0;
    }

    function resetPersonForm() {
        $('c-name').value = '';
        $('c-expires').value = defaultExpiry();
        for (const i of $('c-groups').querySelectorAll('input')) i.checked = false;
    }

    function hideCode() {
        $('setup-code').textContent = '';
        $('code-for').textContent = '';
        $('copy-msg').textContent = '';
        $('code-panel').hidden = true;
    }

    async function onMakePerson() {
        const who = {
            name: $('c-name').value,
            expires: $('c-expires').value,
            groups: Array.from($('c-groups').querySelectorAll('input:checked')).map(function (i) { return i.value; }),
        };
        hideCode();
        await busy($('c-btn'), 'person-msg', async function () {
            const made = await makePerson(session, who);
            download(made.fileName, new Blob([JSON.stringify(made.credential, null, 2)], { type: 'application/json' }));
            $('code-for').textContent = made.credential.name + ' (' + made.fileName + ')';
            $('setup-code').textContent = made.setupCode;
            $('code-panel').hidden = false;
            resetPersonForm();
            markUnsaved();
            say('person-msg', 'Made ' + made.fileName + ' for ' + made.credential.name + ' (' + made.credential.id + '). Save the keyring to remember them.', 'good');
        });
    }

    async function onCopy() {
        const code = $('setup-code').textContent;
        try {
            await navigator.clipboard.writeText(code);
            $('copy-msg').textContent = 'Copied.';
        } catch (e) {
            //  No clipboard here:  select it,  so Ctrl + C works.
            const range = document.createRange();
            range.selectNodeContents($('setup-code'));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            $('copy-msg').textContent = 'Selected. Press Ctrl + C to copy.';
        }
    }


    // ------------------------------------------------------
    //    3.  PACK A FILE
    // ------------------------------------------------------

    //  The group list for "Pack":  rebuilt when the groups change,  keeping the choice.
    function drawGroupChoices() {
        const select = $('p-group');
        const was = select.value;
        select.replaceChildren();
        if (session.groups.length === 0) {
            select.appendChild(el('option', 'Make a group first'));
            select.disabled = true;
            $('p-btn').disabled = true;
            return;
        }
        for (const g of session.groups) {
            const o = el('option', g.label + ' (' + g.group + ')');
            o.value = g.group;
            select.appendChild(o);
        }
        if (session.groups.some(function (g) { return g.group === was; })) select.value = was;
        select.disabled = false;
        $('p-btn').disabled = false;
    }

    async function onPack() {
        const file = $('p-file').files[0];
        if (!file) { say('pack-msg', 'Pick a data file first.', 'bad'); return; }
        const problem = packProblem(file.name);
        if (problem) { say('pack-msg', problem, 'bad'); return; }
        const groupId = $('p-group').value;
        await busy($('p-btn'), 'pack-msg', async function () {
            const p = await packFile(session, file.name, await file.arrayBuffer(), groupId);
            download(p.name, new Blob([p.bytes], { type: 'application/octet-stream' }));
            const g = session.groups.find(function (x) { return x.group === groupId; });
            say('pack-msg', 'Packed ' + file.name + ' (' + size(file.size) + ') into ' + p.name + ' (' + size(p.bytes.length) +
                ') for ' + g.label + '.', 'good');
        });
    }


    // ------------------------------------------------------
    //    2.  GROUPS
    // ------------------------------------------------------

    let editingId = null;           //  the group being edited  (null = making a new one)
    let idTouched = false;          //  IT typed the id by hand:  stop filling it in from the name

    function drawGroups() {
        const body = $('group-list');
        body.replaceChildren();
        for (const g of session.groups) {
            const tr = el('tr');
            tr.appendChild(el('td', g.label));
            tr.appendChild(el('td', g.group, 'mono'));
            const ex = el('td');
            ex.appendChild(el('span', g.rules.export ? 'Yes' : 'No', g.rules.export ? 'yes' : 'no'));
            tr.appendChild(ex);
            tr.appendChild(el('td', g.rules.autoLockMin + ' min'));
            const td = el('td');
            const edit = el('button', 'Edit', 'small');
            edit.dataset.group = g.group;
            edit.addEventListener('click', function () { startEdit(g.group); });
            td.appendChild(edit);
            tr.appendChild(td);
            body.appendChild(tr);
        }
        $('group-none').hidden = session.groups.length > 0;
    }

    function readGroupForm() {
        return {
            label: $('g-label').value,
            group: $('g-id').value.trim(),
            rules: { export: $('g-export').checked, autoLockMin: Number($('g-autolock').value) },
        };
    }

    function resetGroupForm() {
        editingId = null;
        idTouched = false;
        $('g-label').value = '';
        $('g-id').value = '';
        $('g-id').disabled = false;
        $('g-export').checked = true;       //  starts at Yes  (DJ's call,  relay/dj-log.md,  Nov 5).   IT unchecks it per group.
        $('g-autolock').value = String(AUTOLOCK_DEFAULT);
        $('group-form-title').textContent = 'Make a group';
        $('g-add').textContent = 'Make group';
        $('g-cancel').hidden = true;
        $('g-edit-note').hidden = true;
        $('g-id-hint').textContent = 'Small letters, numbers and dashes. It can\'t change later.';
    }

    function startEdit(id) {
        const g = session.groups.find(function (x) { return x.group === id; });
        if (!g) return;
        editingId = id;
        $('g-label').value = g.label;
        $('g-id').value = g.group;
        $('g-id').disabled = true;
        $('g-export').checked = g.rules.export;
        $('g-autolock').value = String(g.rules.autoLockMin);
        $('group-form-title').textContent = 'Edit "' + g.label + '"';
        $('g-add').textContent = 'Save changes';
        $('g-cancel').hidden = false;
        $('g-edit-note').hidden = false;
        $('g-id-hint').textContent = 'A group\'s id never changes.';
        say('group-msg', '');
        $('g-label').focus();
    }

    async function onGroupSave() {
        const form = readGroupForm();
        if (editingId) {
            try {
                const g = editGroup(session, editingId, form);
                resetGroupForm();
                markUnsaved();
                say('group-msg', 'Changed "' + g.label + '". Save the keyring to keep it.', 'good');
            } catch (e) { say('group-msg', e.message, 'bad'); }
            return;
        }
        //  Say what's wrong right away  (addGroup checks again).
        const problem = labelProblem(form.label) || groupIdProblem(form.group, session) || rulesProblem(form.rules);
        if (problem) { say('group-msg', problem, 'bad'); return; }
        await busy($('g-add'), 'group-msg', async function () {
            const g = await addGroup(session, form);
            resetGroupForm();
            markUnsaved();
            say('group-msg', 'Made "' + g.label + '" (' + g.group + '), with a new key. Save the keyring to keep it.', 'good');
        });
    }

    function onLabelInput() {
        if (!editingId && !idTouched) $('g-id').value = slugify($('g-label').value);
    }

    function onIdInput() {
        idTouched = $('g-id').value !== '';
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
        resetGroupForm();
        say('group-msg', '');
        $('p-file').value = '';
        say('pack-msg', '');
        $('c-groups').replaceChildren();
        resetPersonForm();
        hideCode();
        say('person-msg', '');
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
        resetGroupForm();
        say('group-msg', '');
        $('group-list').replaceChildren();      //  hidden isn't enough:  take the names off the page
        $('p-group').replaceChildren();
        $('p-file').value = '';
        say('pack-msg', '');
        $('person-list').replaceChildren();
        $('c-groups').replaceChildren();
        resetPersonForm();
        hideCode();
        say('person-msg', '');
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
        $('g-add').addEventListener('click', onGroupSave);
        $('g-cancel').addEventListener('click', function () { resetGroupForm(); say('group-msg', ''); });
        $('g-label').addEventListener('input', onLabelInput);
        $('g-id').addEventListener('input', onIdInput);
        $('p-btn').addEventListener('click', onPack);
        $('p-file').addEventListener('change', function () { say('pack-msg', ''); });
        $('c-btn').addEventListener('click', onMakePerson);
        $('copy-btn').addEventListener('click', onCopy);
        $('code-done').addEventListener('click', function () { hideCode(); say('person-msg', ''); });
        resetPersonForm();
        resetGroupForm();
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
        slugify: slugify, groupIdProblem: groupIdProblem, rulesProblem: rulesProblem, addGroup: addGroup, editGroup: editGroup,
        packProblem: packProblem, packName: packName, packFile: packFile,
        nextPersonId: nextPersonId, defaultExpiry: defaultExpiry, expiryProblem: expiryProblem,
        credentialFileName: credentialFileName, makePerson: makePerson,
    });

})();
