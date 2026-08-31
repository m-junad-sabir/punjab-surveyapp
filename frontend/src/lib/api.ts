/**
 * API client — all calls go through /api proxy → NestJS backend
 */
const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('survey_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      message = err.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ── Auth ─────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ access_token: string; user: any }>('POST', '/auth/login', {
        username,
        password_hash: password,
      }, false),

    register: (body: {
      username: string;
      full_name: string;
      email?: string;
      phone?: string;
      password_hash: string;
      role_id: number;
    }) => request<any>('POST', '/auth/register', body, false),
  },

  // ── Survey Form ────────────────────────────────────────────
  form: {
    getActive: () => request<any>('GET', '/survey-forms/active'),
  },

  // ── Sync ──────────────────────────────────────────────────
  sync: {
    push: (payload: { device_id: string; responses: any[] }) =>
      request<any>('POST', '/sync', payload),
  },

  // ── Industrial Units ──────────────────────────────────────
  units: {
    list: () => request<any[]>('GET', '/industrial-units'),
    get: (id: string) => request<any>('GET', `/industrial-units/${id}`),
    approve: (id: string, body: { response_id?: string; remarks?: string }) =>
      request<any>('POST', `/industrial-units/${id}/approve`, body),
    reject: (id: string, body: { response_id?: string; remarks?: string }) =>
      request<any>('POST', `/industrial-units/${id}/reject`, body),
  },
};
