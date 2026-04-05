#Requires -Version 5.1
<#
.SYNOPSIS
  Updates the displayed version (appVersion.ts) and frontend package.json.
.PARAMETER Version
  New version (e.g. 0.2.0). Optional: if omitted, the script prints current versions and prompts.
.EXAMPLE
  .\update-version.ps1 0.2.0
.EXAMPLE
  .\update-version.ps1
#>
param(
    [Parameter(Position = 0)]
    [string] $Version
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$appVersionPath = Join-Path $root 'frontend\wk-frontend\src\core\appVersion.ts'
$packageJsonPath = Join-Path $root 'frontend\wk-frontend\package.json'

if (-not (Test-Path $appVersionPath)) {
    Write-Error "File not found: $appVersionPath"
    exit 1
}
if (-not (Test-Path $packageJsonPath)) {
    Write-Error "File not found: $packageJsonPath"
    exit 1
}

$appRaw = Get-Content -LiteralPath $appVersionPath -Raw -Encoding UTF8
$pkgRaw = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8

$currentUi = $null
if ($appRaw -match 'APP_VERSION_LABEL\s*=\s*"([^"]*)"') {
    $currentUi = $Matches[1]
}

$currentPkg = $null
if ($pkgRaw -match '"version"\s*:\s*"([^"]*)"') {
    $currentPkg = $Matches[1]
}

Write-Host ""
Write-Host "  Current (sidebar / appVersion.ts) : " -NoNewline
Write-Host $(if ($null -ne $currentUi) { $currentUi } else { '(unread)' }) -ForegroundColor Cyan
Write-Host "  Current (package.json)              : " -NoNewline
Write-Host $(if ($null -ne $currentPkg) { $currentPkg } else { '(unread)' }) -ForegroundColor Cyan

if ($null -ne $Version -and $Version.Trim() -ne '') {
    $Version = $Version.Trim()
} else {
    Write-Host ""
    $Version = Read-Host "  New version (e.g. 0.2.0)"
    $Version = $Version.Trim()
    if ($Version -eq '') {
        Write-Host "Cancelled (no version)." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "  New version                         : " -NoNewline
Write-Host $Version -ForegroundColor Yellow
Write-Host ""
Write-Host '  Press Enter to apply, or Ctrl+C to cancel.' -ForegroundColor DarkGray
$null = Read-Host

$newApp = $appRaw -replace '(APP_VERSION_LABEL\s*=\s*")[^"]*(")', "`${1}$Version`$2"
$newPkg = $pkgRaw -replace '("version"\s*:\s*")[^"]*(")', "`${1}$Version`$2"

if ($newApp -eq $appRaw) {
    Write-Warning "No replacement in appVersion.ts (pattern unchanged?)."
}
if ($newPkg -eq $pkgRaw) {
    Write-Warning "No replacement in package.json (pattern unchanged?)."
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    $enc = New-Object System.Text.UTF8Encoding $false
    $out = $Text
    if (-not $out.EndsWith("`n")) {
        $out += "`n"
    }
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $Path).Path, $out, $enc)
}

Write-Utf8NoBom -Path $appVersionPath -Text $newApp
Write-Utf8NoBom -Path $packageJsonPath -Text $newPkg

Write-Host ""
Write-Host '  OK — version set to ' -NoNewline -ForegroundColor Green
Write-Host $Version -ForegroundColor Green
Write-Host ""
