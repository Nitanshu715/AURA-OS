<#
.SYNOPSIS
    AURA-OS Native Host Desktop Launcher (PowerShell)
.DESCRIPTION
    Ensures AURA-OS Core daemon is listening on port 8888, detects Google Chrome or
    Microsoft Edge, and launches the desktop environment in maximized frameless app mode.
#>

$ErrorActionPreference = "SilentlyContinue"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "               AURA-OS (Application-Defined Engineered Desktop)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan

# 1. Verify Core Server
Write-Host "[1/3] Verifying Core Server daemon..." -ForegroundColor Yellow
$connection = Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }

if ($null -eq $connection) {
    Write-Host "[*] Launching AURA-OS Core Server in background..." -ForegroundColor Gray
    $serverPath = Join-Path $PSScriptRoot "aura_core\server.py"
    Start-Process -FilePath "python" -ArgumentList "`"$serverPath`"" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Milliseconds 1500
} else {
    Write-Host "[+] AURA-OS Core Server already active on http://localhost:8888" -ForegroundColor Green
}

# 2. Locate Chromium binary (Chrome or Edge)
Write-Host "[2/3] Detecting native Chromium execution engine..." -ForegroundColor Yellow

$candidatePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$targetExe = $null
foreach ($path in $candidatePaths) {
    if (Test-Path $path) {
        $targetExe = $path
        break
    }
}

# 3. Launch UI
Write-Host "[3/3] Launching AURA-OS desktop shell..." -ForegroundColor Yellow
if ($targetExe) {
    Write-Host "[+] Executing: $targetExe --app=http://localhost:8888 --start-maximized" -ForegroundColor Green
    Start-Process -FilePath $targetExe -ArgumentList "--app=http://localhost:8888", "--start-maximized", "--disable-features=Translate,OptimizationHints"
} else {
    Write-Host "[!] Chromium engine not found in standard paths. Opening system default browser..." -ForegroundColor Yellow
    Start-Process "http://localhost:8888"
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "AURA-OS Native Desktop launched successfully." -ForegroundColor Green
