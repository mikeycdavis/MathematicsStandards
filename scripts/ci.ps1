# Windows entry point for the full local CI pipeline. See scripts/ci.mjs for what it does.
#
# Deliberately two lines of logic. The orchestration lives in one cross-platform Node script so that
# the PowerShell and POSIX entry points cannot drift apart; anything added here would exist on only
# one platform.
#
#   .\scripts\ci.ps1
#   .\scripts\ci.ps1 --verbose --keep-on-failure

$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'ci.mjs') @args
exit $LASTEXITCODE
