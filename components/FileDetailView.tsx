import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveDocument, ArchiveMetadata, SecurityLevel, KnowledgeEntity, UserRole } from '../types';
import { ArrowLeft, RefreshCw, Wand2, Save, Type, Tags, FileText, Plus, Trash2, ShieldAlert } from 'lucide-react';
import FilePreview from './FilePreview';
import { buildCategoryLevels, findCategoryPath, loadArchiveCategoryTree, type ArchiveCategoryNode } from '../services/archiveCategory';
import { listSettings } from '../services/settingsApi';
import { reparseArchive } from '../services/archiveApi';

interface FileDetailViewProps {
  document: ArchiveDocument;
  onBack: () => void;
  onUpdateDocument: (id: string, updates: Partial<ArchiveDocument>) => void;
  currentUserRole: UserRole;
}


const FileDetailView: React.FC<FileDetailViewProps> = ({ document, onBack, onUpdateDocument, currentUserRole }) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'entities' | 'content'>('metadata');
  const [formData, setFormData] = useState<Partial<ArchiveMetadata>>({});
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryTree, setCategoryTree] = useState<ArchiveCategoryNode[]>([]);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [entityTypeItems, setEntityTypeItems] = useState<Array<{ key: string; label: string }>>([]);
  const [relationKeywords, setRelationKeywords] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(document.metadata || {});
    setEntities(document.entities || []);
  }, [document]);

  useEffect(() => {
    loadArchiveCategoryTree()
      .then((tree) => {
        setCategoryTree(tree);
        setCategoryPath(findCategoryPath(tree, document.metadata?.category || ''));
      })
      .catch(() => {
        setCategoryTree([]);
        setCategoryPath([]);
      });
  }, [document.metadata?.category]);


  useEffect(() => {
    listSettings()
      .then((items) => {
        const map = new Map(items.map((item) => [item.key, item.value]));
        const raw = map.get('entity_types_json');
        if (!raw) return;
        const parsed = JSON.parse(raw) as Array<{ key: string; label: string }>;
        if (Array.isArray(parsed) && parsed.length > 0) setEntityTypeItems(parsed);
      })
      .catch(() => setEntityTypeItems([]));
  }, []);

  const availableEntities = useMemo(() => entities.filter((item) => item.name.trim()), [entities]);

  const handleInputChange = (field: keyof ArchiveMetadata, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));
  const categoryLevels = buildCategoryLevels(categoryTree, categoryPath);

  const handleCategoryLevelChange = (level: number, value: string) => {
    const nextPath = [...categoryPath.slice(0, level), value].filter(Boolean);
    setCategoryPath(nextPath);
    handleInputChange('category', value || '未分类');
  };

  const runAIAnalysis = async () => {
    setIsProcessing(true);
    try {
      const result = await reparseArchive(document.id);
      onUpdateDocument(document.id, { status: 'PROCESSING' as any, aiTaskId: result.taskId, aiStatus: 'PENDING', aiMessage: '任务已创建，等待处理。' });
      alert(`已创建重新解析任务：${result.taskId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建任务失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onUpdateDocument(document.id, { metadata: formData as ArchiveMetadata, entities });
    alert('保存成功！');
  };

  const addEntity = () => setEntities((prev) => [...prev, { id: Date.now().toString(), name: '', type: '', parentType: '', relatedEntityIds: [], context: '', confidence: 100 }]);

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
                  <div><label className="block text-xs text-slate-500 mb-1">所属实体</label><select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.parentType || ''} onChange={(e) => { const copy = [...entities]; copy[idx].parentType = e.target.value; copy[idx].type = e.target.value; setEntities(copy); }}><option value="">请选择实体分类</option>{entityTypeItems.map((t) => <option key={t.key} value={t.key}>{t.label}（{t.key}）</option>)}</select></div>
                  <div><label className="block text-xs text-slate-500 mb-1">实体内容</label><input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entity.name} onChange={(e) => { const copy = [...entities]; copy[idx].name = e.target.value; setEntities(copy); }} /></div>
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-500">关联其他实体（全文检索多选）</label>
                    <input
                      value={relationKeywords[entity.id] || ''}
                      onChange={(e) => setRelationKeywords((prev) => ({ ...prev, [entity.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="输入关键字快速检索实体"
                    />
                    <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                      {availableEntities
                        .filter((candidate) => candidate.id !== entity.id)
                        .filter((candidate) => {
                          const keyword = (relationKeywords[entity.id] || '').trim().toLowerCase();
                          if (!keyword) return true;
                          return (`${candidate.name} ${candidate.parentType || ''}`).toLowerCase().includes(keyword);
                        })
                        .map((candidate) => (
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
                        return (
                          <span key={relatedId} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs inline-flex items-center gap-1">
                            {target.name || relatedId}
                            <button
                              onClick={() => {
                                const copy = [...entities];
                                copy[idx].relatedEntityIds = (copy[idx].relatedEntityIds || []).filter((id) => id !== relatedId);
                                setEntities(copy);
                              }}
                              className="hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
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
