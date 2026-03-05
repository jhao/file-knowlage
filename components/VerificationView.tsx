import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveDocument, ArchiveStatus, ArchiveMetadata, SecurityLevel, KnowledgeEntity, UserRole } from '../types';
import { Check, RefreshCw, Eye, Save, Type, Tags, FileText, Plus, Trash2, ShieldAlert, X } from 'lucide-react';
import FilePreview from './FilePreview';
import { buildCategoryLevels, findCategoryPath, loadArchiveCategoryTree, type ArchiveCategoryNode } from '../services/archiveCategory';

interface VerificationViewProps {
  documents: ArchiveDocument[];
  onUpdateDocument: (id: string, updates: Partial<ArchiveDocument>) => void;
  onRefreshDocuments: () => Promise<void>;
  onOpenJobDetail: (taskId: string) => void;
  currentUserRole: UserRole;
  currentUserId: string | number;
}

const ENTITY_TYPES = [
  { value: 'Person', label: 'Person（人物）' },
  { value: 'Location', label: 'Location（地点）' },
  { value: 'Organization', label: 'Organization（组织）' },
  { value: 'Event', label: 'Event（事件）' },
  { value: 'Concept', label: 'Concept（概念）' },
] as const;

const VerificationView: React.FC<VerificationViewProps> = ({ documents, onUpdateDocument, onRefreshDocuments, currentUserRole, currentUserId }) => {
  const queue = useMemo(
    () => documents.filter((d) => {
      const mineOrAdmin = currentUserRole === UserRole.ADMIN || String(d.uploadedBy) === String(currentUserId);
      const reviewStatus = d.status === ArchiveStatus.REVIEW_NEEDED || d.status === ArchiveStatus.WAITING_MANUAL_REVIEW || d.status === ArchiveStatus.PROCESSING;
      return mineOrAdmin && reviewStatus;
    }),
    [documents, currentUserRole, currentUserId],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metadata' | 'entities' | 'content'>('metadata');
  const [formData, setFormData] = useState<Partial<ArchiveMetadata>>({});
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [relationKeyword, setRelationKeyword] = useState('');
  const [categoryTree, setCategoryTree] = useState<ArchiveCategoryNode[]>([]);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);

  const activeDoc = queue.find((d) => d.id === selectedId) || queue[0];

  useEffect(() => {
    if (!activeDoc) return;
    setSelectedId(activeDoc.id);
    setFormData(activeDoc.metadata || {});
    setEntities(activeDoc.entities || []);
  }, [activeDoc]);

  useEffect(() => {
    loadArchiveCategoryTree()
      .then((tree) => {
        setCategoryTree(tree);
        setCategoryPath(findCategoryPath(tree, activeDoc?.metadata?.category || ''));
      })
      .catch(() => {
        setCategoryTree([]);
        setCategoryPath([]);
      });
  }, [activeDoc?.metadata?.category]);

  const handleInputChange = (field: keyof ArchiveMetadata, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));
  const categoryLevels = buildCategoryLevels(categoryTree, categoryPath);
  const handleCategoryLevelChange = (level: number, value: string) => {
    const nextPath = [...categoryPath.slice(0, level), value].filter(Boolean);
    setCategoryPath(nextPath);
    handleInputChange('category', value || '未分类');
  };
  const handleConfirm = () => activeDoc && onUpdateDocument(activeDoc.id, { status: ArchiveStatus.APPROVED, metadata: formData as ArchiveMetadata, entities });
  const handleReject = () => activeDoc && onUpdateDocument(activeDoc.id, { status: ArchiveStatus.REJECTED });

  const runAIAnalysis = async () => {
    setIsProcessing(true);
    await onRefreshDocuments();
    setIsProcessing(false);
  };

  const relatedCandidates = (currentIndex: number) => entities.filter((_, idx) => idx !== currentIndex).filter((entity) => entity.name.includes(relationKeyword.trim()));

  if (queue.length === 0) {
    return <div className="h-full flex flex-col items-center justify-center text-slate-500"><Check size={48} className="text-emerald-500 mb-4" /><h3 className="text-xl font-semibold text-slate-800">全部处理完毕!</h3><p>当前没有待审查的文档。</p></div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-700">待审查队列 ({queue.length})</h3></div>
        {queue.map((doc) => (
          <button key={doc.id} onClick={() => setSelectedId(doc.id)} className={`w-full text-left p-3 border-b border-slate-100 hover:bg-indigo-50 ${selectedId === doc.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
            <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
            <p className="text-xs text-slate-500 mt-1">{doc.status}</p>
          </button>
        ))}
      </div>

      {activeDoc && (
        <div className="flex-1 flex bg-slate-100 overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-slate-200">
            <div className="h-10 bg-slate-800 text-slate-300 flex items-center px-4 text-xs justify-between"><span className="flex items-center gap-2"><Eye size={14} /> 原文预览 ({activeDoc.fileName})</span><span className="flex items-center gap-1 text-amber-400"><ShieldAlert size={12} /> 防抓取保护开启</span></div>
            <div className="flex-1 bg-slate-900 flex items-center justify-center"><FilePreview archiveId={activeDoc.id} fileName={activeDoc.fileName} fileType={activeDoc.fileType} contentBase64={activeDoc.contentBase64} textContent={formData.textContent} /></div>
          </div>

          <div className="w-[520px] bg-white flex flex-col relative">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">AI智能审查</h3>
              <button onClick={runAIAnalysis} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-2" disabled={isProcessing}>{isProcessing ? <><RefreshCw size={14} className="animate-spin" />刷新中</> : '刷新结果'}</button>
            </div>

            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('metadata')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'metadata' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Type size={14} className="inline mr-1" />元数据</button>
              <button onClick={() => setActiveTab('entities')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'entities' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Tags size={14} className="inline mr-1" />知识提取</button>
              <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><FileText size={14} className="inline mr-1" />全文解析</button>
            </div>

            <div className="inset-x-0 top-[97px] bottom-[73px] overflow-y-auto p-5 space-y-4">
              {activeTab === 'metadata' && (
                <>
                  <section className="rounded-lg border border-slate-200 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">基础元数据</h4>
                    <div><label className="block text-xs text-slate-500 mb-1">文档标题</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-slate-500 mb-1">日期</label><input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} /></div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">分类</label>
                        <div className="space-y-2">
                          {categoryLevels.map((options, level) => (
                            <select
                              key={`category-level-${level}`}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={categoryPath[level] || ''}
                              onChange={(e) => handleCategoryLevelChange(level, e.target.value)}
                            >
                              <option value="">请选择第 {level + 1} 级分类</option>
                              {options.map((item) => <option key={`${level}-${item}`} value={item}>{item}</option>)}
                            </select>
                          ))}
                          {categoryLevels.length === 0 && (
                            <input
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={formData.category || ''}
                              onChange={(e) => handleInputChange('category', e.target.value)}
                              placeholder="请输入分类"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div><label className="block text-xs text-slate-500 mb-1">归属部门</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">密级</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.securityLevel || SecurityLevel.INTERNAL} onChange={(e) => handleInputChange('securityLevel', e.target.value)} disabled={currentUserRole !== UserRole.ADMIN}>{Object.values(SecurityLevel).map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                  </section>
                  <section className="rounded-lg border border-slate-200 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">摘要（富文本）</h4>
                    <div className="min-h-[130px] rounded-lg border border-slate-300 px-3 py-2 text-sm" contentEditable suppressContentEditableWarning onBlur={(e) => handleInputChange('summary', e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: formData.summary || '' }} />
                  </section>
                </>
              )}

              {activeTab === 'entities' && (
                <div className="space-y-3">
                  <button onClick={() => setEntities((prev) => [...prev, { id: Date.now().toString(), name: '', type: 'Concept', parentType: 'Concept', relatedEntityIds: [], context: '', confidence: 100 }])} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center gap-2"><Plus size={14} />添加实体</button>
                  {entities.map((entity, idx) => (
                    <div key={entity.id || idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="flex justify-between"><span className="text-sm font-medium">实体 {idx + 1}</span><button onClick={() => setEntities((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-500"><Trash2 size={14} /></button></div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">所属实体</label>
                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.parentType || 'Concept'} onChange={(e) => { const copy = [...entities]; copy[idx].parentType = e.target.value as KnowledgeEntity['type']; copy[idx].type = e.target.value as KnowledgeEntity['type']; setEntities(copy); }}>{ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                      </div>
                      <div><label className="block text-xs text-slate-500 mb-1">实体内容</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.name} onChange={(e) => { const copy = [...entities]; copy[idx].name = e.target.value; setEntities(copy); }} /></div>
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-500">关联其他实体（可检索多选）</label>
                        <input value={relationKeyword} onChange={(e) => setRelationKeyword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="输入关键字筛选实体" />
                        <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                          {relatedCandidates(idx).map((candidate) => (
                            <label key={candidate.id} className="flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(entity.relatedEntityIds?.includes(candidate.id))}
                                onChange={(e) => {
                                  const copy = [...entities];
                                  const related = new Set(copy[idx].relatedEntityIds || []);
                                  if (e.target.checked) related.add(candidate.id);
                                  else related.delete(candidate.id);
                                  copy[idx].relatedEntityIds = Array.from(related);
                                  setEntities(copy);
                                }}
                              />
                              {candidate.name || `未命名实体(${candidate.id})`}
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(entity.relatedEntityIds || []).map((relatedId) => {
                            const target = entities.find((item) => item.id === relatedId);
                            if (!target) return null;
                            return <span key={relatedId} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs">{target.name || relatedId}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'content' && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-2">主要展示 AI 调用反馈的内容概要与总结；音频/视频文件显示语音转文字结果。</p>
                  <textarea className="w-full h-[320px] rounded-lg border border-slate-300 px-3 py-2 text-sm" value={formData.textContent || ''} onChange={(e) => handleInputChange('textContent', e.target.value)} />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button onClick={handleReject} className="flex-1 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 inline-flex items-center justify-center gap-2"><X size={14} />驳回</button>
              <button onClick={handleConfirm} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 inline-flex items-center justify-center gap-2"><Save size={16} />确认入库</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationView;
