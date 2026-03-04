import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveDocument, ArchiveStatus } from '../types';
import { Download, FileText, Folder, Search } from 'lucide-react';
import { listSettings } from '../services/settingsApi';

interface ArchiveListProps {
  documents: ArchiveDocument[];
  onViewDocument?: (doc: ArchiveDocument) => void;
}

type ArchiveCategoryTree = { name: string; children: string[] };

type SearchMode = 'smart' | 'detail';

const DEFAULT_ARCHIVE_TREE: ArchiveCategoryTree[] = [
  { name: '学籍档案', children: ['本科生学籍', '研究生学籍'] },
  { name: '人事档案', children: ['教师人事', '行政人员人事'] },
  { name: '科研档案', children: ['项目档案', '成果档案'] },
  { name: '行政档案', children: ['制度文件', '会议纪要'] },
];

const parseSmartQuery = (query: string) => {
  const q = query.trim();
  const result: { keyword?: string; category?: string; date?: string; entity?: string } = {};
  const dateMatch = q.match(/(20\d{2}-\d{2}-\d{2})/);
  if (dateMatch) result.date = dateMatch[1];

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
    result.keyword = q.replace(/20\d{2}-\d{2}-\d{2}/g, '').replace(/实体[:：]?\S+/g, '').trim();
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
  const [detailDate, setDetailDate] = useState('');
  const [detailCategory, setDetailCategory] = useState('');

  useEffect(() => {
    listSettings().then((items) => {
      const map = new Map(items.map((item) => [item.key, item.value]));
      const raw = map.get('archive_category_tree');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as ArchiveCategoryTree[];
        if (Array.isArray(parsed) && parsed.length > 0) setCategoryTree(parsed);
      } catch {
        // ignore invalid config
      }
    }).catch(() => undefined);
  }, []);

  const archivedDocs = useMemo(() => documents.filter((d) => d.status === ArchiveStatus.APPROVED), [documents]);

  const allCategories = useMemo(() => {
    const fromTree = categoryTree.flatMap((item) => [item.name, ...(item.children || [])]);
    return Array.from(new Set(fromTree));
  }, [categoryTree]);

  const filteredDocs = useMemo(() => {
    let result = [...archivedDocs];

    if (selectedCategory) {
      result = result.filter((doc) => doc.metadata?.category === selectedCategory);
    }

    if (searchMode === 'smart' && smartQuery.trim()) {
      const parsed = parseSmartQuery(smartQuery);
      if (parsed.category) result = result.filter((doc) => doc.metadata?.category?.includes(parsed.category || ''));
      if (parsed.date) result = result.filter((doc) => (doc.metadata?.date || '').includes(parsed.date || ''));
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

    if (searchMode === 'detail') {
      if (detailDate) result = result.filter((doc) => (doc.metadata?.date || '').includes(detailDate));
      if (detailCategory) result = result.filter((doc) => (doc.metadata?.category || '') === detailCategory);
      if (detailEntityKeyword.trim()) result = result.filter((doc) => doc.entities?.some((e) => e.name.includes(detailEntityKeyword.trim())));
      if (detailKeyword.trim()) {
        const keyword = detailKeyword.toLowerCase();
        result = result.filter((doc) => (doc.fileName || '').toLowerCase().includes(keyword));
      }
    }

    return result;
  }, [archivedDocs, selectedCategory, searchMode, smartQuery, detailDate, detailCategory, detailEntityKeyword, detailKeyword]);

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Folder size={16} /> 档案资源目录</h3>
        <button onClick={() => setSelectedCategory(null)} className={`w-full text-left text-sm px-2 py-1 rounded ${!selectedCategory ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}>全部档案</button>
        {categoryTree.map((node) => (
          <div key={node.name} className="mt-2">
            <button onClick={() => setSelectedCategory(node.name)} className={`w-full text-left text-sm px-2 py-1 rounded ${selectedCategory === node.name ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}>{node.name}</button>
            <div className="ml-3">
              {node.children.map((child) => (
                <button key={`${node.name}-${child}`} onClick={() => setSelectedCategory(child)} className={`w-full text-left text-xs px-2 py-1 rounded ${selectedCategory === child ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>{child}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">数字档案库</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
              <button className={`px-3 py-1 rounded ${searchMode === 'smart' ? 'bg-white' : ''}`} onClick={() => setSearchMode('smart')}>智能查询</button>
              <button className={`px-3 py-1 rounded ${searchMode === 'detail' ? 'bg-white' : ''}`} onClick={() => setSearchMode('detail')}>详细查询</button>
            </div>
          </div>

          {searchMode === 'smart' ? (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={smartQuery} onChange={(e) => setSmartQuery(e.target.value)} className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2 text-sm" placeholder="例如：查询2024-01-01 行政档案 实体:档案馆 关于校园发展" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="date" value={detailDate} onChange={(e) => setDetailDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" />
              <select value={detailCategory} onChange={(e) => setDetailCategory(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
                <option value="">全部门类</option>
                {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input value={detailEntityKeyword} onChange={(e) => setDetailEntityKeyword(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" placeholder="实体信息关键字" />
              <input value={detailKeyword} onChange={(e) => setDetailKeyword(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-2 text-sm" placeholder="文档名称模糊查询" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr><th className="px-6 py-4">文档名称</th><th className="px-6 py-4">档案门类</th><th className="px-6 py-4">关联实体摘要</th><th className="px-6 py-4">归档日期</th><th className="px-6 py-4 text-right">操作</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDocument && onViewDocument(doc)}>
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><FileText size={16} className="text-indigo-500" /><div><div className="font-semibold text-slate-800">{doc.metadata?.title || doc.fileName}</div><div className="text-xs text-slate-400">{doc.fileName}</div></div></div></td>
                  <td className="px-6 py-4">{doc.metadata?.category}</td>
                  <td className="px-6 py-4">{(doc.entities || []).slice(0, 3).map((e) => e.name).join('、')}</td>
                  <td className="px-6 py-4">{doc.metadata?.date}</td>
                  <td className="px-6 py-4 text-right"><button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-indigo-600"><Download size={16} /></button></td>
                </tr>
              ))}
              {filteredDocs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">未检索到匹配档案</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ArchiveList;
