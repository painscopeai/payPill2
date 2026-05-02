<#
.SYNOPSIS
  Pin this clone to a single GitHub login for HTTPS pushes (fewer GCM account prompts).

.DESCRIPTION
  Sets repo-local config so Git Credential Manager prefers one GitHub user for github.com,
  and embeds that user in the origin URL (recommended by GCM for multi-account setups).

  Use your real GitHub USERNAME (profile handle), not the org name, unless they match.
  Default is "painscopeai" — change with -GitHubAccount if your handle differs.

.EXAMPLE
  .\scripts\configure-painscope-git-remote.ps1
.EXAMPLE
  .\scripts\configure-painscope-git-remote.ps1 -GitHubAccount "YourGitHubHandle"
#>
[CmdletBinding()]
param(
	[Parameter()]
	[string] $GitHubAccount = "painscopeai"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

# Per-path credentials: this repo does not share the same GCM slot as all of github.com
git config --local credential.useHttpPath true

# Hint GCM which GitHub.com account to use
git config --local credential."https://github.com".username $GitHubAccount

# Embed user in HTTPS remote — strongly binds pushes to this login for this remote
$remoteUrl = "https://${GitHubAccount}@github.com/painscopeai/payPill2.git"
git remote set-url origin $remoteUrl

Write-Host "Configured for GitHub account: $GitHubAccount" -ForegroundColor Green
Write-Host "Origin is now:" -ForegroundColor Cyan
git remote get-url origin
