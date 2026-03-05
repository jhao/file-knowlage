import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Edit, UserPlus, Trash2 } from 'lucide-react';
import { createUser, deleteUser, listUsers, updateUser } from '../services/userApi';
import { sha256Hex } from '../services/crypto';

const btn = 'px-3 py-1.5 rounded-lg text-sm font-medium';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', displayName: '', role: UserRole.USER, department: '', password: '', isActive: true });

  const loadUsers = async () => {
    try {
      setUsers(await listUsers());
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '用户加载失败');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', displayName: '', role: UserRole.USER, department: '', password: '', isActive: true });
    setShowCreate(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ username: '', displayName: user.name, role: user.role, department: user.department, password: '', isActive: true });
    setShowCreate(true);
  };

  const submit = async () => {
    if (!form.displayName || !form.department || (!editing && (!form.username || !form.password))) {
      setErrorMessage('请填写完整信息');
      return;
    }
    setSaving(true);
    try {
      const passwordDigest = form.password ? await sha256Hex(form.password) : undefined;
      if (editing) {
        await updateUser(editing.id, {
          displayName: form.displayName,
          department: form.department,
          role: form.role,
          isActive: form.isActive,
          passwordDigest,
        });
      } else {
        await createUser({
          username: form.username,
          displayName: form.displayName,
          department: form.department,
          role: form.role,
          passwordDigest,
          isActive: true,
        });
      }
      setShowCreate(false);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user: User) => {
    if (!window.confirm(`确认删除用户 ${user.name}？`)) return;
    try {
      await deleteUser(user.id);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">人员权限管理</h2>
          <p className="text-slate-500">配置用户角色、操作权限及审批流程。</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2" onClick={openCreate}>
          <UserPlus size={16} /> 新增用户
        </button>
      </div>

      {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr><th className="px-6 py-4">用户</th><th className="px-6 py-4">角色</th><th className="px-6 py-4">部门</th><th className="px-6 py-4">权限配置</th><th className="px-6 py-4">审批流</th><th className="px-6 py-4 text-right">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span></td>
                <td className="px-6 py-4">{user.department}</td>
                <td className="px-6 py-4"><div className="flex gap-2"><span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canImport ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>入</span><span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canExport ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>出</span><span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canModify ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>改</span><span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canDelete ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>删</span></div></td>
                <td className="px-6 py-4">{user.permissions.requiresApproval ? <span className="flex items-center gap-1 text-amber-600 text-xs"><Shield size={14} /> 敏感操作需审批</span> : <span className="text-slate-400 text-xs">直接执行</span>}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors" onClick={() => openEdit(user)}><Edit size={16} /></button>
                  <button className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors" onClick={() => removeUser(user)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-lg font-semibold">{editing ? '编辑用户' : '新增用户'}</h3>
            {!editing && <input className="w-full border rounded px-3 py-2" placeholder="用户名" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />}
            <input className="w-full border rounded px-3 py-2" placeholder="姓名" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <input className="w-full border rounded px-3 py-2" placeholder="部门" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <select className="w-full border rounded px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value={UserRole.USER}>普通用户</option>
              <option value={UserRole.ADMIN}>管理员</option>
            </select>
            <input type="password" className="w-full border rounded px-3 py-2" placeholder={editing ? '新密码（不填则不修改）' : '登录密码'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {editing && <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> 启用账号</label>}
            <div className="flex justify-end gap-2 pt-2">
              <button className={`${btn} bg-slate-100`} onClick={() => setShowCreate(false)}>取消</button>
              <button className={`${btn} bg-indigo-600 text-white`} onClick={submit} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
