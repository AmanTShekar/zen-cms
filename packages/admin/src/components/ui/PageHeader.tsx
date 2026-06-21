import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  backLink?: { to: string; label: string };
}

export function PageHeader({ title, description, icon, actions, className, backLink }: PageHeaderProps) {
  const { theme } = useTheme();

  return (
    <div className={cn(
      "px-6 py-4 border-b flex items-center justify-between transition-colors",
      theme === 'dark' ? 'bg-black/80 backdrop-blur-md border-z-border' : 'bg-white/80 backdrop-blur-md border-z-border',
      className
    )}>
      <div className="flex items-center gap-4">
        {backLink && (
          <a href={backLink.to} className="flex items-center justify-center p-2 rounded-none border border-transparent hover:border-z-border hover:bg-z-hover transition-all text-z-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </a>
        )}
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
            "text-xl font-semibold   leading-none",
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
