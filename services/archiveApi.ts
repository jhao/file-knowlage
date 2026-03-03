import { ArchiveDocument } from '../types';
import { apiRequest } from './apiClient';

export const listArchives = async () => {
  const result = await apiRequest<{ items: ArchiveDocument[] }>('/api/archives');
  return result.items;
};

export const createUpload = async (file: File) => {
  const result = await apiRequest<{ archive: ArchiveDocument; taskId: string }>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  return result.archive;
};

export const updateArchive = async (documentId: string, updates: Partial<ArchiveDocument>) => {
  const result = await apiRequest<{ item: ArchiveDocument }>(`/api/archives/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result.item;
};

export const approveArchive = async (documentId: string) => {
  const result = await apiRequest<{ item: ArchiveDocument }>(`/api/reviews/${documentId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.item;
};

export const rejectArchive = async (documentId: string) => {
  const result = await apiRequest<{ item: ArchiveDocument }>(`/api/reviews/${documentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.item;
};
