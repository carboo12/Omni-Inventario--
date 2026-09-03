@echo off
setlocal
cd /d "%~dp0"
title Omni Inventario + - Despliegue a Produccion

echo ========================================================
echo   OMNI INVENTARIO +  -  DESPLIEGUE AUTOMATICO
echo   Arquitectura: Vite SPA + Hono API Server
echo ========================================================
echo.

REM 1. Install Dependencies
echo [1/6] Instalando dependencias completas...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias.
    pause
    exit /b %errorlevel%
)

REM 2. Generate Prisma Client + Sync DB schema
echo.
echo [2/6] Deteniendo app para liberar el query_engine DLL (evita EPERM)...
call node scripts\prisma-unlock.mjs
if %errorlevel% neq 0 (
    echo AVISO: no se pudo liberar el lock del DLL. Se continua de todos modos.
)

echo.
echo [2/6] Sincronizando Base de Datos (Prisma)...
REM Uso el script seguro para no perder datos y con reintentos ante bloques EPERM (Windows).
call node scripts\prisma-safe-deploy.mjs
if %errorlevel% neq 0 (
    echo Error al sincronizar la base de datos.
    echo Verifique que MySQL esta corriendo y que el .env es correcto.
    pause
    exit /b %errorlevel%
)
echo Base de datos sincronizada correctamente.

REM 3. Build Application
echo.
echo [3/6] Compilando aplicacion (Build)...
echo Esto puede tardar unos minutos...
call npm run build
if %errorlevel% neq 0 (
    echo Error durante el build. Limpiando dist/ y dist-server/ y reintentando...
    if exist dist        rmdir /s /q dist
    if exist dist-server rmdir /s /q dist-server
    call npm run build
    if %errorlevel% neq 0 (
        echo Error fatal en el build. Revise los logs.
        pause
        exit /b %errorlevel%
    )
)

REM 4. Check/Install PM2
echo.
echo [4/6] Verificando Gestor de Procesos (PM2)...
call pm2 -v >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 no encontrado. Instalando PM2 globalmente...
    call npm install -g pm2
) else (
    echo PM2 ya esta instalado.
)

REM 5. Start/Reload Application
echo.
echo [5/6] Iniciando/Recargando aplicacion...

call pm2 describe omni-pos >nul 2>&1
if %errorlevel% equ 0 (
    echo La aplicacion ya esta corriendo. Recargando con config de produccion...
    call pm2 restart ecosystem.config.cjs --env production
) else (
    echo Iniciando aplicacion por primera vez...
    call pm2 start ecosystem.config.cjs --env production
)

call pm2 save --force

REM 6. Configure Windows Autostart for current installation path
echo.
echo [6/6] Configurando arranque automatico de Windows...
set "APP_DIR=%CD%"
set "STARTUP_PS=%APP_DIR%\iniciar-app.ps1"
set "TASK_NAME=omni-pos-Autostart"

(
echo $AppName = "omni-pos"
echo $AppDir = "%APP_DIR%"
echo $LogFile = Join-Path $AppDir "autostart.log"
echo function Write-Log { param([string]$Msg^) $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Add-Content -Path $LogFile -Value "[$timestamp] $Msg" }
echo Write-Log "=== AUTOSTART INICIADO ==="
echo Start-Sleep -Seconds 30
echo $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine"^) + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User"^)
echo Set-Location $AppDir
echo $pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
echo if (-not $pm2^) { Write-Log "PM2 no encontrado. Instalando..."; npm install -g pm2 }
echo $list = pm2 jlist 2^>$null ^| ConvertFrom-Json -ErrorAction SilentlyContinue
echo $app = $list ^| Where-Object { $_.name -eq $AppName }
echo if (-not $app^) { Write-Log "App no encontrada. Iniciando..."; pm2 start ecosystem.config.cjs } elseif ($app.pm2_env.status -ne "online"^) { Write-Log "App encontrada apagada. Reiniciando..."; pm2 restart $AppName } else { Write-Log "App online." }
echo pm2 save --force
echo Write-Log "=== AUTOSTART FINALIZADO ==="
) > "%STARTUP_PS%"

schtasks /Create /TN "%TASK_NAME%" /SC ONLOGON /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%STARTUP_PS%""" /F >nul 2>&1
if %errorlevel% neq 0 (
    echo No se pudo crear la tarea con schtasks. Intentando carpeta de Inicio...
    set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    (
    echo @echo off
    echo powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%STARTUP_PS%"
    ) > "%STARTUP_DIR%\omni-pos-Autostart.bat"
    echo Acceso directo de arranque creado en carpeta de Inicio.
) else (
    echo Tarea programada '%TASK_NAME%' creada/actualizada.
)

echo.
echo ========================================================
echo   DESPLIEGUE COMPLETADO EXITOSAMENTE
echo ========================================================
echo.
echo La aplicacion esta disponible en:
echo   - Local:  http://localhost:9003
echo   - Red:    http://%COMPUTERNAME%:9003
echo.
pause
