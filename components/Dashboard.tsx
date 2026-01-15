import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArchiveDocument, ArchiveStatus } from '../types';
import { FileText, Database, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
  documents: ArchiveDocument[];
}

const Dashboard: React.FC<DashboardProps> = ({ documents }) => {
  // Compute Stats
  const total = documents.length;
  const archived = documents.filter(d => d.status === ArchiveStatus.APPROVED).length;
  const pending = documents.filter(d => d.status === ArchiveStatus.REVIEW_NEEDED).length;
  const processing = documents.filter(d => d.status === ArchiveStatus.PROCESSING).length;

  // Mock Data for Charts
  const dataByType = [
    { name: '学籍档案', value: 400 },
    { name: '人事档案', value: 300 },
    { name: '科研档案', value: 300 },
    { name: '行政档案', value: 200 },
  ];
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  const dataByMonth = [
    { name: '1月', docs: 40 },
    { name: '2月', docs: 30 },
    { name: '3月', docs: 20 },
    { name: '4月', docs: 27 },
    { name: '5月', docs: 18 },
    { name: '6月', docs: 23 },
    { name: '7月', docs: 34 },
  ];

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
          <p className="text-slate-500 mt-1">实时系统状态与处理指标。</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          最后更新: 今天, 10:42 AM
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="馆藏总量" 
          value={total + 1240} 
          sub="较上月增长 +12%" 
          icon={Database} 
          color="bg-indigo-600"
        />
        <StatCard 
          title="待人工校验" 
          value={pending} 
          sub="需要管理员确认" 
          icon={Clock} 
          color="bg-amber-500"
        />
        <StatCard 
          title="AI 处理中" 
          value={processing} 
          sub="后台任务进行中" 
          icon={FileText} 
          color="bg-blue-500"
        />
        <StatCard 
          title="今日归档" 
          value={archived + 24} 
          sub="已成功索引入库" 
          icon={CheckCircle} 
          color="bg-emerald-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">数字化趋势</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
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
                <Pie
                  data={dataByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-bold text-slate-800">1.2K</p>
              <p className="text-xs text-slate-500">文档</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
             {dataByType.map((entry, index) => (
               <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-600">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                 <span>{entry.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;