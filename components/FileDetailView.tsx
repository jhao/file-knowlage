import React, { useEffect, useState } from 'react';
import { ArchiveDocument, ArchiveMetadata, ArchiveCategory, SecurityLevel, KnowledgeEntity, UserRole } from '../types';
import { ArrowLeft, RefreshCw, Wand2, Save, Type, Tags, FileText, Plus, Trash2, ShieldAlert } from 'lucide-react';
import FilePreview from './FilePreview';

interface FileDetailViewProps {
  document: ArchiveDocument;
  onBack: () => void;
  onUpdateDocument: (id: string, updates: Partial<ArchiveDocument>) => void;
  currentUserRole: UserRole;
}

const ENTITY_TYPES = [
  { value: 'Person', label: 'Person（人物）' },
  { value: 'Location', label: 'Location（地点）' },
  { value: 'Organization', label: 'Organization（组织）' },
  { value: 'Event', label: 'Event（事件）' },
  { value: 'Concept', label: 'Concept（概念）' },
] as const;

const FileDetailView: React.FC<FileDetailViewProps> = ({ document, onBack, onUpdateDocument, currentUserRole }) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'entities' | 'content'>('metadata');
  const [formData, setFormData] = useState<Partial<ArchiveMetadata>>({});
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setFormData(document.metadata || {});
    setEntities(document.entities || []);
  }, [document]);

  const handleInputChange = (field: keyof ArchiveMetadata, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));

  const runAIAnalysis = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('AI 重新解析完成！');
    }, 600);
  };

  const handleSave = () => {
    onUpdateDocument(document.id, { metadata: formData as ArchiveMetadata, entities });
    alert('保存成功！');
  };

  const addEntity = () => setEntities((prev) => [...prev, { id: Date.now().toString(), name: '', type: 'Concept', parentType: 'Concept', context: '', confidence: 100 }]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium text-sm"><ArrowLeft size={16} /> 返回列表</button>
          <span className="flex items-center gap-1 text-amber-500 text-xs font-medium"><ShieldAlert size={14} /> 防抓取保护开启</span>
        </div>
        <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
          <div className="absolute inset-0 pointer-events-none z-10 opacity-10 flex items-center justify-center"><div className="text-white text-4xl -rotate-45 font-bold">INTERNAL USE ONLY</div></div>
          <FilePreview archiveId={document.id} fileName={document.fileName} fileType={document.fileType} contentBase64={document.contentBase64} textContent={formData.textContent} />
        </div>
      </div>

      <div className="w-[520px] bg-white flex flex-col border-l border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div><h2 className="font-bold text-slate-800">档案详情</h2><p className="text-xs text-slate-500">{document.fileName}</p></div>
          <button onClick={runAIAnalysis} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-2" disabled={isProcessing}>
            {isProcessing ? <><RefreshCw size={14} className="animate-spin" /> AI解析中...</> : <><Wand2 size={14} /> 重新 AI 解析</>}
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('metadata')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'metadata' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Type size={14} className="inline mr-1" /> 元数据</button>
          <button onClick={() => setActiveTab('entities')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'entities' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Tags size={14} className="inline mr-1" /> 知识提取</button>
          <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><FileText size={14} className="inline mr-1" /> 全文解析</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'metadata' && (
            <>
              <section className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">基础元数据</h4>
                <div><label className="block text-xs text-slate-500 mb-1">文档标题</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-slate-500 mb-1">日期</label><input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">分类</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.category || ArchiveCategory.UNKNOWN} onChange={(e) => handleInputChange('category', e.target.value)}>{Object.values(ArchiveCategory).map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                </div>
                <div><label className="block text-xs text-slate-500 mb-1">归属部门</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} /></div>
                <div><label className="block text-xs text-slate-500 mb-1">责任者</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.authors?.join(', ') || ''} onChange={(e) => handleInputChange('authors', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} /></div>
                <div><label className="block text-xs text-slate-500 mb-1">密级</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.securityLevel || SecurityLevel.INTERNAL} onChange={(e) => handleInputChange('securityLevel', e.target.value)} disabled={currentUserRole !== UserRole.ADMIN}>{Object.values(SecurityLevel).map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
              </section>
              <section className="rounded-lg border border-slate-200 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">摘要（富文本）</h4>
                <div
                  className="min-h-[130px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-indigo-500"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleInputChange('summary', e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: formData.summary || '' }}
                />
              </section>
            </>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-3">
              <button onClick={addEntity} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-2"><Plus size={14} /> 添加实体</button>
              {entities.map((entity, idx) => (
                <div key={entity.id || idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <h5 className="text-sm font-medium text-slate-700">实体 {idx + 1}</h5>
                    <button onClick={() => setEntities((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-slate-500 mb-1">所属实体</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.parentType || 'Concept'} onChange={(e) => { const copy = [...entities]; copy[idx].parentType = e.target.value as KnowledgeEntity['type']; setEntities(copy); }}>{ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    <div><label className="block text-xs text-slate-500 mb-1">实体类型</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.type} onChange={(e) => { const copy = [...entities]; copy[idx].type = e.target.value as KnowledgeEntity['type']; setEntities(copy); }}>{ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  </div>
                  <div><label className="block text-xs text-slate-500 mb-1">实体内容</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.name} onChange={(e) => { const copy = [...entities]; copy[idx].name = e.target.value; setEntities(copy); }} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">上下文</label><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={entity.context} onChange={(e) => { const copy = [...entities]; copy[idx].context = e.target.value; setEntities(copy); }} /></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-2">展示 AI 调用后的内容概要与总结；音视频文件展示语音转文字信息。</p>
              <textarea className="w-full h-[360px] rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.textContent || ''} onChange={(e) => handleInputChange('textContent', e.target.value)} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button onClick={handleSave} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center justify-center gap-2"><Save size={16} /> 保存修改</button>
        </div>
      </div>
    </div>
  );
};

export default FileDetailView;
