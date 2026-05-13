import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Edit,
  Trash2,
  Database,
  Download,
  Layers,
  Fingerprint,
  Activity as ActivityIcon,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const CollectionList: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'title', 'price', 'category', '_status', 'updatedAt']);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const healthRes = await api.get('/health');
        const globals = healthRes.data.data?.globals || [];
        const collections = healthRes.data.data?.collections || [];
        
        const isGlobal = globals.some((g: any) => g.slug === slug);
        const colConfig = collections.find((c: any) => c.slug === slug);
        const isSingleton = colConfig?.singleton || isGlobal;

        if (isSingleton) {
          navigate(isGlobal ? `/globals/${slug}` : `/collections/${slug}/singleton`);
          return;
        }

        const res = await api.get(`/${slug}?page=${page}`);
        const items = res.data.data || [];
        setData(items);
        setTotal(res.data.meta?.pagination?.total || (items.length || 0));

        // Synthesize available columns
        if (items.length > 0) {
          const keys = Array.from(new Set(items.flatMap((item: any) => Object.keys(item))))
            .filter((k: any) => !k.startsWith('_') && k !== 'id' && k !== '__v') as string[];
          setAvailableColumns(keys);
        }
      } catch (err: any) {
        setError('SYNCHRONIZATION_FAILED');
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    if (slug) fetchData();
  }, [slug, page, navigate]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirm deletion?')) return;
    try {
      await api.delete(`/${slug}/${id}`);
      toast.success('Record purged');
      setData(data.filter(item => item._id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      toast.error('Purge failure');
    }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_')).join(',');
    const rows = data.map(item => {
      return Object.entries(item)
        .filter(([k]) => !k.startsWith('_'))
        .map(([, v]) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${slug}_export_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('CSV_EXPORT_COMPLETE');
  };

  const filteredData = data.filter(item => {
    const searchStr = searchQuery.toLowerCase();
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className={cn(
      "p-10 space-y-10 min-h-screen transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* 🏛️ Compact Header */}
      <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className={cn(
               "w-12 h-12 rounded-none flex items-center justify-center shadow-lg transition-all",
               theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
             )}>
                <Layers size={24} />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">REGISTRY_COLLECTION</span>
                   <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">{slug?.replace(/-/g, '_')}</h1>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <Link to={`/collections/${slug}/new`} className={cn(
               "px-8 py-4 rounded-none font-black text-[11px] uppercase tracking-widest shadow-xl transition-all italic leading-none flex items-center gap-3",
               theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600 text-white shadow-indigo-600/10"
             )}>
                <Plus size={16} strokeWidth={3} />
                Initialize_Record
             </Link>
          </div>
      </header>

      {/* 📊 High-Density Rail */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Units', value: total, icon: Database },
          { label: 'Registry ID', value: slug?.toUpperCase().slice(0, 8), icon: Fingerprint },
          { label: 'Status', value: 'OPTIMAL', icon: ActivityIcon },
          { label: 'Security', value: 'HARDENED', icon: ShieldCheck },
        ].map((stat) => (
          <div key={stat.label} className={cn(
            "border rounded-none p-6 flex flex-col transition-all",
            theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
               <stat.icon size={14} className="text-gray-500" />
               <span className="text-[8px] font-black uppercase text-indigo-500 tracking-[0.2em] italic">Operational</span>
            </div>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic leading-none mb-2">{stat.label}</span>
            <span className="text-3xl font-black italic tracking-tighter leading-none">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* 📋 Data Registry */}
      <div className={cn(
        "border rounded-none overflow-hidden shadow-sm backdrop-blur-3xl transition-all",
        theme === 'dark' ? "bg-[#080808]/80 border-white/5" : "bg-white border-gray-100"
      )}>
         <div className={cn(
           "px-6 py-4 border-b flex items-center justify-between",
           theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-gray-50/20"
         )}>
            <div className="relative w-full max-w-sm">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="NEURAL_SEARCH_KERNEL..." 
                  className={cn(
                    "w-full border rounded-none py-2.5 pl-10 pr-4 text-[9px] font-black italic focus:ring-4 transition-all outline-none uppercase tracking-widest",
                    theme === 'dark' ? "bg-black border-white/10 text-white focus:ring-indigo-500/20" : "bg-white border-gray-100 focus:ring-indigo-500/10"
                  )} 
               />
            </div>
            <div className="flex items-center gap-2 relative">
               <div className="flex items-center gap-2 mr-4">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">{filteredData.length} Matches</span>
               </div>
               <div className="relative">
                  <button 
                    onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                    className="p-2.5 border rounded-none text-gray-500 hover:text-indigo-500 transition-colors"
                  >
                    <Layers size={14} />
                  </button>
                  <AnimatePresence>
                    {columnMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={cn(
                          "absolute right-0 top-full mt-2 w-64 border rounded-none shadow-2xl z-50 p-4 backdrop-blur-3xl",
                          theme === 'dark' ? "bg-black/90 border-white/10" : "bg-white border-gray-100"
                        )}
                      >
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic mb-4 text-indigo-500">Column_Orchestration</h4>
                         <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                            {availableColumns.map(col => (
                              <button 
                                key={col}
                                onClick={() => {
                                  setVisibleColumns(prev => 
                                    prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                                  );
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-none hover:bg-white/5 transition-all group"
                              >
                                 <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-white">{col.replace(/_/g, ' ')}</span>
                                 <div className={cn(
                                   "w-3 h-3 rounded-none border transition-all",
                                   visibleColumns.includes(col) ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                                 )} />
                              </button>
                            ))}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
               <button 
                 onClick={exportCSV}
                 className="p-2.5 border rounded-none text-gray-500 hover:text-indigo-500 transition-colors"
               >
                 <Download size={14} />
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className={cn("border-b text-left text-[8px] font-black text-gray-500 uppercase tracking-[0.4em] italic", theme === 'dark' ? "border-white/5" : "border-gray-50")}>
                     <th className="px-6 py-4">Node_ID</th>
                     {availableColumns.filter(c => visibleColumns.includes(c)).map(col => (
                       <th key={col} className="px-6 py-4">{col.toUpperCase()}</th>
                     ))}
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-gray-50")}>
                  {loading ? (
                     <tr><td colSpan={visibleColumns.length + 2} className="py-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                  ) : filteredData.length === 0 ? (
                     <tr><td colSpan={visibleColumns.length + 2} className="py-20 text-center opacity-20 text-[9px] font-black uppercase italic tracking-[0.4em]">No_Records_Found</td></tr>
                  ) : filteredData.map((item) => (
                     <tr key={item._id} className="hover:bg-indigo-500/[0.02] transition-colors group cursor-pointer border-b border-white/[0.02]" onClick={() => navigate(`/collections/${slug}/${item._id}`)}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-none bg-indigo-500" />
                              <span className="text-[9px] font-black text-indigo-500 uppercase italic">#{item._id.slice(-6)}</span>
                           </div>
                        </td>
                        {availableColumns.filter(c => visibleColumns.includes(c)).map(col => (
                          <td key={col} className="px-6 py-4">
                             <span className={cn(
                               "text-[10px] font-black uppercase italic",
                               col === '_status' && item[col] === 'published' ? "text-emerald-400" : 
                               col === '_status' && item[col] === 'draft' ? "text-amber-400" : ""
                             )}>
                               {typeof item[col] === 'object' ? '[Complex_Object]' : String(item[col] || '—')}
                             </span>
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button className="p-2 rounded-none border hover:text-indigo-500"><Edit size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} className="p-2 rounded-none border hover:text-red-500"><Trash2 size={12} /></button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         <div className={cn(
           "p-4 border-t flex items-center justify-between text-[8px] font-black text-gray-500 uppercase italic",
           theme === 'dark' ? "border-white/5" : "border-gray-50"
         )}>
            <div className="flex items-center gap-2">
               <Fingerprint size={10} />
               <span>REG_0x{slug?.length}•STABLE</span>
            </div>
            <div className="flex items-center gap-3">
               <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 border rounded-none disabled:opacity-20"><ChevronLeft size={14} /></button>
               <span className={cn("px-3 py-1 rounded-none text-white", theme === 'dark' ? "bg-white/10" : "bg-gray-900")}>{page}</span>
               <button disabled={data.length < 10} onClick={() => setPage(page + 1)} className="p-1.5 border rounded-none disabled:opacity-20"><ChevronRight size={14} /></button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CollectionList;
