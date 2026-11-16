# Demo-day deck

One screen: the live Flogic app sitting on a glass of beer full of **bubbles that rise, sway and pop**, at 24 frames a second. No text, no pictures, nothing else. Plain HTML, CSS and JS; Reveal.js is saved in `vendor/`, so no internet is needed.

**Open it:** double-click `index.html`. Press **F** for full screen.

## Keys

| Key | What it does |
|---|---|
| **M** | Pause / resume the bubbles (click the bubbles beside the app first: while the app has the keyboard, keys go to it) |
| **F** | Full screen (Reveal's own) |

The app in the frame is the real `../DataPage/flogic.html`: click it and use it. Use made-up data only, never a real export.

## Changing things

| To change | Edit |
|---|---|
| Add slides (arrow keys move between them) | another `<section>` in `index.html` |
| Beer colour | the `amber` gradient in `background.js` (and `html` in `deck.css`, for any bars at the edge) |
| Bubble count, frame rate | `MAX_BUBBLES`, `FPS` at the top of `background.js` |

## Good to know

- Everything is drawn on one 1600 x 900 canvas and scaled to the window, so it costs the same on any screen. The picture is always shown whole; a window that isn't 16:9 gets beer-coloured bars.
- With the system's **reduce motion** setting on, nothing moves.
- `FlogicBG.stats()` in the browser console shows frames drawn and draw time, if a venue's computer struggles.
- This folder is not part of the Docker image (that holds only `DataPage/` and `it-console/`).
- Reveal.js 5.1.0, MIT licence (`vendor/reveal/LICENSE`).
