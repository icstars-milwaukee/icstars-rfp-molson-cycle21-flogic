# Demo-day deck

A Reveal.js slideshow with a moving 24 fps backdrop: a **graffiti bridge at night** that fills up into a **pint of beer** (rising foam, bubbles that pop). Plain HTML, CSS and JS. No build step, no internet needed (Reveal.js is saved in `vendor/`).

**Open it:** double-click `index.html`. Press **F** for full screen.

## Keys

| Key | What it does |
|---|---|
| → / ← / Space | Next / previous slide (Reveal's usual keys; **?** lists them all) |
| **V** | Hide the slides and show only the art (free reign for the backdrop) |
| **M** | Pause / resume the backdrop's motion |
| **S** | Speaker view with notes (if it opens blank from a file, serve the folder: `npx http-server .` in the repo root, then open `/presentation/`) |
| **O** | Overview of all slides |

## How the backdrop follows the slides

Each slide says how full the glass is: `<section data-beer="0">` is the bridge, `data-beer="1"` is a full pint, `0.32` is a third of a glass (bridge above, beer below). The page turns to dark ink on amber when the glass is more than about 60% full. Going back drains it again.

The graffiti tags spray on once, the first time the bridge is on screen (about 20 seconds for all six), and stay.

## The live app slide

Slide 6 shows `../DataPage/flogic.html` in a frame. It loads only when you reach the slide. **Click the frame** to use the app (the arrow keys then belong to the app); press **Back to slides** under the frame, or the on-screen arrows, to return. Use made-up data only, never a real export.

## Changing things

| To change | Edit |
|---|---|
| Slide words, order, speaker notes | `index.html` (`<aside class="notes">` is the speaker notes) |
| Fonts, colours, card look | `deck.css` |
| Tag words, places, colours, spray speed | `TAGS`, `SPRAY_FRAMES` at the top of the graffiti part of `background.js` (colours must be 6 digits, like `#ff2e93`) |
| Frame rate | `FPS` at the top of `background.js` |
| Bubble count | `MAX_BUBBLES` in `background.js` |

## Good to know

- Everything is drawn on one 1600 x 900 canvas and scaled to the window, so it costs the same on any screen. A frame takes under 1 ms to draw on the test machine (budget is 41 ms).
- The picture is always shown whole. On a window that isn't 16:9 you get bars beside it, coloured to blend in.
- With the system's **reduce motion** setting on, nothing moves: you get the finished picture.
- `FlogicBG.stats()` in the browser console shows frames drawn and draw time, if a venue's computer struggles.
- This folder is not part of the Docker image (that holds only `DataPage/` and `it-console/`).
- Reveal.js 5.1.0, MIT licence (`vendor/reveal/LICENSE`).
