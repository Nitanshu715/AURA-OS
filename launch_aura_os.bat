@echo off
setlocal enabledelayedexpansion
title AURA-OS Universal Native Launcher

echo ===============================================================================
echo                AURA-OS (Application-Defined Engineered Desktop)
echo ===============================================================================
echo [1/3] Checking Core Server status...

:: Check if server is already responding on port 8888
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' })" >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] AURA-OS Core Server is already online on http://localhost:8888
) else (
    echo [*] Starting AURA-OS Core Engine in background...
    start /b "" python "%~dp0aura_core\server.py"
    :: Give the daemon a moment to bind the socket
    powershell -NoProfile -Command "Start-Sleep -Milliseconds 1200"
)

echo [2/3] Detecting optimal Chromium-grade display engine...

set "BROWSER_EXE="

:: 1. Check Google Chrome 64-bit
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    goto :LAUNCH
)

:: 2. Check Google Chrome 32-bit
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    goto :LAUNCH
)

:: 3. Check Google Chrome Local AppData
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    goto :LAUNCH
)

:: 4. Check Microsoft Edge 64-bit
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    goto :LAUNCH
)

:: 5. Check Microsoft Edge 32-bit
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    goto :LAUNCH
)

:LAUNCH
if defined BROWSER_EXE (
    echo [+] Launching AURA-OS in Frameless Dedicated App Window via:
    echo     "!BROWSER_EXE!"
    start "" "!BROWSER_EXE!" --app=http://localhost:8888 --start-maximized --disable-features=Translate,OptimizationHints
) else (
    echo [!] Chromium binary not found in standard paths. Launching default browser...
    start "" "http://localhost:8888"
)

echo [3/3] AURA-OS Desktop initialized successfully.
echo ===============================================================================
exit /b 0
