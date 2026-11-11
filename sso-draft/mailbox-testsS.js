/*
    mailbox-testsS.js   -   the drive folder  (IT's parent folder,  the person's own folder).   Made-up data only.
    runMailboxTests(check, env, S, Mailbox, makeMemoryFolder)       (env as in core-testsS.js)
*/
async function runMailboxTests(check, env, S, Mailbox, makeMemoryFolder) {
    'use strict';
    const PASS = 'flogic demo keyring only', FAST = 1000, PIN = '482916', day = 86400000;
    async function code(fn, want) {
        try { await fn(); return 'no error'; } catch (e) { return e.code === want ? true : 'code ' + e.code + ': ' + e.message; }
    }

    const signer = await S.openSigner(S.readSigner(await env.text('sso-draft/demo/demo-it.flogic-signer')), PASS);
    const ring = await S.keyringGroups(await env.text('demo-data/packs/demo-it.flogic-keyring'), PASS);
    const sd = ring.groups.find(function (g) { return g.group === 'service-desk'; });
    const fern = ring.people.find(function (p) { return p.id === 'u-0001'; });

    // ---- IT writes a filekey into the person's subfolder ----
    const root = makeMemoryFolder('Flogic keys');
    const it = await Mailbox.openIT(root);
    const kf = await S.issueKey(signer, fern, [sd], new Date(Date.now() + 7 * day));
    await it.putKeyFor('u-0001', JSON.stringify(kf));
    check('IT: the filekey lands in the person\'s own subfolder', root.__dirs.has('u-0001') &&
          root.__dirs.get('u-0001').__files.has(Mailbox.KEY_FILE));
    check('IT: reads it back', JSON.parse(await it.getKeyFor('u-0001')).sig === kf.sig);
    check('IT: nobody\'s file yet means null, not an error', (await it.getKeyFor('u-0002')) === null);
    check('IT: a path is never taken from a name', await code(function () { return it.putKeyFor('../u-0002', '{}'); }, 'not-a-file') === true &&
          await code(function () { return it.getKeyFor('..'); }, 'not-a-file') === true && await code(function () { return it.putKeyFor('a/b', '{}'); }, 'not-a-file') === true);
    root.__dirs.set('Fernando (shared)', makeMemoryFolder('x'));
    root.__files.set('notes.txt', 'hi');
    const ids = await it.people();
    check('IT: lists the person subfolders and ignores odd names', ids.length === 1 && ids[0] === 'u-0001', JSON.stringify(ids));

    // ---- the person reads their folder  (the same subfolder,  shared with them) ----
    const mine = await Mailbox.openPersonal(root.__dirs.get('u-0001'));
    const got = await mine.getKey();
    const claims = await S.check(S.readKey(got), env.pinned);
    check('person: reads their filekey and it checks', claims.sub === 'u-0001');
    const copy = await S.claim(S.readKey(got), PIN, env.pinned, FAST);
    const opened = await S.unlock(copy, PIN, env.pinned);
    check('end to end: IT folder -> person folder -> PIN -> keys', opened.keys.length === 1 && opened.keys[0].group === 'service-desk');
    check('person: an empty folder means "nothing yet"', (await (await Mailbox.openPersonal(makeMemoryFolder('empty'))).getKey()) === null);

    // ---- the folder can't fake anything ----
    const files = root.__dirs.get('u-0001').__files;
    const ed = JSON.parse(files.get(Mailbox.KEY_FILE)), c = JSON.parse(ed.claims);
    c.expires = new Date(Date.now() + 900 * day).toISOString(); ed.claims = JSON.stringify(c);
    files.set(Mailbox.KEY_FILE, JSON.stringify(ed));
    check('folder attack: an end date pushed out in the drive is refused', await code(async function () { await S.check(S.readKey(await mine.getKey()), env.pinned); }, 'bad-signature'));
    files.set(Mailbox.KEY_FILE, 'x'.repeat(300 * 1024));
    check('folder attack: a huge file isn\'t read', await code(function () { return mine.getKey(); }, 'not-a-file'));
    files.delete(Mailbox.KEY_FILE);
    check('folder attack: a deleted filekey just means "nothing yet"', (await mine.getKey()) === null);

    // ---- renewal through the folder ----
    await new Promise(function (r) { setTimeout(r, 20); });
    const renewed = await S.issueKey(signer, fern, [sd], new Date(Date.now() + 14 * day));
    await it.putKeyFor('u-0001', JSON.stringify(renewed));
    check('renew: the person\'s page sees a newer filekey', await S.isNewer(S.readKey(await mine.getKey()), copy, env.pinned) === true);

    // ---- permission ----
    const denied = Object.assign(makeMemoryFolder('Locked'), { queryPermission: async function () { return 'prompt'; }, requestPermission: async function () { return 'denied'; } });
    check('permission: a folder the browser hasn\'t re-allowed isn\'t used (person)', await code(function () { return Mailbox.openPersonal(denied); }, 'no-permission'));
    check('permission: ...nor by IT', await code(function () { return Mailbox.openIT(denied); }, 'no-permission'));
    check('permission: no folder access in this browser is said plainly', await code(function () { return Mailbox.pick(); }, 'no-folder-access'));
}
