import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PicMember } from '../../types';
import { Users, Plus, Loader2, X } from 'lucide-react';

interface PicSelectorProps {
  selectedPics: string[];
  onChange: (pics: string[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  compact?: boolean;
}

export const PicSelector: React.FC<PicSelectorProps> = ({
  selectedPics = [],
  onChange,
  disabled = false,
  className = '',
  label = 'Person In Charge (PIC)',
  compact = false,
}) => {
  const { pics: registeredPics, createPicInline, users } = useApp();
  const [newPicName, setNewPicName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Compute unified list of all available candidates strictly from Settings (SQLite table `pics`)
  const allCandidates = useMemo(() => {
    const list: string[] = [];

    // 1. Registered PICs from Settings (SQLite table `pics`)
    if (Array.isArray(registeredPics)) {
      for (const p of registeredPics) {
        if (p.name && !list.includes(p.name)) {
          list.push(p.name);
        }
      }
    }

    // 2. Preserve any previously assigned custom PICs on this task without duplicating
    if (Array.isArray(selectedPics)) {
      for (const p of selectedPics) {
        if (!p) continue;
        const cleanP = p.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase();
        const alreadyCovered = list.some(
          (existing) =>
            existing.toLowerCase() === p.toLowerCase() ||
            existing.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase() === cleanP
        );
        if (!alreadyCovered) {
          list.push(p);
        }
      }
    }

    return list;
  }, [registeredPics, selectedPics]);

  // Lookup person metadata (avatar, role) by name
  const getPersonInfo = (name: string): { avatar?: string; role?: string } => {
    const clean = name.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase();
    const picMatch = registeredPics?.find(
      (p) => p.name.toLowerCase() === clean || p.name.toLowerCase() === name.toLowerCase()
    );
    if (picMatch) {
      return { avatar: picMatch.avatar, role: picMatch.role };
    }

    const userMatch = users?.find(
      (u) => u.name.toLowerCase() === clean || u.name.toLowerCase() === name.toLowerCase()
    );
    if (userMatch) {
      return { avatar: userMatch.avatar, role: userMatch.role };
    }

    return {};
  };

  const getInitials = (n: string): string => {
    const clean = n.replace(/\s*\(Tôi\)\s*$/, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSelectPic = (name: string) => {
    if (!name) return;
    const cleanName = name.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase();
    const alreadySelected = selectedPics.some((p) => {
      if (p === name) return true;
      return p.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase() === cleanName;
    });
    if (alreadySelected) return;
    onChange([...selectedPics, name]);
  };

  const handleRemovePic = (name: string) => {
    const cleanName = name.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase();
    onChange(
      selectedPics.filter(
        (p) => p !== name && p.replace(/\s*\(Tôi\)\s*$/, '').trim().toLowerCase() !== cleanName
      )
    );
  };

  const handleCreateNewPic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPicName.trim();
    if (!trimmed) return;

    setIsAddingNew(true);
    try {
      if (createPicInline) {
        await createPicInline(trimmed, 'Project Team Member');
      }
      if (!selectedPics.includes(trimmed)) {
        onChange([...selectedPics, trimmed]);
      }
      setNewPicName('');
    } catch (err) {
      console.error('Failed to create PIC inline:', err);
    } finally {
      setIsAddingNew(false);
    }
  };

  // Candidates not yet selected
  const unselectedCandidates = allCandidates.filter((cand) => !selectedPics.includes(cand));

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      {/* Header with counter */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
          {selectedPics.length === 0 ? '0 selected (Unassigned)' : `${selectedPics.length} selected`}
        </span>
      </div>

      {/* Selected PICs Chips Container */}
      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px] flex flex-wrap items-center gap-1.5">
        {selectedPics.length === 0 ? (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic py-0.5 px-1">
            No person assigned (Deliverable is Unassigned)
          </span>
        ) : (
          selectedPics.map((p) => {
            const isMe = p.includes('Tôi') || p.includes('Ho Quoc Viet');
            const info = getPersonInfo(p);

            return (
              <span
                key={p}
                className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs transition-colors ${
                  isMe
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                title={info.role ? `${p} • ${info.role}` : p}
              >
                {/* Avatar image or initials circle */}
                {info.avatar ? (
                  <img
                    src={info.avatar}
                    alt={p}
                    className="w-4.5 h-4.5 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <span
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono shrink-0 ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {getInitials(p)}
                  </span>
                )}

                <span className="truncate max-w-[140px] leading-tight">{p}</span>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemovePic(p)}
                    className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer text-[12px] font-bold ml-0.5 transition-colors leading-none"
                    title={`Remove ${p}`}
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>

      {/* Selector Controls: Select Existing Dropdown & Inline Add Form */}
      {!disabled && (
        <div className="space-y-1.5 pt-0.5">
          {/* Dropdown for selecting team members from SQLite */}
          <select
            value=""
            onChange={(e) => {
              handleSelectPic(e.target.value);
              e.target.value = '';
            }}
            className="w-full text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="" disabled>
              + Select person from team roster ({unselectedCandidates.length} available)...
            </option>
            {unselectedCandidates.map((cand) => {
              const info = getPersonInfo(cand);
              return (
                <option key={cand} value={cand}>
                  {cand} {info.role ? `(${info.role})` : ''}
                </option>
              );
            })}
          </select>

          {/* Quick-add new person on the fly (persists to SQLite table `pics`) */}
          <form onSubmit={handleCreateNewPic} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newPicName}
              onChange={(e) => setNewPicName(e.target.value)}
              placeholder="Or type colleague name to register into SQLite roster..."
              className="flex-1 text-[11px] bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isAddingNew || !newPicName.trim()}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              title="Add person to roster and assign to this deliverable"
            >
              {isAddingNew ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3 stroke-[2.5]" />
              )}
              <span>Add</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
