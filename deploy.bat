@echo off
cd /d "%~dp0"
setlocal EnableExtensions

title OMNI INVENTARIO + :: Despliegue de Produccion

echo ========================================================
echo   DESPLIEGUE DE PRODUCCION - OMNI INVENTARIO +
echo   Vite SPA + Hono API + Prisma + PM2
echo ========================================================
echo.

set "OMNI_WAS_RUNNING="

:: Detectar PM2 (comando global o npx)
set "PM2_CMD=pm2"
where pm2 >nul 2>&1
if errorlevel 1 (
    where npx >nul 2>&1
    if not errorlevel 1 (
        set "PM2_CMD=npx pm2"
    )
)

:: 1. Verificaciones de herramientas base
where node >nul 2>&1
if errorlevel 1 goto :missing_node

where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

where pm2 >nul 2>&1
if errorlevel 1 (
    where npx >nul 2>&1
    if errorlevel 1 goto :missing_pm2
)

:: 2. Paso de Git Opcional y Seguro (resiliente a despliegues manuales / sin Git)
echo [1/8] Verificando actualizacion de codigo fuente...
where git >nul 2>&1
if %errorlevel% equ 0 (
    git rev-parse --is-inside-work-tree >nul 2>&1
    if not errorlevel 1 (
        echo [LOG] Actualizando codigo fuente desde Git...
        call git pull origin main
        if errorlevel 1 (
            echo [ADVERTENCIA] 'git pull origin main' reporto advertencias o cambios locales.
            echo Continuando despliegue con los archivos locales existentes...
        )
    ) else (
        echo [ADVERTENCIA] La carpeta no es un repositorio Git activo.
        echo Continuando despliegue con los archivos locales copiados...
    )
) else (
    echo [ADVERTENCIA] Git no esta disponible en el PATH. Omitiendo git pull y usando archivos locales.
)

echo.
echo [2/8] Deteniendo omni-pos en PM2 para liberar bloqueos de archivos en Windows...
call %PM2_CMD% describe omni-pos >nul 2>&1
if not errorlevel 1 (
    set "OMNI_WAS_RUNNING=1"
    call %PM2_CMD% stop omni-pos
    if errorlevel 1 (
        echo [ADVERTENCIA] No se pudo detener omni-pos limpiamente, continuando...
    )
)

echo.
echo [3/8] Verificando dependencias de Node.js (modo optimizado)...
call npm install --prefer-offline --no-audit --no-fund
if errorlevel 1 (
    echo [ADVERTENCIA] Reintentando instalacion con npm ci...
    call npm ci --prefer-offline --no-audit --no-fund
    if errorlevel 1 goto :deploy_failed
)

echo.
echo [4/8] Generando cliente Prisma y sincronizando esquema de base de datos...
:: Siempre generar el cliente Prisma primero para asegurar @prisma/client en node_modules
if exist "node_modules\.bin\prisma.cmd" (
    call "node_modules\.bin\prisma.cmd" generate
) else (
    call npx prisma generate
)
if errorlevel 1 (
    echo [ERROR CRITICO] Fallo la generacion local del cliente Prisma.
    goto :deploy_failed
)

:: Sincronizar estructura de base de datos
if exist "node_modules\.bin\prisma.cmd" (
    call "node_modules\.bin\prisma.cmd" db push --accept-data-loss
) else (
    call npx prisma db push --accept-data-loss
)
if errorlevel 1 goto :db_failed

echo.
echo [5/8] Saneando base de datos (reconciliacion de credito)...
call npm run db:sanitize-credit
if errorlevel 1 (
    echo [ADVERTENCIA] El saneamiento de credito reporto advertencias. Continuando...
)

echo.
echo [6/8] Compilando frontend Vite y servidor Hono...
set "NODE_ENV=production"
call npm run build
if errorlevel 1 goto :deploy_failed
if not exist "dist\index.html" goto :missing_frontend_build
if not exist "dist-server\index.mjs" goto :missing_backend_build

echo.
echo [7/8] Iniciando o reiniciando servicios en PM2...
call %PM2_CMD% restart omni-pos --update-env || call %PM2_CMD% startOrRestart ecosystem.config.cjs --env production --update-env
if errorlevel 1 goto :deploy_failed
call %PM2_CMD% describe omni-pos >nul 2>&1
if errorlevel 1 goto :deploy_failed
call %PM2_CMD% save --force
if errorlevel 1 (
    echo [ADVERTENCIA] No se pudo guardar el estado de PM2.
)

echo.
echo [8/8] Verificando tarea de autoarranque de PM2...
schtasks /Query /TN "omni-pos-Autostart" >nul 2>&1
if errorlevel 1 (
    if exist "setup-autostart.ps1" (
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-autostart.ps1"
        if errorlevel 1 echo [AVISO] No se pudo crear la tarea de autoarranque.
    )
)

echo.
echo Comprobando salud HTTP de Hono en el puerto 9003...
for /L %%I in (1,1,15) do (
    node -e "fetch('http://127.0.0.1:9003/health').then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(d=>{if(!d.ok)process.exit(1)}).catch(()=>process.exit(1))" >nul 2>&1
    if not errorlevel 1 goto :health_ok
    timeout /t 2 /nobreak >nul
)
goto :health_failed

:health_ok
echo Salud HTTP confirmada: http://localhost:9003/health
echo.
echo ========================================================
echo   ¡DESPLIEGUE COMPLETADO Y VERIFICADO CON EXITO!
echo ========================================================
echo Ver estado: %PM2_CMD% list
echo Ver logs:   %PM2_CMD% logs omni-pos --lines 100
echo Salud:      http://localhost:9003/health
echo.
pause
exit /b 0

:db_failed
echo.
echo ====================================================================
echo   [ERROR CRITICO EN BASE DE DATOS / ERROR P1000]
echo ====================================================================
echo   Fallo la conexion o sincronizacion con MySQL Server.
echo.
echo   Causa mas frecuente: Error P1000 (Credenciales invalidas de MySQL).
echo   La contrasena o usuario en el archivo .env no coinciden con MySQL.
echo   Esto impide crear columnas requeridas (ej: unitsPerBulk).
echo.
echo   PASOS PARA RESOLVER:
echo   1. Abra el archivo .env con el Bloc de Notas.
echo   2. Verifique la variable DATABASE_URL con el formato:
echo      DATABASE_URL="mysql://root:CONTRASEÑA_CORRECTA@localhost:3306/farmacia"
echo   3. Si la contrasena contiene caracteres especiales, codifiquelos:
echo      '+' se escribe '%%2B'  -  '@' se escribe '%%40'  -  '#' se escribe '%%23'
echo   4. Ejecute 'verify-db.bat' para probar la conexion inmediatamente.
echo ====================================================================
echo.
goto :deploy_failed

:deploy_failed
echo.
echo ========================================================
echo   [ERROR CRITICO] Ocurrio un problema durante el despliegue.
echo ========================================================
if defined OMNI_WAS_RUNNING (
    echo Intentando reanimar omni-pos con los artefactos previos...
    call %PM2_CMD% startOrRestart ecosystem.config.cjs --env production --update-env 2>nul
    call %PM2_CMD% logs omni-pos --lines 80 --nostream 2>nul
)
echo.
pause
exit /b 1

:health_failed
echo.
echo [ERROR CRITICO] Hono no respondio correctamente en /health despues de 30 segundos.
call %PM2_CMD% logs omni-pos --lines 100 --nostream 2>nul
goto :deploy_failed

:missing_frontend_build
echo.
echo [ERROR CRITICO] No se genero dist\index.html tras la compilacion.
goto :deploy_failed

:missing_backend_build
echo.
echo [ERROR CRITICO] No se genero dist-server\index.mjs tras la compilacion.
goto :deploy_failed

:missing_node
echo.
echo [ERROR CRITICO] Node.js no esta instalado o no esta disponible en PATH.
echo Instale Node.js (LTS recomendado) para continuar.
echo.
pause
exit /b 1

:missing_npm
echo.
echo [ERROR CRITICO] npm no esta disponible en PATH.
echo Verifique la instalacion de Node.js y npm.
echo.
pause
exit /b 1

:missing_pm2
echo.
echo [ERROR CRITICO] PM2 no esta instalado ni como comando global ni accesible via npx.
echo Para instalarlo globalmente ejecute: npm install -g pm2
echo.
pause
exit /b 1
