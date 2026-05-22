import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useSiteStore } from '../lib/siteStore';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { GlassDropdown } from './GlassDropdown';
import type { DropdownOption } from './GlassDropdown';

interface Site {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

interface SiteSelectorProps {
  isSidebarOpen?: boolean;
}

export const SiteSelector: React.FC<SiteSelectorProps> = ({ isSidebarOpen = true }) => {
  const { theme } = useTheme();
  const { activeSiteId, setActiveSiteId } = useSiteStore();
  const [sites, setSites] = useState<Site[]>([]);

  // Load sites on mount
  useEffect(() => {
    api
      .get('/sites')
      .then((res) => {
        const fetchedSites = res.data?.data || [];
        setSites(fetchedSites);

        // Initialise from storage or default to first site
        const stored = localStorage.getItem('activeSiteId');
        if (stored) {
          setActiveSiteId(stored);
          api.defaults.headers['x-zenith-site-id'] = stored;
          const match = fetchedSites.find((s: Site) => s._id === stored);
          if (match) {
            localStorage.setItem('activeSiteName', match.name);
            localStorage.setItem('activeSiteSlug', match.slug);
          }
        } else if (fetchedSites.length > 0) {
          const first = fetchedSites[0];
          setActiveSiteId(first._id);
          localStorage.setItem('activeSiteId', first._id);
          localStorage.setItem('activeSiteName', first.name);
          localStorage.setItem('activeSiteSlug', first.slug);
          api.defaults.headers['x-zenith-site-id'] = first._id;
        }
      })
      .catch(() => toast.error('Failed to load site workspaces'));
  }, [setActiveSiteId]);

  const handleSelectSite = (siteId: string) => {
    const site = sites.find((s) => s._id === siteId);
    if (!site) return;
    if (site._id === activeSiteId) return;

    setActiveSiteId(site._id);
    localStorage.setItem('activeSiteId', site._id);
    localStorage.setItem('activeSiteName', site.name);
    localStorage.setItem('activeSiteSlug', site.slug);
    api.defaults.headers['x-zenith-site-id'] = site._id;
    toast.success(`Entering workspace: ${site.name}`);
    
    // Refresh window to reset core query caches and reload workspace metadata
    window.location.reload();
  };

  const activeSite = sites.find((s) => s._id === activeSiteId) || {
    _id: activeSiteId || '',
    name: localStorage.getItem('activeSiteName') || 'Zenith Site',
    slug: localStorage.getItem('activeSiteSlug') || 'zenith',
    icon: '🌐',
  };

  // Map sites to DropdownOptions
  const options: DropdownOption[] = sites.map((site) => ({
    value: site._id,
    label: site.name,
    icon: <span>{site.icon || '🌐'}</span>,
    slug: site.slug,
  }));

  const renderTrigger = (selected: DropdownOption | null, isOpen: boolean, toggle: () => void) => {
    const activeIcon = selected ? selected.icon : (activeSite.icon || '🌐');
    const activeLabel = selected ? selected.label : activeSite.name;

    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between text-left transition-all duration-300 p-2.5",
          "relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
          theme === 'dark' 
            ? "bg-[#111827]/65 backdrop-blur-[12px] text-white border border-white/[0.08] hover:border-indigo-500/50 hover:bg-[#111827]/85" 
            : "bg-white/65 backdrop-blur-[12px] text-gray-900 border border-black/[0.08] hover:border-indigo-500/30 hover:bg-white/85",
          isSidebarOpen ? "rounded-[12px]" : "rounded-lg p-2 justify-center",
          "hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
        )}
        title={!isSidebarOpen ? activeLabel : undefined}
      >
        <div className={cn("flex items-center min-w-0 z-10", isSidebarOpen ? "gap-3" : "gap-0 justify-center")}>
          <div className={cn(
            "rounded-md flex items-center justify-center text-lg flex-shrink-0 transition-colors duration-300",
            theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600",
            isSidebarOpen ? "w-8 h-8" : "w-10 h-10"
          )}>
            {activeIcon}
          </div>
          
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-[0.2em] font-mono leading-none mb-1">
                WORKSPACE
              </span>
              <span className="text-xs font-black uppercase tracking-wide truncate leading-none">
                {activeLabel}
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
  };

  const renderOption = (option: any, isSelected: boolean) => {
    return (
      <button
        type="button"
        className={cn(
          "w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors duration-200",
          theme === 'dark' ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.02]",
          isSelected && (theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600")
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base flex-shrink-0">{option.icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate">{option.label}</span>
            <span className="text-[9px] text-gray-400 font-mono tracking-wider">/{option.slug}</span>
          </div>
        </div>
        {isSelected && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        )}
      </button>
    );
  };

  const footerAction = (
    <Link
      to="/sites"
      className={cn(
        "w-full px-4 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest font-mono transition-colors",
        theme === 'dark' 
          ? "text-gray-400 hover:text-white hover:bg-white/[0.03]" 
          : "text-gray-600 hover:text-black hover:bg-black/[0.02]"
      )}
    >
      <Sliders size={12} className="text-indigo-500" />
      Manage Workspaces
    </Link>
  );

  return (
    <div 
      className={cn(
        "px-4 py-3 transition-all duration-300",
        theme === 'dark' ? 'bg-black/10' : 'bg-gray-50/20'
      )}
    >
      <GlassDropdown
        options={options}
        value={activeSiteId || ''}
        onChange={handleSelectSite}
        isSidebarOpen={isSidebarOpen}
        headerText="Switch Workspace"
        footerAction={footerAction}
        renderTrigger={renderTrigger}
        renderOption={renderOption}
        menuClassName={isSidebarOpen ? "left-0 right-0" : "left-12 w-[240px]"}
      />
    </div>
  );
};
