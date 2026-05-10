import React, { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  ChevronRight,
  User as UserIcon,
  Activity,
  ShieldCheck,
  Box,
  Image as ImageIcon,
  Globe,
  Layout
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from '../assets/logo.svg';
import CommandPalette from '../components/CommandPalette';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardLayoutProps {
  children: ReactNode;
}

interface CollectionInfo {
  slug: string;
  name: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [collections, setCollections] = React.useState<CollectionInfo[]>([]);

  React.useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await api.get('/health');
        const cols = res.data.data.collections.map((c: any) => ({ 
          slug: c.slug, 
          name: c.labels?.plural || c.name || c.slug,
          isSingleton: c.singleton 
        }));
        const globs = (res.data.data.globals || []).map((g: any) => ({ 
          slug: g.slug, 
          name: g.name || g.slug,
          isSingleton: true 
        }));
        setCollections([...cols, ...globs]);
      } catch (err) {
        console.error('Failed to fetch collections');
      }
    };
    fetchCollections();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Media Library', path: '/media', icon: ImageIcon },
    { name: 'Playground', path: '/playground', icon: Box },
    { name: 'Audit Logs', path: '/audit-logs', icon: Activity, role: ['admin'] },
    { 
      name: 'System Admin', 
      icon: ShieldCheck, 
      role: ['admin'],
      children: [
        { name: 'General Settings', path: '/settings?tab=general', icon: Settings },
        { name: 'Security & WAF', path: '/settings?tab=security', icon: ShieldCheck },
        { name: 'Notifications', path: '/settings?tab=notifications', icon: Bell },
        { name: 'Database Stats', path: '/settings?tab=database', icon: Database },
        { name: 'User Management', path: '/users', icon: Users },
      ]
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.role || (user && item.role.includes(user.role))
  );

  const NavItem = ({ item, isSidebarOpen, location }: any) => {
    const [isOpen, setIsOpen] = React.useState(
      item.children?.some((c: any) => location.pathname + location.search === c.path)
    );
    const Icon = item.icon;
    const isActive = location.pathname === item.path || 
                   (item.path && item.path !== '/' && location.pathname.startsWith(item.path));
    
    if (item.children && isSidebarOpen) {
      return (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "sidebar-link w-full justify-between",
              (isOpen || item.children.some((c: any) => location.pathname + location.search === c.path)) && "text-text-primary bg-app-subtle/50"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} />
              <span>{item.name}</span>
            </div>
            <ChevronRight size={14} className={cn("transition-transform", isOpen && "rotate-90")} />
          </button>
          {isOpen && (
            <div className="ml-4 pl-4 border-l border-border flex flex-col gap-1 mt-1 mb-2">
              {item.children.map((child: any) => {
                const ChildIcon = child.icon;
                const isChildActive = location.pathname + location.search === child.path || (child.path.split('?')[0] === location.pathname && location.search === '');
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={cn(
                      "sidebar-link py-2 text-xs",
                      isChildActive && "active"
                    )}
                  >
                    <ChildIcon size={16} />
                    <span>{child.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "sidebar-link",
          isActive && "active",
          !isSidebarOpen && "justify-center px-0"
        )}
        title={!isSidebarOpen ? item.name : undefined}
      >
        <Icon size={20} />
        {isSidebarOpen && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-app-surface border-r border-border transition-all duration-300 flex flex-col",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="h-16 border-b border-border flex items-center px-6 gap-3">
          <div className="w-8 h-8 shrink-0">
            <img src={logo} alt="Zenith Logo" className="w-full h-full object-contain" />
          </div>
          {isSidebarOpen && <span className="font-bold text-text-primary text-xl tracking-tight">Zenith CMS</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {filteredNavItems.map((item, idx) => (
            <NavItem key={idx} item={item} isSidebarOpen={isSidebarOpen} location={location} />
          ))}

          {/* Global Sections */}
          {isSidebarOpen && collections.some(c => c.isSingleton) && (
            <div className="mt-6 mb-2 px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Sections
            </div>
          )}
          {collections.filter(c => c.isSingleton).map((col) => {
            const path = `/globals/${col.slug}`;
            const isActive = location.pathname === path || location.pathname.startsWith(`/globals/${col.slug}`);
            
            return (
              <Link
                key={col.slug}
                to={path}
                className={cn(
                  "sidebar-link",
                  isActive && "active",
                  !isSidebarOpen && "justify-center px-0"
                )}
              >
                <Globe size={18} />
                {isSidebarOpen && <span>{col.name.replace(/globals\//, '')}</span>}
              </Link>
            );
          })}

          {/* Standard Collections */}
          {isSidebarOpen && collections.some(c => !c.isSingleton) && (
            <div className="mt-8 mb-2 px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Collections
            </div>
          )}
          {collections.filter(c => !c.isSingleton).map((col) => {
            const path = `/collections/${col.slug}`;
            const isActive = location.pathname === path || location.pathname.startsWith(`/collections/${col.slug}`);
            
            return (
              <Link
                key={col.slug}
                to={path}
                className={cn(
                  "sidebar-link",
                  isActive && "active",
                  !isSidebarOpen && "justify-center px-0"
                )}
              >
                <Layout size={18} />
                {isSidebarOpen && <span>{col.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-border flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className={cn(
              "sidebar-link text-danger hover:bg-danger/10 hover:text-danger",
              !isSidebarOpen && "justify-center px-0"
            )}
            title={!isSidebarOpen ? "Logout" : undefined}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-app-surface border-b border-border flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-app-subtle rounded text-text-secondary"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Admin</span>
              <ChevronRight size={14} />
              <span className="text-text-primary font-medium">
                {navItems.find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path)))?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-app-subtle rounded text-text-secondary relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-app-surface"></span>
            </button>
            <div className="w-px h-6 bg-border mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-text-primary">{user?.email}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-app-subtle rounded-full flex items-center justify-center border border-border">
                <UserIcon size={18} className="text-text-secondary" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </div>
  );
};

export default DashboardLayout;
