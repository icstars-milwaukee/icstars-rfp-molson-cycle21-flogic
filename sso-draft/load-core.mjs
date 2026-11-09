/*
    load-core.mjs   -   loads  VaultCore  +  SignInCore  into Node,  exactly the files the browser loads.
    (They're plain scripts,  not modules:  so we read them and run them together,  once.)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'DIRECTORY', 'vaultcoreI.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(here, 'signincoreS.js'), 'utf8') + '\nreturn { VaultCore, SignInCore };';
export const { VaultCore, SignInCore } = new Function(src)();
export const repo = path.join(here, '..');
export const draft = here;
