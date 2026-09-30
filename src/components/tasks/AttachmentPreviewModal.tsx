import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { PdfPreviewer } from './PdfPreviewer';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Check,
  FileText,
  Table,
  Search,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';

interface AttachmentPreviewModalProps {
  attachment: {
    id: string;
    original_name: string;
    mime_type?: string;
    file_size: number;
    created_at: string;
  };
  onClose: () => void;
  onDownload: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  onClose,
  onDownload,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Text / Code preview
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Word docx preview
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Excel xlsx/xls preview
  const [sheets, setSheets] = useState<{ name: string; data: (string | number)[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');

  const [loadError, setLoadError] = useState<string | null>(null);

  const previewUrl = `/api/attachments/${attachment.id}/view`;
  const ext = attachment.original_name.split('.').pop()?.toLowerCase() || '';

  const isImg =
    attachment.mime_type?.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext);

  const isPdf = attachment.mime_type === 'application/pdf' || ext === 'pdf';

  const isExcel =
    ['xlsx', 'xls', 'csv'].includes(ext) ||
    attachment.mime_type?.includes('spreadsheet') ||
    attachment.mime_type?.includes('excel');

  const isDocx =
    ext === 'docx' ||
    attachment.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const isText =
    !isExcel &&
    (attachment.mime_type?.startsWith('text/') ||
      ['txt', 'log', 'json', 'md', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'sql', 'xml', 'yaml', 'yml', 'env'].includes(
        ext
      ));

  useEffect(() => {
    let isMounted = true;
    setLoadError(null);

    // Load Excel Spreadsheet
    if (isExcel) {
      setLoadingContent(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (!isMounted) return;
          try {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const parsedSheets: { name: string; data: (string | number)[][] }[] = [];

            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
                header: 1,
                defval: '',
              });
              parsedSheets.push({
                name: sheetName,
                data: json,
              });
            });

            setSheets(parsedSheets);
          } catch (e: any) {
            console.error('Error parsing excel document:', e);
            setLoadError('Unable to parse Excel file. You can download the file to view its full contents.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLoadError(`Error loading file: ${err.message}`);
        })
        .finally(() => {
          if (isMounted) setLoadingContent(false);
        });
    }
    // Load Word Docx
    else if (isDocx) {
      setLoadingContent(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.arrayBuffer();
        })
        .then(async (buffer) => {
          if (!isMounted) return;
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            setDocxHtml(result.value);
          } catch (e: any) {
            console.error('Error converting docx:', e);
            setLoadError('Unable to convert Word document (.docx). Please download the file to view.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLoadError(`Error loading Word document: ${err.message}`);
        })
        .finally(() => {
          if (isMounted) setLoadingContent(false);
        });
    }
    // Load Text / Code
    else if (isText) {
      setLoadingContent(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.text();
        })
        .then((txt) => {
          if (!isMounted) return;
          setTextContent(txt);
        })
        .catch((err) => {
          if (!isMounted) return;
          setLoadError(`Error reading text file: ${err.message}`);
        })
        .finally(() => {
          if (isMounted) setLoadingContent(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [attachment.id, isExcel, isDocx, isText, previewUrl]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (isImg) {
        if (e.key === '+' || e.key === '=') setScale((s) => Math.min(5, s + 0.25));
        if (e.key === '-') setScale((s) => Math.max(0.25, s - 0.25));
        if (e.key === '0') {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setRotation(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isImg]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImg) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isImg) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const currentSheet = sheets[activeSheetIndex];
  const filteredSheetRows = currentSheet
    ? currentSheet.data.filter((row) => {
        if (!sheetSearch.trim()) return true;
        return row.some((cell) =>
          String(cell || '').toLowerCase().includes(sheetSearch.toLowerCase())
        );
      })
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col select-none"
      onMouseUp={handleMouseUp}
    >
      {/* Header Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-slate-200">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            {isImg ? (
              <ImageIcon className="w-4 h-4" />
            ) : isExcel ? (
              <Table className="w-4 h-4 text-emerald-400" />
            ) : isDocx || isPdf ? (
              <FileText className="w-4 h-4 text-blue-400" />
            ) : (
              <FileCode className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md">
              {attachment.original_name}
            </h3>
            <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
              <span>{(attachment.file_size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span className="uppercase">{ext || 'FILE'}</span>
              <span>•</span>
              <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {isImg && (
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-1 space-x-1 mr-2">
              <button
                onClick={() => setScale((s) => Math.min(5, s + 0.25))}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className="px-2 py-1 hover:bg-slate-700 rounded text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset View (0)"
              >
                {Math.round(scale * 100)}%
              </button>
            </div>
          )}

          {isExcel && sheets.length > 0 && (
            <div className="relative mr-2 hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Search spreadsheet data..."
                className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44"
              />
            </div>
          )}

          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={onDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Download file to device"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 hover:text-rose-400 rounded-lg text-slate-400 transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
        {loadingContent && (
          <div className="flex flex-col items-center space-y-3 text-slate-300">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono">Decoding and rendering document preview...</p>
          </div>
        )}

        {loadError && (
          <div className="bg-slate-900 border border-rose-800/80 rounded-xl p-6 max-w-md text-center space-y-3 shadow-xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">Preview Not Available</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{loadError}</p>
            <button
              onClick={onDownload}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File Directly</span>
            </button>
          </div>
        )}

        {/* 1. Image Preview */}
        {!loadingContent && !loadError && isImg && (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <img
              src={previewUrl}
              alt={attachment.original_name}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-full object-contain pointer-events-none rounded shadow-2xl"
            />
          </div>
        )}

        {/* 2. PDF Preview (Client-side Canvas Render via PDF.js - bypasses Chrome iframe sandbox blocking) */}
        {!loadingContent && !loadError && isPdf && (
          <PdfPreviewer
            url={previewUrl}
            fileName={attachment.original_name}
            fileSize={attachment.file_size}
            onDownload={onDownload}
          />
        )}

        {/* 3. Excel Spreadsheet Preview */}
        {!loadingContent && !loadError && isExcel && (
          <div className="w-full h-full max-w-6xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl select-text">
            {/* Sheet Tabs */}
            {sheets.length > 1 && (
              <div className="bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex items-center space-x-1.5 overflow-x-auto shrink-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 mr-1 shrink-0">Sheets:</span>
                {sheets.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSheetIndex(idx)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                      activeSheetIndex === idx
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {s.name} ({s.data.length} rows)
                  </button>
                ))}
              </div>
            )}

            {/* Sheet Table Grid */}
            <div className="flex-1 min-h-0 overflow-auto bg-slate-950 p-2">
              {filteredSheetRows.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No matching data rows found.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-max">
                  <thead>
                    <tr className="bg-slate-800 text-slate-300 sticky top-0 z-10 border-b border-slate-700">
                      <th className="w-10 py-1.5 px-2 text-center text-slate-500 bg-slate-800 border-r border-slate-700 select-none">
                        #
                      </th>
                      {(filteredSheetRows[0] || []).map((_, colIdx) => (
                        <th
                          key={colIdx}
                          className="py-1.5 px-3 font-semibold border-r border-slate-700 text-slate-300 uppercase"
                        >
                          {String.fromCharCode(65 + (colIdx % 26))}
                          {colIdx >= 26 ? Math.floor(colIdx / 26) : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredSheetRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`${
                          rIdx === 0
                            ? 'bg-slate-900/90 font-bold text-blue-300'
                            : rIdx % 2 === 0
                            ? 'bg-slate-950 hover:bg-slate-900/60'
                            : 'bg-slate-900/30 hover:bg-slate-900/60'
                        } transition-colors`}
                      >
                        <td className="py-1.5 px-2 text-center text-[10px] text-slate-600 bg-slate-900/50 border-r border-slate-800 select-none font-mono">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-1.5 px-3 text-slate-200 border-r border-slate-800/60 whitespace-nowrap max-w-xs truncate hover:max-w-none hover:whitespace-normal"
                          >
                            {cell !== undefined && cell !== null ? String(cell) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sheet Footer Info */}
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <span>
                Sheet: {currentSheet?.name || 'Sheet1'} • {filteredSheetRows.length} data rows
              </span>
              <span>Format: Excel Spreadsheet</span>
            </div>
          </div>
        )}

        {/* 4. Word Document (.docx) Preview */}
        {!loadingContent && !loadError && isDocx && (
          <div className="w-full h-full max-w-4xl bg-white text-slate-900 border border-slate-300 rounded-xl overflow-y-auto p-8 sm:p-12 shadow-2xl select-text">
            {docxHtml ? (
              <div
                className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-2 prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Word document is empty or has no readable text content.
              </div>
            )}
          </div>
        )}

        {/* 5. Text / Code Preview */}
        {!loadingContent && !loadError && isText && (
          <div className="w-full h-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl select-text font-mono">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="font-mono">{attachment.original_name}</span>
              <button
                onClick={() => textContent && handleCopyText(textContent)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-slate-950 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
              {textContent}
            </div>
          </div>
        )}

        {/* 6. Other Binary Formats Fallback */}
        {!loadingContent && !loadError && !isImg && !isPdf && !isExcel && !isDocx && !isText && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{attachment.original_name}</h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.mime_type || 'Binary File'}
              </p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This file format cannot be directly previewed in the browser. Please download the file to open it with a compatible desktop application.
            </p>
            <div className="pt-2 flex justify-center space-x-3">
              <button
                onClick={onDownload}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
