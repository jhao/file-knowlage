import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, File, X, AlertCircle, Video, Music, Image as ImageIcon, FolderPlus, Link2, Database, PlayCircle } from 'lucide-react';
import { getIntegrationConfig, saveIntegrationConfig, startIntegrationSync, type IntegrationConfig } from '../services/integrationApi';

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState<IntegrationConfig>({ authUrl: '', totalCountUrl: '', pendingFilesUrl: '', statusCallbackUrl: '', categoryListUrl: '', fileMetaFields: '', downloadUrlNote: '' });

  useEffect(() => {
    getIntegrationConfig().then(setConfig).catch(() => {});
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
  };

  const processUpload = () => {
    onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Video size={20} />;
    if (type.startsWith('audio/')) return <Music size={20} />;
    if (type.startsWith('image/')) return <ImageIcon size={20} />;
    return <File size={20} />;
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const result = await saveIntegrationConfig(config);
      setConfig(result);
      setSyncMsg('接口地址保存成功');
    } catch (error) {
      setSyncMsg(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const startSync = async () => {
    try {
      const result = await startIntegrationSync();
      setSyncMsg(`同步任务已启动，任务ID: ${result.taskId}。可在“后台job管理”查看进度。`);
    } catch (error) {
      setSyncMsg(error instanceof Error ? error.message : '启动同步失败');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">多源数据导入</h2>
        <p className="text-slate-500">支持音频、视频、手稿、学籍档案、照片、文书及电子文档。</p>
      </div>

      <div className="flex gap-4">
        <div className={`flex-1 border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}`} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.log,.json,.xml,.jpg,.jpeg,.png,.gif,.webp,.mp4,.avi,.mov,.mkv,.mp3,.wav,.m4a,.aac" />
          <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-4"><UploadCloud size={48} /></div><h3 className="text-lg font-semibold text-slate-700">上传单个文件</h3><p className="text-slate-500 mt-2 text-center text-sm">点击或拖拽文件至此</p>
        </div>

        <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white hover:border-indigo-400 hover:bg-slate-50" onClick={() => folderInputRef.current?.click()}>
          <input type="file" ref={folderInputRef} className="hidden" onChange={handleFileSelect} {...({ webkitdirectory: '', directory: '' } as any)} />
          <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-4"><FolderPlus size={48} /></div><h3 className="text-lg font-semibold text-slate-700">上传文件夹</h3><p className="text-slate-500 mt-2 text-center text-sm">批量导入目录下的所有文件</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">支持格式: PDF、Office（Word/Excel/PPT）、音频、视频、TXT/Markdown/CSV/JSON/XML、图片等 (最大 200MB)</p>

      {selectedFiles.length > 0 && <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h4 className="font-semibold text-slate-700">准备导入 ({selectedFiles.length})</h4><button onClick={processUpload} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">开始AI处理</button></div><ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">{selectedFiles.map((file, idx) => (<li key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50"><div className="flex items-center gap-3"><div className="bg-slate-100 p-2 rounded text-slate-500">{getFileIcon(file.type)}</div><div><p className="text-sm font-medium text-slate-700">{file.name}</p><p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown Type'}</p></div></div><button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="text-slate-400 hover:text-red-500"><X size={18} /></button></li>))}</ul></div>}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3"><AlertCircle className="text-blue-600 flex-shrink-0" size={20} /><div><h5 className="text-sm font-semibold text-blue-800">格式解析与数据安全</h5><p className="text-xs text-blue-600 mt-1">系统会对上传的音频/视频自动提取字幕文本。所有上传的原图将添加防爬取水印，禁止未授权下载。</p></div></div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="font-semibold text-slate-800 mb-3">其他系统对接</div>
        <div className="flex gap-3">
          <button className="px-3 py-2 rounded-lg border border-slate-300 hover:border-indigo-500 text-sm flex items-center gap-2" onClick={() => setShowRules(true)}><Link2 size={16} /> 对接规则</button>
          <button className="px-3 py-2 rounded-lg border border-slate-300 hover:border-indigo-500 text-sm flex items-center gap-2" onClick={() => setShowConfig(true)}><Database size={16} /> 地址录入</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm flex items-center gap-2" onClick={startSync}><PlayCircle size={16} /> 启动同步</button>
        </div>
        {syncMsg && <p className="text-sm text-slate-600 mt-2">{syncMsg}</p>}
      </div>

      {showRules && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-white rounded-xl p-6 space-y-3"><h3 className="text-lg font-semibold">第三方系统对接规则</h3><ul className="list-disc pl-5 text-sm text-slate-700 space-y-1"><li>访问认证地址（每次请求前先获取 token）。</li><li>文件总量接口地址。</li><li>待处理文件清单接口地址（支持按批次或按分页）。</li><li>状态回写接口地址（处理中/处理完成）。</li><li>文件下载地址（可在待处理清单中返回 downloadUrl）。</li><li>文件相关信息字段（文件ID、名称、类型、大小、分类、批次等）。</li><li>档案分类目录清单接口地址。</li></ul><div className="text-right"><button className="px-3 py-1.5 rounded bg-slate-100" onClick={() => setShowRules(false)}>关闭</button></div></div></div>}

      {showConfig && <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-white rounded-xl p-6 space-y-3"><h3 className="text-lg font-semibold">接口地址录入</h3>{([
        ['authUrl', '认证地址'],
        ['totalCountUrl', '文件总量地址'],
        ['pendingFilesUrl', '待处理清单地址'],
        ['statusCallbackUrl', '状态回写地址'],
        ['categoryListUrl', '分类目录清单地址'],
      ] as Array<[keyof IntegrationConfig, string]>).map(([key, label]) => <input key={key} className="w-full border rounded px-3 py-2" placeholder={label} value={config[key]} onChange={(e) => setConfig({ ...config, [key]: e.target.value })} />)}<textarea className="w-full border rounded px-3 py-2" rows={2} placeholder="文件元数据字段" value={config.fileMetaFields} onChange={(e) => setConfig({ ...config, fileMetaFields: e.target.value })} /><textarea className="w-full border rounded px-3 py-2" rows={2} placeholder="下载地址说明" value={config.downloadUrlNote} onChange={(e) => setConfig({ ...config, downloadUrlNote: e.target.value })} /><div className="flex justify-end gap-2"><button className="px-3 py-1.5 rounded bg-slate-100" onClick={() => setShowConfig(false)}>关闭</button><button className="px-3 py-1.5 rounded bg-indigo-600 text-white" onClick={saveConfig} disabled={savingConfig}>{savingConfig ? '保存中...' : '保存地址'}</button></div></div></div>}
    </div>
  );
};

export default UploadZone;
