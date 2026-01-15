import React, { useState, useMemo } from 'react';
import { ArchiveDocument, ArchiveStatus, ArchiveCategory, KnowledgeEntity, SecurityLevel } from '../types';
import { Search, Filter, Download, FileText, ChevronRight, ChevronDown, Folder, User, MapPin, Building, Flag, Tag, Network, List as ListIcon, Database } from 'lucide-react';

interface ArchiveListProps {
  documents: ArchiveDocument[];
  onViewDocument?: (doc: ArchiveDocument) => void;
}

// Helper to get icon for entity type
const getEntityIcon = (type: string) => {
    switch(type) {
        case 'Person': return <User size={14} className="text-indigo-500" />;
        case 'Location': return <MapPin size={14} className="text-emerald-500" />;
        case 'Organization': return <Building size={14} className="text-blue-500" />;
        case 'Event': return <Flag size={14} className="text-amber-500" />;
        default: return <Tag size={14} className="text-slate-500" />;
    }
};

// Helper for extension
const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
};

// --- GRAPH VISUALIZATION COMPONENT ---
const KnowledgeGraph: React.FC<{ 
    documents: ArchiveDocument[], 
    selectedEntityId: string | null,
    onNodeClick: (id: string, type: 'entity' | 'doc') => void 
}> = ({ documents, selectedEntityId, onNodeClick }) => {
    
    // Calculate layout based on selection
    const graphData = useMemo(() => {
        const width = 800;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // 1. If an entity is selected -> Star Topology (Center = Entity, Satellites = Docs)
        if (selectedEntityId) {
            const relatedDocs = documents.filter(d => d.entities?.some(e => e.name === selectedEntityId));
            const centerNode = { id: selectedEntityId, type: 'center', x: centerX, y: centerY, label: selectedEntityId };
            
            const nodes: any[] = [centerNode];
            const links: any[] = [];
            
            relatedDocs.forEach((doc, idx) => {
                const angle = (idx / relatedDocs.length) * 2 * Math.PI;
                const radius = 200;
                const nx = centerX + radius * Math.cos(angle);
                const ny = centerY + radius * Math.sin(angle);
                
                nodes.push({ id: doc.id, type: 'doc', x: nx, y: ny, label: doc.fileName, docData: doc });
                links.push({ source: centerNode, target: { x: nx, y: ny } });
            });
            return { nodes, links, mode: 'focus' };
        } 
        
        // 2. If nothing selected -> Cluster View (Center = Archive, Clusters = Entity Types)
        else {
            const categories = ['Person', 'Organization', 'Location', 'Event', 'Concept'];
            const nodes: any[] = [];
            const links: any[] = [];
            
            // Root
            const root = { id: 'ROOT', type: 'root', x: centerX, y: centerY, label: '全宗档案' };
            nodes.push(root);

            // Level 1: Categories
            categories.forEach((cat, i) => {
                const angle = (i / categories.length) * 2 * Math.PI;
                const r1 = 150;
                const catX = centerX + r1 * Math.cos(angle);
                const catY = centerY + r1 * Math.sin(angle);
                const catNode = { id: cat, type: 'category', x: catX, y: catY, label: cat };
                nodes.push(catNode);
                links.push({ source: root, target: catNode });

                // Level 2: Top 3 Entities per category
                const topEntities = Array.from(new Set(
                    documents.flatMap(d => d.entities || [])
                    .filter(e => e.type === cat)
                    .map(e => e.name)
                )).slice(0, 3);

                topEntities.forEach((entName, j) => {
                    const angle2 = angle + ((j - 1) * 0.5); // Spread slightly
                    const r2 = 100; // Dist from category
                    const entX = catX + r2 * Math.cos(angle2);
                    const entY = catY + r2 * Math.sin(angle2);
                    
                    nodes.push({ id: entName, type: 'entity', x: entX, y: entY, label: entName });
                    links.push({ source: catNode, target: { x: entX, y: entY } });
                });
            });
            return { nodes, links, mode: 'overview' };
        }
    }, [documents, selectedEntityId]);

    return (
        <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 800 600" className="cursor-grab active:cursor-grabbing">
                {/* Links */}
                {graphData.links.map((link, i) => (
                    <line 
                        key={i} 
                        x1={link.source.x} y1={link.source.y} 
                        x2={link.target.x} y2={link.target.y} 
                        stroke="#475569" 
                        strokeWidth={1}
                        strokeOpacity={0.5}
                    />
                ))}
                
                {/* Nodes */}
                {graphData.nodes.map((node: any) => {
                    let fill = '#fff';
                    let r = 5;
                    let textClass = "fill-slate-400 text-[10px]";
                    
                    if (node.type === 'root') { fill = '#6366f1'; r = 30; textClass="fill-white font-bold text-sm"; }
                    else if (node.type === 'center') { fill = '#ec4899'; r = 25; textClass="fill-white font-bold text-sm"; }
                    else if (node.type === 'category') { fill = '#3b82f6'; r = 15; textClass="fill-slate-300 text-xs font-medium"; }
                    else if (node.type === 'entity') { fill = '#10b981'; r = 10; textClass="fill-slate-300 text-xs"; }
                    else if (node.type === 'doc') { fill = '#f59e0b'; r = 8; textClass="fill-slate-300 text-xs"; }

                    return (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x},${node.y})`}
                            onClick={() => node.type === 'entity' || node.type === 'category' ? onNodeClick(node.id, 'entity') : null}
                            className="transition-all hover:opacity-80 cursor-pointer"
                        >
                            <circle r={r} fill={fill} stroke="#1e293b" strokeWidth={2} className="drop-shadow-lg" />
                            <text dy={r + 15} textAnchor="middle" className={`${textClass} pointer-events-none`}>
                                {node.label.length > 10 ? node.label.slice(0,8)+'...' : node.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="absolute bottom-4 right-4 bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> 档案全宗</div>
                <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 实体类别</div>
                <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 知识实体</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> 档案文件</div>
            </div>
            {selectedEntityId && (
                <button 
                    onClick={() => onNodeClick('', 'entity')}
                    className="absolute top-4 left-4 bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs hover:bg-slate-700"
                >
                    ← 返回全景图
                </button>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const ArchiveList: React.FC<ArchiveListProps> = ({ documents, onViewDocument }) => {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // 'All', 'Academic', etc.
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null); // 'ZhangSan', etc.
  
  // Folders State
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({'root_cat': true, 'root_ent': true});

  const toggleFolder = (key: string) => {
      setExpandedFolders(prev => ({...prev, [key]: !prev[key]}));
  };

  // --- DERIVED DATA ---
  const archivedDocs = documents.filter(d => d.status === ArchiveStatus.APPROVED);

  // Extract all unique entities for directory
  const entityDirectory = useMemo(() => {
      const dir: Record<string, string[]> = {
          'Person': [], 'Organization': [], 'Location': [], 'Event': [], 'Concept': []
      };
      archivedDocs.forEach(doc => {
          doc.entities?.forEach(e => {
              if (dir[e.type] && !dir[e.type].includes(e.name)) {
                  dir[e.type].push(e.name);
              }
          });
      });
      return dir;
  }, [archivedDocs]);

  // Filter Logic
  const filteredDocs = archivedDocs.filter(doc => {
      let matchesCat = true;
      if (selectedCategory && selectedCategory !== 'All') {
          matchesCat = doc.metadata?.category === selectedCategory;
      }

      let matchesEntity = true;
      if (selectedEntity) {
          // If selected entity is a generic type (e.g., 'Person'), filter docs that have ANY Person
          if (['Person', 'Organization', 'Location', 'Event', 'Concept'].includes(selectedEntity)) {
               matchesEntity = doc.entities?.some(e => e.type === selectedEntity) || false;
          } else {
               // Specific entity
               matchesEntity = doc.entities?.some(e => e.name === selectedEntity) || false;
          }
      }

      return matchesCat && matchesEntity;
  });

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* --- LEFT SIDEBAR: DIRECTORY --- */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Database size={18} className="text-indigo-600"/> 档案资源目录
            </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {/* 1. Archive Category Tree */}
            <div>
                <button 
                    onClick={() => toggleFolder('root_cat')}
                    className="w-full flex items-center gap-2 p-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                >
                    {expandedFolders['root_cat'] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    <Folder size={16} className="text-blue-500 fill-blue-100" />
                    按档案门类
                </button>
                
                {expandedFolders['root_cat'] && (
                    <div className="ml-6 border-l border-slate-200 pl-2 mt-1 space-y-0.5">
                        <button 
                             onClick={() => { setSelectedCategory('All'); setSelectedEntity(null); }}
                             className={`w-full text-left text-xs py-1.5 px-2 rounded ${!selectedCategory || selectedCategory === 'All' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            全部档案 ({archivedDocs.length})
                        </button>
                        {Object.values(ArchiveCategory).map(cat => (
                            <button 
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); setSelectedEntity(null); }}
                                className={`w-full text-left text-xs py-1.5 px-2 rounded flex justify-between group ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <span>{cat}</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-500">
                                    {archivedDocs.filter(d => d.metadata?.category === cat).length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-slate-100 my-2"></div>

            {/* 2. Knowledge Graph Entity Tree */}
            <div>
                <button 
                    onClick={() => toggleFolder('root_ent')}
                    className="w-full flex items-center gap-2 p-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                >
                    {expandedFolders['root_ent'] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    <Network size={16} className="text-emerald-500" />
                    知识图谱实体清单
                </button>
                
                {expandedFolders['root_ent'] && (
                    <div className="ml-6 border-l border-slate-200 pl-2 mt-1 space-y-1">
                        {(Object.entries(entityDirectory) as [string, string[]][]).map(([type, names]) => {
                            if (names.length === 0) return null;
                            const isTypeOpen = expandedFolders[`type_${type}`];
                            return (
                                <div key={type}>
                                    <button 
                                        onClick={() => toggleFolder(`type_${type}`)}
                                        className="w-full flex items-center gap-2 text-xs font-medium text-slate-700 py-1 px-2 hover:bg-slate-100 rounded"
                                    >
                                        {isTypeOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                                        {getEntityIcon(type)}
                                        {type === 'Person' ? '人物' : type === 'Organization' ? '机构' : type === 'Location' ? '地点' : type === 'Event' ? '事件' : '概念'}
                                        <span className="ml-auto text-[10px] text-slate-400">{names.length}</span>
                                    </button>
                                    
                                    {isTypeOpen && (
                                        <div className="ml-4 border-l border-slate-200 pl-2 mt-0.5 space-y-0.5">
                                            {names.map(name => (
                                                <button
                                                    key={name}
                                                    onClick={() => { setSelectedEntity(name); setSelectedCategory(null); }}
                                                    className={`w-full text-left text-[11px] py-1 px-2 rounded truncate transition-colors ${selectedEntity === name ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                                    title={name}
                                                >
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- RIGHT MAIN: CONTENT --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header / Toolbar */}
        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {selectedEntity ? (
                        <>
                           <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm">实体: {selectedEntity}</span>
                        </>
                    ) : selectedCategory ? (
                        <>
                           <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">分类: {selectedCategory === 'All' ? '全部档案' : selectedCategory}</span>
                        </>
                    ) : (
                        "数字档案库"
                    )}
                </h2>
                <p className="text-xs text-slate-500">
                    共找到 {filteredDocs.length} 份相关文档
                </p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ListIcon size={14}/> 列表视图
                </button>
                <button 
                    onClick={() => setViewMode('graph')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Network size={14}/> 图谱视图
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 relative">
            {viewMode === 'list' ? (
                <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">文档名称</th>
                                    <th className="px-6 py-4">档案门类</th>
                                    <th className="px-6 py-4">关联实体摘要</th>
                                    <th className="px-6 py-4">归档日期</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onViewDocument && onViewDocument(doc)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 text-indigo-600 p-2 rounded">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">{doc.metadata?.title || doc.fileName}</p>
                                                        {/* EXTENSION BADGE */}
                                                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1 rounded border border-slate-300">
                                                            {getFileExtension(doc.fileName)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">{doc.metadata?.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                {doc.metadata?.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                                                {doc.entities?.slice(0,3).map((e, i) => (
                                                    <span 
                                                        key={i} 
                                                        onClick={(ev) => { ev.stopPropagation(); setSelectedEntity(e.name); setSelectedCategory(null); }}
                                                        className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 rounded text-slate-600 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        {e.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{doc.metadata?.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); /* download logic */ }} 
                                                className="text-slate-400 hover:text-indigo-600"
                                            >
                                                <Download size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            该分类或实体下暂无档案。
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // Graph View
                <div className="h-full flex flex-col">
                    <KnowledgeGraph 
                        documents={archivedDocs} 
                        selectedEntityId={selectedEntity} 
                        onNodeClick={(id, type) => {
                            if (type === 'entity') {
                                setSelectedEntity(id);
                                setSelectedCategory(null);
                            }
                        }} 
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveList;