import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tailwind.css'
import './mobile.css'
import './polish.css'
import './footer.css'
import './footer-mobile-fix.css'
import './navigation.css'
import './search.css'
import './dashboard-banner.css'
import './dashboard-alerts.css'
import './notification.css'
import './stock-actions.css'
import './receipt-empty.css'
import './spacing.css'
import './action-icons.css'
import './buttons.css'
import './styles.css'
import './loading.css'
import './modal.css'
import './evolution.css'
import './design-system.css'

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() { return this.state.error ? <main className="loading-screen"><div className="loading-card"><h1>Não foi possível abrir a plataforma</h1><p>{this.state.error.message}</p></div></main> : this.props.children }
}
const root = document.getElementById('root')
if (root) ReactDOM.createRoot(root).render(<Boundary><App /></Boundary>)
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))
