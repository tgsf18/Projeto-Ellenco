import { FormEvent, useState } from 'react'
import { request } from '../api'
import Modal from './Modal'
import CameraScanner from './CameraScanner'
import SearchableSelect from './SearchableSelect'
import ModuleMetrics from './ModuleMetrics'
import { useModuleRefresh } from '../useModuleRefresh'
import { ClipboardCheck, FileClock, PackageCheck, Truck } from 'lucide-react'

type Product = { id: number; codigo: string; nome: string; unidade?: string; numeroCa?: string; epi?: boolean; isEpi?: boolean }
type Warehouse = { id: number; nome: string; obra?: { id: number; nome: string } }
type Supplier = { id:number;cnpj:string;razaoSocial:string;nomeFantasia?:string;status?:string }
type Item = { produtoNome?: string; produtoCodigo?: string; quantidadeNota?: number; unidade?: string }
type Receipt = { id: number; numeroNota?: string; fornecedor?: string; galpaoDestinoNome?: string; status?: string; itens?: Item[] }
type DraftLine = { productId: string; quantity: string; batch: string; expiry: string }

export default function ReceiptPanel() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const [productModal, setProductModal] = useState(false)
  const [supplierModal, setSupplierModal] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState(false)
  const [draft, setDraft] = useState({ note: '', supplierId: '', warehouseId: '', lines: [] as DraftLine[] })
  const [line, setLine] = useState<DraftLine>({ productId: '', quantity: '1', batch: '', expiry: '' })
  const [newProduct, setNewProduct] = useState({ code: '', name: '', unit: 'UN', minimum: '0', batch: '', epi: false, numeroCa: '', validadeCa: '' })
  const [newSupplier, setNewSupplier] = useState({ cnpj:'',razaoSocial:'',nomeFantasia:'' })

  async function load() {
    try {
      const [allReceipts, allProducts, allWarehouses, allSuppliers] = await Promise.all([request<Receipt[]>('/receipts'), request<Product[]>('/stock/products'), request<Warehouse[]>('/warehouses'), request<Supplier[]>('/suppliers')])
      const list = Array.isArray(allReceipts) ? allReceipts : []
      setReceipts(list); setAllReceipts(list)
      setProducts(Array.isArray(allProducts) ? allProducts : [])
      setWarehouses(Array.isArray(allWarehouses) ? allWarehouses : [])
      setSuppliers(Array.isArray(allSuppliers) ? allSuppliers.filter(s=>s.status==='ATIVO') : [])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados.') }
  }
  useModuleRefresh(load)
  function filterReceipts(value: string) { const query = value.toLowerCase(); setSearch(value); setReceipts(allReceipts.filter(receipt => [receipt.numeroNota, receipt.fornecedor, receipt.galpaoDestinoNome, ...(receipt.itens || []).flatMap(item => [item.produtoNome, item.produtoCodigo])].some(field => field?.toLowerCase().includes(query)))) }

  function addLine() {
    if (!line.productId || Number(line.quantity) <= 0) return setMessage('Selecione um produto e uma quantidade válida.')
    if (draft.lines.some(value => value.productId === line.productId && value.batch === line.batch)) return setMessage('Esse produto e lote já estão na nota.')
    const selectedProduct=products.find(value=>String(value.id)===line.productId)
    if ((selectedProduct?.epi||selectedProduct?.isEpi) && (!line.batch.trim()||!line.expiry)) return setMessage('Para receber um EPI, informe o lote e a validade do lote.')
    setDraft(value => ({ ...value, lines: [...value.lines, line] }))
    setLine({ productId: '', quantity: '1', batch: '', expiry: '' }); setMessage('')
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const created = await request<Product>('/stock/products', { method: 'POST', body: JSON.stringify({
        codigo: newProduct.code, nome: newProduct.name, unidade: newProduct.unit,
        quantidadeAtual: 0, quantidadeMinima: Number(newProduct.minimum), lote: newProduct.batch || null,
        epi:newProduct.epi,numeroCa:newProduct.epi?newProduct.numeroCa:null,validadeCa:newProduct.epi?newProduct.validadeCa:null,
      }) })
      setProducts(values => [...values, created])
      setLine(value => ({ ...value, productId: String(created.id) }))
      setProductModal(false)
      setNewProduct({ code: '', name: '', unit: 'UN', minimum: '0', batch: '', epi:false, numeroCa:'', validadeCa:'' })
      setMessage('Produto cadastrado e selecionado. Informe a quantidade recebida.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o produto.') }
    finally { setBusy(false) }
  }

  async function saveReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const pendingLineIsValid = Boolean(line.productId) && Number(line.quantity) > 0
    const receiptLines = draft.lines.length ? draft.lines : pendingLineIsValid ? [line] : []
    if (!draft.note || !draft.supplierId || !draft.warehouseId || !receiptLines.length) return setMessage('Informe a nota, selecione o fornecedor e galpão cadastrados e adicione produtos com quantidade válida.')
    if (receiptLines.some(value => { const product=products.find(p=>String(p.id)===value.productId); return (product?.epi||product?.isEpi)&&(!value.batch.trim()||!value.expiry||value.expiry<new Date().toISOString().slice(0,10)) })) return setMessage('Cada EPI recebido precisa de lote identificado e validade futura do lote.')
    setBusy(true); setMessage('')
    try {
      await request('/receipts', { method: 'POST', body: JSON.stringify({
        numeroNota: draft.note, fornecedorId: Number(draft.supplierId), galpaoId: Number(draft.warehouseId), galpaoDestinoNome: warehouses.find(w => String(w.id) === draft.warehouseId)?.nome,
        itens: receiptLines.map(value => {
          const product = products.find(p => String(p.id) === value.productId)!
          return { produtoId: product.id, produtoCodigo: product.codigo, produtoNome: product.nome, unidade: product.unidade || 'UN', quantidadeNota: Number(value.quantity), lote: value.batch || 'SEM_LOTE', dataValidade: value.expiry || null }
        }),
      }) })
      setOpen(false); setDraft({ note: '', supplierId: '', warehouseId: '', lines: [] }); await load()
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
      const matchedSupplier=suppliers.find(s=>[s.razaoSocial,s.nomeFantasia].some(name=>name?.toLocaleLowerCase('pt-BR')===String(data.fornecedor||'').toLocaleLowerCase('pt-BR')))
      setDraft(value => ({ ...value, note: data.numeroNota, supplierId: matchedSupplier?String(matchedSupplier.id):'', lines: registered }))
      const missing = (data.itens || []).length - registered.length
      setOpen(true); setMessage(!matchedSupplier?'NF-e importada. Selecione o fornecedor cadastrado antes de salvar.':missing ? `NF-e importada. ${missing} produto(s) precisam ser cadastrados.` : 'NF-e importada com todos os produtos vinculados.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível importar o XML.') }
    finally { setBusy(false) }
  }

  async function saveSupplier(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);try{const supplier=await request<Supplier>('/suppliers',{method:'POST',body:JSON.stringify({...newSupplier,status:'ATIVO'})});setSuppliers(values=>[...values,supplier]);setDraft(value=>({...value,supplierId:String(supplier.id)}));setSupplierModal(false);setNewSupplier({cnpj:'',razaoSocial:'',nomeFantasia:''});setMessage('Fornecedor cadastrado e selecionado para este recebimento.')}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível cadastrar o fornecedor.')}finally{setBusy(false)}}

  return <section className="panel-page">
    <div className="page-heading"><div><p className="eyebrow">LOGÍSTICA E ALMOXARIFADO</p><h1>Recebimentos</h1><p>Cada nota entra com seus produtos e com o galpão de destino.</p></div><div><label className="secondary-button xml-button">Importar XML NF-e<input type="file" accept=".xml,text/xml,application/xml" onChange={e => void importXml(e.target.files?.[0])}/></label><button className="secondary-button" onClick={() => setScan(true)}>Ler QR Code</button><button className="primary-button" onClick={() => setOpen(true)}>+ Novo recebimento</button></div></div>
    {message && <p className="feedback">{message}</p>}
    <ModuleMetrics items={[
      {label:'Recebimentos no sistema',value:allReceipts.length,detail:'Notas registradas',icon:<Truck/>,tone:'blue'},
      {label:'Aguardando conferência',value:allReceipts.filter(r=>r.status==='AGUARDANDO_CONFERENCIA').length,detail:'Conferir produtos e quantidades',icon:<FileClock/>,tone:'amber'},
      {label:'Em conferência',value:allReceipts.filter(r=>r.status==='EM_CONFERENCIA').length,detail:'Conferência em andamento',icon:<ClipboardCheck/>,tone:'blue'},
      {label:'Entradas aprovadas',value:allReceipts.filter(r=>r.status==='APROVADO').length,detail:'Estoque atualizado',icon:<PackageCheck/>,tone:'green'}
    ]}/>
    <input className="module-search" value={search} onChange={e => filterReceipts(e.target.value)} placeholder="Buscar nota, fornecedor, galpão ou produto" />
    <div className="content-card receipt-list">{!receipts.length ? <div className="empty-state"><b>Nenhum recebimento registrado</b><span>Registre a primeira nota para alimentar o estoque.</span></div> : receipts.map(receipt => <article className="receipt-row" key={receipt.id}><div className="receipt-thumb no-photo">NF</div><div className="receipt-main"><div className="receipt-title"><b>NF {receipt.numeroNota || '#' + receipt.id}</b><span className="status-chip">{receipt.status || 'Em aberto'}</span></div><span>{receipt.fornecedor} · {receipt.galpaoDestinoNome}</span><small>{(receipt.itens || []).map(item => `${item.produtoNome || item.produtoCodigo} (${item.quantidadeNota} ${item.unidade || 'UN'})`).join(' · ')}</small></div><div className="receipt-actions">{receipt.status === 'AGUARDANDO_CONFERENCIA' && <button className="secondary-button" disabled={busy} onClick={() => void changeStatus(receipt.id, 'conference')}>Conferir</button>}{(receipt.status === 'AGUARDANDO_CONFERENCIA' || receipt.status === 'EM_CONFERENCIA') && <button className="primary-button" disabled={busy} onClick={() => void changeStatus(receipt.id, 'finalize')}>Finalizar entrada</button>}</div></article>)}</div>
    <Modal open={open} title="Novo recebimento" onClose={() => !busy && setOpen(false)}><form className="product-form receipt-form" onSubmit={saveReceipt}>
      {message && <p className="feedback">{message}</p>}
      <label>Número da nota fiscal<input required value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })}/></label>
      <div className="receipt-supplier-field"><label>Fornecedor cadastrado<SearchableSelect ariaLabel="Fornecedor cadastrado" value={draft.supplierId} options={suppliers.map(s=>({value:String(s.id),label:s.nomeFantasia||s.razaoSocial,description:`${s.razaoSocial} · CNPJ ${s.cnpj}`}))} onChange={value=>setDraft({...draft,supplierId:value})} placeholder="Pesquisar nome, razão social ou CNPJ"/></label><button type="button" className="link-button" onClick={()=>setSupplierModal(true)}>+ Cadastrar fornecedor</button></div>
      <label>Galpão / obra de destino<SearchableSelect ariaLabel="Galpão de destino" value={draft.warehouseId} options={warehouses.map(w=>({value:String(w.id),label:w.nome,description:w.obra?.nome||'Sem obra vinculada'}))} onChange={value=>setDraft({...draft,warehouseId:value})} placeholder="Pesquisar obra ou galpão"/></label>
      <div className="receipt-item-builder"><div className="receipt-products-heading"><b>Produtos e lotes da nota</b><button type="button" className="link-button" onClick={() => setProductModal(true)}>+ Cadastrar produto</button></div><div className="receipt-item-fields"><label>Produto cadastrado<SearchableSelect ariaLabel="Produto do catálogo" value={line.productId} options={products.map(product=>({value:String(product.id),label:`${product.codigo} — ${product.nome}`,description:(product.epi||product.isEpi)?`EPI · CA ${product.numeroCa||'não cadastrado'}`:product.unidade||'UN'}))} onChange={value=>setLine({...line,productId:value})} placeholder="Pesquisar código ou produto"/></label><label>Quantidade<input type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => setLine({ ...line, quantity: e.target.value })}/></label><label>Lote<input value={line.batch} onChange={e => setLine({ ...line, batch: e.target.value })} placeholder="Ex.: LT-2026-08"/></label><label>Validade do lote<input type="date" value={line.expiry} onChange={e => setLine({ ...line, expiry: e.target.value })}/></label><button type="button" className="secondary-button" onClick={addLine}>Adicionar</button></div><ul className="receipt-draft-list">{draft.lines.map(value => { const product = products.find(p => String(p.id) === value.productId); return <li key={`${value.productId}-${value.batch}`}><span>{product?.nome}<small>{(product?.epi||product?.isEpi)?`EPI · CA ${product.numeroCa||'pendente'} · `:''}Lote: {value.batch || 'SEM_LOTE'} · Validade: {value.expiry ? new Date(value.expiry+'T00:00:00').toLocaleDateString('pt-BR') : 'não informada'}</small></span><b>{value.quantity} {product?.unidade || 'UN'}</b><button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter(item => item !== value) })}>Remover</button></li> })}</ul></div>
      <button type="submit" className="primary-button modal-submit" disabled={busy}>{busy ? 'Salvando…' : 'Registrar recebimento'}</button>
    </form></Modal>
    <Modal open={productModal} title="Cadastrar produto para esta nota" onClose={() => !busy && setProductModal(false)}><form className="product-form" onSubmit={saveProduct}><label>Código<input required value={newProduct.code} onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}/></label><label>Nome<input required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}/></label><label>Unidade<select value={newProduct.unit} onChange={e=>setNewProduct({...newProduct,unit:e.target.value})}><option>UN</option><option>PAR</option><option>CAIXA</option><option>KG</option><option>L</option><option>M</option></select></label><label>Estoque mínimo<input type="number" min="0" value={newProduct.minimum} onChange={e => setNewProduct({ ...newProduct, minimum: e.target.value })}/></label><label className="checkbox-field"><input type="checkbox" checked={newProduct.epi} onChange={e=>setNewProduct({...newProduct,epi:e.target.checked})}/>Cadastrar como EPI</label>{newProduct.epi&&<><label>Número do CA<input required value={newProduct.numeroCa} onChange={e=>setNewProduct({...newProduct,numeroCa:e.target.value})}/></label><label>Validade do CA<input type="date" min={new Date().toISOString().slice(0,10)} required value={newProduct.validadeCa} onChange={e=>setNewProduct({...newProduct,validadeCa:e.target.value})}/></label></>}<button className="primary-button modal-submit" disabled={busy}>{busy ? 'Cadastrando…' : 'Cadastrar e selecionar'}</button></form></Modal>
    <Modal open={supplierModal} title="Cadastrar fornecedor" onClose={()=>!busy&&setSupplierModal(false)}><form className="product-form" onSubmit={saveSupplier}><label>CNPJ<input required value={newSupplier.cnpj} onChange={e=>setNewSupplier({...newSupplier,cnpj:e.target.value})} placeholder="Somente números"/></label><label>Razão social<input required value={newSupplier.razaoSocial} onChange={e=>setNewSupplier({...newSupplier,razaoSocial:e.target.value})}/></label><label>Nome fantasia<input value={newSupplier.nomeFantasia} onChange={e=>setNewSupplier({...newSupplier,nomeFantasia:e.target.value})}/></label><button className="primary-button" disabled={busy}>{busy?'Salvando…':'Cadastrar fornecedor'}</button></form></Modal>
    {scan && <CameraScanner onRead={value => filterReceipts(value)} onClose={() => setScan(false)}/>}  </section>
}
