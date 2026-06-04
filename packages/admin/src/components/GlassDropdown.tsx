import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = isSidebarOpen ? rect.width : 240;
    setMenuPos({
      top: rect.bottom + 4 + window.scrollY,
      left: isSidebarOpen ? rect.left + window.scrollX : rect.left - menuWidth + window.scrollX,
      width: menuWidth,
    });
  }, [isSidebarOpen]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Handle click outside to close the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (containerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
          ? "bg-[#0B0F19]/65 backdrop-blur-[12px] text-white border border-white/[0.08] hover:border-emerald-500/50 hover:bg-[#0B0F19]/85"
          : "bg-white/65 backdrop-blur-[12px] text-gray-900 border border-black/[0.08] hover:border-emerald-500/30 hover:bg-white/85",
        isSidebarOpen ? "rounded-none" : "rounded-none p-2 justify-center",
        "hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        triggerClassName
      )}
    >
      <div className={cn("flex items-center min-w-0 z-10", isSidebarOpen ? "gap-3" : "gap-0 justify-center")}>
        {selectedOption?.icon && (
          <div className={cn(
            "rounded-none flex items-center justify-center text-lg flex-shrink-0 transition-colors duration-300",
            theme === 'dark' ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
            isSidebarOpen ? "w-8 h-8" : "w-10 h-10"
          )}>
            {selectedOption.icon}
          </div>
        )}

        {isSidebarOpen && (
          <div className="flex flex-col min-w-0">
            {selectedOption?.description && (
              <span className="text-[8px] font-black text-emerald-400 dark:text-emerald-400 uppercase tracking-[0.2em] font-mono leading-none mb-1">
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
    <div className={cn("relative transition-all duration-300", className)}>
      <div ref={triggerRef} onClick={() => { if (!disabled) { if (!isOpen) updatePosition(); setIsOpen(!isOpen); } }}>
        {renderTrigger ? renderTrigger(selectedOption, isOpen, toggle) : defaultTrigger}
      </div>

      {isOpen && menuPos && createPortal(
        <AnimatePresence>
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              width: isSidebarOpen ? menuPos.width : undefined,
              zIndex: 9999,
              backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            className={cn(
              "rounded-none overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] border",
              theme === 'dark'
                ? "border-white/[0.08] text-white"
                : "border-black/[0.08] text-gray-900",
              menuClassName
            )}
          >
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
                      theme === 'dark' ? "hover:bg-white/[0.04]" : "hover:bg-[#0B0F19]/[0.02]",
                      isSelected && (theme === 'dark' ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
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
                      <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
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

            {footerAction && (
              <div className={cn(
                "border-t bg-white/[0.02]",
                theme === 'dark' ? "border-white/[0.05]" : "border-black/[0.05]"
              )}>
                {footerAction}
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
