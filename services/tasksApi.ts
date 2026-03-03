import { AITaskLog } from '../types';
import { apiRequest } from './apiClient';

export const listTasks = async () => {
  const result = await apiRequest<{ items: AITaskLog[] }>('/api/tasks');
  return result.items;
};
