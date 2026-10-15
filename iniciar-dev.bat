@echo off
title ELLENCO Platform - Modo Dev (Hot-Reload)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" --dev
