
import { Copy, FileText, ShieldCheck, HardDrive, Zap, Activity } from 'lucide-react';
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
    setActiveView,
    startIndexing,
    indexingStatus
  } = useWorkspaceStore();

  const otherPdfsCount = files.filter(f => f.category === 'Other' && f.extension === 'pdf').length;
  const wastedBytes = duplicates.reduce((acc, curr) => acc + curr.total_wasted_size, 0);

  // Grouped Categories Stats for Priority 2
  // Unused constants removed

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* ==================== DASHBOARD INTELLIGENCE PANEL ==================== */}
      <div className="grid grid-cols-5 gap-4">
        
        {/* Total Indexed Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-4 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-0.5 tracking-wider uppercase">Cataloged</span>
              <HardDrive className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-mono mt-3">{files.length}</h2>
            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">Files Indexed</span> securely
            </p>
          </div>
        </div>

        {/* Duplicates Removed Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-4 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5 tracking-wider uppercase">Duplicates</span>
              <Copy className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-mono mt-3">{duplicates.length}</h2>
            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-rose-400 font-bold">Clones</span> identified
            </p>
          </div>
        </div>

        {/* Storage Saved Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-4 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 tracking-wider uppercase">Storage</span>
              <ShieldCheck className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-mono mt-3">{wastedBytes > 0 ? formatBytes(wastedBytes) : '0 B'}</h2>
            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">Wasted space</span> detected
            </p>
          </div>
        </div>

        {/* Vault Documents Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-4 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-violet-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-2 py-0.5 tracking-wider uppercase">Vault</span>
              <ShieldCheck className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-mono mt-3">0</h2>
            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-violet-400 font-bold">Encrypted</span> files
            </p>
          </div>
        </div>

        {/* Searches Performed Card */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] p-4 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/10 transition-all"></div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5 tracking-wider uppercase">Searches</span>
              <Activity className="h-4 w-4 text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-mono mt-3">12</h2>
            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-cyan-400 font-bold">Queries</span> executed
            </p>
          </div>
        </div>
      </div>

      {/* ==================== QUICK ACTIONS & RECENT ACTIVITY ==================== */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        
        {/* Quick Actions */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] rounded-xl overflow-hidden shadow-lg flex flex-col h-[340px]">
          <div className="px-5 py-4 border-b border-[#2C2E33] bg-[#1a1d24]/50">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Quick Actions
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
            <button onClick={() => startIndexing()} className="flex flex-col items-center justify-center p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-lg transition-all group">
              <HardDrive className="h-6 w-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-zinc-300">Import Folder</span>
            </button>
            <button onClick={() => setActiveView('explorer')} className="flex flex-col items-center justify-center p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-lg transition-all group">
              <FileText className="h-6 w-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-zinc-300">Open Explorer</span>
            </button>
            <button onClick={() => setActiveView('vault')} className="flex flex-col items-center justify-center p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-lg transition-all group">
              <ShieldCheck className="h-6 w-6 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-zinc-300">Create Vault</span>
            </button>
            <button onClick={() => setActiveView('reporting')} className="flex flex-col items-center justify-center p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-lg transition-all group">
              <Activity className="h-6 w-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-zinc-300">Generate Report</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#16191d]/75 backdrop-blur-md border border-[#2C2E33] rounded-xl overflow-hidden shadow-lg flex flex-col h-[340px]">
          <div className="px-5 py-4 border-b border-[#2C2E33] bg-[#1a1d24]/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-rose-400" /> Recent Activity
            </h3>
            <button onClick={() => setActiveView('timeline')} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider">
              View All
            </button>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            {files.slice(0, 5).map((file, i) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between px-5 py-3 border-b border-[#2C2E33]/50 hover:bg-[#1a1d24] cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedFile(file);
                  setActiveView('explorer');
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-emerald-500/10 text-emerald-400' :
                    i === 1 ? 'bg-blue-500/10 text-blue-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    <FileText size={14} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-200 truncate">{file.filename}</span>
                    <span className="text-[10px] text-zinc-500 truncate">{file.path}</span>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 whitespace-nowrap shrink-0 ml-4">
                  {i === 0 ? 'Just now' : i === 1 ? '5m ago' : 'Today'}
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-xs italic">
                No recent activity. Import a folder to get started.
              </div>
            )}
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
              onClick={() => setActiveView('reporting')}
              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-border-dark/60 font-semibold transition-colors shrink-0"
            >
              View Duplicate Analysis ({formatBytes(wastedBytes)} wasted)
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
              onClick={() => setActiveView('explorer')}
              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-border-dark/60 font-semibold transition-colors shrink-0"
            >
              Assign Category
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
          <button onClick={() => setActiveView('explorer')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">View all files</button>
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
