import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, CalendarClock, ClipboardList, QrCode, Wrench } from 'lucide-react'
import { request } from '../api'
import Modal from './Modal'
import CameraScanner from './CameraScanner'
import SearchableSelect from './SearchableSelect'
import ModuleMetrics from './ModuleMetrics'
import QrCodeDialog from './QrCodeDialog'
import { parseQrTarget } from '../utils/qrDestination'

type Site={id:number;codigo?:string;nome:string}
type Warehouse={id:number;nome:string;obra?:Site}
type Employee={id:number;nome:string;cpf:string;funcao?:string;matricula?:string;status?:string;obra?:{nome?:string}}
type Tool={id:number;patrimonio:string;nome:string;categoria?:string;marca?:string;modelo?:string;estadoConservacao:string;status:string;localizacao?:string;galpao?:Warehouse}
type Loan={id:number;ferramenta:Tool;responsavelNome:string;responsavelCpf:string;obra?:string;obraId?:number;devolucaoPrevista?:string;devolvidoEm?:string;status:string;comprovanteCodigo:string;atrasado:boolean}
type ModalKind='tool'|'loan'|'return'|null
const categories=['Ferramentas manuais','Máquinas e equipamentos','Equipamentos de medição','Equipamentos de segurança','Equipamentos elétricos']

export default function ToolsPanel(){
 const[tools,setTools]=useState<Tool[]>([]),[loans,setLoans]=useState<Loan[]>([]),[employees,setEmployees]=useState<Employee[]>([]),[sites,setSites]=useState<Site[]>([]),[warehouses,setWarehouses]=useState<Warehouse[]>([])
 const[modal,setModal]=useState<ModalKind>(null),[selected,setSelected]=useState<Tool|Loan|null>(null),[scan,setScan]=useState(false),[search,setSearch]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const[qrTool,setQrTool]=useState<Tool|null>(null)
 const[employeeCpf,setEmployeeCpf]=useState(''),[siteId,setSiteId]=useState(''),[warehouseId,setWarehouseId]=useState('')
 const load=async()=>{const[t,l,e,s,w]=await Promise.all([request<Tool[]>('/tools'),request<Loan[]>('/tools/loans'),request<Employee[]>('/employees'),request<Site[]>('/construction-sites'),request<Warehouse[]>('/warehouses')]);setTools(t);setLoans(l);setEmployees(e);setSites(s);setWarehouses(w)}
 useEffect(()=>{void load().catch(error=>setMessage(error.message))},[])
 const found=useMemo(()=>tools.filter(tool=>[tool.patrimonio,tool.nome,tool.marca,tool.modelo,tool.categoria].some(value=>value?.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))),[tools,search])
 const people=employees.filter(employee=>(employee.status||'ATIVO').toUpperCase()==='ATIVO').map(employee=>({value:employee.cpf,label:employee.nome,description:[employee.funcao,employee.matricula&&`Matrícula ${employee.matricula}`,employee.cpf,employee.obra?.nome].filter(Boolean).join(' · ')}))
 const siteOptions=sites.map(site=>({value:String(site.id),label:site.nome,description:site.codigo||''}))
 const warehouseOptions=warehouses.map(warehouse=>({value:String(warehouse.id),label:warehouse.nome,description:warehouse.obra?.nome||''}))
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget);try{
  if(modal==='tool'){if(!warehouseId)throw new Error('Selecione o galpão onde a ferramenta será controlada.');const qs=new URLSearchParams({galpaoId:warehouseId});await request(`/tools?${qs}`,{method:'POST',body:JSON.stringify({patrimonio:form.get('patrimonio'),nome:form.get('nome'),categoria:form.get('categoria'),marca:form.get('marca'),modelo:form.get('modelo'),localizacao:form.get('localizacao')})})}
  if(modal==='loan'){if(!employeeCpf||!siteId)throw new Error('Selecione o responsável e a obra cadastrados.');await request(`/tools/${(selected as Tool).id}/loan`,{method:'POST',body:JSON.stringify({responsavelCpf:employeeCpf,obraId:Number(siteId),frenteServico:form.get('frente'),devolucaoPrevista:form.get('prazo'),observacoes:form.get('observacoes')})})}
  if(modal==='return')await request(`/tools/loans/${(selected as Loan).id}/return`,{method:'POST',body:JSON.stringify({estadoDevolucao:form.get('estado'),observacoes:form.get('observacoes')})})
  setModal(null);setSelected(null);setMessage('Operação de ferramenta registrada.');await load()
 }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir a operação.')}finally{setBusy(false)}}
 return <section className="panel-page">
  <div className="page-heading"><div><p className="eyebrow">PATRIMÔNIO · RASTREABILIDADE</p><h1>Ferramentas e equipamentos</h1><p>Controle a localização, os empréstimos, os responsáveis do RH e a devolução por obra.</p></div><div className="table-actions"><button className="secondary-button" onClick={()=>setScan(true)}>Ler código</button><button className="primary-button" onClick={()=>{setWarehouseId('');setModal('tool')}}><Wrench size={17}/> Nova ferramenta</button></div></div>
  {message&&<p className="feedback" role="status">{message}</p>}
  <ModuleMetrics items={[{label:'Ativos cadastrados',value:tools.length,detail:'Ferramentas e equipamentos',icon:<Wrench/>,tone:'blue'},{label:'Disponíveis',value:tools.filter(tool=>tool.status==='DISPONIVEL').length,detail:'Podem ser emprestados',icon:<Boxes/>,tone:'green'},{label:'Empréstimos ativos',value:loans.filter(loan=>loan.status==='EMPRESTADO').length,detail:'Com responsáveis vinculados',icon:<ClipboardList/>,tone:'amber'},{label:'Em atraso',value:loans.filter(loan=>loan.atrasado).length,detail:'Requerem devolução',icon:<AlertTriangle/>,tone:'red'}]}/>
  <label className="module-search-label"><span>Pesquisar patrimônio, código, nome ou categoria</span><input className="module-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Digite para filtrar ferramentas cadastradas"/></label>
  <div className="tool-grid">{found.map(tool=><article key={tool.id}><div><span className={`status ${tool.status==='DISPONIVEL'?'ok':'warning'}`}>{tool.status.replace(/_/g,' ')}</span><small>{tool.patrimonio}</small></div><h3>{tool.nome}</h3><p>{tool.categoria||'Sem categoria'} · {tool.marca||'Marca não informada'} {tool.modelo||''}</p><p>{tool.galpao?.obra?.nome||'—'} · {tool.galpao?.nome||tool.localizacao||'Local não informado'}</p><div className="tool-card-actions"><button className="secondary-button" onClick={()=>setQrTool(tool)}><QrCode size={17}/> QR Code</button>{tool.status==='DISPONIVEL'&&<button className="primary-button" onClick={()=>{setSelected(tool);setEmployeeCpf('');setSiteId('');setModal('loan')}}>Registrar empréstimo</button>}</div></article>)}</div>
  <div className="kardex-header"><div><p className="eyebrow">RESPONSABILIDADE E PRAZOS</p><h2>Histórico de empréstimos</h2></div></div>
  <div className="table-card"><table><thead><tr><th>Ferramenta</th><th>Funcionário</th><th>Obra</th><th>Prazo</th><th>Comprovante</th><th>Situação</th><th></th></tr></thead><tbody>{loans.map(loan=><tr key={loan.id}><td><b>{loan.ferramenta.nome}</b><small>{loan.ferramenta.patrimonio}</small></td><td>{loan.responsavelNome}<small>{loan.responsavelCpf}</small></td><td>{loan.obra||'—'}</td><td>{loan.devolucaoPrevista?new Date(loan.devolucaoPrevista).toLocaleString('pt-BR'):'Não informada'}</td><td>{loan.comprovanteCodigo}</td><td><span className={`status ${loan.atrasado?'danger':'ok'}`}>{loan.atrasado?'ATRASADO':loan.status}</span></td><td>{loan.status==='EMPRESTADO'&&<button className="secondary-button" onClick={()=>{setSelected(loan);setModal('return')}}>Devolver</button>}</td></tr>)}{!loans.length&&<tr><td colSpan={7}><div className="empty-state">Nenhum empréstimo registrado.</div></td></tr>}</tbody></table></div>
  {scan&&<CameraScanner onRead={value=>{const target=parseQrTarget(value);if(target){window.location.assign(`/?${target.kind}=${target.id}`);return}setSearch(value)}} onClose={()=>setScan(false)}/>}
  <Modal open={!!modal} title={modal==='tool'?'Cadastrar ferramenta':modal==='loan'?'Registrar empréstimo':'Registrar devolução'} onClose={()=>!busy&&setModal(null)}><form className="product-form" onSubmit={submit}>
   {modal==='tool'&&<><label>Patrimônio (identificador patrimonial)<input name="patrimonio" placeholder="Ex.: FER-0021" required/></label><label>Nome da ferramenta<input name="nome" placeholder="Nome padronizado" required/></label><label>Categoria<select name="categoria" defaultValue="" required><option value="" disabled>Selecione uma categoria</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Marca<input name="marca" placeholder="Marca"/></label><label>Modelo<input name="modelo" placeholder="Modelo"/></label><label>Galpão<SearchableSelect ariaLabel="Galpão da ferramenta" value={warehouseId} options={warehouseOptions} onChange={setWarehouseId} placeholder="Pesquisar obra ou galpão"/></label><label>Localização física<input name="localizacao" placeholder="Prateleira ou setor"/></label></>}
   {modal==='loan'&&<><label>Funcionário responsável<SearchableSelect ariaLabel="Funcionário responsável" value={employeeCpf} options={people} onChange={setEmployeeCpf} placeholder="Pesquisar nome, cargo, matrícula ou CPF"/></label><label>Obra de uso<SearchableSelect ariaLabel="Obra de uso" value={siteId} options={siteOptions} onChange={setSiteId} placeholder="Pesquisar obra cadastrada"/></label><label>Frente de serviço<input name="frente" placeholder="Frente de serviço"/></label><label>Devolução prevista<input name="prazo" type="datetime-local" required/></label><label>Observações<input name="observacoes" placeholder="Observações do empréstimo"/></label></>}
   {modal==='return'&&<><label>Condição da devolução<select name="estado" required><option value="BOM">Bom</option><option value="REGULAR">Regular</option><option value="AVARIADO">Avariado</option><option value="DANIFICADO">Danificado</option></select></label><label>Observações de inspeção<input name="observacoes" placeholder="Estado, dano ou reparo"/></label></>}
   <button className="primary-button" disabled={busy||modal==='loan'&&(!employeeCpf||!siteId)||modal==='tool'&&!warehouseId}>{busy?'Salvando…':'Confirmar operação'}</button>
  </form></Modal>
  <QrCodeDialog target={qrTool?{kind:'ferramenta',id:qrTool.id}:null} title={qrTool?.nome||''} code={qrTool?.patrimonio||''} onClose={()=>setQrTool(null)}/>
 </section>
}
