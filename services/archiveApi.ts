import { ArchiveDocument } from '../types';
import { apiRequest } from './apiClient';

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败，无法生成预览'));
    reader.readAsDataURL(file);
  });

export const listArchives = async () => {
  const result = await apiRequest<{ items: ArchiveDocument[] }>('/api/archives');
  return result.items;
};

export const createUpload = async (file: File) => {
  const previewBase64 = await toDataUrl(file);
  const result = await apiRequest<{ archive: ArchiveDocument; taskId: string }>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  return { ...result.archive, contentBase64: previewBase64 };
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
