import React, { useState } from 'react';
import { School } from 'lucide-react';

interface LoginViewProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onSubmit, isSubmitting, errorMessage }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <School size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">UniArchive AI 登录</h2>
            <p className="text-xs text-slate-500">默认管理员：admin / admin123</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入用户名"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入密码"
          />
        </div>

        {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
};

export default LoginView;
