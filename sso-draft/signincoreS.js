/*
    ==========================================================

        signincoreS.js   -   ONE SIGN-IN FOR ALL YOUR GROUPS   (draft S1:  crypto + file shapes only)

        The brief:  SCANME/SSO-PERMISSION-v0.1.0.md.     The return:  SCANME/returns/.

        Why this exists:  people don't care one bit about security.  We do.
        So the person does almost nothing:  pick a passphrase once,  send ONE file to IT,  open ONE file back.
        After that:  only the passphrase.   Who they are,  their groups,  their rules and the end date are IT's,
        and they're SIGNED,  so editing the file breaks it.

        Three things,  three files:

            .flogic-signer    IT's signing key   (ECDSA P-256).   The private half is locked with IT's passphrase.
            .flogic-request   "This laptop wants to sign in."     The laptop's PUBLIC key + a name.   Nothing secret.
            .flogic-signin    IT's answer:   the signed CLAIMS  (who,  groups,  rules,  which laptop,  the end date)
                              +  the group keys,  LOCKED TO THAT LAPTOP.   The claims carry no key,  only a hash of
                              the locked-keys part,  so neither half can be swapped.

        The laptop key  (ECDH P-256):  made in the browser,  its private half locked with the person's passphrase
        (PBKDF2,  600,000 rounds,  the same as VaultCore).   Only the LOCKED copy is ever kept.

        Uses VaultCore  (DIRECTORY/vaultcoreI.js)  for:  toB64,  fromB64,  makeCode,  passphraseProblem,
        unlockKeys  (to open IT's keyring),  readPackHeader,  openPack.     Changes nothing in it.

        Only crypto.subtle.   No libraries.   No network.   Runs in the browser AND in Node 22+  (the tests).

        It puts ONE name on the page:  SignInCore.

        Every "can't do that" is an Error with a  .code:
            'wrong-secret'    the passphrase doesn't open this
            'not-a-file'      not the kind of file we expected    (the message says which)
            'bad-version'     made by a newer version
            'bad-signature'   the sign-in file was changed after IT signed it,  or IT didn't sign it
            'wrong-issuer'    signed by a different IT key than the one this app trusts
            'wrong-laptop'    this sign-in file was made for a different laptop
            'expired'         the sign-in file's end date has passed
            'damaged'         the parts don't match each other

    ==========================================================
*/

const SignInCore = (function (VaultCore) {

    'use strict';

    const subtle = crypto.subtle;
    const ROUNDS = 600000;                       //  same as VaultCore:  ~0.3 s per guess,  the only brake on guessing
    const VERSION = 1;
    const SIGN_MAGIC = 'FLGSIGN1\n';             //  put in front of the claims before signing,  so a signature over
                                                 //  something else can never be passed off as a sign-in
    const EC = { name: 'ECDSA', namedCurve: 'P-256' };
    const DH = { name: 'ECDH',  namedCurve: 'P-256' };
    const SIG = { name: 'ECDSA', hash: 'SHA-256' };
    const MAX_FILE = 256 * 1024;                 //  these files are small.   A huge one isn't one of ours.

    const utf8 = new TextEncoder();
    const toB64 = VaultCore.toB64, fromB64 = VaultCore.fromB64;

    function fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }

    function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

    function parse(text, kind, label) {
        if (typeof text === 'string' && text.length > MAX_FILE) throw fail('not-a-file', 'That file is too big to be ' + label + '.');
        let o;
        try { o = typeof text === 'string' ? JSON.parse(text) : text; }
        catch (e) { throw fail('not-a-file', 'That isn\'t ' + label + '.'); }
        if (!o || o.flogic !== kind) throw fail('not-a-file', 'That isn\'t ' + label + '.');
        if (o.v > VERSION) throw fail('bad-version', 'That file is from a newer version of the app.');
        return o;
    }


    // ------------------------------------------------------
    //    FINGERPRINTS     "K7Q2-M9XA-..."    (the first 80 bits of SHA-256 of the public key,  in the code alphabet)
    //    Short enough to read out over the phone:  that's how IT checks a request really came from you.
    // ------------------------------------------------------

    async function fingerprint(publicKey) {
        const raw = new Uint8Array(await subtle.exportKey('raw', publicKey));
        const hash = new Uint8Array(await subtle.digest('SHA-256', raw));
        const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';     //  VaultCore's alphabet
        //  5 bits at a time,  16 symbols  =  80 bits   (32 symbols would be 5 bits exactly;  31 loses a little:  fine)
        let bits = 0, n = 0, out = '';
        for (const byte of hash) {
            n = (n << 8) | byte; bits += 8;
            while (bits >= 5 && out.length < 16) { bits -= 5; out += A[((n >> bits) & 31) % 31]; }
            if (out.length >= 16) break;
        }
        return out.replace(/(.{4})(?=.)/g, '$1-');
    }

    async function hashText(text) {
        return toB64(new Uint8Array(await subtle.digest('SHA-256', utf8.encode(text))));
    }


    // ------------------------------------------------------
    //    A PASSPHRASE  ->  A KEY THAT LOCKS ONE PRIVATE KEY
    //    (VaultCore has this inside,  but doesn't share it:   see REQUEST 1 in the return)
    // ------------------------------------------------------

    async function keyFromSecret(secret, salt, rounds) {
        const base = await subtle.importKey('raw', utf8.encode(secret), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: rounds },
                                base, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
    }

    async function lockPrivate(privateKey, secret, label, rounds) {
        const salt = randomBytes(16), iv = randomBytes(12), r = rounds || ROUNDS;
        const kek = await keyFromSecret(secret, salt, r);
        const wrapped = await subtle.wrapKey('pkcs8', privateKey, kek, { name: 'AES-GCM', iv: iv, additionalData: utf8.encode(label) });
        return { salt: toB64(salt), rounds: r, iv: toB64(iv), wrapped: toB64(wrapped) };
    }

    async function unlockPrivate(locked, secret, label, algorithm, usages) {
        const kek = await keyFromSecret(secret, fromB64(locked.salt), locked.rounds);
        try {
            return await subtle.unwrapKey('pkcs8', fromB64(locked.wrapped), kek,
                                          { name: 'AES-GCM', iv: fromB64(locked.iv), additionalData: utf8.encode(label) },
                                          algorithm, false, usages);           //  false:  it can never be read out
        } catch (e) {
            throw fail('wrong-secret', 'That passphrase doesn\'t match.');
        }
    }


    // ------------------------------------------------------
    //    IT'S SIGNING KEY     (.flogic-signer)
    //
    //    { flogic: 'signer', v: 1, fingerprint, publicKey: <JWK>, made,
    //      locked: { salt, rounds, iv, wrapped } }        the private key,  locked with IT's passphrase
    //
    //    pin(signer)  ->  { fingerprint, publicKey }:   what the APP carries   (sso-draft/it-signerS.js)
    // ------------------------------------------------------

    async function newSigner(passphrase, rounds) {
        const pair = await subtle.generateKey(EC, true, ['sign', 'verify']);
        const fp = await fingerprint(pair.publicKey);
        return {
            flogic: 'signer', v: VERSION, fingerprint: fp,
            publicKey: await subtle.exportKey('jwk', pair.publicKey),
            made: new Date().toISOString().slice(0, 10),
            locked: await lockPrivate(pair.privateKey, passphrase, 'flogic-signer|' + fp, rounds),
        };
    }

    function readSigner(text) {
        const s = parse(text, 'signer', 'a signing key file');
        if (typeof s.fingerprint !== 'string' || !s.publicKey || !s.locked) throw fail('not-a-file', 'This signing key file is damaged.');
        return s;
    }

    //  ->  { fingerprint, sign(bytes) }      (the private key stays inside,  unreadable)
    async function openSigner(signer, passphrase) {
        const key = await unlockPrivate(signer.locked, passphrase, 'flogic-signer|' + signer.fingerprint, EC, ['sign']);
        return { fingerprint: signer.fingerprint, sign: function (bytes) { return subtle.sign(SIG, key, bytes); } };
    }

    function pin(signer) {
        return { fingerprint: signer.fingerprint, publicKey: signer.publicKey };
    }

    //  The app's pinned key:  check its fingerprint matches its key  (so a half-edited pin is caught).
    async function trustedKey(pinned) {
        const key = await subtle.importKey('jwk', pinned.publicKey, EC, true, ['verify']);
        if (await fingerprint(key) !== pinned.fingerprint) throw fail('damaged', 'The app\'s copy of IT\'s key doesn\'t match itself.');
        return key;
    }


    // ------------------------------------------------------
    //    THE LAPTOP KEY,  AND THE REQUEST     (.flogic-request)
    //
    //    newLaptop(name, passphrase)  ->  { record,  request }
    //       record   what the browser keeps:    { id: <fingerprint>, name, publicKey: <JWK>, locked, made, signin: null }
    //       request  the file to send IT:       { flogic: 'signin-request', v: 1, name, fingerprint, publicKey, made }
    // ------------------------------------------------------

    async function newLaptop(name, passphrase, rounds) {
        const issue = VaultCore.passphraseProblem(passphrase);
        if (issue) throw fail('weak', issue);
        const pair = await subtle.generateKey(DH, true, ['deriveBits']);
        const fp = await fingerprint(pair.publicKey);
        const publicKey = await subtle.exportKey('jwk', pair.publicKey);
        const made = new Date().toISOString().slice(0, 10);
        const n = String(name).trim().slice(0, 80);
        return {
            record: { id: fp, name: n, publicKey: publicKey, made: made, signin: null,
                      locked: await lockPrivate(pair.privateKey, passphrase, 'flogic-laptop|' + fp, rounds) },
            request: { flogic: 'signin-request', v: VERSION, name: n, fingerprint: fp, publicKey: publicKey, made: made },
        };
    }

    async function readRequest(text) {
        const r = parse(text, 'signin-request', 'a sign-in request');
        if (typeof r.name !== 'string' || typeof r.fingerprint !== 'string' || !r.publicKey) throw fail('not-a-file', 'This sign-in request is damaged.');
        let key;
        try { key = await subtle.importKey('jwk', r.publicKey, DH, true, []); }
        catch (e) { throw fail('not-a-file', 'This sign-in request is damaged (its key isn\'t right).'); }
        if (await fingerprint(key) !== r.fingerprint) throw fail('damaged', 'This sign-in request\'s laptop code doesn\'t match its key.');
        return r;
    }

    //  The passphrase opens the laptop's private key   ->   a key that can only make shared secrets,  never be read
    function openLaptop(record, passphrase) {
        return unlockPrivate(record.locked, passphrase, 'flogic-laptop|' + record.id, DH, ['deriveBits']);
    }


    // ------------------------------------------------------
    //    LOCKING GROUP KEYS TO ONE LAPTOP
    //
    //    IT makes a throwaway ECDH key pair.   Its private half + the laptop's public key  ->  a shared secret
    //    (only that laptop can make it again).   HKDF turns it into a key that locks the group keys.
    //    Each locked key's  additionalData  is   personId|group|keyVersion|serial :   move it to another person,
    //    group or sign-in file and it won't open.
    // ------------------------------------------------------

    async function sharedKek(myPrivate, theirPublic, salt, serial) {
        const bits = await subtle.deriveBits({ name: 'ECDH', public: theirPublic }, myPrivate, 256);
        const base = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
        return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: utf8.encode('flogic-signin|' + serial) },
                                base, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
    }

    function keyAd(personId, group, keyVersion, serial) {
        return utf8.encode(personId + '|' + group + '|' + keyVersion + '|' + serial);
    }


    // ------------------------------------------------------
    //    THE SIGN-IN FILE     (.flogic-signin)
    //
    //    { flogic: 'signin', v: 1,
    //      claims:  "<a JSON string>",     what's signed:  UTF-8 of  "FLGSIGN1\n" + claims,  exactly as written
    //      sig:     "<b64>",               ECDSA P-256 / SHA-256,  64 bytes  (r || s)
    //      keys:    { epk: <JWK>, salt, entries: [{ group, keyVersion, iv, wrapped }] } }
    //
    //    claims  =  { iss:  IT key fingerprint,   sub:  person id,   name,
    //                 groups: [{ group, label, keyVersion, rules: { export, autoLockMin } }],
    //                 laptop: laptop fingerprint,   issued:  ISO time,   expires:  ISO time,
    //                 serial: random,   keys:  SHA-256 (b64) of  JSON.stringify(keys) }
    //
    //    issue(...)
    //       signer      openSigner(...)
    //       request     readRequest(...)
    //       person      { id, name }
    //       groups      [{ group, label, keyVersion, rules, key  (extractable:  from IT's keyring) }]
    //       expires     a Date
    // ------------------------------------------------------

    async function issue(signer, request, person, groups, expires) {
        if (!(expires instanceof Date) || isNaN(expires) || expires <= new Date()) throw fail('damaged', 'The end date has to be in the future.');
        if (!groups.length) throw fail('damaged', 'Pick at least one group.');
        const laptopKey = await subtle.importKey('jwk', request.publicKey, DH, true, []);
        const serial = toB64(randomBytes(9));
        const salt = randomBytes(16);
        const throwaway = await subtle.generateKey(DH, true, ['deriveBits']);
        const kek = await sharedKek(throwaway.privateKey, laptopKey, salt, serial);
        const entries = [];
        for (const g of groups) {
            const iv = randomBytes(12);
            const wrapped = await subtle.wrapKey('raw', g.key, kek,
                                                 { name: 'AES-GCM', iv: iv, additionalData: keyAd(person.id, g.group, g.keyVersion, serial) });
            entries.push({ group: g.group, keyVersion: g.keyVersion, iv: toB64(iv), wrapped: toB64(wrapped) });
        }
        const keys = { epk: await subtle.exportKey('jwk', throwaway.publicKey), salt: toB64(salt), entries: entries };
        const claims = JSON.stringify({
            iss: signer.fingerprint, sub: person.id, name: person.name,
            groups: groups.map(function (g) {
                return { group: g.group, label: g.label, keyVersion: g.keyVersion,
                         rules: { export: !!g.rules.export, autoLockMin: g.rules.autoLockMin } };
            }),
            laptop: request.fingerprint,
            issued: new Date().toISOString(), expires: expires.toISOString(),
            serial: serial, keys: await hashText(JSON.stringify(keys)),
        });
        const sig = await signer.sign(utf8.encode(SIGN_MAGIC + claims));
        return { flogic: 'signin', v: VERSION, claims: claims, sig: toB64(sig), keys: keys };
    }

    function readSignin(text) {
        const s = parse(text, 'signin', 'a sign-in file');
        if (typeof s.claims !== 'string' || typeof s.sig !== 'string' || !s.keys || !Array.isArray(s.keys.entries)) {
            throw fail('not-a-file', 'This sign-in file is damaged.');
        }
        return s;
    }

    //  The whole check.   Runs every time the person signs in  (not only when the file is first opened).
    //    pinned   the app's copy of IT's public key     laptopId   this laptop's fingerprint     now   a Date
    //  ->  the claims  (an object)
    async function check(signin, pinned, laptopId, now) {
        const key = await trustedKey(pinned);
        let sig;
        try { sig = fromB64(signin.sig); } catch (e) { throw fail('bad-signature', 'This sign-in file has been changed.'); }
        const ok = await subtle.verify(SIG, key, sig, utf8.encode(SIGN_MAGIC + signin.claims));
        if (!ok) {
            //  Which kind of "no"?   Only to say it better:  a signature that doesn't check is refused either way.
            let iss = null;
            try { iss = JSON.parse(signin.claims).iss; } catch (e) { /* nothing */ }
            if (iss && iss !== pinned.fingerprint) throw fail('wrong-issuer', 'This sign-in file wasn\'t made by this company\'s IT.');
            throw fail('bad-signature', 'This sign-in file has been changed since IT made it.');
        }
        const c = JSON.parse(signin.claims);
        if (c.iss !== pinned.fingerprint) throw fail('wrong-issuer', 'This sign-in file wasn\'t made by this company\'s IT.');
        if (await hashText(JSON.stringify(signin.keys)) !== c.keys) throw fail('damaged', 'This sign-in file\'s keys don\'t match it.');
        if (c.laptop !== laptopId) throw fail('wrong-laptop', 'This sign-in file was made for a different laptop.');
        const end = new Date(c.expires);
        if (isNaN(end) || end <= (now || new Date())) throw fail('expired', 'Your sign-in ended on ' + niceDate(end) + '. Ask IT for a new one.');
        const want = c.groups.map(function (g) { return g.group + '|' + g.keyVersion; }).sort().join(',');
        const have = signin.keys.entries.map(function (e) { return e.group + '|' + e.keyVersion; }).sort().join(',');
        if (want !== have) throw fail('damaged', 'This sign-in file\'s groups and keys don\'t match.');
        return c;
    }

    //  After check():   the laptop's private key unlocks every group key at once   ->   [{ group, keyVersion, key }]
    //  The keys come out NOT readable  (extractable: false).
    async function openKeys(signin, claims, laptopPrivate) {
        const epk = await subtle.importKey('jwk', signin.keys.epk, DH, true, []);
        const kek = await sharedKek(laptopPrivate, epk, fromB64(signin.keys.salt), claims.serial);
        const out = [];
        for (const e of signin.keys.entries) {
            try {
                out.push({ group: e.group, keyVersion: e.keyVersion,
                           key: await subtle.unwrapKey('raw', fromB64(e.wrapped), kek,
                                                       { name: 'AES-GCM', iv: fromB64(e.iv), additionalData: keyAd(claims.sub, e.group, e.keyVersion, claims.serial) },
                                                       { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) });
            } catch (err) {
                throw fail('wrong-laptop', 'This laptop can\'t open the keys in this sign-in file.');
            }
        }
        return out;
    }

    function niceDate(d) {
        return isNaN(d) ? 'an unknown date' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }


    // ------------------------------------------------------
    //    IT'S KEYRING  ->  the group keys IT can hand out     (VaultCore.unlockKeys,  as the IT console does it)
    // ------------------------------------------------------

    async function keyringGroups(keyringText, passphrase) {
        const k = typeof keyringText === 'string' ? JSON.parse(keyringText) : keyringText;
        if (!k || k.flogic !== 'keyring') throw fail('not-a-file', 'That isn\'t a keyring file.');
        const opened = await VaultCore.unlockKeys('it-keyring', k.locked, passphrase, true);
        return {
            people: k.people,
            groups: k.groups.map(function (g) {
                const found = opened.find(function (o) { return o.group === g.group && o.keyVersion === g.keyVersion; });
                return { group: g.group, label: g.label, keyVersion: g.keyVersion, rules: g.rules, key: found && found.key };
            }).filter(function (g) { return g.key; }),
        };
    }


    // ------------------------------------------------------
    //    THE SESSION     (memory only.   Ends by:  Lock,  the idle timer,  or the sign-in's end date.)
    //
    //    startSession({ claims, keys, idleMs, onEnd(reason) })
    //      idleMs:  the SHORTEST autoLockMin of the person's groups,  unless given
    //    ->  { who, groups, endsAt(), touch(), lock(), keyFor(group), openPack(bytes), alive() }
    //    reason:  'lock' | 'idle' | 'expired'
    // ------------------------------------------------------

    function startSession(o) {
        const claims = o.claims;
        let keys = o.keys;
        const expires = new Date(claims.expires).getTime();
        const mins = claims.groups.map(function (g) { return Number(g.rules.autoLockMin); }).filter(function (n) { return n > 0; });
        const idleMs = o.idleMs || (mins.length ? Math.min.apply(null, mins) : 15) * 60000;
        let idleTimer = null, endTimer = null, last = Date.now(), over = null;

        function end(reason) {
            if (over) return;
            over = reason;
            clearTimeout(idleTimer); clearTimeout(endTimer);
            keys = null;                                       //  the keys leave.   (When memory is freed is the browser's call.)
            if (o.onEnd) o.onEnd(reason);
        }
        function touch() {
            if (over) return;
            if (Date.now() >= expires) { end('expired'); return; }
            last = Date.now();
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () { end('idle'); }, idleMs);
        }
        //  setTimeout can't wait more than ~24.8 days:  wake up at most daily and look again.
        function armEnd() {
            const left = expires - Date.now();
            if (left <= 0) { end('expired'); return; }
            endTimer = setTimeout(armEnd, Math.min(left, 86400000));
        }
        touch(); armEnd();

        return {
            who: { id: claims.sub, name: claims.name },
            groups: claims.groups,
            idleMs: idleMs,
            endsAt: function () { return over ? null : new Date(Math.min(expires, last + idleMs)); },
            touch: touch,
            lock: function () { end('lock'); },
            alive: function () { return !over && Date.now() < expires; },
            ended: function () { return over; },
            keyFor: function (group) {
                if (!this.alive()) return null;
                const k = keys.find(function (x) { return x.group === group; });
                return k ? k.key : null;
            },
            //  ->  { header, bytes }    or throws   'not-in-group'  (the label says another group)  /  VaultCore's codes
            openPack: async function (bytes) {
                if (!this.alive()) { end(over || 'expired'); throw fail('locked', 'You\'re signed out.'); }
                touch();
                const p = VaultCore.readPackHeader(bytes);
                const k = keys.find(function (x) { return x.group === p.header.group && x.keyVersion === p.header.keyVersion; });
                if (!k) {
                    const g = claims.groups.find(function (x) { return x.group === p.header.group; });
                    throw fail('not-in-group', 'This pack is for ' + (g ? g.label : p.header.group) + '. You\'re not in that group.');
                }
                return { header: p.header, bytes: await VaultCore.openPack(bytes, k.key) };
            },
        };
    }


    return Object.freeze({
        ROUNDS: ROUNDS, VERSION: VERSION,
        fingerprint: fingerprint,
        newSigner: newSigner, readSigner: readSigner, openSigner: openSigner, pin: pin,
        newLaptop: newLaptop, readRequest: readRequest, openLaptop: openLaptop,
        issue: issue, readSignin: readSignin, check: check, openKeys: openKeys,
        keyringGroups: keyringGroups, startSession: startSession, niceDate: niceDate,
    });

})(VaultCore);
