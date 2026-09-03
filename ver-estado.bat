@echo off
title Estado OmniPOS
echo.
echo ==========================================
echo   ESTADO DE OMNIPOS
echo ==========================================
echo.
call pm2 status
echo.
echo ==========================================
echo   URL: http://localhost:3000
echo   RED: http://%COMPUTERNAME%:3000
echo ==========================================
echo.
pause
