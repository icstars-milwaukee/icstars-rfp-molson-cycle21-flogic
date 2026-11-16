/*
    ==========================================================

        background.js   -   THE BUBBLES   (24 frames a second, like film)

        The whole backdrop:  a glass full of beer, with bubbles that rise, sway, and POP.
        Nothing else.   Drawn on a 1600 x 900 canvas that the browser scales to the window, so
        it costs the same on any screen.   Motion is counted in FRAMES, so it always looks like 24 fps.
        No libraries.   Key (set in deck.js):  M  pauses / resumes it.

        window.FlogicBG:   pause()   resume()   toggle()   isRunning()   stats()
    ==========================================================
*/
(function () {
    'use strict';

    var FPS = 24;
    var STEP = 1000 / FPS;
    var W = 1600, H = 900;
    var MAX_BUBBLES = 300;

    var cv = document.getElementById('bg');
    if (!cv) { return; }
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function between(a, b) { return a + (b - a) * Math.random(); }

    // the beer:  one amber gradient, painted once
    var liquid = document.createElement('canvas');
    liquid.width = W; liquid.height = H;
    (function () {
        var g = liquid.getContext('2d');
        var amber = g.createLinearGradient(0, 0, 0, H);
        amber.addColorStop(0, '#ffd45a');
        amber.addColorStop(0.4, '#f7ac0a');
        amber.addColorStop(1, '#de8600');
        g.fillStyle = amber;
        g.fillRect(0, 0, W, H);
    }());

    var bubbles = [], pops = [];

    function newBubble(anywhere) {
        var r = 2 + Math.pow(Math.random(), 2.3) * 15;                 // mostly small, a few big
        return { x: Math.random() * W, y: anywhere ? between(0, H) : H + r, r: r,
                 vy: 2 + r * 0.5, ph: Math.random() * 6.3, sway: 0.4 + Math.random() * 0.9 };
    }
    for (var i = 0; i < 220; i++) { bubbles.push(newBubble(true)); }    // the glass is already fizzing when the page opens

    var frame = 0, running = true;

    function step() {
        var n = 3;
        while (n-- > 0 && bubbles.length < MAX_BUBBLES) { bubbles.push(newBubble(false)); }
        for (var i = bubbles.length - 1; i >= 0; i--) {
            var b = bubbles[i];
            b.y -= b.vy;
            b.ph += 0.2;
            b.x += Math.sin(b.ph) * b.sway;
            b.r *= 1.002;
            if (b.y + b.r < -20) { bubbles.splice(i, 1); }
            else if (b.r > 5 && Math.random() < 0.016) { pops.push({ x: b.x, y: b.y, r: b.r, age: 0 }); bubbles.splice(i, 1); }
        }
        for (var j = pops.length - 1; j >= 0; j--) { if (++pops[j].age > 7) { pops.splice(j, 1); } }
    }

    function render() {
        step();
        ctx.drawImage(liquid, 0, 0);
        var i;
        for (i = 0; i < bubbles.length; i++) {
            var b = bubbles[i];
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.3);
            ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
            ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.22), 0, 6.3);   // the glint
            ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
        }
        for (i = 0; i < pops.length; i++) {                              // a pop:  a ring that opens and fades
            var p = pops[i], k = p.age / 7;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.3), 0, 6.3);
            ctx.lineWidth = 2.5 * (1 - k) + 0.5;
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)).toFixed(2) + ')';
            ctx.stroke();
        }
        frame++;
    }

    var stats = { n: 0, total: 0, max: 0 };       // how long drawing takes;  FlogicBG.stats() to read it
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

    window.FlogicBG = {
        pause: function () { running = false; },
        resume: function () { running = true; },
        toggle: function () { running = !running; },
        isRunning: function () { return running; },
        stats: function () { return { frames: stats.n, avgMs: stats.n ? stats.total / stats.n : 0, maxMs: stats.max, budgetMs: STEP }; }
    };

    if (reduced) { running = false; render(); } else { window.requestAnimationFrame(loop); }
}());
