/*
    ==========================================================

        itissueS.js   -   IT'S SIDE  (filekey,  v0.3.0)

        1.  open IT's keyring + IT's signing key  (one IT passphrase)
        2.  connect IT's Flogic folder  (a subfolder per person,  each shared with that person only)
        3.  per person:  "Make key file"   ->   <folder>/<id>/flogic.flogic-key       (or a download,  with no folder)
            "Renew everyone":  a fresh key file for everyone in the keyring,  with TODAY's groups.
            Someone removed from a group,  or from the keyring,  loses it when their current file ends.

        Keeps nothing.   The keyring and the signing key are open only in this page's memory,  until Lock.

    ==========================================================
*/

(function () {

    'use strict';

    const S = SignInCore;
    function $(id) { return document.getElementById(id); }
    let ring = null, signer = null, folder = null;

    function say(id, text, kind) { $(id).textContent = text; $(id).className = kind || ''; }
    function download(fileName, text) {
        window.__flogicLastDownload = { fileName: fileName, text: text };      //  the tests read this
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function endOfDay(text) { const d = new Date(text + 'T23:59:59'); return isNaN(d) ? null : d; }
    async function busy(btn, words, work) {
        const was = btn.textContent; btn.disabled = true; btn.textContent = words;
        try { return await work(); } finally { btn.disabled = false; btn.textContent = was; }
    }

    $('open').addEventListener('click', async function () {
        say('open-why', '');
        const rf = $('ring-file').files[0], sf = $('signer-file').files[0];
        if (!rf || !sf) { say('open-why', 'Pick the keyring and the signing key first.', 'problem'); return; }
        try {
            await busy($('open'), 'Opening…', async function () {
                signer = await S.openSigner(S.readSigner(await sf.text()), $('it-pass').value);
                ring = await S.keyringGroups(await rf.text(), $('it-pass').value);
            });
            $('it-pass').value = '';
            $('locked').hidden = true; $('open-part').hidden = false;
            say('open-who', 'Open: ' + ring.groups.length + ' groups, ' + ring.people.length + ' people. Signing key ' + signer.fingerprint + '.', 'good');
            $('until').value = ymd(new Date(Date.now() + 7 * 86400000));
            if (!Mailbox.supported()) { $('connect-folder').hidden = true; say('folder-status', 'This browser can\'t use a drive folder: key files download instead.'); }
            await reconnect(false);
            draw();
        } catch (e) {
            signer = null; ring = null;
            say('open-why', e.code === 'wrong-secret' ? 'That passphrase doesn\'t open them.' : e.message, 'problem');
        }
    });

    $('new-signer').addEventListener('click', async function () {
        const p = $('it-pass').value, issue = VaultCore.passphraseProblem(p);
        if (issue) { say('open-why', issue, 'problem'); return; }
        const made = await busy($('new-signer'), 'Making…', function () { return S.newSigner(p); });
        download('it.flogic-signer', JSON.stringify(made, null, 2));
        say('open-why', 'Saved it.flogic-signer (' + made.fingerprint + '). Each copy of the app needs its public half in it-signerS.js.', 'good');
    });


    // ---- the folder ----

    async function reconnect(ask) {
        if (folder || !Mailbox.supported()) return folder;
        try {
            const h = await Mailbox.recall('it');
            if (!h || !await Mailbox.allowed(h, 'readwrite', ask)) return null;
            folder = await Mailbox.openIT(h);
            folderOn();
        } catch (e) { folder = null; }
        return folder;
    }
    function folderOn() { $('connect-folder').hidden = true; $('folder-drop').hidden = true; say('folder-status', 'Connected: "' + folder.name + '". Key files go into each person\'s subfolder.', 'good'); }
    async function useFolder(h) {
        if (!await Mailbox.allowed(h, 'readwrite', true)) throw Object.assign(new Error('Flogic needs your OK to write key files into that folder.'), { name: 'NotAllowedError' });
        folder = await Mailbox.openIT(h);
        try { await Mailbox.remember(h, 'it'); } catch (e) { /* asks again next time */ }
        folderOn(); draw();
    }
    function folderFailed(e) {
        console.warn('Flogic IT: connecting the folder failed:', e);
        say('folder-status', Mailbox.whyNot(e), 'problem');
    }
    $('connect-folder').addEventListener('click', function () {
        const picking = Mailbox.pick('readwrite');                   //  FIRST,  straight from the click
        say('folder-status', 'Pick a folder in the window that opened (check the taskbar if you don\'t see it), then allow Flogic to edit it.');
        picking.then(useFolder).catch(folderFailed);
    });
    //  Or drag the folder onto the page  (no picker window at all)
    const drop = $('folder-drop');
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) {
        e.preventDefault(); drop.classList.remove('over');
        const got = Mailbox.fromDrop(e);                             //  FIRST,  during the drop
        got.then(function (r) {
            if (!r.dir) throw Object.assign(new Error('That\'s a file. Drag IT\'s Flogic FOLDER here (the one that will hold a subfolder per person).'), { name: 'Error' });
            return useFolder(r.dir);
        }).catch(folderFailed);
    });


    // ---- people ----

    function groupsFor(p) { return ring.groups.filter(function (g) { return p.groups.indexOf(g.group) >= 0; }); }
    function accessEnded(p) { return p.expires && endOfDay(p.expires) <= new Date(); }

    //  What's in their folder now   (display only:  the person's page checks the signature)
    async function statusOf(p) {
        if (!folder) return '';
        try {
            const t = await folder.getKeyFor(p.id);
            if (!t) return 'no key file yet';
            const c = JSON.parse(JSON.parse(t).claims);
            const end = new Date(c.expires);
            return (end < new Date() ? 'key file ended ' : 'key file good until ') + ymd(end);
        } catch (e) { return 'key file unreadable'; }
    }

    async function draw() {
        if (!ring) return;
        const list = $('people');
        list.replaceChildren();
        for (const p of ring.people) {
            const li = document.createElement('li');
            const t = document.createElement('span');
            t.id = 'status-' + p.id;
            const gs = groupsFor(p).map(function (g) { return g.label; }).join(' · ') || 'no groups';
            t.textContent = p.name + '  (' + p.id + ')   ·   ' + gs + (accessEnded(p) ? '   ·   access ended ' + p.expires : '');
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'quiet'; b.id = 'make-' + p.id; b.textContent = 'Make key file';
            b.addEventListener('click', function () { make(p, b); });
            li.appendChild(t); li.appendChild(b); list.appendChild(li);
            const s = await statusOf(p);
            if (s) t.textContent += '   ·   ' + s;
        }
    }

    //  ->  the key file,  or throws a plain reason
    async function keyFor(p) {
        const end = endOfDay($('until').value);
        if (!end || end <= new Date()) throw new Error('Pick a "Good until" date from today on.');
        if (accessEnded(p)) throw new Error(p.name + '\'s access ended on ' + p.expires + '.');
        const groups = groupsFor(p);
        if (!groups.length) throw new Error(p.name + ' isn\'t in any group.');
        const until = p.expires && endOfDay(p.expires) < end ? endOfDay(p.expires) : end;
        return { file: await S.issueKey(signer, p, groups, until), until: until };
    }

    async function make(p, btn) {
        say('issue-msg', '');
        try {
            const made = await busy(btn, 'Signing…', function () { return keyFor(p); });
            const text = JSON.stringify(made.file, null, 2);
            if (folder) {
                await folder.putKeyFor(p.id, text);
                say('issue-msg', 'Put ' + p.name + '\'s key file in their folder (' + p.id + '), good until ' + ymd(made.until) + '.', 'good');
            } else {
                download(Mailbox.KEY_FILE, text);
                say('issue-msg', 'Saved ' + p.name + '\'s key file (' + Mailbox.KEY_FILE + '), good until ' + ymd(made.until) + '. Put it in their drive folder, shared with them only.', 'good');
            }
            draw();
        } catch (e) { say('issue-msg', 'Couldn\'t make it: ' + e.message, 'problem'); }
    }

    $('renew-all').addEventListener('click', async function () {
        say('issue-msg', '');
        if (!folder) { say('issue-msg', 'Connect IT\'s Flogic folder first.', 'problem'); return; }
        let renewed = 0; const left = [];
        await busy($('renew-all'), 'Renewing…', async function () {
            for (const p of ring.people) {
                try { const made = await keyFor(p); await folder.putKeyFor(p.id, JSON.stringify(made.file, null, 2)); renewed++; }
                catch (e) { left.push(e.message); }
            }
        });
        say('issue-msg', 'Renewed ' + renewed + (renewed === 1 ? ' person' : ' people') + ', good until ' + $('until').value + '.' +
            (left.length ? ' Left out: ' + left.join(' ') : ''), left.length ? 'warn' : 'good');
        draw();
    });

    $('lock').addEventListener('click', function () {
        ring = null; signer = null; folder = null;
        ['ring-file', 'signer-file'].forEach(function (id) { $(id).value = ''; });
        $('people').replaceChildren(); $('connect-folder').hidden = false; $('folder-drop').hidden = false;
        $('open-part').hidden = true; $('locked').hidden = false;
        say('open-why', 'Locked.', 'good');
    });

})();
