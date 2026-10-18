import type { IndustrialUnit } from '../types';

/**
 * API client — uses the configured API URL or Vite's local /api proxy.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

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
      role_code:   string;
      supervisor_id?: string;
    }) => request<any>('POST', '/auth/register', body),   // auth=true (default)

    listRoles: () => request<Array<{ id: number; code: string; name: string }>>('GET', '/auth/roles'),

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

    uploadPhoto: async (photo: {
      photo_id: string;
      response_id: string;
      owner_id: string;
      photo_type: string;
      blob: Blob;
      latitude: number;
      longitude: number;
      accuracy_m: number;
      captured_at: string;
    }) => {
      const formData = new FormData();
      formData.append('file', photo.blob, `${photo.photo_id}.jpg`);
      formData.append('photo_id', photo.photo_id);
      formData.append('response_id', photo.response_id);
      formData.append('photo_type', photo.photo_type);
      formData.append('latitude', String(photo.latitude));
      formData.append('longitude', String(photo.longitude));
      formData.append('accuracy_m', String(photo.accuracy_m));
      formData.append('captured_at', photo.captured_at);

      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${BASE}/sync/photos`, { method: 'POST', headers, body: formData });
      if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('survey:unauthorized'));
        let message = `Photo upload failed (HTTP ${response.status}).`;
        try {
          const error = await response.json();
          message = error.message || message;
        } catch { /* response has no JSON body */ }
        throw new Error(message);
      }
      return response.json() as Promise<{ photo_id: string; status: string }>;
    },
  },

  attachments: {
    listForUnit: (unitId: string) =>
      request<Array<{
        id: string;
        photo_type: string;
        captured_at: string;
        latitude: number;
        longitude: number;
        accuracy_m: number;
      }>>('GET', `/attachments/unit/${unitId}`),

    getFile: async (attachmentId: string): Promise<Blob> => {
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${BASE}/attachments/${attachmentId}`, { headers });
      if (!response.ok) {
        if (response.status === 401) window.dispatchEvent(new Event('survey:unauthorized'));
        throw new Error(`Unable to load photo (HTTP ${response.status}).`);
      }
      return response.blob();
    },
  },

  // ── Industrial Units ─────────────────────────────────────────
  units: {
    /** GET /industrial-units — any authenticated user */
    list: () => request<IndustrialUnit[]>('GET', '/industrial-units'),

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
