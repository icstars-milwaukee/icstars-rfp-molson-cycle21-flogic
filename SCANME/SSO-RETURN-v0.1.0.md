# SSO-style sign-in: return (v0.1.0)

Copy this file to `SCANME/returns/SSO-RETURN-v0.1.0-<date>.md` and fill it in. Keep the headings. Write "not done" or
"not sure" rather than leaving a section empty. Plain words; DJ's agent builds from this alone.

**From:** Fernando's agent
**Date:**
**Branch and last commit:** `sso-draft` @
**Task:** S1, from `SCANME/SSO-PERMISSION-v0.1.0.md`
**Status:** done / partly done / blocked

---

## 1. What you built, and how to run it

- Folder:
- Files, one line each:
- How to open it (path, browser, anything to click first):
- Demo passphrase, codes and sample files (made-up data only):

## 2. The sign-in flow

Number every step. Say who does it (IT or the person), what they do, and what the app checks.

1.
2.
3.

Include: how a session starts, and each way it ends (Lock, timer, expiry).

## 3. The new file formats

For each new file type: its name, its version marker, a byte-for-byte or field-for-field description, and **one real
example** (made-up data).

### 3.1

## 4. The crypto

| Question | Answer |
|---|---|
| What is signed (which fields, in what order)? | |
| Algorithm and key size | |
| Where does IT's private key live, and how is it protected? | |
| Where does the app get IT's public key, and what stops someone swapping it? | |
| What is checked, and where (IT console, app, both)? | |
| What does a tampered name, group or date do? | |
| Anything stored in the browser (list every item, or "nothing")? | |

## 5. What you reused from `VaultCore`, and what you'd need added

| Function / format | Used how | Changed? |
|---|---|---|
| | | |

New functions you would want in `DIRECTORY/vaultcoreI.js`, with their inputs and outputs:

## 6. The honest limits

What you found, in plain words. Say what **happens** in each case, not what should.

| Case | What happens | Good enough for the demo? |
|---|---|---|
| Expired assertion | | |
| An assertion copied to another laptop | | |
| A swapped or edited group | | |
| A person IT wants to cut off before the expiry date | | |
| Wrong passphrase, many times | | |
| The app's copy of IT's public key replaced | | |

Words to use for this in the app and the pitch (never "SSO"):

## 7. REQUESTS for DJ's agent

Exactly what has to change in `DIRECTORY/`, file by file. Say where (function or section), what it does, and the edge
cases. Number them.

| # | File | Change | Why |
|---|---|---|---|
| 1 | `DIRECTORY/vaultcoreI.js` | | |
| 2 | `DIRECTORY/vaultI.js` | | |
| 3 | `DIRECTORY/vaultI.css` | | |
| 4 | `DIRECTORY/testI.html` | | |
| 5 | `it-console/` | | |

What the unlock card should look and say like (describe or sketch):

What changes for a person who already set up with a setup code (does the old way keep working?):

## 8. Tests

- Command(s) to run:
- Result (passed / total):
- What each group of tests proves:
- What isn't tested:

## 9. Rough edges and what you'd do differently

- Still rough:
- Would do differently:
- Questions for DJ and Fernando (decisions, not for the agents):

## 10. Suggested changelog entry

Written for people, not code. Only what works.

**New**
-

**Known limits**
-
