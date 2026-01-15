import React from 'react';
import { Bell, Search, UserCircle, School } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <School size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">UniArchive AI 高校智能档案系统</h1>
          <p className="text-xs text-slate-500 font-medium">智能档案管理平台</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="全局搜索..." 
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-slate-500 hover:text-indigo-600 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-800">系统管理员</p>
              <p className="text-xs text-slate-500">档案馆</p>
            </div>
            <UserCircle className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" size={32} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;