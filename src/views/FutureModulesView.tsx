import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ShieldAlert, PauseCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';

export const FutureModulesView: React.FC = () => {
  const { setActiveView, workspaceBranding } = useApp();

  const modules = [
    {
      title: 'Management of Change (MOC)',
      code: 'MOC',
      icon: <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      description:
        'Track engineering changes, technical deviations, impact assessments on P&IDs and datasheets, and multidiscipline approvals.',
      phase: 'V2 Roadmap',
    },
    {
      title: 'Engineering Hold Management',
      code: 'HLD',
      icon: <PauseCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      description:
        'Manage "Holds" on engineering deliverables, missing vendor inputs, client clarifications, and release criteria for IFC drawings.',
      phase: 'V2 Roadmap',
    },
    {
      title: 'Engineering Risk & Opportunity Log',
      code: 'RSK',
      icon: <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      description:
        'Log technical risks, safety barriers, HAZOP action follow-ups, mitigations, and design optimization opportunities.',
      phase: 'V2 Roadmap',
    },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 overflow-y-auto space-y-2 max-w-4xl transition-colors">
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Sparkles className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              FUTURE EXTENSION MODULES
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              V2 ROADMAP
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Designed specifically to plug directly into this local engineering workspace in subsequent releases.
          </p>
        </div>

        <button
          onClick={() => setActiveView('my_work')}
          className="bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Work</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map((m) => (
          <div
            key={m.code}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">{m.icon}</div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {m.code}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{m.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{m.phase}</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
