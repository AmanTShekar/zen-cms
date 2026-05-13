import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Settings, 
  Save, 
  Globe, 
  Shield, 
  Mail, 
  Database, 
  Palette, 
  Loader2, 
  HardDrive, 
  Layers, 
  Activity, 
  Zap, 
  Terminal,
  Users,
  Key,
  RefreshCw,
  Trash2,
  Lock,
  Sparkles,
  Copy,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

interface Settings {
  siteName: string;
  publicUrl: string;
  maintenanceMode: boolean;
  jwtExpiresIn: string;
  passwordMinLength: number;
  customCSS: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  aiModel: string;
  aiApiKey: string;
  enableTelemetry: boolean;
}

const SettingsPage = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(queryParams.get('tab') || 'general');
  const [settings, setSettings] = useState<Settings>({
    siteName: '',
    publicUrl: '',
    maintenanceMode: false,
    jwtExpiresIn: '7d',
    passwordMinLength: 8,
    customCSS: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    rateLimitWindow: 15,
    rateLimitMax: 100,
    aiModel: 'claude-3-5-sonnet',
    aiApiKey: '',
    enableTelemetry: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, dbRes, usersRes, keysRes] = await Promise.all([
        api.get('/system/settings'),
        api.get('/system/db/stats'),
        api.get('/system/users'),
        api.get('/system/api-keys')
      ]);
      setSettings(settingsRes.data.data);
      setDbStats(dbRes.data.data);
      setUsers(usersRes.data.data);
      setApiKeys(keysRes.data.data);
    } catch (err) {
      console.error('Failed to fetch system parameters');
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/system/settings', settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await api.post('/system/smtp/test', settings);
      toast.success(res.data.data.handshake === 'OK' ? 'SMTP connected' : 'Relay verified');
    } catch (err: any) {
      toast.error('SMTP connection failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleAddOperator = async () => {
    const email = window.prompt('Initialize operator node (email):');
    if (!email) return;
    try {
      toast.promise(
        api.post('/system/members', { email, role: 'editor' }),
        {
          loading: 'Adding user...',
          success: 'User added successfully',
          error: 'Failed to add user'
        }
      );
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('REVOKE_ACCESS_CREDENTIAL?')) return;
    try {
      await api.patch(`/system/api-keys/${id}`, { revoked: true });
      toast.success('Access revoked');
      fetchData();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  const handleGenerateKey = async () => {
    const name = window.prompt('Key_Name (e.g. Prod_Relay):');
    if (!name) return;
    try {
      const res = await api.post('/system/api-keys', { name, role: 'editor', expiresInDays: 30 });
      setNewKey(res.data.data);
      toast.success('API key generated');
      fetchData();
    } catch (err) {
      toast.error('Failed to generate key');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe, sub: 'Site Profile' },
    { id: 'security', label: 'Security', icon: Shield, sub: 'Access Control' },
    { id: 'notifications', label: 'Email', icon: Mail, sub: 'SMTP Relay' },
    { id: 'users', label: 'Users', icon: Users, sub: 'Admin Registry' },
    { id: 'keys', label: 'API Keys', icon: Key, sub: 'Access Tokens' },
    { id: 'database', label: 'Database', icon: Database, sub: 'Storage Stats' },
    { id: 'ai', label: 'AI Engine', icon: Sparkles, sub: 'Model Settings' },
    { id: 'appearance', label: 'Styles', icon: Palette, sub: 'Custom CSS' },
  ];

  if (loading) return (
    <div className={cn("h-screen w-full flex flex-col items-center justify-center gap-8", theme === 'dark' ? "bg-black" : "bg-[#fafafa]")}>
       <Loader2 size={32} className="animate-spin text-indigo-500" strokeWidth={1.5} />
       <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">Loading settings...</p>
    </div>
  );

  return (
    <div className={cn(
      "p-6 space-y-6 min-h-full transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* 🏛️ Compact Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="flex items-center gap-5">
             <div className={cn(
               "w-10 h-10 rounded-none flex items-center justify-center shadow-lg transition-all",
               theme === 'dark' ? "bg-white text-black" : "bg-gray-900 text-white"
             )}>
                <Settings size={20} />
             </div>
            <div className="flex flex-col">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none border px-3 py-1.5 rounded-none border-indigo-500/10 bg-indigo-500/5">System Management</span>
                  <div className="w-2 h-2 rounded-none bg-emerald-500 shadow-[0_0_8px_#10b981]" />
               </div>
               <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Global Settings</h1>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <button 
               onClick={handleSave} 
               disabled={saving}
               className={cn(
                 "px-6 py-3 rounded-none font-black text-[12px] uppercase tracking-[0.2em] shadow-lg transition-all italic leading-none flex items-center gap-2 active:scale-95",
                 theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-black"
               )}
             >
               {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
               Commit
             </button>
         </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
          <div className="xl:col-span-1 space-y-1">
            {tabs.map((tab) => (
                <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                      "w-full flex items-center justify-between px-5 py-4 rounded-none transition-all group relative border",
                      activeTab === tab.id 
                        ? (theme === 'dark' ? "bg-white/[0.04] border-white/10 text-white" : "bg-white border-gray-100 shadow-md text-gray-900") 
                        : (theme === 'dark' ? "text-gray-500 border-transparent hover:bg-white/[0.02] hover:text-gray-300" : "text-gray-500 border-transparent hover:bg-gray-50")
                   )}
                >
                   <div className="flex items-center gap-3">
                      <tab.icon size={16} className={activeTab === tab.id ? "text-indigo-500" : "opacity-30 group-hover:opacity-60"} />
                      <div className="flex flex-col items-start leading-none">
                         <span className="text-[12px] font-black uppercase tracking-tight italic">{tab.label}</span>
                         <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1 opacity-60">{tab.sub}</span>
                      </div>
                   </div>
                   {activeTab === tab.id && <div className="w-1 h-3 bg-indigo-500 rounded-none shadow-[0_0_8px_#6366f1]" />}
                </button>
            ))}
          </div>

         <div className="xl:col-span-5">
            <div className={cn(
              "border rounded-none p-8 shadow-xl relative overflow-hidden transition-colors backdrop-blur-3xl min-h-[600px]",
              theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
               <AnimatePresence mode="wait">
                  <motion.div
                     key={activeTab}
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -10 }}
                     className="space-y-8 relative z-10"
                  >
                     <div className="flex items-center gap-6 border-b border-white/5 pb-8">
                        <h2 className="text-2xl font-black uppercase italic leading-none tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                        <div className="w-px h-6 bg-white/10" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Config Active</span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {activeTab === 'general' && (
                           <>
                               <div className={cn(
                                 "p-4 rounded-none border transition-all space-y-3",
                                 theme === 'dark' ? "bg-white/[0.01] border-white/5" : "bg-gray-50/50 border-gray-100"
                               )}>
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">Application Name</label>
                                  <input type="text" value={settings.siteName} onChange={(e) => setSettings({...settings, siteName: e.target.value})} className={cn(
                                    "w-full border rounded-none py-3 px-4 text-[14px] font-black italic transition-all outline-none",
                                    theme === 'dark' ? "bg-black border-white/10 text-white focus:border-indigo-500" : "bg-white border-gray-200 focus:border-indigo-500"
                                  )} />
                               </div>
                               <div className={cn(
                                 "p-4 rounded-none border transition-all space-y-3",
                                 theme === 'dark' ? "bg-white/[0.01] border-white/5" : "bg-gray-50/50 border-gray-100"
                               )}>
                                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">Public Endpoint</label>
                                  <input type="text" value={settings.publicUrl} onChange={(e) => setSettings({...settings, publicUrl: e.target.value})} className={cn(
                                    "w-full border rounded-none py-3 px-4 text-[14px] font-black italic transition-all outline-none",
                                    theme === 'dark' ? "bg-black border-white/10 text-white focus:border-indigo-500" : "bg-white border-gray-200 focus:border-indigo-500"
                                  )} />
                               </div>
                               <div className={cn(
                                 "col-span-1 md:col-span-2 p-6 rounded-none border flex items-center justify-between transition-all group",
                                 theme === 'dark' ? "bg-white/[0.01] border-white/5 hover:border-indigo-500/20" : "bg-white border-gray-100"
                               )}>
                                  <div className="flex flex-col">
                                     <span className="text-[12px] font-black uppercase italic leading-none">Maintenance Protocol</span>
                                     <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1.5">Restrict public access to system kernel</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                     <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})} className="sr-only peer" />
                                     <div className="w-12 h-6 bg-gray-500/20 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-none after:h-4 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner border border-white/5"></div>
                                  </label>
                               </div>
                           </>
                        )}

                        {activeTab === 'security' && (
                           <>
                               <div className="space-y-3">
                                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">Token Lifetime</label>
                                  <input type="text" value={settings.jwtExpiresIn} onChange={(e) => setSettings({...settings, jwtExpiresIn: e.target.value})} className={cn(
                                    "w-full border rounded-none py-4 px-6 text-[12px] font-black italic transition-all outline-none",
                                    theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:border-indigo-500/20" : "bg-gray-50 border-gray-100"
                                  )} />
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">Min Password Length</label>
                                  <input type="number" value={settings.passwordMinLength} onChange={(e) => setSettings({...settings, passwordMinLength: Number(e.target.value)})} className={cn(
                                    "w-full border rounded-none py-4 px-6 text-[12px] font-black italic transition-all outline-none",
                                    theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:border-indigo-500/20" : "bg-gray-50 border-gray-100"
                                  )} />
                               </div>
                           </>
                        )}

                        {activeTab === 'notifications' && (
                           <>
                               <div className="space-y-3">
                                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">SMTP Relay Host</label>
                                  <input type="text" value={settings.smtpHost} onChange={(e) => setSettings({...settings, smtpHost: e.target.value})} className={cn(
                                    "w-full border rounded-none py-4 px-6 text-[12px] font-black italic focus:ring-4 transition-all outline-none",
                                    theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:ring-indigo-500/5 focus:border-indigo-500/20" : "bg-gray-50 border-gray-100"
                                  )} placeholder="smtp.relay.net" />
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1">SMTP User</label>
                                  <input type="text" value={settings.smtpUser} onChange={(e) => setSettings({...settings, smtpUser: e.target.value})} className={cn(
                                    "w-full border rounded-none py-4 px-6 text-[12px] font-black italic focus:ring-4 transition-all outline-none",
                                    theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:ring-indigo-500/5 focus:border-indigo-500/20" : "bg-gray-50 border-gray-100"
                                  )} />
                               </div>
                               <div className="col-span-full pt-4">
                                 <button 
                                   onClick={handleTestSmtp}
                                   disabled={testingSmtp}
                                   className={cn(
                                     "flex items-center gap-3 px-8 py-4 rounded-none text-[10px] font-black uppercase tracking-widest italic border transition-all active:scale-95",
                                     theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-900 text-white"
                                   )}
                                 >
                                   {testingSmtp ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                                   Test Connection
                                 </button>
                               </div>
                           </>
                        )}

                        {activeTab === 'users' && (
                           <div className="col-span-full space-y-4">
                               <div className="flex items-center justify-between mb-4 px-2">
                                  <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-indigo-500">{users.length} Active Operators</span>
                                  <button onClick={handleAddOperator} className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all">Add User</button>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {users.map(user => (
                                     <div key={user._id} className={cn("flex items-center justify-between p-4 border rounded-none transition-all group", theme === 'dark' ? "bg-black/40 border-white/5 hover:border-indigo-500/20" : "bg-gray-50 border-gray-100")}>
                                        <div className="flex items-center gap-5">
                                           <div className="w-12 h-12 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Users size={20} /></div>
                                           <div className="flex flex-col leading-none">
                                              <span className="text-[12px] font-black italic uppercase leading-none">{user.email}</span>
                                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 opacity-60">Auth Tier: {user.role}</span>
                                           </div>
                                        </div>
                                        <button className="p-3 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                     </div>
                                  ))}
                               </div>
                           </div>
                        )}
                          {activeTab === 'keys' && (
                             <div className="col-span-full space-y-4">
                                <div className="flex items-center justify-between mb-4 px-2">
                                   <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-indigo-500">{apiKeys.length} Active Credentials</span>
                                   <button 
                                     onClick={handleGenerateKey}
                                     className="text-[10px] font-black uppercase italic border border-white/10 px-8 py-3 rounded-none hover:bg-white/5 transition-all"
                                   >
                                     Generate Token
                                   </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                   {apiKeys.map(key => (
                                      <div key={key._id} className={cn("flex items-center justify-between p-6 border rounded-none transition-all group", theme === 'dark' ? "bg-black/40 border-white/5 hover:border-indigo-500/20" : "bg-gray-50 border-gray-100")}>
                                         <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20"><Key size={24} /></div>
                                            <div className="flex flex-col leading-none">
                                               <span className="text-[14px] font-black italic uppercase leading-none">{key.name}</span>
                                               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2.5 opacity-60">Permissions: {key.role} • Registry Node: {new Date(key.expiresAt).toLocaleDateString()}</span>
                                            </div>
                                         </div>
                                         <button onClick={() => handleRevokeKey(key._id)} className="p-4 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Shield size={20} /></button>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          )}

                         {activeTab === 'ai' && (
                            <>
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">AI Model Context</label>
                                  <div className="relative group">
                                     <select value={settings.aiModel} onChange={(e) => setSettings({...settings, aiModel: e.target.value})} className={cn(
                                       "w-full border rounded-none py-5 px-8 text-[12px] font-black italic transition-all outline-none appearance-none cursor-pointer",
                                       theme === 'dark' ? "bg-white/5 border-white/5 text-white hover:border-indigo-500/20" : "bg-gray-50 border-gray-100 hover:border-indigo-500/20"
                                     )}>
                                        <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                        <option value="gpt-4o">GPT-4o</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                     </select>
                                     <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic px-1">AI Key (Encrypted)</label>
                                  <div className="relative">
                                     <input type="password" value={settings.aiApiKey} onChange={(e) => setSettings({...settings, aiApiKey: e.target.value})} className={cn(
                                       "w-full border rounded-none py-5 px-8 text-[12px] font-black italic focus:ring-4 transition-all outline-none pr-16",
                                       theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:border-indigo-500/20" : "bg-gray-50 border-gray-100"
                                     )} placeholder="sk-..." />
                                     <Lock size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600" />
                                  </div>
                               </div>
                               <div className="col-span-full p-6 border rounded-none border-dashed border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <div className="w-14 h-14 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/10"><Terminal size={24} /></div>
                                     <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase italic leading-none">Neural Bridge: ACTIVE</span>
                                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-2">Latency: 240ms • Mode: Production</span>
                                     </div>
                                  </div>
                                  <button className="px-8 py-3.5 rounded-none bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Validate Pulse</button>
                               </div>
                            </>
                         )}

                         {activeTab === 'database' && (
                            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                               {[
                                  { label: 'Cluster Scale', value: dbStats?.size ? `${(dbStats.size / 1024 / 1024).toFixed(2)} MB` : '0.00 MB', icon: HardDrive, color: 'text-indigo-500' },
                                  { label: 'Registry Map', value: dbStats?.collections || '0', icon: Layers, color: 'text-emerald-500' },
                                  { label: 'Pulse Health', value: 'OPTIMAL', icon: Activity, color: 'text-emerald-500' }
                               ].map((stat, i) => (
                                  <div key={i} className={cn(
                                    "p-8 border rounded-none flex flex-col gap-6 relative overflow-hidden group transition-all",
                                    theme === 'dark' ? "bg-white/[0.01] border-white/5 hover:border-indigo-500/20" : "bg-gray-50 border-gray-100 shadow-sm"
                                  )}>
                                     <div className="flex items-center justify-between">
                                        <div className={cn("w-12 h-12 rounded-none flex items-center justify-center border", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white")}>
                                           <stat.icon size={22} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest italic", stat.color)}>Synchronized</span>
                                     </div>
                                     <div className="flex flex-col leading-none">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">{stat.label}</span>
                                        <span className="text-xl font-black italic tracking-tighter mt-2">{stat.value}</span>
                                     </div>
                                  </div>
                               ))}
                               <div className="col-span-full mt-4">
                                  <button 
                                    onClick={async () => {
                                      await api.post('/system/cache/flush');
                                      toast.success('Cache cleared');
                                    }}
                                    className="flex items-center gap-3 px-8 py-4 rounded-none bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase italic hover:bg-red-500/20 transition-all active:scale-95"
                                  >
                                    <Trash2 size={16} />
                                    Flush System Cache
                                  </button>
                               </div>
                            </div>
                         )}

                         {activeTab === 'appearance' && (
                            <div className="col-span-full space-y-6">
                               <div className="flex items-center justify-between px-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic">CSS Protocol Override</label>
                                  <span className="text-[8px] font-black text-indigo-500 italic uppercase">Global Stylesheet</span>
                               </div>
                               <div className="relative group">
                                  <div className="absolute top-4 left-6 flex flex-col gap-1.5 opacity-20">
                                     <div className="w-6 h-0.5 bg-indigo-500"></div>
                                     <div className="w-4 h-0.5 bg-indigo-500"></div>
                                  </div>
                                  <textarea 
                                     value={settings.customCSS} 
                                     onChange={(e) => setSettings({...settings, customCSS: e.target.value})} 
                                     rows={16} 
                                     className={cn(
                                        "w-full border rounded-none py-8 pl-16 pr-8 text-[13px] font-mono font-black italic focus:ring-8 transition-all outline-none resize-none no-scrollbar",
                                        theme === 'dark' ? "bg-black border-white/5 text-indigo-100 focus:ring-indigo-500/5 focus:border-indigo-500/20" : "bg-gray-50 border-gray-100 shadow-inner"
                                     )} 
                                     placeholder="/* Inject custom CSS protocols here... */" 
                                  />
                               </div>
                            </div>
                         )}
                     </div>
                  </motion.div>
               </AnimatePresence>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {newKey && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md rounded-none p-6 border shadow-2xl relative overflow-hidden",
                theme === 'dark' ? "bg-[#0a0a0a] border-white/10" : "bg-white border-gray-100"
              )}
            >
              <div className="absolute top-0 right-0 p-6 text-indigo-500/10 pointer-events-none">
                 <Key size={120} strokeWidth={0.5} />
              </div>

              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black uppercase italic leading-none">Key Generated</h3>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-2">Vault Node: {newKey.name}</p>
                 </div>
              </div>

              <div className="space-y-4 mb-8">
                 <p className="text-[10px] font-black text-amber-500 uppercase italic tracking-widest leading-relaxed">
                   CRITICAL: Copy this key now. It will never be displayed again for security integrity.
                 </p>
                 <div className={cn(
                   "p-4 rounded-none border flex items-center justify-between gap-4 font-mono text-[10px] font-bold break-all transition-colors",
                   theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                 )}>
                    {newKey.key}
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(newKey.key);
                        toast.success('KEY_COPIED_TO_CLIPBOARD');
                      }}
                      className="p-2.5 rounded-none bg-indigo-500 text-white shrink-0 shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Copy size={14} />
                    </button>
                 </div>
              </div>

              <button 
                onClick={() => setNewKey(null)}
                className="w-full py-4 rounded-none bg-white text-black font-black text-[10px] uppercase tracking-widest italic hover:bg-gray-200 transition-all"
              >
                I've copied the key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
