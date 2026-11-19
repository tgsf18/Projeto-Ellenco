<?php
/**
 * Login — agora emite o token CSRF na própria página e não repete o erro de
 * conexão com detalhes técnicos (que ajudavam a mapear o servidor).
 *
 * As mensagens entram no marcador <!--mensagens--> do login.html.
 */
require_once __DIR__ . '/db.php';

start_session();
$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $erro = 'Sua sessão expirou. Atualize a página e tente novamente.';
    } else {
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $senha = (string) ($_POST['password'] ?? '');

        if ($email === '' || $senha === '') {
            $erro = 'Informe e-mail e senha.';
        } else {
            try {
                $stmt = db()->prepare(
                    'SELECT id, nome, email, senha_hash, tipo_acesso, setor, funcao_id
                     FROM usuarios WHERE email = ? AND ativo = 1'
                );
                $stmt->execute([$email]);
                $u = $stmt->fetch();

                if (!$u || !password_verify($senha, (string) $u['senha_hash'])) {
                    // mensagem única para não revelar se o e-mail existe
                    $erro = 'E-mail ou senha inválidos.';
                } else {
                    session_regenerate_id(true);
                    unset($u['senha_hash']);
                    $_SESSION['user'] = $u;
                    header('Location: ' . app_path('painel.html'), true, 303);
                    exit;
                }
            } catch (Throwable $e) {
                $erro = 'Não foi possível conectar ao banco de dados. '
                      . 'Confira as variáveis de conexão no Render.';
            }
        }
    }
}

$html = (string) file_get_contents(__DIR__ . '/../login.html');

$mensagens = '';
if ($erro !== '') {
    $mensagens .= '<div class="alert alert-error" role="alert">' . h($erro) . '</div>';
}
if (($_GET['cadastro'] ?? '') === 'sucesso') {
    $mensagens .= '<div class="alert alert-ok" role="status">'
                . 'Cadastro salvo. Entre com seu e-mail e senha.</div>';
}
if (($_GET['saiu'] ?? '') === '1') {
    $mensagens .= '<div class="alert alert-ok" role="status">Sessão encerrada.</div>';
}

// token CSRF dentro do formulário
$html = str_replace(
    '<form action="login.html" method="POST" novalidate>',
    '<form action="' . h(app_path('login.html')) . '" method="POST" novalidate>'
    . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">',
    $html
);

$html = str_replace('<!--mensagens-->', $mensagens, $html);
$html = str_replace('href="cadastro.html"', 'href="' . h(app_path('cadastro.html')) . '"', $html);
$html = str_replace('href="assets/auth.css"', 'href="' . h(app_path('assets/auth.css')) . '"', $html);

echo $html;
