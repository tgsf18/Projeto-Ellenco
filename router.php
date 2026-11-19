<?php
/**
 * Roteador do servidor embutido do PHP — emula o .htaccess de produção.
 *
 * Uso:  php -S 127.0.0.1:8099 router.php
 *
 * Regras (na ordem):
 *   1. rejeita path traversal;
 *   2. /painel.html e amigos -> backend/<nome>.php
 *   3. / -> painel.html (que exige sessão e cai no login se não houver);
 *   4. arquivo existente (css, js, svg) -> servido direto;
 *   5. senão, 404 com a marca do sistema.
 */
$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$raiz = __DIR__;

if (strpos($uri, '..') !== false) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Caminho inválido.';
    return true;
}

// 3. raiz
if ($uri === '/') { $uri = '/painel.html'; }

// 2. página -> backend
if (substr($uri, -5) === '.html') {
    $php = $raiz . '/backend' . preg_replace('~\.html$~', '.php', $uri);
    if (is_file($php)) {
        require $php;
        return true;
    }
}

// 4. arquivo real
$caminho = $raiz . $uri;
if (is_file($caminho)) {
    return false;   // o servidor embutido entrega o arquivo
}

// 5. 404
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
   . '<meta name="viewport" content="width=device-width,initial-scale=1">'
   . '<title>Página não encontrada — Ellenco</title>'
   . '<style>body{font-family:system-ui,-apple-system,sans-serif;background:#F7F8FA;color:#0F172A;'
   . 'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}'
   . 'div{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:30px;max-width:440px}'
   . 'h1{font-size:18px;margin:0 0 8px}p{color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px}'
   . 'a{color:#4F46E5;font-weight:600;text-decoration:none;font-size:14px}'
   . 'code{background:#F1F3F7;padding:1px 5px;border-radius:4px;font-size:12.5px}</style></head><body><div>'
   . '<h1>Página não encontrada</h1>'
   . '<p>O endereço <code>' . htmlspecialchars($uri, ENT_QUOTES) . '</code> não existe neste projeto. '
   . 'Confira se o arquivo <code>.php</code> correspondente está em <code>backend/</code>.</p>'
   . '<a href="/painel.html">Voltar para o painel</a></div></body></html>';
return true;
