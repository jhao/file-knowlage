import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Check, X, Edit, UserPlus } from 'lucide-react';

const MOCK_USERS: User[] = [
    {
        id: 'u1', name: 'Admin User', role: UserRole.ADMIN, department: '档案馆',
        permissions: { canView: true, canImport: true, canExport: true, canModify: true, canDelete: true, requiresApproval: false }
    },
    {
        id: 'u2', name: 'Staff A', role: UserRole.USER, department: '教务处',
        permissions: { canView: true, canImport: true, canExport: false, canModify: false, canDelete: false, requiresApproval: true }
    },
    {
        id: 'u3', name: 'Researcher B', role: UserRole.USER, department: '历史系',
        permissions: { canView: true, canImport: false, canExport: true, canModify: false, canDelete: false, requiresApproval: true }
    }
];

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>(MOCK_USERS);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">人员权限管理</h2>
                    <p className="text-slate-500">配置用户角色、操作权限及审批流程。</p>
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                    <UserPlus size={16} /> 新增用户
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">用户</th>
                            <th className="px-6 py-4">角色</th>
                            <th className="px-6 py-4">部门</th>
                            <th className="px-6 py-4">权限配置</th>
                            <th className="px-6 py-4">审批流</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{user.department}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canImport ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`} title="导入">入</span>
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canExport ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`} title="导出">出</span>
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canModify ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`} title="修改">改</span>
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${user.permissions.canDelete ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`} title="删除">删</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.permissions.requiresApproval ? (
                                        <span className="flex items-center gap-1 text-amber-600 text-xs">
                                            <Shield size={14} /> 敏感操作需审批
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 text-xs">直接执行</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors">
                                        <Edit size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;