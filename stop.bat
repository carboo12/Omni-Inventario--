@echo off
title OmniPOS - STOP
cd /d "%~dp0"
echo.
echo Deteniendo omni-pos...
echo.
call pm2 stop omni-pos
if %errorlevel% neq 0 (
    echo.
    echo No se pudo detener la aplicacion. Es posible que no este corriendo.
) else (
    echo.
    echo Aplicacion detenida correctamente.
)
echo.
pause
