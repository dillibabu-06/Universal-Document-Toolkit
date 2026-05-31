import { create } from 'zustand';
import { Workspace, FileRecord, DuplicateCluster, Rule, Tag, AutomationLog, IndexingStatus } from '../types';

// Safe Tauri IPC wrapper supporting fallback mock modes when loaded in web browsers
const runIPC = async <T>(cmd: string, args: Record<string, any> = {}): Promise<T> => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke<T>(cmd, args);
  } else {
    // Elegant Mocks for Browser-Only and Development Preview Environments
    console.warn(`Tauri is not loaded. Mocking response for command: ${cmd}`, args);
    switch (cmd) {
      case 'list_workspaces':
        return [
          {
            id: 'ws-finance',
            name: 'Finance & Tax Invoices',
            description: 'Monitors receipts and corporate taxation PDFs',
            paths: ['/Users/dillibabu/Downloads/finance'],
            indexing_settings: { excluded_extensions: [], excluded_paths: [], max_file_size: 10000 },
            created_at: Date.now(),
            updated_at: Date.now()
          },
          {
            id: 'ws-college',
            name: 'College Assignments',
            description: 'Monitors university lectures and class syllabus docx',
            paths: ['/Users/dillibabu/Documents/college'],
            indexing_settings: { excluded_extensions: [], excluded_paths: [], max_file_size: 10000 },
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ] as any;
      case 'search_files':
      case 'list_files':
        return [
          {
            id: '1',
            workspace_id: 'ws-finance',
            filename: 'invoice_2026_q1.pdf',
            extension: 'pdf',
            path: '/Users/dillibabu/Downloads/finance/invoice_2026_q1.pdf',
            size: 125432,
            hash: 'h-1',
            created_at: Date.now() - 500000,
            modified_at: Date.now() - 500000,
            indexed_at: Date.now(),
            category: 'Invoice'
          },
          {
            id: '2',
            workspace_id: 'ws-finance',
            filename: 'resume_dillibabu_se.pdf',
            extension: 'pdf',
            path: '/Users/dillibabu/Downloads/finance/resume_dillibabu_se.pdf',
            size: 98450,
            hash: 'h-2',
            created_at: Date.now() - 1000000,
            modified_at: Date.now() - 1000000,
            indexed_at: Date.now(),
            category: 'Resume'
          },
          {
            id: '3',
            workspace_id: 'ws-finance',
            filename: 'receipt_uber_delhi.jpg',
            extension: 'jpg',
            path: '/Users/dillibabu/Downloads/finance/receipt_uber_delhi.jpg',
            size: 512000,
            hash: 'h-3',
            created_at: Date.now() - 200000,
            modified_at: Date.now() - 200000,
            indexed_at: Date.now(),
            category: 'Receipt'
          }
        ] as any;
      case 'list_duplicates':
        return [
          {
            hash: 'duplicate-hash-1',
            file_count: 2,
            total_wasted_size: 125432,
            files: [
              {
                id: 'dup-1',
                workspace_id: 'ws-finance',
                filename: 'invoice_2026_q1.pdf',
                extension: 'pdf',
                path: '/Users/dillibabu/Downloads/finance/invoice_2026_q1.pdf',
                size: 125432,
                hash: 'duplicate-hash-1',
                created_at: Date.now(),
                modified_at: Date.now(),
                indexed_at: Date.now(),
                category: 'Invoice'
              },
              {
                id: 'dup-2',
                workspace_id: 'ws-finance',
                filename: 'invoice_2026_q1_copy.pdf',
                extension: 'pdf',
                path: '/Users/dillibabu/Downloads/finance/copies/invoice_2026_q1_copy.pdf',
                size: 125432,
                hash: 'duplicate-hash-1',
                created_at: Date.now(),
                modified_at: Date.now(),
                indexed_at: Date.now(),
                category: 'Invoice'
              }
            ]
          }
        ] as any;
      case 'list_rules':
        return [
          {
            id: 'rule-1',
            workspace_id: 'ws-finance',
            name: 'Sort PDFs to Finance',
            is_active: true,
            trigger_event: 'on_create',
            conditions: { extensions: ['pdf'], filename_contains: 'invoice' },
            actions: [{ type: 'Move', payload: { destination: '/Users/dillibabu/Downloads/finance/invoices' } }],
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ] as any;
      case 'list_automation_logs':
        return [
          {
            id: 'log-1',
            rule_id: 'rule-1',
            rule_name: 'Sort PDFs to Finance',
            file_path: '/Users/dillibabu/Downloads/finance/invoice_2026_q1.pdf',
            action_taken: 'Moved to /Users/dillibabu/Downloads/finance/invoices',
            timestamp: Date.now() - 30000,
            success: true
          }
        ] as any;
      case 'list_tags':
        return [
          { id: 'tag-1', name: 'Urgent', color: '#ef4444', created_at: Date.now() },
          { id: 'tag-2', name: 'Work', color: '#3b82f6', created_at: Date.now() }
        ] as any;
      case 'select_folder':
        return '/Users/dillibabu/Downloads/finance' as any;
      case 'trash_file':
        console.warn('Mock: trash_file - would move to trash:', args);
        return undefined as any;
      case 'open_file_location':
        console.warn('Mock: open_file_location - would reveal in Finder:', args);
        return undefined as any;
      case 'get_workspace_stats':
        return {
          total_files: 3,
          total_size: 735882,
          duplicate_clusters: 1,
          wasted_size: 125432,
          by_category: { Invoice: 1, Resume: 1, Receipt: 1 }
        } as any;
      default:
        return {} as T;
    }
  }
};

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  files: FileRecord[];
  searchResults: FileRecord[]; // FTS5 search-specific results for command palette
  duplicates: DuplicateCluster[];
  rules: Rule[];
  logs: AutomationLog[];
  tags: Tag[];
  indexingStatus: IndexingStatus;
  activeView: 'dashboard' | 'files' | 'duplicates' | 'rules' | 'logs' | 'ocr' | 'pdf' | 'office' | 'settings' | 'vault' | 'workflows';
  searchQuery: string; // Tracks last search query for command palette

  // Navigation & Base Actions
  setActiveView: (view: 'dashboard' | 'files' | 'duplicates' | 'rules' | 'logs' | 'ocr' | 'pdf' | 'office' | 'settings' | 'vault' | 'workflows') => void;
  setActiveWorkspace: (id: string | null) => void;
  init: () => Promise<void>;
  
  // Workspace Actions
  createWorkspace: (name: string, paths: string[], description?: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Scanning & Indexing
  startIndexing: () => Promise<void>;
  setIndexingStatus: (status: IndexingStatus) => void;
  
  // File search
  searchFiles: (query: string, append?: boolean, offset?: number) => Promise<void>;
  
  // File operations
  trashFile: (path: string) => Promise<boolean>;
  openFileLocation: (path: string) => Promise<void>;
  
  // Rules Actions
  createRule: (rule: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  // Tags Actions
  createTag: (name: string, color: string) => Promise<void>;

  // Folder Selector
  selectFolder: () => Promise<string | null>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  files: [],
  searchResults: [],
  duplicates: [],
  rules: [],
  logs: [],
  tags: [],
  indexingStatus: { type: 'Idle' },
  activeView: 'dashboard',
  searchQuery: '',

  setActiveView: (activeView) => set({ activeView }),
  
  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, indexingStatus: { type: 'Idle' } });
    if (id) {
      get().searchFiles('', false, 0);
      runIPC<DuplicateCluster[]>('list_duplicates', { workspaceId: id }).then(dups => set({ duplicates: dups }));
      runIPC<Rule[]>('list_rules', { workspaceId: id }).then(rules => set({ rules }));
      runIPC<AutomationLog[]>('list_automation_logs', { limit: 20 }).then(logs => set({ logs }));
    } else {
      set({ files: [], duplicates: [], rules: [] });
    }
  },

  init: async () => {
    try {
      const workspaces = await runIPC<Workspace[]>('list_workspaces');
      const tags = await runIPC<Tag[]>('list_tags');
      set({ workspaces, tags });
      if (workspaces.length > 0 && !get().activeWorkspaceId) {
        get().setActiveWorkspace(workspaces[0].id);
      }
    } catch (e) {
      console.error("Init store failed", e);
    }
  },

  createWorkspace: async (name, paths, description) => {
    try {
      const workspace = await runIPC<Workspace>('create_workspace', { name, paths, description });
      set(state => ({ workspaces: [...state.workspaces, workspace] }));
      get().setActiveWorkspace(workspace.id);
    } catch (e) {
      console.error("Create workspace failed", e);
    }
  },

  deleteWorkspace: async (id) => {
    try {
      await runIPC('delete_workspace', { id });
      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId
      }));
      const remaining = get().workspaces;
      if (remaining.length > 0) {
        get().setActiveWorkspace(remaining[0].id);
      }
    } catch (e) {
      console.error("Delete workspace failed", e);
    }
  },

  startIndexing: async () => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;

    set({ indexingStatus: { type: 'Scanning', current: 0, total: 0, current_file: 'Initializing scanner...' } });

    try {
      await runIPC('trigger_indexing', { workspaceId: activeId });
      
      // Setup dynamic progress event listener if running under Tauri runtime
      if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<any>('indexing-progress', (event) => {
          const status = event.payload;
          set({ indexingStatus: status });

          // Refresh documents and duplicates lists when scan completes
          if (status.type === 'Finished') {
            get().searchFiles('', false, 0);
            runIPC<DuplicateCluster[]>('list_duplicates', { workspaceId: activeId }).then(dups => set({ duplicates: dups }));
            unlisten();
          }
        });
      } else {
        // Fallback fake indexing ticker for browser testing
        setTimeout(() => {
          set({ indexingStatus: { type: 'Scanning', current: 5, total: 10, current_file: 'Extracting invoices...' } });
        }, 1500);
        setTimeout(() => {
          set({ indexingStatus: { type: 'Finished', files_indexed: 10 } });
          get().searchFiles('', false, 0);
        }, 3000);
      }
    } catch (e) {
      set({ indexingStatus: { type: 'Failed', payload: String(e) } });
    }
  },

  setIndexingStatus: (indexingStatus) => set({ indexingStatus }),

  searchFiles: async (query, append = false, offset = 0) => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;
    try {
      const limit = 100;
      const files = await runIPC<FileRecord[]>('search_files', { workspaceId: activeId, query, limit, offset });
      
      set(state => {
        const newFiles = append ? [...state.files, ...files] : files;
        if (query.trim().length > 0) {
          return { files: newFiles, searchResults: newFiles, searchQuery: query };
        } else {
          return { files: newFiles, searchResults: [], searchQuery: '' };
        }
      });
    } catch (e) {
      console.error("Search files failed", e);
    }
  },

  trashFile: async (path) => {
    try {
      await runIPC('trash_file', { path });
      // Remove from duplicates store after successful trash
      set(state => ({
        duplicates: state.duplicates.map(cluster => ({
          ...cluster,
          files: cluster.files.filter(f => f.path !== path)
        })).filter(cluster => cluster.files.length > 1)
      }));
      // Refresh file list
      get().searchFiles(get().searchQuery, false, 0);
      return true;
    } catch (e) {
      console.error("Trash file failed", e);
      return false;
    }
  },

  openFileLocation: async (path) => {
    try {
      await runIPC('open_file_location', { path });
    } catch (e) {
      console.error("Open file location failed", e);
    }
  },

  createRule: async (ruleData) => {
    const activeId = get().activeWorkspaceId;
    if (!activeId) return;
    try {
      const newRule: Rule = {
        ...ruleData,
        id: Math.random().toString(),
        created_at: Date.now(),
        updated_at: Date.now()
      };
      await runIPC('create_rule', { rule: newRule });
      set(state => ({ rules: [...state.rules, newRule] }));
    } catch (e) {
      console.error("Create rule failed", e);
    }
  },

  deleteRule: async (id) => {
    try {
      await runIPC('delete_rule', { id });
      set(state => ({ rules: state.rules.filter(r => r.id !== id) }));
    } catch (e) {
      console.error("Delete rule failed", e);
    }
  },

  createTag: async (name, color) => {
    try {
      const tag = await runIPC<Tag>('create_tag', { name, color });
      set(state => ({ tags: [...state.tags, tag] }));
    } catch (e) {
      console.error("Create tag failed", e);
    }
  },

  selectFolder: async () => {
    try {
      const selected = await runIPC<string | null>('select_folder');
      return selected;
    } catch (e) {
      console.error("Select folder failed", e);
      return null;
    }
  }
}));
