import { useState } from 'react';
import { DownloadCloud, UploadCloud } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';

export default function BackupRestore() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [useEncryption, setUseEncryption] = useState(false);
  const [password, setPassword] = useState('');

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'SDW Backup', extensions: ['sdwbak'] }],
        defaultPath: 'workspace_backup.sdwbak'
      });

      if (!filePath) return;

      setIsExporting(true);
      setStatus({ type: 'info', text: 'Exporting workspace...' });
      
      const payload: any = { destinationPath: filePath };
      if (useEncryption && password) {
        payload.password = password;
      }
      
      await invoke('export_workspace', payload);
      
      setStatus({ type: 'success', text: 'Workspace successfully exported!' });
    } catch (e: any) {
      console.error(e);
      setStatus({ type: 'error', text: `Export failed: ${e}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'SDW Backup', extensions: ['sdwbak'] }],
        multiple: false
      });

      if (!filePath || Array.isArray(filePath)) return;

      if (!window.confirm("WARNING: Importing a workspace will overwrite your current database and all settings. Are you sure you want to continue?")) {
        return;
      }

      setIsImporting(true);
      setStatus({ type: 'info', text: 'Restoring workspace...' });
      
      const payload: any = { sourcePath: filePath };
      if (useEncryption && password) {
        payload.password = password;
      }
      
      await invoke('import_workspace', payload);
      
      setStatus({ type: 'success', text: 'Workspace restored successfully! Please restart the application.' });
      alert("Restore complete. Please restart Smart Document Workflow to load the restored data.");
    } catch (e: any) {
      console.error(e);
      setStatus({ type: 'error', text: `Import failed: ${e}` });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <DownloadCloud size={16} className="text-indigo-400" /> Backup & Recovery
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Export or import your entire workspace, including database, rules, and plugins.</p>
      </div>

      {status && (
        <div className={`p-3 rounded-md text-xs font-medium border ${
          status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
        }`}>
          {status.text}
        </div>
      )}

      <div className="bg-zinc-900/50 p-4 rounded-xl border border-border-dark flex flex-col gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={useEncryption} 
            onChange={(e) => setUseEncryption(e.target.checked)}
            className="rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500 bg-zinc-950"
          />
          <span className="text-xs font-bold text-zinc-300">Use Encrypted Backup (AES-256-GCM)</span>
        </label>
        
        {useEncryption && (
          <input
            type="password"
            placeholder="Enter Backup Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black/50 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none w-full max-w-sm"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <DownloadCloud size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Export Workspace</h4>
              <p className="text-[10px] text-slate-400">Create a portable .sdwbak archive.</p>
            </div>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || isImporting}
            className="w-full mt-2"
          >
            {isExporting ? 'Exporting...' : 'Export Now'}
          </Button>
        </div>

        <div className="bg-white/5 border border-red-500/20 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
              <UploadCloud size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Restore Workspace</h4>
              <p className="text-[10px] text-slate-400">Overwrite current data from archive.</p>
            </div>
          </div>
          <Button 
            onClick={handleImport}
            disabled={isExporting || isImporting}
            variant="outline"
            className="w-full mt-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            {isImporting ? 'Restoring...' : 'Restore Archive'}
          </Button>
        </div>
      </div>
    </div>
  );
}
