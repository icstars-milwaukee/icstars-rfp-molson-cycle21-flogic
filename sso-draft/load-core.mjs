/*
    load-core.mjs   -   loads  VaultCore  +  FlogicPolicy  +  SignInCore  into Node,  exactly the files the browser loads.
    (They're plain scripts,  not modules:  so we read them and run them together,  once.)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..', 'DIRECTORY');
const src = fs.readFileSync(path.join(app, 'vaultcoreI.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(app, 'policyI.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(app, 'signincoreI.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(app, 'mailboxI.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(here, 'memory-folderS.js'), 'utf8') + '\nreturn { VaultCore, FlogicPolicy, SignInCore, Mailbox, makeMemoryFolder };';
export const { VaultCore, FlogicPolicy, SignInCore, Mailbox, makeMemoryFolder } = new Function(src)();
export const repo = path.join(here, '..');
export const draft = here;
