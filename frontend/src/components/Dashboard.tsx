import React from 'react'
import { Activity, Boxes, ClipboardCheck, HardHat, PackageCheck, ShieldAlert, Timer, UsersRound } from 'lucide-react'
import ModuleMetrics from './ModuleMetrics'
import TradingChart from './TradingChart'
import './TradingChart.css'

type View = 'receipts' | 'stock' | 'epi' | 'alerts'
type Props = { data: any; onNavigate: (v: View) => void }
const names: Record<string, string> = {
  recebimentosPendentes: 'Recebimentos pendentes',
  conferenciasPendentes: 'Conferências em andamento',
  distribuicoesEmAndamento: 'Entregas de EPI',
  episAguardandoEntrega: 'EPIs pendentes',
  estoquesBaixoMinimo: 'Estoque baixo',
  assinaturasPendentes: 'Assinaturas pendentes',
  materiaisVencendo: 'Materiais vencendo',
  episVencendo: 'EPIs vencendo'
}
const icons: Record<string, React.ReactNode> = {
  recebimentosPendentes: <PackageCheck />,
  conferenciasPendentes: <ClipboardCheck />,
  distribuicoesEmAndamento: <HardHat />,
  episAguardandoEntrega: <Timer />,
  estoquesBaixoMinimo: <Boxes />,
  assinaturasPendentes: <UsersRound />,
  materiaisVencendo: <Activity />,
  episVencendo: <ShieldAlert />
}

export default function Dashboard({ data, onNavigate }: Props) {
  const summary = data?.summary || {}
  const alerts = data?.alerts || []
  const history: any[] = data?.history || []
  const metrics = Object.entries(summary)
    .slice(0, 8)
    .map(([key, value]) => ({
      label: names[key] || key,
      value: String(value),
      detail: key.endsWith('30Dias') ? 'Atividade nos últimos 30 dias' : 'Situação atual',
      icon: icons[key] || <Activity />,
      tone: /venc|baixo|pendente/i.test(key) ? ('amber' as const) : ('blue' as const)
    }))

  return (
    <section className="space-y-6">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">CENTRAL OPERACIONAL</p>
          <h1>Dashboard da operação</h1>
          <p>Acompanhe desempenho, riscos e prioridades com dados gravados no sistema.</p>
        </div>
        <span className="dashboard-period-label">Resumo consolidado · atividade dos últimos 30 dias</span>
      </div>

      <ModuleMetrics items={metrics} />

      <section className="dashboard-performance-layout">
        <div className="trade-chart-container">
          <TradingChart
            data={history}
            title="Movimentações e Recebimentos"
            subtitle="Gráfico histórico em modo de trade com candles, tendências e médias móveis"
          />
        </div>

        <article className="performance-card stats-companion-card">
          <div className="card-top">
            <p className="eyebrow">BASE OPERACIONAL</p>
            <h2>Volume consolidado</h2>
          </div>
          <div className="progress-comparison">
            <div className="stat-progress-item">
              <div className="stat-progress-label">
                <span>Movimentações em 30 dias</span>
                <b>{summary.movimentacoes30Dias || 0}</b>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-blue"
                  style={{ width: `${Math.min(100, Math.max(12, Number(summary.movimentacoes30Dias || 0)))}%` }}
                />
              </div>
            </div>
            <div className="stat-progress-item">
              <div className="stat-progress-label">
                <span>Inventários realizados</span>
                <b>{summary.inventarios || 0}</b>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-emerald"
                  style={{ width: `${Math.min(100, Math.max(12, Number(summary.inventarios || 0) * 10))}%` }}
                />
              </div>
            </div>
            <div className="stat-progress-item">
              <div className="stat-progress-label">
                <span>Empréstimos de ferramentas</span>
                <b>{summary.emprestimosAtivos || 0} ativos</b>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-amber"
                  style={{ width: `${Math.min(100, Math.max(12, Number(summary.emprestimosAtivos || 0) * 15))}%` }}
                />
              </div>
            </div>
          </div>
          <p className="chart-note mt-4">Indicadores derivados exclusivamente das operações salvas no banco.</p>
        </article>
      </section>

      <button className="dashboard-alerts-link" onClick={() => onNavigate('alerts')}>
        <span className="dashboard-alerts-icon">
          <ShieldAlert size={21} />
        </span>
        <span>
          <b>Central de alertas</b>
          <small>
            {alerts.length
              ? `${alerts.length} pendência(s) · filtre por urgência e módulo`
              : 'Nenhuma pendência operacional no momento'}
          </small>
        </span>
        <span className="dashboard-alerts-arrow">Abrir central →</span>
      </button>
    </section>
  )
}
