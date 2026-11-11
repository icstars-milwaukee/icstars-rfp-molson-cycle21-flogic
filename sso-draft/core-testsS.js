/*
    core-testsS.js   -   the filekey checks,  run in Node  (run-node-test.mjs)  and in the browser  (signin-test.html).

    runCoreTests(check, env)
        check(name, ok, detail)          records one result
        env.text(path) / env.bytes(path) reads a repo file   (path from the repo root)
        env.pinned                       the app's pinned IT key   (FLOGIC_IT_SIGNER)

    Made-up data only:  the demo keyring,  packs and signer.
*/
async function runCoreTests(check, env) {

    'use strict';

    const S = SignInCore, V = VaultCore;
    const PASS = 'flogic demo keyring only';
    const FAST = 1000;                               //  PBKDF2 rounds for laptop copies in tests only (speed)
    const PIN = '482916';

    async function code(fn, want) {
        try { await fn(); return 'no error'; }
        catch (e) { return e.code === want ? true : 'code ' + e.code + ': ' + e.message; }
    }
    function edit(file, fn) {                        //  a copy with its claims changed  (signature kept)
        const c = JSON.parse(file.claims); fn(c);
        return Object.assign({}, file, { claims: JSON.stringify(c) });
    }
    const soon = function (ms) { return new Date(Date.now() + ms); };
    const day = 86400000;

    // ---- IT's signing key ----
    const signerFile = S.readSigner(await env.text('sso-draft/demo/demo-it.flogic-signer'));
    check('signer: the demo signer matches the app\'s pinned key', signerFile.fingerprint === env.pinned.fingerprint &&
          JSON.stringify(signerFile.publicKey) === JSON.stringify(env.pinned.publicKey));
    check('signer: a wrong IT passphrase is refused', await code(function () { return S.openSigner(signerFile, 'not the passphrase at all'); }, 'wrong-secret'));
    const signer = await S.openSigner(signerFile, PASS);
    check('signer: opens with the demo passphrase', signer.fingerprint === env.pinned.fingerprint);
    check('signer: a keyring file isn\'t a signer', await code(async function () { S.readSigner(await env.text('demo-data/packs/demo-it.flogic-keyring')); }, 'not-a-file'));

    // ---- the keyring (read-only) ----
    const ring = await S.keyringGroups(await env.text('demo-data/packs/demo-it.flogic-keyring'), PASS);
    const sd = ring.groups.find(function (g) { return g.group === 'service-desk'; });
    const ct = ring.groups.find(function (g) { return g.group === 'change-team'; });
    check('keyring: both demo groups open', !!sd && !!ct && ring.groups.length === 2);
    const fern = ring.people.find(function (p) { return p.id === 'u-0001'; });

    // ---- IT makes a filekey ----
    const kf = await S.issueKey(signer, fern, [sd], soon(7 * day));
    const kfText = JSON.stringify(kf);
    check('filekey: reads back', S.readKey(kfText).flogic === 'key');
    const claims = await S.check(S.readKey(kfText), env.pinned);
    check('filekey: names the person, their groups and an end date', claims.sub === 'u-0001' && claims.name === 'Fernando G' &&
          claims.groups.length === 1 && claims.groups[0].group === 'service-desk' && new Date(claims.expires) > new Date());
    check('filekey: no end date in the past', await code(function () { return S.issueKey(signer, fern, [sd], new Date(Date.now() - 1000)); }, 'damaged'));
    check('filekey: at least one group', await code(function () { return S.issueKey(signer, fern, [], soon(day)); }, 'damaged'));
    check('filekey: a request file from v0.1 isn\'t a key file', await code(function () { S.readKey(JSON.stringify({ flogic: 'signin-request' })); }, 'not-a-file'));

    // ---- editing a filekey breaks it ----
    check('tamper: a longer end date is refused', await code(function () { return S.check(edit(kf, function (c) { c.expires = soon(900 * day).toISOString(); }), env.pinned); }, 'bad-signature'));
    check('tamper: an added group is refused', await code(function () { return S.check(edit(kf, function (c) { c.groups.push({ group: 'change-team', label: 'Change Team', keyVersion: 1, rules: { export: true, autoLockMin: 10 } }); }), env.pinned); }, 'bad-signature'));
    check('tamper: export turned on is refused', await code(function () { return S.check(edit(kf, function (c) { c.groups[0].rules.autoLockMin = 9999; }), env.pinned); }, 'bad-signature'));
    const otherKeys = await S.issueKey(signer, fern, [ct], soon(day));
    check('tamper: another key file\'s keys swapped in are refused', await code(function () { return S.check(Object.assign({}, kf, { keys: otherKeys.keys }), env.pinned); }, 'damaged'));
    const otherSigner = await S.openSigner(await S.newSigner('some other IT passphrase', FAST), 'some other IT passphrase');
    const forged = await S.issueKey(otherSigner, fern, [sd, ct], soon(day));
    check('tamper: a key file made by someone else\'s IT key is refused', await code(function () { return S.check(forged, env.pinned); }, 'wrong-issuer'));
    check('tamper: a forged file with our IT key\'s name on it is refused', await code(function () { return S.check(edit(forged, function (c) { c.iss = env.pinned.fingerprint; }), env.pinned); }, 'bad-signature'));
    const short = await S.issueKey(signer, fern, [sd], soon(800));
    await new Promise(function (r) { setTimeout(r, 900); });
    check('expiry: an ended key file is refused', await code(function () { return S.check(short, env.pinned); }, 'expired'));

    // ---- the laptop copy,  locked with a PIN ----
    check('PIN: too short is refused', S.pinProblem('1234') !== null);
    check('PIN: letters are refused', S.pinProblem('abcdef') !== null);
    check('PIN: 111111 and 123456 are refused', S.pinProblem('111111') !== null && S.pinProblem('123456') !== null && S.pinProblem('654321') !== null);
    check('PIN: 482916 is fine', S.pinProblem(PIN) === null);
    check('claim: a weak PIN is refused', await code(function () { return S.claim(kf, '1234', env.pinned, FAST); }, 'weak'));
    check('claim: an edited key file can\'t be claimed', await code(function () { return S.claim(edit(kf, function (c) { c.name = 'Boss'; }), PIN, env.pinned, FAST); }, 'bad-signature'));
    const copy = await S.claim(kf, PIN, env.pinned, FAST);
    const copyText = JSON.stringify(copy);
    check('copy: holds no group key in the clear', !copyText.includes(kf.keys.entries[0].raw) && !('keys' in copy));
    check('copy: holds no PIN', !copyText.includes(PIN));

    let wrong;
    try { await S.unlock(copy, '000001', env.pinned); } catch (e) { wrong = e; }
    check('unlock: a wrong PIN is refused, and counts', wrong && wrong.code === 'wrong-pin' && wrong.copy.tries === 1, wrong && wrong.code);
    const opened = await S.unlock(wrong.copy, PIN, env.pinned);
    check('unlock: the right PIN opens it, and resets the count', opened.copy.tries === 0 && opened.keys.length === 1 && opened.claims.sub === 'u-0001');
    check('unlock: the keys come out unreadable', opened.keys.every(function (k) { return k.key.extractable === false; }));

    let worn = copy, last = null;
    for (let i = 0; i < S.MAX_TRIES; i++) {
        try { await S.unlock(worn, '999990', env.pinned); } catch (e) { last = e; worn = e.copy; }
    }
    check('unlock: 10 wrong PINs wipe the laptop copy', last && last.code === 'wiped' && last.wiped === true, last && last.code);

    const editedCopy = Object.assign({}, copy, { claims: JSON.stringify(Object.assign(JSON.parse(copy.claims), { expires: soon(900 * day).toISOString() })) });
    check('copy: an edited laptop copy is refused (end date pushed out)', await code(function () { return S.unlock(editedCopy, PIN, env.pinned); }, 'bad-signature'));
    const moved = Object.assign({}, copy, { claims: otherKeys.claims, sig: otherKeys.sig });
    check('copy: another file\'s claims pasted in don\'t open these keys', await code(function () { return S.unlock(moved, PIN, env.pinned); }, 'wrong-pin'));

    // ---- renewals ----
    const renewed = await S.issueKey(signer, fern, [sd], soon(14 * day));
    check('renew: a newer key file is spotted', await S.isNewer(renewed, copy, env.pinned) === true);
    check('renew: the same file again is not newer', await S.isNewer(kf, copy, env.pinned) === false);
    const djKey = await S.issueKey(signer, ring.people.find(function (p) { return p.id === 'u-0002'; }), [ct], soon(day));
    check('renew: someone else\'s key file isn\'t taken as mine', await code(function () { return S.isNewer(djKey, copy, env.pinned); }, 'damaged'));
    check('renew: a forged one isn\'t either', await code(function () { return S.isNewer(forged, copy, env.pinned); }, 'wrong-issuer'));

    // ---- the session,  and packs ----
    const incident = await env.bytes('demo-data/packs/demo_incident.flogic');
    const change = await env.bytes('demo-data/packs/demo_change_request.flogic');
    let ended = [];
    const s1 = S.startSession({ claims: opened.claims, keys: opened.keys, onEnd: function (r) { ended.push(r); } });
    check('session: the idle time is the group\'s auto-lock (15 min)', s1.idleMs === 15 * 60000, s1.idleMs);
    const p = await s1.openPack(incident);
    const text = new TextDecoder().decode(p.bytes);
    check('pack: Service Desk\'s pack opens (the real demo CSV)', p.header.fileName === 'demo_incident.csv' && /^﻿?"?number/i.test(text), JSON.stringify(p.header) + ' ' + text.slice(0, 40));
    check('pack: the other group\'s pack is refused', await code(function () { return s1.openPack(change); }, 'not-in-group'));
    check('pack: forcing Change Team\'s pack with Service Desk\'s key still fails', await code(function () { return V.openPack(change, opened.keys[0].key); }, 'locked-out'));
    s1.lock();
    check('session: Lock ends it, and the key is gone', ended[0] === 'lock' && s1.keyFor('service-desk') === null);
    check('session: after Lock, a pack won\'t open', await code(function () { return s1.openPack(incident); }, 'locked'));

    const both = await S.unlock(await S.claim(await S.issueKey(signer, fern, [sd, ct], soon(day)), PIN, env.pinned, FAST), PIN, env.pinned);
    const s2 = S.startSession({ claims: both.claims, keys: both.keys });
    check('session: with two groups, the SHORTER auto-lock wins (10 min)', s2.idleMs === 10 * 60000, s2.idleMs);
    check('session: both packs open in one session', !!(await s2.openPack(incident)) && !!(await s2.openPack(change)));
    s2.lock();

    ended = [];
    const s3 = S.startSession({ claims: opened.claims, keys: opened.keys, idleMs: 300, onEnd: function (r) { ended.push(r); } });
    await new Promise(function (r) { setTimeout(r, 200); }); s3.touch();
    await new Promise(function (r) { setTimeout(r, 200); });
    check('session: activity keeps it open', s3.alive() && ended.length === 0);
    await new Promise(function (r) { setTimeout(r, 400); });
    check('session: the idle timer ends it', ended[0] === 'idle' && !s3.alive());

    ended = [];
    const brief = await S.issueKey(signer, fern, [sd], soon(1500));
    const bo = await S.unlock(await S.claim(brief, PIN, env.pinned, FAST), PIN, env.pinned);
    const s4 = S.startSession({ claims: bo.claims, keys: bo.keys, onEnd: function (r) { ended.push(r); } });
    check('session: open before the end date', s4.alive());
    await new Promise(function (r) { setTimeout(r, 1800); });
    check('session: the end date ends it, even mid-session', ended[0] === 'expired' && s4.keyFor('service-desk') === null);
}
