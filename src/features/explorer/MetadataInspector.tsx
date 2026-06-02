import { FileRecord, DocumentEntity } from '../../types';
import { 
  Tag, Calendar, Building, DollarSign, BrainCircuit, ScanText, Hash, 
  ShieldCheck, Clock, PlusCircle, Workflow, Link2, Trash2,
  History
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface MetadataInspectorProps {
  file: FileRecord | null;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
  activeTab: 'attributes' | 'timeline' | 'relations' | 'versions';
}

export default function MetadataInspector({ file, formatBytes, formatDate, activeTab }: MetadataInspectorProps) {
  const [entities, setEntities] = useState<DocumentEntity[]>([]);
  const [comment, setComment] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);

  const { 
    selectedFileTimeline, 
    loadDocumentTimeline,
    selectedFileVersions,
    loadDocumentVersions,
    createDocumentVersion,
    restoreDocumentVersion
  } = useWorkspaceStore();


  useEffect(() => {
    if (file) {
      invoke<DocumentEntity[]>('get_file_entities', { fileId: file.id })
        .then(res => setEntities(res))
        .catch(console.error);

      if (activeTab === 'timeline') {
        loadDocumentTimeline(file.id);
      } else if (activeTab === 'versions') {
        loadDocumentVersions(file.id);
      }
    } else {
      setEntities([]);
    }
  }, [file, activeTab]);

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


  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !comment.trim()) return;
    setCreatingVersion(true);
    try {
      await createDocumentVersion(file.id, comment.trim());
      setComment('');
    } catch (err) {
      console.error(err);
      alert(`Failed to save checkpoint: ${err}`);
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, verNum: number) => {
    if (confirm(`Are you absolutely sure you want to physically restore active workspace file to Version ${verNum}?\n\nBefore restoring, the system will automatically snapshot your current state as a backup checkpoint.`)) {
      try {
        await restoreDocumentVersion(versionId);
        alert(`Successfully rolled back to Version ${verNum}!`);
      } catch (err) {
        console.error(err);
        alert(`Failed to restore version: ${err}`);
      }
    }
  };

  // Helper to map timeline event types to Lucide icons and sleek color styles
  const getEventStyle = (type: string) => {
    switch (type) {
      case 'Created':
        return {
          icon: PlusCircle,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          bubble: 'bg-blue-500'
        };
      case 'Modified':
        return {
          icon: Clock,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          bubble: 'bg-amber-500'
        };
      case 'Renamed':
        return {
          icon: ScanText,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
          bubble: 'bg-teal-500'
        };
      case 'Moved':
        return {
          icon: Workflow,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          bubble: 'bg-cyan-500'
        };
      case 'Archived':
        return {
          icon: Trash2,
          color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
          bubble: 'bg-zinc-500'
        };
      case 'Restored':
        return {
          icon: History,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          bubble: 'bg-emerald-500'
        };
      case 'VaultOperation':
        return {
          icon: ShieldCheck,
          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          bubble: 'bg-violet-500'
        };

      default:
        return {
          icon: Clock,
          color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
          bubble: 'bg-zinc-500'
        };
    }
  };

  return (
    <div className="flex flex-col space-y-4">

      {activeTab === 'attributes' && (
        <div className="flex flex-col space-y-4 animate-in fade-in duration-200">
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


        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="flex flex-col flex-1 overflow-y-auto animate-in fade-in duration-200 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-400" /> Chronological History
            </h3>
            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {selectedFileTimeline.length} Events
            </span>
          </div>

          {selectedFileTimeline.length > 0 ? (
            <div className="relative border-l border-zinc-800 ml-3.5 pl-6 space-y-6 py-2 select-none overflow-y-auto max-h-[400px] min-h-0 flex-1">
              {selectedFileTimeline.map((evt) => {
                const style = getEventStyle(evt.event_type);
                const Icon = style.icon;
                return (
                  <div key={evt.id} className="relative group">
                    {/* Connector Dot */}
                    <div className={`absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${style.bubble} transition-all duration-300 group-hover:scale-125 group-hover:brightness-110 shadow-sm`} />
                    
                    {/* Event Content card */}
                    <div className="bg-zinc-900/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all hover:bg-zinc-900/60 flex flex-col gap-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-150 flex items-center gap-1.5">
                          <div className={`p-1 rounded-md border ${style.color}`}>
                            <Icon size={12} />
                          </div>
                          {evt.title}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">{formatDate(evt.created_at)}</span>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed pl-7 mt-0.5">{evt.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 flex-1">
              <Clock size={28} className="mb-2 opacity-30 animate-pulse" />
              <p className="text-xs text-center font-medium opacity-70">
                Initializing timeline records<br/>for this document...
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'relations' && (
        <div className="flex flex-col space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Link2 size={12} className="text-indigo-400" /> Related Documents
            </h3>
            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {useWorkspaceStore.getState().relatedDocs.length} Found
            </span>
          </div>
          
          <div className="space-y-2">
            {useWorkspaceStore.getState().relatedDocs.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs italic">
                No related documents discovered.
              </div>
            ) : (
              useWorkspaceStore.getState().relatedDocs.map(([rel, doc]) => (
                <div key={rel.id} className="bg-zinc-900/50 p-3 rounded-lg border border-border-dark flex flex-col gap-1.5 hover:border-indigo-500/30 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 truncate">{doc.filename}</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                      {rel.relationship_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate">{doc.path}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="flex flex-col flex-1 overflow-y-auto animate-in fade-in duration-200 min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <History size={12} className="text-indigo-400" /> Revision History
            </h3>
            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {selectedFileVersions.length} Revisions
            </span>
          </div>

          {/* Create Checkpoint Form */}
          <form onSubmit={handleCreateCheckpoint} className="bg-zinc-950/40 p-3 rounded-xl border border-white/5 space-y-2 mb-4 shrink-0">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <PlusCircle size={10} className="text-indigo-400" /> Save Revision Checkpoint
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter revision note (e.g. Added section 4)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none placeholder:text-zinc-650"
              />
              <Button type="submit" size="sm" className="text-[10px]" disabled={creatingVersion || !comment.trim()}>
                {creatingVersion ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>

          {/* Versions Chronicle List */}
          {selectedFileVersions.length > 0 ? (
            <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 min-h-0 flex-1">
              {selectedFileVersions.map((v) => (
                <div key={v.id} className="bg-zinc-900/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all hover:bg-zinc-900/60 flex items-center justify-between group shadow-sm">
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                        V{v.version_number}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">{formatDate(v.created_at)}</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-semibold truncate mt-1" title={v.comment || ''}>
                      {v.comment || 'No comment provided.'}
                    </p>
                    <span className="text-[8px] text-zinc-600 truncate font-mono mt-0.5" title={v.backup_path}>{v.backup_path}</span>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(v.id, v.version_number)}
                    className="h-6 px-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/10 text-white rounded-md text-[9px] font-extrabold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 shrink-0 ml-3"
                    title={`Restore ${file.filename} to this version`}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 flex-1">
              <History size={28} className="mb-2 opacity-30" />
              <p className="text-xs text-center font-medium opacity-70">
                No revision checkpoints found.<br/>Save a new version above!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
