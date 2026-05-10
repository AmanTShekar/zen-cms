import React, { useEffect, useState } from 'react';
import { Search, Command as CommandIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import api from '../lib/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/system/search?q=${query}`);
        setResults(res.data.data);
      } catch (err) {
        console.error('Search failed');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : undefined; // handled by parent but added for safety
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { name: 'Go to Dashboard', shortcut: 'G D', action: () => navigate('/') },
    { name: 'View Collections', shortcut: 'G C', action: () => navigate('/collections') },
    { name: 'User Management', shortcut: 'G U', action: () => navigate('/users') },
    { name: 'System Settings', shortcut: 'G S', action: () => navigate('/settings') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-text-primary/20 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-app-surface border border-border shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center px-4 border-b border-border h-14">
          <Search size={18} className="text-text-muted mr-3" />
          <input
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm h-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-app-subtle border border-border rounded text-[10px] font-bold text-text-muted">
            <CommandIcon size={10} />
            K
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length < 2 ? (
            actions.map((item) => (
              <button
                key={item.name}
                onClick={() => { item.action(); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded hover:bg-app-subtle transition-colors text-text-secondary hover:text-text-primary"
              >
                <div className="flex items-center gap-3">
                  <CommandIcon size={14} className="text-text-muted" />
                  {item.name}
                </div>
                <div className="flex gap-1">
                  {item.shortcut.split(' ').map(s => (
                    <span key={s} className="px-1.5 py-0.5 bg-app-subtle border border-border rounded text-[10px] font-mono text-text-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </button>
            ))
          ) : loading ? (
            <div className="py-8 text-center text-xs text-text-muted animate-pulse">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result, i) => (
              <button
                key={i}
                onClick={() => { 
                  navigate(`/collections/${result.collection}/${result.id}`); 
                  onClose(); 
                  setQuery('');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded hover:bg-app-subtle transition-colors text-text-secondary hover:text-text-primary text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center text-accent text-[8px] font-bold">
                    {result.collection.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{result.title}</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-tighter">{result.collection}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-text-muted">No results found for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
