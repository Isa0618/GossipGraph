const INVITE_STORAGE_KEY = 'gossip_invite_code';

export interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
}

export interface GraphApiResponse {
  nodes: Array<{ id: string; label: string; avatar: string }>;
  links: Array<{
    source: string;
    target: string;
    relation: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    detail?: string;
    timeline?: Array<{
      year: number;
      month?: number;
      relation: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      detail?: string;
    }>;
  }>;
  quota?: QuotaInfo;
}

export function getStoredInviteCode(): string | null {
  return localStorage.getItem(INVITE_STORAGE_KEY);
}

export function setStoredInviteCode(code: string) {
  localStorage.setItem(INVITE_STORAGE_KEY, code.trim());
}

export function clearStoredInviteCode() {
  localStorage.removeItem(INVITE_STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const code = getStoredInviteCode();
  return code ? { 'X-Invite-Code': code } : {};
}

export async function verifyInviteCode(code: string): Promise<{
  valid: boolean;
  authRequired: boolean;
  quota?: QuotaInfo;
  error?: string;
}> {
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { valid: false, authRequired: true, error: data.error || '邀请码无效' };
  }
  return data;
}

export async function fetchQuota(): Promise<QuotaInfo> {
  const res = await fetch('/api/quota', { headers: authHeaders() });
  if (!res.ok) throw new Error('无法获取额度');
  return res.json();
}

export async function fetchGraph(text: string): Promise<GraphApiResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({ error: '请求失败' }));

  if (!res.ok) {
    const msg = data.error || data.message || '请求失败';
    const err = new Error(msg) as Error & { quota?: QuotaInfo };
    if (data.quota) err.quota = data.quota;
    throw err;
  }

  return data;
}

export async function checkAuthRequired(): Promise<boolean> {
  const res = await fetch('/api/health');
  const data = await res.json();
  return Boolean(data.authRequired);
}
