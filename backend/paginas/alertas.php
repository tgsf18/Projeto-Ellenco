<?php
/**
 * Alertas — central de avisos (o sino do topo aponta para cá).
 *
 * Regra de ouro: nada de varrer a tabela inteira. Cada consulta tem LIMIT e
 * filtro por usuário; o que o usuário não pode ver nem é buscado.
 */
require_once __DIR__ . '/../layout.php';

$user = require_login();
$pdo  = db();
$erro = '';

/* marcar como lida / todas */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && valid_csrf($_POST['csrf_token'] ?? null)) {
    $acao = $_POST['action'] ?? '';
    try {
        if ($acao === 'marcar_lida') {
            $stmt = $pdo->prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?');
            $stmt->execute([(int) ($_POST['notificacao_id'] ?? 0), $user['id']]);
        }
        if ($acao === 'marcar_todas') {
            $stmt = $pdo->prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0');
            $stmt->execute([$user['id']]);
        }
        redirecionar('alertas.html', 'Avisos atualizados.');
    } catch (Throwable $e) {
        $erro = 'Não foi possível atualizar os avisos.';
    }
}

$filtro = (string) ($_GET['filtro'] ?? 'naolidas');   // naolidas | todas
if (!in_array($filtro, ['naolidas', 'todas'], true)) $filtro = 'naolidas';
$termo = termo_busca($_GET['busca'] ?? '');
$pagina = pagina_atual();
$porPagina = 15;
$notificacoes = [];
$totalNotificacoes = 0;
$paginacao = paginacao(1, $porPagina, 1);
$proximos = [];
$atrasadas = [];
$erroBanco = '';

try {
    $cond = 'usuario_id = ?' . ($filtro === 'todas' ? '' : ' AND lida = 0');
    $params = [$user['id']];
    if ($termo !== '') {
        $like = '%' . $termo . '%';
        $cond .= ' AND (titulo ILIKE ? OR mensagem ILIKE ?)';
        array_push($params, $like, $like);
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM notificacoes WHERE $cond");
    $stmt->execute($params);
    $totalNotificacoes = (int) $stmt->fetchColumn();
    $paginacao = paginacao($totalNotificacoes, $porPagina, $pagina, array_filter([
        'filtro' => $filtro, 'busca' => $termo !== '' ? $termo : null,
    ]));

    [$lim, $off] = janela($porPagina, $pagina);
    $stmt = $pdo->prepare("SELECT id, titulo, mensagem, link, tipo, lida, criado_em
            FROM notificacoes
            WHERE $cond
            ORDER BY lida, criado_em DESC
            LIMIT $lim OFFSET $off");
    $stmt->execute($params);
    $notificacoes = $stmt->fetchAll();
} catch (Throwable $e) {
    $erroBanco = $e instanceof PDOException && $e->getCode() === '42P01'
        ? 'a tabela notificacoes ainda não existe (migração database-V1.sql pendente).'
        : 'erro ao carregar os avisos.';
}

/* eventos dos próximos 7 dias visíveis ao usuário */
try {
    $equipes = equipes_do_usuario((int) $user['id']);
    $inEq = $equipes ? implode(',', array_map('intval', $equipes)) : '0';
    $stmt = $pdo->prepare(
        "SELECT titulo, inicio, categoria FROM eventos
         WHERE inicio >= now() AND inicio < now() + interval '7 days'
           AND ( escopo = 'geral' OR criado_por = ?
              OR (escopo = 'pessoa' AND usuario_id = ?)
              OR (escopo = 'equipe' AND equipe_id IN ($inEq)) )
         ORDER BY inicio LIMIT 20"
    );
    $stmt->execute([$user['id'], $user['id']]);
    $proximos = $stmt->fetchAll();
} catch (Throwable $e) { /* migração pendente */ }

/* metas atrasadas do usuário */
try {
    $stmt = $pdo->prepare(
        "SELECT m.titulo, m.semana_fim, a.progresso
         FROM meta_atribuicoes a JOIN metas m ON m.id = a.meta_id
         WHERE a.usuario_id = ? AND a.status <> 'concluida' AND m.semana_fim < CURRENT_DATE
         ORDER BY m.semana_fim LIMIT 20"
    );
    $stmt->execute([$user['id']]);
    $atrasadas = $stmt->fetchAll();
} catch (Throwable $e) { /* migração pendente */ }

/* ------------------------------------------------------------ renderizar -- */
$flash = $erro !== '' ? '<div class="alert alert-danger">' . h($erro) . '</div>' : '';
if ($erroBanco !== '') $flash .= aviso_migracao() . '<div class="alert alert-warning">' . h($erroBanco) . '</div>';

$tipos = [
    'meta'    => 'badge badge-primary',
    'evento'  => 'badge badge-info',
    'sistema' => 'badge',
    'alerta'  => 'badge badge-warning',
];

$listaHtml = '';
foreach ($notificacoes as $n) {
    $cls = $tipos[$n['tipo']] ?? 'badge';
    $listaHtml .= '<article class="card" style="padding:14px' . ($n['lida'] ? ';opacity:.65' : '') . '">'
      . '<div class="card-head" style="margin-bottom:6px"><div style="min-width:0">'
      . '<h3 style="font-size:14px">' . h($n['titulo']) . '</h3>'
      . '<p class="card-sub">' . date('d/m/Y H:i', strtotime((string) $n['criado_em'])) . '</p></div>'
      . '<span class="' . $cls . '">' . h(ucfirst((string) $n['tipo'])) . '</span></div>';

    if (!empty($n['mensagem'])) {
        $listaHtml .= '<p style="font-size:13px;color:var(--text-muted);margin-bottom:10px">' . h($n['mensagem']) . '</p>';
    }
    $listaHtml .= '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
    if (!empty($n['link'])) {
        $listaHtml .= '<a class="btn btn-sm" href="' . h($n['link']) . '">Abrir ' . icon('chevron-right', 13) . '</a>';
    }
    if (!$n['lida']) {
        $listaHtml .= '<form method="post">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="marcar_lida">'
          . '<input type="hidden" name="notificacao_id" value="' . (int) $n['id'] . '">'
          . '<button class="btn btn-sm btn-ghost" type="submit">' . icon('check', 13) . ' Marcar como lida</button>'
          . '</form>';
    }
    $listaHtml .= '</div></article>';
}
if ($listaHtml === '') {
    $listaHtml = '<div class="empty">'
        . ($termo !== ''
            ? 'Nenhum aviso encontrado para <strong>' . h($termo) . '</strong>. <a href="?filtro=' . h($filtro) . '">Limpar busca</a>.'
            : ($filtro === 'todas' ? 'Nenhum aviso.' : 'Nenhum aviso não lido. Tudo em dia.'))
        . '</div>';
} else {
    $listaHtml .= render_paginacao($paginacao);
}

$proximosHtml = '';
foreach ($proximos as $p) {
    $dt = new DateTimeImmutable((string) $p['inicio']);
    $proximosHtml .= '<div class="agenda-item"><div class="agenda-data"><span>' . $dt->format('d/m')
      . '</span><small>' . $dt->format('H:i') . '</small></div>'
      . '<div style="min-width:0"><p class="agenda-titulo">' . h($p['titulo']) . '</p>'
      . '<p class="agenda-sub">' . h(ucfirst((string) $p['categoria'])) . '</p></div></div>';
}
if ($proximosHtml === '') {
    $proximosHtml = '<p style="font-size:12.5px;color:var(--text-muted)">Nenhum evento nos próximos 7 dias.</p>';
}

$atrasadasHtml = '';
foreach ($atrasadas as $a) {
    $atrasadasHtml .= '<div class="agenda-item"><div class="agenda-data" style="background:var(--danger-soft);color:var(--danger)">'
      . '<span>' . date('d/m', strtotime((string) $a['semana_fim'])) . '</span><small>prazo</small></div>'
      . '<div style="min-width:0"><p class="agenda-titulo">' . h($a['titulo']) . '</p>'
      . '<p class="agenda-sub">' . number_format((float) $a['progresso'], 0) . '% concluído</p></div></div>';
}
if ($atrasadasHtml === '') {
    $atrasadasHtml = '<p style="font-size:12.5px;color:var(--text-muted)">Nenhuma meta atrasada. Bom trabalho.</p>';
}

$contador = contar_notificacoes((int) $user['id']);

$conteudo = $flash
  . '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">'
  . '<div><h2 style="margin-bottom:2px">Alertas</h2>'
  . '<p style="font-size:12.5px;color:var(--text-muted)">' . $contador . ' não lido(s)</p></div>'
  . '<div class="row" style="gap:6px;flex-wrap:wrap">'
  . '<a class="btn btn-sm' . ($filtro === 'naolidas' ? ' btn-primary' : '') . '" href="?filtro=naolidas">Não lidas</a>'
  . '<a class="btn btn-sm' . ($filtro === 'todas' ? ' btn-primary' : '') . '" href="?filtro=todas">Todas</a>'
  . ($contador > 0
      ? '<form method="post"><input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
        . '<input type="hidden" name="action" value="marcar_todas">'
        . '<button class="btn btn-sm" type="submit">' . icon('check', 14) . ' Marcar todas</button></form>'
      : '')
  . '</div></div>'
  . '<div style="margin-bottom:14px">'
  . campo_busca($termo, 'Buscar aviso por título ou mensagem…', ['filtro' => $filtro], 'busca')
  . '</div>'

  . '<div class="grid grid-3" style="align-items:start">'
  . '<div style="grid-column:span 2;display:flex;flex-direction:column;gap:10px">' . $listaHtml . '</div>'
  . '<div style="display:flex;flex-direction:column;gap:14px">'
  . '<section class="card"><div class="card-head"><h3>Próximos 7 dias</h3></div>'
  . '<div class="agenda">' . $proximosHtml . '</div></section>'
  . '<section class="card"><div class="card-head"><h3>Metas atrasadas</h3></div>'
  . '<div class="agenda">' . $atrasadasHtml . '</div></section>'
  . '</div></div>';

page($user, 'alertas', 'Alertas', 'Avisos, prazos e eventos próximos', $conteudo, [
    'funcao'       => funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']),
    'notificacoes' => $contador,
]);
