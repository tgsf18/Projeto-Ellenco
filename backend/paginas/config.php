<?php
/**
 * Configurações — painel com MENU EM LISTA e seções trocadas no cliente.
 *
 * Seções (data-secao / data-secao-painel):
 *   perfil | senha | usuarios | aparencia | sobre
 *
 * Regras:
 *  - O próprio usuário muda nome e senha.
 *  - E-mail, setor, tipo de acesso, função e ativo só administrador(a) muda.
 *  - Ninguém remove o próprio acesso de administrador, nem desativa a si mesmo.
 *  - Toda lista é paginada e buscada no SQL (LIMIT/OFFSET + COUNT).
 */
require_once __DIR__ . '/../layout.php';

$user  = require_login();
$admin = is_admin($user);
$podeGerenciar = can($user, 'USUARIO_GERENCIAR');
$pdo   = db();
$uid   = (int) $user['id'];
$erro  = '';
$renderizarPagina = !defined('ELLENCO_PREVIEW');

$SETORES = ['engenharia' => 'Engenharia', 'administrativo' => 'Administrativo', 'obras' => 'Obras'];
$TIPOS   = ['admin' => 'Administrador(a)', 'gestor' => 'Gestor(a)', 'usuario' => 'Funcionário(a)'];

/* ---------------------------------------------------------------- ações -- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $erro = 'Sua sessão expirou. Recarregue a página e tente novamente.';
    } else {
        $acao = (string) ($_POST['action'] ?? '');

        /* -------------------------------------------------------- perfil -- */
        if ($acao === 'salvar_perfil') {
            $nome = trim((string) ($_POST['nome'] ?? ''));
            if ($nome === '' || mb_strlen($nome) > 120) {
                $erro = 'Informe um nome válido (até 120 caracteres).';
            } else {
                try {
                    $pdo->prepare('UPDATE usuarios SET nome = ? WHERE id = ?')->execute([$nome, $uid]);
                    $_SESSION['user']['nome'] = $nome;
                    redirecionar('config.html#perfil', 'Perfil atualizado.');
                } catch (Throwable $e) {
                    $erro = 'Não foi possível salvar o perfil.';
                }
            }
        }

        /* --------------------------------------------------------- senha -- */
        if ($acao === 'trocar_senha') {
            $atual = (string) ($_POST['senha_atual'] ?? '');
            $nova  = (string) ($_POST['senha_nova'] ?? '');
            $conf  = (string) ($_POST['senha_conf'] ?? '');

            if (strlen($nova) < 8) {
                $erro = 'A nova senha precisa ter ao menos 8 caracteres.';
            } elseif ($nova !== $conf) {
                $erro = 'A confirmação não confere com a nova senha.';
            } else {
                try {
                    $stmt = $pdo->prepare('SELECT senha_hash FROM usuarios WHERE id = ?');
                    $stmt->execute([$uid]);
                    $hash = (string) $stmt->fetchColumn();

                    if (!password_verify($atual, $hash)) {
                        $erro = 'A senha atual está incorreta.';
                    } else {
                        $pdo->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
                            ->execute([password_hash($nova, PASSWORD_DEFAULT), $uid]);
                        session_regenerate_id(true);
                        redirecionar('config.html#senha', 'Senha alterada.');
                    }
                } catch (Throwable $e) {
                    $erro = 'Não foi possível alterar a senha.';
                }
            }
        }

        /* ------------------------------------ admin: dados de um usuário -- */
        if ($acao === 'salvar_usuario') {
            require_permission($user, 'USUARIO_GERENCIAR');
            $alvo   = (int) ($_POST['usuario_id'] ?? 0);
            $nome   = trim((string) ($_POST['nome'] ?? ''));
            $email  = trim((string) ($_POST['email'] ?? ''));
            $tipo   = (string) ($_POST['tipo_acesso'] ?? 'usuario');
            $setor  = (string) ($_POST['setor'] ?? '');
            $funcao = (int) ($_POST['funcao_id'] ?? 0);
            $ativo  = isset($_POST['ativo']) ? 1 : 0;

            if ($alvo < 1 || $nome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $erro = 'Informe nome e e-mail válidos.';
            } elseif (!isset($TIPOS[$tipo])) {
                $erro = 'Tipo de acesso inválido.';
            } elseif ($setor !== '' && !isset($SETORES[$setor])) {
                $erro = 'Setor inválido.';
            } elseif ($alvo === $uid && $tipo !== 'admin') {
                $erro = 'Você não pode remover o seu próprio acesso de administrador.';
            } elseif ($alvo === $uid && !$ativo) {
                $erro = 'Você não pode desativar a sua própria conta.';
            } else {
                try {
                    $pdo->prepare('UPDATE usuarios SET nome = ?, email = ?, tipo_acesso = ?, setor = ?, funcao_id = ?, ativo = ?
                                   WHERE id = ?')
                        ->execute([
                            mb_substr($nome, 0, 120), mb_strtolower($email), $tipo,
                            $setor !== '' ? $setor : null, $funcao > 0 ? $funcao : null, $ativo, $alvo,
                        ]);
                    redirecionar('config.html#usuarios', 'Usuário atualizado.');
                } catch (Throwable $e) {
                    $codigo = $e instanceof PDOException ? (string) $e->getCode() : '';
                    $erro = $codigo === '23505'
                        ? 'Já existe outra conta com esse e-mail.'
                        : 'Não foi possível atualizar o usuário.';
                }
            }
        }

        /* -------------------------------------- admin: criar usuário ----- */
        if ($acao === 'criar_usuario') {
            require_permission($user, 'USUARIO_GERENCIAR');
            $nome  = trim((string) ($_POST['nome'] ?? ''));
            $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
            $senha = (string) ($_POST['senha'] ?? '');
            $tipo  = (string) ($_POST['tipo_acesso'] ?? 'usuario');
            $setor = (string) ($_POST['setor'] ?? '');
            $funcao = (int) ($_POST['funcao_id'] ?? 0);

            if ($nome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $erro = 'Informe nome e e-mail válidos.';
            } elseif (strlen($senha) < 8) {
                $erro = 'A senha inicial precisa ter ao menos 8 caracteres.';
            } elseif (!isset($TIPOS[$tipo])) {
                $erro = 'Tipo de acesso inválido.';
            } else {
                try {
                    $pdo->prepare('INSERT INTO usuarios (nome, email, senha_hash, tipo_acesso, setor, funcao_id, ativo)
                                   VALUES (?, ?, ?, ?, ?, ?, 1)')
                        ->execute([
                            mb_substr($nome, 0, 120), $email, password_hash($senha, PASSWORD_DEFAULT), $tipo,
                            $setor !== '' ? $setor : null, $funcao > 0 ? $funcao : null,
                        ]);
                    redirecionar('config.html#usuarios', 'Usuário criado. Ele já pode entrar com a senha definida.');
                } catch (Throwable $e) {
                    $codigo = $e instanceof PDOException ? (string) $e->getCode() : '';
                    $erro = $codigo === '23505'
                        ? 'Já existe uma conta com esse e-mail.'
                        : 'Não foi possível criar o usuário.';
                }
            }
        }

        /* --------------------------- admin: redefinir a senha de alguém -- */
        if ($acao === 'redefinir_senha') {
            require_permission($user, 'USUARIO_GERENCIAR');
            $alvo  = (int) ($_POST['usuario_id'] ?? 0);
            $senha = (string) ($_POST['senha'] ?? '');
            if ($alvo < 1) {
                $erro = 'Usuário inválido.';
            } elseif (strlen($senha) < 8) {
                $erro = 'A senha nova precisa ter ao menos 8 caracteres.';
            } else {
                try {
                    $pdo->prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?')
                        ->execute([password_hash($senha, PASSWORD_DEFAULT), $alvo]);
                    notificar($alvo, 'aviso_pessoal', 'Sua senha foi redefinida',
                        'Um administrador definiu uma nova senha para a sua conta.',
                        'config.html#senha', 'senha:' . $alvo . ':' . date('YmdHi'));
                    redirecionar('config.html#usuarios', 'Senha redefinida.');
                } catch (Throwable $e) {
                    $erro = 'Não foi possível redefinir a senha.';
                }
            }
        }

        /* ------------------------------------ admin: excluir usuário ----- */
        if ($acao === 'excluir_usuario') {
            require_permission($user, 'USUARIO_GERENCIAR');
            $alvo = (int) ($_POST['usuario_id'] ?? 0);
            if ($alvo === $uid) {
                $erro = 'Você não pode excluir a sua própria conta.';
            } elseif ($alvo > 0) {
                try {
                    // prefere desativar: preserva histórico de metas e eventos
                    $pdo->prepare('UPDATE usuarios SET ativo = 0 WHERE id = ?')->execute([$alvo]);
                    redirecionar('config.html#usuarios', 'Usuário desativado. O histórico dele continua preservado.');
                } catch (Throwable $e) {
                    $erro = 'Não foi possível desativar o usuário.';
                }
            }
        }
    }
}

/* --------------------------------------------------------- carregar dados -- */
$funcoes = [];
$usuarios = [];
$totalUsuarios = 0;
$filtroUsuarios = (string) ($_GET['filtro'] ?? 'todos');   // todos | ativos | inativos | admin
if (!in_array($filtroUsuarios, ['todos', 'ativos', 'inativos', 'admin'], true)) $filtroUsuarios = 'todos';
$termoUsuarios = termo_busca($_GET['busca_usuarios'] ?? '');
$paginaUsuarios = pagina_atual();
$porPaginaUsuarios = 12;
$paginacaoUsuarios = paginacao(1, $porPaginaUsuarios, 1);
$erroBanco = '';

try {
    $funcoes = $pdo->query('SELECT id, nome FROM funcoes ORDER BY nome LIMIT 200')->fetchAll();

    if ($podeGerenciar) {
        $cond = '';
        $params = [];
        if ($filtroUsuarios === 'ativos')   { $cond .= ' AND u.ativo = 1'; }
        if ($filtroUsuarios === 'inativos') { $cond .= ' AND u.ativo = 0'; }
        if ($filtroUsuarios === 'admin')    { $cond .= " AND u.tipo_acesso = 'admin'"; }
        if ($termoUsuarios !== '') {
            $like = '%' . $termoUsuarios . '%';
            $cond .= ' AND (u.nome ILIKE ? OR u.email ILIKE ?)';
            $params = [$like, $like];
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios u WHERE 1 = 1$cond");
        $stmt->execute($params);
        $totalUsuarios = (int) $stmt->fetchColumn();
        $paginacaoUsuarios = paginacao($totalUsuarios, $porPaginaUsuarios, $paginaUsuarios, array_filter([
            'filtro' => $filtroUsuarios !== 'todos' ? $filtroUsuarios : null,
            'busca_usuarios' => $termoUsuarios !== '' ? $termoUsuarios : null,
        ]));

        [$lim, $off] = janela($porPaginaUsuarios, $paginaUsuarios);
        $stmt = $pdo->prepare("SELECT u.id, u.nome, u.email, u.tipo_acesso, u.setor, u.ativo, u.funcao_id,
                       u.criado_em, f.nome AS funcao,
                       (SELECT COUNT(*) FROM meta_atribuicoes a WHERE a.usuario_id = u.id) AS total_metas,
                       (SELECT COUNT(*) FROM equipe_membros em WHERE em.usuario_id = u.id) AS total_equipes
                FROM usuarios u LEFT JOIN funcoes f ON f.id = u.funcao_id
                WHERE 1 = 1$cond
                ORDER BY u.ativo DESC, u.nome LIMIT $lim OFFSET $off");
        $stmt->execute($params);
        $usuarios = $stmt->fetchAll();
    }
} catch (Throwable $e) {
    $erroBanco = $e instanceof PDOException && $e->getCode() === '42P01'
        ? 'a migração database-V1.sql ainda não foi aplicada.'
        : 'erro ao carregar os dados.';
}

/* ------------------------------------------------------------ renderizar -- */
$flash = $erro !== '' ? '<div class="alert alert-danger" role="alert">' . h($erro) . '</div>' : '';
if ($erroBanco !== '') $flash .= aviso_migracao() . '<div class="alert alert-danger">Detalhe: ' . h($erroBanco) . '</div>';

$funcao = funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']);
$iniciais = inicial_do_nome((string) $user['nome']);

/* ---------------------------------------------------------- menu lista --- */
$secoes = [
    'perfil'    => ['Perfil', 'user', 'Seu nome e como você aparece.'],
    'senha'     => ['Redefinir senha', 'lock', 'Trocar a senha de acesso.'],
    'aparencia' => ['Aparência', 'palette', 'Tema claro ou escuro.'],
    'sobre'     => ['Sobre', 'info', 'Versão e saúde do sistema.'],
];
if ($podeGerenciar) {
    // gestão de usuários logo abaixo do perfil — é a seção mais usada pelo admin
    $secoes = array_slice($secoes, 0, 1, true)
            + ['usuarios' => ['Usuários e acessos', 'shield', 'Criar, editar e redefinir senhas.']]
            + array_slice($secoes, 1, null, true);
}

$menu = '<nav class="lista-menu" aria-label="Seções das configurações">'
      . '<div class="lista-menu-sep">Conta</div>';
foreach ($secoes as $chave => $info) {
    [$label, $icone, $desc] = $info;
    if ($chave === 'usuarios') $menu .= '<div class="lista-menu-sep">Administração</div>';
    $menu .= '<button type="button" class="lista-menu-item" data-secao="' . $chave . '"'
           . ' title="' . h($desc) . '">'
           . '<span class="lista-menu-icone">' . icon($icone, 16) . '</span>'
           . '<span style="min-width:0"><span style="display:block">' . h($label) . '</span>'
           . '<span class="anexo-meta">' . h($desc) . '</span></span></button>';
}
$menu .= '</nav>';

/* ------------------------------------------------------------- seções ---- */
$painelPerfil = '<section class="painel-secao card" data-secao-painel="perfil" aria-labelledby="titulo-perfil">'
  . '<div class="card-head"><div><h2 id="titulo-perfil">Perfil</h2>'
  . '<p class="card-sub">Como você aparece no sistema.</p></div></div>'
  . '<div class="row" style="gap:14px;margin-bottom:16px">'
  . '<span class="avatar" style="width:52px;height:52px;font-size:18px" aria-hidden="true">' . h($iniciais) . '</span>'
  . '<div style="min-width:0"><div style="font-weight:700;font-size:15px">' . h((string) $user['nome']) . '</div>'
  . '<div class="text-sm muted">' . h((string) $user['email']) . '</div></div></div>'
  . '<form method="post" class="stack">'
  . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
  . '<input type="hidden" name="action" value="salvar_perfil">'
  . '<div class="field"><label for="perfil-nome">Nome</label>'
  . '<input type="text" id="perfil-nome" name="nome" maxlength="120" required value="' . h((string) $user['nome']) . '"></div>'
  . '<div class="grid grid-2">'
  . '<div class="field"><label for="perfil-funcao">Função</label>'
  . '<input type="text" id="perfil-funcao" value="' . h($funcao) . '" disabled></div>'
  . '<div class="field"><label for="perfil-setor">Setor</label>'
  . '<input type="text" id="perfil-setor" value="' . h(sector_label((string) ($user['setor'] ?? ''))) . '" disabled></div>'
  . '</div>'
  . '<p class="hint">E-mail, setor e nível de acesso só podem ser alterados por um administrador.</p>'
  . '<div><button class="btn btn-primary" type="submit">Salvar perfil</button></div>'
  . '</form></section>';

$painelSenha = '<section class="painel-secao card" data-secao-painel="senha" aria-labelledby="titulo-senha">'
  . '<div class="card-head"><div><h2 id="titulo-senha">Redefinir senha</h2>'
  . '<p class="card-sub">Mínimo de 8 caracteres. Você continua conectado após a troca.</p></div></div>'
  . '<form method="post" class="stack">'
  . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
  . '<input type="hidden" name="action" value="trocar_senha">'
  . '<div class="field"><label for="senha-atual">Senha atual</label>'
  . '<input type="password" id="senha-atual" name="senha_atual" autocomplete="current-password" required></div>'
  . '<div class="grid grid-2">'
  . '<div class="field"><label for="senha-nova">Nova senha</label>'
  . '<input type="password" id="senha-nova" name="senha_nova" minlength="8" autocomplete="new-password" required></div>'
  . '<div class="field"><label for="senha-conf">Repita a nova senha</label>'
  . '<input type="password" id="senha-conf" name="senha_conf" minlength="8" autocomplete="new-password" required></div>'
  . '</div>'
  . '<div><button class="btn btn-primary" type="submit">Alterar senha</button></div>'
  . '</form></section>';

$painelAparencia = '<section class="painel-secao card" data-secao-painel="aparencia" aria-labelledby="titulo-aparencia">'
  . '<div class="card-head"><div><h2 id="titulo-aparencia">Aparência</h2>'
  . '<p class="card-sub">A preferência fica salva neste navegador.</p></div></div>'
  . '<div class="row" style="gap:8px">'
  . '<button class="btn" type="button" data-tema="light">' . icon('sun', 15) . ' Claro</button>'
  . '<button class="btn" type="button" data-tema="dark">' . icon('moon', 15) . ' Escuro</button>'
  . '</div></section>';

$painelSobre = '<section class="painel-secao card" data-secao-painel="sobre" aria-labelledby="titulo-sobre">'
  . '<div class="card-head"><div><h2 id="titulo-sobre">Sobre</h2>'
  . '<p class="card-sub">Ellenco Construções — sistema de metas e equipes.</p></div></div>'
  . '<dl class="info-lista">'
  . '<dt>Versão</dt><dd>1.0 — metas por pessoa, equipes e anexos</dd>'
  . '<dt>Banco</dt><dd>PostgreSQL / Supabase</dd>'
  . '<dt>Servidor</dt><dd>PHP ' . h(PHP_VERSION) . '</dd>'
  . '<dt>Saúde</dt><dd><a href="' . h(app_path('backend/health.php')) . '">Verificar agora</a></dd>'
  . '</dl></section>';

/* ------------------------------------------- gestão de usuários (admin) -- */
$painelUsuarios = '';
if ($podeGerenciar) {
    $opcoesFuncao = '<option value="">Sem função</option>';
    foreach ($funcoes as $f) {
        $opcoesFuncao .= '<option value="' . (int) $f['id'] . '">' . h((string) $f['nome']) . '</option>';
    }

    $filtros = ['todos' => 'Todos', 'ativos' => 'Ativos', 'inativos' => 'Inativos', 'admin' => 'Administradores'];
    $chips = '<div class="chips">';
    foreach ($filtros as $k => $v) {
        $chips .= '<a class="chip' . ($filtroUsuarios === $k ? ' is-ativo' : '') . '" href="?'
                . h(http_build_query(array_filter([
                    'filtro' => $k !== 'todos' ? $k : null,
                    'busca_usuarios' => $termoUsuarios !== '' ? $termoUsuarios : null,
                ]))) . '#usuarios">' . h($v) . '</a>';
    }
    $chips .= '</div>';

    $linhas = '';
    foreach ($usuarios as $u) {
        $opTipo = '';
        foreach ($TIPOS as $k => $v) {
            $opTipo .= '<option value="' . $k . '"' . ((string) $u['tipo_acesso'] === $k ? ' selected' : '') . '>' . h($v) . '</option>';
        }
        $opSetor = '<option value="">—</option>';
        foreach ($SETORES as $k => $v) {
            $opSetor .= '<option value="' . $k . '"' . ((string) $u['setor'] === $k ? ' selected' : '') . '>' . h($v) . '</option>';
        }
        $opFuncao = '<option value="">Sem função</option>';
        foreach ($funcoes as $f) {
            $opFuncao .= '<option value="' . (int) $f['id'] . '"'
                       . ((int) $u['funcao_id'] === (int) $f['id'] ? ' selected' : '') . '>'
                       . h((string) $f['nome']) . '</option>';
        }

        $linhas .= '<tr>'
          . '<td data-label="Pessoa"><div class="row" style="gap:9px">'
          . '<span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">'
          . h(inicial_do_nome((string) $u['nome'])) . '</span>'
          . '<span style="min-width:0"><span style="font-weight:600;display:block">' . h((string) $u['nome']) . '</span>'
          . '<span class="anexo-meta">' . h((string) $u['email']) . '</span></span></div></td>'
          . '<td data-label="Acesso"><span class="badge' . ($u['tipo_acesso'] === 'admin' ? ' badge-primary' : '') . '">'
          . h(tipo_acesso_label((string) $u['tipo_acesso'])) . '</span></td>'
          . '<td data-label="Setor">' . h(sector_label((string) ($u['setor'] ?? ''))) . '</td>'
          . '<td data-label="Situação">'
          . ($u['ativo'] ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge">Inativo</span>')
          . '</td>'
          . '<td data-label="Metas">' . (int) $u['total_metas'] . ' · ' . (int) $u['total_equipes'] . ' equipe(s)</td>'
          . '<td data-label="Ações" class="celula-acoes">'
          . '<button class="btn btn-sm" type="button" data-modal-abrir="modal-usuario-' . (int) $u['id'] . '">'
          . icon('edit', 13) . ' Editar</button> '
          . '<button class="btn btn-sm" type="button" data-modal-abrir="modal-senha-' . (int) $u['id'] . '">'
          . icon('lock', 13) . '</button>'
          . '</td></tr>';
    }
    if ($linhas === '') {
        $linhas = '<tr><td colspan="6" class="empty">'
                . ($termoUsuarios !== '' ? 'Nenhum usuário encontrado para <strong>' . h($termoUsuarios) . '</strong>.'
                                          : 'Nenhum usuário neste filtro.') . '</td></tr>';
    }

    $painelUsuarios = '<section class="painel-secao card" data-secao-painel="usuarios" aria-labelledby="titulo-usuarios">'
      . '<div class="card-head"><div><h2 id="titulo-usuarios">Usuários e acessos</h2>'
      . '<p class="card-sub">' . (int) $totalUsuarios . ' conta(s). Só administradoras veem esta seção.</p></div>'
      . '<button class="btn btn-primary btn-sm" type="button" data-modal-abrir="modal-novo-usuario">'
      . icon('user-plus', 14) . ' Novo usuário</button></div>'
      . '<div class="row-between barra-filtros" style="margin-bottom:12px">'
      . campo_busca($termoUsuarios, 'Buscar por nome ou e-mail…', ['filtro' => $filtroUsuarios], 'busca_usuarios')
      . $chips . '</div>'
      . '<div class="table-wrap"><table class="tabela tabela-compacta"><thead><tr>'
      . '<th scope="col">Pessoa</th><th scope="col">Acesso</th><th scope="col">Setor</th>'
      . '<th scope="col">Situação</th><th scope="col">Metas</th><th scope="col">Ações</th>'
      . '</tr></thead><tbody>' . $linhas . '</tbody></table></div>'
      . render_paginacao($paginacaoUsuarios)
      . '</section>';
}

/* ------------------------------------------------------------- modais ---- */
$modais = '';
if ($renderizarPagina && $podeGerenciar) {
    $opcoesFuncaoModal = '<option value="">Sem função</option>';
    foreach ($funcoes as $f) {
        $opcoesFuncaoModal .= '<option value="' . (int) $f['id'] . '">' . h((string) $f['nome']) . '</option>';
    }
    $opcoesSetorModal = '<option value="">—</option>';
    foreach ($SETORES as $k => $v) {
        $opcoesSetorModal .= '<option value="' . $k . '">' . h($v) . '</option>';
    }

    /* criar usuário */
    $modais .= '<dialog class="modal" id="modal-novo-usuario" aria-labelledby="titulo-novo-usuario">'
      . '<form method="post" class="modal-inner">'
      . '<div class="modal-head"><div><h2 id="titulo-novo-usuario">Novo usuário</h2>'
      . '<p class="card-sub">A pessoa já entra com a senha definida aqui.</p></div>'
      . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
      . '<div class="modal-body stack">'
      . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
      . '<input type="hidden" name="action" value="criar_usuario">'
      . '<div class="field"><label for="novo-nome">Nome</label>'
      . '<input type="text" id="novo-nome" name="nome" maxlength="120" required></div>'
      . '<div class="field"><label for="novo-email">E-mail</label>'
      . '<input type="email" id="novo-email" name="email" required autocomplete="off"></div>'
      . '<div class="field"><label for="novo-senha">Senha inicial</label>'
      . '<input type="password" id="novo-senha" name="senha" minlength="8" required autocomplete="new-password">'
      . '<span class="hint">Mínimo de 8 caracteres. Peça para a pessoa trocar no primeiro acesso.</span></div>'
      . '<div class="grid grid-2">'
      . '<div class="field"><label for="novo-acesso">Acesso</label>'
      . '<select id="novo-acesso" name="tipo_acesso">'
      . '<option value="usuario">Funcionário(a)</option><option value="gestor">Gestor(a)</option>'
      . '<option value="admin">Administrador(a)</option></select></div>'
      . '<div class="field"><label for="novo-setor">Setor</label>'
      . '<select id="novo-setor" name="setor">' . $opcoesSetorModal . '</select></div></div>'
      . '<div class="field"><label for="novo-funcao">Função</label>'
      . '<select id="novo-funcao" name="funcao_id">' . $opcoesFuncaoModal . '</select></div>'
      . '</div><div class="modal-foot">'
      . '<button class="btn" type="button" data-modal-close>Cancelar</button>'
      . '<button class="btn btn-primary" type="submit">Criar usuário</button></div>'
      . '</form></dialog>';

    /* editar / redefinir senha, um modal por usuário da página */
    foreach ($usuarios as $u) {
        $idU = (int) $u['id'];
        $opTipo = '';
        foreach ($TIPOS as $k => $v) {
            $opTipo .= '<option value="' . $k . '"' . ((string) $u['tipo_acesso'] === $k ? ' selected' : '') . '>' . h($v) . '</option>';
        }
        $opSetor = '<option value="">—</option>';
        foreach ($SETORES as $k => $v) {
            $opSetor .= '<option value="' . $k . '"' . ((string) $u['setor'] === $k ? ' selected' : '') . '>' . h($v) . '</option>';
        }
        $opFuncao = '<option value="">Sem função</option>';
        foreach ($funcoes as $f) {
            $opFuncao .= '<option value="' . (int) $f['id'] . '"'
                       . ((int) $u['funcao_id'] === (int) $f['id'] ? ' selected' : '') . '>'
                       . h((string) $f['nome']) . '</option>';
        }

        $modais .= '<dialog class="modal" id="modal-usuario-' . $idU . '" aria-labelledby="titulo-usuario-' . $idU . '">'
          . '<form method="post" class="modal-inner">'
          . '<div class="modal-head"><div><h2 id="titulo-usuario-' . $idU . '">Editar usuário</h2>'
          . '<p class="card-sub">' . h((string) $u['email']) . '</p></div>'
          . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
          . '<div class="modal-body stack">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="salvar_usuario">'
          . '<input type="hidden" name="usuario_id" value="' . $idU . '">'
          . '<div class="field"><label for="u-nome-' . $idU . '">Nome</label>'
          . '<input type="text" id="u-nome-' . $idU . '" name="nome" maxlength="120" required value="' . h((string) $u['nome']) . '"></div>'
          . '<div class="field"><label for="u-email-' . $idU . '">E-mail</label>'
          . '<input type="email" id="u-email-' . $idU . '" name="email" required value="' . h((string) $u['email']) . '"></div>'
          . '<div class="grid grid-2">'
          . '<div class="field"><label for="u-acesso-' . $idU . '">Acesso</label>'
          . '<select id="u-acesso-' . $idU . '" name="tipo_acesso">' . $opTipo . '</select></div>'
          . '<div class="field"><label for="u-setor-' . $idU . '">Setor</label>'
          . '<select id="u-setor-' . $idU . '" name="setor">' . $opSetor . '</select></div></div>'
          . '<div class="field"><label for="u-funcao-' . $idU . '">Função</label>'
          . '<select id="u-funcao-' . $idU . '" name="funcao_id">' . $opFuncao . '</select></div>'
          . '<label class="row" style="gap:8px;font-size:13px">'
          . '<input type="checkbox" name="ativo" value="1"' . ($u['ativo'] ? ' checked' : '') . ' style="width:auto;min-height:0">'
          . ' Conta ativa (desmarcar impede o login)</label>'
          . '</div><div class="modal-foot">'
          . '<button class="btn" type="button" data-modal-close>Cancelar</button>'
          . '<button class="btn btn-primary" type="submit">Salvar</button></div>'
          . '</form></dialog>';

        $modais .= '<dialog class="modal" id="modal-senha-' . $idU . '" aria-labelledby="titulo-senha-' . $idU . '">'
          . '<form method="post" class="modal-inner">'
          . '<div class="modal-head"><div><h2 id="titulo-senha-' . $idU . '">Redefinir senha</h2>'
          . '<p class="card-sub">Nova senha de ' . h((string) $u['nome']) . '</p></div>'
          . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
          . '<div class="modal-body stack">'
          . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">'
          . '<input type="hidden" name="action" value="redefinir_senha">'
          . '<input type="hidden" name="usuario_id" value="' . $idU . '">'
          . '<div class="field"><label for="senha-u-' . $idU . '">Nova senha</label>'
          . '<input type="password" id="senha-u-' . $idU . '" name="senha" minlength="8" required autocomplete="new-password">'
          . '<span class="hint">A pessoa será avisada pelo sino de notificações.</span></div>'
          . '</div><div class="modal-foot">'
          . '<button class="btn" type="button" data-modal-close>Cancelar</button>'
          . '<button class="btn btn-primary" type="submit">Redefinir</button></div>'
          . '</form></dialog>';
    }
}

$conteudo = $flash
  . '<div class="duas-colunas">'
  . $menu
  . '<div>' . $painelPerfil . $painelSenha . $painelUsuarios . $painelAparencia . $painelSobre . '</div>'
  . '</div>'
  . $modais;

page($user, 'config', 'Configurações', 'Perfil, senha, usuários e aparência', $conteudo, [
    'funcao'       => $funcao,
    'notificacoes' => contar_notificacoes($uid),
]);
