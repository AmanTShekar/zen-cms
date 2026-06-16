import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { getWidgetDef } from '../../widgets/registry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface WidgetPreviewMockProps {
  type: string;
}

export function WidgetPreviewMock({ type }: WidgetPreviewMockProps) {
  const { theme } = useTheme();
  
  const def = getWidgetDef(type);
  
  if (!def) {
    return (
      <div className={cn(
        "w-full h-full min-h-[60px] rounded-none-none border p-2 flex flex-col gap-2 overflow-hidden",
        theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200'
      )}>
        <div className="flex items-center justify-center h-full text-[10px] text-gray-500 uppercase tracking-widest">
          Widget Not Found
        </div>
      </div>
    );
  }

  const Component = def.component;

  return (
    <div className={cn(
      "w-full rounded-none-none border overflow-hidden relative pointer-events-none p-4",
      theme === 'dark' ? 'bg-[#050505] border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
    )}>
      <WidgetErrorBoundary>
        <Component
          id="preview"
          config={{}}
          theme={theme}
          isEditing={false}
          onConfigChange={() => {}}
          onRemove={() => {}}
          title={def.label}
          isPreview={true}
        />
      </WidgetErrorBoundary>
    </div>
  );
}