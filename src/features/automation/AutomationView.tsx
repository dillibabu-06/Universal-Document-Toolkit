
import { Plus, Sliders, CornerDownRight, Trash } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface AutomationViewProps {
  setIsRuleModalOpen: (open: boolean) => void;
}

export default function AutomationView({
  setIsRuleModalOpen
}: AutomationViewProps) {
  const {
    rules,
    deleteRule
  } = useWorkspaceStore();

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between select-none">
        <div>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Watcher Folder Automations</h3>
          <p className="text-xs text-zinc-400">Filesystem events trigger sequential actions based on active rule criteria.</p>
        </div>
        <button 
          onClick={() => setIsRuleModalOpen(true)}
          className="h-7.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors animate-all"
        >
          <Plus className="h-4 w-4" />
          <span>Configure Rule</span>
        </button>
      </div>

      {/* Rules Layout List */}
      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="matte-panel p-5 flex flex-col justify-between border border-border-dark">
            <div>
              <div className="flex items-center justify-between mb-4 select-none">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-zinc-200">{rule.name}</h4>
                </div>
                <span className="text-[9px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 rounded uppercase">
                  Active Watcher
                </span>
              </div>

              {/* Rule Steps linear layout (Zapier style) */}
              <div className="space-y-2.5 font-sans">
                {/* Step 1: Condition triggers */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-border-dark flex items-center justify-center font-bold text-[10px] text-zinc-400 shrink-0 select-none">IF</div>
                  <div className="flex-1 bg-zinc-950 p-3 rounded border border-border-dark/60">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1 select-none">Incoming file matches filters:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.conditions.extensions && rule.conditions.extensions.map(ext => (
                        <span key={ext} className="text-[10px] bg-zinc-900 border border-border-dark text-zinc-300 px-2 py-0.5 rounded font-mono">Ext is ".{ext}"</span>
                      ))}
                      {rule.conditions.filename_contains && (
                        <span className="text-[10px] bg-zinc-900 border border-border-dark text-zinc-300 px-2 py-0.5 rounded font-mono">Name contains: "{rule.conditions.filename_contains}"</span>
                      )}
                      {rule.conditions.content_contains && (
                        <span className="text-[10px] bg-zinc-900 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">Content has: "{rule.conditions.content_contains}"</span>
                      )}
                      {rule.conditions.regex_match && (
                        <span className="text-[10px] bg-zinc-900 border border-border-dark text-zinc-300 px-2 py-0.5 rounded font-mono">Regex: "{rule.conditions.regex_match}"</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connection arrow */}
                <div className="ml-4 h-3.5 border-l border-border-dark"></div>

                {/* Step 2: Consequent Actions */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-border-dark flex items-center justify-center font-bold text-[10px] text-zinc-400 shrink-0 select-none">THEN</div>
                  <div className="flex-1 bg-zinc-950 p-3 rounded border border-border-dark/60">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1 select-none">Execute operations sequentially:</span>
                    <div className="space-y-1">
                      {rule.actions.map((act, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-zinc-300 font-mono">
                          <CornerDownRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                          <span>
                            {act.type === 'Move' && `MOVE to `}
                            {act.type === 'Rename' && `RENAME to `}
                            {act.type === 'Tag' && `TAG file with `}
                            {act.type === 'Categorize' && `CATEGORIZE as `}
                            {act.type === 'Trash' && `MOVE to Trash`}
                            <span className="text-indigo-400 font-semibold break-all ml-1">
                              {act.type === 'Move' && act.payload.destination}
                              {act.type === 'Rename' && act.payload.pattern}
                              {act.type === 'Tag' && act.payload.tag_ids.join(', ')}
                              {act.type === 'Categorize' && act.payload.category}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between border-t border-border-dark mt-5 pt-4">
              <span className="text-[10px] text-zinc-500 font-medium select-none">Daemon watch event active on `{rule.trigger_event}` changes</span>
              <button 
                onClick={() => deleteRule(rule.id)}
                className="h-7 w-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 border border-border-dark/60 flex items-center justify-center transition-colors"
                title="Delete Rule"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="p-16 text-center text-zinc-600 text-xs matte-panel select-none">
            No automation rules configured yet. Create a rule to sort incoming invoices or tax PDFs instantly.
          </div>
        )}
      </div>

    </div>
  );
}
