import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Music, Video, Image as ImageIcon, FileCode2, ZoomIn, ZoomOut, RotateCcw, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getArchivePreview } from '../services/archiveApi';

interface FilePreviewProps {
  archiveId?: string;
  fileName: string;
  fileType: string;
  contentBase64?: string;
  textContent?: string;
}

interface ExcelSheetData {
  name: string;
  rows: string[][];
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

const FilePreview: React.FC<FilePreviewProps> = ({ archiveId, fileName, fileType, contentBase64, textContent }) => {
  const ext = getExtension(fileName);
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || ext === 'pdf';
  const isText = fileType.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'json', 'xml'].includes(ext);
  const isExcel = ['xls', 'xlsx'].includes(ext) || ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileType);
  const isDocx = ['docx'].includes(ext) || ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(fileType);
  const isOffice = isExcel || isDocx || isPdf || ['doc', 'ppt', 'pptx'].includes(ext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [remoteContentBase64, setRemoteContentBase64] = useState<string | undefined>(contentBase64);
  const [isFetchingSource, setIsFetchingSource] = useState(false);

  const [docxHtml, setDocxHtml] = useState('');
  const [excelSheets, setExcelSheets] = useState<ExcelSheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfJumpValue, setPdfJumpValue] = useState('1');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);


  useEffect(() => {
    if (contentBase64) {
      setRemoteContentBase64(contentBase64);
    }
  }, [contentBase64]);

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      if (!archiveId) {
        setRemoteContentBase64(contentBase64);
        return;
      }
      setIsFetchingSource(true);
      try {
        const nextContent = await getArchivePreview(archiveId);
        if (!cancelled) {
          setRemoteContentBase64(nextContent || contentBase64);
        }
      } catch {
        if (!cancelled) {
          setRemoteContentBase64(contentBase64);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingSource(false);
        }
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [archiveId, refreshToken, contentBase64]);

  const resetPreviewState = () => {
    setError('');
    setDocxHtml('');
    setExcelSheets([]);
    setActiveSheetIndex(0);
    setSelectedCell(null);
    setPdfDoc(null);
    setPdfPage(1);
    setPdfScale(1.2);
    setPdfJumpValue('1');
  };

  const handleDownloadSource = () => {
    if (!previewSource) return;
    const a = document.createElement('a');
    a.href = previewSource;
    a.download = fileName || 'source-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    let cancelled = false;

    const buildPreview = async () => {
      if (!previewSource || !isOffice) {
        resetPreviewState();
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      resetPreviewState();

      try {
        const buffer = dataUriToArrayBuffer(previewSource);

        if (isExcel) {
          const ExcelModule: any = await import(/* @vite-ignore */ 'https://esm.sh/exceljs@4.3.0');
          const Workbook = ExcelModule.Workbook || ExcelModule.default?.Workbook;
          const workbook = new Workbook();
          await workbook.xlsx.load(buffer);

          const sheets: ExcelSheetData[] = (workbook.worksheets || []).map((sheet: any) => {
            const rows: string[][] = [];
            sheet.eachRow({ includeEmpty: true }, (row: any) => {
              const cells: string[] = [];
              row.eachCell({ includeEmpty: true }, (cell: any) => {
                cells.push(cell?.text ? String(cell.text) : '');
              });
              rows.push(cells);
            });
            return { name: sheet.name || `Sheet${sheet.id || 1}`, rows };
          });

          if (!cancelled) {
            setExcelSheets(sheets);
          }
        } else if (isDocx) {
          const docx = await import(/* @vite-ignore */ 'https://esm.sh/docx-preview@0.3.2');
          const container = document.createElement('div');
          await docx.renderAsync(buffer, container);
          if (!cancelled) {
            setDocxHtml(container.innerHTML || '<div class="p-4">文档内容为空</div>');
          }
        } else if (isPdf) {
          const pdfjs: any = await import(/* @vite-ignore */ 'https://esm.sh/pdfjs-dist@4.8.69/build/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';
          const doc = await pdfjs.getDocument({ data: buffer }).promise;
          if (!cancelled) {
            setPdfDoc(doc);
            setPdfJumpValue('1');
          }
        } else {
          setError('当前 Office 类型暂不支持直接渲染（建议上传 PDF / DOCX / XLSX）');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '预览解析失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    buildPreview();
    return () => {
      cancelled = true;
    };
  }, [previewSource, isOffice, isExcel, isDocx, isPdf, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pdfPage);
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      if (cancelled) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pdfPage, pdfScale]);

  const previewSource = remoteContentBase64 || contentBase64;
  const resolvedText = useMemo(() => textContent || (previewSource ? decodeTextFromDataUri(previewSource) : ''), [textContent, previewSource]);
  const activeSheet = excelSheets[activeSheetIndex];
  const canShowPreviewControls = Boolean(previewSource);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {canShowPreviewControls && (
        <div className="px-3 py-2 text-xs bg-slate-800 text-slate-200 flex items-center justify-end gap-2 border-b border-slate-700">
          <button onClick={() => setRefreshToken((v) => v + 1)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 inline-flex items-center gap-1"><RefreshCw size={14} /> 刷新预览</button>
          <button onClick={handleDownloadSource} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 inline-flex items-center gap-1"><Download size={14} /> 下载源文件</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {isFetchingSource && <div className="text-slate-200 text-sm">正在加载文件预览...</div>}
        {!previewSource && !textContent && !isFetchingSource && (
          <div className="text-white text-center opacity-70 max-w-md px-8">
            <FileText size={56} className="mx-auto mb-4" />
            <p className="font-medium">暂无可预览内容</p>
            <p className="text-sm mt-2">该文件已上传，可在 AI 解析完成后查看文本、元数据和状态日志。</p>
          </div>
        )}

        {isImage && previewSource && <ZoomableImage key={refreshToken} src={previewSource} alt="Preview" />}

        {isVideo && previewSource && <video key={refreshToken} controls src={previewSource} className="max-w-full max-h-full" />}

        {isAudio && previewSource && (
          <div className="bg-slate-800 p-8 rounded-xl flex flex-col items-center gap-4">
            <Music size={48} className="text-white" />
            <audio key={refreshToken} controls src={previewSource} />
          </div>
        )}

        {isOffice && previewSource && (
          <div className="w-full h-full bg-white text-slate-700 overflow-auto">
            {loading && <div className="p-4 text-sm">文档解析中，请稍候...</div>}
            {!loading && error && <div className="text-red-700 text-sm bg-red-50 p-4">Office 预览失败：{error}</div>}

            {!loading && !error && isDocx && docxHtml && <div className="w-full h-full overflow-auto" dangerouslySetInnerHTML={{ __html: docxHtml }} />}

            {!loading && !error && isExcel && (
              <div className="h-full flex flex-col">
                <div className="border-b border-slate-200 px-3 py-2 flex gap-2 overflow-auto">
                  {excelSheets.map((sheet, idx) => (
                    <button
                      key={sheet.name}
                      onClick={() => {
                        setActiveSheetIndex(idx);
                        setSelectedCell(null);
                      }}
                      className={`px-3 py-1 rounded text-xs whitespace-nowrap ${activeSheetIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {!activeSheet && <div className="text-sm text-slate-500">未解析到可展示的 Sheet。</div>}
                  {activeSheet && (
                    <table className="min-w-full border-collapse text-sm">
                      <tbody>
                        {activeSheet.rows.map((row, rIdx) => (
                          <tr key={`r-${rIdx}`}>
                            {row.map((cell, cIdx) => {
                              const selected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                              return (
                                <td
                                  key={`c-${cIdx}`}
                                  onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                                  className={`border border-slate-200 px-3 py-2 align-top cursor-pointer select-text ${selected ? 'bg-indigo-100 border-indigo-400' : 'bg-white hover:bg-slate-50'}`}
                                >
                                  {cell || '\u00A0'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && isPdf && pdfDoc && (
              <div className="h-full flex flex-col items-center bg-slate-100">
                <div className="w-full bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200" onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.2))}><ZoomOut size={14} /></button>
                    <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200" onClick={() => setPdfScale((s) => Math.min(3, s + 0.2))}><ZoomIn size={14} /></button>
                    <span>缩放 {Math.round(pdfScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50" disabled={pdfPage <= 1} onClick={() => { setPdfPage((p) => Math.max(1, p - 1)); setPdfJumpValue(String(Math.max(1, pdfPage - 1))); }}><ChevronLeft size={14} /></button>
                    <span>第 {pdfPage} / {pdfDoc.numPages} 页</span>
                    <button className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50" disabled={pdfPage >= pdfDoc.numPages} onClick={() => { setPdfPage((p) => Math.min(pdfDoc.numPages, p + 1)); setPdfJumpValue(String(Math.min(pdfDoc.numPages, pdfPage + 1))); }}><ChevronRight size={14} /></button>
                    <input
                      value={pdfJumpValue}
                      onChange={(e) => setPdfJumpValue(e.target.value.replace(/\D/g, ''))}
                      className="w-14 px-2 py-1 border border-slate-300 rounded"
                    />
                    <button
                      className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                      onClick={() => {
                        const page = Number(pdfJumpValue || '1');
                        const safePage = Math.min(Math.max(page, 1), pdfDoc.numPages);
                        setPdfPage(safePage);
                        setPdfJumpValue(String(safePage));
                      }}
                    >跳转</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto w-full flex justify-center py-4">
                  <canvas ref={canvasRef} className="shadow-lg bg-white" />
                </div>
              </div>
            )}
          </div>
        )}

        {isText && (
          <pre className="w-full h-full bg-white text-slate-700 p-6 overflow-auto text-sm leading-6 whitespace-pre-wrap">
            {resolvedText || '文本内容暂不可用'}
          </pre>
        )}

        {!isImage && !isVideo && !isAudio && !isOffice && !isText && (previewSource || textContent) && (
          <div className="text-white text-center opacity-70 max-w-md px-8">
            <div className="flex justify-center gap-2 mb-4">
              <ImageIcon size={28} />
              <Video size={28} />
              <FileCode2 size={28} />
            </div>
            <p className="font-medium">当前格式暂不支持直接版式预览</p>
            <p className="text-sm mt-2">可查看解析文本、元数据、实体和 AI 状态日志。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
