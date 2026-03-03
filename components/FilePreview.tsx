import React from 'react';
import { FileText, Music, Video, Image as ImageIcon, FileType2, FileCode2 } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileType: string;
  contentBase64?: string;
  textContent?: string;
}

const getExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase() || '';

const decodeTextFromDataUri = (dataUri: string) => {
  try {
    const parts = dataUri.split(',');
    if (parts.length < 2) return '';
    return decodeURIComponent(escape(atob(parts[1])));
  } catch {
    return '';
  }
};

const FilePreview: React.FC<FilePreviewProps> = ({ fileName, fileType, contentBase64, textContent }) => {
  const ext = getExtension(fileName);
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || ext === 'pdf';
  const isText = fileType.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'json', 'xml'].includes(ext);
  const isOffice = [
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  ].includes(ext) || [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].includes(fileType);

  if (!contentBase64 && !textContent) {
    return (
      <div className="text-white text-center opacity-70 max-w-md px-8">
        <FileText size={56} className="mx-auto mb-4" />
        <p className="font-medium">暂无可预览内容</p>
        <p className="text-sm mt-2">该文件已上传，可在 AI 解析完成后查看文本、元数据和状态日志。</p>
      </div>
    );
  }

  if (isImage && contentBase64) {
    return <img src={contentBase64} alt="Preview" className="max-w-full max-h-full object-contain pointer-events-none" />;
  }

  if (isVideo && contentBase64) {
    return <video controls src={contentBase64} className="max-w-full max-h-full" />;
  }

  if (isAudio && contentBase64) {
    return (
      <div className="bg-slate-800 p-8 rounded-xl flex flex-col items-center gap-4">
        <Music size={48} className="text-white" />
        <audio controls src={contentBase64} />
      </div>
    );
  }

  if (isPdf && contentBase64) {
    return <iframe title="PDF 预览" src={contentBase64} className="w-full h-full bg-white" />;
  }

  if (isText) {
    const resolvedText = textContent || (contentBase64 ? decodeTextFromDataUri(contentBase64) : '');
    return (
      <pre className="w-full h-full bg-white text-slate-700 p-6 overflow-auto text-sm leading-6 whitespace-pre-wrap">
        {resolvedText || '文本内容暂不可用'}
      </pre>
    );
  }

  if (isOffice) {
    return (
      <div className="max-w-lg bg-slate-800/90 border border-slate-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2"><FileType2 size={18} /> Office 文档预览</div>
        <p className="text-sm text-slate-300 mb-3">已识别为 Office 格式（Word/Excel/PPT）。当前展示 AI 提取文本，原始版式可在外部办公软件中查看。</p>
        <div className="max-h-64 overflow-auto bg-slate-900 rounded p-3 text-xs leading-5 text-slate-200 whitespace-pre-wrap">
          {textContent || 'AI 文本尚未产出，当前可查看元数据与解析状态。'}
        </div>
      </div>
    );
  }

  return (
    <div className="text-white text-center opacity-70 max-w-md px-8">
      <div className="flex justify-center gap-2 mb-4">
        <ImageIcon size={28} />
        <Video size={28} />
        <FileCode2 size={28} />
      </div>
      <p className="font-medium">当前格式暂不支持直接版式预览</p>
      <p className="text-sm mt-2">可查看解析文本、元数据、实体和 AI 状态日志。</p>
    </div>
  );
};

export default FilePreview;
