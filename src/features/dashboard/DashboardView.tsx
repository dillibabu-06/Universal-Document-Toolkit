
import { Copy, FileText, Sliders, ShieldCheck, HardDrive } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileRecord } from '../../types';

interface DashboardViewProps {
  setSelectedFile: (file: FileRecord | null) => void;
  selectedFile: FileRecord | null;
  getWorkflowStatus: (file: FileRecord) => string;
  getStatusBadge: (status: string) => string;
  getCategoryColor: (cat: string) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

export default function DashboardView({
  setSelectedFile,
  selectedFile,
  getWorkflowStatus,
  getStatusBadge,
  getCategoryColor,
  formatBytes,
  formatDate
}: DashboardViewProps) {
  const {
    files,
    duplicates,
    rules,
    setActiveView,
    startIndexing,
    indexingStatus
  } = useWorkspaceStore();

  const otherPdfsCount = files.filter(f => f.category === 'Other' && f.extension === 'pdf').length;
  const wastedBytes = duplicates.reduce((acc, curr) => acc + curr.total_wasted_size, 0);

  // Grouped Categories Stats for Priority 2
  const invoicesCount = files.filter(f => f.category === 'Invoice').length;
  const resumesCount = files.filter(f => f.category === 'Resume').length;
  const statementsCount = files.filter(f => f.category === 'Bank Statement').length;
  const contractsCount = files.filter(f => f.category === 'Contract').length;



  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* ==================== DASHBOARD INTELLIGENCE PANEL ==================== */}
      <div className="grid grid-cols-4 gap-6">
        {/* Invoices Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-5 rounded-2xl flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2.5 py-1 tracking-wider uppercase">Invoices</span>
              <FileText className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100 font-mono mt-4">{invoicesCount}</h2>
            <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">+8</span> new this week
            </p>
          </div>
        </div>

        {/* Resumes Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-5 rounded-2xl flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-violet-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-2.5 py-1 tracking-wider uppercase">Resumes</span>
              <FileText className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100 font-mono mt-4">{resumesCount}</h2>
            <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-violet-400 font-bold">+3</span> new candidates
            </p>
          </div>
        </div>

        {/* Contracts Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-5 rounded-2xl flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2.5 py-1 tracking-wider uppercase">Contracts</span>
              <FileText className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100 font-mono mt-4">{contractsCount}</h2>
            <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-amber-400 font-bold">5</span> pending review
            </p>
          </div>
        </div>

        {/* Reports / Bank Statements Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-5 rounded-2xl flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-sky-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-sky-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded px-2.5 py-1 tracking-wider uppercase">Statements</span>
              <FileText className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100 font-mono mt-4">{statementsCount}</h2>
            <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-sky-400 font-bold">Q3</span> analysis completed
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion List Inbox Header */}
      <div>
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 select-none">Actionable Suggestions</h3>
        <p className="text-xs text-zinc-400">Low-friction folder maintenance and deduplication opportunities.</p>
      </div>

      {/* Suggestions Cards Inbox */}
      <div className="space-y-2.5">
        {duplicates.length > 0 && (
          <div className="p-3.5 bg-zinc-900 border border-border-dark/80 rounded-md flex items-center justify-between gap-4 transition-all duration-150 hover:border-zinc-700">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20 shrink-0">
                <Copy className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-zinc-200">Duplicate File Clusters Detected</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">We identified {duplicates.length} duplicate sets sharing identical byte hashes in monitored directories.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('duplicates')}
              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-border-dark/60 font-semibold transition-colors shrink-0"
            >
              Clean Duplicates ({formatBytes(wastedBytes)} wasted)
            </button>
          </div>
        )}

        {otherPdfsCount > 0 && (
          <div className="p-3.5 bg-zinc-900 border border-border-dark/80 rounded-md flex items-center justify-between gap-4 transition-all duration-150 hover:border-zinc-700">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-zinc-200">Untagged PDFs Discovered</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">There are {otherPdfsCount} untagged PDF files waiting for taxonomy classifications.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('files')}
              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-border-dark/60 font-semibold transition-colors shrink-0"
            >
              Assign Category
            </button>
          </div>
        )}

        {rules.length === 0 && (
          <div className="p-3.5 bg-zinc-900 border border-border-dark/80 rounded-md flex items-center justify-between gap-4 transition-all duration-150 hover:border-zinc-700">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 border border-border-dark/60 shrink-0">
                <Sliders className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-zinc-200">Establish Workspace Watchers</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Establish watch conditions sorting files dynamically on creation automatically.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('rules')}
              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-border-dark/60 font-semibold transition-colors shrink-0"
            >
              Configure watch rule
            </button>
          </div>
        )}

        {duplicates.length === 0 && files.length > 0 && (
          <div className="p-3.5 bg-zinc-900 border border-border-dark/80 rounded-md flex items-center gap-3 transition-all duration-150 border-l-2 border-l-emerald-500 bg-emerald-500/5 hover:border-border-dark">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <h4 className="text-xs font-semibold text-zinc-200">System Storage Optimized</h4>
              <p className="text-[11px] text-zinc-400">All local directory pathways cataloged cleanly. Duplicate ratios minimized.</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Files Table list */}
      <div className="space-y-2.5 pt-4">
        <div className="flex items-center justify-between select-none">
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Recent Activity Ledger</h3>
          <button onClick={() => setActiveView('files')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">View all files</button>
        </div>

        <div className="matte-panel overflow-hidden">
          <table className="w-full text-left text-xs border-collapse table-dense">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-border-dark select-none text-explorer-header">
                <th className="px-4 py-2.5">File Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Workflow Status</th>
                <th className="px-4 py-2.5">Size</th>
                <th className="px-4 py-2.5">Scanned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/30">
              {files.slice(0, 5).map((f) => {
                const isSelected = selectedFile?.id === f.id;
                return (
                  <tr 
                    key={f.id} 
                    onClick={() => setSelectedFile(f)}
                    className={`hover-row cursor-pointer transition-colors border-b border-border-dark/20 ${isSelected ? 'selected-row' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-explorer-row flex items-center gap-2 truncate max-w-sm">
                      <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <span className="truncate">{f.filename}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getCategoryColor(f.category)}`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={getStatusBadge(getWorkflowStatus(f))}>
                        {getWorkflowStatus(f)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 font-medium">{formatBytes(f.size)}</td>
                    <td className="px-4 py-2.5 text-zinc-400 font-medium">{formatDate(f.indexed_at)}</td>
                  </tr>
                );
              })}
              {files.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-600 text-xs">
                    <div className="flex flex-col items-center justify-center p-6 gap-2">
                      <HardDrive className="h-8 w-8 text-zinc-700 animate-pulse mb-1" />
                      <span className="font-semibold text-zinc-400">No Files Monitored Yet</span>
                      <span className="text-[11px] text-zinc-500 max-w-xs leading-normal">Configure a monitored folder in workspace settings and crawl directory pathways to begin.</span>
                      <button 
                        onClick={startIndexing} 
                        disabled={indexingStatus.type === 'Scanning'}
                        className="mt-2 px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold border border-border-dark/80 rounded text-[11px] transition-all disabled:opacity-50"
                      >
                        Crawl Directory
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
