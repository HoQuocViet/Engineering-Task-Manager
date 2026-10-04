import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { TaskPriority, TaskType, TaskStatus, INTERFACE_DISCIPLINES, InterfaceDiscipline } from '../../types';
import { getTodayYmd, getDeadlineBadge } from '../../lib/dateUtils';
import { X, Plus, Calendar, Clock, Sparkles, RotateCcw, Loader2, Layers, CheckSquare, Square, Link2, Search, Users } from 'lucide-react';
import { DatePicker } from '../common/DatePicker';
import { PicSelector } from '../common/PicSelector';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultPackageId?: string;
  defaultProjectId?: string;
}

export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultPackageId,
  defaultProjectId,
}) => {
  const { packages, projects, categories, tags, users, currentUser, showToast, filterProjectId, aiSettings } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('TASK');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [discipline, setDiscipline] = useState<InterfaceDiscipline>('Instrument');
  const [projectId, setProjectId] = useState<string>(defaultProjectId || filterProjectId || '');
  const [packageId, setPackageId] = useState<string>(defaultPackageId || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [pics, setPics] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<string>(getTodayYmd());
  const [forecastFinish, setForecastFinish] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isRewordingDesc, setIsRewordingDesc] = useState(false);
  const [previousDescription, setPreviousDescription] = useState<string | null>(null);



  // Multi-Project / Multi-Package mode
  const [isMultiTarget, setIsMultiTarget] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [multiSearchTerm, setMultiSearchTerm] = useState('');

  useEffect(() => {
    if (defaultPackageId) {
      setPackageId(defaultPackageId);
      setSelectedPackageIds([defaultPackageId]);
      const pkg = packages.find((p) => p.id === defaultPackageId);
      if (pkg?.project_id) {
        setProjectId(pkg.project_id);
      }
    }
  }, [defaultPackageId, packages]);

  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else if (filterProjectId) {
      setProjectId(filterProjectId);
    }
  }, [defaultProjectId, filterProjectId]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setAssigneeId(currentUser.id);
    }
    if (isOpen && packageId && selectedPackageIds.length === 0) {
      setSelectedPackageIds([packageId]);
    }
  }, [isOpen, currentUser, packageId]);

  if (!isOpen) return null;

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    if (packageId) {
      const currentPkg = packages.find((p) => p.id === packageId);
      if (currentPkg && currentPkg.project_id && currentPkg.project_id !== newProjectId) {
        setPackageId('');
      }
    }
  };

  const handlePackageChange = (pId: string) => {
    setPackageId(pId);
    if (pId) {
      const pkg = packages.find((p) => p.id === pId);
      if (pkg?.project_id) {
        setProjectId(pkg.project_id);
      }
    }
  };

  // Toggle multi-selection for package
  const togglePackageSelection = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  // Select all packages for a specific project
  const toggleSelectAllProjectPackages = (projId: string) => {
    const projPkgIds = packages.filter((p) => p.project_id === projId).map((p) => p.id);
    const allSelected = projPkgIds.length > 0 && projPkgIds.every((id) => selectedPackageIds.includes(id));

    if (allSelected) {
      setSelectedPackageIds((prev) => prev.filter((id) => !projPkgIds.includes(id)));
    } else {
      setSelectedPackageIds((prev) => Array.from(new Set([...prev, ...projPkgIds])));
    }
  };

  // Filter packages relevant to selected project (or all if no project selected)
  const availablePackages = projectId
    ? packages.filter((p) => !p.project_id || p.project_id === projectId)
    : packages;

  const setDeadlineOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(d.toISOString().split('T')[0]);
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a task title');
      return;
    }

    if (isMultiTarget && selectedPackageIds.length === 0) {
      showToast('⚠️ Please select at least one package or project in Multi-Target mode.');
      return;
    }

    setLoading(true);
    try {
      if (isMultiTarget && selectedPackageIds.length > 1) {
        // Multi-package batch creation
        const res = await api.createTask({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status,
          discipline,
          progress: status === 'DONE' ? 100 : 0,
          pics,
          category_id: categoryId || null,
          assignee_id: assigneeId || currentUser?.id || null,
          deadline: deadline || null,
          forecast_finish: forecastFinish || null,
          tags: selectedTagIds,
          userId: currentUser?.id,
          applicablePackages: selectedPackageIds,
        });

        showToast(`✅ Created ${selectedPackageIds.length} linked tasks sharing Group ID #${res.group_id?.slice(-8) || ''}!`);
      } else {
        // Single task creation
        const targetPkg = isMultiTarget && selectedPackageIds.length === 1 ? selectedPackageIds[0] : (packageId || null);
        let targetProj = projectId || null;
        if (targetPkg) {
          const pkgObj = packages.find((p) => p.id === targetPkg);
          if (pkgObj?.project_id) targetProj = pkgObj.project_id;
        }

        await api.createTask({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status,
          discipline,
          progress: status === 'DONE' ? 100 : 0,
          pics,
          project_id: targetProj,
          package_id: targetPkg,
          category_id: categoryId || null,
          assignee_id: assigneeId || currentUser?.id || null,
          deadline: deadline || null,
          forecast_finish: forecastFinish || null,
          tags: selectedTagIds,
          userId: currentUser?.id,
        });

        showToast('Task created successfully');
      }

      setTitle('');
      setDescription('');
      setSelectedTagIds([]);
      setSelectedPackageIds([]);
      setPics([]);
      setDiscipline('Instrument');
      onCreated();
      onClose();
    } catch (err: any) {
      showToast(`Failed to create task: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTitleWithAI = async () => {
    const rawDesc = description.trim();
    if (!rawDesc) {
      showToast('⚠️ Please enter notes or description in "Notes / Technical Description" first.');
      return;
    }

    try {
      setIsGeneratingTitle(true);
      const activeApiKey =
        aiSettings.provider === 'claude'
          ? aiSettings.claudeApiKey || (aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : '')
          : aiSettings.geminiApiKey || (!aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : '');

      const activeModel =
        aiSettings.provider === 'claude'
          ? aiSettings.claudeModel || 'claude-3-7-sonnet-latest'
          : aiSettings.geminiModel || 'gemini-3.8-flash';

      const prompt = `Based on the following engineering technical description / scope of work, generate a concise, professional engineering task title (max 8-14 words).
Start with an action verb (e.g., Review, Verify, Prepare, Design, Issue, Coordinate, Inspect, Calculate, Update) and specify key equipment, system, or deliverables.
Return ONLY the title text directly with no quotation marks, no markdown formatting, and no conversational filler.

Technical Description:
"${rawDesc}"`;

      const res = await api.chatWithAi({
        message: prompt,
        customApiKey: activeApiKey,
        provider: aiSettings.provider || (activeApiKey?.startsWith('sk-ant-') ? 'claude' : 'gemini'),
        model: activeModel,
        customInstructions: 'You are an expert EPC engineering project assistant. Generate concise, actionable task titles.',
      });

      if (res && res.reply) {
        let cleanTitle = res.reply.trim();
        cleanTitle = cleanTitle.replace(/^["'`*#\s]+|["'`*#\s]+$/g, '');
        const firstLine = cleanTitle.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || cleanTitle;
        cleanTitle = firstLine.replace(/^["'`*#\s]+|["'`*#\s]+$/g, '');

        if (cleanTitle) {
          setTitle(cleanTitle);
          showToast('✨ Task title generated with AI');
        }
      }
    } catch (err: any) {
      console.error('AI Title generation error:', err);
      const isMissingKey = err.message?.includes('NO_API_KEY') || err.message?.includes('API_KEY_INVALID');
      if (isMissingKey) {
        showToast('⚠️ Please configure your AI API Key in Settings > AI Assistant first.');
      } else {
        showToast(`❌ AI Error: ${err.message || 'Unable to generate title'}`);
      }
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleRewordDescriptionWithAI = async () => {
    const rawDesc = description.trim();
    if (!rawDesc || rawDesc.length < 10 || rawDesc.split(/\s+/).length < 3) {
      showToast('⚠️ Please enter notes or draft technical description first (at least 3-4 words).');
      return;
    }

    try {
      setIsRewordingDesc(true);
      const activeApiKey =
        aiSettings.provider === 'claude'
          ? aiSettings.claudeApiKey || (aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : '')
          : aiSettings.geminiApiKey || (!aiSettings.apiKey?.startsWith('sk-ant-') ? aiSettings.apiKey : '');

      const activeModel =
        aiSettings.provider === 'claude'
          ? aiSettings.claudeModel || 'claude-3-7-sonnet-latest'
          : aiSettings.geminiModel || 'gemini-3.8-flash';

      const currentPkg = packages.find((p) => p.id === packageId);
      const pkgCode = currentPkg?.code || currentPkg?.name || '';
      const discipline = currentPkg?.discipline || '';

      const res = await api.rewordDescription({
        draftDescription: rawDesc,
        taskTitle: title.trim(),
        discipline,
        packageCode: pkgCode,
        customApiKey: activeApiKey,
        provider: aiSettings.provider,
        model: activeModel,
      });

      if (res && res.rewordedDescription) {
        setPreviousDescription(rawDesc);
        setDescription(res.rewordedDescription.trim());
        showToast('✨ Notes reworded by AI (Oil & Gas EPCI standard)!');
      }
    } catch (err: any) {
      console.error('AI Reword error:', err);
      const isMissingKey = err.message?.includes('NO_API_KEY') || err.message?.includes('API_KEY_INVALID');
      if (isMissingKey) {
        showToast('⚠️ Please configure your AI API Key in Settings > AI Assistant first.');
      } else {
        showToast(`❌ AI Error: ${err.message || 'Unable to reword description'}`);
      }
    } finally {
      setIsRewordingDesc(false);
    }
  };

  const handleUndoReword = () => {
    if (previousDescription !== null) {
      setDescription(previousDescription);
      setPreviousDescription(null);
      showToast('↩️ Reverted to previous draft notes.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-blue-100 stroke-[2.5]" />
            <h3 className="text-xs font-bold tracking-wide uppercase">Create New Task / Scope</h3>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Task Title / Action Item *
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review vendor valve datasheet for cryogenic service"
                className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateTitleWithAI}
                disabled={isGeneratingTitle}
                title="Auto-generate title from Notes / Technical Description using AI"
                className="shrink-0 h-[34px] px-2.5 rounded-lg bg-gradient-to-r from-[#0b3b70] to-[#1d4ed8] hover:from-[#0d4786] hover:to-[#1e40af] text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingTitle ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-300" />
                )}
                <span>{isGeneratingTitle ? 'Generating...' : 'Use AI'}</span>
              </button>
            </div>
          </div>

          {/* Type, Priority & Discipline Row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Task Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 font-mono text-xs outline-none cursor-pointer"
              >
                <option value="TASK">TASK</option>
                <option value="NOTE">NOTE</option>
                <option value="FOLLOW-UP">FOLLOW-UP</option>
                <option value="MILESTONE">MILESTONE</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={`w-full border rounded-lg px-2 py-1.5 font-medium text-xs outline-none cursor-pointer ${
                  priority === 'CRITICAL'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                    : priority === 'HIGH'
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <option value="CRITICAL">🔴 CRITICAL</option>
                <option value="HIGH">🟠 HIGH</option>
                <option value="MEDIUM">🟡 MEDIUM</option>
                <option value="LOW">⚪ LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Discipline</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as InterfaceDiscipline)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 font-medium text-xs outline-none cursor-pointer"
              >
                {INTERFACE_DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Assignment Toggle & Selectors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Scope Assignment
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextState = !isMultiTarget;
                  setIsMultiTarget(nextState);
                  if (nextState && packageId && !selectedPackageIds.includes(packageId)) {
                    setSelectedPackageIds([packageId]);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                  isMultiTarget
                    ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isMultiTarget ? '✓ Multi-Package Mode (Linked)' : 'Apply to Multiple Packages / Projects'}</span>
              </button>
            </div>

            {isMultiTarget ? (
              <div className="border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 rounded-lg p-2.5 space-y-2 text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={multiSearchTerm}
                      onChange={(e) => setMultiSearchTerm(e.target.value)}
                      placeholder="Filter packages by code or name..."
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allFilteredIds = packages
                          .filter(
                            (p) =>
                              !multiSearchTerm ||
                              p.code.toLowerCase().includes(multiSearchTerm.toLowerCase()) ||
                              p.name.toLowerCase().includes(multiSearchTerm.toLowerCase())
                          )
                          .map((p) => p.id);
                        setSelectedPackageIds(Array.from(new Set([...selectedPackageIds, ...allFilteredIds])));
                      }}
                      className="text-[10px] px-2 py-0.5 bg-sky-100 dark:bg-sky-900 hover:bg-sky-200 text-sky-800 dark:text-sky-200 rounded font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPackageIds([])}
                      className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Grouped packages by project list */}
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-md p-2">
                  {projects.map((proj) => {
                    const projPackages = packages.filter(
                      (p) =>
                        p.project_id === proj.id &&
                        (!multiSearchTerm ||
                          p.code.toLowerCase().includes(multiSearchTerm.toLowerCase()) ||
                          p.name.toLowerCase().includes(multiSearchTerm.toLowerCase()))
                    );
                    if (projPackages.length === 0) return null;

                    const allProjSelected = projPackages.every((p) => selectedPackageIds.includes(p.id));
                    const someProjSelected = projPackages.some((p) => selectedPackageIds.includes(p.id));

                    return (
                      <div key={proj.id} className="space-y-1">
                        <div className="flex items-center justify-between px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-bold">
                          <span className="text-slate-700 dark:text-slate-200">
                            {proj.code} — {proj.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSelectAllProjectPackages(proj.id)}
                            className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            {allProjSelected ? 'Deselect All' : 'Select Project'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                          {projPackages.map((pkg) => {
                            const isChecked = selectedPackageIds.includes(pkg.id);
                            return (
                              <label
                                key={pkg.id}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer transition-colors text-[11px] ${
                                  isChecked
                                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 font-medium'
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePackageSelection(pkg.id)}
                                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                                />
                                <div className="truncate">
                                  <span className="font-mono font-bold text-sky-800 dark:text-sky-300 mr-1">
                                    {pkg.code}
                                  </span>
                                  <span className="truncate">{pkg.name.replace(' Package', '')}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-1">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-sky-600" />
                    <strong>{selectedPackageIds.length}</strong> packages selected across{' '}
                    <strong>
                      {
                        new Set(
                          selectedPackageIds
                            .map((id) => packages.find((p) => p.id === id)?.project_id)
                            .filter(Boolean)
                        ).size
                      }
                    </strong>{' '}
                    projects
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Will create {selectedPackageIds.length} linked records
                  </span>
                </div>
              </div>
            ) : (
              /* Single Project & Package Row */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Belongs to Project</span>
                    {projectId && (
                      <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {projects.find((p) => p.id === projectId)?.code}
                      </span>
                    )}
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 font-medium outline-none truncate cursor-pointer"
                  >
                    <option value="">(No Project / General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Procurement Package</span>
                    {availablePackages.length > 0 && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                        ({availablePackages.length} available)
                      </span>
                    )}
                  </label>
                  <select
                    value={packageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 font-mono outline-none truncate cursor-pointer"
                  >
                    <option value="">General Engineering (No Package)</option>
                    {availablePackages.map((pkg) => {
                      const parentProj = projects.find((p) => p.id === pkg.project_id);
                      return (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.code} - {pkg.name.replace(' Package', '')}
                          {!projectId && parentProj ? ` (${parentProj.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Category Row */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1.5 outline-none truncate text-xs cursor-pointer"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* PIC - Person In Charge */}
          <PicSelector selectedPics={pics} onChange={setPics} />

          {/* Deadline with Quick Shortcuts */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Deadline (Target Date) *</label>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setDeadlineOffset(0)}
                  className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDeadlineOffset(1)}
                  className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDeadlineOffset(7)}
                  className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                >
                  +7 Days
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <DatePicker
                  value={deadline}
                  onChange={(val) => setDeadline(val)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div>
                <DatePicker
                  value={forecastFinish}
                  onChange={(val) => setForecastFinish(val)}
                  placeholder="Forecast (opt)"
                />
              </div>
            </div>
            {deadline && (
              <div className={`text-[10px] mt-1.5 px-2 py-0.5 rounded border flex items-center space-x-1 font-medium ${getDeadlineBadge(deadline, status, forecastFinish).bgClass} ${getDeadlineBadge(deadline, status, forecastFinish).colorClass} ${getDeadlineBadge(deadline, status, forecastFinish).borderClass}`}>
                <Clock className="w-3 h-3 shrink-0" />
                <span>{getDeadlineBadge(deadline, status, forecastFinish).fullDescription}</span>
              </div>
            )}
          </div>

          {/* Description / Notes */}
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Notes / Technical Description
              </label>
              <div className="flex items-center space-x-1.5">
                {previousDescription !== null && (
                  <button
                    type="button"
                    onClick={handleUndoReword}
                    className="text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Undo rewording and revert to previous draft notes"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-slate-400" />
                    <span>Undo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRewordDescriptionWithAI}
                  disabled={isRewordingDesc}
                  title="Reword purely technically in Oil & Gas EPCI industry standard using AI"
                  className="px-2 py-0.5 rounded-md bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white text-[10px] font-semibold flex items-center space-x-1 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRewordingDesc ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                      <span>Rewording...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-2.5 h-2.5 text-sky-200" />
                      <span>Reword by AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key specifications, drawing numbers, equipment tags, references... Click 'Reword by AI' to elevate into Oil & Gas EPCI standard."
              className="w-full text-xs font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 focus:border-blue-600 outline-none leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {tags.map((tg) => {
                const isSelected = selectedTagIds.includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    type="button"
                    onClick={() => handleToggleTag(tg.id)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0b3b70] text-white border-[#0b3b70] font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    #{tg.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-semibold rounded-lg shadow-xs flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Creating...' : 'Save Task (< 20s)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
