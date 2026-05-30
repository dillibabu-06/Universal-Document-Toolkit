
import { Terminal, Database, Cpu, HardDrive, Sliders } from 'lucide-react';
import { SystemHealth } from '../../types';

interface DiagnosticsViewProps {
  systemHealth: SystemHealth | null;
  exporting: string | null;
  handleExportDb: () => Promise<void>;
  handleExportRules: () => Promise<void>;
  formatBytes: (bytes: number) => string;
}

export default function DiagnosticsView({
  systemHealth,
  exporting,
  handleExportDb,
  handleExportRules,
  formatBytes
}: DiagnosticsViewProps) {
  return (
    <div className="matte-panel overflow-hidden max-w-4xl p-8 space-y-8 animate-in fade-in duration-200">
      <div>
        <h3 className="text-xl font-bold text-zinc-100 font-mono flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-400" /> System Diagnostics
        </h3>
        <p className="text-sm text-zinc-500 mt-1">Live health metrics and local data portability.</p>
      </div>

      {systemHealth ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-border-dark p-5 rounded-lg space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-zinc-500" /> Database Health
            </h4>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-border-dark/50 pb-2">
                <span className="text-zinc-500">File Size</span>
                <span className="text-indigo-400 font-bold">{formatBytes(systemHealth.db_size_bytes)}</span>
              </div>
              <div className="flex justify-between border-b border-border-dark/50 pb-2">
                <span className="text-zinc-500">Total Indexed Files</span>
                <span className="text-zinc-300">{systemHealth.total_files}</span>
              </div>
              <div className="flex justify-between border-b border-border-dark/50 pb-2">
                <span className="text-zinc-500">Active Automations</span>
                <span className="text-zinc-300">{systemHealth.total_rules}</span>
              </div>
              <div className="flex justify-between border-b border-border-dark/50 pb-2">
                <span className="text-zinc-500">Execution Logs</span>
                <span className="text-zinc-300">{systemHealth.automation_logs}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-border-dark p-5 rounded-lg space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-zinc-500" /> Subsystems
            </h4>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-border-dark/50 pb-2 items-center">
                <span className="text-zinc-500">Tesseract OCR Engine</span>
                {systemHealth.tesseract_installed ? (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Operational</span>
                ) : (
                  <span className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Missing</span>
                )}
              </div>
              <div className="flex justify-between border-b border-border-dark/50 pb-2 items-center">
                <span className="text-zinc-500">Filesystem Watcher</span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Active</span>
              </div>
              <div className="flex justify-between border-b border-border-dark/50 pb-2 items-center">
                <span className="text-zinc-500">Local Indexer</span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Idle</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-pulse bg-zinc-900 border border-border-dark h-48 rounded-lg flex items-center justify-center text-zinc-600 font-mono text-xs">
          Probing local subsystems...
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
