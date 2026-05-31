
import { Terminal, Database, Cpu, HardDrive, Sliders, Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { SystemHealth } from '../../types';

interface OcrStudioViewProps {
  systemHealth: SystemHealth | null;
  exporting: string | null;
  handleExportDb: () => Promise<void>;
  handleExportRules: () => Promise<void>;
}

export default function OcrStudioView({
  systemHealth,
  exporting,
  handleExportDb,
  handleExportRules
}: OcrStudioViewProps) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">OCR Studio</h1>
          <p className="text-xs text-slate-400 mt-1">Monitor Tesseract OCR queues, active extraction jobs, and worker performance.</p>
        </div>
      </div>

      {systemHealth ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Cpu className="h-3 w-3" /> Worker Status
            </h4>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-200">Operational</div>
                <div className="text-[9px] text-zinc-500">Tesseract Engine</div>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Clock className="h-3 w-3" /> Pending Queue
            </h4>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-200">0</div>
                <div className="text-[9px] text-zinc-500">Files awaiting OCR</div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-3 w-3" /> Completed Jobs
            </h4>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-200">{systemHealth.total_files}</div>
                <div className="text-[9px] text-zinc-500">Successfully extracted</div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <AlertCircle className="h-3 w-3" /> Failed Jobs
            </h4>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-200">0</div>
                <div className="text-[9px] text-zinc-500">Requires retry</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-pulse bg-zinc-900 border border-white/5 h-24 rounded-xl flex items-center justify-center text-zinc-600 font-mono text-xs mb-8">
          Probing OCR subsystems...
        </div>
      )}

      <div className="bg-zinc-950 border border-border-dark p-6 rounded-lg space-y-4">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <HardDrive className="h-3.5 w-3.5 text-zinc-500" /> Export & Backup
        </h4>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
          Because Smart Document Workflow is local-first, you own your data. Use these tools to safely backup your database and rules to your Downloads folder.
        </p>
        <div className="flex gap-4 pt-2">
          <button 
            onClick={handleExportDb}
            disabled={exporting !== null}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 border border-border-dark shadow-sm"
          >
            <Database className="h-4 w-4" /> 
            {exporting === 'db' ? 'Exporting...' : 'Export SQLite Database'}
          </button>
          <button 
            onClick={handleExportRules}
            disabled={exporting !== null}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 border border-border-dark shadow-sm"
          >
            <Sliders className="h-4 w-4" /> 
            {exporting === 'rules' ? 'Exporting...' : 'Export Automation Rules'}
          </button>
        </div>
      </div>
    </div>
  );
}
