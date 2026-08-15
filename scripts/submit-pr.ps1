# Windows entry point for verified PR submission. See scripts/submit-pr.mjs for the invariant.
#
#   .\scripts\submit-pr.ps1
#   .\scripts\submit-pr.ps1 --draft --base=develop
#   .\scripts\submit-pr.ps1 --dry-run

$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'submit-pr.mjs') @args
exit $LASTEXITCODE
