@echo off
chcp 65001 >nul
title Encerrando Servidores ELLENCO

echo ====================================================
echo         ENCERRANDO SERVIDORES ELLENCO
echo ====================================================
echo.

powershell -NoProfile -Command ^
    "$ports = @(8083, 5173); foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo [OK] Portas 8083 e 5173 liberadas.
echo Servidores finalizados com sucesso!
echo.
timeout /t 2 >nul
