import { apiRequest } from './apiClient';

export interface DashboardStatsResponse {
  metrics: {
    total: number;
    processing: number;
    reviewNeeded: number;
    approved: number;
    storageUsedBytes: number;
  };
  charts: {
    byCategory: Array<{ name: string; value: number }>;
    byMonth: Array<{ name: string; docs: number }>;
  };
}

export const getDashboardStats = async () => {
  return apiRequest<DashboardStatsResponse>('/api/stats/dashboard');
};
