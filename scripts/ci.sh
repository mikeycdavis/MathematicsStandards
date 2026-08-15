#!/usr/bin/env sh
# POSIX entry point for the full local CI pipeline. See scripts/ci.mjs for what it does.
#
# Deliberately two lines of logic. The orchestration lives in one cross-platform Node script so that
# the PowerShell and POSIX entry points cannot drift apart; anything added here would exist on only
# one platform. This is also the command a self-hosted runner would invoke.
#
#   ./scripts/ci.sh
#   ./scripts/ci.sh --verbose --keep-on-failure
set -eu
exec node "$(dirname "$0")/ci.mjs" "$@"
