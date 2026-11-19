<?php
/**
 * Calendário — eventos com escopo (geral / equipe / pessoa).
 *
 * O que a página faz:
 *  - grade do mês navegável (?mes=YYYY-MM) montada a partir do banco;
 *  - ao clicar num evento, abre um MODAL com tudo: título, quem criou (nome e
 *    data), quando, onde, categoria, visibilidade, descrição completa, link,
 *    participantes e vínculo com a meta;
 *  - busca por título/descrição/local, filtrando a grade no SQL;
 *  - "Não acumular informação": a grade busca só o intervalo do mês.
 */
require_once __DIR__ . '/../layout.php';

$user  = require_login();
$admin = is_gestor($user);
$pdo   = db();
$erro  = '';
$uid   = (int) $user['id'];
$renderizarPagina = !defined('ELLENCO_PREVIEW');

$CATEGORIAS = [
    'reuniao'        => 'Reunião',
    'fiscalizacao'   => 'Fiscalização',
    'manutencao'     => 'Manutenção',
    'eventos'        => 'Eventos',
    'meta_concluida' => 'Meta concluída',
    'outros'         => 'Outros',
];

$termo = termo_busca($_GET['busca'] ?? '');

/* ---------------------------------------------------------------- ações -- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $erro = 'Sua sessão expirou. Recarregue a página e tente novamente.';
    } else {
        $acao = (string) ($_POST['action'] ?? '');
        $mesVolta = preg_match('/^\d{4}-\d{2}$/', (string) ($_POST['mes'] ?? '')) ? (string) $_POST['mes'] : '';

        if ($acao === 'criar_evento') {
            require_permission($user, 'EVENTO_EDITAR');

            $titulo  = trim((string) ($_POST['titulo'] ?? ''));
            $inicio  = str_replace('T', ' ', (string) ($_POST['inicio'] ?? ''));
            if (strlen($inicio) === 16) $inicio .= ':00';
            $fim = str_replace('T', ' ', (string) ($_POST['fim'] ?? ''));
            if (strlen($fim) === 16) $fim .= ':00';
            $categoria   = (string) ($_POST['categoria'] ?? 'outros');
            $escopo      = (string) ($_POST['escopo'] ?? 'geral');
            $equipeId    = (int) ($_POST['equipe_id'] ?? 0);
            $usuarioId   = (int) ($_POST['usuario_id'] ?? 0);
            $local       = trim((string) ($_POST['local'] ?? ''));
            $link        = trim((string) ($_POST['link'] ?? ''));
            $participantes = trim((string) ($_POST['participantes'] ?? ''));

            $dataValida = (bool) DateTime::createFromFormat('Y-m-d H:i:s', $inicio);
            $escopoValido = match ($escopo) {
                'equipe' => $equipeId > 0,
                'pessoa' => $usuarioId > 0,
                default  => true,
            };

            if ($titulo === '' || !$dataValida || !isset($CATEGORIAS[$categoria]) || !$escopoValido) {
                $erro = 'Preencha título, data/hora válida e o destino do evento.';
            } elseif ($link !== '' && !preg_match('~^https?://~i', $link)) {
                $erro = 'O link precisa começar com http:// ou https://.';
            } else {
                try {
                    $pdo->prepare(
                        'INSERT INTO eventos (titulo, descricao, setor, inicio, fim, local, link, participantes,
                                              categoria, criado_por, escopo, equipe_id, usuario_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    )->execute([
                        mb_substr($titulo, 0, 200),
                        trim((string) ($_POST['descricao'] ?? '')) ?: null,
                        $user['setor'] ?? null,
                        $inicio,
                        ($fim !== '' && $fim > $inicio) ? $fim : null,
                        $local !== '' ? mb_substr($local, 0, 200) : null,
                        $link !== '' ? $link : null,
                        $participantes !== '' ? mb_substr($participantes, 0, 500) : null,
                        $categoria, $uid, $escopo,
                        $escopo === 'equipe' ? $equipeId : null,
                        $escopo === 'pessoa' ? $usuarioId : null,
                    ]);
                    $eventoId = (int) $pdo->lastInsertId();

                    // avisa quem o evento alcança
                    $alvos = [];
                    if ($escopo === 'pessoa') {
                        $alvos = [$usuarioId];
                    } elseif ($escopo === 'equipe') {
                        $st = $pdo->prepare('SELECT usuario_id FROM equipe_membros WHERE equipe_id = ? LIMIT 500');
                        $st->execute([$equipeId]);
                        $alvos = array_map('intval', array_column($st->fetchAll(), 'usuario_id'));
                    }
                    foreach ($alvos as $alvo) {
                        notificar($alvo, 'evento', 'Novo evento no calendário', $titulo,
                            'calendario.html?mes=' . substr($inicio, 0, 7),
                            'evento:' . $eventoId . ':' . $alvo);
                    }

                    redirecionar('calendario.html?' . http_build_query(array_filter([
                        'mes' => substr($inicio, 0, 7), 'salvo' => 'Evento criado.',
                    ])));
                } catch (Throwable $e) {
                    $erro = 'Não foi possível criar o evento'
                          . ($e instanceof PDOException && $e->getCode() === '42P01'
                              ? ': a migração database-V1.sql ainda não foi aplicada.' : '.');
                }
            }
        }

        if ($acao === 'excluir_evento') {
            require_permission($user, 'EVENTO_EDITAR');
            $id = (int) ($_POST['evento_id'] ?? 0);
            if ($id > 0) {
                try {
                    // só quem criou, ou admin/gestor
                    $stmt = $pdo->prepare('DELETE FROM eventos WHERE id = ? AND (criado_por = ? OR ?)');
                    $stmt->execute([$id, $uid, $admin ? 1 : 0]);
                    redirecionar('calendario.html?' . http_build_query(array_filter([
                        'mes' => $mesVolta, 'salvo' => 'Evento excluído.',
                    ])));
                } catch (Throwable $e) {
                    $erro = 'Não foi possível excluir o evento.';
                }
            }
        }
    }
}

/* ------------------------------------------------------- mês navegável --- */
$mesParam = (string) ($_GET['mes'] ?? '');
$hoje = new DateTimeImmutable('today');
$ref  = preg_match('/^\d{4}-\d{2}$/', $mesParam)
    ? (DateTimeImmutable::createFromFormat('Y-m-d', $mesParam . '-01') ?: $hoje->modify('first day of this month'))
    : $hoje->modify('first day of this month');

$inicioMes = $ref->modify('first day of this month');
$fimMes    = $ref->modify('last day of this month');
$inicioGrade = $inicioMes->modify('-' . (int) $inicioMes->format('w') . ' days');
$fimGrade    = $fimMes->modify('+' . (int) (6 - (int) $fimMes->format('w')) . ' days');

$mesAnterior = $inicioMes->modify('-1 month')->format('Y-m');
$mesProximo  = $inicioMes->modify('+1 month')->format('Y-m');
$MESES = ['01' => 'janeiro', '02' => 'fevereiro', '03' => 'março', '04' => 'abril',
          '05' => 'maio', '06' => 'junho', '07' => 'julho', '08' => 'agosto',
          '09' => 'setembro', '10' => 'outubro', '11' => 'novembro', '12' => 'dezembro'];
$tituloMes = $MESES[$inicioMes->format('m')] . ' de ' . $inicioMes->format('Y');

/* ------------------------------------------------------- carregar dados --- */
$eventos = [];
$erroBanco = '';
$minhasEquipes = [];

try {
    $minhasEquipes = equipes_do_usuario($uid);
    $inEquipes = $minhasEquipes ? implode(',', array_map('intval', $minhasEquipes)) : '0';

    // visibilidade: geral OU da equipe do usuário OU para ele OU criado por ele
    $sql = "SELECT e.id, e.titulo, e.descricao, e.inicio, e.fim, e.local, e.link, e.participantes,
                   e.categoria, e.escopo, e.criado_por, e.criado_em, e.meta_id,
                   e.equipe_id, e.usuario_id,
                   eq.nome AS equipe_nome,
                   u.nome AS pessoa_nome,
                   uc.nome AS criador_nome,
                   m.titulo AS meta_titulo
            FROM eventos e
            LEFT JOIN equipes  eq ON eq.id = e.equipe_id
            LEFT JOIN usuarios u  ON u.id  = e.usuario_id
            LEFT JOIN usuarios uc ON uc.id = e.criado_por
            LEFT JOIN metas    m  ON m.id  = e.meta_id
            WHERE e.inicio >= ? AND e.inicio < ?
              AND ( e.escopo = 'geral'
                 OR e.criado_por = ?
                 OR (e.escopo = 'pessoa' AND e.usuario_id = ?)
                 OR (e.escopo = 'equipe' AND e.equipe_id IN ($inEquipes)) )";
    $params = [
        $inicioGrade->format('Y-m-d 00:00:00'),
        $fimGrade->modify('+1 day')->format('Y-m-d 00:00:00'),
        $uid, $uid,
    ];
    if ($termo !== '') {
        $like = '%' . $termo . '%';
        $sql .= ' AND (e.titulo ILIKE ? OR e.descricao ILIKE ? OR e.local ILIKE ?)';
        array_push($params, $like, $like, $like);
    }
    $sql .= ' ORDER BY e.inicio LIMIT 500';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $eventos = $stmt->fetchAll();
} catch (Throwable $e) {
    $erroBanco = $e instanceof PDOException && $e->getCode() === '42P01'
        ? 'a migração database-V1.sql ainda não foi aplicada.'
        : 'erro ao carregar os eventos.';
}

/* próximos 6 eventos (painel lateral) */
$proximos = [];
try {
    $stmt = $pdo->prepare(
        "SELECT e.id, e.titulo, e.inicio, e.categoria, e.local, uc.nome AS criador_nome
         FROM eventos e LEFT JOIN usuarios uc ON uc.id = e.criado_por
         WHERE e.inicio >= now()
           AND ( e.escopo = 'geral' OR e.criado_por = ?
              OR (e.escopo = 'pessoa' AND e.usuario_id = ?)
              OR (e.escopo = 'equipe' AND e.equipe_id IN (SELECT equipe_id FROM equipe_membros WHERE usuario_id = ?)) )
         ORDER BY e.inicio LIMIT 6"
    );
    $stmt->execute([$uid, $uid, $uid]);
    $proximos = $stmt->fetchAll();
} catch (Throwable $e) { /* ignora */ }

/* listas para o formulário */
$equipes = [];
$pessoas = [];
if ($admin) {
    try {
        $equipes = $pdo->query('SELECT id, nome FROM equipes ORDER BY nome LIMIT 100')->fetchAll();
        $pessoas = $pdo->query('SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome LIMIT 300')->fetchAll();
    } catch (Throwable $e) { /* migração pendente */ }
}

/* ----------------------------------------------------------- renderizar --- */
$flash = $erro !== '' ? '<div class="alert alert-danger" role="alert">' . h($erro) . '</div>' : '';
if ($erroBanco !== '') $flash .= aviso_migracao() . '<div class="alert alert-danger">Detalhe: ' . h($erroBanco) . '</div>';

$corCategoria = [
    'reuniao'        => 'var(--chart-1)',
    'fiscalizacao'   => 'var(--chart-2)',
    'manutencao'     => 'var(--chart-4)',
    'eventos'        => 'var(--chart-3)',
    'meta_concluida' => 'var(--success)',
    'outros'         => 'var(--text-subtle)',
];

/* agrupa por dia */
$porDia = [];
foreach ($eventos as $ev) {
    $porDia[substr((string) $ev['inicio'], 0, 10)][] = $ev;
}

$DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
$gradeHtml = '<div class="cal-grade" role="grid" aria-label="Calendário de ' . h($tituloMes) . '">';
foreach ($DIAS_SEMANA as $d) {
    $gradeHtml .= '<div class="cal-dow" role="columnheader">' . $d . '</div>';
}

$cursor = $inicioGrade;
$limite = $fimGrade->modify('+1 day');
while ($cursor < $limite) {
    $iso   = $cursor->format('Y-m-d');
    $foraDoMes = $cursor->format('m') !== $inicioMes->format('m');
    $ehHoje = $iso === $hoje->format('Y-m-d');
    $doDia  = $porDia[$iso] ?? [];

    $gradeHtml .= '<div class="cal-dia' . ($foraDoMes ? ' is-fora' : '') . ($ehHoje ? ' is-hoje' : '') . '" role="gridcell">'
      . '<div class="cal-num">' . (int) $cursor->format('j') . '</div>';

    foreach (array_slice($doDia, 0, 3) as $ev) {
        $hora = substr((string) $ev['inicio'], 11, 5);
        $cor  = $corCategoria[$ev['categoria']] ?? 'var(--text-subtle)';
        $gradeHtml .= '<button type="button" class="cal-evento" style="--cor:' . $cor . '"'
                   . ' data-modal-abrir="modal-evento-' . (int) $ev['id'] . '"'
                   . ' title="' . h($ev['titulo'] . ' — ' . $hora) . '">'
                   . '<span class="cal-hora">' . $hora . '</span>'
                   . '<span class="cal-titulo">' . h((string) $ev['titulo']) . '</span></button>';
    }
    if (count($doDia) > 3) {
        $gradeHtml .= '<span class="cal-mais">+' . (count($doDia) - 3) . ' mais</span>';
    }

    $gradeHtml .= '</div>';
    $cursor = $cursor->modify('+1 day');
}
$gradeHtml .= '</div>';

/* legenda */
$legendaHtml = '<div class="chart-legend">';
foreach ($CATEGORIAS as $chave => $label) {
    $legendaHtml .= '<span><i style="background:' . ($corCategoria[$chave] ?? 'var(--text-subtle)') . '"></i>'
                  . h($label) . '</span>';
}
$legendaHtml .= '</div>';

/* próximos */
$proximosHtml = '';
foreach ($proximos as $p) {
    $dt = new DateTimeImmutable((string) $p['inicio']);
    $proximosHtml .= '<button type="button" class="agenda-item" style="width:100%;text-align:left;border:0;background:transparent;cursor:pointer"'
      . ' data-modal-abrir="modal-evento-' . (int) $p['id'] . '">'
      . '<span class="agenda-data"><span>' . $dt->format('d/m') . '</span><small>' . $dt->format('H:i') . '</small></span>'
      . '<span style="min-width:0"><span class="agenda-titulo" style="display:block">' . h((string) $p['titulo']) . '</span>'
      . '<span class="agenda-sub">' . h($CATEGORIAS[$p['categoria']] ?? 'Outros')
      . ($p['local'] ? ' · ' . h((string) $p['local']) : '') . '</span></span></button>';
}
if ($proximosHtml === '') {
    $proximosHtml = '<p class="text-sm muted">Nenhum evento futuro.</p>';
}

/* --------------------------------------------------- modais de detalhe --- */
$modaisEvento = '';
if ($renderizarPagina) {
    foreach ($eventos as $ev) {
        $id = (int) $ev['id'];
        $inicio = new DateTimeImmutable((string) $ev['inicio']);
        $fimTxt = '';
        if (!empty($ev['fim'])) {
            $fimDt = new DateTimeImmutable((string) $ev['fim']);
            $fimTxt = $fimDt->format('d/m/Y H:i');
        }
        $podeExcluir = $admin || (int) $ev['criado_por'] === $uid;

        $escopoTxt = $ev['escopo'] === 'equipe'
            ? 'Equipe: ' . ($ev['equipe_nome'] ?: '—')
            : ($ev['escopo'] === 'pessoa' ? 'Pessoa: ' . ($ev['pessoa_nome'] ?: '—') : 'Todos');

        $corpo = '<div class="modal-body stack">'
          . '<div class="detalhe-topo">'
          . '<div class="row"><span class="badge" style="color:' . ($corCategoria[$ev['categoria']] ?? 'var(--text-subtle)') . '">'
          . h($CATEGORIAS[$ev['categoria']] ?? 'Outros') . '</span>'
          . '<span class="badge">' . h($escopoTxt) . '</span></div>'
          . '<h3 class="detalhe-titulo">' . h((string) $ev['titulo']) . '</h3>'
          . '<p class="detalhe-sub">' . $inicio->format('d/m/Y \\à\\s H:i') . '</p></div>'

          . '<section class="detalhe-secao"><h3>Informações</h3><dl class="info-lista">'
          . '<dt>' . icon('user', 14) . ' Criado por</dt><dd>' . h((string) ($ev['criador_nome'] ?? '—')) . '</dd>'
          . '<dt>' . icon('clock', 14) . ' Criado em</dt><dd>'
          . (!empty($ev['criado_em']) ? date('d/m/Y H:i', strtotime((string) $ev['criado_em'])) : '—') . '</dd>'
          . '<dt>' . icon('calendar', 14) . ' Início</dt><dd>' . $inicio->format('d/m/Y H:i') . '</dd>'
          . ($fimTxt !== '' ? '<dt>' . icon('clock', 14) . ' Fim</dt><dd>' . $fimTxt . '</dd>' : '')
          . (!empty($ev['local']) ? '<dt>' . icon('map-pin', 14) . ' Local</dt><dd>' . h((string) $ev['local']) . '</dd>' : '')
          . (!empty($ev['participantes']) ? '<dt>' . icon('users', 14) . ' Participantes</dt><dd>' . h((string) $ev['participantes']) . '</dd>' : '')
          . '<dt>' . icon('shield', 14) . ' Visibilidade</dt><dd>' . h($escopoTxt) . '</dd>'
          . (!empty($ev['meta_titulo'])
                ? '<dt>' . icon('target', 14) . ' Meta</dt><dd><a href="' . h(app_path('painel.html?busca=' . rawurlencode((string) $ev['meta_titulo']))) . '">'
                  . h((string) $ev['meta_titulo']) . '</a></dd>' : '')
          . '</dl></section>';

        if (!empty($ev['descricao'])) {
            $corpo .= '<section class="detalhe-secao"><h3>Descrição</h3>'
                    . '<div class="descricao-rica">' . nl2br(h((string) $ev['descricao'])) . '</div></section>';
        }

        if (!empty($ev['link'])) {
            $corpo .= '<section class="detalhe-secao"><h3>Link</h3>'
                    . '<a class="anexo anexo-link" href="' . h((string) $ev['link']) . '" target="_blank" rel="noopener noreferrer">'
                    . '<span class="anexo-icone">' . icon('link', 17) . '</span>'
                    . '<span style="min-width:0"><span class="anexo-nome">' . h((string) $ev['link']) . '</span>'
                    . '<span class="anexo-meta">Abrir em nova aba</span></span>'
                    . '<span class="anexo-tag">Link</span></a></section>';
        }

        $corpo .= '</div>';

        $modaisEvento .= '<dialog class="modal modal-largo" id="modal-evento-' . $id . '"'
          . ' aria-labelledby="titulo-evento-' . $id . '">'
          . '<div class="modal-inner">'
          . '<div class="modal-head"><div><h2 id="titulo-evento-' . $id . '">Evento</h2>'
          . '<p class="card-sub">' . h((string) $ev['titulo']) . '</p></div>'
          . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
          . $corpo
          . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Fechar</button>';
        if ($podeExcluir) {
            $modaisEvento .= '<form method="post">'
              . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
              . '<input type="hidden" name="action" value="excluir_evento">'
              . '<input type="hidden" name="evento_id" value="' . $id . '">'
              . '<input type="hidden" name="mes" value="' . h($inicioMes->format('Y-m')) . '">'
              . '<button class="btn btn-danger" type="submit" data-confirmar="Excluir este evento?">'
              . icon('trash', 14) . ' Excluir</button></form>';
        }
        $modaisEvento .= '</div></div></dialog>';
    }
}

/* modal de criar evento */
$opcoesEquipe = '<option value="">Escolher equipe…</option>';
foreach ($equipes as $eq) {
    $opcoesEquipe .= '<option value="' . (int) $eq['id'] . '">' . h((string) $eq['nome']) . '</option>';
}
$opcoesPessoa = '<option value="">Escolher pessoa…</option>';
foreach ($pessoas as $p) {
    $opcoesPessoa .= '<option value="' . (int) $p['id'] . '">' . h((string) $p['nome']) . '</option>';
}

$opcoesCategoria = '';
foreach ($CATEGORIAS as $k => $v) {
    if ($k === 'meta_concluida') continue;   // gerado pelo sistema
    $opcoesCategoria .= '<option value="' . $k . '">' . h($v) . '</option>';
}

$modalCriar = ($admin && $renderizarPagina)
  ? '<dialog class="modal" id="modal-criar-evento" aria-labelledby="titulo-criar-evento">'
    . '<form method="post" class="modal-inner">'
    . '<div class="modal-head"><div><h2 id="titulo-criar-evento">Novo evento</h2>'
    . '<p class="card-sub">Escolha para quem o evento aparece.</p></div>'
    . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
    . '<div class="modal-body stack">'
    . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
    . '<input type="hidden" name="action" value="criar_evento">'
    . '<div class="field"><label for="ev-titulo">Título</label>'
    . '<input type="text" id="ev-titulo" name="titulo" maxlength="200" required placeholder="Ex.: Vistoria da estrutura"></div>'
    . '<div class="grid grid-2">'
    . '<div class="field"><label for="ev-inicio">Início</label>'
    . '<input type="datetime-local" id="ev-inicio" name="inicio" required></div>'
    . '<div class="field"><label for="ev-fim">Fim (opcional)</label>'
    . '<input type="datetime-local" id="ev-fim" name="fim"></div></div>'
    . '<div class="grid grid-2">'
    . '<div class="field"><label for="ev-categoria">Categoria</label>'
    . '<select id="ev-categoria" name="categoria">' . $opcoesCategoria . '</select></div>'
    . '<div class="field"><label for="ev-local">Local</label>'
    . '<input type="text" id="ev-local" name="local" maxlength="200" placeholder="Ex.: Canteiro — Bloco A"></div></div>'
    . '<div class="field"><label for="ev-escopo">Visibilidade</label>'
    . '<select id="ev-escopo" name="escopo" data-destino>'
    . '<option value="geral">Todos</option>'
    . '<option value="equipe">Uma equipe</option>'
    . '<option value="pessoa">Uma pessoa</option></select></div>'
    . '<div class="field" data-destino-equipe hidden><label for="ev-equipe">Equipe</label>'
    . '<select id="ev-equipe" name="equipe_id">' . $opcoesEquipe . '</select></div>'
    . '<div class="field" data-destino-pessoa hidden><label for="ev-pessoa">Pessoa</label>'
    . '<select id="ev-pessoa" name="usuario_id">' . $opcoesPessoa . '</select></div>'
    . '<div class="field"><label for="ev-participantes">Participantes</label>'
    . '<input type="text" id="ev-participantes" name="participantes" maxlength="500" placeholder="Nomes separados por vírgula"></div>'
    . '<div class="field"><label for="ev-link">Link (opcional)</label>'
    . '<input type="url" id="ev-link" name="link" placeholder="https://…"></div>'
    . '<div class="field"><label for="ev-descricao">Descrição</label>'
    . '<textarea id="ev-descricao" name="descricao" maxlength="1000" placeholder="Pauta, responsável, observações…"></textarea></div>'
    . '</div><div class="modal-foot">'
    . '<button class="btn" type="button" data-modal-close>Cancelar</button>'
    . '<button class="btn btn-primary" type="submit">Criar evento</button></div>'
    . '</form></dialog>'
  : '';

$botaoNovo = $admin
    ? '<button class="btn btn-primary" type="button" data-modal-abrir="modal-criar-evento">'
      . icon('plus', 16) . ' Novo evento</button>'
    : '';

$conteudo = $flash
  . '<div class="row-between" style="margin-bottom:14px">'
  . campo_busca($termo, 'Buscar evento por título, descrição ou local…',
        array_filter(['mes' => $inicioMes->format('Y-m')]), 'busca')
  . $botaoNovo . '</div>'

  . '<section class="card" style="padding:0;overflow:hidden;margin-bottom:16px" aria-label="Calendário">'
  . '<div class="cal-head">'
  . '<a class="icon-btn" href="?' . h(http_build_query(array_filter(['mes' => $mesAnterior, 'busca' => $termo ?: null]))) . '" aria-label="Mês anterior">' . icon('chevron-left', 18) . '</a>'
  . '<div class="cal-titulo-mes"><h2>' . h($tituloMes) . '</h2>'
  . '<a href="' . h(app_path('calendario.html')) . '" style="font-size:11.5px">Hoje</a></div>'
  . '<a class="icon-btn" href="?' . h(http_build_query(array_filter(['mes' => $mesProximo, 'busca' => $termo ?: null]))) . '" aria-label="Próximo mês">' . icon('chevron-right', 18) . '</a>'
  . ($termo !== '' ? '<span class="badge badge-info">busca: ' . h($termo) . '</span>' : '')
  . '</div>'
  . $gradeHtml
  . '<div style="padding:12px 16px;border-top:1px solid var(--border)">' . $legendaHtml . '</div>'
  . '</section>'

  . '<div class="grid grid-2">'
  . '<section class="card"><div class="card-head"><div><h3>Próximos eventos</h3>'
  . '<p class="card-sub">Clique para ver os detalhes.</p></div>'
  . '<a class="btn btn-sm" href="' . h(app_path('alertas.html')) . '">' . icon('bell', 14) . ' Avisos</a>'
  . '</div><div class="agenda">' . $proximosHtml . '</div></section>'
  . '<section class="card"><div class="card-head"><div><h3>Resumo do mês</h3>'
  . '<p class="card-sub">Eventos visíveis para você neste mês.</p></div></div>'
  . '<div class="metric"><span class="metric-value">' . count(array_filter($eventos, function ($ev) use ($inicioMes) {
        return substr((string) $ev['inicio'], 0, 7) === $inicioMes->format('Y-m');
    })) . '</span><span class="metric-hint">eventos no mês</span></div>'
  . '</section></div>'

  . $modalCriar . $modaisEvento;

page($user, 'calendario', 'Calendário', 'Eventos da empresa, das equipes e seus', $conteudo, [
    'funcao'       => funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']),
    'notificacoes' => contar_notificacoes($uid),
]);
