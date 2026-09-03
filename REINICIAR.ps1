# Script para reiniciar la aplicación OmniPOS
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Reiniciando omni-pos..." -ForegroundColor Cyan

# Asegurar que PM2 esté en el PATH si se instaló de forma portable
$NodeInstallDir = "$PSScriptRoot\bin\nodejs"
$env:PATH = "$NodeInstallDir;" + [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

pm2 restart omni-pos

Write-Host "La aplicación se ha reiniciado correctamente." -ForegroundColor Green
Write-Host "URL: http://localhost:3000"
Start-Sleep -Seconds 3
