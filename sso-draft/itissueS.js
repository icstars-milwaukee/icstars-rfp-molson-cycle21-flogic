/*
    ==========================================================

        itissueS.js   -   IT'S SIDE  (draft):   a request   ->   a sign-in file

        1.  open IT's keyring + IT's signing key  (one IT passphrase)
        2.  find the person's request:   in the SHARED FOLDER  (OneDrive / Drive / a share),  or a file you were sent
        3.  the voice check:   they read their laptop code out;  YOU TYPE IT.   The page checks it.   (It never shows
            you the code,  so it can't be read to them:  that would check nothing.)
        4.  pick them in the keyring  (their groups are what the keyring says),  and an end date
        5.  "Make their sign-in file"  ->  into the shared folder's outbox,  or downloaded when there is no folder
        6.  "Renew everyone":  new files for everyone IT already signed,  with today's groups.   No second voice check:
            the laptop's key was checked the first time,  and a request file can't change its key  (the name is its hash).

        Keeps nothing.   The keyring and the signing key are open only in this page's memory,  until Lock.

    ==========================================================
*/

(function () {

    'use strict';

    const S = SignInCore;
    function $(id) { return document.getElementById(id); }
    let ring = null, signer = null, request = null, box = null;

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
    function plain(s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

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
            reconnect(false);
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


    // ---- the shared folder ----

    async function reconnect(ask) {
        if (box) return box;
        if (!Mailbox.supported()) { $('connect-folder').hidden = true; say('folder-status', 'This browser can\'t use a shared folder: open request files by hand below.'); return null; }
        try {
            const h = await Mailbox.recall('it');
            if (!h || !await Mailbox.allowed(h, ask)) return null;
            box = await Mailbox.open(h);
        } catch (e) { box = null; return null; }
        folderOn(); look();
        return box;
    }
    function folderOn() {
        $('connect-folder').hidden = true; $('inbox-part').hidden = false;
        say('folder-status', 'Connected: "' + box.name + '".', 'good');
    }
    $('connect-folder').addEventListener('click', async function () {
        try {
            if (!await reconnect(true)) {
                const h = await Mailbox.pick();
                box = await Mailbox.open(h);
                try { await Mailbox.remember(h, 'it'); } catch (e) { /* asks again next time */ }
                folderOn(); look();
            }
        } catch (e) { if (e.code !== 'cancelled') say('folder-status', e.message, 'problem'); }
    });
    $('refresh').addEventListener('click', function () { look(); });

    //  The inbox,  newest information first:  who's waiting,  and who already has an answer
    async function look() {
        if (!box || !ring) return;
        const list = $('inbox-list');
        try {
            const got = await box.listRequests();
            const done = {};
            (await box.listSignins()).forEach(function (s) { done[s.fp] = true; });
            list.replaceChildren();
            got.requests.forEach(function (r) {
                const li = document.createElement('li');
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'quiet'; b.textContent = done[r.fp] ? 'Open again' : 'Open';
                b.addEventListener('click', function () { choose(r.request); });
                const t = document.createElement('span');
                t.textContent = r.name + '   ·   made ' + r.made + (done[r.fp] ? '   ·   answered' : '   ·   waiting');
                li.appendChild(t); li.appendChild(b); list.appendChild(li);
            });
            $('inbox-note').textContent = (got.requests.length ? '' : 'No requests yet.') +
                (got.skipped ? ' ' + got.skipped + ' file' + (got.skipped === 1 ? '' : 's') + ' in the inbox weren\'t valid requests and were ignored.' : '') +
                (got.more ? ' The inbox is very full: only the first ones are shown.' : '');
        } catch (e) { say('folder-status', 'Couldn\'t read the folder: ' + e.message, 'problem'); }
    }


    // ---- choosing a request  (from the folder,  or a file you were sent) ----

    function choose(r) {
        request = r; $('code-typed').value = ''; $('code-state').textContent = '';
        say('req-who', 'From "' + r.name + '", made ' + r.made + '.');
        $('req-check').hidden = false;
        const match = ring.people.find(function (p) { return p.name.toLowerCase() === r.name.toLowerCase(); });
        if (match) {
            $('person').value = match.id; drawGroups();
            $('req-who').textContent += ' The name matches ' + match.name + ' in the keyring: that is only a guess from the name, so be sure it\'s them on the phone.';
        }
        $('code-typed').focus();
    }

    $('req-file').addEventListener('change', async function () {
        request = null; $('req-check').hidden = true; $('code-typed').value = '';
        say('req-who', '');
        const f = $('req-file').files[0];
        if (!f) return;
        try { choose(await S.readRequest(await f.text())); }
        catch (e) { say('req-who', e.code === 'not-a-file' ? 'That isn\'t a sign-in request.' : e.message, 'problem'); }
    });

    $('code-typed').addEventListener('input', function () {
        if (!request) { $('code-state').textContent = ''; return; }
        const typed = plain($('code-typed').value);
        $('code-state').textContent = typed.length < 16 ? '' : (typed === plain(request.fingerprint) ? 'Matches.' : 'Doesn\'t match: don\'t issue this.');
        $('code-state').className = typed.length < 16 ? 'small' : (typed === plain(request.fingerprint) ? 'good' : 'problem');
    });


    // ---- issuing ----

    $('issue').addEventListener('click', async function () {
        say('issue-msg', '');
        const p = person(), end = endOfDay($('until').value);
        if (!request) { say('issue-msg', 'Pick their request first.', 'problem'); return; }
        if (plain($('code-typed').value) !== plain(request.fingerprint)) { say('issue-msg', 'Type the laptop code they read out. It has to match their request.', 'problem'); return; }
        if (!p) { say('issue-msg', 'Pick who it\'s for.', 'problem'); return; }
        if (!end || end <= new Date()) { say('issue-msg', 'Pick an end date from today on.', 'problem'); return; }
        if (p.expires && end > endOfDay(p.expires)) { say('issue-msg', 'That\'s after their access ends (' + p.expires + ').', 'problem'); return; }
        const groups = groupsFor(p);
        if (!groups.length) { say('issue-msg', p.name + ' isn\'t in any group.', 'problem'); return; }
        try {
            const signin = await busy($('issue'), 'Signing…', function () { return S.issue(signer, request, p, groups, end); });
            if (box) {
                await box.putRequest(request);                         //  keep the checked request:  renewals need it
                await box.putSignin(request.fingerprint, signin);
                say('issue-msg', 'Answered ' + p.name + ' through the shared folder, good until ' + $('until').value + '. Their page signs them in by itself. It opens only on their laptop.', 'good');
                look();
            } else {
                const name = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.flogic-signin';
                download(name, JSON.stringify(signin, null, 2));
                say('issue-msg', 'Saved ' + name + ' for ' + p.name + ', good until ' + $('until').value + '. Send it to them. It opens only on their laptop.', 'good');
            }
        } catch (e) { say('issue-msg', 'Couldn\'t make it: ' + e.message, 'problem'); }
    });


    // ---- renewing everyone ----

    $('renew-all').addEventListener('click', async function () {
        say('renew-msg', '');
        const end = endOfDay($('until').value);
        if (!box) { say('renew-msg', 'Connect the shared folder first.', 'problem'); return; }
        if (!end || end <= new Date()) { say('renew-msg', 'Pick an end date from today on (the "Good until" date below).', 'problem'); return; }
        let renewed = 0; const skipped = [];
        try {
            await busy($('renew-all'), 'Renewing…', async function () {
                const done = await box.listSignins();
                for (const old of done) {
                    let claims;
                    try { claims = await S.readIssued(S.readSignin(old.text), FLOGIC_IT_SIGNER); }
                    catch (e) { skipped.push(old.fp + ': not signed by this key'); continue; }
                    const p = ring.people.find(function (x) { return x.id === claims.sub; });
                    if (!p) { skipped.push(claims.name + ': no longer in the keyring'); continue; }
                    if (p.expires && endOfDay(p.expires) <= new Date()) { skipped.push(p.name + ': their access has ended'); continue; }
                    const groups = groupsFor(p);
                    if (!groups.length) { skipped.push(p.name + ': not in any group now'); continue; }
                    const req = await box.getRequest(old.fp);
                    if (!req) { skipped.push(p.name + ': their request is gone from the inbox'); continue; }
                    const until = p.expires && endOfDay(p.expires) < end ? endOfDay(p.expires) : end;
                    await box.putSignin(old.fp, await S.issue(signer, req, p, groups, until));
                    renewed++;
                }
            });
            say('renew-msg', 'Renewed ' + renewed + (renewed === 1 ? ' person' : ' people') + ', good until ' + $('until').value + '.' +
                (skipped.length ? ' Left out: ' + skipped.join('; ') + '.' : ''), skipped.length ? 'warn' : 'good');
            look();
        } catch (e) { say('renew-msg', 'Couldn\'t renew everyone: ' + e.message, 'problem'); }
    });

    $('lock').addEventListener('click', function () {
        ring = null; signer = null; request = null; box = null;
        ['ring-file', 'signer-file', 'req-file'].forEach(function (id) { $(id).value = ''; });
        $('code-typed').value = ''; $('inbox-list').replaceChildren(); $('inbox-part').hidden = true; $('connect-folder').hidden = false;
        $('open-part').hidden = true; $('locked').hidden = false;
        say('open-why', 'Locked.', 'good');
    });

})();
