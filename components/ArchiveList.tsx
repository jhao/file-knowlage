import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveDocument, ArchiveStatus } from '../types';
import { Download, FileText, Folder, Search, Network } from 'lucide-react';
import { listSettings } from '../services/settingsApi';

interface ArchiveListProps {
  documents: ArchiveDocument[];
  onViewDocument?: (doc: ArchiveDocument) => void;
}

type ArchiveCategoryTree = { name: string; children: string[] };

type SearchMode = 'smart' | 'detail';
type ViewMode = 'directory' | 'graph';

interface GraphEntityNode {
  id: string;
  name: string;
  type: string;
  docIds: string[];
  docTitles: string[];
  related: string[];
}

type EntityTypeItem = { key: string; label: string };

type SmartParsedQuery = {
  keyword?: string;
  category?: string;
  date?: string;
  dateRange?: { start: string; end: string };
  entity?: string;
};

type AppliedSearch = {
  mode: SearchMode;
  smart?: SmartParsedQuery;
  detail?: {
    keyword: string;
    entityKeyword: string;
    category: string;
    startDate: string;
    endDate: string;
  };
  tags: string[];
};

const DEFAULT_ARCHIVE_TREE: ArchiveCategoryTree[] = [
  { name: '学籍档案', children: ['本科生学籍', '研究生学籍'] },
  { name: '人事档案', children: ['教师人事', '行政人员人事'] },
  { name: '科研档案', children: ['项目档案', '成果档案'] },
  { name: '行政档案', children: ['制度文件', '会议纪要'] },
];

const DEFAULT_ENTITY_TYPES: EntityTypeItem[] = [
  { key: 'Person', label: '人物' },
  { key: 'Location', label: '地点' },
  { key: 'Organization', label: '组织' },
  { key: 'Event', label: '事件' },
  { key: 'Concept', label: '概念' },
];

const parseSmartQuery = (query: string) => {
  const q = query.trim();
  const result: SmartParsedQuery = {};
  const dateRangeMatch = q.match(/(20\d{2}-\d{2}-\d{2})\s*(到|至|~|－|—|-)\s*(20\d{2}-\d{2}-\d{2})/);
  if (dateRangeMatch) {
    result.dateRange = { start: dateRangeMatch[1], end: dateRangeMatch[3] };
  } else {
    const dateMatch = q.match(/(20\d{2}-\d{2}-\d{2})/);
    if (dateMatch) result.date = dateMatch[1];
  }

  const categoryKeywords = ['学籍档案', '人事档案', '科研档案', '行政档案', '会议纪要', '多媒体档案', '手稿', '教材', '新闻稿'];
  const hitCategory = categoryKeywords.find((item) => q.includes(item));
  if (hitCategory) result.category = hitCategory;

  const entityMatch = q.match(/实体[:：]?([^\s]+)/);
  if (entityMatch) result.entity = entityMatch[1];

  if (!result.entity && q.includes('关于')) {
    const tail = q.split('关于')[1]?.trim();
    if (tail) result.entity = tail.split(' ')[0];
  }

  if (!result.keyword) {
    result.keyword = q
      .replace(/20\d{2}-\d{2}-\d{2}\s*(到|至|~|－|—|-)\s*20\d{2}-\d{2}-\d{2}/g, '')
      .replace(/20\d{2}-\d{2}-\d{2}/g, '')
      .replace(/实体[:：]?\S+/g, '')
      .trim();
  }

  return result;
};

const ArchiveList: React.FC<ArchiveListProps> = ({ documents, onViewDocument }) => {
  const [categoryTree, setCategoryTree] = useState<ArchiveCategoryTree[]>(DEFAULT_ARCHIVE_TREE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('smart');
  const [smartQuery, setSmartQuery] = useState('');
  const [detailKeyword, setDetailKeyword] = useState('');
  const [detailEntityKeyword, setDetailEntityKeyword] = useState('');
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  const [detailCategory, setDetailCategory] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<AppliedSearch>({ mode: 'smart', tags: [] });
  const [smartError, setSmartError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('directory');
  const [graphEntityType, setGraphEntityType] = useState('');
  const [graphEntityName, setGraphEntityName] = useState('');
  const [expandedGraphNodes, setExpandedGraphNodes] = useState<Set<string>>(new Set());
  const [entityTypeItems, setEntityTypeItems] = useState<EntityTypeItem[]>(DEFAULT_ENTITY_TYPES);

  useEffect(() => {
    listSettings().then((items) => {
      const map = new Map(items.map((item) => [item.key, item.value]));
      const raw = map.get('archive_category_tree');
      const entityTypesRaw = map.get('entity_types_json');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ArchiveCategoryTree[];
          if (Array.isArray(parsed) && parsed.length > 0) setCategoryTree(parsed);
        } catch {
          // ignore invalid config
        }
      }
      if (entityTypesRaw) {
        try {
          const parsedTypes = JSON.parse(entityTypesRaw) as EntityTypeItem[];
          if (Array.isArray(parsedTypes) && parsedTypes.length > 0) setEntityTypeItems(parsedTypes);
        } catch {
          // ignore invalid config
        }
      }
    }).catch(() => undefined);
  }, []);

  const archivedDocs = useMemo(() => documents.filter((d) => d.status === ArchiveStatus.APPROVED), [documents]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    archivedDocs.forEach((doc) => {
      const cat = doc.metadata?.category;
      if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return counts;
  }, [archivedDocs]);

  const allCategories = useMemo(() => {
    const fromTree = categoryTree.flatMap((item) => [item.name, ...(item.children || [])]);
    return Array.from(new Set(fromTree));
  }, [categoryTree]);

  const filteredDocs = useMemo(() => {
    let result = [...archivedDocs];

    if (selectedCategory) {
      result = result.filter((doc) => doc.metadata?.category === selectedCategory);
    }

    if (appliedSearch.mode === 'smart' && appliedSearch.smart) {
      const parsed = appliedSearch.smart;
      if (parsed.category) result = result.filter((doc) => doc.metadata?.category?.includes(parsed.category || ''));
      if (parsed.date) result = result.filter((doc) => (doc.metadata?.date || '').includes(parsed.date));
      if (parsed.dateRange) {
        result = result.filter((doc) => {
          const docDate = (doc.metadata?.date || '').slice(0, 10);
          if (!docDate) return false;
          return docDate >= parsed.dateRange!.start && docDate <= parsed.dateRange!.end;
        });
      }
      if (parsed.entity) result = result.filter((doc) => doc.entities?.some((e) => e.name.includes(parsed.entity || '')));
      if (parsed.keyword) {
        const term = parsed.keyword.toLowerCase();
        result = result.filter((doc) => {
          const name = (doc.fileName || '').toLowerCase();
          const title = (doc.metadata?.title || '').toLowerCase();
          return name.includes(term) || title.includes(term);
        });
      }
    }

    if (appliedSearch.mode === 'detail' && appliedSearch.detail) {
      const detail = appliedSearch.detail;
      if (detail.startDate || detail.endDate) {
        result = result.filter((doc) => {
          const docDate = (doc.metadata?.date || '').slice(0, 10);
          if (!docDate) return false;
          if (detail.startDate && docDate < detail.startDate) return false;
          if (detail.endDate && docDate > detail.endDate) return false;
          return true;
        });
      }
      if (detail.category) result = result.filter((doc) => (doc.metadata?.category || '') === detail.category);
      if (detail.entityKeyword.trim()) result = result.filter((doc) => doc.entities?.some((e) => e.name.includes(detail.entityKeyword.trim())));
      if (detail.keyword.trim()) {
        const keyword = detail.keyword.toLowerCase();
        result = result.filter((doc) => (doc.fileName || '').toLowerCase().includes(keyword));
      }
    }

    return result;
  }, [archivedDocs, selectedCategory, appliedSearch]);

  const applySmartSearch = () => {
    const parsed = parseSmartQuery(smartQuery);
    const tags: string[] = [];
    if (parsed.category) tags.push(`门类：${parsed.category}`);
    if (parsed.date) tags.push(`日期：${parsed.date}`);
    if (parsed.dateRange) tags.push(`日期范围：${parsed.dateRange.start} ~ ${parsed.dateRange.end}`);
    if (parsed.entity) tags.push(`实体：${parsed.entity}`);
    if (parsed.keyword) tags.push(`关键词：${parsed.keyword}`);

    if (tags.length === 0) {
      setSmartError('无法分析出有效查询条件，请用更加精准的描述来说明想要查询的内容。');
      return;
    }

    setSmartError('');
    setAppliedSearch({ mode: 'smart', smart: parsed, tags });
  };

  const applyDetailSearch = () => {
    const tags: string[] = [];
    if (detailStartDate || detailEndDate) tags.push(`日期范围：${detailStartDate || '不限'} ~ ${detailEndDate || '不限'}`);
    if (detailCategory) tags.push(`门类：${detailCategory}`);
    if (detailEntityKeyword.trim()) tags.push(`实体：${detailEntityKeyword.trim()}`);
    if (detailKeyword.trim()) tags.push(`关键词：${detailKeyword.trim()}`);
    setSmartError('');
    setAppliedSearch({
      mode: 'detail',
      tags,
      detail: {
        keyword: detailKeyword,
        entityKeyword: detailEntityKeyword,
        category: detailCategory,
        startDate: detailStartDate,
        endDate: detailEndDate,
      },
    });
  };

  const graphData = useMemo(() => {
    const map = new Map<string, GraphEntityNode>();

    filteredDocs.forEach((doc) => {
      const entities = (doc.entities || []).filter((entity) => {
        const typeMatch = !graphEntityType || entity.type === graphEntityType;
        const nameMatch = !graphEntityName.trim() || entity.name.toLowerCase().includes(graphEntityName.trim().toLowerCase());
        return typeMatch && nameMatch;
      });

      entities.forEach((entity) => {
        const id = `${entity.type}:${entity.name}`;
        const existing = map.get(id);
        if (!existing) {
          map.set(id, {
            id,
            name: entity.name,
            type: entity.type,
            docIds: [doc.id],
            docTitles: [doc.metadata?.title || doc.fileName],
            related: [],
          });
        } else {
          if (!existing.docIds.includes(doc.id)) {
            existing.docIds.push(doc.id);
            existing.docTitles.push(doc.metadata?.title || doc.fileName);
          }
        }
      });

      for (let i = 0; i < entities.length; i += 1) {
        for (let j = i + 1; j < entities.length; j += 1) {
          const leftId = `${entities[i].type}:${entities[i].name}`;
          const rightId = `${entities[j].type}:${entities[j].name}`;
          const left = map.get(leftId);
          const right = map.get(rightId);
          if (left && right) {
            if (!left.related.includes(rightId)) left.related.push(rightId);
            if (!right.related.includes(leftId)) right.related.push(leftId);
          }
        }
      }
    });

    return map;
  }, [filteredDocs, graphEntityType, graphEntityName]);

  const rootGraphNodes = useMemo(() => {
    const arr = Array.from(graphData.values());
    return arr.sort((a, b) => b.related.length - a.related.length).slice(0, 12);
  }, [graphData]);

  useEffect(() => {
    const defaults = new Set<string>();
    rootGraphNodes.forEach((node) => defaults.add(node.id));
    setExpandedGraphNodes(defaults);
  }, [rootGraphNodes]);

  const graphCanvas = useMemo(() => {
    const center = rootGraphNodes[0];
    if (!center) return { nodes: [], edges: [], width: 960, height: 560 };

    const firstLayer = center.related.slice(0, 8).map((id) => graphData.get(id)).filter(Boolean) as GraphEntityNode[];
    const secondLayerIds = firstLayer.flatMap((node) => node.related.slice(0, 3)).filter((id) => id !== center.id);
    const secondLayer = Array.from(new Set(secondLayerIds)).slice(0, 16).map((id) => graphData.get(id)).filter(Boolean) as GraphEntityNode[];

    const width = 960;
    const height = 560;
    const cx = width / 2;
    const cy = height / 2;
    const placeRing = (nodes: GraphEntityNode[], radius: number) => nodes.map((node, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(nodes.length, 1);
      return { id: node.id, node, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });

    const centerNode = { id: center.id, node: center, x: cx, y: cy };
    const ring1 = placeRing(firstLayer, 150);
    const ring2 = placeRing(secondLayer, 250);
    const nodes = [centerNode, ...ring1, ...ring2];
    const nodeSet = new Set(nodes.map((n) => n.id));

    const edges: Array<{ source: string; target: string }> = [];
    nodes.forEach((current) => {
      current.node.related.forEach((targetId) => {
        if (nodeSet.has(targetId) && current.id < targetId) {
          edges.push({ source: current.id, target: targetId });
        }
      });
    });

    return { nodes, edges, width, height };
  }, [graphData, rootGraphNodes]);

  const renderGraphNode = (nodeId: string, depth: number, visited: Set<string>) => {
    const node = graphData.get(nodeId);
    if (!node || visited.has(nodeId) || depth > 3) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);
    const isExpanded = expandedGraphNodes.has(nodeId);
    const canExpand = node.related.length > 0;

    return (
      <div key={`${nodeId}-${depth}`} className="ml-4 border-l border-slate-200 pl-3">
        <button
          className="text-left w-full rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2"
          onClick={() => {
            setExpandedGraphNodes((prev) => {
              const next = new Set(prev);
              if (next.has(nodeId)) next.delete(nodeId);
              else next.add(nodeId);
              return next;
            });
          }}
        >
          <div className="text-xs text-indigo-600">{node.type}</div>
          <div className="font-medium text-sm text-slate-800">{node.name}</div>
          <div className="text-xs text-slate-500">关联文档 {node.docIds.length} | 关联实体 {node.related.length}</div>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600">
              文档：{node.docTitles.slice(0, 5).join('、') || '暂无'}
            </div>
            {canExpand && depth < 3 && node.related.slice(0, 6).map((childId) => renderGraphNode(childId, depth + 1, nextVisited))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Folder size={16} /> 档案资源目录</h3>
        <button onClick={() => setSelectedCategory(null)} className={`w-full text-left text-sm px-2 py-1 rounded flex justify-between ${!selectedCategory ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}><span>全部档案</span><span>{archivedDocs.length}</span></button>
        {categoryTree.map((node) => (
          <div key={node.name} className="mt-2">
            <button onClick={() => setSelectedCategory(node.name)} className={`w-full text-left text-sm px-2 py-1 rounded flex justify-between ${selectedCategory === node.name ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}><span>{node.name}</span><span>{(node.children || []).reduce((sum, child) => sum + (categoryCounts.get(child) || 0), 0)}</span></button>
            <div className="ml-3">
              {node.children.map((child) => (
                <button key={`${node.name}-${child}`} onClick={() => setSelectedCategory(child)} className={`w-full text-left text-xs px-2 py-1 rounded flex justify-between ${selectedCategory === child ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><span>{child}</span><span>{categoryCounts.get(child) || 0}</span></button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">数字档案库</h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
                <button className={`px-3 py-1 rounded ${searchMode === 'smart' ? 'bg-white' : ''}`} onClick={() => setSearchMode('smart')}>智能查询</button>
                <button className={`px-3 py-1 rounded ${searchMode === 'detail' ? 'bg-white' : ''}`} onClick={() => setSearchMode('detail')}>详细查询</button>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
                <button className={`px-3 py-1 rounded inline-flex items-center gap-1 ${viewMode === 'directory' ? 'bg-white' : ''}`} onClick={() => setViewMode('directory')}><Folder size={12} /> 目录</button>
                <button className={`px-3 py-1 rounded inline-flex items-center gap-1 ${viewMode === 'graph' ? 'bg-white' : ''}`} onClick={() => setViewMode('graph')}><Network size={12} /> 知识图谱</button>
              </div>
            </div>
          </div>

          {searchMode === 'smart' ? (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={smartQuery} onChange={(e) => setSmartQuery(e.target.value)} className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2 text-sm" placeholder="例如：查询2024-01-01 行政档案 实体:档案馆 关于校园发展" />
              </div>
              <button onClick={applySmartSearch} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">查询</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="date" value={detailStartDate} onChange={(e) => setDetailStartDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" />
              <input type="date" value={detailEndDate} onChange={(e) => setDetailEndDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" />
              <select value={detailCategory} onChange={(e) => setDetailCategory(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
                <option value="">全部门类</option>
                {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input value={detailEntityKeyword} onChange={(e) => setDetailEntityKeyword(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" placeholder="实体信息关键字" />
              <input value={detailKeyword} onChange={(e) => setDetailKeyword(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" placeholder="文档名称模糊查询" />
              <button onClick={applyDetailSearch} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">查询</button>
            </div>
          )}

          {smartError && <p className="mt-2 text-sm text-amber-600">{smartError}</p>}
          {appliedSearch.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {appliedSearch.tags.map((tag) => <span key={tag} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{tag}</span>)}
            </div>
          )}
        </div>

        {viewMode === 'directory' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr><th className="px-6 py-4">文档名称</th><th className="px-6 py-4">档案门类</th><th className="px-6 py-4">上传者</th><th className="px-6 py-4">关联实体摘要</th><th className="px-6 py-4">归档日期</th><th className="px-6 py-4 text-right">操作</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDocument && onViewDocument(doc)}>
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><FileText size={16} className="text-indigo-500" /><div><div className="font-semibold text-slate-800">{doc.metadata?.title || doc.fileName}</div><div className="text-xs text-slate-400">{doc.fileName}</div></div></div></td>
                    <td className="px-6 py-4">{doc.metadata?.category}</td>
                    <td className="px-6 py-4">{doc.uploadedByName || doc.uploadedBy || "-"}</td>
                    <td className="px-6 py-4">{(doc.entities || []).slice(0, 3).map((e) => e.name).join('、')}</td>
                    <td className="px-6 py-4">{doc.metadata?.date}</td>
                    <td className="px-6 py-4 text-right"><button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-indigo-600"><Download size={16} /></button></td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">未检索到匹配档案</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select value={graphEntityType} onChange={(e) => setGraphEntityType(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
                <option value="">全部实体类型</option>
                {entityTypeItems.map((type) => <option key={type.key} value={type.key}>{type.label}（{type.key}）</option>)}
              </select>
              <input value={graphEntityName} onChange={(e) => setGraphEntityName(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" placeholder="按实体名称搜索" />
            </div>
            <p className="text-xs text-slate-500">图谱以脑图方式展示中心实体与关联实体网络，中心点为当前条件下关联度最高的实体。</p>
            <div className="max-h-[60vh] overflow-auto space-y-2 pr-2">
              {graphCanvas.nodes.length > 0 ? (
                <svg viewBox={`0 0 ${graphCanvas.width} ${graphCanvas.height}`} className="w-full min-h-[520px] bg-slate-50 rounded-lg border border-slate-100">
                  {graphCanvas.edges.map((edge) => {
                    const source = graphCanvas.nodes.find((n) => n.id === edge.source);
                    const target = graphCanvas.nodes.find((n) => n.id === edge.target);
                    if (!source || !target) return null;
                    return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#cbd5e1" strokeWidth="1.5" />;
                  })}
                  {graphCanvas.nodes.map((item, index) => (
                    <g key={item.id}>
                      <circle cx={item.x} cy={item.y} r={index === 0 ? 28 : 20} fill={index === 0 ? '#4f46e5' : '#10b981'} opacity={index === 0 ? 0.95 : 0.85} />
                      <text x={item.x} y={item.y + 4} textAnchor="middle" fontSize="10" fill="white">{item.node.name.slice(0, 6)}</text>
                      <text x={item.x} y={item.y + (index === 0 ? 40 : 32)} textAnchor="middle" fontSize="10" fill="#475569">{item.node.type}</text>
                    </g>
                  ))}
                </svg>
              ) : null}
              <div className="space-y-2">
                {rootGraphNodes.map((node) => renderGraphNode(node.id, 1, new Set()))}
              </div>
              {rootGraphNodes.length === 0 && <div className="text-center text-sm text-slate-400 py-8">当前筛选条件下暂无实体图谱数据</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveList;
