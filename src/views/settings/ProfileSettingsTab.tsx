import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { UserAvatar } from '../../components/UserAvatar';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Briefcase,
  Upload,
  Camera,
  CheckCircle2,
  Save,
  ShieldCheck,
  FileText,
  ListTodo,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

const PRESET_AVATARS = [
  { label: 'Alex Morgan (AM)', value: 'AM' },
  { label: 'Lead Engineer (PE)', value: 'PE' },
  { label: 'Piping Lead (PP)', value: 'PP' },
  { label: 'Electrical Lead (EL)', value: 'EL' },
  { label: 'Instrumentation (IC)', value: 'IC' },
  { label: 'Safety Lead (SE)', value: 'SE' },
];

export const ProfileSettingsTab: React.FC = () => {
  const { currentUser, refreshData, showToast } = useApp();

  const [name, setName] = useState(currentUser?.name || 'Alex Morgan');
  const [role, setRole] = useState(currentUser?.role || 'Lead Project & Discipline Engineer');
  const [discipline, setDiscipline] = useState(currentUser?.discipline || 'Piping & Mechanical');
  const [email, setEmail] = useState(currentUser?.email || 'ptscmc.ai11@gmail.com');
  const [phone, setPhone] = useState(currentUser?.phone || '+84 908 123 456');
  const [bio, setBio] = useState(
    currentUser?.bio || 'Lead Discipline Engineer overseeing EPC technical bid evaluations, discipline deliverables, and milestone schedules.'
  );
  const [avatar, setAvatar] = useState(currentUser?.avatar || 'AM');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setRole(currentUser.role || '');
      setDiscipline(currentUser.discipline || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || 'AM');
    }
  }, [currentUser]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatar(event.target.result);
        showToast('Photo avatar selected! Click "Save Engineer Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      if (currentUser?.id) {
        await api.updateUser(currentUser.id, {
          name: name.trim(),
          role: role.trim(),
          discipline: discipline.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          avatar: avatar.trim() || 'AM',
        });
      } else {
        await api.updateProfile({
          name: name.trim(),
          role: role.trim(),
          discipline: discipline.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          avatar: avatar.trim() || 'AM',
        });
      }

      await refreshData();
      showToast('✅ Engineer profile updated successfully!');
    } catch (err: any) {
      showToast(`Error updating profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Column: Engineer Profile Preview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6 flex flex-col justify-between transition-colors">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
              <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Current Engineer Card</span>
            </div>
            {Boolean(currentUser?.is_admin) && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                ADMIN
              </span>
            )}
          </div>

          {/* Avatar & Main Identity */}
          <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            {/* Centered Avatar with Action Button in Center */}
            <div className="relative group inline-block">
              <UserAvatar
                name={name || 'Engineer'}
                avatar={avatar}
                size="2xl"
                showBadge={true}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-110 border-2 border-white/90"
                title="Click to select and upload new avatar photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{name || 'Engineer Name'}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{role || 'Discipline Engineer'}</p>
              {discipline && (
                <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                  {discipline}
                </span>
              )}
            </div>
          </div>

          {/* Workload Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">Assigned Tasks</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {currentUser?.assigned_task_count ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">Open Deliverables</div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {currentUser?.open_task_count ?? 0}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center space-x-2.5">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{email || 'Not provided'}</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{discipline || 'General Engineering'}</span>
            </div>
          </div>

          {bio && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
              "{bio}"
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs flex items-start space-x-2 mt-4">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            All audit logs, deliverable assignments, and task comments will reflect this engineer profile.
          </p>
        </div>
      </div>

      {/* Right Column: Edit Profile Form */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6 transition-colors">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Engineer Profile</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Update personal contact information, discipline title, bio, and avatar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Role / Job Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Project & Discipline Engineer"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discipline / Department
              </label>
              <input
                type="text"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                placeholder="e.g. Piping, Process, Structural"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@domain.com"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 908 123 456"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Professional Bio / Summary
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio or engineering scope summary..."
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Avatar Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Avatar (Initials or Photo)
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  maxLength={4}
                  value={avatar.startsWith('data:') || avatar.startsWith('http') ? '' : avatar}
                  onChange={(e) => setAvatar(e.target.value.toUpperCase())}
                  placeholder="AM"
                  className="w-20 text-center font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-2 outline-none focus:border-blue-500 uppercase"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Custom Initials</span>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              {/* Preset Initials */}
              <div className="flex items-center space-x-1.5 flex-wrap">
                {PRESET_AVATARS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAvatar(p.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      avatar === p.value
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {p.value}
                  </button>
                ))}
              </div>

              {/* Hidden Photo File Input triggered by clicking center of avatar */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save Engineer Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
