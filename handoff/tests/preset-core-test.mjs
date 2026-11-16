// PRESET DATA in key files: the core, in Node (no browser, no files, made-up rows only).   node preset-core-test.mjs
//   IT packs a small file "for key files"  ->  it rides in each member's key file  ->  the app takes it only if IT's
//   signature covers it.   Exits 1 on any FAIL, so CI can run it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = ['DataPage/vaultcoreI.js', 'DataPage/policyI.js', 'DataPage/signincoreI.js', 'DataPage/mailboxI.js', 'it-console/itconsoleI.js']
    .map((f) => readFileSync(path.join(REPO, f), 'utf8')).join('\n;\n');
const ctx = vm.createContext({ crypto: globalThis.crypto, TextEncoder, TextDecoder, console, setTimeout, clearTimeout, btoa, atob, URL, Blob });
const { IT, S, V } = vm.runInContext(src + '\n;({ IT: ITConsole, S: SignInCore, V: VaultCore })', ctx);

let fails = 0;
function check(name, ok, extra) { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '   [' + extra + ']' : '')); }
async function throws(work, code) { try { await work(); return false; } catch (e) { return code ? e.code === code : true; } }
const enc = new TextEncoder(), dec = new TextDecoder();
function csv(rows) { let t = 'number,state,team\n'; for (let i = 0; i < rows; i++) t += 'INC' + (1000 + i) + ',' + (i % 3 ? 'open' : 'closed') + ',' + (i % 2 ? 'network' : 'desktop') + '\n'; return enc.encode(t); }
function filler(bytes) { const b = new Uint8Array(bytes); for (let i = 0; i < bytes; i++) b[i] = 65 + (i * 7) % 26; return b; }
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const PASS = 'correct horse battery staple';
const s = await IT.newKeyring(PASS);
await IT.makeSigner(s);
await IT.addGroup(s, { label: 'Finance', group: 'finance', rules: { export: true, autoLockMin: 15 } });
await IT.addGroup(s, { label: 'HR', group: 'hr', rules: { export: false, autoLockMin: 10 } });
const dana = IT.addPerson(s, { name: 'Dana Desk', groups: ['finance'], level: 'analyst', expires: '' });
const hal = IT.addPerson(s, { name: 'Hal Hall', groups: ['hr'], level: 'viewer', expires: '' });
const pin = S.pin(s.signer);

// 1. a small file, packed for Finance, marked for key files
const tickets = csv(400);
const packed = await IT.packFile(s, 'tickets.csv', tickets, ['finance']);
check('a small pack has no size problem', IT.presetProblem(packed.bytes) === '', packed.bytes.length + ' bytes');
IT.addPreset(s, packed, 'tickets.csv');
check('the keyring holds one preset', s.presets.length === 1 && s.presets[0].pack === 'tickets.flogic' && s.unsaved === true);

// 2. Dana (Finance): her key file carries it, signed
const made = await IT.makeKeyFile(s, dana.id);
const claims = JSON.parse(made.file.claims);
check('Dana\'s key file carries the preset, and says so', made.presets.join() === 'tickets.flogic' && Array.isArray(made.file.packs) && made.file.packs.length === 1);
check('the claims IT signed hold the preset list\'s hash', typeof claims.packs === 'string' && claims.packs.length > 20);
check('the key file fits the app\'s limit', made.text.length <= S.KEY_FILE_MAX, made.text.length + ' of ' + S.KEY_FILE_MAX);
const key = S.readKey(made.text);                             // as the app reads it from the drive folder
await S.check(key, pin);
const got = await S.presets(key, pin);
check('the app gets the same pack bytes back', got.length === 1 && got[0].fileName === 'tickets.csv' && same(got[0].bytes, packed.bytes));

// 3. it opens with Dana's key from that key file, after IT's signature on the pack is checked
const copy = await S.claim(key, '4827', pin, 1000);
const opened = await S.unlock(copy, '4827', pin);
await V.checkPackSignature(got[0].bytes, await S.trustedKey(pin), pin.fingerprint);
const plain = await V.openPack(got[0].bytes, opened.keys.find((k) => k.group === 'finance').key, 'finance');
check('the preset opens to the very same file', dec.decode(plain) === dec.decode(tickets));
check('the laptop copy holds no data (claims, signature and locked keys only)', !('packs' in copy) && JSON.stringify(copy).length < 4000, JSON.stringify(copy).length + ' chars');

// 4. Hal (HR only): nothing rides in his key file, and it looks as key files always did
const halKey = await IT.makeKeyFile(s, hal.id);
check('someone outside the group gets no preset', halKey.presets.length === 0 && halKey.file.packs === undefined && JSON.parse(halKey.file.claims).packs === undefined);
check('a key file without presets gives none', (await S.presets(S.readKey(halKey.text), pin)).length === 0);

// 5. the drive folder is not trusted: every edit is refused
const edit = (f) => { const k = JSON.parse(made.text); f(k); return k; };
const flipped = edit((k) => { const d = k.packs[0].data; k.packs[0].data = d.slice(0, 40) + (d[40] === 'A' ? 'B' : 'A') + d.slice(41); });
check('one changed letter in the data: refused', await throws(() => S.presets(flipped, pin), 'damaged'));
check('the preset removed from the file: refused', await throws(() => S.presets(edit((k) => { delete k.packs; }), pin), 'damaged'));
const other = await IT.packFile(s, 'other.csv', csv(5), ['finance']);
check('another real pack swapped in: refused', await throws(() => S.presets(edit((k) => { k.packs[0].data = V.toB64(other.bytes); }), pin), 'damaged'));
check('a second pack added: refused', await throws(() => S.presets(edit((k) => { k.packs.push({ pack: 'x.flogic', fileName: 'x.csv', groups: ['finance'], data: V.toB64(other.bytes) }); }), pin), 'damaged'));
check('renamed inside the list: refused', await throws(() => S.presets(edit((k) => { k.packs[0].fileName = 'payroll.csv'; }), pin), 'damaged'));
const sneaked = JSON.parse(halKey.text); sneaked.packs = made.file.packs;
check('a pack slipped into a key file IT signed none for: ignored', (await S.presets(sneaked, pin)).length === 0);
check('...and sign-in itself still works for that file (only the data is dropped)', !(await throws(() => S.check(flipped, pin))));

// 6. too big for a key file: said, packed as always, key files still made
const big = await IT.packFile(s, 'big.csv', filler(300 * 1024), ['finance']);
check('a 300 KB pack is too big for key files, in words', /too big for key files/.test(IT.presetProblem(big.bytes)), IT.presetProblem(big.bytes));
check('...and adding it is refused', await throws(() => IT.addPreset(s, big, 'big.csv'), 'too-big') && s.presets.length === 1);

// 7. two presets that don't both fit: the newest rides, the other is named
//    (two 100 KB packs can't share one 256 KB key file; the 9 KB one fits beside either)
const wide = await IT.packFile(s, 'wide.csv', filler(100 * 1024), ['finance']);
IT.addPreset(s, wide, 'wide.csv');
const both = await IT.makeKeyFile(s, dana.id);
check('two presets that fit ride together, newest first', both.presets.join() === 'wide.flogic,tickets.flogic' && both.presetsLeft.length === 0, both.text.length + ' chars');
const wide2 = await IT.packFile(s, 'wide2.csv', filler(100 * 1024), ['finance']);
IT.addPreset(s, wide2, 'wide2.csv');
const two = await IT.makeKeyFile(s, dana.id);
check('when they don\'t all fit: the newest rides, the one left out is named', two.presets.join() === 'wide2.flogic,tickets.flogic' && two.presetsLeft.join() === 'wide.flogic' && two.text.length <= S.KEY_FILE_MAX, two.text.length + ' chars');
check('...and that key file\'s presets check out', (await S.presets(S.readKey(two.text), pin)).map((p) => p.pack).join() === 'wide2.flogic,tickets.flogic');
IT.removePreset(s, 'wide.flogic'); IT.removePreset(s, 'wide2.flogic');
check('taken out again: only the small one rides', (await IT.makeKeyFile(s, dana.id)).presets.join() === 'tickets.flogic');

// 8. save the keyring, open it again: the preset is still there, and still rides
const reopened = await IT.openKeyring(await IT.keyringText(s), PASS);
check('the keyring keeps its presets through save and open', reopened.presets.length === 1 && reopened.presets[0].data === s.presets[0].data);
const again = await IT.makeKeyFile(reopened, dana.id);
check('a renewal from the reopened keyring carries it too', (await S.presets(S.readKey(again.text), pin)).length === 1);
const junk = JSON.parse(await IT.keyringText(s)); junk.presets.push({ pack: 'evil.exe', fileName: 'x', groups: ['finance'], data: 'AAAA' }, null, { pack: 'huge.flogic', fileName: 'h.csv', groups: ['finance'], data: 'A'.repeat(400000) });
check('junk in a keyring\'s preset list is dropped on open', (await IT.openKeyring(JSON.stringify(junk), PASS)).presets.length === 1);

// 9. the keyring can't grow past what it can open again
const f1 = await IT.packFile(s, 'f1.csv', filler(170 * 1024), ['finance']); IT.addPreset(s, f1, 'f1.csv');
const f2 = await IT.packFile(s, 'f2.csv', filler(170 * 1024), ['finance']); IT.addPreset(s, f2, 'f2.csv');
const f3 = await IT.packFile(s, 'f3.csv', filler(170 * 1024), ['finance']);
check('the keyring refuses more key-file data than it can hold', await throws(() => IT.addPreset(s, f3, 'f3.csv'), 'too-big') && s.presets.length === 3);
check('...and still saves and opens', (await IT.openKeyring(await IT.keyringText(s), PASS)).presets.length === 3);

// 10. a new signing key: the old presets would be refused by the app, so they're dropped
await IT.makeSigner(s);
check('a new signing key drops the presets (pack them again)', s.presets.length === 0);

console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
