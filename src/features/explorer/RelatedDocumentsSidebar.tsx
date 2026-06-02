import { useEffect, useState } from 'react';
import { 
  Link2, Trash2, Plus, Sparkles, RefreshCw, FileText
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileRecord } from '../../types';

interface RelatedDocumentsSidebarProps {
  selectedFile: FileRecord;
}

export default function RelatedDocumentsSidebar({ selectedFile }: RelatedDocumentsSidebarProps) {
  const { 
    relatedDocs, 
    recommendations, 
    loadRelatedDocs, 
    loadRecommendations, 
    addRelationship, 
    deleteRelationship 
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(false);
  const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
  const [relType, setRelType] = useState('Supporting');

  // Load related documents and AI recommendations upon selected file activation
  useEffect(() => {
    if (selectedFile) {
      setLoading(true);
      Promise.all([
        loadRelatedDocs(selectedFile.id),
        loadRecommendations(selectedFile.id)
      ]).finally(() => setLoading(false));
    }
  }, [selectedFile, selectedFile.id]);

  const handleAddLink = async (targetId: string) => {
    try {
      await addRelationship(selectedFile.id, targetId, relType);
      setLinkingFileId(null);
      // Reload lists
      loadRelatedDocs(selectedFile.id);
      loadRecommendations(selectedFile.id);
    } catch (e) {
      console.error(e);
      alert("Failed to establish document relationship link.");
    }
  };

  const handleDeleteLink = async (relationshipId: string) => {
    if (confirm("Are you sure you want to break this document relationship?")) {
      await deleteRelationship(relationshipId);
      loadRelatedDocs(selectedFile.id);
      loadRecommendations(selectedFile.id);
    }
  };

  const getReasoning = (rec: FileRecord) => {
    if (rec.category === selectedFile.category) {
      return "Matching Document Class";
    }
    const timeDiff = Math.abs(rec.created_at - selectedFile.created_at);
    if (timeDiff <= 172800) {
      return "Temporal Index Proximity (48h)";
    }
    return "Entity/Filename Token Match";
  };

  return (
    <div className="space-y-5 select-none text-zinc-300 font-sans">
      
      {/* 1. CURRENTLY CONNECTED GRAPH EDGES */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Connected Documents ({relatedDocs.length})</label>
          {loading && <RefreshCw className="h-3 w-3 text-indigo-400 animate-spin" />}
        </div>

        <div className="space-y-2">
          {relatedDocs.map(([rel, doc]) => (
            <div 
              key={rel.id} 
              className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded border border-border-dark/30 hover:border-zinc-800 transition-all gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded flex items-center justify-center shrink-0">
                  <Link2 size={12} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-zinc-200 truncate leading-none mb-1" title={doc.filename}>{doc.filename}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-extrabold uppercase font-mono px-1 border border-zinc-800 bg-zinc-900 text-zinc-550 rounded">{doc.category}</span>
                    <span className="text-[8px] font-bold text-indigo-400 font-mono">Linked as: {rel.relationship_type}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleDeleteLink(rel.id)}
                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors shrink-0"
                title="Break Relationship Link"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {relatedDocs.length === 0 && (
            <p className="text-[10px] text-zinc-550 italic text-center py-2 bg-zinc-950/30 border border-dashed border-zinc-900 rounded">
              No active relationship links established for this document.
            </p>
          )}
        </div>
      </div>

      {/* 2. AUTOMATED SUGGESTIONS / AI RECOMMENDATIONS */}
      <div className="space-y-3 pt-2 border-t border-border-dark/60">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <label className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wider block">Relational Recommendations</label>
        </div>

        <div className="space-y-2">
          {recommendations.map(rec => {
            const isLinking = linkingFileId === rec.id;
            return (
              <div 
                key={rec.id} 
                className="p-2.5 bg-zinc-950/40 rounded border border-zinc-900 hover:border-zinc-800 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-zinc-550 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-350 truncate leading-tight mb-1" title={rec.filename}>{rec.filename}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-extrabold uppercase font-mono px-1 border border-zinc-850 bg-zinc-900/60 text-zinc-550 rounded">{rec.category}</span>
                        <span className="text-[8px] text-amber-500 font-medium font-mono">Heuristics: {getReasoning(rec)}</span>
                      </div>
                    </div>
                  </div>

                  {!isLinking && (
                    <button
                      onClick={() => setLinkingFileId(rec.id)}
                      className="h-6 w-6 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all shrink-0"
                      title="Link to Document"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {isLinking && (
                  <div className="flex items-center gap-2 pt-1 border-t border-dashed border-zinc-900/60 animate-fadeIn">
                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 rounded px-1.5 py-1 focus:ring-0 outline-none cursor-pointer"
                    >
                      <option value="Supporting">Supporting Doc</option>
                      <option value="Invoice">Related Invoice</option>
                      <option value="Receipt">Payment Receipt</option>
                      <option value="Contract">Target Contract</option>
                      <option value="Statement">Bank Statement</option>
                    </select>

                    <button
                      onClick={() => handleAddLink(rec.id)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-[10px] font-bold transition-all shrink-0"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setLinkingFileId(null)}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-450 rounded text-[10px] font-bold transition-all shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {recommendations.length === 0 && (
            <p className="text-[10px] text-zinc-550 italic text-center py-2 bg-zinc-950/20 border border-dashed border-zinc-900/60 rounded">
              No recommended document matches found in this workspace.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
