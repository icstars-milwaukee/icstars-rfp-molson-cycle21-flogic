/*
    ==========================================================

        signincoreI.js   -   FILEKEY SIGN-IN   (v0.4.0)

        One file per person,  made and signed by IT,  kept in the person's OneDrive / Google Drive:

            .flogic-signer    IT's signing key   (ECDSA P-256).   The private half is locked with IT's passphrase.
            .flogic-key       the person's FILEKEY:   signed CLAIMS  (who,  access level,  groups,  rules,  the end date)
                              +  the group keys.   The claims carry a hash of the keys,  so neither half can be swapped
                              or edited.    THE FILE IS THE LOGIN:   the drive's own sign-in  (company MFA)  guards it.

        On each laptop,  the first time:   the person picks a PIN  (4+ digits).   Flogic keeps a LAPTOP COPY of the
        filekey with the group keys locked by that PIN  (PBKDF2,  600,000 rounds).   After that:   PIN only.
        10 wrong PINs and the laptop copy is wiped  (open the filekey from the drive again).

        Data is only ever opened ON THE LAPTOP,  with the group keys.   Nothing goes to Microsoft or Google but the filekey.

        Uses VaultCore  (vaultcoreI.js)  for:  toB64,  fromB64,  unlockKeys  (IT's keyring),  readPackHeader,  openPack.
        Uses FlogicPolicy  (policyI.js)  for the built-in rules:  how long a key file may last,  the 30-day review,
        and what each access level allows.   A key file that breaks them is refused,  even with IT's signature.

        Only crypto.subtle.   No libraries.   No network.   Runs in the browser AND in Node 22+  (the tests).

        It puts ONE name on the page:  SignInCore.

        Every "can't do that" is an Error with a  .code:
            'wrong-pin'       the PIN doesn't open this laptop copy         'weak'          not a usable PIN / passphrase
            'wrong-secret'    IT's passphrase doesn't open the signing key
            'not-a-file'      not the kind of file we expected               'bad-version'   made by a newer version
            'bad-signature'   changed after IT signed it,  or IT didn't sign it
            'wrong-issuer'    signed by a different IT key than the one this app trusts
            'expired'         the filekey's end date has passed              'damaged'       the parts don't match
            'wiped'           too many wrong PINs:  the laptop copy is gone
            'policy'          IT signed it,  but it breaks a built-in rule  (too long,  no review,  more than its level allows)

    ==========================================================
*/

const SignInCore = (function (VaultCore, FlogicPolicy) {

    'use strict';

    const subtle = crypto.subtle;
    const ROUNDS = 600000;                       //  ~0.3 s per guess:  the only brake on guessing a PIN offline
    const VERSION = 4;                           //  4:  the claims carry an access level and a review day
    const KEY_MAGIC = 'FLGKEY4\n';               //  put in front of the claims before signing
    const MAX_TRIES = 10;                        //  wrong PINs before the laptop copy is wiped
    const EC = { name: 'ECDSA', namedCurve: 'P-256' };
    const SIG = { name: 'ECDSA', hash: 'SHA-256' };
    const MAX_FILE = 256 * 1024;

    const utf8 = new TextEncoder(), text8 = new TextDecoder();
    const toB64 = VaultCore.toB64, fromB64 = VaultCore.fromB64;

    function fail(code, message) { const e = new Error(message); e.code = code; return e; }
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

    //  "K7Q2-M9XA-..."   the first 80 bits of SHA-256 of a public key,  in VaultCore's code alphabet
    async function fingerprint(publicKey) {
        const raw = new Uint8Array(await subtle.exportKey('raw', publicKey));
        const hash = new Uint8Array(await subtle.digest('SHA-256', raw));
        const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
        let bits = 0, n = 0, out = '';
        for (const byte of hash) {
            n = (n << 8) | byte; bits += 8;
            while (bits >= 5 && out.length < 16) { bits -= 5; out += A[((n >> bits) & 31) % 31]; }
            if (out.length >= 16) break;
        }
        return out.replace(/(.{4})(?=.)/g, '$1-');
    }
    async function hashText(t) { return toB64(new Uint8Array(await subtle.digest('SHA-256', utf8.encode(t)))); }

    async function stretch(secret, salt, rounds, usages) {
        const base = await subtle.importKey('raw', utf8.encode(secret), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: rounds },
                                base, { name: 'AES-GCM', length: 256 }, false, usages);
    }


    // ------------------------------------------------------
    //    IT'S SIGNING KEY     (.flogic-signer)       unchanged from v0.1.0:  the demo signer still opens
    // ------------------------------------------------------

    async function newSigner(passphrase, rounds) {
        const issue = VaultCore.passphraseProblem(passphrase);
        if (issue) throw fail('weak', issue);
        const pair = await subtle.generateKey(EC, true, ['sign', 'verify']);
        const fp = await fingerprint(pair.publicKey);
        const salt = randomBytes(16), iv = randomBytes(12), r = rounds || ROUNDS;
        const kek = await stretch(passphrase, salt, r, ['wrapKey', 'unwrapKey']);
        const wrapped = await subtle.wrapKey('pkcs8', pair.privateKey, kek, { name: 'AES-GCM', iv: iv, additionalData: utf8.encode('flogic-signer|' + fp) });
        return { flogic: 'signer', v: 1, fingerprint: fp, publicKey: await subtle.exportKey('jwk', pair.publicKey),
                 made: new Date().toISOString().slice(0, 10),
                 locked: { salt: toB64(salt), rounds: r, iv: toB64(iv), wrapped: toB64(wrapped) } };
    }
    function readSigner(t) {
        const s = parse(t, 'signer', 'a signing key file');
        if (typeof s.fingerprint !== 'string' || !s.publicKey || !s.locked) throw fail('not-a-file', 'This signing key file is damaged.');
        return s;
    }
    //  ->  { fingerprint, sign(bytes) }      (the private key stays inside,  unreadable)
    async function openSigner(signer, passphrase) {
        const l = signer.locked;
        const kek = await stretch(passphrase, fromB64(l.salt), l.rounds, ['wrapKey', 'unwrapKey']);
        let key;
        try {
            key = await subtle.unwrapKey('pkcs8', fromB64(l.wrapped), kek, { name: 'AES-GCM', iv: fromB64(l.iv), additionalData: utf8.encode('flogic-signer|' + signer.fingerprint) },
                                         EC, false, ['sign']);
        } catch (e) { throw fail('wrong-secret', 'That passphrase doesn\'t match.'); }
        return { fingerprint: signer.fingerprint, sign: function (bytes) { return subtle.sign(SIG, key, bytes); } };
    }
    function pin(signer) { return { fingerprint: signer.fingerprint, publicKey: signer.publicKey }; }
    async function trustedKey(pinned) {
        const key = await subtle.importKey('jwk', pinned.publicKey, EC, true, ['verify']);
        if (await fingerprint(key) !== pinned.fingerprint) throw fail('damaged', 'The app\'s copy of IT\'s key doesn\'t match itself.');
        return key;
    }


    // ------------------------------------------------------
    //    THE FILEKEY     (.flogic-key)
    //
    //    { flogic: 'key', v: 4,
    //      claims:  "<a JSON string>",    signed:  UTF-8 of  "FLGKEY4\n" + claims,  exactly as written
    //      sig:     "<b64>",
    //      keys:    { entries: [{ group, keyVersion, raw: <b64> }] } }
    //
    //    claims  =  { iss, sub, name, level, reviewed,
    //                 groups: [{ group, label, keyVersion, rules: { export, autoLockMin } }],     rules:  the group's,  through the level
    //                 issued, expires, serial,  keys:  SHA-256 (b64) of  JSON.stringify(keys) }
    //
    //    issueKey(signer, person { id, name, level, reviewed, expires (their last day) },
    //             groups [{ group, label, keyVersion, rules, key (extractable) }],
    //             expires)        a Date,  or nothing:  then it lasts as long as the level allows  (FlogicPolicy.grantEnd)
    // ------------------------------------------------------

    async function issueKey(signer, person, groups, expires) {
        if (!groups.length) throw fail('damaged', 'Pick at least one group.');
        if (expires === undefined || expires === null) {
            try { expires = FlogicPolicy.grantEnd(person.level, { accessEnds: person.expires, reviewed: person.reviewed }); }
            catch (e) { throw fail('policy', e.message); }
        }
        if (!(expires instanceof Date) || isNaN(expires) || expires <= new Date()) throw fail('damaged', 'The end date has to be in the future.');
        const entries = [];
        for (const g of groups) entries.push({ group: g.group, keyVersion: g.keyVersion, raw: toB64(new Uint8Array(await subtle.exportKey('raw', g.key))) });
        const keys = { entries: entries };
        const claims = JSON.stringify({
            iss: signer.fingerprint, sub: person.id, name: person.name,
            level: person.level, reviewed: person.reviewed,
            groups: groups.map(function (g) {
                return { group: g.group, label: g.label, keyVersion: g.keyVersion, rules: FlogicPolicy.effectiveRules(person.level, g.rules) };
            }),
            issued: new Date().toISOString(), expires: expires.toISOString(),
            serial: toB64(randomBytes(9)), keys: await hashText(JSON.stringify(keys)),
        });
        //  IT's own page refuses to make what the app would refuse to take.
        const broken = FlogicPolicy.claimsProblem(JSON.parse(claims));
        if (broken) throw fail('policy', broken);
        const sig = await signer.sign(utf8.encode(KEY_MAGIC + claims));
        return { flogic: 'key', v: VERSION, claims: claims, sig: toB64(sig), keys: keys };
    }

    function readKey(t) {
        const k = parse(t, 'key', 'a Flogic key file');
        if (k.v < VERSION) throw fail('bad-version', 'This key file is from an older version of the app. Ask IT for a new one.');
        if (typeof k.claims !== 'string' || typeof k.sig !== 'string' || !k.keys || !Array.isArray(k.keys.entries)) throw fail('not-a-file', 'This key file is damaged.');
        return k;
    }

    //  Said when the key file was signed by another key than the one this app trusts.   (The usual cause:  IT replaced
    //  its signing key,  so every older key file stopped working.   The person can't fix that:  IT makes a new one.)
    const WRONG_ISSUER = 'This key file wasn\'t made by the IT signing key this app trusts. Ask IT for a new key file.';

    //  Signature,  issuer,  the built-in rules,  and that the claims match these keys.   ->  the claims      (no end-date check:  see check)
    async function verify(claimsText, sig, keys, pinned) {
        const key = await trustedKey(pinned);
        let ok = false;
        try { ok = await subtle.verify(SIG, key, fromB64(sig), utf8.encode(KEY_MAGIC + claimsText)); } catch (e) { ok = false; }
        let c = null;
        try { c = JSON.parse(claimsText); } catch (e) { /* fall through */ }
        if (!ok) {
            if (c && c.iss && c.iss !== pinned.fingerprint) throw fail('wrong-issuer', WRONG_ISSUER);
            throw fail('bad-signature', 'This key file has been changed since IT made it.');
        }
        if (c.iss !== pinned.fingerprint) throw fail('wrong-issuer', WRONG_ISSUER);
        const broken = FlogicPolicy.claimsProblem(c);                     //  signed by IT,  and still not allowed
        if (broken) throw fail('policy', broken);
        if (keys && await hashText(JSON.stringify(keys)) !== c.keys) throw fail('damaged', 'This key file\'s keys don\'t match it.');
        const want = c.groups.map(function (g) { return g.group + '|' + g.keyVersion; }).sort().join(',');
        if (keys) {
            const have = keys.entries.map(function (e) { return e.group + '|' + e.keyVersion; }).sort().join(',');
            if (want !== have) throw fail('damaged', 'This key file\'s groups and keys don\'t match.');
        }
        return c;
    }
    function notEnded(c, now) {
        const end = new Date(c.expires);
        if (isNaN(end) || end <= (now || new Date())) throw fail('expired', 'Your access ended on ' + niceDate(end) + '. IT renews it in your drive.');
    }

    //  The whole check of a filekey from the drive.   ->  the claims
    async function check(keyFile, pinned, now) {
        const c = await verify(keyFile.claims, keyFile.sig, keyFile.keys, pinned);
        notEnded(c, now);
        return c;
    }


    // ------------------------------------------------------
    //    THE LAPTOP COPY     (what this browser keeps,  one per person)
    //
    //    { id: sub, name, claims, sig, made,
    //      locked: { salt, rounds, iv, data },        the keys JSON,  AES-GCM under PBKDF2(PIN);  AD = "flogic-key|sub|serial"
    //      tries: 0 }                                  wrong PINs in a row
    // ------------------------------------------------------

    function pinProblem(p) {
        if (typeof p !== 'string' || !/^[0-9]{4,12}$/.test(p)) return 'Use 4 to 12 digits.';
        if (/^(\d)\1+$/.test(p) || '0123456789012'.includes(p) || '9876543210987'.includes(p)) return 'Pick digits that aren\'t all the same or in a row.';
        return null;
    }

    //  The first time on a laptop  (and after each renewal):   lock the keys with the PIN.
    async function claim(keyFile, pinText, pinned, rounds) {
        const issue = pinProblem(pinText);
        if (issue) throw fail('weak', issue);
        const c = await check(keyFile, pinned);
        const salt = randomBytes(16), iv = randomBytes(12), r = rounds || ROUNDS;
        const k = await stretch(pinText, salt, r, ['encrypt', 'decrypt']);
        const data = await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8.encode('flogic-key|' + c.sub + '|' + c.serial) },
                                          k, utf8.encode(JSON.stringify(keyFile.keys)));
        return { id: c.sub, name: c.name, claims: keyFile.claims, sig: keyFile.sig, made: new Date().toISOString(), tries: 0,
                 locked: { salt: toB64(salt), rounds: r, iv: toB64(iv), data: toB64(new Uint8Array(data)) } };
    }

    //  Every day:   the PIN opens the laptop copy.   ->  { claims, keys: [{ group, keyVersion, key (NOT readable) }], copy }
    //  copy  is the laptop copy with  tries  updated:  SAVE IT  (or delete it,  if  .wiped).
    //  Checks IT's signature every time.   Expiry is checked by the caller  (it may first look for a renewal).
    async function unlock(copy, pinText, pinned) {
        const l = copy.locked;
        const c = await verify(copy.claims, copy.sig, null, pinned);
        const k = await stretch(String(pinText), fromB64(l.salt), l.rounds, ['encrypt', 'decrypt']);
        let keys;
        try {
            keys = JSON.parse(text8.decode(await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(l.iv), additionalData: utf8.encode('flogic-key|' + c.sub + '|' + c.serial) },
                                                                k, fromB64(l.data))));
        } catch (e) {
            const tries = (copy.tries || 0) + 1;
            const left = MAX_TRIES - tries;
            const err = left <= 0 ? fail('wiped', 'Too many wrong PINs. This laptop forgot you: open your key file from your drive again.')
                                  : fail('wrong-pin', 'That PIN doesn\'t match. ' + left + ' more ' + (left === 1 ? 'try' : 'tries') + ' before this laptop forgets you.');
            err.copy = Object.assign({}, copy, { tries: tries }); err.wiped = left <= 0;
            throw err;
        }
        await verify(copy.claims, copy.sig, keys, pinned);                //  the keys are the ones IT signed
        const out = [];
        for (const e of keys.entries) {
            out.push({ group: e.group, keyVersion: e.keyVersion,
                       key: await subtle.importKey('raw', fromB64(e.raw), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) });
        }
        return { claims: c, keys: out, copy: Object.assign({}, copy, { tries: 0 }) };
    }

    //  Is this drive filekey a renewal of what the laptop has?   ->  true / false   (throws if it's not a good filekey)
    async function isNewer(keyFile, copy, pinned) {
        const fresh = await verify(keyFile.claims, keyFile.sig, keyFile.keys, pinned);
        const have = JSON.parse(copy.claims);
        if (fresh.sub !== have.sub) throw fail('damaged', 'That key file is for ' + fresh.name + ', not ' + have.name + '.');
        return new Date(fresh.issued) > new Date(have.issued);
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
            signer: k.signer || null,
        };
    }


    // ------------------------------------------------------
    //    THE SESSION     (memory only.   Ends by:  Lock,  the idle timer,  or the filekey's end date.)
    //    startSession({ claims, keys, idleMs, onEnd(reason) })    reason:  'lock' | 'idle' | 'expired'
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
            keys = null;
            if (o.onEnd) o.onEnd(reason);
        }
        function touch() {
            if (over) return;
            if (Date.now() >= expires) { end('expired'); return; }
            last = Date.now();
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () { end('idle'); }, idleMs);
        }
        function armEnd() {                                    //  setTimeout can't wait more than ~24.8 days
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
        ROUNDS: ROUNDS, VERSION: VERSION, MAX_TRIES: MAX_TRIES,
        fingerprint: fingerprint,
        newSigner: newSigner, readSigner: readSigner, openSigner: openSigner, pin: pin,
        issueKey: issueKey, readKey: readKey, check: check,
        pinProblem: pinProblem, claim: claim, unlock: unlock, isNewer: isNewer, notEnded: notEnded,
        keyringGroups: keyringGroups, startSession: startSession, niceDate: niceDate,
    });

})(VaultCore, FlogicPolicy);
