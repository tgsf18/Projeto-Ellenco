<?php
/**
 * Equipe — criar e gerenciar equipes, incluir/remover pessoas, catálogo de
 * funções e a tabela de pessoas com busca.
 *
 * Regras:
 *  - Criar/excluir equipe e definir funções: só administrador(a).
 *  - Incluir/remover membro: administrador(a) ou gestor(a).
 *  - Toda lista é filtrada e paginada no SQL (LIMIT/OFFSET + COUNT).
 */
require_once __DIR__ . '/../layout.php';

$user  = require_login();
$podeEquipe = can($user, 'EQUIPE_GERENCIAR');
$podeFuncao = can($user, 'FUNCAO_GERENCIAR');
$uid = (int) $user['id'];
$renderizarPagina = !defined('ELLENCO_PREVIEW');

$termo  = termo_busca($_GET['busca'] ?? '');
$aba    = (string) ($_GET['aba'] ?? 'equipes');          // equipes | pessoas | funcoes
if (!in_array($aba, ['equipes', 'pessoas', 'funcoes'], true)) $aba = 'equipes';
$pagina = pagina_atual();
$porPagina = 9;
$mensagemErro = '';

function erro_banco(Throwable $e): string {
    $codigo = $e instanceof PDOException ? (string) $e->getCode() : '';
    if ($codigo === '42P01') return 'a migração database-V1.sql ainda não foi aplicada.';
    if ($codigo === '23505') return 'já existe um registro com esse nome.';
    if ($codigo === '23503') return 'esse registro está em uso e não pode ser removido.';
    return 'erro no banco de dados' . ($codigo ? ' (' . $codigo . ')' : '') . '.';
}

/* ======================================================= ações (POST) === */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $mensagemErro = 'Sua sessão expirou. Recarregue a página e tente novamente.';
    } else {
        $acao = (string) ($_POST['action'] ?? '');
        $voltar = 'equipe.html?' . http_build_query(array_filter(['aba' => $aba, 'busca' => $termo !== '' ? $termo : null]));

        /* ------------------------------------------------ criar equipe --- */
        if ($acao === 'criar_equipe') {
            require_permission($user, 'EQUIPE_GERENCIAR');
            $nome = trim((string) ($_POST['nome'] ?? ''));
            $desc = trim((string) ($_POST['descricao'] ?? ''));
            if ($nome === '') {
                $mensagemErro = 'Dê um nome à equipe.';
            } else {
                try {
                    $pdo = db();
                    $pdo->prepare('INSERT INTO equipes (nome, descricao, criado_por) VALUES (?, ?, ?)')
                        ->execute([mb_substr($nome, 0, 120), $desc !== '' ? mb_substr($desc, 0, 255) : null, $uid]);
                    $equipeId = (int) $pdo->lastInsertId();

                    // já inclui os membros marcados na criação
                    $membros = array_map('intval', (array) ($_POST['membros'] ?? []));
                    if ($membros) {
                        $ins = $pdo->prepare('INSERT INTO equipe_membros (equipe_id, usuario_id, papel)
                                              VALUES (?, ?, ?) ON CONFLICT (equipe_id, usuario_id)
                                              DO UPDATE SET papel = EXCLUDED.papel');
                        foreach ($membros as $m) {
                            if ($m > 0) $ins->execute([$equipeId, $m, 'membro']);
                        }
                    }
                    redirecionar($voltar, 'Equipe criada com ' . count($membros) . ' membro(s).');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível criar a equipe: ' . erro_banco($e);
                }
            }
        }

        /* ----------------------------------------------- incluir membro -- */
        if ($acao === 'add_membro') {
            require_permission($user, 'EQUIPE_GERENCIAR');
            $equipeId  = (int) ($_POST['equipe_id'] ?? 0);
            $usuarioId = (int) ($_POST['usuario_id'] ?? 0);
            $papel     = (string) ($_POST['papel'] ?? 'membro');
            if (!in_array($papel, ['membro', 'lider'], true)) $papel = 'membro';

            if ($equipeId < 1 || $usuarioId < 1) {
                $mensagemErro = 'Escolha a equipe e a pessoa.';
            } else {
                try {
                    db()->prepare('INSERT INTO equipe_membros (equipe_id, usuario_id, papel)
                                   VALUES (?, ?, ?)
                                   ON CONFLICT (equipe_id, usuario_id) DO UPDATE SET papel = EXCLUDED.papel')
                        ->execute([$equipeId, $usuarioId, $papel]);
                    notificar($usuarioId, 'aviso_pessoal', 'Você entrou em uma equipe',
                        'Seu acesso agora inclui as metas e eventos da equipe.',
                        'equipe.html', 'equipe:' . $equipeId . ':' . $usuarioId);
                    redirecionar($voltar, 'Membro incluído na equipe.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível incluir o membro: ' . erro_banco($e);
                }
            }
        }

        /* ---------------------------------------------- remover membro --- */
        if ($acao === 'remover_membro') {
            require_permission($user, 'EQUIPE_GERENCIAR');
            $equipeId  = (int) ($_POST['equipe_id'] ?? 0);
            $usuarioId = (int) ($_POST['usuario_id'] ?? 0);
            if ($equipeId > 0 && $usuarioId > 0) {
                try {
                    db()->prepare('DELETE FROM equipe_membros WHERE equipe_id = ? AND usuario_id = ?')
                        ->execute([$equipeId, $usuarioId]);
                    redirecionar($voltar, 'Membro removido da equipe.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível remover: ' . erro_banco($e);
                }
            }
        }

        /* ------------------------------------------------ excluir equipe - */
        if ($acao === 'excluir_equipe') {
            require_permission($user, 'EQUIPE_GERENCIAR');
            $equipeId = (int) ($_POST['equipe_id'] ?? 0);
            if ($equipeId > 0) {
                try {
                    db()->prepare('DELETE FROM equipes WHERE id = ?')->execute([$equipeId]);
                    redirecionar($voltar, 'Equipe excluída. As pessoas continuam cadastradas.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível excluir a equipe: ' . erro_banco($e);
                }
            }
        }

        /* ------------------------------------------------- criar função - */
        if ($acao === 'criar_funcao') {
            require_permission($user, 'FUNCAO_GERENCIAR');
            $nome = trim((string) ($_POST['nome'] ?? ''));
            if ($nome === '') {
                $mensagemErro = 'Dê um nome à função.';
            } else {
                try {
                    db()->prepare('INSERT INTO funcoes (nome) VALUES (?) ON CONFLICT (nome) DO NOTHING')
                        ->execute([mb_substr($nome, 0, 80)]);
                    redirecionar($voltar, 'Função criada.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível criar a função: ' . erro_banco($e);
                }
            }
        }

        /* ---------------------------------------------- definir função -- */
        if ($acao === 'definir_funcao') {
            require_permission($user, 'FUNCAO_GERENCIAR');
            $usuarioId = (int) ($_POST['usuario_id'] ?? 0);
            $funcaoId  = (int) ($_POST['funcao_id'] ?? 0);
            if ($usuarioId > 0) {
                try {
                    db()->prepare('UPDATE usuarios SET funcao_id = ? WHERE id = ?')
                        ->execute([$funcaoId > 0 ? $funcaoId : null, $usuarioId]);
                    redirecionar($voltar, 'Função atualizada.');
                } catch (Throwable $e) {
                    $mensagemErro = 'Não foi possível atualizar a função: ' . erro_banco($e);
                }
            }
        }
    }
}

/* ================================================== carregar dados ====== */
$pdo = db();
$erroBanco = '';
$equipes = [];
$totalEquipes = 0;
$pessoas = [];
$totalPessoas = 0;
$funcoes = [];
$todasPessoas = [];
$membrosPorEquipe = [];
$paginacaoEquipes = paginacao(1, $porPagina, 1);
$paginacaoPessoas = paginacao(1, 20, 1);

try {
    /* ---------------- equipes (paginado, com busca) ---------------- */
    $cond = '';
    $params = [];
    if ($termo !== '') {
        $like = '%' . $termo . '%';
        $cond = ' AND (e.nome ILIKE ? OR e.descricao ILIKE ?'
              . " OR EXISTS (SELECT 1 FROM equipe_membros em2 JOIN usuarios u2 ON u2.id = em2.usuario_id
                             WHERE em2.equipe_id = e.id AND u2.nome ILIKE ?))";
        $params = [$like, $like, $like];
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM equipes e WHERE 1 = 1$cond");
    $stmt->execute($params);
    $totalEquipes = (int) $stmt->fetchColumn();
    $paginacaoEquipes = paginacao($totalEquipes, $porPagina, $pagina, array_filter([
        'aba' => 'equipes', 'busca' => $termo !== '' ? $termo : null,
    ]));

    [$limite, $offset] = janela($porPagina, $pagina);
    $stmt = $pdo->prepare("SELECT e.id, e.nome, e.descricao, e.criado_em,
                   (SELECT COUNT(*) FROM equipe_membros em WHERE em.equipe_id = e.id) AS total_membros,
                   (SELECT COUNT(*) FROM meta_atribuicoes a
                      JOIN equipe_membros em ON em.usuario_id = a.usuario_id
                     WHERE em.equipe_id = e.id AND a.status = 'concluida') AS metas_concluidas,
                   (SELECT COUNT(*) FROM meta_atribuicoes a
                      JOIN equipe_membros em ON em.usuario_id = a.usuario_id
                     WHERE em.equipe_id = e.id) AS metas_total,
                   (SELECT COALESCE(ROUND(AVG(a.progresso)), 0) FROM meta_atribuicoes a
                      JOIN equipe_membros em ON em.usuario_id = a.usuario_id
                     WHERE em.equipe_id = e.id) AS progresso
            FROM equipes e WHERE 1 = 1$cond
            ORDER BY e.nome LIMIT $limite OFFSET $offset");
    $stmt->execute($params);
    $equipes = $stmt->fetchAll();

    // membros das equipes da página — uma consulta só (sem N+1)
    if ($equipes) {
        $ids = array_map('intval', array_column($equipes, 'id'));
        $marcadores = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT em.equipe_id, em.papel, u.id, u.nome, u.email, f.nome AS funcao
                FROM equipe_membros em
                JOIN usuarios u ON u.id = em.usuario_id AND u.ativo = 1
                LEFT JOIN funcoes f ON f.id = u.funcao_id
                WHERE em.equipe_id IN ($marcadores)
                ORDER BY (em.papel = 'lider') DESC, u.nome");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll() as $linha) {
            $membrosPorEquipe[(int) $linha['equipe_id']][] = $linha;
        }
    }

    /* ---------------- pessoas (paginado, com busca) ---------------- */
    $condP = '';
    $paramsP = [];
    if ($termo !== '') {
        $like = '%' . $termo . '%';
        $condP = ' AND (u.nome ILIKE ? OR u.email ILIKE ? OR f.nome ILIKE ?)';
        $paramsP = [$like, $like, $like];
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao_id
                           WHERE u.ativo = 1$condP");
    $stmt->execute($paramsP);
    $totalPessoas = (int) $stmt->fetchColumn();
    $paginacaoPessoas = paginacao($totalPessoas, 20, $pagina, array_filter([
        'aba' => 'pessoas', 'busca' => $termo !== '' ? $termo : null,
    ]));

    [$limiteP, $offsetP] = janela(20, $pagina);
    $stmt = $pdo->prepare("SELECT u.id, u.nome, u.email, u.tipo_acesso, u.setor, u.funcao_id, f.nome AS funcao,
                   (SELECT COUNT(*) FROM equipe_membros em WHERE em.usuario_id = u.id) AS total_equipes,
                   (SELECT COUNT(*) FROM meta_atribuicoes a WHERE a.usuario_id = u.id) AS total_metas
            FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao_id
            WHERE u.ativo = 1$condP
            ORDER BY u.nome LIMIT $limiteP OFFSET $offsetP");
    $stmt->execute($paramsP);
    $pessoas = $stmt->fetchAll();

    /* ---------------- funções ---------------- */
    $funcoes = $pdo->query('SELECT f.id, f.nome,
            (SELECT COUNT(*) FROM usuarios u WHERE u.funcao_id = f.id AND u.ativo = 1) AS total
            FROM funcoes f ORDER BY f.nome LIMIT 200')->fetchAll();

    // lista leve para os selects (limitada: não acumular informação)
    $todasPessoas = $pdo->query('SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome LIMIT 500')->fetchAll();
} catch (Throwable $e) {
    $erroBanco = erro_banco($e);
}

/* ======================================================== renderizar ==== */
$flash = '';
if ($mensagemErro !== '') $flash .= '<div class="alert alert-danger" role="alert">' . h($mensagemErro) . '</div>';
if ($erroBanco !== '')     $flash .= aviso_migracao() . '<div class="alert alert-danger">Detalhe: ' . h($erroBanco) . '</div>';

$abas = [
    'equipes' => ['Equipes', 'users', $totalEquipes],
    'pessoas' => ['Pessoas', 'user', $totalPessoas],
    'funcoes' => ['Funções', 'shield', count($funcoes)],
];
$chips = '<div class="chips" role="tablist" aria-label="Seções da equipe">';
foreach ($abas as $k => $info) {
    [$label, $icone, $qtd] = $info;
    $q = array_filter(['aba' => $k, 'busca' => $termo !== '' ? $termo : null]);
    $chips .= '<a class="chip' . ($aba === $k ? ' is-ativo' : '') . '" role="tab"'
            . ' aria-selected="' . ($aba === $k ? 'true' : 'false') . '"'
            . ' href="?' . h(http_build_query($q)) . '">'
            . icon($icone, 14) . ' ' . h($label) . ' <span class="chip-contagem">' . (int) $qtd . '</span></a>';
}
$chips .= '</div>';

$barra = '<div class="row-between" style="margin-bottom:16px">'
       . campo_busca($termo, 'Buscar equipe, pessoa, e-mail ou função…',
            array_filter(['aba' => $aba]), 'busca')
       . $chips . '</div>';

/* ---------------- cards de equipe ---------------- */
$cardsEquipe = '';
if (!$equipes) {
    $cardsEquipe = '<div class="empty">'
        . ($termo !== ''
            ? 'Nenhuma equipe encontrada para <strong>' . h($termo) . '</strong>. <a href="?aba=equipes">Limpar busca</a>.'
            : ($podeEquipe
                ? 'Nenhuma equipe ainda. Use <strong>Nova equipe</strong> para criar a primeira.'
                : 'Nenhuma equipe cadastrada.'))
        . '</div>';
} else {
    $cardsEquipe = '<div class="grid grid-2">';
    foreach ($equipes as $eq) {
        $membros = $membrosPorEquipe[(int) $eq['id']] ?? [];
        $prog = (float) $eq['progresso'];

        $cardsEquipe .= '<article class="card">'
          . '<div class="card-head"><div style="min-width:0">'
          . '<h3>' . h((string) $eq['nome']) . '</h3>'
          . '<p class="card-sub">' . count($membros) . ' membro(s) · '
          . (int) $eq['metas_concluidas'] . '/' . (int) $eq['metas_total'] . ' metas concluídas</p>'
          . ($eq['descricao'] ? '<p class="text-sm muted" style="margin-top:4px">' . h((string) $eq['descricao']) . '</p>' : '')
          . '</div>';
        if ($podeEquipe) {
            $cardsEquipe .= '<form method="post">'
              . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
              . '<input type="hidden" name="action" value="excluir_equipe">'
              . '<input type="hidden" name="equipe_id" value="' . (int) $eq['id'] . '">'
              . '<button class="btn btn-sm btn-ghost" type="submit" title="Excluir equipe"'
              . ' data-confirmar="Excluir a equipe ' . h((string) $eq['nome']) . '? As pessoas continuam cadastradas.">'
              . icon('trash', 14) . '</button></form>';
        }
        $cardsEquipe .= '</div>';

        $cardsEquipe .= '<div style="margin:10px 0 12px">'
          . '<div class="row-between" style="font-size:12px;color:var(--text-muted);margin-bottom:5px">'
          . '<span>Progresso médio</span><strong>' . number_format($prog, 0) . '%</strong></div>'
          . '<div class="progress' . ($prog >= 100 ? ' is-done' : '') . '">'
          . '<span style="width:' . max(0, min(100, $prog)) . '%"></span></div></div>';

        $cardsEquipe .= '<ul class="stack-sm" style="list-style:none;margin:0;padding:0">';
        foreach ($membros as $m) {
            $cardsEquipe .= '<li class="row" style="gap:9px">'
              . '<span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">'
              . h(inicial_do_nome((string) $m['nome'])) . '</span>'
              . '<span style="min-width:0;flex:1"><span style="font-size:13px;font-weight:600;display:block">'
              . h((string) $m['nome']) . '</span><span class="anexo-meta">'
              . h((string) ($m['funcao'] ?: 'Sem função definida')) . '</span></span>'
              . ($m['papel'] === 'lider' ? '<span class="badge badge-primary">Líder</span>' : '');
            if ($podeEquipe) {
                $cardsEquipe .= '<form method="post">'
                  . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
                  . '<input type="hidden" name="action" value="remover_membro">'
                  . '<input type="hidden" name="equipe_id" value="' . (int) $eq['id'] . '">'
                  . '<input type="hidden" name="usuario_id" value="' . (int) $m['id'] . '">'
                  . '<button class="btn btn-sm btn-ghost" type="submit" title="Remover da equipe"'
                  . ' data-confirmar="Remover ' . h((string) $m['nome']) . ' desta equipe?">'
                  . icon('x', 13) . '</button></form>';
            }
            $cardsEquipe .= '</li>';
        }
        if (!$membros) {
            $cardsEquipe .= '<li class="muted text-sm">Nenhum membro ainda.</li>';
        }
        $cardsEquipe .= '</ul>';

        if ($podeEquipe) {
            $opcoes = '<option value="">Escolher pessoa…</option>';
            $idsAtuais = array_map('intval', array_column($membros, 'id'));
            foreach ($todasPessoas as $p) {
                if (in_array((int) $p['id'], $idsAtuais, true)) continue;
                $opcoes .= '<option value="' . (int) $p['id'] . '">' . h((string) $p['nome']) . '</option>';
            }
            $cardsEquipe .= '<form method="post" class="row" style="margin-top:12px">'
              . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
              . '<input type="hidden" name="action" value="add_membro">'
              . '<input type="hidden" name="equipe_id" value="' . (int) $eq['id'] . '">'
              . '<select name="usuario_id" aria-label="Pessoa" style="flex:1;min-width:130px" required>' . $opcoes . '</select>'
              . '<select name="papel" aria-label="Papel" style="width:104px">'
              . '<option value="membro">Membro</option><option value="lider">Líder</option></select>'
              . '<button class="btn btn-sm btn-primary" type="submit">' . icon('plus', 14) . ' Incluir</button>'
              . '</form>';
        }
        $cardsEquipe .= '</article>';
    }
    $cardsEquipe .= '</div>' . render_paginacao($paginacaoEquipes);
}

/* ---------------- tabela de pessoas ---------------- */
$tabelaPessoas = '';
if (!$pessoas) {
    $tabelaPessoas = '<div class="empty">'
        . ($termo !== '' ? 'Nenhuma pessoa encontrada para <strong>' . h($termo) . '</strong>.'
                         : 'Nenhuma pessoa ativa.')
        . '</div>';
} else {
    $tabelaPessoas = '<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap">'
      . '<table class="tabela tabela-compacta"><thead><tr>'
      . '<th scope="col">Pessoa</th><th scope="col">Acesso</th><th scope="col">Setor</th>'
      . '<th scope="col">Equipes</th><th scope="col">Metas</th><th scope="col">Função</th>'
      . '</tr></thead><tbody>';
    foreach ($pessoas as $p) {
        $tabelaPessoas .= '<tr>'
          . '<td data-label="Pessoa"><div class="row" style="gap:9px">'
          . '<span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">'
          . h(inicial_do_nome((string) $p['nome'])) . '</span>'
          . '<span><span style="font-weight:600;display:block">' . h((string) $p['nome']) . '</span>'
          . '<span class="anexo-meta">' . h((string) $p['email']) . '</span></span></div></td>'
          . '<td data-label="Acesso">' . h(tipo_acesso_label((string) $p['tipo_acesso'])) . '</td>'
          . '<td data-label="Setor">' . h(sector_label((string) ($p['setor'] ?? ''))) . '</td>'
          . '<td data-label="Equipes">' . (int) $p['total_equipes'] . '</td>'
          . '<td data-label="Metas">' . (int) $p['total_metas'] . '</td>'
          . '<td data-label="Função">';
        if ($podeFuncao) {
            $op = '<option value="">Sem função</option>';
            foreach ($funcoes as $f) {
                $op .= '<option value="' . (int) $f['id'] . '"'
                     . ((int) $p['funcao_id'] === (int) $f['id'] ? ' selected' : '') . '>'
                     . h((string) $f['nome']) . '</option>';
            }
            $tabelaPessoas .= '<form method="post" class="row" style="gap:6px">'
              . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
              . '<input type="hidden" name="action" value="definir_funcao">'
              . '<input type="hidden" name="usuario_id" value="' . (int) $p['id'] . '">'
              . '<select name="funcao_id" aria-label="Função de ' . h((string) $p['nome']) . '" style="width:auto">'
              . $op . '</select>'
              . '<button class="btn btn-sm" type="submit">Salvar</button></form>';
        } else {
            $tabelaPessoas .= h((string) ($p['funcao'] ?: '—'));
        }
        $tabelaPessoas .= '</td></tr>';
    }
    $tabelaPessoas .= '</tbody></table></div></div>' . render_paginacao($paginacaoPessoas);
}

/* ---------------- catálogo de funções ---------------- */
$listaFuncoes = '';
if (!$funcoes) {
    $listaFuncoes = '<div class="empty">Nenhuma função cadastrada ainda.</div>';
} else {
    $listaFuncoes = '<div class="stack-sm">';
    foreach ($funcoes as $f) {
        $listaFuncoes .= '<div class="row-between" style="border:1px solid var(--border);border-radius:10px;padding:9px 12px">'
          . '<span class="row" style="gap:8px">' . icon('shield', 15)
          . '<strong style="font-size:13px">' . h((string) $f['nome']) . '</strong></span>'
          . '<span class="badge">' . (int) $f['total'] . ' pessoa(s)</span></div>';
    }
    $listaFuncoes .= '</div>';
}

/* ---------------- modais ---------------- */
$modais = '';
if ($renderizarPagina && $podeEquipe) {
    $opcoesMembros = '';
    foreach ($todasPessoas as $p) {
        $opcoesMembros .= '<option value="' . (int) $p['id'] . '">' . h((string) $p['nome']) . '</option>';
    }
    $modais .= '<dialog class="modal" id="modal-nova-equipe" aria-labelledby="titulo-nova-equipe">'
      . '<form method="post" class="modal-inner">'
      . '<div class="modal-head"><div><h2 id="titulo-nova-equipe">Nova equipe</h2>'
      . '<p class="card-sub">Crie a equipe e já inclua as pessoas.</p></div>'
      . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
      . '<div class="modal-body stack">'
      . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
      . '<input type="hidden" name="action" value="criar_equipe">'
      . '<div class="field"><label for="equipe-nome">Nome</label>'
      . '<input type="text" id="equipe-nome" name="nome" maxlength="120" required'
      . ' placeholder="Ex.: Equipe Obras — Bloco A"></div>'
      . '<div class="field"><label for="equipe-descricao">Descrição (opcional)</label>'
      . '<textarea id="equipe-descricao" name="descricao" maxlength="255"'
      . ' placeholder="Responsabilidade da equipe"></textarea></div>'
      . '<div class="field"><label for="equipe-membros">Membros (Ctrl para vários)</label>'
      . '<select id="equipe-membros" name="membros[]" multiple size="6">' . $opcoesMembros . '</select>'
      . '<span class="hint">Depois você pode incluir ou remover pessoas a qualquer momento.</span></div>'
      . '</div>'
      . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button>'
      . '<button class="btn btn-primary" type="submit">Criar equipe</button></div>'
      . '</form></dialog>';
}
if ($renderizarPagina && $podeFuncao) {
    $modais .= '<dialog class="modal" id="modal-nova-funcao" aria-labelledby="titulo-nova-funcao">'
      . '<form method="post" class="modal-inner">'
      . '<div class="modal-head"><div><h2 id="titulo-nova-funcao">Nova função</h2>'
      . '<p class="card-sub">Entra no catálogo usado no cadastro e nos relatórios.</p></div>'
      . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
      . '<div class="modal-body">'
      . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
      . '<input type="hidden" name="action" value="criar_funcao">'
      . '<div class="field"><label for="funcao-nome">Nome da função</label>'
      . '<input type="text" id="funcao-nome" name="nome" maxlength="80" required'
      . ' placeholder="Ex.: Mestre de obras"></div></div>'
      . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button>'
      . '<button class="btn btn-primary" type="submit">Criar função</button></div>'
      . '</form></dialog>';
}

$botaoNovo = '';
if ($aba === 'funcoes' && $podeFuncao) {
    $botaoNovo = '<button class="btn btn-primary" type="button" data-modal-abrir="modal-nova-funcao">'
               . icon('plus', 16) . ' Nova função</button>';
} elseif ($aba !== 'funcoes' && $podeEquipe) {
    $botaoNovo = '<button class="btn btn-primary" type="button" data-modal-abrir="modal-nova-equipe">'
               . icon('plus', 16) . ' Nova equipe</button>';
}

$subAbas = [
    'equipes' => 'Crie equipes e inclua pessoas. Cada pessoa recebe as metas da equipe.',
    'pessoas' => 'Defina a função de cada pessoa no catálogo.',
    'funcoes' => 'Catálogo de funções usado no cadastro e nos relatórios.',
];

$conteudo = $flash
  . '<div class="row-between" style="margin-bottom:14px">'
  . '<div><h2 style="margin-bottom:2px">' . h($abas[$aba][0]) . '</h2>'
  . '<p class="text-sm muted">' . h($subAbas[$aba]) . '</p></div>' . $botaoNovo . '</div>'
  . $barra
  . ($aba === 'equipes' ? $cardsEquipe : '')
  . ($aba === 'pessoas' ? $tabelaPessoas : '')
  . ($aba === 'funcoes' ? $listaFuncoes : '')
  . $modais;

page($user, 'equipe', 'Equipe', 'Equipes, funções e pessoas', $conteudo, [
    'funcao'       => funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']),
    'notificacoes' => contar_notificacoes($uid),
]);
