import React, { useState } from 'react';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDateDisplay, getScheduleVariance, getDeadlineBadge } from '../../lib/dateUtils';
import {
  X,
  Mail,
  Copy,
  Check,
  Table,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ExpediteEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks: Task[];
}

export const ExpediteEmailModal: React.FC<ExpediteEmailModalProps> = ({
  isOpen,
  onClose,
  selectedTasks,
}) => {
  const { currentUser, projects, packages, showToast } = useApp();

  const [copiedType, setCopiedType] = useState<'html' | 'text' | null>(null);
  const [subject, setSubject] = useState<string>(
    `[EXPEDITE NOTICE] Urgent Action Required - Critical Engineering Deliverables (${selectedTasks.length} Items)`
  );
  const [recipient, setRecipient] = useState<string>('Contractor / Lead Discipline Engineers');
  const [customNote, setCustomNote] = useState<string>(
    'Please review the following engineering deliverables that require immediate expediting. Kindly provide an updated recovery schedule and progress confirmation at your earliest convenience.'
  );

  if (!isOpen || selectedTasks.length === 0) return null;

  // Helper to format item data
  const getTaskInfo = (t: Task, idx: number) => {
    const pkg = packages.find((p) => p.id === t.package_id);
    const proj = projects.find((p) => p.id === t.project_id);
    const variance = getScheduleVariance(t.deadline, t.forecast_finish);
    const revCount = t.forecast_revision_count || 0;

    let delayText = 'On Track';
    let isDelayed = false;
    if (variance) {
      if (variance.isLate && variance.days > 0) {
        delayText = `DELAYED +${variance.days}d`;
        isDelayed = true;
      } else if (!variance.isLate && variance.days < 0) {
        delayText = `AHEAD ${Math.abs(variance.days)}d`;
      }
    }

    return {
      index: idx + 1,
      id: t.id.slice(0, 8),
      fullId: t.id,
      title: t.title,
      description: t.description || 'N/A',
      projectCode: proj?.code || 'GEN',
      packageCode: pkg?.code || 'GEN-00',
      packageName: pkg?.name || 'General Package',
      discipline: pkg?.discipline || 'Multi-discipline',
      assignee: t.assignee_name || 'Unassigned',
      deadline: t.deadline ? formatDateDisplay(t.deadline) : 'Not set',
      forecast: t.forecast_finish ? formatDateDisplay(t.forecast_finish) : 'N/A',
      delayText,
      isDelayed,
      revCount,
      priority: t.priority,
      status: t.status,
      progress: `${t.progress}%`,
    };
  };

  const taskInfos = selectedTasks.map((t, i) => getTaskInfo(t, i));

  // Generate plain text email
  const generatePlainText = () => {
    const lines: string[] = [];
    lines.push(`Subject: ${subject}`);
    lines.push('');
    lines.push(`To: ${recipient}`);
    lines.push('');
    lines.push('Dear Team,');
    lines.push('');
    lines.push(customNote);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════════════════════════');
    lines.push('DELIVERABLES & TASKS EXPEDITE LIST');
    lines.push('═══════════════════════════════════════════════════════════════════════════════════');
    lines.push('');

    taskInfos.forEach((info) => {
      lines.push(`${info.index}. [${info.packageCode}] ${info.title} (Priority: ${info.priority} | Status: ${info.status} - ${info.progress})`);
      lines.push(`   • Assignee: ${info.assignee} | Discipline: ${info.discipline}`);
      lines.push(`   • Baseline Deadline: ${info.deadline} | Forecast Finish: ${info.forecast} | Variance: ${info.delayText}`);
      if (info.revCount > 0) {
        lines.push(`   • ⚠️ Forecast Revisions: Revised ${info.revCount} time(s) - High priority attention needed`);
      }
      if (info.description && info.description !== 'N/A') {
        const shortDesc = info.description.length > 140 ? info.description.slice(0, 140) + '...' : info.description;
        lines.push(`   • Scope/Notes: ${shortDesc}`);
      }
      lines.push('');
    });

    lines.push('───────────────────────────────────────────────────────────────────────────────────');
    lines.push('Action Required: Please submit an updated progress status and schedule mitigation plan.');
    lines.push('');
    lines.push('Best regards,');
    lines.push(currentUser?.name || 'Project Engineering Lead');
    lines.push('Engineering Management Team');

    return lines.join('\n');
  };

  // Generate HTML table for email clients (Outlook, Gmail, Apple Mail)
  const generateHtmlEmail = () => {
    const tableRows = taskInfos
      .map(
        (info) => `
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${info.isDelayed ? '#fff1f2' : '#ffffff'};">
        <td style="padding: 10px 12px; font-weight: bold; color: #475569; text-align: center; font-size: 12px;">${info.index}</td>
        <td style="padding: 10px 12px; font-size: 13px;">
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 3px;">${escapeHtml(info.title)}</div>
          <div style="font-size: 11px; color: #64748b;">${escapeHtml(info.description !== 'N/A' ? info.description.slice(0, 150) : '')}</div>
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #334155; white-space: nowrap;">
          <strong style="color: #0b3b70;">${escapeHtml(info.packageCode)}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">${escapeHtml(info.discipline)}</span>
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #1e293b; white-space: nowrap;">${escapeHtml(info.assignee)}</td>
        <td style="padding: 10px 12px; font-size: 12px; color: #475569; white-space: nowrap; font-family: Consolas, monospace;">${escapeHtml(info.deadline)}</td>
        <td style="padding: 10px 12px; font-size: 12px; color: ${info.isDelayed ? '#be123c' : '#047857'}; font-weight: 600; white-space: nowrap; font-family: Consolas, monospace;">
          ${escapeHtml(info.forecast)}
          ${info.revCount > 0 ? `<br/><span style="font-size: 10px; color: #b45309; font-weight: normal;">(Rev #${info.revCount})</span>` : ''}
        </td>
        <td style="padding: 10px 12px; font-size: 11px; white-space: nowrap; text-align: center;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; ${
            info.isDelayed
              ? 'background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3;'
              : 'background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;'
          }">
            ${escapeHtml(info.delayText)}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 11px; white-space: nowrap; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; ${
            info.priority === 'CRITICAL'
              ? 'background-color: #fee2e2; color: #b91c1c;'
              : info.priority === 'HIGH'
              ? 'background-color: #ffedd5; color: #c2410c;'
              : 'background-color: #f1f5f9; color: #334155;'
          }">
            ${escapeHtml(info.priority)}
          </span>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${escapeHtml(info.status)} (${info.progress})</div>
        </td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 10px;">
  <p style="font-size: 14px; margin-bottom: 8px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
  <p style="font-size: 13px; margin-bottom: 8px;"><strong>To:</strong> ${escapeHtml(recipient)}</p>
  <p style="font-size: 13px; margin-bottom: 12px;">Dear Team,</p>
  <p style="font-size: 13px; margin-bottom: 16px; color: #334155;">${escapeHtml(customNote)}</p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <thead>
      <tr style="background-color: #0b3b70; color: #ffffff; text-align: left;">
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; width: 35px; text-align: center;">#</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; min-width: 220px;">Task Title & Technical Scope</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Package / Discipline</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Assignee</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Baseline Deadline</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold;">Forecast Finish</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center;">Variance</th>
        <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <p style="font-size: 12px; font-weight: 600; color: #b91c1c; margin-bottom: 12px;">
    ⚠️ Action Required: Please review the flagged items above and reply with an expedited recovery action plan by return email.
  </p>

  <p style="font-size: 13px; margin-bottom: 4px;">Best regards,</p>
  <p style="font-size: 13px; font-weight: bold; margin-bottom: 2px; color: #0b3b70;">${escapeHtml(currentUser?.name || 'Project Engineering Lead')}</p>
  <p style="font-size: 12px; color: #64748b; margin-top: 0;">Engineering Management & Project Controls</p>
</body>
</html>
    `.trim();
  };

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Handle Copy as Formatted HTML Table (For Outlook / Gmail)
  const handleCopyHtml = async () => {
    try {
      const htmlContent = generateHtmlEmail();
      const plainContent = generatePlainText();

      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([plainContent], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainContent);
      }

      setCopiedType('html');
      showToast(`✅ Copied ${selectedTasks.length} tasks as formatted table! Paste directly into Outlook / Gmail.`);
      setTimeout(() => setCopiedType(null), 3000);
    } catch (err: any) {
      console.warn('ClipboardItem failed, falling back to plain text:', err);
      try {
        await navigator.clipboard.writeText(generatePlainText());
        setCopiedType('html');
        showToast('✅ Copied tasks to clipboard as text.');
        setTimeout(() => setCopiedType(null), 3000);
      } catch (e: any) {
        showToast(`❌ Copy failed: ${e.message}`);
      }
    }
  };

  // Handle Copy as Plain Text
  const handleCopyPlainText = async () => {
    try {
      const plainContent = generatePlainText();
      await navigator.clipboard.writeText(plainContent);
      setCopiedType('text');
      showToast(`✅ Copied ${selectedTasks.length} tasks as plain text email summary.`);
      setTimeout(() => setCopiedType(null), 3000);
    } catch (err: any) {
      showToast(`❌ Copy failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0b3b70] via-[#0f4c81] to-[#072346] px-5 py-3.5 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20">
              <Mail className="w-4 h-4 text-sky-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                <span>Copy Tasks For Expedite Email</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 border border-white/20 font-bold">
                  {selectedTasks.length} ITEMS SELECTED
                </span>
              </h2>
              <p className="text-xs text-sky-100/90">
                Generate formatted table and email text ready to paste directly into Outlook, Gmail, or Teams.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Quick Email Controls */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Recipient / Contractor
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Expedite Note / Instruction
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Table Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-blue-600" />
                <span>Expedite Items Table Preview</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pasting in Outlook/Gmail creates a native HTML table with styled headers
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b3b70] text-white">
                    <th className="py-2 px-3 font-bold text-[10px] uppercase w-10 text-center">#</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase min-w-[200px]">Task / Scope</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase">Package</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase">Assignee</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase">Deadline</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase">Forecast</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase text-center">Variance</th>
                    <th className="py-2 px-3 font-bold text-[10px] uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {taskInfos.map((info) => (
                    <tr
                      key={info.fullId}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        info.isDelayed ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-400">{info.index}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{info.title}</div>
                        {info.description && info.description !== 'N/A' && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                            {info.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{info.packageCode}</span>
                        <div className="text-[10px] text-slate-500 truncate">{info.discipline}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{info.assignee}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {info.deadline}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono font-semibold ${
                            info.isDelayed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {info.forecast}
                        </span>
                        {info.revCount > 0 && (
                          <span className="block text-[10px] font-mono text-amber-600 dark:text-amber-400">
                            (Rev #{info.revCount})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            info.isDelayed
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {info.delayText}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            info.priority === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : info.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {info.priority}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {info.status} ({info.progress})
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total <strong className="text-slate-800 dark:text-slate-200">{selectedTasks.length}</strong> items ready to expedite.
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleCopyPlainText}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedType === 'text' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied Text!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy Plain Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              {copiedType === 'html' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied Formatted Table!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Formatted Table (for Email)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
