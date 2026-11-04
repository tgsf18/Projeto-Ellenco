import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { AuthUser, request } from '../api'
import './ManagementReports.css'
import './AccountPanel.css'

type Profile = {
  nome: string
  email: string
  role: string
  telefone?: string
  obra?: string
  avatar?: string
  cpf?: string
  matricula?: string
  status?: string
}

const roleLabelMap: Record<string, string> = {
  GLOBAL_ADMIN: 'Administrador Global AIR',
  CEO: 'CEO / Diretoria Executiva',
  ADMIN: 'Administrador da Empresa',
  SUPERVISOR: 'Supervisor Operacional',
  FUNCIONARIO: 'Funcionário Operacional'
}

export default function AccountPanel({ user, onUpdate }: { user: AuthUser; onUpdate: (user: AuthUser) => void }) {
  const [profile, setProfile] = useState<Profile>({ nome: user.nome, email: user.email, role: user.role })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    request<Profile>('/users/me')
      .then(setProfile)
      .catch(() => setMessage('Seus dados locais foram carregados. Algumas informações podem estar indisponíveis no momento.'))
  }, [])

  useEffect(() => { setAvatarFailed(false) }, [profile.avatar])

  function photo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setMessage('Escolha uma imagem PNG, JPG ou WebP.')
    if (file.size > 2 * 1024 * 1024) return setMessage('A imagem deve ter até 2 MB para carregar com rapidez no perfil.')
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarFailed(false)
      setProfile(value => ({ ...value, avatar: String(reader.result || '') }))
      setMessage('Prévia atualizada. Salve as alterações para confirmar a nova foto.')
    }
    reader.onerror = () => setMessage('Não foi possível abrir essa imagem. Escolha outro arquivo.')
    reader.readAsDataURL(file)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const updated = await request<Profile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          nome: profile.nome,
          telefone: profile.telefone || '',
          obra: profile.obra || '',
          avatar: profile.avatar || ''
        })
      })
      setProfile(updated)
      const local = { ...user, nome: updated.nome, avatar: updated.avatar } as AuthUser
      localStorage.setItem('ellenco_user', JSON.stringify(local))
      onUpdate(local)
      setMessage('Perfil atualizado com sucesso.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile.nome
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const friendlyRole = roleLabelMap[profile.role] || profile.role

  return (
    <section className="account-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MINHA CONTA</p>
          <h1>Perfil e credenciais</h1>
          <p>Gerencie seus dados pessoais, telefone e identidade operacional.</p>
        </div>
      </div>

      <div className="account-summary">
        <div className="avatar-large">
          {profile.avatar && !avatarFailed ? <img src={profile.avatar} alt="Foto do usuário" onError={() => setAvatarFailed(true)} /> : initials}
        </div>
        <div>
          <span className="account-status">
            ● {profile.status?.includes('INATIVO') ? 'Acesso Inativo' : 'Acesso Ativo'}
          </span>
          <h2>{profile.nome}</h2>
          <p>{profile.email}</p>
          <div className="profile-tags">
            <span>{friendlyRole}</span>
            {profile.obra && <span>Obra: {profile.obra}</span>}
          </div>
        </div>
      </div>

      <div className="account-card">
        <form className="account-form" onSubmit={save}>
          <div className="photo-field">
            <div className="photo-edit-preview">
              <div className="avatar-edit-preview">
                {profile.avatar && !avatarFailed ? <img src={profile.avatar} alt={`Prévia da foto de ${profile.nome}`} onError={() => setAvatarFailed(true)} /> : initials}
              </div>
              <div className="photo-edit-copy"><strong>Foto do perfil</strong><span>A prévia aparece aqui e no cabeçalho após salvar.</span><small>PNG, JPG ou WebP · até 2 MB</small></div>
            </div>
            <div className="photo-edit-actions">
              <label className="photo-upload-button">Escolher imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} /></label>
              {profile.avatar && <button type="button" className="photo-remove-button" onClick={() => { setProfile(value => ({ ...value, avatar: '' })); setAvatarFailed(false); setMessage('A foto será removida do perfil quando você salvar.') }}>Remover foto</button>}
            </div>
          </div>
          <label>
            Nome completo
            <input
              required
              value={profile.nome}
              onChange={e => setProfile({ ...profile, nome: e.target.value })}
            />
          </label>
          <label>
            E-mail corporativo
            <input value={profile.email} disabled />
          </label>
          <label>
            Telefone de contato
            <input
              placeholder="(00) 00000-0000"
              value={profile.telefone || ''}
              onChange={e => setProfile({ ...profile, telefone: e.target.value })}
            />
          </label>
          <label>
            Obra / Unidade de alocação
            <input
              placeholder="Informe sua obra ou unidade"
              value={profile.obra || ''}
              onChange={e => setProfile({ ...profile, obra: e.target.value })}
            />
          </label>
          <label>
            Perfil de autorização
            <input value={friendlyRole} disabled />
          </label>
          <button className="primary-button" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>
        {message && <p className="feedback" role="status">{message}</p>}
      </div>
    </section>
  )
}
