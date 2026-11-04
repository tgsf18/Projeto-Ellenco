import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Printer, QrCode, RefreshCw, Search, Square } from 'lucide-react'
import { request } from '../api'
import { QrTarget, qrTargetUrl } from '../utils/qrDestination'

type Product = { id: number; codigo: string; nome: string; unidade?: string; epi?: boolean; isEpi?: boolean; numeroCa?: string }
type Tool = { id: number; patrimonio: string; nome: string; categoria?: string; marca?: string; modelo?: string }
type QrItem = { target: QrTarget; name: string; code: string; detail: string }
type KindFilter = 'todos' | 'produto' | 'ferramenta'

const keyOf = (item: QrItem) => `${item.target.kind}:${item.target.id}`
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

export default function QrCodeAdminPanel() {
  const [items, setItems] = useState<QrItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<KindFilter>('todos')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const [products, tools] = await Promise.all([
        request<Product[]>('/stock/products'),
        request<Tool[]>('/tools')
      ])
      const productItems: QrItem[] = products.map(product => ({
        target: { kind: 'produto', id: product.id },
        name: product.nome,
        code: product.codigo,
        detail: product.epi || product.isEpi ? `EPI · CA ${product.numeroCa || 'não informado'}` : `Produto · ${product.unidade || 'UN'}`
      }))
      const toolItems: QrItem[] = tools.map(tool => ({
        target: { kind: 'ferramenta', id: tool.id },
        name: tool.nome,
        code: tool.patrimonio,
        detail: [tool.categoria, tool.marca, tool.modelo].filter(Boolean).join(' · ') || 'Ferramenta'
      }))
      setItems([...productItems, ...toolItems])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os cadastros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return items.filter(item => (filter === 'todos' || item.target.kind === filter) &&
      (!query || `${item.name} ${item.code} ${item.detail}`.toLocaleLowerCase('pt-BR').includes(query)))
  }, [filter, items, search])

  const selectedItems = useMemo(() => items.filter(item => selected.has(keyOf(item))), [items, selected])
  const allVisibleSelected = visible.length > 0 && visible.every(item => selected.has(keyOf(item)))

  function toggle(item: QrItem) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(keyOf(item))) next.delete(keyOf(item))
      else next.add(keyOf(item))
      return next
    })
  }

  function toggleVisible() {
    setSelected(current => {
      const next = new Set(current)
      if (allVisibleSelected) visible.forEach(item => next.delete(keyOf(item)))
      else visible.forEach(item => next.add(keyOf(item)))
      return next
    })
  }

  async function printSelected() {
    if (!selectedItems.length || busy) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setMessage('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.')
      return
    }
    setBusy(true)
    setMessage('Preparando etiquetas…')
    try {
      const { toDataURL } = await import('qrcode')
      const labels = await Promise.all(selectedItems.map(async item => ({
        ...item,
        image: await toDataURL(qrTargetUrl(item.target), { width: 360, margin: 1, errorCorrectionLevel: 'M' })
      })))
      const cards = labels.map(item => `<article class="label"><img src="${item.image}" alt="QR Code"><div><small>ELLENCO · ${item.target.kind === 'produto' ? 'PRODUTO' : 'FERRAMENTA'}</small><h2>${escapeHtml(item.name)}</h2><strong>${escapeHtml(item.code)}</strong><p>${escapeHtml(item.detail)}</p></div></article>`).join('')
      const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
      printWindow.document.open()
      printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etiquetas QR · Ellenco</title><style>
        @page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#142536}.heading{display:flex;justify-content:space-between;align-items:end;gap:12px;padding:0 0 5mm;border-bottom:1px solid #cbd5e1;margin-bottom:5mm}.heading h1{font-size:15pt;margin:0}.heading p{font-size:8pt;color:#526477;margin:3px 0 0}.labels{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.label{height:55mm;display:grid;grid-template-columns:39mm 1fr;align-items:center;gap:3mm;padding:3mm;border:1px solid #b8c6d4;border-radius:2mm;break-inside:avoid;overflow:hidden}.label img{width:37mm;height:37mm;object-fit:contain}.label small{display:block;color:#174675;font-weight:800;font-size:7pt;letter-spacing:.08em}.label h2{font-size:11pt;line-height:1.2;margin:2mm 0;overflow-wrap:anywhere}.label strong{font-size:9pt}.label p{font-size:8pt;color:#526477;margin:2mm 0 0;overflow-wrap:anywhere}@media screen{body{max-width:210mm;margin:12px auto;padding:10px}.label{background:#fff}.heading{margin-top:8mm}}@media print{.label{border-color:#9aa9b7}}
      </style></head><body><header class="heading"><div><h1>ELLENCO · Etiquetas QR</h1><p>${labels.length} registro(s) selecionado(s)</p></div><p>Gerado em ${date}</p></header><main class="labels">${cards}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350))</script></body></html>`)
      printWindow.document.close()
      setMessage('Janela de impressão pronta. Escolha uma impressora ou “Salvar como PDF”.')
    } catch {
      printWindow.close()
      setMessage('Não foi possível preparar a folha de etiquetas. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="panel-page qr-admin-page">
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRAÇÃO · IDENTIFICAÇÃO</p><h1>Central de QR Codes</h1><p>Selecione produtos, EPIs e ferramentas cadastrados para montar e imprimir etiquetas em lote.</p></div><div className="table-actions"><button className="secondary-button" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Atualizar lista</button><button className="primary-button" onClick={()=>void printSelected()} disabled={!selectedItems.length||busy}><Printer size={17}/> {busy?'Preparando…':`Imprimir (${selectedItems.length})`}</button></div></div>
    {message&&<p className="feedback" role="status">{message}</p>}
    <div className="qr-admin-toolbar"><label className="module-search-label"><span>Buscar por nome, código ou categoria</span><span className="qr-admin-search"><Search size={17}/><input className="module-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Ex.: botina, EPI-002, furadeira"/></span></label><label className="module-search-label"><span>Tipo de cadastro</span><select className="module-search" value={filter} onChange={event=>setFilter(event.target.value as KindFilter)}><option value="todos">Todos</option><option value="produto">Produtos e EPIs</option><option value="ferramenta">Ferramentas</option></select></label></div>
    <div className="qr-admin-selection"><span><QrCode size={18}/> {selectedItems.length} selecionado(s) · {visible.length} exibido(s)</span><div><button className="link-button" onClick={toggleVisible} disabled={!visible.length}>{allVisibleSelected?<CheckSquare size={16}/>:<Square size={16}/>} {allVisibleSelected?'Desmarcar exibidos':'Selecionar exibidos'}</button><button className="link-button" onClick={()=>setSelected(new Set())} disabled={!selected.size}>Limpar seleção</button></div></div>
    <div className="table-card"><table><thead><tr><th aria-label="Selecionar"></th><th>Tipo</th><th>Nome</th><th>Código / patrimônio</th><th>Detalhe</th></tr></thead><tbody>
      {loading?<tr><td colSpan={5}><div className="empty-state">Carregando produtos e ferramentas…</div></td></tr>:visible.map(item=><tr key={keyOf(item)}><td><input className="qr-select-checkbox" type="checkbox" checked={selected.has(keyOf(item))} onChange={()=>toggle(item)} aria-label={`Selecionar ${item.name}`}/></td><td><span className={`status ${item.target.kind==='produto'?'ok':'warning'}`}>{item.target.kind==='produto'?'Produto / EPI':'Ferramenta'}</span></td><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.detail}</td></tr>)}
      {!loading&&!visible.length&&<tr><td colSpan={5}><div className="empty-state">Nenhum cadastro corresponde à busca.</div></td></tr>}
    </tbody></table></div>
    <p className="form-hint">Cada etiqueta abre o registro atual no sistema. A leitura exige login e respeita o perfil de acesso. Na janela de impressão, também é possível salvar a folha em PDF.</p>
  </section>
}
