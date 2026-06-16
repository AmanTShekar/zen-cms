import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface ActionPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: string;
}

export function ActionPanel({ 
  children, 
  sidebar, 
  sidebarPosition = 'right',
  sidebarWidth = 'w-[320px]',
  className,
  ...props 
}: ActionPanelProps) {
  const { theme } = useTheme();

  return (
    <div 
      className={cn(
        "flex flex-col lg:flex-row h-full min-h-[calc(100vh-65px)]",
        className
      )}
      {...props}
    >
      {sidebarPosition === 'left' && sidebar && (
        <div className={cn(
          "shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col",
          sidebarWidth,
          theme === 'dark' ? 'border-white/[0.08] bg-[#050505]' : 'border-gray-200 bg-gray-50/30'
        )}>
          {sidebar}
        </div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {sidebarPosition === 'right' && sidebar && (
        <div className={cn(
          "shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col",
          sidebarWidth,
          theme === 'dark' ? 'border-white/[0.08] bg-[#050505]' : 'border-gray-200 bg-gray-50/30'
        )}>
          {sidebar}
        </div>
      )}
    </div>
  );
}
