@echo off
title Facebook Automation Website - AlphaPost
echo ===================================================
echo   Starting Facebook Automation Website (AlphaPost)
echo ===================================================
echo.
cd /d "%~dp0"
echo Starting local web server...
start "" cmd /c "timeout /t 3 /nobreak > nul & start http://localhost:3000"
npm.cmd start
pause
