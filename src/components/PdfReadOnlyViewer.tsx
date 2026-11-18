import React, { useEffect, useRef, useState } from 'react';
import { Lock, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Language } from '../types/dcc';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReadOnlyViewerProps {
  dataUrl: string;
  title: string;
  lang: Language;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  if (!dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const meta = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  if (meta.includes(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

export const PdfReadOnlyViewer: React.FC<PdfReadOnlyViewerProps> = ({
  dataUrl,
  title,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.15);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    async function renderPdf() {
      const container = containerRef.current;
      if (!container) return;

      setLoading(true);
      setErrorMsg(null);
      container.innerHTML = '';

      try {
        const bytes = dataUrlToUint8Array(dataUrl);
        loadingTask = bytes
          ? pdfjsLib.getDocument({ data: bytes })
          : pdfjsLib.getDocument({ url: dataUrl });

        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.cleanup();
          return;
        }

        setPageCount(pdf.numPages);
        const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          if (cancelled) break;

          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * deviceScale);
          canvas.height = Math.floor(viewport.height * deviceScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className =
            'mx-auto rounded border border-slate-200 dark:border-slate-700 bg-white shadow-xs max-w-full h-auto';

          context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
          await page.render({ canvas, canvasContext: context, viewport }).promise;

          if (!cancelled && containerRef.current) {
            containerRef.current.appendChild(canvas);
          }
        }

        await pdf.cleanup();
      } catch {
        if (!cancelled) {
          setErrorMsg(
            lang === 'th'
              ? 'ไม่สามารถแสดงตัวอย่างไฟล์ PDF ได้'
              : 'Unable to render PDF preview.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [dataUrl, scale, lang]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 overflow-hidden select-none print-blocked"
      aria-label={title}
    >
      {/* Read-only Toolbar (No Print / No Download) */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium truncate">
          <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">
            {lang === 'th'
              ? `โหมดอ่านอย่างเดียว (ไม่อนุญาตให้พิมพ์/ดาวน์โหลด)${pageCount > 0 ? ` · ${pageCount} หน้า` : ''}`
              : `Read-Only View (Print/Download Disabled)${pageCount > 0 ? ` · ${pageCount} pages` : ''}`}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, +(s - 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title={lang === 'th' ? 'ย่อ' : 'Zoom Out'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, +(s + 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title={lang === 'th' ? 'ขยาย' : 'Zoom In'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Canvas Pages */}
      <div className="max-h-96 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            {lang === 'th' ? 'กำลังโหลดเอกสาร PDF...' : 'Loading PDF preview...'}
          </div>
        )}
        {errorMsg && (
          <div className="py-10 text-center text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}
        <div ref={containerRef} className="space-y-3" />
      </div>
    </div>
  );
};
