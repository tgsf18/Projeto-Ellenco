import { FormEvent, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, HardHat, PackageCheck, UserRound, MessageSquarePlus, Check, X } from 'lucide-react'
import { AuthUser, request } from '../api'
import Modal from './Modal'
import SignatureModal from './SignatureModal'
import SearchableSelect, { SelectOption } from './SearchableSelect'
import ModuleMetrics from './ModuleMetrics'
import { useModuleRefresh } from '../useModuleRefresh'

type Employee = { id: number; nome: string; cpf: string; matricula?: string; funcao?: string; status?: string; obra?: { nome?: string } }
type Product = { id: number; codigo: string; nome: string; unidade?: string; numeroCa?: string; validadeCa?: string; epi?: boolean; isEpi?: boolean }
type Warehouse = { id: number; nome: string; obra?: { nome?: string } }
type Balance = { id: number; produto: Product; galpao: Warehouse; lote: string; dataValidade?: string; quantidadeDisponivel: number; localizacaoPrateleira?: string; status: string }
type Epi = { id: number; funcionarioNome: string; funcionarioCpf: string; produtoNome: string; numeroCa: string; quantidade: number; produtoId?: number; saldoEstoqueId?: number; dataPrevisaoTroca?: string; status: string; termoAssinado?: boolean; assinaturaDigital?: string; vencido?: boolean; proximoVencimento?: boolean }
type Alerts = { vencidos: Epi[]; proximosVencimento: Epi[] }
type Draft = { funcionarioCpf: string; saldoEstoqueId: string; quantidade: string; dataPrevisaoTroca: string }
type EpiRequestItem = { id: number; funcionario: Employee; produto: Product; quantidade: number; motivo: string; status: string; solicitadaEm: string; analisadaPorNome?: string; analisadaEm?: string; observacaoDecisao?: string; entrega?: Epi }
type RequestCatalogItem = Product & { quantidadeDisponivel: number }
const emptyDraft: Draft = { funcionarioCpf: '', saldoEstoqueId: '', quantidade: '1', dataPrevisaoTroca: '' }
const today = () => new Date().toISOString().slice(0, 10)
const formatDate = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : 'Não informada'

export default function EpiPanelV2({ user }: { user: AuthUser }) {
  const [deliveries, setDeliveries] = useState<Epi[]>([])
  const [alerts, setAlerts] = useState<Alerts>({ vencidos: [], proximosVencimento: [] })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [replace, setReplace] = useState<Epi | null>(null)
  const [sign, setSign] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [requests, setRequests] = useState<EpiRequestItem[]>([])
  const [requestCatalog, setRequestCatalog] = useState<RequestCatalogItem[]>([])
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestDraft, setRequestDraft] = useState({ produtoId: '', quantidade: '1', motivo: '' })
  const [reviewRequest, setReviewRequest] = useState<EpiRequestItem | null>(null)
  const [reviewDraft, setReviewDraft] = useState({ saldoEstoqueId: '', dataPrevisaoTroca: '', observacao: '' })

  const load = async () => {
    try {
      const [d, a, r] = await Promise.all([request<Epi[]>('/epi'), request<Alerts>('/epi/alerts'), request<EpiRequestItem[]>('/epi/requests')])
      setDeliveries(d); setAlerts(a); setRequests(r)
      if (user.role !== 'FUNCIONARIO') {
        const [e, b] = await Promise.all([request<Employee[]>('/employees'), request<Balance[]>('/stock/balances')])
        setEmployees(e); setBalances(b)
      } else {
        setRequestCatalog(await request<RequestCatalogItem[]>('/epi/requests/catalog'))
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados de EPI.') }
  }
  useModuleRefresh(load)

  const eligibleBalances = useMemo(() => balances.filter(balance => {
    const product = balance.produto
    return (product.epi || product.isEpi) && Boolean(product.numeroCa) && Boolean(product.validadeCa) &&
      product.validadeCa! >= today() && Boolean(balance.lote) && balance.lote !== 'SEM_LOTE' &&
      Boolean(balance.dataValidade) && balance.dataValidade! >= today() &&
      Number(balance.quantidadeDisponivel) > 0 && balance.status !== 'BLOQUEADO'
  }), [balances])

  const employeeOptions: SelectOption[] = useMemo(() => employees.filter(e => (e.status || 'ATIVO').toUpperCase() === 'ATIVO').map(e => ({
    value: e.cpf,
    label: e.nome,
    description: [e.funcao, e.matricula && `Matrícula ${e.matricula}`, e.cpf, e.obra?.nome].filter(Boolean).join(' · ')
  })), [employees])

  const balanceOptions: SelectOption[] = useMemo(() => eligibleBalances.map(b => ({
    value: String(b.id),
    label: `${b.produto.codigo} · ${b.produto.nome} · CA ${b.produto.numeroCa}`,
    description: `${b.galpao.obra?.nome ? `${b.galpao.obra.nome} / ` : ''}${b.galpao.nome} · Lote ${b.lote} · ${b.quantidadeDisponivel} ${b.produto.unidade || 'UN'} · validade ${formatDate(b.dataValidade)} · CA até ${formatDate(b.produto.validadeCa)}`
  })), [eligibleBalances])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR')
    if (!q) return deliveries
    return deliveries.filter(item => [item.funcionarioNome, item.funcionarioCpf, item.produtoNome, item.numeroCa, item.status].some(value => value?.toLocaleLowerCase('pt-BR').includes(q)))
  }, [deliveries, search])

  function start(replacement?: Epi) {
    setReplace(replacement || null)
    setDraft({ funcionarioCpf: replacement?.funcionarioCpf || '', saldoEstoqueId: '', quantidade: String(replacement?.quantidade || 1), dataPrevisaoTroca: '' })
    setOpen(true)
    setMessage('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const balance = eligibleBalances.find(item => String(item.id) === draft.saldoEstoqueId)
    if (!employeeOptions.some(employee => employee.value === draft.funcionarioCpf)) return setMessage('Selecione um funcionário ativo cadastrado no RH.')
    if (!balance) return setMessage('Selecione um lote de EPI válido e disponível no estoque.')
    if (Number(draft.quantidade) > Number(balance.quantidadeDisponivel)) return setMessage(`O lote selecionado tem ${balance.quantidadeDisponivel} ${balance.produto.unidade || 'UN'} disponíveis.`)
    if (!draft.dataPrevisaoTroca || draft.dataPrevisaoTroca < today()) return setMessage('Informe uma data de troca futura ou de hoje.')
    setBusy(true); setMessage('')
    try {
      const employee = employees.find(item => item.cpf === draft.funcionarioCpf)!
      const body = {
        funcionarioCpf: employee.cpf, funcionarioNome: employee.nome,
        produtoId: balance.produto.id, produtoNome: balance.produto.nome, numeroCa: balance.produto.numeroCa,
        saldoEstoqueId: balance.id, quantidade: Number(draft.quantidade), dataPrevisaoTroca: draft.dataPrevisaoTroca
      }
      await request(replace ? `/epi/${replace.id}/replace` : '/epi', { method: 'POST', body: JSON.stringify(body) })
      setOpen(false); setReplace(null); setDraft(emptyDraft)
      setMessage(replace ? 'Substituição registrada. O saldo foi atualizado e a nova entrega aguarda assinatura.' : 'Entrega registrada. O saldo foi atualizado e aguarda a assinatura do funcionário.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível registrar a entrega.') }
    finally { setBusy(false) }
  }

  const selectedBalance = eligibleBalances.find(balance => String(balance.id) === draft.saldoEstoqueId)
  const requestProductOptions: SelectOption[] = requestCatalog.map(item => ({ value: String(item.id), label: `${item.codigo} · ${item.nome} · CA ${item.numeroCa}`, description: `${item.quantidadeDisponivel} ${item.unidade || 'UN'} disponíveis` }))
  const reviewBalances = reviewRequest ? eligibleBalances.filter(item => item.produto.id === reviewRequest.produto.id) : []
  const reviewBalanceOptions: SelectOption[] = reviewBalances.map(item => ({ value: String(item.id), label: `${item.galpao.nome} · Lote ${item.lote}`, description: `${item.quantidadeDisponivel} ${item.produto.unidade || 'UN'} disponíveis · validade ${formatDate(item.dataValidade)}` }))

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      await request('/epi/requests', { method: 'POST', body: JSON.stringify({ produtoId: Number(requestDraft.produtoId), quantidade: Number(requestDraft.quantidade), motivo: requestDraft.motivo }) })
      setRequestOpen(false); setRequestDraft({ produtoId: '', quantidade: '1', motivo: '' }); setMessage('Solicitação enviada para análise.'); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar o EPI.') }
    finally { setBusy(false) }
  }

  async function review(action: 'approve' | 'reject') {
    if (!reviewRequest) return
    setBusy(true); setMessage('')
    try {
      if (action === 'approve') {
        if (!reviewDraft.saldoEstoqueId || !reviewDraft.dataPrevisaoTroca) throw new Error('Selecione o lote e a previsão de troca.')
        await request(`/epi/requests/${reviewRequest.id}/approve`, { method: 'POST', body: JSON.stringify({ saldoEstoqueId: Number(reviewDraft.saldoEstoqueId), dataPrevisaoTroca: reviewDraft.dataPrevisaoTroca, observacao: reviewDraft.observacao }) })
        setMessage('Solicitação aprovada. A entrega foi registrada e o estoque baixado; o funcionário ainda precisa confirmar o recebimento.')
      } else {
        if (!reviewDraft.observacao.trim()) throw new Error('Informe o motivo da rejeição.')
        await request(`/epi/requests/${reviewRequest.id}/reject`, { method: 'POST', body: JSON.stringify({ observacao: reviewDraft.observacao }) })
        setMessage('Solicitação rejeitada com justificativa registrada.')
      }
      setReviewRequest(null); setReviewDraft({ saldoEstoqueId: '', dataPrevisaoTroca: '', observacao: '' }); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a análise.') }
    finally { setBusy(false) }
  }

  async function cancelRequest(id: number) {
    try { await request(`/epi/requests/${id}/cancel`, { method: 'POST' }); setMessage('Solicitação cancelada.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cancelar a solicitação.') }
  }

  return <section className="panel-page">
    <div className="page-heading"><div><p className="eyebrow">SEGURANÇA DO TRABALHO · ESTOQUE</p><h1>Entrega e validade de EPI</h1><p>{user.role==='FUNCIONARIO'?'Consulte seus EPIs, prazos e comprovantes, ou solicite um item disponível.':'Cada entrega usa um lote cadastrado, baixa o saldo e fica vinculada ao aceite do funcionário.'}</p></div><div className="table-actions">{user.role==='FUNCIONARIO'?<button className="primary-button" onClick={() => setRequestOpen(true)}><MessageSquarePlus size={17}/> Solicitar EPI</button>:<button className="primary-button" onClick={() => start()}><HardHat size={17}/> Registrar entrega</button>}</div></div>
    {message && <p className="feedback" role="status">{message}</p>}
    <ModuleMetrics items={[
      { label: 'Entregas registradas', value: deliveries.length, detail: 'Histórico total', icon: <PackageCheck/>, tone: 'blue' },
      { label: 'Aguardando assinatura', value: deliveries.filter(x => x.status === 'PENDENTE_ASSINATURA').length, detail: 'Ação pendente', icon: <UserRound/>, tone: 'amber' },
      { label: 'Troca em até 30 dias', value: alerts.proximosVencimento.length, detail: 'Planejar reposição', icon: <AlertTriangle/>, tone: 'amber' },
      { label: 'Troca vencida', value: alerts.vencidos.length, detail: 'Prioridade de segurança', icon: <BadgeCheck/>, tone: 'red' }
    ]}/>

    {/* SEÇÃO SOLICITAÇÕES DE EPI (CSS CORRIGIDO E RESPONSIVO) */}
    <section className="epi-requests">
      <div className="epi-requests-header">
        <div>
          <h2>{user.role === 'FUNCIONARIO' ? 'Minhas solicitações' : 'Solicitações de EPI'}</h2>
          <p>{user.role === 'FUNCIONARIO' ? 'Acompanhe o andamento e a decisão do responsável.' : 'Analise os pedidos. A aprovação cria a entrega e baixa o estoque do lote.'}</p>
        </div>
        <span className="status warning">{requests.filter(item => item.status === 'PENDENTE').length} pendentes</span>
      </div>

      {requests.length ? (
        <div className="epi-requests-table-wrapper">
          <table>
            <thead>
              <tr>
                {user.role !== 'FUNCIONARIO' && <th>Funcionário</th>}
                <th>EPI solicitado</th>
                <th>Quantidade / motivo</th>
                <th>Solicitada</th>
                <th>Situação</th>
                <th>Resposta / ação</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(item => (
                <tr key={item.id}>
                  {user.role !== 'FUNCIONARIO' && (
                    <td>
                      <b>{item.funcionario.nome}</b>
                      <small>{item.funcionario.cpf}</small>
                    </td>
                  )}
                  <td>
                    <b>{item.produto.nome}</b>
                    <small>CA {item.produto.numeroCa}</small>
                  </td>
                  <td>
                    <b>{item.quantidade} un.</b>
                    <small className="request-reason">{item.motivo}</small>
                  </td>
                  <td>{new Date(item.solicitadaEm).toLocaleString('pt-BR')}</td>
                  <td>
                    <span className={`status ${item.status === 'PENDENTE' ? 'warning' : item.status === 'APROVADA' ? 'ok' : 'danger'}`}>
                      {item.status}
                    </span>
                    {item.analisadaPorNome && <small>Por: {item.analisadaPorNome}</small>}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 items-start">
                      {item.status === 'PENDENTE' && user.role === 'FUNCIONARIO' && (
                        <button className="secondary-button" onClick={() => void cancelRequest(item.id)}>Cancelar</button>
                      )}
                      {item.status === 'PENDENTE' && user.role !== 'FUNCIONARIO' && (
                        <button className="primary-button" onClick={() => { setReviewRequest(item); setReviewDraft({ saldoEstoqueId: '', dataPrevisaoTroca: '', observacao: '' }) }}>Analisar</button>
                      )}
                      {item.status === 'APROVADA' && item.entrega && (
                        <small className="text-emerald font-semibold">Entrega #{item.entrega.id} · Aguarda aceite</small>
                      )}
                      {item.observacaoDecisao && (
                        <small className="request-decision-note">{item.observacaoDecisao}</small>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Nenhuma solicitação de EPI registrada no momento.</div>
      )}
    </section>

    <label className="module-search-label"><span>Buscar entregas</span><input className="module-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Funcionário, CPF, produto, CA ou situação"/></label>
    <div className="table-card"><table><thead><tr><th>Funcionário</th><th>EPI / CA</th><th>Almoxarifado / lote</th><th>Troca prevista</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      {filtered.map(item => {
        const source = balances.find(balance => balance.id === item.saldoEstoqueId)
        return <tr key={item.id}><td><b>{item.funcionarioNome}</b><small>{item.funcionarioCpf}</small></td><td>{item.produtoNome}<small>CA {item.numeroCa} · {item.quantidade || 1} un.</small></td><td>{source?.galpao?.obra?.nome || '—'}<small>{source ? `${source.galpao.nome} · ${source.lote}` : `Lote #${item.saldoEstoqueId || 'histórico'}`}</small></td><td>{formatDate(item.dataPrevisaoTroca)}<small>{item.vencido ? 'Prazo vencido' : item.proximoVencimento ? 'Vence em até 30 dias' : 'Dentro do prazo'}</small></td><td><span className={`status ${item.vencido || item.status === 'PENDENTE_ASSINATURA' ? 'danger' : item.proximoVencimento ? 'warning' : 'ok'}`}>{item.vencido ? 'TROCA VENCIDA' : item.status.replace(/_/g, ' ')}</span><small>{item.termoAssinado || item.assinaturaDigital ? 'Aceite digital registrado' : 'Aguardando aceite'}</small></td><td><div className="table-actions">{item.status === 'PENDENTE_ASSINATURA' && <button className="primary-button" onClick={() => setSign(item.id)}>Assinar</button>}{user.role!=='FUNCIONARIO'&&item.status === 'ENTREGUE' && <button className="secondary-button" onClick={() => start(item)}>Substituir</button>}</div></td></tr>
      })}
      {!filtered.length && <tr><td colSpan={6}><div className="empty-state">{deliveries.length ? 'Nenhum resultado para esta busca.' : 'Nenhuma entrega registrada.'}</div></td></tr>}
    </tbody></table></div>

    {/* MODAL SOLICITAR EPI */}
    <Modal open={requestOpen} title="Solicitar EPI" onClose={() => { if (!busy) setRequestOpen(false) }}>
      <form className="product-form" onSubmit={submitRequest}>
        <p className="wide text-sm text-muted">Escolha um item disponível no estoque. A quantidade será validada novamente quando o responsável analisar o pedido.</p>
        <label className="wide">EPI disponível<SearchableSelect ariaLabel="EPI disponível" value={requestDraft.produtoId} options={requestProductOptions} onChange={produtoId => setRequestDraft(current => ({...current, produtoId}))} placeholder="Pesquisar código, nome ou CA"/></label>
        {requestDraft.produtoId && <label className="wide">Quantidade<input type="number" min="1" max={requestCatalog.find(p => String(p.id) === requestDraft.produtoId)?.quantidadeDisponivel} step="1" value={requestDraft.quantidade} onChange={event => setRequestDraft(current => ({...current, quantidade:event.target.value}))} required/></label>}
        <label className="wide">Motivo da solicitação<textarea className="form-textarea" value={requestDraft.motivo} onChange={event => setRequestDraft(current => ({...current, motivo:event.target.value}))} maxLength={2000} rows={3} required placeholder="Informe a necessidade de uso ou motivo da troca"/></label>
        {!requestCatalog.length && <p className="form-error wide">Não há EPI elegível disponível. Estoque, lote e CA precisam estar dentro da validade.</p>}
        <button className="primary-button modal-submit wide" disabled={busy || !requestCatalog.length}>{busy ? 'Enviando…' : 'Enviar para aprovação'}</button>
      </form>
    </Modal>

    {/* MODAL ANALISAR SOLICITAÇÃO DE EPI */}
    <Modal open={Boolean(reviewRequest)} title="Analisar solicitação de EPI" onClose={() => {if (!busy) setReviewRequest(null)}}>
      {reviewRequest && (
        <div className="product-form">
          <div className="wide request-review-summary">
            <b>{reviewRequest.funcionario.nome}</b> solicita <b>{reviewRequest.quantidade} × {reviewRequest.produto.nome}</b>
            <p className="mt-1 text-sm text-muted">{reviewRequest.motivo}</p>
          </div>
          <label className="wide">Lote elegível<SearchableSelect ariaLabel="Lote elegível" value={reviewDraft.saldoEstoqueId} options={reviewBalanceOptions} onChange={saldoEstoqueId => setReviewDraft(current => ({...current,saldoEstoqueId}))} placeholder="Selecione o lote para a entrega"/></label>
          {reviewDraft.saldoEstoqueId && <label className="wide">Próxima troca<input type="date" min={today()} max={(() => {const b=reviewBalances.find(i=>String(i.id)===reviewDraft.saldoEstoqueId); return b ? [b.dataValidade,b.produto.validadeCa].filter(Boolean).sort()[0] : undefined})()} value={reviewDraft.dataPrevisaoTroca} onChange={event=>setReviewDraft(current=>({...current,dataPrevisaoTroca:event.target.value}))} required/></label>}
          <label className="wide">Observação da decisão<textarea className="form-textarea" value={reviewDraft.observacao} onChange={event=>setReviewDraft(current=>({...current,observacao:event.target.value}))} rows={3} placeholder="Obrigatória se rejeitar; opcional se aprovar"/></label>
          {!reviewBalanceOptions.length && <p className="form-error wide">O saldo elegível acabou ou o CA/lote venceu. Recarregue o estoque antes de aprovar.</p>}
          <div className="wide request-review-actions">
            <button className="secondary-button" onClick={()=>void review('reject')} disabled={busy}><X size={16}/> Rejeitar</button>
            <button className="primary-button" onClick={()=>void review('approve')} disabled={busy||!reviewBalanceOptions.length}><Check size={16}/> Aprovar e registrar entrega</button>
          </div>
        </div>
      )}
    </Modal>

    {sign && <SignatureModal onClose={() => setSign(null)} onConfirm={async signature => { try { await request(`/epi/${sign}/sign`, { method: 'POST', body: JSON.stringify({ assinaturaDigital: signature }) }); setSign(null); setMessage('Assinatura digital registrada.'); await load() } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar a assinatura.') } }} />}
  </section>
}
