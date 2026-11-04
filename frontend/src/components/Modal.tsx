import { ReactNode } from 'react'

export default function Modal({ open = true, title, onClose, children, wide = false }: { open?: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className={`modal${wide ? ' modal-wide' : ''}`}><header><h2>{title}</h2><button className="modal-close" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>
}
