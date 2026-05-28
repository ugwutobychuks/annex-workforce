// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = opts;
  const res = await fetch(`${API_BASE}/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      /* not json */
    }
    const message = payload?.message
      ? Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message
      : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: any }>(
      '/auth/login',
      { method: 'POST', body: { email, password } },
    ),
  register: (data: {
    email: string; password: string; firstName: string; lastName: string;
    role?: 'CANDIDATE' | 'EMPLOYER'; phone?: string;
  }) =>
    api<{ accessToken: string; refreshToken: string; user: any }>(
      '/auth/register',
      { method: 'POST', body: data },
    ),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string; user: any }>(
      '/auth/refresh',
      { method: 'POST', body: { refreshToken } },
    ),
  logout: (token: string) =>
    api('/auth/logout', { method: 'POST', token }),
  me: (token: string) => api<any>('/auth/me', { token }),
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
};
