@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js saknas. Installera Node.js 24 fran https://nodejs.org/
  pause
  exit /b 1
)
npm run open
if errorlevel 1 pause
