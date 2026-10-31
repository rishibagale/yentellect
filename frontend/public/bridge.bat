@echo off
setlocal enabledelayedexpansion
title Yentellect Local AI Bridge

set "BRIDGE_DIR=%USERPROFILE%\.yentellect-bridge"
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"

echo ==============================================================
echo             Yentellect Local AI Bridge (Free Models)
echo ==============================================================
echo.

:: 1. Check if Bun is already installed on PATH
where bun >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "BUN_CMD=bun"
    goto :start_proxy
)

:: 2. Check if cached in bridge directory
if exist "%BRIDGE_DIR%\bun-windows-x64\bun.exe" (
    set "BUN_CMD=%BRIDGE_DIR%\bun-windows-x64\bun.exe"
    goto :start_proxy
)

echo [*] Initial setup: Downloading lightweight runner for Windows...
echo [*] This only happens once.
curl.exe -sL "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip" -o "%BRIDGE_DIR%\bun.zip"
tar.exe -xf "%BRIDGE_DIR%\bun.zip" -C "%BRIDGE_DIR%"
del "%BRIDGE_DIR%\bun.zip" >nul 2>&1
set "BUN_CMD=%BRIDGE_DIR%\bun-windows-x64\bun.exe"

:start_proxy
:: 3. Fetch latest proxy bridge
echo [*] Syncing model bridge...
curl.exe -sL "https://raw.githubusercontent.com/12errh/zen-proxy/main/zen-proxy.mjs" -o "%BRIDGE_DIR%\zen-proxy.mjs"

echo.
echo ==============================================================
echo  [v] BRIDGE RUNNING ON: http://127.0.0.1:8787
echo  [*] Models Available:  big-pickle, deepseek-v4.1-flash-free
echo  [*] Status:             Connected to OpenCode Free Tier
echo ==============================================================
echo.
echo  Keep this Command Prompt window open while using Yentellect.
echo  Your browser will automatically route queries through this bridge.
echo.

"%BUN_CMD%" "%BRIDGE_DIR%\zen-proxy.mjs"

