import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Save, Settings, Tag } from 'lucide-react';
import { listSettings, updateSetting } from '../services/settingsApi';

const DEFAULT_LLM_ENDPOINTS = {
  kimi: 'https://api.moonshot.cn/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  openai: 'https://api.openai.com/v1',
  local: 'http://127.0.0.1:11434/v1',
};

type LlmProvider = 'kimi' | 'qwen' | 'openai' | 'local';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [entityTypes, setEntityTypes] = useState('Person,Location,Organization,Event,Concept');
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('kimi');
  const [kimiUrl, setKimiUrl] = useState(DEFAULT_LLM_ENDPOINTS.kimi);
  const [qwenUrl, setQwenUrl] = useState(DEFAULT_LLM_ENDPOINTS.qwen);
  const [openaiUrl, setOpenaiUrl] = useState(DEFAULT_LLM_ENDPOINTS.openai);
  const [localUrl, setLocalUrl] = useState(DEFAULT_LLM_ENDPOINTS.local);
  const [kimiApiKey, setKimiApiKey] = useState('');
  const [qwenApiKey, setQwenApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');

  useEffect(() => {
    listSettings()
      .then((items) => {
        const map = new Map(items.map((item) => [item.key, item.value]));
        setEntityTypes(map.get('entity_types') || entityTypes);
        setLlmProvider((map.get('llm.provider') as LlmProvider) || 'kimi');
        setKimiUrl(map.get('llm.kimi_url') || DEFAULT_LLM_ENDPOINTS.kimi);
        setQwenUrl(map.get('llm.qwen_url') || DEFAULT_LLM_ENDPOINTS.qwen);
        setOpenaiUrl(map.get('llm.openai_url') || DEFAULT_LLM_ENDPOINTS.openai);
        setLocalUrl(map.get('llm.local_url') || DEFAULT_LLM_ENDPOINTS.local);
        setKimiApiKey(map.get('llm.kimi_api_key') || '');
        setQwenApiKey(map.get('llm.qwen_api_key') || '');
        setOpenaiApiKey(map.get('llm.openai_api_key') || '');
        setLocalApiKey(map.get('llm.local_api_key') || '');
      })
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : '设置加载失败'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProviderUrl = useMemo(() => {
    if (llmProvider === 'qwen') return qwenUrl;
    if (llmProvider === 'openai') return openaiUrl;
    if (llmProvider === 'local') return localUrl;
    return kimiUrl;
  }, [llmProvider, kimiUrl, qwenUrl, openaiUrl, localUrl]);

  const activeProviderToken = useMemo(() => {
    if (llmProvider === 'qwen') return qwenApiKey;
    if (llmProvider === 'openai') return openaiApiKey;
    if (llmProvider === 'local') return localApiKey;
    return kimiApiKey;
  }, [llmProvider, kimiApiKey, qwenApiKey, openaiApiKey, localApiKey]);

  const saveGeneral = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      await updateSetting('entity_types', entityTypes, '知识实体分类');
      alert('保存成功');
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
      const providerSettings: Record<LlmProvider, { urlKey: string; urlValue: string; tokenKey: string; tokenValue: string; providerName: string }> = {
        kimi: {
          urlKey: 'llm.kimi_url',
          urlValue: kimiUrl,
          tokenKey: 'llm.kimi_api_key',
          tokenValue: kimiApiKey,
          providerName: 'Kimi',
        },
        qwen: {
          urlKey: 'llm.qwen_url',
          urlValue: qwenUrl,
          tokenKey: 'llm.qwen_api_key',
          tokenValue: qwenApiKey,
          providerName: '千问',
        },
        openai: {
          urlKey: 'llm.openai_url',
          urlValue: openaiUrl,
          tokenKey: 'llm.openai_api_key',
          tokenValue: openaiApiKey,
          providerName: 'OpenAI',
        },
        local: {
          urlKey: 'llm.local_url',
          urlValue: localUrl,
          tokenKey: 'llm.local_api_key',
          tokenValue: localApiKey,
          providerName: '本地大模型',
        },
      };

      const selected = providerSettings[llmProvider];
      await Promise.all([
        updateSetting('llm.provider', llmProvider, '文档抽取大模型提供商'),
        updateSetting(selected.urlKey, selected.urlValue, `${selected.providerName} API 基础地址`),
        updateSetting(selected.tokenKey, selected.tokenValue, `${selected.providerName} API Token/API Key`),
      ]);
      alert('大模型接口配置已保存');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
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
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-bold text-slate-500 uppercase">设置菜单</span>
          </div>
          <nav className="p-2 space-y-1">
            <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> 常规设置</button>
            <button onClick={() => setActiveTab('entities')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'entities' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Tag size={18} /> 实体分类管理</button>
            <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><CheckSquare size={18} /> 大模型接口配置</button>
          </nav>
        </div>

        <div className="flex-1">
          {loading && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">加载中...</div>}

          {!loading && activeTab === 'general' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">常规设置</h3>
              <p className="text-sm text-slate-500">当前实体分类由逗号分隔，影响文档内容提取时的实体识别。</p>
              <textarea className="w-full border border-slate-300 rounded-lg p-3 min-h-24" value={entityTypes} onChange={(e) => setEntityTypes(e.target.value)} />
              <button onClick={saveGeneral} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> 保存
              </button>
            </div>
          )}

          {!loading && activeTab === 'entities' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-2 text-sm text-slate-600">
              <p>实体分类数据已统一从后端配置读取：<code className="bg-slate-100 px-1 rounded">entity_types</code>。</p>
              <p>请在“常规设置”里编辑该配置。</p>
            </div>
          )}

          {!loading && activeTab === 'ai' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">文档处理大模型配置</h3>
              <p className="text-sm text-slate-500">用于文档内容提取/处理。默认支持 Kimi、千问、OpenAI、本地大模型（可覆盖默认 URL）。</p>

              <label className="text-sm font-medium text-slate-700">服务商</label>
              <select className="w-full border border-slate-300 rounded-lg p-2" value={llmProvider} onChange={(e) => setLlmProvider(e.target.value as LlmProvider)}>
                <option value="kimi">Kimi</option>
                <option value="qwen">千问</option>
                <option value="openai">OpenAI</option>
                <option value="local">本地大模型</option>
              </select>

              {llmProvider === 'kimi' && (
                <div>
                  <label className="text-xs text-slate-600">Kimi URL</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={kimiUrl} onChange={(e) => setKimiUrl(e.target.value)} />
                </div>
              )}

              {llmProvider === 'qwen' && (
                <div>
                  <label className="text-xs text-slate-600">千问 URL</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={qwenUrl} onChange={(e) => setQwenUrl(e.target.value)} />
                </div>
              )}

              {llmProvider === 'openai' && (
                <div>
                  <label className="text-xs text-slate-600">OpenAI URL</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={openaiUrl} onChange={(e) => setOpenaiUrl(e.target.value)} />
                </div>
              )}

              {llmProvider === 'local' && (
                <div>
                  <label className="text-xs text-slate-600">本地模型 URL</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2 text-sm" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)} />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">API Key</label>
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded-lg p-2"
                  value={activeProviderToken}
                  onChange={(e) => {
                    if (llmProvider === 'qwen') setQwenApiKey(e.target.value);
                    else if (llmProvider === 'openai') setOpenaiApiKey(e.target.value);
                    else if (llmProvider === 'local') setLocalApiKey(e.target.value);
                    else setKimiApiKey(e.target.value);
                  }}
                  placeholder="按所选模型服务商填写密钥"
                />
              </div>

              <div className="text-xs text-slate-500">当前选中模型请求基地址：{activeProviderUrl}</div>

              <button onClick={saveLlm} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> 保存大模型配置
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
