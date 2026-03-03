import { apiRequest } from './apiClient';

export interface SystemConfigItem {
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
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
