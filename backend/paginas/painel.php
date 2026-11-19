<?php
/**
 * Painel de Metas.
 *
 * Regras do módulo:
 *  - A meta pertence a PESSOAS (meta_atribuicoes). Cada pessoa vê as suas e
 *    altera só o progresso dela; admin/gestor vê e altera todas.
 *  - Nada de painel antigo: a página é métrica + filtros + busca + cards.
 *    Criar, ver detalhe e atualizar progresso acontecem em MODAIS.
 *  - O modal de detalhe mostra descrição completa (HTML sanitizado), anexos
 *    (PDF, imagem, planilha, executável, qualquer arquivo) e links.
 *  - Toda lista é paginada e filtrada no SQL (LIMIT/OFFSET + COUNT).
 */
require_once __DIR__ . '/../layout.php';

$user  = require_login();
$admin = is_gestor($user);
$uid   = (int) $user['id'];

$filtro = (string) ($_GET['filtro'] ?? 'todas');          // todas|andamento|concluidas|atrasadas|minhas
if (!in_array($filtro, ['todas', 'andamento', 'concluidas', 'atrasadas', 'minhas'], true)) $filtro = 'todas';
$termo  = termo_busca($_GET['busca'] ?? '');
$pagina = pagina_atual();
$porPagina = 12;
$mensagemErro = '';

/**
 * Quando o preview estático inclui este arquivo só para ler os helpers, ele
 * define ELLENCO_PREVIEW antes. Nesse caso os modais (que dependem de sessão e
 * de CSRF) não são montados — evita trabalho inútil e erro de função ausente.
 */
$renderizarPagina = !defined('ELLENCO_PREVIEW');

/* ===================================================== helpers do módulo = */
function mensagem_banco(Throwable $e): string {
    $codigo = $e instanceof PDOException ? (string) $e->getCode() : '';
    if ($codigo === '42P01') return 'a migração database-V1.sql ainda não foi aplicada no banco.';
    if ($codigo === '23503') return 'registro relacionado não existe mais.';
    if ($codigo === '42703') return 'falta uma coluna: aplique também a database-V2.sql.';
    return 'erro no banco de dados' . ($codigo ? ' (' . $codigo . ')' : '') . '.';
}

/** Ao concluir, cria UM evento no dia (idempotente pelo índice uq_evento_por_meta_dia). */
function criar_evento_conclusao(int $metaId, int $usuarioId): void {
    try {
        $pdo = db();
        $stmt = $pdo->prepare('SELECT titulo FROM metas WHERE id = ?');
        $stmt->execute([$metaId]);
        $meta = $stmt->fetch();
        if (!$meta) return;

        $stmt = $pdo->prepare('SELECT setor, nome FROM usuarios WHERE id = ?');
        $stmt->execute([$usuarioId]);
        $quem = $stmt->fetch() ?: ['setor' => null, 'nome' => ''];

        $ins = $pdo->prepare(
            "INSERT INTO eventos (titulo, descricao, setor, inicio, categoria, criado_por, meta_id, escopo, usuario_id)
             VALUES (?, ?, ?, now(), 'meta_concluida', ?, ?, 'pessoa', ?)
             ON CONFLICT DO NOTHING"
        );
        $ins->execute([
            'Conclusão: ' . $meta['titulo'],
            'Meta concluída por ' . ($quem['nome'] ?: 'um membro da equipe') . '.',
            $quem['setor'], $usuarioId, $metaId, $usuarioId,
        ]);
    } catch (Throwable $e) {
        // acessório: nunca impede o salvamento do progresso
    }
}

/** Grava os links digitados (um por linha) na meta. */
function salvar_links(PDO $pdo, int $metaId, string $texto, int $usuarioId): void {
    $links = array_filter(array_map('trim', preg_split('/\R/', $texto) ?: []));
    if (!$links) return;
    $ins = $pdo->prepare(
        "INSERT INTO meta_anexos (meta_id, tipo, nome, url, mime, criado_por)
         VALUES (?, 'link', ?, ?, 'link', ?)"
    );
    foreach ($links as $url) {
        if (preg_match('~^https?://~i', $url)) {
            $nome = mb_substr(preg_replace('~^https?://~i', '', rtrim($url, '/')), 0, 200);
            $ins->execute([$metaId, $nome !== '' ? $nome : $url, $url, $usuarioId]);
        }
    }
}

/** Busca os anexos de várias metas numa consulta só (sem N+1). */
function anexos_por_meta(array $ids): array {
    if (!$ids) return [];
    $marcadores = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare(
        "SELECT id, meta_id, tipo, nome, url, mime, tamanho, extensao, categoria, descricao
         FROM meta_anexos WHERE meta_id IN ($marcadores)
         ORDER BY (tipo = 'link') DESC, id DESC"
    );
    $stmt->execute(array_map('intval', $ids));
    $out = [];
    foreach ($stmt->fetchAll() as $linha) {
        $out[(int) $linha['meta_id']][] = $linha;
    }
    return $out;
}

/** Um item da lista de anexos, com ícone/rótulo da categoria. */
function item_anexo(array $a, bool $podeExcluir = false): string {
    $info = anexo_info($a);
    $url  = (string) $a['url'];
    $externo = (bool) preg_match('~^https?://~i', $url);
    $tam = tamanho_legivel($a['tamanho'] ?? 0);
    $sub = array_filter([$info['rotulo'], $info['extensao'] !== '' ? strtoupper($info['extensao']) : '', $tam]);
    if (!empty($a['descricao'])) $sub[] = (string) $a['descricao'];

    $html = '<a class="anexo ' . h($info['classe']) . '" href="' . h($url) . '"'
          . ($externo ? ' target="_blank" rel="noopener noreferrer"' : ' download')
          . '><span class="anexo-icone">' . icon($info['icone'], 17) . '</span>'
          . '<span style="min-width:0"><span class="anexo-nome">' . h((string) $a['nome']) . '</span>'
          . '<span class="anexo-meta">' . h(implode(' · ', $sub)) . '</span></span>'
          . '<span class="anexo-tag">' . h($info['rotulo']) . '</span></a>';

    if ($podeExcluir) {
        $html .= '<form method="post" style="margin-top:-4px">'
               . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
               . '<input type="hidden" name="action" value="excluir_anexo">'
               . '<input type="hidden" name="anexo_id" value="' . (int) $a['id'] . '">'
               . '<button class="btn btn-sm btn-ghost" type="submit" data-confirmar="Excluir este anexo?">'
               . icon('trash', 13) . ' Excluir anexo</button></form>';
    }
    return $html;
}

function badge_status(array $a): string {
    if (!empty($a['atrasada'])) return '<span class="badge badge-danger">Atrasada</span>';
    $map = [
        'a_fazer'      => ['badge', 'A fazer'],
        'em_andamento' => ['badge badge-info', 'Em andamento'],
        'concluida'    => ['badge badge-success', 'Concluída'],
        'atrasada'     => ['badge badge-danger', 'Atrasada'],
    ];
    [$cls, $txt] = $map[$a['status']] ?? ['badge', (string) $a['status']];
    return '<span class="' . $cls . '">' . h($txt) . '</span>';
}

function badge_prioridade(string $p): string {
    $map = ['alta' => 'badge badge-danger', 'media' => 'badge badge-warning', 'baixa' => 'badge'];
    $txt = ['alta' => 'Alta', 'media' => 'Média', 'baixa' => 'Baixa'];
    return '<span class="' . ($map[$p] ?? 'badge') . '">' . h($txt[$p] ?? $p) . '</span>';
}

function data_br(?string $iso): string {
    if (!$iso) return '—';
    $ts = strtotime($iso);
    return $ts ? date('d/m/Y', $ts) : '—';
}

/* ======================================================= ações (POST) === */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $mensagemErro = 'Sua sessão expirou. Recarregue a página e tente novamente.';
    } else {
        $acao = (string) ($_POST['action'] ?? '');
        $voltar = 'painel.html?' . http_build_query(array_filter([
            'filtro' => $filtro !== 'todas' ? $filtro : null,
            'busca'  => $termo !== '' ? $termo : null,
            'pagina' => $pagina > 1 ? $pagina : null,
        ]));

        /* ---------------------------------------------- criar meta ------- */
        if ($acao === 'criar_meta') {
            require_permission($user, 'META_EDITAR');

            $titulo    = trim((string) ($_POST['titulo'] ?? ''));
            $descricao = sanitize_html((string) ($_POST['descricao_html'] ?? ''));
            $inicio    = (string) ($_POST['inicio'] ?? '');
            $fim       = (string) ($_POST['fim'] ?? '');
            $prior     = (string) ($_POST['prioridade'] ?? 'media');
            $destino   = (string) ($_POST['destino'] ?? 'pessoa');
            $usuarioId = (int) ($_POST['usuario_id'] ?? 0);
            $equipeId  = (int) ($_POST['equipe_id'] ?? 0);

            $valido = $titulo !== ''
                   && $inicio !== '' && $fim !== '' && $fim >= $inicio
                   && in_array($prior, ['baixa', 'media', 'alta'], true)
                   && ($destino === 'equipe' ? $equipeId > 0 : $usuarioId > 0);

            if (!$valido) {
                $mensagemErro = 'Preencha título, período válido (fim depois do início) e o destinatário.';
            } else {
                try {
                    $pdo = db();
                    $pdo->beginTransaction();

                    $stmt = $pdo->prepare(
                        'INSERT INTO metas (titulo, descricao, setor, semana_inicio, semana_fim, prioridade, criada_por)
                         VALUES (?, ?, ?, ?, ?, ?, ?)'
                    );
                    $stmt->execute([
                        mb_substr($titulo, 0, 200), $descricao !== '' ? $descricao : null,
                        $user['setor'], $inicio, $fim, $prior, $uid,
                    ]);
                    $metaId = (int) $pdo->lastInsertId();

                    if ($destino === 'equipe') {
                        $stmt = $pdo->prepare('SELECT usuario_id FROM equipe_membros WHERE equipe_id = ? LIMIT 500');
                        $stmt->execute([$equipeId]);
                        $destinatarios = array_map('intval', array_column($stmt->fetchAll(), 'usuario_id'));
                    } else {
                        $destinatarios = [$usuarioId];
                    }

                    $ins = $pdo->prepare(
                        'INSERT INTO meta_atribuicoes (meta_id, usuario_id) VALUES (?, ?)
                         ON CONFLICT (meta_id, usuario_id) DO NOTHING'
                    );
                    foreach ($destinatarios as $dest) {
                        $ins->execute([$metaId, $dest]);
                        notificar($dest, 'meta', 'Nova meta atribuída',
                            $titulo, 'painel.html?busca=' . rawurlencode($titulo),
                            'meta:' . $metaId . ':' . $dest);
                    }

                    salvar_links($pdo, $metaId, (string) ($_POST['links'] ?? ''), $uid);

                    // arquivo anexado direto na criação (opcional)
                    if (!empty($_FILES['arquivo']['name'])) {
                        $erroAnexo = salvar_anexo_arquivo($metaId, $_FILES['arquivo'], $uid,
                            trim((string) ($_POST['arquivo_descricao'] ?? '')));
                        if ($erroAnexo !== '') {
                            $pdo->commit();
                            redirecionar($voltar, 'Meta criada, mas o arquivo não subiu: ' . $erroAnexo, 'erro');
                        }
                    }

                    $pdo->commit();
                    redirecionar($voltar, 'Meta criada e atribuída.');
                } catch (Throwable $e) {
                    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
                    $mensagemErro = 'Não foi possível criar a meta: ' . mensagem_banco($e);
                }
            }
        }

        /* ------------------------------ atualizar progresso (dono/admin) - */
        if ($acao === 'atualizar_progresso') {
            $atribId    = (int) ($_POST['atribuicao_id'] ?? 0);
            $progresso  = filter_var($_POST['progresso'] ?? null, FILTER_VALIDATE_FLOAT);
            $comentario = trim((string) ($_POST['comentario'] ?? ''));

            if ($atribId < 1 || $progresso === false || $progresso < 0 || $progresso > 100) {
                $mensagemErro = 'O progresso precisa ser um número entre 0 e 100.';
            } else {
                try {
                    $pdo = db();
                    $stmt = $pdo->prepare('SELECT * FROM meta_atribuicoes WHERE id = ?');
                    $stmt->execute([$atribId]);
                    $atrib = $stmt->fetch();

                    if (!$atrib) {
                        $mensagemErro = 'Atribuição não encontrada.';
                    } elseif ((int) $atrib['usuario_id'] !== $uid && !$admin) {
                        http_response_code(403);
                        exit('Você só pode atualizar o progresso das suas próprias metas.');
                    } else {
                        $pdo->beginTransaction();
                        $pdo->prepare('UPDATE meta_atribuicoes SET progresso = ? WHERE id = ?')
                            ->execute([$progresso, $atribId]);
                        $pdo->prepare(
                            'INSERT INTO meta_atualizacoes (meta_id, usuario_id, atribuicao_id, progresso_percentual, comentario)
                             VALUES (?, ?, ?, ?, ?)'
                        )->execute([$atrib['meta_id'], $uid, $atribId, $progresso, $comentario !== '' ? $comentario : null]);

                        if ($progresso >= 100) {
                            criar_evento_conclusao((int) $atrib['meta_id'], (int) $atrib['usuario_id']);
                        }
                        $pdo->commit();
                        redirecionar($voltar, 'Progresso atualizado para ' . number_format((float) $progresso, 0) . '%.');
                    }
                } catch (Throwable $e) {
                    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
                    $mensagemErro = 'Não foi possível salvar o progresso: ' . mensagem_banco($e);
                }
            }
        }

        /* -------------------------------------------- excluir meta ------ */
        if ($acao === 'excluir_meta') {
            require_permission($user, 'META_EDITAR');
            $metaId = (int) ($_POST['meta_id'] ?? 0);
            if ($metaId > 0) {
                try {
                    db()->prepare('DELETE FROM metas WHERE id = ?')->execute([$metaId]);
                    redirecionar($voltar, 'Meta excluída.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível excluir: ' . mensagem_banco($e);
                }
            }
        }

        /* --------------------------------------- anexar link à meta ---- */
        if ($acao === 'anexar_link') {
            require_permission($user, 'META_EDITAR');
            $metaId = (int) ($_POST['meta_id'] ?? 0);
            $url    = trim((string) ($_POST['url'] ?? ''));
            $nome   = trim((string) ($_POST['nome'] ?? ''));
            if ($metaId < 1 || !preg_match('~^https?://~i', $url)) {
                $mensagemErro = 'Informe um link começando com http:// ou https://.';
            } else {
                try {
                    db()->prepare(
                        "INSERT INTO meta_anexos (meta_id, tipo, nome, url, mime, descricao, criado_por)
                         VALUES (?, 'link', ?, ?, 'link', ?, ?)"
                    )->execute([
                        $metaId,
                        mb_substr($nome !== '' ? $nome : preg_replace('~^https?://~i', '', $url), 0, 200),
                        $url,
                        mb_substr(trim((string) ($_POST['descricao'] ?? '')), 0, 255) ?: null,
                        $uid,
                    ]);
                    redirecionar($voltar, 'Link anexado à meta.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível anexar o link: ' . mensagem_banco($e);
                }
            }
        }

        /* ------------------------------------ anexar arquivo à meta ---- */
        if ($acao === 'anexar_arquivo') {
            require_permission($user, 'META_EDITAR');
            $metaId = (int) ($_POST['meta_id'] ?? 0);
            if ($metaId < 1) {
                $mensagemErro = 'Meta não informada.';
            } else {
                try {
                    $erro = salvar_anexo_arquivo($metaId, $_FILES['arquivo'] ?? [],
                        $uid, trim((string) ($_POST['descricao'] ?? '')));
                    if ($erro !== '') {
                        $mensagemErro = $erro;
                    } else {
                        redirecionar($voltar, 'Arquivo anexado à meta.');
                    }
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível anexar o arquivo: ' . mensagem_banco($e);
                }
            }
        }

        /* ---------------------------------------------- excluir anexo -- */
        if ($acao === 'excluir_anexo') {
            require_permission($user, 'META_EDITAR');
            $anexoId = (int) ($_POST['anexo_id'] ?? 0);
            if ($anexoId > 0) {
                try {
                    db()->prepare('DELETE FROM meta_anexos WHERE id = ?')->execute([$anexoId]);
                    redirecionar($voltar, 'Anexo excluído.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível excluir o anexo: ' . mensagem_banco($e);
                }
            }
        }
    }
}

/* ================================================== carregar dados ====== */
$pdo = db();
$atribuicoes = [];
$erroBanco = '';
$soma = ['total' => 0, 'concluidas' => 0, 'andamento' => 0, 'atrasadas' => 0, 'media' => 0, 'minhas' => 0];
$totalFiltrado = 0;
$contagens = ['todas' => 0, 'andamento' => 0, 'concluidas' => 0, 'atrasadas' => 0, 'minhas' => 0];

try {
    // --- filtro base (visibilidade) ---
    $escopo = $admin ? '1 = 1' : 'a.usuario_id = ' . $uid;

    // --- condições do filtro de status + busca ---
    $cond = '';
    $params = [];
    if ($filtro === 'concluidas') $cond .= " AND a.status = 'concluida'";
    if ($filtro === 'andamento')  $cond .= " AND a.status = 'em_andamento'";
    if ($filtro === 'atrasadas')  $cond .= " AND m.semana_fim < CURRENT_DATE AND a.status <> 'concluida'";
    if ($filtro === 'minhas')     $cond .= ' AND a.usuario_id = ' . $uid;

    if ($termo !== '') {
        $palavras = array_values(array_filter(preg_split('/\s+/', $termo) ?: []));
        foreach ($palavras as $palavra) {
            $like = '%' . $palavra . '%';
            $cond .= ' AND (m.titulo ILIKE ? OR m.descricao ILIKE ? OR u.nome ILIKE ?'
                   . " OR EXISTS (SELECT 1 FROM meta_anexos bx WHERE bx.meta_id = m.id AND bx.nome ILIKE ?))";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
    }

    // --- total (para paginação) ---
    $stmt = $pdo->prepare("SELECT COUNT(*)
        FROM meta_atribuicoes a
        JOIN metas m    ON m.id = a.meta_id
        JOIN usuarios u ON u.id = a.usuario_id
        WHERE $escopo$cond");
    $stmt->execute($params);
    $totalFiltrado = (int) $stmt->fetchColumn();

    [$limite, $offset] = janela($porPagina, $pagina);

    $stmt = $pdo->prepare("SELECT a.id AS atribuicao_id, a.progresso, a.status, a.concluida_em,
                   m.id AS meta_id, m.titulo, m.descricao, m.semana_inicio, m.semana_fim,
                   m.prioridade, m.setor, m.criado_em,
                   u.id AS usuario_id, u.nome AS usuario_nome,
                   uc.nome AS criador_nome,
                   (m.semana_fim < CURRENT_DATE AND a.status <> 'concluida') AS atrasada,
                   (SELECT COUNT(*) FROM meta_anexos ax WHERE ax.meta_id = m.id) AS anexos,
                   (SELECT COUNT(*) FROM meta_atribuicoes at2 WHERE at2.meta_id = m.id) AS total_pessoas
            FROM meta_atribuicoes a
            JOIN metas m    ON m.id = a.meta_id
            JOIN usuarios u ON u.id = a.usuario_id
            LEFT JOIN usuarios uc ON uc.id = m.criada_por
            WHERE $escopo$cond
            ORDER BY atrasada DESC, m.semana_fim ASC, m.id DESC
            LIMIT $limite OFFSET $offset");
    $stmt->execute($params);
    $atribuicoes = $stmt->fetchAll();

    // --- métricas (agregação no banco) ---
    $stmt = $pdo->prepare("SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE a.status = 'concluida') AS concluidas,
            COUNT(*) FILTER (WHERE a.status = 'em_andamento') AS andamento,
            COUNT(*) FILTER (WHERE m.semana_fim < CURRENT_DATE AND a.status <> 'concluida') AS atrasadas,
            COALESCE(ROUND(AVG(a.progresso)), 0) AS media,
            COUNT(*) FILTER (WHERE a.usuario_id = ?) AS minhas
        FROM meta_atribuicoes a JOIN metas m ON m.id = a.meta_id
        WHERE $escopo");
    $stmt->execute([$uid]);
    $soma = $stmt->fetch() ?: $soma;
    $contagens = [
        'todas'      => (int) $soma['total'],
        'andamento'  => (int) $soma['andamento'],
        'concluidas' => (int) $soma['concluidas'],
        'atrasadas'  => (int) $soma['atrasadas'],
        'minhas'     => (int) $soma['minhas'],
    ];
} catch (Throwable $e) {
    $erroBanco = mensagem_banco($e);
}

// anexos das metas visíveis — uma consulta só
$anexos = [];
try { $anexos = anexos_por_meta(array_column($atribuicoes, 'meta_id')); } catch (Throwable $e) {}

// listas para os formulários
$usuarios = $equipes = [];
if ($admin) {
    try {
        $usuarios = $pdo->query('SELECT id, nome, setor FROM usuarios WHERE ativo = 1 ORDER BY nome LIMIT 500')->fetchAll();
        $equipes  = $pdo->query('SELECT id, nome FROM equipes ORDER BY nome LIMIT 200')->fetchAll();
    } catch (Throwable $e) { /* migração pendente */ }
}

/* ======================================================== renderizar ==== */
$flash = '';
if ($mensagemErro !== '') {
    $flash .= '<div class="alert alert-danger" role="alert">' . h($mensagemErro) . '</div>';
}
if ($erroBanco !== '') {
    $flash .= aviso_migracao() . '<div class="alert alert-danger">Detalhe: ' . h($erroBanco) . '</div>';
}

$paginacao = paginacao($totalFiltrado, $porPagina, $pagina, array_filter([
    'filtro' => $filtro !== 'todas' ? $filtro : null,
    'busca'  => $termo !== '' ? $termo : null,
]));

/* --------- métricas --------- */
$cards = '<section class="grid grid-4" aria-label="Resumo das metas" style="margin-bottom:16px">'
  . '<div class="card"><div class="metric"><span class="metric-label">Metas</span>'
  . '<span class="metric-value">' . (int) $soma['total'] . '</span>'
  . '<span class="metric-hint">atribuídas ' . ($admin ? 'no sistema' : 'a você') . '</span></div></div>'
  . '<div class="card"><div class="metric"><span class="metric-label">Concluídas</span>'
  . '<span class="metric-value" style="color:var(--success)">' . (int) $soma['concluidas'] . '</span>'
  . '<span class="metric-hint">' . ($soma['total'] ? round(100 * $soma['concluidas'] / $soma['total']) : 0) . '% do total</span></div></div>'
  . '<div class="card"><div class="metric"><span class="metric-label">Em andamento</span>'
  . '<span class="metric-value" style="color:var(--info)">' . (int) $soma['andamento'] . '</span>'
  . '<span class="metric-hint">trabalho em curso</span></div></div>'
  . '<div class="card"><div class="metric"><span class="metric-label">Atrasadas</span>'
  . '<span class="metric-value" style="color:var(--danger)">' . (int) $soma['atrasadas'] . '</span>'
  . '<span class="metric-hint">prazo vencido</span></div></div>'
  . '</section>';

/* --------- filtros + busca --------- */
$rotulos = [
    'todas'      => 'Todas',
    'minhas'     => 'Minhas',
    'andamento'  => 'Em andamento',
    'concluidas' => 'Concluídas',
    'atrasadas'  => 'Atrasadas',
];
$chips = '<div class="chips" role="group" aria-label="Filtrar metas">';
foreach ($rotulos as $k => $label) {
    if ($k === 'minhas' && !$admin) continue;
    $q = array_filter(['filtro' => $k !== 'todas' ? $k : null, 'busca' => $termo !== '' ? $termo : null]);
    $chips .= '<a class="chip' . ($filtro === $k ? ' is-ativo' : '') . '" href="?' . h(http_build_query($q)) . '"'
            . ($filtro === $k ? ' aria-current="true"' : '') . '>'
            . h($label) . ' <span class="chip-contagem">' . (int) ($contagens[$k] ?? 0) . '</span></a>';
}
$chips .= '</div>';

$barra = '<div class="row-between barra-filtros" style="margin-bottom:14px">'
       . campo_busca($termo, 'Buscar por título, descrição, pessoa ou anexo…',
            array_filter(['filtro' => $filtro !== 'todas' ? $filtro : null]), 'busca')
       . $chips . '</div>';

/* --------- lista --------- */
if (!$atribuicoes) {
    $listaHtml = '<div class="empty">'
        . ($termo !== ''
            ? '<div class="vazio-busca">Nenhuma meta encontrada para <strong>' . h($termo) . '</strong>.<br>'
              . 'Tente outro termo ou <a href="?">limpe a busca</a>.</div>'
            : ($admin
                ? 'Nenhuma meta neste filtro. Use <strong>Criar meta</strong> para atribuir a primeira.'
                : 'Nenhuma meta atribuída a você por enquanto.'))
        . '</div>';
} else {
    $listaHtml = '<div class="grid grid-2">';
    foreach ($atribuicoes as $a) {
        $prog = (float) $a['progresso'];
        $cls  = $prog >= 100 ? ' is-done' : (!empty($a['atrasada']) ? ' is-late' : '');
        $podeEditar = $admin || (int) $a['usuario_id'] === $uid;
        $meusAnexos = $anexos[(int) $a['meta_id']] ?? [];

        $listaHtml .= '<article class="card" data-meta="' . (int) $a['meta_id'] . '">'
          . '<div class="card-head"><div style="min-width:0">'
          . '<h3 style="line-height:1.35">' . h((string) $a['titulo']) . '</h3>'
          . '<p class="card-sub">' . h((string) $a['usuario_nome']) . ' · '
          . data_br($a['semana_inicio']) . ' – ' . data_br($a['semana_fim']) . '</p>'
          . '</div><div class="row" style="justify-content:flex-end">'
          . badge_status($a) . badge_prioridade((string) $a['prioridade'])
          . '</div></div>';

        $listaHtml .= '<div style="margin:10px 0 12px">'
          . '<div class="row-between" style="font-size:12px;color:var(--text-muted);margin-bottom:5px">'
          . '<span>Progresso</span><strong>' . number_format($prog, 0) . '%</strong></div>'
          . '<div class="progress' . $cls . '"><span style="width:' . max(0, min(100, $prog)) . '%"></span></div></div>';

        $listaHtml .= '<div class="row">';
        $listaHtml .= '<button class="btn btn-sm" type="button" data-modal-abrir="modal-meta-' . (int) $a['meta_id'] . '">'
                    . icon('info', 14) . ' Ver detalhes</button>';
        if (count($meusAnexos) > 0) {
            $listaHtml .= '<span class="badge badge-primary">' . icon('paperclip', 13) . ' ' . count($meusAnexos) . '</span>';
        }
        if ($podeEditar) {
            $listaHtml .= '<button class="btn btn-sm btn-primary" type="button"'
                        . ' data-abrir-progresso="' . (int) $a['atribuicao_id'] . '"'
                        . ' data-titulo="' . h((string) $a['titulo']) . '"'
                        . ' data-progresso="' . $prog . '">' . icon('edit', 14) . ' Progresso</button>';
        }
        if ($admin) {
            $listaHtml .= '<form method="post" class="push">'
                        . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
                        . '<input type="hidden" name="action" value="excluir_meta">'
                        . '<input type="hidden" name="meta_id" value="' . (int) $a['meta_id'] . '">'
                        . '<button class="btn btn-sm btn-ghost" type="submit" title="Excluir meta"'
                        . ' data-confirmar="Excluir esta meta e todas as atribuições dela?">'
                        . icon('trash', 14) . '</button></form>';
        }
        $listaHtml .= '</div></article>';
    }
    $listaHtml .= '</div>' . render_paginacao($paginacao);
}

/* --------- modais de detalhe (um por meta da página) --------- */
$modaisDetalhe = '';
foreach ($atribuicoes as $a) {
    $metaId = (int) $a['meta_id'];
    $meusAnexos = $anexos[$metaId] ?? [];
    $arquivos = array_values(array_filter($meusAnexos, fn($x) => ($x['tipo'] ?? '') === 'arquivo'));
    $links    = array_values(array_filter($meusAnexos, fn($x) => ($x['tipo'] ?? '') === 'link'));

    $corpo = '<div class="modal-body stack">'
      . '<div class="detalhe-topo">'
      . '<div class="row">' . badge_status($a) . badge_prioridade((string) $a['prioridade'])
      . '<span class="badge">' . h(sector_label((string) ($a['setor'] ?? ''))) . '</span></div>'
      . '<h3 class="detalhe-titulo">' . h((string) $a['titulo']) . '</h3>'
      . '<p class="detalhe-sub">Atribuída a <strong>' . h((string) $a['usuario_nome']) . '</strong>'
      . ' · ' . data_br($a['semana_inicio']) . ' até ' . data_br($a['semana_fim'])
      . ' · ' . (int) $a['total_pessoas'] . ' pessoa(s) nesta meta</p></div>'

      . '<div><div class="row-between" style="font-size:12px;color:var(--text-muted);margin-bottom:5px">'
      . '<span>Progresso de ' . h((string) $a['usuario_nome']) . '</span><strong>'
      . number_format((float) $a['progresso'], 0) . '%</strong></div>'
      . '<div class="progress' . ((float) $a['progresso'] >= 100 ? ' is-done' : '') . '">'
      . '<span style="width:' . max(0, min(100, (float) $a['progresso'])) . '%"></span></div></div>'

      . '<section class="detalhe-secao"><h3>Descrição</h3>'
      . (!empty($a['descricao'])
            ? '<div class="descricao-rica">' . $a['descricao'] . '</div>'
            : '<p class="muted text-sm">Sem descrição.</p>')
      . '</section>';

    $corpo .= '<section class="detalhe-secao"><h3>Arquivos (' . count($arquivos) . ')</h3>';
    if ($arquivos) {
        $corpo .= '<div class="anexos">';
        foreach ($arquivos as $arq) { $corpo .= item_anexo($arq, $admin); }
        $corpo .= '</div>';
    } else {
        $corpo .= '<p class="muted text-sm">Nenhum arquivo anexado.</p>';
    }
    $corpo .= '</section>';

    $corpo .= '<section class="detalhe-secao"><h3>Links (' . count($links) . ')</h3>';
    if ($links) {
        $corpo .= '<div class="anexos">';
        foreach ($links as $l) { $corpo .= item_anexo($l, $admin); }
        $corpo .= '</div>';
    } else {
        $corpo .= '<p class="muted text-sm">Nenhum link anexado.</p>';
    }
    $corpo .= '</section>';

    $corpo .= '<section class="detalhe-secao"><h3>Informações</h3><dl class="info-lista">'
      . '<dt>' . icon('user', 14) . ' Criada por</dt><dd>' . h((string) ($a['criador_nome'] ?? '—')) . '</dd>'
      . '<dt>' . icon('clock', 14) . ' Criada em</dt><dd>' . data_br($a['criado_em'] ?? null) . '</dd>'
      . '<dt>' . icon('check', 14) . ' Concluída em</dt><dd>' . data_br($a['concluida_em'] ?? null) . '</dd>'
      . '<dt>' . icon('users', 14) . ' Atribuída a</dt><dd>' . (int) $a['total_pessoas'] . ' pessoa(s)</dd>'
      . '</dl></section>';

    // anexar (admin/gestor)
    if ($admin) {
        $corpo .= '<section class="detalhe-secao"><h3>Anexar arquivo</h3>'
          . '<form method="post" enctype="multipart/form-data" class="stack-sm">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="anexar_arquivo">'
          . '<input type="hidden" name="meta_id" value="' . $metaId . '">'
          . '<div class="field"><label for="arq-' . $metaId . '">Arquivo (até 20 MB)</label>'
          . '<input type="file" id="arq-' . $metaId . '" name="arquivo" required></div>'
          . '<div class="field"><label for="arqd-' . $metaId . '">Descrição (opcional)</label>'
          . '<input type="text" id="arqd-' . $metaId . '" name="descricao" maxlength="255"'
          . ' placeholder="Ex.: ART do CREA"></div>'
          . '<button class="btn btn-sm btn-primary" type="submit">' . icon('upload', 14) . ' Enviar arquivo</button>'
          . '</form></section>'
          . '<section class="detalhe-secao"><h3>Anexar link</h3>'
          . '<form method="post" class="stack-sm">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="anexar_link">'
          . '<input type="hidden" name="meta_id" value="' . $metaId . '">'
          . '<div class="grid grid-2">'
          . '<div class="field"><label for="lk-' . $metaId . '">URL</label>'
          . '<input type="url" id="lk-' . $metaId . '" name="url" required placeholder="https://…"></div>'
          . '<div class="field"><label for="lkn-' . $metaId . '">Nome do link</label>'
          . '<input type="text" id="lkn-' . $metaId . '" name="nome" maxlength="200"'
          . ' placeholder="Ex.: Pasta no Drive"></div></div>'
          . '<button class="btn btn-sm" type="submit">' . icon('link', 14) . ' Anexar link</button>'
          . '</form></section>';
    }

    $corpo .= '</div>';

    $modaisDetalhe .= '<dialog class="modal modal-largo" id="modal-meta-' . $metaId . '"'
      . ' aria-labelledby="titulo-meta-' . $metaId . '">'
      . '<div class="modal-inner">'
      . '<div class="modal-head"><div><h2 id="titulo-meta-' . $metaId . '">Detalhes da meta</h2>'
      . '<p class="card-sub">Tudo o que está ligado a esta meta.</p></div>'
      . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
      . $corpo
      . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Fechar</button>'
      . ($admin ? '<button class="btn btn-danger" type="button" data-confirmar-form="form-excluir-' . $metaId . '">'
          . icon('trash', 14) . ' Excluir meta</button>' : '')
      . '</div></div></dialog>';

    if ($admin) {
        // formulário escondido usado pelo botão "Excluir meta" do rodapé
        $modaisDetalhe .= '<form method="post" id="form-excluir-' . $metaId . '" style="display:none">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="excluir_meta">'
          . '<input type="hidden" name="meta_id" value="' . $metaId . '"></form>';
    }
}

/* --------- modal de progresso --------- */
if (!$renderizarPagina) {
    $modalProgresso = '<dialog class="modal" id="modal-progresso" aria-labelledby="titulo-progresso">'
  . '<form method="post" class="modal-inner">'
  . '<div class="modal-head"><div><h2 id="titulo-progresso">Atualizar progresso</h2>'
  . '<p class="card-sub" data-progresso-titulo>—</p></div>'
  . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
  . '<div class="modal-body stack">'
  . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
  . '<input type="hidden" name="action" value="atualizar_progresso">'
  . '<input type="hidden" name="atribuicao_id" id="progresso-atribuicao" value="">'
  . '<div class="field"><label for="progresso-valor">Progresso (%)</label>'
  . '<input type="number" id="progresso-valor" name="progresso" min="0" max="100" step="1" required>'
  . '<span class="hint">Ao chegar a 100%, a meta é concluída e um evento é criado no calendário.</span></div>'
  . '<div class="field"><label for="progresso-comentario">O que foi feito (opcional)</label>'
  . '<textarea id="progresso-comentario" name="comentario" maxlength="1000"'
  . ' placeholder="Ex.: concretagem da laje concluída, aguardando cura."></textarea>'
  . '<span class="hint">Fica no histórico da meta — nada é sobrescrito.</span></div>'
  . '</div>'
  . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button>'
  . '<button class="btn btn-primary" type="submit">Salvar progresso</button></div>'
  . '</form></dialog>';

/* --------- modal de criar meta --------- */
$modalCriar = '';
if ($admin) {
    $opcoesUsuarios = '';
    foreach ($usuarios as $u) {
        $opcoesUsuarios .= '<option value="' . (int) $u['id'] . '">' . h((string) $u['nome'])
                         . ' — ' . h(sector_label((string) ($u['setor'] ?? ''))) . '</option>';
    }
    $opcoesEquipes = '';
    foreach ($equipes as $eq) {
        $opcoesEquipes .= '<option value="' . (int) $eq['id'] . '">' . h((string) $eq['nome']) . '</option>';
    }
    if ($opcoesEquipes === '') $opcoesEquipes = '<option value="">Nenhuma equipe criada ainda</option>';

    $modalCriar = '<dialog class="modal" id="modal-criar-meta" aria-labelledby="titulo-criar">'
      . '<form method="post" class="modal-inner" enctype="multipart/form-data">'
      . '<div class="modal-head"><div><h2 id="titulo-criar">Criar meta</h2>'
      . '<p class="card-sub">Será atribuída a uma pessoa ou a uma equipe inteira.</p></div>'
      . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
      . '<div class="modal-body stack">'
      . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
      . '<input type="hidden" name="action" value="criar_meta">'
      . '<div class="field"><label for="meta-titulo">Título</label>'
      . '<input type="text" id="meta-titulo" name="titulo" maxlength="200" required'
      . ' placeholder="Ex.: Concretagem da laje do 2º pavimento"></div>'

      . '<div class="field"><label for="meta-descricao">Descrição</label>'
      . '<div class="editor-bloco">'
      . '<div class="editor-toolbar" role="toolbar" aria-label="Formatação">'
      . '<button type="button" class="btn btn-sm" data-cmd="bold" title="Negrito"><b>B</b></button>'
      . '<button type="button" class="btn btn-sm" data-cmd="italic" title="Itálico"><i>I</i></button>'
      . '<button type="button" class="btn btn-sm" data-cmd="underline" title="Sublinhado"><u>U</u></button>'
      . '<button type="button" class="btn btn-sm" data-cmd="insertUnorderedList">Lista</button>'
      . '<button type="button" class="btn btn-sm" data-cmd="formatBlock:h3">Título</button>'
      . '</div>'
      . '<div id="meta-descricao" class="editor" contenteditable="true" role="textbox"'
      . ' aria-multiline="true" aria-label="Descrição da meta"'
      . ' data-placeholder="Descreva a meta e os critérios de aceite…"></div>'
      . '<input type="hidden" name="descricao_html" id="meta-descricao-html">'
      . '</div><span class="hint">O HTML é sanitizado no servidor antes de ser gravado.</span></div>'

      . '<div class="grid grid-2">'
      . '<div class="field"><label for="meta-inicio">Início</label>'
      . '<input type="date" id="meta-inicio" name="inicio" required></div>'
      . '<div class="field"><label for="meta-fim">Prazo final</label>'
      . '<input type="date" id="meta-fim" name="fim" required></div></div>'

      . '<div class="grid grid-2">'
      . '<div class="field"><label for="meta-prioridade">Prioridade</label>'
      . '<select id="meta-prioridade" name="prioridade">'
      . '<option value="baixa">Baixa</option><option value="media" selected>Média</option>'
      . '<option value="alta">Alta</option></select></div>'
      . '<div class="field"><label for="meta-destino">Atribuir para</label>'
      . '<select id="meta-destino" name="destino" data-destino>'
      . '<option value="pessoa" selected>Uma pessoa</option>'
      . '<option value="equipe">Uma equipe inteira</option></select></div></div>'

      . '<div class="field" data-destino-pessoa><label for="meta-usuario">Funcionário</label>'
      . '<select id="meta-usuario" name="usuario_id">' . $opcoesUsuarios . '</select></div>'
      . '<div class="field" data-destino-equipe hidden><label for="meta-equipe">Equipe</label>'
      . '<select id="meta-equipe" name="equipe_id">' . $opcoesEquipes . '</select>'
      . '<span class="hint">Cada membro recebe uma atribuição própria, com progresso independente.</span></div>'

      . '<div class="field"><label for="meta-arquivo">Arquivo (opcional)</label>'
      . '<input type="file" id="meta-arquivo" name="arquivo">'
      . '<span class="hint">PDF, imagem, planilha, executável — qualquer tipo, até 20 MB.</span></div>'

      . '<div class="field"><label for="meta-links">Links (um por linha)</label>'
      . '<textarea id="meta-links" name="links" rows="2" placeholder="https://drive.google.com/…"></textarea></div>'
      . '</div>'
      . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button>'
      . '<button class="btn btn-primary" type="submit">Criar e atribuir</button></div>'
      . '</form></dialog>';
    }
}   // fim do bloco de modais (não renderizado no preview)

$botaoCriar = $admin
    ? '<button class="btn btn-primary" type="button" data-modal-abrir="modal-criar-meta">'
      . icon('plus', 16) . ' Criar meta</button>'
    : '';

$conteudo = $flash
  . '<div class="row-between" style="margin-bottom:16px">'
  . '<div><h2 style="margin-bottom:2px">' . ($admin ? 'Todas as metas' : 'Minhas metas') . '</h2>'
  . '<p class="text-sm muted">'
  . ($admin ? 'Você cria e atribui; cada pessoa atualiza o próprio progresso.' : 'Você atualiza apenas o seu progresso.')
  . '</p></div>' . $botaoCriar . '</div>'
  . $cards . $barra . $listaHtml
  . $modalProgresso . $modalCriar . $modaisDetalhe;

$sub = $admin
    ? 'Crie metas, atribua e acompanhe o progresso'
    : 'Acompanhe e atualize o progresso das suas metas';

page($user, 'painel', 'Painel de Metas', $sub, $conteudo, [
    'funcao'       => funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']),
    'notificacoes' => contar_notificacoes($uid),
]);
