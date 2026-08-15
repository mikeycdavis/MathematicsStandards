#!/usr/bin/env sh
# POSIX entry point for verified PR submission. See scripts/submit-pr.mjs for the invariant.
#
#   ./scripts/submit-pr.sh
#   ./scripts/submit-pr.sh --draft --base=develop
#   ./scripts/submit-pr.sh --dry-run
set -eu
exec node "$(dirname "$0")/submit-pr.mjs" "$@"
