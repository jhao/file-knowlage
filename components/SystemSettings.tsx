import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Plus, Save, Settings, Tag, Trash2 } from 'lucide-react';
import { listSettings, testLlmSetting, updateSetting } from '../services/settingsApi';

const DEFAULT_LLM_ENDPOINTS = {
  kimi: 'https://api.moonshot.cn/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  local: 'http://127.0.0.1:11434/v1',
};

const DEFAULT_ENTITY_TYPES = [
  { key: 'Person', label: '人物' },
  { key: 'Location', label: '地点' },
  { key: 'Organization', label: '组织' },
  { key: 'Event', label: '事件' },
  { key: 'Concept', label: '概念' },
];

const DEFAULT_ARCHIVE_TREE = [
  { name: '学籍档案', children: ['本科生学籍', '研究生学籍'] },
  { name: '人事档案', children: ['教师人事', '行政人员人事'] },
  { name: '科研档案', children: ['项目档案', '成果档案'] },
  { name: '行政档案', children: ['制度文件', '会议纪要'] },
];

type LlmProvider = 'kimi' | 'qwen' | 'glm' | 'deepseek' | 'openai' | 'local';

const DEFAULT_LLM_MODELS: Record<LlmProvider, string> = {
  kimi: 'moonshot-v1-8k',
  qwen: 'qwen-plus',
  glm: 'glm-4-flash',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  local: 'llama3.1:8b',
};

type EntityTypeItem = { key: string; label: string };
type ArchiveCategoryTree = { name: string; children: string[] };

const parseJsonSetting = <T,>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [archiveTree, setArchiveTree] = useState<ArchiveCategoryTree[]>(DEFAULT_ARCHIVE_TREE);
  const [entityTypeItems, setEntityTypeItems] = useState<EntityTypeItem[]>(DEFAULT_ENTITY_TYPES);

  const [llmProvider, setLlmProvider] = useState<LlmProvider>('kimi');
  const [kimiUrl, setKimiUrl] = useState(DEFAULT_LLM_ENDPOINTS.kimi);
  const [qwenUrl, setQwenUrl] = useState(DEFAULT_LLM_ENDPOINTS.qwen);
  const [glmUrl, setGlmUrl] = useState(DEFAULT_LLM_ENDPOINTS.glm);
  const [deepseekUrl, setDeepseekUrl] = useState(DEFAULT_LLM_ENDPOINTS.deepseek);
  const [openaiUrl, setOpenaiUrl] = useState(DEFAULT_LLM_ENDPOINTS.openai);
  const [localUrl, setLocalUrl] = useState(DEFAULT_LLM_ENDPOINTS.local);
  const [kimiApiKey, setKimiApiKey] = useState('');
  const [qwenApiKey, setQwenApiKey] = useState('');
  const [glmApiKey, setGlmApiKey] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const [kimiModel, setKimiModel] = useState(DEFAULT_LLM_MODELS.kimi);
  const [qwenModel, setQwenModel] = useState(DEFAULT_LLM_MODELS.qwen);
  const [glmModel, setGlmModel] = useState(DEFAULT_LLM_MODELS.glm);
  const [deepseekModel, setDeepseekModel] = useState(DEFAULT_LLM_MODELS.deepseek);
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_LLM_MODELS.openai);
  const [localModel, setLocalModel] = useState(DEFAULT_LLM_MODELS.local);
  const [testMessage, setTestMessage] = useState('');
  const [testDetail, setTestDetail] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    listSettings()
      .then((items) => {
        const map = new Map(items.map((item) => [item.key, item.value]));
        const entityJson = parseJsonSetting<EntityTypeItem[]>(map.get('entity_types_json'), DEFAULT_ENTITY_TYPES);
        setEntityTypeItems(entityJson.length > 0 ? entityJson : DEFAULT_ENTITY_TYPES);
        setArchiveTree(parseJsonSetting<ArchiveCategoryTree[]>(map.get('archive_category_tree'), DEFAULT_ARCHIVE_TREE));
        setLlmProvider((map.get('llm.provider') as LlmProvider) || 'kimi');
        setKimiUrl(map.get('llm.kimi_url') || DEFAULT_LLM_ENDPOINTS.kimi);
        setQwenUrl(map.get('llm.qwen_url') || DEFAULT_LLM_ENDPOINTS.qwen);
        setGlmUrl(map.get('llm.glm_url') || DEFAULT_LLM_ENDPOINTS.glm);
        setDeepseekUrl(map.get('llm.deepseek_url') || DEFAULT_LLM_ENDPOINTS.deepseek);
        setOpenaiUrl(map.get('llm.openai_url') || DEFAULT_LLM_ENDPOINTS.openai);
        setLocalUrl(map.get('llm.local_url') || DEFAULT_LLM_ENDPOINTS.local);
        setKimiApiKey(map.get('llm.kimi_api_key') || '');
        setQwenApiKey(map.get('llm.qwen_api_key') || '');
        setGlmApiKey(map.get('llm.glm_api_key') || '');
        setDeepseekApiKey(map.get('llm.deepseek_api_key') || '');
        setOpenaiApiKey(map.get('llm.openai_api_key') || '');
        setLocalApiKey(map.get('llm.local_api_key') || '');
        setKimiModel(map.get('llm.kimi_model') || DEFAULT_LLM_MODELS.kimi);
        setQwenModel(map.get('llm.qwen_model') || DEFAULT_LLM_MODELS.qwen);
        setGlmModel(map.get('llm.glm_model') || DEFAULT_LLM_MODELS.glm);
        setDeepseekModel(map.get('llm.deepseek_model') || DEFAULT_LLM_MODELS.deepseek);
        setOpenaiModel(map.get('llm.openai_model') || DEFAULT_LLM_MODELS.openai);
        setLocalModel(map.get('llm.local_model') || DEFAULT_LLM_MODELS.local);
      })
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : '设置加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const activeProviderUrl = useMemo(() => {
    if (llmProvider === 'qwen') return qwenUrl;
    if (llmProvider === 'glm') return glmUrl;
    if (llmProvider === 'deepseek') return deepseekUrl;
    if (llmProvider === 'openai') return openaiUrl;
    if (llmProvider === 'local') return localUrl;
    return kimiUrl;
  }, [llmProvider, kimiUrl, qwenUrl, glmUrl, deepseekUrl, openaiUrl, localUrl]);

  const activeProviderToken = useMemo(() => {
    if (llmProvider === 'qwen') return qwenApiKey;
    if (llmProvider === 'glm') return glmApiKey;
    if (llmProvider === 'deepseek') return deepseekApiKey;
    if (llmProvider === 'openai') return openaiApiKey;
    if (llmProvider === 'local') return localApiKey;
    return kimiApiKey;
  }, [llmProvider, kimiApiKey, qwenApiKey, glmApiKey, deepseekApiKey, openaiApiKey, localApiKey]);


  const activeProviderModel = useMemo(() => {
    if (llmProvider === 'qwen') return qwenModel;
    if (llmProvider === 'glm') return glmModel;
    if (llmProvider === 'deepseek') return deepseekModel;
    if (llmProvider === 'openai') return openaiModel;
    if (llmProvider === 'local') return localModel;
    return kimiModel;
  }, [llmProvider, kimiModel, qwenModel, glmModel, deepseekModel, openaiModel, localModel]);

  const saveGeneral = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      await updateSetting('archive_category_tree', JSON.stringify(archiveTree), '档案目录与子门类配置');
      alert('常规设置保存成功');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const saveEntities = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      await Promise.all([
        updateSetting('entity_types_json', JSON.stringify(entityTypeItems), '知识实体分类（JSON）'),
        updateSetting('entity_types', entityTypeItems.map((item) => item.key).join(','), '知识实体分类（兼容）'),
      ]);
      alert('实体分类已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const saveLlm = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      const providerSettings: Record<LlmProvider, { urlKey: string; urlValue: string; tokenKey: string; tokenValue: string; modelKey: string; modelValue: string; providerName: string }> = {
        kimi: { urlKey: 'llm.kimi_url', urlValue: kimiUrl, tokenKey: 'llm.kimi_api_key', tokenValue: kimiApiKey, modelKey: 'llm.kimi_model', modelValue: kimiModel, providerName: 'Kimi' },
        qwen: { urlKey: 'llm.qwen_url', urlValue: qwenUrl, tokenKey: 'llm.qwen_api_key', tokenValue: qwenApiKey, modelKey: 'llm.qwen_model', modelValue: qwenModel, providerName: '千问' },
        glm: { urlKey: 'llm.glm_url', urlValue: glmUrl, tokenKey: 'llm.glm_api_key', tokenValue: glmApiKey, modelKey: 'llm.glm_model', modelValue: glmModel, providerName: 'GLM-4.6V' },
        deepseek: { urlKey: 'llm.deepseek_url', urlValue: deepseekUrl, tokenKey: 'llm.deepseek_api_key', tokenValue: deepseekApiKey, modelKey: 'llm.deepseek_model', modelValue: deepseekModel, providerName: 'DeepSeek' },
        openai: { urlKey: 'llm.openai_url', urlValue: openaiUrl, tokenKey: 'llm.openai_api_key', tokenValue: openaiApiKey, modelKey: 'llm.openai_model', modelValue: openaiModel, providerName: 'OpenAI' },
        local: { urlKey: 'llm.local_url', urlValue: localUrl, tokenKey: 'llm.local_api_key', tokenValue: localApiKey, modelKey: 'llm.local_model', modelValue: localModel, providerName: '本地大模型' },
      };

      const selected = providerSettings[llmProvider];
      await Promise.all([
        updateSetting('llm.provider', llmProvider, '文档抽取大模型提供商'),
        updateSetting(selected.urlKey, selected.urlValue, `${selected.providerName} API 基础地址`),
        updateSetting(selected.tokenKey, selected.tokenValue, `${selected.providerName} API Token/API Key`),
        updateSetting(selected.modelKey, selected.modelValue, `${selected.providerName} 默认模型`),
      ]);
      alert('大模型接口配置已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const runLlmTest = async () => {
    setTesting(true);
    setTestMessage('');
    setTestDetail('');
    try {
      const result = await testLlmSetting({ provider: llmProvider, baseUrl: activeProviderUrl, apiKey: activeProviderToken, model: activeProviderModel });
      setTestMessage(result.message || '测试调用成功');
      const detailBlocks = [result.detail, result.request?.curl ? `请求 CURL：\n${result.request.curl}` : '', result.response ? `响应 JSON：\n${JSON.stringify(result.response, null, 2)}` : ''].filter(Boolean);
      setTestDetail(detailBlocks.join('\n\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : '测试调用失败';
      setTestMessage(message);
      setTestDetail('请检查 API 地址、密钥、模型兼容协议（OpenAI /chat/completions）。');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">系统设置</h2>
        <p className="text-slate-500">管理系统参数、AI模型配置及实体分类规则。</p>
      </div>

      {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 shadow-sm h-fit overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50"><span className="text-xs font-bold text-slate-500 uppercase">设置菜单</span></div>
          <nav className="p-2 space-y-1">
            <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> 常规设置</button>
            <button onClick={() => setActiveTab('entities')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'entities' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Tag size={18} /> 实体分类管理</button>
            <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><CheckSquare size={18} /> 大模型接口配置</button>
          </nav>
        </div>

        <div className="flex-1">
          {loading && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">加载中...</div>}

          {!loading && activeTab === 'general' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">常规设置</h3>
              <p className="text-sm text-slate-500">配置档案资源目录门类，并支持子门类。</p>
              {archiveTree.map((node, idx) => (
                <div key={`${node.name}-${idx}`} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm" value={node.name} onChange={(e) => setArchiveTree((prev) => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder="门类名称" />
                    <button onClick={() => setArchiveTree((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={node.children.join('，')} onChange={(e) => setArchiveTree((prev) => prev.map((item, i) => i === idx ? { ...item, children: e.target.value.split(/[,，]/).map((v) => v.trim()).filter(Boolean) } : item))} placeholder="子门类（逗号分隔）" />
                </div>
              ))}
              <button onClick={() => setArchiveTree((prev) => [...prev, { name: '新门类', children: [] }])} className="text-sm text-indigo-600 flex items-center gap-1"><Plus size={14} /> 新增门类</button>
              <button onClick={saveGeneral} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={14} /> 保存</button>
            </div>
          )}

          {!loading && activeTab === 'entities' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3 text-sm text-slate-600">
              <p>实体分类来自数据库配置，并可在此进行增删改查。</p>
              {entityTypeItems.map((item, idx) => (
                <div key={`${item.key}-${idx}`} className="grid grid-cols-12 gap-2">
                  <input className="col-span-4 border border-slate-300 rounded px-2 py-1" value={item.key} onChange={(e) => setEntityTypeItems((prev) => prev.map((v, i) => i === idx ? { ...v, key: e.target.value } : v))} placeholder="英文编码" />
                  <input className="col-span-7 border border-slate-300 rounded px-2 py-1" value={item.label} onChange={(e) => setEntityTypeItems((prev) => prev.map((v, i) => i === idx ? { ...v, label: e.target.value } : v))} placeholder="中文名称" />
                  <button className="col-span-1 text-red-500" onClick={() => setEntityTypeItems((prev) => prev.filter((_, i) => i !== idx))}><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setEntityTypeItems((prev) => [...prev, { key: `Type${prev.length + 1}`, label: '新分类' }])} className="text-sm text-indigo-600 flex items-center gap-1"><Plus size={14} /> 新增实体分类</button>
              <button onClick={saveEntities} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={14} /> 保存实体分类</button>
            </div>
          )}

          {!loading && activeTab === 'ai' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">文档处理大模型配置</h3>
              <label className="text-sm font-medium text-slate-700">服务商</label>
              <select className="w-full border border-slate-300 rounded-lg p-2" value={llmProvider} onChange={(e) => setLlmProvider(e.target.value as LlmProvider)}>
                <option value="kimi">Kimi</option><option value="qwen">千问</option><option value="glm">GLM-4.6V</option><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="local">本地大模型</option>
              </select>
              <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={activeProviderUrl} onChange={(e) => {
                if (llmProvider === 'qwen') setQwenUrl(e.target.value); else if (llmProvider === 'glm') setGlmUrl(e.target.value); else if (llmProvider === 'deepseek') setDeepseekUrl(e.target.value); else if (llmProvider === 'openai') setOpenaiUrl(e.target.value); else if (llmProvider === 'local') setLocalUrl(e.target.value); else setKimiUrl(e.target.value);
              }} />
              <input type="password" className="w-full border border-slate-300 rounded-lg p-2" value={activeProviderToken} onChange={(e) => {
                if (llmProvider === 'qwen') setQwenApiKey(e.target.value); else if (llmProvider === 'glm') setGlmApiKey(e.target.value); else if (llmProvider === 'deepseek') setDeepseekApiKey(e.target.value); else if (llmProvider === 'openai') setOpenaiApiKey(e.target.value); else if (llmProvider === 'local') setLocalApiKey(e.target.value); else setKimiApiKey(e.target.value);
              }} placeholder="按所选模型服务商填写密钥" />
              <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={activeProviderModel} onChange={(e) => {
                if (llmProvider === 'qwen') setQwenModel(e.target.value); else if (llmProvider === 'glm') setGlmModel(e.target.value); else if (llmProvider === 'deepseek') setDeepseekModel(e.target.value); else if (llmProvider === 'openai') setOpenaiModel(e.target.value); else if (llmProvider === 'local') setLocalModel(e.target.value); else setKimiModel(e.target.value);
              }} placeholder="模型名称（例如 gpt-4o-mini）" />

              <div className="flex gap-2">
                <button onClick={saveLlm} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"><Save size={14} /> 保存大模型配置</button>
                <button onClick={runLlmTest} disabled={testing} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">{testing ? '测试中...' : '测试调用'}</button>
              </div>
              {testMessage && <div className="text-sm rounded border border-slate-200 bg-slate-50 p-3"><div className="font-medium">测试结果：{testMessage}</div>{testDetail && <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{testDetail}</pre>}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
