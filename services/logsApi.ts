import { apiRequest } from './apiClient';
import { SystemLogEntry, SystemLogQuery } from '../types';

export interface SystemLogResponse {
  items: SystemLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const listSystemLogs = async (query: SystemLogQuery = {}) => {
  const params = new URLSearchParams();

  if (query.type) params.set('type', query.type);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  params.set('limit', String(query.limit ?? 100));
  params.set('page', String(query.page ?? 1));

  const result = await apiRequest<SystemLogResponse>(`/api/logs?${params.toString()}`);
  return result;
};
