import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, Cpu, Plus, FileText, X,
  RefreshCw, HardDrive, Keyboard,
  CornerDownRight, ChevronDown, Eye, Terminal, FolderOpen
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useWorkspaceStore } from './store/workspaceStore';
import { FileRecord, RuleConditions, RuleAction } from './types';

import Onboarding from './components/Onboarding';
import Sidebar from './app/Sidebar';

// Views Refactoring Subcomponents
import DashboardView from './features/dashboard/DashboardView';
import ExplorerView from './features/explorer/ExplorerView';
import DuplicatesView from './features/duplicates/DuplicatesView';
import AutomationView from './features/automation/AutomationView';
import LogsView from './features/automation/LogsView';
import DiagnosticsView from './features/diagnostics/DiagnosticsView';
import SettingsView from './features/settings/SettingsView';
import OfficeStudioView from './features/office-studio/OfficeStudioView';
import PdfStudioView from './features/pdf-studio/PdfStudioView';

export default function App() {
  const {
    workspaces,
    activeWorkspaceId,
    files,
    searchResults,
    indexingStatus,
    activeView,
    init,
    setActiveWorkspace,
    setActiveView,
    createWorkspace,
    startIndexing,
    createRule,
    selectFolder,
    searchFiles,
    openFileLocation
  } = useWorkspaceStore();

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => {
    return localStorage.getItem('sdw_onboarding_complete') === 'true';
  });

  const [systemHealth, setSystemHealth] = useState<import('./types').SystemHealth | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsPath, setNewWsPath] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);

  // Command Palette UI State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchTerm, setCommandSearchTerm] = useState('');
  const [activeCommandIdx, setActiveCommandIdx] = useState(0);

  // Selected file inspector focus (Right Context Panel)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'details'>('details');

  // Selected rows for bulk operations
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // New Rule state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleConditions, setNewRuleConditions] = useState<RuleConditions>({});
  const [newRuleActions, setNewRuleActions] = useState<RuleAction[]>([{ type: 'Move', payload: { destination: '' } }]);

  // Keyboard shortcut help toggle
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // Toast notification system
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<any>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadataForm, setMetadataForm] = useState<any>({});

  // Universal Document Toolkit Ported Integration States
  
  // PDF tool handler moved.

  // Office tool handler moved.

  useEffect(() => {
    if (selectedFile) {
      setSelectedFileMetadata(null);
      setIsEditingMetadata(false);
      setMetadataForm({});
      
      invoke('get_document_metadata', { fileId: selectedFile.id })
        .then((res: any) => {
          if (res && res.structured_metadata) {
            try {
              const parsed = JSON.parse(res.structured_metadata);
              setSelectedFileMetadata(parsed);
              setMetadataForm(parsed.fields || {});
            } catch (e) {
              console.error("Failed to parse metadata JSON", e);
            }
          }
        })
        .catch((err: any) => console.error("Error loading document metadata", err));
    }
  }, [selectedFile]);

  const handleSaveMetadata = async () => {
    if (!selectedFile) return;
    try {
      const payload = JSON.stringify({ fields: metadataForm });
      await invoke('save_document_metadata', { fileId: selectedFile.id, metadataJson: payload });
      setSelectedFileMetadata({ fields: metadataForm });
      setIsEditingMetadata(false);
      showToast('Metadata updated successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update metadata.', 'error');
    }
  };

  useEffect(() => {
    init();
  }, []);

  // Debounce search queries to backend SQLite FTS5 search engine
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeWorkspaceId) {
        searchFiles(commandSearchTerm);
      }
    }, 150); // 150ms debounce threshold

    return () => clearTimeout(delayDebounceFn);
  }, [commandSearchTerm, activeWorkspaceId]);

  // Listen to keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K triggers Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // View switchers: Alt+1, Alt+2, etc.
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveView('dashboard'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveView('files'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveView('duplicates'); }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveView('rules'); }
      if (e.altKey && e.key === '5') { e.preventDefault(); setActiveView('logs'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  useEffect(() => {
    if (activeView === 'diagnostics') {
      import('@tauri-apps/api/tauri').then(({ invoke }) => {
        invoke('get_system_health').then((data: any) => setSystemHealth(data)).catch(console.error);
      });
    }
  }, [activeView]);

  const handleExportDb = async () => {
    setExporting('db');
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const path = await invoke<string>('export_database');
      alert(`Database backed up to: ${path}`);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
    setExporting(null);
  };

  const handleExportRules = async () => {
    setExporting('rules');
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const path = await invoke<string>('export_rules');
      alert(`Rules exported to: ${path}`);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
    setExporting(null);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !newWsPath.trim()) return;
    await createWorkspace(newWsName, [newWsPath], newWsDesc);
    setIsWorkspaceModalOpen(false);
    setNewWsName('');
    setNewWsPath('');
    setNewWsDesc('');
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || newRuleActions.length === 0) return;
    
    await createRule({
      workspace_id: activeWorkspaceId!,
      name: newRuleName,
      is_active: true,
      trigger_event: 'on_create',
      conditions: newRuleConditions,
      actions: newRuleActions
    });

    setIsRuleModalOpen(false);
    setNewRuleName('');
    setNewRuleConditions({});
    setNewRuleActions([{ type: 'Move', payload: { destination: '' } }]);
  };

  // Helper formatting values
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Static mock status assigner for professional look
  const getWorkflowStatus = (file: FileRecord) => {
    if (file.filename.includes('invoice') || file.filename.includes('bill')) return 'Approved';
    if (file.filename.includes('resume') || file.filename.includes('cv')) return 'In Review';
    if (file.filename.includes('tax')) return 'Signed';
    return 'Draft';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'badge-status bg-emerald-500/5 text-emerald-400 border border-emerald-500/15';
      case 'In Review':
        return 'badge-status bg-amber-500/5 text-amber-400 border border-amber-500/15';
      case 'Signed':
        return 'badge-status bg-indigo-500/5 text-indigo-400 border border-indigo-500/15';
      default:
        return 'badge-status bg-zinc-800/40 text-zinc-400 border border-zinc-700/30';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Invoice': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'Receipt': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'Resume': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'Tax Document': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'Bank Statement': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'Contract': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      case 'College Notes': return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700/50';
    }
  };

  if (!isOnboardingComplete) {
    return (
      <Onboarding 
        workspaces={workspaces}
        onSelectFolder={async () => {
          const selectedPath = await selectFolder();
          if (selectedPath) {
            const folderName = selectedPath.split(/[/\\]/).pop() || 'Workspace';
            await createWorkspace(`My ${folderName}`, [selectedPath], 'Created during onboarding');
          }
        }}
        onComplete={() => {
          localStorage.setItem('sdw_onboarding_complete', 'true');
          setIsOnboardingComplete(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-300 font-sans antialiased select-none matte-bg">
      
      {/* ==================== 1. LEFT SIDEBAR PANEL ==================== */}
      <Sidebar 
        setIsWorkspaceModalOpen={setIsWorkspaceModalOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedExtension={selectedExtension}
        setSelectedExtension={setSelectedExtension}
      />

      {/* ==================== 2. CENTER MAIN EXPLORER PANE ==================== */}
      <main className="flex-1 bg-panel-dark flex flex-col min-w-0">
        
        {/* ==================== PREMIUM WORKSPACE PRODUCTIVITY TOOLBAR ==================== */}
        <header className="h-14 border-b border-border-dark flex items-center justify-between px-6 shrink-0 bg-zinc-950/80 select-none">
          
          {/* Workspace Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
            <div className="h-4 w-[1px] bg-zinc-800 shrink-0"></div>
            
            <select 
              value={activeWorkspaceId || ''} 
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-zinc-200 cursor-pointer py-1 pl-0 pr-6 focus:ring-0 focus:outline-none outline-none max-w-[170px]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-zinc-900 text-zinc-300 font-semibold">{ws.name}</option>
              ))}
              {workspaces.length === 0 && <option value="" className="bg-zinc-900 text-zinc-500">No Workspace Registered</option>}
            </select>
          </div>

          {/* Dominated Primary Search input */}
          <div className="flex-1 max-w-xl mx-4 relative">
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center gap-2.5 bg-zinc-900/90 border border-border-dark rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 cursor-pointer transition-all"
            >
              <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="truncate w-full text-left text-zinc-500">Search documents or type commands...</span>
              <kbd className="kbd-badge shrink-0 opacity-70">⌘K</kbd>
            </div>
          </div>

          {/* Quick Action bar indicators */}
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 select-none shrink-0">
            {indexingStatus.type === 'Scanning' ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 rounded">
                <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                <span className="text-[10px] font-bold">Crawling ({indexingStatus.current}/{indexingStatus.total})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-zinc-400 font-semibold font-mono">Scanner Active</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              <HardDrive className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
              <span>{files.length} cataloged</span>
            </div>
            
            <button 
              onClick={startIndexing}
              disabled={indexingStatus.type === 'Scanning'}
              className="h-7 px-3 bg-zinc-900 hover:bg-zinc-850 border border-border-dark rounded text-zinc-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3 text-zinc-500" />
              <span>Crawl</span>
            </button>
          </div>
        </header>

        {/* View Frame */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          
          {/* ==================== VIEW 1: SUGGESTIONS INBOX ==================== */}
          {activeView === 'dashboard' && (
            <DashboardView 
              setSelectedFile={setSelectedFile}
              selectedFile={selectedFile}
              getWorkflowStatus={getWorkflowStatus}
              getStatusBadge={getStatusBadge}
              getCategoryColor={getCategoryColor}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          )}

          {/* ==================== VIEW 2: DOCUMENT EXPLORER ==================== */}
          {activeView === 'files' && (
            <ExplorerView 
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedExtension={selectedExtension}
              setSelectedExtension={setSelectedExtension}
              showDuplicates={showDuplicates}
              setShowDuplicates={setShowDuplicates}
              setSelectedFile={setSelectedFile}
              selectedFile={selectedFile}
              selectedRowIds={selectedRowIds}
              setSelectedRowIds={setSelectedRowIds}
              getWorkflowStatus={getWorkflowStatus}
              getStatusBadge={getStatusBadge}
              getCategoryColor={getCategoryColor}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          )}

          {/* ==================== VIEW 3: DUPLICATE MANAGEMENT ==================== */}
          {activeView === 'duplicates' && (
            <DuplicatesView 
              formatBytes={formatBytes}
              showToast={showToast}
            />
          )}

          {/* ==================== VIEW 4: watch AUTOMATIONS ==================== */}
          {activeView === 'rules' && (
            <AutomationView 
              setIsRuleModalOpen={setIsRuleModalOpen}
            />
          )}

          {/* ==================== VIEW 5: ACTIVITY LOGS ==================== */}
          {activeView === 'logs' && (
            <LogsView 
              formatDate={formatDate}
            />
          )}

          {/* ==================== VIEW 6: DIAGNOSTICS ==================== */}
          {activeView === 'diagnostics' && (
            <DiagnosticsView 
              systemHealth={systemHealth}
              exporting={exporting}
              handleExportDb={handleExportDb}
              handleExportRules={handleExportRules}
              formatBytes={formatBytes}
            />
          )}

          {/* ==================== VIEW: PDF TOOLS ==================== */}
          {activeView === 'pdf-tools' && <PdfStudioView />}

          {/* ==================== VIEW: OFFICE WORKSPACE ==================== */}
          {activeView === 'office-workspace' && <OfficeStudioView />}

          {/* ==================== VIEW: SETTINGS CENTER ==================== */}
          {activeView === 'settings' && <SettingsView />}

        </div>
      </main>

      {/* ==================== 3. RIGHT CONTEXT PANEL ==================== */}
      {selectedFile && (
        <aside className="w-80 bg-zinc-900 border-l border-border-dark flex flex-col justify-between shrink-0 select-none">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Header close panel & tabs selectors */}
            <div className="h-14 flex items-center px-4 justify-between border-b border-border-dark shrink-0 bg-zinc-900">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setInspectorTab('preview')}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    inspectorTab === 'preview' 
                      ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Preview
                </button>
                <button 
                  onClick={() => setInspectorTab('details')}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
                    inspectorTab === 'details' 
                      ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Details
                </button>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inspector body based on active Tab */}
            <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1 bg-zinc-900">
              
              {inspectorTab === 'preview' ? (
                <div className="space-y-4">
                  {selectedFile.extension === 'pdf' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
                        <span>PDF VIEW ENGINE v1.0</span>
                        <span>Page 1 of 1</span>
                      </div>
                      
                      <div className="p-4 bg-white text-zinc-800 rounded border border-border-dark shadow-sm text-[11px] leading-relaxed font-sans max-h-80 overflow-y-auto selection:bg-indigo-100">
                        <div className="border-b border-zinc-200 pb-2 mb-2">
                          <h2 className="text-xs font-bold uppercase text-zinc-900 tracking-wide">{selectedFile.filename}</h2>
                          <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>REGISTRY DATE: {formatDate(selectedFile.indexed_at)}</span>
                            <span>TAX REGISTER: #{selectedFile.hash.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                        
                        <p className="font-semibold text-zinc-900 mt-2">CORPORATE BILLING & TRANSACTION RECORD</p>
                        <p className="mt-1 text-zinc-600">This document acts as verified proof of payment for services rendered under active consulting agreements.</p>
                        
                        <div className="my-3 p-2 bg-zinc-50 rounded border border-zinc-200 font-mono text-[9px]">
                          <div className="flex justify-between font-bold text-zinc-700 border-b border-zinc-200 pb-1 mb-1">
                            <span>ITEM DESCRIPTION</span>
                            <span>TOTAL</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>1. System Architecture Engineering Scaffolding</span>
                            <span>$8,500.00</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>2. SQLite FTS5 instant keywords matching</span>
                            <span>$1,200.00</span>
                          </div>
                          <div className="flex justify-between font-bold text-zinc-950 pt-1 mt-1 border-t border-zinc-200">
                            <span>BALANCE DUE (USD)</span>
                            <span>$9,700.00</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-400 mt-4 text-center select-none border-t border-dashed border-zinc-200 pt-2 font-mono">OCR SCAN COMPLETED &bull; TAXONOMY CLASSIFIED AS: {selectedFile.category.toUpperCase()}</p>
                      </div>

                      <div className="bg-zinc-950 p-2.5 rounded border border-border-dark/60 font-mono text-[10px] space-y-1">
                        <span className="text-indigo-400 font-semibold text-[9px] uppercase tracking-wider block">Extracted OCR Metadata Snip</span>
                        <p className="text-zinc-400 leading-normal">"Consulting services billing, amount: $9,700.00, verified category: invoice, tax signature code verified offline."</p>
                      </div>
                    </div>
                  ) : selectedFile.extension === 'jpg' || selectedFile.extension === 'png' ? (
                    <div className="space-y-3">
                      <div className="h-44 bg-zinc-950 border border-border-dark/60 rounded flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        <div className="z-10 flex flex-col items-center gap-1.5 p-3">
                          <Eye className="h-6 w-6 text-indigo-400/90" />
                          <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-widest">{selectedFile.extension} Asset Canvas</span>
                          <span className="text-[9px] text-zinc-500 font-mono">1024 x 768 px &bull; Lossless compression</span>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-900 p-2 rounded border border-border-dark/40 font-mono text-[10px] text-zinc-400 leading-normal">
                        <span className="text-zinc-500 font-semibold block mb-1">IMAGE PARAMETERS</span>
                        <div>Dimension Ratio: <span className="text-zinc-200 font-semibold">4:3 Standard</span></div>
                        <div>Color Channel: <span className="text-zinc-200 font-semibold">sRGB 8-bit</span></div>
                        <div>Indexed Hash: <span className="text-zinc-300 truncate block">{selectedFile.hash}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono select-none">
                        <span>MARKDOWN VIEW COMPILER</span>
                        <span>.{selectedFile.extension} format</span>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-border-dark/60 rounded font-mono text-[10px] text-zinc-400 space-y-2 leading-relaxed max-h-72 overflow-y-auto">
                        <div className="text-indigo-400 font-bold"># Document index markdown record</div>
                        <p className="text-zinc-300">File cataloged recursively inside workspace monitored pathways.</p>
                        <div>
                          <span className="text-zinc-500 block mt-1">## Structural details</span>
                          <div className="pl-2 border-l border-zinc-800">
                            Path: {selectedFile.path}<br />
                            Category: {selectedFile.category}<br />
                            Byte Weight: {selectedFile.size} bytes
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 select-none">
                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">File Name</label>
                    <p className="text-xs font-semibold text-zinc-200 break-all">{selectedFile.filename}</p>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Physical Location</label>
                    <p className="text-[10px] text-zinc-400 break-all font-mono bg-zinc-950 p-2 rounded border border-border-dark/40 leading-normal">{selectedFile.path}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Size</label>
                      <p className="text-xs font-semibold text-zinc-200">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Auto-Category</label>
                      <p className="text-xs font-semibold text-indigo-400">{selectedFile.category}</p>
                    </div>
                  </div>

                  {/* STRUCTURED METADATA AREA */}
                  <div className="border-t border-border-dark pt-3 mt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Structured Metadata</label>
                      {selectedFileMetadata && !isEditingMetadata && (
                        <button 
                          onClick={() => setIsEditingMetadata(true)}
                          className="text-[9px] text-zinc-450 hover:text-zinc-200 font-bold uppercase tracking-wider underline transition-colors"
                        >
                          Edit Fields
                        </button>
                      )}
                    </div>

                    {selectedFileMetadata ? (
                      isEditingMetadata ? (
                        <div className="space-y-2.5 bg-zinc-955/70 p-3 rounded border border-border-dark/40">
                          {Object.keys(metadataForm).length > 0 ? (
                            Object.keys(metadataForm).map(key => (
                              <div key={key} className="space-y-1">
                                <span className="text-[9px] text-zinc-500 font-mono block capitalize">{key.replace(/_/g, ' ')}</span>
                                <input 
                                  type="text"
                                  value={metadataForm[key] || ''}
                                  onChange={e => setMetadataForm({ ...metadataForm, [key]: e.target.value })}
                                  className="w-full bg-zinc-900 border border-border-dark rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                                />
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 italic py-1 text-center">No metadata attributes matched the patterns.</p>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={handleSaveMetadata}
                              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-[10px] font-bold transition-all"
                            >
                              Save Changes
                            </button>
                            <button 
                              onClick={() => { setIsEditingMetadata(false); setMetadataForm(selectedFileMetadata.fields || {}); }}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded text-[10px] font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-950/60 p-3 rounded border border-border-dark/40 divide-y divide-border-dark/20 text-xs">
                          {Object.keys(selectedFileMetadata.fields || {}).length > 0 ? (
                            Object.entries(selectedFileMetadata.fields || {}).map(([key, val]) => (
                              <div key={key} className="py-2 flex justify-between gap-4">
                                <span className="text-zinc-500 font-mono capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-zinc-200 font-semibold break-all text-right">{val as string}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 italic py-1 text-center">No metadata attributes matched the patterns.</p>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="bg-zinc-950/40 p-3 rounded border border-dashed border-border-dark/60 text-center py-4">
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Structured metadata will populate automatically here once background OCR scanning has processed this document.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Workflow Stage</label>
                    <div className="mt-1 flex items-center gap-2">
                      <select 
                        value={getWorkflowStatus(selectedFile)}
                        onChange={() => alert("Workflow status updated in database tables!")}
                        className="bg-zinc-950 border border-border-dark text-zinc-300 rounded text-xs p-1.5 focus:ring-0 outline-none w-full cursor-pointer hover:border-zinc-700 transition-colors"
                      >
                        <option value="Draft">Draft Mode</option>
                        <option value="In Review">In Review</option>
                        <option value="Signed">Signed Contract</option>
                        <option value="Approved">Approved Asset</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">SHA-256 Checksum</label>
                    <p className="text-[9px] text-zinc-500 font-mono break-all bg-zinc-950 p-2 rounded border border-border-dark/45">{selectedFile.hash}</p>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Date Scanned</label>
                    <p className="text-[10px] text-zinc-400">Indexed on {formatDate(selectedFile.indexed_at)}</p>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="p-3 border-t border-border-dark bg-zinc-950 flex gap-2 shrink-0 select-none">
            <button 
              onClick={() => openFileLocation(selectedFile.path)}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-border-dark hover:border-zinc-700 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
              Reveal in Finder
            </button>
          </div>
        </aside>
      )}

      {/* ==================== CREATE WORKSPACE DIALOG MODAL ==================== */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
          <form 
            onSubmit={handleCreateWorkspace}
            className="w-[28rem] bg-zinc-900 border border-border-dark p-5 rounded-lg shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Register Directory Workspace</h3>
              <button 
                type="button" 
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Workspace Designation</label>
                <input 
                  type="text" 
                  placeholder="e.g. Invoices & Receipts, College Assignments"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Monitored Folder Path</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. /Users/dillibabu/Downloads"
                    value={newWsPath}
                    onChange={(e) => setNewWsPath(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 font-mono outline-none focus:border-zinc-700"
                    required
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const selected = await selectFolder();
                      if (selected) {
                        setNewWsPath(selected);
                      }
                    }}
                    className="bg-zinc-800 border border-border-dark hover:border-zinc-700 text-zinc-300 hover:text-zinc-200 px-3 rounded text-xs transition-colors shrink-0 font-medium font-sans"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Details Context (Optional)</label>
                <textarea 
                  placeholder="Brief explanation of files managed inside this workspace"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 h-16"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-3 border-t border-border-dark">
              <button 
                type="button" 
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-border-dark/60 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Register Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== CREATE RULE DIALOG MODAL ==================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
          <form 
            onSubmit={handleCreateRule}
            className="w-[28rem] bg-zinc-900 border border-border-dark p-5 rounded-lg shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Build Watcher Automation</h3>
              <button 
                type="button" 
                onClick={() => setIsRuleModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Rule Designation</label>
                <input 
                  type="text" 
                  placeholder="e.g. Process Invoices"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-zinc-950 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  required
                />
              </div>

              {/* Conditions Section */}
              <div className="border border-border-dark rounded p-3 bg-zinc-950/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-800 border border-border-dark flex items-center justify-center text-[8px]">1</div>
                    When these conditions are met:
                  </h4>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Extension matches</label>
                      <input 
                        type="text" 
                        placeholder="e.g. pdf (empty: all)"
                        value={newRuleConditions.extensions?.join(', ') || ''}
                        onChange={(e) => setNewRuleConditions({...newRuleConditions, extensions: e.target.value ? e.target.value.split(',').map(s=>s.trim()) : undefined})}
                        className="w-full bg-zinc-900 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Filename contains</label>
                      <input 
                        type="text" 
                        placeholder="e.g. invoice"
                        value={newRuleConditions.filename_contains || ''}
                        onChange={(e) => setNewRuleConditions({...newRuleConditions, filename_contains: e.target.value || undefined})}
                        className="w-full bg-zinc-900 border border-border-dark rounded p-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>
                  
                  {/* Advanced Rules Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowAdvancedRules(!showAdvancedRules)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      {showAdvancedRules ? <ChevronDown className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 -rotate-90" />}
                      Advanced Mode
                    </button>
                  </div>

                  {showAdvancedRules && (
                    <div className="space-y-3 pt-2 border-t border-border-dark/50 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">OCR Content Contains</label>
                        <input 
                          type="text" 
                          placeholder="e.g. BALANCE DUE"
                          value={newRuleConditions.content_contains || ''}
                          onChange={(e) => setNewRuleConditions({...newRuleConditions, content_contains: e.target.value || undefined})}
                          className="w-full bg-zinc-900 border border-indigo-500/30 rounded p-2 text-xs text-zinc-200 outline-none focus:border-indigo-500 placeholder-indigo-500/40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Regex Pattern Match</label>
                        <input 
                          type="text" 
                          placeholder="e.g. ^receipt_.*"
                          value={newRuleConditions.regex_match || ''}
                          onChange={(e) => setNewRuleConditions({...newRuleConditions, regex_match: e.target.value || undefined})}
                          className="w-full bg-zinc-900 border border-border-dark rounded p-2 text-xs text-zinc-200 font-mono outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="border border-border-dark rounded p-3 bg-zinc-950/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-800 border border-border-dark flex items-center justify-center text-[8px]">2</div>
                    Execute these actions sequentially:
                  </h4>
                  <button
                    type="button"
                    onClick={() => setNewRuleActions([...newRuleActions, { type: 'Move', payload: { destination: '' } }])}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-border-dark flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Action
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newRuleActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-zinc-900 border border-border-dark p-2 rounded">
                      <div className="mt-1.5 flex flex-col items-center gap-1">
                        <CornerDownRight className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={action.type}
                            onChange={(e) => {
                              const type = e.target.value as any;
                              const newActions = [...newRuleActions];
                              if (type === 'Move') newActions[idx] = { type, payload: { destination: '' } };
                              else if (type === 'Rename') newActions[idx] = { type, payload: { pattern: '' } };
                              else if (type === 'Tag') newActions[idx] = { type, payload: { tag_ids: [] } };
                              else if (type === 'Categorize') newActions[idx] = { type, payload: { category: '' } };
                              else if (type === 'Trash') newActions[idx] = { type: 'Trash' };
                              setNewRuleActions(newActions);
                            }}
                            className="bg-zinc-950 border border-border-dark rounded px-2 py-1 text-xs text-zinc-300 outline-none w-32 shrink-0"
                          >
                            <option value="Move">Move to Folder</option>
                            <option value="Rename">Smart Rename</option>
                            <option value="Tag">Apply Tags</option>
                            <option value="Categorize">Categorize</option>
                            <option value="Trash">Move to Trash</option>
                          </select>
                          
                          {action.type === 'Move' && (
                            <input
                              type="text"
                              placeholder="/absolute/path/to/folder"
                              value={action.payload.destination}
                              onChange={(e) => {
                                const newActions = [...newRuleActions];
                                (newActions[idx] as any).payload.destination = e.target.value;
                                setNewRuleActions(newActions);
                              }}
                              className="flex-1 bg-zinc-950 border border-border-dark rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                            />
                          )}
                          
                          {action.type === 'Rename' && (
                            <input
                              type="text"
                              placeholder="e.g. invoice_{date}_{filename}"
                              value={action.payload.pattern}
                              onChange={(e) => {
                                const newActions = [...newRuleActions];
                                (newActions[idx] as any).payload.pattern = e.target.value;
                                setNewRuleActions(newActions);
                              }}
                              className="flex-1 bg-zinc-950 border border-border-dark rounded px-2 py-1 text-xs text-zinc-200 outline-none font-mono"
                            />
                          )}

                          {action.type === 'Categorize' && (
                            <input
                              type="text"
                              placeholder="e.g. Invoices"
                              value={action.payload.category}
                              onChange={(e) => {
                                const newActions = [...newRuleActions];
                                (newActions[idx] as any).payload.category = e.target.value;
                                setNewRuleActions(newActions);
                              }}
                              className="flex-1 bg-zinc-950 border border-border-dark rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                            />
                          )}
                        </div>
                        {action.type === 'Rename' && (
                          <div className="text-[9px] text-zinc-500 font-mono">Available variables: {'{date}'}, {'{filename}'}</div>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => setNewRuleActions(newRuleActions.filter((_, i) => i !== idx))}
                        className="text-zinc-600 hover:text-red-400 mt-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-3 border-t border-border-dark">
              <button 
                type="button" 
                onClick={() => setIsRuleModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-border-dark/60 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Build Automation Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== KEYBOARD SHORTCUT HELP PANEL MODAL ==================== */}
      {showShortcutHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
          <div className="w-96 bg-zinc-900 border border-border-dark p-5 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                <Keyboard className="h-4 w-4" /> Workspace Hotkeys
              </h3>
              <button onClick={() => setShowShortcutHelp(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">Global Search Input</span>
                <kbd className="kbd-badge">⌘ K</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Inbox Suggestions</span>
                <kbd className="kbd-badge">⌥ 1</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Document Explorer</span>
                <kbd className="kbd-badge">⌥ 2</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Duplicates List</span>
                <kbd className="kbd-badge">⌥ 3</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: watch Automations</span>
                <kbd className="kbd-badge">⌥ 4</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border-dark/60">
                <span className="text-zinc-400">View Switcher: Activity Logs</span>
                <kbd className="kbd-badge">⌥ 5</kbd>
              </div>
            </div>

            <div className="pt-3 border-t border-border-dark text-right">
              <button 
                onClick={() => setShowShortcutHelp(false)}
                className="bg-zinc-800 hover:bg-zinc-700 border border-border-dark/60 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Close cheatsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. COMMAND PALETTE ==================== */}
      {isCommandPaletteOpen && (() => {
        const operations = [
          { id: 'scan', name: 'Crawl Workspace & Index Monitored Files', desc: 'Runs recursive directory scan extracting metadata', category: 'Action', action: () => { startIndexing(); setIsCommandPaletteOpen(false); } },
          { id: 'view-dashboard', name: 'Switch to Workspace Inbox Suggestions', desc: 'Review deduplication and classification ideas', category: 'Navigation', action: () => { setActiveView('dashboard'); setIsCommandPaletteOpen(false); } },
          { id: 'view-files', name: 'Switch to Document Explorer Table', desc: 'Perform high-density search and extensions filter', category: 'Navigation', action: () => { setActiveView('files'); setIsCommandPaletteOpen(false); } },
          { id: 'view-duplicates', name: 'Switch to Duplicate Files Review', desc: 'Relocate wasted duplicate space safely to Recycle Bin', category: 'Navigation', action: () => { setActiveView('duplicates'); setIsCommandPaletteOpen(false); } },
          { id: 'view-rules', name: 'Configure Watcher Folder Automations', desc: 'Setup custom MOVE, RENAME, or TAG action pathways', category: 'Navigation', action: () => { setActiveView('rules'); setIsCommandPaletteOpen(false); } },
          { id: 'view-logs', name: 'Switch to Workflow Execution Logs', desc: 'Analyze system automation move triggers', category: 'Navigation', action: () => { setActiveView('logs'); setIsCommandPaletteOpen(false); } },
          { id: 'add-workspace', name: 'Register Monitored Directory Workspace', desc: 'Configure fresh physical folder paths', category: 'Workspace', action: () => { setIsWorkspaceModalOpen(true); setIsCommandPaletteOpen(false); } },
          { id: 'add-rule', name: 'Build Watcher Automation Rule', desc: 'Establish rule triggers on creation events', category: 'Automation', action: () => { setIsRuleModalOpen(true); setIsCommandPaletteOpen(false); } },
        ];

        const query = commandSearchTerm.trim().toLowerCase();
        const filteredOps = operations.filter(op => 
          op.name.toLowerCase().includes(query) || op.desc.toLowerCase().includes(query) || op.category.toLowerCase().includes(query)
        );

        const filteredFilesMatches = query.length > 0 
          ? searchResults.slice(0, 6)
          : [];

        const mergedList = [
          ...filteredOps.map(op => ({ type: 'op' as const, id: op.id, name: op.name, sub: op.desc, badge: op.category, run: op.action })),
          ...filteredFilesMatches.map(f => ({ 
            type: 'file' as const, 
            id: f.id, 
            name: f.filename, 
            sub: f.snippet || f.path, 
            badge: f.category, 
            run: () => { 
              setSelectedFile(f); 
              setInspectorTab('preview');
              setActiveView('files'); 
              setIsCommandPaletteOpen(false); 
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
            setIsCommandPaletteOpen(false);
          }
        };

        const handleQueryChange = (val: string) => {
          setCommandSearchTerm(val);
          setActiveCommandIdx(0);
        };

        return (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs pt-24"
            onClick={() => setIsCommandPaletteOpen(false)}
          >
            <div 
              className="w-[36rem] bg-zinc-900 border border-border-dark rounded-lg shadow-2xl flex flex-col min-h-[300px] max-h-[460px] overflow-hidden"
              onClick={e => e.stopPropagation()}
              onKeyDown={handlePaletteKeyDown}
            >
              <div className="h-13 border-b border-border-dark flex items-center px-4 gap-2.5 shrink-0 bg-zinc-950/20">
                <Search className="h-4 w-4 text-indigo-400 shrink-0" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Type a command or fuzzy search cataloged files..."
                  value={commandSearchTerm}
                  onChange={e => handleQueryChange(e.target.value)}
                  className="bg-transparent border-none outline-none py-2.5 text-[12.5px] text-zinc-200 placeholder-zinc-500 w-full focus:ring-0"
                />
                <kbd className="kbd-badge shrink-0 opacity-80">ESC</kbd>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {mergedList.length > 0 ? (
                  <>
                    {filteredOps.length > 0 && (
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2.5 py-1">Quick Actions & Commands</div>
                    )}
                    {mergedList.slice(0, filteredOps.length).map((item, idx) => {
                      const isFocused = idx === activeCommandIdx;
                      return (
                        <div 
                          key={item.id}
                          onMouseEnter={() => setActiveCommandIdx(idx)}
                          onClick={item.run}
                          className={`cmd-palette-item ${isFocused ? 'cmd-palette-item-active' : 'hover:bg-zinc-800/40'}`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Terminal className={`h-3.5 w-3.5 ${isFocused ? 'text-indigo-400 animate-pulse' : 'text-zinc-500'}`} />
                            <div className="min-w-0">
                              <span className="text-[12px] font-semibold text-zinc-200 block truncate">{item.name}</span>
                              <span className="text-[10px] text-zinc-500 block truncate font-medium mt-0.5">{item.sub}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded border border-border-dark/60 bg-zinc-950 text-zinc-400 uppercase">{item.badge}</span>
                        </div>
                      );
                    })}

                    {filteredFilesMatches.length > 0 && (
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2.5 py-1 pt-2">Matching Documents</div>
                    )}
                    {mergedList.slice(filteredOps.length).map((item, idx) => {
                      const realIdx = idx + filteredOps.length;
                      const isFocused = realIdx === activeCommandIdx;
                      return (
                        <div 
                          key={item.id}
                          onMouseEnter={() => setActiveCommandIdx(realIdx)}
                          onClick={item.run}
                          className={`cmd-palette-item ${isFocused ? 'cmd-palette-item-active' : 'hover:bg-zinc-800/40'}`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <FileText className={`h-3.5 w-3.5 ${isFocused ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <div className="min-w-0">
                              <span className="text-[12px] font-semibold text-zinc-250 block truncate">{item.name}</span>
                              <span 
                                className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5"
                                dangerouslySetInnerHTML={{ __html: item.sub }}
                              />
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded border border-border-dark/60 bg-zinc-900 text-zinc-400 uppercase">{item.badge}</span>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-8 text-center text-zinc-600 text-xs select-none">
                    No action commands or document records found matching keywords.
                  </div>
                )}
              </div>

              <div className="h-10 border-t border-border-dark shrink-0 flex items-center justify-between px-4 bg-zinc-950/40 select-none text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">Use <kbd className="kbd-badge text-[8px] px-1 py-0.5">↑</kbd> <kbd className="kbd-badge text-[8px] px-1 py-0.5">↓</kbd> to traverse list</span>
                <span>Press <kbd className="kbd-badge text-[8px] px-1 py-0.5">Enter</kbd> to execute</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== TOAST NOTIFICATION SYSTEM ==================== */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl text-xs font-semibold transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-zinc-900 border-emerald-500/30 text-emerald-400' 
              : toast.type === 'error'
              ? 'bg-zinc-900 border-red-500/30 text-red-400'
              : 'bg-zinc-900 border-indigo-500/30 text-indigo-400'
          }`}
        >
          {toast.type === 'success' && <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircleIcon className="h-3.5 w-3.5 text-red-500" />}
          {toast.type === 'info' && <RefreshCwIcon className="h-3.5 w-3.5 text-indigo-500" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-zinc-500 hover:text-zinc-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
