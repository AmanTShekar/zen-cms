import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Database, Settings, Zap, Clock, Layout, Shield, Mail, Key, Sparkles, Palette, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const res = await api.get(`/system/search?q=${query}`);
          setResults(res.data.data);
        } catch (err) {
          console.error('Search failed');
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const highlightMatch = (text: string, match: string) => {
    if (!match) return text;
    const parts = text.split(new RegExp(`(${match})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === match.toLowerCase() 
        ? <span key={i} className="text-indigo-500 font-black underline decoration-2 underline-offset-2">{part}</span> 
        : part
    );
  };

  const handleSelect = (path: string) => {
    navigate(path);
    setIsFocused(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative z-[100]">
      <motion.div 
        animate={{ width: isFocused ? 360 : 240 }}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-none transition-all border",
          isFocused 
            ? "bg-white border-indigo-500 shadow-lg text-black" 
            : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
        )}
      >
        <Search size={18} className={cn("transition-colors", isFocused ? "text-indigo-500" : "text-gray-500")} />
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search collections & commands..."
          className="bg-transparent border-none outline-none text-[13px] font-black uppercase tracking-widest italic flex-1 placeholder:text-gray-700"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 hover:bg-black/5 rounded-none">
            <X size={14} />
          </button>
        )}
        {!isFocused && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-none border border-white/10 bg-black/20 text-[9px] font-black text-gray-600">
            <span>⌘</span>
            <span>K</span>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isFocused && (query.length > 0 || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.99 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-none shadow-2xl overflow-hidden flex flex-col text-black"
          >
            <div className="max-h-[400px] overflow-y-auto p-3 no-scrollbar">
              {results.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Database Nodes</div>
                  {results.map((res: any) => (
                    <button
                      key={res.id}
                      onClick={() => handleSelect(`/collections/${res.collection}/${res.id}`)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-none hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-7 h-7 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black uppercase italic tracking-tight truncate">
                          {highlightMatch(res.title, query)}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{res.collectionLabel}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* System Protocols & Settings Deep Search */}
               <div className="mt-1 pt-1 border-t border-gray-100 space-y-1">
                <div className="px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 italic">System Protocols</div>
                {(() => {
                  const commands = [
                    { label: 'Dashboard', path: '/', icon: Layout, sub: 'System Overview' },
                    { label: 'General Settings', path: '/settings?tab=general', icon: Settings, sub: 'Site Name, URL, Maintenance' },
                    { label: 'Maintenance Mode', path: '/settings?tab=general', icon: Zap, sub: 'Protocol Override' },
                    { label: 'Security Protocols', path: '/settings?tab=security', icon: Shield, sub: 'Session Lifespan & Auth' },
                    { label: 'SMTP Relay', path: '/settings?tab=notifications', icon: Mail, sub: 'Email Configuration' },
                    { label: 'Operator Registry', path: '/settings?tab=users', icon: Users, sub: 'User Management' },
                    { label: 'API Credentials', path: '/settings?tab=keys', icon: Key, sub: 'Access Tokens' },
                    { label: 'Infrastructure Stats', path: '/settings?tab=database', icon: Database, sub: 'DB Health & Cache' },
                    { label: 'AI Intelligence', path: '/settings?tab=ai', icon: Sparkles, sub: 'Neural Bridge Config' },
                    { label: 'Custom Styles', path: '/settings?tab=appearance', icon: Palette, sub: 'CSS Overrides' },
                    { label: 'Audit Logs', path: '/audit-logs', icon: Clock, sub: 'Security Events' },
                    { label: 'Plugin Marketplace', path: '/plugins', icon: Zap, sub: 'Modular Extensions' },
                  ].filter(cmd => 
                    cmd.label.toLowerCase().includes(query.toLowerCase()) || 
                    cmd.sub.toLowerCase().includes(query.toLowerCase())
                  );

                  if (results.length === 0 && commands.length === 0 && query.length >= 2 && !isSearching) {
                    return (
                      <div className="py-8 text-center">
                        <span className="text-[10px] font-black uppercase italic text-gray-400 tracking-widest">No matching records found</span>
                      </div>
                    );
                  }

                  return commands.map(cmd => (
                    <button
                      key={cmd.label}
                      onClick={() => handleSelect(cmd.path)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-none hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-7 h-7 rounded-none bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <cmd.icon size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black uppercase italic tracking-tight truncate">{highlightMatch(cmd.label, query)}</span>
                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest truncate">{highlightMatch(cmd.sub, query)}</span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </div>
            
             <div className="px-4 py-2 bg-gray-900 border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 italic">Core_Intelligence_Stream</span>
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 bg-indigo-500 rounded-none animate-pulse" />
                   <span className="text-[8px] font-black uppercase text-indigo-500 italic">Sync_Active</span>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
