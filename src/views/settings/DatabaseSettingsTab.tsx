import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  HardDrive,
  Download,
  Upload,
  FileText,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

export const DatabaseSettingsTab: React.FC = () => {
  const { projects, categories, totalTasksCount, refreshData, showToast } = useApp();

  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // File import state
  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDbFile, setSelectedDbFile] = useState<File | null>(null);
  const [dbFilePreview, setDbFilePreview] = useState<{
    type: 'sqlite' | 'json' | 'unknown';
    name: string;
    sizeFormatted: string;
    rawJson?: any;
    recordCounts?: {
      projects?: number;
      packages?: number;
      tasks?: number;
      categories?: number;
      users?: number;
    };
  } | null>(null);
  const [importingDb, setImportingDb] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    showToast('Copied command to clipboard!');
    setTimeout(() => setCopiedCommand(null), 2500);
  };

  const handleExportDb = async () => {
    setIsExportingDb(true);
    try {
      const res = await fetch('/api/system/download-db');
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `engineering_task_manager_${today}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported SQLite database (.db) successfully!');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    } finally {
      setIsExportingDb(false);
    }
  };

  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const res = await fetch('/api/system/export-json');
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `engineering-tasks-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported JSON backup archive (.json) successfully!');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    } finally {
      setIsExportingJson(false);
    }
  };

  const processSelectedDbFile = (file: File) => {
    setImportError(null);
    setSelectedDbFile(file);

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    // Read initial 16 bytes to check if it's an SQLite binary database
    const headerReader = new FileReader();
    headerReader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const headerBytes = new Uint8Array(buffer || new ArrayBuffer(0));
      const headerStr = String.fromCharCode(...Array.from(headerBytes));

      if (headerStr.startsWith('SQLite format 3')) {
        setDbFilePreview({
          type: 'sqlite',
          name: file.name,
          sizeFormatted,
        });
        return;
      }

      // If not SQLite binary, read as text to parse JSON
      const textReader = new FileReader();
      textReader.onload = (textEvt) => {
        try {
          let content = (textEvt.target?.result as string) || '';
          // Strip BOM if present
          if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
          }
          content = content.trim();

          if (content.startsWith('<')) {
            throw new Error('The file contains HTML web page content instead of JSON data. Please use the "Export JSON Archive" button to download a fresh backup file.');
          }

          const parsed = JSON.parse(content);
          // Handle unwrapped object or direct array of tasks
          const raw = Array.isArray(parsed) ? { tasks: parsed } : (parsed.data || parsed);

          setDbFilePreview({
            type: 'json',
            name: file.name,
            sizeFormatted,
            rawJson: raw,
            recordCounts: {
              projects: Array.isArray(raw.projects) ? raw.projects.length : 0,
              packages: Array.isArray(raw.packages) ? raw.packages.length : 0,
              tasks: Array.isArray(raw.tasks) ? raw.tasks.length : 0,
              categories: Array.isArray(raw.categories) ? raw.categories.length : 0,
              users: Array.isArray(raw.users) ? raw.users.length : 0,
            },
          });
        } catch (err: any) {
          console.error('JSON parse error:', err);
          const msg = err.message?.includes('HTML')
            ? err.message
            : `Failed to parse JSON backup file: ${err.message || 'Invalid JSON structure.'}`;
          setImportError(msg);
          setDbFilePreview({
            type: 'unknown',
            name: file.name,
            sizeFormatted,
          });
        }
      };
      textReader.readAsText(file);
    };

    headerReader.readAsArrayBuffer(file.slice(0, 16));
  };

  const handleDbFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedDbFile(file);
  };

  const handleExecuteImport = async () => {
    if (!selectedDbFile || !dbFilePreview) return;
    setImportingDb(true);
    setImportError(null);

    try {
      if (dbFilePreview.type === 'json') {
        if (!dbFilePreview.rawJson) {
          throw new Error('No valid JSON backup payload loaded.');
        }
        await api.importBackupJson(dbFilePreview.rawJson);
        showToast('✅ JSON Database backup restored successfully!');
        await refreshData();
      } else if (dbFilePreview.type === 'sqlite') {
        await api.uploadDatabaseFile(selectedDbFile);
        showToast(`✅ SQLite database (${dbFilePreview.name}) restored and loaded successfully!`);
        await refreshData();
      } else {
        throw new Error('Unsupported file format. Please upload a .db SQLite file or .json backup.');
      }

      setSelectedDbFile(null);
      setDbFilePreview(null);
      if (dbFileInputRef.current) {
        dbFileInputRef.current.value = '';
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to restore database.';
      setImportError(msg);
      showToast(`❌ Database restore error: ${msg}`);
    } finally {
      setImportingDb(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm('Reload standard EPC demo dataset (Projects, Packages, Deliverables & Activity logs)?')) {
      return;
    }

    setResetting(true);
    try {
      await api.resetDemoData();
      showToast('Standard EPC dataset reloaded successfully');
      await refreshData();
    } catch (err: any) {
      showToast(`Error reloading data: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleClearTasks = async () => {
    if (!confirm('WARNING: This will delete all existing Tasks while retaining Project & Package structures. Continue?')) {
      return;
    }

    setClearing(true);
    try {
      await api.clearAllData('tasks');
      showToast('All tasks cleared successfully');
      await refreshData();
    } catch (err: any) {
      showToast(`Error clearing tasks: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: SQLite Status & Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 flex flex-col justify-between min-h-[560px] transition-colors">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">SQLite Storage Status</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Persistent local storage on Cloud Run container</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-1 font-mono">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">Total Projects:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{projects.length}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">Total Deliverables / Tasks:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{totalTasksCount}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">Work Categories:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{categories.length}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Data Integrity & Export</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800/80 dark:text-blue-300/80">
                All tasks, attachments, EPC packages, and audit logs are safely persisted inside the local SQLite database file.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={handleExportDb}
              disabled={isExportingDb}
              className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isExportingDb ? 'Exporting SQLite...' : 'Export SQLite Database (.db)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={isExportingJson}
              className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isExportingJson ? 'Exporting JSON...' : 'Export JSON Archive (.json)'}</span>
            </button>

            <button
              type="button"
              onClick={() => dbFileInputRef.current?.click()}
              className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import Database (.db / .json)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Maintenance, Schema Overview & Reset */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 min-h-[560px] flex flex-col justify-between transition-colors">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
              <RotateCcw className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Database Maintenance & Datasets</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage sample datasets, reload demo scenarios, or perform clean resets</p>
              </div>
            </div>

            {/* Table Schema Breakdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Persistent SQLite Schema Breakdown</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">projects</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{projects.length} rows</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">tasks</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{totalTasksCount} rows</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">categories</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{categories.length} rows</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">task_attachments</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Files</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">task_activities</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Audit Logs</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-[11px] font-sans text-slate-500 dark:text-slate-400">system_settings</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Configured</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Dataset Reset Options</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Reloading standard EPC demo data injects pre-configured offshore engineering projects (Offshore Wellhead Platform, Central Processing Facility, Subsea Pipeline EPC), milestone deliverables, and test attachments.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="py-2.5 px-4 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Reloading data...' : 'Reload Standard EPC Demo Data'}</span>
            </button>

            <button
              onClick={handleClearTasks}
              disabled={clearing}
              className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>{clearing ? 'Clearing tasks...' : 'Clear All Tasks (Reset)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Database Restore & Import Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Restore & Import Database</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import a previous SQLite database file (<code className="font-mono text-emerald-700 dark:text-emerald-400">.db</code>, <code className="font-mono text-emerald-700 dark:text-emerald-400">.sqlite</code>) or a JSON workspace backup.
              </p>
            </div>
          </div>
        </div>

        {/* Drag and Drop / File Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <input
              type="file"
              ref={dbFileInputRef}
              onChange={handleDbFileSelection}
              accept=".db,.sqlite,.sqlite3,.json"
              className="hidden"
            />

            <div
              onClick={() => dbFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 group-hover:bg-emerald-100 border border-slate-200 dark:border-slate-700 group-hover:border-emerald-300 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-300">
                  Click to browse or drop SQLite/JSON file here
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Supports <span className="font-mono font-semibold">.db</span>, <span className="font-mono font-semibold">.sqlite</span>, or <span className="font-mono font-semibold">.json</span> backups (max 50MB)
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">{importError}</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Warning:</strong> Restoring an external database or JSON backup will replace all active workspace records. Ensure you download a backup of your current database first if needed.
              </p>
            </div>
          </div>

          {/* Selected File & Import Action Box */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-800/30 space-y-4 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Selected Backup File</span>
                {selectedDbFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDbFile(null);
                      setDbFilePreview(null);
                      setImportError(null);
                      if (dbFileInputRef.current) dbFileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-rose-600 text-[11px] cursor-pointer"
                  >
                    Remove file
                  </button>
                )}
              </div>

              {selectedDbFile && dbFilePreview ? (
                <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{dbFilePreview.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {dbFilePreview.sizeFormatted} • {dbFilePreview.type === 'json' ? 'JSON Archive' : 'SQLite Binary Database'}
                      </p>
                    </div>
                  </div>

                  {dbFilePreview.type === 'json' && dbFilePreview.recordCounts && (
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 text-slate-600 dark:text-slate-400 font-mono">
                      <div className="font-bold font-sans text-slate-800 dark:text-slate-200">JSON Archive Breakdown:</div>
                      <div>Projects: {dbFilePreview.recordCounts.projects ?? 0}</div>
                      <div>Deliverables/Tasks: {dbFilePreview.recordCounts.tasks ?? 0}</div>
                      <div>Work Categories: {dbFilePreview.recordCounts.categories ?? 0}</div>
                    </div>
                  )}
                  {dbFilePreview.type === 'sqlite' && (
                    <div className="p-2.5 rounded bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed font-sans">
                      Ready to mount and replace SQLite binary database. All tables, schemas, and records will be replaced.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                  No database file selected yet. Select a file on the left to review and restore.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                disabled={!selectedDbFile || importingDb || !dbFilePreview || dbFilePreview.type === 'unknown'}
                onClick={handleExecuteImport}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className={`w-4 h-4 ${importingDb ? 'animate-spin' : ''}`} />
                <span>{importingDb ? 'Restoring Database...' : 'Restore & Import Selected File'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Section 3: On-Premise & Local Docker Permanent Storage Guide */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Local Docker Mode (Option C - 100% Permanent Storage)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Run this application on your local machine or internal company server with Docker Volume mounting (<code className="font-mono text-blue-600 dark:text-blue-400">./data:/app/data</code>) so your SQLite database and attachments are permanently stored on your physical hard drive.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Quick Start with Docker Compose */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <span>1. One-Click Docker Compose</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">Recommended</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard('docker compose up -d --build', 'compose')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center space-x-1 font-medium cursor-pointer"
              >
                {copiedCommand === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCommand === 'compose' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Mounts the <code className="font-mono text-slate-700 dark:text-slate-300">./data</code> directory to your hard drive. Data survives computer reboots, Docker restarts, and container updates.
            </p>
            <div className="bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-lg overflow-x-auto select-all">
              docker compose up -d --build
            </div>
          </div>

          {/* Quick Start with Script */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. Quick Launcher Scripts
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard('chmod +x run-local.sh && ./run-local.sh', 'script')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center space-x-1 font-medium cursor-pointer"
              >
                {copiedCommand === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCommand === 'script' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pre-configured scripts available directly in the project root:
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg select-all flex justify-between items-center">
                <span>Windows: double-click <span className="text-amber-400">run-local.bat</span></span>
              </div>
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg select-all flex justify-between items-center">
                <span>macOS/Linux: <span className="text-emerald-400">./run-local.sh</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions on migrating current database */}
        <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 text-xs space-y-2">
          <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>How to transfer your current data to your local machine:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
            <li>Click <strong>Export SQLite Database (.db)</strong> at the top to save your current database file (<code className="font-mono">app.db</code>).</li>
            <li>Place that downloaded file into the <code className="font-mono font-semibold">data/app.db</code> directory of the project on your machine.</li>
            <li>Run <code className="font-mono font-semibold">docker compose up -d</code> — all your projects, deliverables, and settings will load locally with zero data loss.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
