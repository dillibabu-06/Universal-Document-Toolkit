import { useMemo, useState } from 'react';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function FolderTree() {
  const { files } = useWorkspaceStore();
  
  // Extract all unique directory paths
  const folders = useMemo(() => {
    const dirs = new Set<string>();
    files.forEach(f => {
      // Assuming path is absolute, like /Users/username/Docs/file.txt
      const lastSlashIndex = f.path.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        dirs.add(f.path.substring(0, lastSlashIndex));
      }
    });
    
    // Build a nested structure
    const root: any = { name: 'Workspace Root', path: '', children: {} };
    
    Array.from(dirs).sort().forEach(dirPath => {
      const parts = dirPath.split('/').filter(Boolean);
      let current = root;
      let currentPath = '';
      
      parts.forEach(part => {
        currentPath += '/' + part;
        if (!current.children[part]) {
          current.children[part] = { name: part, path: currentPath, children: {} };
        }
        current = current.children[part];
      });
    });
    
    return root;
  }, [files]);

  return (
    <div className="matte-panel overflow-y-auto h-full p-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 px-2">Folders</h3>
      <div className="space-y-1">
        <FolderNode node={folders} level={0} />
      </div>
    </div>
  );
}

function FolderNode({ node, level }: { node: any, level: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const children = Object.values(node.children);
  
  if (level === 0 && children.length === 0) {
    return <div className="text-xs text-zinc-500 px-2 italic">No folders found</div>;
  }
  
  // Skip root if it's just a wrapper
  if (level === 0) {
    return (
      <>
        {children.map((child: any) => (
          <FolderNode key={child.path} node={child} level={level + 1} />
        ))}
      </>
    );
  }

  return (
    <div>
      <div 
        className="flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-800/50 rounded-md cursor-pointer text-zinc-300 text-xs select-none"
        style={{ paddingLeft: `${(level - 1) * 12 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-4 flex items-center justify-center">
          {children.length > 0 ? (
            expanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />
          ) : (
            <div className="w-1" />
          )}
        </div>
        <Folder size={14} className="text-indigo-400/80" />
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child: any) => (
            <FolderNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
