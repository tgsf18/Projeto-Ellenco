import { useEffect, useRef } from 'react'

/** Loads a module once, refreshes after local writes, when the tab returns, and periodically. */
export function useModuleRefresh(load: () => Promise<unknown>, intervalMs = 60_000) {
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    let active = true
    let loading = false
    let refreshQueued = false
    let debounceTimer = 0

    const refresh = () => {
      if (!active || document.visibilityState === 'hidden') return
      if (loading) { refreshQueued = true; return }
      loading = true
      Promise.resolve(loadRef.current())
        .catch(() => undefined)
        .finally(() => {
          loading = false
          if (refreshQueued) { refreshQueued = false; refresh() }
        })
    }
    const onDataChanged = () => {
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(refresh, 180)
    }

    refresh()
    window.addEventListener('ellenco:data-changed', onDataChanged)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(refresh, intervalMs)

    return () => {
      active = false
      window.clearTimeout(debounceTimer)
      window.clearInterval(interval)
      window.removeEventListener('ellenco:data-changed', onDataChanged)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [intervalMs])
}
