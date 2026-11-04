import { useEffect, useState } from 'react'
import Modal from './Modal'
import { QrTarget, qrTargetUrl } from '../utils/qrDestination'

export default function QrCodeDialog({ target, title, code, onClose }: {
  target: QrTarget | null
  title: string
  code: string
  onClose: () => void
}) {
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  const url = target ? qrTargetUrl(target) : ''

  useEffect(() => {
    let active = true
    setImage('')
    setError('')
    if (url) import('qrcode').then(({ toDataURL }) => toDataURL(url, { width: 360, margin: 2, errorCorrectionLevel: 'M' }))
      .then(value => { if (active) setImage(value) })
      .catch(() => { if (active) setError('Não foi possível gerar o QR Code.') })
    return () => { active = false }
  }, [url])

  return <Modal open={!!target} title="QR Code de identificação" onClose={onClose}>
    <div className="qr-dialog-content">
      <div className="qr-item-heading"><strong>{title}</strong><span>{code}</span></div>
      {image ? <img className="qr-code-image" src={image} alt={`QR Code para abrir ${title}`} /> : <p className="form-hint">{error || 'Gerando QR Code…'}</p>}
      <p className="form-hint">Ao ler, o sistema abre este registro consultando o banco de dados. É necessário entrar na plataforma.</p>
      {url && <code className="qr-link-text">{url}</code>}
      {image && <a className="primary-button qr-download" href={image} download={`ellenco-${target?.kind}-${code || target?.id}.png`}>Baixar QR Code PNG</a>}
    </div>
  </Modal>
}
