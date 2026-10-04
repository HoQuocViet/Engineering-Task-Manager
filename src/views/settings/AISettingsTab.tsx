import React, { useState } from 'react';
import { useApp, DEFAULT_AI_SETTINGS } from '../../context/AppContext';
import { api } from '../../lib/api';
import { AISettings, AIQuickPrompt, DEFAULT_QUICK_PROMPTS } from '../../types';
import {
  Sparkles,
  Key,
  Bot,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Save,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Layers,
  Zap,
  FileText,
  Calendar,
  HelpCircle,
  Target,
  TrendingUp,
} from 'lucide-react';

export const AVAILABLE_QUICK_ICONS = [
  { id: 'alert-triangle', label: 'Alert / Overdue', icon: AlertTriangle },
  { id: 'layers', label: 'Packages / EPC', icon: Layers },
  { id: 'zap', label: 'Urgent / Priority', icon: Zap },
  { id: 'file-text', label: 'Summary / Report', icon: FileText },
  { id: 'check-circle', label: 'Verification / QC', icon: CheckCircle2 },
  { id: 'calendar', label: 'Schedule / Timeline', icon: Calendar },
  { id: 'shield-check', label: 'Safety / Standards', icon: ShieldCheck },
  { id: 'help-circle', label: 'Guidance / FAQ', icon: HelpCircle },
  { id: 'target', label: 'Target / Milestone', icon: Target },
  { id: 'trending-up', label: 'Analytics / Metrics', icon: TrendingUp },
  { id: 'sparkles', label: 'AI Insight / Custom', icon: Sparkles },
];

export const AVAILABLE_QUICK_COLORS = [
  { id: 'blue', label: 'Blue', pillBg: 'bg-blue-950/40 text-blue-300 border-blue-500/50', chipBg: 'bg-blue-500 text-white' },
  { id: 'rose', label: 'Rose / Red', pillBg: 'bg-rose-950/40 text-rose-300 border-rose-500/50', chipBg: 'bg-rose-500 text-white' },
  { id: 'amber', label: 'Amber / Gold', pillBg: 'bg-amber-950/40 text-amber-300 border-amber-500/50', chipBg: 'bg-amber-500 text-white' },
  { id: 'emerald', label: 'Emerald / Green', pillBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50', chipBg: 'bg-emerald-500 text-white' },
  { id: 'purple', label: 'Purple / Violet', pillBg: 'bg-purple-950/40 text-purple-300 border-purple-500/50', chipBg: 'bg-purple-500 text-white' },
  { id: 'cyan', label: 'Cyan / Teal', pillBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/50', chipBg: 'bg-cyan-500 text-white' },
];

export const AISettingsTab: React.FC = () => {
  const { aiSettings, setAiSettings, showToast } = useApp();

  // Active default provider for chat
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'claude'>(
    aiSettings.provider || (aiSettings.apiKey?.startsWith('sk-ant-') ? 'claude' : 'gemini')
  );

  // Independent Gemini State
  const [geminiApiKey, setGeminiApiKey] = useState(
    aiSettings.geminiApiKey || (!aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey || '' : '')
  );
  const [geminiModel, setGeminiModel] = useState(aiSettings.geminiModel || 'gemini-3.8-flash');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'connected' | 'error' | 'untested'>(
    aiSettings.geminiConnectionStatus || (aiSettings.provider === 'gemini' ? aiSettings.connectionStatus || 'untested' : 'untested')
  );
  const [geminiLastTested, setGeminiLastTested] = useState<string | undefined>(aiSettings.geminiLastTestedAt || aiSettings.lastTestedAt);
  const [geminiTestMsg, setGeminiTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Independent Claude State
  const [claudeApiKey, setClaudeApiKey] = useState(
    aiSettings.claudeApiKey || (aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey || '' : '')
  );
  const [claudeModel, setClaudeModel] = useState(aiSettings.claudeModel || 'claude-3-7-sonnet-latest');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [testingClaude, setTestingClaude] = useState(false);
  const [claudeStatus, setClaudeStatus] = useState<'connected' | 'error' | 'untested'>(
    aiSettings.claudeConnectionStatus || (aiSettings.provider === 'claude' ? aiSettings.connectionStatus || 'untested' : 'untested')
  );
  const [claudeLastTested, setClaudeLastTested] = useState<string | undefined>(aiSettings.claudeLastTestedAt);
  const [claudeTestMsg, setClaudeTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  // System Instructions
  const [customInstructions, setCustomInstructions] = useState(aiSettings.customInstructions || '');

  // AI Quick Prompts State
  const [quickPromptsList, setQuickPromptsList] = useState<AIQuickPrompt[]>(() => {
    return Array.isArray(aiSettings.quickPrompts) && aiSettings.quickPrompts.length > 0
      ? aiSettings.quickPrompts
      : DEFAULT_QUICK_PROMPTS;
  });
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptLabel, setPromptLabel] = useState('');
  const [promptText, setPromptText] = useState('');
  const [promptIcon, setPromptIcon] = useState('sparkles');
  const [promptColor, setPromptColor] = useState('blue');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);

  // Clear Gemini Key ONLY
  const handleClearGeminiKey = () => {
    setGeminiApiKey('');
    setGeminiStatus('untested');
    setGeminiTestMsg(null);
    showToast('Cleared Google Gemini API Key.');
  };

  // Clear Claude Key ONLY
  const handleClearClaudeKey = () => {
    setClaudeApiKey('');
    setClaudeStatus('untested');
    setClaudeTestMsg(null);
    showToast('Cleared Anthropic Claude API Key.');
  };

  // Test Gemini
  const handleTestGemini = async () => {
    if (!geminiApiKey.trim()) {
      showToast('Please enter a Google Gemini API Key first.');
      return;
    }
    setTestingGemini(true);
    setGeminiTestMsg(null);
    try {
      const res = await api.testAiConnection({
        customApiKey: geminiApiKey.trim(),
        provider: 'gemini',
        model: geminiModel,
      });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
      if (res.success) {
        setGeminiStatus('connected');
        setGeminiLastTested(nowStr);
        setGeminiTestMsg({ success: true, message: res.message || 'Connected successfully to Gemini!' });
        showToast('✅ Google Gemini API Key connected successfully!');
      } else {
        setGeminiStatus('error');
        setGeminiTestMsg({ success: false, message: res.message || 'Verification failed.' });
        showToast('❌ Gemini connection failed: ' + res.message);
      }
    } catch (err: any) {
      setGeminiStatus('error');
      setGeminiTestMsg({ success: false, message: err.message || 'Network error.' });
      showToast('❌ Error: ' + err.message);
    } finally {
      setTestingGemini(false);
    }
  };

  // Test Claude
  const handleTestClaude = async () => {
    if (!claudeApiKey.trim()) {
      showToast('Please enter an Anthropic Claude API Key first.');
      return;
    }
    setTestingClaude(true);
    setClaudeTestMsg(null);
    try {
      const res = await api.testAiConnection({
        customApiKey: claudeApiKey.trim(),
        provider: 'claude',
        model: claudeModel,
      });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();
      if (res.success) {
        setClaudeStatus('connected');
        setClaudeLastTested(nowStr);
        setClaudeTestMsg({ success: true, message: res.message || 'Connected successfully to Claude!' });
        showToast('✅ Anthropic Claude API Key connected successfully!');
      } else {
        setClaudeStatus('error');
        setClaudeTestMsg({ success: false, message: res.message || 'Verification failed.' });
        showToast('❌ Claude connection failed: ' + res.message);
      }
    } catch (err: any) {
      setClaudeStatus('error');
      setClaudeTestMsg({ success: false, message: err.message || 'Network error.' });
      showToast('❌ Error: ' + err.message);
    } finally {
      setTestingClaude(false);
    }
  };

  // Save All AI Settings
  const handleSaveAllAiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const activeKey = activeProvider === 'claude' ? claudeApiKey.trim() : geminiApiKey.trim();
    const activeM = activeProvider === 'claude' ? claudeModel : geminiModel;
    const activeStat = activeProvider === 'claude' ? claudeStatus : geminiStatus;
    const activeLast = activeProvider === 'claude' ? claudeLastTested : geminiLastTested;

    const updated: AISettings = {
      provider: activeProvider,
      apiKey: activeKey,
      model: activeM,
      geminiApiKey: geminiApiKey.trim(),
      claudeApiKey: claudeApiKey.trim(),
      geminiModel,
      claudeModel,
      customInstructions: customInstructions.trim(),
      temperature: 0.3,
      connectionStatus: activeStat,
      lastTestedAt: activeLast,
      geminiConnectionStatus: geminiStatus,
      geminiLastTestedAt: geminiLastTested,
      claudeConnectionStatus: claudeStatus,
      claudeLastTestedAt: claudeLastTested,
      quickPrompts: quickPromptsList,
    };

    setAiSettings(updated);
    showToast(`✅ Saved AI configuration! Default provider: ${activeProvider === 'claude' ? 'Claude' : 'Gemini'}`);
  };

  // Quick Action Handlers
  const handleStartAddPrompt = () => {
    setEditingPromptId(null);
    setPromptLabel('');
    setPromptText('');
    setPromptIcon('sparkles');
    setPromptColor('blue');
    setIsAddingPrompt(true);
  };

  const handleStartEditPrompt = (p: AIQuickPrompt) => {
    setEditingPromptId(p.id);
    setPromptLabel(p.label);
    setPromptText(p.prompt);
    setPromptIcon(p.icon || 'sparkles');
    setPromptColor(p.color || 'blue');
    setIsAddingPrompt(true);
  };

  const handleCancelPromptForm = () => {
    setEditingPromptId(null);
    setPromptLabel('');
    setPromptText('');
    setIsAddingPrompt(false);
  };

  const handleSaveQuickPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptLabel.trim() || !promptText.trim()) {
      showToast('Label and prompt instructions are required.');
      return;
    }

    let updatedList: AIQuickPrompt[];
    if (editingPromptId) {
      updatedList = quickPromptsList.map((p) =>
        p.id === editingPromptId
          ? { ...p, label: promptLabel.trim(), prompt: promptText.trim(), icon: promptIcon, color: promptColor }
          : p
      );
      showToast(`Updated button "${promptLabel}"`);
    } else {
      const newPrompt: AIQuickPrompt = {
        id: `qp-${Date.now()}`,
        label: promptLabel.trim(),
        prompt: promptText.trim(),
        icon: promptIcon,
        color: promptColor,
        isDefault: false,
      };
      updatedList = [...quickPromptsList, newPrompt];
      showToast(`Added quick button "${promptLabel}"`);
    }

    setQuickPromptsList(updatedList);
    setAiSettings({
      ...aiSettings,
      quickPrompts: updatedList,
    });
    handleCancelPromptForm();
  };

  const handleDeleteQuickPrompt = (id: string, label: string) => {
    if (!confirm(`Delete quick button "${label}"?`)) return;
    const updatedList = quickPromptsList.filter((p) => p.id !== id);
    setQuickPromptsList(updatedList);
    setAiSettings({ ...aiSettings, quickPrompts: updatedList });
    showToast(`Deleted "${label}".`);
  };

  const handleMoveQuickPrompt = (id: string, direction: 'up' | 'down') => {
    const idx = quickPromptsList.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= quickPromptsList.length) return;

    const copy = [...quickPromptsList];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setQuickPromptsList(copy);
    setAiSettings({ ...aiSettings, quickPrompts: copy });
  };

  const handleResetQuickPrompts = () => {
    if (!confirm('Restore default AI quick prompts?')) return;
    setQuickPromptsList(DEFAULT_QUICK_PROMPTS);
    setAiSettings({ ...aiSettings, quickPrompts: DEFAULT_QUICK_PROMPTS });
    handleCancelPromptForm();
    showToast('Restored default AI Quick Action buttons.');
  };

  return (
    <div className="space-y-6">
      {/* API Key & Model Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GOOGLE GEMINI CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 flex flex-col justify-between transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                  G
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Google Gemini API</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Independent Google API Key</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                geminiStatus === 'connected' || Boolean(geminiApiKey && geminiStatus !== 'error')
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : geminiStatus === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {geminiStatus === 'connected' || Boolean(geminiApiKey && geminiStatus !== 'error')
                  ? 'Activated'
                  : geminiStatus === 'error'
                  ? 'Error'
                  : 'Not Configured'}
              </span>
            </div>

            {/* Gemini API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gemini API Key</span>
                </label>
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={handleClearGeminiKey}
                    className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer font-medium"
                    title="Clear Gemini API Key only"
                  >
                    Clear Gemini Key
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showGeminiKey ? 'Hide Key' : 'Show Key'}
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Obtained from Google AI Studio (starts with <code className="font-mono">AIzaSy...</code>).
              </p>
            </div>

            {/* Gemini Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gemini Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono font-medium cursor-pointer"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Fast & Stable)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Technical Reasoning & Analysis)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest (Auto-updating Google Release)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra-fast & Low Latency)</option>
              </select>
            </div>

            {/* Gemini Test Feedback */}
            {geminiTestMsg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 border ${
                geminiTestMsg.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}>
                {geminiTestMsg.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium text-[11px] truncate">{geminiTestMsg.message}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              {geminiLastTested ? `Tested: ${geminiLastTested}` : 'Not tested yet'}
            </span>
            <button
              type="button"
              onClick={handleTestGemini}
              disabled={testingGemini || !geminiApiKey.trim()}
              className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingGemini ? 'animate-spin' : ''}`} />
              <span>{testingGemini ? 'Testing...' : 'Test Gemini Key'}</span>
            </button>
          </div>
        </div>

        {/* ANTHROPIC CLAUDE CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 flex flex-col justify-between transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                  C
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Anthropic Claude API</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Independent Anthropic API Key</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                claudeStatus === 'connected' || Boolean(claudeApiKey && claudeStatus !== 'error')
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : claudeStatus === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {claudeStatus === 'connected' || Boolean(claudeApiKey && claudeStatus !== 'error')
                  ? 'Activated'
                  : claudeStatus === 'error'
                  ? 'Error'
                  : 'Not Configured'}
              </span>
            </div>

            {/* Claude API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Claude API Key</span>
                </label>
                {claudeApiKey && (
                  <button
                    type="button"
                    onClick={handleClearClaudeKey}
                    className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer font-medium"
                    title="Clear Claude API Key only"
                  >
                    Clear Claude Key
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showClaudeKey ? 'Hide Key' : 'Show Key'}
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Obtained from Anthropic Console (starts with <code className="font-mono">sk-ant-...</code>).
              </p>
            </div>

            {/* Claude Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Claude Model</label>
              <select
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-amber-500 font-mono font-medium cursor-pointer"
              >
                <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet (Recommended - Hybrid Reasoning)</option>
                <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (High Accuracy & Specs)</option>
                <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Fast & Lightweight)</option>
                <option value="claude-3-opus-latest">Claude 3 Opus (Deep Document Synthesis)</option>
              </select>
            </div>

            {/* Claude Test Feedback */}
            {claudeTestMsg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 border ${
                claudeTestMsg.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}>
                {claudeTestMsg.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium text-[11px] truncate">{claudeTestMsg.message}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              {claudeLastTested ? `Tested: ${claudeLastTested}` : 'Not tested yet'}
            </span>
            <button
              type="button"
              onClick={handleTestClaude}
              disabled={testingClaude || !claudeApiKey.trim()}
              className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingClaude ? 'animate-spin' : ''}`} />
              <span>{testingClaude ? 'Testing...' : 'Test Claude Key'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. System Instructions & Save Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4 transition-colors">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Custom System Instructions
          </label>
          <textarea
            rows={3}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. You are the Lead Project & Discipline Engineer assistant. Focus on EPC deliverables, schedule variance, vendor technical packages, and offshore engineering standards..."
            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 leading-relaxed font-sans"
          />
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSaveAllAiSettings}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save AI Assistant Settings</span>
          </button>
        </div>
      </div>

      {/* 4. AI Quick Action Buttons (Prompt Presets) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Quick Action Buttons (Prompt Presets)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize the one-click action buttons shown in the AI chat drawer.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleResetQuickPrompts}
              className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Defaults</span>
            </button>

            {!isAddingPrompt && (
              <button
                type="button"
                onClick={handleStartAddPrompt}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Quick Action</span>
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Prompt Form */}
        {isAddingPrompt && (
          <form onSubmit={handleSaveQuickPrompt} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {editingPromptId ? 'Edit Quick Action Button' : 'Add New Quick Action Button'}
              </span>
              <button
                type="button"
                onClick={handleCancelPromptForm}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Button Label *</label>
                <input
                  type="text"
                  required
                  value={promptLabel}
                  onChange={(e) => setPromptLabel(e.target.value)}
                  placeholder="e.g. Overdue Deliverables"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Badge Color</label>
                <div className="flex items-center space-x-2 pt-0.5">
                  {AVAILABLE_QUICK_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPromptColor(c.id)}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${c.chipBg} ${
                        promptColor === c.id ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prompt Instructions *</label>
              <textarea
                rows={2}
                required
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. List all overdue EPC deliverables across all projects with root causes and finish forecasts..."
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={handleCancelPromptForm}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
              >
                Save Button
              </button>
            </div>
          </form>
        )}

        {/* Quick Prompts List */}
        <div className="space-y-2">
          {quickPromptsList.map((prompt, idx) => {
            const colorObj = AVAILABLE_QUICK_COLORS.find((c) => c.id === prompt.color) || AVAILABLE_QUICK_COLORS[0];
            const iconObj = AVAILABLE_QUICK_ICONS.find((i) => i.id === prompt.icon) || AVAILABLE_QUICK_ICONS[0];
            const IconComp = iconObj.icon;

            return (
              <div
                key={prompt.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="flex flex-col space-y-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuickPrompt(prompt.id, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === quickPromptsList.length - 1}
                      onClick={() => handleMoveQuickPrompt(prompt.id, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1.5 ${colorObj.chipBg}`}>
                        <IconComp className="w-3 h-3 shrink-0" />
                        <span>{prompt.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 font-sans">
                      {prompt.prompt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleStartEditPrompt(prompt)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickPrompt(prompt.id, prompt.label)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                    title="Delete Button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
