import React from 'react';
import { Folder, FilePlus, Clock, Play, FileSearch, Tag, ShieldCheck, PenSquare, Trash2, ArrowRight } from 'lucide-react';

export default function WorkflowSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const NodeItem = ({ type, label, icon: Icon, color }: { type: string, label: string, icon: any, color: string }) => (
    <div
      className={`flex items-center gap-3 p-3 mb-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-grab transition-colors`}
      onDragStart={(event) => onDragStart(event, type, label)}
      draggable
    >
      <div className={`p-2 rounded-md ${color} bg-opacity-20`}>
        <Icon size={16} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </div>
  );

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Node Library</h2>
        <p className="text-xs text-slate-400 mt-1">Drag nodes to canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Triggers</h3>
          <NodeItem type="trigger_folder" label="Folder Watch" icon={Folder} color="bg-blue-500" />
          <NodeItem type="trigger_new_file" label="New File" icon={FilePlus} color="bg-indigo-500" />
          <NodeItem type="trigger_schedule" label="Schedule" icon={Clock} color="bg-violet-500" />
          <NodeItem type="trigger_manual" label="Manual Run" icon={Play} color="bg-emerald-500" />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Processing</h3>
          <NodeItem type="action_ocr" label="OCR Scan" icon={FileSearch} color="bg-amber-500" />
          <NodeItem type="action_extract_vendor" label="Extract Vendor" icon={Tag} color="bg-orange-500" />
          <NodeItem type="action_pdf_analysis" label="PDF Analysis" icon={FileSearch} color="bg-rose-500" />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
          <NodeItem type="action_rename" label="Rename File" icon={PenSquare} color="bg-cyan-500" />
          <NodeItem type="action_move" label="Move File" icon={ArrowRight} color="bg-teal-500" />
          <NodeItem type="action_vault" label="Add To Vault" icon={ShieldCheck} color="bg-emerald-500" />
          <NodeItem type="action_trash" label="Trash File" icon={Trash2} color="bg-red-500" />
        </div>
      </div>
    </div>
  );
}
