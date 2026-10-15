<#
.SYNOPSIS
    Script de Inicialização Rápida e Portátil - ELLENCO Platform
.DESCRIPTION
    Funciona em qualquer computador Windows:
    - Com ou sem Java instalado (usa o JRE portátil embutido em .runtimes\jre se necessário)
    - Com ou sem Node.js (usa o frontend embutido no JAR autônomo)
    - Sem necessidade de permissão de administrador ou acesso à firewall
#>

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     ELLENCO PLATFORM — INICIALIZADOR AUTÔNOMO PORTÁTIL   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# 1. Localização do Java (Portátil ou Sistema)
$portableJava = Join-Path $rootDir ".runtimes\jre\bin\java.exe"
$javaExecutable = $null

if (Test-Path $portableJava) {
    $javaExecutable = $portableJava
    Write-Host "[1/4] Java: Usando Java 17 Portátil (embutido na pasta)" -ForegroundColor Green
} else {
    $javaCmd = Get-Command java -ErrorAction SilentlyContinue
    if (-not $javaCmd) {
        $searchPaths = @(
            "C:\Program Files\Microsoft\jdk-*\bin\java.exe",
            "C:\Program Files\Eclipse Adoptium\jdk-*\bin\java.exe",
            "C:\Program Files\Java\jdk-*\bin\java.exe",
            "C:\Program Files (x86)\Java\jdk-*\bin\java.exe"
        )
        foreach ($pattern in $searchPaths) {
            $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $javaExecutable = $found.FullName
                break
            }
        }
    } else {
        $javaExecutable = "java"
    }

    if ($javaExecutable) {
        Write-Host "[1/4] Java: Detectado no sistema ($javaExecutable)" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Java não encontrado neste computador e JRE portátil ausente!" -ForegroundColor Red
        Write-Host "Certifique-se de que a pasta .runtimes\jre está presente no pen drive." -ForegroundColor Yellow
        Read-Host "Pressione Enter para sair..."
        exit 1
    }
}

# 2. Limpeza preventiva de portas (8083 e 5173)
Write-Host "[2/4] Liberando portas 8083 e 5173..." -ForegroundColor Green
$ports = @(8083, 5173)
foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 0 } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# 3. Verificação do JAR Autônomo
$jarPath = Join-Path $rootDir "backend\app.jar"
if (-not (Test-Path $jarPath)) {
    $targetJar = Join-Path $rootDir "backend\target\ellenco-platform-0.0.1-SNAPSHOT.jar"
    if (Test-Path $targetJar) {
        Copy-Item $targetJar $jarPath -Force
    } else {
        Write-Host "[ERRO] O arquivo backend\app.jar não foi encontrado!" -ForegroundColor Red
        Read-Host "Pressione Enter para sair..."
        exit 1
    }
}

# 4. Detecção de Node.js (opcional)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$mode = "STANDALONE"

if ($args -contains "--dev" -and $nodeCmd) {
    $mode = "DEV"
}

Write-Host "[3/4] Modo de execução: $mode" -ForegroundColor Green
if ($mode -eq "STANDALONE") {
    Write-Host "      - Plataforma unificada (Frontend React + API + Banco H2 na porta 8083)" -ForegroundColor Gray
    Write-Host "      - Zero dependência externa (não requer Node.js nem instalação no Windows)" -ForegroundColor Gray
} else {
    Write-Host "      - Modo desenvolvedor com Hot-Reload (Vite na 5173 + API na 8083)" -ForegroundColor Gray
}

# 5. Iniciar os serviços
Write-Host "[4/4] Iniciando a plataforma..." -ForegroundColor Green

# Dispara o Backend/Plataforma
$backendProc = Start-Process -FilePath $javaExecutable -ArgumentList "-jar", "`"$jarPath`"", "--ellenco.bootstrap.enabled=true" -WorkingDirectory "$rootDir\backend" -PassThru -WindowStyle Hidden
Write-Host "      - Servidor PID: $($backendProc.Id)" -ForegroundColor Gray

$frontendProc = $null
if ($mode -eq "DEV") {
    $frontendDir = Join-Path $rootDir "frontend"
    $frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden
    Write-Host "      - Frontend Dev PID: $($frontendProc.Id)" -ForegroundColor Gray
}

# 6. Aguardar saúde da aplicação
$targetUrl = if ($mode -eq "DEV") { "http://localhost:5173" } else { "http://localhost:8083" }
$ready = $false
$maxSeconds = 25
$sw = [System.Diagnostics.Stopwatch]::StartNew()

while ($sw.Elapsed.TotalSeconds -lt $maxSeconds) {
    Start-Sleep -Milliseconds 400
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8083/actuator/health" -TimeoutSec 1 -ErrorAction Stop
        if ($res.status -eq 'UP') {
            $ready = $true
            break
        }
    } catch {}
}
$sw.Stop()

Write-Host ""
if ($ready) {
    Write-Host ">> SUCESSO! Sistema pronto em $([math]::Round($sw.Elapsed.TotalSeconds, 1))s <<" -ForegroundColor Green
} else {
    Write-Host ">> Servidor disparado! <<" -ForegroundColor Yellow
}

# Abre no navegador
Start-Process $targetUrl

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "               SISTEMA EM FUNCIONAMENTO                   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Acesse no navegador: $targetUrl" -ForegroundColor White
Write-Host "  Console H2 (Banco):  http://localhost:8083/h2-console" -ForegroundColor White
Write-Host ""
Write-Host "  CREDENCIAIS DE ACESSO:" -ForegroundColor Yellow
Write-Host "  - Administrador: admin@ellenco.com       / Ellenco@123" -ForegroundColor Yellow
Write-Host "  - Supervisor:    supervisor@ellenco.com  / Ellenco@123" -ForegroundColor Yellow
Write-Host "  - Funcionário:   funcionario@ellenco.com / Ellenco@123" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "DICA: Para fechar tudo a qualquer momento, execute parar.bat" -ForegroundColor Gray
Write-Host "Pressione [ENTER] ou [Q] nesta janela para encerrar o sistema..." -ForegroundColor Cyan

$null = Read-Host

Write-Host "Encerrando servidores..." -ForegroundColor Yellow
try { Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue } catch {}
if ($frontendProc) {
    try { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue } catch {}
}

foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 0 } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host "Servidores encerrados com sucesso!" -ForegroundColor Green
Start-Sleep -Seconds 1
