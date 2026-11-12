/*
    ==========================================================

        policyI.js   -   THE RULES THAT ARE BUILT IN   (hardcoded on purpose)

        Nobody can change these from a screen:  not a person,  not IT.   They change only when the app's
        own files change.   The app AND IT's console both load this file,  so they always agree.

        1.  SHORT ACCESS.      A key file never lasts longer than its access level allows  (7 days at most).
        2.  RENEWAL.           Access carries on only because IT renews it.   Every 30 days IT has to say
                               "this person still needs it"  (a REVIEW).   No review,  no renewal.
        3.  ACCESS LEVELS.     What a person may DO with the data they can open.
                               (A GROUP says WHICH data.   A LEVEL says WHAT you may do with it.)

        The app checks all three itself,  on every sign-in  (claimsProblem,  below).   So a key file that
        breaks a rule is refused even if IT's own key signed it.

        It puts ONE name on the page:  FlogicPolicy.     No page,  no saving,  no network.

    ==========================================================
*/

const FlogicPolicy = (function () {

    'use strict';

    const DAY = 86400000;

    const GRANT_MAX_DAYS = 7;               //  no key file lasts longer than this,  whatever its level says
    const RENEW_WHEN_DAYS_LEFT = 3;         //  from here on,  the app looks in the drive folder for a renewal
    const REVIEW_EVERY_DAYS = 30;           //  IT confirms each person still needs access.   After this:  no new key file.

    //  The older way in  (a credential file + setup code + passphrase)  doesn't follow rules 1 and 2:
    //  its end date is whatever IT typed.   false  =  the app and the console stop offering it.
    const ALLOW_LEGACY_CREDENTIALS = true;


    // ------------------------------------------------------
    //    THE ACCESS LEVELS      lowest first
    //
    //    id          never changes  (it's written into key files)
    //    forWho      who it's meant for,  in one line
    //    can         what the level may do            export:   Export report,  Save as CSV
    //    autoLockMin the most idle minutes before the app locks   (a group can ask for fewer)
    //    grantDays   how long one key file lasts
    //    maxGroups   how many groups a person at this level can be in   (0 = any number)
    //    renew       'with-everyone'   "Renew everyone" includes them
    //                'one-by-one'      IT renews them by name,  each time
    //    view        what the app shows first after a file opens:
    //                  dashboard   'summary'  (the first 3 tiles:  the big numbers)   or   'full'  (every suggested tile)
    // ------------------------------------------------------

    const LEVELS = Object.freeze([
        Object.freeze({
            id: 'guest', label: 'Guest',
            forWho: 'A visitor, contractor or trainee who needs a look for a day.',
            can: Object.freeze({ export: false }),
            autoLockMin: 5, grantDays: 1, maxGroups: 1, renew: 'one-by-one',
            view: Object.freeze({ dashboard: 'summary' }),
        }),
        Object.freeze({
            id: 'viewer', label: 'Viewer',
            forWho: 'Someone who reads the numbers but doesn\'t take data out.',
            can: Object.freeze({ export: false }),
            autoLockMin: 10, grantDays: 7, maxGroups: 0, renew: 'with-everyone',
            view: Object.freeze({ dashboard: 'full' }),
        }),
        Object.freeze({
            id: 'analyst', label: 'Analyst',
            forWho: 'Someone who works the data and hands reports to others.',
            can: Object.freeze({ export: true }),
            autoLockMin: 30, grantDays: 7, maxGroups: 0, renew: 'with-everyone',
            view: Object.freeze({ dashboard: 'full' }),
        }),
    ]);

    const LOWEST = LEVELS[0].id;

    function level(id) {
        return LEVELS.find(function (l) { return l.id === id; }) || null;
    }


    // ------------------------------------------------------
    //    A GROUP'S RULES,  SEEN THROUGH A LEVEL       the STRICTER one always wins
    //
    //    Service Desk  { export: yes, 15 min }   +   Viewer  { export: no, 10 min }    ->   { export: no, 10 min }
    // ------------------------------------------------------

    function effectiveRules(levelId, groupRules) {
        const l = level(levelId);
        if (!l) return { export: false, autoLockMin: 1 };
        const mins = Number(groupRules && groupRules.autoLockMin);
        return {
            export: !!(groupRules && groupRules.export === true && l.can.export),
            autoLockMin: mins > 0 ? Math.min(mins, l.autoLockMin) : l.autoLockMin,
        };
    }


    // ------------------------------------------------------
    //    DATES      a review day is  'YYYY-MM-DD'  (IT's own day)
    // ------------------------------------------------------

    function dayStart(text) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
        if (!m) return null;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d) ? null : d;
    }

    //  The last moment a key file may be ISSUED for someone reviewed on that day.
    function reviewEnds(reviewed) {
        const d = dayStart(reviewed);
        return d ? new Date(d.getTime() + (REVIEW_EVERY_DAYS + 1) * DAY - 1000) : null;
    }

    //  Whole days until the review runs out.   Under 0:  it's overdue.   null:  never reviewed.
    function reviewDaysLeft(reviewed, now) {
        const end = reviewEnds(reviewed);
        return end ? Math.floor((end - (now || new Date())) / DAY) : null;
    }


    // ------------------------------------------------------
    //    IT'S SIDE:   when does a new key file end?
    //
    //    grantEnd(levelId, { accessEnds, reviewed }, now)   ->   a Date.     Throws a plain reason if no key file may be made.
    //        accessEnds   the person's own last day  ('YYYY-MM-DD',  or nothing)
    // ------------------------------------------------------

    function grantEnd(levelId, person, now) {
        const l = level(levelId);
        const from = now || new Date();
        if (!l) throw new Error('Pick an access level.');
        const review = reviewEnds(person && person.reviewed);
        if (!review) throw new Error('Confirm they still need access first.');
        if (review <= from) throw new Error('Their ' + REVIEW_EVERY_DAYS + '-day review has run out. Confirm they still need access first.');
        let end = new Date(from.getTime() + Math.min(l.grantDays, GRANT_MAX_DAYS) * DAY);
        const last = person && person.accessEnds ? dayStart(person.accessEnds) : null;
        if (last) {
            const lastMoment = new Date(last.getTime() + DAY - 1000);
            if (lastMoment <= from) throw new Error('Their access ended on ' + person.accessEnds + '.');
            if (lastMoment < end) end = lastMoment;
        }
        return end;
    }


    // ------------------------------------------------------
    //    THE APP'S SIDE:   does this key file keep the rules?
    //
    //    claimsProblem(claims)   ->   ''  (fine)   or the reason,  in plain words.
    //    Run on every sign-in,  AFTER IT's signature checked out.
    // ------------------------------------------------------

    const SLACK = 5 * 60000;                //  clocks are never exactly the same

    function claimsProblem(c) {
        const l = level(c && c.level);
        if (!l) return 'This key file has no access level this app knows. Ask IT for a new one.';
        const issued = new Date(c.issued), expires = new Date(c.expires);
        if (isNaN(issued) || isNaN(expires) || expires <= issued) return 'This key file\'s dates aren\'t right.';
        if (expires - issued > Math.min(l.grantDays, GRANT_MAX_DAYS) * DAY + SLACK) {
            return 'This key file lasts longer than a ' + l.label + ' is allowed (' + l.grantDays + (l.grantDays === 1 ? ' day' : ' days') + ').';
        }
        const review = reviewEnds(c.reviewed);
        if (!review) return 'This key file doesn\'t say when IT last reviewed your access.';
        if (issued > new Date(review.getTime() + DAY)) return 'This key file was made after your ' + REVIEW_EVERY_DAYS + '-day review ran out.';
        if (dayStart(c.reviewed) > new Date(issued.getTime() + 2 * DAY)) return 'This key file\'s review date is after the day it was made.';
        if (!Array.isArray(c.groups) || c.groups.length === 0) return 'This key file has no groups.';
        if (l.maxGroups > 0 && c.groups.length > l.maxGroups) {
            return 'A ' + l.label + ' can be in ' + l.maxGroups + (l.maxGroups === 1 ? ' group' : ' groups') + ', and this key file has ' + c.groups.length + '.';
        }
        for (const g of c.groups) {
            const r = g && g.rules;
            if (!r) return 'This key file has a group with no rules.';
            if (r.export === true && !l.can.export) return 'A ' + l.label + ' can\'t export, and this key file says they can.';
            if (!(Number(r.autoLockMin) > 0) || Number(r.autoLockMin) > l.autoLockMin) return 'This key file\'s auto-lock is longer than a ' + l.label + ' is allowed.';
        }
        return '';
    }


    // ------------------------------------------------------
    //    IN PLAIN WORDS      (the console's level table,  and the app's "what can I do" line)
    // ------------------------------------------------------

    function describe(levelId) {
        const l = level(levelId);
        if (!l) return null;
        return {
            id: l.id, label: l.label, forWho: l.forWho,
            export: l.can.export ? 'Yes, where the group allows it' : 'No',
            autoLock: l.autoLockMin + ' min at most',
            grant: l.grantDays + (l.grantDays === 1 ? ' day' : ' days'),
            groups: l.maxGroups > 0 ? l.maxGroups + (l.maxGroups === 1 ? ' group' : ' groups') + ' at most' : 'Any number',
            renew: l.renew === 'one-by-one' ? 'By name, each time' : 'With "Renew everyone"',
            opensWith: l.view.dashboard === 'summary' ? 'A short summary (3 tiles)' : 'The full dashboard',
        };
    }


    return Object.freeze({
        GRANT_MAX_DAYS: GRANT_MAX_DAYS, RENEW_WHEN_DAYS_LEFT: RENEW_WHEN_DAYS_LEFT, REVIEW_EVERY_DAYS: REVIEW_EVERY_DAYS,
        ALLOW_LEGACY_CREDENTIALS: ALLOW_LEGACY_CREDENTIALS,
        LEVELS: LEVELS, LOWEST: LOWEST,
        level: level, effectiveRules: effectiveRules, describe: describe,
        reviewEnds: reviewEnds, reviewDaysLeft: reviewDaysLeft, grantEnd: grantEnd, claimsProblem: claimsProblem,
    });

})();
