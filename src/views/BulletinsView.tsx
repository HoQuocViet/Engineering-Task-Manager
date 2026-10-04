import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  BulletinResource,
  BulletinResourceType,
  BulletinStatus,
  BulletinAnnouncement,
  BulletinFilterOptions,
  INTERFACE_DISCIPLINES,
  Task,
} from '../types';
import {
  Bookmark,
  Pin,
  ExternalLink,
  Copy,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Folder,
  FileText,
  FileSpreadsheet,
  Globe,
  Users,
  HardDrive,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  X,
  Layers,
  ChevronRight,
  Info,
  Check,
  Loader2,
  ShieldAlert,
  Megaphone,
} from 'lucide-react';
import { formatDateDisplay, getTodayYmd } from '../lib/dateUtils';
import { DatePicker } from '../components/common/DatePicker';

// Resource Type configuration with icons and styling
export const RESOURCE_TYPE_CONFIG: Record<
  BulletinResourceType,
  { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }
> = {
  GOOGLE_SHEET: {
    label: 'Google Sheet',
    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  GOOGLE_DOCS: {
    label: 'Google Docs',
    icon: <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  SHAREPOINT: {
    label: 'SharePoint',
    icon: <Folder className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  TEAMS: {
    label: 'Teams',
    icon: <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  VENDOR_PORTAL: {
    label: 'Vendor Portal',
    icon: <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  NETWORK_FOLDER: {
    label: 'Network Folder',
    icon: <HardDrive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  LOCAL_FOLDER: {
    label: 'Local Folder',
    icon: <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  NETWORK_FILE: {
    label: 'Network File',
    icon: <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  LOCAL_FILE: {
    label: 'Local File',
    icon: <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-700',
  },
  WEB_URL: {
    label: 'Web URL',
    icon: <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
    color: 'text-sky-700 dark:text-sky-300',
    bgColor: 'bg-sky-50 dark:bg-sky-950/50',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
  OTHER: {
    label: 'Other',
    icon: <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-50 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
};

export const QUICK_FILTERS = [
  { id: 'ALL', label: 'ALL' },
  { id: 'PINNED', label: 'PINNED' },
  { id: 'SHEETS', label: 'SHEETS' },
  { id: 'DOCS', label: 'DOCS' },
  { id: 'SHAREPOINT', label: 'SHAREPOINT' },
  { id: 'TEAMS', label: 'TEAMS' },
  { id: 'WEB', label: 'WEB' },
  { id: 'FOLDERS', label: 'FOLDERS' },
  { id: 'FILES', label: 'FILES' },
];

export const BulletinsView: React.FC = () => {
  const { projects, packages, showToast, setSelectedTaskId } = useApp();

  // Primary list state
  const [resources, setResources] = useState<BulletinResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [reviewRequiredCount, setReviewRequiredCount] = useState(0);

  // Announcements
  const [announcements, setAnnouncements] = useState<BulletinAnnouncement[]>([]);
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('ALL');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [sortOption, setSortOption] = useState<string>('pinned');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<BulletinResource | null>(null);
  const [selectedResourceForDetails, setSelectedResourceForDetails] = useState<BulletinResource | null>(null);
  const [supersededNoticeResource, setSupersededNoticeResource] = useState<BulletinResource | null>(null);

  // Form states for Add/Edit
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDocTitle, setFormDocTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState<BulletinResourceType>('WEB_URL');
  const [formDescription, setFormDescription] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formPackageId, setFormPackageId] = useState('');
  const [formDiscipline, setFormDiscipline] = useState('Instrument');
  const [formOwner, setFormOwner] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPriority, setFormPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [formPinned, setFormPinned] = useState(false);
  const [formStatus, setFormStatus] = useState<BulletinStatus>('ACTIVE');
  const [formNextReview, setFormNextReview] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReplacementId, setFormReplacementId] = useState('');
  const [isDetectingTitle, setIsDetectingTitle] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const data = await api.getBulletinAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load bulletin announcements:', err);
    }
  };

  // Fetch resources
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BulletinFilterOptions = {
        search: search.trim() || undefined,
        type: activeQuickFilter !== 'ALL' ? activeQuickFilter : undefined,
        projectId: selectedProjectId !== 'ALL' ? selectedProjectId : undefined,
        packageId: selectedPackageId !== 'ALL' ? selectedPackageId : undefined,
        discipline: selectedDiscipline !== 'ALL' ? selectedDiscipline : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sort: sortOption,
      };

      const result = await api.getBulletins(filters);
      setResources(result.resources);
      setTotalCount(result.total);
      setPinnedCount(result.pinnedCount);
      setRecentCount(result.recentCount);
      setReviewRequiredCount(result.reviewRequiredCount);
    } catch (err: any) {
      console.error('Failed to load bulletins:', err);
      showToast(`Error: ${err.message || 'Could not load resources'}`);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    activeQuickFilter,
    selectedProjectId,
    selectedPackageId,
    selectedDiscipline,
    statusFilter,
    sortOption,
    showToast,
  ]);

  useEffect(() => {
    fetchResources();
    fetchAnnouncements();
  }, [fetchResources]);

  // Pinned resources list (quick cards)
  const pinnedResources = useMemo(() => {
    return resources.filter((r) => r.pinned && r.status === 'ACTIVE').slice(0, 6);
  }, [resources]);

  // Recently used resources
  const recentResources = useMemo(() => {
    return resources
      .filter((r) => r.last_opened && r.status === 'ACTIVE')
      .sort((a, b) => (b.last_opened || '').localeCompare(a.last_opened || ''))
      .slice(0, 5);
  }, [resources]);

  // Handle Copy Location
  const handleCopy = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(resource.location);
      showToast(`Copied to clipboard: ${resource.location.slice(0, 45)}...`);
      // Record copy usage on server
      await api.copyBulletin(resource.id);
      // Optimistically update open count
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, open_count: r.open_count + 1 } : r))
      );
    } catch {
      showToast('Copied to clipboard.');
    }
  };

  // Handle Open Resource
  const handleOpen = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Check if superseded
    if (resource.status === 'SUPERSEDED' && resource.replacement_resource_id) {
      setSupersededNoticeResource(resource);
      return;
    }

    await executeOpen(resource);
  };

  const executeOpen = async (resource: BulletinResource) => {
    try {
      const isWeb = [
        'WEB_URL',
        'GOOGLE_SHEET',
        'GOOGLE_DOCS',
        'SHAREPOINT',
        'TEAMS',
        'VENDOR_PORTAL',
      ].includes(resource.resource_type);

      if (isWeb) {
        // Open web link in new tab
        window.open(resource.location, '_blank', 'noopener,noreferrer');
        showToast(`Opening ${resource.display_name}...`);
        await api.openBulletin(resource.id);
      } else {
        // Local / Network file or folder
        const res = await api.openBulletin(resource.id);
        if (res.opened) {
          showToast(`Opening: ${resource.display_name}`);
        } else {
          // Informative fallback
          await navigator.clipboard.writeText(resource.location);
          showToast(`Network/Local path copied to clipboard. Paste into Windows Explorer to view.`);
        }
      }

      // Update local state
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id
            ? { ...r, open_count: r.open_count + 1, last_opened: new Date().toISOString() }
            : r
        )
      );
    } catch (err: any) {
      showToast(`Failed to open: ${err.message}`);
    }
  };

  // Handle Toggle Pin
  const handleTogglePin = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const result = await api.pinBulletin(resource.id);
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, pinned: result.pinned } : r))
      );
      showToast(result.pinned ? `Pinned ${resource.display_name}` : `Unpinned ${resource.display_name}`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle Archive / Restore
  const handleArchive = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.archiveBulletin(resource.id);
      showToast(`Archived ${resource.display_name}`);
      fetchResources();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleRestore = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.restoreBulletin(resource.id);
      showToast(`Restored ${resource.display_name} to active list`);
      fetchResources();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle Delete
  const handleDelete = async (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Permanently delete resource "${resource.display_name}"?`)) return;
    try {
      await api.deleteBulletin(resource.id);
      showToast(`Deleted ${resource.display_name}`);
      fetchResources();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Handle Open Create / Edit Modal
  const openCreateModal = () => {
    setEditingResource(null);
    setFormDisplayName('');
    setFormDocTitle('');
    setFormLocation('');
    setFormType('WEB_URL');
    setFormDescription('');
    setFormProjectId(selectedProjectId !== 'ALL' ? selectedProjectId : '');
    setFormPackageId(selectedPackageId !== 'ALL' ? selectedPackageId : '');
    setFormDiscipline(selectedDiscipline !== 'ALL' ? selectedDiscipline : 'Instrument');
    setFormOwner('Ho Quoc Viet (Me)');
    setFormTags('');
    setFormPriority('NORMAL');
    setFormPinned(false);
    setFormStatus('ACTIVE');
    setFormNextReview('');
    setFormNotes('');
    setFormReplacementId('');
    setDuplicateWarning(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (resource: BulletinResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingResource(resource);
    setFormDisplayName(resource.display_name);
    setFormDocTitle(resource.document_title || '');
    setFormLocation(resource.location);
    setFormType(resource.resource_type);
    setFormDescription(resource.description || '');
    setFormProjectId(resource.project_id || '');
    setFormPackageId(resource.package_id || '');
    setFormDiscipline(resource.discipline || 'Instrument');
    setFormOwner(resource.owner || '');
    setFormTags(Array.isArray(resource.tags) ? resource.tags.join(', ') : '');
    setFormPriority(resource.priority || 'NORMAL');
    setFormPinned(Boolean(resource.pinned));
    setFormStatus(resource.status || 'ACTIVE');
    setFormNextReview(resource.next_review || '');
    setFormNotes(resource.notes || '');
    setFormReplacementId(resource.replacement_resource_id || '');
    setDuplicateWarning(null);
    setIsCreateModalOpen(true);
  };

  // Auto-classify resource type on location change
  const handleLocationChange = (val: string) => {
    setFormLocation(val);
    const loc = val.trim();
    if (!loc) return;

    if (loc.includes('docs.google.com/spreadsheets')) setFormType('GOOGLE_SHEET');
    else if (loc.includes('docs.google.com/document') || loc.includes('docs.google.com/presentation')) setFormType('GOOGLE_DOCS');
    else if (loc.includes('sharepoint.com')) setFormType('SHAREPOINT');
    else if (loc.includes('teams.microsoft.com')) setFormType('TEAMS');
    else if (loc.startsWith('\\\\') || loc.startsWith('//')) {
      const last = loc.split(/[\\/]/).pop() || '';
      setFormType(/\.[a-zA-Z0-9]{2,5}$/.test(last) ? 'NETWORK_FILE' : 'NETWORK_FOLDER');
    } else if (/^[a-zA-Z]:[\\/]/.test(loc) || loc.startsWith('/')) {
      const last = loc.split(/[\\/]/).pop() || '';
      setFormType(/\.[a-zA-Z0-9]{2,5}$/.test(last) ? 'LOCAL_FILE' : 'LOCAL_FOLDER');
    } else if (/^https?:\/\//i.test(loc)) {
      if (loc.toLowerCase().includes('vendor') || loc.toLowerCase().includes('portal')) setFormType('VENDOR_PORTAL');
      else setFormType('WEB_URL');
    }
  };

  // Auto-detect title from web URL
  const handleAutoDetectTitle = async () => {
    if (!formLocation || !/^https?:\/\//i.test(formLocation)) {
      showToast('Please enter a valid HTTP/HTTPS URL first');
      return;
    }
    setIsDetectingTitle(true);
    try {
      const res = await api.detectBulletinTitle(formLocation);
      if (res.title) {
        setFormDocTitle(res.title);
        if (!formDisplayName.trim()) {
          setFormDisplayName(res.title);
        }
        showToast('Document title detected successfully!');
      } else {
        showToast('Could not extract title automatically. You can enter it manually.');
      }
      if (res.detectedType) {
        setFormType(res.detectedType as BulletinResourceType);
      }
    } catch {
      showToast('Title detection unavailable for this URL. User display name will be used.');
    } finally {
      setIsDetectingTitle(false);
    }
  };

  // Save form handler
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim()) {
      showToast('Display Name is required');
      return;
    }
    if (!formLocation.trim()) {
      showToast('Location is required');
      return;
    }

    setFormSubmitting(true);
    try {
      const tagsArray = formTags
        .split(',')
        .map((s) => s.trim().replace(/^#/, ''))
        .filter(Boolean);

      const payload: Partial<BulletinResource> = {
        display_name: formDisplayName.trim(),
        document_title: formDocTitle.trim() || undefined,
        description: formDescription.trim() || undefined,
        resource_type: formType,
        location: formLocation.trim(),
        project_id: formProjectId || null,
        package_id: formPackageId || null,
        discipline: formDiscipline.trim() || 'Instrument',
        tags: tagsArray,
        owner: formOwner.trim() || undefined,
        priority: formPriority,
        pinned: formPinned ? 1 : 0,
        status: formStatus,
        next_review: formNextReview || null,
        notes: formNotes.trim() || undefined,
        replacement_resource_id: formReplacementId || null,
      };

      if (editingResource) {
        await api.updateBulletin(editingResource.id, payload);
        showToast(`Updated ${formDisplayName}`);
      } else {
        const res = await api.createBulletin(payload);
        if (res.isDuplicateWarning) {
          showToast(`Saved. Note: a resource with similar location already exists ("${res.duplicateExistingName}").`);
        } else {
          showToast(`Resource "${formDisplayName}" created!`);
        }
      }

      setIsCreateModalOpen(false);
      fetchResources();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not save resource'}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Save New Announcement
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      showToast('Title and content are required');
      return;
    }
    try {
      await api.createBulletinAnnouncement({
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        is_pinned: noticePinned ? 1 : 0,
      });
      showToast('Notice published successfully');
      setShowNewNoticeModal(false);
      setNoticeTitle('');
      setNoticeContent('');
      setNoticePinned(false);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await api.deleteBulletinAnnouncement(id);
      showToast('Notice dismissed');
      fetchAnnouncements();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const todayStr = getTodayYmd();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans select-none">
      {/* 1. Header Bar */}
      <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0b3b70] text-white flex items-center justify-center shadow-xs">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>BULLETINS / ENGINEERING RESOURCES</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-sky-300 font-mono font-medium">
                  {totalCount} Total
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fast engineering resource hub for Google Sheets, SharePoint, Teams, and network folders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchResources}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            title="Refresh resource list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowNewNoticeModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Post a lightweight engineering notice or schedule freeze alert"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Post Notice</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="text-xs px-4 py-1.5 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>ADD RESOURCE</span>
          </button>
        </div>
      </div>

      {/* 2. Announcements Banner (Lightweight Notification Strip) */}
      {announcements.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-5 py-2 shrink-0">
          <div className="flex items-start gap-2.5">
            <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs gap-3">
                  <div className="text-amber-900 dark:text-amber-100">
                    <strong className="font-semibold">{a.title}: </strong>
                    <span className="opacity-95">{a.content}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-[11px] cursor-pointer p-0.5 shrink-0"
                    title="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Search Bar & Quick Filters Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        {/* Fast Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword: 'I/O', 'metering', 'electrical', 'ENG-SRV01', 'Cause & Effect', 'Google Sheet', 'Vendor', URL, path..."
            className="w-full text-xs pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-[#0b3b70] focus:ring-1 focus:ring-[#0b3b70] text-slate-900 dark:text-slate-100 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons & Standard Dropdowns in one dense line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Quick filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((chip) => {
              const isActive = activeQuickFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveQuickFilter(chip.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0b3b70] text-white shadow-2xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                  {chip.id === 'PINNED' && pinnedCount > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">({pinnedCount})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact Standard Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedPackageId('ALL');
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>

            {/* Package Filter */}
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Packages</option>
              {packages
                .filter((pkg) => selectedProjectId === 'ALL' || pkg.project_id === selectedProjectId)
                .map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.code} - {pkg.name.replace(' Package', '')}
                  </option>
                ))}
            </select>

            {/* Discipline Filter */}
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Disciplines</option>
              {INTERFACE_DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs outline-none cursor-pointer font-medium"
            >
              <option value="ACTIVE">Status: ACTIVE</option>
              <option value="ARCHIVED">Status: ARCHIVED</option>
              <option value="SUPERSEDED">Status: SUPERSEDED</option>
              <option value="ALL">Status: ALL</option>
            </select>

            {/* Sort Options */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="pinned">Sort: Pinned & Popular</option>
              <option value="recent">Sort: Recently Opened</option>
              <option value="name_asc">Sort: A to Z</option>
              <option value="name_desc">Sort: Z to A</option>
              <option value="created_desc">Sort: Newly Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pinned Quick Strip (When on ALL and pinned resources exist) */}
        {activeQuickFilter === 'ALL' && !search && pinnedResources.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0b3b70] dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-current" />
                <span>Frequently Used / Pinned Resources ({pinnedResources.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">1-Click Launch</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {pinnedResources.map((res) => {
                const typeCfg = RESOURCE_TYPE_CONFIG[res.resource_type] || RESOURCE_TYPE_CONFIG.OTHER;
                return (
                  <div
                    key={`pinned-${res.id}`}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 ${typeCfg.bgColor} ${typeCfg.color} ${typeCfg.borderColor}`}
                        >
                          {typeCfg.icon}
                          <span>{typeCfg.label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(res, e)}
                          className="text-amber-500 hover:text-slate-400 p-0.5 cursor-pointer"
                          title="Unpin"
                        >
                          <Pin className="w-3 h-3 fill-current" />
                        </button>
                      </div>

                      <h4
                        className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer"
                        onClick={() => setSelectedResourceForDetails(res)}
                        title={res.display_name}
                      >
                        {res.display_name}
                      </h4>

                      {res.document_title && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate italic">
                          {res.document_title}
                        </p>
                      )}

                      {/* Explicit Real Location URL / Path (Always Visible Rule) */}
                      <div
                        className="mt-1.5 font-mono text-[10.5px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-750 truncate select-all"
                        title={res.location}
                      >
                        {res.location}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {res.project_code || 'GEN'} • {res.discipline}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(res, e)}
                          className="px-2 py-0.8 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                          title="Copy full path/URL"
                        >
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpen(res, e)}
                          className="px-2.5 py-0.8 text-[11px] rounded bg-[#0b3b70] hover:bg-[#0f4c81] text-white font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Open resource"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>OPEN</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Used Strip (Compact 4-5 items) */}
        {recentResources.length > 0 && activeQuickFilter === 'ALL' && !search && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                RECENTLY ACCESSED:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {recentResources.map((res) => (
                <button
                  key={`recent-${res.id}`}
                  onClick={() => handleOpen(res)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={`${res.display_name} - ${res.location}`}
                >
                  <span className="truncate max-w-[150px]">{res.display_name}</span>
                  <span className="text-[9px] font-mono text-slate-400">({res.open_count}x)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. All Resources List (Compact Card / Table Hybrid) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>ENGINEERING RESOURCES & PROJECT LINKS ({resources.length})</span>
            <span className="text-[10px] font-mono lowercase normal-case">
              Click resource row to view task linkages & details
            </span>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Loading engineering resources...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {search ? 'No engineering resources match your search query.' : 'No engineering resources found.'}
              </p>
              <p className="text-[11px] text-slate-400">
                Add Google Sheets, SharePoint links, Teams folders, or network files to quickly access them here.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-2 text-xs px-3.5 py-1.5 bg-[#0b3b70] hover:bg-[#0f4c81] text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Resource</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {resources.map((res) => {
                const typeCfg = RESOURCE_TYPE_CONFIG[res.resource_type] || RESOURCE_TYPE_CONFIG.OTHER;
                const isReviewRequired =
                  res.status === 'ACTIVE' &&
                  res.next_review &&
                  res.next_review <= todayStr;
                const isSuperseded = res.status === 'SUPERSEDED';

                return (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResourceForDetails(res)}
                    className="p-3 sm:px-4 hover:bg-slate-50/80 dark:hover:bg-slate-850/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer"
                  >
                    {/* Left: Pin + Names + Location + Project Context */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Pin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(res, e)}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            res.pinned
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
                          }`}
                          title={res.pinned ? 'Unpin resource' : 'Pin to top'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${res.pinned ? 'fill-current' : ''}`} />
                        </button>

                        {/* Resource Type Badge */}
                        <span
                          className={`text-[10.5px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 font-medium ${typeCfg.bgColor} ${typeCfg.color} ${typeCfg.borderColor}`}
                        >
                          {typeCfg.icon}
                          <span>{typeCfg.label}</span>
                        </span>

                        {/* Display Name (Bold Title) */}
                        <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                          {res.display_name}
                        </span>

                        {/* Review Required Badge */}
                        {isReviewRequired && (
                          <span
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                            title={`Review was due by ${formatDateDisplay(res.next_review)}. This resource should be checked.`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>REVIEW REQUIRED</span>
                          </span>
                        )}

                        {/* Status Badges */}
                        {res.status === 'ARCHIVED' && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                            Archived
                          </span>
                        )}
                        {isSuperseded && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 uppercase flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>SUPERSEDED</span>
                          </span>
                        )}
                      </div>

                      {/* Document Title / Subject (if available) */}
                      {res.document_title && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 italic truncate">
                          Detected Title: {res.document_title}
                        </div>
                      )}

                      {/* Actual URL / UNC Path (MANDATORY: ALWAYS VISIBLE RULE) */}
                      <div className="pl-6 flex items-center gap-2">
                        <div
                          className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 truncate max-w-xl select-all hover:border-blue-400"
                          title={`Click to copy: ${res.location}`}
                          onClick={(e) => handleCopy(res, e)}
                        >
                          {res.location}
                        </div>
                      </div>

                      {/* Project · Package · Discipline · Tags · Usage info */}
                      <div className="pl-6 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400 font-mono">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {res.project_code || res.project_name || 'Independent'}
                          {res.package_code ? ` · ${res.package_code}` : ''}
                          {res.discipline ? ` · ${res.discipline}` : ''}
                        </span>

                        {res.owner && (
                          <span>• Owner: <strong className="text-slate-600 dark:text-slate-300">{res.owner}</strong></span>
                        )}

                        {res.open_count > 0 && (
                          <span>• Opened: {res.open_count}x</span>
                        )}

                        {res.related_tasks_count ? (
                          <span className="text-blue-600 dark:text-sky-400 font-medium bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                            {res.related_tasks_count} Linked Task{res.related_tasks_count > 1 ? 's' : ''}
                          </span>
                        ) : null}

                        {/* Tags */}
                        {Array.isArray(res.tags) && res.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {res.tags.map((tg) => (
                              <span
                                key={tg}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded text-[10px]"
                              >
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Superseded replacement link preview */}
                        {isSuperseded && res.replacement_resource_name && (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            Replaced by: {res.replacement_resource_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions [OPEN] [COPY] + Menu */}
                    <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center pl-6 md:pl-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(res, e)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Copy exact URL or path to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpen(res, e)}
                        className="px-3.5 py-1 text-xs rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Open document or folder"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>OPEN</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => openEditModal(res, e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        title="Edit metadata"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Archive / Restore Button */}
                      {res.status === 'ARCHIVED' ? (
                        <button
                          type="button"
                          onClick={(e) => handleRestore(res, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 cursor-pointer"
                          title="Restore to active list"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleArchive(res, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 cursor-pointer"
                          title="Archive resource"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(res, e)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. CREATE / EDIT RESOURCE MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!formSubmitting) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingResource ? 'Edit Engineering Resource' : 'Add Engineering Resource'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Store and organize engineering links, spreadsheets, and network folders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-3.5 text-xs">
              {/* Display Name * */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="e.g. Sale Gas Metering – Vendor Documents or Instrument I/O Master List"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Location * + Auto-detect Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Location (URL or Path) *
                  </label>
                  {formLocation.startsWith('http') && (
                    <button
                      type="button"
                      onClick={handleAutoDetectTitle}
                      disabled={isDetectingTitle}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {isDetectingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                      <span>Auto-detect page title</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="e.g. https://docs.google.com/spreadsheets/... or \\ENG-SRV01\Gallaf-B3\Instrument\IO.xlsx or D:\Projects\..."
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              {/* Resource Type & Document Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as BulletinResourceType)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-medium cursor-pointer"
                  >
                    {Object.entries(RESOURCE_TYPE_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Document Title / Subject (Detected or Full Title)
                  </label>
                  <input
                    type="text"
                    value={formDocTitle}
                    onChange={(e) => setFormDocTitle(e.target.value)}
                    placeholder="e.g. Instrument I/O List – Batch 3 Rev.05"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Project & Package & Discipline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Project
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      if (formPackageId) {
                        const pkg = packages.find((p) => p.id === formPackageId);
                        if (pkg?.project_id && pkg.project_id !== e.target.value) setFormPackageId('');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">(None / General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Package
                  </label>
                  <select
                    value={formPackageId}
                    onChange={(e) => setFormPackageId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">(None / General)</option>
                    {packages
                      .filter((pkg) => !formProjectId || pkg.project_id === formProjectId)
                      .map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.code} - {pkg.name.replace(' Package', '')}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Discipline
                  </label>
                  <select
                    value={formDiscipline}
                    onChange={(e) => setFormDiscipline(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                  >
                    {INTERFACE_DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Status & Next Review */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as BulletinStatus)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                    <option value="SUPERSEDED">SUPERSEDED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Next Review Date
                  </label>
                  <DatePicker
                    value={formNextReview}
                    onChange={(v) => setFormNextReview(v)}
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              </div>

              {/* Replacement Resource (if Superseded) */}
              {formStatus === 'SUPERSEDED' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg space-y-1">
                  <label className="block text-[10px] font-bold text-rose-800 dark:text-rose-200 uppercase">
                    Replacement Resource (Current Version)
                  </label>
                  <select
                    value={formReplacementId}
                    onChange={(e) => setFormReplacementId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-slate-900 dark:text-slate-100 rounded-md outline-none cursor-pointer"
                  >
                    <option value="">(Select Current Active Resource)</option>
                    {resources
                      .filter((r) => r.id !== editingResource?.id && r.status === 'ACTIVE')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.display_name} ({r.resource_type})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400">
                    When someone opens this superseded link, the system will offer to navigate directly to the current replacement.
                  </p>
                </div>
              )}

              {/* Tags & Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. Metering, TBE, CustodyTransfer"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Owner / Responsible PIC
                  </label>
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    placeholder="e.g. Ho Quoc Viet (Me)"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Notes & Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Notes / Engineering Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional context, login instructions, or revision guidelines..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              {/* Pin Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span>Pin this resource for quick 1-click access</span>
              </label>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingResource ? 'Update Resource' : 'Save Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. RESOURCE INSPECTION & LINKED TASKS MODAL */}
      {selectedResourceForDetails && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedResourceForDetails(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10.5px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    (RESOURCE_TYPE_CONFIG[selectedResourceForDetails.resource_type] || RESOURCE_TYPE_CONFIG.OTHER).bgColor
                  } ${(RESOURCE_TYPE_CONFIG[selectedResourceForDetails.resource_type] || RESOURCE_TYPE_CONFIG.OTHER).color} ${(RESOURCE_TYPE_CONFIG[selectedResourceForDetails.resource_type] || RESOURCE_TYPE_CONFIG.OTHER).borderColor}`}
                >
                  {(RESOURCE_TYPE_CONFIG[selectedResourceForDetails.resource_type] || RESOURCE_TYPE_CONFIG.OTHER).icon}
                  <span>{(RESOURCE_TYPE_CONFIG[selectedResourceForDetails.resource_type] || RESOURCE_TYPE_CONFIG.OTHER).label}</span>
                </span>
                <h3 className="text-sm font-bold truncate max-w-xs">{selectedResourceForDetails.display_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResourceForDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Location Box */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Exact Location</label>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs select-all break-all">
                {selectedResourceForDetails.location}
              </div>
            </div>

            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Project:</span>{' '}
                <strong>{selectedResourceForDetails.project_name || selectedResourceForDetails.project_code || 'General'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Package:</span>{' '}
                <strong>{selectedResourceForDetails.package_name || selectedResourceForDetails.package_code || 'General'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Discipline:</span>{' '}
                <strong>{selectedResourceForDetails.discipline}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Access Count:</span>{' '}
                <strong>{selectedResourceForDetails.open_count} times</strong>
              </div>
              {selectedResourceForDetails.next_review && (
                <div>
                  <span className="text-slate-400 font-medium">Next Review:</span>{' '}
                  <strong>{formatDateDisplay(selectedResourceForDetails.next_review)}</strong>
                </div>
              )}
              {selectedResourceForDetails.owner && (
                <div>
                  <span className="text-slate-400 font-medium">Owner:</span>{' '}
                  <strong>{selectedResourceForDetails.owner}</strong>
                </div>
              )}
            </div>

            {/* Related Tasks (Section 28) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Related Tasks ({selectedResourceForDetails.related_tasks?.length || 0})</span>
                </span>
              </div>

              {selectedResourceForDetails.related_tasks && selectedResourceForDetails.related_tasks.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedResourceForDetails.related_tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedResourceForDetails(null);
                        setSelectedTaskId(t.id);
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 hover:text-blue-600">
                        {t.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  No tasks directly linked yet. You can link this resource from inside any Task's Resources tab.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const res = selectedResourceForDetails;
                  setSelectedResourceForDetails(null);
                  openEditModal(res);
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Metadata</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedResourceForDetails)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeOpen(selectedResourceForDetails);
                  }}
                  className="text-xs px-4 py-1.5 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch / Open</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SUPERSEDED NOTICE MODAL (Section 24) */}
      {supersededNoticeResource && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSupersededNoticeResource(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  This resource has been superseded!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  <strong>"{supersededNoticeResource.display_name}"</strong> is an archived or superseded baseline. A newer revision has been issued.
                </p>
                {supersededNoticeResource.replacement_resource_name && (
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 p-2 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900">
                    Current Version: {supersededNoticeResource.replacement_resource_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const res = supersededNoticeResource;
                  setSupersededNoticeResource(null);
                  executeOpen(res);
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Open Old Version Anyway
              </button>

              {supersededNoticeResource.replacement_resource_id && (
                <button
                  type="button"
                  onClick={async () => {
                    const repId = supersededNoticeResource.replacement_resource_id!;
                    setSupersededNoticeResource(null);
                    try {
                      const rep = await api.getBulletin(repId);
                      executeOpen(rep);
                    } catch {
                      showToast('Could not load replacement resource');
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>OPEN CURRENT VERSION</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. POST NEW ANNOUNCEMENT MODAL */}
      {showNewNoticeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowNewNoticeModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <span>Post Bulletin Announcement</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewNoticeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Notice Headline *
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. IMPORTANT: Electrical cable schedule updated to Rev.03"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Content / Details *
                </label>
                <textarea
                  rows={3}
                  required
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="e.g. Process C&E working sheet will be frozen for internal review on 08-Oct-2026."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={noticePinned}
                  onChange={(e) => setNoticePinned(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span>Pin this notice to top of the bulletin board</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewNoticeModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] text-white font-bold cursor-pointer"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BulletinsView;
