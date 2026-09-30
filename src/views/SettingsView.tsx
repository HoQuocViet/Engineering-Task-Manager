import React, { useState, useEffect } from 'react';
import { useApp, DEFAULT_BRANDING } from '../context/AppContext';
import {
  Settings,
  Database,
  User,
  Layers,
  Sparkles,
  Sun,
  Palette,
  Bot,
} from 'lucide-react';
import { ProfileSettingsTab } from './settings/ProfileSettingsTab';
import { AppearanceSettingsTab } from './settings/AppearanceSettingsTab';
import { AISettingsTab } from './settings/AISettingsTab';
import { CategoriesSettingsTab } from './settings/CategoriesSettingsTab';
import { DatabaseSettingsTab } from './settings/DatabaseSettingsTab';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';

export const SettingsView: React.FC = () => {
  const { workspaceBranding, toastMessage } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'ai' | 'categories' | 'database'>('profile');

  // Local state for Branding & Appearance
  const [brandTitle, setBrandTitle] = useState(workspaceBranding.title || DEFAULT_BRANDING.title);
  const [brandSubtitle, setBrandSubtitle] = useState(workspaceBranding.subtitle || DEFAULT_BRANDING.subtitle || 'LOCAL PERSISTENT DB');
  const [brandIconType, setBrandIconType] = useState<'preset' | 'acronym' | 'custom_image'>(workspaceBranding.iconType || DEFAULT_BRANDING.iconType);
  const [brandAcronym, setBrandAcronym] = useState(workspaceBranding.acronym || DEFAULT_BRANDING.acronym || 'ENG');
  const [brandPresetIcon, setBrandPresetIcon] = useState(workspaceBranding.presetIcon || DEFAULT_BRANDING.presetIcon || 'hard-hat');
  const [brandCustomImageUrl, setBrandCustomImageUrl] = useState(workspaceBranding.customImageUrl || '');
  const [brandBgColor, setBrandBgColor] = useState(workspaceBranding.bgColor || DEFAULT_BRANDING.bgColor);

  useEffect(() => {
    setBrandTitle(workspaceBranding.title || DEFAULT_BRANDING.title);
    setBrandSubtitle(workspaceBranding.subtitle || DEFAULT_BRANDING.subtitle || 'LOCAL PERSISTENT DB');
    setBrandIconType(workspaceBranding.iconType || DEFAULT_BRANDING.iconType);
    setBrandAcronym(workspaceBranding.acronym || DEFAULT_BRANDING.acronym || 'ENG');
    setBrandPresetIcon(workspaceBranding.presetIcon || DEFAULT_BRANDING.presetIcon || 'hard-hat');
    setBrandCustomImageUrl(workspaceBranding.customImageUrl || '');
    setBrandBgColor(workspaceBranding.bgColor || DEFAULT_BRANDING.bgColor);
  }, [workspaceBranding]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950 p-1 space-y-2 max-w-7xl mx-auto w-full transition-colors duration-150">
      {/* Stationary View Header & Navigation Tabs */}
      <div className="shrink-0 bg-slate-50/50 dark:bg-slate-950 space-y-2 pb-1">
        {/* View Header */}
        <div
          className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
          style={getHeaderBoxStyle(workspaceBranding)}
        >
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
                <Settings className="w-4 h-4 text-sky-200" />
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                SYSTEM & WORKSPACE SETTINGS
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
                CONFIG
              </span>
            </div>
            <p className="text-xs text-sky-100/90 hidden sm:block">
              Configure engineer profile, theme appearance (Dark/Light mode), AI API keys, categories, and database.
            </p>
          </div>

          {toastMessage && (
            <div className="px-3 py-1 rounded-lg bg-white/20 backdrop-blur-xs border border-white/30 text-white text-xs font-semibold animate-fade-in flex items-center space-x-1.5 shadow-2xs">
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Engineer Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme & Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant & Models</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Work Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database & Storage</span>
          </button>
        </div>
      </div>

      {/* Scrollable Tab Panels */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-1 pb-4">
        {activeTab === 'profile' && <ProfileSettingsTab />}

        {activeTab === 'appearance' && (
          <AppearanceSettingsTab
            brandTitle={brandTitle}
            setBrandTitle={setBrandTitle}
            brandSubtitle={brandSubtitle}
            setBrandSubtitle={setBrandSubtitle}
            brandIconType={brandIconType}
            setBrandIconType={setBrandIconType}
            brandAcronym={brandAcronym}
            setBrandAcronym={setBrandAcronym}
            brandPresetIcon={brandPresetIcon}
            setBrandPresetIcon={setBrandPresetIcon}
            brandCustomImageUrl={brandCustomImageUrl}
            setBrandCustomImageUrl={setBrandCustomImageUrl}
            brandBgColor={brandBgColor}
            setBrandBgColor={setBrandBgColor}
          />
        )}

        {activeTab === 'ai' && <AISettingsTab />}

        {activeTab === 'categories' && <CategoriesSettingsTab />}

        {activeTab === 'database' && <DatabaseSettingsTab />}
      </div>
    </div>
  );
};
