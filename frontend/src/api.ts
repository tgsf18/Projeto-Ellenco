const API_URL = '/api';
const GET_CACHE_MS = 5_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const pendingGets = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;
let activeApiRequests = 0;

export function clearRequestCache(): void {
  cacheGeneration += 1;
  getCache.clear();
  pendingGets.clear();
}

function reportApiActivity(delta: number): void {
  activeApiRequests = Math.max(0, activeApiRequests + delta);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ellenco:api-activity', { detail: { active: activeApiRequests > 0 } }));
}

export type UserRole = 'GLOBAL_ADMIN' | 'CEO' | 'ADMIN' | 'SUPERVISOR' | 'FUNCIONARIO';

export type AuthUser = {
  token: string;
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatar?: string;
};

function announceSuccessfulMutation(path: string, method: string): void {
  if (typeof window === 'undefined') return;
  clearRequestCache();
  const message = path.startsWith('/inventory/operations')
    ? 'Movimentação registrada. Saldos e histórico atualizados.'
    : path.startsWith('/epi')
      ? 'Operação de EPI concluída. Entregas e alertas atualizados.'
      : path.startsWith('/stock') || path.startsWith('/receipts')
        ? 'Operação concluída. Estoque e recebimentos atualizados.'
        : method === 'DELETE' ? 'Registro removido. As informações foram atualizadas.'
          : method === 'PATCH' || method === 'PUT' ? 'Alterações salvas e informações atualizadas.'
            : 'Operação concluída. As informações foram atualizadas.';
  window.dispatchEvent(new CustomEvent('ellenco:toast', { detail: { type: 'success', message } }));
  window.dispatchEvent(new CustomEvent('ellenco:data-changed'));
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function errorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Não foi possível concluir a operação.';
  const record = body as Record<string, unknown>;
  if (record.message) return String(record.message);
  if (record.error) return String(record.error);
  const values = Object.values(record);
  if (values.length > 0 && typeof values[0] === 'string') return values[0];
  return 'Não foi possível concluir a operação.';
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') {
    const cached = getCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const pending = pendingGets.get(path);
    if (pending) return pending as Promise<T>;
  }

  const generation = cacheGeneration;
  reportApiActivity(1);
  const pending = performRequest<T>(path, options).then(result => {
    if (method === 'GET') {
      if (generation === cacheGeneration) getCache.set(path, { value: result, expiresAt: Date.now() + GET_CACHE_MS });
    } else announceSuccessfulMutation(path, method);
    return result;
  }).finally(() => reportApiActivity(-1));

  if (method === 'GET') {
    pendingGets.set(path, pending);
    try { return await pending; }
    finally { if (pendingGets.get(path) === pending) pendingGets.delete(path); }
  }
  return pending;
}

async function performRequest<T>(path: string, options: RequestInit): Promise<T> {
  const isAuthenticationRequest = path.startsWith('/auth/');
  const token = isAuthenticationRequest ? null : localStorage.getItem('ellenco_token');
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  // A falha de login deve aparecer no formulário; não é uma sessão expirada.
  if (response.status === 401) {
    const body = await response.json().catch(() => null);
    if (isAuthenticationRequest) throw new Error(errorMessage(body));

    localStorage.removeItem('ellenco_token');
    localStorage.removeItem('ellenco_user');
    window.location.reload();
    throw new Error('Sua sessão expirou ou é inválida. Faça login novamente.');
  }

  // Falha de permissão (403): NÃO desconecta o usuário nem limpa a sessão!
  if (response.status === 403) {
    const body = await response.json().catch(() => null);
    throw new Error(
      (body && (body.message || body.error))
        ? String(body.message || body.error)
        : 'Acesso negado: seu perfil não possui autorização para executar esta ação.'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(errorMessage(body));
  }

  const result = response.status === 204 ? undefined as T : await response.json() as T;
  return result;
}
