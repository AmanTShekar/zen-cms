import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export interface DropdownOption<T = any> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  [key: string]: any; // Allow extra fields
}

interface GlassDropdownProps<T = any> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  headerText?: string;
  footerAction?: React.ReactNode;
  isSidebarOpen?: boolean; // For sidebar toggle layouts
  renderTrigger?: (selectedOption: DropdownOption<T> | null, isOpen: boolean, toggle: () => void) => React.ReactNode;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => React.ReactNode;
}

export const GlassDropdown = <T,>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  headerText,
  footerAction,
  isSidebarOpen = true,
  renderTrigger,
  renderOption,
}: GlassDropdownProps<T>) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: DropdownOption<T>) => {
    if (disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const toggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const defaultTrigger = (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between text-left transition-all duration-300 p-2.5",
        "relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
        theme === 'dark'
          ? "bg-[#111827]/65 backdrop-blur-[12px] text-white border border-white/[0.08] hover:border-indigo-500/50 hover:bg-[#111827]/85"
          : "bg-white/65 backdrop-blur-[12px] text-gray-900 border border-black/[0.08] hover:border-indigo-500/30 hover:bg-white/85",
        isSidebarOpen ? "rounded-[12px]" : "rounded-lg p-2 justify-center",
        "hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        triggerClassName
      )}
    >
      <div className={cn("flex items-center min-w-0 z-10", isSidebarOpen ? "gap-3" : "gap-0 justify-center")}>
        {selectedOption?.icon && (
          <div className={cn(
            "rounded-md flex items-center justify-center text-lg flex-shrink-0 transition-colors duration-300",
            theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600",
            isSidebarOpen ? "w-8 h-8" : "w-10 h-10"
          )}>
            {selectedOption.icon}
          </div>
        )}

        {isSidebarOpen && (
          <div className="flex flex-col min-w-0">
            {selectedOption?.description && (
              <span className="text-[8px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-[0.2em] font-mono leading-none mb-1">
                {selectedOption.description}
              </span>
            )}
            <span className="text-xs font-black uppercase tracking-wide truncate leading-none">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
        )}
      </div>

      {isSidebarOpen && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 flex-shrink-0 z-10 ml-2"
        >
          <ChevronDown size={14} />
        </motion.div>
      )}
    </button>
  );

  return (
    <div ref={containerRef} className={cn("relative transition-all duration-300", className)}>
      {renderTrigger ? renderTrigger(selectedOption, isOpen, toggle) : defaultTrigger}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.65)' : 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            className={cn(
              "absolute mt-2 z-50 rounded-[12px] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)] border",
              isSidebarOpen ? "left-0 right-0" : "left-16 w-[240px]",
              theme === 'dark'
                ? "border-white/[0.08] text-white"
                : "border-black/[0.08] text-gray-900",
              menuClassName
            )}
          >
            {/* Header */}
            {headerText && (
              <div className={cn(
                "px-4 py-2.5 border-b bg-white/[0.01]",
                theme === 'dark' ? "border-white/[0.05]" : "border-black/[0.05]"
              )}>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">
                  {headerText}
                </span>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-[220px] overflow-y-auto py-1 scrollbar-thin">
              {options.map((option) => {
                const isSelected = option.value === value;
                
                if (renderOption) {
                  return (
                    <div key={String(option.value)} onClick={() => handleSelect(option)} className="cursor-pointer">
                      {renderOption(option, isSelected)}
                    </div>
                  );
                }

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors duration-200",
                      theme === 'dark' ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.02]",
                      isSelected && (theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600")
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {option.icon && <span className="text-base flex-shrink-0">{option.icon}</span>}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[9px] text-gray-400 font-mono tracking-wider">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    )}
                  </button>
                );
              })}

              {options.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 text-xs">
                  No options found.
                </div>
              )}
            </div>

            {/* Footer */}
            {footerAction && (
              <div className={cn(
                "border-t bg-white/[0.02]",
                theme === 'dark' ? "border-white/[0.05]" : "border-black/[0.05]"
              )}>
                {footerAction}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
