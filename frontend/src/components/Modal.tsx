import { ReactNode } from 'react'

export default function Modal({ open = true, title, onClose, children }: { open?: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><header><h2>{title}</h2><button className="modal-close" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>
}
