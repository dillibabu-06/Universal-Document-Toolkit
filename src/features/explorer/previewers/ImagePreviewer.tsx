import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { readBinaryFile } from '@tauri-apps/api/fs';
import * as ExifReader from 'exifreader';
import { Image as ImageIcon, ZoomIn, ZoomOut, Maximize, Loader2, Info } from 'lucide-react';

interface ImagePreviewerProps {
  filePath: string;
}

export default function ImagePreviewer({ filePath }: ImagePreviewerProps) {
  const [assetUrl, setAssetUrl] = useState<string>('');
  const [scale, setScale] = useState(1.0);
  const [exif, setExif] = useState<Record<string, any> | null>(null);
  const [showExif, setShowExif] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setAssetUrl(convertFileSrc(filePath));
    setScale(1.0);

    const loadExif = async () => {
      try {
        const buffer = await readBinaryFile(filePath);
        const tags = ExifReader.load(buffer);
        if (isMounted) setExif(tags);
      } catch (err) {
        console.error("Failed to load EXIF:", err);
        if (isMounted) setExif(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadExif();
    return () => { isMounted = false; };
  }, [filePath]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300 relative overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-border-dark shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(5.0, s + 0.2))} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => setScale(1.0)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 ml-2" title="Reset Zoom">
            <Maximize size={14} />
          </button>
        </div>

        <button 
          onClick={() => setShowExif(!showExif)}
          className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-semibold transition-colors ${showExif ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
        >
          <Info size={14} /> EXIF
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center relative p-4 bg-zinc-950/50 checkered-bg">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        )}
        <img 
          src={assetUrl} 
          style={{ transform: `scale(${scale})`, transition: 'transform 0.1s ease-out' }} 
          className="max-w-none origin-center drop-shadow-2xl"
          draggable={false}
        />
      </div>

      {/* EXIF Overlay */}
      {showExif && (
        <div className="absolute right-0 top-10 bottom-0 w-64 bg-zinc-900/95 backdrop-blur-xl border-l border-border-dark shadow-2xl p-4 overflow-y-auto z-20 animate-in slide-in-from-right-10">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <ImageIcon size={12} /> Metadata
          </h3>
          {exif && Object.keys(exif).length > 0 ? (
            <div className="space-y-3">
              {['Make', 'Model', 'DateTimeOriginal', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength', 'ImageWidth', 'ImageHeight'].map(key => {
                if (!exif[key]) return null;
                return (
                  <div key={key} className="border-b border-border-dark/50 pb-2">
                    <div className="text-[9px] text-zinc-500 uppercase">{key}</div>
                    <div className="text-xs font-mono text-zinc-300 truncate mt-0.5">{exif[key].description}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 italic">No EXIF data found.</div>
          )}
        </div>
      )}
    </div>
  );
}
