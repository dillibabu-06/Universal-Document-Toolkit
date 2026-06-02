import { useState, useRef } from 'react';
import { Image as ImageIcon, Download, Settings2, Activity, CheckCircle2, AlertCircle, FilePlus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function MediaStudioView() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState('png');
  const [quality, setQuality] = useState('85');
  const [resizePreset, setResizePreset] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setUploadStatus(null);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_format', targetFormat);
        formData.append('quality', quality);
        if (resizePreset !== 'original') {
          formData.append('resize', resizePreset);
        }

        const res = await fetch('http://localhost:8000/api/image/convert', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `converted_${file.name.split('.')[0]}.${targetFormat}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          const err = await res.json();
          throw new Error(err.detail || 'Conversion failed');
        }
      }
      setUploadStatus({ status: 'success', message: 'All images processed successfully!' });
      setFiles([]);
    } catch (err: any) {
      setUploadStatus({ status: 'error', message: err.message || 'Operation failed' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Media Conversion Center</h1>
          <p className="text-xs text-slate-400 mt-1">Convert image formats, adjust quality, and resize batches effortlessly.</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1">
        {/* Left Config Panel */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl flex flex-col min-h-[400px]">
            
            {/* Drag & Drop Zone */}
            <div 
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer mb-6 flex-1 bg-white/[0.01]
                ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/40'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) {
                  setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FilePlus size={36} className={`mb-3 transition-all duration-300 ${isDragging ? 'text-indigo-500 scale-110' : 'text-slate-500'}`} />
              <p className="text-xs font-semibold text-slate-300 mb-1 text-center">
                Drag & drop image files here
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }} 
              />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mb-6 max-h-[150px] overflow-y-auto">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1">Selected Files</span>
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <ImageIcon size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-300 truncate">{f.name}</span>
                    </div>
                    <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl flex-1 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Settings2 size={12} /> Output Settings
            </h3>
            
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Target Format</label>
              <select 
                className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none"
                value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpeg">JPEG (Photos)</option>
                <option value="webp">WEBP (Web optimized)</option>
                <option value="bmp">BMP</option>
                <option value="tiff">TIFF (Print/Archive)</option>
                <option value="gif">GIF</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block flex justify-between">
                <span>Quality (JPEG/WEBP)</span>
                <span>{quality}%</span>
              </label>
              <input 
                type="range" min="10" max="100" value={quality}
                onChange={e => setQuality(e.target.value)}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Resize Preset</label>
              <select 
                className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none"
                value={resizePreset} onChange={e => setResizePreset(e.target.value)}
              >
                <option value="original">Original Size</option>
                <option value="256x256">Thumbnail (256x256)</option>
                <option value="1024x1024">Preview (1024x1024)</option>
                <option value="1920x1080">HD (1920x1080)</option>
                <option value="3840x2160">4K (3840x2160)</option>
              </select>
            </div>

            <div className="mt-auto pt-6">
              <Button 
                onClick={handleProcess}
                disabled={files.length === 0 || isProcessing}
                className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 text-white"
                size="lg"
              >
                {isProcessing ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                {isProcessing ? 'Processing Batch...' : 'Process & Download'}
              </Button>

              {uploadStatus && (
                <div className={`mt-4 flex flex-col p-3 rounded-lg border ${uploadStatus.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {uploadStatus.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span className="text-[11px] font-bold">{uploadStatus.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
