import { useState, useRef } from 'react';
import { FileSignature, FileDown, Table as TableIcon, Layers, RefreshCw, FilePlus, X, Trash2, Activity, Play, FileArchive, CheckCircle2, AlertCircle, Type, FileCog } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

export default function OfficeStudioView() {
  const [activeOfficeTool, setActiveOfficeTool] = useState('word-template');
  const [officeFiles, setOfficeFiles] = useState<File[]>([]);
  const [isOfficeProcessing, setIsOfficeProcessing] = useState(false);
  const officeFileInputRef = useRef<HTMLInputElement>(null);
  const [templateKeys, setTemplateKeys] = useState<{ key: string; value: string }[]>([{ key: 'client_name', value: '' }]);
  const [excelData, setExcelData] = useState<any>(null);
  const [targetFormat, setTargetFormat] = useState('csv');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleOfficeOperation = async () => {
    if (!activeOfficeTool || officeFiles.length === 0) return;
    setIsOfficeProcessing(true);
    const formData = new FormData();
    
    let endpoint = '';
    if (activeOfficeTool === 'word-template') {
      formData.append('file', officeFiles[0]);
      const contextObj: Record<string, string> = {};
      templateKeys.forEach(t => { if(t.key) contextObj[t.key] = t.value; });
      formData.append('context', JSON.stringify(contextObj));
      endpoint = '/api/office/word/template';
    } else if (activeOfficeTool === 'word-pdf') {
      formData.append('file', officeFiles[0]);
      endpoint = '/api/office/word/to-pdf';
    } else if (activeOfficeTool === 'excel-preview') {
      formData.append('file', officeFiles[0]);
      endpoint = '/api/office/excel/preview';
    } else if (activeOfficeTool === 'excel-merge') {
      officeFiles.forEach(f => formData.append('files', f));
      formData.append('target_format', targetFormat);
      endpoint = '/api/office/excel/merge';
    } else if (activeOfficeTool === 'excel-convert') {
      formData.append('file', officeFiles[0]);
      formData.append('target_format', targetFormat);
      endpoint = '/api/office/excel/convert';
    }

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, { method: 'POST', body: formData });
      if (res.ok) {
        if (activeOfficeTool === 'excel-preview') {
          const data = await res.json();
          setExcelData(data);
          setUploadStatus({ status: 'success', message: 'Preview generated successfully.' });
        } else {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `office_${activeOfficeTool}_result.${activeOfficeTool.includes('pdf') ? 'pdf' : (targetFormat || 'docx')}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setUploadStatus({ status: 'success', message: `${activeOfficeTool} completed successfully!` });
          setOfficeFiles([]);
        }
      } else {
        const err = await res.json();
        setUploadStatus({ status: 'error', message: err.detail || 'Operation failed' });
      }
    } catch (err) {
      setUploadStatus({ status: 'error', message: 'Connection failed.' });
    } finally {
      setIsOfficeProcessing(false);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Office Studio</h1>
          <p className="text-xs text-slate-400 mt-1">Replace Word variables, extract sheets, merge spreadsheets and build tabular reports.</p>
        </div>
      </div>

      {/* Sub-Navigation for Tools */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { id: 'word-template', label: 'DOCX Template', desc: 'Inject variables into templates', icon: FileSignature, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { id: 'word-pdf', label: 'DOCX → PDF', desc: 'Convert Word to PDF', icon: FileDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { id: 'excel-preview', label: 'Spreadsheet Preview', desc: 'View Excel & CSV offline', icon: TableIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { id: 'excel-merge', label: 'Merge Sheets', desc: 'Combine multiple workbooks', icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { id: 'excel-convert', label: 'Convert Format', desc: 'XLSX to CSV or vice versa', icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { id: 'generate-report', label: 'Report Builder', desc: 'Generate tabular reports', icon: FileCog, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(tool => {
          const ToolIcon = tool.icon;
          const isActive = activeOfficeTool === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => { setActiveOfficeTool(tool.id); setOfficeFiles([]); setUploadStatus(null); setExcelData(null); }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-emerald-500/5 border-emerald-500/40 shadow-lg' : 'bg-zinc-900/50 border-white/5 hover:border-emerald-500/20 hover:bg-zinc-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tool.bg} ${tool.color}`}>
                  <ToolIcon size={20} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isActive ? 'text-emerald-300' : 'text-slate-200'}`}>{tool.label}</h3>
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
                {activeOfficeTool.includes('word') ? <Type className="text-emerald-400" /> : <TableIcon className="text-emerald-400" />}
                {activeOfficeTool.replace('-', ' ')}
              </h2>
            </div>

            {/* Drag & Drop Zone */}
            <div 
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer mb-6 flex-1 bg-white/[0.01]
                ${isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/40'}
                ${officeFiles.length > 0 && activeOfficeTool !== 'excel-merge' ? 'hidden' : 'flex'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) {
                  const newFiles = Array.from(e.dataTransfer.files);
                  if (activeOfficeTool === 'excel-merge') setOfficeFiles(prev => [...prev, ...newFiles]);
                  else setOfficeFiles([newFiles[0]]);
                }
              }}
              onClick={() => officeFileInputRef.current?.click()}
            >
              <FilePlus size={36} className={`mb-3 transition-all duration-300 ${isDragging ? 'text-emerald-500 scale-110' : 'text-slate-500'}`} />
              <p className="text-xs font-semibold text-slate-300 mb-1 text-center">
                {isDragging ? 'Drop file here' : (activeOfficeTool === 'excel-merge' ? 'Drag & drop spreadsheets to merge' : 'Drag & drop an Office document')}
              </p>
              <input 
                type="file" 
                ref={officeFileInputRef} 
                className="hidden" 
                accept={activeOfficeTool.includes('word') ? '.docx' : '.csv,.xlsx'} 
                multiple={activeOfficeTool === 'excel-merge'} 
                onChange={(e) => {
                  const newFiles = e.target.files ? Array.from(e.target.files) : [];
                  if (activeOfficeTool === 'excel-merge') setOfficeFiles(prev => [...prev, ...newFiles]);
                  else setOfficeFiles([newFiles[0]]);
                }} 
              />
            </div>

            {/* Selected Files List */}
            {officeFiles.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1">Selected File{officeFiles.length > 1 ? 's' : ''}</span>
                {officeFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {activeOfficeTool.includes('word') ? <Type size={14} className="text-emerald-400 shrink-0" /> : <TableIcon size={14} className="text-emerald-400 shrink-0" />}
                      <span className="text-xs font-medium text-slate-300 truncate">{f.name}</span>
                    </div>
                    <button onClick={() => setOfficeFiles(officeFiles.filter((_, i) => i !== idx))} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tool Specific Options */}
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
              {activeOfficeTool === 'word-template' && (
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block px-1">Template Variables (Key: Value)</label>
                  {templateKeys.map((tk, idx) => (
                     <div key={idx} className="flex items-center gap-2">
                       <Input 
                         type="text" placeholder="Key (e.g. client_name)"
                         value={tk.key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const n = [...templateKeys]; n[idx].key = e.target.value; setTemplateKeys(n); }}
                       />
                       <Input 
                         type="text" placeholder="Value"
                         value={tk.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const n = [...templateKeys]; n[idx].value = e.target.value; setTemplateKeys(n); }}
                       />
                       <Button variant="ghost" onClick={() => setTemplateKeys(templateKeys.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-400 px-2">
                         <Trash2 size={14}/>
                       </Button>
                     </div>
                  ))}
                  <Button variant="ghost" onClick={() => setTemplateKeys([...templateKeys, { key: '', value: '' }])} className="text-emerald-500 hover:text-emerald-400 self-start">
                     + Add Variable
                  </Button>
                </div>
              )}

              {(activeOfficeTool === 'excel-convert' || activeOfficeTool === 'excel-merge') && (
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Target Format</label>
                  <select 
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                    value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
                  >
                    <option value="csv" className="bg-zinc-950">CSV (Comma Separated Values)</option>
                    <option value="xlsx" className="bg-zinc-950">XLSX (Excel Workbook)</option>
                  </select>
                </div>
              )}

              <Button 
                onClick={handleOfficeOperation}
                disabled={officeFiles.length === 0 || isOfficeProcessing}
                className="w-full justify-center mt-2"
                size="lg"
              >
                {isOfficeProcessing ? <Activity size={14} className="animate-spin" /> : <Play size={14} />}
                {isOfficeProcessing ? 'Processing...' : (activeOfficeTool === 'excel-preview' ? 'Generate Preview' : `Execute ${activeOfficeTool.replace('-', ' ')}`)}
              </Button>
            </div>
          </div>
        </div>

        {/* Status & Preview Panel */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl flex-1 flex flex-col">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Activity size={12} /> Result & Metrics
            </h3>
            
            {!uploadStatus && !isOfficeProcessing && !excelData && (
               <div className="flex flex-col items-center justify-center py-10 text-slate-500 opacity-50 flex-1">
                 <FileArchive size={28} className="mb-3 opacity-30" />
                 <p className="text-xs font-semibold text-center leading-relaxed">Ready to process.<br/>Select a tool and files to begin.</p>
               </div>
            )}

            {isOfficeProcessing && (
              <div className="flex flex-col items-center justify-center py-10 flex-1">
                 <div className="bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                   <Activity size={24} className="animate-spin text-emerald-400" />
                 </div>
                 <p className="text-xs font-bold text-emerald-400 tracking-wide">Processing Document...</p>
              </div>
            )}

            {uploadStatus && !isOfficeProcessing && !excelData && (
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
            
            {excelData && activeOfficeTool === 'excel-preview' && !isOfficeProcessing && (
              <div className="flex flex-col flex-1 overflow-hidden">
                 <div className="text-[11px] text-slate-400 mb-4 p-3 bg-black/20 rounded-lg border border-white/5">
                   <p><strong>Rows:</strong> {excelData.total_rows}</p>
                   <p><strong>Columns:</strong> {excelData.columns?.length || 0}</p>
                 </div>
                  <div className="flex-1 overflow-auto bg-zinc-900/50 rounded-lg border border-border-dark">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {excelData.columns?.slice(0, 4).map((col: string, i: number) => (
                             <TableHead key={i} className="whitespace-nowrap">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {excelData.rows?.slice(0, 8).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {excelData.columns?.slice(0, 4).map((col: string, j: number) => (
                               <TableCell key={j} className="truncate max-w-[80px] text-zinc-400">{row[col]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   {(excelData.rows?.length || 0) > 8 && (
                      <div className="text-center p-2 text-slate-500 text-[10px] italic">Showing first 8 rows.</div>
                   )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
