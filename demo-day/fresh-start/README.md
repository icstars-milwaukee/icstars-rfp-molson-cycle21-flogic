# Fresh start: clearing a device before a demo

Pick your system: **[macOS](macos.md)** · **[Linux](linux.md)** · Windows: the sheet's **Reset** tab
(`demo-day/demo-sheet.html`).

## The fastest way, on any system

Double-click **[`wipe.html`](wipe.html)** in this folder (open it in the same browser you use for the app) and press
**Clear Flogic from this browser**. It shows who is remembered first, and clears only Flogic's own storage.
Then open `DataPage/flogic.html`: the sign-in card should list no names.

- Works in **Chrome, Edge, Brave, Chromium**: a page opened from disk shares storage with the app there.
- In **Firefox or Safari** it can't see the app's storage. Open the app's tab, open the console, and paste:

```
Promise.all(['flogic-filekey','flogic-mailbox','flogic-vault'].map(n => new Promise(r => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }))).then(() => location.reload())
```

  (Sign-in with a drive folder needs Chrome or Edge anyway: Firefox and Safari have no folder picker.)

## What Flogic keeps, and where

**In the browser (the staff app):** three small databases, nothing else (no cookies, no localStorage):

| Database | Holds |
|---|---|
| `flogic-filekey` | each person who signed in on this device: IT's signed claims and their keys, **locked with their PIN** |
| `flogic-mailbox` | which drive folder was picked (a browser handle, not a path) |
| `flogic-vault` | the older credential-file way |

Never data, never a PIN, never an unlocked key. Closing the tab leaves nothing of an opened file behind.

**The IT console keeps nothing in the browser.** Everything it makes is either downloaded or written into IT's
folder:

| What | File name | Where it goes |
|---|---|---|
| The keyring (people, groups, the signing key, locked with IT's passphrase) | `it.flogic-keyring` (or the name it was opened from) | your browser's **Downloads** folder, on every **Save keyring** |
| The app's trust file | `it-signerI.js` | **Downloads**. You copy it over `DataPage/it-signerI.js` yourself |
| A person's key file | `flogic.flogic-key` | **IT's folder**`/u-0001/` (one subfolder per person) when the folder is connected; otherwise **Downloads** |
| The "newest save" marker | `flogic-keyring.stamp` | **IT's folder**, next to the `u-000X` subfolders |
| Data packs | `<name>.flogic` | **IT's folder**`/packs/<group id>/` when connected; otherwise **Downloads** |
| Older-way credentials | `<name>.flogic-id` | **Downloads** |

"IT's folder" is whatever folder you picked under **3 · IT's Flogic folder** in the console. Each person is given
their own `u-000X` subfolder through the shared drive.

## What a full fresh start means

| Level | What you clear | What you redo |
|---|---|---|
| **App only** (usual) | the browser's Flogic storage (`wipe.html`) | each person signs in again with their key file and picks a PIN |
| **App + IT** | also the keyring, IT's folder and the trust file | everything: new keyring, groups, people, packs, key files, trust file |

**Before an App + IT reset, move the old files into a backup folder instead of deleting them.** A keyring
can't be recovered, and every key file it made only works with *its* trust file.

The practice data never needs clearing. It is made fresh, and identical, by `tests/make-tickets.py`.
