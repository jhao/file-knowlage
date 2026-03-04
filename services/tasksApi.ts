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
