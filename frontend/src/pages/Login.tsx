import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, UserCheck } from 'lucide-react'
import { AuthUser, request, UserRole } from '../api'
import LoadingScreen from '../components/LoadingScreen'

type Mode = 'login' | 'register' | 'forgot' | 'reset'

export default function Login({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const token = new URLSearchParams(location.search).get('resetToken')
  const [mode, setMode] = useState<Mode>(token ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [chosenRole, setChosenRole] = useState<UserRole>('ADMIN')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'forgot') {
        const r = await request<{ message: string }>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        })
        setMessage(r.message)
        return
      }

      if (mode === 'reset') {
        if (password !== confirm) throw new Error('As senhas não conferem.')
        const r = await request<{ message: string }>('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, password })
        })
        setMessage(r.message)
        history.replaceState({}, '', location.pathname)
        setMode('login')
        setPassword('')
        setConfirm('')
        return
      }

      const payload = mode === 'register'
        ? { nome: name, email, password, cpf, role: chosenRole }
        : { email, password }

      const user = await request<AuthUser>(mode === 'register' ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      localStorage.setItem('ellenco_token', user.token)
      localStorage.setItem('ellenco_user', JSON.stringify(user))
      setRedirecting(true)
      setTimeout(() => onLogin(user), 500)
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Não foi possível continuar.')
    } finally {
      setLoading(false)
    }
  }

  if (redirecting) return <LoadingScreen message="Preparando seu ambiente seguro…" />

  const title = mode === 'register'
    ? 'Criar acesso'
    : mode === 'forgot'
    ? 'Recuperar senha'
    : mode === 'reset'
    ? 'Criar nova senha'
    : 'Acesse a plataforma'

  return (
    <main className="login-page min-h-screen bg-slate-50 p-4 sm:p-8 lg:grid lg:grid-cols-2 lg:gap-12">
      <section className="login-brand-panel hidden flex-col justify-between rounded-3xl bg-ellenco-navy p-12 text-white shadow-card lg:flex">
        <div className="inline-flex w-fit rounded-2xl bg-white p-3">
          <img className="h-16 w-64 object-contain" src="/logo-ellenco.png" alt="Ellenco" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-[.2em] text-red-200">ACESSO OPERACIONAL</p>
          <h1 className="mt-5 max-w-lg text-5xl font-extrabold leading-tight">
            Gestão integrada para obras e resultados.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">
            Acesso liberado e direto para administradores, supervisores e funcionários de campo.
          </p>
        </div>
        <p className="text-sm text-blue-200">ELLENCO · Plataforma Operacional</p>
      </section>

      <section className="mx-auto flex w-full max-w-md items-center py-8">
        <div className="login-form-card w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-10">
          <div className="mb-8 inline-flex rounded-2xl bg-slate-50 p-3 lg:hidden">
            <img className="h-14 w-52 object-contain" src="/logo-ellenco.png" alt="Ellenco" />
          </div>

          <span className="login-lock">
            <LockKeyhole />
          </span>

          <p className="text-xs font-extrabold tracking-[.16em] text-ellenco-red">IDENTIDADE ELLENCO</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {mode === 'register'
              ? 'Cadastre-se como Administrador ou Funcionário. Acesso imediato sem necessidade de aprovação.'
              : mode === 'forgot'
              ? 'Enviaremos instruções de recuperação para o seu e-mail.'
              : mode === 'reset'
              ? 'Use uma senha forte com no mínimo 8 caracteres.'
              : 'Entre com seu e-mail corporativo cadastrado.'}
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            {mode === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Perfil de Acesso Desejado</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        chosenRole === 'ADMIN'
                          ? 'border-ellenco-navy bg-ellenco-navy text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => setChosenRole('ADMIN')}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        chosenRole === 'SUPERVISOR'
                          ? 'border-ellenco-navy bg-ellenco-navy text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => setChosenRole('SUPERVISOR')}
                    >
                      Supervisor
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        chosenRole === 'FUNCIONARIO'
                          ? 'border-ellenco-navy bg-ellenco-navy text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => setChosenRole('FUNCIONARIO')}
                    >
                      Funcionário
                    </button>
                  </div>
                </div>

                <input
                  className="login-input"
                  placeholder="Nome completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <input
                  className="login-input"
                  inputMode="numeric"
                  placeholder="CPF (apenas números)"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  required
                />
              </>
            )}

            {mode !== 'reset' && (
              <div className="login-field">
                <Mail />
                <input
                  type="email"
                  placeholder="E-mail corporativo"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {!['forgot'].includes(mode) && (
              <>
                <div className="login-field">
                  <LockKeyhole />
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder={mode === 'reset' ? 'Nova senha' : 'Senha de acesso'}
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                {mode === 'reset' && (
                  <div className="login-field">
                    <LockKeyhole />
                    <input
                      type={show ? 'text' : 'password'}
                      placeholder="Confirmar nova senha"
                      minLength={8}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {error && <p className="form-error">{error}</p>}
            {message && <p className="feedback">{message}</p>}

            <button className="login-submit" disabled={loading}>
              {loading
                ? 'Processando…'
                : mode === 'forgot'
                ? 'Enviar recuperação'
                : mode === 'reset'
                ? 'Atualizar senha'
                : mode === 'register'
                ? `Criar acesso como ${chosenRole === 'ADMIN' ? 'Administrador' : chosenRole === 'SUPERVISOR' ? 'Supervisor' : 'Funcionário'}`
                : 'Entrar'}
            </button>
          </form>

          {mode === 'login' && (
            <button className="login-link" onClick={() => setMode('forgot')}>
              Esqueci minha senha
            </button>
          )}

          <button
            className="login-link"
            onClick={() => setMode(mode === 'register' ? 'login' : mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'register'
              ? 'Já possui acesso? Entrar'
              : mode === 'login'
              ? 'Primeiro acesso ou novo cadastro? Criar conta'
              : 'Voltar para o login'}
          </button>
        </div>
      </section>
    </main>
  )
}
