@echo off
setlocal enabledelayedexpansion

:: =============================================================
:: PM2 REANIMADOR - OmniPOS
:: Este script garantiza que PM2 y la app siempre esten activos.
:: =============================================================

set "APP_NAME=omni-pos"
set "LOG_FILE=pm2-reanimador-bat.log"

echo [%date% %time%] === INICIANDO REANIMADOR === >> %LOG_FILE%

:: 1. Detectar Carpeta de la Aplicacion
echo Buscando carpeta de la aplicacion...

if exist "C:\JoyeriaPlus\package.json" (
    set "APP_DIR=C:\JoyeriaPlus"
) else if exist "C:\JoyeriaPlus\JoyeriaPlus\package.json" (
    set "APP_DIR=C:\JoyeriaPlus\JoyeriaPlus"
) else if exist "%~dp0package.json" (
    set "APP_DIR=%~dp0"
) else (
    echo [ERROR] No se encontro la carpeta de la aplicacion. >> %LOG_FILE%
    echo Error: No se encontro la carpeta de la aplicacion en C:\JoyeriaPlus o en la carpeta actual.
    pause
    exit /b 1
)

echo Carpeta detectada: %APP_DIR%
echo [%date% %time%] Carpeta detectada: %APP_DIR% >> %LOG_FILE%
cd /d "%APP_DIR%"

:: 2. Verificar Node.js
node -v >un 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. >> %LOG_FILE%
    echo Error: Node.js es requerido para ejecutar esta aplicacion.
    pause
    exit /b 1
)

:: 3. Verificar PM2
call pm2 -v >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 no encontrado. Instalando globalmente...
    echo [%date% %time%] Instalando PM2... >> %LOG_FILE%
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion de PM2. >> %LOG_FILE%
        echo Error: No se pudo instalar PM2.
        pause
        exit /b 1
    )
)

:: 4. Verificar Estado de la App en PM2
echo Verificando estado de '%APP_NAME%'...
call pm2 describe %APP_NAME% >nul 2>&1
if %errorlevel% neq 0 (
    echo App '%APP_NAME%' no encontrada en PM2. Iniciando...
    echo [%date% %time%] Iniciando app por primera vez... >> %LOG_FILE%
    
    if not exist ".next" (
        echo Build no encontrado. Ejecutando npm run build...
        call npm run build
    )
    
    call pm2 start npm --name %APP_NAME% -- start
) else (
    :: La app existe, verificar si esta online
    for /f "tokens=*" %%i in ('call pm2 jlist') do set "PM2_JSON=%%i"
    echo %PM2_JSON% | findstr /i "online" >nul
    if %errorlevel% neq 0 (
        echo La app no esta ONLINE. Reiniciando...
        echo [%date% %time%] App no online. Reiniciando... >> %LOG_FILE%
        call pm2 restart %APP_NAME%
    ) else (
        echo La app esta funcionado correctamente.
        echo [%date% %time%] App esta ONLINE. >> %LOG_FILE%
    )
)

:: 5. Guardar configuracion
echo Guardando configuracion de PM2...
call pm2 save --force

echo [%date% %time%] === REANIMADOR FINALIZADO === >> %LOG_FILE%
echo Proceso completado.
timeout /t 5
