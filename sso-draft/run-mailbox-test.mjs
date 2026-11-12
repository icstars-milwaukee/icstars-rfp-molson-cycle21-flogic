/*
    run-mailbox-test.mjs   -   the shared-folder checks in Node:     node sso-draft/run-mailbox-test.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { SignInCore, Mailbox, makeMemoryFolder, repo, draft } from './load-core.mjs';

const pinned = new Function(fs.readFileSync(path.join(repo, 'DIRECTORY', 'it-signerI.js'), 'utf8') + '\nreturn FLOGIC_IT_SIGNER;')();
const run = new Function(fs.readFileSync(path.join(draft, 'mailbox-testsS.js'), 'utf8') + '\nreturn runMailboxTests;')();

const results = [];
function check(name, ok, detail) { results.push({ name: name, ok: ok === true, detail: ok === true ? '' : String(detail === undefined ? ok : detail) }); }
const start = Date.now();
await run(check, { pinned: pinned, text: function (p) { return fs.readFileSync(path.join(repo, p), 'utf8'); } }, SignInCore, Mailbox, makeMemoryFolder);
let passed = 0;
for (const r of results) { if (r.ok) passed++; console.log((r.ok ? '  ok    ' : '  FAIL  ') + r.name + (r.ok ? '' : '   (' + r.detail + ')')); }
console.log('\n' + passed + ' / ' + results.length + ' passed   (' + ((Date.now() - start) / 1000).toFixed(1) + ' s)');
process.exit(passed === results.length ? 0 : 1);
