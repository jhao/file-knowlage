import React, { useEffect, useRef, useState } from 'react';
import { deleteTask, listTaskExecutionLogs, listTasks } from '../services/tasksApi';
import { AITaskExecutionLog, AITaskLog } from '../types';

interface BackendJobsViewProps {
  focusTaskId?: string | null;
}

const primaryBtn = 'bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60';
const subtleBtn = 'text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium';

const formatExecutionLogDetail = (log: AITaskExecutionLog): React.ReactNode => {
  if (!log.detail) return '-';

  try {
    const parsed = JSON.parse(log.detail);
    const requestPayload = parsed?.requestPayload ? JSON.stringify(parsed.requestPayload, null, 2) : null;
    const responseContent = parsed?.responseContent ? JSON.stringify(parsed.responseContent, null, 2) : null;
    const responseBody = parsed?.responseBody ? JSON.stringify(parsed.responseBody, null, 2) : null;

    return (
      <div className="space-y-2 text-xs">
        {parsed.endpoint && <div><span className="font-semibold text-slate-700">API:</span> {parsed.endpoint}</div>}
        {parsed.model && <div><span className="font-semibold text-slate-700">Model:</span> {parsed.model}</div>}
        {parsed.curl && (
          <div>
            <div className="font-semibold text-slate-700 mb-1">cURL</div>
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">{parsed.curl}</pre>
          </div>
        )}
        {requestPayload && (
          <div>
            <div className="font-semibold text-slate-700 mb-1">请求参数</div>
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">{requestPayload}</pre>
          </div>
        )}
        {responseContent && (
          <div>
            <div className="font-semibold text-slate-700 mb-1">响应结果（解析后）</div>
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">{responseContent}</pre>
          </div>
        )}
        {!responseContent && responseBody && (
          <div>
            <div className="font-semibold text-slate-700 mb-1">响应结果（原始）</div>
            <pre className="bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">{responseBody}</pre>
          </div>
        )}
        {parsed.error && <div><span className="font-semibold text-rose-700">错误:</span> {String(parsed.error)}</div>}
      </div>
    );
  } catch {
    return <span>{log.detail}</span>;
  }
};


const BackendJobsView: React.FC<BackendJobsViewProps> = ({ focusTaskId }) => {
  const [items, setItems] = useState<AITaskLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<AITaskExecutionLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const openedByFocusRef = useRef<string | null>(null);

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

  const handleDeleteJob = async (taskId: string) => {
    if (!window.confirm(`确认删除任务 ${taskId}？删除后不会再触发 AI 调用。`)) return;
    setDeletingTaskId(taskId);
    try {
      await deleteTask(taskId);
      await load();
      if (activeTaskId === taskId) {
        setActiveTaskId(null);
        setExecutionLogs([]);
      }
    } finally {
      setDeletingTaskId(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!focusTaskId) return;
    if (openedByFocusRef.current === focusTaskId) return;
    openedByFocusRef.current = focusTaskId;
    openJobDetail(focusTaskId);
  }, [focusTaskId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">后台job管理</h2>
          <p className="text-slate-500 mt-1">查看 AI 解析队列进度、调用日志并支持删除任务。</p>
        </div>
        <button className={primaryBtn} onClick={load} disabled={loading}>{loading ? '刷新中...' : '刷新'}</button>
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
              <th className="px-4 py-3 text-left">操作</th>
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
                <td className="px-4 py-3">
                  <button className={subtleBtn} onClick={() => handleDeleteJob(job.taskId)} disabled={deletingTaskId === job.taskId}>
                    {deletingTaskId === job.taskId ? '删除中...' : '删除任务'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">暂无后台任务</td></tr>
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
                  <div className="text-sm text-slate-600 mt-1">{formatExecutionLogDetail(log)}</div>
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
