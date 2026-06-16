import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface WidgetPreviewMockProps {
  type: string;
}

export function WidgetPreviewMock({ type }: WidgetPreviewMockProps) {
  const { theme } = useTheme();
  
  return (
    <div className={cn(
      "w-full h-full min-h-[60px] rounded-sm border p-2 flex flex-col gap-2 overflow-hidden",
      theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200'
    )}>
      <div className={cn(
        "h-2 w-1/3 rounded-sm",
        theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
      )} />
      <div className="flex-1 flex gap-2">
        <div className={cn(
          "h-full w-1/2 rounded-sm",
          theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
        )} />
        <div className={cn(
          "h-full w-1/2 rounded-sm flex flex-col gap-1",
          theme === 'dark' ? '' : ''
        )}>
           <div className={cn("h-1/2 w-full rounded-sm", theme === 'dark' ? 'bg-white/5' : 'bg-gray-100')} />
           <div className={cn("h-1/2 w-full rounded-sm", theme === 'dark' ? 'bg-white/5' : 'bg-gray-100')} />
        </div>
      </div>
    </div>
  );
}