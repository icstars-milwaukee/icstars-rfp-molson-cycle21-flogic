/*
    ==========================================================

        make-demo.mjs   -   makes IT's DEMO signing key,  and the app's pinned copy of it

            node sso-draft/make-demo.mjs

        Writes:
            sso-draft/demo/demo-it.flogic-signer     IT's signing key,  locked with the demo passphrase
            DIRECTORY/it-signerI.js                  the app's pinned copy  (public half + fingerprint)

        Running it again makes a NEW key:  every sign-in file made with the old one stops working.
        DEMO ONLY.   The passphrase is the demo keyring's,  written in demo-data/packs/README.md.

    ==========================================================
*/
import fs from 'node:fs';
import path from 'node:path';
import { SignInCore, draft, repo } from './load-core.mjs';

const PASS = 'flogic demo keyring only';
const signer = await SignInCore.newSigner(PASS);
fs.writeFileSync(path.join(draft, 'demo', 'demo-it.flogic-signer'), JSON.stringify(signer, null, 2) + '\n');
const pin = SignInCore.pin(signer);
fs.writeFileSync(path.join(repo, 'DIRECTORY', 'it-signerI.js'),
`/*
    it-signerI.js   -   the app's copy of IT's PUBLIC signing key.
    (IT's console makes this file:  "Download the app's trust file".   The demo one:  sso-draft/make-demo.mjs.)

    The app believes a sign-in file only if this key's signature checks.   Nothing secret is here.
    Swap this file and you swap who the app trusts:  so it ships WITH the app,  and changes only with it.
    DEMO KEY.   Fingerprint:  ${pin.fingerprint}
*/
const FLOGIC_IT_SIGNER = Object.freeze(${JSON.stringify(pin, null, 4)});
`);
console.log('IT signing key ' + pin.fingerprint + ' -> sso-draft/demo/demo-it.flogic-signer and DIRECTORY/it-signerI.js');
