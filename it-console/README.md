# The Flogic IT console

This page plays **Molson IT** for the Flogic demo. IT uses it to decide **who can open which data, what they may do
with it, and for how long**:

- make **access groups** (like *Service Desk* or *Change Team*): each has its own key and rules
- give each person an **access level** (Guest, Viewer, Analyst): what they may do with the data they can open
- make each person's **key file** and put it in their drive folder, then **renew** it
- **pack** a data file for one group, so only that group's people can open it
- see all of it on one screen: who has what, until when, and what needs doing today

It's a stand-in for what a real identity system (like Microsoft Entra ID) would do. It's never given to users.

**It works offline in Chrome or Edge.** Open `it-console.html` straight from the folder (double-click it). It uses no
network and no outside code. It looks like the app (same glass cards, same two themes), and the chip at the top right
switches between Neo-Neutral and Neo-Dark.

---

## The words

| Word | What it is |
|---|---|
| **Keyring** (`.flogic-keyring`) | IT's own file: the groups and their keys, the people, IT's signing key, and the list of what was packed. Locked with the **IT passphrase**. |
| **Group** | **Which data.** A team that shares a key. Two rules: whether it can **export**, and the most idle minutes before Flogic **locks**. |
| **Access level** | **What you may do with it.** Guest, Viewer or Analyst. Built into the app (`DIRECTORY/policyI.js`); it can't be changed from a screen. |
| **Key file** (`flogic.flogic-key`) | A person's sign-in. It holds their group keys and is signed by IT. It lasts days, not months. |
| **Signing key** | What IT signs key files with. It lives inside the keyring. The app carries its public half in `DIRECTORY/it-signerI.js` (the **trust file**). |
| **Review** | Every 30 days IT confirms a person still needs access (**Still needed**). Without it, no new key file. |
| **Data pack** (`.flogic`) | A data file (`.csv`, `.xlsx` or `.sql`), locked with one group's key. |

When a group and a level disagree, **the stricter one wins**. A Viewer in a group that can export still can't export.

## The access levels

| Level | For | Export | Auto-lock | Key file lasts | Renewed | Groups | The app opens with |
|---|---|---|---|---|---|---|---|
| **Guest** | a visitor, contractor or trainee who needs a look for a day | No | 5 min at most | 1 day | by name, each time | 1 at most | a short summary (3 tiles) |
| **Viewer** | someone who reads the numbers but doesn't take data out | No | 10 min at most | 7 days | with "Renew everyone" | any number | the full dashboard |
| **Analyst** | someone who works the data and hands reports to others | Yes, where the group allows it | 30 min at most | 7 days | with "Renew everyone" | any number | the full dashboard |

## The rules that are built in

These are in `DIRECTORY/policyI.js`, which both this console and the app load. Nobody can change them from a screen.

1. **Short access.** A key file lasts 7 days at most (a Guest's: 1 day).
2. **Renewal.** Access carries on only because IT renews it. Every 30 days IT has to click **Still needed** for each
   person. After that, the console won't make them a key file.
3. **Levels are enforced by the app too.** The app checks every key file at every sign-in. One that lasts too long, was
   made after the review ran out, or gives more than its level allows is refused, **even if IT's own key signed it**.

---

## Step by step

### 1. Open the keyring (or make one)

- **The first time:** under **New keyring**, pick an IT passphrase (at least 12 characters, or 4 words) and type it
  twice. The new keyring comes with its own signing key. Go to **Signing key** → **Download the app's trust file**, and
  put that `it-signerI.js` in the app's `DIRECTORY/` folder. Until you do, the top of the page warns that the app next to
  the console trusts a different key.
- **Every time after that:** under **Open keyring**, pick the keyring file and type the IT passphrase.

**Save keyring** downloads the keyring again. Do it after every change: an **unsaved changes** mark shows until you do.

> ⚠ **Nothing can get back a lost IT passphrase or a lost keyring file.** Without them, the groups' keys and the signing
> key are gone: new groups, every file packed again, a new trust file in every copy of the app, and a new key file for
> everyone.

### 2. Make the groups

Under **Groups**, type a name, like *Service Desk*. The **id** fills itself in and can never change. Pick whether the
group **can export**, and its **auto-lock** minutes (1–240).

### 3. Add people

Under **People**: a name, an **access level**, their groups, and (only if you know it) their **last day**. A new person
starts at Guest until you pick otherwise. Adding someone counts as their first review.

### 4. Give them a key file

The **Access** section at the top lists everyone: level, groups, key file, review, last day.

- **Connect IT's Flogic folder** once: one folder in OneDrive, Google Drive or a share, with a subfolder per person
  (named by their id, like `u-0001`). **Share each subfolder with that person only.**
- **Make key file** writes `u-0001/flogic.flogic-key` into the folder. How long it lasts isn't a choice: the level
  decides. With no folder connected, the file downloads instead, for you to put there. **Never email a key file.**
- **Renew everyone** makes a fresh key file for everyone whose review is in date. Guests are left out on purpose:
  renew them by name.
- **Still needed** is the 30-day review. **End access** stops their key files (two clicks). **Edit** changes their
  level, groups or last day; it reaches them with their next key file.

The few lines at the top of **Access** say what needs doing today: reviews run out, key files about to end, people
with no key file yet.

### 5. Pack a data file

Under **Data packs**, pick the file and the group, then click **Pack**. You get `<name>.flogic`. The keyring remembers
what was packed for which group (name, size and day only, never the data), and **Which data is for whom** shows it
next to the group's people.

### 6. Lock

**🔒 Lock** forgets everything on the page. With unsaved changes, the first click warns and the second one locks.

---

## What IT should know (the hard truths)

- **The key file is the login.** Whoever gets a copy can sign in until its end date, after choosing their own PIN. The
  drive account (with MFA) is what guards it. That's why key files are short.
- **Access can't be taken back early.** **End access** stops new key files. The one the person holds works until its
  end date: 7 days at most, 1 for a Guest. The console says this before it ends anyone's access.
- **On a laptop where the drive folder syncs, the key file is a file on that laptop.** The app itself keeps nothing
  readable (see the test below), but the synced folder does. The computer's own lock screen and the drive's MFA are the
  real protection there.
- **Export, auto-lock and the dashboard view are polite rules.** The app follows them, but someone with the browser's
  developer tools could skip them. What can't be skipped: without a group's key its packs don't open, and a key file
  that breaks the built-in rules isn't accepted.
- **A group's key never changes.** Someone who once held a key file keeps the group key inside it. Really cutting them
  off from old packs means a new group key and packing again ("key rotation"), which the console doesn't do yet.
- **Whoever can change the app's files can change whom it trusts** (`it-signerI.js`) and what the rules are
  (`policyI.js`). Ship the app from a place only IT can write to.
- **The laptop's clock decides "ended".**
- **The older way** (a `.flogic-id` credential file and a setup code) is still there while
  `FlogicPolicy.ALLOW_LEGACY_CREDENTIALS` is `true`. It keeps whatever end date is typed, so it does **not** follow the
  short-access and review rules. Set the flag to `false` to turn it off in both the console and the app.

**What the console keeps in the browser:** only which folder was connected (a browser handle: no key, no names).
**Forget this folder** removes it. Nothing else is stored, and nothing goes over the network.

---

## The demo set

`demo-data/packs/` holds a ready-made keyring (passphrase in its README), two packs and two older-style credentials.
**Everything there is made up.**

```text
node it-console/upgrade-demo-keyring.mjs     brings the demo keyring up to date, KEEPING its keys
                                             (run it again when the demo people's 30-day review runs out)
node it-console/make-demo-set.mjs            makes everything new: new keys, new setup codes
```

## Tests

```text
node it-console/run-console-test.mjs                           205 checks: the console's logic and its real page
node sso-draft/run-node-test.mjs                                71: key files and the built-in rules
node sso-draft/run-browser-test.mjs app-signin-test.html        50: the real app, signed in with a key file
node sso-draft/run-browser-test.mjs folder-real-test.html       35: this console and the person's page on real folder handles
```

| File | What |
|---|---|
| `it-console.html` | The page |
| `itconsoleI.js` | Its brain. The locks, key files and rules are in `../DIRECTORY/` (`vaultcoreI.js`, `signincoreI.js`, `policyI.js`, `mailboxI.js`) |
| `itconsoleI.css` | Its look: the app's own colors and glass, in both themes |
| `console-test.html`, `run-console-test.mjs` | The tests |
| `make-demo-set.mjs`, `upgrade-demo-keyring.mjs` | Make, or bring up to date, `demo-data/packs/` |
