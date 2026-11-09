# SCANME

The short, read-this-first documents for the agents (and people) working on Flogic. If a file is here, it is current.

## What's in it

| File | What it is | For |
|---|---|---|
| `README.md` | This page: the index and the release conventions | everyone |
| `SSO-PERMISSION-v0.1.0.md` | Permission, limits and the brief for a rough SSO-style sign-in | Fernando's agent |
| `SSO-RETURN-v0.1.0.md` | The template Fernando's agent fills in and hands back, so DJ's agent can build it out | Fernando's agent, then DJ's agent |

Returns go in `SCANME/returns/`. The file name is the template name with the date added
(`SSO-RETURN-v0.1.0-2026-11-09.md`). Old returns stay; a new one never overwrites an old one.

## Release conventions

Taken from DJ's other repo, `Librariusjm` (its `CHANGELOG.md` and `COORDINATION.md`). Change them here, once, and every
SCANME file follows.

1. **Versions are `MAJOR.MINOR.PATCH`.** Before the Nov 19 demo everything is `0.x`. The first thing we show as the real
   product is `1.0.0`. Nothing is tagged yet, so the first tag is `v0.1.0`.
   - `PATCH`: a fix, nothing new to learn.
   - `MINOR`: something new people can see or use.
   - `MAJOR`: something that breaks an old file or habit (for us: a changed `.flogic` or `.flogic-id` format).
2. **Task files carry their version in the name**: `SSO-PERMISSION-v0.1.0.md`. A new version is a new file.
3. **Every release gets a `CHANGELOG.md` entry** (it will live at the repo root, written when the first release is cut),
   in plain words, under these headings, left out when empty: **New**, **Safer**, **Fixed**, **Known limits**.
   Say what a person can now do, not which function changed. Known limits are written honestly.
4. **Commit messages:** `Area: what changed`, then a blank line, then bullets. Areas here: `Vault`, `IT console`, `SSO`,
   `Dashboard`, `Focus`, `Relay`, `SCANME`, `Tutorial`. A review pass is tagged `[review]`.
5. **Branches:** work goes on `group-BUFFER`, as the relay rules say. A draft that might not be kept goes on its own
   branch first: `sso-draft`.
6. **Honest claims.** Nothing here may say more than it does. "SSO-style" is not SSO until a real identity provider is
   involved (see `SSO-PERMISSION-v0.1.0.md`, section 3).
7. **Keywords:** the go-word for Fernando's agent stays **Keystone**, and DJ's "it's running" word stays **Cornerstone**.
