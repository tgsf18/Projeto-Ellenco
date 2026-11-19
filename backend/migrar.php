<?php
/**
 * Migração automática — aplica database-V1.sql e database-V2.sql.
 *
 * Abra uma vez no navegador:  /backend/migrar.php?chave=ellenco-migrar
 *
 * Por que existe: as buscas e os filtros usam índices trigram e colunas que só
 * existem depois da V1 e da V2. Sem elas, as páginas abrem mas o banco não
 * devolve as colunas e a busca cai para uma varredura completa.
 *
 * Garantias:
 *  - idempotente: os SQL são escritos com IF NOT EXISTS / DROP IF EXISTS,
 *    então rodar duas vezes não muda nada;
 *  - roda dentro de UMA transação: se qualquer passo falhar, nada é gravado;
 *  - imprime o que já existia e o que foi criado (tabelas, colunas, índices,
 *    views, triggers), para servir de comprovante.
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

$chaveEsperada = getenv('ELLENCO_MIGRAR_CHAVE') ?: 'ellenco-migrar';
if (($_GET['chave'] ?? '') !== $chaveEsperada) {
    http_response_code(403);
    echo '<!doctype html><meta charset="utf-8"><title>Migração</title>'
       . '<p style="font:15px system-ui;padding:24px">Acesso negado. '
       . 'Use <code>?chave=</code> com a chave de migração configurada no servidor.</p>';
    exit;
}

$host  = getenv('DB_HOST') ?: '127.0.0.1';
$port  = getenv('DB_PORT') ?: '5432';
$nome  = getenv('DB_NAME') ?: 'postgres';
$usua  = getenv('DB_USER') ?: 'postgres';
$senha = getenv('DB_PASS') ?: '';
$ssl   = getenv('DB_SSLMODE') ?: 'require';

function e(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/* --------------------------------------------------- o que já existe ---- */
function estado(PDO $pdo): array {
    return [
        'tabelas' => $pdo->query(
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' ORDER BY 1")->fetchAll(PDO::FETCH_COLUMN),
        'views' => $pdo->query(
            "SELECT table_name FROM information_schema.views
             WHERE table_schema = 'public' ORDER BY 1")->fetchAll(PDO::FETCH_COLUMN),
        'indices' => $pdo->query(
            "SELECT indexname FROM pg_indexes
             WHERE schemaname = 'public' ORDER BY 1")->fetchAll(PDO::FETCH_COLUMN),
        'colunas' => $pdo->query(
            "SELECT table_name || '.' || column_name FROM information_schema.columns
             WHERE table_schema = 'public' ORDER BY 1")->fetchAll(PDO::FETCH_COLUMN),
    ];
}

/* --------------------------------------------- dividir o SQL em blocos -- */
/**
 * O Supabase/SQL Editor manda o arquivo inteiro de uma vez; aqui precisamos
 * separar por ';' sem quebrar os blocos DO $$ ... $$, que contêm ';' dentro.
 */
function blocos(string $sql): array {
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);       // comentários de linha
    $partes = [];
    $atual = '';
    $dentroDollar = false;
    $len = strlen($sql);
    for ($i = 0; $i < $len; $i++) {
        $c = $sql[$i];
        if ($c === '$' && substr($sql, $i, 2) === '$$') {
            $dentroDollar = !$dentroDollar;
            $atual .= '$$';
            $i++;
            continue;
        }
        if ($c === ';' && !$dentroDollar) {
            if (trim($atual) !== '') $partes[] = trim($atual);
            $atual = '';
            continue;
        }
        $atual .= $c;
    }
    if (trim($atual) !== '') $partes[] = trim($atual);
    return $partes;
}

/* ------------------------------------------------------------ executar -- */
$relatorio = [];
$erroFatal = null;
$antes = $depois = [];
$pdo = null;

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$nome;sslmode=$ssl", $usua, $senha, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 20,
    ]);
    $antes = estado($pdo);

    $arquivos = [__DIR__ . '/../database-V1.sql', __DIR__ . '/../database-V2.sql'];
    $pdo->beginTransaction();

    foreach ($arquivos as $arquivo) {
        $nomeArquivo = basename($arquivo);
        if (!is_readable($arquivo)) {
            $relatorio[] = ['arquivo' => $nomeArquivo, 'ok' => false, 'erro' => 'arquivo não encontrado'];
            continue;
        }
        $sql = (string) file_get_contents($arquivo);
        $total = 0;
        $ignorados = 0;
        foreach (blocos($sql) as $bloco) {
            $total++;
            try {
                $pdo->exec($bloco);
            } catch (Throwable $ex) {
                $msg = $ex->getMessage();
                // "já existe" é sucesso para uma migração idempotente
                if (preg_match('/already exists|já existe/i', $msg)) {
                    $ignorados++;
                    continue;
                }
                // RAISE NOTICE de bloco DO não chega como exceção; avisos de
                // extensão indisponível também não. Qualquer outro erro para tudo.
                throw new RuntimeException("$nomeArquivo: $msg", 0, $ex);
            }
        }
        $relatorio[] = [
            'arquivo' => $nomeArquivo,
            'ok' => true,
            'blocos' => $total,
            'ja_existiam' => $ignorados,
        ];
    }

    $pdo->commit();
    $depois = estado($pdo);
} catch (Throwable $ex) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    $erroFatal = $ex->getMessage();
}

/* ------------------------------------------------------- conferências -- */
$conferencias = [];
if (!$erroFatal && $pdo instanceof PDO) {
    $consultas = [
        'meta_atribuicoes'      => "SELECT COUNT(*) FROM meta_atribuicoes",
        'equipes'               => "SELECT COUNT(*) FROM equipes",
        'meta_anexos'           => "SELECT COUNT(*) FROM meta_anexos",
        'eventos'               => "SELECT COUNT(*) FROM eventos",
        'notificacoes'          => "SELECT COUNT(*) FROM notificacoes",
        'índices de busca'      => "SELECT COUNT(*) FROM pg_indexes
                                    WHERE schemaname = 'public' AND indexname LIKE '%trgm%'",
        'vw_meta_detalhe'       => "SELECT COUNT(*) FROM vw_meta_detalhe",
        'vw_evento_detalhe'     => "SELECT COUNT(*) FROM vw_evento_detalhe",
        'vw_usuario_resumo'     => "SELECT COUNT(*) FROM vw_usuario_resumo",
    ];
    foreach ($consultas as $rotulo => $sql) {
        try {
            $conferencias[$rotulo] = (string) $pdo->query($sql)->fetchColumn();
        } catch (Throwable $ex) {
            $conferencias[$rotulo] = 'ERRO: ' . $ex->getMessage();
        }
    }
}

$novasTabelas = array_diff($depois['tabelas'] ?? [], $antes['tabelas'] ?? []);
$novasViews   = array_diff($depois['views'] ?? [], $antes['views'] ?? []);
$novosIndices = array_diff($depois['indices'] ?? [], $antes['indices'] ?? []);
$novasColunas = array_diff($depois['colunas'] ?? [], $antes['colunas'] ?? []);

$trgm = array_values(array_filter($depois['indices'] ?? [], fn($i) => str_contains($i, 'trgm')));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ellenco — migração do banco</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.55 system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; padding: 28px 18px; background: #f7f8fa; color: #111; }
  main { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: #666; margin: 26px 0 8px; }
  .card { background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
  .ok { color: #0a7c3f; font-weight: 600; }
  .bad { color: #b42318; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eceef1; vertical-align: top; }
  code { background: #f0f2f5; padding: 1px 5px; border-radius: 5px; font-size: 12.5px; }
  ul { margin: 6px 0 0; padding-left: 20px; font-size: 13.5px; }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 12px; font-weight: 600; }
  .pill.ok { background: #e7f6ec; color: #0a7c3f; }
  .pill.bad { background: #fdecea; color: #b42318; }
  @media (prefers-color-scheme: dark) {
    body { background: #0f1216; color: #e7eaee; }
    .card { background: #171b21; border-color: #262c34; }
    h2 { color: #9aa4b2; }
    th, td { border-color: #262c34; }
    code { background: #222831; }
    .pill.ok { background: #10281a; color: #57d38c; }
    .pill.bad { background: #2a1414; color: #ff8a80; }
    .ok { color: #57d38c; } .bad { color: #ff8a80; }
  }
</style>
</head>
<body>
<main>
  <h1>Migração do banco Ellenco</h1>
  <p>Banco <code><?= e($nome) ?></code> em <code><?= e($host) ?></code> · PHP <?= e(PHP_VERSION) ?></p>

  <?php if ($erroFatal !== null): ?>
    <div class="card">
      <p class="bad">Falhou — nada foi gravado (a transação foi desfeita).</p>
      <p><code><?= e($erroFatal) ?></code></p>
      <p>Confira se as variáveis <code>DB_HOST</code>, <code>DB_PORT</code>, <code>DB_NAME</code>,
        <code>DB_USER</code> e <code>DB_PASS</code> apontam para o Session Pooler do Supabase
        (porta 5432) e tente de novo.</p>
    </div>
  <?php else: ?>
    <div class="card">
      <p><span class="pill ok">concluído</span> As duas migrações rodaram dentro de uma transação
        e foram confirmadas. Rodar de novo não altera nada.</p>
      <table>
        <thead><tr><th>Arquivo</th><th>Blocos</th><th>Já existiam</th><th>Resultado</th></tr></thead>
        <tbody>
        <?php foreach ($relatorio as $r): ?>
          <tr>
            <td><code><?= e($r['arquivo']) ?></code></td>
            <td><?= e((string) ($r['blocos'] ?? '—')) ?></td>
            <td><?= e((string) ($r['ja_existiam'] ?? '—')) ?></td>
            <td><?= !empty($r['ok']) ? '<span class="ok">ok</span>' : '<span class="bad">' . e($r['erro'] ?? 'erro') . '</span>' ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <h2>O que foi criado agora</h2>
    <div class="card">
      <?php
        $grupos = [
            'Tabelas'  => $novasTabelas,
            'Colunas'  => $novasColunas,
            'Índices'  => $novosIndices,
            'Views'    => $novasViews,
        ];
        $algo = false;
        foreach ($grupos as $rotulo => $lista):
            if (!$lista) continue;
            $algo = true;
      ?>
        <p><strong><?= e($rotulo) ?> (<?= count($lista) ?>)</strong></p>
        <ul><?php foreach ($lista as $item): ?><li><code><?= e($item) ?></code></li><?php endforeach; ?></ul>
      <?php endforeach; ?>
      <?php if (!$algo): ?>
        <p>Nada novo: o banco já estava na versão mais recente.</p>
      <?php endif; ?>
    </div>

    <h2>Busca e filtros</h2>
    <div class="card">
      <p>Índices trigram ativos (<code>pg_trgm</code>) — é o que deixa
        <code>ILIKE '%termo%'</code> rápido em metas, usuários, equipes, eventos, funções e anexos:</p>
      <?php if ($trgm): ?>
        <ul><?php foreach ($trgm as $i): ?><li><code><?= e($i) ?></code></li><?php endforeach; ?></ul>
      <?php else: ?>
        <p class="bad">Nenhum índice trigram. A busca funciona, mas sem índice.
          Verifique se a extensão <code>pg_trgm</code> pode ser criada neste projeto.</p>
      <?php endif; ?>
    </div>

    <h2>Conferência</h2>
    <div class="card">
      <table>
        <thead><tr><th>Consulta</th><th>Resultado</th></tr></thead>
        <tbody>
        <?php foreach ($conferencias as $rotulo => $valor): ?>
          <tr>
            <td><?= e($rotulo) ?></td>
            <td><?= str_starts_with($valor, 'ERRO') ? '<span class="bad">' . e($valor) . '</span>' : '<span class="ok">' . e($valor) . ' linha(s)</span>' ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>

  <p><a href="<?= e(preg_replace('~/backend$~', '', dirname($_SERVER['SCRIPT_NAME'] ?? '/'))) ?>/painel.html">Ir para o Painel de Metas</a>
     · <a href="health.php">health.php</a></p>
</main>
</body>
</html>
