$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$jarPath = Join-Path $scriptDir 'app.jar'
$targetJar = Join-Path $scriptDir 'target\ellenco-platform-0.0.1-SNAPSHOT.jar'

if (Test-Path $jarPath) {
    java -jar $jarPath --server.port=8083 --ellenco.bootstrap.enabled=true
} elseif (Test-Path $targetJar) {
    java -jar $targetJar --server.port=8083 --ellenco.bootstrap.enabled=true
} else {
    Write-Host "Jar não encontrado. Executando via Maven..."
    mvn spring-boot:run -Dspring-boot.run.arguments="--ellenco.bootstrap.enabled=true"
}
