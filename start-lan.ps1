# Start FE + BE for phone access on same WiFi

# Usage: .\start-lan.ps1



$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot

# Fixed LAN IP for phone access (same WiFi). Change if your PC gets a new IP.
$LanIp = "10.13.50.71"

Write-Host "========================================" -ForegroundColor Cyan

Write-Host " SWP391 LAN mode - IP: $LanIp" -ForegroundColor Cyan

Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""

Write-Host "Open on phone (same WiFi):" -ForegroundColor Green

Write-Host "  http://${LanIp}:5173" -ForegroundColor Yellow

Write-Host ""

Write-Host "Test BE from phone:" -ForegroundColor Green

Write-Host "  http://${LanIp}:5000/api/events/featured?limit=1" -ForegroundColor Yellow

Write-Host ""



$envLanLocal = Join-Path $Root "FE\.env.lan.local"

"VITE_API_BASE=http://${LanIp}:5000" | Set-Content -Path $envLanLocal -Encoding utf8

Write-Host "[+] Wrote $envLanLocal" -ForegroundColor Green



foreach ($port in @(5173, 5000)) {

  $ruleName = "SWP391 Port $port"

  $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

  if (-not $existing) {

    try {

      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -ErrorAction Stop | Out-Null

      Write-Host "[+] Firewall opened for port $port" -ForegroundColor Green

    } catch {

      Write-Host "[!] Could not open firewall port $port (run PowerShell as Admin)" -ForegroundColor DarkYellow

    }

  }

}



function Stop-PortProcess($port) {

  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

  foreach ($conn in $conns) {

    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue

  }

}



Write-Host "[*] Stopping old processes on ports 5000, 5173..." -ForegroundColor Gray

Stop-PortProcess 5000

Stop-PortProcess 5173

Start-Sleep -Seconds 1



Write-Host "[*] Starting Backend (0.0.0.0:5000)..." -ForegroundColor Gray

Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$Root\BE`" && set HOST=0.0.0.0&& set CLIENT_ORIGIN=http://${LanIp}:5173&& set APP_URL=http://${LanIp}:5173&& npm.cmd run dev" -WindowStyle Normal



Start-Sleep -Seconds 3



Write-Host "[*] Starting Frontend (LAN, bind 0.0.0.0:5173)..." -ForegroundColor Gray

Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$Root\FE`" && npm.cmd run dev:lan" -WindowStyle Normal



Start-Sleep -Seconds 6



function Test-LanPort($port) {

  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

  $onAll = $listeners | Where-Object { $_.LocalAddress -eq '0.0.0.0' }

  return [bool]$onAll

}



$beOk = Test-LanPort 5000

$feOk = Test-LanPort 5173



Write-Host ""

if ($beOk -and $feOk) {

  Write-Host "[OK] BE + FE listening on 0.0.0.0 — ready for phone" -ForegroundColor Green

} else {

  Write-Host "[!] Port check:" -ForegroundColor Yellow

  if (-not $beOk) { Write-Host "  - BE port 5000 not on 0.0.0.0 (check BE terminal window)" -ForegroundColor Yellow }

  if (-not $feOk) { Write-Host "  - FE port 5173 not on 0.0.0.0 — close FE and run: cd FE && npm run dev:lan" -ForegroundColor Yellow }

  Write-Host "  Do NOT use 'npm run dev' for phone — use start-lan.ps1 or npm run dev:lan" -ForegroundColor Yellow

}



Write-Host ""

Write-Host "Two terminal windows opened. Wait ~5s then open on phone:" -ForegroundColor Cyan

Write-Host "  http://${LanIp}:5173" -ForegroundColor Yellow

Write-Host ""

Write-Host "Desktop dev on this PC: use npm run dev at http://localhost:5173 (no LAN env needed)" -ForegroundColor Gray

