import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Sliders, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useSiteStore } from '../lib/siteStore';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { GlassDropdown, type DropdownOption } from './GlassDropdown';

interface SiteSelectorProps {
  isSidebarOpen?: boolean;
}

export const SiteSelector: React.FC<SiteSelectorProps> = ({ isSidebarOpen = true }) => {
  const { theme } = useTheme();
  const { activeWorkspaceId, setActiveWorkspaceId, activeSiteId, setActiveSiteId } = useSiteStore();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const initialized = useRef(false);

  // 1. Fetch workspaces and sites on mount only
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initData = async () => {
      try {
        // Fetch workspaces
        const wsRes = await api.get('/workspaces');
        const fetchedWorkspaces = wsRes.data?.data || [];
        setWorkspaces(fetchedWorkspaces);

        // Only use stored IDs; never call setters from effect to avoid loops
        const storedWsId = activeWorkspaceId || fetchedWorkspaces[0]?._id || fetchedWorkspaces[0]?.id;
        if (storedWsId && storedWsId !== activeWorkspaceId) {
          setActiveWorkspaceId(storedWsId);
        }

        if (storedWsId) {
          // Fetch sites for active workspace
          const sitesRes = await api.get(`/sites?workspaceId=${encodeURIComponent(storedWsId)}`);
          const fetchedSites = sitesRes.data?.data || [];
          setSites(fetchedSites);
        }
      } catch (err) {
        toast.error('Failed to load workspaces and sites');
      }
    };

    initData();
    // Only run on mount — store setters are intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSitesForWorkspace = async (wsId: string): Promise<any[]> => {
    const sitesRes = await api.get(`/sites?workspaceId=${encodeURIComponent(wsId)}`);
    const fetchedSites = sitesRes.data?.data || [];
    setSites(fetchedSites);
    return fetchedSites;
  };

  const handleSelectWorkspace = async (wsId: string) => {
    if (wsId === activeWorkspaceId) return;

    try {
      setActiveWorkspaceId(wsId);

      // Fetch sites for the new workspace
      const fetchedSites = await fetchSitesForWorkspace(wsId);
      const wsName = workspaces.find(w => (w._id || w.id) === wsId)?.name;

      if (fetchedSites.length > 0) {
        const firstSite = fetchedSites[0];
        const firstSiteId = firstSite._id || firstSite.id;
        setActiveSiteId(firstSiteId);
        localStorage.setItem('activeSiteName', firstSite.name);
        localStorage.setItem('activeSiteSlug', firstSite.slug);
        api.defaults.headers['x-zenith-site-id'] = firstSiteId;
        toast.success(`Switched to workspace: ${wsName}`);
      } else {
        setActiveSiteId(null);
        localStorage.removeItem('activeSiteName');
        localStorage.removeItem('activeSiteSlug');
        delete api.defaults.headers['x-zenith-site-id'];
        toast.success(`Switched to workspace: ${wsName} (no sites)`);
      }
    } catch (err) {
      toast.error('Failed to switch workspace');
    }
  };

  const handleSelectSite = (siteId: string) => {
    const site = sites.find((s) => (s._id || s.id) === siteId);
    if (!site) return;
    if ((site._id || site.id) === activeSiteId) return;

    const actualId = site._id || site.id;
    setActiveSiteId(actualId);
    localStorage.setItem('activeSiteName', site.name);
    localStorage.setItem('activeSiteSlug', site.slug);
    api.defaults.headers['x-zenith-site-id'] = actualId;
    toast.success(`Switched to site: ${site.name}`);
  };

  const activeWorkspace = workspaces.find((w) => (w._id || w.id) === activeWorkspaceId) || {
    name: 'Default Workspace',
  };

  const activeSite = sites.find((s) => (s._id || s.id) === activeSiteId) || {
    name: localStorage.getItem('activeSiteName') || 'Default Site',
    icon: '🌐',
  };

  // Map workspaces to DropdownOptions
  const workspaceOptions: DropdownOption[] = workspaces.map((ws) => ({
    value: ws._id || ws.id,
    label: ws.name,
    icon: <Briefcase size={16} className="text-[#10B981]" />,
    slug: ws.slug,
  }));

  // Map sites to DropdownOptions
  const siteOptions: DropdownOption[] = sites.map((site) => ({
    value: site._id || site.id,
    label: site.name,
    icon: <span className="text-[#10B981]">{site.icon || '🌐'}</span>,
    slug: site.slug,
  }));

  // Render trigger for Workspace
  const renderWorkspaceTrigger = (selected: DropdownOption | null, isOpen: boolean, toggle: () => void) => {
    const activeLabel = selected ? selected.label : activeWorkspace.name;
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between text-left transition-all duration-300 p-2.5",
          "relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
          theme === 'dark' 
            ? "bg-[#111827]/65 backdrop-blur-[12px] text-white border border-white/[0.08] hover:border-[#10B981]/50 hover:bg-[#111827]/85" 
            : "bg-white/65 backdrop-blur-[12px] text-gray-900 border border-black/[0.08] hover:border-[#10B981]/30 hover:bg-white/85",
          isSidebarOpen ? "rounded-[12px]" : "rounded-lg p-2 justify-center",
          "hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500"
        )}
        title={!isSidebarOpen ? activeLabel : undefined}
      >
        <div className={cn("flex items-center min-w-0 z-10", isSidebarOpen ? "gap-3" : "gap-0 justify-center")}>
          <div className={cn(
            "rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-300",
            theme === 'dark' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#10B981]/5 text-[#10B981]",
            isSidebarOpen ? "w-8 h-8" : "w-10 h-10"
          )}>
            <Briefcase size={16} />
          </div>
          
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-[#10B981] uppercase tracking-[0.2em] font-mono leading-none mb-1">
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

  // Render trigger for Site
  const renderSiteTrigger = (selected: DropdownOption | null, isOpen: boolean, toggle: () => void) => {
    const activeIcon = selected ? selected.icon : <span>{activeSite.icon || '🌐'}</span>;
    const activeLabel = selected ? selected.label : activeSite.name;
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between text-left transition-all duration-300 p-2.5",
          "relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
          theme === 'dark' 
            ? "bg-[#111827]/65 backdrop-blur-[12px] text-white border border-white/[0.08] hover:border-[#10B981]/50 hover:bg-[#111827]/85" 
            : "bg-white/65 backdrop-blur-[12px] text-gray-900 border border-black/[0.08] hover:border-[#10B981]/30 hover:bg-white/85",
          isSidebarOpen ? "rounded-[12px]" : "rounded-lg p-2 justify-center",
          "hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500"
        )}
        title={!isSidebarOpen ? activeLabel : undefined}
      >
        <div className={cn("flex items-center min-w-0 z-10", isSidebarOpen ? "gap-3" : "gap-0 justify-center")}>
          <div className={cn(
            "rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-300",
            theme === 'dark' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#10B981]/5 text-[#10B981]",
            isSidebarOpen ? "w-8 h-8" : "w-10 h-10"
          )}>
            {activeIcon}
          </div>
          
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-black text-[#10B981] uppercase tracking-[0.2em] font-mono leading-none mb-1">
                TENANT / SITE
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

  const renderWorkspaceOption = (option: any, isSelected: boolean) => {
    return (
      <button
        type="button"
        className={cn(
          "w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors duration-200",
          theme === 'dark' ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.02]",
          isSelected && (theme === 'dark' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#10B981]/5 text-[#10B981]")
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
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}
      </button>
    );
  };

  const renderSiteOption = (option: any, isSelected: boolean) => {
    return (
      <button
        type="button"
        className={cn(
          "w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors duration-200",
          theme === 'dark' ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.02]",
          isSelected && (theme === 'dark' ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#10B981]/5 text-[#10B981]")
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
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}
      </button>
    );
  };

  const workspaceFooterAction = (
    <Link
      to="/sites"
      className={cn(
        "w-full px-4 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest font-mono transition-colors",
        theme === 'dark' 
          ? "text-gray-400 hover:text-white hover:bg-white/[0.03]" 
          : "text-gray-600 hover:text-black hover:bg-black/[0.02]"
      )}
    >
      <Sliders size={12} className="text-[#10B981]" />
      Manage Workspaces & Tenants
    </Link>
  );

  return (
    <div 
      className={cn(
        "px-4 py-3 flex flex-col gap-3 transition-all duration-300",
        theme === 'dark' ? 'bg-black/10' : 'bg-gray-50/20'
      )}
    >
      {/* Workspace Select */}
      <GlassDropdown
        options={workspaceOptions}
        value={activeWorkspaceId || ''}
        onChange={handleSelectWorkspace}
        isSidebarOpen={isSidebarOpen}
        headerText="Switch Workspace"
        footerAction={workspaceFooterAction}
        renderTrigger={renderWorkspaceTrigger}
        renderOption={renderWorkspaceOption}
        menuClassName={isSidebarOpen ? "left-0 right-0" : "left-12 w-[240px]"}
      />

      {/* Site Select */}
      <GlassDropdown
        options={siteOptions}
        value={activeSiteId || ''}
        onChange={handleSelectSite}
        isSidebarOpen={isSidebarOpen}
        headerText="Switch Tenant / Site"
        renderTrigger={renderSiteTrigger}
        renderOption={renderSiteOption}
        menuClassName={isSidebarOpen ? "left-0 right-0" : "left-12 w-[240px]"}
      />
    </div>
  );
};
