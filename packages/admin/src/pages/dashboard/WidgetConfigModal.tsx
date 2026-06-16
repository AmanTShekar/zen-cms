import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { DashboardWidget } from './types';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface WidgetConfigModalProps {
  widget: DashboardWidget | null;
  onClose: () => void;
  onSave: (config: any, title: string) => void;
}

export function WidgetConfigModal({ widget, onClose, onSave }: WidgetConfigModalProps) {
  const { theme } = useTheme();
  const [config, setConfig] = useState<any>({});
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (widget) {
      setConfig(widget.config || {});
      setTitle(widget.title || '');
    }
  }, [widget]);

  if (!widget) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[500px] z-50 shadow-2xl flex flex-col max-h-[90vh]",
        theme === 'dark' ? 'bg-[#0a0a0a] border border-white/[0.08]' : 'bg-white border border-gray-200'
      )}>
        <div className={cn(
          "flex items-center justify-between p-4 border-b",
          theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
        )}>
          <h2 className={cn("text-sm font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            Configure Widget
          </h2>
          <button onClick={onClose} className={cn("p-1.5 transition-colors", theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className={cn("block text-[10px] font-bold uppercase tracking-wider mb-1.5", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                Widget Title
              </label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-none-none border outline-none transition-colors",
                  theme === 'dark' ? 'bg-black border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 focus:border-emerald-500'
                )}
              />
            </div>
            
            {/* generic config object dump as JSON for now, or just let the widget implement it */}
            <div>
              <label className={cn("block text-[10px] font-bold uppercase tracking-wider mb-1.5", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                Configuration JSON
              </label>
              <textarea 
                rows={6}
                value={JSON.stringify(config, null, 2)}
                onChange={e => {
                  try {
                    setConfig(JSON.parse(e.target.value));
                  } catch {
                    // ignore parse errors while typing
                  }
                }}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-none-none border outline-none transition-colors font-mono",
                  theme === 'dark' ? 'bg-black border-white/[0.08] text-gray-300 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                )}
              />
            </div>
          </div>
        </div>

        <div className={cn(
          "flex justify-end gap-3 p-4 border-t",
          theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
        )}>
          <button 
            onClick={onClose}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(config, title)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors"
          >
            <Save size={14} />
            Save Configuration
          </button>
        </div>
      </div>
    </>
  );
}
