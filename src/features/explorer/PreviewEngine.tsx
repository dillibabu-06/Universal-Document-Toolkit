import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { FileRecord } from '../../types';
import { FileText, FileCode, AlertTriangle } from 'lucide-react';

interface PreviewEngineProps {
  file: FileRecord | null;
}

export default function PreviewEngine({ file }: PreviewEngineProps) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && (file.extension === 'pdf' || ['png', 'jpg', 'jpeg'].includes(file.extension || ''))) {
      const url = convertFileSrc(file.path);
      setAssetUrl(url);
    } else {
      setAssetUrl(null);
    }
  }, [file]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-50">
        <FileText size={48} className="mb-4 opacity-30" />
        <p className="text-xs font-semibold">Select a document to preview</p>
      </div>
    );
  }

  const isPdf = file.extension === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes(file.extension || '');

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-lg overflow-hidden border border-border-dark shadow-inner">
      <div className="px-3 py-2 bg-zinc-800 border-b border-border-dark flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-400 truncate pr-4">{file.filename}</span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-500 bg-black/20 px-1.5 py-0.5 rounded">{file.extension}</span>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-black/20 flex items-center justify-center">
        {(isPdf || isImage) && assetUrl ? (
          <iframe 
            src={assetUrl} 
            className="w-full h-full border-none"
            title="Document Preview"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
            {file.extension === 'docx' || file.extension === 'xlsx' ? (
              <FileCode size={48} className="mb-4 opacity-30" />
            ) : (
              <AlertTriangle size={48} className="mb-4 opacity-30 text-amber-500/50" />
            )}
            <p className="text-sm font-semibold mb-2 text-zinc-300">Rich Preview Not Available</p>
            <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
              We cannot natively render .{file.extension} files inside the application yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
