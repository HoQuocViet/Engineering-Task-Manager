import React, { useRef, useState } from 'react';
import { useApp, DEFAULT_BRANDING } from '../../context/AppContext';
import { WorkspaceBranding, ThemeMode } from '../../types';
import {
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Briefcase,
  Cpu,
  Anchor,
  Wrench,
  Compass,
  Factory,
  Flame,
  Box,
  Layers,
  Upload,
  CheckCircle2,
  Save,
  RotateCcw,
  Camera,
  Trash2,
  Palette,
  Check,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';
import {
  HEADER_THEME_PRESETS,
  getHeaderBoxClasses,
  getHeaderBoxStyle,
  getHeaderBadgeClasses,
  getHeaderThemePreset,
} from '../../lib/headerTheme';

const PRESET_BRAND_ICONS = [
  { id: 'hard-hat', label: 'Hard Hat', icon: ShieldCheck },
  { id: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { id: 'cpu', label: 'Processor/Control', icon: Cpu },
  { id: 'anchor', label: 'Offshore Anchor', icon: Anchor },
  { id: 'wrench', label: 'Mechanical Tools', icon: Wrench },
  { id: 'compass', label: 'Engineering Compass', icon: Compass },
  { id: 'factory', label: 'Plant / Yard', icon: Factory },
  { id: 'flame', label: 'Gas / Flare', icon: Flame },
  { id: 'box', label: 'Package / Module', icon: Box },
  { id: 'layers', label: 'Discipline Layers', icon: Layers },
];

const PRESET_BG_GRADIENTS = [
  { label: 'Corporate Navy', value: 'from-[#0b3b70] to-[#1d4ed8]' },
  { label: 'Royal Blue', value: 'from-blue-600 to-indigo-700' },
  { label: 'Deep Navy', value: 'from-slate-800 to-slate-950' },
  { label: 'Emerald EPC', value: 'from-emerald-600 to-teal-800' },
  { label: 'PTSC Orange', value: 'from-amber-500 to-orange-700' },
  { label: 'Cyan Offshore', value: 'from-cyan-600 to-blue-700' },
  { label: 'Purple Tech', value: 'from-purple-600 to-indigo-900' },
];

interface AppearanceSettingsTabProps {
  brandTitle: string;
  setBrandTitle: (v: string) => void;
  brandSubtitle: string;
  setBrandSubtitle: (v: string) => void;
  brandIconType: 'preset' | 'acronym' | 'custom_image';
  setBrandIconType: (v: 'preset' | 'acronym' | 'custom_image') => void;
  brandAcronym: string;
  setBrandAcronym: (v: string) => void;
  brandPresetIcon: string;
  setBrandPresetIcon: (v: string) => void;
  brandCustomImageUrl: string;
  setBrandCustomImageUrl: (v: string) => void;
  brandBgColor: string;
  setBrandBgColor: (v: string) => void;
}

export const AppearanceSettingsTab: React.FC<AppearanceSettingsTabProps> = ({
  brandTitle,
  setBrandTitle,
  brandSubtitle,
  setBrandSubtitle,
  brandIconType,
  setBrandIconType,
  brandAcronym,
  setBrandAcronym,
  brandPresetIcon,
  setBrandPresetIcon,
  brandCustomImageUrl,
  setBrandCustomImageUrl,
  brandBgColor,
  setBrandBgColor,
}) => {
  const {
    workspaceBranding,
    setWorkspaceBranding,
    showToast,
    themeMode,
    setThemeMode,
    resolvedTheme,
  } = useApp();

  const brandFileRef = useRef<HTMLInputElement>(null);

  const handleBrandIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setBrandCustomImageUrl(event.target.result);
        setBrandIconType('custom_image');
        showToast('Custom logo loaded! Click "Save Branding Settings" to update Sidebar.');
      }
    };
    reader.readAsDataURL(file);
  };

  const [headerTheme, setHeaderTheme] = useState<string>(workspaceBranding.headerTheme || 'corporate-navy');
  const [headerCustomStart, setHeaderCustomStart] = useState<string>(workspaceBranding.headerCustomStart || '#0b3b70');
  const [headerCustomVia, setHeaderCustomVia] = useState<string>(workspaceBranding.headerCustomVia || '#0f4c81');
  const [headerCustomEnd, setHeaderCustomEnd] = useState<string>(workspaceBranding.headerCustomEnd || '#072346');

  const handleSelectHeaderTheme = (themeId: string) => {
    setHeaderTheme(themeId);
    const updated: WorkspaceBranding = {
      ...workspaceBranding,
      title: brandTitle.trim() || 'ENGINEERING WORK',
      subtitle: brandSubtitle.trim() || 'LOCAL PERSISTENT DB',
      iconType: brandIconType,
      acronym: brandAcronym.trim().toUpperCase() || 'ENG',
      presetIcon: brandPresetIcon,
      customImageUrl: brandCustomImageUrl,
      bgColor: brandBgColor,
      headerTheme: themeId,
      headerCustomStart,
      headerCustomVia,
      headerCustomEnd,
    };
    setWorkspaceBranding(updated);
    const preset = HEADER_THEME_PRESETS.find((p) => p.id === themeId);
    showToast(`🎨 Applied Header Box palette: ${preset ? preset.name : themeId}`);
  };

  const handleApplyCustomHeaderColors = () => {
    setHeaderTheme('custom');
    const updated: WorkspaceBranding = {
      ...workspaceBranding,
      title: brandTitle.trim() || 'ENGINEERING WORK',
      subtitle: brandSubtitle.trim() || 'LOCAL PERSISTENT DB',
      iconType: brandIconType,
      acronym: brandAcronym.trim().toUpperCase() || 'ENG',
      presetIcon: brandPresetIcon,
      customImageUrl: brandCustomImageUrl,
      bgColor: brandBgColor,
      headerTheme: 'custom',
      headerCustomStart,
      headerCustomVia,
      headerCustomEnd,
    };
    setWorkspaceBranding(updated);
    showToast('🎨 Applied custom header box gradient palette!');
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WorkspaceBranding = {
      title: brandTitle.trim() || 'ENGINEERING WORK',
      subtitle: brandSubtitle.trim() || 'LOCAL PERSISTENT DB',
      iconType: brandIconType,
      acronym: brandAcronym.trim().toUpperCase() || 'ENG',
      presetIcon: brandPresetIcon,
      customImageUrl: brandCustomImageUrl,
      bgColor: brandBgColor,
      headerTheme,
      headerCustomStart,
      headerCustomVia,
      headerCustomEnd,
    };
    setWorkspaceBranding(updated);
    showToast('✅ Saved workspace appearance & branding settings!');
  };

  const handleResetBranding = () => {
    setWorkspaceBranding(DEFAULT_BRANDING);
    setBrandTitle(DEFAULT_BRANDING.title);
    setBrandSubtitle(DEFAULT_BRANDING.subtitle || 'LOCAL PERSISTENT DB');
    setBrandIconType(DEFAULT_BRANDING.iconType);
    setBrandAcronym(DEFAULT_BRANDING.acronym || 'ENG');
    setBrandPresetIcon(DEFAULT_BRANDING.presetIcon || 'hard-hat');
    setBrandCustomImageUrl('');
    setBrandBgColor(DEFAULT_BRANDING.bgColor);
    setHeaderTheme('corporate-navy');
    setHeaderCustomStart('#0b3b70');
    setHeaderCustomVia('#0f4c81');
    setHeaderCustomEnd('#072346');
    showToast('Restored default branding settings.');
  };

  return (
    <div className="space-y-6">
      {/* 1. Theme Selection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Theme Mode (Dark / Light)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred visual theme for the engineering workspace.
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            Active: <span className="capitalize text-blue-600 dark:text-blue-400 font-bold">{resolvedTheme}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => {
              setThemeMode('light');
              showToast('Switched theme to Light Mode.');
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
              themeMode === 'light'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                <Sun className="w-5 h-5" />
              </div>
              {themeMode === 'light' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">Active</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Light Mode</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Crisp high-contrast layout, optimal for daytime & brightly lit offices.
              </div>
            </div>
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => {
              setThemeMode('dark');
              showToast('Switched theme to Dark Mode.');
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
              themeMode === 'dark'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-slate-200 flex items-center justify-center border border-slate-700 shadow-2xs">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              {themeMode === 'dark' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">Active</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Dark Mode</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Reduced glare & eye-strain for control rooms, night shifts, and focus.
              </div>
            </div>
          </button>

          {/* System Auto Option */}
          <button
            type="button"
            onClick={() => {
              setThemeMode('system');
              showToast('Theme set to follow System Preference.');
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
              themeMode === 'system'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs">
                <Monitor className="w-5 h-5" />
              </div>
              {themeMode === 'system' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">Active</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">System Auto</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically matches your operating system theme settings.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Page Header Boxes Theme & Color Palette Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Page Header Boxes Color Palette</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the background gradient and border palette for the top header banners across all pages (Dashboard, Tasks, Projects, Packages, Calendar, Settings).
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            Active: <span className="text-blue-600 dark:text-blue-400 font-bold">{HEADER_THEME_PRESETS.find((p) => p.id === headerTheme)?.name || 'Custom Palette'}</span>
          </span>
        </div>

        {/* Live Interactive Header Box Preview */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            Live Header Box Preview (Applied across all workspace views)
          </div>

          <div
            className={`min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses({ ...workspaceBranding, headerTheme, headerCustomStart, headerCustomVia, headerCustomEnd })} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
            style={getHeaderBoxStyle({ ...workspaceBranding, headerTheme, headerCustomStart, headerCustomVia, headerCustomEnd })}
          >
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
                  <Box className="w-4 h-4 text-sky-200" />
                </div>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                  ENGINEERING EXECUTIVE OVERVIEW
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-sky-100/90 hidden sm:block">
                Real-time multi-project monitoring of EPC deliverables, procurement packages, and milestones.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-[11px] font-semibold border border-white/25">
                Preview Controls
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white text-[#0b3b70] text-[11px] font-bold shadow-xs">
                New Action
              </span>
            </div>
          </div>
        </div>

        {/* Preset Palettes Grid */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Preset Engineering Palettes
            </label>
            <span className="text-[10px] text-slate-400">Click any palette to apply immediately</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HEADER_THEME_PRESETS.map((preset) => {
              const isSelected = headerTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectHeaderTheme(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Swatch preview bar */}
                    <div
                      className="h-6 w-28 rounded-lg shadow-2xs border border-white/20"
                      style={{
                        background: `linear-gradient(to right, ${preset.previewColors[0]}, ${preset.previewColors[1]}, ${preset.previewColors[2]})`,
                      }}
                    />
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {preset.category}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Gradient Builder */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Custom Color Palette Builder</span>
            </label>
            {headerTheme === 'custom' && (
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                Active Custom Gradient
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Start Color (Left)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={headerCustomStart}
                  onChange={(e) => setHeaderCustomStart(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={headerCustomStart}
                  onChange={(e) => setHeaderCustomStart(e.target.value)}
                  className="w-full text-xs font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Middle Color (Center)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={headerCustomVia}
                  onChange={(e) => setHeaderCustomVia(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={headerCustomVia}
                  onChange={(e) => setHeaderCustomVia(e.target.value)}
                  className="w-full text-xs font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                End Color (Right)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={headerCustomEnd}
                  onChange={(e) => setHeaderCustomEnd(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={headerCustomEnd}
                  onChange={(e) => setHeaderCustomEnd(e.target.value)}
                  className="w-full text-xs font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleApplyCustomHeaderColors}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Custom Colors to Headers</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Workspace Navigation Branding & Icon Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Live Sidebar Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
              Sidebar Header Preview
            </div>

            {/* Simulated Sidebar Top */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="relative group/logo shrink-0">
                  <div
                    onClick={() => brandFileRef.current?.click()}
                    className={`w-11 h-11 rounded-lg bg-gradient-to-br ${brandBgColor} flex items-center justify-center font-bold text-white shadow-sm text-xs font-mono overflow-hidden cursor-pointer transition-transform group-hover/logo:scale-105 ${
                      brandIconType === 'custom_image' && brandCustomImageUrl ? 'bg-white/10 dark:bg-white/10 p-0.5 border border-slate-200 dark:border-slate-700/80' : ''
                    }`}
                    title="Click to select new application avatar / logo image"
                  >
                    {brandIconType === 'acronym' ? (
                      brandAcronym.slice(0, 3) || 'ENG'
                    ) : brandIconType === 'custom_image' && brandCustomImageUrl ? (
                      <img src={brandCustomImageUrl} alt="Logo" className="w-full h-full object-contain rounded-md" />
                    ) : (
                      (() => {
                        const IconComp = PRESET_BRAND_ICONS.find((i) => i.id === brandPresetIcon)?.icon || ShieldCheck;
                        return <IconComp className="w-5 h-5" />;
                      })()
                    )}
                  </div>
                  {/* Hover Camera Overlay Button */}
                  <button
                    type="button"
                    onClick={() => brandFileRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover/logo:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity cursor-pointer"
                    title="Change Application Avatar / Logo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-hidden flex-1">
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 dark:text-slate-100 truncate">
                    {brandTitle || 'ENGINEERING WORK'}
                  </h2>
                  <p className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-semibold tracking-wider truncate">
                    {brandSubtitle || 'LOCAL PERSISTENT DB'}
                  </p>
                </div>
              </div>

              {/* Direct App Avatar / Logo Upload Button */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                <input
                  ref={brandFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBrandIconUpload}
                />
                <button
                  type="button"
                  onClick={() => brandFileRef.current?.click()}
                  className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Change App Avatar / Logo</span>
                </button>

                {brandCustomImageUrl && (
                  <div className="flex items-center justify-between px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Custom image active</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBrandCustomImageUrl('');
                        setBrandIconType('acronym');
                        showToast('Reverted to text acronym icon. Click Save to apply.');
                      }}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium ml-2 cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
            This setting customizes the badge icon, brand text, and title for <strong>"ENGINEERING WORK"</strong> displayed at the top left of the entire application.
          </div>
        </div>

        {/* Right: Branding Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6 transition-colors">
          <form onSubmit={handleSaveBranding} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
                <input
                  type="text"
                  value={brandTitle}
                  onChange={(e) => setBrandTitle(e.target.value)}
                  placeholder="e.g. ENGINEERING WORK"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={brandSubtitle}
                  onChange={(e) => setBrandSubtitle(e.target.value)}
                  placeholder="e.g. LOCAL PERSISTENT DB"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-lg px-3 py-2 outline-none focus:border-blue-500 uppercase font-mono"
                />
              </div>
            </div>

            {/* Icon Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Icon Style</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setBrandIconType('acronym')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    brandIconType === 'acronym'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs font-mono">Acronym Text</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">e.g. ENG, MC, EPC</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBrandIconType('preset')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    brandIconType === 'preset'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs font-mono">Engineering Vector</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select from Vector list</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBrandIconType('custom_image')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    brandIconType === 'custom_image'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs font-mono">Custom Logo Upload</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">PNG, SVG, JPG from device</div>
                </button>
              </div>
            </div>

            {/* Sub-selectors depending on icon type */}
            {brandIconType === 'acronym' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Acronym Letters (Max 3-4 chars)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={brandAcronym}
                  onChange={(e) => setBrandAcronym(e.target.value.toUpperCase())}
                  placeholder="ENG"
                  className="w-32 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 uppercase font-mono font-bold text-center tracking-widest"
                />
              </div>
            )}

            {brandIconType === 'preset' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Select Engineering Icon</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_BRAND_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = brandPresetIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBrandPresetIcon(item.id)}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[10px] font-medium text-center truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {brandIconType === 'custom_image' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Upload Custom Logo File</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => brandFileRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose file from device</span>
                  </button>
                  <input
                    ref={brandFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBrandIconUpload}
                  />
                  {brandCustomImageUrl && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Logo loaded</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Color Gradient Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Badge Background Gradient</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_BG_GRADIENTS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setBrandBgColor(g.value)}
                    className={`p-2 rounded-lg border flex items-center space-x-2.5 transition-all cursor-pointer ${
                      brandBgColor === g.value
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded bg-gradient-to-br ${g.value} shadow-2xs shrink-0`} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetBranding}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Restore Defaults
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Appearance & Branding</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
