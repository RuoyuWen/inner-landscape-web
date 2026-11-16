@echo off
setlocal
cd /d "%~dp0"
start "Inner Landscape Server" /min python "%~dp0local_server.py"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8765/inner-landscape-app/"
endlocal
