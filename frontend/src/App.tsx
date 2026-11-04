import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Bell, Boxes, ChevronLeft, ChevronRight, ClipboardList, HardHat, Home, LogOut, Menu, Moon, Package, RefreshCw, Settings, Sun, UserRound, Wrench, X } from 'lucide-react'
import { AuthUser, isTokenValid, request } from './api'
import Login from './pages/Login'
import LoadingScreen from './components/LoadingScreen'
import StockPanel from './components/StockPanelV2'
import EpiPanel from './components/EpiPanelV2'
import ReceiptPanel from './components/ReceiptPanel'
import ManagementReports from './components/ManagementHub'
import AccountPanel from './components/AccountPanel'
import Dashboard from './components/Dashboard'
import AuditPanel from './components/AuditPanel'
import HomePage from './components/HomePage'
import MovementsPanel from './components/MovementsPanel'
import InventoryPanel from './components/InventoryPanel'
import ToolsPanel from './components/ToolsPanel'
import SyncPanel from './components/SyncPanel'
import ToastHost from './components/ToastHost'

type View = 'home' | 'dashboard' | 'receipts' | 'stock' | 'movements' | 'inventory' | 'tools' | 'epi' | 'sync' | 'employees' | 'audit' | 'reports' | 'management' | 'account'
type Theme = 'light' | 'dark'

const labels: Record<View, string> = {
  home: 'Início',
  dashboard: 'Dashboard',
  receipts: 'Recebimentos',
  stock: 'Estoque',
  movements: 'Movimentações',
  inventory: 'Inventário',
  tools: 'Ferramentas',
  epi: 'EPIs',
  sync: 'Sincronização',
  employees: 'Funcionários',
  audit: 'Auditoria',
  reports: 'Relatórios',
  management: 'Gerenciamento',
  account: 'Minha conta'
}

const icons: Record<View, any> = {
  home: Home,
  dashboard: BarChart3,
  receipts: Package,
  stock: Boxes,
  movements: ClipboardList,
  inventory: ClipboardList,
  tools: Wrench,
  epi: HardHat,
  sync: RefreshCw,
  employees: UserRound,
  audit: ClipboardList,
  reports: BarChart3,
  management: Settings,
  account: UserRound
}

const roleFriendlyName: Record<string, string> = {
  GLOBAL_ADMIN: 'Admin Global AIR',
  CEO: 'CEO / Diretoria',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  FUNCIONARIO: 'Funcionário'
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ellenco_sidebar') === 'collapsed')
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('ellenco_theme') === 'dark' ? 'dark' : 'light')
  const [view, setView] = useState<View>('home')
  const [dashboard, setDashboard] = useState<any>(null)
  const dashboardFetchedAt = useRef(0)
  const dashboardInFlight = useRef<Promise<void> | null>(null)
  const announcedAlerts = useRef(new Set<string>())
  const dashboardRefreshQueued = useRef(false)
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const value = localStorage.getItem('ellenco_user')
      return value && isTokenValid(localStorage.getItem('ellenco_token')) ? JSON.parse(value) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 350)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('ellenco_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('ellenco_sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  const refreshDashboard = (force = false) => {
    if (!user || (!force && Date.now() - dashboardFetchedAt.current < 15000)) return dashboardInFlight.current
    if (dashboardInFlight.current) return dashboardInFlight.current
    dashboardInFlight.current = request<any>('/dashboard').then(data => {
      setDashboard(data)
      dashboardFetchedAt.current = Date.now()
      const alerts: { title: string; route: string }[] = data?.alerts || []
      const activeAlertKeys = new Set(alerts.map(alert => `${alert.route}:${alert.title}`))
      alerts.forEach(alert => {
        const key = `${alert.route}:${alert.title}`
        if (announcedAlerts.current.has(key)) return
        announcedAlerts.current.add(key)
        const view = alert.route.includes('estoque') ? 'stock' : alert.route.includes('receb') ? 'receipts' : 'epi'
        window.dispatchEvent(new CustomEvent('ellenco:toast', { detail: { type: 'warning', message: alert.title, action: 'Abrir', view } }))
      })
      announcedAlerts.current = activeAlertKeys
    }).catch(() => undefined).finally(() => {
      dashboardInFlight.current = null
      if (dashboardRefreshQueued.current) {
        dashboardRefreshQueued.current = false
        if (user && (view === 'dashboard' || view === 'home')) void refreshDashboard(true)
      }
    })
    return dashboardInFlight.current
  }

  useEffect(() => {
    if (user && (view === 'dashboard' || view === 'home')) void refreshDashboard()
  }, [user, view])

  useEffect(() => {
    const onDataChanged = () => {
      dashboardFetchedAt.current = 0
      if (user && (view === 'dashboard' || view === 'home')) {
        if (dashboardInFlight.current) dashboardRefreshQueued.current = true
        else void refreshDashboard(true)
      }
    }
    const onNavigate = (event: Event) => {
      const next = (event as CustomEvent<View>).detail
      if (next) setView(next)
    }
    window.addEventListener('ellenco:data-changed', onDataChanged)
    window.addEventListener('ellenco:navigate', onNavigate)
    return () => {
      window.removeEventListener('ellenco:data-changed', onDataChanged)
      window.removeEventListener('ellenco:navigate', onNavigate)
    }
  }, [user, view])

  const allowed = useMemo<View[]>(() => {
    if (!user) return ['home']
    if (user.role === 'FUNCIONARIO') {
      return ['home', 'epi', 'sync', 'account']
    }
    const base: View[] = ['home', 'dashboard', 'receipts', 'stock', 'movements', 'inventory', 'tools', 'epi', 'sync', 'audit']
    if (user.role === 'ADMIN' || user.role === 'CEO' || user.role === 'GLOBAL_ADMIN') {
      base.push('management')
    }
    base.push('account')
    return base
  }, [user])

  if (booting) return <LoadingScreen message="Conectando pessoas, obras e resultados…" />
  if (!user) return <Login onLogin={setUser} />

  const go = (next: View) => {
    setView(next)
    setMobileMenu(false)
  }

  const logout = () => {
    localStorage.clear()
    setDashboard(null)
    dashboardFetchedAt.current = 0
    announcedAlerts.current.clear()
    setUser(null)
  }

  const alertCount = (dashboard?.alerts || []).length
  const current = allowed.includes(view) ? view : 'home'

  const content = current === 'home' ? <HomePage user={user} data={dashboard} onNavigate={go} />
    : current === 'dashboard' ? <Dashboard data={dashboard} onNavigate={go} />
    : current === 'account' ? <AccountPanel user={user} onUpdate={setUser} />
    : current === 'stock' ? <StockPanel />
    : current === 'movements' ? <MovementsPanel user={user} />
    : current === 'inventory' ? <InventoryPanel user={user} />
    : current === 'tools' ? <ToolsPanel />
    : current === 'receipts' ? <ReceiptPanel />
    : current === 'epi' ? <EpiPanel user={user} />
    : current === 'sync' ? <SyncPanel />
    : current === 'audit' ? <AuditPanel />
    : <ManagementReports user={user} />

  const nav = (mobile = false) => (
    <>
      <div className="sidebar-brand">
        <img src="/logo-ellenco.png" alt="Ellenco" />
        {(!collapsed || mobile) && (
          <span>
            Plataforma<br />
            <small>Operacional</small>
          </span>
        )}
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {allowed.map(item => {
          const Icon = icons[item]
          return (
            <button
              key={item}
              className={current === item ? 'active' : ''}
              onClick={() => go(item)}
              title={collapsed && !mobile ? labels[item] : undefined}
            >
              <Icon size={20} />
              <span>{labels[item]}</span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
        </button>
        <button onClick={logout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </>
  )

  return (
    <div className={`application-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <ToastHost />
      <aside className="desktop-sidebar">
        {nav()}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>
      <div className="application-content">
        <header className="application-header">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu">
            <Menu />
          </button>
          <div>
            <span className="header-context">ELLENCO · Operação Integrada</span>
            <strong>{labels[current]}</strong>
          </div>
          <div className="header-actions">
            <span className="connection-pill"><i /> Online</span>
            <button className="header-icon" onClick={() => go('dashboard')} aria-label={`${alertCount} alertas`}>
              <Bell size={20} />
              {alertCount > 0 && <b>{alertCount}</b>}
            </button>
            <button className="user-chip" onClick={() => go('account')}>
              <span className="user-avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : user.nome.slice(0, 1)}
              </span>
              <span>
                <strong>{user.nome}</strong>
                <small>{roleFriendlyName[user.role] || user.role}</small>
              </span>
            </button>
          </div>
        </header>
        <main className="application-main">{content}</main>
        <footer className="application-footer">
          © {new Date().getFullYear()} ELLENCO S/A · Plataforma Operacional
        </footer>
      </div>
      {mobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenu(false)}>
          <aside onClick={event => event.stopPropagation()}>
            {nav(true)}
            <button className="mobile-menu-close" onClick={() => setMobileMenu(false)} aria-label="Fechar menu">
              <X />
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}
