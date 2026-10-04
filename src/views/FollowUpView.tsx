import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { FollowUpItem, InterfaceDiscipline, InterfaceStatus, INTERFACE_DISCIPLINES } from '../types';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import { formatDateDisplay } from '../lib/dateUtils';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Building2,
  User,
  Box,
  FolderGit2,
  Check,
  Send,
  Loader2,
  X,
  Edit2,
  ChevronRight,
} from 'lucide-react';

const DISCIPLINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Process: { bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  Piping: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Electrical: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  Mechanical: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  Structural: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Pipeline: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  Safety: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  EMT: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  PMT: { bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  Instrument: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Other: { bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
};

export const FollowUpView: React.FC = () => {
  const {
    setSelectedTaskId,
    setActiveView,
    currentUser,
    showToast,
    workspaceBranding,
    dataVersion,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'today' | 'overdue' | 'next7' | 'next14' | 'waiting' | 'open'>('today');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({
    today: 0,
    overdue: 0,
    next7Days: 0,
    next14Days: 0,
    waiting: 0,
    open: 0,
    totalActive: 0,
  });
  const [items, setItems] = useState<FollowUpItem[]>([]);

  // Follow-up modal state
  const [activeFollowUpItem, setActiveFollowUpItem] = useState<FollowUpItem | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFollowUps({
        filter: activeFilter,
        discipline: selectedDiscipline !== 'ALL' ? selectedDiscipline : undefined,
        search: searchTerm.trim() || undefined,
      });
      setCounts(res.counts);
      setItems(res.items);
    } catch (err: any) {
      showToast(`Error fetching follow-ups: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, selectedDiscipline, searchTerm, dataVersion, showToast]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleQuickStatusChange = async (item: FollowUpItem, status: InterfaceStatus) => {
    try {
      await api.updateInterfaceStatus(item.id, status, currentUser?.id);
      showToast(`${item.discipline} interface marked as ${status}`);
      fetchFollowUps();
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`);
    }
  };

  const handleOpenFollowUpModal = (item: FollowUpItem) => {
    setActiveFollowUpItem(item);
    setFollowUpNote('');
    // Default next follow-up to +3 days from today
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setNextFollowUpDate(d.toISOString().split('T')[0]);
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpItem) return;

    setIsSubmittingFollowUp(true);
    try {
      await api.recordInterfaceFollowUp(activeFollowUpItem.id, {
        next_follow_up: nextFollowUpDate || null,
        note: followUpNote.trim() || undefined,
        userId: currentUser?.id,
      });
      showToast(`Follow-up recorded for ${activeFollowUpItem.discipline}`);
      setActiveFollowUpItem(null);
      fetchFollowUps();
    } catch (err: any) {
      showToast(`Error recording follow-up: ${err.message}`);
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const filterTabs = [
    { id: 'today', label: 'Follow-Up Today', count: counts.today, alert: counts.today > 0, icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'overdue', label: 'Overdue Follow-Up', count: counts.overdue, alert: counts.overdue > 0, danger: true, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'next7', label: 'Next 7 Days', count: counts.next7Days, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'next14', label: 'Next 14 Days', count: counts.next14Days, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'waiting', label: 'Waiting on Discipline', count: counts.waiting, icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'open', label: 'Open Interfaces', count: counts.open, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 overflow-y-auto space-y-3 transition-colors">
      {/* Top Banner */}
      <div
        className={`shrink-0 min-h-[64px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-4 py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Clock className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              INTERFACE FOLLOW-UP QUEUE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              Scope: Instrument Work Interfaces
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Track, chase, and resolve engineering inputs required from external disciplines (Process, Electrical, Piping, Safety, etc.) for Instrument deliverables.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchFollowUps()}
            disabled={loading}
            title="Refresh follow-up queue"
            className="p-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Queue Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shrink-0 border ${
              activeFilter === tab.id
                ? 'bg-[#0b3b70] text-white border-[#0b3b70] shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
          >
            <span className={activeFilter === tab.id ? 'text-white' : tab.danger ? 'text-rose-500' : 'text-slate-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeFilter === tab.id
                  ? 'bg-white/20 text-white'
                  : tab.danger && tab.count > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : tab.alert && tab.count > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary Controls: Search & Discipline Filter Chips */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search action required, external PIC, task, notes..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            Showing <b>{items.length}</b> follow-up items
          </div>
        </div>

        {/* Discipline Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            DISCIPLINE:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDiscipline('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              selectedDiscipline === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Disciplines
          </button>
          {INTERFACE_DISCIPLINES.map((disc) => {
            const colors = DISCIPLINE_COLORS[disc] || DISCIPLINE_COLORS.Other;
            const isSelected = selectedDiscipline === disc;
            return (
              <button
                key={disc}
                type="button"
                onClick={() => setSelectedDiscipline(disc)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0b3b70] text-white border-[#0b3b70]'
                    : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                }`}
              >
                {disc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Follow-Up Items List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 space-x-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading follow-up queue...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              All caught up! No items in this follow-up queue.
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no pending interfaces requiring chase for the selected filters. Great coordination with project disciplines!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                  <th className="py-2 px-3 w-28">Discipline</th>
                  <th className="py-2 px-3">Action Required from External Discipline</th>
                  <th className="py-2 px-3 w-48">External PIC</th>
                  <th className="py-2 px-3 w-48">Instrument Task</th>
                  <th className="py-2 px-3 w-28">Due Date</th>
                  <th className="py-2 px-3 w-32">Next Follow-Up</th>
                  <th className="py-2 px-3 w-24">Status</th>
                  <th className="py-2 px-3 w-44 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const discColor = DISCIPLINE_COLORS[item.discipline] || DISCIPLINE_COLORS.Other;
                  const isOverdueFollowUp = item.urgency === 'OVERDUE';
                  const isTodayFollowUp = item.urgency === 'TODAY';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTaskId(item.task_id)}
                      title="Click to open full task details"
                    >
                      {/* Discipline Badge */}
                      <td className="py-2.5 px-3 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-mono font-bold border ${discColor.bg} ${discColor.text} ${discColor.border}`}
                        >
                          {item.discipline}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Waiting: <b>{item.days_waiting}d</b>
                        </div>
                      </td>

                      {/* Action Required & Notes */}
                      <td className="py-2.5 px-3 align-top min-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words">
                          {item.action}
                        </div>
                        {item.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic bg-slate-50 dark:bg-slate-850 p-1.5 rounded border border-slate-100 dark:border-slate-800 break-words whitespace-pre-wrap">
                            {item.note}
                          </div>
                        )}
                      </td>

                      {/* External PIC */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.external_pic || 'Unassigned PIC'}
                        </div>
                        {item.external_email && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {item.external_email}
                          </div>
                        )}
                      </td>

                      {/* Associated Instrument Task */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-[#0b3b70] dark:text-blue-400 group-hover:underline line-clamp-2">
                          {item.task_title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                          {item.project_code && <span>{item.project_code}</span>}
                          {item.package_code && <span>· {item.package_code}</span>}
                          {item.assignee_name && <span>· PIC: {item.assignee_name}</span>}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-3 align-top font-mono text-[11px]">
                        {item.due_date ? (
                          <span className={item.due_date < new Date().toISOString().split('T')[0] ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                            {formatDateDisplay(item.due_date)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Next Follow-Up */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-mono text-[11px]">
                          {item.next_follow_up ? (
                            <span
                              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-bold ${
                                isOverdueFollowUp
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300'
                                  : isTodayFollowUp
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{formatDateDisplay(item.next_follow_up)}</span>
                              {isOverdueFollowUp && <span>⚠️</span>}
                              {isTodayFollowUp && <span>🔥</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not set</span>
                          )}
                        </div>
                        {item.last_follow_up && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Last: {formatDateDisplay(item.last_follow_up)}
                          </div>
                        )}
                      </td>

                      {/* Interface Status */}
                      <td className="py-2.5 px-3 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.status === 'WAITING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                              : item.status === 'OPEN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300'
                              : item.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Fast Action Buttons */}
                      <td className="py-2.5 px-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(item)}
                            className="px-2 py-1 bg-[#0b3b70] hover:bg-[#0f4c81] text-white text-[11px] font-semibold rounded flex items-center space-x-1 cursor-pointer shadow-2xs"
                            title="Log chase / update next follow-up date"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Chase</span>
                          </button>

                          {item.status !== 'RECEIVED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(item, 'RECEIVED')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded flex items-center space-x-1 cursor-pointer shadow-2xs"
                              title="Mark input received from discipline"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Received</span>
                            </button>
                          )}

                          {item.status !== 'CLOSED' && item.status === 'RECEIVED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(item, 'CLOSED')}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-semibold rounded cursor-pointer"
                              title="Close interface"
                            >
                              <span>Close</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Chase / Follow-Up Modal */}
      {activeFollowUpItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSubmittingFollowUp) setActiveFollowUpItem(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    {activeFollowUpItem.discipline}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Record Chase / Follow-Up
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {activeFollowUpItem.action}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveFollowUpItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">External Contact:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeFollowUpItem.external_pic || 'None specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Associated Task:</span>
                  <span className="font-semibold text-[#0b3b70] dark:text-blue-400 truncate max-w-[240px]">
                    {activeFollowUpItem.task_title}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Follow-Up Note / Outcome of Chase
                </label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Sent email reminder to John Smith. He confirmed revision will be completed by Thursday morning."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveFollowUpItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFollowUp}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0b3b70] hover:bg-[#0f4c81] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSubmittingFollowUp ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Record Chase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
