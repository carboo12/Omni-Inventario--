@echo off
setlocal
cd /d "%~dp0"
title Omni Inventario + (Produccion)

echo.
echo ===================================================
echo  Omni Inventario +  ^|  Servidor de Produccion
echo  Puerto: 9003  ^|  Arquitectura: Vite SPA + Hono
echo ===================================================
echo.

set NODE_ENV=production
set PORT=9003

REM Verificar que el build existe antes de iniciar
if not exist "dist-server\index.mjs" (
    echo [ERROR] No se encontro dist-server\index.mjs
    echo         Ejecuta deploy.ps1 para compilar la aplicacion primero.
    echo.
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    echo [ERROR] No se encontro dist\index.html
    echo         El frontend SPA no esta compilado. Ejecuta deploy.ps1.
    echo.
    pause
    exit /b 1
)

echo Iniciando servidor Hono...
echo.
echo Presiona Ctrl+C para detener.
echo.

node dist-server/index.mjs

echo.
echo Servidor detenido.
pause
