import { ReactNode } from 'react'
import './module-metrics.css'

export type ModuleMetric = { label: string; value: string | number; detail: string; icon: ReactNode; tone?: 'blue' | 'red' | 'amber' | 'green' }

export default function ModuleMetrics({ items }: { items: ModuleMetric[] }) {
  return <section className="module-metrics" aria-label="Indicadores do módulo">
    {items.map(item => <article className={`module-metric tone-${item.tone || 'blue'}`} key={item.label}>
      <span className="module-metric-icon" aria-hidden="true">{item.icon}</span>
      <span className="module-metric-copy"><small>{item.label}</small><strong>{item.value}</strong><em>{item.detail}</em></span>
    </article>)}
  </section>
}
