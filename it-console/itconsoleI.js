/*
    ==========================================================

        itconsoleI.js   -   IT'S CONSOLE   (it plays Molson's IT department for the demo)

        The locks and keys:     ../DIRECTORY/vaultcoreI.js    (VaultCore)
        Key files:              ../DIRECTORY/signincoreI.js   (SignInCore)
        The built-in rules:     ../DIRECTORY/policyI.js       (FlogicPolicy)
        The drive folder:       ../DIRECTORY/mailboxI.js      (Mailbox,  the page only)
        This file never does crypto itself,  and never decides a rule itself.

        IT uses it to:
            -  keep a KEYRING   (groups,  their keys,  the people,  IT's signing key)  in ONE file,  locked with an IT passphrase
            -  make GROUPS      (Service Desk,  Change Team, ...)   WHICH data.   Each has its own key and rules.
            -  give each person an ACCESS LEVEL   (Guest,  Viewer,  Analyst)   WHAT they may do with it.   Built in.
            -  make each person's KEY FILE   (.flogic-key,  signed)   and put it in their drive folder.
               It lasts days,  not months.   "Renew everyone" makes fresh ones.   Every 30 days IT reviews each person.
            -  PACK a file      (.csv / .xlsx / .sql   ->   .flogic,   locked with one group's key)
            -  see it all on one screen:   who has what,  until when,  and what needs doing

        What it keeps in the browser:   only WHICH FOLDER IT connected  (a browser handle,  no key,  no name list).
        Nothing else is stored,  and there's no network.   The keys live in variables only.   Lock  (or closing the tab)  forgets them.

        It puts ONE name on the page:  ITConsole.
            -  the logic  (no page needed:  the tests and the demo-set script call it directly)
            -  the page   (only wired up when  it-console.html  is the page)

    ==========================================================
*/

const ITConsole = (function () {

    'use strict';

    const P = FlogicPolicy;
    const S = SignInCore;

    const KEYRING_PERSON = 'it-keyring';           //  the "person" the keyring's keys are locked for   (see VaultCore.keyLabel)
    const KEYRING_VERSION = 2;                     //  2:  people have a level and a review day;  the signing key and the pack list are inside
    const KEYRING_MAX_BYTES = 1024 * 1024;         //  a keyring is small.   A huge file isn't one.
    const PACK_LOG_MAX = 500;                      //  the list of packs made:  the newest 500

    //  One extra locked key,  always there,  that belongs to no group.   Without it,  a keyring with NO groups
    //  has nothing to unlock,  so ANY passphrase would "open" it.   ('~' can't be in a group id,  so it can't clash.)
    const CHECK_ID = '~check';


    function fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }


    // ------------------------------------------------------
    //    DATES      'YYYY-MM-DD'   (the computer's own day,  not UTC)
    // ------------------------------------------------------

    function ymd(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function today() { return ymd(new Date()); }


    // ------------------------------------------------------
    //    1.  THE KEYRING
    //
    //    In the file:
    //        { flogic: 'keyring', v: 2,
    //          groups: [ { group, label, keyVersion, rules: { export, autoLockMin } } ],
    //          people: [ { id, name, groups: [group ids], level, expires, made, reviewed, ended, key: { until, made } } ],
    //          packs:  [ { pack, fileName, group, bytes, made } ],          what was packed,  for whom   (no data,  no key)
    //          signer: { ...a .flogic-signer file... }  or  null,           IT's signing key,  locked with the same passphrase
    //          locked: VaultCore.lockKeys('it-keyring', [every group key  +  the check key], IT passphrase) }
    //
    //    Open  (a "session",  in memory only):
    //        { groups, people, packs,       the same lists  (readable)
    //          keys: { group id: { keyVersion, key } },     the group keys  (extractable,  so they can be locked again)
    //          check,                         the check key   (CHECK_ID above)
    //          signer,                        the signing key file  (still locked),  or null
    //          signing,                       the signing key,  open:  { fingerprint, sign }   (the private half can't be read out)
    //          passphrase,                    kept so Save can lock the keys again.   Lock forgets it.
    //          unsaved }                      true after a change,  until Save
    // ------------------------------------------------------

    //  SAVES ARE COUNTED.   rev:  how many times this keyring has been saved.   ring:  a random name for the keyring itself.
    //  Neither is secret.   They let the page notice "someone else saved a newer copy"  (see THE KEYRING'S STAMP,  below).
    function newRingId() { return VaultCore.toB64(crypto.getRandomValues(new Uint8Array(9))); }

    async function newKeyring(passphrase) {
        const problem = VaultCore.passphraseProblem(passphrase);
        if (problem) throw fail('weak-passphrase', problem);
        return { groups: [], people: [], packs: [], keys: {}, check: await VaultCore.newGroupKey(),
                 signer: null, signing: null, passphrase: passphrase, unsaved: true, rev: 0, ring: newRingId() };
    }


    //  Check the file's shape before trying the passphrase.
    function readKeyring(text) {
        let k;
        try { k = typeof text === 'string' ? JSON.parse(text) : text; }
        catch (e) { throw fail('not-a-keyring', 'That isn\'t a keyring file.'); }
        if (!k || k.flogic !== 'keyring') throw fail('not-a-keyring', 'That isn\'t a keyring file.');
        if (k.v > KEYRING_VERSION) throw fail('bad-version', 'This keyring is from a newer version of the console.');
        if (!Array.isArray(k.groups) || !Array.isArray(k.people) || !k.locked ||
            typeof k.locked.salt !== 'string' || !Array.isArray(k.locked.keys)) {
            throw fail('not-a-keyring', 'This keyring file is damaged.');
        }
        //  every group has exactly one locked key,  every locked key has a group,  and the check key is there
        const ids = k.groups.map(function (g) { return g && g.group; });
        const lockedIds = k.locked.keys.map(function (e) { return e && e.group; });
        if (new Set(ids).size !== ids.length || ids.length + 1 !== lockedIds.length || lockedIds.indexOf(CHECK_ID) < 0 ||
            !ids.every(function (id) { return typeof id === 'string' && lockedIds.indexOf(id) >= 0; })) {
            throw fail('not-a-keyring', 'This keyring file is damaged (its groups and keys don\'t match).');
        }
        for (const g of k.groups) {
            if (groupIdProblem(g.group) || typeof g.label !== 'string' || !Number.isInteger(g.keyVersion) || rulesProblem(g.rules)) {
                throw fail('not-a-keyring', 'This keyring file is damaged (a group in it isn\'t right).');
            }
        }
        for (const p of k.people) {
            if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.groups)) {
                throw fail('not-a-keyring', 'This keyring file is damaged (a person in it isn\'t right).');
            }
        }
        if (k.packs !== undefined && !Array.isArray(k.packs)) throw fail('not-a-keyring', 'This keyring file is damaged (its pack list isn\'t right).');
        return k;
    }

    function isDay(text) { return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text); }

    //  A person from the file,  cleaned.   An older keyring  (v1)  has no levels and no reviews:
    //  everyone starts at the LOWEST level,  not reviewed,  so IT has to look at each person once.
    function cleanPerson(p) {
        const out = { id: String(p.id), name: String(p.name), groups: p.groups.map(String),
                      level: P.level(p.level) ? p.level : P.LOWEST,
                      expires: isDay(p.expires) ? p.expires : '', made: isDay(p.made) ? p.made : '',
                      reviewed: isDay(p.reviewed) ? p.reviewed : '' };
        if (isDay(p.ended)) out.ended = p.ended;
        if (p.key && typeof p.key.until === 'string' && !isNaN(new Date(p.key.until))) {
            out.key = { until: p.key.until, made: isDay(p.key.made) ? p.key.made : '' };
            if (typeof p.key.by === 'string') out.key.by = p.key.by;       //  which signing key signed it
        }
        return out;
    }

    function cleanPackEntry(e) {
        return { pack: String(e.pack), fileName: String(e.fileName), group: String(e.group),
                 bytes: Number(e.bytes) || 0, made: isDay(e.made) ? e.made : '' };
    }


    async function openKeyring(text, passphrase) {
        if (typeof text === 'string' && text.length > KEYRING_MAX_BYTES) throw fail('not-a-keyring', 'That file is too big to be a keyring.');
        const k = readKeyring(text);
        //  A wrong passphrase throws  'wrong-secret'  here,  and nothing below runs.
        const unlocked = await VaultCore.unlockKeys(KEYRING_PERSON, k.locked, passphrase, true);
        const keys = {};
        let check = null;
        for (const u of unlocked) {
            if (u.group === CHECK_ID) check = u.key;
            else keys[u.group] = { keyVersion: u.keyVersion, key: u.key };
        }
        let signer = null, signing = null;
        if (k.signer) {
            try { signer = S.readSigner(k.signer); signing = await S.openSigner(signer, passphrase); }
            catch (e) { throw fail('not-a-keyring', 'This keyring\'s signing key can\'t be opened (' + e.message + ').'); }
        }
        return {
            groups: k.groups.map(function (g) {
                return { group: g.group, label: g.label, keyVersion: g.keyVersion, rules: cleanRules(g.rules) };
            }),
            people: k.people.map(cleanPerson),
            packs: (k.packs || []).filter(Boolean).slice(-PACK_LOG_MAX).map(cleanPackEntry),
            keys: keys,
            check: check,
            signer: signer,
            signing: signing,
            passphrase: passphrase,
            unsaved: false,
            rev: Number.isInteger(k.rev) && k.rev > 0 ? k.rev : 0,
            ring: typeof k.ring === 'string' ? k.ring : '',
            upgraded: !(k.v >= KEYRING_VERSION),         //  an older keyring:  the page says what changed
        };
    }


    //  The file's text.   Locks every group key again,  with a fresh salt.
    async function keyringText(s) {
        const keys = s.groups.map(function (g) { return { group: g.group, keyVersion: g.keyVersion, key: s.keys[g.group].key }; });
        keys.push({ group: CHECK_ID, keyVersion: 1, key: s.check });
        const locked = await VaultCore.lockKeys(KEYRING_PERSON, keys, s.passphrase);
        return JSON.stringify({ flogic: 'keyring', v: KEYRING_VERSION, rev: s.rev || 0, ring: s.ring || '', groups: s.groups, people: s.people,
                                packs: s.packs || [], signer: s.signer || null, locked: locked }, null, 2);
    }


    // ------------------------------------------------------
    //    2.  GROUPS
    //
    //    { group: 'service-desk',  label: 'Service Desk',  keyVersion: 1,
    //      rules: { export: true / false,  autoLockMin: 1–240  (the most idle minutes before the app locks) } }
    //
    //    The label and the rules can change.   The id and the key never do.   (Key rotation:  "Nice",  not now.)
    // ------------------------------------------------------

    const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;     //  a-z,  0-9,  dashes  (not at the ends)
    const ID_MAX = 40;
    const LABEL_MAX = 60;
    const AUTOLOCK_DEFAULT = 15;

    //  'Service Desk'  ->  'service-desk'
    function slugify(label) {
        return String(label).toLowerCase()
            .normalize('NFKD').replace(/[̀-ͯ]/g, '')       //  é -> e
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            .slice(0, ID_MAX).replace(/-+$/, '');
    }

    function labelProblem(label) {
        const l = String(label).trim();
        if (!l) return 'Give the group a name.';
        if (l.length > LABEL_MAX) return 'Keep the name under ' + LABEL_MAX + ' characters.';
        return '';
    }

    function groupIdProblem(id, s) {
        const g = String(id);
        if (!g) return 'Give the group an id.';
        if (g.length > ID_MAX) return 'Keep the id under ' + ID_MAX + ' characters.';
        if (!ID_PATTERN.test(g)) return 'The id can only have small letters, numbers and dashes (not at the start or end).';
        if (s && s.groups.some(function (x) { return x.group === g; })) return 'There\'s already a group with the id "' + g + '".';
        return '';
    }

    function rulesProblem(rules) {
        if (!rules || typeof rules.export !== 'boolean') return 'Say whether this group can export.';
        const m = rules.autoLockMin;
        if (!Number.isInteger(m) || m < 1 || m > 240) return 'Auto-lock has to be a whole number of minutes, 1 to 240.';
        return '';
    }

    function cleanRules(rules) { return { export: rules.export, autoLockMin: rules.autoLockMin }; }

    async function addGroup(s, g) {
        const label = String(g.label).trim();
        const problem = labelProblem(label) || groupIdProblem(g.group, s) || rulesProblem(g.rules);
        if (problem) throw fail('bad-group', problem);
        const group = { group: g.group, label: label, keyVersion: 1, rules: cleanRules(g.rules) };
        s.keys[group.group] = { keyVersion: 1, key: await VaultCore.newGroupKey() };
        s.groups.push(group);
        s.unsaved = true;
        return group;
    }

    //  Only the label and the rules.
    function editGroup(s, id, change) {
        const group = s.groups.find(function (x) { return x.group === id; });
        if (!group) throw fail('bad-group', 'There\'s no group "' + id + '".');
        const label = String(change.label).trim();
        const problem = labelProblem(label) || rulesProblem(change.rules);
        if (problem) throw fail('bad-group', problem);
        group.label = label;
        group.rules = cleanRules(change.rules);
        s.unsaved = true;
        return group;
    }


    // ------------------------------------------------------
    //    3.  PACK A FILE      incident.csv   ->   incident.flogic   (locked with one group's key)
    //
    //    The header  (readable without the key):   { group, groupLabel, keyVersion, fileName, rows: null, made }
    //    rows: null,  because the console has no reader.   The app counts the rows after it opens the pack.
    //
    //    The keyring keeps a LIST of what was packed  (name,  group,  size,  day):  never the data,  never a key.
    // ------------------------------------------------------

    const PACK_TYPES = ['.csv', '.xlsx', '.sql'];

    function extension(fileName) {
        const m = /\.[^.\\/]+$/.exec(String(fileName));
        return m ? m[0].toLowerCase() : '';
    }

    function packProblem(fileName) {
        if (PACK_TYPES.indexOf(extension(fileName)) < 0) return 'Only .csv, .xlsx and .sql files can be packed.';
        return '';
    }

    //  'demo_incident.csv'  ->  'demo_incident.flogic'
    function packName(fileName) {
        return String(fileName).replace(/\.[^.\\/]+$/, '') + '.flogic';
    }

    async function packFile(s, fileName, bytes, groupId, made) {
        const problem = packProblem(fileName);
        if (problem) throw fail('bad-pack', problem);
        if (!bytes || !(bytes.byteLength > 0)) throw fail('bad-pack', '"' + fileName + '" is empty (0 bytes), so there\'s nothing to pack.');
        const g = s.groups.find(function (x) { return x.group === groupId; });
        if (!g) throw fail('bad-pack', 'Pick a group first.');
        //  groupLabel:  so the app can say "This pack is for Change Team"  before it has a key   (DJ's V4 request)
        const header = { group: g.group, groupLabel: g.label, keyVersion: g.keyVersion, fileName: String(fileName),
                         rows: null, made: made || today() };
        const pack = await VaultCore.makePack(bytes, header, s.keys[g.group].key);
        if (!Array.isArray(s.packs)) s.packs = [];
        s.packs.push({ pack: packName(fileName), fileName: String(fileName), group: g.group, bytes: pack.length, made: header.made });
        if (s.packs.length > PACK_LOG_MAX) s.packs.splice(0, s.packs.length - PACK_LOG_MAX);
        s.unsaved = true;
        return { bytes: pack, name: packName(fileName), header: header };
    }

    //  1627725  ->  '1.6 MB'
    function size(n) {
        if (n < 1024) return n + ' bytes';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1024 / 1024).toFixed(1) + ' MB';
    }


    // ------------------------------------------------------
    //    4.  PEOPLE
    //
    //    { id, name,
    //      groups:   [group ids]        WHICH data
    //      level:    'guest' | 'viewer' | 'analyst'        WHAT they may do   (FlogicPolicy.LEVELS)
    //      expires:  their last day,  or ''   (no last day:  the reviews are what keeps access honest)
    //      made:     the day they were added
    //      reviewed: the last day IT said "still needed".   Older than 30 days:  no new key file.
    //      ended:    the day IT ended their access   (kept on the list,  for the record)
    //      key:      { until, made }    their newest key file's end   (so the overview works without the folder) }
    //
    //    The keyring never holds a person's key file,  PIN,  or anything that signs them in.
    // ------------------------------------------------------

    const NAME_MAX = 80;
    const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

    //  u-0001,  u-0002, ...   (one more than the biggest so far)
    function nextPersonId(s) {
        let n = 0;
        for (const p of s.people) {
            const m = /^u-(\d+)$/.exec(p.id);
            if (m) n = Math.max(n, Number(m[1]));
        }
        return 'u-' + String(n + 1).padStart(4, '0');
    }

    //  Dec 31 of this year   (the older credential files only)
    function defaultExpiry() { return new Date().getFullYear() + '-12-31'; }

    function expiryProblem(text) {
        const m = DATE_PATTERN.exec(String(text));
        const d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        if (!m || ymd(d) !== text) return 'Pick an expiry date.';
        if (text < today()) return 'The expiry date is already past.';
        return '';
    }

    function nameProblem(name) {
        const n = String(name).trim();
        if (!n) return 'Type the person\'s name.';
        if (n.length > NAME_MAX) return 'Keep the name under ' + NAME_MAX + ' characters.';
        return '';
    }

    function findPerson(s, id) {
        const p = s.people.find(function (x) { return x.id === id; });
        if (!p) throw fail('bad-person', 'There\'s no person "' + id + '".');
        return p;
    }

    //  who = { name, groups: [group ids], level, expires ('' = no last day) }      ->   ''  or what's wrong
    function personProblem(s, who) {
        const ids = Array.isArray(who.groups) ? who.groups : [];
        const groups = s.groups.filter(function (g) { return ids.indexOf(g.group) >= 0; });
        const l = P.level(who.level);
        let problem = nameProblem(who.name);
        if (!problem && !l) problem = 'Pick an access level.';
        if (!problem && who.expires) problem = expiryProblem(who.expires).replace('Pick an expiry date.', 'That last day isn\'t a date.').replace('The expiry date', 'The last day');
        if (!problem && groups.length === 0) problem = 'Pick at least one group.';
        if (!problem && groups.length !== new Set(ids).size) problem = 'One of those groups isn\'t in this keyring.';
        if (!problem && l.maxGroups > 0 && groups.length > l.maxGroups) {
            problem = 'A ' + l.label + ' can be in ' + l.maxGroups + (l.maxGroups === 1 ? ' group' : ' groups') + ' only.';
        }
        return problem || '';
    }

    function addPerson(s, who) {
        const problem = personProblem(s, who);
        if (problem) throw fail('bad-person', problem);
        const person = { id: nextPersonId(s), name: String(who.name).trim(),
                         groups: s.groups.filter(function (g) { return who.groups.indexOf(g.group) >= 0; }).map(function (g) { return g.group; }),
                         level: who.level, expires: who.expires || '', made: today(),
                         reviewed: today() };            //  adding someone IS saying they need it,  today
        s.people.push(person);
        s.unsaved = true;
        return person;
    }

    //  Name,  groups,  level,  last day.   (More access than before?  That's a fresh decision:  it counts as a review.)
    function editPerson(s, id, who) {
        const p = findPerson(s, id);
        const problem = personProblem(s, who);
        if (problem) throw fail('bad-person', problem);
        const before = P.LEVELS.findIndex(function (l) { return l.id === p.level; });
        const after = P.LEVELS.findIndex(function (l) { return l.id === who.level; });
        const groups = s.groups.filter(function (g) { return who.groups.indexOf(g.group) >= 0; }).map(function (g) { return g.group; });
        const more = after > before || groups.some(function (g) { return p.groups.indexOf(g) < 0; });
        p.name = String(who.name).trim();
        p.groups = groups;
        p.level = who.level;
        p.expires = who.expires || '';
        if (more && !p.ended) p.reviewed = today();
        s.unsaved = true;
        return p;
    }

    //  "Still needed":  the 30-day review.   (It also gives access back to someone whose access was ended.)
    function reviewPerson(s, id) {
        const p = findPerson(s, id);
        p.reviewed = today();
        delete p.ended;
        s.unsaved = true;
        return p;
    }

    //  No more key files for them.   The one they hold still works until its end date  (days,  not months).
    function endAccess(s, id) {
        const p = findPerson(s, id);
        p.ended = today();
        s.unsaved = true;
        return p;
    }

    //  Where a person stands today.
    //      code     'ended' | 'past' | 'no-groups' | 'unreviewed' | 'review-due' | 'review-soon' | 'ok'
    //      canIssue may IT make them a key file right now?
    //      words    for the Review column          why   why not  (when canIssue is false)
    function personState(s, p, now) {
        const t = now || new Date();
        const day = ymd(t);
        if (p.ended) return { code: 'ended', canIssue: false, words: 'Access ended ' + p.ended, why: p.name + '\'s access was ended on ' + p.ended + '.' };
        if (p.expires && p.expires < day) return { code: 'past', canIssue: false, words: 'Last day passed', why: p.name + '\'s last day was ' + p.expires + '.' };
        const groups = s.groups.filter(function (g) { return p.groups.indexOf(g.group) >= 0; });
        if (groups.length === 0) return { code: 'no-groups', canIssue: false, words: 'No groups', why: p.name + ' isn\'t in any group.' };
        const left = P.reviewDaysLeft(p.reviewed, t);
        if (left === null) return { code: 'unreviewed', canIssue: false, words: 'Not reviewed yet', why: 'Confirm ' + p.name + ' still needs access first.' };
        if (left < 0) return { code: 'review-due', canIssue: false, words: 'Review overdue', why: p.name + '\'s ' + P.REVIEW_EVERY_DAYS + '-day review has run out. Confirm they still need access first.' };
        if (left <= 7) return { code: 'review-soon', canIssue: true, words: 'Review in ' + left + (left === 1 ? ' day' : ' days'), why: '' };
        return { code: 'ok', canIssue: true, words: 'Reviewed ' + p.reviewed, why: '' };
    }

    //  Their newest key file,  from the keyring's own note.     'none'  |  'good'  |  'soon'  (renew now)  |  'ended'
    //  |  'replaced'  (signed with a signing key this keyring no longer uses:  the app refuses it)
    //      signedBy   the fingerprint of the keyring's signing key today   (left out:  not checked)
    function keyState(p, now, signedBy) {
        const t = now || new Date();
        if (!p.key || !p.key.until) return { code: 'none', words: 'No key file yet' };
        if (signedBy && p.key.by && p.key.by !== signedBy) return { code: 'replaced', words: 'Key file no longer works (signed with the old signing key)' };
        const end = new Date(p.key.until);
        if (end <= t) return { code: 'ended', words: 'Key file ended ' + S.niceDate(end) };
        const soon = end - t < P.RENEW_WHEN_DAYS_LEFT * 86400000;
        return { code: soon ? 'soon' : 'good', words: 'Key file good until ' + S.niceDate(end) };
    }


    // ------------------------------------------------------
    //    5.  IT'S SIGNING KEY     (inside the keyring,  locked with the same IT passphrase)
    //
    //    The app believes a key file only if THIS key signed it.   The app carries the PUBLIC half
    //    in  DIRECTORY/it-signerI.js   ("the trust file").   A new signing key  =  a new trust file for every copy of the app.
    // ------------------------------------------------------

    async function makeSigner(s) {
        const made = await S.newSigner(s.passphrase);
        s.signing = await S.openSigner(made, s.passphrase);
        s.signer = made;
        s.unsaved = true;
        return s.signing.fingerprint;
    }

    //  A  .flogic-signer  file from before the signing key lived in the keyring.   It must open with the keyring's passphrase.
    async function importSigner(s, text) {
        const file = S.readSigner(text);
        let opened;
        try { opened = await S.openSigner(file, s.passphrase); }
        catch (e) {
            if (e.code === 'wrong-secret') throw fail('wrong-secret', 'That signing key is locked with a different passphrase than this keyring.');
            throw e;
        }
        s.signer = file;
        s.signing = opened;
        s.unsaved = true;
        return opened.fingerprint;
    }

    //  The text of  DIRECTORY/it-signerI.js   (nothing secret in it)
    function trustFile(s) {
        if (!s.signer) throw fail('no-signer', 'This keyring has no signing key yet.');
        const pin = S.pin(s.signer);
        return '/*\n' +
               '    it-signerI.js   -   the app\'s copy of IT\'s PUBLIC signing key.\n' +
               '    (IT\'s console makes this file:  "Download the app\'s trust file".)\n\n' +
               '    The app believes a key file only if this key\'s signature checks.   Nothing secret is here.\n' +
               '    Swap this file and you swap who the app trusts:  so it ships WITH the app,  and changes only with it.\n' +
               '    Fingerprint:  ' + pin.fingerprint + '        Made:  ' + today() + '\n' +
               '*/\n' +
               'const FLOGIC_IT_SIGNER = Object.freeze(' + JSON.stringify(pin, null, 4) + ');\n';
    }


    // ------------------------------------------------------
    //    6.  KEY FILES     (.flogic-key:  the person's sign-in.   Signed.   Short.)
    //
    //    makeKeyFile(s, id)   ->   { person, file, text, until }
    //    How long it lasts isn't IT's choice:  the person's level decides  (policyI.js),  cut short by their last day.
    // ------------------------------------------------------

    async function makeKeyFile(s, id) {
        const p = findPerson(s, id);
        if (!s.signing) throw fail('no-signer', 'This keyring has no signing key yet. Make one under "Signing key".');
        const state = personState(s, p);
        if (!state.canIssue) throw fail('policy', state.why);
        const groups = s.groups.filter(function (g) { return p.groups.indexOf(g.group) >= 0; }).map(function (g) {
            return { group: g.group, label: g.label, keyVersion: g.keyVersion, rules: g.rules, key: s.keys[g.group].key };
        });
        const file = await S.issueKey(s.signing, p, groups);
        const until = new Date(JSON.parse(file.claims).expires);
        p.key = { until: until.toISOString(), made: today(), by: s.signing.fingerprint };
        s.unsaved = true;
        return { person: p, file: file, text: JSON.stringify(file, null, 2), until: until };
    }

    //  "Renew everyone":   who gets a fresh key file,  and who's left out  (and why)
    function renewPlan(s, now) {
        const renew = [], skip = [];
        for (const p of s.people) {
            const state = personState(s, p, now);
            const l = P.level(p.level);
            if (state.code === 'ended') continue;                                   //  ended on purpose:  nothing to say
            if (!state.canIssue) skip.push({ person: p, why: state.why });
            else if (l.renew === 'one-by-one') skip.push({ person: p, why: p.name + ' is a ' + l.label + ': renew them by name.' });
            else renew.push(p);
        }
        return { renew: renew, skip: skip };
    }


    // ------------------------------------------------------
    //    7.  THE OLDER WAY:   A CREDENTIAL FILE   (.flogic-id)   and its SETUP CODE
    //
    //    Only while  FlogicPolicy.ALLOW_LEGACY_CREDENTIALS  is true.   A credential's end date is whatever IT types,
    //    so it does NOT follow the short-access and review rules.   Key files do.
    // ------------------------------------------------------

    //  'Fernando G'  ->  'fernando.flogic-id'      (no usable first name?  the id:  'u-0003.flogic-id')
    function credentialFileName(name, id) {
        const first = String(name).trim().split(/\s+/)[0] || '';
        const clean = first.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '');
        return (clean || id) + '.flogic-id';
    }

    async function makeCredentialFor(s, id, expires) {
        if (!P.ALLOW_LEGACY_CREDENTIALS) throw fail('policy', 'Credential files are turned off. Make a key file instead.');
        const p = findPerson(s, id);
        const problem = expiryProblem(expires);
        if (problem) throw fail('bad-person', problem);
        const groups = s.groups.filter(function (g) { return p.groups.indexOf(g.group) >= 0; });
        if (groups.length === 0) throw fail('bad-person', 'Pick at least one group.');
        const person = {
            id: p.id, name: p.name, expires: expires,
            groups: groups.map(function (g) { return { group: g.group, label: g.label, rules: P.effectiveRules(p.level, g.rules) }; }),
        };
        const keys = groups.map(function (g) { return { group: g.group, keyVersion: g.keyVersion, key: s.keys[g.group].key }; });
        const made = await VaultCore.makeCredential(person, keys);
        return { credential: made.credential, setupCode: made.setupCode, fileName: credentialFileName(p.name, p.id) };
    }

    //  Add a person AND make their credential,  in one go.     who = { name, groups, expires, level }
    //  (No level given:  Analyst,  so the group's own rules pass through unchanged,  as they did before levels.)
    async function makePerson(s, who) {
        if (!P.ALLOW_LEGACY_CREDENTIALS) throw fail('policy', 'Credential files are turned off. Make a key file instead.');
        const problem = nameProblem(who.name) || expiryProblem(who.expires);
        if (problem) throw fail('bad-person', problem);
        const p = addPerson(s, { name: who.name, groups: who.groups, level: who.level || 'analyst', expires: who.expires });
        try { return await makeCredentialFor(s, p.id, who.expires); }
        catch (e) { s.people.splice(s.people.indexOf(p), 1); throw e; }
    }


    // ======================================================
    //    THE PAGE
    //
    //    Everything from a file or a person goes on the page with  textContent,  never  innerHTML.
    // ======================================================

    let session = null;             //  the open keyring.   null = locked.
    let keyringName = 'it.flogic-keyring';
    let lockArmed = false;          //  Lock with unsaved changes:  the first click warns,  the second one locks
    let folder = null;              //  IT's Flogic folder  (Mailbox.openIT),  or null
    let inFolder = new Map();       //  person id  ->  'yes' | 'no' | 'unreadable'     (what's in the folder right now)
    let folderLook = 0;             //  counts every look at the folder:  an older look that finishes late is dropped

    function $(id) { return document.getElementById(id); }

    function show(id, on) { $(id).hidden = !on; }

    function say(id, text, kind) {
        const box = $(id);
        box.textContent = text || '';
        box.className = 'msg' + (kind ? ' ' + kind : '');
    }

    function download(fileName, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    //  Run a slow step  (PBKDF2 takes a moment)  with the button turned off,  and a word on screen.
    async function busy(button, msgId, work) {
        button.disabled = true;
        say(msgId, 'Working…');
        try { await work(); }
        catch (e) { say(msgId, e.message || String(e), 'bad'); }
        finally { button.disabled = false; }
    }

    function markUnsaved() {
        session.unsaved = true;
        lockArmed = false;
        saveArmed = false;
        refresh();
    }

    //  A new element,  with its text set the safe way.
    function el(tag, text, className) {
        const e = document.createElement(tag);
        if (text !== undefined && text !== null) e.textContent = String(text);
        if (className) e.className = className;
        return e;
    }

    function rowButton(text, id, onClick, className) {
        const b = el('button', text, 'small' + (className ? ' ' + className : ''));
        b.type = 'button';
        if (id) b.id = id;
        b.addEventListener('click', onClick);
        return b;
    }

    function groupLabels(ids) {
        return ids.map(function (id) {
            const g = session.groups.find(function (x) { return x.group === id; });
            return g ? g.label : id;
        });
    }

    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

    //  The open keyring's signing key  (its fingerprint),  or ''
    function signedBy() { return session && session.signing ? session.signing.fingerprint : ''; }

    function refresh() {
        const open = session !== null;
        show('start', !open);
        show('main', open);
        if (!open) return;
        $('keyring-name').textContent = keyringName;
        $('unsaved').hidden = !session.unsaved;
        $('keyring-counts').textContent = plural(session.groups.length, 'group', 'groups') + ' · ' + plural(session.people.length, 'person', 'people');
        drawTodo();
        drawPeople();
        drawGroupData();
        drawGroups();
        drawGroupChoices();
        drawPersonGroups();
        drawPacks();
        drawSigner();
    }


    // ------------------------------------------------------
    //    THE OVERVIEW:   what needs doing,   who has what,   which data is for whom
    // ------------------------------------------------------

    //  The few lines at the very top:  only what needs IT's hand today.
    function drawTodo() {
        const list = $('todo');
        list.replaceChildren();
        const lines = [];
        if (newerStamp && stampIsNewer(newerStamp)) lines.push(['bad', newerWords(newerStamp)]);
        if (!session.signing) lines.push(['bad', 'There\'s no signing key yet, so no key file can be made. See "Signing key" below.']);
        else if (trustProblem()) lines.push(['warn', trustProblem()]);
        let due = 0, soon = 0, renew = 0, none = 0, replaced = 0;
        for (const p of session.people) {
            const st = personState(session, p), k = keyState(p, null, signedBy());
            if (st.code === 'review-due' || st.code === 'unreviewed') due++;
            if (st.code === 'review-soon') soon++;
            if (st.canIssue && (k.code === 'soon' || k.code === 'ended')) renew++;
            if (st.canIssue && k.code === 'none') none++;
            if (st.canIssue && k.code === 'replaced') replaced++;
        }
        if (due) lines.push(['bad', plural(due, 'person needs', 'people need') + ' a review before they can get a new key file.']);
        if (replaced) lines.push(['bad', plural(replaced, 'person holds', 'people hold') + ' a key file signed with the old signing key. It no longer opens the app: make each of them a new one.']);
        if (none) lines.push(['warn', plural(none, 'person has', 'people have') + ' no key file yet.']);
        if (renew) lines.push(['warn', plural(renew, 'key file', 'key files') + ' ended or about to end. "Renew everyone" makes fresh ones (a Guest\'s is renewed by name).']);
        if (soon) lines.push(['', plural(soon, 'review', 'reviews') + ' due within a week.']);
        if (session.upgraded) lines.push(['warn', 'This keyring is from an older console. Everyone starts as a Guest, not reviewed: set each person\'s level, then save.']);
        if (lines.length === 0) lines.push(['good', session.people.length ? 'Nothing needs doing today.' : 'Start with a group, then add a person.']);
        for (const l of lines) list.appendChild(el('li', l[1], l[0]));
    }

    function drawPeople() {
        const body = $('person-list');
        body.replaceChildren();
        for (const p of session.people) {
            const st = personState(session, p), k = keyState(p, null, signedBy()), l = P.level(p.level);
            const tr = el('tr');
            tr.id = 'person-' + p.id;
            if (st.code === 'ended' || st.code === 'past') tr.className = 'gone';

            const who = el('td');
            who.appendChild(el('strong', p.name));
            who.appendChild(el('span', p.id, 'mono sub-id'));
            tr.appendChild(who);

            const lv = el('td');
            lv.appendChild(el('span', l ? l.label : p.level, 'chip level-' + (l ? l.id : 'none')));
            tr.appendChild(lv);

            tr.appendChild(el('td', groupLabels(p.groups).join(', ') || 'none'));

            const key = el('td');
            key.id = 'status-' + p.id;
            const where = inFolder.get(p.id);
            key.appendChild(el('span', k.words.replace(/^K/, 'k').replace(/^N/, 'n'), 'state ' + (st.code === 'ended' || st.code === 'past' ? 'off' : k.code === 'replaced' ? 'ended' : k.code)));
            if (folder && where) key.appendChild(el('span', where === 'yes' ? 'in their folder' : where === 'no' ? 'not in their folder' : 'folder copy unreadable', 'where ' + where));
            tr.appendChild(key);

            const rv = el('td');
            rv.appendChild(el('span', st.words, 'state ' + st.code));
            tr.appendChild(rv);

            tr.appendChild(el('td', p.expires || '—'));

            const act = el('td', null, 'actions');
            const make = rowButton(k.code === 'none' ? 'Make key file' : 'Renew key file', 'make-' + p.id, function () { onMakeKey(p.id, make); }, 'primary');
            make.disabled = !st.canIssue || !session.signing;
            make.title = !session.signing ? 'Make a signing key first.' : st.canIssue ? 'Lasts ' + P.describe(p.level).grant + ' (' + l.label + ').' : st.why;
            act.appendChild(make);
            const still = rowButton(st.code === 'ended' ? 'Give access back' : 'Still needed', 'review-' + p.id, function () { onReview(p.id); });
            still.title = 'Confirms today that ' + p.name + ' still needs access. Good for ' + P.REVIEW_EVERY_DAYS + ' days.';
            act.appendChild(still);
            act.appendChild(rowButton('Edit', 'edit-' + p.id, function () { startPersonEdit(p.id); }));
            if (st.code !== 'ended') act.appendChild(rowButton('End access', 'end-' + p.id, function () { onEnd(p.id); }, 'danger'));
            if (P.ALLOW_LEGACY_CREDENTIALS && st.code !== 'ended') {
                act.appendChild(rowButton('Credential file', 'cred-' + p.id, function () { onMakeCredential(p.id); }, 'quiet'));
            }
            tr.appendChild(act);
            body.appendChild(tr);
        }
        $('person-none').hidden = session.people.length > 0;
        $('renew-all').disabled = !session.signing || session.people.length === 0;
    }

    //  Each group:  its key,  its rules,  who's in it,  and what was packed for it.
    function drawGroupData() {
        const body = $('data-list');
        body.replaceChildren();
        for (const g of session.groups) {
            const people = session.people.filter(function (p) { return !p.ended && p.groups.indexOf(g.group) >= 0; });
            const packs = (session.packs || []).filter(function (k) { return k.group === g.group; });
            const names = Array.from(new Set(packs.map(function (k) { return k.pack; })));
            const tr = el('tr');
            const name = el('td');
            name.appendChild(el('strong', g.label));
            name.appendChild(el('span', g.group, 'mono sub-id'));
            tr.appendChild(name);
            tr.appendChild(el('td', 'v' + g.keyVersion));
            const ex = el('td');
            ex.appendChild(el('span', g.rules.export ? 'Yes' : 'No', g.rules.export ? 'yes' : 'no'));
            tr.appendChild(ex);
            tr.appendChild(el('td', g.rules.autoLockMin + ' min'));
            tr.appendChild(el('td', people.length ? people.map(function (p) { return p.name + ' (' + (P.level(p.level) || { label: '?' }).label + ')'; }).join(', ') : 'nobody yet'));
            tr.appendChild(el('td', names.length ? names.join(', ') : 'nothing packed yet'));
            body.appendChild(tr);
        }
        $('data-none').hidden = session.groups.length > 0;
    }

    //  The built-in levels and rules.   Drawn once:  they can't change while the page is open.
    function drawLevels() {
        const body = $('level-list');
        body.replaceChildren();
        for (const l of P.LEVELS) {
            const d = P.describe(l.id);
            const tr = el('tr');
            const name = el('td');
            name.appendChild(el('span', d.label, 'chip level-' + d.id));
            tr.appendChild(name);
            tr.appendChild(el('td', d.forWho));
            tr.appendChild(el('td', d.export));
            tr.appendChild(el('td', d.autoLock));
            tr.appendChild(el('td', d.grant));
            tr.appendChild(el('td', d.renew));
            tr.appendChild(el('td', d.groups));
            tr.appendChild(el('td', d.opensWith));
            body.appendChild(tr);
        }
        $('rule-grant').textContent = 'A key file lasts ' + P.GRANT_MAX_DAYS + ' days at most. A lower level can be shorter, never longer.';
        $('rule-review').textContent = 'Every ' + P.REVIEW_EVERY_DAYS + ' days, IT confirms each person still needs access ("Still needed"). Without it, no new key file can be made for them.';
        const select = $('pp-level');
        select.replaceChildren();
        for (const l of P.LEVELS) {
            const o = el('option', l.label + ': ' + l.forWho);
            o.value = l.id;
            select.appendChild(o);
        }
        show('legacy-note', P.ALLOW_LEGACY_CREDENTIALS);
    }


    // ------------------------------------------------------
    //    KEY FILES:   the folder,   Make key file,   Renew everyone
    // ------------------------------------------------------

    function canUseFolders() { return typeof Mailbox !== 'undefined' && Mailbox.supported(); }

    //  Look in the folder:  whose key file is there,  and is it the one the keyring knows about?   (Display only.)
    async function lookInFolder() {
        const mine = ++folderLook;
        const seen = new Map();
        if (folder && session) {
            for (const p of session.people.slice()) {
                try {
                    const t = await folder.getKeyFor(p.id);
                    if (!t) { seen.set(p.id, 'no'); continue; }
                    JSON.parse(JSON.parse(t).claims);
                    seen.set(p.id, 'yes');
                } catch (e) { seen.set(p.id, 'unreadable'); }
            }
        }
        if (mine !== folderLook || !session) return;
        inFolder = seen;
        drawPeople();
    }

    function folderOn() {
        show('connect-folder', false);
        show('folder-drop', false);
        say('folder-status', 'Connected: "' + folder.name + '". Key files go into each person\'s subfolder.', 'good');
        lookAtStamp();
    }


    // ------------------------------------------------------
    //    THE KEYRING'S STAMP      two IT people,  one keyring file:  don't let one save silently undo the other's
    //
    //    The keyring is saved as a download,  so the page can't see the file on the drive.   What it CAN see is IT's
    //    Flogic folder.   So each save leaves a small stamp there:   { rev  (which save),  saved  (when),  ring  (which keyring) }.
    //    Before a save,  and when the folder is connected,  the page reads it.   A stamp from a LATER save than the copy
    //    that's open means someone else saved in between:  the page says so,  and Save has to be clicked twice.
    //    It only warns.   It doesn't merge.   No folder connected:  no check.
    // ------------------------------------------------------

    let newerStamp = null;          //  the stamp of a newer save than the open copy,  or null
    let saveArmed = false;          //  Save over a newer copy:  the first click warns,  the second one saves

    async function readStamp() {
        if (!folder || typeof folder.getStamp !== 'function') return null;
        try {
            const t = await folder.getStamp();
            const o = t ? JSON.parse(t) : null;
            return o && o.flogic === 'keyring-stamp' && Number.isInteger(o.rev) ? o : null;
        } catch (e) { return null; }
    }

    //  Is that stamp from a later save of THIS keyring?
    function stampIsNewer(stamp) {
        if (!stamp || !session) return false;
        if (stamp.ring && session.ring && stamp.ring !== session.ring) return false;       //  another keyring's stamp
        return stamp.rev > (session.rev || 0);
    }

    function newerWords(stamp) {
        const when = new Date(stamp.saved);
        return 'Someone saved a newer copy of this keyring' + (isNaN(when) ? '' : ' on ' + S.niceDate(when)) +
               ' (save ' + stamp.rev + '; the copy open here is save ' + (session.rev || 0) + '). ' +
               'Saving this copy would undo their changes. Open the newest keyring file and make your changes there.';
    }

    async function lookAtStamp() {
        const mine = session;
        const stamp = await readStamp();
        if (session !== mine || !session) return;
        newerStamp = stampIsNewer(stamp) ? stamp : null;
        if (newerStamp) say('keyring-msg', newerWords(newerStamp), 'bad');
        drawTodo();
    }

    //  The folder already holds a key file under this person's id,  made out to a DIFFERENT name?
    //  (Two copies of the keyring each hand out "the next id",  so two people can end up with the same one.)
    //  ->  that other name,  or ''
    async function folderHoldsAnother(p) {
        if (!folder) return '';
        try {
            const t = await folder.getKeyFor(p.id);
            const c = t ? JSON.parse(JSON.parse(t).claims) : null;
            return c && typeof c.name === 'string' && c.name !== p.name ? c.name : '';
        } catch (e) { return ''; }
    }

    async function reconnect() {
        if (folder || !canUseFolders()) return;
        try {
            const h = await Mailbox.recall('it');
            if (!h || !await Mailbox.allowed(h, 'readwrite', false)) return;
            folder = await Mailbox.openIT(h);
            folderOn();
            lookInFolder();
        } catch (e) { folder = null; }
    }

    async function useFolder(h) {
        if (!await Mailbox.allowed(h, 'readwrite', true)) {
            throw Object.assign(new Error('Flogic needs your OK to write key files into that folder.'), { name: 'NotAllowedError' });
        }
        folder = await Mailbox.openIT(h);
        try { await Mailbox.remember(h, 'it'); } catch (e) { /* asks again next time */ }
        folderOn();
        lookInFolder();
    }

    function folderFailed(e) {
        console.warn('Flogic IT: connecting the folder failed:', e);
        say('folder-status', Mailbox.whyNot(e), 'bad');
    }

    function onConnectFolder() {
        const picking = Mailbox.pick('readwrite');                   //  FIRST,  straight from the click:  the browser insists
        say('folder-status', 'Pick a folder in the window that opened (check the taskbar if you don\'t see it), then allow Flogic to edit it.');
        picking.then(useFolder).catch(folderFailed);
    }

    function onFolderDrop(e) {
        e.preventDefault();
        $('folder-drop').classList.remove('over');
        const got = Mailbox.fromDrop(e);                             //  FIRST,  during the drop
        got.then(function (r) {
            if (!r.dir) throw Object.assign(new Error('That\'s a file. Drag IT\'s Flogic FOLDER here (the one that will hold a subfolder per person).'), { name: 'Error' });
            return useFolder(r.dir);
        }).catch(folderFailed);
    }

    async function forgetFolder() {
        folder = null;
        inFolder = new Map();
        folderLook++;
        try { if (canUseFolders()) await Mailbox.forget('it'); } catch (e) { /* nothing remembered */ }
        show('connect-folder', canUseFolders());
        show('folder-drop', canUseFolders());
        say('folder-status', canUseFolders() ? 'Not connected: key files will download instead, for you to put in each person\'s folder.'
                                             : 'This browser can\'t use a drive folder: key files download instead.');
        show('forget-folder', false);
    }

    //  Put one key file where it goes:  the person's subfolder,  or a download.
    async function deliver(made) {
        if (folder) {
            await folder.putKeyFor(made.person.id, made.text);
            inFolder.set(made.person.id, 'yes');
            return 'Put ' + made.person.name + '\'s key file in their folder (' + made.person.id + '), good until ' + S.niceDate(made.until) + '.';
        }
        window.__flogicLastDownload = { fileName: Mailbox.KEY_FILE, text: made.text, person: made.person.id };      //  the tests read this
        download(Mailbox.KEY_FILE, new Blob([made.text], { type: 'application/json' }));
        return 'Saved ' + made.person.name + '\'s key file (' + Mailbox.KEY_FILE + '), good until ' + S.niceDate(made.until) +
               '. Put it in their drive folder, shared with them only. Never email it.';
    }

    let clashArmed = null;          //  a key file for another name is in the folder:  the first click warns,  the second one replaces it

    async function onMakeKey(id, button) {
        const who = session.people.find(function (x) { return x.id === id; });
        const other = who ? await folderHoldsAnother(who) : '';
        if (other && clashArmed !== id) {
            clashArmed = id;
            say('issue-msg', 'Stop: the folder ' + id + ' already holds a key file for "' + other + '", not ' + who.name + '. ' +
                'Another copy of this keyring may have given the id ' + id + ' to someone else. Check with your team before going on. ' +
                'If ' + who.name + ' was only renamed, click the button again to replace it.', 'bad');
            return;
        }
        clashArmed = null;
        await busy(button, 'issue-msg', async function () {
            const made = await makeKeyFile(session, id);
            const words = await deliver(made);
            markUnsaved();
            say('issue-msg', words + ' Save the keyring to remember it.', 'good');
        });
        if (session) refresh();
    }

    async function onRenewAll() {
        if (!folder) { say('issue-msg', 'Connect IT\'s Flogic folder first. (Without it, make key files one at a time.)', 'bad'); return; }
        const plan = renewPlan(session);
        let renewed = 0;
        const left = plan.skip.map(function (x) { return x.why; });
        await busy($('renew-all'), 'issue-msg', async function () {
            for (const p of plan.renew) {
                const other = await folderHoldsAnother(p);
                if (other) { left.push(p.name + ': their folder (' + p.id + ') holds a key file for "' + other + '". Renew them by name, to check.'); continue; }
                try { await deliver(await makeKeyFile(session, p.id)); renewed++; }
                catch (e) { left.push(p.name + ': ' + e.message); }
            }
            markUnsaved();
            say('issue-msg', 'Renewed ' + plural(renewed, 'person', 'people') + '.' + (left.length ? ' Left out: ' + left.join(' ') : '') +
                             ' Save the keyring to remember it.', left.length ? 'warn' : 'good');
        });
        if (session) refresh();
    }

    function onReview(id) {
        try {
            const p = reviewPerson(session, id);
            markUnsaved();
            say('issue-msg', p.name + ' confirmed today. Good for ' + P.REVIEW_EVERY_DAYS + ' days.', 'good');
        } catch (e) { say('issue-msg', e.message, 'bad'); }
    }

    let endArmed = null;            //  End access:  the first click asks,  the second one does it

    function onEnd(id) {
        const p = session.people.find(function (x) { return x.id === id; });
        if (!p) return;
        if (endArmed !== id) {
            endArmed = id;
            const k = keyState(p, null, signedBy());
            say('issue-msg', 'End ' + p.name + '\'s access? No more key files for them. ' +
                (k.code === 'good' || k.code === 'soon' ? 'The key file they hold still works until ' + S.niceDate(new Date(p.key.until)) + ': it can\'t be taken back early. ' : '') +
                'Click "End access" again to confirm.', 'warn');
            return;
        }
        endArmed = null;
        endAccess(session, id);
        markUnsaved();
        say('issue-msg', p.name + '\'s access is ended. They stay on the list, for the record.', 'good');
    }


    // ------------------------------------------------------
    //    PEOPLE:   add,  edit
    // ------------------------------------------------------

    let editingPerson = null;       //  the person being edited  (null = adding a new one)

    //  One checkbox per group,  keeping what's ticked.
    function drawPersonGroups() {
        const box = $('c-groups');
        const ticked = Array.from(box.querySelectorAll('input:checked')).map(function (i) { return i.value; });
        box.replaceChildren();
        if (session.groups.length === 0) box.appendChild(el('p', 'Make a group first.', 'hint'));
        for (const g of session.groups) {
            const label = el('label', null, 'inline');
            const input = el('input');
            input.type = 'checkbox';
            input.value = g.group;
            input.checked = ticked.indexOf(g.group) >= 0;
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + g.label));
            box.appendChild(label);
        }
        $('c-btn').disabled = session.groups.length === 0;
    }

    function drawLevelHint() {
        const d = P.describe($('pp-level').value);
        $('pp-level-hint').textContent = d ? 'Export: ' + d.export.toLowerCase() + '. Locks after ' + d.autoLock + '. Key file: ' + d.grant +
                                             ', renewed ' + d.renew.toLowerCase() + '. Groups: ' + d.groups.toLowerCase() + '.' : '';
    }

    function resetPersonForm() {
        editingPerson = null;
        $('c-name').value = '';
        $('c-expires').value = '';
        $('pp-level').value = P.LOWEST;
        for (const i of $('c-groups').querySelectorAll('input')) i.checked = false;
        $('person-form-title').textContent = 'Add a person';
        $('c-btn').textContent = 'Add person';
        $('pp-cancel').hidden = true;
        drawLevelHint();
    }

    function startPersonEdit(id) {
        const p = session.people.find(function (x) { return x.id === id; });
        if (!p) return;
        editingPerson = id;
        $('c-name').value = p.name;
        $('c-expires').value = p.expires || '';
        $('pp-level').value = p.level;
        for (const i of $('c-groups').querySelectorAll('input')) i.checked = p.groups.indexOf(i.value) >= 0;
        $('person-form-title').textContent = 'Edit ' + p.name + ' (' + p.id + ')';
        $('c-btn').textContent = 'Save changes';
        $('pp-cancel').hidden = false;
        drawLevelHint();
        say('person-msg', 'Changes reach ' + p.name + ' with their next key file.', '');
        $('people').scrollIntoView({ block: 'start' });
        $('c-name').focus();
    }

    function onPersonSave() {
        const who = {
            name: $('c-name').value,
            level: $('pp-level').value,
            expires: $('c-expires').value,
            groups: Array.from($('c-groups').querySelectorAll('input:checked')).map(function (i) { return i.value; }),
        };
        hideCode();
        try {
            if (editingPerson) {
                const p = editPerson(session, editingPerson, who);
                resetPersonForm();
                markUnsaved();
                say('person-msg', 'Changed ' + p.name + '. Make them a new key file so it reaches them, then save the keyring.', 'good');
                return;
            }
            const p = addPerson(session, who);
            resetPersonForm();
            markUnsaved();
            say('person-msg', 'Added ' + p.name + ' (' + p.id + ') as ' + P.level(p.level).label + '. Next: "Make key file" in the list above.', 'good');
        } catch (e) { say('person-msg', e.message, 'bad'); }
    }


    // ---- the older way:  a credential file and its setup code,  shown once ----

    function hideCode() {
        $('setup-code').textContent = '';
        $('code-for').textContent = '';
        $('copy-msg').textContent = '';
        $('code-panel').hidden = true;
    }

    async function onMakeCredential(id) {
        hideCode();
        const button = $('cred-' + id);
        await busy(button, 'person-msg', async function () {
            const made = await makeCredentialFor(session, id, $('cred-expires').value || defaultExpiry());
            download(made.fileName, new Blob([JSON.stringify(made.credential, null, 2)], { type: 'application/json' }));
            $('code-for').textContent = made.credential.name + ' (' + made.fileName + ')';
            $('setup-code').textContent = made.setupCode;
            $('code-panel').hidden = false;
            say('person-msg', 'Made ' + made.fileName + ' for ' + made.credential.name + ' (' + made.credential.id + '), good until ' + made.credential.expires + '.', 'good');
            $('code-panel').scrollIntoView({ block: 'center' });
        });
    }

    async function onCopy() {
        const code = $('setup-code').textContent;
        try {
            await navigator.clipboard.writeText(code);
            $('copy-msg').textContent = 'Copied.';
        } catch (e) {
            //  No clipboard here:  select it,  so Ctrl + C works.
            const range = document.createRange();
            range.selectNodeContents($('setup-code'));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            $('copy-msg').textContent = 'Selected. Press Ctrl + C to copy.';
        }
    }


    // ------------------------------------------------------
    //    DATA PACKS
    // ------------------------------------------------------

    //  The group list for "Pack":  rebuilt when the groups change,  keeping the choice.
    function drawGroupChoices() {
        const select = $('p-group');
        const was = select.value;
        select.replaceChildren();
        if (session.groups.length === 0) {
            select.appendChild(el('option', 'Make a group first'));
            select.disabled = true;
            $('p-btn').disabled = true;
            return;
        }
        for (const g of session.groups) {
            const o = el('option', g.label + ' (' + g.group + ')');
            o.value = g.group;
            select.appendChild(o);
        }
        if (session.groups.some(function (g) { return g.group === was; })) select.value = was;
        select.disabled = false;
        $('p-btn').disabled = false;
    }

    function drawPacks() {
        const body = $('pack-list');
        body.replaceChildren();
        const packs = (session.packs || []).slice().reverse();
        for (const k of packs.slice(0, 50)) {
            const tr = el('tr');
            tr.appendChild(el('td', k.pack, 'mono'));
            tr.appendChild(el('td', k.fileName));
            tr.appendChild(el('td', groupLabels([k.group])[0]));
            tr.appendChild(el('td', size(k.bytes)));
            tr.appendChild(el('td', k.made));
            body.appendChild(tr);
        }
        $('pack-none').hidden = packs.length > 0;
    }

    async function onPack() {
        const file = $('p-file').files[0];
        if (!file) { say('pack-msg', 'Pick a data file first.', 'bad'); return; }
        const problem = packProblem(file.name);
        if (problem) { say('pack-msg', problem, 'bad'); return; }
        const groupId = $('p-group').value;
        await busy($('p-btn'), 'pack-msg', async function () {
            const p = await packFile(session, file.name, await file.arrayBuffer(), groupId);
            download(p.name, new Blob([p.bytes], { type: 'application/octet-stream' }));
            const g = session.groups.find(function (x) { return x.group === groupId; });
            markUnsaved();
            say('pack-msg', 'Packed ' + file.name + ' (' + size(file.size) + ') into ' + p.name + ' (' + size(p.bytes.length) +
                ') for ' + g.label + '.', 'good');
        });
    }


    // ------------------------------------------------------
    //    GROUPS
    // ------------------------------------------------------

    let editingId = null;           //  the group being edited  (null = making a new one)
    let idTouched = false;          //  IT typed the id by hand:  stop filling it in from the name

    function drawGroups() {
        const body = $('group-list');
        body.replaceChildren();
        for (const g of session.groups) {
            const tr = el('tr');
            tr.appendChild(el('td', g.label));
            tr.appendChild(el('td', g.group, 'mono'));
            const ex = el('td');
            ex.appendChild(el('span', g.rules.export ? 'Yes' : 'No', g.rules.export ? 'yes' : 'no'));
            tr.appendChild(ex);
            tr.appendChild(el('td', g.rules.autoLockMin + ' min'));
            const td = el('td');
            const edit = el('button', 'Edit', 'small');
            edit.type = 'button';
            edit.dataset.group = g.group;
            edit.addEventListener('click', function () { startEdit(g.group); });
            td.appendChild(edit);
            tr.appendChild(td);
            body.appendChild(tr);
        }
        $('group-none').hidden = session.groups.length > 0;
    }

    function readGroupForm() {
        return {
            label: $('g-label').value,
            group: $('g-id').value.trim(),
            rules: { export: $('g-export').checked, autoLockMin: Number($('g-autolock').value) },
        };
    }

    function resetGroupForm() {
        editingId = null;
        idTouched = false;
        $('g-label').value = '';
        $('g-id').value = '';
        $('g-id').disabled = false;
        $('g-export').checked = true;       //  starts at Yes.   IT unchecks it per group.
        $('g-autolock').value = String(AUTOLOCK_DEFAULT);
        $('group-form-title').textContent = 'Make a group';
        $('g-add').textContent = 'Make group';
        $('g-cancel').hidden = true;
        $('g-edit-note').hidden = true;
        $('g-id-hint').textContent = 'Small letters, numbers and dashes. It can\'t change later.';
    }

    function startEdit(id) {
        const g = session.groups.find(function (x) { return x.group === id; });
        if (!g) return;
        editingId = id;
        $('g-label').value = g.label;
        $('g-id').value = g.group;
        $('g-id').disabled = true;
        $('g-export').checked = g.rules.export;
        $('g-autolock').value = String(g.rules.autoLockMin);
        $('group-form-title').textContent = 'Edit "' + g.label + '"';
        $('g-add').textContent = 'Save changes';
        $('g-cancel').hidden = false;
        $('g-edit-note').hidden = false;
        $('g-id-hint').textContent = 'A group\'s id never changes.';
        say('group-msg', '');
        $('g-label').focus();
    }

    async function onGroupSave() {
        const form = readGroupForm();
        if (editingId) {
            try {
                const g = editGroup(session, editingId, form);
                resetGroupForm();
                markUnsaved();
                say('group-msg', 'Changed "' + g.label + '". Save the keyring to keep it.', 'good');
            } catch (e) { say('group-msg', e.message, 'bad'); }
            return;
        }
        //  Say what's wrong right away  (addGroup checks again).
        const problem = labelProblem(form.label) || groupIdProblem(form.group, session) || rulesProblem(form.rules);
        if (problem) { say('group-msg', problem, 'bad'); return; }
        await busy($('g-add'), 'group-msg', async function () {
            const g = await addGroup(session, form);
            resetGroupForm();
            markUnsaved();
            say('group-msg', 'Made "' + g.label + '" (' + g.group + '), with a new key. Save the keyring to keep it.', 'good');
        });
    }

    function onLabelInput() {
        if (!editingId && !idTouched) $('g-id').value = slugify($('g-label').value);
    }

    function onIdInput() {
        idTouched = $('g-id').value !== '';
    }


    // ------------------------------------------------------
    //    THE SIGNING KEY,  AND THE APP'S TRUST FILE
    // ------------------------------------------------------

    //  The key this copy of the app trusts  (../DIRECTORY/it-signerI.js),  if the page loaded it.
    function appTrusts() { return typeof FLOGIC_IT_SIGNER !== 'undefined' && FLOGIC_IT_SIGNER ? FLOGIC_IT_SIGNER.fingerprint : null; }

    //  The app's trust file is there,  but still the blank one it ships with:  key-file sign-in is off in the app.
    function appTrustBlank() { return typeof FLOGIC_IT_SIGNER !== 'undefined' && !FLOGIC_IT_SIGNER; }

    const TRUST_BLANK_WORDS = 'The app next to this console has no trust file yet, so nobody can sign in to it with a key file. ' +
                              'Download the trust file and put it in DIRECTORY/, in place of it-signerI.js.';

    function trustProblem() {
        if (!session || !session.signing) return '';
        if (appTrustBlank()) return TRUST_BLANK_WORDS + ' See "Signing key" below.';
        const app = appTrusts();
        if (app === null || app === session.signing.fingerprint) return '';
        return 'The app next to this console trusts a different signing key (' + app + '). Key files made here won\'t open in it until ' +
               'DIRECTORY/it-signerI.js is replaced with this keyring\'s trust file. See "Signing key" below.';
    }

    function drawSigner() {
        const has = !!session.signing;
        show('signer-has', has);
        show('signer-none', !has);
        $('signer-replace-ok').checked = false;
        if (!has) return;
        $('signer-print').textContent = session.signing.fingerprint;
        const app = appTrusts();
        if (appTrustBlank()) { say('signer-trust', TRUST_BLANK_WORDS, 'warn'); return; }
        say('signer-trust', app === null ? '' : app === session.signing.fingerprint
            ? 'The app next to this console trusts this key.' : 'The app next to this console trusts ' + app + ', not this key. Download the trust file and put it in DIRECTORY/.',
            app === session.signing.fingerprint ? 'good' : 'warn');
    }

    async function onMakeSigner(button) {
        if (session.signing && !$('signer-replace-ok').checked) { say('signer-msg', 'Tick the box first: a new signing key makes every key file out there stop working.', 'bad'); return; }
        await busy(button, 'signer-msg', async function () {
            const fp = await makeSigner(session);
            markUnsaved();
            say('signer-msg', 'Made a signing key (' + fp + '). Download the trust file, put it in the app\'s DIRECTORY/ folder, and save the keyring.', 'good');
        });
    }

    async function onImportSigner(input) {
        const file = input.files[0];
        if (!file) return;
        if (session.signing && !$('signer-replace-ok').checked) { input.value = ''; say('signer-msg', 'Tick the box first: another signing key makes every key file out there stop working.', 'bad'); return; }
        try {
            const fp = await importSigner(session, await file.text());
            markUnsaved();
            say('signer-msg', 'Brought in the signing key ' + fp + '. Save the keyring: from now on it\'s inside it.', 'good');
        } catch (e) { say('signer-msg', e.code === 'not-a-file' ? 'That isn\'t a signing key file (.flogic-signer).' : e.message, 'bad'); }
        input.value = '';
    }

    function onTrustFile() {
        try {
            download('it-signerI.js', new Blob([trustFile(session)], { type: 'text/javascript' }));
            say('signer-msg', 'Saved it-signerI.js. Put it in the app\'s DIRECTORY/ folder, in place of the one there. Nothing in it is secret.', 'good');
        } catch (e) { say('signer-msg', e.message, 'bad'); }
    }


    // ------------------------------------------------------
    //    OPEN,  NEW,  SAVE,  LOCK
    // ------------------------------------------------------

    function startSession(s, name) {
        session = s;
        keyringName = name;
        lockArmed = false;
        endArmed = null;
        clashArmed = null;
        saveArmed = false;
        newerStamp = null;
        inFolder = new Map();
        $('open-pass').value = '';
        $('new-pass').value = '';
        $('new-pass2').value = '';
        say('start-msg', '');
        say('keyring-msg', '');
        say('issue-msg', '');
        say('signer-msg', '');
        resetGroupForm();
        say('group-msg', '');
        $('p-file').value = '';
        say('pack-msg', '');
        $('c-groups').replaceChildren();
        resetPersonForm();
        $('cred-expires').value = defaultExpiry();
        hideCode();
        say('person-msg', '');
        show('connect-folder', canUseFolders());
        show('folder-drop', canUseFolders());
        show('forget-folder', false);
        say('folder-status', canUseFolders() ? 'Not connected: key files will download instead, for you to put in each person\'s folder.'
                                             : 'This browser can\'t use a drive folder: key files download instead.');
        refresh();
        reconnect().then(function () { if (folder && session) show('forget-folder', true); });
    }

    async function onOpen() {
        const file = $('open-file').files[0];
        const pass = $('open-pass').value;
        if (!file) { say('start-msg', 'Pick the keyring file first.', 'bad'); return; }
        if (!pass) { say('start-msg', 'Type the IT passphrase.', 'bad'); return; }
        await busy($('open-btn'), 'start-msg', async function () {
            if (file.size > KEYRING_MAX_BYTES) throw fail('not-a-keyring', 'That file is too big to be a keyring.');
            let s;
            try { s = await openKeyring(await file.text(), pass); }
            catch (e) {
                if (e.code === 'wrong-secret') throw fail('wrong-secret', 'That passphrase doesn\'t open this keyring.');
                throw e;
            }
            startSession(s, file.name);
        });
    }

    async function onNew() {
        const pass = $('new-pass').value;
        const problem = VaultCore.passphraseProblem(pass);
        if (problem) { say('start-msg', problem, 'bad'); return; }
        if (pass !== $('new-pass2').value) { say('start-msg', 'The two passphrases don\'t match.', 'bad'); return; }
        await busy($('new-btn'), 'start-msg', async function () {
            const s = await newKeyring(pass);
            await makeSigner(s);                //  a new keyring comes with its own signing key:  one file,  one passphrase
            startSession(s, 'it.flogic-keyring');
            say('keyring-msg', 'New keyring, with its own signing key. Save it before you close this tab, or it\'s gone.', 'warn');
        });
    }

    async function onSave() {
        await busy($('save-btn'), 'keyring-msg', async function () {
            //  Did someone else save since this copy was opened?   (Only known while IT's folder is connected.)
            const stamp = await readStamp();
            if (stampIsNewer(stamp) && !saveArmed) {
                saveArmed = true;
                newerStamp = stamp;
                say('keyring-msg', newerWords(stamp) + ' (To save this copy anyway, click "Save keyring" again.)', 'bad');
                drawTodo();
                return;
            }
            const was = session.rev || 0;
            const sameRing = stamp && (!stamp.ring || !session.ring || stamp.ring === session.ring);
            if (!session.ring) session.ring = newRingId();
            session.rev = Math.max(was, sameRing ? stamp.rev : 0) + 1;
            let text;
            try { text = await keyringText(session); }
            catch (e) { session.rev = was; throw e; }
            download(keyringName, new Blob([text], { type: 'application/json' }));
            let stamped = !folder;
            if (folder && typeof folder.putStamp === 'function') {
                try {
                    await folder.putStamp(JSON.stringify({ flogic: 'keyring-stamp', rev: session.rev, saved: new Date().toISOString(), ring: session.ring }));
                    stamped = true;
                } catch (e) { console.warn('Flogic IT: the keyring stamp couldn\'t be written to the folder:', e); }
            }
            session.unsaved = false;
            session.upgraded = false;
            lockArmed = false;
            saveArmed = false;
            newerStamp = null;
            say('keyring-msg', 'Saved ' + keyringName + ' (save ' + session.rev + '). Keep it, and its passphrase, somewhere safe.' +
                (folder ? (stamped ? '' : ' The folder couldn\'t be told about this save, so a teammate won\'t be warned if they save an older copy.')
                        : ' If more than one person edits this keyring, connect IT\'s Flogic folder first: without it, nobody is warned when one save undoes another.'),
                stamped && folder ? 'good' : folder ? 'warn' : 'good');
            refresh();
        });
    }

    function lock() {
        //  Forget everything:  the keys,  the passphrase,  the lists,  the folder,  and anything on screen.
        session = null;
        folder = null;
        inFolder = new Map();
        folderLook++;
        lockArmed = false;
        endArmed = null;
        clashArmed = null;
        saveArmed = false;
        newerStamp = null;
        keyringName = 'it.flogic-keyring';
        $('open-file').value = '';
        say('keyring-msg', '');
        say('issue-msg', '');
        say('signer-msg', '');
        say('signer-trust', '');
        $('signer-print').textContent = '';
        $('signer-file').value = '';
        $('signer-file2').value = '';
        resetGroupForm();
        say('group-msg', '');
        for (const id of ['group-list', 'person-list', 'data-list', 'pack-list', 'todo', 'p-group', 'c-groups']) $(id).replaceChildren();   //  hidden isn't enough:  take the names off the page
        $('p-file').value = '';
        say('pack-msg', '');
        resetPersonForm();
        hideCode();
        say('person-msg', '');
        refresh();
        say('start-msg', 'Locked. The keys are gone from this page.', 'good');
    }

    function onLock() {
        if (session && session.unsaved && !lockArmed) {
            lockArmed = true;
            say('keyring-msg', 'You have unsaved changes. Save first, or click Lock again to lose them.', 'warn');
            return;
        }
        lock();
    }


    // ---- the look:  the app's two themes.   It follows the computer;  the chip flips it.   (Not remembered:  nothing is saved.) ----

    function setTheme(name) {
        document.documentElement.dataset.theme = name;
        $('theme-btn').textContent = name === 'neo-dark' ? 'Neo-Dark' : 'Neo-Neutral';
    }

    function wire() {
        setTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'neo-dark' : 'neo-neutral');
        $('theme-btn').addEventListener('click', function () {
            setTheme(document.documentElement.dataset.theme === 'neo-dark' ? 'neo-neutral' : 'neo-dark');
        });
        $('open-btn').addEventListener('click', onOpen);
        $('new-btn').addEventListener('click', onNew);
        //  Enter in a passphrase box  =  its button   (not while it's already working)
        $('open-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('open-btn').disabled) { e.preventDefault(); onOpen(); } });
        $('new-pass2').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('new-btn').disabled) { e.preventDefault(); onNew(); } });
        $('save-btn').addEventListener('click', onSave);
        $('lock-btn').addEventListener('click', onLock);
        $('g-add').addEventListener('click', onGroupSave);
        $('g-cancel').addEventListener('click', function () { resetGroupForm(); say('group-msg', ''); });
        $('g-label').addEventListener('input', onLabelInput);
        $('g-id').addEventListener('input', onIdInput);
        $('p-btn').addEventListener('click', onPack);
        $('p-file').addEventListener('change', function () { say('pack-msg', ''); });
        $('c-btn').addEventListener('click', onPersonSave);
        $('pp-cancel').addEventListener('click', function () { resetPersonForm(); say('person-msg', ''); });
        $('pp-level').addEventListener('change', drawLevelHint);
        $('copy-btn').addEventListener('click', onCopy);
        $('code-done').addEventListener('click', function () { hideCode(); say('person-msg', ''); });
        $('renew-all').addEventListener('click', onRenewAll);
        $('connect-folder').addEventListener('click', onConnectFolder);
        $('forget-folder').addEventListener('click', forgetFolder);
        const drop = $('folder-drop');
        ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
        drop.addEventListener('drop', onFolderDrop);
        $('signer-make').addEventListener('click', function () { onMakeSigner($('signer-make')); });
        $('signer-remake').addEventListener('click', function () { onMakeSigner($('signer-remake')); });
        $('signer-file').addEventListener('change', function () { onImportSigner($('signer-file')); });
        $('signer-file2').addEventListener('change', function () { onImportSigner($('signer-file2')); });
        $('trust-btn').addEventListener('click', onTrustFile);
        drawLevels();
        resetPersonForm();
        resetGroupForm();
        window.addEventListener('beforeunload', function (e) {
            if (session && session.unsaved) { e.preventDefault(); e.returnValue = ''; }
        });
        refresh();
    }

    if (typeof document !== 'undefined' && document.getElementById('it-app')) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
        else wire();
    }


    return Object.freeze({
        KEYRING_PERSON: KEYRING_PERSON, KEYRING_VERSION: KEYRING_VERSION,
        today: today,
        newKeyring: newKeyring, readKeyring: readKeyring, openKeyring: openKeyring, keyringText: keyringText,
        slugify: slugify, groupIdProblem: groupIdProblem, rulesProblem: rulesProblem, addGroup: addGroup, editGroup: editGroup,
        packProblem: packProblem, packName: packName, packFile: packFile,
        nextPersonId: nextPersonId, defaultExpiry: defaultExpiry, expiryProblem: expiryProblem,
        personProblem: personProblem, addPerson: addPerson, editPerson: editPerson, reviewPerson: reviewPerson, endAccess: endAccess,
        personState: personState, keyState: keyState,
        makeSigner: makeSigner, importSigner: importSigner, trustFile: trustFile,
        makeKeyFile: makeKeyFile, renewPlan: renewPlan,
        credentialFileName: credentialFileName, makeCredentialFor: makeCredentialFor, makePerson: makePerson,
    });

})();
