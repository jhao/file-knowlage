import { apiRequest } from './apiClient';
import { User, UserRole } from '../types';
import { AuthUser } from './authApi';

const toUser = (user: AuthUser): User => ({
  id: String(user.id),
  username: user.username,
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

interface SaveUserPayload {
  username?: string;
  displayName: string;
  role: UserRole;
  department: string;
  isActive?: boolean;
  passwordDigest?: string;
}

export const createUser = async (payload: SaveUserPayload): Promise<User> => {
  const result = await apiRequest<{ item: AuthUser }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toUser(result.item);
};

export const updateUser = async (userId: string, payload: SaveUserPayload): Promise<User> => {
  const result = await apiRequest<{ item: AuthUser }>(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return toUser(result.item);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
};
