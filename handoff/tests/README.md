# Real-input tests for the app

These drive the real page in headless Edge, or the real desktop window, through the DevTools protocol. Clicks and keys go through `Input.dispatchMouseEvent` / `dispatchKeyEvent`, which hit-test like a real mouse. Nothing is set with code. They need only Node 22+ (its built-in `WebSocket`) and Edge, and no Playwright.

**Use only made-up data.** The class rule is that real client rows never go to AI tools, so never point these at the client's ServiceNow exports. Make the data first:

```
py -3.12 -I make-tickets.py C:\temp\fake            # incident.csv (25,000 made-up rows), change_request.csv, expected.json
py -3.12 -I make-negatives.py C:\temp\fake\negatives.xlsx
```

`expected.json` holds the true answers, counted in Python. The Checks test compares the app's answers with it.

| Test | What it proves | Run |
|---|---|---|
| `stations-test.mjs` | Start on the Sheet; a new file lands on the simplified Dashboard; tabs, ← →, Alt+1/2/3 and Back; Big view ▸; the ▲ ▼ ticket rail; a tile row turns to the Sheet; focus mode from the Dashboard; nothing turned at rest | `node stations-test.mjs <page> C:\temp\fake\incident.csv <out>` |
| `drawer-test.mjs` | The Details drawer opens on screen (scrolled, in focus mode, under the title bar); Go to row's corner; Expand is gone | `node drawer-test.mjs <page> C:\temp\fake\incident.csv <out> 1366 640` |
| `checks-test.mjs` | Checks: the suggested list, Run all against `expected.json`, Show ▸, typed checks, a broken check, Save/Load, a hostile file, one panel at a time | `node checks-test.mjs <page> C:\temp\fake\incident.csv <out>` |
| `excel-test.mjs` | Excel cells like `-5` and `=SUM(…)` show as they are (the `csvCell` clash) | `node excel-test.mjs <page> C:\temp\fake\negatives.xlsx <profile dir>` |
| `usability-audit.mjs` | Prints click-target sizes, text contrast (both themes), keyboard focus, whether the drawer covers the clicked cell. A report to read, not pass/fail | `node usability-audit.mjs <page> C:\temp\fake\incident.csv <out>` |

- **`<page>`** is `C:/…/DataPage/flogic.html` for Edge. For the desktop sweep build, the stations test and the drawer test take `exe:C:/…/desktop/target/shared/sweep-staff.exe` instead.
- **Results:** each test prints PASS/FAIL lines and ends with `ALL PASS` or `N FAILED`. Screenshots go in `<out>`.
- **Cleanup:** each test stops only the Edge or app process it started, by its process id.
- **The code is rough, the tests too.** A failure can be the test's fault: read the failing line and its numbers before changing the app. They have caught real bugs, though: the frozen Sheet after sign-in, the drawer opening off screen, and the Excel `'-5`.
