
import { Check, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface LogsViewProps {
  formatDate: (timestamp: number) => string;
}

export default function LogsView({
  formatDate
}: LogsViewProps) {
  const {
    logs
  } = useWorkspaceStore();

  const successCount = logs.filter(l => l.success).length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  return (
    <div className="matte-panel overflow-hidden max-w-4xl animate-in fade-in duration-200">
      <div className="p-4 bg-zinc-900 border-b border-border-dark flex items-center justify-between select-none">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 font-mono">System Execution Logs & Metrics</h3>
          <p className="text-[11px] text-zinc-500">Live operational ledger of file movements and categorizations.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Actions</div>
            <div className="text-sm font-mono text-indigo-400">{logs.length}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Success Rate</div>
            <div className="text-sm font-mono text-emerald-400">{successRate}%</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border-dark/40">
        {logs.map((log) => (
          <div key={log.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${log.success ? 'bg-zinc-800 text-zinc-300' : 'bg-red-500/10 text-red-400'}`}>
                {log.success ? <Check className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{log.rule_name}</span>
                  <span className={`text-[8px] font-bold tracking-wider uppercase px-1 rounded ${log.success ? 'bg-zinc-800 text-zinc-400 border border-border-dark' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {log.success ? 'success' : 'failed'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5">Path: {log.file_path}</span>
                <span className="text-[9px] text-zinc-500 block truncate font-semibold">{log.action_taken}</span>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono text-[10px] text-zinc-500">
              <span>{formatDate(log.timestamp)}</span>
              {log.error_msg && <span className="text-[9px] text-red-400 block font-semibold mt-1">{log.error_msg}</span>}
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="p-16 text-center text-zinc-600 text-xs select-none">No execution history recorded in workflow tables yet.</div>
        )}
      </div>

    </div>
  );
}
