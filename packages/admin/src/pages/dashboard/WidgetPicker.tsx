import React from 'react';
import { X, Plus, Search, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { WidgetPreviewMock } from './WidgetPreviewMock';

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (def: any) => void;
}

export function PickerItemPreview({ def, theme }: { def: any, theme: string }) {
  return (
    <div className={cn(
      "group relative border p-3 rounded-none-none flex flex-col gap-3 transition-colors",
      theme === 'dark' ? 'border-emerald-500/50 bg-white/[0.02]' : 'border-emerald-500/50 bg-gray-50'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 border transition-colors",
            theme === 'dark' ? 'bg-black border-white/[0.08] text-emerald-500' : 'bg-white border-gray-200 text-emerald-600'
          )}>
            <GripVertical size={16} />
          </div>
          <div>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>{def.label}</h3>
            <p className={cn("text-[10px] mt-0.5", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{def.description}</p>
          </div>
        </div>
      </div>
      <div className="pointer-events-none opacity-100 transition-opacity">
        <WidgetPreviewMock type={def.type} />
      </div>
    </div>
  );
}

function DraggablePickerItem({ def, onAdd, onClose, theme }: { def: any, onAdd: any, onClose: any, theme: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker-${def.type}`,
  });

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative border p-3 rounded-none-none flex flex-col gap-3 transition-colors cursor-grab active:cursor-grabbing",
        theme === 'dark' ? 'border-white/[0.08] hover:border-emerald-500/50 bg-white/[0.02]' : 'border-gray-200 hover:border-emerald-500/50 bg-gray-50',
        isDragging ? 'opacity-0' : 'opacity-100'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className={cn(
              "p-2 border transition-colors",
              theme === 'dark' ? 'bg-black border-white/[0.08] text-emerald-500' : 'bg-white border-gray-200 text-emerald-600'
            )}
          >
            <GripVertical size={16} />
          </div>
          <div>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>{def.label}</h3>
            <p className={cn("text-[10px] mt-0.5", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{def.description}</p>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAdd(def);
            onClose();
          }}
          className="shrink-0 p-2 bg-emerald-500 text-white rounded-none-none hover:bg-emerald-600 transition-colors focus:opacity-100"
          title="Click to add instantly"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
        <WidgetPreviewMock type={def.type} />
      </div>
    </div>
  );
}

export function WidgetPicker({ isOpen, onClose, onAdd, activeId }: WidgetPickerProps & { activeId?: string | null }) {
  const { theme } = useTheme();
  const [search, setSearch] = React.useState('');

  if (!isOpen) return null;

  const filtered = Object.values(WIDGET_REGISTRY).filter(def => 
    def.label.toLowerCase().includes(search.toLowerCase()) || 
    def.description.toLowerCase().includes(search.toLowerCase())
  );

  const isDraggingFromPicker = activeId?.startsWith('picker-');

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          isDraggingFromPicker ? "opacity-0 pointer-events-none" : "opacity-100 bg-black/40 backdrop-blur-md"
        )}
        onClick={onClose}
      />
      <div className={cn(
        "fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-50 flex flex-col shadow-2xl transition-transform transform",
        theme === 'dark' ? 'bg-[#0a0a0a] border-l border-white/[0.08]' : 'bg-white border-l border-gray-200',
        isDraggingFromPicker ? "translate-x-full" : "translate-x-0"
      )}>
        <div className={cn(
          "flex items-center justify-between p-4 border-b",
          theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
        )}>
          <div>
            <h2 className={cn("text-sm font-bold uppercase tracking-wider", theme === 'dark' ? 'text-white' : 'text-gray-900')}>Add Widget</h2>
            <p className={cn("text-xs mt-1", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Drag a widget or click + to add</p>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-none-none transition-colors", theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}>
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
                "w-full pl-9 pr-4 py-2 text-sm rounded-none-none border outline-none transition-colors",
                theme === 'dark' ? 'bg-black border-white/[0.08] text-white focus:border-emerald-500' : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 flex flex-col gap-3">
          {filtered.map(def => (
            <DraggablePickerItem 
              key={def.type} 
              def={def} 
              onAdd={onAdd} 
              onClose={onClose} 
              theme={theme} 
            />
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
