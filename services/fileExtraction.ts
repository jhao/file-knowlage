export interface ExtractedFilePayload {
  extractedText: string;
  extractedMeta: Record<string, string | number>;
}

const truncate = (value: string, size = 12000) => value.slice(0, size);

export const extractFilePayload = async (file: File): Promise<ExtractedFilePayload> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const extractedMeta: Record<string, string | number> = {
    extension: ext || 'unknown',
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  };

  if (file.type.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'log', 'csv'].includes(ext)) {
    return {
      extractedMeta,
      extractedText: truncate(await file.text()),
    };
  }

  return { extractedMeta, extractedText: '' };
};
