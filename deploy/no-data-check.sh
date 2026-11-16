#!/usr/bin/env bash
# Nothing that is data, a key, or a filled-in trust file may be in the repo:  a release is built from it, and published.
#     bash deploy/no-data-check.sh
# One check that found nothing obvious. It does not look at the history.
set -euo pipefail
bad=0

# 1. no data files, packs, key files or keyrings are tracked
found="$(git ls-files | grep -iE '\.(flogic|flogic-key|flogic-keyring|flogic-signer|flogic-id|csv|tsv|xlsx|xls|sql|db|sqlite|zip|7z|rar)$' || true)"
if [ -n "$found" ]; then
    echo "$found"
    echo "::error::Data or key files are tracked (listed above). They do not belong in the repo: take them out, and tell the team if they were real."
    bad=1
fi

# 2. the trust file in the repo is the blank one  (a filled-in one ships with a build, never with the source)
if ! grep -q 'const FLOGIC_IT_SIGNER = null;' DataPage/it-signerI.js; then
    echo "::error::DataPage/it-signerI.js is filled in. The repo keeps the blank one; a deployment mounts its own (see deploy/README.md)."
    bad=1
fi

# 3. nothing credential-shaped sitting in a quoted string, in code  (the same narrow look as week 10's sentinel)
PATTERN="(x-class-token|class_?token|team_?password|password|passwd|api[_-]?key|secret|connection_?string)[\"']?[[:space:]]*[:=][[:space:]]*[\"'][^\"']{4,}[\"']"
ALLOW="your|paste|example|placeholder|todo|xxx|changeme|redacted|<|\.\.\."
mapfile -t FILES < <(git ls-files | grep -vE '(^|/)\.github/|\.md$|\.html$|^deploy/no-data-check\.sh$' || true)
if [ ${#FILES[@]} -gt 0 ]; then
    HITS="$(grep -nIiE "$PATTERN" "${FILES[@]}" 2>/dev/null | grep -viE "$ALLOW" || true)"
    if [ -n "$HITS" ]; then
        echo "$HITS"
        echo "::error::Something credential-shaped is in a quoted string (listed above). If it is real: tell the team so it can be changed. Deleting the line does not take it out of the history."
        bad=1
    fi
fi

[ "$bad" = "0" ] || exit 1
echo "No data, no key files, a blank trust file, nothing credential-shaped: one check passed, not a clean bill of health."
