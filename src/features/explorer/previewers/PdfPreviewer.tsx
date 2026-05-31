import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewerProps {
  filePath: string;
}

export default function PdfPreviewer({ filePath }: PdfPreviewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [assetUrl, setAssetUrl] = useState<string>('');

  useEffect(() => {
    setAssetUrl(convertFileSrc(filePath));
    setPageNumber(1);
  }, [filePath]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (!assetUrl) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-border-dark shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
          >
            <ZoomIn size={14} />
          </button>
        </div>
        
        {numPages && (
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>{pageNumber} / {numPages}</span>
            <button 
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={assetUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-xs">Loading PDF...</p>
            </div>
          }
          className="drop-shadow-2xl"
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
