@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo    DUNG MAY CHU: VAN PHONG VA THE GIOI TRON VIEC 2D
echo ======================================================================
echo.

echo Dang tim va tat cac tien trinh tren cong 8080 va 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 8080, 8000 -ErrorAction SilentlyContinue; if ($conns) { $conns | ForEach-Object { Write-Host ('   - Da dung tien trinh PID ' + $_.OwningProcess + ' tren cong ' + $_.LocalPort) -ForegroundColor Yellow; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } else { Write-Host '   Khong co tien trinh nao dang chay tren cong 8080 va 8000.' -ForegroundColor Cyan }"

echo.
echo ======================================================================
echo    TAT CA SERVER DA DUOC TAT VA GIAI PHONG CONG THANH CONG!
echo ======================================================================
echo.
pause
