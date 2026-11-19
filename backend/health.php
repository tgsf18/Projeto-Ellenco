<?php
/**
 * Healthcheck do container (usado pelo Docker/Render).
 *
 * Não depende do layout nem da sessão: responde mesmo com o banco fora, para
 * o serviço subir e a página de erro conseguir explicar o que está faltando.
 * A configuração de conexão é lida direto das variáveis de ambiente.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$host  = getenv('DB_HOST') ?: '127.0.0.1';
$port  = getenv('DB_PORT') ?: '5432';
$nome  = getenv('DB_NAME') ?: 'postgres';
$usua  = getenv('DB_USER') ?: 'postgres';
$senha = getenv('DB_PASS') ?: '';
$ssl   = getenv('DB_SSLMODE') ?: 'require';

$ok = true;
$detalhe = ['php' => PHP_VERSION];

try {
    $pdo = new PDO(
        "pgsql:host=$host;port=$port;dbname=$nome;sslmode=$ssl",
        $usua,
        $senha,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    $pdo->query('SELECT 1');
    $detalhe['banco'] = 'ok';

    $detalhe['migracao_v1'] = $pdo->query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_atribuicoes'"
    )->fetchColumn() ? 'aplicada' : 'pendente';

    // V2: colunas dos anexos + índices trigram que fazem a busca ser rápida
    $detalhe['migracao_v2'] = $pdo->query(
        "SELECT 1 FROM information_schema.columns
         WHERE table_name = 'meta_anexos' AND column_name = 'categoria'"
    )->fetchColumn() ? 'aplicada' : 'pendente';

    $detalhe['busca_indexada'] = (int) $pdo->query(
        "SELECT COUNT(*) FROM pg_indexes
         WHERE schemaname = 'public' AND indexname LIKE '%trgm%'"
    )->fetchColumn() . ' índice(s) trigram';
} catch (Throwable $e) {
    $ok = false;
    $detalhe['banco'] = 'erro';
    $detalhe['erro'] = $e->getMessage();
}

http_response_code($ok ? 200 : 503);
echo json_encode(
    ['status' => $ok ? 'ok' : 'degradado', 'verificacoes' => $detalhe],
    JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
);
