import { Workspace, FileRecord, DuplicateCluster } from '../types';

let invoke: <T>(cmd: string, args?: Record<string, any>) => Promise<T>;

if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
  import('@tauri-apps/api/tauri').then(tauri => {
    invoke = tauri.invoke;
  });
} else {
  invoke = async <T>(cmd: string, args?: Record<string, any>): Promise<T> => {
    console.warn(`[Mock IPC] ${cmd}`, args);
    return {} as T;
  };
}

// typed command interfaces
export const ipcListWorkspaces = () => invoke<Workspace[]>('list_workspaces');
export const ipcCreateWorkspace = (name: string, description: string, path: string) => 
  invoke<Workspace>('create_workspace', { name, description, path });
export const ipcListFiles = (workspaceId: string, limit?: number, offset?: number) => 
  invoke<FileRecord[]>('list_files', { workspaceId, limit, offset });
export const ipcSearchFiles = (workspaceId: string, query: string) => 
  invoke<FileRecord[]>('search_files', { workspaceId, query });
export const ipcListDuplicates = (workspaceId: string) => 
  invoke<DuplicateCluster[]>('list_duplicates', { workspaceId });
export const ipcGetWorkspaceStats = (workspaceId: string) => 
  invoke<any>('get_workspace_stats', { workspaceId });
export const ipcTrashFile = (path: string) => 
  invoke<void>('trash_file', { path });
export const ipcOpenFileLocation = (path: string) => 
  invoke<void>('open_file_location', { path });
export const ipcSelectFolder = () => 
  invoke<string | null>('select_folder');
