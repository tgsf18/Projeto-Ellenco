import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Boxes, ClipboardCheck, HardHat, PackageCheck, ShieldAlert } from 'lucide-react'
import './alerts-center.css'

type AppView = 'receipts' | 'stock' | 'epi'
type AlertRecord = { title: string; route: string }
type Urgency = 'Crítica' | 'Alta' | 'Atenção' | 'Rotina'

function moduleFor(route: string): { key: AppView; label: string; Icon: typeof Boxes } {
  if (route.includes('estoque')) return { key: 'stock', label: 'Estoque', Icon: Boxes }
  if (route.includes('receb')) return { key: 'receipts', label: 'Recebimentos', Icon: PackageCheck }
  return { key: 'epi', label: 'EPIs', Icon: HardHat }
}

function urgencyFor(alert: AlertRecord, module: AppView): Urgency {
  const text = alert.title.toLocaleLowerCase('pt-BR')
  if (/vencid|expirad|fora da validade/.test(text)) return 'Crítica'
  if (/próxim|proxim|vencendo|troca/.test(text)) return 'Alta'
  if (module === 'epi' && /assinatura|aguardando/.test(text)) return 'Alta'
  if (/abaixo|mínimo|minimo|aguardando|pendente/.test(text)) return 'Atenção'
  return 'Rotina'
}

function urgencyClass(value: Urgency): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export default function AlertsCenter({ data, onNavigate }: { data: any; onNavigate: (view: AppView) => void }) {
  const [urgency, setUrgency] = useState('Todas')
  const [module, setModule] = useState('Todos')
  const alerts: AlertRecord[] = data?.alerts || []
  const rows = useMemo(() => alerts.map((alert, index) => {
    const target = moduleFor(alert.route || '')
    return { ...alert, id: `${alert.route}-${alert.title}-${index}`, target, urgency: urgencyFor(alert, target.key) }
  }).filter(alert => (urgency === 'Todas' || alert.urgency === urgency) && (module === 'Todos' || alert.target.key === module)), [alerts, module, urgency])
  const criticalCount = alerts.filter(alert => urgencyFor(alert, moduleFor(alert.route || '').key) === 'Crítica').length

  return <section className="alerts-center page-enter">
    <div className="alerts-center-heading">
      <div><p className="eyebrow">ACOMPANHAMENTO OPERACIONAL</p><h1>Central de alertas</h1><p>Priorize pendências e abra diretamente o módulo que precisa de ação.</p></div>
      <div className={`alerts-summary ${criticalCount ? 'has-critical' : ''}`}><ShieldAlert size={20}/><span><b>{alerts.length}</b> pendência(s) ativa(s)</span></div>
    </div>

    <div className="alerts-filters" aria-label="Filtros de alertas">
      <label>Urgência<select value={urgency} onChange={event => setUrgency(event.target.value)}><option>Todas</option><option>Crítica</option><option>Alta</option><option>Atenção</option><option>Rotina</option></select></label>
      <label>Módulo<select value={module} onChange={event => setModule(event.target.value)}><option value="Todos">Todos os módulos</option><option value="stock">Estoque</option><option value="epi">EPIs</option><option value="receipts">Recebimentos</option></select></label>
    </div>

    <div className="alerts-list" aria-live="polite">
      {rows.map(alert => { const Icon = alert.urgency === 'Crítica' ? AlertTriangle : alert.target.key === 'epi' ? HardHat : alert.target.key === 'stock' ? Boxes : ClipboardCheck
        return <article key={alert.id} className={`alert-row urgency-${urgencyClass(alert.urgency)}`}>
          <span className="alert-row-icon"><Icon size={21}/></span>
          <div className="alert-row-content"><div className="alert-row-meta"><span className="alert-module-label"><alert.target.Icon size={14}/>{alert.target.label}</span><span className="alert-urgency-label">{alert.urgency}</span></div><h2>{alert.title}</h2><p>{alert.urgency === 'Crítica' ? 'Ação prioritária: verifique a validade e regularize o item.' : alert.target.key === 'epi' ? 'Confira a situação do EPI e conclua a entrega ou assinatura.' : alert.target.key === 'stock' ? 'Revise o saldo, o lote e a necessidade de reposição.' : 'Conclua a conferência para atualizar o estoque.'}</p></div>
          <button className="alert-open-button" onClick={() => onNavigate(alert.target.key)}>Abrir módulo <ArrowRight size={16}/></button>
        </article>
      })}
      {!rows.length && <div className="alerts-empty"><span><ShieldAlert size={25}/></span><b>{alerts.length ? 'Nenhum alerta corresponde aos filtros.' : 'Nenhuma pendência operacional.'}</b><p>{alerts.length ? 'Altere os filtros para ver outros alertas.' : 'Novos alertas aparecerão aqui quando houver uma ação necessária.'}</p></div>}
    </div>
  </section>
}
