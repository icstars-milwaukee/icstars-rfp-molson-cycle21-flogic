/*
    deck.js  -  starts Reveal.js and tells the backdrop which scene each slide wants.

    A slide's  data-beer="0..1"  is how full the glass is (0 = the graffiti bridge, 1 = a full pint).
    Keys, on top of Reveal's own (press ? to see them):   M  pause / resume the backdrop's motion
                                                          V  hide the slides, show only the art
*/
(function () {
    'use strict';

    var deck = new Reveal({
        width: 1280,
        height: 720,
        margin: 0.04,
        hash: true,
        controls: true,
        progress: true,
        slideNumber: 'c/t',
        transition: 'fade',
        transitionSpeed: 'default',
        backgroundTransition: 'none',
        center: true,
        plugins: [RevealNotes]
    });

    function apply() {
        var slide = deck.getCurrentSlide();
        var level = slide ? parseFloat(slide.getAttribute('data-beer')) : 0;
        if (isNaN(level)) { level = 0; }
        window.FlogicBG.setLevel(level);
        document.documentElement.setAttribute('data-mood', level > 0.6 ? 'beer' : 'bridge');
    }

    // THE LIVE APP SLIDE.  A page inside a frame grabs the keyboard whenever it likes (Flogic focuses a button
    // a moment after it opens), and then the arrow keys go into the app instead of moving the deck.  So the frame
    // starts INERT (it can't take the keyboard) under a click shield.  One click on the frame hands it to the app;
    // "Back to slides", or leaving the slide, takes it back.
    var demo = document.querySelector('section.demo');
    var frame = demo && demo.querySelector('iframe');
    function driveApp(on) {
        if (!frame) { return; }
        if (on) { frame.removeAttribute('inert'); } else { frame.setAttribute('inert', ''); }
        demo.classList.toggle('driving', on);
        if (on) { frame.focus(); } else { if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); } window.focus(); }
    }
    if (demo) {
        demo.querySelector('.shield').addEventListener('click', function () { driveApp(true); });
        demo.querySelector('.release').addEventListener('click', function () { driveApp(false); });
        // "inert" alone doesn't stop the app focusing ITSELF.  If focus lands in the frame while we are not driving, take it back.
        window.addEventListener('blur', function () {
            window.setTimeout(function () {
                if (document.activeElement === frame && !demo.classList.contains('driving')) { driveApp(false); }
            }, 0);
        });
    }

    deck.on('ready', function () { driveApp(false); apply(); });
    deck.on('slidechanged', function () { driveApp(false); apply(); });

    deck.addKeyBinding({ keyCode: 77, key: 'M', description: 'Pause / resume the moving backdrop' }, function () { window.FlogicBG.toggle(); });
    deck.addKeyBinding({ keyCode: 86, key: 'V', description: 'Hide the slides: show only the art' }, function () {
        var root = document.documentElement;
        if (root.hasAttribute('data-art-only')) { root.removeAttribute('data-art-only'); } else { root.setAttribute('data-art-only', ''); }
    });

    deck.initialize();
}());
