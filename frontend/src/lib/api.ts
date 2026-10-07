/**
 * API client — all calls go through Vite /api proxy → NestJS :3002
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

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('survey:unauthorized'));
    let message = `HTTP ${res.status}`;
    try { const e = await res.json(); message = e.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    /**
     * POST /auth/login
     * Public — no auth header needed.
     * Field is `password` (plain text — backend does bcrypt.compare).
     */
    login: (username: string, password: string) =>
      request<{ access_token: string; user: any }>('POST', '/auth/login', {
        username,
        password,   // NOT password_hash
      }, false),

    /**
     * POST /auth/register
     * Requires USER_CREATE permission — must send auth header.
     */
    register: (body: {
      username:    string;
      full_name:   string;
      email?:      string;
      phone?:      string;
      password:    string;   // plain text — hashed server-side
      role_id:     number;
      supervisor_id?: string;
    }) => request<any>('POST', '/auth/register', body),   // auth=true (default)

    /**
     * GET /auth/users
     * Lists all users — requires USER_CREATE permission.
     */
    listUsers: () => request<any[]>('GET', '/auth/users'),

    /**
     * PATCH /auth/users/:id/status
     * Activate / deactivate a user — requires USER_REMOVE permission.
     */
    setUserStatus: (userId: string, is_active: boolean) =>
      request<any>('PATCH', `/auth/users/${userId}/status`, { is_active }),

    /**
     * GET /auth/me
     * Returns current user from JWT — any authenticated user.
     */
    me: () => request<any>('GET', '/auth/me'),
  },

  // ── Survey Form ─────────────────────────────────────────────
  form: {
    /** GET /survey-forms/active — requires SURVEY_SUBMIT permission */
    getActive: () => request<any>('GET', '/survey-forms/active'),
  },

  // ── Sync ────────────────────────────────────────────────────
  sync: {
    /** POST /sync — requires SYNC_DATA permission */
    push: (payload: { device_id: string; responses: any[] }) =>
      request<any>('POST', '/sync', payload),
  },

  // ── Industrial Units ─────────────────────────────────────────
  units: {
    /** GET /industrial-units — any authenticated user */
    list: () => request<any[]>('GET', '/industrial-units'),

    /** GET /industrial-units/:id */
    get: (id: string) => request<any>('GET', `/industrial-units/${id}`),

    /** POST /industrial-units/:id/approve — requires SURVEY_CONFIRM */
    approve: (id: string, body: { response_id?: string; remarks?: string }) =>
      request<any>('POST', `/industrial-units/${id}/approve`, body),

    /** POST /industrial-units/:id/reject — requires SURVEY_CONFIRM */
    reject: (id: string, body: { response_id?: string; remarks?: string }) =>
      request<any>('POST', `/industrial-units/${id}/reject`, body),
  },
};
