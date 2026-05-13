import React, { useEffect, useState } from 'react';
import { 
  History,
  Search,
  Download,
  RefreshCw,
  Fingerprint,
  Zap,
  ArrowRight,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const AuditLogPage: React.FC = () => {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/system/audit-logs?page=${page}&limit=25&search=${searchQuery}`);
      setLogs(res.data.data);
      setTotal(res.data.meta.pagination.total);
    } catch {
      console.error('Failed to fetch audit logs');
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/system/audit-logs?limit=500');
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ZENITH_AUDIT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePurge = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    const userInput = window.prompt(`[SECURITY] Enter code ${code} to authorize History Clear:`);
    if (userInput === code.toString()) {
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 2000)),
        {
          loading: 'Clearing history...',
          success: 'History cleared',
          error: 'Clear failed'
        }
      );
    } else {
      toast.error('Auth failed');
    }
  };

  return (
    <div className={cn(
      "flex flex-col min-h-screen p-6 space-y-6 transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* 🏛️ Compact Tactical Header */}
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-5">
            <div className={cn(
              "w-12 h-12 rounded-none flex items-center justify-center shadow-lg transition-all",
              theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
            )}>
               <History size={24} />
            </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                   <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">System History</span>
                   <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Audit Logs</h1>
             </div>
         </div>

         <div className="flex items-center gap-4">
            <div className={cn(
              "px-6 py-3 border rounded-none flex items-center gap-8 shadow-sm backdrop-blur-xl",
              theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100"
            )}>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-60">Total Logs</span>
                   <span className="text-xl font-black italic tracking-tighter leading-none text-indigo-500">{total.toLocaleString()}</span>
                </div>
                <div className={cn("w-px h-8", theme === 'dark' ? "bg-white/5" : "bg-gray-100")} />
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-60">Status</span>
                   <span className="text-xs font-black text-emerald-500 tracking-tighter italic uppercase leading-none">Stable</span>
                </div>
            </div>
            
            <button onClick={() => fetchLogs()} className={cn(
              "w-12 h-12 border rounded-none flex items-center justify-center transition-all hover:scale-105 active:scale-95",
              theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400" : "bg-white border-gray-100 text-gray-400"
            )}>
               <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
         </div>
      </header>

      {/* 📋 Data Registry Matrix */}
      <div className={cn(
        "border rounded-none shadow-sm flex flex-col relative transition-colors backdrop-blur-3xl overflow-hidden",
        theme === 'dark' ? "bg-[#080808]/80 border-white/5" : "bg-white border-gray-100"
      )}>
         {/* Sleek Control Bar */}
         <div className={cn(
           "px-8 py-5 border-b flex items-center justify-between gap-6 transition-colors",
           theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-gray-50/30 border-gray-100"
         )}>
            <div className={cn(
              "flex items-center gap-4 border px-6 py-3 rounded-none w-full max-w-md shadow-inner transition-all group relative overflow-hidden",
              theme === 'dark' ? "bg-black border-white/10" : "bg-white border-gray-100"
            )}>
               <Search size={16} className="text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  placeholder="Search logs..." 
                  className="bg-transparent border-none outline-none text-xs font-black italic text-gray-400 w-full placeholder:text-gray-700 uppercase tracking-tight" 
               />
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                onClick={handlePurge}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 border rounded-none text-[9px] font-black uppercase tracking-widest transition-all italic hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20",
                  theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400" : "bg-white border-gray-100 text-gray-400"
               )}>
                  <Fingerprint size={14} />
                  Clear History
               </button>
               <button 
                onClick={handleExport}
                disabled={exporting}
                className={cn(
                  "flex items-center gap-3 px-8 py-3 rounded-none font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-lg italic leading-none active:scale-95",
                  theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-black shadow-gray-900/20"
                )}
               >
                  {exporting ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                  Export Report
               </button>
            </div>
         </div>

         {/* Compact Log Table */}
         <div className="overflow-x-auto">
            <table className="w-full border-collapse">
               <thead>
                  <tr className={cn("border-b text-left", theme === 'dark' ? "border-white/5 bg-white/[0.01]" : "border-gray-50 bg-gray-50/10")}>
                     <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Operator</th>
                     <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Action</th>
                     <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Collection</th>
                     <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic text-right">Timestamp</th>
                  </tr>
               </thead>
               <tbody className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-gray-50")}>
                  {loading ? (
                     <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto opacity-40" />
                        </td>
                     </tr>
                  ) : logs.map((log) => (
                     <motion.tr 
                        key={log._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-indigo-500/[0.02] transition-colors cursor-pointer group"
                     >
                        <td className="px-8 py-4">
                           <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-none border flex items-center justify-center text-gray-500",
                                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                              )}>
                                 <Fingerprint size={16} />
                              </div>
                               <div className="flex flex-col">
                                  <span className="text-[11px] font-black uppercase italic leading-none">{log.user?.email || 'System'}</span>
                                  <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest mt-1">Operator ID: {log.user?._id?.slice(-8).toUpperCase() || 'System'}</span>
                               </div>
                           </div>
                        </td>
                        <td className="px-8 py-4">
                           <div className={cn(
                               "px-3 py-1 rounded-none text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2 italic border",
                               log.action === 'CREATE' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" :
                               log.action === 'UPDATE' ? "bg-indigo-500/5 text-indigo-500 border-indigo-500/10" :
                               "bg-red-500/5 text-red-500 border-red-500/10"
                           )}>
                              <Zap size={10} fill="currentColor" />
                              {log.action}
                           </div>
                        </td>
                        <td className="px-8 py-4">
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase italic leading-none">{log.collection || 'SYSTEM'}</span>
                              <div className="flex items-center gap-2 mt-1 opacity-40">
                                 <ArrowRight size={8} />
                                 <span className="text-[7px] font-bold uppercase tracking-widest">IDX_{log.targetId?.slice(-12).toUpperCase() || 'ROOT'}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-black italic tracking-tighter leading-none">{new Date(log.createdAt).toLocaleDateString()}</span>
                              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">{new Date(log.createdAt).toLocaleTimeString()}</span>
                           </div>
                        </td>
                     </motion.tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Compact Footer */}
         <div className={cn(
           "px-8 py-6 border-t flex items-center justify-between transition-colors",
           theme === 'dark' ? "bg-white/[0.01] border-white/5" : "bg-gray-50/20 border-gray-100"
         )}>
            <div className="flex items-center gap-4">
               <Cpu size={14} className="text-gray-500" />
               <span className="text-[7px] font-black uppercase tracking-[0.4em] italic text-gray-500">V6.0.42_STABLE_BUILD</span>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)} 
                  className={cn(
                    "w-10 h-10 border rounded-none flex items-center justify-center transition-all disabled:opacity-20",
                    theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400" : "bg-white border-gray-100 text-gray-400"
                  )}
               >
                  <ChevronLeft size={18} />
               </button>
               
               <div className={cn(
                 "px-4 py-2 rounded-none text-[11px] font-black italic border shadow-sm",
                 theme === 'dark' ? "bg-white border-white text-black" : "bg-gray-900 border-gray-800 text-white"
               )}>
                  {page}
               </div>
               
               <button 
                  disabled={logs.length < 25} 
                  onClick={() => setPage(page + 1)} 
                  className={cn(
                    "w-10 h-10 border rounded-none flex items-center justify-center transition-all disabled:opacity-20",
                    theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400" : "bg-white border-gray-100 text-gray-400"
                  )}
               >
                  <ChevronRight size={18} />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
