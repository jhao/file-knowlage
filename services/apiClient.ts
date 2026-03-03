import { resolveApiBase } from './authApi';

const getToken = () => localStorage.getItem('auth_token') || '';

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const response = await fetch(`${resolveApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }
  return payload as T;
};
