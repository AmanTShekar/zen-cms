import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const { theme } = useTheme();

  const variantClasses = {
    default: theme === 'dark' ? 'bg-white/[0.05] text-gray-300 border-z-border-strong' : 'bg-gray-100 text-gray-700 border-z-border',
    success: theme === 'dark' ? 'bg-z-active-bg text-z-active-text border-z-accent/20' : 'bg-z-active-bg text-z-accent border-z-active-border',
    warning: theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    danger: theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200',
    purple: theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200',
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-sm font-bold   rounded-none-none border",
        variantClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
