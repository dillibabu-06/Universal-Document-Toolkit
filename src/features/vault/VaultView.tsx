import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Lock, Unlock, FileText, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Vault, VaultDocument } from '../../types/vault';
import { formatDistanceToNow } from 'date-fns';

export default function VaultView() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [password, setPassword] = useState('');
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultPassword, setNewVaultPassword] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchVaults = async () => {
    if (!activeWorkspaceId) return;
    try {
      const v: Vault[] = await invoke('list_vaults', { workspaceId: activeWorkspaceId });
      setVaults(v);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (selectedVault) {
      checkUnlocked();
    }
  }, [selectedVault]);

  const checkUnlocked = async () => {
    if (!selectedVault) return;
    try {
      const unlocked: boolean = await invoke('check_vault_unlocked', { vaultId: selectedVault.id });
      setIsUnlocked(unlocked);
      if (unlocked) {
        fetchDocuments(selectedVault.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async (vaultId: string) => {
    try {
      const docs: VaultDocument[] = await invoke('list_vault_documents', { vaultId });
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVault = async () => {
    if (!activeWorkspaceId || !newVaultName || !newVaultPassword) return;
    try {
      const newVault: Vault = await invoke('create_vault', {
        workspaceId: activeWorkspaceId,
        name: newVaultName,
        password: newVaultPassword
      });
      setShowCreate(false);
      setNewVaultName('');
      setNewVaultPassword('');
      await fetchVaults();
      setSelectedVault(newVault);
    } catch (e) {
      console.error(e);
      setError('Failed to create vault.');
    }
  };

  const handleUnlock = async () => {
    if (!selectedVault || !password) return;
    try {
      await invoke('unlock_vault', { vaultId: selectedVault.id, password });
      setPassword('');
      setError('');
      setIsUnlocked(true);
      fetchDocuments(selectedVault.id);
    } catch (e: any) {
      console.error(e);
      setError('Incorrect password or failed to unlock.');
    }
  };

  const handleLock = async () => {
    if (!selectedVault) return;
    try {
      await invoke('lock_vault', { vaultId: selectedVault.id });
      setIsUnlocked(false);
      setDocuments([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePreview = async (doc: VaultDocument) => {
    try {
      const tempPath: string = await invoke('view_vault_document', {
        vaultId: selectedVault?.id,
        docId: doc.id
      });
      // In a real app we'd open this path or pass to previewer
      alert(`Decrypted file to temporary location: ${tempPath}\nIt will be wiped upon app close.`);
    } catch (e) {
      console.error(e);
      alert('Failed to decrypt document');
    }
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500">
      {/* Sidebar for Vaults */}
      <div className="w-64 border-r border-white/5 bg-[#0f0f11]/60 flex flex-col p-4 space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Vaults</h2>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="text-slate-500 hover:text-slate-200"
          >
            <Plus size={16} />
          </button>
        </div>

        {showCreate && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-3">
            <input 
              type="text" 
              placeholder="Vault Name (e.g. HR Docs)"
              value={newVaultName}
              onChange={e => setNewVaultName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
            />
            <input 
              type="password" 
              placeholder="Encryption Password"
              value={newVaultPassword}
              onChange={e => setNewVaultPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
            />
            <Button size="sm" onClick={handleCreateVault} className="w-full text-[10px]">Create Vault</Button>
          </div>
        )}

        <div className="space-y-1">
          {vaults.map(vault => (
            <button
              key={vault.id}
              onClick={() => setSelectedVault(vault)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                selectedVault?.id === vault.id 
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Lock size={14} className={selectedVault?.id === vault.id ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="truncate">{vault.name}</span>
            </button>
          ))}
          {vaults.length === 0 && !showCreate && (
            <div className="text-[10px] text-slate-500 text-center py-4">No vaults found</div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-black/20 flex flex-col p-8">
        {!selectedVault ? (
          <div className="m-auto flex flex-col items-center justify-center opacity-50">
            <ShieldCheck size={48} className="text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Enterprise Security Vault</h3>
            <p className="text-xs text-slate-500 mt-2 text-center max-w-xs">
              Select or create a vault to manage AES-256 encrypted documents.
            </p>
          </div>
        ) : !isUnlocked ? (
          <div className="m-auto w-full max-w-sm bg-[#0f0f11]/80 border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6">
              <Lock size={24} className="text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">{selectedVault.name}</h2>
            <p className="text-xs text-slate-400 mb-6 text-center">This vault is currently locked. Enter your password to decrypt the master key.</p>
            
            <input 
              type="password"
              placeholder="Vault Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50 mb-4 text-center"
            />
            {error && <p className="text-[10px] text-rose-400 mb-4">{error}</p>}
            <Button className="w-full" onClick={handleUnlock}>Unlock Vault</Button>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Unlock size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">{selectedVault.name}</h1>
                  <p className="text-xs text-slate-400 mt-1">AES-256-GCM Encrypted</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleLock} className="gap-2 text-rose-400 border-rose-500/20 hover:bg-rose-500/10">
                <Lock size={14} /> Lock Vault
              </Button>
            </div>

            <div className="bg-[#0f0f11]/60 border border-white/5 rounded-2xl flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-6">Encrypted Document</div>
                <div className="col-span-3">Added</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              
              <div className="overflow-y-auto p-2 space-y-1">
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText size={32} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Vault is empty</p>
                    <p className="text-[10px] text-slate-500 mt-1">Right-click files in Explorer to move them here.</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-xl hover:bg-white/5 transition-colors group">
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <FileText size={14} />
                        </div>
                        <span className="text-sm text-slate-200 truncate">{doc.original_filename}</span>
                      </div>
                      <div className="col-span-3 text-xs text-slate-500">
                        {formatDistanceToNow(doc.added_at * 1000)} ago
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <Button variant="secondary" size="sm" onClick={() => handlePreview(doc)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
