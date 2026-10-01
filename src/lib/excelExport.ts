import * as XLSX from 'xlsx';
import { Task } from '../types';
import { formatDateDisplay, formatDateDdMmYyyy, getScheduleVariance } from './dateUtils';

export interface ExportTasksOptions {
  projectName?: string;
  packageName?: string;
  filterSummary?: string;
}

/**
 * Export a list of engineering tasks to an Excel file with formatted columns.
 */
export function exportTasksToExcel(tasks: Task[], options?: ExportTasksOptions) {
  // Format rows for Excel
  const data = tasks.map((t, index) => {
    const variance = getScheduleVariance(t.deadline, t.forecast_finish);
    const varianceText = variance ? (variance.isLate ? `+${variance.days}d (Late)` : `${variance.days}d (On Track)`) : '';
    const tagsString = t.tags ? t.tags.map((tag) => `#${tag.name}`).join(', ') : '';

    return {
      'No.': index + 1,
      'Task ID': `#${t.id}`,
      'Type': t.type || 'TASK',
      'Priority': t.priority,
      'Status': t.status,
      'Progress (%)': t.progress,
      'Task Title / Deliverable': t.title,
      'Person In Charge (PIC)': Array.isArray(t.pics) && t.pics.length > 0 ? t.pics.join(', ') : 'Unassigned',
      'Project Code': t.project_code || '—',
      'Project Name': t.project_name || '—',
      'Package Code': t.package_code || '—',
      'Package Name': t.package_name || 'General',
      'Category': t.category_name || '—',
      'Deadline': t.deadline ? formatDateDdMmYyyy(t.deadline) : '—',
      'Forecast Finish': t.forecast_finish ? formatDateDdMmYyyy(t.forecast_finish) : '—',
      'Schedule Variance': varianceText || '—',
      'Completed Date': t.completed_date ? formatDateDdMmYyyy(t.completed_date) : '—',
      'Discipline / Tags': tagsString || '—',
      'Description / Scope': t.description || '',
      'Created At': t.created_at ? formatDateDisplay(t.created_at) : '—',
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for optimal reading in Excel
  worksheet['!cols'] = [
    { wch: 5 },   // No.
    { wch: 10 },  // Task ID
    { wch: 12 },  // Type
    { wch: 12 },  // Priority
    { wch: 15 },  // Status
    { wch: 14 },  // Progress (%)
    { wch: 45 },  // Task Title / Deliverable
    { wch: 22 },  // Person In Charge (PIC)
    { wch: 15 },  // Project Code
    { wch: 30 },  // Project Name
    { wch: 15 },  // Package Code
    { wch: 30 },  // Package Name
    { wch: 20 },  // Category
    { wch: 14 },  // Deadline
    { wch: 16 },  // Forecast Finish
    { wch: 18 },  // Schedule Variance
    { wch: 16 },  // Completed Date
    { wch: 25 },  // Discipline / Tags
    { wch: 50 },  // Description / Scope
    { wch: 16 },  // Created At
  ];

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks & Deliverables');

  // Generate filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const prefix = options?.projectName ? `Tasks_${options.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}` : 'Engineering_Tasks';
  const filename = `${prefix}_${dateStr}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(workbook, filename);
}
