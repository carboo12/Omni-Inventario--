$AppName = "omni-pos"
$AppDir = "C:\Users\carlo\OneDrive\Documents\Downloads\react\Omni Inventario +"
$LogFile = Join-Path $AppDir "autostart.log"
function Write-Log { param([string]$Msg) $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; Add-Content -Path $LogFile -Value "[$timestamp] $Msg" }
Write-Log "=== AUTOSTART INICIADO ==="
Start-Sleep -Seconds 30
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
Set-Location $AppDir
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) { Write-Log "PM2 no encontrado. Instalando..."; npm install -g pm2 }
$list = pm2 jlist 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
$app = $list | Where-Object { $_.name -eq $AppName }
if (-not $app) { Write-Log "App no encontrada. Iniciando..."; pm2 start ecosystem.config.cjs } elseif ($app.pm2_env.status -ne "online") { Write-Log "App encontrada apagada. Reiniciando..."; pm2 restart $AppName } else { Write-Log "App online." }
pm2 save --force
Write-Log "=== AUTOSTART FINALIZADO ==="
