import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Settings2, RefreshCw, CheckCircle2, Box, DownloadCloud } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

export default function PluginManager() {
  const [plugins, setPlugins] = useState<string[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('installed');

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await invoke<string[]>('list_installed_plugins');
      setPlugins(res || []);
      
      const marketRes = await invoke<any[]>('list_marketplace_plugins');
      setMarketplacePlugins(marketRes || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleInstall = async (id: string) => {
    setInstalling(id);
    try {
      await invoke('install_plugin_from_marketplace', { pluginId: id });
      await fetchPlugins();
    } catch (e) {
      console.error(e);
      alert(`Installation failed: ${e}`);
    }
    setInstalling(null);
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Settings2 size={16} className="text-indigo-400" /> WebAssembly Plugins
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Manage WASM plugins to securely extend the core intelligence functionality.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPlugins} disabled={loading} className="gap-2">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Reload Plugins
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-0 outline-none">
          {plugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-black/40 rounded-xl border border-white/5 border-dashed">
              <Box size={24} className="text-slate-500 mb-2 opacity-50" />
              <p className="text-xs text-slate-400 font-medium text-center">No plugins installed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plugins.map((plugin) => (
                <div key={plugin} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 transition-colors hover:border-indigo-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Box size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 tracking-wide">{plugin}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">Status: Loaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                      <CheckCircle2 size={10} /> ACTIVE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketplacePlugins.map((plugin) => {
              const isInstalled = plugins.some(p => p.includes(plugin.id));
              return (
                <div key={plugin.id} className="flex flex-col justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-200 mb-1">{plugin.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{plugin.description}</p>
                    <div className="text-[9px] text-slate-500 mt-2 font-mono">v{plugin.version} • {plugin.author}</div>
                  </div>
                  <Button 
                    variant={isInstalled ? 'outline' : 'primary'} 
                    size="sm" 
                    className="w-full text-xs"
                    disabled={isInstalled || installing === plugin.id}
                    onClick={() => handleInstall(plugin.id)}
                  >
                    {isInstalled ? (
                      <><CheckCircle2 size={12} className="mr-1.5" /> Installed</>
                    ) : installing === plugin.id ? (
                      <><RefreshCw size={12} className="mr-1.5 animate-spin" /> Installing...</>
                    ) : (
                      <><DownloadCloud size={12} className="mr-1.5" /> Install Plugin</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
