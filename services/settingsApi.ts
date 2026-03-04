import { apiRequest } from './apiClient';

export interface SystemConfigItem {
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
}

export interface LlmTestPayload {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
}

export interface LlmTestResult {
  success: boolean;
  message: string;
  detail?: string;
  provider?: string;
}

export const listSettings = async (): Promise<SystemConfigItem[]> => {
  const result = await apiRequest<{ items: SystemConfigItem[] }>('/api/settings');
  return result.items;
};

export const updateSetting = async (key: string, value: string, description?: string) => {
  await apiRequest(`/api/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
};

export const deleteSetting = async (key: string) => {
  await apiRequest(`/api/settings/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
};

export const testLlmSetting = async (payload: LlmTestPayload) => {
  return apiRequest<LlmTestResult>('/api/settings/llm/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
