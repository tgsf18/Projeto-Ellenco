import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CalendarClock, Package, PackageCheck, QrCode } from 'lucide-react'
import { request } from '../api'
import Modal from './Modal'
import CameraScanner from './CameraScanner'
import SearchableSelect from './SearchableSelect'
import ModuleMetrics from './ModuleMetrics'
import QrCodeDialog from './QrCodeDialog'
import { parseQrTarget } from '../utils/qrDestination'

type Site = { id: number; nome: string }
type Warehouse = { id: number; nome: string; obra?: Site }
type Product = { id: number; codigo: string; nome: string; unidade: string; quantidadeAtual: number; quantidadeMinima: number; baixoEstoque: boolean; lote?: string; dataValidade?: string; validadeCa?: string; numeroCa?: string; epi?: boolean; isEpi?: boolean; galpao?: Warehouse; localizacaoPrateleira?: string }
type Balance = { id: number; produto: Product; galpao: Warehouse; lote: string; dataValidade?: string; quantidadeAtual: number; quantidadeReservada: number; quantidadeBloqueada: number; quantidadeDisponivel: number; quantidadeMinima: number; localizacaoPrateleira: string; status: string }
type Alerts = { vencidos: Balance[]; proximosVencimento: Balance[]; estoqueBaixo: Balance[] }
type OpType = 'SAIDA' | 'TRANSFERENCIA' | 'DEVOLUCAO'
const units = [['UN','Unidade'],['KG','Quilograma'],['G','Grama'],['L','Litro'],['ML','Mililitro'],['M','Metro'],['M2','Metro quadrado'],['M3','Metro cúbico'],['CX','Caixa'],['PCT','Pacote']]
const fmt = (v?: string) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR') : 'Não informada'

export default function StockPanelV2() {
  const [products, setProducts] = useState<Product[]>([]), [balances, setBalances] = useState<Balance[]>([]), [warehouses, setWarehouses] = useState<Warehouse[]>([]), [alerts, setAlerts] = useState<Alerts>({ vencidos: [], proximosVencimento: [], estoqueBaixo: [] })
  const [search, setSearch] = useState(''), [site, setSite] = useState(''), [modal, setModal] = useState<'product'|'move'|null>(null), [type, setType] = useState<OpType>('SAIDA')
  const [sourceBalance, setSourceBalance] = useState(''), [destination, setDestination] = useState(''), [returnProduct, setReturnProduct] = useState(''), [newProductWarehouse, setNewProductWarehouse] = useState(''), [isEpiDraft, setIsEpiDraft] = useState(false)
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [scan, setScan] = useState(false)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const load = async () => {
    try { const [p,b,w,a] = await Promise.all([request<Product[]>('/stock/products'),request<Balance[]>('/stock/balances'),request<Warehouse[]>('/warehouses'),request<Alerts>('/stock/balances/alerts')]); setProducts(p);setBalances(b);setWarehouses(w);setAlerts(a) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar o estoque.') }
  }
  useEffect(() => { void load() }, [])
  const sites = useMemo(() => Array.from(new Map(warehouses.filter(w=>w.obra).map(w=>[w.obra!.id,w.obra!])).values()), [warehouses])
  const options = useMemo(() => products.filter(p => (!site || String(p.galpao?.obra?.id)===site) && [p.nome,p.codigo,p.galpao?.nome,p.galpao?.obra?.nome,p.lote].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[products,search,site])
  const eligibleSources = balances.filter(b => Number(b.quantidadeDisponivel)>0 && (!b.dataValidade || b.dataValidade>=new Date().toISOString().slice(0,10)) && b.status!=='BLOQUEADO')
  const warehouseOptions = warehouses.map(w=>({value:String(w.id),label:w.nome,description:w.obra?.nome||'Sem obra vinculada'}))
  const productOptions = products.map(p=>({value:String(p.id),label:`${p.codigo} · ${p.nome}`,description:p.unidade||'UN'}))
  const balanceOptions = eligibleSources.map(b=>({value:String(b.id),label:`${b.produto.codigo} · ${b.produto.nome} · ${b.lote}`,description:`${b.galpao.obra?.nome||''} ${b.galpao.nome} · disponível ${b.quantidadeDisponivel} ${b.produto.unidade}`}))

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);setMessage('');const f=new FormData(event.currentTarget)
    try {
      if(!newProductWarehouse) throw new Error('Selecione o galpão do saldo inicial.')
      if(isEpiDraft&&(!f.get('numeroCa')||!f.get('validadeCa'))) throw new Error('Informe o número e a validade do CA para cadastrar um EPI.')
      await request('/stock/products',{method:'POST',body:JSON.stringify({codigo:f.get('codigo'),nome:f.get('nome'),unidade:f.get('unidade'),quantidadeAtual:Number(f.get('saldo')),quantidadeMinima:Number(f.get('minimo')),lote:f.get('lote')||null,dataValidade:f.get('validade')||null,localizacaoPrateleira:f.get('localizacao')||null,galpao:{id:Number(newProductWarehouse)},epi:isEpiDraft,numeroCa:isEpiDraft?f.get('numeroCa'):null,validadeCa:isEpiDraft?f.get('validadeCa'):null})})
      setModal(null);setIsEpiDraft(false);setNewProductWarehouse('');setMessage('Produto cadastrado no catálogo e vinculado ao galpão.');await load()
    } catch(error) { setMessage(error instanceof Error?error.message:'Não foi possível cadastrar o produto.') } finally { setBusy(false) }
  }

  async function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage('');const f=new FormData(event.currentTarget)
    try {
      let payload: Record<string,unknown>
      if(type==='DEVOLUCAO') {
        if(!returnProduct||!destination) throw new Error('Selecione o produto e o galpão de destino.')
        payload={tipo:type,produtoId:Number(returnProduct),galpaoDestinoId:Number(destination),lote:String(f.get('lote')||'').trim(),dataValidade:f.get('validade')||null,localizacaoDestino:f.get('localizacao')||'NAO_ENDERECADO',quantidade:Number(f.get('qtd')),motivo:f.get('motivo')}
      } else {
        const balance=eligibleSources.find(b=>String(b.id)===sourceBalance)
        if(!balance) throw new Error('Selecione um lote com saldo disponível.')
        if(type==='TRANSFERENCIA'&&!destination) throw new Error('Selecione o galpão de destino.')
        if(type==='SAIDA'&&!destination) throw new Error('Selecione a obra de destino.')
        payload={tipo:type,produtoId:balance.produto.id,saldoOrigemId:balance.id,galpaoOrigemId:balance.galpao.id,galpaoDestinoId:type==='TRANSFERENCIA'?Number(destination):null,obraId:type==='SAIDA'?Number(destination):null,lote:balance.lote,localizacaoOrigem:balance.localizacaoPrateleira,quantidade:Number(f.get('qtd')),motivo:f.get('motivo')}
      }
      await request('/inventory/operations',{method:'POST',body:JSON.stringify(payload)});setModal(null);setSourceBalance('');setDestination('');setReturnProduct('');setMessage('Movimentação registrada no histórico.');await load()
    } catch(error) { setMessage(error instanceof Error?error.message:'Não foi possível movimentar o estoque.') } finally { setBusy(false) }
  }

  return <section className="panel-page">
    <div className="page-heading"><div><p className="eyebrow">LOGÍSTICA · ALMOXARIFADO</p><h1>Estoque por obra</h1><p>Consulte produtos e lotes. Saídas e transferências baixam saldos identificados e geram histórico.</p></div><div className="table-actions"><button className="secondary-button" onClick={()=>setScan(true)}>Ler código</button><button className="secondary-button" onClick={()=>{setType('DEVOLUCAO');setModal('move')}}>Registrar devolução</button><button className="primary-button" onClick={()=>setModal('product')}>Novo produto</button><button className="primary-button" onClick={()=>{setType('SAIDA');setModal('move')}}>Movimentar</button></div></div>
    {scan&&<CameraScanner onRead={value=>{const target=parseQrTarget(value);if(target){window.location.assign(`/?${target.kind}=${target.id}`);return}setSearch(value);setMessage(`Busca aplicada para o código ${value}.`)}} onClose={()=>setScan(false)}/>}
    {message&&<p className="feedback" role="status">{message}</p>}
    <ModuleMetrics items={[{label:'Produtos cadastrados',value:products.length,detail:'Catálogo operacional',icon:<Package/>,tone:'blue'},{label:'Abaixo do mínimo',value:alerts.estoqueBaixo.length,detail:'Revisar reposição',icon:<AlertTriangle/>,tone:'red'},{label:'Próximos do vencimento',value:alerts.proximosVencimento.length,detail:'Lotes em até 30 dias',icon:<CalendarClock/>,tone:'amber'},{label:'Lotes vencidos',value:alerts.vencidos.length,detail:'Bloqueados para saída',icon:<Boxes/>,tone:'red'}]}/>
    <div className="stock-filter-row"><label className="module-search-label"><span>Pesquisar produto, código, lote, obra ou galpão</span><input className="module-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Digite para filtrar os itens cadastrados"/></label><label className="module-search-label"><span>Filtrar por obra</span><select className="module-search" value={site} onChange={e=>setSite(e.target.value)}><option value="">Todas as obras</option>{sites.map(s=><option value={s.id} key={s.id}>{s.nome}</option>)}</select></label></div>
    <div className="table-card"><table><thead><tr><th>Produto</th><th>Obra / galpão</th><th>Lote / validade</th><th>Saldo total</th><th>Classificação</th><th>Situação</th><th>Acesso</th></tr></thead><tbody>{options.map(p=><tr key={p.id}><td><b>{p.nome}</b><small>{p.codigo}{(p.epi||p.isEpi)?` · EPI · CA ${p.numeroCa||'pendente'}`:''}</small></td><td>{p.galpao?.obra?.nome||'—'}<small>{p.galpao?.nome||'Saldo distribuído por lote'}</small></td><td>{p.lote||'Consulte saldos por lote'}<small>{fmt(p.dataValidade)}</small></td><td>{p.quantidadeAtual} {p.unidade}<small>Mínimo {p.quantidadeMinima} {p.unidade}</small></td><td><span className={`status ${(p.epi||p.isEpi)?'ok':''}`}>{(p.epi||p.isEpi)?'EPI':'Material'}</span></td><td><span className={`status ${p.baixoEstoque?'danger':'ok'}`}>{p.baixoEstoque?'Repor estoque':'Regular'}</span></td><td><button className="qr-action-button" title={`Gerar QR Code de ${p.nome}`} aria-label={`Gerar QR Code de ${p.nome}`} onClick={()=>setQrProduct(p)}><QrCode size={18}/><span>QR Code</span></button></td></tr>)}{!options.length&&<tr><td colSpan={7}><div className="empty-state">Nenhum produto encontrado para este filtro.</div></td></tr>}</tbody></table></div>
    {!!balances.length&&<section className="stock-lot-section"><div className="inventory-detail-heading"><div><p className="eyebrow">RASTREABILIDADE</p><h2>Saldos por lote e localização</h2></div><span>{balances.length} registros de saldo</span></div><div className="table-card"><table><thead><tr><th>Produto</th><th>Obra / galpão</th><th>Lote / prateleira</th><th>Validade</th><th>Total</th><th>Reservado</th><th>Bloqueado</th><th>Disponível</th></tr></thead><tbody>{balances.map(b=><tr key={b.id}><td><b>{b.produto.nome}</b><small>{b.produto.codigo}</small></td><td>{b.galpao.obra?.nome||'—'}<small>{b.galpao.nome}</small></td><td>{b.lote}<small>{b.localizacaoPrateleira||'Não endereçado'}</small></td><td>{fmt(b.dataValidade)}</td><td>{b.quantidadeAtual} {b.produto.unidade}</td><td>{b.quantidadeReservada||0}</td><td>{b.quantidadeBloqueada||0}</td><td><b className={b.quantidadeDisponivel<=b.quantidadeMinima?'danger-text':''}>{b.quantidadeDisponivel} {b.produto.unidade}</b></td></tr>)}</tbody></table></div></section>}
    <Modal open={modal==='product'} title="Novo produto do catálogo" onClose={()=>!busy&&setModal(null)}><form className="product-form" onSubmit={saveProduct}>
      <label>Código interno<input name="codigo" placeholder="Código do catálogo" required/></label><label>Nome do produto<input name="nome" placeholder="Nome padronizado" required/></label>
      <label>Unidade<select name="unidade" defaultValue="UN">{units.map(([value,label])=><option key={value} value={value}>{label} ({value})</option>)}</select></label>
      <label>Saldo inicial<input name="saldo" type="number" min="0" step="0.01" defaultValue="0" required/></label><label>Estoque mínimo<input name="minimo" type="number" min="0" step="0.01" defaultValue="0" required/></label>
      <label>Galpão do saldo inicial<SearchableSelect ariaLabel="Galpão do saldo inicial" value={newProductWarehouse} options={warehouseOptions} onChange={setNewProductWarehouse} placeholder="Pesquisar obra ou galpão"/></label>
      <label>Lote inicial<input name="lote" placeholder="Ex.: LT-2026-08"/></label><label>Validade do lote<input name="validade" type="date"/></label><label>Prateleira / localização<input name="localizacao" placeholder="Ex.: A-02-P03"/></label>
      <label className="checkbox-field"><input type="checkbox" checked={isEpiDraft} onChange={e=>setIsEpiDraft(e.target.checked)}/>Cadastrar este produto como EPI</label>
      {isEpiDraft&&<><label>Número do CA<input name="numeroCa" placeholder="Certificado de Aprovação" required/></label><label>Validade do CA<input name="validadeCa" type="date" min={new Date().toISOString().slice(0,10)} required/></label></>}
      <button className="primary-button" disabled={busy}>{busy?'Salvando…':'Cadastrar no catálogo'}</button>
    </form></Modal>
    <Modal open={modal==='move'} title={type==='DEVOLUCAO'?'Devolução ao estoque':'Movimentar estoque'} onClose={()=>!busy&&setModal(null)}><form className="product-form" onSubmit={move}>
      <label>Tipo de operação<select value={type} onChange={e=>{setType(e.target.value as OpType);setSourceBalance('');setDestination('')}}><option value="SAIDA">Consumo / saída para obra</option><option value="TRANSFERENCIA">Transferência entre galpões</option><option value="DEVOLUCAO">Devolução ao estoque</option></select></label>
      {type==='DEVOLUCAO'?<><label>Produto cadastrado<SearchableSelect ariaLabel="Produto devolvido" value={returnProduct} options={productOptions} onChange={setReturnProduct} placeholder="Pesquisar produto ou código"/></label><label>Galpão de destino<SearchableSelect ariaLabel="Galpão de destino da devolução" value={destination} options={warehouseOptions} onChange={setDestination} placeholder="Pesquisar obra ou galpão"/></label><label>Lote devolvido<input name="lote" placeholder="Identificação do lote" required/></label><label>Validade do lote<input name="validade" type="date"/></label><label>Localização<input name="localizacao" placeholder="Prateleira de destino"/></label></>:<><label>Produto, lote e saldo de origem<SearchableSelect ariaLabel="Saldo de origem" value={sourceBalance} options={balanceOptions} onChange={setSourceBalance} placeholder="Pesquisar produto, CA, lote ou galpão"/></label><label>{type==='SAIDA'?'Obra de destino':'Galpão de destino'}<SearchableSelect ariaLabel={type==='SAIDA'?'Obra de destino':'Galpão de destino'} value={destination} options={type==='SAIDA'?sites.map(s=>({value:String(s.id),label:s.nome})):warehouseOptions} onChange={setDestination} placeholder={type==='SAIDA'?'Pesquisar obra cadastrada':'Pesquisar galpão cadastrado'}/></label></>}
      <label>Quantidade<input name="qtd" type="number" min="0.01" step="0.01" placeholder="0" required/></label><label>Motivo<input name="motivo" placeholder="Motivo operacional" required/></label>
      <button className="primary-button" disabled={busy||(type==='DEVOLUCAO'?(!returnProduct||!destination):(!sourceBalance||!destination))}>{busy?'Processando…':'Confirmar operação e gerar histórico'}</button>
    </form></Modal>
    <QrCodeDialog target={qrProduct?{kind:'produto',id:qrProduct.id}:null} title={qrProduct?.nome||''} code={qrProduct?.codigo||''} onClose={()=>setQrProduct(null)}/>
  </section>
}
