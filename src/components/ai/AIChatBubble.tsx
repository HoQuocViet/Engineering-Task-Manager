import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { AIQuickPrompt, DEFAULT_QUICK_PROMPTS } from '../../types';
import { Robot3DIcon } from './Robot3DIcon';
import { UserAvatar } from '../UserAvatar';
import {
  Sparkles,
  X,
  Send,
  Minimize2,
  Maximize2,
  Bot,
  User,
  RotateCcw,
  Trash2,
  Settings,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  FileText,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  HelpCircle,
  Target,
  TrendingUp,
  Sliders,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  error?: boolean;
  modelUsed?: string;
  isFallback?: boolean;
}

const renderQuickPromptIcon = (iconName?: string, colorName: string = 'blue') => {
  const colorMap: Record<string, string> = {
    rose: 'text-rose-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
    cyan: 'text-cyan-600',
  };
  const colorClass = colorMap[colorName] || 'text-blue-600';

  switch (iconName) {
    case 'alert-triangle':
    case 'alert':
      return <AlertTriangle className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'layers':
    case 'package':
      return <Layers className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'zap':
    case 'lightning':
      return <Zap className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'file-text':
    case 'file':
      return <FileText className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'check-circle':
    case 'check':
      return <CheckCircle2 className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'calendar':
      return <Calendar className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'shield':
    case 'shield-check':
      return <ShieldCheck className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'help-circle':
    case 'help':
      return <HelpCircle className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'target':
      return <Target className={`w-3.5 h-3.5 ${colorClass}`} />;
    case 'trending-up':
    case 'chart':
      return <TrendingUp className={`w-3.5 h-3.5 ${colorClass}`} />;
    default:
      return <Sparkles className={`w-3.5 h-3.5 ${colorClass}`} />;
  }
};

export const AIChatBubble: React.FC = () => {
  const {
    isAiChatOpen,
    setIsAiChatOpen,
    aiSettings,
    setAiSettings,
    setActiveView,
    setSelectedTaskId,
    totalTasksCount,
    currentUser,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('eng_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'welcome',
        role: 'model',
        text: `Hello! I am your **AI Assistant**.\n\nI have real-time access to all **Projects, Procurement Packages, Tasks, Deadlines, Forecast Finish Dates**, and **Attachments** in this workspace.\n\nAsk me anything about your project deliverables or select a quick prompt below to get started!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Window dimensions for resizable chat window (drag up & left)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('eng_ai_chat_dimensions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) {
          return {
            width: Math.min(Math.max(parsed.width, 360), typeof window !== 'undefined' ? window.innerWidth - 32 : 1200),
            height: Math.min(Math.max(parsed.height, 380), typeof window !== 'undefined' ? window.innerHeight - 32 : 1000),
          };
        }
      }
    } catch (e) {}
    return { width: 480, height: 620 };
  });

  const [resizingDirection, setResizingDirection] = useState<'top' | 'left' | 'top-left' | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number }>({
    startX: 0,
    startY: 0,
    startWidth: 480,
    startHeight: 620,
  });

  const handleResizeStart = (e: React.MouseEvent, direction: 'top' | 'left' | 'top-left') => {
    e.preventDefault();
    e.stopPropagation();
    if (isExpanded) return;
    setResizingDirection(direction);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
    };
  };

  useEffect(() => {
    if (!resizingDirection) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (resizingDirection === 'left' || resizingDirection === 'top-left') {
        const deltaX = startX - e.clientX;
        const maxWidth = Math.max(400, window.innerWidth - 32);
        newWidth = Math.max(360, Math.min(maxWidth, startWidth + deltaX));
      }

      if (resizingDirection === 'top' || resizingDirection === 'top-left') {
        const deltaY = startY - e.clientY;
        const maxHeight = Math.max(420, window.innerHeight - 32);
        newHeight = Math.max(380, Math.min(maxHeight, startHeight + deltaY));
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setResizingDirection(null);
      setDimensions((current) => {
        try {
          localStorage.setItem('eng_ai_chat_dimensions', JSON.stringify(current));
        } catch (e) {}
        return current;
      });
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    if (resizingDirection === 'top') document.body.style.cursor = 'ns-resize';
    else if (resizingDirection === 'left') document.body.style.cursor = 'ew-resize';
    else if (resizingDirection === 'top-left') document.body.style.cursor = 'nwse-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizingDirection]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eng_ai_chat_history', JSON.stringify(messages.slice(-30)));
    } catch (e) {}
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isAiChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiChatOpen, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // Build history payload for AI API
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome' && !m.error)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    // Select active provider's specific API key & model
    const activeApiKey = aiSettings.provider === 'claude'
      ? (aiSettings.claudeApiKey || (aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : ''))
      : (aiSettings.geminiApiKey || (!aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : ''));

    const activeModel = aiSettings.provider === 'claude'
      ? (aiSettings.claudeModel || 'claude-3-7-sonnet-latest')
      : (aiSettings.geminiModel || 'gemini-3.8-flash');

    try {
      const res = await api.chatWithAi({
        message: textToSend,
        history: historyPayload,
        customApiKey: activeApiKey,
        provider: aiSettings.provider || (activeApiKey?.startsWith('sk-ant-') ? 'claude' : 'gemini'),
        model: activeModel,
        customInstructions: aiSettings.customInstructions,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed,
        isFallback: res.isFallback || (res.modelUsed && res.modelUsed !== activeModel),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      const isMissingKey = msg.includes('NO_API_KEY') || msg.includes('API_KEY_INVALID') || msg.includes('Invalid API Key') || msg.includes('unregistered');
      const isHighDemand = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('temporary spike');
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
      const providerLabel = aiSettings.provider === 'claude' ? 'Anthropic Claude' : 'Google Gemini';

      let errorText = '';
      if (isMissingKey) {
        errorText = `⚠️ **API Key Not Configured or Invalid**\n\nPlease check or configure your **${providerLabel} API Key** in **Settings > AI Assistant**.`;
      } else if (isHighDemand) {
        errorText = `⏳ **AI Model Temporarily Busy (High Demand - HTTP 503)**\n\nThe ${providerLabel} service is currently experiencing high demand. Please wait a moment and try asking your question again. You can also configure a dedicated personal API key in **Settings > AI Assistant**.`;
      } else if (isQuota) {
        errorText = `⚠️ **API Rate Limit / Quota Exceeded (HTTP 429)**\n\nThe current API quota has been reached. Please check your quota on the provider console or configure an alternate API key in **Settings > AI Assistant**.`;
      } else {
        errorText = `❌ **AI Service Notice:** ${msg || 'Unable to connect to AI service.'}\n\n*Tip: You can test or switch your AI model in **Settings > AI Assistant**.*`;
      }

      const aiErrorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: errorText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages((prev) => [...prev, aiErrorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const executeClearHistory = () => {
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'model',
      text: `Chat history cleared. I am ready to assist you with workspace queries!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcome]);
    setShowClearConfirm(false);
    try {
      localStorage.removeItem('eng_ai_chat_history');
    } catch (e) {}
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render message text with clean Markdown, highlighted key metrics, and clickable [TASK:id|title] or #task-id
  const renderFormattedMessage = (text: string, isAi: boolean) => {
    if (!isAi) {
      return (
        <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {text}
        </div>
      );
    }

    // 1. Preprocess all task tokens into special hash markdown links
    let transformedText = text
      // [TASK:id|title]
      .replace(/\[TASK:([^|\]]+)\|([^\]]+)\]/gi, '[$2](#task:$1)')
      // [TASK:id]
      .replace(/\[TASK:([^|\]]+)\]/gi, '[$1](#task:$1)')
      // #tsk-xxxx or #task-xxxx
      .replace(/(^|[^\w#])#(tsk-[a-zA-Z0-9_-]+)/gi, '$1[$2](#task:$2)')
      .replace(/(^|[^\w#])#(task-[a-zA-Z0-9_-]+)/gi, '$1[$2](#task:$2)');

    // 2. Standalone tsk-xxxx (e.g. "tsk-d8c9a123" or "(tsk-d8c9a123)") when not already inside a link target
    transformedText = transformedText.replace(/(^|[^\w#/])(tsk-[a-zA-Z0-9_-]{6,})(?=[^\w-]|$)/gi, '$1[$2](#task:$2)');

    // 3. Extract any referenced task IDs for the bottom interactive bar
    const referencedTaskIds = Array.from(new Set(
      (text.match(/\btsk-[a-zA-Z0-9_-]{4,}\b/gi) || [])
        .map((id) => id.trim())
    ));

    return (
      <div className="ai-markdown-content text-xs leading-relaxed font-sans space-y-2">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-100">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-bold text-[#0b3b70] dark:text-[#93c5fd] bg-blue-50/80 dark:bg-blue-950/50 px-1 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/40">
                {children}
              </strong>
            ),
            ul: ({ children }) => <ul className="my-2 ml-3.5 space-y-1.5 list-disc text-slate-700 dark:text-slate-200">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 ml-4 space-y-1.5 list-decimal text-slate-700 dark:text-slate-200">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
            h1: ({ children }) => <h1 className="text-sm font-bold text-[#0b3b70] dark:text-[#93c5fd] mt-2.5 mb-1.5 border-b border-slate-200 dark:border-slate-800 pb-0.5">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xs font-bold text-[#0b3b70] dark:text-[#93c5fd] mt-2 mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-semibold text-[#0b3b70] dark:text-[#93c5fd] mt-1.5 mb-0.5">{children}</h3>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200 dark:divide-slate-700">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">{children}</thead>,
            tbody: ({ children }) => <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">{children}</tbody>,
            tr: ({ children }) => <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">{children}</tr>,
            th: ({ children }) => <th className="px-2 py-1.5 font-semibold text-[10.5px] uppercase tracking-wider text-slate-600 dark:text-slate-300">{children}</th>,
            td: ({ children }) => <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">{children}</td>,
            code: ({ children }) => <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-700">{children}</code>,
            a: ({ href, children }) => {
              if (href?.startsWith('#task:')) {
                const taskId = href.replace('#task:', '').trim();
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTaskId(taskId);
                    }}
                    className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-100/90 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800 text-[#0b3b70] dark:text-[#93c5fd] border border-blue-300 dark:border-blue-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs group/taskbtn"
                    title={`Click to open task #${taskId} in details`}
                  >
                    <ExternalLink className="w-2.5 h-2.5 inline text-blue-600 dark:text-blue-400 group-hover/taskbtn:scale-110 transition-transform shrink-0" />
                    <span className="underline decoration-blue-400/60 group-hover/taskbtn:decoration-blue-600">{children}</span>
                  </button>
                );
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {children}
                </a>
              );
            },
          }}
        >
          {transformedText}
        </Markdown>

        {/* Interactive List of Referenced Tasks (Click to Open in Details) */}
        {referencedTaskIds.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#0b3b70] dark:text-sky-400" />
                <span>Referenced Tasks ({referencedTaskIds.length})</span>
              </span>
              <span className="text-[9.5px] font-normal text-slate-400 dark:text-slate-500">Click any item to open details</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {referencedTaskIds.map((tid) => (
                <button
                  key={tid}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTaskId(tid);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-300/90 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                  title={`Click to open details for task ${tid}`}
                >
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                  <span>#{tid}</span>
                  <span className="text-[9.5px] font-sans font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">Open Details →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hasChatMessages = messages.length > 1;

  return (
    <>
      {/* Floating Action Bubble Button */}
      {!isAiChatOpen && (
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-full p-2.5 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center justify-center group cursor-pointer border border-slate-300 dark:border-slate-700"
          title="Open AI Assistant (Chatbot)"
        >
          <div className="relative flex items-center justify-center">
            <Robot3DIcon className="w-8 h-8" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </div>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out group-hover:ml-2 text-xs font-bold text-slate-800 dark:text-slate-100">
            AI Assistant
          </span>
        </button>
      )}

      {/* Floating Chat Window - Crisp Light & Slate Dark Theme */}
      {isAiChatOpen && (
        <div
          style={
            isExpanded
              ? undefined
              : {
                  width: `${dimensions.width}px`,
                  height: `${dimensions.height}px`,
                  maxWidth: 'calc(100vw - 24px)',
                  maxHeight: 'calc(100vh - 24px)',
                }
          }
          className={`fixed z-50 shadow-2xl flex flex-col bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden ${
            resizingDirection ? 'select-none pointer-events-auto' : 'transition-[width,height] duration-150'
          } ${
            isExpanded
              ? 'inset-4 sm:inset-10 max-w-5xl max-h-[90vh] m-auto'
              : 'bottom-4 right-4 w-[95vw] sm:w-auto'
          }`}
        >
          {/* Resize Handles (Top edge, Left edge, and Top-Left corner) */}
          {!isExpanded && (
            <>
              {/* Top edge resize handle (drag up to expand height) */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'top')}
                className="absolute top-0 left-6 right-6 h-2.5 cursor-ns-resize z-30 group flex items-center justify-center -translate-y-1/2 hover:h-4 transition-all"
                title="Drag up/down to resize height"
              >
                <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>

              {/* Left edge resize handle (drag left to expand width) */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'left')}
                className="absolute top-6 bottom-6 left-0 w-2.5 cursor-ew-resize z-30 group flex items-center justify-center -translate-x-1/2 hover:w-4 transition-all"
                title="Drag left/right to resize width"
              >
                <div className="h-16 w-1 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>

              {/* Top-Left corner resize handle (drag diagonally to resize both width and height) */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'top-left')}
                className="absolute top-0 left-0 w-7 h-7 cursor-nwse-resize z-40 group p-1 flex items-start justify-start"
                title="Drag to resize width and height"
              >
                <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400 dark:border-slate-500 rounded-tl group-hover:border-blue-500 group-hover:scale-110 transition-all" />
              </div>
            </>
          )}

          {/* Chat Header */}
          <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none shadow-2xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-2xs p-0.5 shrink-0">
                <Robot3DIcon className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 truncate">
                  <span>AI Assistant</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                  <span className="truncate">Live Data Connected ({totalTasksCount} tasks)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 shrink-0">
              {/* Clear History Button */}
              <button
                onClick={() => setShowClearConfirm(true)}
                className={`p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1 ${
                  hasChatMessages ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'
                }`}
                title="Clear all chat history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold hidden sm:inline">Clear</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('settings');
                  setIsAiChatOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                title="AI & API Key Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? 'Restore Size' : 'Maximize'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsAiChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline Clear Confirmation Bar */}
          {showClearConfirm && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 px-4 py-2 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 animate-in fade-in duration-150 shrink-0">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Clear entire chat history?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeClearHistory}
                  className="px-2.5 py-0.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer shadow-2xs"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Active AI Engine Quick-Switcher Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3.5 py-1.5 flex items-center justify-between text-[11px] select-none shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 font-mono">Engine:</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setAiSettings({
                      ...aiSettings,
                      provider: 'gemini',
                    });
                  }}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center space-x-1 transition-all cursor-pointer ${
                    aiSettings.provider !== 'claude'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Switch to Google Gemini"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-200"></span>
                  <span>Google Gemini</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiSettings({
                      ...aiSettings,
                      provider: 'claude',
                    });
                  }}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center space-x-1 transition-all cursor-pointer ${
                    aiSettings.provider === 'claude'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Switch to Anthropic Claude"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-200"></span>
                  <span>Anthropic Claude</span>
                </button>
              </div>
            </div>

            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={aiSettings.provider === 'claude' ? (aiSettings.claudeModel || 'claude-3-7-sonnet') : (aiSettings.geminiModel || 'gemini-3.8-flash')}>
              {aiSettings.provider === 'claude'
                ? (aiSettings.claudeModel || 'claude-3-7-sonnet')
                : (aiSettings.geminiModel || 'gemini-3.8-flash')}
            </div>
          </div>

          {/* Quick Preset Prompts Ribbon */}
          {(() => {
            const activePrompts = (aiSettings.quickPrompts && aiSettings.quickPrompts.length > 0)
              ? aiSettings.quickPrompts
              : DEFAULT_QUICK_PROMPTS;

            return (
              <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">Quick Actions:</span>
                {activePrompts.map((p) => {
                  const borderHoverMap: Record<string, string> = {
                    rose: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300',
                    blue: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300',
                    amber: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300',
                    emerald: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
                    purple: 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300',
                    cyan: 'hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
                  };
                  const hoverClass = borderHoverMap[p.color || 'blue'] || 'hover:border-blue-400 hover:bg-blue-50 text-blue-700 dark:text-blue-300';

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSendMessage(p.prompt)}
                      disabled={loading}
                      title={p.prompt}
                      className={`shrink-0 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs ${hoverClass}`}
                    >
                      {renderQuickPromptIcon(p.icon, p.color || 'blue')}
                      <span className="truncate max-w-[200px]">{p.label}</span>
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setActiveView('settings');
                    setIsAiChatOpen(false);
                  }}
                  className="shrink-0 text-[10px] bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded-lg flex items-center space-x-1 transition-all cursor-pointer font-medium"
                  title="Configure Custom AI Action Buttons in Settings"
                >
                  <Sliders className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Customize</span>
                </button>
              </div>
            );
          })()}

          {/* Messages Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/50 select-text">
            {messages.map((msg) => {
              const isAi = msg.role === 'model';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0 mt-0.5 shadow-2xs p-0.5">
                      <Robot3DIcon className="w-6 h-6" glow={false} />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 ${
                      isAi
                        ? msg.error
                          ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-2xs'
                          : 'bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs'
                        : 'bg-blue-600 text-white shadow-2xs'
                    }`}
                  >
                    {/* Message Header */}
                    <div className={`flex items-center justify-between mb-1.5 text-[10px] font-mono ${
                      isAi ? 'text-slate-500 dark:text-slate-400' : 'text-blue-100'
                    }`}>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold">{isAi ? 'AI Assistant' : (currentUser?.name || 'You')}</span>
                        {isAi && msg.modelUsed && (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                              msg.isFallback
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                            title={msg.isFallback ? `Switched to fallback model: ${msg.modelUsed}` : `Active model: ${msg.modelUsed}`}
                          >
                            {msg.isFallback && <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 inline" />}
                            <span>{msg.modelUsed}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span>{msg.timestamp}</span>
                        {isAi && (
                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    {renderFormattedMessage(msg.text, isAi)}

                    {/* Quick Config Button if API key is missing */}
                    {msg.error && (msg.text.includes('SETTINGS & ENGINEER PROFILE') || msg.text.includes('SETTINGS') || msg.text.includes('API Key Not Configured')) && (
                      <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-800">
                        <button
                          onClick={() => {
                            setActiveView('settings');
                            setIsAiChatOpen(false);
                          }}
                          className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Open Settings & Configure API Key Now</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!isAi && (
                    <UserAvatar
                      name={currentUser?.name || 'User'}
                      avatar={currentUser?.avatar}
                      size="sm"
                      shape="square"
                      className="shrink-0 mt-0.5 shadow-2xs"
                    />
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start space-x-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0 shadow-2xs p-0.5">
                  <Robot3DIcon className="w-6 h-6" glow={false} />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 shadow-2xs">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">AI is analyzing live workspace data...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end space-x-2"
            >
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tasks, package progress, deadlines, risk analysis... (Enter to send)"
                rows={1}
                className="flex-1 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 border border-slate-200 dark:border-slate-700 focus:border-blue-600 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none max-h-28 overflow-y-auto font-sans transition-colors"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Send Message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono px-1">
              <span>Shift + Enter for new line</span>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
