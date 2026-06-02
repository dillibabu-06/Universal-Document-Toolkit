import React, { useState } from 'react';
import { 
  Cpu, Plus, ChevronDown, Layers, Search, FileText, ShieldCheck, 
  Settings, FileSpreadsheet, PieChart, Clock, Image as ImageIcon
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  setIsWorkspaceModalOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

export default function Sidebar({
  setIsWorkspaceModalOpen,
  setIsCommandPaletteOpen,
}: SidebarProps) {
  const {
    activeView,
    setActiveView,
  } = useWorkspaceStore();

  const [sidebarGroups, setSidebarGroups] = useState({
    pinned: true,
    navigation: true,
  });

  const toggleGroup = (key: keyof typeof sidebarGroups) => {
    setSidebarGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-64 matte-sidebar flex flex-col justify-between shrink-0 select-none transition-all duration-300">
      <div className="flex flex-col min-h-0 flex-1">
        
        {/* Header Logo */}
        <div className="h-16 flex items-center px-5 justify-between border-b border-white/5 shrink-0 bg-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <Cpu className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-base font-bold font-display text-slate-100 tracking-wide truncate max-w-[130px]">SDW Core</span>
          </div>
          
          <button 
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="h-6 w-6 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 flex items-center justify-center transition-all hover:text-zinc-200"
            title="Register Monitored Folder"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 flex flex-col gap-5 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
          
          {/* Group 1: Navigation */}
          <div className="space-y-1">
            <div 
              onClick={() => toggleGroup('navigation')}
              className="flex items-center justify-between text-sidebar-label px-2 py-1.5 hover:text-slate-300 cursor-pointer mb-1"
            >
              <span>Workspace</span>
              <motion.div animate={{ rotate: sidebarGroups.navigation ? 0 : -90 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {sidebarGroups.navigation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  <NavButton 
                    icon={<Layers />} 
                    label="Inbox" 
                    isActive={activeView === 'dashboard'} 
                    onClick={() => setActiveView('dashboard')} 
                    shortcut="⌥1"
                  />
                  <NavButton 
                    icon={<Search />} 
                    label="Explorer" 
                    isActive={activeView === 'explorer'} 
                    onClick={() => setActiveView('explorer')} 
                    shortcut="⌥2"
                  />
                  <NavButton 
                    icon={<FileText />} 
                    label="PDF Studio" 
                    isActive={activeView === 'pdf'} 
                    onClick={() => setActiveView('pdf')} 
                    shortcut="⌥3"
                  />
                  <NavButton 
                    icon={<FileSpreadsheet />} 
                    label="Office Studio" 
                    isActive={activeView === 'office'} 
                    onClick={() => setActiveView('office')} 
                    shortcut="⌥4"
                  />
                  <NavButton 
                    icon={<ImageIcon />} 
                    label="Media Center" 
                    isActive={activeView === 'media'} 
                    onClick={() => setActiveView('media')} 
                    shortcut="⌥5"
                  />
                  <NavButton 
                    icon={<ShieldCheck />} 
                    label="Security Vault" 
                    isActive={activeView === 'vault'} 
                    onClick={() => setActiveView('vault')} 
                    shortcut="⌥6"
                  />
                  <NavButton 
                    icon={<Clock />} 
                    label="Timeline" 
                    isActive={activeView === 'timeline'} 
                    onClick={() => setActiveView('timeline')} 
                    shortcut="⌥7"
                  />
                  <NavButton 
                    icon={<PieChart />} 
                    label="Reporting Center" 
                    isActive={activeView === 'reporting'} 
                    onClick={() => setActiveView('reporting')} 
                    shortcut="⌥8"
                  />
                  <NavButton 
                    icon={<Settings className="h-4 w-4" />} 
                    label="Settings" 
                    isActive={activeView === 'settings'} 
                    onClick={() => setActiveView('settings')} 
                    shortcut="⌥9"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>



        </nav>
      </div>

      {/* Footer Meta indicators */}
      <div className="p-4 border-t border-white/5 bg-black/40 flex flex-col gap-3 shrink-0 select-none">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-300 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <span>Quick Find</span>
          <kbd className="ml-auto text-[9px] font-mono text-zinc-500 bg-black/50 px-1.5 py-0.5 rounded border border-white/5 shadow-inner opacity-80">⌘K</kbd>
        </button>
      </div>
    </aside>
  );
}

function NavButton({ icon, label, isActive, onClick, shortcut, badge }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, shortcut?: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sidebar-item group relative overflow-hidden ${
        isActive 
          ? 'bg-accent/15 text-indigo-200 font-semibold shadow-inner' 
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
      }`}
    >
      {isActive && (
        <motion.div layoutId="navIndicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r-full" />
      )}
      <div className={`[&>svg]:h-4 [&>svg]:w-4 ${isActive ? '[&>svg]:text-indigo-400' : '[&>svg]:text-zinc-500 group-hover:[&>svg]:text-zinc-400'}`}>
        {icon}
      </div>
      <span>{label}</span>
      {badge !== undefined && (
        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-1 border border-indigo-500/20 shadow-sm">
          {badge}
        </span>
      )}
      {shortcut && (
        <kbd className="ml-auto text-[9px] font-mono text-zinc-600 bg-transparent px-1 rounded opacity-60 group-hover:opacity-100 transition-opacity">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
