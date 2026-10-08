@echo off
title AURA-OS Cybernetic Neural Core
echo =======================================================
echo    [+] INITIALIZING AURA-OS CYBERNETIC HUD & ENGINE
echo =======================================================
start "" "http://localhost:8888"
python "%~dp0aura_core\server.py"
pause