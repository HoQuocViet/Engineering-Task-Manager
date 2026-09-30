import React, { useRef, useState } from 'react';
import { Task, Project, Package } from '../../types';
import { generatePrintReportHtml, openPrintWindow, triggerDirectPrint, PrintFilterInfo } from '../../lib/printUtils';
import { Printer, X, Download, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  filterInfo: PrintFilterInfo;
  workspaceBranding?: { title?: string; subtitle?: string };
  projects: Project[];
  packages: Package[];
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
  filterInfo,
  workspaceBranding,
  projects,
  packages,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const htmlContent = generatePrintReportHtml(
    tasks,
    filterInfo,
    workspaceBranding,
    projects,
    packages
  );

  const handlePrint = () => {
    setIsPrinting(true);
    // 1. Try direct print window with Blob URL (most reliable across browsers and iframe environments)
    const win = openPrintWindow(htmlContent);
    
    // 2. Also attempt iframe print if available
    if (!win && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print error:', err);
      }
    }

    setTimeout(() => {
      setIsPrinting(false);
    }, 1500);
  };

  const handleOpenInNewWindow = () => {
    openPrintWindow(htmlContent);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Engineering_Task_Report_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#0b3b70] via-[#0e4482] to-[#1d4ed8] p-3.5 px-5 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-white/15 border border-white/20">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase">
                Print Report Preview
              </h2>
              <p className="text-[11px] text-blue-100/90">
                {tasks.length} tasks ready for printing or PDF export
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-white text-[#0b3b70] hover:bg-blue-50 active:bg-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-80"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b3b70]" />
                  <span>Opening Printer...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenInNewWindow}
              className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20 flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Open in new window (Bypasses iframe security restrictions)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20 flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Download standalone HTML report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save HTML</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Preview Paper */}
        <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-3 sm:p-5 overflow-auto flex justify-center items-start">
          <div className="w-full max-w-4xl bg-white shadow-lg border border-slate-300 rounded-lg overflow-hidden h-full flex flex-col">
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title="Print Preview"
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2.5 px-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Landscape formatted with PTSC / EPC table columns</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
