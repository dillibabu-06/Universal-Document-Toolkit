
import { AlertTriangle, ShieldCheck, FolderOpen, Trash } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface DuplicatesViewProps {
  formatBytes: (bytes: number) => string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function DuplicatesView({
  formatBytes,
  showToast
}: DuplicatesViewProps) {
  const {
    duplicates,
    openFileLocation,
    trashFile
  } = useWorkspaceStore();

  const totalWastedBytes = duplicates.reduce((acc, curr) => acc + curr.total_wasted_size, 0);
  const totalCopies = duplicates.reduce((acc, curr) => acc + curr.file_count, 0);

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      {/* Dynamic Actionable metrics banner */}
      <div className="p-4 rounded-md bg-amber-500/5 border border-amber-500/15 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-md border border-amber-500/20 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
              {duplicates.length > 0 
                ? `${totalCopies} duplicate copies detected. Review cleanup?`
                : "System Storage Optimized"}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Identical file content byte signatures discovered in monitored folder pathways.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Recyclable Wasted Space</span>
          <span className="text-sm font-bold text-amber-500 mt-0.5 block font-mono">
            {formatBytes(totalWastedBytes)}
          </span>
        </div>
      </div>

      {/* Duplicate Clusters Review List */}
      <div className="space-y-4">
        {duplicates.map((cluster, idx) => (
          <div key={cluster.hash} className="matte-panel overflow-hidden border border-border-dark">
            
            {/* Header bar */}
            <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-border-dark flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cluster #{idx + 1}</span>
                <span className="text-zinc-700">|</span>
                <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[150px]">SHA-256: {cluster.hash}</span>
              </div>
              <span className="text-xs font-medium text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">{cluster.file_count} copies &bull; {formatBytes(cluster.total_wasted_size)} wasted</span>
            </div>

            {/* Compare duplicate locations */}
            <div className="divide-y divide-border-dark/30 bg-zinc-950/20">
              {cluster.files.map((file, fIdx) => (
                <div 
                  key={file.id} 
                  className={`px-4 py-3 flex items-center justify-between gap-4 hover:bg-hover/25 transition-colors ${
                    fIdx % 2 === 0 ? 'bg-panel-dark/40' : 'bg-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">{file.filename}</span>
                    <span className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5">{file.path}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-400 text-xs font-medium">{formatBytes(file.size)}</span>
                    <button 
                      title="Reveal in Finder"
                      onClick={() => openFileLocation(file.path)}
                      className="h-7 w-7 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 border border-border-dark/60 flex items-center justify-center transition-all"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={async () => {
                        const confirmed = window.confirm(`Move this duplicate to Trash?\n\n${file.path}`);
                        if (confirmed) {
                          const ok = await trashFile(file.path);
                          if (ok) {
                            showToast(`Moved "${file.filename}" to Trash`, 'success');
                          } else {
                            showToast(`Failed to trash "${file.filename}"`, 'error');
                          }
                        }
                      }}
                      className="h-7 w-7 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-border-dark/60 flex items-center justify-center transition-all"
                      title="Move Duplicate to Trash"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}

        {duplicates.length === 0 && (
          <div className="p-12 text-center text-zinc-600 text-xs matte-panel select-none">
            <div className="flex flex-col items-center justify-center p-6 gap-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500/70" />
              <span className="font-semibold text-zinc-400">Zero Duplicates Cataloged</span>
              <span className="text-[11px] text-zinc-500">Storage clusters optimized completely across active workspaces directories.</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
