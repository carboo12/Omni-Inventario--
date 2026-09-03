# =============================================================
# PM2 REANIMADOR - OmniPOS
# Este script garantiza que PM2 y la app siempre esten activos.
# Puede ejecutarse manualmente o automaticamente al iniciar Windows.
# =============================================================

$AppName   = "omni-pos"
$AppDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$NpmGlobal = "$env:APPDATA\npm"
$LogFile   = "$AppDir\pm2-reanimador.log"

function Write-Log {
    param([string]$Msg)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

# ----------------------------------------------------------
# 1. Asegurar que exista la carpeta global de npm
# ----------------------------------------------------------
if (-not (Test-Path $NpmGlobal)) {
    Write-Log "Carpeta npm global no existe. Creando: $NpmGlobal"
    New-Item -ItemType Directory -Force -Path $NpmGlobal | Out-Null
}

# ----------------------------------------------------------
# 2. Verificar si PM2 esta instalado
# ----------------------------------------------------------
$pm2Path = Get-Command pm2 -ErrorAction SilentlyContinue

if (-not $pm2Path) {
    Write-Log "PM2 NO encontrado. Instalando globalmente..."
    npm install -g pm2
    # Recargar PATH en la sesion actual
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    $pm2Path = Get-Command pm2 -ErrorAction SilentlyContinue
    if (-not $pm2Path) {
        Write-Log "ERROR: PM2 no pudo instalarse. Verifica que nodejs este instalado correctamente."
        exit 1
    }
    Write-Log "PM2 instalado correctamente: $(pm2 --version)"
} else {
    Write-Log "PM2 encontrado: $(pm2 --version)"
}

# ----------------------------------------------------------
# 3. Verificar si la aplicacion esta corriendo en PM2
# ----------------------------------------------------------
$pm2List = pm2 jlist 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
$app = $pm2List | Where-Object { $_.name -eq $AppName }

if (-not $app) {
    Write-Log "App '$AppName' NO encontrada en PM2. Iniciando..."
    Set-Location $AppDir
    # Construir primero si no existe .next
    if (-not (Test-Path "$AppDir\.next")) {
        Write-Log "Build no encontrado. Ejecutando: npm run build"
        npm run build
    }
    pm2 start npm --name $AppName -- start
    Write-Log "App '$AppName' iniciada exitosamente."
} else {
    $status = $app.pm2_env.status
    Write-Log "App '$AppName' encontrada con status: $status"

    if ($status -ne "online") {
        Write-Log "Status no es 'online'. Reiniciando app..."
        pm2 restart $AppName
        Write-Log "App '$AppName' reiniciada."
    } else {
        Write-Log "App '$AppName' esta ONLINE. Todo bien."
    }
}

# ----------------------------------------------------------
# 4. Guardar lista de procesos PM2 (persiste tras reinicios)
# ----------------------------------------------------------
Write-Log "Guardando procesos PM2 con 'pm2 save'..."
pm2 save --force
Write-Log "Procesos guardados."

# ----------------------------------------------------------
# 5. Asegurar auto-arranque con Windows (Tarea Programada del usuario)
# En Windows, 'pm2 startup' NO registra nada en el SO (a diferencia de
# systemd en Linux). La persistencia real requiere una Tarea Programada
# que ejecute 'pm2 resurrect' bajo el MISMO usuario que hizo el deploy.
# ----------------------------------------------------------
$TaskName = "omni-pos-Autostart"
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    $taskUser = $existingTask.Principal.UserId
    Write-Log "Tarea '$TaskName' existe. Ejecutada por: $taskUser"
} else {
    Write-Log "Tarea '$TaskName' NO existe. Creando bajo el usuario actual ($env:USERNAME)..."
    $startupScript = "$AppDir\iniciar-app.ps1"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startupScript`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    try {
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
            -Settings $settings -Principal $principal -Description "Arranca OmniPOS con Windows" -Force | Out-Null
        Write-Log "Tarea '$TaskName' creada bajo el usuario $env:USERNAME."
    } catch {
        Write-Log "ERROR creando la tarea: $($_.Exception.Message)"
    }
}

Write-Log "===== REANIMADOR FINALIZADO ====="
