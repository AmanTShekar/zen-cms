import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Save,
  Pencil,
  CheckCircle2,
  Loader2,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import api from '../lib/api';
import { confirm } from '../store/confirmStore';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/ui/PageHeader';
import { WIDGET_REGISTRY } from '../widgets/registry';

import type { DashboardWidget } from './dashboard/types';
import { SortableWidget } from './dashboard/SortableWidget';
import { WidgetPicker, PickerItemPreview } from './dashboard/WidgetPicker';
import { WidgetConfigModal } from './dashboard/WidgetConfigModal';

export default function DashboardBuilder() {
  const { theme } = useTheme();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [columns, setColumns] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [configWidget, setConfigWidget] = useState<DashboardWidget | null>(null);

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedUpdatedAt = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  const fetchLayout = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get('/dashboard/layout');
      setWidgets(r.data?.data?.widgets || []);
      setColumns(r.data?.data?.columns || 3);
      savedUpdatedAt.current = r.data?.data?.updatedAt;
      setIsDirty(false);
    } catch (err) {
      toast.error('Failed to load dashboard layout');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = useCallback(async (ws: DashboardWidget[], silent = false) => {
    try {
      if (!silent) setSaving(true);
      const r = await api.put('/dashboard/layout', {
        widgets: ws,
        columns,
        updatedAt: savedUpdatedAt.current,
      });
      savedUpdatedAt.current = r.data?.data?.updatedAt;
      if (r.data?.data?.warnings?.length) {
        r.data.data.warnings.forEach((w: string) => toast(w, { icon: '⚠️' }));
      }
      if (!silent) {
        toast.success('Dashboard saved');
        setIsDirty(false);
        setIsEditing(false);
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Dashboard was updated in another tab. Refresh to get latest.');
      } else {
        toast.error('Failed to save layout');
      }
    } finally {
      if (!silent) setSaving(false);
    }
  }, [columns]);

  useEffect(() => {
    if (!isDirty || !isEditing) return;
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => saveLayout(widgets, true), 1500);
    return () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
    };
  }, [widgets, isDirty, isEditing, saveLayout]);

  const markDirty = (ws: DashboardWidget[]) => {
    setWidgets(ws);
    setIsDirty(true);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    
    // Check if dragging from picker
    if (String(active.id).startsWith('picker-')) {
      const type = String(active.id).replace('picker-', '');
      const def = WIDGET_REGISTRY.find(w => w.type === type);
      if (!def) return;
      
      const newWidget: DashboardWidget = {
        id: uuidv4(),
        type: def.type,
        title: def.label,
        config: {},
        position: { x: 0, y: 999, w: def.defaultSize?.w || 1, h: def.defaultSize?.h || 1 },
      };
      
      if (widgets.length >= 50) {
        toast.error('Maximum 50 widgets reached');
        return;
      }
      
      // Insert at the index of the item we hovered over
      const overIdx = widgets.findIndex((w) => w.id === over.id);
      const newWidgets = [...widgets];
      if (overIdx >= 0) {
        newWidgets.splice(overIdx, 0, newWidget);
      } else {
        newWidgets.push(newWidget);
      }
      
      markDirty(newWidgets);
      return;
    }
    
    // Otherwise standard reorder
    if (active.id === over.id) return;
    const oldIdx = widgets.findIndex((w) => w.id === active.id);
    const newIdx = widgets.findIndex((w) => w.id === over.id);
    markDirty(arrayMove(widgets, oldIdx, newIdx));
  };

  const addWidget = (def: any) => {
    const newWidget: DashboardWidget = {
      id: uuidv4(),
      type: def.type,
      title: def.label,
      config: {},
      position: { x: 0, y: 999, w: def.defaultSize?.w || 1, h: def.defaultSize?.h || 1 },
    };
    if (widgets.length >= 50) {
      toast.error('Maximum 50 widgets reached');
      return;
    }
    markDirty([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => markDirty(widgets.filter((w) => w.id !== id));
  
  const updateWidgetConfig = (id: string, cfg: any) =>
    markDirty(widgets.map((w) => (w.id === id ? { ...w, config: cfg } : w)));
    
  const updateWidgetTitle = (id: string, title: string) =>
    markDirty(widgets.map((w) => (w.id === id ? { ...w, title } : w)));

  const resetLayout = async () => {
    if (!await confirm({ message: 'Reset your dashboard to the default layout? This cannot be undone.' }))
      return;
    try {
      const r = await api.post('/dashboard/layout/reset');
      setWidgets(r.data?.data?.widgets || []);
      setIsDirty(false);
      toast.success('Dashboard reset to default');
    } catch {
      toast.error('Failed to reset layout');
    }
  };

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  if (loading) {
    return (
      <div className={cn(
        'h-full w-full flex flex-col items-center justify-center gap-6',
        theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
      )}>
        <Loader2 size={32} className="animate-spin text-gray-600 dark:text-gray-500" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-full transition-colors duration-500 p-6',
      theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
    )}>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Monitor system health, metrics, and manage active widgets."
        icon={<Monitor size={24} />}
        actions={
          isEditing ? (
            <>
              <button
                onClick={resetLayout}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase rounded-none-none transition-all',
                  theme === 'dark' ? 'border-white/[0.08] text-gray-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'
                )}
              >
                <RotateCcw size={13} /> Reset
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase rounded-none-none transition-all',
                  theme === 'dark' ? 'border-gray-500/30 text-gray-600 hover:bg-gray-50/10' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                + Add Widget
              </button>
              <button
                onClick={() => saveLayout(widgets)}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-none-none hover:bg-emerald-600 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border text-[9px] font-black uppercase rounded-none-none transition-all',
                theme === 'dark' ? 'border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Pencil size={13} /> Edit Layout
            </button>
          )
        }
        className="mb-6 -mt-6 -mx-6 pb-6 pt-6 px-6"
      />

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={(e) => {
          handleDragEnd(e);
        }}
      >
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className={cn(
            "grid gap-6 items-start",
            columns === 2 ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1 md:grid-cols-12'
          )}>
            {widgets.map((w) => (
              <SortableWidget
                key={w.id}
                widget={w}
                isEditing={isEditing}
                onRemove={removeWidget}
                onUpdateConfig={updateWidgetConfig}
                onUpdateTitle={updateWidgetTitle}
                onOpenConfig={setConfigWidget}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={activeId?.toString().startsWith('picker-') ? null : dropAnimationConfig}>
          {activeId?.toString().startsWith('picker-') ? (
            <div className="w-[360px] opacity-90 shadow-2xl shadow-emerald-500/20 scale-105 transition-transform cursor-grabbing">
              <PickerItemPreview 
                def={WIDGET_REGISTRY.find(w => w.type === activeId.toString().replace('picker-', ''))} 
                theme={theme} 
              />
            </div>
          ) : activeWidget ? (
            <div className="shadow-2xl shadow-emerald-500/20 scale-105 transition-transform h-full w-full cursor-grabbing">
              <SortableWidget
                widget={activeWidget}
                isEditing={true}
                onRemove={() => {}}
                onUpdateConfig={() => {}}
                onUpdateTitle={() => {}}
                onOpenConfig={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>

        <WidgetPicker 
          isOpen={showPicker} 
          onClose={() => setShowPicker(false)} 
          onAdd={addWidget} 
          activeId={activeId}
        />
      </DndContext>

      <WidgetConfigModal 
        widget={configWidget} 
        onClose={() => setConfigWidget(null)}
        onSave={(cfg, title) => {
          if (configWidget) {
            updateWidgetConfig(configWidget.id, cfg);
            updateWidgetTitle(configWidget.id, title);
            setConfigWidget(null);
          }
        }}
      />
    </div>
  );
}
