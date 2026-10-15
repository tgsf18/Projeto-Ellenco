import { useState } from 'react'
import { request } from '../api'
import './ManagementReports.css'

type Product = { codigo: string; nome: string; unidade?: string; quantidadeAtual?: number; quantidadeMinima?: number }
type Receipt = { numeroNota?: string; fornecedor?: string; galpaoDestinoNome?: string; status?: string; createdAt?: string; dataRecebimento?: string; itens?: { produtoNome?: string; quantidadeNota?: number; unidade?: string }[] }
type Epi = { funcionarioNome?: string; funcionarioCpf?: string; produtoNome?: string; numeroCa?: string; quantidade?: number; status?: string; dataEntrega?: string; createdAt?: string; assinaturaDigital?: string; termoAssinado?: boolean }
type Period = 'Diário' | 'Mensal' | 'Anual'
const safe = (value: unknown) => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!))
const inPeriod = (value: string | undefined, period: Period) => {
  if (!value) return period !== 'Diário'
  const date = new Date(value), now = new Date()
  if (Number.isNaN(date.valueOf())) return false
  return period === 'Diário' ? date.toDateString() === now.toDateString() : period === 'Mensal' ? date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() : date.getFullYear() === now.getFullYear()
}
const regularRows = (values: string[][], columns = 5) => values.length ? values.map(row => '<tr>' + row.map(cell => `<td>${safe(cell)}</td>`).join('') + '</tr>').join('') : `<tr><td colspan="${columns}">Sem registros no período.</td></tr>`

export default function ManagementReports() {
  const [loading, setLoading] = useState<Period | null>(null), [message, setMessage] = useState('')
  async function generate(period: Period) {
    setLoading(period); setMessage('')
    try {
      const [epiData, receiptData, productData] = await Promise.all([request<Epi[]>('/epi'), request<Receipt[]>('/receipts'), request<Product[]>('/stock/products')])
      const epis = (Array.isArray(epiData) ? epiData : []).filter(item => inPeriod(item.dataEntrega || item.createdAt, period))
      const receipts = (Array.isArray(receiptData) ? receiptData : []).filter(item => inPeriod(item.dataRecebimento || item.createdAt, period))
      const products = Array.isArray(productData) ? productData : []
      const low = products.filter(item => Number(item.quantidadeAtual || 0) <= Number(item.quantidadeMinima || 0))
      const epiRows = epis.length ? epis.map(item => `<tr><td>${safe(item.funcionarioNome)}</td><td>${safe(item.funcionarioCpf)}</td><td>${safe(item.produtoNome)} / ${safe(item.numeroCa)}</td><td>${safe(item.quantidade || 1)}</td><td>${item.assinaturaDigital ? '<img class="signature" src="' + item.assinaturaDigital + '" alt="Assinatura eletrônica"><br>' : ''}<b>${item.assinaturaDigital || item.termoAssinado ? 'ASSINADO' : 'PENDENTE'}</b><br><small>${safe(item.status)}</small></td></tr>`).join('') : '<tr><td colspan="5">Sem entregas de EPI no período.</td></tr>'
      const page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório ${period} - Ellenco</title><style>body{font-family:Arial;color:#173b63;margin:34px}header{border-bottom:4px solid #ef3e42;padding-bottom:16px}h1{margin:0}h2{margin:30px 0 8px;color:#1d4d80}.metrics{display:flex;gap:12px}.metric{padding:14px;border:1px solid #dce5ef;border-radius:8px;min-width:160px}.metric b{display:block;font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-bottom:1px solid #dce5ef;text-align:left;vertical-align:middle}th{background:#f4f7fb}.signature{max-height:42px;max-width:130px;object-fit:contain;background:#fff;border-bottom:1px solid #173b63}small{color:#66788d}@media print{body{margin:15mm}}</style></head><body><header><h1>ELLENCO · Relatório ${period}</h1><p>Controle operacional de EPI, recebimentos e estoque · Emitido em ${new Date().toLocaleString('pt-BR')}</p></header><section class="metrics"><div class="metric">Entregas de EPI<b>${epis.length}</b></div><div class="metric">Recebimentos<b>${receipts.length}</b></div><div class="metric">Produtos em alerta<b>${low.length}</b></div></section><h2>Entregas de EPI e comprovantes</h2><table><thead><tr><th>Funcionário</th><th>CPF</th><th>EPI / CA</th><th>Quantidade</th><th>Assinatura comprovada</th></tr></thead><tbody>${epiRows}</tbody></table><h2>Recebimentos</h2><table><thead><tr><th>Nota</th><th>Fornecedor</th><th>Galpão</th><th>Itens</th><th>Status</th></tr></thead><tbody>${regularRows(receipts.map(item => [item.numeroNota || '', item.fornecedor || '', item.galpaoDestinoNome || '', (item.itens || []).map(line => `${line.produtoNome} (${line.quantidadeNota} ${line.unidade || 'UN'})`).join(', '), item.status || '']))}</tbody></table><h2>Posição atual de estoque</h2><table><thead><tr><th>Código</th><th>Produto</th><th>Saldo atual</th><th>Mínimo</th><th>Situação</th></tr></thead><tbody>${regularRows(products.map(item => [item.codigo, item.nome, `${item.quantidadeAtual || 0} ${item.unidade || 'UN'}`, String(item.quantidadeMinima || 0), low.includes(item) ? 'REPOR' : 'Regular']))}</tbody></table><footer>Documento gerado pela Plataforma Ellenco.</footer></body></html>`
      const report = window.open('', '_blank'); if (!report) throw new Error('Permita a abertura de pop-ups para gerar o PDF.')
      report.document.write(page); report.document.close(); report.focus(); setTimeout(() => report.print(), 250)
      setMessage(`Relatório ${period.toLowerCase()} aberto. Na impressão, selecione “Salvar como PDF”.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o relatório.') }
    finally { setLoading(null) }
  }
  return <section><div className="page-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Relatórios operacionais</h1><p>Consolide EPI, recebimentos e almoxarifado, com comprovantes de assinatura.</p></div></div><div className="report-card"><h2>Exportar relatório em PDF</h2><p>Escolha o período. O documento abre pronto para salvar em PDF.</p><div className="report-actions">{(['Diário', 'Mensal', 'Anual'] as Period[]).map(period => <button key={period} className="primary-button" disabled={!!loading} onClick={() => void generate(period)}>{loading === period ? 'Gerando…' : `Relatório ${period}`}</button>)}</div>{message && <p className="feedback">{message}</p>}</div></section>
}
