@echo off
setlocal enabledelayedexpansion
title Research Workbench Local AI Bridge & MCP Server

set "BRIDGE_DIR=%USERPROFILE%\.yentellect-bridge"
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"

echo ==============================================================
echo     Research Workbench Local AI Bridge & Model Context Protocol
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
:: 3. Fetch latest bridge server & MCP utilities
echo [*] Syncing model bridge and MCP tools...
curl.exe -sL "https://yentellect.vercel.app/bridge-server.mjs" -o "%BRIDGE_DIR%\bridge-server.mjs"
curl.exe -sL "https://yentellect.vercel.app/mcp-utils.mjs" -o "%BRIDGE_DIR%\mcp-utils.mjs"

echo.
echo ==============================================================
echo  [v] BRIDGE RUNNING ON: http://127.0.0.1:8787
echo  [*] Models Available:  big-pickle (OpenCode Free), llama3.3 (Ollama)
echo  [*] MCP Endpoint:      http://127.0.0.1:8787/mcp (Cline, Claude Code, Cursor)
echo  [*] Status:             CORS, PNA & SSE Enabled
echo ==============================================================
echo.
echo  Keep this Command Prompt window open while using the workbench.
echo  Your browser and MCP coding agents will route through this bridge.
echo.

"%BUN_CMD%" "%BRIDGE_DIR%\bridge-server.mjs"
