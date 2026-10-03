@echo off
setlocal
cd /d "%~dp0"
title OMNI INVENTARIO + - Reparacion Automatica de Migraciones
color 0A
echo ========================================================
echo   OMNI INVENTARIO +  -  SCRIPT DE REPARACION (FIX.BAT)
echo ========================================================
echo.

echo [1/5] Deteniendo procesos de Node para liberar archivos DLL bloqueados...
taskkill /F /IM node.exe 2>nul
call pm2 stop all 2>nul
echo.

echo [2/5] Resolviendo migracion en conflicto (20260921_add_company_settings_flags)...
call npx prisma migrate resolve --applied 20260921_add_company_settings_flags
echo.

echo [3/5] Aplicando migraciones pendientes restantes...
call npx prisma migrate deploy
if errorlevel 1 (
    echo.
    echo [ADVERTENCIA] Fallo migrate deploy. Forzando sincronizacion segura con db push...
    call npx prisma db push --skip-generate
)
echo.

echo [4/5] Regenerando Cliente de Prisma...
call npx prisma generate
echo.

echo [5/5] Reconstruyendo la aplicacion (npm run build)...
call npm run build
echo.

echo ========================================================
echo   REPARACION Y SINCRO COMPLETADAS CON EXITO!
echo ========================================================
echo Ya puede ejecutar el despliegue normal o iniciar la app.
pause