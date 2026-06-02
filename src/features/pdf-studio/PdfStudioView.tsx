import { useState, useRef } from 'react';
import { Layers, FileDown, Eye, Shield, FilePlus, FileText, X, Activity, Play, CheckCircle2, AlertCircle, Lock, FileArchive, RotateCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function PdfStudioView() {
  const [activePdfTool, setActivePdfTool] = useState('merge');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pdfSplitPages, setPdfSplitPages] = useState('1');
  const [pdfWatermarkText, setPdfWatermarkText] = useState('CONFIDENTIAL');
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handlePdfOperation = async () => {
    if (!activePdfTool || pdfFiles.length === 0) return;
    setIsPdfProcessing(true);
    const formData = new FormData();
    
    if (activePdfTool === 'merge') {
      pdfFiles.forEach(f => formData.append('files', f));
    } else {
      formData.append('file', pdfFiles[0]);
      if (activePdfTool === 'split') formData.append('pages_per_split', pdfSplitPages);
      if (activePdfTool === 'watermark') formData.append('watermark_text', pdfWatermarkText);
      if (activePdfTool === 'encrypt') formData.append('password', pdfPassword);
    }

    try {
      const res = await fetch(`http://localhost:8000/api/pdf/${activePdfTool}`, { method: 'POST', body: formData });
      if (res.ok) {
        const blob = await res.blob();
        
        if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
          const { save } = await import('@tauri-apps/api/dialog');
          const { writeBinaryFile } = await import('@tauri-apps/api/fs');
          
          const filePath = await save({
            filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
            defaultPath: `result_${activePdfTool}.pdf`
          });
          
          if (filePath) {
            const buffer = await blob.arrayBuffer();
            await writeBinaryFile(filePath, new Uint8Array(buffer));
            setUploadStatus({ status: 'success', message: `PDF ${activePdfTool} completed successfully! Saved to ${filePath}` });
          } else {
            setUploadStatus({ status: 'success', message: `Operation completed but save was cancelled.` });
          }
        } else {
          // Fallback for browser testing
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `result_${activePdfTool}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setUploadStatus({ status: 'success', message: `PDF ${activePdfTool} completed successfully!` });
        }
        
        setPdfFiles([]);
      } else {
        const err = await res.json();
        setUploadStatus({ status: 'error', message: err.detail || 'Operation failed' });
      }
    } catch (err) {
      setUploadStatus({ status: 'error', message: 'Connection failed.' });
    } finally {
      setIsPdfProcessing(false);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">PDF Studio</h1>
          <p className="text-xs text-slate-400 mt-1">Combine, split, watermark, protect and manage PDF documents offline.</p>
        </div>
      </div>

      {/* Sub-Navigation for Tools */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { id: 'merge', label: 'Merge PDFs', desc: 'Combine multiple into one', icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { id: 'split', label: 'Split PDF', desc: 'Extract pages to new files', icon: FileDown, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { id: 'watermark', label: 'Watermark', desc: 'Add text to all pages', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { id: 'encrypt', label: 'Encrypt', desc: 'Password protect document', icon: Lock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { id: 'compress', label: 'Compress', desc: 'Reduce file size', icon: FileArchive, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { id: 'rotate', label: 'Rotate', desc: 'Rotate document pages', icon: RotateCw, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(tool => {
          const ToolIcon = tool.icon;
          const isActive = activePdfTool === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => { setActivePdfTool(tool.id); setPdfFiles([]); setUploadStatus(null); }}
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
                {activePdfTool === 'merge' ? <Layers className="text-indigo-400" /> : <FileDown className="text-indigo-400" />}
                {activePdfTool} PDFs
              </h2>
            </div>

            {/* Drag & Drop Zone */}
            <div 
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer mb-6 flex-1 bg-white/[0.01]
                ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/40'}
                ${pdfFiles.length > 0 && activePdfTool !== 'merge' ? 'hidden' : 'flex'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) {
                  const newFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
                  if (activePdfTool === 'merge') setPdfFiles(prev => [...prev, ...newFiles]);
                  else setPdfFiles([newFiles[0]]);
                }
              }}
              onClick={() => pdfFileInputRef.current?.click()}
            >
              <FilePlus size={36} className={`mb-3 transition-all duration-300 ${isDragging ? 'text-indigo-400 scale-110' : 'text-slate-500'}`} />
              <p className="text-xs font-semibold text-slate-300 mb-1 text-center">
                {isDragging ? 'Drop PDFs here' : (activePdfTool === 'merge' ? 'Drag & drop multiple PDFs, or click to select' : 'Drag & drop a PDF, or click to select')}
              </p>
              <input 
                type="file" 
                ref={pdfFileInputRef} 
                className="hidden" 
                accept=".pdf" 
                multiple={activePdfTool === 'merge'} 
                onChange={(e) => {
                  const newFiles = e.target.files ? Array.from(e.target.files) : [];
                  if (activePdfTool === 'merge') setPdfFiles(prev => [...prev, ...newFiles]);
                  else setPdfFiles([newFiles[0]]);
                }} 
              />
            </div>

            {/* Selected Files List */}
            {pdfFiles.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1">Selected File{pdfFiles.length > 1 ? 's' : ''}</span>
                {pdfFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-300 truncate">{f.name}</span>
                    </div>
                    <button onClick={() => setPdfFiles(pdfFiles.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tool Specific Options */}
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
              {activePdfTool === 'split' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Pages per Split</label>
                  <Input 
                    type="number" min="1" 
                    value={pdfSplitPages} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfSplitPages(e.target.value)}
                  />
                </div>
              )}
              {activePdfTool === 'watermark' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Watermark Text</label>
                  <Input 
                    type="text" 
                    value={pdfWatermarkText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfWatermarkText(e.target.value)}
                  />
                </div>
              )}
              {activePdfTool === 'encrypt' && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Password</label>
                  <Input 
                    type="password" 
                    value={pdfPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfPassword(e.target.value)}
                  />
                </div>
              )}

              <Button 
                onClick={handlePdfOperation}
                disabled={pdfFiles.length === 0 || isPdfProcessing || (activePdfTool === 'encrypt' && !pdfPassword)}
                className="w-full justify-center mt-2"
                size="lg"
              >
                {isPdfProcessing ? <Activity size={14} className="animate-spin" /> : <Play size={14} />}
                {isPdfProcessing ? 'Processing...' : `Execute ${activePdfTool.charAt(0).toUpperCase() + activePdfTool.slice(1)}`}
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
            
            {!uploadStatus && !isPdfProcessing && (
               <div className="flex flex-col items-center justify-center py-10 text-slate-500 opacity-50">
                 <Shield size={28} className="mb-3 opacity-30" />
                 <p className="text-xs font-semibold text-center leading-relaxed">Ready to process.<br/>Select a tool and files to begin.</p>
               </div>
            )}

            {isPdfProcessing && (
              <div className="flex flex-col items-center justify-center py-10">
                 <div className="bg-indigo-500/10 p-3 rounded-full border border-indigo-500/20 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                   <Activity size={24} className="animate-spin text-indigo-400" />
                 </div>
                 <p className="text-xs font-bold text-indigo-400 tracking-wide">Processing Document...</p>
              </div>
            )}

            {uploadStatus && !isPdfProcessing && (
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
