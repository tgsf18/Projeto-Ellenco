$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$jarPath = Join-Path $scriptDir 'app.jar'
$targetJar = Join-Path $scriptDir 'target\ellenco-platform-0.0.1-SNAPSHOT.jar'
$secretBytes = New-Object byte[] 48
$passwordBytes = New-Object byte[] 24
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($secretBytes)
$rng.GetBytes($passwordBytes)
$jwtSecret = [Convert]::ToBase64String($secretBytes)
$adminPassword = [Convert]::ToBase64String($passwordBytes).Replace('+', 'A').Replace('/', 'B').TrimEnd('=')
$rng.Dispose()
$adminEmail = 'admin@ellenco.local'
Write-Host "Administrador local: $adminEmail"
Write-Host "Senha temporária: $adminPassword"

if (Test-Path $jarPath) {
    java -jar $jarPath --server.port=8083 "--jwt.secret=$jwtSecret" --ellenco.bootstrap.enabled=true "--ellenco.bootstrap.admin-email=$adminEmail" "--ellenco.bootstrap.admin-password=$adminPassword"
} elseif (Test-Path $targetJar) {
    java -jar $targetJar --server.port=8083 "--jwt.secret=$jwtSecret" --ellenco.bootstrap.enabled=true "--ellenco.bootstrap.admin-email=$adminEmail" "--ellenco.bootstrap.admin-password=$adminPassword"
} else {
    Write-Host "Jar não encontrado. Executando via Maven..."
    $env:JWT_SECRET = $jwtSecret
    $env:ELLENCO_BOOTSTRAP_ENABLED = 'true'
    $env:ELLENCO_BOOTSTRAP_ADMIN_EMAIL = $adminEmail
    $env:ELLENCO_BOOTSTRAP_ADMIN_PASSWORD = $adminPassword
    mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8083"
}
