@echo off
cd /d "%~dp0"
title OMNI INVENTARIO + :: Verificador de Conexion MySQL

echo ========================================================
echo   DIAGNOSTICO DE CONEXION MYSQL (ERROR P1000 / .ENV)
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR CRITICO] Node.js no esta disponible en el PATH.
    echo Instale Node.js o agreguelo a las variables de entorno.
    echo.
    pause
    exit /b 1
)

node scripts/verify-db-connection.mjs

echo.
pause
