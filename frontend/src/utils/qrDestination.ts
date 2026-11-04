export type QrTarget = { kind: 'produto' | 'ferramenta'; id: number }

export function parseQrTarget(value: string): QrTarget | null {
  try {
    const url = new URL(value, window.location.origin)
    for (const kind of ['produto', 'ferramenta'] as const) {
      const rawId = url.searchParams.get(kind)
      if (rawId && /^\d+$/.test(rawId) && Number(rawId) > 0) {
        return { kind, id: Number(rawId) }
      }
    }
  } catch {
    return null
  }
  return null
}

export function qrTargetFromCurrentUrl(): QrTarget | null {
  return parseQrTarget(window.location.href)
}

export function qrTargetUrl(target: QrTarget): string {
  const url = new URL('/', window.location.origin)
  url.searchParams.set(target.kind, String(target.id))
  return url.toString()
}
