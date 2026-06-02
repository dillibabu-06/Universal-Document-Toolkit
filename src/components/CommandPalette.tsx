import React, { useState, useEffect } from 'react';
import { Search, Terminal, FileText } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { FileRecord } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  startIndexing: () => void;
  setActiveView: (view: 'dashboard' | 'explorer' | 'pdf' | 'office' | 'settings' | 'vault' | 'timeline' | 'reporting') => void;
  setIsWorkspaceModalOpen: (open: boolean) => void;
  setSelectedFile: (file: FileRecord | null) => void;
  setInspectorTab: (tab: 'preview' | 'details') => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  startIndexing,
  setActiveView,
  setIsWorkspaceModalOpen,
  setSelectedFile,
  setInspectorTab
}: CommandPaletteProps) {
  const [commandSearchTerm, setCommandSearchTerm] = useState('');
  const [activeCommandIdx, setActiveCommandIdx] = useState(0);
  const { searchResults, searchFiles } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setCommandSearchTerm('');
      setActiveCommandIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via parent state? The parent handles this listener currently.
          // We will leave the opening logic to App.tsx.
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Debounced file search
  useEffect(() => {
    if (commandSearchTerm.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        searchFiles(commandSearchTerm);
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [commandSearchTerm, searchFiles]);

  if (!isOpen) return null;

  const groupedOperations = [
    {
      group: 'WORKSPACES',
      items: [
        { id: 'view-dashboard', name: 'Workspace Inbox', desc: 'Review deduplication and classification ideas', category: 'Navigation', action: () => { setActiveView('dashboard'); onClose(); } },
        { id: 'view-explorer', name: 'Document Explorer', desc: 'Perform high-density search and extensions filter', category: 'Navigation', action: () => { setActiveView('explorer'); onClose(); } },
        { id: 'add-workspace', name: 'Register Monitored Directory', desc: 'Configure fresh physical folder paths', category: 'Workspace', action: () => { setIsWorkspaceModalOpen(true); onClose(); } },
      ]
    },
    {
      group: 'TOOLS',
      items: [
        { id: 'view-pdf-studio', name: 'PDF Studio', desc: 'Merge, split, watermark, compress and rotate PDFs', category: 'Navigation', action: () => { setActiveView('pdf'); onClose(); } },
        { id: 'view-office-studio', name: 'Office Studio', desc: 'Excel previews, CSV import, document generation', category: 'Navigation', action: () => { setActiveView('office'); onClose(); } },

      ]
    },
    {
      group: 'ACTIONS',
      items: [
        { id: 'scan', name: 'Crawl Workspace', desc: 'Runs recursive directory scan extracting metadata', category: 'Action', action: () => { startIndexing(); onClose(); } },
        { id: 'view-reporting', name: 'Reporting Center', desc: 'Review analytics and duplicate files', category: 'Navigation', action: () => { setActiveView('reporting'); onClose(); } },
      ]
    },
    {
      group: 'SETTINGS',
      items: [
        { id: 'view-settings', name: 'Preferences', desc: 'Manage application preferences and settings', category: 'Navigation', action: () => { setActiveView('settings'); onClose(); } },
        { id: 'view-vault', name: 'Security Vault', desc: 'Access encrypted document storage', category: 'Navigation', action: () => { setActiveView('vault'); onClose(); } },
      ]
    }
  ];

  const query = commandSearchTerm.trim().toLowerCase();
  
  const filteredGroups = groupedOperations.map(g => ({
    group: g.group,
    items: g.items.filter(op => 
      op.name.toLowerCase().includes(query) || op.desc.toLowerCase().includes(query) || op.category.toLowerCase().includes(query)
    )
  })).filter(g => g.items.length > 0);

  const flatOps = filteredGroups.flatMap(g => g.items);

  const filteredFilesMatches = query.length > 0 ? searchResults.slice(0, 6) : [];

  const mergedList = [
    ...flatOps.map(op => ({ type: 'op' as const, id: op.id, name: op.name, sub: op.desc, badge: op.category, run: op.action })),
    ...filteredFilesMatches.map(f => ({ 
      type: 'file' as const, 
      id: f.id, 
      name: f.filename, 
      sub: f.snippet || f.path, 
      badge: f.category, 
      run: () => { 
        setSelectedFile(f); 
        setInspectorTab('preview');
        setActiveView('explorer'); 
        onClose(); 
      } 
    }))
  ];

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveCommandIdx(prev => (prev + 1) % Math.max(mergedList.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCommandIdx(prev => (prev - 1 + mergedList.length) % Math.max(mergedList.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mergedList[activeCommandIdx]) {
        mergedList[activeCommandIdx].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs pt-24"
      onClick={onClose}
    >
      <div 
        className="w-[42rem] bg-zinc-900 border border-border-dark rounded-lg shadow-2xl flex flex-col min-h-[300px] max-h-[500px] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handlePaletteKeyDown}
      >
        <div className="h-14 border-b border-border-dark flex items-center px-4 gap-3 shrink-0 bg-zinc-950/20">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input 
            autoFocus
            type="text" 
            placeholder="Type a command or fuzzy search cataloged files (e.g. 'invoices over $500')..."
            value={commandSearchTerm}
            onChange={e => {
              setCommandSearchTerm(e.target.value);
              setActiveCommandIdx(0);
            }}
            className="bg-transparent border-none outline-none py-2.5 text-[14px] text-zinc-200 placeholder-zinc-500 w-full focus:ring-0"
          />
          <kbd className="kbd-badge shrink-0 opacity-80 bg-zinc-800 text-[10px] px-2 py-1 rounded">ESC</kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {query.length > 0 && (query.includes('invoice') || query.includes('over $') || query.includes('under $') || query.includes('>')) && (
            <div className="flex items-center gap-2 px-3 py-1 mb-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Smart Filters Detected:</span>
              {(query.includes('invoice') || query.includes('receipt')) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">Category: Invoice</span>
              )}
              {(query.includes('resume') || query.includes('cv')) && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">Category: Resume</span>
              )}
              {(query.includes('contract') || query.includes('agreement')) && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">Category: Contract</span>
              )}
              {(query.includes('over $') || query.includes('>')) && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">Condition: Amount Greater</span>
              )}
            </div>
          )}

          {mergedList.length > 0 ? (
            <>
              {filteredGroups.map(group => {
                return (
                  <div key={group.group} className="mb-2">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-3 py-1.5">{group.group}</div>
                    {group.items.map((item) => {
                      const idx = flatOps.findIndex(op => op.id === item.id);
                      const isFocused = idx === activeCommandIdx;
                      return (
                        <div 
                          key={item.id}
                          onMouseEnter={() => setActiveCommandIdx(idx)}
                          onClick={item.action}
                          className={`cmd-palette-item flex items-center justify-between p-2 rounded cursor-pointer ${isFocused ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-zinc-800/40 border-l-2 border-transparent'}`}
                        >
                          <div className="min-w-0 flex items-center gap-3 ml-2">
                            <Terminal className={`h-4 w-4 ${isFocused ? 'text-indigo-400 animate-pulse' : 'text-zinc-500'}`} />
                            <div className="min-w-0">
                              <span className="text-[13px] font-semibold text-zinc-200 block truncate">{item.name}</span>
                              <span className="text-[11px] text-zinc-500 block truncate font-medium">{item.desc}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {filteredFilesMatches.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-3 py-1.5 border-t border-border-dark/50 mt-2 pt-3">Matching Documents</div>
                  {filteredFilesMatches.map((f, i) => {
                    const realIdx = flatOps.length + i;
                    const isFocused = realIdx === activeCommandIdx;
                    return (
                      <div 
                        key={f.id}
                        onMouseEnter={() => setActiveCommandIdx(realIdx)}
                        onClick={() => {
                          setSelectedFile(f); 
                          setInspectorTab('preview');
                          setActiveView('explorer'); 
                          onClose();
                        }}
                        className={`cmd-palette-item flex items-center justify-between p-2 rounded cursor-pointer ${isFocused ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-zinc-800/40 border-l-2 border-transparent'}`}
                      >
                        <div className="min-w-0 flex items-center gap-3 ml-2">
                          <FileText className={`h-4 w-4 ${isFocused ? 'text-indigo-400' : 'text-zinc-500'}`} />
                          <div className="min-w-0">
                            <span className="text-[13px] font-semibold text-zinc-200 block truncate">{f.filename}</span>
                            <span 
                              className="text-[11px] text-zinc-500 block truncate font-mono"
                              dangerouslySetInnerHTML={{ __html: f.snippet || f.path }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-sm flex flex-col items-center justify-center">
              <Search className="h-8 w-8 text-zinc-700 mb-3" />
              No commands or files found matching "{commandSearchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
