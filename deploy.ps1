# ============================================================
#  deploy.ps1 — Despliegue de Omni Inventario + (SPA + Hono)
#  Arquitectura: Vite (React SPA → dist/) + Hono (dist-server/)
# ============================================================
param(
    [switch]$SkipInstall,
    [switch]$SkipDB,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Omni Inventario +  —  Despliegue Produccion  " -ForegroundColor Cyan
Write-Host "   Arquitectura: Vite SPA + Hono API Server      " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Instalar dependencias ─────────────────────────────────
if (-not $SkipInstall) {
    Write-Host "📦 [1/4] Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error al instalar dependencias." -ForegroundColor Red; exit 1 }
    Write-Host "✔  Dependencias instaladas." -ForegroundColor Green
} else {
    Write-Host "⏭  [1/4] Instalación de dependencias omitida (--SkipInstall)." -ForegroundColor DarkGray
}

Write-Host ""

# ── 2. Sincronizar Base de Datos con Prisma ──────────────────
# REGLA DE PRODUCCIÓN: SOLO se usa 'prisma migrate deploy' + 'prisma generate'.
# NUNCA usar 'prisma db push' en producción (puede reiniciar tablas o perder datos).
# scripts/prisma-safe-deploy.mjs adopta automáticamente una BD creada con
# 'db push' (resuelve las migraciones como ya aplicadas, sin tocar los datos)
# y luego aplica SOLO las migraciones nuevas de forma aditiva, ANTES del build.
if (-not $SkipDB) {
    Write-Host "🗄️  [2/4] Aplicando migraciones de Prisma..." -ForegroundColor Yellow

    Write-Host "    → Sincronizando esquema (migrate deploy + generate)..."
    node scripts/prisma-safe-deploy.mjs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al sincronizar la BD. Verifica MySQL y el archivo .env." -ForegroundColor Red
        exit 1
    }
    Write-Host "✔  Base de datos sincronizada (datos conservados)." -ForegroundColor Green
} else {
    Write-Host "⏭  [2/4] Sincronización de BD omitida (--SkipDB)." -ForegroundColor DarkGray
}

Write-Host ""

# ── 3. Compilar frontend SPA (Vite) + servidor Hono ─────────
if (-not $SkipBuild) {
    Write-Host "🏗️  [3/4] Compilando aplicación (Vite + Hono)..." -ForegroundColor Yellow
    Write-Host "    → Esto puede tardar unos minutos..."

    # Limpiar carpetas de salida anteriores (SIN tocar .next; no existe en esta arquitectura)
    if (Test-Path "dist")        { Remove-Item "dist"        -Recurse -Force }
    if (Test-Path "dist-server") { Remove-Item "dist-server" -Recurse -Force }

    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Error durante el build. Limpiando dist/ y dist-server/ y reintentando..." -ForegroundColor Yellow
        if (Test-Path "dist")        { Remove-Item "dist"        -Recurse -Force }
        if (Test-Path "dist-server") { Remove-Item "dist-server" -Recurse -Force }

        # Limpiar el código de salida anterior
        $global:LASTEXITCODE = 0

        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error fatal en el build. Revisa los logs anteriores." -ForegroundColor Red
            exit 1
        }
    }

    # Verificar que los artefactos se generaron correctamente
    if (-not (Test-Path "dist\index.html")) {
        Write-Host "❌ El build de Vite no generó dist/index.html." -ForegroundColor Red; exit 1
    }
    if (-not (Test-Path "dist-server\index.mjs")) {
        Write-Host "❌ El build de Hono no generó dist-server/index.mjs." -ForegroundColor Red; exit 1
    }

    Write-Host "✔  Build completado:" -ForegroundColor Green
    Write-Host "     • Frontend SPA  →  dist/" -ForegroundColor DarkGray
    Write-Host "     • Servidor Hono →  dist-server/index.mjs" -ForegroundColor DarkGray
} else {
    Write-Host "⏭  [3/4] Build omitido (--SkipBuild)." -ForegroundColor DarkGray
}

Write-Host ""

# ── 4. Reiniciar proceso en PM2 ──────────────────────────────
Write-Host "🔄 [4/4] Reiniciando servicio PM2..." -ForegroundColor Yellow

# Verificar que PM2 esté disponible
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) {
    Write-Host "    PM2 no encontrado. Instalando globalmente..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error al instalar PM2." -ForegroundColor Red; exit 1 }
}

# Iniciar o reiniciar usando ecosystem.config.cjs (NODE_ENV=production, PORT=9003, logs, etc.)
# 'startOrRestart' arranca si no existe o recarga si ya está registrado, aplicando SIEMPRE
# la config de producción (a diferencia de 'pm2 restart omni-pos' que no la aplica en 1er arranque).
npx pm2 startOrRestart ecosystem.config.cjs --env production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar PM2." -ForegroundColor Red; exit 1
}

# Guardar lista de procesos en disco
npx pm2 save --force

Write-Host "✔  Servicio PM2 activo." -ForegroundColor Green

# ── 5. Garantizar auto-arranque al iniciar Windows ────────────
# Crea/verifica la Tarea Programada bajo el MISMO usuario que hace el
# despliegue (para usar el mismo ~\.pm2). Reutiliza setup-autostart.ps1
# si existe; en caso contrario crea la tarea directamente.
Write-Host ""
Write-Host "🚀 [5/5] Verificando auto-arranque de Windows..." -ForegroundColor Yellow

$TaskName = "omni-pos-Autostart"
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "    La tarea '$TaskName' ya existe. OK." -ForegroundColor Green
} else {
    $setupScript = Join-Path $PSScriptRoot "setup-autostart.ps1"
    if (Test-Path $setupScript) {
        Write-Host "    Ejecutando setup-autostart.ps1 (requiere admin)..." -ForegroundColor Yellow
        try {
            & $setupScript
        } catch {
            Write-Host "    No se pudo ejecutar setup-autostart.ps1: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "    Ejecútalo manualmente una vez como Administrador." -ForegroundColor Yellow
        }
    } else {
        Write-Host "    No se encontró setup-autostart.ps1. Ejecútalo manualmente una vez como Administrador." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   ✅  ¡Despliegue completado con éxito!         " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Aplicación disponible en:" -ForegroundColor White
Write-Host "     • Local :  http://localhost:9003" -ForegroundColor Green
Write-Host "     • Red   :  http://$($env:COMPUTERNAME):9003" -ForegroundColor Green
Write-Host ""
Write-Host "   Comandos útiles:" -ForegroundColor White
Write-Host "     pm2 list                     — ver estado de procesos" -ForegroundColor DarkGray
Write-Host "     pm2 logs omni-pos            — ver logs en tiempo real" -ForegroundColor DarkGray
Write-Host "     pm2 monit                    — monitor interactivo" -ForegroundColor DarkGray
Write-Host ""
