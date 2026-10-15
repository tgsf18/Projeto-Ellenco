import { FormEvent, useEffect, useState } from 'react'
import { request } from '../api'
import Modal from './Modal'
import CameraScanner from './CameraScanner'

type Product = { id: number; codigo: string; nome: string; unidade?: string }
type Warehouse = { id: number; nome: string; obra?: { id: number; nome: string } }
type Item = { produtoNome?: string; produtoCodigo?: string; quantidadeNota?: number; unidade?: string }
type Receipt = { id: number; numeroNota?: string; fornecedor?: string; galpaoDestinoNome?: string; status?: string; itens?: Item[] }
type DraftLine = { productId: string; quantity: string; batch: string; expiry: string }

export default function ReceiptPanel() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [open, setOpen] = useState(false)
  const [productModal, setProductModal] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState(false)
  const [draft, setDraft] = useState({ note: '', supplier: '', warehouseId: '', lines: [] as DraftLine[] })
  const [line, setLine] = useState<DraftLine>({ productId: '', quantity: '1', batch: '', expiry: '' })
  const [newProduct, setNewProduct] = useState({ code: '', name: '', unit: 'UN', minimum: '0', batch: '' })

  async function load() {
    try {
      const [allReceipts, allProducts, allWarehouses] = await Promise.all([request<Receipt[]>('/receipts'), request<Product[]>('/stock/products'), request<Warehouse[]>('/warehouses')])
      const list = Array.isArray(allReceipts) ? allReceipts : []
      setReceipts(list); setAllReceipts(list)
      setProducts(Array.isArray(allProducts) ? allProducts : [])
      setWarehouses(Array.isArray(allWarehouses) ? allWarehouses : [])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados.') }
  }
  useEffect(() => { void load() }, [])
  function filterReceipts(value: string) { const query = value.toLowerCase(); setSearch(value); setReceipts(allReceipts.filter(receipt => [receipt.numeroNota, receipt.fornecedor, receipt.galpaoDestinoNome, ...(receipt.itens || []).flatMap(item => [item.produtoNome, item.produtoCodigo])].some(field => field?.toLowerCase().includes(query)))) }

  function addLine() {
    if (!line.productId || Number(line.quantity) <= 0) return setMessage('Selecione um produto e uma quantidade válida.')
    if (draft.lines.some(value => value.productId === line.productId && value.batch === line.batch)) return setMessage('Esse produto e lote já estão na nota.')
    setDraft(value => ({ ...value, lines: [...value.lines, line] }))
    setLine({ productId: '', quantity: '1', batch: '', expiry: '' }); setMessage('')
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const created = await request<Product>('/stock/products', { method: 'POST', body: JSON.stringify({
        codigo: newProduct.code, nome: newProduct.name, unidade: newProduct.unit,
        quantidadeAtual: 0, quantidadeMinima: Number(newProduct.minimum), lote: newProduct.batch || null,
      }) })
      setProducts(values => [...values, created])
      setLine(value => ({ ...value, productId: String(created.id) }))
      setProductModal(false)
      setNewProduct({ code: '', name: '', unit: 'UN', minimum: '0', batch: '' })
      setMessage('Produto cadastrado e selecionado. Informe a quantidade recebida.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o produto.') }
    finally { setBusy(false) }
  }

  async function saveReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const pendingLineIsValid = Boolean(line.productId) && Number(line.quantity) > 0
    const receiptLines = draft.lines.length ? draft.lines : pendingLineIsValid ? [line] : []
    if (!draft.note || !draft.supplier || !draft.warehouseId || !receiptLines.length) return setMessage('Informe a nota, fornecedor, galpão e selecione pelo menos um produto com quantidade válida.')
    setBusy(true); setMessage('')
    try {
      await request('/receipts', { method: 'POST', body: JSON.stringify({
        numeroNota: draft.note, fornecedor: draft.supplier, galpaoId: Number(draft.warehouseId), galpaoDestinoNome: warehouses.find(w => String(w.id) === draft.warehouseId)?.nome,
        itens: receiptLines.map(value => {
          const product = products.find(p => String(p.id) === value.productId)!
          return { produtoId: product.id, produtoCodigo: product.codigo, produtoNome: product.nome, unidade: product.unidade || 'UN', quantidadeNota: Number(value.quantity), lote: value.batch || 'SEM_LOTE', dataValidade: value.expiry || null }
        }),
      }) })
      setOpen(false); setDraft({ note: '', supplier: '', warehouseId: '', lines: [] }); await load()
      setMessage('Recebimento registrado. Finalize a conferência para dar entrada no estoque.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o recebimento.') }
    finally { setBusy(false) }
  }

  async function changeStatus(id: number, action: 'conference' | 'finalize') {
    setBusy(true); setMessage('')
    try { await request(`/receipts/${id}/${action}`, { method: 'POST', body: action === 'finalize' ? JSON.stringify({ status: 'APROVADO' }) : undefined }); await load(); setMessage(action === 'finalize' ? 'Entrada finalizada e saldo atualizado.' : 'Conferência iniciada.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o recebimento.') }
    finally { setBusy(false) }
  }

  async function importXml(file?: File) {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      const form = new FormData(); form.append('file', file)
      const data = await request<any>('/nfe/import', { method: 'POST', body: form })
      const registered = (data.itens || []).filter((item: any) => item.produtoId).map((item: any) => ({ productId: String(item.produtoId), quantity: String(item.quantidade), batch: '', expiry: '' }))
      setDraft(value => ({ ...value, note: data.numeroNota, supplier: data.fornecedor, lines: registered }))
      const missing = (data.itens || []).length - registered.length
      setOpen(true); setMessage(missing ? `NF-e importada. ${missing} produto(s) precisam ser cadastrados.` : 'NF-e importada com todos os produtos vinculados.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível importar o XML.') }
    finally { setBusy(false) }
  }

  return <section className="panel-page">
    <div className="page-heading"><div><p className="eyebrow">LOGÍSTICA E ALMOXARIFADO</p><h1>Recebimentos</h1><p>Cada nota entra com seus produtos e com o galpão de destino.</p></div><div><label className="secondary-button xml-button">Importar XML NF-e<input type="file" accept=".xml,text/xml,application/xml" onChange={e => void importXml(e.target.files?.[0])}/></label><button className="secondary-button" onClick={() => setScan(true)}>Ler QR Code</button><button className="primary-button" onClick={() => setOpen(true)}>+ Novo recebimento</button></div></div>
    {message && <p className="feedback">{message}</p>}
    <input className="module-search" value={search} onChange={e => filterReceipts(e.target.value)} placeholder="Buscar nota, fornecedor, galpão ou produto" />
    <div className="content-card receipt-list">{!receipts.length ? <div className="empty-state"><b>Nenhum recebimento registrado</b><span>Registre a primeira nota para alimentar o estoque.</span></div> : receipts.map(receipt => <article className="receipt-row" key={receipt.id}><div className="receipt-thumb no-photo">NF</div><div className="receipt-main"><div className="receipt-title"><b>NF {receipt.numeroNota || '#' + receipt.id}</b><span className="status-chip">{receipt.status || 'Em aberto'}</span></div><span>{receipt.fornecedor} · {receipt.galpaoDestinoNome}</span><small>{(receipt.itens || []).map(item => `${item.produtoNome || item.produtoCodigo} (${item.quantidadeNota} ${item.unidade || 'UN'})`).join(' · ')}</small></div><div className="receipt-actions">{receipt.status === 'AGUARDANDO_CONFERENCIA' && <button className="secondary-button" disabled={busy} onClick={() => void changeStatus(receipt.id, 'conference')}>Conferir</button>}{(receipt.status === 'AGUARDANDO_CONFERENCIA' || receipt.status === 'EM_CONFERENCIA') && <button className="primary-button" disabled={busy} onClick={() => void changeStatus(receipt.id, 'finalize')}>Finalizar entrada</button>}</div></article>)}</div>
    <Modal open={open} title="Novo recebimento" onClose={() => !busy && setOpen(false)}><form className="product-form receipt-form" onSubmit={saveReceipt}>
      {message && <p className="feedback">{message}</p>}
      <label>Número da nota fiscal<input required value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })}/></label>
      <label>Fornecedor<input required value={draft.supplier} onChange={e => setDraft({ ...draft, supplier: e.target.value })}/></label>
      <label>Galpão / obra de destino<select required value={draft.warehouseId} onChange={e => setDraft({ ...draft, warehouseId: e.target.value })}><option value="">Selecione o destino</option>{warehouses.map(w => <option value={w.id} key={w.id}>{w.obra?.nome ? `${w.obra.nome} — ` : ''}{w.nome}</option>)}</select></label>
      <div className="receipt-item-builder"><div className="receipt-products-heading"><b>Produtos e lotes da nota</b><button type="button" className="link-button" onClick={() => setProductModal(true)}>+ Produto não cadastrado</button></div><div className="receipt-item-fields"><label>Produto<select value={line.productId} onChange={e => setLine({ ...line, productId: e.target.value })}><option value="">Selecione o produto</option>{products.map(product => <option value={product.id} key={product.id}>{product.codigo} — {product.nome}</option>)}</select></label><label>Quantidade<input type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => setLine({ ...line, quantity: e.target.value })}/></label><label>Lote<input value={line.batch} onChange={e => setLine({ ...line, batch: e.target.value })} placeholder="Ex.: LT-2026-08"/></label><label>Validade<input type="date" value={line.expiry} onChange={e => setLine({ ...line, expiry: e.target.value })}/></label><button type="button" className="secondary-button" onClick={addLine}>Adicionar</button></div><ul className="receipt-draft-list">{draft.lines.map(value => { const product = products.find(p => String(p.id) === value.productId); return <li key={`${value.productId}-${value.batch}`}><span>{product?.nome}<small>Lote: {value.batch || 'SEM_LOTE'} · Validade: {value.expiry ? new Date(value.expiry+'T00:00:00').toLocaleDateString('pt-BR') : 'não informada'}</small></span><b>{value.quantity} {product?.unidade || 'UN'}</b><button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter(item => item !== value) })}>Remover</button></li> })}</ul></div>
      <button type="submit" className="primary-button modal-submit" disabled={busy}>{busy ? 'Salvando…' : 'Registrar recebimento'}</button>
    </form></Modal>
    <Modal open={productModal} title="Cadastrar produto para esta nota" onClose={() => !busy && setProductModal(false)}><form className="product-form" onSubmit={saveProduct}><label>Código<input required value={newProduct.code} onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}/></label><label>Nome<input required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}/></label><label>Unidade<input required value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}/></label><label>Estoque mínimo<input type="number" min="0" value={newProduct.minimum} onChange={e => setNewProduct({ ...newProduct, minimum: e.target.value })}/></label><label>Lote<input value={newProduct.batch} onChange={e => setNewProduct({ ...newProduct, batch: e.target.value })}/></label><button className="primary-button modal-submit" disabled={busy}>{busy ? 'Cadastrando…' : 'Cadastrar e selecionar'}</button></form></Modal>
    {scan && <CameraScanner onRead={value => filterReceipts(value)} onClose={() => setScan(false)}/>}  </section>
}
