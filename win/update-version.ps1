#Requires -Version 5.1
<#
.SYNOPSIS
  Met à jour la version affichée (appVersion.ts) et celle de package.json.
.PARAMETER Version
  Nouvelle version (ex. 0.2.0). Obligatoire.
.EXAMPLE
  .\update-version.ps1 0.2.0
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $Version
)

$Version = $Version.Trim()
if ($Version -eq '') {
    Write-Host "Usage: .\update-version.ps1 <version>   (ex. 0.2.0)" -ForegroundColor Yellow
    exit 1
}

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$appVersionPath = Join-Path $root 'frontend\wk-frontend\src\core\appVersion.ts'
$packageJsonPath = Join-Path $root 'frontend\wk-frontend\package.json'

if (-not (Test-Path $appVersionPath)) {
    Write-Error "Fichier introuvable: $appVersionPath"
    exit 1
}
if (-not (Test-Path $packageJsonPath)) {
    Write-Error "Fichier introuvable: $packageJsonPath"
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
Write-Host "  Version actuelle (sidebar / appVersion.ts) : " -NoNewline
Write-Host $(if ($null -ne $currentUi) { $currentUi } else { '(non lue)' }) -ForegroundColor Cyan
Write-Host "  Version actuelle (package.json)           : " -NoNewline
Write-Host $(if ($null -ne $currentPkg) { $currentPkg } else { '(non lue)' }) -ForegroundColor Cyan
Write-Host "  Nouvelle version                          : " -NoNewline
Write-Host $Version -ForegroundColor Yellow
Write-Host ""
Write-Host '  Appuyez sur Entree pour appliquer, ou Ctrl+C pour annuler.' -ForegroundColor DarkGray
$null = Read-Host

$newApp = $appRaw -replace '(APP_VERSION_LABEL\s*=\s*")[^"]*(")', "`${1}$Version`$2"
$newPkg = $pkgRaw -replace '("version"\s*:\s*")[^"]*(")', "`${1}$Version`$2"

if ($newApp -eq $appRaw) {
    Write-Warning "Aucun remplacement dans appVersion.ts (motif inchangé ?)."
}
if ($newPkg -eq $pkgRaw) {
    Write-Warning "Aucun remplacement dans package.json (motif inchangé ?)."
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
Write-Host '  OK - version mise a jour vers ' -NoNewline -ForegroundColor Green
Write-Host $Version -ForegroundColor Green
Write-Host ""
