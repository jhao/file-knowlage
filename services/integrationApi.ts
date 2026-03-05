import { apiRequest } from './apiClient';

export interface IntegrationConfig {
  authUrl: string;
  totalCountUrl: string;
  pendingFilesUrl: string;
  statusCallbackUrl: string;
  categoryListUrl: string;
  fileMetaFields: string;
  downloadUrlNote: string;
}

const defaultConfig: IntegrationConfig = {
  authUrl: '',
  totalCountUrl: '',
  pendingFilesUrl: '',
  statusCallbackUrl: '',
  categoryListUrl: '',
  fileMetaFields: 'fileId,fileName,fileType,fileSize,category,downloadUrl,batchNo',
  downloadUrlNote: '文件下载地址可直接放在待处理文件清单中 downloadUrl 字段。',
};

export const getIntegrationConfig = async (): Promise<IntegrationConfig> => {
  const result = await apiRequest<{ item: Partial<IntegrationConfig> }>('/api/integrations');
  return { ...defaultConfig, ...(result.item || {}) };
};

export const saveIntegrationConfig = async (payload: IntegrationConfig): Promise<IntegrationConfig> => {
  const result = await apiRequest<{ item: IntegrationConfig }>('/api/integrations', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.item;
};

export const startIntegrationSync = async (): Promise<{ taskId: string; message: string }> =>
  apiRequest<{ taskId: string; message: string }>('/api/integrations/start-sync', { method: 'POST' });
