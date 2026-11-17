# Deploying Flogic with Docker

Flogic is a page of files: it opens a person's data **in their own browser**, and nothing is sent to a server. So the
container is a small web server (nginx) that hands out those files, and holds nothing else: **no data, no keys, no
passwords.** Anyone can open the address and see the app. Only someone with a key file from IT sees data, and that
data comes from their own drive folder, not from the server.

## Run it

Any machine with Docker:

```
docker compose up -d --build        # build it here and start it
```

Then open **http://localhost:8080**. Stop it with `docker compose down`.

Or use the image CI published (no build needed):

```
docker run -d -p 8080:8080 --read-only --tmpfs /tmp ghcr.io/icstars-milwaukee/icstars-rfp-molson-cycle21-flogic:0.3.0
```

## Put it on a real address: it must be HTTPS

Signing in with a key file uses the browser's own locks (`crypto.subtle`) and its folder picker. Browsers only allow
those on `https://` addresses and on `localhost`. On a plain `http://` address the app still opens plain files, but
**sign-in is off**. So put the container behind HTTPS: a host that adds it for you (Render, Fly.io, Azure Container
Apps, Cloud Run), or your own reverse proxy with a certificate. The container itself listens on port 8080, without
TLS.

## The trust file (who the app believes)

The app only accepts key files signed by IT's signing key. It carries the **public** half in
`DataPage/it-signerI.js`. The repo, and so the image, has the blank one: key-file sign-in is off until IT's is put in.

1. In IT's console: **Signing key → Download the app's trust file**.
2. Put that `it-signerI.js` next to `docker-compose.yml`.
3. Take the `#` off the two `volumes:` lines in `docker-compose.yml`, then `docker compose up -d`.

It is not a secret (it is a public key), but it is never committed: whoever swaps that file decides who the app
trusts.

## IT's console

Left out of the image unless asked for: `docker build --build-arg IT_CONSOLE=1 -t flogic .` (or `IT_CONSOLE: "1"` in
`docker-compose.yml`), then `/it-console/it-console.html`. It holds no secret either: the keyring is a file IT
opens with a passphrase. It is left out so a public address doesn't show an admin page to everyone.

## What makes "no data" true, and how it is checked

| Where | What stops data getting out |
|---|---|
| `.dockerignore` | Only `DataPage/`, `it-console/` and `deploy/nginx.conf` reach Docker at all |
| `Dockerfile`, stage 1 | The build **fails** if a page folder holds anything but `.html .js .css` and pictures |
| `deploy/nginx.conf` | Data and key file names (`.csv .xlsx .sql .flogic .flogic-key` ...) always answer 404 |
| `deploy/nginx.conf` | `connect-src 'none'`: the browser stops the page sending anything anywhere |
| `deploy/no-data-check.sh` | CI fails if a data or key file is tracked, or the trust file in the repo is filled in |
| The container | Read-only disk, not root, no capabilities |

## The check that runs every time

`.github/workflows/ci.yml`, on every push and pull request:

1. **It builds:** every script parses, and the image builds.
2. **It is alive, and it is ours:** `deploy/smoke.sh` against the running container. Not just "200": it looks for
   Flogic's own title and file picker, asks for every script the page names, and checks the headers.
3. **It is right:** `tests/preset-core-test.mjs`, on made-up rows: key files, the data that rides in them,
   and every way of tampering with one.

On a `release/*` branch or a `v*` tag, a green run publishes the image to `ghcr.io`.

Point the same smoke test at the live address once there is one:

```
bash deploy/smoke.sh https://your-address
```

## No Docker on this machine?

`node deploy/stand-in.mjs` serves the same folders with the same rules, and takes its headers from
`deploy/nginx.conf`. It is for checking (`bash deploy/smoke.sh http://127.0.0.1:8080`), not for deploying.

**Not yet seen running:** the image itself. The machine this was written on has no Docker. The first CI run on
GitHub is the first real build: look at the Actions tab before relying on it.
