/*
    ==========================================================

        background.js   -   THE MOVING BACKDROP   (24 frames a second, like film)

        Two scenes on ONE canvas, and a beer level that moves between them:

          level 0   a graffiti bridge at night:  concrete arch, a city behind it, and tags that get
                    SPRAYED ON (with a spray cloud and drips) the first time the bridge is on screen.
          level 1   a pint filling up over it:  amber liquid with a foam head and bubbles that rise
                    and POP.   (Level 0.5 is half a glass: the bridge above, the beer below.)

        A slide picks its level with   data-beer="0"  ...  data-beer="1"   (deck.js reads it).

        Everything is drawn on a 1600 x 900 canvas and the browser scales it to the window, so the
        cost is the same on any screen.   All motion is counted in FRAMES, not seconds, so it always
        looks like 24 fps film.   No libraries.   Keys (set in deck.js):  M  pauses / resumes it.

        window.FlogicBG:   setLevel(0..1)   pause()   resume()   toggle()   snap()   isRunning()   level()   stats()
    ==========================================================
*/
(function () {
    'use strict';

    var FPS = 24;
    var STEP = 1000 / FPS;
    var W = 1600, H = 900;

    var cv = document.getElementById('bg');
    if (!cv) { return; }
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------- small helpers ---------- */

    // A seeded random, so the bridge looks the same every time (the bubbles use Math.random).
    var seed = 20211;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function between(a, b) { return a + (b - a) * Math.random(); }
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }   // about -1 .. 1, bunched in the middle

    function layer(w, h) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    /* ---------- the scene that never changes:  sky, skyline, river  (drawn once) ---------- */

    var HORIZON = 600;
    var windows = [];                       // lit windows that twinkle
    var back = layer(W, H);
    (function buildBack() {
        var g = back.getContext('2d');
        var sky = g.createLinearGradient(0, 0, 0, HORIZON);
        sky.addColorStop(0, '#080c22');
        sky.addColorStop(0.55, '#26194a');
        sky.addColorStop(1, '#8a3f66');
        g.fillStyle = sky;
        g.fillRect(0, 0, W, HORIZON);

        var moon = g.createRadialGradient(1180, 170, 4, 1180, 170, 190);
        moon.addColorStop(0, 'rgba(255,244,214,0.95)');
        moon.addColorStop(0.12, 'rgba(255,236,190,0.55)');
        moon.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = moon;
        g.fillRect(900, 0, 600, 400);

        for (var s = 0; s < 90; s++) {                       // stars
            g.fillStyle = 'rgba(255,255,255,' + (0.25 + rnd() * 0.5).toFixed(2) + ')';
            g.fillRect(rnd() * W, rnd() * 360, 1.5, 1.5);
        }

        // the skyline:  two rows of towers, the far row paler
        var rows = [{ base: '#2a1f4e', top: 400, hi: 520, win: 0.0 }, { base: '#120d29', top: 450, hi: 560, win: 1.0 }];
        rows.forEach(function (row) {
            var x = 330;
            while (x < 1290) {
                var bw = 34 + rnd() * 70;
                var bh = 40 + rnd() * (HORIZON - row.top - 40);
                g.fillStyle = row.base;
                g.fillRect(x, HORIZON - bh, bw, bh + 2);
                if (row.win) {
                    for (var wy = HORIZON - bh + 8; wy < HORIZON - 8; wy += 12) {
                        for (var wx = x + 6; wx < x + bw - 8; wx += 11) {
                            if (rnd() < 0.34) { windows.push({ x: wx, y: wy, on: rnd() < 0.6 }); }
                        }
                    }
                }
                x += bw + rnd() * 6;
            }
        });

        var river = g.createLinearGradient(0, HORIZON, 0, H);
        river.addColorStop(0, '#2b2a55');
        river.addColorStop(0.18, '#0c2d3f');
        river.addColorStop(1, '#03101a');
        g.fillStyle = river;
        g.fillRect(0, HORIZON, W, H - HORIZON);
    }());

    /* ---------- the bridge itself:  concrete with an arch cut out  (drawn once) ---------- */

    var ARCH = { left: 370, right: 1230, spring: 640, topY: 190 };      // where the opening is
    var front = layer(W, H);
    function archPath(g) {
        g.beginPath();
        g.moveTo(ARCH.left, H + 4);
        g.lineTo(ARCH.left, ARCH.spring);
        g.ellipse((ARCH.left + ARCH.right) / 2, ARCH.spring, (ARCH.right - ARCH.left) / 2, ARCH.spring - ARCH.topY, 0, Math.PI, 2 * Math.PI);
        g.lineTo(ARCH.right, H + 4);
        g.closePath();
    }
    (function buildFront() {
        var g = front.getContext('2d');
        var wall = g.createLinearGradient(0, 0, 0, H);
        wall.addColorStop(0, '#3a3c45');
        wall.addColorStop(0.5, '#62646b');
        wall.addColorStop(1, '#4a4c52');
        g.fillStyle = wall;
        g.fillRect(0, 0, W, H);

        for (var n = 0; n < 9000; n++) {                      // grain
            g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (rnd() * 0.18).toFixed(2) + ')' : 'rgba(255,255,255,' + (rnd() * 0.1).toFixed(2) + ')';
            var sz = rnd() < 0.9 ? 1.5 : 3;
            g.fillRect(rnd() * W, rnd() * H, sz, sz);
        }
        for (var st = 0; st < 46; st++) {                     // rain streaks
            var sx = rnd() * W, sh = 80 + rnd() * 380, sy = rnd() * 200;
            var sg = g.createLinearGradient(0, sy, 0, sy + sh);
            sg.addColorStop(0, 'rgba(0,0,0,0)');
            sg.addColorStop(0.5, 'rgba(0,0,0,0.13)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = sg;
            g.fillRect(sx, sy, 5 + rnd() * 14, sh);
        }
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;   // seams between the concrete panels
        for (var y = 150; y < H; y += 150) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        for (var x = 0; x < W; x += 400) { g.beginPath(); g.moveTo(x + 40, 0); g.lineTo(x + 40, H); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.35)';                     // tie holes
        for (var ty = 75; ty < H; ty += 150) { for (var tx = 100; tx < W; tx += 200) { g.beginPath(); g.arc(tx, ty, 3, 0, 6.3); g.fill(); } }

        var deck = g.createLinearGradient(0, 0, 0, 82);       // the road deck, dark, overhead
        deck.addColorStop(0, '#0b0b10');
        deck.addColorStop(1, '#25262c');
        g.fillStyle = deck;
        g.fillRect(0, 0, W, 82);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(0, 82, W, 3);

        var wet = g.createLinearGradient(0, H - 150, 0, H);   // wet base where the piers meet the river
        wet.addColorStop(0, 'rgba(0,0,0,0)');
        wet.addColorStop(1, 'rgba(0,10,20,0.7)');
        g.fillStyle = wet;
        g.fillRect(0, H - 150, W, 150);

        // cut the opening, then shade its edge so it looks thick
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = '#000';                     // must be solid, or the cut only goes as deep as the paint is
        archPath(g);
        g.fill();
        g.restore();
    }());
    // the arch's inner edge:  a dark shadow, and a pale lip on its upper edge
    (function edge() {
        var g = front.getContext('2d');
        g.save();
        g.globalCompositeOperation = 'source-over';
        archPath(g);
        g.lineWidth = 16; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.stroke();
        g.lineWidth = 3; g.strokeStyle = 'rgba(190,190,200,0.35)'; g.translate(0, -9); g.stroke();
        g.restore();
    }());

    /* ---------- the graffiti ---------- */

    var paint = layer(W, H);                  // everything sprayed so far, kept here for good
    var pctx = paint.getContext('2d');

    // Where each tag goes.  x,y = centre.  width = how wide to make it.  a, b = its two paint colours
    // (always 6 digits, like #ff2e93:  the spray cloud adds two more digits for see-through).
    var TAGS = [
        { text: 'FLOGIC',          x: 185,  y: 330, width: 330, rot: -0.14, a: '#ff2e93', b: '#ffb347', edge: '#190018', font: 'italic 900 150px Impact, Haettenschweiler, "Arial Black", sans-serif' },
        { text: 'CYCLE 21',        x: 1415, y: 300, width: 330, rot: 0.1,   a: '#27e1ff', b: '#7dff9a', edge: '#001a22', font: 'italic 900 150px Impact, Haettenschweiler, "Arial Black", sans-serif' },
        { text: 'KEEP IT ON TAP',  x: 800,  y: 132, width: 690, rot: -0.012, a: '#ffe14a', b: '#ff7a1a', edge: '#241000', font: 'italic 900 150px Impact, Haettenschweiler, "Arial Black", sans-serif' },
        { text: 'SHIP IT',         x: 190,  y: 600, width: 250, rot: 0.1,   a: '#b6ff3b', b: '#2ee6a6', edge: '#06200f', font: '900 150px "Arial Black", Impact, sans-serif' },
        { text: 'TAP IN',          x: 1410, y: 590, width: 230, rot: -0.1,  a: '#ff8ad8', b: '#8a6bff', edge: '#10062a', font: '900 150px "Arial Black", Impact, sans-serif' },
        { text: '21',              x: 140,  y: 770, width: 120, rot: -0.2,  a: '#ffffff', b: '#27e1ff', edge: '#00131a', font: 'italic 900 150px Impact, "Arial Black", sans-serif' }
    ];
    var SPRAY_FRAMES = 60;                    // 2.5 seconds per tag
    var GAP_FRAMES = 14;                      // a short breath before the next one starts

    function makeTag(def) {
        var meas = layer(10, 10).getContext('2d');
        meas.font = def.font;
        var tw = meas.measureText(def.text).width;
        var k = def.width / tw;
        var pad = 34;
        var w = Math.ceil(def.width + pad * 2), h = Math.ceil(150 * k * 1.25 + pad * 2);
        var art = layer(w, h), g = art.getContext('2d');
        g.translate(w / 2, h / 2);
        g.scale(k, k);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.font = def.font;
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(def.text, 7 / k * 1.5, 8 / k * 1.5);                    // drop shadow
        g.lineWidth = 26; g.strokeStyle = def.edge; g.strokeText(def.text, 0, 0);                            // dark outline
        g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(def.text, 0, 0);                              // white halo, the "bubble letter" look
        var fill = g.createLinearGradient(0, -80, 0, 80);
        fill.addColorStop(0, def.a); fill.addColorStop(1, def.b);
        g.fillStyle = fill; g.fillText(def.text, 0, 0);                                                      // the colour
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillText(def.text, -4, -6);                                // glossy edge
        // where drips can start:  the lower edge of a letter  (a letter pixel with empty space just under it)
        var data = art.getContext('2d').getImageData(0, 0, w, h).data;
        var spots = [];
        for (var y = 0; y < h - 8; y += 2) {
            for (var x = 0; x < w; x += 3) {
                if (data[(y * w + x) * 4 + 3] > 220 && data[((y + 6) * w + x) * 4 + 3] < 30) { spots.push([x, y + 3]); }
            }
        }
        return { def: def, art: art, w: w, h: h, spots: spots, mask: layer(w, h), out: layer(w, h), age: -1, done: false };
    }
    var tags = TAGS.map(makeTag);
    var spraying = false;                     // true once the bridge has been on screen
    var sprayClock = 0;                       // frames since the first tag began

    // A point inside a tag's own picture (lx, ly from its top-left) -> where it lands on the wall, with the tilt.
    function toWall(t, lx, ly) {
        var cx = lx - t.w / 2, cy = ly - t.h / 2, c = Math.cos(t.def.rot), s = Math.sin(t.def.rot);
        return { x: t.def.x + cx * c - cy * s, y: t.def.y + cx * s + cy * c };
    }

    var drips = [];
    function addDrips(t) {
        if (!t.spots.length) { return; }
        var count = Math.min(14, 6 + Math.floor(t.def.width / 40));
        for (var i = 0; i < count; i++) {
            var s = t.spots[Math.floor(Math.random() * t.spots.length)];
            var col = Math.random() < 0.5 ? t.def.a : t.def.b;
            var at = toWall(t, s[0], s[1]);
            drips.push({
                x: at.x, y: at.y,
                max: between(24, 120), len: 0, w: between(2.4, 4.2), color: col,
                v: between(1.6, 3.2), wait: Math.floor(between(0, 36))
            });
        }
    }

    function stepTag(t, frame) {                 // frame = frames since THIS tag began
        var g = t.mask.getContext('2d');
        var p = Math.min(1, frame / SPRAY_FRAMES);
        var d = t.def;
        var nx = (t.w * 0.08) + p * (t.w * 0.84);
        var ny = t.h / 2 + Math.sin(p * Math.PI * 7) * t.h * 0.2;
        t.nozzle = { x: nx, y: ny };
        // the spray itself: lots of dots near the nozzle, bunched in the middle
        g.fillStyle = '#000';
        for (var i = 0; i < 150; i++) {
            var rr = 2 + Math.random() * 4.5;
            g.beginPath();
            g.arc(nx + gauss() * 46, ny + gauss() * 46, rr, 0, 6.3);
            g.fill();
        }
        if (p >= 0.82) { g.globalAlpha = 0.35; g.fillRect(0, 0, t.w, t.h); g.globalAlpha = 1; }          // close any gaps at the end
        // overspray:  a fine mist of dots on the wall around the nozzle, kept for good
        pctx.fillStyle = d.a;
        for (var j = 0; j < 22; j++) {
            pctx.globalAlpha = 0.1 + Math.random() * 0.22;
            var mist = toWall(t, nx + gauss() * 70, ny + gauss() * 70);
            pctx.fillRect(mist.x, mist.y, 1.5, 1.5);
        }
        pctx.globalAlpha = 1;
        // the visible tag so far = the art, cut to what's been sprayed
        var o = t.out.getContext('2d');
        o.globalCompositeOperation = 'source-over';
        o.clearRect(0, 0, t.w, t.h);
        o.drawImage(t.art, 0, 0);
        o.globalCompositeOperation = 'destination-in';
        o.drawImage(t.mask, 0, 0);
        o.globalCompositeOperation = 'source-over';
        if (frame >= SPRAY_FRAMES) {
            finishTagTilted(t);                                       // it's dry:  keep it
            t.done = true;
            addDrips(t);
        }
    }

    function drawTags(frame) {
        var i;
        for (i = 0; i < tags.length; i++) {
            var t = tags[i];
            if (t.done) { continue; }
            var start = i * (SPRAY_FRAMES + GAP_FRAMES);
            if (frame < start) { break; }
            stepTag(t, frame - start);
        }
        for (i = 0; i < tags.length; i++) {
            var q = tags[i];
            if (!q.done && frame >= i * (SPRAY_FRAMES + GAP_FRAMES)) {
                ctx.save();
                ctx.translate(q.def.x, q.def.y);
                ctx.rotate(q.def.rot);
                ctx.drawImage(q.out, -q.w / 2, -q.h / 2);
                if (q.nozzle) {                       // the cloud of paint at the nozzle
                    var cg = ctx.createRadialGradient(q.nozzle.x - q.w / 2, q.nozzle.y - q.h / 2, 2, q.nozzle.x - q.w / 2, q.nozzle.y - q.h / 2, 46);
                    cg.addColorStop(0, q.def.a + 'aa'); cg.addColorStop(1, q.def.a + '00');
                    ctx.fillStyle = cg;
                    ctx.fillRect(q.nozzle.x - q.w / 2 - 50, q.nozzle.y - q.h / 2 - 50, 100, 100);
                }
                ctx.restore();
            }
        }
    }
    function finishTagTilted(t) {            // draw a finished tag into the paint layer, with its tilt
        pctx.save();
        pctx.translate(t.def.x, t.def.y);
        pctx.rotate(t.def.rot);
        pctx.drawImage(t.art, -t.w / 2, -t.h / 2);
        pctx.restore();
    }

    function drawDrips() {
        for (var i = drips.length - 1; i >= 0; i--) {
            var d = drips[i];
            if (d.wait > 0) { d.wait--; continue; }
            if (d.len >= d.max) { drips.splice(i, 1); continue; }
            var step = d.v * (1 - d.len / d.max * 0.8);          // slows as it dries
            pctx.strokeStyle = d.color; pctx.fillStyle = d.color;
            pctx.lineWidth = d.w; pctx.lineCap = 'round';
            pctx.beginPath(); pctx.moveTo(d.x, d.y + d.len); pctx.lineTo(d.x, d.y + d.len + step + 0.5); pctx.stroke();
            d.len += step;
        }
    }

    /* ---------- the beer ---------- */

    var beer = { level: 0, target: 0 };
    var bubbles = [], pops = [], drops = [];
    var MAX_BUBBLES = 280;

    function surfaceY(x, f) {
        var base = H - beer.level * (H + 150);
        return base + Math.sin(x * 0.012 + f * 0.11) * 9 + Math.sin(x * 0.031 - f * 0.07) * 5;
    }

    function spawnBubbles(f) {
        if (beer.level < 0.03 || bubbles.length >= MAX_BUBBLES) { return; }
        var top = Math.max(0, H - beer.level * (H + 150));
        var n = Math.round(beer.level * 3.2 + (beer.target > beer.level ? 3 : 0));
        for (var i = 0; i < n; i++) {
            var r = 2 + Math.pow(Math.random(), 2.3) * 15;
            bubbles.push({
                x: Math.random() * W, y: Math.random() < 0.6 ? H + r : between(top, H),
                r: r, vy: 2 + r * 0.5, ph: Math.random() * 6.3, sway: 0.4 + Math.random() * 0.9
            });
        }
    }

    function stepBeer(f) {
        beer.level += (beer.target - beer.level) * 0.055;
        if (Math.abs(beer.target - beer.level) < 0.002) { beer.level = beer.target; }
        spawnBubbles(f);
        var i;
        for (i = bubbles.length - 1; i >= 0; i--) {
            var b = bubbles[i];
            b.y -= b.vy;
            b.ph += 0.2;
            b.x += Math.sin(b.ph) * b.sway;
            b.r *= 1.002;
            var sy = surfaceY(b.x, f);
            var gone = b.y + b.r < -20;
            var atTop = b.y - b.r < sy + 6;
            var popMid = beer.level > 0.9 ? (b.r > 5 && Math.random() < 0.016) : (b.r > 9 && Math.random() < 0.004);
            if (atTop && b.y > -20) {
                pops.push({ x: b.x, y: Math.max(b.y, sy), r: b.r, age: 0 });
                if (beer.level < 0.93) {
                    for (var d = 0; d < 4; d++) { drops.push({ x: b.x, y: sy, vx: between(-3, 3), vy: -between(3, 7), life: 0 }); }
                }
                bubbles.splice(i, 1);
            } else if (popMid && b.y > 0) {
                pops.push({ x: b.x, y: b.y, r: b.r, age: 0 });
                bubbles.splice(i, 1);
            } else if (gone) {
                bubbles.splice(i, 1);
            }
        }
        for (i = pops.length - 1; i >= 0; i--) { if (++pops[i].age > 7) { pops.splice(i, 1); } }
        for (i = drops.length - 1; i >= 0; i--) {
            var dr = drops[i];
            dr.x += dr.vx; dr.y += dr.vy; dr.vy += 0.9;
            if (++dr.life > 9) { drops.splice(i, 1); }
        }
    }

    function drawBeer(f) {
        if (beer.level <= 0.004) { return; }
        var x, top = H - beer.level * (H + 150);
        // liquid
        var liq = ctx.createLinearGradient(0, Math.max(top, 0), 0, H);
        liq.addColorStop(0, 'rgba(255,214,90,0.93)');
        liq.addColorStop(0.35, 'rgba(247,172,10,0.94)');
        liq.addColorStop(1, 'rgba(222,134,0,0.95)');
        ctx.fillStyle = liq;
        ctx.beginPath();
        ctx.moveTo(0, H + 2);
        for (x = 0; x <= W; x += 16) { ctx.lineTo(x, surfaceY(x, f)); }
        ctx.lineTo(W, H + 2);
        ctx.closePath();
        ctx.fill();
        // drifting light through the glass
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var s = 0; s < 6; s++) {
            var sx = ((s * 290 + f * (0.6 + s * 0.15)) % (W + 300)) - 150;
            var sg = ctx.createLinearGradient(sx, 0, sx + 120, 0);
            sg.addColorStop(0, 'rgba(255,230,150,0)');
            sg.addColorStop(0.5, 'rgba(255,230,150,0.10)');
            sg.addColorStop(1, 'rgba(255,230,150,0)');
            ctx.fillStyle = sg;
            ctx.fillRect(sx, Math.max(top, 0), 120, H);
        }
        ctx.restore();
        // bubbles
        for (var i = 0; i < bubbles.length; i++) {
            var b = bubbles[i];
            if (b.y < surfaceY(b.x, f)) { continue; }
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.3);
            ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
            ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.22), 0, 6.3);
            ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
        }
        // foam head
        if (beer.level < 0.97) {
            ctx.fillStyle = '#fff6dc';
            for (x = -10; x < W + 30; x += 22) {
                var fy = surfaceY(x, f);
                var fr = 15 + (Math.sin(x * 0.37) + 1) * 7;
                ctx.beginPath(); ctx.arc(x, fy - 2 + Math.sin(x * 0.2 + f * 0.1) * 2, fr, 0, 6.3); ctx.fill();
            }
            ctx.fillStyle = 'rgba(255,240,196,0.9)';
            for (x = 6; x < W + 30; x += 34) {
                var fy2 = surfaceY(x, f);
                ctx.beginPath(); ctx.arc(x, fy2 - 16 - (Math.sin(x * 0.5) + 1) * 6, 11 + (Math.cos(x * 0.21) + 1) * 4, 0, 6.3); ctx.fill();
            }
        }
        // pops: a ring that opens and fades
        for (i = 0; i < pops.length; i++) {
            var p = pops[i], k = p.age / 7;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.3), 0, 6.3);
            ctx.lineWidth = 2.5 * (1 - k) + 0.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)).toFixed(2) + ')'; ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,246,220,0.85)';
        for (i = 0; i < drops.length; i++) { ctx.fillRect(drops[i].x, drops[i].y, 3, 3); }
    }

    /* ---------- the moving parts of the bridge scene ---------- */

    var flicker = 1;
    function drawBackLive(f) {
        ctx.drawImage(back, 0, 0);
        // windows twinkle
        for (var i = 0; i < windows.length; i++) {
            var w = windows[i];
            if (Math.random() < 0.0016) { w.on = !w.on; }
            if (w.on) { ctx.fillStyle = 'rgba(255,214,120,0.85)'; ctx.fillRect(w.x, w.y, 4, 5); }
        }
        // the river:  short bright dashes that slide sideways, and the moon's long reflection
        for (var r = 0; r < 70; r++) {
            var ry = HORIZON + 8 + (r * 37) % (H - HORIZON - 10);
            var rx = (r * 211 + f * (0.4 + (r % 5) * 0.2)) % (ARCH.right - ARCH.left + 100) + ARCH.left - 50;
            ctx.fillStyle = 'rgba(255,225,170,' + (0.05 + (r % 4) * 0.035).toFixed(2) + ')';
            ctx.fillRect(rx, ry, 28 + (r % 6) * 9, 2);
        }
        // a little boat light crossing the river
        var bx = ((f * 1.4) % 1500) - 100;
        var bg = ctx.createRadialGradient(bx, HORIZON + 60, 1, bx, HORIZON + 60, 26);
        bg.addColorStop(0, 'rgba(255,90,70,0.95)'); bg.addColorStop(1, 'rgba(255,90,70,0)');
        ctx.fillStyle = bg; ctx.fillRect(bx - 28, HORIZON + 32, 56, 56);
        // mist
        for (var m = 0; m < 3; m++) {
            var mx = ((f * (0.3 + m * 0.2) + m * 520) % (W + 600)) - 300;
            var mg = ctx.createRadialGradient(mx, HORIZON + 10 + m * 18, 10, mx, HORIZON + 10 + m * 18, 320);
            mg.addColorStop(0, 'rgba(190,170,230,0.10)'); mg.addColorStop(1, 'rgba(190,170,230,0)');
            ctx.fillStyle = mg; ctx.fillRect(mx - 320, HORIZON - 300, 640, 640);
        }
    }

    function drawLamp(f) {                    // a lamp under the deck that buzzes a little
        if (Math.random() < 0.05) { flicker = 0.82 + Math.random() * 0.18; }
        var lg = ctx.createRadialGradient(800, 84, 6, 800, 84, 420);
        lg.addColorStop(0, 'rgba(255,214,140,' + (0.34 * flicker).toFixed(2) + ')');
        lg.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(300, 0, 1000, 520);
        ctx.fillStyle = 'rgba(255,240,200,' + flicker.toFixed(2) + ')';
        ctx.fillRect(776, 80, 48, 5);
    }

    /* ---------- the frame ---------- */

    var frame = 0, running = true;
    function render() {
        var f = frame;
        ctx.clearRect(0, 0, W, H);
        drawBackLive(f);
        ctx.drawImage(front, 0, 0);
        drawLamp(f);
        if (spraying) {
            sprayClock++;
            drawDrips();
            ctx.drawImage(paint, 0, 0);
            drawTags(sprayClock);
        } else {
            ctx.drawImage(paint, 0, 0);
        }
        stepBeer(f);
        drawBeer(f);
        // darken the corners a touch, so the slide in the middle always reads
        var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        frame++;
    }

    var last = 0;
    function loop(ts) {
        window.requestAnimationFrame(loop);
        if (!running) { return; }
        if (ts - last < STEP - 1) { return; }
        last = ts - ((ts - last) % STEP);
        var t0 = performance.now();
        render();
        var ms = performance.now() - t0;
        stats.n++; stats.total += ms; if (ms > stats.max) { stats.max = ms; }
    }
    var stats = { n: 0, total: 0, max: 0 };       // how long drawing takes;  FlogicBG.stats() to read it

    /* ---------- what deck.js uses ---------- */

    function snap() {                          // reduced motion:  no animation,  show the finished picture
        spraying = true;
        tags.forEach(function (t) { if (!t.done) { t.done = true; finishTagTilted(t); } });
        beer.level = beer.target;
        render();
    }

    window.FlogicBG = {
        setLevel: function (l) {
            l = Math.max(0, Math.min(1, +l || 0));
            beer.target = l;
            if (l < 0.6) { spraying = true; }                    // the bridge is showing:  start the tags
            if (reduced) { snap(); }
        },
        pause: function () { running = false; document.documentElement.setAttribute('data-bg-paused', ''); },
        resume: function () { running = true; document.documentElement.removeAttribute('data-bg-paused'); },
        toggle: function () { if (running) { this.pause(); } else { this.resume(); } },
        snap: snap,
        isRunning: function () { return running; },
        stats: function () { return { frames: stats.n, avgMs: stats.n ? stats.total / stats.n : 0, maxMs: stats.max, budgetMs: STEP }; },
        level: function () { return beer.level; }
    };

    if (reduced) { running = false; snap(); } else { window.requestAnimationFrame(loop); }
}());
