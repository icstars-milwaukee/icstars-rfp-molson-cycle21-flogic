# SSO-style sign-in: permission and brief (v0.1.0)

**From:** DJ and DJ's agent, 2026-11-09
**To:** Fernando's agent
**Task id:** S1
**Branch:** `sso-draft` (made from `group-BUFFER`; see section 7)
**Freeze:** Nov 16. **Demo:** Nov 19.
**Hand back:** `SCANME/returns/SSO-RETURN-v0.1.0-<date>.md`, from the template `SSO-RETURN-v0.1.0.md`.

---

## 1. Permission

You have permission to **rework how a person signs in, as a rough draft of SSO**, in your own new folder, and to hand it
back with the details DJ's agent needs to build it into the app.

This is a **draft for review, not a release**. Nothing you build here ships until DJ and DJ's agent have read your return
and said so.

Read first: `relay/README.md` (the rules), `roaches/access-and-encryption-handoff.md` (sections 1, 3 and 4),
`it-console/README.md`, `DIRECTORY/vaultcoreI.js`.

## 2. What "SSO-style" means here

Today: each person has a `.flogic-id` file and a one-time **setup code**, picks a **passphrase**, and then unlocks with it.
They get a recovery code. Each group's key is wrapped separately, and the unlock card is the sign-in.

The draft: **IT signs a person in once, and one proof of who they are covers every group they belong to**, the way a
company sign-in covers many apps. In practice:

- **IT is the identity provider (IdP).** The IT console issues a small signed file, an **assertion**, saying who the
  person is, which groups they're in, and when it stops being good.
- **The app only checks the signature.** The app holds IT's public key and never needs a per-person setup code.
- **One sign-in, a session.** After the assertion checks out and the person unlocks, the app keeps a short **session**
  (in memory only) that covers all their groups until it ends, either by Lock, by the auto-lock timer, or by the
  assertion expiring.
- **The vault still keeps locked keys only.** An assertion tells the app *who you are*. It never carries or replaces a
  key. Data packs still open only with the group's key.

You decide how the pieces fit. This section is the intent, not the design. If something here can't be done honestly,
say so in your return (section 6) rather than faking it.

## 3. The honesty limit (read this twice)

There is **no server**. The app is opened from disk as `file://`. So this is **not real SSO**, and nothing you write, in
code, in a button label or in a comment, may call it "SSO", "single sign-on", "federated", or "OIDC/SAML-compatible".

Use: **"one sign-in for all your groups"**, **"IT-issued sign-in file"**.

What a signed file can and can't do without a server:

| It can | It can't |
|---|---|
| Prove a file came from IT (a signature) | Revoke a sign-in before it expires (no server to ask) |
| Expire on a date | Stop someone copying the file |
| Cover many groups at once | Limit wrong guesses (only the cost of the key stretching does) |

Say each of these plainly in the return. An honest "it can't revoke" beats a clever workaround.

## 4. What you may and may not touch

| You may write | You may not touch |
|---|---|
| `sso-draft/` (new, at the repo root: your prototype, its tests, its README) | `DIRECTORY/` (every file, including `vaultcoreI.js` and `vaultI.js`) |
| `SCANME/returns/` (your return) | `it-console/` as it is today: copy what you need into `sso-draft/` |
| `relay/fernando-log.md` (log your steps, as in F1) | `demo-data/packs/` (use it read-only; make new samples in `sso-draft/demo/`) |
| | `markdowns/`, `relay/dj-log.md`, `roaches/` |

Need a change in a file you don't own, such as a new function in `vaultcoreI.js`? Don't make it. Write it as a
**REQUEST** in your log and in the return (section 6, item 7).

The relay rules still hold: pull with `--rebase` before each push, never `--force`, push every tested step, logs only grow.

## 5. Hard limits

1. **No real Molson data**, anywhere: not in the repo, a log or a test. Demo data only.
2. **No network.** No fetch, no CDN script, no font from a website, no analytics. It must work from `file://` with the
   Wi-Fi off.
3. **No storage of secrets.** No passphrase, code or unlocked key goes in `localStorage`, IndexedDB, a cookie or a
   file. The vault keeps locked keys only, as in the handoff (section 4).
4. **Only the browser's own crypto** (`crypto.subtle`) and the existing `VaultCore` formats. No homemade crypto, no
   library you pull in. If you need a primitive that WebCrypto lacks, stop and ask (`QUESTION`).
5. **Don't change the `.flogic` pack format or the `.flogic-id` format** in `DIRECTORY/`. If your draft needs a new
   format, make it a separate file type with its own version marker (like `FLGPACK1`), and describe it in the return.
6. **Decisions are DJ's and Fernando's.** Where this file doesn't settle something about how it looks or what it
   allows, pick the most cautious option, say so in your log (`QUESTION`), and keep going.
7. Don't write the words "SSO" or "single sign-on" in anything a user will read (section 3).

## 6. What to hand back

Fill in `SCANME/SSO-RETURN-v0.1.0.md` (copy it into `SCANME/returns/` with the date in the name). It asks for:

1. What you built, and how to run it.
2. The sign-in flow, step by step, from IT issuing it to the data opening.
3. The new file formats, byte for byte (an example of each).
4. The crypto: what is signed, with what, and what is checked where.
5. What you reused from `VaultCore`, and what you would need added to it.
6. The honest limits (the table in section 3, filled in with what you found).
7. The **REQUEST** list: exactly what DJ's agent has to change in `DIRECTORY/`, file by file.
8. Tests: what ran, the numbers, and how to run them again.
9. What you'd do differently, and what's still rough.

A return that skips sections isn't done. "Not done" and "I'm not sure" are both fine answers, as long as they're written.

## 7. Working order (suggested)

Each step: tested, committed, pushed, logged. The test style of F1 (`node ...run-...-test.mjs`, headless, `file://`) is
the model.

1. Make `sso-draft` from `group-BUFFER`. Log `STARTED`.
2. **IT's signing key and the assertion format** (made in the IT console copy): sign, and check a signature, in Node
   and in the browser. Tamper tests: a changed name, group or date must fail.
3. **The app side as a standalone page** in `sso-draft/` (not the real app): load an assertion, check it, show who and which
   groups, run the session (end it by Lock, timer and expiry).
4. **Hook it to the keys**: after the assertion checks out, how the person's group keys unlock. Show that the data
   packs from `demo-data/packs/` still open, and that the wrong group's pack is still refused.
5. **The honest-limits check**: an expired assertion, a copied assertion on another laptop, a swapped group. Write what
   happens, good or bad.
6. Write the return. Log `DONE`.

## 8. When this is done

DJ's agent reads your return and builds it out in `DIRECTORY/` (it owns that), bumps the version if it ships, and adds a
`CHANGELOG.md` entry under **New**, with your limits under **Known limits**. You'll hear in `relay/dj-log.md`.

Go-word: **Keystone**.
