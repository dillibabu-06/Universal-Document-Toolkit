import { useState } from 'react';
import { Settings, Eye, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import PluginManager from './PluginManager';
import BackupRestore from './BackupRestore';

export default function SettingsView() {
  const [settingsTab, setSettingsTab] = useState('general');
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [settingsData, setSettingsData] = useState<any>({
    interface_mode: 'standard',
    theme: 'purple',
    enable_notifications: true,
    ocr_default_language: 'eng',
    ocr_engine: 'tesseract',
    ocr_layout_analysis: true
  });

  const handleSaveSettings = () => {
    setSettingsStatus({ type: 'info', text: 'Saving settings...' });
    setTimeout(() => {
      setSettingsStatus({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSettingsStatus(null), 3000);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Settings Center</h1>
          <p className="text-xs text-slate-400 mt-1">Manage local workspace rules, database indices, and OCR languages.</p>
        </div>
        <div className="flex items-center gap-3">
          {settingsStatus && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium animate-in slide-in-from-top duration-300 ${
              settingsStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              settingsStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}>
              <CheckCircle2 size={12} />
              {settingsStatus.text}
            </div>
          )}
          <Button 
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" value={settingsTab} onValueChange={setSettingsTab} className="flex flex-col md:flex-row gap-8 flex-1 items-start w-full">
        <TabsList className="md:w-64 flex-row md:flex-col justify-start h-auto bg-transparent border-0 p-0 gap-2 border-b md:border-b-0 md:border-r border-white/5 pr-0 md:pr-4 pb-4 md:pb-0">
          {[
            { id: 'general', name: 'General', icon: Settings },
            { id: 'ocr', name: 'OCR & Engine', icon: Eye },
            { id: 'search', name: 'Search Settings', icon: Search },
            { id: 'plugins', name: 'WASM Plugins', icon: Settings },
            { id: 'backup', name: 'Backup & Restore', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 data-[state=active]:border-indigo-500/20 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 shadow-none ring-offset-0"
              >
                <Icon size={14} /> {tab.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          <div className="bg-[#0f0f11]/60 border border-white/5 p-6 rounded-2xl space-y-6">
            <TabsContent value="general" className="mt-0 outline-none">
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Settings size={16} className="text-indigo-400" /> General Preferences
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Manage aesthetic layouts and interface configurations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Interface Layout</label>
                    <select 
                      value={settingsData.interface_mode}
                      onChange={e => setSettingsData({ ...settingsData, interface_mode: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none"
                    >
                      <option value="standard" className="bg-zinc-950">Standard Layout</option>
                      <option value="compact" className="bg-zinc-950">Compact Layout</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Color Accents</label>
                    <div className="flex gap-2.5 mt-1">
                      {['purple', 'blue', 'emerald', 'amber'].map(color => {
                        const colorMap: Record<string, string> = {
                          purple: 'bg-indigo-600 border-indigo-400',
                          blue: 'bg-blue-600 border-blue-400',
                          emerald: 'bg-emerald-600 border-emerald-400',
                          amber: 'bg-amber-600 border-amber-400'
                        };
                        const isSelected = settingsData.theme === color;
                        return (
                          <button
                            key={color}
                            onClick={() => setSettingsData({ ...settingsData, theme: color })}
                            className={`w-6 h-6 rounded-full border-2 transition-transform duration-300 hover:scale-110 ${colorMap[color]} ${
                              isSelected ? 'scale-115 ring-2 ring-white/20' : 'border-transparent opacity-60'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">System Notifications</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Alert when heavy background indexing OCR jobs complete.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsData({ ...settingsData, enable_notifications: !settingsData.enable_notifications })}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settingsData.enable_notifications ? 'bg-indigo-600' : 'bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          settingsData.enable_notifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ocr" className="mt-0 outline-none">
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Eye size={16} className="text-indigo-400" /> Optical Character Recognition
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tesseract language catalogs and scanning configurations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Default Scanning Language</label>
                    <select 
                      value={settingsData.ocr_default_language}
                      onChange={e => setSettingsData({ ...settingsData, ocr_default_language: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500/50 outline-none"
                    >
                      <option value="eng" className="bg-zinc-950">English (eng)</option>
                      <option value="fra" className="bg-zinc-950">French (fra)</option>
                      <option value="deu" className="bg-zinc-950">German (deu)</option>
                      <option value="spa" className="bg-zinc-950">Spanish (spa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Layout Preservation</label>
                    <button
                      type="button"
                      onClick={() => setSettingsData({ ...settingsData, ocr_layout_analysis: !settingsData.ocr_layout_analysis })}
                      className={`mt-1 relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settingsData.ocr_layout_analysis ? 'bg-indigo-600' : 'bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          settingsData.ocr_layout_analysis ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="search" className="mt-0 outline-none">
              {/* Empty for now to satisfy tabs implementation */}
            </TabsContent>

            <TabsContent value="plugins" className="mt-0 outline-none">
              <PluginManager />
            </TabsContent>

            <TabsContent value="backup" className="mt-0 outline-none">
              <BackupRestore />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
