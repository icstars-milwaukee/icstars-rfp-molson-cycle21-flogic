/*
    ==========================================================

        upgrade-demo-keyring.mjs   -   brings the DEMO keyring up to date,  WITHOUT making new keys

            node it-console/upgrade-demo-keyring.mjs

        make-demo-set.mjs  makes everything new  (new group keys,  new setup codes):  every pack and credential
        already handed out stops working.   This one keeps the keys and only adds what newer consoles expect:

            -  the demo signing key  (sso-draft/demo/demo-it.flogic-signer)  goes INSIDE the keyring
            -  each person gets an access level:   Fernando G = Analyst,   DJ = Viewer
            -  each person is marked reviewed TODAY   (run it again when the 30-day review runs out,
               or click "Still needed" in the console)
            -  the two demo packs are put on the keyring's "packed so far" list

        The packs,  the credentials and their setup codes don't change.   DEMO ONLY:  made-up data.

    ==========================================================
*/

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.join(root, 'demo-data', 'packs');

for (const f of ['vaultcoreI.js', 'policyI.js', 'signincoreI.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(root, 'DIRECTORY', f), 'utf8'), { filename: f });
}
vm.runInThisContext(fs.readFileSync(path.join(here, 'itconsoleI.js'), 'utf8'), { filename: 'itconsoleI.js' });
const ITConsole = vm.runInThisContext('ITConsole');
const VaultCore = vm.runInThisContext('VaultCore');

const IT_PASSPHRASE = 'flogic demo keyring only';        //  DEMO ONLY  (it's in demo-data/packs/README.md)
const LEVELS = { 'Fernando G': 'analyst', 'DJ': 'viewer' };

const file = path.join(out, 'demo-it.flogic-keyring');
const s = await ITConsole.openKeyring(fs.readFileSync(file, 'utf8'), IT_PASSPHRASE);

if (!s.signing) {
    const fp = await ITConsole.importSigner(s, fs.readFileSync(path.join(root, 'sso-draft', 'demo', 'demo-it.flogic-signer'), 'utf8'));
    console.log('  the demo signing key ' + fp + ' is now inside the keyring');
}

for (const p of s.people) {
    if (LEVELS[p.name]) p.level = LEVELS[p.name];
    ITConsole.reviewPerson(s, p.id);
    console.log('  ' + p.name + ' (' + p.id + '):  ' + p.level + ',  reviewed ' + p.reviewed);
}

for (const g of s.groups) {
    const pack = g.group === 'service-desk' ? 'demo_incident' : g.group === 'change-team' ? 'demo_change_request' : null;
    if (!pack || s.packs.some(function (k) { return k.pack === pack + '.flogic'; })) continue;
    const bytes = fs.readFileSync(path.join(out, pack + '.flogic'));
    const head = VaultCore.readPackHeader(new Uint8Array(bytes)).header;
    s.packs.push({ pack: pack + '.flogic', fileName: head.fileName, group: g.group, bytes: bytes.length, made: head.made });
    console.log('  listed ' + pack + '.flogic  (for ' + g.label + ')');
}

fs.writeFileSync(file, await ITConsole.keyringText(s) + '\n');

//  Check:  it opens again,  it can sign,  and the packs still open with the same group keys.
const back = await ITConsole.openKeyring(fs.readFileSync(file, 'utf8'), IT_PASSPHRASE);
const made = await ITConsole.makeKeyFile(back, back.people[0].id);
if (!made.text.includes('"flogic": "key"')) throw new Error('the upgraded keyring can\'t make a key file');
for (const k of back.packs) {
    await VaultCore.openPack(new Uint8Array(fs.readFileSync(path.join(out, k.pack))), back.keys[k.group].key);
}
console.log('  checked:  the keyring opens, signs a key file, and both packs still open with its keys');
