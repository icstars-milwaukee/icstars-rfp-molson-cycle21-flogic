# Build the Hexagon + Floating Menu From Scratch

This is a **practice build**. No CSV reader, no extra stuff. Just the two pieces:

```text
   ⬢   ← a solid hexagon with a glowing outline  (the button)
  ┌──────────────────────┐
  │ THEME                │   ← a floating glass menu that pops out of it
  │ ⬢  Neo-Neutral    ✓  │   ← glowing name + check mark
  └──────────────────────┘
```

You'll build it **one layer at a time**, and look at it after every step. Every step has a **✅ Look** check, and lots of steps have a **🧪 Try it** where you break something on purpose to see WHY it's built that way. Do the Try-its. That's where the learning is.

When you're done, there are **challenges** at the bottom to build your own versions.

<br>

---

<br>

## Before you start: the 3 practice files

Inside this `Specificmds` folder, make 3 empty files:

| File | Nickname | Job |
|---|---|---|
| `hexpractice.html` | **the skeleton** | WHAT is on the page |
| `hexpractice.css` | **the clothes** | How it LOOKS |
| `hexpractice.js` | **the brain** | What it DOES |

**The order we build in:**

```text
  1. Skeleton + plain page   →   2. Hexagon   →   3. Brain   →   4. Menu clothes
```

> Why the brain BEFORE the menu's clothes? So you can open the menu and SEE it while you dress it.

**How to look at your work:** double-click `hexpractice.html` to open it in your browser. After every change, save, then press **F5** (refresh).

<br>

---

<br>

# PART 1: The Skeleton + The Plain Page

### Step 1.1: The skeleton

Type this into `hexpractice.html`:

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hexagon Practice</title>
    <link rel="stylesheet" href="hexpractice.css">
</head>

<body>

    <!-- The hexagon button -->
    <button id="themeHex" title="Theme: Neo-Neutral" aria-haspopup="true" aria-expanded="false" aria-controls="themeMenu">
        <span class="hex">
            <span class="hex-inner"></span>
        </span>
    </button>

    <!-- The floating menu (the brain fills in the list) -->
    <div id="themeMenu" role="menu" aria-label="Themes" hidden>
        <p class="menu-title">Theme</p>
        <div id="themeList"></div>
    </div>

    <!-- Something to look at, so the glass has something to blur -->
    <h1>Hexagon Practice</h1>
    <p class="filler">Click the hexagon in the top-left corner.</p>

    <script src="hexpractice.js"></script>

</body>
</html>
```

**The hexagon is a button with 2 boxes inside it:**

```text
   button#themeHex       ← holds the GLOW and the SHADOW     (never gets cut)
    └─ span.hex          ← the bright OUTLINE                (gets cut into a hexagon)
        └─ span.hex-inner    ← the solid COLOR               (gets cut into a hexagon, a little smaller)
```

Remember this picture. The whole hexagon is about **why there are 3 pieces instead of 1**.

| Word | Baby words |
|---|---|
| `<span>` | A plain box with no meaning. Just something to dress up. |
| `hidden` | Invisible for now. The brain takes it off to open the menu. |
| `aria-haspopup="true"` | Tells screen readers: "clicking me opens a menu." |
| `aria-expanded="false"` | Tells screen readers if the menu is open. The brain flips it to `"true"`. |
| `aria-controls="themeMenu"` | "The menu I open is the one called themeMenu." |
| `role="menu"` | Tells screen readers: "this is a menu." |

<br>

### Step 1.2: The theme colors + the plain page

Type this into `hexpractice.css`:

```css
/* ---------- THE THEME COLORS ---------- */

:root,
[data-theme="neo-neutral"] {
    --page:        #b8bcc3;                     /* the page */
    --text:        #1f2228;                     /* dark text */
    --text-soft:   #3b4048;                     /* quieter text */
    --theme-color: #4a5260;                     /* the theme's own color */
    --theme-glow:  rgba(165, 175, 190, 0.95);   /* the glow around it */
}


/* ---------- THE PAGE ---------- */

body {
    font-family: system-ui, Arial, sans-serif;
    background: var(--page);
    color: var(--text);
    margin: 0;
    padding: 20px 16px;
}

h1 {
    text-align: center;
    margin: 10px 0 20px;
}

.filler {
    text-align: center;
    color: var(--text-soft);
}


/* ---------- "HIDDEN" MEANS HIDDEN. ALWAYS. ---------- */

[hidden] {
    display: none !important;
}
```

**Colors with names:**

```text
  --page:  #b8bcc3;          ← make a name, give it a color   ("--" = a name I made up)
  background: var(--page);   ← use it somewhere else          ("var" = "go look up this name")
```

Everything that uses `var(--theme-color)` changes when you change that ONE line. You'll use this in the challenges.

<br>

### ✅ Look

Refresh. You should see:
- A grey page with "Hexagon Practice" in the middle
- A **tiny, flat, empty button** in the top-left corner (that's the hexagon, wearing nothing yet)

<br>

---

<br>

# PART 2: The Hexagon

### Step 2.1: Pin the box to the corner

Add this to the bottom of `hexpractice.css`:

```css
/* ---------- THE HEXAGON ---------- */

#themeHex {
    position: fixed;            /* glued to the screen */
    top: 24px;                  /* a little spaced down */
    left: 28px;                 /* a little spaced over */
    z-index: 10;                /* on top of everything */

    width: 50px;
    height: 58px;               /* a hexagon is a bit taller than it is wide */
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    cursor: pointer;
}
```

| Word | Baby words |
|---|---|
| `position: fixed` | Glued to the SCREEN. Scroll all you want, it stays put. |
| `top` / `left` | How far from the top / left edge of the screen. |
| `z-index: 10` | "Stack me on top." Bigger number = higher in the pile. |
| `padding: 0` ... `background: none` | Wipe off everything a button wears by default. A blank box. |

**Why 50 × 58?** A hexagon standing on its point is about **87%** as wide as it is tall. 58 × 0.87 ≈ 50.

### ✅ Look

The button... **disappeared!** That's right: we wiped off its clothes, and the spans inside have no color yet.

> 🧪 **Try it:** Add `outline: 2px dashed red;` inside `#themeHex`. Now you can see the invisible box. **This is the #1 trick for building stuff: make the invisible box visible.** Delete the line when you're done.

<br>

### Step 2.2: Paint the 2 layers (as plain boxes first)

Add this:

```css
/* Both layers get the scissors */
.hex,
.hex-inner {
    display: grid;
    place-items: center;        /* whatever's inside sits in the middle */
}

/* Layer 1: the bright outline */
.hex {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.92);
}

/* Layer 2: the solid theme color (4px smaller, so 2px of outline shows all around) */
.hex-inner {
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    background: var(--theme-color);
}
```

| Word | Baby words |
|---|---|
| `display: grid` + `place-items: center` | "Put whatever's inside me in the exact middle." |
| `width: 100%` | As wide as the box I'm inside. |
| `calc(100% - 4px)` | "All of it, minus 4 pixels." The clothes doing math. |

**The picture:**

```text
   ┌────────────┐   ← .hex       (white, the full 50 × 58)
   │┌──────────┐│
   ││  slate   ││   ← .hex-inner (4px smaller, sitting in the middle)
   │└──────────┘│
   └────────────┘   → so 2px of white peeks out on every side
```

### ✅ Look

A **slate rectangle with a thin white frame**. Not a hexagon yet. That's next.

<br>

### Step 2.3: The scissors ✂️

Go back to the `.hex, .hex-inner` rule and add the `clip-path` line, so it looks like this:

```css
/* Both layers get the scissors */
.hex,
.hex-inner {
    display: grid;
    place-items: center;        /* whatever's inside sits in the middle */
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
```

`clip-path` is **scissors**. You give it dots, it connects them, and throws away everything outside:

```text
                (50% 0)
                   •
     (0 25%)  •         •  (100% 25%)
              |         |
              |         |
     (0 75%)  •         •  (100% 75%)
                   •
                (50% 100%)
```

Each dot is `(across  down)`, in percent of the box. `50% 0` = halfway across, at the very top.

Because both layers get the same scissors, and the inside one is 4px smaller, you get a white hexagon with a slate hexagon inside: **an outline that follows the slanted sides.**

### ✅ Look

A **solid slate hexagon with a thin white outline**. 🎉

> 🧪 **Try it: why not just use `border`?** Temporarily change `.hex-inner` to `width: 100%; height: 100%;` and add `border: 2px solid white;`. Refresh. The outline is only on the **flat** parts. The scissors cut the border off the slanted sides! **That's why we stack 2 layers instead.** Put it back.

> 🧪 **Try it:** Change `4px` to `10px` in both `calc(...)` lines. Fat outline! Put it back.

<br>

### Step 2.4: The glow ✨

Add these lines inside `#themeHex`, right after `cursor: pointer;`:

```css
    /* 3 shapes stacked: a white rim glow, the theme's glow, then a floating shadow */
    filter:
        drop-shadow(0 0 2px rgba(255, 255, 255, 0.9))
        drop-shadow(0 0 8px var(--theme-glow))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
    transition: transform 0.35s ease, filter 0.35s ease;
```

**Two big ideas here:**

**1. A shadow that doesn't move IS a glow.**

```text
  drop-shadow( 0      6px     12px     black )
               ^^^    ^^^     ^^^^
               left/  up/     how
               right  down    blurry

  0 6px   →  pushed DOWN  →  looks like a shadow  (it's floating!)
  0 0     →  pushed NOWHERE  →  spreads out evenly on all sides  →  with a light color, it's a GLOW
```

We stack 3: a **tight white** one (hugs the outline), a **wide soft** one in the theme's glow color, then a **real shadow** underneath.

**2. Why the glow goes on the BUTTON, not the hexagon layers.**

The scissors cut off **everything** outside the dots, glows included. The button is never cut, so the glow lives there. And `drop-shadow` is smart: it glows around whatever you can **see**, not around the box. All you can see in the button is the hexagon, so the glow comes out **hexagon-shaped**.

### ✅ Look

The hexagon has a soft glowing halo and floats a little off the page.

> 🧪 **Try it: the scissors eat glows.** Cut the `filter: ...;` lines and paste them into `.hex` instead. Refresh. The glow is GONE (cut off by the scissors). Put it back.

> 🧪 **Try it: box-shadow vs drop-shadow.** In `#themeHex`, replace the whole `filter` with `box-shadow: 0 0 12px white;`. Refresh. A glowing **rectangle**! `box-shadow` follows the box. `drop-shadow` follows the shape. Put it back.

<br>

### Step 2.5: Hover, spin, and the keyboard ring

Add this:

```css
#themeHex:hover {
    transform: scale(1.07);
    filter:                     /* glow a little brighter */
        drop-shadow(0 0 3px #fff)
        drop-shadow(0 0 14px var(--theme-glow))
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
}

/* Menu open? Turn 1/6 of the way around. */
#themeHex[aria-expanded="true"] {
    transform: rotate(60deg);
}

/* The keyboard ring (when you Tab to it) */
#themeHex:focus-visible {
    outline: none;
    filter:
        drop-shadow(0 0 3px #fff)
        drop-shadow(0 0 4px #fff)
        drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
}
```

| Word | Baby words |
|---|---|
| `:hover` | "...while the mouse is on it." |
| `transform: scale(1.07)` | Grow 7% bigger. |
| `transform: rotate(60deg)` | Turn 60 degrees. |
| `[aria-expanded="true"]` | "...only while the menu is open." (The brain flips this in Part 3.) |
| `:focus-visible` | "...when someone reaches it with the **Tab** key." |
| `transition` (from Step 2.4) | Don't JUMP to the new look. **Slide** there, over 0.35 seconds. |

**Why 60 degrees?** A hexagon has 6 matching sides. 360 ÷ 6 = 60. Turn it 60° and it lands on **exactly the same outline**. So your eye sees it spin and "click" into place, but it never ends up crooked.

### ✅ Look

- Mouse on it → it grows a little and glows brighter, **smoothly**
- Press **Tab** → it gets a bright white ring
- The spin won't work yet. It needs the brain.

> 🧪 **Try it:** In `transition`, change `0.35s` to `2s`. Hover slowly. Now you can watch the glow grow. Put it back.

<br>

---

<br>

# PART 3: The Brain

The menu exists, but it's `hidden`. The brain's job: **open it, close it, and fill it with themes.**

Type all of this into `hexpractice.js`, in order.

<br>

### Step 3.1: The list of themes + find the pieces

```js
// ---------- THE LIST OF THEMES ----------

const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#4a5260', glow: 'rgba(165, 175, 190, 0.95)' },
];


// ---------- FIND THE PIECES ----------

const themeHex  = document.getElementById('themeHex');      // the hexagon button
const themeMenu = document.getElementById('themeMenu');     // the floating menu
const themeList = document.getElementById('themeList');     // the list inside it

let currentTheme = THEMES[0];                               // the default
```

| Word | Baby words |
|---|---|
| `[ ... ]` | A **list**. Right now it holds 1 theme. |
| `{ id: ..., name: ... }` | One thing with labeled parts. Like a little ID card. |
| `THEMES[0]` | The FIRST thing in the list. (Computers count from 0!) |
| `document.getElementById('themeHex')` | "Find the piece with the name tag `themeHex`." |

<br>

### Step 3.2: Open + close

```js
// ---------- OPEN + CLOSE ----------

function openThemeMenu() {
    themeMenu.hidden = false;
    themeHex.setAttribute('aria-expanded', 'true');
    themeList.querySelector('[aria-checked="true"]').focus();   // keyboard is ready to pick
}

function closeThemeMenu() {
    themeMenu.hidden = true;
    themeHex.setAttribute('aria-expanded', 'false');
}

// Click the hexagon → open. Click again → close.
themeHex.addEventListener('click', function () {
    if (themeMenu.hidden) {
        openThemeMenu();
    } else {
        closeThemeMenu();
    }
});

// Click somewhere that's NOT the menu or the hexagon → close.
document.addEventListener('click', function (event) {
    if (!themeMenu.hidden && !themeMenu.contains(event.target) && !themeHex.contains(event.target)) {
        closeThemeMenu();
    }
});

// Press Escape → close, and go back to the hexagon.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !themeMenu.hidden) {
        closeThemeMenu();
        themeHex.focus();
    }
});
```

**The neat part:** `setAttribute('aria-expanded', 'true')` does TWO jobs at once:
1. Tells screen readers "the menu is open."
2. Triggers the `#themeHex[aria-expanded="true"]` rule → **the spin!**

The brain never says "spin." It just flips a label, and the clothes react.

| Word | Baby words |
|---|---|
| `addEventListener('click', ...)` | "When this gets clicked, do this." |
| `event.target` | The exact thing that got clicked. |
| `.contains(event.target)` | "Was the click INSIDE this piece?" |
| `!` | "NOT." `!themeMenu.hidden` = "the menu is NOT hidden." |
| `&&` | "AND." All of them must be true. |
| `.focus()` | Move the keyboard to this piece, like you clicked into it. |

<br>

### Step 3.3: Build the list

```js
// ---------- BUILD THE LIST ----------

// One button per theme:    [⬢]  Neo-Neutral  ✓
function buildThemeList() {
    themeList.innerHTML = '';

    for (const theme of THEMES) {
        const option = document.createElement('button');
        option.className = 'theme-option';
        option.setAttribute('role', 'menuitemradio');
        option.setAttribute('aria-checked', theme === currentTheme);

        // Leave color notes for the clothes
        option.style.setProperty('--c', theme.color);
        option.style.setProperty('--c-glow', theme.glow);

        const swatch = document.createElement('span');
        swatch.className = 'theme-swatch';
        swatch.appendChild(document.createElement('span'));     // the solid color, inside the outline

        const name = document.createElement('span');
        name.className = 'theme-name';
        name.textContent = theme.name;

        const check = document.createElement('span');
        check.className = 'theme-check';
        check.textContent = '✓';

        option.append(swatch, name, check);

        option.addEventListener('click', function () {
            setTheme(theme);
            closeThemeMenu();
        });

        themeList.appendChild(option);
    }
}
```

**What one theme turns into:**

```html
<button class="theme-option" role="menuitemradio" aria-checked="true" style="--c: #4a5260; --c-glow: ...">
    <span class="theme-swatch"><span></span></span>    ← tiny hexagon (2 layers again!)
    <span class="theme-name">Neo-Neutral</span>
    <span class="theme-check">✓</span>
</button>
```

**The color-note trick:** `option.style.setProperty('--c', theme.color)` sticks a color name **on just this one button**. The clothes will say `color: var(--c)`, and each button finds its OWN color. One CSS rule, every theme in its own color.

| Word | Baby words |
|---|---|
| `for (const theme of THEMES)` | "Do this once for every theme in the list." |
| `document.createElement('button')` | Make a brand-new button (not on the page yet). |
| `theme === currentTheme` | "Is this the theme we're wearing?" → `true` or `false` |
| `option.append(a, b, c)` | Put a, b, and c inside the button, in that order. |
| `themeList.appendChild(option)` | NOW put it on the page. |

<br>

### Step 3.4: Put on a theme + start

```js
// ---------- PUT ON A THEME ----------

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme.id;      // <html data-theme="neo-neutral">
    themeHex.title = 'Theme: ' + theme.name;
    buildThemeList();                                       // move the check mark
}


// Start with the default.
setTheme(currentTheme);
```

**How the brain and the clothes talk:**

```text
   brain:    document.documentElement.dataset.theme = 'neo-neutral'
                          │
                          ▼
   page:     <html data-theme="neo-neutral">
                          │
                          ▼
   clothes:  [data-theme="neo-neutral"] { --page: ...; --theme-color: ...; }   ← "use THESE colors"
```

<br>

### ✅ Look

Refresh and click the hexagon:
- The hexagon **spins** 60° 🎉
- An **ugly** menu shows up: plain text, a plain grey button that says "Neo-Neutral ✓", no glass, maybe stuck behind the title.
- Click it again, click anywhere else, or press **Escape** → it goes away, the hexagon spins back.

**Ugly is correct!** It WORKS. Now we dress it.

> 🧪 **Try it:** Press **F12** → **Elements**. Open the menu and find `<div id="themeList">`. The brain built that button. It's not in your HTML file!

<br>

---

<br>

# PART 4: The Menu's Clothes

**The idea:** same glass as a calm glass window, but **turned UP** so your eye finds it first.

Leave the menu **open** while you work through this part (click the hexagon after each refresh).

<br>

### Step 4.1: Float it + make it glass

Add to the bottom of `hexpractice.css`:

```css
/* ---------- THE MENU ---------- */

#themeMenu {
    position: fixed;
    top: 94px;                  /* just under the hexagon */
    left: 20px;
    z-index: 10;
    min-width: 210px;
    padding: 10px 8px 8px;

    font-family: "Segoe UI", system-ui, Arial, sans-serif;

    background: linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.24));
    backdrop-filter: blur(16px) saturate(1.3);
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: 18px;
}
```

**Why `top: 94px`?** The hexagon starts at 24 and is 58 tall. 24 + 58 = 82. Plus a 12px gap = **94**.

**The glass recipe:**

| Line | What it does |
|---|---|
| `linear-gradient(135deg, whiter, clearer)` | A fade from top-left (more white) to bottom-right (more clear). **That fade is what makes it look like glass.** |
| `backdrop-filter: blur(16px)` | Frosts whatever is BEHIND it. |
| `saturate(1.3)` | Makes colors behind it 30% richer. Glass looks more alive. |
| `border: 1px solid` almost-white | A thin shiny edge. |
| `border-radius: 18px` | Round corners. |

### ✅ Look

Open the menu. It floats under the hexagon. Slide it over the title (change `left` to `200px` for a sec) and see the words go **frosty** behind it. Put it back.

<br>

### Step 4.2: The 4 shadows (this is most of the "pop")

Add this inside `#themeMenu`, after `border-radius`:

```css
    box-shadow:
        0 0 0 4px rgba(255, 255, 255, 0.25),            /* the ring */
        0 20px 50px rgba(0, 0, 0, 0.3),                 /* the lift */
        inset 0 1px 0 #fff,                             /* the top shine */
        inset 0 0 20px rgba(255, 255, 255, 0.35);       /* the inner glow */
```

`box-shadow` can take **many shadows at once**, split by commas. Each one has a job:

```text
   box-shadow:  0    0    0     4px    color
                ^^   ^^   ^^    ^^^
                left up   blur  SPREAD   ← how much BIGGER than the box
                     down
```

| # | Shadow | Baby words |
|---|---|---|
| 1 | `0 0 0 4px` | No move, **no blur**, 4px spread = a solid **ring** all around. Faint white = a halo. |
| 2 | `0 20px 50px` | Pushed way down, very blurry = the menu looks **high up**, close to you. |
| 3 | `inset 0 1px 0 #fff` | `inset` = drawn INSIDE. A 1px white line on the top inner edge = **light catching the glass**. |
| 4 | `inset 0 0 20px` | Blurry white all around the inside = glass **lit from within**. |

### ✅ Look

The menu has a soft ring around it and looks like it's floating way above the page.

> 🧪 **Try it:** Delete ONE shadow at a time (keep the commas right!) and refresh. Which one makes the biggest difference to you? Put them back.

<br>

### Step 4.3: The glowing line across the top

```css
/* The glowing line across the top */
#themeMenu::before {
    content: "";
    position: absolute;
    top: 0;
    left: 18px;
    right: 18px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, transparent, var(--theme-glow), transparent);
    box-shadow: 0 0 8px var(--theme-glow);
}
```

| Word | Baby words |
|---|---|
| `::before` | A **fake extra piece** the clothes make by themselves. No HTML needed! |
| `content: ""` | The fake piece has no words. **Without this line, it doesn't exist at all.** |
| `position: absolute` | Place it exactly, using `top`/`left`/`right`, inside the menu. |
| `left: 18px; right: 18px` | Stay 18px away from each side, so it clears the round corners. |
| `transparent → glow → transparent` | Brightest in the middle, fading out at the ends. Like a reflection. |

### ✅ Look

A thin glowing streak along the top edge of the menu.

> 🧪 **Try it:** Delete `content: "";`. The line vanishes. This is the #1 `::before` mistake. Put it back.

<br>

### Step 4.4: The pop-in

Add these 2 lines inside `#themeMenu`, after `box-shadow`:

```css
    transform-origin: 30px 0;   /* grow out from under the hexagon */
    animation: menu-pop 0.18s ease-out;
```

And this, outside of it:

```css
@keyframes menu-pop {
    from { opacity: 0; transform: translateY(-6px) scale(0.96); }
}
```

| Word | Baby words |
|---|---|
| `@keyframes menu-pop` | A little movie. We named it `menu-pop`. |
| `from { ... }` | Where the movie STARTS: invisible, 6px higher, 4% smaller. |
| (no `to`) | No ending given = **end on its normal look**. Handy! |
| `animation: menu-pop 0.18s ease-out` | Play `menu-pop`, take 0.18 seconds, start fast and slow down at the end. |
| `transform-origin: 30px 0` | Grow from **this spot** (top-left, right under the hexagon). So it looks like it comes OUT of the hexagon. |

**Why does it replay every time?** `hidden` makes the menu not exist on screen. Taking `hidden` off = it shows up fresh = the movie plays again. No brain code needed.

### ✅ Look

Open the menu. It **pops** out from under the hexagon.

> 🧪 **Try it:** Change `0.18s` to `2s`. Now you can watch it in slow motion. Then change `transform-origin` to `100% 100%` (bottom-right) and watch it grow from the wrong corner. See how much the origin matters? Put both back.

<br>

### Step 4.5: The title + the rows

```css
/* The little "THEME" word on top */
.menu-title {
    margin: 0 10px 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-soft);
}

/* One theme in the list */
.theme-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: none;
    text-align: left;
    font: inherit;
    font-size: 15px;
    cursor: pointer;
}

.theme-option:hover,
.theme-option:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.9);
}

/* The theme you're using right now */
.theme-option[aria-checked="true"] {
    background: rgba(255, 255, 255, 0.35);
}
```

| Word | Baby words |
|---|---|
| `letter-spacing: 0.12em` | Spread the letters apart a bit. Tiny + uppercase + spaced = a **label** look. |
| `text-transform: uppercase` | SHOW IT IN CAPITALS (even though the HTML says "Theme"). |
| `display: flex` | Line the things inside up **in a row**: swatch, name, check. |
| `gap: 10px` | 10px of space between each one. |
| `font: inherit` | Buttons ignore the page's font by default. This says "use the same font as my parent." |
| `border: 1px solid transparent` | An **invisible** border that's always there... |
| `border-color: ...` (on hover) | ...so on hover it can just turn white **without the row jumping by 1px**. |
| `[aria-checked="true"]` | The brain marks the current theme. The clothes make it a bit brighter. |

<br>

### Step 4.6: The tiny hexagon

```css
/* The tiny hexagon: same 2-layer trick, but no glow (too tiny) */
.theme-swatch,
.theme-swatch span {
    display: grid;
    place-items: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.theme-swatch {
    width: 16px;
    height: 18px;
    flex-shrink: 0;
    background: #fff;
}

.theme-swatch span {
    width: calc(100% - 3px);
    height: calc(100% - 3px);
    background: var(--c);
}
```

**This is Part 2 again, smaller!** Outer layer = white outline, inner layer = solid color, same scissors. `var(--c)` is the color note the brain left on this button.

`flex-shrink: 0` = "never squish me," even if the row gets tight.

**Why no glow?** At 16px, a glow just looks **blurry**. Small things get a crisp outline. Big things can glow.

<br>

### Step 4.7: The glowing name + the check mark

```css
/* The GLOWING name */
.theme-name {
    flex-grow: 1;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--c);
    text-shadow:
        0 0 2px #fff,                                   /* white rim, so the letters stay sharp */
        0 0 10px var(--c-glow),                         /* the colored glow */
        0 0 20px var(--c-glow);                         /* the glow fading out */
}

/* The check mark (only on the theme you're using) */
.theme-check {
    color: var(--c);
    visibility: hidden;
}

.theme-option[aria-checked="true"] .theme-check {
    visibility: visible;
}
```

**The glowing letters: the hexagon trick, for text.** `text-shadow` with `0 0` = a glow. A tight **white** one keeps the letters crisp, then two wide ones in the glow color spread light behind them.

| Word | Baby words |
|---|---|
| `flex-grow: 1` | "Take ALL the leftover room." Pushes the ✓ to the far right. |
| `visibility: hidden` | Invisible, but **still takes up its space**. (`display: none` would remove the space, and things would jump around.) |

<br>

### Step 4.8: Be nice to people who turned off motion

```css
/* ---------- TURNED OFF MOTION? ---------- */

@media (prefers-reduced-motion: reduce) {
    #themeHex  { transition: none; }
    #themeMenu { animation: none; }
}
```

Some people get dizzy from moving things and turn motion off on their computer. This says: "if they did, no spinning, no popping."

<br>

### ✅ Final look

Refresh. You should have:

- [ ] A **solid slate hexagon** with a **glowing white outline**, in the top-left corner
- [ ] Mouse on it → it grows and glows brighter, smoothly
- [ ] Click → it spins 60° and the menu **pops** out from under it
- [ ] The menu: bright frosty glass, a soft ring, a big shadow, a glowing line on top
- [ ] **Neo-Neutral** glowing, with a tiny outlined hexagon and a ✓
- [ ] Mouse on the row → it brightens and gets a white edge
- [ ] Click outside, click the hexagon, or press **Escape** → it closes
- [ ] **Tab** to the hexagon → bright ring. **Enter** → opens, and the keyboard is on Neo-Neutral

**You built it!** 🎉

<br>

---

<br>

## The tricks you just learned (cheat sheet)

| Trick | How | Used for |
|---|---|---|
| **Make the invisible box visible** | `outline: 2px dashed red;` | Seeing what you're building |
| **Any shape** | `clip-path: polygon(...)` | The hexagons |
| **Outline on a weird shape** | 2 stacked layers, inner one smaller, same scissors | The hexagon outlines |
| **Glow** | Any shadow with `0 0` (no move) + a light color | Hexagon, name, top line |
| **Glow that follows a shape** | `filter: drop-shadow(...)` on an **uncut** parent | The hexagon glow |
| **Ring around a box** | `box-shadow: 0 0 0 4px color` (spread, no blur) | The menu's halo |
| **Light inside glass** | `box-shadow: inset ...` | Top shine + inner glow |
| **Glass** | Fading white gradient + `backdrop-filter: blur()` | The menu |
| **Extra piece with no HTML** | `::before` + `content: ""` | The glowing top line |
| **Pop-in** | `@keyframes` with only a `from` | The menu appearing |
| **Grow from a spot** | `transform-origin` | Menu coming out of the hexagon |
| **One color per item** | Brain does `style.setProperty('--c', ...)`, clothes use `var(--c)` | Each theme in its own color |
| **Brain flips a label, clothes react** | `[aria-expanded="true"]`, `[aria-checked="true"]` | Spin, check mark |
| **Show/hide without jumping** | `visibility: hidden` / transparent border | Check mark, row hover |

<br>

---

<br>

## Challenges 🏆

Try each one yourself **first**. Stuck? Open the answer.

<br>

### Challenge 1: Move it to the top-RIGHT corner

The hexagon AND the menu should move, and the menu should still grow out from under the hexagon.

<details>
<summary>Hint</summary>

Swap `left` for `right` in two places. And `transform-origin` says "grow from the top-LEFT." Where should it grow from now?

</details>

<details>
<summary>Answer</summary>

In `#themeHex`: change `left: 28px;` → `right: 28px;`

In `#themeMenu`: change `left: 20px;` → `right: 20px;` and `transform-origin: 30px 0;` → `transform-origin: calc(100% - 30px) 0;`

</details>

<br>

### Challenge 2: Make it glow pink

Only change **one line**.

<details>
<summary>Answer</summary>

In the theme colors at the top: `--theme-glow: rgba(255, 90, 200, 0.9);`

The hexagon glow AND the menu's top line both change, because they both use `var(--theme-glow)`. That's the power of named colors.

</details>

<br>

### Challenge 3: An octagon instead (8 sides) 🛑

Hint: an octagon is a square with its 4 corners cut off. So the box should be a square, and you need **8 dots**.

<details>
<summary>Answer</summary>

In `#themeHex`: `width: 54px; height: 54px;`

Change **every** `clip-path` (the big one AND the tiny swatch) to:

```text
clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
```

Make the tiny swatch a square too: `width: 16px; height: 16px;`

**Bonus:** the 60° spin looks crooked now! An octagon has 8 sides: 360 ÷ 8 = **45**. Change it to `rotate(45deg)`.

</details>

<br>

### Challenge 4: Add a second theme, "Midnight" 🌙

A dark blue theme. Picking it should turn the whole page dark.

You need: a new color block in the clothes, and one new line in `THEMES` in the brain. **The `id` must match in both!**

<details>
<summary>Answer</summary>

**Clothes** (add it **below** the Neo-Neutral block, so it wins):

```text
[data-theme="midnight"] {
    --page:        #1d2130;
    --text:        #e6e9f2;
    --text-soft:   #a7aec4;
    --theme-color: #3d4c91;
    --theme-glow:  rgba(120, 150, 255, 0.9);
}
```

**Brain** (add a line inside `THEMES`):

```text
const THEMES = [
    { id: 'neo-neutral', name: 'Neo-Neutral', color: '#4a5260', glow: 'rgba(165, 175, 190, 0.95)' },
    { id: 'midnight',    name: 'Midnight',    color: '#3d4c91', glow: 'rgba(120, 150, 255, 0.9)' },
];
```

That's it. The brain builds a second row by itself, in blue, glowing blue.

</details>

**🤔 Thinking question:** Pick Midnight, then open the menu. Look at the little "THEME" word. It's really hard to read! Why? *(Hint: what color is `--text-soft` in Midnight, and what color is the menu's glass?)* How would you fix it?

<details>
<summary>Answer</summary>

Midnight makes `--text-soft` light (for a dark page), but the menu glass is still bright white. Light text on light glass = hard to read.

One fix: give `.menu-title` its own color that doesn't change with the theme, like `color: #3b4048;`. Another: give each theme a `--menu-text` color and use that.

</details>

<br>

### Challenge 5: Remember the theme after a refresh

Right now, refresh = back to Neo-Neutral. Make the page remember.

<details>
<summary>Hint</summary>

The browser has a little notebook called `localStorage`. `localStorage.setItem('theme', 'midnight')` writes in it. `localStorage.getItem('theme')` reads it back, even after a refresh. Wrap it in `try { ... } catch (e) {}`, because some browsers (like private windows) don't allow the notebook, and you don't want the whole page to break.

</details>

<details>
<summary>Answer</summary>

**Write it down** when you pick: in `setTheme`, under `buildThemeList();` add:

```text
    try { localStorage.setItem('theme', theme.id); } catch (e) {}
```

**Read it back** at the start: right under `let currentTheme = THEMES[0];` add:

```text
try {
    const saved = THEMES.find(function (t) { return t.id === localStorage.getItem('theme'); });
    if (saved) currentTheme = saved;
} catch (e) {}
```

`THEMES.find(...)` = "look through the list and give me the one whose `id` matches." If nothing matches (first visit), `saved` is empty and we keep the default.

</details>

<br>

### Challenge 6: Build your own from nothing 💪

Close this tutorial. Make a new file. Build a **solid circle with a glowing outline** that opens a glass menu with 3 made-up options.

Hint: a circle doesn't even need `clip-path`. `border-radius: 50%` makes any square a circle. But the 2-layer outline trick and the drop-shadow glow work exactly the same.

<br>

---

<br>

## Stuck? Check these first

| Problem | Probably... |
|---|---|
| Nothing looks styled at all | The `<link>` says `hexpractice.css` but the file is named something else. |
| The hexagon is a square | The `clip-path` line is missing or has a typo. Count the dots: 6. |
| No outline, just one solid color | `.hex-inner` is missing its `calc(100% - 4px)` size, so it covers the whole outline. |
| Outline only on the flat sides | You used `border` instead of the 2-layer trick. |
| No glow | The `filter` is on a piece WITH the scissors. It must be on `#themeHex`. |
| The glow is a rectangle | You used `box-shadow` instead of `filter: drop-shadow`. |
| Clicking the hexagon does nothing | Press **F12** → **Console**. A red error = a typo in the brain. Also check the `<script>` file name. |
| The menu opens but it's empty | `setTheme(currentTheme);` isn't the last line of the brain. |
| The menu won't close when clicking outside | The `document.addEventListener('click', ...)` part is missing. |
| No glowing line on top of the menu | `content: "";` is missing from `#themeMenu::before`. |
| The menu row has a grey box behind it | `.theme-option` is missing `background: none;`. |
| The row jumps 1px on hover | `.theme-option` is missing `border: 1px solid transparent;`. |
