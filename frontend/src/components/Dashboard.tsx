import { Activity, Boxes, ClipboardCheck, HardHat, PackageCheck, ShieldAlert, Timer, UsersRound } from 'lucide-react'
import ModuleMetrics from './ModuleMetrics'

type View = 'receipts' | 'stock' | 'epi' | 'alerts'
type Props = { data: any; onNavigate: (v: View) => void }
const names: Record<string,string> = { recebimentosPendentes:'Recebimentos pendentes',conferenciasPendentes:'Conferências em andamento',distribuicoesEmAndamento:'Entregas de EPI',episAguardandoEntrega:'EPIs pendentes',estoquesBaixoMinimo:'Estoque baixo',assinaturasPendentes:'Assinaturas pendentes',materiaisVencendo:'Materiais vencendo',episVencendo:'EPIs vencendo' }
const icons: Record<string,React.ReactNode> = { recebimentosPendentes:<PackageCheck/>,conferenciasPendentes:<ClipboardCheck/>,distribuicoesEmAndamento:<HardHat/>,episAguardandoEntrega:<Timer/>,estoquesBaixoMinimo:<Boxes/>,assinaturasPendentes:<UsersRound/>,materiaisVencendo:<Activity/>,episVencendo:<ShieldAlert/> }

export default function Dashboard({data,onNavigate}:Props) {
  const summary=data?.summary||{}, alerts=data?.alerts||[], history:any[]=data?.history||[]
  const max=Math.max(1,...history.map(x=>Number(x.movements)+Number(x.receipts)))
  const hasHistory=history.some(x=>Number(x.movements)+Number(x.receipts)>0)
  const metrics=Object.entries(summary).slice(0,8).map(([key,value])=>({label:names[key]||key,value:String(value),detail:key.endsWith('30Dias')?'Atividade nos últimos 30 dias':'Situação atual',icon:icons[key]||<Activity/>,tone:/venc|baixo|pendente/i.test(key)?'amber' as const:'blue' as const}))
  return <section className="space-y-6">
    <div className="dashboard-heading"><div><p className="eyebrow">CENTRAL OPERACIONAL</p><h1>Dashboard da operação</h1><p>Acompanhe desempenho, riscos e prioridades com dados gravados no sistema.</p></div><span className="dashboard-period-label">Resumo consolidado · atividade dos últimos 30 dias</span></div>
    <ModuleMetrics items={metrics}/>
    <section className="performance-grid">
      <article className="performance-card history-card"><div><p className="eyebrow">HISTÓRICO REAL · 30 DIAS</p><h2>Movimentações e recebimentos</h2></div>{hasHistory?<div className="history-bars">{history.map(x=><div className="history-day" key={x.date} title={`${new Date(x.date+'T00:00:00').toLocaleDateString('pt-BR')}: ${x.movements} movimentações, ${x.receipts} recebimentos`}><i style={{height:`${Math.max(4,(Number(x.movements)+Number(x.receipts))/max*100)}%`}}/><small>{new Date(x.date+'T00:00:00').getDate()}</small></div>)}</div>:<div className="dashboard-clear">Ainda não há operações acumuladas para formar o gráfico histórico.</div>}<div className="chart-legend"><span><i className="executed-dot"/> Dados registrados no sistema</span></div></article>
      <article className="performance-card"><div><p className="eyebrow">BASE OPERACIONAL</p><h2>Volume consolidado</h2></div><div className="progress-comparison"><div><span>Movimentações em 30 dias <b>{summary.movimentacoes30Dias||0}</b></span></div><div><span>Inventários realizados <b>{summary.inventarios||0}</b></span></div><div><span>Empréstimos ativos <b>{summary.emprestimosAtivos||0}</b></span></div></div><p className="chart-note">Indicadores derivados exclusivamente das operações salvas.</p></article>
    </section>
    <button className="dashboard-alerts-link" onClick={() => onNavigate('alerts')}><span className="dashboard-alerts-icon"><ShieldAlert size={21}/></span><span><b>Central de alertas</b><small>{alerts.length ? `${alerts.length} pendência(s) · filtre por urgência e módulo` : 'Nenhuma pendência operacional no momento'}</small></span><span className="dashboard-alerts-arrow">Abrir central →</span></button>
  </section>
}
