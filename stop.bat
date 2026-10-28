@echo off
title Stop DO-DocTrax Server
echo Stopping DO-DocTrax background server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq DO-DocTrax*" 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*server.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo DO-DocTrax has been stopped successfully.
timeout /t 2 >nul
