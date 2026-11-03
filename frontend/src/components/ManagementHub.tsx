import { useMemo, useState } from 'react'
import { BarChart3, Users, Building2, History, FileText, Search, UserPlus } from 'lucide-react'
import { request } from '../api'
import Modal from './Modal'
import './ManagementHub.css'

type Period = 'Diário' | 'Mensal' | 'Anual';
type Module = 'GERAL' | 'RECEBIMENTOS' | 'ESTOQUE' | 'EPI'
type User = { id: number; nome: string; email: string; cpf?: string; role: string; ativo: boolean; obra?: string; createdAt?: string }
type Receipt = { numeroNota?: string; fornecedor?: string; galpaoDestinoNome?: string; status?: string; dataRecebimento?: string; createdAt?: string; itens?: { produtoNome?: string; quantidadeNota?: number; unidade?: string; lote?: string; dataValidade?: string }[] }
type Product = { codigo: string; nome: string; unidade?: string; quantidadeAtual?: number; quantidadeMinima?: number; lote?: string; dataValidade?: string; galpao?: { nome?: string; obra?: { nome?: string } } }
type Movement = { produtoNome?: string; produtoCodigo?: string; tipo?: string; quantidade?: number; origem?: string; destino?: string; responsavel?: string; createdAt?: string }
type Epi = { funcionarioNome?: string; funcionarioCpf?: string; produtoNome?: string; numeroCa?: string; quantidade?: number; status?: string; dataEntrega?: string; dataPrevisaoTroca?: string; assinaturaDigital?: string; termoAssinado?: boolean }
type Site = { id: number; codigo: string; nome: string; endereco?: string; responsavel?: string; status?: string }
type Warehouse = { id: number; codigo?: string; nome: string; endereco?: string; responsavel?: string; status?: string; capacidade?: number; obra?: Site }
type Audit = { id: number; usuarioNome?: string; modulo?: string; acao?: string; detalhes?: string; dataHora?: string }

const safe = (v: unknown) => String(v ?? '—').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!))
const inPeriod = (value: string | undefined, period: Period) => {
  if (!value) return period === 'Anual';
  const d = new Date(value), n = new Date();
  return period === 'Diário' ? d.toDateString() === n.toDateString() : period === 'Mensal' ? d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() : d.getFullYear() === n.getFullYear()
}
const rows = (data: string[][], cols: number) => data.length ? data.map(r => '<tr>' + r.map(c => `<td>${safe(c)}</td>`).join('') + '</tr>').join('') : `<tr><td colspan="${cols}">Sem registros no período.</td></tr>`

export default function ManagementHub() {
  const [modal, setModal] = useState<'reports' | 'users' | 'structure' | 'audit' | 'createUser' | null>(null)
  const [period, setPeriod] = useState<Period>('Mensal')
  const [module, setModule] = useState<Module>('GERAL')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [role, setRole] = useState('TODOS')
  const [sites, setSites] = useState<Site[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [audits, setAudits] = useState<Audit[]>([])

  const [siteDraft, setSiteDraft] = useState({ codigo: '', nome: '', endereco: '', responsavel: '' })
  const [warehouseDraft, setWarehouseDraft] = useState({ codigo: '', nome: '', obraId: '', endereco: '', responsavel: '', capacidade: '' })
  const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', cpf: '', telefone: '', obra: '', matricula: '', role: 'SUPERVISOR' })

  async function openUsers() {
    setModal('users')
    setLoading(true)
    try {
      setUsers(await request<User[]>('/users'))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  async function openStructure() {
    setModal('structure')
    setLoading(true)
    try {
      const [s, w] = await Promise.all([request<Site[]>('/construction-sites'), request<Warehouse[]>('/warehouses')])
      setSites(s)
      setWarehouses(w)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao carregar estruturas.')
    } finally {
      setLoading(false)
    }
  }

  async function openAudit() {
    setModal('audit')
    setLoading(true)
    try {
      setAudits(await request<Audit[]>('/audit'))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao carregar auditoria.')
    } finally {
      setLoading(false)
    }
  }

  async function reloadStructure() {
    const [s, w] = await Promise.all([request<Site[]>('/construction-sites'), request<Warehouse[]>('/warehouses')])
    setSites(s)
    setWarehouses(w)
  }

  async function createSite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await request('/construction-sites', { method: 'POST', body: JSON.stringify({ ...siteDraft, status: 'ATIVA' }) })
      setSiteDraft({ codigo: '', nome: '', endereco: '', responsavel: '' })
      await reloadStructure()
      setMessage('Obra cadastrada com sucesso. Agora você pode criar o galpão.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível cadastrar a obra.')
    } finally {
      setLoading(false)
    }
  }

  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await request('/warehouses', {
        method: 'POST',
        body: JSON.stringify({
          codigo: warehouseDraft.codigo,
          nome: warehouseDraft.nome,
          endereco: warehouseDraft.endereco,
          responsavel: warehouseDraft.responsavel,
          capacidade: warehouseDraft.capacidade ? Number(warehouseDraft.capacidade) : null,
          status: 'ATIVO',
          obra: { id: Number(warehouseDraft.obraId) }
        })
      })
      setWarehouseDraft({ codigo: '', nome: '', obraId: '', endereco: '', responsavel: '', capacidade: '' })
      await reloadStructure()
      setMessage('Galpão cadastrado e vinculado à obra.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível cadastrar o galpão.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await request(`/users?role=${newUser.role}`, {
        method: 'POST',
        body: JSON.stringify(newUser)
      })
      setMessage(`Usuário ${newUser.nome} cadastrado com sucesso com perfil ${newUser.role}.`)
      setNewUser({ nome: '', email: '', password: '', cpf: '', telefone: '', obra: '', matricula: '', role: 'SUPERVISOR' })
      setModal('users')
      setUsers(await request<User[]>('/users'))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao cadastrar usuário.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleUserStatus(u: User) {
    try {
      const updated = await request<User>(`/users/${u.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !u.ativo })
      })
      setUsers(prev => prev.map(item => item.id === updated.id ? updated : item))
      setMessage(`Situação do usuário alterada para ${updated.ativo ? 'ATIVO' : 'INATIVO'}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível alterar a situação.')
    }
  }

  const visibleUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    return users.filter(u =>
      (role === 'TODOS' || u.role === role) &&
      [u.nome, u.cpf, u.email, u.role, u.obra].some(v => v?.toLowerCase().includes(q))
    )
  }, [users, userSearch, role])

  async function generate() {
    setLoading(true)
    setMessage('')
    try {
      const [receiptsData, productsData, movementsData, epiData] = await Promise.all([
        request<Receipt[]>('/receipts'),
        request<Product[]>('/stock/products'),
        request<Movement[]>('/stock/movements'),
        request<Epi[]>('/epi')
      ])

      const receipts = receiptsData.filter(x => inPeriod(x.dataRecebimento || x.createdAt, period))
      const movements = movementsData.filter(x => inPeriod(x.createdAt, period))
      const epis = epiData.filter(x => inPeriod(x.dataEntrega, period))
      const low = productsData.filter(x => Number(x.quantidadeAtual || 0) <= Number(x.quantidadeMinima || 0))

      const sections: string[] = []
      if (module === 'GERAL' || module === 'RECEBIMENTOS') {
        sections.push(`<h2>Recebimentos</h2><p>${receipts.length} registro(s) no período.</p><table><thead><tr><th>Nota</th><th>Fornecedor</th><th>Obra / galpão</th><th>Itens e lotes</th><th>Status</th></tr></thead><tbody>${rows(receipts.map(x => [x.numeroNota || '', x.fornecedor || '', x.galpaoDestinoNome || '', (x.itens || []).map(i => `${i.produtoNome} · ${i.quantidadeNota} ${i.unidade || 'UN'} · Lote ${i.lote || 'SEM_LOTE'}`).join(', '), x.status || '']), 5)}</tbody></table>`)
      }
      if (module === 'GERAL' || module === 'ESTOQUE') {
        sections.push(`<h2>Estoque</h2><div class="metrics"><span>Produtos <b>${productsData.length}</b></span><span>Em reposição <b>${low.length}</b></span><span>Movimentações <b>${movements.length}</b></span></div><table><thead><tr><th>Código</th><th>Produto</th><th>Obra / galpão</th><th>Lote / validade</th><th>Saldo / mínimo</th></tr></thead><tbody>${rows(productsData.map(x => [x.codigo, x.nome, [x.galpao?.obra?.nome, x.galpao?.nome].filter(Boolean).join(' · '), `${x.lote || 'SEM_LOTE'} · ${x.dataValidade || 'sem validade'}`, `${x.quantidadeAtual || 0} / ${x.quantidadeMinima || 0} ${x.unidade || 'UN'}`]), 5)}</tbody></table><h3>Movimentações do período</h3><table><thead><tr><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Origem / destino</th><th>Responsável</th></tr></thead><tbody>${rows(movements.map(x => [x.produtoNome || x.produtoCodigo || '', x.tipo || '', String(x.quantidade || 0), `${x.origem || '—'} → ${x.destino || '—'}`, x.responsavel || '']), 5)}</tbody></table>`)
      }
      if (module === 'GERAL' || module === 'EPI') {
        sections.push(`<h2>Controle de EPI</h2><p>${epis.length} entrega(s) no período.</p><table><thead><tr><th>Funcionário</th><th>CPF</th><th>EPI / CA</th><th>Troca prevista</th><th>Comprovação</th></tr></thead><tbody>${rows(epis.map(x => [x.funcionarioNome || '', x.funcionarioCpf || '', `${x.produtoNome || ''} · ${x.numeroCa || ''}`, x.dataPrevisaoTroca || 'Não informada', x.termoAssinado || x.assinaturaDigital ? 'ASSINADO' : x.status || 'PENDENTE']), 5)}</tbody></table>`)
      }

      const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório ${module} ${period}</title><style>body{font-family:Arial;color:#173b63;margin:32px}header{border-bottom:4px solid #ef3e42}h2{margin-top:30px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border-bottom:1px solid #dce5ef;text-align:left}th{background:#f4f7fb}.metrics{display:flex;gap:12px}.metrics span{padding:12px;border:1px solid #dce5ef;border-radius:8px}.metrics b{display:block;font-size:20px}@media print{body{margin:12mm}}</style></head><body><header><h1>ELLENCO · ${module === 'GERAL' ? 'Relatório Geral Integrado' : `Relatório de ${module.toLowerCase()}`}</h1><p>Período: ${period} · Emitido em ${new Date().toLocaleString('pt-BR')}</p></header>${sections.join('')}<footer><p>Documento oficial gerado pela Plataforma Operacional ELLENCO.</p></footer></body></html>`

      const win = window.open('', '_blank')
      if (!win) throw new Error('Permita pop-ups no navegador para emitir o relatório em PDF.')
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 250)
      setMessage('Relatório pronto para impressão ou salvamento em PDF.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível emitir o relatório.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Central de gerenciamento</h1>
          <p>Relatórios, usuários, estruturas operacionais e auditoria corporativa.</p>
        </div>
      </div>

      {message && <p className="feedback">{message}</p>}

      <div className="management-grid">
        <button className="management-card" onClick={() => setModal('reports')}>
          <BarChart3 />
          <span><b>Emitir relatórios</b><small>Recebimentos, estoque, EPI ou visão geral consolidada.</small></span>
        </button>
        <button className="management-card" onClick={() => void openUsers()}>
          <Users />
          <span><b>Usuários cadastrados</b><small>Gestão de acessos, perfis, CPFs e status ativo/inativo.</small></span>
        </button>
        <button className="management-card" onClick={() => void openStructure()}>
          <Building2 />
          <span><b>Obras e galpões</b><small>Estrutura física, canteiros de obras e almoxarifados.</small></span>
        </button>
        <button className="management-card" onClick={() => void openAudit()}>
          <History />
          <span><b>Auditoria e logs</b><small>Rastreamento de ações, registros e responsáveis.</small></span>
        </button>
      </div>

      {/* MODAL RELATÓRIOS */}
      <Modal open={modal === 'reports'} title="Central de relatórios gerenciais" onClose={() => setModal(null)}>
        <div className="management-modal">
          <label>Módulo
            <select value={module} onChange={e => setModule(e.target.value as Module)}>
              <option value="GERAL">Relatório Geral Integrado</option>
              <option value="RECEBIMENTOS">Recebimentos e Conferências</option>
              <option value="ESTOQUE">Estoque e Movimentações</option>
              <option value="EPI">Controle e Validade de EPI</option>
            </select>
          </label>
          <label>Período
            <select value={period} onChange={e => setPeriod(e.target.value as Period)}>
              <option>Diário</option>
              <option>Mensal</option>
              <option>Anual</option>
            </select>
          </label>
          <button className="primary-button" disabled={loading} onClick={() => void generate()}>
            <FileText size={18} />
            {loading ? 'Gerando…' : 'Emitir relatório em PDF'}
          </button>
        </div>
      </Modal>

      {/* MODAL USUÁRIOS */}
      <Modal open={modal === 'users'} title="Usuários e permissões" onClose={() => setModal(null)}>
        <div className="management-toolbar">
          <label className="management-search">
            <Search size={18} />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Pesquisar por nome, CPF, e-mail ou obra"
            />
          </label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="TODOS">Todos os perfis</option>
            <option value="GLOBAL_ADMIN">Administrador Global AIR</option>
            <option value="CEO">CEO / Diretoria</option>
            <option value="ADMIN">Administrador da Empresa</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="FUNCIONARIO">Funcionário</option>
          </select>
          <button className="primary-button" onClick={() => setModal('createUser')}>
            <UserPlus size={18} /> Novo usuário
          </button>
        </div>
        <div className="management-table">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>CPF</th>
                <th>Perfil</th>
                <th>Obra</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <b>{u.nome}</b>
                    <small>{u.email}</small>
                  </td>
                  <td>{u.cpf || 'Não informado'}</td>
                  <td><span className="role-chip">{u.role}</span></td>
                  <td>{u.obra || 'Geral'}</td>
                  <td><span className={u.ativo ? 'status ok' : 'status danger'}>{u.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                  <td>
                    <button
                      className="btn"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => toggleUserStatus(u)}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !visibleUsers.length && <p className="empty">Nenhum usuário encontrado para os filtros selecionados.</p>}
        </div>
      </Modal>

      {/* MODAL NOVO USUÁRIO */}
      <Modal open={modal === 'createUser'} title="Cadastrar novo usuário" onClose={() => setModal('users')}>
        <form onSubmit={handleCreateUser} className="product-form">
          <input
            required
            placeholder="Nome completo"
            value={newUser.nome}
            onChange={e => setNewUser({ ...newUser, nome: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="E-mail corporativo"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Senha de acesso (mínimo 8 dígitos)"
            minLength={8}
            value={newUser.password}
            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
          />
          <input
            required
            placeholder="CPF (apenas números)"
            value={newUser.cpf}
            onChange={e => setNewUser({ ...newUser, cpf: e.target.value })}
          />
          <input
            placeholder="Telefone"
            value={newUser.telefone}
            onChange={e => setNewUser({ ...newUser, telefone: e.target.value })}
          />
          <input
            placeholder="Obra / Lotação"
            value={newUser.obra}
            onChange={e => setNewUser({ ...newUser, obra: e.target.value })}
          />
          <label>Perfil de acesso
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrador da Empresa</option>
              <option value="CEO">CEO / Diretoria</option>
              <option value="GLOBAL_ADMIN">Administrador Global AIR</option>
            </select>
          </label>
          <button className="primary-button" disabled={loading}>
            {loading ? 'Salvando…' : 'Confirmar cadastro'}
          </button>
        </form>
      </Modal>

      {/* MODAL ESTRUTURA */}
      <Modal open={modal === 'structure'} title="Canteiros de obras e galpões" onClose={() => setModal(null)}>
        <div className="structure-manager">
          <div className="structure-forms">
            <form onSubmit={createSite}>
              <h3>Nova obra</h3>
              <input required placeholder="Código da obra (ex: OBR-01)" value={siteDraft.codigo} onChange={e => setSiteDraft({ ...siteDraft, codigo: e.target.value })} />
              <input required placeholder="Nome da obra" value={siteDraft.nome} onChange={e => setSiteDraft({ ...siteDraft, nome: e.target.value })} />
              <input placeholder="Endereço" value={siteDraft.endereco} onChange={e => setSiteDraft({ ...siteDraft, endereco: e.target.value })} />
              <input placeholder="Responsável" value={siteDraft.responsavel} onChange={e => setSiteDraft({ ...siteDraft, responsavel: e.target.value })} />
              <button className="primary-button" disabled={loading}>{loading ? 'Salvando…' : 'Cadastrar obra'}</button>
            </form>
            <form onSubmit={createWarehouse}>
              <h3>Novo galpão</h3>
              <select required value={warehouseDraft.obraId} onChange={e => setWarehouseDraft({ ...warehouseDraft, obraId: e.target.value })}>
                <option value="">Selecione a obra vinculada</option>
                {sites.map(s => <option value={s.id} key={s.id}>{s.codigo} · {s.nome}</option>)}
              </select>
              <input required placeholder="Código do galpão (ex: GALP-01)" value={warehouseDraft.codigo} onChange={e => setWarehouseDraft({ ...warehouseDraft, codigo: e.target.value })} />
              <input required placeholder="Nome do galpão" value={warehouseDraft.nome} onChange={e => setWarehouseDraft({ ...warehouseDraft, nome: e.target.value })} />
              <input placeholder="Endereço / localização" value={warehouseDraft.endereco} onChange={e => setWarehouseDraft({ ...warehouseDraft, endereco: e.target.value })} />
              <input placeholder="Responsável" value={warehouseDraft.responsavel} onChange={e => setWarehouseDraft({ ...warehouseDraft, responsavel: e.target.value })} />
              <input type="number" min="0" placeholder="Capacidade estimada" value={warehouseDraft.capacidade} onChange={e => setWarehouseDraft({ ...warehouseDraft, capacidade: e.target.value })} />
              <button className="primary-button" disabled={loading || !sites.length}>
                {sites.length ? (loading ? 'Salvando…' : 'Cadastrar galpão') : 'Cadastre uma obra primeiro'}
              </button>
            </form>
          </div>
          <div className="structure-grid">
            {sites.map(s => (
              <article key={s.id}>
                <b>{s.codigo} · {s.nome}</b>
                <small>{s.endereco || 'Endereço não informado'} · Responsável: {s.responsavel || 'Não informado'} · {s.status}</small>
                <ul>
                  {warehouses.filter(w => w.obra?.id === s.id).map(w => (
                    <li key={w.id}>{w.codigo || '—'} · {w.nome} · {w.status}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </Modal>

      {/* MODAL AUDITORIA */}
      <Modal open={modal === 'audit'} title="Atividade recente e conformidade" onClose={() => setModal(null)}>
        <div className="audit-feed">
          {audits.slice(0, 50).map(a => (
            <article key={a.id}>
              <span className="role-chip">{a.modulo}</span>
              <b>{a.acao}</b>
              <small>{a.usuarioNome || 'Sistema'} · {a.dataHora ? new Date(a.dataHora).toLocaleString('pt-BR') : ''}</small>
              <p>{a.detalhes}</p>
            </article>
          ))}
          {!audits.length && <p className="empty">Nenhum log de auditoria registrado até o momento.</p>}
        </div>
      </Modal>
    </section>
  )
}
