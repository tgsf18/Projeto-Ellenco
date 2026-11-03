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
  const token = localStorage.getItem('ellenco_token');
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  // Falha real de autenticação (401): limpa sessão e redireciona para login
  if (response.status === 401) {
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

  return response.status === 204 ? (undefined as T) : response.json();
}
