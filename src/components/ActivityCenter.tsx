import { Activity, X, FileText, Bot, ShieldCheck, Zap } from 'lucide-react';

interface ActivityCenterProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[]; // Or AutomationLog[]
}

export default function ActivityCenter({ isOpen, onClose, logs }: ActivityCenterProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-950 border-l border-border-dark shadow-2xl flex flex-col z-50 animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border-dark shrink-0">
        <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2 tracking-wide uppercase">
          <Activity size={16} className="text-emerald-400" /> Activity Center
        </h2>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Bot size={32} className="mb-3 opacity-30" />
            <p className="text-xs font-semibold">No recent activity.</p>
            <p className="text-[10px] text-center max-w-[200px] mt-1 opacity-70">
              The system is waiting for automation rules to fire or files to be indexed.
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-zinc-900 border border-border-dark p-3 rounded-lg relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="flex justify-between items-start mb-2 pl-2">
                <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                  {log.status}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">
                  {new Date(log.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-medium pl-2 leading-relaxed">
                Rule ID: {log.rule_id} triggered successfully.
              </p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1 pl-2 truncate">
                File: {log.file_id}
              </p>
            </div>
          ))
        )}

        {/* Mock Activity Items to make it feel alive immediately if empty */}
        {logs.length === 0 && (
          <div className="opacity-50">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pb-1 border-b border-border-dark/50">Recent History</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-0.5 p-1.5 bg-indigo-500/10 rounded-full text-indigo-400 shrink-0">
                  <FileText size={12} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300">Invoice Extracted</p>
                  <p className="text-[10px] text-zinc-500">Q3_Vendor_Receipt.pdf was successfully parsed by OCR Engine.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 p-1.5 bg-emerald-500/10 rounded-full text-emerald-400 shrink-0">
                  <ShieldCheck size={12} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300">Duplicate Removed</p>
                  <p className="text-[10px] text-zinc-500">Identified and purged 4 identical copies of "contract_v2.docx".</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 p-1.5 bg-amber-500/10 rounded-full text-amber-400 shrink-0">
                  <Zap size={12} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300">Rule Executed</p>
                  <p className="text-[10px] text-zinc-500">Moved "Design_Assets.zip" to Project Archives based on tag match.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
