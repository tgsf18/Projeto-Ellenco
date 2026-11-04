import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'

export default function CameraScanner({ onRead, onClose }: { onRead: (value: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const callbacks = useRef({ onRead, onClose })
  const [error, setError] = useState('')
  callbacks.current = { onRead, onClose }

  useEffect(() => {
    let controls: IScannerControls | undefined
    let active = true
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador não permite acessar a câmera. Abra o link em um navegador atualizado ou digite o código no campo de busca.')
        return
      }
      if (!video.current) return
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (!active || !video.current) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromVideoDevice(undefined, video.current, (result) => {
          if (!active || !result) return
          active = false
          callbacks.current.onRead(result.getText())
          callbacks.current.onClose()
        })
        if (!active) controls.stop()
      } catch {
        if (active) setError('Não foi possível iniciar a câmera. Verifique a permissão e use HTTPS para fazer a leitura.')
      }
    }
    void start()

    return () => {
      active = false
      controls?.stop()
    }
  }, [])

  return <div className="scanner-overlay"><div><video ref={video} muted playsInline/><span className="scanner-frame"/><p>{error||'Aponte a câmera para o QR Code ou código de barras'}</p><button className="btn" onClick={onClose}>Fechar câmera</button></div></div>
}
