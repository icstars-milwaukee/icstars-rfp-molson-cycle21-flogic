/*
    ==========================================================

        itissueS.js   -   IT'S SIDE  (draft):   a request file   ->   a sign-in file

        1.  open IT's keyring + IT's signing key  (one IT passphrase)
        2.  open the person's  .flogic-request,   and check the laptop code with them  (by voice)
        3.  pick them in the keyring  (their groups are what the keyring says),  and an end date
        4.  "Make their sign-in file"  ->  download  name.flogic-signin

        Keeps nothing.   The keyring and the signing key are open only in this page's memory,  until Lock.

    ==========================================================
*/

(function () {

    'use strict';

    const S = SignInCore;
    function $(id) { return document.getElementById(id); }
    let ring = null, signer = null, request = null;

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
                const signerFile = S.readSigner(await sf.text());
                signer = await S.openSigner(signerFile, $('it-pass').value);
                ring = await S.keyringGroups(await rf.text(), $('it-pass').value);
            });
            $('it-pass').value = '';
            $('locked').hidden = true; $('open-part').hidden = false;
            say('open-who', 'Open: ' + ring.groups.length + ' groups, ' + ring.people.length + ' people. Signing key ' + signer.fingerprint + '.', 'good');
            drawPeople();
            $('until').value = ymd(new Date(Date.now() + 7 * 86400000));
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

    function drawPeople() {
        const sel = $('person');
        sel.replaceChildren();
        ring.people.forEach(function (p) {
            const o = document.createElement('option');
            o.value = p.id; o.textContent = p.name + '  (' + p.id + ')';
            sel.appendChild(o);
        });
        drawGroups();
    }
    function person() { return ring.people.find(function (p) { return p.id === $('person').value; }); }
    function groupsFor(p) { return ring.groups.filter(function (g) { return p.groups.indexOf(g.group) >= 0; }); }
    function drawGroups() {
        const p = person();
        $('person-groups').textContent = p ? 'Groups: ' + (groupsFor(p).map(function (g) { return g.label; }).join(' · ') || 'none') +
                                             (p.expires ? '.  Their access ends ' + p.expires + '.' : '') : '';
        if (p && p.expires) $('until').max = p.expires;
    }
    $('person').addEventListener('change', drawGroups);

    $('req-file').addEventListener('change', async function () {
        request = null; $('req-check').hidden = true; $('code-ok').checked = false;
        say('req-who', '');
        const f = $('req-file').files[0];
        if (!f) return;
        try {
            request = await S.readRequest(await f.text());
            say('req-who', 'From "' + request.name + '", made ' + request.made + '.');
            $('req-code').textContent = request.fingerprint; $('req-check').hidden = false;
            const match = ring.people.find(function (p) { return p.name.toLowerCase() === request.name.toLowerCase(); });
            if (match) { $('person').value = match.id; drawGroups(); }
        } catch (e) { say('req-who', e.code === 'not-a-file' ? 'That isn\'t a sign-in request.' : e.message, 'problem'); }
    });

    $('issue').addEventListener('click', async function () {
        say('issue-msg', '');
        const p = person(), end = endOfDay($('until').value);
        if (!request) { say('issue-msg', 'Open their request file first.', 'problem'); return; }
        if (!$('code-ok').checked) { say('issue-msg', 'Check the laptop code with them first.', 'problem'); return; }
        if (!p) { say('issue-msg', 'Pick who it\'s for.', 'problem'); return; }
        if (!end || end <= new Date()) { say('issue-msg', 'Pick an end date from today on.', 'problem'); return; }
        if (p.expires && end > endOfDay(p.expires)) { say('issue-msg', 'That\'s after their access ends (' + p.expires + ').', 'problem'); return; }
        const groups = groupsFor(p);
        if (!groups.length) { say('issue-msg', p.name + ' isn\'t in any group.', 'problem'); return; }
        try {
            const signin = await busy($('issue'), 'Signing…', function () { return S.issue(signer, request, p, groups, end); });
            const name = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.flogic-signin';
            download(name, JSON.stringify(signin, null, 2));
            say('issue-msg', 'Saved ' + name + ' for ' + p.name + ', good until ' + $('until').value + '. Send it to them. It opens only on their laptop.', 'good');
        } catch (e) { say('issue-msg', 'Couldn\'t make it: ' + e.message, 'problem'); }
    });

    $('lock').addEventListener('click', function () {
        ring = null; signer = null; request = null;
        ['ring-file', 'signer-file', 'req-file'].forEach(function (id) { $(id).value = ''; });
        $('open-part').hidden = true; $('locked').hidden = false;
        say('open-why', 'Locked.', 'good');
    });

})();
