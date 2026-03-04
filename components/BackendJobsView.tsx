import React, { useEffect, useState } from 'react';
import { listTaskExecutionLogs, listTasks } from '../services/tasksApi';
import { AITaskExecutionLog, AITaskLog } from '../types';

interface BackendJobsViewProps {
  focusTaskId?: string | null;
}

const BackendJobsView: React.FC<BackendJobsViewProps> = ({ focusTaskId }) => {
  const [items, setItems] = useState<AITaskLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<AITaskExecutionLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listTasks());
    } finally {
      setLoading(false);
    }
  };

  const openJobDetail = async (taskId: string) => {
    setActiveTaskId(taskId);
    setLoadingDetail(true);
    try {
      setExecutionLogs(await listTaskExecutionLogs(taskId));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!focusTaskId) return;
    openJobDetail(focusTaskId);
  }, [focusTaskId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">后台job管理</h2>
          <p className="text-slate-500 mt-1">查看 AI 解析队列进度与调用日志。</p>
        </div>
        <button className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm" onClick={load} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">任务ID</th>
              <th className="px-4 py-3 text-left">档案ID</th>
              <th className="px-4 py-3 text-left">类型</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">日志消息</th>
              <th className="px-4 py-3 text-left">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((job) => (
              <tr key={`${job.taskId}-${job.updatedAt}`} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">
                  <button className="text-indigo-600 hover:text-indigo-700 underline" onClick={() => openJobDetail(job.taskId)}>
                    {job.taskId}
                  </button>
                </td>
                <td className="px-4 py-3">{job.archiveId}</td>
                <td className="px-4 py-3">{job.taskType}</td>
                <td className="px-4 py-3">{job.status}</td>
                <td className="px-4 py-3">{job.message || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(job.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">暂无后台任务</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeTaskId && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">任务执行日志 · {activeTaskId}</h3>
              <button onClick={() => setActiveTaskId(null)} className="text-slate-500 hover:text-slate-800">关闭</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto space-y-2">
              {loadingDetail && <div className="text-sm text-slate-500">日志加载中...</div>}
              {!loadingDetail && executionLogs.length === 0 && <div className="text-sm text-slate-500">暂无执行日志</div>}
              {!loadingDetail && executionLogs.map((log) => (
                <div key={log.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()} · {log.type}</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1">{log.action}</div>
                  <div className="text-sm text-slate-600 mt-1">{log.detail || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendJobsView;
