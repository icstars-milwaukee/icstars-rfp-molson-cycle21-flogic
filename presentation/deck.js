/*
    deck.js  -  starts Reveal.js with nothing of its own on screen (no arrows, no progress bar, no slide numbers).
    Key, on top of Reveal's own:   M  pause / resume the bubbles
*/
(function () {
    'use strict';

    var deck = new Reveal({
        width: 1280,
        height: 720,
        margin: 0.12,                  // a wide border, so the bubbles show all round the app
        hash: true,
        controls: false,
        progress: false,
        slideNumber: false,
        transition: 'fade',
        center: true
    });

    deck.addKeyBinding({ keyCode: 77, key: 'M', description: 'Pause / resume the bubbles' }, function () { window.FlogicBG.toggle(); });

    deck.initialize();
}());
