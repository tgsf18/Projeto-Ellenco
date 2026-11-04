import { FormEvent, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, HardHat, PackageCheck, UserRound } from 'lucide-react'
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

  const load = async () => {
    try {
      const [d, a] = await Promise.all([request<Epi[]>('/epi'), request<Alerts>('/epi/alerts')])
      setDeliveries(d); setAlerts(a)
      if (user.role !== 'FUNCIONARIO') {
        const [e, b] = await Promise.all([request<Employee[]>('/employees'), request<Balance[]>('/stock/balances')])
        setEmployees(e); setBalances(b)
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

  return <section className="panel-page">
    <div className="page-heading"><div><p className="eyebrow">SEGURANÇA DO TRABALHO · ESTOQUE</p><h1>Entrega e validade de EPI</h1><p>{user.role==='FUNCIONARIO'?'Consulte os EPIs vinculados ao seu CPF, prazos de troca e comprovantes de aceite.':'Cada entrega usa um lote cadastrado, baixa o saldo e fica vinculada ao aceite do funcionário.'}</p></div>{user.role!=='FUNCIONARIO'&&<button className="primary-button" onClick={() => start()}><HardHat size={17}/> Registrar entrega</button>}</div>
    {message && <p className="feedback" role="status">{message}</p>}
    <ModuleMetrics items={[
      { label: 'Entregas registradas', value: deliveries.length, detail: 'Histórico total', icon: <PackageCheck/>, tone: 'blue' },
      { label: 'Aguardando assinatura', value: deliveries.filter(x => x.status === 'PENDENTE_ASSINATURA').length, detail: 'Ação pendente', icon: <UserRound/>, tone: 'amber' },
      { label: 'Troca em até 30 dias', value: alerts.proximosVencimento.length, detail: 'Planejar reposição', icon: <AlertTriangle/>, tone: 'amber' },
      { label: 'Troca vencida', value: alerts.vencidos.length, detail: 'Prioridade de segurança', icon: <BadgeCheck/>, tone: 'red' }
    ]}/>
    <label className="module-search-label"><span>Buscar entregas</span><input className="module-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Funcionário, CPF, produto, CA ou situação"/></label>
    <div className="table-card"><table><thead><tr><th>Funcionário</th><th>EPI / CA</th><th>Almoxarifado / lote</th><th>Troca prevista</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      {filtered.map(item => {
        const source = balances.find(balance => balance.id === item.saldoEstoqueId)
        return <tr key={item.id}><td><b>{item.funcionarioNome}</b><small>{item.funcionarioCpf}</small></td><td>{item.produtoNome}<small>CA {item.numeroCa} · {item.quantidade || 1} un.</small></td><td>{source?.galpao?.obra?.nome || '—'}<small>{source ? `${source.galpao.nome} · ${source.lote}` : `Lote #${item.saldoEstoqueId || 'histórico'}`}</small></td><td>{formatDate(item.dataPrevisaoTroca)}<small>{item.vencido ? 'Prazo vencido' : item.proximoVencimento ? 'Vence em até 30 dias' : 'Dentro do prazo'}</small></td><td><span className={`status ${item.vencido || item.status === 'PENDENTE_ASSINATURA' ? 'danger' : item.proximoVencimento ? 'warning' : 'ok'}`}>{item.vencido ? 'TROCA VENCIDA' : item.status.replace(/_/g, ' ')}</span><small>{item.termoAssinado || item.assinaturaDigital ? 'Aceite digital registrado' : 'Aguardando aceite'}</small></td><td><div className="table-actions">{item.status === 'PENDENTE_ASSINATURA' && <button className="primary-button" onClick={() => setSign(item.id)}>Assinar</button>}{user.role!=='FUNCIONARIO'&&item.status === 'ENTREGUE' && <button className="secondary-button" onClick={() => start(item)}>Substituir</button>}</div></td></tr>
      })}
      {!filtered.length && <tr><td colSpan={6}><div className="empty-state">{deliveries.length ? 'Nenhum resultado para esta busca.' : 'Nenhuma entrega registrada.'}</div></td></tr>}
    </tbody></table></div>
    <Modal open={open} title={replace ? 'Substituir EPI' : 'Registrar entrega de EPI'} onClose={() => { if (!busy) { setOpen(false); setReplace(null) } }}>
      <form className="product-form" onSubmit={save}>
        <label>Funcionário ativo no RH<SearchableSelect ariaLabel="Funcionário" value={draft.funcionarioCpf} options={employeeOptions} disabled={Boolean(replace)} onChange={value => setDraft(current => ({ ...current, funcionarioCpf: value }))} placeholder="Pesquisar nome, função, matrícula ou CPF"/></label>
        <label>Produto EPI, CA, lote e almoxarifado<SearchableSelect ariaLabel="Produto, CA, lote e almoxarifado" value={draft.saldoEstoqueId} options={balanceOptions} onChange={value => setDraft(current => ({ ...current, saldoEstoqueId: value }))} placeholder="Pesquisar código, produto, CA, lote ou obra"/></label>
        {selectedBalance && <p className="epi-stock-proof"><PackageCheck size={17}/><span>Saldo disponível: <b>{selectedBalance.quantidadeDisponivel} {selectedBalance.produto.unidade || 'UN'}</b> · Lote {selectedBalance.lote} · validade até {formatDate(selectedBalance.dataValidade)} · CA válido até {formatDate(selectedBalance.produto.validadeCa)}</span></p>}
        <label>Quantidade<input type="number" min="1" max={selectedBalance?.quantidadeDisponivel} step="1" value={draft.quantidade} onChange={event => setDraft(current => ({ ...current, quantidade: event.target.value }))} required/></label>
        <label>Próxima troca<input type="date" min={today()} max={selectedBalance ? [selectedBalance.dataValidade, selectedBalance.produto.validadeCa].filter(Boolean).sort()[0] : undefined} value={draft.dataPrevisaoTroca} onChange={event => setDraft(current => ({ ...current, dataPrevisaoTroca: event.target.value }))} required/></label>
        {!employeeOptions.length && <p className="form-error">Não há funcionários ativos cadastrados no RH.</p>}
        {!balanceOptions.length && <p className="form-error">Não há lotes elegíveis. Cadastre o produto como EPI, informe CA e validade do CA e receba um lote com validade no estoque.</p>}
        <button className="primary-button modal-submit" disabled={busy || !employeeOptions.length || !balanceOptions.length}>{busy ? 'Registrando e baixando estoque…' : 'Confirmar entrega e baixar estoque'}</button>
      </form>
    </Modal>
    {sign && <SignatureModal onClose={() => setSign(null)} onConfirm={async signature => { try { await request(`/epi/${sign}/sign`, { method: 'POST', body: JSON.stringify({ assinaturaDigital: signature }) }); setSign(null); setMessage('Assinatura digital registrada.'); await load() } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar a assinatura.') } }} />}
  </section>
}
