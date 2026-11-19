<?php
/**
 * Ellenco — shell da aplicação (navegação, cabeçalho, modais padrão).
 *
 * Por que existe: cada página tinha o próprio <aside>, o próprio cabeçalho e a
 * própria nav, duplicados em painel.html / equipe.html / calendario.html.
 * Qualquer ajuste precisava ser feito 3 ou 4 vezes e saía do lugar.
 *
 * Este arquivo entrega UM shell só e cada página injeta apenas o conteúdo.
 * Sem framework, PHP puro, HTML semântico:
 *   <aside> nav  ·  <header>  ·  <main id="conteudo">  ·  <dialog> modal
 */
require_once __DIR__ . '/db.php';

const ELLENCO_NAV = [
    ['grupo' => 'VISÃO GERAL', 'itens' => [
        ['chave' => 'painel',     'label' => 'Painel de Metas', 'arquivo' => 'painel.html',     'icone' => 'target'],
        ['chave' => 'equipe',     'label' => 'Equipe',          'arquivo' => 'equipe.html',     'icone' => 'users'],
        ['chave' => 'calendario', 'label' => 'Calendário',      'arquivo' => 'calendario.html', 'icone' => 'calendar'],
        ['chave' => 'alertas',    'label' => 'Alertas',         'arquivo' => 'alertas.html',    'icone' => 'bell'],
    ]],
    ['grupo' => 'CONTA', 'itens' => [
        ['chave' => 'config',     'label' => 'Configurações',   'arquivo' => 'config.html',     'icone' => 'settings'],
    ]],
];

/** Ícones Lucide em SVG inline (sem CDN, sem dependência). */
function icon(string $name, int $size = 20, string $class = ''): string {
    $paths = [
        'target'    => '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        'users'     => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'calendar'  => '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        'settings'  => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16.11 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 9v.09a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        'bell'      => '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        'sun'       => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
        'moon'      => '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        'menu'      => '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
        'x'         => '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        'chevron-left'  => '<polyline points="15 18 9 12 15 6"/>',
        'chevron-right' => '<polyline points="9 18 15 12 9 6"/>',
        'chevron-down'  => '<polyline points="6 9 12 15 18 9"/>',
        'log-out'   => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        'plus'      => '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        'check'     => '<polyline points="20 6 9 17 4 12"/>',
        'clock'     => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'alert'     => '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'paperclip' => '<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
        'link'      => '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
        'edit'      => '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
        'trash'     => '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        'filter'    => '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
        'chart'     => '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        'file-text' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        'file'      => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
        'download'  => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'upload'    => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        'loader'    => '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
        'search'    => '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
        'user'      => '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'user-plus' => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
        'lock'      => '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        'palette'   => '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
        'info'      => '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        'mail'      => '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
        'phone'     => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'map-pin'   => '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
        'external'  => '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
        'image'     => '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
        'table'     => '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>',
        'presentation' => '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="M7 21l5-5 5 5"/>',
        'video'     => '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
        'audio'     => '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        'archive'   => '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
        'terminal'  => '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
        'shield'    => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    ];
    $body = $paths[$name] ?? $paths['alert'];
    $cls = $class !== '' ? ' class="' . htmlspecialchars($class, ENT_QUOTES) . '"' : '';
    return '<svg' . $cls . ' width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none"'
         . ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
         . ' aria-hidden="true" focusable="false">' . $body . '</svg>';
}

function inicial_do_nome(string $nome): string {
    $partes = preg_split('/\s+/u', trim($nome)) ?: [];
    $ini = '';
    foreach ($partes as $p) {
        if ($p === '') continue;
        $ini .= mb_strtoupper(mb_substr($p, 0, 1));
        if (mb_strlen($ini) >= 2) break;
    }
    return $ini !== '' ? $ini : '?';
}

function tipo_acesso_label(string $tipo): string {
    return ['admin' => 'Administrador(a)', 'gestor' => 'Gestor(a)', 'usuario' => 'Funcionário(a)'][$tipo] ?? 'Funcionário(a)';
}

/**
 * Campo de busca reutilizável — GET, server-side, com o termo preservado.
 * $params: parâmetros que devem sobreviver à busca (ex.: filtro de status).
 */
function campo_busca(string $termo, string $placeholder, array $params = [], string $id = 'busca'): string {
    $ocultos = '';
    foreach ($params as $k => $v) {
        if ($k === 'busca' || $k === 'pagina' || $v === '' || $v === null) continue;
        $ocultos .= '<input type="hidden" name="' . h((string) $k) . '" value="' . h((string) $v) . '">';
    }
    return '<form class="busca" role="search" method="get" action="">'
         . $ocultos
         . '<label class="sr-only" for="' . h($id) . '">' . h($placeholder) . '</label>'
         . '<span class="busca-icone" aria-hidden="true">' . icon('search', 16) . '</span>'
         . '<input type="search" id="' . h($id) . '" name="busca" value="' . h($termo) . '"'
         . ' placeholder="' . h($placeholder) . '" autocomplete="off" enterkeyhint="search">'
         . ($termo !== '' ? '<a class="busca-limpar" href="?' . h(http_build_query(array_diff_key($params, ['busca' => 1, 'pagina' => 1]))) . '" aria-label="Limpar busca">' . icon('x', 15) . '</a>' : '')
         . '<button class="btn btn-sm" type="submit">Buscar</button>'
         . '</form>';
}

/** Componente de paginação (server-side, links reais). */
function render_paginacao(array $p): string {
    if (($p['paginas'] ?? 1) <= 1) return '';
    $atual = (int) $p['pagina'];
    $total = (int) $p['paginas'];
    $inicio = max(1, $atual - 2);
    $fim = min($total, $inicio + 4);
    $inicio = max(1, $fim - 4);

    $html = '<nav class="paginacao" aria-label="Paginação">';
    $html .= $p['temAnterior']
        ? '<a class="btn btn-sm" rel="prev" href="' . h($p['link']($atual - 1)) . '">' . icon('chevron-left', 14) . ' Anterior</a>'
        : '<span class="btn btn-sm" aria-disabled="true">' . icon('chevron-left', 14) . ' Anterior</span>';

    for ($i = $inicio; $i <= $fim; $i++) {
        $html .= $i === $atual
            ? '<span class="btn btn-sm btn-primary" aria-current="page">' . $i . '</span>'
            : '<a class="btn btn-sm" href="' . h($p['link']($i)) . '">' . $i . '</a>';
    }

    $html .= $p['temProxima']
        ? '<a class="btn btn-sm" rel="next" href="' . h($p['link']($atual + 1)) . '">Próxima ' . icon('chevron-right', 14) . '</a>'
        : '<span class="btn btn-sm" aria-disabled="true">Próxima ' . icon('chevron-right', 14) . '</span>';

    $html .= '<span class="paginacao-info">' . (int) $p['total'] . ' registro(s) · página ' . $atual . ' de ' . $total . '</span>';
    return $html . '</nav>';
}

/** Modal de confirmação único (usado por window.Ellenco.confirmar). */
function modal_confirmar(): string {
    return '<dialog class="modal" id="modal-confirmar" aria-labelledby="conf-titulo">'
         . '<div class="modal-inner">'
         . '<div class="modal-head"><div><h2 id="conf-titulo" data-confirm-titulo>Confirmar</h2>'
         . '<p class="card-sub" data-confirm-mensagem></p></div>'
         . '<button class="icon-btn" type="button" data-modal-close aria-label="Fechar">' . icon('x', 20) . '</button></div>'
         . '<div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button>'
         . '<button class="btn btn-primary" type="button" data-confirm-ok>Confirmar</button></div>'
         . '</div></dialog>';
}

/**
 * Renderiza o shell completo. $ativo é a chave do item de menu da página.
 * $conteudo é o HTML interno da página (dentro de <main>).
 */
function render_shell(array $user, string $ativo, string $titulo, string $subtitulo, string $conteudo, array $opts = []): string {
    $nome = (string) ($user['nome'] ?? 'Usuário');
    $funcao = $opts['funcao'] ?? '';
    $badge = (int) ($opts['notificacoes'] ?? 0);

    // valores já escapados — o heredoc abaixo não chama função
    $css     = h(app_path('assets/app.css'));
    $js      = h(app_path('assets/app.js'));
    $home    = h(app_path('painel.html'));
    $logout  = h(app_path('backend/logout.php'));
    $alertas = h(app_path('alertas.html'));
    $iconeMenu    = icon('menu', 22);
    $iconeX       = icon('x', 20);
    $iconeSino    = icon('bell', 20);
    $iconeSol     = icon('sun', 20);
    $iconeLua     = icon('moon', 20);
    $iconeSair    = icon('log-out', 20);
    $iconeChevron = icon('chevron-left', 18);
    $iconeBusca   = icon('search', 18);
    $iniciais = h(inicial_do_nome($nome));
    $nomeHtml = h($nome);
    $funcaoHtml = h($funcao);
    $tituloHtml = h($titulo);
    $subtituloHtml = h($subtitulo);

    $navHtml = '';
    foreach (ELLENCO_NAV as $grupo) {
        $navHtml .= '<p class="nav-group">' . h($grupo['grupo']) . '</p>';
        foreach ($grupo['itens'] as $item) {
            $isActive = $item['chave'] === $ativo;
            $navHtml .= '<a href="' . h(app_path($item['arquivo'])) . '"'
                     . ' class="nav-item' . ($isActive ? ' is-active' : '') . '"'
                     . ($isActive ? ' aria-current="page"' : '')
                     . ' title="' . h($item['label']) . '">'
                     . '<span class="nav-icon">' . icon($item['icone'], 20) . '</span>'
                     . '<span class="nav-label">' . h($item['label']) . '</span>'
                     . '</a>';
        }
    }

    $badgeHtml = $badge > 0
        ? '<span class="notif-badge" aria-label="' . $badge . ' avisos não lidos">' . ($badge > 9 ? '9+' : $badge) . '</span>'
        : '';

    $modalConfirmar = modal_confirmar();

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ellenco Construções — {$tituloHtml}</title>
<script>
  // Aplica o tema ANTES do primeiro paint: sem flash branco.
  (function () {
    try {
      var t = localStorage.getItem('ellenco-theme');
      if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
      var c = localStorage.getItem('ellenco-sidebar');
      if (c === 'collapsed') document.documentElement.dataset.sidebar = 'collapsed';
    } catch (e) {}
  })();
</script>
<link rel="stylesheet" href="{$css}">
</head>
<body class="app">

  <a href="#conteudo" class="skip-link">Pular para o conteúdo</a>

  <div class="shell">

    <aside class="sidebar" id="sidebar" aria-label="Menu lateral">
      <div class="sidebar-head">
        <a class="brand" href="{$home}">
          <span class="brand-mark" aria-hidden="true">E</span>
          <span class="brand-text">
            <strong>Ellenco</strong>
            <small>CONSTRUÇÕES</small>
          </span>
        </a>
        <button class="icon-btn sidebar-close" type="button" data-sidebar-close aria-label="Fechar menu">
          {$iconeX}
        </button>
      </div>

      <nav class="sidebar-nav" aria-label="Navegação principal">{$navHtml}</nav>

      <div class="sidebar-foot">
        <button class="icon-btn collapse-btn" type="button" data-sidebar-toggle
                aria-label="Recolher menu" title="Recolher menu">
          {$iconeChevron}
        </button>
      </div>
    </aside>

    <div class="sidebar-overlay" data-sidebar-close hidden></div>

    <div class="content-area">
      <header class="topbar">
        <button class="icon-btn topbar-menu" type="button" data-sidebar-open aria-label="Abrir menu">
          {$iconeMenu}
        </button>

        <div class="topbar-title">
          <h1>{$tituloHtml}</h1>
          <p>{$subtituloHtml}</p>
        </div>

        <div class="topbar-actions">
          <a class="icon-btn topbar-busca" href="{$home}#busca" aria-label="Buscar metas" title="Buscar">{$iconeBusca}</a>

          <a class="icon-btn bell" href="{$alertas}" aria-label="Avisos e eventos próximos">
            {$iconeSino}{$badgeHtml}
          </a>

          <button class="icon-btn" type="button" data-theme-toggle aria-label="Alternar tema claro/escuro" title="Alternar tema">
            <span class="only-light">{$iconeLua}</span>
            <span class="only-dark">{$iconeSol}</span>
          </button>

          <div class="user-pill">
            <span class="avatar" aria-hidden="true">{$iniciais}</span>
            <span class="user-meta">
              <strong>{$nomeHtml}</strong>
              <small>{$funcaoHtml}</small>
            </span>
          </div>

          <a class="icon-btn danger" href="{$logout}" aria-label="Sair" title="Sair">
            {$iconeSair}
          </a>
        </div>
      </header>

      <main id="conteudo" class="page" tabindex="-1">{$conteudo}</main>
    </div>
  </div>

  <div id="toast-host" class="toast-host" role="status" aria-live="polite"></div>
  {$modalConfirmar}

  <script src="{$js}"></script>
</body>
</html>
HTML;
}

/**
 * Atalho: prepara variáveis do heredoc e imprime a página.
 */
function page(array $user, string $ativo, string $titulo, string $subtitulo, string $conteudo, array $opts = []): void {
    echo render_shell($user, $ativo, $titulo, $subtitulo, $conteudo, $opts);
}

/** Contagem de avisos não lidos para o sino. */
function contar_notificacoes(int $usuarioId): int {
    try {
        $stmt = db()->prepare('SELECT COUNT(*) FROM notificacoes WHERE usuario_id = ? AND lida = 0');
        $stmt->execute([$usuarioId]);
        return (int) $stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0; // tabela ainda não migrada: o sino simplesmente não mostra badge
    }
}

/** Aviso padrão de "banco ainda não migrado", usado nas páginas. */
function aviso_migracao(): string {
    return '<div class="alert alert-warning" role="alert">'
         . 'Este módulo precisa das migrações <strong>database-V1.sql</strong> e '
         . '<strong>database-V2.sql</strong>. Abra o SQL Editor do Supabase e execute os arquivos; '
         . 'depois recarregue a página.'
         . '</div>';
}
