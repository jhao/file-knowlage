import React, { useState } from 'react';
import { Settings, Tag, Save, Plus, Trash2, Edit2, CheckSquare } from 'lucide-react';

interface EntityConfig {
    id: string;
    key: string; // internal key (e.g. 'Person')
    displayName: string; // Chinese display name
    description: string;
    color: string;
    enabled: boolean;
}

const DEFAULT_ENTITIES: EntityConfig[] = [
    { id: '1', key: 'Person', displayName: '关键人物', description: '档案涉及的作者、当事人、领导等', color: 'indigo', enabled: true },
    { id: '2', key: 'Organization', displayName: '机构/部门', description: '校内部门、外部单位、教育部等', color: 'blue', enabled: true },
    { id: '3', key: 'Location', displayName: '地点/区域', description: '校区、楼宇、城市、历史遗迹', color: 'emerald', enabled: true },
    { id: '4', key: 'Event', displayName: '重大事件', description: '会议、典礼、运动会、获奖等', color: 'amber', enabled: true },
    { id: '5', key: 'Concept', displayName: '概念/术语', description: '学科专业、项目名称、专有名词', color: 'slate', enabled: true },
];

const SystemSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('entities');
    const [entities, setEntities] = useState<EntityConfig[]>(DEFAULT_ENTITIES);

    // Mock CRUD
    const toggleEnable = (id: string) => {
        setEntities(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
    };

    const deleteEntity = (id: string) => {
        if(confirm('确定要删除此实体分类吗？这将影响AI识别结果。')) {
            setEntities(prev => prev.filter(e => e.id !== id));
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
                <p className="text-slate-500">管理系统参数、AI模型配置及实体分类规则。</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Settings Sidebar */}
                <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 shadow-sm h-fit overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase">设置菜单</span>
                    </div>
                    <nav className="p-2 space-y-1">
                        <button 
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings size={18} /> 常规设置
                        </button>
                        <button 
                            onClick={() => setActiveTab('entities')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'entities' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Tag size={18} /> 实体分类管理
                        </button>
                        <button 
                            onClick={() => setActiveTab('ai')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <CheckSquare size={18} /> 审批流配置
                        </button>
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    {activeTab === 'entities' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">实体分类配置 (Entity Ontology)</h3>
                                    <p className="text-sm text-slate-500 mt-1">定义 AI 在“知识提取”阶段识别的实体类型及其对应中文名称。</p>
                                </div>
                                <button className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus size={16} /> 新增分类
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">系统标识 (Key)</th>
                                            <th className="px-6 py-4">显示名称 (CN)</th>
                                            <th className="px-6 py-4">描述</th>
                                            <th className="px-6 py-4">颜色标记</th>
                                            <th className="px-6 py-4">状态</th>
                                            <th className="px-6 py-4 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {entities.map((ent) => (
                                            <tr key={ent.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{ent.key}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{ent.displayName}</td>
                                                <td className="px-6 py-4">{ent.description}</td>
                                                <td className="px-6 py-4">
                                                    <div className={`w-4 h-4 rounded-full bg-${ent.color}-500 border border-slate-200 shadow-sm`}></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => toggleEnable(ent.id)}
                                                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${ent.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                                                    >
                                                        {ent.enabled ? '启用' : '禁用'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Edit2 size={16}/></button>
                                                    <button onClick={() => deleteEntity(ent.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    <Save size={14} /> 保存更改后，新的 AI 识别任务将应用此配置。历史数据不会被自动修改。
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400 h-64">
                            <Settings size={48} className="mb-4 opacity-50" />
                            <p>常规设置面板 (Demo)</p>
                        </div>
                    )}
                     {activeTab === 'ai' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400 h-64">
                            <CheckSquare size={48} className="mb-4 opacity-50" />
                            <p>审批流配置面板 (Demo)</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;