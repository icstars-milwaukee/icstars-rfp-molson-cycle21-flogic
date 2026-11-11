/*
    mailbox-testsS.js   -   the shared-folder mailbox,  and IT's "did we sign this?" check.   Made-up data only.
    runMailboxTests(check, env, S, Mailbox, makeMemoryFolder)       (env as in core-testsS.js)
*/
async function runMailboxTests(check, env, S, Mailbox, makeMemoryFolder) {
    'use strict';
    const PASS = 'flogic demo keyring only', FAST = 1000;
    async function code(fn, want) {
        try { await fn(); return 'no error'; } catch (e) { return e.code === want ? true : 'code ' + e.code + ': ' + e.message; }
    }
    const day = 86400000;
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    const signer = await S.openSigner(S.readSigner(await env.text('sso-draft/demo/demo-it.flogic-signer')), PASS);
    const ring = await S.keyringGroups(await env.text('demo-data/packs/demo-it.flogic-keyring'), PASS);
    const sd = ring.groups.find(function (g) { return g.group === 'service-desk'; });
    const fern = { id: 'fernando', name: 'Fernando G' };

    // ---- a person leaves a request ----
    const root = makeMemoryFolder('Flogic mailbox');
    const box = await Mailbox.open(root);
    check('mailbox: opening makes inbox and outbox', root.__dirs.has('inbox') && root.__dirs.has('outbox'));
    const lap = await S.newLaptop('Fernando G', 'correct horse battery staple', FAST);
    const fp = await box.putRequest(lap.request);
    const inboxFiles = root.__dirs.get('inbox').__files;
    check('mailbox: the request lands under the laptop code, nothing else', fp === lap.record.id &&
          Array.from(inboxFiles.keys()).join() === fp + '.flogic-request');
    const other = await S.newLaptop('Someone Else', 'another laptop entirely here', FAST);
    const swapped = Object.assign({}, lap.request, { publicKey: other.request.publicKey });
    const before = inboxFiles.size;
    check('mailbox: a request whose key doesn\'t match its code is refused', await code(function () { return box.putRequest(swapped); }, 'damaged'));
    check('mailbox: ...and nothing is written for it', inboxFiles.size === before);
    check('mailbox: the person\'s side never writes a private key', !JSON.stringify(Array.from(inboxFiles.values())).includes('"d":'));

    // ---- IT looks:  the folder is hostile ----
    inboxFiles.set('../../evil.flogic-request', '{}');                                       //  a path trick
    inboxFiles.set('Fernando.flogic-request', '{}');                                         //  a name,  not a code
    inboxFiles.set('HHHH-HHHH-HHHH-HHHH.flogic-request', 'not json');                        //  a code,  but junk inside
    inboxFiles.set(other.record.id + '.flogic-request', JSON.stringify(lap.request));        //  someone else's request under the wrong code
    inboxFiles.set('JJJJ-JJJJ-JJJJ-JJJJ.flogic-request', 'x'.repeat(300 * 1024));            //  too big
    inboxFiles.set('notes.txt', 'hello');
    const listed = await box.listRequests();
    check('mailbox: IT sees only the good request', listed.requests.length === 1 && listed.requests[0].fp === fp,
          JSON.stringify(listed.requests.map(function (r) { return r.fp; })));
    check('mailbox: path tricks, wrong names, mismatched codes and huge files are skipped, not trusted', listed.skipped >= 5, listed.skipped);
    check('mailbox: a request filed under another laptop\'s code is not believed', (await box.getRequest(other.record.id)) === null);
    check('mailbox: a path is never taken from a name', await code(function () { return box.getSignin('../../etc/passwd'); }, 'not-a-file') === true &&
          await code(function () { return box.putSignin('..\\x', {}); }, 'not-a-file') === true);
    Array.from(inboxFiles.keys()).forEach(function (k) { if (k !== fp + '.flogic-request') inboxFiles.delete(k); });

    // ---- a flooded inbox doesn't freeze IT ----
    const flood = makeMemoryFolder('Flood'), fbox = await Mailbox.open(flood), A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    for (let i = 0; i < 520; i++) {
        const n = (A[i % 31] + A[Math.floor(i / 31) % 31]) + 'AA-BBBB-CCCC-DDDD';
        flood.__dirs.get('inbox').__files.set(n + '.flogic-request', 'junk');
    }
    const fl = await fbox.listRequests();
    check('mailbox: a flooded inbox is cut off and says so', fl.more === true, JSON.stringify({ more: fl.more, skipped: fl.skipped }));

    // ---- IT answers,  the person picks it up ----
    const req = listed.requests[0].request;
    check('mailbox: no answer yet means null, not an error', (await box.getSignin(fp)) === null);
    const end = new Date(Date.now() + 7 * day);
    const signin = await S.issue(signer, req, fern, [sd], end);
    await box.putSignin(fp, signin);
    const got = [];
    const stop = Mailbox.watch(box, fp, async function (t) { got.push(t); }, 50);
    await wait(300);
    stop();
    check('watch: the answer is found, once', got.length === 1, got.length);
    const parsed = S.readSignin(got[0]);
    const claims = await S.check(parsed, env.pinned, lap.record.id);
    const priv = await S.openLaptop(lap.record, 'correct horse battery staple');
    const keys = await S.openKeys(parsed, claims, priv);
    check('end to end: request -> folder -> sign-in -> keys open on that laptop', keys.length === 1 && keys[0].group === 'service-desk');

    // ---- the folder can't fake an answer ----
    const outFiles = root.__dirs.get('outbox').__files;
    const edited = JSON.parse(outFiles.get(fp + '.flogic-signin'));
    const c = JSON.parse(edited.claims); c.expires = new Date(Date.now() + 900 * day).toISOString(); edited.claims = JSON.stringify(c);
    check('folder attack: a longer end date typed into the file is refused', await code(function () { return S.check(S.readSignin(edited), env.pinned, lap.record.id); }, 'bad-signature'));
    const otherSigner = await S.openSigner(await S.newSigner('some other IT passphrase', FAST), 'some other IT passphrase');
    const forged = await S.issue(otherSigner, req, fern, [sd], end);
    outFiles.set(fp + '.flogic-signin', JSON.stringify(forged));
    check('folder attack: a sign-in made by someone else\'s key is refused', await code(async function () {
        await S.check(S.readSignin(await box.getSignin(fp)), env.pinned, lap.record.id);
    }, 'wrong-issuer'));
    const otherSignin = await S.issue(signer, other.request, { id: 'someone', name: 'Someone Else' }, [sd], end);
    outFiles.set(fp + '.flogic-signin', JSON.stringify(otherSignin));
    check('folder attack: another laptop\'s sign-in copied under my code is refused', await code(async function () {
        await S.check(S.readSignin(await box.getSignin(fp)), env.pinned, lap.record.id);
    }, 'wrong-laptop'));
    outFiles.delete(fp + '.flogic-signin');
    check('folder attack: deleting the answer just means "not there yet"', (await box.getSignin(fp)) === null);

    // ---- IT renews without a second voice check ----
    const shortLived = await S.issue(signer, req, fern, [sd], new Date(Date.now() + 1200));
    await box.putSignin(fp, shortLived);
    await wait(1500);
    const old = (await box.listSignins())[0];
    const oldClaims = await S.readIssued(S.readSignin(old.text), env.pinned);
    check('renew: IT recognises its own sign-in even after it ran out', oldClaims.laptop === fp && new Date(oldClaims.expires) < new Date());
    check('renew: the person\'s check refuses it, though', await code(function () { return S.check(S.readSignin(old.text), env.pinned, fp); }, 'expired'));
    const inReq = await box.getRequest(old.fp);
    const renewed = await S.issue(signer, inReq, { id: oldClaims.sub, name: oldClaims.name }, [sd], new Date(Date.now() + 7 * day));
    const rc = await S.check(renewed, env.pinned, fp);
    check('renew: a new file for the same laptop works, with a new serial', rc.serial !== oldClaims.serial && new Date(rc.issued) >= new Date(oldClaims.issued));
    check('renew: IT refuses to "renew" a file it didn\'t sign', await code(function () { return S.readIssued(forged, env.pinned); }, 'bad-signature'));
    const tampered = Object.assign({}, signin, { claims: JSON.stringify(Object.assign(JSON.parse(signin.claims), { name: 'Boss' })) });
    check('renew: IT refuses an edited file', await code(function () { return S.readIssued(tampered, env.pinned); }, 'bad-signature'));
    const keysSwapped = Object.assign({}, signin, { keys: Object.assign({}, signin.keys, { salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }) });
    check('renew: IT refuses a file whose keys part was swapped', await code(function () { return S.readIssued(keysSwapped, env.pinned); }, 'damaged'));

    // ---- permission ----
    const denied = Object.assign(makeMemoryFolder('Locked'), { queryPermission: async function () { return 'prompt'; }, requestPermission: async function () { return 'denied'; } });
    check('permission: a folder the browser hasn\'t re-allowed isn\'t used', await code(function () { return Mailbox.open(denied); }, 'no-permission'));
    check('permission: no folder access in this browser is said plainly', await code(function () { return Mailbox.pick(); }, 'no-folder-access'));
}
