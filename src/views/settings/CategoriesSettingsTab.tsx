import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const CategoriesSettingsTab: React.FC = () => {
  const { categories, refreshData, showToast } = useApp();

  // Categories State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Category Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
      });
      showToast(`Created category "${newCategoryName}"`);
      setNewCategoryName('');
      setNewCategoryDesc('');
      await refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const startEditCategory = (c: any) => {
    setEditingCategoryId(c.id);
    setEditCategoryName(c.name);
    setEditCategoryDesc(c.description || '');
  };

  const saveEditCategory = async (id: string) => {
    if (!editCategoryName.trim()) return;
    try {
      await api.updateCategory(id, {
        name: editCategoryName.trim(),
        description: editCategoryDesc.trim(),
      });
      showToast('Category updated successfully');
      setEditingCategoryId(null);
      await refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      showToast(`Deleted category "${name}"`);
      await refreshData();
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      !categorySearch.trim() ||
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Add Category Form & Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 flex flex-col justify-between min-h-[540px] transition-colors">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Add Work Category</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Create custom category tags for deliverables</p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Commissioning, HSE, Piping..."
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Brief description of work scope, discipline, or deliverables..."
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Category</span>
              </button>
            </form>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Category Tags</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Categories organize tasks across projects, filter deliverable boards, and structure analytics charts.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
            <span>Total Categories:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {categories.length}
            </span>
          </div>
        </div>

        {/* Right Column: Work Categories List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs flex flex-col min-h-[540px] justify-between transition-colors">
          <div>
            {/* Header Bar with Search */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-bold text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-2">
                <span>Configured Categories</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  {categories.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search category..."
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-44 font-medium"
                  />
                </div>
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch('')}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Categories Scrollable List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[440px] scrollbar-crystal-dark">
              {filteredCategories.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>{categorySearch ? 'No categories match your search term.' : 'No work categories defined yet. Use the form on the left to add one.'}</p>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                  >
                    {editingCategoryId === cat.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mr-3">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        />
                        <input
                          type="text"
                          value={editCategoryDesc}
                          onChange={(e) => setEditCategoryDesc(e.target.value)}
                          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="pr-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 font-medium">
                            {cat.name}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">{cat.description || 'No description provided'}</div>
                      </div>
                    )}

                    <div className="flex items-center space-x-1 shrink-0">
                      {editingCategoryId === cat.id ? (
                        <>
                          <button
                            onClick={() => saveEditCategory(cat.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-colors"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Summary Bar */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Click edit icon to modify category details inline</span>
            <span className="font-mono">{categories.length} Total Registered</span>
          </div>
        </div>
      </div>
    </div>
  );
};
