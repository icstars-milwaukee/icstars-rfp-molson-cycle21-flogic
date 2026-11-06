# The Flogic IT console

This page plays **Molson IT** for the Flogic demo. IT uses it to:

- make **access groups** (like *Service Desk* or *Change Team*), each with its own key and rules
- **pack** a data file for one group, so only that group's people can open it
- make each person's **credential file** and **setup code**, so they can sign in to Flogic

It's a stand-in for what a real identity system (like Microsoft Entra ID) would do. It's never given to users, and it
never ships inside the app's `DIRECTORY/` folder.

**It works offline in Chrome or Edge.** Open `it-console.html` straight from the folder (double-click it). It uses no
network, no outside code and no internet fonts, and it saves nothing in the browser. Everything it makes is a file you
download.

---

## The words

| Word | What it is |
|---|---|
| **Keyring** (`.flogic-keyring`) | IT's own file: the groups, their keys, and the list of who has a credential. It's locked with the **IT passphrase**. |
| **Group** | A team that shares access. Each group has one key and two rules: whether it can **export**, and the most minutes Flogic can sit idle before it **locks** itself. |
| **Data pack** (`.flogic`) | A data file (`.csv`, `.xlsx` or `.sql`), locked with one group's key. |
| **Credential** (`.flogic-id`) | A person's "badge": their groups' keys, locked with a setup code. |
| **Setup code** | 15 letters and numbers, like `7KQ4M-X9WTC-PR2HD`. The person types it once in Flogic to open their credential, then picks their own passphrase. |

---

## Step by step

### 1. Open the keyring (or make one)

- **The first time:** under **New keyring**, pick an IT passphrase (at least 12 characters, or 4 words) and type it
  twice. Then make your groups (step 2) and **Save keyring**.
- **Every time after that:** under **Open keyring**, pick the keyring file and type the IT passphrase. A wrong
  passphrase says so and shows nothing.

**Save keyring** downloads the keyring again. Do it after every change: an **unsaved changes** mark shows until
you do. (Your browser may name the new download `it (1).flogic-keyring`.) Keep the newest copy, and delete the older ones.

> ⚠ **Nothing can get back a lost IT passphrase or a lost keyring file.** Without them, the groups' keys are gone, so
> you'd have to make new groups, pack every file again, and give everyone a new credential. Keep the keyring somewhere
> safe and backed up, and keep the passphrase somewhere else.

### 2. Make the groups

Under **Groups**, type a name, like *Service Desk*. The **id** (`service-desk`) fills itself in. You can change it
before you click **Make group**, but never after. Then pick the rules:

- **Can export:** whether this group can save a report or rows out of Flogic. It starts ticked. Untick it for groups
  that should only look.
- **Auto-lock:** the most idle minutes (1–240) before Flogic locks itself. People can pick a shorter time, but never a
  longer one.

**Edit** changes a group's name and rules. People who already have a credential keep the old name and rules until you
give them a new one.

### 3. Pack a data file

Under **Pack a file**, pick the file and the group, then click **Pack**. You get `<name>.flogic` (for example
`incident.csv` becomes `incident.flogic`), and the console shows the size before and after. Share the pack any way you
like: without the group's key it can't be opened.

Anyone can still see *which group* a pack is for and the original file's name, but not what's inside.

### 4. Give a person a credential

Under **People**, type their name, tick their groups (at least one), and check the expiry date (it starts at Dec 31 of
this year). Then click **Make credential**:

1. Their credential file downloads, named after their first name: `fernando.flogic-id`.
2. Their **setup code** shows **once**, in big letters. **Give it to the person in person or over Teams, never in the
   same email as the file.** Then click **I've handed it over. Hide it.**
3. They're added to the keyring's list of people. **Save the keyring.**

The setup code isn't saved anywhere, not even in the keyring. If it's lost before the person uses it, just make them a
new credential.

### 5. Lock

**🔒 Lock** forgets everything on the page: the keys, the passphrase, the lists, and any setup code on screen. Closing
the tab does the same. If there are unsaved changes, the first click warns you and the second one locks.

---

## What IT should know (the hard truths)

This is a prototype, so these limits are real:

- **The setup code is one-time only by habit.** Nothing stops someone from using the same code twice, because there's
  no server to remember it was used. Treat each code like a one-time password anyway.
- **Taking access away isn't built yet.** Someone with a credential can open any pack made with their group's key, even
  after they leave the keyring's list. Really removing them means a new key for the group and packing the files again
  ("key rotation"), which the console doesn't do yet.
- **Export and expiry are polite rules, not locks.** Flogic follows them, but someone who knows the browser's developer
  tools could skip them. The locks that are real are the group keys: without a group's key, its packs can't be opened.
  That's math, not a setting.
- **An exported file is a plain file**, on purpose. Once someone exports a report, share it like any work document.
- **Lock takes the keys off the page**, but the browser frees its memory when it chooses. Don't claim it "wipes" anything.
- **A pack's label isn't secret:** its group and file name can be read without a key.

**What can honestly be said:** Flogic never saves data in the browser (it keeps only locked keys), this console saves
nothing in the browser at all, and nothing goes over the network.

---

## The demo set

`demo-data/packs/` holds a ready-made keyring, two packs, two credentials, and a README with the demo passphrase and
codes. **Everything there is made up**, which is the only reason the codes can be written down. It's made by:

```text
node it-console/make-demo-set.mjs
```

Running it again makes new keys and codes for all of it, and anyone who already set up with the old files has to set up
again.

## Tests

```text
node it-console/run-console-test.mjs
```

This runs `console-test.html` in a headless Chrome (or Edge), opened as `file://`. It tests the keyring, groups, packing,
credentials and the demo set, both in code and by clicking through the real page. It also checks that the console uses
no network, no browser storage and no `innerHTML`.

| File | What |
|---|---|
| `it-console.html` | The page |
| `itconsoleI.js` | Its brain (the locks and keys themselves are in `../DIRECTORY/vaultcoreI.js`) |
| `itconsoleI.css` | Its look: light, with a dark mode that follows the computer's setting |
| `console-test.html`, `run-console-test.mjs` | The tests |
| `make-demo-set.mjs` | Makes `demo-data/packs/` |
