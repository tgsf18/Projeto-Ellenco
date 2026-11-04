const API_URL = '/api';

export type UserRole = 'GLOBAL_ADMIN' | 'CEO' | 'ADMIN' | 'SUPERVISOR' | 'FUNCIONARIO';

export type AuthUser = {
  token: string;
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatar?: string;
};

function announceSuccessfulMutation(method: string): void {
  if (typeof window === 'undefined') return;
  const message = method === 'DELETE' ? 'Registro removido.' : method === 'PATCH' ? 'Alterações salvas.' : 'Operação concluída.';
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
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    announceSuccessfulMutation((options.method || '').toUpperCase());
  }
  return result;
}
