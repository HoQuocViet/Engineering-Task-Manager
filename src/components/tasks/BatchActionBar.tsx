import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { CheckCircle2, AlertTriangle, Trash2, X, Clock, Layers, Loader2, Mail, Copy } from 'lucide-react';
import { TaskPriority, TaskStatus, Task } from '../../types';
import { ExpediteEmailModal } from './ExpediteEmailModal';

interface BatchActionBarProps {
  selectedTaskIds: string[];
  tasks?: Task[];
  onClearSelection: () => void;
  onUpdated: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedTaskIds,
  tasks = [],
  onClearSelection,
  onUpdated,
}) => {
  const { currentUser, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExpediteModal, setShowExpediteModal] = useState(false);

  if (selectedTaskIds.length === 0) return null;

  const selectedTasksList = tasks.filter((t) => selectedTaskIds.includes(t.id));

  const handleBulkAction = async (action: 'MARK_DONE' | 'SET_PRIORITY' | 'SET_STATUS', value?: string) => {
    setLoading(true);
    try {
      await api.bulkAction(selectedTaskIds, action, value, currentUser?.id);
      showToast(`Updated ${selectedTaskIds.length} tasks`);
      onClearSelection();
      onUpdated();
    } catch (err: any) {
      showToast(`Bulk action failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    setLoading(true);
    try {
      await api.bulkAction(selectedTaskIds, 'DELETE', undefined, currentUser?.id);
      showToast(`Deleted ${selectedTaskIds.length} tasks`);
      setShowDeleteConfirm(false);
      onClearSelection();
      onUpdated();
    } catch (err: any) {
      showToast(`Bulk delete failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-2.5 flex items-center space-x-3 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-150">
        <div className="font-semibold flex items-center space-x-1.5 pr-2 border-r border-slate-700">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-mono text-[10px]">
            {selectedTaskIds.length}
          </span>
          <span>Selected</span>
        </div>

        {/* Copy for Expedite Email Button */}
        <button
          onClick={() => setShowExpediteModal(true)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-3 py-1 rounded font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          title="Format and copy selected items to clipboard for expedite email (HTML table & Plain Text)"
        >
          <Mail className="w-3.5 h-3.5 text-sky-200" />
          <span>Copy for Expedite Email</span>
        </button>

        {/* Mark Done */}
        <button
          onClick={() => handleBulkAction('MARK_DONE')}
          disabled={loading}
          className="bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Mark Done</span>
        </button>

        {/* Set Priority dropdown */}
        <div className="flex items-center space-x-1">
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkAction('SET_PRIORITY', e.target.value);
            }}
            disabled={loading}
            defaultValue=""
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none text-xs cursor-pointer"
          >
            <option value="" disabled>
              Set Priority...
            </option>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">⚪ Low</option>
          </select>
        </div>

        {/* Set Status dropdown */}
        <div className="flex items-center space-x-1">
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkAction('SET_STATUS', e.target.value);
            }}
            disabled={loading}
            defaultValue=""
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none text-xs cursor-pointer"
          >
            <option value="" disabled>
              Set Status...
            </option>
            <option value="TODO">TODO</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="WAITING">WAITING</option>
            <option value="ON HOLD">ON HOLD</option>
          </select>
        </div>

        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading}
          className="bg-rose-900/80 hover:bg-rose-700 text-rose-200 px-2 py-1 rounded flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 ml-1 cursor-pointer"
          title="Deselect all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Batch Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!loading) setShowDeleteConfirm(false);
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
                  Delete {selectedTaskIds.length} Tasks
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTaskIds.length}</span> selected tasks? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmBulkDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-600 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Tasks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expedite Email Generator / Copy Modal */}
      <ExpediteEmailModal
        isOpen={showExpediteModal}
        onClose={() => setShowExpediteModal(false)}
        selectedTasks={selectedTasksList}
      />
    </>
  );
};
