/*
    ==========================================================

        make-demo-set.mjs   -   makes the DEMO SET in  demo-data/packs/   (F1 step 5)

            node it-console/make-demo-set.mjs

        It does what IT would do in the console,  with the console's own code
        (vaultcoreI.js  +  itconsoleI.js,  loaded into Node):

            demo-it.flogic-keyring        groups  Service Desk  (export yes,  15 min)   and   Change Team  (export NO,  10 min)
            demo_incident.flogic          demo-data/demo_incident.csv,          packed for Service Desk
            demo_change_request.flogic    demo-data/demo_change_request.csv,    packed for Change Team
            fernando.flogic-id            Fernando G,  Service Desk
            dj.flogic-id                  DJ,  Change Team
            README.md                     the IT passphrase and both setup codes   (DEMO ONLY:  everything here is made up)

        Then it opens every file again with the codes it wrote in the README,  to check.

        Running it again makes NEW keys and NEW codes for all of it.   Anyone who already set up with the old
        fernando.flogic-id  /  dj.flogic-id  has to set up again.

    ==========================================================
*/

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = path.join(root, 'demo-data', 'packs');

//  The two scripts share one scope,  like two <script> tags on a page.
vm.runInThisContext(fs.readFileSync(path.join(root, 'DIRECTORY', 'vaultcoreI.js'), 'utf8'), { filename: 'vaultcoreI.js' });
vm.runInThisContext(fs.readFileSync(path.join(here, 'itconsoleI.js'), 'utf8'), { filename: 'itconsoleI.js' });
const VaultCore = vm.runInThisContext('VaultCore');
const ITConsole = vm.runInThisContext('ITConsole');

const IT_PASSPHRASE = 'flogic demo keyring only';        //  4 words:  passes passphraseProblem.   DEMO ONLY.

function write(name, data) {
    fs.writeFileSync(path.join(out, name), data);
    console.log('  wrote ' + path.join('demo-data', 'packs', name) + '   (' + fs.statSync(path.join(out, name)).size.toLocaleString() + ' bytes)');
}

async function make() {
    fs.mkdirSync(out, { recursive: true });
    const made = ITConsole.today();

    const s = await ITConsole.newKeyring(IT_PASSPHRASE);
    await ITConsole.addGroup(s, { label: 'Service Desk', group: 'service-desk', rules: { export: true, autoLockMin: 15 } });
    await ITConsole.addGroup(s, { label: 'Change Team', group: 'change-team', rules: { export: false, autoLockMin: 10 } });

    const packs = [
        { csv: 'demo_incident.csv', group: 'service-desk' },
        { csv: 'demo_change_request.csv', group: 'change-team' },
    ];
    for (const p of packs) {
        const bytes = fs.readFileSync(path.join(root, 'demo-data', p.csv));
        const pack = await ITConsole.packFile(s, p.csv, bytes, p.group, made);
        write(pack.name, pack.bytes);
    }

    const expires = ITConsole.defaultExpiry();
    const people = [
        { name: 'Fernando G', groups: ['service-desk'] },
        { name: 'DJ', groups: ['change-team'] },
    ];
    const codes = [];
    for (const who of people) {
        const c = await ITConsole.makePerson(s, { name: who.name, groups: who.groups, expires: expires });
        write(c.fileName, JSON.stringify(c.credential, null, 2) + '\n');
        codes.push({ name: who.name, file: c.fileName, id: c.credential.id, group: c.credential.groups[0].label, code: c.setupCode });
    }

    write('demo-it.flogic-keyring', await ITConsole.keyringText(s) + '\n');
    write('README.md', readme(codes, expires, made));
}


function readme(codes, expires, made) {
    const rows = codes.map(function (c) {
        return '| `' + c.file + '` | ' + c.name + ' (`' + c.id + '`) | ' + c.group + ' | `' + c.code + '` |';
    }).join('\n');
    return `# ⚠ DEMO ONLY, made-up data

**Everything in this folder is fake:** the data inside the packs is invented (\`../README.md\`), and these keys and codes
exist only for the demo. That's the only reason the passphrase and the setup codes can be written down here.
**Never do this with a real keyring, a real credential, or real data.** A real setup code goes to its person in person
or over Teams, never in a file, and never in the same email as the credential.

Made ${made} by \`node it-console/make-demo-set.mjs\` (the IT console's own code). Running it again makes new keys and
new codes for everything here, and anyone who already set up with the old files has to set up again.

## The IT keyring

| File | IT passphrase |
|---|---|
| \`demo-it.flogic-keyring\` | \`${IT_PASSPHRASE}\` |

Open it in \`it-console/it-console.html\` → **Open keyring**.

| Group | Id | Can export | Auto-lock (most) |
|---|---|---|---|
| Service Desk | \`service-desk\` | Yes | 15 min |
| Change Team | \`change-team\` | **No** | 10 min |

The export rules differ on purpose: the demo shows one group that can export and one that can't.

## The credentials (one per person)

Each opens once in Flogic with its setup code. Then the person picks their own passphrase. Both expire ${expires}.

| File | Person | Group | Setup code |
|---|---|---|---|
${rows}

## The data packs

| File | Holds | For |
|---|---|---|
| \`demo_incident.flogic\` | \`demo_incident.csv\` (2,400 rows) | Service Desk |
| \`demo_change_request.flogic\` | \`demo_change_request.csv\` (450 rows) | Change Team |

So Fernando G opens \`demo_incident.flogic\`, and DJ opens \`demo_change_request.flogic\`. Each one's other pack says
*"This pack is for ... You're not in that group."*
`;
}


//  Open everything again,  with the codes as the README has them.
async function verify() {
    const text = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
    const pass = /\| `demo-it\.flogic-keyring` \| `([^`]+)` \|/.exec(text)[1];
    const ring = await ITConsole.openKeyring(fs.readFileSync(path.join(out, 'demo-it.flogic-keyring'), 'utf8'), pass);
    const want = { 'fernando.flogic-id': ['service-desk', 'demo_incident'], 'dj.flogic-id': ['change-team', 'demo_change_request'] };
    for (const file of Object.keys(want)) {
        const code = new RegExp('\\| `' + file.replace('.', '\\.') + '` \\|[^\\n]*\\| `([^`]+)` \\|').exec(text)[1];
        const keys = await VaultCore.openCredential(VaultCore.readCredential(fs.readFileSync(path.join(out, file), 'utf8')), code);
        if (keys.length !== 1 || keys[0].group !== want[file][0]) throw new Error(file + ' opened to the wrong groups');
        const pack = fs.readFileSync(path.join(out, want[file][1] + '.flogic'));
        const csv = fs.readFileSync(path.join(root, 'demo-data', want[file][1] + '.csv'));
        if (!Buffer.from(await VaultCore.openPack(pack, keys[0].key)).equals(csv)) throw new Error(want[file][1] + '.flogic didn\'t open to the CSV');
        if (!Buffer.from(await VaultCore.openPack(pack, ring.keys[want[file][0]].key)).equals(csv)) throw new Error('the keyring key differs');
    }
    console.log('  checked:  the keyring, both credentials and both packs open with the README\'s codes, to the same bytes');
}


make().then(verify).catch(function (e) { console.error(e); process.exit(1); });
