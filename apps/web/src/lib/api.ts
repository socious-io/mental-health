const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5070';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('moya_token');
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem('moya_token', t);
  else localStorage.removeItem('moya_token');
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error || res.statusText);
  return body as T;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface User {
  id: string;
  handle: string;
  identity_verified: boolean;
  locale: string;
  created_at: string;
}

export interface Screening {
  id: string;
  score: number;
  band: string;
  item9_flag: boolean;
  credential_status?: string;
  created_at: string;
}

export interface Match {
  provider: {
    id: string; slug: string; name_en: string; name_ja: string; modality: string;
    languages: string[]; cost_band: string; description_en: string; description_ja: string;
    anonymous_booking: boolean;
  };
  score: number;
  reasons: string[];
}
