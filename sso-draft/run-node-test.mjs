/*
    run-node-test.mjs   -   the crypto checks in Node   (no browser):     node sso-draft/run-node-test.mjs
    The same checks run in the browser too:   node sso-draft/run-browser-test.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { VaultCore, SignInCore, repo, draft } from './load-core.mjs';

const pinned = new Function(fs.readFileSync(path.join(draft, 'it-signerS.js'), 'utf8') + '\nreturn FLOGIC_IT_SIGNER;')();
const runCoreTests = new Function('VaultCore', 'SignInCore',
    fs.readFileSync(path.join(draft, 'core-testsS.js'), 'utf8') + '\nreturn runCoreTests;')(VaultCore, SignInCore);

const results = [];
function check(name, ok, detail) { results.push({ name: name, ok: ok === true, detail: ok === true ? '' : String(detail === undefined ? ok : detail) }); }
const start = Date.now();
await runCoreTests(check, {
    pinned: pinned,
    text: function (p) { return fs.readFileSync(path.join(repo, p), 'utf8'); },
    bytes: function (p) { return new Uint8Array(fs.readFileSync(path.join(repo, p))); },
});
let passed = 0;
for (const r of results) { if (r.ok) passed++; console.log((r.ok ? '  ok    ' : '  FAIL  ') + r.name + (r.ok ? '' : '   (' + r.detail + ')')); }
console.log('\n' + passed + ' / ' + results.length + ' passed   (' + ((Date.now() - start) / 1000).toFixed(1) + ' s)');
process.exit(passed === results.length ? 0 : 1);
