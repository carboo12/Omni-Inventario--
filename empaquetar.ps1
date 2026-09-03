# =============================================================
# EMPAQUETAR.ps1 - Copia el código fuente del proyecto (sin lo pesado)
# para desplegar en otra máquina. En el destino se debe ejecutar:
#   npm install  ->  npx prisma generate  ->  npm run build  ->  pm2 start ecosystem.config.cjs
# =============================================================

param(
    [string]$Destino = "",
    [switch]$IncluirEnv,   # fuerza incluir .env (por defecto se incluye)
    [switch]$SinEnv,       # excluye .env (si no quieres copiar credenciales)
    [switch]$Comprimir,    # genera un .zip del paquete al final
    [switch]$DryRun        # solo muestra qué se copiaría (no copia nada)
)

$ErrorActionPreference = "Stop"
$Origen = $PSScriptRoot

# --- Resolver destino ---
if (-not $Destino) {
    $fecha = Get-Date -Format "yyyyMMdd-HHmm"
    $Destino = Join-Path (Split-Path $Origen -Parent) "omni-empaque-$fecha"
}
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino -Force | Out-Null }

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   EMPAQUETAR - Omni Inventario + (copia de código)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Origen : $Origen"
Write-Host "  Destino: $Destino"
Write-Host ""

# --- Directorios a EXCLUIR (pesados / regenerables / temporales) ---
$excluirDirs = @(
    "node_modules",
    "dist",
    "dist-server",
    ".next",
    "tmp",
    "scratch",
    ".git",
    ".idx",
    ".agent",
    "logs"
)

# --- Archivos a EXCLUIR (regenerables / logs / temporales) ---
$excluirArchivos = @(
    "*.log",
    "*.tsbuildinfo",
    "*.tmp",
    "build-vite*.log",
    "vite-dev.log",
    "tsc_errors*.txt",
    "generate_out.txt",
    "push_result.txt",
    "seed_error.log",
    "pm2-reanimador.log",
    "autostart.log"
)

# --- Armar argumentos de robocopy ---
$argsXD = @()
foreach ($d in $excluirDirs) { $argsXD += "/XD"; $argsXD += $d }
$argsXF = @()
foreach ($f in $excluirArchivos) { $argsXF += "/XF"; $argsXF += $f }

# --- Definir si incluimos .env ---
$incluirEnvFinal = $true
if ($SinEnv) { $incluirEnvFinal = $false }

Write-Host "Copiando archivos (excluyendo: $($excluirDirs -join ', '))..." -ForegroundColor Yellow

# --- Modo DryRun: solo muestra qué se copiaría ---
if ($DryRun) {
    Write-Host ""
    Write-Host "[DRY-RUN] No se copia nada. Resumen de la configuración:" -ForegroundColor Cyan
    Write-Host "  Origen      : $Origen"
    Write-Host "  Destino     : $Destino"
    Write-Host "  Incluir .env: $($incluirEnvFinal -and (Test-Path (Join-Path $Origen '.env')))"
    Write-Host "  Comprimir   : $Comprimir"
    Write-Host "  Directorios excluidos: $($excluirDirs -join ', ')"
    Write-Host "  Archivos excluidos  : $($excluirArchivos -join ', ')"
    Write-Host ""
    Write-Host "Pasa sin -DryRun para ejecutar la copia real." -ForegroundColor Yellow
    pause
    exit 0
}

# robocopy: devuelve 0=nada, 1=copiado, 2=extra, 3=ambos, >=8=error
robocopy $Origen $Destino /E /R:2 /W:2 $argsXD $argsXF /NFL /NDL /NJH /NJS
$codigo = $LASTEXITCODE
if ($codigo -ge 8) {
    Write-Host "[ERROR] robocopy falló con código $codigo" -ForegroundColor Red
    exit 1
}

# --- Manejo de .env ---
$envOrigen = Join-Path $Origen ".env"
if ($incluirEnvFinal -and (Test-Path $envOrigen)) {
    Copy-Item $envOrigen (Join-Path $Destino ".env") -Force
    Write-Host "[OK] .env copiado (contiene credenciales de BD)." -ForegroundColor Green
} elseif (-not $SinEnv) {
    Write-Host "[ADVERTENCIA] No se encontró .env en el origen." -ForegroundColor Yellow
}

# --- Generar archivo de instrucciones ---
$readme = @"
DESPLIEGUE - Omni Inventario +

1. Instalar dependencias:
   npm install

2. Sincronizar BD (requiere MySQL activo y .env correcto):
   npx prisma generate
   npx prisma db push

3. Compilar frontend + servidor:
   npm run build

4. Iniciar con PM2:
   pm2 start ecosystem.config.cjs --env production
   pm2 save --force

5. (Opcional) Configurar arranque automático de Windows:
   Ejecutar setup-autostart.ps1 como Administrador.

Nota: este paquete NO incluye node_modules ni dist/. Se generan en el destino.
"@
Set-Content -Path (Join-Path $Destino "DEPLOY_INSTRUCCIONES.txt") -Value $readme -Encoding UTF8

Write-Host ""
Write-Host "[OK] Empaquetado completado en:" -ForegroundColor Green
Write-Host "     $Destino"
Write-Host ""

# --- Compresión ZIP opcional ---
if ($Comprimir) {
    $zipPath = "$Destino.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Write-Host "Comprimiendo paquete en ZIP..." -ForegroundColor Yellow
    Compress-Archive -Path "$Destino\*" -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "[OK] ZIP creado: $zipPath" -ForegroundColor Green
}

Write-Host "Siguiente paso en la máquina destino:" -ForegroundColor Cyan
Write-Host "  npm install && npx prisma generate && npm run build"
Write-Host "  pm2 start ecosystem.config.cjs --env production"
Write-Host ""
pause