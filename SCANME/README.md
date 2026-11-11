# SCANME

The short, read-this-first documents for the agents (and people) working on Flogic. If a file is here, it is current.

## What's in it

| File | What it is | For |
|---|---|---|
| `README.md` | This page: the index and the release conventions | everyone |
| `SSO-PERMISSION-v0.1.0.md` | Permission, limits and the brief for a rough SSO-style sign-in | Fernando's agent |
| `STANDBY-v0.2.0.md` | Puts Fernando's agent on standby: what to watch, what to run, what to do on Keystone | Fernando's agent |
| `AUDIT-v0.2.0.md` | Security audit of the shared-folder sign-in: fixed, tested, still open | everyone |
| `SSO-RETURN-v0.1.0.md` | The template Fernando's agent fills in and hands back, so DJ's agent can build it out | Fernando's agent, then DJ's agent |

Returns go in `SCANME/returns/`. The file name is the template name with the date added
(`SSO-RETURN-v0.1.0-2026-11-09.md`). Old returns stay; a new one never overwrites an old one.

## Release conventions

Taken from DJ's other repo, `Librariusjm` (its `CHANGELOG.md` and `COORDINATION.md`). Change them here, once, and every
SCANME file follows.

1. **Versions are `MAJOR.MINOR.PATCH`.** Before the Nov 19 demo everything is `0.x`. The first thing we show as the real
   product is `1.0.0`. `v0.1.0` is tagged (the file-swap draft). `0.2.0` is the shared-folder version.
   - `PATCH`: a fix, nothing new to learn.
   - `MINOR`: something new people can see or use.
   - `MAJOR`: something that breaks an old file or habit (for us: a changed `.flogic` or `.flogic-id` format).
2. **Task files carry their version in the name**: `SSO-PERMISSION-v0.1.0.md`. A new version is a new file.
3. **Every release gets a `CHANGELOG.md` entry** (repo root),
   in plain words, under these headings, left out when empty: **New**, **Safer**, **Fixed**, **Known limits**.
   Say what a person can now do, not which function changed. Known limits are written honestly.
4. **Commit messages:** `Area: what changed`, then a blank line, then bullets. Areas here: `Vault`, `IT console`, `SSO`,
   `Dashboard`, `Focus`, `Relay`, `SCANME`, `Tutorial`. A review pass is tagged `[review]`.
5. **Branches:** work goes on `group-BUFFER`, as the relay rules say. A draft that might not be kept goes on its own
   branch first: `sso-draft`; a version being built goes on `feature/<name>` (now `feature/drive-signin`).
6. **Honest claims.** Nothing here may say more than it does. "SSO-style" is not SSO until a real identity provider is
   involved (see `SSO-PERMISSION-v0.1.0.md`, section 3).
7. **Keywords:** the go-word for Fernando's agent stays **Keystone**, and DJ's "it's running" word stays **Cornerstone**.

## Open questions (S1, for DJ and Fernando)

From `returns/SSO-RETURN-v0.1.0-2026-11-09.md`, section 9. These are decisions for people, not agents. Until they're
answered, the draft uses the cautious choice, shown in brackets.

1. **Default end date for a sign-in file:** 7 days or 30 days? A file can't be taken back early, so short is safer.
   Renewal costs the person nothing and takes IT about a minute. *(Draft: 7 days.)*
2. **No recovery code in the new way:** keep it dropped? A forgotten passphrase means "set up again, and IT sends a new
   file", and nothing is lost. People who don't care about security tend to lose recovery codes or tape them up.
   *(Draft: dropped.)*
3. **The laptop-code check:** IT asks the person to read their laptop code out loud, then ticks a box. Is the tick box
   enough, or should IT type the code back in? It's the one habit left that stops a fake request.
   *(v0.2.0: decided in the build. IT types the code back; see `AUDIT-v0.2.0.md`, A1.)*
4. **The Nov 19 demo:** show both sign-in ways (the old setup code and the new one), or the new one only?
   *(Draft: both, side by side.)*

Answer in `relay/dj-log.md` (DJ) or tell Fernando's agent, and the draft follows.
