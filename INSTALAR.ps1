# ==============================================================================
# INSTALADOR Y DESPLEGADOR AUTOMÁTICO - OmniPOS
# ==============================================================================
# Este script descarga Node.js, instala dependencias, compila la app y
# configura el auto-arranque en Windows.
# ==============================================================================

$ErrorActionPreference = "Stop"

# --- CONFIGURACIÓN ---
$NodeVersion = "v20.11.1" # Versión LTS estable
$AppDir = $PSScriptRoot
$NodeInstallDir = "$AppDir\bin\nodejs"
# 1. VERIFICAR ADMINISTRADOR
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] Debes ejecutar este script como ADMINISTRADOR." -ForegroundColor Red
    Write-Host "Haz clic derecho en el archivo y selecciona 'Ejecutar con PowerShell' (asegúrate de que la consola sea de admin)." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         OmniPOS - INSTALACIÓN Y DESPLIEGUE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 2. VERIFICAR/DESCARGAR NODE.JS
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Cyan
$nodeExists = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeExists) {
    Write-Host "Node.js no encontrado. Descargando versión portable $NodeVersion..." -ForegroundColor Yellow
    
    if (-not (Test-Path "$AppDir\bin")) { New-Item -ItemType Directory -Path "$AppDir\bin" | Out-Null }
    
    $nodeZip = "$AppDir\bin\node.zip"
    $nodeUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
    
    Write-Host "Descargando desde: $nodeUrl"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
    
    Write-Host "Extrayendo archivos..."
    Expand-Archive -Path $nodeZip -DestinationPath "$AppDir\bin" -Force
    
    $extractedFolder = Get-ChildItem "$AppDir\bin" | Where-Object { $_.Name -like "node-$NodeVersion-win-x64" }
    Rename-Item -Path $extractedFolder.FullName -NewName "nodejs"
    
    Remove-Item $nodeZip
    
    # Agregar al PATH de la sesión actual
    $env:PATH = "$NodeInstallDir;$env:PATH"

    # Agregar al PATH del sistema permanentemente
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($currentPath -notlike "*$NodeInstallDir*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$NodeInstallDir", "Machine")
        Write-Host "Node.js agregado al PATH del sistema." -ForegroundColor Green
    }
} else {
    Write-Host "Node.js ya está instalado: $(node -v)" -ForegroundColor Green
}

# 3. INSTALAR DEPENDENCIAS
Write-Host ""
Write-Host "[2/6] Instalando dependencias (npm install)..." -ForegroundColor Cyan
Set-Location $AppDir
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Error al instalar dependencias." }

# 4. PRISMA (DB SCHEMA)
Write-Host ""
Write-Host "[3/6] Sincronizando base de datos con Prisma..." -ForegroundColor Cyan

# Liberar bloqueos EPERM del query_engine DLL en Windows (detiene la app y limpia .tmp*)
Write-Host "    → Liberando lock del query_engine DLL..."
node "$AppDir\scripts\prisma-unlock.mjs"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ADVERTENCIA] No se pudo liberar el lock del DLL. Se continúa de todos modos." -ForegroundColor Yellow
}

# Generar el cliente con reintentos ante EPERM (el script seguro también limpia .tmp*)
$generateAttempts = 4
$generateOk = $false
for ($i = 1; $i -le $generateAttempts; $i++) {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) { $generateOk = $true; break }
    if ($i -lt $generateAttempts) {
        Write-Host "    'prisma generate' falló (¿EPERM?). Reintentando $i/$generateAttempts..." -ForegroundColor Yellow
        node "$AppDir\scripts\prisma-unlock.mjs" --no-stop
        Start-Sleep -Seconds 2
    }
}
if (-not $generateOk) { throw "Error al generar Prisma Client." }

Write-Host "Empujando esquema a MySQL (asegúrate de que MySQL esté activo)..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) { 
    Write-Host "[ADVERTENCIA] No se pudo sincronizar la DB. ¿Está MySQL encendido?" -ForegroundColor Red
}

# 5. COMPILAR (BUILD)
Write-Host ""
Write-Host "[4/6] Compilando aplicación (npm run build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Error al compilar la aplicación." }

# 6. PM2 (GESTOR DE PROCESOS)
Write-Host ""
Write-Host "[5/6] Configurando PM2..." -ForegroundColor Cyan
$pm2Exists = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Exists) {
    Write-Host "Instalando PM2 globalmente..."
    npm install -g pm2
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}

# Iniciar la app con PM2
pm2 delete omni-pos 2>$null | Out-Null
pm2 start ecosystem.config.cjs --name omni-pos
pm2 save --force

# 7. CONFIGURAR AUTO-ARRANQUE AL ENCENDER PC
Write-Host ""
Write-Host "[6/6] Configurando arranque automático al iniciar Windows..." -ForegroundColor Cyan

$startupScript = "$AppDir\bin\iniciar-app.ps1"
$startupContent = @"
# Script de inicio automático OmniPOS
`$AppDir = "$AppDir"
`$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User") + ";$NodeInstallDir"
Set-Location `$AppDir
pm2 resurrect
if (`$LASTEXITCODE -ne 0) {
    pm2 start ecosystem.config.cjs --name omni-pos
}
pm2 save --force
"@
$startupContent | Set-Content -Path $startupScript -Encoding UTF8

# Crear Tarea Programada
$TaskName = "omni-pos-Autostart"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$startupScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
# Ejecutar bajo el MISMO usuario que hizo el despliegue (para usar el mismo ~\.pm2)
$currentUser = $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "         ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "La aplicación está corriendo y se iniciará sola al encender la PC."
Write-Host "URL Local: http://localhost:3000"
Write-Host ""
pause