# ============================================================
#  setup-autostart.ps1 — Configurar Auto-arranque con PM2
# ============================================================
$ErrorActionPreference = "Stop"

$TaskName = "omni-pos-Autostart"
$User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "⚙️ Configurando Tarea Programada de Windows: $TaskName..." -ForegroundColor Yellow

# Buscar el ejecutable de PM2
$pm2Path = (Get-Command pm2 -ErrorAction SilentlyContinue).Source
if (-not $pm2Path) {
    Write-Host "❌ No se encontró PM2 instalado globalmente." -ForegroundColor Red
    exit 1
}

# Acción: Ejecutar 'pm2 resurrect' al arrancar el sistema
$Action = New-ScheduledTaskAction -Execute $pm2Path -Argument "resurrect"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Registrar la tarea programada con privilegios elevados
Register-ScheduledTask -TaskName $TaskName `
                       -Action $Action `
                       -Trigger $Trigger `
                       -Settings $Settings `
                       -User $User `
                       -RunLevel Highest `
                       -Force | Out-Null

Write-Host "✅ Tarea Programada '$TaskName' registrada exitosamente para el usuario $User." -ForegroundColor Green
Write-Host "🚀 La aplicación se iniciará automáticamente al encender la PC manteniendo las actualizaciones activas." -ForegroundColor Green
