import { apiRequest } from './apiClient';
import { User, UserRole } from '../types';
import { AuthUser } from './authApi';

const toUser = (user: AuthUser): User => ({
  id: String(user.id),
  name: user.displayName,
  role: user.role as UserRole,
  department: user.department,
  permissions: {
    canView: true,
    canImport: true,
    canExport: user.role === UserRole.ADMIN,
    canModify: user.role === UserRole.ADMIN,
    canDelete: user.role === UserRole.ADMIN,
    requiresApproval: user.role !== UserRole.ADMIN,
  },
});

export const listUsers = async (): Promise<User[]> => {
  const result = await apiRequest<{ items: AuthUser[] }>('/api/users');
  return result.items.map(toUser);
};
