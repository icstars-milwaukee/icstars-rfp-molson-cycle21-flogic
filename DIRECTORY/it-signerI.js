/*
    it-signerI.js   -   the app's copy of IT's PUBLIC signing key.
    (IT's console makes this file:  "Download the app's trust file".   The demo one:  sso-draft/make-demo.mjs.)

    The app believes a sign-in file only if this key's signature checks.   Nothing secret is here.
    Swap this file and you swap who the app trusts:  so it ships WITH the app,  and changes only with it.
    DEMO KEY.   Fingerprint:  X8FB-44UJ-APFN-VWCM
*/
const FLOGIC_IT_SIGNER = Object.freeze({
    "fingerprint": "X8FB-44UJ-APFN-VWCM",
    "publicKey": {
        "key_ops": [
            "verify"
        ],
        "ext": true,
        "kty": "EC",
        "x": "tcTYH9i-vBQAJI1gOa2FJtvURQYJdtreG5NJIh4ezDk",
        "y": "We_IBGqhXigHi-a7vFUKqa9EfHvmpTgfuluFKw5anlw",
        "crv": "P-256"
    }
});
