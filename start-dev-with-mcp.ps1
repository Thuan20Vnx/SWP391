# Start SWP391 (BE + FE) + Chrome DevTools MCP + Cursor
# Usage: double-click start-dev-with-mcp.bat

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$ChromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ChromeProfile = Join-Path $env:TEMP "swp391-chrome-mcp"
$DebugPort = 9222
$AppUrl = "http://localhost:5173"
$McpConfigPath = Join-Path $env:USERPROFILE ".cursor\mcp.json"

function Write-Step($text, $color = "Cyan") {
  Write-Host $text -ForegroundColor $color
}

function Stop-PortProcess($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

function Test-PortListening($port) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return [bool]$listeners
}

function Ensure-McpConfig {
  $desired = @{
    mcpServers = @{
      "chrome-devtools" = @{
        command = "npx"
        args = @(
          "-y",
          "chrome-devtools-mcp@latest",
          "--browserUrl=http://127.0.0.1:$DebugPort"
        )
        env = @{}
      }
    }
  }

  $json = ($desired | ConvertTo-Json -Depth 6)
  $dir = Split-Path $McpConfigPath -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  $needsWrite = $true
  if (Test-Path $McpConfigPath) {
    try {
      $current = Get-Content $McpConfigPath -Raw | ConvertFrom-Json
      $server = $current.mcpServers."chrome-devtools"
      if ($server.command -eq "npx" -and ($server.args -join " ") -match "chrome-devtools-mcp") {
        $needsWrite = $false
      }
    } catch {
      $needsWrite = $true
    }
  }

  if ($needsWrite) {
    Set-Content -Path $McpConfigPath -Value $json -Encoding utf8
    Write-Host "[+] Da cap nhat MCP config: $McpConfigPath" -ForegroundColor Green
  } else {
    Write-Host "[=] MCP config da san sang" -ForegroundColor Gray
  }
}

function Find-CursorExe {
  $candidates = @(
    (Get-Command cursor -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
    "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd"
  ) | Where-Object { $_ -and (Test-Path $_) }

  return $candidates | Select-Object -First 1
}

Write-Host ""
Write-Step "========================================"
Write-Step " SWP391 Dev + Chrome DevTools MCP"
Write-Step "========================================"
Write-Host ""

if (-not (Test-Path $ChromeExe)) {
  Write-Host "[X] Khong tim thay Chrome tai: $ChromeExe" -ForegroundColor Red
  Write-Host "    Cai Google Chrome roi chay lai script." -ForegroundColor Yellow
  Read-Host "Nhan Enter de dong"
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[X] Khong tim thay Node.js trong PATH." -ForegroundColor Red
  Write-Host "    Cai Node.js LTS (>= 22) va mo lai Cursor." -ForegroundColor Yellow
  Read-Host "Nhan Enter de dong"
  exit 1
}

Ensure-McpConfig

Write-Step "[*] Dang dong process cu tren port 5000, 5173..."
Stop-PortProcess 5000
Stop-PortProcess 5173
Start-Sleep -Seconds 1

Write-Step "[*] Khoi dong Backend (localhost:5000)..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$Root\BE`" && npm.cmd run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Step "[*] Khoi dong Frontend (localhost:5173)..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$Root\FE`" && npm.cmd run dev" -WindowStyle Normal

Start-Sleep -Seconds 4

Write-Step "[*] Khoi dong Chrome cho MCP (port $DebugPort)..."
if (-not (Test-Path $ChromeProfile)) {
  New-Item -ItemType Directory -Path $ChromeProfile -Force | Out-Null
}

Start-Process -FilePath $ChromeExe -ArgumentList @(
  "--remote-debugging-port=$DebugPort",
  "--user-data-dir=$ChromeProfile",
  $AppUrl
) -WindowStyle Normal

Start-Sleep -Seconds 3

$cursorExe = Find-CursorExe
if ($cursorExe) {
  Write-Step "[*] Mo Cursor voi project..."
  Start-Process -FilePath $cursorExe -ArgumentList "`"$Root`""
} else {
  Write-Host "[!] Khong tim thay Cursor. Hay mo project thu cong." -ForegroundColor Yellow
}

Start-Sleep -Seconds 5

$beOk = Test-PortListening 5000
$feOk = Test-PortListening 5173
$chromeOk = Test-PortListening $DebugPort

Write-Host ""
Write-Step "========================================"
if ($beOk -and $feOk -and $chromeOk) {
  Write-Host "[OK] He thong san sang!" -ForegroundColor Green
} else {
  Write-Host "[!] Mot so dich vu chua san sang:" -ForegroundColor Yellow
  if (-not $beOk) { Write-Host "  - Backend port 5000" -ForegroundColor Yellow }
  if (-not $feOk) { Write-Host "  - Frontend port 5173" -ForegroundColor Yellow }
  if (-not $chromeOk) { Write-Host "  - Chrome debug port $DebugPort" -ForegroundColor Yellow }
}
Write-Step "========================================"
Write-Host ""
Write-Host "App:     $AppUrl" -ForegroundColor Yellow
Write-Host "API:     http://localhost:5000" -ForegroundColor Yellow
Write-Host "MCP:     http://127.0.0.1:$DebugPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "Trong Cursor:" -ForegroundColor Cyan
Write-Host "  1. Settings > MCP > bat chrome-devtools (neu chua bat)" -ForegroundColor Gray
Write-Host "  2. Reload MCP neu can (Restart MCP server)" -ForegroundColor Gray
Write-Host "  3. Agent co the dieu khien Chrome qua MCP DevTools" -ForegroundColor Gray
Write-Host ""
Write-Host "3 cua so terminal da mo (BE, FE). Giu chung de server chay." -ForegroundColor Gray
Write-Host ""

Read-Host "Nhan Enter de dong cua so nay (server van chay o cua so rieng)"
