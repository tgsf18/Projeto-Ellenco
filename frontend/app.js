const state = {
  user: {
    name: 'Administrador',
    role: 'ADMIN'
  },
  dashboard: {
    summary: {
      recebimentosPendentes: 3,
      conferenciasPendentes: 2,
      distribuicoesEmAndamento: 4,
      episAguardandoEntrega: 5,
      estoquesBaixoMinimo: 2,
      assinaturasPendentes: 1
    },
    alerts: [
      { title: '3 recebimentos aguardando conferência', route: '/recebimentos' },
      { title: '5 EPIs aguardando entrega', route: '/epi' },
      { title: '2 estoques abaixo do mínimo', route: '/estoque' }
    ]
  }
};

function renderApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">E</span>
          <span>ELLENCO</span>
        </div>
        <div class="user-pill">
          ${state.user.name} · ${state.user.role}
        </div>
      </header>

      <main class="page">
        <section class="hero-grid">
          <div class="card hero-panel">
            <div class="kicker">Central de Operações</div>
            <h1>O que precisa da sua atenção agora?</h1>
            <p class="lead">
              Plataforma operacional responsável por receber materiais, conferir entregas, registrar EPIs,
              controlar divergências e manter rastreabilidade em cada etapa crítica da operação.
            </p>

            <div class="hero-actions">
              <button class="btn btn-primary">Recebimentos</button>
              <button class="btn btn-secondary">Estoque</button>
              <button class="btn btn-alert">Entregas</button>
            </div>

            <div class="metric-grid">
              <div class="metric">
                <div class="metric-label">Recebimentos pendentes</div>
                <div class="metric-value">${state.dashboard.summary.recebimentosPendentes}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Conferências pendentes</div>
                <div class="metric-value">${state.dashboard.summary.conferenciasPendentes}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Distribuições em andamento</div>
                <div class="metric-value">${state.dashboard.summary.distribuicoesEmAndamento}</div>
              </div>
              <div class="metric">
                <div class="metric-label">EPIs aguardando entrega</div>
                <div class="metric-value">${state.dashboard.summary.episAguardandoEntrega}</div>
              </div>
            </div>
          </div>

          <aside class="card side-panel">
            <div class="kicker">Atenção imediata</div>
            <div class="alert-list">
              ${state.dashboard.alerts.map((alert) => `
                <div class="alert-item">
                  <span>${alert.title}</span>
                  <span class="badge">→</span>
                </div>
              `).join('')}
            </div>
          </aside>
        </section>

        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Operações do dia</h2>
            <span class="status ok">Sistema ativo</span>
          </div>

          <div class="operations-grid">
            <div class="card operation">
              <h3>Recebimentos</h3>
              <p>Conferência de materiais, documentos e fotos com rastreabilidade.</p>
            </div>
            <div class="card operation">
              <h3>Estoque</h3>
              <p>Controle de itens, validade, lote e estoque mínimo por galpão.</p>
            </div>
            <div class="card operation">
              <h3>EPI</h3>
              <p>Entregas, confirmação do funcionário, assinatura e condições do item.</p>
            </div>
            <div class="card operation">
              <h3>Auditoria</h3>
              <p>Histórico de ações críticas, divergências e comprovação operacional.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
}

renderApp();
