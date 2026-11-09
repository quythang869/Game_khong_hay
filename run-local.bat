@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo    KHOI CHAY: VAN PHONG VA THE GIOI TRON VIEC 2D (BUOC #0)
echo ======================================================================
echo.

:: 1. Tao thu muc logs neu chua co
if not exist logs mkdir logs

:: 2. Tu dong giai phong cong 8080 va 8000 neu dang bi chiem
echo [1/4] Kiem tra va giai phong cong 8080 va 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 8080, 8000 -ErrorAction SilentlyContinue; if ($conns) { $conns | ForEach-Object { Write-Host ('   - Giai phong PID ' + $_.OwningProcess + ' chiem cong ' + $_.LocalPort) -ForegroundColor Yellow; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } else { Write-Host '   - Cong 8080 va 8000 san sang.' -ForegroundColor Cyan }"

:: 3. Bien dich CSS voi Tailwind
echo.
echo [2/4] Kiem tra va bien dich Tailwind CSS (styles.css)...
call npm run build > logs\build.log 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '   [!] Canh bao: Build CSS co loi, xem chi tiet tai logs\build.log' -ForegroundColor Red"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '   + Da tao xong public/styles.css' -ForegroundColor Green"
)

:: 4. Khoi chay WebSocket Server va Static Web Server chay nen
echo.
echo [3/4] Dang khoi chay WebSocket Server (:8080) va Web Static (:8000)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process node -ArgumentList 'server/server.js' -WorkingDirectory '%~dp0' -RedirectStandardOutput '%~dp0logs\server.log' -RedirectStandardError '%~dp0logs\server.err.log' -WindowStyle Hidden"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c npx --yes serve public -l 8000 -n > \"%~dp0logs\web.log\" 2>&1' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

:: Doi 3 giay de server san sang
ping 127.0.0.1 -n 4 >nul

:: Kiem tra trang thai server qua TCP port listen
echo.
echo [4/4] Kiem tra trang thai ket noi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; if ($ws) { Write-Host '   + WebSocket Server: ws://localhost:8080 (HOAT DONG)' -ForegroundColor Green } else { Write-Host '   - WebSocket Server: Chua phan hoi, kiem tra logs\server.err.log' -ForegroundColor Red }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$web = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($web) { Write-Host '   + Static Web Server: http://localhost:8000 (HOAT DONG)' -ForegroundColor Green } else { Write-Host '   - Static Web Server: Dang khoi dong, kiem tra logs\web.log' -ForegroundColor Yellow }"

:: 5. Tu dong mo 2 tab trinh duyet
echo.
echo Dang mo 2 tab trinh duyet de thu 2 nguoi choi...
start http://localhost:8000
ping 127.0.0.1 -n 2 >nul
start http://localhost:8000

echo.
echo ======================================================================
echo    TRO CHOI DA SAN SANG!
echo    - May tinh (Local): http://localhost:8000
echo    - Realtime Server:  ws://localhost:8080
powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Net.Dns]::GetHostEntry('').AddressList | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' -and $_.IPAddressToString -notlike '169.254.*' } | ForEach-Object { Write-Host ('   - Dien thoai (cung Wi-Fi): http://' + $_.IPAddressToString + ':8000') -ForegroundColor Cyan }"
echo    - Nhat ky logs:     Thu muc logs\ (server.log, web.log)
echo    - De tat server:    Nhap dup chuot vao file stop-local.bat
echo ======================================================================
echo.
pause
