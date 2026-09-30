import { Task, Project, Package } from '../types';
import { formatDateDdMmYyyy, getScheduleVariance } from './dateUtils';
import { sortTasksByPriorityAndDate } from './sortUtils';

export interface PrintFilterInfo {
  projectName?: string;
  packageName?: string;
  status?: string;
  priority?: string;
  category?: string;
  searchQuery?: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an A4 Landscape HTML document for task list printing
 */
export function generatePrintReportHtml(
  tasks: Task[],
  filterInfo: PrintFilterInfo,
  workspaceBranding?: { title?: string; subtitle?: string },
  projects: Project[] = [],
  packages: Package[] = []
): string {
  // Sort tasks using official EPC Priority & Nearest Date order
  const sortedTasks = sortTasksByPriorityAndDate(tasks);

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const total = sortedTasks.length;
  const inProgress = sortedTasks.filter((t) => t.status === 'IN PROGRESS').length;
  const waiting = sortedTasks.filter((t) => t.status === 'WAITING' || t.status === 'ON HOLD').length;
  const done = sortedTasks.filter((t) => t.status === 'DONE').length;
  const overdue = sortedTasks.filter((t) => {
    if (t.status === 'DONE' || t.status === 'CANCELLED') return false;
    const targetDate = t.forecast_finish || t.deadline;
    if (!targetDate) return false;
    const d = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }).length;

  const avgProgress =
    total > 0 ? Math.round(sortedTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const title = workspaceBranding?.title || 'ENGINEERING WORK MANAGER';
  const subtitle = workspaceBranding?.subtitle || 'EPC Project Deliverables & Procurement Tracking';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} - Task List Report</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.35;
      padding: 12px 16px;
    }
    .no-print {
      display: flex;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0 !important;
      }
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .report-title h1 {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .report-title p {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 8pt;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #475569;
    }
    .report-meta strong {
      color: #0f172a;
    }
    .filter-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 8pt;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .filter-item {
      display: flex;
      gap: 4px;
    }
    .filter-label {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 7pt;
    }
    .filter-value {
      font-weight: 600;
      color: #0f172a;
    }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-title {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .kpi-value {
      font-size: 11pt;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .kpi-total .kpi-value { color: #0284c7; }
    .kpi-progress .kpi-value { color: #d97706; }
    .kpi-waiting .kpi-value { color: #7c3aed; }
    .kpi-overdue .kpi-value { color: #e11d48; }
    .kpi-done .kpi-value { color: #059669; }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 12px;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.3px;
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      text-align: left;
    }
    table.data-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 6px;
      vertical-align: middle;
    }
    table.data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, monospace;
      text-transform: uppercase;
      text-align: center;
    }
    .badge-critical { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-high { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .badge-medium { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    .badge-done { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-inprogress { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
    .badge-waiting { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-hold { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .badge-todo { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
    .badge-cancelled { background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; text-decoration: line-through; }

    .text-overdue { color: #dc2626; font-weight: 700; font-family: ui-monospace, monospace; }
    .text-ahead { color: #16a34a; font-weight: 600; font-family: ui-monospace, monospace; }
    .text-ontime { color: #64748b; font-family: ui-monospace, monospace; }

    .progress-bar-bg {
      background: #e2e8f0;
      border-radius: 2px;
      height: 6px;
      width: 50px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #0284c7;
    }
    .progress-bar-fill.done {
      background: #16a34a;
    }

    .report-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {
          console.warn('Auto-print blocked:', e);
        }
      }, 250);
    });
  </script>
</head>
<body>
  <div class="report-header">
    <div class="report-title">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="report-meta">
      <div>Report Date: <strong>${printDate}</strong></div>
      <div>Total Tasks: <strong>${total}</strong> | Done: <strong>${done} (${completionRate}%)</strong></div>
    </div>
  </div>

  <div class="filter-summary">
    <div class="filter-item">
      <span class="filter-label">Project:</span>
      <span class="filter-value">${escapeHtml(filterInfo.projectName || 'All Projects')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Package:</span>
      <span class="filter-value">${escapeHtml(filterInfo.packageName || 'All Packages')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Status:</span>
      <span class="filter-value">${escapeHtml(filterInfo.status || 'All Statuses')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Priority:</span>
      <span class="filter-value">${escapeHtml(filterInfo.priority || 'All Priorities')}</span>
    </div>
    ${
      filterInfo.category && filterInfo.category !== 'ALL'
        ? `<div class="filter-item">
            <span class="filter-label">Category:</span>
            <span class="filter-value">${escapeHtml(filterInfo.category)}</span>
          </div>`
        : ''
    }
    ${
      filterInfo.searchQuery
        ? `<div class="filter-item">
            <span class="filter-label">Search Query:</span>
            <span class="filter-value">"${escapeHtml(filterInfo.searchQuery)}"</span>
          </div>`
        : ''
    }
  </div>

  <div class="kpi-strip">
    <div class="kpi-card kpi-total">
      <div class="kpi-title">Total Tasks</div>
      <div class="kpi-value">${total}</div>
    </div>
    <div class="kpi-card kpi-progress">
      <div class="kpi-title">In Progress</div>
      <div class="kpi-value">${inProgress}</div>
    </div>
    <div class="kpi-card kpi-waiting">
      <div class="kpi-title">Waiting / Hold</div>
      <div class="kpi-value">${waiting}</div>
    </div>
    <div class="kpi-card kpi-overdue">
      <div class="kpi-title">Overdue Alert</div>
      <div class="kpi-value">${overdue}</div>
    </div>
    <div class="kpi-card kpi-done">
      <div class="kpi-title">Completed</div>
      <div class="kpi-value">${done} (${avgProgress}% Avg)</div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 26px; text-align: center;">#</th>
        <th style="width: 65px;">Priority</th>
        <th style="width: 80px;">Status</th>
        <th>Task Title / Note Description</th>
        <th style="width: 140px;">Project / Package</th>
        <th style="width: 80px;">Progress</th>
        <th style="width: 75px;">Deadline</th>
        <th style="width: 75px;">Forecast</th>
        <th style="width: 60px;">Variance</th>
        <th style="width: 100px;">Tags / Cat</th>
      </tr>
    </thead>
    <tbody>
      ${
        sortedTasks.length === 0
          ? `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #64748b;">No engineering tasks match the selected filter criteria.</td></tr>`
          : sortedTasks
              .map((t, idx) => {
                const priorityBadgeClass =
                  t.priority === 'CRITICAL'
                    ? 'badge-critical'
                    : t.priority === 'HIGH'
                    ? 'badge-high'
                    : t.priority === 'MEDIUM'
                    ? 'badge-medium'
                    : 'badge-low';

                const statusBadgeClass =
                  t.status === 'DONE'
                    ? 'badge-done'
                    : t.status === 'IN PROGRESS'
                    ? 'badge-inprogress'
                    : t.status === 'WAITING'
                    ? 'badge-waiting'
                    : t.status === 'ON HOLD'
                    ? 'badge-hold'
                    : t.status === 'CANCELLED'
                    ? 'badge-cancelled'
                    : 'badge-todo';

                const variance = getScheduleVariance(t.deadline, t.forecast_finish);
                const varianceHtml = variance
                  ? variance.isLate
                    ? `<span class="text-overdue">+${variance.days}d</span>`
                    : `<span class="text-ahead">${variance.days}d</span>`
                  : `<span class="text-ontime">0d</span>`;

                const deadlineFormatted = t.deadline ? formatDateDdMmYyyy(t.deadline) : '-';
                const forecastFormatted = t.forecast_finish
                  ? formatDateDdMmYyyy(t.forecast_finish)
                  : '-';

                const pkgName = t.package_name || (t.package_id ? 'Package' : 'General');
                const projName = t.project_code || t.project_name || '';
                const pkgProjDisplay = projName ? `${projName} / ${pkgName}` : pkgName;

                const tagsText = (t.tags || []).map((tag) => `#${tag.name}`).join(' ');

                return `<tr>
                  <td style="text-align: center; color: #64748b; font-family: ui-monospace, monospace;">${idx + 1}</td>
                  <td><span class="badge ${priorityBadgeClass}">${t.priority || 'LOW'}</span></td>
                  <td><span class="badge ${statusBadgeClass}">${t.status}</span></td>
                  <td>
                    <div style="font-weight: 700; color: #0f172a;">${escapeHtml(t.title)}</div>
                    ${
                      t.description
                        ? `<div style="color: #475569; font-size: 6.8pt; margin-top: 2px; white-space: pre-wrap; word-break: break-word; line-height: 1.35;">${escapeHtml(
                            t.description
                          )}</div>`
                        : ''
                    }
                  </td>
                  <td style="font-size: 7pt; color: #334155;">${escapeHtml(pkgProjDisplay)}</td>
                  <td>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill ${t.progress === 100 ? 'done' : ''}" style="width: ${t.progress || 0}%;"></div>
                    </div>
                    <span style="font-family: ui-monospace, monospace; font-weight: 700; font-size: 7pt;">${t.progress || 0}%</span>
                  </td>
                  <td style="font-family: ui-monospace, monospace; font-size: 7pt;">${deadlineFormatted}</td>
                  <td style="font-family: ui-monospace, monospace; font-size: 7pt;">${forecastFormatted}</td>
                  <td style="font-size: 7pt;">${varianceHtml}</td>
                  <td style="font-size: 6.8pt; color: #475569;">
                    ${t.category_name ? `<div style="font-weight: 600;">${escapeHtml(t.category_name)}</div>` : ''}
                    ${tagsText ? `<div style="color: #0284c7;">${escapeHtml(tagsText)}</div>` : ''}
                  </td>
                </tr>`;
              })
              .join('')
      }
    </tbody>
  </table>

  <div class="report-footer">
    <div>Generated by ${title} • Confidential Engineering Document</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;
}

/**
 * Opens HTML in a standalone printable blob window to bypass sandboxed iframe restrictions
 */
export function openPrintWindow(htmlContent: string): Window | null {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // Direct user gesture opening
    const win = window.open(blobUrl, '_blank');

    if (!win) {
      // Fallback via anchor click
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    return win;
  } catch (err) {
    console.error('Failed to open print window:', err);
    return null;
  }
}

/**
 * Triggers direct print: opens the printable document and executes the print flow
 */
export function triggerDirectPrint(htmlContent: string): boolean {
  try {
    const win = openPrintWindow(htmlContent);
    return !!win;
  } catch (err) {
    console.warn('Direct print window error:', err);
    return false;
  }
}

/**
 * Generates an A4 Portrait technical datasheet for an individual engineering task
 */
export function generateSingleTaskDatasheetHtml(
  task: any,
  project?: { code: string; name: string },
  pkg?: { code: string; name: string },
  comments: any[] = [],
  attachments: any[] = [],
  workspaceBranding?: { title?: string; subtitle?: string }
): string {
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const title = workspaceBranding?.title || 'ENGINEERING TASK DATASHEET';
  const subtitle = workspaceBranding?.subtitle || 'PTSC EPC Project Management';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Task #${task.id} - ${escapeHtml(task.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 9.5pt;
      line-height: 1.45;
      padding: 12px;
    }
    .no-print {
      display: flex;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header h1 { font-size: 14pt; font-weight: 800; text-transform: uppercase; color: #0f172a; }
    .header p { font-size: 8.5pt; color: #475569; }
    .meta { font-size: 8pt; font-family: monospace; text-align: right; color: #475569; }
    .meta strong { color: #0f172a; }
    
    .section-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #f8fafc;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .task-title { font-size: 13pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .task-desc { font-size: 9.5pt; color: #334155; white-space: pre-wrap; line-height: 1.5; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    
    .stat-label { font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .stat-value { font-size: 10pt; font-weight: 700; color: #0f172a; font-family: monospace; }
    
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 8pt; text-transform: uppercase; font-family: monospace; }
    .badge-critical { background: #ffe4e6; color: #9f1239; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #fef9c3; color: #854d0e; }
    .badge-low { background: #f1f5f9; color: #334155; }
    
    .badge-done { background: #dcfce7; color: #166534; }
    .badge-progress { background: #e0f2fe; color: #075985; }
    .badge-waiting { background: #fef3c7; color: #92400e; }
    
    .table-clean { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .table-clean th { background: #f1f5f9; text-align: left; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 700; }
    .table-clean td { padding: 4px 6px; border: 1px solid #e2e8f0; }
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.focus(); window.print(); } catch(e) {}
      }, 250);
    });
  </script>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="meta">
      <div>Task ID: <strong>#${task.id}</strong></div>
      <div>Printed: <strong>${printDate}</strong></div>
    </div>
  </div>

  <div class="section-box" style="background: #ffffff; border-color: #94a3b8;">
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-desc">${task.description ? escapeHtml(task.description) : '<em>No additional scope details provided.</em>'}</div>
  </div>

  <div class="grid-4" style="margin-bottom: 12px;">
    <div class="section-box" style="margin-bottom: 0;">
      <div class="stat-label">Priority</div>
      <div class="stat-value"><span class="badge badge-${task.priority?.toLowerCase()}">${task.priority}</span></div>
    </div>
    <div class="section-box" style="margin-bottom: 0;">
      <div class="stat-label">Status</div>
      <div class="stat-value"><span class="badge badge-${task.status === 'DONE' ? 'done' : task.status === 'IN PROGRESS' ? 'progress' : 'waiting'}">${task.status}</span></div>
    </div>
    <div class="section-box" style="margin-bottom: 0;">
      <div class="stat-label">Progress</div>
      <div class="stat-value">${task.progress || 0}%</div>
    </div>
    <div class="section-box" style="margin-bottom: 0;">
      <div class="stat-label">Deadline</div>
      <div class="stat-value">${task.deadline ? formatDateDdMmYyyy(task.deadline) : 'None'}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section-box">
      <div class="section-title">Project & Package Structure</div>
      <div style="font-size: 8.5pt;">
        <div><strong>Project:</strong> ${project ? `${escapeHtml(project.code)} - ${escapeHtml(project.name)}` : 'General / Unassigned'}</div>
        <div style="margin-top: 4px;"><strong>Package:</strong> ${pkg ? `${escapeHtml(pkg.code)} - ${escapeHtml(pkg.name)}` : 'None'}</div>
        <div style="margin-top: 4px;"><strong>Category:</strong> ${escapeHtml(task.category_name || 'Engineering Scope')}</div>
      </div>
    </div>

    <div class="section-box">
      <div class="section-title">Schedule & Schedule Variance</div>
      <div style="font-size: 8.5pt;">
        <div><strong>Forecast Finish:</strong> ${task.forecast_finish ? formatDateDdMmYyyy(task.forecast_finish) : 'Not specified'}</div>
        <div style="margin-top: 4px;"><strong>Start Date:</strong> ${task.start_date ? formatDateDdMmYyyy(task.start_date) : 'Not specified'}</div>
        <div style="margin-top: 4px;"><strong>Completed Date:</strong> ${task.completed_date ? formatDateDdMmYyyy(task.completed_date) : 'Pending'}</div>
      </div>
    </div>
  </div>

  ${
    attachments.length > 0
      ? `<div class="section-box">
          <div class="section-title">Attached Engineering Documents (${attachments.length})</div>
          <table class="table-clean">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>File Name</th>
                <th style="width: 80px;">Size</th>
                <th style="width: 120px;">Uploaded By</th>
              </tr>
            </thead>
            <tbody>
              ${attachments
                .map(
                  (att, i) => `<tr>
                    <td style="font-family: monospace;">${i + 1}</td>
                    <td><strong>${escapeHtml(att.original_name)}</strong></td>
                    <td style="font-family: monospace;">${Math.round((att.file_size || 0) / 1024)} KB</td>
                    <td>${escapeHtml(att.uploader_name || 'System')}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : ''
  }

  ${
    comments.length > 0
      ? `<div class="section-box">
          <div class="section-title">Engineering Activity Notes (${comments.length})</div>
          <div style="font-size: 8pt; space-y: 6px;">
            ${comments
              .map(
                (c) => `<div style="border-bottom: 1px dashed #cbd5e1; padding: 4px 0;">
                  <strong style="color: #1e293b;">${escapeHtml(c.user_name || 'Engineer')}</strong> <span style="color: #64748b; font-size: 7pt; font-family: monospace;">(${new Date(c.created_at).toLocaleString()})</span>:
                  <div style="margin-top: 2px; color: #334155;">${escapeHtml(c.content)}</div>
                </div>`
              )
              .join('')}
          </div>
        </div>`
      : ''
  }
</body>
</html>`;
}
