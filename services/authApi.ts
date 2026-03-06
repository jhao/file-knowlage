export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: '管理员' | '普通用户';
  department: string;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const HTTP_API_BASE = (import.meta.env.VITE_API_HTTP_BASE as string | undefined)?.trim();
const HTTPS_API_BASE = (import.meta.env.VITE_API_HTTPS_BASE as string | undefined)?.trim();

export const resolveApiBase = () => {
  const isHttps = window.location.protocol === 'https:';
  const selected = isHttps ? HTTPS_API_BASE : HTTP_API_BASE;
  return selected || 'http://localhost:5009';
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${resolveApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }
  return payload as T;
};

export const login = async (username: string, passwordDigest: string): Promise<LoginResponse> =>
  request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, passwordDigest }),
  });

export const getCurrentUser = async (token: string): Promise<AuthUser> => {
  const result = await request<{ user: AuthUser }>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return result.user;
};

export const changePassword = async (oldPasswordDigest: string, newPasswordDigest: string) => {
  const token = localStorage.getItem('auth_token') || '';
  return request<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ oldPasswordDigest, newPasswordDigest }),
  });
};
