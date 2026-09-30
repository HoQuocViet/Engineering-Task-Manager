import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Package } from '../types';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import {
  Box,
  Plus,
  Edit2,
  Trash2,
  ListTodo,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  FolderGit2,
  ShieldCheck,
  Lock,
  Link2,
} from 'lucide-react';

export const PackagesView: React.FC = () => {
  const {
    packages,
    projects,
    generalPackage,
    refreshData,
    filterProjectId,
    setFilterProjectId,
    setFilterPackageId,
    setActiveView,
    openNewTaskModal,
    showToast,
    isAdmin,
    currentUser,
    workspaceBranding,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [discipline, setDiscipline] = useState('Mechanical');
  const [loading, setLoading] = useState(false);

  const openCreateModal = () => {
    setEditingPackage(null);
    setCode('');
    setName('');
    setProjectId(filterProjectId || (projects[0]?.id || ''));
    setDescription('');
    setVendor('');
    setDiscipline('Mechanical');
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setCode(pkg.code);
    setName(pkg.name);
    setProjectId(pkg.project_id || '');
    setDescription(pkg.description || '');
    setVendor(pkg.vendor || '');
    setDiscipline(pkg.discipline || 'Mechanical');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('Package Code and Name are required');
      return;
    }

    setLoading(true);
    try {
      if (editingPackage) {
        await api.updatePackage(editingPackage.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          project_id: projectId || undefined,
          description: description.trim(),
          vendor: vendor.trim(),
          discipline: discipline.trim(),
        }, currentUser?.id);
        showToast('Package updated successfully');
      } else {
        await api.createPackage({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          project_id: projectId || undefined,
          description: description.trim(),
          vendor: vendor.trim(),
          discipline: discipline.trim(),
        }, currentUser?.id);
        showToast('Package created successfully');
      }
      setIsModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (pkg.is_general) {
      showToast('Cannot delete general package');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete package "${pkg.code} - ${pkg.name}"? All associated tasks will be reassigned to the General package.`
      )
    ) {
      return;
    }

    try {
      await api.deletePackage(pkg.id, currentUser?.id);
      showToast('Package deleted');
      refreshData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // Quick project reassignment from card
  const handleQuickProjectChange = async (pkg: Package, newProjId: string) => {
    try {
      await api.updatePackage(pkg.id, {
        project_id: newProjId || undefined,
      }, currentUser?.id);
      const projName = projects.find((p) => p.id === newProjId)?.code || 'Unassigned';
      showToast(`Package "${pkg.code}" moved to ${projName}`);
      refreshData();
    } catch (err: any) {
      showToast(`Failed to update project: ${err.message}`);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filterProjectId === 'UNASSIGNED') {
      return !pkg.project_id && !pkg.is_general;
    }
    if (filterProjectId && filterProjectId !== 'ALL' && pkg.project_id !== filterProjectId && !pkg.is_general) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 overflow-y-auto space-y-2 select-none transition-colors">
      {/* Header */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Box className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              PROCUREMENT PACKAGES & DELIVERABLES
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              {filteredPackages.length} Packages
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Manage equipment packages, vendor document reviews, project assignments, and deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-xs border border-white/20 px-2 py-1 rounded-lg text-xs text-white">
            <FolderGit2 className="w-3.5 h-3.5 text-sky-200 ml-0.5" />
            <select
              value={filterProjectId || 'ALL'}
              onChange={(e) => setFilterProjectId(e.target.value === 'ALL' ? null : e.target.value)}
              className="bg-transparent text-white text-xs font-semibold outline-none pr-1 cursor-pointer"
            >
              <option value="ALL" className="text-slate-900 bg-white">All Projects</option>
              <option value="UNASSIGNED" className="text-slate-900 bg-white">Unassigned Packages</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Package</span>
          </button>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPackages.map((pkg) => {
          const totalTasks = pkg.task_count || 0;
          const doneTasks = pkg.completed_tasks || 0;
          const overdueTasks = pkg.overdue_tasks || 0;
          const openTasks = pkg.open_tasks || 0;
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const project = projects.find((p) => p.id === pkg.project_id);

          return (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div>
                {/* Top Badge Row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded">
                      {pkg.code}
                    </span>

                    {/* Project Selector / Badge */}
                    {!pkg.is_general ? (
                      <select
                        value={pkg.project_id || ''}
                        onChange={(e) => handleQuickProjectChange(pkg, e.target.value)}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 border outline-none cursor-pointer font-mono ${
                          project
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                        title="Change Project Assignment"
                      >
                        <option value="">(No Project)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        General
                      </span>
                    )}

                    {pkg.discipline && (
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                        {pkg.discipline}
                      </span>
                    )}
                  </div>

                  {!pkg.is_general && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                        title="Delete Package"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Package Name */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{pkg.name}</h3>

                {pkg.vendor && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium flex items-center space-x-1">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">Vendor:</span>
                    <span>{pkg.vendor}</span>
                  </div>
                )}

                {pkg.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 font-normal">
                    {pkg.description}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Package Progress</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">OPEN</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{openTasks}</div>
                  </div>
                  <div className={`p-1.5 rounded ${overdueTasks > 0 ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                    <div className={`text-[10px] font-bold uppercase ${overdueTasks > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400 dark:text-slate-500'}`}>
                      OVERDUE
                    </div>
                    <div className={`font-mono font-bold ${overdueTasks > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {overdueTasks}
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1.5 rounded">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">DONE</div>
                    <div className="font-mono font-bold text-emerald-800 dark:text-emerald-200">{doneTasks}</div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => openNewTaskModal(pkg.id, pkg.project_id || undefined)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>

                <button
                  onClick={() => {
                    setFilterPackageId(pkg.id);
                    if (pkg.project_id) setFilterProjectId(pkg.project_id);
                    setActiveView('tasks');
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-2.5 py-1 rounded flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>View Tasks</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-blue-600 dark:bg-slate-800 text-white flex items-center justify-between border-b border-blue-500 dark:border-slate-700">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                {editingPackage ? 'Edit Procurement Package' : 'Create Procurement Package'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Package Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PKG-010"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2.5 py-1.5 font-mono outline-none focus:border-blue-600 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Belongs to Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2 py-1.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="">(No Project / General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gas Turbine Generator Package"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2.5 py-1.5 font-medium outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Process">Process</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Instrumentation">Instrumentation & Control</option>
                    <option value="Civil & Structural">Civil & Structural</option>
                    <option value="Piping">Piping</option>
                    <option value="Safety & Environmental">Safety & Environmental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Vendor / Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Solar Turbines / Baker Hughes"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2.5 py-1.5 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Engineering deliverables, TBE scope, critical interfaces..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 outline-none font-mono focus:border-blue-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer"
                >
                  {loading ? 'Saving...' : editingPackage ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
