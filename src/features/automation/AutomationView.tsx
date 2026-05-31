import { useState } from 'react';
import { Plus, Sliders, Trash, FileText, ArrowDown, MoveRight, Tags, HardDrive, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

interface AutomationViewProps {
  setIsRuleModalOpen: (open: boolean) => void;
}

export default function AutomationView({
  setIsRuleModalOpen
}: AutomationViewProps) {
  const { rules, deleteRule } = useWorkspaceStore();
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(rules[0]?.id || null);

  const selectedRule = rules.find(r => r.id === selectedRuleId);

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 animate-in fade-in duration-200">
      
      {/* 1. Left Sidebar - Categories/Filters */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-2">Library</h3>
        <button className="flex items-center gap-3 px-3 py-2 bg-indigo-500/10 text-indigo-400 rounded-md text-sm font-semibold border border-indigo-500/20">
          <RefreshCw className="h-4 w-4" />
          Active Watchers
          <span className="ml-auto text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded">{rules.length}</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:bg-zinc-800/40 rounded-md text-sm font-medium transition-colors">
          <HardDrive className="h-4 w-4" />
          System Rules
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:bg-zinc-800/40 rounded-md text-sm font-medium transition-colors">
          <Trash className="h-4 w-4" />
          Trash Policies
        </button>
      </div>

      {/* 2. Middle Column - Rule List */}
      <div className="w-80 flex flex-col bg-zinc-900/50 rounded-xl border border-border-dark overflow-hidden shrink-0">
        <div className="p-4 border-b border-border-dark flex items-center justify-between bg-zinc-950/30">
          <h3 className="text-sm font-bold text-zinc-200">Automations</h3>
          <Button 
            size="sm"
            onClick={() => setIsRuleModalOpen(true)}
            className="h-7 px-2 text-[11px]"
          >
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rules.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs mt-10">
              No automations created.
            </div>
          ) : (
            rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRuleId === rule.id ? 'bg-indigo-500/10 border-indigo-500/30 shadow-sm' : 'border-transparent hover:bg-zinc-800/40'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-2 w-2 rounded-full ${selectedRuleId === rule.id ? 'bg-indigo-400' : 'bg-emerald-500'}`} />
                  <span className={`text-sm font-bold truncate ${selectedRuleId === rule.id ? 'text-indigo-300' : 'text-zinc-200'}`}>{rule.name}</span>
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-2 ml-4">
                  <span>{rule.actions.length} Actions</span>
                  <span>•</span>
                  <span>{rule.trigger_event}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 3. Right Column - Details / Visual Builder */}
      <div className="flex-1 flex flex-col bg-zinc-900/30 rounded-xl border border-border-dark overflow-hidden relative">
        {!selectedRule ? (
          <EmptyState 
            icon={<Sliders className="h-8 w-8" />}
            title="No Automation Selected"
            description="Select a rule from the list to view its workflow graph."
          />
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border-dark bg-zinc-950/20 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  {selectedRule.name}
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Active</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Triggers automatically on <b>{selectedRule.trigger_event}</b> events.</p>
              </div>
              <Button 
                variant="outline" 
                className="text-red-400 hover:bg-red-500/10 border-red-500/20"
                onClick={() => deleteRule(selectedRule.id)}
              >
                <Trash className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>

            {/* Visual Node Graph */}
            <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-dots">
              
              {/* TRIGGER NODE */}
              <div className="w-80 bg-zinc-950 border-2 border-indigo-500/30 rounded-xl p-4 shadow-xl relative z-10 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 border-b border-border-dark/50 pb-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Trigger</div>
                    <div className="text-sm font-semibold text-zinc-200">Incoming Document</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                  {selectedRule.conditions.extensions && selectedRule.conditions.extensions.map(ext => (
                    <div key={ext} className="flex items-center gap-2"><span className="text-zinc-500">Ext is</span> <span className="bg-zinc-800 px-1.5 py-0.5 rounded">.{ext}</span></div>
                  ))}
                  {selectedRule.conditions.filename_contains && (
                    <div className="flex items-center gap-2"><span className="text-zinc-500">Name has</span> <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{selectedRule.conditions.filename_contains}</span></div>
                  )}
                  {selectedRule.conditions.content_contains && (
                    <div className="flex items-center gap-2"><span className="text-zinc-500">Content has</span> <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{selectedRule.conditions.content_contains}</span></div>
                  )}
                </div>
              </div>

              {/* ARROW */}
              <div className="h-10 w-0.5 bg-indigo-500/30 relative z-0 animate-in slide-in-from-top-4 duration-500">
                <ArrowDown className="absolute -bottom-3 -left-[11px] h-6 w-6 text-indigo-500/50" />
              </div>
              <div className="h-4" />

              {/* ACTION NODES */}
              {selectedRule.actions.map((act, idx) => (
                <div key={idx} className="flex flex-col items-center relative animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${(idx+1) * 150}ms`, animationFillMode: 'both' }}>
                  
                  <div className="w-80 bg-zinc-950 border border-border-dark rounded-xl p-4 shadow-xl relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                        {act.type === 'Move' && <MoveRight className="h-5 w-5 text-emerald-400" />}
                        {act.type === 'Rename' && <FileText className="h-5 w-5 text-amber-400" />}
                        {act.type === 'Tag' && <Tags className="h-5 w-5 text-cyan-400" />}
                        {act.type === 'Trash' && <Trash className="h-5 w-5 text-red-400" />}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action {idx + 1}</div>
                        <div className="text-sm font-semibold text-zinc-200">
                          {act.type === 'Move' && `Move to folder`}
                          {act.type === 'Rename' && `Rename file`}
                          {act.type === 'Tag' && `Apply Tags`}
                          {act.type === 'Trash' && `Move to Trash`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border-dark/50 text-xs font-mono text-zinc-400 bg-zinc-900/50 p-2 rounded break-all">
                      {act.type === 'Move' && act.payload.destination}
                      {act.type === 'Rename' && act.payload.pattern}
                      {act.type === 'Tag' && act.payload.tag_ids.join(', ')}
                    </div>
                  </div>
                  
                  {idx < selectedRule.actions.length - 1 && (
                    <>
                      <div className="h-10 w-0.5 bg-border-dark relative z-0">
                        <ArrowDown className="absolute -bottom-3 -left-[11px] h-6 w-6 text-border-dark" />
                      </div>
                      <div className="h-4" />
                    </>
                  )}
                </div>
              ))}
              
              <div className="h-20" />

            </div>
          </>
        )}
      </div>
    </div>
  );
}
