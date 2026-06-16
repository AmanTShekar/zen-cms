import React from 'react';
import { X, Plus, Search } from 'lucide-react';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { WidgetPreviewMock } from './WidgetPreviewMock';

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (def: any) => void;
}

export function WidgetPicker({ isOpen, onClose, onAdd }: WidgetPickerProps) {
  const { theme } = useTheme();
  const [search, setSearch] = React.useState('');

  if (!isOpen) return null;

  const filtered = Object.values(WIDGET_REGISTRY).filter(def => 
    def.label.toLowerCase().includes(search.toLowerCase()) || 
    def.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className={cn(
        "fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-50 flex flex-col shadow-2xl transition-transform transform",
        theme === 'dark' ? 'bg-[#0a0a0a] border-l border-white/[0.08]' : 'bg-white border-l border-gray-200'
      )}>
        <div className={cn(
          "flex items-center justify-between p-4 border-b",
          theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
        )}>
          <div>
            <h2 className={cn("text-sm font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>Add Widget</h2>
            <p className={cn("text-xs mt-1", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Select a widget to add to your dashboard</p>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-none transition-colors", theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}>
            <X size={16} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search widgets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full pl-9 pr-4 py-2 text-sm rounded-none border outline-none transition-colors",
                theme === 'dark' ? 'bg-black border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 flex flex-col gap-3">
          {filtered.map(def => (
            <div 
              key={def.type}
              className={cn(
                "group relative border p-3 rounded-none flex flex-col gap-3 transition-colors",
                theme === 'dark' ? 'border-white/[0.08] hover:border-emerald-500/50 bg-white/[0.02]' : 'border-gray-200 hover:border-emerald-500/50 bg-gray-50'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 border",
                    theme === 'dark' ? 'bg-black border-white/[0.08] text-emerald-500' : 'bg-white border-gray-200 text-emerald-600'
                  )}>
                    {React.createElement(def.icon, { size: 16 })}
                  </div>
                  <div>
                    <h3 className={cn("text-xs font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>{def.label}</h3>
                    <p className={cn("text-[10px] mt-0.5", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{def.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    onAdd(def);
                    onClose();
                  }}
                  className="shrink-0 p-2 bg-emerald-500 text-white rounded-none hover:bg-emerald-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="h-24 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                <WidgetPreviewMock type={def.type} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              No widgets found.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
