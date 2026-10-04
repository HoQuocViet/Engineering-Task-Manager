import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  Camera,
  Search,
  CheckCircle2,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { PicMember } from '../../types';

export const PicsSettingsTab: React.FC = () => {
  const { pics, refreshData, showToast } = useApp();

  // PIC Form State
  const [picName, setPicName] = useState('');
  const [picRole, setPicRole] = useState('');
  const [picAvatar, setPicAvatar] = useState('');
  const [editingPicId, setEditingPicId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [picSearch, setPicSearch] = useState('');
  const [uploadingForPicId, setUploadingForPicId] = useState<string | null>(null);

  // Hidden file inputs
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const listFileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (n: string) => {
    const clean = n.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Image Upload handler for the active form
  const handleFormImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Avatar image too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPicAvatar(event.target.result);
        showToast('Photo selected! Click Save to apply.');
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  // Direct image click upload on list items
  const handleListImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetPicId = uploadingForPicId;
    if (!file || !targetPicId) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Avatar image too large (max 2MB)');
      return;
    }

    const targetPic = pics.find((p) => p.id === targetPicId);
    if (!targetPic) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof event.target?.result === 'string') {
        const base64 = event.target.result;
        try {
          await api.updatePic(targetPicId, {
            name: targetPic.name,
            role: targetPic.role,
            avatar: base64,
          });
          showToast(`Updated avatar for ${targetPic.name}`);
          await refreshData();
        } catch (err: any) {
          showToast(`Failed to update avatar: ${err.message}`);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setUploadingForPicId(null);
  };

  const handleAddOrUpdatePic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picName.trim()) {
      showToast('Name is required for Person In Charge');
      return;
    }

    try {
      if (editingPicId) {
        await api.updatePic(editingPicId, {
          name: picName.trim(),
          role: picRole.trim(),
          avatar: picAvatar,
        });
        showToast(`Updated PIC "${picName}"`);
        setEditingPicId(null);
      } else {
        await api.createPic({
          name: picName.trim(),
          role: picRole.trim(),
          avatar: picAvatar,
        });
        showToast(`Added PIC "${picName}"`);
      }

      setPicName('');
      setPicRole('');
      setPicAvatar('');
      await refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const startEditPic = (pic: PicMember) => {
    setEditingPicId(pic.id);
    setPicName(pic.name);
    setPicRole(pic.role || '');
    setPicAvatar(pic.avatar || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditPic = () => {
    setEditingPicId(null);
    setPicName('');
    setPicRole('');
    setPicAvatar('');
  };

  const handleDeletePic = async (id: string, name: string) => {
    try {
      await api.deletePic(id);
      showToast(`Removed "${name}" from PICs`);
      if (editingPicId === id) {
        cancelEditPic();
      }
      if (confirmDeleteId === id) {
        setConfirmDeleteId(null);
      }
      await refreshData();
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`);
    }
  };

  const filteredPics = pics.filter(
    (p) =>
      !picSearch.trim() ||
      p.name.toLowerCase().includes(picSearch.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(picSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={formFileInputRef}
        onChange={handleFormImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={listFileInputRef}
        onChange={handleListImageUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Add / Edit PIC Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 flex flex-col justify-between min-h-[540px] transition-colors">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {editingPicId ? 'Edit Person In Charge' : 'Add Person In Charge (PIC)'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Assignee members, project positions, and photo avatars
                </p>
              </div>
            </div>

            <form onSubmit={handleAddOrUpdatePic} className="space-y-4">
              {/* Click Avatar to Upload / Change Photo (No separate button) */}
              <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div
                  onClick={() => formFileInputRef.current?.click()}
                  title="Click to select or change avatar photo"
                  className="relative group w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 border-dashed border-blue-400 hover:border-blue-600 transition-all shadow-sm flex items-center justify-center bg-white dark:bg-slate-800"
                >
                  {picAvatar ? (
                    <img
                      src={picAvatar}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      {picName ? (
                        <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                          {getInitials(picName)}
                        </span>
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold tracking-tight">Click to Change</span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                    {picAvatar ? 'Avatar uploaded' : 'Click avatar to add photo'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PNG, JPG, or WEBP (Max 2MB)
                  </span>
                  {picAvatar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPicAvatar('');
                      }}
                      className="mt-1 text-[10px] text-rose-500 hover:text-rose-700 underline block mx-auto cursor-pointer"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {/* Column 1: Person's Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Person Name * (Tên người)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ho Quoc Viet, Tran Van Binh..."
                  required
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Column 2: Project Position / Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Project Position / Role (Vị trí trong dự án)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Project Manager, Lead Piping, Senior Electrical..."
                  value={picRole}
                  onChange={(e) => setPicRole(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {editingPicId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingPicId ? 'Save Changes' : 'Add PIC Member'}</span>
                </button>

                {editingPicId && (
                  <button
                    type="button"
                    onClick={cancelEditPic}
                    className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Automatic PIC Synchronization</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Any PIC added here is immediately available in the Task List PIC selector. If you enter a new name directly in the task list popover, it will automatically register here.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
            <span>Total PICs:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {pics.length}
            </span>
          </div>
        </div>

        {/* Right Column: PIC List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs flex flex-col min-h-[540px] justify-between transition-colors">
          <div>
            {/* Header Bar with Search */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-bold text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-2">
                <span>Persons In Charge (Project Team)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  {pics.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={picSearch}
                    onChange={(e) => setPicSearch(e.target.value)}
                    placeholder="Search name or position..."
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-52 font-medium"
                  />
                </div>
                {picSearch && (
                  <button
                    onClick={() => setPicSearch('')}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* PICs Scrollable List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[440px] scrollbar-crystal-dark">
              {filteredPics.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>
                    {picSearch
                      ? 'No persons in charge match your search term.'
                      : 'No persons in charge registered yet. Use the form on the left to add team members.'}
                  </p>
                </div>
              ) : (
                filteredPics.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-3">
                      {/* Avatar Image (Clickable directly on the list item to change photo) */}
                      <div
                        onClick={() => {
                          setUploadingForPicId(member.id);
                          listFileInputRef.current?.click();
                        }}
                        title="Click on avatar to change photo"
                        className="relative group w-10 h-10 rounded-full cursor-pointer shrink-0 overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-blue-500 transition-all"
                      >
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold font-mono text-xs">
                            {getInitials(member.name)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Name & Project Position */}
                      <div className="truncate min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 truncate">
                          <span className="truncate">{member.name}</span>
                          {(member.name.includes('(Me)') || member.name.includes('Tôi') || member.name.includes('Ho Quoc Viet')) && (
                            <span className="px-1.5 py-0.2 text-[9.5px] rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                              Me
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center space-x-1.5 truncate">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{member.role || 'Project Team Member'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {confirmDeleteId === member.id ? (
                        <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePic(member.id, member.name)}
                            className="px-2.5 py-1 text-[10px] text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded font-bold shadow-2xs cursor-pointer"
                          >
                            Delete?
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditPic(member)}
                            title="Edit name, position, or avatar"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(member.id)}
                            title="Delete PIC member"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
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
            <span>Click any avatar to change photo • Click edit icon to modify name and position</span>
            <span className="font-mono">{pics.length} Total Registered</span>
          </div>
        </div>
      </div>
    </div>
  );
};
