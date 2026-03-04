import React, { useEffect, useState } from 'react';
import { listTasks } from '../services/tasksApi';
import { AITaskLog } from '../types';

const BackendJobsView: React.FC = () => {
  const [items, setItems] = useState<AITaskLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listTasks());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
                <td className="px-4 py-3 font-mono text-xs">{job.taskId}</td>
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
    </div>
  );
};

export default BackendJobsView;
