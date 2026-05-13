import { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Settings, 
  Trash2, 
  ExternalLink,
  Plus,
  Zap,
  Search,
  Box,
  Loader2,
  RefreshCw,
  Cpu,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface PluginData {
  id?: string;
  name: string;
  author?: string;
  enabled?: boolean;
  version?: string;
  description?: string;
  status?: string;
  type?: string;
  verified?: boolean;
  icon?: React.ReactNode;
}

const PluginsPage = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [loading, setLoading] = useState(true);
  const [plugins, setPlugins] = useState<PluginData[]>([]);

  const fetchPlugins = async () => {
    setTimeout(() => setLoading(true), 0);
    try {
      const res = await api.get('/system/plugins');
      const realPlugins = res.data.data || [];
      setPlugins(realPlugins.map((p: PluginData) => ({
        ...p,
        id: p.name.toLowerCase().replace(/\s+/g, '-'),
        status: p.enabled ? 'active' : 'inactive',
        type: p.author === 'ROOT_KERNEL' || p.author === 'ZENITH_CORE' ? 'core' : 'third-party',
        verified: p.author === 'ROOT_KERNEL' || p.author === 'ZENITH_CORE',
        icon: <Puzzle size={20} className="text-indigo-500" />
      })));
    } catch {
      console.error('Failed to fetch plugins');
      toast.error('Failed to load plugins');
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  };

  const togglePlugin = async (id: string, currentStatus: string) => {
    try {
      const newEnabled = currentStatus === 'inactive';
      await api.post(`/system/plugins/${id}/${newEnabled ? 'enable' : 'disable'}`);
      toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}`);
      fetchPlugins();
    } catch {
      toast.error('Failed to toggle plugin status');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchPlugins();
    }, 0);
  }, []);

  const filteredPlugins = plugins.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className={cn("h-screen w-full flex flex-col items-center justify-center gap-8 transition-colors duration-500", theme === 'dark' ? "bg-black" : "bg-[#fafafa]")}>
        <Loader2 size={32} className="animate-spin text-indigo-500" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">Syncing plugins...</p>
     </div>
  );

  return (
    <div className={cn(
      "p-6 space-y-8 min-h-screen transition-colors duration-500 relative",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* 🏛️ Compact Header */}
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-5">
            <div className={cn(
              "w-12 h-12 rounded-none flex items-center justify-center shadow-lg transition-all",
              theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
            )}>
               <Puzzle size={24} />
            </div>
            <div className="flex flex-col">
               <div className="flex items-center gap-3 mb-1">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">System Extensions</span>
                  <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
               </div>
               <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Plugins</h1>
            </div>
         </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "p-1 rounded-none border flex items-center shadow-sm backdrop-blur-xl",
              theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100"
            )}>
                {['Installed', 'Marketplace'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase() as 'installed' | 'marketplace')}
                    className={cn(
                      "px-6 py-2 text-[9px] font-black uppercase tracking-widest rounded-none transition-all italic leading-none",
                      activeTab === tab.toLowerCase() 
                        ? (theme === 'dark' ? "bg-white text-black shadow-lg" : "bg-gray-900 text-white shadow-lg") 
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab}
                  </button>
               ))}
            </div>
            <button onClick={fetchPlugins} className={cn(
              "w-12 h-12 border rounded-none flex items-center justify-center transition-all",
              theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400" : "bg-white border-gray-100 text-gray-400"
            )}>
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
         </div>
      </header>

      {/* 📋 Registry Matrix */}
      <div className="flex flex-col gap-6">
         <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div className={cn(
              "flex items-center gap-4 px-5 py-2.5 rounded-none border shadow-inner w-full max-w-sm transition-all group",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"
            )}>
               <Search size={14} className="text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                  type="text" 
                  placeholder="Search plugins..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] font-black italic text-gray-400 w-full placeholder:text-gray-600 uppercase tracking-tight"
               />
            </div>
            
            <button 
              onClick={() => {
                const name = prompt('Enter plugin package name:');
                if (name) {
                  toast.promise(
                    api.post('/system/plugins/inject', { name }),
                    {
                      loading: 'Injecting package...',
                      success: 'Package injected successfully',
                      error: 'Injection failed'
                    }
                  ).then(() => fetchPlugins());
                }
              }}
              className={cn(
                "px-8 py-3 rounded-none text-[9px] font-black uppercase tracking-[0.2em] shadow-lg transition-all italic leading-none flex items-center gap-3 active:scale-95",
                theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10"
              )}
            >
               <Plus size={14} strokeWidth={3} />
               Inject Plugin
            </button>
         </div>

         {filteredPlugins.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-20">
               <Box size={40} strokeWidth={1} />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">No plugins found</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
               {filteredPlugins.map(plugin => (
                  <motion.div 
                     key={plugin.id}
                     className={cn(
                       "border rounded-none p-5 shadow-sm hover:shadow-xl transition-all flex flex-col gap-5 relative group backdrop-blur-xl",
                       theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100"
                     )}
                  >
                     <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-12 h-12 rounded-none flex items-center justify-center shadow-inner transition-all duration-500 overflow-hidden relative",
                             theme === 'dark' ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-100"
                           )}>
                              {plugin.icon}
                           </div>
                           <div className="flex flex-col">
                              <h3 className="text-sm font-black tracking-tight uppercase italic leading-none group-hover:text-indigo-500 transition-colors">{plugin.name}</h3>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic mt-1.5">{plugin.author === 'ROOT_KERNEL' ? 'Zenith Core' : (plugin.author || 'Third Party')} • v{plugin.version || '1.0.0'}</span>
                           </div>
                        </div>
                        <div className={cn(
                          "px-4 py-1.5 rounded-none text-[9px] font-black uppercase italic border shadow-inner transition-all flex items-center gap-2",
                          plugin.status === 'active' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        )}>
                           {plugin.status === 'active' ? 'ENABLED' : 'DISABLED'}
                        </div>
                     </div>

                     <p className="text-[11px] text-gray-400 font-bold leading-relaxed italic line-clamp-2">{plugin.description || 'Core modular component providing essential system functionality.'}</p>

                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <button 
                              onClick={() => togglePlugin(plugin.id, plugin.status)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all italic leading-none border",
                                plugin.status === 'active'
                                  ? "bg-red-500/5 border-red-500/10 text-red-500 hover:bg-red-500/10"
                                  : "bg-emerald-500 border-emerald-600 text-white hover:brightness-110 shadow-lg shadow-emerald-500/20"
                              )}
                           >
                              {plugin.status === 'active' ? <Box size={12} /> : <Zap size={12} />}
                              {plugin.status === 'active' ? 'Disable' : 'Enable'}
                           </button>
                           <button 
                              onClick={() => toast.success(`Configuration for ${plugin.name} (v${plugin.version}) loaded.`)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all italic leading-none border",
                                theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20" : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                              )}
                           >
                              <Settings size={12} />
                              Configure
                           </button>
                           <button 
                              onClick={() => toast.error('Core Protection: Built-in plugins cannot be removed.')}
                              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                           >
                              <Trash2 size={12} />
                           </button>
                        </div>
                        <div className="flex items-center gap-3">
                           {plugin.verified ? (
                             <div className="flex items-center gap-1.5 text-emerald-500">
                                <ShieldCheck size={12} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-tighter italic">Verified Core</span>
                             </div>
                           ) : (
                             <div className="flex items-center gap-1.5 text-indigo-500">
                                <Activity size={12} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-tighter italic">Community</span>
                             </div>
                           )}
                           <div className={cn("w-px h-3", theme === 'dark' ? "bg-white/10" : "bg-gray-100")} />
                           <ExternalLink size={12} className="text-gray-500" />
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         )}
      </div>

      {/* 📊 High-Density Status Rail */}
       <footer className={cn(
         "h-10 border rounded-none flex items-center px-6 justify-between text-[8px] font-black tracking-[0.3em] uppercase italic transition-colors backdrop-blur-xl",
         theme === 'dark' ? "bg-white/[0.02] border-white/5 text-gray-500" : "bg-white border-gray-100 text-gray-400"
       )}>
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span>Status: Online</span>
             </div>
             <div className={cn("flex items-center gap-2 border-l pl-8", theme === 'dark' ? "border-white/10" : "border-gray-100")}>
                <Cpu size={10} className="text-indigo-500" />
                <span>Active Plugins: {plugins.length}</span>
             </div>
          </div>
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
                <Activity size={10} className="text-indigo-500" />
                <span>System Status: Optimal</span>
             </div>
          </div>
       </footer>
    </div>
  );
};

export default PluginsPage;
