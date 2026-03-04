import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Music, Video, Image as ImageIcon, FileCode2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileType: string;
  contentBase64?: string;
  textContent?: string;
}

interface OfficePreviewState {
  loading: boolean;
  error: string;
  kind: 'none' | 'excel' | 'docx' | 'pdf';
  html: string;
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

const dataUriToArrayBuffer = (dataUri: string) => {
  const base64 = dataUri.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildTableHtml = (rows: string[][], title: string) => {
  if (!rows.length) return `<div class="p-4 text-slate-500">${escapeHtml(title)} 无可用单元格数据</div>`;
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td class="border border-slate-200 px-3 py-2 text-sm align-top">${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `
  <div class="p-4">
    <h3 class="font-semibold text-slate-800 mb-3">${escapeHtml(title)}</h3>
    <div class="overflow-auto border border-slate-200 rounded-lg">
      <table class="min-w-full border-collapse bg-white">${body}</table>
    </div>
  </div>`;
};

const ZoomableImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col">
      <div className="px-3 py-2 text-xs bg-slate-800 text-slate-200 flex items-center gap-2 border-b border-slate-700">
        <button onClick={() => setScale((s) => Math.min(4, s + 0.2))} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"><ZoomIn size={14} /></button>
        <button onClick={() => setScale((s) => Math.max(0.4, s - 0.2))} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"><ZoomOut size={14} /></button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"><RotateCcw size={14} /></button>
        <span>缩放：{Math.round(scale * 100)}%</span>
      </div>
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          setScale((s) => Math.min(4, Math.max(0.4, s + delta)));
        }}
        onMouseDown={(e) => {
          setDragging(true);
          startRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          setOffset({
            x: startRef.current.ox + (e.clientX - startRef.current.x),
            y: startRef.current.oy + (e.clientY - startRef.current.y),
          });
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <img
          src={src}
          alt={alt}
          className="select-none"
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 'auto',
          }}
        />
      </div>
    </div>
  );
};

const FilePreview: React.FC<FilePreviewProps> = ({ fileName, fileType, contentBase64, textContent }) => {
  const ext = getExtension(fileName);
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || ext === 'pdf';
  const isText = fileType.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'json', 'xml'].includes(ext);
  const isExcel = ['xls', 'xlsx'].includes(ext) || ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileType);
  const isDocx = ['docx'].includes(ext) || ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(fileType);
  const isOffice = isExcel || isDocx || isPdf || ['doc', 'ppt', 'pptx'].includes(ext);

  const [officePreview, setOfficePreview] = useState<OfficePreviewState>({ loading: false, error: '', kind: 'none', html: '' });

  useEffect(() => {
    let cancelled = false;

    const buildPreview = async () => {
      if (!contentBase64 || !isOffice) {
        setOfficePreview({ loading: false, error: '', kind: 'none', html: '' });
        return;
      }

      try {
        setOfficePreview({ loading: true, error: '', kind: 'none', html: '' });
        const buffer = dataUriToArrayBuffer(contentBase64);

        if (isExcel) {
          const ExcelModule: any = await import(/* @vite-ignore */ 'https://esm.sh/exceljs@4.3.0');
          const Workbook = ExcelModule.Workbook || ExcelModule.default?.Workbook;
          const workbook = new Workbook();
          await workbook.xlsx.load(buffer);
          const first = workbook.worksheets?.[0];
          const rows: string[][] = [];
          if (first) {
            first.eachRow({ includeEmpty: false }, (row: any) => {
              const cells: string[] = [];
              row.eachCell({ includeEmpty: true }, (cell: any) => {
                cells.push(cell?.text ? String(cell.text) : '');
              });
              rows.push(cells);
            });
          }
          if (!cancelled) {
            setOfficePreview({ loading: false, error: '', kind: 'excel', html: buildTableHtml(rows, first?.name || 'Sheet1') });
          }
          return;
        }

        if (isDocx) {
          const docx = await import(/* @vite-ignore */ 'https://esm.sh/docx-preview@0.3.2');
          const container = document.createElement('div');
          await docx.renderAsync(buffer, container);
          if (!cancelled) {
            setOfficePreview({ loading: false, error: '', kind: 'docx', html: container.innerHTML || '<div class="p-4">文档内容为空</div>' });
          }
          return;
        }

        if (isPdf) {
          const pdfjs: any = await import(/* @vite-ignore */ 'https://esm.sh/pdfjs-dist@4.8.69/build/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';
          const pdf = await pdfjs.getDocument({ data: buffer }).promise;
          const pages: string[] = [];
          for (let i = 1; i <= pdf.numPages; i += 1) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map((item: any) => item.str || '').join(' ');
            pages.push(`<section class="mb-4"><h4 class="font-semibold mb-2">第 ${i} 页</h4><p class="text-sm leading-6 whitespace-pre-wrap">${escapeHtml(text || '（空白页）')}</p></section>`);
          }
          if (!cancelled) {
            setOfficePreview({ loading: false, error: '', kind: 'pdf', html: `<div class="p-4 bg-white">${pages.join('')}</div>` });
          }
          return;
        }

        setOfficePreview({ loading: false, error: '当前 Office 类型暂不支持直接渲染（建议上传 PDF / DOCX / XLSX）', kind: 'none', html: '' });
      } catch (error) {
        if (!cancelled) {
          setOfficePreview({
            loading: false,
            error: error instanceof Error ? error.message : '预览解析失败',
            kind: 'none',
            html: '',
          });
        }
      }
    };

    buildPreview();

    return () => {
      cancelled = true;
    };
  }, [contentBase64, isOffice, isExcel, isDocx, isPdf]);

  const resolvedText = useMemo(() => textContent || (contentBase64 ? decodeTextFromDataUri(contentBase64) : ''), [textContent, contentBase64]);

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
    return <ZoomableImage src={contentBase64} alt="Preview" />;
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

  if (isOffice && contentBase64) {
    if (officePreview.loading) {
      return <div className="text-white text-sm">文档解析中，请稍候...</div>;
    }
    if (officePreview.error) {
      return <div className="text-red-200 text-sm bg-red-900/30 p-4 rounded-lg">Office 预览失败：{officePreview.error}</div>;
    }
    if (officePreview.html) {
      return <div className="w-full h-full overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: officePreview.html }} />;
    }
  }

  if (isText) {
    return (
      <pre className="w-full h-full bg-white text-slate-700 p-6 overflow-auto text-sm leading-6 whitespace-pre-wrap">
        {resolvedText || '文本内容暂不可用'}
      </pre>
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
