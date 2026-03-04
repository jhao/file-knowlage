import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Database, CheckCircle, Clock } from 'lucide-react';

interface DashboardData {
  metrics: {
    total: number;
    processing: number;
    reviewNeeded: number;
    approved: number;
  };
  charts: {
    byCategory: Array<{ name: string; value: number }>;
    byMonth: Array<{ name: string; docs: number }>;
  };
}

interface DashboardProps {
  data: DashboardData | null;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const total = data?.metrics.total ?? 0;
  const pending = data?.metrics.reviewNeeded ?? 0;
  const processing = data?.metrics.processing ?? 0;
  const archived = data?.metrics.approved ?? 0;
  const dataByType = data?.charts.byCategory ?? [];
  const dataByMonth = data?.charts.byMonth ?? [];

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        <p className="text-xs text-slate-400 mt-2">{sub}</p>
      </div>
      <div className={`p-3 rounded-lg ${color} text-white`}>
        <Icon size={24} />
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">档案概览</h2>
          <p className="text-slate-500 mt-1">数据直接来自数据库统计。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="馆藏总量" value={total} sub="数据库实时统计" icon={Database} color="bg-indigo-600" />
        <StatCard title="AI完成解析" value={pending} sub="需要管理员确认" icon={Clock} color="bg-amber-500" />
        <StatCard title="AI 处理中" value={processing} sub="后台任务进行中" icon={FileText} color="bg-blue-500" />
        <StatCard title="已归档" value={archived} sub="已成功索引入库" icon={CheckCircle} color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">数字化趋势</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="docs" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">档案构成</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataByType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                  {dataByType.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-bold text-slate-800">{total}</p>
              <p className="text-xs text-slate-500">文档</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
