import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  const { theme } = useTheme();

  return (
    <div className={cn(
      "px-6 py-4 border-b flex items-center justify-between transition-colors",
      theme === 'dark' ? 'bg-black/80 backdrop-blur-md border-z-border' : 'bg-white/80 backdrop-blur-md border-z-border',
      className
    )}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className={cn(
            "p-2.5 rounded-none-none border",
            theme === 'dark' ? 'bg-z-panel border-z-border text-z-active-text' : 'bg-z-input border-z-border text-z-accent'
          )}>
            {icon}
          </div>
        )}
        <div>
          <h1 className={cn(
            "text-xl font-black uppercase tracking-widest leading-none",
            theme === 'dark' ? 'text-white' : 'text-z-primary'
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-xs mt-1",
              theme === 'dark' ? 'text-z-muted' : 'text-z-secondary'
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
