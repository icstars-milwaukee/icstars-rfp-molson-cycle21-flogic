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

## The credentials (one per person)

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
