# Smart Search Toolkit: Reusable Code for Non-AI Semantic Search

**Status:** Plan only. No app code has been changed.
**Branch checked:** `Test-One` (files in `DIRECTORY/` as of 2026-10-25)
**Goal:** Search by meaning ("can't print" also finds "printer offline") **without** an AI model,
while keeping every rule in `local-security-recommendations.md`:

| Rule | Kept? |
|---|---|
| Memory only (no saving) | ✅ Everything is built fresh when a file opens |
| No network | ✅ |
| No outside libraries | ✅ Plain JavaScript, our own code |
| Runs from double-click (`file://`) | ✅ |

---

## 1. The idea: one object that points at code we already have

Instead of copying or moving functions, we make **one object** that gathers the useful
ones under short names. The original functions stay exactly where they are, so nothing
that already works can break.

```js
/*
    ==========================================================

        THE NANDO NOTES  -  searchI.js

        The SMART SEARCH toolkit.
        It doesn't copy anything:  it POINTS at helpers that already
        live in queryI.js and scriptI.js,  so search can use them
        under one roof.

    ==========================================================
*/

const SearchKit = {

    //  ---- From queryI.js:  words and typos ----
    pieces:   wordPieces,     //  text  ->  words, numbers, dates   (each with a .low copy)
    stems:    wordStems,      //  "scores"  ->  ["scores", "score"]
    distance: flexDistance,   //  "pritner" vs "printer"  ->  1   (letters to change)
    closest:  flexClosest,    //  the ONE closest word from a list,  or null if it's a tie
    key:      flexKey,        //  "Customer_ID"  ->  "customerid"
    loose:    flexLoose,      //  "  Shipped "  ->  "shipped"

    //  ---- From scriptI.js:  rows and cells ----
    cell:     cellAt,         //  one cell, any column:   cell(row, col)

    //  ---- From scriptI.js:  the loader (the pie circle) ----
    loading:  startLoading,   //  loading("Learning the words...")
    progress: setProgress,    //  progress(0.5)  =  halfway
    done:     finishLoading,

    //  ---- From scriptI.js:  show the results ----
    show:     showMatches     //  show(word, [row numbers])  ->  the window + the aimbot
};
```

### Where the object lives

A new file, `DIRECTORY/searchI.js`, loaded **last** in `testI.html`:

```html
<script src="xlsxI.js"></script>
<script src="sqlI.js"></script>
<script src="queryI.js"></script>
<script src="scriptI.js"></script>
<script src="searchI.js"></script>   <!--  new:  needs the 2 files above it  -->
```

It goes last because it points at functions in `queryI.js` and `scriptI.js`, and those
have to exist first. It's still a separate file from our own folder, so it fits the
planned security policy (`script-src 'self'`).

---

## 2. What each borrowed piece is for

| SearchKit name | Original | Where | Used for |
|---|---|---|---|
| `pieces` | `wordPieces(text)` | `queryI.js:5048` | Cutting a description and the search into words the same way |
| `stems` | `wordStems(w)` | `queryI.js:5065` | Word roots: "printers" matches "print" |
| `distance` | `flexDistance(a, b)` | `queryI.js:4009` | Typo tolerance: "pritner" is 1 letter from "printer" |
| `closest` | `flexClosest(word, names)` | `queryI.js:4024` | Fixing a typo against the tickets' own words, without wild guesses |
| `key` | `flexKey(name)` | `queryI.js` (just above `flexLoose`) | Finding a column loosely ("short description" = "Short_Description") |
| `loose` | `flexLoose(text)` | `queryI.js` (just above `flexDistance`) | Cleaning up spaces and capitals |
| `cell` | `cellAt(i, col)` | `scriptI.js:1029` | Reading the one column we search (like Short description) |
| `loading` / `progress` / `done` | `startLoading`, `setProgress`, `finishLoading` | `scriptI.js:3256–3284` | Showing the pie while the search index is built |
| `show` | `showMatches(wanted, list)` | `scriptI.js:2859` | Showing results with the existing window, counter, ◀ ▶ and Details |

### Shared pieces we read but don't wrap

These are top-level variables and settings in `scriptI.js`. The toolkit can read them
directly, because every script on the page shares them:

| Name | Where | Used for |
|---|---|---|
| `CHUNK_TIME` | `scriptI.js:103` | Doing big jobs in small bites so the page never freezes |
| `headerCells` | `scriptI.js:194` | The column names, to find "Short description" |
| `rowCount` | `scriptI.js:205` | How many rows to go through |
| `searchId` | `scriptI.js:238` | Quitting an old search when the user types again |

---

## 3. Watch out for

- **Use `cell` (`cellAt`), not `getCells`.** `getCells(i)` only returns the columns that are
  currently on screen (the sideways treadmill), so it would miss the column we search.
- **`stems` is basic.** It only handles `-s`, `-es`, `-d`, and `-ed`. Search would want a
  slightly bigger version (adding `-ing`, `-er`, `-ers`). Write it **as a new function in
  `searchI.js`**, not by changing `wordStems`, because the plain-words query reader depends on it.
- **Pointing, not copying.** If someone renames `flexDistance` in `queryI.js`, the toolkit
  breaks. A quick check at the top of `searchI.js` can catch that:

  ```js
  Object.entries(SearchKit).forEach(function ([name, fn]) {
      if (typeof fn !== 'function') console.warn('SearchKit: "' + name + '" is missing');
  });
  ```

---

## 4. What needs a small change (later, not now)

| Code | Where | Change needed |
|---|---|---|
| `paintMatches(box, text, query)` | `scriptI.js:3208` | Highlights **one** word. Smart search matches several ("can't", "unable", "failed"), so it needs to accept a list |
| `render()` matching | `scriptI.js:2823` | Keeps or drops rows. Smart search needs to **score and sort** them, best first |
| The narrowing trick | inside `render()` | Assumes typing more means fewer matches. Not true with synonyms, so smart search skips it |

---

## 5. What's new to write (later, not now)

| Piece | What it is |
|---|---|
| IT word dictionary | Words that mean the same thing: "can't" = "unable" = "won't" = "failed" |
| Better word roots | `-ing`, `-er`, `-ers`, on top of `stems` |
| BM25 ranking | The standard search-engine formula: rare words like "VPN" count more than "issue" |
| Column picker | Search one column, like Short description, instead of the whole row |
| Level 3: LSA (optional) | Learns which words go together from the tickets themselves |

---

## 6. Next steps

1. DJ and Fernando agree on this plan.
2. Build on a separate branch (like `fernando-gamboa-smart-search`), not on `Test-One` directly.
3. Test with **fake IT ticket descriptions** first, never the client's real data.
