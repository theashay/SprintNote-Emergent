import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const TOKEN_KEY = 'sprintnote_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null; } catch { return null; }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const t = await getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function req<T = any>(
  path: string,
  opts: { method?: string; body?: any; isForm?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(opts.isForm ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
  };
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  // auth
  signup: (body: { email: string; password: string; name?: string }) =>
    req('/auth/signup', { method: 'POST', body }),
  verifyOtp: (body: { email: string; otp: string }) =>
    req<{ token: string; user: any }>('/auth/verify-otp', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    req<{ token?: string; user?: any; otp_required?: boolean; dev_otp?: string; email?: string }>('/auth/login', { method: 'POST', body }),
  emergentSession: (session_id: string) =>
    req<{ token: string; user: any }>('/auth/emergent/session', { method: 'POST', body: { session_id } }),
  me: () => req<{ user: any }>('/auth/me'),
  logout: () => req('/auth/logout', { method: 'POST' }),

  // notes
  listNotes: (params: { folder?: string; favorite?: boolean; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.folder) qs.set('folder', params.folder);
    if (params.favorite) qs.set('favorite', 'true');
    if (params.q) qs.set('q', params.q);
    const s = qs.toString();
    return req<{ notes: any[] }>(`/notes${s ? `?${s}` : ''}`);
  },
  getNote: (id: string) => req<{ note: any }>(`/notes/${id}`),
  createNote: (body: any) => req<{ note: any }>('/notes', { method: 'POST', body }),
  updateNote: (id: string, body: any) =>
    req<{ note: any }>(`/notes/${id}`, { method: 'PUT', body }),
  deleteNote: (id: string) => req(`/notes/${id}`, { method: 'DELETE' }),

  // folders
  listFolders: () => req<{ folders: { name: string; count: number }[] }>('/folders'),

  // ai
  transcribe: async (audioUri: string, name = 'recording.m4a') => {
    const form = new FormData();
    // React Native multipart file
    // @ts-ignore
    form.append('file', { uri: audioUri, name, type: 'audio/m4a' } as any);
    const headers: Record<string, string> = { ...(await authHeaders()), Accept: 'application/json' };
    const r = await fetch(`${BASE}/api/ai/transcribe`, { method: 'POST', headers, body: form as any });
    const t = await r.text();
    const data = t ? JSON.parse(t) : null;
    if (!r.ok) throw new Error(data?.detail || 'Transcription failed');
    return data as { transcript: string };
  },
  rewrite: (body: { transcript: string; style: string; level?: string }) =>
    req<{ title: string | null; polished: string; style: string; level: string }>(
      '/ai/rewrite', { method: 'POST', body }
    ),

  // payments
  createPaymentSession: (plan: 'monthly' | 'annual') =>
    req<{ url: string }>('/payments/create-session', { method: 'POST', body: { plan } }),
};

export const BACKEND_URL = BASE;
