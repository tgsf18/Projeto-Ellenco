import { useMemo, useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { request } from '../api'
import './ManagementReports.css'

type Product = { codigo?: string; nome?: string; categoria?: { nome?: string }; unidade?: string; quantidadeAtual?: number; quantidadeMinima?: number; lote?: string; dataValidade?: string; galpao?: { nome?: string; obra?: { nome?: string } } }
type ReceiptLine = { produtoNome?: string; quantidadeNota?: number; unidade?: string; lote?: string; dataValidade?: string }
type Receipt = { numeroNota?: string; fornecedor?: string; galpaoDestinoNome?: string; responsavelRecebimento?: string; responsavelConferencia?: string; status?: string; createdAt?: string; dataRecebimento?: string; itens?: ReceiptLine[] }
type Epi = { funcionarioNome?: string; funcionarioCpf?: string; produtoNome?: string; numeroCa?: string; quantidade?: number; status?: string; dataEntrega?: string; createdAt?: string; dataPrevisaoTroca?: string; responsavelEntrega?: string; assinaturaDigital?: string; termoAssinado?: boolean }
type Tab = 'epi' | 'recebimentos' | 'estoque'
type Row = { date: string; cells: string[]; signature?: string }
const text = (value: unknown) => String(value ?? '—')
const dateLabel = (value?: string) => value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('pt-BR') : '—'
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!))
const inRange = (value: string, from: string, to: string) => (!from || value.slice(0, 10) >= from) && (!to || value.slice(0, 10) <= to)
const csvCell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export default function ManagementReports({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('epi')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Record<Tab, Row[]>>({ epi: [], recebimentos: [], estoque: [] })
  const [loaded, setLoaded] = useState(false)

  async function load() {
    if (from && to && from > to) { setMessage('A data inicial deve ser anterior à data final.'); return }
    setLoading(true); setMessage('')
    try {
      const [epiData, receiptData, productData] = await Promise.all([
        request<Epi[]>('/epi'), request<Receipt[]>('/receipts'), request<Product[]>('/stock/products')
      ])
      const epi = (Array.isArray(epiData) ? epiData : []).filter(x => inRange(x.dataEntrega || x.createdAt || '', from, to)).map(x => ({
        date: x.dataEntrega || x.createdAt || '', cells: [text(x.funcionarioNome), text(x.funcionarioCpf), `${text(x.produtoNome)} · CA ${text(x.numeroCa)}`, text(x.quantidade ?? 1), dateLabel(x.dataEntrega || x.createdAt), dateLabel(x.dataPrevisaoTroca), x.assinaturaDigital || x.termoAssinado ? 'Assinado' : 'Pendente', text(x.responsavelEntrega), text(x.status)], signature: x.assinaturaDigital
      }))
      const receipts = (Array.isArray(receiptData) ? receiptData : []).filter(x => inRange(x.dataRecebimento || x.createdAt || '', from, to)).flatMap(x =>
        (x.itens?.length ? x.itens : [{}]).map(line => ({ date: x.dataRecebimento || x.createdAt || '', cells: [text(x.numeroNota), text(x.fornecedor), text(line.produtoNome), text(line.quantidadeNota), text(line.unidade || 'UN'), text(line.lote), dateLabel(line.dataValidade), text(x.galpaoDestinoNome), text(x.responsavelRecebimento), text(x.responsavelConferencia), text(x.status)] }))
      )
      const products = (Array.isArray(productData) ? productData : []).map(x => ({ date: '', cells: [text(x.codigo), text(x.nome), text(x.categoria?.nome), text(x.galpao?.obra?.nome), text(x.galpao?.nome), text(x.lote), dateLabel(x.dataValidade), text(x.quantidadeAtual ?? 0), text(x.quantidadeMinima ?? 0), Number(x.quantidadeAtual || 0) <= Number(x.quantidadeMinima || 0) ? 'Repor' : 'Regular'] }))
      setRows({ epi, recebimentos: receipts, estoque: products }); setLoaded(true)
      setMessage(`Dados atualizados. ${epi.length + receipts.length + products.length} linhas disponíveis para consulta.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível consultar os dados dos relatórios.') }
    finally { setLoading(false) }
  }

  const config = {
    epi: { title: 'Entregas de EPI', headers: ['Funcionário', 'CPF', 'EPI / CA', 'Qtd.', 'Entrega', 'Próxima troca', 'Aceite', 'Entregue por', 'Situação'] },
    recebimentos: { title: 'Recebimentos', headers: ['Nota', 'Fornecedor', 'Produto', 'Qtd.', 'Un.', 'Lote', 'Validade', 'Galpão', 'Registrado por', 'Conferido por', 'Situação'] },
    estoque: { title: 'Posição de estoque', headers: ['Código', 'Produto', 'Categoria', 'Obra', 'Galpão', 'Lote', 'Validade', 'Saldo', 'Mínimo', 'Situação'] }
  } satisfies Record<Tab, { title: string; headers: string[] }>
  const visibleRows = useMemo(() => rows[tab].filter(row => tab === 'estoque' || inRange(row.date, from, to)), [rows, tab, from, to])

  function exportCsv() {
    const csv = '\uFEFF' + [config[tab].headers, ...visibleRows.map(row => row.cells)].map(row => row.map(value => csvCell(String(value))).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `ellenco-${tab}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  function printReport() {
    const title = config[tab].title
    const head = config[tab].headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
    const body = visibleRows.length ? visibleRows.map(row => `<tr>${row.cells.map((cell, index) => `<td>${index === 6 && tab === 'epi' && row.signature ? `<img class="signature" src="${escapeHtml(row.signature)}" alt="Assinatura digital"><br>` : ''}${escapeHtml(cell)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${config[tab].headers.length}">Sem registros para os filtros selecionados.</td></tr>`
    const page = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escapeHtml(title)} · Ellenco</title><style>body{font:12px Arial,sans-serif;color:#172b45;margin:20mm}header{border-bottom:3px solid #d33b3b;margin-bottom:18px}h1{font-size:22px}small{color:#58677b}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9e0e8;padding:7px;text-align:left}th{background:#edf2f7}tr:nth-child(even){background:#f8fafc}.signature{max-width:120px;max-height:38px}@media print{body{margin:12mm}}</style><body><header><h1>ELLENCO · ${escapeHtml(title)}</h1><p>Período: ${from ? dateLabel(from) : 'início'} a ${to ? dateLabel(to) : 'hoje'} · Emitido em ${new Date().toLocaleString('pt-BR')}</p></header><p>${visibleRows.length} registros</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const win = window.open('', '_blank')
    if (!win) { setMessage('Permita pop-ups para imprimir ou salvar em PDF.'); return }
    win.document.write(page); win.document.close(); win.focus(); setTimeout(() => win.print(), 200)
  }

  return <section className={`management-reports${embedded ? ' embedded' : ''}`}>
    {!embedded && <div className="page-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Relatórios</h1><p>Consulte os registros em tabelas e exporte para Excel ou PDF.</p></div></div>}
    <div className="report-card">
      <div className="report-toolbar"><div><h2>Filtros do relatório</h2><p>Escolha um período para entregas e recebimentos. O estoque mostra a posição atual.</p></div><button className="primary-button" disabled={loading} onClick={() => void load()}>{loading ? 'Consultando…' : 'Atualizar dados'}</button></div>
      <div className="report-filters"><label>De<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>Até<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label><button className="link-button" onClick={() => { setFrom(''); setTo('') }}>Limpar período</button></div>
      <div className="report-tabs" role="tablist" aria-label="Tipo de relatório">{(Object.keys(config) as Tab[]).map(key => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{config[key].title}</button>)}</div>
      <div className="report-table-heading"><div><h2>{config[tab].title}</h2><span>{loaded ? `${visibleRows.length} registros` : 'Atualize para carregar os dados'}</span></div><div className="report-actions"><button className="secondary-button" disabled={!loaded || !visibleRows.length} onClick={exportCsv}><FileSpreadsheet size={16}/> Exportar Excel (CSV)</button><button className="secondary-button" disabled={!loaded} onClick={printReport}><Printer size={16}/> Imprimir / PDF</button></div></div>
      <div className="report-table-wrap"><table className="report-table"><thead><tr>{config[tab].headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={`${tab}-${index}`}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}>{tab === 'epi' && cellIndex === 6 ? <span className={`report-status ${cell === 'Assinado' ? 'signed' : 'pending'}`}>{cell}</span> : cell}</td>)}</tr>)}{loaded && !visibleRows.length && <tr><td colSpan={config[tab].headers.length} className="report-empty">Nenhum registro encontrado com esse período.</td></tr>}</tbody></table></div>
      {message && <p className="feedback" role="status">{message}</p>}
    </div>
  </section>
}
