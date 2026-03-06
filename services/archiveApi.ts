import { ArchiveDocument } from '../types';
import { apiRequest } from './apiClient';
import { extractFilePayload } from './fileExtraction';

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
  const { extractedText, extractedMeta } = await extractFilePayload(file);
  const result = await apiRequest<{ archive: ArchiveDocument; taskId: string }>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText,
      extractedMeta,
      contentBase64: previewBase64,
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
  const result = await apiRequest<{ item: ArchiveDocument; message: string; flow?: ReviewFlow }>(`/api/reviews/${documentId}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result;
};

export interface ReviewFlow {
  enabled: boolean;
  currentIndex: number;
  total: number;
  isFinalStep: boolean;
  nextApprover: { userId: string; userName?: string } | null;
  nextApprovers: Array<{ userId: string; userName?: string }> ;
  approvalMode: 'OR' | 'AND' | null;
  recentComments: string[];
}

export const getReviewFlow = async (documentId: string) => {
  const result = await apiRequest<{ item: ReviewFlow }>(`/api/reviews/${documentId}/flow`);
  return result.item;
};

export const approveArchiveWithComment = async (documentId: string, comment: string) => {
  return apiRequest<{ item: ArchiveDocument; message: string; flow?: ReviewFlow }>(`/api/reviews/${documentId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
};

export const rejectArchive = async (documentId: string) => {
  const result = await apiRequest<{ item: ArchiveDocument }>(`/api/reviews/${documentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result.item;
};


export const getArchivePreview = async (documentId: string) => {
  const result = await apiRequest<{ contentBase64: string | null }>(`/api/archives/${documentId}/preview`);
  return result.contentBase64 || undefined;
};

export const reparseArchive = async (documentId: string) => {
  const result = await apiRequest<{ taskId: string; item: ArchiveDocument }>(`/api/archives/${documentId}/reparse`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return result;
};


export const reassignCurrentApprover = async (documentId: string, userIds: string[]) => {
  return apiRequest<{ item: ArchiveDocument; message: string; flow?: ReviewFlow }>(`/api/reviews/${documentId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  });
};
