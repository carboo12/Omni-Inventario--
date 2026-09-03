# Script para detener la aplicación OmniPOS
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Deteniendo omni-pos..." -ForegroundColor Yellow

# Asegurar que PM2 esté en el PATH si se instaló de forma portable
$NodeInstallDir = "$PSScriptRoot\bin\nodejs"
$env:PATH = "$NodeInstallDir;" + [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

pm2 stop omni-pos
pm2 save --force

Write-Host "La aplicación se ha detenido." -ForegroundColor Green
Start-Sleep -Seconds 2
