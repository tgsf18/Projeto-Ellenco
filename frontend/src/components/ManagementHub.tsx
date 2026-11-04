import { useMemo, useState } from 'react'
import { BarChart3, Users, Building2, History, Search, UserPlus } from 'lucide-react'
import { AuthUser, UserRole, request } from '../api'
import Modal from './Modal'
import SearchableSelect from './SearchableSelect'
import ManagementReports from './ManagementReports'
import './ManagementHub.css'

type User = { id: number; nome: string; email: string; cpf?: string; role: string; ativo: boolean; obra?: string; createdAt?: string }
type Employee = { id:number;nome:string;cpf:string;funcao?:string;matricula?:string;status?:string;obra?:{nome?:string} }
type Site = { id: number; codigo: string; nome: string; endereco?: string; responsavel?: string; status?: string }
type Warehouse = { id: number; codigo?: string; nome: string; endereco?: string; responsavel?: string; status?: string; capacidade?: number; obra?: Site }
type Audit = { id: number; usuarioNome?: string; modulo?: string; acao?: string; detalhes?: string; dataHora?: string }

export default function ManagementHub({ user }: { user: AuthUser }) {
  const [modal, setModal] = useState<'reports' | 'users' | 'structure' | 'audit' | 'createUser' | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [role, setRole] = useState('TODOS')
  const [sites, setSites] = useState<Site[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [jobFunctions, setJobFunctions] = useState<string[]>([])

  const [siteDraft, setSiteDraft] = useState({ codigo: '', nome: '', endereco: '', responsavelId: '' })
  const [warehouseDraft, setWarehouseDraft] = useState({ codigo: '', nome: '', obraId: '', endereco: '', responsavelId: '', capacidade: '' })
  const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', cpf: '', telefone: '', obra: '', matricula: '', cargo: '', role: 'SUPERVISOR' })

  async function openUsers() {
    setModal('users')
    setLoading(true)
    try {
      const [loadedUsers, loadedSites, loadedFunctions] = await Promise.all([request<User[]>('/users'), request<Site[]>('/construction-sites'), request<string[]>('/job-functions')])
      setUsers(loadedUsers)
      setSites(loadedSites)
      setJobFunctions(loadedFunctions)
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
      const [s, w, e] = await Promise.all([request<Site[]>('/construction-sites'), request<Warehouse[]>('/warehouses'), request<Employee[]>('/employees')])
      setSites(s)
      setWarehouses(w)
      setEmployees(e)
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
      await request('/construction-sites', { method: 'POST', body: JSON.stringify({ codigo: siteDraft.codigo, nome: siteDraft.nome, endereco: siteDraft.endereco, responsavel: employees.find(e=>e.cpf===siteDraft.responsavelId)?.nome||'', status: 'ATIVA' }) })
      setSiteDraft({ codigo: '', nome: '', endereco: '', responsavelId: '' })
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
          responsavel: employees.find(e=>e.cpf===warehouseDraft.responsavelId)?.nome||'',
          capacidade: warehouseDraft.capacidade ? Number(warehouseDraft.capacidade) : null,
          status: 'ATIVO',
          obra: { id: Number(warehouseDraft.obraId) }
        })
      })
      setWarehouseDraft({ codigo: '', nome: '', obraId: '', endereco: '', responsavelId: '', capacidade: '' })
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
      setNewUser({ nome: '', email: '', password: '', cpf: '', telefone: '', obra: '', matricula: '', cargo: '', role: 'SUPERVISOR' })
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

  async function updateUserRole(u: User, nextRole: UserRole) {
    if (u.role === nextRole) return
    try {
      const updated = await request<User>(`/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole })
      })
      setUsers(prev => prev.map(item => item.id === updated.id ? updated : item))
      setMessage(`Perfil de ${updated.nome} atualizado para ${updated.role}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível alterar o perfil.')
    }
  }

  const assignableRoles: { value: UserRole; label: string }[] = [
    { value: 'FUNCIONARIO', label: 'Funcionário' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ADMIN', label: 'Administrador da empresa' },
    ...(user.role === 'GLOBAL_ADMIN' ? [
      { value: 'CEO' as const, label: 'CEO / Diretoria' },
      { value: 'GLOBAL_ADMIN' as const, label: 'Administrador global AIR' }
    ] : [])
  ]

  const visibleUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    return users.filter(u =>
      (role === 'TODOS' || u.role === role) &&
      [u.nome, u.cpf, u.email, u.role, u.obra].some(v => v?.toLowerCase().includes(q))
    )
  }, [users, userSearch, role])

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
      <Modal open={modal === 'reports'} title="Relatórios gerenciais" onClose={() => setModal(null)} wide>
        <ManagementReports embedded />
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
                  <td>
                    <select
                      aria-label={`Perfil de ${u.nome}`}
                      value={u.role}
                      disabled={u.id === user.id || (u.role === 'GLOBAL_ADMIN' && user.role !== 'GLOBAL_ADMIN')}
                      onChange={e => void updateUserRole(u, e.target.value as UserRole)}
                    >
                      {!assignableRoles.some(option => option.value === u.role) && <option value={u.role}>{u.role}</option>}
                      {assignableRoles.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
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
          <label>Obra / lotação
            <select value={newUser.obra} onChange={e => setNewUser({ ...newUser, obra: e.target.value })}>
              <option value="">Sem lotação vinculada</option>
              {sites.map(site => <option key={site.id} value={site.nome}>{site.codigo} · {site.nome}</option>)}
            </select>
          </label>
          <label>Cargo / função
            <SearchableSelect ariaLabel="Cargo ou função" value={newUser.cargo} options={jobFunctions.map(value => ({ value, label: value }))} onChange={value => setNewUser({ ...newUser, cargo: value })} placeholder="Pesquisar cargo (ex.: RH)" />
          </label>
          <label>Perfil de acesso
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrador da Empresa</option>
              {user.role === 'GLOBAL_ADMIN' && <option value="CEO">CEO / Diretoria</option>}
              {user.role === 'GLOBAL_ADMIN' && <option value="GLOBAL_ADMIN">Administrador Global AIR</option>}
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
              <label>Responsável cadastrado no RH<SearchableSelect ariaLabel="Responsável da obra" value={siteDraft.responsavelId} options={employees.filter(e=>(e.status||'ATIVO').toUpperCase()==='ATIVO').map(e=>({value:e.cpf,label:e.nome,description:[e.funcao,e.matricula&&`Matrícula ${e.matricula}`,e.cpf].filter(Boolean).join(' · ')}))} onChange={responsavelId=>setSiteDraft({...siteDraft,responsavelId})} placeholder="Pesquisar funcionário por nome ou cargo"/></label>
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
              <label>Responsável cadastrado no RH<SearchableSelect ariaLabel="Responsável do galpão" value={warehouseDraft.responsavelId} options={employees.filter(e=>(e.status||'ATIVO').toUpperCase()==='ATIVO').map(e=>({value:e.cpf,label:e.nome,description:[e.funcao,e.matricula&&`Matrícula ${e.matricula}`,e.cpf].filter(Boolean).join(' · ')}))} onChange={responsavelId=>setWarehouseDraft({...warehouseDraft,responsavelId})} placeholder="Pesquisar funcionário por nome ou cargo"/></label>
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
