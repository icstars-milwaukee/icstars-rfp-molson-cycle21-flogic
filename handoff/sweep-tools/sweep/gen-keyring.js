// A made-up keyring for the IT sweep: 6 groups, 100 people, 500 pack-log entries.  Built with the console's own logic.
const fs = require('fs'), path = require('path'), vm = require('vm');
const REPO = path.resolve(__dirname, '..', '..', '..').replace(/\\/g, '/');
const src = ['DataPage/vaultcoreI.js', 'DataPage/policyI.js', 'DataPage/signincoreI.js', 'DataPage/mailboxI.js', 'it-console/itconsoleI.js'].map((f) => fs.readFileSync(path.join(REPO, f), 'utf8')).join('\n;\n');
const ctx = vm.createContext({ crypto: globalThis.crypto, TextEncoder, TextDecoder, console, setTimeout, clearTimeout, btoa, atob, URL, Blob });
const IT = vm.runInContext(src + '\n;ITConsole', ctx);
(async () => {
    const s = await IT.newKeyring('correct horse battery staple');
    await IT.makeSigner(s);
    const groups = [['Finance', true, 15], ['HR', false, 10], ['Operations', true, 30], ['Service Desk', true, 15], ['Change Team', false, 20], ['Field', true, 30]];
    for (const [label, ex, m] of groups) await IT.addGroup(s, { label, group: IT.slugify(label), rules: { export: ex, autoLockMin: m } });
    const ids = s.groups.map((g) => g.group);
    const first = ['Ana', 'Bo', 'Chen', 'Dee', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jo'], last = ['Rivera', 'Smith', 'Nguyen', 'Okafor', 'Kowalski', 'Garcia', 'Lee', 'Brown', 'Khan', 'Diaz'];
    for (let i = 0; i < 100; i++) {
        const level = i % 10 === 0 ? 'guest' : i % 3 === 0 ? 'analyst' : 'viewer';
        const g = level === 'guest' ? [ids[i % 6]] : [ids[i % 6], ids[(i + 2) % 6]];
        IT.addPerson(s, { name: first[i % 10] + ' ' + last[Math.floor(i / 10)], groups: g, level, expires: '' });
    }
    for (let i = 0; i < 500; i++) {
        const g = i % 7 === 0 ? [ids[i % 6], ids[(i + 1) % 6]] : [ids[i % 6]];
        s.packs.push({ pack: 'export_' + String(i).padStart(4, '0') + '.flogic', fileName: 'export_' + String(i).padStart(4, '0') + '.csv', group: g[0], groups: g, export: [], bytes: 10000 + i * 37, made: IT.today(), by: s.signing.fingerprint });
    }
    const out = path.join(__dirname, 'world', 'hundred.flogic-keyring');
    fs.writeFileSync(out, await IT.keyringText(s));
    fs.writeFileSync(path.join(__dirname, 'world', 'hundred-it-signerI.js'), IT.trustFile(s));
    console.log('wrote', out, fs.statSync(out).size, 'bytes;', s.people.length, 'people,', s.packs.length, 'pack entries');
})().catch((e) => { console.log('FAILED', e.stack); process.exit(1); });
