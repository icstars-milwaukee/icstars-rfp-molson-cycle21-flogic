#!/usr/bin/env bash
# "Is it alive, and is it OURS?"     bash deploy/smoke.sh http://127.0.0.1:8080      (or the live address)
#
# A 200 is not enough: a 404 page answers too, and so does a stale deploy.  So this looks for things only Flogic has,
# asks for every file the page names, and checks the two promises: nothing can be sent out, and no data is served.
#   IT_CONSOLE=1 bash deploy/smoke.sh <address>     when the image was built with IT's console
set -euo pipefail
URL="${1:?the address, like http://127.0.0.1:8080}"
URL="${URL%/}"
fail() { echo "::error::$*"; echo "FAIL $*"; exit 1; }
pass() { echo "PASS $*"; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }

# 1. alive
[ "$(curl -fsS --max-time 20 "$URL/healthz")" = "ok" ] || fail "/healthz did not answer ok"
pass "/healthz answers ok"

# 2. the bare address lands on the app, and the page is ours
PAGE="$(curl -fsSL --max-time 20 "$URL/")"
#    (Checks read from here-strings, not "echo | grep -q": with pipefail, that can fail falsely when grep leaves early.)
grep -q '<title>Flogic</title>' <<<"$PAGE" || fail "the address answered, but the page is not Flogic (no <title>Flogic</title>)"
grep -q 'id="csvFileInput"' <<<"$PAGE" || fail "the page has no file picker: not the Flogic app"
pass "the address opens the Flogic app"

# 3. every script and stylesheet the page names is really there
n=0
NAMES="$(grep -oE '(src|href)="[A-Za-z0-9_.-]+[.](js|css)"' <<<"$PAGE" | cut -d'"' -f2 | sort -u)"
for f in $NAMES; do
    c="$(code "$URL/DataPage/$f")"
    [ "$c" = "200" ] || fail "the page names $f, and the server answers $c for it"
    n=$((n + 1))
done
[ "$n" -ge 10 ] || fail "only $n scripts and stylesheets found on the page: that is not the whole app"
pass "all $n scripts and stylesheets the page names are served"

# 4. the browser is told the page may not send anything anywhere, and may run only its own scripts
HEAD="$(curl -fsSI --max-time 20 "$URL/DataPage/flogic.html" | tr -d '\r')"
CSP="$(grep -i '^content-security-policy:' <<<"$HEAD" || true)"
grep -q "connect-src 'none'" <<<"$CSP" || fail "no Content-Security-Policy with connect-src 'none'"
grep -q "script-src 'self'" <<<"$CSP" || fail "the Content-Security-Policy does not keep scripts to the app's own"
grep -qi '^x-content-type-options: nosniff' <<<"$HEAD" || fail "no X-Content-Type-Options: nosniff"
pass "the headers forbid sending data out and running outside scripts"

# 5. no data, no keys, whatever the name
for f in DataPage/incident.csv DataPage/flogic.flogic-key it.flogic-keyring DataPage/pack.flogic demo.xlsx; do
    c="$(code "$URL/$f")"
    [ "$c" = "404" ] || fail "$f answered $c: data and key files must never be served"
done
pass "data and key files are not served"

# 6. IT's console: only when it was asked for
c="$(code "$URL/it-console/it-console.html")"
if [ "${IT_CONSOLE:-0}" = "1" ]; then
    [ "$c" = "200" ] || fail "IT's console was asked for, and the server answers $c"
    IT_PAGE="$(curl -fsS --max-time 20 "$URL/it-console/it-console.html")"
    grep -q '<title>Flogic IT console</title>' <<<"$IT_PAGE" || fail "/it-console/ is not IT's console"
    pass "IT's console is served (it was asked for)"
else
    [ "$c" = "404" ] || fail "IT's console answers $c, and this image was built without it"
    pass "IT's console is not in this image"
fi

echo "Alive, and it is ours: $URL"
