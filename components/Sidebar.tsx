import React from 'react';
import { LayoutDashboard, UploadCloud, FileCheck, Library, Settings, History, Users, FileStack } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  reviewCount: number;
  currentUserRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, reviewCount, currentUserRole }) => {
  const menuItems = [
    { id: 'dashboard', label: '概览', icon: LayoutDashboard },
    { id: 'my-uploads', label: '我上传的文件', icon: FileStack },
    { id: 'upload', label: '多源数据导入', icon: UploadCloud },
    { id: 'verification', label: 'AI 智能校验', icon: FileCheck, badge: reviewCount },
    { id: 'repository', label: '数字档案库', icon: Library },
    // Only admins see User Management
    ...(currentUserRole === UserRole.ADMIN ? [{ id: 'users', label: '人员权限管理', icon: Users }] : []),
    { id: 'logs', label: '系统日志', icon: History },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-[calc(100vh-64px)]">
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">主菜单</p>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">加密存储空间</p>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
            <div className="bg-emerald-500 h-full w-[75%] rounded-full"></div>
          </div>
          <p className="text-xs font-mono text-white">1.2TB / 1.5TB</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;