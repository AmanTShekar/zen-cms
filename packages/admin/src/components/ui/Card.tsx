import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({ 
  className, 
  children, 
  padding = 'md', 
  interactive = false, 
  ...props 
}: CardProps) {
  const { theme } = useTheme();

  const paddingClass = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={cn(
        "relative rounded-none-none border transition-all duration-200 overflow-hidden",
        theme === 'dark' 
          ? 'bg-black/65 backdrop-blur-[12px] border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.1)]' 
          : 'bg-white border-gray-200 shadow-sm',
        interactive && (theme === 'dark' ? 'hover:border-emerald-500/50 hover:bg-black/80' : 'hover:border-emerald-500/50 hover:bg-gray-50'),
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { theme } = useTheme();
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between border-b px-6 py-4",
        theme === 'dark' ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { theme } = useTheme();
  return (
    <h3
      className={cn(
        "text-sm font-bold uppercase tracking-wider",
        theme === 'dark' ? 'text-white' : 'text-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}
