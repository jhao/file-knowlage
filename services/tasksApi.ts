import { AITaskExecutionLog, AITaskLog } from '../types';
import { apiRequest } from './apiClient';

export const listTasks = async () => {
  const result = await apiRequest<{ items: AITaskLog[] }>('/api/tasks');
  return result.items;
};

export const listTaskExecutionLogs = async (taskId: string) => {
  const result = await apiRequest<{ items: AITaskExecutionLog[] }>(`/api/tasks/${encodeURIComponent(taskId)}/logs`);
  return result.items;
};

export const deleteTask = async (taskId: string) => {
  await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
};

export const retryTask = async (taskId: string) => {
  const result = await apiRequest<{ taskId: string; message: string }>(`/api/tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result;
};
