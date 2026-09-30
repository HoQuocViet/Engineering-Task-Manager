import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Tags, Plus, Trash2, ArrowRight } from 'lucide-react';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';

export const TagsView: React.FC = () => {
  const { tags, refreshData, setFilterTagId, setActiveView, showToast, workspaceBranding } = useApp();
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      const clean = newTagName.trim().replace(/^#+/, '');
      await api.createTag(clean);
      setNewTagName('');
      showToast(`Tag #${clean} created`);
      refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tag #${name}?`)) return;
    try {
      await api.deleteTag(id);
      showToast(`Tag #${name} deleted`);
      refreshData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 overflow-y-auto space-y-2 transition-colors">
      {/* Header */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Tags className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              ENGINEERING TAGS
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              {tags.length} Tags
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Organize tasks with multi-discipline tags like #TBE, #VDR, #FAT, #IFC, #HAZOP, and #FEED.
          </p>
        </div>
      </div>

      {/* Quick Add Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 flex items-center space-x-2 shadow-xs max-w-lg focus-within:border-blue-500 transition-colors"
      >
        <Tags className="w-4 h-4 text-slate-400 dark:text-slate-500 pl-1 shrink-0" />
        <input
          type="text"
          placeholder="Add new tag (e.g. 'SAT', 'Pre-Commissioning', 'Interface')..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          className="flex-1 text-xs outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={loading || !newTagName.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer shadow-xs"
        >
          Add Tag
        </button>
      </form>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate">#{tag.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {tag.task_count || 0} {(tag.task_count || 0) === 1 ? 'task' : 'tasks'}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setFilterTagId(tag.id);
                  setActiveView('tasks');
                }}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="View tagged tasks"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(tag.id, tag.name)}
                className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                title="Delete tag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
