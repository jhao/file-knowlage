import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveDocument, ArchiveStatus, ArchiveMetadata, ArchiveCategory, SecurityLevel, KnowledgeEntity, UserRole, AITaskLog } from '../types';
import { Check, RefreshCw, Wand2, AlertTriangle, Eye, Save, Type, Tags, FileText, Plus, Trash2, ShieldAlert, X, Info } from 'lucide-react';
import FilePreview from './FilePreview';
import { listTasks } from '../services/tasksApi';

interface VerificationViewProps {
  documents: ArchiveDocument[];
  onUpdateDocument: (id: string, updates: Partial<ArchiveDocument>) => void;
  currentUserRole: UserRole;
}

const VerificationView: React.FC<VerificationViewProps> = ({ documents, onUpdateDocument, currentUserRole }) => {
  const queue = useMemo(() => documents.filter((d) => d.status === ArchiveStatus.REVIEW_NEEDED || d.status === ArchiveStatus.PROCESSING), [documents]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metadata' | 'entities' | 'content'>('metadata');
  const [formData, setFormData] = useState<Partial<ArchiveMetadata>>({});
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [taskLogs, setTaskLogs] = useState<AITaskLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const activeDoc = queue.find((d) => d.id === selectedId) || queue[0];

  useEffect(() => {
    if (!activeDoc) return;
    setSelectedId(activeDoc.id);
    setFormData(activeDoc.metadata || {});
    setEntities(activeDoc.entities || []);
  }, [activeDoc]);

  const handleInputChange = (field: keyof ArchiveMetadata, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const refreshLogs = async () => {
    if (!activeDoc) return;
    setLoadingLogs(true);
    try {
      const logs = await listTasks();
      setTaskLogs(logs.filter((item) => String(item.archiveId) === String(activeDoc.id)));
    } finally {
      setLoadingLogs(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!activeDoc) return;
    setIsProcessing(true);
    try {
      await refreshLogs();
    } catch (err) {
      console.error(err);
      alert('AI Processing Failed. Check API Key.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!activeDoc) return;
    onUpdateDocument(activeDoc.id, { status: ArchiveStatus.APPROVED, metadata: formData as ArchiveMetadata, entities });
    const next = queue.find((d) => d.id !== activeDoc.id);
    setSelectedId(next ? next.id : null);
  };

  const handleReject = () => activeDoc && onUpdateDocument(activeDoc.id, { status: ArchiveStatus.REJECTED });
  const removeEntity = (index: number) => setEntities((prev) => prev.filter((_, i) => i !== index));
  const addEntity = () => setEntities([...entities, { id: Date.now().toString(), name: '新实体', type: 'Concept', context: '人工添加', confidence: 100 }]);

  if (queue.length === 0) {
    return <div className="h-full flex flex-col items-center justify-center text-slate-500"><Check size={48} className="text-emerald-500 mb-4" /><h3 className="text-xl font-semibold text-slate-800">全部处理完毕!</h3><p>当前没有待校验的文档。</p></div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">待校验队列 ({queue.length})</h3></div>
        <ul>
          {queue.map((doc) => (
            <li key={doc.id} onClick={() => setSelectedId(doc.id)} className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-indigo-50 ${selectedId === doc.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
              <div className="flex justify-between mb-1"><span className="text-xs font-mono text-slate-400 truncate w-16">{doc.id}</span><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${doc.status === ArchiveStatus.PROCESSING ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status === ArchiveStatus.PROCESSING ? 'AI解析' : '待审核'}</span></div>
              <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex bg-slate-100 overflow-hidden">
        {activeDoc && (
          <>
            <div className="flex-1 flex flex-col border-r border-slate-200">
              <div className="h-10 bg-slate-800 text-slate-300 flex items-center px-4 text-xs justify-between"><span className="flex items-center gap-2"><Eye size={14} /> 原文预览 ({activeDoc.fileName})</span><span className="flex items-center gap-1 text-amber-400"><ShieldAlert size={12} /> 防抓取保护开启</span></div>
              <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                <div className="absolute inset-0 pointer-events-none z-10 opacity-10 flex items-center justify-center"><div className="text-white text-4xl -rotate-45 font-bold">INTERNAL USE ONLY - NO COPY</div></div>
                <FilePreview fileName={activeDoc.fileName} fileType={activeDoc.fileType} contentBase64={activeDoc.contentBase64} textContent={formData.textContent} />
              </div>
            </div>

            <div className="w-[500px] bg-white flex flex-col shadow-xl z-10">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Wand2 size={18} className="text-indigo-600" /> 智能校验平台</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowLogModal(true); refreshLogs(); }} className="text-xs flex items-center gap-1 border border-slate-300 bg-white text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50"><Info size={12} /> 查看解析日志</button>
                  {activeDoc.status === ArchiveStatus.PROCESSING || isProcessing ? <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse"><RefreshCw size={12} className="animate-spin" /> 解析中...</span> : <button onClick={runAIAnalysis} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200">重新解析</button>}
                </div>
              </div>

              <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('metadata')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'metadata' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Type size={16} /> 元数据</button>
                <button onClick={() => setActiveTab('entities')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'entities' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Tags size={16} /> 知识提取</button>
                <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><FileText size={16} /> 全文解析</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'metadata' && <div className="space-y-4"><div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4"><h4 className="text-xs font-bold text-slate-500 uppercase mb-2">文件物理属性</h4><div className="grid grid-cols-2 gap-2 text-xs text-slate-700"><div>格式: {activeDoc.fileType}</div><div>页数/时长: {formData.fileProperties?.pageCount || formData.fileProperties?.duration || '-'}</div><div>语言: {formData.fileProperties?.language || '中文'}</div></div></div><div><label className="label-sm">文档标题</label><input type="text" value={formData.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} className="input-field" /></div><div className="grid grid-cols-2 gap-4"><div><label className="label-sm">日期</label><input type="date" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} className="input-field" /></div><div><label className="label-sm">分类</label><select value={formData.category || ArchiveCategory.UNKNOWN} onChange={(e) => handleInputChange('category', e.target.value)} className="input-field">{Object.values(ArchiveCategory).map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div></div><div><label className="label-sm">归属部门</label><input type="text" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} className="input-field" /></div><div><label className="label-sm">责任者</label><input type="text" value={formData.authors?.join(', ') || ''} onChange={(e) => handleInputChange('authors', e.target.value.split(', '))} className="input-field" /></div><div><label className="label-sm">密级 (需管理员权限修改)</label><select value={formData.securityLevel || SecurityLevel.INTERNAL} onChange={(e) => handleInputChange('securityLevel', e.target.value)} className="input-field" disabled={currentUserRole !== UserRole.ADMIN}>{Object.values(SecurityLevel).map((l) => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="label-sm">摘要</label><textarea value={formData.summary || ''} onChange={(e) => handleInputChange('summary', e.target.value)} rows={3} className="input-field" /></div></div>}
                {activeTab === 'entities' && <div className="space-y-4"><div className="flex justify-between items-center mb-2"><p className="text-xs text-slate-500">AI 自动提取知识点并进行定位。</p><button onClick={addEntity} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"><Plus size={14} /> 添加实体</button></div>{entities.map((entity, idx) => <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-indigo-300 transition-colors group"><div className="flex justify-between items-start mb-2"><div className="flex-1"><input value={entity.name} onChange={(e) => { const list = [...entities]; list[idx].name = e.target.value; setEntities(list); }} className="font-semibold text-slate-800 text-sm bg-transparent border-none p-0 focus:ring-0 w-full" /></div><button onClick={() => removeEntity(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button></div><div className="flex gap-2 mb-2"><select value={entity.type} onChange={(e) => { const list = [...entities]; list[idx].type = e.target.value as any; setEntities(list); }} className="text-[10px] bg-slate-100 border-none rounded py-0.5 px-2 text-slate-600">{['Person', 'Location', 'Organization', 'Event', 'Concept'].map((t) => <option key={t} value={t}>{t}</option>)}</select><span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded">置信度: {entity.confidence}%</span></div><div className="text-xs text-slate-500 bg-slate-50 p-2 rounded italic">"<span className="font-medium text-slate-700">{entity.context}</span>"</div></div>)}{entities.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">暂无知识实体</div>}</div>}
                {activeTab === 'content' && <div className="h-full flex flex-col"><p className="text-xs text-slate-500 mb-2">OCR 提取全文 / 音视频转录文本</p><textarea className="flex-1 w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50" value={formData.textContent || ''} onChange={(e) => handleInputChange('textContent', e.target.value)} placeholder="此处将显示 AI 提取的全文内容..." /></div>}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button onClick={handleReject} className="flex-1 btn-secondary text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center justify-center gap-1.5 leading-none"><X size={14} /> 驳回</button>
                <button onClick={handleConfirm} className="flex-[2] btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 leading-none" disabled={activeDoc.status === ArchiveStatus.PROCESSING}><Save size={16} /> 确认入库</button>
              </div>
            </div>
          </>
        )}

        {showLogModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center"><h3 className="font-semibold text-slate-800">AI 解析状态与日志</h3><button onClick={() => setShowLogModal(false)} className="text-slate-500 hover:text-slate-800"><X size={16} /></button></div>
              <div className="p-4 max-h-[60vh] overflow-auto space-y-3">
                {loadingLogs && <div className="text-sm text-slate-500">日志加载中...</div>}
                {!loadingLogs && taskLogs.length === 0 && <div className="text-sm text-slate-500">暂无解析日志。可能处于排队初始阶段。</div>}
                {!loadingLogs && taskLogs.map((log) => <div key={log.taskId + log.updatedAt} className="border border-slate-200 rounded-lg p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{log.taskType}</span><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{log.status}</span></div><p className="text-sm text-slate-700 mt-2">{log.message || '无消息'}</p><p className="text-[11px] text-slate-400 mt-1">重试次数: {log.retryCount} · 更新时间: {new Date(log.updatedAt).toLocaleString()}</p></div>)}
              </div>
            </div>
          </div>
        )}

        <style>{`.label-sm { @apply block text-xs font-semibold text-slate-500 uppercase mb-1; } .input-field { @apply w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white; } .btn-secondary { @apply py-2 rounded text-sm font-medium transition-colors border flex justify-center items-center gap-2; } .btn-primary { @apply py-2 text-sm font-medium transition-all flex justify-center items-center gap-2; }`}</style>
      </div>
    </div>
  );
};

export default VerificationView;
