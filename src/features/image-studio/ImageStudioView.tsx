import { useState, useRef } from 'react';
import { Image, FileDown, Shield, FilePlus, X, Activity, Play, CheckCircle2, AlertCircle, FileImage } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function ImageStudioView() {
  const [activeImageTool, setActiveImageTool] = useState('convert');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleImageOperation = async () => {
    if (!imageFile || !activeImageTool) return;
    setIsProcessing(true);
    const formData = new FormData();
    
    formData.append('file', imageFile);
    if (activeImageTool === 'convert') {
      formData.append('target_format', targetFormat);
    }

    try {
      const res = await fetch(`http://localhost:8000/api/image/${activeImageTool}`, { method: 'POST', body: formData });
      if (res.ok) {
        const blob = await res.blob();
        
        if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
          const { save } = await import('@tauri-apps/api/dialog');
          const { writeBinaryFile } = await import('@tauri-apps/api/fs');
          
          const filePath = await save({
            filters: [{ name: 'Image Document', extensions: [targetFormat] }],
            defaultPath: `result_image.${targetFormat}`
          });
          
          if (filePath) {
            const buffer = await blob.arrayBuffer();
            await writeBinaryFile(filePath, new Uint8Array(buffer));
            setUploadStatus({ status: 'success', message: `Image ${activeImageTool} completed successfully! Saved to ${filePath}` });
          } else {
            setUploadStatus({ status: 'success', message: `Operation completed but save was cancelled.` });
          }
        } else {
          // Fallback for browser testing
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `result_image.${targetFormat}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setUploadStatus({ status: 'success', message: `Image processed successfully!` });
        }
        
        setImageFile(null);
      } else {
        const err = await res.json();
        setUploadStatus({ status: 'error', message: err.detail || 'Operation failed' });
      }
    } catch (err) {
      setUploadStatus({ status: 'error', message: 'Connection failed.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Image Studio</h1>
          <p className="text-xs text-slate-400 mt-1">Convert, compress, and manipulate image files locally.</p>
        </div>
      </div>

      {/* Sub-Navigation for Tools */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { id: 'convert', label: 'Convert Format', desc: 'Change image extension', icon: FileDown, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        ].map(tool => {
          const ToolIcon = tool.icon;
          const isActive = activeImageTool === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => { setActiveImageTool(tool.id); setImageFile(null); setUploadStatus(null); }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-indigo-500/5 border-indigo-500/40 shadow-lg' : 'bg-zinc-900/50 border-white/5 hover:border-indigo-500/20 hover:bg-zinc-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tool.bg} ${tool.color}`}>
                  <ToolIcon size={20} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>{tool.label}</h3>
                  <p className="text-[10px] text-slate-500">{tool.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1">
        {/* Tool Configuration Panel */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 capitalize">
                <Image className="text-indigo-400" />
                {activeImageTool} Image
              </h2>
            </div>

            {/* Drag & Drop Zone */}
            <div 
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer mb-6 flex-1 bg-white/[0.01]
                ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/40'}
                ${imageFile ? 'hidden' : 'flex'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) {
                  const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
                  if (file) setImageFile(file);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FilePlus size={36} className={`mb-3 transition-all duration-300 ${isDragging ? 'text-indigo-400 scale-110' : 'text-slate-500'}`} />
              <p className="text-xs font-semibold text-slate-300 mb-1 text-center">
                {isDragging ? 'Drop image here' : 'Drag & drop an image, or click to select'}
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length > 0) setImageFile(files[0]);
                }} 
              />
            </div>

            {/* Selected File List */}
            {imageFile && (
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1">Selected File</span>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileImage size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-300 truncate">{imageFile.name}</span>
                  </div>
                  <button onClick={() => setImageFile(null)} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Tool Specific Options */}
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
              {activeImageTool === 'convert' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Target Format</label>
                  <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value)}
                    className="w-full bg-zinc-900 border border-border-dark text-zinc-300 rounded text-xs p-2 focus:ring-0 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                    <option value="bmp">BMP</option>
                    <option value="gif">GIF</option>
                  </select>
                </div>
              )}

              <Button 
                onClick={handleImageOperation}
                disabled={!imageFile || isProcessing}
                className="w-full justify-center mt-2"
                size="lg"
              >
                {isProcessing ? <Activity size={14} className="animate-spin" /> : <Play size={14} />}
                {isProcessing ? 'Processing...' : `Execute ${activeImageTool.charAt(0).toUpperCase() + activeImageTool.slice(1)}`}
              </Button>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl flex-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Activity size={12} /> Operation Status
            </h3>
            
            {!uploadStatus && !isProcessing && (
               <div className="flex flex-col items-center justify-center py-10 text-slate-500 opacity-50">
                 <Shield size={28} className="mb-3 opacity-30" />
                 <p className="text-xs font-semibold text-center leading-relaxed">Ready to process.<br/>Select a tool and image to begin.</p>
               </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-10">
                 <div className="bg-indigo-500/10 p-3 rounded-full border border-indigo-500/20 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                   <Activity size={24} className="animate-spin text-indigo-400" />
                 </div>
                 <p className="text-xs font-bold text-indigo-400 tracking-wide">Processing Image...</p>
              </div>
            )}

            {uploadStatus && !isProcessing && (
              <div className={`flex flex-col p-4 rounded-xl border ${uploadStatus.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                 <div className="flex items-center gap-2 mb-1.5">
                   {uploadStatus.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                   <h4 className="text-xs font-bold tracking-wide">
                     {uploadStatus.status === 'success' ? 'Success' : 'Failed'}
                   </h4>
                 </div>
                 <p className="text-[11px] font-medium leading-relaxed opacity-85">
                   {uploadStatus.message}
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
