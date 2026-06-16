import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Settings2 } from 'lucide-react';
import type { DashboardWidget } from './types';
import { getWidgetDef } from '../../widgets/registry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface SortableWidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onUpdateConfig: (id: string, config: any) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onOpenConfig: (widget: DashboardWidget) => void;
}

export function SortableWidget({
  widget,
  isEditing,
  onRemove,
  onUpdateConfig,
  onUpdateTitle,
  onOpenConfig
}: SortableWidgetProps) {
  const { theme } = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const def = getWidgetDef(widget.type);
  if (!def) return null;
  const Component = def.component;

  const colSpanClass = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4 md:col-span-4',
    5: 'col-span-5 md:col-span-5',
    6: 'col-span-12 md:col-span-6',
    7: 'col-span-12 md:col-span-7',
    8: 'col-span-12 md:col-span-8',
    9: 'col-span-12 md:col-span-9',
    10: 'col-span-12 md:col-span-10',
    11: 'col-span-12 md:col-span-11',
    12: 'col-span-12',
  }[widget.position?.w || def.defaultSize.w] || 'col-span-12 md:col-span-4';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}
      className={cn(
        "relative rounded-none-none border transition-all duration-200 group flex flex-col",
        colSpanClass,
        theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200',
        isDragging && "opacity-50 ring-2 ring-emerald-500 shadow-2xl scale-[1.02] z-50",
        isEditing && "hover:border-emerald-500/50 cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Widget Header */}
      <div 
        className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors",
        theme === 'dark' ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
      )}>
        <div className="flex items-center gap-2 overflow-hidden flex-1 pointer-events-none">
          {isEditing && (
            <div
              className={cn(
                "p-1 -ml-1 transition-colors text-emerald-500"
              )}
            >
              <GripVertical size={14} />
            </div>
          )}
          
          <div className="flex items-center gap-2 min-w-0">
            {React.createElement(def.icon, { size: 14, className: "text-emerald-500 shrink-0" })}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider truncate",
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              {widget.title}
            </span>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenConfig(widget);
              }}
              className={cn(
                "p-1.5 transition-colors",
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
              )}
              title="Configure Widget"
            >
              <Settings2 size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(widget.id);
              }}
              className="p-1.5 text-red-500/70 hover:text-red-500 transition-colors"
              title="Remove Widget"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className={cn(
        "flex-1 overflow-hidden p-4 relative",
        isEditing && "pointer-events-none"
      )}>
        <WidgetErrorBoundary>
          <Component
            id={widget.id}
            config={widget.config}
            theme={theme}
            isEditing={isEditing}
            onConfigChange={(cfg: any) => onUpdateConfig(widget.id, cfg)}
            onRemove={() => onRemove(widget.id)}
          />
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}