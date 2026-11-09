@echo off
chcp 65001 >nul
title Đẩy code lên GitHub - Game_khong_hay
echo ======================================================================
echo    ĐANG ĐẨY CODE LÊN GITHUB: quythang869/Game_khong_hay
echo ======================================================================
echo.

git push -u origin main

echo.
echo ======================================================================
if %ERRORLEVEL% EQU 0 (
    echo    [THÀNH CÔNG] Code đã được đẩy lên GitHub thành công!
) else (
    echo    [LƯU Ý] Nếu gặp lỗi xác thực, hãy kiểm tra lại đăng nhập GitHub.
)
echo ======================================================================
echo.
pause
