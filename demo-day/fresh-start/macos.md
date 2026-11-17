# Fresh start on macOS

> **Not yet run on a Mac.** These commands use standard macOS paths and were written from the Windows run that
> worked on 16 Nov. Read each one before pressing Return. `wipe.html` itself was tested.
> Run everything in **Terminal**, from the repo folder (`cd` into it first).

## 1. Get the app and the practice data

```sh
git clone https://github.com/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic.git
cd icstars-rfp-molson-cycle21-flogic
git switch presentation/demo-sheet

python3 tests/make-tickets.py ~/flogic-demo        # incident.csv (25,000 made-up rows), change_request.csv, expected.json
cp demo-day/demo-checks.json ~/flogic-demo/
```

`python3` comes with the Xcode command-line tools (`xcode-select --install` if it's missing).

## 2. Clear what the app remembers

**Easy way:** open `demo-day/fresh-start/wipe.html` in Chrome or Edge and press the button:

```sh
open -a "Google Chrome" demo-day/fresh-start/wipe.html      # or: open -a "Microsoft Edge" ...
```

**With the browser closed** (the same page, run headless; it saves a picture of the result):

```sh
osascript -e 'quit app "Google Chrome"'; sleep 2; pgrep -x "Google Chrome" || echo "Chrome is closed"

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome" --profile-directory=Default \
  --timeout=6000 --window-size=1100,300 --screenshot="$HOME/Desktop/flogic-wipe.png" \
  "file://$PWD/demo-day/fresh-start/wipe.html#wipe"

open ~/Desktop/flogic-wipe.png        # must say: Flogic has nothing stored in this browser
```

For Edge, use `"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"` and
`--user-data-dir="$HOME/Library/Application Support/Microsoft Edge"`.
If you use a profile other than the first one, change `Default` to `Profile 1`, `Profile 2`, and so on.

**Don't** delete the browser's whole `IndexedDB/file__0.indexeddb.leveldb` folder: every page you open from disk
shares it. The page clears only Flogic's three databases.

## 3. Find what the IT console saved

```sh
find ~/Downloads ~/Desktop ~/Documents -maxdepth 4 \
  \( -name "*.flogic-keyring" -o -name "*.flogic-key" -o -name "*.flogic" -o -name "*.flogic-id" \
     -o -name "flogic-keyring.stamp" -o -name "it-signerI.js" \) 2>/dev/null
```

What each file is: see [README.md](README.md).

## 4. Only for a full App + IT fresh start: move the IT files to a backup

```sh
B=~/Desktop/flogic-backup-$(date +%Y-%m-%d-%H%M); mkdir -p "$B"
mv ~/Downloads/*.flogic-keyring ~/Downloads/it-signerI.js ~/Downloads/*.flogic "$B"/ 2>/dev/null
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

The desktop app (Flogic.exe) is Windows only. There is no Mac build to clear.
