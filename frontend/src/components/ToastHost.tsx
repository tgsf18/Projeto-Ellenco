import { useEffect, useState } from 'react'
import { CheckCircle2, TriangleAlert, X } from 'lucide-react'
import './toast-host.css'

type ToastItem = { id: number; type: 'success' | 'warning' | 'error'; message: string; action?: string; view?: string }

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ToastItem>>).detail || {}
      if (!detail.message) return
      const item: ToastItem = {
        id: Date.now() + Math.random(),
        type: detail.type === 'warning' || detail.type === 'error' ? detail.type : 'success',
        message: detail.message,
        action: detail.action,
        view: detail.view
      }
      setItems(current => [...current.slice(-2), item])
      window.setTimeout(() => setItems(current => current.filter(entry => entry.id !== item.id)), 6500)
    }
    window.addEventListener('ellenco:toast', onToast)
    return () => window.removeEventListener('ellenco:toast', onToast)
  }, [])

  function open(item: ToastItem) {
    if (item.view) window.dispatchEvent(new CustomEvent('ellenco:navigate', { detail: item.view }))
    setItems(current => current.filter(entry => entry.id !== item.id))
  }

  return <div className="toast-host" aria-live="polite" aria-relevant="additions">
    {items.map(item => <article className={`app-toast app-toast-${item.type}`} key={item.id} role="status">
      {item.type === 'success' ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
      <div className="app-toast-copy"><strong>{item.type === 'success' ? 'Concluído' : item.type === 'warning' ? 'Atenção' : 'Erro'}</strong><span>{item.message}</span></div>
      {item.action && <button className="app-toast-action" onClick={() => open(item)}>{item.action}</button>}
      <button className="app-toast-close" onClick={() => setItems(current => current.filter(entry => entry.id !== item.id))} aria-label="Fechar aviso"><X size={16} /></button>
    </article>)}
  </div>
}
