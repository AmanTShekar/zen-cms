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
      theme === 'dark' ? 'bg-black/80 backdrop-blur-md border-white/[0.08]' : 'bg-white/80 backdrop-blur-md border-gray-200',
      className
    )}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className={cn(
            "p-2.5 rounded-none-none border",
            theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] text-emerald-500' : 'bg-gray-50 border-gray-200 text-emerald-600'
          )}>
            {icon}
          </div>
        )}
        <div>
          <h1 className={cn(
            "text-xl font-black uppercase tracking-widest leading-none",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-xs mt-1",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
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
