import { FileRecord, DocumentEntity } from '../../types';
import { Tag, Calendar, Building, DollarSign, BrainCircuit, ScanText, Hash, ShieldCheck, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Vault } from '../../types/vault';

interface MetadataInspectorProps {
  file: FileRecord | null;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

export default function MetadataInspector({ file, formatBytes, formatDate }: MetadataInspectorProps) {
  const [entities, setEntities] = useState<DocumentEntity[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const { activeWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (activeWorkspaceId) {
      invoke<Vault[]>('list_vaults', { workspaceId: activeWorkspaceId })
        .then(res => {
          setVaults(res);
          if (res.length > 0) setSelectedVaultId(res[0].id);
        })
        .catch(console.error);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (file) {
      invoke<DocumentEntity[]>('get_file_entities', { fileId: file.id })
        .then(res => setEntities(res))
        .catch(console.error);
    } else {
      setEntities([]);
    }
  }, [file]);

  if (!file) return null;

  const hasIntelligence = entities.length > 0;

  // Helper to get nice icons/labels for known intelligence fields
  const renderIntelligenceChip = (key: string, val: string) => {
    let Icon = Tag;
    let label = key.replace('_', ' ').toUpperCase();
    let colorClass = "bg-zinc-800 text-zinc-300 border-zinc-700";

    if (key.includes('vendor') || key.includes('merchant') || key.includes('bank') || key.includes('party')) {
      Icon = Building;
      colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    } else if (key.includes('amount') || key.includes('balance') || key.includes('paid')) {
      Icon = DollarSign;
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (key.includes('date') || key.includes('period')) {
      Icon = Calendar;
      colorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    } else if (key.includes('id') || key.includes('number')) {
      Icon = Hash;
      colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    return (
      <div key={key} className={`flex flex-col p-2.5 rounded-lg border ${colorClass} transition-all hover:brightness-110`}>
        <span className="text-[8px] font-bold tracking-widest opacity-70 mb-1 flex items-center gap-1">
          <Icon size={10} /> {label}
        </span>
        <span className="text-xs font-semibold truncate" title={val}>{val}</span>
      </div>
    );
  };

  const handleMoveToVault = async () => {
    if (!file || !selectedVaultId) return;
    try {
      await invoke('add_to_vault', { vaultId: selectedVaultId, filePath: file.path });
      alert('File successfully encrypted and moved to Vault!');
    } catch (e) {
      console.error(e);
      alert(`Failed to move to vault: ${e}`);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* File Base Info */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-border-dark">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
          <ScanText size={12} /> System Attributes
        </h3>
        
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Size</span>
            <span className="text-xs text-zinc-300 font-mono">{formatBytes(file.size)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Category</span>
            <span className="text-xs text-indigo-400 font-semibold">{file.category}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Modified</span>
            <span className="text-xs text-zinc-300 font-mono">{formatDate(file.modified_at)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Indexed</span>
            <span className="text-xs text-zinc-300 font-mono">{formatDate(file.indexed_at)}</span>
          </div>
        </div>
      </div>

      {/* AI Extraction Data */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-border-dark flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <BrainCircuit size={12} className={hasIntelligence ? "text-indigo-400" : ""} /> 
            Document Intelligence
          </h3>
          {hasIntelligence && (
            <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {entities.length} Entities
            </span>
          )}
        </div>

        {hasIntelligence ? (
          <div className="grid grid-cols-2 gap-2">
            {entities.map((e) => renderIntelligenceChip(e.key, e.value))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <BrainCircuit size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center font-medium opacity-70">
              No entities extracted<br/>for this document type.
            </p>
          </div>
        )}
      </div>


      {/* Security Actions */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-border-dark mt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-1.5">
          <ShieldCheck size={12} /> Security Actions
        </h3>
        {vaults.length > 0 ? (
          <div className="space-y-3">
            <select
              value={selectedVaultId}
              onChange={(e) => setSelectedVaultId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none"
            >
              {vaults.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="w-full gap-2 text-rose-400 border-rose-500/20 hover:bg-rose-500/10" onClick={handleMoveToVault}>
              <Lock size={12} /> Move to Vault
            </Button>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-500 text-center p-2">
            Create a Security Vault in Settings to encrypt this file.
          </div>
        )}
      </div>
    </div>
  );
}
