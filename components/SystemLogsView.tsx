import React, { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { SystemLogEntry, SystemLogType } from '../types';
import { listSystemLogs } from '../services/logsApi';

const LIMIT_OPTIONS = [100, 1000, 10000, 50000, 99999];

const SystemLogsView: React.FC = () => {
  const [type, setType] = useState<SystemLogType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SystemLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = async (targetPage = 1) => {
    setLoading(true);
    try {
      const result = await listSystemLogs({
        type,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        page: targetPage,
      });
      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages || 1);
      setPage(result.pagination.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History size={20} /> 系统日志</h2>
        <button onClick={() => loadLogs(page)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 inline-flex items-center gap-1">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value as SystemLogType)} className="border border-slate-300 rounded-lg p-2 text-sm">
            <option value="ALL">全部类型</option>
            <option value="BACKEND_API">后端调用</option>
            <option value="AI_API">AI API 调用</option>
            <option value="ACTION">操作日志</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-sm" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-sm" />
          <select value={limit} onChange={(e) => setLimit(Math.min(99999, Number(e.target.value) || 100))} className="border border-slate-300 rounded-lg p-2 text-sm">
            {LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value} 条/页</option>)}
          </select>
          <button onClick={() => loadLogs(1)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm">查询</button>
        </div>

        <p className="text-xs text-slate-500">默认读取最新 100 条；最多可查询 99999 条，可按类型与日期范围筛选。</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">时间</th>
                <th className="px-3 py-2 text-left">类型</th>
                <th className="px-3 py-2 text-left">用户</th>
                <th className="px-3 py-2 text-left">动作</th>
                <th className="px-3 py-2 text-left">请求</th>
                <th className="px-3 py-2 text-left">明细</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>日志加载中...</td></tr>}
              {!loading && items.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>暂无日志</td></tr>}
              {!loading && items.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-xs">{log.type}</span></td>
                  <td className="px-3 py-2">{log.userId || '-'}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{log.method && log.path ? `${log.method} ${log.path}` : '-'}{log.statusCode ? ` (${log.statusCode})` : ''}{typeof log.durationMs === 'number' ? ` · ${log.durationMs}ms` : ''}</td>
                  <td className="px-3 py-2 max-w-[520px] break-words">{log.detail || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
          <span className="text-slate-600">共 {total} 条 · 第 {page}/{totalPages} 页</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => loadLogs(page - 1)} className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">上一页</button>
            <button disabled={page >= totalPages || loading} onClick={() => loadLogs(page + 1)} className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogsView;
