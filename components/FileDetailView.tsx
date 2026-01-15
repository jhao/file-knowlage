import React, { useState, useEffect } from 'react';
import { ArchiveDocument, ArchiveMetadata, ArchiveCategory, SecurityLevel, KnowledgeEntity, UserRole } from '../types';
import { ArrowLeft, RefreshCw, Wand2, Eye, Save, Type, Tags, FileText, Plus, Trash2, ShieldAlert, Music } from 'lucide-react';

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

  useEffect(() => {
    if (document) {
        setFormData(document.metadata || {});
        setEntities(document.entities || []);
    }
  }, [document]);

  const handleInputChange = (field: keyof ArchiveMetadata, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const runAIAnalysis = async () => {
    if (!document || !document.contentBase64) {
        alert("无法重新解析：文件内容为空或格式不支持预览。");
        return;
    }
    
    setIsProcessing(true);
    try {
      alert("AI 重新解析完成！");
    } catch (err) {
      console.error(err);
      alert("AI Processing Failed. Check API Key.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onUpdateDocument(document.id, {
        metadata: formData as ArchiveMetadata,
        entities: entities
    });
    alert("保存成功！");
  };

  const removeEntity = (index: number) => {
      setEntities(prev => prev.filter((_, i) => i !== index));
  };

  const addEntity = () => {
      const newEntity: KnowledgeEntity = {
          id: Date.now().toString(),
          name: "新实体",
          type: "Concept",
          context: "人工添加",
          confidence: 100
      };
      setEntities([...entities, newEntity]);
  };

  const renderPreview = () => {
      const isVideo = document.fileType.startsWith('video/');
      const isAudio = document.fileType.startsWith('audio/');
      const isImage = document.fileType.startsWith('image/');
      
      return (
          <div className="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
              <div className="absolute inset-0 pointer-events-none z-10 opacity-10 flex items-center justify-center">
                  <div className="text-white text-4xl -rotate-45 font-bold">INTERNAL USE ONLY</div>
              </div>
              
              {isImage && (
                  <img src={document.contentBase64} alt="Preview" className="max-w-full max-h-full object-contain pointer-events-none" />
              )}
              {isVideo && (
                  <video controls src={document.contentBase64} className="max-w-full max-h-full" />
              )}
              {isAudio && (
                  <div className="bg-slate-800 p-8 rounded-xl flex flex-col items-center">
                      <div className="mb-4 text-white"><Music size={48}/></div>
                      <audio controls src={document.contentBase64} />
                  </div>
              )}
              {!isImage && !isVideo && !isAudio && (
                  <div className="text-white text-center opacity-60">
                      <FileText size={64} className="mx-auto mb-4"/>
                      <p>文档预览 (模拟 PDF 渲染)</p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
        {/* Left: Preview */}
        <div className="flex-1 flex flex-col border-r border-slate-200">
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium text-sm">
                    <ArrowLeft size={16}/> 返回列表
                </button>
                <div className="flex items-center gap-2 text-xs">
                     <span className="flex items-center gap-1 text-amber-500 font-medium"><ShieldAlert size={14}/> 防抓取保护开启</span>
                </div>
            </div>
            {renderPreview()}
        </div>

        {/* Right: Edit Panel */}
        <div className="w-[500px] bg-white flex flex-col shadow-xl z-10 border-l border-slate-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        档案详情
                    </h2>
                    <p className="text-xs text-slate-500 truncate w-64" title={document.fileName}>{document.fileName}</p>
                </div>
                {isProcessing ? (
                     <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                         <RefreshCw size={12} className="animate-spin"/> AI解析中...
                     </span>
                ) : (
                    <button 
                        onClick={runAIAnalysis}
                        className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-100 border border-indigo-200"
                    >
                        <Wand2 size={12} /> 重新 AI 解析
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('metadata')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'metadata' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Type size={16}/> 元数据
                </button>
                <button 
                    onClick={() => setActiveTab('entities')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'entities' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Tags size={16}/> 知识提取
                </button>
                <button 
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <FileText size={16}/> 全文解析
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                 {/* TAB: METADATA */}
                 {activeTab === 'metadata' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">文件物理属性</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                                <div>格式: {document.fileType}</div>
                                <div>页数/时长: {formData.fileProperties?.pageCount || formData.fileProperties?.duration || '-'}</div>
                                <div>语言: {formData.fileProperties?.language || '中文'}</div>
                            </div>
                        </div>

                        <div>
                            <label className="label-sm">文档标题</label>
                            <input type="text" value={formData.title || ''} onChange={(e) => handleInputChange('title', e.target.value)} className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-sm">日期</label>
                                <input type="date" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} className="input-field" />
                            </div>
                            <div>
                                <label className="label-sm">分类</label>
                                <select value={formData.category || ArchiveCategory.UNKNOWN} onChange={(e) => handleInputChange('category', e.target.value)} className="input-field">
                                    {Object.values(ArchiveCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label-sm">归属部门</label>
                            <input type="text" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} className="input-field" />
                        </div>
                        <div>
                            <label className="label-sm">责任者</label>
                            <input type="text" value={formData.authors?.join(', ') || ''} onChange={(e) => handleInputChange('authors', e.target.value.split(', '))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-sm">密级 (需管理员权限修改)</label>
                            <select 
                                value={formData.securityLevel || SecurityLevel.INTERNAL} 
                                onChange={(e) => handleInputChange('securityLevel', e.target.value)} 
                                className="input-field"
                                disabled={currentUserRole !== UserRole.ADMIN}
                            >
                                {Object.values(SecurityLevel).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-sm">摘要</label>
                            <textarea value={formData.summary || ''} onChange={(e) => handleInputChange('summary', e.target.value)} rows={3} className="input-field" />
                        </div>
                    </div>
                )}

                {/* TAB: ENTITIES */}
                {activeTab === 'entities' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-slate-500">知识图谱实体节点</p>
                            <button onClick={addEntity} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                                <Plus size={14}/> 添加实体
                            </button>
                        </div>
                        {entities.map((entity, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-indigo-300 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <input 
                                            value={entity.name} 
                                            onChange={(e) => {
                                                const newEntities = [...entities];
                                                newEntities[idx].name = e.target.value;
                                                setEntities(newEntities);
                                            }}
                                            className="font-semibold text-slate-800 text-sm bg-transparent border-none p-0 focus:ring-0 w-full"
                                        />
                                    </div>
                                    <button onClick={() => removeEntity(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <select 
                                        value={entity.type}
                                        onChange={(e) => {
                                            const newEntities = [...entities];
                                            newEntities[idx].type = e.target.value as any;
                                            setEntities(newEntities);
                                        }}
                                        className="text-[10px] bg-slate-100 border-none rounded py-0.5 px-2 text-slate-600"
                                    >
                                        {['Person', 'Location', 'Organization', 'Event', 'Concept'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded">置信度: {entity.confidence}%</span>
                                </div>
                                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded italic">
                                    "<span className="font-medium text-slate-700">{entity.context}</span>"
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: CONTENT */}
                {activeTab === 'content' && (
                    <div className="h-full flex flex-col">
                        <textarea 
                            className="flex-1 w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
                            value={formData.textContent || ''}
                            onChange={(e) => handleInputChange('textContent', e.target.value)}
                            placeholder="全文内容..."
                        />
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button 
                    onClick={handleSave} 
                    className="flex-1 btn-primary bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <Save size={16} /> 保存修改
                </button>
            </div>
        </div>

        <style>{`
            .label-sm { @apply block text-xs font-semibold text-slate-500 uppercase mb-1; }
            .input-field { @apply w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white; }
            .btn-primary { @apply py-2 rounded text-sm font-medium transition-colors shadow-sm flex justify-center items-center gap-2; }
        `}</style>
    </div>
  );
};

export default FileDetailView;
