# ⚠ DEMO ONLY, made-up data

**Everything in this folder is fake:** the data inside the packs is invented (`../README.md`), and these keys and codes
exist only for the demo. That's the only reason the passphrase and the setup codes can be written down here.
**Never do this with a real keyring, a real credential, or real data.** A real setup code goes to its person in person
or over Teams, never in a file, and never in the same email as the credential.

Made 2026-11-05 by `node it-console/make-demo-set.mjs` (the IT console's own code). Running it again makes new keys and
new codes for everything here, and anyone who already set up with the old files has to set up again.

## The IT keyring

| File | IT passphrase |
|---|---|
| `demo-it.flogic-keyring` | `flogic demo keyring only` |

Open it in `it-console/it-console.html` → **Open keyring**.

| Group | Id | Can export | Auto-lock (most) |
|---|---|---|---|
| Service Desk | `service-desk` | Yes | 15 min |
| Change Team | `change-team` | **No** | 10 min |

The export rules differ on purpose: the demo shows one group that can export and one that can't.

## Access levels and key files

The demo keyring carries the demo signing key (the one `DIRECTORY/it-signerI.js` trusts) and each person's level:

| Person | Level | So they... |
|---|---|---|
| Fernando G (`u-0001`) | **Analyst** | can export Service Desk data; key file lasts 7 days |
| DJ (`u-0002`) | **Viewer** | can read Change Team data but not export it; key file lasts 7 days |

Key files aren't kept here: they last 7 days at most, so they'd be out of date. Make them in the console
(**Make key file**), then sign in to the app with one (`sso-draft/README.md`, "Try it").

Each person's 30-day review was last done when the keyring was made or brought up to date. Once it runs out, the
console asks for **Still needed** before it makes them a key file. `node it-console/upgrade-demo-keyring.mjs` does that
for everyone and keeps every key.

## The credentials (one per person, the older way)

Each opens once in Flogic with its setup code. Then the person picks their own passphrase. Both expire 2026-12-31.

| File | Person | Group | Setup code |
|---|---|---|---|
| `fernando.flogic-id` | Fernando G (`u-0001`) | Service Desk | `33SGG-U36AP-J8NVJ` |
| `dj.flogic-id` | DJ (`u-0002`) | Change Team | `WMD8C-HJXHW-4QXHS` |

## The data packs

| File | Holds | For |
|---|---|---|
| `demo_incident.flogic` | `demo_incident.csv` (2,400 rows) | Service Desk |
| `demo_change_request.flogic` | `demo_change_request.csv` (450 rows) | Change Team |

So Fernando G opens `demo_incident.flogic`, and DJ opens `demo_change_request.flogic`. Each one's other pack says
*"This pack is for ... You're not in that group."*
