@echo off
setlocal
cd /d "%~dp0"

title SWP391 Dev + MCP

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev-with-mcp.ps1"

if errorlevel 1 (
  echo.
  echo Script loi. Nhan phim bat ky de dong...
  pause >nul
)
