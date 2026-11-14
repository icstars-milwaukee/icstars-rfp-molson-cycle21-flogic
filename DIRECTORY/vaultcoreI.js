/*
    ==========================================================

        vaultcoreI.js   -   THE LOCKS AND KEYS   (crypto + file shapes only)


        This file has NO page and NO saving in it.  It only knows how to:
            -  make codes            (recovery codes,  setup codes:   7KQ4M-X9WTC-...)
            -  turn a passphrase or a code into a key      (PBKDF2,  600,000 rounds)
            -  lock a key with another key,  and unlock it (wrapKey / unwrapKey,  AES-GCM)
            -  make and open CREDENTIAL files   (.flogic-id:   a person's "badge")
            -  make and open DATA PACKS         (.flogic:      a data file,  locked with a group's key)
            -  make and open SHARED PACKS       (.flogic v2:   one file for one or more groups,  signed by IT,
                                                 with an export rule per group)

        Two pages use it:  the app  (vaultI.js)  and IT's console  (it-console/).
        Everything is the browser's own  crypto.subtle.   No libraries.   No network.

        It puts ONE name on the page:  VaultCore.
        (All the scripts share one scope.  A second  "function wrapKey"  somewhere would
         silently replace the first one.  One object can't clash like that.)

        Every "can't do that" is an Error with a  .code:
            'wrong-secret'     the passphrase / code doesn't open these keys
            'not-a-pack'       the file isn't a .flogic data pack
            'not-a-credential' the file isn't a .flogic-id credential
            'bad-version'      made by a newer version than this one knows
            'locked-out'       the pack can't be opened with this key  (the wrong key,  or the file was changed)

    ==========================================================
*/

const VaultCore = (function () {

    'use strict';

    const subtle  = crypto.subtle;
    const ROUNDS  = 600000;                         //  PBKDF2 rounds:  ~0.3 s per try.  That's the ONLY brake on guessing
                                                    //  (with no server,  nothing can count wrong tries).
    const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   //  31 symbols:  no 0/O,  1/I/L  (they look alike)
    const PACK_MAGIC = 'FLGPACK1';                  //  the first 8 bytes of every data pack
    const VERSION = 1;                              //  credential files and pack headers say  "v": 1


    function fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }


    // ------------------------------------------------------
    //    BYTES  <->  TEXT
    // ------------------------------------------------------

    const utf8 = new TextEncoder();
    const unutf8 = new TextDecoder();

    function randomBytes(n) {
        return crypto.getRandomValues(new Uint8Array(n));
    }

    //  base64:  only for SMALL things  (salts,  IVs,  locked keys in a credential file).   Data packs stay raw bytes.
    function toB64(bytes) {
        const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        let s = '';
        for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        return btoa(s);
    }

    function fromB64(text) {
        const s = atob(text);
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return b;
    }


    // ------------------------------------------------------
    //    CODES      7KQ4M-X9WTC-...   (groups of 5)
    //
    //    recovery code:  25 symbols  ≈ 124 bits
    //    setup code:     15 symbols  ≈  74 bits   (used once,  and slowed down by PBKDF2)
    // ------------------------------------------------------

    function makeCode(length) {
        let code = '';
        while (code.length < length) {
            //  (A byte is 0–255.  248 = 8 × 31:  bytes from 248 up are thrown away,  so every symbol is equally likely.)
            for (const byte of randomBytes(length * 2)) {
                if (byte < 248 && code.length < length) code += ALPHABET[byte % 31];
            }
        }
        return formatCode(code);
    }

    //  Typed back in:  spaces and dashes don't matter,  small letters count as capitals.
    function normalizeCode(text) {
        return String(text).toUpperCase().replace(/[\s-]+/g, '');
    }

    function formatCode(text) {
        return normalizeCode(text).replace(/(.{5})(?=.)/g, '$1-');
    }


    //  A passphrase is long enough?   ''  =  yes.   Otherwise:  why not.
    function passphraseProblem(text) {
        const p = String(text);
        const words = p.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        if (p.length >= 12 || words.length >= 4) return '';
        return 'Use at least 12 characters, or 4 words.';
    }


    // ------------------------------------------------------
    //    A PASSPHRASE  (or a code)   ->   A KEY THAT LOCKS KEYS
    //
    //    PBKDF2-SHA256:  600,000 rounds of mixing,  with a fresh random "salt" each time
    //    (so the same passphrase never makes the same key twice).
    //    The key it makes can ONLY lock and unlock other keys,  and can't be read out  (extractable: false).
    // ------------------------------------------------------

    async function keyFromSecret(secret, salt, rounds) {
        const base = await subtle.importKey('raw', utf8.encode(secret), 'PBKDF2', false, ['deriveKey']);
        return subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: rounds },
            base,
            { name: 'AES-GCM', length: 256 },
            false,
            ['wrapKey', 'unwrapKey']
        );
    }


    // ------------------------------------------------------
    //    GROUP KEYS,  AND LOCKING THEM
    // ------------------------------------------------------

    //  A new group's key:  256 random bits.   (Only IT makes these.)
    //  "true" = it can be locked up  (wrapped).   Once it's unlocked in the app,  it's unwrapped as NOT readable.
    function newGroupKey() {
        return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    }

    //  The label a locked key is tied to:  copy a locked key onto another person or group,  and it won't open.
    function keyLabel(personId, group, keyVersion) {
        return utf8.encode(personId + '|' + group + '|' + keyVersion);
    }

    async function lockKey(groupKey, kek, label) {
        const iv = randomBytes(12);
        const wrapped = await subtle.wrapKey('raw', groupKey, kek, { name: 'AES-GCM', iv: iv, additionalData: label });
        return { iv: toB64(iv), wrapped: toB64(wrapped) };
    }

    async function unlockKey(entry, kek, label, extractable) {
        try {
            return await subtle.unwrapKey(
                'raw', fromB64(entry.wrapped), kek,
                { name: 'AES-GCM', iv: fromB64(entry.iv), additionalData: label },
                { name: 'AES-GCM', length: 256 },
                extractable,
                ['encrypt', 'decrypt']
            );
        } catch (e) {
            throw fail('wrong-secret', 'That doesn\'t unlock these keys.');
        }
    }


    //  Lock a person's group keys with a passphrase  (or a recovery code).
    //  keys:  [{ group, keyVersion, key }]      ->      { salt, rounds, keys: [{ group, keyVersion, iv, wrapped }] }
    async function lockKeys(personId, keys, secret, rounds) {
        const salt = randomBytes(16);
        const r = rounds || ROUNDS;
        const kek = await keyFromSecret(secret, salt, r);
        const out = [];
        for (const k of keys) {
            const locked = await lockKey(k.key, kek, keyLabel(personId, k.group, k.keyVersion));
            out.push({ group: k.group, keyVersion: k.keyVersion, iv: locked.iv, wrapped: locked.wrapped });
        }
        return { salt: toB64(salt), rounds: r, keys: out };
    }

    //  ...and open them again.   "extractable":  true only at SETUP  (to lock them again with the passphrase).
    async function unlockKeys(personId, locked, secret, extractable) {
        //  No locked keys at all?  Then NOTHING checks the secret:  any passphrase would "work".   Refuse instead.
        //  (Fernando's agent found this in the IT keyring,  Nov 5.)
        if (!locked || !Array.isArray(locked.keys) || locked.keys.length === 0) {
            throw fail('wrong-secret', 'There are no locked keys here to check that against.');
        }
        const kek = await keyFromSecret(secret, fromB64(locked.salt), locked.rounds);
        const out = [];
        for (const entry of locked.keys) {
            out.push({ group: entry.group, keyVersion: entry.keyVersion,
                       key: await unlockKey(entry, kek, keyLabel(personId, entry.group, entry.keyVersion), !!extractable) });
        }
        return out;
    }


    // ------------------------------------------------------
    //    CREDENTIAL FILES   (.flogic-id)      IT makes them.   The person opens them once,  with the setup code.
    //
    //    person:  { id, name, groups: [{ group, label, rules }], expires }
    //    keys:    [{ group, keyVersion, key }]       (the group keys this person gets)
    //
    //    ->  { credential  (the JSON object to save as a file),   setupCode  (to hand over,  in person) }
    // ------------------------------------------------------

    async function makeCredential(person, keys, rounds) {
        const setupCode = makeCode(15);
        const locked = await lockKeys(person.id, keys, normalizeCode(setupCode), rounds);
        const credential = {
            flogic: 'credential', v: VERSION,
            id: person.id, name: person.name,
            groups: person.groups,
            expires: person.expires || null,
            setup: { salt: locked.salt, rounds: locked.rounds },
            keys: locked.keys,
        };
        return { credential: credential, setupCode: setupCode };
    }

    //  Read a credential file's text.   Checks its shape  (not its keys:  that's openCredential).
    function readCredential(text) {
        let c;
        try { c = typeof text === 'string' ? JSON.parse(text) : text; }
        catch (e) { throw fail('not-a-credential', 'That isn\'t a credential file.'); }
        if (!c || c.flogic !== 'credential') throw fail('not-a-credential', 'That isn\'t a credential file.');
        if (c.v > VERSION) throw fail('bad-version', 'This credential file is from a newer version of the app.');
        if (typeof c.id !== 'string' || !Array.isArray(c.groups) || !Array.isArray(c.keys) || c.keys.length === 0 || !c.setup) {
            throw fail('not-a-credential', 'This credential file is damaged.');
        }
        return c;
    }

    //  Open a credential's group keys with its setup code   ->   [{ group, keyVersion, key  (extractable,  to lock again) }]
    function openCredential(credential, setupCode) {
        return unlockKeys(credential.id, { salt: credential.setup.salt, rounds: credential.setup.rounds, keys: credential.keys },
                          normalizeCode(setupCode), true);
    }


    // ------------------------------------------------------
    //    DATA PACKS   (.flogic)
    //
    //     bytes 0–7      "FLGPACK1"
    //     bytes 8–11     N  =  the header's length   (big-endian)
    //     next N bytes   the header  (JSON):  { group, keyVersion, fileName, rows, made }
    //     next 12 bytes  the IV
    //     the rest       the locked file  (AES-GCM,  with its 16-byte tag at the end)
    //
    //    The first  12 + N  bytes are AES-GCM's  "additionalData":  change the label  (like the group)
    //    and the file won't open.   The header can be READ without the key,  so the app can say
    //    "This pack is for Change Team"  before trying anything.
    // ------------------------------------------------------

    async function makePack(fileBytes, header, groupKey) {
        const head = utf8.encode(JSON.stringify(Object.assign({ v: VERSION }, header)));
        const front = new Uint8Array(12 + head.length);
        front.set(utf8.encode(PACK_MAGIC), 0);
        new DataView(front.buffer).setUint32(8, head.length);
        front.set(head, 12);

        const iv = randomBytes(12);                     //  a FRESH IV every time.  (Never twice with the same key.)
        const locked = await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: front }, groupKey, fileBytes);

        const pack = new Uint8Array(front.length + 12 + locked.byteLength);
        pack.set(front, 0);
        pack.set(iv, front.length);
        pack.set(new Uint8Array(locked), front.length + 12);
        return pack;
    }

    //  Just the label  (no key needed)   ->   { header,  front  (the bytes that are its additionalData),  at  (where the IV starts) }
    function readPackHeader(packBytes) {
        const b = packBytes instanceof Uint8Array ? packBytes : new Uint8Array(packBytes);
        if (b.length < 12 || unutf8.decode(b.subarray(0, 8)) !== PACK_MAGIC) {
            throw fail('not-a-pack', 'That isn\'t a Flogic data pack.');
        }
        const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(8);
        if (12 + n + 12 + 16 > b.length) throw fail('not-a-pack', 'This data pack is cut short.');
        let header;
        try { header = JSON.parse(unutf8.decode(b.subarray(12, 12 + n))); }
        catch (e) { throw fail('not-a-pack', 'This data pack\'s label is damaged.'); }
        if (header.v === PACK_VERSION) header = readShared(header);
        else if (header.v > VERSION) throw fail('bad-version', 'This data pack is from a newer version of the app.');
        return { header: header, front: b.subarray(0, 12 + n), at: 12 + n, bytes: b };
    }

    //  Open a pack with its group's key   ->   the file's bytes  (an ArrayBuffer)
    //  A SHARED pack  (v2)  needs to know WHICH of its groups the key is for:   groupId.
    //  (v2:  check IT's signature FIRST,  with checkPackSignature.   openPack only unlocks.)
    async function openPack(packBytes, groupKey, groupId) {
        const p = readPackHeader(packBytes);
        if (p.header.v === PACK_VERSION) return openShared(p, groupKey, groupId);
        try {
            return await subtle.decrypt(
                { name: 'AES-GCM', iv: p.bytes.subarray(p.at, p.at + 12), additionalData: p.front },
                groupKey,
                p.bytes.subarray(p.at + 12)
            );
        } catch (e) {
            throw fail('locked-out', 'This pack can\'t be opened with your key (it may have been changed).');
        }
    }


    // ------------------------------------------------------
    //    SHARED DATA PACKS   (.flogic,  v2)      one file,  one or more groups,  signed by IT
    //
    //     bytes 0–7      "FLGPACK1"                (the same start:  an older app says "from a newer version")
    //     bytes 8–11     N  =  the header's length
    //     next N bytes   the header  (JSON):   { v: 2,  signed: "<JSON text>",  sig: "<b64>" }
    //     next 12 bytes  the IV
    //     the rest       the locked file   (AES-GCM,  under a FRESH random file key)
    //
    //    signed  =  { id,  fileName,  rows,  made,  iss  (IT's signing key fingerprint),
    //                 groups: [{ group,  label,  keyVersion,  export,  iv,  wrapped }],     the file key,  locked once per group
    //                 data:   SHA-256 (b64) of  IV + the locked file }
    //    sig     =  IT's signature  (ECDSA P-256)  over   "FLGPACK2\n" + signed
    //
    //    Why the signature:   everyone in a group holds that group's key,  so anyone in it COULD make a pack.
    //    The signature says IT made THIS one,  with THESE groups and THESE export rules,  around THIS data.
    //    Change a group,  an export rule,  a locked key,  or one byte of the data,  and the app refuses it.
    //
    //    export,  per group:   may that group's people export this file?   It can only narrow:  the app ALSO needs
    //    the person's own group rule and level to allow it.
    // ------------------------------------------------------

    const PACK_VERSION = 2;
    const PACK_SIGN_MAGIC = 'FLGPACK2\n';
    const SIG = { name: 'ECDSA', hash: 'SHA-256' };

    function sharedKeyLabel(id, group, keyVersion) {
        return utf8.encode('flogic-pack|' + id + '|' + group + '|' + keyVersion);
    }

    //  info:     { fileName,  made,  rows  (or null) }
    //  groups:   [{ group,  label,  keyVersion,  export  (true / false),  key  (the group's key) }]
    //  signer:   { fingerprint,  sign(bytes) }     IT's signing key,  open   (SignInCore.openSigner)
    async function makeSharedPack(fileBytes, info, groups, signer) {
        if (!signer || typeof signer.sign !== 'function') throw fail('no-signer', 'A shared pack has to be signed by IT\'s signing key.');
        if (!Array.isArray(groups) || groups.length === 0) throw fail('no-group', 'Pick at least one group.');
        const ids = groups.map(function (g) { return g.group; });
        if (new Set(ids).size !== ids.length) throw fail('no-group', 'A group is in the list twice.');

        const id = toB64(randomBytes(12));
        //  The file key:  random,  used for this one pack.   Its raw bytes are only ever in this function,  and only locked.
        //  (Group keys can encrypt and decrypt,  not "wrap",  so the key's 32 bytes are encrypted like data.)
        const raw = randomBytes(32);
        const fileKey = await subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        const locks = [];
        try {
            for (const g of groups) {
                const iv = randomBytes(12);
                const wrapped = await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: sharedKeyLabel(id, g.group, g.keyVersion) }, g.key, raw);
                locks.push({ group: String(g.group), label: String(g.label || g.group), keyVersion: g.keyVersion, export: g.export === true,
                             iv: toB64(iv), wrapped: toB64(new Uint8Array(wrapped)) });
            }
        } finally { raw.fill(0); }

        const iv = randomBytes(12);
        const locked = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8.encode('flogic-pack|' + id) }, fileKey, fileBytes));
        const body = new Uint8Array(12 + locked.length);
        body.set(iv, 0);
        body.set(locked, 12);

        const signed = JSON.stringify({ id: id, fileName: String(info.fileName), rows: info.rows === undefined ? null : info.rows, made: info.made,
                                        iss: signer.fingerprint, groups: locks, data: await sha256(body) });
        const sig = await signer.sign(utf8.encode(PACK_SIGN_MAGIC + signed));
        const head = utf8.encode(JSON.stringify({ v: PACK_VERSION, signed: signed, sig: toB64(new Uint8Array(sig)) }));

        const pack = new Uint8Array(12 + head.length + body.length);
        pack.set(utf8.encode(PACK_MAGIC), 0);
        new DataView(pack.buffer).setUint32(8, head.length);
        pack.set(head, 12);
        pack.set(body, 12 + head.length);
        return pack;
    }

    async function sha256(bytes) { return toB64(new Uint8Array(await subtle.digest('SHA-256', bytes))); }

    //  A v2 header,  read  (no key,  no signature check yet).   The readable label is the SIGNED text,  parsed:
    //  what the app shows is exactly what IT signed  (or the pack is refused at checkPackSignature).
    function readShared(header) {
        let s;
        try { s = JSON.parse(header.signed); } catch (e) { s = null; }
        if (!s || typeof header.sig !== 'string' || !Array.isArray(s.groups) || s.groups.length === 0 || typeof s.data !== 'string') {
            throw fail('not-a-pack', 'This data pack\'s label is damaged.');
        }
        return { v: PACK_VERSION, id: String(s.id), fileName: s.fileName, rows: s.rows, made: s.made, iss: s.iss, data: s.data,
                 groups: s.groups.map(function (g) {
                     return { group: String(g.group), label: String(g.label), keyVersion: g.keyVersion, export: g.export === true, iv: g.iv, wrapped: g.wrapped };
                 }),
                 signed: header.signed, sig: header.sig };
    }

    //  IT signed this pack,  with the key the app trusts?     publicKey:  a CryptoKey  (ECDSA,  verify).    fingerprint:  its fingerprint.
    //  Throws  'wrong-issuer'  (made with another IT signing key)   or   'bad-signature'  (changed,  or not made by IT).
    async function checkPackSignature(packBytes, publicKey, fingerprint) {
        const p = readPackHeader(packBytes);
        if (p.header.v !== PACK_VERSION) return p.header;               //  an older pack  (v1)  carries no signature
        const h = p.header;
        let ok = false;
        try { ok = await subtle.verify(SIG, publicKey, fromB64(h.sig), utf8.encode(PACK_SIGN_MAGIC + h.signed)); } catch (e) { ok = false; }
        if (!ok) {
            if (h.iss && fingerprint && h.iss !== fingerprint) throw fail('wrong-issuer', 'This pack was made with an IT signing key this app doesn\'t trust. Ask IT to pack it again.');
            throw fail('bad-signature', 'This pack has been changed since IT made it.');
        }
        if (fingerprint && h.iss !== fingerprint) throw fail('wrong-issuer', 'This pack was made with an IT signing key this app doesn\'t trust. Ask IT to pack it again.');
        if (await sha256(p.bytes.subarray(p.at)) !== h.data) throw fail('bad-signature', 'This pack has been changed since IT made it.');
        return h;
    }

    async function openShared(p, groupKey, groupId) {
        const h = p.header;
        const g = h.groups.find(function (x) { return x.group === groupId; });
        if (!g) throw fail('locked-out', 'This pack isn\'t for that group.');
        let raw = null;
        try {
            raw = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(g.iv), additionalData: sharedKeyLabel(h.id, g.group, g.keyVersion) },
                                                      groupKey, fromB64(g.wrapped)));
            if (raw.length !== 32) throw new Error('not a file key');
            const fileKey = await subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
            raw.fill(0);
            return await subtle.decrypt({ name: 'AES-GCM', iv: p.bytes.subarray(p.at, p.at + 12), additionalData: utf8.encode('flogic-pack|' + h.id) },
                                        fileKey, p.bytes.subarray(p.at + 12));
        } catch (e) {
            throw fail('locked-out', 'This pack can\'t be opened with your key (it may have been changed).');
        } finally { if (raw) raw.fill(0); }
    }


    return Object.freeze({
        ROUNDS: ROUNDS, VERSION: VERSION,
        makeCode: makeCode, normalizeCode: normalizeCode, formatCode: formatCode, passphraseProblem: passphraseProblem,
        newGroupKey: newGroupKey, lockKeys: lockKeys, unlockKeys: unlockKeys,
        makeCredential: makeCredential, readCredential: readCredential, openCredential: openCredential,
        makePack: makePack, readPackHeader: readPackHeader, openPack: openPack,
        PACK_VERSION: PACK_VERSION, makeSharedPack: makeSharedPack, checkPackSignature: checkPackSignature,
        toB64: toB64, fromB64: fromB64,
    });

})();
