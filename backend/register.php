<?php
/**
 * Cadastro — cria sempre um FUNCIONÁRIO.
 *
 * B1 corrigido em duas camadas:
 *   1. o formulário não tem mais escolha de "tipo de acesso";
 *   2. o servidor ignora qualquer coisa que venha do POST e grava 'usuario'.
 * Promover alguém é feito por uma administradora em Configurações → Usuários.
 */
require_once __DIR__ . '/db.php';

start_session();
$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome    = trim((string) ($_POST['nome'] ?? ''));
    $email   = strtolower(trim((string) ($_POST['email'] ?? '')));
    $senha   = (string) ($_POST['password'] ?? '');
    $confirm = (string) ($_POST['confirmar'] ?? '');

    // o setor também não vem do formulário: a administração define depois
    $setor = 'obras';
    $tipo  = 'usuario';

    if (!valid_csrf($_POST['csrf_token'] ?? null)) {
        $erro = 'Sua sessão expirou. Atualize a página e tente novamente.';
    } elseif ($nome === '' || mb_strlen($nome) > 120) {
        $erro = 'Informe o seu nome completo.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'Informe um e-mail válido.';
    } elseif (strlen($senha) < 8) {
        $erro = 'A senha precisa ter pelo menos 8 caracteres.';
    } elseif ($senha !== $confirm) {
        $erro = 'As duas senhas não são iguais.';
    } else {
        try {
            $stmt = db()->prepare(
                'INSERT INTO usuarios (nome, email, senha_hash, tipo_acesso, setor)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$nome, $email, password_hash($senha, PASSWORD_DEFAULT), $tipo, $setor]);
            header('Location: ' . app_path('login.html?cadastro=sucesso'), true, 303);
            exit;
        } catch (PDOException $e) {
            $erro = $e->getCode() === '23505'
                ? 'Este e-mail já está cadastrado.'
                : 'Não foi possível salvar o cadastro. Tente novamente.';
        } catch (Throwable $e) {
            $erro = 'Não foi possível conectar ao banco de dados.';
        }
    }
}

$html = (string) file_get_contents(__DIR__ . '/../cadastro.html');

$mensagens = $erro !== ''
    ? '<div class="alert alert-error" role="alert">' . h($erro) . '</div>'
    : '';

$html = str_replace(
    '<form action="cadastro.html" method="POST" novalidate>',
    '<form action="' . h(app_path('cadastro.html')) . '" method="POST" novalidate>'
    . '<input type="hidden" name="csrf_token" value="' . h(csrf_token()) . '">',
    $html
);

$html = str_replace('<!--mensagens-->', $mensagens, $html);
$html = str_replace('href="login.html"', 'href="' . h(app_path('login.html')) . '"', $html);
$html = str_replace('href="assets/auth.css"', 'href="' . h(app_path('assets/auth.css')) . '"', $html);

echo $html;
