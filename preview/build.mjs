/**
 * Pré-visualização estática — para conferir o visual SEM PHP instalado.
 *
 *   node preview/build.mjs
 *
 * Gera preview/*.html com dados de exemplo, usando o MESMO assets/app.css e
 * assets/app.js do sistema. Serve para validar layout, dark mode, responsivo
 * e modais. NÃO é usado em produção (lá é Apache + PHP).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const out = aqui;

fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
for (const f of ['app.css', 'app.js', 'auth.css']) {
  fs.copyFileSync(path.join(raiz, 'assets', f), path.join(out, 'assets', f));
}

/* -------------------------------------------------------------- ícones -- */
const paths = {
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16.11 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 9v.09a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  paperclip: '<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
};
const icon = (n, s = 20) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n] || paths.x}</svg>`;

/* --------------------------------------------------------------- dados -- */
const usuario = { nome: 'Ana Paula Medeiros', email: 'ana@ellenco.com.br', funcao: 'Engenheira civil' };
const iniciais = (n) => n.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const metas = [
  { titulo: 'Concretagem da laje do 2º pavimento', pessoa: 'Carlos Souza', periodo: '04/11 – 22/11', prog: 65, status: 'Em andamento', cor: 'info', prio: 'Alta', anexos: 2 },
  { titulo: 'Revisão do projeto elétrico — Bloco B', pessoa: 'Marina Alves', periodo: '01/11 – 15/11', prog: 100, status: 'Concluída', cor: 'success', prio: 'Média', anexos: 1 },
  { titulo: 'Fechamento do orçamento trimestral', pessoa: 'Rafael Lima', periodo: '28/10 – 08/11', prog: 40, status: 'Atrasada', cor: 'danger', prio: 'Alta', anexos: 0 },
  { titulo: 'Inspeção de segurança do canteiro', pessoa: 'Juliana Prado', periodo: '12/11 – 26/11', prog: 15, status: 'Em andamento', cor: 'info', prio: 'Baixa', anexos: 3 },
];

const equipes = [
  { nome: 'Equipe Obras — Bloco A', membros: ['Carlos Souza', 'Juliana Prado', 'Diego Nunes'], prog: 72, concl: 8, total: 12 },
  { nome: 'Engenharia e Projetos', membros: ['Marina Alves', 'Ana Paula Medeiros'], prog: 88, concl: 6, total: 7 },
  { nome: 'Administrativo', membros: ['Rafael Lima', 'Bianca Rocha'], prog: 54, concl: 3, total: 6 },
];

const eventos = {
  4: [{ h: '08:00', t: 'Vistoria da estrutura', c: 'var(--chart-2)' }],
  8: [{ h: '14:00', t: 'Reunião de obra', c: 'var(--chart-1)' }],
  12: [{ h: '09:30', t: 'Fiscalização CREA', c: 'var(--chart-2)' }],
  15: [{ h: '10:00', t: 'Entrega de material', c: 'var(--chart-4)' }],
  19: [{ h: '16:00', t: 'Treinamento NR-18', c: 'var(--chart-3)' }],
  22: [{ h: '08:00', t: 'Conclusão: laje 2º pav.', c: 'var(--success)' }],
  26: [{ h: '11:00', t: 'Reunião com cliente', c: 'var(--chart-1)' }],
};

const badge = (txt, cls) => `<span class="badge ${cls || ''}">${txt}</span>`;

const campoBusca = (placeholder) => `<form class="busca" role="search">
  <span class="busca-icone">${icon('search', 16)}</span>
  <input type="search" placeholder="${placeholder}" aria-label="${placeholder}">
  <button class="busca-limpar" type="reset" aria-label="Limpar busca">${icon('x', 14)}</button>
</form>`;

const paginacao = (atual = 1, total = 3, info = '1–12 de 18') => `<nav class="paginacao" aria-label="Paginação">
  <a class="btn btn-sm" href="#" aria-disabled="${atual === 1}">Anterior</a>
  ${Array.from({ length: total }, (_, i) => `<a class="btn btn-sm${i + 1 === atual ? ' btn-primary' : ''}" href="#">${i + 1}</a>`).join('')}
  <a class="btn btn-sm" href="#">Próxima</a>
  <span class="paginacao-info">${info}</span>
</nav>`;

/* ---------------------------------------------------------------- shell -- */
const nav = [
  { grupo: 'VISÃO GERAL', itens: [['painel', 'Painel de Metas', 'target'], ['equipe', 'Equipe', 'users'], ['calendario', 'Calendário', 'calendar'], ['alertas', 'Alertas', 'bell']] },
  { grupo: 'CONTA', itens: [['config', 'Configurações', 'settings']] },
];

function shell(ativo, titulo, subtitulo, conteudo) {
  const navHtml = nav.map((g) =>
    `<p class="nav-group">${g.grupo}</p>` +
    g.itens.map(([k, l, i]) =>
      `<a href="${k}.html" class="nav-item${k === ativo ? ' is-active' : ''}"${k === ativo ? ' aria-current="page"' : ''} title="${l}"><span class="nav-icon">${icon(i, 20)}</span><span class="nav-label">${l}</span></a>`
    ).join('')
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ellenco Construções — ${titulo}</title>
<script>
(function(){try{var t=localStorage.getItem('ellenco-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;if(localStorage.getItem('ellenco-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed';}catch(e){}})();
</script>
<link rel="stylesheet" href="assets/app.css">
</head>
<body class="app">
<a href="#conteudo" class="skip-link">Pular para o conteúdo</a>
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-head">
      <a class="brand" href="painel.html"><span class="brand-mark">E</span><span class="brand-text"><strong>Ellenco</strong><small>CONSTRUÇÕES</small></span></a>
      <button class="icon-btn sidebar-close" type="button" data-sidebar-close aria-label="Fechar menu">${icon('x', 20)}</button>
    </div>
    <nav class="sidebar-nav" aria-label="Navegação principal">${navHtml}</nav>
    <div class="sidebar-foot"><button class="icon-btn collapse-btn" type="button" data-sidebar-toggle aria-label="Recolher menu" title="Recolher menu">${icon('chevronLeft', 18)}</button></div>
  </aside>
  <div class="sidebar-overlay" data-sidebar-close hidden></div>
  <div class="content-area">
    <header class="topbar">
      <button class="icon-btn topbar-menu" type="button" data-sidebar-open aria-label="Abrir menu">${icon('menu', 22)}</button>
      <div class="topbar-title"><h1>${titulo}</h1><p>${subtitulo}</p></div>
      <div class="topbar-actions">
        <a class="icon-btn bell" href="alertas.html" aria-label="Avisos">${icon('bell', 20)}<span class="notif-badge">3</span></a>
        <button class="icon-btn" type="button" data-theme-toggle aria-label="Alternar tema" title="Alternar tema"><span class="only-light">${icon('moon', 20)}</span><span class="only-dark">${icon('sun', 20)}</span></button>
        <div class="user-pill"><span class="avatar" aria-hidden="true">${iniciais(usuario.nome)}</span><span class="user-meta"><strong>${usuario.nome}</strong><small>${usuario.funcao}</small></span></div>
        <a class="icon-btn danger" href="login.html" aria-label="Sair" title="Sair">${icon('logout', 20)}</a>
      </div>
    </header>
    <main id="conteudo" class="page">${conteudo}</main>
  </div>
</div>
<div id="toast-host" class="toast-host" role="status" aria-live="polite"></div>
<dialog class="modal" id="modal-confirmar"><div class="modal-inner">
  <div class="modal-head"><div><h2 data-confirm-titulo>Confirmar</h2><p class="card-sub" data-confirm-mensagem>—</p></div>
  <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
  <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" data-confirm-ok>Confirmar</button></div>
</div></dialog>
<script src="assets/app.js"></script>
<script src="demo.js"></script>
</body>
</html>`;
}

/* --------------------------------------------------------------- painel -- */
const cards = `<section class="grid grid-4" style="margin-bottom:16px">
  <div class="card"><div class="metric"><span class="metric-label">Metas</span><span class="metric-value">18</span><span class="metric-hint">atribuídas no sistema</span></div></div>
  <div class="card"><div class="metric"><span class="metric-label">Concluídas</span><span class="metric-value" style="color:var(--success)">7</span><span class="metric-hint">39% do total</span></div></div>
  <div class="card"><div class="metric"><span class="metric-label">Em andamento</span><span class="metric-value" style="color:var(--info)">8</span><span class="metric-hint">trabalho em curso</span></div></div>
  <div class="card"><div class="metric"><span class="metric-label">Atrasadas</span><span class="metric-value" style="color:var(--danger)">3</span><span class="metric-hint">prazo vencido</span></div></div>
</section>`;

const chipsMetas = `<div class="chips" role="tablist" aria-label="Filtrar metas">
  <a class="chip is-ativo" role="tab" aria-selected="true" href="#">Todas <span class="chip-contagem">18</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">Em andamento <span class="chip-contagem">8</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">Concluídas <span class="chip-contagem">7</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">Atrasadas <span class="chip-contagem">3</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">Minhas <span class="chip-contagem">5</span></a>
</div>`;

const barraMetas = `<div class="row-between" style="margin-bottom:16px">
  ${campoBusca('Buscar meta por título, descrição ou responsável…')}${chipsMetas}</div>`;

const listaMetas = `<div class="grid grid-2">` + metas.map((m, i) => `
  <article class="card">
    <div class="card-head">
      <div style="min-width:0"><h3 style="line-height:1.35">${m.titulo}</h3>
        <p class="card-sub">${m.pessoa} · ${m.periodo}</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${badge(m.status, 'badge-' + m.cor)}
        ${badge(m.prio, m.prio === 'Alta' ? 'badge-danger' : m.prio === 'Média' ? 'badge-warning' : '')}
      </div>
    </div>
    <div style="margin:10px 0 12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:5px"><span>Progresso</span><strong>${m.prog}%</strong></div>
      <div class="progress${m.prog >= 100 ? ' is-done' : m.cor === 'danger' ? ' is-late' : ''}"><span style="width:${m.prog}%"></span></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-sm" type="button" data-modal-abrir="modal-meta-${i}">${icon('file', 14)} Detalhes</button>
      ${m.anexos ? `<span class="badge badge-primary">${icon('paperclip', 13)} ${m.anexos}</span>` : ''}
      <button class="btn btn-sm btn-primary" type="button" data-abrir-progresso="${m.titulo}" data-titulo="${m.titulo}" data-progresso="${m.prog}">${icon('edit', 14)} Progresso</button>
      <button class="btn btn-sm btn-ghost" style="margin-left:auto" type="button" data-confirmar="Excluir esta meta e todas as atribuições dela?" title="Excluir meta">${icon('trash', 14)}</button>
    </div>
  </article>`).join('') + `</div>` + paginacao(1, 2, '1–4 de 18 metas');

const anexosDemo = {
  0: [['PDF', 'Projeto-estrutural-laje.pdf', '4,2 MB', 'anexo-pdf'], ['IMG', 'foto-concretagem.jpg', '1,1 MB', 'anexo-imagem']],
  1: [['LINK', 'drive.google.com/…/revisao-eletrica', 'Google Drive', 'anexo-link']],
  2: [],
  3: [['XLSX', 'checklist-seguranca.xlsx', '88 KB', 'anexo-planilha'], ['PDF', 'NR-18.pdf', '2,3 MB', 'anexo-pdf'], ['EXE', 'instalador-epi.exe', '12,4 MB', 'anexo-outro']],
};

const modaisDetalhe = metas.map((m, i) => `<dialog class="modal modal-largo" id="modal-meta-${i}" aria-labelledby="titulo-meta-${i}">
  <div class="modal-inner">
    <div class="modal-head"><div><h2 id="titulo-meta-${i}">Meta</h2><p class="card-sub">${m.titulo}</p></div>
      <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="detalhe-topo">
        <div class="row">${badge(m.status, 'badge-' + m.cor)}${badge(m.prio, m.prio === 'Alta' ? 'badge-danger' : '')}</div>
        <h3 class="detalhe-titulo">${m.titulo}</h3>
        <p class="detalhe-sub">${m.periodo} · ${m.prog}% concluído</p>
      </div>
      <section class="detalhe-secao"><h3>Descrição</h3>
        <div class="descricao-rica"><p>Executar a concretagem da laje do 2º pavimento conforme o projeto estrutural revisado.</p>
          <ul><li>Conferir armadura e formas antes da liberação</li><li>Romaneio do concreto com slump test</li><li>Cura úmida por 7 dias</li></ul></div></section>
      <section class="detalhe-secao"><h3>Anexos e links</h3>
        <div class="anexos">${(anexosDemo[i] || []).map(([tag, nome, meta, cls]) => `<a class="anexo ${cls}" href="#">
          <span class="anexo-icone">${icon(tag === 'LINK' ? 'link' : 'file', 17)}</span>
          <span style="min-width:0"><span class="anexo-nome">${nome}</span><span class="anexo-meta">${meta}</span></span>
          <span class="anexo-tag">${tag}</span></a>`).join('') || '<p class="text-sm muted">Nenhum anexo.</p>'}</div></section>
      <section class="detalhe-secao"><h3>Informações</h3><dl class="info-lista">
        <dt>${icon('user', 14)} Responsável</dt><dd>${m.pessoa}</dd>
        <dt>${icon('calendar', 14)} Período</dt><dd>${m.periodo}</dd>
        <dt>${icon('shield', 14)} Criada por</dt><dd>Ana Paula Medeiros</dd>
        <dt>${icon('clock', 14)} Criada em</dt><dd>04/11/2026 09:12</dd>
      </dl></section>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Fechar</button></div>
  </div>
</dialog>`).join('');

const modalProgresso = `<dialog class="modal" id="modal-progresso"><form class="modal-inner" data-demo-ok="Progresso salvo">
  <div class="modal-head"><div><h2>Atualizar progresso</h2><p class="card-sub" data-progresso-titulo>—</p></div>
  <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
  <div class="modal-body stack">
    <div class="field"><label for="progresso-valor">Progresso (%)</label>
      <input type="number" id="progresso-valor" min="0" max="100" step="1" required>
      <span class="hint">Ao chegar a 100%, a meta é concluída e um evento é criado no calendário.</span></div>
    <div class="field"><label for="progresso-comentario">O que foi feito (opcional)</label>
      <textarea id="progresso-comentario" placeholder="Ex.: concretagem da laje concluída, aguardando cura."></textarea>
      <span class="hint">Fica no histórico da meta — nada é sobrescrito.</span></div>
  </div>
  <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Salvar progresso</button></div>
</form></dialog>`;

const modalCriar = `<dialog class="modal" id="modal-criar-meta"><form class="modal-inner" data-demo-ok="Meta criada e atribuída">
  <div class="modal-head"><div><h2>Criar meta</h2><p class="card-sub">Será atribuída a uma pessoa ou a uma equipe inteira.</p></div>
  <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
  <div class="modal-body stack">
    <div class="field"><label for="meta-titulo">Título</label><input type="text" id="meta-titulo" required placeholder="Ex.: Concretagem da laje do 2º pavimento"></div>
    <div class="field"><label>Descrição</label>
      <div class="editor-bloco">
        <div class="editor-toolbar" role="toolbar" aria-label="Formatação">
          <button type="button" class="btn btn-sm" data-cmd="bold" title="Negrito"><b>B</b></button>
          <button type="button" class="btn btn-sm" data-cmd="italic" title="Itálico"><i>I</i></button>
          <button type="button" class="btn btn-sm" data-cmd="underline" title="Sublinhado"><u>U</u></button>
          <button type="button" class="btn btn-sm" data-cmd="insertUnorderedList">Lista</button>
          <button type="button" class="btn btn-sm" data-cmd="formatBlock:h3">Título</button>
        </div>
        <div class="editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Descreva a meta e os critérios de aceite…"></div>
      </div>
      <span class="hint">O HTML é sanitizado no servidor antes de ser gravado.</span></div>
    <div class="grid grid-2">
      <div class="field"><label for="meta-inicio">Início</label><input type="date" id="meta-inicio"></div>
      <div class="field"><label for="meta-fim">Prazo final</label><input type="date" id="meta-fim"></div>
    </div>
    <div class="grid grid-2">
      <div class="field"><label for="meta-prioridade">Prioridade</label><select id="meta-prioridade"><option>Baixa</option><option selected>Média</option><option>Alta</option></select></div>
      <div class="field"><label for="meta-destino">Atribuir para</label><select id="meta-destino" data-destino><option value="pessoa" selected>Uma pessoa</option><option value="equipe">Uma equipe inteira</option></select></div>
    </div>
    <div class="field" data-destino-pessoa><label for="meta-usuario">Funcionário</label><select id="meta-usuario"><option>Carlos Souza</option><option>Marina Alves</option><option>Rafael Lima</option></select></div>
    <div class="field" data-destino-equipe hidden><label for="meta-equipe">Equipe</label><select id="meta-equipe"><option>Equipe Obras — Bloco A</option><option>Engenharia e Projetos</option></select><span class="hint">Cada membro recebe uma atribuição própria, com progresso independente.</span></div>
    <div class="field"><label for="meta-arquivo">Arquivo (opcional)</label>
      <input type="file" id="meta-arquivo"><span class="hint">PDF, imagem, planilha, executável — qualquer tipo, até 20 MB.</span></div>
    <div class="field"><label for="meta-links">Links (um por linha)</label>
      <textarea id="meta-links" rows="2" placeholder="https://drive.google.com/…"></textarea></div>
  </div>
  <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Criar e atribuir</button></div>
</form></dialog>`;

const painel = shell('painel', 'Painel de Metas', 'Crie metas, atribua e acompanhe o progresso',
  `<div class="row-between" style="margin-bottom:16px">
    <div><h2 style="margin-bottom:2px">Todas as metas</h2><p class="text-sm muted">Você cria e atribui; cada pessoa atualiza o próprio progresso.</p></div>
    <button class="btn btn-primary" type="button" data-modal-abrir="modal-criar-meta">${icon('plus', 16)} Criar meta</button>
  </div>${cards}${barraMetas}${listaMetas}${modalProgresso}${modalCriar}${modaisDetalhe}`);

/* --------------------------------------------------------------- equipe -- */
const funcoes = ['Engenheira civil', 'Mestre de obras', 'Técnico de segurança', 'Arquiteta', 'Auxiliar administrativo', 'Encarregado de almoxarifado'];

const chipsEquipe = `<div class="chips" role="tablist" aria-label="Seções da equipe">
  <a class="chip is-ativo" role="tab" aria-selected="true" href="#">${icon('users', 14)} Equipes <span class="chip-contagem">3</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">${icon('user', 14)} Pessoas <span class="chip-contagem">6</span></a>
  <a class="chip" role="tab" aria-selected="false" href="#">${icon('shield', 14)} Funções <span class="chip-contagem">6</span></a>
</div>`;

const equipesHtml = equipes.map((eq) => `
  <article class="card">
    <div class="card-head"><div style="min-width:0"><h3>${eq.nome}</h3>
      <p class="card-sub">${eq.membros.length} membro(s) · ${eq.concl}/${eq.total} metas concluídas</p></div>
      <button class="btn btn-sm btn-ghost" type="button" data-confirmar="Excluir a equipe ${eq.nome}? As pessoas continuam cadastradas." title="Excluir equipe">${icon('trash', 14)}</button></div>
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:5px"><span>Progresso médio</span><strong>${eq.prog}%</strong></div>
      <div class="progress"><span style="width:${eq.prog}%"></span></div></div>
    <ul class="stack-sm" style="list-style:none;margin:0;padding:0">
      ${eq.membros.map((m, i) => `<li class="row" style="gap:9px">
        <span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">${iniciais(m)}</span>
        <span style="min-width:0;flex:1"><span style="font-size:13px;font-weight:600;display:block">${m}</span>
          <span class="anexo-meta">${funcoes[i % funcoes.length]}</span></span>
        ${i === 0 ? badge('Líder', 'badge-primary') : ''}
        <button class="btn btn-sm btn-ghost" type="button" title="Remover da equipe">${icon('x', 13)}</button>
      </li>`).join('')}
    </ul>
    <form class="row" style="margin-top:12px;flex-wrap:wrap" data-demo-ok="Membro incluído">
      <select aria-label="Pessoa" style="flex:1;min-width:130px"><option>Escolher pessoa…</option><option>Diego Nunes</option><option>Bianca Rocha</option></select>
      <select aria-label="Papel" style="width:104px"><option>Membro</option><option>Líder</option></select>
      <button class="btn btn-sm btn-primary" type="submit">${icon('plus', 14)} Incluir</button>
    </form>
  </article>`).join('');

const pessoas = [
  ['Ana Paula Medeiros', 'ana@ellenco.com.br', 'Administrador(a)', 'Engenharia', 'Engenheira civil', 4, 9],
  ['Carlos Souza', 'carlos@ellenco.com.br', 'Funcionário(a)', 'Obras', 'Mestre de obras', 1, 6],
  ['Marina Alves', 'marina@ellenco.com.br', 'Gestor(a)', 'Engenharia', 'Arquiteta', 2, 4],
  ['Rafael Lima', 'rafael@ellenco.com.br', 'Funcionário(a)', 'Administrativo', 'Auxiliar administrativo', 1, 3],
];

const tabelaPessoas = `<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap">
  <table class="tabela tabela-compacta"><thead><tr>
    <th scope="col">Pessoa</th><th scope="col">Acesso</th><th scope="col">Setor</th>
    <th scope="col">Equipes</th><th scope="col">Metas</th><th scope="col">Função</th></tr></thead><tbody>
    ${pessoas.map(([n, e, a, s, f, eqs, ms]) => `<tr>
      <td data-label="Pessoa"><div class="row" style="gap:9px">
        <span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">${iniciais(n)}</span>
        <span><span style="font-weight:600;display:block">${n}</span><span class="anexo-meta">${e}</span></span></div></td>
      <td data-label="Acesso">${a}</td><td data-label="Setor">${s}</td>
      <td data-label="Equipes">${eqs}</td><td data-label="Metas">${ms}</td>
      <td data-label="Função"><form class="row" style="gap:6px" data-demo-ok="Função atualizada">
        <select aria-label="Função de ${n}" style="width:auto">${funcoes.map((x) => `<option${x === f ? ' selected' : ''}>${x}</option>`).join('')}</select>
        <button class="btn btn-sm" type="submit">Salvar</button></form></td>
    </tr>`).join('')}
  </tbody></table></div></div>${paginacao(1, 1, '1–4 de 4 pessoas')}`;

const listaFuncoes = `<div class="stack-sm">${funcoes.map((f, i) => `<div class="row-between" style="border:1px solid var(--border);border-radius:10px;padding:9px 12px">
  <span class="row" style="gap:8px">${icon('shield', 15)}<strong style="font-size:13px">${f}</strong></span>
  <span class="badge">${[2, 1, 1, 1, 1, 0][i]} pessoa(s)</span></div>`).join('')}</div>`;

const equipe = shell('equipe', 'Equipe', 'Equipes, funções e pessoas',
  `<div class="row-between" style="margin-bottom:14px">
    <div><h2 style="margin-bottom:2px">Equipes</h2><p class="text-sm muted">Crie equipes e inclua pessoas. Cada pessoa recebe as metas da equipe.</p></div>
    <button class="btn btn-primary" type="button" data-modal-abrir="modal-nova-equipe">${icon('plus', 16)} Nova equipe</button>
  </div>
  <div class="row-between" style="margin-bottom:16px">${campoBusca('Buscar equipe, pessoa, e-mail ou função…')}${chipsEquipe}</div>
  <div class="grid grid-2" style="margin-bottom:18px">${equipesHtml}</div>
  ${paginacao(1, 1, '1–3 de 3 equipes')}
  <div class="grid" style="grid-template-columns:minmax(0,1fr);gap:14px;margin-top:18px">
    <section class="card"><div class="card-head"><div><h3>Pessoas</h3><p class="card-sub">Defina a função de cada pessoa no catálogo.</p></div></div>${tabelaPessoas}</section>
    <section class="card"><div class="card-head"><div><h3>Funções</h3><p class="card-sub">Catálogo usado no cadastro e nos relatórios.</p></div></div>${listaFuncoes}</section>
  </div>
  <dialog class="modal" id="modal-nova-equipe"><form class="modal-inner" data-demo-ok="Equipe criada">
    <div class="modal-head"><div><h2>Nova equipe</h2><p class="card-sub">Crie a equipe e já inclua as pessoas.</p></div>
    <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="field"><label for="equipe-nome">Nome</label><input type="text" id="equipe-nome" required placeholder="Ex.: Equipe Obras — Bloco A"></div>
      <div class="field"><label for="equipe-descricao">Descrição (opcional)</label><textarea id="equipe-descricao" placeholder="Responsabilidade da equipe"></textarea></div>
      <div class="field"><label for="equipe-membros">Membros (Ctrl para vários)</label>
        <select id="equipe-membros" multiple size="6"><option>Ana Paula Medeiros</option><option>Carlos Souza</option><option>Marina Alves</option><option>Rafael Lima</option><option>Diego Nunes</option><option>Bianca Rocha</option></select>
        <span class="hint">Depois você pode incluir ou remover pessoas a qualquer momento.</span></div>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Criar equipe</button></div>
  </form></dialog>`);

/* ----------------------------------------------------------- calendário -- */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth();
const primeiro = new Date(ano, mes, 1);
const ultimoDia = new Date(ano, mes + 1, 0).getDate();
const inicioGrade = new Date(ano, mes, 1 - primeiro.getDay());
const fimGrade = new Date(ano, mes, ultimoDia + (6 - new Date(ano, mes, ultimoDia).getDay()));

const detalhesEvento = {
  4:  { titulo: 'Vistoria da estrutura', categoria: 'Fiscalização', local: 'Canteiro — Bloco A', autor: 'Ana Paula Medeiros', criado: '02/11/2026 08:40', participantes: 'Ana Paula, Carlos Souza, engenheiro da fiscalização', link: 'https://drive.google.com/drive/folders/vistoria-nov', desc: 'Vistoria de liberação da armadura antes da concretagem. Levar projeto estrutural revisado (rev. 04), checklist de armadura e EPI completo.' },
  8:  { titulo: 'Reunião de obra', categoria: 'Reunião', local: 'Sala de reuniões', autor: 'Marina Alves', criado: '01/11/2026 16:12', participantes: 'Equipe Obras — Bloco A', link: '', desc: 'Pauta: cronograma da semana, pendências de material e liberação de frente de serviço.' },
  12: { titulo: 'Fiscalização CREA', categoria: 'Fiscalização', local: 'Canteiro — Bloco B', autor: 'Ana Paula Medeiros', criado: '28/10/2026 11:05', participantes: 'Ana Paula, Marina Alves', link: 'https://crea-sp.org.br/art', desc: 'Visita do fiscal do CREA. Conferir ART e diário de obra em dia.' },
  15: { titulo: 'Entrega de material', categoria: 'Manutenção', local: 'Almoxarifado', autor: 'Rafael Lima', criado: '05/11/2026 09:30', participantes: 'Rafael Lima, Diego Nunes', link: '', desc: 'Entrega de 120 sacos de cimento e 30 vergalhões de 10 mm.' },
  19: { titulo: 'Treinamento NR-18', categoria: 'Eventos', local: 'Refeitório', autor: 'Juliana Prado', criado: '06/11/2026 14:20', participantes: 'Todos os colaboradores do canteiro', link: 'https://drive.google.com/file/nr18-apostila', desc: 'Treinamento obrigatório de segurança. Apostila em PDF anexada ao evento.' },
  22: { titulo: 'Conclusão: laje 2º pav.', categoria: 'Meta concluída', local: '', autor: 'Sistema', criado: '22/11/2026 00:05', participantes: '', link: '', desc: 'Evento gerado automaticamente quando a meta foi marcada como 100% concluída.' },
  26: { titulo: 'Reunião com cliente', categoria: 'Reunião', local: 'Escritório central', autor: 'Ana Paula Medeiros', criado: '10/11/2026 10:00', participantes: 'Ana Paula, Marina Alves, cliente', link: '', desc: 'Apresentação do avanço físico-financeiro de novembro.' },
};

let grade = '<div class="cal-grade" role="grid" aria-label="Calendário do mês">' + ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  .map((d) => `<div class="cal-dow" role="columnheader">${d}</div>`).join('');
for (let d = new Date(inicioGrade); d <= fimGrade; d.setDate(d.getDate() + 1)) {
  const fora = d.getMonth() !== mes;
  const ehHoje = d.toDateString() === hoje.toDateString();
  const evs = d.getMonth() === mes ? (eventos[d.getDate()] || []) : [];
  grade += `<div class="cal-dia${fora ? ' is-fora' : ''}${ehHoje ? ' is-hoje' : ''}" role="gridcell"><div class="cal-num">${d.getDate()}</div>`
    + evs.map((e) => `<button type="button" class="cal-evento" style="--cor:${e.c}" data-modal-abrir="modal-evento-${d.getDate()}"><span class="cal-hora">${e.h}</span><span class="cal-titulo">${e.t}</span></button>`).join('')
    + `</div>`;
}
grade += '</div>';

const proximos = [
  ['08/11', '14:00', 'Reunião de obra', 'Reunião'],
  ['12/11', '09:30', 'Fiscalização CREA', 'Fiscalização'],
  ['15/11', '10:00', 'Entrega de material', 'Manutenção'],
  ['19/11', '16:00', 'Treinamento NR-18', 'Eventos'],
];

const modaisEvento = Object.keys(detalhesEvento).map((dia) => {
  const ev = detalhesEvento[dia];
  return `<dialog class="modal modal-largo" id="modal-evento-${dia}" aria-labelledby="titulo-evento-${dia}">
    <div class="modal-inner">
      <div class="modal-head"><div><h2 id="titulo-evento-${dia}">Evento</h2><p class="card-sub">${ev.titulo}</p></div>
        <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
      <div class="modal-body stack">
        <div class="detalhe-topo">
          <div class="row">${badge(ev.categoria, 'badge-info')}${badge('Todos', '')}</div>
          <h3 class="detalhe-titulo">${ev.titulo}</h3>
          <p class="detalhe-sub">${dia}/${String(mes + 1).padStart(2, '0')}/${ano} às ${(eventos[Number(dia)] || [{ h: '09:00' }])[0].h}</p>
        </div>
        <section class="detalhe-secao"><h3>Informações</h3><dl class="info-lista">
          <dt>${icon('user', 14)} Criado por</dt><dd>${ev.autor}</dd>
          <dt>${icon('clock', 14)} Criado em</dt><dd>${ev.criado}</dd>
          ${ev.local ? `<dt>${icon('mapPin', 14)} Local</dt><dd>${ev.local}</dd>` : ''}
          ${ev.participantes ? `<dt>${icon('users', 14)} Participantes</dt><dd>${ev.participantes}</dd>` : ''}
          <dt>${icon('shield', 14)} Visibilidade</dt><dd>Todos</dd>
        </dl></section>
        <section class="detalhe-secao"><h3>Descrição</h3><div class="descricao-rica"><p>${ev.desc}</p></div></section>
        ${ev.link ? `<section class="detalhe-secao"><h3>Link</h3>
          <a class="anexo anexo-link" href="#"><span class="anexo-icone">${icon('link', 17)}</span>
            <span style="min-width:0"><span class="anexo-nome">${ev.link}</span><span class="anexo-meta">Abrir em nova aba</span></span>
            <span class="anexo-tag">Link</span></a></section>` : ''}
      </div>
      <div class="modal-foot"><button class="btn" type="button" data-modal-close>Fechar</button>
        <button class="btn btn-danger" type="button" data-confirmar="Excluir este evento?">${icon('trash', 14)} Excluir</button></div>
    </div>
  </dialog>`;
}).join('');

const calendario = shell('calendario', 'Calendário', 'Eventos da empresa, das equipes e seus',
  `<div class="row-between" style="margin-bottom:14px">${campoBusca('Buscar evento por título, descrição ou local…')}
    <button class="btn btn-primary" type="button" data-modal-abrir="modal-criar-evento">${icon('plus', 16)} Novo evento</button></div>
  <section class="card" style="padding:0;overflow:hidden;margin-bottom:16px" aria-label="Calendário">
    <div class="cal-head">
      <button class="icon-btn" type="button" aria-label="Mês anterior">${icon('chevronLeft', 18)}</button>
      <div class="cal-titulo-mes"><h2>${MESES[mes]} de ${ano}</h2><a href="#" style="font-size:11.5px">Hoje</a></div>
      <button class="icon-btn" type="button" aria-label="Próximo mês">${icon('chevronRight', 18)}</button>
    </div>
    ${grade}
    <div style="padding:12px 16px;border-top:1px solid var(--border)"><div class="chart-legend">
      <span><i style="background:var(--chart-1)"></i>Reunião</span>
      <span><i style="background:var(--chart-2)"></i>Fiscalização</span>
      <span><i style="background:var(--chart-4)"></i>Manutenção</span>
      <span><i style="background:var(--chart-3)"></i>Eventos</span>
      <span><i style="background:var(--success)"></i>Meta concluída</span>
    </div></div>
  </section>
  <div class="grid grid-2">
    <section class="card"><div class="card-head"><div><h3>Próximos eventos</h3><p class="card-sub">Clique para ver os detalhes.</p></div>
      <a class="btn btn-sm" href="alertas.html">${icon('bell', 14)} Avisos</a></div>
      <div class="agenda">${proximos.map(([d, h, t, c]) => `<div class="agenda-item"><div class="agenda-data"><span>${d}</span><small>${h}</small></div><div style="min-width:0"><p class="agenda-titulo">${t}</p><p class="agenda-sub">${c}</p></div></div>`).join('')}</div>
    </section>
    <section class="card"><div class="card-head"><div><h3>Resumo do mês</h3><p class="card-sub">Eventos visíveis para você neste mês.</p></div></div>
      <div class="metric"><span class="metric-value">7</span><span class="metric-hint">eventos no mês</span></div></section>
  </div>
  <dialog class="modal" id="modal-criar-evento"><form class="modal-inner" data-demo-ok="Evento criado">
    <div class="modal-head"><div><h2>Novo evento</h2><p class="card-sub">Escolha para quem o evento aparece.</p></div>
    <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="field"><label for="ev-titulo">Título</label><input type="text" id="ev-titulo" required placeholder="Ex.: Vistoria da estrutura"></div>
      <div class="grid grid-2">
        <div class="field"><label for="ev-inicio">Início</label><input type="datetime-local" id="ev-inicio"></div>
        <div class="field"><label for="ev-fim">Fim (opcional)</label><input type="datetime-local" id="ev-fim"></div></div>
      <div class="grid grid-2">
        <div class="field"><label for="ev-categoria">Categoria</label><select id="ev-categoria"><option>Reunião</option><option>Fiscalização</option><option>Manutenção</option><option>Eventos</option><option>Outros</option></select></div>
        <div class="field"><label for="ev-local">Local</label><input type="text" id="ev-local" placeholder="Ex.: Canteiro — Bloco A"></div></div>
      <div class="field"><label for="ev-escopo">Visibilidade</label>
        <select id="ev-escopo" data-destino><option value="geral" selected>Todos</option><option value="equipe">Uma equipe</option><option value="pessoa">Uma pessoa</option></select></div>
      <div class="field" data-destino-equipe hidden><label for="ev-equipe">Equipe</label>
        <select id="ev-equipe"><option>Equipe Obras — Bloco A</option><option>Engenharia e Projetos</option></select></div>
      <div class="field" data-destino-pessoa hidden><label for="ev-pessoa">Pessoa</label>
        <select id="ev-pessoa"><option>Carlos Souza</option><option>Marina Alves</option><option>Rafael Lima</option></select></div>
      <div class="field"><label for="ev-participantes">Participantes</label><input type="text" id="ev-participantes" placeholder="Nomes separados por vírgula"></div>
      <div class="field"><label for="ev-link">Link (opcional)</label><input type="url" id="ev-link" placeholder="https://…"></div>
      <div class="field"><label for="ev-descricao">Descrição</label><textarea id="ev-descricao" placeholder="Pauta, responsável, observações…"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Criar evento</button></div>
  </form></dialog>
  ${modaisEvento}`);

/* -------------------------------------------------------------- alertas -- */
const alertas = shell('alertas', 'Alertas', 'Avisos, prazos e eventos próximos',
  `<div class="row-between" style="margin-bottom:14px">
    <div><h2 style="margin-bottom:2px">Alertas</h2><p class="text-sm muted">3 não lido(s)</p></div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn btn-sm btn-primary" href="#">Não lidas</a><a class="btn btn-sm" href="#">Todas</a>
      <button class="btn btn-sm" type="button" data-demo-ok="Todos os avisos marcados como lidos">${icon('check', 14)} Marcar todas</button></div>
  </div>
  <div style="margin-bottom:14px">${campoBusca('Buscar aviso por título ou mensagem…')}</div>
  <div class="grid grid-3" style="align-items:start">
    <div style="grid-column:span 2;display:flex;flex-direction:column;gap:10px">
      ${[
        ['Meta atrasada', 'Fechamento do orçamento trimestral passou do prazo em 08/11.', 'Alerta', 'badge-warning'],
        ['Nova meta atribuída', 'Inspeção de segurança do canteiro foi atribuída a você.', 'Meta', 'badge-primary'],
        ['Evento amanhã', 'Vistoria da estrutura às 08:00 no Bloco A.', 'Evento', 'badge-info'],
      ].map(([t, m, tipo, cls]) => `<article class="card" style="padding:14px">
        <div class="card-head" style="margin-bottom:6px"><div style="min-width:0"><h3 style="font-size:14px">${t}</h3>
          <p class="card-sub">19/11/2026 09:12</p></div><span class="badge ${cls}">${tipo}</span></div>
        <p class="text-sm muted" style="margin-bottom:10px">${m}</p>
        <div class="row" style="gap:6px"><a class="btn btn-sm" href="painel.html">Abrir ${icon('chevronRight', 13)}</a>
          <button class="btn btn-sm btn-ghost" type="button" data-demo-ok="Aviso marcado como lido">${icon('check', 13)} Marcar como lida</button></div></article>`).join('')}
      ${paginacao(1, 2, '1–15 de 27 avisos')}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <section class="card"><div class="card-head"><h3>Próximos 7 dias</h3></div>
        <div class="agenda">${proximos.slice(0, 3).map(([d, h, t]) => `<div class="agenda-item"><div class="agenda-data"><span>${d}</span><small>${h}</small></div><div style="min-width:0"><p class="agenda-titulo">${t}</p></div></div>`).join('')}</div></section>
      <section class="card"><div class="card-head"><h3>Metas atrasadas</h3></div>
        <div class="agenda"><div class="agenda-item"><div class="agenda-data is-atrasado"><span>08/11</span><small>prazo</small></div><div style="min-width:0"><p class="agenda-titulo">Fechamento do orçamento</p><p class="agenda-sub">40% concluído</p></div></div></div></section>
    </div>
  </div>`);

/* -------------------------------------------------------- configurações -- */
const secoesConfig = [
  ['perfil', 'Perfil', 'user', 'Seu nome e como você aparece.', 'Conta'],
  ['usuarios', 'Usuários e acessos', 'shield', 'Criar, editar e redefinir senhas.', 'Administração'],
  ['senha', 'Redefinir senha', 'lock', 'Trocar a senha de acesso.', ''],
  ['aparencia', 'Aparência', 'palette', 'Tema claro ou escuro.', ''],
  ['sobre', 'Sobre', 'info', 'Versão e saúde do sistema.', ''],
];

const menuConfig = `<nav class="lista-menu" aria-label="Seções das configurações">${secoesConfig.map(([k, l, i, d, sep]) =>
  `${sep ? `<div class="lista-menu-sep">${sep}</div>` : ''}
   <button type="button" class="lista-menu-item${k === 'perfil' ? ' is-active' : ''}" data-secao="${k}" aria-current="${k === 'perfil' ? 'true' : 'false'}">
     <span class="lista-menu-icone">${icon(i, 16)}</span>
     <span style="min-width:0"><span style="display:block">${l}</span><span class="anexo-meta">${d}</span></span></button>`).join('')}</nav>`;

const painelPerfil = `<section class="painel-secao card is-ativa" data-secao-painel="perfil" aria-labelledby="titulo-perfil">
  <div class="card-head"><div><h2 id="titulo-perfil">Perfil</h2><p class="card-sub">Como você aparece no sistema.</p></div></div>
  <div class="row" style="gap:14px;margin-bottom:16px">
    <span class="avatar" style="width:52px;height:52px;font-size:18px" aria-hidden="true">${iniciais(usuario.nome)}</span>
    <div style="min-width:0"><div style="font-weight:700;font-size:15px">${usuario.nome}</div><div class="text-sm muted">${usuario.email}</div></div></div>
  <form class="stack" data-demo-ok="Perfil atualizado">
    <div class="field"><label for="perfil-nome">Nome</label><input type="text" id="perfil-nome" value="${usuario.nome}"></div>
    <div class="grid grid-2">
      <div class="field"><label for="perfil-funcao">Função</label><input type="text" id="perfil-funcao" value="${usuario.funcao}" disabled></div>
      <div class="field"><label for="perfil-setor">Setor</label><input type="text" id="perfil-setor" value="Engenharia" disabled></div></div>
    <p class="hint">E-mail, setor e nível de acesso só podem ser alterados por um administrador.</p>
    <div><button class="btn btn-primary" type="submit">Salvar perfil</button></div></form></section>`;

const painelUsuarios = `<section class="painel-secao card" data-secao-painel="usuarios" aria-labelledby="titulo-usuarios">
  <div class="card-head"><div><h2 id="titulo-usuarios">Usuários e acessos</h2>
    <p class="card-sub">4 conta(s). Só administradoras veem esta seção.</p></div>
    <button class="btn btn-primary btn-sm" type="button" data-modal-abrir="modal-novo-usuario">${icon('userPlus', 14)} Novo usuário</button></div>
  <div class="row-between" style="margin-bottom:12px">${campoBusca('Buscar por nome ou e-mail…')}
    <div class="chips"><a class="chip is-ativo" href="#">Todos</a><a class="chip" href="#">Ativos</a><a class="chip" href="#">Inativos</a><a class="chip" href="#">Administradores</a></div></div>
  <div class="table-wrap"><table class="tabela tabela-compacta"><thead><tr>
    <th scope="col">Pessoa</th><th scope="col">Acesso</th><th scope="col">Setor</th>
    <th scope="col">Situação</th><th scope="col">Metas</th><th scope="col">Ações</th></tr></thead><tbody>
    ${pessoas.map(([n, e, a, s, , eqs, ms]) => `<tr>
      <td data-label="Pessoa"><div class="row" style="gap:9px">
        <span class="avatar" style="width:28px;height:28px;font-size:10.5px" aria-hidden="true">${iniciais(n)}</span>
        <span style="min-width:0"><span style="font-weight:600;display:block">${n}</span><span class="anexo-meta">${e}</span></span></div></td>
      <td data-label="Acesso">${badge(a, a.startsWith('Admin') ? 'badge-primary' : '')}</td>
      <td data-label="Setor">${s}</td>
      <td data-label="Situação">${badge('Ativo', 'badge-success')}</td>
      <td data-label="Metas">${ms} · ${eqs} equipe(s)</td>
      <td data-label="Ações" class="celula-acoes">
        <button class="btn btn-sm" type="button" data-modal-abrir="modal-usuario">${icon('edit', 13)} Editar</button>
        <button class="btn btn-sm" type="button" data-modal-abrir="modal-senha">${icon('lock', 13)}</button></td></tr>`).join('')}
  </tbody></table></div>${paginacao(1, 1, '1–4 de 4 contas')}</section>`;

const painelSenha = `<section class="painel-secao card" data-secao-painel="senha" aria-labelledby="titulo-senha">
  <div class="card-head"><div><h2 id="titulo-senha">Redefinir senha</h2>
    <p class="card-sub">Mínimo de 8 caracteres. Você continua conectado após a troca.</p></div></div>
  <form class="stack" data-demo-ok="Senha alterada">
    <div class="field"><label for="s1">Senha atual</label><input type="password" id="s1" autocomplete="current-password"></div>
    <div class="grid grid-2">
      <div class="field"><label for="s2">Nova senha</label><input type="password" id="s2" autocomplete="new-password"></div>
      <div class="field"><label for="s3">Repita a nova senha</label><input type="password" id="s3" autocomplete="new-password"></div></div>
    <div><button class="btn btn-primary" type="submit">Alterar senha</button></div></form></section>`;

const painelAparencia = `<section class="painel-secao card" data-secao-painel="aparencia" aria-labelledby="titulo-aparencia">
  <div class="card-head"><div><h2 id="titulo-aparencia">Aparência</h2><p class="card-sub">A preferência fica salva neste navegador.</p></div></div>
  <div class="row" style="gap:8px">
    <button class="btn" type="button" data-tema="light">${icon('sun', 15)} Claro</button>
    <button class="btn" type="button" data-tema="dark">${icon('moon', 15)} Escuro</button></div></section>`;

const painelSobre = `<section class="painel-secao card" data-secao-painel="sobre" aria-labelledby="titulo-sobre">
  <div class="card-head"><div><h2 id="titulo-sobre">Sobre</h2>
    <p class="card-sub">Ellenco Construções — sistema de metas e equipes.</p></div></div>
  <dl class="info-lista">
    <dt>Versão</dt><dd>1.0 — metas por pessoa, equipes e anexos</dd>
    <dt>Banco</dt><dd>PostgreSQL / Supabase</dd>
    <dt>Servidor</dt><dd>PHP 8.3</dd>
    <dt>Saúde</dt><dd><a href="#">Verificar agora</a></dd></dl></section>`;

const config = shell('config', 'Configurações', 'Perfil, senha, usuários e aparência',
  `<div class="duas-colunas">${menuConfig}
    <div>${painelPerfil}${painelUsuarios}${painelSenha}${painelAparencia}${painelSobre}</div>
  </div>
  <dialog class="modal" id="modal-novo-usuario"><form class="modal-inner" data-demo-ok="Usuário criado">
    <div class="modal-head"><div><h2>Novo usuário</h2><p class="card-sub">A pessoa já entra com a senha definida aqui.</p></div>
      <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="field"><label for="novo-nome">Nome</label><input type="text" id="novo-nome" required></div>
      <div class="field"><label for="novo-email">E-mail</label><input type="email" id="novo-email" required></div>
      <div class="field"><label for="novo-senha">Senha inicial</label><input type="password" id="novo-senha" minlength="8" required>
        <span class="hint">Mínimo de 8 caracteres. Peça para a pessoa trocar no primeiro acesso.</span></div>
      <div class="grid grid-2">
        <div class="field"><label for="novo-acesso">Acesso</label><select id="novo-acesso"><option>Funcionário(a)</option><option>Gestor(a)</option><option>Administrador(a)</option></select></div>
        <div class="field"><label for="novo-setor">Setor</label><select id="novo-setor"><option>—</option><option>Engenharia</option><option>Administrativo</option><option>Obras</option></select></div></div>
      <div class="field"><label for="novo-funcao">Função</label><select id="novo-funcao">${funcoes.map((f) => `<option>${f}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Criar usuário</button></div>
  </form></dialog>
  <dialog class="modal" id="modal-usuario"><form class="modal-inner" data-demo-ok="Usuário atualizado">
    <div class="modal-head"><div><h2>Editar usuário</h2><p class="card-sub">carlos@ellenco.com.br</p></div>
      <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="field"><label for="u-nome">Nome</label><input type="text" id="u-nome" value="Carlos Souza"></div>
      <div class="field"><label for="u-email">E-mail</label><input type="email" id="u-email" value="carlos@ellenco.com.br"></div>
      <div class="grid grid-2">
        <div class="field"><label for="u-acesso">Acesso</label><select id="u-acesso"><option>Funcionário(a)</option><option>Gestor(a)</option><option>Administrador(a)</option></select></div>
        <div class="field"><label for="u-setor">Setor</label><select id="u-setor"><option>—</option><option>Engenharia</option><option>Administrativo</option><option selected>Obras</option></select></div></div>
      <div class="field"><label for="u-funcao">Função</label><select id="u-funcao">${funcoes.map((f) => `<option${f === 'Mestre de obras' ? ' selected' : ''}>${f}</option>`).join('')}</select></div>
      <label class="row" style="gap:8px;font-size:13px"><input type="checkbox" checked style="width:auto;min-height:0"> Conta ativa (desmarcar impede o login)</label>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
  </form></dialog>
  <dialog class="modal" id="modal-senha"><form class="modal-inner" data-demo-ok="Senha redefinida">
    <div class="modal-head"><div><h2>Redefinir senha</h2><p class="card-sub">Nova senha de Carlos Souza</p></div>
      <button class="icon-btn" type="button" data-modal-close aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="modal-body stack">
      <div class="field"><label for="senha-u">Nova senha</label><input type="password" id="senha-u" minlength="8">
        <span class="hint">A pessoa será avisada pelo sino de notificações.</span></div>
    </div>
    <div class="modal-foot"><button class="btn" type="button" data-modal-close>Cancelar</button><button class="btn btn-primary" type="submit">Redefinir</button></div>
  </form></dialog>`);

/* ------------------------------------------------------------- escrever -- */
const paginas = { painel, equipe, calendario, alertas, config };
for (const [nome, html] of Object.entries(paginas)) {
  fs.writeFileSync(path.join(out, `${nome}.html`), html, 'utf8');
}
fs.writeFileSync(path.join(out, 'index.html'), painel, 'utf8');

for (const f of ['login.html', 'cadastro.html']) {
  const src = fs.readFileSync(path.join(raiz, f), 'utf8').replace('<!--mensagens-->', '');
  fs.writeFileSync(path.join(out, f), src, 'utf8');
}

/* demo.js — só para a pré-visualização responder aos cliques */
const demo = `
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-abrir-progresso]');
  if (t) {
    document.getElementById('progresso-atribuicao').value = t.dataset.abrirProgresso;
    document.querySelector('[data-progresso-titulo]').textContent = t.dataset.titulo;
    document.getElementById('progresso-valor').value = t.dataset.progresso;
    Ellenco.abrirModal('modal-progresso', t);
  }
  var c = e.target.closest('[data-cmd]');
  if (c) {
    var cmd = c.dataset.cmd;
    if (cmd.indexOf('formatBlock:') === 0) document.execCommand('formatBlock', false, 'h3');
    else document.execCommand(cmd, false, null);
  }
  var b = e.target.closest('[data-confirmar]');
  if (b) {
    e.preventDefault();
    Ellenco.confirmar({ titulo: 'Confirmar ação', mensagem: b.dataset.confirmar, textoOk: 'Confirmar',
      perigoso: true, gatilho: b, onOk: function () { Ellenco.toast('Ação confirmada (demonstração).', 'success'); } });
  }
  var d = e.target.closest('[data-demo-ok]');
  if (d && e.target.type === 'submit') {
    e.preventDefault();
    var dlg = d.closest('dialog');
    if (dlg) Ellenco.fecharModal(dlg.id);
    Ellenco.toast(d.dataset.demoOk + ' (demonstração).', 'success');
  }
});
// [data-destino] já é tratado pelo assets/app.js (por formulário).
`;
fs.writeFileSync(path.join(out, 'demo.js'), demo, 'utf8');

console.log('pré-visualização gerada em', out);
