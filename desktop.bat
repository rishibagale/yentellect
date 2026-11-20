@echo off
setlocal
echo ========================================================
echo  Launching Yentellect Research Workbench (Desktop App)
echo ========================================================

:: Check if server is running on port 3000
curl -sSf http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo Starting frontend development server...
    start /min "Yentellect Server" cmd /c "cd /d "%~dp0frontend" && npm run dev"
    timeout /t 4 /nobreak >nul
)

:: Launch in standalone native window (Edge App Mode)
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge --app=http://localhost:3000 --window-size=1440,900
) else (
    start "" http://localhost:3000
)
