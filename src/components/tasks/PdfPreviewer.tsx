import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  ExternalLink,
  AlertCircle,
  FileText,
  Layers,
  LayoutList,
  Square,
  RefreshCw,
} from 'lucide-react';

// Configure worker safely for Vite/ESM
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('PDF.js worker setup warning:', e);
  }
}

interface PdfPreviewerProps {
  url: string;
  fileName: string;
  fileSize: number;
  onDownload: () => void;
}

export const PdfPreviewer: React.FC<PdfPreviewerProps> = ({
  url,
  fileName,
  fileSize,
  onDownload,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('continuous');
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document via ArrayBuffer for maximum reliability
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    let activeLoadingTask: any = null;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch PDF file`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!isMounted) return;
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/cmaps/`,
          cMapPacked: true,
        });
        activeLoadingTask = loadingTask;
        return loadingTask.promise;
      })
      .then((doc) => {
        if (!isMounted || !doc) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading PDF document:', err);
        setError(`Unable to render PDF document: ${err.message || 'Unknown parsing error'}`);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (activeLoadingTask) {
        try {
          activeLoadingTask.destroy();
        } catch {}
      }
    };
  }, [url]);

  // Render Single Page Mode
  const renderSinglePage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !singleCanvasRef.current || viewMode !== 'single') return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        setRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        const canvas = singleCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render page error:', err);
        }
      } finally {
        setRendering(false);
      }
    },
    [pdfDoc, scale, rotation, viewMode]
  );

  useEffect(() => {
    if (viewMode === 'single' && pdfDoc) {
      renderSinglePage(currentPage);
    }
  }, [currentPage, viewMode, pdfDoc, renderSinglePage]);

  // Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(3.5, Number((s + 0.2).toFixed(1))));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.5, Number((s - 0.2).toFixed(1))));
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      // Default standard page width is ~595px (A4)
      const targetScale = Math.max(0.6, Math.min(2.5, containerWidth / 620));
      setScale(Number(targetScale.toFixed(2)));
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 text-slate-300">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono">Parsing PDF engineering document ({numPages || '...'} pages)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-800/80 rounded-xl p-6 max-w-md text-center space-y-3 shadow-xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h4 className="text-sm font-bold text-white">PDF Preview Error</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={onDownload}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-6xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
      {/* Top PDF Controls Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 select-none shrink-0">
        {/* Page navigation (for single view) & View Mode switcher */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Continuous Vertical Scroll (All Pages)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">All Pages</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Single Page View with Navigation"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Single</span>
            </button>
          </div>

          {/* Page Selector */}
          {viewMode === 'single' && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-1 py-0.5 space-x-1 font-mono">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] px-1 font-bold text-white min-w-[60px] text-center">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewMode === 'continuous' && (
            <div className="text-[11px] font-mono text-slate-400 px-1">
              Total: <span className="text-white font-bold">{numPages}</span> {numPages === 1 ? 'Page' : 'Pages'}
            </div>
          )}
        </div>

        {/* Zoom and Transform Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="px-2 py-0.5 bg-slate-900 rounded text-[11px] font-mono text-slate-300 min-w-[45px] text-center border border-slate-800">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitWidth}
            className="px-2 py-1 hover:bg-slate-800 rounded text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-800"
            title="Fit Width"
          >
            Fit Width
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-slate-950 p-4 sm:p-6 flex flex-col items-center select-none scrollbar-crystal-dark"
      >
        {viewMode === 'single' ? (
          <div className="my-auto flex flex-col items-center">
            <div className="bg-white rounded-lg shadow-2xl p-0.5 border border-slate-700/80 overflow-hidden">
              <canvas ref={singleCanvasRef} className="block max-w-full" />
            </div>
            {rendering && (
              <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center space-x-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span>Rendering page {currentPage}...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 flex flex-col items-center w-full">
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
              <ContinuousPdfPage
                key={pageNum}
                pdfDoc={pdfDoc}
                pageNum={pageNum}
                scale={scale}
                rotation={rotation}
                numPages={numPages}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-red-400" />
          <span className="truncate max-w-xs">{fileName}</span>
        </div>
        <div>
          <span>Client-Side PDF Engine • {numPages} {numPages === 1 ? 'Page' : 'Pages'}</span>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual pages in continuous scroll mode
interface ContinuousPdfPageProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  rotation: number;
  numPages: number;
}

const ContinuousPdfPage: React.FC<ContinuousPdfPageProps> = ({
  pdfDoc,
  pageNum,
  scale,
  rotation,
  numPages,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function render() {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
        if (isMounted) setRendered(true);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    }

    render();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, scale, rotation]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-lg shadow-2xl p-0.5 border border-slate-700/80 overflow-hidden relative">
        <canvas ref={canvasRef} className="block" />
        {!rendered && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-slate-300 text-xs font-mono">
            <span>Loading Page {pageNum}...</span>
          </div>
        )}
      </div>
      <div className="text-[10px] font-mono text-slate-400 mt-1.5">
        Page {pageNum} of {numPages}
      </div>
    </div>
  );
};
