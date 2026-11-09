/*
    core-testsS.js   -   the SAME checks,  run in Node  (run-node-test.mjs)  and in the browser  (signin-test.html).

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
    const FAST = 1000;                               //  PBKDF2 rounds for THROWAWAY laptops in tests only (speed)

    async function code(fn, want) {
        try { await fn(); return 'no error'; }
        catch (e) { return e.code === want ? true : 'code ' + e.code + ': ' + e.message; }
    }
    function edit(signin, fn) {                      //  a copy of a sign-in file with its claims changed  (signature kept)
        const c = JSON.parse(signin.claims); fn(c);
        return Object.assign({}, signin, { claims: JSON.stringify(c) });
    }
    const soon = function (ms) { return new Date(Date.now() + ms); };

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
    check('keyring: both demo groups open, and the ~check key is left out', !!sd && !!ct && ring.groups.length === 2);

    // ---- a laptop and its request ----
    const lap = await S.newLaptop('Fernando G', 'correct horse battery staple', FAST);
    check('laptop: a weak passphrase is refused', await code(function () { return S.newLaptop('x', 'short', FAST); }, 'weak'));
    check('laptop: what the browser keeps has no private key in the clear',
          !JSON.stringify(lap.record).includes('"d":') && !!lap.record.locked.wrapped);
    const req = await S.readRequest(JSON.stringify(lap.request));
    check('request: reads back, with a 16-symbol laptop code', /^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/.test(req.fingerprint), req.fingerprint);
    check('request: has no secret in it', Object.keys(lap.request).sort().join(',') === 'fingerprint,flogic,made,name,publicKey,v' &&
          !JSON.stringify(lap.request).includes('"d":'));
    const other = await S.newLaptop('Someone', 'another laptop entirely here', FAST);
    const swapped = Object.assign({}, lap.request, { publicKey: other.request.publicKey });
    check('request: a swapped key with the old laptop code is caught', await code(function () { return S.readRequest(JSON.stringify(swapped)); }, 'damaged'));
    check('laptop: the wrong passphrase doesn\'t open it', await code(function () { return S.openLaptop(lap.record, 'correct horse battery stapler'); }, 'wrong-secret'));
    const priv = await S.openLaptop(lap.record, 'correct horse battery staple');
    check('laptop: the private key comes out unreadable', priv.extractable === false);

    // ---- issuing ----
    const fernando = ring.people.find(function (p) { return p.id === 'u-0001'; });
    const signin = await S.issue(signer, req, fernando, [sd], soon(7 * 86400000));
    const file = S.readSignin(JSON.stringify(signin, null, 2));
    check('issue: the claims carry no key, only a hash of the locked keys',
          !/wrapped|"iv"|epk/.test(file.claims) && typeof JSON.parse(file.claims).keys === 'string');
    check('issue: a past end date is refused', await code(function () { return S.issue(signer, req, fernando, [sd], soon(-1000)); }, 'damaged'));

    // ---- checking ----
    const claims = await S.check(file, env.pinned, lap.record.id);
    check('check: a good sign-in file checks out', claims.sub === 'u-0001' && claims.groups.length === 1 && claims.groups[0].group === 'service-desk');
    check('tamper: a changed name fails', await code(function () { return S.check(edit(file, function (c) { c.name = 'DJ'; }), env.pinned, lap.record.id); }, 'bad-signature'));
    check('tamper: an added group fails', await code(function () {
        return S.check(edit(file, function (c) { c.groups.push({ group: 'change-team', label: 'Change Team', keyVersion: 1, rules: { export: false, autoLockMin: 10 } }); }), env.pinned, lap.record.id);
    }, 'bad-signature'));
    check('tamper: a swapped group fails', await code(function () { return S.check(edit(file, function (c) { c.groups[0].group = 'change-team'; }), env.pinned, lap.record.id); }, 'bad-signature'));
    check('tamper: a longer auto-lock fails', await code(function () { return S.check(edit(file, function (c) { c.groups[0].rules.autoLockMin = 999; }), env.pinned, lap.record.id); }, 'bad-signature'));
    check('tamper: a later end date fails', await code(function () { return S.check(edit(file, function (c) { c.expires = '2099-12-31T00:00:00.000Z'; }), env.pinned, lap.record.id); }, 'bad-signature'));
    check('tamper: a changed laptop fails', await code(function () { return S.check(edit(file, function (c) { c.laptop = other.record.id; }), env.pinned, other.record.id); }, 'bad-signature'));
    const flipped = Object.assign({}, file, { sig: V.toB64(V.fromB64(file.sig).map(function (b, i) { return i === 5 ? b ^ 1 : b; })) });
    check('tamper: one changed bit in the signature fails', await code(function () { return S.check(flipped, env.pinned, lap.record.id); }, 'bad-signature'));
    const moreKeys = JSON.parse(JSON.stringify(file)); moreKeys.keys.entries[0].iv = V.toB64(new Uint8Array(12));
    check('tamper: a changed locked-keys part fails', await code(function () { return S.check(moreKeys, env.pinned, lap.record.id); }, 'damaged'));

    // ---- wrong IT ----
    const rogueFile = await S.newSigner('a different it department', FAST);
    const rogue = await S.openSigner(rogueFile, 'a different it department');
    const forged = await S.issue(rogue, req, fernando, [sd, ct], soon(86400000));
    check('issuer: a file signed by another key is refused', await code(function () { return S.check(forged, env.pinned, lap.record.id); }, 'wrong-issuer'));
    const forgedSameIss = edit(forged, function (c) { c.iss = env.pinned.fingerprint; });
    check('issuer: ...even when it claims to be our IT', await code(function () { return S.check(forgedSameIss, env.pinned, lap.record.id); }, 'bad-signature'));
    const badPin = Object.assign({}, env.pinned, { publicKey: rogueFile.publicKey });
    check('issuer: a pinned key that doesn\'t match its fingerprint is caught', await code(function () { return S.check(file, badPin, lap.record.id); }, 'damaged'));
    check('issuer: a WHOLE swapped pin (key + fingerprint) is believed  (the honest limit)',
          (await S.check(forged, S.pin(rogueFile), lap.record.id)).groups.length === 2);

    // ---- other laptop, expiry ----
    check('copied: on another laptop, the sign-in file is refused', await code(function () { return S.check(file, env.pinned, other.record.id); }, 'wrong-laptop'));
    const otherPriv = await S.openLaptop(other.record, 'another laptop entirely here');
    check('copied: ...and that laptop can\'t open the keys anyway', await code(function () { return S.openKeys(file, claims, otherPriv); }, 'wrong-laptop'));
    check('expiry: refused after the end date', await code(function () { return S.check(file, env.pinned, lap.record.id, soon(8 * 86400000)); }, 'expired'));

    // ---- the keys, and the real demo packs ----
    const keys = await S.openKeys(file, claims, priv);
    check('keys: one key per group, unreadable', keys.length === 1 && keys[0].key.extractable === false);
    const both = await S.issue(signer, req, { id: 'u-0009', name: 'Both Groups' }, [sd, ct], soon(86400000));
    const bothClaims = await S.check(both, env.pinned, lap.record.id);
    const bothKeys = await S.openKeys(both, bothClaims, priv);
    check('keys: ONE sign-in opens every group\'s key', bothKeys.length === 2);
    const movedKeys = JSON.parse(JSON.stringify(both)); movedKeys.keys = file.keys;
    check('keys: a locked-keys part from another sign-in file is refused', await code(function () { return S.check(movedKeys, env.pinned, lap.record.id); }, 'damaged'));

    const incident = await env.bytes('demo-data/packs/demo_incident.flogic');
    const change = await env.bytes('demo-data/packs/demo_change_request.flogic');
    let ended = [];
    const s1 = S.startSession({ claims: claims, keys: keys, onEnd: function (r) { ended.push(r); } });
    check('session: idle time is the group\'s autoLockMin (15 min for Service Desk)', s1.idleMs === 15 * 60000, s1.idleMs);
    const opened = await s1.openPack(incident);
    const text = new TextDecoder().decode(opened.bytes);
    check('pack: Service Desk\'s pack opens (the real demo CSV)', opened.header.fileName === 'demo_incident.csv' && /^﻿?"?number/i.test(text),
          JSON.stringify(opened.header) + ' ' + text.slice(0, 40));
    check('pack: the other group\'s pack is refused before trying a key', await code(function () { return s1.openPack(change); }, 'not-in-group'));
    
    check('pack: forcing Change Team\'s pack with Service Desk\'s key still fails', await code(function () { return V.openPack(change, keys[0].key); }, 'locked-out'));
    s1.lock();
    check('session: Lock ends it, and the key is gone', ended[0] === 'lock' && s1.keyFor('service-desk') === null);
    check('session: after Lock, a pack won\'t open', await code(function () { return s1.openPack(incident); }, 'locked'));

    const s2 = S.startSession({ claims: bothClaims, keys: bothKeys });
    check('session: with two groups, the SHORTER auto-lock wins (10 min)', s2.idleMs === 10 * 60000, s2.idleMs);
    check('session: both packs open in one session', !!(await s2.openPack(incident)) && !!(await s2.openPack(change)));
    s2.lock();

    ended = [];
    const s3 = S.startSession({ claims: claims, keys: keys, idleMs: 300, onEnd: function (r) { ended.push(r); } });
    await new Promise(function (r) { setTimeout(r, 200); }); s3.touch();
    await new Promise(function (r) { setTimeout(r, 200); });
    check('session: activity keeps it open', s3.alive() && ended.length === 0);
    await new Promise(function (r) { setTimeout(r, 400); });
    check('session: the idle timer ends it', ended[0] === 'idle' && !s3.alive());

    ended = [];
    const short = await S.issue(signer, req, fernando, [sd], soon(1500));
    const shortClaims = await S.check(short, env.pinned, lap.record.id);
    const s4 = S.startSession({ claims: shortClaims, keys: await S.openKeys(short, shortClaims, priv), onEnd: function (r) { ended.push(r); } });
    check('session: open before the end date', s4.alive());
    await new Promise(function (r) { setTimeout(r, 1800); });
    check('session: the end date ends it, even mid-session', ended[0] === 'expired' && s4.keyFor('service-desk') === null);
}
