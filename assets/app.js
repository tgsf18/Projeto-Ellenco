/* ============================================================================
   Ellenco — shell: tema, sidebar recolhível, drawer mobile, modais, toasts.
   Sem dependência: JS puro, ES2019. Cada parte é independente e não quebra
   se o elemento não existir na página.
   ========================================================================= */
(function () {
  'use strict';

  var html = document.documentElement;

  /* ---------------------------------------------------------------- tema -- */
  function temaAtual() { return html.dataset.theme === 'dark' ? 'dark' : 'light'; }

  function aplicarTema(t) {
    html.dataset.theme = t;
    try { localStorage.setItem('ellenco-theme', t); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
    // gráficos leem as cores no render: avisa quem estiver escutando
    window.dispatchEvent(new CustomEvent('ellenco:tema-mudou', { detail: { tema: t } }));
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-theme-toggle]');
    if (btn) { aplicarTema(temaAtual() === 'dark' ? 'light' : 'dark'); }
  });

  /* ------------------------------------------------------ sidebar mobile -- */
  function sidebarAberta() { return html.dataset.sidebarOpen === 'true'; }

  function abrirSidebar() {
    html.dataset.sidebarOpen = 'true';
    var ov = document.querySelector('.sidebar-overlay');
    if (ov) ov.hidden = false;
    document.body.style.overflow = 'hidden';
    var primeiro = document.querySelector('.sidebar .nav-item');
    if (primeiro) primeiro.focus();
  }

  function fecharSidebar() {
    delete html.dataset.sidebarOpen;
    var ov = document.querySelector('.sidebar-overlay');
    if (ov) ov.hidden = true;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-sidebar-open]')) { abrirSidebar(); return; }
    if (ev.target.closest('[data-sidebar-close]')) { fecharSidebar(); return; }

    var toggle = ev.target.closest('[data-sidebar-toggle]');
    if (toggle) {
      var colapsada = html.dataset.sidebar === 'collapsed';
      if (colapsada) { delete html.dataset.sidebar; } else { html.dataset.sidebar = 'collapsed'; }
      try { localStorage.setItem('ellenco-sidebar', colapsada ? 'expanded' : 'collapsed'); } catch (e) {}
      var lbl = toggle.getAttribute('aria-label') || '';
      toggle.setAttribute('aria-label', colapsada ? 'Recolher menu' : 'Expandir menu');
      window.dispatchEvent(new CustomEvent('ellenco:sidebar-mudou'));
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && sidebarAberta()) fecharSidebar();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 760 && sidebarAberta()) fecharSidebar();
  });

  /* -------------------------------------------------------------- modal -- */
  var modalAtual = null;
  var gatilhoDoModal = null;

  function abrirModal(id, gatilho) {
    var dlg = document.getElementById(id);
    if (!dlg) return null;
    gatilhoDoModal = gatilho || null;
    modalAtual = dlg;

    // foco vai para o primeiro campo, não para o botão de fechar
    var foco = dlg.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button');
    if (dlg.showModal) {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', 'open');
    }
    if (foco) setTimeout(function () { foco.focus(); }, 30);
    document.body.style.overflow = 'hidden';

    dlg.querySelectorAll('[data-modal-close]').forEach(function (b) {
      b.onclick = function () { fecharModal(id); };
    });

    return dlg;
  }

  function fecharModal(id) {
    var dlg = document.getElementById(id);
    if (!dlg) return;
    if (dlg.close && dlg.open) { dlg.close(); }
    else { dlg.removeAttribute('open'); }
    document.body.style.overflow = '';
    modalAtual = null;
    if (gatilhoDoModal && gatilhoDoModal.focus) gatilhoDoModal.focus();
  }

  // clique no backdrop fecha
  document.addEventListener('click', function (ev) {
    var dlg = ev.target.closest('dialog.modal');
    if (dlg && ev.target === dlg) fecharModal(dlg.id);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && modalAtual) {
      if (ev.target.closest('[data-bloqueia-fechar]')) { ev.preventDefault(); return; }
      // o <dialog> nativo já trata Esc; garantimos o foco de volta
      setTimeout(function () {
        if (gatilhoDoModal && gatilhoDoModal.focus) gatilhoDoModal.focus();
        document.body.style.overflow = '';
      }, 0);
    }
  });


  /* ------------------------------------------------ menu em lista (config) -- */
  // Cada <button data-secao="perfil"> mostra o <section id="secao-perfil">.
  // Guarda a seção na URL (#perfil) para o link ser compartilhável e o F5
  // reabrir no mesmo lugar.
  function abrirSecao(nome) {
    var secoes = document.querySelectorAll('[data-secao-painel]');
    if (!secoes.length) return;
    var achou = false;
    secoes.forEach(function (s) {
      var ativa = s.getAttribute('data-secao-painel') === nome;
      s.hidden = !ativa;
      s.classList.toggle('is-ativa', ativa);
      if (ativa) achou = true;
    });
    if (!achou) return;
    document.querySelectorAll('[data-secao]').forEach(function (b) {
      var ativa = b.getAttribute('data-secao') === nome;
      b.classList.toggle('is-active', ativa);
      if (ativa) { b.setAttribute('aria-current', 'true'); } else { b.removeAttribute('aria-current'); }
    });
    try { history.replaceState(null, '', '#' + nome); } catch (e) {}
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-secao]');
    if (!b || !b.hasAttribute('data-secao')) return;
    ev.preventDefault();
    abrirSecao(b.getAttribute('data-secao'));
    var alvo = document.querySelector('[data-secao-painel="' + b.getAttribute('data-secao') + '"]');
    if (alvo) alvo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  /* -------------------------------------------- destino pessoa/equipe -- */
  function sincronizarDestino(sel) {
    if (!sel) return;
    var v = sel.value;
    var escopo = sel.closest('form') || document;
    escopo.querySelectorAll('[data-destino-pessoa]').forEach(function (el) { el.hidden = v !== 'pessoa'; });
    escopo.querySelectorAll('[data-destino-equipe]').forEach(function (el) { el.hidden = v !== 'equipe'; });
  }

  document.addEventListener('change', function (ev) {
    if (ev.target.matches('[data-destino]')) { sincronizarDestino(ev.target); return; }
    if (!ev.target.matches('[data-destino]')) return;
    var v = ev.target.value;
    document.querySelectorAll('[data-destino-pessoa]').forEach(function (el) { el.hidden = v !== 'pessoa'; });
    document.querySelectorAll('[data-destino-equipe]').forEach(function (el) { el.hidden = v !== 'equipe'; });
  });

  /* ------------------------------------------------- editor rico simples -- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-cmd]');
    if (!b) return;
    ev.preventDefault();
    var cmd = b.getAttribute('data-cmd');
    var editor = b.closest('.editor-bloco');
    editor = editor ? editor.querySelector('.editor') : null;
    if (editor) editor.focus();
    if (cmd.indexOf('formatBlock:') === 0) {
      document.execCommand('formatBlock', false, cmd.split(':')[1]);
    } else {
      document.execCommand(cmd, false, null);
    }
  });

  // o conteúdo do editor vai para o input escondido antes de enviar
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    form.querySelectorAll('.editor-bloco').forEach(function (bloco) {
      var editor = bloco.querySelector('.editor');
      var campo = bloco.querySelector('input[type="hidden"]');
      if (editor && campo) campo.value = editor.innerHTML.trim();
    });
  }, true);

  /* -------------------------------------------------------------- toast -- */
  function toast(msg, tipo) {
    var host = document.getElementById('toast-host');
    if (!host) { return; }
    var el = document.createElement('div');
    el.className = 'toast' + (tipo ? ' is-' + tipo : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 200);
    }, 3800);
  }

  /* ------------------------------------------------- confirmação padrão -- */
  function confirmar(opcoes) {
    // opcoes: { titulo, mensagem, textoOk, textoCancelar, perigoso, onOk }
    var dlg = document.getElementById('modal-confirmar');
    if (!dlg) {
      if (window.confirm(opcoes.mensagem || 'Confirmar?')) opcoes.onOk();
      return;
    }
    dlg.querySelector('[data-confirm-titulo]').textContent = opcoes.titulo || 'Confirmar';
    dlg.querySelector('[data-confirm-mensagem]').textContent = opcoes.mensagem || '';
    var ok = dlg.querySelector('[data-confirm-ok]');
    ok.textContent = opcoes.textoOk || 'Confirmar';
    ok.className = 'btn ' + (opcoes.perigoso ? 'btn-danger' : 'btn-primary');
    abrirModal('modal-confirmar', opcoes.gatilho);
    ok.onclick = function () {
      fecharModal('modal-confirmar');
      opcoes.onOk();
    };
  }

  /* ------------------------------------------- botão com estado de envio -- */
  function bloqueiaDuploEnvio(form) {
    if (!form) return;
    form.addEventListener('submit', function () {
      var btn = form.querySelector('[type="submit"]');
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      btn.dataset.textoOriginal = btn.textContent;
      btn.textContent = 'Salvando…';
      // se a navegação não acontecer (erro de validação), devolve o botão
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = btn.dataset.textoOriginal || btn.textContent;
      }, 12000);
    });
  }

  /* -------------------------------------------------------------- expor -- */
  window.Ellenco = {
    toast: toast,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
    confirmar: confirmar,
    temaAtual: temaAtual,
    aplicarTema: aplicarTema,
    bloqueiaDuploEnvio: bloqueiaDuploEnvio,
    abrirSecao: abrirSecao,
    corToken: function (nome) {
      return getComputedStyle(html).getPropertyValue(nome).trim();
    }
  };

  /* ----------------------------- inicialização de tudo que existe na DOM -- */
  document.addEventListener('DOMContentLoaded', function () {
    aplicarTema(temaAtual());
    document.querySelectorAll('form').forEach(bloqueiaDuploEnvio);

    document.querySelectorAll('[data-modal-abrir]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        abrirModal(btn.getAttribute('data-modal-abrir'), btn);
      });
    });

    // selects de destino já começam no estado certo (não só depois do change)
    document.querySelectorAll('[data-destino]').forEach(sincronizarDestino);

    // botões de tema da página de Configurações
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tema]');
      if (b) aplicarTema(b.getAttribute('data-tema'));
    });

    // seção inicial das Configurações (#perfil, #senha, ...)
    if (document.querySelector('[data-secao-painel]')) {
      abrirSecao((location.hash || '').replace('#', '') || 'perfil');
    }

    // mensagens vindas da URL (?salvo=..., ?erro=...)
    var params = new URLSearchParams(location.search);
    if (params.get('salvo')) toast(params.get('salvo'), 'success');
    if (params.get('erro')) toast(params.get('erro'), 'error');
  });
})();
