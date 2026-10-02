import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../types';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { getDeadlineBadge, getScheduleVariance, formatDateDisplay, formatDateTimeDisplay, getTodayYmd } from '../../lib/dateUtils';
import { normalizeTaskState } from '../../lib/taskStateMachine';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { generateSingleTaskDatasheetHtml, triggerDirectPrint } from '../../lib/printUtils';
import { DatePicker } from '../common/DatePicker';
import { PicSelector } from '../common/PicSelector';
import {
  X,
  Clock,
  Calendar,
  Tag as TagIcon,
  Paperclip,
  MessageSquare,
  History,
  CheckCircle2,
  Trash2,
  Send,
  Upload,
  Users,
  Download,
  AlertCircle,
  AlertTriangle,
  FileText,
  User,
  Box,
  Layers,
  FolderGit2,
  ShieldCheck,
  Eye,
  Table,
  FileCode,
  Image as ImageIcon,
  Check,
  Loader2,
  Printer,
  Sparkles,
  RotateCcw,
  Link2,
  Search,
  CheckSquare,
  Square,
  HelpCircle,
  Edit2,
} from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose, onUpdated }) => {
  const { packages, projects, categories, tags, users, currentUser, showToast, aiSettings } = useApp();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isRewordingDesc, setIsRewordingDesc] = useState(false);
  const [previousDescription, setPreviousDescription] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('TASK');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [progress, setProgress] = useState(0);
  const [pics, setPics] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [packageId, setPackageId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [forecastFinish, setForecastFinish] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');



  // Comment state
  const [newComment, setNewComment] = useState('');

  // Attachment preview & upload feedback states
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'success' | 'error' | 'uploading'; text: string } | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null);

  // Comment / Technical Notes editing & deleting states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; content: string } | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments' | 'activity'>('attachments');

  // Multi-Project / Package Linked Group State
  const [linkedGroupPackages, setLinkedGroupPackages] = useState<string[]>([]);
  const [showManagePackagesModal, setShowManagePackagesModal] = useState(false);
  const [packageRemoveMode, setPackageRemoveMode] = useState<'unlink' | 'delete'>('unlink');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // Load task details
  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getTask(taskId);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setType(data.type);
      setPriority(data.priority);
      setStatus(data.status);
      setProgress(data.progress);
      setProjectId(data.project_id || '');
      setPackageId(data.package_id || '');
      setCategoryId(data.category_id || '');
      setStartDate(data.start_date || '');
      setDeadline(data.deadline || '');
      setForecastFinish(data.forecast_finish || '');
      setCompletedDate(data.completed_date || '');
      setSelectedTagIds(data.tags ? data.tags.map((t) => t.id) : []);

      const initialPics = Array.isArray(data.pics) ? data.pics : [];
      setPics(initialPics);

      // Initialize linked packages for group management
      const initialPkgIds = [data.package_id, ...(data.linked_tasks?.map((t: any) => t.package_id) || [])].filter(Boolean) as string[];
      setLinkedGroupPackages(Array.from(new Set(initialPkgIds)));
    } catch (err: any) {
      showToast(`Unable to load task details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Support paste screenshot directly (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const pasteFile = new File([blob], `screenshot-${Date.now().toString().slice(-6)}.png`, {
              type: blob.type,
            });
            await uploadFileDirect(pasteFile);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [taskId, currentUser]);

  const uploadFileDirect = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      showToast('❌ File size must be under 50MB');
      return;
    }

    setUploadingFile(true);
    setUploadStatusMsg({ type: 'uploading', text: `Uploading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...` });
    showToast(`⏳ Uploading attachment: ${file.name}`);

    try {
      await api.uploadAttachment(taskId, file, currentUser?.id);
      setUploadStatusMsg({ type: 'success', text: `Uploaded successfully: ${file.name}` });
      showToast(`✅ Attachment uploaded successfully: ${file.name}`);
      await fetchTaskDetails();
      onUpdated();
      setTimeout(() => setUploadStatusMsg(null), 5000);
    } catch (err: any) {
      setUploadStatusMsg({ type: 'error', text: `Upload error: ${err.message || 'Could not save file'}` });
      showToast(`❌ Upload failed: ${err.message || 'Network error'}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileDirect(file);
    e.target.value = '';
  };

  const handleSave = async (syncAll: boolean = false) => {
    if (!title.trim()) {
      showToast('⚠️ Please enter a task title');
      return;
    }

    setSaving(true);
    try {
      await api.updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        status,
        progress,
        pics,
        project_id: projectId || null,
        package_id: packageId || null,
        category_id: categoryId || null,
        start_date: startDate || null,
        deadline: deadline || null,
        forecast_finish: forecastFinish || null,
        completed_date: completedDate || null,
        startDate: startDate || null,
        forecastFinish: forecastFinish || null,
        completedDate: completedDate || null,
        projectId: projectId || null,
        packageId: packageId || null,
        categoryId: categoryId || null,
        tags: selectedTagIds,
        userId: currentUser?.id,
        syncGroup: syncAll,
        syncGroupPackages: linkedGroupPackages.length > 0 ? linkedGroupPackages : undefined,
        removeMode: packageRemoveMode,
      });

      if (syncAll && (task?.group_id || linkedGroupPackages.length > 1)) {
        const totalCount = (task?.linked_tasks?.length || 0) + 1;
        showToast(`✅ Content synchronized to all ${totalCount} linked tasks in group!`);
      } else {
        showToast('✅ Task changes saved successfully');
      }
      onUpdated();
      onClose();
    } catch (err: any) {
      showToast(`❌ Error saving task: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkGroup = async () => {
    if (!confirm('Unlink this task from the multi-project group? It will become an independent standalone task without group synchronization.')) {
      return;
    }
    try {
      setSaving(true);
      await api.unlinkTaskGroup(taskId);
      showToast('✅ Task successfully unlinked from group');
      await fetchTaskDetails();
      onUpdated();
    } catch (err: any) {
      showToast(`❌ Error unlinking task: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleProgressChange = (newProgress: number) => {
    const normalized = normalizeTaskState({
      progress: newProgress,
      existingStatus: status,
      existingProgress: progress,
      existingCompletedDate: completedDate,
    });
    setStatus(normalized.status);
    setProgress(normalized.progress);
    setCompletedDate(normalized.completed_date || '');
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const normalized = normalizeTaskState({
      status: newStatus,
      existingStatus: status,
      existingProgress: progress,
      existingCompletedDate: completedDate,
    });
    setStatus(normalized.status);
    setProgress(normalized.progress);
    setCompletedDate(normalized.completed_date || '');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.addComment(taskId, newComment.trim(), currentUser?.id);
      setNewComment('');
      showToast('Technical note added');
      fetchTaskDetails();
      onUpdated();
    } catch (err: any) {
      showToast(`Could not add note: ${err.message}`);
    }
  };

  const handleStartEditComment = (comment: { id: string; content: string }) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !taskId) return;
    try {
      setSavingCommentId(commentId);
      await api.updateComment(taskId, commentId, editingCommentText.trim(), currentUser?.id);
      showToast('Technical note updated');
      setEditingCommentId(null);
      setEditingCommentText('');
      await fetchTaskDetails();
      onUpdated();
    } catch (err: any) {
      showToast(`Error updating note: ${err.message}`);
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete || !taskId) return;
    const { id: commentId } = commentToDelete;
    try {
      setDeletingCommentId(commentId);
      await api.deleteComment(taskId, commentId);
      showToast('Technical note deleted');
      setCommentToDelete(null);
      await fetchTaskDetails();
      onUpdated();
    } catch (err: any) {
      showToast(`Error deleting note: ${err.message}`);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDownloadAttachment = async (att: { id: string; original_name: string; mime_type?: string }) => {
    setDownloadingAttId(att.id);
    try {
      const res = await fetch(`/api/attachments/${att.id}/download`);
      if (!res.ok) throw new Error(`Download failed (status: ${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = att.original_name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 1000);
      showToast(`Downloaded: ${att.original_name}`);
    } catch (err: any) {
      showToast(`Download failed: ${err.message}`);
    } finally {
      setDownloadingAttId(null);
    }
  };

  const handleRequestDeleteAttachment = (attachmentId: string, attName: string) => {
    setAttachmentToDelete({ id: attachmentId, name: attName });
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    const { id: attachmentId, name: attName } = attachmentToDelete;
    try {
      setDeletingAttId(attachmentId);
      await api.deleteAttachment(attachmentId, currentUser?.id);
      showToast(`Deleted attachment: ${attName}`);
      setAttachmentToDelete(null);
      await fetchTaskDetails();
      onUpdated();
    } catch (err: any) {
      showToast(`Error deleting attachment: ${err.message}`);
    } finally {
      setDeletingAttId(null);
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await api.createTag(newTagName.trim(), 'slate');
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName('');
      showToast(`Tag added: #${newTag.name}`);
    } catch (err: any) {
      showToast(`Could not create tag: ${err.message}`);
    }
  };

  const handleGenerateTitleWithAI = async () => {
    const rawDesc = description.trim();
    if (!rawDesc) {
      showToast('⚠️ Please enter a description in "Technical Description / Scope of Work" first.');
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
      showToast('⚠️ Please enter a draft technical description or outline with enough details first (at least 3-4 words).');
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
        showToast('✨ Technical description reworded by AI (Oil & Gas EPCI standard)!');
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
      showToast('↩️ Reverted to previous draft description.');
    }
  };

  const isImageFile = (att: any) => {
    const ext = att.original_name.split('.').pop()?.toLowerCase();
    return (
      att.mime_type?.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)
    );
  };

  const getFileCategory = (att: any) => {
    const ext = att.original_name.split('.').pop()?.toLowerCase();
    if (isImageFile(att)) return { type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4 text-blue-500" />, badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (['xlsx', 'xls', 'csv'].includes(ext) || att.mime_type?.includes('spreadsheet')) return { type: 'excel', label: 'Excel Spreadsheet', icon: <Table className="w-4 h-4 text-emerald-600" />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (ext === 'docx' || att.mime_type?.includes('word')) return { type: 'word', label: 'Word Document', icon: <FileText className="w-4 h-4 text-blue-600" />, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (ext === 'pdf' || att.mime_type === 'application/pdf') return { type: 'pdf', label: 'PDF Document', icon: <FileText className="w-4 h-4 text-rose-600" />, badge: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (['txt', 'json', 'md', 'sql', 'ts', 'js', 'xml', 'log'].includes(ext)) return { type: 'code', label: 'Code / Text', icon: <FileCode className="w-4 h-4 text-amber-600" />, badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { type: 'other', label: ext?.toUpperCase() || 'FILE', icon: <Paperclip className="w-4 h-4 text-slate-500" />, badge: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  // Filter packages based on selected project
  const availablePackages = projectId
    ? packages.filter((pkg) => pkg.project_id === projectId)
    : packages;

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    if (packageId) {
      const selectedPkg = packages.find((p) => p.id === packageId);
      if (selectedPkg && selectedPkg.project_id && selectedPkg.project_id !== newProjectId) {
        setPackageId('');
      }
    }
  };

  const handlePackageChange = (newPackageId: string) => {
    setPackageId(newPackageId);
    if (newPackageId) {
      const selectedPkg = packages.find((p) => p.id === newPackageId);
      if (selectedPkg?.project_id && selectedPkg.project_id !== projectId) {
        setProjectId(selectedPkg.project_id);
      }
    }
  };

  const handlePrintTask = () => {
    if (!task) return;
    const activeProj = projects.find((p) => p.id === projectId);
    const activePkg = packages.find((p) => p.id === packageId);
    const html = generateSingleTaskDatasheetHtml(
      { ...task, title, description, priority, status, progress, deadline, forecast_finish: forecastFinish, start_date: startDate, completed_date: completedDate, pics },
      activeProj,
      activePkg,
      task.comments || [],
      task.attachments || []
    );
    triggerDirectPrint(html);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center space-y-3 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const deadlineBadge = getDeadlineBadge(deadline, status, forecastFinish);
  const variance = getScheduleVariance(deadline, forecastFinish);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
              #{task.id}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
              {type}
            </span>
            {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  task.forecast_revision_count >= 3
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 animate-pulse'
                    : task.forecast_revision_count === 2
                    ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                }`}
                title={`Forecast date revised ${task.forecast_revision_count} times!`}
              >
                <Clock className="w-3 h-3" />
                <span>Forecast Rev #{task.forecast_revision_count}</span>
              </span>
            )}
            {task.group_id && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 px-2.5 py-0.5 rounded-full"
                title={`Linked to ${(task.linked_tasks?.length || 0) + 1} packages under Group #${task.group_id}`}
              >
                <Link2 className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
                <span>Linked Group: {(task.linked_tasks?.length || 0) + 1} Packages</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintTask}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Print task datasheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {task.group_id ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="text-xs px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Save Title, Technical Scope, Priority, Category & Tags to all packages in this linked group"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Syncing...' : `Save & Sync All (${(task.linked_tasks?.length || 0) + 1})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer border border-slate-300 dark:border-slate-700"
                  title="Save changes only to this single task record without altering other packages in the group"
                >
                  <Check className="w-3 h-3" />
                  <span className="hidden sm:inline">This Task Only</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="text-xs px-4 py-1.5 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {/* Title & Status Row */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Task Title / Deliverable *
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Review Technical Bid Evaluation for Control Valves"
                  className="flex-1 text-base font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-[#0b3b70] focus:ring-1 focus:ring-[#0b3b70] text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleGenerateTitleWithAI}
                  disabled={isGeneratingTitle}
                  title="Auto-generate title from Technical Description using AI"
                  className="shrink-0 h-[42px] px-3.5 rounded-lg bg-gradient-to-r from-[#0b3b70] to-[#1d4ed8] hover:from-[#0d4786] hover:to-[#1e40af] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingTitle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{isGeneratingTitle ? 'Generating...' : 'Use AI'}</span>
                </button>
              </div>
            </div>

            {/* Status & Progress Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 text-xs font-mono font-medium outline-none cursor-pointer"
                >
                  <option value="TODO">TODO (Not Started)</option>
                  <option value="IN PROGRESS">IN PROGRESS (Underway)</option>
                  <option value="WAITING">WAITING (Pending Review/Action)</option>
                  <option value="ON HOLD">ON HOLD (Suspended)</option>
                  <option value="DONE">DONE (Completed)</option>
                  <option value="CANCELLED">CANCELLED (Cancelled)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  <span>Progress:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 text-xs font-bold">{progress}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => handleProgressChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex space-x-1">
                    {[0, 50, 100].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProgressChange(p)}
                        className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Left details & Right Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left 2 Columns: Description, Tabs (Attachments, Comments, History) */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Technical Description / Scope of Work
                  </label>
                  <div className="flex items-center space-x-2">
                    {previousDescription !== null && (
                      <button
                        type="button"
                        onClick={handleUndoReword}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Revert to your previous draft description"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Undo Reword</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRewordDescriptionWithAI}
                      disabled={isRewordingDesc}
                      title="Reword purely technically in Oil & Gas EPCI industry standard using AI"
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white text-[11px] font-semibold flex items-center space-x-1.5 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isRewordingDesc ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                          <span>Rewording (Oil & Gas)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-sky-200" />
                          <span>Reword by AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter draft technical description, equipment tags, deliverables, or specifications... Then click 'Reword by AI' to formulate in professional Oil & Gas engineering standards."
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 leading-relaxed font-sans"
                />
              </div>

              {/* Tabs Section */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-850 shadow-2xs">
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('attachments')}
                    className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      activeTab === 'attachments'
                        ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attachments ({task.attachments?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      activeTab === 'comments'
                        ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Technical Notes ({task.comments?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 py-2.5 px-3 font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                      activeTab === 'activity'
                        ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Activity History</span>
                  </button>
                </div>

                <div className="p-4">
                  {/* Attachments Tab */}
                  {activeTab === 'attachments' && (
                    <div className="space-y-4">
                      {/* Active Uploading / Feedback Banner */}
                      {uploadStatusMsg && (
                        <div
                          className={`p-3 rounded-lg text-xs flex items-center space-x-2 animate-in fade-in duration-150 ${
                            uploadStatusMsg.type === 'uploading'
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                              : uploadStatusMsg.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {uploadStatusMsg.type === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                          {uploadStatusMsg.type === 'success' && <Check className="w-4 h-4 text-emerald-600" />}
                          {uploadStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                          <span className="font-medium">{uploadStatusMsg.text}</span>
                        </div>
                      )}

                      {/* Upload & Paste Snapshot Zone */}
                      <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 rounded-xl p-5 text-center transition-all">
                        <input
                          type="file"
                          id="modal-file-upload"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                        <label htmlFor="modal-file-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2 shadow-xs">
                            {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                          </div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            {uploadingFile ? 'Uploading file...' : 'Click to upload or paste screenshot directly (Ctrl+V / Cmd+V)'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Supported live previews: <strong>Images (PNG, JPG), Excel (.xlsx, .csv), Word (.docx), PDF</strong> and source code (up to 50MB).
                          </span>
                        </label>
                      </div>

                      {/* Attachments List & Visual Previews */}
                      {task.attachments && task.attachments.length > 0 ? (
                        <div className="space-y-4">
                          {/* Snapshots & Document Cards Ribbon */}
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                            <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-2.5 flex items-center justify-between">
                              <span className="flex items-center space-x-1.5">
                                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Quick Document Previews ({task.attachments.length})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Click any file to open preview
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {task.attachments.map((att) => {
                                const cat = getFileCategory(att);
                                const isImg = cat.type === 'image';

                                return (
                                  <div
                                    key={`card-${att.id}`}
                                    onClick={() => setPreviewAttachment(att)}
                                    className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
                                  >
                                    <div className="flex items-center space-x-2 overflow-hidden mb-2">
                                      {isImg ? (
                                        <div className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-900 shrink-0">
                                          <img
                                            src={`/api/attachments/${att.id}/view`}
                                            alt={att.original_name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                          />
                                        </div>
                                      ) : (
                                        <div className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${cat.badge}`}>
                                          {cat.icon}
                                        </div>
                                      )}

                                      <div className="overflow-hidden flex-1">
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={att.original_name}>
                                          {att.original_name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          {(att.file_size / 1024).toFixed(1)} KB
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-700">
                                      <span className={`px-1.5 py-0.2 rounded font-mono font-medium ${cat.badge}`}>
                                        {cat.label}
                                      </span>
                                      <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center space-x-0.5">
                                        <span>Preview</span>
                                        <Eye className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Full Attachments Detailed List */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                            {task.attachments.map((att) => {
                              const cat = getFileCategory(att);

                              return (
                                <div key={att.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                  <div
                                    className="flex items-center space-x-3 truncate cursor-pointer flex-1 mr-2"
                                    onClick={() => setPreviewAttachment(att)}
                                    title="Click to preview file"
                                  >
                                    <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${cat.badge}`}>
                                      {cat.icon}
                                    </div>
                                    <div className="truncate">
                                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                        {att.original_name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {(att.file_size / 1024).toFixed(1)} KB • {cat.label} • {formatDateDisplay(att.created_at)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                      title="Preview file"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(att)}
                                      disabled={downloadingAttId === att.id}
                                      className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Download file"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{downloadingAttId === att.id ? 'Downloading...' : 'Download'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRequestDeleteAttachment(att.id, att.original_name)}
                                      disabled={deletingAttId === att.id}
                                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Delete attachment"
                                      aria-label={`Delete attachment ${att.original_name}`}
                                    >
                                      {deletingAttId === att.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 py-6 border border-slate-100 dark:border-slate-800 rounded-lg">
                          No attachments yet. Click the upload area above or press <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Ctrl+V</span> to paste a screenshot.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comments / Notes Tab */}
                  {activeTab === 'comments' && (
                    <div className="space-y-3">
                      <form onSubmit={handleAddComment} className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Enter technical note, work log..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>

                      {task.comments && task.comments.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {task.comments.map((cm) => (
                            <div key={cm.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs transition-colors">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-mono">
                                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1">
                                  <span>👤</span>
                                  <span>{cm.user_name || 'Engineer'}</span>
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <span className="flex items-center space-x-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{formatDateTimeDisplay(cm.created_at)}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditComment(cm)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                    title="Edit technical note"
                                    aria-label="Edit technical note"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCommentToDelete({ id: cm.id, content: cm.content })}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete technical note"
                                    aria-label="Delete technical note"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {editingCommentId === cm.id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs p-2.5 rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                    placeholder="Edit technical note content..."
                                    autoFocus
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      type="button"
                                      onClick={handleCancelEditComment}
                                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditComment(cm.id)}
                                      disabled={savingCommentId === cm.id || !editingCommentText.trim()}
                                      className="px-3 py-1 text-[11px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                                    >
                                      {savingCommentId === cm.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                      <span>Save</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-800 dark:text-slate-100 text-xs leading-relaxed whitespace-pre-wrap mt-1">{cm.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 py-6">
                          No notes yet. Add the first note for this task.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activity History Tab */}
                  {activeTab === 'activity' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                      {task.activities && task.activities.length > 0 ? (
                        task.activities.map((act) => {
                          const isForecastChange = act.activity_type === 'FORECAST_CHANGED';
                          return (
                            <div
                              key={act.id}
                              className={`p-2.5 rounded-lg text-[11px] flex items-start space-x-2 transition-colors ${
                                isForecastChange
                                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                              }`}
                            >
                              {isForecastChange ? (
                                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              ) : (
                                <History className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{act.user_name || 'System'}</span>
                                  <span className="flex items-center space-x-1">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{formatDateTimeDisplay(act.created_at)}</span>
                                  </span>
                                </div>
                                <div className="text-slate-800 dark:text-slate-100 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                                  <span>{act.note || act.activity_type}</span>
                                  {isForecastChange && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                                      Schedule Revision
                                    </span>
                                  )}
                                </div>
                                {act.old_value && act.new_value && (
                                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                    Changed: <span className="line-through">{act.old_value}</span> → <span className="font-bold text-slate-900 dark:text-slate-100">{act.new_value}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-xs text-slate-400 py-6">No activity history recorded yet.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar: Meta & Properties (1 Column) */}
            <div className="space-y-4 text-xs">
              {/* Person In Charge (PIC) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg">
                <PicSelector selectedPics={pics} onChange={setPics} />
              </div>

              {/* Priority & Type */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 font-medium outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">🔴 CRITICAL (Urgent)</option>
                    <option value="HIGH">🟠 HIGH (High Priority)</option>
                    <option value="MEDIUM">🟡 MEDIUM (Normal)</option>
                    <option value="LOW">⚪ LOW (Low / Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Task Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TaskType)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 font-mono outline-none cursor-pointer"
                  >
                    <option value="TASK">TASK (Deliverable / Main Task)</option>
                    <option value="NOTE">NOTE (Technical Note)</option>
                    <option value="FOLLOW-UP">FOLLOW-UP (Monitoring)</option>
                    <option value="MILESTONE">MILESTONE (Milestone)</option>
                  </select>
                </div>
              </div>

              {/* Project & Package Assignment */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <FolderGit2 className="w-3 h-3 text-slate-400" />
                      <span>Project</span>
                    </span>
                    {projectId && (
                      <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {projects.find((p) => p.id === projectId)?.code}
                      </span>
                    )}
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 outline-none font-medium truncate cursor-pointer"
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
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Box className="w-3 h-3 text-slate-400" />
                      <span>Procurement Package</span>
                    </span>
                    {availablePackages.length > 0 && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        ({availablePackages.length})
                      </span>
                    )}
                  </label>
                  <select
                    value={packageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 outline-none font-mono cursor-pointer"
                  >
                    <option value="">(General Task / Direct Project Task)</option>
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

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center space-x-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Category</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linked Group Scope Card */}
              {task.group_id ? (
                <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
                      <span>Linked Group Scope</span>
                    </span>
                    <span className="text-[9px] font-mono bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 px-1.5 py-0.5 rounded font-bold">
                      {(task.linked_tasks?.length || 0) + 1} Packages
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                    This task belongs to group <code className="font-mono font-bold text-sky-800 dark:text-sky-300">#{task.group_id.slice(-8)}</code>. Status and progress are tracked independently for each package, while common specs can be synced.
                  </p>

                  {/* Sibling tasks list */}
                  {task.linked_tasks && task.linked_tasks.length > 0 && (
                    <div className="space-y-1 pt-1 max-h-36 overflow-y-auto pr-0.5">
                      <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                        Other Packages in Group:
                      </div>
                      {task.linked_tasks.map((lt) => (
                        <div
                          key={lt.id}
                          className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded text-[11px]"
                        >
                          <div className="truncate pr-1.5">
                            <span className="font-mono font-bold text-sky-700 dark:text-sky-300 mr-1">
                              {lt.project_code || 'GEN'} / {lt.package_code || lt.id}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 truncate">
                              {lt.package_name ? lt.package_name.replace(' Package', '') : lt.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                                lt.status === 'DONE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : lt.status === 'IN PROGRESS'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {lt.status} ({lt.progress}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-sky-200/80 dark:border-sky-800/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowManagePackagesModal(true)}
                      className="text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Manage Packages</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnlinkGroup}
                      className="text-slate-500 hover:text-rose-600 text-[10px] cursor-pointer"
                      title="Detach this task so it becomes an independent task without group sync"
                    >
                      Unlink from Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      if (packageId && !linkedGroupPackages.includes(packageId)) {
                        setLinkedGroupPackages([packageId]);
                      }
                      setShowManagePackagesModal(true);
                    }}
                    className="w-full py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-300 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold rounded-md text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Apply / Link to Multiple Packages</span>
                  </button>
                </div>
              )}

              {/* Dates & Schedule */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Schedule & Deadlines</div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">Start Date</label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Deadline *</label>
                    {deadline && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${deadlineBadge.bgClass} ${deadlineBadge.colorClass} ${deadlineBadge.borderClass}`}
                      >
                        {deadlineBadge.label}
                      </span>
                    )}
                  </div>
                  <DatePicker
                    value={deadline}
                    onChange={(val) => setDeadline(val)}
                    placeholder="dd/mm/yyyy"
                  />
                  {deadline && (
                    <div className={`text-[10px] mt-1.5 px-2.5 py-1 rounded border flex items-center space-x-1.5 font-medium ${deadlineBadge.bgClass} ${deadlineBadge.colorClass} ${deadlineBadge.borderClass}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{deadlineBadge.fullDescription}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Forecast Finish Date</label>
                    {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
                      <span className={`text-[9.5px] font-mono font-bold ${
                        task.forecast_revision_count >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        Revised {task.forecast_revision_count} time{task.forecast_revision_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <DatePicker
                    value={forecastFinish}
                    onChange={(val) => setForecastFinish(val)}
                    placeholder="dd/mm/yyyy"
                  />
                  {variance && (
                    <span className={`text-[10px] font-mono block mt-1 ${variance.isLate ? 'text-rose-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      Schedule Variance: {variance.text}
                    </span>
                  )}
                  {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
                    <div className={`mt-2 p-2.5 rounded-lg border text-[11px] leading-snug transition-colors ${
                      task.forecast_revision_count >= 3
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                        : task.forecast_revision_count === 2
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                          task.forecast_revision_count >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                        }`} />
                        <span>
                          {task.forecast_revision_count >= 3
                            ? `Urgent Schedule Slippage! (${task.forecast_revision_count} Revisions)`
                            : `Forecast Schedule Revised (${task.forecast_revision_count}x)`}
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5 opacity-90 leading-normal">
                        {task.forecast_revision_count >= 3
                          ? 'This deliverable has been revised multiple times. Please expedite engineering execution immediately to prevent project critical-path delay.'
                          : 'Forecast completion date has been adjusted from initial baseline. Monitor closely to avoid schedule creep.'}
                      </p>
                    </div>
                  )}
                </div>

                {status === 'DONE' && (
                  <div>
                    <label className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Actual Completed Date</label>
                    <DatePicker
                      value={completedDate}
                      onChange={(val) => setCompletedDate(val)}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                )}
              </div>

              {/* Tags Selection */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tags & Labels</label>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                  {tags.map((tg) => {
                    const isSelected = selectedTagIds.includes(tg.id);
                    return (
                      <button
                        key={tg.id}
                        type="button"
                        onClick={() => handleToggleTag(tg.id)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        #{tg.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex space-x-1 pt-1">
                  <input
                    type="text"
                    placeholder="Add new tag..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Created: {formatDateDisplay(task.created_at)}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-xs px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {task.group_id ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="text-xs px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Save Title, Technical Scope, Priority, Category & Tags to all packages in this linked group"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Syncing...' : `Save & Sync All (${(task.linked_tasks?.length || 0) + 1})`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer border border-slate-300 dark:border-slate-700"
                  title="Save changes only to this single task record without altering other packages in the group"
                >
                  <Check className="w-3 h-3" />
                  <span>This Task Only</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="text-xs px-4 py-1.5 rounded-lg bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attachment Full Lightbox / Preview Modal */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
          onDownload={() => handleDownloadAttachment(previewAttachment)}
        />
      )}

      {/* Delete Attachment Confirmation Modal */}
      {attachmentToDelete && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!deletingAttId) setAttachmentToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Delete Attachment
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 break-all">"{attachmentToDelete.name}"</span>? This will permanently remove the file from this task.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deletingAttId !== null}
                onClick={() => setAttachmentToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAttId !== null}
                onClick={handleConfirmDeleteAttachment}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-600 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {deletingAttId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Attachment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment / Technical Note Confirmation Modal */}
      {commentToDelete && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!deletingCommentId) setCommentToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Delete Technical Note
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this technical note?
                </p>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3">
                  "{commentToDelete.content}"
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deletingCommentId !== null}
                onClick={() => setCommentToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCommentId !== null}
                onClick={handleConfirmDeleteComment}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-600 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {deletingCommentId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Linked Packages Modal */}
      {showManagePackagesModal && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowManagePackagesModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Manage Multi-Project Packages
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {task.group_id
                      ? `Group #${task.group_id.slice(-8)} — Select which packages share this task`
                      : 'Create a linked multi-package group for this task'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManagePackagesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                placeholder="Search packages or projects..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-sky-500"
              />
            </div>

            {/* Package selector list */}
            <div className="max-h-60 overflow-y-auto space-y-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 rounded-lg p-2.5 text-xs">
              {projects.map((proj) => {
                const projPackages = packages.filter(
                  (p) =>
                    p.project_id === proj.id &&
                    (!groupSearchTerm ||
                      p.code.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
                      p.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                );
                if (projPackages.length === 0) return null;

                const allSelected = projPackages.every((p) => linkedGroupPackages.includes(p.id));

                return (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded font-semibold text-[11px]">
                      <span>
                        {proj.code} — {proj.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = projPackages.map((p) => p.id);
                          if (allSelected) {
                            setLinkedGroupPackages((prev) => prev.filter((id) => !ids.includes(id)));
                          } else {
                            setLinkedGroupPackages((prev) => Array.from(new Set([...prev, ...ids])));
                          }
                        }}
                        className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        {allSelected ? 'Deselect All' : 'Select Project'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                      {projPackages.map((pkg) => {
                        const isChecked = linkedGroupPackages.includes(pkg.id);
                        const isCurrent = pkg.id === packageId;
                        const linkedTask = task.linked_tasks?.find((lt) => lt.package_id === pkg.id);

                        return (
                          <label
                            key={pkg.id}
                            className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors text-[11px] ${
                              isChecked
                                ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 font-medium'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setLinkedGroupPackages((prev) => prev.filter((id) => id !== pkg.id));
                                  } else {
                                    setLinkedGroupPackages((prev) => [...prev, pkg.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                              />
                              <div className="truncate">
                                <span className="font-mono font-bold text-sky-800 dark:text-sky-300 mr-1">
                                  {pkg.code}
                                </span>
                                <span className="truncate">{pkg.name.replace(' Package', '')}</span>
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.2 rounded font-bold shrink-0">
                                Current
                              </span>
                            ) : linkedTask ? (
                              <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.2 rounded shrink-0">
                                {linkedTask.status}
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Removal policy options */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                When removing packages from this group:
              </span>
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="removeMode"
                    value="unlink"
                    checked={packageRemoveMode === 'unlink'}
                    onChange={() => setPackageRemoveMode('unlink')}
                    className="text-sky-600 focus:ring-0"
                  />
                  <span>Unlink (Keep as standalone task)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="removeMode"
                    value="delete"
                    checked={packageRemoveMode === 'delete'}
                    onChange={() => setPackageRemoveMode('delete')}
                    className="text-rose-600 focus:ring-0"
                  />
                  <span>Delete task in removed package</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">
                Selected: <strong>{linkedGroupPackages.length}</strong> packages
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManagePackagesModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManagePackagesModal(false);
                    handleSave(true);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply & Save Group Scope</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
