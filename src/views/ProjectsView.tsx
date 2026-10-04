import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Project, Package, Task, TaskStatus } from '../types';
import { api } from '../lib/api';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import {
  FolderGit2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Box,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  X,
  Link2,
  Unlink,
  ExternalLink,
  ListTodo,
  Upload,
  Image as ImageIcon,
  Camera,
  Sparkles,
} from 'lucide-react';
import { formatDateDisplay, getDeadlineBadge } from '../lib/dateUtils';
import { DatePicker } from '../components/common/DatePicker';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    packages,
    dataVersion,
    refreshData,
    showToast,
    isAdmin,
    currentUser,
    setActiveView,
    setFilterProjectId,
    setFilterPackageId,
    setSelectedTaskId,
    openNewTaskModal,
    workspaceBranding,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Detail state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Quick Logo Update Modal for specific project
  const [logoModalProject, setLogoModalProject] = useState<Project | null>(null);
  const [quickLogoUrl, setQuickLogoUrl] = useState('');
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Quick Package Creation Modal for a specific project
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [newPkgCode, setNewPkgCode] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgDiscipline, setNewPkgDiscipline] = useState('Instrument');
  const [newPkgVendor, setNewPkgVendor] = useState('');
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [selectedAssignPackageId, setSelectedAssignPackageId] = useState('');

  // Form states for project
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    client: '',
    logo: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED',
    startDate: '',
    endDate: '',
    selectedInitialPackages: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickLogoFileInputRef = useRef<HTMLInputElement>(null);

  // Load project tasks when a project is selected
  const fetchProjectTasks = useCallback(async (projId: string) => {
    setLoadingTasks(true);
    try {
      const data = await api.getProject(projId);
      setProjectTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching project tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectTasks(selectedProjectId);
    }
  }, [selectedProjectId, dataVersion, fetchProjectTasks]);

  const openProjectModal = (proj: Project) => {
    setSelectedProjectId(proj.id);
    fetchProjectTasks(proj.id);
  };

  const closeProjectModal = () => {
    setSelectedProjectId(null);
    setProjectTasks([]);
  };

  // Unassigned packages available for assignment
  const unassignedPackages = packages.filter((p) => !p.project_id && !p.is_general);

  // Handle Logo file select/drop in Create/Edit Form
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WEBP)');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      showToast('Image file size must be less than 2.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Reset form when modal opens
  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      client: '',
      logo: '',
      description: '',
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      selectedInitialPackages: [],
    });
    setEditingProject(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      code: proj.code,
      client: proj.client || '',
      logo: proj.logo || '',
      description: proj.description || '',
      status: proj.status || 'ACTIVE',
      startDate: proj.start_date || '',
      endDate: proj.end_date || '',
      selectedInitialPackages: [],
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Project name is required');
      return;
    }
    if (!formData.code.trim()) {
      showToast('Project code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          client: formData.client.trim() || undefined,
          logo: formData.logo.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
          start_date: formData.startDate || undefined,
          end_date: formData.endDate || undefined,
        }, currentUser?.id);
        showToast(`Project "${formData.code}" updated successfully`);
      } else {
        const res = await api.createProject({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          client: formData.client.trim() || undefined,
          logo: formData.logo.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
          start_date: formData.startDate || undefined,
          end_date: formData.endDate || undefined,
          ...(formData.selectedInitialPackages.length > 0 ? { packageIds: formData.selectedInitialPackages } as any : {}),
        }, currentUser?.id);

        // Assign selected packages if any
        if (formData.selectedInitialPackages.length > 0 && res.id) {
          for (const pId of formData.selectedInitialPackages) {
            try {
              await api.assignPackageToProject(res.id, pId);
            } catch (pErr) {
              console.error(pErr);
            }
          }
        }
        showToast(`Project "${formData.code}" created successfully with ${formData.selectedInitialPackages.length} package(s)`);
      }

      setIsCreateModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    setIsSubmitting(true);
    try {
      await api.deleteProject(deletingProject.id, currentUser?.id);
      showToast(`Project "${deletingProject.code}" deleted successfully`);
      if (selectedProject?.id === deletingProject.id) {
        closeProjectModal();
      }
      setDeletingProject(null);
      await refreshData();
    } catch (err: any) {
      showToast(`Error deleting project: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign existing package to selected project
  const handleAssignPackage = async () => {
    if (!selectedProject || !selectedAssignPackageId) return;
    try {
      await api.assignPackageToProject(selectedProject.id, selectedAssignPackageId);
      showToast('Package assigned to project successfully');
      setSelectedAssignPackageId('');
      await refreshData();
      fetchProjectTasks(selectedProject.id);
    } catch (err: any) {
      showToast(`Failed to assign package: ${err.message}`);
    }
  };

  // Remove / Unlink package from selected project
  const handleRemovePackage = async (packageId: string, pkgName: string) => {
    if (!selectedProject) return;
    if (!confirm(`Unlink package "${pkgName}" from this project? The package will become General.`)) return;
    try {
      await api.removePackageFromProject(selectedProject.id, packageId);
      showToast('Package unlinked from project');
      await refreshData();
      fetchProjectTasks(selectedProject.id);
    } catch (err: any) {
      showToast(`Failed to remove package: ${err.message}`);
    }
  };

  // Create new package directly inside selected project
  const handleCreatePackageForProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!newPkgCode.trim() || !newPkgName.trim()) {
      showToast('Package code and name are required');
      return;
    }
    try {
      await api.createPackage({
        code: newPkgCode.trim().toUpperCase(),
        name: newPkgName.trim(),
        project_id: selectedProject.id,
        discipline: newPkgDiscipline,
        vendor: newPkgVendor.trim() || undefined,
        description: newPkgDesc.trim() || undefined,
      }, currentUser?.id);

      showToast(`Package "${newPkgCode.toUpperCase()}" created and assigned to ${selectedProject.code}`);
      setIsAddPackageModalOpen(false);
      setNewPkgCode('');
      setNewPkgName('');
      setNewPkgVendor('');
      setNewPkgDesc('');
      await refreshData();
      fetchProjectTasks(selectedProject.id);
    } catch (err: any) {
      showToast(`Error creating package: ${err.message}`);
    }
  };

  // Open Quick Logo Modal
  const openLogoModal = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLogoModalProject(proj);
    setQuickLogoUrl(proj.logo || '');
  };

  const closeLogoModal = () => {
    setLogoModalProject(null);
    setQuickLogoUrl('');
  };

  const handleSaveQuickLogo = async (logoValue?: string) => {
    if (!logoModalProject) return;
    const finalLogo = logoValue !== undefined ? logoValue : quickLogoUrl.trim();
    setIsSavingLogo(true);
    try {
      await api.updateProjectLogo(logoModalProject.id, finalLogo || null);
      showToast(`Logo updated for project "${logoModalProject.code}"`);
      closeLogoModal();
      await refreshData();
    } catch (err: any) {
      showToast(`Failed to update logo: ${err.message}`);
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleQuickLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WEBP)');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      showToast('Image file size must be less than 2.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setQuickLogoUrl(base64);
      if (logoModalProject) {
        await handleSaveQuickLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper for consistent status select styling
  const getStatusSelectStyle = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100';
      case 'IN PROGRESS':
        return 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100';
      case 'WAITING':
        return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
      case 'ON HOLD':
        return 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-400 border-slate-300 hover:bg-slate-200';
      case 'TODO':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100';
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTask(taskId, {
        status: newStatus,
        progress: newStatus === 'DONE' ? 100 : undefined,
        userId: currentUser?.id,
      });
      showToast('Task updated');
      if (selectedProject) fetchProjectTasks(selectedProject.id);
      refreshData();
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.client && p.client.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-1 space-y-1.5 overflow-hidden select-none transition-colors">
      {/* Header */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <FolderGit2 className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              ENGINEERING PROJECTS
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              {projects.length} Projects
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Manage projects, allocate procurement packages, and assign tasks to projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 transition-colors shadow-xs">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects by name, code or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid / List */}
      <div className="flex-1 overflow-y-auto p-1">
        {filteredProjects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
            <FolderGit2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Projects Found</div>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {search ? 'Try clearing your search query or filters.' : 'Create your first engineering project to organize procurement packages and engineering tasks.'}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded cursor-pointer"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const projectPackages = packages.filter((p) => p.project_id === project.id);
              const progress = Math.round(project.avg_progress || 0);

              return (
                <div
                  key={project.id}
                  onClick={() => openProjectModal(project)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Top Bar: Code, Status & Actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            project.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : project.status === 'ON_HOLD'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : project.status === 'COMPLETED'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openLogoModal(project, e)}
                          className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                          title="Update Project Logo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => openEditModal(project, e)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                          title="Edit Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProject(project);
                          }}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Logo & Project Info Section */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Project Logo Frame */}
                      <div
                        onClick={(e) => openLogoModal(project, e)}
                        className="w-13 h-13 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 relative group/logo cursor-pointer hover:border-blue-400 transition-all p-1 shadow-xs"
                        title="Click to update project logo"
                      >
                        {project.logo ? (
                          <img
                            src={project.logo}
                            alt={project.name}
                            className="w-full h-full object-contain rounded"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full rounded bg-gradient-to-br from-blue-50 to-slate-100 dark:from-blue-950 dark:to-slate-800 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px]">
                            <FolderGit2 className="w-4 h-4 text-blue-500 mb-0.5" />
                            <span>{(project.code || 'PRJ').slice(0, 3)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/70 text-white flex flex-col items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity rounded">
                          <Camera className="w-4 h-4 text-white" />
                          <span className="text-[8px] font-bold mt-0.5">Logo</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {project.name}
                        </h3>
                        {project.client && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">Client: {project.client}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}

                    {/* Project Schedule (Start & End Date) */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-slate-100 dark:border-slate-700/60 mb-3 font-medium">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-slate-400 dark:text-slate-500">Start:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                          {project.start_date ? formatDateDisplay(project.start_date) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-400 dark:text-slate-500">End:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                          {project.end_date ? formatDateDisplay(project.end_date) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Progress</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            progress === 100
                              ? 'bg-emerald-500'
                              : progress >= 60
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-100 dark:border-slate-700/60 text-center mb-4">
                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">Packages</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {project.package_count ?? projectPackages.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">Done</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {project.done_tasks ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">Overdue</div>
                        <div className={`text-sm font-bold font-mono ${(project.overdue_tasks || 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                          {project.overdue_tasks ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Box className="w-3.5 h-3.5 text-slate-400" />
                      <span>{projectPackages.length} Packages</span>
                    </span>

                    <span className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition-colors">
                      <span>Manage Project</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Details Modal / Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-900 dark:to-slate-800 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Project Logo Frame in Modal Header */}
                <div
                  onClick={() => openLogoModal(selectedProject)}
                  className="w-12 h-12 rounded-lg bg-blue-950/60 dark:bg-slate-800 border border-blue-400/40 dark:border-slate-700 p-1 shrink-0 flex items-center justify-center relative group/headlogo cursor-pointer hover:border-white transition-all shadow-inner"
                  title="Click to update project logo"
                >
                  {selectedProject.logo ? (
                    <img
                      src={selectedProject.logo}
                      alt={selectedProject.name}
                      className="w-full h-full object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded bg-blue-900/40 flex flex-col items-center justify-center text-blue-200 font-mono font-bold text-[10px]">
                      <FolderGit2 className="w-5 h-5 text-blue-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/80 text-white flex flex-col items-center justify-center opacity-0 group-hover/headlogo:opacity-100 transition-opacity rounded">
                    <Camera className="w-4 h-4 text-blue-300" />
                    <span className="text-[7px] font-bold mt-0.5 uppercase tracking-wider">Change</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold bg-white text-blue-800 px-2 py-0.5 rounded shadow-xs">
                      {selectedProject.code}
                    </span>
                    <button
                      onClick={() => openLogoModal(selectedProject)}
                      className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{selectedProject.logo ? 'Change Logo' : 'Upload Logo'}</span>
                    </button>
                  </div>
                  <h2 className="text-base font-bold text-white leading-tight truncate">
                    {selectedProject.name}
                  </h2>
                  {selectedProject.client && (
                    <div className="text-xs text-blue-100 dark:text-slate-400 truncate">
                      Client: {selectedProject.client}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilterProjectId(selectedProject.id);
                    setFilterPackageId(null);
                    setActiveView('tasks');
                  }}
                  className="bg-white hover:bg-blue-50 text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Task Board</span>
                </button>
                <button
                  onClick={closeProjectModal}
                  className="text-blue-200 hover:text-white p-1 rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
              {/* Overview & Progress Header */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedProject.status}</span>
                      {selectedProject.start_date && (
                        <span className="text-slate-400 ml-2">
                          Start: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatDateDisplay(selectedProject.start_date)}</strong>
                        </span>
                      )}
                      {selectedProject.end_date && (
                        <span className="text-slate-400 ml-2">
                          End: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatDateDisplay(selectedProject.end_date)}</strong>
                        </span>
                      )}
                    </div>
                    {selectedProject.description && (
                      <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">{selectedProject.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Overall Progress</div>
                      <div className="text-lg font-bold font-mono text-blue-600">
                        {Math.round(selectedProject.avg_progress || 0)}%
                      </div>
                    </div>
                    <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.round(selectedProject.avg_progress || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Packages Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Procurement Packages ({packages.filter((p) => p.project_id === selectedProject.id).length})
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Assign Existing Package Dropdown */}
                    {unassignedPackages.length > 0 && (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedAssignPackageId}
                          onChange={(e) => setSelectedAssignPackageId(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs outline-none max-w-[180px] truncate"
                        >
                          <option value="">+ Assign Existing Package...</option>
                          {unassignedPackages.map((upkg) => (
                            <option key={upkg.id} value={upkg.id}>
                              {upkg.code} - {upkg.name}
                            </option>
                          ))}
                        </select>
                        {selectedAssignPackageId && (
                          <button
                            onClick={handleAssignPackage}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded text-xs cursor-pointer"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    )}

                    {/* Add New Package Button */}
                    <button
                      onClick={() => setIsAddPackageModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Package</span>
                    </button>
                  </div>
                </div>

                {/* Package Cards List */}
                {packages.filter((p) => p.project_id === selectedProject.id).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded border border-dashed border-slate-200 dark:border-slate-700">
                    No procurement packages assigned to this project yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {packages
                      .filter((p) => p.project_id === selectedProject.id)
                      .map((pkg) => (
                        <div
                          key={pkg.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">
                                {pkg.code}
                              </span>
                              <div className="flex items-center gap-1">
                                {pkg.discipline && (
                                  <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                                    {pkg.discipline}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleRemovePackage(pkg.id, pkg.name)}
                                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                  title="Unlink from project"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{pkg.name}</h4>
                            {pkg.vendor && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Vendor: <strong className="text-slate-700 dark:text-slate-300">{pkg.vendor}</strong>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 font-mono">
                              {pkg.task_count || 0} tasks ({pkg.completed_tasks || 0} done)
                            </span>
                            <button
                              onClick={() => openNewTaskModal(pkg.id, selectedProject.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Task</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Tasks Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Tasks in this Project ({projectTasks.length})
                    </h3>
                  </div>

                  <button
                    onClick={() => openNewTaskModal(undefined, selectedProject.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Task to Project</span>
                  </button>
                </div>

                {loadingTasks ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500">Loading project tasks...</div>
                ) : projectTasks.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded border border-dashed border-slate-200 dark:border-slate-700">
                    No engineering tasks logged for this project yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden max-h-72 overflow-y-auto">
                    {projectTasks.map((t) => {
                      const deadlineInfo = getDeadlineBadge(t.deadline, t.status, t.forecast_finish);
                      const isDone = t.status === 'DONE';

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                t.priority === 'CRITICAL'
                                  ? 'bg-rose-500'
                                  : t.priority === 'HIGH'
                                  ? 'bg-orange-500'
                                  : t.priority === 'MEDIUM'
                                  ? 'bg-yellow-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <div className="truncate">
                              <span className={`font-semibold ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                {t.title}
                              </span>
                              {t.package_name && (
                                <span className="ml-2 font-mono text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                  {t.package_code || t.package_name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Standardized Status Box (w-28 h-6) */}
                            <select
                              value={t.status}
                              onChange={(e) => handleQuickStatusChange(t.id, e.target.value as TaskStatus)}
                              className={`w-28 h-6 text-[10px] py-0 px-2 rounded border font-mono font-bold uppercase outline-none cursor-pointer text-center select-none shrink-0 transition-colors ${getStatusSelectStyle(
                                t.status
                              )}`}
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN PROGRESS">IN PROGRESS</option>
                              <option value="WAITING">WAITING</option>
                              <option value="ON HOLD">ON HOLD</option>
                              <option value="DONE">DONE</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>

                            {/* Standardized Deadline Box (w-26 h-6) */}
                            {t.deadline ? (
                              <span
                                title={deadlineInfo.fullDescription}
                                className={`w-26 h-6 inline-flex items-center justify-center space-x-1 text-[10px] px-1.5 py-0.5 rounded border font-mono leading-none text-center select-none shrink-0 ${
                                  isDone
                                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                    : `${deadlineInfo.bgClass} ${deadlineInfo.colorClass} ${deadlineInfo.borderClass}`
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{deadlineInfo.label}</span>
                              </span>
                            ) : (
                              <span className="w-26 h-6 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-mono select-none shrink-0">
                                No date
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-300 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-6 py-4 border-b border-blue-800/40 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-900 dark:to-slate-800 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-blue-200" />
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {editingProject ? `Edit Project: ${editingProject.code}` : 'Create New Engineering Project'}
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Project Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-B01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block B Gas Processing Facility"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">Client / Owner</label>
                  <input
                    type="text"
                    placeholder="e.g. PetroVietnam / Murphy Oil"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">Start Date</label>
                  <DatePicker
                    value={formData.startDate}
                    onChange={(val) => setFormData({ ...formData, startDate: val })}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">Target End Date</label>
                  <DatePicker
                    value={formData.endDate}
                    onChange={(val) => setFormData({ ...formData, endDate: val })}
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              </div>

              {/* Project Logo / Branding Frame Section */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 dark:text-slate-200 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Project Logo / Visual Emblem</span>
                  </label>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: '' })}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Logo Preview Frame */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-500 flex flex-col items-center justify-center p-1 cursor-pointer transition-colors relative group shrink-0 overflow-hidden"
                    title="Click to upload logo image"
                  >
                    {formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 group-hover:text-blue-500 text-center">
                        <Upload className="w-5 h-5 mb-0.5" />
                        <span className="text-[8px] font-bold uppercase">Upload</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <Camera className="w-4 h-4 text-white" />
                      <span className="text-[7px] font-bold mt-0.5">Browse</span>
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Choose Image File...</span>
                      </button>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">PNG, JPG, SVG, WEBP</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Or paste direct image URL (https://...)"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of project engineering scope, facilities, discipline details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Initial package assignment for new project */}
              {!editingProject && unassignedPackages.length > 0 && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] mb-1">
                    Attach Initial Packages (Optional)
                  </label>
                  <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-2 space-y-1 bg-slate-50 dark:bg-slate-800/50">
                    {unassignedPackages.map((pkg) => {
                      const isChecked = formData.selectedInitialPackages.includes(pkg.id);
                      return (
                        <label key={pkg.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedInitialPackages: [...formData.selectedInitialPackages, pkg.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedInitialPackages: formData.selectedInitialPackages.filter((id) => id !== pkg.id),
                                });
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-mono font-bold text-[11px] text-blue-700 dark:text-blue-400">{pkg.code}</span>
                          <span className="truncate">{pkg.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded font-medium cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Package Modal to Selected Project */}
      {isAddPackageModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-300 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-900 dark:to-slate-800 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-wide">
                  Add Package to {selectedProject.code}
                </h3>
              </div>
              <button
                onClick={() => setIsAddPackageModalOpen(false)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePackageForProject} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Package Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PK-301"
                    value={newPkgCode}
                    onChange={(e) => setNewPkgCode(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono uppercase bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Discipline
                  </label>
                  <select
                    value={newPkgDiscipline}
                    onChange={(e) => setNewPkgDiscipline(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="Instrument">Instrument</option>
                    <option value="Process">Process</option>
                    <option value="Piping">Piping</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil & Structural">Civil & Structural</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flare Gas Recovery Package"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Vendor / Supplier
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Zink Hamworthy"
                  value={newPkgVendor}
                  onChange={(e) => setNewPkgVendor(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Datasheet, TBE, P&ID review..."
                  value={newPkgDesc}
                  onChange={(e) => setNewPkgDesc(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 outline-none font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPackageModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer"
                >
                  Create & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Project Logo Modal */}
      {logoModalProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-900 dark:to-slate-800 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-200" />
                <h3 className="text-xs font-bold uppercase tracking-wide">
                  Update Logo: {logoModalProject.code}
                </h3>
              </div>
              <button
                onClick={closeLogoModal}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                {/* Preview Frame */}
                <div
                  onClick={() => quickLogoFileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-500 flex flex-col items-center justify-center p-1 cursor-pointer transition-colors relative group shrink-0 overflow-hidden"
                  title="Click to browse new image"
                >
                  {quickLogoUrl ? (
                    <img
                      src={quickLogoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 group-hover:text-blue-500 text-center">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-bold uppercase">Upload</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[8px] font-bold mt-0.5">Browse</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                      {logoModalProject.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload high-res PNG, SVG, JPG or WEBP logo (max 2.5MB).
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={quickLogoFileInputRef}
                    accept="image/*"
                    onChange={handleQuickLogoFileSelect}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => quickLogoFileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image File</span>
                    </button>

                    {quickLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setQuickLogoUrl('')}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-semibold px-2 py-1 text-xs cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Or Direct Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={quickLogoUrl}
                  onChange={(e) => setQuickLogoUrl(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {logoModalProject.logo && (
                    <button
                      type="button"
                      onClick={() => handleSaveQuickLogo('')}
                      disabled={isSavingLogo}
                      className="text-rose-600 dark:text-rose-400 hover:underline text-xs font-semibold cursor-pointer"
                    >
                      Remove Current Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeLogoModal}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveQuickLogo()}
                    disabled={isSavingLogo}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingLogo ? 'Saving...' : 'Save Logo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Project?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to delete project <strong className="text-slate-900 dark:text-slate-100">{deletingProject.name} ({deletingProject.code})</strong>?
              Packages and tasks associated with this project will be unassigned from the project rather than permanently destroyed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingProject(null)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-medium rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
