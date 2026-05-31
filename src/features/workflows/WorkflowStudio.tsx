import { useState } from 'react';
import { Node } from '@xyflow/react';
import { Network, Plus, Save } from 'lucide-react';
import WorkflowSidebar from './WorkflowSidebar';
import WorkflowCanvas from './WorkflowCanvas';
import WorkflowInspector from './WorkflowInspector';
import { Button } from '../../components/ui/Button';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function WorkflowStudio() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  if (!activeWorkspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 h-full">
        <p className="text-slate-400">Please select a workspace first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Network className="text-indigo-400" size={18} />
          </div>
          <div>
            <h1 className="font-semibold text-slate-100">Visual Workflow Studio</h1>
            <p className="text-xs text-slate-400">Design automated pipelines for your documents</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs h-8">
            <Plus size={14} className="mr-2" />
            New Workflow
          </Button>
          <Button variant="primary" className="text-xs h-8">
            <Save size={14} className="mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Node Library) */}
        <WorkflowSidebar />

        {/* Center Canvas */}
        <WorkflowCanvas onNodeSelect={setSelectedNode} />

        {/* Right Sidebar (Inspector) */}
        <WorkflowInspector selectedNode={selectedNode} />
      </div>
    </div>
  );
}
