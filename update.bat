@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OMNI INVENTARIO + :: Actualizacion blindada de produccion

set "PM2_CMD="

echo ========================================================
echo   OMNI INVENTARIO + :: ACTUALIZACION DE PRODUCCION
echo   Secuencia blindada de 8 pasos
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto NO_NODE
where npm >nul 2>&1
if errorlevel 1 goto NO_NPM

where pm2 >nul 2>&1
if errorlevel 1 (
    set "PM2_CMD=npx pm2"
    echo [INFO] PM2 no esta en PATH. Se usara "npx pm2".
) else (
    set "PM2_CMD=pm2"
)

if not exist ".env" (
    echo [ADVERTENCIA] No se encontro el archivo .env.
    echo               Verifique que DATABASE_URL apunte a su MySQL local.
    echo.
)

rem ==================================================================
rem PASO 1: detener PM2 para liberar bloqueos de archivos en Windows
rem ==================================================================
echo [1/8] Deteniendo servicio PM2 (liberando bloqueos en Windows)...
call %PM2_CMD% stop omni-pos >nul 2>&1
if errorlevel 1 (
    echo        [INFO] omni-pos no estaba en ejecucion o PM2 aun no lo conoce.
) else (
    echo        [OK] Servicio omni-pos detenido.
)
echo.

rem ==================================================================
rem PASO 2: dependencias (rapido, sin auditoria ni fund)
rem ==================================================================
echo [2/8] Instalando dependencias (prefer-offline)...
call npm install --prefer-offline --no-audit --no-fund
if errorlevel 1 goto ERROR_DEPENDENCIES
echo        [OK] Dependencias listas.
echo.

rem ==================================================================
rem PASO 3: cliente Prisma
rem ==================================================================
echo [3/8] Generando cliente Prisma...
call npx prisma generate
if errorlevel 1 goto ERROR_PRISMA
echo        [OK] Cliente Prisma generado.
echo.

rem ==================================================================
rem PASO 4: reparacion dinamica de indices UNIQUE/FK (CreditNote)
rem ==================================================================
echo [4/8] Reparando indices/FK de CreditNote...
call node scripts/fix-credit-note-index.mjs
if errorlevel 1 (
    echo        [ADVERTENCIA] El reparador reporto avisos.
    echo                    Se intentara prisma db push de todos modos.
) else (
    echo        [OK] Reparacion de indices verificada.
)
echo.

rem ==================================================================
rem PASO 5: sincronizar esquema con MySQL
rem ==================================================================
echo [5/8] Sincronizando esquema con MySQL (prisma db push)...
call npx prisma db push --accept-data-loss
if errorlevel 1 goto ERROR_DB
echo        [OK] Esquema sincronizado.
echo.

rem ==================================================================
rem PASO 6: saneamiento del historial de credito (no bloqueante)
rem ==================================================================
echo [6/8] Saneando historial de credito...
call npm run db:sanitize-credit
if errorlevel 1 (
    echo        [ADVERTENCIA] El saneamiento reporto avisos. Continuando...
) else (
    echo        [OK] Historial de credito saneado.
)
echo.

rem ==================================================================
rem PASO 7: compilar aplicacion y verificar artefactos
rem ==================================================================
echo [7/8] Compilando aplicacion para produccion...
call npm run build
if errorlevel 1 goto ERROR_BUILD
if not exist "dist\index.html" goto ERROR_BUILD
if not exist "dist-server\index.mjs" goto ERROR_BUILD
echo        [OK] Compilacion verificada (dist + dist-server).
echo.

rem ==================================================================
rem PASO 8: reiniciar y guardar estado de PM2
rem ==================================================================
echo [8/8] Reiniciando y guardando servicios en PM2...
call %PM2_CMD% restart omni-pos --update-env
if errorlevel 1 (
    echo        [INFO] omni-pos no estaba registrado. Iniciando desde ecosystem.config.cjs...
    call %PM2_CMD% start ecosystem.config.cjs --env production
    if errorlevel 1 goto ERROR_PM2
)
call %PM2_CMD% save --force
if errorlevel 1 (
    echo        [ADVERTENCIA] No se pudo guardar el estado de PM2.
) else (
    echo        [OK] Estado de PM2 guardado.
)

echo.
echo ========================================================
echo   PROCESO FINALIZADO CON EXITO. SISTEMA ONLINE
echo ========================================================
echo Ver estado: pm2 list
echo Ver logs:   pm2 logs omni-pos --lines 100
echo Salud:      http://localhost:9003/health
echo.
pause
exit /b 0

:NO_NODE
echo.
echo [ERROR CRITICO] Node.js no esta instalado o no esta disponible en PATH.
echo Instale Node.js LTS y vuelva a ejecutar update.bat.
echo.
pause
exit /b 1

:NO_NPM
echo.
echo [ERROR CRITICO] npm no esta disponible en PATH.
echo Repare la instalacion de Node.js y vuelva a ejecutar update.bat.
echo.
pause
exit /b 1

:ERROR_DEPENDENCIES
echo.
echo [ERROR CRITICO] Fallo la instalacion de dependencias.
goto ERROR_RESTORE

:ERROR_PRISMA
echo.
echo [ERROR CRITICO] Fallo la generacion del cliente Prisma.
goto ERROR_RESTORE

:ERROR_BUILD
echo.
echo [ERROR CRITICO] Fallo la compilacion del proyecto.
if not exist "dist\index.html" echo               Falta dist\index.html
if not exist "dist-server\index.mjs" echo               Falta dist-server\index.mjs
goto ERROR_RESTORE

:ERROR_PM2
echo.
echo [ERROR CRITICO] No se pudo reiniciar omni-pos en PM2.
echo               Ejecute: pm2 list
echo               Ejecute: pm2 logs omni-pos --lines 100 --nostream
goto ERROR_RESTORE

:ERROR_DB
echo.
echo ====================================================================
echo   [ERROR CRITICO EN BASE DE DATOS / ERROR P1000]
echo ====================================================================
echo   Fallo la conexion o sincronizacion con MySQL Server.
echo.
echo   Causa mas frecuente: Error P1000 (Credenciales invalidas de MySQL).
echo   La contrasena o usuario en el archivo .env no coinciden con MySQL.
echo   Esto impide crear o actualizar tablas/columnas nuevas.
echo.
echo   PASOS PARA RESOLVER:
echo   1. Abra el archivo .env con el Bloc de Notas.
echo   2. Verifique la variable DATABASE_URL con el formato:
echo      DATABASE_URL="mysql://root:CONTRASENA_CORRECTA@localhost:3306/farmacia"
echo   3. Si la contrasena contiene caracteres especiales, codifiquelos:
echo      '+' se escribe '%%2B'  -  '@' se escribe '%%40'  -  '#' se escribe '%%23'
echo   4. Ejecute 'verify-db.bat' para comprobar la conexion inmediatamente.
echo ====================================================================
echo.
echo [AYUDA ADICIONAL] Ejecutando verificador de conexion...
call node scripts/verify-db-connection.mjs 2>nul
echo.
echo [INFO] Intentando reactivar omni-pos con la version anterior...
if exist "dist\index.html" if exist "dist-server\index.mjs" (
    call %PM2_CMD% restart omni-pos --update-env >nul 2>&1
    call %PM2_CMD% save --force >nul 2>&1
)
echo.
pause
exit /b 1

:ERROR_RESTORE
echo.
echo [INFO] Intentando reactivar omni-pos con la version anterior...
if exist "dist\index.html" if exist "dist-server\index.mjs" (
    call %PM2_CMD% restart omni-pos --update-env >nul 2>&1
    call %PM2_CMD% save --force >nul 2>&1
)
echo.
call %PM2_CMD% logs omni-pos --lines 60 --nostream 2>nul
echo.
pause
exit /b 1
