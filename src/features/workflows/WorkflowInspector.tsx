import { Node } from '@xyflow/react';

interface WorkflowInspectorProps {
  selectedNode: Node | null;
}

export default function WorkflowInspector({ selectedNode }: WorkflowInspectorProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col h-full">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Inspector</h2>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-slate-500">
          <p className="text-sm">Select a node on the canvas to configure its settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Configure Node</h2>
        <p className="text-xs text-slate-400 mt-1">{selectedNode.data.label as string}</p>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Node ID</label>
          <input 
            type="text" 
            value={selectedNode.id} 
            disabled 
            className="w-full bg-slate-800 border border-slate-700 rounded-md py-1 px-2 text-sm text-slate-500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Label</label>
          <input 
            type="text" 
            defaultValue={selectedNode.data.label as string} 
            className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Dynamic configuration based on node type would go here */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">Parameters</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Property 1</label>
              <input 
                type="text" 
                placeholder="Enter value..."
                className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
