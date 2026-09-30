import React from 'react';
import { WorkspaceBranding } from '../types';

export interface HeaderThemePreset {
  id: string;
  name: string;
  category: string;
  gradientClass: string;
  borderClass: string;
  previewColors: [string, string, string]; // [start, mid, end]
  badgeBgClass: string;
  badgeTextClass: string;
  accentIconClass: string;
}

export const HEADER_THEME_PRESETS: HeaderThemePreset[] = [
  {
    id: 'corporate-navy',
    name: 'Corporate Navy (Default)',
    category: 'Corporate EPC',
    gradientClass: 'bg-gradient-to-r from-[#0b3b70] via-[#0f4c81] to-[#072346] dark:from-[#061d38] dark:via-[#0b2f56] dark:to-slate-900',
    borderClass: 'border-[#0f4c81]/40',
    previewColors: ['#0b3b70', '#0f4c81', '#072346'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-sky-200',
    accentIconClass: 'text-sky-200',
  },
  {
    id: 'ptsc-blue',
    name: 'PetroVietnam / PTSC Blue',
    category: 'Oil & Gas',
    gradientClass: 'bg-gradient-to-r from-[#004b87] via-[#0066b2] to-[#002d5a] dark:from-[#001f3f] dark:via-[#003366] dark:to-slate-900',
    borderClass: 'border-blue-500/40',
    previewColors: ['#004b87', '#0066b2', '#002d5a'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-blue-200',
    accentIconClass: 'text-blue-200',
  },
  {
    id: 'offshore-teal',
    name: 'Deep Ocean Teal',
    category: 'Offshore Marine',
    gradientClass: 'bg-gradient-to-r from-[#0f4c5c] via-[#0e7490] to-[#042f2e] dark:from-[#022c22] dark:via-[#083344] dark:to-slate-900',
    borderClass: 'border-teal-500/40',
    previewColors: ['#0f4c5c', '#0e7490', '#042f2e'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-teal-200',
    accentIconClass: 'text-teal-200',
  },
  {
    id: 'steel-graphite',
    name: 'Modern Steel Slate',
    category: 'Industrial',
    gradientClass: 'bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#0f172a] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-black',
    borderClass: 'border-slate-600/50',
    previewColors: ['#1e293b', '#334155', '#0f172a'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-slate-200',
    accentIconClass: 'text-slate-200',
  },
  {
    id: 'energy-emerald',
    name: 'Energy Emerald EPC',
    category: 'Renewables & EPC',
    gradientClass: 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#022c22] dark:from-[#022c22] dark:via-[#064e3b] dark:to-slate-900',
    borderClass: 'border-emerald-600/40',
    previewColors: ['#064e3b', '#047857', '#022c22'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-emerald-200',
    accentIconClass: 'text-emerald-200',
  },
  {
    id: 'ptsc-flame',
    name: 'Offshore Flare & Amber',
    category: 'Oil & Gas',
    gradientClass: 'bg-gradient-to-r from-[#7c2d12] via-[#c2410c] to-[#431407] dark:from-[#431407] dark:via-[#7c2d12] dark:to-slate-900',
    borderClass: 'border-orange-600/40',
    previewColors: ['#7c2d12', '#c2410c', '#431407'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-amber-200',
    accentIconClass: 'text-amber-200',
  },
  {
    id: 'royal-indigo',
    name: 'Royal EPC Indigo',
    category: 'Executive',
    gradientClass: 'bg-gradient-to-r from-[#312e81] via-[#4338ca] to-[#1e1b4b] dark:from-[#1e1b4b] dark:via-[#312e81] dark:to-slate-900',
    borderClass: 'border-indigo-600/40',
    previewColors: ['#312e81', '#4338ca', '#1e1b4b'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-indigo-200',
    accentIconClass: 'text-indigo-200',
  },
  {
    id: 'executive-crimson',
    name: 'Executive Crimson',
    category: 'Executive',
    gradientClass: 'bg-gradient-to-r from-[#881337] via-[#9f1239] to-[#4c0519] dark:from-[#4c0519] dark:via-[#881337] dark:to-slate-950',
    borderClass: 'border-rose-700/40',
    previewColors: ['#881337', '#9f1239', '#4c0519'],
    badgeBgClass: 'bg-white/15 border-white/20',
    badgeTextClass: 'text-rose-200',
    accentIconClass: 'text-rose-200',
  },
  {
    id: 'midnight-carbon',
    name: 'Midnight Onyx & Carbon',
    category: 'Dark Minimal',
    gradientClass: 'bg-gradient-to-r from-[#090d16] via-[#182234] to-[#020617] dark:from-[#020617] dark:via-[#0f172a] dark:to-black',
    borderClass: 'border-slate-800/80',
    previewColors: ['#090d16', '#182234', '#020617'],
    badgeBgClass: 'bg-white/10 border-white/15',
    badgeTextClass: 'text-slate-300',
    accentIconClass: 'text-sky-300',
  },
];

export function getHeaderThemePreset(id?: string): HeaderThemePreset {
  if (!id) return HEADER_THEME_PRESETS[0];
  const found = HEADER_THEME_PRESETS.find((p) => p.id === id);
  return found || HEADER_THEME_PRESETS[0];
}

export function getHeaderBoxClasses(
  branding?: WorkspaceBranding,
  extraClasses: string = ''
): string {
  if (branding?.headerTheme === 'custom') {
    return `border border-white/20 shadow-md ${extraClasses}`;
  }

  const preset = getHeaderThemePreset(branding?.headerTheme);
  return `${preset.gradientClass} border ${preset.borderClass} shadow-md ${extraClasses}`;
}

export function getHeaderBoxStyle(branding?: WorkspaceBranding): React.CSSProperties {
  if (branding?.headerTheme === 'custom') {
    const start = branding.headerCustomStart || '#0b3b70';
    const mid = branding.headerCustomVia || '#0f4c81';
    const end = branding.headerCustomEnd || '#072346';
    return {
      background: `linear-gradient(135deg, ${start} 0%, ${mid} 50%, ${end} 100%)`,
    };
  }
  return {};
}

export function getHeaderBadgeClasses(branding?: WorkspaceBranding): {
  badgeBg: string;
  badgeText: string;
  accentIcon: string;
} {
  const preset = getHeaderThemePreset(branding?.headerTheme);
  return {
    badgeBg: preset.badgeBgClass,
    badgeText: preset.badgeTextClass,
    accentIcon: preset.accentIconClass,
  };
}
