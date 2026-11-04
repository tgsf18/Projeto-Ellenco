import { useEffect, useState } from 'react'
import { ArrowLeft, Box, Wrench } from 'lucide-react'
import { request } from '../api'
import { QrTarget } from '../utils/qrDestination'

type Product = { id: number; codigo: string; nome: string; unidade?: string; isEpi?: boolean; epi?: boolean; numeroCa?: string; validadeCa?: string; categoria?: { nome?: string } }
type Tool = { id: number; patrimonio: string; nome: string; categoria?: string; marca?: string; modelo?: string; estadoConservacao?: string; status?: string; localizacao?: string; galpao?: string; obra?: string }

export default function QrDestinationPage({ target, onBack }: { target: QrTarget; onBack: () => void }) {
  const [record, setRecord] = useState<Product | Tool | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const path = target.kind === 'produto' ? `/stock/products/${target.id}` : `/tools/qr/${target.id}`
    request<Product | Tool>(path)
      .then(value => { if (active) setRecord(value) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir este registro.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [target.id, target.kind])

  const isProduct = target.kind === 'produto'
  const product = isProduct ? record as Product | null : null
  const tool = isProduct ? null : record as Tool | null
  const name = product?.nome || tool?.nome || (loading ? 'Carregando registro…' : 'Registro indisponível')
  const code = product?.codigo || tool?.patrimonio || ''

  return <section className="qr-destination-page">
    <button className="secondary-button" onClick={onBack}><ArrowLeft size={17}/> Voltar ao painel</button>
    <article className="qr-destination-card">
      <span className="qr-destination-icon">{isProduct ? <Box size={25}/> : <Wrench size={25}/>}</span>
      <p className="eyebrow">{isProduct ? 'CATÁLOGO DE PRODUTOS' : 'PATRIMÔNIO · FERRAMENTAS'}</p>
      <h1>{name}</h1>
      {loading ? <p>Consultando registro no banco de dados…</p> : error ? <p className="form-error" role="alert">{error}</p> : <>
        <p className="qr-record-code">{isProduct ? 'Código do produto' : 'Patrimônio'}: <strong>{code}</strong></p>
        <dl className="qr-record-details">
          {isProduct && <><div><dt>Unidade</dt><dd>{product?.unidade || '—'}</dd></div><div><dt>Classificação</dt><dd>{product?.epi || product?.isEpi ? 'EPI' : product?.categoria?.nome || 'Material'}</dd></div>{(product?.epi || product?.isEpi) && <><div><dt>Certificado de Aprovação</dt><dd>{product?.numeroCa || 'Não informado'}</dd></div><div><dt>Validade do CA</dt><dd>{product?.validadeCa || 'Não informada'}</dd></div></>}</>}
          {tool && <><div><dt>Situação</dt><dd>{tool.status?.replace(/_/g, ' ') || '—'}</dd></div><div><dt>Categoria</dt><dd>{tool.categoria || '—'}</dd></div><div><dt>Marca / modelo</dt><dd>{[tool.marca, tool.modelo].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Obra / galpão</dt><dd>{[tool.obra, tool.galpao || tool.localizacao].filter(Boolean).join(' · ') || '—'}</dd></div></>}
        </dl>
        <p className="form-hint">Informações carregadas do registro atual no banco de dados. A disponibilidade e as operações seguem as permissões do seu perfil.</p>
      </>}
    </article>
  </section>
}
