import { FileRecord } from '../../types';
import { Tag, Calendar, Building, DollarSign, BrainCircuit, ScanText, Hash } from 'lucide-react';

interface MetadataInspectorProps {
  file: FileRecord | null;
  formatBytes: (bytes: number) => string;
  formatDate: (timestamp: number) => string;
}

export default function MetadataInspector({ file, formatBytes, formatDate }: MetadataInspectorProps) {
  if (!file) return null;

  let metadataObj: { fields: Record<string, string> } = { fields: {} };
  
  if (file.extracted_metadata) {
    try {
      metadataObj = JSON.parse(file.extracted_metadata);
    } catch (e) {
      console.error("Failed to parse extracted_metadata", e);
    }
  }

  const fields = metadataObj.fields || {};
  const hasIntelligence = Object.keys(fields).length > 0;

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
              {Object.keys(fields).length} Entities
            </span>
          )}
        </div>

        {hasIntelligence ? (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(fields).map(([k, v]) => renderIntelligenceChip(k, v))}
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
  );
}
