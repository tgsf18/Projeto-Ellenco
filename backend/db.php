<?php
require_once __DIR__ . '/config.php';
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $opts = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO('pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';sslmode=' . DB_SSLMODE, DB_USER, DB_PASS, $opts);
    }
    return $pdo;
}
function start_session(): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => $https]);
        session_start();
    }
}
function app_path(string $path): string {
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    $base = preg_replace('~/backend$~', '', $dir);
    if ($base === '.' || $base === '/') $base = '';
    return rtrim($base, '/') . '/' . ltrim($path, '/');
}
function csrf_token(): string {
    start_session();
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}
function valid_csrf(?string $token): bool {
    return is_string($token) && isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}
function require_login(): array {
    start_session();
    if (empty($_SESSION['user'])) { header('Location: ' . app_path('login.html')); exit; }
    return $_SESSION['user'];
}function is_admin(array $user): bool {
    return ($user['tipo_acesso'] ?? '') === 'admin';
}
function require_admin(array $user): void {
    if (!is_admin($user)) {
        http_response_code(403);
        exit('Acesso permitido somente para administradoras.');
    }
}
function sector_label(string $sector): string {
    return ['engenharia'=>'Engenharia','administrativo'=>'Administrativo','obras'=>'Obras'][$sector] ?? 'Setor';
}
/* ---------------------------------------------------------------------------
 * Utilitários usados pelos módulos novos (metas, equipes, calendário).
 * Acrescentados sem alterar as funções acima.
 * ------------------------------------------------------------------------- */

/** Escapa para HTML. Atalho usado em todo o código novo. */
function h(?string $valor): string {
    return htmlspecialchars((string) $valor, ENT_QUOTES, 'UTF-8');
}

/** Só administrador (ou gestor) pode alterar metas e eventos. */
function is_gestor(array $user): bool {
    return in_array($user['tipo_acesso'] ?? '', ['admin', 'gestor'], true);
}

/** Permissões por recurso — aplicadas no SERVIDOR, nunca só na tela. */
function can(array $user, string $permission): bool {
    $tipo = $user['tipo_acesso'] ?? 'usuario';
    $map = [
        'META_EDITAR'        => ['admin', 'gestor'],
        'META_PROGRESSO'     => ['admin', 'gestor', 'usuario'],
        'EQUIPE_GERENCIAR'   => ['admin'],
        'FUNCAO_GERENCIAR'   => ['admin'],
        'EVENTO_EDITAR'      => ['admin', 'gestor'],
        'USUARIO_GERENCIAR'  => ['admin'],
        'RELATORIO_GERAR'    => ['admin', 'gestor'],
    ];
    return in_array($tipo, $map[$permission] ?? [], true);
}

function require_permission(array $user, string $permission): void {
    if (!can($user, $permission)) {
        http_response_code(403);
        exit('Seu acesso não permite esta operação.');
    }
}

/**
 * Sanitiza o HTML que vem do editor rico. Whitelist fechada: o que não está
 * na lista é removido (script, iframe, on*, style com url() etc.).
 */
function sanitize_html(string $html): string {
    $allowed = '<p><br><b><strong><i><em><u><s><ul><ol><li><h2><h3><h4><blockquote>'
             . '<a><table><thead><tbody><tr><th><td><hr><code><pre><span>';
    $html = strip_tags($html, $allowed);
    // remove atributos perigosos mantendo href de links http(s)/mailto
    $html = preg_replace('/\s+on[a-z]+\s*=\s*"[^"]*"/i', '', $html);
    $html = preg_replace("/\s+on[a-z]+\s*=\s*'[^']*'/i", '', $html);
    $html = preg_replace('/\s+style\s*=\s*"[^"]*"/i', '', $html);
    $html = preg_replace("/\s+style\s*=\s*'[^']*'/i", '', $html);
    $html = preg_replace('/javascript\s*:/i', '', $html);
    $html = preg_replace('/\s+(href|src)\s*=\s*"(\s*(?!https?:|mailto:|\/)[^"]*)"/i', '', $html);
    return trim($html);
}

/** Equipes do usuário (ids). Usado para filtrar eventos e o que ele pode ver. */
function equipes_do_usuario(int $usuarioId): array {
    $stmt = db()->prepare('SELECT equipe_id FROM equipe_membros WHERE usuario_id = ?');
    $stmt->execute([$usuarioId]);
    return array_map('intval', array_column($stmt->fetchAll(), 'equipe_id'));
}

/** Nome da função do usuário (catálogo funcoes), ou vazio. */
function funcao_do_usuario(array $user): string {
    if (empty($user['funcao_id'])) return '';
    $stmt = db()->prepare('SELECT nome FROM funcoes WHERE id = ?');
    $stmt->execute([(int) $user['funcao_id']]);
    $row = $stmt->fetch();
    return $row ? (string) $row['nome'] : '';
}

/* ===========================================================================
 * V2 — busca, paginação, anexos e redirecionamento.
 * Tudo aqui é função pura ou fala com o banco; nenhuma imprime HTML.
 * ========================================================================= */

/** Redireciona com mensagem (padrão PRG: Post/Redirect/Get). */
function redirecionar(string $destino, ?string $msg = null, string $tipo = 'salvo'): void {
    if ($msg !== null) {
        $sep = strpos($destino, '?') === false ? '?' : '&';
        $destino .= $sep . $tipo . '=' . rawurlencode($msg);
    }
    header('Location: ' . app_path($destino), true, 303);
    exit;
}

/**
 * Termo de busca normalizado.
 * - remove espaços nas pontas, limita a 80 caracteres;
 * - devolve '' quando não há nada útil (evita WHERE desnecessário).
 */
function termo_busca(?string $bruto): string {
    $t = trim((string) $bruto);
    $t = preg_replace('/\s+/u', ' ', $t);
    if ($t === '' || mb_strlen($t) < 2) return '';
    return mb_substr($t, 0, 80);
}

/**
 * Monta o trecho SQL de busca e devolve [sql, params].
 *
 * Usa ILIKE '%termo%' com os termos em OU dentro de um grupo E:
 *   busca("laje concretagem") casa "laje" E "concretagem" em qualquer coluna.
 * Os índices trigram da V2 (gin_trgm_ops) fazem isso rodar rápido.
 */
function busca_sql(string $termo, array $colunas): array {
    if ($termo === '' || !$colunas) return ['', []];
    $partes = [];
    $params = [];
    foreach (preg_split('/\s+/', $termo) as $palavra) {
        if ($palavra === '') continue;
        $ou = [];
        foreach ($colunas as $col) {
            $ou[] = "$col ILIKE ?";
            $params[] = '%' . $palavra . '%';
        }
        $partes[] = '(' . implode(' OR ', $ou) . ')';
    }
    if (!$partes) return ['', []];
    return [' AND ' . implode(' AND ', $partes), $params];
}

/** Página atual saneada (?pagina=N). */
function pagina_atual(): int {
    return max(1, (int) ($_GET['pagina'] ?? 1));
}

/** Janela de paginação: [LIMIT, OFFSET] a partir da página e do tamanho. */
function janela(int $porPagina = 20, ?int $pagina = null): array {
    $p = $pagina ?? pagina_atual();
    return [$porPagina, ($p - 1) * $porPagina];
}

/** Dados para o componente de paginação. */
function paginacao(int $total, int $porPagina, int $pagina, array $params = []): array {
    $paginas = max(1, (int) ceil($total / max(1, $porPagina)));
    $link = function (int $n) use ($params) {
        $q = $params;
        $q['pagina'] = $n;
        return '?' . http_build_query($q);
    };
    return [
        'total'    => $total,
        'porPagina' => $porPagina,
        'pagina'   => min($pagina, $paginas),
        'paginas'  => $paginas,
        'link'     => $link,
        'temAnterior' => $pagina > 1,
        'temProxima'  => $pagina < $paginas,
    ];
}

/**
 * Metadados de exibição de um anexo, a partir do mime/extensão.
 * Devolve rótulo, ícone e classe — nenhuma lógica na view.
 */
function anexo_info(array $a): array {
    $mime = strtolower((string) ($a['mime'] ?? ''));
    $nome = (string) ($a['nome'] ?? '');
    $ext  = strtolower((string) ($a['extensao'] ?? ''));
    if ($ext === '') {
        $p = pathinfo($nome, PATHINFO_EXTENSION);
        $ext = $p ? strtolower($p) : '';
    }
    $cat = (string) ($a['categoria'] ?? '');

    $mapa = [
        'link'         => ['Link', 'link', 'anexo-link'],
        'pdf'          => ['PDF', 'file-text', 'anexo-pdf'],
        'imagem'       => ['Imagem', 'image', 'anexo-imagem'],
        'planilha'     => ['Planilha', 'table', 'anexo-planilha'],
        'documento'    => ['Documento', 'file-text', 'anexo-documento'],
        'apresentacao' => ['Apresentação', 'presentation', 'anexo-apresentacao'],
        'video'        => ['Vídeo', 'video', 'anexo-video'],
        'audio'        => ['Áudio', 'audio', 'anexo-audio'],
        'compactado'   => ['Arquivo', 'archive', 'anexo-arquivo'],
        'executavel'   => ['Executável', 'terminal', 'anexo-executavel'],
        'arquivo'      => ['Arquivo', 'file', 'anexo-arquivo'],
    ];

    if ($cat === '') {
        // mesma regra da função SQL ellenco_categoria_anexo()
        if (($a['tipo'] ?? '') === 'link')               $cat = 'link';
        elseif (strpos($mime, 'image/') === 0)           $cat = 'imagem';
        elseif ($mime === 'application/pdf' || $ext === 'pdf') $cat = 'pdf';
        elseif (strpos($mime, 'spreadsheet') !== false || in_array($ext, ['xls', 'xlsx', 'csv', 'ods'], true)) $cat = 'planilha';
        elseif (strpos($mime, 'presentation') !== false || in_array($ext, ['ppt', 'pptx', 'odp'], true)) $cat = 'apresentacao';
        elseif (strpos($mime, 'video/') === 0)           $cat = 'video';
        elseif (strpos($mime, 'audio/') === 0)           $cat = 'audio';
        elseif (strpos($mime, 'word') !== false || in_array($ext, ['doc', 'docx', 'odt', 'txt', 'rtf', 'md'], true)) $cat = 'documento';
        elseif (in_array($ext, ['zip', 'rar', '7z', 'gz', 'tar'], true)) $cat = 'compactado';
        elseif (in_array($ext, ['exe', 'msi', 'bat', 'sh', 'apk', 'dmg'], true)) $cat = 'executavel';
        else                                             $cat = 'arquivo';
    }

    [$rotulo, $icone, $classe] = $mapa[$cat] ?? $mapa['arquivo'];
    return ['categoria' => $cat, 'rotulo' => $rotulo, 'icone' => $icone, 'classe' => $classe, 'extensao' => $ext];
}

/** Tamanho legível (KB/MB/GB). */
function tamanho_legivel($bytes): string {
    $b = (float) $bytes;
    if ($b <= 0) return '';
    $u = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = 0;
    while ($b >= 1024 && $i < 4) { $b /= 1024; $i++; }
    return ($i === 0 ? (int) $b : number_format($b, $b < 10 ? 1 : 0, ',', '.')) . ' ' . $u[$i];
}

/**
 * Upload de anexo para o Supabase Storage (API REST, sem SDK).
 *
 * Precisa de duas variáveis de ambiente no Render:
 *   SUPABASE_URL          https://<ref>.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key (NUNCA no repositório)
 * Bucket: ELLENCO_BUCKET (padrão 'metas').
 *
 * Devolve ['ok'=>bool, 'url'=>?, 'erro'=>?]. Sem as variáveis, devolve erro
 * explicativo — a interface mostra e o link manual continua funcionando.
 */
function upload_storage(string $caminhoTmp, string $nomeOriginal, string $mime): array {
    $base   = rtrim((string) getenv('SUPABASE_URL'), '/');
    $chave  = (string) getenv('SUPABASE_SERVICE_KEY');
    $bucket = (string) (getenv('ELLENCO_BUCKET') ?: 'metas');

    if ($base === '' || $chave === '') {
        return ['ok' => false, 'erro' => 'O armazenamento de arquivos não está configurado '
            . '(SUPABASE_URL e SUPABASE_SERVICE_KEY no Render). Por enquanto, use um link.'];
    }
    if (!is_file($caminhoTmp)) {
        return ['ok' => false, 'erro' => 'O arquivo não chegou ao servidor.'];
    }

    $ext = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
    $seguro = preg_replace('/[^a-z0-9]+/', '-', strtolower(pathinfo($nomeOriginal, PATHINFO_FILENAME)));
    $seguro = trim(substr($seguro, 0, 60), '-') ?: 'arquivo';
    $objeto = date('Y/m/') . $seguro . '-' . bin2hex(random_bytes(4)) . ($ext ? '.' . $ext : '');

    $conteudo = file_get_contents($caminhoTmp);
    if ($conteudo === false) {
        return ['ok' => false, 'erro' => 'Não foi possível ler o arquivo enviado.'];
    }

    $url = $base . '/storage/v1/object/' . rawurlencode($bucket) . '/' . str_replace('%2F', '/', rawurlencode($objeto));

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $conteudo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $chave,
            'Content-Type: ' . ($mime !== '' ? $mime : 'application/octet-stream'),
            'x-upsert: true',
            'Cache-Control: 3600',
        ],
    ]);
    $resposta = curl_exec($ch);
    $status   = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erroCurl = curl_error($ch);
    curl_close($ch);

    if ($resposta === false || $status >= 300) {
        $detalhe = $resposta ? json_decode((string) $resposta, true) : null;
        return ['ok' => false, 'erro' => 'Falha no envio do arquivo'
            . ($erroCurl ? ': ' . $erroCurl : ' (HTTP ' . $status . ')')
            . (isset($detalhe['message']) ? ' — ' . $detalhe['message'] : '') . '.'];
    }

    return ['ok' => true, 'url' => $base . '/storage/v1/object/public/' . rawurlencode($bucket) . '/'
        . str_replace('%2F', '/', rawurlencode($objeto))];
}

/** Envia um anexo (arquivo) para uma meta. Devolve mensagem de erro ou ''. */
function salvar_anexo_arquivo(int $metaId, array $arquivo, int $usuarioId, string $descricao = ''): string {
    if (!isset($arquivo['tmp_name']) || ($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        return 'O envio do arquivo falhou (código ' . (int) $arquivo['error'] . ').';
    }
    $limite = 20 * 1024 * 1024;
    if ((int) $arquivo['size'] > $limite) {
        return 'O arquivo passa de 20 MB. Use um link para arquivos maiores.';
    }

    $nome = mb_substr(basename((string) $arquivo['name']), 0, 200);
    $mime = 'application/octet-stream';
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        if ($fi) {
            $mime = finfo_file($fi, (string) $arquivo['tmp_name']) ?: $mime;
            finfo_close($fi);
        }
    }

    $up = upload_storage((string) $arquivo['tmp_name'], $nome, $mime);
    if (!$up['ok']) return $up['erro'];

    $ext = strtolower(pathinfo($nome, PATHINFO_EXTENSION)) ?: null;
    $stmt = db()->prepare(
        "INSERT INTO meta_anexos (meta_id, tipo, nome, url, mime, tamanho, extensao, descricao, criado_por)
         VALUES (?, 'arquivo', ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $metaId, $nome, $up['url'], $mime, (int) $arquivo['size'],
        $ext, $descricao !== '' ? $descricao : null, $usuarioId,
    ]);
    return '';
}

/** Cria uma notificação sem duplicar (chave única por usuário). */
function notificar(int $usuarioId, string $tipo, string $titulo, string $mensagem = '', ?string $url = null, ?string $chave = null): void {
    try {
        $stmt = db()->prepare(
            'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, url, chave)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT DO NOTHING'
        );
        $stmt->execute([$usuarioId, $tipo, mb_substr($titulo, 0, 200), mb_substr($mensagem, 0, 500), $url, $chave]);
    } catch (Throwable $e) {
        // a notificação é acessória: nunca derruba a ação principal
    }
}
