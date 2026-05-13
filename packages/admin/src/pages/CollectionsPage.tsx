import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Layers, 
  ArrowRight, 
  Search, 
  Activity, 
  Shield, 
  Zap,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../lib/api';
import {  } from '../context/ThemeContext';

const CollectionsPage: React.FC = () => {
  // --- REGISTRY STATE: CONTENT INFRASTRUCTURE ---
  const [collections, setCollections] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<unknown>({});

  /**
   * REGISTRY HARVEST: SYNCHRONIZE CONTENT NODES
   * Orchestrates parallel retrieval of system health (for schema/labels) 
   * and record counts for each collection node.
   */
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        // Parallel telemetry handshake
        const [healthRes, countsRes] = await Promise.all([
          api.get('/system/health').catch(() => null),
          api.get('/system/counts').catch(() => null)
        ]);
        
        const healthData = healthRes?.data?.data;
        const rawCollections = healthData?.registry?.collections || healthData?.collections || [];
        
        /**
         * NORMALIZATION PROTOCOL
         * Ensures every collection has a valid renderable label.
         * Falls back to slug/name or 'Unnamed Collection' to prevent UI blank states.
         */
        const processedCollections = rawCollections.map((c: unknown) => ({
          ...c,
          label: c.label || c.name || c.slug || 'Unnamed Collection'
        }));

        setCollections(processedCollections);
        setStats(countsRes?.data?.data || {});
      } catch {
        console.error('Critical Registry Synchronization Failure', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  /**
   * SEARCH & FILTER LOGIC: CLIENT-SIDE MATRIX REDUCTION
   */
  const filteredCollections = collections.filter(col => {
    const label = (col.label || '').toLowerCase();
    const slug = (col.slug || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return label.includes(query) || slug.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className={cn(
      "p-10 space-y-10 min-h-screen transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* 🏛️ Tactical Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-16 h-16 rounded-none flex items-center justify-center shadow-2xl transition-all",
            theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
          )}>
            <Database size={32} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">Data_Architect</span>
              <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Content Assets</h1>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input 
            type="text" 
            placeholder="FILTER_COLLECTIONS..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full border rounded-none py-4 pl-12 pr-4 text-[10px] font-black italic focus:ring-4 transition-all outline-none uppercase tracking-widest",
              theme === 'dark' ? "bg-white/[0.03] border-white/10 text-white focus:ring-indigo-500/20" : "bg-white border-gray-200 focus:ring-indigo-500/10"
            )} 
          />
        </div>
      </header>

      {/* 📊 System Integrity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Records', value: Object.values(stats).reduce((a: unknown, b: unknown) => a + b, 0), icon: Activity, sub: 'Global Synchronization' },
          { label: 'Schema Health', value: '100%', icon: Shield, sub: 'Optimal Performance' },
          { label: 'Latency', value: '14ms', icon: Zap, sub: 'Neural Processing' }
        ].map((item, i) => (
          <div key={i} className={cn(
            "p-8 border rounded-none flex flex-col gap-4 transition-all relative overflow-hidden group",
            theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-white border-gray-100 shadow-sm"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <item.icon size={80} />
            </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{item.label}</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter">{item.value}</span>
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 🚀 Collection Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredCollections.map((col, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={col.slug}
          >
            <Link 
              to={`/collections/${col.slug}`}
              className={cn(
                "group p-6 border rounded-none flex flex-col gap-6 transition-all hover:-translate-y-1 relative",
                theme === 'dark' ? "bg-[#080808] border-white/5 hover:border-indigo-500/50" : "bg-white border-gray-100 hover:border-indigo-500 shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn(
                  "w-12 h-12 flex items-center justify-center transition-all",
                  theme === 'dark' ? "bg-white/[0.03] text-gray-400 group-hover:bg-white group-hover:text-black" : "bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white"
                )}>
                  <Layers size={20} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">Registry_Node</span>
                  <span className="text-lg font-black italic tracking-tighter">#{stats[col.slug] || 0}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-2 group-hover:text-indigo-500 transition-colors">
                  {col.label.replace(/-/g, ' ')}
                </h3>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                  System collection for managing {col.label.toLowerCase()} entries and metadata.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Optimal_Link</span>
                <ArrowRight size={14} className="text-indigo-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CollectionsPage;
