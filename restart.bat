@echo off
title Omni Inventario + - REINICIAR
cd /d "%~dp0"
echo.
echo Reiniciando Omni Inventario + (PM2)...
echo.
call pm2 restart ecosystem.config.cjs --env production
if %errorlevel% neq 0 (
    echo.
    echo Error al reiniciar. Intentando iniciar si estaba detenida...
    call pm2 start ecosystem.config.cjs --env production
) else (
    echo.
    echo Aplicacion reiniciada correctamente.
)
echo.
call pm2 list
echo.
pause
