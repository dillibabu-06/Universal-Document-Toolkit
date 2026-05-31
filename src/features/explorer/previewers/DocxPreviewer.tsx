import { useState, useEffect } from 'react';
import { readBinaryFile } from '@tauri-apps/api/fs';
import * as mammoth from 'mammoth';
import { Loader2, FileSignature } from 'lucide-react';

interface DocxPreviewerProps {
  filePath: string;
}

export default function DocxPreviewer({ filePath }: DocxPreviewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDocx = async () => {
      try {
        const buffer = await readBinaryFile(filePath);
        // mammoth expects an array buffer
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer.buffer as ArrayBuffer });
        
        if (isMounted) {
          setHtmlContent(result.value);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render Word Document');
          setLoading(false);
        }
      }
    };

    loadDocx();
    return () => { isMounted = false; };
  }, [filePath]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-border-dark shrink-0">
        <div className="flex items-center gap-2 text-zinc-400">
          <FileSignature size={14} />
          <span className="text-xs font-semibold uppercase tracking-widest">Word Document</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex justify-center bg-zinc-900/50">
        {loading && (
          <div className="flex flex-col items-center justify-center text-zinc-500 h-full">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-xs">Parsing Document...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center text-red-400 h-full">
            <p className="text-sm font-bold mb-2">Error Loading Document</p>
            <p className="text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div 
            className="bg-white text-black p-12 shadow-2xl max-w-4xl w-full min-h-full rounded docx-preview-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </div>
    </div>
  );
}
