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
        "relative rounded-none border transition-all duration-200 overflow-hidden",
        theme === 'dark' 
          ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' 
          : 'bg-z-panel border-z-border shadow-sm',
        interactive && (theme === 'dark' ? 'hover:border-z-accent/50 hover:bg-app/80' : 'hover:border-z-accent/50 hover:bg-[var(--z-bg-input)]'),
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
        theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-z-border bg-[var(--z-bg-input)]/50',
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
        "text-sm font-semibold  ",
        theme === 'dark' ? 'text-z-secondary' : 'text-z-primary',
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
