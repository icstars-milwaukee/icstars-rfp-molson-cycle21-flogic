# Fresh start on Linux

> **Not yet run on Linux.** These commands use the usual paths and were written from the Windows run that worked
> on 16 Nov. Read each one before pressing Enter. `wipe.html` itself was tested.
> Run everything in a terminal, from the repo folder (`cd` into it first).

## 1. Get the app and the practice data

```sh
git clone https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic.git
cd icstars-rfp-molson-cycle21-flogic
git switch presentation/demo-sheet

python3 tests/make-tickets.py ~/flogic-demo        # incident.csv (25,000 made-up rows), change_request.csv, expected.json
cp demo-day/demo-checks.json ~/flogic-demo/
```

## 2. Clear what the app remembers

**Easy way:** open `demo-day/fresh-start/wipe.html` in Chrome, Chromium or Edge and press the button:

```sh
google-chrome demo-day/fresh-start/wipe.html        # or: chromium / microsoft-edge
```

**With the browser closed** (the same page, run headless; it saves a picture of the result):

```sh
pkill -x chrome; sleep 2; pgrep -x chrome || echo "Chrome is closed"

google-chrome --headless=new --disable-gpu --no-first-run \
  --user-data-dir="$HOME/.config/google-chrome" --profile-directory=Default \
  --timeout=6000 --window-size=1100,300 --screenshot="$HOME/flogic-wipe.png" \
  "file://$PWD/demo-day/fresh-start/wipe.html#wipe"

xdg-open ~/flogic-wipe.png            # must say: Flogic has nothing stored in this browser
```

| Browser | Command | `--user-data-dir` |
|---|---|---|
| Chrome | `google-chrome` | `$HOME/.config/google-chrome` |
| Chromium | `chromium` (or `chromium-browser`) | `$HOME/.config/chromium` (Snap: `$HOME/snap/chromium/common/chromium`) |
| Edge | `microsoft-edge` | `$HOME/.config/microsoft-edge` |
| Brave | `brave-browser` | `$HOME/.config/BraveSoftware/Brave-Browser` |

If you use a profile other than the first one, change `Default` to `Profile 1`, `Profile 2`, and so on.
A Flatpak or Snap browser keeps its files inside its sandbox and may not open a page from your home folder in
headless mode. Use the easy way there.

**Don't** delete the browser's whole `IndexedDB/file__0.indexeddb.leveldb` folder: every page you open from disk
shares it. The page clears only Flogic's three databases.

## 3. Find what the IT console saved

```sh
find ~/Downloads ~/Desktop ~/Documents -maxdepth 4 \
  \( -name "*.flogic-keyring" -o -name "*.flogic-key" -o -name "*.flogic" -o -name "*.flogic-id" \
     -o -name "flogic-keyring.stamp" -o -name "it-signerI.js" \) 2>/dev/null
```

What each file is: see [README.md](README.md). Your Downloads folder may have another name:
`xdg-user-dir DOWNLOAD` prints it.

## 4. Only for a full App + IT fresh start: move the IT files to a backup

```sh
B=~/flogic-backup-$(date +%Y-%m-%d-%H%M); mkdir -p "$B"
D=$(xdg-user-dir DOWNLOAD 2>/dev/null || echo ~/Downloads)
mv "$D"/*.flogic-keyring "$D"/it-signerI.js "$D"/*.flogic "$B"/ 2>/dev/null
mv ~/flogic-demo-drive "$B"/drive 2>/dev/null       # IT's folder: change the path to yours
cp DataPage/it-signerI.js "$B"/it-signerI.js.app-copy
git checkout -- DataPage/it-signerI.js              # the blank trust file: key-file sign-in is OFF until IT makes a new one
ls -la "$B"
```

Then in the IT console: **New keyring** → groups → people → **3 · IT's Flogic folder** → packs → key files →
**Signing key → Download the app's trust file** → copy it over `DataPage/it-signerI.js`.

## 5. Check it's fresh

1. Open `DataPage/flogic.html`: the card offers **Connect your Flogic folder** and **Open a plain file without
   signing in**, with no names.
2. Open `~/flogic-demo/incident.csv` → **Checks** → **Load** `demo-checks.json` → **Run all**:
   **4 passed · 2 failed**.

The desktop app (Flogic.exe) is Windows only. There is no Linux build to clear.
