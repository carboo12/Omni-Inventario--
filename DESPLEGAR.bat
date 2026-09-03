@echo off
title INSTALADOR JoyeriaPlus
echo Solicitando permisos de administrador...
powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy Bypass', '-File \"%~dp0INSTALAR.ps1\"' -Verb RunAs"
exit
